import { useEffect, useMemo, useRef, useState } from "react";
import { photo } from "./media";
import "./visual.css";

/* 공통: 시간에 따라 장면(photo seed)이 바뀌는 가짜 영상 */
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const sceneAt = (base: number, t: number, w = 320, h = 180) => photo(base + Math.floor(t / 6), w, h);

/** 재생 중이면 100ms 마다 step 초씩 흐르는 시계. 끝에 닿으면 처음으로 돈다. */
function useClock(playing: boolean, duration: number, step = 0.25) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setTime((t) => (t + step >= duration ? 0 : t + step)), 100);
    return () => window.clearInterval(id);
  }, [playing, duration, step]);
  return [time, setTime] as const;
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label} style={{ alignSelf: "flex-start" }}>
      {options.map((o) => (
        <button type="button" key={o} role="radio" aria-checked={value === o} className={value === o ? "on" : ""} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

/* ───────── 자르기 ───────── */
type Rect = { x: number; y: number; w: number; h: number };
const CROP_W = 400, CROP_H = 260;
const RATIOS = { 자유: 0, "1:1": 1, "16:9": 16 / 9 } as const;
type RatioKey = keyof typeof RATIOS;

export function CropDemo() {
  const [ratioKey, setRatioKey] = useState<RatioKey>("자유");
  const [rect, setRect] = useState<Rect>({ x: 15, y: 15, w: 55, h: 60 });
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: string; sx: number; sy: number; start: Rect } | null>(null);
  const ratio = RATIOS[ratioKey];
  // 사진 비율 때문에, 화면 비율 r 을 % 단위로 바꾸면 h% = w% × (400/260) / r
  const hFor = (w: number, r: number) => (w * CROP_W) / CROP_H / r;

  const applyRatio = (key: RatioKey) => {
    setRatioKey(key);
    const r = RATIOS[key];
    if (!r) return;
    setRect((p) => {
      let w = p.w, h = hFor(w, r);
      if (h > 100 - p.y) { h = 100 - p.y; w = (h * r * CROP_H) / CROP_W; }
      if (h > 100) { h = 100; w = (100 * r * CROP_H) / CROP_W; }
      return { x: Math.min(p.x, 100 - w), y: Math.min(p.y, 100 - h), w, h };
    });
  };

  const pct = (clientX: number, clientY: number) => {
    const r = box.current!.getBoundingClientRect();
    return { px: ((clientX - r.left) / r.width) * 100, py: ((clientY - r.top) / r.height) * 100 };
  };
  const onDown = (mode: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { px, py } = pct(e.clientX, e.clientY);
    drag.current = { mode, sx: px, sy: py, start: rect };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const { px, py } = pct(e.clientX, e.clientY);
    const s = d.start;
    if (d.mode === "move") {
      setRect({ ...s, x: Math.max(0, Math.min(100 - s.w, s.x + px - d.sx)), y: Math.max(0, Math.min(100 - s.h, s.y + py - d.sy)) });
      return;
    }
    // 모서리: 반대쪽 모서리를 고정하고 크기를 바꾼다
    const right = d.mode.includes("e"), down = d.mode.includes("s");
    const ax = right ? s.x : s.x + s.w, ay = down ? s.y : s.y + s.h;
    const maxW = right ? 100 - ax : ax, maxH = down ? 100 - ay : ay;
    let w = Math.min(maxW, Math.max(10, right ? px - ax : ax - px));
    let h = Math.min(maxH, Math.max(10, down ? py - ay : ay - py));
    if (ratio) {
      h = hFor(w, ratio);
      if (h > maxH) { h = maxH; w = (h * ratio * CROP_H) / CROP_W; }
    }
    setRect({ x: right ? ax : ax - w, y: down ? ay : ay - h, w, h });
  };
  const onUp = () => { drag.current = null; };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = mv[e.key]; if (!m) return;
    e.preventDefault();
    setRect((p) => ({ ...p, x: Math.max(0, Math.min(100 - p.w, p.x + m[0])), y: Math.max(0, Math.min(100 - p.h, p.y + m[1])) }));
  };

  const src = photo(11, CROP_W, CROP_H);
  const outW = Math.round((rect.w / 100) * 1600), outH = Math.round((rect.h / 100) * 1040);
  return (
    <div className="demo-stage">
      <div className="row">
        <Segmented label="비율" options={Object.keys(RATIOS) as RatioKey[]} value={ratioKey} onChange={applyRatio} />
        <span className="muted mono">{outW}×{outH}</span>
      </div>
      <div className="vis-crop-row">
        <div ref={box} className="vis-crop" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <img src={src} alt="" draggable={false} />
          <div className="vis-crop-frame" style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
            onPointerDown={onDown("move")} tabIndex={0} role="group" aria-label="자르기 틀 (화살표 키로 이동)" onKeyDown={onKey}>
            <span className="vis-crop-grid" aria-hidden="true" />
            {["nw", "ne", "sw", "se"].map((c) => <span key={c} className={`vis-crop-handle ${c}`} onPointerDown={onDown(c)} aria-hidden="true" />)}
          </div>
        </div>
        <figure className="vis-crop-out">
          <div className="vis-crop-result" style={{
            aspectRatio: `${rect.w * CROP_W} / ${rect.h * CROP_H}`,
            backgroundImage: `url("${src}")`,
            backgroundSize: `${(100 / rect.w) * 100}% ${(100 / rect.h) * 100}%`,
            backgroundPosition: `${rect.w >= 99.9 ? 0 : (rect.x / (100 - rect.w)) * 100}% ${rect.h >= 99.9 ? 0 : (rect.y / (100 - rect.h)) * 100}%`,
          }} />
          <figcaption className="muted">결과</figcaption>
        </figure>
      </div>
      <span className="muted">모서리를 끌어 크기를, 틀 안쪽을 끌어 위치를 바꿔 보세요. 바깥은 어둡게 덮여 잘려 나갈 부분을 보여 주고, 1:1 이나 16:9 를 고르면 비율이 고정됩니다.</span>
    </div>
  );
}

/* ───────── 반응형 이미지 ───────── */
const CANDIDATES = [
  { w: 320, kb: 28 }, { w: 640, kb: 74 }, { w: 960, kb: 140 }, { w: 1280, kb: 230 }, { w: 1920, kb: 480 },
];
export function ResponsiveImageDemo() {
  const [vw, setVw] = useState(390);
  const [dpr, setDpr] = useState<"1x" | "2x" | "3x">("2x");
  const density = Number(dpr[0]);
  const slot = vw <= 600 ? vw : Math.round(vw / 2);
  const need = slot * density;
  const pick = CANDIDATES.find((c) => c.w >= need) ?? CANDIDATES[CANDIDATES.length - 1];
  const biggest = CANDIDATES[CANDIDATES.length - 1];
  return (
    <div className="demo-stage">
      <label className="vis-ri-ctl">
        <span>화면 폭 <b className="mono">{vw}px</b> {vw <= 600 ? "(휴대폰)" : vw <= 1024 ? "(태블릿)" : "(데스크톱)"}</span>
        <input type="range" min={320} max={1600} step={10} value={vw} onChange={(e) => setVw(Number(e.target.value))} />
      </label>
      <div className="row">
        <span className="muted">화소 밀도</span>
        <Segmented label="화소 밀도" options={["1x", "2x", "3x"] as const} value={dpr} onChange={setDpr} />
      </div>
      <div className="vis-ri-screen" aria-hidden="true">
        <div className="vis-ri-viewport" style={{ width: `${(vw / 1600) * 100}%` }}>
          <div className="vis-ri-slot" style={{ width: vw <= 600 ? "100%" : "50%", backgroundImage: `url("${photo(14, 320, 200)}")` }} />
        </div>
      </div>
      <p className="vis-ri-calc">
        사진 칸 폭 <b>{slot}px</b> × {density} = 필요한 폭 <b>{need}px</b>
      </p>
      <ul className="vis-ri-list plain-list">
        {CANDIDATES.map((c) => (
          <li key={c.w} className={c === pick ? "on" : ""}>
            <span className="mono">photo-{c.w}.jpg</span>
            <span className="muted">{c.w}w · {c.kb}KB</span>
            {c === pick && <span className="vis-ri-badge">받음</span>}
          </li>
        ))}
      </ul>
      <code className="vis-code">{`<img srcset="photo-320.jpg 320w, … photo-1920.jpg 1920w"\n     sizes="(max-width: 600px) 100vw, 50vw">`}</code>
      <span className="muted">
        화면 폭과 화소 밀도를 바꿔 보세요. 브라우저는 필요한 폭 이상인 후보 중 가장 작은 파일을 고릅니다.
        {pick !== biggest && ` 늘 가장 큰 파일을 줬다면 ${biggest.kb - pick.kb}KB 를 더 받았을 겁니다.`}
      </span>
    </div>
  );
}

/* ───────── 대체 텍스트 ───────── */
export function AltTextDemo() {
  const [off, setOff] = useState(false);
  const [quality, setQuality] = useState<"좋은 alt" | "나쁜 alt">("좋은 alt");
  const good = quality === "좋은 alt";
  const items = [
    { kind: "내용 사진", alt: good ? "노을 지는 바닷가 언덕에서 연을 날리는 아이" : "IMG_2031.jpg", read: good ? "이미지, 노을 지는 바닷가 언덕에서 연을 날리는 아이" : "이미지, I M G 언더바 2 0 3 1 점 j p g" },
    { kind: "꾸밈 사진", alt: good ? "" : "물결 무늬 장식 이미지", read: good ? "(건너뜀)" : "이미지, 물결 무늬 장식 이미지" },
    { kind: "아이콘 버튼", alt: good ? "검색" : "돋보기", read: good ? "검색, 버튼" : "돋보기, 버튼" },
  ];
  return (
    <div className="demo-stage">
      <div className="row">
        <Segmented label="alt 품질" options={["좋은 alt", "나쁜 alt"] as const} value={quality} onChange={setQuality} />
        <label className="vis-check"><input type="checkbox" checked={off} onChange={(e) => setOff(e.target.checked)} /> 이미지 끄기(깨짐)</label>
      </div>
      <div className="vis-alt-card">
        <div className="vis-alt-photo">
          {off ? <span className="vis-alt-broken">{items[0].alt ? <><span aria-hidden="true">🖼︎ </span>{items[0].alt}</> : null}</span> : <img src={photo(23, 400, 220)} alt={items[0].alt} />}
        </div>
        <div className="vis-alt-wave">
          {off ? (items[1].alt ? <span className="vis-alt-broken small">🖼︎ {items[1].alt}</span> : null) : <span className="vis-alt-wave-img" role="img" aria-label={items[1].alt || undefined} aria-hidden={items[1].alt ? undefined : true} />}
        </div>
        <div className="row">
          <span className="vis-alt-field">바닷가 사진 찾기</span>
          <button type="button" className="btn icon" aria-label={items[2].alt}>{off ? <span className="vis-alt-tiny">{items[2].alt}</span> : "🔍"}</button>
        </div>
      </div>
      <div className="vis-sr" aria-label="스크린 리더가 읽는 말">
        <b>🔊 스크린 리더</b>
        {items.map((it) => (
          <div key={it.kind} className="vis-sr-line">
            <span className="chip">{it.kind}</span>
            <span className="mono vis-sr-code">alt="{it.alt}"</span>
            <span>→ “{it.read}”</span>
          </div>
        ))}
      </div>
      <span className="muted">‘이미지 끄기’를 켜면 사진 자리에 alt 가 보입니다. 좋은 alt 와 나쁜 alt 를 바꿔 가며 스크린 리더가 읽을 말을 비교해 보세요. 꾸밈 사진은 alt="" 로 비워 건너뛰게 합니다.</span>
    </div>
  );
}

/* ───────── 화면 속 화면 ───────── */
export function PipDemo() {
  const [pip, setPip] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [time] = useClock(playing, 90);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [corner, setCorner] = useState<"tl" | "tr" | "bl" | "br">("br");
  const area = useRef<HTMLDivElement>(null);
  const mini = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [moving, setMoving] = useState(false);

  const cornerXY = (c: typeof corner) => {
    const a = area.current, m = mini.current; if (!a || !m) return { x: 0, y: 0 };
    const pad = 8;
    return { x: c[1] === "l" ? pad : a.clientWidth - m.offsetWidth - pad, y: c[0] === "t" ? pad : a.clientHeight - m.offsetHeight - pad };
  };
  useEffect(() => { if (pip) setPos(cornerXY(corner)); }, [pip, corner]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    setMoving(true);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragging.current, a = area.current, m = mini.current; if (!d || !a || !m) return;
    setPos({
      x: Math.max(0, Math.min(a.clientWidth - m.offsetWidth, d.ox + e.clientX - d.sx)),
      y: Math.max(0, Math.min(a.clientHeight - m.offsetHeight, d.oy + e.clientY - d.sy)),
    });
  };
  const onUp = () => {
    const a = area.current, m = mini.current; if (!dragging.current || !a || !m) return;
    dragging.current = null;
    setMoving(false);
    // 가장 가까운 구석으로 붙는다
    const c = `${pos.y + m.offsetHeight / 2 < a.clientHeight / 2 ? "t" : "b"}${pos.x + m.offsetWidth / 2 < a.clientWidth / 2 ? "l" : "r"}` as typeof corner;
    setCorner(c);
    setPos(cornerXY(c));
  };

  const frame = <img src={sceneAt(30, time)} alt="" draggable={false} />;
  return (
    <div className="demo-stage">
      <div ref={area} className="vis-pip-area">
        <div className="vis-pip-scroll">
          <div className="vis-pip-player">
            {pip ? <div className="vis-pip-hole">작은 창에서 재생 중</div> : frame}
            {!pip && (
              <div className="vis-pip-ctrl">
                <button type="button" className="vis-ov-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? "일시 정지" : "재생"}>{playing ? "❚❚" : "▶"}</button>
                <span className="vis-ov-time">{fmt(time)}</span>
                <button type="button" className="vis-ov-btn wide" onClick={() => setPip(true)}>⧉ 작은 창으로</button>
              </div>
            )}
          </div>
          <h4 className="vis-pip-h">텃밭 가꾸기 3편 — 물 주기</h4>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="vis-pip-line" aria-hidden="true">
              <span style={{ width: `${90 - i * 12}%` }} /><span style={{ width: `${70 + i * 6}%` }} />
            </div>
          ))}
          <p className="muted vis-pip-p">작은 창을 띄운 채로 이 글을 아래로 내려 읽을 수 있습니다. 영상은 계속 재생됩니다.</p>
          {[4, 5, 6].map((i) => (
            <div key={i} className="vis-pip-line" aria-hidden="true">
              <span style={{ width: `${95 - i * 5}%` }} /><span style={{ width: `${60 + i * 4}%` }} />
            </div>
          ))}
        </div>
        {pip && (
          <div ref={mini} className={`vis-pip-mini ${moving ? "moving" : ""}`} style={{ left: pos.x, top: pos.y }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            {frame}
            <button type="button" className="vis-pip-x back" onClick={() => setPip(false)} aria-label="원래 자리로">⤢</button>
            <button type="button" className="vis-pip-x" onClick={() => { setPip(false); setPlaying(false); }} aria-label="닫기">✕</button>
            <span className="vis-pip-time">{fmt(time)}</span>
          </div>
        )}
      </div>
      <span className="muted">‘작은 창으로’를 누르면 영상이 구석에 떠서 계속 재생됩니다. 끌어서 옮기면 가장 가까운 구석에 붙고, 그동안 아래 글을 스크롤할 수 있습니다.</span>
    </div>
  );
}

