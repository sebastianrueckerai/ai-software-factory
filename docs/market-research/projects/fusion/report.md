---
name: Fusion
slug: fusion
url: https://runfusion.ai
repo: https://github.com/Runfusion/Fusion
category: factory-orchestrator
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, no hosted SaaS offering found (npm, curl installer, Homebrew, Docker)
company: No registered company found. GitHub org Runfusion, copyright "Fusion Contributors", dominant author gsxdsm (npm and commit history), no funding disclosed
maturity: 1249 stars, 158 forks, 34 GitHub contributors (one author holds most commits), first commit 2026-04-13, last commit 2026-09-29, releases roughly weekly (v0.30 to v0.78 in five months)
similarity: 3
axes:
  signals_intake: 4
  control_plane: 2
  sandbox_isolation: 1
  verification: 3
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 2
  ux: 5
  reseedable_selfhost: 3
steal:
  - PROMPT.md as one committed markdown artifact per task, holding plan steps, file scope and acceptance criteria together, so plan and acceptance criteria are not two separate systems.
  - A structured JSON reviewer verdict contract (verdict field APPROVE, APPROVE_WITH_NOTES or REVISE, plus a notes field) with a documented prose-fallback parser and an explicit "malformed" classification, so a review is a machine-actionable gate, not free text a human has to read to find the answer.
  - Review depth that scales with a task complexity rating: light checks for trivial tasks, multi-pass review for complex ones, so review cost tracks task risk instead of a flat policy.
  - Scope-checked revision routing: a REVISE that stays in scope goes back into the same PROMPT.md revision section, a REVISE that finds an out-of-scope problem forks a new follow-up task instead of growing the current one.
  - Per-lane model routing (separate provider and model choice for the executor, planner, validator, merger and two summarisation lanes) with an explicit override precedence of task, then project, then global lane, then default.
  - GitHub, GitLab and Linear issue import plus GitHub tracking issues as one pattern for multi-forge intake, directly against our own "one forge only" gap.
differs:
  - Fusion's default worker isolation is a git worktree on the operator's own machine with no OS sandbox at all; real sandboxing (Linux bubblewrap, macOS Seatbelt) is opt-in and the docs call it experimental. Our constraint treats the sandbox as the one thing that is never optional, so we cannot adopt this default without breaking "security without half measures".
  - Fusion's secret-access tool (fn_secret_get) can place a plaintext secret value directly into the model's own context on an "auto" or approved "prompt" policy. Our identity-per-task principle is built to make that specific thing impossible, the agent gets a capability through the gateway, never the raw key. Copying their convenience here means giving up our stated principle, not a neutral trade.
  - Fusion's own strategy document frames the product as one solo developer's mesh across their own laptop, Mac mini, server and phone, not a multi-tenant enterprise control plane. Several of its conveniences (a single shared secrets store, a single planner-oversight setting) assume one trusted operator and would need re-checking before they would be safe in a multi-project, multi-tenant setting like ours.
ux_verdict: A real kanban board, a live Command Center dashboard and native desktop and mobile apps make watching and approving an agent's work several steps easier than our server-rendered console, which by our own admission has no real-time streams, no diff view and no mobile view.
slop_verdict: Real and heavily used by its own author, roughly 14,000 commits and over 3,000 test files in five months, weekly releases, and one independent source-level audit that mostly corroborates the docs. The same evidence also shows one person shipping very fast with light review, and the architecture doc's long list of narrow race-condition postmortems reads more like continuous firefighting than settled design.
---

# Fusion

## 1. What it is

Fusion is an open-source, self-hosted tool that turns a plain-language task description into a planned, executed and reviewed code change, running one or more coding agents per task in an isolated git worktree, with a human approval gate wherever the operator wants one. It ships as a CLI, a web dashboard, an Electron desktop app and a Capacitor mobile app, all able to sync state across a user's own machines (laptop, Mac mini, server, cloud VM, phone). It is MIT licensed, distributed through npm, a curl installer and Homebrew, with no paid tier, no hosted SaaS, and no disclosed company or funding behind it.

