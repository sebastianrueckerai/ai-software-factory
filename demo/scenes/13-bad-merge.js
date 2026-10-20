const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const alert = story.alerts.badMerge;

// Thursday of week 2: the teacher filter #118 merges at 17:10 and goes live, and two minutes later the schedule
// answers 500 to every link without a teacher. The factory files the fix #119 from the alert; offsets are seconds
// after each card's creation.
const M = story.date(2, "thu", "17:10");
const merges = {
  118: { queued: 33 * MIN, at: 70 * MIN, live: 77 * MIN, run: 88 },
  119: { queued: 25 * MIN, at: 28 * MIN, live: 34 * MIN, run: 89 },
};
const filter = {
  phases: [
    { from: 0, status: "queued" },
    { from: 2 * MIN, status: "running", gate: "session", model: "small", spent: 0.05 },
    { from: 20 * MIN, status: "in-review", gate: "checks", spent: 0.27, pr: true },
    { from: 27 * MIN, gate: "review" },
    { from: 33 * MIN, gate: "merge-queue", spent: 0.36 },
    ...story.merging(merges[118], 0.36),
  ],
  steps: [
    state.intake(0, 20),
    ...story.session(118, 1, 2 * MIN, 19.5 * MIN, { model: "small" }),
    state.checks(20 * MIN, 27 * MIN),
    story.review(118, 1, 27 * MIN, 32 * MIN, "s-1"),
    ...story.merge(118, merges[118]),
  ],
};
const fix = {
  phases: [
    { from: 0, status: "queued" },
    { from: MIN, status: "running", gate: "session", model: "small", spent: 0.04 },
    { from: 13 * MIN, status: "in-review", gate: "checks", spent: 0.22, pr: true },
    { from: 20 * MIN, gate: "review" },
    { from: 25 * MIN, gate: "merge-queue", spent: 0.29 },
    ...story.merging(merges[119], 0.29),
  ],
  steps: [
    state.intake(0, 15),
    ...story.session(119, 1, MIN, 12.5 * MIN, { model: "small" }),
    state.checks(13 * MIN, 20 * MIN),
    story.review(119, 1, 20 * MIN, 24 * MIN, "s-1"),
    ...story.merge(119, merges[119]),
  ],
  card: { author: "factory-agent", source: "alert", fingerprint: alert.fingerprint },
};

// the week's earlier cards are done: issue, done after, spend; #104 of week 1 for its alert
const finished = [[104, HOUR, 0.48], [115, 3 * HOUR, 0.38], [116, 1.5 * HOUR, 1.04], [117, 9.5 * HOUR, 0.45], [120, 9.8 * HOUR, 0.86], [121, 9.3 * HOUR, 0.46]];

const reading = state.reply(state.say(story.replies.alertsRead), state.call("alerts", { state: "all" }));
const settled = state.reply(state.say(story.replies.schedule500));

// thursday is the board t minutes after #118's merge
function thursday(now, t, o = {}) {
  const at = new Date(M.getTime() + t * MIN * 1000);
  const age = (issue) => story.ageAt(issue, at);
  const lives = [story.life(now, 118, age(118), filter), ...(age(119) >= 0 ? [story.life(now, 119, age(119), fix)] : [])];
  const b = story.board([...lives, ...story.doneAt(now, at, finished)]);
  const events = [118, 119].filter((i) => age(i) >= 0).flatMap((i) => story.mergeEvents(now, i, age(i), merges[i]));
  return state.scene(now, { ...b, events, alerts: story.alertsAt(now, at), spend: 18.4, chatSpend: 0.92, ...o });
}

const answered = '#chat-log .msg.agent:has-text("settled when #119 went live")';

module.exports = {
  title: "A bad merge",
  story: "Minutes after the teacher filter goes live, the schedule answers 500; the factory files the fix from the alert, which " +
    "names the merge's commit, the fix goes live and the alert settles.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => thursday(now, 8), actions: [{ goto: "/" }, { hover: ui.face(118) }], hold: 2000 },
    { state: (now) => thursday(now, 11.5), actions: [{ waitFor: ui.face(119) }, { hover: ui.open(119) }], hold: 2500 },
    {
      state: () => null,
      actions: [{ click: ui.open(119) }, { waitFor: ui.tab("overview") }, { click: ui.tab("overview") }, { waitFor: ui.objective }, { click: ui.objective }],
      hold: 4500,
    },
    {
      state: (now) => thursday(now, 46, { replies: [reading, settled] }),
      actions: [{ goto: "/" }, { hover: `${ui.face(119)} .elapsed` }],
      hold: 2500,
    },
    {
      state: () => null,
      actions: [
        { click: "#chat-input" }, { type: ["#chat-input", story.requests.schedule500] }, { press: "Enter" },
        { waitFor: answered }, { click: ui.tool }, { hover: `${ui.face(119)} .elapsed` },
      ],
      hold: 4000,
    },
  ],
};
