import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLater, Seg, Switch } from "./sim";
import "./perf.css";

/* ───────── 공통 도우미 ───────── */

/* 0 부터 maxMs 까지 흐르는 시계. 다시 재생하면 처음부터 */
export function usePlayback(maxMs: number) {
  const [t, setT] = useState(-1); // -1: 아직 시작 안 함
  const raf = useRef(0);
  const start = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = () => {
      const e = performance.now() - t0;
      setT(Math.min(e, maxMs));
      if (e < maxMs) raf.current = requestAnimationFrame(tick);
    };
    setT(0);
    raf.current = requestAnimationFrame(tick);
  }, [maxMs]);
  const reset = useCallback(() => { cancelAnimationFrame(raf.current); setT(-1); }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { t, start, reset, running: t >= 0 && t < maxMs };
}

const sec1 = (ms: number) => `${(ms / 1000).toFixed(1)}초`;
const fmtMs = (ms: number) => (ms >= 1000 ? sec1(ms) : `${Math.round(ms)}ms`);
const num = (n: number) => n.toLocaleString("ko-KR");

/* ───────── 트리 셰이킹 ───────── */
const LIB = [
  { name: "formatDate", kb: 3.2 }, { name: "debounce", kb: 1.1 }, { name: "deepClone", kb: 4.8 }, { name: "chunk", kb: 0.9 },
  { name: "groupBy", kb: 2.4 }, { name: "parseCSV", kb: 9.6 }, { name: "markdown", kb: 18.5 }, { name: "uuid", kb: 1.7 },
];
const LIB_TOTAL = LIB.reduce((a, f) => a + f.kb, 0);

export function TreeShakingDemo() {
  const [shake, setShake] = useState(true);
  const [used, setUsed] = useState<string[]>(["formatDate", "debounce"]);
  const toggle = (n: string) => setUsed((u) => LIB.map((f) => f.name).filter((x) => (x === n ? !u.includes(n) : u.includes(x))));
  const size = LIB.filter((f) => !shake || used.includes(f.name)).reduce((a, f) => a + f.kb, 0);
  return (
    <div className="demo-stage">
      <Switch on={shake} onChange={setShake} label="트리 셰이킹" />
      <pre className="pf-import"><code>import {"{ "}{used.join(", ") || "…"}{" }"} from "utils";</code></pre>
      <div className="pf-lib" role="group" aria-label="utils 라이브러리의 함수. 눌러서 쓰기와 안 쓰기를 바꿉니다">
        {LIB.map((f) => {
          const on = used.includes(f.name);
          const st = on ? "used" : shake ? "shaken" : "dead";
          return (
            <button type="button" key={f.name} className={`pf-fn ${st}`} aria-pressed={on} onClick={() => toggle(f.name)}>
              <code>{f.name}</code>
              <span className="pf-fn-meta">{f.kb}KB · {on ? "씀" : shake ? "떨어냄" : "안 쓰는데 들어감"}</span>
            </button>
          );
        })}
      </div>
      <div className="sim-bars">
        <div className="sim-bar-label"><span>번들에 들어간 utils</span><b className="tabular">{size.toFixed(1)}KB / {LIB_TOTAL.toFixed(1)}KB</b></div>
        <div className="sim-bar"><div className={`sim-bar-fill ${shake ? "" : "warm"}`} style={{ width: `${(size / LIB_TOTAL) * 100}%` }} /></div>
      </div>
      <span className="muted">함수를 눌러 앱에서 쓰거나 안 쓰게 바꿔 보세요. 트리 셰이킹을 끄면 안 쓰는 함수까지 모두 번들에 들어갑니다.</span>
    </div>
  );
}

/* ───────── 압축·미니파이 ───────── */
const SRC_PRETTY = `// 장바구니 합계를 계산한다
export function calculateCartTotal(items, couponCode) {
  let subtotal = 0;
  for (const item of items) {
    // 수량이 0 이하인 항목은 건너뛴다
    if (item.quantity <= 0) continue;
    subtotal += item.price * item.quantity;
  }
  const discount = couponCode === "WELCOME10" ? subtotal * 0.1 : 0;
  const shippingFee = subtotal - discount >= 30000 ? 0 : 3000;
  return {
    subtotal: subtotal,
    discount: discount,
    shippingFee: shippingFee,
    total: subtotal - discount + shippingFee,
  };
}

// 금액을 "12,300원" 꼴로 바꾼다
export function formatPrice(amount) {
  return amount.toLocaleString("ko-KR") + "원";
}
`;
const SRC_MIN = `export function calculateCartTotal(t,o){let e=0;for(const n of t)n.quantity<=0||(e+=n.price*n.quantity);const r="WELCOME10"===o?.1*e:0,c=e-r>=3e4?0:3e3;return{subtotal:e,discount:r,shippingFee:c,total:e-r+c}}export function formatPrice(t){return t.toLocaleString("ko-KR")+"원"}`;
const SAMPLE_JSON = JSON.stringify({
  products: Array.from({ length: 24 }, (_, i) => ({
    id: 1001 + i, name: ["울 니트", "코듀로이 팬츠", "트렌치코트", "첼시 부츠"][i % 4] + ` ${i + 1}`,
    price: 29000 + (i % 6) * 10000, category: ["top", "bottom", "outer", "shoes"][i % 4],
    inStock: i % 5 !== 0, tags: ["가을", i % 2 ? "신상품" : "세일"],
  })),
}, null, 2);
const SAMPLES = {
  js: { pretty: SRC_PRETTY, min: SRC_MIN },
  json: { pretty: SAMPLE_JSON, min: JSON.stringify(JSON.parse(SAMPLE_JSON)) },
};
type SampleKey = keyof typeof SAMPLES;
const bytesOf = (s: string) => new TextEncoder().encode(s).length;

