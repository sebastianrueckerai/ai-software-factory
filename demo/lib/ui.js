const state = require("./state");
const project = require("./project");
const { cronOf: cron } = require("./story");

// The console's elements the scenes act on.
module.exports = {
  // board is the board's path with its routines filter keeping the routines named in view, the one skipped through its
  // run after next, and hiding those further out, so the Queued column holds its ghosts whole. It reads the clock when
  // a recording loads the scene.
  board: (names, skipped) => {
    const now = new Date();
    const next = (name) => state.nextCron(cron(name), name === skipped ? state.nextCron(cron(name), now) : now);
    return `/?routines=within&within=${Math.ceil(Math.max(...names.map((n) => next(n) - now)) / 3.6e6) + 1}&unit=hours`;
  },
  face: (issue) => `#board [data-card="${state.id(issue)}"]`,
  open: (issue) => `#board [data-card="${state.id(issue)}"] a.open`,
  tab: (name) => `#drawer [role="tab"][hx-get$="tab=${name}"]`,
  // row is the gates table's row with a cell that reads text: a gate, or an outcome
  row: (text) => `#drawer table.gates tr:has(td:text-is("${text}"))`,
  step: (name) => `#drawer table:not(.gates) tr:has(td:text-is("${name}"))`,
  objective: '#drawer [data-sec="objective"] > summary',
  links: '#drawer [data-sec="links"] > summary',
  doIt: "#chat-log .proposal [data-doit]",
  // choice is a Needs you card's answer button that posts label
  choice: (issue, label) => `#board article.escalation[data-card="${state.id(issue)}"] .choices button[value="${label}"]`,
  // answer is the chat's answer row button that answers the inbox's open escalation with label
  answer: (label) => `#chat-answer [data-answer="${label}"]`,
  approve: (pr) => `#board article.approval button[aria-label^="Approve merge PR #${pr} "]`,
  approval: (pr) => `#board article.approval:has(a[href$="/pulls/${pr}"])`,
  // the chat's autonomy control under Send: its button and a level of its menu
  level: "#level-btn",
  levelPick: (name) => `#level-pop [data-lvl="${name}"]`,
  // the chat's first tool call, folded to its first line
  tool: "#chat-log details.tool > summary",
  ghost: (routine) => `#board [data-ghost="${project.name}/${routine}"]`,
  // nav is the header's link to a page: /settings, /notifications, metrics
  nav: (page) => (page === "metrics" ? `nav a[href="/projects/${project.name}/metrics"]` : `nav a[href="${page}"]`),
  home: "a.home",
  // park is a spot for the cursor off every word: the body of Needs you, on a board where nothing waits
  park: "#needs-you .cards",
  // idle is the same spot in In progress, on a board where nothing runs
  idle: '#board .column[aria-labelledby="col-2"] .cards',
};
