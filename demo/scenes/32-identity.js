const ui = require("../lib/ui");

module.exports = {
  title: "Identity belongs to the task",
  story: "Card #101 gets its namespace, a read token on the repository, a write token on the bot's fork, its model key and its sandbox " +
    "pod; they clone, push and call the model; then the pod and the namespace are deleted, the tokens revoked, and the field is empty.",
  group: "diagrams",
  theme: "dark",
  viewport: "desk",
  page: "diagrams/identity.html",
  steps: ui.reveal(7),
};
