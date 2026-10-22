const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const INBOX = 1;
const T = story.filed[113];

// The landing page's hero: one busy afternoon in a single frame, every column of the board full. Three cards need
// Sebastian (a question, a budget stop, a merge of a payments change), one waits on another, five build, six are done,
// and the chat holds the agent's proposal to steer the refund's session. He answers the question on its card with one
// click, and the board drains. Ages are seconds since each card's filing, picked so each card stands in the phase its
// column shows.
const refund = story.approvals.refund;
const moon = story.approvals.moonPlan;
const seasonPass = story.lives[120].phases.find((p) => p.ask).ask;
const find = story.steers.find;
// the steer's turn takes two model calls: the first reads the board, the second proposes the steer to the card it found
const steerReplies = [state.reply(state.call("board", {})), state.reply(state.say(find.reply), state.call("steer", { task_id: state.id(find.issue), text: find.text }))];

// LIVES are the ages of the busy board's working cards; hero draws the busy board's cards less those that moved,
// each moved card drawn by face at its new status
const LIVES = { 120: 40 * MIN, 110: 380 * MIN, 122: 45 * MIN, 112: 9 * HOUR, 102: 50 * MIN, 103: 25 * MIN, 107: 49 * MIN, 121: 530 * MIN, 123: 12 * MIN };
const DONE = [[101, 2 * HOUR, 1.12], [104, HOUR, 0.48], [108, 50 * MIN, 0.22], [109, 155 * MIN, 1.84], [111, 270 * MIN, 0.92], [115, 52 * MIN, 0.31]];
function hero(now, moved = {}) {
  const still = (i) => !(i in moved);
  const b = story.board([
    ...Object.keys(LIVES).map(Number).filter(still)
      .map((i) => story.life(now, i, LIVES[i], i === 112 ? { ...story.lives[112], card: { waitingOn: "#110" } } : story.lives[i])),
    ...DONE.map(([issue, after, spent]) => story.done(now, issue, after + 3 * HOUR, after, spent)),
  ]);
  const queued = [
    story.card(now, 105, { status: "done", lane: "plan", age: 26 * HOUR, finished: 9 * HOUR, spent: 0.46, model: "big" }),
    ...(still(125) ? [story.card(now, 125, { status: "queued", lane: "ready", age: 4 * MIN })] : []),
    ...(still(118) ? [story.card(now, 118, { status: "backlog", lane: "backlog", age: 26 * HOUR })] : []),
  ];
  const moves = Object.entries(moved).map(([i, st]) => face(now, Number(i), st));
  const asks = [still(110) && story.asking(now, story.asks.budget, 17 * MIN, INBOX), still(120) && story.asking(now, seasonPass, 39 * MIN, INBOX)].filter(Boolean);
  return {
    tasks: [...b.tasks, ...queued, ...moves], objects: b.objects, deps: still(110) && still(112) ? { 112: [110] } : {},
    events: asks.flatMap((a) => a.events), alerts: asks.flatMap((a) => a.alerts),
    approvals: still(122) ? [state.approval(now, { ...refund, spec: story.mergeSpec(refund), age: 6 * MIN })] : [],
  };
}

function busy(now) {
  const h = hero(now);
  const budget = story.asking(now, story.asks.budget, 17 * MIN, INBOX);
  const chat = [
    state.livePoke(now, { issue: 109, title: story.cards[109].title, spent: 1.84, age: 25 * MIN, conversation: INBOX }),
    budget.inbox,
  ];
  return state.scene(now, {
    tasks: h.tasks, objects: h.objects, deps: h.deps, events: h.events, alerts: h.alerts, approvals: h.approvals,
    chat, seen: { [INBOX]: chat.length }, inbox: INBOX, open: INBOX, ...story.spending(T), replies: steerReplies,
  });
}

