// Phone shots at a true 390 px viewport with Playwright, plus a layout probe per page.
// Usage: NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node phone.js <outDir> <page.html>...
// Headless Chrome floors its window at 500 px wide, so it cannot take these.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const [, , outDir, ...files] = process.argv;
(async () => {
  const browser = await chromium.launch();
  const probes = {};
  for (const f of files) {
    const page = await browser.newPage({ viewport: { width: 390, height: 800 }, reducedMotion: 'no-preference' });
    await page.goto('file://' + path.resolve(f));
    await page.waitForTimeout(1500);
    const name = path.basename(f, '.html');
    await page.screenshot({ path: path.join(outDir, `${name}-390.png`), fullPage: true });
    probes[name] = await page.evaluate(() => {
      const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), h: Math.round(b.height), w: Math.round(b.width) }; };
      return { win: [innerWidth, innerHeight], docH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth,
        hero: r(document.querySelector('#hero')), h1: r(document.querySelector('h1')), play: r(document.querySelector('#play-film')),
        filmBtn: r(document.querySelector('[data-play]')), video: r(document.querySelector('#film')) };
    });
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'phone-probes.json'), JSON.stringify(probes));
  console.log('phone shots:', files.length);
})();
