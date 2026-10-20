const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const INBOX = 1;
const asks = story.asks.morning;
const ASKED = MIN;

// wednesday is week 2's Wednesday at the story's time t: the three cards filed overnight as their lives reached, each
// waiting on its question until its answer; Monday's bump and #116 are done. The inbox holds the three questions in the
// order they came, unread until the morning's answers.
function wednesday(now, t) {
  const age = (issue) => story.ageAt(issue, t);
  const asked = asks.slice().sort((x, y) => story.filed[x.issue] - story.filed[y.issue])
    .map((a) => ({ a, ...story.asking(now, a, age(a.issue) - ASKED, INBOX) }));
  const answers = asks.filter((a) => story.answeredAt[a.issue] <= t).map((a) => story.answered(now, a, (t - story.answeredAt[a.issue]) / 1000, "button"));
  const b = story.board([
    ...asks.map((a) => story.life(now, a.issue, age(a.issue), story.lives[a.issue])),
    story.routineCard(now, 115), story.done(now, 116, age(116), 90 * MIN, 1.04),
  ]);
  const chat = asked.map((x) => x.inbox);
  return state.scene(now, {
    ...b, events: [...asked.flatMap((x) => x.events), ...answers], alerts: asked.flatMap((x) => x.alerts),
    chat, seen: { [INBOX]: answers.length ? chat.length : 0 }, inbox: INBOX, open: INBOX, spend: 12.4, chatSpend: 0.61,
  });
}

const before = new Date(story.answeredAt[asks[0].issue].getTime() - 30 * 1000);
const after = new Date(story.answeredAt[asks[2].issue].getTime() + 90 * 1000);

// press answers ask on its card, which slides to In progress at once
const press = (a) => ({
  state: () => null,
  actions: [{ hover: ui.choice(a.issue, a.answer) }, { wait: 500 }, { click: ui.choice(a.issue, a.answer) }, { wait: 1200 }],
  hold: 700,
});

module.exports = {
  title: "The morning page",
  story: "Three cards filed overnight each asked one question and waited. In the morning Sebastian answers all three on the board, " +
    "and the cards take their slots and start building.",
  group: "gates",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => wednesday(now, before), actions: [{ goto: "/" }, { hover: `#chat-log .msg:has-text("#${asks[0].issue} needs you") .av` }], hold: 3500 },
    ...asks.map(press),
    { state: (now) => wednesday(now, after), actions: [{ hover: ui.park }], hold: 3500 },
  ],
};
