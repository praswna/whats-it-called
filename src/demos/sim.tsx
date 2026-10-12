import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { photo } from "./media";
import "./sim.css";

/* ───────── 공통 도우미 ───────── */

/* 언마운트 때 한꺼번에 정리되는 setTimeout 묶음 */
function useLater() {
  const ids = useRef(new Set<number>());
  useEffect(() => {
    const s = ids.current;
    return () => { s.forEach((id) => window.clearTimeout(id)); s.clear(); };
  }, []);
  return useMemo(() => ({
    after(ms: number, fn: () => void) {
      const id = window.setTimeout(() => { ids.current.delete(id); fn(); }, ms);
      ids.current.add(id);
      return id;
    },
    clearAll() { ids.current.forEach((id) => window.clearTimeout(id)); ids.current.clear(); },
  }), []);
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented sim-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button type="button" key={v} role="radio" aria-checked={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="row sim-switch">
      <button type="button" role="switch" aria-checked={on} className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)}><span /></button>
      {label}
    </label>
  );
}

const sec = (ms: number) => `${(ms / 1000).toFixed(1)}초`;
let uid = 1;
const nextId = () => uid++;

/* ───────── 지연 로딩 ───────── */
const LAZY_N = 12;
type LoadState = "idle" | "loading" | "done";

export function LazyLoadDemo() {
  const [lazy, setLazy] = useState(true);
  const [gen, setGen] = useState(0);
  const [st, setSt] = useState<LoadState[]>(() => Array(LAZY_N).fill("idle"));
  const box = useRef<HTMLDivElement>(null);
  const later = useLater();
  const load = useCallback((i: number) => {
    setSt((s) => { if (s[i] !== "idle") return s; const n = [...s]; n[i] = "loading"; return n; });
    later.after(500 + Math.random() * 500, () => setSt((s) => { const n = [...s]; n[i] = "done"; return n; }));
  }, [later]);
  useEffect(() => {
    later.clearAll();
    setSt(Array(LAZY_N).fill("idle"));
    const root = box.current; if (!root) return;
    root.scrollTop = 0;
    if (!lazy) { for (let i = 0; i < LAZY_N; i++) load(i); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) load(Number((e.target as HTMLElement).dataset.i)); });
    }, { root, rootMargin: "0px 0px 40px 0px" });
    root.querySelectorAll("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lazy, gen, load, later]);
  const asked = st.filter((s) => s !== "idle").length;
  return (
    <div className="demo-stage">
      <div className="row">
        <Seg label="불러오는 방식" value={lazy ? "lazy" : "eager"} onChange={(v) => setLazy(v === "lazy")} options={[["lazy", "지연 로딩"], ["eager", "한꺼번에"]]} />
        <button type="button" className="btn small" onClick={() => setGen((g) => g + 1)}>처음부터</button>
      </div>
      <div className="sim-meter">
        <span>요청한 사진 <b className="tabular">{asked}</b> / {LAZY_N}</span>
        <span className="muted tabular">받은 데이터 약 {asked * 180}KB</span>
      </div>
      <div ref={box} className="sim-lazy-box" tabIndex={0} aria-label="사진 목록, 스크롤 가능">
        {st.map((s, i) => (
          <div key={i} data-i={i} className="sim-lazy-card">
            {s === "done" ? <img src={photo(i + 3, 200, 120)} alt={`풍경 ${i + 1}`} />
              : <div className={`sim-lazy-ph ${s}`}>{s === "loading" ? "받는 중…" : "아직 안 받음"}</div>}
            <span className="muted">사진 {i + 1}</span>
          </div>
        ))}
      </div>
      <span className="muted">상자 안을 아래로 스크롤해 보세요. 지연 로딩은 가까워진 사진만 그때 받고, '한꺼번에'는 처음에 12장을 모두 받습니다.</span>
    </div>
  );
}

/* ───────── 프리페치 ───────── */
const PF_ITEMS = [
  { id: "a", title: "가을 등산 코스 5곳", body: "설악산 공룡능선부터 북한산 둘레길까지, 단풍이 좋은 길을 골랐습니다." },
  { id: "b", title: "주말 캠핑 준비물", body: "텐트·침낭·랜턴, 그리고 밤에 꼭 필요한 따뜻한 겉옷." },
  { id: "c", title: "동네 빵집 지도", body: "소금빵이 맛있는 집 세 곳과 아침 8시에 여는 집." },
];
const PF_MS = 900;

