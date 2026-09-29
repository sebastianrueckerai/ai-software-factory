---
name: Centaur
slug: centaur
url: https://centaur.run
repo: https://github.com/paradigmxyz/centaur
category: kubernetes-agents
license: "mixed: repo LICENSE states Apache-2.0 OR MIT, GitHub API reports license.key \"other\" and spdx_id \"NOASSERTION\", centaur.run states MIT only"
open_source: yes
self_hostable: yes
hosting_model: "self-hosted only, Helm chart on any Kubernetes, k3s or kind sufficient for a single small host"
company: "Paradigm and Tempo, San Francisco investment and engineering firms, repo created 2026-05-18, open-sourced 2026-05-21"
maturity: "1338 stars, 253 forks, 59 contributors, 113 open issues, last commit 2026-09-28, commits most days, internal production use claimed since January 2026"
similarity: 3
axes:
  signals_intake: 2
  control_plane: 3
  sandbox_isolation: 3
  verification: 1
  policy_outside_model: 4
  identity_per_task: 4
  cost_control: 0
  ux: 4
  reseedable_selfhost: 3
steal:
  - "The Kubernetes Agent Sandbox CRD (agents.x-k8s.io/v1alpha1) with pause (spec.replicas=0) and resume (spec.replicas=1) against a retained state PVC, from services/api-rs/rfcs/0001-sandbox-abstraction.md, a cheaper lifecycle than destroy-and-recreate for a task that idles and resumes."
  - "The per-turn requester-credential union in services/api-rs/rfcs/0005-per-turn-requester-credentials.md: bind the human who actually triggered a turn, verified by signature, as an extra credential principal for that turn only, so a shared bot in a channel still opens a PR as the requesting person."
  - "Typed secret declarations colocated in each tool's own pyproject.toml (http, oauth_token, gcp_auth, pg_dsn types), keeping the capability a tool needs next to the tool's own code rather than only centralised in policy."
  - "Workflow queue isolation classes (agent, webhook, etl, maintenance, from services/api-rs/rfcs/0003-python-workflow-host.md) so a long ETL-style workflow cannot starve a chat-facing turn sharing the same worker pool."
  - "A warm pool of pre-spawned sandbox containers to remove cold-start latency, referenced in the launch post and as WARM_POOL_ENABLED in docs/pages/reference/configuration.mdx."
  - "Streaming an agent's turn into the same chat thread a human is already watching, with a reply as the intervention, instead of a task board a human has to remember to check."
differs:
  - "No spend governance anywhere in the platform. Only time and lifetime limits exist (SESSION_IDLE_TIMEOUT_MS, SESSION_MAX_DURATION_MS, apiRs.sandboxMaxLifetimeSecs default 259200 seconds). Copying this control plane as-is means giving up hard-cap budgets, holds and a cost ledger entirely."
  - "Egress defaults open (domains: [\"*\"] in services/iron-proxy/iron-proxy.yaml), tightened per deployment, against a default-deny-from-second-one constraint."
  - "No verification or merge plane. An agent's own say-so plus ordinary human PR review is the only gate before anything merges. There is no built-in test gate, risk classification or stronger-model review."
  - "Sandbox isolation documented as a plain Kubernetes restricted security context and NetworkPolicy, not a named syscall-level sandbox runtime. Not verified whether production adds one."
  - "Five languages and runtimes glued together (Rust, Python, Ruby on Rails, TypeScript, plus a Vocs docs site) against one Go module and two binaries, trading a single on-call skill set for each ecosystem's strongest tool."
ux_verdict: "Zero to a verified result is five commands with no UI step (docs/pages/quickstart.mdx), and day-to-day intervention is a chat reply in the thread the agent already streams into, better than a console for watching and steering, but Console itself (services/console) is only a permissions and workflow-run admin panel with no task board, diff view or cost view."
slop_verdict: "Real and used in anger: 59 contributors, commits most days including five within a few hours the day before this report, named internal workflows (github_issue_triage, trivy_vulnerability_intake), third-party forks by other companies, and a documented four months of internal production use before release, against two open gaps: no cost governance at all, and an unresolved licence inconsistency between the repo, GitHub's API and the product site."
---

