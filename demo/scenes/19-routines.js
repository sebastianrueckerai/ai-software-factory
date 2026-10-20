const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const HOUR = 3600;
const bump = ui.ghost("dependency-bump");
const read = ui.ghost("performance-read");
const BOARD = ui.board(["security-scan", "dependency-bump", "performance-read"], "performance-read");

// the week's other cards are done: issue, done after, spend
const finished = [
  [116, 1.5 * HOUR, 1.04], [117, 9.5 * HOUR, 0.45], [118, 77 * 60, 0.36], [119, 34 * 60, 0.29], [120, 9.8 * HOUR, 0.86], [121, 9 * HOUR + 20 * 60, 0.46],
  [122, story.merges[122].live, 0.61],
];

// board is the board of scene 17 now, the story's time as long after the performance read of week 2 as now is after
// the read's last run: #123 and the weekly bump's #115 in the states their runs' ages reached. Sebastian has set the
// bump to wait on him, so its next run files a human card.
function board(now) {
  const at = story.anchoredAt(now, 123);
  const cards = [story.routineCard(now, 123, at), story.routineCard(now, 115, at)];
  return state.scene(now, {
    ...story.board([...cards, ...story.doneAt(now, at, finished)]),
    ...story.routinesAt(now, at, { needsMe: "dependency-bump", cards: cards.map((c) => c.task) }),
    spend: 19.4, chatSpend: 0.92,
  });
}

const skip = `${read} button[aria-label="Skip Performance read once"]`;

module.exports = {
  title: "Routines on the board",
  story: "The routines wait in Queued with their next runs; the weekly bump waits on Sebastian, and he skips the next performance read once.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: board, actions: [{ goto: BOARD }, { waitFor: bump }, { hover: `${bump} .ttl` }], hold: 3000 },
    {
      state: () => null,
      actions: [{ hover: skip }, { wait: 600 }, { click: skip }, { waitFor: `${read} button[aria-label^="Undo the skip"]` }, { wait: 1200 }, { hover: `${read} .ttl` }],
      hold: 3000,
    },
    { state: () => null, actions: [{ click: `${bump} button.open` }, { waitFor: "#drawer .top-block" }, { hover: ui.park }], hold: 3500 },
  ],
};
