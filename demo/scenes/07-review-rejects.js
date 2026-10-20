const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;

// #116's life, offsets in seconds after its creation: the review's first round finds a race, its finding goes back to
// the agent, and the second session's push passes the second round.
const cancel = {
  phases: [
    { from: 0, status: "queued" },
    { from: 2 * MIN, status: "running", gate: "session", model: "small", spent: 0.06 },
    { from: 30.5 * MIN, status: "in-review", gate: "checks", spent: 0.41, pr: true },
    { from: 37 * MIN, gate: "review" },
    { from: 44 * MIN, status: "running", gate: "session", spent: 0.52 },
    { from: 50 * MIN, spent: 0.66 },
    { from: 60.5 * MIN, status: "in-review", gate: "checks", spent: 0.86 },
    { from: 67 * MIN, gate: "review" },
    { from: 73 * MIN, gate: "merge-queue", spent: 0.97 },
  ],
  steps: [
    state.intake(0, 20),
    ...story.session(116, 1, 2 * MIN, 30 * MIN, { model: "small" }),
    state.checks(30.5 * MIN, 37 * MIN),
    story.review(116, 1, 37 * MIN, 43 * MIN, "s-1"),
    state.findings(43 * MIN + 5, { stage: "review", to: "agent", attempt: 1, list: story.reviews[116][0].findings }),
    ...story.session(116, 2, 44 * MIN, 60 * MIN, { model: "small" }),
    state.checks(60.5 * MIN, 67 * MIN),
    story.review(116, 2, 67 * MIN, 72 * MIN, "s-2"),
  ],
};

// week2 is the board a minutes after #116's filing, the week's dependency bump done
function week2(now, a) {
  return state.scene(now, { ...story.board([story.life(now, 116, a * MIN, cancel), story.done(now, 115, 26 * HOUR, 3 * HOUR, 0.38)]), spend: 12.4, chatSpend: 0.61 });
}

module.exports = {
  title: "The review rejects",
  story: "The stronger model's review finds a race in the cancel card's pull request; the finding goes back to the agent, " +
    "the second session takes the seat under a lock, and the review passes.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  steps: [
    {
      state: (now) => week2(now, 41),
      actions: [{ goto: "/" }, { click: ui.open(116) }, { waitFor: ui.tab("activity") }, { click: ui.tab("activity") }, { waitFor: ui.row("review") }],
      hold: 3000,
    },
    {
      state: (now) => week2(now, 46),
      actions: [{ click: ui.tab("activity") }, { waitFor: ui.row("concerns") }, { hover: `${ui.row("concerns")} meter` }],
      hold: 4000,
    },
    { state: (now) => week2(now, 56), actions: [{ click: ui.tab("chat") }, { waitFor: "#session-log .msg" }], hold: 4000 },
    {
      state: (now) => week2(now, 75),
      actions: [{ click: ui.tab("activity") }, { waitFor: ui.row("merge-queue") }, { scroll: "#drawer table.gates" }, { hover: `${ui.row("approve")} meter` }],
      hold: 4000,
    },
  ],
};