# Centaur

## 1. What it is

Centaur is Paradigm and Tempo's internal shared-agent platform, open-sourced in May 2026. It lets a team summon an agent from Slack that can use tools, run for hours or days, survive restarts, and act with real credentials without ever holding the raw secret. The repository (github.com/paradigmxyz/centaur) and its docs describe five conceptual layers (Ingress, Control, Execution, Capabilities, Secrets and egress), which line up closely with our own five-plane split and are compared plane by plane in section 2.

Paradigm is a crypto-focused investment firm with a strong in-house engineering team, Tempo is a co-developer, both based in San Francisco per the launch post's "Built by Paradigm and Tempo." There is no separate commercial product, no pricing page and no enterprise tier. It ships as-is, and running it in production is left entirely to whoever self-hosts it.

The makers claim, in the May 2026 launch post (paradigm.xyz/2026/05/open-sourcing-centaur-multiplayer-self-hosted-secure-agents), that Centaur has been Paradigm's own production tool "since January" 2026, four months before release, across investing, engineering, design, recruiting, events and customer support. The repository backs this up with more than a marketing line: services/api-rs/rfcs/0003-python-workflow-host.md names real internal workflows, including github_issue_triage, consensus_ci_triage, trivy_vulnerability_intake, slack_sync and chief_of_staff_daily, which read as genuine internal automation rather than demo code. A second post from August 2026, "Centaur 2.0: Permissions, Context, and MCP" (paradigm.xyz/writing/centaur-2-0-permissions-context-and-mcp), describes a rework from "one organisation-wide set of credentials" to per-context grants and a collapse of the API to four operations, both of which match what this clone's code (last commit 2026-09-28) actually shows.

## 2. Mapping to our five planes

| Plane or principle | What Centaur does | What we do | Verdict |
|---|---|---|---|
| Signals | Slack @-mentions are the primary intake. Workflows can also fire from webhooks (POST /api/webhooks/{slug}) or schedules run as durable Absurd tasks. Real workflow names such as github_issue_triage and trivy_vulnerability_intake show issues and security scans do reach agents, but only if a team writes that workflow by hand. There is no first-class "every task is an issue" registry. | Every task starts as a Forgejo issue. Webhooks and SigNoz telemetry alerts feed a shared task registry directly. | we lead |
| Control plane | Session (RFC 0002) is the durable object, one row per thread_key across four Postgres tables (sessions, session_messages, session_executions, session_events), with a four-call REST and SSE API and replay from any last-seen event id. Executions are serialised per session and recover from a crash. | Temporal workflow per task, capability policy, budgets, approvals and a cost ledger, all inside factoryd. | equal on state durability, we lead on approvals and budgets |
| Worker plane (sandbox) | One Kubernetes Sandbox custom resource (agents.x-k8s.io/v1alpha1) per session, created through a backend-neutral SandboxBackend trait (RFC 0001), with pause (spec.replicas=0) and resume (spec.replicas=1) against a retained state PVC, plus a warm pool of pre-spawned sandboxes. | One namespace, ServiceAccount and gVisor pod per task, default-deny egress. | they lead on lifecycle mechanics, we lead on syscall-level isolation |
| Verification | None as a platform concern. An agent can run tests or open a PR from inside its own sandbox if asked, but there is no built-in test gate, risk classification or stronger-model review before anything merges. | Forgejo Actions, policy gates, a reproduction gate, and a stronger-model review with a strict verdict, all before merge. | we lead |
| Merge and deploy | Whatever the agent's own tool calls do, typically a git push and a PR opened through a tool, attributed to the requesting human through the per-turn credential union in RFC 0005. | Bot-only merge after human approval or an auto rule, GitOps deploy, a staged rollout with an alert-free wait window. | we lead |
| Policy outside the model | iron-proxy request rules (services/iron-proxy/iron-proxy.yaml) match host, header and path before a credential is injected, and Console's Postgres-backed role, grant and secret tables decide which principal gets which secret. Enforcement sits in a proxy and a database, not a prompt. | Capability rules as a YAML file in Git, enforced in factory-gateway code and Cilium network policy. | equal |
| Identity per task | A principal comes from the calling context (a Slack user, a Slack channel, a GitHub issue, a workflow, a thread), not from Kubernetes. The requester's own OAuth token is unioned into a shared channel's proxy config for one turn only (RFC 0005), so a PR opens as the human, not a shared bot account. | A projected, audience-scoped ServiceAccount token per task, verified against the cluster OIDC issuer by factory-gateway. | not comparable, different trust anchors, chat identity against cluster identity, both keep raw keys out of the sandbox |
| Artifacts not chat | Chat is the primary coordination surface. Agent turns and their side effects, a PR, a calendar change, both happen from inside one conversation. | TaskBrief in, a branch, a PR and a normalised event stream out. Git is the coordination mechanism. | we lead |