/* ───────── 두 번 두드려 건너뛰기 ───────── */
export function DoubleTapSeekDemo() {
  const DUR = 180;
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useClock(playing, DUR, 0.1);
  const [ripple, setRipple] = useState<{ side: "l" | "r"; total: number; key: number } | null>(null);
  const last = useRef<{ t: number; side: "l" | "r" } | null>(null);
  const streak = useRef<{ side: "l" | "r"; total: number; until: number } | null>(null);
  const single = useRef<number | undefined>(undefined);
  const hide = useRef<number | undefined>(undefined);
  useEffect(() => () => { window.clearTimeout(single.current); window.clearTimeout(hide.current); }, []);

  const seek = (side: "l" | "r") => {
    const now = performance.now();
    const s = streak.current && streak.current.side === side && now < streak.current.until ? streak.current.total + 10 : 10;
    streak.current = { side, total: s, until: now + 700 };
    setTime((t) => Math.max(0, Math.min(DUR - 0.1, t + (side === "r" ? 10 : -10))));
    setRipple({ side, total: s, key: now });
    window.clearTimeout(hide.current);
    hide.current = window.setTimeout(() => setRipple(null), 700);
  };
  const onTap = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const side = e.clientX - r.left < r.width / 2 ? "l" : "r";
    const now = performance.now();
    // 이어 두드리는 중이면 한 번만 눌러도 10초씩 더 넘긴다
    if (streak.current && streak.current.side === side && now < streak.current.until) { seek(side); last.current = null; return; }
    if (last.current && last.current.side === side && now - last.current.t < 300) {
      window.clearTimeout(single.current);
      last.current = null;
      seek(side);
      return;
    }
    last.current = { t: now, side };
    window.clearTimeout(single.current);
    single.current = window.setTimeout(() => { last.current = null; setPlaying((p) => !p); }, 300);
  };
  return (
    <div className="demo-stage">
      <div className="vis-player vis-dts" onPointerUp={onTap} tabIndex={0} role="group" aria-label="영상 (← → 키로 10초 이동)"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); seek("r"); }
          if (e.key === "ArrowLeft") { e.preventDefault(); seek("l"); }
          if (e.key === " ") { e.preventDefault(); setPlaying(!playing); }
        }}>
        <img src={sceneAt(50, time)} alt="" draggable={false} />
        {!playing && <span className="vis-big-play" aria-hidden="true">▶</span>}
        {ripple && (
          <div key={ripple.key} className={`vis-dts-ripple ${ripple.side}`} aria-live="polite">
            <span className="vis-dts-arrows">{ripple.side === "r" ? "▶▶" : "◀◀"}</span>
            <b>{ripple.side === "r" ? "+" : "−"}{ripple.total}초</b>
          </div>
        )}
        <div className="vis-mini-bar"><span style={{ width: `${(time / DUR) * 100}%` }} /></div>
        <span className="vis-ov-time corner">{fmt(time)} / {fmt(DUR)}</span>
      </div>
      <span className="muted">영상 오른쪽을 빠르게 두 번 누르면 10초 앞으로, 왼쪽은 10초 뒤로 갑니다. 이어서 더 누르면 20초, 30초로 늘어납니다. 한 번만 누르면 재생·멈춤입니다.</span>
    </div>
  );
}

