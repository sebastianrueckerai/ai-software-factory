// Mechanics and measurement of the round's variants. Usage, from this directory:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node check.js [variant...]
// Exit 1 and one line per failure: a page error in any moment or theme, a word missing, a chip missing on a routine's
// card, a home that does not open or lists fewer than four routines, a routine that does not open in the drawer with
// its Runs, an act without a confirmation, an rt- text pair under 4.5:1 in either theme, a horizontal scroll at 390,
// a phone target under 44 px.
const { chromium } = require('playwright');
const path = require('path');
const V = process.argv.slice(2).length ? process.argv.slice(2) : ['panel', 'board', 'chat', 'hybrid'];
const HOME = { panel: '#status-toggle', board: '#queued-due', chat: '.trow.inbox', hybrid: '#status-toggle' };
const url = (v, q) => 'file://' + path.join(__dirname, v, 'index.html') + '?' + q;
const text = (p) => p.evaluate(() => document.body.innerText);
const WORDS = ['Weekly bump', 'Template pass', 'Dependency update', 'Audit', 'Skip once', 'Run now', 'Backup', 'Forgejo dump', 'routine', 'Needs you', 'Queued', 'In progress', 'Done', 'Merge PR #612', 'Inbox'];

const contrast = `(() => {
  const lum = (c) => { const m = c.match(/[\\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return [0.2126 * r + 0.7152 * g + 0.0722 * b, m[3] === undefined ? 1 : m[3]]; };
  const bgOf = (el) => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; const [l, a] = lum(c); if (a >= 0.99) return l; e = e.parentElement; } return lum(getComputedStyle(document.body).backgroundColor)[0]; };
  const out = [];
  for (const el of document.querySelectorAll('[class*="rt-"]')) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const [fl] = lum(getComputedStyle(el).color); const bl = bgOf(el);
    const r = (Math.max(fl, bl) + 0.05) / (Math.min(fl, bl) + 0.05);
    out.push([el.className.toString().split(' ').find(c => c.startsWith('rt-')) || el.className, Math.round(r * 10) / 10, el.textContent.trim().slice(0, 40)]);
  }
  return out;
})()`;