// face is a card at a status, with the fields the board shows for it: the gate of running work, the pull request from
// review on, the finish and the spend once done. Work that builds or is in review is 20 minutes on the card, under the
// board's 30 minutes without an event, so it reads as busy, not stale.
function face(now, issue, status, o = {}) {
  const busy = status === "running" || status === "in-review";
  const ended = status === "done" || status === "closed";
  const c = story.cards[issue];
  return story.card(now, issue, {
    issue, status, lane: issue === 105 || issue === 136 ? "plan" : "ready", age: o.age ?? (busy ? 20 * MIN : 5 * HOUR),
    gate: busy ? (status === "running" ? "session" : "review") : undefined, gateSince: busy ? 4 * MIN : undefined,
    finished: ended ? (o.finished ?? 20 * MIN) : undefined, spent: o.spent ?? 0.4, model: issue === 105 || issue === 136 ? "big" : "small",
    pr: ["in-review", "merged", "done"].includes(status) ? c.pr : undefined, ...o,
  });
}

// drained is the board after the answer, one card moving at a time: the question's card builds, what waits on Sebastian
// is settled (the merge approved, the budget stop funded for one more session), queued work starts, running work ends
// done. Step k applies the first k moves to the hero board; the first is the answer the scene clicks on its card.
const moves = [
  [120, "running"], [122, "merged"], [103, "done"], [107, "done"], [110, "running"], [121, "done"], [123, "done"], [122, "done"],
  [125, "running"], [102, "done"], [120, "done"], [125, "done"], [110, "done"], [118, "running"], [112, "running"], [118, "done"],
  [112, "done"],
];
const DRAINED = moves.length;
function drained(now, k, o = {}) {
  const h = hero(now, Object.fromEntries(moves.slice(0, k)));
  const chat = [
    state.livePoke(now, { issue: 109, title: story.cards[109].title, spent: 1.84, age: 25 * MIN + k * 12 * MIN, conversation: INBOX }),
    ...(o.rows ?? []),
  ];
  return state.scene(now, {
    tasks: [...h.tasks, ...(o.tasks ?? [])], objects: h.objects, deps: h.deps, events: h.events, alerts: h.alerts,
    approvals: [...h.approvals, ...(o.approvals ?? [])], chat, seen: { [INBOX]: chat.length }, inbox: INBOX, open: INBOX,
    usedProposals: o.used, replies: o.replies, plans: o.plans, questions: o.questions, ...story.spending(T),
  });
}

// the intake: new cards that file themselves, a nightly scan's, an alert's and a user's issue, each as factoryd files it
const arrivals = (now) => [
  face(now, 135, "queued", { age: 50, author: "factory-agent", source: "routine" }),
  face(now, 134, "queued", { age: 40, author: "factory-agent", source: "alert" }),
  face(now, 133, "queued", { age: 30, author: story.cards[133].reporter, source: "webhook" }),
];
const moonArgs = story.filing(136, "plan");
const moonReply = state.reply(state.say(story.replies.moon), state.call("new_card", moonArgs));
function moonThread(now, age) {
  const f = state.filedThread(now, { said: story.requests.moon, reply: story.replies.moon, args: moonArgs, issue: 136, age });
  return { rows: f.rows.map((r) => ({ ...r, conversation: INBOX })), used: [f.proposal] };
}
function intake(now, n, o = {}) {
  return drained(now, DRAINED, { ...o, tasks: [...arrivals(now).slice(0, n), ...(o.tasks ?? [])] });
}
function planning(now) {
  const t = moonThread(now, 40);
  return intake(now, 3, { rows: t.rows, used: t.used, tasks: [face(now, 136, "running", { age: 8, gate: "session", gateSince: 4 })] });
}
function waiting(now) {
  const t = moonThread(now, 20 * MIN);
  const revision = state.plan(now, { issue: 136, age: 60, summary: story.plans[136].summary, cards: story.planCards(136) });
  return intake(now, 3, {
    rows: t.rows, used: t.used, tasks: [face(now, 136, "waiting-human", { age: 20 * MIN, spent: 0.46 })],
    plans: [revision], questions: [{ issue: 136, text: story.plans[136].question.question, choices: story.plans[136].question.choices }],
    approvals: [state.approval(now, { ...moon, spec: { revision: 1, sha256: revision.SHA256 }, age: 60 })],
  });
}
function accepted(now) {
  const t = moonThread(now, 21 * MIN);
  const kid = (issue, status) => face(now, issue, status, { age: 20, parent: 136, planKey: story.cards[issue].key });
  return intake(now, 3, {
    rows: t.rows, used: t.used,
    tasks: [face(now, 136, "done", { age: 22 * MIN, finished: 30, spent: 0.46 }), kid(137, "queued"), kid(138, "waiting-deps"), kid(139, "waiting-deps"), kid(140, "waiting-deps")],
  });
}
const moonDoIt = `${ui.doIt} >> nth=1`;
const accept = `#board article.approval.plan[data-card="${state.id(136)}"] button[aria-label^="Accept revision"]`;
const columns = { needs: "#needs-you", queued: '#board .column[aria-labelledby="col-1"]', progress: '#board .column[aria-labelledby="col-2"]', done: '#board .column[aria-labelledby="col-3"]' };

