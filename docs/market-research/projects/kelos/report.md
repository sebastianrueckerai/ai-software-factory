---
name: Kelos
slug: kelos
url: none
repo: https://github.com/kelos-dev/kelos
category: kubernetes-agents
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, a Helm chart plus CLI on any Kubernetes 1.28+ cluster with cert-manager, no hosted or SaaS offering found
company: no company found, personal project under the kelos-dev GitHub org; lead maintainer Gunju Kim states he is a software engineer at NAVER in his own bio, but neither the repo nor his own writeups claim NAVER backing, funding or sponsorship
maturity: 335 stars, 43 forks, 155 open issues (gh api, 2026-09-29), created 2026-02-01, last commit 2026-09-28, 1831 commits, 11 contributors with one (Gunju Kim) responsible for about 1773 of them, 54 releases at roughly weekly cadence
similarity: 3
axes:
  signals_intake: 4
  control_plane: 2
  sandbox_isolation: 1
  verification: 1
  policy_outside_model: 2
  identity_per_task: 2
  cost_control: 2
  ux: 5
  reseedable_selfhost: 3
steal:
  - "The GitHub App credential path: appID, installationID and private key are exchanged for a short-lived installation token that a controller writes to a kubelet-synced Secret-backed file, so the token refreshes in place without a pod restart, worth copying wherever we deliver a rotating token into a running sandbox"
  - "TaskSpawner's declarative event-to-task mapping: a JSONPath fieldMapping plus filters/excludeFilters plus a Go text/template promptTemplate turns any webhook payload into a Task, a compact reference design if we ever add a second, non-Forgejo intake source"
  - "The Console's per-Session Changes tab (a live diff view) and lane-style Sessions list (grouped by review state, each carrying a PR and checks badge) is close to the real-time, diff-first watch surface our own console admittedly lacks"
  - "A first-party agent skill (npx skills add kelos-dev/kelos) that teaches a user's own coding agent to drive the tool conversationally, replacing hand-written YAML and CLI flags as the onboarding path"
  - "A CronJob-based OAuth refresher pattern (one CronJob per labelled credentials Secret, scoped to that Secret only) for keeping provider OAuth bundles fresh independently of any running agent"
differs:
  - "Kelos puts raw, long-lived provider credentials (Anthropic, OpenAI, Google API keys, Codex OAuth bundles) straight into the agent pod as plaintext env vars or mounted files from a static Secret, with no broker, no scoping and no per-task minting outside the GitHub App path; this is the opposite of our 'identity belongs to the task, not the machine' principle and we could not adopt it without breaking our security constraint"
  - "Kelos has no RuntimeClass or sandbox runtime and no controller-managed NetworkPolicy anywhere in the controller, so isolation is whatever the deploying cluster's default runtime and network already provide; our gVisor, default-deny-egress sandbox is strictly more expensive to build and operate, and that expense is the price of our security constraint, not something Kelos proves we can skip"
ux_verdict: a browser Console with a live per-Session chat, tool-call trace and diff tab, plus a first-party agent skill that removes hand-written YAML entirely, gets a user from zero to a watched, running task faster and with a richer live view than our console offers today
slop_verdict: real, dogfooded on itself daily and shipped on a near-weekly release cadence, not a marketing shell, but it is a single maintainer's side project with no company, no funding and no disclosed external production adopters, so treat it as a high-bus-factor bet rather than a supported product
---

# Kelos

## 1. What it is

Kelos is an open source Kubernetes operator that turns coding-agent runs into native Kubernetes workloads. A controller watches a set of custom resources and reconciles them into Jobs, Pods and StatefulSets that clone a repository, inject credentials, run a chosen coding agent (Claude Code, OpenAI Codex, Google Gemini, OpenCode, Cursor, or a custom image), and record the resulting branch, commit, pull request and token usage back onto the resource's status. It is built and published under the `kelos-dev` GitHub organisation, Apache 2.0 licensed, with no separate product website; the README is the only front door.

