const ui = require("../lib/ui");

module.exports = {
  title: "The five-plane loop",
  story: "Signals feed the control plane, which spawns agent workers in sandboxes; their output passes verification before merge and " +
    "deploy, and telemetry feeds back into signals.",
  group: "diagrams",
  theme: "dark",
  viewport: "desk",
  page: "diagrams/loop.html",
  steps: ui.reveal(6),
};
