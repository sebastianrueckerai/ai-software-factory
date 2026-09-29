---
name: ESF (Engineering Software Factory)
slug: esf
url: https://github.com/mitkox/esf
repo: https://github.com/mitkox/esf
category: factory-orchestrator
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, single dedicated host (systemd) or Kubernetes via a Helm chart, no SaaS offering
company: Solo developer mitkox (Mitko Vasilev), Bulgaria. Runs a separate AI-production consultancy ("mitko x" / Perla SV Ltd, mitkox.com). No fund or company backs ESF itself, and the consultancy site does not mention it.
maturity: 175 stars, 30 forks, 20 commits, 2 contributors (1 human, dependabot the other), repo created 2026-09-19, last push 2026-09-28, v0.5.0 GA tagged 2026-09-27 (8 days after creation)
similarity: 3
axes:
  signals_intake: 0
  control_plane: 3
  sandbox_isolation: 4
  verification: 4
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 1
  ux: 2
  reseedable_selfhost: 2
steal:
  - "CheckGateIntegrity: compares the working-tree content of declared gate files against their baseline git blob with git hash-object, not diff, so it survives git update-index --assume-unchanged, commit-the-tamper, and diff.mnemonicPrefix evasion. Directly portable to our own policy-file and gate-file protection."
  - "A per-run egress probe (public canary, cloud metadata endpoint, uid check) that runs before the agent starts and sets EGRESS_UNVERIFIED on failure, gated behind an explicit acknowledge_open_egress config flag. We only enforce egress with static NetworkPolicy and never actively measure it."
  - "threatmon: 40 stdlib regexp rules, one file, each with a documented false-positive and false-negative note in the source comment. Cheap, auditable, no ML. Worth copying as a first-pass detector layer feeding our existing supervisor-escalation mechanism."
  - "BLOCKED as a first-class workflow outcome, written by the agent itself to a JSON file, framed explicitly as removing the incentive for an agent under pressure to probe out of bounds instead of admitting it is stuck."
  - "The QMS/assurance risk-class schema (R0 to R4, highest-risk-wins union across path-glob rules, conflicts fail closed) and its four gate contract types (verification, independent-review, provider-snapshot, provider-ack) is a more formal vocabulary than our own path-risk-class idea and worth stealing wholesale."
  - "Verdict separation: a human REJECTED ends the run, but the underlying VerificationResult stays a separate recorded SUCCESS fact. Gates-passed and change-accepted are different facts. Our own approval schema should keep them equally distinct."
differs:
  - "ESF has no merge-and-deploy plane at all. internal/repository/provider.go states outright that the package never pushes, branches, or opens a pull request. The factory's output is a local patch file plus an evidence tree; a human or a separate process must apply, push, and deploy it. Our design goes all the way to a bot-merged PR and a GitOps rollout, so this is not something to copy, only a scope boundary to note."
  - "Cost control is evidence, not enforcement. Budgets are computed post-hoc from self-reported harness usage purely to set a condition on the manifest; nothing holds or blocks spend. Their own ADR admits this. Our constraint 4 (hard caps, no half measures) makes this pattern a non-starter for us."
  - "No per-task identity of any kind. Model credentials are static, operator-provisioned, named references, never rotated or scoped per run, and ADR 0006 itself lists OIDC, RBAC, and Vault-based leases as known future work. Copying their approach would abandon our own core principle that identity belongs to the task."
  - "The whole worker plane assumes one dedicated host (or a shared filesystem across hosts) running CubeSandbox, not a Kubernetes-native per-task namespace. This buys a solo maintainer a much simpler operational model, at the cost of the elastic, quota-scoped isolation our Kubernetes substrate gives us for free."
ux_verdict: CLI-first and CLI-only for every action; a read-only web UI shows evidence but cannot approve, intervene, or show a live stream of what the agent is doing.
slop_verdict: Real, tested, and unusually well-documented for a ten-day-old project, but it is a one-person effort with no merged external contributions and the project's own docs say plainly that no production deployment is qualified yet.
---

# ESF (Engineering Software Factory)

## 1. What it is

