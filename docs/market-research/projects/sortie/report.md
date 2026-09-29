---
name: Sortie
slug: sortie
url: https://sortie-ai.com
repo: https://github.com/sortie-ai/sortie
category: factory-orchestrator
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, single static binary plus one SQLite file, no vendor cloud offering, no telemetry phoned home
company: Sortie AI (GitHub org name only; no registered company, HQ, funding or team page found)
maturity: 193 stars, 20 forks, 8 contributors (one dominant), created 2026-03-17, last commit 2026-09-29, 30 releases roughly weekly since launch
similarity: 3
axes:
  signals_intake: 1
  control_plane: 3
  sandbox_isolation: 1
  verification: 2
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 4
  ux: 3
  reseedable_selfhost: 4
steal:
  - the cumulative per-issue token budget (agent.max_tokens, cost_budget tool) with matching advisory and enforcing surfaces reading the same number
  - a one-shot credential verification pre-flight before a session claims a task, shared across every adapter kind
  - the "three writes only" tracker boundary, the orchestrator writes observed events, never a judgement call, back to the tracker
  - a kind-based adapter registry with blank-import self-registration and a hard no-cross-adapter-imports rule
  - an AGENTS.md-style Always/Ask-first/Never contract for AI contributors, enforced by lint and generic-naming tests
  - an 11-row disposition table that normalises every harness's heterogeneous exit signal into one of four outcomes
differs:
  - a locally launched agent inherits the orchestrator's whole OS environment, including every credential in it, the opposite of a per-task scoped identity
  - sandboxing is left entirely to the deployer, and Sortie's own docs show that tightening it does not stop a workspace-trusted runtime from launching host-level helper processes
  - scope stops at merge, with no deploy plane, no staged rollout and no telemetry-to-signals feedback loop
ux_verdict: a zero-account, six-step local demo and a live read-only dashboard, but no approval or diff-review surface, since every run is unattended by design
slop_verdict: real and shipping weekly with a heavier-than-usual test suite, but the bus factor is thin, one person authors every architecture decision and most of the commits
---

# Sortie

## 1. What it is

Sortie is a single Go binary that polls an issue tracker, runs a coding agent CLI against each matching ticket in its own workspace, watches CI and review feedback, retries on failure, and merges or hands off the result. It is Apache-2.0, published under the GitHub org sortie-ai, install by curl script, Homebrew cask or go install. No company page, funding or pricing tier was found anywhere. CONTRIBUTING.md and every decision record name one person, Serghei Iakovlev, as the decision-maker.

The makers claim it removes the need to build isolated workspaces, retries, tracker integration and cost tracking yourself (README), and that "Sortie does not write the code. It runs the agent that does" (sortie-ai.com, fetched 2026-09-29). The repository backs this up: 25 numbered architecture chapters under docs/architecture/ and more than 30 accepted ADRs under docs/decisions/, both treated as the binding spec an AI coding agent implements against (AGENTS.md: "Any code that drifts from the spec is a bug, not a creative interpretation"). Sortie is itself a working example of AI-agent-primary, spec-first development, a capability our own baseline (00-our-vision.md) says we do not yet have on the intake side.

It is used in anger, not a demo. Thirty releases shipped in roughly six months (created 2026-03-17, last commit 2026-09-29), and CHANGELOG.md entries describe specific field bugs, such as token accounting through a wrapped Gemini CLI process or a workspace directory replaced by a symlink, rather than marketing copy.

## 2. Mapping to our five planes