/* ───────── 음소거 자동 재생 ───────── */
function FeedVideo({ seed, root, muted, onUnmute, reduced }: { seed: number; root: React.RefObject<HTMLDivElement>; muted: boolean; onUnmute: () => void; reduced: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [manual, setManual] = useState(false);
  useEffect(() => {
    const node = el.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.intersectionRatio >= 0.6), { root: root.current, threshold: [0, 0.6, 1] });
    io.observe(node);
    return () => io.disconnect();
  }, [root]);
  useEffect(() => { if (!visible) setManual(false); }, [visible]);
  const playing = visible && (!reduced || manual);
  const [time] = useClock(playing, 60);
  return (
    <div ref={el} className="vis-feed-video">
      <img src={sceneAt(seed, time, 320, 200)} alt="" />
      {!playing && (reduced && visible
        ? <button type="button" className="vis-big-play btn-like" onClick={() => setManual(true)} aria-label="재생">▶</button>
        : <span className="vis-ov-chip">멈춤</span>)}
      {playing && <span className="vis-ov-chip on">재생 중{muted ? " · 소리 꺼짐" : ""}</span>}
      <button type="button" className="vis-ov-btn vis-feed-mute" onClick={onUnmute} aria-label={muted ? "소리 켜기" : "소리 끄기"}>{muted ? "🔇" : "🔊"}</button>
      {muted && playing && <span className="vis-feed-hint">눌러서 소리 켜기</span>}
    </div>
  );
}
export function AutoplayMutedDemo() {
  const root = useRef<HTMLDivElement>(null);
  const [mutedAll, setMutedAll] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <div className="demo-stage">
      <div className="row">
        <label className="vis-check"><input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} /> 움직임 줄이기 설정</label>
        <button type="button" className="btn small" onClick={() => { setBlocked(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setBlocked(false), 2200); }}>소리 켠 채 자동 재생 시도</button>
      </div>
      {blocked && <div className="vis-alert" role="status">브라우저가 막았습니다: 사용자가 누르기 전에는 소리 나는 자동 재생을 할 수 없어요.</div>}
      <div ref={root} className="vis-feed">
        {[0, 1, 2, 3].map((i) => (
          <article key={i} className="vis-feed-post">
            <div className="vis-feed-head"><span className="avatar" /> <b>정원일기 {i + 1}</b><span className="muted">· {i + 2}시간 전</span></div>
            {i % 2 === 0
              ? <FeedVideo seed={70 + i * 10} root={root} muted={mutedAll} onUnmute={() => setMutedAll(!mutedAll)} reduced={reduced} />
              : <p className="vis-feed-text">오늘은 토마토 지지대를 세웠어요. 바람이 세게 불어서 줄기가 한쪽으로 기울었거든요.</p>}
          </article>
        ))}
      </div>
      <span className="muted">피드를 스크롤해 보세요. 영상은 화면에 60% 이상 보일 때만 소리 없이 저절로 재생되고, 벗어나면 멈춥니다. 🔇 를 눌러야 소리가 납니다. ‘움직임 줄이기’를 켜면 자동 재생 대신 재생 버튼이 나옵니다.</span>
    </div>
  );
}

