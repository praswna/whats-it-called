import { useEffect, useRef, useState } from "react";

/* 토스트 + 실행 취소 */
export function ToastDemo() {
  const [items, setItems] = useState(["회의록.md", "스크린샷.png", "초안.txt"]);
  const [toast, setToast] = useState<{ name: string; idx: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const remove = (name: string) => {
    const idx = items.indexOf(name);
    setItems(items.filter((x) => x !== name));
    setToast({ name, idx });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 4000);
  };
  const undo = () => {
    if (!toast) return;
    const next = [...items]; next.splice(toast.idx, 0, toast.name); setItems(next); setToast(null);
  };
  return (
    <div className="demo-stage">
      <ul className="plain-list">
        {items.map((f) => <li key={f}>{f} <button type="button" className="btn small" onClick={() => remove(f)}>삭제</button></li>)}
        {items.length === 0 && <li className="muted">모두 지웠습니다.</li>}
      </ul>
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toast && <>'{toast.name}' 삭제됨 <button type="button" className="link" onClick={undo}>실행 취소</button></>}
      </div>
      <span className="muted">확인창 없이 바로 지우고, 4초 동안 되돌릴 기회를 줍니다.</span>
    </div>
  );
}

/* 스켈레톤 */
export function SkeletonDemo() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  useEffect(() => {
    if (state !== "loading") return;
    const t = window.setTimeout(() => setState("done"), 1800);
    return () => window.clearTimeout(t);
  }, [state]);
  return (
    <div className="demo-stage">
      <div className="row"><button type="button" className="btn" onClick={() => setState("loading")}>불러오기</button>
        <span className="muted">1.8초 동안 뼈대를 보여 주고 내용으로 바뀝니다.</span></div>
      <div className="card-row">
        {[0, 1].map((i) => (
          <div key={i} className="mini-card">
            {state === "done" ? (
              <><div className="mc-img real">{i === 0 ? "🏔️" : "🌊"}</div><b>{i === 0 ? "설악산 단풍" : "동해 일출"}</b><span className="muted">10월 둘째 주 · 사진 12장</span></>
            ) : (
              <><div className={`mc-img sk ${state === "loading" ? "shimmer" : ""}`} /><div className={`sk line w60 ${state === "loading" ? "shimmer" : ""}`} /><div className={`sk line w80 ${state === "loading" ? "shimmer" : ""}`} /></>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 진행 표시 */
export function ProgressDemo() {
  const [p, setP] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setP((v) => { if (v >= 100) { setRunning(false); return 100; } return v + 2; }), 60);
    return () => window.clearInterval(id);
  }, [running]);
  return (
    <div className="demo-stage">
      <div className="row"><button type="button" className="btn" onClick={() => { setP(0); setRunning(true); }}>다운로드 시작</button><span className="muted tabular">{p}%</span></div>
      <div className="bar"><div className="bar-fill" style={{ width: `${p}%` }} /></div>
      <span className="muted">얼마나 남았는지 모를 때는 이렇게 왔다갔다 합니다 (불확정):</span>
      <div className="bar"><div className="bar-indeterminate" /></div>
    </div>
  );
}

/* 낙관적 UI */
export function OptimisticDemo() {
  const [likes, setLikes] = useState(42);
  const [liked, setLiked] = useState(false);
  const [msg, setMsg] = useState("");
  const [fail, setFail] = useState(false);
  const toggle = () => {
    const nextLiked = !liked;
    setLiked(nextLiked); setLikes(likes + (nextLiked ? 1 : -1)); setMsg("서버에 보내는 중…");
    window.setTimeout(() => {
      if (fail) { setLiked(liked); setLikes(likes); setMsg("실패! 되돌렸습니다 (롤백)."); }
      else setMsg("서버 확인 완료.");
    }, 1200);
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <button type="button" className={`btn like ${liked ? "on" : ""}`} onClick={toggle}>{liked ? "♥" : "♡"} <span className="tabular">{likes}</span></button>
        <label className="row"><input type="checkbox" id="opt-fail" checked={fail} onChange={(e) => setFail(e.target.checked)} /> 서버가 실패한다고 가정</label>
      </div>
      <span className="muted">{msg || "하트가 즉시 바뀌고, 1.2초 뒤에 서버 응답이 옵니다."}</span>
    </div>
  );
}

/* 토글·세그먼트 */
export function TogglesDemo() {
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState("주");
  return (
    <div className="demo-stage row">
      <label className="row">
        <button type="button" role="switch" aria-checked={on} className={`switch ${on ? "on" : ""}`} onClick={() => setOn(!on)}><span /></button>
        알림 {on ? "켜짐" : "꺼짐"}
      </label>
      <div className="segmented" role="radiogroup">
        {["일", "주", "월"].map((s) => <button type="button" key={s} role="radio" aria-checked={seg === s} className={seg === s ? "on" : ""} onClick={() => setSeg(s)}>{s}</button>)}
      </div>
      <span className="muted">왼쪽이 토글 스위치, 오른쪽이 세그먼트 컨트롤.</span>
    </div>
  );
}

/* 인라인 편집 */
export function InlineEditDemo() {
  const [name, setName] = useState("프로젝트 제안서.docx");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select(); } }, [editing]);
  return (
    <div className="demo-stage row">
      📄 {editing ? (
        <input ref={ref} id="inline-edit-input" className="inline-input" value={draft} onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { setName(draft); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { setName(draft); setEditing(false); } if (e.key === "Escape") { setDraft(name); setEditing(false); } }} />
      ) : (
        <button type="button" className="inline-text" onClick={() => { setDraft(name); setEditing(true); }} title="눌러서 이름 바꾸기">{name}</button>
      )}
      <span className="muted">이름을 누르면 그 자리에서 고칩니다. Enter 확정, Esc 취소.</span>
    </div>
  );
}

/* 디바운스 vs 스로틀 */
export function DebounceThrottleDemo() {
  const [raw, setRaw] = useState(0);
  const [deb, setDeb] = useState(0);
  const [thr, setThr] = useState(0);
  const debT = useRef<number | undefined>(undefined);
  const lastThr = useRef(0);
  const onMove = () => {
    setRaw((n) => n + 1);
    window.clearTimeout(debT.current);
    debT.current = window.setTimeout(() => setDeb((n) => n + 1), 300);
    const now = performance.now();
    if (now - lastThr.current > 300) { lastThr.current = now; setThr((n) => n + 1); }
  };
  return (
    <div className="demo-stage">
      <div className="move-area" onPointerMove={onMove} onTouchMove={onMove}>이 안에서 마우스를 움직여 보세요</div>
      <table className="counts">
        <tbody>
          <tr><td>원래 이벤트</td><td className="tabular">{raw}</td><td className="muted">움직일 때마다</td></tr>
          <tr><td>스로틀 (300ms)</td><td className="tabular">{thr}</td><td className="muted">움직이는 동안 0.3초마다 한 번</td></tr>
          <tr><td>디바운스 (300ms)</td><td className="tabular">{deb}</td><td className="muted">멈추고 0.3초 뒤 한 번</td></tr>
        </tbody>
      </table>
    </div>
  );
}
