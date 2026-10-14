// Mechanics check of one prototype. Usage: node check.js prototypes/<slug>
// Exit 1 and a list of failures when a control of inventory.md is missing or a mechanic does not work.
const { chromium } = require('playwright');
const path = require('path');
const dir = path.resolve(process.argv[2]);
const url = (q) => 'file://' + path.join(dir, 'index.html') + '?' + q;
const mustHave = {
  busy: ['Factory console', 'Board', 'New task', 'Projects', 'Resources', 'Costs', 'Policy', 'Alerts', 'Log out', 'sebastian',
    'waiting on you', '3 working', '2 need you', '€61.40', '€120', 'GitHub', 'Two cards need your decision',
    'Needs you', 'Queued', 'In progress', 'Done', 'Merge PR #612', 'high risk', 'migration', 'Approve', 'Deny', 'Split',
    'Which store for the session table?', 'Postgres', 'SQLite', 'Ask the author',
    '#455', '#178', '#620', 'blocked by 2', 'from plan #558', '#601', 'building', '3/4 checks', '€1.72', 'near its budget', 'Reading internal/console/board.go',
    '#598', '#611', 'planning', '#612', 'verifying', '4/4 checks', '#609', 'merge queue', '#490', '#616', '#610', '#607', 'failed', '#608', '#604', '#599', 'closed', '#597',
    'project agent', 'New conversation', 'Why is #603 waiting?', 'read card #603', 'Do it', 'Skip', 'Send', 'own conversation'],
  idle: ['idle', '0 working', '0 need you', '€144.16', 'Factory is idle', '#455', '#178', 'queued', 'Done'],
  fire: ['#538', 'Grant one session', 'nothing for 40 min', 'waiting on the model provider', '€1.95', '#535', 'failed'],
};
(async () => {
  const browser = await chromium.launch();
  const fails = [];
  for (const [sc, words] of Object.entries(mustHave)) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(url('scenario=' + sc + '&theme=dark')); await p.waitForTimeout(500);
    const text = await p.evaluate(() => document.body.innerText + ' ' + Array.from(document.querySelectorAll('[aria-label],[title],[placeholder]')).map(e => (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '') + ' ' + (e.getAttribute('placeholder') || '')).join(' '));
    const low = text.toLowerCase(); for (const w of words) if (!low.includes(w.toLowerCase())) fails.push(`${sc}: missing "${w}"`);
    if (errors.length) fails.push(`${sc}: JS error ${errors[0]}`);
    if (sc === 'busy') {
      const theme0 = await p.evaluate(() => document.documentElement.dataset.theme);
      const tt = p.locator('#theme-toggle, [data-theme-toggle], button[aria-label*="theme" i]').first();
      if (!await tt.count()) fails.push('busy: no theme toggle (#theme-toggle)'); else { await tt.click(); await p.waitForTimeout(200);
        if (await p.evaluate(() => document.documentElement.dataset.theme) === theme0) fails.push('busy: theme toggle does not change data-theme'); }
      const card = p.locator('[data-card="601"]').first();
      if (!await card.count()) fails.push('busy: no [data-card="601"]'); else {
        const open = card.locator('[data-open], a, button').first(); await open.click(); await p.waitForTimeout(400);
        const d = p.locator('[role="dialog"]:visible, #drawer:visible, .drawer:visible').first();
        if (!await d.count()) fails.push('busy: clicking the card title does not open a visible drawer/dialog');
        else { const dt = await d.innerText(); for (const w of ['Overview', 'Chat', 'Activity', 'Files', 'Session 2', 'coding-cheap']) if (!dt.includes(w)) fails.push(`drawer: missing "${w}"`);
          const box = await d.boundingBox(); if (box && box.x + box.width < 1430) fails.push('drawer: not docked at the right edge'); 
          await p.keyboard.press('Escape'); await p.waitForTimeout(300); if (await d.isVisible().catch(() => false)) fails.push('drawer: Escape does not close it'); }
      }
      const doit = p.locator('button:has-text("Do it")').first();
      if (await doit.count()) { await doit.click(); await p.waitForTimeout(300); const t2 = await p.evaluate(() => document.body.innerText); if (!/applied/i.test(t2) || !/undo/i.test(t2)) fails.push('chat: Do it does not become an applied line with undo'); }
      const ta = p.locator('textarea').first();
      if (!await ta.count()) fails.push('chat: no textarea'); else { await ta.fill('ping'); await ta.press('Enter'); await p.waitForTimeout(1500); const t3 = await p.evaluate(() => document.body.innerText); if (!t3.includes('ping')) fails.push('chat: Enter does not send the message'); }
      const sw = await p.evaluate(() => document.body.scrollWidth); if (sw > 1440) fails.push(`busy: horizontal page scroll at 1440 (${sw})`);
    }
    await p.close();
  }
  const ph = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await ph.goto(url('scenario=busy&theme=dark')); await ph.waitForTimeout(500);
  const sw = await ph.evaluate(() => document.body.scrollWidth); if (sw > 390) fails.push(`phone: horizontal scroll at 390 (${sw})`);
  const order = await ph.evaluate(() => { const c = document.querySelector('#chat, .chat, [data-region="chat"]'); const b = document.querySelector('#board, .board, [data-region="board"]'); return c && b ? [c.getBoundingClientRect().top, b.getBoundingClientRect().top] : null; });
  if (!order) fails.push('phone: no #chat/#board regions (or data-region)'); else if (order[0] > order[1]) fails.push('phone: the board sits above the chat');
  await ph.close(); await browser.close();
  if (fails.length) { console.log(fails.join('\n')); process.exit(1); } console.log('ok: every control present, mechanics work');
})();
