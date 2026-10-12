import { useEffect, useId, useReducer, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { photo } from "./media";
import "./status.css";

/* 스피너 */
export function SpinnerDemo() {
  const [speed, setSpeed] = useState<"fast" | "slow">("slow");
  const [delay, setDelay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [log, setLog] = useState("");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const run = () => {
    if (busy) return;
    const dur = speed === "fast" ? 150 : 2200;
    let shown = false;
    setBusy(true); setLog("");
    const showIt = () => { shown = true; setShow(true); };
    if (delay) timers.current.push(window.setTimeout(showIt, 400)); else showIt();
    timers.current.push(window.setTimeout(() => {
      timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [];
      setBusy(false); setShow(false);
      if (!shown) setLog("0.4초 전에 끝나서 스피너를 아예 띄우지 않았습니다. 깜빡임이 없습니다.");
      else if (dur < 300) setLog("0.15초 만에 번쩍하고 사라졌습니다. 이런 깜빡임이 오히려 거슬립니다.");
      else setLog("2.2초 동안 '일하는 중'이라는 것만 알려 주었습니다.");
    }, dur));
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="작업 속도">
          <button type="button" role="radio" aria-checked={speed === "fast"} className={speed === "fast" ? "on" : ""} onClick={() => setSpeed("fast")}>빠른 작업</button>
          <button type="button" role="radio" aria-checked={speed === "slow"} className={speed === "slow" ? "on" : ""} onClick={() => setSpeed("slow")}>느린 작업</button>
        </div>
        <label className="row"><input type="checkbox" checked={delay} onChange={(e) => setDelay(e.target.checked)} /> 0.4초 지나서 띄우기</label>
      </div>
      <div className="sta-spin-card" aria-busy={show}>
        {show ? (
          <div className="sta-spin-center"><span className="sta-spin big" aria-hidden="true" /><span className="muted">불러오는 중…</span></div>
        ) : (
          <ul className="plain-list"><li>📄 회의록.md</li><li>📄 예산안.xlsx</li></ul>
        )}
      </div>
      <div className="row">
        <button type="button" className="btn primary sta-spin-btn" onClick={run} disabled={busy}>
          {show && <span className="sta-spin" aria-hidden="true" />}{show ? "새로고치는 중" : "새로고침"}
        </button>
        <span className="muted" role="status">{log}</span>
      </div>
      <span className="muted">끝나는 시점을 모를 때 돌아갑니다. '빠른 작업'에서 지연 체크를 켜고 끄며 깜빡임을 비교해 보세요.</span>
    </div>
  );
}

/* 빈 상태 */
export function EmptyStateDemo() {
  const seed = ["장보기 목록 정리", "치과 예약 전화", "보고서 초안 쓰기"];
  const [items, setItems] = useState(seed);
  const [q, setQ] = useState("");
  const shown = items.filter((x) => x.includes(q.trim()));
  return (
    <div className="demo-stage">
      <div className="sta-app sta-auto">
        <div className="sta-app-bar"><b>할 일</b>
          <input className="sta-input small" placeholder="검색" aria-label="할 일 검색" value={q} onChange={(e) => setQ(e.target.value)} disabled={items.length === 0} />
        </div>
        {items.length === 0 ? (
          <div className="sta-empty">
            <div className="sta-empty-art" aria-hidden="true">📭</div>
            <b>아직 할 일이 없어요</b>
            <span className="muted">오늘 해야 할 일을 하나 적어 보세요.</span>
            <button type="button" className="btn small primary" onClick={() => setItems(["새 할 일"])}>+ 첫 할 일 만들기</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="sta-empty">
            <div className="sta-empty-art" aria-hidden="true">🔍</div>
            <b>'{q}' 결과가 없어요</b>
            <span className="muted">맞춤법을 확인하거나 다른 말로 찾아보세요.</span>
            <button type="button" className="btn small" onClick={() => setQ("")}>검색어 지우기</button>
          </div>
        ) : (
          <ul className="plain-list sta-list">
            {shown.map((x) => (
              <li key={x}><span>☐ {x}</span><button type="button" className="btn small" onClick={() => setItems(items.filter((y) => y !== x))} aria-label={`${x} 지우기`}>지우기</button></li>
            ))}
          </ul>
        )}
      </div>
      <span className="muted">항목을 모두 지우거나 없는 말로 검색해 보세요. 빈 화면 대신 다음에 할 일을 알려 주는 안내가 나옵니다.</span>
    </div>
  );
}

/* 인라인 검증 */
export function InlineValidationDemo() {
  const [mode, setMode] = useState<"blur" | "input" | "submit">("blur");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [touched, setTouched] = useState({ email: false, pw: false });
  const [submitted, setSubmitted] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const pwScore = [pw.length >= 8, /\d/.test(pw), /[A-Za-z가-힣]/.test(pw), /[^A-Za-z0-9가-힣]/.test(pw)].filter(Boolean).length;
  const pwOk = pw.length >= 8 && /\d/.test(pw);
  const check = (field: "email" | "pw", value: string) =>
    mode === "input" ? value !== "" : mode === "blur" ? touched[field] || submitted : submitted;
  const reset = (m: typeof mode) => { setMode(m); setTouched({ email: false, pw: false }); setSubmitted(false); };
  const showEmail = check("email", email);
  const showPw = check("pw", pw);
  const modes: [typeof mode, string][] = [["input", "입력마다"], ["blur", "벗어날 때"], ["submit", "제출할 때"]];
  return (
    <div className="demo-stage">
      <div className="segmented" role="radiogroup" aria-label="검사 시점">
        {modes.map(([m, label]) => <button type="button" key={m} role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => reset(m)}>{label}</button>)}
      </div>
      <form className="sta-form" noValidate onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
        <label className="sta-field">
          <span>이메일</span>
          <input className={`sta-input ${showEmail ? (emailOk ? "ok" : "bad") : ""}`} type="email" value={email} placeholder="name@example.com"
            aria-invalid={showEmail && !emailOk} aria-describedby="sta-iv-email"
            onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} />
          <small id="sta-iv-email" className={`sta-hint ${showEmail ? (emailOk ? "ok" : "bad") : ""}`}>
            {showEmail ? (emailOk ? "✓ 좋아요" : "⚠ 이메일 형식이 아니에요 (예: name@example.com)") : " "}
          </small>
        </label>
        <label className="sta-field">
          <span>비밀번호</span>
          <input className={`sta-input ${showPw ? (pwOk ? "ok" : "bad") : ""}`} type="password" value={pw}
            aria-invalid={showPw && !pwOk} aria-describedby="sta-iv-pw"
            onChange={(e) => setPw(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, pw: true }))} />
          <div className="sta-meter" aria-hidden="true">{[0, 1, 2, 3].map((i) => <span key={i} className={i < pwScore ? `on s${pwScore}` : ""} />)}</div>
          <small id="sta-iv-pw" className={`sta-hint ${showPw ? (pwOk ? "ok" : "bad") : ""}`}>
            {showPw ? (pwOk ? "✓ 사용할 수 있어요" : "⚠ 8자 이상, 숫자를 하나 넣어 주세요") : "강도 막대는 입력하는 대로 바뀝니다"}
          </small>
        </label>
        <div className="row"><button type="submit" className="btn small primary">가입하기</button>
          {submitted && emailOk && pwOk && <span className="sta-hint ok">가입 완료!</span>}</div>
      </form>
      <span className="muted">검사 시점을 바꿔 가며 이메일을 쳐 보세요. '입력마다'는 다 치기도 전에 빨간 글씨가 뜨고, '벗어날 때'는 칸을 한 번 벗어난 뒤부터 입력마다 다시 검사합니다.</span>
    </div>
  );
}

