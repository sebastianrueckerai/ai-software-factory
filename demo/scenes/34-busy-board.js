const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const INBOX = 1;
const T = story.filed[113];

// The landing page's hero: one busy afternoon in a single frame, every column of the board full. Three cards need
// Sebastian (a question, a budget stop, a merge of a payments change), one waits on another, five build, six are done,
// and he answers the budget stop in the chat by splitting the card. Ages are seconds since each card's filing, picked
// so each card stands in the phase its column shows.
const refund = story.approvals.refund;
const seasonPass = story.lives[120].phases.find((p) => p.ask).ask;

function busy(now) {
  const b = story.board([
    story.life(now, 120, 40 * MIN, story.lives[120]),
    story.life(now, 110, 380 * MIN, story.lives[110]),
    story.life(now, 122, 45 * MIN, story.lives[122]),
    story.life(now, 112, 9 * HOUR, { ...story.lives[112], card: { waitingOn: "#110" } }),
    story.life(now, 102, 50 * MIN, story.lives[102]),
    story.life(now, 103, 25 * MIN, story.lives[103]),
    story.life(now, 107, 49 * MIN, story.lives[107]),
    story.life(now, 121, 530 * MIN, story.lives[121]),
    story.life(now, 123, 12 * MIN, story.lives[123]),
    ...[[101, 2 * HOUR, 1.12], [104, HOUR, 0.48], [108, 50 * MIN, 0.22], [109, 155 * MIN, 1.84], [111, 270 * MIN, 0.92], [115, 52 * MIN, 0.31]]
      .map(([issue, after, spent]) => story.done(now, issue, after + 3 * HOUR, after, spent)),
  ]);
  const queued = [
    story.card(now, 105, { status: "done", lane: "plan", age: 26 * HOUR, finished: 9 * HOUR, spent: 0.46, model: "big" }),
    story.card(now, 125, { status: "queued", lane: "ready", age: 4 * MIN }),
    story.card(now, 118, { status: "backlog", lane: "backlog", age: 26 * HOUR }),
  ];
  const budget = story.asking(now, story.asks.budget, 17 * MIN, INBOX);
  const pass = story.asking(now, seasonPass, 39 * MIN, INBOX);
  const chat = [
    state.livePoke(now, { issue: 109, title: story.cards[109].title, spent: 1.84, age: 25 * MIN, conversation: INBOX }),
    budget.inbox,
  ];
  return state.scene(now, {
    tasks: [...b.tasks, ...queued], objects: b.objects, deps: { 112: [110] },
    events: [...budget.events, ...pass.events], alerts: [...budget.alerts, ...pass.alerts],
    approvals: [state.approval(now, { ...refund, spec: story.mergeSpec(refund), age: 6 * MIN })],
    chat, seen: { [INBOX]: chat.length }, inbox: INBOX, open: INBOX, ...story.spending(T),
    replies: [state.reply(state.say(story.replies.split), ...[story.filing(113, "ready"), story.filing(114, "backlog")].map((f) => state.call("new_card", f)))],
  });
}

module.exports = {
  title: "A busy board",
  story: "One afternoon in one frame: three cards need Sebastian, one waits on another, five build and six are done. He answers " +
    "the budget stop in the chat, and the agent proposes the split as two cards.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: busy, actions: [{ goto: "/" }], hold: 1500 },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", story.requests.split] }, { press: "Enter" }, { waitFor: ui.doIt }, { wait: 2000 }],
      hold: 1500,
    },
    // the reload draws the thread from the store and leaves the cursor's ring hidden, for a still with no pointer in it
    { state: () => null, actions: [{ goto: "/" }, { waitFor: ui.doIt }], hold: 2500 },
  ],
};