export function PrefetchDemo() {
  const [on, setOn] = useState(true);
  const [cache, setCache] = useState<Record<string, "loading" | "ready">>({});
  const started = useRef<Record<string, number>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<string | null>(null);
  const [lastWait, setLastWait] = useState<number | null>(null);
  const later = useLater();
  const fetchIt = (id: string) => {
    if (started.current[id] !== undefined) return;
    started.current[id] = performance.now();
    setCache((c) => ({ ...c, [id]: "loading" }));
    later.after(PF_MS, () => setCache((c) => ({ ...c, [id]: "ready" })));
  };
  const openIt = (id: string) => {
    if (waiting) return;
    fetchIt(id);
    const remain = Math.max(0, started.current[id] + PF_MS - performance.now());
    setLastWait(Math.round(remain));
    if (remain < 20) setOpen(id);
    else { setWaiting(id); later.after(remain, () => { setWaiting(null); setOpen(id); }); }
  };
  const reset = (nextOn: boolean) => {
    later.clearAll(); started.current = {}; setCache({}); setOpen(null); setWaiting(null); setLastWait(null); setOn(nextOn);
  };
  const item = PF_ITEMS.find((x) => x.id === open);
  return (
    <div className="demo-stage">
      <div className="row">
        <Seg label="미리 받기" value={on ? "on" : "off"} onChange={(v) => reset(v === "on")} options={[["on", "올리면 미리 받기"], ["off", "누를 때 받기"]]} />
        <button type="button" className="btn small" onClick={() => reset(on)}>캐시 비우기</button>
      </div>
      <div className="sim-screen">
        {item ? (
          <div className="sim-article">
            <button type="button" className="link" onClick={() => setOpen(null)}>← 목록</button>
            <b>{item.title}</b>
            <span>{item.body}</span>
          </div>
        ) : (
          <ul className="plain-list">
            {PF_ITEMS.map((x) => (
              <li key={x.id}>
                <button type="button" className="sim-linkrow"
                  onPointerEnter={() => { if (on) fetchIt(x.id); }}
                  onFocus={() => { if (on) fetchIt(x.id); }}
                  onClick={() => openIt(x.id)}>
                  <span>{x.title}</span>
                  <span className={`sim-tag ${cache[x.id] ?? "none"}`}>
                    {waiting === x.id ? "기다리는 중…" : cache[x.id] === "ready" ? "준비됨" : cache[x.id] === "loading" ? "받는 중" : "안 받음"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="sim-meter" aria-live="polite">
        {lastWait === null ? <span className="muted">글 하나를 열어 보세요.</span>
          : lastWait < 20 ? <span className="sim-good">누르자마자 열림 (0초) — 미리 받아 둔 덕분</span>
          : <span className="sim-bad">누른 뒤 {sec(lastWait)} 기다림</span>}
      </div>
      <span className="muted">제목 위에 커서를 잠깐 올렸다가 눌러 보세요. 받는 데 0.9초가 걸리는데, 올리는 동안 미리 받아 두면 누를 때 바로 열립니다.</span>
    </div>
  );
}

/* ───────── 캐싱 ───────── */
const CITIES = ["서울", "부산", "제주"] as const;
type City = (typeof CITIES)[number];
type CacheMode = "none" | "cache" | "swr";

export function CacheDemo() {
  const [mode, setMode] = useState<CacheMode>("cache");
  const [server, setServer] = useState<Record<City, number>>({ 서울: 18, 부산: 21, 제주: 22 });
  const serverRef = useRef(server); serverRef.current = server;
  const [cache, setCache] = useState<Partial<Record<City, number>>>({});
  const cacheRef = useRef(cache); cacheRef.current = cache;
  const [shown, setShown] = useState<{ city: City; temp: number; note: string } | null>(null);
  const [loading, setLoading] = useState<City | null>(null);
  const [log, setLog] = useState<{ id: number; text: string; kind: "hit" | "miss" | "re" }[]>([]);
  const later = useLater();
  const addLog = (text: string, kind: "hit" | "miss" | "re") => setLog((l) => [{ id: nextId(), text, kind }, ...l].slice(0, 4));
  const ask = (city: City) => {
    if (loading) return;
    const hit = mode !== "none" ? cacheRef.current[city] : undefined;
    if (hit !== undefined) {
      setShown({ city, temp: hit, note: mode === "swr" ? "저장된 값 먼저" : "캐시에서" });
      addLog(`${city} · 캐시 적중 · 0초${mode === "swr" ? " · 뒤에서 새로 받는 중" : ""}`, "hit");
      if (mode === "swr") {
        later.after(1000, () => {
          const fresh = serverRef.current[city];
          setCache((c) => ({ ...c, [city]: fresh }));
          setShown((s) => (s && s.city === city ? { city, temp: fresh, note: "새 값으로 바꿔 끼움" } : s));
          addLog(`${city} · 갱신 완료 ${fresh}°`, "re");
        });
      }
      return;
    }
    setLoading(city);
    later.after(1000, () => {
      const fresh = serverRef.current[city];
      if (mode !== "none") setCache((c) => ({ ...c, [city]: fresh }));
      setShown({ city, temp: fresh, note: "서버에서" });
      setLoading(null);
      addLog(`${city} · ${mode === "none" ? "캐시 없음" : "캐시 미스"} · 서버까지 1.0초`, "miss");
    });
  };
  const changeMode = (m: CacheMode) => { later.clearAll(); setMode(m); setCache({}); setShown(null); setLoading(null); setLog([]); };
  const stale = shown && shown.temp !== server[shown.city];
  return (
    <div className="demo-stage">
      <Seg label="캐시 방식" value={mode} onChange={changeMode} options={[["none", "캐시 없음"], ["cache", "캐시"], ["swr", "먼저 보이고 갱신"]]} />
      <div className="row">
        {CITIES.map((c) => <button type="button" key={c} className="btn" disabled={!!loading} onClick={() => ask(c)}>{c} 날씨</button>)}
      </div>
      <div className="sim-screen sim-weather" aria-live="polite">
        {loading ? <span className="muted">{loading} 날씨 받는 중… (1초)</span>
          : shown ? <>
            <b className="sim-big tabular">{shown.city} {shown.temp}°</b>
            <span className="chip">{shown.note}</span>
            {stale && <span className="sim-bad">서버는 이미 {server[shown.city]}° — 오래된 값</span>}
          </> : <span className="muted">도시를 눌러 날씨를 받아 보세요.</span>}
      </div>
      <div className="row">
        <span className="muted">캐시:</span>
        {mode === "none" ? <span className="muted">쓰지 않음</span>
          : CITIES.filter((c) => cache[c] !== undefined).map((c) => <span key={c} className="chip mono">{c} {cache[c]}°</span>)}
        {mode !== "none" && Object.keys(cache).length === 0 && <span className="muted">비어 있음</span>}
      </div>
      <div className="row">
        <button type="button" className="btn small" onClick={() => setServer((s) => ({ 서울: s.서울 + 1, 부산: s.부산 + 1, 제주: s.제주 + 1 }))}>서버 날씨 +1° 바꾸기</button>
        <button type="button" className="btn small" disabled={mode === "none"} onClick={() => { setCache({}); addLog("캐시 비움 (무효화)", "re"); }}>캐시 비우기</button>
      </div>
      <ul className="plain-list sim-log">
        {log.map((l) => <li key={l.id} className={`sim-log-${l.kind}`}>{l.text}</li>)}
      </ul>
      <span className="muted">같은 도시를 두 번 눌러 보세요. 두 번째는 저장해 둔 값이 즉시 나옵니다. 서버 날씨를 바꾸면 캐시는 옛 값을 계속 보여 주는데, 이때 비우는 것이 '무효화'입니다.</span>
    </div>
  );
}

/* ───────── 메모이제이션 ───────── */
export function MemoDemo() {
  const [n, setN] = useState(25);
  const memo = useRef(new Map<number, number>());
  const [res, setRes] = useState<{ n: number; value: number; plain: number; plainMs: number; memoCalls: number; size: number } | null>(null);
  const run = useCallback((k: number) => {
    let pc = 0;
    const fibP = (x: number): number => { pc++; return x < 2 ? x : fibP(x - 1) + fibP(x - 2); };
    const t0 = performance.now(); const value = fibP(k); const plainMs = performance.now() - t0;
    let mc = 0; const m = memo.current;
    const fibM = (x: number): number => {
      mc++;
      const hit = m.get(x); if (hit !== undefined) return hit;
      const r = x < 2 ? x : fibM(x - 1) + fibM(x - 2); m.set(x, r); return r;
    };
    fibM(k);
    setRes({ n: k, value, plain: pc, plainMs, memoCalls: mc, size: m.size });
  }, []);
  useEffect(() => { run(25); }, [run]);
  return (
    <div className="demo-stage">
      <label className="row">
        <span className="mono">fib(<b className="tabular">{n}</b>)</span>
        <input type="range" min={1} max={30} value={n} aria-label="피보나치 n"
          onChange={(e) => { const k = Number(e.target.value); setN(k); run(k); }} />
      </label>
      {res && (
        <div className="sim-bars">
          <div className="sim-bar-label"><span>메모 없이</span><b className="tabular">{res.plain.toLocaleString("ko-KR")}번 호출</b></div>
          <div className="sim-bar"><div className="sim-bar-fill warm" style={{ width: "100%" }} /></div>
          <div className="sim-bar-label"><span>메모 사용</span><b className="tabular">{res.memoCalls.toLocaleString("ko-KR")}번 호출</b></div>
          <div className="sim-bar"><div className="sim-bar-fill" style={{ width: `${Math.max(1, (res.memoCalls / res.plain) * 100)}%` }} /></div>
          <span className="muted tabular">답은 둘 다 {res.value.toLocaleString("ko-KR")} · 메모 없이 걸린 시간 {res.plainMs.toFixed(1)}ms</span>
          <span className="muted">메모 표에 저장된 답: <span className="mono">{res.size}</span>개 (fib(0)…fib({res.size - 1}))</span>
        </div>
      )}
      <div className="row">
        <button type="button" className="btn small" onClick={() => run(n)}>같은 n 다시 계산</button>
        <button type="button" className="btn small" onClick={() => { memo.current.clear(); run(n); }}>메모 표 비우기</button>
      </div>
      <span className="muted">n 을 키워 보세요. 메모 없이는 같은 계산을 수십만 번 되풀이하고, 메모를 쓰면 한 번 푼 답을 꺼내 씁니다. '다시 계산'하면 메모 쪽은 단 1번입니다.</span>
    </div>
  );
}

/* ───────── 멱등성 ───────── */
const newKey = () => `pay_${Math.random().toString(36).slice(2, 8)}`;

export function IdempotencyDemo() {
  const [useKey, setUseKey] = useState(false);
  const [key, setKey] = useState(newKey);
  const [charges, setCharges] = useState(0);
  const [inflight, setInflight] = useState(0);
  const [log, setLog] = useState<{ id: number; text: string; kind: "ok" | "dup" | "send" }[]>([]);
  const seen = useRef(new Set<string>());
  const reqNo = useRef(0);
  const later = useLater();
  const addLog = (text: string, kind: "ok" | "dup" | "send") => setLog((l) => [{ id: nextId(), text, kind }, ...l].slice(0, 6));
  const pay = () => {
    const no = ++reqNo.current;
    const k = useKey ? key : null;
    setInflight((v) => v + 1);
    addLog(`요청 #${no} 보냄${k ? ` (키 ${k})` : ""}`, "send");
    later.after(700 + Math.random() * 500, () => {
      setInflight((v) => v - 1);
      if (k && seen.current.has(k)) { addLog(`#${no}: 이미 처리한 키 → 같은 영수증만 돌려줌`, "dup"); return; }
      if (k) seen.current.add(k);
      setCharges((c) => c + 1);
      addLog(`#${no}: 12,000원 결제됨`, "ok");
    });
  };
  const reset = (k = useKey) => { later.clearAll(); setUseKey(k); setKey(newKey()); setCharges(0); setInflight(0); setLog([]); seen.current.clear(); reqNo.current = 0; };
  return (
    <div className="demo-stage">
      <Seg label="멱등 키" value={useKey ? "key" : "none"} onChange={(v) => reset(v === "key")} options={[["none", "키 없이"], ["key", "멱등 키 붙이기"]]} />
      <div className="sim-screen sim-pay">
        <span>주문: 겨울 장갑 1개</span>
        <button type="button" className="btn primary" onClick={pay}>12,000원 결제하기</button>
        {useKey && <span className="muted mono sim-small">이 주문의 키: {key}</span>}
      </div>
      <div className="sim-meter" aria-live="polite">
        <span>실제로 빠져나간 돈: <b className={`tabular ${charges > 1 ? "sim-bad" : ""}`}>{(charges * 12000).toLocaleString("ko-KR")}원</b> ({charges}건)</span>
        <span className="muted">처리 중 {inflight}</span>
      </div>
      <ul className="plain-list sim-log">
        {log.map((l) => <li key={l.id} className={`sim-log-${l.kind === "ok" ? "miss" : l.kind === "dup" ? "hit" : "re"}`}>{l.text}</li>)}
      </ul>
      <div className="row"><button type="button" className="btn small" onClick={() => reset()}>새 주문</button></div>
      <span className="muted">결제 버튼을 빠르게 여러 번 눌러 보세요. 키 없이는 누른 만큼 결제되고, 멱등 키를 붙이면 서버가 같은 키를 알아보고 한 번만 결제합니다.</span>
    </div>
  );
}

/* ───────── 경쟁 상태 ───────── */
const WORDS = ["apple", "applet", "apply", "apricot", "april", "apron", "avocado", "axis", "banana", "berry", "cherry", "grape", "lemon", "mango"];
type Req = { id: number; q: string; delay: number; status: "wait" | "used" | "dropped" };

export function RaceConditionDemo() {
  const [fixed, setFixed] = useState(false);
  const fixedRef = useRef(fixed); fixedRef.current = fixed;
  const [q, setQ] = useState("");
  const [shown, setShown] = useState<{ q: string; items: string[] } | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);
  const latest = useRef(0);
  const later = useLater();
  const send = (query: string, delay?: number) => {
    const id = nextId(); latest.current = id;
    const d = delay ?? Math.max(250, 1300 - query.length * 350) + Math.random() * 150;
    setReqs((r) => [{ id, q: query, delay: d, status: "wait" as const }, ...r].slice(0, 5));
    later.after(d, () => {
      const drop = fixedRef.current && id !== latest.current;
      setReqs((r) => r.map((x) => (x.id === id ? { ...x, status: drop ? "dropped" : "used" } : x)));
      if (!drop) setShown({ q: query, items: WORDS.filter((w) => w.startsWith(query)) });
    });
  };
  const change = (v: string) => {
    const t = v.toLowerCase().replace(/[^a-z]/g, "");
    setQ(t);
    if (t) send(t); else { latest.current = nextId(); setShown(null); }
  };
  const typeFast = () => {
    later.clearAll(); setReqs([]); setShown(null); setQ("");
    ["a", "ap", "app"].forEach((t, i) => later.after(i * 150, () => { setQ(t); send(t, [1100, 700, 300][i]); }));
  };
  const wrong = shown && shown.q !== q;
  return (
    <div className="demo-stage">
      <Seg label="버전" value={fixed ? "fixed" : "bug"} onChange={(v) => { later.clearAll(); setFixed(v === "fixed"); setReqs([]); setShown(null); setQ(""); }}
        options={[["bug", "고치기 전"], ["fixed", "마지막 요청만 반영"]]} />
      <div className="row">
        <input className="sim-input" value={q} onChange={(e) => change(e.target.value)} placeholder="영어로 검색 (예: app)" aria-label="과일 검색" autoComplete="off" spellCheck={false} />
        <button type="button" className="btn small" onClick={typeFast}>'app' 빠르게 치기</button>
      </div>
      <div className={`sim-screen ${wrong ? "sim-wrong" : ""}`} aria-live="polite">
        {shown ? <>
          <span className="muted sim-small">'{shown.q}' 의 결과 {shown.items.length}개</span>
          <span className="mono sim-small">{shown.items.join(", ") || "없음"}</span>
          {wrong && <b className="sim-bad">입력은 '{q}' 인데 '{shown.q}' 결과가 보입니다!</b>}
        </> : <span className="muted">결과가 여기에 뜹니다.</span>}
      </div>
      <ul className="plain-list sim-log">
        {reqs.map((r) => (
          <li key={r.id} className={r.status === "used" ? "sim-log-miss" : r.status === "dropped" ? "sim-log-hit" : "sim-log-re"}>
            <span className="mono">'{r.q}'</span> 응답 {sec(r.delay)} · {r.status === "wait" ? "오는 중…" : r.status === "used" ? "화면에 반영" : "늦게 와서 버림"}
          </li>
        ))}
      </ul>
      <span className="muted">'app 빠르게 치기'를 눌러 보세요. 짧은 검색어일수록 결과가 많아 늦게 와서, 고치기 전에는 마지막에 도착한 'a' 결과가 화면을 덮습니다. 고친 버전은 요청 번호를 보고 옛 응답을 버립니다.</span>
    </div>
  );
}

/* ───────── 폴링 · SSE · 웹소켓 ───────── */
type Transport = "poll" | "sse" | "ws";
type Flying = { id: number; dir: "up" | "down"; label: string; kind: "req" | "empty" | "news" | "send" | "open" };
type News = { id: number; text: string; at: number };
const NEWS_TEXT = ["새 댓글", "주문 출발", "친구 접속", "새 메일", "가격 변동", "알림 1건"];
const FLY = 650;

export function TransportDemo() {
  const [mode, setMode] = useState<Transport>("poll");
  const [msgs, setMsgs] = useState<Flying[]>([]);
  const [feed, setFeed] = useState<{ id: number; text: string; delay: number }[]>([]);
  const [stats, setStats] = useState({ sent: 0, empty: 0, delaySum: 0, got: 0 });
  const [pendingN, setPendingN] = useState(0);
  const [connected, setConnected] = useState(false);
  const pending = useRef<News[]>([]);
  const conn = useRef(false);
  const newsNo = useRef(0);
  const later = useLater();

  const fly = useCallback((dir: Flying["dir"], label: string, kind: Flying["kind"], onArrive?: () => void) => {
    const id = nextId();
    setMsgs((m) => [...m, { id, dir, label, kind }]);
    setStats((s) => ({ ...s, sent: s.sent + 1 }));
    later.after(FLY, () => { setMsgs((m) => m.filter((x) => x.id !== id)); onArrive?.(); });
  }, [later]);
  const deliver = useCallback((list: News[]) => {
    if (!list.length) return;
    const now = performance.now();
    setFeed((f) => [...list.map((n) => ({ id: n.id, text: n.text, delay: now - n.at })).reverse(), ...f].slice(0, 4));
    setStats((s) => ({ ...s, got: s.got + list.length, delaySum: s.delaySum + list.reduce((a, n) => a + (now - n.at), 0) }));
  }, []);
  const push = useCallback((n: News) => {
    fly("down", `📰 ${n.text}`, "news", () => deliver([n]));
  }, [fly, deliver]);
  const createNews = useCallback(() => {
    const n = { id: nextId(), text: NEWS_TEXT[newsNo.current++ % NEWS_TEXT.length], at: performance.now() };
    if (mode !== "poll" && conn.current) push(n);
    else { pending.current.push(n); setPendingN(pending.current.length); }
  }, [mode, push]);

  /* 모드가 바뀌면 처음부터 */
  useEffect(() => {
    later.clearAll();
    setMsgs([]); setFeed([]); setStats({ sent: 0, empty: 0, delaySum: 0, got: 0 });
    pending.current = []; setPendingN(0); conn.current = false; setConnected(false);
    if (mode === "poll") {
      const ask = () => fly("up", "새 거 있어?", "req", () => {
        const got = pending.current.splice(0); setPendingN(0);
        if (!got.length) setStats((s) => ({ ...s, empty: s.empty + 1 }));
        fly("down", got.length ? `📰 ${got.length}건` : "없음", got.length ? "news" : "empty", () => deliver(got));
      });
      ask();
      const t = window.setInterval(ask, 2000);
      return () => window.clearInterval(t);
    }
    fly("up", mode === "sse" ? "구독 시작" : "연결 열기", "open", () => {
      conn.current = true; setConnected(true);
      const waiting = pending.current.splice(0); setPendingN(0);
      waiting.forEach(push);
    });
    return undefined;
  }, [mode, fly, deliver, push, later]);

  /* 서버 쪽에서 가끔 새 소식이 생김 */
  useEffect(() => {
    let t = 0;
    const tick = () => { createNews(); t = window.setTimeout(tick, 2600 + Math.random() * 2400); };
    t = window.setTimeout(tick, 1500 + Math.random() * 1000);
    return () => window.clearTimeout(t);
  }, [createNews]);

  const clientSend = () => {
    if (mode === "ws" && conn.current) fly("up", "💬 같은 연결로", "send");
    else fly("up", "💬 따로 새 요청", "send");
  };
  const avg = stats.got ? stats.delaySum / stats.got : 0;
  return (
    <div className="demo-stage">
      <Seg label="통신 방식" value={mode} onChange={setMode} options={[["poll", "폴링"], ["sse", "SSE"], ["ws", "웹소켓"]]} />
      <div className="sim-wire">
        <div className="sim-node"><span aria-hidden="true">📱</span>클라이언트</div>
        <div className={`sim-lanes ${connected ? "open" : ""} ${mode}`}>
          {connected && <span className="sim-pipe-label">{mode === "sse" ? "열린 연결 (서버 → 나만)" : "열린 연결 (양방향)"}</span>}
          {msgs.map((m) => <span key={m.id} className={`sim-msg ${m.dir} ${m.kind}`} style={{ animationDuration: `${FLY}ms` }}>{m.label}</span>)}
        </div>
        <div className="sim-node"><span aria-hidden="true">🖥️</span>서버{pendingN > 0 && <span className="sim-badge">{pendingN}</span>}</div>
      </div>
      <div className="sim-meter tabular">
        <span>메시지 {stats.sent}개{mode === "poll" && <> · 빈 응답 {stats.empty}개</>}</span>
        <span>새 소식이 화면에 닿기까지 평균 <b>{stats.got ? sec(avg) : "-"}</b></span>
      </div>
      <ul className="plain-list sim-log" aria-live="polite">
        {feed.map((f) => <li key={f.id} className="sim-log-miss">📰 {f.text} · 생기고 {sec(f.delay)} 뒤 도착</li>)}
        {feed.length === 0 && <li className="muted">서버에 새 소식이 생기길 기다리는 중…</li>}
      </ul>
      <div className="row">
        <button type="button" className="btn small" onClick={createNews}>서버에 새 소식 만들기</button>
        <button type="button" className="btn small" onClick={clientSend}>내가 서버로 보내기</button>
      </div>
      <span className="muted">방식을 바꿔 보세요. 폴링은 2초마다 물어봐서 빈 응답이 많고 소식이 늦게 닿습니다. SSE 와 웹소켓은 연결을 열어 두고 서버가 바로 보내 주는데, 내가 보낼 때 웹소켓만 같은 연결을 씁니다.</span>
    </div>
  );
}

/* ───────── 실시간 동기화 ───────── */
type Item = { id: number; text: string; done: boolean };
const SHOP: Item[] = [{ id: 1, text: "우유", done: false }, { id: 2, text: "계란", done: true }, { id: 3, text: "사과", done: false }];

export function RealtimeSyncDemo() {
  const server = useRef<Item[]>(SHOP);
  const [devs, setDevs] = useState<[Item[], Item[]]>([SHOP, SHOP]);
  const [flash, setFlash] = useState<[number | null, number | null]>([null, null]);
  const [stale, setStale] = useState<[boolean, boolean]>([false, false]);
  const [live, setLive] = useState(true);
  const liveRef = useRef(live); liveRef.current = live;
  const [drafts, setDrafts] = useState<[string, string]>(["", ""]);
  const later = useLater();
  const setAt = <T,>(pair: [T, T], i: number, v: T): [T, T] => (i === 0 ? [v, pair[1]] : [pair[0], v]);
  const apply = (dev: number, fn: (items: Item[]) => Item[], changed: number) => {
    setDevs((d) => setAt(d, dev, fn(d[dev])));
    server.current = fn(server.current);
    const other = 1 - dev;
    if (liveRef.current) {
      later.after(350, () => {
        const snap = server.current;
        setDevs((d) => setAt(d, other, snap));
        setFlash((f) => setAt(f, other, changed));
        later.after(900, () => setFlash((f) => setAt(f, other, null)));
      });
    } else setStale((s) => setAt(s, other, true));
  };
  const toggle = (dev: number, id: number) => apply(dev, (items) => items.map((x) => (x.id === id ? { ...x, done: !x.done } : x)), id);
  const add = (dev: number, e: FormEvent) => {
    e.preventDefault();
    const text = drafts[dev].trim(); if (!text) return;
    const id = nextId() + 100;
    apply(dev, (items) => [...items, { id, text, done: false }], id);
    setDrafts((d) => setAt(d, dev, ""));
  };
  const refresh = (dev: number) => { setDevs((d) => setAt(d, dev, server.current)); setStale((s) => setAt(s, dev, false)); };
  const reset = () => { later.clearAll(); server.current = SHOP; setDevs([SHOP, SHOP]); setStale([false, false]); setFlash([null, null]); };
  return (
    <div className="demo-stage">
      <div className="row">
        <Switch on={live} onChange={(v) => { setLive(v); if (v) { refresh(0); refresh(1); } }} label={live ? "실시간 동기화 켜짐" : "꺼짐 (새로고침해야 보임)"} />
        <button type="button" className="btn small" onClick={reset}>처음부터</button>
      </div>
      <div className="sim-devices">
        {[0, 1].map((dev) => (
          <div key={dev} className="sim-device">
            <div className="sim-device-head">
              <b>{dev === 0 ? "내 폰" : "가족 폰"}</b>
              <span className="sim-presence" title="함께 보는 사람"><span className={`sim-avatar a${1 - dev}`}>{dev === 0 ? "가" : "나"}</span> 보는 중</span>
            </div>
            <span className="muted sim-small">장보기 목록</span>
            <ul className="plain-list sim-shop">
              {devs[dev].map((x) => (
                <li key={x.id} className={flash[dev] === x.id ? "sim-flash" : ""}>
                  <label><input type="checkbox" checked={x.done} onChange={() => toggle(dev, x.id)} /> <span className={x.done ? "sim-done" : ""}>{x.text}</span></label>
                </li>
              ))}
            </ul>
            {stale[dev] && <button type="button" className="btn small sim-stale" onClick={() => refresh(dev)}>↻ 새 변경 있음</button>}
            <form className="sim-add" onSubmit={(e) => add(dev, e)}>
              <input className="sim-input" value={drafts[dev]} onChange={(e) => { const v = e.target.value; setDrafts((d) => setAt(d, dev, v)); }} placeholder="항목 추가" aria-label={`${dev === 0 ? "내 폰" : "가족 폰"}에 항목 추가`} />
              <button type="submit" className="btn small" aria-label="추가">+</button>
            </form>
          </div>
        ))}
      </div>
      <span className="muted">한쪽 폰에서 체크하거나 항목을 추가해 보세요. 잠시 뒤 다른 폰에 반짝이며 반영됩니다. 동기화를 끄면 다른 폰은 새로고침해야 보입니다.</span>
    </div>
  );
}

/* ───────── 재시도와 백오프 ───────── */
const RB_SCALE = 140; // 시뮬레이션 1초 = 실제 140ms
const RB_MAX = 32;
const RB_CLIENTS = ["A", "B", "C", "D"];
type Attempt = { t: number; ok: boolean };

function planRetries(down: number, jitter: boolean): Attempt[][] {
  return RB_CLIENTS.map(() => {
    const out: Attempt[] = []; let t = 0;
    for (let k = 0; k < 6; k++) {
      const ok = t >= down; out.push({ t, ok });
      if (ok) break;
      t += 2 ** k * (jitter ? 0.5 + Math.random() : 1);
      if (t > RB_MAX) break;
    }
    return out;
  });
}

export function RetryBackoffDemo() {
  const [jitter, setJitter] = useState(false);
  const [down, setDown] = useState(12);
  const [plans, setPlans] = useState<Attempt[][] | null>(null);
  const [now, setNow] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);
  const start = () => {
    window.clearInterval(timer.current);
    const p = planRetries(down, jitter);
    const end = Math.min(RB_MAX, Math.max(...p.map((a) => a[a.length - 1].t)) + 0.5);
    setPlans(p); setNow(0);
    const t0 = performance.now();
    timer.current = window.setInterval(() => {
      const t = (performance.now() - t0) / RB_SCALE;
      if (t >= end) { setNow(end); window.clearInterval(timer.current); } else setNow(t);
    }, 40);
  };
  const pct = (t: number) => `${(t / RB_MAX) * 100}%`;
  const seen = plans ? plans.flatMap((a) => a.slice(1).filter((x) => x.t <= now)) : [];
  const bins = new Map<number, number>();
  seen.forEach((x) => { const b = Math.round(x.t * 4); bins.set(b, (bins.get(b) ?? 0) + 1); });
  const peak = Math.max(0, ...bins.values());
  const gaps = plans ? plans[0].slice(1).map((x, i) => x.t - plans[0][i].t) : [];
  return (
    <div className="demo-stage">
      <div className="row">
        <Seg label="지터" value={jitter ? "j" : "n"} onChange={(v) => setJitter(v === "j")} options={[["n", "지터 없음"], ["j", "지터 있음"]]} />
        <button type="button" className="btn primary small" onClick={start}>서버 다운 → 재시도 시작</button>
      </div>
      <label className="row">
        <span className="muted">서버 복구까지</span>
        <input type="range" min={0} max={28} value={down} onChange={(e) => setDown(Number(e.target.value))} aria-label="서버 복구까지 걸리는 시간(초)" />
        <span className="tabular">{down}초</span>
      </label>
      <div className="sim-rb">
        {RB_CLIENTS.map((c, ci) => (
          <div key={c} className="sim-rb-lane">
            <span className="sim-rb-name">{c}</span>
            <div className="sim-rb-track">
              <div className="sim-rb-down" style={{ width: pct(Math.min(down, RB_MAX)) }} />
              {plans && <div className="sim-rb-now" style={{ left: pct(now) }} />}
              {plans?.[ci].filter((x) => x.t <= now).map((x, i) => (
                <span key={i} className={`sim-rb-dot ${x.ok ? "ok" : "fail"}`} style={{ left: pct(x.t) }} title={`${x.t.toFixed(1)}초 · ${x.ok ? "성공" : "실패"}`}>{x.ok ? "✓" : "✕"}</span>
              ))}
            </div>
          </div>
        ))}
        <div className="sim-rb-axis"><span>0</span><span>8</span><span>16</span><span>24</span><span>32초</span></div>
      </div>
      <div className="sim-meter tabular">
        <span>A 의 대기 간격: {gaps.length ? gaps.map((g) => g.toFixed(1)).join(" → ") + "초" : "-"}</span>
        <span>한순간 몰린 재시도 최대 <b className={peak >= RB_CLIENTS.length ? "sim-bad" : ""}>{peak || "-"}</b>개</span>
      </div>
      <span className="muted">시작을 눌러 보세요. 실패할 때마다 1→2→4→8초로 간격이 두 배씩 늘어납니다 (데모는 1초를 0.14초로 줄임). 지터가 없으면 네 클라이언트가 같은 순간에 몰려가고, 지터를 켜면 흩어집니다. 빗금은 서버가 죽어 있는 시간입니다.</span>
    </div>
  );
}

/* ───────── 요청 제한 (토큰 버킷) ───────── */
const RL_CAP = 5;

export function RateLimitDemo() {
  const tokens = useRef(RL_CAP);
  const last = useRef(performance.now());
  const [shown, setShown] = useState(RL_CAP);
  const [log, setLog] = useState<{ id: number; ok: boolean; wait: number }[]>([]);
  const [count, setCount] = useState({ ok: 0, no: 0 });
  const later = useLater();
  const refill = () => {
    const t = performance.now();
    tokens.current = Math.min(RL_CAP, tokens.current + (t - last.current) / 1000);
    last.current = t;
  };
  useEffect(() => {
    const id = window.setInterval(() => { refill(); setShown(tokens.current); }, 100);
    return () => window.clearInterval(id);
  }, []);
  const send = () => {
    refill();
    let entry;
    if (tokens.current >= 1) { tokens.current -= 1; entry = { id: nextId(), ok: true, wait: 0 }; setCount((c) => ({ ...c, ok: c.ok + 1 })); }
    else { entry = { id: nextId(), ok: false, wait: Math.ceil((1 - tokens.current) * 10) / 10 }; setCount((c) => ({ ...c, no: c.no + 1 })); }
    setShown(tokens.current);
    setLog((l) => [entry, ...l].slice(0, 8));
  };
  const burst = () => { for (let i = 0; i < 10; i++) later.after(i * 70, send); };
  return (
    <div className="demo-stage">
      <div className="row">
        <button type="button" className="btn primary" onClick={send}>요청 보내기</button>
        <button type="button" className="btn small" onClick={burst}>한꺼번에 10번</button>
      </div>
      <div className="sim-bucket" role="img" aria-label={`남은 토큰 ${Math.floor(shown)}개`}>
        <span className="muted sim-small">토큰 버킷 (1초에 1개씩 다시 참)</span>
        <div className="row">
          {Array.from({ length: RL_CAP }, (_, i) => {
            const fill = Math.max(0, Math.min(1, shown - i));
            return <span key={i} className="sim-token"><span style={{ height: `${fill * 100}%` }} /></span>;
          })}
        </div>
      </div>
      <div className="sim-meter tabular"><span className="sim-good">200 성공 {count.ok}</span><span className="sim-bad">429 거절 {count.no}</span></div>
      <ul className="plain-list sim-log" aria-live="polite">
        {log.map((l) => (
          <li key={l.id} className={l.ok ? "sim-log-miss" : "sim-log-hit"}>
            <span className="mono">{l.ok ? "200 OK" : "429 Too Many Requests"}</span>{!l.ok && <> · Retry-After {l.wait}초</>}
          </li>
        ))}
      </ul>
      <span className="muted">버튼을 마구 눌러 보세요. 요청마다 토큰을 하나 쓰고, 다 떨어지면 429 로 거절됩니다. 가만히 두면 1초에 하나씩 다시 찹니다.</span>
    </div>
  );
}

/* ───────── 오프라인 우선 ───────── */
type Todo = { id: number; text: string; done: boolean; synced: boolean };
type Op = { id: number; todoId: number; label: string; apply: (s: Todo[]) => Todo[] };

export function OfflineFirstDemo() {
  const [online, setOnline] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([{ id: 1, text: "택배 반품 신청", done: false, synced: true }]);
  const [serverList, setServerList] = useState<Todo[]>([{ id: 1, text: "택배 반품 신청", done: false, synced: true }]);
  const [queue, setQueue] = useState<Op[]>([]);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (!online || queue.length === 0) return;
    const t = window.setTimeout(() => {
      const [op, ...rest] = queue;
      setServerList((s) => op.apply(s));
      setQueue(rest);
      if (!rest.some((r) => r.todoId === op.todoId)) setTodos((ts) => ts.map((x) => (x.id === op.todoId ? { ...x, synced: true } : x)));
    }, 650);
    return () => window.clearTimeout(t);
  }, [online, queue]);
  const add = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim(); if (!text) return;
    const todo = { id: nextId() + 100, text, done: false, synced: false };
    setTodos((t) => [...t, todo]);
    setQueue((q) => [...q, { id: nextId(), todoId: todo.id, label: `추가 '${text}'`, apply: (s) => [...s, { ...todo, synced: true }] }]);
    setDraft("");
  };
  const toggle = (t: Todo) => {
    setTodos((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done, synced: false } : x)));
    const done = !t.done;
    setQueue((q) => [...q, { id: nextId(), todoId: t.id, label: `${done ? "완료" : "완료 취소"} '${t.text}'`, apply: (s) => s.map((x) => (x.id === t.id ? { ...x, done } : x)) }]);
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <Switch on={online} onChange={setOnline} label={online ? (queue.length ? "온라인 · 동기화 중…" : "온라인 · 모두 맞춰짐") : "오프라인 (지하철 안)"} />
      </div>
      <div className="sim-devices">
        <div className="sim-device">
          <b>내 기기</b>
          <ul className="plain-list sim-shop">
            {todos.map((x) => (
              <li key={x.id}>
                <label><input type="checkbox" checked={x.done} onChange={() => toggle(x)} /> <span className={x.done ? "sim-done" : ""}>{x.text}</span></label>
                <span className={`sim-sync ${x.synced ? "ok" : "wait"}`} title={x.synced ? "동기화됨" : "보내기 대기 중"}>{x.synced ? "✓" : "⏳"}</span>
              </li>
            ))}
          </ul>
          <form className="sim-add" onSubmit={add}>
            <input className="sim-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="할 일 추가" aria-label="할 일 추가" />
            <button type="submit" className="btn small" aria-label="추가">+</button>
          </form>
        </div>
        <div className={`sim-device ${online ? "" : "sim-off"}`}>
          <b>서버 {online ? "" : "(연결 안 됨)"}</b>
          <ul className="plain-list sim-shop">
            {serverList.map((x) => <li key={x.id}><span className={x.done ? "sim-done" : ""}>{x.done ? "☑" : "☐"} {x.text}</span></li>)}
          </ul>
        </div>
      </div>
      <div className="sim-queue">
        <span className="muted sim-small">보낼 대기열 ({queue.length})</span>
        <div className="row">{queue.length ? queue.map((q) => <span key={q.id} className="chip">{q.label}</span>) : <span className="muted sim-small">비어 있음</span>}</div>
      </div>
      <span className="muted">오프라인인 채로 할 일을 추가하고 체크해 보세요. 기기에는 바로 저장되고 대기열에 쌓입니다. 온라인으로 바꾸면 차례대로 서버에 올라갑니다.</span>
    </div>
  );
}

