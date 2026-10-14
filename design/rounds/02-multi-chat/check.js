// Mechanics and measurement of the round's variants. Usage, from this directory:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node check.js
// Exit 1 and one line per failure: a page error, a word missing, a badge that does not clear or count, a working mark missing,
// a poke or an escalation whose choice does not answer, an archive that does not hide or a restore that does not bring back,
// a delete warning that does not name the member, the thread and the count, a command that is not a message, a level change
// without a confirm, a text pair under 4.5:1 in either theme, a horizontal scroll at 390, a phone target under 44 px.
const { chromium } = require('playwright');
const path = require('path');
const V = process.argv.slice(2).length ? process.argv.slice(2) : ['rail', 'instrument', 'messenger'];
const url = (v, q) => 'file://' + path.join(__dirname, v, 'index.html') + '?' + q;
const text = (p) => p.evaluate(() => document.body.innerText);
const title = (p) => p.evaluate(() => document.title);
const openTitle = (p) => p.evaluate(() => document.querySelector('.thead .ttl').textContent.trim());
const CONTRAST_EL = '.trow .ttitle, .trow .tat, .tarch-l, .tarch summary, .trow.arch .ttitle, .restore, .badge, .thint, .decider, .esc-l, .answer-l, .answer-or, .cmd, .palette button span, .palette button b, #level-btn, .lvlpop b, .lvlpop .lw, .lvlpop .lp-head span, .lvl-confirm p, .tline, .msg.sum .txt, .archived-note, .msg.poke .who, .thead .ttl, .thr span, .cell.lamps .lbl, .tacts .btn, .tmenu button, .overlay-box p, .overlay-box h2, .btn-choice, .btn-danger';