| Plane / principle | What Sortie does | What we do | Verdict |
|---|---|---|---|
| Signals | Polls GitHub, GitLab, Gitea, Linear and Jira issues on a fixed interval. Webhook intake is documented as "not implemented in v1" (docs/architecture/25-webhook-support.md). No telemetry or alert intake | Forgejo webhooks, SigNoz alert webhooks and an intake API feed one task registry | We lead |
| Control plane | SQLite-backed state machine (Unclaimed, Claimed, Running, RetryQueued, Released, plus a run-attempt lifecycle), single-writer goroutine, survives restart. No approval concept: "every agent run is unattended" (docs/architecture/10-agent-adapter-contract.md) | factoryd with a Temporal workflow per task, Postgres, policy in Git, budgets, approvals, model tier choice, audit trail | We lead |
| Worker plane | One coding-agent subprocess per issue in a plain directory workspace, local or over SSH. No container or VM sandbox, explicitly left to the deployer (docs/architecture/20-security-and-operational-safety.md, section 15.5) | One gVisor pod and ServiceAccount per task, read-only root filesystem, default-deny egress | We lead |
| Verification | Watches CI status and PR review or bot comments and feeds them back into the same agent session (internal/orchestrator/ci_reconcile.go, bot_review_reconcile.go). No independent policy gate or model review it owns | Forgejo Actions, policy gates by risk class, a reproduction gate, a stronger-model review with a strict verdict | We lead |
| Merge and deploy | Auto-merges on green CI plus configured approval and closes the issue (internal/orchestrator/auto_merge_reconcile.go, ADR 0017). Stops at merge, single repository scope, no deploy step | Bot merge after a human or an auto rule, Flux deploy, staged rollout with an alert-free soak window | Not comparable, Sortie has no deploy plane by design |
| Policy outside the model | Dispatch, concurrency, budgets and blocker rules live in one WORKFLOW.md file, validated and hot-reloaded by Go code the agent cannot edit. No network or capability policy; tool access is a per-kind trust boolean, not an enforced boundary | Capability rules as a Git-versioned document, enforced in gateway code and network policy | Equal on config-not-prompt, we lead on enforcement |
| Identity per task | A locally launched agent inherits the orchestrator's whole OS environment, including any credential present there (section 15.6). Remote dispatch over worker.ssh_hosts narrows this to a named allow-list of variables | Per-task, audience-scoped, kubelet-rotated ServiceAccount token; the sandbox holds no key material | We lead |
| Artifacts not chat | Coordination runs through the workspace, tracker state and the PR itself. Two MCP tool channels (sortie_status, tracker_api, cost_budget and others) are the only chat-like surface and are logged | TaskBrief in, a branch, a PR and a normalised event stream out | Equal |

## 3. Architecture and stack

Go 1.26.1, one static binary (cmd/sortie/main.go), no CGo: modernc.org/sqlite is the pure-Go driver (ADR 0002-use-sqlite-for-persistence.md). Direct dependencies (go.mod) are fsnotify, prometheus/client_golang, golang.org/x/sys, yaml.v3 and modernc.org/sqlite, nothing else. Every tracker and SCM adapter (internal/tracker, internal/scm) is a hand-rolled REST or GraphQL client on stdlib net/http, confirmed by the absence of any vendor SDK in go.mod.

Storage is one SQLite file in WAL mode next to WORKFLOW.md (docs/architecture/24-persistence-schema.md: tables retry_entries, run_history, session_metadata, aggregate_metrics, reaction_fingerprints, handoff_absence_resets, parked_issues, budget_hold_notices), evolved through forward-only migrations. Concurrency is goroutines plus context.Context cancellation and os/exec.CommandContext, with process-group based subprocess teardown, SIGTERM then SIGKILL, Windows Job Objects on that platform (docs/architecture/09-workspace-management-and-safety.md).

Extensibility runs through internal/registry, a kind-based adapter registry populated by blank imports in cmd/sortie/main.go. AGENTS.md enforces "no cross-adapter imports, no adapter logic in core" and generic naming (agent_*, tracker_*, session_*) by lint and tests. Registered kinds cover trackers (github, gitlab, gitea, linear, jira, a local file kind for demos), agents (claude-code, opencode, codex, copilot-cli, kiro retired in favour of the Agent Client Protocol, gemini, a mock kind), SCM and notification channels.

Deployment is the binary plus the SQLite file: a root Dockerfile, per-agent Dockerfiles under examples/docker/, and a plain single-instance Kubernetes example (examples/k8s/deployment.yaml, service.yaml, configmap.yaml, pvc.yaml). SQLite's single-writer model rules out multi-instance coordination by design (docs.sortie-ai.com/concepts/architecture, fetched 2026-09-29).

