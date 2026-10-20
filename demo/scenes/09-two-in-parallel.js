const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;

// #120 and #121 waited overnight on the morning's questions and took a slot with the answers
const since = (issue, a) => story.ageAt(issue, story.answeredAt[issue]) + a * MIN;

// morning is the board a minutes after the answers; Monday's bump and #116 are done
function morning(now, a) {
  const cards = [
    story.life(now, 120, since(120, a), story.lives[120]), story.life(now, 121, since(121, a), story.lives[121]),
    story.routineCard(now, 115), story.done(now, 116, 21 * HOUR, 90 * MIN, 1.04),
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
