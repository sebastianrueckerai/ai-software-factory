const state = require("../lib/state");
const story = require("../lib/story");
const ui = require("../lib/ui");

const MIN = 60;
const HOUR = 3600;
const INBOX = 2;
const after = (issue, s) => new Date(story.filed[issue].getTime() + s * 1000);

// Wednesday afternoon of week 1 the receipt fix #107 merged and went live, and in the night the scan filed #108,
// which merged and went live before 03:00. The story's time stands as long after that scan as now is after the scan's
// last run, so the scan reads at its 02:00 whatever the recording's hour; a row after now is not written yet. Every
// row of the inbox informs; none asks.
function inbox(now, ago) {
  const merged = (issue) => after(issue, story.merges[issue].at);
  const live = (issue) => after(issue, story.merges[issue].live);
  return [
    state.mergedPoke(now, { issue: 107, age: ago(merged(107)), conversation: INBOX }),
    state.livePoke(now, { issue: 107, title: story.cards[107].title, spent: 1.18, age: ago(live(107)), conversation: INBOX }),
    story.scanned(now, { run: 55, age: ago(story.filed[108]), conversation: INBOX }),
    state.mergedPoke(now, { issue: 108, age: ago(merged(108)), conversation: INBOX }),
    state.livePoke(now, { issue: 108, title: story.cards[108].title, spent: 0.29, age: ago(live(108)), conversation: INBOX }),
  ].filter((m) => new Date(m.at) <= now);
}

// the week's cards are done: issue, done after, spend
const finished = [[101, 2 * HOUR, 1.12], [102, 2.9 * HOUR, 0.64], [103, 1.4 * HOUR, 0.31], [104, HOUR, 0.48], [107, 64 * MIN, 1.18]];

// morning is the board with Wednesday's thread, the report's filing, and the inbox open; read marks the inbox read
function morning(now, read) {
  const t = story.anchoredAt(now, 108);
  const ago = (d) => (t - d) / 1000;
  const report = state.filedThread(now, {
    said: story.requests.report, reply: story.replies.report, args: story.filing(107, "direct", "a small, clear fix"), issue: 107, age: ago(story.filed[107]) + 8,
  });
  const rows = inbox(now, ago);
  const chat = [...report.rows, ...rows];
  const seen = state.seen(chat);
  if (!read) delete seen[INBOX];
  return state.scene(now, {
    ...story.board([story.routineCard(now, 108, t), ...story.doneAt(now, t, finished)]), chat, seen, inbox: INBOX, open: INBOX, usedProposals: [report.proposal],
    ...story.spending(t),
  });
}

const scanRow = '#chat-log .msg.poke:has-text("Filed #108")';

module.exports = {
  title: "The settled inbox",
  story: "The inbox holds what happened since Sebastian last looked: merges gone live and the night scan's filing; read, each folds " +
    "to one settled line, nothing waits on Sebastian, and only an ask would have reached his phone.",
  group: "operate",
  theme: "dark",
  viewport: "desk",
  steps: [
    { state: (now) => morning(now, false), actions: [{ goto: "/" }, { waitFor: scanRow }, { hover: `${scanRow} .av` }], hold: 3500 },
    { state: (now) => morning(now, true), actions: [{ goto: "/" }, { waitFor: "#chat-log .msg.poke.settled" }, { hover: ".thead" }], hold: 3000 },
    { state: () => null, actions: [{ click: `${scanRow} [data-fold]` }, { hover: `${scanRow} .av` }], hold: 3000 },
    { state: () => null, actions: [{ click: ui.nav("/notifications") }, { waitFor: "#levels" }, { hover: "section[aria-labelledby='levels'] tbody tr" }], hold: 3500 },
  ],
};
