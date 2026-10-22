const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");
const project = require("../lib/project");

const MIN = 60;
const HOUR = 3600;
const INBOX = 1;
const T = story.filed[113];

// The landing page's hero: one busy afternoon in a single frame, every column of the board full. Three cards need
// Sebastian (a question, a budget stop, a merge of a payments change), one waits on another, five build, six are done,
// and he answers the budget stop in the chat by splitting the card. Ages are seconds since each card's filing, picked
// so each card stands in the phase its column shows.
const refund = story.approvals.refund;
const moon = story.approvals.moonPlan;
const filings = [story.filing(113, "ready"), story.filing(114, "backlog")];
const seasonPass = story.lives[120].phases.find((p) => p.ask).ask;

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
    chat, seen: { [INBOX]: chat.length }, inbox: INBOX, open: INBOX, ...story.spending(T),
    replies: [state.reply(state.say(story.replies.split), ...[story.filing(113, "ready"), story.filing(114, "backlog")].map((f) => state.call("new_card", f)))],
  });
}

// split is the chat after the two presses of Do it, as the console stored them: the split's two cards filed as #126 and
// #127, the next free numbers
function split(now, age) {
  const t = state.pressedThread(now, filings.map((f) => state.cardFiling(now, f)), {
    line: story.requests.split, reply: story.replies.split, age,
    results: [`Filed ${project.repository}#126 in lane ready.`, `Filed ${project.repository}#127 in lane backlog.`],
  });
  const chat = [
    state.livePoke(now, { issue: 109, title: story.cards[109].title, spent: 1.84, age: age + 25 * MIN, conversation: INBOX }),
    ...t.rows.map((r) => ({ ...r, conversation: INBOX })),
  ];
  return { chat, usedProposals: t.proposals };
}

// face is a card at a status, with the fields the board shows for it: the gate of running work, the pull request from
// review on, the finish and the spend once done. The split's cards carry the numbers the lab gave them.
const SPLIT = { 126: 113, 127: 114 };
function face(now, issue, status, o = {}) {
  const busy = status === "running" || status === "in-review";
  const ended = status === "done" || status === "closed";
  const c = story.cards[SPLIT[issue] ?? issue];
  return story.card(now, SPLIT[issue] ?? issue, {
    issue, status, lane: issue === 105 || issue === 136 ? "plan" : "ready", age: o.age ?? 5 * HOUR,
    gate: busy ? (status === "running" ? "session" : "review") : undefined, gateSince: busy ? 4 * MIN : undefined,
    finished: ended ? (o.finished ?? 20 * MIN) : undefined, spent: o.spent ?? 0.4, model: issue === 105 || issue === 136 ? "big" : "small",
    pr: ["in-review", "merged", "done"].includes(status) ? c.pr : undefined, ...o,
  });
}

// drained is the board after the split, one card moving at a time: what waits on Sebastian is answered, queued work
// starts, running work ends done. Step k applies the first k moves to the board right after the presses, where the
// question, the budget stop and the merge still wait with their buttons.
const moves = [
  [110, "closed"], [122, "merged"], [103, "done"], [107, "done"], [120, "running"], [121, "done"], [123, "done"], [122, "done"],
  [125, "running"], [102, "done"], [126, "running"], [120, "done"], [125, "done"], [118, "running"], [126, "done"], [112, "running"],
  [127, "running"], [118, "done"], [127, "done"], [112, "done"],
];
const DRAINED = moves.length;
function drained(now, k, o = {}) {
  const moved = Object.fromEntries(moves.slice(0, k));
  const filed = { 126: "queued", 127: "backlog" };
  const h = hero(now, Object.fromEntries(Object.entries(moved).filter(([i]) => !(i in filed))));
  // the split's cards keep the age the lab gave them at the presses, so the queue keeps its order
  const tasks = [...h.tasks, ...Object.entries(filed).map(([i, st]) => face(now, Number(i), moved[i] ?? st, { age: 40 })), ...(o.tasks ?? [])];
  const s = split(now, 30 * MIN + k * 12 * MIN);
  const chat = [...s.chat, ...(o.rows ?? [])];
  return state.scene(now, {
    tasks, objects: h.objects, deps: h.deps, events: h.events, alerts: h.alerts, approvals: [...h.approvals, ...(o.approvals ?? [])],
    chat, seen: { [INBOX]: chat.length }, inbox: INBOX, open: INBOX, usedProposals: [...s.usedProposals, ...(o.used ?? [])],
    replies: o.replies, plans: o.plans, questions: o.questions, ...story.spending(T),
  });
}

