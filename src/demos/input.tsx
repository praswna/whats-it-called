import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./input.css";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ───────────── 슬라이더 ───────────── */
type TrackProps = {
  values: number[]; min: number; max: number; step: number;
  onChange: (v: number[]) => void; labels: string[]; format: (v: number) => string; ticks?: boolean;
};
function Track({ values, min, max, step, onChange, labels, format, ticks }: TrackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const thumbs = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const snap = (v: number) => clamp(Math.round((v - min) / step) * step + min, min, max);
  const setAt = (i: number, raw: number) => {
    let v = snap(raw);
    if (values.length === 2) v = i === 0 ? Math.min(v, values[1]) : Math.max(v, values[0]);
    if (v === values[i]) return;
    const next = [...values]; next[i] = v; onChange(next);
  };
  const fromX = (x: number) => {
    const r = ref.current!.getBoundingClientRect();
    return min + clamp((x - r.left) / r.width, 0, 1) * (max - min);
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const v = fromX(e.clientX);
    let i = 0;
    if (values.length === 2) {
      const d0 = Math.abs(v - values[0]), d1 = Math.abs(v - values[1]);
      i = d0 < d1 ? 0 : d1 < d0 ? 1 : v > values[1] ? 1 : 0;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(i); thumbs.current[i]?.focus(); setAt(i, v);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => { if (drag !== null) setAt(drag, fromX(e.clientX)); };
  const up = () => setDrag(null);
  const key = (i: number) => (e: React.KeyboardEvent) => {
    const big = step * Math.max(1, Math.round((max - min) / step / 10));
    const map: Record<string, number> = {
      ArrowRight: values[i] + step, ArrowUp: values[i] + step, ArrowLeft: values[i] - step, ArrowDown: values[i] - step,
      PageUp: values[i] + big, PageDown: values[i] - big, Home: min, End: max,
    };
    if (e.key in map) { e.preventDefault(); setAt(i, map[e.key]); }
  };
  const lo = values.length === 2 ? values[0] : min;
  const hi = values.length === 2 ? values[1] : values[0];
  const tickList = ticks ? Array.from({ length: Math.round((max - min) / step) + 1 }, (_, k) => min + k * step) : [];
  return (
    <div ref={ref} className={`inp-track ${drag !== null ? "dragging" : ""}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="inp-rail" />
      <div className="inp-fill" style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
      {tickList.map((t) => <span key={t} className={`inp-tick ${t >= lo && t <= hi ? "in" : ""}`} style={{ left: `${pct(t)}%` }} />)}
      {values.map((v, i) => (
        <div key={i} ref={(el) => { thumbs.current[i] = el; }} className={`inp-thumb ${drag === i ? "active" : ""}`} style={{ left: `${pct(v)}%` }}
          role="slider" tabIndex={0} aria-label={labels[i]} aria-valuemin={min} aria-valuemax={max} aria-valuenow={v} aria-valuetext={format(v)}
          onKeyDown={key(i)}>
          <span className="inp-thumb-tip">{format(v)}</span>
        </div>
      ))}
    </div>
  );
}

export function SliderDemo() {
  const [vol, setVol] = useState([40]);
  const [price, setPrice] = useState([20000, 70000]);
  const won = (v: number) => `${(v / 10000).toLocaleString("ko-KR")}만 원`;
  const icon = vol[0] === 0 ? "🔇" : vol[0] < 35 ? "🔈" : vol[0] < 70 ? "🔉" : "🔊";
  return (
    <div className="demo-stage">
      <div className="inp-slider-row">
        <span className="inp-slider-icon" aria-hidden>{icon}</span>
        <Track values={vol} min={0} max={100} step={1} onChange={setVol} labels={["볼륨"]} format={(v) => `${v}`} />
        <span className="tabular inp-slider-val">{vol[0]}</span>
      </div>
      <div className="stack">
        <div className="row"><b className="inp-label">가격 범위</b><span className="muted tabular">{won(price[0])} ~ {won(price[1])}</span></div>
        <div className="inp-slider-row">
          <Track values={price} min={0} max={100000} step={10000} onChange={setPrice} labels={["최저 가격", "최고 가격"]} format={won} ticks />
        </div>
      </div>
      <span className="muted">손잡이를 끌거나, 누른 뒤 ← → · Home · End 키로 움직여 보세요. 아래는 손잡이가 두 개인 범위 슬라이더로, 1만 원 눈금에 딱딱 걸립니다.</span>
    </div>
  );
}

/* ───────────── 스테퍼 ───────────── */
function Stepper({ value, onChange, min, max, step, label, unit }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number; label: string; unit: string;
}) {
  const val = useRef(value); val.current = value;
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const stop = () => { window.clearTimeout(timer.current); window.clearInterval(timer.current); timer.current = undefined; };
  useEffect(() => stop, []);
  const bump = (d: number) => {
    const next = clamp(val.current + d, min, max);
    val.current = next; onChange(next);
    if (next === min || next === max) stop();
  };
  const hold = (d: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    bump(d);
    stop();
    timer.current = window.setTimeout(() => { timer.current = window.setInterval(() => bump(d), 70); }, 400);
  };
  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n)) onChange(clamp(Math.round(n / step) * step, min, max));
    setDraft(null);
  };
  const btn = (d: number, text: string, aria: string, disabled: boolean) => (
    <button type="button" className="inp-step-btn" aria-label={aria} disabled={disabled}
      onPointerDown={hold(d)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onClick={(e) => { if (e.detail === 0) bump(d); }}>{text}</button>
  );
  return (
    <div className="inp-stepper">
      {btn(-step, "−", `${label} 줄이기`, value <= min)}
      <input className="inp-step-input tabular" role="spinbutton" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        inputMode="numeric" value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))} onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") { e.preventDefault(); setDraft(null); bump(step); }
          else if (e.key === "ArrowDown") { e.preventDefault(); setDraft(null); bump(-step); }
          else if (e.key === "Enter") commit();
        }} />
      <span className="inp-step-unit">{unit}</span>
      {btn(step, "+", `${label} 늘리기`, value >= max)}
    </div>
  );
}

export function StepperDemo() {
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState(16);
  return (
    <div className="demo-stage">
      <div className="inp-card inp-step-line">
        <div className="stack inp-grow"><b>보온 텀블러</b><span className="muted tabular">{(12900 * qty).toLocaleString("ko-KR")}원</span></div>
        <Stepper value={qty} onChange={setQty} min={1} max={10} step={1} label="수량" unit="개" />
      </div>
      <div className="inp-card inp-step-line">
        <div className="stack inp-grow"><b>글자 크기</b><span className="inp-step-sample" style={{ fontSize: size }}>가나다 Aa</span></div>
        <Stepper value={size} onChange={setSize} min={10} max={28} step={2} label="글자 크기" unit="px" />
      </div>
      <span className="muted">+ − 를 누르면 한 칸씩, 꾹 누르고 있으면 빠르게 계속 바뀝니다. 숫자 칸에서 ↑ ↓ 키도 됩니다. 끝값에 닿으면 버튼이 꺼집니다.</span>
    </div>
  );
}

/* ───────────── 콤보박스·자동완성 ───────────── */
const CITIES = ["서울", "부산", "인천", "대구", "대전", "광주", "울산", "세종", "수원", "성남", "고양", "용인", "창원", "청주", "전주", "천안", "안산", "안양", "김해", "포항", "제주", "춘천", "강릉", "원주", "여수", "순천", "목포", "경주", "속초", "서귀포", "서산", "세종시청"];
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const choseong = (s: string) => s.split("").map((c) => {
  const code = c.charCodeAt(0) - 0xac00;
  return code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : c;
}).join("");
const isCho = (s: string) => s.length > 0 && s.split("").every((c) => CHO.includes(c));

export function ComboboxDemo() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const list = useMemo(() => {
    const t = q.trim();
    if (!t) return CITIES.slice(0, 8);
    return CITIES.filter((c) => (isCho(t) ? choseong(c).includes(t) : c.includes(t))).slice(0, 8);
  }, [q]);
  const choose = (c: string) => { setQ(c); setPicked(c); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (!open) { setOpen(true); setActive(0); } else setActive((a) => (a + 1) % Math.max(1, list.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setActive((a) => (a - 1 + list.length) % Math.max(1, list.length)); }
    else if (e.key === "Enter") { if (open && list[active]) { e.preventDefault(); choose(list[active]); } else if (q.trim()) { setPicked(q.trim()); setOpen(false); } }
    else if (e.key === "Escape") { if (open) setOpen(false); else setQ(""); }
  };
  const mark = (c: string) => {
    const t = q.trim();
    const i = t && !isCho(t) ? c.indexOf(t) : -1;
    if (i < 0) return c;
    return <>{c.slice(0, i)}<mark className="inp-mark">{c.slice(i, i + t.length)}</mark>{c.slice(i + t.length)}</>;
  };
  return (
    <div className="demo-stage">
      <div className="inp-combo">
        <label className="inp-label" htmlFor="inp-combo-input">도착 도시</label>
        <div className="inp-combo-box">
          <input id="inp-combo-input" className="inp-field" role="combobox" aria-expanded={open} aria-controls="inp-combo-list" aria-autocomplete="list"
            aria-activedescendant={open && list[active] ? `inp-combo-opt-${active}` : undefined}
            value={q} placeholder="도시 이름 또는 초성 (예: ㅅㅇ)" autoComplete="off"
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKey} />
          <button type="button" className="inp-combo-toggle" aria-label="후보 목록 열기" tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(!open); document.getElementById("inp-combo-input")?.focus(); }}>▾</button>
        </div>
        {open && (
          <ul id="inp-combo-list" className="inp-combo-list" role="listbox" aria-label="도시 후보">
            {list.map((c, i) => (
              <li key={c} id={`inp-combo-opt-${i}`} role="option" aria-selected={i === active} className={i === active ? "on" : ""}
                onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => choose(c)}>{mark(c)}</li>
            ))}
            {list.length === 0 && <li className="inp-combo-empty">후보 없음 · Enter 로 '{q}' 그대로 입력</li>}
          </ul>
        )}
      </div>
      <span className="muted">글자를 치면 후보가 좁혀집니다. ↑ ↓ 로 고르고 Enter, 닫으려면 Esc. 초성(ㅂㅅ)으로도 찾아집니다.{picked && <> 고른 값: <b>{picked}</b></>}</span>
    </div>
  );
}

/* ───────────── 칩·태그 ───────────── */
export function ChipsDemo() {
  const filters = ["무료 배송", "오늘 출발", "할인 중", "별점 4+"];
  const [on, setOn] = useState<string[]>(["할인 중"]);
  const [tokens, setTokens] = useState(["mina@example.com", "준호"]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const valid = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  const add = () => {
    const t = draft.trim().replace(/[,;]$/, "");
    if (t && !tokens.includes(t)) setTokens([...tokens, t]);
    setDraft("");
  };
  return (
    <div className="demo-stage">
      <div className="stack">
        <span className="inp-label">필터 칩</span>
        <div className="row inp-chip-row">
          {filters.map((f) => {
            const sel = on.includes(f);
            return <button type="button" key={f} aria-pressed={sel} className={`inp-chip ${sel ? "on" : ""}`}
              onClick={() => setOn(sel ? on.filter((x) => x !== f) : [...on, f])}>{sel && <span aria-hidden>✓ </span>}{f}</button>;
          })}
        </div>
      </div>
      <div className="stack">
        <label className="inp-label" htmlFor="inp-token-input">받는 사람 (토큰 입력)</label>
        <div className="inp-token-box" onClick={() => inputRef.current?.focus()}>
          {tokens.map((t) => (
            <span key={t} className={`inp-token ${valid(t) ? "" : "bad"}`} title={valid(t) ? t : "메일 주소 형식이 아닙니다"}>
              {t}
              <button type="button" className="inp-token-x" aria-label={`${t} 지우기`} onClick={(e) => { e.stopPropagation(); setTokens(tokens.filter((x) => x !== t)); }}>×</button>
            </span>
          ))}
          <input id="inp-token-input" ref={inputRef} className="inp-token-input" value={draft} placeholder={tokens.length ? "" : "메일 주소"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === "," || e.key === ";") && !e.nativeEvent.isComposing) { e.preventDefault(); add(); }
              else if (e.key === "Backspace" && draft === "" && tokens.length) setTokens(tokens.slice(0, -1));
            }}
            onBlur={add} />
        </div>
      </div>
      <div className="row"><span className="muted">배지(누를 수 없음):</span><span className="inp-badge">새 글</span><span className="inp-badge warm">품절 임박</span></div>
      <span className="muted">필터 칩을 눌러 켜고 꺼 보세요. 받는 사람 칸에 주소를 쓰고 Enter 나 쉼표를 치면 칩이 되고, 빈 칸에서 Backspace 를 누르면 마지막 칩이 지워집니다.</span>
    </div>
  );
}

/* ───────────── 피커 휠 ───────────── */
const ROW = 36;
function WheelColumn({ items, index, onChange, label }: { items: string[]; index: number; onChange: (i: number) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(index * ROW);
  const cur = useRef(index);
  const idle = useRef<number | undefined>(undefined);
  const dragY = useRef<{ y: number; top: number } | null>(null);
  useLayoutEffect(() => { if (ref.current) ref.current.scrollTop = index * ROW; }, []);
  useEffect(() => () => window.clearTimeout(idle.current), []);
  const go = (i: number) => ref.current?.scrollTo({ top: clamp(i, 0, items.length - 1) * ROW, behavior: "smooth" });
  const onScroll = () => {
    const el = ref.current!;
    setTop(el.scrollTop);
    const i = clamp(Math.round(el.scrollTop / ROW), 0, items.length - 1);
    cur.current = i;
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => onChange(cur.current), 120);
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return; // 터치는 브라우저 스크롤에 맡김
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    dragY.current = { y: e.clientY, top: e.currentTarget.scrollTop };
    e.currentTarget.style.scrollSnapType = "none";
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragY.current) return;
    e.currentTarget.scrollTop = dragY.current.top - (e.clientY - dragY.current.y);
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragY.current) return;
    const moved = Math.abs(e.clientY - dragY.current.y);
    dragY.current = null;
    const el = e.currentTarget;
    el.style.scrollSnapType = "";
    if (moved < 4) {
      const r = el.getBoundingClientRect();
      go(Math.round((el.scrollTop + e.clientY - r.top - 2 * ROW - ROW / 2) / ROW));
    } else go(Math.round(el.scrollTop / ROW));
  };
  return (
    <div ref={ref} className="inp-wheel-col" tabIndex={0} role="spinbutton" aria-label={label}
      aria-valuenow={index} aria-valuetext={items[index]}
      onScroll={onScroll} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); go(cur.current + 1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); go(cur.current - 1); }
        else if (e.key === "Home") { e.preventDefault(); go(0); }
        else if (e.key === "End") { e.preventDefault(); go(items.length - 1); }
      }}>
      <div className="inp-wheel-pad" />
      {items.map((it, i) => {
        const d = (i * ROW - top) / ROW;
        const a = clamp(d, -3, 3);
        return (
          <div key={i} className="inp-wheel-item" aria-hidden
            style={{ transform: `perspective(300px) rotateX(${-a * 22}deg)`, opacity: Math.max(0.12, 1 - Math.abs(a) * 0.32) }}>{it}</div>
        );
      })}
      <div className="inp-wheel-pad" />
    </div>
  );
}

export function PickerWheelDemo() {
  const ampm = ["오전", "오후"];
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const mins = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
  const [a, setA] = useState(0);
  const [h, setH] = useState(6);
  const [m, setM] = useState(6);
  return (
    <div className="demo-stage">
      <div className="inp-wheel">
        <div className="inp-wheel-band" aria-hidden />
        <WheelColumn items={ampm} index={a} onChange={setA} label="오전 오후" />
        <WheelColumn items={hours} index={h} onChange={setH} label="시" />
        <WheelColumn items={mins} index={m} onChange={setM} label="분" />
      </div>
      <div className="row"><span>⏰ 알람</span><b className="tabular">{ampm[a]} {hours[h]}:{mins[m]}</b></div>
      <span className="muted">각 칸을 위아래로 굴려 보세요(마우스는 끌기나 휠, 키보드는 ↑ ↓). 한 칸씩 딱딱 걸리며 가운데 줄에 멈춘 값이 골라집니다.</span>
    </div>
  );
}

/* ───────────── 날짜 선택기 ───────────── */
const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDate = (s: string): Date | null => {
  const m = s.trim().match(/^(\d{4})[-./ ](\d{1,2})[-./ ](\d{1,2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getMonth() === +m[2] - 1 ? d : null;
};

export function DatePickerDemo() {
  const today = useMemo(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }, []);
  const [range, setRange] = useState(false);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [hover, setHover] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [focusD, setFocusD] = useState(today);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const kbd = useRef(false);

  const show = (s: Date | null, e: Date | null) => setText(s ? (range ? `${fmtDate(s)} ~ ${e ? fmtDate(e) : ""}` : fmtDate(s)) : "");
  useEffect(() => {
    if (!open) return;
    const off = (ev: PointerEvent) => { if (wrap.current && !wrap.current.contains(ev.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);
  useEffect(() => {
    if (open && kbd.current) (grid.current?.querySelector('[tabindex="0"]') as HTMLElement | null)?.focus();
  }, [focusD, open]);

  const pick = (d: Date) => {
    setErr("");
    if (!range) { setStart(d); setEnd(null); show(d, null); setOpen(false); inputRef.current?.focus(); return; }
    if (!start || end) { setStart(d); setEnd(null); show(d, null); return; }
    const [s, e] = d < start ? [d, start] : [start, d];
    setStart(s); setEnd(e); show(s, e); setOpen(false); inputRef.current?.focus();
  };
  const quick = (s: Date, e: Date | null) => { setStart(s); setEnd(e); show(s, e); setFocusD(s); setOpen(false); setErr(""); };
  const commitText = () => {
    if (!text.trim()) { setStart(null); setEnd(null); setErr(""); return; }
    const parts = text.split("~").map((p) => parseDate(p));
    if (parts.some((p) => !p) || (range && parts.length !== 2) || (!range && parts.length !== 1)) { setErr(range ? "2026-10-01 ~ 2026-10-07 처럼 적어 주세요." : "2026-10-12 처럼 적어 주세요."); return; }
    const [s, e] = parts as Date[];
    setErr(""); setStart(s); setEnd(e ?? null); setFocusD(s); show(s, e ?? null);
  };

  const y = focusD.getFullYear(), mo = focusD.getMonth();
  const first = new Date(y, mo, 1);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(y, mo, 1 - first.getDay() + i));
  // 기간 모드에서 종료일을 고르기 전에는 마우스가 가리키는 날까지 미리 칠해 준다
  const tail = range && start ? (end ?? hover) : null;
  const rs = start && tail && tail < start ? tail : start;
  const re = start && tail ? (tail < start ? start : tail) : null;
  const onGridKey = (e: React.KeyboardEvent) => {
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusD, -1), ArrowRight: () => addDays(focusD, 1),
      ArrowUp: () => addDays(focusD, -7), ArrowDown: () => addDays(focusD, 7),
      PageUp: () => new Date(y, mo - 1, Math.min(focusD.getDate(), 28)), PageDown: () => new Date(y, mo + 1, Math.min(focusD.getDate(), 28)),
    };
    if (map[e.key]) { e.preventDefault(); kbd.current = true; setFocusD(map[e.key]()); }
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.focus(); }
  };
  const toggleOpen = () => { kbd.current = false; setFocusD(start ?? today); setOpen(!open); };

  return (
    <div className="demo-stage" ref={wrap}>
      <div className="segmented" role="radiogroup" aria-label="선택 방식">
        {[false, true].map((r) => <button type="button" key={String(r)} role="radio" aria-checked={range === r} className={range === r ? "on" : ""}
          onClick={() => { setRange(r); setStart(null); setEnd(null); setText(""); setErr(""); }}>{r ? "기간" : "하루"}</button>)}
      </div>
      <div className="inp-date-field">
        <input ref={inputRef} className="inp-field tabular" aria-label={range ? "기간" : "날짜"} placeholder={range ? "시작일 ~ 종료일" : "YYYY-MM-DD"}
          value={text} onChange={(e) => setText(e.target.value)} onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitText();
            if (e.key === "ArrowDown" && e.altKey) { e.preventDefault(); kbd.current = true; setFocusD(start ?? today); setOpen(true); }
            if (e.key === "Escape") setOpen(false);
          }} />
        <button type="button" className="inp-date-btn" aria-label="달력 열기" aria-expanded={open} onClick={toggleOpen}>📅</button>
      </div>
      {err && <span className="inp-err">{err}</span>}
      {open && (
        <div className="inp-cal" role="dialog" aria-label="날짜 고르기">
          <div className="inp-cal-head">
            <button type="button" className="btn small" aria-label="이전 달" onClick={() => setFocusD(new Date(y, mo - 1, 1))}>‹</button>
            <b className="tabular">{y}년 {mo + 1}월</b>
            <button type="button" className="btn small" aria-label="다음 달" onClick={() => setFocusD(new Date(y, mo + 1, 1))}>›</button>
          </div>
          <div className="inp-cal-grid" ref={grid} role="grid" onKeyDown={onGridKey} onPointerLeave={() => setHover(null)}>
            {["일", "월", "화", "수", "목", "금", "토"].map((w) => <span key={w} className="inp-cal-wd" role="columnheader">{w}</span>)}
            {cells.map((d) => {
              const out = d.getMonth() !== mo;
              const isS = sameDay(d, range ? rs : start), isE = !!re && sameDay(d, re);
              const inR = range && rs && re && d > rs && d < re;
              const cls = ["inp-cal-day", out && "out", sameDay(d, today) && "today", (isS || isE) && "sel", inR && "in"].filter(Boolean).join(" ");
              return (
                <button type="button" key={d.getTime()} className={cls} tabIndex={sameDay(d, focusD) ? 0 : -1}
                  aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일`} aria-selected={isS || isE}
                  onPointerEnter={() => setHover(d)} onClick={() => { setFocusD(d); pick(d); }}>{d.getDate()}</button>
              );
            })}
          </div>
          <div className="row inp-cal-quick">
            {range ? <>
              <button type="button" className="btn small" onClick={() => quick(addDays(today, -6), today)}>최근 7일</button>
              <button type="button" className="btn small" onClick={() => quick(new Date(today.getFullYear(), today.getMonth(), 1), today)}>이번 달</button>
            </> : <>
              <button type="button" className="btn small" onClick={() => quick(today, null)}>오늘</button>
              <button type="button" className="btn small" onClick={() => quick(addDays(today, -1), null)}>어제</button>
            </>}
            {range && start && !end && <span className="muted">종료일을 고르세요</span>}
          </div>
        </div>
      )}
      <span className="muted">📅 를 눌러 달력에서 고르거나, 칸에 직접 날짜를 쳐도 됩니다. 달력 안에서는 화살표 키로 움직이고 Enter, PageUp/Down 은 달 이동, Esc 는 닫기. '기간'에서는 두 번 눌러 시작과 끝을 고릅니다.</span>
    </div>
  );
}

