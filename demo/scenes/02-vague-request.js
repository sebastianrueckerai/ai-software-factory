const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const HOUR = 3600;
const args = story.filing(102, "ready");
const read = { state: "all" };
const doIt = ui.doIt;
const filed = ui.face(102);

// the latency alert fired three times and settled itself each time
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
  const f = state.filedThread(now, { said: ask.answer, reply: story.replies.waitlist, args: story.filing(101, "ready"), issue: 101, age: 39 * 60 });
  const rows = [
    state.message(now, { role: "user", content: story.requests.waitlist, age: 40 * 60 }),
    state.ask(now, { question: ask.question, choices: ask.choices, age: 40 * 60 - 5 }),
    ...f.rows,
  ];
  return { rows: rows.map((m) => ({ ...m, conversation: 1 })), used: f.proposal };
}

// second is the thread the console stored after the Do it: the alerts read sits before the proposing reply
function second(now) {
  const f = state.filedThread(now, { said: story.requests.schedule, reply: story.replies.schedule, args, issue: 102, age: 9 });
  const reading = state.message(now, {
    role: "assistant", content: story.replies.scheduleRead, age: 8,
    toolCalls: [{ id: "call_1", name: "alerts", arguments: JSON.stringify(read), read_at: new Date(now - 8000).toISOString(), result: alertsRead(now) }],
  });
  const rows = [f.rows[0], reading, ...f.rows.slice(1)];
  return { rows: rows.map((m) => ({ ...m, conversation: 2 })), used: f.proposal };
}

function board(now, { thread, tasks = [], replies }) {
  const first = morning(now);
  const chat = [...first.rows, ...(thread ? thread.rows : [])];
  return state.scene(now, {
    tasks: [waitlist(now), ...tasks],
    objects: { [`sessions/${state.id(101)}/timeline.jsonl`]: state.timeline(now, 30 * 60, { alias: "small" }) },
    alerts: alerts(now), chat, open: 2, seen: state.seen(chat), usedProposals: [first.used, ...(thread ? [thread.used] : [])],
    ...story.spending(story.at(101, 38 * 60)), replies,
  });
}

module.exports = {
  title: "A vague request, measured",
  story: "Sebastian says the schedule page feels slow; the agent reads the telemetry's alerts by tool, names the p95 of /schedule and files a card with the bar in its acceptance.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => board(now, { replies: [answer, filing] }), actions: [{ goto: "/" }], hold: 1500 },
    {
      state: () => null,
      actions: [
        { click: "#chat-input" }, { type: ["#chat-input", story.requests.schedule] }, { press: "Enter" },
        { waitFor: doIt }, { click: "#chat-log details.tool > summary" },
      ],
      hold: 3500,
    },
    { state: () => null, actions: [{ hover: doIt }, { wait: 600 }, { click: doIt }, { waitFor: "#chat-log .applied" }, { waitFor: filed }], hold: 2000 },
    {
      state: (now) => board(now, { thread: second(now), tasks: [story.card(now, 102, { status: "queued", lane: "ready", age: 5 })] }),
      actions: [{ hover: filed }],
      hold: 2500,
    },
  ],
};