## 3. Architecture and stack

Four languages and one static docs site, read from the directory layout and package manifests rather than any single overview document. Rust runs the control plane, services/api-rs, and crates/harness-server, a 16-file crate (claude.rs, amp.rs, codex.rs, nanocodex.rs, hermes.rs, otel.rs, wire.rs, validation.rs and others) that normalises every supported harness's protocol quirks into one Anthropic-shaped message format so api-rs never parses harness-specific output. Python runs the sandbox image and its repo-cache scripts (services/sandbox/repo_cache_sync.py, repo_cache_watch.py) and the Absurd-backed workflow host (services/workflow-python), plus the tools/ and workflows/ trees that individual teams author. Ruby on Rails runs services/console, an ordinary ActiveRecord application under app/controllers/console/*.rb and app/views/console/*, covering principals, roles, secrets, oauth_apps, integrations, system_settings, users, skills and scheduled_tasks. TypeScript and Node run services/slackbotv2 and services/discordbot, confirmed by their package.json files. The docs site under docs/ is built with Vocs, a Vite-based static site generator.

Postgres is the single source of truth throughout, the session tables, Console's ActiveRecord tables, and the Absurd checkpoint tables for workflows all live there. No separate queue or cache layer was found in the files read. Absurd's own queueing runs on Postgres, with isolation classes (agent, webhook, etl, maintenance, named in services/api-rs/rfcs/0003-python-workflow-host.md) that keep a long ETL-style workflow from starving a Slack-facing turn sharing the same worker pool.

Deployment is a Helm chart plus a set of `just` recipes (`just bootstrap-secrets`, `just up`, `just smoke`), runs on any Kubernetes, and a local k3s, kind or minikube cluster is enough, per docs/pages/quickstart.mdx and docs/pages/deploying-in-production.mdx.

Agents run inside a sandbox container built by services/sandbox, which installs harness CLIs and tool shims and starts crates/harness-server. Baked default configs exist for two harnesses (harness/codex/config.toml, harness/claude/settings.json), and docs list support for Amp, Claude Code, Codex (the default, usable through OpenAI, OpenRouter or Meta AI) and a custom CLI.

There is no shared model gateway. Each harness or feature calls its model provider directly, and iron-proxy injects the matching credential by host at the point the request leaves the sandbox. api-rs itself also calls OpenAI directly for an internal "activity summary" feature (OPENAI_API_KEY, default model gpt-5.4-nano, per docs/pages/reference/configuration.mdx).

## 4. UX

Zero to a verified first result is five steps, all on the command line, counted from docs/pages/quickstart.mdx: install just, kubectl, helm and jq plus Docker and a local cluster, run `just bootstrap-secrets` (five required shell environment variables), run `just up` (bootstraps secrets, builds, deploys), check health with `kubectl exec ... curl localhost:8080/healthz`, then run `just smoke`, which spawns a session, persists a message, executes it and polls for the literal string PONG in the result. No web UI step is involved in getting a first answer.

