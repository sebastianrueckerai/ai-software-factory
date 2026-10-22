const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const sup = story.supervisor;

// #117 waited overnight on its question and took a slot at A, the morning's answer, seconds after its filing
const A = story.ageAt(sup.issue, story.answeredAt[sup.issue]);
const challenge = story.lives[sup.issue];

// morning is the board a minutes after #117 took its slot; Monday's bump and #116 are done
function morning(now, a) {
  const cards = [story.life(now, sup.issue, A + a * MIN, challenge), story.routineCard(now, 115), story.done(now, 116, 21 * HOUR, 90 * MIN, 1.04)];
  return state.scene(now, { ...story.board(cards), ...story.spending(story.at(sup.issue, A + a * MIN)) });
}

module.exports = {
  title: "The supervisor steps in",
  story: "The daily challenge card's session runs the same failing test three times, flipping its code back and forth. The flip-flop detector " +
    "trips, the supervisor ends the session, and the next one starts from its insight.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  steps: [
    {
      // the board first, so a viewer finds the card before its session opens
      state: (now) => morning(now, 14.5), actions: [{ goto: "/" }, { hover: ui.idle }], hold: 2500, boxes: { card: ui.face(sup.issue) },
    },
    {
      state: () => null,
      actions: [{ click: ui.open(sup.issue) }, { waitFor: ui.tab("chat") }, { click: ui.tab("chat") }, { waitFor: "#session-log .msg" }],
      hold: 6000,
      boxes: { drawer: "#drawer", log: "#session-log" },
    },
    { state: (now) => morning(now, 16.5), actions: [{ click: ui.tab("activity") }, { waitFor: ui.step("supervisor") }, { hover: ui.step("supervisor") }], hold: 5500, boxes: { drawer: "#drawer", row: ui.step("supervisor") } },
    { state: (now) => morning(now, 24.5), actions: [{ click: ui.tab("chat") }, { waitFor: "#session-log .msg" }], hold: 4500, boxes: { drawer: "#drawer" } },
  ],
};
