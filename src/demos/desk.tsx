import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import { photo } from "./media";
import "./desk.css";

/* ───────── 공통: 작은 가짜 데스크톱 ───────── */

function Desk({ children, tray, tasks, height = 230, screenRef, label, className = "", ...rest }: {
  children?: ReactNode; tray?: ReactNode; tasks?: ReactNode; height?: number; screenRef?: Ref<HTMLDivElement>; label?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div className={`dk-desk ${className}`} style={{ height }} role="group" aria-label={label ?? "가짜 데스크톱"} {...rest}>
      <div className="dk-screen" ref={screenRef}>{children}</div>
      <div className="dk-taskbar">
        <span className="dk-start" aria-hidden="true">▦</span>
        <div className="dk-tasks">{tasks}</div>
        <div className="dk-tray">
          {tray}
          <span className="dk-clock" aria-hidden="true">오후 3:24</span>
        </div>
      </div>
    </div>
  );
}

function Win({ title, icon, active, style, className = "", onPointerDown, titleProps, controls, children }: {
  title: string; icon?: string; active?: boolean; style?: CSSProperties; className?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  titleProps?: HTMLAttributes<HTMLDivElement>; controls?: ReactNode; children?: ReactNode;
}) {
  return (
    <div className={`dk-win${active ? " active" : ""} ${className}`} style={style} onPointerDown={onPointerDown}>
      <div className="dk-titlebar" {...titleProps}>
        {icon && <span className="dk-ticon" aria-hidden="true">{icon}</span>}
        <span className="dk-ttext">{title}</span>
        {controls && <span className="dk-tctrls">{controls}</span>}
      </div>
      <div className="dk-wbody">{children}</div>
    </div>
  );
}

/* 제목줄 안 작은 버튼: 누를 때 창 끌기가 시작되지 않게 막는다 */
function TBtn({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`dk-tbtn ${className}`} onPointerDown={(e) => e.stopPropagation()} {...rest}>{children}</button>
  );
}

function Lines({ n = 3 }: { n?: number }) {
  return <div className="dk-lines" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} style={{ width: `${90 - ((i * 23) % 45)}%` }} />)}</div>;
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={`btn small dk-toggle${on ? " on" : ""}`} aria-pressed={on} onClick={onClick}>{children}</button>;
}

/* ───────── 항상 위 ───────── */

const AOT = [
  { id: "doc", title: "문서 편집기", icon: "📝", x: 3, y: 5, w: 60, h: 64 },
  { id: "web", title: "웹 브라우저", icon: "🌐", x: 28, y: 22, w: 68, h: 68 },
  { id: "memo", title: "메모", icon: "🗒️", x: 58, y: 3, w: 38, h: 46 },
];

export function AlwaysOnTopDemo() {
  const [order, setOrder] = useState(["memo", "doc", "web"]);
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  const focused = order[order.length - 1];
  const front = (id: string) => setOrder((o) => [...o.filter((x) => x !== id), id]);
  const pinnedNames = AOT.filter((w) => pinned[w.id]).map((w) => w.title);
  return (
    <div className="demo-stage">
      <Desk tasks={AOT.map((w) => (
        <button type="button" key={w.id} className={`dk-task${focused === w.id ? " on" : ""}`} onClick={() => front(w.id)} aria-label={`${w.title} 앞으로`}>{w.icon}</button>
      ))}>
        {AOT.map((w) => {
          const i = order.indexOf(w.id);
          return (
            <Win key={w.id} title={w.title} icon={w.icon} active={focused === w.id}
              className={pinned[w.id] ? "dk-pinned" : ""}
              style={{ left: `${w.x}%`, top: `${w.y}%`, width: `${w.w}%`, height: `${w.h}%`, zIndex: (pinned[w.id] ? 100 : 10) + i }}
              onPointerDown={() => front(w.id)}
              controls={<TBtn className={pinned[w.id] ? "on" : ""} aria-pressed={!!pinned[w.id]} aria-label={`${w.title} 항상 위`} title="항상 위"
                onClick={() => { setPinned((p) => ({ ...p, [w.id]: !p[w.id] })); front(w.id); }}>📌</TBtn>}>
              {w.id === "memo" ? <p className="dk-small">할 일<br />· 3시 회의<br />· 우유 사기</p> : <Lines n={4} />}
            </Win>
          );
        })}
      </Desk>
      <p className="dk-status">포커스: <b>{AOT.find((w) => w.id === focused)?.title}</b> · 항상 위: <b>{pinnedNames.length ? pinnedNames.join(", ") : "없음"}</b></p>
      <span className="muted">창을 눌러 앞으로 가져와 보세요. 메모의 📌 를 켜면 다른 창을 눌러도 메모가 가려지지 않습니다. 둘 이상 고정하면 고정된 창끼리 다시 순서를 다툽니다.</span>
    </div>
  );
}

/* ───────── 오버레이 창·HUD ───────── */

