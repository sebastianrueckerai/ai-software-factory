const fs = require("node:fs");
const path = require("node:path");
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

const [cookieName, cookieValue] = fs.readFileSync(path.join(LAB_DIR, "cookie.txt"), "utf8").trim().split(/=(.*)/s);
const cookie = `${cookieName}=${cookieValue}`;

const ring = () => {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;left:0;top:0;width:14px;height:14px;margin:-7px 0 0 -7px;border:2px solid #ff3b30;"
    + "border-radius:50%;box-sizing:border-box;pointer-events:none;z-index:2147483647;transition:transform 80ms;";
  let x = 0;
  let y = 0;
  let scale = 1;
  const draw = () => { el.style.transform = `translate(${x}px,${y}px) scale(${scale})`; };
  addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; draw(); }, true);
  addEventListener("mousedown", () => { scale = 0.6; draw(); }, true);
  addEventListener("mouseup", () => { scale = 1; draw(); }, true);
  draw();
  document.addEventListener("DOMContentLoaded", () => document.documentElement.appendChild(el));
};

async function seed(step, now) {
  const body = step.state(now);
  if (body === null) return;
  const res = await fetch(BASE + "/lab/scene", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (res.status !== 204) throw new Error(`seed answered ${res.status}: ${(await res.text()).trim()}`);
  await sleep(REDRAW_MS);
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
  else throw new Error(`unknown action ${kind}`);
}

async function record(browser, name, commits) {
  const scene = require(`./scenes/${name}.js`);
  const { viewport, scale } = VIEWPORTS[scene.viewport];
  const tmp = fs.mkdtempSync(path.join(OUT, `.${name}-`));
  const context = await browser.newContext({
    viewport, deviceScaleFactor: scale, recordVideo: { dir: tmp, size: viewport }, colorScheme: scene.theme,
  });
  await context.addCookies([{
    name: cookieName, value: cookieValue, domain: new URL(BASE).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax",
  }]);
  await context.addInitScript((theme) => localStorage.setItem("theme", theme), scene.theme);
  await context.addInitScript(ring);
  const page = await context.newPage();
  const t0 = Date.now();
  let problem = null;
  page.on("pageerror", (e) => { problem ??= `page error: ${e.message}`; });
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE)) problem ??= `${r.request().method()} ${r.url()} answered ${r.status()}`;
  });
  const check = () => { if (problem) throw new Error(problem); };
  const marks = [];
  const pngs = [];
  const mouse = { x: 0, y: 0 };
  let n = 0;
  let failure = null;
  try {
    for (const [i, step] of scene.steps.entries()) {
      n = i + 1;
      marks.push({ index: n, atMs: Date.now() - t0 });
      await seed(step, new Date());
      check();
      for (const action of step.actions) {
        await run(page, action, mouse);
        check();
      }
      await sleep(step.hold);
      check();
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
  if (failure) {
    for (const f of pngs) fs.rmSync(f, { force: true });
    fs.rmSync(tmp, { recursive: true, force: true });
    throw new Error(`scene ${name} step ${n}: ${failure}`);
  }
  fs.renameSync(webm, path.join(OUT, `${name}.webm`));
  fs.rmSync(tmp, { recursive: true, force: true });
  const { title, story, group, theme, viewport: vp } = scene;
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({
    name, title, story, group, theme, viewport: vp, ...commits, recordedAt: new Date(t0).toISOString(), durationMs, steps: marks,
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
