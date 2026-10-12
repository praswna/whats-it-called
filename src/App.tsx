import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { categories } from "./data/categories";
import { terms } from "./data/terms";
import type { CategoryId, Term } from "./data/types";
import { demos } from "./demos";
import { searchTerms } from "./search";

const byId = new Map(terms.map((t) => [t.id, t]));
const catName = (id: CategoryId) => categories.find((c) => c.id === id)?.name ?? id;

function readHash(): string | null {
  const h = location.hash.replace(/^#/, "");
  return byId.has(h) ? h : null;
}

const WIDE = "(min-width: 1100px)";

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
  const wide = useMedia(WIDE);
  const searchRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const paneRef = useRef<HTMLElement>(null);
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
    if (wide) {
      paneRef.current?.scrollTo(0, 0);
      if (openId) document.getElementById(`card-${openId}`)?.scrollIntoView({ block: "nearest" });
    } else {
      window.scrollTo(0, openId ? 0 : listScroll.current);
    }
  }, [openId, wide]);

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
    history.pushState(null, "", `${location.pathname}${location.search}`);
    show(null);
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
    if (current && !wide) { close(); requestAnimationFrame(jump); } else jump();
  };

  return (
    <div className="app">
      <header className="top" ref={topRef}>
        <div className="brand">
          <h1><a href="./" onClick={(e) => { e.preventDefault(); if (current) close(); setQuery(""); window.scrollTo(0, 0); }}>이거 뭐라고 하지</a></h1>
          <p className="tagline">기능은 아는데 이름을 모를 때. 용어 {terms.length}개, 직접 만져 보는 예시 {demoCount}개.</p>
        </div>
        <div className="search">
          <input ref={searchRef} id="q" type="search" value={query}
            onChange={(e) => { setQuery(e.target.value); if (current && !wide) close(); }}
            placeholder="동작을 말로 적어 보세요. 예: 누르고 끌면, 회색 뼈대, 되돌리기" autoComplete="off" />
          {!query && <kbd aria-hidden="true">/</kbd>}
        </div>
      </header>

      <div className={`body ${current ? "has-detail" : ""}`}>
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
                  {list.map((t) => <TermCard key={t.id} term={t} active={t.id === openId} onOpen={open} />)}
                </div>
              </section>
            );
          })}
        </main>

        {current && (
          <aside className="detail" ref={paneRef} aria-label={`${current.name} 설명`}>
            <article className="detail-body" key={current.id}>
              <div className="detail-top">
                <button type="button" className="link" onClick={close}>{wide ? "✕ 닫기" : "← 목록으로"}</button>
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
          </aside>
        )}
      </div>

      <footer className="foot">
        <span>검색은 설명과 예시 안의 말도 찾습니다. 항목 링크: 주소 끝에 #용어-id</span>
        <BuildStamp />
      </footer>
    </div>
  );
}

function TermCard({ term, active, onOpen }: { term: Term; active: boolean; onOpen: (id: string) => void }) {
  return (
    <button type="button" id={`card-${term.id}`} className={`card ${active ? "on" : ""}`} aria-current={active || undefined} onClick={() => onOpen(term.id)}>
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
