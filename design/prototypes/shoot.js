// Screenshots of one prototype. Usage: node shoot.js prototypes/<slug> [out-dir]
// NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const dir = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3] || path.join(dir, 'shots'));
fs.mkdirSync(out, { recursive: true });
const url = (q) => 'file://' + path.join(dir, 'index.html') + '?' + q;
const shots = [
  ['busy-dark-1440', 'scenario=busy&theme=dark', 1440, 900, false],
  ['busy-light-1440', 'scenario=busy&theme=light', 1440, 900, false],
  ['busy-dark-1920', 'scenario=busy&theme=dark', 1920, 1080, false],
  ['idle-dark-1440', 'scenario=idle&theme=dark', 1440, 900, false],
  ['idle-light-1440', 'scenario=idle&theme=light', 1440, 900, false],
  ['fire-dark-1440', 'scenario=fire&theme=dark', 1440, 900, false],
  ['quiet-light-1440', 'scenario=quiet&theme=light', 1440, 900, false],
  ['busy-dark-tall-1440', 'scenario=busy&theme=dark', 1440, 900, true],
  ['phone-busy-dark-390', 'scenario=busy&theme=dark', 390, 844, true],
  ['phone-busy-light-390', 'scenario=busy&theme=light', 390, 844, true],
];
(async () => {
  const browser = await chromium.launch();
  for (const [name, q, w, h, full] of shots) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'no-preference' });
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(url(q)); await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(out, name + '.png'), fullPage: full });
    if (errors.length) console.log(name, 'JS errors:', errors.join(' | '));
    await p.close();
  }
  // the drawer open on a working card, busy dark 1440: click the first card title in Working
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(url('scenario=busy&theme=dark')); await p.waitForTimeout(500);
  const t = p.locator('[data-card="601"] [data-open], [data-card="601"] a, [data-card="601"] button').first();
  if (await t.count()) { await t.click(); await p.waitForTimeout(600); await p.screenshot({ path: path.join(out, 'drawer-busy-dark-1440.png') }); }
  else console.log('no [data-card="601"] title to open the drawer');
  await p.close();
  await browser.close();
  console.log(out);
})();
