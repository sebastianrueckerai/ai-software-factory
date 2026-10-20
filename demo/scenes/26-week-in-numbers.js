const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

// sunday is the metrics page on Sunday evening of week 2: the week against week 1
const sunday = (now) => {
  const at = story.weekEnd(2);
  return state.scene(now, { metrics: story.report(now, at, 7), ...story.spending(at) });
};

module.exports = {
  title: "The week in numbers",
  story: "The metrics page reads the second week against the first: deploys, lead time, cost per card, tool spend and the escalations.",
  group: "metrics",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: sunday, actions: [{ goto: ui.metrics(7) }, { hover: ui.figure("deploys / week") }], hold: 3000 },
    { state: () => null, actions: [{ hover: ui.figure("lead time, push to live") }], hold: 2500 },
    { state: () => null, actions: [{ hover: ui.figure("per card, median") }], hold: 2500 },
    { state: () => null, actions: [{ scroll: ui.section("m-cost") }, { hover: ui.figure("tools / week") }], hold: 2500 },
    { state: () => null, actions: [{ hover: ui.figure("escalations") }], hold: 3000 },
  ],
};
