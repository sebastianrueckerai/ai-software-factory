---
name: Kilo Code and Kilo Cloud
slug: kilo-code
url: https://kilocode.ai
repo: https://github.com/Kilo-Org/kilocode
category: factory-orchestrator
license: MIT
open_source: partial
self_hostable: partial
hosting_model: open-source CLI, VS Code and JetBrains extensions self-hosted or BYOK; Kilo Gateway, Kilo Cloud (Cloud Agent, Code Reviews, triggers) and Kilo Pass are closed SaaS
company: Kilo Code Inc, San Francisco. Founded March 2025 as a fork of Roo Code (itself derived from Cline). 8M USD seed (Cota Capital, Dec 2025). Acquired by Anaconda, July 2026, terms undisclosed
maturity: 27438 stars, 3215 forks, 391 contributors, 614 open issues, repo created 2025-03-10, last commit 2026-09-29 (today), releases ship per component (e.g. jetbrains/v7.1.8, 2026-09-25), very active monorepo
similarity: 2
axes:
  signals_intake: 3
  control_plane: 1
  sandbox_isolation: 1
  verification: 1
  policy_outside_model: 1
  identity_per_task: 2
  cost_control: 2
  ux: 4
  reseedable_selfhost: 2
steal:
  - "The GitHub Action mode (packages/opencode/src/cli/cmd/github.handler.ts) fetches a workflow OIDC token (core.getIDToken) and exchanges it server-side for a short-lived, repo-scoped GitHub App token, instead of storing a PAT in secrets. It also checks the commenting actor's repo permission (must be admin or write) before doing anything. Both match our own short-lived-credential and write-access-only trust rules, and are worth citing as independent validation of the pattern"
  - "Generic webhook and cron triggers (app.kilo.ai/cloud/triggers) turn any HTTP event into a Cloud Agent session against a repo, with a prompt template that interpolates {{body}}, {{bodyJson}}, {{headers}}, {{query}}, plus hard caps (256 KB payload, 20 in-flight requests, no binary content). A source-agnostic trigger with a templated prompt and small hard caps is a cheaper way to add a new signal source than a bespoke connector per system"
  - "Forcing 'question' and 'suggest' tool permissions to deny for unattended runs (session.create permission list in github.handler.ts) stops the agent from stalling on a human who is not there. Any of our capability classes that can run with no interactive channel should disable in-band 'ask' tools the same way, rather than let a supervisor call cover for a missing UI"
  - "kilo-console embeds a real terminal (ghostty-web) for watching a Cloud Agent or remote CLI session live in the browser, and the CLI has a --stream JSONL mode for the same session. This is a direct, low-effort answer to a weakness we already listed for ourselves (no real-time view of an agent's work): a terminal-replay panel is smaller to build than a full trace or diff UI"
  - "kilo-sandbox's config shape (sandbox.enabled, network: allow|deny, allowed_hosts as exact host:port, writable_paths) is a compact schema for default-deny-with-allowlist network policy at process level, built on bubblewrap (Linux) and seatbelt (macOS) plus the seccomp profile from @anthropic-ai/sandbox-runtime. Useful as a reference if we ever need a lightweight non-Kubernetes sandbox mode, e.g. for local development of the harness itself"
  - "Kilo Gateway's pricing is 'exact provider rate, no markup' plus a flat 5 percent fee on credit top-ups, rather than a per-call markup. A single, auditable fee point is simpler to reason about than a tiered markup table"
differs:
  - "Cloud Agent's docs state 'Auto/YOLO mode is always on': there is no confirmation step during a cloud session, only an after-the-fact diff view and an optional auto-commit. This is the opposite of our principle that approval is a workflow state; they buy throughput and simplicity by removing the gate entirely for the paid product, where we keep an explicit approval or auto-rule state before merge"
  - "Kilo's own docs admit webhook triggers are 'susceptible to prompt injection attacks' and tell users to restrict them to trusted sources, i.e. the trust-boundary problem is handed to the operator rather than solved in code. Our design marks any outside-account text as untrusted for the agent and the reviewer; copying Kilo's trigger model as-is would reopen a hole we close deliberately"
ux_verdict: Zero to a first suggestion is one CLI install or IDE marketplace click with no API key required, and a Cloud Agent session can be watched live in a browser-embedded terminal (ghostty-web) or streamed as JSONL from the CLI, both ahead of our console's static kanban view; but Cloud Agent shares one container across a user's chats, keeps up to 15 minutes per message with no mid-task pause, and its own docs warn that YOLO mode is always on
slop_verdict: Real and heavily used (27k GitHub stars, 391 contributors, committed today, Anaconda states 3M-plus developers and about 10 trillion tokens a month routed through it), but the actual "factory" half of the product (Kilo Gateway backend, Cloud Agent orchestration, budgets) lives in the closed Kilo-Org/cloud repository, not in the MIT tree, was folded into Anaconda in July 2026, and a third-party breach at its analytics vendor Metabase exposed some users' Slack tokens and account or prompt data in August 2026
---