/* 배지 */
export function BadgeDemo() {
  const [tab, setTab] = useState("home");
  const [msgs, setMsgs] = useState(3);
  const [dot, setDot] = useState(true);
  const open = (t: string) => { setTab(t); if (t === "msg") setMsgs(0); if (t === "noti") setDot(false); };
  const tabs = [
    { id: "home", icon: "🏠", label: "홈", badge: null as string | null, sr: "" },
    { id: "msg", icon: "💬", label: "메시지", badge: msgs > 0 ? (msgs > 99 ? "99+" : String(msgs)) : null, sr: msgs > 0 ? `, 읽지 않은 ${msgs}개` : "" },
    { id: "noti", icon: "🔔", label: "알림", badge: dot ? "" : null, sr: dot ? ", 새 소식 있음" : "" },
  ];
  return (
    <div className="demo-stage">
      <div className="sta-tabbar" role="tablist" aria-label="아래 탭">
        {tabs.map((t) => (
          <button type="button" role="tab" aria-selected={tab === t.id} key={t.id} className={`sta-tab ${tab === t.id ? "on" : ""}`} onClick={() => open(t.id)} aria-label={t.label + t.sr}>
            <span className="sta-tab-icon" aria-hidden="true">{t.icon}
              {t.badge !== null && <span className={`sta-badge ${t.badge === "" ? "dot" : ""}`}>{t.badge}</span>}
            </span>
            <span className="sta-tab-label" aria-hidden="true">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn small" onClick={() => setMsgs((m) => m + 1)}>메시지 1개 도착</button>
        <button type="button" className="btn small" onClick={() => setMsgs((m) => m + 60)}>60개 도착</button>
        <button type="button" className="btn small" onClick={() => setDot(true)}>새 소식</button>
      </div>
      <span className="muted">메시지에는 숫자(카운트 배지), 알림에는 점(도트)이 붙습니다. 100개가 넘으면 '99+'로 줄입니다. 탭을 누르면 읽은 것으로 보고 지워집니다.</span>
    </div>
  );
}

/* 배너·공지 띠 */
export function BannerDemo() {
  const [online, setOnline] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(true);
  return (
    <div className="demo-stage">
      <div className="sta-app sta-auto">
        <div className="sta-app-bar"><b>내 문서</b><span className="muted">⋯</span></div>
        <div role="status">
          {!online && <div className="sta-banner warn"><span aria-hidden="true">📡</span><span>오프라인 상태입니다. 바뀐 내용은 연결되면 저장됩니다.</span></div>}
        </div>
        {verifyOpen && (
          <div className="sta-banner info">
            <span aria-hidden="true">✉️</span><span>이메일 인증을 마쳐 주세요. <button type="button" className="link">메일 다시 보내기</button></span>
            <button type="button" className="sta-x" aria-label="공지 닫기" onClick={() => setVerifyOpen(false)}>×</button>
          </div>
        )}
        <ul className="plain-list sta-list"><li>📄 여행 계획</li><li>📄 독서 기록</li></ul>
      </div>
      <div className="row">
        <button type="button" className="btn small" onClick={() => setOnline(!online)}>{online ? "인터넷 끊기" : "인터넷 다시 연결"}</button>
        {!verifyOpen && <button type="button" className="btn small" onClick={() => setVerifyOpen(true)}>인증 공지 다시 띄우기</button>}
      </div>
      <span className="muted">토스트와 달리 기다려도 사라지지 않습니다. 오프라인 띠는 연결되면, 인증 띠는 ×를 눌러야 사라집니다.</span>
    </div>
  );
}

/* 백드롭·스크림 */
export function BackdropDemo() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"dim" | "blur" | "none">("dim");
  const opener = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) closeBtn.current?.focus(); }, [open]);
  const close = () => { setOpen(false); opener.current?.focus(); };
  const kinds: [typeof kind, string][] = [["dim", "어둡게"], ["blur", "블러"], ["none", "없음"]];
  return (
    <div className="demo-stage">
      <div className="segmented" role="radiogroup" aria-label="백드롭 종류">
        {kinds.map(([k, label]) => <button type="button" key={k} role="radio" aria-checked={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{label}</button>)}
      </div>
      <div className="sta-app sta-auto">
        <div className="sta-app-bar"><b>사진첩</b><button ref={opener} type="button" className="btn small" onClick={() => setOpen(true)}>삭제…</button></div>
        <div className="sta-photos">
          {[3, 7, 11].map((s) => <img key={s} src={photo(s, 160, 120)} alt="" />)}
        </div>
        <p className="muted sta-pad">가을 여행 · 사진 3장</p>
        {open && <div className={`sta-backdrop ${kind}`} onClick={close} aria-hidden="true" />}
        {open && (
          <div className="sta-dialog" role="dialog" aria-modal="true" aria-label="사진 삭제" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
            <b>사진 3장을 지울까요?</b>
            <div className="row end">
              <button ref={closeBtn} type="button" className="btn small" onClick={close}>취소</button>
              <button type="button" className="btn small danger" onClick={close}>삭제</button>
            </div>
          </div>
        )}
      </div>
      <span className="muted">'삭제…'를 눌러 보세요. 뒤를 덮는 반투명 막이 백드롭입니다. 막을 누르거나 Esc 로 닫히고, '없음'으로 바꾸면 창이 뒤와 섞여 잘 안 보입니다.</span>
    </div>
  );
}