The README pitches it as "Your Software Factory" with an assembly-line framing: tasks, agents, missions, git, files and worktrees, any model, local or cloud. The project's own internal strategy document (STRATEGY.md) describes a narrower and more concrete target user: "a solo developer juggling 10 Claude Code terminals and 5 Codex terminals." The repository and docs back the narrower claim. There is no multi-tenant account model, no organisation-level billing, and the security model (see section 5) assumes one trusted operator, not an enterprise with many users and many projects.

Fusion is built on top of Pi (pi.dev) as a plugin runtime and integrates Hermes (Nous Research) and Paperclip as agent providers and agent-team formats. The npm package author is the GitHub handle gsxdsm, who holds the large majority of commits; the README credits prior work from dustinbyrne/kb as a starting point.

## 2. Mapping to our five planes

| Plane / principle | What Fusion does | What we do | Verdict |
|---|---|---|---|
| Signals | Manual task creation in natural language, GitHub, GitLab and Linear issue import, GitHub tracking issues. No telemetry or alert-triggered intake. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API, one forge only. | They lead |
| Control plane | Task lifecycle state machine (planning, todo, in-progress, in-review, done), PostgreSQL storage, ApprovalRequestStore, audit events, taskTokenBudget soft and hard caps, Command Center cost dashboard. | factoryd with a Temporal workflow per task, Postgres, capability policy as a YAML file in Git applied by Flux, budgets with real holds under a database lock, cost ledger. | We lead |
| Worker plane | One git worktree per task (fusion/{task-id} branch), default backend "native" (unsandboxed), opt-in experimental bubblewrap (Linux) or Seatbelt (macOS), a dozen runtime plugins (Claude, Cursor, Droid, Grok, Hermes, OpenClaw, antigravity, omp, acp). | One Kubernetes namespace, ServiceAccount and gVisor pod per task, read-only root filesystem, non-root, default-deny egress, one harness (opencode) behind a Go interface. | We lead |
| Verification | An independent reviewer agent with read-only access runs after each execution step, returns a structured verdict, review depth scales with task complexity, quality gates (docs, QA, security, performance, accessibility) run before merge, auto-merge when gates pass. | Forgejo Actions on untrusted gVisor runners, policy gates (path risk class, migration flag, reproduction gate at base and head), then a stronger-model review with a strict verdict. | Equal |
| Merge and deploy | fn task pr-create, mergeStrategy of direct squash or pull request, human confirmation always required for merge, PR and destructive actions regardless of planner-oversight level. | Bot merge only after a whitelisted human approves, or an auto rule for normal-risk reproduced strictly-improving changes, Flux GitOps deploy, staged rollout with a 15-minute alert-free wait. | We lead |
| Policy outside the model | Secret access policy (auto, prompt, deny) is configuration, not a prompt. Sandbox allow-lists, when the opt-in backend is turned on, are OS-enforced. No Git-versioned capability policy document. | Capability rules as a YAML file in Git, versioned in the database, enforced by gateway code and network policy. | We lead |
| Identity per task | Secrets encrypted at rest (AES-256-GCM), but fn_secret_get can put a plaintext value into the model's own transcript under an auto or approved policy. Provider credentials sit in a shared ~/.fusion/agent/auth.json. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, no key material in the sandbox except two per-session Forgejo tokens used only by the worker process. | We lead |
| Artifacts not chat | PROMPT.md is a genuine committed artifact holding the plan and acceptance criteria. Reviews are structured JSON. The product also ships an inter-agent chat and mailbox as a first-class feature. | TaskBrief object in, a branch, a PR and a normalised event stream out. No chat surface between agents. | We lead |

## 3. Architecture and stack

