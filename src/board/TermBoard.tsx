import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Category, CategoryId, Term } from "../data/types";
import "./board.css";

/* 용어 보드: 용어 하나가 노드 하나, 카테고리가 그룹 상자, "같이 보면 좋은 말"이 선.
   학습노트(study-note)의 보드처럼 판을 옮기고 확대하고, 노드를 끌어 놓고, 연결점을 끌어 직접 잇는다.
   보드에 담기는 것은 "어느 용어가 어디에 있고, 내가 무엇을 이었는가" 뿐이고 용어 데이터는 건드리지 않는다.
   자리와 내가 이은 선은 이 기기(localStorage)에만 둔다. */

type Pt = { x: number; y: number };
type Side = "front" | "back" | "top" | "bottom";
interface Rect { x: number; y: number; w: number; h: number }
interface View { x: number; y: number; z: number }
interface Layout { pos: Record<string, Pt>; links: [string, string][] }
type EdgeMode = "picked" | "group" | "all";

export type BoardFocus = { kind: "cat" | "term" | "fit"; id: string; seq: number } | null;

type Gesture =
  | { t: "pan"; sx: number; sy: number; vx: number; vy: number; moved: boolean }
  | { t: "marquee"; start: Pt; base: Set<string>; moved: boolean }
  | { t: "move"; sx: number; sy: number; vx: number; vy: number; before: Layout; ids: string[]; moved: boolean; id: string | null; additive: boolean; touch?: { timer: number; picked: boolean } }
  | { t: "link"; from: string; side: Side; sx: number; sy: number }
  | { t: "pinch"; d0: number; z0: number; wx: number; wy: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const NODE_W = 184, NODE_H = 46;
const GAP_X = 14, GAP_Y = 12, PAD = 16, HEAD = 36;
const GROUP_COLS = 2, MASONRY = 4, COL_GAP = 64, ROW_GAP = 56;
const GROUP_W = PAD * 2 + GROUP_COLS * NODE_W + (GROUP_COLS - 1) * GAP_X;
const Z_MIN = 0.12, Z_MAX = 2;
const TONES = ["var(--accent)", "var(--warm)", "#8a63d2", "#2f7fc1"];
const DIR: Record<Side, Pt> = { front: { x: -1, y: 0 }, back: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } };
const KEY_LAYOUT = "wic-board-layout-v1";
const KEY_VIEW = "wic-board-view-v1";
const KEY_EDGES = "wic-board-edges-v2"; // v2: 기본이 "고른 것만" 으로 바뀌었다
const FAR_Z = 0.45; // 이보다 작게 보면 글씨 대신 카테고리 이름만 크게 (멀리 보기)

// ── 처음 자리: 카테고리 상자를 네 줄 벽돌쌓기로, 상자 안은 두 칸씩 ──
function defaultLayout(terms: Term[], categories: Category[]): Layout {
  const colH = new Array(MASONRY).fill(0);
  const pos: Record<string, Pt> = {};
  for (const c of categories) {
    const list = terms.filter((t) => t.category === c.id);
    if (!list.length) continue;
    const rows = Math.ceil(list.length / GROUP_COLS);
    const col = colH.indexOf(Math.min(...colH));
    const gx = col * (GROUP_W + COL_GAP), gy = colH[col];
    list.forEach((t, i) => {
      pos[t.id] = { x: gx + PAD + (i % GROUP_COLS) * (NODE_W + GAP_X), y: gy + HEAD + Math.floor(i / GROUP_COLS) * (NODE_H + GAP_Y) };
    });
    colH[col] = gy + HEAD + rows * (NODE_H + GAP_Y) - GAP_Y + PAD + ROW_GAP;
  }
  return { pos, links: [] };
}
function readJson(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장이 막힌 브라우저 - 이번 화면에서만 유지 */ }
}
const isPt = (p: unknown): p is Pt => !!p && typeof (p as Pt).x === "number" && typeof (p as Pt).y === "number" && isFinite((p as Pt).x) && isFinite((p as Pt).y);
function loadLayout(def: Layout): Layout {
  const raw = readJson(KEY_LAYOUT) as Partial<Layout> | null;
  if (!raw || typeof raw !== "object") return def;
  const pos = { ...def.pos };
  // 새로 생긴 용어는 처음 자리, 없어진 용어는 버린다
  for (const [id, p] of Object.entries(raw.pos ?? {})) if (id in pos && isPt(p)) pos[id] = { x: p.x, y: p.y };
  const links = Array.isArray(raw.links)
    ? raw.links.filter((l): l is [string, string] => Array.isArray(l) && l.length === 2 && l[0] in pos && l[1] in pos)
    : [];
  return { pos, links };
}

