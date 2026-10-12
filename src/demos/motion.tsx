import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { photo } from "./media";
import "./motion.css";

const RM_QUERY = "(prefers-reduced-motion: reduce)";

/* 사용자의 OS '움직임 줄이기' 설정을 실시간으로 읽는다 */
function useOsReducedMotion(): boolean {
  const [r, setR] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(RM_QUERY).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(RM_QUERY);
    const on = () => setR(m.matches);
    on();
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return r;
}

function OsNote({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="mo-note">지금 기기에서 '움직임 줄이기'가 켜져 있어 이 예시의 움직임은 거의 바로 끝납니다.</span>;
}

/* 0→1 사이 값을 rAF 로 부드럽게 옮긴다. 도중에 다른 목표를 주면 지금 값에서 이어 간다. */
function useTween(reduce: boolean): [number, (to: number, ms?: number) => void, (v: number) => void] {
  const [v, setV] = useState(0);
  const cur = useRef(0);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const set = useCallback((x: number) => { cancelAnimationFrame(raf.current); cur.current = x; setV(x); }, []);
  const to = useCallback((target: number, ms = 320) => {
    cancelAnimationFrame(raf.current);
    const from = cur.current;
    const d = ms * Math.abs(target - from);
    if (reduce || d < 1) { cur.current = target; setV(target); return; }
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / d);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const x = from + (target - from) * e;
      cur.current = x; setV(x);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [reduce]);
  return [v, to, set];
}

/* ───────── 지속 시간 기준 ───────── */
const DURS = [
  { ms: 100, label: "너무 빠름", tone: "warn" },
  { ms: 200, label: "적당", tone: "good" },
  { ms: 300, label: "적당", tone: "good" },
  { ms: 500, label: "느림", tone: "warn" },
  { ms: 1000, label: "굼뜸", tone: "bad" },
];
export function DurationDemo() {
  const [on, setOn] = useState(false);
  const reduce = useOsReducedMotion();
  return (
    <div className="demo-stage">
      <div className="row">
        <button type="button" className="btn primary" onClick={() => setOn(!on)}>{on ? "되돌리기" : "다섯 개 동시에 움직이기"}</button>
      </div>
      <div className="mo-dur">
        {DURS.map((d) => (
          <div className="mo-dur-row" key={d.ms}>
            <span className="mo-dur-ms mono">{d.ms}ms</span>
            <div className="mo-dur-track"><span className={`mo-dur-dot ${on ? "on" : ""}`} style={{ transitionDuration: `${d.ms}ms` }} /></div>
            <span className={`mo-dur-tag ${d.tone}`}>{d.label}</span>
          </div>
        ))}
      </div>
      <OsNote show={reduce} />
      <span className="muted">같은 거리를 다섯 가지 길이로 움직입니다. 몇 번 눌러 보세요. 100ms 는 눈으로 따라가기 어렵고, 500ms 부터는 기다리는 느낌이 납니다.</span>
    </div>
  );
}

/* ───────── 마이크로 인터랙션 ───────── */
export function MicroInteractionDemo() {
  const [a, setA] = useState({ liked: false, n: 24, copied: false });
  const [b, setB] = useState({ liked: false, n: 24, copied: false });
  const [burst, setBurst] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copyB = () => {
    setB((s) => ({ ...s, copied: true }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setB((s) => ({ ...s, copied: false })), 1500);
  };
  return (
    <div className="demo-stage">
      <div className="mo-mi-grid">
        <div className="mo-mi-card">
          <b className="mo-mi-head">반응 없음</b>
          <button type="button" className="mo-mi-plain" aria-pressed={a.liked}
            onClick={() => setA((s) => ({ ...s, liked: !s.liked, n: s.n + (s.liked ? -1 : 1) }))}>
            {a.liked ? "♥" : "♡"} <span className="tabular">{a.n}</span>
          </button>
          <button type="button" className="mo-mi-plain" onClick={() => setA((s) => ({ ...s, copied: true }))}>링크 복사</button>
        </div>
        <div className="mo-mi-card">
          <b className="mo-mi-head">마이크로 인터랙션</b>
          <button type="button" className={`mo-mi-like ${b.liked ? "on" : ""}`} aria-pressed={b.liked}
            onClick={() => { setB((s) => ({ ...s, liked: !s.liked, n: s.n + (s.liked ? -1 : 1) })); if (!b.liked) setBurst((x) => x + 1); }}>
            <span className="mo-mi-heart" key={`h${burst}-${b.liked}`}>{b.liked ? "♥" : "♡"}</span>
            {b.liked && burst > 0 && (
              <span className="mo-mi-burst" key={`b${burst}`} aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 60}deg)` }} />)}
              </span>
            )}
            <span className="mo-mi-count tabular" key={`n${b.n}`}>{b.n}</span>
          </button>
          <button type="button" className={`mo-mi-copy ${b.copied ? "on" : ""}`} onClick={copyB}>
            <span key={String(b.copied)}>{b.copied ? "✓ 복사됨" : "링크 복사"}</span>
          </button>
        </div>
      </div>
      <span className="muted">양쪽 하트와 '링크 복사'를 눌러 보세요. 왼쪽은 눌렸는지 확신이 안 서고, 오른쪽은 짧은 반응으로 '됐다'를 알려 줍니다. (실제로 복사하지는 않습니다)</span>
    </div>
  );
}

/* ───────── 공유 요소 전환 ───────── */
const ALBUM = [
  { seed: 3, title: "바닷가 산책", text: "해 질 녘 모래사장을 따라 걸었습니다. 바람이 시원했어요." },
  { seed: 11, title: "숲속 오두막", text: "통나무 오두막에서 하룻밤. 밤하늘에 별이 가득했습니다." },
  { seed: 7, title: "호숫가 아침", text: "물안개가 걷히기 전, 호수가 거울처럼 잔잔했습니다." },
  { seed: 19, title: "능선 위에서", text: "세 시간을 올라 도착한 능선. 구름이 발아래 깔렸습니다." },
  { seed: 5, title: "들판의 오후", text: "끝없이 펼쳐진 들판에 노란 꽃이 피어 있었습니다." },
  { seed: 23, title: "겨울 계곡", text: "얼어붙은 계곡물 사이로 작은 물소리가 들렸습니다." },
];
type Box = { left: number; top: number; width: number; height: number };
const HERO_H = 140;
export function SharedElementDemo() {
  const [shared, setShared] = useState(true);
  const [sel, setSel] = useState<number | null>(null);
  const reduce = useOsReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLImageElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const anims = useRef<Animation[]>([]);
  const busy = useRef(false);
  const justOpened = useRef(false);

  useEffect(() => () => { anims.current.forEach((a) => a.cancel()); }, []);

  const thumbBox = (i: number): Box | null => {
    const t = thumbs.current[i], f = frame.current;
    if (!t || !f) return null;
    const a = t.getBoundingClientRect(), r = f.getBoundingClientRect();
    return { left: a.left - r.left - f.clientLeft, top: a.top - r.top - f.clientTop, width: a.width, height: a.height };
  };
  const heroBox = (): Box => ({ left: 0, top: 0, width: frame.current?.clientWidth ?? 300, height: HERO_H });
  const kf = (b: Box, radius: number) => ({ left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px`, borderRadius: `${radius}px` });

  useLayoutEffect(() => {
    if (sel === null || !justOpened.current) return;
    justOpened.current = false;
    back.current?.focus({ preventScroll: true });
    if (!shared) return;
    anims.current.forEach((a) => a.cancel());
    if (reduce) {
      anims.current = [overlay.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 })];
      return;
    }
    const from = thumbBox(sel);
    if (!from || !hero.current || !bg.current || !body.current) return;
    anims.current = [
      hero.current.animate([kf(from, 8), kf(heroBox(), 0)], { duration: 420, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }),
      bg.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 }),
      body.current.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: 160, fill: "backwards", easing: "ease-out" }),
    ];
  }, [sel, shared, reduce]);

  const open = (i: number) => {
    if (busy.current || sel !== null) return;
    justOpened.current = true;
    setSel(i);
  };
  const close = () => {
    if (sel === null || busy.current) return;
    const i = sel;
    const finish = () => { busy.current = false; anims.current.forEach((a) => a.cancel()); anims.current = []; setSel(null); thumbs.current[i]?.focus({ preventScroll: true }); };
    if (!shared) { finish(); return; }
    anims.current.forEach((a) => a.cancel());
    busy.current = true;
    let main: Animation;
    if (reduce) {
      main = overlay.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
      anims.current = [main];
    } else {
      const to = thumbBox(i);
      if (!to || !hero.current || !bg.current || !body.current) { finish(); return; }
      main = hero.current.animate([kf(heroBox(), 0), kf(to, 8)], { duration: 360, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" });
      anims.current = [
        main,
        bg.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }),
        body.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" }),
      ];
    }
    main.finished.then(finish, () => { busy.current = false; });
  };

  const item = sel === null ? null : ALBUM[sel];
  return (
    <div className="demo-stage">
      <div className="segmented" role="radiogroup" aria-label="전환 방식">
        {[true, false].map((v) => (
          <button type="button" key={String(v)} role="radio" aria-checked={shared === v} className={shared === v ? "on" : ""}
            onClick={() => { if (sel === null) setShared(v); }}>{v ? "공유 요소 전환" : "그냥 화면 바꾸기"}</button>
        ))}
      </div>
      <div className="mo-se-frame" ref={frame}>
        <div className="mo-se-list" aria-hidden={sel !== null}>
          <b>여행 사진첩</b>
          <div className="mo-se-grid">
            {ALBUM.map((p, i) => (
              <button type="button" key={p.seed} className="mo-se-thumb" ref={(el) => { thumbs.current[i] = el; }}
                style={{ visibility: sel === i && shared ? "hidden" : undefined }} tabIndex={sel === null ? 0 : -1}
                onClick={() => open(i)} aria-label={`${p.title} 열기`}>
                <img src={photo(p.seed, 400, 260)} alt="" draggable={false} />
              </button>
            ))}
          </div>
        </div>
        {item && (
          <div className="mo-se-detail" ref={overlay} onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
            <div className="mo-se-bg" ref={bg} />
            <img className="mo-se-hero" ref={hero} src={photo(item.seed, 400, 260)} alt={item.title} draggable={false} />
            <button type="button" className="mo-se-back" ref={back} onClick={close} aria-label="목록으로">←</button>
            <div className="mo-se-body" ref={body}>
              <b>{item.title}</b>
              <p className="muted">{item.text}</p>
            </div>
          </div>
        )}
      </div>
      <OsNote show={reduce} />
      <span className="muted">사진을 눌러 보세요. 썸네일이 제자리에서 커져 상세 화면의 큰 사진이 되고, ← 를 누르면 원래 자리로 돌아갑니다. '그냥 화면 바꾸기'와 비교해 보세요.</span>
    </div>
  );
}

