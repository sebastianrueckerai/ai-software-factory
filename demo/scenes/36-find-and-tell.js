const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const find = story.steers.find;

// the turn takes two model calls: the first reads the board, the second proposes the steer to the card it found there
const reading = state.reply(state.call("board", {}));
const steering = state.reply(state.say(find.reply), state.call("steer", { task_id: state.id(find.issue), text: find.text }));

const finished = [[116, 49, 1.5, 1.04], [117, 30.75, 9.5, 0.45], [120, 30.8, 9.8, 0.86]];

// thursday is the board while the refund card builds a minutes in, with four more cards at work around it
function thursday(now, a, o = {}) {
  const b = story.board([
    story.life(now, find.issue, a * MIN, story.lives[find.issue]),
    story.life(now, 102, 50 * MIN, story.lives[102]),
    story.life(now, 103, 25 * MIN, story.lives[103]),
    story.life(now, 121, 530 * MIN, story.lives[121]),
    story.life(now, 123, 12 * MIN, story.lives[123]),
    story.routineCard(now, 115),
    ...finished.map(([issue, age, after, spent]) => story.done(now, issue, age * HOUR, after * HOUR, spent)),
  ]);
  return state.scene(now, { ...b, ...story.spending(story.at(find.issue, a * MIN)), ...o });
}

module.exports = {
  title: "Find the card and tell it",
  story: "Sebastian opens the refund card's session, then asks the chat to find out who builds the refund and pass on a line, " +
    "naming no card. The project agent reads the board, finds #122, proposes the message, he presses Do it, and the line arrives " +
    "in the running session.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  boxes: { chat: ".chat", progress: '#board .column[aria-labelledby="col-2"]' },
  steps: [
    { state: (now) => thursday(now, 14, { replies: [reading, steering] }), actions: [{ goto: "/" }, { hover: ui.idle }], hold: 3000, boxes: { card: ui.face(find.issue) } },
    {
      state: () => null,
      actions: [{ click: ui.open(find.issue) }, { waitFor: ui.tab("chat") }, { click: ui.tab("chat") }, { waitFor: "#session-log .msg" }],
      hold: 3500,
      boxes: { drawer: "#drawer", card: ui.face(find.issue) },
    },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", find.request] }, { press: "Enter" }, { waitFor: ui.doIt }, { wait: 3000 }, { hover: ui.doIt }],
      hold: 800,
      boxes: { drawer: "#drawer", proposal: "#chat-log .proposal >> nth=-1" },
    },
    {
      state: () => null,
      actions: [{ click: ui.doIt }, { waitFor: "#chat-log .applied" }, { waitFor: "#session-log .msg.you" }],
      hold: 4000,
      boxes: { drawer: "#drawer", you: "#session-log .msg.you" },
    },
  ],
};
