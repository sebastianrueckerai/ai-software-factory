const ui = require("../lib/ui");

module.exports = {
  title: "The gate chain",
  story: "A change passes chat, spec, plan, build, review, merge, deploy and telemetry; each gate says what it checks, and the human " +
    "confirms the spec and approves the merge.",
  group: "diagrams",
  theme: "dark",
  viewport: "desk",
  page: "diagrams/gates.html",
  steps: ui.reveal(8),
};
