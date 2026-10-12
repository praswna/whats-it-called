import { useEffect, useMemo, useRef, useState } from "react";
import { photo } from "./media";
import "./gesture.css";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* 호버 */
export function HoverDemo() {
  const [now, setNow] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);
  const canHover = useMemo(() => typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover)").matches, []);
  const enter = (name: string) => (e: React.PointerEvent) => { if (e.pointerType === "mouse") setNow(name); };
  const leave = (e: React.PointerEvent) => { if (e.pointerType === "mouse") setNow(null); };
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented ges-seg" role="radiogroup" aria-label="화면 종류">
          <button type="button" role="radio" aria-checked={!touch} className={!touch ? "on" : ""} onClick={() => setTouch(false)}>마우스 화면</button>
          <button type="button" role="radio" aria-checked={touch} className={touch ? "on" : ""} onClick={() => setTouch(true)}>터치 화면</button>
        </div>
        <span className="chip">{touch ? "호버 없음 (터치)" : now ? `호버 중: ${now}` : "호버 아님"}</span>
      </div>
      <div className={`ges-hover ${touch ? "ges-touch" : ""}`}>
        <p>
          자세한 내용은{" "}
          <a href="#" className="ges-hlink" onClick={(e) => e.preventDefault()} onPointerEnter={enter("링크")} onPointerLeave={leave}>도움말 문서</a>
          를 참고하세요.
        </p>
        <div className="row">
          <button type="button" className="ges-hbtn" onPointerEnter={enter("버튼")} onPointerLeave={leave}>저장하기</button>
          <button type="button" className="ges-thumb" aria-label="동영상 재생" onPointerEnter={enter("썸네일")} onPointerLeave={leave}>
            <img src={photo(5, 320, 180)} alt="" draggable={false} />
            <span className="ges-play" aria-hidden="true">▶</span>
            <span className="ges-dur">3:24</span>
          </button>
        </div>
      </div>
      <span className="muted">
        {canHover ? "링크, 버튼, 썸네일 위에 커서를 올려 보세요. 누르지 않아도 모양이 바뀝니다. " : "지금 기기는 호버가 없는 터치 화면이라 올려 두기만 하는 상태가 없습니다. "}
        '터치 화면'으로 바꾸면 호버 없이도 알 수 있게 밑줄과 재생 버튼이 처음부터 보입니다.
      </span>
    </div>
  );
}