Fusion is a pnpm TypeScript monorepo. The top-level layout (packages/) has twelve packages: cli, cli-alias, core, dashboard, desktop (Electron), mobile (Capacitor), engine, i18n, plugin-sdk, droid-cli, pi-claude-cli, pi-llama-cpp. A separate plugins/ directory holds at least eighteen packages, mostly one per runtime integration (fusion-plugin-claude-runtime, fusion-plugin-cursor-runtime, fusion-plugin-droid-runtime, fusion-plugin-grok-runtime, fusion-plugin-hermes-runtime, fusion-plugin-openclaw-runtime, fusion-plugin-antigravity-runtime, fusion-plugin-acp-runtime, fusion-plugin-omp-runtime), plus feature plugins (fusion-plugin-quality, fusion-plugin-linear-import, fusion-plugin-dependency-graph, fusion-plugin-compound-engineering, fusion-plugin-roadmap, fusion-plugin-todos, fusion-plugin-reports, fusion-plugin-whatsapp-chat, fusion-plugin-even-realities-glasses, fusion-plugin-agent-browser). package.json sets "name": "fusion-workspace", "version": "0.78.0-beta.7", "license": "MIT", packageManager pnpm 10.33.0, and a long list of custom check-*.mjs static-analysis scripts run before tests.

Storage is an embedded, zero-config PostgreSQL instance by default (per docs/storage.md and docs/architecture.md); legacy SQLite files are accepted only as one-time migration input, not a supported runtime backend. A cross-node sync layer (docs/secrets.md) uses scrypt plus an AES-256-GCM envelope to replicate state, including secrets, between a user's own machines.

Each coding agent runs through a "runtime" plugin, an abstraction comparable to our Go Harness interface: the same task lifecycle can drive Claude Code, Cursor, Droid/Factory AI, Grok CLI, Hermes, or a locally-run model through Ollama, chosen per lane (see below). Deployment is npx or a global npm install, a curl installer script, Homebrew, or Docker for headless operation; there is no Helm chart or Kubernetes manifest in the repository, consistent with its single-operator framing.

Task execution follows planning, then todo, then in-progress, then in-review, then done, with a Plan, Review, Execute, Review cycle inside in-progress per step, described in docs/task-management.md. The plan and acceptance criteria for a task live in a single PROMPT.md file in the task's worktree, described in docs/task-management.md as containing an ordered step list, a file scope per step, and acceptance criteria. The reviewer's verdict is structured JSON, a verdict field of APPROVE, APPROVE_WITH_NOTES or REVISE plus a notes field, documented in docs/workflow-steps.md with an explicit prose-fallback parser and a malformed classification for output that matches neither shape. Model choice is set per "lane" (Executor, Planning, Validator, Merger, Title Summarisation, Workflow Step Refinement), each independently configurable for provider, model and thinking level, with a documented override precedence of task, then project, then global lane setting, then default (docs/settings-reference.md).

Files and directories read: README.md, LICENSE, package.json, docs/contributing.md, docs/architecture.md, docs/sandbox.md, docs/secrets.md, docs/task-management.md, docs/workflow-steps.md, docs/settings-reference.md (grepped for budget and cost terms), STRATEGY.md, ROADMAP.md, top-level directory listing. docs/storage.md and docs/evals.md were only checked for length, not read in depth; anything drawn from them beyond what is cited above is not verified.

## 4. UX

A user goes from install to a running task in roughly five to seven steps: install with one command (npm, curl or brew), start Fusion, connect a model provider, open the kanban board and describe a task in plain language, wait for the planning agent to produce a PROMPT.md and approve or edit it, then watch execution. This is inferred from the README quickstart and feature list, not from running the product, since running cloned code is out of scope for this report.

Interfaces are unusually broad for a project this size: a CLI (fn command), a web dashboard, an Electron desktop app for macOS, Windows and Linux, and a Capacitor mobile app for iOS and Android, all syncing against the same task state across a user's own machines. The dashboard ("Command Center") shows token and cost counters per agent, a kanban board of task state, and an inter-agent chat and mailbox. Human intervention happens through the kanban board (move, comment, steer), through the ApprovalRequestStore-backed approval prompts for secret access and other gated actions, and through a configurable "planner oversight" level (off, observe, steer, autonomous) that changes how much a human is consulted mid-task; merge, PR and other destructive actions require an explicit human confirmation at every oversight level, per docs/architecture.md.

