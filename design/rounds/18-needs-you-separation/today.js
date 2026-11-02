// today.js shoots two of today's Needs-you cards in the console lab's busy
// scenario (the code repository's scripts/console-lab), the escalation #603
// and the merge approval #607, as the console renders them (before) and
// under the pick (F: the prototype's base.css and F.css added to the page,
// past its content security policy), in both themes at 1440 and 390, each
// card at 1x and its head at 3x, into $OUT/<before|F>/<theme>/. Then it checks each card under F: the band is
// at least 32 px tall, every line of the head row's text lies inside it,
// and at 390 nothing scrolls sideways. Run it against a running lab with
// BASE, CONSOLE_LAB_DIR and NODE_PATH as run.sh sets them.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const base = process.env.BASE || "http://127.0.0.1:8090";
const labDir = process.env.CONSOLE_LAB_DIR || "/tmp/claude-1000/console-lab";
const out = process.env.OUT;
if (!out) throw new Error("set OUT");
const proto = path.resolve(__dirname, "../../prototypes/needs-you-separation");
const css = ["base.css", "F.css"].map((f) => fs.readFileSync(path.join(proto, f), "utf8")).join("\n");
const [name, value] = fs.readFileSync(path.join(labDir, "cookie.txt"), "utf8").trim().split(/=(.*)/s);
const cards = { escalation: "#needs-you .cards > .card.escalation", approval: "#needs-you .cards > .card.approval:not(.plan)" };
const head = { escalation: ":scope > .face > .line1", approval: ":scope > .need-top" };

async function main() {
  const seed = await fetch(base + "/lab/scenario/busy");
  if (seed.status !== 204) throw new Error("seed: " + seed.status);
  const browser = await chromium.launch();
  const fails = [];
  try {
    for (const t of ["before", "F"]) for (const theme of ["dark", "light"]) for (const w of [1440, 390]) for (const scale of [1, 3]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: scale, bypassCSP: true });
      await ctx.addCookies([{ name, value, domain: new URL(base).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
      await ctx.addInitScript((th) => localStorage.setItem("theme", th), theme);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "/", { waitUntil: "load" });
      await page.waitForTimeout(900);
      if (t === "F") await page.addStyleTag({ content: css });
      await page.waitForTimeout(200);
      const dir = path.join(out, t, theme);
      fs.mkdirSync(dir, { recursive: true });
      for (const kind of Object.keys(cards)) {
        const card = page.locator(cards[kind]).first();
        if (scale === 1) await card.screenshot({ path: path.join(dir, `${kind}-${w}.png`) });
        else {
          await card.evaluate((c) => c.scrollIntoView({ block: "start" }));
          const box = await card.boundingBox();
          await page.screenshot({ path: path.join(dir, `${kind}-head-${w}-3x.png`), clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 120) } });
        }
        if (t === "F" && scale === 1) {
          const r = await card.evaluate((c, sel) => {
            const row = c.querySelector(sel);
            const b = row.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(row);
            const lines = Array.from(range.getClientRects()).filter((q) => q.width > 0 && q.height > 0);
            const out = lines.filter((q) => q.top < b.top - 0.5 || q.bottom > b.bottom + 0.5 || q.left < b.left - 0.5 || q.right > b.right + 0.5);
            const bg = getComputedStyle(row).backgroundColor;
            const span = lines.length ? Math.round(Math.max(...lines.map((q) => q.bottom)) - Math.min(...lines.map((q) => q.top))) : 0;
            return { height: Math.round(b.height), span, outside: out.length, bg, sideways: document.documentElement.scrollWidth > innerWidth };
          }, head[kind]);
          const ok = r.height >= 32 && r.outside === 0 && !r.sideways && r.bg !== "rgba(0, 0, 0, 0)";
          console.log(`${ok ? "ok  " : "FAIL"} ${kind} ${theme} ${w}: band ${r.height} px, its text ${r.span} px tall, ${r.outside} text boxes outside the band${r.sideways ? ", scrolls sideways" : ""}`);
          if (!ok) fails.push(`${kind} ${theme} ${w}`);
        }
      }
      if (errors.length) fails.push(`${t} ${theme} ${w}: ${errors.join("; ")}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  if (fails.length) throw new Error("failed: " + fails.join(", "));
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
