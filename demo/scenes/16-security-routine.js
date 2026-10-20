const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const scan = ui.ghost("security-scan");
const BOARD = ui.board(["security-scan"]);

// Thursday night of week 1: the nightly scan at 02:00 finds path-to-regexp 0.1.7 through express 4.19.2 and files
// #108, which builds, merges and is live 50 minutes later. The story's time stands as long after that scan as now is
// after the scan's last run, so the recording shows the night at its own hour: a done card in the evening, a card on
// its way in the small hours.

// the week's cards so far are done: issue, done after, spend
const finished = [[101, 2 * HOUR, 1.12], [102, 2.9 * HOUR, 0.64], [103, 1.4 * HOUR, 0.31], [104, HOUR, 0.48], [107, 64 * MIN, 1.18]];

// night is the board now: the routines in Queued, the scan's card open until it is live
function night(now) {
  const at = story.anchoredAt(now, 108);
  const card = story.routineCard(now, 108, at);
  return state.scene(now, {
    ...story.board([card, ...story.doneAt(now, at, finished)]), ...story.routinesAt(now, at, { cards: [card.task] }),
    events: story.mergeEvents(now, 108, story.filedAge(now, 108, at), story.merges[108]), ...story.spending(at),
  });
}

module.exports = {
  title: "The security routine",
  story: "The nightly security scan finds a vulnerable dependency and files the bump card; the scan's runs and the card's " +
    "gates show it build, pass its gates and go live within the hour.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: night, actions: [{ goto: BOARD }, { hover: `${ui.face(108)} .chip.routine` }], hold: 2500 },
    {
      state: () => null,
      actions: [{ click: `${scan} button.open` }, { waitFor: ui.tab("runs") }, { click: ui.tab("runs") }, { waitFor: "#drawer .life.runs" }, { hover: "#drawer .acts" }],
      hold: 4500,
    },
    {
      state: () => null,
      // the board settles its stream's first redraw before the drawer opens, and the drawer its tab before a click
      actions: [
        { goto: BOARD }, { wait: 1000 }, { click: ui.open(108) }, { waitFor: ui.tab("activity") }, { click: ui.tab("activity") }, { wait: 1000 },
        { waitFor: "#drawer table.gates" }, { hover: ui.park },
      ],
      hold: 4500,
    },
    {
      state: () => null,
      actions: [{ click: ui.tab("overview") }, { wait: 1000 }, { waitFor: ui.objective }, { click: ui.objective }],
      hold: 4500,
    },
  ],
};
