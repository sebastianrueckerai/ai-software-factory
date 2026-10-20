const state = require("../lib/state");
const story = require("../lib/story");

// sunday is Sunday evening of week 2, the costs page's fourteen days the two weeks: every card that spent, as it
// ended, on the class it ran on. #110, closed at its budget, keeps its life for its timeline.
function sunday(now) {
  const at = story.weekEnd(2);
  const cards = Object.entries(story.ledger).filter(([issue]) => issue >= 101 && issue !== "110").map(([issue, c]) => {
    const age = story.ageAt(issue, at);
    return story.card(now, Number(issue), {
      status: "done", lane: issue === "105" ? "plan" : "ready", age, finished: age - c.end, spent: c.spent, model: c.model ?? "small",
      pr: story.cards[issue].pr,
    });
  });
  const capped = story.life(now, 110, story.ageAt(110, at), story.lives[110]);
  return state.scene(now, { tasks: [capped.task, ...cards], objects: capped.objects, ...story.spending(at) });
}

const days = ".page table:first-of-type";
const tasks = ".page table:last-of-type";
// the costliest day is the lab's sixth row, the one its fixed weights load most
const costliest = `${days} tbody tr:nth-child(6)`;
const first = `${tasks} tbody tr:first-child`;

module.exports = {
  title: "The costs page",
  story: "The costs page over the two weeks: each day by kind, model, tool and resource, then each card and its lines; " +
    "the costliest card is the calendar's week view that stopped at its budget.",
  group: "metrics",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: sunday, actions: [{ goto: "/costs" }, { hover: `${days} caption` }], hold: 2500 },
    { state: () => null, actions: [{ hover: costliest }], hold: 2500 },
    { state: () => null, actions: [{ scroll: tasks }, { hover: first }], hold: 3000 },
    { state: () => null, actions: [{ click: `${first} a` }, { waitFor: "table.gates" }, { hover: ".page article.card" }], hold: 3500 },
  ],
};
