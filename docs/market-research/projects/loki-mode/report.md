---
name: Loki Mode
slug: loki-mode
url: https://www.autonomi.dev/
repo: https://github.com/asklokesh/loki-mode
category: factory-orchestrator
license: BUSL-1.1
open_source: partial
self_hostable: yes
hosting_model: self-hosted CLI, Docker image or Helm chart on your own infra by default; commercial hosted tiers (Autonomi Cloud, Autonomi Enterprise) sold separately, not documented publicly
company: Autonomi, Inc. (autonomi.dev), founder-run by Lokesh (GitHub asklokesh), no disclosed funding, HQ or team size, repo created 2025-12-26
maturity: 1073 stars, 206 forks, 15 open issues, 3699 commits (one account, asklokesh, holds 3669 of them; a "claude" account holds 12), first commit 2025-12-26, last commit 2026-09-28, 803 npm releases since 2026-01-24, several releases per day at times
similarity: 3
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 1
  verification: 4
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 2
  ux: 4
  reseedable_selfhost: 2
steal:
  - The Evidence Receipt's split between deterministic FACTS (diff base/head SHA, diff_sha256, test/build exit codes, gate verdicts) and labelled AI ASSESSMENTS (council verdict), with a headline computed only from facts (autonomy/lib/proof-generator.py, function _compute_headline). We compute similar facts but never bundle them into one portable, re-hashable file a reviewer can carry off our infrastructure.
  - The command loki proof verify re-derives the diff from the recorded base SHA and recomputes the integrity hash, so tamper and drift are two independent, offline, non-LLM checks (autonomy/lib/proof-verify.py). Worth copying as a standalone script over our own timeline records.
  - The receiver-signed Ed25519 JWT attestation for remote builds, with keys published unauthenticated at /.well-known/jwks.json and a kid-based rotation list for retired keys (docs/SIGNED-RECEIPTS.md). A clean, low-dependency pattern for letting an outside auditor verify anything our factory-gateway emits without an account or API key.
  - Four-state verification outcomes that are never collapsed into each other, VERIFIED, FAILED, ABSENT (no attestation present) and NOT CHECKED (verifier could not run). Our own alert-verdict and gate-supervision language could borrow this precision.
  - The command loki doctor --airgap names every host the engine will contact before you write a NetworkPolicy. Worth doing for our own project onboarding, list every egress target a new project's sandbox will need before the Cilium policy is authored.
  - The cost and time quote before any spend, in "loki quickstart --dry-run --json", bound to the exact input by a SHA-256 digest so a stale preview cannot silently authorise a different build. A pattern for our own gateway's cost hold, quote first, bind the quote to specifics, then charge.
  - docs/EVALUATING.md puts one runnable command next to every marketing claim and states outright what is not true yet (no independent benchmark placement, generation is not air-gapped). Worth stealing as a format for any comparison page we publish about our own factory.
differs:
  - Their default trust boundary is the opposite of ours. The agent process holds real provider credentials directly (ANTHROPIC_API_KEY, or a Claude Code session in the same process), and the shipped Helm chart's NetworkPolicy is disabled by default with a default egress of an empty list, which the chart's own comment says means allow-all "because the engine must reach a hosted provider API" (deploy/helm/autonomi/values.yaml, around line 519). Adopting that default would break our "policy lives outside the model" and "identity belongs to the task" principles outright.
  - The unsigned Evidence Receipt is honestly forgeable by its own generator (generator_trusted is true on the default path), and only an opt-in GPG or Ed25519 layer closes that gap (docs/SIGNED-RECEIPTS.md). Our audit rows are written by the gateway under its own authority regardless of what the agent does, a stronger default root of trust; copying their weaker default to gain portability would cost us that property.
  - Coordination runs through .loki/ files on one machine or one Kubernetes Job (ARCHITECTURE.md calls this "filesystem as the system bus"), not a durable multi-tenant workflow engine. It is simple and resumable for one build, but has no equivalent of our per-task namespace, ServiceAccount or cross-project scheduler; retrofitting concurrent multi-tenant approval state onto a filesystem bus would be a rewrite of the coordination model, not an added feature.