The README pitches it as running agents "in isolated Kubernetes workloads instead of on developer laptops" and lets an agent be "triggered from GitHub, Jira, Linear, cron schedules, or generic webhooks." The code backs up the triggering claim in full: `TaskSpawner` genuinely supports GitHub issues, GitHub pull requests, a GitHub webhook, a Linear webhook, Slack, Jira polling, cron and a generic webhook, each with its own filter language. The isolation claim is weaker than it reads: nothing in the controller sets a `RuntimeClass`, no `NetworkPolicy` is created for a Task, and the main agent container gets no security hardening unless a user explicitly opts in. Kelos is a genuine Kubernetes-native operator, not a wrapper script, but "isolated" here means "its own Pod," not "sandboxed."

There is no company behind it. The sole active maintainer, Gunju Kim, describes himself as a Kubernetes contributor and a NAVER engineer, but nothing in the repository, the Helm chart or his own writing ties Kelos to NAVER as an employer project; it reads as a personal effort that NAVER neither funds nor disclaims.

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | `TaskSpawner` polls or receives webhooks from GitHub issues, GitHub pull requests, a GitHub webhook, Linear, Slack, Jira and cron, plus an unauthenticated generic webhook; `SessionSpawner` starts a persistent chat Session from a GitHub webhook | Forgejo webhooks, SigNoz alert webhooks, a factoryd intake API, every task is a Forgejo issue | they lead on tracker and chat breadth, we lead on telemetry-alert intake, which Kelos has none of |
| Control plane | The Kubernetes API server and etcd are the store; `Task`/`TaskPipeline`/`TaskSpawner` status fields hold state, Job `backoffLimit` and `activeDeadlineSeconds` give retries and timeouts, a `TaskBudget` admission webhook blocks new Tasks once a spend or token cap is hit | `factoryd` with a Temporal workflow per task, Postgres, a cost ledger with holds, human approval as workflow state | we lead |
| Worker plane | One Task maps to one Kubernetes Job and Pod running the chosen agent image; a `Workspace` init container clones the repo; no `RuntimeClass`, no controller-managed `NetworkPolicy`, main container `SecurityContext` unset unless overridden | One namespace, ServiceAccount and gVisor Pod per task, default-deny egress, read-only rootfs, non-root always | we lead on isolation depth, they lead on the breadth of ready-made harnesses (five plus custom, against our one today) |
| Verification | `TaskPipeline` lets a user chain stages (for example implement, test, review) by hand; no built-in stronger-model review, no policy gate, no CI runner of its own | Forgejo Actions on gVisor runners, risk-classed policy gates, a reproduction gate, a stronger-model review with a strict verdict | we lead |
| Merge and deploy | The agent opens a pull request under whatever git identity its injected credential holds; Kelos does not merge, gate or deploy | Bot merge only after a whitelisted human approval or an auto-rule, Flux GitOps deploy, a staged rollout with an alert-free wait | we lead |
| Policy outside the model | `TaskBudget` is real code-enforced admission policy for spend and token caps; there is no capability or tool-authorization layer beyond whatever the injected credential itself already permits | A capability policy file in Git, enforced in `factory-gateway` code and Kubernetes network policy | we lead |
| Identity per task | A Kubernetes ServiceAccount per Pod for basic RBAC, but the actual provider credential is a static Secret's plaintext env var or file, shared by every Task that references it; the GitHub App path is the exception, with a short-lived, auto-refreshed installation token | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by `factory-gateway`, no static key ever reaches the sandbox | we lead |
| Artifacts not chat | `Task` is artifact-shaped (prompt in, branch and PR out), but `Session` is a deliberately long-lived, human-steered chat surface with its own Console, a different philosophy sitting next to the Task model | `TaskBrief` in, a branch, a PR and a normalised event stream out, Git is the only coordination mechanism | equal for Task-only use, not comparable once Session chat is counted |

## 3. Architecture and stack

