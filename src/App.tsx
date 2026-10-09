import { useEffect, useMemo, useRef, useState } from "react";
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

export default function App() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(readHash);
  const [history, setHistory] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchTerms(terms, query), [query]);
  const searching = query.trim().length > 0;
  const demoCount = terms.filter((t) => t.demo).length;

  // 해시 ↔ 열린 항목 동기화
  useEffect(() => {
    const onHash = () => setOpenId(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const d = dialogRef.current; if (!d) return;
    if (openId && !d.open) d.showModal();
    if (!openId && d.open) d.close();
    const want = openId ? `#${openId}` : "";
    if (location.hash !== want) history_replace(want);
  }, [openId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && !openId) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  const open = (id: string) => { setHistory(openId ? [...history, openId] : []); setOpenId(id); };
  const back = () => { const prev = history[history.length - 1]; setHistory(history.slice(0, -1)); setOpenId(prev ?? null); };
  const close = () => { setHistory([]); setOpenId(null); };
  const current = openId ? byId.get(openId) : undefined;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>이거 뭐라고 하지</h1>
          <p className="tagline">기능은 아는데 이름을 모를 때. 용어 {terms.length}개, 직접 만져 보는 예시 {demoCount}개.</p>
        </div>
        <div className="search">
          <input ref={searchRef} id="q" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="동작을 말로 적어 보세요. 예: 누르고 끌면, 회색 뼈대, 되돌리기" autoComplete="off" />
          {!query && <kbd aria-hidden="true">/</kbd>}
        </div>
      </header>

      <div className="body">
        <nav className="side" aria-label="카테고리">
          <ul>
            {categories.map((c) => {
              const n = (searching ? results : terms).filter((t) => t.category === c.id).length;
              return (
                <li key={c.id} className={n === 0 ? "dim" : ""}>
                  <a href={`#cat-${c.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
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
                  {list.map((t) => <TermCard key={t.id} term={t} onOpen={open} />)}
                </div>
              </section>
            );
          })}
        </main>
      </div>

      <dialog ref={dialogRef} className="detail" onClose={close} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        {current && (
          <article className="detail-body" key={current.id}>
            <div className="detail-top">
              {history.length > 0 ? <button type="button" className="link" onClick={back}>← 이전</button> : <span />}
              <button type="button" className="btn icon" aria-label="닫기" onClick={close}>✕</button>
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
          </article>
        )}
      </dialog>

      <footer className="foot">
        <span>검색은 설명과 예시 안의 말도 찾습니다. 항목 링크: 주소 끝에 #용어-id</span>
        <BuildStamp />
      </footer>
    </div>
  );
}

function history_replace(hash: string) {
  history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
}

function TermCard({ term, onOpen }: { term: Term; onOpen: (id: string) => void }) {
  return (
    <button type="button" className="card" onClick={() => onOpen(term.id)}>
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
