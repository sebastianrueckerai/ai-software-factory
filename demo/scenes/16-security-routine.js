const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const scan = ui.ghost("security-scan");

// Thursday night of week 1: the nightly scan at 02:00 finds path-to-regexp 0.1.7 through express 4.19.2 and files
// #108 a minute later; the bump merges and is live before 03:00. Offsets are seconds after #108's creation.
const merge = story.merges[108];
const bump = {
  phases: [
    { from: 0, status: "queued" },
    { from: MIN, status: "running", gate: "session", model: "small", spent: 0.03 },
    { from: 13 * MIN, status: "in-review", gate: "checks", spent: 0.17, pr: true },
    { from: 20 * MIN, gate: "review" },
    { from: 26 * MIN, gate: "merge-queue", spent: 0.29 },
    ...story.merging(merge, 0.29),
  ],
  steps: [
    state.intake(0, 15),
    ...story.session(108, 1, MIN, 12.5 * MIN, { model: "small" }),
    state.checks(13 * MIN, 20 * MIN),
    story.review(108, 1, 20 * MIN, 25 * MIN, "s-1"),
    ...story.merge(108, merge),
  ],
  card: { author: "factory-agent", source: "routine" },
};

// the week's cards so far are done: issue, done after, spend
const finished = [[101, 2 * HOUR, 1.12], [102, 2.9 * HOUR, 0.64], [103, 1.4 * HOUR, 0.31], [104, HOUR, 0.48], [107, 64 * MIN, 1.18]];

// night is the board at hm on Thursday: the four routines in Queued, the scan's card open until it is done
function night(now, hm) {
  const at = story.date(1, "thu", hm);
  const age = story.ageAt(108, at);
  const card = story.life(now, 108, age, bump);
  const open = age < merge.live ? { "security-scan": card.task } : {};
  return state.scene(now, {
    ...story.board([card, ...story.doneAt(now, at, finished)]), ...story.routinesAt(now, at, { open }),
    events: story.mergeEvents(now, 108, age, merge), spend: 7.9 + (card.task.SpentEUR ?? 0), chatSpend: 0.38,
  });
}

module.exports = {
  title: "The security routine",
  story: "The nightly security scan finds a vulnerable dependency and files the bump card; the bump builds, passes its gates and is live before morning.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => night(now, "02:02"), actions: [{ goto: "/" }, { hover: `${ui.face(108)} .chip.routine` }], hold: 2500 },
    {
      state: () => null,
      actions: [{ click: `${scan} button.open` }, { waitFor: ui.tab("runs") }, { click: ui.tab("runs") }, { waitFor: "#drawer .life.runs" }, { hover: "#drawer .acts" }],
      hold: 4500,
    },
    {
      state: (now) => night(now, "02:22"),
      // the board settles its stream's first redraw before the drawer opens
      actions: [{ goto: "/" }, { wait: 1000 }, { click: ui.open(108) }, { waitFor: ui.tab("overview") }, { click: ui.tab("overview") }, { waitFor: ui.objective }, { click: ui.objective }],
      hold: 4500,
    },
    { state: (now) => night(now, "03:10"), actions: [{ goto: "/" }, { hover: scan }], hold: 3000 },
  ],
};