Kelos is a Go controller built in the kubebuilder style (`zz_generated.deepcopy.go`, envtest-based integration tests, CEL validation on CRD fields). Its custom resources are `Task`, `TaskPipeline`, `Session`, `SessionSpawner`, `WorkerPool`, `Workspace`, `AgentConfig`, `TaskSpawner`, `WebhookGateway`, `TaskBudget` and the terminal, immutable `TaskRecord`. The controller reconciles `Task` into a `batchv1.Job` (`internal/controller/job_builder.go`), `Session`/`WorkerPool` into `StatefulSets`, and `TaskSpawner` into either a polling `Deployment` or a `CronJob` depending on the source type. There is no separate database: the Kubernetes API server and etcd are the only state store, and `TaskRecord` exists specifically to preserve cost and usage accounting after a `Task` is garbage-collected by TTL.

Agent containers implement a small standardised interface (`docs/agent-image-interface.md`): an executable at `/kelos_entrypoint.sh`, the prompt as `$1`, a UID 61100 convention, and a reserved `KELOS_SETUP_COMMAND` that Kelos strips defensively from user input. Bundled images run under `tini` for signal forwarding; custom images do not need to. There is no model gateway: each agent container talks to its provider's API directly with whatever credential was injected, and MCP servers are configured per `AgentConfig`. Deployment is a Helm chart (`internal/manifests/charts/kelos/`) plus a Go CLI (`kelos`), with CRDs managed as a separate sub-chart from the controller release, per `CONTRIBUTING.md`'s API-compatibility rules (only add fields to the latest served version, `v1alpha2`, never remove a served field).

Files and directories read: `README.md`, `docs/reference.md`, `docs/integration.md`, `docs/agent-image-interface.md`, `CONTRIBUTING.md`, `self-development/README.md`, `internal/controller/job_builder.go`, `internal/manifests/charts/kelos/README.md`, `docs/images/kelos-resources.png`, `docs/images/kelos-session-web-chat.png`, plus directory listings of `internal/admission/`, `internal/spawnercredentials/` and `internal/githubapp/`.

## 4. UX

Zero to a first result by CLI is about six commands: install cert-manager, install the `kelos` CLI, `kelos install`, `kelos init` (writes `~/.kelos/config.yaml` with commented-out credential slots), `kelos create workspace`, then `kelos run --prompt "..." --watch` followed by `kelos logs TASK_NAME -f`. The first-party skill path is shorter for anyone already running a coding agent: `npx skills add kelos-dev/kelos`, then a natural-language instruction such as "configure Kelos for my repo and run a task," and the skill assembles the YAML and CLI calls itself.

The optional Console (a cluster-internal web app, disabled by default) is the strongest part of the product. The `kelos-session-web-chat.png` screenshot shows a live per-Session view: a scrolling agent transcript with inline tool-call cards (a bash command, its status, and a truncated diff preview), a "Changes" tab with a full unified diff of the current file, a PR number and a "Checks passed" badge tied to the Session, and a sidebar listing Sessions grouped into workflow-like lanes (approved, backlog, reviewing) each carrying its own PR and status badge. `kelos-resources.png` is an architecture diagram of how `TaskSpawner`, `Workspace`, `AgentConfig`, `Session` and `Task` relate, useful for onboarding docs rather than a product screenshot. The Console bridges chat to the Session's Pod through `kubectl exec`, can reset a Session's workspace after confirmation, and switches the active namespace live from the sidebar.

Against our console, this is materially ahead on exactly the two things our own weak-list names: a real-time stream of what the agent is doing, and a diff view. It is behind ours on governance: there is no kanban-style task registry across the whole factory, no per-project or per-task cost view, and, as covered below, Console access is a single shared token with no per-user identity at all.

## 5. Security, identity, sandbox, policy, cost

