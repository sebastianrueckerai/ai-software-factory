const state = require("./state");
const project = require("./project");

// The console's elements the scenes act on.
module.exports = {
  face: (issue) => `#board [data-card="${state.id(issue)}"]`,
  open: (issue) => `#board [data-card="${state.id(issue)}"] a.open`,
  tab: (name) => `#drawer [role="tab"][hx-get$="tab=${name}"]`,
  // row is the gates table's row with a cell that reads text: a gate, or an outcome
  row: (text) => `#drawer table.gates tr:has(td:text-is("${text}"))`,
  step: (name) => `#drawer table:not(.gates) tr:has(td:text-is("${name}"))`,
  objective: '#drawer [data-sec="objective"] > summary',
  doIt: "#chat-log .proposal [data-doit]",
  // the chat's first tool call, folded to its first line
  tool: "#chat-log details.tool > summary",
  ghost: (routine) => `#board [data-ghost="${project.name}/${routine}"]`,
  // nav is the header's link to a page: /settings, /notifications, metrics
  nav: (page) => (page === "metrics" ? `nav a[href="/projects/${project.name}/metrics"]` : `nav a[href="${page}"]`),
  home: "a.home",
};
