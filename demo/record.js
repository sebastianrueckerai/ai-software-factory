const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const BASE = process.env.BASE;
const LAB_DIR = process.env.CONSOLE_LAB_DIR;
const OUT = path.join(__dirname, "out");
const VIEWPORTS = {
  desk: { viewport: { width: 1600, height: 900 }, scale: 1 },
  phone: { viewport: { width: 390, height: 844 }, scale: 2 },
};
const REDRAW_MS = 1200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// lab is the console lab's login cookie, read once a scene of the console needs it: a diagram scene runs without the lab
let labCookie;
function lab() {
  if (!labCookie) {
    const [name, value] = fs.readFileSync(path.join(LAB_DIR, "cookie.txt"), "utf8").trim().split(/=(.*)/s);
    labCookie = { name, value };
  }
  return labCookie;
}

// cursor draws a pointer at the mouse, an arrow with a dark outline, and a soft ripple at each press; it stays hidden
// until the mouse first moves, so a scene's stills before its first click carry no pointer
const cursor = () => {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;left:0;top:0;width:26px;height:30px;pointer-events:none;z-index:2147483647;visibility:hidden;"
    + "filter:drop-shadow(0 2px 3px rgba(0,0,0,.55));";
  el.innerHTML = '<svg width="26" height="30" viewBox="0 0 26 30"><path d="M2 2 L2 23 L7.5 17.8 L11.6 27 L15.4 25.3 L11.4 16.4 L19 16.4 Z" '
    + 'fill="#f4f7fb" stroke="#0b111a" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const ripple = document.createElement("div");
  ripple.style.cssText = "position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;pointer-events:none;"
    + "z-index:2147483646;border:2px solid rgba(79,203,226,.9);background:rgba(79,203,226,.18);opacity:0;transform:scale(.3);";
  let x = 0;
  let y = 0;
  addEventListener("mousemove", (e) => {
    x = e.clientX; y = e.clientY;
    if (x || y) el.style.visibility = "visible";
    el.style.transform = `translate(${x - 2}px,${y - 2}px)`;
  }, true);
  addEventListener("mousedown", () => {
    ripple.style.left = x + "px"; ripple.style.top = y + "px";
    ripple.animate([{ opacity: 1, transform: "scale(.3)" }, { opacity: 0, transform: "scale(1.6)" }], { duration: 520, easing: "ease-out" });
  }, true);
  document.addEventListener("DOMContentLoaded", () => { document.documentElement.appendChild(ripple); document.documentElement.appendChild(el); });
};

