// 예시 썸네일 녹화기.
// steps/*.json 에 적힌 "자동으로 해 보는 순서"대로 예시를 조작하며 화면을 녹화해
// public/thumbs/<id>.<light|dark>.anim.webp (움직이는 것) 와 <id>.<light|dark>.webp (정지) 를 만든다.
//
//   node scripts/thumbs/record.mjs                       모든 예시
//   node scripts/thumbs/record.mjs --only lightbox,tabs  일부만
//   node scripts/thumbs/record.mjs --only tabs --preview <폴더>
//        → 결과를 그 폴더에만 쓰고(목록 파일은 그대로), 확인용 프레임 띠(<id>.<theme>.sheet.png)도 만든다
//
// 필요한 것: playwright(전역 설치 가능), ffmpeg, ImageMagick(convert, --preview 일 때)
import { createServer } from "vite";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of ["playwright", "/opt/node22/lib/node_modules/playwright"]) {
    try { return require(p); } catch { /* 다음 후보 */ }
  }
  throw new Error("playwright 를 찾지 못했습니다");
}
const { chromium } = loadPlaywright();

// ── 인자 ──
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const only = opt("--only")?.split(",").map((s) => s.trim()).filter(Boolean);
const preview = opt("--preview");
const themes = (opt("--theme") ?? "light,dark").split(",");
const outDir = preview ? path.resolve(preview) : path.join(repo, "public/thumbs");
fs.mkdirSync(outDir, { recursive: true });

const W = 400, H = 250, FPS = 10, HOLD_END = 12;
const BG = { light: "#e9ebe6", dark: "#2a302e" };

// ── 순서 파일 읽기 ──
const steps = {};
for (const f of fs.readdirSync(path.join(here, "steps")).filter((f) => f.endsWith(".json"))) {
  Object.assign(steps, JSON.parse(fs.readFileSync(path.join(here, "steps", f), "utf8")));
}

// ── 예시가 있는 용어 목록 (terms.ts 에서 id 와 demo 키만 뽑는다) ──
const src = fs.readFileSync(path.join(repo, "src/data/terms.ts"), "utf8");
const all = [...src.matchAll(/\n {4}id: "([^"]+)"[\s\S]*?\n {2}\},/g)]
  .filter((m) => /\n {4}demo: "/.test(m[0])).map((m) => m[1]);
const ids = only ?? all;
const unknown = ids.filter((i) => !all.includes(i));
if (unknown.length) { console.error("예시가 없는 id:", unknown.join(", ")); process.exit(1); }

// ── 조작 ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function point(root, sel, at = [0.5, 0.5]) {
  const loc = sel ? root.locator(sel).first() : root;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const b = await loc.boundingBox();
  if (!b) throw new Error(`보이지 않는 요소: ${sel}`);
  return [b.x + b.width * at[0], b.y + b.height * at[1]];
}
function makeMouse(page) {
  let cur = [4, 4];
  return {
    async to([x, y], ms = 300) {
      const n = Math.max(1, Math.round(ms / 25));
      const [x0, y0] = cur;
      for (let i = 1; i <= n; i++) {
        const k = i / n, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // ease-in-out
        await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
        await sleep(25);
      }
      cur = [x, y];
    },
    get pos() { return cur; },
  };
}
async function run(page, root, mouse, s, marks) {
  const at = s.at ?? [0.5, 0.5];
  const mods = [s.ctrl && "Control", s.shift && "Shift", s.alt && "Alt"].filter(Boolean);
  for (const m of mods) await page.keyboard.down(m);
  switch (s.do) {
    case "wait": await sleep(s.ms ?? 300); break;
    case "poster": marks.poster = Date.now(); break;
    case "hover": case "move": await mouse.to(await point(root, s.sel, at), s.ms ?? 400); break;
    case "click": case "dblclick": {
      await mouse.to(await point(root, s.sel, at), s.ms ?? 350);
      if (s.do === "click") await page.mouse.click(...mouse.pos);
      else await page.mouse.dblclick(...mouse.pos);
      break;
    }
    case "down": await mouse.to(await point(root, s.sel, at), s.ms ?? 300); await page.mouse.down(); break;
    case "up": await page.mouse.up(); break;
    case "drag": {
      const from = await point(root, s.sel, s.from ?? at);
      let to;
      if (s.to) to = await point(root, s.toSel ?? s.sel, s.to);
      else to = [from[0] + (s.dx ?? 0), from[1] + (s.dy ?? 0)];
      await mouse.to(from, 300);
      await page.mouse.down();
      await sleep(s.hold ?? 80);
      await mouse.to(to, s.ms ?? 700);
      await sleep(80);
      await page.mouse.up();
      break;
    }
    case "focus": await root.locator(s.sel).first().focus(); break;
    case "press": for (let i = 0; i < (s.times ?? 1); i++) { await page.keyboard.press(s.key); await sleep(s.ms ?? 250); } break;
    case "type": {
      if (s.sel) await root.locator(s.sel).first().click();
      await page.keyboard.type(s.text, { delay: s.delay ?? 90 });
      break;
    }
    case "scroll": {
      const loc = root.locator(s.sel).first();
      const n = Math.max(1, Math.round((s.ms ?? 600) / 25));
      for (let i = 0; i < n; i++) { await loc.evaluate((el, d) => el.scrollBy(0, d), (s.dy ?? 200) / n); await sleep(25); }
      break;
    }
    case "scrollX": {
      const loc = root.locator(s.sel).first();
      const n = Math.max(1, Math.round((s.ms ?? 600) / 25));
      for (let i = 0; i < n; i++) { await loc.evaluate((el, d) => el.scrollBy(d, 0), (s.dx ?? 200) / n); await sleep(25); }
      break;
    }
    case "wheel": {
      await mouse.to(await point(root, s.sel, at), 300);
      const n = s.times ?? 6;
      for (let i = 0; i < n; i++) { await page.mouse.wheel(0, (s.dy ?? -100) / n); await sleep(60); }
      break;
    }
    case "eval": await page.evaluate(s.js); break;
    default: throw new Error(`모르는 동작: ${s.do}`);
  }
  for (const m of mods.reverse()) await page.keyboard.up(m);
}

