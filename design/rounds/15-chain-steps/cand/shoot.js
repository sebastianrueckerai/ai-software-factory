// shoot.js screenshots the round's candidates: every candidate in both
// themes, the drawer variant and the board variant, at 1440 and 390.
// Run with: node shoot.js   (NODE_PATH=/tmp/claude-1000/pw/node_modules)
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const here = __dirname;
const names = ["d1-table", "d2-block", "d3-section", "d4-face", "d5-open", "d6-lean"];
const shots = [
  ["", 1440, 900],        // the drawer open on the merged card
  ["", 390, 844],         // the phone: the drawer takes the screen
  ["", 1440, 1600],       // tall: the drawer's own scroll reveals the whole design
  ["-board", 1440, 900],  // the faces, the drawer closed
  ["-board", 390, 844],
];

(async () => {
  const browser = await chromium.launch();
  let n = 0;
  for (const name of names) {
    for (const theme of ["dark", "light"]) {
      const file = name + (theme === "light" ? "-light" : "") + ".html";
      for (const [suffix, width, height] of shots) {
        if (suffix === "" && width === 1440 && height === 1600 && theme === "light") continue;
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        const failures = [];
        page.on("pageerror", (e) => failures.push(e.message));
        await page.goto("file://" + path.join(here, file), { waitUntil: "load" });
        await page.waitForTimeout(150);
        if (failures.length) throw new Error(file + ": " + failures.join("; "));
        const out = path.join(here, name + (height === 1600 ? "-tall" : suffix) +
          (theme === "light" ? "-light" : "") + "-" + width + ".png");
        await page.screenshot({ path: out, fullPage: true });
        n++;
        console.log(path.basename(out));
        await page.close();
      }
    }
  }
  await browser.close();
  console.log(n + " shots");
})();
