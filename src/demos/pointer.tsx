import { useEffect, useRef, useState } from "react";

/* 호버 카드 */
export function HoverCardDemo() {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const show = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), 400); };
  const hide = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), 150); };
  return (
    <div className="demo-stage">
      <p>
        이 글의 작성자는{" "}
        <span className="anchor" onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide} tabIndex={0}>
          @praswna
          {open && (
            <span className="hover-card" onPointerEnter={show} onPointerLeave={hide}>
              <span className="hc-avatar" aria-hidden="true">P</span>
              <span className="hc-body">
                <b>praswna</b>
                <span className="muted">FocusClip 을 만들고 있음 · 저장소 3개</span>
                <button type="button" className="btn small">팔로우</button>
              </span>
            </span>
          )}
        </span>
        {" "}입니다. 이름 위에 커서를 올리고 0.4초 기다려 보세요.
      </p>
    </div>
  );
}

/* 툴팁 */
export function TooltipDemo() {
  return (
    <div className="demo-stage row">
      {[["💾", "저장 (Ctrl+S)"], ["✂️", "잘라내기 (Ctrl+X)"], ["🔗", "링크 복사"]].map(([icon, label]) => (
        <span key={label} className="tip-wrap">
          <button type="button" className="btn icon" aria-label={label}>{icon}</button>
          <span className="tooltip" role="tooltip">{label}</span>
        </span>
      ))}
      <span className="muted">아이콘 위에 올리면 이름이 보입니다.</span>
    </div>
  );
}

/* 스크러비 슬라이더 */
export function ScrubbyDemo() {
  const [value, setValue] = useState(120);
  const start = useRef<{ x: number; v: number } | null>(null);
  const onDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    start.current = { x: e.clientX, v: value };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!start.current) return;
    const step = e.shiftKey ? 10 : 1;
    const next = Math.round(start.current.v + (e.clientX - start.current.x) * step);
    setValue(Math.max(0, Math.min(400, next)));
  };
  const onUp = () => { start.current = null; };
  return (
    <div className="demo-stage">
      <div className="row">
        <label className="muted">확대 배율</label>
        <span className="scrubby" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} title="좌우로 끌어 보세요">
          {value}%
        </span>
        <span className="muted">← 숫자를 누른 채 좌우로 끌기 (Shift 로 10배)</span>
      </div>
      <div className="zoom-preview" style={{ transform: `scale(${0.3 + value / 400})` }}>Aa</div>
    </div>
  );
}

/* 팝업 슬라이더: 누르고-끌고-떼기 */
export function PopupSliderDemo() {
  const [value, setValue] = useState(60);
  const [open, setOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const apply = (clientX: number) => {
    const el = trackRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setValue(Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * 100));
  };
  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = false;
    setOpen(true);
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!open || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    moved.current = true;
    apply(e.clientX);
  };
  const onUp = () => {
    if (moved.current) { setOpen(false); setSticky(false); }
    else setSticky(true); // 클릭만 하면 열린 채로 둔다
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <span className="popup-wrap">
          <button type="button" className="btn icon" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label="볼륨">
            {value === 0 ? "🔇" : value < 50 ? "🔉" : "🔊"}
          </button>
          {(open || sticky) && (
            <div className="popup-slider" onPointerDown={(e) => { apply(e.clientX); e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={(e) => { if (e.buttons) apply(e.clientX); }}>
              <div className="ps-track" ref={trackRef}>
                <div className="ps-fill" style={{ width: `${value}%` }} />
                <div className="ps-thumb" style={{ left: `${value}%` }} />
              </div>
              <span className="ps-value">{value}</span>
              {sticky && <button type="button" className="btn small" onClick={() => setSticky(false)}>닫기</button>}
            </div>
          )}
        </span>
        <span className="muted">아이콘을 <b>누른 채</b> 좌우로 끌고 떼 보세요. 그냥 클릭하면 열린 채로 남습니다.</span>
      </div>
    </div>
  );
}

/* 스프링 로디드 메뉴 */
export function SpringMenuDemo() {
  const items = ["작게", "보통", "크게", "아주 크게"];
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState<number | null>(null);
  const [picked, setPicked] = useState("보통");
  const onMove = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const idx = el?.dataset.idx;
    setHot(idx === undefined ? null : Number(idx));
  };
  const onUp = () => {
    if (hot !== null) setPicked(items[hot]);
    setOpen(false); setHot(null);
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <span className="popup-wrap">
          <button type="button" className="btn" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setOpen(true); }}
            onPointerMove={open ? onMove : undefined} onPointerUp={onUp} onPointerCancel={onUp}>
            글자 크기: {picked} ▾
          </button>
          {open && (
            <ul className="spring-menu" role="menu">
              {items.map((it, i) => <li key={it} data-idx={i} role="menuitem" className={hot === i ? "hot" : ""}>{it}</li>)}
            </ul>
          )}
        </span>
        <span className="muted">버튼을 누른 채 아래로 끌어 항목 위에서 떼 보세요. 밖에서 떼면 취소.</span>
      </div>
    </div>
  );
}

