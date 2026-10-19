const { chromium } = require("playwright");
const fs = require("fs");

// usage: node shoot-try.js <page.html> <action rest|drawer|threads> <out.png> <rects.json>
(async () => {
  const [, , page, action, out, rectsOut] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("file://" + process.cwd() + "/design/rounds/11-compact-reorg/cand/" + page);
  await p.waitForTimeout(1200);
  if (action === "drawer") await p.click("article.need");
  if (action === "threads") await p.click(".ctab:nth-child(2)");
  if (action === "rest") {
    const bar = await p.evaluate(() => {
      const b = document.querySelector("#chat-form .growbar").getBoundingClientRect();
      return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
    });
    await p.mouse.move(bar.x, bar.y);
  }
  await p.waitForTimeout(400);
  const rects = await p.evaluate(() => {
    const r = s => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { s, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const out = {};
    const want = ["#chat-full", "#chat-divider", ".chiprow", "article.need", "#drawer .tabs", "#drawer-close", ".ctabs", ".edge-tab", "#intake-btn", "#chat-form .growbar", "#chat-form"];
    want.forEach(s => { const v = r(s); if (v) out[s] = v; });
    return out;
  });
  fs.writeFileSync(rectsOut, JSON.stringify(rects, null, 1));
  await p.screenshot({ path: "design/rounds/11-compact-reorg/cand/" + out });
  await b.close();
  console.log(out, JSON.stringify(rects));
})();
