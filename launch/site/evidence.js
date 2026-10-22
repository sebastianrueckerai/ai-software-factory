// node launch/site/evidence.js writes launch/site/evidence.html from docs/evidence.md. A path in backticks links to its
// file on GitHub at the commit the code or infra repository's github/main points at, so fetch both first; a path missing
// at that commit fails the build. A scene a landing page clip shows links to that clip's card, any other scene to the
// demo handover's scene table, a stage to the build plan's stage table.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const GH = "https://github.com/sebastianrueckerai";
const repos = {
  code: { name: "ai-software-factory-code", dir: process.env.CODE_REPO || path.join(os.homedir(), "repos", "ai-software-factory-code") },
  infra: { name: "ai-software-factory-infra", dir: process.env.INFRA_REPO || path.join(os.homedir(), "repos", "ai-software-factory-infra") },
};
for (const r of Object.values(repos)) r.sha = execFileSync("git", ["-C", r.dir, "rev-parse", "github/main"], { encoding: "utf8" }).trim();
const design = (p) => `${GH}/ai-software-factory/blob/master/${p}`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => s.toLowerCase().replace(/[^\w\- ]/g, "").replace(/ /g, "-");

// code links a path of the code repository, or of the infra repository after "infra:"; a glob links its folder
function code(token) {
  const r = token.startsWith("infra:") ? repos.infra : repos.code;
  const p = token.replace(/^infra:/, "");
  const target = p.includes("*") ? path.posix.dirname(p) : p;
  let kind;
  try {
    kind = execFileSync("git", ["-C", r.dir, "cat-file", "-t", `${r.sha}:${target}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    throw new Error(`${token}: not in ${r.name} at ${r.sha.slice(0, 8)}`);
  }
  return `<a class="path" href="${GH}/${r.name}/${kind === "tree" ? "tree" : "blob"}/${r.sha}/${target}"><code>${esc(token).replace(/\//g, "/<wbr>")}</code></a>`;
}

// the scenes the landing page's clips show, each to its card
const clips = {};
const videos = path.join(root, "demo", "video");
for (const d of fs.readdirSync(videos).filter((d) => d.startsWith("clip-"))) {
  for (const m of fs.readFileSync(path.join(videos, d, "film.json"), "utf8").matchAll(/"scene": "(\d{2})-/g)) clips[m[1]] ??= d;
}
const scene = (n) => `<a href="${clips[n] ? `index.html#${clips[n]}` : design("demo/handover/README.md#the-scenes")}">${n}</a>`;

// inline renders one line of the doc: code spans, links relative to docs/, and in the runs column scenes, stages and
// "not yet"
function inline(text, runs = false) {
  const parts = text.split(/(`[^`]+`)/);
  return parts.map((part) => {
    if (part.startsWith("`")) {
      const t = part.slice(1, -1);
      return /^(infra:)?[\w.\-/*]+$/.test(t) && t.includes("/") ? code(t) : `<code>${esc(t)}</code>`;
    }
    let h = esc(part).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const [file, hash] = href.split("#");
      return `<a href="${design(path.posix.normalize(path.posix.join("docs", file)))}${hash ? `#${hash}` : ""}">${label}</a>`;
    });
    if (runs) {
      h = h.replace(/\bScenes? \d{2}(?:(?:, | and | to )\d{2})*/g, (m) => m.replace(/\d{2}/g, scene))
        .replace(/\bStages? \d+/g, (m) => `<a href="${design("docs/plans/2026-09-24-build-plan.md#the-stage-cut")}">${m}</a>`)
        .replace(/^not yet/, '<span class="nyet">not yet</span>');
    }
    return h;
  }).join("");
}

const md = fs.readFileSync(path.join(root, "docs", "evidence.md"), "utf8").trim().split("\n");
const [title, sub] = md[0].replace(/^# /, "").split(": ");
const out = [];
const toc = [];
let table = null;
for (const line of md.slice(1)) {
  if (line.startsWith("|")) {
    if (/^[-|: ]+$/.test(line)) continue;
    const cells = line.slice(1, -1).split(" | ").map((c) => c.trim());
    if (!table) {
      table = [];
      out.push('<div class="scroll"><table class="ev">', `<thead><tr>${cells.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>`, "<tbody>");
      continue;
    }
    out.push(`<tr>${cells.map((c, i) => (i === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c, i === 3)}</td>`)).join("")}</tr>`);
    continue;
  }
  if (table) { out.push("</tbody></table></div>"); table = null; }
  if (line.startsWith("## ")) {
    const h = line.slice(3);
    toc.push(`<li><a href="#${slug(h)}">${esc(h.replace(/^\d+\. /, ""))}</a></li>`);
    out.push(`</section>`, `<section aria-labelledby="${slug(h)}">`, `<h2 id="${slug(h)}">${esc(h)}</h2>`);
  } else if (line.trim()) {
    out.push(`<p>${inline(line)}</p>`);
  }
}
if (table) out.push("</tbody></table></div>");
// the intro is everything before the first section
const first = out.indexOf("</section>");
const intro = out.slice(0, first);
const body = out.slice(first);

const pinned = Object.values(repos).map((r) => `<a href="${GH}/${r.name}/tree/${r.sha}"><code>${r.sha.slice(0, 8)}</code></a> of ${r.name}`).join(" and ");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}: AI software factory</title>
<meta name="description" content="Every claim of the AI software factory with the code that holds it, the test that exercises it and the run that shows it.">
<link rel="stylesheet" href="site.css">
<style>
  table.ev { min-width: 980px; }
  table.ev th[scope=row] { width: 30%; font-weight: 600; }
  table.ev td { color: var(--text-muted); }
  table.ev td:nth-child(2), table.ev td:nth-child(3) { width: 24%; }
  a.path { text-decoration: none; }
  a.path code { font: 13px/1.5 var(--font-mono); color: var(--accent); }
  a.path:hover code { text-decoration: underline; }
  .nyet { color: var(--need-text); }
  .toc { columns: 2; max-width: 760px; padding-left: 22px; }
  footer { color: var(--text-faint); font-size: 14px; }
</style>
</head>
<body>
<nav aria-label="Pages"><ul><li><a href="index.html">AI software factory</a></li><li><a href="#top" aria-current="page">${esc(title)}</a></li></ul></nav>
<main class="wrap">
<section id="top" aria-labelledby="top-h">
<h1 id="top-h">${esc(title)}</h1>
<p class="lede">${esc(sub[0].toUpperCase() + sub.slice(1))}.</p>
${intro.join("\n")}
<ol class="toc">${toc.join("")}</ol>
${body.join("\n")}
</section>
<footer><p>Built from <a href="${design("docs/evidence.md")}">docs/evidence.md</a>. The file and test links point at commit ${pinned}.</p></footer>
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, "evidence.html"), html);
console.log(`evidence.html: ${toc.length} sections, ${(html.match(/class="path"/g) || []).length} code links`);