/* ───────── 모핑 ───────── */
type Pt = [number, number];
const PLAY: Pt[][] = [[[6, 4], [13, 8], [13, 16], [6, 20]], [[13, 8], [20, 12], [20, 12], [13, 16]]];
const PAUSE: Pt[][] = [[[6, 4], [10, 4], [10, 20], [6, 20]], [[14, 4], [18, 4], [18, 20], [14, 20]]];
const MENU: Pt[][] = [[[4, 7], [20, 7]], [[4, 12], [20, 12]], [[4, 17], [20, 17]]];
const CLOSE: Pt[][] = [[[6, 6], [18, 18]], [[12, 12], [12, 12]], [[6, 18], [18, 6]]];
const mix = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const pts = (a: Pt[], b: Pt[], t: number) => a.map((p, i) => mix(p, b[i], t).map((n) => n.toFixed(2)).join(",")).join(" ");

function PlayIcon({ t }: { t: number }) {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
      {PLAY.map((shape, i) => <polygon key={i} points={pts(shape, PAUSE[i], t)} fill="currentColor" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round" />)}
    </svg>
  );
}
function MenuIcon({ t }: { t: number }) {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
      {MENU.map((line, i) => {
        const [a, b] = [mix(line[0], CLOSE[i][0], t), mix(line[1], CLOSE[i][1], t)];
        return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={i === 1 ? 1 - t : 1} />;
      })}
    </svg>
  );
}
export function MorphingDemo() {
  const reduce = useOsReducedMotion();
  const [play, playTo, setPlay] = useTween(reduce);
  const [menu, menuTo, setMenu] = useTween(reduce);
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrub, setScrub] = useState(0);
  return (
    <div className="demo-stage">
      <div className="row mo-mo-row">
        <button type="button" className="mo-mo-btn" aria-label={playing ? "일시정지" : "재생"}
          onClick={() => { const n = !playing; setPlaying(n); playTo(n ? 1 : 0); setScrub(n ? 100 : 0); }}><PlayIcon t={play} /></button>
        <button type="button" className="mo-mo-btn" aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={menuOpen}
          onClick={() => { const n = !menuOpen; setMenuOpen(n); menuTo(n ? 1 : 0); setScrub(n ? 100 : 0); }}><MenuIcon t={menu} /></button>
        <span className="muted">{playing ? "재생 중" : "멈춤"} · 메뉴 {menuOpen ? "열림" : "닫힘"}</span>
      </div>
      <label className="mo-mo-scrub">
        <span>중간 모습 보기</span>
        <input type="range" min={0} max={100} value={scrub} aria-label="모핑 진행 정도"
          onChange={(e) => {
            const v = Number(e.target.value); setScrub(v);
            setPlay(v / 100); setMenu(v / 100); setPlaying(v >= 50); setMenuOpen(v >= 50);
          }} />
        <span className="mono tabular">{scrub}%</span>
      </label>
      <OsNote show={reduce} />
      <span className="muted">두 아이콘을 눌러 보세요. ▶ 가 ❚❚ 로, ≡ 가 ✕ 로 중간 모양을 거쳐 이어지며 바뀝니다. 막대를 끌면 그 중간 모습을 천천히 볼 수 있습니다.</span>
    </div>
  );
}

