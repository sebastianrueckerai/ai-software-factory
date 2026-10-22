const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");
const project = require("../lib/project");

const MIN = 60;
const HOUR = 3600;
const DAY = 24 * HOUR;
const INBOX = 1;
const ISSUE = 141;
const BOARD = "/?routines=all";
const brief = "Bump every pinned base image of the game server and the build to the newest release of its line, in one pull request.";
// the routine's weekly slot is the last quarter hour at least 10 minutes before the recording, so its run, the run's card
// and the dashed card's next run all read right on the lab's clock, which is the real one, and the card stays under the
// board's 30 minutes without an event
const due = new Date(Math.floor((Date.now() - 10 * MIN * 1000) / (15 * MIN * 1000)) * 15 * MIN * 1000);
const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][due.getUTCDay()];
const cron = `${due.getUTCMinutes()} ${due.getUTCHours()} * * ${due.getUTCDay()}`;
const routine = { name: "image-bump", title: "Weekly image bump", schedule: [{ cron }], files: "agent", brief: `routines/${project.name}.image-bump.md`, skill: "dependency-update" };
const args = { name: routine.name, title: routine.title, schedule: routine.schedule, files: routine.files, skill: routine.skill, brief_text: brief };
const LINE = `Bump our base images every ${day}.`;
const REPLY = `A routine that files an agent card every ${day} at ${due.toISOString().slice(11, 16)}:`;
const file = `projects/${project.name}.yaml`;
// the proposal as describeRoutine words it: the routine's YAML entry and its brief
const description = `Write a routine, new in ${file}:\n\n- name: image-bump\n  title: Weekly image bump\n  schedule:\n    - cron: ${cron}\n  files: agent\n` +
  `  brief: routines/${project.name}.image-bump.md\n  skill: dependency-update\n\nIts brief, routines/${project.name}.image-bump.md:\n\n${brief}`;
const writing = state.reply(state.say(REPLY), state.call("routine_write", args));

const finished = [[116, 49, 1.5, 1.04], [117, 30.75, 9.5, 0.45], [120, 30.8, 9.8, 0.86], [121, 30.7, 9 + 1 / 3, 0.46]];

// board is the studio's board with the routine once added, its newest run and the card the run filed
function board(now, o = {}) {
  const b = story.board(finished.map(([issue, age, after, spent]) => story.done(now, issue, age * HOUR, after * HOUR, spent)));
  const runs = o.run ? [o.run] : [];
  const routines = o.added ? [state.routineView(now, routine, { runs, open: o.open })] : [];
  return state.scene(now, {
    tasks: [...b.tasks, ...(o.tasks ?? [])], objects: b.objects, chat: o.chat ?? [], seen: { [INBOX]: (o.chat ?? []).length }, inbox: INBOX, open: INBOX,
    replies: o.replies, usedProposals: o.used, routines, routinesAt: new Date(now.getTime() + 1000), ...story.spending(story.at(122, 30 * MIN)),
  });
}

// added is the board after the press, a week before the run: the chat's thread with the press half an hour after last
// week's slot, the routine waiting in Queued with no run yet.
// The lab's Forgejo fake holds no project file to commit to, so the press is the seed's: the rows a press leaves.
function added(now, o = {}) {
  const t = state.pressedThread(now, [state.proposal(now, { tool: "routine_write", args, description })], {
    line: LINE, reply: REPLY, age: (Date.now() - due) / 1000 + 7 * DAY - 30 * MIN,
    results: [`Pull request #44 added routine image-bump to ${file} and wrote its brief routines/${project.name}.image-bump.md. The board shows it once the factory loads the new configuration.`],
  });
  return board(now, { ...o, added: true, chat: t.rows.map((r) => ({ ...r, conversation: INBOX })), used: t.proposals });
}

// the first run: it came due, filed #141 a minute later, and the card builds; then the card is done and the routine waits
// for next week
function running(now) {
  const card = story.card(now, ISSUE, { status: "running", lane: "ready", source: "routine", age: (now - due) / 1000 - MIN, gate: "session", gateSince: 5 * MIN, spent: 0.12, model: "small" });
  const run = state.routineRun(routine.name, { run: 1, due, outcome: "filed", issue: ISSUE });
  return added(now, { tasks: [card], run, open: { ID: card.ID, IssueNumber: ISSUE, Status: "running" } });
}
function done(now) {
  const card = story.card(now, ISSUE, { status: "done", lane: "ready", source: "routine", age: (now - due) / 1000 - MIN, finished: 1, spent: 0.31, model: "small", pr: 231 });
  const run = state.routineRun(routine.name, { run: 1, due, ended: new Date(now - 1000), outcome: "done", issue: ISSUE, cost: 0.31, note: "4 base images behind the newest release of their line" });
  return added(now, { tasks: [card], run });
}

const ghost = ui.ghost("image-bump");

module.exports = {
  title: "A routine from one sentence",
  story: "Sebastian asks the chat in one short sentence for a weekly bump of the game's base images. The project agent proposes the " +
    "routine, he presses Do it, and it waits in Queued as a dashed card with its next run. On its day it comes due and files a card, the " +
    "card builds and ends done, and the routine waits for the next week.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  boxes: { chat: ".chat", queued: '#board .column[aria-labelledby="col-1"]', done: '#board .column[aria-labelledby="col-3"]' },
  steps: [
    { state: (now) => board(now, { replies: [writing] }), actions: [{ goto: BOARD }, { hover: ui.idle }], hold: 2000 },
    {
      state: () => null,
      actions: [{ click: "#chat-input" }, { type: ["#chat-input", LINE] }, { wait: 1500 }, { press: "Enter" }, { waitFor: ui.doIt }, { wait: 3500 }, { hover: ui.doIt }],
      hold: 1500,
      boxes: { proposal: "#chat-log .proposal >> nth=-1" },
    },
    { state: added, actions: [{ goto: BOARD }, { waitFor: ghost }, { hover: `${ghost} .ttl` }], hold: 4500, boxes: { ghost } },
    { state: running, actions: [{ goto: BOARD }, { waitFor: ui.face(ISSUE) }, { hover: ui.face(ISSUE) }], hold: 4500, boxes: { ghost, card: ui.face(ISSUE) } },
    { state: done, actions: [{ goto: BOARD }, { waitFor: ui.face(ISSUE) }, { hover: `${ghost} .ttl` }], hold: 5000, boxes: { ghost, card: ui.face(ISSUE) } },
  ],
};
