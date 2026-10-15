// Mechanics and measurement of the round's variants. Usage, from this directory:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node check.js [variant...]
// Exit 1 and one line per failure: a page error in any theme, the document view missing or without the roadmap,
// a link in the text that does not open its target, no way back to the roadmap, the chat hidden or overlapped,
// the edit mode without the editor, a save without its line, an armed conflict without its refusal, Wide covering
// the chat, New without its form, a doc- text pair under 4.5:1 in either theme, a horizontal scroll at 390,
// a phone button under 44 px.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const V = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(__dirname).filter(d => fs.existsSync(path.join(__dirname, d, 'index.html')));
const url = (v, q) => 'file://' + path.join(__dirname, v, 'index.html') + '?' + q;
const PLAN = 'docs/plans/2026-10-15-backlog-pull-and-close-out.md';

const contrast = `(() => {
  const lum = (c) => { let m = c.match(/[\\d.]+/g).map(Number); if (/^color\\(srgb/.test(c)) m = m.map((v, i) => i < 3 ? v * 255 : v); const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return [0.2126 * r + 0.7152 * g + 0.0722 * b, m[3] === undefined ? 1 : m[3]]; };
  const bgOf = (el) => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; const [l, a] = lum(c); if (a >= 0.99) return l; e = e.parentElement; } return lum(getComputedStyle(document.body).backgroundColor)[0]; };
  const out = [];
  for (const el of document.querySelectorAll('[class*="doc-"], #doc-view')) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const [fl] = lum(getComputedStyle(el).color); const bl = bgOf(el);
    const r = (Math.max(fl, bl) + 0.05) / (Math.min(fl, bl) + 0.05);
    out.push([el.className.toString().split(' ').find(c => c.startsWith('doc-')) || el.id || el.tagName, Math.round(r * 10) / 10, el.textContent.trim().slice(0, 40)]);
  }
  return out;
})()`;

async function visible(page, sel) { const l = page.locator(sel).first(); return (await l.count()) > 0 && await l.isVisible(); }
async function box(page, sel) { const l = page.locator(sel).first(); return (await l.count()) ? l.boundingBox() : null; }
async function goBack(page) {
  if (await visible(page, '[data-nav="back"]')) { await page.locator('[data-nav="back"]').first().click(); return 'data-nav'; }
  const alt = page.locator('.doc-tab[data-doc="docs/roadmap.md"], .doc-crumb[data-doc="docs/roadmap.md"], .doc-pin[data-doc="docs/roadmap.md"], #doc-tree [data-doc="docs/roadmap.md"], .doc-recent [data-doc="docs/roadmap.md"], .doc-pane [data-doc="docs/roadmap.md"]').first();
  if (await alt.count() && await alt.isVisible()) { await alt.click(); return 'element'; }
  await page.goBack(); return 'browser';
}

