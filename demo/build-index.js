// node demo/build-index.js writes demo/index.html: every scene with its video, step frames and story.
const fs = require("node:fs");
const path = require("node:path");

const GROUPS = [
  ["intake", "A", "Intake"], ["build", "B", "Build"], ["ship", "C", "Ship"], ["operate", "D", "Operate"],
  ["gates", "E", "The human at the gates"], ["metrics", "F", "Metrics"], ["diagrams", "G", "Diagrams"], ["procedural", "P", "Procedural clips"],
  ["smoke", "", "Smoke"],
];
// the generated clips of group H by their directory under demo/generated, in the plan's order
const CLIPS = { "33-loop": "The opening: the loop", "34-sandbox": "The sandbox life cycle", "35-reseed": "The wipe and re-seed", "36-titles": "Title and transitions" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const secs = (ms) => `${(ms / 1000).toFixed(1)} s`;

function load(scenesDir, outDir) {
  const files = fs.readdirSync(outDir);
  return fs.readdirSync(scenesDir).filter((f) => f.endsWith(".js")).sort().map((f) => {
    const name = path.basename(f, ".js");
    const meta = require(path.resolve(scenesDir, f));
    const side = path.join(outDir, `${name}.json`);
    const sidecar = fs.existsSync(side) ? JSON.parse(fs.readFileSync(side, "utf8")) : null;
    const frames = files.map((p) => p.match(new RegExp(`^${name}-(\\d+)\\.png$`)))
      .filter(Boolean).map((m) => +m[1]).sort((a, b) => a - b);
    return { name, meta, sidecar, frames };
  });
}

// loadProcedural lists the compositions under demo/video, each rendered by demo/video/render.js to out/p-<name>.*
function loadProcedural(videoDir, outDir) {
  const files = fs.readdirSync(outDir);
  return fs.readdirSync(videoDir).filter((d) => fs.existsSync(path.join(videoDir, d, "meta.json"))).sort().map((d) => {
    const name = `p-${d}`;
    const m = JSON.parse(fs.readFileSync(path.join(videoDir, d, "meta.json"), "utf8"));
    const meta = { title: m.title, story: m.story, group: "procedural", theme: "dark", viewport: "desk" };
    const side = path.join(outDir, `${name}.json`);
    const sidecar = fs.existsSync(side) ? JSON.parse(fs.readFileSync(side, "utf8")) : null;
    const frames = files.map((p) => p.match(new RegExp(`^${name}-(\\d+)\\.png$`))).filter(Boolean).map((x) => +x[1]).sort((a, b) => a - b);
    return { name, meta, sidecar, frames };
  });
}

// loadGenerated reads each clip's directory under demo/generated: the sidecars tools/img.py wrote (model, prompt, outputs,
// est_cost_usd), the contact sheet and the critic's answer
function loadGenerated(genDir) {
  if (!fs.existsSync(genDir)) return [];
  return Object.keys(CLIPS).filter((d) => fs.existsSync(path.join(genDir, d))).map((dir) => {
    const files = fs.readdirSync(path.join(genDir, dir)).sort();
    const sidecars = files.filter((f) => f.endsWith(".json")).map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(genDir, dir, f), "utf8")) }))
      .filter((m) => m.model && m.outputs);
    const critique = path.join(genDir, dir, "critique", "gemini.json");
    return {
      dir, title: CLIPS[dir], sidecars,
      stills: sidecars.filter((m) => !m.outputs[0].endsWith(".mp4")),
      clips: sidecars.filter((m) => m.outputs[0].endsWith(".mp4")),
      sheet: files.includes("contact-sheet.jpg"),
      critique: fs.existsSync(critique) ? JSON.parse(fs.readFileSync(critique, "utf8")).answer : null,
      cost: sidecars.reduce((a, m) => a + (m.est_cost_usd || 0), 0) + (fs.existsSync(critique) ? 0.03 : 0),
    };
  });
}

function generatedCard(g) {
  const base = `generated/${g.dir}`;
  const clips = g.clips.map((m) => `<video controls preload="metadata" class="desk" src="${base}/${esc(m.outputs[0])}"></video>` +
    `<p class="facts mono">${esc(m.label || m.outputs[0])}: ${esc(m.model)}, ~$${m.est_cost_usd.toFixed(2)}</p>`).join("");
  const stills = g.stills.flatMap((m) => m.outputs.map((o) =>
    `<a href="${base}/${esc(o)}"><img src="${base}/${esc(o)}" alt="${esc(m.label || o)}"><span class="mono">${esc(o.replace(/\.png$/, ""))}</span></a>`)).join("");
  const sheet = g.sheet ? `<p><a href="${base}/contact-sheet.jpg">the contact sheet</a> the critic judged</p>` : "";
  const critique = g.critique ? `<details><summary>the critic's answer (Gemini 2.5 Pro)</summary><pre>${esc(g.critique)}</pre></details>` : "";
  const facts = `${g.stills.length} stills, ${g.clips.length} ${g.clips.length === 1 ? "take" : "takes"}, ~$${g.cost.toFixed(2)}`;
  return `<article class="card" id="${g.dir}"><h3><span class="n mono">${g.dir.slice(0, 2)}</span>${esc(g.title)}</h3><p class="facts mono">${facts}</p>` +
    `<div class="media">${clips}<div class="frames">${stills}</div>${sheet}${critique}</div></article>`;
}