// the intake: new cards that file themselves, a nightly scan's, an alert's and a player's issue, each as factoryd files it
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
const accept = `#board article.approval.plan[data-card="${state.id(136)}"] button[aria-label^="Accept revision"]`;
const columns = { needs: "#needs-you", queued: '#board .column[aria-labelledby="col-1"]', progress: '#board .column[aria-labelledby="col-2"]', done: '#board .column[aria-labelledby="col-3"]' };

module.exports = {
  title: "A busy board, drained and filled again",
  story: "One afternoon in one frame: three cards need Sebastian, one waits on another, five build and six are done. He splits " +
    "the card at its budget in the chat and presses Do it twice. The board drains one card at a time as the work resolves. Then new " +
    "work comes in on its own, a nightly scan, an alert and a player's issue, and one sentence in the chat becomes the plan for " +
    "level 5, whose four cards land on the board once he accepts it.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  // the regions the film's overlays name, on every step
  boxes: { chat: ".chat", ...columns },
  steps: [
    { state: busy, actions: [{ goto: "/" }], hold: 1500, boxes: { running: ui.face(102), budget: ui.face(110) } },
    // typed without a click, so the mouse has not moved and the hero still carries no pointer
    {
      state: () => null,
      actions: [{ type: ["#chat-input", story.requests.split] }, { press: "Enter" }, { waitFor: ui.doIt }, { wait: 2000 }],
      hold: 1500,
    },
    // the landing page's hero still. No reload before the presses: Do it on a proposal read back from the store asks the
    // model again, and the lab has no reply left for that
    { state: () => null, actions: [{ waitFor: ui.doIt }], hold: 2500, boxes: { doit: ui.doIt, running: ui.face(102), budget: ui.face(110) } },
    { state: () => null, actions: [{ click: ui.doIt }, { waitFor: ui.face(126) }, { wait: 600 }], hold: 1200, boxes: { first: ui.face(126) } },
    { state: () => null, actions: [{ click: ui.doIt }, { waitFor: ui.face(127) }], hold: 2200, boxes: { first: ui.face(126), second: ui.face(127) } },
    // the drain, one wave per step
    ...Array.from({ length: DRAINED + 1 }, (_, k) => ({ state: (now) => drained(now, k), actions: [], hold: 900 })),
    // the intake: three cards file themselves, then a sentence
    { state: (now) => intake(now, 1), actions: [], hold: 1400, boxes: { scan: ui.face(135) } },
    { state: (now) => intake(now, 2), actions: [], hold: 1400, boxes: { alert: ui.face(134) } },
    { state: (now) => intake(now, 3, { replies: [moonReply] }), actions: [], hold: 1600, boxes: { issue: ui.face(133), arrived: '#board .column[aria-labelledby="col-1"] .cards' } },
    {
      state: () => null,
      actions: [{ type: ["#chat-input", story.requests.moon] }, { press: "Enter" }, { waitFor: ui.doIt }, { wait: 2500 }, { hover: ui.doIt }],
      hold: 600, boxes: { doit: ui.doIt },
    },
    { state: () => null, actions: [{ click: ui.doIt }, { waitFor: "#chat-log .applied >> nth=2" }, { waitFor: ui.face(136) }], hold: 2000, boxes: { plan: ui.face(136) } },
    { state: planning, actions: [{ hover: ui.face(136) }], hold: 2200, boxes: { plan: ui.face(136) } },
    { state: waiting, actions: [{ hover: accept }], hold: 2600, boxes: { plan: ui.face(136), accept } },
    { state: accepted, actions: [{ hover: ui.park }], hold: 3000, boxes: { first: ui.face(137), last: ui.face(140) } },
  ],
};

module.exports.busy = busy;