/* ───────────── 색상 선택기 ───────────── */
type HSV = { h: number; s: number; v: number };
function hsvToRgb({ h, s, v }: HSV): [number, number, number] {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5), f(3), f(1)].map((x) => Math.round(x * 255)) as [number, number, number];
}
const rgbToHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
function hexToHsv(hex: string): HSV | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return null;
  let x = m[1]; if (x.length === 3) x = x.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
const SCENE: { d: string; fill: string }[] = [
  { d: "M0 0H240V150H0Z", fill: "#8ec9e8" },
  { d: "M0 95 L60 45 L110 90 L160 35 L240 100 V150 H0Z", fill: "#4f7d63" },
  { d: "M0 120 Q120 90 240 125 V150 H0Z", fill: "#2f5243" },
  { d: "M180 30 a18 18 0 1 0 0.1 0Z", fill: "#f6c445" },
  { d: "M20 112 h26 v-22 l-13 -12 l-13 12Z", fill: "#d9534f" },
  { d: "M30 112 h8 v-10 h-8Z", fill: "#6b3a26" },
];
type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

export function ColorPickerDemo() {
  const [hsv, setHsv] = useState<HSV>({ h: 168, s: 0.85, v: 0.45 });
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [recent, setRecent] = useState(["#0f6e68", "#b4651a", "#d9534f", "#f6c445"]);
  const [dropper, setDropper] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);
  const sq = useRef<HTMLDivElement>(null);
  const hue = useRef<HTMLDivElement>(null);
  const dragging = useRef<"sq" | "hue" | null>(null);
  const hex = rgbToHex(...hsvToRgb(hsv));
  const remember = (h: string) => setRecent((r) => [h, ...r.filter((x) => x !== h)].slice(0, 8));
  const setHex = (h: string) => { const v = hexToHsv(h); if (v) { setHsv(v); remember(rgbToHex(...hsvToRgb(v))); } };

  const fromSq = (e: React.PointerEvent) => {
    const r = sq.current!.getBoundingClientRect();
    setHsv((p) => ({ ...p, s: clamp((e.clientX - r.left) / r.width, 0, 1), v: 1 - clamp((e.clientY - r.top) / r.height, 0, 1) }));
  };
  const fromHue = (e: React.PointerEvent) => {
    const r = hue.current!.getBoundingClientRect();
    setHsv((p) => ({ ...p, h: clamp((e.clientX - r.left) / r.width, 0, 1) * 359 }));
  };
  const start = (which: "sq" | "hue") => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.focus();
    dragging.current = which; (which === "sq" ? fromSq : fromHue)(e);
  };
  const move = (e: React.PointerEvent) => { if (dragging.current === "sq") fromSq(e); else if (dragging.current === "hue") fromHue(e); };
  const end = () => { if (dragging.current) { dragging.current = null; remember(hex); } };
  const sqKey = (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? 0.1 : 0.02;
    const m: Record<string, Partial<HSV>> = { ArrowLeft: { s: hsv.s - d }, ArrowRight: { s: hsv.s + d }, ArrowUp: { v: hsv.v + d }, ArrowDown: { v: hsv.v - d } };
    if (m[e.key]) { e.preventDefault(); setHsv({ ...hsv, ...Object.fromEntries(Object.entries(m[e.key]).map(([k, v]) => [k, clamp(v as number, 0, 1)])) }); }
  };
  const hueKey = (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? 30 : 5;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setHsv({ ...hsv, h: clamp(hsv.h - d, 0, 359) }); }
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setHsv({ ...hsv, h: clamp(hsv.h + d, 0, 359) }); }
  };
  const ED = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;

  return (
    <div className="demo-stage">
      <div className="inp-color">
        <div className="inp-color-main">
          <div ref={sq} className="inp-sv" style={{ background: `hsl(${hsv.h} 100% 50%)` }} tabIndex={0} role="slider"
            aria-label="채도와 밝기" aria-valuetext={`채도 ${Math.round(hsv.s * 100)}%, 밝기 ${Math.round(hsv.v * 100)}%`}
            onPointerDown={start("sq")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={sqKey}>
            <span className="inp-sv-knob" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
          </div>
          <div ref={hue} className="inp-hue" tabIndex={0} role="slider" aria-label="색상" aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(hsv.h)}
            onPointerDown={start("hue")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={hueKey}>
            <span className="inp-hue-knob" style={{ left: `${(hsv.h / 359) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }} />
          </div>
          <div className="row">
            <span className="inp-swatch big" style={{ background: hex }} aria-hidden />
            <input className="inp-field mono inp-hex" aria-label="HEX 색 코드" value={hexDraft ?? hex} spellCheck={false}
              onChange={(e) => setHexDraft(e.target.value)} onBlur={() => { if (hexDraft !== null) setHex(hexDraft); setHexDraft(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && hexDraft !== null) { setHex(hexDraft); setHexDraft(null); } }} />
          </div>
          <div className="inp-swatches" role="group" aria-label="최근 색 (스와치)">
            {recent.map((c) => <button type="button" key={c} className="inp-swatch" style={{ background: c }} aria-label={`최근 색 ${c}`} title={c} onClick={() => setHex(c)} />)}
          </div>
        </div>
        <div className="inp-color-side">
          <div className="row">
            <button type="button" className={`btn small ${dropper ? "primary" : ""}`} aria-pressed={dropper} onClick={() => { setDropper(!dropper); setPeek(null); }}>💧 스포이드</button>
            {peek && <span className="inp-swatch" style={{ background: peek }} aria-hidden />}
          </div>
          <svg viewBox="0 0 240 150" className={`inp-scene ${dropper ? "dropping" : ""}`} role="img" aria-label="색을 찍어 볼 그림"
            onPointerMove={(e) => { if (dropper) setPeek((e.target as SVGElement).getAttribute("fill")); }}
            onPointerLeave={() => setPeek(null)}
            onClick={(e) => { const f = (e.target as SVGElement).getAttribute("fill"); if (dropper && f) { setHex(f); setDropper(false); setPeek(null); } }}>
            {SCENE.map((p, i) => <path key={i} d={p.d} fill={p.fill} />)}
          </svg>
          {ED && <button type="button" className="link" onClick={() => { new ED().open().then((r) => setHex(r.sRGBHex)).catch(() => {}); }}>화면 아무 곳에서 찍기</button>}
        </div>
      </div>
      <span className="muted">사각형에서 채도·밝기를, 무지개 막대에서 색상을 끌어 고릅니다. '스포이드'를 켜고 오른쪽 그림을 누르면 그 색을 가져오고, 쓴 색은 아래 스와치에 쌓입니다.</span>
    </div>
  );
}

/* ───────────── 파일 드롭 영역 ───────────── */
type DropFile = { id: number; name: string; size: number; type: string };
const fmtSize = (n: number) => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
const fileIcon = (t: string) => t.startsWith("image/") ? "🖼️" : t.startsWith("video/") ? "🎞️" : t.startsWith("audio/") ? "🎵" : t.includes("pdf") ? "📕" : t.startsWith("text/") ? "📄" : "📦";

export function FileDropzoneDemo() {
  const [files, setFiles] = useState<DropFile[]>([]);
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const nextId = useRef(1);
  const picker = useRef<HTMLInputElement>(null);
  const add = (list: FileList | null) => {
    if (!list || !list.length) return;
    const got = Array.from(list).map((f) => ({ id: nextId.current++, name: f.name || "붙여넣은 파일", size: f.size, type: f.type }));
    setFiles((prev) => [...got, ...prev].slice(0, 8));
  };
  return (
    <div className="demo-stage">
      <div className={`inp-drop ${over ? "over" : ""}`} role="button" tabIndex={0} aria-label="파일 고르기 또는 끌어다 놓기"
        onClick={() => picker.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); picker.current?.click(); } }}
        onDragEnter={(e) => { e.preventDefault(); depth.current++; setOver(true); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
        onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
        onDrop={(e) => { e.preventDefault(); depth.current = 0; setOver(false); add(e.dataTransfer.files); }}
        onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); add(e.clipboardData.files); } }}>
        <span className="inp-drop-icon" aria-hidden>{over ? "📥" : "☁️"}</span>
        <b>{over ? "여기에 놓으세요" : "파일을 여기로 끌어다 놓으세요"}</b>
        <span className="muted">또는 눌러서 고르기 · 이 칸을 고른 뒤 붙여넣기(⌘/Ctrl+V)</span>
        <input ref={picker} type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </div>
      {files.length > 0 && (
        <ul className="inp-file-list">
          {files.map((f) => (
            <li key={f.id}>
              <span aria-hidden>{fileIcon(f.type)}</span>
              <span className="inp-file-name" title={f.name}>{f.name}</span>
              <span className="muted tabular">{fmtSize(f.size)}</span>
              <button type="button" className="inp-token-x" aria-label={`${f.name} 목록에서 빼기`} onClick={() => setFiles(files.filter((x) => x.id !== f.id))}>×</button>
            </li>
          ))}
        </ul>
      )}
      <span className="muted">컴퓨터의 파일을 점선 상자 위로 끌고 와 보세요. 들어오는 순간 테두리가 강조되고, 놓으면 이름과 크기가 목록에 붙습니다. 실제로 올리지는 않습니다.</span>
    </div>
  );
}

/* ───────────── 입력 마스크 ───────────── */
type Mask = { label: string; template: string; max: number; format: (d: string) => string; mode: "numeric" };
const MASKS: Mask[] = [
  { label: "휴대폰 번호", template: "010-0000-0000", max: 11, mode: "numeric",
    format: (d) => d.length <= 3 ? d : d.length <= 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` },
  { label: "카드 번호", template: "0000 0000 0000 0000", max: 16, mode: "numeric",
    format: (d) => (d.match(/.{1,4}/g) ?? []).join(" ") },
  { label: "생년월일", template: "YYYY.MM.DD", max: 8, mode: "numeric",
    format: (d) => d.length <= 4 ? d : d.length <= 6 ? `${d.slice(0, 4)}.${d.slice(4)}` : `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}` },
];
function MaskedField({ mask, on }: { mask: Mask; on: boolean }) {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caret.current !== null && ref.current) { ref.current.setSelectionRange(caret.current, caret.current); caret.current = null; }
  });
  const placeAfterDigits = (formatted: string, n: number) => {
    if (n === 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) if (/\d/.test(formatted[i]) && ++seen === n) return i + 1;
    return formatted.length;
  };
  const apply = (raw: string, caretPos: number) => {
    const before = raw.slice(0, caretPos).replace(/\D/g, "").length;
    const digits = raw.replace(/\D/g, "").slice(0, mask.max);
    const f = mask.format(digits);
    setVal(f); caret.current = placeAfterDigits(f, Math.min(before, digits.length));
  };
  const digits = val.replace(/\D/g, "");
  const id = `inp-mask-${mask.max}`;
  return (
    <div className="stack inp-mask">
      <label className="inp-label" htmlFor={id}>{mask.label}</label>
      <div className="inp-mask-box">
        {on && <span className="inp-mask-ghost mono" aria-hidden><span className="inp-hide">{val}</span>{mask.template.slice(val.length)}</span>}
        <input id={id} ref={ref} className="inp-field mono" inputMode={mask.mode} autoComplete="off" value={val}
          placeholder={on ? undefined : mask.template}
          onChange={(e) => { if (on) apply(e.target.value, e.target.selectionStart ?? e.target.value.length); else setVal(e.target.value); }}
          onKeyDown={(e) => {
            if (!on || e.key !== "Backspace") return;
            const el = e.currentTarget, s = el.selectionStart ?? 0;
            if (s !== el.selectionEnd || s === 0 || /\d/.test(val[s - 1])) return;
            // 커서 바로 앞이 하이픈·공백 같은 기호면, 그 앞 숫자를 지운다 (기호에 막혀 멈추지 않게)
            e.preventDefault();
            let k = s - 1; while (k > 0 && !/\d/.test(val[k - 1])) k--;
            if (k === 0) return;
            apply(val.slice(0, k - 1) + val.slice(k), k - 1);
          }} />
      </div>
      <span className="muted inp-small">저장되는 값: <span className="mono">{on ? (digits || "—") : (val || "—")}</span></span>
    </div>
  );
}
export function MaskedInputDemo() {
  const [on, setOn] = useState(true);
  return (
    <div className="demo-stage">
      <label className="inp-check"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> 마스크 켜기</label>
      <div className="inp-mask-grid" key={String(on)}>
        {MASKS.map((m) => <MaskedField key={m.label} mask={m} on={on} />)}
      </div>
      <span className="muted">숫자만 쳐 보세요. 하이픈·띄어쓰기·점이 저절로 들어가고, 남은 자리는 흐리게 보입니다. 중간에서 지우거나 붙여넣어도 커서가 제자리에 있습니다. 마스크를 끄면 아무 형식이나 들어갑니다.</span>
    </div>
  );
}