function card(s) {
  const { name, meta, sidecar } = s;
  const lead = name.match(/^\d+/);
  const num = lead ? `<span class="n mono">${lead[0]}</span>` : "";
  const head = `<h3>${num}${esc(meta.title)}</h3><p class="story">${esc(meta.story)}</p>`;
  if (!sidecar) return `<article class="card" id="${name}">${head}<p class="mono missing">not recorded</p></article>`;
  const phone = meta.viewport === "phone";
  const facts = sidecar.route === "procedural"
    ? `${secs(sidecar.durationMs)} at ${esc(sidecar.fps)} fps, ${sidecar.steps.length} frames shown, rendered with ${esc(sidecar.tool)} in ${sidecar.renderSeconds} s, ` +
      `${sidecar.deterministic ? "two renders frame for frame identical" : "the two renders differed"}, source ${esc(sidecar.source)}`
    : `${esc(meta.viewport)} viewport, ${secs(sidecar.durationMs)}, ${sidecar.steps.length} steps`;
  const video = `<video controls preload="metadata" class="${phone ? "phone" : "desk"}" poster="out/${name}-1.png" src="out/${name}.mp4"></video>`;
  const frames = s.frames.map((n) =>
    `<a href="out/${name}-${n}.png"><img src="out/${name}-${n}.png" alt="${esc(meta.title)}, step ${n}"><span class="mono">${n}</span></a>`).join("");
  return `<article class="card" id="${name}">${head}<p class="facts mono">${facts}</p>` +
    `<div class="${phone ? "media phone" : "media"}">${video}<div class="frames">${frames}</div></div></article>`;
}

const CSS = `
:root { color-scheme: dark; --bg: #070b12; --bg-panel: #0b111a; --bg-raised: #0f1723; --line: #1a2636; --line-strong: #263649; --mark: #5a8aa3;
  --text: #dfe7f1; --text-muted: #93a1b5; --text-faint: #7c8ba0; --accent: #4fcbe2; --need-text: #f6bd5a;
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", "Noto Sans", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", "JetBrains Mono", "Noto Sans Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace; }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 400 16px/1.5 var(--font-ui); -webkit-font-smoothing: antialiased; }
main { width: 1200px; margin: 0 auto; padding: 48px 0 40px; }
h1 { margin: 0 0 12px; font-size: 34px; font-weight: 600; }
h2 { margin: 56px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--line-strong); font-size: 24px; font-weight: 600; }
h2 .g { margin-right: 10px; font: 18px var(--font-mono); color: var(--accent); }
h3 { margin: 0 0 4px; font-size: 19px; font-weight: 600; }
p { margin: 0 0 10px; }
a { color: var(--accent); }
.mono { font-family: var(--font-mono); font-variant-ligatures: none; font-variant-numeric: tabular-nums; }
.lede { max-width: 900px; color: var(--text-muted); }
.numbers { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0 12px; }
.numbers div { padding: 10px 16px; background: var(--bg-panel); border: 1px solid var(--line-strong); }
.numbers b { display: block; font: 600 22px var(--font-mono); color: var(--accent); }
.numbers span { font-size: 13px; color: var(--text-muted); }
.legend, .facts, footer { font-size: 14px; color: var(--text-faint); }
.card { margin: 0 0 20px; padding: 18px 22px; background: var(--bg-panel); border: 1px solid var(--line-strong); }
.card .n { margin-right: 10px; font-size: 15px; color: var(--accent); }
.story { margin-bottom: 6px; color: var(--text-muted); }
.missing { color: var(--need-text); }
.media { margin-top: 12px; }
video { display: block; width: 800px; max-width: 100%; height: auto; background: #000; border: 1px solid var(--line); }
video.phone { width: 390px; flex: none; }
.frames { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.frames a { display: block; width: 190px; text-align: center; text-decoration: none; font-size: 13px; color: var(--text-faint); }
.frames img { display: block; width: 190px; height: auto; border: 1px solid var(--line-strong); }
.frames a:hover img { border-color: var(--accent); }
.media.phone { display: flex; gap: 20px; align-items: flex-start; }
.media.phone .frames { margin-top: 0; }
.media.phone .frames a, .media.phone .frames img { width: 130px; }
table { border-collapse: collapse; width: 100%; background: var(--bg-panel); }
th, td { padding: 8px 14px; text-align: left; border: 1px solid var(--line-strong); }
th { font-weight: 600; color: var(--text-muted); background: var(--bg-raised); }
pre { margin: 0 0 12px; padding: 12px 16px; overflow-x: auto; background: var(--bg-panel); border: 1px solid var(--line-strong); font: 14px/1.5 var(--font-mono); }
code { font-family: var(--font-mono); font-size: .92em; }
footer { margin-top: 56px; padding-top: 12px; border-top: 1px solid var(--line-strong); }
`;

