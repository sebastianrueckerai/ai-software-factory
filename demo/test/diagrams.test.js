const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const demo = path.join(__dirname, "..");
const scenes = fs.readdirSync(path.join(demo, "scenes")).map((f) => require(path.join(demo, "scenes", f))).filter((s) => s.page);

test("the diagram scenes are the four pages", () => {
  assert.deepStrictEqual(scenes.map((s) => s.page).sort(),
    ["diagrams/gates.html", "diagrams/identity.html", "diagrams/ladder.html", "diagrams/loop.html"]);
});

test("a diagram scene presses once per step of its page and holds on the full diagram", () => {
  for (const s of scenes) {
    const html = fs.readFileSync(path.join(demo, s.page), "utf8");
    const last = Math.max(...[...html.matchAll(/data-step="(\d+)"/g)].map((m) => Number(m[1])));
    assert.strictEqual(s.steps.length, last, s.page);
    assert.ok(s.steps.every((st) => st.state === undefined && st.actions.length === 1 && st.actions[0].press === "ArrowRight"), s.page);
    assert.deepStrictEqual(s.steps.map((st) => st.hold), [...Array(last - 1).fill(1800), 2500], s.page);
  }
});
