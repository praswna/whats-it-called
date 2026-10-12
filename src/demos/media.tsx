import { useEffect, useMemo, useRef, useState } from "react";

/* 예시용 사진: seed 마다 색과 산 모양이 다른 풍경. 비율은 w:h */
const photoCache = new Map<string, string>();
export function photo(seed: number, w = 400, h = 260): string {
  const key = `${seed}-${w}-${h}`;
  const hit = photoCache.get(key); if (hit) return hit;
  const hue = (seed * 47) % 360;
  const peak = 0.3 + ((seed * 37) % 40) / 100;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},65%,55%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},75%,80%)"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<circle cx="${w * (0.2 + ((seed * 13) % 60) / 100)}" cy="${h * 0.28}" r="${Math.min(w, h) * 0.1}" fill="hsl(${(hue + 180) % 360},80%,85%)"/>
<path d="M0 ${h * 0.7} L${w * peak} ${h * 0.35} L${w * (peak + 0.25)} ${h * 0.6} L${w} ${h * 0.45} V${h} H0 Z" fill="hsl(${(hue + 200) % 360},35%,32%)"/>
<rect y="${h * 0.82}" width="${w}" height="${h * 0.18}" fill="hsl(${(hue + 210) % 360},40%,22%)"/>
</svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  photoCache.set(key, url);
  return url;
}

/* 채우기·맞추기 + 초점 지정 */
export function ObjectFitDemo() {
  const fits = ["cover", "contain", "fill"] as const;
  const [fit, setFit] = useState<(typeof fits)[number]>("cover");
  const [focus, setFocus] = useState({ x: 75, y: 40 });
  const src = photo(3, 400, 260);
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setFocus({ x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) });
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="맞춤 방식">
          {fits.map((f) => <button type="button" key={f} role="radio" aria-checked={fit === f} className={fit === f ? "on" : ""} onClick={() => setFit(f)}>{f}</button>)}
        </div>
        <span className="muted">초점 {focus.x}% {focus.y}%</span>
      </div>
      <div className="fit-row">
        <figure className="fit-orig">
          <div className="fit-pick" onPointerDown={pick}>
            <img src={src} alt="" draggable={false} />
            <span className="fit-dot" style={{ left: `${focus.x}%`, top: `${focus.y}%` }} />
          </div>
          <figcaption className="muted">원본 · 눌러서 초점 지정</figcaption>
        </figure>
        {[["가로 배너", "21 / 9"], ["정사각", "1 / 1"], ["세로 카드", "3 / 4"]].map(([label, ratio]) => (
          <figure key={label} className="fit-box">
            <img src={src} alt="" style={{ aspectRatio: ratio, objectFit: fit, objectPosition: `${focus.x}% ${focus.y}%` }} />
            <figcaption className="muted">{label}</figcaption>
          </figure>
        ))}
      </div>
      <span className="muted">cover 는 잘라서 채우고, contain 은 다 보이게 줄이고, fill 은 찌그러뜨립니다. cover 에서 원본의 해를 눌러 초점으로 두면 어느 비율에서도 해가 남습니다.</span>
    </div>
  );
}

/* 블러 업 */
export function BlurUpDemo() {
  const [round, setRound] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
    const t = window.setTimeout(() => setLoaded(true), 1600);
    return () => window.clearTimeout(t);
  }, [round]);
  const seed = 5 + (round % 4);
  const full = photo(seed, 400, 260);
  const tiny = photo(seed, 16, 10);
  const dominant = `hsl(${(seed * 47) % 360},55%,62%)`;
  const box = (label: string, placeholder: React.ReactNode) => (
    <figure className="blur-box">
      <div className="blur-frame">
        {placeholder}
        <img className="blur-full" src={full} alt="" style={{ opacity: loaded ? 1 : 0 }} />
      </div>
      <figcaption className="muted">{label}</figcaption>
    </figure>
  );
  return (
    <div className="demo-stage">
      <div className="row">
        <button type="button" className="btn small" onClick={() => setRound(round + 1)}>다시 불러오기</button>
        <span className="muted">{loaded ? "원본 도착" : "원본 받는 중…"}</span>
      </div>
      <div className="blur-row">
        {box("빈칸", null)}
        {box("대표 색", <div className="blur-fill" style={{ background: dominant }} />)}
        {box("블러 업", <img className="blur-tiny" src={tiny} alt="" />)}
      </div>
      <span className="muted">세 칸 모두 같은 사진을 1.6초 뒤에 받습니다. 기다리는 동안 무엇이 보이는지 비교해 보세요.</span>
    </div>
  );
}