/* 바깥 누르면 닫기 (팝오버·드롭다운 공용) */
function useOutsideClose(open: boolean, ref: RefObject<HTMLElement>, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) closeRef.current(); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, ref]);
}

/* 팝오버 */
export function PopoverDemo() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [edit, setEdit] = useState(false);
  const [behind, setBehind] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const id = useId();
  useOutsideClose(open, wrap, () => setOpen(false));
  useEffect(() => { if (open) { setCopied(false); first.current?.focus(); first.current?.select(); } }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="sta-anchor" ref={wrap}>
          <button ref={trigger} type="button" className="btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>🔗 공유</button>
          {open && (
            <div id={id} className="sta-pop" role="dialog" aria-label="링크 공유" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}>
              <span className="sta-pop-arrow" aria-hidden="true" />
              <b>링크 공유</b>
              <div className="row sta-nowrap">
                <input ref={first} className="sta-input small sta-grow" readOnly value="https://example.com/d/42" aria-label="공유 링크" />
                <button type="button" className="btn small" onClick={() => setCopied(true)}>{copied ? "복사됨" : "복사"}</button>
              </div>
              <label className="row"><input type="checkbox" checked={edit} onChange={(e) => setEdit(e.target.checked)} /> 링크가 있으면 누구나 편집</label>
            </div>
          )}
        </div>
        <button type="button" className="btn small" onClick={() => setBehind(behind + 1)}>뒤쪽 버튼 ({behind})</button>
      </div>
      <div className="sta-doc-card">
        <b>📄 가을 여행 계획</b>
        <span className="muted">마지막 수정 3분 전 · 김하늘</span>
        <span className="sta-line w80" /><span className="sta-line w60" /><span className="sta-line w70" />
      </div>
      <span className="muted">'공유'를 누르면 버튼에 붙은 패널이 뜹니다. 안에서 복사하고 체크해도 닫히지 않고, 바깥을 누르거나 Esc 를 누르면 닫힙니다. 모달과 달리 뒤쪽 버튼도 그대로 눌립니다.</span>
    </div>
  );
}