/* 호버 의도 판단 */
const MENU = [
  { name: "과일", items: ["사과", "배", "포도", "귤", "수박"] },
  { name: "채소", items: ["당근", "오이", "양파", "감자", "배추"] },
  { name: "음료", items: ["물", "우유", "주스", "녹차", "커피"] },
  { name: "과자", items: ["쿠키", "젤리", "초콜릿", "사탕", "떡"] },
  { name: "빵", items: ["식빵", "베이글", "크루아상", "모닝빵", "도넛"] },
];
type Pt = { x: number; y: number };
const sideOf = (p: Pt, a: Pt, b: Pt) => (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
function inTriangle(p: Pt, a: Pt, b: Pt, c: Pt) {
  const d1 = sideOf(p, a, b), d2 = sideOf(p, b, c), d3 = sideOf(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function IntentMenu({ smart, showTri }: { smart: boolean; showTri: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const [switches, setSwitches] = useState(0);
  const [picked, setPicked] = useState("");
  const [tri, setTri] = useState<[Pt, Pt, Pt] | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const sub = useRef<HTMLUListElement>(null);
  const anchor = useRef<Pt | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const activeRef = useRef<number | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = (i: number | null) => {
    if (activeRef.current === i) return;
    activeRef.current = i;
    setActive(i);
    if (i !== null) setSwitches((n) => n + 1);
    else setTri(null);
  };
  const local = (e: React.PointerEvent): Pt => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const subEdge = (): [Pt, Pt] => {
    const r = wrap.current!.getBoundingClientRect(), s = sub.current!.getBoundingClientRect();
    return [{ x: s.left - r.left, y: s.top - r.top }, { x: s.left - r.left, y: s.bottom - r.top }];
  };
  const setAnchor = (p: Pt) => { anchor.current = p; const [b, c] = subEdge(); setTri([p, b, c]); };

  const onItemMove = (e: React.PointerEvent, i: number) => {
    if (e.pointerType !== "mouse") return;
    const p = local(e);
    window.clearTimeout(timer.current);
    if (!smart) { open(i); return; }
    const cur = activeRef.current;
    if (cur === null) { timer.current = window.setTimeout(() => { open(i); setAnchor(p); }, 120); return; }
    if (cur === i) { setAnchor(p); return; }
    const [b, c] = subEdge();
    if (anchor.current && inTriangle(p, anchor.current, b, c)) {
      // 하위 메뉴 쪽으로 가는 중: 멈춰서 머물 때만 바꾼다
      timer.current = window.setTimeout(() => { open(i); setAnchor(p); }, 300);
    } else {
      open(i); setAnchor(p);
    }
  };
  const onEnter = () => window.clearTimeout(timer.current);
  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(timer.current);
    if (!smart) open(null);
    else timer.current = window.setTimeout(() => open(null), 300);
  };
  const cur = active === null ? null : MENU[active];
  return (
    <div className="ges-hi-col">
      <b className="ges-hi-title">{smart ? "의도 판단 + 세이프 트라이앵글" : "바로 열림"}</b>
      <div className="ges-hi-wrap" ref={wrap} onPointerEnter={onEnter} onPointerLeave={onLeave}>
        <ul className="ges-hi-main" role="menu" aria-label={smart ? "의도 판단 메뉴" : "바로 열리는 메뉴"}>
          {MENU.map((m, i) => (
            <li key={m.name} role="none" onPointerMove={(e) => onItemMove(e, i)}>
              <button type="button" role="menuitem" aria-haspopup="true" aria-expanded={active === i} className={active === i ? "ges-on" : ""}
                onClick={() => { activeRef.current = null; open(i); }}>
                {m.name}<span aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
        <ul className="ges-hi-sub" ref={sub} role="menu" aria-label={cur ? `${cur.name} 하위 메뉴` : "하위 메뉴"}
          onPointerMove={() => window.clearTimeout(timer.current)}>
          {cur ? cur.items.map((it) => (
            <li key={it} role="none">
              <button type="button" role="menuitem" onClick={() => setPicked(it)}>{it}</button>
            </li>
          )) : <li className="ges-hi-empty">항목에 올려 보세요</li>}
        </ul>
        {smart && showTri && tri && active !== null && (
          <svg className="ges-hi-tri" aria-hidden="true">
            <polygon points={tri.map((p) => `${p.x},${p.y}`).join(" ")} />
          </svg>
        )}
      </div>
      <span className="ges-hi-stat">
        하위 메뉴 바뀜 <b>{switches}</b>번{picked && <> · 고름: <b>{picked}</b></>}
        {" "}<button type="button" className="link" onClick={() => { setSwitches(0); setPicked(""); }}>0으로</button>
      </span>
    </div>
  );
}

export function HoverIntentDemo() {
  const [showTri, setShowTri] = useState(true);
  return (
    <div className="demo-stage">
      <div className="ges-hi-pair">
        <IntentMenu smart={false} showTri={false} />
        <IntentMenu smart showTri={showTri} />
      </div>
      <label className="row ges-check"><input type="checkbox" checked={showTri} onChange={(e) => setShowTri(e.target.checked)} /> 세이프 트라이앵글 보이기</label>
      <span className="muted">
        '과일'에 커서를 올린 뒤 하위 메뉴 맨 아래 '수박'으로 대각선으로 곧장 옮겨 보세요. 왼쪽은 지나가는 항목마다 하위 메뉴가 바뀌어 버리고,
        오른쪽은 커서가 삼각형 안에서 하위 메뉴 쪽으로 가는 동안 그대로 유지됩니다.
      </span>
    </div>
  );
}

/* 드래그 핸들 */
const ROW = 46;
export function DragHandleDemo() {
  const [mode, setMode] = useState<"handle" | "row">("handle");
  const [items, setItems] = useState([
    { id: 1, text: "우유랑 달걀 사기", done: false },
    { id: 2, text: "택배 반품 접수하기", done: true },
    { id: 3, text: "치과 예약 바꾸기", done: false },
    { id: 4, text: "화분에 물 주기", done: false },
  ]);
  const [drag, setDrag] = useState<{ idx: number; dy: number } | null>(null);
  const start = useRef<{ idx: number; y: number; moved: boolean } | null>(null);
  const dyRef = useRef(0);
  const target = drag ? clamp(drag.idx + Math.round(drag.dy / ROW), 0, items.length - 1) : -1;

  const move = (from: number, to: number) => {
    if (from === to) return;
    setItems((prev) => { const next = [...prev]; const [m] = next.splice(from, 1); next.splice(to, 0, m); return next; });
  };
  const onDown = (e: React.PointerEvent<HTMLElement>, idx: number) => {
    if (e.button !== 0) return;
    start.current = { idx, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    const dy = e.clientY - s.y;
    if (!s.moved && Math.abs(dy) < 4) return;
    s.moved = true; dyRef.current = dy;
    setDrag({ idx: s.idx, dy });
  };
  const onUp = () => {
    const s = start.current; start.current = null;
    if (s?.moved) move(s.idx, clamp(s.idx + Math.round(dyRef.current / ROW), 0, items.length - 1));
    setDrag(null);
  };
  const shift = (i: number) => {
    if (!drag || i === drag.idx) return 0;
    if (drag.idx < i && i <= target) return -ROW;
    if (target <= i && i < drag.idx) return ROW;
    return 0;
  };
  const handlers = (idx: number) => ({ onPointerDown: (e: React.PointerEvent<HTMLElement>) => onDown(e, idx), onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp });

  // 리사이즈 핸들
  const [size, setSize] = useState({ w: 220, h: 84 });
  const rs = useRef<{ x: number; y: number; w: number; h: number; max: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const maxW = () => boxRef.current?.parentElement?.clientWidth ?? 300;

  return (
    <div className="demo-stage">
      <div className="segmented ges-seg" role="radiogroup" aria-label="끄는 방식">
        <button type="button" role="radio" aria-checked={mode === "handle"} className={mode === "handle" ? "on" : ""} onClick={() => setMode("handle")}>손잡이로만</button>
        <button type="button" role="radio" aria-checked={mode === "row"} className={mode === "row" ? "on" : ""} onClick={() => setMode("row")}>줄 전체</button>
      </div>
      <ul className={`ges-dh-list ges-mode-${mode}`} style={{ height: items.length * ROW - 6 }}>
        {items.map((it, i) => {
          const dragging = drag?.idx === i;
          return (
            <li key={it.id} className={`ges-dh-row ${dragging ? "ges-dragging" : ""} ${drag ? "ges-moving" : ""}`}
              style={{ transform: `translateY(${dragging ? drag.dy : shift(i)}px)` }}
              {...(mode === "row" ? handlers(i) : {})}>
              <button type="button" className="ges-dh-grip" aria-label={`${it.text} 순서 옮기기 (위·아래 화살표)`}
                {...(mode === "handle" ? handlers(i) : {})}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); move(i, i - 1); }
                  if (e.key === "ArrowDown" && i < items.length - 1) { e.preventDefault(); move(i, i + 1); }
                }}>
                ⋮⋮
              </button>
              <input type="checkbox" checked={it.done} aria-label="완료"
                onChange={() => setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))} />
              <span className={`ges-dh-text ${it.done ? "ges-done" : ""}`}>{it.text}</span>
            </li>
          );
        })}
      </ul>
      <div className="ges-dh-boxwrap">
        <div className="ges-dh-box" ref={boxRef} style={{ width: size.w, height: size.h }}>
          <span className="muted">메모 상자 {Math.round(size.w)}×{Math.round(size.h)}</span>
          <button type="button" className="ges-dh-resize" aria-label="메모 상자 크기 조절 (화살표 키)"
            onPointerDown={(e) => { rs.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h, max: maxW() }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { const r = rs.current; if (!r) return; setSize({ w: clamp(r.w + e.clientX - r.x, 140, r.max), h: clamp(r.h + e.clientY - r.y, 60, 200) }); }}
            onPointerUp={() => { rs.current = null; }} onPointerCancel={() => { rs.current = null; }}
            onKeyDown={(e) => {
              const d = { ArrowRight: [10, 0], ArrowLeft: [-10, 0], ArrowDown: [0, 10], ArrowUp: [0, -10] }[e.key];
              if (!d) return; e.preventDefault();
              setSize((s) => ({ w: clamp(s.w + d[0], 140, maxW()), h: clamp(s.h + d[1], 60, 200) }));
            }} />
        </div>
      </div>
      <span className="muted">
        ⋮⋮ 손잡이를 잡고 위아래로 끌어 보세요. 손잡이가 따로 있으니 글자는 그대로 끌어서 고를 수 있습니다.
        '줄 전체'로 바꾸면 어디를 잡아도 끌리지만 글자를 고를 수 없게 됩니다. 메모 상자 모서리는 리사이즈 핸들입니다.
      </span>
    </div>
  );
}

/* 바깥 클릭으로 닫기 */
export function ClickOutsideDemo() {
  const sorts = ["최신순", "인기순", "댓글 많은 순"];
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState(sorts[0]);
  const [log, setLog] = useState("");
  const dd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (dd.current && !dd.current.contains(e.target as Node)) { setOpen(false); setLog("메뉴 바깥을 눌러서 닫혔습니다."); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setLog("Esc 키로 닫혔습니다."); } };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown, true); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const [modal, setModal] = useState(false);
  const [text, setText] = useState("");
  const [guard, setGuard] = useState(true);
  const dialog = useRef<HTMLDivElement>(null);
  const tryClose = (how: string) => {
    if (guard && text.trim()) {
      dialog.current?.animate([{ transform: "translate(-50%, -50%)" }, { transform: "translate(calc(-50% - 6px), -50%)" }, { transform: "translate(calc(-50% + 6px), -50%)" }, { transform: "translate(-50%, -50%)" }], { duration: 220 });
      setLog(`쓰던 글이 있어서 ${how}으로는 닫지 않았습니다.`);
      return;
    }
    setModal(false); setText("");
    setLog(text.trim() ? `${how}으로 닫혀서 쓰던 글이 사라졌습니다.` : `${how}으로 닫혔습니다.`);
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="ges-co-dd" ref={dd}>
          <button type="button" className="btn small" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>정렬: {sort} ▾</button>
          {open && (
            <ul className="ges-co-menu" role="listbox" aria-label="정렬">
              {sorts.map((s) => (
                <li key={s}><button type="button" role="option" aria-selected={s === sort} onClick={() => { setSort(s); setOpen(false); setLog("항목을 골라서 닫혔습니다."); }}>{s}</button></li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn small" onClick={() => { setModal(true); setLog(""); }}>댓글 쓰기 창 열기</button>
      </div>
      <div className="ges-co-stage">
        <p className="muted">가을 산책길 사진 모음 · 댓글 12개</p>
        <div className="ges-co-lines" aria-hidden="true"><span /><span /><span style={{ width: "60%" }} /></div>
        {modal && (
          <>
            <div className="scrim" onPointerDown={() => tryClose("배경 클릭")} />
            <div className="ges-co-dialog" ref={dialog} role="dialog" aria-modal="true" aria-label="댓글 쓰기"
              onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); tryClose("Esc 키"); } }}>
              <b>댓글 쓰기</b>
              <textarea autoFocus rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="여기에 뭔가 써 보세요" />
              <div className="row end">
                <button type="button" className="btn small" onClick={() => { setModal(false); setText(""); setLog("닫기 버튼으로 닫혔습니다."); }}>닫기</button>
                <button type="button" className="btn small primary" onClick={() => { setModal(false); setText(""); setLog("올렸습니다."); }}>올리기</button>
              </div>
            </div>
          </>
        )}
      </div>
      <label className="row ges-check"><input type="checkbox" checked={guard} onChange={(e) => setGuard(e.target.checked)} /> 쓰던 글이 있으면 바깥 클릭으로 닫지 않기</label>
      <span className="ges-log" aria-live="polite">{log || " "}</span>
      <span className="muted">정렬 메뉴를 열고 바깥 아무 곳이나 눌러 보세요. 댓글 창에 글을 쓰다가 어두운 배경을 눌러 보면, 설정에 따라 닫히거나 흔들리며 버팁니다.</span>
    </div>
  );
}

/* 커서 어포던스 */
const CURSORS: [string, string, string, string][] = [
  ["pointer", "👆", "누를 수 있음", "링크·버튼"],
  ["grab", "✋", "잡아 끌 수 있음", "지도·캔버스"],
  ["grabbing", "✊", "끄는 중", "잡은 상태"],
  ["text", "Ɪ", "글자 고르기", "본문·입력칸"],
  ["ew-resize", "↔", "좌우 크기 조절", "나눈 화면 경계"],
  ["nwse-resize", "⤡", "대각선 크기 조절", "창 모서리"],
  ["move", "✥", "옮길 수 있음", "도형·창"],
  ["not-allowed", "🚫", "할 수 없음", "비활성 버튼"],
  ["zoom-in", "🔍", "확대할 수 있음", "사진"],
  ["progress", "⏳", "처리 중", "불러오는 동안"],
  ["crosshair", "+", "정밀하게 찍기", "자르기·스포이트"],
  ["help", "?", "도움말 있음", "물음표 아이콘"],
];
export function CursorAffordanceDemo() {
  const [cur, setCur] = useState<number | null>(null);
  const [pan, setPan] = useState({ x: 30, y: 40 });
  const [grabbing, setGrabbing] = useState(false);
  const ps = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const c = cur === null ? null : CURSORS[cur];
  return (
    <div className="demo-stage">
      <div className="ges-cur-grid">
        {CURSORS.map(([css, icon, label], i) => (
          <button type="button" key={css} className={`ges-cur-tile ${cur === i ? "ges-on" : ""}`} style={{ cursor: css }}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setCur(i); }} onFocus={() => setCur(i)} onClick={() => setCur(i)}>
            <span className="ges-cur-icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="ges-cur-read" aria-live="polite">
        {c ? <><code className="mono">cursor: {c[0]}</code> — {c[2]} <span className="muted">(예: {c[3]})</span></> : <span className="muted">칸 위에 커서를 올려 보세요.</span>}
      </div>
      <div className={`ges-cur-map ${grabbing ? "ges-grabbing" : ""}`} role="img" aria-label="끌어서 움직이는 지도 예시"
        style={{ backgroundImage: `url("${photo(9, 600, 400)}")`, backgroundPosition: `${pan.x}% ${pan.y}%` }}
        onPointerDown={(e) => { ps.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; setGrabbing(true); e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { const s = ps.current; if (!s) return; setPan({ x: clamp(s.px - (e.clientX - s.x) / 3, 0, 100), y: clamp(s.py - (e.clientY - s.y) / 2, 0, 100) }); }}
        onPointerUp={() => { ps.current = null; setGrabbing(false); }} onPointerCancel={() => { ps.current = null; setGrabbing(false); }}>
        <span className="ges-cur-maplabel">{grabbing ? "✊ 끄는 중" : "✋ 잡고 끌어 보기"}</span>
      </div>
      <span className="muted">칸마다 커서 모양이 다릅니다. 모양만 보고도 누를지, 끌지, 크기를 바꿀지 알 수 있습니다. 아래 사진은 손바닥 커서로 잡고 끌 수 있습니다.</span>
    </div>
  );
}

/* 터치 타깃·히트 영역 */
const TAGS = ["여행", "가을", "산책", "사진", "주말"];
export function HitTargetDemo() {
  const [wide, setWide] = useState(false);
  const [show, setShow] = useState(true);
  const [tags, setTags] = useState(TAGS);
  const [hit, setHit] = useState(0);
  const [miss, setMiss] = useState(0);
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  return (
    <div className="demo-stage">
      <div className="row">
        <label className="row ges-check"><input type="checkbox" checked={wide} onChange={(e) => setWide(e.target.checked)} /> 히트 영역 44px 로 넓히기</label>
        <label className="row ges-check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> 히트 영역 보이기</label>
      </div>
      <div className={`ges-ht-zone ${wide ? "ges-wide" : ""} ${show ? "ges-show" : ""}`}
        onPointerDown={(e) => { const t = e.target as HTMLElement; if (t.closest(".ges-ht-tag") && !t.closest(".ges-ht-x")) setMiss((n) => n + 1); }}>
        {tags.map((t) => (
          <span key={t} className="ges-ht-tag">
            {t}
            <button type="button" className="ges-ht-x" aria-label={`${t} 태그 지우기`} onClick={() => { setTags((p) => p.filter((x) => x !== t)); setHit((n) => n + 1); }}>✕</button>
          </span>
        ))}
        {tags.length === 0 && <button type="button" className="btn small" onClick={() => setTags(TAGS)}>다시 채우기</button>}
      </div>
      <span className="ges-log">✕ 맞힘 <b>{hit}</b> · 태그는 눌렀지만 ✕ 를 빗나감 <b>{miss}</b>{" "}
        <button type="button" className="link" onClick={() => { setHit(0); setMiss(0); setTags(TAGS); }}>처음부터</button>
      </span>
      <div className={`ges-ht-cbs ${show ? "ges-show" : ""}`}>
        <label className="ges-ht-cb ges-wide"><input type="checkbox" checked={a} onChange={() => setA(!a)} /> 라벨을 눌러도 체크됨</label>
        <span className="ges-ht-cb"><input type="checkbox" checked={b} onChange={() => setB(!b)} aria-label="네모만 눌림" /> 네모만 눌림</span>
      </div>
      <span className="muted">작은 ✕ 를 손가락이나 커서로 빠르게 눌러 보세요. 넓히기를 켜면 ✕ 는 그대로인데 주변(점선)까지 눌립니다. 체크박스도 글자까지 눌리는 쪽이 훨씬 편합니다.</span>
    </div>
  );
}

/* 오터치 방지 */
export function FatFingerDemo() {
  const [safe, setSafe] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [st, setSt] = useState({ cancel: 0, oops: 0, saved: 0, miss: 0 });
  const [msg, setMsg] = useState("");
  const [blob, setBlob] = useState<{ x: number; y: number; hx: number; hy: number; k: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const act = (a: string) => {
    if (a === "cancel") { setSt((s) => ({ ...s, cancel: s.cancel + 1 })); setMsg("취소를 눌렀습니다."); }
    else if (a === "delete") {
      if (safe) { setConfirm(true); setMsg("삭제가 눌렸지만 확인창이 한 번 더 물어봅니다."); }
      else { setSt((s) => ({ ...s, oops: s.oops + 1 })); setMsg("앗, 옆의 삭제가 눌렸습니다!"); }
    } else if (a === "keep") { setConfirm(false); setSt((s) => ({ ...s, saved: s.saved + 1 })); setMsg("확인창 덕분에 지우지 않았습니다."); }
    else if (a === "really") { setConfirm(false); setSt((s) => ({ ...s, oops: s.oops + 1 })); setMsg("삭제했습니다."); }
  };
  const onUp = (e: React.PointerEvent) => {
    const el = box.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const ang = Math.random() * Math.PI * 2, d = 6 + Math.random() * 18;
    const hx = e.clientX + Math.cos(ang) * d, hy = e.clientY + Math.sin(ang) * d;
    const btn = Array.from(el.querySelectorAll<HTMLElement>("[data-act]")).find((b) => {
      const br = b.getBoundingClientRect();
      return hx >= br.left && hx <= br.right && hy >= br.top && hy <= br.bottom;
    });
    setBlob({ x: e.clientX - r.left, y: e.clientY - r.top, hx: hx - r.left, hy: hy - r.top, k: Date.now() });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBlob(null), 900);
    if (btn) act(btn.dataset.act!);
    else if ((e.target as HTMLElement).closest("[data-act]")) { setSt((s) => ({ ...s, miss: s.miss + 1 })); setMsg("손가락이 빗나가서 아무것도 안 눌렸습니다."); }
  };
  // 키보드로 누를 때(detail 0)만 onClick 으로 처리, 포인터는 위의 onUp 이 흉내 낸 자리로 판정
  const key = (a: string) => (e: React.MouseEvent) => { if (e.detail === 0) act(a); };
  return (
    <div className="demo-stage">
      <div className="segmented ges-seg" role="radiogroup" aria-label="버튼 배치">
        <button type="button" role="radio" aria-checked={!safe} className={!safe ? "on" : ""} onClick={() => { setSafe(false); setConfirm(false); }}>작게 붙여 둠</button>
        <button type="button" role="radio" aria-checked={safe} className={safe ? "on" : ""} onClick={() => setSafe(true)}>크게·멀리 + 확인</button>
      </div>
      <div className="ges-ff-box" ref={box} onPointerUp={onUp}>
        <b>사진 12장을 정리할까요?</b>
        <span className="muted">휴지통으로 옮긴 사진은 되살릴 수 없습니다.</span>
        {!safe && (
          <div className="ges-ff-tight">
            <button type="button" data-act="cancel" onClick={key("cancel")}>취소</button>
            <button type="button" data-act="delete" className="ges-danger" onClick={key("delete")}>삭제</button>
          </div>
        )}
        {safe && !confirm && (
          <div className="ges-ff-safe">
            <button type="button" data-act="delete" className="btn danger" onClick={key("delete")}>삭제</button>
            <button type="button" data-act="cancel" className="btn primary" onClick={key("cancel")}>취소</button>
          </div>
        )}
        {safe && confirm && (
          <div className="ges-ff-confirm">
            <span>정말 삭제할까요? 되돌릴 수 없습니다.</span>
            <div className="ges-ff-safe">
              <button type="button" data-act="really" className="btn danger" onClick={key("really")}>삭제</button>
              <button type="button" data-act="keep" className="btn primary" onClick={key("keep")}>그만두기</button>
            </div>
          </div>
        )}
        {blob && (
          <span key={blob.k} aria-hidden="true">
            <span className="ges-ff-finger" style={{ left: blob.x, top: blob.y }} />
            <span className="ges-ff-hit" style={{ left: blob.hx, top: blob.hy }} />
          </span>
        )}
      </div>
      <span className="ges-log" aria-live="polite">
        취소 <b>{st.cancel}</b> · 원치 않은 삭제 <b>{st.oops}</b>{safe && <> · 확인창이 막음 <b>{st.saved}</b></>} · 빗나감 <b>{st.miss}</b>
        {msg && <> — {msg}</>}
      </span>
      <span className="muted">'취소'를 여러 번 눌러 보세요. 진짜 손가락처럼 누른 자리(큰 원)와 실제로 닿은 자리(점)가 조금씩 어긋납니다. 버튼이 작고 붙어 있으면 삭제가 자주 눌립니다.</span>
    </div>
  );
}

/* 당겨서 새로고침 */
const PTR_THRESH = 56;
const POSTS = ["오늘 점심은 김치찌개", "비 온다더니 맑음", "새 운동화 샀어요", "고양이가 상자에 들어감", "주말 등산 갈 사람", "책 한 권 다 읽었다"];
export function PullToRefreshDemo() {
  const [items, setItems] = useState(() => POSTS.map((t, i) => ({ id: i, t, time: `${(i + 1) * 7}분 전` })));
  const [pull, setPull] = useState(0);
  const [phase, setPhase] = useState<"idle" | "pulling" | "loading">("idle");
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);
  const seq = useRef(100);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const refresh = () => {
    setPhase("loading"); setPull(44); pullRef.current = 44;
    timer.current = window.setTimeout(() => {
      const n = ++seq.current;
      setItems((p) => [{ id: n, t: `새 글이 올라왔어요 #${n - 100}`, time: "방금" }, ...p].slice(0, 8));
      setPhase("idle"); setPull(0); pullRef.current = 0;
    }, 1200);
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase === "loading") return;
    start.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (start.current === null) return;
    const d = e.clientY - start.current;
    // 끌어내린 거리보다 덜 따라오게 (저항감)
    const p = d <= 0 ? 0 : d < 80 ? d * 0.6 : Math.min(110, 48 + (d - 80) * 0.3);
    pullRef.current = p; setPull(p); setPhase(p > 0 ? "pulling" : "idle");
  };
  const onUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (pullRef.current >= PTR_THRESH) refresh();
    else { setPull(0); pullRef.current = 0; setPhase("idle"); }
  };
  const ready = pull >= PTR_THRESH;
  return (
    <div className="demo-stage">
      <div className="phone ges-phone">
        <div className="ges-ph-head"><b>새 소식</b>
          <button type="button" className="ges-ph-hbtn" aria-label="새로고침" disabled={phase === "loading"} onClick={refresh}>↻</button>
        </div>
        <div className="ges-ptr-body" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="ges-ptr-ind" style={{ height: pull }} aria-live="polite">
            {phase === "loading" ? <><span className="ges-spin" aria-hidden="true" /> 새로고침 중…</>
              : pull > 8 ? <><span className="ges-ptr-arrow" style={{ transform: `rotate(${ready ? 180 : 0}deg)` }} aria-hidden="true">↓</span>{ready ? "놓으면 새로고침" : "당겨서 새로고침"}</> : null}
          </div>
          <ul className={`ges-ptr-list ${phase === "pulling" ? "" : "ges-anim"}`} style={{ transform: `translateY(${pull}px)` }}>
            {items.map((it) => (
              <li key={it.id} className={it.time === "방금" ? "ges-new" : ""}><span>{it.t}</span><small className="muted">{it.time}</small></li>
            ))}
          </ul>
        </div>
      </div>
      <span className="muted">목록을 아래로 끌어내려 보세요. 충분히 당기면 화살표가 뒤집히며 '놓으면 새로고침'으로 바뀌고, 놓으면 새 글이 맨 위에 생깁니다.</span>
    </div>
  );
}

