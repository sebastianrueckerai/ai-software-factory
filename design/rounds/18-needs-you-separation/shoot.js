// shoot.js shoots round 18's treatments of the Needs-you column from the
// prototype design/prototypes/needs-you-separation into $OUT/<treatment>/
// <theme>/: at 1440 the screen, the column as seen, the whole column on a
// screen tall enough to hold every card, and the seam between the first two
// cards at 1x and 3x; at 390 the column, the screen at the column's top and
// the seam at 1x and 3x. Each for two, three and five cards. Run it from the
// repository root with NODE_PATH holding playwright: node shoot.js A B C.
// The screen at 1440 is shot for three cards only.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const out = process.env.OUT;
if (!out) throw new Error("set OUT");
const page0 = "file://" + path.resolve(__dirname, "../../prototypes/needs-you-separation/index.html");
const treatments = process.argv.slice(2);
if (!treatments.length) throw new Error("name the treatments: before base A B C F");

async function open(browser, cand, theme, n, viewport, scale) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => errors.push(r.url() + " " + r.failure().errorText));
  await page.goto(`${page0}?c=${cand}&n=${n}&theme=${theme}`, { waitUntil: "load" });
  await page.waitForTimeout(250);
  return { ctx, page, errors };
}

// seam scrolls the first seam into the middle of the view and returns the
// box of 220 px around it, the column's width
async function seam(page) {
  return page.evaluate(() => {
    const col = document.getElementById("needs-you");
    const list = col.querySelector(".cards");
    const [a, b] = list.querySelectorAll(":scope > .card");
    const mid = () => (a.getBoundingClientRect().bottom + b.getBoundingClientRect().top) / 2;
    if (list.scrollHeight > list.clientHeight + 1) list.scrollTop += mid() - list.getBoundingClientRect().top - list.clientHeight / 2;
    else window.scrollBy(0, mid() - innerHeight / 2);
    const c = col.getBoundingClientRect(), y = mid();
    return { x: c.left, y: y - 110, width: c.width, height: 220 };
  });
}

async function main() {
  const browser = await chromium.launch();
  let shots = 0;
  try {
    for (const cand of treatments) for (const theme of ["dark", "light"]) {
      const dir = path.join(out, cand, theme);
      fs.mkdirSync(dir, { recursive: true });
      const file = (f) => { shots++; return path.join(dir, f); };
      for (const n of [2, 3, 5]) {
        // the desk
        let p = await open(browser, cand, theme, n, { width: 1440, height: 900 }, 1);
        if (n === 3) await p.page.screenshot({ path: file(`view-1440-n${n}.png`) });
        await p.page.locator("#needs-you").screenshot({ path: file(`col-1440-n${n}.png`) });
        await p.page.screenshot({ path: file(`seam-1440-n${n}.png`), clip: await seam(p.page) });
        const extra = await p.page.evaluate(() => { const l = document.querySelector("#needs-you .cards"); return l.scrollHeight - l.clientHeight; });
        await p.ctx.close();
        if (p.errors.length) throw new Error(cand + " 1440: " + p.errors.join("; "));
        p = await open(browser, cand, theme, n, { width: 1440, height: 900 + extra + 8 }, 1);
        await p.page.locator("#needs-you").screenshot({ path: file(`strip-1440-n${n}.png`) });
        await p.ctx.close();
        p = await open(browser, cand, theme, n, { width: 1440, height: 900 }, 3);
        await p.page.screenshot({ path: file(`seam-1440-n${n}-3x.png`), clip: await seam(p.page) });
        await p.ctx.close();
        // the phone
        p = await open(browser, cand, theme, n, { width: 390, height: 844 }, 1);
        await p.page.locator("#needs-you").screenshot({ path: file(`col-390-n${n}.png`) });
        await p.page.evaluate(() => document.getElementById("needs-you").scrollIntoView({ block: "start" }));
        await p.page.screenshot({ path: file(`view-390-n${n}.png`) });
        await p.page.screenshot({ path: file(`seam-390-n${n}.png`), clip: await seam(p.page) });
        const wide = await p.page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        await p.ctx.close();
        if (wide) throw new Error(cand + " 390 scrolls sideways");
        p = await open(browser, cand, theme, n, { width: 390, height: 844 }, 3);
        await p.page.screenshot({ path: file(`seam-390-n${n}-3x.png`), clip: await seam(p.page) });
        await p.ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log(shots + " shots in " + out);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