/* 드롭다운 */
export function DropdownDemo() {
  const options = ["최신순", "오래된순", "이름순", "인기순"];
  const files = [
    { name: "가을 사진", day: 12, likes: 8 },
    { name: "회의록", day: 3, likes: 21 },
    { name: "예산안", day: 27, likes: 2 },
  ];
  const [value, setValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  useOutsideClose(open, wrap, () => setOpen(false));
  useEffect(() => { if (open) list.current?.focus(); }, [open]);
  const show = (i: number) => { setActive(i); setOpen(true); };
  const choose = (i: number) => { setValue(i); setOpen(false); btn.current?.focus(); };
  const onListKey = (e: ReactKeyboardEvent) => {
    const n = options.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + n) % n); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(n - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); btn.current?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  };
  const sorted = [...files].sort((a, b) =>
    value === 0 ? a.day - b.day : value === 1 ? b.day - a.day : value === 2 ? a.name.localeCompare(b.name, "ko") : b.likes - a.likes);
  return (
    <div className="demo-stage">
      <div className="sta-anchor" ref={wrap}>
        <button ref={btn} type="button" className="btn sta-dd-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`}
          onClick={() => (open ? setOpen(false) : show(value))}
          onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); show(value); } }}>
          정렬: {options[value]} <span aria-hidden="true">▾</span>
        </button>
        {open && (
          <ul ref={list} id={`${id}-list`} className="sta-dd" role="listbox" tabIndex={-1} aria-label="정렬 기준" aria-activedescendant={`${id}-o${active}`} onKeyDown={onListKey}>
            {options.map((o, i) => (
              <li key={o} id={`${id}-o${i}`} role="option" aria-selected={i === value} className={`${i === active ? "active" : ""}`}
                onPointerMove={() => setActive(i)} onClick={() => choose(i)}>
                <span className="sta-check" aria-hidden="true">{i === value ? "✓" : ""}</span>{o}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ul className="plain-list sta-list sta-boxed">
        {sorted.map((f) => <li key={f.name}><span>📄 {f.name}</span><span className="muted tabular">{f.day}일 전 · ♥ {f.likes}</span></li>)}
      </ul>
      <span className="muted">버튼을 누르거나 포커스한 뒤 ↓ 를 눌러 보세요. ↑↓ 로 움직이고 Enter 로 고르면 목록이 바로 닫히고 정렬이 바뀝니다. Esc 는 그냥 닫기. 팝오버와 달리 하나를 고르는 순간 끝납니다.</span>
    </div>
  );
}

/* 모덜리스·팔레트 창 */
export function ModelessDemo() {
  const text = "오늘 회의에서는 다음 달 출시 일정과 디자인 수정 사항을 정리했습니다. 디자인 팀은 아이콘을 다시 그리고, 개발 팀은 출시 전에 버그를 고칩니다. 다음 회의는 금요일입니다.";
  const [modal, setModal] = useState(false);
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState("디자인");
  const [size, setSize] = useState(14);
  const [pos, setPos] = useState({ x: 120, y: 60 });
  const [nudge, setNudge] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const nudgeT = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(nudgeT.current), []);
  useEffect(() => {
    // 처음엔 틀의 오른쪽 아래 구석에 놓는다
    const f = frame.current, w = win.current;
    if (!f || !w) return;
    setPos({ x: Math.max(0, f.clientWidth - w.offsetWidth - 12), y: Math.max(0, f.clientHeight - w.offsetHeight - 12) });
  }, []);
  const parts = q.trim() ? text.split(new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g")) : [text];
  const count = q.trim() ? parts.filter((_, i) => i % 2 === 1).length : 0;
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const f = frame.current, w = win.current;
    if (!drag.current || !f || !w) return;
    const x = Math.max(0, Math.min(e.clientX - drag.current.dx, f.clientWidth - w.offsetWidth));
    const y = Math.max(0, Math.min(e.clientY - drag.current.dy, f.clientHeight - w.offsetHeight));
    setPos({ x, y });
  };
  const blocked = () => { setNudge(true); window.clearTimeout(nudgeT.current); nudgeT.current = window.setTimeout(() => setNudge(false), 400); };
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="창 종류">
          <button type="button" role="radio" aria-checked={!modal} className={!modal ? "on" : ""} onClick={() => setModal(false)}>모덜리스</button>
          <button type="button" role="radio" aria-checked={modal} className={modal ? "on" : ""} onClick={() => setModal(true)}>모달이었다면</button>
        </div>
        {!open && <button type="button" className="btn small" onClick={() => setOpen(true)}>찾기 창 열기</button>}
      </div>
      <div className="sta-app sta-tall" ref={frame}>
        <div className="sta-app-bar"><b>회의록</b>
          <span className="row sta-nowrap">
            <button type="button" className="btn small" onClick={() => setSize((s) => Math.max(11, s - 1))} aria-label="글자 작게">가−</button>
            <button type="button" className="btn small" onClick={() => setSize((s) => Math.min(19, s + 1))} aria-label="글자 크게">가+</button>
          </span>
        </div>
        <p className="sta-doc" style={{ fontSize: size }}>
          {parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="sta-mark">{p}</mark> : <span key={i}>{p}</span>))}
        </p>
        {open && modal && <div className="sta-backdrop dim" onPointerDown={blocked} aria-hidden="true" />}
        {open && (
          <div ref={win} className={`sta-float ${nudge ? "nudge" : ""}`} style={{ left: pos.x, top: pos.y }} role="dialog" aria-modal={modal} aria-label="찾기">
            <div className="sta-float-title" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
              <span>⠿ 찾기</span>
              <button type="button" className="sta-x" aria-label="찾기 창 닫기" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="sta-float-body">
              <input className="sta-input small" value={q} onChange={(e) => setQ(e.target.value)} aria-label="찾을 말" />
              <small className="muted">{count}개 찾음</small>
            </div>
          </div>
        )}
      </div>
      <span className="muted">찾기 창을 띄운 채로 뒤쪽 '가+' 버튼을 눌러 보세요. 그대로 눌립니다. 제목줄을 끌어 옮길 수도 있습니다. '모달이었다면'으로 바꾸면 창을 닫기 전엔 뒤를 만질 수 없습니다.</span>
    </div>
  );
}

