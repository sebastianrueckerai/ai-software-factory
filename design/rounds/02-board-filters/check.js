// Mechanics check of the round's variants. Usage, from this directory:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node check.js
// Exit 1 and one line per failure: a control missing, a filter that does not narrow the columns,
// a state that the URL does not carry, a clear that does not clear, a page error, a horizontal scroll at 390.
const { chromium } = require('playwright');
const path = require('path');
const url = (v, q) => 'file://' + path.join(__dirname, v, 'index.html') + '?' + q;
const counts = (p) => p.evaluate(() => Array.from(document.querySelectorAll('#board .col-head')).map((h) => h.innerText.replace(/\s+/g, ' ').trim()));
const cards = (p) => p.locator('#board [data-card]').count();

(async () => {
  const browser = await chromium.launch();
  const fails = [];
  const open = async (v, q, w, h) => {
    const p = await browser.newPage({ viewport: { width: w || 1440, height: h || 900 } });
    const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(url(v, q)); await p.waitForTimeout(400);
    return { p, errors };
  };
  const base = async (v, { p, errors }) => {
    if (errors.length) fails.push(v + ': JS error ' + errors[0]);
    for (const w of ['Needs you', 'Queued', 'In progress', 'Done', 'Merge PR #612', 'Approve', 'Wide view'])
      if (!(await p.evaluate(() => document.body.innerText)).includes(w)) fails.push(v + ': missing "' + w + '"');
    if (await p.locator('#accent').count()) fails.push(v + ': the accent filter is still there (C11)');
    if (await p.locator('#ticker').count()) fails.push(v + ': the ticker is still there (C12)');
  };

  // find: the box, live narrowing, the URL, the counts, f and Escape, the clear
  {
    const s = await open('find', 'scenario=busy&theme=dark'); const p = s.p; await base('find', s);
    const all = await cards(p);
    await p.keyboard.press('f');
    if (!(await p.evaluate(() => document.activeElement && document.activeElement.id === 'q'))) fails.push('find: f does not focus the box');
    await p.keyboard.type('612'); await p.waitForTimeout(200);
    if (!(await p.evaluate(() => document.activeElement && document.activeElement.id === 'q'))) fails.push('find: typing loses the focus');
    const n = await cards(p); if (!(n < all)) fails.push('find: "612" does not narrow the board (' + n + ' of ' + all + ')');
    if (!(await p.evaluate(() => location.search)).includes('q=612')) fails.push('find: the URL does not carry q=612');
    const c = await counts(p); if (!c.some((x) => /\d+ of \d+/.test(x))) fails.push('find: no "n of m" count (' + c.join(' | ') + ')');
    if (!(await p.locator('#find-clear').isVisible())) fails.push('find: no clear button while a find is on');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    if ((await cards(p)) !== all) fails.push('find: Escape does not clear the find');
    if ((await p.evaluate(() => location.search)).includes('q=')) fails.push('find: the URL keeps q after the clear');
    await p.keyboard.type('plan:558'); await p.waitForTimeout(200);
    if ((await cards(p)) !== 1) fails.push('find: plan:558 does not leave one card');
    await p.locator('#find-clear').click(); await p.waitForTimeout(200);
    if ((await cards(p)) !== all) fails.push('find: the clear button does not clear');
    const r = await open('find', 'scenario=busy&theme=dark&q=is:failed'); if ((await cards(r.p)) !== 1) fails.push('find: ?q=is:failed on load does not leave one card'); await r.p.close();
    await p.close();
  }
  // chips: one per state and plan, a click narrows, a second click clears, the URL
  {
    const s = await open('chips', 'scenario=busy&theme=dark'); const p = s.p; await base('chips', s);
    const all = await cards(p);
    for (const w of ['failed', 'blocked', 'near budget', 'plan #558']) if (!(await p.locator('.fchip', { hasText: w }).count())) fails.push('chips: no chip "' + w + '"');
    if (await p.locator('.fchip', { hasText: 'on the provider' }).count()) fails.push('chips: "on the provider" chip in busy, where no card is on it');
    await p.locator('.fchip', { hasText: 'near budget' }).click(); await p.waitForTimeout(200);
    if ((await cards(p)) !== 1) fails.push('chips: "near budget" does not leave one card');
    if ((await p.locator('.fchip[aria-pressed="true"]').count()) !== 1) fails.push('chips: the pressed chip is not marked');
    if (!(await p.evaluate(() => location.search)).includes('q=is%3Anear')) fails.push('chips: the URL does not carry q=is:near (' + (await p.evaluate(() => location.search)) + ')');
    await p.locator('.fchip', { hasText: 'near budget' }).click(); await p.waitForTimeout(200);
    if ((await cards(p)) !== all) fails.push('chips: a second click does not clear');
    const q = await open('chips', 'scenario=quiet&theme=dark'); if (await q.p.locator('.fchips').count()) fails.push('chips: a row shows in quiet, where nothing is exceptional'); await q.p.close();
    await p.close();
  }
  // menus: a button per column but Needs you, the popover, a choice narrows and orders, the state line, its clear, Escape, the URL
  {
    const s = await open('menus', 'scenario=busy&theme=dark'); const p = s.p; await base('menus', s);
    if ((await p.locator('.col-menu').count()) !== 3) fails.push('menus: not three menu buttons');
    if (await p.locator('#needs .col-menu').count()) fails.push('menus: Needs you has a menu');
    await p.locator('[data-menu="done"]').click(); await p.waitForTimeout(200);
    if (!(await p.locator('#menu-done').isVisible())) fails.push('menus: the Done menu does not open');
    await p.locator('#menu-done input[value="failed"]').check(); await p.waitForTimeout(200);
    const done = await p.locator('[data-col="done"] [data-card]').count(); if (done !== 1) fails.push('menus: failed only leaves ' + done + ' done rows');
    if (!(await p.locator('[data-col="done"] .col-state').count())) fails.push('menus: no state line under Done');
    if (!(await p.evaluate(() => location.search)).includes('done=failed')) fails.push('menus: the URL does not carry done=failed');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    if (await p.locator('#menu-done').isVisible()) fails.push('menus: Escape does not close the menu');
    await p.locator('[data-col="done"] .col-x').click(); await p.waitForTimeout(200);
    if ((await p.locator('[data-col="done"] [data-card]').count()) !== 8) fails.push('menus: the state line\'s × does not clear');
    const r = await open('menus', 'scenario=busy&theme=dark&progress=spend'); const first = await r.p.locator('[data-col="inprogress"] [data-card]').first().getAttribute('data-card');
    if (first !== '601') fails.push('menus: by spend does not put #601 first (' + first + ')'); await r.p.close();
    await p.close();
  }
  for (const v of ['find', 'chips', 'menus']) {
    const s = await open(v, 'scenario=busy&theme=dark', 390, 844);
    const sw = await s.p.evaluate(() => document.documentElement.scrollWidth); if (sw > 390) fails.push(v + ': horizontal scroll at 390 (' + sw + ')');
    // this round's controls only; the prototype's own text links and card openers are not its concern
    const small = await s.p.evaluate(() => Array.from(document.querySelectorAll('.find input, .find-x, .fchip, .col-menu, .col-x, .menu-pop label')).filter((b) => b.offsetParent).map((b) => [b.className, b.getBoundingClientRect().height]).filter((x) => x[1] < 44));
    if (small.length) fails.push(v + ': phone targets under 44 px: ' + small.map((x) => x[0] + ' ' + Math.round(x[1])).join(', '));
    await s.p.close();
  }
  await browser.close();
  if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
  console.log('ok: the controls are there, the mechanics work');
})();
