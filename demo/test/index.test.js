const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { build } = require("../build-index");

const README = path.join(__dirname, "..", "README.md");
const scene = (title, group) => `module.exports = { title: "${title}", story: "A story.", group: "${group}", viewport: "desk", steps: [] };`;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "index-"));
  fs.mkdirSync(path.join(root, "scenes"));
  fs.mkdirSync(path.join(root, "out"));
  fs.writeFileSync(path.join(root, "scenes", "01-alpha.js"), scene("Alpha", "intake"));
  fs.writeFileSync(path.join(root, "scenes", "02-beta.js"), scene("Beta", "build"));
  fs.writeFileSync(path.join(root, "out", "01-alpha.json"), JSON.stringify({
    durationMs: 6000, recordedAt: "2026-10-21T07:00:00Z", consoleCommit: "c0ffee0000", designCommit: "d00d000000", steps: [{ index: 1 }, { index: 2 }],
  }));
  for (const n of [1, 2]) fs.writeFileSync(path.join(root, "out", `01-alpha-${n}.png`), "");
  return build(path.join(root, "scenes"), path.join(root, "out"), README);
}

test("the page lists every scene file", () => {
  const html = fixture();
  assert.match(html, /Alpha/);
  assert.match(html, /Beta/);
  assert.equal((html.match(/<article /g) || []).length, 2);
  assert.match(html, /href="out\/01-alpha-2\.png"/);
});

test("a scene without a sidecar renders as not recorded, with no video", () => {
  const html = fixture();
  const beta = html.slice(html.indexOf('id="02-beta"'));
  const card = beta.slice(0, beta.indexOf("</article>"));
  assert.match(card, /not recorded/);
  assert.doesNotMatch(card, /<video/);
  assert.match(html, /<b>1<\/b><span>scenes recorded/);
  assert.match(html, /<b>0\.1<\/b><span>minutes of video/);
});

test("a rendered composition counts neither as a recorded scene nor as one not recorded", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "index-"));
  for (const d of ["scenes", "out", "video/cut"]) fs.mkdirSync(path.join(root, d), { recursive: true });
  fs.writeFileSync(path.join(root, "scenes", "02-beta.js"), scene("Beta", "build"));
  fs.writeFileSync(path.join(root, "video", "cut", "meta.json"), JSON.stringify({ title: "Cut", story: "A cut." }));
  fs.writeFileSync(path.join(root, "out", "p-cut.json"), JSON.stringify({ durationMs: 9000, steps: [] }));
  const html = build(path.join(root, "scenes"), path.join(root, "out"), README);
  assert.match(html, /<b>0<\/b><span>scenes recorded/);
  assert.match(html, /<b>1<\/b><span>scenes not recorded/);
});
