const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const INBOX = 1;
const SPLIT = story.filed[113];
const since = (issue, s) => new Date(story.filed[issue].getTime() + s * 1000);
const named = (issue) => [issue, story.title(issue)];

// the split in two turns: the two small cards first, then #112 points at #114 in #110's place and #110 closes. Offsets
// are seconds after the first Do it; each turn's line comes 3 seconds before its first Do it.
const TURN2 = 13;
const filings = [story.filing(113, "ready"), story.filing(114, "backlog")];
const note = "Split into #113 and #114.";
const splitting = state.reply(state.say(story.replies.split), ...filings.map((f) => state.call("new_card", f)));
const repointing = state.reply(
  state.say(story.replies.repoint),
  state.call("set_dependency", { task_id: state.id(112), depends_on: state.id(114) }),
  state.call("set_dependency", { task_id: state.id(112), depends_on: state.id(110), remove: true }),
  state.call("close", { task_id: state.id(110), note }),
);

// the week's earlier cards are done: issue, done after, spend; the plan's events model and month view, each live after
// and spent, went live in the night before #110's stop
const finished = [[101, 2 * HOUR, 1.12], [102, 2.9 * HOUR, 0.64], [103, 1.4 * HOUR, 0.31], [104, HOUR, 0.48], [107, 64 * MIN, 1.18]];
const planned = [[109, 155 * MIN, 1.84], [111, 270 * MIN, 0.92]];

// overnight is the inbox seen at the story's time t: the plan's two cards merged and live
function overnight(now, t) {
  const ago = (d) => (t - d) / 1000;
  return planned.flatMap(([issue, live, spent]) => [
    state.mergedPoke(now, { issue, age: ago(since(issue, live - 6 * MIN)), conversation: INBOX }),
    state.livePoke(now, { issue, title: story.cards[issue].title, spent, age: ago(since(issue, live)), conversation: INBOX }),
  ]);
}

// friday is week 1's Friday s seconds after the split's first Do it: the plan #105 accepted on Thursday evening, #109
// and #111 live, #110 and #112 as their lives reached, the week's cards done, the inbox with the budget's question on
// #110. o adds the split's cards, #112's dependencies once it moved, the inbox rows after the question, the pressed
// proposals, events and alerts.
function friday(now, s, o = {}) {
  const t = new Date(SPLIT.getTime() + s * 1000);
  const age = (issue) => story.ageAt(issue, t);
  const asked = story.asking(now, story.asks.budget, (t - since(110, 363 * MIN)) / 1000, INBOX);
  const deps = o.deps ?? [110, 111];
  const waitingOn = deps.filter((d) => !planned.some(([p]) => p === d)).map((d) => `#${d}`).join(", ");
  const b = story.board([
    story.life(now, 110, age(110), story.lives[110]), story.life(now, 112, age(112), { ...story.lives[112], card: { waitingOn } }),
    ...(o.filed ?? []).map((issue) => story.life(now, issue, age(issue), story.lives[issue])),
    ...planned.map(([issue, live, spent]) => story.done(now, issue, age(issue), live, spent)),
    story.routineCard(now, 108, t), ...story.doneAt(now, t, finished),
  ]);
  const plan = story.card(now, 105, { status: "done", lane: "plan", age: age(105), finished: age(110), spent: 0.46, model: "big" });
  const chat = [...overnight(now, t), asked.inbox, ...(o.rows ?? [])];
  return state.scene(now, {
    tasks: [plan, ...b.tasks], objects: b.objects, deps: { 112: deps }, events: [...asked.events, ...(o.events ?? [])],
    alerts: [...asked.alerts, ...(o.alerts ?? [])], chat, seen: { [INBOX]: o.unread ? chat.length - o.unread : chat.length },
    inbox: INBOX, open: INBOX, usedProposals: o.used, replies: o.replies, drawer: o.drawer, spend: 11.6, chatSpend: 0.52,
  });
}

