const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const ISSUE = 126;
const c = story.cards[ISSUE];
const merge = story.merges[ISSUE];
// main's head when the issue came: the share link's commit, the last merge before it
const BASE = story.sessions[125]["s-2"].commit;

// #126's life, offsets in seconds after the webhook filed it from lena.h's issue: one session reproduces the fault and
// fixes it, the checks pass, the reproduction gate runs the issue's command at the base (exit 1) and at the head (exit 0),
// the review approves, and the fix merges and goes live. The card carries the issue's repro command.
const fix = {
  phases: [
    { from: 0, status: "queued" },
    { from: MIN, status: "running", gate: "session", model: "small", spent: 0.03 },
    { from: 9 * MIN, status: "in-review", gate: "checks", spent: 0.14, pr: true },
    { from: 15 * MIN, gate: "reproduction" },
    { from: 19 * MIN, gate: "review" },
    { from: 23 * MIN, gate: "merge-queue", spent: 0.21 },
    ...story.merging(merge, 0.21),
  ],
  steps: [
    state.intake(0, 15),
    ...story.session(ISSUE, 1, MIN, 8.5 * MIN, { model: "small" }),
    state.checks(9 * MIN, 15 * MIN),
    state.reproduction(15 * MIN, 19 * MIN, { pr: c.pr, commit: story.sessions[ISSUE]["s-1"].commit, command: c.repro, base: BASE, baseExit: 1, exit: 0 }),
    story.review(ISSUE, 1, 19 * MIN, 22 * MIN, "s-1"),
    ...story.merge(ISSUE, merge),
  ],
  card: { author: c.reporter, source: "webhook" },
};

// the week's earlier cards are done: issue, done after, spend; the weekly bump and the performance read are on their
// runs' clock
const finished = [
  [116, 1.5 * HOUR, 1.04], [117, 9.5 * HOUR, 0.45], [120, 9.8 * HOUR, 0.86], [121, 9 * HOUR + 20 * MIN, 0.46],
  [118, 77 * MIN, 0.36], [119, 34 * MIN, 0.29], [122, story.merges[122].live, 0.61], [125, story.merges[125].live, 0.41],
];

// friday is week 2's Friday afternoon s seconds after the issue came, #126 on the board from its filing on
function friday(now, s) {
  const t = story.at(ISSUE, s);
  const cards = [
    ...(s >= 0 ? [story.life(now, ISSUE, s, fix)] : []),
    story.routineCard(now, 115, t), story.routineCard(now, 123, t), ...story.doneAt(now, t, finished),
  ];
  const b = story.board(cards);
  return state.scene(now, { ...b, events: story.mergeEvents(now, ISSUE, s, merge), ...story.spending(t) });
}

const repro = `${ui.step("gate_reproduction")}:has(code:has-text('"base_exit":1'))`;
const live = `${ui.step("final")}:has(code:has-text("live: covered"))`;

module.exports = {
  title: "An issue to a fix",
  story: "A developer files an issue with a repro block on the repository; the webhook files the card within a minute, the agent " +
    "reproduces the fault and fixes it, the reproduction gate runs the issue's command red at the base and green at the head, " +
    "and the fix merges with no human in between.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => friday(now, -30), actions: [{ goto: "/" }, { hover: ui.idle }], hold: 2000, boxes: { queued: '#board .column[aria-labelledby="col-1"]' } },
    { state: (now) => friday(now, 50), actions: [{ waitFor: ui.face(ISSUE) }, { hover: ui.open(ISSUE) }], hold: 2500, boxes: { card: ui.face(ISSUE) } },
    // a queued card's drawer opens on Overview, so no tab click: a click on the open tab reloads the drawer under the next action
    { state: () => null, actions: [{ click: ui.open(ISSUE) }, { waitFor: ui.objective }, { click: ui.objective }], hold: 4000, boxes: { drawer: "#drawer" } },
    { state: (now) => friday(now, 6 * MIN), actions: [{ click: ui.tab("chat") }, { waitFor: "#session-log .msg" }], hold: 4000 },
    {
      state: (now) => friday(now, 24 * MIN),
      actions: [{ click: ui.tab("activity") }, { waitFor: ui.row("reproduction") }, { hover: `${ui.row("reproduction")} meter` }],
      hold: 3000,
      boxes: { drawer: "#drawer", row: ui.row("reproduction") },
    },
    { state: () => null, actions: [{ scroll: repro }, { wait: 800 }, { hover: `${repro} code` }], hold: 4000, boxes: { drawer: "#drawer", repro } },
    {
      state: (now) => friday(now, 40 * MIN),
      actions: [{ click: "#drawer-close" }, { click: ui.open(ISSUE) }, { waitFor: ui.tab("activity") }, { click: ui.tab("activity") }, { waitFor: live }, { hover: live }],
      hold: 3000,
    },
    { state: () => null, actions: [{ click: "#drawer-close" }, { hover: ui.face(ISSUE) }], hold: 2500 },
  ],
};