// ── 모양 ──
const WIDE = /[ᄀ-ᇿ㄰-㆏가-힯一-鿿]/;
function textWidth(s: string, k = 1): number {
  let w = 0;
  for (const ch of s) w += (WIDE.test(ch) ? 13.5 : ch === " " ? 4 : 7.6) * k;
  return w;
}
function fit(s: string, max: number, k = 1): string {
  if (textWidth(s, k) <= max) return s;
  let out = "";
  for (const ch of s) { if (textWidth(out + ch + "…", k) > max) break; out += ch; }
  return out + "…";
}
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const rectOfNode = (p: Pt): Rect => ({ x: p.x, y: p.y, w: NODE_W, h: NODE_H });
const inRect = (r: Rect, p: Pt, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function bounds(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rects) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function portAt(p: Pt, side: Side): Pt {
  if (side === "front") return { x: p.x, y: p.y + NODE_H / 2 };
  if (side === "back") return { x: p.x + NODE_W, y: p.y + NODE_H / 2 };
  if (side === "top") return { x: p.x + NODE_W / 2, y: p.y };
  return { x: p.x + NODE_W / 2, y: p.y + NODE_H };
}
// 두 노드의 자리에 따라 선이 붙는 쪽을 고른다 - 옆에 있으면 옆끼리, 위아래로 겹치면 위·아래끼리
function anchors(a: Pt, b: Pt): [Side, Side] {
  if (b.x >= a.x + NODE_W) return ["back", "front"];
  if (b.x + NODE_W <= a.x) return ["front", "back"];
  return b.y >= a.y ? ["bottom", "top"] : ["top", "bottom"];
}
// 연결점이 향한 쪽으로 두 점 사이 거리의 절반만큼 당긴 3차 베지어 (study-note lib/board.ts plainCurve)
function curve(a: Pt, aAt: Side, b: Pt, bAt: Side): string {
  const k = Math.max(8, Math.hypot(b.x - a.x, b.y - a.y) / 2);
  const da = DIR[aAt], db = DIR[bAt];
  return `M ${a.x} ${a.y} C ${a.x + da.x * k} ${a.y + da.y * k}, ${b.x + db.x * k} ${b.y + db.y * k}, ${b.x} ${b.y}`;
}
function edgeD(a: Pt, b: Pt): string {
  const [sa, sb] = anchors(a, b);
  return curve(portAt(a, sa), sa, portAt(b, sb), sb);
}
function brackets(r: Rect, k = 5, arm = 9): string {
  const x0 = r.x - k, y0 = r.y - k, x1 = r.x + r.w + k, y1 = r.y + r.h + k;
  return `M${x0} ${y0 + arm}V${y0}H${x0 + arm}M${x1 - arm} ${y0}H${x1}V${y0 + arm}M${x1} ${y1 - arm}V${y1}H${x1 - arm}M${x0 + arm} ${y1}H${x0}V${y1 - arm}`;
}
const headPath = (g: Rect, r = 12) =>
  `M${g.x} ${g.y + HEAD - 6}V${g.y + r}Q${g.x} ${g.y} ${g.x + r} ${g.y}H${g.x + g.w - r}Q${g.x + g.w} ${g.y} ${g.x + g.w} ${g.y + r}V${g.y + HEAD - 6}Z`;

interface Props {
  terms: Term[];
  categories: Category[];
  matches: Set<string> | null; // 검색 중이면 찾은 용어
  activeId: string | null;     // 설명 창이 열린 용어
  onOpen: (id: string) => void;
  focus: BoardFocus;           // 바깥(카테고리 색인 등)에서 "여기로 가 줘"
  insetRight: number;          // 오른쪽을 가리는 설명 창 폭 - 가운데 맞출 때 그만큼 비켜 준다
}

export function TermBoard({ terms, categories, matches, activeId, onOpen, focus, insetRight }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const termById = useMemo(() => new Map(terms.map((t) => [t.id, t])), [terms]);
  const def = useMemo(() => defaultLayout(terms, categories), [terms, categories]);
  const [layout, setLayoutState] = useState<Layout>(() => loadLayout(def));
  const layoutRef = useRef(layout);
  const [view, setViewState] = useState<View | null>(() => {
    const v = readJson(KEY_VIEW) as View | null;
    return v && isPt(v) && typeof v.z === "number" && v.z >= Z_MIN && v.z <= Z_MAX ? v : null;
  });
  const viewRef = useRef(view);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [sel, setSel] = useState<Set<string>>(() => new Set(activeId ? [activeId] : []));
  const [selLink, setSelLink] = useState<string | null>(null);
  const [edgeMode, setEdgeMode] = useState<EdgeMode>(() => {
    const m = readJson(KEY_EDGES);
    return m === "group" || m === "all" ? m : "picked";
  });
  const [hover, setHover] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ from: string; side: Side; cur: Pt; target: string | null } | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [dragging, setDragging] = useState<"" | "pan" | "move">("");
  const [, setTick] = useState(0);
  const past = useRef<Layout[]>([]);
  const future = useRef<Layout[]>([]);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, Pt>());
  const lastTap = useRef<{ t: number; x: number; y: number; key: string } | null>(null);
  const anim = useRef(0);
  const coarse = useMemo(() => !!window.matchMedia?.("(pointer: coarse)").matches, []);
  const still = useMemo(() => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  // ── 상태 고치기 ──
  const setView = (v: View) => { viewRef.current = v; setViewState(v); };
  const apply = (next: Layout, record = true) => {
    if (record) {
      past.current.push(layoutRef.current);
      if (past.current.length > 80) past.current.shift();
      future.current = [];
      setTick((t) => t + 1);
    }
    layoutRef.current = next;
    setLayoutState(next);
  };
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(layoutRef.current);
    layoutRef.current = prev; setLayoutState(prev); setSelLink(null); setTick((t) => t + 1);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(layoutRef.current);
    layoutRef.current = next; setLayoutState(next); setSelLink(null); setTick((t) => t + 1);
  };

  // 자리·화면은 손을 멈추고 잠시 뒤에 저장한다 (끄는 동안 매번 쓰지 않게)
  const firstSave = useRef(true);
  useEffect(() => {
    if (firstSave.current) { firstSave.current = false; return; }
    const t = window.setTimeout(() => writeJson(KEY_LAYOUT, layout), 300);
    return () => window.clearTimeout(t);
  }, [layout]);
  useEffect(() => {
    if (!view) return;
    const t = window.setTimeout(() => writeJson(KEY_VIEW, view), 400);
    return () => window.clearTimeout(t);
  }, [view]);
  useEffect(() => { writeJson(KEY_EDGES, edgeMode); }, [edgeMode]);

  // ── 데이터에서 나오는 것 ──
  const related = useMemo(() => {
    const seen = new Set<string>();
    const out: [string, string][] = [];
    for (const t of terms) for (const r of t.related) {
      if (!termById.has(r) || r === t.id) continue;
      const k = pairKey(t.id, r);
      if (seen.has(k)) continue;
      seen.add(k); out.push([t.id, r]);
    }
    return out;
  }, [terms, termById]);
  const relatedKeys = useMemo(() => new Set(related.map(([a, b]) => pairKey(a, b))), [related]);
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const add = (a: string, b: string) => { if (!m.has(a)) m.set(a, new Set()); m.get(a)!.add(b); };
    for (const [a, b] of [...related, ...layout.links]) { add(a, b); add(b, a); }
    return m;
  }, [related, layout.links]);
  const catTerms = useMemo(() => {
    const m = new Map<CategoryId, string[]>();
    for (const t of terms) { if (!m.has(t.category)) m.set(t.category, []); m.get(t.category)!.push(t.id); }
    return m;
  }, [terms]);
  // 그룹 상자는 따로 저장하지 않는다 - 그 카테고리 노드들을 감싸는 상자 (노드를 밖으로 끌면 상자가 늘어난다)
  const groups = useMemo(() => categories.flatMap((c, i) => {
    const ids = catTerms.get(c.id) ?? [];
    const b = bounds(ids.map((id) => rectOfNode(layout.pos[id])));
    if (!b) return [];
    return [{ cat: c, tone: TONES[i % TONES.length], rect: { x: b.x - PAD, y: b.y - HEAD, w: b.w + PAD * 2, h: b.h + HEAD + PAD } }];
  }), [categories, catTerms, layout.pos]);
  const world = useMemo(() => bounds(groups.map((g) => g.rect)) ?? { x: 0, y: 0, w: 1, h: 1 }, [groups]);

  // ── 화면 좌표 ──
  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = boardRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toWorld = (p: Pt): Pt => { const v = viewRef.current!; return { x: (p.x - v.x) / v.z, y: (p.y - v.y) / v.z }; };
  const usableW = () => Math.max(160, size.w - insetRight);
  // 위쪽 도구 막대(TOP)와 아래 안내 줄(BOTTOM)을 피해서 맞춘다
  const TOP = 52, BOTTOM = 24;
  const viewFor = (r: Rect, maxZ: number, pad = 28): View => {
    const w = usableW(), h = Math.max(120, (size.h || 400) - TOP - BOTTOM);
    const z = clamp(Math.min((w - pad * 2) / Math.max(r.w, 1), (h - pad * 2) / Math.max(r.h, 1)), Z_MIN, maxZ);
    return { z, x: w / 2 - (r.x + r.w / 2) * z, y: TOP + h / 2 - (r.y + r.h / 2) * z };
  };
  const flyTo = (target: View) => {
    cancelAnimationFrame(anim.current);
    const from = viewRef.current;
    if (!from || still) { setView(target); return; }
    const t0 = performance.now(), dur = 320;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;
      setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, z: from.z + (target.z - from.z) * e });
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };
  const zoomAt = (z: number, px: number, py: number) => {
    const v = viewRef.current;
    if (!v) return;
    cancelAnimationFrame(anim.current);
    const nz = clamp(z, Z_MIN, Z_MAX);
    setView({ z: nz, x: px - (px - v.x) * (nz / v.z), y: py - (py - v.y) * (nz / v.z) });
  };
  const zoomCenter = (z: number) => zoomAt(z, usableW() / 2, size.h / 2);
  const fitAll = () => flyTo(viewFor(world, 1));
  const showTerm = (id: string, always = false) => {
    const p = layoutRef.current.pos[id], v = viewRef.current;
    if (!p || !v) return;
    const sx = p.x * v.z + v.x, sy = p.y * v.z + v.y;
    const seen = sx >= 16 && sy >= 16 && sx + NODE_W * v.z <= usableW() - 16 && sy + NODE_H * v.z <= size.h - 16;
    if (seen && !always && v.z >= 0.5) return;
    const z = Math.max(v.z, 0.9);
    flyTo({ z, x: usableW() / 2 - (p.x + NODE_W / 2) * z, y: size.h / 2 - (p.y + NODE_H / 2) * z });
  };

  // 판 크기 - 숨겨져 있다가(휴대폰에서 설명을 읽는 동안) 다시 보일 때도 잡힌다
  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // 처음 열 때 저장한 화면이 없으면 전체가 보이게
  useLayoutEffect(() => {
    // 휴대폰처럼 좁으면 전체는 글자가 안 보이므로 첫 카테고리 상자부터
    if (!viewRef.current && size.w > 0 && size.h > 0) setView(size.w < 600 && groups[0] ? viewFor(groups[0].rect, 0.9, 16) : viewFor(world, 1));
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // 바깥에서 고른 용어(관련 용어 칩·이전/다음)는 골라 두고, 화면 밖이면 데려온다
  useEffect(() => {
    if (!activeId) return;
    setSel(new Set([activeId]));
    if (size.w) showTerm(activeId);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!focus || !size.w) return;
    if (focus.kind === "fit") fitAll();
    else if (focus.kind === "term") { setSel(new Set([focus.id])); showTerm(focus.id, true); }
    else {
      const g = groups.find((x) => x.cat.id === focus.id);
      if (g) flyTo(viewFor(g.rect, 1.1));
    }
  }, [focus?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // 휠: 그냥 굴리면 판이 움직이고, Ctrl(맥은 ⌘)+휠·트랙패드 핀치는 확대
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      if (!v) return;
      cancelAnimationFrame(anim.current);
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(v.z * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      else {
        const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
        const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * k, dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * k;
        setView({ ...v, x: v.x - dx, y: v.y - dy });
      }
    };
    let g0 = 1;
    const onGS = (e: Event) => { e.preventDefault(); g0 = viewRef.current?.z ?? 1; };
    const onGC = (e: Event) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(g0 * (e as Event & { scale: number }).scale, (e as MouseEvent).clientX - r.left, (e as MouseEvent).clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGS);
    el.addEventListener("gesturechange", onGC);
    return () => { el.removeEventListener("wheel", onWheel); el.removeEventListener("gesturestart", onGS); el.removeEventListener("gesturechange", onGC); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  // ── 손동작 ──
  const nodeAt = (p: Pt, pad = 0): string | undefined => {
    const pos = layoutRef.current.pos;
    for (let i = terms.length - 1; i >= 0; i--) {
      const id = terms[i].id;
      if (inRect(rectOfNode(pos[id]), p, pad)) return id;
    }
    return undefined;
  };
  const tap = (key: string, p: Pt) => {
    const now = performance.now();
    const l = lastTap.current;
    if (l && l.key === key && now - l.t < 350 && Math.hypot(p.x - l.x, p.y - l.y) < 14) {
      lastTap.current = null;
      if (key.startsWith("node:")) onOpen(key.slice(5));
      else if (key.startsWith("group:")) { const g = groups.find((x) => x.cat.id === key.slice(6)); if (g) flyTo(viewFor(g.rect, 1.1)); }
      return true;
    }
    lastTap.current = { t: now, x: p.x, y: p.y, key };
    return false;
  };
  const startPinch = () => {
    const g = gesture.current;
    if (g?.t === "move" && g.touch) window.clearTimeout(g.touch.timer);
    const [a, b] = [...pointers.current.values()];
    const v = viewRef.current!;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    gesture.current = { t: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: v.z, wx: (mid.x - v.x) / v.z, wy: (mid.y - v.y) / v.z };
    setDraft(null); setMarquee(null); setDragging("");
  };
  const moveIds = (picked: Set<string>) => [...picked].filter((id) => id in layoutRef.current.pos);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!viewRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;
    cancelAnimationFrame(anim.current);
    const el = boardRef.current!;
    el.focus({ preventScroll: true });
    try { el.setPointerCapture(e.pointerId); } catch { /* 이미 뗀 손가락 */ }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size >= 2) { startPinch(); return; }
    const v = viewRef.current;
    const target = e.target as Element;
    if (e.button === 1) {
      e.preventDefault();
      gesture.current = { t: "pan", sx: p.x, sy: p.y, vx: v.x, vy: v.y, moved: true };
      setDragging("pan");
      return;
    }
    const port = target.closest("[data-port]");
    if (port) {
      const [id, side] = port.getAttribute("data-port")!.split(":") as [string, Side];
      gesture.current = { t: "link", from: id, side, sx: p.x, sy: p.y };
      setDraft({ from: id, side, cur: toWorld(p), target: null });
      setSelLink(null);
      return;
    }
    const link = target.closest("[data-link]");
    if (link) {
      setSelLink(link.getAttribute("data-link")); setSel(new Set());
      gesture.current = null;
      return;
    }
    const item = target.closest("[data-node],[data-group]");
    if (item) {
      const node = item.getAttribute("data-node");
      const cat = item.getAttribute("data-group") as CategoryId | null;
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      let ids: string[];
      if (node) {
        let picked = sel;
        if (additive) { picked = new Set(sel); if (picked.has(node)) picked.delete(node); else picked.add(node); }
        else if (!sel.has(node)) picked = new Set([node]);
        // 손가락은 길게 눌러 집기 전까지 고르지 않는다 (그냥 끌면 판이 움직인다)
        if (e.pointerType !== "touch") setSel(picked);
        ids = picked.has(node) ? moveIds(picked) : [];
      } else ids = catTerms.get(cat!) ?? [];
      setSelLink(null);
      const g: Gesture = { t: "move", sx: p.x, sy: p.y, vx: v.x, vy: v.y, before: layoutRef.current, ids, moved: false, id: node ? `node:${node}` : `group:${cat}`, additive };
      if (e.pointerType === "touch") {
        g.touch = {
          picked: false,
          timer: window.setTimeout(() => {
            if (gesture.current !== g || g.moved) return;
            g.touch!.picked = true;
            navigator.vibrate?.(12);
            if (node) { const s = additive ? new Set(sel).add(node) : new Set([node]); setSel(s); g.ids = moveIds(s); }
            setDragging("move");
          }, 420),
        };
      }
      gesture.current = g;
      return;
    }
    if (e.shiftKey) {
      gesture.current = { t: "marquee", start: toWorld(p), base: new Set(sel), moved: false };
      setSelLink(null);
      return;
    }
    gesture.current = { t: "pan", sx: p.x, sy: p.y, vx: v.x, vy: v.y, moved: false };
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    const v = viewRef.current;
    if (!g || !v) return;
    if (g.t === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const z = clamp(g.z0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0, Z_MIN, Z_MAX);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      setView({ z, x: mid.x - g.wx * z, y: mid.y - g.wy * z });
      return;
    }
    const far = (sx: number, sy: number, d = 3) => Math.hypot(p.x - sx, p.y - sy) >= d;
    if (g.t === "pan") {
      if (!g.moved) { if (!far(g.sx, g.sy)) return; g.moved = true; setDragging("pan"); }
      setView({ ...v, x: g.vx + p.x - g.sx, y: g.vy + p.y - g.sy });
    } else if (g.t === "move") {
      if (g.touch && !g.touch.picked) {
        // 집기 전에 손가락이 움직이면 판 옮기기로 바꾼다
        if (!far(g.sx, g.sy, 8)) return;
        window.clearTimeout(g.touch.timer);
        gesture.current = { t: "pan", sx: g.sx, sy: g.sy, vx: g.vx, vy: g.vy, moved: true };
        setDragging("pan");
        setView({ ...v, x: g.vx + p.x - g.sx, y: g.vy + p.y - g.sy });
        return;
      }
      if (!g.ids.length) return;
      const first = !g.moved;
      if (first) { if (!far(g.sx, g.sy)) return; g.moved = true; setDragging("move"); }
      const dx = (p.x - g.sx) / v.z, dy = (p.y - g.sy) / v.z;
      const pos = { ...g.before.pos };
      for (const id of g.ids) { const o = g.before.pos[id]; pos[id] = { x: Math.round(o.x + dx), y: Math.round(o.y + dy) }; }
      apply({ ...g.before, pos }, first);
    } else if (g.t === "link") {
      const w = toWorld(p);
      const hit = nodeAt(w, 8);
      setDraft({ from: g.from, side: g.side, cur: w, target: hit && hit !== g.from ? hit : null });
    } else if (g.t === "marquee") {
      g.moved = true;
      const w = toWorld(p);
      const r = { x: Math.min(g.start.x, w.x), y: Math.min(g.start.y, w.y), w: Math.abs(g.start.x - w.x), h: Math.abs(g.start.y - w.y) };
      setMarquee(r);
      const s = new Set(g.base);
      for (const t of terms) if (overlaps(r, rectOfNode(layoutRef.current.pos[t.id]))) s.add(t.id);
      setSel(s);
    }
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>, cancel = false) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (g?.t === "pinch") {
      // 한 손가락을 떼면 남은 손가락으로 판을 계속 옮긴다
      const rest = [...pointers.current.values()][0];
      const v = viewRef.current!;
      gesture.current = rest ? { t: "pan", sx: rest.x, sy: rest.y, vx: v.x, vy: v.y, moved: true } : null;
      return;
    }
    if (pointers.current.size) return;
    gesture.current = null;
    setDragging(""); setMarquee(null); setDraft(null);
    if (g?.t === "move" && g.touch) window.clearTimeout(g.touch.timer);
    if (!g || cancel) return;
    const p = local(e);
    if (g.t === "link") {
      const hit = nodeAt(toWorld(p), 8);
      if (hit && hit !== g.from) {
        const k = pairKey(g.from, hit);
        const cur = layoutRef.current;
        if (!relatedKeys.has(k) && !cur.links.some(([a, b]) => pairKey(a, b) === k)) apply({ ...cur, links: [...cur.links, [g.from, hit]] });
        setSel(new Set([g.from, hit]));
      }
    } else if (g.t === "move" && !g.moved) {
      const node = g.id?.startsWith("node:") ? g.id.slice(5) : null;
      if (node && !g.additive && !(g.touch?.picked)) setSel(new Set([node]));
      if (g.id && !tap(g.id, p) && node && activeId && !g.additive && !g.touch?.picked) onOpen(node); // 설명 창이 열려 있으면 누르는 대로 따라간다
    } else if (g.t === "pan" && !g.moved) {
      setSel(new Set()); setSelLink(null);
      lastTap.current = null;
    }
  };

  const removeLink = () => {
    if (!selLink) return;
    const cur = layoutRef.current;
    apply({ ...cur, links: cur.links.filter(([a, b]) => pairKey(a, b) !== selLink) });
    setSelLink(null);
  };
  const resetLayout = () => {
    if (!window.confirm("노드 자리를 처음 배치로 되돌릴까요? 직접 이은 선은 남겨 둡니다.")) return;
    apply({ pos: def.pos, links: layoutRef.current.links });
    setView(viewFor(bounds(Object.values(def.pos).map(rectOfNode)) ?? world, 1));
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !viewRef.current) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    const arrows: Record<string, Pt> = { arrowleft: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 }, arrowup: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 } };
    let handled = true;
    if (mod && k === "z") { if (e.shiftKey) redo(); else undo(); }
    else if (mod && k === "y") redo();
    else if (k === "delete" || k === "backspace") removeLink();
    else if (k === "escape") { setSel(new Set()); setSelLink(null); }
    else if (k === "enter" && sel.size === 1) onOpen([...sel][0]);
    else if (arrows[k]) {
      const a = arrows[k];
      if (sel.size) {
        const step = e.shiftKey ? 1 : 10;
        const cur = layoutRef.current, pos = { ...cur.pos };
        for (const id of sel) pos[id] = { x: pos[id].x + a.x * step, y: pos[id].y + a.y * step };
        apply({ ...cur, pos });
      } else { const v = viewRef.current; setView({ ...v, x: v.x - a.x * 60, y: v.y - a.y * 60 }); }
    }
    else if (k === "+" || k === "=") zoomCenter(viewRef.current.z * 1.25);
    else if (k === "-") zoomCenter(viewRef.current.z / 1.25);
    else if (k === "0") fitAll();
    else handled = false;
    if (handled) e.preventDefault();
  };

  // ── 그리기 ──
  // 판을 옮기거나 확대할 때는 아래 그림을 다시 만들지 않고 바깥 transform 만 바꾼다
  // 멀리 보기 - 글자 크기를 확대 배율로 나누므로 배율을 조금씩 끊어서(0.02 단위) 다시 그리는 횟수를 줄인다
  const zNow = view?.z ?? 1;
  const far = zNow < FAR_Z;
  const farZ = far ? Math.max(Z_MIN, Math.round(zNow * 50) / 50) : 1;
  // 밝게 둘 노드 - 검색 중이면 찾은 용어(와 고른 것), 아니면 고른 노드와 그 이웃
  const lit = useMemo(() => {
    if (matches) return new Set([...matches, ...sel]);
    if (sel.size) { const s = new Set(sel); for (const id of sel) for (const n of neighbors.get(id) ?? []) s.add(n); return s; }
    return null;
  }, [sel, neighbors, matches]);
  const content = useMemo(() => {
    const pos = layout.pos;
    const edgeClass = (a: string, b: string) => {
      if (sel.has(a) || sel.has(b)) return "hot";
      if (hover === a || hover === b) return "peek";
      if (matches) return matches.has(a) && matches.has(b) ? "" : "dim";
      return sel.size ? "dim" : "";
    };
    // 선이 많으면(348개, 그중 절반이 카테고리를 넘나든다) 판이 실타래가 된다 - 기본은 고르거나 마우스를 올린 노드의 선만
    const touches = (a: string, b: string) => sel.has(a) || sel.has(b) || hover === a || hover === b;
    const shown = related.filter(([a, b]) => {
      if (edgeMode === "all" || touches(a, b)) return true;
      if (matches && matches.has(a) && matches.has(b)) return true;
      return edgeMode === "group" && termById.get(a)?.category === termById.get(b)?.category;
    });
    const relatedPaths = shown.map(([a, b]) => (
      <path key={`r-${a}-${b}`} className={`tb-edge ${edgeClass(a, b)}`} d={edgeD(pos[a], pos[b])} />
    ));
    const myLinks = layout.links.map(([a, b]) => {
      const k = pairKey(a, b), d = edgeD(pos[a], pos[b]);
      return (
        <g key={`m-${k}`}>
          <path className="tb-link-hit" data-link={k} d={d} />
          <path className={`tb-link ${edgeClass(a, b)} ${selLink === k ? "on" : ""}`} d={d} />
        </g>
      );
    });
    return (
      <>
        {groups.map((g) => (
          <g key={g.cat.id} className={`tb-group ${lit && !(catTerms.get(g.cat.id) ?? []).some((id) => lit.has(id)) ? "dim" : ""}`} style={{ "--tone": g.tone } as React.CSSProperties}>
            <rect className="tb-group-body" x={g.rect.x} y={g.rect.y} width={g.rect.w} height={g.rect.h} rx={12} />
            <path className="tb-group-head" data-group={g.cat.id} d={headPath(g.rect)} />
            {!far && <text className="tb-group-title" x={g.rect.x + 14} y={g.rect.y + 19}>{fit(g.cat.name, g.rect.w - 70, 1.08)}</text>}
            {!far && <text className="tb-group-count" x={g.rect.x + g.rect.w - 14} y={g.rect.y + 19} textAnchor="end">{catTerms.get(g.cat.id)?.length ?? 0}</text>}
          </g>
        ))}
        <g>{relatedPaths}</g>
        <g>{myLinks}</g>
        {terms.map((t) => {
          const p = pos[t.id];
          const r = rectOfNode(p);
          const on = sel.has(t.id);
          const cls = ["tb-node", on ? "on" : "", activeId === t.id ? "open" : "", lit && !lit.has(t.id) ? "dim" : "", matches?.has(t.id) ? "match" : "", draft?.target === t.id ? "target" : ""].join(" ");
          if (far) {
            return (
              <g key={t.id} className={cls}>
                <rect className="tb-node-box" data-node={t.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={9} />
                {on && <path className="tb-sel" d={brackets(r)} />}
              </g>
            );
          }
          return (
            <g key={t.id} className={cls}
              onPointerEnter={(e) => { if (e.pointerType === "mouse" && !e.buttons) setHover(t.id); }}
              onPointerLeave={() => setHover((h) => (h === t.id ? null : h))}>
              <rect className="tb-node-box" data-node={t.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={9} />
              <text className="tb-node-name" x={r.x + 12} y={r.y + 19}>{fit(t.name, NODE_W - (t.demo ? 40 : 24), 1.04)}</text>
              <text className="tb-node-en" x={r.x + 12} y={r.y + 35}>{fit(t.en, NODE_W - 24, 0.8)}</text>
              {t.demo && <text className="tb-node-demo" x={r.x + r.w - 12} y={r.y + 19} textAnchor="end">▶</text>}
              {(["front", "back", "top", "bottom"] as Side[]).map((s) => {
                const q = portAt(p, s);
                return (
                  <g key={s}>
                    <circle className="tb-port-hit" data-port={`${t.id}:${s}`} cx={q.x} cy={q.y} r={coarse ? 14 : 9} />
                    <circle className="tb-port" cx={q.x} cy={q.y} r={4} />
                  </g>
                );
              })}
              {on && <path className="tb-sel" d={brackets(r)} />}
            </g>
          );
        })}
        {/* 멀리 보기: 카테고리 이름을 화면에서 읽히는 크기로 상자 가운데에 */}
        {far && groups.map((g) => (
          <g key={`far-${g.cat.id}`} className={`tb-far ${lit && !(catTerms.get(g.cat.id) ?? []).some((id) => lit.has(id)) ? "dim" : ""}`} style={{ "--tone": g.tone } as React.CSSProperties}>
            <text className="tb-far-name" x={g.rect.x + g.rect.w / 2} y={g.rect.y + g.rect.h / 2} textAnchor="middle"
              style={{ fontSize: 17 / farZ, strokeWidth: 5 / farZ }}>{g.cat.name}</text>
            <text className="tb-far-count" x={g.rect.x + g.rect.w / 2} y={g.rect.y + g.rect.h / 2 + 20 / farZ} textAnchor="middle"
              style={{ fontSize: 12 / farZ, strokeWidth: 4 / farZ }}>{`용어 ${catTerms.get(g.cat.id)?.length ?? 0}개`}</text>
          </g>
        ))}
      </>
    );
  }, [layout, related, groups, terms, termById, sel, selLink, matches, lit, activeId, draft?.target, edgeMode, catTerms, coarse, hover, far, farZ]);

  const draftD = (() => {
    if (!draft) return null;
    const a = layout.pos[draft.from];
    if (draft.target) return edgeD(a, layout.pos[draft.target]);
    return curve(portAt(a, draft.side), draft.side, draft.cur, draft.side === "back" ? "front" : draft.side === "front" ? "back" : draft.side === "top" ? "bottom" : "top");
  })();

  const v = view ?? { x: 0, y: 0, z: 1 };
  let grid = 24;
  while (grid * v.z < 14) grid *= 2;
  const selOne = sel.size === 1 ? termById.get([...sel][0]) : undefined;
  const matchCount = matches?.size ?? 0;

  return (
    <div className="tb">
      <div ref={boardRef} tabIndex={0} role="application"
        aria-label={`용어 보드. 용어 ${terms.length}개가 카테고리 상자에 들어 있고, 같이 보면 좋은 말끼리 선으로 이어져 있습니다. 노드를 두 번 누르거나 고른 뒤 Enter 로 설명을 엽니다.`}
        className={`tb-board ${dragging === "pan" ? "panning" : ""} ${dragging === "move" ? "moving" : ""} ${draft ? "linking" : ""}`}
        style={{ backgroundSize: `${grid * v.z}px ${grid * v.z}px`, backgroundPosition: `${v.x}px ${v.y}px` }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={(e) => onUp(e)} onPointerCancel={(e) => onUp(e, true)}
        onKeyDown={onKey} onContextMenu={(e) => e.preventDefault()}>
        <svg className="tb-svg" aria-hidden="true">
          <g transform={`translate(${v.x} ${v.y}) scale(${v.z})`}>
            {content}
            {draftD && <path className="tb-draft" d={draftD} />}
            {marquee && <rect className="tb-marquee" x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} />}
          </g>
        </svg>

        <div className="tb-tools" style={{ right: 12 + insetRight }} onPointerDown={(e) => e.stopPropagation()}>
          <div className="tb-pill">
            <button type="button" aria-label="축소" onClick={() => zoomCenter(v.z / 1.25)}>−</button>
            <span className="mono tb-pct">{Math.round(v.z * 100)}%</span>
            <button type="button" aria-label="확대" onClick={() => zoomCenter(v.z * 1.25)}>+</button>
            <button type="button" className="txt" onClick={fitAll}>전체</button>
          </div>
          <div className="tb-pill" role="radiogroup" aria-label="선 보기">
            <span className="tb-pill-label">선</span>
            {([["picked", "고른 것만"], ["group", "묶음 안"], ["all", "모두"]] as const).map(([k, name]) => (
              <button key={k} type="button" role="radio" aria-checked={edgeMode === k} className={`txt ${edgeMode === k ? "on" : ""}`}
                title={k === "picked" ? "고르거나 마우스를 올린 용어의 선만" : k === "group" ? "같은 카테고리 안의 선까지" : "관련 용어 선 전부"}
                onClick={() => setEdgeMode(k)}>{name}</button>
            ))}
          </div>
          <div className="tb-pill">
            <button type="button" aria-label="되돌리기" title="되돌리기 (Ctrl+Z)" disabled={!past.current.length} onClick={undo}>↶</button>
            <button type="button" aria-label="다시 하기" title="다시 하기 (Ctrl+Y)" disabled={!future.current.length} onClick={redo}>↷</button>
            <button type="button" className="txt" onClick={resetLayout}>처음 배치</button>
          </div>
          {selLink && (
            <div className="tb-pill">
              <button type="button" className="txt danger" onClick={removeLink}>이은 선 지우기</button>
            </div>
          )}
          {matches && (
            <div className="tb-pill">
              <span className="tb-found">{matchCount ? `찾은 용어 ${matchCount}개` : "찾은 용어 없음"}</span>
              {matchCount > 0 && (
                <button type="button" className="txt" onClick={() => {
                  const r = bounds([...matches].map((id) => rectOfNode(layout.pos[id])));
                  if (r) flyTo(viewFor(r, 1.1, 60));
                }}>모아 보기</button>
              )}
            </div>
          )}
        </div>

        {selOne && !activeId && (
          <div className="tb-peek" onPointerDown={(e) => e.stopPropagation()}>
            <div className="tb-peek-text">
              <b>{selOne.name}</b> <span className="mono muted">{selOne.en}</span>
              <p>{selOne.summary}</p>
            </div>
            <button type="button" className="btn small primary" onClick={() => onOpen(selOne.id)}>설명 보기</button>
          </div>
        )}

        <MiniMap world={world} groups={groups} view={v} size={{ w: usableW(), h: size.h }} matches={matches} pos={layout.pos}
          onJump={(p) => { cancelAnimationFrame(anim.current); setView({ ...v, x: usableW() / 2 - p.x * v.z, y: size.h / 2 - p.y * v.z }); }} />

        <p className="tb-hint">
          {coarse
            ? "끌어서 판 옮기기 · 두 손가락 확대 · 길게 눌러 노드 옮기기 · 점을 끌어 잇기 · 두 번 눌러 열기"
            : "빈 곳 끌기·휠: 판 옮기기 · Ctrl+휠: 확대 · 노드 끌어 옮기기 · 노드 옆 점을 끌어 잇기 · Shift+끌기: 여러 개 고르기 · 두 번 눌러 열기"}
        </p>
      </div>
    </div>
  );
}

function MiniMap({ world, groups, view, size, matches, pos, onJump }: {
  world: Rect; groups: { cat: Category; tone: string; rect: Rect }[]; view: View; size: { w: number; h: number };
  matches: Set<string> | null; pos: Record<string, Pt>; onJump: (p: Pt) => void;
}) {
  const W = 168, H = 112, pad = 6;
  const s = Math.min((W - pad * 2) / world.w, (H - pad * 2) / world.h);
  const ox = pad + (W - pad * 2 - world.w * s) / 2 - world.x * s, oy = pad + (H - pad * 2 - world.h * s) / 2 - world.y * s;
  const vis = { x: -view.x / view.z, y: -view.y / view.z, w: size.w / view.z, h: size.h / view.z };
  const down = useRef(false);
  const jump = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onJump({ x: (e.clientX - r.left - ox) / s, y: (e.clientY - r.top - oy) / s });
  };
  return (
    <svg className="tb-mini" width={W} height={H} aria-label="미니맵 - 눌러서 그 자리로" role="img"
      onPointerDown={(e) => { e.stopPropagation(); down.current = true; e.currentTarget.setPointerCapture(e.pointerId); jump(e); }}
      onPointerMove={(e) => { if (down.current) jump(e); }}
      onPointerUp={() => { down.current = false; }} onPointerCancel={() => { down.current = false; }}>
      {groups.map((g) => (
        <rect key={g.cat.id} x={ox + g.rect.x * s} y={oy + g.rect.y * s} width={g.rect.w * s} height={g.rect.h * s} rx={2}
          style={{ fill: g.tone }} className="tb-mini-group" />
      ))}
      {matches && [...matches].map((id) => pos[id] && (
        <rect key={id} className="tb-mini-hit" x={ox + pos[id].x * s} y={oy + pos[id].y * s} width={Math.max(2, NODE_W * s)} height={Math.max(2, NODE_H * s)} />
      ))}
      <rect className="tb-mini-view" x={ox + vis.x * s} y={oy + vis.y * s} width={vis.w * s} height={vis.h * s} />
    </svg>
  );
}
