const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;

// built is issue's card that took its slot with the morning's answer, M seconds after its creation, then built, pushed,
// passed its checks and review and merged; the offsets in minutes after M, spent at each of the four.
function built(issue, M, { start, push, review, done, spent }) {
  const at = (m) => M + m * MIN;
  return {
    admitted: M,
    phases: [
      { from: at(start), status: "running", gate: "session", model: "small", spent: spent[0] },
      { from: at(push + 0.5), status: "in-review", gate: "checks", spent: spent[1], pr: true },
      { from: at(push + 7), gate: "review" },
      { from: at(review + 1), gate: "merge-queue", spent: spent[2] },
      { from: at(done), status: "done", spent: spent[3] },
    ],
    steps: [
      state.intake(0, 20),
      ...story.session(issue, 1, at(start), at(push), { model: "small" }),
      state.checks(at(push + 0.5), at(push + 7)),
      story.review(issue, 1, at(push + 7), at(review), "s-1"),
    ],
  };
}

// #120 and #121 waited overnight on the morning's questions, #120 filed 10 minutes before #121; both took a slot with
// the answers, M after #121's filing
const M = 8 * HOUR + 40 * MIN;
const pass = built(120, M + 10 * MIN, { start: 1.5, push: 33, review: 47, done: 58, spent: [0.05, 0.71, 0.83, 0.86] });
const account = built(121, M, { start: 1, push: 19, review: 31, done: 40, spent: [0.04, 0.36, 0.44, 0.46] });

// morning is the board a minutes after the answers; Monday's bump and #116 are done
function morning(now, a) {
  const cards = [
    story.life(now, 120, M + 10 * MIN + a * MIN, pass), story.life(now, 121, M + a * MIN, account),
    story.done(now, 115, 47 * HOUR, 3 * HOUR, 0.38), story.done(now, 116, 21 * HOUR, 90 * MIN, 1.04),
  ];
  return state.scene(now, { ...story.board(cards), spend: 13.8 + a * 0.02, chatSpend: 0.66 });
}

module.exports = {
  title: "Two cards in parallel",
  story: "The class pass and the account page build at the same time; each opens its pull request, passes its checks and review, and both merge.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => morning(now, 4), actions: [{ goto: "/" }, { hover: ui.face(120) }], hold: 2000 },
    { state: (now) => morning(now, 22), actions: [{ hover: ui.face(121) }], hold: 2500 },
    { state: (now) => morning(now, 38), actions: [{ hover: ui.face(120) }], hold: 2500 },
    { state: (now) => morning(now, 44), actions: [{ hover: ui.face(121) }], hold: 2500 },
    { state: (now) => morning(now, 60), actions: [{ hover: ui.face(120) }], hold: 3000 },
  ],
};
