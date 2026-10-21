const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

// read is the steps over week w's page, week 1 against the quiet week before it, week 2 against week 1: the delivery
// figures, then the cost and the escalations
const read = (w) => [
  { state: (now) => state.scene(now, story.metricsWeek(now, w)), actions: [{ goto: ui.metrics(7) }, { hover: ui.figure("card cycle") }], hold: 3000 },
  { state: () => null, actions: [{ scroll: ui.section("m-cost") }, { hover: ui.figure("per card, median") }], hold: 3000 },
  { state: () => null, actions: [{ hover: ui.figure("escalations") }], hold: 3000 },
];

module.exports = {
  title: "Before and after",
  story: "The metrics page a week apart: after the calendar's split into small cards, a card costs less and finishes sooner, " +
    "and the morning's questions raise the escalations.",
  group: "metrics",
  theme: "dark",
  viewport: "desk",
  steps: [...read(1), ...read(2)],
};