# Kilo Code and Kilo Cloud

## 1. What it is

Kilo Code is an open-source AI coding agent, shipped as a VS Code extension, a JetBrains plugin and a CLI (`@kilocode/cli`), plus a closed-source hosted layer called Kilo Cloud: a web-based Cloud Agent, a webhook and cron trigger system, a PR "Code Reviews" bot, and Kilo Gateway, a pass-through billing proxy to 500-plus models from 60-plus providers "at provider rate, no markup". It started in March 2025 as a fork of Roo Code (itself a fork of Cline), raised an 8M USD seed in December 2025 led by Cota Capital, and was acquired by Anaconda in July 2026. The README's claim is "the most popular open source coding agent"; Anaconda's own acquisition announcement puts usage at 3M-plus developers and close to 10 trillion tokens a month.

What the marketing claims (most popular, 500+ models, no markup) cannot be fully checked from outside. What the repository actually shows is narrower and more interesting for this comparison: the monorepo (`~/repos/market-research-clones/kilo-code`) contains not just the editor extensions but a full internal platform under `packages/`: `kilo-gateway` (auth and billing client), `kilo-sandbox` (local OS-level sandboxing), `kilo-console` (the Kilo Cloud web UI, SolidJS), `kilo-memory`, `kilo-indexing`, `kilo-telemetry`, and the CLI's own GitHub Action runner. The security disclosure page (kilo.ai/security) names a separate, out-of-tree repository, `Kilo-Org/cloud`, as the actual backend for the paid product, so the control plane for "Kilo Cloud" is not open source.

## 2. Mapping to our five planes

| Plane or principle | What Kilo does | What we do | Verdict |
|---|---|---|---|
| Signals | GitHub Action mode reacts to issue and PR comments containing `/kc` or `/kilo`. Kilo Cloud adds generic webhook triggers (any HTTP source: GitHub, PagerDuty, Slack, cron) with a templated prompt | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task is a Forgejo issue | equal |
| Control plane | No task registry or scheduler found. State is a chat session per container; Kilo Cloud tracks sessions and triggers in the closed `Kilo-Org/cloud` backend | factoryd with a Temporal workflow per task, Postgres, policy in Git | we lead |
| Worker plane | Local: an opencode-derived agent process, unsandboxed by default. Cloud Agent: one shared Linux container per user (Docker, not a VM or gVisor), all of a user's chats and worktrees run in it | One gVisor pod per task, ServiceAccount, default-deny egress | we lead |
| Verification | A separate paid "Code Reviews" product reviews PRs; Cloud Agent sessions themselves run in "Auto/YOLO mode... always on" with no confirmation step, only a post-hoc diff panel | Forgejo Actions, deterministic policy gates, then a stronger-model review with a strict verdict | we lead |
| Merge and deploy | Optional auto commit and push after each message; no gate, no deploy step | Bot merge after human approval or an auto rule, Flux GitOps, staged rollout | we lead |
| Policy outside the model | Enterprise tier lists "Sub-organizations & Budgets" and model/provider restrictions as governance features; no capability-rule engine found in the open repo | Capability rules as a Git-versioned YAML file, enforced in gateway code and network policy | we lead |
| Identity per task | GitHub Action mode exchanges a workflow OIDC token for a short-lived scoped GitHub App token per run. Cloud Agent instead injects plaintext or "decrypted only by the cloud agent" secrets from a shared, reusable environment profile into the container, readable by the agent process | A projected ServiceAccount token per task, verified by factory-gateway against the cluster OIDC issuer, no key material in the sandbox | they lead on the GitHub Action path, we lead on the Cloud Agent path |
| Artifacts not chat | Cloud Agent is explicitly a chat session with a changes panel of diff snapshots; the GitHub Action path posts a PR or comment as the artifact | TaskBrief in, a branch and a PR out, Git is the coordination mechanism | we lead |

## 3. Architecture and stack

