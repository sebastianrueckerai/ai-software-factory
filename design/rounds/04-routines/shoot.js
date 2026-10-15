// Screenshots of the round's variants. Usage, from this directory:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node shoot.js [variant...]
// Each shot is [name, query, width, height, fullPage, action]; the query goes on the variant's index.html.
// Actions: home opens the variant's home (the panel, the head menu, the inbox); routine opens the weekly bump's
// drawer; card opens #790's drawer; skip clicks Skip once on the first visible routine row; fold folds the home.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const HOME = { panel: '#status-toggle', board: '#queued-due', chat: '.trow.inbox', hybrid: '#status-toggle' };
const common = [
  ['due-dark-1440', 'scenario=due&theme=dark', 1440, 900],
  ['due-light-1440', 'scenario=due&theme=light', 1440, 900],
  ['due-dark-1440-home', 'scenario=due&theme=dark', 1440, 900, false, 'home'],
  ['due-light-1440-home', 'scenario=due&theme=light', 1440, 900, false, 'home'],
  ['due-dark-1440-routine', 'scenario=due&theme=dark', 1440, 900, false, 'routine'],
  ['due-dark-1440-skip', 'scenario=due&theme=dark', 1440, 900, false, 'skip'],
  ['filed-dark-1440', 'scenario=filed&theme=dark', 1440, 900],
  ['filed-dark-1440-card', 'scenario=filed&theme=dark', 1440, 900, false, 'card'],
  ['held-dark-1440-home', 'scenario=held&theme=dark', 1440, 900, false, 'home'],
  ['held-light-1440', 'scenario=held&theme=light', 1440, 900],
  ['audit-dark-1440', 'scenario=audit&theme=dark', 1440, 900],
  ['audit-light-1440-home', 'scenario=audit&theme=light', 1440, 900, false, 'home'],
  ['due-dark-1920-home', 'scenario=due&theme=dark', 1920, 1080, false, 'home'],
  ['phone-due-dark-390', 'scenario=due&theme=dark', 390, 844, true],
  ['phone-due-dark-390-home', 'scenario=due&theme=dark', 390, 844, false, 'home'],
  ['phone-filed-light-390', 'scenario=filed&theme=light', 390, 844, true],
];
const shots = {
  panel: common,
  board: common,
  chat: common.concat([['due-dark-1440-fold', 'scenario=due&theme=dark', 1440, 900, false, 'fold']]),
  hybrid: common,
};
(async () => {
  const browser = await chromium.launch();
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(shots);
  for (const v of names) {
    const dir = path.join(__dirname, v), out = path.join(dir, 'shots');
    fs.mkdirSync(out, { recursive: true });
    for (const [name, q, w, h, full, action] of shots[v]) {
      const p = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'no-preference' });
      const errors = [];
      p.on('pageerror', (e) => errors.push(String(e)));
      await p.goto('file://' + path.join(dir, 'index.html') + '?' + q);
      await p.waitForTimeout(600);
      const home = async () => { const b = p.locator(HOME[v] + ':visible').first(); if (await b.count()) { await b.click(); await p.waitForTimeout(250); } };
      if (action === 'home' || action === 'routine' || action === 'skip' || action === 'fold') await home();
      if (action === 'fold') { const f = p.locator('[data-rfold]:visible').first(); if (await f.count()) { await f.click(); await p.waitForTimeout(200); } }
      if (action === 'routine') { const r = p.locator('[data-open-routine="weekly-bump"]:visible').first(); if (await r.count()) { await r.click(); await p.waitForTimeout(300); } }
      if (action === 'skip') { const s = p.locator('[data-routine="weekly-bump"] [data-act="skip"]:visible').first(); if (await s.count()) { await s.hover(); await s.click(); await p.waitForTimeout(300); } }
      if (action === 'card') { const c = p.locator('[data-open="790"]:visible').first(); if (await c.count()) { await c.click(); await p.waitForTimeout(300); } }
      await p.screenshot({ path: path.join(out, name + '.png'), fullPage: !!full });
      if (errors.length) console.log(v, name, 'JS errors:', errors.join(' | '));
      await p.close();
    }
    console.log(v, shots[v].length, 'shots');
  }
  await browser.close();
})();
