// Assembles the round's pages from the shared template: c0 is today's inbox
// (no candidate rules), c1 to c6 the candidates, each in both themes.
// Usage: node build.js
const fs = require("fs");
const path = require("path");
const here = __dirname;
const tmpl = fs.readFileSync(path.join(here, "page.tmpl.html"), "utf8");
const names = { c0: "today's inbox", c1: "dim-line", c2: "quiet-log", c3: "ink-swap", c4: "settled-run", c5: "right-reason", c6: "half-fade" };
for (const [stem, label] of Object.entries(names)) {
  const css = stem === "c0" ? "/* the baseline: no candidate rules */" : fs.readFileSync(path.join(here, "cand", stem + ".css"), "utf8");
  for (const theme of ["dark", "light"]) {
    const out = tmpl.replace(/\{\{THEME\}\}/g, theme)
      .replace(/\{\{TITLE\}\}/g, `Round 06 · ${label} · ${theme}`)
      .replace(/\{\{CAND\}\}/g, css);
    const file = stem + (theme === "light" ? "l" : "") + ".html";
    fs.writeFileSync(path.join(here, file), out);
  }
}
console.log(Object.keys(names).length * 2, "pages built");
