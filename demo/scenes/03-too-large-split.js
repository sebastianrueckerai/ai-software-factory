const state = require("../lib/state");
const story = require("../lib/story");

const HOUR = 3600;
const PLANNED = 20 * 60;
const args = story.filing(105, "plan");
const doIt = "#chat-log .proposal [data-doit]";
const plan = story.plans[105];
const approval = story.approvals.calendarPlan;

const filing = state.reply(state.say(story.replies.calendar), state.call("new_card", args));

// Monday's and Tuesday's cards are done by Wednesday morning
const week = (now) => [
  story.card(now, 101, { status: "done", lane: "ready", age: 47 * HOUR, finished: 45 * HOUR, spent: 1.12, model: "small", pr: story.cards[101].pr }),
  story.card(now, 102, { status: "done", lane: "ready", age: 46.4 * HOUR, finished: 43.5 * HOUR, spent: 0.64, model: "small", pr: story.cards[102].pr }),
  story.card(now, 103, { status: "done", lane: "ready", age: 45.4 * HOUR, finished: 44 * HOUR, spent: 0.31, model: "small", pr: story.cards[103].pr }),
  story.card(now, 104, { status: "done", lane: "ready", age: 21 * HOUR, finished: 20 * HOUR, spent: 0.48, model: "small", pr: story.cards[104].pr }),
];

// thread is the filing as the console stores it; the time-lapse leaves its ages, as the open chat keeps the stamps it drew
function thread(now) {
  const p = state.cardFiling(now, args);
  const chat = [
    state.message(now, { role: "user", content: story.requests.calendar, age: 9 }),
    state.message(now, { role: "assistant", content: story.replies.calendar, age: 8, toolCalls: [state.proposedCall(now, p, { id: "call_1", age: 8 })] }),
    state.pressed(now, p, { age: 2, result: "Filed nord/booking#105 in lane plan. It cannot be undone." }),
  ];
  return { chat, seen: state.seen(chat), usedProposals: [p] };
}

function planning(now) {
  const card = story.card(now, 105, { status: "running", lane: "plan", age: 2, gate: "session", gateSince: 1, model: "big" });
  const steps = [{ at: 0, step: "session_start", session: "s-1", model: "big", attempt: 1 }];
  return { tasks: [...week(now), card], objects: { [`sessions/${card.ID}/timeline.jsonl`]: state.timeline(now, 1, { steps }) } };
}

function waiting(now) {
  const revision = state.plan(now, { issue: 105, age: 60, summary: plan.summary, cards: story.planCards(105) });
  const card = story.card(now, 105, { status: "waiting-human", lane: "plan", age: PLANNED, model: "big", spent: 0.46 });
  return {
    tasks: [...week(now), card],
    plans: [revision],
    questions: [{ issue: 105, text: plan.question.question, choices: plan.question.choices }],
    approvals: [state.approval(now, { ...approval, spec: { revision: 1, sha256: revision.SHA256 }, age: 60 })],
  };
}

const scene = (now, o) => state.scene(now, { spend: 4.82, chatSpend: 0.31, ...o });

module.exports = {
  title: "Too large, split",
  story: "Sebastian asks to rewrite the calendar; the agent files it in the plan lane, and the planner's four cards wait for his accept.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => scene(now, { tasks: week(now), replies: [filing] }), actions: [{ goto: "/" }], hold: 1500 },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", story.requests.calendar] }, { press: "Enter" }, { waitFor: doIt }, { wait: 3000 }, { hover: doIt }],
      hold: 600,
    },
    // the lab's Forgejo files no issue on nord/booking, so the press is the cursor on Do it and this seed is what it leaves
    { state: (now) => scene(now, { ...thread(now), ...planning(now) }), actions: [{ goto: "/" }, { hover: `#board [data-card="${state.id(105)}"]` }], hold: 2500 },
    {
      state: (now) => scene(now, { ...thread(now), ...waiting(now) }),
      actions: [{ hover: `#board article.approval.plan[data-card="${state.id(105)}"]` }],
      hold: 2500,
    },
    {
      state: () => null,
      actions: [{ click: `#board article.approval.plan[data-card="${state.id(105)}"] a.open` }, { click: '#drawer [data-sec="plan"] > summary' }],
      hold: 3500,
    },
  ],
};