export function OverlayDemo() {
  const [hud, setHud] = useState(true);
  const [through, setThrough] = useState(false);
  const [fps, setFps] = useState(60);
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState({ x: 55, y: 45 });
  const [msg, setMsg] = useState("과녁을 눌러 보세요.");
  useEffect(() => {
    const t = window.setInterval(() => setFps(57 + Math.floor(Math.random() * 5)), 600);
    return () => window.clearInterval(t);
  }, []);
  const hit = () => {
    setScore((s) => s + 1);
    setPos({ x: 15 + Math.random() * 70, y: 25 + Math.random() * 55 });
    setMsg(hud ? "명중! 클릭이 오버레이를 통과해 아래 게임에 닿았습니다." : "명중! (지금은 오버레이가 꺼져 있습니다)");
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <Toggle on={hud} onClick={() => setHud((v) => !v)}>HUD 보이기</Toggle>
        <Toggle on={through} onClick={() => setThrough((v) => !v)}>클릭 통과</Toggle>
      </div>
      <Desk tasks={<button type="button" className="dk-task on" aria-label="우주 게임">🚀</button>}>
        <Win title="우주 게임" icon="🚀" active style={{ left: 0, top: 0, width: "100%", height: "100%" }}>
          <div className="dk-game">
            <span className="dk-score">점수 {score}</span>
            <button type="button" className="dk-target" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onClick={hit} aria-label="과녁" />
          </div>
        </Win>
        {hud && (
          <div className={`dk-hud${through ? " through" : ""}`}
            onPointerDown={() => setMsg("오버레이가 클릭을 가로챘습니다. 아래 게임은 아무것도 받지 못했습니다.")}>
            <span className="dk-hud-fps mono">FPS {fps}</span>
            <span className="dk-hud-rec">● 녹화 중</span>
            <span className="dk-hud-tag">{through ? "클릭 통과 창" : "클릭을 받는 창"}</span>
          </div>
        )}
      </Desk>
      <p className="dk-status" aria-live="polite">{msg}</p>
      <span className="muted">게임 창 위에 투명한 HUD 가 겹쳐 있습니다. ‘클릭 통과’를 끄면 과녁을 눌러도 오버레이가 먼저 받고, 켜면 클릭이 그대로 아래 게임에 전달됩니다.</span>
    </div>
  );
}

/* ───────── 시스템 트레이 · 트레이로 최소화 · 시작 프로그램 ───────── */

type WinState = "open" | "min" | "hidden";