Sortie never calls a model API itself. It shells out to whichever coding-agent CLI is installed and normalises that CLI's event stream and token usage in a per-kind adapter (internal/agent/<kind>). Tool calls the agent makes back into Sortie travel over a separate local MCP stdio sidecar (sortie mcp-server, ADR 0009), distinct from the agent's own model traffic. internal/server serves an embedded, Go-templated dashboard (dashboard.html on GET /), a small JSON API (/api/v1/state, /api/v1/{identifier}, /api/v1/refresh), health endpoints and a Prometheus /metrics endpoint (internal/server/server.go), plus a sortie stats CLI command and a shipped Grafana dashboard JSON.

## 4. UX

One command turns a WORKFLOW.md file and an installed agent CLI into a running ticket-to-PR loop, with a genuinely account-free local demo but no approval or diff-review surface once it runs for real.

Onboarding (docs.sortie-ai.com/getting-started/quick-start, fetched 2026-09-29) is six steps and needs no external account: install and verify sortie --version, create a project directory, write a local issues.json (the file tracker kind), write a WORKFLOW.md using the mock agent kind, run sortie ./WORKFLOW.md, and inspect the resulting .sortie.db. A real tracker or agent credential is only needed once mock and file are swapped out.

Interfaces are a CLI (sortie <path-to-WORKFLOW.md>, sortie validate, sortie stats, sortie mcp-server), a read-only web dashboard, a small JSON API, and Prometheus metrics. There is no chat UI and no IDE plugin. While an agent works, the dashboard shows running and retrying counts, available slots and total tokens; the tracker issue itself receives comments on dispatch, completion and failure; a .sortie/status file gives an agent-agnostic status channel outside the MCP tool path.

There is no approval gate: every agent run is unattended by design. An operator's only levers are editing WORKFLOW.md (hot-reloaded, no restart needed), relabelling or closing the tracker issue, or stopping the process. There is no "waiting on a human" state in the issue state machine.

The marketing site shows a simulated terminal-style dashboard with four tickets in different states and a timestamped event log, and a flow diagram from issue tracker to orchestrator to result. The real shipped dashboard.html was read as Go template source, not rendered, so its actual appearance is not verified. Against our own console, described in 00-our-vision.md as "functional, not designed... no real-time stream, no diff view", Sortie's dashboard is narrower still, with no kanban, no human lane and no per-project cost view, but it ships from day one with no separate service to run.

## 5. Security, identity, sandbox, policy, cost

Security. Filesystem safety is enforced in code: workspace path containment, working-directory verification, sanitised directory names and symlink rejection are stated as numbered invariants (docs/architecture/09-workspace-management-and-safety.md, section 9). Process and network sandboxing is explicitly left to the deployer: "Sortie does not mandate a single hardening posture" (docs/architecture/20-security-and-operational-safety.md, section 15.5).

Identity. A locally launched agent inherits the orchestrator's full OS environment, so any credential present there, including one supplied by $VAR indirection in WORKFLOW.md, is readable by an agent running with approvals disabled in a write-capable sandbox (section 15.6, stated verbatim in the doc). Remote dispatch over worker.ssh_hosts narrows this to an explicit allow-list of variable names. There is no per-task credential; the process boundary is the whole orchestrator's identity, not the task's.

Sandbox. None is built in. A workspace is a plain directory under a configured root. Section 15.6 goes further than most projects' docs would: it states that even a hardened per-agent sandbox setting does not stop a workspace-trusted agent runtime from starting unsandboxed helper processes it discovers in checked-out repository content, and that the trust decision for a workspace path outlives the run that earned it. This is a documented, self-acknowledged weakness, not an oversight.

Policy. Dispatch, concurrency, tool trust and blocker rules live in one WORKFLOW.md file, validated and hot-reloaded by Go code the agent cannot edit from inside its own session, which is a real instance of policy living outside the prompt. There is no capability or network policy layer underneath it; a tool is registered or not, and trust for an agent kind such as Kiro is an operator-set boolean.

