// node demo/video/poster.js <name>... screenshots the static poster page demo/video/<name>/index.html to demo/out/<name>.png
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  for (const name of process.argv.slice(2)) {
    await page.goto("file://" + path.join(__dirname, name, "index.html"));
    await page.screenshot({ path: path.join(__dirname, "..", "out", `${name}.png`), animations: "disabled" });
  }
  await browser.close();
})();
