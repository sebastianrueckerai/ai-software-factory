// Measures the contrast of every text pair the round adds, per variant and theme, on the rendered page. Prints a table: the lowest ratio per pair.
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node contrast.js
const { chromium } = require('playwright');
const path = require('path');
const PAIRS = [
  ['a row title, muted on the panel', '.trow:not(.on):not(.unread) .ttitle'], ['the open row, text on hover', '.trow.on .ttitle'], ['an unread row title', '.trow.unread .ttitle'], ['a row time, faint', '.trow .tat'],
  ['the badge, ink on amber', '.badge'], ['the archived label', '.tarch-l, .tarch summary'], ['an archived title', '.trow.arch .ttitle'], ['restore, cyan', '.restore'],
  ['the thread head title', '.thead .ttl'], ['the thread hint, faint mono', '.thint'], ['"the factory", amber', '.msg.poke .who'], ['a decider line, faint mono', '.decider'], ['"needs you" on the escalation', '.esc-l'],
  ['"Answer:", amber small caps', '.answer-l'], ['"or in your words", faint', '.answer-or'], ['a command chip', '.cmd'], ['a palette name, cyan', '.palette button b'], ['a palette word', '.palette button span'],
  ['the delete warning text', '.overlay-box p'], ['a choice button', '#chat .btn-choice'], ['the level button, muted mono on the composer', '#level-btn'], ['a level name in the menu', '.lvlpop b'], ['a level\'s words, muted', '.lvlpop .lw'], ['the menu head, faint', '.lvlpop .lp-head span'], ['the confirm\'s text', '.lvl-confirm p'], ['the newest line, faint', '.tline:not(.working)'], ['"a turn in flight", cyan', '.tline.working'],
];
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const v of ['rail', 'instrument', 'messenger']) for (const theme of ['dark', 'light']) for (const [sc, action] of [['busy', 'delete'], ['escalation', 'palette'], ['threads', 'levels'], ['threads', 'level']]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto('file://' + path.join(__dirname, v, 'index.html') + '?scenario=' + sc + '&theme=' + theme); await p.waitForTimeout(300);
    if (action === 'delete') { const m = p.locator('.tmenu-btn'); if (await m.count()) await m.click(); await p.locator('[data-tmenu="delete"]').click(); await p.waitForTimeout(150); }
    if (action === 'palette') { await p.locator('#chat-input').click(); await p.keyboard.type('/'); await p.waitForTimeout(100); }
    if (action === 'levels' || action === 'level') { await p.locator('#level-btn').click(); await p.waitForTimeout(100); }
    if (action === 'level') { await p.locator('.lvlpop [data-lvl="full auto"]').click(); await p.waitForTimeout(150); }
    const r = await p.evaluate((pairs) => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (s) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = s; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
      const over = (fg, bg) => fg.map((x, i) => i < 3 ? x * fg[3] + bg[i] * (1 - fg[3]) : 1);
      const lum = (c) => { const f = (x) => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
      const bgOf = (el) => { let layers = []; for (let e = el; e; e = e.parentElement) { const b = rgb(getComputedStyle(e).backgroundColor); if (b[3] > 0) { layers.push(b); if (b[3] >= 1) break; } } let o = [255, 255, 255, 1]; for (const l of layers.reverse()) o = over(l, o); return o; };
      const res = {};
      for (const [name, sel] of pairs) for (const el of document.querySelectorAll(sel)) {
        if (!el.offsetParent || !el.textContent.trim()) continue;
        const bg = bgOf(el), fg = over(rgb(getComputedStyle(el).color), bg), l1 = lum(fg), l2 = lum(bg), r = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
        res[name] = Math.min(res[name] || 99, r);
      }
      return res;
    }, PAIRS);
    for (const k in r) { out[k] = out[k] || {}; out[k][theme] = Math.min(out[k][theme] || 99, r[k]); }
    await p.close();
  }
  await b.close();
  for (const [name] of PAIRS) if (out[name]) console.log(name + '\t' + out[name].dark.toFixed(1) + '\t' + out[name].light.toFixed(1));
})();