Sandbox: `internal/controller/job_builder.go` never sets `RuntimeClassName`, and no controller-managed `NetworkPolicy` exists anywhere in the codebase or the Helm chart, so a Task's Pod runs under the cluster's default container runtime with whatever network egress the cluster already allows. The pod-level `SecurityContext` and `FSGroup` are only set to the hardcoded UID 61100 when a `Workspace` is mounted; the main agent container's own `SecurityContext` is left completely unset (confirmed by grep: exactly one reference, inside the user-supplied `podOverrides.containerSecurityContext` branch) unless an operator opts in.

Identity: the documented Task Credential Secret Format injects provider keys as plaintext environment variables or mounted files, one static Secret shared by every Task that references it, for Anthropic, OpenAI, Google and Cursor credentials. GitHub access is the one exception: a GitHub App path exchanges `appID`/`installationID`/a private key for a short-lived installation token, delivered through a kubelet-synced Secret-backed file so it refreshes without a pod restart. A Codex OAuth token bundle gets a similar CronJob-based refresher, scoped to one labelled Secret per job. Console access compounds the exposure: the chart README states the Console's single static token "represents one shared user" with no per-user identity, and that holding it "grants interactive shell access to Ready Sessions' agent containers, including their workspaces and mounted credentials." One leaked Console token therefore exposes every live Session's credentials.

Policy: the only code-enforced control found is `TaskBudget`, an admission-time check against observed cost or token totals for a label-matched set of Tasks, checked before a Job is created and again before a worker-pool assignment. There is no runtime tool or capability broker; whatever the injected credential can already do, the agent can do. `WebhookGateway` verifies HMAC signatures for GitHub and Linear sources, but the generic webhook path is documented by the maintainers themselves as unauthenticated: "The generic webhook endpoint is currently unauthenticated. The handler does not validate request signatures" (`docs/integration.md`), tracked as issue #1040, with network-layer mitigation left to the operator.

Cost: `TaskBudget` enforces `maxCostUSD`, `maxInputTokens` and `maxOutputTokens` per namespace-scoped, label-selected group of Tasks, on a daily period, fail-closed on a list error. This is admission-time gating only: once a Task is admitted, nothing meters or holds spend during the run, and the actual cost is only visible after completion, in `TaskRecord.spec.usage`. Kelos also runs an opt-out, anonymous daily telemetry heartbeat (installation ID, version, resource counts, aggregate cost and token totals, no prompts, code or names), disabled with `kelos install --disable-heartbeat`.

## 6. What we should take from it

Narrow, copyable this month: the GitHub App token delivered as a kubelet-synced Secret-backed file, refreshing in place without a pod restart, is a clean pattern for any rotating token we hand to a running sandbox. `TaskSpawner`'s JSONPath `fieldMapping` plus `filters`/`excludeFilters` plus a Go `text/template` `promptTemplate` is a compact, well-specified reference design for turning an arbitrary webhook payload into a task, worth a look if we ever add a second intake source beyond Forgejo, an admitted gap on our own weak-list. The Console's per-Session diff tab and lane-grouped Sessions list is a concrete UI target for our htmx console's admitted lack of a real-time stream and a diff view.

Broad, worth studying: shipping a first-party agent skill (`npx skills add kelos-dev/kelos`) that teaches a user's own coding agent to drive the tool conversationally is a genuinely different onboarding model, worth considering for our own CLI and console so a developer can operate factoryd by describing intent rather than learning our YAML and commands. Treating a persistent, reconnectable, human-steered chat Session as a first-class product surface alongside one-shot tasks is a problem we do not currently address at all; our design is one-shot-task-only. `WorkerPool`, a pool of warm, reusable agent workers for `Session` traffic, is a pattern worth studying if interactive, low-latency use ever becomes a priority for us, since every one of our tasks starts from a cold sandbox today.

## 7. Where our philosophy differs and what that costs or buys us

Kelos uses the Kubernetes API server itself as the durable control plane: CRD status fields plus Job retries and timeouts, no separate workflow engine, no database. This is cheaper to run and faster to reseed than our Temporal-plus-Postgres control plane, but it gives up an approval state machine, a real cost ledger and multi-step retry semantics beyond a Job's own `backoffLimit`. We could take the "fewer moving parts" instinct seriously without taking the whole model, since our own re-seed time budget is a real constraint too.

