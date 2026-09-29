---
name: Gemini CLI
slug: gemini-cli
url: https://geminicli.com
repo: https://github.com/google-gemini/gemini-cli
category: coding-harness
license: Apache-2.0
open_source: yes
self_hostable: partial
hosting_model: local binary or npx run, model calls always go to Google's hosted Gemini API or Vertex AI, no self-hostable model
company: Google LLC, Mountain View, first commit 17 Apr 2025, internal product, no separate funding round
maturity: 107186 stars, 14658 forks, 801 open issues, first commit 17 Apr 2025, last commit 28 Sep 2026, weekly Tuesday preview releases plus nightly builds
similarity: 2
axes:
  signals_intake: 1
  control_plane: 1
  sandbox_isolation: 3
  verification: 1
  policy_outside_model: 4
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 1
steal:
  - TOML policy schema (toolName, commandPrefix, commandRegex, argsPattern, decision, priority, modes) is a compact readable shape for tool-level overrides, and its "deny hides the tool from the model entirely" behaviour saves context and stops probing, worth copying over our current allow/refuse-only gateway behaviour.
  - Shadow-git checkpoint before every write tool call, restored with a restore command, is a cheap last-good-state safety net independent of the agent's own branch, worth exposing as a per-task quick-revert in the console.
  - The headless JSONL event schema (init, message, tool_use, tool_result, error, result) with a small closed set of exit codes, including one for "turn limit exceeded", is a good reference shape for our Harness Event stream and Result type.
  - Sandbox expansion (a scoped, one-time permission grant on denial, remembered per approval-mode hierarchy plan < default < autoEdit < yolo) is a better mediated-consent pattern than an on/off sandbox switch, and maps onto an approval-card style exception request.
  - MCP tool rules addressed by server name rather than fragile fully-qualified-name wildcards is a naming lesson for our own gateway's MCP proxy rules.
  - The official GitHub Action wrapper (dispatch, issue triage, pull request review workflows) shows how far a bare harness plus a thin CI-triggered wrapper covers the signals and verification planes without a dedicated control plane, useful to revisit for a future read-only analyzer capability class.
differs:
  - The model plane is locked to the Gemini and Vertex AI protocol family, with no generic OpenAI-compatible provider list. Adopting it as our Harness means giving up the open-weight coding-cheap/coding-frontier ladder, or routing every call through Vertex passthrough and paying full Gemini pricing regardless of task risk.
  - Identity stays with the operator or the machine (a long-lived Google OAuth session or a static API key held wherever the CLI runs), not with the task. This is the opposite of "identity belongs to the task", and a maximum-severity workspace-trust vulnerability is the concrete cost: sandboxing is a runtime opt-in layered on an already-trusted process, not a precondition the platform enforces the way our sandbox pod and default-deny egress do.
ux_verdict: A fast, well-documented terminal agent with real undo (rewind, checkpoint) and a clean headless JSONL contract, but strictly single-session and single-project, with no multi-task board or approval queue of its own.
slop_verdict: Real and heavily used, over a hundred thousand stars and daily commits, Google's own issue triage runs on it, but its trust boundary has failed at the maximum severity rating at least once in production, so treat "battle-tested" and "secure by default" as separate claims.
---

# Gemini CLI

## 1. What it is

Gemini CLI is Google's open-source terminal coding agent, built on Gemini 3 models. Google's own framing is "the most direct path from your prompt to our model": a free-tier-first, terminal-native alternative to Claude Code and Codex CLI, extensible through the Model Context Protocol and skills. It is used both interactively by individual developers and headlessly, wrapped in an official GitHub Action, for automated issue triage and pull request review.