(async () => {
  const browser = await chromium.launch();
  const fails = [];
  const open = async (v, q, w, h) => {
    const p = await browser.newPage({ viewport: { width: w || 1440, height: h || 900 } }); p.setDefaultTimeout(4000);
    const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(url(v, q)); await p.waitForTimeout(400);
    return { p, errors };
  };
  const act = async (p, what) => { // the thread's actions: a menu in rail and messenger, text buttons in instrument
    const m = p.locator('.tmenu-btn'); if (await m.count()) { await m.click(); await p.waitForTimeout(150); }
    await p.locator('[data-tmenu="' + what + '"]').click(); await p.waitForTimeout(250);
  };
  const setLevel = async (p, l) => { await p.locator('#level-btn').click(); await p.waitForTimeout(150); await p.locator('.lvlpop [data-lvl="' + l + '"]').click(); await p.waitForTimeout(250); };
  process.on('unhandledRejection', (e) => { console.log(fails.join('\n')); console.log('CRASH', e.message.split('\n').slice(0, 4).join(' / ')); process.exit(1); });
  for (const v of V) {
    console.log('checking', v);
    // the words and the shell
    const s = await open(v, 'scenario=busy&theme=dark'); const p = s.p;
    if (s.errors.length) fails.push(v + ': JS error ' + s.errors[0]);
    const fold = p.locator('.tarch summary'); if (await fold.count()) { await fold.click(); await p.waitForTimeout(100); }
    await p.locator('#level-btn').click(); await p.waitForTimeout(100);
    if ((await p.locator('.lvlpop [data-lvl]').count()) !== 4) fails.push(v + ': the level control does not list the four levels');
    if ((await p.locator('.lvlpop .lw').count()) !== 4) fails.push(v + ': the levels lack their words');
    const t0 = await text(p);
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    if (await p.locator('.lvlpop').isVisible()) fails.push(v + ': Escape does not close the level menu');
    for (const w of ['Needs you', 'Queued', 'In progress', 'Done', 'Merge PR #612', 'Inbox', 'Plan: the members page', 'Session store: Postgres', 'Costs read: the date window', 'Export in pull request mode', 'restore', '/compact', '/new', 'New', 'manual', 'assisted', 'autonomous', 'full auto'])
      if (!t0.includes(w)) fails.push(v + ': missing "' + w + '"');
    if (await p.locator('#ticker').count()) fails.push(v + ': the ticker is still there (C12)');
    if (await p.locator('#accent').count()) fails.push(v + ': the accent filter is still there (C11)');
    // the badge: on the row and in the title; opening clears; the inbox's pokes carry choices that answer
    if ((await title(p)) !== '(2) Factory console') fails.push(v + ': the title does not carry the 2 unread (' + (await title(p)) + ')');
    if ((await p.locator('.trow.inbox .badge').textContent()) !== '2') fails.push(v + ': the inbox row has no badge 2');
    const first = await p.locator('#switcher .trow').first().getAttribute('data-thread'); if (first !== 'inbox') fails.push(v + ': the inbox is not the first row (' + first + ')');
    await p.locator('.trow.inbox').click(); await p.waitForTimeout(200);
    if ((await title(p)) !== 'Factory console') fails.push(v + ': opening the inbox does not clear the title');
    if (await p.locator('.trow.inbox .badge').count()) fails.push(v + ': opening the inbox does not clear its badge');
    if (!(await openTitle(p)).includes('Inbox')) fails.push(v + ': the inbox does not open');
    if ((await p.locator('.msg.poke').count()) < 2) fails.push(v + ': the inbox shows fewer than 2 pokes');
    if ((await p.locator('.msg.poke .btn-choice').count()) < 3) fails.push(v + ': the poke has no choices');
    await p.locator('.msg.poke .btn-choice', { hasText: 'Approve' }).click(); await p.waitForTimeout(200);
    if (!(await text(p)).includes('answered “Approve”')) fails.push(v + ': the poke choice does not answer');
    // archive hides and keeps; the archived thread is read-only; restore brings back
    await p.locator('[data-thread="session-store"]').first().click(); await p.waitForTimeout(200);
    await act(p, 'archive');
    if (!(await p.locator('.tarch [data-thread="session-store"]').count())) fails.push(v + ': archive does not move the thread under archived');
    if ((await openTitle(p)).includes('Session store')) fails.push(v + ': the archived thread stays open');
    const sum = p.locator('.tarch summary'); if (await sum.count()) { await sum.click(); await p.waitForTimeout(100); }
    await p.locator('.tarch [data-thread="session-store"]').click(); await p.waitForTimeout(200);
    if (await p.locator('#chat-input').count()) fails.push(v + ': an archived thread has a text box');
    if (!(await text(p)).includes('archived')) fails.push(v + ': the archived thread does not say so');
    await p.locator('[data-restore="session-store"]:visible').first().click(); await p.waitForTimeout(200);
    if (!(await p.locator('#chat-input').count())) fails.push(v + ': restore does not bring the text box back');
    if (await p.locator('.tarch [data-thread="session-store"]').count()) fails.push(v + ': restore leaves the thread under archived');
    // delete is hard: the warning names the member, the thread and the count; keep keeps, delete deletes, one event in the inbox
    await p.locator('[data-thread="costs"]').first().click(); await p.waitForTimeout(200);
    await act(p, 'delete');
    const d = await p.locator('#dialog').textContent().catch(() => '');
    for (const w of ['Delete “Costs read: the date window”?', '2 messages', 'hard delete', 'name you, the thread and the count']) if (!d.includes(w)) fails.push(v + ': the delete warning lacks "' + w + '"');
    await p.locator('[data-dlg="close"]').click(); await p.waitForTimeout(200);
    if (await p.locator('#dialog').count()) fails.push(v + ': Keep it does not close the warning');
    if (!(await p.locator('[data-thread="costs"]').count())) fails.push(v + ': Keep it deleted the thread');
    await act(p, 'delete'); await p.locator('[data-dlg="delete"]').click(); await p.waitForTimeout(200);
    if (await p.locator('[data-thread="costs"]').count()) fails.push(v + ': delete leaves the thread');
    await p.locator('.trow.inbox').click(); await p.waitForTimeout(200);
    if (!(await text(p)).includes('Deleted the thread “Costs read: the date window” (2 messages)')) fails.push(v + ': no event names the deleted thread');
    // the commands: "/" opens the palette, Enter runs the chosen one; /compact leaves a summary and the last two turns; /new opens a thread
    await p.locator('[data-thread="session-store"]').first().click(); await p.waitForTimeout(200);
    await p.locator('#chat-input').click(); await p.keyboard.type('/'); await p.waitForTimeout(150);
    if (!(await p.locator('#palette').isVisible())) fails.push(v + ': "/" does not open the palette');
    if ((await p.locator('#palette [role="option"]').count()) !== 2) fails.push(v + ': the palette does not list the two commands');
    await p.keyboard.type('comp'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    if (!(await p.locator('.msg.sum').count())) fails.push(v + ': /compact leaves no summary');
    if ((await p.locator('#chat-log .msg').count()) !== 3) fails.push(v + ': /compact does not keep the summary and the last two turns (' + (await p.locator('#chat-log .msg').count()) + ')');
    if (await p.locator('#palette').isVisible()) fails.push(v + ': the palette stays open after the command');
    await p.locator('.cmd[data-cmd="/new"]').click(); await p.waitForTimeout(200);
    if ((await openTitle(p)) !== 'New thread') fails.push(v + ': /new does not open a new thread (' + (await openTitle(p)) + ')');
    await p.locator('#chat-input').fill('Plan the costs export'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
    if (!(await p.locator('#switcher .trow', { hasText: 'Plan the costs export' }).count())) fails.push(v + ': the first message does not name the new thread');
    // the level: a change confirms; keep keeps; set sets, and one poke lands in the inbox
    await setLevel(p, 'autonomous');
    const ld = await p.locator('#dialog').textContent().catch(() => '');
    for (const w of ['autonomy to autonomous?', 'policy change', 'audit']) if (!ld.includes(w)) fails.push(v + ': the level confirm lacks "' + w + '"');
    await p.locator('[data-dlg="close"]').click(); await p.waitForTimeout(200);
    const lvl = async () => p.evaluate(() => document.querySelector('#level-btn').dataset.level);
    if ((await lvl()) !== 'manual') fails.push(v + ': Keep does not keep the level (' + (await lvl()) + ')');
    await setLevel(p, 'autonomous'); await p.locator('[data-dlg="level"]').click(); await p.waitForTimeout(250);
    if ((await lvl()) !== 'autonomous') fails.push(v + ': Set does not set the level (' + (await lvl()) + ')');
    if (!(await p.locator('.trow.inbox .badge').count())) fails.push(v + ': the level change leaves no unread poke in the inbox');
    // Escape closes the palette and a dialog; Ctrl+k reaches the switcher
    await setLevel(p, 'manual'); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    if (await p.locator('#dialog').count()) fails.push(v + ': Escape does not close the confirm');
    await p.keyboard.press('Control+k'); await p.waitForTimeout(100);
    if (!(await p.evaluate(() => document.activeElement && document.activeElement.closest('#switcher') != null))) fails.push(v + ': Ctrl+k does not reach the switcher');
    await p.close();
    // threads: the working marks, the open thread, the order by last turn
    const th = await open(v, 'scenario=threads&theme=dark');
    if ((await th.p.locator('.trow .working').count()) < 2) fails.push(v + ': threads shows fewer than two working marks');
    if (!(await openTitle(th.p)).includes('Costs read')) fails.push(v + ': threads does not open the second thread');
    const order = await th.p.evaluate(() => Array.from(document.querySelectorAll('#switcher .trow[data-thread]')).map((e) => e.dataset.thread).join(','));
    if (!order.startsWith('inbox,costs,members,session-store')) fails.push(v + ': the rows are not by last turn (' + order + ')');
    if (!(await th.p.locator('.trow.inbox .badge').count())) fails.push(v + ': reading another thread cleared the inbox badge');
    // the fold: the rows keep their marks, the badge and the working dot; a mark still opens its thread; the phone shows one summary row
    await th.p.locator('[data-swtoggle]:visible').first().click(); await th.p.waitForTimeout(200);
    if (!(await th.p.locator('#chat.sw-collapsed').count())) fails.push(v + ': the fold toggle does not fold');
    const sw = await th.p.evaluate(() => document.querySelector('#switcher').getBoundingClientRect().width); if (sw > 40) fails.push(v + ': the folded switcher is ' + Math.round(sw) + ' px wide');
    if (await th.p.locator('#switcher .ttitle:visible').count()) fails.push(v + ': the folded switcher still shows titles');
    if (!(await th.p.locator('#switcher .trow.inbox .badge').isVisible())) fails.push(v + ': the folded switcher hides the inbox badge');
    if (!(await th.p.locator('#switcher .trow .tmark.working').first().isVisible())) fails.push(v + ': the folded switcher hides the working mark');
    await th.p.locator('#switcher .trow.inbox').click(); await th.p.waitForTimeout(200);
    if (!(await openTitle(th.p)).includes('Inbox')) fails.push(v + ': a folded mark does not open its thread');
    if (!(await th.p.locator('#chat.sw-collapsed').count())) fails.push(v + ': opening a thread unfolds');
    await th.p.locator('[data-swtoggle]:visible').first().click(); await th.p.waitForTimeout(200);
    if (await th.p.locator('#chat.sw-collapsed').count()) fails.push(v + ': the fold toggle does not unfold');
    const pf = await open(v, 'scenario=threads&theme=dark', 390, 844);
    await pf.p.locator('[data-swtoggle]:visible').first().click(); await pf.p.waitForTimeout(200);
    if (!(await pf.p.locator('.sw-sum').isVisible())) fails.push(v + ': the phone fold shows no summary row');
    const sumText = await pf.p.locator('.sw-sum').textContent(); if (!/1.*unread/.test(sumText) || !/2 working/.test(sumText)) fails.push(v + ': the phone summary lacks the counts (' + sumText.trim() + ')');
    if (await pf.p.locator('#switcher').isVisible()) fails.push(v + ': the phone fold leaves the list in view');
    await pf.p.close();
    await th.p.close();
    // poke: the fresh turn marks the row and the title while another thread is open
    const pk = await open(v, 'scenario=poke&theme=dark');
    if ((await title(pk.p)) !== '(1) Factory console') fails.push(v + ': poke does not mark the title');
    if ((await pk.p.locator('.trow.inbox .badge').textContent().catch(() => '')) !== '1') fails.push(v + ': poke does not badge the inbox row');
    if ((await openTitle(pk.p)).includes('Inbox')) fails.push(v + ': poke opens the inbox by itself');
    await pk.p.close();
    // assisted: the agent's own starts carry their decider
    const as = await open(v, 'scenario=assisted&theme=light');
    if ((await as.p.locator('.decider').count()) !== 2) fails.push(v + ': assisted does not show the two deciders');
    if (!(await text(as.p)).includes('assisted level · started by the agent')) fails.push(v + ': the decider does not name the level and the agent');
    await as.p.close();
    // escalation: the choices sit beside the text box, once; a choice answers and resolves the card
    const es = await open(v, 'scenario=escalation&theme=dark');
    if (!(await es.p.locator('.answer').count())) fails.push(v + ': no answer row beside the text box');
    if ((await es.p.locator('#chat .btn-choice').count()) !== 3) fails.push(v + ': the escalation shows its choices ' + (await es.p.locator('#chat .btn-choice').count()) + ' times, not 3');
    await es.p.locator('.answer .btn-choice', { hasText: 'Postgres' }).click(); await es.p.waitForTimeout(200);
    if (await es.p.locator('.answer').count()) fails.push(v + ': the answer row stays after the answer');
    if (!(await text(es.p)).includes('on #603')) fails.push(v + ': the answer does not resolve the card');
    await es.p.close();
    // the phone: one column, no horizontal scroll, 44 px targets for this round's controls
    for (const sc of ['busy', 'escalation']) {
      const ph = await open(v, 'scenario=' + sc + '&theme=dark', 390, 844);
      const sw = await ph.p.evaluate(() => document.documentElement.scrollWidth); if (sw > 390) fails.push(v + ': horizontal scroll at 390 in ' + sc + ' (' + sw + ')');
      const small = await ph.p.evaluate(() => Array.from(document.querySelectorAll('.trow, .btn-choice, .tmenu-btn, .tacts .btn, .cmd, .restore, #level-btn, .lvlpop [data-lvl], .open-arch, .swtg, .sw-sum')).filter((b) => b.offsetParent).map((b) => [b.className || b.id, b.getBoundingClientRect().height]).filter((x) => x[1] < 44));
      if (small.length) fails.push(v + ': phone targets under 44 px in ' + sc + ': ' + small.map((x) => x[0] + ' ' + Math.round(x[1])).join(', '));
      await ph.p.close();
    }
    // the contrast: every text pair of the new parts, both themes, measured on the rendered page
    for (const theme of ['dark', 'light']) for (const [sc, action] of [['busy', 'delete'], ['escalation', 'palette'], ['threads', 'level']]) {
      const c = await open(v, 'scenario=' + sc + '&theme=' + theme); const cp = c.p;
      if (action === 'delete') await act(cp, 'delete');
      if (action === 'palette') { await cp.locator('#chat-input').click(); await cp.keyboard.type('/'); await cp.waitForTimeout(100); }
      if (action === 'level') { await cp.locator('#level-btn').click(); await cp.waitForTimeout(100); }
      const low = await cp.evaluate((sel) => {
        const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
        const rgb = (s) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = s; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
        const over = (fg, bg) => fg.map((x, i) => i < 3 ? x * fg[3] + bg[i] * (1 - fg[3]) : 1);
        const lum = (c) => { const f = (x) => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
        const bgOf = (el) => { let layers = []; for (let e = el; e; e = e.parentElement) { const b = rgb(getComputedStyle(e).backgroundColor); if (b[3] > 0) { layers.push(b); if (b[3] >= 1) break; } } let out = [255, 255, 255, 1]; for (const l of layers.reverse()) out = over(l, out); return out; };
        const out = [];
        for (const el of document.querySelectorAll(sel)) {
          if (!el.offsetParent || !el.textContent.trim()) continue;
          const cs = getComputedStyle(el), fg = over(rgb(cs.color), bgOf(el)), bg = bgOf(el);
          const l1 = lum(fg), l2 = lum(bg), r = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
          const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
          if (r < (big ? 3 : 4.5)) out.push((el.className || el.tagName) + ' "' + el.textContent.trim().slice(0, 18) + '" ' + r.toFixed(2));
        }
        return out;
      }, CONTRAST_EL);
      if (low.length) fails.push(v + ' ' + theme + ' ' + sc + ': under 4.5:1: ' + low.join('; '));
      await cp.close();
    }
  }
  await browser.close();
  if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
  console.log('ok: the eight things work in the three variants, every pair reads, the phone is one column');
})();