/* ───────── 호버 미리보기 재생 ───────── */
function PreviewThumb({ seed, title, dur }: { seed: number; title: string; dur: string }) {
  const [state, setState] = useState<"idle" | "wait" | "play">("idle");
  const [time, setTime] = useClock(state === "play", 12, 0.15);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const enter = () => {
    window.clearTimeout(timer.current);
    setState("wait");
    timer.current = window.setTimeout(() => setState("play"), 500);
  };
  const leave = () => { window.clearTimeout(timer.current); setState("idle"); setTime(0); };
  return (
    <button type="button" className={`vis-hp-card ${state}`} onPointerEnter={(e) => { if (e.pointerType === "mouse") enter(); }} onPointerLeave={(e) => { if (e.pointerType === "mouse") leave(); }}
      onFocus={enter} onBlur={leave} onClick={(e) => { if (state === "idle") { e.preventDefault(); enter(); } }}>
      <span className="vis-hp-thumb">
        <img src={state === "play" ? sceneAt(seed + 1, time * 3, 240, 135) : photo(seed, 240, 135)} alt="" />
        {state === "play" ? <span className="vis-ov-chip on">🔇 미리보기</span> : <span className="vis-hp-dur">{dur}</span>}
        {state === "wait" && <span className="vis-hp-wait" aria-hidden="true" />}
        {state === "play" && <span className="vis-mini-bar"><span style={{ width: `${(time / 12) * 100}%` }} /></span>}
      </span>
      <span className="vis-hp-title">{title}</span>
    </button>
  );
}
export function HoverPreviewDemo() {
  const list = [
    { seed: 90, title: "새벽 시장 한 바퀴", dur: "12:04" },
    { seed: 100, title: "자전거로 강변 따라", dur: "8:31" },
    { seed: 110, title: "도자기 굽는 하루", dur: "21:15" },
    { seed: 120, title: "산 위에서 본 구름", dur: "5:47" },
  ];
  return (
    <div className="demo-stage">
      <div className="vis-hp-grid">
        {list.map((v) => <PreviewThumb key={v.seed} {...v} />)}
      </div>
      <span className="muted">썸네일 위에 커서를 올리고 0.5초 기다리면 그 자리에서 소리 없이 영상이 흘러갑니다. 빨리 지나가면 재생되지 않습니다. 터치 화면에서는 한 번 누르면 미리보기가 시작됩니다.</span>
    </div>
  );
}