/* 포커스 링 */
export function FocusRingDemo() {
  const [last, setLast] = useState("");
  const viaPointer = useRef(false);
  const rows: [string, string, string][] = [
    ["sta-fr-none", "outline: none", "지워 버림 — 키보드로 와도 안 보임"],
    ["sta-fr-focus", ":focus", "마우스로 눌러도 테두리가 남음"],
    ["sta-fr-visible", ":focus-visible", "Tab 으로 올 때만 보임"],
  ];
  return (
    <div className="demo-stage" onPointerDown={() => { viaPointer.current = true; }} onKeyDown={() => { viaPointer.current = false; }}>
      <div className="sta-fr-grid">
        {rows.map(([cls, code, note]) => (
          <div className="sta-fr-row" key={cls}>
            <button type="button" className={`btn small ${cls}`} onFocus={() => setLast(`${code} 버튼에 ${viaPointer.current ? "마우스로" : "키보드로"} 왔습니다`)}>저장</button>
            <span className="mono sta-fr-code">{code}</span>
            <span className="muted sta-fr-note">{note}</span>
          </div>
        ))}
      </div>
      <span className="sta-fr-log" role="status">{last || "아직 포커스가 없습니다"}</span>
      <span className="muted">버튼을 마우스로 눌러 보고, 그다음 Tab·Shift+Tab 으로 오가 보세요. 맨 아래 :focus-visible 만 마우스엔 조용하고 키보드엔 또렷합니다.</span>
    </div>
  );
}

