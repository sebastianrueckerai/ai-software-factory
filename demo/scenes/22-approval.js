const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const INBOX = 2;
const a = story.approvals.refund;
const steer = story.steers.refund;
const m = story.merges[a.task];
const OPENED = 38.5 * MIN;

// the week's earlier cards are done: issue, done after, spend; the weekly bump's #115 is on its run's clock
const finished = [[116, 1.5 * HOUR, 1.04], [117, 9.5 * HOUR, 0.45], [120, 9.8 * HOUR, 0.86], [121, 9 * HOUR + 20 * MIN, 0.46]];

// thursday is the board s seconds after #122's filing: its approval waits in Needs you until Sebastian approves at the
// merge queue's start, then it merges and goes live. Its events carry scene 11's steer; the inbox carries the request.
function thursday(now, s) {
  const t = new Date(story.filed[a.task].getTime() + s * 1000);
  const b = story.board([story.life(now, a.task, s, story.lives[a.task]), story.routineCard(now, 115, t), ...story.doneAt(now, t, finished)]);
  const approved = s >= m.queued;
  const events = [
    state.event(now, { issue: a.task, kind: "card_steered", actor: "sebastian", via: "chat", age: s - steer.at, detail: { text: steer.text } }),
    state.event(now, { issue: a.task, kind: "approval_requested", age: s - OPENED, detail: { approval: a.id, kind: "merge", pr: a.pr, class: a.risk } }),
    ...(approved ? [state.event(now, { issue: a.task, kind: "merge_approved", actor: "sebastian", via: "button", age: s - m.queued, detail: { pr: a.pr } })] : []),
    ...story.mergeEvents(now, a.task, s, m),
  ];
  const ago = (k) => s - k;
  // the poke comes two seconds after the request it tells of, which settles any ask row at or after it as superseded
  const chat = [
    state.mergeAsked(now, { issue: a.task, pr: a.pr, risk: a.risk, age: ago(OPENED + 2), conversation: INBOX }),
    ...(s >= m.at ? [state.mergedPoke(now, { issue: a.task, age: ago(m.at), conversation: INBOX })] : []),
    ...(s >= m.live ? [state.livePoke(now, { issue: a.task, title: story.cards[a.task].title, spent: 0.61, age: ago(m.live), conversation: INBOX })] : []),
  ];
  return state.scene(now, {
    ...b, events, chat, seen: { [INBOX]: approved ? chat.length : 0 }, inbox: INBOX, open: INBOX, prFiles: { [a.pr]: story.files[a.pr] },
    approvals: approved ? undefined : [state.approval(now, { ...a, spec: story.mergeSpec(a), age: s - OPENED })],
    spend: 16.9, chatSpend: 0.86,
  });
}

const details = `${ui.approval(a.pr)} a.details`;

module.exports = {
  title: "An approval",
  story: "The refund card touches payments, so its pull request waits for Sebastian at the merge gate. He reads the summary, the " +
    "review and the changed files in the drawer, approves, and the card merges and goes live.",
  group: "gates",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => thursday(now, m.queued - 30), actions: [{ goto: "/" }, { hover: ui.idle }], hold: 3500 },
    { state: () => null, actions: [{ click: details }, { waitFor: '#drawer [data-sec="reviews"][open]' }, { hover: ui.tab("files") }], hold: 4500 },
    { state: () => null, actions: [{ click: ui.tab("files") }, { waitFor: "#drawer table.files" }, { hover: "#drawer table.files caption" }], hold: 3500 },
    { state: () => null, actions: [{ hover: ui.approve(a.pr) }, { wait: 800 }, { click: ui.approve(a.pr) }, { wait: 1500 }], hold: 1500 },
    { state: (now) => thursday(now, m.at + 30), actions: [{ goto: "/" }, { hover: ui.park }], hold: 3000 },
    {
      state: (now) => thursday(now, m.live + 60),
      actions: [
        { goto: "/" }, { click: ui.open(a.task) }, { waitFor: ui.tab("activity") }, { click: ui.tab("activity") }, { waitFor: ui.row("merge") },
        { hover: `${ui.row("merge")} meter` },
      ],
      hold: 4000,
    },
  ],
};
