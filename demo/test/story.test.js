const test = require("node:test");
const assert = require("node:assert/strict");
const s = require("../lib/state");
const story = require("../lib/story");
const now = new Date("2026-10-20T12:00:00Z");

test("life is the card in the phase its age reached, its gate open since the phase that set it", () => {
  const phases = [{ from: 0, status: "queued" }, { from: 60, status: "running", gate: "session", model: "small", spent: 0.1 }, { from: 300, spent: 0.2 }];
  const { task, objects } = story.life(now, 103, 600, { phases, steps: [s.sessionStart(60, { model: "small" })] });
  assert.deepEqual([task.Status, task.Gate, task.GateSince, task.ModelAlias, task.SpentEUR], ["running", "session", "2026-10-20T11:51:00.000Z", "small", 0.2]);
  assert.equal("PRNumber" in task, false);
  // #103's first session started 9 minutes ago: its words at 30 s, 4 min and 9 min are said, the one at 17 min not yet
  assert.equal(objects[`sessions/${task.ID}/s-1.jsonl`].trim().split("\n").length, 3);
});
test("life ends a done card at its phase's start, without a gate", () => {
  const { task } = story.life(now, 103, 5400, { phases: [{ from: 0, status: "in-review", gate: "review", pr: true }, { from: 5040, status: "done" }] });
  assert.equal(task.FinishedAt, "2026-10-20T11:54:00.000Z");
  assert.equal("Gate" in task, false);
  assert.equal(task.PRNumber, 203);
});
test("life admits a card at its admitted offset", () => {
  const { task } = story.life(now, 117, 1000, { admitted: 400, phases: [{ from: 0, status: "running", gate: "session" }] });
  assert.equal(task.AdmittedAt, "2026-10-20T11:50:00.000Z");
  assert.equal(task.CreatedAt, "2026-10-20T11:43:20.000Z");
});