/* 핀치 줌 */
type View = { s: number; x: number; y: number };
export function PinchZoomDemo() {
  const vp = useRef<HTMLDivElement>(null);
  const [v, setV] = useState<View>({ s: 1, x: 0, y: 0 });
  const vRef = useRef(v);
  const pts = useRef(new Map<number, Pt>());
  const [dots, setDots] = useState<Pt[]>([]);
  const pinch = useRef<{ s0: number; cx: number; cy: number; d0: number } | null>(null);
  const pan = useRef<{ px: number; py: number; x0: number; y0: number } | null>(null);

  const fit = (s: number, x: number, y: number): View => {
    const el = vp.current; const w = el?.clientWidth ?? 300, h = el?.clientHeight ?? 200;
    s = clamp(s, 1, 4);
    return { s, x: clamp(x, w - w * s, 0), y: clamp(y, h - h * s, 0) };
  };
  const set = (n: View) => { vRef.current = n; setV(n); };
  const zoomAt = (ns: number, px: number, py: number) => {
    const b = vRef.current; ns = clamp(ns, 1, 4);
    set(fit(ns, px - (px - b.x) * (ns / b.s), py - (py - b.y) * (ns / b.s)));
  };
  const zoomCenter = (ns: number) => { const el = vp.current; if (el) zoomAt(ns, el.clientWidth / 2, el.clientHeight / 2); };
  const local = (cx: number, cy: number): Pt => { const r = vp.current!.getBoundingClientRect(); return { x: cx - r.left, y: cy - r.top }; };

  const beginGesture = () => {
    const list = Array.from(pts.current.values());
    const b = vRef.current;
    if (list.length >= 2) {
      const [p, q] = list;
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      pinch.current = { s0: b.s, d0: Math.hypot(p.x - q.x, p.y - q.y) || 1, cx: (mid.x - b.x) / b.s, cy: (mid.y - b.y) / b.s };
      pan.current = null;
    } else if (list.length === 1) {
      pinch.current = null;
      pan.current = { px: list[0].x, py: list[0].y, x0: b.x, y0: b.y };
    } else { pinch.current = null; pan.current = null; }
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, local(e.clientX, e.clientY));
    beginGesture();
    setDots(pts.current.size >= 2 ? Array.from(pts.current.values()) : []);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, local(e.clientX, e.clientY));
    const list = Array.from(pts.current.values());
    if (pinch.current && list.length >= 2) {
      const [p, q] = list; const g = pinch.current;
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      const ns = clamp(g.s0 * Math.hypot(p.x - q.x, p.y - q.y) / g.d0, 1, 4);
      set(fit(ns, mid.x - g.cx * ns, mid.y - g.cy * ns));
      setDots(list);
    } else if (pan.current) {
      const g = pan.current;
      set(fit(vRef.current.s, g.x0 + list[0].x - g.px, g.y0 + list[0].y - g.py));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    beginGesture();
    setDots(pts.current.size >= 2 ? Array.from(pts.current.values()) : []);
  };

  useEffect(() => {
    const el = vp.current; if (!el) return;
    // 트랙패드 핀치는 ctrl+휠로 들어온다. ctrl 이 없을 때는 페이지 스크롤을 그대로 둔다.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(vRef.current.s * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
    };
    // Safari 의 트랙패드 제스처
    let g0 = 1;
    const onGS = (e: Event) => { e.preventDefault(); g0 = vRef.current.s; };
    const onGC = (e: Event) => { e.preventDefault(); zoomCenter(g0 * (e as Event & { scale: number }).scale); };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGS);
    el.addEventListener("gesturechange", onGC);
    return () => { el.removeEventListener("wheel", onWheel); el.removeEventListener("gesturestart", onGS); el.removeEventListener("gesturechange", onGC); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="demo-stage">
      <div className="ges-pz-vp" ref={vp} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        role="img" aria-label={`확대할 수 있는 사진, ${Math.round(v.s * 100)}%`}>
        <img src={photo(11, 480, 320)} alt="" draggable={false}
          style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.s})` }} />
        {dots.map((d, i) => <span key={i} className="ges-pz-dot" style={{ left: d.x, top: d.y }} aria-hidden="true" />)}
        {dots.length >= 2 && (
          <svg className="ges-pz-line" aria-hidden="true"><line x1={dots[0].x} y1={dots[0].y} x2={dots[1].x} y2={dots[1].y} /></svg>
        )}
      </div>
      <div className="row ges-pz-ctrl">
        <button type="button" className="btn icon" aria-label="축소" onClick={() => zoomCenter(vRef.current.s / 1.25)}>−</button>
        <input type="range" min={100} max={400} value={Math.round(v.s * 100)} aria-label="확대 배율"
          onChange={(e) => zoomCenter(Number(e.target.value) / 100)} />
        <button type="button" className="btn icon" aria-label="확대" onClick={() => zoomCenter(vRef.current.s * 1.25)}>+</button>
        <span className="mono ges-pz-pct">{Math.round(v.s * 100)}%</span>
        <button type="button" className="btn small" onClick={() => set({ s: 1, x: 0, y: 0 })}>원래대로</button>
      </div>
      <span className="muted">휴대폰에서는 사진 위에서 두 손가락을 벌리고 오므려 보세요. 트랙패드는 두 손가락 핀치, 마우스는 Ctrl+휠, 아니면 슬라이더로 확대합니다. 확대한 뒤에는 한 손가락으로 끌어 옮길 수 있습니다.</span>
    </div>
  );
}

/* 더블 탭 */
export function DoubleTapDemo() {
  const [mode, setMode] = useState<"like" | "zoom">("like");
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(128);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [zoom, setZoom] = useState({ on: false, ox: 50, oy: 50 });
  const [caption, setCaption] = useState(true);
  const [log, setLog] = useState("");
  const last = useRef<{ t: number; x: number; y: number } | null>(null);
  const single = useRef<number | undefined>(undefined);
  const hid = useRef(0);
  useEffect(() => () => window.clearTimeout(single.current), []);

  const like = (on: boolean) => { setLiked(on); setLikes((n) => n + (on ? 1 : -1)); };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, t = performance.now();
    const l = last.current;
    window.clearTimeout(single.current);
    if (l && t - l.t < 300 && Math.hypot(x - l.x, y - l.y) < 30) {
      last.current = null;
      if (mode === "like") {
        if (!liked) like(true);
        setHearts((h) => [...h, { id: ++hid.current, x, y }]);
        setLog("두 번 탭 → 좋아요");
      } else {
        setZoom((z) => (z.on ? { ...z, on: false } : { on: true, ox: (x / r.width) * 100, oy: (y / r.height) * 100 }));
        setLog(zoom.on ? "두 번 탭 → 원래 크기로" : "두 번 탭 → 두드린 자리를 확대");
      }
      return;
    }
    last.current = { t, x, y };
    setLog("한 번 탭… 두 번째 탭을 300ms 기다리는 중");
    single.current = window.setTimeout(() => {
      last.current = null;
      setCaption((c) => !c);
      setLog("한 번 탭으로 판정 → 설명을 켜고 껐습니다 (300ms 늦게)");
    }, 300);
  };
  return (
    <div className="demo-stage">
      <div className="segmented ges-seg" role="radiogroup" aria-label="두 번 탭 동작">
        <button type="button" role="radio" aria-checked={mode === "like"} className={mode === "like" ? "on" : ""} onClick={() => setMode("like")}>좋아요</button>
        <button type="button" role="radio" aria-checked={mode === "zoom"} className={mode === "zoom" ? "on" : ""} onClick={() => setMode("zoom")}>확대</button>
      </div>
      <div className="ges-dt-photo" onPointerUp={onUp} role="img" aria-label="두 번 두드릴 수 있는 사진">
        <img src={photo(14, 480, 360)} alt="" draggable={false}
          style={{ transform: zoom.on ? "scale(2.2)" : "scale(1)", transformOrigin: `${zoom.ox}% ${zoom.oy}%` }} />
        {hearts.map((h) => (
          <span key={h.id} className="ges-dt-heart" style={{ left: h.x, top: h.y }} aria-hidden="true"
            onAnimationEnd={() => setHearts((p) => p.filter((x) => x.id !== h.id))}>♥</span>
        ))}
        {caption && <span className="ges-dt-cap">가을 산책길 · 한 번 탭하면 이 설명이 켜지고 꺼집니다</span>}
      </div>
      <div className="row">
        <button type="button" className={`btn small ges-dt-like ${liked ? "ges-on" : ""}`} aria-pressed={liked} onClick={() => like(!liked)}>
          {liked ? "♥" : "♡"} {likes}
        </button>
        {mode === "zoom" && <button type="button" className="btn small" onClick={() => setZoom((z) => ({ on: !z.on, ox: 50, oy: 50 }))}>{zoom.on ? "축소" : "확대"}</button>}
        <span className="ges-log" aria-live="polite">{log}</span>
      </div>
      <span className="muted">사진을 빠르게 두 번 두드려 보세요. 한 번만 두드리면 두 번째 탭을 기다리느라 설명이 살짝 늦게 켜지고 꺼집니다.</span>
    </div>
  );
}

/* 가장자리 스와이프 */
const EDGE = 24;
export function EdgeSwipeDemo() {
  const [screen, setScreen] = useState<"list" | "chat">("chat");
  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState(false);
  const [entering, setEntering] = useState(false);
  const [showEdge, setShowEdge] = useState(true);
  const [hint, setHint] = useState("");
  const phone = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; edge: boolean; lx: number; lt: number; v: number } | null>(null);
  const dxRef = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const W = () => phone.current?.clientWidth ?? 240;
  const setX = (x: number) => { dxRef.current = x; setDx(x); };

  const finish = (back: boolean) => {
    setAnim(true);
    setX(back ? W() : 0);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (back) { setScreen("list"); setX(0); }
      setAnim(false);
    }, 260);
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (screen !== "chat" || anim || e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    if ((e.target as HTMLElement).closest("button") && e.clientX - r.left >= EDGE) return;
    drag.current = { x0: e.clientX, edge: e.clientX - r.left < EDGE, lx: e.clientX, lt: performance.now(), v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const t = performance.now();
    d.v = (e.clientX - d.lx) / Math.max(1, t - d.lt); d.lx = e.clientX; d.lt = t;
    const ddx = e.clientX - d.x0;
    if (d.edge) setX(clamp(ddx, 0, W()));
    else if (Math.abs(ddx) > 30) setHint("가운데에서 밀었네요. 가장자리에서 시작하지 않으면 뒤로 가지 않습니다.");
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (!d || !d.edge) return;
    if (dxRef.current < 2) return;
    const back = dxRef.current > W() * 0.4 || d.v > 0.5;
    finish(back);
    setHint(back ? "뒤로 갔습니다. 미는 만큼 이전 화면이 따라왔죠?" : "덜 밀어서 제자리로 돌아왔습니다.");
  };
  const w = phone.current?.clientWidth ?? 240;
  const prog = screen === "chat" ? dx / w : 1;
  return (
    <div className="demo-stage">
      <div className="phone ges-phone ges-es" ref={phone} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className={`ges-es-screen ${anim ? "ges-anim" : ""}`} aria-hidden={screen === "chat"}
          style={{ transform: screen === "chat" ? `translateX(${-0.3 * w * (1 - prog)}px)` : "none" }}>
          <div className="ges-ph-head"><b>메시지</b></div>
          <ul className="ges-es-list">
            {[["민지", "내일 몇 시에 볼까?"], ["준호", "사진 보냈어"], ["가족방", "엄마: 저녁 먹었니"]].map(([n, m]) => (
              <li key={n}>
                <button type="button" tabIndex={screen === "list" ? 0 : -1} onClick={() => { setScreen("chat"); setEntering(true); setHint(""); }}>
                  <b>{n}</b><span className="muted">{m}</span>
                </button>
              </li>
            ))}
          </ul>
          {screen === "chat" && <div className={`ges-es-dim ${anim ? "ges-anim" : ""}`} style={{ opacity: 0.35 * (1 - prog) }} />}
        </div>
        {screen === "chat" && (
          <div className={`ges-es-screen ges-top ${anim ? "ges-anim" : ""} ${entering ? "ges-enter" : ""}`}
            style={{ transform: `translateX(${dx}px)` }} onAnimationEnd={() => setEntering(false)}>
            <div className="ges-ph-head">
              <button type="button" className="ges-ph-back" onClick={() => { finish(true); setHint("뒤로 버튼으로 돌아갔습니다."); }}>‹ 메시지</button>
              <b>민지</b>
            </div>
            <div className="ges-es-chat">
              <span className="ges-them">내일 몇 시에 볼까?</span>
              <span className="ges-me">3시 어때?</span>
              <span className="ges-them">좋아! 역 앞에서 봐</span>
            </div>
          </div>
        )}
        {showEdge && screen === "chat" && dx === 0 && !anim && <div className="ges-es-edge" aria-hidden="true" />}
      </div>
      <div className="row">
        <label className="row ges-check"><input type="checkbox" checked={showEdge} onChange={(e) => setShowEdge(e.target.checked)} /> 가장자리 영역 보이기</label>
      </div>
      <span className="ges-log" aria-live="polite">{hint || " "}</span>
      <span className="muted">대화 화면의 왼쪽 끝(색칠된 띠)에서 시작해 오른쪽으로 밀어 보세요. 미는 만큼 이전 화면이 따라오고, 반쯤 넘기거나 빠르게 튕기면 뒤로 갑니다. 가운데에서 밀면 아무 일도 없습니다.</span>
    </div>
  );
}

/* 러버 밴딩 */
const rubber = (over: number, d: number) => Math.sign(over) * (1 - 1 / ((Math.abs(over) * 0.55) / d + 1)) * d;
export function RubberBandDemo() {
  const [mode, setMode] = useState<"band" | "hard">("band");
  const [y, setY] = useState(0);
  const [anim, setAnim] = useState(false);
  const vp = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLUListElement>(null);
  const st = useRef<{ y0: number; base: number } | null>(null);
  const yRef = useRef(0);
  const set = (n: number) => { yRef.current = n; setY(n); };
  const lo = () => Math.min(0, (vp.current?.clientHeight ?? 0) - (content.current?.offsetHeight ?? 0));

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setAnim(false);
    st.current = { y0: e.clientY, base: clamp(yRef.current, lo(), 0) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = st.current; if (!s) return;
    const raw = s.base + e.clientY - s.y0, min = lo(), h = vp.current?.clientHeight ?? 240;
    if (raw > 0) set(mode === "band" ? rubber(raw, h) : 0);
    else if (raw < min) set(min + (mode === "band" ? rubber(raw - min, h) : 0));
    else set(raw);
  };
  const onUp = () => {
    if (!st.current) return;
    st.current = null;
    const c = clamp(yRef.current, lo(), 0);
    if (c !== yRef.current) { setAnim(true); set(c); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    const d = { ArrowDown: -40, ArrowUp: 40, PageDown: -160, PageUp: 160 }[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const min = lo(), want = yRef.current + d, next = clamp(want, min, 0);
    setAnim(true); set(next);
    if (want !== next && mode === "band" && next === yRef.current) {
      const b = d > 0 ? 18 : -18;
      content.current?.animate([{ transform: `translateY(${next}px)` }, { transform: `translateY(${next + b}px)` }, { transform: `translateY(${next}px)` }], { duration: 320, easing: "ease-out" });
    }
  };
  const over = y > 0 ? y : y < lo() ? lo() - y : 0;
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented ges-seg" role="radiogroup" aria-label="끝에서의 동작">
          <button type="button" role="radio" aria-checked={mode === "band"} className={mode === "band" ? "on" : ""} onClick={() => setMode("band")}>고무줄</button>
          <button type="button" role="radio" aria-checked={mode === "hard"} className={mode === "hard" ? "on" : ""} onClick={() => setMode("hard")}>딱 멈춤</button>
        </div>
        <span className="chip">끝 너머로 {Math.round(over)}px</span>
      </div>
      <div className="phone ges-phone">
        <div className="ges-ph-head"><b>설정</b></div>
        <div className="ges-rb-vp" ref={vp} tabIndex={0} aria-label="설정 목록 (위·아래 화살표로 스크롤)"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}>
          <ul ref={content} className={`ges-rb-list ${anim ? "ges-anim" : ""}`} style={{ transform: `translateY(${y}px)` }}
            onTransitionEnd={() => setAnim(false)}>
            {["와이파이", "블루투스", "알림", "소리", "화면 밝기", "배경화면", "배터리", "저장 공간", "개인정보", "비밀번호", "언어", "날짜와 시간", "손쉬운 사용", "정보"].map((t, i) => (
              <li key={t}><span className="ges-rb-ico" style={{ background: `hsl(${(i * 37) % 360} 55% 55%)` }} aria-hidden="true" />{t}<span className="muted" aria-hidden="true">›</span></li>
            ))}
          </ul>
        </div>
      </div>
      <span className="muted">목록을 위아래로 끌어 끝까지 간 뒤 더 당겨 보세요. 고무줄처럼 버티며 조금만 따라오다가, 놓으면 튕겨 돌아갑니다. '딱 멈춤'과 비교해 보세요.</span>
    </div>
  );
}

/* 햅틱 피드백 */
export function HapticDemo() {
  const frame = useRef<HTMLDivElement>(null);
  const canVibrate = useMemo(() => typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
    && typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches, []);
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [silent, setSilent] = useState(false);
  const [min, setMin] = useState(30);
  const [menu, setMenu] = useState(false);
  const [press, setPress] = useState(false);
  const lp = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(lp.current), []);

  const tick = (ms: number, strong = false) => {
    setCount((c) => c + 1); setPulse((p) => p + 1);
    if (canVibrate) { try { navigator.vibrate(ms); } catch { /* 지원 안 함 */ } }
    else {
      const a = strong ? 4 : 2;
      frame.current?.animate([{ transform: "translate(0,0)" }, { transform: `translate(-${a}px,1px)` }, { transform: `translate(${a}px,-1px)` }, { transform: `translate(-${a / 2}px,0)` }, { transform: "translate(0,0)" }], { duration: strong ? 180 : 110 });
    }
  };
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setPress(true); setMenu(false);
    window.clearTimeout(lp.current);
    lp.current = window.setTimeout(() => { setPress(false); setMenu(true); tick(25, true); }, 500);
  };
  const cancel = () => { window.clearTimeout(lp.current); setPress(false); };
  return (
    <div className="demo-stage">
      <div className="ges-hap" ref={frame} onPointerDown={(e) => { if (!(e.target as HTMLElement).closest(".ges-hap-app")) setMenu(false); }}>
        <div className="ges-hap-row">
          <span>무음 모드</span>
          <button type="button" role="switch" aria-checked={silent} className={`ges-hap-sw ${silent ? "ges-on" : ""}`} aria-label="무음 모드"
            onClick={() => { setSilent(!silent); tick(12); }}><span /></button>
        </div>
        <div className="ges-hap-row">
          <span>알람 <b className="mono">07:{String(min).padStart(2, "0")}</b></span>
          <input type="range" min={0} max={55} step={5} value={min} aria-label="알람 분"
            onChange={(e) => { const n = Number(e.target.value); if (n !== min) { setMin(n); tick(6); } }} />
        </div>
        <div className="ges-hap-row">
          <span>사진 앱 아이콘</span>
          <span className="ges-hap-app">
            <button type="button" className={`ges-hap-icon ${press ? "ges-press" : ""}`} aria-label="사진 앱 (길게 누르면 빠른 메뉴)"
              onPointerDown={down} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => { if (e.detail === 0) { setMenu(!menu); tick(25, true); } }}>📷</button>
            {menu && (
              <span className="ges-hap-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => setMenu(false)}>최근 사진</button>
                <button type="button" role="menuitem" onClick={() => setMenu(false)}>앨범 만들기</button>
              </span>
            )}
          </span>
        </div>
        <div className="ges-hap-foot">
          <span key={pulse} className={`ges-hap-dot ${pulse ? "ges-go" : ""}`} aria-hidden="true" />
          톡 <b>{count}</b>번
        </div>
      </div>
      <span className="muted">
        스위치를 넘기고, 알람 슬라이더를 한 칸씩 옮기고, 앱 아이콘을 0.5초 길게 눌러 보세요.{" "}
        {canVibrate
          ? "이 기기는 진동을 지원합니다. 넘어갈 때마다 손에 톡 하고 느껴집니다."
          : "지금 기기에서는 진동을 쓸 수 없어서(또는 진동 장치가 없어서) 대신 상자가 살짝 흔들리는 것으로 보여 줍니다. 휴대폰에서 열면 진짜 진동이 납니다."}
      </span>
    </div>
  );
}
