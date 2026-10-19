const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("file://" + process.cwd() + "/design/rounds/11-compact-reorg/cand/try-a-bundle.html");
  await p.waitForTimeout(800);
  await p.click("article.need");
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const rc = s => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      close: rc("#drawer-close"),
      title: rc("#drawer .dr-title"),
      ref: rc("#drawer .dr-ref"),
      h2: rc("#drawer .dr-title h2"),
      head: rc("#drawer .drawer-head"),
      headPos: getComputedStyle(document.querySelector("#drawer .drawer-head")).position,
      closePos: getComputedStyle(document.querySelector("#drawer-close")).position
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
