// 썸네일 녹화용 화면: ?id=<용어 id> 의 예시 하나만 고정 폭 상자에 그린다. 빌드에는 들어가지 않는다.
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { demos } from "../../src/demos";
import { terms } from "../../src/data/terms";

const id = new URLSearchParams(location.search).get("id") ?? "";
const term = terms.find((t) => t.id === id);
const Demo = term?.demo ? demos[term.demo] : undefined;

const style = document.createElement("style");
style.textContent = `
  body { background: var(--surface-2); }
  /* transform 은 안쪽 position: fixed (토스트 등)를 이 상자 기준으로 붙잡아 둔다 */
  #shot { width: 480px; min-height: 320px; padding: 40px 24px; background: var(--surface-2); position: relative; transform: translateZ(0); }
  /* 안내 문구는 썸네일에서 뺀다 */
  #shot .demo-stage > span.muted:last-child, #shot .demo-stage > p.muted:last-child { display: none; }
`;
document.head.appendChild(style);

// 줄(.row) 안에 들어 있는 긴 안내 문구도 숨긴다 (짧은 값 표시는 남긴다)
setTimeout(() => {
  for (const el of document.querySelectorAll<HTMLElement>("#shot .demo-stage > .row > span.muted:last-child")) {
    if ((el.textContent ?? "").trim().length > 24) el.style.display = "none";
  }
}, 100);

createRoot(document.getElementById("root")!).render(
  <div id="shot">{Demo ? <Demo /> : <p>예시 없음: {id}</p>}</div>,
);