module.exports = {
  title: "A busy board, drained and filled again",
  story: "One afternoon in one frame: three cards need Sebastian, one waits on another, five build and six are done, and the chat " +
    "holds the agent's proposal to steer the refund. He answers the season pass's question on its card with one click. The board " +
    "drains one card at a time as the work resolves. Then new " +
    "work comes in on its own, a nightly scan, an alert and a user's issue, and one sentence in the chat becomes the plan for " +
    "level 5, whose four cards land on the board once he accepts it.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  // the regions the film's overlays name, on every step
  boxes: { chat: ".chat", ...columns },
  steps: [
    { state: busy, actions: [{ goto: "/" }], hold: 1500, boxes: { running: ui.face(102), question: ui.face(120) } },
    // typed without a click, so the mouse has not moved and the hero still carries no pointer
    {
      state: () => null,
      actions: [{ type: ["#chat-input", find.request] }, { press: "Enter" }, { waitFor: ui.doIt }, { wait: 2000 }],
      hold: 1500,
    },
    // the landing page's hero still, the steer's Do it waiting
    { state: () => null, actions: [{ waitFor: ui.doIt }], hold: 2500, boxes: { doit: ui.doIt, running: ui.face(102), question: ui.face(120) } },
    // one click answers the question on its card, which slides to In progress at once
    {
      state: () => null,
      actions: [{ hover: ui.choice(120, seasonPass.answer) }, { wait: 700 }, { click: ui.choice(120, seasonPass.answer) }, { wait: 900 }, { hover: ui.park }],
      hold: 600, boxes: { question: ui.face(120) },
    },
    // the drain, one wave per step, from the answer on
    ...Array.from({ length: DRAINED }, (_, k) => ({ state: (now) => drained(now, k + 1), actions: [], hold: 900 })),
    // the intake: three cards file themselves, then a sentence
    { state: (now) => intake(now, 1), actions: [], hold: 1400, boxes: { scan: ui.face(135) } },
    { state: (now) => intake(now, 2), actions: [], hold: 1400, boxes: { alert: ui.face(134) } },
    { state: (now) => intake(now, 3, { replies: [moonReply] }), actions: [], hold: 1600, boxes: { issue: ui.face(133), arrived: '#board .column[aria-labelledby="col-1"] .cards' } },
    // the hero's steer still waits above, so the plan's Do it is the second
    {
      state: () => null,
      actions: [{ type: ["#chat-input", story.requests.moon] }, { press: "Enter" }, { waitFor: moonDoIt }, { wait: 2500 }, { hover: moonDoIt }],
      hold: 600, boxes: { doit: moonDoIt },
    },
    { state: () => null, actions: [{ click: moonDoIt }, { waitFor: "#chat-log .applied" }, { waitFor: ui.face(136) }], hold: 2000, boxes: { plan: ui.face(136) } },
    { state: planning, actions: [{ hover: ui.face(136) }], hold: 2200, boxes: { plan: ui.face(136) } },
    { state: waiting, actions: [{ hover: accept }], hold: 2600, boxes: { plan: ui.face(136), accept } },
    { state: accepted, actions: [{ hover: ui.park }], hold: 3000, boxes: { first: ui.face(137), last: ui.face(140) } },
  ],
};

module.exports.busy = busy;
