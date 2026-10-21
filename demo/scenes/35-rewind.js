const state = require("../lib/state");
const story = require("../lib/story");
const { busy } = require("./34-busy-board");
const monday = require("./03-too-large-split").steps[0].state;

// The film's rewind from Friday afternoon to Monday morning: the busy board of scene 34, the split's two cards on it,
// drains newest first, column by column, until it is the board of scene 03's first step, where Monday's request
// fills it again. The chat starts a new thread at once. A drop takes the cards out with everything that names them.
function without(now, drop) {
  const s = busy(now);
  // the split's two cards as the lab filed them in scene 34, under the next free numbers
  const split = [story.card(now, 113, { issue: 126, status: "queued", lane: "ready", age: 40 }), story.card(now, 114, { issue: 127, status: "backlog", lane: "backlog", age: 39 })];
  s.Tasks = [...s.Tasks, ...split];
  for (const t of split) s.Objects[`sessions/${t.ID}/timeline.jsonl`] = "";
  const gone = new Set(s.Tasks.filter((t) => drop.includes(t.IssueNumber)).map((t) => t.ID));
  const keeps = (x) => ![...gone].some((id) => JSON.stringify(x).includes(id));
  s.Tasks = s.Tasks.filter((t) => !gone.has(t.ID));
  s.Deps = Object.fromEntries(Object.entries(s.Deps || {}).filter(([id, on]) => !gone.has(id) && on.every((d) => !gone.has(d))));
  s.Approvals = (s.Approvals || []).filter(keeps);
  s.Alerts = (s.Alerts || []).filter(keeps);
  s.Events = (s.Events || []).filter(keeps);
  s.Objects = Object.fromEntries(Object.entries(s.Objects || {}).filter(([k]) => ![...gone].some((id) => k.includes(id))));
  for (const k of ["Chat", "Seen", "Inbox", "Open", "Replies", "UsedProposals"]) delete s[k];
  return s;
}

const waves = [
  [],
  [126, 127, 125, 118, 123],
  [126, 127, 125, 118, 123, 102, 103, 107, 121],
  [126, 127, 125, 118, 123, 102, 103, 107, 121, 120, 110, 122, 112],
  [126, 127, 125, 118, 123, 102, 103, 107, 121, 120, 110, 122, 112, 109, 111, 115, 108, 105],
];

module.exports = {
  title: "The rewind to Monday",
  story: "The busy Friday board drains newest first: the queued cards, then the running ones, then the cards that wait on " +
    "Sebastian, then the week's done cards, until it is Monday morning's board with four done cards and nothing open.",
  group: "intake",
  theme: "dark",
  viewport: "desk",
  boxes: { board: "#board", queued: '#board .column[aria-labelledby="col-1"]' },
  steps: [
    ...waves.map((drop, i) => ({ state: (now) => without(now, drop), actions: i ? [] : [{ goto: "/" }], hold: 1300 })),
    { state: monday, actions: [], hold: 2000 },
  ],
};
