const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const sup = story.supervisor;

// #117 waited overnight on its question and took a slot at A, after the morning's answer: its first session circles
// on the same failing test, the flip-flop detector trips, and the supervisor redirects it to a second session.
const A = 8 * HOUR + 45 * MIN;
const reminder = {
  admitted: A,
  phases: [
    { from: A + MIN, status: "running", gate: "session", model: "small", spent: 0.04 },
    { from: A + 8 * MIN, spent: 0.13 },
    { from: A + 14 * MIN, spent: 0.22 },
    { from: A + 16 * MIN, gate: "session", spent: 0.26 },
    { from: A + 22 * MIN, spent: 0.33 },
    { from: A + 25.5 * MIN, status: "in-review", gate: "checks", spent: 0.38, pr: true },
  ],
  steps: [
    state.intake(0, 20),
    state.supervisor(A + 15 * MIN, sup),
    ...story.session(sup.issue, 1, A + MIN, A + 15 * MIN + 5, { model: "small", outcome: "redirect" }),
    ...story.session(sup.issue, 2, A + 16 * MIN, A + 25 * MIN, { model: "small" }),
    state.checks(A + 25.5 * MIN, A + 32 * MIN),
  ],
};

// morning is the board a minutes after #117 took its slot; Monday's bump and #116 are done
function morning(now, a) {
  const cards = [story.life(now, sup.issue, A + a * MIN, reminder), story.routineCard(now, 115), story.done(now, 116, 21 * HOUR, 90 * MIN, 1.04)];
  return state.scene(now, { ...story.board(cards), spend: 13.1, chatSpend: 0.66 });
}

module.exports = {
  title: "The supervisor steps in",
  story: "The reminder card's session runs the same failing test three times, flipping its code back and forth; the flip-flop detector trips, " +
    "the supervisor ends the session, and the next one starts from its insight.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  steps: [
    {
      state: (now) => morning(now, 14.5),
      actions: [{ goto: "/" }, { click: ui.open(sup.issue) }, { waitFor: ui.tab("chat") }, { click: ui.tab("chat") }, { waitFor: "#session-log .msg" }],
      hold: 5000,
    },
    { state: (now) => morning(now, 16.5), actions: [{ click: ui.tab("activity") }, { waitFor: ui.step("supervisor") }, { hover: ui.step("supervisor") }], hold: 5500 },
    { state: (now) => morning(now, 24.5), actions: [{ click: ui.tab("chat") }, { waitFor: "#session-log .msg" }], hold: 4500 },
  ],
};
