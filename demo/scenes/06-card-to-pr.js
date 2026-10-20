const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;

// Monday afternoon from #103's filing on the form: #101 waits in the merge queue and merges, #102 builds a second time
// after a failed test. Each card's offsets are seconds after its own creation.
const waitlist = {
  phases: [{ from: 92 * MIN, status: "in-review", gate: "merge-queue", model: "small", spent: 0.71, pr: true }, { from: 120 * MIN, status: "done", spent: 1.12 }],
  steps: [
    state.intake(5 * MIN, 5.5 * MIN),
    ...story.session(101, 1, 6 * MIN, 24 * MIN, { model: "small" }),
    state.checks(24 * MIN + 10, 31 * MIN),
    story.review(101, 1, 31 * MIN, 89 * MIN, "s-1"),
  ],
};
const schedule = {
  phases: [
    { from: 39 * MIN, status: "running", gate: "session", model: "small", spent: 0.22 },
    { from: 65 * MIN, status: "in-review", gate: "checks", spent: 0.3, pr: true },
    { from: 73 * MIN, status: "running", gate: "session", spent: 0.38 },
    { from: 90 * MIN, spent: 0.47 },
    { from: 107 * MIN, status: "in-review", gate: "checks", spent: 0.55 },
    { from: 114 * MIN, gate: "review", spent: 0.64 },
    { from: 121 * MIN, gate: "merge-queue" },
  ],
  steps: [
    state.intake(38 * MIN, 38 * MIN),
    ...story.session(102, 1, 39 * MIN, 65 * MIN, { model: "small" }),
    state.checks(65 * MIN + 10, 72 * MIN, "test"),
    ...story.session(102, 2, 73 * MIN, 107 * MIN, { model: "small" }),
    state.checks(107 * MIN + 10, 114 * MIN),
    story.review(102, 1, 114 * MIN, 120 * MIN, "s-2"),
  ],
};
const teacher = {
  phases: [
    { from: 0, status: "queued" },
    { from: 3 * MIN, status: "running", gate: "session", model: "small", spent: 0.08 },
    { from: 22 * MIN, status: "in-review", gate: "checks", spent: 0.19, pr: true },
    { from: 30 * MIN, gate: "review" },
    { from: 45 * MIN, spent: 0.27 },
    { from: 46 * MIN, gate: "merge-queue" },
    { from: 84 * MIN, status: "done", spent: 0.31 },
  ],
  steps: [
    state.intake(0, 20),
    ...story.session(103, 1, 3 * MIN, 21.5 * MIN, { model: "small" }),
    state.checks(22 * MIN, 30 * MIN),
    story.review(103, 1, 30 * MIN, 45 * MIN, "s-1"),
  ],
};
const pr = story.cards[103].pr;

// monday is the board a minutes after #103's filing
function monday(now, a) {
  const b = story.board([story.life(now, 101, (96 + a) * MIN, waitlist), story.life(now, 102, (57 + a) * MIN, schedule), story.life(now, 103, a * MIN, teacher)]);
  return state.scene(now, { ...b, prFiles: { [pr]: story.files[pr] }, spend: 0.31 + b.tasks.reduce((sum, t) => sum + (t.SpentEUR ?? 0), 0), chatSpend: 0.18 });
}

module.exports = {
  title: "Card to pull request",
  story: "A card filed by hand starts: it waits in the queue, builds with the drawer on the agent's words, opens its pull request, " +
    "passes the checks and the review, and is done.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => monday(now, 1), actions: [{ goto: "/" }, { hover: ui.face(103) }], hold: 2000 },
    {
      state: (now) => monday(now, 12),
      actions: [{ click: ui.open(103) }, { waitFor: ui.tab("chat") }, { click: ui.tab("chat") }, { waitFor: "#session-log .msg" }],
      hold: 3500,
    },
    { state: (now) => monday(now, 26), actions: [{ click: ui.tab("files") }, { waitFor: "#drawer table.files" }], hold: 3000 },
    { state: (now) => monday(now, 40), actions: [{ click: ui.tab("activity") }, { waitFor: "#drawer table.gates" }], hold: 3500 },
    {
      state: (now) => monday(now, 52),
      actions: [{ click: ui.tab("activity") }, { waitFor: ui.row("merge-queue") }, { hover: `${ui.row("merge-queue")} meter` }],
      hold: 3500,
    },
    { state: (now) => monday(now, 84), actions: [{ click: "#drawer-close" }, { hover: ui.face(103) }], hold: 2500 },
  ],
};