This is genuinely ahead of our own console, which our baseline document already admits is "functional, not designed... no onboarding, no real-time streams of the agent's work, no diff view, no mobile view." Fusion's dashboard, by its own docs, has real-time per-agent output, a cost view, and a native mobile presence, all things on our own known-weakness list.

## 5. Security, identity, sandbox, policy, cost

Security is enforced mostly by convention and configuration, not by a hard OS boundary. The default worker isolation is a git worktree, which stops agents from stepping on each other's branches but does nothing to a process's filesystem or network access. Real sandboxing exists (docs/sandbox.md): Linux bubblewrap and macOS Seatbelt, with a documented failureMode of fail-hard, bind-mount and network allow-lists, and an environment-variable isolation policy. It is opt-in, and the docs describe it as experimental. The default backend is called native, meaning unsandboxed.

Credentials live in an AES-256-GCM encrypted store (docs/secrets.md), with a MasterKeyManager that prefers the OS keychain and falls back to a file at ~/.fusion/master.key with mode 0600. A secret's access policy is auto, prompt or deny. On auto, or on an approved prompt, the fn_secret_get tool contract puts the plaintext value into the model's own transcript, which means the agent process and the model both see the raw secret, not a scoped capability. Provider API credentials for the agent runtimes sit in a shared ~/.fusion/agent/auth.json. .env files are auto-materialised into a task's worktree with a gitignore safety check to stop them being committed.

Policy is mostly configuration read by the same process that runs the agent, not a separately enforced layer. The clearest exception is the sandbox allow-list, which is OS-enforced when the opt-in backend is turned on, and the secret access policy, which is enforced by the secrets store rather than left to the prompt. There is no equivalent of a capability document that is versioned in Git and applied by a separate control-plane process.

Cost control is token-based, not currency-based. taskTokenBudget sets a soft and hard token cap per task; hitting the hard cap pauses the task rather than blocking a specific call in advance. modelPricingOverrides and the Command Center's cost view convert token counts to an estimated dollar figure for observability, and the docs explicitly describe this pricing data as not persisted as billing truth. There is no pre-call spend hold comparable to a gateway taking a database-locked hold before a request goes out.

## 6. What we should take from it

Narrow, could land this month: the structured JSON reviewer verdict (verdict plus notes, with a documented prose fallback and an explicit malformed state) is a small, concrete pattern for making our stronger-model review machine-actionable rather than free text a human has to parse. The scope-checked revision routing, where an in-scope fix goes back into the current plan and an out-of-scope finding forks a new task, is a good model for what our supervisor's "redirect" verdict should actually do rather than just re-prompting in place. The per-lane model routing with an explicit task-then-project-then-global-then-default override order is worth copying as a configuration pattern regardless of how many lanes we end up with.

Broad, changes priorities: PROMPT.md as a single committed artifact holding both the plan and the acceptance criteria directly addresses our own stated gap, "spec-driven intake does not exist yet." A spec phase for us does not need Fusion's full planner; it needs the same idea, one artifact per task with an explicit acceptance-criteria section, produced before the coder agent starts and re-read by the reviewer at the end, so "did it pass" has a written definition instead of being implicit in a stronger model's judgement. Review depth that scales with a task's complexity rating is a second broad idea: it would let us spend the review-frontier and supervisor tiers only where the task profile says they are needed, rather than at a flat rate.

## 7. Where our philosophy differs and what that costs or buys us

Copying Fusion's default isolation, an unsandboxed worktree with sandboxing as an experimental option, would break our "security without half measures" constraint outright. Their approach buys faster local iteration and zero sandbox-setup friction for a single trusted developer on their own machine; our constraint makes us pay for a gVisor pod and network policy on every task, in exchange for not trusting the agent's process at all. For a factory meant to run untrusted or semi-trusted work at scale, that price is the point, not overhead to shave off.

Fusion's secret handling, where a policy-approved secret reaches the model's own context as plaintext, is the sharper case. Our identity-per-task principle exists specifically to prevent that: the agent gets a capability through the gateway, and the raw key never enters its reach. Adopting Fusion's simpler fn_secret_get model would be a straightforward regression of a stated principle, not a neutral simplification, so nothing here should be copied as-is.

