const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const HOUR = 3600;
const PLANNED = 20 * 60;
const args = story.filing(105, "plan", "several cards, planned first");
const doIt = ui.doIt;
const card = ui.face(105);
const plan = story.plans[105];
const approval = story.approvals.beltPlan;
const choice = `#board article.approval.plan[data-card="${state.id(105)}"] button:has-text("${plan.question.choices[0]}")`;

const filing = state.reply(state.say(story.replies.belt), state.call("new_card", args));

// Monday's and Tuesday's cards are done by Wednesday morning; age and finished in hours
const done = (now, issue, age, finished, spent) => story.card(now, issue, {
  status: "done", track: "direct", model: "small", pr: story.cards[issue].pr, age: age * HOUR, finished: finished * HOUR, spent,
});
const week = (now) => [done(now, 101, 47, 45, 1.12), done(now, 102, 46.4, 43.5, 0.64), done(now, 103, 45.4, 44, 0.31), done(now, 104, 21, 20, 0.48)];

// thread is the filing as the console stored it after the Do it; the time-lapse leaves its ages, as the open chat keeps
// the stamps it drew
function thread(now) {
  const f = state.filedThread(now, { said: story.requests.belt, reply: story.replies.belt, args, issue: 105, age: 9 });
  return { chat: f.rows, seen: state.seen(f.rows), usedProposals: [f.proposal] };
}

// the planner's session runs on the card the lab filed
function planning(now) {
  const filed = story.card(now, 105, { status: "running", track: "plan", age: 6, gate: "session", gateSince: 2, model: "big" });
  const steps = [state.sessionStart(0, { model: "big" })];
  return { tasks: [...week(now), filed], objects: { [`sessions/${filed.ID}/timeline.jsonl`]: state.timeline(now, 2, { steps }) } };
}

function waiting(now) {
  const revision = state.plan(now, { issue: 105, age: 60, summary: plan.summary, cards: story.planCards(105) });
  const filed = story.card(now, 105, { status: "waiting-human", track: "plan", age: PLANNED, model: "big", spent: 0.46 });
  return {
    tasks: [...week(now), filed],
    plans: [revision],
    questions: [{ issue: 105, text: plan.question.question, choices: plan.question.choices }],
    approvals: [state.approval(now, { ...approval, spec: { revision: 1, sha256: revision.SHA256 }, age: 60 })],
  };
}

// filed is the board after the answer: the plan card done, its four cards filed in their order, the physics model
// queued first and the rest waiting on what they build on
function filedCards(now) {
  const kid = (issue, status) => story.card(now, issue, { status, track: "direct", age: 20 });
  return {
    tasks: [...week(now), story.card(now, 105, { status: "done", track: "plan", age: PLANNED + 60, finished: 30, spent: 0.46, model: "big" }),
      kid(109, "queued"), kid(110, "waiting-deps"), kid(111, "waiting-deps"), kid(112, "waiting-deps")],
    deps: { 110: [109], 111: [109], 112: [110, 111] },
  };
}

// scene is the board s seconds after #105's filing
const scene = (now, s, o) => state.scene(now, { ...story.spending(story.at(105, s)), ...o });

module.exports = {
  title: "Too large, split",
  story: "Sebastian asks for level 4, the asteroid belt. The agent files it on the plan track, the planner asks one question, and once " +
    "Sebastian answers it the planner's four cards land on the board in their order.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  boxes: { chat: ".chat", queued: '#board .column[aria-labelledby="col-1"]' },
  steps: [
    { state: (now) => scene(now, 0, { tasks: week(now), replies: [filing] }), actions: [{ goto: "/" }], hold: 1500 },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", story.requests.belt] }, { press: "Enter" }, { waitFor: doIt }, { wait: 3000 }, { hover: doIt }],
      hold: 600,
      boxes: { doit: doIt },
    },
    { state: () => null, actions: [{ click: doIt }, { waitFor: "#chat-log .applied" }, { waitFor: card }], hold: 2000, boxes: { card } },
    { state: (now) => scene(now, 6, { ...thread(now), ...planning(now) }), actions: [{ hover: card }], hold: 2500, boxes: { card } },
    { state: (now) => scene(now, PLANNED, { ...thread(now), ...waiting(now) }), actions: [{ hover: choice }], hold: 2500, boxes: { card, answer: choice } },
    {
      state: () => null,
      actions: [{ click: `#board article.approval.plan[data-card="${state.id(105)}"] a.open` }, { click: '#drawer [data-sec="plan"] > summary' }],
      hold: 4500,
      boxes: { plan: '#drawer [data-sec="plan"]', drawer: "#drawer" },
    },
    // the plan read, the drawer closes and the plan's question is answered; the planner's next revision has no open
    // question, so its four cards land on the board without a reload
    { state: () => null, actions: [{ click: "#drawer-close" }, { wait: 400 }, { hover: choice }], hold: 1200, boxes: { card } },
    { state: () => null, actions: [{ click: choice }, { wait: 500 }], hold: 500, boxes: { card } },
    {
      state: (now) => scene(now, PLANNED + 90, { ...thread(now), ...filedCards(now) }), actions: [{ waitFor: ui.face(112) }, { hover: ui.park }], hold: 3500,
      boxes: { first: ui.face(109), last: ui.face(112) },
    },
  ],
};
