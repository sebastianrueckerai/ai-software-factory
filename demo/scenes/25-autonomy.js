const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const INBOX = 1;
const ISSUE = 125;
const ask = story.asks.shareLink;
const a = story.approvals.shareLink;
const ASKED = 4 * MIN;
const OPENED = 37.5 * MIN;
// both runs are seen 47 minutes after #125's filing
const AT = 47 * MIN;

// the week's earlier cards are done: issue, done after, spend; the weekly bump and the performance read are on their
// runs' clock
const finished = [
  [116, 1.5 * HOUR, 1.04], [117, 9.5 * HOUR, 0.45], [120, 9.8 * HOUR, 0.86], [121, 9 * HOUR + 20 * MIN, 0.46],
  [118, 77 * MIN, 0.36], [119, 34 * MIN, 0.29], [122, story.merges[122].live, 0.61],
];

// friday is week 2's Friday, AT seconds after #125's filing, on run, one of #125's lives; o adds the inbox after the
// question, the events and the scene's level
function friday(now, run, o) {
  const t = new Date(story.filed[ISSUE].getTime() + AT * 1000);
  const asked = story.asking(now, ask, AT - ASKED, INBOX);
  const b = story.board([
    story.life(now, ISSUE, AT, run), story.routineCard(now, 115, t), story.routineCard(now, 123, t), ...story.doneAt(now, t, finished),
  ]);
  const chat = [asked.inbox, ...o.rows];
  return state.scene(now, {
    ...b, events: [...asked.events, ...o.events], alerts: asked.alerts, approvals: o.approvals, chat, seen: { [INBOX]: chat.length - (o.unread ?? 0) },
    inbox: INBOX, open: INBOX, autonomy: o.autonomy, mergeRule: o.mergeRule, ...story.spending(t),
  });
}

// manual is #125 at manual: Sebastian answered its question in the chat five minutes after it came, and its pull
// request waits for him at the merge gate
function manual(now) {
  const answered = AT - story.shareLink.manual.answered;
  return friday(now, story.shareLink.manual, {
    // the request's poke comes two seconds after it, as an ask row at the request's time would read superseded
    rows: [...story.answerRows(now, ask, answered, INBOX), state.mergeAsked(now, { issue: ISSUE, pr: a.pr, risk: a.risk, age: AT - OPENED - 2, conversation: INBOX })],
    events: [
      story.answered(now, ask, answered, "button"),
      state.event(now, { issue: ISSUE, kind: "approval_requested", age: AT - OPENED, detail: { approval: a.id, kind: "merge", pr: a.pr, class: a.risk } }),
    ],
    approvals: [state.approval(now, { ...a, spec: story.mergeSpec(a), age: AT - OPENED })],
    unread: 1,
  });
}

// full is #125 at full auto: the waker starts the agent's turn on its question ten seconds after it came, the agent
// reads the challenge notice's link file and answers, and factory-merge merges on the merge rule auto
function full(now) {
  const W = AT - ASKED - 10;
  const run = story.shareLink.auto;
  const m = story.merges[ISSUE];
  const read = (age) => new Date(now - age * 1000).toISOString();
  return friday(now, run, {
    rows: [
      state.wake(now, { kind: "wake_ask", text: story.wakeAsk([ask]), age: W, conversation: INBOX }),
      state.message(now, {
        role: "assistant", age: W - 10, conversation: INBOX,
        toolCalls: [{ id: "call_1", name: "file", arguments: JSON.stringify({ ref: "main", path: "src/links/game.ts" }), read_at: read(W - 10), result: story.sources["src/links/game.ts"] }],
      }),
      state.message(now, {
        role: "assistant", age: AT - run.answered, conversation: INBOX,
        toolCalls: [{
          id: "call_2", name: "answer", arguments: JSON.stringify({ task_id: state.id(ISSUE), text: ask.answer }), read_at: read(AT - run.answered),
          result: `Answered #${ISSUE}. It cannot be undone.`,
        }],
      }),
      state.message(now, { role: "assistant", content: story.replies.shareLink, age: AT - run.answered - 5, conversation: INBOX }),
      state.mergedPoke(now, { issue: ISSUE, age: AT - m.at, conversation: INBOX }),
      state.livePoke(now, { issue: ISSUE, title: story.cards[ISSUE].title, spent: 0.41, age: AT - m.live, conversation: INBOX }),
    ],
    events: [story.answered(now, ask, AT - run.answered, "chat"), ...story.mergeEvents(now, ISSUE, AT, m)],
    autonomy: "autonomous", mergeRule: "auto", unread: 2,
  });
}

const wake = "#chat-log .msg.wake";

module.exports = {
  title: "Autonomy levels",
  story: "One card at two levels. At manual the replay's share link waits twice for Sebastian: on its question and at the " +
    "merge gate. At full auto the same card runs through: the agent's wake turn answers the question from the challenge notice's file, " +
    "and the card merges on the merge rule without stopping at the gate.",
  group: "gates",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: manual, actions: [{ goto: "/" }, { hover: ui.idle }], hold: 3500, boxes: { needs: "#needs-you", level: ui.level } },
    { state: () => null, actions: [{ click: ui.level }, { waitFor: ui.levelPick("full auto") }, { hover: ui.levelPick("full auto") }], hold: 3500, boxes: { level: ui.level, menu: "#level-pop" } },
    // a pick sets the level at once, through a commit of the project's file; the lab's Forgejo fake holds no such file,
    // so the full auto level is the seed's
    { state: full, actions: [{ goto: "/" }, { waitFor: wake }, { hover: ui.park }], hold: 3500, boxes: { wake } },
    { state: () => null, actions: [{ click: `${wake} [data-fold]` }, { hover: `${wake} .av` }], hold: 4500, boxes: { wake } },
    {
      state: () => null,
      actions: [{ click: ui.open(ISSUE) }, { waitFor: ui.tab("activity") }, { click: ui.tab("activity") }, { waitFor: ui.step("auto_merge") }, { hover: `${ui.step("auto_merge")} td >> nth=2` }],
      hold: 4500,
      boxes: { drawer: "#drawer", merge: ui.step("auto_merge") },
    },
  ],
};