Where Fusion's approach is genuinely better and our constraint is the price: their UX. A native desktop and mobile app, backed by real-time per-agent output, costs them nothing extra in security terms because their trust boundary is "one operator, their own devices." Our multi-tenant, sandboxed, policy-gated design makes an equivalent console a harder build, since every stream and every action has to be checked against task ownership and capability, not just rendered. That is a real cost of our model, and the UX gap it leaves is worth closing without touching the security model that causes it.

## 8. Red flags and slop assessment

The dominant-author pattern is stark: GitHub's contributors API lists 34 contributors, but one account holds roughly 10,400 of the recorded contributions against a distant second at 373. Total commit count, checked through paginated commit history, comes out at roughly 14,300 commits in under six months. That is a very high rate of change for one person to review carefully, and it is corroborated by the architecture document itself, which contains dozens of narrowly scoped "FN-XXXX" ticket-tagged subsections describing specific race-condition and edge-case fixes in the task lifecycle and workflow engine. Read together, this looks like a fast-moving, heavily self-hosted-and-dogfooded project that fixes concurrency bugs as it finds them in production use, rather than one that designed the state machine to avoid them up front.

Against that, the project does show real engineering discipline: package.json runs a long list of custom check-*.mjs static-analysis scripts before tests, and the local test suite contains 3,054 .test.ts/.spec.ts files. An independent evaluation from a third party (FlorianBruniaux's claude-code-ultimate-guide, dated 2026-07-15) did a source-level audit against a specific commit and its summary of the package layout and task-lifecycle state machine matches what this report found independently in the docs, which is some evidence the documentation is not marketing ahead of the code.

No licence changes, no security incidents, and no open-core gating were found; MIT covers the whole repository as far as this report checked. The clearest gap between marketing and reality is scale framing: the README and website use enterprise-adjacent language ("software factory", "missions", "agent companies") while the project's own STRATEGY.md names a solo developer with many terminals as the actual target user, and the security model (shared secrets store, single-operator sandbox defaults) matches the narrower claim, not the broader one.

Several embedded HTML comments tagged FNXC:* appear in README.md and docs/architecture.md (for example FNXC:Docs, FNXC:WorkflowScopeLeak). These read like internal task notes left by the project's own documentation-maintenance agent, not instructions aimed at a reader, and are treated here as evidence the team dogfoods Fusion for its own docs, not as a red flag in themselves.

## 9. Sources

https://github.com/Runfusion/Fusion (repository, cloned 2026-09-29)
https://runfusion.ai (WebFetch, 2026-09-29)
https://github.com/FlorianBruniaux/claude-code-ultimate-guide/blob/main/docs/resource-evaluations/fusion-multi-agent-orchestrator.md (independent evaluation, dated 2026-07-15, read via WebSearch summary 2026-09-29)
https://www.npmjs.com/package/@runfusion/fusion (WebSearch summary, 2026-09-29)
gh api repos/Runfusion/Fusion (2026-09-29)
gh api repos/Runfusion/Fusion/contributors (2026-09-29)
gh api repos/Runfusion/Fusion/commits --paginate (pagination header only, 2026-09-29)
/home/womb/repos/market-research-clones/fusion/README.md
/home/womb/repos/market-research-clones/fusion/LICENSE
/home/womb/repos/market-research-clones/fusion/package.json
/home/womb/repos/market-research-clones/fusion/STRATEGY.md
/home/womb/repos/market-research-clones/fusion/ROADMAP.md
/home/womb/repos/market-research-clones/fusion/docs/contributing.md
/home/womb/repos/market-research-clones/fusion/docs/architecture.md
/home/womb/repos/market-research-clones/fusion/docs/sandbox.md
/home/womb/repos/market-research-clones/fusion/docs/secrets.md
/home/womb/repos/market-research-clones/fusion/docs/task-management.md
/home/womb/repos/market-research-clones/fusion/docs/workflow-steps.md
/home/womb/repos/market-research-clones/fusion/docs/settings-reference.md (grepped)
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/01-report-template.md