/* ───────── 라우팅 · 딥 링크 ───────── */
const PRODUCTS = [
  { id: "1", name: "머그컵", emoji: "☕", price: 12000 },
  { id: "2", name: "에코백", emoji: "👜", price: 18000 },
  { id: "3", name: "장우산", emoji: "☂️", price: 15000 },
];
const ROUTES = [
  { pattern: "/", name: "홈" },
  { pattern: "/products", name: "상품 목록" },
  { pattern: "/products/:id", name: "상품 상세" },
  { pattern: "/cart", name: "장바구니" },
];
const COLORS_KO = ["검정", "파랑", "노랑"];
const DOMAIN = "myshop.app";

function matchRoute(full: string): { idx: number; params: Record<string, string>; query: URLSearchParams } | null {
  const [path, qs = ""] = full.split("?");
  const parts = path.split("/").filter(Boolean);
  for (let i = 0; i < ROUTES.length; i++) {
    const pp = ROUTES[i].pattern.split("/").filter(Boolean);
    if (pp.length !== parts.length) continue;
    const params: Record<string, string> = {}; let ok = true;
    pp.forEach((p, j) => { if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(parts[j]); else if (p !== parts[j]) ok = false; });
    if (ok) return { idx: i, params, query: new URLSearchParams(qs) };
  }
  return null;
}
const normPath = (s: string) => {
  let p = s.trim().replace(/^https?:\/\//, "");
  if (p.startsWith(DOMAIN)) p = p.slice(DOMAIN.length);
  if (!p.startsWith("/")) p = "/" + p;
  return p;
};

function MiniRouter({ deep }: { deep: boolean }) {
  const [hist, setHist] = useState<{ stack: string[]; i: number }>({ stack: ["/"], i: 0 });
  const path = hist.stack[hist.i];
  const [draft, setDraft] = useState(path);
  const [taps, setTaps] = useState(0);
  const [opened, setOpened] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<{ id: number; who: string; url: string }[]>([
    { id: 1, who: "친구", url: "/products/3?color=노랑" },
    { id: 2, who: "가게 알림", url: "/cart" },
  ]);
  useEffect(() => setDraft(path), [path]);
  const go = (p: string, replace = false) => {
    setTaps((t) => t + 1); setOpened(null);
    setHist((h) => (replace ? { stack: h.stack.map((x, j) => (j === h.i ? p : x)), i: h.i } : { stack: [...h.stack.slice(0, h.i + 1), p], i: h.i + 1 }));
  };
  const openLink = (url: string) => { setHist({ stack: [url], i: 0 }); setTaps(0); setOpened(url); };
  const m = matchRoute(path);
  let screen;
  if (!m) screen = <div className="sim-page"><b>404</b><span className="muted">그런 주소는 없어요.</span><button type="button" className="link" onClick={() => go("/")}>홈으로</button></div>;
  else if (m.idx === 0) screen = <div className="sim-page"><b>오늘의 추천</b><span className="muted">가을 신상품이 들어왔어요.</span><button type="button" className="btn small" onClick={() => go("/products")}>상품 보러 가기</button></div>;
  else if (m.idx === 1) screen = <div className="sim-page"><b>상품 목록</b>{PRODUCTS.map((p) => <button type="button" key={p.id} className="sim-linkrow" onClick={() => go(`/products/${p.id}`)}><span>{p.emoji} {p.name}</span><span className="muted">›</span></button>)}</div>;
  else if (m.idx === 2) {
    const p = PRODUCTS.find((x) => x.id === m.params.id);
    const color = m.query.get("color") ?? "검정";
    screen = p ? (
      <div className="sim-page">
        <span className="sim-big">{p.emoji}</span><b>{p.name}</b><span className="tabular">{p.price.toLocaleString("ko-KR")}원</span>
        <div className="row">{COLORS_KO.map((c) => <button type="button" key={c} className={`chip sim-color ${c === color ? "on" : ""}`} aria-pressed={c === color} onClick={() => go(`/products/${p.id}?color=${c}`, true)}>{c}</button>)}</div>
        {deep && <button type="button" className="link" onClick={() => setMsgs((ms) => [{ id: nextId(), who: "나", url: path }, ...ms].slice(0, 3))}>이 화면 링크 보내기</button>}
      </div>
    ) : <div className="sim-page"><b>없는 상품</b><button type="button" className="link" onClick={() => go("/products")}>목록으로</button></div>;
  } else screen = <div className="sim-page"><b>장바구니</b><span className="muted">☕ 머그컵 × 1</span><button type="button" className="link" onClick={() => go("/products")}>쇼핑 계속하기</button></div>;
  const nav = (
    <div className="sim-tabs" role="navigation" aria-label="앱 메뉴">
      {[["/", "홈"], ["/products", "상품"], ["/cart", "장바구니"]].map(([p, l]) => (
        <button type="button" key={p} className={m && ROUTES[m.idx].pattern.startsWith(p) && (p !== "/" || m.idx === 0) ? "on" : ""} onClick={() => go(p)}>{l}</button>
      ))}
    </div>
  );
  return (
    <div className="demo-stage">
      {deep && (
        <div className="sim-chat">
          <span className="muted sim-small">메신저로 받은 링크</span>
          {msgs.map((x) => (
            <div key={x.id} className="sim-bubble"><span className="muted sim-small">{x.who}</span>
              <button type="button" className="link mono" onClick={() => openLink(x.url)}>{DOMAIN}{x.url}</button></div>
          ))}
        </div>
      )}
      <div className="sim-browser">
        <form className="sim-addr" onSubmit={(e) => { e.preventDefault(); const p = normPath(draft); if (p !== path) go(p); }}>
          <button type="button" className="btn small" disabled={hist.i === 0} onClick={() => setHist((h) => ({ ...h, i: h.i - 1 }))} aria-label="뒤로">←</button>
          <button type="button" className="btn small" disabled={hist.i >= hist.stack.length - 1} onClick={() => setHist((h) => ({ ...h, i: h.i + 1 }))} aria-label="앞으로">→</button>
          <span className="sim-addr-field"><span className="muted">{DOMAIN}</span><input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="주소" spellCheck={false} autoComplete="off" /></span>
        </form>
        <div className={`sim-app ${opened ? "sim-flash" : ""}`}>{screen}</div>
        {nav}
      </div>
      {deep ? (
        <div className="sim-meter" aria-live="polite">
          {opened ? <span className="sim-good">링크 하나로 '{m ? ROUTES[m.idx].name : "?"}' 화면에 바로 들어왔습니다 (탭 {taps}번)</span>
            : <span className="muted">앱 안에서 직접 찾아가면 탭 {taps}번</span>}
        </div>
      ) : (
        <ul className="plain-list sim-routes">
          {ROUTES.map((r, i) => (
            <li key={r.pattern} className={m?.idx === i ? "on" : ""}>
              <span className="mono">{r.pattern}</span> → {r.name}
              {m?.idx === i && Object.keys(m.params).length > 0 && <span className="chip mono">{Object.entries(m.params).map(([k, v]) => `${k}=${v}`).join(" ")}</span>}
            </li>
          ))}
          {!m && <li className="on">일치하는 규칙 없음 → 404</li>}
        </ul>
      )}
      <span className="muted">{deep
        ? "메신저의 링크를 눌러 보세요. 홈부터 찾아 들어가지 않고 그 상품, 그 색깔 화면이 바로 열립니다. 상품 화면에서 '이 화면 링크 보내기'로 지금 주소를 보낼 수도 있습니다."
        : "앱 안의 메뉴를 누르거나 주소창에 /products/2 처럼 쳐서 Enter 를 눌러 보세요. 주소가 바뀌면 그에 맞는 규칙이 골라져 화면이 바뀌고, ← → 로 뒤로·앞으로 갈 수 있습니다."}</span>
    </div>
  );
}
export function RoutingDemo() { return <MiniRouter deep={false} />; }
export function DeepLinkDemo() { return <MiniRouter deep />; }

/* ───────── 핫 리로드 ───────── */
const HR_COLORS: [string, string][] = [["#1f9e93", "청록"], ["#e07b28", "주황"], ["#7b5cd6", "보라"], ["#d2453b", "빨강"]];

export function HotReloadDemo() {
  const [draft, setDraft] = useState(HR_COLORS[0][0]);
  const [saved, setSaved] = useState(HR_COLORS[0][0]);
  const [count, setCount] = useState(0);
  const [memo, setMemo] = useState("");
  const [reloading, setReloading] = useState(false);
  const [msg, setMsg] = useState("");
  const [pulse, setPulse] = useState(0);
  const later = useLater();
  const hot = () => { setSaved(draft); setPulse((p) => p + 1); setMsg("🔥 바뀐 모듈만 갈아 끼움 — 숫자와 메모는 그대로"); };
  const full = () => {
    setReloading(true); setMsg("");
    later.after(800, () => { setSaved(draft); setCount(0); setMemo(""); setReloading(false); setMsg("↻ 페이지 전체를 새로 불러옴 — 상태가 처음으로"); });
  };
  const name = HR_COLORS.find(([c]) => c === draft)?.[1];
  return (
    <div className="demo-stage">
      <div className="sim-editor">
        <div className="sim-editor-head"><span className="mono">Button.tsx</span>{draft !== saved && <span className="sim-dirty">● 저장 안 됨</span>}</div>
        <pre className="mono">{"const color = "}<span className="sim-str">"{draft}"</span>{`; // ${name}`}</pre>
        <div className="row">
          {HR_COLORS.map(([c, n]) => <button type="button" key={c} className={`sim-swatch ${c === draft ? "on" : ""}`} style={{ background: c }} aria-label={`색 ${n}`} aria-pressed={c === draft} onClick={() => setDraft(c)} />)}
        </div>
      </div>
      <div className="row">
        <button type="button" className="btn primary small" disabled={reloading} onClick={hot}>저장 · 핫 리로드</button>
        <button type="button" className="btn small" disabled={reloading} onClick={full}>저장 · 전체 새로고침</button>
      </div>
      <div className="sim-screen sim-preview">
        <span className="muted sim-small">실행 중인 앱</span>
        {reloading ? <span className="muted">다시 불러오는 중…</span> : (
          <>
            <button type="button" key={pulse} className="sim-hr-btn" style={{ background: saved }} onClick={() => setCount((c) => c + 1)}>눌러 보세요 · <b className="tabular">{count}</b></button>
            <input className="sim-input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="여기에 아무거나 적기" aria-label="앱 안의 메모" />
          </>
        )}
      </div>
      <span className="muted sim-small" aria-live="polite">{msg}</span>
      <span className="muted">앱의 버튼을 몇 번 누르고 메모도 적은 다음, 편집기에서 색을 바꿔 저장해 보세요. 핫 리로드는 색만 바뀌고 숫자가 그대로지만, 새로고침은 0 으로 돌아갑니다.</span>
    </div>
  );
}

/* ───────── 사용자 격자 (기능 플래그·A/B·카나리 공통) ───────── */
const USERS = 100;
/* 사용자마다 고정된 버킷 번호(0~99). 같은 사람은 늘 같은 번호 */
const BUCKET = (() => {
  const a = Array.from({ length: USERS }, (_, i) => i); let s = 7;
  for (let i = USERS - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2147483648; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
})();
const STAFF = new Set([3, 27, 48, 61, 90]);

function UserGrid({ cls, label, onPick, picked }: { cls: (i: number) => string; label: string; onPick?: (i: number) => void; picked?: number }) {
  return (
    <div className="sim-grid" role={onPick ? "group" : "img"} aria-label={label}>
      {Array.from({ length: USERS }, (_, i) => onPick
        ? <button type="button" key={i} className={`sim-cell ${cls(i)} ${picked === i ? "picked" : ""}`} aria-label={`사용자 ${i + 1}`} onClick={() => onPick(i)} />
        : <span key={i} className={`sim-cell ${cls(i)}`} />)}
    </div>
  );
}

export function FeatureFlagDemo() {
  const [flag, setFlag] = useState(true);
  const [pct, setPct] = useState(10);
  const [staff, setStaff] = useState(true);
  const [picked, setPicked] = useState(3);
  const on = (i: number) => flag && (BUCKET[i] < pct || (staff && STAFF.has(i)));
  const n = Array.from({ length: USERS }, (_, i) => i).filter(on).length;
  return (
    <div className="demo-stage">
      <div className="sim-meter"><span className="chip">배포된 코드: v2.3 (새 결제 화면 포함)</span></div>
      <div className="row">
        <Switch on={flag} onChange={setFlag} label={flag ? "플래그 켜짐" : "꺼짐 (킬 스위치)"} />
        <label className="row"><input type="checkbox" checked={staff} onChange={(e) => setStaff(e.target.checked)} /> 직원은 항상 켜기</label>
      </div>
      <label className="row">
        <span className="muted">공개 비율</span>
        <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label="공개 비율" />
        <span className="tabular">{pct}%</span>
      </label>
      <div className="sim-flag-wrap">
        <UserGrid label="사용자 100명, 누르면 그 사람 화면" picked={picked} onPick={setPicked} cls={(i) => `${on(i) ? "new" : ""} ${STAFF.has(i) ? "staff" : ""}`} />
        <div className="sim-flag-side">
          <span className="tabular">새 기능 보는 사람 <b>{n}</b>명</span>
          <span className="muted sim-small">사용자 {picked + 1}{STAFF.has(picked) ? " (직원)" : ""} 의 화면</span>
          <div className={`sim-mini-screen ${on(picked) ? "new" : ""}`}>
            {on(picked) ? <><b>✨ 새 결제</b><span>한 번에 결제</span></> : <><b>결제</b><span>카드 정보 입력 →</span></>}
          </div>
        </div>
      </div>
      <span className="muted">비율 슬라이더를 움직이고 점(사용자)을 눌러 그 사람 화면을 보세요. 테두리 점은 직원입니다. 코드를 다시 배포하지 않고 스위치 하나로 모두에게서 끌 수 있습니다.</span>
    </div>
  );
}

export function AbTestDemo() {
  const [split, setSplit] = useState(50);
  const [stats, setStats] = useState({ a: { n: 0, c: 0 }, b: { n: 0, c: 0 } });
  const [running, setRunning] = useState(false);
  const [hits, setHits] = useState<Set<number>>(new Set());
  const groupOf = useCallback((i: number) => (BUCKET[i] < 100 - split ? "a" : "b"), [split]);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const clicked = new Set<number>();
      setStats((s) => {
        const next = { a: { ...s.a }, b: { ...s.b } };
        for (let k = 0; k < 15; k++) {
          const u = Math.floor(Math.random() * USERS); const g = groupOf(u);
          next[g].n++;
          if (Math.random() < (g === "a" ? 0.1 : 0.135)) { next[g].c++; clicked.add(u); }
        }
        if (next.a.n + next.b.n >= 3000) setRunning(false);
        return next;
      });
      setHits(clicked);
    }, 110);
    return () => window.clearInterval(id);
  }, [running, groupOf]);
  const reset = () => { setRunning(false); setStats({ a: { n: 0, c: 0 }, b: { n: 0, c: 0 } }); setHits(new Set()); };
  const ra = stats.a.n ? stats.a.c / stats.a.n : 0;
  const rb = stats.b.n ? stats.b.c / stats.b.n : 0;
  const total = stats.a.n + stats.b.n;
  const p = total ? (stats.a.c + stats.b.c) / total : 0;
  const se = stats.a.n && stats.b.n ? Math.sqrt(p * (1 - p) * (1 / stats.a.n + 1 / stats.b.n)) : 0;
  const z = se ? (rb - ra) / se : 0;
  const verdict = total < 300 ? "아직 판단하기 이릅니다" : Math.abs(z) >= 1.96 ? `${z > 0 ? "B" : "A"} 가 더 낫다고 볼 만합니다 (95% 신뢰)` : "차이가 우연일 수도 있습니다";
  return (
    <div className="demo-stage">
      <div className="sim-ab-variants">
        <div className="sim-variant a"><span className="sim-small">A 안</span><span className="sim-fake-btn a">장바구니 담기</span></div>
        <div className="sim-variant b"><span className="sim-small">B 안</span><span className="sim-fake-btn b">지금 바로 구매</span></div>
      </div>
      <label className="row">
        <span className="muted">B 에 보낼 비율</span>
        <input type="range" min={10} max={90} step={10} value={split} disabled={running} onChange={(e) => { setSplit(Number(e.target.value)); reset(); }} aria-label="B 안 비율" />
        <span className="tabular">{split}%</span>
      </label>
      <UserGrid label={`사용자 100명 중 B 버킷 ${split}명`} cls={(i) => `${groupOf(i)} ${hits.has(i) ? "hit" : ""}`} />
      <div className="row">
        <button type="button" className="btn primary small" onClick={() => setRunning(!running)}>{running ? "멈춤" : total ? "계속" : "실험 시작"}</button>
        <button type="button" className="btn small" onClick={reset}>처음부터</button>
      </div>
      <div className="sim-bars tabular">
        <div className="sim-bar-label"><span>A · 방문 {stats.a.n}</span><b>클릭률 {(ra * 100).toFixed(1)}%</b></div>
        <div className="sim-bar"><div className="sim-bar-fill" style={{ width: `${Math.min(100, ra * 500)}%` }} /></div>
        <div className="sim-bar-label"><span>B · 방문 {stats.b.n}</span><b>클릭률 {(rb * 100).toFixed(1)}%</b></div>
        <div className="sim-bar"><div className="sim-bar-fill warm" style={{ width: `${Math.min(100, rb * 500)}%` }} /></div>
        <span aria-live="polite"><b>{verdict}</b></span>
      </div>
      <span className="muted">실험을 시작해 보세요. 사용자는 번호로 정해진 버킷에 따라 늘 같은 안을 봅니다. 처음엔 결과가 출렁이다가, 방문이 쌓여야 차이를 믿을 수 있게 됩니다.</span>
    </div>
  );
}

