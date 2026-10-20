const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;

// Monday afternoon from #103's filing on the form: #101 waits in the merge queue and merges, #102 builds a second time
// after a failed test. Each card's age counts from its own creation.
const pr = story.cards[103].pr;

// monday is the board a minutes after #103's filing
function monday(now, a) {
  const b = story.board([story.life(now, 101, (96 + a) * MIN, story.lives[101]), story.life(now, 102, (57 + a) * MIN, story.lives[102]), story.life(now, 103, a * MIN, story.lives[103])]);
  return state.scene(now, { ...b, prFiles: { [pr]: story.files[pr] }, spend: 0.31 + b.tasks.reduce((sum, t) => sum + (t.SpentEUR ?? 0), 0), chatSpend: 0.18 });
}

module.exports = {
  title: "Card to pull request",
  story: "A card filed by hand starts: it waits in the queue, builds with the drawer on the agent's words, opens its pull request, " +
    "passes the checks and the review, and is done.",
  group: "build",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => monday(now, 1), actions: [{ goto: "/" }, { hover: ui.face(103) }], hold: 2000 },
    {
      state: (now) => monday(now, 12),
      actions: [{ click: ui.open(103) }, { waitFor: ui.tab("chat") }, { click: ui.tab("chat") }, { waitFor: "#session-log .msg" }],
      hold: 3500,
    },
    { state: (now) => monday(now, 26), actions: [{ click: ui.tab("files") }, { waitFor: "#drawer table.files" }], hold: 3000 },
    { state: (now) => monday(now, 40), actions: [{ click: ui.tab("activity") }, { waitFor: "#drawer table.gates" }], hold: 3500 },
    {
      state: (now) => monday(now, 52),
      actions: [{ click: ui.tab("activity") }, { waitFor: ui.row("merge-queue") }, { hover: `${ui.row("merge-queue")} meter` }],
      hold: 3500,
    },
    { state: (now) => monday(now, 84), actions: [{ click: "#drawer-close" }, { hover: ui.face(103) }], hold: 2500 },
  ],
};