Day-to-day use is chat-native. A user @-mentions the bot in Slack, or DMs it, and the agent's progress streams back into the same thread as session events replay over SSE (RFC 0002). A user intervenes or redirects by replying in that thread, the same surface the agent is already watching, no separate approval screen exists. Results surface either as a Slack reply or as whatever the agent's own tool call produces, typically a PR opened under the requesting human's identity (RFC 0005). The one non-Slack interface is Console (services/console, Ruby on Rails). Everything under app/controllers/console/*.rb (principals, roles, secrets, oauth_apps, integrations, system_settings, users, skills, scheduled_tasks) is credential and permission administration, not agent monitoring. The one exception is Console::WorkflowsController, a paginated list of workflow runs with status_counts, a queue_breakdown, and a manual force_start action, the closest thing to an operations view, and it only covers scheduled or webhook-triggered workflows, not live Slack sessions.

No screenshots were reachable from the docs read here, docs/pages/demo.mdx only embeds a ThreadPanel React component with no narrative around it, so this description of the interface comes from reading controller and view file names, not a rendered screenshot. Not verified: what the ThreadPanel actually renders.

## 5. Security, identity, sandbox, policy, cost

Sandbox. docs/pages/security.mdx describes one Kubernetes Sandbox custom resource (agents.x-k8s.io/v1alpha1) per conversation, running non-root, with no privilege escalation and every capability dropped, behind a default-deny NetworkPolicy that only lets a sandbox reach its own iron-proxy sidecar and DNS. Not verified: whether the production backend also applies a stronger runtime class such as gVisor or Kata. The RFCs and docs read here describe the CRD and the pod security context but never name a sandboxed runtime class, the way Kubernetes SIG agent-sandbox's own examples do.

Egress. iron-proxy (services/iron-proxy/iron-proxy.yaml) runs a TLS man-in-the-middle per sandbox (tls.mode: mitm) and matches every outbound request against declared rules before substituting a placeholder credential for the real one. The shipped default is `domains: ["*"]`, open to the whole internet until a deployment edits this file. `ironProxy.upstreamDenyCidrs` blocks loopback and the cloud metadata address, but the security doc states plainly that it does not block the Kubernetes Service CIDR by default, a gap it names rather than hides.