/* ───────── 포스터 이미지 ───────── */
const POSTER_SCENES = [0, 2, 4, 6, 8];
export function PosterFrameDemo() {
  const [poster, setPoster] = useState(2);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<null | "none" | "poster">(null);
  const [time, setTime] = useClock(playing !== null, 54);
  useEffect(() => {
    setLoading(true); setPlaying(null); setTime(0);
    const id = window.setTimeout(() => setLoading(false), 1500);
    return () => window.clearTimeout(id);
  }, [round, setTime]);
  // 장면 0 은 검은 화면으로 시작하는 첫 프레임
  const scene = (i: number) => (i === 0 ? "" : photo(130 + i, 320, 180));
  const box = (which: "none" | "poster", label: string) => {
    const isPlaying = playing === which;
    const still = which === "poster" ? scene(POSTER_SCENES[poster]) : loading ? null : "";
    return (
      <figure className="vis-pf-box">
        <div className="vis-player vis-pf-player">
          {isPlaying ? <img src={photo(130 + Math.max(1, Math.floor(time / 6)), 320, 180)} alt="" />
            : still === null ? <div className="vis-pf-empty" />
            : still === "" ? <div className="vis-pf-black" />
            : <img src={still} alt="" />}
          {loading && !isPlaying ? <span className="vp-spin" aria-label="불러오는 중" /> : !isPlaying && (
            <button type="button" className="vis-big-play btn-like" onClick={() => { setTime(0); setPlaying(which); }} aria-label={`${label} 재생`}>▶</button>
          )}
        </div>
        <figcaption className="muted">{label}</figcaption>
      </figure>
    );
  };
  return (
    <div className="demo-stage">
      <div className="vis-pf-row">
        {box("none", "poster 없음")}
        {box("poster", "poster 지정")}
      </div>
      <div className="row">
        <span className="muted">포스터로 쓸 장면</span>
        <button type="button" className="btn small" onClick={() => setRound(round + 1)}>다시 불러오기</button>
      </div>
      <div className="vis-pf-scenes" role="radiogroup" aria-label="포스터 장면">
        {POSTER_SCENES.map((s, i) => (
          <button type="button" key={s} role="radio" aria-checked={poster === i} className={poster === i ? "on" : ""} onClick={() => setPoster(i)} aria-label={i === 0 ? "첫 프레임" : `장면 ${i + 1}`}>
            {s === 0 ? <span className="vis-pf-black" /> : <img src={scene(s)} alt="" />}
          </button>
        ))}
      </div>
      <code className="vis-code">{`<video src="garden.mp4" poster="scene-${poster + 1}.jpg">`}</code>
      <span className="muted">‘다시 불러오기’를 눌러 보세요. 포스터가 없으면 불러오는 동안 빈칸, 다 받은 뒤에도 검은 첫 프레임만 보입니다. 아래에서 내용을 잘 보여 주는 장면을 포스터로 골라 보세요.</span>
    </div>
  );
}