/* ───────────── 자동 저장 ───────────── */
export function AutosaveDemo() {
  const [text, setText] = useState("다음 주 여행 준비물: 우산, 보조 배터리");
  const [status, setStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [fail, setFail] = useState(false);
  const [counts, setCounts] = useState({ keys: 0, saves: 0 });
  const t1 = useRef<number | undefined>(undefined);
  const t2 = useRef<number | undefined>(undefined);
  const failRef = useRef(fail); failRef.current = fail;
  useEffect(() => () => { window.clearTimeout(t1.current); window.clearTimeout(t2.current); }, []);
  useEffect(() => {
    if (status !== "saved") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);
  const save = () => {
    setStatus("saving");
    window.clearTimeout(t2.current);
    t2.current = window.setTimeout(() => {
      setCounts((c) => ({ ...c, saves: c.saves + 1 }));
      if (failRef.current) setStatus("error");
      else { setStatus("saved"); setSavedAt(Date.now()); setNow(Date.now()); }
    }, 700);
  };
  const change = (v: string) => {
    setText(v); setStatus("dirty"); setCounts((c) => ({ ...c, keys: c.keys + 1 }));
    window.clearTimeout(t1.current); window.clearTimeout(t2.current);
    t1.current = window.setTimeout(save, 800);
  };
  const ago = (() => { const s = Math.floor((now - savedAt) / 1000); return s < 5 ? "방금" : s < 60 ? `${s}초 전` : `${Math.floor(s / 60)}분 전`; })();
  return (
    <div className="demo-stage">
      <div className="inp-card stack">
        <div className="row inp-doc-head">
          <b className="inp-grow">메모</b>
          <span className={`inp-save ${status}`} role="status" aria-live="polite">
            {status === "idle" && "모든 변경 사항이 저장됨"}
            {status === "dirty" && "입력 중…"}
            {status === "saving" && <><span className="inp-spin" aria-hidden /> 저장 중…</>}
            {status === "saved" && <>✓ 저장됨 · {ago}</>}
            {status === "error" && <>⚠ 저장하지 못했습니다 <button type="button" className="link" onClick={save}>다시 시도</button></>}
          </span>
        </div>
        <textarea className="inp-field inp-area" rows={3} value={text} aria-label="메모 내용" onChange={(e) => change(e.target.value)} />
      </div>
      <div className="row">
        <label className="inp-check"><input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} /> 서버 저장이 실패한다고 가정</label>
        <span className="muted tabular inp-small">글자 입력 {counts.keys}번 → 저장 {counts.saves}번</span>
      </div>
      <span className="muted">저장 버튼이 없습니다. 아무거나 쳐 보세요. 입력을 0.8초 멈추면 '저장 중…' 다음 '저장됨 · 방금' 이 뜹니다. 실패를 켜면 눈에 띄게 알리고 다시 시도하게 합니다.</span>
    </div>
  );
}

/* ───────────── 실행 취소·다시 실행 ───────────── */
type Hist = { text: string; label: string };
export function UndoRedoDemo() {
  const [hist, setHist] = useState<Hist[]>([{ text: "오늘 할 일", label: "처음 상태" }]);
  const [idx, setIdx] = useState(0);
  const [group, setGroup] = useState(true);
  const last = useRef({ at: 0, kind: "" });
  const text = hist[idx].text;
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const push = (h: Hist, merge: boolean) => {
    if (merge) { setHist([...hist.slice(0, idx), h]); return; }
    const next = [...hist.slice(0, idx + 1), h].slice(-30);
    setHist(next); setIdx(next.length - 1);
  };
  const change = (v: string) => {
    const kind = v.length >= text.length ? "type" : "del";
    const now = Date.now();
    const merge = group && idx > 0 && idx === hist.length - 1 && last.current.kind === kind && now - last.current.at < 1200;
    last.current = { at: now, kind };
    const label = kind === "type" ? `입력 "…${v.slice(-8)}"` : "글자 지움";
    push({ text: v, label }, merge);
  };
  const action = (v: string, label: string) => { last.current = { at: 0, kind: "" }; push({ text: v, label }, false); };
  const undo = () => { last.current = { at: 0, kind: "" }; setIdx((i) => Math.max(0, i - 1)); };
  const redo = () => { last.current = { at: 0, kind: "" }; setIdx((i) => Math.min(hist.length - 1, i + 1)); };
  const onKey = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
  };
  const mod = isMac ? "⌘" : "Ctrl+";
  return (
    <div className="demo-stage" onKeyDown={onKey}>
      <input className="inp-field" aria-label="할 일 메모" value={text} onChange={(e) => change(e.target.value)} />
      <div className="row">
        <button type="button" className="btn small" onClick={undo} disabled={idx === 0} aria-keyshortcuts="Control+Z Meta+Z">↶ 실행 취소 <kbd className="inp-kbd">{mod}Z</kbd></button>
        <button type="button" className="btn small" onClick={redo} disabled={idx === hist.length - 1} aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z">↷ 다시 실행 <kbd className="inp-kbd">{isMac ? "⇧⌘Z" : "Ctrl+Shift+Z"}</kbd></button>
        <button type="button" className="btn small" onClick={() => action(text + " 🎉", "이모지 추가")}>🎉 추가</button>
        <button type="button" className="btn small" onClick={() => action("", "모두 지우기")} disabled={!text}>모두 지우기</button>
      </div>
      <label className="inp-check"><input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} /> 연속 타이핑을 한 묶음으로 (끄면 글자마다 기록)</label>
      <div className="inp-hist" aria-label="기록 스택">
        <div className="inp-hist-head"><span>기록 스택</span><span className="muted tabular">{idx + 1} / {hist.length}</span></div>
        <ol className="inp-hist-list">
          {hist.map((h, i) => ({ h, i })).reverse().map(({ h, i }) => (
            <li key={i}>
              <button type="button" className={`inp-hist-item ${i === idx ? "cur" : ""} ${i > idx ? "future" : ""}`} onClick={() => { last.current = { at: 0, kind: "" }; setIdx(i); }}>
                <span className="inp-hist-dot" aria-hidden>{i === idx ? "▶" : i > idx ? "↷" : "•"}</span>{h.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <span className="muted">글을 고치고 {mod}Z 로 되돌리거나 {isMac ? "⇧⌘Z" : "Ctrl+Shift+Z"} 로 다시 해 보세요. 되돌린 뒤 새로 입력하면 흐린 '다시 실행' 기록이 사라집니다. 기록을 눌러 그 시점으로 바로 갈 수도 있습니다.</span>
    </div>
  );
}

/* ───────────── 멀티 커서 ───────────── */
type Sel = { a: number; h: number };
const MC_TEXT = 'let color = "red";\npaint(color);\nlog("색: " + color);';
const isWord = (c: string | undefined) => !!c && /[\w가-힣]/.test(c);
function editAll(text: string, sels: Sel[], fn: (from: number, to: number) => { from: number; to: number; ins: string }) {
  const sorted = sels.map((s) => ({ from: Math.min(s.a, s.h), to: Math.max(s.a, s.h) })).sort((x, y) => x.from - y.from);
  let out = "", last = 0;
  const res: Sel[] = [];
  for (const s of sorted) {
    const r = fn(s.from, s.to);
    const f = clamp(Math.max(r.from, last), 0, text.length), t = clamp(Math.max(r.to, f), 0, text.length);
    out += text.slice(last, f) + r.ins; last = t;
    if (!res.some((x) => x.a === out.length)) res.push({ a: out.length, h: out.length });
  }
  out += text.slice(last);
  return { text: out, sels: res };
}

export function MultiCursorDemo() {
  const [text, setText] = useState(MC_TEXT);
  const [sels, setSels] = useState<Sel[]>([{ a: 6, h: 6 }]);
  const [focused, setFocused] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [note, setNote] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  const insert = (s: string) => {
    if (!s) return;
    const r = editAll(text, sels, (from, to) => ({ from, to, ins: s }));
    setText(r.text); setSels(r.sels); setNote("");
  };
  const backspace = (fwd: boolean) => {
    const r = editAll(text, sels, (from, to) => from !== to ? { from, to, ins: "" } : fwd ? { from, to: to + 1, ins: "" } : { from: from - 1, to, ins: "" });
    setText(r.text); setSels(r.sels);
  };
  const moveAll = (d: number) => {
    const out: Sel[] = [];
    for (const s of sels) {
      const p = s.a === s.h ? clamp(s.h + d, 0, text.length) : d < 0 ? Math.min(s.a, s.h) : Math.max(s.a, s.h);
      if (!out.some((x) => x.h === p)) out.push({ a: p, h: p });
    }
    setSels(out);
  };
  const nextMatch = () => {
    const prim = sels[sels.length - 1];
    const from = Math.min(prim.a, prim.h), to = Math.max(prim.a, prim.h);
    if (from === to) {
      const words = sels.map((s) => {
        let a = s.h, b = s.h;
        while (isWord(text[a - 1])) a--;
        while (isWord(text[b])) b++;
        return { a, h: b };
      }).filter((s) => s.a !== s.h);
      if (words.length) { setSels(words); setNote(`'${text.slice(words[0].a, words[0].h)}' 선택`); }
      return;
    }
    const word = text.slice(from, to);
    const taken = (i: number) => sels.some((s) => Math.min(s.a, s.h) === i);
    let i = text.indexOf(word, to);
    if (i < 0 || taken(i)) i = text.indexOf(word);
    while (i >= 0 && taken(i)) { i = text.indexOf(word, i + 1); }
    if (i < 0) { setNote(`'${word}' 은(는) 더 없습니다`); return; }
    setSels([...sels, { a: i, h: i + word.length }]);
    setNote(`'${word}' ${sels.length + 1}곳 선택`);
  };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (composing.current || e.nativeEvent.isComposing) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); nextMatch(); }
    else if (e.key === "Escape") { e.preventDefault(); setSels([sels[sels.length - 1]]); setNote(""); }
    else if (e.key === "Backspace") { e.preventDefault(); backspace(false); }
    else if (e.key === "Delete") { e.preventDefault(); backspace(true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); moveAll(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); moveAll(1); }
    else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Home" || e.key === "End") e.preventDefault();
    else if (e.key === "Enter") { e.preventDefault(); insert("\n"); }
  };
  const flush = () => { const el = ta.current; if (!el) return; const v = el.value; el.value = ""; insert(v); };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    ta.current?.focus();
    const el = (e.target as HTMLElement).closest("[data-off]") as HTMLElement | null;
    if (!el) return;
    let p = Number(el.dataset.off);
    if (el.dataset.ch) { const r = el.getBoundingClientRect(); if (e.clientX > r.left + r.width / 2) p++; }
    if (e.altKey || addMode) {
      const exists = sels.findIndex((s) => s.a === p && s.h === p);
      if (exists >= 0 && sels.length > 1) setSels(sels.filter((_, i) => i !== exists));
      else if (exists < 0) setSels([...sels, { a: p, h: p }]);
    } else setSels([{ a: p, h: p }]);
    setNote("");
  };

  const lines = text.split("\n");
  const inSel = (p: number) => sels.some((s) => p >= Math.min(s.a, s.h) && p < Math.max(s.a, s.h));
  const caretAt = (p: number) => sels.some((s) => s.h === p);
  let off = 0;
  return (
    <div className="demo-stage">
      <div className={`inp-mc ${focused ? "focus" : ""}`} onPointerDown={onPointerDown} onMouseDown={(e) => e.preventDefault()}>
        <textarea ref={ta} className="inp-mc-ta" aria-label="멀티 커서 편집기" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={onKey}
          onInput={(e) => { if (!composing.current && !(e.nativeEvent as InputEvent).isComposing) flush(); }}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; flush(); }} />
        {lines.map((line, li) => {
          const start = off; off += line.length + 1;
          return (
            <div key={li} className="inp-mc-line">
              <span className="inp-mc-ln" aria-hidden>{li + 1}</span>
              <span className="inp-mc-code">
                {line.split("").map((ch, k) => {
                  const p = start + k;
                  return <Fragment key={p}>{caretAt(p) && <span className="inp-mc-caret" />}<span data-off={p} data-ch="1" className={inSel(p) ? "inp-mc-sel" : undefined}>{ch}</span></Fragment>;
                })}
                {caretAt(start + line.length) && <span className="inp-mc-caret" />}
                <span className="inp-mc-fill" data-off={start + line.length} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="row">
        <button type="button" className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={() => { nextMatch(); ta.current?.focus(); }}>다음 같은 단어 <kbd className="inp-kbd">{isMac ? "⌘D" : "Ctrl+D"}</kbd></button>
        <button type="button" className={`btn small ${addMode ? "primary" : ""}`} aria-pressed={addMode} onClick={() => setAddMode(!addMode)}>+ 커서 추가 모드</button>
        <button type="button" className="btn small" onClick={() => { setText(MC_TEXT); setSels([{ a: 6, h: 6 }]); setNote(""); }}>처음으로</button>
      </div>
      <span className="muted tabular inp-small">커서 {sels.length}개{note && ` · ${note}`}</span>
      <span className="muted">편집기를 누르고 {isMac ? "⌘D" : "Ctrl+D"} 를 세 번 눌러 'color' 를 모두 고른 뒤 'shade' 처럼 바꿔 쳐 보세요. Alt(Option)+클릭으로 아무 곳에나 커서를 더할 수 있고, Esc 는 커서를 하나로 돌립니다.</span>
    </div>
  );
}

/* ───────────── 찾기·바꾸기 ───────────── */
const FR_TEXT = "고양이는 상자를 좋아한다. 큰 상자든 작은 상자든 고양이는 일단 들어가 본다. Cat 은 영어로 고양이, cat 처럼 소문자로 써도 같다. 상자 속 고양이가 제일 편해 보인다.";
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function FindReplaceDemo() {
  const [text, setText] = useState(FR_TEXT);
  const [find, setFind] = useState("상자");
  const [rep, setRep] = useState("박스");
  const [cs, setCs] = useState(false);
  const [word, setWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const [cur, setCur] = useState(0);
  const [msg, setMsg] = useState("");
  const built = useMemo(() => {
    if (!find) return { re: null as RegExp | null, err: "" };
    try {
      let src = regex ? find : escapeRe(find);
      if (word) src = `(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`;
      return { re: new RegExp(src, `gu${cs ? "" : "i"}`), err: "" };
    } catch { return { re: null, err: "정규식이 올바르지 않습니다" }; }
  }, [find, cs, word, regex]);
  const matches = useMemo(() => {
    const out: { i: number; len: number }[] = [];
    if (!built.re) return out;
    for (const m of text.matchAll(built.re)) { if (m[0].length === 0) continue; out.push({ i: m.index ?? 0, len: m[0].length }); if (out.length > 500) break; }
    return out;
  }, [text, built]);
  const c = matches.length ? clamp(cur, 0, matches.length - 1) : 0;
  const step = (d: number) => { if (matches.length) setCur((c + d + matches.length) % matches.length); setMsg(""); };
  const repText = (m: string) => regex && built.re ? m.replace(new RegExp(built.re.source, built.re.flags.replace("g", "")), rep) : rep;
  const replaceOne = () => {
    const m = matches[c]; if (!m) return;
    setText(text.slice(0, m.i) + repText(text.slice(m.i, m.i + m.len)) + text.slice(m.i + m.len));
    setMsg("1개 바꿈");
  };
  const replaceAll = () => {
    if (!built.re || !matches.length) return;
    const n = matches.length;
    setText(text.replace(built.re, (m) => repText(m))); setCur(0);
    setMsg(`${n}개 모두 바꿈`);
  };
  const parts: React.ReactNode[] = [];
  let last = 0;
  matches.forEach((m, k) => {
    parts.push(text.slice(last, m.i));
    parts.push(<mark key={k} className={`inp-fr-hit ${k === c ? "cur" : ""}`}>{text.slice(m.i, m.i + m.len)}</mark>);
    last = m.i + m.len;
  });
  parts.push(text.slice(last));
  const opt = (on: boolean, set: (v: boolean) => void, label: string, title: string) => (
    <button type="button" className={`inp-fr-opt ${on ? "on" : ""}`} aria-pressed={on} title={title} aria-label={title} onClick={() => { set(!on); setCur(0); }}>{label}</button>
  );
  return (
    <div className="demo-stage">
      <div className="inp-fr-bar">
        <div className="inp-fr-line">
          <input className="inp-field inp-fr-input" aria-label="찾을 말" placeholder="찾기" value={find}
            onChange={(e) => { setFind(e.target.value); setCur(0); setMsg(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1); } if (e.key === "Escape") setFind(""); }} />
          {opt(cs, setCs, "Aa", "대소문자 구분")}
          {opt(word, setWord, "단어", "단어 단위로")}
          {opt(regex, setRegex, ".*", "정규식")}
        </div>
        <div className="inp-fr-line">
          <span className={`inp-fr-count tabular ${built.err || (find && !matches.length) ? "none" : ""}`} aria-live="polite">
            {built.err || (find ? (matches.length ? `${c + 1} / ${matches.length}` : "결과 없음") : "—")}
          </span>
          <button type="button" className="btn small" aria-label="이전 결과" onClick={() => step(-1)} disabled={!matches.length}>↑</button>
          <button type="button" className="btn small" aria-label="다음 결과" onClick={() => step(1)} disabled={!matches.length}>↓</button>
        </div>
        <div className="inp-fr-line">
          <input className="inp-field inp-fr-input" aria-label="바꿀 말" placeholder="바꾸기" value={rep} onChange={(e) => setRep(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); replaceOne(); } }} />
          <button type="button" className="btn small" onClick={replaceOne} disabled={!matches.length}>바꾸기</button>
          <button type="button" className="btn small" onClick={replaceAll} disabled={!matches.length}>모두</button>
        </div>
      </div>
      <p className="inp-fr-doc">{parts}</p>
      <div className="row">
        <button type="button" className="btn small" onClick={() => { setText(FR_TEXT); setMsg(""); setCur(0); }} disabled={text === FR_TEXT}>원래 글로</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <span className="muted">찾기 칸에 치는 대로 바로 강조됩니다(증분 검색). Enter 로 다음, Shift+Enter 로 이전 결과. 'cat' 을 찾고 Aa 를 켜 보거나, '고양이'를 찾고 '단어'를 켜면 '고양이는'처럼 붙은 것은 빠지고 따로 쓴 것만 남습니다.</span>
    </div>
  );
}