Cost. This is Sortie's strongest area. agent.max_tokens is a cumulative per-issue token ceiling (0 means unlimited) enforced before every re-dispatch, alongside the existing agent.max_sessions limit, producing a budget_stopped run outcome. A matching advisory cost_budget tool lets the agent read the same numbers mid-session, a warning threshold (agent.token_warning_percent) fires before the hard stop, and a used_tokens_complete flag distinguishes an exact spend figure from a known lower bound when a turn's usage was only partially reported (ADR 0013-agent-cost-budget.md, CHANGELOG.md 1.25.0). There is no money-denominated budget: ADR 0013 defers pricing explicitly because Sortie makes no outbound network call of its own for bookkeeping.

## 6. What we should take from it

Narrow, copyable this month:

The cost_budget tool and agent.max_tokens ceiling is a clean, minimal pattern: one scalar (0 means unlimited), one advisory tool, one enforcing gate, both reading the same accumulated number, plus a lower-bound flag for partial reporting. It would slot into our gateway budget holds as a per-task advisory surface our agents currently lack, since today they cannot ask how much budget remains before choosing to hand off.

The credential verification pre-flight, one cheap fixed request per session before real work starts, shared across every adapter kind, is worth adding to our own harness bring-up: it turns a dead API key into an immediate, retried failure instead of a session burned mid-task.

The "three writes only" tracker boundary (docs/architecture/11-issue-tracker-integration-contract.md, section 11.5: the orchestrator writes only observed events, dispatch, handoff, merge completion, never a judgement call) is a one-line auditable contract worth adopting verbatim for what factoryd is allowed to write back to a Forgejo issue.

The internal/registry kind-based adapter registration, self-registered by blank imports with a hard "no cross-adapter imports, no adapter logic in core" rule, is a smaller and more explicit version of our own Harness interface boundary. Copying the explicit rule, not just the interface, would keep our adapter boundary from eroding as we add harnesses.

Broad, product shape:

AGENTS.md's Always, Ask-first and Never boundary list for AI contributors, backed by lint and generic-naming tests, is a working example of spec-driven, AI-agent-primary development applied to Sortie's own codebase. Our baseline names spec-driven intake as a capability we do not have yet; Sortie's own build process, not its product, is the more useful thing to study here.

The 11-row Turn Disposition table (docs/architecture/10-agent-adapter-contract.md) that reduces every agent runtime's heterogeneous exit signal to one of four outcomes, turn_completed, turn_failed, turn_cancelled, turn_input_required, is a good template for our own harness exit handling, which today enumerates fewer of the edge cases it covers, such as a crash mid-turn or an ambiguous exit code.

## 7. Where our philosophy differs and what that costs or buys us

Two differences are structural, not cosmetic, and copying them would break our own security constraint.

A locally launched agent inherits Sortie's whole OS environment, including every credential in it, with approvals typically off. Our constraint, agents get capabilities, never raw credentials, forbids this outright. Adopting Sortie's approach would delete most of our infrastructure cost, the per-task ServiceAccount, the gateway, the token exchange, but it would also delete the one property our security story depends on. The constraint is the price, and we pay it on purpose.

Sortie's own docs show that tightening its sandbox setting does not close its main exposure: the sandbox governs commands the agent explicitly runs, not helper processes the agent runtime launches on its own from files in the checkout. Our default-deny network policy and non-root, read-only-root-filesystem pod enforce a guarantee at the OS and container boundary rather than at the agent runtime's own approval setting. Sortie's own admission here is a useful independent confirmation that this is the correct layer to enforce isolation at, not a design we should second-guess.

Sortie stops at merge. It has no rollout, no staging soak and no telemetry-back-into-signals loop, and it explicitly disclaims being a general workflow engine. This is a scope difference rather than a weakness: Sortie solves one narrower problem well, and comparing its merge and deploy plane against ours is not really comparing like with like.

