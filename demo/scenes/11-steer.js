const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const steer = story.steers.refund;

const steering = state.reply(state.say(steer.reply), state.call("steer", { task_id: state.id(steer.issue), text: steer.text }));

// #122 builds its first session from a minute after its filing; offsets in seconds after its creation
const refund = {
  phases: [{ from: 0, status: "queued" }, { from: MIN, status: "running", gate: "session", model: "small", spent: 0.04 }, { from: 8 * MIN, spent: 0.21 }],
  steps: [state.intake(0, 20), state.sessionStart(MIN, { model: "small" })],
};

// the week's earlier cards are done: issue, age, done after (hours) and spend
const finished = [[115, 75, 3, 0.38], [116, 49, 1.5, 1.04], [117, 30.75, 9.5, 0.45], [120, 30.8, 9.8, 0.86], [121, 30.7, 9.3, 0.46]];

// thursday is the board a minutes after #122's filing; o adds the chat and the events
function thursday(now, a, o = {}) {
  const b = story.board([
    story.life(now, steer.issue, a * MIN, refund),
    ...finished.map(([issue, age, after, spent]) => story.done(now, issue, age * HOUR, after * HOUR, spent)),
  ]);
  return state.scene(now, { ...b, spend: 16.2, chatSpend: 0.84, ...o });
}

// after is the state the Do it left seconds ago, a quarter minute after the first step: the thread as the console
// stored it, the steer among the card's events, and the session's answer to it; the open chat keeps the stamps it drew
function after(now) {
  const t = state.steeredThread(now, { said: steer.request, reply: steer.reply, issue: steer.issue, title: story.cards[steer.issue].title, text: steer.text, age: 8 });
  return thursday(now, 14.25, {
    chat: t.rows, seen: state.seen(t.rows), usedProposals: [t.proposal],
    events: [state.event(now, { issue: steer.issue, kind: "card_steered", actor: "sebastian", via: "chat", age: 5, detail: { text: steer.text } })],
  });
}

module.exports = {
  title: "Steering a running card",
  story: "Sebastian tells the refund card in the chat how to key its Stripe refunds; the agent proposes the message, he presses Do it, " +
    "and the running session's transcript shows it arrive and the agent take it.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  steps: [
    {
      state: (now) => thursday(now, 14, { replies: [steering] }),
      actions: [{ goto: "/" }, { click: ui.open(steer.issue) }, { waitFor: ui.tab("chat") }, { click: ui.tab("chat") }, { waitFor: "#session-log .msg" }],
      hold: 2500,
    },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", steer.request] }, { press: "Enter" }, { waitFor: ui.doIt }, { wait: 2500 }, { hover: ui.doIt }],
      hold: 600,
    },
    { state: () => null, actions: [{ click: ui.doIt }, { waitFor: "#chat-log .applied" }, { waitFor: "#session-log .msg.you" }], hold: 3000 },
    { state: after, actions: [{ click: ui.tab("chat") }, { waitFor: "#session-log .msg.agent:has-text(\"Taking your message\")" }], hold: 3500 },
  ],
};