TypeScript throughout, Bun-based monorepo (`bunfig.toml`, `turbo.json`), organised as `packages/*` workspaces. `packages/opencode` is the actual agent runtime, a fork of the opencode project (see `CONTEXT.md`, an extensive internal spec on session context assembly, providers and tool output bounding). `packages/kilo-gateway` wraps OpenRouter-style model access, device-flow auth, and profile/balance endpoints (`fetchProfile`, `fetchBalance` in its README). `packages/kilo-sandbox` implements OS-level confinement: `bubblewrap.ts` (Linux namespaces, `--unshare-user --unshare-pid --unshare-net`), `seatbelt.ts` (macOS `sandbox-exec`), `network.ts` (an allow/deny/proxy mode with a network relay process and seccomp filter), built on `@anthropic-ai/sandbox-runtime`'s vendored seccomp profiles. `packages/opencode/src/kilocode/sandbox/config.ts` shows the schema is opt-in and off by default: `enabled: config.sandbox?.enabled ?? false`, `network` defaults to deny only once enabled. `packages/kilo-console` (SolidJS, Vite) is the Kilo Cloud web UI, with a `ghostty-web` terminal embed and routes for projects, config and profile. `packages/kilo-memory` and `packages/kilo-indexing` add project memory notes and a tree-sitter-based codebase index, both user-invoked (`/memory remember`, `/memory rebuild`) rather than automatic. There is no database, queue or workflow engine for tasks in this repository; the closed `Kilo-Org/cloud` repo (named in the Security Disclosure scope) is where session, trigger and billing state actually live.

## 4. UX

Locally: `npm install -g @kilocode/cli` or an IDE marketplace install, then `kilo` in a project directory, no API key required to start (model routing can fall back to free models or local Ollama/LM Studio). In CI: adding a `.github/workflows/kilo.yml` (generated by `kilo github install`) reacting to `/kc` or `/kilo` mentions. In the cloud: connect a GitHub/GitLab/Bitbucket integration at app.kilo.ai/cloud, pick a repo, optionally set an environment profile (env vars, secrets, setup commands), and start chatting; `kilo cloud start` does the same from a local checkout. Progress is watched through the browser chat and a `ghostty-web` terminal, or via `kilo cloud start --stream` for JSONL events; personal trigger runs can be watched or joined live, organisation triggers run headless as a bot user. There is no dashboard of many tasks across states (queued, in review, done) the way our console's kanban board shows; the closest is the per-repo Changes panel of diff snapshots. Intervention is limited: Cloud Agent runs YOLO with up to 15 minutes per message and no confirmation prompts; "Remote Connections" instead let the web UI answer permission prompts for a local CLI session, the reverse direction from Cloud Agent.

## 5. Security, identity, sandbox, policy, cost

Identity is split. The GitHub Action path is genuinely strong: a workflow's own OIDC identity token is exchanged server-side for a scoped GitHub App token per run, and the commenting actor's write or admin permission is checked before anything executes. The Cloud Agent path is weaker: secrets live in a shared, reusable "environment profile" per user or organisation, described as "encrypted at rest, decrypted only by the cloud agent," then injected as plain environment variables into a container the agent process can read directly, with no per-task minting or revocation described. Sandboxing is two different, both partial, stories: locally, `SECURITY.md` states plainly "Kilo CLI does **not** sandbox the agent" by default, the bubblewrap and seatbelt-based `kilo-sandbox` package is opt-in and off unless a user sets `sandbox.enabled: true`; in the cloud, a user gets one shared Docker container for all their chats and worktrees, not one per task, with no gVisor, Kata or microVM mentioned, and no explicit network policy beyond implying outbound access is needed for git and `apt`. Policy is the thinnest area: no capability-rule engine or gateway-enforced policy was found in the open code; governance (budgets, model restrictions, sub-organizations) is an Enterprise-tier SaaS feature, not a Git-versioned document. Cost control is pay-per-token at provider rate through Kilo Gateway, billed from prepaid credits (a 5 percent top-up fee) or a monthly Kilo Pass subscription, with per-second Cloud Agent compute billing (0.60 to 1.20 USD/hour) and an Enterprise "Sub-organizations & Budgets" feature; no hard per-task spend cap or hold-then-book ledger like ours was found.

## 6. What we should take from it

Narrow, copyable this month: the OIDC-token-exchange pattern for the GitHub Action path (short-lived workflow identity exchanged for a scoped token, never a stored PAT) and its explicit actor-permission check are worth checking our own gh-aw-adjacent flows against, since it is a smaller, already-proven unit than building a broker from scratch. The practice of disabling in-band "ask" and "suggest" tool permissions for unattended runs is a one-line pattern any of our future headless capability classes should copy. The generic webhook-trigger shape (templated prompt, small hard caps on payload size and concurrency) is a cheap way to add a new signal source without a bespoke connector.

Broad: the browser-embedded terminal (`ghostty-web`) plus CLI JSONL streaming directly answers a gap we already listed for ourselves, no real-time view of an agent's work in the console. A terminal-replay panel fed from our own session event stream would be a smaller project than a full trace UI and would close part of that gap this quarter.

