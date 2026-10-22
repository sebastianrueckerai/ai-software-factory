const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const agent = "#drawer .top-block dd:last-of-type .mono";
// the second session's start row, on big; the cursor rests on its time, off the words
const bigStart = `${ui.step("session_start")}:has(code:has-text('"model":"big"'))`;

// Monday's and Tuesday's cards are done: issue, age, done after (hours) and spend, six hours after Wednesday morning's board
const finished = [[101, 53, 2, 1.12], [102, 52.4, 2.9, 0.64], [103, 51.4, 1.4, 0.31], [104, 27, 1, 0.48]];

// wednesday is the board a minutes after #107's filing
function wednesday(now, a) {
  const b = story.board([
    story.life(now, 107, a * MIN, story.lives[107]),
    ...finished.map(([issue, age, after, spent]) => story.done(now, issue, age * HOUR, after * HOUR, spent)),
  ]);
  return state.scene(now, { ...b, ...story.spending(story.at(107, a * MIN)) });
}

module.exports = {
  title: "The stronger model after a failure",
  story: "The receipt card's first attempt on the small class fails the acceptance job. The second attempt runs on the big class, " +
    "and the drawer shows the model and the spend change.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  steps: [
    // the board first, so a viewer finds the card before its drawer opens
    { state: (now) => wednesday(now, 25.5), actions: [{ goto: "/" }, { hover: ui.idle }], hold: 2500, boxes: { card: ui.face(107) } },
    { state: () => null, actions: [{ click: ui.open(107) }, { waitFor: agent }], hold: 3500, boxes: { drawer: "#drawer", agent: "#drawer .top-block" } },
    {
      state: () => null, actions: [{ click: ui.tab("activity") }, { waitFor: ui.row("failure") }, { hover: `${ui.row("failure")} meter` }], hold: 4000,
      boxes: { drawer: "#drawer", failure: ui.row("failure") },
    },
    {
      state: (now) => wednesday(now, 31),
      actions: [{ click: ui.tab("activity") }, { waitFor: bigStart }, { hover: `${bigStart} td:first-child` }],
      hold: 4500, boxes: { drawer: "#drawer", big: bigStart },
    },
    { state: () => null, actions: [{ click: ui.tab("chat") }, { waitFor: "#session-log .msg" }], hold: 4500, boxes: { drawer: "#drawer", log: "#session-log" } },
    { state: (now) => wednesday(now, 53.5), actions: [{ click: ui.tab("overview") }, { waitFor: agent }], hold: 4000, boxes: { drawer: "#drawer", agent: "#drawer .top-block" } },
  ],
};
