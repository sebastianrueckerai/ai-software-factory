// The hybrid's two-pane Wide: the dark shots at 1440 and 1920, the panes' widths and measure, the contrast in both themes. Usage, from the round folder:
//   NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node hybrid/extra.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const PLAN = 'docs/plans/2026-10-15-backlog-pull-and-close-out.md';
const url = (q) => 'file://' + path.join(__dirname, 'index.html') + '?' + q;
const contrast = fs.readFileSync(path.join(__dirname, '..', 'check.js'), 'utf8').match(/const contrast = `([\s\S]*?)`;/)[1].replace(/\\\\/g, '\\');
const measure = () => [...document.querySelectorAll('#doc-view .doc-pane')].map(p => {
  const s = p.querySelector('.doc-scroll'), b = p.querySelector('.doc-body'), para = [...b.querySelectorAll('p, li')].sort((x, y) => y.textContent.length - x.textContent.length)[0];
  const lines = Math.round(para.getBoundingClientRect().height / parseFloat(getComputedStyle(para).lineHeight));
  const ch = document.createElement('span'); ch.style.cssText = 'position:absolute;width:1ch'; b.appendChild(ch); const chPx = ch.getBoundingClientRect().width; ch.remove();
  return { pane: p.className.split(' ').pop(), pane_px: Math.round(p.getBoundingClientRect().width), text_px: Math.round(b.getBoundingClientRect().width), text_ch: Math.round(b.getBoundingClientRect().width / chPx), chars_per_line: Math.round(para.textContent.length / lines) };
});

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of [[1440, 900], [1920, 1080]]) for (const theme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(url(`scenario=busy&doc=docs/roadmap.md&theme=${theme}`));
    await page.waitForTimeout(400);
    await page.locator('[data-act="wide"]').click();
    await page.locator(`#doc-view article [data-doc="${PLAN}"]`).first().click();
    await page.waitForTimeout(400);
    if (theme === 'dark') await page.screenshot({ path: path.join(__dirname, 'shots', `wide-two-dark-${w}.png`) });
    const low = (await page.evaluate(contrast)).filter(([, r]) => r < 4.5);
    const view = await page.evaluate(() => Math.round(document.querySelector('#doc-view').getBoundingClientRect().width));
    console.log(`${w} ${theme}: view ${view} px`, JSON.stringify(await page.evaluate(measure)), low.length ? 'LOW ' + JSON.stringify(low) : 'contrast ok', errs.length ? 'ERR ' + errs[0] : '');
    await page.close();
  }
  await browser.close();
})();
