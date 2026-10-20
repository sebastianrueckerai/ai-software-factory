const environments = [
  { namespace: "nord-staging", path: "deploy/staging", hostname: "staging.nord-booking.example" },
  { namespace: "nord-prod", path: "deploy/prod", hostname: "nord-booking.example" },
];
const namespaces = environments.map((e) => e.namespace);

const lanes = [
  { name: "ready", class: "coder", moved_by: "writers" },
  { name: "backlog" },
  { name: "plan", class: "planner", moved_by: "writers", plan: { min_cards: 0, max_cards: 12, foundation: true, integration: true } },
];

const cron = (expr) => [{ cron: expr }];

module.exports = {
  name: "nord-booking",
  repository: "nord/booking",
  login: "sebastian",
  display: "Studio Nord",
  rows: [{
    Name: "nord-booking", Repository: "nord/booking", MergeRule: "human", Objects: "factory", Agents: "coder",
    GitToken: "minted",
    Namespaces: namespaces, Environments: environments, Process: "spec", Lanes: lanes, File: true,
  }],
  config: {
    repository: "nord/booking", merge_rule: "human", objects: "factory", agents: "coder", process: "spec",
    namespaces, environments,
    // policy.DefaultChat's confirm list: the lab's own chat block confirms nothing, so the chat's writes would run unasked
    chat: {
      confirm: ["new_card", "move_card", "answer", "tell_card", "steer", "start_plan", "retry", "accept_plan", "request_changes", "reject_plan",
        "approve_merge", "deny_merge", "invite", "github_export", "github_sync", "close", "edit", "grant_session", "set_dependency", "split_card",
        "alert_verdict", "promote_resource", "release_resource", "write_doc", "set_autonomy", "routine_write", "routine_delete", "routine_run", "routine_skip"],
    },
  },
  monthCap: 60,
  routines: [
    { name: "dependency-bump", title: "Dependency bump", schedule: cron("0 6 * * 1"), files: "agent", skill: "dependency-update", tell: "quiet" },
    { name: "security-scan", title: "Security scan", schedule: cron("0 2 * * *"), files: "agent", skill: "audit", tell: "inbox" },
    { name: "performance-read", title: "Performance read", schedule: cron("0 7 * * 5"), files: "agent", skill: "audit", tell: "quiet" },
    { name: "cost-review", title: "Cost review", schedule: cron("0 8 1 * *"), files: "human", tell: "inbox" },
  ],
};
