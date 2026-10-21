const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const c = story.cards[103];
const MIN = 60;
const filed = ui.face(103);

// Monday afternoon: the lobby queue card waits in the merge queue, the matchmaking card builds; filed adds #103 as the lab
// filed it from the form
function monday(now, filed) {
  const queue = story.card(now, 101, {
    status: "in-review", lane: "ready", age: 95 * MIN, gate: "merge-queue", gateSince: 3 * MIN, model: "small", spent: 0.71, pr: story.cards[101].pr,
  });
  const matchmaking = story.card(now, 102, { status: "running", lane: "ready", age: 57 * MIN, gate: "session", gateSince: 18 * MIN, model: "small", spent: 0.22 });
  const tasks = [queue, matchmaking];
  if (filed) tasks.push(story.card(now, 103, { status: "queued", lane: "ready", age: 6 }));
  return state.scene(now, {
    tasks,
    objects: {
      [`sessions/${queue.ID}/timeline.jsonl`]: state.timeline(now, 90 * MIN, {
        alias: "small",
        steps: [story.review(101, 1, 26 * MIN, 84 * MIN, "s-1")],
      }),
      [`sessions/${matchmaking.ID}/timeline.jsonl`]: state.timeline(now, 19 * MIN, { steps: [state.intake(0, 0), state.sessionStart(MIN, { model: "small" })] }),
    },
    ...story.spending(story.at(101, 95 * MIN)),
  });
}

module.exports = {
  title: "A card from the board",
  story: "Sebastian files a card by hand through the New task form: title, description, lane and size, filed; the card lands on the board.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => monday(now, false), actions: [{ goto: "/" }], hold: 1500 },
    { state: () => null, actions: [{ click: 'nav a[href="/tasks/new"]' }, { waitFor: "#title" }], hold: 1200 },
    {
      state: () => null,
      actions: [
        { click: "#title" }, { type: ["#title", c.title] },
        { click: "#body" }, { type: ["#body", story.description(103)] },
        { hover: "#lane" }, { type: ["#lane", "Ready"] },
        { hover: "#size" }, { type: ["#size", c.size] },
        { hover: 'form.newtask button[type="submit"]' },
      ],
      hold: 1200,
    },
    { state: () => null, actions: [{ click: 'form.newtask button[type="submit"]' }, { waitFor: filed }], hold: 2000 },
    { state: (now) => monday(now, true), actions: [{ hover: filed }], hold: 2500 },
  ],
};
