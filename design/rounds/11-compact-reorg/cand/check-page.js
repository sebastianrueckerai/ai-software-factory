const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  p.on("requestfailed", r => errs.push("reqfail " + r.url().split("/").pop()));
  await p.goto("file://" + process.cwd() + "/design/rounds/11-compact-reorg/index.html");
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({
    figs: document.querySelectorAll("figure").length,
    bad: [...document.images].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.src.split("/").pop()),
    tryA: !!document.querySelector('a[href="cand/try-a-bundle.html"]'),
    tryB: !!document.querySelector('a[href="cand/try-b-tabs.html"]')
  }));
  console.log(JSON.stringify({ ...r, errs }));
  await b.close();
})();