(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  const fail = (v, s) => { console.log(`${v}: ${s}`); bad++; };
  for (const v of V) {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errs = []; page.on('pageerror', e => errs.push(e.message));
      await page.goto(url(v, `scenario=busy&theme=${theme}&doc=docs/roadmap.md`));
      await page.waitForTimeout(300);
      if (errs.length) fail(v, `${theme}: page error: ${errs[0]}`);
      if (!await visible(page, '#doc-view')) { fail(v, `${theme}: #doc-view not visible with ?doc=docs/roadmap.md`); await page.close(); continue; }
      const t = await page.locator('#doc-view').innerText();
      if (!/docs\/roadmap\.md/.test(t)) fail(v, `${theme}: the view does not name docs/roadmap.md`);
      if (!/The project screen and members/.test(t)) fail(v, `${theme}: the roadmap's section is not rendered`);
      const chat = await box(page, '#chat'), dv = await box(page, '#doc-view');
      if (!chat || chat.width < 300) fail(v, `${theme}: the chat is hidden or under 300 px wide`);
      if (chat && dv && dv.x < chat.x + chat.width - 2 && dv.y < chat.y + chat.height) fail(v, `${theme}: the document view overlaps the chat`);
      // follow a link in the text
      const link = page.locator(`#doc-view article [data-doc="${PLAN}"]`).first();
      if (!await link.count()) fail(v, `${theme}: no link to the backlog plan in the rendered roadmap`);
      else {
        await link.click(); await page.waitForTimeout(250);
        const t2 = await page.locator('#doc-view').innerText();
        if (!/Plan: the backlog pull and the close-out/.test(t2)) fail(v, `${theme}: the plan did not open from its link`);
        const how = await goBack(page); await page.waitForTimeout(250);
        const t3 = await page.locator('#doc-view').innerText();
        if (!/The project screen and members/.test(t3)) fail(v, `${theme}: no way back to the roadmap (tried ${how})`);
      }
      if (theme === 'dark') {
        // edit and save
        await page.locator('[data-mode="edit"]').first().click(); await page.waitForTimeout(150);
        if (!await visible(page, '#doc-editor')) fail(v, 'edit mode shows no #doc-editor');
        else {
          const val = await page.locator('#doc-editor').inputValue();
          if (!/# Roadmap/.test(val)) fail(v, 'the editor does not hold the roadmap source');
          await page.locator('#doc-editor').fill(val + '\n\nA line jotted in the prototype.\n');
          await page.locator('[data-act="save"]').first().click(); await page.waitForTimeout(250);
          if (!await visible(page, '.doc-saved')) fail(v, 'a save shows no .doc-saved line');
          else if (!/Saved: [0-9a-f]{7} on master/.test(await page.locator('.doc-saved').first().innerText())) fail(v, 'the saved line does not name a commit on master');
          if (!/A line jotted/.test(await page.locator('#doc-view').innerText())) fail(v, 'the saved text is not rendered');
        }
        // wide
        if (await visible(page, '[data-act="wide"]')) {
          await page.locator('[data-act="wide"]').first().click(); await page.waitForTimeout(250);
          const c2 = await box(page, '#chat'), d2 = await box(page, '#doc-view');
          if (c2 && d2 && d2.x < c2.x + c2.width - 2) fail(v, 'Wide covers the chat');
          if (d2 && d2.width < 700) fail(v, `Wide is only ${Math.round(d2.width)} px wide`);
          if (await visible(page, '[data-act="narrow"]')) { await page.locator('[data-act="narrow"]').first().click(); await page.waitForTimeout(150); }
        } else fail(v, 'no Wide button');
        // new
        await page.locator('[data-act="new"]').first().click(); await page.waitForTimeout(150);
        if (!await visible(page, 'input.doc-name')) fail(v, 'New document shows no name input');
        else await page.keyboard.press('Escape');
        // the card drawer still opens
        const card = page.locator('[data-card]').first();
        if (await card.count()) { await card.click({ force: true }); await page.waitForTimeout(250); if (!await visible(page, '#drawer')) fail(v, 'a card no longer opens the drawer while a document is open'); await page.keyboard.press('Escape'); }
      }
      for (const [cls, r, txt] of await page.evaluate(contrast)) if (r < 4.5) fail(v, `${theme}: ${cls} at ${r}:1 ("${txt}")`);
      await page.close();
    }
    // the armed conflict
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(url(v, 'scenario=busy&theme=light&doc=docs/roadmap.md&conflict=1')); await page.waitForTimeout(300);
      await page.locator('[data-mode="edit"]').first().click(); await page.waitForTimeout(150);
      await page.locator('[data-act="save"]').first().click(); await page.waitForTimeout(250);
      if (!await visible(page, '.doc-refused')) fail(v, 'an armed conflict shows no .doc-refused line');
      else if (!/changed since you opened it/.test(await page.locator('.doc-refused').first().innerText())) fail(v, 'the refusal does not say the file changed');
      if (!await visible(page, '#doc-editor')) fail(v, 'the refusal lost the editor');
      for (const [cls, r, txt] of await page.evaluate(contrast)) if (r < 4.5) fail(v, `conflict: ${cls} at ${r}:1 ("${txt}")`);
      await page.close();
    }
    // the phone
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(url(v, 'scenario=busy&theme=dark&doc=docs/roadmap.md')); await page.waitForTimeout(300);
      if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) fail(v, 'phone: horizontal scroll');
      if (!await visible(page, '#doc-view')) fail(v, 'phone: #doc-view not visible');
      const small = await page.evaluate(() => [...document.querySelectorAll('#doc-view button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44 && b.getBoundingClientRect().height > 0).map(b => b.textContent.trim().slice(0, 20) || b.getAttribute('aria-label')));
      if (small.length) fail(v, `phone: buttons under 44 px: ${small.join(', ')}`);
      if (await visible(page, '[data-act="wide"]')) fail(v, 'phone: a Wide button');
      await page.close();
    }
    if (!bad) console.log(`ok ${v}`);
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
