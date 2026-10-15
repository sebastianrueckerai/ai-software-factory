// The wiki variant's saved states: one shot per state in shots/ (1440 by 900 and dark unless named) and a check of each.
// Usage, from this directory:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node states.js
// One line per failure and `ok states` at the end: a state's exact string missing, the path line's dot present or
// absent against the state, a page error, a doc- text pair under 4.5:1.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const PLAN = 'docs/plans/2026-10-15-backlog-pull-and-close-out.md';
const D = 'scenario=busy&doc=docs/roadmap.md';
const url = (q) => 'file://' + path.join(__dirname, 'index.html') + '?' + q;

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

const text = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const sha = (page, p = 'docs/roadmap.md') => page.evaluate((x) => DOCS.files[x].sha, p);
const edit = async (page) => { await page.locator('[data-mode="edit"]').first().click(); await page.waitForTimeout(150); };
// the caret at the end of the roadmap's first paragraph: "after" starts a new paragraph there, "into" extends that paragraph
async function type(page, where = 'after') {
  await page.locator('#doc-editor').evaluate((e) => { const i = e.value.indexOf('\n\n## How to read'); e.focus(); e.setSelectionRange(i, i); });
  await page.keyboard.type(where === 'after' ? '\n\nA line jotted in the prototype.' : ' Sebastian reads it first thing in the morning.', { delay: 2 });
}
const save = async (page, wait = 300) => { await page.keyboard.press('Control+s'); await page.waitForTimeout(wait); };

