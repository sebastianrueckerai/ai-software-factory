// node demo/video/film.js <name> builds the film composition demo/video/<name> from its film.json and the bank:
// it copies the clips and stills it names from demo/out into <name>/clips, writes <name>/data.js with the sidecars
// and each segment's place on the output clock, and renders <name>/index.html from the template, putting the media
// layer and the duration in as literal attributes, since HyperFrames reads clip timing before any script runs.
// Then `node demo/video/render.js <name>` renders it.
//
// film.json: { "template": "../opening.tpl.html", "style": "spotlight", "segments": [ ... ] }, a segment either
// { "id", "still": "<scene>-<n>.png", "dur": seconds } or { "id", "scene", "from": [step, "atMs"|"stillMs"],
// "to": [step, field], "tail": seconds, "rate": playback rate }.
const fs = require("node:fs");
const path = require("node:path");

const name = process.argv[2];
if (!name) {
  console.error("usage: node demo/video/film.js <name>");
  process.exit(2);
}
const dir = path.join(__dirname, name);
const bank = process.env.BANK || path.join(__dirname, "..", "out");
const film = JSON.parse(fs.readFileSync(path.join(dir, "film.json"), "utf8"));
const clips = path.join(dir, "clips");
fs.mkdirSync(clips, { recursive: true });
// the shared files a composition reads sit beside it as copies, ignored by git like everything this script writes
const shared = film.shared || [];
for (const s of shared) fs.copyFileSync(path.join(dir, s), path.join(dir, path.basename(s)));
fs.writeFileSync(path.join(dir, ".gitignore"), ["clips/", "data.js", ...(film.template ? ["index.html"] : []), ...shared.map((s) => path.basename(s))].join("\n") + "\n");

const sidecar = (scene) => JSON.parse(fs.readFileSync(path.join(bank, `${scene}.json`), "utf8"));
const scenes = {};
const seg = {};
const media = [];
let t = 0;
for (const s of film.segments) {
  if (s.clip) {
    // a rendered clip of the procedural route, played whole from its start
    fs.copyFileSync(path.join(bank, s.clip), path.join(clips, s.clip));
    const rate = s.rate || 1, dur = s.dur / rate;
    seg[s.id] = { start: t, dur, clip: s.clip, mediaStart: 0, rate };
    media.push(`<video class="clip media" id="m-${s.id}" src="clips/${s.clip}" muted playsinline data-start="${t.toFixed(3)}" ` +
      `data-duration="${dur.toFixed(3)}" data-media-start="0"${rate === 1 ? "" : ` data-playback-rate="${rate}"`}></video>`);
    t += dur;
    continue;
  }
  if (s.still) {
    fs.copyFileSync(path.join(bank, s.still), path.join(clips, s.still));
    seg[s.id] = { start: t, dur: s.dur, still: s.still };
    media.push(`<img class="clip media" id="m-${s.id}" src="clips/${s.still}" alt="" data-start="${t.toFixed(3)}" data-duration="${s.dur.toFixed(3)}">`);
    t += s.dur;
    continue;
  }
  scenes[s.scene] ??= sidecar(s.scene);
  const steps = scenes[s.scene].steps;
  const at = ([n, field]) => {
    const v = steps[n - 1] && steps[n - 1][field];
    if (v === undefined) throw new Error(`${s.id}: ${s.scene} step ${n} has no ${field}`);
    return v / 1000;
  };
  const from = Math.max(0, at(s.from) - (s.lead || 0)), to = at(s.to) + (s.tail || 0), rate = s.rate || 1;
  const dur = (to - from) / rate;
  if (!fs.existsSync(path.join(clips, `${s.scene}.mp4`))) fs.copyFileSync(path.join(bank, `${s.scene}.mp4`), path.join(clips, `${s.scene}.mp4`));
  seg[s.id] = { start: t, dur, scene: s.scene, mediaStart: from, rate };
  media.push(`<video class="clip media" id="m-${s.id}" src="clips/${s.scene}.mp4" muted playsinline data-start="${t.toFixed(3)}" ` +
    `data-duration="${dur.toFixed(3)}" data-media-start="${from.toFixed(3)}"${rate === 1 ? "" : ` data-playback-rate="${rate}"`}></video>`);
  t += dur;
}
for (const s of film.stills || []) {
  const scene = s.replace(/-\d+\.png$/, "");
  scenes[scene] ??= sidecar(scene);
  fs.copyFileSync(path.join(bank, s), path.join(clips, s));
}
const duration = Math.ceil((t + (film.tail || 0)) * 10) / 10;
fs.writeFileSync(path.join(dir, "data.js"), `window.FILM = ${JSON.stringify({ style: film.style, duration, seg, scenes, beats: film.beats, rings: film.rings, titles: film.titles, clocks: film.clocks, quiet: film.quiet })};\n`);
if (film.template) {
  const tpl = fs.readFileSync(path.join(dir, film.template), "utf8");
  fs.writeFileSync(path.join(dir, "index.html"), tpl.replaceAll("{{DURATION}}", String(duration)).replace("<!--MEDIA-->", media.join("\n")));
}
console.log(`${name}: ${film.segments.length} segments, ${duration} s`);