ux_verdict: One command (loki quickstart) gets a running sample app in minutes with a cost quote shown before any spend, and the CLI surface is far richer than our console for a single developer on a single repo, but there is no multi-project, multi-user, approval-queue view of the kind our console exists to provide.
slop_verdict: Real and used in anger by its own author (803 npm releases and thousands of commits in nine months, working signed-receipt and forgery-defense tests, an unusually honest limitations doc), but the marketing has outrun the code before, a January 2026 Hacker News post claimed 99.67% on SWE-Bench with no independent verification and drew no outside engagement, and the changelog for 2026-09-28 admits a release gate shipped broken the day before this research.
---

# Loki Mode

## 1. What it is

Loki Mode is a CLI-first autonomous coding agent built by Autonomi, a one-person-plus-AI-commits operation run by Lokesh (GitHub asklokesh). It takes a spec (a PRD, a GitHub issue, an OpenAPI, JSON or YAML document, or a one-line brief), drives an existing coding agent CLI (Claude Code, OpenAI Codex CLI, Cline or Aider) through an iterative "RARV" loop (Reason, Act, Reflect, Verify) with a closure stage, runs eight deterministic quality gates plus a blind three-reviewer model council, and opens a pull request carrying an "Evidence Receipt": a JSON and HTML artifact that states what was proven and what was not. It is sold as free-to-use, source-available software under the BUSL-1.1 licence, with paid "Autonomi Cloud" and "Autonomi Enterprise" editions mentioned but not documented on the public site.

The README's central claim is "don't trust the agent, check it": every run's completion claim is backed by a file a third party can re-verify offline, rather than a transcript. The repository substantiates the mechanical half of that claim well: the receipt generator, the tamper and drift verifier, the GPG and Ed25519 signing paths, and a forgery-defense test suite (tests/test-proof-forgery-defense.sh) all exist and reason about their own honesty in comments. What the docs claim about production usage, benchmark placement and enterprise features is thinner: no case studies, no independently reproduced benchmark, and a self-authored docs/EVALUATING.md that explicitly disclaims exactly those things.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | loki start takes a GitHub issue, a PRD file, an OpenAPI, JSON or YAML spec, or a one-line brief; autonomy/trigger-server.py also accepts GitHub webhooks (issues, PR, workflow_run) and an authenticated remote-submit API | Every task is a Forgejo issue; webhooks, SigNoz alerts and factoryd's intake API all funnel into one issue-shaped record | not comparable, they accept richer spec formats per run, we normalise every source to one issue shape and add telemetry alerts |
| Control plane | Run state lives in .loki/ files on the run's own filesystem (session, queue, checkpoints, memory); a separate REST API (api/, web-app/) adds tenant auth, roles and an audit log for the dashboard, but is not the thing that drives a run | factoryd with one Temporal workflow per task, Postgres task registry, capability policy, budgets and approvals as first-class state | we lead, theirs has no durable, queryable task registry with approval-as-workflow-state across many concurrent runs |
| Worker plane | The RARV loop runs in the same process as the CLI invocation, on your machine, your CI runner, or optionally one Kubernetes Job per build (deploy/helm/autonomi/templates, worker mode job) | One gVisor pod per task, its own namespace and ServiceAccount, read-only root filesystem, default-deny egress | we lead, their default has no sandbox and no egress control; the optional Job mode sets runAsNonRoot true and drops capabilities, but ships readOnlyRootFilesystem false and networkPolicy disabled |
| Verification | Eight deterministic quality gates, a blind three-reviewer council, a completion council, and the Evidence Receipt with a facts-only headline; loki verify runs the same gates standalone against any diff | Forgejo Actions on untrusted gVisor runners, then policy gates, then a stronger-model review with a strict verdict | they lead, the receipt is a portable, independently re-checkable artifact; we have no equivalent artifact today, only API-served timeline records |
| Merge and deploy | "Proven PR", the receipt summary is written into the PR body by default; an optional, non-blocking GitHub status check can be promoted to a required check in branch protection | Merge by bot factory-merge only after a whitelisted human approves, or an auto rule for reproduced, strictly-improving changes; Flux deploys and rolls with an alert-free wait | we lead, their gate is opt-in and advisory unless the user wires branch protection themselves; ours is a first-class workflow step |
| Policy outside the model | RBAC on the dashboard and API (docs/enterprise/security.md, admin, operator, viewer, auditor); path traversal guards in the MCP server (mcp/server.py, validate_path); a host command guard hook required for non-Claude providers; the receipt headline is computed by non-LLM code, never by model self-report | Capability policy is a YAML document in Git, enforced by the gateway; a prompt cannot grant a capability | we lead, their capability boundary for what the agent itself can touch is mostly whatever the underlying provider CLI's own permission hooks allow, not a project-specific enforcement layer |
| Identity per task | The agent process holds real provider credentials directly (env vars, or the shipped Claude Agent SDK); the Kubernetes worker pulls a static Secret into env, not a short-lived scoped token | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task; the sandbox holds no key material | we lead, clearly, this is the sharpest philosophical difference between the two projects |
| Artifacts not chat | .loki/ state files, a normalised event bus (events/), and the Evidence Receipt are the artifacts; a git diff is ground truth | TaskBrief in, a branch, PR and event stream out; git is the coordination mechanism | equal, both treat the filesystem and git as the source of truth over conversational transcripts |

