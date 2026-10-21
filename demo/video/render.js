// node demo/video/render.js <name> renders the composition demo/video/<name>/index.html with HyperFrames to
// demo/out/p-<name>.mp4, renders it a second time to prove the frames identical, takes one PNG every FRAME_S seconds
// and writes the sidecar demo/out/p-<name>.json: the tool, its version, the source, the frame digest, the steps.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HYPERFRAMES = "hyperframes@0.8.183";
const FRAME_S = 4;

const name = process.argv[2];
if (!name) {
  console.error("usage: node demo/video/render.js <name>");
  process.exit(2);
}
const here = __dirname;
const root = path.resolve(here, "..");
const src = path.join(here, name);
const out = path.join(root, "out");
const mp4 = path.join(out, `p-${name}.mp4`);
fs.mkdirSync(out, { recursive: true });

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
const framemd5 = (file) => sh("ffmpeg", ["-v", "error", "-i", file, "-f", "framemd5", "-"]).split("\n").filter((l) => l && !l.startsWith("#"))
  .map((l) => l.trim().split(/,\s*/).at(-1)).join("\n");
const sha = (s) => require("node:crypto").createHash("sha256").update(s).digest("hex").slice(0, 16);

const meta = JSON.parse(fs.readFileSync(path.join(src, "meta.json"), "utf8"));
const started = Date.now();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `hf-${name}-`));
const first = path.join(tmp, "a.mp4"), second = path.join(tmp, "b.mp4");
for (const file of [first, second]) {
  sh("npx", ["-y", HYPERFRAMES, "render", "-o", file], { cwd: src, env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" } });
}
const digestA = framemd5(first), digestB = framemd5(second);
const deterministic = digestA === digestB;
fs.copyFileSync(first, mp4);
fs.rmSync(tmp, { recursive: true, force: true });

const probe = JSON.parse(sh("ffprobe", ["-v", "error", "-show_entries", "stream=width,height,r_frame_rate,nb_frames", "-show_entries", "format=duration", "-of", "json", mp4]));
const stream = probe.streams[0];
const durationMs = Math.round(Number(probe.format.duration) * 1000);
for (const f of fs.readdirSync(out)) if (f.match(new RegExp(`^p-${name}-\\d+\\.png$`))) fs.unlinkSync(path.join(out, f));
const steps = [];
for (let s = 0, i = 1; s * 1000 < durationMs; s += FRAME_S, i++) {
  const at = Math.min(s, (durationMs - 100) / 1000);
  sh("ffmpeg", ["-y", "-v", "error", "-ss", String(at), "-i", mp4, "-frames:v", "1", path.join(out, `p-${name}-${i}.png`)]);
  steps.push({ atMs: Math.round(at * 1000) });
}

const git = (args, cwd) => { try { return sh("git", args, { cwd }).trim(); } catch { return "unknown"; } };
const sidecar = {
  name: `p-${name}`, title: meta.title, story: meta.story, group: "procedural", theme: "dark", viewport: "desk",
  route: "procedural", tool: HYPERFRAMES, gsap: "3.14.2", source: path.relative(root, path.join(src, "index.html")),
  width: stream.width, height: stream.height, fps: stream.r_frame_rate, frames: Number(stream.nb_frames),
  durationMs, videoMs: durationMs, steps, frameDigest: sha(digestA), deterministic,
  renderSeconds: Math.round((Date.now() - started) / 1000), renderedAt: new Date().toISOString(),
  designCommit: process.env.DESIGN_COMMIT || git(["rev-parse", "HEAD"], root), est_cost_usd: 0, cost: "none, rendered locally",
};
fs.writeFileSync(path.join(out, `p-${name}.json`), JSON.stringify(sidecar, null, 2) + "\n");
console.log(`${path.relative(process.cwd(), mp4)}: ${durationMs} ms, ${steps.length} frames, deterministic ${deterministic}`);
if (!deterministic) process.exit(1);
