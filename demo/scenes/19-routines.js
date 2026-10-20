const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const HOUR = 3600;
const bump = ui.ghost("dependency-bump");
const read = ui.ghost("performance-read");
const AT = story.date(2, "fri", "07:30");

// the week's cards are done: issue, done after, spend
const finished = [
  [115, 3 * HOUR, 0.38], [116, 1.5 * HOUR, 1.04], [117, 9.5 * HOUR, 0.45], [118, 77 * 60, 0.36], [119, 34 * 60, 0.29], [120, 9.8 * HOUR, 0.86],
  [121, 9.3 * HOUR, 0.46],
];

// friday is Friday morning of week 2: the performance read's #123 builds, and Sebastian has set the weekly bump to
// wait on him, so its next run files a human card
function friday(now) {
  const card = story.life(now, 123, story.ageAt(123, AT), story.lives[123]);
  return state.scene(now, {
    ...story.board([card, ...story.doneAt(now, AT, finished)]),
    ...story.routinesAt(now, AT, { needsMe: "dependency-bump", open: { "performance-read": card.task } }),
    spend: 19.4, chatSpend: 0.92,
  });
}

const skip = `${read} button[aria-label="Skip Performance read once"]`;

module.exports = {
  title: "Routines on the board",
  story: "The four routines wait in Queued with their next runs; the weekly bump waits on Sebastian, and he skips the next performance read once while #123 is on it.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: friday, actions: [{ goto: "/" }, { waitFor: bump }, { hover: `${bump} .ttl` }], hold: 3000 },
    {
      state: () => null,
      actions: [{ hover: skip }, { wait: 600 }, { click: skip }, { waitFor: `${read} button[aria-label^="Undo the skip"]` }, { wait: 1200 }, { hover: `${read} .ttl` }],
      hold: 3000,
    },
    { state: () => null, actions: [{ click: `${bump} button.open` }, { waitFor: "#drawer .top-block" }, { hover: "#drawer .top-block" }], hold: 3500 },
  ],
};
