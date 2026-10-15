// shoot.js puts each candidate of candidates.js into the console lab's top
// bar (the busy scenario) and shoots it in both themes into shots/<slug>/:
// the top bar at 1440, the button's neighbourhood at 1x and 3x, at rest and
// hovered, the switch to the other theme as a film of paused frames, and
// the phone's top bar at 390. "before" is the console as it is.
// Usage: start the lab in the code repository,
//   CONSOLE_LAB=1 CONSOLE_LAB_DIR=/tmp/claude-1000/tt-lab CONSOLE_LAB_ADDR=127.0.0.1:8097 \
//   go test -run '^TestLab$' -timeout 0 ./internal/console/
// then: node shoot.js [slug ...]   (every candidate and "before" without slugs;
// BASE and CONSOLE_LAB_DIR override the address and the lab's directory)
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { COMMON, CANDIDATES } = require("./candidates.js");

const base = process.env.BASE || "http://127.0.0.1:8097";
const labDir = process.env.CONSOLE_LAB_DIR || "/tmp/claude-1000/tt-lab";
const out = path.join(__dirname, "shots");
const [name, value] = fs.readFileSync(path.join(labDir, "cookie.txt"), "utf8").trim().split(/=(.*)/s);
const FRAMES = [0, 80, 160, 240, 320, 420, 600];
const only = process.argv.slice(2);

async function page(browser, theme, viewport, dpr) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, bypassCSP: true, reducedMotion: "no-preference" });
  await ctx.addCookies([{ name, value, domain: new URL(base).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const p = await ctx.newPage();
  await p.goto(base + "/", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  return p;
}

async function install(p, c) {
  if (!c) return;
  await p.addStyleTag({ content: COMMON + c.css });
  await p.evaluate(({ slug, svg }) => {
    const b = document.getElementById("theme-toggle");
    b.classList.add("tt", "tt-" + slug);
    b.innerHTML = svg.replaceAll("{id}", "tt-" + slug + "-0");
  }, { slug: c.slug, svg: c.svg });
  await p.waitForTimeout(700);
}

// the button's neighbourhood: from 70 px left of it to the end of Log out
async function near(p) {
  const b = await p.locator("#theme-toggle").boundingBox();
  const l = await p.locator(".logout").boundingBox();
  return { x: Math.max(0, b.x - 70), y: 0, width: l.x + l.width + 14 - Math.max(0, b.x - 70), height: 44 };
}

(async () => {
  const browser = await chromium.launch();
  const list = [null, ...CANDIDATES].filter((c) => !only.length || only.includes(c ? c.slug : "before"));
  for (const c of list) {
    const slug = c ? c.slug : "before";
    const dir = path.join(out, slug);
    fs.mkdirSync(dir, { recursive: true });
    for (const theme of ["dark", "light"]) {
      let p = await page(browser, theme, { width: 1440, height: 900 }, 1);
      await install(p, c);
      await p.screenshot({ path: path.join(dir, `${theme}-header.png`), clip: { x: 0, y: 0, width: 1440, height: 44 } });
      await p.screenshot({ path: path.join(dir, `${theme}-zoom1x.png`), clip: await near(p) });
      await p.context().close();

      p = await page(browser, theme, { width: 1440, height: 900 }, 3);
      await install(p, c);
      const box = await near(p);
      await p.screenshot({ path: path.join(dir, `${theme}-zoom3x.png`), clip: box });
      await p.locator("#theme-toggle").hover();
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(dir, `${theme}-hover3x.png`), clip: box });
      await p.mouse.move(10, 400);
      await p.waitForTimeout(300);
      if (c) {
        const b = await p.locator("#theme-toggle").boundingBox();
        const clip = { x: b.x - 4, y: 0, width: b.width + 8, height: 44 };
        await p.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme === "dark" ? "light" : "dark");
        await p.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
        for (const t of FRAMES) {
          await p.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t; }), t);
          await p.screenshot({ path: path.join(dir, `${theme}-film-${String(t).padStart(3, "0")}.png`), clip });
        }
      }
      await p.context().close();

      p = await page(browser, theme, { width: 390, height: 844 }, 3);
      await install(p, c);
      const h = await p.locator("header.top").boundingBox();
      await p.screenshot({ path: path.join(dir, `${theme}-phone.png`), clip: { x: 0, y: 0, width: 390, height: h.height } });
      await p.context().close();
    }
    console.log(slug);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
