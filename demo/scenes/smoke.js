const state = require("../lib/state");

const card = (now, o) => state.card(now, {
  issue: 12, lane: "ready", age: 600, title: "Waitlist when a class is full", body: "Members ask for it.", ...o,
});

module.exports = {
  title: "Smoke",
  story: "One card runs, then is done.",
  group: "smoke",
  theme: "dark",
  viewport: "desk",
  steps: [
    {
      state: (now) => state.scene(now, { tasks: [card(now, { status: "running", gate: "session", gateSince: 500 })] }),
      actions: [{ goto: "/" }],
      hold: 1500,
    },
    {
      state: (now) => state.scene(now, { tasks: [card(now, { status: "done", finished: 60 })] }),
      actions: [],
      hold: 1500,
    },
  ],
};
