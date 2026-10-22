// node demo/video/film.js <name> builds the film composition demo/video/<name> from its film.json and the bank:
// it copies the clips and stills it names from demo/out into <name>/clips, writes <name>/data.js with the sidecars
// and each segment's place on the output clock, and renders <name>/index.html from the template, putting the media
// layer and the duration in as literal attributes, since HyperFrames reads clip timing before any script runs.
// Then `node demo/video/render.js <name>` renders it.
//
// film.json: { "template": "../film.tpl.html", "segments": [ ... ], "spots": [ ... ], "caps": [ ... ], "titles": [ ... ] },
// a segment either { "id", "still": "<scene>-<n>.png", "dur": seconds }, { "id", "clip": "p-<name>.mp4", "dur": seconds },
// or { "id", "scene", "from": [step, "atMs"|"stillMs"|"actN"], "lead": seconds, "to": [step, field], "tail": seconds, "rate": rate }.
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
    const st = steps[n - 1], v = st && (field.startsWith("act") ? (st.acts || [])[Number(field.slice(3))] : st[field]);
    if (v === undefined) throw new Error(`${s.id}: ${s.scene} step ${n} has no ${field}`);
    return v / 1000;
  };
  const from = Math.max(0, at(s.from) - (s.lead || 0)), rate = s.rate || 1;
  // a tail stops where the next step reloads the page, since a reload shows a dark frame, and before the video ends
  const next = require(path.join(__dirname, "..", "scenes", `${s.scene}.js`)).steps[s.to[0]];
  const reload = next && (next.actions || [])[0]?.goto !== undefined ? steps[s.to[0]].atMs / 1000 : Infinity;
  const to = Math.min(at(s.to) + (s.tail || 0), reload, (scenes[s.scene].videoMs ?? Infinity) / 1000 - 0.05);
  // copied on every build like the stills: a scene recorded again must not play its old video against its new marks
  fs.copyFileSync(path.join(bank, `${s.scene}.mp4`), path.join(clips, `${s.scene}.mp4`));
  // pieces: with a holdRate, the waits between a step's last action and the next step's start play faster than the
  // actions, so a cut keeps the clicks at their pace and loses the dead time
  const cuts = [from, to];
  if (s.holdRate) for (const st of steps) {
    const last = (st.acts || []).at(-1);
    for (const v of [st.atMs, last]) if (v !== undefined && v / 1000 > from && v / 1000 < to) cuts.push(v / 1000);
  }
  const marks = [...new Set(cuts)].sort((a, b) => a - b);
  const held = (m0, m1) => s.holdRate && steps.some((st) => {
    const last = (st.acts || []).at(-1);
    return last !== undefined && m0 >= last / 1000 - 0.001 && m1 <= (steps[st.index] ? steps[st.index].atMs : Infinity) / 1000 + 0.001;
  });
  const pieces = [];
  let out = t;
  for (let i = 0; i + 1 < marks.length; i++) {
    // the last piece holds the section's outcome, so it keeps the normal rate
    const m0 = marks[i], m1 = marks[i + 1], r = held(m0, m1) && i + 2 < marks.length ? s.holdRate : rate, d = (m1 - m0) / r;
    if (d < 0.02) continue;
    pieces.push({ m0, m1, t0: out, rate: r });
    media.push(`<video class="clip media" id="m-${s.id}-${pieces.length}" src="clips/${s.scene}.mp4" muted playsinline data-start="${out.toFixed(3)}" ` +
      `data-duration="${d.toFixed(3)}" data-media-start="${m0.toFixed(3)}"${r === 1 ? "" : ` data-playback-rate="${r}"`}></video>`);
    out += d;
  }
  const dur = out - t;
  seg[s.id] = { start: t, dur, scene: s.scene, mediaStart: from, rate, pieces };
  t += dur;
}
for (const s of film.stills || []) {
  const scene = s.replace(/-\d+\.png$/, "");
  scenes[scene] ??= sidecar(scene);
  fs.copyFileSync(path.join(bank, s), path.join(clips, s));
}
const duration = Math.ceil((t + (film.tail || 0)) * 10) / 10;
// the clock rounds up past the last segment; a closing still covers the gap, which would otherwise end the cut on dark
if (!film.tail && media.length && media.at(-1).startsWith("<img")) {
  media[media.length - 1] = media.at(-1).replace(/data-start="([\d.]+)" data-duration="[\d.]+"/, (m, st) => `data-start="${st}" data-duration="${(duration - Number(st)).toFixed(3)}"`);
}
fs.writeFileSync(path.join(dir, "data.js"), `window.FILM = ${JSON.stringify({ duration, seg, scenes, spots: film.spots, cams: film.cams, caps: film.caps, titles: film.titles, quiet: film.quiet, plain: film.plain, maxZoom: film.maxZoom, camDur: film.camDur, reveals: film.reveals })};\n`);
if (film.template) {
  const tpl = fs.readFileSync(path.join(dir, film.template), "utf8");
  fs.writeFileSync(path.join(dir, "index.html"), tpl.replaceAll("{{DURATION}}", String(duration)).replace("<!--MEDIA-->", media.join("\n")));
}
console.log(`${name}: ${film.segments.length} segments, ${duration} s`);