The identity model is the one place we could not follow Kelos even partway. Raw, long-lived provider credentials sit in the agent's own environment with no broker and no per-task scoping, and the Console's single shared token can reach every live Session's mounted credentials at once. Our "identity belongs to the task, not the machine" principle exists specifically to rule this out; adopting Kelos's convenience here would mean handing every agent pod unaudited, standing access to GitHub and every model provider, which our security constraint does not allow regardless of how much simpler it would make credential handling.

The sandbox gap is the other side of the same trade. No `RuntimeClass`, no default-deny `NetworkPolicy`, and a main container that ships unhardened unless an operator opts in, against our gVisor, default-deny-egress, read-only-rootfs Pod per task. Kelos is faster to stand up because of this; our sandbox is expensive to build and run precisely because our "security without half measures" constraint does not let us treat isolation as optional.

## 8. Red flags and slop assessment

Bus factor is the clearest flag: one of eleven contributors, Gunju Kim, accounts for roughly 1773 of 1831 commits (about 97 percent), there is no company, no disclosed funding, and no NAVER affiliation claimed for the project itself, only for the maintainer personally. A Show HN post by the same author (news.ycombinator.com/item?id=47218469, March 2026) describes the project as "early and rough around the edges," and in the comment thread he confirms that the `dependsOn` pipeline-chaining field exists in the API but has no actual usage yet, a sign that some of the documented surface is ahead of real-world use.

The generic webhook endpoint is unauthenticated by the maintainers' own documentation, tracked as a known open issue (#1040), in a tool whose entire purpose is letting external events trigger code-writing agents. The README's framing, "isolated Kubernetes workloads instead of developer laptops," outruns what the code enforces by default: isolation here is a Kubernetes namespace and RBAC boundary, not a sandbox runtime or a network policy, both of which are entirely opt-in and left to the operator.

Against that, the maintenance signal is genuinely strong: near-daily commits and roughly weekly tagged releases (54 in about eight months) since a 2026-02-01 creation date, a real `CONTRIBUTING.md` with Kubernetes-SIG-style API compatibility rules, and a self-development setup (`self-development/README.md`) that runs twelve distinct spawner roles against the project's own repository in production, not a demo. This is a real, actively used, competently engineered tool, not a marketing shell, but it is a one-person bet, not a supported product.

## 9. Sources

https://github.com/kelos-dev/kelos
gh api repos/kelos-dev/kelos
https://news.ycombinator.com/item?id=47218469
https://dev.to/gjkim/kelos-orchestrating-autonomous-ai-coding-agents-on-kubernetes-apl
WebSearch: Kelos kubernetes coding agent operator kelos-dev, 2026-09-29
WebSearch: "kelos-dev/kelos" hacker news OR reddit, 2026-09-29
/home/womb/repos/market-research-clones/kelos/README.md
/home/womb/repos/market-research-clones/kelos/docs/reference.md
/home/womb/repos/market-research-clones/kelos/docs/integration.md
/home/womb/repos/market-research-clones/kelos/docs/agent-image-interface.md
/home/womb/repos/market-research-clones/kelos/CONTRIBUTING.md
/home/womb/repos/market-research-clones/kelos/self-development/README.md
/home/womb/repos/market-research-clones/kelos/internal/controller/job_builder.go
/home/womb/repos/market-research-clones/kelos/internal/manifests/charts/kelos/README.md
/home/womb/repos/market-research-clones/kelos/docs/images/kelos-resources.png
/home/womb/repos/market-research-clones/kelos/docs/images/kelos-session-web-chat.png
/home/womb/repos/market-research-clones/kelos/internal/admission/ (listing)
/home/womb/repos/market-research-clones/kelos/internal/spawnercredentials/ (listing)
/home/womb/repos/market-research-clones/kelos/internal/githubapp/ (listing)