/* ───────── 중단 가능한 애니메이션 ───────── */
type Phase = "closed" | "opening" | "open" | "closing";
export function InterruptibleDemo() {
  const [a, setA] = useState(false);
  const [b, setB] = useState<Phase>("closed");
  const queued = useRef(false);
  const [waiting, setWaiting] = useState(false);
  const timers = useRef<number[]>([]);
  const reduce = useOsReducedMotion();
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const phaseB = useRef<Phase>("closed");
  const goB = (p: Phase) => { phaseB.current = p; setB(p); };
  const toggleB = () => {
    const p = phaseB.current;
    if (p === "opening" || p === "closing") { queued.current = !queued.current; setWaiting(queued.current); return; }
    goB(p === "closed" ? "opening" : "closing");
  };
  const endB = () => {
    const p = phaseB.current;
    const settled: Phase = p === "opening" ? "open" : p === "closing" ? "closed" : p;
    if (queued.current) { queued.current = false; setWaiting(false); goB(settled === "open" ? "closing" : "opening"); }
    else goB(settled);
  };
  const doubleTap = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setA((v) => !v); toggleB();
    timers.current = [window.setTimeout(() => { setA((v) => !v); toggleB(); }, 300)];
  };
  const bOpenish = b === "open" || b === "opening";
  return (
    <div className="demo-stage">
      <div className="row"><button type="button" className="btn primary" onClick={doubleTap}>둘 다 '열기→0.3초 뒤 닫기' 연타</button></div>
      <div className="mo-int-grid">
        <div className="mo-int-box">
          <b className="mo-int-head good">중단 가능</b>
          <div className="mo-int-screen">
            <div className={`mo-int-panel trans ${a ? "on" : ""}`}><span>메뉴</span><i /><i /><i /></div>
          </div>
          <button type="button" className="btn small" onClick={() => setA(!a)}>{a ? "닫기" : "열기"}</button>
          <span className="mo-int-state muted">{a ? "열기 (언제든 되돌릴 수 있음)" : "닫기 (언제든 되돌릴 수 있음)"}</span>
        </div>
        <div className="mo-int-box">
          <b className="mo-int-head bad">중단 불가</b>
          <div className="mo-int-screen">
            <div className={`mo-int-panel ${b}`} onAnimationEnd={endB}><span>메뉴</span><i /><i /><i /></div>
          </div>
          <button type="button" className="btn small" onClick={toggleB}>{bOpenish ? "닫기" : "열기"}</button>
          <span className="mo-int-state muted">{waiting ? "끝날 때까지 기다리는 중…" : b === "opening" ? "끝까지 여는 중" : b === "closing" ? "끝까지 닫는 중" : b === "open" ? "열림" : "닫힘"}</span>
        </div>
      </div>
      <OsNote show={reduce} />
      <span className="muted">'열기'를 누르고 반쯤 열렸을 때 바로 '닫기'를 눌러 보세요. 왼쪽은 그 자리에서 되돌아오고, 오른쪽은 끝까지 열린 뒤에야 닫힙니다. (차이가 잘 보이게 일부러 0.8초로 느리게 했습니다)</span>
    </div>
  );
}