/* 영상 플레이어: 탐색 미리보기 · 버퍼 바 · 챕터 */
const DURATION = 120;
const CHAPTERS = [
  { at: 0, name: "소개" },
  { at: 22, name: "준비물" },
  { at: 50, name: "만들기" },
  { at: 96, name: "마무리" },
];
const chapterAt = (t: number) => [...CHAPTERS].reverse().find((c) => t >= c.at) ?? CHAPTERS[0];
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const frameAt = (t: number) => photo(20 + Math.floor(t / 8), 320, 180);

export function VideoPlayerDemo() {
  const [time, setTime] = useState(0);
  const [buffered, setBuffered] = useState(18);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const seeking = useRef(false);
  const stalled = playing && time >= buffered - 0.1 && buffered < DURATION;

  // 4배속으로 흘러가는 가짜 재생과, 앞쪽으로 조금씩 늘어나는 버퍼
  useEffect(() => {
    const id = window.setInterval(() => setBuffered((b) => Math.min(DURATION, b + 0.5)), 100);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => { if (time >= DURATION) setPlaying(false); }, [time]);
  useEffect(() => {
    if (!playing || stalled) return;
    const id = window.setInterval(() => setTime((t) => Math.min(DURATION, t + 0.4)), 100);
    return () => window.clearInterval(id);
  }, [playing, stalled]);

  const timeAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect(); if (!r) return 0;
    return Math.max(0, Math.min(DURATION, ((clientX - r.left) / r.width) * DURATION));
  };
  const seek = (t: number) => {
    setTime(t);
    // 받아 둔 구간 밖으로 넘기면 거기서부터 다시 받는다
    if (t > buffered) setBuffered(t);
  };
  const pct = (t: number) => `${(t / DURATION) * 100}%`;

  return (
    <div className="demo-stage">
      <div className="vp">
        <img className="vp-frame" src={frameAt(time)} alt="" />
        {stalled && <span className="vp-spin" aria-label="버퍼링" />}
        <div className="vp-bar">
          <div ref={track} className="vp-track"
            onPointerDown={(e) => { seeking.current = true; e.currentTarget.setPointerCapture(e.pointerId); seek(timeAt(e.clientX)); }}
            onPointerMove={(e) => { const t = timeAt(e.clientX); setHover(t); if (seeking.current) seek(t); }}
            onPointerUp={() => { seeking.current = false; }}
            onPointerLeave={() => { if (!seeking.current) setHover(null); }}
            onPointerCancel={() => { seeking.current = false; setHover(null); }}>
            {CHAPTERS.map((c, i) => {
              const end = CHAPTERS[i + 1]?.at ?? DURATION;
              return (
                <div key={c.at} className="vp-seg" style={{ left: pct(c.at), width: `calc(${pct(end - c.at)} - 3px)` }}>
                  <div className="vp-buf" style={{ width: `${Math.max(0, Math.min(1, (buffered - c.at) / (end - c.at))) * 100}%` }} />
                  <div className="vp-played" style={{ width: `${Math.max(0, Math.min(1, (time - c.at) / (end - c.at))) * 100}%` }} />
                </div>
              );
            })}
            <span className="vp-head" style={{ left: pct(time) }} />
            {hover !== null && (
              <div className="vp-preview" style={{ left: `clamp(56px, ${pct(hover)}, calc(100% - 56px))` }}>
                <img src={frameAt(hover)} alt="" />
                <span><b>{fmt(hover)}</b> · {chapterAt(hover).name}</span>
              </div>
            )}
          </div>
          <div className="vp-controls">
            <button type="button" className="vp-play" onClick={() => { if (time >= DURATION) setTime(0); setPlaying(!playing); }} aria-label={playing ? "일시 정지" : "재생"}>
              {playing ? "❚❚" : "▶"}
            </button>
            <span className="vp-time">{fmt(time)} / {fmt(DURATION)} · {chapterAt(time).name}</span>
          </div>
        </div>
      </div>
      <span className="muted">재생 바 위에 커서를 올리면 그 시점의 장면과 챕터 이름이 뜹니다. 옅은 막대가 받아 둔 구간이고, 그 너머로 넘기면 거기서부터 다시 받습니다. 재생 위치가 받아 둔 끝을 따라잡으면 멈추고 버퍼링 표시가 뜹니다.</span>
    </div>
  );
}