## 8. Red flags and slop assessment

Not slop. It is a real, weekly-shipping project with an unusually thin bus factor.

Maintenance signals are strong: 30 releases between 2026-03-17 and 2026-09-29, and CHANGELOG.md entries name specific, sometimes obscure fixes, such as token accounting through a wrapped Gemini CLI process or a workspace directory replaced by a symlink, rather than reading like marketing copy.

Testing is heavier than usual for a project this size: a full-tree count puts roughly 274,000 lines across *_test.go files against roughly 93,000 lines of non-test Go, a ratio near 3 to 1, consistent with the table-driven, exhaustive-edge-case conventions CONTRIBUTING.md describes. .github/workflows/ci.yml runs a lint and test matrix across linux, darwin and windows, and the README carries a live codecov badge.

The bus factor is thin. gh api repos/sortie-ai/sortie/contributors lists 8 contributors; the top author has roughly five times the commits of the next-highest human contributor, and every architecture decision record names one person, Serghei Iakovlev, as its decision-maker. This reads closer to a well-run solo project than a team-maintained one.

No company, funding, pricing tier or independent review was found anywhere. A WebSearch on 2026-09-29 for reviews, "sortie vs" comparisons and funding turned up only directory listings (awesome-agent-orchestrators, yetanotherorchestrator.app) and Sortie's own comparison to OpenAI Symphony in its own README, no Hacker News or Reddit discussion and no third-party write-up. The front page's register, "your next sprint isn't capped by headcount", is a size larger than the org behind it, though this is a marketing observation, not a functional one.

To its credit, self-acknowledged weaknesses are documented rather than hidden: docs/architecture/20-security-and-operational-safety.md names its own credential-inheritance and sandbox-bypass exposure in specific, technical detail. That is a point in favour of trusting the documentation, and a point against using Sortie unmodified against untrusted repository content.

## 9. Sources

Repository, cloned 2026-09-29 as a shallow clone of https://github.com/sortie-ai/sortie to ~/repos/market-research-clones/sortie:
README.md
README.zh-CN.md
go.mod, go.sum
AGENTS.md
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md
WORKFLOW.md
LICENSE
docs/architecture/03-system-overview.md
docs/architecture/04-core-domain-model.md
docs/architecture/07-orchestration-state-machine.md
docs/architecture/08-polling-scheduling-and-reconciliation.md
docs/architecture/09-workspace-management-and-safety.md
docs/architecture/10-agent-adapter-contract.md
docs/architecture/11-issue-tracker-integration-contract.md
docs/architecture/20-security-and-operational-safety.md
docs/architecture/24-persistence-schema.md
docs/architecture/25-webhook-support.md
docs/decisions/0001-use-go-as-core-runtime.md
docs/decisions/0002-use-sqlite-for-persistence.md
docs/decisions/0013-agent-cost-budget.md
cmd/sortie/main.go
internal/server/server.go
internal/server/dashboard.go
internal/orchestrator/retry.go
internal/orchestrator/ci_reconcile.go
internal/orchestrator/auto_merge_reconcile.go
internal/orchestrator/bot_review_reconcile.go
internal/orchestrator/label_review_reconcile.go
internal/orchestrator/label_fix_reconcile.go
.github/workflows/ci.yml
examples/docker (per-agent Dockerfiles), examples/k8s (deployment manifests), root Dockerfile
top-level layout (find -maxdepth 2 -type d) and repository-wide Go line counts (find plus wc -l)

Web and API sources, fetched or run 2026-09-29:
https://sortie-ai.com
https://docs.sortie-ai.com/getting-started/quick-start/
https://docs.sortie-ai.com/concepts/architecture/
WebSearch: sortie-ai coding agent orchestrator review, vs symphony, funding
gh api repos/sortie-ai/sortie (stars, forks, licence, created_at, open_issues, homepage, topics)
gh api repos/sortie-ai/sortie/contributors
gh api repos/sortie-ai/sortie/releases
git log -1 --format=%ci (last commit date)
