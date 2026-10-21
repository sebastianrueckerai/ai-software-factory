const story = require("../lib/story");
const ui = require("../lib/ui");
const { afterSplit } = require("./20-cap-fires");

const MIN = 60;
const ask = story.asks.editor;
// #113's first session asks 2.75 minutes after the split, and Sebastian answers in the chat 28 minutes after it;
// offsets in seconds after the split's first Do it, #113's creation
const ASKED = 2.75 * MIN;
const ANSWERED = 28 * MIN;

// editor is the board s seconds after the split: the map card's question in Needs you and in the inbox until the
// answer, then the answer row's rows as the console stores them; the question is unread until then
function editor(now, s, o = {}) {
  const asked = story.asking(now, ask, s - ASKED, 1);
  const answer = s > ANSWERED ? story.answerRows(now, ask, s - ANSWERED, 1) : [];
  return afterSplit(now, s, {
    rows: [asked.inbox, ...answer], events: [...asked.events, ...(answer.length ? [story.answered(now, ask, s - ANSWERED, "button")] : [])],
    alerts: asked.alerts, unread: answer.length ? 0 : 1, ...o,
  });
}

const answered = `#chat-log .msg:has-text("Answered #${ask.issue} with")`;

module.exports = {
  title: "A design question",
  story: "The map card's session asks which map editor to build on, with three choices. Sebastian answers in the chat, " +
    "and the card's next session builds on his pick.",
  group: "gates",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => editor(now, ANSWERED - 30), actions: [{ goto: "/" }, { hover: `#chat-log .msg:has-text("#${ask.issue} needs you") .av` }], hold: 3500, boxes: { ask: `#chat-log .msg:has-text("#${ask.issue} needs you")`, chat: ".chat" } },
    { state: () => null, actions: [{ hover: ui.answer(ask.answer) }, { wait: 800 }, { click: ui.answer(ask.answer) }, { waitFor: answered }], hold: 2500, boxes: { chat: ".chat" } },
    // the reload reads the answer's rows on the seed's clock, which the session's stamps share
    {
      state: (now) => editor(now, ANSWERED + 90),
      actions: [{ goto: "/" }, { click: ui.open(ask.issue) }, { waitFor: ui.tab("chat") }, { click: ui.tab("chat") }, { waitFor: "#session-log .msg" }],
      hold: 4000,
      boxes: { drawer: "#drawer" },
    },
  ],
};