export function TrayDemo() {
  const [running, setRunning] = useState(true);
  const [ws, setWs] = useState<WinState>("open");
  const [toTray, setToTray] = useState(true);
  const [auto, setAuto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [balloon, setBalloon] = useState(false);
  const [booting, setBooting] = useState(false);
  const [log, setLog] = useState("메신저가 실행 중입니다. 오른쪽 아래 트레이에 💬 아이콘이 있습니다.");
  const told = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const openWin = () => { setRunning(true); setWs("open"); setMenu(false); setBalloon(false); setLog("창을 다시 열었습니다."); };
  const close = () => {
    setMenu(false);
    if (toTray) {
      setWs("hidden");
      setLog("창은 닫혔지만 앱은 끝나지 않고 트레이 아이콘으로 남았습니다. 아이콘을 두 번 누르면 다시 열립니다.");
      if (!told.current) { told.current = true; setBalloon(true); later(() => setBalloon(false), 3500); }
    } else {
      quit("X 를 눌러 앱이 완전히 종료되었습니다. 트레이 아이콘도 사라졌습니다.");
    }
  };
  const quit = (text = "트레이 메뉴의 ‘종료’로 앱을 끝냈습니다.") => {
    setRunning(false); setWs("hidden"); setMenu(false); setBalloon(false); setLog(text);
  };
  const reboot = () => {
    setBooting(true); setRunning(false); setWs("hidden"); setMenu(false); setBalloon(false);
    setLog("컴퓨터를 다시 시작하는 중…");
    later(() => {
      setBooting(false);
      if (auto) { setRunning(true); setLog("로그인하자마자 메신저가 저절로 실행되어 트레이에 아이콘이 생겼습니다 (시작 프로그램)."); }
      else setLog("자동 실행이 꺼져 있어 메신저가 켜지지 않았습니다. 바탕화면 아이콘으로 직접 실행해야 합니다.");
    }, 1400);
  };

  return (
    <div className="demo-stage">
      <Desk height={240}
        tasks={running && ws !== "hidden" ? (
          <button type="button" className={`dk-task${ws === "open" ? " on" : ""}`} aria-label="메신저 창"
            onClick={() => setWs(ws === "open" ? "min" : "open")}>💬</button>
        ) : null}
        tray={<>
          <span className="dk-tray-icon" aria-hidden="true">🔊</span>
          <span className="dk-tray-icon" aria-hidden="true">📶</span>
          {running && (
            <button type="button" className={`dk-tray-icon dk-tray-btn${menu ? " on" : ""}`} aria-label="메신저 트레이 아이콘 (누르면 메뉴, 두 번 누르면 열기)"
              aria-haspopup="menu" aria-expanded={menu}
              onClick={() => { setMenu((m) => !m); setBalloon(false); }} onDoubleClick={openWin}
              onContextMenu={(e) => { e.preventDefault(); setMenu(true); setBalloon(false); }}>💬</button>
          )}
        </>}>
        <div className="dk-wall" onPointerDown={() => setMenu(false)} />
        <button type="button" className="dk-deskicon" onClick={openWin} aria-label="메신저 실행">
          <span aria-hidden="true">💬</span>메신저
        </button>
        {running && ws === "open" && (
          <Win title="메신저" icon="💬" active style={{ left: "26%", top: "6%", width: "70%", height: "84%", zIndex: 10 }}
            controls={<>
              <TBtn aria-label="최소화" onClick={() => setWs("min")}>–</TBtn>
              <TBtn aria-label="닫기" className="dk-close" onClick={close}>✕</TBtn>
            </>}>
            <div className="dk-settings">
              <b>설정</b>
              <label><input type="checkbox" checked={toTray} onChange={(e) => setToTray(e.target.checked)} /> X 를 누르면 트레이로 숨기</label>
              <label><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> 컴퓨터를 켤 때 자동 실행</label>
            </div>
          </Win>
        )}
        {menu && running && (
          <div className="dk-menu" role="menu" aria-label="메신저 트레이 메뉴">
            <button type="button" role="menuitem" onClick={openWin}>창 열기</button>
            <button type="button" role="menuitemcheckbox" aria-checked={auto} onClick={() => { setAuto((a) => !a); setMenu(false); }}>
              <span className="dk-check" aria-hidden="true">{auto ? "✓" : ""}</span>시작 시 자동 실행
            </button>
            <button type="button" role="menuitem" onClick={() => quit()}>종료</button>
          </div>
        )}
        {balloon && <div className="dk-balloon" role="status">💬 메신저는 트레이에서 계속 실행됩니다.</div>}
        {booting && <div className="dk-boot">다시 시작하는 중…</div>}
      </Desk>
      <div className="row">
        <button type="button" className="btn small" onClick={reboot} disabled={booting}>⟳ 컴퓨터 다시 시작</button>
        <span className="chip">자동 실행 {auto ? "켜짐" : "꺼짐"}</span>
      </div>
      <p className="dk-status" aria-live="polite">{log}</p>
      <span className="muted">창의 ✕ 를 눌러 보세요. 앱이 꺼지지 않고 트레이 아이콘으로 숨습니다. 트레이 아이콘을 누르면 메뉴, 두 번 누르면 창이 열립니다. 자동 실행을 켜고 ‘다시 시작’을 누르면 켜자마자 트레이에 나타납니다.</span>
    </div>
  );
}

/* ───────── 전역 단축키 ───────── */

const GH_APPS = [
  { id: "memo", title: "메모장", icon: "🗒️", x: 3, y: 5, w: 56, h: 62 },
  { id: "web", title: "브라우저", icon: "🌐", x: 40, y: 12, w: 57, h: 64 },
  { id: "cap", title: "캡처 도구", icon: "✂️", x: 16, y: 44, w: 50, h: 54 },
];

export function GlobalHotkeyDemo() {
  const [mode, setMode] = useState<"local" | "global">("global");
  const [focus, setFocus] = useState("memo");
  const [order, setOrder] = useState(["cap", "web", "memo"]);
  const [flash, setFlash] = useState(false);
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState("메모장이 앞에 있고 캡처 도구는 뒤에 있습니다.");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const name = (id: string) => GH_APPS.find((a) => a.id === id)?.title ?? id;
  const pick = (id: string) => { setFocus(id); setOrder((o) => [...o.filter((x) => x !== id), id]); };
  const press = () => {
    if (mode === "global" || focus === "cap") {
      setFlash(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlash(false), 1300);
      setLog(mode === "global"
        ? `앞에 다른 앱(${name(focus)})이 있어도 운영체제가 키를 캡처 도구에 바로 넘겨 캡처가 시작됐습니다.`
        : "캡처 도구에 포커스가 있어서 단축키를 받았습니다.");
    } else {
      setLog(`앞에 있는 앱(${name(focus)})이 키를 받았지만 아무 일도 없습니다. 캡처 도구는 뒤에 있어서 앱 안 단축키를 듣지 못합니다.`);
    }
  };
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="단축키 종류">
          <button type="button" role="radio" aria-checked={mode === "local"} className={mode === "local" ? "on" : ""} onClick={() => setMode("local")}>앱 안 단축키</button>
          <button type="button" role="radio" aria-checked={mode === "global"} className={mode === "global" ? "on" : ""} onClick={() => setMode("global")}>전역 단축키</button>
        </div>
      </div>
      <Desk tabIndex={0} label="가짜 데스크톱 (누른 뒤 Ctrl+Shift+Space)" className={ready ? "dk-ready" : ""}
        onFocus={() => setReady(true)} onBlur={() => setReady(false)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "Space") { e.preventDefault(); if (!e.repeat) press(); }
        }}
        tasks={GH_APPS.filter((a) => a.id !== "cap").map((a) => (
          <button type="button" key={a.id} tabIndex={-1} className={`dk-task${focus === a.id ? " on" : ""}`} onClick={() => pick(a.id)} aria-label={a.title}>{a.icon}</button>
        ))}
        tray={<button type="button" tabIndex={-1} className={`dk-tray-icon dk-tray-btn${focus === "cap" ? " on" : ""}`} aria-label="캡처 도구 (트레이)" onClick={() => pick("cap")}>✂️</button>}>
        {GH_APPS.map((a) => (
          <Win key={a.id} title={a.title} icon={a.icon} active={focus === a.id}
            style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%`, zIndex: 10 + order.indexOf(a.id) }}
            onPointerDown={() => pick(a.id)}>
            {a.id === "cap" ? <p className="dk-small">단축키<br /><b className="mono">Ctrl+Shift+Space</b><br />{mode === "global" ? "전역으로 등록됨" : "이 창 안에서만"}</p> : <Lines n={3} />}
          </Win>
        ))}
        {flash && <div className="dk-capture" aria-hidden="true"><span>캡처할 영역을 끌어 고르세요</span></div>}
      </Desk>
      <div className="row">
        <button type="button" className="btn small" onClick={press}>Ctrl+Shift+Space 누르기</button>
        {mode === "global" && (
          <button type="button" className="btn small" onClick={() => setLog("등록 실패: Win+V 는 운영체제의 클립보드 기록이 이미 등록해 둔 조합이라 거절됐습니다. 전역 단축키는 먼저 차지한 쪽이 이깁니다.")}>Win+V 로 바꿔 보기</button>
        )}
        <span className="chip">{ready ? "키 입력 받는 중" : "데스크톱을 눌러 포커스"}</span>
      </div>
      <p className="dk-status" aria-live="polite">{log}</p>
      <span className="muted">메모장이나 브라우저를 앞에 둔 채 데스크톱을 누르고 Ctrl+Shift+Space 를 눌러 보세요 (버튼도 됩니다). ‘전역’이면 뒤에 있는 캡처 도구가 받고, ‘앱 안’이면 캡처 도구가 앞에 있을 때만 작동합니다.</span>
    </div>
  );
}

/* ───────── 단축키·키 코드 ───────── */

const SC_MENU = [
  { id: "save", label: "저장", keys: "Ctrl+S" },
  { id: "all", label: "모두 선택", keys: "Ctrl+A" },
  { id: "find", label: "찾기", keys: "Ctrl+F" },
  { id: "bold", label: "굵게", keys: "Ctrl+B" },
  { id: "prefs", label: "단축키 설정", keys: "Ctrl+K Ctrl+S" },
];
const MOD_KEYS = ["Control", "Shift", "Alt", "Meta", "AltGraph"];

type Rec = { combo: string; key: string; code: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean };

export function ShortcutRecorderDemo() {
  const [rec, setRec] = useState<Rec | null>(null);
  const [hit, setHit] = useState<string | null>(null);
  const [chord, setChord] = useState("");
  const pending = useRef<number>(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey) return;
    e.preventDefault();
    const modOnly = MOD_KEYS.includes(e.key);
    const mods = [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "⌘/Win"].filter(Boolean) as string[];
    const main = modOnly ? "…"
      : e.code.startsWith("Key") ? e.code.slice(3)
      : e.code.startsWith("Digit") ? e.code.slice(5)
      : e.key === " " ? "Space"
      : e.key.length === 1 ? e.key.toUpperCase()
      : e.key === "Process" || e.key === "Unidentified" ? e.code : e.key;
    setRec({ combo: [...mods, main].join("+"), key: e.key, code: e.code, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey });
    if (modOnly || e.repeat) return;
    const norm = [(e.ctrlKey || e.metaKey) && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", main].filter(Boolean).join("+");
    window.clearTimeout(timer.current);
    if (pending.current && Date.now() - pending.current < 2000) {
      pending.current = 0;
      const full = `Ctrl+K ${norm}`;
      const m = SC_MENU.find((x) => x.keys === full);
      setHit(m ? m.id : null);
      setChord(m ? `키 코드 완성: ${full} → ‘${m.label}’` : `Ctrl+K 다음에 ${norm}: 등록된 코드가 없습니다.`);
    } else if (norm === "Ctrl+K") {
      pending.current = Date.now();
      setHit(null);
      setChord("Ctrl+K … 두 번째 키를 기다리는 중 (2초)");
      timer.current = window.setTimeout(() => { pending.current = 0; setChord("시간이 지나 코드가 취소됐습니다."); }, 2000);
    } else {
      const m = SC_MENU.find((x) => x.keys === norm);
      setHit(m ? m.id : null);
      setChord(m ? `‘${m.label}’ 실행` : "");
    }
  };
  const hangul = rec && /[ㄱ-ㅣ가-힣]/.test(rec.key);
  return (
    <div className="demo-stage">
      <input className={`dk-recorder${rec ? " mono" : ""}`} readOnly value={rec?.combo ?? ""} placeholder="여기를 누르고 단축키를 눌러 보세요" aria-label="단축키 녹화 칸" onKeyDown={onKeyDown} />
      <div className="dk-keyinfo">
        <span className="muted">key</span><b className="mono">{rec ? JSON.stringify(rec.key) : "–"}</b>
        <span className="muted">code</span><b className="mono">{rec?.code || "–"}</b>
        <span className="muted">수식키</span>
        <span className="row dk-mods">
          {(["ctrl", "alt", "shift", "meta"] as const).map((m) => (
            <span key={m} className={`dk-kbd${rec?.[m] ? " on" : ""}`}>{m === "meta" ? "⌘/Win" : m[0].toUpperCase() + m.slice(1)}</span>
          ))}
        </span>
      </div>
      {hangul && <p className="dk-status">한글 자판이라 key 는 {JSON.stringify(rec!.key)} 이지만 code 는 그대로 <b className="mono">{rec!.code}</b> 입니다. 단축키는 code(키의 자리)로 맞추면 자판과 상관없이 작동합니다.</p>}
      <ul className="dk-menu-list" aria-label="편집 메뉴">
        {SC_MENU.map((m) => (
          <li key={m.id} className={hit === m.id ? "on" : ""}><span>{m.label}</span><span className="mono muted">{m.keys}</span></li>
        ))}
      </ul>
      <p className="dk-status" aria-live="polite">{chord || " "}</p>
      <span className="muted">입력칸을 누르고 Ctrl+S 나 Ctrl+Shift+K 를 눌러 보세요. key(찍히는 글자)와 code(키보드의 물리적 자리)가 따로 보입니다. Ctrl+K 를 누르고 2초 안에 Ctrl+S 를 누르면 두 단계 ‘키 코드’가 됩니다.</span>
    </div>
  );
}

/* ───────── 도킹 ───────── */

type Spot = "left" | "right" | "bottom" | "float";
const SPOT_LABEL: Record<Spot, string> = { left: "왼쪽", right: "오른쪽", bottom: "아래", float: "떠 있음" };
const FW = 116, FH = 96;

export function DockingDemo() {
  const [dock, setDock] = useState<Spot>("right");
  const [fl, setFl] = useState({ x: 40, y: 50 });
  const [drag, setDrag] = useState<{ x: number; y: number; spot: Spot } | null>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const st = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const pr = panelRef.current?.getBoundingClientRect(); if (!pr) return;
    st.current = { dx: Math.min(e.clientX - pr.left, FW - 16), dy: Math.min(e.clientY - pr.top, 14), sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current, a = appRef.current?.getBoundingClientRect();
    if (!s || !a) return;
    if (!s.moved && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < 4) return;
    s.moved = true;
    const rx = e.clientX - a.left, ry = e.clientY - a.top;
    const spot: Spot = rx < a.width * 0.16 ? "left" : rx > a.width * 0.84 ? "right" : ry > a.height * 0.8 ? "bottom" : "float";
    setDrag({
      x: Math.max(-FW + 30, Math.min(a.width - 30, rx - s.dx)),
      y: Math.max(0, Math.min(a.height - 24, ry - s.dy)),
      spot,
    });
  };
  const onUp = () => {
    if (drag) { if (drag.spot === "float") setFl({ x: drag.x, y: drag.y }); setDock(drag.spot); }
    setDrag(null); st.current = null;
  };
  const floating = drag !== null || dock === "float";
  const fpos = drag ?? fl;
  const layout = drag ? "float" : dock;
  return (
    <div className="demo-stage">
      <div className={`dk-app dk-lay-${layout}`} ref={appRef}>
        <div className="dk-appbar"><span>🎨 그림판</span><span className="muted">파일 편집 보기</span></div>
        <div className="dk-appbody">
          <div className="dk-canvas" style={{ backgroundImage: `url("${photo(5, 300, 200)}")` }} aria-hidden="true" />
          <div ref={panelRef} className={`dk-panel${floating ? " floating" : ""}${drag ? " dragging" : ""}`}
            style={floating ? { left: fpos.x, top: fpos.y, width: FW, height: FH } : undefined}>
            <div className="dk-panel-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <span aria-hidden="true">≡</span> 레이어
            </div>
            <ul className="dk-layers">
              <li>👁 글자</li><li>👁 사람</li><li>👁 배경</li>
            </ul>
          </div>
          {drag && (
            <>
              {drag.spot !== "float" && <div className={`dk-dock-preview ${drag.spot}`} />}
              <span className={`dk-dock-mark left${drag.spot === "left" ? " on" : ""}`} aria-hidden="true">◀</span>
              <span className={`dk-dock-mark right${drag.spot === "right" ? " on" : ""}`} aria-hidden="true">▶</span>
              <span className={`dk-dock-mark bottom${drag.spot === "bottom" ? " on" : ""}`} aria-hidden="true">▼</span>
            </>
          )}
        </div>
      </div>
      <div className="row">
        <span className="muted">패널 위치</span>
        <div className="segmented" role="radiogroup" aria-label="레이어 패널 위치">
          {(["left", "right", "bottom", "float"] as const).map((s) => (
            <button type="button" key={s} role="radio" aria-checked={dock === s} className={dock === s ? "on" : ""} onClick={() => setDock(s)}>{SPOT_LABEL[s]}</button>
          ))}
        </div>
      </div>
      <span className="muted">‘레이어’ 패널의 제목을 잡고 끌어 보세요. 떼어 내면 떠 있는 창이 되고, ◀ ▶ ▼ 표시 쪽 가장자리로 가져가면 붙을 자리가 칠해집니다. 거기서 놓으면 도킹됩니다.</span>
    </div>
  );
}

/* ───────── 창 스냅 ───────── */

type R = { x: number; y: number; w: number; h: number };
type Snap = "none" | "left" | "right" | "max";
const SNAP_RECT: Record<Exclude<Snap, "none">, R> = {
  left: { x: 0, y: 0, w: 0.5, h: 1 }, right: { x: 0.5, y: 0, w: 0.5, h: 1 }, max: { x: 0, y: 0, w: 1, h: 1 },
};
type SW = { id: string; title: string; icon: string; rect: R; restore: R; snap: Snap };

export function WindowSnapDemo() {
  const [wins, setWins] = useState<SW[]>([
    { id: "a", title: "사진", icon: "🖼️", rect: { x: 0.08, y: 0.1, w: 0.5, h: 0.6 }, restore: { x: 0.08, y: 0.1, w: 0.5, h: 0.6 }, snap: "none" },
    { id: "b", title: "메모", icon: "🗒️", rect: { x: 0.42, y: 0.3, w: 0.48, h: 0.58 }, restore: { x: 0.42, y: 0.3, w: 0.48, h: 0.58 }, snap: "none" },
  ]);
  const [order, setOrder] = useState(["a", "b"]);
  const [preview, setPreview] = useState<Snap>("none");
  const screen = useRef<HTMLDivElement>(null);
  const st = useRef<{ id: string; gx: number; gy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const front = (id: string) => setOrder((o) => [...o.filter((x) => x !== id), id]);
  const upd = (id: string, f: (w: SW) => SW) => setWins((ws) => ws.map((w) => (w.id === id ? f(w) : w)));
  const snapTo = (id: string, s: Snap) => upd(id, (w) => {
    if (s === "none") return { ...w, rect: w.restore, snap: "none" };
    return { ...w, rect: SNAP_RECT[s], restore: w.snap === "none" ? w.rect : w.restore, snap: s };
  });

  const onDown = (w: SW) => (e: React.PointerEvent<HTMLDivElement>) => {
    const sr = screen.current?.getBoundingClientRect(); if (!sr) return;
    front(w.id);
    st.current = { id: w.id, gx: (e.clientX - sr.left) / sr.width - w.rect.x, gy: (e.clientY - sr.top) / sr.height - w.rect.y, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current, sr = screen.current?.getBoundingClientRect();
    if (!s || !sr) return;
    if (!s.moved && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < 4) return;
    const rx = e.clientX - sr.left, ry = e.clientY - sr.top;
    const px = rx / sr.width, py = ry / sr.height;
    const w = wins.find((x) => x.id === s.id); if (!w) return;
    let size = { w: w.rect.w, h: w.rect.h };
    if (!s.moved) {
      s.moved = true;
      if (w.snap !== "none") { // 붙어 있던 창을 끌면 원래 크기로 돌아온다
        size = { w: w.restore.w, h: w.restore.h };
        s.gx = Math.min(s.gx, size.w / 2); s.gy = Math.min(s.gy, 0.06);
      }
    }
    const x = Math.max(-size.w + 0.15, Math.min(0.85, px - s.gx));
    const y = Math.max(0, Math.min(0.85, py - s.gy));
    upd(s.id, () => ({ ...w, snap: "none", rect: { x, y, ...size } }));
    setPreview(rx < 10 ? "left" : rx > sr.width - 10 ? "right" : ry < 8 ? "max" : "none");
  };
  const onUp = () => {
    const s = st.current; st.current = null;
    if (!s) return;
    if (s.moved) {
      if (preview !== "none") {
        const p = preview;
        upd(s.id, (w) => ({ ...w, restore: w.rect, rect: SNAP_RECT[p], snap: p }));
      } else {
        upd(s.id, (w) => ({ ...w, restore: w.rect }));
      }
    }
    setPreview("none");
  };
  const pr = preview !== "none" ? SNAP_RECT[preview] : null;
  const pct = (r: R): CSSProperties => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
  const top = order[order.length - 1];
  return (
    <div className="demo-stage">
      <Desk screenRef={screen} tasks={wins.map((w) => (
        <button type="button" key={w.id} className={`dk-task${top === w.id ? " on" : ""}`} onClick={() => front(w.id)} aria-label={w.title}>{w.icon}</button>
      ))}>
        {pr && <div className="dk-snap-preview" style={pct(pr)} />}
        {wins.map((w) => (
          <Win key={w.id} title={w.title} icon={w.icon} active={top === w.id}
            className={st.current?.id === w.id && st.current.moved ? "dk-moving" : ""}
            style={{ ...pct(w.rect), zIndex: 10 + order.indexOf(w.id) }}
            onPointerDown={() => front(w.id)}
            titleProps={{
              onPointerDown: onDown(w), onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp,
              onDoubleClick: () => snapTo(w.id, w.snap === "max" ? "none" : "max"), className: "dk-titlebar dk-grab",
            }}
            controls={<>
              <TBtn aria-label={`${w.title} 왼쪽 절반`} onClick={() => snapTo(w.id, "left")}><SnapIcon side="left" /></TBtn>
              <TBtn aria-label={`${w.title} 오른쪽 절반`} onClick={() => snapTo(w.id, "right")}><SnapIcon side="right" /></TBtn>
              <TBtn aria-label={w.snap === "none" ? `${w.title} 최대화` : `${w.title} 원래 크기`} onClick={() => snapTo(w.id, w.snap === "none" ? "max" : "none")}>{w.snap === "none" ? "▢" : "❐"}</TBtn>
            </>}>
            {w.id === "a" ? <div className="dk-photo" style={{ backgroundImage: `url("${photo(7, 200, 130)}")` }} /> : <Lines n={4} />}
          </Win>
        ))}
      </Desk>
      <p className="dk-status" aria-live="polite">
        {preview !== "none" ? `여기서 놓으면 ${preview === "max" ? "전체 화면" : preview === "left" ? "왼쪽 절반" : "오른쪽 절반"}으로 맞춰집니다.`
          : wins.map((w) => `${w.title}: ${w.snap === "none" ? "자유 위치" : w.snap === "max" ? "최대화" : w.snap === "left" ? "왼쪽 절반" : "오른쪽 절반"}`).join(" · ")}
      </p>
      <span className="muted">창의 제목줄을 잡고 화면 왼쪽·오른쪽 끝이나 맨 위로 끌어 보세요. 미리보기 영역이 뜨고, 놓으면 반 화면·전체 화면으로 딱 맞춰집니다. 붙은 창을 다시 끌면 원래 크기로 돌아옵니다.</span>
    </div>
  );
}

function SnapIcon({ side }: { side: "left" | "right" }) {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="11" height="9" rx="1.5" fill="none" stroke="currentColor" />
      <rect x={side === "left" ? 1.5 : 6} y="1.5" width="4.5" height="7" fill="currentColor" />
    </svg>
  );
}

/* ───────── 퀵 룩 ───────── */

type QFile = { name: string; icon: string; kind: "image" | "text" | "audio" | "pdf"; seed?: number; size: string };
const QFILES: QFile[] = [
  { name: "바다.jpg", icon: "🖼️", kind: "image", seed: 4, size: "2.1MB" },
  { name: "회의록.txt", icon: "📄", kind: "text", size: "3KB" },
  { name: "산책.jpg", icon: "🖼️", kind: "image", seed: 11, size: "1.8MB" },
  { name: "노래.mp3", icon: "🎵", kind: "audio", size: "4.6MB" },
  { name: "발표.pdf", icon: "📕", kind: "pdf", size: "820KB" },
];

export function QuickLookDemo() {
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const f = QFILES[sel];
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s + (e.key === "ArrowDown" ? 1 : -1) + QFILES.length) % QFILES.length);
    } else if (e.key === " ") {
      e.preventDefault(); setOpen((o) => !o); setMsg("");
    } else if (e.key === "Escape" && open) {
      e.preventDefault(); setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault(); setMsg(`‘${f.name}’ 을(를) 앱으로 열었습니다 (가짜). 퀵 룩은 앱을 열지 않고 들여다보기만 합니다.`);
    }
  };
  return (
    <div className="demo-stage">
      <Win title="내 파일" icon="📁" active className="dk-explorer"
        controls={<TBtn aria-label="훑어보기 (스페이스바)" className={open ? "on" : ""} onClick={() => { setOpen((o) => !o); listRef.current?.focus(); }}>👁</TBtn>}>
        <ul ref={listRef} className="dk-files" role="listbox" tabIndex={0} aria-label="파일 목록 (스페이스바로 미리보기)"
          aria-activedescendant={`dk-qf-${sel}`} onKeyDown={onKey}>
          {QFILES.map((q, i) => (
            <li key={q.name} id={`dk-qf-${i}`} role="option" aria-selected={sel === i} className={sel === i ? "on" : ""}
              onClick={() => { setSel(i); listRef.current?.focus(); }}
              onDoubleClick={() => setMsg(`더블클릭은 ‘열기’입니다. ‘${q.name}’ 을(를) 앱으로 열었습니다 (가짜).`)}>
              <span aria-hidden="true">{q.icon}</span><span className="dk-fname">{q.name}</span><span className="muted">{q.size}</span>
            </li>
          ))}
        </ul>
        {open && (
          <div className="dk-ql" role="dialog" aria-label={`${f.name} 미리보기`}>
            <div className="dk-ql-head">
              <b>{f.name}</b>
              <button type="button" className="dk-tbtn" aria-label="미리보기 닫기" onClick={() => { setOpen(false); listRef.current?.focus(); }}>✕</button>
            </div>
            <div className="dk-ql-body">
              {f.kind === "image" && <img src={photo(f.seed ?? 1, 300, 190)} alt="" />}
              {f.kind === "text" && <pre className="dk-ql-text">회의록{"\n"}- 출시일: 다음 주 화요일{"\n"}- 디자인 검토 완료{"\n"}- 남은 일: 문구 다듬기</pre>}
              {f.kind === "audio" && <div className="dk-ql-audio"><span aria-hidden="true">▶</span><span className="dk-wave" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ height: `${20 + ((i * 37) % 70)}%` }} />)}</span><span className="mono">0:00 / 3:12</span></div>}
              {f.kind === "pdf" && <div className="dk-ql-pdf"><b>3분기 발표</b><Lines n={5} /><span className="muted">1 / 12 쪽</span></div>}
            </div>
          </div>
        )}
      </Win>
      <p className="dk-status" aria-live="polite">{msg || (open ? `‘${f.name}’ 훑어보는 중 · ↑↓ 로 다른 파일` : " ")}</p>
      <span className="muted">파일을 하나 누른 뒤 스페이스바를 눌러 보세요. 앱을 열지 않고 내용이 바로 뜹니다. 다시 스페이스바나 Esc 로 닫히고, 열린 채로 ↑↓ 를 누르면 다음 파일로 넘어갑니다.</span>
    </div>
  );
}

/* ───────── DPI 스케일링 ───────── */

const SCALES = [100, 125, 150, 200];
const BW = 130, BH = 84;

/* 16×16 픽셀로 그린 폴더 아이콘 (비트맵) */
function drawFolder(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  ctx.fillStyle = "#b07a12"; ctx.fillRect(ox + 1, oy + 3, 6, 2);
  ctx.fillStyle = "#e9a91f"; ctx.fillRect(ox + 1, oy + 5, 14, 9);
  ctx.fillStyle = "#f6c95a"; ctx.fillRect(ox + 1, oy + 7, 14, 1);
}

/* 화면에 실제로 찍히는 픽셀을 3배로 확대해 보여 준다 */
function BitmapZoom({ src, s }: { src: HTMLCanvasElement; s: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const n = Math.round(16 * s);
  useEffect(() => {
    const c = ref.current; const ctx = c?.getContext("2d"); if (!c || !ctx) return;
    ctx.clearRect(0, 0, n, n); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "low";
    ctx.drawImage(src, 0, 0, 16, 16, 0, 0, n, n);
  }, [src, n]);
  return <canvas ref={ref} width={n} height={n} className="dk-zoom" style={{ width: n * 3, height: n * 3 }} aria-hidden="true" />;
}

function FolderSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1 3h6v2H1z" fill="#b07a12" /><path d="M1 5h14v9H1z" fill="#e9a91f" /><path d="M1 7h14v1H1z" fill="#f6c95a" />
    </svg>
  );
}

export function DpiScalingDemo() {
  const [scale, setScale] = useState(150);
  const [aware, setAware] = useState(true);
  const s = scale / 100;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bmpCanvas = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 16; c.height = 16;
    const ctx = c.getContext("2d"); if (ctx) drawFolder(ctx, 0, 0);
    return c;
  }, []);
  const bitmap = useMemo(() => bmpCanvas.toDataURL(), [bmpCanvas]);
  // 배율을 모르는 앱: 100% 크기 그림으로 한 번 그린 뒤 운영체제가 통째로 늘린다
  useEffect(() => {
    const c = canvasRef.current; const ctx = c?.getContext("2d"); if (!c || !ctx) return;
    const css = getComputedStyle(c);
    const v = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
    const font = v("--font-body", "sans-serif");
    ctx.clearRect(0, 0, BW, BH);
    ctx.fillStyle = v("--surface", "#fff"); ctx.fillRect(0, 0, BW, BH);
    ctx.fillStyle = v("--surface-2", "#eee"); ctx.fillRect(0, 0, BW, 18);
    ctx.strokeStyle = v("--line", "#ccc"); ctx.strokeRect(0.5, 0.5, BW - 1, BH - 1);
    drawFolder(ctx, 4, 1);
    ctx.fillStyle = v("--fg", "#111"); ctx.font = `600 11px ${font}`; ctx.textBaseline = "middle";
    ctx.fillText("설정", 24, 10);
    ctx.font = `11px ${font}`;
    ctx.fillText("글자 크기: 보통", 8, 34);
    ctx.fillText("화면 배율: 자동", 8, 50);
    ctx.fillStyle = v("--accent", "#0f6e68"); ctx.fillRect(8, 62, 44, 16);
    ctx.fillStyle = v("--accent-fg", "#fff"); ctx.fillText("확인", 18, 70);
  }, [aware]);
  const vars = { "--dk-s": s } as CSSProperties;
  return (
    <div className="demo-stage">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="배율">
          {SCALES.map((v) => <button type="button" key={v} role="radio" aria-checked={scale === v} className={scale === v ? "on" : ""} onClick={() => setScale(v)}>{v}%</button>)}
        </div>
        <div className="segmented" role="radiogroup" aria-label="앱 종류">
          <button type="button" role="radio" aria-checked={aware} className={aware ? "on" : ""} onClick={() => setAware(true)}>배율 아는 앱</button>
          <button type="button" role="radio" aria-checked={!aware} className={!aware ? "on" : ""} onClick={() => setAware(false)}>모르는 앱</button>
        </div>
      </div>
      <div className="dk-monitor" aria-label={`모니터 배율 ${scale}%`}>
        {aware ? (
          <div className="dk-dpiwin" style={vars}>
            <div className="dk-dpi-title"><FolderSvg size={16 * s} /> 설정</div>
            <div className="dk-dpi-body">
              <span>글자 크기: 보통</span>
              <span>화면 배율: 자동</span>
              <span className="dk-dpi-btn">확인</span>
            </div>
          </div>
        ) : (
          <canvas ref={canvasRef} width={BW} height={BH} className="dk-dpicanvas" style={{ width: BW * s, height: BH * s }} aria-label="늘려서 흐려진 창" />
        )}
      </div>
      <div className="dk-icons">
        <figure>
          <span className="dk-icon-pair"><img src={bitmap} width={16 * s} height={16 * s} alt="" className="dk-bmp" /><BitmapZoom src={bmpCanvas} s={s} /></span>
          <figcaption>비트맵 아이콘<br /><span className="muted">16px 그림을 늘림 → 흐림</span></figcaption>
        </figure>
        <figure>
          <span className="dk-icon-pair"><FolderSvg size={16 * s} /><span className="dk-zoom"><FolderSvg size={48 * s} /></span></span>
          <figcaption>벡터 아이콘 (SVG)<br /><span className="muted">배율대로 다시 그림 → 선명</span></figcaption>
        </figure>
      </div>
      <p className="dk-status">창 크기 {BW}×{BH} → <b>{Math.round(BW * s)}×{Math.round(BH * s)}</b> 칸 ({scale}%)</p>
      <span className="muted">배율을 바꿔 보세요. 같은 창이 커집니다. 아이콘 옆 큰 그림은 화면에 찍히는 픽셀을 3배로 확대한 것입니다. ‘배율 아는 앱’은 글자를 새로 그려 선명하고, ‘모르는 앱’은 100% 그림을 운영체제가 늘려서 글자와 아이콘이 흐려집니다.</span>
    </div>
  );
}