The README's claims (free tier, "powerful Gemini 3 models", "terminal-first") hold up against the code: the repository is a large, actively developed npm workspace monorepo with real sandboxing, policy and telemetry subsystems, not a thin wrapper. What the marketing does not surface: as of 18 Jun 2026 the product homepage itself banners that unpaid-tier and Google One individual users were moved to a separate proprietary sibling product, while the open-source CLI keeps serving paid API, Workspace and Vertex AI users. Development on the open-source repository has not slowed.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None in the core CLI. An official GitHub Action adds issue- and PR-event triggers (dispatch, issue triage, PR review workflows) as a separate project | Forgejo webhooks and SigNoz alerts feed factoryd intake, every task becomes a Forgejo issue | we lead |
| Control plane | No durable task registry. Each invocation is a stateless session with local shadow checkpoints; the Agent-to-Agent server persists a per-remote-task object to cloud storage, with no scheduling, budgets or approvals | factoryd with a Temporal workflow per task, Postgres task state, audit trail | we lead |
| Worker plane | Five sandbox backends (Seatbelt, Docker/Podman, gVisor, Windows native, LXC) behind one opt-in flag, plus tool-level sandboxing and a scoped "sandbox expansion" consent dialog | One gVisor pod per task, default-deny egress, always on, one Kubernetes namespace per task | equal, broader menu on their side, always-on isolation on ours |
| Verification | A policy engine gates each tool call (allow, deny, ask user) and a separate evals harness tests the agent itself; nothing gates a diff before merge | Forgejo Actions, path-risk and migration policy gates, a reproduction gate, then a stronger-model review before merge | we lead |
| Merge and deploy | None in the core CLI. The GitHub Action can post PR reviews and, per a filed bug, has been seen auto-approving a PR through an MCP tool | Bot merge only after a whitelisted human approval or a strict auto rule, GitOps deploy | we lead |
| Policy outside the model | A TOML policy engine with tiered priority (default, extension, workspace which is currently disabled, user, admin), root-owned admin directories checked by file permissions, a deny decision removes the tool from the model's context entirely | Capability YAML in Git, enforced in gateway code and network policy | equal, they lead on per-tool-call granularity, we lead on covering budgets, network and model choice in one document |
| Identity per task | The operator's own long-lived Google OAuth session or a static API key, held on whatever machine runs the CLI; workload identity federation is available for the CI Action only | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by the gateway, no key material in the sandbox | we lead |
| Artifacts not chat | The conversation turn is the primary unit (rewind and checkpoint operate on turns); remote subagents exchange structured task objects | TaskBrief in, branch, pull request and normalised event stream out | not comparable, different unit of work |

## 3. Architecture and stack

TypeScript and Node.js (engines.node >= 20), npm workspaces monorepo. `packages/cli` is the ink-based terminal UI, `packages/core` holds the tool registry, policy engine (`src/policy`), sandbox drivers (`src/sandbox/{linux,macos,windows}`), model routing and fallback (`src/routing`, `src/fallback`, `src/availability`), telemetry (`src/telemetry`, OpenTelemetry), and a consumer billing and wallet module (`src/billing`) unrelated to spend control. `packages/a2a-server` implements the Agent-to-Agent protocol for remote subagents, with task state persisted to Google Cloud Storage (`src/persistence/gcs.ts`). `packages/sdk` exposes the same core programmatically for Node embedding. There is no database and no workflow engine: state is local files, a shadow history repository and settings files merged across four precedence tiers (system defaults, user, workspace, system overrides). Model calls go over the Gemini API or Vertex AI protocol only, addressable via `GOOGLE_GEMINI_BASE_URL` or `GOOGLE_VERTEX_BASE_URL` for a proxy in front of Google's own API; an experimental local Gemma model can pick which remote model handles a turn but never itself answers a coding request. Sandboxing runs containers with the gVisor runtime for strong isolation, `sandbox-exec` on macOS, or ACL manipulation on Windows, chosen by a settings key.

## 4. UX

Zero-install start with a single command, sign in with a Google account in a browser or paste an API key, first response inside a minute. Approval modes are default (ask before writes), auto-edit, plan (strict read-only), and yolo (auto-approve everything); a sandbox-expansion dialog explains and scopes any extra permission a command needs instead of failing outright. A rewind command opens an interactive list of past turns to revert chat history, file changes, or both; every write is also auto-checkpointed to a shadow git repository, restorable with a restore command. Headless mode returns structured JSON or newline-delimited JSON events for scripting, with documented exit codes for success, general error, bad input, and turn limit exceeded. A VS Code companion extension exists. There is no web console, no kanban board, no multi-task view and no approval queue: it is one agent, one terminal, one project at a time, which is why separate products exist to run several such sessions side by side.

## 5. Security, identity, sandbox, policy, cost

Identity is the operator's own Google OAuth session or a static API key or service account, held wherever the CLI process runs, with no per-task issuance or rotation; the CI Action can instead use workload identity federation, avoiding long-lived keys there specifically. The sandbox is off by default and, when on, is a runtime layer wrapping an already-trusted process rather than a precondition: a maximum-severity remote code execution flaw existed because headless runs auto-trusted the workspace folder and loaded local environment files before the sandbox engaged, letting a poisoned GitHub issue trigger host-level command execution. Policy is enforced in code through the TOML rule engine, independent of the prompt, though the docs admit the workspace tier is currently non-functional. Cost has no ledger or hold in the CLI itself: Google enforces per-user, per-day request quotas that scale from a few hundred to a couple of thousand depending on plan, with nothing at task or project granularity, and the billing module manages a consumer credit wallet, not a spend cap.

