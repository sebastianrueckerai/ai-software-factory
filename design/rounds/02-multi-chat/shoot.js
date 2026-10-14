// Screenshots of the round's variants. Usage, from this directory:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node shoot.js [variant...]
// Each shot is [name, query, width, height, fullPage, action]; the query goes on the variant's index.html.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const common = [
  ['busy-dark-1440', 'scenario=busy&theme=dark', 1440, 900],
  ['threads-dark-1440', 'scenario=threads&theme=dark', 1440, 900],
  ['poke-dark-1440', 'scenario=poke&theme=dark', 1440, 900],
  ['poke-light-1440', 'scenario=poke&theme=light', 1440, 900],
  ['assisted-light-1440', 'scenario=assisted&theme=light', 1440, 900],
  ['escalation-dark-1440', 'scenario=escalation&theme=dark', 1440, 900],
  ['escalation-light-1440', 'scenario=escalation&theme=light', 1440, 900],
  ['busy-dark-1440-delete', 'scenario=busy&theme=dark', 1440, 900, false, 'delete'],
  ['busy-dark-1440-palette', 'scenario=busy&theme=dark', 1440, 900, false, 'palette'],
  ['busy-dark-1440-levels', 'scenario=busy&theme=dark', 1440, 900, false, 'levels'],
  ['busy-light-1440-levels', 'scenario=busy&theme=light', 1440, 900, false, 'levels'],
  ['busy-dark-1440-level', 'scenario=busy&theme=dark', 1440, 900, false, 'level'],
  ['phone-busy-dark-390-levels', 'scenario=busy&theme=dark', 390, 844, false, 'levels'],
  ['phone-escalation-dark-390', 'scenario=escalation&theme=dark', 390, 844, true],
  ['phone-threads-light-390', 'scenario=threads&theme=light', 390, 844, true],
];
const shots = {
  rail: common.concat([['busy-dark-1440-menu', 'scenario=busy&theme=dark', 1440, 900, false, 'menu']]),
  instrument: common,
  messenger: common.concat([['busy-dark-1440-menu', 'scenario=busy&theme=dark', 1440, 900, false, 'menu']]),
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
      if (action === 'menu' || action === 'delete') { const m = p.locator('.tmenu-btn'); if (await m.count()) { await m.click(); await p.waitForTimeout(200); } }
      if (action === 'delete') { await p.locator('[data-tmenu="delete"]').click(); await p.waitForTimeout(300); }
      if (action === 'palette') { await p.locator('#chat-input').click(); await p.keyboard.type('/'); await p.waitForTimeout(300); }
      if (action === 'levels' || action === 'level') { await p.locator('#level-btn').click(); await p.waitForTimeout(200); }
      if (action === 'level') { await p.locator('.lvlpop [data-lvl="autonomous"]').click(); await p.waitForTimeout(300); }
      await p.screenshot({ path: path.join(out, name + '.png'), fullPage: !!full });
      if (errors.length) console.log(v, name, 'JS errors:', errors.join(' | '));
      await p.close();
    }
    console.log(v, shots[v].length, 'shots');
  }
  await browser.close();
})();
