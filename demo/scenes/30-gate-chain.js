const ui = require("../lib/ui");

module.exports = {
  title: "The gate chain",
  story: "A change passes chat, spec, plan, build, review, merge, deploy and telemetry; each gate says what it checks, the human " +
    "confirms the spec, and the project's merge rule decides who merges.",
  group: "diagrams",
  theme: "dark",
  viewport: "desk",
  page: "diagrams/gates.html",
  steps: ui.reveal(8),
};
