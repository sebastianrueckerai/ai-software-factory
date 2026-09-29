---
name: Optio
slug: optio
url: https://optio.host/
repo: https://github.com/jonwiggins/optio
category: factory-orchestrator
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted only (Helm chart or docker-compose); no SaaS or hosted offering found on optio.host
company: Solo maintainer (jonwiggins, bio "@phaselabinc @Illinois @hackny"). No company, funding or HQ disclosed.
maturity: 1055 stars, 120 forks, 10 contributors (1 dominant, 871 of roughly 940 commits), created 2026-03-19, last push 2026-09-29, 11 releases v0.1.0 to v0.6.5, near-daily releases in the final week of September 2026
similarity: 3
axes:
  signals_intake: 3
  control_plane: 3
  sandbox_isolation: 1
  verification: 1
  policy_outside_model: 1
  identity_per_task: 2
  cost_control: 0
  ux: 4
  reseedable_selfhost: 3
steal:
  - "scripts/optio-git-credential: a git credential-helper that fetches a GitHub token on demand via an HMAC-signed internal API call, so no static PAT ever sits in the pod's environment."
  - "AgentAdapter interface (validateSecrets, buildContainerConfig, parseResult) hosts 7 CLI harnesses behind one seam. Confirms a thin Harness interface scales without a heavier plugin system."
  - "A fake ContainerRuntime implementation runs the full reconcile-to-merge pipeline in CI with no live Kubernetes cluster, per .github/workflows/ci.yml's e2e job."
  - "Polymorphic workflow_triggers table keyed by (target_type, target_id) with one fireTrigger dispatcher, instead of one trigger table per source."
  - "Native iOS and Android apps for watching and approving tasks, and a Slack bot trigger, next to the web UI."
  - "Ticket-provider adapters for GitHub, GitLab, Linear, Jira and Notion behind one ticket model, relevant to our own 'one forge only' gap."
differs:
  - "Policy is a handful of booleans (autoMerge, cautiousMode, networkPolicy.enabled) branched on inline in reconcile code, not a versioned capability document enforced by a separate layer."
  - "Default network egress is permissive: the networkPolicy DB column defaults to unrestricted, the Helm flag defaults off, and even the restricted NetworkPolicy allows all TCP/443 and TCP/80 egress with no domain allowlist."
  - "Auto-merge can fire from CI-checks-passing plus config flags plus a subtask reaching COMPLETED state, not from any required approval verdict; an AI review agent can also post a real, binding GitHub APPROVE with no mandatory human in the loop."
  - "Cost is a ledger (costUsd) with a display-only budget field (budgetUsd, Jobs only) and no enforcement anywhere found, against our price-before-you-spend, hold-then-book model."
ux_verdict: Broader interface surface than our console (web, CLI, iOS, Android, Slack) but a multi-step self-hosted setup and screenshots that lag the current feature set.
slop_verdict: Real and actively maintained by one dominant author, with genuine CI and a detailed changelog, but its docs contain a broken cross-repo reference and its "secure self-hosted" pitch overstates the shipped defaults.
---

# Optio

## 1. What it is

Optio is a self-hosted, Kubernetes-native system that turns a ticket into a merged pull request using AI coding agents, built and maintained mostly by one person (GitHub user jonwiggins, 871 of roughly 940 commits). The README (`README.md`) and site (optio.host) describe three work kinds sharing one engine: Tasks (ticket to merged PR), Jobs (standalone, parameterised agent runs), and Agents (persistent, named, message-driven processes). It is MIT licensed, ships as a Helm chart plus a docker-compose local-dev path, and supports seven agent CLIs (Claude Code, Codex, GitHub Copilot, Gemini, Cursor, OpenCode, OpenClaw) behind one adapter interface.