function prerequisites(file) {
  const para = fs.readFileSync(file, "utf8").split("\n\n").find((p) => p.startsWith("A fresh session needs"));
  return esc(para).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function render(scenes, prereq, generated = []) {
  const bank = scenes.filter((s) => s.meta.group !== "procedural");
  const rec = bank.filter((s) => s.sidecar);
  const ms = rec.reduce((a, s) => a + s.sidecar.durationMs, 0);
  const first = rec[0] && rec[0].sidecar;
  const days = rec.map((s) => s.sidecar.recordedAt.slice(0, 10)).sort();
  const when = !days.length ? "never" : days[0] === days.at(-1) ? days[0] : `${days[0]} to ${days.at(-1)}`;
  const short = (c) => (c || "unknown").slice(0, 10);
  const num = (v, l) => `<div><b>${v}</b><span>${l}</span></div>`;
  const sections = GROUPS.map(([id, letter, name]) => {
    const cards = scenes.filter((s) => s.meta.group === id);
    if (!cards.length) return "";
    return `<section id="${id}"><h2>${letter ? `<span class="g">${letter}</span>` : ""}${esc(name)}</h2>${cards.map(card).join("\n")}</section>`;
  }).join("\n");
  const spent = generated.reduce((a, g) => a + g.cost, 0);
  const clips = generated.length
    ? `<p>Made with the fal models of the plan by <code>tools/img.py</code>: the stills went wide, Gemini judged the contact sheet, the director picked ` +
      `provisionally, one take per clip. Every output has its sidecar JSON beside it. About $${spent.toFixed(2)} of the $10 cap. ` +
      `The plan: <a href="generated/PLAN.md">demo/generated/PLAN.md</a>.</p>${generated.map(generatedCard).join("\n")}`
    : `<p>Nothing has run yet. Each clip waits for the spending cap Sebastian sets. The plan: <a href="generated/PLAN.md">demo/generated/PLAN.md</a>.</p>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demo scene bank</title><style>${CSS}</style></head>
<body><main>
<header>
<h1>Demo scene bank</h1>
<p class="lede">The real console, recorded over a scripted fake project, the browser game Nebula Run. Every scene is a short story with a video and the frames of its steps. <code>demo/run.sh</code> regenerates the bank and this page.</p>
<div class="numbers">${num(rec.length, "scenes recorded")}${num(bank.length - rec.length, "scenes not recorded")}${num((ms / 60000).toFixed(1), "minutes of video")}${num(short(first && first.consoleCommit), "console commit")}${num(when, "recorded")}</div>
<p class="legend">Click a frame to open it full size. The video plays in place.</p>
</header>
${sections}
<section id="generated"><h2><span class="g">H</span>Generated clips</h2>
${clips}</section>
<section id="regenerate"><h2>How to regenerate</h2>
<pre>demo/run.sh                      # the whole bank
demo/run.sh 01-chat-to-card      # one scene
node --test demo/test/*.test.js  # the tests</pre>
<p>${prereq}</p></section>
<footer class="mono">Design commit ${short(first && first.designCommit)}</footer>
</main></body></html>
`;
}

function build(scenesDir, outDir, readmeFile, videoDir = path.join(scenesDir, "..", "video"), genDir = path.join(scenesDir, "..", "generated")) {
  const procedural = fs.existsSync(videoDir) ? loadProcedural(videoDir, outDir) : [];
  return render([...load(scenesDir, outDir), ...procedural], prerequisites(readmeFile), loadGenerated(genDir));
}

module.exports = { build };

if (require.main === module) {
  fs.writeFileSync(path.join(__dirname, "index.html"),
    build(path.join(__dirname, "scenes"), path.join(__dirname, "out"), path.join(__dirname, "README.md")));
}