/* 카나리 배포 · 단계적 출시 */
const STAGES = [0, 1, 5, 20, 50, 100];

export function RolloutDemo() {
  const [stage, setStage] = useState(0);
  const [bug, setBug] = useState(true);
  const [rolledBack, setRolledBack] = useState(false);
  const [mon, setMon] = useState({ old: { n: 0, e: 0 }, neu: { n: 0, e: 0 } });
  const [errs, setErrs] = useState<Set<number>>(new Set());
  const pct = STAGES[stage];
  const isNew = useCallback((i: number) => BUCKET[i] < pct, [pct]);
  useEffect(() => {
    setMon({ old: { n: 0, e: 0 }, neu: { n: 0, e: 0 } });
    const all = Array.from({ length: USERS }, (_, i) => i);
    const neu = all.filter(isNew); const old = all.filter((i) => !isNew(i));
    const id = window.setInterval(() => {
      const bad = new Set<number>(); let on = 0, oe = 0, nn = 0, ne = 0;
      for (let k = 0; k < 8 && old.length; k++) { const u = old[Math.floor(Math.random() * old.length)]; on++; if (Math.random() < 0.02) { oe++; bad.add(u); } }
      for (let k = 0; k < 4 && neu.length; k++) { const u = neu[Math.floor(Math.random() * neu.length)]; nn++; if (Math.random() < (bug ? 0.18 : 0.02)) { ne++; bad.add(u); } }
      setMon((m) => ({ old: { n: m.old.n + on, e: m.old.e + oe }, neu: { n: m.neu.n + nn, e: m.neu.e + ne } }));
      setErrs(bad);
    }, 160);
    return () => window.clearInterval(id);
  }, [isNew, bug]);
  const ro = mon.old.n ? mon.old.e / mon.old.n : 0;
  const rn = mon.neu.n ? mon.neu.e / mon.neu.n : 0;
  const alarm = mon.neu.n >= 20 && rn - ro > 0.06;
  const next = () => { setRolledBack(false); setStage((s) => Math.min(STAGES.length - 1, s + 1)); };
  return (
    <div className="demo-stage">
      <div className="row">
        <label className="row"><input type="checkbox" checked={bug} onChange={(e) => setBug(e.target.checked)} /> 새 버전에 버그가 숨어 있음</label>
      </div>
      <div className="sim-stages" aria-label="출시 단계">
        {STAGES.slice(1).map((s, i) => <span key={s} className={`chip ${stage >= i + 1 ? "on" : ""}`}>{s}%</span>)}
      </div>
      <UserGrid label={`사용자 100명 중 새 버전 ${pct}명`} cls={(i) => `${isNew(i) ? "new" : ""} ${errs.has(i) ? "err" : ""}`} />
      <div className="sim-bars tabular">
        <div className="sim-bar-label"><span>옛 버전 오류율</span><b>{(ro * 100).toFixed(1)}%</b></div>
        <div className="sim-bar"><div className="sim-bar-fill" style={{ width: `${Math.min(100, ro * 400)}%` }} /></div>
        <div className="sim-bar-label"><span>새 버전 오류율 {pct ? `(요청 ${mon.neu.n})` : ""}</span><b className={alarm ? "sim-bad" : ""}>{pct ? `${(rn * 100).toFixed(1)}%` : "-"}</b></div>
        <div className="sim-bar"><div className={`sim-bar-fill ${alarm ? "danger" : "warm"}`} style={{ width: `${Math.min(100, rn * 400)}%` }} /></div>
      </div>
      <div className="sim-meter" aria-live="polite">
        {rolledBack ? <span className="sim-good">롤백 완료 — 모두 옛 버전으로 돌아갔습니다.</span>
          : alarm ? <b className="sim-bad">⚠ 새 버전 오류가 많습니다! 넓히지 말고 롤백하세요.</b>
          : pct === 100 ? <span className="sim-good">전체 출시 완료</span>
          : pct ? <span className="muted">지켜보는 중… 괜찮으면 다음 단계로.</span> : <span className="muted">아직 아무도 새 버전을 받지 않았습니다.</span>}
      </div>
      <div className="row">
        <button type="button" className="btn primary small" disabled={stage === STAGES.length - 1 || alarm} onClick={next}>{stage === STAGES.length - 1 ? "끝" : `다음 단계 → ${STAGES[stage + 1]}%`}</button>
        <button type="button" className="btn danger small" disabled={stage === 0} onClick={() => { setStage(0); setRolledBack(true); }}>롤백</button>
      </div>
      <span className="muted">'다음 단계'로 1% → 5% → 20% … 씩 새 버전을 넓혀 보세요. 진한 점이 새 버전, 빨간 점이 방금 오류가 난 사람입니다. 버그가 있으면 소수에게서 먼저 드러나 롤백할 수 있습니다.</span>
    </div>
  );
}

