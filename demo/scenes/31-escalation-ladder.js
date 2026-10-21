const ui = require("../lib/ui");

module.exports = {
  title: "The escalation ladder",
  story: "A failure climbs from the agent's self-correction through the stronger model, the check-in and a fresh session to the human, " +
    "who gets a prepared question.",
  group: "diagrams",
  theme: "dark",
  viewport: "desk",
  page: "diagrams/ladder.html",
  steps: ui.reveal(5),
};
