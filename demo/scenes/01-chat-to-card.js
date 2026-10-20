const state = require("../lib/state");
const story = require("../lib/story");

const DAY = 86400;
const ask = story.asks.waitlist;
const args = story.filing(101, "ready");
const doIt = "#chat-log .proposal [data-doit]";
const filed = `#board [data-card="${state.id(101)}"]`;

// the agent's text is its question, so the thread reads the same live and when the console reads it again
const asking = state.reply(state.say(ask.question), state.call("ask", { ask: ask.question, choices: ask.choices }));
const proposing = state.reply(state.say(story.replies.waitlist), state.call("new_card", args));

// #100 is off the board, finished before its seven days; the lab files the waitlist as the card after it
const before = (now) => story.card(now, 100, { status: "done", lane: "ready", age: 13 * DAY, finished: 12 * DAY, spent: 0.38, model: "small" });

// after is the state the Do it left: the thread as the console stored it and #101 as the lab filed it
function after(now) {
  const f = state.filedThread(now, { said: ask.answer, reply: story.replies.waitlist, args, issue: 101, age: 8 });
  const chat = [
    state.message(now, { role: "user", content: story.requests.waitlist, age: 20 }),
    state.ask(now, { question: ask.question, choices: ask.choices, age: 19 }),
    ...f.rows,
  ];
  return state.scene(now, {
    tasks: [before(now), story.card(now, 101, { status: "queued", lane: "ready", age: 5 })],
    chat, seen: state.seen(chat), usedProposals: [f.proposal],
  });
}

module.exports = {
  title: "Chat to card",
  story: "Sebastian asks for a waitlist in the chat; the agent asks one question, proposes the card, and the card lands on the board.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => state.scene(now, { tasks: [before(now)], replies: [asking, proposing] }), actions: [{ goto: "/" }], hold: 1500 },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", story.requests.waitlist] }, { press: "Enter" }, { waitFor: "#chat-log details.tool" }],
      hold: 2500,
    },
    // a streamed ask draws its choices only once the console reads the thread again
    { state: () => null, actions: [{ goto: "/" }, { waitFor: "#chat-answer [data-choice]" }], hold: 1500 },
    {
      state: () => null,
      actions: [{ click: `#chat-answer [data-choice="${ask.answer}"]` }, { waitFor: doIt }, { wait: 3000 }, { hover: doIt }],
      hold: 600,
    },
    { state: () => null, actions: [{ click: doIt }, { waitFor: "#chat-log .applied" }, { waitFor: filed }], hold: 2000 },
    { state: after, actions: [{ hover: filed }], hold: 2500 },
  ],
};