Credentials. services/iron-proxy/AGENTS.md and docs/pages/secrets/advanced-permissioning.mdx describe a principal (a Slack user, a Slack channel, a GitHub issue, a workflow, or a thread) holding roles and direct grants that point at typed secrets (http, oauth_token, gcp_auth, pg_dsn, each declared in a tool's own pyproject.toml). The sandbox's environment only ever sees a placeholder, the real value lives in iron-proxy's own store and is injected on the way out. RFC 0005 adds a further mechanism: the human who actually triggered a turn is unioned into a shared channel's proxy config for that one turn, so a bot in a group channel opens a PR as the requesting person, and no other user's turn in the same channel ever sees that credential. The August 2026 Centaur 2.0 post independently confirms the shift, describing the earlier model as "one organisation-wide set of credentials" and the current one as access "derived from the context in which it's invoked."

Policy. Enforced in iron-proxy's YAML transforms and in Console's Postgres-backed role, grant and secret tables, managed through a `centaur-perms` CLI or the Rails Console UI, not in a system prompt. It reads as a genuine authorisation system: a direct grant outranks a role grant, a cross-type grant suppresses a weaker claimant of the same host and header, and a nullable `oauth_apps.always_available` flag is the explicit admin allowlist for which credentials may ever leave a one-to-one DM.

Cost. Not found anywhere. An exhaustive grep of every .rs, .py, .rb and .md file for budget, spend limit, spend cap, cost_ledger and rate limit, plus a full read of docs/pages/reference/configuration.mdx, turned up only resource and time limits: SESSION_IDLE_TIMEOUT_MS, SESSION_MAX_DURATION_MS, apiRs.sandboxMaxLifetimeSecs (default 259200 seconds, 72 hours), and sessionEventsRetentionDays. There is no dollar-denominated ledger, no per-task, per-day or per-project spend envelope, and no hold mechanism anywhere in the codebase or docs read for this report.

## 6. What we should take from it

Narrow, copyable this month. The Kubernetes Agent Sandbox CRD pattern (agents.x-k8s.io/v1alpha1) with pause (spec.replicas=0) and resume (spec.replicas=1) against a retained state PVC, from services/api-rs/rfcs/0001-sandbox-abstraction.md, is a cheaper lifecycle than our destroy-and-recreate-per-task pod for any task that idles and comes back, and would land as an alternative sandbox mode in our own worker plane rather than a replacement for it. The requester-credential-union design in RFC 0005, binding the human who actually triggered a turn as an extra credential principal for that turn only, using a signature-verified sender id as the sole trust anchor, generalises our own "PR opens under the human's own token" goal beyond the two Forgejo tokens we currently hand-roll, to any OAuth-backed tool a task might need. Typed secret declarations colocated in each tool's own manifest keep a capability request next to the tool's own code, worth adopting the moment our capability classes expand past `coder`. Workflow queue isolation classes (agent, webhook, etl, maintenance) are a direct, small change to how we size Temporal worker queues so a heavy background job cannot starve an interactive task.

Broad, a problem we currently under-serve. Chat as the primary surface for watching and steering a running agent is a materially better answer to the gap our own baseline names directly, "no real-time streams of the agent's work" in 00-our-vision.md, than a kanban board a human has to remember to check. Streaming a task's progress into a channel a human is already in, and treating a reply as the intervention, is worth a compact addition to our console for interactive, human-facing tasks, without adopting Centaur's chat-only model wholesale. Second, Centaur treats credential brokering as a general problem, any host, any header shape, any OAuth provider, rather than only a Git and an LLM-provider problem. We currently special-case two systems, Forgejo tokens and LiteLLM virtual keys, and a single per-sandbox proxy mechanism like iron-proxy's becomes relevant the day our capability classes need arbitrary third-party APIs.

## 7. Where our philosophy differs and what that costs or buys us

No spend governance exists anywhere in the platform, confirmed in section 5. Copying Centaur's control plane as it stands means giving up hard-cap budgets, holds and a cost ledger entirely. That is the price of Centaur's simplicity, and it directly conflicts with our "security without half measures" constraint, which treats spend as something with a hard cap, not a soft one.

Egress defaults open (`domains: ["*"]` in services/iron-proxy/iron-proxy.yaml), tightened per deployment rather than closed by default. Our constraint is default-deny from a task's first second. The mechanism Centaur hangs this on, a per-sandbox TLS-terminating proxy, is sound and worth studying, but its default posture is the opposite of ours, and adopting the default rather than only the mechanism would break the constraint.

There is no verification or merge plane. Centaur is not a coding factory, an agent's own say-so plus ordinary human PR review is the only gate before anything merges. Taking Centaur's worker plane wholesale would still leave us needing to build our entire signals-to-verification-to-merge loop on top of it, unchanged in shape, the same conclusion the earlier k8s-agent-sandbox report reached about the CRD underneath this one.

Sandbox isolation is documented as a plain Kubernetes restricted security context and a NetworkPolicy, not a named syscall-level sandbox such as gVisor (not verified whether production adds one underneath). If that holds, adopting Centaur's isolation tier as our floor would weaken our own, in exchange for its stronger lifecycle mechanics around pause, resume and a warm pool.

Five languages and runtimes sit inside one platform, Rust, Python, Ruby on Rails, TypeScript and a Vocs docs site, against our one Go module and two binaries. Centaur trades a single on-call skill set for using each ecosystem's strongest tool, Axum for the API, Rails scaffolding for the admin UI, Python for tool and workflow authoring. That is a real operability cost we have deliberately avoided by staying in one language, and it is not one we should take on just to gain the mechanisms above.

## 8. Red flags and slop assessment

Real and used in anger, with two open gaps worth flagging rather than a reason to discount the project. Maintenance signals are solid: 59 contributors (`gh api repos/paradigmxyz/centaur/contributors`), commits most days including five within a few hours on 2026-09-28, the day before this report, and 113 open issues with ordinary feature, fix and refactor titles rather than abandoned-project silence. Third-party forks exist under other organisations (bitwise-invest/centaur, openfort-xyz/centaur, cmpx575/centaur, found by WebSearch), suggesting outside teams are actually running it, not only starring it.

The licence has an unresolved inconsistency across three sources describing the same repository. The repo's own LICENSE file states "Apache License, Version 2.0 OR MIT license, SPDX-License-Identifier: Apache-2.0 OR MIT," a dual permissive licence, but `gh api repos/paradigmxyz/centaur` reports `license.key: "other"` and `license.spdx_id: "NOASSERTION"`, and centaur.run states only "MIT licensed." This does not read as a licence change or a bait-and-switch, but it is worth checking again before depending on the exact terms.

No open-core gating was found, there is no paid tier, no pricing page, and no feature documented as enterprise-only. Centaur reads as a genuine internal tool released as open source rather than an open-core funnel.

Marketing broadly matches the code. The Session and four-endpoint API, the per-context credential model, and the Absurd-inspired workflow host all exist in the RFCs and match what services/api-rs/rfcs describes. One claim did not check out in the files read: the launch post states that "LLM API responses are scanned for leaked secret values and redacted in real time." This was not found in services/iron-proxy/iron-proxy.yaml or anywhere else read for this report, and should be treated as a claim, not verified in the available code.

No security incidents were found. A WebSearch for the repository name with vulnerability, incident and CVE returned no advisories, only an administrative pull request (#1789) updating the SECURITY.md contact address. The security doc itself discloses its own gaps, the default-open allowlist, the Service CIDR exception, and a shared-credential-vault caveat, rather than hiding them, a good transparency signal.

## 9. Sources

https://centaur.run (WebFetch, 2026-09-29)
https://www.paradigm.xyz/2026/05/open-sourcing-centaur-multiplayer-self-hosted-secure-agents (WebFetch, 2026-09-29)
https://www.paradigm.xyz/writing/centaur-2-0-permissions-context-and-mcp (WebFetch, 2026-09-29)
WebSearch: Paradigm Centaur agent platform blog post Slack Kubernetes sandbox (2026-09-29)
WebSearch: "paradigmxyz/centaur" security vulnerability OR incident OR CVE (2026-09-29)
WebSearch: Centaur Paradigm agent platform Hacker News Reddit discussion (2026-09-29)
gh api repos/paradigmxyz/centaur (2026-09-29)
gh api repos/paradigmxyz/centaur/contributors --paginate (2026-09-29)
gh api repos/paradigmxyz/centaur/commits --paginate -q '.[].commit.author.date' (2026-09-29)
gh api "repos/paradigmxyz/centaur/issues?state=open&per_page=10" -q '.[].title' (2026-09-29)
git log -1 --format='%ci' in ~/repos/market-research-clones/centaur (2026-09-29)
README.md
LICENSE
AGENTS.md
SECURITY.md
docs/pages/architecture.mdx
docs/pages/security.mdx
docs/pages/what-is-centaur.mdx
docs/pages/index.mdx
docs/pages/demo.mdx
docs/pages/quickstart.mdx
docs/pages/deploying-in-production.mdx
docs/pages/reference/configuration.mdx
docs/pages/secrets/advanced-permissioning.mdx
services/api-rs/rfcs/0001-sandbox-abstraction.md
services/api-rs/rfcs/0002-session-control-plane.md
services/api-rs/rfcs/0003-python-workflow-host.md
services/api-rs/rfcs/0005-per-turn-requester-credentials.md
services/iron-proxy/AGENTS.md
services/iron-proxy/iron-proxy.yaml
services/iron-proxy/Dockerfile
services/sandbox/AGENTS.md
services/console/app/controllers/console/ (directory listing)
services/console/app/controllers/console/workflows_controller.rb
services/console/app/models/centaur_session_record.rb
services/console/app/views/console/ (directory listing)
services/slackbotv2/package.json
services/discordbot/package.json
harness/codex/config.toml
harness/claude/settings.json
plugins/centaur/ (directory listing, README.md, .claude-plugin/plugin.json, .codex-plugin/plugin.json)
crates/harness-server/src/ (directory listing)
services/api-rs/crates/ (directory listing)
top-level repository layout (find . -maxdepth 2 -type d)