// #shot 안에서 실제로 보이는 것들을 감싸는 상자 (작은 예시가 구석에 작게 찍히지 않도록)
async function contentBox(page) {
  return page.evaluate(() => {
    const shot = document.getElementById("shot");
    const sb = shot.getBoundingClientRect();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (r) => {
      if (r.width < 1 || r.height < 1) return;
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    };
    const shown = (el) => { for (let e = el; e && e !== shot; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === "none" || c.visibility === "hidden" || Number(c.opacity) === 0) return false; } return true; };
    const solid = ["IMG", "SVG", "CANVAS", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "VIDEO", "HR"];
    for (const el of shot.querySelectorAll("*")) {
      if (!shown(el)) continue;
      const cs = getComputedStyle(el);
      // 색·테두리·그림자가 있거나 그 자체로 보이는 요소만. 투명한 감싸개 div 는 건너뛴다
      const painted = !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || cs.backgroundImage !== "none"
        || parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderBottomWidth) > 0 || cs.boxShadow !== "none";
      if (painted || solid.includes(el.tagName.toUpperCase())) add(el.getBoundingClientRect());
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); add(rg.getBoundingClientRect()); }
      }
    }
    if (x0 === Infinity) return { x: sb.left, y: sb.top, width: sb.width, height: sb.height };
    x0 = Math.max(sb.left, x0 - 12); y0 = Math.max(sb.top, y0 - 12); x1 = Math.min(sb.right, x1 + 12); y1 = Math.min(sb.bottom, y1 + 12);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });
}
const unite = (a, b) => { if (!a) return b; const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y }; };
// 너무 작게 잘라 크게 늘어나지 않도록 최소 크기(16:10)를 둔다
function atLeast(b) {
  const minW = 300, minH = 188;
  let { x, y, width, height } = b;
  if (width < minW) { x -= (minW - width) / 2; width = minW; }
  if (height < minH) { y -= (minH - height) / 2; height = minH; }
  // 화면 밖으로 나가도 된다 (자르기 전에 같은 배경색으로 둘레를 넉넉히 덧대므로)
  return { x, y, width, height };
}

