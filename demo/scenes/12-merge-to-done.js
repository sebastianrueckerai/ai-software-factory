const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const merge = story.merges[101];
const live = `${ui.step("final")}:has(code:has-text("live: covered"))`;

// monday is Monday afternoon's board a minutes after #103's filing, as scene 6 has it: the waitlist #101 merges
// out of the merge queue and goes live, the week's first deploy. The metrics page opens on its default 28 days.
function monday(now, a) {
  const t = new Date(story.filed[103].getTime() + a * MIN * 1000);
  const age = story.ageAt(101, t);
  const b = story.board([
    story.life(now, 101, age, story.lives[101]), story.life(now, 102, (57 + a) * MIN, story.lives[102]), story.life(now, 103, a * MIN, story.lives[103]),
  ]);
  return state.scene(now, { ...b, events: story.mergeEvents(now, 101, age, merge), metrics: story.report(now, t, 28), ...story.spending(t) });
}

const deploys = ui.figure("deploys / week");

module.exports = {
  title: "Merge to done",
  story: "The waitlist merges out of the merge queue, the drawer shows the merge and its chain going live, the settings show " +
    "both environments ready, and the week's deploys count one more.",
  group: "ship",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => monday(now, 14), actions: [{ goto: "/" }, { hover: ui.open(101) }], hold: 2000 },
    { state: (now) => monday(now, 17), actions: [{ hover: ui.open(101) }], hold: 2500 },
    {
      state: () => null,
      actions: [{ click: ui.open(101) }, { waitFor: ui.tab("activity") }, { click: ui.tab("activity") }, { waitFor: ui.step("merged") }, { hover: ui.step("merged") }],
      hold: 3500,
    },
    { state: () => null, actions: [{ click: ui.nav("metrics") }, { waitFor: deploys }, { hover: deploys }], hold: 2500 },
    { state: (now) => monday(now, 26), actions: [{ click: ui.home }, { waitFor: ui.face(101) }, { hover: `${ui.face(101)} .elapsed` }], hold: 2500 },
    {
      state: () => null,
      actions: [{ click: ui.open(101) }, { waitFor: ui.tab("activity") }, { click: ui.tab("activity") }, { waitFor: live }, { hover: live }],
      hold: 3500,
    },
    { state: () => null, actions: [{ click: ui.nav("/settings") }, { waitFor: "dt:text-is('Environments') + dd" }, { hover: "dt:text-is('Environments') + dd" }], hold: 3000 },
    { state: () => null, actions: [{ click: ui.nav("metrics") }, { waitFor: deploys }, { hover: deploys }], hold: 3000 },
  ],
};
