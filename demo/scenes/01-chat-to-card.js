const state = require("../lib/state");
const story = require("../lib/story");

const ask = story.asks.waitlist;
const args = story.filing(101, "ready");
const doIt = "#chat-log .proposal [data-doit]";

// the agent's text is its question, so the thread reads the same live and when the console reads it again
const asking = state.reply(state.say(ask.question), state.call("ask", { ask: ask.question, choices: ask.choices }));
const proposing = state.reply(state.say(story.replies.waitlist), state.call("new_card", args));

// thread is the conversation as the console stores it: asked, or filed after the Do it.
function thread(now, filed) {
  const rows = [
    state.message(now, { role: "user", content: story.requests.waitlist, age: filed ? 24 : 6 }),
    state.ask(now, { question: ask.question, choices: ask.choices, age: filed ? 22 : 5 }),
  ];
  if (!filed) return { chat: rows, seen: state.seen(rows) };
  const p = state.cardFiling(now, args);
  rows.push(
    state.message(now, { role: "user", content: ask.answer, age: 9 }),
    state.message(now, { role: "assistant", content: story.replies.waitlist, age: 7, toolCalls: [state.proposedCall(now, p, { id: "call_1", age: 7 })] }),
    state.pressed(now, p, { age: 2, result: "Filed nord/booking#101 in lane ready. It cannot be undone." }),
  );
  return { chat: rows, seen: state.seen(rows), usedProposals: [p] };
}

module.exports = {
  title: "Chat to card",
  story: "Sebastian asks for a waitlist in the chat; the agent asks one question, proposes the card, and the card lands on the board.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => state.scene(now, { replies: [asking] }), actions: [{ goto: "/" }], hold: 1500 },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", story.requests.waitlist] }, { press: "Enter" }, { waitFor: "#chat-log details.tool" }],
      hold: 2500,
    },
    {
      state: (now) => state.scene(now, { ...thread(now, false), replies: [proposing] }),
      // a streamed ask draws its choices only once the console reads the thread again
      actions: [{ goto: "/" }, { waitFor: "#chat-answer [data-choice]" }],
      hold: 1500,
    },
    {
      state: () => null,
      actions: [{ click: `#chat-answer [data-choice="${ask.answer}"]` }, { waitFor: doIt }, { wait: 3000 }, { hover: doIt }],
      hold: 600,
    },
    // the lab's Forgejo files no issue on nord/booking, so the press is the cursor on Do it and this seed is what it leaves
    { state: (now) => state.scene(now, thread(now, true)), actions: [{ goto: "/" }], hold: 1500 },
    {
      state: (now) => state.scene(now, { ...thread(now, true), tasks: [story.card(now, 101, { status: "queued", lane: "ready", age: 3 })] }),
      // an empty board learns no faces, so its heartbeat never redraws it: the page reads the board again
      actions: [{ goto: "/" }, { hover: `#board [data-card="${state.id(101)}"]` }],
      hold: 2500,
    },
  ],
};
