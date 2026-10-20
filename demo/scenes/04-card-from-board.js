const state = require("../lib/state");
const story = require("../lib/story");

const c = story.cards[103];
const MIN = 60;

// the New task form reads the repository's labels from Forgejo
const labels = JSON.stringify([
  { id: 1, name: "agent" }, { id: 2, name: "human" }, { id: 3, name: "backlog" }, { id: 4, name: "plan" },
]);

// Monday afternoon: the waitlist card waits in the merge queue, the schedule card builds
function monday(now, filed) {
  const waitlist = story.card(now, 101, {
    status: "in-review", lane: "ready", age: 95 * MIN, gate: "merge-queue", gateSince: 3 * MIN, model: "small", spent: 0.71, pr: story.cards[101].pr,
  });
  const schedule = story.card(now, 102, { status: "running", lane: "ready", age: 57 * MIN, gate: "session", gateSince: 18 * MIN, model: "small", spent: 0.22 });
  const tasks = [waitlist, schedule];
  if (filed) tasks.push(story.card(now, 103, { status: "queued", lane: "ready", age: 4 }));
  return state.scene(now, {
    tasks,
    objects: {
      [`sessions/${waitlist.ID}/timeline.jsonl`]: state.timeline(now, 90 * MIN, {
        alias: "small", steps: [{ at: 84 * MIN, step: "model_review", verdict: "approve", round: 1 }],
      }),
      [`sessions/${schedule.ID}/timeline.jsonl`]: state.timeline(now, 19 * MIN, {
        steps: [
          { at: 0, step: "intake", started: new Date(now - 19 * MIN * 1000).toISOString().slice(0, 19) + "Z", source: "webhook" },
          { at: MIN, step: "session_start", session: "s-1", model: "small", attempt: 1 },
        ],
      }),
    },
    prFiles: { "/api/v1/repos/nord/booking/labels": labels },
    spend: 1.24, chatSpend: 0.18,
  });
}

const body = `${c.body}\n\nAcceptance:\n${c.acceptance.map((a) => "- " + a).join("\n")}`;

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
        { click: "#body" }, { type: ["#body", body] },
        { hover: "#lane" }, { type: ["#lane", "Ready"] },
        { hover: "#size" }, { type: ["#size", c.size] },
        { hover: 'form.newtask button[type="submit"]' },
      ],
      hold: 1200,
    },
    // the form's File answers the board with its note; the lab's Forgejo files no issue, so the step lands there itself
    { state: () => null, actions: [{ goto: "/?project=nord-booking&filed=103" }], hold: 1500 },
    { state: (now) => monday(now, true), actions: [{ hover: `#board [data-card="${state.id(103)}"]` }], hold: 2500 },
  ],
};
