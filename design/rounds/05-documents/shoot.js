// Screenshots of the round's variants. Usage, from this directory:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node shoot.js [variant...]
// Each shot is [name, query, width, height, fullPage, action]. Actions: follow clicks the roadmap's link to the
// backlog plan; back follows then goes back; edit opens the editor; save edits, types a line and saves; wide presses
// Wide; new presses New document; hover rests the pointer on the plan's link; card opens a card's drawer over the
// open document.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const V = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(__dirname).filter(d => fs.existsSync(path.join(__dirname, d, 'index.html')));
const PLAN = 'docs/plans/2026-10-15-backlog-pull-and-close-out.md';
const D = 'scenario=busy&doc=docs/roadmap.md';
const shots = [
  ['roadmap-dark-1440', D + '&theme=dark', 1440, 900],
  ['roadmap-light-1440', D + '&theme=light', 1440, 900],
  ['plan-dark-1440', D + '&theme=dark', 1440, 900, false, 'follow'],
  ['back-dark-1440', D + '&theme=dark', 1440, 900, false, 'back'],
  ['hover-dark-1440', D + '&theme=dark', 1440, 900, false, 'hover'],
  ['edit-dark-1440', D + '&theme=dark', 1440, 900, false, 'edit'],
  ['saved-dark-1440', D + '&theme=dark', 1440, 900, false, 'save'],
  ['refused-light-1440', D + '&theme=light&conflict=1', 1440, 900, false, 'save'],
  ['wide-dark-1440', D + '&theme=dark', 1440, 900, false, 'wide'],
  ['new-light-1440', D + '&theme=light', 1440, 900, false, 'new'],
  ['card-dark-1440', D + '&theme=dark', 1440, 900, false, 'card'],
  ['roadmap-dark-1920', D + '&theme=dark', 1920, 1080],
  ['six-dark-1440', D + '&theme=dark&open=docs/layers.md,docs/architecture.md,docs/plans/2026-10-13-main-chat-docs.md,docs/board/roadmap.md,docs/target-architecture.md', 1440, 900],
  ['phone-roadmap-dark-390', D + '&theme=dark', 390, 844, true],
  ['phone-plan-light-390', D + '&theme=light', 390, 844, false, 'follow'],
  ['phone-edit-dark-390', D + '&theme=dark', 390, 844, false, 'edit'],
];
async function vis(page, sel) { const l = page.locator(sel).first(); return (await l.count()) > 0 && await l.isVisible(); }
async function act(page, a) {
  const link = page.locator(`#doc-view article [data-doc="${PLAN}"]`).first();
  if (a === 'follow' || a === 'back') { await link.click(); await page.waitForTimeout(300); }
  if (a === 'back') {
    if (await vis(page, '[data-nav="back"]')) await page.locator('[data-nav="back"]').first().click();
    else { const alt = page.locator('.doc-tab[data-doc="docs/roadmap.md"], .doc-crumb[data-doc="docs/roadmap.md"], .doc-pin[data-doc="docs/roadmap.md"], #doc-tree [data-doc="docs/roadmap.md"], .doc-pane [data-doc="docs/roadmap.md"]').first(); if (await alt.count() && await alt.isVisible()) await alt.click(); else await page.goBack(); }
  }
  if (a === 'hover') { await link.hover(); await page.waitForTimeout(700); }
  if (a === 'edit' || a === 'save') { await page.locator('[data-mode="edit"]').first().click(); await page.waitForTimeout(200); }
  if (a === 'save') { const ed = page.locator('#doc-editor'); await ed.fill((await ed.inputValue()) + '\n\nA line jotted in the prototype.\n'); await page.locator('[data-act="save"]').first().click(); }
  if (a === 'wide') await page.locator('[data-act="wide"]').first().click();
  if (a === 'new') { await page.locator('[data-act="new"]').first().click(); await page.waitForTimeout(150); if (await vis(page, 'input.doc-name')) await page.locator('input.doc-name').fill('Goal'); }
  if (a === 'card') { const c = page.locator('[data-card]').first(); if (await c.count()) await c.click({ force: true }); }
  await page.waitForTimeout(350);
}
(async () => {
  const browser = await chromium.launch();
  for (const v of V) {
    const dir = path.join(__dirname, v, 'shots'); fs.mkdirSync(dir, { recursive: true });
    for (const [name, q, w, h, full, a] of shots) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
      await page.goto('file://' + path.join(__dirname, v, 'index.html') + '?' + q);
      await page.waitForTimeout(400);
      if (a) await act(page, a);
      await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: !!full });
      await page.close();
    }
    console.log(`shot ${v}: ${shots.length} files in ${v}/shots`);
  }
  await browser.close();
})();
