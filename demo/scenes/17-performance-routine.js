const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const HOUR = 3600;

// Friday of week 2: the weekly performance read at 07:00 measures GET /schedule at 0.74 s at the p95, up from 0.31 s,
// and files #123 a minute later; it waits for a slot.

// the week's cards are done: issue, done after, spend
const finished = [
  [115, 3 * HOUR, 0.38], [116, 1.5 * HOUR, 1.04], [117, 9.5 * HOUR, 0.45], [118, 77 * 60, 0.36], [119, 34 * 60, 0.29], [120, 9.8 * HOUR, 0.86],
  [121, 9.3 * HOUR, 0.46],
];

function friday(now, hm) {
  const at = story.date(2, "fri", hm);
  const card = story.life(now, 123, story.ageAt(123, at), story.lives[123]);
  return state.scene(now, {
    ...story.board([card, ...story.doneAt(now, at, finished)]),
    ...story.routinesAt(now, at, { needsMe: "dependency-bump", open: { "performance-read": card.task } }),
    spend: 19.1, chatSpend: 0.92,
  });
}

module.exports = {
  title: "The performance routine",
  story: "The weekly performance read finds the schedule page's p95 up from 0.31 s to 0.74 s since the teacher filter and files a card with the numbers.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => friday(now, "07:03"), actions: [{ goto: "/" }, { hover: `${ui.face(123)} .chip.routine` }], hold: 2500 },
    {
      state: () => null,
      actions: [{ click: ui.open(123) }, { waitFor: ui.objective }, { click: ui.objective }],
      hold: 4500,
    },
    {
      state: () => null,
      actions: [
        { click: "#drawer .provenance [data-open-routine]" }, { waitFor: ui.tab("runs") }, { click: ui.tab("runs") }, { waitFor: "#drawer .life.runs" },
        { hover: "#drawer .acts" },
      ],
      hold: 4500,
    },
  ],
};