/* 드래그 정렬 */
export function DragReorderDemo() {
  const [items, setItems] = useState(["호버 카드", "스크러빙", "팝업 슬라이더", "토스트"]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <div className="demo-stage">
      <ul className="reorder">
        {items.map((it, i) => (
          <li key={it} draggable
            className={`${dragIdx === i ? "dragging" : ""} ${over === i ? "over" : ""}`}
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDragLeave={() => setOver(null)}
            onDrop={() => {
              if (dragIdx === null || dragIdx === i) return;
              const next = [...items]; const [m] = next.splice(dragIdx, 1); next.splice(i, 0, m);
              setItems(next); setDragIdx(null); setOver(null);
            }}
            onDragEnd={() => { setDragIdx(null); setOver(null); }}>
            <span className="grip" aria-hidden="true">⋮⋮</span>{it}
          </li>
        ))}
      </ul>
      <span className="muted">⋮⋮ 를 잡고 끌어 순서를 바꿔 보세요. 손잡이가 드래그 핸들입니다.</span>
    </div>
  );
}

/* 길게 누르기 */
export function LongPressDemo() {
  const [p, setP] = useState(0);
  const [fired, setFired] = useState(false);
  const raf = useRef(0); const t0 = useRef(0);
  const DUR = 600;
  const tick = () => {
    const el = Math.min(1, (performance.now() - t0.current) / DUR);
    setP(el);
    if (el >= 1) { setFired(true); return; }
    raf.current = requestAnimationFrame(tick);
  };
  const down = () => { setFired(false); t0.current = performance.now(); raf.current = requestAnimationFrame(tick); };
  const up = () => { cancelAnimationFrame(raf.current); setP(0); };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <div className="demo-stage row">
      <button type="button" className={`btn danger lp ${fired ? "done" : ""}`} onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
        style={{ "--p": `${p * 100}%` } as React.CSSProperties}>
        {fired ? "삭제됨" : "길게 눌러 삭제"}
      </button>
      <span className="muted">0.6초 동안 누르고 있어야 실행됩니다. 중간에 떼면 취소.</span>
    </div>
  );
}

/* 스와이프로 닫기 */
export function SwipeDismissDemo() {
  const [cards, setCards] = useState(["새 메시지 2개", "업데이트 준비됨", "오늘 할 일 3개"]);
  const [dx, setDx] = useState<Record<string, number>>({});
  const start = useRef<{ id: string; x: number } | null>(null);
  return (
    <div className="demo-stage">
      <div className="stack">
        {cards.map((c) => (
          <div key={c} className="notif" style={{ transform: `translateX(${dx[c] ?? 0}px)`, opacity: 1 - Math.abs(dx[c] ?? 0) / 240 }}
            onPointerDown={(e) => { start.current = { id: c, x: e.clientX }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { if (start.current?.id === c) setDx({ ...dx, [c]: e.clientX - start.current.x }); }}
            onPointerUp={() => {
              const d = dx[c] ?? 0; start.current = null;
              if (Math.abs(d) > 120) setCards(cards.filter((x) => x !== c)); else setDx({ ...dx, [c]: 0 });
            }}>
            🔔 {c}
          </div>
        ))}
        {cards.length === 0 && <button type="button" className="btn small" onClick={() => setCards(["새 메시지 2개", "업데이트 준비됨", "오늘 할 일 3개"])}>다시 채우기</button>}
      </div>
      <span className="muted">알림을 옆으로 밀어 보세요. 조금만 밀면 제자리로 돌아옵니다.</span>
    </div>
  );
}

/* 컨텍스트 메뉴 */
export function ContextMenuDemo() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [log, setLog] = useState("");
  const area = useRef<HTMLDivElement>(null);
  return (
    <div className="demo-stage">
      <div ref={area} className="ctx-area" onContextMenu={(e) => {
        e.preventDefault();
        const r = area.current!.getBoundingClientRect();
        setPos({ x: Math.min(e.clientX - r.left, r.width - 150), y: Math.min(e.clientY - r.top, r.height - 110) });
      }} onPointerDown={(e) => { if (e.button === 0) setPos(null); }}>
        여기에서 오른쪽 클릭 (터치는 길게 누르기)
        {pos && (
          <ul className="ctx-menu" style={{ left: pos.x, top: pos.y }} role="menu">
            {["복사", "붙여넣기", "이름 바꾸기", "삭제"].map((m) => (
              <li key={m} role="menuitem" onClick={() => { setLog(`${m} 선택`); setPos(null); }}>{m}</li>
            ))}
          </ul>
        )}
      </div>
      <span className="muted">{log || "메뉴가 화면 밖으로 나가지 않게 위치를 보정합니다."}</span>
    </div>
  );
}