// each state: [name, query, width, height, steps, check]; check returns the failures as strings
const has = (got, want, where) => got != null && got.includes(want) ? [] : [`${where} reads "${got}", not "${want}"`];
const unsaved = async (p) => { await edit(p); await type(p); };
const merged = async (p) => { await edit(p); await type(p); await p.waitForTimeout(1400); };
const refused = async (p) => { await edit(p); await type(p, 'into'); await p.waitForTimeout(1400); await save(p); };
const refusedCheck = async (p, before) => [
  ...has(before, '● docs/roadmap.md not saved: Sebastian changed the same lines (14:08) · show theirs · load theirs', 'the path line before show theirs'),
  ...(await p.evaluate(() => { const c = document.querySelector('.doc-theirs .doc-clash'); return c && /This file is where the factory keeps the work it has not done yet\./.test(c.textContent) && / 2px 0px 0px 0px inset/.test(getComputedStyle(c).boxShadow); }) ? [] : ['their version shows no clashing line with the 2 px amber rule']),
];
const left = async (p) => { await unsaved(p); await p.locator(`.doc-pin[data-doc="${PLAN}"]`).click(); await p.waitForTimeout(250); };
const leftCheck = async (p) => [
  ...has(await text(p, '#doc-reopen'), '● Documents', 'the Documents button'),
  ...has(await text(p, '#doc-state'), PLAN, 'the path line'),
  ...(await p.evaluate(() => { const b = document.querySelector('#doc-reopen'), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && e.closest('#doc-reopen'); }) ? [] : ['the Documents button is covered']),
];
const S = [
  ['state-clean', D, 1440, 900, null, true, async (p) => has(await text(p, '#doc-state'), `docs/roadmap.md ${await sha(p)} · 11:20`, 'the path line')],
  ['state-unsaved', D, 1440, 900, unsaved, false, async (p) => has(await text(p, '#doc-state'), '● docs/roadmap.md', 'the path line')],
  ['state-saving', D + '&slow=1', 1440, 900, async (p) => { await unsaved(p); await save(p, 600); }, false, async (p) => has(await text(p, '#doc-state'), '● docs/roadmap.md · saving…', 'the path line')],
  ['state-saved', D + '&slow=1', 1440, 900, async (p) => { await unsaved(p); await save(p, 2100); }, true, async (p) => [
    ...has(await text(p, '#doc-state'), `docs/roadmap.md Saved: ${await sha(p)} on master · 14:12`, 'the path line'),
    ...has(await text(p, '#doc-view article'), 'A line jotted in the prototype.', 'the rendered text'),
  ]],
  ['state-failed', D + '&offline=1', 1440, 900, async (p) => { await unsaved(p); await save(p); }, false, async (p) => has(await text(p, '#doc-state'), '● docs/roadmap.md not saved: Forgejo not reachable · retry', 'the path line')],
  ['state-structure', D + '&structure=1', 1440, 900, async (p) => { await unsaved(p); await save(p); }, false, async (p) => has(await text(p, '#doc-state'), '● docs/roadmap.md not saved: item 267 appears twice · fix and save again', 'the path line')],
  ['state-changed-read', D + '&changed=read', 1440, 900, async (p) => { await p.waitForTimeout(1400); }, true, async (p) => [
    ...has(await text(p, '#doc-note'), 'changed by the project agent 14:08 · reload', 'the line under the head'),
    ...(/never breaks/.test(await text(p, '#doc-view article')) ? ['the text changed by itself'] : []),
  ]],
  ['state-changed-edit', D + '&changed=edit', 1440, 900, merged, false, async (p) => has(await text(p, '#doc-note'), 'changed by Sebastian 14:08 · your save will merge · load theirs', 'the line under the head')],
  ['state-load-theirs', D + '&changed=edit', 1440, 900, async (p) => { await merged(p); await p.locator('#doc-note [data-act="load-theirs"]').click(); await p.waitForTimeout(150); }, false,
    async (p) => has(await text(p, '#doc-note'), 'Discard your changes and load the version of 14:08? Load Keep mine', 'the confirm')],
  ['state-merged', D + '&changed=edit', 1440, 900, async (p) => { await merged(p); await save(p, 400); }, true, async (p) => [
    ...has(await text(p, '#doc-state'), `docs/roadmap.md saved, merged with Sebastian's change · ${await sha(p)} · 14:12`, 'the path line'),
    ...has(await text(p, '#doc-view article'), 'A line jotted in the prototype.', 'the merged text'),
    ...has(await text(p, '#doc-view article'), 'An item keeps its number for life, so a link to it never breaks.', 'the merged text'),
  ]],
  ['state-refused', D + '&changed=same', 1440, 900, refused, false, refusedCheck, true],
  // Recent drops over the pins, so its dot gets a shot of its own
  ['state-draft-left', D, 1440, 900, left, true, async (p) => [...await leftCheck(p), ...has(await text(p, '.doc-pin[data-doc="docs/roadmap.md"]'), '● roadmap', 'the roadmap pin')]],
  ['state-draft-left-recent', D, 1440, 900, async (p) => { await left(p); await p.locator('.doc-recent-btn').click(); await p.waitForTimeout(150); }, true,
    async (p) => [...await leftCheck(p), ...has(await text(p, '.doc-recent-row[data-doc="docs/roadmap.md"] .doc-recent-label'), '● roadmap', 'the roadmap row in Recent')]],
  ['state-restored', D + '&draft=1', 1440, 900, null, false, async (p) => [
    ...has(await text(p, '#doc-note'), 'draft from 14:05 restored · discard', 'the line under the head'),
    ...has(await p.locator('#doc-editor').inputValue().catch(() => null), 'A line jotted earlier.', 'the editor'),
  ]],
  ['state-discard', D + '&draft=1', 1440, 900, async (p) => { await p.locator('#doc-note [data-act="discard"]').click(); await p.waitForTimeout(150); }, false,
    async (p) => has(await text(p, '#doc-note'), 'Discard your changes? Discard Keep', 'the confirm')],
  ['state-new', D, 1440, 900, async (p) => {
    await p.locator('[data-act="new"]').click(); await p.waitForTimeout(150); await p.locator('input.doc-name').fill('Goal');
    await p.locator('.doc-new button[type="submit"]').click(); await p.waitForTimeout(250);
  }, false, async (p) => [
    ...has(await text(p, '#doc-state'), '● docs/goal.md', 'the path line'),
    ...has(await p.locator('#doc-editor').inputValue().catch(() => null), '# Goal', 'the editor'),
  ]],
  ['state-unsaved-light', D + '&theme=light', 1440, 900, unsaved, false, async (p) => has(await text(p, '#doc-state'), '● docs/roadmap.md', 'the path line')],
  ['state-refused-light', D + '&changed=same&theme=light', 1440, 900, refused, false, refusedCheck, true],
  ['phone-state-unsaved-390', D, 390, 844, unsaved, false, async (p) => has(await text(p, '#doc-state'), '● docs/roadmap.md', 'the path line')],
  ['phone-state-changed-edit-390', D + '&changed=edit', 390, 844, merged, false, async (p) => has(await text(p, '#doc-note'), 'changed by Sebastian 14:08 · your save will merge · load theirs', 'the line under the head')],
];

(async () => {
  const browser = await chromium.launch();
  const dir = path.join(__dirname, 'shots'); fs.mkdirSync(dir, { recursive: true });
  let bad = 0;
  const fail = (n, s) => { console.log(`${n}: ${s}`); bad++; };
  for (const [name, q, w, h, steps, clean, check, theirs] of S) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(url(q + (/theme=/.test(q) ? '' : '&theme=dark')));
    await page.waitForTimeout(350);
    if (steps) await steps(page);
    const before = theirs ? await text(page, '#doc-state') : null;
    if (theirs) { await page.locator('#doc-state [data-act="theirs"]').click(); await page.waitForTimeout(200); }
    for (const f of await check(page, before)) fail(name, f);
    const dot = await page.locator('#doc-state .doc-dot').isVisible().catch(() => false);
    if (dot === clean) fail(name, clean ? 'the path line shows the dot of unsaved changes' : 'the path line has no dot');
    if (w < 400 && await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) fail(name, 'horizontal scroll');
    for (const [cls, r, txt] of await page.evaluate(contrast)) if (r < 4.5) fail(name, `${cls} at ${r}:1 ("${txt}")`);
    if (errs.length) fail(name, `page error: ${errs[0]}`);
    await page.screenshot({ path: path.join(dir, name + '.png') });
    await page.close();
  }
  await browser.close();
  if (!bad) console.log('ok states');
  process.exit(bad ? 1 : 0);
})();
