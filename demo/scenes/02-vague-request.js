const state = require("../lib/state");
const story = require("../lib/story");

const HOUR = 3600;
const args = story.filing(102, "ready");
const read = { state: "all" };
const doIt = "#chat-log .proposal [data-doit]";

// the latency alert fired on three evenings and settled itself each time
const fired = [[14 * HOUR, 13 * HOUR], [38 * HOUR, 37 * HOUR], [62 * HOUR, 61.5 * HOUR]];
const alerts = (now) => story.alerts.scheduleLatency.slice().reverse()
  .map((a, i) => state.alert(now, { ...a, age: fired[i][0], resolvedAge: fired[i][1] }));

// alertsRead is the alerts tool's answer over those rows, as the console words it.
function alertsRead(now) {
  const since = (raised) => raised.replace("T", " ").slice(0, 16);
  return "Alerts:\n" + alerts(now).map((a) =>
    `${a.ID} ${a.Kind} ${a.Source} "${a.Fingerprint}" since ${since(a.RaisedAt)} UTC, verdict ${a.Verdict} by ${a.ResolvedBy}`).join("\n");
}

const answer = state.reply(state.say(story.replies.scheduleRead), state.call("alerts", read));
const filing = state.reply(state.say(story.replies.schedule), state.call("new_card", args));

// the morning's waitlist card has pushed its pull request, and the review reads it
const waitlist = (now) => story.card(now, 101, {
  status: "in-review", lane: "ready", age: 38 * 60, gate: "review", gateSince: 4 * 60, model: "small", spent: 0.42, pr: story.cards[101].pr,
});

// the morning's thread is the first; Sebastian talks in a fresh one
function morning(now) {
  const ask = story.asks.waitlist;
  const p = state.cardFiling(now, story.filing(101, "ready"));
  const rows = [
    state.message(now, { role: "user", content: story.requests.waitlist, age: 40 * 60 }),
    state.ask(now, { question: ask.question, choices: ask.choices, age: 40 * 60 - 5 }),
    state.message(now, { role: "user", content: ask.answer, age: 39 * 60 }),
    state.message(now, { role: "assistant", content: story.replies.waitlist, age: 39 * 60 - 5, toolCalls: [state.proposedCall(now, p, { id: "call_1", age: 39 * 60 - 5 })] }),
    state.pressed(now, p, { age: 38 * 60, result: "Filed nord/booking#101 in lane ready. It cannot be undone." }),
  ];
  return { rows: rows.map((m) => ({ ...m, conversation: 1 })), used: p };
}

// filed is the second thread after the Do it
function filed(now) {
  const p = state.cardFiling(now, args);
  const rows = [
    state.message(now, { role: "user", content: story.requests.schedule, age: 9 }),
    state.message(now, {
      role: "assistant", content: story.replies.scheduleRead, age: 8,
      toolCalls: [{ id: "call_1", name: "alerts", arguments: JSON.stringify(read), read_at: new Date(now - 8000).toISOString(), result: alertsRead(now) }],
    }),
    state.message(now, { role: "assistant", content: story.replies.schedule, age: 8, toolCalls: [state.proposedCall(now, p, { id: "call_1", age: 8 })] }),
    state.pressed(now, p, { age: 2, result: "Filed nord/booking#102 in lane ready. It cannot be undone." }),
  ];
  return { rows: rows.map((m) => ({ ...m, conversation: 2 })), used: p };
}

function board(now, { thread, tasks = [], replies }) {
  const first = morning(now);
  const chat = [...first.rows, ...(thread ? thread.rows : [])];
  return state.scene(now, {
    tasks: [waitlist(now), ...tasks],
    objects: { [`sessions/${state.id(101)}/timeline.jsonl`]: state.timeline(now, 30 * 60, { alias: "small" }) },
    alerts: alerts(now), chat, open: 2, seen: state.seen(chat), usedProposals: [first.used, ...(thread ? [thread.used] : [])],
    spend: 0.55, chatSpend: 0.13, replies,
  });
}

module.exports = {
  title: "A vague request, measured",
  story: "Sebastian says the schedule page feels slow; the agent reads the telemetry by tool, names the p95 of /schedule and files a card with the figure as its bar.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => board(now, { replies: [answer, filing] }), actions: [{ goto: "/" }], hold: 1500 },
    {
      state: () => null,
      actions: [
        { click: "#chat-input" }, { type: ["#chat-input", story.requests.schedule] }, { press: "Enter" },
        { waitFor: doIt }, { wait: 3500 }, { hover: doIt },
      ],
      hold: 600,
    },
    // the lab's Forgejo files no issue on nord/booking, so the press is the cursor on Do it and this seed is what it leaves
    { state: (now) => board(now, { thread: filed(now) }), actions: [{ goto: "/" }], hold: 1500 },
    {
      state: (now) => board(now, { thread: filed(now), tasks: [story.card(now, 102, { status: "queued", lane: "ready", age: 3 })] }),
      actions: [{ hover: `#board [data-card="${state.id(102)}"]` }],
      hold: 2500,
    },
  ],
};
