import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useLater, Seg, Switch } from "./sim";
import { usePlayback } from "./load";
import { photo } from "./media";
import "./perf.css";

/* 메인 스레드를 일부러 붙잡는다 (예시용) */
function block(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) { /* 바쁘게 기다리기 */ }
}
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}초` : `${Math.round(ms)}ms`);

/* ───────── 리플로우·리페인트 ───────── */
type Change = "width" | "color" | "transform";
const STAGES = ["스타일", "레이아웃", "페인트", "합성"];
const RUNS: Record<Change, boolean[]> = { width: [true, true, true, true], color: [true, false, true, true], transform: [true, false, false, true] };
const AFFECT: Record<Change, string> = { width: "5개 (옆 상자까지 다시 배치)", color: "1개 (바뀐 상자만 다시 칠함)", transform: "0개 (그려 둔 층을 옮기기만)" };
const LAB_N = 400;

export function ReflowRepaintDemo() {
  const [wide, setWide] = useState(false);
  const [warm, setWarm] = useState(false);
  const [moved, setMoved] = useState(false);
  const [last, setLast] = useState<{ c: Change; n: number } | null>(null);
  const [thrash, setThrash] = useState<{ bad: number; good: number } | null>(null);
  const lab = useRef<HTMLDivElement>(null);
  const press = (c: Change) => {
    if (c === "width") setWide((v) => !v);
    if (c === "color") setWarm((v) => !v);
    if (c === "transform") setMoved((v) => !v);
    setLast((l) => ({ c, n: (l?.n ?? 0) + 1 }));
  };
  const measure = () => {
    const els = Array.from(lab.current?.children ?? []) as HTMLElement[];
    let sum = 0;
    // 쓰고 바로 읽기를 번갈아: 읽을 때마다 레이아웃을 새로 계산한다
    let t0 = performance.now();
    els.forEach((el, i) => { el.style.width = `${20 + ((i + 1) % 7)}px`; sum += el.offsetWidth; });
    const bad = performance.now() - t0;
    // 읽기를 먼저 모으고 쓰기를 한꺼번에: 레이아웃은 한 번
    t0 = performance.now();
    const ws = els.map((el) => el.offsetWidth);
    els.forEach((el, i) => { el.style.width = `${20 + (i % 7)}px`; });
    sum += ws.length + (els[0]?.offsetWidth ?? 0);
    const good = performance.now() - t0;
    if (sum >= 0) setThrash({ bad, good });
  };
  const runs = last ? RUNS[last.c] : null;
  return (
    <div className="demo-stage">
      <div className="row">
        <button type="button" className="btn small" onClick={() => press("width")}>너비 바꾸기</button>
        <button type="button" className="btn small" onClick={() => press("color")}>색 바꾸기</button>
        <button type="button" className="btn small" onClick={() => press("transform")}>transform 으로 옮기기</button>
      </div>
      <div className="pf-rr-row" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`pf-rr-box ${i === 1 ? "target" : ""}`}
            style={i === 1 ? { width: wide ? 96 : 48, background: warm ? "var(--warm)" : undefined, transform: moved ? "translateY(-12px)" : undefined } : undefined} />
        ))}
      </div>
      <ol className="pf-pipe" key={last?.n ?? 0} aria-label="브라우저가 다시 한 단계">
        {STAGES.map((s, i) => <li key={s} className={runs ? (runs[i] ? "on" : "skip") : ""}>{s}</li>)}
      </ol>
      <div className="sim-meter" aria-live="polite">
        {last ? <span>다시 계산한 요소: <b>{AFFECT[last.c]}</b></span> : <span className="muted">버튼을 눌러 보세요.</span>}
      </div>
      <div className="row">
        <button type="button" className="btn small" onClick={measure}>상자 {LAB_N}개 너비 고치기 (실제로 재기)</button>
      </div>
      {thrash && (
        <div className="sim-meter" aria-live="polite">
          <span className="sim-bad">쓰고 읽기 번갈아: 레이아웃 {LAB_N}번 · {thrash.bad.toFixed(1)}ms</span>
          <span className="sim-good">읽기 먼저 모아서: 1번 · {thrash.good.toFixed(1)}ms</span>
        </div>
      )}
      <div ref={lab} className="pf-rr-lab" aria-hidden="true">
        {Array.from({ length: LAB_N }, (_, i) => <span key={i} />)}
      </div>
      <span className="muted">너비는 레이아웃부터, 색은 페인트부터, transform 은 합성만 다시 합니다. 아래 버튼은 이 브라우저에서 레이아웃 스래싱을 실제로 재 봅니다.</span>
    </div>
  );
}

/* ───────── GPU 합성 ───────── */
export function GpuCompositingDemo() {
  const [run, setRun] = useState(() => !reduceMotion());
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<number | null>(null);
  const later = useLater();
  const jam = () => {
    if (busy) return;
    setBusy(true);
    later.after(80, () => { const t0 = performance.now(); block(1500); setBlocked(performance.now() - t0); setBusy(false); });
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <Switch on={run} onChange={setRun} label="움직이기" />
        <button type="button" className="btn primary" disabled={busy} onClick={jam}>{busy ? "막는 중…" : "메인 스레드 1.5초 막기"}</button>
      </div>
      <div className={`pf-gpu ${run ? "run" : ""}`} aria-hidden="true">
        <div className="pf-gpu-lane">
          <span className="pf-gpu-label"><code>left</code> 로 움직임</span>
          <div className="pf-gpu-track"><span className="pf-gpu-ball by-left" /></div>
        </div>
        <div className="pf-gpu-lane">
          <span className="pf-gpu-label"><code>transform</code> 으로 움직임</span>
          <div className="pf-gpu-track"><span className="pf-gpu-mover"><span className="pf-gpu-ball" /></span></div>
        </div>
      </div>
      <div className="sim-meter" aria-live="polite">
        {busy ? <span className="sim-bad">메인 스레드가 바쁩니다 — 위 공은 멈추고 아래 공은 계속 갑니다</span>
          : blocked ? <span>방금 {fmt(blocked)} 동안 막았습니다. 아래 공만 계속 움직였죠?</span>
          : <span className="muted">버튼을 누르는 동안 두 공을 지켜보세요.</span>}
      </div>
      <span className="muted">두 공은 같은 CSS 애니메이션이지만 위는 left, 아래는 transform 을 바꿉니다. transform 은 GPU 합성 단계에서 따로 돌아 메인 스레드가 막혀도 멈추지 않습니다.</span>
    </div>
  );
}

/* ───────── 웹 워커 ───────── */
const WORKER_SRC = `
const isPrime = (x) => { for (let d = 2; d * d <= x; d++) if (x % d === 0) return false; return true; };
self.onmessage = (e) => {
  const end = performance.now() + e.data;
  let n = 2, found = 0;
  while (performance.now() < end) { if (isPrime(n)) found++; n++; }
  self.postMessage({ found, upTo: n });
};`;
function primesFor(ms: number) {
  const end = performance.now() + ms;
  let n = 2, found = 0;
  const isPrime = (x: number) => { for (let d = 2; d * d <= x; d++) if (x % d === 0) return false; return true; };
  while (performance.now() < end) { if (isPrime(n)) found++; n++; }
  return { found, upTo: n };
}

export function WebWorkerDemo() {
  const [where, setWhere] = useState<"main" | "worker">("main");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ where: "main" | "worker"; found: number; maxGap: number } | null>(null);
  const [err, setErr] = useState(false);
  const dot = useRef<HTMLSpanElement>(null);
  const gap = useRef({ last: 0, max: 0 });
  const worker = useRef<Worker | null>(null);
  const later = useLater();
  useEffect(() => {
    let id = 0;
    const loop = () => {
      const now = performance.now(); // 프레임 시각 대신 실제 시각 (막힌 뒤 첫 프레임은 옛 시각을 받을 수 있다)
      const g = gap.current;
      if (g.last) g.max = Math.max(g.max, now - g.last);
      g.last = now;
      const p = (now / 1200) % 2, x = p < 1 ? p : 2 - p;
      if (dot.current) dot.current.style.left = `calc(${x * 100}% - ${x * 20}px)`;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); worker.current?.terminate(); };
  }, []);
  const run = () => {
    if (busy) return;
    setBusy(true); setResult(null); setErr(false);
    later.after(80, () => {
      gap.current.max = 0;
      if (where === "main") {
        const r = primesFor(1500);
        requestAnimationFrame(() => { setResult({ where: "main", found: r.found, maxGap: gap.current.max }); setBusy(false); });
        return;
      }
      try {
        const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
        const w = new Worker(url);
        worker.current = w;
        w.onmessage = (e: MessageEvent<{ found: number }>) => {
          setResult({ where: "worker", found: e.data.found, maxGap: gap.current.max });
          setBusy(false); w.terminate(); URL.revokeObjectURL(url); worker.current = null;
        };
        w.postMessage(1500);
      } catch { setErr(true); setBusy(false); }
    });
  };
  return (
    <div className="demo-stage">
      <Seg label="계산하는 곳" value={where} onChange={(v) => { if (!busy) setWhere(v); }} options={[["main", "메인 스레드에서"], ["worker", "웹 워커에서"]]} />
      <div className="pf-gpu-track pf-ww-track" aria-hidden="true"><span ref={dot} className="pf-gpu-ball pf-ww-dot" /></div>
      <input className="sim-input" placeholder="계산하는 동안 여기에 글자를 쳐 보세요" aria-label="입력해 보는 칸" />
      <button type="button" className="btn primary pf-self-start" disabled={busy} onClick={run}>{busy ? "계산 중…" : "소수 찾기 1.5초 돌리기"}</button>
      <div className="sim-meter" aria-live="polite">
        {err ? <span className="sim-bad">이 브라우저에선 워커를 만들 수 없습니다.</span>
          : result ? <>
            <span>소수 <b className="tabular">{result.found.toLocaleString("ko-KR")}개</b> 찾음</span>
            {result.maxGap > 100 ? <span className="sim-bad">화면이 {fmt(result.maxGap)} 동안 멈춤</span> : <span className="sim-good">화면 멈춤 없음 (가장 긴 프레임 {fmt(result.maxGap)})</span>}
          </>
          : <span className="muted">점이 계속 움직이는지 보면서 눌러 보세요.</span>}
      </div>
      <span className="muted">같은 계산을 메인 스레드에서 돌리면 점과 입력 칸이 함께 얼고, 웹 워커로 보내면 화면은 그대로 움직입니다.</span>
    </div>
  );
}

/* ───────── 프레임 예산 ───────── */
const BUDGET = 1000 / 60;

export function FrameBudgetDemo() {
  const [work, setWork] = useState(0);
  const workRef = useRef(0);
  workRef.current = work;
  const spike = useRef(0);
  const [stats, setStats] = useState<{ fps: number; frames: number[] }>({ fps: 0, frames: [] });
  const ball = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id = 0, last = 0, lastReport = 0, visible = true;
    const times: number[] = [], stamps: number[] = [];
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    if (box.current) io.observe(box.current);
    const loop = () => {
      const now = performance.now();
      if (last) { times.push(now - last); if (times.length > 40) times.shift(); }
      last = now;
      stamps.push(now);
      while (stamps.length && stamps[0] < now - 1000) stamps.shift();
      const p = (now / 1400) % 2, x = p < 1 ? p : 2 - p;
      if (ball.current) ball.current.style.left = `calc(${x * 100}% - ${x * 20}px)`;
      if (visible && workRef.current) block(workRef.current);
      if (visible && spike.current) { block(spike.current); spike.current = 0; }
      if (now - lastReport > 200) { lastReport = now; setStats({ fps: stamps.length, frames: [...times] }); }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); io.disconnect(); };
  }, []);
  const H = 70, MAX = 60;
  const recent = stats.frames.slice(-10);
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  return (
    <div className="demo-stage" ref={box}>
      <label className="row pf-range">
        프레임마다 더 하는 일 <b className="tabular">{work}ms</b>
        <input type="range" min={0} max={40} step={1} value={work} onChange={(e) => setWork(Number(e.target.value))} />
      </label>
      <div className="pf-gpu-track" aria-hidden="true"><span ref={ball} className="pf-gpu-ball pf-ww-dot" /></div>
      <svg className="pf-frames" viewBox={`0 0 ${40 * 8} ${H}`} role="img" aria-label="최근 40프레임의 걸린 시간 막대">
        {stats.frames.map((d, i) => {
          const h = (Math.min(d, MAX) / MAX) * H;
          return <rect key={i} x={i * 8 + 1} y={H - h} width={6} height={h} rx={1} className={d > BUDGET * 2 + 1 ? "bad" : d > BUDGET + 1.5 ? "mid" : "ok"} />;
        })}
        <line x1={0} x2={320} y1={H - (BUDGET / MAX) * H} y2={H - (BUDGET / MAX) * H} className="budget" />
        <text x={316} y={H - (BUDGET / MAX) * H - 3} textAnchor="end">16.7ms</text>
      </svg>
      <div className="row">
        <button type="button" className="btn small" onClick={() => { spike.current = 150; }}>한 번 크게 막기 (롱 태스크 150ms)</button>
      </div>
      <div className="sim-meter" aria-live="off">
        <span>지금 <b className="tabular">{stats.fps}fps</b></span>
        {avg > BUDGET * 1.25 ? <span className="sim-bad">예산 넘음 — 툭툭 끊김 (잰크)</span> : <span className="sim-good">예산 안 — 부드러움</span>}
      </div>
      <span className="muted">막대 하나가 프레임 하나입니다. 선(16.7ms)을 넘는 막대가 많을수록 공이 끊겨 움직입니다. 120Hz 화면이면 막대가 절반 높이로 나옵니다.</span>
    </div>
  );
}

/* ───────── 이벤트 위임 ───────── */
type Todo = { id: number; text: string; done: boolean; own: boolean };
const TODO_START = ["우유 사기", "빨래 개기", "메일 답장"];
const TODO_MORE = ["운동 30분", "책 반납", "화분 물 주기", "전기요금 내기"];
const mkTodos = () => TODO_START.map((text, i) => ({ id: i + 1, text, done: false, own: true }));

export function EventDelegationDemo() {
  const [mode, setMode] = useState<"each" | "deleg">("each");
  const [items, setItems] = useState<Todo[]>(mkTodos);
  const [hit, setHit] = useState<{ id: number; ok: boolean; n: number } | null>(null);
  const nid = useRef(10);
  const change = (m: "each" | "deleg") => { setMode(m); setItems(mkTodos()); setHit(null); };
  const add = () => setItems((xs) => xs.length >= TODO_START.length + TODO_MORE.length ? xs
    : [...xs, { id: nid.current++, text: TODO_MORE[xs.length - TODO_START.length], done: false, own: false }]);
  const click = (it: Todo) => {
    const ok = mode === "deleg" || it.own;
    if (ok) setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)));
    setHit((h) => ({ id: it.id, ok, n: (h?.n ?? 0) + 1 }));
  };
  const listeners = mode === "deleg" ? 1 : items.filter((i) => i.own).length;
  const hitItem = items.find((x) => x.id === hit?.id);
  return (
    <div className="demo-stage">
      <Seg label="리스너 붙이는 곳" value={mode} onChange={change} options={[["each", "항목마다"], ["deleg", "목록 하나에 (위임)"]]} />
      <div className={`pf-ed-list ${mode}`}>
        {mode === "deleg" && <span className="pf-ear list" title="목록의 리스너">👂 목록</span>}
        {mode === "deleg" && hit?.ok && <span key={hit.n} className="pf-ed-flash" aria-hidden="true" />}
        <ul className="plain-list">
          {items.map((x) => (
            <li key={x.id}>
              <button type="button" className={`pf-ed-item ${x.done ? "done" : ""} ${hit?.id === x.id ? (hit.ok ? "hit" : "miss") : ""}`} onClick={() => click(x)}>
                {mode === "each" && <span className={`pf-ear ${x.own ? "" : "none"}`} aria-label={x.own ? "리스너 있음" : "리스너 없음"}>{x.own ? "👂" : "·"}</span>}
                <span className="pf-ed-text">{x.text}</span>
                {!x.own && <span className="sim-tag">새 항목</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="row">
        <button type="button" className="btn small" onClick={add} disabled={items.length >= TODO_START.length + TODO_MORE.length}>항목 추가</button>
        <span>붙어 있는 리스너 <b className="tabular">{listeners}개</b></span>
      </div>
      <div className="sim-meter" aria-live="polite">
        {!hit || !hitItem ? <span className="muted">항목을 눌러 완료 표시를 해 보세요.</span>
          : !hit.ok ? <span className="sim-bad">'{hitItem.text}' 은 반응 없음 — 새 항목에 리스너를 안 붙였어요</span>
          : mode === "deleg" ? <span className="sim-good">'{hitItem.text}' 에서 시작한 클릭이 목록까지 올라와 리스너 하나가 처리</span>
          : <span>'{hitItem.text}' 에 붙은 리스너가 처리</span>}
      </div>
      <span className="muted">'항목마다'에서 항목을 추가하고 눌러 보세요. 처음에만 리스너를 붙였다면 새 항목은 반응하지 않습니다. 위임은 리스너가 목록에 있어서 새 항목도 바로 됩니다.</span>
    </div>
  );
}

/* ───────── 코어 웹 바이탈 ───────── */
const rate = (v: number, good: number, poor: number): "good" | "mid" | "poor" => (v <= good ? "good" : v <= poor ? "mid" : "poor");
const RATE_TEXT = { good: "좋음", mid: "개선 필요", poor: "나쁨" };

export function CoreWebVitalsDemo() {
  const [fixLcp, setFixLcp] = useState(false);
  const [fixCls, setFixCls] = useState(false);
  const [fixInp, setFixInp] = useState(false);
  const [run, setRun] = useState<{ lcp: number; reserved: boolean } | null>(null);
  const [inp, setInp] = useState<number | null>(null);
  const [added, setAdded] = useState(0);
  const later = useLater();
  const pb = usePlayback(4600);
  const reload = () => { setRun({ lcp: fixLcp ? 1700 : 4300, reserved: fixCls }); setInp(null); setAdded(0); pb.start(); };
  const t = pb.t < 0 ? Infinity : pb.t;
  const imgShown = !run || t >= run.lcp;
  const textShown = !run || t >= 300;
  const reserved = run ? run.reserved : fixCls;
  const lcp = run && imgShown ? run.lcp : null;
  const cls = run ? (!run.reserved && imgShown ? 0.27 : 0) : null;
  const onAdd = (e: MouseEvent) => {
    const t0 = e.timeStamp;
    if (!fixInp) block(380);
    setAdded((a) => a + 1);
    // 다음 화면이 그려진 직후를 잰다
    requestAnimationFrame(() => setTimeout(() => {
      setInp(performance.now() - t0);
      // 고친 쪽은 무거운 일을 잘게 나눠 화면을 그린 뒤에 한다
      if (fixInp) for (let i = 0; i < 8; i++) later.after(i * 10, () => block(40));
    }, 0));
  };
  const cards = [
    { name: "LCP", hint: "가장 큰 내용 보이기", val: lcp, text: lcp === null ? "—" : `${(lcp / 1000).toFixed(1)}초`, r: lcp === null ? null : rate(lcp, 2500, 4000), goal: "2.5초 이하" },
    { name: "INP", hint: "누르고 반응하기", val: inp, text: inp === null ? "눌러 보세요" : `${Math.round(inp)}ms`, r: inp === null ? null : rate(inp, 200, 500), goal: "200ms 이하" },
    { name: "CLS", hint: "화면 밀림", val: cls, text: cls === null ? "—" : cls.toFixed(2), r: cls === null ? null : rate(cls, 0.1, 0.25), goal: "0.1 이하" },
  ];
  return (
    <div className="demo-stage">
      <div className="pf-cwv-fixes">
        <Switch on={fixLcp} onChange={setFixLcp} label="큰 사진 줄이고 먼저 받기" />
        <Switch on={fixCls} onChange={setFixCls} label="사진 자리 미리 잡기" />
        <Switch on={fixInp} onChange={setFixInp} label="클릭 처리 잘게 나누기" />
      </div>
      <button type="button" className="btn primary pf-self-start" onClick={reload}>새로고침</button>
      <div className="pf-cwv-page">
        {textShown ? <b>가을 캠핑 특가</b> : <span className="pf-cwv-ph" />}
        <div className={`pf-cwv-hero ${reserved ? "reserved" : ""} ${imgShown ? "in" : ""}`}>
          {imgShown && <img src={photo(5, 400, 150)} alt="캠핑장 풍경" />}
        </div>
        {textShown && <span>텐트·의자 세트 49,000원</span>}
        {textShown && <button type="button" className="btn small primary pf-self-start" onClick={onAdd}>장바구니 담기{added ? ` (${added})` : ""}</button>}
      </div>
      <div className="pf-cwv-cards" aria-live="polite">
        {cards.map((c) => (
          <div key={c.name} className={`pf-cwv-card ${c.r ?? ""}`}>
            <span className="muted">{c.name} · {c.hint}</span>
            <b className="tabular">{c.text}</b>
            <span className="pf-cwv-rate">{c.r ? RATE_TEXT[c.r] : `기준 ${c.goal}`}</span>
          </div>
        ))}
      </div>
      <span className="muted">새로고침하고 사진이 뜰 때 글이 밀리는지, 장바구니 버튼이 바로 반응하는지 보세요. INP 는 이 브라우저에서 누른 순간부터 화면이 바뀔 때까지 실제로 잰 값입니다.</span>
    </div>
  );
}

/* ───────── 프로파일링 ───────── */
type Frame = { name: string; start: number; dur: number; depth: number; calls?: number };
const PROF_SLOW: Frame[] = [
  { name: "onClick (검색)", start: 0, dur: 820, depth: 0 },
  { name: "filterProducts", start: 5, dur: 110, depth: 1 },
  { name: "sortProducts", start: 120, dur: 560, depth: 1 },
  { name: "compare", start: 125, dur: 545, depth: 2, calls: 9000 },
  { name: "formatPrice", start: 140, dur: 500, depth: 3, calls: 18000 },
  { name: "render", start: 685, dur: 130, depth: 1 },
  { name: "ProductCard", start: 690, dur: 120, depth: 2, calls: 200 },
];
const PROF_FAST: Frame[] = [
  { name: "onClick (검색)", start: 0, dur: 320, depth: 0 },
  { name: "filterProducts", start: 5, dur: 110, depth: 1 },
  { name: "sortProducts", start: 120, dur: 60, depth: 1 },
  { name: "formatPrice", start: 122, dur: 14, depth: 2, calls: 1000 },
  { name: "compare", start: 138, dur: 38, depth: 2, calls: 9000 },
  { name: "render", start: 185, dur: 130, depth: 1 },
  { name: "ProductCard", start: 190, dur: 120, depth: 2, calls: 200 },
];
const PROF_SCALE = 820;
const selfTime = (fs: Frame[], f: Frame) => f.dur - fs.filter((c) => c.depth === f.depth + 1 && c.start >= f.start && c.start < f.start + f.dur).reduce((a, c) => a + c.dur, 0);

export function ProfilingDemo() {
  const [fixed, setFixed] = useState(false);
  const [rec, setRec] = useState<"idle" | "recording" | "done">("idle");
  const [shown, setShown] = useState<Frame[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const later = useLater();
  const record = () => {
    if (rec === "recording") return;
    const fs = fixed ? PROF_FAST : PROF_SLOW;
    setRec("recording"); setSel(null);
    later.after(fs[0].dur, () => { setShown(fs); setRec("done"); });
  };
  const hot = useMemo(() => shown.reduce<Frame | null>((best, f) => (!best || selfTime(shown, f) > selfTime(shown, best) ? f : best), null), [shown]);
  const cur = shown.find((f) => f.name === sel) ?? null;
  return (
    <div className="demo-stage">
      <div className="row">
        <Switch on={fixed} onChange={setFixed} label="고친 코드 (가격 글자를 정렬 전에 한 번만 만들기)" />
      </div>
      <button type="button" className="btn primary pf-self-start" onClick={record} disabled={rec === "recording"}>{rec === "recording" ? "● 기록 중…" : "기록하며 검색 버튼 누르기"}</button>
      <div className="pf-flame" aria-label="플레임 차트. 가로가 시간, 아래로 갈수록 안쪽 함수">
        {shown.map((f) => {
          const isHot = hot?.name === f.name;
          return (
            <button type="button" key={f.name} className={`pf-flame-bar d${f.depth} ${isHot ? "hot" : ""} ${sel === f.name ? "sel" : ""}`}
              style={{ left: `${(f.start / PROF_SCALE) * 100}%`, width: `${(f.dur / PROF_SCALE) * 100}%`, top: f.depth * 26 }}
              onClick={() => setSel(f.name)} title={`${f.name} ${f.dur}ms`}>
              {f.name}
            </button>
          );
        })}
        {!shown.length && <span className="muted pf-flame-empty">기록하면 여기에 플레임 차트가 나옵니다.</span>}
        <div className="pf-flame-axis" aria-hidden="true">{[0, 200, 400, 600].map((x) => <span key={x} style={{ left: `${(x / PROF_SCALE) * 100}%` }}>{x}ms</span>)}</div>
      </div>
      <div className="sim-meter" aria-live="polite">
        {cur ? <span><b>{cur.name}</b> · 전체 {cur.dur}ms · 자기 시간 <b className={cur === hot ? "sim-bad" : ""}>{selfTime(shown, cur)}ms</b>{cur.calls ? ` · ${cur.calls.toLocaleString("ko-KR")}번 호출` : ""}</span>
          : hot && rec === "done" ? <span>전체 <b className="tabular">{shown[0].dur}ms</b> · 자기 시간이 가장 긴 곳: <b className="sim-bad">{hot.name}</b> ({selfTime(shown, hot)}ms)</span>
          : <span className="muted">막대를 누르면 자세히 볼 수 있습니다.</span>}
      </div>
      <span className="muted">정렬하면서 비교할 때마다 가격 글자를 새로 만들어 18,000번 부르는 곳이 병목입니다. 고친 코드로 다시 기록해 보세요.</span>
    </div>
  );
}

/* ───────── 메모리 누수 ───────── */
const MEM_BASE = 14, MEM_SCREEN = 6, MEM_POINTS = 50;

export function MemoryLeakDemo() {
  const [clean, setClean] = useState(false);
  const [open, setOpen] = useState(false);
  const [zombies, setZombies] = useState(0);
  const [series, setSeries] = useState<number[]>([MEM_BASE]);
  const heap = useRef(MEM_BASE);
  const z = useRef(0);
  const later = useLater();
  useEffect(() => {
    const id = window.setInterval(() => {
      heap.current += z.current * 0.12; // 닫혔는데 도는 타이머가 데이터를 계속 쌓는다
      setSeries((s) => [...s, heap.current].slice(-MEM_POINTS));
    }, 300);
    return () => window.clearInterval(id);
  }, []);
  const isOpen = useRef(false);
  const cleanRef = useRef(clean);
  cleanRef.current = clean;
  const toggle = () => {
    if (!isOpen.current) heap.current += MEM_SCREEN;
    else if (cleanRef.current) heap.current -= MEM_SCREEN;
    else { z.current += 1; setZombies(z.current); }
    isOpen.current = !isOpen.current;
    setOpen(isOpen.current);
  };
  const cycle = () => { for (let i = 0; i < 10; i++) { later.after(i * 260, toggle); later.after(i * 260 + 130, toggle); } };
  const reset = (c = clean) => { later.clearAll(); setClean(c); isOpen.current = false; setOpen(false); z.current = 0; setZombies(0); heap.current = MEM_BASE; setSeries([MEM_BASE]); };
  const W = 300, H = 80, top = Math.max(60, ...series) * 1.1;
  const pts = series.map((v, i) => `${(i / (MEM_POINTS - 1)) * W},${H - (v / top) * H}`).join(" ");
  return (
    <div className="demo-stage">
      <Seg label="닫을 때" value={clean ? "clean" : "leak"} onChange={(v) => reset(v === "clean")} options={[["leak", "정리 안 함"], ["clean", "정리함"]]} />
      <pre className="pf-import"><code>{`useEffect(() => {
  const id = setInterval(poll, 1000);
  window.addEventListener("resize", fit);${clean ? `
  return () => {
    clearInterval(id);
    window.removeEventListener("resize", fit);
  };` : ""}
}, []);`}</code></pre>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => toggle()}>{open ? "차트 화면 닫기" : "차트 화면 열기"}</button>
        <button type="button" className="btn small" onClick={cycle}>10번 열고 닫기</button>
        <button type="button" className="btn small" onClick={() => reset()}>처음부터</button>
      </div>
      {open && <div className="pf-ml-screen">📈 실시간 차트 화면 (열려 있음)</div>}
      <svg className="pf-mem" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`메모리 사용량 그래프, 지금 ${Math.round(heap.current)}MB`}>
        <polyline points={pts} className={zombies ? "bad" : ""} />
      </svg>
      <div className="sim-meter" aria-live="polite">
        <span>메모리 <b className={`tabular ${zombies ? "sim-bad" : ""}`}>{Math.round(series[series.length - 1])}MB</b></span>
        <span>닫혔는데 도는 타이머 <b className="tabular">{zombies}개</b></span>
        <span>남은 window 리스너 <b className="tabular">{zombies + (open ? 1 : 0)}개</b></span>
      </div>
      <span className="muted">'정리 안 함'에서 여러 번 열고 닫아 보세요. 화면은 닫혀도 타이머와 리스너가 남아 메모리가 계단처럼 오르고, 남은 타이머가 계속 데이터를 쌓습니다.</span>
    </div>
  );
}

/* ───────── 번들 분석 ───────── */
type Mod = { id: string; name: string; kb: number; fixKb?: number; split?: boolean; fix?: string; tip: string };
const MODS: Mod[] = [
  { id: "moment", name: "moment + 언어 파일", kb: 290, fixKb: 7, fix: "dayjs 로 바꾸기", tip: "날짜 몇 개 쓰려고 넣었는데 언어 파일 160여 개까지 따라왔습니다." },
  { id: "chart", name: "chart.js", kb: 205, split: true, fix: "통계 화면에서만 받게 나누기", tip: "통계 화면에서만 쓰는데 첫 화면에서 받습니다." },
  { id: "react-dom", name: "react-dom", kb: 130, tip: "앱의 뼈대라 줄이기 어렵습니다." },
  { id: "icons", name: "아이콘 묶음 전체", kb: 118, fixKb: 6, fix: "쓰는 아이콘만 import", tip: "아이콘 1,500개 중 12개만 씁니다." },
  { id: "lodash", name: "lodash", kb: 72, fixKb: 9, fix: "lodash-es 에서 필요한 함수만", tip: "옛 모듈 방식이라 트리 셰이킹이 안 되어 통째로 들어왔습니다." },
  { id: "app", name: "우리 앱 코드", kb: 64, tip: "직접 쓴 코드입니다." },
  { id: "react", name: "react", kb: 8, tip: "작습니다." },
];
const BA_START = MODS.reduce((a, m) => a + m.kb, 0);
type Box = { id: string; x: number; y: number; w: number; h: number };
function treemap(items: { id: string; size: number }[], x: number, y: number, w: number, h: number): Box[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ id: items[0].id, x, y, w, h }];
  const total = items.reduce((a, b) => a + b.size, 0);
  let acc = 0, i = 0;
  while (i < items.length - 1 && acc + items[i].size <= total / 2) { acc += items[i].size; i++; }
  if (i === 0) { acc = items[0].size; i = 1; }
  const k = acc / total, a = items.slice(0, i), b = items.slice(i);
  return w >= h
    ? [...treemap(a, x, y, w * k, h), ...treemap(b, x + w * k, y, w * (1 - k), h)]
    : [...treemap(a, x, y, w, h * k), ...treemap(b, x, y + h * k, w, h * (1 - k))];
}

export function BundleAnalysisDemo() {
  const [fixed, setFixed] = useState<string[]>([]);
  const [sel, setSel] = useState<string>("moment");
  const sizeOf = (m: Mod) => (fixed.includes(m.id) ? (m.split ? 0 : m.fixKb ?? m.kb) : m.kb);
  const live = MODS.map((m) => ({ id: m.id, size: sizeOf(m) })).filter((m) => m.size > 0).sort((a, b) => b.size - a.size);
  const boxes = treemap(live, 0, 0, 160, 100);
  const total = live.reduce((a, b) => a + b.size, 0);
  const cur = MODS.find((m) => m.id === sel)!;
  const isFixed = fixed.includes(cur.id);
  return (
    <div className="demo-stage">
      <div className="pf-tm" role="group" aria-label="번들 트리맵. 상자 넓이가 크기">
        {boxes.map((b) => {
          const m = MODS.find((x) => x.id === b.id)!;
          const problem = !!m.fix && !fixed.includes(m.id);
          return (
            <button type="button" key={b.id} className={`pf-tm-box ${problem ? "problem" : ""} ${sel === b.id ? "sel" : ""}`}
              style={{ left: `${(b.x / 160) * 100}%`, top: `${b.y}%`, width: `${(b.w / 160) * 100}%`, height: `${b.h}%` }}
              onClick={() => setSel(b.id)} aria-label={`${m.name} ${sizeOf(m)}KB`}>
              {b.w * b.h > 260 && <><b>{m.name}</b><span className="tabular">{sizeOf(m)}KB</span></>}
            </button>
          );
        })}
      </div>
      <div className="sim-screen">
        <b>{cur.name} · <span className="tabular">{sizeOf(cur) || cur.kb}KB</span>{isFixed && cur.split ? " (첫 화면에서 빠짐)" : ""}</b>
        <span className="muted">{isFixed ? "고쳤습니다." : cur.tip}</span>
        {cur.fix && <button type="button" className="btn small pf-self-start" disabled={isFixed} onClick={() => setFixed((f) => [...f, cur.id])}>{isFixed ? "고침" : cur.fix}</button>}
      </div>
      <div className="sim-bars">
        <div className="sim-bar-label"><span>첫 화면에서 받는 자바스크립트</span><b className="tabular">{total}KB / {BA_START}KB</b></div>
        <div className="sim-bar"><div className={`sim-bar-fill ${total > 400 ? "warm" : ""}`} style={{ width: `${(total / BA_START) * 100}%` }} /></div>
      </div>
      <div className="row">
        <span className="muted">압축하면 약 {Math.round(total * 0.32)}KB</span>
        {fixed.length > 0 && <button type="button" className="btn small" onClick={() => setFixed([])}>처음 상태로</button>}
      </div>
      <span className="muted">주황 테두리 상자가 줄일 수 있는 곳입니다. 눌러서 고쳐 보세요.</span>
    </div>
  );
}
