// Screenshots of the round's variants. Usage, from this directory:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node shoot.js [variant...]
// Each shot is [name, query, width, height, fullPage, action]; the query goes on the variant's index.html.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const shots = {
  find: [
    ['busy-dark-1440', 'scenario=busy&theme=dark', 1440, 900],
    ['busy-dark-1440-612', 'scenario=busy&theme=dark&q=612', 1440, 900],
    ['busy-light-1440-612', 'scenario=busy&theme=light&q=612', 1440, 900],
    ['fire-dark-1440-provider', 'scenario=fire&theme=dark&q=provider', 1440, 900],
    ['phone-busy-dark-390-612', 'scenario=busy&theme=dark&q=612', 390, 844, true],
    ['busy-dark-1440-keys', 'scenario=busy&theme=dark', 1440, 900, false, 'keys'],
  ],
  chips: [
    ['busy-dark-1440', 'scenario=busy&theme=dark', 1440, 900],
    ['busy-dark-1440-near', 'scenario=busy&theme=dark&q=is:near', 1440, 900],
    ['busy-light-1440-near', 'scenario=busy&theme=light&q=is:near', 1440, 900],
    ['fire-dark-1440-provider', 'scenario=fire&theme=dark&q=is:provider', 1440, 900],
    ['phone-busy-dark-390-near', 'scenario=busy&theme=dark&q=is:near', 390, 844, true],
  ],
  menus: [
    ['busy-dark-1440', 'scenario=busy&theme=dark', 1440, 900],
    ['busy-dark-1440-open', 'scenario=busy&theme=dark', 1440, 900, false, 'open-done'],
    ['busy-dark-1440-blocked-failed', 'scenario=busy&theme=dark&queued=oldest,blocked&done=failed', 1440, 900],
    ['busy-light-1440-blocked-failed', 'scenario=busy&theme=light&queued=oldest,blocked&done=failed', 1440, 900],
    ['fire-dark-1440-spend-exceptional', 'scenario=fire&theme=dark&progress=spend,exceptional&done=failed', 1440, 900],
    ['phone-busy-dark-390-blocked-failed', 'scenario=busy&theme=dark&queued=oldest,blocked&done=failed', 390, 844, true],
  ],
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
      if (action === 'open-done') { await p.locator('[data-menu="done"]').click(); await p.waitForTimeout(300); }
      if (action === 'keys') { await p.keyboard.press('?'); await p.waitForTimeout(300); }
      await p.screenshot({ path: path.join(out, name + '.png'), fullPage: !!full });
      if (errors.length) console.log(v, name, 'JS errors:', errors.join(' | '));
      await p.close();
    }
    console.log(v, shots[v].length, 'shots');
  }
  await browser.close();
})();