async function seed(page, step, now) {
  const body = step.state(now);
  if (body === null) return;
  const res = await fetch(BASE + "/lab/scene", {
    method: "POST", headers: { cookie: `${lab().name}=${lab().value}`, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (res.status !== 204) throw new Error(`seed answered ${res.status}: ${(await res.text()).trim()}`);
  if (page.url() !== "about:blank") await sleep(REDRAW_MS);
}

async function run(page, action, mouse) {
  const [kind, arg] = Object.entries(action)[0];
  const target = (selector) => page.locator(selector).first();
  const moveTo = async (selector) => {
    const loc = target(selector);
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.boundingBox();
    if (!box) throw new Error(`${selector} has no box`);
    const from = { ...mouse };
    const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12);
      await sleep(25);
    }
    Object.assign(mouse, to);
    return loc;
  };
  if (kind === "goto") await page.goto(BASE + arg, { waitUntil: "load" });
  else if (kind === "click") await (await moveTo(arg)).click();
  else if (kind === "hover") await moveTo(arg);
  else if (kind === "type") await target(arg[0]).pressSequentially(arg[1], { delay: 45 });
  else if (kind === "press") await page.keyboard.press(arg);
  else if (kind === "wait") await sleep(arg);
  else if (kind === "waitFor") await target(arg).waitFor();
  else if (kind === "scroll") await target(arg).evaluate((el) => el.scrollIntoView({ block: "start" }));
  else if (kind === "seed") await seed(page, { state: arg }, new Date());
  else throw new Error(`unknown action ${kind}`);
}

async function record(browser, name, commits) {
  const own = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\.(webm|mp4|json)|-\\d+\\.png)$`);
  for (const f of fs.readdirSync(OUT)) {
    if (own.test(f)) fs.rmSync(path.join(OUT, f));
  }
  const scene = require(`./scenes/${name}.js`);
  const { viewport, scale } = VIEWPORTS[scene.viewport];
  const tmp = fs.mkdtempSync(path.join(OUT, `.${name}-`));
  const context = await browser.newContext({
    viewport, deviceScaleFactor: scale, recordVideo: { dir: tmp, size: viewport }, colorScheme: scene.theme,
  });
  const t0 = Date.now(); // the video clock starts with the context
  if (!scene.page) {
    await context.addCookies([{
      name: lab().name, value: lab().value, domain: new URL(BASE).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax",
    }]);
    await context.addInitScript((theme) => localStorage.setItem("theme", theme), scene.theme);
    if (scene.cursor !== false) await context.addInitScript(cursor);
  }
  const page = await context.newPage();
  let problem = null;
  page.on("pageerror", (e) => { problem ??= `page error: ${e.message}`; });
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE)) problem ??= `${r.request().method()} ${r.url()} answered ${r.status()}`;
  });
  // a failed chat turn (a lab gateway with no reply left) comes as a 200 stream carrying an error row
  const check = async () => {
    const row = page.locator("#chat-log .chat-error").first();
    if (!problem && await row.count()) problem = `unscripted chat turn: ${(await row.innerText()).trim()}`;
    if (problem) throw new Error(problem);
  };
  const marks = [];
  const pngs = [];
  const mouse = { x: 0, y: 0 };
  let n = 0;
  let failure = null;
  try {
    if (scene.page) await page.goto(pathToFileURL(path.join(__dirname, scene.page)).href, { waitUntil: "load" });
    for (const [i, step] of scene.steps.entries()) {
      n = i + 1;
      marks.push({ index: n, atMs: Date.now() - t0 });
      if (!scene.page) await seed(page, step, new Date());
      await check();
      // acts are the moments each action ended, on the video's clock, so the cut can time an overlay to a click
      marks[marks.length - 1].acts = [];
      for (const action of step.actions) {
        await run(page, action, mouse);
        await check();
        marks[marks.length - 1].acts.push(Date.now() - t0);
      }
      await sleep(step.hold);
      await check();
      // boxes are the page boxes of the elements the scene names, at the moment of the step's still, so the cut's
      // overlays and zooms follow the console's layout and regenerate with the bank
      const named = { ...scene.boxes, ...step.boxes };
      if (Object.keys(named).length) {
        marks[i].boxes = {};
        for (const [key, selector] of Object.entries(named)) {
          const box = await page.locator(selector).first().boundingBox();
          if (!box) throw new Error(`box ${key}: ${selector} has no box`);
          marks[i].boxes[key] = Object.fromEntries(Object.entries(box).map(([k, v]) => [k, Math.round(v)]));
        }
      }
      marks[i].stillMs = Date.now() - t0;
      const png = path.join(OUT, `${name}-${n}.png`);
      pngs.push(png);
      await page.screenshot({ path: png });
    }
  } catch (e) {
    failure = e.message;
  }
  const durationMs = Date.now() - t0;
  await context.close();
  const webm = await page.video().path();
  let videoMs;
  if (!failure) {
    try {
      videoMs = Math.round(1000 * Number(execFileSync("ffprobe", [
        "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", webm,
      ], { encoding: "utf8" })));
    } catch (e) {
      failure = `ffprobe: ${e.message}`;
    }
  }
  if (failure) {
    for (const f of pngs) fs.rmSync(f, { force: true });
    fs.rmSync(tmp, { recursive: true, force: true });
    throw new Error(`scene ${name} step ${n}: ${failure}`);
  }
  fs.renameSync(webm, path.join(OUT, `${name}.webm`));
  fs.rmSync(tmp, { recursive: true, force: true });
  const { title, story, group, theme, viewport: vp } = scene;
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({
    name, title, story, group, theme, viewport: vp, ...commits, recordedAt: new Date(t0).toISOString(), durationMs, videoMs, steps: marks,
  }, null, 2) + "\n");
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const commits = { consoleCommit: process.env.CONSOLE_COMMIT, designCommit: process.env.DESIGN_COMMIT };
  const browser = await chromium.launch();
  let failed = false;
  for (const name of process.argv.slice(2)) {
    try {
      await record(browser, name, commits);
      console.log(`scene ${name}: recorded`);
    } catch (e) {
      failed = true;
      console.error(e.message);
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
