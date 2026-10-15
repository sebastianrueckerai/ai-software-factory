// Full-page screenshots of an HTML file at 1440 and 390 with Playwright. Usage: node tools/shoot.js <dir> [page.html]
// Needs a directory with "npm i playwright" on NODE_PATH and PLAYWRIGHT_BROWSERS_PATH set.
const { chromium } = require('playwright');
const path = require('path');
const dir = path.resolve(process.argv[2]);
const page = process.argv[3] || 'index.html';
const stem = page === 'index.html' ? 'shot' : page.replace(/\.html$/, '');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const w of [1440, 390]) {
    const p = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'no-preference' });
    await p.goto('file://' + path.join(dir, page));
    await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(dir, `${stem}-${w}.png`), fullPage: true });
    console.log(path.relative(process.cwd(), path.join(dir, `${stem}-${w}.png`)));
    await p.close();
  }
  await browser.close();
})();