## 3. Architecture and stack

Two parallel orchestration engines share one state contract: a TypeScript runner (loki-ts/src/runner/autonomous.ts, Bun-based, default since v7.4.x) and a legacy Bash engine (autonomy/run.sh, 29,513 lines) kept as a byte-identical fallback (LOKI_LEGACY_BASH=1). The CLI dispatcher (autonomy/loki) is itself 37,789 lines of Bash. Total hand-written source across .sh, .py and .ts files (excluding dist/ and node_modules/) is roughly 124,000 lines, with 1,043 test files under tests/ and 778 under loki-ts/tests/.

Providers are pluggable behind loki-ts/src/runner/providers.ts and providers/*.sh: Claude Code is "Tier 1" (full features, subagents, parallel worktrees, MCP), Cline is "Tier 2", Codex CLI and Aider are "Tier 3, degraded" (sequential only). Model tiering inside a run maps RARV phases to model strength (Opus for planning, Sonnet for development, Haiku for cheap parallel work, per ARCHITECTURE.md), with a "Fable" tier lever present in code but collapsing to Opus because that model is not yet available at the API (README, "Mid-flight model switching").

The MCP server (mcp/server.py, FastMCP-based) exposes 36 tools including a ChromaDB-backed semantic code search (loki_code_search) and cross-project memory (memory/engine.py: episodic, semantic and procedural with vector search). A REST API (api/) and two separate UI codebases coexist: a Python-served dashboard (dashboard/, dashboard-ui/) and a newer web-app/ with its own migrations directory, which the enterprise docs describe as a "v2 API" layered alongside the v1. Deployment options are a global npm, Bun or Homebrew install, a Docker image, or a Helm chart (deploy/helm/autonomi) with job, deployment and serverless (KEDA) worker modes.

The receipt pipeline is Python: autonomy/lib/proof-generator.py (2,265 lines) assembles proof.json from .loki/ state, runs a redaction pass exactly once, computes an integrity hash, and optionally a detached GPG signature over the canonical bytes; autonomy/lib/proof-verify.py (1,067 lines) re-derives the diff and hash independently. vendor/autonomi-verify/ ships a small embeddable JS widget for showing a receipt on a web page.

## 4. UX

Zero to first result is one command: loki quickstart asks a one-line idea, picks a template, shows a cost and time estimate, and builds a sample app on Enter. A non-interactive form exists for CI (loki quickstart "idea" --yes), and a --dry-run --json path returns a schema-versioned preview with no spend and no writes. npx loki-mode tour prints a real historical receipt with no install, no key and no network at all, which is an effective zero-risk demo.

While a build runs, a local dashboard (dashboard/, opened automatically in a foreground terminal run) shows active agents with model badges and a task kanban (queued, in progress, completed, failed), and a "Live App Preview" embeds the running app in an iframe so the user can click around mid-build. docs/screenshots/dashboard-agents.png and dashboard-tasks.png exist as real 70KB and 54KB PNGs but are not currently linked from the README; the directory's own README.md is a stale checklist ("Not yet created") left over from before the images were added, a small documentation-hygiene miss rather than a functional one.

Interfaces on offer: a CLI (primary), a VS Code extension (vscode-extension/), a Claude Code plugin adding three slash commands (/loki-grill, /loki-spec-status, /loki-verify), an MCP server, a Python and TypeScript SDK (sdk/), and a REST API. There is no equivalent of our multi-project, multi-user console: everything is scoped to one developer running one build against one repository at a time. Mid-build human intervention is model switching from the dashboard and a review-before-publish two-step (loki start --prepare-pr then loki ship --publish); there is no approval queue or human-lane concept.

## 5. Security, identity, sandbox, policy, cost

Identity: no per-task credential brokering. The agent process itself holds whatever provider key or Claude Code session the user configured (ANTHROPIC_API_KEY, or the bundled Claude Agent SDK). In the Kubernetes worker mode, secrets are a static Secret mounted into the Job's environment, not a short-lived, audience-scoped token. The one exception carved out deliberately is the receipt-signing key: the Helm chart mounts it only into the receiver, never the worker, "because a worker runs model-directed code, a key there would let a build sign its own receipt" (docs/SIGNED-RECEIPTS.md).

Sandbox: none by default. The CLI runs directly on the user's machine or CI runner with full filesystem access to the target repository. The optional Helm worker Job sets runAsNonRoot true and drops all Linux capabilities, but ships readOnlyRootFilesystem false and networkPolicy disabled with a documented default egress of "allow-all" (deploy/helm/autonomi/values.yaml, around line 519). This is a stated, deliberate choice, not an oversight: the chart comment says blocking egress by default "would leave every new install unable to run a build with no obvious cause."

Policy in code: RBAC for the dashboard and API is enforced in Python (docs/enterprise/security.md), with OIDC claims mapped to four fixed roles and a documented refusal to default to admin. MCP tool file access goes through validate_path and safe_open guards against path traversal (mcp/server.py, around lines 161 to 300). Providers other than Claude require an "enforced PreToolUse hook" or resolveProvider throws. Completion is judged by non-LLM code reading facts, never by the model's own claim.

Cost: loki quickstart and loki demo quote cost and time before spending anything, bound to the exact input by digest. LOKI_MAX_BUDGET_USD and --max-budget-usd are forwarded to the underlying provider CLI's own budget flag, and the run's actual cost is recorded in the receipt. This is a self-reported, in-process cap, not a separately-authorised hard stop: there is no external gateway that holds funds under a database lock before a call is made, the way ours does.

## 6. What we should take from it

Narrow: the Evidence Receipt's facts and assessments split and facts-only headline computation (function _compute_headline, autonomy/lib/proof-generator.py, around line 1697) is a small, copyable piece of logic we could bolt onto our existing timeline record: compute a diff hash and a headline from deterministic facts only, and never let the model-review verdict alone turn the badge green. The tamper and drift re-derivation in proof-verify.py is a standalone script we could imitate directly against our own S3 timeline. The Ed25519-JWT-plus-JWKS attestation pattern for the "remote" path is a clean, small dependency footprint for letting an outsider verify a factory-gateway-issued artifact without touching our infrastructure.

Broad: the single largest gap between "the README says" and "the code does" that we should worry about in ourselves is the opposite of theirs: they are explicit that generation is not air-gapped and the unsigned receipt trusts its own generator, and they say so loudly in their own docs. That discipline of stating the limitation next to the claim (docs/EVALUATING.md, docs/SIGNED-RECEIPTS.md) is worth adopting as a habit for our own target-architecture.md and any external-facing comparison page: name what is not proven, not just what is.

## 7. Where our philosophy differs and what that costs or buys us

Their core trust model is "your machine, your keys, your infrastructure": no sandbox, no egress control, and the agent process holds real credentials by default. That buys them something real, a near-zero-friction local onboarding (npx loki-mode tour needs nothing at all, and loki quickstart needs only a key). It costs them exactly what our "identity belongs to the task" and "policy lives outside the model" principles exist to prevent: an agent that is compromised, or a prompt-injected task, can reach the network and act with the operator's own long-lived key. We could not adopt their default without giving up a constraint we hold as non-negotiable ("security without half measures").

Their unsigned Evidence Receipt trusts its own generator; ours does not need to make that trade because our audit rows are written by factory-gateway under its own authority, independent of anything the agent claims. Copying their receipt format for portability is safe; copying their default trust level for it would not be.

Their coordination substrate (files on one machine, one Kubernetes Job per build) is simpler than Temporal and genuinely resumable for a single build, but has no answer for our multi-tenant, multi-project, many-concurrent-tasks requirement. That is a difference of problem scope, not just design taste: they are building a tool one developer points at one repo, we are building a control plane for many tasks across many projects with humans in an approval lane. Retrofitting their model to our scope would mean building most of what factoryd already does.

## 8. Red flags and slop assessment

Real usage, single-author concentration: 3,699 commits since 2025-12-26, of which 3,669 are attributed to one GitHub account (asklokesh); a "claude" account holds 12 more, github-actions[bot] 11, and four other accounts hold one commit each. 803 npm package versions have been published since 2026-01-24, several per day at times, which points to a largely automated, self-hosted release process rather than a team reviewing each release. 15,654 npm downloads in the last 30 days is real but modest usage.

Marketing has outrun the code before, and the project has walked it back in public: a January 2026 "Show HN" post claimed 99.67% on SWE-Bench (versus a stated 70 to 80 percent for the best proprietary systems); the thread drew 2 points and no outside comments, only the author's own replies, and the current repository carries no result file supporting that number. The current benchmark data (benchmarks/swebench/pinned-subset.json) is far more careful: it explicitly marks its SWE-bench instance IDs as an unverified split and states "Loki never grades itself." Separately, the README documents that the project's own earlier "non-forgeable" claim about the unsigned receipt was found false and removed in v7.111.0, with the forgery case locked into a test (tests/test-proof-forgery-defense.sh) rather than hidden. Read together, this is a project that oversold early and now visibly over-corrects toward disclosed limitations, which is a better trajectory than the reverse but still means historical claims outside the repository need independent checking.

Maintenance churn as a real signal: the changelog for 2026-09-28 records that v10.5.4 "never reached npm because its release gate ran the v10 Wall tests without pytest", fixed same-day in v10.5.5. Five patch releases landed on a single day. Two independent UI codebases (dashboard/ plus dashboard-ui/ and a separately-migrated web-app/) coexist, and two full orchestration engines (loki-ts/ and autonomy/run.sh) are maintained in parallel "byte identical" by policy. This is a lot of surface for one dominant maintainer to carry.

Licence: BUSL-1.1, not OSI open source. GitHub's own licence detector reports the licence as unrecognised (spdx_id NOASSERTION) for the repository, consistent with the customised Additional Use Grant. COMMERCIAL-TERMS.md defines "compete" broadly: it forbids building "multi-agent AI development orchestration platforms or frameworks" or anything that "substantially replicates" the RARV cycle or the "Completion Council" review system as a competing commercial product or service, and requires a signed CLA for any external contribution to be relicensable. The Change Date is 2030-03-19, after which the code becomes Apache-2.0. Practically, this project itself (an autonomous software factory) is arguably exactly the kind of product this clause is written to prevent someone else from launching commercially on top of Loki Mode's code, worth flagging since our own project is in the same category, though as a from-scratch reimplementation, not a fork.

## 9. Sources

https://github.com/asklokesh/loki-mode (cloned 2026-09-29, shallow, HEAD at 2026-09-28)
https://www.autonomi.dev/ (fetched 2026-09-29, minimal content: title and tagline only)
gh api repos/asklokesh/loki-mode (2026-09-29)
gh api repos/asklokesh/loki-mode/contributors (2026-09-29)
gh api repos/asklokesh/loki-mode/commits pagination header (2026-09-29)
https://registry.npmjs.org/loki-mode (2026-09-29)
https://api.npmjs.org/downloads/point/last-month/loki-mode (2026-09-29)
https://news.ycombinator.com/item?id=46528155 "Show HN: Loki Mode hit 99.67% SWE-Bench" (2026-09-29)
https://news.ycombinator.com/item?id=46393705 "Show HN: Loki Mode, 37 AI agents that autonomously build your startup" (2026-09-29)
https://news.ycombinator.com/item?id=46761485 "Loki Mode: Autonomous System for Claude, Codex and Gemini CLI" (2026-09-29)
README.md
ARCHITECTURE.md
CONTRIBUTING.md
LICENSE
COMMERCIAL-TERMS.md
CHANGELOG.md
docs/EVALUATING.md
docs/SIGNED-RECEIPTS.md
docs/enterprise/security.md
docs/enterprise/migration.md
docs/architecture/STATE-MACHINES.md
docs/screenshots/README.md
autonomy/lib/proof-generator.py
autonomy/lib/proof-verify.py
autonomy/trigger-server.py
autonomy/run.sh (size and structure only)
autonomy/loki (size only)
loki-ts/src/runner/providers.ts
mcp/server.py
deploy/helm/autonomi/values.yaml
deploy/docker-compose/docker-compose.yml (listing only)
benchmarks/swebench/pinned-subset.json
benchmarks/results/humaneval-loki-results.json
benchmarks/results/ (directory listing)
package.json
vendor/autonomi-verify/ (listing)
schemas/ (listing)
