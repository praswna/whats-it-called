import { useId, useRef, useState } from "react";

/* 예시용 풍경. vivid 는 보정 후 색감, boat 는 나중에 추가된 물체 */
function Scene({ vivid = true, boat = false }: { vivid?: boolean; boat?: boolean }) {
  const sky = `sky${useId().replace(/:/g, "")}`;
  return (
    <svg className="cmp-scene" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      style={vivid ? undefined : { filter: "grayscale(0.75) brightness(0.8) contrast(0.85)" }}>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f8fd6" />
          <stop offset="1" stopColor="#f6c48a" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${sky})`} />
      <circle cx="236" cy="62" r="22" fill="#ffd36b" />
      <path d="M0 128 L58 70 L104 112 L150 58 L214 124 L262 92 L320 126 V200 H0 Z" fill="#3e6b5a" />
      <path d="M150 58 L134 74 L150 70 L164 76 Z" fill="#f2f2f2" />
      <rect y="132" width="320" height="68" fill="#2b7a99" />
      <path d="M20 150 h50 M120 166 h70 M230 152 h60 M60 184 h80" stroke="#8fd3e8" strokeWidth="2" strokeLinecap="round" />
      {boat && (
        <g>
          <path d="M96 146 h56 l-10 12 h-36 Z" fill="#c2452d" />
          <path d="M124 146 V110 L146 142 Z" fill="#fafafa" />
        </g>
      )}
    </svg>
  );
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/* 비포·애프터 슬라이더 */
export function BeforeAfterDemo() {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moveTo = (clientX: number) => {
    const r = box.current?.getBoundingClientRect(); if (!r) return;
    setPos(clamp(((clientX - r.left) / r.width) * 100));
  };
  return (
    <div className="demo-stage">
      <div ref={box} className="cmp-frame cmp-drag"
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); moveTo(e.clientX); }}
        onPointerMove={(e) => { if (dragging.current) moveTo(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
        <div className="cmp-layer"><Scene vivid={false} /></div>
        <div className="cmp-layer" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}><Scene /></div>
        <span className="cmp-label left">전</span>
        <span className="cmp-label right">후</span>
        <div className="cmp-divider" style={{ left: `${pos}%` }}>
          <span className="cmp-knob" role="slider" tabIndex={0} aria-label="전후 경계" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 10 : 2;
              if (e.key === "ArrowLeft") { e.preventDefault(); setPos((p) => clamp(p - step)); }
              if (e.key === "ArrowRight") { e.preventDefault(); setPos((p) => clamp(p + step)); }
            }}>◀▶</span>
        </div>
      </div>
      <span className="muted">사진 아무 곳이나 누르거나 가운데 선을 좌우로 끌어 보세요. 손잡이에 포커스를 두면 ← → 키로도 움직입니다.</span>
    </div>
  );
}

/* 어니언 스킨: 위 사진의 불투명도를 조절해 겹쳐 보기 */
export function OnionSkinDemo() {
  const [opacity, setOpacity] = useState(50);
  return (
    <div className="demo-stage">
      <div className="cmp-frame">
        <div className="cmp-layer"><Scene vivid={false} /></div>
        <div className="cmp-layer" style={{ opacity: opacity / 100 }}><Scene boat /></div>
      </div>
      <label className="row">
        <span className="muted">전</span>
        <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} aria-label="뒤 사진 불투명도" />
        <span className="muted">후 · {opacity}%</span>
      </label>
      <span className="muted">슬라이더를 움직이면 두 사진이 겹쳐진 채 서서히 바뀝니다. 50% 근처에서 배가 반투명하게 보입니다.</span>
    </div>
  );
}

/* 나란히 비교: 커서 위치를 양쪽에 같이 표시 */
export function SideBySideDemo() {
  const [pt, setPt] = useState<{ x: number; y: number } | null>(null);
  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPt({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  const panel = (label: string, scene: React.ReactNode) => (
    <figure className="cmp-side">
      <div className="cmp-frame" onPointerMove={track} onPointerLeave={() => setPt(null)}>
        <div className="cmp-layer">{scene}</div>
        {pt && <span className="cmp-cross" style={{ left: `${pt.x}%`, top: `${pt.y}%` }} />}
      </div>
      <figcaption className="muted">{label}</figcaption>
    </figure>
  );
  return (
    <div className="demo-stage">
      <div className="cmp-pair">
        {panel("전", <Scene vivid={false} />)}
        {panel("후", <Scene boat />)}
      </div>
      <span className="muted">한쪽 사진 위에서 커서를 움직이면 다른 쪽에도 같은 자리에 표시가 따라옵니다.</span>
    </div>
  );
}

/* 누르고 있는 동안 원본 보기 */
export function HoldCompareDemo() {
  const [holding, setHolding] = useState(false);
  const on = () => setHolding(true);
  const off = () => setHolding(false);
  return (
    <div className="demo-stage">
      <div className="cmp-frame" onPointerDown={on} onPointerUp={off} onPointerLeave={off} onPointerCancel={off}
        onContextMenu={(e) => e.preventDefault()}>
        <div className="cmp-layer"><Scene vivid={!holding} /></div>
        <span className="cmp-label left">{holding ? "원본" : "보정 후"}</span>
      </div>
      <div className="row">
        <button type="button" className="btn small" onPointerDown={on} onPointerUp={off} onPointerLeave={off}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); on(); } }}
          onKeyUp={off} onBlur={off}>누르고 있는 동안 원본</button>
        <span className="muted">사진이나 버튼을 꾹 누르고 있다가 떼 보세요.</span>
      </div>
    </div>
  );
}

/* 돋보기 렌즈 */
export function LoupeDemo() {
  const ZOOM = 2.5;
  const LENS = 110;
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setLens({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  };
  return (
    <div className="demo-stage">
      <div className="cmp-frame cmp-loupe-frame" onPointerMove={track} onPointerDown={track} onPointerLeave={() => setLens(null)}>
        <div className="cmp-layer"><Scene boat /></div>
        {lens && (
          <div className="cmp-lens" style={{ width: LENS, height: LENS, left: lens.x - LENS / 2, top: lens.y - LENS / 2 }}>
            <div style={{
              position: "absolute", width: lens.w * ZOOM, height: lens.h * ZOOM,
              left: -lens.x * ZOOM + LENS / 2, top: -lens.y * ZOOM + LENS / 2,
            }}>
              <Scene boat />
            </div>
          </div>
        )}
      </div>
      <span className="muted">사진 위에 커서를 올려 보세요. 커서 자리가 {ZOOM}배로 크게 보입니다.</span>
    </div>
  );
}

/* 차이 강조: 두 버전을 겹쳐 다른 곳만 밝게 */
export function PixelDiffDemo() {
  const modes = ["v1", "v2", "차이"] as const;
  const [mode, setMode] = useState<(typeof modes)[number]>("차이");
  return (
    <div className="demo-stage">
      <div className="segmented" role="radiogroup" aria-label="보기" style={{ alignSelf: "flex-start" }}>
        {modes.map((m) => (
          <button type="button" key={m} role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{m}</button>
        ))}
      </div>
      <div className="cmp-frame cmp-isolate">
        <div className="cmp-layer"><Scene boat={mode === "v2"} /></div>
        {mode === "차이" && (
          <>
            <div className="cmp-layer" style={{ mixBlendMode: "difference" }}><Scene boat /></div>
          </>
        )}
      </div>
      <span className="muted">'차이'에서는 두 버전이 같은 곳은 검게, 다른 곳(배)만 밝게 남습니다.</span>
    </div>
  );
}
