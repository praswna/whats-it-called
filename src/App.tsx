import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { categories } from "./data/categories";
import { terms } from "./data/terms";
import type { CategoryId, Term } from "./data/types";
import { demos } from "./demos";
import { searchTerms } from "./search";
import { thumbs } from "./data/thumbs";

const byId = new Map(terms.map((t) => [t.id, t]));
const catName = (id: CategoryId) => categories.find((c) => c.id === id)?.name ?? id;

function readHash(): string | null {
  const h = location.hash.replace(/^#/, "");
  return byId.has(h) ? h : null;
}

// 이 폭 이상이면 카드 옆에 떠 있는 창으로, 그보다 좁으면 목록 자리에 한 페이지로 보여 준다
const FLOAT = "(min-width: 760px)";
const POP_W = 560;

type Place = { top: number; left: number; side: "right" | "left" | "below"; arrow: number };

function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const fn = () => setOn(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, [query]);
  return on;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(readHash);
  const floating = useMedia(FLOAT);
  const still = useMedia("(prefers-reduced-motion: reduce)");
  const searchRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const paneRef = useRef<HTMLElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  // 떠 있는 창이 붙는 카드 (창 안에서 다른 용어로 넘어가도 창 자리는 그대로)
  const [anchorId, setAnchorId] = useState<string | null>(openId);
  const [place, setPlace] = useState<Place | null>(null);
  const openRef = useRef(openId);
  const listScroll = useRef(0);

  const results = useMemo(() => searchTerms(terms, query), [query]);
  const searching = query.trim().length > 0;
  const demoCount = terms.filter((t) => t.demo).length;
  // 화면에 보이는 순서대로 (이전/다음 버튼용)
  const ordered = useMemo(() => {
    const list = searching ? results : terms;
    return categories.flatMap((c) => list.filter((t) => t.category === c.id));
  }, [searching, results]);

  const show = (id: string | null) => { openRef.current = id; setOpenId(id); };

  // 주소의 #용어-id 와 열린 항목을 맞춘다. 뒤로 가기로 이전 항목·목록으로 돌아간다
  useEffect(() => {
    const onNav = () => show(readHash());
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => { window.removeEventListener("popstate", onNav); window.removeEventListener("hashchange", onNav); };
  }, []);

  // 목록을 보고 있을 때의 스크롤 위치를 기억해 두었다가, 상세에서 돌아오면 되돌린다
  useEffect(() => {
    const onScroll = () => { if (!openRef.current) listScroll.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const prevOpen = useRef(openId);
  useLayoutEffect(() => {
    const was = prevOpen.current; prevOpen.current = openId;
    if (was === openId) return;
    if (floating) {
      paneRef.current?.scrollTo(0, 0);
    } else {
      window.scrollTo(0, openId ? 0 : listScroll.current);
    }
  }, [openId, floating]);

  // 떠 있는 창 자리 잡기: 카드 오른쪽에 자리가 있으면 오른쪽, 없으면 왼쪽, 둘 다 없으면 카드 아래
  const measure = () => {
    const card = anchorId ? document.getElementById(`card-${anchorId}`) : null;
    const pop = popRef.current, app = appRef.current;
    if (!card || !pop || !app) { setPlace(null); return; }
    const r = card.getBoundingClientRect();
    const a = app.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const topH = topRef.current?.offsetHeight ?? 0;
    const w = Math.min(POP_W, vw - 32), h = pop.offsetHeight, gap = 14;
    let side: Place["side"], left: number, top: number, arrow: number;
    if (vw - r.right - 16 >= w + gap) { side = "right"; left = r.right + gap; }
    else if (r.left - 16 >= w + gap) { side = "left"; left = r.left - gap - w; }
    else { side = "below"; left = Math.min(Math.max(16, r.left + r.width / 2 - w / 2), vw - 16 - w); }
    if (side === "below") {
      top = r.bottom + gap;
      arrow = r.left + r.width / 2 - left;
    } else {
      // 카드 위쪽에 맞추되, 화면 안에 다 들어오도록 위아래를 조정
      top = Math.max(topH + 12, Math.min(r.top - 8, vh - 16 - h));
      arrow = Math.min(Math.max(24, r.top + Math.min(r.height, 120) / 2 - top), h - 24);
    }
    setPlace({ side, left: left - a.left, top: top - a.top, arrow });
  };
  // 창이 화면 아래로 넘치면 보이도록 조금 내린다 (카드를 새로 눌렀을 때만)
  useEffect(() => {
    if (!place || !popRef.current) return;
    const b = popRef.current.getBoundingClientRect();
    const over = b.bottom - window.innerHeight + 16;
    if (over > 0) window.scrollBy({ top: Math.min(over, b.top - (topRef.current?.offsetHeight ?? 0) - 12), behavior: "smooth" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorId, place === null]);
  useLayoutEffect(() => {
    if (!floating || !openId) { setPlace(null); return; }
    measure();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floating, openId, anchorId]);
  useEffect(() => {
    if (!floating || !openId) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    // 예시를 만지다 창 높이가 바뀌어도 자리를 다시 잡는다
    const ro = new ResizeObserver(() => measure());
    if (popRef.current) ro.observe(popRef.current);
    return () => { window.removeEventListener("resize", onResize); ro.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floating, openId, anchorId]);
  // 주소로 바로 들어왔을 때: 그 카드를 화면 가운데로 가져온 뒤 창을 붙인다
  useEffect(() => {
    if (openId && floating) {
      document.getElementById(`card-${openId}`)?.scrollIntoView({ block: "center" });
      requestAnimationFrame(measure);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 창 바깥(다른 카드 말고)을 누르면 닫는다
  useEffect(() => {
    if (!floating || !openId) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || popRef.current?.contains(t) || t.closest(".card")) return;
      close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  });

  // 고정된 머리말 높이를 CSS 에 알려 준다 (옆 목록·상세 패널이 그 아래에 붙도록)
  useLayoutEffect(() => {
    const el = topRef.current; if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--top-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const open = (id: string) => {
    if (id === openId) return;
    history.pushState(null, "", `#${id}`);
    show(id);
  };
  const close = () => {
    const was = openRef.current;
    history.pushState(null, "", `${location.pathname}${location.search}`);
    show(null);
    if (floating && anchorId) document.getElementById(`card-${anchorId}`)?.focus({ preventScroll: true });
    else if (was) document.getElementById(`card-${was}`)?.focus({ preventScroll: true });
  };
  // 카드를 누르면 그 카드 옆에 창을 띄운다. 열린 카드를 다시 누르면 닫는다
  const openFromCard = (id: string) => {
    if (id === openId && floating) { close(); return; }
    setAnchorId(id);
    open(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape" && openRef.current && !typing && !document.querySelector("dialog[open]")) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = openId ? byId.get(openId) : undefined;
  const idx = current ? ordered.findIndex((t) => t.id === current.id) : -1;
  const prev = idx > 0 ? ordered[idx - 1] : undefined;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : undefined;

  const goCategory = (id: CategoryId) => {
    const jump = () => document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (current) { close(); requestAnimationFrame(jump); } else jump();
  };

  const detail = current && (
    <article className="detail-body" key={current.id}>
      <div className="detail-top">
        <button type="button" className="link" onClick={close}>{floating ? "✕ 닫기" : "← 목록으로"}</button>
        <span className="muted tabular detail-pos">{idx >= 0 ? `${idx + 1} / ${ordered.length}` : ""}</span>
      </div>
      <p className="eyebrow">{catName(current.category)}</p>
      <h2 className="detail-name">{current.name}</h2>
      <p className="detail-en mono">{current.en}</p>
      {current.aliases.length > 0 && (
        <p className="aliases">{current.aliases.map((a) => <span key={a} className="chip">{a}</span>)}</p>
      )}
      <p className="detail-summary">{current.summary}</p>
      <p className="detail-desc">{current.description}</p>
      {current.demo && demos[current.demo] && (
        <section className="demo">
          <h3>직접 해 보기</h3>
          <DemoHost demoKey={current.demo} />
        </section>
      )}
      <section>
        <h3>이런 곳에서 봤을 거예요</h3>
        <ul className="examples">{current.examples.map((e) => <li key={e}>{e}</li>)}</ul>
      </section>
      {current.related.length > 0 && (
        <section>
          <h3>같이 보면 좋은 말</h3>
          <p className="related">
            {current.related.map((id) => byId.get(id)).filter((t): t is Term => !!t).map((t) => (
              <button type="button" key={t.id} className="chip link-chip" onClick={() => open(t.id)}>{t.name} <span className="mono muted">{t.en}</span></button>
            ))}
          </p>
        </section>
      )}
      <nav className="pager" aria-label="이전·다음 용어">
        {prev ? (
          <button type="button" className="pager-btn" onClick={() => open(prev.id)}>
            <span className="muted">← 이전</span><b>{prev.name}</b>
          </button>
        ) : <span />}
        {next ? (
          <button type="button" className="pager-btn end" onClick={() => open(next.id)}>
            <span className="muted">다음 →</span><b>{next.name}</b>
          </button>
        ) : <span />}
      </nav>
    </article>
  );

  return (
    <div className="app" ref={appRef}>
      <header className="top" ref={topRef}>
        <div className="brand">
          <h1><a href="./" onClick={(e) => { e.preventDefault(); if (current) close(); setQuery(""); window.scrollTo(0, 0); }}>이거 뭐라고 하지</a></h1>
          <p className="tagline">기능은 아는데 이름을 모를 때. 용어 {terms.length}개, 직접 만져 보는 예시 {demoCount}개.</p>
        </div>
        <div className="search">
          <input ref={searchRef} id="q" type="search" value={query}
            onChange={(e) => { setQuery(e.target.value); if (current && !floating) close(); }}
            placeholder="동작을 말로 적어 보세요. 예: 누르고 끌면, 회색 뼈대, 되돌리기" autoComplete="off" />
          {!query && <kbd aria-hidden="true">/</kbd>}
        </div>
      </header>

      <div className={`body ${current && !floating ? "has-detail" : ""}`}>
        <nav className="side" aria-label="카테고리">
          <ul>
            {categories.map((c) => {
              const n = (searching ? results : terms).filter((t) => t.category === c.id).length;
              const here = current?.category === c.id;
              return (
                <li key={c.id} className={`${n === 0 ? "dim" : ""} ${here ? "here" : ""}`}>
                  <a href={`#cat-${c.id}`} onClick={(e) => { e.preventDefault(); goCategory(c.id); }}>
                    <span>{c.name}</span><span className="count tabular">{n}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="main">
          {searching && results.length === 0 && (
            <div className="empty">
              <b>찾지 못했어요.</b>
              <p>다른 말로 적어 보세요. 생김새(둥근, 회색), 동작(끌면, 누르면), 어디서 봤는지(유튜브, 포토샵)로도 찾을 수 있습니다.</p>
            </div>
          )}
          {categories.map((c) => {
            const list = (searching ? results : terms).filter((t) => t.category === c.id);
            if (list.length === 0) return null;
            return (
              <section key={c.id} id={`cat-${c.id}`} className="cat">
                <header className="cat-head">
                  <h2>{c.name}</h2>
                  <p className="muted">{c.blurb}</p>
                </header>
                <div className="grid">
                  {list.map((t) => <TermCard key={t.id} term={t} active={t.id === openId} still={still} onOpen={openFromCard} />)}
                </div>
              </section>
            );
          })}
        </main>

        {current && !floating && (
          <aside className="detail" ref={paneRef} aria-label={`${current.name} 설명`}>
            {detail}
          </aside>
        )}
      </div>

      {current && floating && (
        <div ref={popRef} role="dialog" aria-label={`${current.name} 설명`}
          className={`pop pop-${place?.side ?? "right"}`}
          style={{ top: place?.top ?? 0, left: place?.left ?? 0, visibility: place ? "visible" : "hidden", ["--arrow" as string]: `${place?.arrow ?? 24}px` }}>
          <span className="pop-arrow" aria-hidden="true" />
          <aside className="detail" ref={paneRef}>
            {detail}
          </aside>
        </div>
      )}

      <footer className="foot">
        <span>검색은 설명과 예시 안의 말도 찾습니다. 항목 링크: 주소 끝에 #용어-id</span>
        <BuildStamp />
      </footer>
    </div>
  );
}

function TermCard({ term, active, still, onOpen }: { term: Term; active: boolean; still: boolean; onOpen: (id: string) => void }) {
  const kind = thumbs[term.id];
  // 움직임 줄이기를 켠 사람에게는 정지 썸네일
  const file = (theme: string) => `./thumbs/${term.id}.${theme}${kind === "anim" && !still ? ".anim" : ""}.webp`;
  return (
    <button type="button" id={`card-${term.id}`} className={`card ${active ? "on" : ""}`} aria-current={active || undefined} onClick={() => onOpen(term.id)}>
      {kind && (
        <picture className="card-thumb">
          <source media="(prefers-color-scheme: dark)" srcSet={file("dark")} />
          <img src={file("light")} alt="" loading="lazy" decoding="async" width={400} height={250} />
        </picture>
      )}
      <span className="card-name">{term.name}</span>
      <span className="card-en mono">{term.en}</span>
      <span className="card-summary">{term.summary}</span>
      {term.demo && <span className="card-demo">▶ 직접 해 보기</span>}
    </button>
  );
}

function DemoHost({ demoKey }: { demoKey: string }) {
  const Demo = demos[demoKey];
  return <Demo />;
}

function BuildStamp() {
  const { time, sha, repo } = __BUILD_INFO__;
  const label = sha ? `v${time} · ${sha}` : `v${time}`;
  return sha ? (
    <a className="build mono" href={`https://github.com/${repo}/commit/${sha}`} target="_blank" rel="noreferrer">{label}</a>
  ) : (
    <span className="build mono">{label}</span>
  );
}
