// shoot.js shoots round 17's two parts in the console lab's tokens
// scenario (the code repository's scripts/console-lab, lab_test.go's
// tokensScene), in both themes, into $OUT (one directory per candidate):
// the thread at 1440 and 390, the Notifications page at 1440 and 390, the
// made state (the real answer to the real form) at 1440 and 390, and crops
// of the token rows, the Tokens section and the shown-once block at 1x and
// 3x. Run it against a running lab: BASE, CONSOLE_LAB_DIR and NODE_PATH as
// run.sh sets them.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const base = process.env.BASE || "http://127.0.0.1:8090";
const labDir = process.env.CONSOLE_LAB_DIR || "/tmp/claude-1000/console-lab";
const out = process.env.OUT;
if (!out) throw new Error("set OUT");
const [name, value] = fs.readFileSync(path.join(labDir, "cookie.txt"), "utf8").trim().split(/=(.*)/s);
const desk = { width: 1440, height: 900 }, phone = { width: 390, height: 844 };

async function seed() {
  const resp = await fetch(base + "/lab/scenario/tokens");
  if (resp.status !== 204) throw new Error("seed: " + resp.status + " " + (await resp.text()));
}

async function open(browser, viewport, theme, scale) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale });
  await ctx.addCookies([{ name, value, domain: new URL(base).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(r.url() + " " + r.status()); });
  return { ctx, page, errors };
}

// rows is the box from the thread's first token row to the browser's row,
// inside the log's visible part
async function rows(page) {
  return page.evaluate(() => {
    const log = document.getElementById("chat-log");
    const all = Array.from(log.querySelectorAll(":scope > .msg"));
    const first = all.findIndex((m) => m.textContent.includes("What does #606 still wait on?"));
    const last = all.findIndex((m) => m.textContent.includes("Leave #606 to its session."));
    if (first < 0 || last < 0) return null;
    all[first].scrollIntoView({ block: "start" });
    const lb = log.getBoundingClientRect();
    const a = all[first].getBoundingClientRect(), b = all[last].getBoundingClientRect();
    const top = Math.max(a.top - 6, lb.top), bottom = Math.min(b.bottom + 4, lb.bottom);
    return { x: Math.max(lb.left, 0), y: top, width: Math.min(lb.width, 760), height: bottom - top };
  });
}

async function make(p) {
  // a candidate may fold the form once a token exists: open it as a human would
  if (!(await p.page.locator("#token-name").isVisible())) await p.page.locator("details:has(#token-name) > summary").click();
  await p.page.locator("#token-name").fill("desk-claude");
  await p.page.locator("#token-forgejo").fill("lab-forgejo-token");
  await Promise.all([p.page.waitForNavigation(), p.page.getByRole("button", { name: "Make chat token" }).click()]);
  await p.page.waitForTimeout(400);
}

async function main() {
  const browser = await chromium.launch();
  const shots = [];
  try {
    for (const theme of ["dark", "light"]) {
      const dir = path.join(out, theme);
      fs.mkdirSync(dir, { recursive: true });
      const file = (f) => { shots.push(path.join(theme, f)); return path.join(dir, f); };
      for (const [vp, w] of [[desk, 1440], [phone, 390]]) {
        for (const scale of [1, 3]) {
          const x = scale === 3 ? "-3x" : "";
          // the thread: the chat full screen at the desk, the phone's first column
          await seed();
          let p = await open(browser, vp, theme, scale);
          await p.page.goto(base + "/", { waitUntil: "load" });
          await p.page.waitForTimeout(900);
          if (w === 1440) {
            await p.page.locator("#chat-full").click();
            await p.page.waitForTimeout(400);
          }
          const box = await rows(p.page);
          if (!box) throw new Error("no token rows in the thread");
          await p.page.waitForTimeout(200);
          if (scale === 1) await p.page.screenshot({ path: file("thread-" + w + ".png") });
          await p.page.screenshot({ path: file("crop-label-" + w + x + ".png"), clip: await rows(p.page) });
          if (p.errors.length) throw new Error("thread: " + p.errors.join("; "));
          await p.ctx.close();
          // the page with the two tokens
          await seed();
          p = await open(browser, vp, theme, scale);
          await p.page.goto(base + "/notifications", { waitUntil: "load" });
          await p.page.waitForTimeout(400);
          if (scale === 1) await p.page.screenshot({ path: file("notifications-" + w + ".png"), fullPage: true });
          await p.page.locator('section[aria-labelledby="tokens"]').screenshot({ path: file("crop-tokens-" + w + x + ".png") });
          // the made state: what the answer shows where it lands, then the
          // whole page and the block
          await make(p);
          if (scale === 1) {
            await p.page.screenshot({ path: file("made-landing-" + w + ".png") });
            await p.page.screenshot({ path: file("made-" + w + ".png"), fullPage: true });
          }
          await p.page.locator('[aria-labelledby="shown"]').screenshot({ path: file("crop-shown-" + w + x + ".png") });
          if (p.errors.length) throw new Error("notifications: " + p.errors.join("; "));
          await p.ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(shots.length + " shots in " + out);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