/* ───────────── 리치 텍스트 편집기 ───────────── */
const RT_INITIAL = "<h3>주간 회의 메모</h3><p>이번 주에는 <b>디자인 시안</b>을 확정하고 <i>사용성 테스트</i> 일정을 잡습니다.</p><ul><li>시안 세 가지 비교</li><li>테스터 다섯 명 모집</li></ul><p>빈 줄에서 / 를 쳐 보세요.</p>";
const SLASH = [
  { label: "제목", icon: "H", run: () => document.execCommand("formatBlock", false, "<h3>") },
  { label: "본문", icon: "¶", run: () => document.execCommand("formatBlock", false, "<p>") },
  { label: "글머리 목록", icon: "•", run: () => document.execCommand("insertUnorderedList") },
  { label: "인용", icon: "❝", run: () => document.execCommand("formatBlock", false, "<blockquote>") },
];

export function RichTextDemo() {
  const ed = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"edit" | "src">("edit");
  const [html, setHtml] = useState(RT_INITIAL);
  const [act, setAct] = useState({ b: false, i: false, u: false, h: false, ul: false });
  const [slash, setSlash] = useState<{ top: number; left: number } | null>(null);
  const [si, setSi] = useState(0);

  useLayoutEffect(() => {
    if (ed.current) ed.current.innerHTML = RT_INITIAL;
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* 지원 안 하면 무시 */ }
  }, []);
  const inside = () => { const s = document.getSelection(); return !!s && !!s.anchorNode && !!ed.current?.contains(s.anchorNode); };
  const refresh = () => {
    if (!inside()) return;
    const fb = String(document.queryCommandValue("formatBlock")).toLowerCase();
    setAct({ b: document.queryCommandState("bold"), i: document.queryCommandState("italic"), u: document.queryCommandState("underline"), h: fb === "h3", ul: document.queryCommandState("insertUnorderedList") });
  };
  useEffect(() => {
    const on = () => refresh();
    document.addEventListener("selectionchange", on);
    return () => document.removeEventListener("selectionchange", on);
  }, []);
  const sync = () => { if (ed.current) setHtml(ed.current.innerHTML); refresh(); };
  const blockOf = (): Node | null => {
    const s = document.getSelection(); let n: Node | null = s?.anchorNode ?? null;
    while (n && n.parentNode !== ed.current) n = n.parentNode;
    if (n && n.nodeName === "UL") { n = s?.anchorNode ?? null; while (n && n.nodeName !== "LI") n = n.parentNode; }
    return n;
  };
  const checkSlash = () => {
    const b = blockOf();
    if (b && b.textContent === "/") {
      const s = document.getSelection()!;
      const r = s.getRangeAt(0).getBoundingClientRect();
      const o = box.current!.getBoundingClientRect();
      setSlash({ top: r.bottom - o.top + 4, left: clamp(r.left - o.left, 0, Math.max(0, o.width - 170)) }); setSi(0);
    } else setSlash(null);
  };
  const exec = (cmd: string, val?: string) => { ed.current?.focus(); document.execCommand(cmd, false, val); sync(); };
  const pickSlash = (k: number) => {
    const b = blockOf();
    const s = document.getSelection()!;
    if (b && SLASH[k].label === "글머리 목록" && b.nodeName !== "LI") {
      // 빈 문단에 바로 목록을 넣으면 <p><ul> 처럼 겹치는 브라우저가 있어 직접 바꿔 끼운다
      const ul = document.createElement("ul"), li = document.createElement("li");
      li.appendChild(document.createElement("br")); ul.appendChild(li);
      if (b.nodeType === Node.TEXT_NODE) b.parentNode!.replaceChild(ul, b); else (b as Element).replaceWith(ul);
      const r = document.createRange(); r.setStart(li, 0); r.collapse(true); s.removeAllRanges(); s.addRange(r);
      setSlash(null); sync(); return;
    }
    if (b) {
      const r = document.createRange(); r.selectNodeContents(b);
      s.removeAllRanges(); s.addRange(r); document.execCommand("delete");
    }
    SLASH[k].run(); setSlash(null); sync();
  };
  const tool = (on: boolean, label: React.ReactNode, aria: string, fn: () => void, cls = "") => (
    <button type="button" className={`inp-rt-btn ${on ? "on" : ""} ${cls}`} aria-pressed={on} aria-label={aria} title={aria}
      onMouseDown={(e) => e.preventDefault()} onClick={fn}>{label}</button>
  );
  const pretty = html.replace(/(<\/(h3|p|ul|li|blockquote|div)>)/g, "$1\n").replace(/(<ul>)/g, "$1\n");
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="보기">
          <button type="button" role="radio" aria-checked={view === "edit"} className={view === "edit" ? "on" : ""} onClick={() => setView("edit")}>보이는 대로</button>
          <button type="button" role="radio" aria-checked={view === "src"} className={view === "src" ? "on" : ""} onClick={() => setView("src")}>속 마크업</button>
        </div>
      </div>
      <div className="inp-rt" ref={box} hidden={view !== "edit"}>
        <div className="inp-rt-bar" role="toolbar" aria-label="서식">
          {tool(act.b, <b>B</b>, "굵게 (Ctrl+B)", () => exec("bold"))}
          {tool(act.i, <i>I</i>, "기울임 (Ctrl+I)", () => exec("italic"))}
          {tool(act.u, <u>U</u>, "밑줄 (Ctrl+U)", () => exec("underline"))}
          <span className="inp-rt-sep" />
          {tool(act.h, "제목", "제목", () => exec("formatBlock", act.h ? "<p>" : "<h3>"), "wide")}
          {tool(act.ul, "• 목록", "글머리 목록", () => exec("insertUnorderedList"), "wide")}
        </div>
        <div ref={ed} className="inp-rt-ed" contentEditable suppressContentEditableWarning role="textbox" aria-multiline aria-label="리치 텍스트 편집기"
          onInput={() => { sync(); checkSlash(); }} onBlur={() => setSlash(null)} onKeyUp={(e) => { if (!slash || e.key.startsWith("Arrow")) return; checkSlash(); }}
          onKeyDown={(e) => {
            if (!slash) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setSi((si + 1) % SLASH.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSi((si - 1 + SLASH.length) % SLASH.length); }
            else if (e.key === "Enter") { e.preventDefault(); pickSlash(si); }
            else if (e.key === "Escape") { e.preventDefault(); setSlash(null); }
          }} />
        {slash && (
          <ul className="inp-rt-slash" role="listbox" aria-label="블록 고르기" style={{ top: slash.top, left: slash.left }}>
            {SLASH.map((s, k) => (
              <li key={s.label} role="option" aria-selected={k === si} className={k === si ? "on" : ""}
                onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setSi(k)} onClick={() => pickSlash(k)}>
                <span className="inp-rt-ico" aria-hidden>{s.icon}</span>{s.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {view === "src" && <pre className="inp-rt-src mono">{pretty}</pre>}
      <span className="muted">글자를 골라 B · I · U 나 제목·목록 버튼을 눌러 보세요. 서식이 바로 보이는 그대로 적용됩니다. 빈 줄에서 / 를 치면 블록을 고르는 슬래시 메뉴가 뜹니다. '속 마크업'에서 실제로 저장되는 HTML 을 볼 수 있습니다.</span>
    </div>
  );
}

/* ───────────── 플레이스홀더 ───────────── */
const GHOST = ["안녕하세요, 반갑습니다.", "감사합니다. 좋은 하루 보내세요.", "내일 회의는 오후 3시입니다.", "확인했습니다."];
type Form = { name: string; phone: string; email: string };
export function PlaceholderDemo() {
  const empty: Form = { name: "", phone: "", email: "" };
  const [a, setA] = useState<Form>(empty);
  const [b, setB] = useState<Form>(empty);
  const [g, setG] = useState("");
  const fields: { k: keyof Form; label: string; hint: string }[] = [
    { k: "name", label: "이름", hint: "홍길동" },
    { k: "phone", label: "연락처", hint: "010-0000-0000" },
    { k: "email", label: "메일", hint: "name@example.com" },
  ];
  const fill = () => { const v = { name: "김하늘", phone: "010-2345-6789", email: "sky@example.com" }; setA(v); setB(v); };
  const ghost = g ? GHOST.find((s) => s.startsWith(g) && s !== g) : undefined;
  const rest = ghost ? ghost.slice(g.length) : "";
  return (
    <div className="demo-stage">
      <div className="inp-ph-grid">
        <div className="inp-ph-col">
          <span className="inp-ph-title">플레이스홀더만</span>
          {fields.map((f) => (
            <input key={f.k} className="inp-field" placeholder={f.label} aria-label={f.label} value={a[f.k]} onChange={(e) => setA({ ...a, [f.k]: e.target.value })} />
          ))}
        </div>
        <div className="inp-ph-col">
          <span className="inp-ph-title">라벨 + 플레이스홀더 (플로팅 라벨)</span>
          {fields.map((f) => (
            <div key={f.k} className="inp-float">
              <input id={`inp-float-${f.k}`} className="inp-field" placeholder={f.hint} value={b[f.k]} onChange={(e) => setB({ ...b, [f.k]: e.target.value })} />
              <label htmlFor={`inp-float-${f.k}`}>{f.label}</label>
            </div>
          ))}
        </div>
      </div>
      <div className="row">
        <button type="button" className="btn small" onClick={fill}>둘 다 채워 보기</button>
        <button type="button" className="btn small" onClick={() => { setA(empty); setB(empty); }}>비우기</button>
      </div>
      <div className="stack">
        <label className="inp-label" htmlFor="inp-ghost">고스트 텍스트 (Tab 으로 받기)</label>
        <div className="inp-ghost-box">
          <span className="inp-ghost-layer" aria-hidden><span className="inp-hide">{g}</span>{rest}</span>
          <input id="inp-ghost" className="inp-field" value={g} placeholder="‘안녕’ 이나 ‘내일’ 을 쳐 보세요" autoComplete="off"
            onChange={(e) => setG(e.target.value)}
            onKeyDown={(e) => { if ((e.key === "Tab" || (e.key === "ArrowRight" && e.currentTarget.selectionStart === g.length)) && ghost) { e.preventDefault(); setG(ghost); } }} />
        </div>
      </div>
      <span className="muted">'둘 다 채워 보기'를 누르면 왼쪽은 어느 칸이 무엇인지 알 수 없게 됩니다. 오른쪽은 입력해도 라벨이 위로 떠올라 남습니다. 아래 칸은 흐리게 미리 보여 주는 제안(고스트 텍스트)입니다.</span>
    </div>
  );
}