/* 로빙 탭인덱스 */
export function RovingTabindexDemo() {
  const tools = [
    { k: "b", glyph: "B", label: "굵게" },
    { k: "i", glyph: "I", label: "기울임" },
    { k: "u", glyph: "U", label: "밑줄" },
    { k: "left", glyph: "⇤", label: "왼쪽 정렬" },
    { k: "center", glyph: "↔", label: "가운데 정렬" },
    { k: "right", glyph: "⇥", label: "오른쪽 정렬" },
  ];
  const [active, setActive] = useState(0);
  const [on, setOn] = useState<Record<string, boolean>>({ left: true });
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => { const n = tools.length; const j = (i + n) % n; setActive(j); refs.current[j]?.focus(); };
  const press = (k: string) => {
    if (k === "left" || k === "center" || k === "right") setOn((o) => ({ ...o, left: false, center: false, right: false, [k]: true }));
    else setOn((o) => ({ ...o, [k]: !o[k] }));
  };
  const align = on.center ? "center" : on.right ? "right" : "left";
  return (
    <div className="demo-stage">
      <input className="sta-input" placeholder="제목 (여기서 시작)" aria-label="제목" />
      <div className="sta-toolbar" role="toolbar" aria-label="글자 서식"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); move(active + 1); }
          else if (e.key === "ArrowLeft") { e.preventDefault(); move(active - 1); }
          else if (e.key === "Home") { e.preventDefault(); move(0); }
          else if (e.key === "End") { e.preventDefault(); move(tools.length - 1); }
        }}>
        {tools.map((t, i) => (
          <div className="sta-tool" key={t.k}>
            <button ref={(el) => { refs.current[i] = el; }} type="button" tabIndex={i === active ? 0 : -1} aria-pressed={!!on[t.k]} aria-label={t.label}
              className={`sta-tool-btn ${on[t.k] ? "on" : ""} sta-g-${t.k}`} onFocus={() => setActive(i)} onClick={() => press(t.k)}>{t.glyph}</button>
            <span className={`mono sta-ti ${i === active ? "zero" : ""}`} aria-hidden="true">{i === active ? "0" : "-1"}</span>
          </div>
        ))}
      </div>
      <textarea className="sta-input sta-area" aria-label="본문" defaultValue="서식이 여기에 적용됩니다."
        style={{ fontWeight: on.b ? 700 : 400, fontStyle: on.i ? "italic" : "normal", textDecoration: on.u ? "underline" : "none", textAlign: align }} />
      <span className="muted">제목 칸을 누르고 Tab 을 눌러 보세요. 툴바엔 한 번에 들어오고, 안에서는 ←→ 로 움직입니다. 다시 Tab 을 누르면 버튼 여섯 개를 건너 본문으로 갑니다. 숫자는 각 버튼의 tabindex 입니다.</span>
    </div>
  );
}

