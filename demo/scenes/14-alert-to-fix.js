const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const alert = story.alerts.checkout;

// Tuesday of week 1: POST /checkout/confirm answers 500 since the Stripe webhook change, and a minute after the alert
// the factory files #104 from it. Offsets are seconds after #104's creation; it is live an hour after its filing.
const created = new Date(alert.raised.getTime() + MIN * 1000);
const merge = { queued: 29 * MIN, at: 52 * MIN, live: 60 * MIN, run: 58 };
const checkout = {
  phases: [
    { from: 0, status: "queued" },
    { from: MIN, status: "running", gate: "session", model: "small", spent: 0.04 },
    { from: 16.5 * MIN, status: "in-review", gate: "checks", spent: 0.21, pr: true },
    { from: 23 * MIN, gate: "review" },
    { from: 29 * MIN, gate: "merge-queue", spent: 0.48 },
    ...story.merging(merge, 0.48),
  ],
  steps: [
    state.intake(0, 20),
    ...story.session(104, 1, MIN, 16 * MIN, { model: "small" }),
    state.checks(16.5 * MIN, 23 * MIN),
    story.review(104, 1, 23 * MIN, 28 * MIN, "s-1"),
    ...story.merge(104, merge),
  ],
  card: { author: "factory-agent", source: "alert", fingerprint: alert.fingerprint },
};

// Monday's cards are done: issue, age and done after in hours at #104's filing, spend
const monday = [[101, 26, 2, 1.12], [102, 25.4, 2.9, 0.64], [103, 24.4, 1.4, 0.31]];

const reading = state.reply(state.say(story.replies.alertsRead), state.call("alerts", { state: "all" }));
const settled = state.reply(state.say(story.replies.checkout));

// tuesday is the board m minutes after #104's filing
function tuesday(now, m, o = {}) {
  const at = new Date(created.getTime() + m * MIN * 1000);
  const b = story.board([
    story.life(now, 104, m * MIN, checkout),
    ...monday.map(([issue, age, after, spent]) => story.done(now, issue, (age + m / 60) * HOUR, after * HOUR, spent)),
  ]);
  return state.scene(now, { ...b, events: story.mergeEvents(now, 104, m * MIN, merge), alerts: story.alertsAt(now, at), ...story.spending(at), ...o });
}

const answered = '#chat-log .msg.agent:has-text("settled when #104 went live")';

module.exports = {
  title: "Alert to fix",
  story: "Checkout answers 500 after the Stripe webhook change; the card the factory files carries the stack trace, the agent " +
    "fixes the line it names, the fix goes live and the alert settles.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => tuesday(now, 2), actions: [{ goto: "/" }, { hover: ui.open(104) }], hold: 2000 },
    {
      state: () => null,
      actions: [{ click: ui.open(104) }, { waitFor: ui.tab("overview") }, { click: ui.tab("overview") }, { waitFor: ui.objective }, { click: ui.objective }],
      hold: 4500,
    },
    { state: (now) => tuesday(now, 12), actions: [{ click: ui.tab("chat") }, { waitFor: "#session-log .msg" }], hold: 4000 },
    {
      state: (now) => tuesday(now, 62, { replies: [reading, settled] }),
      actions: [{ goto: "/" }, { hover: ui.park }],
      hold: 2500,
    },
    {
      state: () => null,
      actions: [
        { click: "#chat-input" }, { type: ["#chat-input", story.requests.checkout] }, { press: "Enter" },
        { waitFor: answered }, { click: ui.tool }, { hover: ui.park },
      ],
      hold: 4000,
    },
  ],
};
