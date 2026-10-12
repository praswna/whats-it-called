import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { photo } from "./media";
import "./navi.css";

/* ───────── 탭 ───────── */
const TABS = [
  { id: "home", label: "홈", icon: "⌂", body: "오늘의 추천 글 3개와 최근 본 항목이 여기에 보입니다." },
  { id: "search", label: "검색", icon: "⌕", body: "검색창과 인기 검색어 목록. 같은 자리에서 내용만 바뀝니다." },
  { id: "saved", label: "저장", icon: "♡", body: "저장한 글 12개. 탭을 바꿔도 화면 틀은 그대로입니다." },
  { id: "me", label: "내 정보", icon: "☺", body: "프로필, 알림 설정, 로그아웃." },
];

export function TabsDemo() {
  const [sel, setSel] = useState(0);
  const [place, setPlace] = useState<"top" | "bottom">("top");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const b = refs.current[sel];
    if (b) setBar({ left: b.offsetLeft, width: b.offsetWidth });
  }, [sel, place]);
  const move = (i: number) => {
    const n = (i + TABS.length) % TABS.length;
    setSel(n);
    refs.current[n]?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (k === "ArrowRight") move(sel + 1);
    else if (k === "ArrowLeft") move(sel - 1);
    else if (k === "Home") move(0);
    else if (k === "End") move(TABS.length - 1);
    else return;
    e.preventDefault();
  };
  const list = (
    <div ref={listRef} className={`nv-tablist nv-tl-${place}`} role="tablist" aria-label="앱 화면" onKeyDown={onKey}>
      {TABS.map((t, i) => (
        <button key={t.id} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`nv-tab-${t.id}`}
          aria-selected={sel === i} aria-controls={`nv-panel-${t.id}`} tabIndex={sel === i ? 0 : -1}
          className={sel === i ? "on" : ""} onClick={() => setSel(i)}>
          {place === "bottom" && <span className="nv-tab-icon" aria-hidden="true">{t.icon}</span>}
          {t.label}
        </button>
      ))}
      <span className="nv-tab-ink" aria-hidden="true" style={{ transform: `translateX(${bar.left}px)`, width: bar.width }} />
    </div>
  );
  const t = TABS[sel];
  return (
    <div className="demo-stage">
      <div className="segmented" role="radiogroup" aria-label="탭 위치">
        <button type="button" role="radio" aria-checked={place === "top"} className={place === "top" ? "on" : ""} onClick={() => setPlace("top")}>위쪽 탭</button>
        <button type="button" role="radio" aria-checked={place === "bottom"} className={place === "bottom" ? "on" : ""} onClick={() => setPlace("bottom")}>하단 탭 바</button>
      </div>
      <div className="nv-tabs-frame">
        {place === "top" && list}
        <div className="nv-tabpanel" role="tabpanel" id={`nv-panel-${t.id}`} aria-labelledby={`nv-tab-${t.id}`} tabIndex={0} key={t.id}>
          <b>{t.label}</b>
          <p className="muted">{t.body}</p>
        </div>
        {place === "bottom" && list}
      </div>
      <span className="muted">꼬리표를 눌러 보세요. 바깥 틀은 그대로 두고 내용만 갈아 끼웁니다. 탭에 포커스를 두고 ← → 키로도 옮겨 다닐 수 있습니다.</span>
    </div>
  );
}

/* ───────── 브레드크럼 ───────── */
type Cat = { name: string; children?: Cat[] };
const SHOP: Cat = {
  name: "홈",
  children: [
    { name: "전자기기", children: [
      { name: "컴퓨터", children: [
        { name: "노트북", children: [
          { name: "게이밍 노트북", children: [{ name: "15인치" }, { name: "17인치" }] },
          { name: "울트라북" },
        ] },
        { name: "데스크톱" },
      ] },
      { name: "휴대폰", children: [{ name: "스마트폰" }, { name: "케이스" }] },
    ] },
    { name: "생활", children: [{ name: "주방", children: [{ name: "냄비" }, { name: "칼" }] }, { name: "욕실" }] },
    { name: "도서" },
  ],
};