(async () => {
  const browser = await chromium.launch();
  const fails = [];
  const open = async (v, q, w, h) => {
    const p = await browser.newPage({ viewport: { width: w || 1440, height: h || 900 } }); p.setDefaultTimeout(4000);
    const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(url(v, q)); await p.waitForTimeout(400);
    return { p, errors };
  };
  const home = async (v, p) => { const b = p.locator(HOME[v] + ':visible').first(); if (!(await b.count())) { fails.push(v + ': the home\'s opener ' + HOME[v] + ' is not there'); return; } await b.click(); await p.waitForTimeout(250); };
  process.on('unhandledRejection', (e) => { console.log(fails.join('\n')); console.log('CRASH', e.message.split('\n').slice(0, 4).join(' / ')); process.exit(1); });
  for (const v of V) {
    console.log('checking', v);
    for (const m of ['due', 'filed', 'held', 'audit']) for (const t of ['dark', 'light']) {
      const s = await open(v, 'scenario=' + m + '&theme=' + t);
      if (s.errors.length) fails.push(v + ' ' + m + ' ' + t + ': JS error ' + s.errors[0]);
      await s.p.close();
    }
    // the words, the chip, the home
    let s = await open(v, 'scenario=due&theme=dark'); let p = s.p;
    await home(v, p);
    const t0 = await text(p);
    for (const w of WORDS) if (!t0.includes(w)) fails.push(v + ': missing "' + w + '"');
    for (const n of ['781', '779']) if (!(await p.locator('[data-card="' + n + '"] .rt-chip').count())) fails.push(v + ': #' + n + ' has no routine chip');
    if (!(await p.locator('#routines-home').count())) fails.push(v + ': no #routines-home');
    else if (!(await p.locator('#routines-home').isVisible())) fails.push(v + ': the home does not open');
    const rows = await p.locator('#routines-home [data-routine]').count();
    if (rows < 4) fails.push(v + ': the home lists ' + rows + ' routines, not 4');
    if (!(await text(p)).includes('jobs of the cluster')) fails.push(v + ': the jobs of the cluster are not labelled');
    // the routine's drawer
    const r = p.locator('[data-open-routine="weekly-bump"]:visible').first();
    if (!(await r.count())) fails.push(v + ': nothing opens the weekly bump');
    else {
      await r.click(); await p.waitForTimeout(300);
      if (!(await p.locator('#drawer').isVisible())) fails.push(v + ': the routine does not open the drawer');
      const d = await p.locator('#drawer').innerText();
      for (const w of ['Weekly bump', 'every Monday 06:00', 'Overview', 'Runs', 'Config', 'Skip once', 'Run now', 'while open']) if (!d.includes(w)) fails.push(v + ': the routine drawer lacks "' + w + '"');
      const runs = p.locator('#drawer [role="tab"], #drawer .tab, #drawer button', { hasText: /^Runs/ }).first();
      if (await runs.count()) { await runs.click(); await p.waitForTimeout(200); const d2 = await p.locator('#drawer').innerText(); for (const w of ['#781', '#742', 'skipped', 'closed']) if (!d2.includes(w)) fails.push(v + ': the Runs tab lacks "' + w + '"'); }
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      if (await p.locator('#drawer').isVisible()) fails.push(v + ': Escape does not close the routine drawer');
    }
    // the acts
    await home(v, p);
    const sk = p.locator('[data-routine="weekly-bump"] [data-act="skip"]:visible').first();
    if (!(await sk.count())) fails.push(v + ': no Skip once on the weekly bump');
    else { await sk.hover(); await sk.click(); await p.waitForTimeout(300); if (!(await text(p)).includes('Skipped once')) fails.push(v + ': Skip once gives no confirmation'); }
    await p.close();
    s = await open(v, 'scenario=due&theme=dark'); p = s.p; await home(v, p);
    const rn = p.locator('[data-routine="weekly-bump"] [data-act="run"]:visible').first();
    if (!(await rn.count())) fails.push(v + ': no Run now on the weekly bump');
    else { await rn.hover(); await rn.click(); await p.waitForTimeout(300); const tt = await text(p); if (!tt.includes('Filed #790')) fails.push(v + ': Run now gives no confirmation'); if (!(await p.locator('[data-card="790"]').count())) fails.push(v + ': Run now adds no #790 to the board'); }
    await p.close();
    // the filed card's provenance
    s = await open(v, 'scenario=filed&theme=dark'); p = s.p;
    const c = p.locator('[data-open="790"]:visible').first();
    if (!(await c.count())) fails.push(v + ': filed: no #790 on the board');
    else { await c.click(); await p.waitForTimeout(300); const d = await p.locator('#drawer').innerText(); if (!d.includes('run 15')) fails.push(v + ': #790\'s drawer lacks the provenance line'); if (!(await p.locator('#drawer .rt-prov [data-open-routine]').count())) fails.push(v + ': the provenance line does not link the routine'); }
    await p.close();
    // the held moment speaks
    s = await open(v, 'scenario=held&theme=dark'); p = s.p; await home(v, p);
    if (!(await text(p)).includes('held')) fails.push(v + ': the held moment does not say held');
    await p.close();
    // contrast of every rt- element, home open, both themes, desk and phone
    for (const t of ['dark', 'light']) for (const [w, h] of [[1440, 900], [390, 844]]) {
      s = await open(v, 'scenario=due&theme=' + t, w, h); p = s.p; await home(v, p);
      for (const [cls, ratio, sample] of await p.evaluate(contrast)) if (ratio < 4.5) fails.push(v + ' ' + t + ' ' + w + ': ' + cls + ' at ' + ratio + ':1 ("' + sample + '")');
      if (w === 390) {
        const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 390) fails.push(v + ' ' + t + ': horizontal scroll at 390 (' + sw + ')');
        const small = await p.evaluate(() => [...document.querySelectorAll('#routines-home button, #routines-home a, [data-act], [data-open-routine], [data-rfold]')].filter(b => b.offsetParent).map(b => [b.textContent.trim().slice(0, 20), b.getBoundingClientRect().height]).filter(([, hh]) => hh < 44));
        for (const [n, hh] of small) fails.push(v + ' ' + t + ': phone target "' + n + '" is ' + Math.round(hh) + ' px');
      }
      await p.close();
    }
    console.log(fails.length ? '' : 'ok ' + v);
  }
  await browser.close();
  if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
})();
