const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const INBOX = 1;
const ask = story.asks.budget;
const RAISE = 0.6;
// the project agent's note, posted as the card's answer
const NOTE = "Funded one more session on big from the pool: the second session pushed the map, and one camera check is left.";
const REPLY = "#110 stopped at its budget: €0.40 left, and a session on big needs €0.60. Its second session pushed the map and one " +
  "camera check is left, so I funded one more session from the pool. €0.60 is within the pool's raise limit; a bigger raise would have come to you.";

const finished = [[116, 49, 1.5, 1.04], [117, 30.75, 9.5, 0.45], [120, 30.8, 9.8, 0.86]];

// board is the project at full auto with #110 at status, and four more cards at work around it
function board(now, status, o = {}) {
  const b = story.board([
    story.life(now, 102, 50 * MIN, story.lives[102]),
    story.life(now, 103, 25 * MIN, story.lives[103]),
    story.life(now, 121, 530 * MIN, story.lives[121]),
    story.life(now, 123, 12 * MIN, story.lives[123]),
    ...finished.map(([issue, age, after, spent]) => story.done(now, issue, age * HOUR, after * HOUR, spent)),
  ]);
  const card = status === "waiting-human"
    ? story.life(now, 110, 380 * MIN, story.lives[110]).task
    : story.card(now, 110, { status: "running", track: "direct", age: 382 * MIN, gate: "session", gateSince: 60, budget: 5 + RAISE, spent: 4.6, model: "big" });
  const asked = story.asking(now, ask, 2 * MIN, INBOX);
  const chat = [asked.inbox, ...(o.rows ?? [])];
  return state.scene(now, {
    // #110 is a card of plan #105, which the board keeps in Done
    tasks: [...b.tasks, story.card(now, 105, { status: "done", track: "plan", age: 26 * HOUR, finished: 9 * HOUR, spent: 0.46, model: "big" }), card],
    objects: b.objects, events: [...asked.events, ...(o.events ?? [])], alerts: status === "waiting-human" ? asked.alerts : [],
    chat, seen: { [INBOX]: chat.length - (o.unread ?? 0) }, inbox: INBOX, open: INBOX, autonomy: "autonomous", mergeRule: "auto",
    ...story.spending(story.at(122, 30 * MIN)),
  });
}

// funded is the board after the wake turn: the waker woke the project agent on the budget stop, which read the card and
// funded one more session from the pool, unconfirmed at full auto
function funded(now) {
  const W = 110;
  const read = (age) => new Date(now - age * 1000).toISOString();
  return board(now, "running", {
    rows: [
      state.wake(now, { kind: "wake_ask", text: story.wakeAsk([ask]), age: W, conversation: INBOX }),
      state.message(now, {
        role: "assistant", age: W - 8, conversation: INBOX,
        toolCalls: [{ id: "call_1", name: "card", arguments: JSON.stringify({ task_id: state.id(110) }), read_at: read(W - 8),
          result: "#110 Level 4: the belt's map and its camera, waiting-human after a budget refusal, €4.60 of €5.00, session 2 pushed; 3 of 4 checks green." }],
      }),
      state.message(now, {
        role: "assistant", age: W - 20, conversation: INBOX,
        toolCalls: [{ id: "call_2", name: "fund", arguments: JSON.stringify({ task_id: state.id(110), eur: RAISE, text: NOTE }), read_at: read(W - 20),
          result: `Raised #110's budget by ${RAISE.toFixed(2)} EUR to ${(5 + RAISE).toFixed(2)} and posted your note as the answer; the card resumes.` }],
      }),
      state.message(now, { role: "assistant", content: REPLY, age: W - 25, conversation: INBOX }),
    ],
    events: [
      state.event(now, { issue: 110, kind: "card_funded", actor: "sebastian", via: "chat", age: W - 20,
        detail: { autonomy: "full auto", merge_rule: "auto", decider: "agent", from_eur: 5, to_eur: 5 + RAISE, amount_eur: RAISE } }),
      state.event(now, { issue: 110, kind: "question_answered", actor: "sebastian", via: "chat", age: W - 20, detail: { answer: NOTE } }),
    ],
    unread: 1,
  });
}

const wake = "#chat-log .msg.wake";

module.exports = {
  title: "The pool funds a small overrun",
  story: "At full auto a card stops at its budget: €0.40 left, and a session on big needs €0.60. The factory wakes the project agent, " +
    "which reads the card and funds one more session from the project's monthly pool, inside its raise limit. The card goes on, and " +
    "nobody was asked about sixty cents.",
  group: "gates",
  theme: "dark",
  viewport: "desk",
  boxes: { chat: ".chat", needs: "#needs-you", progress: '#board .column[aria-labelledby="col-2"]' },
  steps: [
    { state: (now) => board(now, "waiting-human"), actions: [{ goto: "/" }, { hover: ui.idle }], hold: 3500, boxes: { card: ui.face(110) } },
    { state: funded, actions: [{ goto: "/" }, { waitFor: wake }, { hover: ui.park }], hold: 3000, boxes: { wake, card: ui.face(110) } },
    {
      state: () => null,
      actions: [{ click: `${wake} [data-fold]` }, { hover: `${wake} .av` }],
      hold: 6000,
      boxes: { wake, fund: `${wake} .wake-b :text("Raised #110")`, reply: `${wake} .wake-b p:has-text("pool's raise limit")` },
    },
  ],
};
