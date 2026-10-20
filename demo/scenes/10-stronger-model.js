const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const agent = "#drawer .top-block dd:last-of-type .mono";

// #107's life, offsets in seconds after its creation: the first attempt on small fails the acceptance job, its finding
// goes to the stronger class, and the second attempt runs on big and passes.
const confirmation = {
  phases: [
    { from: 0, status: "queued" },
    { from: 2 * MIN, status: "running", gate: "session", model: "small", spent: 0.05 },
    { from: 18.5 * MIN, status: "in-review", gate: "checks", spent: 0.31, pr: true },
    { from: 26 * MIN, status: "running", gate: "session", model: "big" },
    { from: 29 * MIN, spent: 0.52 },
    { from: 40.5 * MIN, status: "in-review", gate: "checks", spent: 1.06 },
    { from: 47 * MIN, gate: "review" },
    { from: 53 * MIN, gate: "merge-queue", spent: 1.18 },
  ],
  steps: [
    state.intake(0, 20),
    ...story.session(107, 1, 2 * MIN, 18 * MIN, { model: "small" }),
    state.checks(18.5 * MIN, 25 * MIN, "acceptance"),
    state.findings(25 * MIN + 5, { stage: "checks", to: "stronger", attempt: 1, list: [story.checksFailed[107]] }),
    ...story.session(107, 2, 26 * MIN, 40 * MIN, { model: "big" }),
    state.checks(40.5 * MIN, 47 * MIN),
    story.review(107, 1, 47 * MIN, 52 * MIN, "s-2"),
  ],
};

// Monday's and Tuesday's cards are done: issue, age, done after (hours) and spend, six hours after Wednesday morning's board
const finished = [[101, 53, 2, 1.12], [102, 52.4, 2.9, 0.64], [103, 51.4, 1.4, 0.31], [104, 27, 1, 0.48]];

// wednesday is the board a minutes after #107's filing
function wednesday(now, a) {
  const b = story.board([
    story.life(now, 107, a * MIN, confirmation),
    ...finished.map(([issue, age, after, spent]) => story.done(now, issue, age * HOUR, after * HOUR, spent)),
  ]);
  return state.scene(now, { ...b, spend: 6.4 + (b.tasks[0].SpentEUR ?? 0), chatSpend: 0.38 });
}

module.exports = {
  title: "The stronger model after a failure",
  story: "The confirmation mail's first attempt on the small class fails the acceptance job; the second attempt runs on the big class, " +
    "and the drawer shows the model and the spend change.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => wednesday(now, 25.5), actions: [{ goto: "/" }, { click: ui.open(107) }, { waitFor: agent }], hold: 3000 },
    { state: () => null, actions: [{ click: ui.tab("activity") }, { waitFor: ui.step("stage_findings") }, { hover: ui.step("stage_findings") }], hold: 4000 },
    { state: (now) => wednesday(now, 31), actions: [{ click: ui.tab("chat") }, { waitFor: "#session-log .msg" }], hold: 4000 },
    { state: (now) => wednesday(now, 53.5), actions: [{ click: ui.tab("overview") }, { waitFor: agent }], hold: 3500 },
  ],
};
