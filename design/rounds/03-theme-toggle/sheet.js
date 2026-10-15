// sheet.js lays the shots of shoot.js out as one contact sheet per theme,
// a row per candidate: the top bar at 1x as a screen shows it, the button's
// neighbourhood at 3x at rest and hovered, and the switch to the other
// theme as a film. Writes <name>-<theme>.png beside itself.
// Usage: node sheet.js   (every candidate, contact-sheet-<theme>.png)
//        node sheet.js compare-sheet swap half   (those, compare-sheet-<theme>.png)
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { CANDIDATES } = require("./candidates.js");

const here = __dirname;
const [name = "contact-sheet", ...pick] = process.argv.slice(2);
const all = [{ slug: "before", name: "Before: the text" }, ...CANDIDATES];
const rows = pick.length ? pick.map((s) => all.find((c) => c.slug === s)) : all;
const frames = fs.readdirSync(path.join(here, "shots", "swap")).filter((f) => f.startsWith("dark-film-")).map((f) => f.slice(10, 13));

function html(theme) {
  const bg = theme === "dark" ? "#070b12" : "#f1ece0", fg = theme === "dark" ? "#dfe7f1" : "#0f1d33", line = theme === "dark" ? "#263649" : "#aeb5c1";
  const other = theme === "dark" ? "light" : "dark";
  const img = (slug, f, w) => `<img src="shots/${slug}/${theme}-${f}.png"${w ? ` style="height:${w}px"` : ""}>`;
  return `<!doctype html><meta charset="utf-8"><style>
body { margin: 0; padding: 18px 22px; background: ${bg}; color: ${fg}; font: 14px/1.3 ui-monospace, "JetBrains Mono", "DejaVu Sans Mono", monospace; }
h1 { font-size: 17px; margin: 0 0 12px; }
table { border-collapse: collapse; }
th { text-align: left; font-weight: 600; font-size: 12px; opacity: .75; padding: 0 10px 6px 0; }
td { padding: 6px 14px 6px 0; border-top: 1px solid ${line}; vertical-align: middle; }
td.n { width: 150px; font-weight: 700; } td.n small { display: block; font-weight: 400; opacity: .75; }
img { display: block; }
.film { display: flex; gap: 2px; }
</style><h1>Theme toggle candidates, ${theme} theme. Film: the switch to ${other}, frames at ${frames.map(Number).join(", ")} ms.</h1>
<table><tr><th>candidate</th><th>at 1x, as a screen shows it</th><th>at rest, 3x</th><th>hovered, 3x</th><th>switching to ${other}, 3x</th></tr>
${rows.map((c, i) => `<tr><td class="n">${pick.length ? String.fromCharCode(65 + i) : String(i).padStart(2, "0")} ${c.name}<small>${c.slug}</small></td><td>${img(c.slug, "zoom1x")}</td><td>${img(c.slug, "zoom3x", 66)}</td><td>${img(c.slug, "hover3x", 66)}</td><td><div class="film">${c.slug === "before" ? "" : frames.map((f) => img(c.slug, "film-" + f, 66)).join("")}</div></td></tr>`).join("\n")}
</table>`;
}

(async () => {
  const browser = await chromium.launch();
  for (const theme of ["dark", "light"]) {
    const file = path.join(here, `${name}-${theme}.html`);
    fs.writeFileSync(file, html(theme));
    const p = await browser.newPage({ viewport: { width: 1800, height: 600 } });
    await p.goto("file://" + file);
    await p.screenshot({ path: path.join(here, `${name}-${theme}.png`), fullPage: true });
    await p.close();
    fs.unlinkSync(file);
    console.log(`${name}-${theme}.png`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
