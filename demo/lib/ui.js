const state = require("./state");

// The console's elements the scenes act on.
module.exports = {
  face: (issue) => `#board [data-card="${state.id(issue)}"]`,
  open: (issue) => `#board [data-card="${state.id(issue)}"] a.open`,
  tab: (name) => `#drawer [role="tab"][hx-get$="tab=${name}"]`,
  gate: (name) => `#drawer table.gates tr:has(td:text-is("${name}"))`,
  step: (name) => `#drawer table:not(.gates) tr:has(td:text-is("${name}"))`,
  doIt: "#chat-log .proposal [data-doit]",
};