export function BreadcrumbDemo() {
  const [path, setPath] = useState<number[]>([0, 0]);
  const [expanded, setExpanded] = useState(false);
  const nodes: Cat[] = [SHOP];
  for (const i of path) nodes.push(nodes[nodes.length - 1].children![i]);
  const here = nodes[nodes.length - 1];
  const go = (p: number[]) => { setPath(p); setExpanded(false); };
  const collapse = nodes.length > 4 && !expanded;
  const shown = collapse ? [0, -1, nodes.length - 2, nodes.length - 1] : nodes.map((_, i) => i);
  return (
    <div className="demo-stage">
      <div className="nv-crumb-frame">
        <nav aria-label="현재 위치">
          <ol className="nv-crumbs">
            {shown.map((i, k) => (
              <li key={k}>
                {i === -1 ? (
                  <button type="button" className="nv-crumb" aria-label="가운데 경로 펼치기" onClick={() => setExpanded(true)}>…</button>
                ) : i === nodes.length - 1 ? (
                  <span className="nv-crumb here" aria-current="page">{nodes[i].name}</span>
                ) : (
                  <button type="button" className="nv-crumb" onClick={() => go(path.slice(0, i))}>{nodes[i].name}</button>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h4 className="nv-crumb-title">{here.name}</h4>
        {here.children ? (
          <div className="nv-crumb-grid">
            {here.children.map((c, i) => (
              <button key={c.name} type="button" className="nv-crumb-card" onClick={() => go([...path, i])}>
                {c.name}{c.children && <span className="muted"> ›</span>}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">‘{here.name}’ 상품 목록이 여기에 나옵니다.</p>
        )}
      </div>
      <span className="muted">아래 카테고리로 계속 들어가 보세요. 위 줄에 지나온 경로가 쌓이고, 앞 단계를 누르면 그 위치로 바로 올라갑니다. 경로가 길어지면 가운데가 ‘…’로 접힙니다.</span>
    </div>
  );
}

/* ───────── 페이지네이션 ───────── */
function pageList(cur: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = [1, total, cur - 1, cur, cur + 1].filter((p) => p >= 1 && p <= total);
  const uniq = [...new Set(keep)].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  uniq.forEach((p, i) => {
    if (i > 0 && p - uniq[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

type PageMode = "offset" | "cursor";
function fetchPage(items: number[], mode: PageMode, page: number, cursors: number[], size: number) {
  let start = 0;
  if (mode === "offset") start = (page - 1) * size;
  else if (cursors.length) {
    const after = cursors[cursors.length - 1];
    start = items.findIndex((id) => id < after);
    if (start < 0) start = items.length;
  }
  return { start, ids: items.slice(start, start + size), more: start + size < items.length };
}

export function PaginationDemo() {
  const SIZE = 5;
  const [items, setItems] = useState(() => Array.from({ length: 42 }, (_, i) => 42 - i));
  const [mode, setMode] = useState<PageMode>("offset");
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<number[]>([]);
  const [view, setView] = useState(() => fetchPage(items, "offset", 1, [], SIZE));
  const [prev, setPrev] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState(0);
  const total = Math.ceil(items.length / SIZE);
  const shown = view.ids;
  const start = view.start;
  const hasNext = view.more;
  const hasPrev = mode === "offset" ? page > 1 : cursors.length > 0;
  const dup = shown.filter((id) => prev.has(id)).length;

  // 페이지를 옮길 때만 서버에서 새로 받아 온다 (이미 받은 화면은 그대로)
  const load = (m: PageMode, p: number, c: number[], forward: boolean) => {
    setPrev(forward ? new Set(shown) : new Set());
    setMode(m); setPage(p); setCursors(c); setPending(0);
    setView(fetchPage(items, m, p, c, SIZE));
  };
  const goto = (p: number) => load(mode, p, cursors, p === page + 1);
  const next = () => (mode === "offset" ? goto(page + 1) : load(mode, page, [...cursors, shown[shown.length - 1]], true));
  const back = () => (mode === "offset" ? goto(page - 1) : load(mode, page, cursors.slice(0, -1), false));
  const addNew = () => {
    const top = items[0];
    setItems([top + 3, top + 2, top + 1, ...items]);
    setPending((n) => n + 3);
  };
  const switchMode = (m: PageMode) => load(m, 1, [], false);

  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="자르는 방식">
          <button type="button" role="radio" aria-checked={mode === "offset"} className={mode === "offset" ? "on" : ""} onClick={() => switchMode("offset")}>오프셋</button>
          <button type="button" role="radio" aria-checked={mode === "cursor"} className={mode === "cursor" ? "on" : ""} onClick={() => switchMode("cursor")}>커서</button>
        </div>
        <button type="button" className="btn small" onClick={addNew}>새 글 3개 올라옴</button>
      </div>
      <div className="nv-page-frame">
        {pending > 0 && <div className="nv-page-new">새 글 {pending}개가 올라왔습니다 (지금 화면은 아직 그대로)</div>}
        <div className="nv-page-meta muted mono">
          {mode === "offset" ? `?page=${page} → ${start + 1}~${start + shown.length}번째` : `?after=${cursors.length ? `#${cursors[cursors.length - 1]}` : "처음"}`}
        </div>
        <ul className="nv-page-list">
          {shown.map((id) => (
            <li key={id} className={prev.has(id) ? "dup" : ""}>
              <span className="mono">#{id}</span> 게시글 제목 {id}
              {prev.has(id) && <span className="nv-dup-tag">앞 쪽에서 본 글</span>}
            </li>
          ))}
        </ul>
        <nav className="nv-pager" aria-label="페이지">
          <button type="button" className="btn small" onClick={back} disabled={!hasPrev} aria-label="이전 페이지">‹</button>
          {mode === "offset" ? pageList(page, total).map((p, i) => p === "gap"
            ? <span key={`g${i}`} className="muted">…</span>
            : <button key={p} type="button" className={`nv-pnum ${p === page ? "on" : ""}`} aria-current={p === page ? "page" : undefined} onClick={() => goto(p)}>{p}</button>)
            : <span className="muted nv-pager-note">{cursors.length + 1}번째 묶음</span>}
          <button type="button" className="btn small" onClick={next} disabled={!hasNext} aria-label="다음 페이지">›</button>
        </nav>
      </div>
      <span className="muted">
        {dup > 0 ? `이전 쪽에서 본 글 ${dup}개가 또 나왔습니다. ` : ""}
        1쪽에서 ‘새 글 3개 올라옴’을 누른 뒤 다음 쪽(›)으로 가 보세요. 오프셋은 ‘몇 번째부터’라서 밀려 내려온 글이 겹치고, 커서는 ‘이 글 다음부터’라서 겹치지 않습니다.
      </span>
    </div>
  );
}

/* ───────── 스티키 헤더 ───────── */
const CONTACTS: [string, string[]][] = [
  ["ㄱ", ["강민지", "고은솔", "김도윤", "김하린"]],
  ["ㄴ", ["나서연", "남궁현", "노지호"]],
  ["ㄷ", ["도예린", "동하준", "두시우"]],
  ["ㅁ", ["마준서", "문가은", "민지안", "민태오"]],
  ["ㅂ", ["박서준", "배수아", "백지훈"]],
  ["ㅅ", ["서하윤", "손예준", "송유나", "신도현"]],
];

export function StickyDemo() {
  const [mode, setMode] = useState<"sticky" | "hide">("sticky");
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    if (mode === "hide") {
      if (y > last.current + 4 && y > 60) setHidden(true);
      else if (y < last.current - 4) setHidden(false);
    }
    last.current = y;
  };
  const hide = mode === "hide" && hidden;
  return (
    <div className="demo-stage">
      <div className="segmented" role="radiogroup" aria-label="헤더 동작">
        <button type="button" role="radio" aria-checked={mode === "sticky"} className={mode === "sticky" ? "on" : ""} onClick={() => { setMode("sticky"); setHidden(false); }}>항상 붙음</button>
        <button type="button" role="radio" aria-checked={mode === "hide"} className={mode === "hide" ? "on" : ""} onClick={() => setMode("hide")}>내리면 숨김</button>
      </div>
      <div className="nv-sticky-box" onScroll={onScroll} tabIndex={0} aria-label="연락처 목록 (스크롤)">
        <div className="nv-sticky-intro">
          <span className="nv-avatar big" aria-hidden="true" />
          <div><b>내 연락처</b><div className="muted">22명</div></div>
        </div>
        <div className={`nv-sticky-bar ${hide ? "hidden" : ""}`}>
          <span aria-hidden="true">⌕</span> 이름 검색
        </div>
        {CONTACTS.map(([ch, names]) => (
          <section key={ch} className="nv-sticky-sec">
            <h5 className="nv-sticky-head" style={{ top: hide ? 0 : 40 }}>{ch}</h5>
            {names.map((n) => <div key={n} className="nv-sticky-row"><span className="nv-avatar" aria-hidden="true" />{n}</div>)}
          </section>
        ))}
      </div>
      <span className="muted">상자 안을 스크롤해 보세요. 검색 줄은 제자리에 있다가 위에 닿으면 붙고, ㄱ·ㄴ·ㄷ 제목은 다음 제목이 올 때까지 붙어 있다가 밀려납니다. ‘내리면 숨김’은 아래로 내릴 때 숨고 위로 올리면 나타납니다.</span>
    </div>
  );
}

/* ───────── 스크롤 스냅 ───────── */
export function ScrollSnapDemo() {
  const [snap, setSnap] = useState(true);
  const [idx, setIdx] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const N = 6;
  const step = () => {
    const el = box.current; const c = el?.firstElementChild as HTMLElement | null;
    return c ? c.offsetWidth + 10 : 1;
  };
  const onScroll = () => { const el = box.current; if (el) setIdx(Math.min(N - 1, Math.round(el.scrollLeft / step()))); };
  const go = (i: number) => box.current?.scrollTo({ left: Math.max(0, Math.min(N - 1, i)) * step(), behavior: "smooth" });
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="스냅">
          <button type="button" role="radio" aria-checked={snap} className={snap ? "on" : ""} onClick={() => setSnap(true)}>스냅 켬</button>
          <button type="button" role="radio" aria-checked={!snap} className={!snap ? "on" : ""} onClick={() => setSnap(false)}>스냅 끔</button>
        </div>
        <span className="muted mono">scroll-snap-type: {snap ? "x mandatory" : "none"}</span>
      </div>
      <div ref={box} className={`nv-snap ${snap ? "on" : ""}`} onScroll={onScroll} tabIndex={0} aria-label="사진 카드 (가로 스크롤)">
        {Array.from({ length: N }, (_, i) => (
          <div key={i} className="nv-snap-card">
            <img src={photo(i + 11, 300, 200)} alt="" draggable={false} />
            <span>여행지 {i + 1}</span>
          </div>
        ))}
      </div>
      <div className="row nv-snap-nav">
        <button type="button" className="btn small" onClick={() => go(idx - 1)} aria-label="이전 카드">‹</button>
        {Array.from({ length: N }, (_, i) => (
          <button key={i} type="button" className={`nv-dot ${i === idx ? "on" : ""}`} aria-label={`${i + 1}번 카드`} aria-current={i === idx ? "true" : undefined} onClick={() => go(i)} />
        ))}
        <button type="button" className="btn small" onClick={() => go(idx + 1)} aria-label="다음 카드">›</button>
      </div>
      <span className="muted">카드 줄을 옆으로 밀었다 놓아 보세요(마우스는 Shift+휠). 스냅을 켜면 카드 경계에 딱 맞춰 멈추고, 끄면 놓은 자리에 어중간하게 멈춥니다.</span>
    </div>
  );
}

/* ───────── 패럴랙스 ───────── */
export function ParallaxDemo() {
  const reduce = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [on, setOn] = useState(!reduce);
  const [y, setY] = useState(0);
  const off = (speed: number) => (on ? y * (1 - speed) : 0);
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="패럴랙스">
          <button type="button" role="radio" aria-checked={on} className={on ? "on" : ""} onClick={() => setOn(true)}>켬</button>
          <button type="button" role="radio" aria-checked={!on} className={!on ? "on" : ""} onClick={() => setOn(false)}>끔</button>
        </div>
        {reduce && <span className="chip">‘움직임 줄이기’ 설정이 켜져 있어 처음엔 꺼 둡니다</span>}
      </div>
      <div className="nv-para-box" onScroll={(e) => setY(e.currentTarget.scrollTop)} tabIndex={0} aria-label="패럴랙스 예시 (스크롤)">
        <div className="nv-para-hero">
          <div className="nv-para-layer nv-para-sky" style={{ transform: `translateY(${off(0.15)}px)` }}>
            <span className="nv-para-sun" />
          </div>
          <svg className="nv-para-layer" viewBox="0 0 400 300" preserveAspectRatio="none" style={{ transform: `translateY(${off(0.45)}px)` }} aria-hidden="true">
            <path d="M0 190 L70 120 L140 170 L220 95 L300 160 L360 125 L400 150 V300 H0 Z" fill="hsl(250,30%,62%)" />
          </svg>
          <svg className="nv-para-layer" viewBox="0 0 400 300" preserveAspectRatio="none" style={{ transform: `translateY(${off(0.75)}px)` }} aria-hidden="true">
            <path d="M0 240 Q80 190 160 230 T320 215 T400 225 V300 H0 Z" fill="hsl(160,35%,32%)" />
          </svg>
          <div className="nv-para-title">
            <b>산으로 떠나는 주말</b>
            <span>아래로 스크롤</span>
          </div>
        </div>
        <div className="nv-para-body">
          <p><b>앞쪽 글은 손가락만큼</b> 움직이고, 먼 산과 하늘은 그보다 천천히 움직입니다.</p>
          <p className="muted">하늘 0.15배 · 먼 산 0.45배 · 가까운 언덕 0.75배 · 글 1배</p>
          <p className="muted">기차 창밖에서 멀리 있는 산이 천천히 지나가는 것과 같은 원리입니다.</p>
        </div>
      </div>
      <span className="muted">상자 안을 천천히 스크롤해 보세요. 층마다 움직이는 속도가 달라 깊이감이 생깁니다. ‘끔’으로 바꾸면 모두 같은 속도로 올라갑니다.</span>
    </div>
  );
}

/* ───────── 마스터-디테일 ───────── */
const MAILS = [
  { from: "박서준", subj: "내일 회의 시간 변경", body: "내일 회의를 오후 3시로 옮겨도 될까요? 회의실은 그대로입니다." },
  { from: "배송 알림", subj: "주문하신 상품이 출발했어요", body: "오늘 저녁 8시 전에 도착 예정입니다. 문 앞에 두고 갈게요." },
  { from: "김하린", subj: "사진 보내요", body: "지난 주말에 찍은 사진 몇 장 보내요. 마음에 드는 걸로 골라 주세요." },
  { from: "도서관", subj: "반납 예정일 안내", body: "빌리신 책 2권의 반납일이 3일 남았습니다." },
  { from: "문가은", subj: "점심 같이 해요", body: "목요일 점심 어때요? 새로 생긴 국수집 가 봐요." },
];

export function MasterDetailDemo() {
  const [wide, setWide] = useState(true);
  const [sel, setSel] = useState<number | null>(0);
  const backRef = useRef<HTMLButtonElement>(null);
  const pick = (i: number) => {
    setSel(i);
    if (!wide) window.setTimeout(() => backRef.current?.focus({ preventScroll: true }), 0);
  };
  const list = (
    <ul className="nv-md-list" aria-label="받은 메일">
      {MAILS.map((m, i) => (
        <li key={i}>
          <button type="button" className={wide && sel === i ? "on" : ""} aria-current={wide && sel === i ? "true" : undefined} onClick={() => pick(i)}>
            <b>{m.from}</b><span>{m.subj}</span>
          </button>
        </li>
      ))}
    </ul>
  );
  const m = sel === null ? null : MAILS[sel];
  const detail = m ? (
    <div className="nv-md-detail" key={sel}>
      {!wide && <button ref={backRef} type="button" className="link" onClick={() => setSel(null)}>‹ 목록</button>}
      <b>{m.subj}</b>
      <span className="muted">보낸 사람: {m.from}</span>
      <p>{m.body}</p>
    </div>
  ) : <div className="nv-md-detail muted">메일을 고르세요.</div>;
  return (
    <div className="demo-stage">
      <div className="segmented" role="radiogroup" aria-label="화면 폭">
        <button type="button" role="radio" aria-checked={wide} className={wide ? "on" : ""} onClick={() => setWide(true)}>넓게 (태블릿)</button>
        <button type="button" role="radio" aria-checked={!wide} className={!wide ? "on" : ""} onClick={() => { setWide(false); setSel(null); }}>좁게 (휴대폰)</button>
      </div>
      <div className={`nv-md-frame ${wide ? "wide" : "narrow"}`}>
        {wide ? <>{list}{detail}</> : sel === null ? list : detail}
      </div>
      <span className="muted">메일을 하나 골라 보세요. 넓을 때는 목록 옆에 바로 내용이 뜨고, 좁을 때는 목록 → 상세로 화면이 넘어가며 ‘‹ 목록’으로 돌아옵니다.</span>
    </div>
  );
}

/* ───────── 스플릿 뷰 ───────── */
export function SplitViewDemo() {
  const [pct, setPct] = useState(38);
  const lastOpen = useRef(38);
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const dragging = useRef(false);
  const MIN = 15, MAX = 80;
  const set = (v: number) => {
    const n = v < MIN / 2 ? 0 : Math.max(MIN, Math.min(MAX, v));
    if (n > 0) lastOpen.current = n;
    setPct(n);
  };
  const fromPointer = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (k === "ArrowLeft") set(pct === 0 ? 0 : pct - 5 < MIN ? 0 : pct - 5);
    else if (k === "ArrowRight") set(pct === 0 ? MIN : pct + 5);
    else if (k === "Home") set(0);
    else if (k === "End") set(MAX);
    else if (k === "Enter") set(pct === 0 ? lastOpen.current : 0);
    else return;
    e.preventDefault();
  };
  return (
    <div className="demo-stage">
      <div ref={box} className={`nv-split ${drag ? "dragging" : ""}`}>
        <div className="nv-split-pane left" style={{ width: `${pct}%` }} aria-hidden={pct === 0}>
          <div className="nv-split-head">탐색기</div>
          {["index.html", "app.tsx", "styles.css", "README.md"].map((f, i) => <div key={f} className={`nv-split-file ${i === 1 ? "on" : ""}`}>{f}</div>)}
        </div>
        <div className="nv-split-gutter" role="separator" aria-orientation="vertical" aria-label="왼쪽 칸 너비"
          aria-valuemin={0} aria-valuemax={MAX} aria-valuenow={Math.round(pct)} tabIndex={0}
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); dragging.current = true; setDrag(true); }}
          onPointerMove={(e) => { if (dragging.current) fromPointer(e); }}
          onPointerUp={() => { dragging.current = false; setDrag(false); }} onPointerCancel={() => { dragging.current = false; setDrag(false); }}
          onDoubleClick={() => set(38)} onKeyDown={onKey}>
          <span />
        </div>
        <div className="nv-split-pane right">
          <div className="nv-split-head">app.tsx</div>
          <pre className="mono">{`function App() {\n  return <Hello />;\n}`}</pre>
        </div>
      </div>
      <span className="muted">가운데 경계선을 좌우로 끌어 보세요. 왼쪽 끝까지 끌면 칸이 접힙니다(지금 {Math.round(pct)}%). 경계선에 포커스를 두고 ← → 로 조절, Enter 로 접기/펴기, 더블클릭하면 처음 너비로 돌아갑니다.</span>
    </div>
  );
}

/* ───────── 트리 뷰 ───────── */
type TNode = { id: string; label: string; children?: TNode[] };
const TREE: TNode[] = [
  { id: "src", label: "src", children: [
    { id: "src/components", label: "components", children: [
      { id: "src/components/Button.tsx", label: "Button.tsx" },
      { id: "src/components/Card.tsx", label: "Card.tsx" },
    ] },
    { id: "src/pages", label: "pages", children: [
      { id: "src/pages/Home.tsx", label: "Home.tsx" },
      { id: "src/pages/About.tsx", label: "About.tsx" },
    ] },
    { id: "src/main.tsx", label: "main.tsx" },
  ] },
  { id: "public", label: "public", children: [{ id: "public/logo.svg", label: "logo.svg" }] },
  { id: "package.json", label: "package.json" },
];
type Flat = { node: TNode; level: number; parent: string | null; pos: number; size: number };
function flatten(nodes: TNode[], open: Set<string>, level = 1, parent: string | null = null, out: Flat[] = []): Flat[] {
  nodes.forEach((n, i) => {
    out.push({ node: n, level, parent, pos: i + 1, size: nodes.length });
    if (n.children && open.has(n.id)) flatten(n.children, open, level + 1, n.id, out);
  });
  return out;
}

export function TreeViewDemo() {
  const [open, setOpen] = useState<Set<string>>(() => new Set(["src"]));
  const [focus, setFocus] = useState("src");
  const [selected, setSelected] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());
  const treeRef = useRef<HTMLDivElement>(null);
  const keyed = useRef(false);
  const rows = flatten(TREE, open);
  useEffect(() => {
    if (keyed.current) { refs.current.get(focus)?.focus(); keyed.current = false; }
  }, [focus]);
  const toggle = (id: string, to?: boolean) => setOpen((s) => {
    const n = new Set(s);
    if (to ?? !n.has(id)) n.add(id); else n.delete(id);
    return n;
  });
  const onKey = (e: React.KeyboardEvent) => {
    const i = rows.findIndex((r) => r.node.id === focus);
    const r = rows[i];
    if (!r) return;
    const isOpen = open.has(r.node.id);
    const mv = (id: string | undefined) => { if (id) { keyed.current = true; setFocus(id); } };
    switch (e.key) {
      case "ArrowDown": mv(rows[i + 1]?.node.id); break;
      case "ArrowUp": mv(rows[i - 1]?.node.id); break;
      case "Home": mv(rows[0].node.id); break;
      case "End": mv(rows[rows.length - 1].node.id); break;
      case "ArrowRight":
        if (r.node.children) { if (!isOpen) toggle(r.node.id, true); else mv(rows[i + 1]?.node.id); }
        break;
      case "ArrowLeft":
        if (r.node.children && isOpen) toggle(r.node.id, false); else mv(r.parent ?? undefined);
        break;
      case "Enter": case " ":
        if (r.node.children) toggle(r.node.id); else setSelected(r.node.id);
        break;
      default: return;
    }
    e.preventDefault();
  };
  return (
    <div className="demo-stage">
      <div ref={treeRef} className="nv-tree" role="tree" aria-label="프로젝트 파일" onKeyDown={onKey}>
        {rows.map(({ node, level, pos, size }) => {
          const folder = !!node.children;
          const isOpen = open.has(node.id);
          return (
            <div key={node.id} ref={(el) => { if (el) refs.current.set(node.id, el); else refs.current.delete(node.id); }}
              role="treeitem" aria-level={level} aria-posinset={pos} aria-setsize={size}
              aria-expanded={folder ? isOpen : undefined} aria-selected={selected === node.id}
              tabIndex={focus === node.id ? 0 : -1}
              className={`nv-tree-row ${selected === node.id ? "sel" : ""}`}
              style={{ paddingLeft: 6 + (level - 1) * 16 }}
              onClick={() => { setFocus(node.id); if (folder) toggle(node.id); else setSelected(node.id); }}>
              <span className={`nv-tree-chev ${isOpen ? "open" : ""}`} aria-hidden="true">{folder ? "▶" : ""}</span>
              <span aria-hidden="true">{folder ? (isOpen ? "📂" : "📁") : "📄"}</span>
              {node.label}
            </div>
          );
        })}
      </div>
      <span className="muted mono">{selected ? `열린 파일: ${selected}` : "열린 파일 없음"}</span>
      <span className="muted">폴더를 눌러 펼치고 접어 보세요. 키보드로는 ↑ ↓ 로 이동, → 로 펼치기, ← 로 접기(이미 접혀 있으면 부모로), Enter 로 열기입니다.</span>
    </div>
  );
}

/* ───────── 메가 메뉴 ───────── */
const MEGA: { label: string; cols: [string, string[]][] }[] = [
  { label: "패션", cols: [["여성", ["원피스", "블라우스", "니트"]], ["남성", ["셔츠", "청바지", "코트"]], ["잡화", ["가방", "모자", "신발"]]] },
  { label: "가전", cols: [["주방", ["밥솥", "전자레인지", "커피머신"]], ["생활", ["청소기", "공기청정기"]], ["영상", ["TV", "프로젝터", "사운드바"]]] },
  { label: "식품", cols: [["신선", ["과일", "채소", "정육"]], ["간식", ["과자", "음료"]], ["간편식", ["도시락", "냉동식품", "밀키트"]]] },
  { label: "도서", cols: [["국내", ["소설", "에세이", "만화"]], ["외국", ["원서", "잡지"]], ["교육", ["어린이", "수험서"]]] },
];

export function MegaMenuDemo() {
  const [open, setOpen] = useState<number | null>(null);
  const [intent, setIntent] = useState(true);
  const [changes, setChanges] = useState(0);
  const [picked, setPicked] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const openRef = useRef<number | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = (i: number | null) => {
    if (i !== null && i !== openRef.current) setChanges((c) => c + 1);
    openRef.current = i;
    setOpen(i);
  };
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(timer.current);
    if (ms <= 0) fn(); else timer.current = window.setTimeout(fn, ms);
  };
  const enter = (e: React.PointerEvent, i: number) => {
    if (e.pointerType !== "mouse") return;
    later(() => show(i), intent ? (openRef.current === null ? 120 : 220) : 0);
  };
  const leave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    later(() => show(null), intent ? 300 : 0);
  };
  const keep = (e: React.PointerEvent) => { if (e.pointerType === "mouse" && intent) window.clearTimeout(timer.current); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && openRef.current !== null) {
      const i = openRef.current;
      show(null);
      btns.current[i]?.focus();
    }
  };
  const menu = open === null ? null : MEGA[open];
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="호버 의도 판단">
          <button type="button" role="radio" aria-checked={intent} className={intent ? "on" : ""} onClick={() => setIntent(true)}>의도 판단 켬</button>
          <button type="button" role="radio" aria-checked={!intent} className={!intent ? "on" : ""} onClick={() => setIntent(false)}>바로 반응</button>
        </div>
        <span className="muted tabular">패널 바뀜 {changes}번</span>
      </div>
      <div className="nv-mega" onPointerLeave={leave} onKeyDown={onKey}>
        <div className="nv-mega-head">
        <div className="nv-mega-bar">
          <span className="nv-mega-logo" aria-hidden="true">●</span>
          {MEGA.map((m, i) => (
            <button key={m.label} ref={(el) => { btns.current[i] = el; }} type="button"
              className={`nv-mega-top ${open === i ? "on" : ""}`} aria-expanded={open === i} aria-controls="nv-mega-panel"
              onPointerEnter={(e) => enter(e, i)}
              onClick={() => { window.clearTimeout(timer.current); show(open === i ? null : i); }}>
              {m.label}
            </button>
          ))}
        </div>
        {menu && (
          <div id="nv-mega-panel" className="nv-mega-panel" onPointerEnter={keep} key={open}>
            {menu.cols.map(([h, items]) => (
              <div key={h} className="nv-mega-col">
                <b>{h}</b>
                {items.map((it) => (
                  <button key={it} type="button" className="nv-mega-link" onClick={() => { setPicked(`${menu.label} › ${h} › ${it}`); show(null); }}>{it}</button>
                ))}
              </div>
            ))}
          </div>
        )}
        </div>
        <div className="nv-mega-page">
          <div className="nv-mega-banner" style={{ backgroundImage: `url("${photo(5, 400, 120)}")` }} />
          <p className="muted">{picked ? `고른 곳: ${picked}` : "오늘의 특가 · 무료 배송"}</p>
        </div>
      </div>
      <span className="muted">‘패션’에 마우스를 올린 다음, 펼쳐진 패널의 오른쪽 ‘잡화’ 열로 비스듬히 옮겨 보세요. ‘바로 반응’이면 지나치는 ‘가전’·‘식품’마다 패널이 바뀌어 깜빡이고, 의도 판단을 켜면 잠깐 머물 때만 바뀝니다. 터치에서는 눌러서 엽니다.</span>
    </div>
  );
}

/* ───────── 플로팅 액션 버튼 ───────── */
const FAB_ACTIONS = [
  { icon: "✎", label: "새 메모" },
  { icon: "▣", label: "사진 추가" },
  { icon: "☑", label: "할 일" },
];

export function FabDemo() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [msg, setMsg] = useState("");
  const last = useRef(0);
  const msgTimer = useRef<number | undefined>(undefined);
  const mainRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => window.clearTimeout(msgTimer.current), []);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    if (y > last.current + 4 && y > 30) { setHidden(true); setOpen(false); }
    else if (y < last.current - 4) setHidden(false);
    last.current = y;
  };
  const run = (label: string) => {
    setOpen(false);
    setMsg(`‘${label}’ 실행`);
    window.clearTimeout(msgTimer.current);
    msgTimer.current = window.setTimeout(() => setMsg(""), 1600);
    mainRef.current?.focus({ preventScroll: true });
  };
  return (
    <div className="demo-stage">
      <div className="phone nv-fab-phone" onKeyDown={(e) => { if (e.key === "Escape" && open) { setOpen(false); mainRef.current?.focus({ preventScroll: true }); } }}>
        <div className="nv-fab-scroll" onScroll={onScroll} tabIndex={0} aria-label="메모 목록 (스크롤)">
          <div className="nv-fab-appbar">메모</div>
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} className="nv-fab-note"><b>메모 {i + 1}</b><span className="muted">장보기, 우유, 계란…</span></div>
          ))}
        </div>
        {open && <div className="scrim" onClick={() => setOpen(false)} />}
        <div className={`nv-fab-wrap ${hidden ? "hidden" : ""} ${open ? "open" : ""}`}>
          <ul className="nv-fab-actions" id="nv-fab-actions" aria-hidden={!open}>
            {FAB_ACTIONS.map((a, i) => (
              <li key={a.label} style={{ transitionDelay: open ? `${(FAB_ACTIONS.length - 1 - i) * 40}ms` : "0ms" }}>
                <span className="nv-fab-label">{a.label}</span>
                <button type="button" className="nv-fab-mini" aria-label={a.label} tabIndex={open ? 0 : -1} onClick={() => run(a.label)}>{a.icon}</button>
              </li>
            ))}
          </ul>
          <button ref={mainRef} type="button" className="nv-fab-main" aria-label={open ? "닫기" : "새로 만들기"} aria-expanded={open} aria-controls="nv-fab-actions" onClick={() => setOpen(!open)}>
            <span aria-hidden="true">+</span>
          </button>
        </div>
        {msg && <div className="nv-fab-toast" role="status">{msg}</div>}
      </div>
      <span className="muted">오른쪽 아래 둥근 + 버튼을 눌러 보세요. 하위 동작 세 개가 펼쳐집니다(스피드 다이얼). 목록을 아래로 스크롤하면 버튼이 비켜 숨고, 위로 올리면 다시 나타납니다.</span>
    </div>
  );
}

