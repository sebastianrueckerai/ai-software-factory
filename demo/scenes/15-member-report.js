const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const reporter = story.cards[106].reporter;
const args = story.filing(107, "ready");
const merge = story.merges[107];

const proposing = state.reply(state.say(story.replies.report), state.call("new_card", args));

// Wednesday of week 1: maria.k's report arrives as issue #106 at 15:30, and Sebastian files the fix #107 from it at
// 16:00, where scene 10 takes it up. Monday's and Tuesday's cards are done: issue, age and done after in hours at 16:00,
// spend.
const finished = [[101, 53, 2, 1.12], [102, 52.4, 2.9, 0.64], [103, 51.4, 1.4, 0.31], [104, 27, 1, 0.48]];

// wednesday is the board m minutes after #107's filing, before it too: the report waits in the backlog until the fix
// merges, which closes it
function wednesday(now, m, o = {}) {
  const report = m < merge.at / MIN
    ? story.card(now, 106, { status: "backlog", lane: "backlog", age: (30 + m) * MIN, author: reporter })
    : story.card(now, 106, { status: "closed", lane: "backlog", age: (30 + m) * MIN, finished: m * MIN - merge.at, author: reporter });
  const fix = m >= 0 ? [story.life(now, 107, m * MIN, story.lives[107])] : [];
  const b = story.board([...fix, ...finished.map(([issue, age, after, spent]) => story.done(now, issue, (age + m / 60) * HOUR, after * HOUR, spent))]);
  return state.scene(now, { ...b, tasks: [report, ...b.tasks], ...story.spending(story.at(107, m * MIN)), ...o });
}

// filed is the state the Do it left, m minutes later: the thread as the console stored it, the filing among #107's
// events with its thread, and the merge's events
function filed(now, m) {
  const t = state.filedThread(now, { said: story.requests.report, reply: story.replies.report, args, issue: 107, age: m * MIN + 8 });
  return wednesday(now, m, {
    chat: t.rows, seen: state.seen(t.rows), usedProposals: [t.proposal],
    events: [
      state.event(now, { issue: 107, kind: "card_filed", actor: "sebastian", via: "chat", age: m * MIN + 5, detail: { lane: "ready", thread: 1 } }),
      ...story.mergeEvents(now, 107, m * MIN, merge),
    ],
  });
}

module.exports = {
  title: "A member's report",
  story: "A member reports a missing confirmation mail as an issue; Sebastian has the agent file the fix card from it, the fix merges " +
    "and closes the report, and the fix card's drawer names the report it came from.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    {
      state: (now) => wednesday(now, -28),
      actions: [{ goto: "/" }, { click: ui.open(106) }, { waitFor: ui.objective }, { click: ui.objective }, { click: ui.links }],
      hold: 4000,
    },
    {
      state: (now) => wednesday(now, -1, { replies: [proposing] }),
      actions: [
        { goto: "/" }, { click: "#chat-input" }, { type: ["#chat-input", story.requests.report] }, { press: "Enter" },
        { waitFor: ui.doIt }, { wait: 2500 }, { hover: ui.doIt },
      ],
      hold: 600,
    },
    { state: () => null, actions: [{ click: ui.doIt }, { waitFor: "#chat-log .applied" }, { waitFor: ui.face(107) }, { hover: ui.open(107) }], hold: 2000 },
    { state: (now) => filed(now, 59), actions: [{ goto: "/" }, { hover: ui.open(107) }], hold: 2500 },
    {
      state: (now) => filed(now, 66),
      actions: [{ goto: "/" }, { click: ui.open(107) }, { waitFor: ui.objective }, { click: ui.objective }],
      hold: 4500,
    },
  ],
};