/* 갤러리 배치: 그리드 · 메이슨리 · 저스티파이드 */
const RATIOS = [1.5, 0.75, 1, 1.33, 0.66, 1.78, 1, 0.8, 1.5, 1.2, 0.7, 1.6];
export function GalleryLayoutDemo() {
  const modes = ["그리드", "메이슨리", "저스티파이드"] as const;
  const [mode, setMode] = useState<(typeof modes)[number]>("메이슨리");
  const items = useMemo(() => RATIOS.map((r, i) => ({ r, src: photo(40 + i, Math.round(200 * r), 200) })), []);
  return (
    <div className="demo-stage">
      <div className="segmented" role="radiogroup" aria-label="배치" style={{ alignSelf: "flex-start" }}>
        {modes.map((m) => <button type="button" key={m} role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{m}</button>)}
      </div>
      {mode === "그리드" && (
        <div className="gal-grid">
          {items.map((it, i) => <img key={i} src={it.src} alt="" />)}
        </div>
      )}
      {mode === "메이슨리" && (
        <div className="gal-masonry">
          {items.map((it, i) => <img key={i} src={it.src} alt="" style={{ aspectRatio: String(it.r) }} />)}
        </div>
      )}
      {mode === "저스티파이드" && (
        <div className="gal-justified">
          {items.map((it, i) => <img key={i} src={it.src} alt="" style={{ flexGrow: it.r, flexBasis: `${it.r * 80}px` }} />)}
          <span className="gal-spacer" />
        </div>
      )}
      <span className="muted">
        {mode === "그리드" && "모든 칸이 정사각입니다. 깔끔하지만 사진이 잘립니다."}
        {mode === "메이슨리" && "열 폭은 같고 높이는 사진 비율대로입니다. 위로 붙여 쌓아 빈틈이 없습니다."}
        {mode === "저스티파이드" && "한 줄의 높이를 맞추고 폭을 늘려 양 끝을 맞춥니다. 왼쪽→오른쪽으로 읽힙니다."}
      </span>
    </div>
  );
}

/* 썸네일 스트립 */
export function FilmstripDemo() {
  const N = 10;
  const [i, setI] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const go = (n: number) => setI((n + N) % N);
  useEffect(() => {
    const el = strip.current?.children[i] as HTMLElement | undefined;
    const box = strip.current;
    if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [i]);
  return (
    <div className="demo-stage">
      <div className="fs-main">
        <img src={photo(60 + i, 400, 250)} alt={`사진 ${i + 1}`} />
        <button type="button" className="fs-nav prev" onClick={() => go(i - 1)} aria-label="이전">‹</button>
        <button type="button" className="fs-nav next" onClick={() => go(i + 1)} aria-label="다음">›</button>
        <span className="fs-count">{i + 1} / {N}</span>
      </div>
      <div ref={strip} className="fs-strip" tabIndex={0} aria-label="썸네일"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
        }}>
        {Array.from({ length: N }, (_, n) => (
          <button type="button" key={n} tabIndex={-1} className={`fs-thumb ${n === i ? "on" : ""}`} onClick={() => setI(n)} aria-label={`사진 ${n + 1}`} aria-current={n === i}>
            <img src={photo(60 + n, 400, 250)} alt="" />
          </button>
        ))}
      </div>
      <span className="muted">썸네일을 누르거나 양옆 화살표로 넘겨 보세요. 썸네일 줄에 포커스를 두면 ← → 키로도 넘어가고, 고른 썸네일이 가운데로 따라옵니다.</span>
    </div>
  );
}