// ── 녹화 하나 ──
async function record(browser, base, id, theme) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}scripts/thumbs/harness.html?id=${id}`);
  await page.waitForSelector("#shot");
  await page.evaluate(() => document.fonts.ready);
  await sleep(600);
  const root = page.locator("#shot");
  const list = steps[id];

  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", async (f) => {
    frames.push({ t: Date.now(), data: f.data });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  const marks = {};
  let failed = null;
  let box = await contentBox(page);
  // 맨 앞의 eval 은 준비 단계로 보고 녹화 전에 돌린다 (꾸밈이 덜 된 첫 화면이 찍히지 않도록)
  let lead = 0;
  while (list && lead < list.length && list[lead].do === "eval") await page.evaluate(list[lead++].js);
  if (lead) { await sleep(150); box = await contentBox(page); }
  if (list?.length) {
    await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
    await sleep(300);
    const t0 = Date.now();
    const mouse = makeMouse(page);
    try {
      for (const s of list.slice(lead)) { await run(page, root, mouse, s, marks); box = unite(box, await contentBox(page)); }
    } catch (e) { failed = e.message; }
    await sleep(700);
    const t1 = Date.now();
    await cdp.send("Page.stopScreencast");
    marks.t0 = t0; marks.t1 = t1;
  } else {
    const buf = await page.screenshot();
    frames.push({ t: 0, data: buf.toString("base64") });
  }
  await ctx.close();
  if (!frames.length) throw new Error("프레임 없음");

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `thumb-${id}-`));
  // 화면 녹화 프레임은 기기 배율이 그대로가 아닐 수 있어 PNG 머리에서 실제 폭을 읽어 배율을 구한다
  box = atLeast(box);
  const k = Buffer.from(frames[0].data, "base64").readUInt32BE(16) / 480;
  const P = 400; // 덧대는 둘레(기기 픽셀)
  const crop = `pad=iw+${2 * P}:ih+${2 * P}:${P}:${P}:color=${BG[theme]},crop=${Math.round(box.width * k)}:${Math.round(box.height * k)}:${Math.round(box.x * k + P)}:${Math.round(box.y * k + P)},`;
  const vf = `${crop}scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${BG[theme]}`;
  const ff = (a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a]);

  // 정지 썸네일: poster 표시가 있으면 그때, 없으면 마지막 화면
  const pickAt = (t) => { let f = frames[0]; for (const x of frames) if (x.t <= t) f = x; return f; };
  const posterFrame = list?.length ? pickAt(marks.poster ?? marks.t1) : frames[0];
  fs.writeFileSync(path.join(tmp, "poster.png"), Buffer.from(posterFrame.data, "base64"));
  ff(["-i", path.join(tmp, "poster.png"), "-vf", vf, "-c:v", "libwebp", "-quality", "80", "-frames:v", "1", path.join(outDir, `${id}.${theme}.webp`)]);

  let anim = false;
  if (list?.length) {
    // 일정한 간격(10fps)으로 다시 뽑고, 끝에서 잠깐 멈췄다가 처음부터
    const seq = [];
    for (let t = marks.t0; t <= marks.t1; t += 1000 / FPS) seq.push(pickAt(t));
    for (let i = 0; i < HOLD_END; i++) seq.push(seq[seq.length - 1]);
    seq.forEach((f, i) => fs.writeFileSync(path.join(tmp, `${String(i).padStart(4, "0")}.png`), Buffer.from(f.data, "base64")));
    ff(["-framerate", String(FPS), "-i", path.join(tmp, "%04d.png"), "-vf", vf, "-c:v", "libwebp_anim", "-quality", "60", "-compression_level", "6", "-loop", "0", path.join(outDir, `${id}.${theme}.anim.webp`)]);
    anim = true;
    if (preview) {
      const pick = [0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => path.join(tmp, `${String(Math.min(seq.length - HOLD_END - 1, Math.round(k * (seq.length - HOLD_END - 1)))).padStart(4, "0")}.png`));
      const small = pick.map((p, i) => { const o = path.join(tmp, `s${i}.png`); ff(["-i", p, "-vf", vf, o]); return o; });
      execFileSync("convert", [...small, "+append", path.join(outDir, `${id}.${theme}.sheet.png`)]);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return { anim, failed, errors };
}

// ── 실행 ──
const server = await createServer({ root: repo, logLevel: "error", server: { port: 5390, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
const exe = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch({ executablePath: exe });

const result = {};
const jobs = ids.flatMap((id) => themes.map((theme) => ({ id, theme })));
let next = 0, problems = 0;
async function worker() {
  while (next < jobs.length) {
    const { id, theme } = jobs[next++];
    try {
      const r = await record(browser, base, id, theme);
      result[id] = r.anim ? "anim" : "static";
      if (r.failed || r.errors.length) { problems++; console.log(`! ${id} ${theme}: ${r.failed ?? ""} ${r.errors.join(" | ")}`); }
    } catch (e) { problems++; console.log(`✗ ${id} ${theme}: ${e.message}`); }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
await browser.close();
await server.close();

if (!preview) {
  // 목록 파일 갱신 (이번에 안 만든 항목은 그대로 둔다)
  const listFile = path.join(repo, "src/data/thumbs.ts");
  let prev = {};
  if (fs.existsSync(listFile)) { const m = fs.readFileSync(listFile, "utf8").match(/= (\{[\s\S]*\});/); if (m) prev = JSON.parse(m[1]); }
  const merged = Object.fromEntries(Object.entries({ ...prev, ...result }).filter(([id]) => all.includes(id)).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(listFile, `// scripts/thumbs/record.mjs 가 만든다. 손으로 고치지 않는다.\n// anim: 움직이는 썸네일과 정지 썸네일이 모두 있음, static: 정지 썸네일만 있음\nexport const thumbs: Record<string, "anim" | "static"> = ${JSON.stringify(merged, null, 2)};\n`);
}
const anims = Object.values(result).filter((v) => v === "anim").length;
console.log(`완료: ${Object.keys(result).length}개 (움직임 ${anims}), 문제 ${problems}건 → ${path.relative(repo, outDir) || outDir}`);