/* 건너뛰기 링크 */
export function SkipLinkDemo() {
  const menu = ["홈", "뉴스", "날씨", "스포츠", "연예", "쇼핑"];
  const mainId = useId();
  const main = useRef<HTMLHeadingElement>(null);
  const tabs = useRef(0);
  const [result, setResult] = useState("");
  const start = () => { tabs.current = 0; setResult(""); };
  return (
    <div className="demo-stage"
      onKeyDown={(e) => { if (e.key === "Tab" && !e.shiftKey) tabs.current += 1; }}
      onFocus={(e) => { if ((e.target as HTMLElement).closest(".sta-sk-main") && !result) setResult(`Tab ${tabs.current}번 만에 본문에 왔습니다.`); }}>
      <div className="row"><button type="button" className="btn small" onClick={start} onFocus={start}>① 여기를 누른 뒤 Tab</button>
        <span className="sta-fr-log" role="status">{result}</span></div>
      <div className="sta-sk-page">
        <a className="sta-skip" href={`#${mainId}`} onClick={(e) => { e.preventDefault(); main.current?.focus(); }}>본문으로 건너뛰기</a>
        <div className="sta-sk-head">
          <b>동네소식</b>
          <nav aria-label="주 메뉴" className="sta-sk-nav">
            {menu.map((m) => <a key={m} href="#" onClick={(e) => e.preventDefault()}>{m}</a>)}
          </nav>
        </div>
        <div className="sta-sk-main">
          <h4 id={mainId} ref={main} tabIndex={-1}>오늘의 기사</h4>
          <p className="muted">공원 산책로가 새로 단장을 마쳤습니다. 주말부터 밤에도 불이 켜집니다.</p>
          <a href="#" onClick={(e) => e.preventDefault()}>기사 더 보기</a>
        </div>
      </div>
      <span className="muted">①을 누르고 Tab 을 한 번 누르면 숨어 있던 '본문으로 건너뛰기'가 나타납니다. Enter 를 누르면 메뉴 여섯 개를 건너뜁니다. 링크를 지나쳐 Tab 만 계속 누르면 몇 번 걸리는지도 비교해 보세요.</span>
    </div>
  );
}

/* 라이브 리전 */
type Utt = { id: number; text: string; kind: "polite" | "assertive" };
type Reader = { current: Utt | null; queue: Utt[]; log: (Utt & { note: string })[] };
type ReaderAction = { type: "say"; utt: Utt } | { type: "done"; id: number } | { type: "clear" };
function readerReducer(s: Reader, a: ReaderAction): Reader {
  const keep = (log: Reader["log"]) => log.slice(0, 4);
  if (a.type === "clear") return { current: null, queue: [], log: [] };
  if (a.type === "say") {
    if (!s.current) return { ...s, current: a.utt };
    if (a.utt.kind === "assertive") return { ...s, current: a.utt, log: keep([{ ...s.current, note: "끊김" }, ...s.log]) };
    return { ...s, queue: [...s.queue, a.utt] };
  }
  if (!s.current || s.current.id !== a.id) return s;
  const [next, ...rest] = s.queue;
  return { current: next ?? null, queue: rest, log: keep([{ ...s.current, note: "다 읽음" }, ...s.log]) };
}
export function AriaLiveDemo() {
  const [live, setLive] = useState(true);
  const [cart, setCart] = useState(0);
  const [status, setStatus] = useState("장바구니가 비었습니다");
  const [alert, setAlert] = useState("");
  const [reader, dispatch] = useReducer(readerReducer, { current: null, queue: [], log: [] });
  const [silent, setSilent] = useState(false);
  const nextId = useRef(1);
  const cur = reader.current;
  useEffect(() => {
    if (!cur) return;
    const t = window.setTimeout(() => dispatch({ type: "done", id: cur.id }), Math.max(1400, cur.text.length * 90));
    return () => window.clearTimeout(t);
  }, [cur]);
  const say = (text: string, kind: Utt["kind"]) => {
    if (!live) { setSilent(true); return; }
    setSilent(false);
    dispatch({ type: "say", utt: { id: nextId.current++, text, kind } });
  };
  const add = () => { const n = cart + 1; setCart(n); const t = `장바구니에 ${n}개 담겼습니다`; setStatus(t); say(t, "polite"); };
  const fail = () => { const t = "결제에 실패했습니다. 카드를 확인해 주세요"; setAlert(t); say(t, "assertive"); };
  return (
    <div className="demo-stage">
      <label className="row"><input type="checkbox" checked={live} onChange={(e) => { setLive(e.target.checked); dispatch({ type: "clear" }); setSilent(false); }} /> aria-live 표시하기</label>
      <div className="sta-live-grid">
        <div className="sta-live-pane">
          <small className="muted">화면</small>
          <div className="row">
            <button type="button" className="btn small" onClick={add}>🛒 담기</button>
            <button type="button" className="btn small danger" onClick={fail}>결제 실패</button>
          </div>
          <div className="sta-live-msg" role={live ? "status" : undefined} aria-live={live ? "polite" : "off"}>{status}</div>
          <div className="sta-live-msg bad" role={live ? "alert" : undefined} aria-live={live ? "assertive" : "off"}>{alert}</div>
          {alert && <button type="button" className="link" onClick={() => setAlert("")}>오류 지우기</button>}
        </div>
        <div className="sta-live-pane sta-reader" aria-hidden="true">
          <small className="muted">🔊 스크린 리더가 읽는 것</small>
          {silent && !cur && <div className="sta-utt muted">(화면만 바뀌고 아무것도 읽지 않음)</div>}
          {cur && (
            <div key={cur.id} className={`sta-utt now ${cur.kind}`}>
              <span className="sta-kind">{cur.kind}</span>“{cur.text}”
              <span className="sta-utt-bar" style={{ animationDuration: `${Math.max(1400, cur.text.length * 90)}ms` }} />
            </div>
          )}
          {reader.queue.map((u) => <div key={u.id} className="sta-utt wait"><span className="sta-kind">대기</span>{u.text}</div>)}
          {reader.log.map((u) => <div key={`l${u.id}`} className={`sta-utt past ${u.note === "끊김" ? "cut" : ""}`}><span className="sta-kind">{u.note}</span>{u.text}</div>)}
          {!cur && !silent && reader.log.length === 0 && <div className="sta-utt muted">조용함</div>}
        </div>
      </div>
      <span className="muted">'담기'를 빠르게 여러 번 눌러 보세요. polite 는 하던 말을 마치고 차례로 읽고, '결제 실패'(assertive)는 읽던 말을 끊고 바로 읽습니다. 표시를 끄면 화면만 바뀌고 귀로는 알 수 없습니다.</span>
    </div>
  );
}