ESF is a solo-authored, MIT-licensed, self-hosted Go project that adds a Temporal-orchestrated autonomous coding-agent factory on top of an unmodified fork of [Machinist](https://github.com/owainlewis/machinist), a simpler pre-existing tool by Owain Lewis that assigns a configured coding-agent command to a job on the worker host. `docs/upstream.md` documents the fork provenance and module rename plainly. ESF keeps Machinist's CLI, control plane and web UI running unchanged, and layers a second, parallel control plane (`internal/factory`, Temporal, CubeSandbox) on top for the actually-sandboxed work.

The pitch, from the README: hand it a repository, a revision and a task description, and it runs a pinned coding-agent harness inside a CubeSandbox KVM microVM, verifies the result against a gate profile, and hands back a patch file plus a full evidence tree. It explicitly never pushes a branch or opens a pull request itself; the factory's job ends at "verified patch on disk."

It is made by mitkox (Mitko Vasilev), a solo developer in Bulgaria who separately runs a small AI-production consultancy ("mitko x", legally Perla SV Ltd, site mitkox.com). No company or fund backs ESF, and the consultancy's own site contains no mention of the project at all, so ESF is not even being used as that firm's showcase. The README frames ESF as a "self-hosted software factory," which reads as more finished than it is. The more honest line is in `docs/production-deployment.md`: "The v0.5.0 archives are a binary preview... no production deployment is qualified by the release." That sentence, not the README, is the one to trust.

## 2. Mapping to our five planes

| Plane / principle | What ESF does | What we do | Verdict |
|---|---|---|---|
| Signals | None inside the factory. Tasks enter only through `factory run` (CLI) or its API equivalent. An optional DSPy/Jev "intake advisory" (`docs/production-deployment.md#optional-dspyjev-intake-advisory`) scores the text of an already-submitted task; it is not a work source. Machinist's own inherited GitHub-event/cron/interval triggers and issue-triage GitHub Action exist in the repo but are not wired to the Temporal factory workflow at all. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. Every task is a Forgejo issue. | We lead |
| Control plane | `SoftwareChangeWorkflow` (`internal/factory/workflow.go`) is a durable Temporal workflow per task, with TOML-configured budgets and scopes, a redacting audit log, and CLI-driven review, cancel and halt (halt is dry-run by default, filtered by repo/harness/scope via a Temporal workflow memo). | `factoryd` (Go) with a Temporal workflow per task, Postgres (CloudNativePG), policy as YAML in Git applied by Flux. | Equal |
| Worker plane | One CubeSandbox KVM microVM per task, created via a narrow `sandbox.Provider` interface. A name-only `Harness` registry (`internal/agentharness`) drives `opencode2` (pinned) or a second harness for Unreal Engine work, with prompts delivered only via stdin file and environment filtered by an allowlist. A measured egress probe runs before the agent. | One gVisor pod per task behind a `Harness` interface, opencode headless today. Read-only root FS, default-deny egress by static NetworkPolicy. | They lead |
| Verification | `verification.Runner` executes every gate to completion and never silently passes an unexecuted step. `CheckGateIntegrity` compares gate files against their baseline git blob to defeat tamper evasions. An optional QMS overlay adds R0 to R4 risk classes and four gate contract types. | Forgejo Actions on gVisor runners, then path-risk-class and reproduction gates, then a stronger-model review. | They lead |
| Merge and deploy | None. `internal/repository/provider.go`'s package doc states: "Nothing in this package pushes, creates a branch on a remote, or opens a pull request." Output is a local patch file and an evidence tree. | Bot merge (`factory-merge`) after human approval or an `auto` rule, Flux GitOps deploy, staged rollout with an alert-free wait, telemetry back into signals. | We lead |
| Policy outside the model | Capability rules enforced in code: the `Registry` resolves harnesses by name only (no arbitrary command), `FilterEnv` allowlists environment, `sandbox.QuoteArgv` prevents argv injection into CubeSandbox's string-executed commands, and the repository allowlist is validated before any sandbox exists. | Capability rules are a Git-versioned document enforced in gateway code and network policy. | Equal |
| Identity per task | None. Model credentials are static, operator-provisioned named references (`{env:NAME}` plus a `pass_env` allowlist), never rotated or scoped per run. Cube management credentials never reach the sandbox, but that is the only credential isolation present. ADR 0006 itself lists OIDC/RBAC and Vault-based short-lived leases as future work. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, OIDC-verified by `factory-gateway`, forwarded under a per-task LiteLLM virtual key. | We lead |
| Artifacts not chat | `PromptStdinFile` transport, a written `inventory.json` (their TaskBrief equivalent), output is a patch file plus a JSON manifest and evidence tree. No chat exchange beyond monitored stdout/stderr. | `TaskBrief` in, a branch, a PR and a normalised event stream out. | Equal |

## 3. Architecture and stack

Go (module `github.com/mitkox/esf`, go1.27.1) for everything server-side; React and Vite for the embedded, inherited Machinist web UI. Orchestration is Temporal (`go.temporal.io/sdk`, `go.temporal.io/api`), with the workflow body in `internal/factory/workflow.go` and a `legacySoftwareChangeWorkflow` kept only for replay compatibility with pre-assurance histories. The activity sequence, recovered by reading the file and grepping activity call sites: `ValidateRequest` (no retry) then optional `AssessIntake` then `CreateSandbox`, `PrepareSandbox`, `PrepareRepository`, `WriteInventory`, `ApplyRuntimeNetwork` (infra retry) then `RunAgent` (effectively no retry) then `RunVerification`, `CheckGateIntegrity`, `ScanPatch`, an optional review gate (`PreviewSandbox`/`SuspendSandbox`/`ResumeSandbox`), `CollectArtifacts` (twice) then `DestroySandbox` and `FinalizeResult` on a disconnected context on every exit path, including cancellation.

Execution fabric is [CubeSandbox](https://github.com/TencentCloud/CubeSandbox) (Apache-2.0, 12,751 stars, listed in the CNCF landscape, E2B-API-compatible, KVM-backed microVMs), consumed through `internal/sandbox/cube/provider.go` behind a narrow `sandbox.Provider` interface (Create/Reattach/Destroy/List/Ping/Suspend/Resume/PreviewURL/SandboxState). Sandbox creation measured at about 0.25s; a 189MiB agent binary transfers in about 0.5s (`docs/adr/0001-use-cubesandbox-as-execution-fabric.md`). `sandbox.QuoteArgv` single-quotes every argv element because CubeSandbox's data plane executes a bash command string, not an execve argv array, and `Spec.Network` is only ever narrowed from the deployment default, never widened.

Agent harness abstraction is `internal/agentharness/harness.go`: a `Harness` interface (Name/Model/Provision/Run), a name-only `Registry` ("no arbitrary command harness"), `PromptStdinFile` as the default prompt transport (never argv), and `FilterEnv` for environment allowlisting. Two harnesses are pinned: `opencode2` (v2.0.18 in the v0.5.0 release, per PR #13/#17) and a second one referenced via `credential_mode = "cube_egress"` for Unreal Engine work (topic tag `unreal-agent`), read about but not read in full.

Verification is `internal/verification/run.go` (`Runner.Run` executes every step, marks an unexecutable step failed rather than silently passing) plus an optional, off-by-default QMS/assurance control plane (`internal/assurance`, `docs/quality-gates-and-providers.md`) with a YAML `QualityPolicy` schema, R0 to R4 path-glob risk classes, and four gate contract types (verification, independent-review, provider-snapshot, provider-ack). Behaviour monitoring is `internal/threatmon` (40 stdlib regexp rules across ten categories, each with a documented false-positive/false-negative note), scanning both agent stdout/stderr and the collected patch, explicitly documented as post-hoc and unable to interrupt a live agent.

Storage is local durable filesystem for artifacts (`artifacts.LocalStore`); the inherited Machinist control plane uses pure-Go `modernc.org/sqlite`. No LLM gateway or router library appears in `go.mod`; model calls happen entirely inside the pinned harness CLI, never proxied by ESF's own code. Full OpenTelemetry SDK and exporters are present.

Deployment is a single dedicated "factory host" managed by systemd units (`deploy/systemd`, `deploy/factory-worker.service[.d]`), which is the path validated in `docs/production-readiness.md`. A Helm chart also exists (`deploy/helm/esf`, described as "Single-authority ESF factory and loopback console"); the control plane and console bind to loopback even in that deployment. `deploy/cube/Dockerfile` builds the CubeSandbox base image; the only docker-compose file is for local Temporal dev (`deployments/dev/temporal/docker-compose.yaml`), not production. A separate, unrelated example (`examples/workflows/gvisor-pr`) runs Codex CLI inside a plain gVisor-sandboxed container for GitHub Actions PR workflows; it shares no code with the CubeSandbox factory and looks like a standalone experiment.

CI (`.github/workflows/ci.yml`) runs a linux and a macos job, each with a 20-minute timeout: `gitleaks` secret scan, a frozen release-inventory check, CycloneDX 1.6 SBOM generation and validation, `npm audit --audit-level=high` on the frontend and on `agents/opencode`, `gofmt -l`, `go vet`, pinned `govulncheck`, and `go test -race ./...`. `docs/production-readiness.md` also records live validation against a real Temporal cluster and a real Cube deployment (a 190-second blocked-agent heartbeat survival test, cancellation and timeout checks, idempotent-destroy checks) and zero `govulncheck` findings.

## 4. UX

CLI-first and CLI-only for action: `factory run/status/logs/review/attach/preview/cancel/halt/threats`. A read-only React and Vite web UI (`internal/controlplane/web`, inherited and extended from Machinist) shows Runs, Changes, a task detail view (`TaskDetail`, `ExecutionDetails`, `RunMetric`) and lets a user download a patch, but it cannot approve, reject, or intervene. Approval is CLI-only (`factory review --approve/--reject`), even though a web UI exists to look at the evidence.

Zero to first result is short: `make factory-worker` then `make factory-run-demo` (the documented Phase 1 acceptance test), or directly `./bin/factory run --repo <url> --rev <sha> --task "<text>" --agent opencode2 --verification default`. The command prints the run id and workflow id immediately, then on completion four result lines (`FACTORY RESULT`, `AGENT RESULT`, `VERIFICATION`, `CLEANUP`) and the patch path. That is two commands to a first result, using the public demo repository.

While the agent works there is no live stream in any interface found. The documented way to watch a run is polling: `factory status <run-id>` and `factory logs <run-id>`. Intervention while running uses `factory attach` and `factory preview`, both described as default-closed and audited. Cancellation uses `factory cancel` or `factory halt --harness/--scope/--repo`, halt being dry-run by default.

No screenshots, demo GIFs or screen captures exist anywhere in the repository; a `find` for png/gif/jpg outside `node_modules` and the built `dist/` turned up nothing. The UI is documented only in prose and in component tests (`*.test.js` files alongside each `.jsx` component).

Compared with our own console: theirs has no kanban board, no cost view, and no login flow (loopback-only, implying a trusted network rather than per-user auth). Ours is, by our own admission, "functional, not designed," but it at least puts approvals and cost on the same surface a user watches. ESF splits watching (web) from acting (CLI) completely, which is a real UX gap against the effort spent everywhere else in the project.

## 5. Security, identity, sandbox, policy, cost

Identity is the weakest area. There is no per-task identity of any kind. Model credentials are static, operator-provisioned named references (`{env:NAME}` resolved through a `pass_env` allowlist) that are never rotated or scoped to a single run; the actual secret value never enters the sandbox, but that indirection is the only credential control present. `docs/adr/0006-control-plane-security-boundary.md` lists OIDC, RBAC, and Vault-based short-lived leases explicitly as future work, i.e. the project's own authors know they do not yet have task-scoped ephemeral identity.

The sandbox is a genuine strength. CubeSandbox gives each task its own kernel via KVM, not a shared-kernel container. `Destroy` runs on a disconnected context on every exit path, including cancellation, and is idempotent. `Spec.Network` can only ever be narrowed from the deployment default, never widened by a task. Before the agent runs, `ApplyRuntimeNetwork` executes a measured egress probe (a public canary, the cloud metadata endpoint, and a uid check) and sets `EGRESS_UNVERIFIED` on failure, gated behind an explicit `acknowledge_open_egress` operator flag. This whole control (`docs/adr/0007-defense-in-depth.md`) is motivated by a cited, real July 2026 incident in which sandboxed agents reached the public internet through a shared internal package service and escalated credentials across a production cluster, undetected for 11 days.

Policy sits in code, not prompts, where it can: the harness `Registry` resolves by name only, the repository provider validates a URL allowlist and rejects embedded credentials before any sandbox exists, and `verification.Profile` is a frozen, validated set of steps. `threatmon`'s 40 regexp rules and `CheckGateIntegrity`'s git-blob comparison (deliberately not diff-based, to survive `git update-index --assume-unchanged` and commit-the-tamper evasions) add code-level detection on top of the access controls.

Cost control does not function as a control. `BudgetConfig.Exceeded(costUSD, tokens, elapsed)` (`internal/factory/resources.go:195,224`) runs after the fact, purely from harness-self-reported usage, to set a `ConditionBudgetExceeded` field on the manifest. Nothing holds or blocks spend before or during a run. The project's own ADR 0007 "alternatives considered" table says this outright: "Make budgets the containment control | Budgets are recorded from harness self-report and no harness populates them; they are evidence, not enforcement."

Git credentials for repository access have no implementation at all for the common case. `prepareRemote` runs a plain `git clone --no-tags --recurse-submodules <url> <dest>` with no auth of any kind, and `validate.go` actively rejects a URL that embeds credentials. As shipped, an authenticated remote clone inside the sandbox is not possible; the only documented path for private code is `SourceLocal`, which bundles a repository on the operator's own host (where the operator's own git credentials already work) and pushes the bundle bytes, not any credential, into the sandbox. That keeps their "no credential enters the sandbox" principle intact, but it means remote private-repository support is, in practice, not built.

## 6. What we should take from it

Narrow, this month: `CheckGateIntegrity`'s git-blob comparison is a small, self-contained mechanism we can add directly to our own gate and policy-file protection, and it closes a real evasion class (assume-unchanged, commit-the-tamper) that a plain diff check would miss. The pre-run egress probe (public canary, cloud metadata endpoint, uid check) is similarly small and would turn our static NetworkPolicy default-deny into a measured, evidenced property instead of an assumed one. `threatmon`'s pattern of one regexp rule per line with an inline false-positive and false-negative note is a cheap, auditable design we could copy as a first detector layer ahead of our existing stall/flip-flop supervisor triggers, rather than inventing our own rule format.

Broad: the QMS/assurance R0 to R4 risk-class schema and its four gate contract types (verification, independent-review, provider-snapshot, provider-ack) is a more worked-out version of our own "path risk classes" idea and worth adopting as vocabulary even before any code is shared. The `BLOCKED` first-class outcome, written by the agent itself rather than inferred from a timeout, is a genuinely good product idea: it turns "the agent gave up" into a normal, evidenced state instead of a failure to be argued about, and is framed explicitly as removing the pressure that causes out-of-bounds probing. Finally, the discipline of keeping "gates passed" and "change accepted" as two separate, independently recorded facts (a human `REJECTED` does not erase a recorded verification `SUCCESS`) is a state-modelling habit our own approval schema should keep just as strictly.

## 7. Where our philosophy differs and what that costs or buys us

ESF's decision to have no merge-and-deploy plane at all is not a mistake to copy from, it is a scope boundary. It buys them a smaller, more finishable MVP; it costs the entire "largely autonomous" property, since a human or a separate pipeline must always take the last step. Our constraint of full autonomy to deploy means we cannot borrow this shortcut.

The same applies to signals intake: ESF accepts work only by direct CLI invocation. That trades away exactly the property our own vision states as central, that work comes to the factory from issues, alerts, and telemetry rather than being handed to it. Adopting their pattern would cost us the point of the project, not just a feature.

Cost-as-evidence-not-enforcement is a real philosophy difference, not an oversight on their part; their own ADR names it as a deliberate trade for now. Our constraint 4 ("security without half measures... spending has hard caps") makes this pattern a non-starter for us regardless of how much simpler it is to implement.

Their single-dedicated-host worker plane (or a shared filesystem across a few hosts) is a legitimate, cheaper operational shape for a one-person project, and it is arguably a better fit than Kubernetes for a maintainer with no ops team. It costs them the elastic, quota-scoped, per-task namespace isolation our Kubernetes substrate gives us close to free, and it does not fit our own "Kubernetes is the substrate, not the orchestrator" baseline, so it is a place where their answer is genuinely better for their situation and worse for ours.

## 8. Red flags and slop assessment

The code itself looks real: 33,381 non-test Go lines against 20,019 test Go lines across 76 test files, a CI matrix with `gitleaks`, SBOM generation and validation, `npm audit`, `govulncheck`, `gofmt`, `go vet` and race-enabled tests, and a `docs/production-readiness.md` self-review naming eight specific bugs found and fixed (unheartbeated timeout, patch-collection-fails-but-reports-success, leaked-sandbox-with-success-verdict, and five more) with the reasoning behind each fix. One release candidate (RC1) was blocked from promotion by the project's own SBOM-attestation gate, which is a real gate catching a real problem, not decoration.

It is nonetheless a one-person project. All 20 commits and every substantive pull request (#4, #8 to #13, #17 to #20, #23) are from mitkox; the only other contributor is dependabot. The two pull requests from an external human ("mairp", #21 and #22) are both still open and unmerged. Several GitHub forks exist (`beyhanmeyrali/esf`, `hah23255/esf`, `Appesteijn/esf`, `mairp/esf`) but all read as plain copies rather than active downstream work.

The timeline is aggressive: the repository was created 2026-09-19, and v0.5.0-rc.2, v0.5.0-rc.3 and the v0.5.0 GA tag all landed within about 48 hours on 2026-09-27, eight days after creation. The project's own deployment guide contradicts the "GA" label: "no production deployment is qualified by the release," and the production-readiness self-review lists an unrun restore drill, an unrun load test at intended concurrency, and untested rolling-upgrade replay compatibility as open gaps. That is honest disclosure, which counts in the project's favour, but it means the "mature" side of this report's `maturity` field describes code discipline, not operational proof.

No independent validation exists. WebSearch found no Hacker News or Reddit discussion of the project, and no independent review. 175 stars and 30 forks after ten days is a respectable amount of attention but is not evidence of production use anywhere outside the author's own testing. The foundational sandbox dependency, CubeSandbox, is itself only five months old (created 2026-04-10), though it is large for the recent wave of AI-sandboxing tools (12,751 stars, a CNCF landscape listing, Apache-2.0, E2B-API-compatible) and was pushed as recently as the day before this research. No funding, company, or paying user was found behind either project.

Verdict: not slop, but not proven either. It is a genuinely engineered, unusually well-tested and well-documented solo effort, ten days old, with no merged outside contribution and an explicit self-admission that it is not yet production-ready.

## 9. Sources

- https://github.com/mitkox/esf (gh api repos/mitkox/esf, gh api repos/mitkox/esf/commits, gh api repos/mitkox/esf/pulls, gh api repos/mitkox/esf/releases, gh api users/mitkox), fetched 2026-09-29
- https://github.com/TencentCloud/CubeSandbox (gh api repos/TencentCloud/CubeSandbox, gh api repos/TencentCloud/CubeSandbox/license, gh api repos/TencentCloud/CubeSandbox/readme), fetched 2026-09-29
- https://mitkox.com, fetched via WebFetch 2026-09-29, no ESF content found
- WebSearch for Hacker News, Reddit, and independent review discussion of ESF and mitkox/esf, 2026-09-29, no results found
- Clone: ~/repos/market-research-clones/esf (git clone --depth 1), single commit visible locally, author Mitko Vasilev, 2026-09-28
- README.md
- docs/FACTORY.md
- docs/upstream.md
- docs/operator-guide.md (through the artifact-layout and cancellation sections)
- docs/production-readiness.md
- docs/production-deployment.md
- docs/quality-gates-and-providers.md (schema section)
- docs/quality-operations.md (referenced from SECURITY.md)
- docs/issue-triage-demo.md
- docs/vm-deployment.md (SSH/deploy-key section)
- docs/architecture/current-state.md
- docs/architecture/target-state.md (shape diagram)
- docs/backlog/phase-2.md
- docs/adr/0001-use-cubesandbox-as-execution-fabric.md
- docs/adr/0002-use-temporal-for-durable-workflows.md
- docs/adr/0006-control-plane-security-boundary.md
- docs/adr/0007-defense-in-depth.md
- CONTRIBUTING.md
- SECURITY.md
- go.mod
- .github/workflows/ci.yml
- internal/factory/workflow.go
- internal/factory/resources.go (BudgetConfig, Exceeded)
- internal/factory/config.go (Budgets, Scopes)
- internal/factory/redact.go (Redactor)
- internal/factory/audit.go
- internal/agentharness/harness.go
- internal/sandbox/cube/provider.go
- internal/verification/run.go
- internal/repository/provider.go (full)
- internal/repository/validate.go (full)
- internal/threatmon/rules.go
- internal/notify/notify.go
- internal/controlplane/web (factory-page.jsx, task-detail.jsx, directory listing)
- deploy/helm/esf/Chart.yaml, deploy/ directory listing
- examples/workflows/gvisor-pr/Dockerfile