async function gzipBytes(text: string): Promise<number | null> {
  if (typeof CompressionStream === "undefined") return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return (await new Response(stream).arrayBuffer()).byteLength;
}

export function CompressionDemo() {
  const [sample, setSample] = useState<SampleKey>("js");
  const [view, setView] = useState<"pretty" | "min">("pretty");
  const [gz, setGz] = useState<Partial<Record<SampleKey, number | null>>>({}); // 없음: 재는 중, null: 못 잼
  useEffect(() => {
    let alive = true;
    (Object.keys(SAMPLES) as SampleKey[]).forEach((k) => {
      gzipBytes(SAMPLES[k].min).then((n) => { if (alive) setGz((g) => ({ ...g, [k]: n })); }).catch(() => { if (alive) setGz((g) => ({ ...g, [k]: null })); });
    });
    return () => { alive = false; };
  }, []);
  const src = SAMPLES[sample];
  const raw = bytesOf(src.pretty);
  const rows: { label: string; bytes: number | null | undefined }[] = [
    { label: "원본", bytes: raw },
    { label: "미니파이 (공백·이름 줄이기)", bytes: bytesOf(src.min) },
    { label: "미니파이 + gzip", bytes: gz[sample] },
  ];
  return (
    <div className="demo-stage">
      <div className="row">
        <Seg label="예시 파일" value={sample} onChange={setSample} options={[["js", "자바스크립트"], ["json", "JSON 응답"]]} />
        <Seg label="코드 보기" value={view} onChange={setView} options={[["pretty", "원본"], ["min", "미니파이"]]} />
      </div>
      <pre className={`pf-src ${view}`} tabIndex={0} aria-label="파일 내용"><code>{view === "pretty" ? src.pretty : src.min}</code></pre>
      <div className="sim-bars">
        {rows.map((r, i) => (
          <div key={r.label}>
            <div className="sim-bar-label">
              <span>{r.label}</span>
              <b className="tabular">{r.bytes == null ? (r.bytes === null ? "이 브라우저에선 못 잼" : "재는 중…") : `${num(r.bytes)}바이트${i ? ` (−${Math.round((1 - r.bytes / raw) * 100)}%)` : ""}`}</b>
            </div>
            <div className="sim-bar"><div className={`sim-bar-fill ${i === 0 ? "warm" : ""}`} style={{ width: `${((r.bytes ?? 0) / raw) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <span className="muted">gzip 크기는 이 브라우저가 지금 실제로 압축해서 잰 값입니다. 같은 글자가 많이 반복될수록(JSON 처럼) 더 많이 줄어듭니다.</span>
    </div>
  );
}

/* ───────── CDN ───────── */
const CDN_CITIES = [
  { id: "seoul", name: "서울", rtt: 190 },
  { id: "london", name: "런던", rtt: 80 },
  { id: "sp", name: "상파울루", rtt: 125 },
] as const;
type CdnCity = (typeof CDN_CITIES)[number]["id"];
const EDGE_RTT = 12, TRIPS = 3; // 연결·암호화·요청에 왕복 세 번

export function CdnDemo() {
  const [cdn, setCdn] = useState(true);
  const [city, setCity] = useState<CdnCity>("seoul");
  const [cached, setCached] = useState<CdnCity[]>([]);
  const [leg, setLeg] = useState<null | "direct" | "edge" | "miss">(null);
  const [log, setLog] = useState<{ id: number; text: string; good: boolean }[]>([]);
  const later = useLater();
  const uid = useRef(0);
  const c = CDN_CITIES.find((x) => x.id === city)!;
  const addLog = (text: string, good: boolean) => setLog((l) => [{ id: uid.current++, text, good }, ...l].slice(0, 4));
  const fetchIt = () => {
    if (leg) return;
    let ms: number, text: string, good: boolean, kind: "direct" | "edge" | "miss";
    if (!cdn) { ms = c.rtt * TRIPS; kind = "direct"; text = `${c.name} → 버지니아 오리진까지 왕복 · ${ms}ms`; good = false; }
    else if (cached.includes(city)) { ms = EDGE_RTT * TRIPS; kind = "edge"; text = `${c.name} 엣지 · 캐시 적중 · ${ms}ms`; good = true; }
    else { ms = EDGE_RTT * TRIPS + c.rtt; kind = "miss"; text = `${c.name} 엣지 · 캐시 미스 → 오리진에서 받아 옴 · ${ms}ms`; good = false; }
    setLeg(kind);
    later.after(Math.max(ms, 160), () => {
      setLeg(null);
      if (kind === "miss") setCached((xs) => [...xs, city]);
      addLog(text, good);
    });
  };
  const has = cached.includes(city);
  return (
    <div className="demo-stage">
      <div className="row">
        <Switch on={cdn} onChange={(v) => { if (!leg) setCdn(v); }} label="CDN 쓰기" />
        <Seg label="사용자 위치" value={city} onChange={(v) => { if (!leg) setCity(v); }} options={CDN_CITIES.map((x) => [x.id, x.name] as [CdnCity, string])} />
      </div>
      <div className="pf-cdn" aria-hidden="true">
        <div className="pf-node"><span>👤</span>{c.name} 사용자</div>
        <div className={`pf-link ${leg ? "active" : ""}`} />
        <div className={`pf-node ${cdn ? "" : "off"}`}>
          <span>🗄️</span>{c.name} 엣지
          {cdn && <span className={`sim-tag ${has ? "ready" : "none"}`}>{has ? "사본 있음" : "사본 없음"}</span>}
        </div>
        <div className={`pf-link long ${leg === "direct" || leg === "miss" ? "active" : ""}`} />
        <div className="pf-node"><span>🏢</span>버지니아 오리진</div>
      </div>
      <div className="row">
        <button type="button" className="btn primary" disabled={!!leg} onClick={fetchIt}>{leg ? "받는 중…" : "사진 받기"}</button>
        <button type="button" className="btn small" disabled={!!leg} onClick={() => { setCached([]); setLog([]); }}>엣지 사본 지우기</button>
      </div>
      <ul className="plain-list pf-log" aria-live="polite">
        {log.map((l) => <li key={l.id} className={l.good ? "good" : "bad"}>{l.text}</li>)}
      </ul>
      <span className="muted">CDN 을 끄고 켜며 서울에서 두 번씩 받아 보세요. 처음 한 번은 엣지도 오리진에서 받아 와야 하고, 그다음부터는 가까운 엣지가 바로 줍니다.</span>
    </div>
  );
}

/* ───────── 크리티컬 CSS ───────── */
type CssMode = "block" | "critical" | "fouc";
const HTML_AT = 250, CSS_AT = 1600, CSS_END = 2000;

export function CriticalCssDemo() {
  const [mode, setMode] = useState<CssMode>("block");
  const pb = usePlayback(CSS_END);
  const t = pb.t;
  let view: "blank" | "raw" | "top" | "full" = "full";
  if (t >= 0) {
    if (t < HTML_AT) view = "blank";
    else if (t < CSS_AT) view = mode === "block" ? "blank" : mode === "critical" ? "top" : "raw";
  }
  const first = mode === "block" ? CSS_AT : HTML_AT;
  const done = t >= CSS_END;
  return (
    <div className="demo-stage">
      <Seg label="CSS 받는 방식" value={mode} onChange={(m) => { setMode(m); pb.start(); }}
        options={[["block", "CSS 다 받고 그리기"], ["critical", "첫 화면 CSS 먼저"], ["fouc", "CSS 없이 먼저 그리기"]]} />
      <div className="row">
        <button type="button" className="btn primary" onClick={pb.start}>새로고침</button>
        <span className="muted tabular">{t >= 0 ? sec1(t) : ""}</span>
      </div>
      <div className={`pf-cp-win ${view}`} aria-label="불러오는 중인 쇼핑몰 화면">
        {view !== "blank" && (
          <div className="pf-cp-page">
            <nav className="pf-cp-nav"><b>가을상점</b><span>신상품</span><span>세일</span><span>장바구니</span></nav>
            <section className="pf-cp-hero"><b>가을 신상품 30% 할인</b><span>니트·코트·부츠를 이번 주까지</span><span className="pf-cp-btn">보러 가기</span></section>
            <div className="pf-cp-fold">여기부터 첫 화면 밖</div>
            <section className="pf-cp-below"><span>추천 상품</span><span>울 니트 39,000원</span></section>
          </div>
        )}
      </div>
      <div className="pf-timeline" aria-hidden="true">
        <span className="pf-tl-mark" style={{ left: `${(HTML_AT / CSS_END) * 100}%` }}>HTML</span>
        <span className="pf-tl-mark" style={{ left: `${(CSS_AT / CSS_END) * 100}%` }}>CSS 전부</span>
        {t >= 0 && <span className="pf-tl-now" style={{ left: `${(t / CSS_END) * 100}%` }} />}
      </div>
      <div className="sim-meter" aria-live="polite">
        {done ? (
          mode === "block" ? <span className="sim-bad">빈 화면 {sec1(CSS_AT)} 뒤에 처음 보임</span>
            : mode === "critical" ? <span className="sim-good">{sec1(HTML_AT)}에 첫 화면이 제 모양으로 보임</span>
            : <span className="sim-bad">{sec1(first)}에 보이지만 {sec1(CSS_AT)}에 모양이 확 바뀜 (FOUC)</span>
        ) : <span className="muted">세 방식을 하나씩 골라 보세요.</span>}
      </div>
      <span className="muted">큰 CSS 파일 하나가 1.6초 걸린다고 해 봅니다. 첫 화면에 필요한 스타일만 HTML 안에 넣으면 나머지를 기다리지 않고 바로 그립니다.</span>
    </div>
  );
}

/* ───────── 웹폰트 로딩 ───────── */
type FontDisplay = "block" | "swap" | "optional";
const FONT_TEXT = "가을이 깊어 가는 저녁, 창밖으로 노랗게 물든 은행잎이 하나둘 떨어집니다. 따뜻한 차를 앞에 두고 오래된 편지를 다시 읽어 봅니다.";

function fontPlan(fd: FontDisplay, arrival: number) {
  const block = fd === "block" ? 3000 : 100;
  const visibleAt = Math.min(arrival, block);
  const useFont = fd !== "optional" || arrival <= block;
  const swapAt = useFont && arrival > block ? arrival : null;
  return { block, visibleAt, useFont, swapAt };
}

export function FontLoadingDemo() {
  const [fd, setFd] = useState<FontDisplay>("swap");
  const [loadMs, setLoadMs] = useState(1500);
  const [cached, setCached] = useState(false);
  const [runCached, setRunCached] = useState(true);
  const pb = usePlayback(4500);
  const later = useLater();
  const arrival = runCached ? 0 : loadMs;
  const plan = fontPlan(fd, arrival);
  const t = pb.t < 0 ? Infinity : pb.t;
  const start = (next?: FontDisplay) => {
    if (next) setFd(next);
    setRunCached(cached);
    later.clearAll();
    if (!cached) later.after(loadMs, () => setCached(true)); // 다 받으면 다음 방문을 위해 캐시에 남는다
    pb.start();
  };
  let st: "hidden" | "fallback" | "font";
  if (t < plan.visibleAt) st = "hidden";
  else if (plan.useFont && t >= arrival) st = "font";
  else st = "fallback";
  const label = { hidden: "글자 숨김 (FOIT)", fallback: "기본 글꼴로 먼저 (FOUT)", font: "웹폰트" }[st];
  return (
    <div className="demo-stage">
      <Seg label="font-display" value={fd} onChange={(v) => start(v)} options={[["block", "block"], ["swap", "swap"], ["optional", "optional"]]} />
      <label className="row pf-range">
        글꼴 받는 시간 <b className="tabular">{sec1(loadMs)}</b>
        <input type="range" min={100} max={4000} step={100} value={loadMs} onChange={(e) => setLoadMs(Number(e.target.value))} />
      </label>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => start()}>새로고침</button>
        <button type="button" className="btn small" onClick={() => setCached(false)}>글꼴 캐시 비우기</button>
        <span className={`sim-tag ${cached ? "ready" : "none"}`}>{cached ? "캐시에 있음" : "캐시 없음"}</span>
      </div>
      <div className={`pf-font-box ${st}`}>
        <span className="chip">{label}</span>
        <p className="pf-font-text">{FONT_TEXT}</p>
      </div>
      <div className="sim-meter" aria-live="polite">
        {pb.t < 0 ? <span className="muted">캐시를 비우고 새로고침해 보세요.</span>
          : <>
            <span>글자 보이기까지 <b className="tabular">{sec1(plan.visibleAt)}</b></span>
            {plan.swapAt !== null ? <span className="sim-bad">{sec1(plan.swapAt)}에 글꼴이 바뀌며 줄이 밀림</span>
              : !plan.useFont ? <span className="muted">이번엔 기본 글꼴로 끝 · 다음 방문부터 웹폰트</span>
              : <span className="sim-good">바뀌는 순간 없음</span>}
          </>}
      </div>
      <span className="muted">block 은 최대 3초까지 글자를 숨기고, swap 은 기본 글꼴로 바로 보여 준 뒤 바꾸고, optional 은 금방 안 오면 이번엔 포기하고 다음 방문에 씁니다.</span>
    </div>
  );
}

/* ───────── 렌더링 방식 ───────── */
type RenderMode = "csr" | "ssr" | "ssg";
const RM_PLAN: Record<RenderMode, { spinner?: number; content: number; interactive: number; steps: [number, string][] }> = {
  csr: { spinner: 1000, content: 1700, interactive: 1700, steps: [[0, "빈 HTML 받음 · 자바스크립트 받는 중"], [1000, "앱이 켜지고 데이터를 요청"], [1700, "브라우저가 화면을 그림"]] },
  ssr: { content: 700, interactive: 1400, steps: [[0, "서버가 데이터를 묻고 HTML 을 만드는 중"], [700, "완성된 HTML 도착 · 버튼은 아직"], [1400, "하이드레이션 끝 · 버튼 살아남"]] },
  ssg: { content: 150, interactive: 850, steps: [[0, "CDN 에서 미리 만든 HTML 받는 중"], [150, "HTML 도착 · 버튼은 아직"], [850, "하이드레이션 끝 · 버튼 살아남"]] },
};
const won = (n: number) => `${num(n)}원`;

export function RenderingModesDemo() {
  const [mode, setMode] = useState<RenderMode>("csr");
  const [dbPrice, setDbPrice] = useState(39000);
  const [builtPrice, setBuiltPrice] = useState(39000);
  const [shownPrice, setShownPrice] = useState(39000);
  const [tap, setTap] = useState<null | "dead" | "ok">(null);
  const pb = usePlayback(1900);
  const plan = RM_PLAN[mode];
  const t = pb.t < 0 ? Infinity : pb.t;
  const open = (m = mode) => { setMode(m); setShownPrice(m === "ssg" ? builtPrice : dbPrice); setTap(null); pb.start(); };
  const screen = t >= plan.content ? "content" : plan.spinner !== undefined && t >= plan.spinner ? "spinner" : "blank";
  const live = t >= plan.interactive;
  const step = pb.t < 0 ? null : [...plan.steps].reverse().find(([at]) => t >= at)?.[1];
  const stale = pb.t >= 0 && shownPrice !== dbPrice;
  return (
    <div className="demo-stage">
      <Seg label="렌더링 방식" value={mode} onChange={(m) => open(m)} options={[["csr", "CSR"], ["ssr", "SSR"], ["ssg", "SSG"]]} />
      <div className="row">
        <button type="button" className="btn primary" onClick={() => open()}>페이지 열기</button>
        <button type="button" className="btn small" onClick={() => setDbPrice((p) => (p === 39000 ? 34000 : 39000))}>DB 가격 바꾸기</button>
        {mode === "ssg" && <button type="button" className="btn small" onClick={() => setBuiltPrice(dbPrice)}>다시 빌드</button>}
      </div>
      <div className="sim-screen pf-rm-screen" aria-live="polite">
        {screen === "blank" ? <span className="muted">(빈 화면)</span>
          : screen === "spinner" ? <span className="pf-spin" aria-label="불러오는 중" />
          : <>
            <b>가을 울 니트</b>
            <span className="sim-big tabular">{won(shownPrice)}</span>
            <div className="row">
              <button type="button" className="btn small primary" onClick={() => setTap(live ? "ok" : "dead")}>장바구니 담기</button>
              {tap === "dead" && <span className="sim-bad">눌렀는데 반응 없음</span>}
              {tap === "ok" && <span className="sim-good">담았어요</span>}
            </div>
          </>}
      </div>
      <div className="sim-meter">
        <span className="muted">{step ?? "방식을 고르고 페이지를 열어 보세요."}</span>
      </div>
      {pb.t >= 0 && (
        <div className="sim-meter">
          <span>내용 보임 <b className="tabular">{sec1(plan.content)}</b></span>
          <span>누를 수 있음 <b className="tabular">{sec1(plan.interactive)}</b></span>
          {stale ? <span className="sim-bad">가격이 빌드 때 값 (DB 는 {won(dbPrice)})</span> : <span className="sim-good">가격 최신</span>}
        </div>
      )}
      <span className="muted">'DB 가격 바꾸기'를 누른 뒤 다시 열어 보세요. CSR·SSR 은 바로 새 가격이 나오지만, SSG 는 다시 빌드해야 바뀝니다.</span>
    </div>
  );
}

/* ───────── 요청 중복 제거·묶기 ───────── */
type DedupMode = "each" | "dedup" | "batch";
const WIDGETS = [
  { id: "head", label: "머리말", user: "me" }, { id: "side", label: "사이드바", user: "me" },
  { id: "c1", label: "댓글 1", user: "3" }, { id: "c2", label: "댓글 2", user: "7" },
  { id: "c3", label: "댓글 3", user: "3" }, { id: "noti", label: "알림", user: "me" },
];
const DEDUP_USERS: Record<string, string> = { me: "김하늘 (나)", 3: "박서준", 7: "이도윤" };

function dedupRequests(mode: DedupMode) {
  if (mode === "batch") return [{ url: "/users?ids=me,3,7", serves: WIDGETS.map((w) => w.id), dur: 420 }];
  const groups = mode === "each"
    ? WIDGETS.map((w) => ({ user: w.user, serves: [w.id] }))
    : [...new Set(WIDGETS.map((w) => w.user))].map((u) => ({ user: u, serves: WIDGETS.filter((w) => w.user === u).map((w) => w.id) }));
  return groups.map((g, i) => ({ url: `/users/${g.user}`, serves: g.serves, dur: 330 + i * 45 }));
}

export function RequestDedupDemo() {
  const [mode, setMode] = useState<DedupMode>("each");
  const pb = usePlayback(700);
  const reqs = useMemo(() => dedupRequests(mode), [mode]);
  const t = pb.t;
  const ready = (wid: string) => t >= 0 && reqs.some((r) => r.serves.includes(wid) && t >= r.dur);
  const lookups = mode === "each" ? WIDGETS.length : new Set(WIDGETS.map((w) => w.user)).size;
  return (
    <div className="demo-stage">
      <Seg label="요청 방식" value={mode} onChange={(m) => { setMode(m); pb.reset(); }} options={[["each", "부품마다 요청"], ["dedup", "같은 요청 합치기"], ["batch", "한 번에 묶기"]]} />
      <button type="button" className="btn primary pf-self-start" onClick={pb.start}>화면 그리기</button>
      <div className="pf-widgets">
        {WIDGETS.map((w) => (
          <div key={w.id} className={`pf-widget ${ready(w.id) ? "ready" : ""}`}>
            <span className="muted">{w.label}</span>
            <b>{ready(w.id) ? DEDUP_USERS[w.user] : t >= 0 ? "…" : "—"}</b>
          </div>
        ))}
      </div>
      <ul className="plain-list pf-net" aria-label="네트워크 요청 목록">
        {t >= 0 && reqs.map((r, i) => {
          const k = Math.min(1, t / r.dur);
          return (
            <li key={i}>
              <code>GET {r.url}</code>
              <span className="pf-net-bar"><span style={{ width: `${k * 100}%` }} /></span>
              <span className="tabular">{k >= 1 ? "200" : "…"}</span>
            </li>
          );
        })}
      </ul>
      <div className="sim-meter">
        <span>요청 <b className={`tabular ${reqs.length > 3 ? "sim-bad" : "sim-good"}`}>{reqs.length}개</b></span>
        <span>서버가 사용자 찾은 횟수 <b className="tabular">{lookups}번</b></span>
      </div>
      <span className="muted">여섯 부품이 사용자 세 명의 정보를 원합니다. 같은 사람을 여러 번 묻지 않게 합치고, 남은 것도 한 요청으로 묶을 수 있습니다.</span>
    </div>
  );
}

/* ───────── 오버페칭·언더페칭 ───────── */
type FetchMode = "over" | "under" | "exact";
const FRIENDS = [
  { id: 1, name: "김하늘", avatar: "🦊", post: "오늘 본 노을" },
  { id: 2, name: "박서준", avatar: "🐻", post: "주말 등산 후기" },
  { id: 3, name: "이도윤", avatar: "🐼", post: "새로 산 키보드" },
  { id: 4, name: "최유나", avatar: "🐰", post: "제주 카페 추천" },
];
const fullUser = (f: (typeof FRIENDS)[number]) => ({
  id: f.id, name: f.name, avatar: f.avatar, email: `user${f.id}@mail.com`, phone: `010-1234-56${f.id}0`,
  address: { city: "서울", street: "테헤란로 123", zip: "06234" }, birthday: "1994-03-12", joinedAt: "2021-07-01T09:00:00Z",
  bio: "사진 찍고 걷는 걸 좋아합니다. 주말마다 새로운 동네를 찾아다니며 작은 카페와 서점을 기록하고 있어요.",
  settings: { theme: "dark", language: "ko", notifications: { email: true, push: false, weekly: true } },
  followers: 1234, following: 321,
  posts: Array.from({ length: 12 }, (_, i) => ({ id: f.id * 100 + i, title: i === 0 ? f.post : `지난 글 ${i}`, body: "본문이 길게 이어집니다. ".repeat(12), likes: 10 + i, createdAt: "2024-10-0" + ((i % 9) + 1) })),
});
const FETCH_PLAN: Record<FetchMode, { reqs: { label: string; start: number; dur: number; bytes: number }[]; preview: [string, boolean][] }> = {
  over: {
    reqs: [{ label: "GET /users", start: 0, dur: 520, bytes: JSON.stringify(FRIENDS.map(fullUser)).length }],
    preview: [["{", false], ['  "id": 1,', false], ['  "name": "김하늘",', true], ['  "avatar": "🦊",', true], ['  "email": "user1@mail.com",', false], ['  "phone": "010-1234-5610",', false],
      ['  "address": { … },', false], ['  "bio": "사진 찍고 걷는 걸 …",', false], ['  "settings": { … },', false], ['  "posts": [', false], ['    { "title": "오늘 본 노을", "body": "…" },', true], ["    … 11개 더", false], ["  ]", false], ["}", false]],
  },
  under: {
    reqs: [
      { label: "GET /users?fields=name,avatar", start: 0, dur: 260, bytes: JSON.stringify(FRIENDS.map(({ id, name, avatar }) => ({ id, name, avatar }))).length },
      ...FRIENDS.map((f, i) => ({ label: `GET /users/${f.id}/posts?limit=1`, start: 260, dur: 240 + i * 20, bytes: JSON.stringify([{ id: f.id * 100, title: f.post }]).length })),
    ],
    preview: [["[", false], ['  { "id": 1, "name": "김하늘", "avatar": "🦊" },', true], ["  …", false], ["]", false], ["→ 최근 글 제목이 없어 사람마다 한 번씩 더 요청", false]],
  },
  exact: {
    reqs: [{ label: "POST /graphql", start: 0, dur: 300, bytes: JSON.stringify({ data: { users: FRIENDS.map((f) => ({ name: f.name, avatar: f.avatar, latestPost: { title: f.post } })) } }).length }],
    preview: [["query {", false], ["  users {", false], ["    name", true], ["    avatar", true], ["    latestPost { title }", true], ["  }", false], ["}", false]],
  },
};
const SCALE_MS = 560;

export function OverfetchingDemo() {
  const [mode, setMode] = useState<FetchMode>("over");
  const plan = FETCH_PLAN[mode];
  const bytes = plan.reqs.reduce((a, r) => a + r.bytes, 0);
  const total = Math.max(...plan.reqs.map((r) => r.start + r.dur));
  return (
    <div className="demo-stage">
      <Seg label="받는 방식" value={mode} onChange={setMode} options={[["over", "통째로 받기"], ["under", "모자라서 더 받기"], ["exact", "필요한 필드만"]]} />
      <div className="pf-two">
        <ul className="plain-list pf-friends" aria-label="친구 목록 화면">
          {FRIENDS.map((f) => <li key={f.id}><span aria-hidden="true">{f.avatar}</span><b>{f.name}</b><span className="muted">{f.post}</span></li>)}
        </ul>
        <pre className="pf-json" tabIndex={0} aria-label="응답 내용 일부">
          {plan.preview.map(([line, used], i) => <span key={i} className={used ? "used" : ""}>{line}{"\n"}</span>)}
        </pre>
      </div>
      <ul className="plain-list pf-wf" aria-label="요청 흐름">
        {plan.reqs.map((r, i) => (
          <li key={i}>
            <code>{r.label}</code>
            <span className="pf-wf-track"><span style={{ left: `${(r.start / SCALE_MS) * 100}%`, width: `${(r.dur / SCALE_MS) * 100}%` }} /></span>
          </li>
        ))}
      </ul>
      <div className="sim-meter">
        <span>요청 <b className="tabular">{plan.reqs.length}개</b></span>
        <span>받은 양 <b className={`tabular ${bytes > 5000 ? "sim-bad" : "sim-good"}`}>{num(bytes)}바이트</b></span>
        <span>다 받기까지 <b className="tabular">{fmtMs(total)}</b></span>
      </div>
      <span className="muted">화면엔 이름·사진·최근 글 제목만 씁니다. 오른쪽 응답에서 색칠된 줄만 실제로 쓰는 부분입니다.</span>
    </div>
  );
}

/* ───────── N+1 문제 ───────── */
const Q_MS = 8, JOIN_MS = 14;
const authorOf = (i: number) => ((i * 7 + 3) % 12) + 1;

export function NPlusOneDemo() {
  const [mode, setMode] = useState<"n1" | "join">("n1");
  const [n, setN] = useState(10);
  const [shown, setShown] = useState(0);
  const later = useLater();
  const box = useRef<HTMLOListElement>(null);
  const queries = useMemo(() => (mode === "join"
    ? [`SELECT posts.*, users.name FROM posts JOIN users ON users.id = posts.author_id LIMIT ${n};`]
    : [`SELECT * FROM posts LIMIT ${n};`, ...Array.from({ length: n }, (_, i) => `SELECT * FROM users WHERE id = ${authorOf(i)};`)]), [mode, n]);
  const run = () => {
    later.clearAll();
    setShown(0);
    queries.forEach((_, i) => later.after(60 + i * 45, () => setShown(i + 1)));
  };
  useEffect(() => { later.clearAll(); setShown(0); }, [mode, n, later]);
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [shown]);
  const totalMs = mode === "join" ? JOIN_MS : queries.length * Q_MS;
  const doneAll = shown === queries.length;
  return (
    <div className="demo-stage">
      <Seg label="불러오는 방식" value={mode} onChange={setMode} options={[["n1", "글마다 작성자 묻기"], ["join", "JOIN 으로 한 번에"]]} />
      <label className="row pf-range">
        글 <b className="tabular">{n}개</b>
        <input type="range" min={5} max={50} step={5} value={n} onChange={(e) => setN(Number(e.target.value))} />
      </label>
      <pre className="pf-import"><code>{mode === "n1"
        ? "for (const post of posts)\n  post.author = await db.user(post.authorId);"
        : "db.posts.findMany({ include: { author: true } });"}</code></pre>
      <button type="button" className="btn primary pf-self-start" onClick={run}>목록 불러오기</button>
      <ol ref={box} className="pf-sql" aria-label="데이터베이스에 보낸 쿼리">
        {queries.slice(0, shown).map((q, i) => <li key={i}><code>{q}</code></li>)}
      </ol>
      <div className="sim-meter" aria-live="polite">
        <span>쿼리 <b className={`tabular ${queries.length > 2 ? "sim-bad" : "sim-good"}`}>{doneAll ? queries.length : shown}개</b> {mode === "n1" && <span className="muted">(1 + {n})</span>}</span>
        <span>{doneAll && shown > 0 ? <>걸린 시간 약 <b className="tabular">{totalMs}ms</b></> : <span className="muted">쿼리 한 번 왕복 약 {Q_MS}ms 로 가정</span>}</span>
      </div>
      <span className="muted">글 수를 늘려 보세요. 글마다 묻는 방식은 쿼리가 글 수만큼 늘지만, JOIN 은 늘 한 번입니다.</span>
    </div>
  );
}

/* ───────── DB 인덱스 ───────── */
const DB_ROWS = 1_000_000, DB_CELLS = 200, SCAN_MS = 1600, ROWS_PER_MS = 2500;

export function DbIndexDemo() {
  const [indexed, setIndexed] = useState(false);
  const [target, setTarget] = useState(734219);
  const [run, setRun] = useState<{ indexed: boolean; target: number } | null>(null);
  const pb = usePlayback(SCAN_MS);
  const go = (tg = target) => { setTarget(tg); setRun({ indexed, target: tg }); pb.start(); };
  const t = pb.t;
  const scanDur = run ? (run.target / DB_ROWS) * SCAN_MS : 0;
  const scanned = run && !run.indexed && t >= 0 ? Math.min(run.target, Math.round((t / scanDur) * run.target)) : 0;
  const found = run && t >= 0 && (run.indexed ? t >= 750 : scanned >= run.target);
  const level = run?.indexed && t >= 0 ? Math.min(3, Math.floor(t / 250) + 1) : 0;
  const tg = run?.target ?? target;
  const l1 = Math.floor(tg / 250000), l2 = Math.floor((tg % 250000) / 62500);
  const range = (a: number, b: number) => `${num(a)}~${num(b)}`;
  return (
    <div className="demo-stage">
      <div className="row">
        <Switch on={indexed} onChange={(v) => { setIndexed(v); pb.reset(); setRun(null); }} label="email 열에 인덱스" />
      </div>
      <pre className="pf-import"><code>SELECT * FROM users{"\n"}WHERE email = 'user{tg}@mail.com';</code></pre>
      <div className="row">
        <button type="button" className="btn primary" disabled={pb.running} onClick={() => go()}>찾기</button>
        <button type="button" className="btn small" disabled={pb.running} onClick={() => go(Math.floor(Math.random() * (DB_ROWS - 1)) + 1)}>다른 사용자 찾기</button>
      </div>
      {indexed ? (
        <div className="pf-btree" aria-label="B-tree 인덱스를 따라 내려가는 길">
          <div className="pf-bt-level"><span className={`pf-bt-node ${level >= 1 ? "on" : ""}`}>user1~user1,000,000</span></div>
          <div className="pf-bt-level">{[0, 1, 2, 3].map((i) => <span key={i} className={`pf-bt-node ${level >= 2 && i === l1 ? "on" : ""}`}>{range(i * 250000, i * 250000 + 249999)}</span>)}</div>
          <div className="pf-bt-level">{[0, 1, 2, 3].map((i) => { const a = l1 * 250000 + i * 62500; return <span key={i} className={`pf-bt-node ${level >= 3 && i === l2 ? "on" : ""}`}>{range(a, a + 62499)}</span>; })}</div>
        </div>
      ) : (
        <div className="pf-scan" aria-label="표를 처음부터 훑는 모습. 한 칸에 5,000행">
          {Array.from({ length: DB_CELLS }, (_, i) => {
            const cellRows = DB_ROWS / DB_CELLS;
            const hit = run && i === Math.floor((run.target - 1) / cellRows);
            const seen = scanned > i * cellRows;
            return <span key={i} className={`pf-scan-cell ${seen ? "seen" : ""} ${hit && found ? "hit" : ""}`} />;
          })}
        </div>
      )}
      <div className="sim-meter" aria-live="polite">
        {run ? (
          run.indexed
            ? <><span>본 칸 <b className="tabular">{level}개</b> (나무 깊이)</span>{found && <span className="sim-good">찾음 · 0.1ms 미만 · Index Scan</span>}</>
            : <><span>훑은 행 <b className="tabular">{num(scanned)}</b> / {num(DB_ROWS)}</span>{found && <span className="sim-bad">찾음 · 약 {num(Math.round(run.target / ROWS_PER_MS))}ms · Seq Scan</span>}</>
        ) : <span className="muted">사용자 100만 명이 든 표에서 이메일로 한 명을 찾습니다.</span>}
      </div>
      <span className="muted">인덱스를 켜고 끄며 찾아보세요. 인덱스가 있으면 정렬된 나무를 세 단계만 내려가면 되지만, 새 행을 넣을 때마다 이 나무도 고쳐야 합니다.</span>
    </div>
  );
}