The makers claim it is a general "self-hosted AI agent swarm and workflow orchestration platform" (per a recent repositioning, PR #604, "rewrite README, docs, and site around the session model"). What the repository actually shows is narrower and more concrete: a custom reconciliation engine over Postgres and BullMQ, four state machines for the four run kinds, a Kubernetes pod per running task, and a genuinely broad set of client surfaces (web, CLI, native iOS, native Android). The marketing language moved from "ticket-to-PR pipeline" (its April 2026 Show HN framing) to "agent swarm orchestration" faster than the underlying mechanism changed.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | GitHub, GitLab, Linear, Jira and Notion issues, PR comments, Slack bot commands and persistent-agent wake sources all create work through one polymorphic `workflow_triggers` table and a `fireTrigger` dispatcher. No telemetry or alert ingestion found. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API; every task is a Forgejo issue, one forge only. | not comparable: they cover more ticket sources, we cover telemetry and alerts and they do not |
| Control plane | A custom reconciler: pure decision functions over frozen world snapshots, applied by compare-and-swap, driven by a BullMQ queue with periodic resync (`docs/reconciliation.md`). Four run-kind state machines in Postgres. No capability policy engine, no model-tier ladder, budget is a display field only. | `factoryd` (Go) with a Temporal workflow per task, Postgres, capability policy as a YAML file in Git applied by Flux, budgets, approvals, model tier choice, cost ledger, audit trail. | we lead: they match us on durable task state and scheduling, not on policy, budget or audit |
| Worker plane | One Kubernetes pod per task. Seven `AgentAdapter` implementations behind one interface (`packages/agent-adapters/src/types.ts`). Ordinary containerd pod: capability drop-all-then-allowlist, no privilege escalation, seccomp RuntimeDefault. No gVisor or Kata equivalent found. | One namespace, ServiceAccount and gVisor pod per task, one `Harness` interface, read-only root filesystem, non-root, default-deny egress to a small allowlist. | we lead: comparable adapter pattern, materially weaker sandbox and network defaults |
| Verification | CI checks status plus an optional AI review agent that can post a real GitHub review. Auto-merge fires on checks passing, the `autoMerge` flag, `!cautiousMode`, and blocking subtasks reaching `COMPLETED` state, not necessarily an "approved" verdict (`packages/shared/src/reconcile/reconcile-repo.ts`). | Forgejo Actions on gVisor runners, policy gates (risk class, migration flag, reproduction gate at base and head), a stronger-model review with a strict verdict, bot merge only after a whitelisted human approved or a narrow auto rule. | we lead: their gate is real but weaker and bypassable by configuration |
| Merge and deploy | `platform.mergePullRequest(ri, prNumber, "squash")` once the above conditions hold. No deploy step: Optio stops at a merged PR. | Merge by bot, Flux GitOps deploy, staged rollout with an alert-free wait window, telemetry feeds back into signals. | we lead: they do not attempt deploy or close the feedback loop |
| Policy outside the model | Settings are booleans (`autoMerge`, `cautiousMode`, `networkPolicy.enabled`) checked inline in reconcile code. The AI review's own text output, regex-parsed for a verdict, can itself gate merge. | Capability rules are a document in Git, versioned in the database, enforced in gateway code and network policy. A prompt cannot grant a capability. | we lead |
| Identity per task | GitHub token fetched on demand via an HMAC-signed git-credential-helper call (good). GitLab uses a static `GITLAB_TOKEN` environment variable in the pod (weaker). An optional Envoy sidecar can strip both from the container, off by default. | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer. Sandbox holds no key material bar two per-session git tokens. | we lead: one of their two credential paths matches our bar, the other does not, and their strongest mechanism is opt-in |
| Artifacts not chat | Repo tasks exchange PRs, branches and structured trigger records. Persistent agents are chat-native by design (turns and messages). | `TaskBrief` in, branch, PR and event stream out. Git is the sole coordination mechanism. | equal for the PR-driven paths, not comparable for persistent agents |

## 3. Architecture and stack

TypeScript Turborepo monorepo (`package.json`: `turbo dev`, `turbo build`). Top-level layout: `apps/api` (Fastify-style backend), `apps/web`, `apps/cli`, `apps/ios` (Swift), `apps/android` (Kotlin), `apps/site`, `packages/shared`, `packages/container-runtime`, `packages/agent-adapters`, `packages/ticket-providers`, `helm/optio`, `k8s/`, `scripts/`, `examples/`.

Storage is Postgres via a Drizzle-style schema (`apps/api/src/db/schema.ts`), with four run-kind tables (`tasks`, `workflow_runs`, `pr_reviews`, `persistent_agents`) and a shared `workflow_triggers` table. Queueing is Redis-backed BullMQ (`reconcile-queue`, `task-worker`, `workflow-worker`). There is no external workflow engine: `docs/reconciliation.md` documents a custom reconciler, pure decision functions over a frozen `WorldSnapshot`, applied through compare-and-swap, with periodic resync as the correctness backstop against missed events. This is a genuine, documented alternative to Temporal, not a gap.

Agents run in Kubernetes pods. `packages/container-runtime/src/kubernetes.ts` builds the pod spec; a second, "fake" `ContainerRuntime` implementation exists purely so CI can run the full pipeline end to end without a live cluster (used by the e2e job in `.github/workflows/ci.yml`). Each of the 7 agent adapters (`packages/agent-adapters/src/*.ts`) implements `validateSecrets`, `buildContainerConfig` and `parseResult`; Optio does not call model APIs directly, it shells out to each vendor's own CLI inside the pod and that CLI holds its own model credential.

Deployment is a Helm chart (`helm/optio`) with three value profiles: `values.yaml` (dev defaults), `values.production.yaml` (hardened), `values.local.yaml` (named local-dev auth bypass), plus a docker-compose path via `scripts/setup-local.sh`. CI (`.github/workflows/ci.yml`) runs format, typecheck, Swift/Kotlin type-sync checks, Android build and test, unit, integration and e2e (fake runtime) suites, a Playwright web-e2e suite, OpenAPI lint, and image builds, which is a genuinely mature pipeline for a six-month-old project.

Files and directories read: `README.md`, `docs/reconciliation.md`, `docs/tasks.md`, `docs/cryptography.md`, `docs/persistent-agents.md`, `docs/screenshots/overview.png`, `docs/screenshots/task-detail.png`, `packages/container-runtime/src/kubernetes.ts`, `packages/agent-adapters/src/types.ts`, `packages/agent-adapters/src/claude-code.ts`, `packages/shared/src/reconcile/reconcile-repo.ts`, `apps/api/src/services/repo-pool-service.ts`, `apps/api/src/services/reconcile-executor.ts`, `apps/api/src/services/pr-review-service.ts`, `apps/api/src/services/envoy-sidecar.ts`, `apps/api/src/services/git-token-service.ts`, `apps/api/src/services/oauth/index.ts`, `apps/api/src/services/git-platform/github.ts`, `apps/api/src/services/git-platform/gitlab.ts`, `apps/api/src/services/git-platform/codecommit.ts`, `apps/api/src/db/schema.ts`, `helm/optio/values.yaml`, `helm/optio/values.production.yaml`, `helm/optio/values.local.yaml`, `helm/optio/templates/network-policy.yaml`, `scripts/optio-git-credential`, `.github/workflows/ci.yml`, `CHANGELOG.md`, `CONTRIBUTING.md`, `package.json`, `LICENSE`.

## 4. UX

Onboarding from a fresh clone to a first result is not a one-command path. It needs, in order: deploy Postgres and Redis (docker-compose locally, or Helm in a cluster), register a GitHub App or set an OAuth provider (auth is on by default, `apps/api/src/services/oauth/index.ts`'s `isAuthDisabled()` returns `process.env.OPTIO_AUTH_DISABLED === "true"`, false unless set), supply at least one agent CLI's model credential, add a repo pool, then create or link a ticket. That is around six to eight discrete steps, typical for a self-hosted multi-tenant platform but not a "clone and go" demo.

Interfaces are unusually broad for an open-source project of this size: a web app, a CLI (`apps/cli`), native iOS and Android apps, and a Slack bot trigger path (added in v0.6.4 per `CHANGELOG.md`). A user watches a task move through its state machine (queued, running, needs-attention, PR states), can resume or redirect it, and can toggle `cautiousMode` and `autoMerge` per repository to change how much autonomy the merge step gets.

Screenshots in `docs/screenshots/overview.png` and `task-detail.png` show a task list and a task detail view, but the navigation in them matches an older v0.1.0-era layout, while the current docs describe a six-plus-tab interface. This is a documentation freshness gap, not evidence the live UI is worse than shown.

Set against our own console, which our baseline calls "functional, not designed... no onboarding, no real-time streams of the agent's work, no diff view, no mobile view," Optio's three-platform surface and chat trigger are ahead of what we ship today.

## 5. Security, identity, sandbox, policy, cost

Sandbox: pod-level hardening only. `packages/container-runtime/src/kubernetes.ts` drops all Linux capabilities and re-adds an explicit allowlist (excluding `SYS_ADMIN`), sets `allowPrivilegeEscalation: false` and `seccompProfile: RuntimeDefault`. There is no gVisor, Kata or Firecracker-class isolation layer. Network egress is permissive by default: the `networkPolicy` column in `apps/api/src/db/schema.ts` defaults to `"unrestricted"`, the Helm `networkPolicy.enabled` flag defaults to `false` in `values.yaml` and is only `true` in `values.production.yaml`. Even the "restricted" `NetworkPolicy` template (`helm/optio/templates/network-policy.yaml`) allows all TCP/443 and TCP/80 egress to any destination plus DNS; it only stops agent pods reaching Postgres or Redis directly on the cluster network. There is no domain allowlist at any setting. Not verified: what fraction of real deployments run with `networkPolicy.enabled=true`.

Identity and credentials: the GitHub path is good practice. `scripts/optio-git-credential` is invoked by git itself as a credential helper and fetches a token on demand from an internal API, the request signed with HMAC-SHA256 over a timestamp and path so the raw signing secret never crosses the wire, and no static token sits in the pod's environment. GitLab is weaker: the same script reads a plain `GITLAB_TOKEN` environment variable already resident in the pod. An optional Envoy sidecar (`envoy-sidecar.ts`, `secretProxy` flag, default off) can strip `GITHUB_TOKEN`, `GITLAB_TOKEN` and `ANTHROPIC_API_KEY` from the agent container entirely and inject them only at the network layer, which is the closest match to "the sandbox holds no key material" in this codebase, but it is opt-in.

Policy: there is no separate policy-evaluation layer. Behaviour is governed by per-repo booleans (`autoMerge`, `cautiousMode`) and Helm flags (`networkPolicy.enabled`, `secretProxy`) checked inline inside reconcile decision functions such as `packages/shared/src/reconcile/reconcile-repo.ts`. The one place a model's own output becomes a policy input is the AI review verdict: `pr-review-service.ts`'s verdict extraction regex-parses APPROVE, REQUEST_CHANGES or COMMENT out of the review agent's own log text, and that verdict can be posted as a real, binding GitHub review and can gate merge. That is policy read from the model's own words, not enforced independently of it.

Cost: `costUsd` is tracked as a ledger field on both `tasks` and `workflows` in `schema.ts`, so spend is visible after the fact. `budgetUsd` exists only on the `workflows` (Job) table, stored and presumably shown in the UI. No code path comparing spend against `budgetUsd`, or halting a run for exceeding it, was found anywhere in the reconciler or worker code read. There is no per-task or per-day hard cap.

## 6. What we should take from it

Narrow, copyable this month: the git-credential-helper pattern in `scripts/optio-git-credential` limits not just token lifetime but token exposure, the value never has to sit in the pod's environment or on disk until git asks for it mid-command, which is a tighter version of our own two-per-session-token exception. The `AgentAdapter` interface (`validateSecrets`, `buildContainerConfig`, `parseResult`) is evidence that a thin `Harness`-style interface scales cleanly past two backends to seven without a heavier plugin system, which supports our own direction rather than requiring a copy. The "fake" `ContainerRuntime` used for a full reconcile-to-merge e2e run with no live cluster is directly reusable: it would let factoryd get end-to-end pipeline coverage in ordinary CI instead of needing a real cluster for every test run. The polymorphic `workflow_triggers` table keyed by `(target_type, target_id)` behind one `fireTrigger` dispatcher is a tidier shape for adding new trigger sources than a table per source type, worth adopting if we add triggers beyond Forgejo issues.

Broad, product-shape level: native iOS and Android apps for watching and approving tasks are a real priority gap for us given our baseline names "no mobile view" as a known weakness; even a mobile-responsive console would close most of the gap without building native apps. Multi-tracker ticket intake (GitHub, GitLab, Linear, Jira, Notion issues behind one ticket model) shows the adapter shape that would fix our own named weakness of "one forge only." Persistent, long-lived agents as a distinct fourth run kind with wake sources and inter-agent messaging is a genuinely different product idea, a standing teammate rather than a one-shot task, worth a deliberate decision rather than silent adoption.

## 7. Where our philosophy differs and what that costs or buys us

Default network posture: Optio ships permissive egress by default at the database and Helm level, and even its "restricted" mode allows all HTTPS and HTTP egress with no domain allowlist. Copying that would break our "security without half measures" constraint outright, which calls for default-deny egress with a small allowlist. Their approach is simpler to operate, no allowlist to maintain per tool an agent might need, and that simplicity is exactly the price we choose not to pay.

Sandbox depth: Optio relies on hardened containerd pods with no gVisor or Kata equivalent. That would be cheaper and faster to build with, we already flag "gVisor on systrap is slow for builds" as our own weakness, but adopting their default would break the same "security without half measures" constraint. Nothing about commodity hardware or re-seedability forces us to drop gVisor, so this is a place their approach is faster and ours is deliberately slower and safer.

Merge authority: Optio lets an AI review agent post a binding APPROVE and lets auto-merge fire from boolean flags plus a subtask reaching `COMPLETED` state, with no mandatory human and no required "approved" verdict in every configuration. Our principle holds that an approval is a workflow state, not a meeting, but still requires a whitelisted human or a narrow, named auto rule for normal-risk, reproduced, strictly-improving changes. Copying Optio's looser default would buy faster merges and less human load at the direct cost of our security and policy-outside-the-model principles, so we should not adopt it even though it is faster.

Cost discipline: Optio records cost after the fact with a display-only budget field and no enforcement; we price, hold and clamp spend before a call happens. Their model is far simpler to build, a column and a UI number, but it cannot stop a runaway task. Ours costs more engineering (LiteLLM virtual keys, database-locked holds) and buys a hard ceiling. Optio shows a usable product can ship without this, but our constraint says we should not relax it.

## 8. Red flags and slop assessment

`docs/cryptography.md` links to GitHub issues on `anthropics/optio`, a repository that does not exist. `gh api repos/anthropics/optio` returns a 404. This looks like an AI-assisted documentation pass that fabricated cross-references, a genuine slop signal in the docs layer even though the surrounding code is substantive.

Bus factor is thin: one author (jonwiggins) holds 871 of roughly 940 commits across 10 contributors (`gh api repos/jonwiggins/optio/contributors`). The project is six months old (created 2026-03-19) but has shipped 11 releases (v0.1.0 to v0.6.5) with a detailed, dated `CHANGELOG.md` (named fixes such as Codex transcript support and Slack triggers) and a real CI pipeline covering unit, integration, e2e-with-fake-runtime and Playwright web-e2e suites, which together read as genuinely active, dogfooded development rather than a one-shot generated dump.

Screenshots in `docs/screenshots/` show a stale v0.1.0-era navigation against the v0.6 feature set the current docs describe, a documentation-lags-code gap.

A third-party review, [vibecodinghub.org/tools/optio](https://vibecodinghub.org/tools/optio) (dated 2026-07-17), states the SECURITY.md at that time said the web UI and API had no built-in authentication, making public exposure unsafe. The current code contradicts this: `isAuthDisabled()` in `apps/api/src/services/oauth/index.ts` defaults to false, and the Helm default requires an OAuth provider and a public URL. Given the pace of the changelog, this claim looks dated rather than currently false, but it shows the project shipped without auth-by-default for at least part of its life, and marketing claims should be checked against the exact commit, not the README.

Overall: real and maintained, not a README with a landing page. But its "secure, self-hosted" pitch on optio.host and in the README overstates what the shipped Helm defaults actually enforce, unrestricted network egress and no cost cap by default, which is the specific pattern to be sceptical of when reading any of its other security claims.

## 9. Sources

https://github.com/jonwiggins/optio (clone, depth 1, at /home/womb/repos/market-research-clones/optio)
README.md
docs/reconciliation.md
docs/tasks.md
docs/cryptography.md
docs/persistent-agents.md
docs/screenshots/overview.png
docs/screenshots/task-detail.png
packages/container-runtime/src/kubernetes.ts
packages/agent-adapters/src/types.ts
packages/agent-adapters/src/claude-code.ts
packages/shared/src/reconcile/reconcile-repo.ts
apps/api/src/services/repo-pool-service.ts
apps/api/src/services/reconcile-executor.ts
apps/api/src/services/pr-review-service.ts
apps/api/src/services/envoy-sidecar.ts
apps/api/src/services/git-token-service.ts
apps/api/src/services/oauth/index.ts
apps/api/src/services/git-platform/github.ts
apps/api/src/services/git-platform/gitlab.ts
apps/api/src/services/git-platform/codecommit.ts
apps/api/src/db/schema.ts
helm/optio/values.yaml
helm/optio/values.production.yaml
helm/optio/values.local.yaml
helm/optio/templates/network-policy.yaml
scripts/optio-git-credential
.github/workflows/ci.yml
CHANGELOG.md
CONTRIBUTING.md
package.json
LICENSE
gh api repos/jonwiggins/optio (2026-09-29)
gh api repos/jonwiggins/optio/contributors (2026-09-29)
gh api repos/jonwiggins/optio/releases (2026-09-29)
gh api users/jonwiggins (2026-09-29)
gh api repos/anthropics/optio (2026-09-29, confirms 404)
https://optio.host/ (WebFetch, 2026-09-29)
https://news.ycombinator.com/item?id=47520220 (Show HN, posted 2026-04-01, checked 2026-09-29)
https://vibecodinghub.org/tools/optio (dated 2026-07-17, checked 2026-09-29)
https://github.com/jonwiggins/optio/pull/604 (checked 2026-09-29)
