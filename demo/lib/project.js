const environments = [
  { namespace: "nebula-run-staging", path: "deploy/staging", hostname: "staging.nebula-run.example" },
  { namespace: "nebula-run-prod", path: "deploy/prod", hostname: "nebula-run.example" },
];
const namespaces = environments.map((e) => e.namespace);

const tracks = {
  direct: { class: "coder" },
  plan: { class: "planner", plan: { min_cards: 0, max_cards: 12, foundation: true, integration: true } },
};

const cron = (expr) => [{ cron: expr }];

module.exports = {
  name: "nebula-run",
  repository: "orbit/nebula-run",
  login: "sebastian",
  display: "Nebula Run",
  rows: [{
    Name: "nebula-run", Repository: "orbit/nebula-run", MergeRule: "human", Objects: "factory", Agents: "coder",
    GitToken: "minted",
    Namespaces: namespaces, Environments: environments, Process: "spec", Tracks: tracks, File: true,
  }],
  config: {
    // a busy studio's board holds more than the default eight cards no agent has started yet
    queue_cap: 16,
    repository: "orbit/nebula-run", merge_rule: "human", objects: "factory", agents: "coder", process: "spec",
    namespaces, environments,
    // policy.DefaultChat's confirm list: the lab's own chat block confirms nothing, so the chat's writes would run unasked
    chat: {
      confirm: ["new_card", "answer", "tell_card", "steer", "retry", "request_changes",
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