## 6. What we should take from it

Narrow: the TOML policy schema and its behaviour of hiding a denied tool from the model entirely, the shadow-git checkpoint-and-restore pattern as a per-task quick-revert in our console, and the small closed JSONL event vocabulary, with an explicit turn-limit exit code, as a reference shape for our own Harness event and result types.

Broad: sandbox expansion as a mediated, scoped consent flow beats an on/off switch, and generalises to an approval-card style exception request when a sandboxed agent hits a network or path denial mid-task. The official GitHub Action is a working demonstration that a bare harness plus a thin CI-triggered wrapper can cover a surprising share of the signals and verification planes for cheap, low-risk tasks such as triage and read-only review, without a dedicated control plane, worth revisiting once an analyzer capability class exists.

## 7. Where our philosophy differs and what that costs or buys us

The model plane is locked to the Gemini and Vertex AI protocol family, with no generic OpenAI-compatible endpoint list the way opencode has. It meets three of our four Harness requirements (headless, MCP tools that could route through a gateway, machine-readable output) but fails the fourth: a configurable endpoint that can reach any model through our gateway. Using it as a Harness would mean abandoning the open-weight coding-cheap and coding-frontier ladder, or routing every call through Vertex passthrough while still never leaving the Gemini family. Their approach buys a single, well-integrated model family with strong context length and tool support; our constraint of staying best-of-breed and swappable is the price of not taking it.

Identity staying with the operator, not the task, is the more consequential difference. It is workable for an individual running the CLI on their own laptop, but it is precisely the assumption the maximum-severity bug broke once the same binary ran unattended against untrusted GitHub issue text. Our principle that identity belongs to the task, enforced by short-lived tokens the sandbox itself never holds, exists to make that class of bug structurally harder, at the cost of the adapter and gateway machinery Gemini CLI does not need for interactive local use.

## 8. Red flags and slop assessment

A CVSS 10.0 remote code execution flaw, reported by Pillar Security and Novee Security in April 2026, let a poisoned GitHub issue trigger host-level command execution before the sandbox initialised, on the very repository Google runs its own triage bot against. It was fixed in a CLI release and a matching GitHub Action release, both breaking changes for anyone pinning the fully-automatic yolo mode. This followed at least three earlier disclosed prompt-injection or exfiltration issues across 2025 and 2026 from independent researchers. The product homepage itself banners a business-model shift: unpaid-tier and Google One individual users were moved to a proprietary sibling product on 18 Jun 2026, while the open-source repository continues to serve paid API, Workspace and Vertex AI users; not verified beyond that banner text. Workspace-tier policy files are documented as currently non-functional, a known, admitted gap between docs and code. None of this reads as an abandoned or thin project: commits landed the day before this report, and the star and fork counts are both large and plausible for a Google-backed tool.

## 9. Sources

- https://geminicli.com, fetched 2026-09-29
- https://github.com/google-gemini/gemini-cli, cloned shallow to the local clones directory, fetched 2026-09-29
- GitHub API repository metadata for google-gemini/gemini-cli, fetched 2026-09-29
- README.md
- CONTRIBUTING.md
- LICENSE
- package.json
- docs/cli/sandbox.md
- docs/reference/policy-engine.md
- docs/cli/headless.md
- docs/cli/model-routing.md
- docs/cli/telemetry.md
- docs/cli/enterprise.md
- docs/cli/rewind.md
- docs/cli/checkpointing.md
- docs/core/remote-agents.md
- docs/resources/quota-and-pricing.md
- docs/get-started/authentication.mdx
- docs/reference/configuration.md, base URL and endpoint settings
- packages/core/src/billing/billing.ts and its test file
- packages/core/src/config/config.ts, base URL handling
- top-level repository layout via find: packages, docs, evals, integration-tests, schemas, sea, tools directories
- WebSearch: Gemini CLI 2026 security incident and prompt injection coverage, fetched 2026-09-29, including SecurityWeek, Cyera, Pillar Security, CSO Online, CyberScoop, Tracebit, Hackread, The Hacker News, the GitHub security advisory, and The Register
- WebSearch: the official GitHub Action's triage and pull request review workflows, fetched 2026-09-29, including the Action's repository, its example workflows, and a linked GitHub issue