/* ───────── 움직임 줄이기 ───────── */
const SLIDES = [
  { seed: 9, title: "1. 환영합니다", text: "사진을 모아 앨범을 만들어 보세요." },
  { seed: 15, title: "2. 친구와 함께", text: "앨범을 공유하고 같이 채울 수 있습니다." },
  { seed: 29, title: "3. 준비 끝", text: "이제 첫 사진을 올려 볼까요?" },
];
export function ReducedMotionDemo() {
  const os = useOsReducedMotion();
  const [reduce, setReduce] = useState(os);
  const [idx, setIdx] = useState(0);
  const slide = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const moved = useRef(false);
  useEffect(() => { setReduce(os); }, [os]);
  useEffect(() => () => anim.current?.cancel(), []);
  useLayoutEffect(() => {
    if (!moved.current || !slide.current) return;
    anim.current?.cancel();
    // Web Animations API 는 사이트 CSS 의 '움직임 줄이기' 규칙에 영향받지 않으므로 여기서 직접 고른다.
    anim.current = reduce
      ? slide.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: "ease-out" })
      : slide.current.animate(
          [{ opacity: 0, transform: "translateX(90%) scale(0.85) rotate(6deg)" }, { opacity: 1, transform: "translateX(-6%) scale(1.02) rotate(-1deg)", offset: 0.7 }, { opacity: 1, transform: "none" }],
          { duration: 650, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps
  const s = SLIDES[idx];
  return (
    <div className="demo-stage">
      <div className="mo-rm-os" role="status">
        <span>내 기기 설정</span>
        <b className={os ? "on" : ""}>{os ? "움직임 줄이기 켜짐" : "움직임 줄이기 꺼짐"}</b>
        <code className="mono">prefers-reduced-motion: {os ? "reduce" : "no-preference"}</code>
      </div>
      <label className="row">
        <button type="button" role="switch" aria-checked={reduce} className={`switch ${reduce ? "on" : ""}`} onClick={() => setReduce(!reduce)}><span /></button>
        이 예시에서 움직임 줄이기
      </label>
      <div className="mo-rm-stage">
        <div className="mo-rm-slide" ref={slide} key={idx}>
          <img src={photo(s.seed, 400, 200)} alt="" draggable={false} />
          <b>{s.title}</b>
          <span className="muted">{s.text}</span>
        </div>
      </div>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => { moved.current = true; setIdx((idx + 1) % SLIDES.length); }}>다음 장</button>
        <span className="muted">{reduce ? "지금: 페이드만 (0.28초)" : "지금: 옆에서 날아와 튕김 (0.65초)"}</span>
      </div>
      <span className="muted">'다음 장'을 눌러 보고, 스위치를 켠 뒤 다시 눌러 보세요. 큰 이동·회전 대신 제자리에서 나타나기만 합니다. 스위치는 처음에 내 기기 설정을 따릅니다.</span>
    </div>
  );
}

/* ───────── 스크롤 연동 애니메이션 ───────── */
const STORY = [
  { seed: 2, title: "새벽 4시, 출발", text: "헤드랜턴을 켜고 산길로 들어섭니다." },
  { seed: 13, title: "첫 번째 쉼터", text: "하늘이 조금씩 밝아집니다." },
  { seed: 21, title: "구름 위로", text: "발아래로 구름바다가 펼쳐집니다." },
  { seed: 31, title: "정상", text: "해가 떠오르고, 모두가 말을 잃습니다." },
  { seed: 37, title: "내려가는 길", text: "올라올 때 못 본 꽃들이 보입니다." },
];
export function ScrollAnimationDemo() {
  const box = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const [m, setM] = useState({ top: 0, h: 1, sh: 1 });
  const reduce = useOsReducedMotion();
  const measure = () => { const b = box.current; if (b) setM({ top: b.scrollTop, h: b.clientHeight, sh: b.scrollHeight }); };
  useLayoutEffect(measure, []);
  const pct = m.sh > m.h ? Math.round((m.top / (m.sh - m.h)) * 100) : 0;
  const reveal = (i: number) => {
    const el = items.current[i];
    if (!el) return 0;
    return Math.max(0, Math.min(1, (m.top + m.h - el.offsetTop - 20) / 110));
  };
  return (
    <div className="demo-stage">
      <div className="mo-sc-box" ref={box} onScroll={measure} tabIndex={0} aria-label="스크롤해 보는 이야기">
        <div className="mo-sc-bar" aria-hidden="true"><span style={{ transform: `scaleX(${pct / 100})` }} /><b className="mono tabular">{pct}%</b></div>
        <p className="mo-sc-intro">아래로 스크롤해 보세요 ↓</p>
        {STORY.map((s, i) => {
          const t = reveal(i);
          return (
            <div key={s.seed} className="mo-sc-item" ref={(el) => { items.current[i] = el; }}
              style={{ opacity: t, transform: reduce ? undefined : `translateY(${(1 - t) * 36}px) scale(${0.9 + 0.1 * t})` }}>
              <img src={photo(s.seed, 160, 110)} alt="" draggable={false} />
              <div><b>{s.title}</b><span className="muted">{s.text}</span></div>
            </div>
          );
        })}
        <p className="mo-sc-intro">끝.</p>
      </div>
      <span className="muted">상자 안을 스크롤해 보세요. 위 막대와 카드 등장이 시간이 아니라 스크롤한 만큼만 진행됩니다. 멈추면 같이 멈추고, 올리면 거꾸로 돌아갑니다.{reduce ? " (지금은 움직임 줄이기 설정 때문에 이동 없이 투명도만 바뀝니다)" : ""}</span>
    </div>
  );
}

/* ───────── 레이아웃 시프트 ───────── */
type LsPhase = "idle" | "loading" | "loaded";
export function LayoutShiftDemo() {
  const [reserve, setReserve] = useState(false);
  const [phase, setPhase] = useState<LsPhase>("idle");
  const [run, setRun] = useState(0);
  const [fingerY, setFingerY] = useState<number | null>(null);
  const [tapped, setTapped] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const del = useRef<HTMLButtonElement>(null);
  const share = useRef<HTMLButtonElement>(null);
  const like = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  useEffect(() => clear, []);

  const start = () => {
    clear();
    setTapped(null); setAuto(false); setFingerY(null); setPhase("loading"); setRun((r) => r + 1);
  };
  useLayoutEffect(() => {
    if (run === 0 || !like.current) return;
    const y = like.current.offsetTop + like.current.offsetHeight / 2;
    setFingerY(y);
    timers.current.push(window.setTimeout(() => setPhase("loaded"), 1300));
    timers.current.push(window.setTimeout(() => {
      const hit = [del, share, like].find((r) => r.current && y >= r.current.offsetTop && y < r.current.offsetTop + r.current.offsetHeight);
      setAuto(true);
      setTapped(hit?.current?.dataset.name ?? "빈 곳");
    }, 1600));
  }, [run]);

  const showImg = reserve || phase === "loaded";
  const press = (name: string) => { if (phase !== "idle") { clear(); setTapped(name); setAuto(false); } };
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="이미지 자리">
          {[false, true].map((v) => (
            <button type="button" key={String(v)} role="radio" aria-checked={reserve === v} className={reserve === v ? "on" : ""}
              onClick={() => { clear(); setReserve(v); setPhase("idle"); setTapped(null); setFingerY(null); }}>{v ? "자리 미리 잡음" : "자리 안 잡음"}</button>
          ))}
        </div>
        <button type="button" className="btn primary" onClick={start}>글 열기</button>
      </div>
      <div className="mo-ls-screen">
        {phase === "idle" ? (
          <p className="muted mo-ls-empty">'글 열기'를 누르면 손가락이 '좋아요'를 누르러 갑니다.</p>
        ) : (
          <>
            <b className="mo-ls-title">주말 캠핑 후기</b>
            {showImg && (
              <div className={`mo-ls-img ${phase === "loaded" ? "ready" : ""}`}>
                {phase === "loaded" ? <img src={photo(41, 400, 176)} alt="캠핑장 사진" draggable={false} /> : <span className="muted">사진 불러오는 중…</span>}
              </div>
            )}
            <button type="button" ref={del} data-name="글 삭제" className="mo-ls-btn danger" onClick={() => press("글 삭제")}>🗑 글 삭제</button>
            <button type="button" ref={share} data-name="공유" className="mo-ls-btn" onClick={() => press("공유")}>↗ 공유</button>
            <button type="button" ref={like} data-name="좋아요" className="mo-ls-btn" onClick={() => press("좋아요")}>♡ 좋아요</button>
            {fingerY !== null && (
              <span className={`mo-ls-finger ${tapped && auto ? "tap" : ""}`} style={{ top: fingerY }} aria-hidden="true">👆</span>
            )}
          </>
        )}
      </div>
      <div className={`mo-ls-result ${tapped === "글 삭제" ? "bad" : tapped ? "good" : ""}`} role="status" aria-live="polite">
        {tapped === null
          ? (phase === "loading" ? "사진을 기다리는 중…" : " ")
          : tapped === "글 삭제"
            ? `앗! 사진이 늦게 뜨며 버튼이 ${reserve ? 0 : 96}px 밀려 '글 삭제'를 눌렀습니다.`
            : `'${tapped}'를 눌렀습니다.${reserve && auto ? " 사진이 와도 버튼이 제자리라 안전합니다." : ""}`}
      </div>
      <span className="muted">'글 열기'를 눌러 보세요. 사진이 늦게 오면 아래 버튼이 밀려 손가락 밑에 '글 삭제'가 옵니다. '자리 미리 잡음'으로 바꾸면 사진 자리가 먼저 비어 있어 아무것도 밀리지 않습니다.</span>
    </div>
  );
}