/* ───────── 시맨틱 버저닝 ───────── */
type Bump = "major" | "minor" | "patch";
const BUMP_TEXT: Record<Bump, string> = { patch: "버그 수정", minor: "기능 추가", major: "호환 깨짐" };

export function SemverDemo() {
  const [v, setV] = useState<[number, number, number]>([1, 4, 2]);
  const [last, setLast] = useState<Bump | null>(null);
  const [hist, setHist] = useState<{ id: number; text: string }[]>([]);
  const bump = (k: Bump) => {
    const [M, m, p] = v;
    const nv: [number, number, number] = k === "major" ? [M + 1, 0, 0] : k === "minor" ? [M, m + 1, 0] : [M, m, p + 1];
    setV(nv); setLast(k);
    setHist((h) => [{ id: nextId(), text: `${BUMP_TEXT[k]}: ${v.join(".")} → ${nv.join(".")}` }, ...h].slice(0, 4));
  };
  const [M, m, p] = v;
  const ranges = [
    { r: "^1.4.0", note: "1.x 안에서 1.4.0 이상", ok: M === 1 && m >= 4 },
    { r: "~1.4.0", note: "1.4.x 만", ok: M === 1 && m === 4 },
    { r: "1.4.2", note: "딱 이 버전", ok: M === 1 && m === 4 && p === 2 },
  ];
  return (
    <div className="demo-stage">
      <div className="sim-ver" aria-live="polite">
        {(["major", "minor", "patch"] as Bump[]).map((k, i) => (
          <span key={k} className="row" style={{ gap: 4 }}>{i > 0 && <span className="sim-ver-dot">.</span>}<span className="sim-ver-part">
            <b key={`${k}-${v[i]}`} className={`mono ${last === k ? "bumped" : ""}`}>{v[i]}</b>
            <span className="muted sim-small">{k === "major" ? "메이저" : k === "minor" ? "마이너" : "패치"}</span>
          </span></span>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn small" onClick={() => bump("patch")}>버그 수정</button>
        <button type="button" className="btn small" onClick={() => bump("minor")}>기능 추가</button>
        <button type="button" className="btn small danger" onClick={() => bump("major")}>호환 깨짐</button>
        <button type="button" className="link" onClick={() => { setV([1, 4, 2]); setLast(null); setHist([]); }}>처음으로</button>
      </div>
      <ul className="plain-list sim-routes">
        {ranges.map((x) => (
          <li key={x.r} className={x.ok ? "on" : "off"}>
            <span className="mono">{x.r}</span> <span className="muted sim-small">{x.note}</span>
            <span className={x.ok ? "sim-good" : "sim-bad"}>{x.ok ? "✓ 자동으로 받음" : "✕ 직접 올려야 함"}</span>
          </li>
        ))}
      </ul>
      <ul className="plain-list sim-log">{hist.map((h) => <li key={h.id} className="sim-log-re">{h.text}</li>)}</ul>
      <span className="muted">버튼을 눌러 보세요. 버그 수정은 끝자리, 기능 추가는 가운데를 올리고 끝을 0 으로, 호환이 깨지면 앞자리를 올립니다. package.json 의 ^1.4.0 은 앞자리가 1 인 동안만 자동으로 따라갑니다.</span>
    </div>
  );
}

/* ───────── 린트 · 포매터 ───────── */
type Warn = { line: number; token: string; msg: string };
const LINT_CODE: Record<string, { lines: string[]; warns: Warn[] }> = {
  "0-0": {
    lines: ["function total(items){", "let unused = 0", "  var sum=0", "for(let i=0;i<items.length;i++){ if(items[i].price==null) continue", "sum+=items[i].price }", "    return sum}"],
    warns: [{ line: 1, token: "unused", msg: "'unused' 를 만들고 쓰지 않음" }, { line: 2, token: "var", msg: "var 대신 let/const 쓰기" }, { line: 3, token: "==", msg: "== 대신 === 쓰기" }],
  },
  "1-0": {
    lines: ["function total(items) {", "  let unused = 0;", "  var sum = 0;", "  for (let i = 0; i < items.length; i++) {", "    if (items[i].price == null) continue;", "    sum += items[i].price;", "  }", "  return sum;", "}"],
    warns: [{ line: 1, token: "unused", msg: "'unused' 를 만들고 쓰지 않음" }, { line: 2, token: "var", msg: "var 대신 let/const 쓰기" }, { line: 4, token: "==", msg: "== 대신 === 쓰기" }],
  },
  "0-1": {
    lines: ["function total(items){", "  let sum=0", "for(let i=0;i<items.length;i++){ if(items[i].price===null) continue", "sum+=items[i].price }", "    return sum}"],
    warns: [],
  },
  "1-1": {
    lines: ["function total(items) {", "  let sum = 0;", "  for (let i = 0; i < items.length; i++) {", "    if (items[i].price === null) continue;", "    sum += items[i].price;", "  }", "  return sum;", "}"],
    warns: [],
  },
};

export function LintDemo() {
  const [fmt, setFmt] = useState(false);
  const [fix, setFix] = useState(false);
  const code = LINT_CODE[`${fmt ? 1 : 0}-${fix ? 1 : 0}`];
  const renderLine = (s: string, li: number) => {
    const w = code.warns.find((x) => x.line === li);
    if (!w) return s || " ";
    const at = s.indexOf(w.token);
    return <>{s.slice(0, at)}<span className="sim-squiggle" title={w.msg}>{w.token}</span>{s.slice(at + w.token.length)}</>;
  };
  return (
    <div className="demo-stage">
      <div className="sim-code" role="figure" aria-label="검사 중인 코드">
        {code.lines.map((s, i) => (
          <div key={i} className={`sim-code-line ${code.warns.some((w) => w.line === i) ? "warn" : ""}`}>
            <span className="sim-ln">{i + 1}</span><code>{renderLine(s, i)}</code>
          </div>
        ))}
      </div>
      <ul className="plain-list sim-log" aria-live="polite">
        {code.warns.map((w) => <li key={w.msg} className="sim-log-hit">⚠ {w.line + 1}번 줄: {w.msg}</li>)}
        {code.warns.length === 0 && <li className="sim-log-miss">✓ 린트 경고 없음</li>}
        {!fmt && <li className="sim-log-re">들여쓰기·띄어쓰기·세미콜론이 들쭉날쭉 (포매터가 맡는 일)</li>}
      </ul>
      <div className="row">
        <button type="button" className="btn small primary" disabled={fmt} onClick={() => setFmt(true)}>포맷 (모양 정리)</button>
        <button type="button" className="btn small" disabled={fix} onClick={() => setFix(true)}>린트 자동 수정</button>
        <button type="button" className="link" onClick={() => { setFmt(false); setFix(false); }}>처음으로</button>
      </div>
      <span className="muted">밑줄 친 곳에 커서를 올리면 경고 이유가 보입니다. '포맷'은 모양만 정리하고 경고는 그대로 두고, '린트 자동 수정'은 실수를 고치지만 모양은 안 건드립니다.</span>
    </div>
  );
}

/* ───────── 국제화 ───────── */
const LOCALES = [
  { code: "ko-KR", label: "한국어", cur: "KRW", amount: 12900, save: "저장", plural: { other: "사진 {n}장" } as Record<string, string> },
  { code: "en-US", label: "English", cur: "USD", amount: 9.99, save: "Save changes", plural: { one: "{n} photo", other: "{n} photos" } },
  { code: "ja-JP", label: "日本語", cur: "JPY", amount: 1480, save: "変更を保存", plural: { other: "写真{n}枚" } },
  { code: "de-DE", label: "Deutsch", cur: "EUR", amount: 9.49, save: "Änderungen speichern", plural: { one: "{n} Foto", other: "{n} Fotos" } },
  { code: "ar-EG", label: "العربية", cur: "EGP", amount: 499, save: "حفظ التغييرات", rtl: true, plural: { zero: "لا توجد صور", one: "صورة واحدة", two: "صورتان", few: "{n} صور", many: "{n} صورة", other: "{n} صورة" } },
];
const I18N_DATE = new Date(2026, 9, 9, 14, 30);

export function I18nDemo() {
  const [li, setLi] = useState(0);
  const [n, setN] = useState(1);
  const [fluid, setFluid] = useState(false);
  const [over, setOver] = useState(false);
  const btn = useRef<HTMLSpanElement>(null);
  const L = LOCALES[li];
  useLayoutEffect(() => { const el = btn.current; if (el) setOver(el.scrollWidth > el.clientWidth + 1); }, [li, fluid]);
  const rule = new Intl.PluralRules(L.code).select(n);
  const tpl = L.plural[rule] ?? L.plural.other;
  const nf = new Intl.NumberFormat(L.code);
  const rows: [string, string][] = [
    ["날짜", new Intl.DateTimeFormat(L.code, { dateStyle: "long", timeStyle: "short" }).format(I18N_DATE)],
    ["숫자", nf.format(1234567.891)],
    ["값", new Intl.NumberFormat(L.code, { style: "currency", currency: L.cur }).format(L.amount)],
    ["복수형", tpl.replace("{n}", nf.format(n))],
  ];
  return (
    <div className="demo-stage">
      <div className="segmented sim-seg sim-wrap" role="radiogroup" aria-label="언어">
        {LOCALES.map((l, i) => <button type="button" key={l.code} role="radio" aria-checked={li === i} className={li === i ? "on" : ""} onClick={() => setLi(i)} lang={l.code}>{l.label}</button>)}
      </div>
      <div className="sim-screen sim-i18n" dir={L.rtl ? "rtl" : "ltr"} lang={L.code}>
        {rows.map(([k, val]) => <div key={k} className="sim-i18n-row"><span className="muted sim-small" dir="ltr">{k}</span><span className="tabular">{val}</span></div>)}
        <div className="sim-i18n-row">
          <span className="muted sim-small">버튼</span>
          <span ref={btn} className={`sim-fixed-btn ${fluid ? "fluid" : ""} ${over ? "over" : ""}`}>{L.save}</span>
        </div>
      </div>
      <div className="row">
        <span className="muted">사진 수</span>
        <button type="button" className="btn small" aria-label="하나 줄이기" onClick={() => setN((x) => Math.max(0, x - 1))}>−</button>
        <span className="tabular">{n}</span>
        <button type="button" className="btn small" aria-label="하나 늘리기" onClick={() => setN((x) => Math.min(12, x + 1))}>+</button>
        <span className="chip mono">규칙: {rule}</span>
      </div>
      <label className="row"><input type="checkbox" checked={fluid} onChange={(e) => setFluid(e.target.checked)} /> 버튼 폭을 글 길이에 맞추기 (고친 버전)</label>
      {over && <span className="sim-bad sim-small">⚠ 번역이 길어서 버튼 글자가 잘립니다 (한국어 기준으로 폭을 정해 둔 탓)</span>}
      <span className="muted">언어를 바꿔 보세요. 같은 값도 날짜 순서·쉼표·통화 기호가 달라지고(Intl API), 아랍어는 오른쪽에서 왼쪽으로 쓰며 0·1·2·few·many 복수형이 따로 있습니다. 독일어로 바꾸면 버튼이 넘칩니다.</span>
    </div>
  );
}

/* ───────── 퍼지 검색 ───────── */
const FILES = ["StyleSheetRenderer.ts", "settings.json", "UserProfile.tsx", "useDebounce.ts", "package.json", "README.md", "src/router.ts", "ServerSideRender.tsx", "searchIndex.ts", "SignUpForm.tsx", "theme.css", "i18n/ko.json", "userSettings.ts", "SearchBar.tsx"];

function subseq(q: string, s: string): number[] | null {
  const idx: number[] = []; let j = 0;
  const lower = s.toLowerCase();
  for (let i = 0; i < lower.length && j < q.length; i++) if (lower[i] === q[j]) { idx.push(i); j++; }
  return j === q.length ? idx : null;
}
function scoreOf(idx: number[], s: string) {
  let sc = 0;
  idx.forEach((i, k) => {
    if (k > 0 && idx[k - 1] === i - 1) sc += 3;
    if (i === 0 || /[/._-]/.test(s[i - 1]) || (s[i] >= "A" && s[i] <= "Z")) sc += 2;
    if (k > 0) sc -= Math.min(3, (i - idx[k - 1] - 1) * 0.2);
  });
  return sc;
}
function fuzzy(qRaw: string, s: string): { idx: number[]; score: number; typo: boolean } | null {
  const q = qRaw.toLowerCase();
  const hit = subseq(q, s);
  if (hit) return { idx: hit, score: scoreOf(hit, s), typo: false };
  if (q.length < 4) return null;
  let best: { idx: number[]; score: number; typo: boolean } | null = null;
  for (let k = 0; k < q.length; k++) {
    const h = subseq(q.slice(0, k) + q.slice(k + 1), s);
    if (h) { const sc = scoreOf(h, s) - 5; if (!best || sc > best.score) best = { idx: h, score: sc, typo: true }; }
  }
  return best;
}
function Highlight({ s, idx }: { s: string; idx: number[] }) {
  const set = new Set(idx);
  return <>{[...s].map((ch, i) => (set.has(i) ? <mark key={i} className="sim-mark">{ch}</mark> : <span key={i}>{ch}</span>))}</>;
}

export function FuzzySearchDemo() {
  const [q, setQ] = useState("ssr");
  const t = q.trim();
  const plain = t ? FILES.filter((f) => f.toLowerCase().includes(t.toLowerCase())) : [];
  const fz = t ? FILES.map((f) => ({ f, m: fuzzy(t, f) })).filter((x) => x.m).sort((a, b) => b.m!.score - a.m!.score).slice(0, 6) : [];
  return (
    <div className="demo-stage">
      <input className="sim-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="파일 이름 찾기" aria-label="파일 이름 검색" autoComplete="off" spellCheck={false} />
      <div className="row">
        {["ssr", "usrprof", "setings", "pkgjsn"].map((s) => <button type="button" key={s} className="chip sim-try mono" onClick={() => setQ(s)}>{s}</button>)}
      </div>
      <div className="sim-two">
        <div>
          <b className="sim-small">일반 검색 (그대로 포함)</b>
          <ul className="plain-list sim-results">
            {plain.map((f) => {
              const at = f.toLowerCase().indexOf(t.toLowerCase());
              return <li key={f} className="mono"><span><Highlight s={f} idx={Array.from({ length: t.length }, (_, k) => at + k)} /></span></li>;
            })}
            {t && plain.length === 0 && <li className="muted">찾은 게 없음</li>}
          </ul>
        </div>
        <div>
          <b className="sim-small">퍼지 검색</b>
          <ul className="plain-list sim-results">
            {fz.map(({ f, m }) => <li key={f} className="mono"><span><Highlight s={f} idx={m!.idx} /></span>{m!.typo && <span className="chip sim-typo">오타 허용</span>}</li>)}
            {t && fz.length === 0 && <li className="muted">찾은 게 없음</li>}
          </ul>
        </div>
      </div>
      <span className="muted">아래 예시를 눌러 보거나 직접 쳐 보세요. 일반 검색은 글자가 그대로 붙어 있어야 찾지만, 퍼지 검색은 글자 순서만 맞으면 찾고 한 글자 틀려도 찾아 줍니다. 강조된 글자가 일치한 부분입니다.</span>
    </div>
  );
}
