const state = require("../lib/state");
const story = require("../lib/story");

const AT = story.weekEnd(2);

// sunday is Sunday evening of week 2, the costs page's fourteen days the two weeks: every card that spent, as it
// ended, on the class it ran on, and the ledger they and the chat wrote. #110, closed at its budget, keeps its life for
// its timeline.
function sunday(now) {
  const cards = Object.entries(story.ledger).filter(([issue]) => issue >= 101 && issue !== "110").map(([issue, c]) => {
    const age = story.ageAt(issue, AT);
    return story.card(now, Number(issue), {
      status: "done", lane: issue === "105" ? "plan" : "ready", age, finished: age - c.end, spent: c.spent, model: c.model ?? "small",
      pr: story.cards[issue].pr,
    });
  });
  const capped = story.life(now, 110, story.ageAt(110, AT), story.lives[110]);
  return state.scene(now, { tasks: [capped.task, ...cards], objects: capped.objects, costs: story.costs(now, AT), ...story.spending(AT) });
}

const days = ".page table:first-of-type";
const tasks = ".page table:last-of-type";
// the costliest day by its date, which reads the clock when a recording loads the scene, and the costliest card, #110
const costliest = `${days} tbody tr:has(th:text-is("${story.costs(new Date(), AT).days.reduce((a, d) => (d.total > a.total ? d : a)).day}"))`;
const capped = `${tasks} tbody tr:has(a[href="/tasks/${state.id(110)}/timeline"])`;

module.exports = {
  title: "The costs page",
  story: "The costs page over the two weeks: each day by kind, model and tool, then each card and its lines. " +
    "The costliest card is level 4's map, which stopped at its budget.",
  group: "metrics",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: sunday, actions: [{ goto: "/costs" }, { hover: `${days} caption` }], hold: 2500 },
    { state: () => null, actions: [{ hover: costliest }], hold: 2500 },
    { state: () => null, actions: [{ scroll: tasks }, { hover: capped }], hold: 3000 },
    { state: () => null, actions: [{ click: `${capped} a` }, { waitFor: "table.gates" }, { hover: ".page article.card" }], hold: 3500 },
  ],
};
