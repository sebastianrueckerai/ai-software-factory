const project = require("../lib/project");
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

// the week's earlier cards are done: issue, done after, spend; #104 of week 1 for its alert. The weekly bump's #115 is
// on its run's clock.
const finished = [[104, HOUR, 0.48], [116, 1.5 * HOUR, 1.04], [117, 9.5 * HOUR, 0.45], [120, 9.8 * HOUR, 0.86], [121, 9.3 * HOUR, 0.46]];

const reading = state.reply(state.say(story.replies.alertsRead), state.call("alerts", { state: "all" }));
const settled = state.reply(state.say(story.replies.schedule500));

// Sebastian asks a quarter minute after the alert rose and before the factory files #119. The agent reads the open
// alerts, #118's last events and #118; t is minutes after the merge.
const ASKED = 9.25;
const tOf = (d) => (d - M) / (MIN * 1000);
const LIVE = tOf(new Date(story.filed[118].getTime() + merges[118].live * 1000));
const reads = [["alerts", { state: "open" }], ["card_history", { task_id: "118", n: 2 }], ["card", { task_id: "118" }]];
const checking = state.reply(state.say(story.replies.scheduleCheckRead), ...reads.map(([tool, args]) => state.call(tool, args)));

// clock is the wall time of minute m after the merge, seen at minute t, as the tools write it: "2026-10-20 14:07"
const clock = (now, t, m) => new Date(now - (t - m) * MIN * 1000).toISOString().slice(0, 16).replace("T", " ");
const broken = (now, t) => story.replies.scheduleBroken(clock(now, t, LIVE).slice(11), clock(now, t, tOf(alert.raised)).slice(11));

// reads' answers as the tools gave them at the question, seen at minute t; k is #118's card
function answers(now, t, k) {
  const c = story.cards[118];
  const git = `https://git.example/${project.repository}`;
  return [
    `Open alerts:\n${alert.id} ${alert.kind} ${alert.source} "${alert.fingerprint}" since ${clock(now, t, tOf(alert.raised))} UTC, open`,
    `${clock(now, t, LIVE)} #118 ${k.ID} task_ended by factoryd via factoryd {"reason":"live: covered by run ${merges[118].run}","state":"done"}\n` +
      `${clock(now, t, 0)} #118 ${k.ID} pull_request_merged by factoryd via factoryd {"by":"factory-merge","pr":${c.pr}}`,
    [
      `#118 ${k.ID} "${c.title}" done (is done), €${k.SpentEUR.toFixed(2)} of €${k.BudgetEUR.toFixed(2)}`, "lane ready of process spec",
      `issue ${git}/issues/118`, "sessions: 0 of 3", "cost: no model calls",
      `pull request #${c.pr} ${git}/pulls/${c.pr}, head ${story.sessions[118]["s-1"].commit}, merged`,
      "reviews: approve (0 findings): see pr", "checks: 4/4: see pr", "sessions: 1: see session", `objective: ${k.Objective}`,
    ].join("\n"),
  ];
}

// checked is the question's thread as the console stored it, seen at minute t
function checked(now, t, k) {
  const age = (t - ASKED) * MIN;
  const results = answers(now, t, k);
  const readAt = new Date(now - (age - 1) * 1000).toISOString();
  return [
    state.message(now, { role: "user", content: story.requests.scheduleCheck, age }),
    state.message(now, {
      role: "assistant", content: story.replies.scheduleCheckRead, age: age - 1,
      toolCalls: reads.map(([name, args], i) => ({ id: `call_${i + 1}`, name, arguments: JSON.stringify(args), read_at: readAt, result: results[i] })),
    }),
    state.message(now, { role: "assistant", content: broken(now, t), age: age - 2 }),
  ];
}

// thursday is the board t minutes after #118's merge, with the question's thread once it was asked
function thursday(now, t, o = {}) {
  const at = new Date(M.getTime() + t * MIN * 1000);
  const age = (issue) => story.ageAt(issue, at);
  const lives = [story.life(now, 118, age(118), filter), ...(age(119) >= 0 ? [story.life(now, 119, age(119), fix)] : [])];
  const b = story.board([...lives, story.routineCard(now, 115, at), ...story.doneAt(now, at, finished)]);
  const events = [118, 119].filter((i) => age(i) >= 0).flatMap((i) => story.mergeEvents(now, i, age(i), merges[i]));
  const chat = t > ASKED ? checked(now, t, lives[0].task) : undefined;
  return state.scene(now, { ...b, events, alerts: story.alertsAt(now, at), chat, seen: chat && state.seen(chat), spend: 18.4, chatSpend: 0.92, ...o });
}

const named = '#chat-log .msg.agent:has-text("e41b7c9")';
const answered = '#chat-log .msg.agent:has-text("settled when #119 went live")';
const toolRow = (n) => `#chat-log details.tool > summary >> nth=${n}`;

module.exports = {
  title: "A bad merge",
  story: "Minutes after the teacher filter goes live, the schedule answers 500 and the chat's alerts show it, beside the merge's " +
    "commit; the factory files the fix from the alert, the fix goes live and the alert settles.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => thursday(now, 8), actions: [{ goto: "/" }, { hover: ui.open(118) }], hold: 2000 },
    {
      state: (now) => thursday(now, 9.2, { replies: [checking, state.reply(state.say(broken(now, 9.2)))] }),
      actions: [
        { goto: "/" }, { click: "#chat-input" }, { type: ["#chat-input", story.requests.scheduleCheck] }, { press: "Enter" },
        { waitFor: named }, { click: toolRow(0) }, { hover: ui.park },
      ],
      hold: 5000,
    },
    { state: (now) => thursday(now, 11.5), actions: [{ goto: "/" }, { waitFor: ui.face(119) }, { hover: ui.open(119) }], hold: 2500 },
    {
      state: () => null,
      actions: [{ click: ui.open(119) }, { waitFor: ui.tab("overview") }, { click: ui.tab("overview") }, { waitFor: ui.objective }, { click: ui.objective }],
      hold: 4500,
    },
    {
      state: (now) => thursday(now, 46, { replies: [reading, settled] }),
      actions: [{ goto: "/" }, { hover: ui.park }],
      hold: 2500,
    },
    {
      state: () => null,
      actions: [
        { click: "#chat-input" }, { type: ["#chat-input", story.requests.schedule500] }, { press: "Enter" },
        { waitFor: answered }, { click: toolRow(-1) }, { scroll: toolRow(-1) }, { hover: ui.park },
      ],
      hold: 4000,
    },
  ],
};