/* ───────── 온보딩·코치마크 ───────── */
export function OnboardingDemo() {
  const phone = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLButtonElement>(null);
  const statsRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const interacted = useRef(false);
  const steps = [
    { ref: addRef, title: "여기서 기록 추가", text: "지출이나 수입을 바로 적을 수 있어요." },
    { ref: searchRef, title: "검색", text: "지난 기록을 가게 이름으로 찾아보세요." },
    { ref: statsRef, title: "통계 탭", text: "한 달 동안 어디에 썼는지 그래프로 보여 줘요." },
  ];
  const [step, setStep] = useState<number | null>(0);
  const [hole, setHole] = useState({ x: 0, y: 0, w: 0, h: 0 });
  useLayoutEffect(() => {
    if (step === null) return;
    const p = phone.current; const t = steps[step].ref.current;
    if (!p || !t) return;
    const pr = p.getBoundingClientRect(); const r = t.getBoundingClientRect();
    const pad = 5;
    setHole({ x: r.left - pr.left - p.clientLeft - pad, y: r.top - pr.top - p.clientTop - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
    if (interacted.current) nextRef.current?.focus({ preventScroll: true });
  }, [step]);
  const next = () => { interacted.current = true; setStep(step === null || step >= steps.length - 1 ? null : step + 1); };
  const skip = () => { interacted.current = true; setStep(null); };
  const W = 236, BW = 204;
  const below = hole.y + hole.h / 2 < 150;
  const bubbleLeft = Math.max(8, Math.min(W - BW - 8, hole.x + hole.w / 2 - BW / 2));
  const arrowLeft = Math.max(14, Math.min(BW - 14, hole.x + hole.w / 2 - bubbleLeft));
  return (
    <div className="demo-stage">
      <div ref={phone} className="phone nv-ob-phone">
        <div className="nv-ob-header">
          <b>가계부</b>
          <button ref={searchRef} type="button" className="nv-ob-icon" aria-label="검색">⌕</button>
        </div>
        <div className="nv-ob-body">
          <div className="nv-ob-card"><span className="muted">이번 달 지출</span><b>482,300원</b></div>
          <div className="nv-ob-line"><span>카페</span><span>-4,800</span></div>
          <div className="nv-ob-line"><span>마트</span><span>-32,150</span></div>
          <div className="nv-ob-line"><span>교통</span><span>-1,450</span></div>
          <button ref={addRef} type="button" className="btn small primary nv-ob-add">+ 기록</button>
        </div>
        <div className="nv-ob-tabs">
          <button type="button">목록</button>
          <button ref={statsRef} type="button">통계</button>
          <button type="button">설정</button>
        </div>
        {step !== null && (
          <div className="nv-ob-layer" onKeyDown={(e) => { if (e.key === "Escape") skip(); }}>
            <div className="nv-ob-hole" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} />
            <div className={`nv-ob-bubble ${below ? "below" : "above"}`} role="dialog" aria-label="사용 안내"
              style={below ? { top: hole.y + hole.h + 10, left: bubbleLeft, width: BW } : { bottom: 296 - hole.y + 10, left: bubbleLeft, width: BW }}>
              <span className="nv-ob-arrow" style={{ left: arrowLeft }} aria-hidden="true" />
              <b>{steps[step].title}</b>
              <p>{steps[step].text}</p>
              <div className="nv-ob-foot">
                <span className="muted tabular">{step + 1} / {steps.length}</span>
                <button type="button" className="link" onClick={skip}>건너뛰기</button>
                <button ref={nextRef} type="button" className="btn small primary" onClick={next}>{step === steps.length - 1 ? "시작하기" : "다음"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="row">
        <button type="button" className="btn small" onClick={() => { interacted.current = true; setStep(0); }} disabled={step !== null}>안내 다시 보기</button>
      </div>
      <span className="muted">처음 연 앱처럼 화면이 어두워지고 버튼 하나만 밝게 뚫려 설명이 붙습니다. ‘다음’으로 하나씩 넘기거나, 언제든 ‘건너뛰기’(Esc)로 끝낼 수 있습니다.</span>
    </div>
  );
}
