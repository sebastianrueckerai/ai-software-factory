const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const HOUR = 3600;
const BOARD = ui.board(["performance-read"]);

// Friday of week 2: the weekly performance read at 07:00 measures GET /schedule at 0.74 s at the p95, up from 0.31 s,
// and files #123, which is live an hour later. The story's time stands as long after that read as now is after the
// read's last run, so #123 shows in the state its age from that run reached.

// the week's other cards are done: issue, done after, spend
const finished = [
  [116, 1.5 * HOUR, 1.04], [117, 9.5 * HOUR, 0.45], [118, 77 * 60, 0.36], [119, 34 * 60, 0.29], [120, 9.8 * HOUR, 0.86], [121, 9 * HOUR + 20 * 60, 0.46],
  [122, story.merges[122].live, 0.61],
];

// board is the board now: #123, the weekly bump's #115 and the week's other cards; Sebastian has set the bump to wait
// on him
function board(now) {
  const at = story.anchoredAt(now, 123);
  const cards = [story.routineCard(now, 123, at), story.routineCard(now, 115, at)];
  return state.scene(now, {
    ...story.board([...cards, ...story.doneAt(now, at, finished)]),
    ...story.routinesAt(now, at, { needsMe: "dependency-bump", cards: cards.map((c) => c.task) }),
    ...story.spending(at),
  });
}

module.exports = {
  title: "The performance routine",
  story: "The weekly performance read finds the schedule page's p95 up from 0.31 s to 0.74 s since the teacher filter and files a card with the numbers.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: board, actions: [{ goto: BOARD }, { hover: `${ui.face(123)} .chip.routine` }], hold: 2500 },
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