/* ───────── 자막 ───────── */
const CUES = [
  { s: 0, e: 4, text: "안녕하세요, 오늘은 화분 분갈이를 해 볼게요.", sound: false },
  { s: 4.5, e: 7, text: "[흙 쏟아지는 소리]", sound: true },
  { s: 7.5, e: 12, text: "뿌리가 화분 밖으로 나오면 바꿀 때가 된 거예요.", sound: false },
  { s: 12.5, e: 15, text: "[잔잔한 기타 음악]", sound: true },
  { s: 15.5, e: 20, text: "새 화분은 지금보다 한 뼘만 크면 충분합니다.", sound: false },
  { s: 20.5, e: 23, text: "[고양이 울음] 어, 너도 보러 왔구나?", sound: true },
  { s: 23.5, e: 28, text: "물은 흙이 마른 다음에 흠뻑 주세요.", sound: false },
];
export function CaptionsDemo() {
  const DUR = 30;
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useClock(playing, DUR, 0.1);
  const [cc, setCc] = useState(true);
  const [kind, setKind] = useState<"소리 묘사 포함" | "대사만">("소리 묘사 포함");
  // 대사만(subtitles) 이면 [소리 묘사] 를 지운다
  const cues = kind === "대사만" ? CUES.map((c) => ({ ...c, text: c.text.replace(/\[[^\]]*\]\s*/g, "") })).filter((c) => c.text) : CUES;
  const now = cues.find((c) => time >= c.s && time < c.e);
  const vtt = (t: number) => `00:${String(Math.floor(t)).padStart(2, "0")}.${String(Math.round((t % 1) * 10))}00`;
  return (
    <div className="demo-stage">
      <div className="vis-player">
        <img src={sceneAt(150, time * 1.5)} alt="" draggable={false} />
        {cc && now && <span className="vis-cap-line">{now.text}</span>}
        <div className="vis-cap-ctrl">
          <button type="button" className="vis-ov-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? "일시 정지" : "재생"}>{playing ? "❚❚" : "▶"}</button>
          <span className="vis-ov-time">{fmt(time)} / {fmt(DUR)}</span>
          <button type="button" className={`vis-cc ${cc ? "on" : ""}`} aria-pressed={cc} onClick={() => setCc(!cc)} aria-label="자막">CC</button>
        </div>
      </div>
      <Segmented label="자막 종류" options={["소리 묘사 포함", "대사만"] as const} value={kind} onChange={setKind} />
      <ol className="vis-cap-list plain-list" aria-label="자막 파일 (WebVTT)">
        {cues.map((c) => (
          <li key={c.s} className={c === now ? "on" : ""}>
            <button type="button" className="vis-cap-cue" onClick={() => setTime(c.s)}>
              <span className="mono muted">{vtt(c.s)} --&gt; {vtt(c.e)}</span>
              <span className={c.sound ? "vis-cap-sound" : ""}>{c.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <span className="muted">재생을 누르고 CC 버튼으로 자막을 켜고 꺼 보세요. 자막 줄을 누르면 그 시점으로 갑니다. ‘대사만’으로 바꾸면 [흙 쏟아지는 소리] 같은 소리 묘사가 빠집니다.</span>
    </div>
  );
}

/* ───────── 적응형 스트리밍 ───────── */
const LEVELS = [
  { name: "240p", need: 0.7, blur: 3.2, color: "#d9534f" },
  { name: "480p", need: 1.5, blur: 1.6, color: "#e8a35f" },
  { name: "720p", need: 3, blur: 0.6, color: "#6cb7d9" },
  { name: "1080p", need: 6, blur: 0, color: "#3fae6a" },
];
const SEG = 4, NSEG = 16;
const levelFor = (mbps: number) => { let q = 0; LEVELS.forEach((l, i) => { if (mbps * 0.85 >= l.need) q = i; }); return q; };
export function AdaptiveStreamingDemo() {
  const [mbps, setMbps] = useState(8);
  const [auto, setAuto] = useState(true);
  const [time, setTime] = useState(0);
  const [segs, setSegs] = useState<(number | null)[]>(() => [3, 3, ...Array(NSEG - 2).fill(null)]);
  const speed = useRef(mbps); speed.current = mbps;
  const autoRef = useRef(auto); autoRef.current = auto;
  const stalled = !auto && mbps < LEVELS[3].need;

  useEffect(() => {
    const id = window.setInterval(() => {
      setTime((t) => {
        // 고정 화질인데 속도가 모자라면 받는 속도만큼만 앞으로 간다(자주 멈춤)
        const rate = autoRef.current ? 1 : Math.min(1, speed.current / LEVELS[3].need);
        const step = rate < 1 && Math.random() > rate ? 0 : 0.2;
        let next = t + step;
        if (next >= SEG * NSEG) next = 0;
        const k = Math.floor(next / SEG);
        if (Math.floor(t / SEG) !== k || next === 0) {
          // 새 조각에 들어서면, 지금 속도를 보고 그다음 조각의 화질을 고른다
          setSegs((s) => {
            const copy = next === 0 ? [s[0], ...Array(NSEG - 1).fill(null)] : [...s];
            if (k + 1 < NSEG) copy[k + 1] = autoRef.current ? levelFor(speed.current) : 3;
            return copy;
          });
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  const cur = Math.min(NSEG - 1, Math.floor(time / SEG));
  const level = LEVELS[segs[cur] ?? 3];
  return (
    <div className="demo-stage">
      <label className="vis-ri-ctl">
        <span>인터넷 속도 <b className="mono">{mbps.toFixed(1)} Mbps</b></span>
        <input type="range" min={0.5} max={12} step={0.5} value={mbps} onChange={(e) => setMbps(Number(e.target.value))} />
      </label>
      <Segmented label="화질" options={["자동", "1080p 고정"] as const} value={auto ? "자동" : "1080p 고정"} onChange={(v) => setAuto(v === "자동")} />
      <div className="vis-player">
        <img src={sceneAt(170, time * 0.6)} alt="" draggable={false} style={{ filter: `blur(${level.blur}px)`, transform: "scale(1.04)" }} />
        <span className="vis-as-q" style={{ background: level.color }}>{level.name}</span>
        {stalled && <span className="vp-spin" aria-label="버퍼링" />}
      </div>
      <div className="vis-as-bar" aria-label="조각별 화질">
        {segs.map((q, i) => (
          <span key={i} className={i === cur ? "now" : ""} style={{ background: q === null ? "var(--surface-2)" : LEVELS[q].color }} title={q === null ? "아직 안 받음" : LEVELS[q].name} />
        ))}
        <span className="vis-as-head" style={{ left: `${(time / (SEG * NSEG)) * 100}%` }} />
      </div>
      <div className="row vis-as-legend">
        {LEVELS.map((l) => <span key={l.name}><i style={{ background: l.color }} />{l.name} ({l.need}+)</span>)}
      </div>
      <span className="muted">속도 슬라이더를 내려 보세요. 지금 조각은 그대로 두고, 다음 조각부터 낮은 화질(흐린 화면)로 받아 끊기지 않습니다. ‘1080p 고정’으로 바꾸면 느린 속도에서 자꾸 멈춥니다.</span>
    </div>
  );
}

/* ───────── 라이트박스 ───────── */
const LB = Array.from({ length: 6 }, (_, i) => ({ seed: 190 + i, title: ["바닷가 아침", "숲길", "언덕 위 집", "저녁 노을", "호숫가", "겨울 산"][i] }));
export function LightboxDemo() {
  const [open, setOpen] = useState<number | null>(null);
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastOpen = useRef(0);
  const n = LB.length;
  const isOpen = open !== null;
  useEffect(() => {
    if (isOpen) overlay.current?.focus();
  }, [isOpen]);
  if (open !== null) lastOpen.current = open;
  const close = () => { setOpen(null); setDx(0); thumbs.current[lastOpen.current]?.focus(); };
  const go = (d: number) => setOpen((o) => (o === null ? o : (o + d + n) % n));
  return (
    <div className="demo-stage">
      <div className="vis-lb-wrap">
        <div className="vis-lb-grid">
          {LB.map((p, i) => (
            <button type="button" key={p.seed} ref={(el) => { thumbs.current[i] = el; }} className="vis-lb-thumb" onClick={() => setOpen(i)} aria-label={`${p.title} 크게 보기`}>
              <img src={photo(p.seed, 200, 140)} alt="" />
            </button>
          ))}
        </div>
        {open !== null && (
          <div ref={overlay} className="vis-lb" role="dialog" aria-modal="true" aria-label={`${LB[open].title} (${open + 1}/${n})`} tabIndex={-1}
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); close(); }
              if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
              if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
            }}>
            <img className="vis-lb-img" src={photo(LB[open].seed, 480, 320)} alt={LB[open].title} draggable={false}
              style={{ transform: `translateX(${dx}px)`, transition: start.current === null ? "transform 200ms" : "none" }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start.current = e.clientX; }}
              onPointerMove={(e) => { if (start.current !== null) setDx(e.clientX - start.current); }}
              onPointerUp={() => { start.current = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); setDx(0); }}
              onPointerCancel={() => { start.current = null; setDx(0); }} />
            <button type="button" className="vis-lb-nav prev" onClick={() => go(-1)} aria-label="이전 사진">‹</button>
            <button type="button" className="vis-lb-nav next" onClick={() => go(1)} aria-label="다음 사진">›</button>
            <button type="button" className="vis-lb-close" onClick={close} aria-label="닫기">✕</button>
            <span className="vis-lb-cap">{LB[open].title} · {open + 1} / {n}</span>
          </div>
        )}
      </div>
      <span className="muted">썸네일을 눌러 보세요. 어두운 배경 위에 사진이 크게 뜹니다. ← → 키나 양옆 화살표, 좌우로 밀기로 넘기고, Esc 나 어두운 바깥을 누르면 닫힙니다.</span>
    </div>
  );
}

/* ───────── 캐러셀 ───────── */
const SLIDES = [
  { seed: 210, title: "봄맞이 화분 기획전", sub: "이번 주까지 모든 화분 20% 할인" },
  { seed: 211, title: "초보를 위한 다육이", sub: "물 주기 한 달에 한 번이면 충분해요" },
  { seed: 212, title: "베란다 텃밭 세트", sub: "상추·방울토마토 씨앗 포함" },
  { seed: 213, title: "물뿌리개 새로 나옴", sub: "손잡이가 가벼워졌어요" },
  { seed: 214, title: "식물 병원 상담", sub: "사진만 올리면 답해 드려요" },
];
export function CarouselDemo() {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const [paused, setPaused] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const idx = useRef(0); idx.current = i;
  const n = SLIDES.length;
  const go = (k: number) => {
    const t = track.current; if (!t) return;
    const next = (k + n) % n;
    t.scrollTo({ left: next * t.clientWidth, behavior: "smooth" });
  };
  useEffect(() => {
    if (hold || paused) return;
    const id = window.setInterval(() => go(idx.current + 1), 3000);
    return () => window.clearInterval(id);
  }, [hold, paused]);
  return (
    <div className="demo-stage">
      <div className="vis-car" onPointerEnter={(e) => { if (e.pointerType === "mouse") setHold(true); }} onPointerLeave={() => setHold(false)}
        onFocus={() => setHold(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHold(false); }}>
        <div ref={track} className="vis-car-track" aria-roledescription="캐러셀" aria-label="추천 배너"
          onScroll={(e) => { const t = e.currentTarget; const k = Math.round(t.scrollLeft / t.clientWidth); if (k !== i) setI(k); }}>
          {SLIDES.map((s, k) => (
            <div key={s.seed} className="vis-car-slide" role="group" aria-roledescription="슬라이드" aria-label={`${k + 1} / ${n}`}>
              <img src={photo(s.seed, 400, 200)} alt="" draggable={false} />
              <div className="vis-car-text"><b>{s.title}</b><span>{s.sub}</span></div>
            </div>
          ))}
        </div>
        <button type="button" className="vis-lb-nav prev" onClick={() => go(i - 1)} aria-label="이전 슬라이드">‹</button>
        <button type="button" className="vis-lb-nav next" onClick={() => go(i + 1)} aria-label="다음 슬라이드">›</button>
        {(hold || paused) && <span className="vis-ov-chip vis-car-paused">❚❚ 멈춤</span>}
      </div>
      <div className="row vis-car-under">
        <button type="button" className="btn small" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "▶ 자동 넘김 켜기" : "❚❚ 자동 넘김 멈추기"}</button>
        <div className="vis-car-dots">
          {SLIDES.map((s, k) => <button type="button" key={s.seed} className={k === i ? "on" : ""} onClick={() => go(k)} aria-label={`${k + 1}번 슬라이드`} aria-current={k === i} />)}
        </div>
      </div>
      <span className="muted">3초마다 저절로 넘어가다가, 커서를 올리거나 포커스가 들어가면 멈춥니다. 좌우로 밀어 넘기면 한 장씩 딱 맞게 멈추고(스크롤 스냅), 아래 점은 지금 몇 번째인지 알려 줍니다.</span>
    </div>
  );
}

/* ───────── 보기 방식 전환 ───────── */
const FILES = [
  { name: "제주 바다.jpg", date: "9월 28일", size: "3.2MB" },
  { name: "숲길 산책.jpg", date: "9월 21일", size: "2.8MB" },
  { name: "할머니 댁.jpg", date: "9월 15일", size: "4.1MB" },
  { name: "노을.jpg", date: "9월 3일", size: "1.9MB" },
  { name: "캠핑장 밤.jpg", date: "8월 27일", size: "3.6MB" },
  { name: "호수 위 보트.jpg", date: "8월 12일", size: "2.2MB" },
];
const VIEW_KEY = "vis-view-mode";
export function GridListToggleDemo() {
  const [mode, setMode] = useState<"grid" | "list">(() => {
    try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"; } catch { return "grid"; }
  });
  const [size, setSize] = useState(90);
  const choose = (m: "grid" | "list") => { setMode(m); try { localStorage.setItem(VIEW_KEY, m); } catch { /* 저장 못 해도 괜찮다 */ } };
  return (
    <div className="demo-stage">
      <div className="vis-gl-bar">
        <b>사진 {FILES.length}장</b>
        {mode === "grid" && (
          <label className="vis-gl-size"><span aria-hidden="true">▫</span>
            <input type="range" min={60} max={150} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="썸네일 크기" />
            <span aria-hidden="true">◻</span></label>
        )}
        <div className="segmented vis-gl-seg" role="radiogroup" aria-label="보기 방식">
          <button type="button" role="radio" aria-checked={mode === "grid"} className={mode === "grid" ? "on" : ""} onClick={() => choose("grid")} aria-label="격자 보기" title="격자 보기">▦</button>
          <button type="button" role="radio" aria-checked={mode === "list"} className={mode === "list" ? "on" : ""} onClick={() => choose("list")} aria-label="목록 보기" title="목록 보기">☰</button>
        </div>
      </div>
      {mode === "grid" ? (
        <div className="vis-gl-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))` }}>
          {FILES.map((f, i) => (
            <figure key={f.name}><img src={photo(230 + i, 200, 200)} alt="" /><figcaption>{f.name}</figcaption></figure>
          ))}
        </div>
      ) : (
        <table className="vis-gl-list">
          <thead><tr><th>이름</th><th>날짜</th><th>크기</th></tr></thead>
          <tbody>
            {FILES.map((f, i) => (
              <tr key={f.name}><td><img src={photo(230 + i, 40, 40)} alt="" />{f.name}</td><td>{f.date}</td><td className="mono">{f.size}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <span className="muted">오른쪽 위 ▦ ☰ 로 사진 격자와 정보 목록을 바꿔 보세요. 격자에서는 슬라이더로 썸네일 크기를 바꿀 수 있고, 고른 보기 방식은 새로 열어도 기억됩니다.</span>
    </div>
  );
}

/* ───────── 다중 선택 ───────── */
export function MultiSelectDemo() {
  const initial = useMemo(() => Array.from({ length: 12 }, (_, i) => 250 + i), []);
  const [items, setItems] = useState(initial);
  const [mode, setMode] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");
  const anchor = useRef<number | null>(null);
  const press = useRef<number | undefined>(undefined);
  const longFired = useRef(false);
  const msgT = useRef<number | undefined>(undefined);
  useEffect(() => () => { window.clearTimeout(press.current); window.clearTimeout(msgT.current); }, []);

  const exit = () => { setMode(false); setSel(new Set()); anchor.current = null; };
  const toggle = (id: number) => setSel((s) => { const c = new Set(s); if (c.has(id)) c.delete(id); else c.add(id); return c; });
  const range = (to: number) => {
    const a = items.indexOf(anchor.current ?? to), b = items.indexOf(to);
    const [lo, hi] = a < b ? [a, b] : [b, a];
    setSel((s) => { const c = new Set(s); items.slice(lo, hi + 1).forEach((x) => c.add(x)); return c; });
  };
  const onClick = (id: number, e: React.MouseEvent) => {
    if (longFired.current) { longFired.current = false; return; }
    if (e.shiftKey && (mode || anchor.current !== null)) { setMode(true); range(id); return; }
    if (e.ctrlKey || e.metaKey || mode) { setMode(true); toggle(id); anchor.current = id; return; }
    say("사진을 엽니다 (선택 모드가 아닐 때 누르면 열려요)");
  };
  const say = (t: string) => { setMsg(t); window.clearTimeout(msgT.current); msgT.current = window.setTimeout(() => setMsg(""), 1800); };
  const startPress = (id: number) => {
    window.clearTimeout(press.current);
    press.current = window.setTimeout(() => {
      longFired.current = true;
      setMode(true);
      setSel((s) => new Set(s).add(id));
      anchor.current = id;
      navigator.vibrate?.(15);
    }, 500);
  };
  const cancelPress = () => window.clearTimeout(press.current);
  const all = sel.size === items.length;
  return (
    <div className="demo-stage">
      <div className={`vis-ms-bar ${mode ? "on" : ""}`}>
        {mode ? (
          <>
            <button type="button" className="btn small" onClick={exit}>취소</button>
            <b aria-live="polite">{sel.size}개 선택됨</b>
            <button type="button" className="link" onClick={() => setSel(all ? new Set() : new Set(items))}>{all ? "모두 해제" : "모두 선택"}</button>
          </>
        ) : (
          <>
            <b>사진 {items.length}장</b>
            <button type="button" className="btn small" onClick={() => setMode(true)}>선택</button>
          </>
        )}
      </div>
      <div className="vis-ms-grid" onKeyDown={(e) => { if (e.key === "Escape" && mode) exit(); }}>
        {items.map((id) => {
          const on = sel.has(id);
          return (
            <button type="button" key={id} className={`vis-ms-item ${on ? "on" : ""} ${mode ? "mode" : ""}`} aria-pressed={mode ? on : undefined}
              aria-label={`사진 ${id - 249}`}
              onPointerDown={() => startPress(id)} onPointerUp={cancelPress} onPointerLeave={cancelPress} onPointerCancel={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => onClick(id, e)}>
              <img src={photo(id, 120, 120)} alt="" draggable={false} />
              {mode && <span className="vis-ms-check" aria-hidden="true">{on ? "✓" : ""}</span>}
            </button>
          );
        })}
      </div>
      {mode && (
        <div className="vis-ms-actions">
          <button type="button" className="btn small" disabled={!sel.size} onClick={() => say(`${sel.size}장을 공유합니다`)}>공유</button>
          <button type="button" className="btn small" disabled={!sel.size} onClick={() => say(`${sel.size}장을 앨범으로 옮깁니다`)}>이동</button>
          <button type="button" className="btn small danger" disabled={!sel.size} onClick={() => { setItems(items.filter((x) => !sel.has(x))); say(`${sel.size}장을 지웠습니다`); exit(); }}>삭제</button>
          <button type="button" className="link" onClick={() => { setItems(initial); exit(); }}>처음으로</button>
        </div>
      )}
      {msg && <span className="vis-ms-msg" role="status">{msg}</span>}
      <span className="muted">‘선택’을 누르거나 사진 하나를 길게 눌러 선택 모드로 들어가 보세요. 여러 장을 누르고, Shift+클릭으로 사이를 한꺼번에, Ctrl(⌘)+클릭으로 하나씩 고를 수 있습니다. 고른 개수와 동작은 막대에 모입니다.</span>
    </div>
  );
}