// split is the split's two turns as the console stored them, seen s seconds after its first Do it, with the events its
// presses left
function split(now, s) {
  const first = state.pressedThread(now, filings.map((f) => state.cardFiling(now, f)), {
    line: story.requests.split, reply: story.replies.split, age: s + 3,
    results: ["Filed nord/booking#113 in lane ready.", "Filed nord/booking#114 in lane backlog."],
  });
  const repoints = [
    state.depending(now, named(112), named(114)), state.depending(now, named(112), named(110), true),
    state.closing(now, { issue: 110, title: story.title(110), note }),
  ];
  const second = state.pressedThread(now, repoints, {
    line: story.requests.repoint, reply: story.replies.repoint, age: s - TURN2 + 3,
    results: ["#112 depends on #114 now.", "#112 no longer depends on #110.", "Closed #110; factoryd ends the card."],
  });
  const by = (issue, kind, k, detail) => state.event(now, { issue, kind, actor: "sebastian", via: "chat", age: s - k, detail });
  return {
    rows: [...first.rows, ...second.rows], used: [...first.proposals, ...second.proposals],
    events: [
      by(113, "card_filed", 0), by(114, "card_filed", 1), by(112, "dependency_set", TURN2, { depends_on: state.id(114), removed: false }),
      by(112, "dependency_set", TURN2 + 1, { depends_on: state.id(110), removed: true }), by(110, "card_closed", TURN2 + 2, { note }),
    ],
  };
}

// afterSplit is the board s seconds after the split's first Do it: #113 and #114 as the lab filed them, #112 waiting on
// #114 and #110 closed; o adds to the inbox, the events and the alerts after the split
function afterSplit(now, s, o = {}) {
  const t = split(now, s);
  return friday(now, s, {
    ...o, filed: [113, 114], deps: [111, 114], rows: [...t.rows, ...(o.rows ?? [])], used: t.used, events: [...t.events, ...(o.events ?? [])],
  });
}

const applied = (n) => `#chat-log .applied >> nth=${n}`;

module.exports = {
  title: "The cap fires",
  story: "The calendar's week view stops overnight at its budget, and the factory asks whether to fund one more session. Sebastian " +
    "splits it in the chat instead: the agent files the week grid and the class blocks as two small cards, points the drag card " +
    "at the blocks and closes the week view.",
  group: "gates",
  theme: "dark",
  viewport: "desk",
  afterSplit,
  steps: [
    { state: (now) => friday(now, -30, { unread: 1, replies: [splitting, repointing] }), actions: [{ goto: "/" }, { hover: ui.idle }], hold: 3500 },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", story.requests.split] }, { press: "Enter" }, { waitFor: ui.doIt }, { wait: 2000 }, { hover: ui.doIt }],
      hold: 1500,
    },
    { state: () => null, actions: [{ click: ui.doIt }, { waitFor: ui.face(113) }, { wait: 600 }, { hover: ui.doIt }], hold: 600 },
    { state: () => null, actions: [{ click: ui.doIt }, { waitFor: applied(1) }], hold: 1500 },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", story.requests.repoint] }, { press: "Enter" }, { waitFor: ui.doIt }, { wait: 2000 }, { hover: ui.doIt }],
      hold: 1500,
    },
    { state: () => null, actions: [{ click: ui.doIt }, { waitFor: applied(2) }, { wait: 600 }, { hover: ui.doIt }], hold: 600 },
    { state: () => null, actions: [{ click: ui.doIt }, { waitFor: applied(3) }, { wait: 600 }, { hover: ui.doIt }], hold: 1200 },
    // the lab's Forgejo fake closes no issue of nord/booking, so the close is the seed's; the open chat keeps its live
    // thread, and the reload reads the one the seed stores
    { state: (now) => afterSplit(now, 40), actions: [{ goto: "/" }, { hover: ui.park }], hold: 3500 },
  ],
};