/* 색 대비 */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
export function ColorContrastDemo() {
  const presets: [string, string, string][] = [
    ["연회색 글자", "#aaaaaa", "#ffffff"],
    ["진한 글자", "#1c211f", "#ffffff"],
    ["흰 글자·청록", "#ffffff", "#0f6e68"],
    ["노랑 글자", "#f2c200", "#ffffff"],
    ["흰 글자·주황", "#ffffff", "#ff8c42"],
  ];
  const [fg, setFg] = useState("#aaaaaa");
  const [bg, setBg] = useState("#ffffff");
  const ratio = Math.floor(contrastRatio(fg, bg) * 100) / 100;
  const checks: [string, number][] = [["AA 보통 글자", 4.5], ["AA 큰 글자", 3], ["AAA 보통 글자", 7], ["AAA 큰 글자", 4.5]];
  return (
    <div className="demo-stage">
      <div className="row">
        {presets.map(([name, f, b]) => (
          <button type="button" key={name} className={`btn small sta-preset ${fg === f && bg === b ? "on" : ""}`} onClick={() => { setFg(f); setBg(b); }}>
            <span className="sta-swatch" style={{ background: b, color: f }} aria-hidden="true">가</span>{name}
          </button>
        ))}
      </div>
      <div className="row">
        <label className="row sta-color"><input type="color" value={fg} onChange={(e) => setFg(e.target.value)} /> 글자 <span className="mono">{fg}</span></label>
        <label className="row sta-color"><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} /> 배경 <span className="mono">{bg}</span></label>
        <button type="button" className="btn small" onClick={() => { setFg(bg); setBg(fg); }} aria-label="글자색과 배경색 바꾸기">⇄</button>
      </div>
      <div className="sta-cc-preview" style={{ color: fg, background: bg }}>
        <span className="sta-cc-big">큰 글자 24px</span>
        <span>보통 글자 15px — 밝은 햇빛 아래에서도 읽혀야 합니다.</span>
      </div>
      <div className="sta-cc-result">
        <div className="sta-cc-ratio"><span className="tabular">{ratio.toFixed(2)}</span><small> : 1</small></div>
        <ul className="plain-list sta-cc-checks">
          {checks.map(([label, need]) => {
            const pass = ratio >= need;
            return <li key={label} className={pass ? "pass" : "fail"}><span aria-hidden="true">{pass ? "✓" : "✗"}</span> {label} <span className="muted">({need}:1)</span> <b>{pass ? "통과" : "탈락"}</b></li>;
          })}
        </ul>
      </div>
      <span className="muted">위 예시를 눌러 보거나 색을 직접 골라 보세요. 대비율을 WCAG 공식으로 계산합니다. 통과·탈락은 색뿐 아니라 ✓✗ 와 글자로도 함께 알립니다.</span>
    </div>
  );
}