## 7. Where our philosophy differs and what that costs or buys us

Cloud Agent's "Auto/YOLO mode is always on" removes the approval step entirely from the paid product; that buys them a faster, chat-like loop at the cost of exactly the safety property our approval-as-workflow-state principle exists for; adopting it would mean accepting merges (or at least committed work) with no gate before a human or policy has looked at it. Kilo's own admission that webhook triggers are "susceptible to prompt injection attacks" and should be restricted to trusted sources is the same trade in miniature: they leave the trust boundary to the operator's judgement, we enforce it in code by marking outside-account text untrusted for the agent and the reviewer. The larger structural difference is that the actual orchestration, billing and governance layer is a separate, closed repository (`Kilo-Org/cloud`) now owned by Anaconda; nothing about that half of "Kilo Code and Kilo Cloud" could be deleted and rebuilt from public Git, which is the opposite of our re-seedable constraint for the equivalent plane in our own design.

## 8. Red flags and slop assessment

The open-source core is real and active: 27,438 stars, 3,215 forks, 391 contributors, a commit today (2026-09-29), and component releases as recently as 2026-09-25. Two incidents are worth flagging. First, a third-party breach: Kilo's analytics vendor Metabase was hit by a critical SQL-injection zero-day (CVE-2026-72898, CVSS 10.0) in early August 2026; Kilo's Slackbot tokens for a subset of users were exposed and invalidated, and Anaconda's own disclosure says some users or organisations may have had partial or full prompts and account data (name, email, billing address, location) exposed, which matters more than usual for a coding agent since prompts can carry code or secrets. Second, CVE-2026-8766, an information-disclosure flaw in the Kilo CLI (up to v7.0.47) reported in May 2026, where the vendor reportedly did not respond to early disclosure attempts despite running a HackerOne-backed Coordinated Vulnerability Disclosure program. Third, the July 2026 Anaconda acquisition is an ownership-continuity risk typical of a young, VC-backed open-core company: the README and docs say the product "has not changed for existing users," not verified independently here. No open-core feature removal or licence change was found; the core has stayed MIT since inception.

## 9. Sources

- https://github.com/Kilo-Org/kilocode (cloned shallow to ~/repos/market-research-clones/kilo-code)
- README.md, SECURITY.md, PRIVACY.md, LICENSE, CONTEXT.md, CONTRIBUTING.md
- packages/kilo-gateway/README.md, packages/kilo-gateway/src/cloud-sessions.ts, src/headers.ts, src/server/
- packages/kilo-sandbox/package.json, src/bubblewrap.ts, src/network.ts, src/seatbelt.ts, src/proxy.ts
- packages/opencode/src/kilocode/sandbox/config.ts, activation.ts, policy.ts, state.ts
- packages/opencode/src/cli/cmd/github.handler.ts, github.ts, github.shared.ts
- packages/opencode/src/kilocode/security/github.ts
- packages/kilo-console/package.json, src/ (routes, components, styles)
- packages/kilo-memory/src/commands.ts, autosave-status.ts, decisions.ts
- packages/kilo-indexing/src/ (top-level listing)
- packages/containers/README.md
- specs/v2/, plans/, docs/jetbrains-vscode-settings-parity.md
- gh api repos/Kilo-Org/kilocode (2026-09-29): 27438 stars, 3215 forks, 614 open issues, MIT, created 2025-03-10, pushed 2026-09-29
- gh api repos/Kilo-Org/kilocode/contributors (2026-09-29): 391 contributors
- gh api repos/Kilo-Org/kilocode/releases/latest (2026-09-29): jetbrains/v7.1.8, 2026-09-25
- https://kilo.ai/ (fetched 2026-09-29, kilocode.ai redirects here)
- https://kilo.ai/pricing (fetched 2026-09-29)
- https://kilo.ai/docs/code-with-ai/platforms/cloud-agent (fetched 2026-09-29)
- https://kilo.ai/security (fetched 2026-09-29)
- WebSearch: Kilo Code funding, HQ, founders, Anaconda acquisition (2026-09-29)
- WebSearch: Kilo Code security incidents, CVEs, reviews, criticism (2026-09-29)
- https://blog.kilo.ai/p/kilo-raised-8-million-seed-round
- https://www.anaconda.com/press/anaconda-acquires-kilo-code
- https://blog.kilo.ai/p/metabase-incident-impacting-kilo
- https://www.sentinelone.com/vulnerability-database/cve-2026-8766/
- https://blog.kilo.ai/p/cloud-agents-webhooks
