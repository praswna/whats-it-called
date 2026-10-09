import { useEffect, useRef, useState } from "react";

/* 포커스 트랩 모달 */
export function FocusTrapDemo() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <div className="demo-stage row">
      <button type="button" className="btn" onClick={() => ref.current?.showModal()}>모달 열기</button>
      <span className="muted">열린 뒤 Tab 을 계속 눌러 보세요. 포커스가 모달 안에서만 돕니다. Esc 로 닫기.</span>
      <dialog ref={ref} className="demo-dialog">
        <form method="dialog">
          <h4>새 폴더</h4>
          <input id="ft-name" placeholder="폴더 이름" />
          <div className="row end">
            <button type="submit" className="btn small">취소</button>
            <button type="submit" className="btn small primary">만들기</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

/* 바텀 시트 / 드로어 */
export function BottomSheetDemo() {
  const [h, setH] = useState(0);         // 0 닫힘, 1 반, 2 전체
  const start = useRef<{ y: number; h: number } | null>(null);
  const [drag, setDrag] = useState(0);
  const heights = [0, 45, 90];
  return (
    <div className="demo-stage">
      <div className="phone">
        <div className="phone-content">
          <button type="button" className="btn small" onClick={() => setH(1)}>장소 정보 보기</button>
          <p className="muted">지도 영역</p>
        </div>
        {h > 0 && <div className="scrim" onClick={() => setH(0)} />}
        <div className="sheet" style={{ height: `calc(${heights[h]}% + ${-drag}px)`, transition: start.current ? "none" : undefined }}>
          <div className="sheet-handle" onPointerDown={(e) => { start.current = { y: e.clientY, h }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { if (start.current) setDrag(e.clientY - start.current.y); }}
            onPointerUp={() => {
              const d = drag; start.current = null; setDrag(0);
              if (d > 40) setH(Math.max(0, h - 1)); else if (d < -40) setH(Math.min(2, h + 1));
            }}>
            <span />
          </div>
          <b>카페 라운지</b>
          <p className="muted">★ 4.6 · 도보 5분 · 영업 중</p>
          <p className="muted">손잡이를 위아래로 끌어 보세요. 절반 ↔ 전체 ↔ 닫힘, 세 군데 스냅 포인트가 있습니다.</p>
        </div>
      </div>
    </div>
  );
}

/* 아코디언 */
export function AccordionDemo() {
  const qa = [
    ["환불은 어떻게 하나요?", "주문 내역에서 '환불 요청'을 누르면 됩니다. 영업일 3일 안에 처리됩니다."],
    ["배송은 얼마나 걸리나요?", "보통 1~2일, 도서 산간은 3~4일 걸립니다."],
    ["회원 탈퇴는요?", "설정 > 계정 > 탈퇴에서 할 수 있습니다."],
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="demo-stage">
      <div className="accordion">
        {qa.map(([q, a], i) => (
          <div key={q} className={`acc-item ${open === i ? "open" : ""}`}>
            <button type="button" className="acc-head" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span className="chev" aria-hidden="true">▶</span>{q}
            </button>
            <div className="acc-body"><div>{a}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 무한 스크롤 */
export function InfiniteScrollDemo() {
  const [n, setN] = useState(15);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading && n < 90) {
        setLoading(true);
        window.setTimeout(() => { setN((v) => v + 15); setLoading(false); }, 700);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [n, loading]);
  return (
    <div className="demo-stage">
      <div className="scroll-box">
        {Array.from({ length: n }, (_, i) => <div key={i} className="feed-item"><span className="avatar" /> 게시물 #{i + 1}</div>)}
        <div ref={sentinel} className="sentinel muted">{n >= 90 ? "끝입니다" : loading ? "불러오는 중…" : ""}</div>
      </div>
      <span className="muted">바닥에 닿으면 15개씩 더 붙습니다 (최대 90개). 현재 {n}개.</span>
    </div>
  );
}

/* 가상 스크롤 */
export function VirtualListDemo() {
  const TOTAL = 100000, ROW = 32, VIEW = 220;
  const [top, setTop] = useState(0);
  const first = Math.floor(top / ROW);
  const count = Math.ceil(VIEW / ROW) + 2;
  const rows = Array.from({ length: count }, (_, i) => first + i).filter((i) => i < TOTAL);
  return (
    <div className="demo-stage">
      <div className="scroll-box" style={{ height: VIEW }} onScroll={(e) => setTop(e.currentTarget.scrollTop)}>
        <div style={{ height: TOTAL * ROW, position: "relative" }}>
          {rows.map((i) => <div key={i} className="vrow" style={{ top: i * ROW, height: ROW }}>행 {i.toLocaleString()}</div>)}
        </div>
      </div>
      <span className="muted">전체 {TOTAL.toLocaleString()}행이지만 실제 DOM 요소는 {rows.length}개뿐입니다.</span>
    </div>
  );
}

/* 커맨드 팔레트 */
export function CommandPaletteDemo({ commands }: { commands: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [done, setDone] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const fuzzy = (s: string, query: string) => {
    let j = 0; const t = s.toLowerCase(); const qq = query.toLowerCase();
    for (let i = 0; i < t.length && j < qq.length; i++) if (t[i] === qq[j]) j++;
    return j === qq.length;
  };
  const list = commands.filter((c) => fuzzy(c, q)).slice(0, 7);
  useEffect(() => { if (open) { setQ(""); setSel(0); window.setTimeout(() => input.current?.focus(), 0); } }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="demo-stage">
      <div className="row"><button type="button" className="btn" onClick={() => setOpen(true)}>팔레트 열기</button><span className="muted">또는 Ctrl+K / Cmd+K</span></div>
      <span className="muted">{done ? `실행: ${done}` : "글자 순서만 맞으면 찾아 줍니다 (퍼지 검색). 예: 'ㅅㅋㄹ' 말고 'skl' 처럼 영문 머리글자."}</span>
      {open && (
        <div className="palette-backdrop" onClick={() => setOpen(false)}>
          <div className="palette" onClick={(e) => e.stopPropagation()}>
            <input ref={input} id="palette-input" value={q} placeholder="명령 또는 용어 검색…" onChange={(e) => { setQ(e.target.value); setSel(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
                if (e.key === "Enter" && list[sel]) { setDone(list[sel]); setOpen(false); }
                if (e.key === "Escape") setOpen(false);
              }} />
            <ul>
              {list.map((c, i) => <li key={c} className={i === sel ? "sel" : ""} onMouseEnter={() => setSel(i)} onClick={() => { setDone(c); setOpen(false); }}>{c}</li>)}
              {list.length === 0 && <li className="muted">결과 없음</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* 이징·스프링 */
export function EasingDemo() {
  const [run, setRun] = useState(0);
  const curves: [string, string][] = [
    ["linear", "linear"], ["ease-out", "cubic-bezier(0.16, 1, 0.3, 1)"], ["ease-in-out", "cubic-bezier(0.65, 0, 0.35, 1)"], ["spring", "linear(0, 0.3 6%, 0.8 15%, 1.08 27%, 0.97 40%, 1.01 55%, 1)"],
  ];
  return (
    <div className="demo-stage">
      <div className="row"><button type="button" className="btn" onClick={() => setRun((r) => r + 1)}>움직이기</button><span className="muted">같은 거리, 같은 0.9초. 곡선만 다릅니다.</span></div>
      <div className="lanes">
        {curves.map(([name, fn]) => (
          <div key={name} className="lane"><span className="lane-label mono">{name}</span>
            <div key={run} className="ball" style={{ animation: run ? `slide 0.9s ${fn} forwards` : "none" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
