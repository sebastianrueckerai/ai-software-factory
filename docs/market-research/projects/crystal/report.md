---
name: Crystal
slug: crystal
url: https://github.com/stravu/crystal
repo: https://github.com/stravu/crystal
category: multi-agent-ui
license: MIT
open_source: yes
self_hostable: yes
hosting_model: local desktop app only (Electron, Mac/Windows/Linux), no server mode, optional sign-in to Stravu's proprietary cloud (api.stravu.com) for a notebook connector
company: Stravu, renamed Nimbalyst Inc, founded by Karl Wirth, Greg Hinkle and Jordan Bentley (ex-Evergage, sold to Salesforce in 2020), Bedford MA, no disclosed funding
maturity: 3.1k stars, 197 forks, 15 contributors, first commit 2025-06-05, last commit 2026-02-26 (v0.3.5), then deprecated
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 1
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 4
  reseedable_selfhost: 1
steal:
  - Session list with tabs per session for diff, run output and terminal, backed by an execution_diffs table so diffs are stored, not recomputed. Fixes exactly the gap our own vision names, no diff view in the console.
  - Per-tool-call permission bridge (mcpPermissionServer.ts, permissionManager.ts), every tool call the CLI agent wants to make is intercepted, shown to the human with the raw input, and can be approved, denied, or approved with an edited input, before it runs.
  - cliToolRegistry.ts, one interface (capabilities, config schema, panel types, availability check) behind which Claude Code, Codex and other CLI agents are plugged in. Same shape as our Harness interface, worth a field by field diff.
  - worktreeNameGenerator.ts, auto-names each session's branch and worktree so a user never has to invent one, small but removes friction at the one step users do most often.
  - Per-project run script (runCommandManager.ts, scriptExecutionTracker.ts) a user fires manually against any worktree, a cheap local smoke test before anything reaches real CI.
differs:
  - No sandbox of its own. Every agent process runs on the developer's own machine with their own filesystem and network. Isolation is a different worktree directory, not a security boundary. Copying this would break our sandbox_isolation and policy_outside_model principles outright, it only works because Crystal assumes one trusted developer on their own laptop.
  - No control plane. State is a local SQLite file plus a Bull queue in the same Electron process, and there is one identity, the developer's own CLI login, for every session. There is no durable task state that outlives the app, no multi-tenant scheduling, and nothing to audit across users.
ux_verdict: fast, opinionated, single-user desktop UX for running several coding-agent sessions in parallel git worktrees, the best public example found of the diff plus stream plus inline approve pattern our console still lacks.
slop_verdict: real and used in anger, 3.1k stars, 15 contributors, granular changelog across eight months, but now frozen. Deprecated February 2026 in favour of a commercial successor, Nimbalyst, with a different scope and a separate repository. Treat as a closed reference, not a moving target.
---

# Crystal

## 1. What it is

Crystal was an Electron desktop app from Stravu that ran several Claude Code or Codex sessions in parallel, each in its own git worktree, so a developer could try more than one approach to a task and compare the diffs. The maker called it the first Integrated Vibe Environment. As of the last release, v0.3.5 on 2026-02-26, the README says Crystal has been deprecated and replaced by Nimbalyst, and will get no further updates, bug fixes or security patches. Nimbalyst is a separate, wider product, a multi-editor AI workspace with Markdown, spreadsheets and diagrams, not just parallel coding sessions, built by the same team, with its own repository at github.com/Nimbalyst/nimbalyst. The Crystal repository still works and is still MIT licensed. The deprecation claim is confirmed in the code, not just the marketing: README.md, CHANGELOG.md, and main/src/ipc/nimbalyst.ts (an IPC handler that opens Nimbalyst from inside Crystal) all point the same way.

## 2. Mapping to our five planes

| Plane / principle | What Crystal does | What we do | Verdict |
|---|---|---|---|
| Signals | A human types a prompt to start a session. No issue, alert or telemetry intake | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | we lead |
| Control plane | Local SQLite (projects, sessions, session_outputs, conversation_messages, execution_diffs, prompt_markers) plus a Bull queue in the same process, no budgets, no approvals beyond per-call permission dialogs | factoryd with a Temporal workflow per task, Postgres, YAML policy via Flux, budgets and approvals | we lead |
| Worker plane | Spawns the real Claude Code or Codex CLI directly on the host inside a dedicated worktree (worktreeManager.ts), no container or VM of its own | Kubernetes namespace and gVisor pod per task, read-only root FS, default-deny egress | we lead on isolation, they lead on session ergonomics |
| Verification | A manual per-project run script (runCommandManager.ts) and a diff view, no CI, no gates | Forgejo Actions on gVisor runners, policy gates, stronger-model review | we lead |
| Merge and deploy | UI buttons for rebase, squash-rebase, merge and archive (ipc/git.ts, commitManager.ts), a human clicks merge directly, no bot, no deploy | Bot merge after approval or auto rule, Flux deploy, staged rollout with an alert-free window | we lead |
| Policy outside the model | None. Approval is a live dialog per tool call, decided by whoever is watching, not a document | Capability rules as YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | One identity, the developer's own local CLI login, used for every session | A projected, task-scoped ServiceAccount token verified by factory-gateway | we lead |
| Artifacts not chat | conversation_messages, the chat and tool-call transcript, is the primary record, sessions only share work through worktrees a human wires up | TaskBrief in, branch, PR and normalised event stream out | we lead, partial credit for execution_diffs and prompt_markers as structured records |

## 3. Architecture and stack

Electron app, main/src (Node and TypeScript, Express API, IPC handlers) and frontend/src (React, Zustand, XTerm.js). better-sqlite3 for storage, bull for the local task queue (services/taskQueue.ts, simpleTaskQueue.ts), node-pty to run the CLI agents in a pseudo-terminal. services/cliToolRegistry.ts and cliManagerFactory.ts define a pluggable interface (id, capabilities, config schema, panel types, availability check) that Claude Code and Codex are registered against, plus per-tool panel managers under services/panels/codex/. Permission handling is a bridge: services/mcpPermissionServer.ts and permissionManager.ts intercept each tool call over MCP and hold it until a human answers an Electron IPC event, permission:request and permission:respond. services/worktreeManager.ts creates and removes the git worktree per session. package.json lists @anthropic-ai/claude-code, @anthropic-ai/sdk, openai and @modelcontextprotocol/sdk as direct dependencies. An optional cloud connector, services/stravuAuthManager.ts, stravuMcpService.ts, stravuNotebookService.ts, talks to api.stravu.com for a proprietary notebook feature, entirely separate from running agents.

## 4. UX

The sidebar lists projects and sessions, the main pane has tabs per session (screenshots/screenshot-create.png, -diff.png, -run.png show create, diff and run views). Starting work is one prompt box, no spec or ticket needed. Diffs are computed once (gitDiffManager.ts) and stored in execution_diffs, so switching sessions does not recompute git state. A user intervenes by answering the inline permission dialog for the exact tool call in question, editable input included, not just an accept-all switch. There is no web or CLI mode and no API, it is a single local desktop app, and every capability assumes the human is watching in real time.

## 5. Security, identity, sandbox, policy, cost

Sandbox: none of Crystal's own. The agent process runs as the developer's own OS user. preload.ts and codexPanelManager.ts expose a sandboxMode field (read-only, workspace-write, danger-full-access) but that is Codex's own built-in sandbox passed through unchanged, not something Crystal enforces. Identity: one login, the developer's Claude Code or Codex CLI credentials, shared by every session, no token issuance, no scoping. Policy: entirely the live human permission dialog, nothing codified, nothing enforced outside the model's own tool-call boundary. Cost: the changelog mentions token usage parsing for display only, there is no cap, hold or ledger anywhere in the source.

## 6. What we should take from it

Narrow: the diff view as stored rows (execution_diffs) and the per-tool-call permission dialog with editable input are both concrete, small, and land directly on our named console gap, no diff view and no per-task real-time stream. The cliToolRegistry interface is worth reading end to end against our Go Harness interface, since it enumerates config fields, model, provider, thinking level, approval policy, sandbox mode, web search, per CLI tool that we may be missing for opencode or Codex.

Broad: Crystal is proof that the parallel-session, compare-and-pick UX is popular, 3.1k stars, real usage, an active successor, even with zero server-side control plane. It is a reminder that our console's kanban view could borrow the several-attempts-side-by-side-with-instant-diff pattern for cases where a task is cheap enough to run twice.

## 7. Where our philosophy differs and what that costs or buys us

Crystal buys frictionless local UX by giving up every one of our security principles: no sandbox, no policy outside the model, no per-task identity. That trade only works because it assumes one trusted developer on their own machine, not a fleet of disposable agents acting for many repositories and issues. Adopting its worker-plane model would violate our no-direct-credentials and default-deny egress requirements immediately. Where it is genuinely ahead of us, the diff and permission UX, we can copy the pattern without copying the trust model, since our gateway can still enforce policy behind the same kind of inline approval dialog.

## 8. Red flags and slop assessment

Deprecated February 2026, no further updates, bug fixes or security patches promised, superseded by Nimbalyst, a differently scoped commercial product from the same team. That is a real maintenance stop, not a rename in name only, the successor's repository, feature set and even licence history (Nimbalyst launched closed source, went MIT only in late April 2026) diverge from Crystal. No security incidents found. No licence change on Crystal itself, MIT throughout. The optional Stravu cloud connector is proprietary but strictly additive, it does not gate any core session or agent feature.

## 9. Sources

- https://github.com/stravu/crystal (WebFetch, 2026-09-29)
- gh api repos/stravu/crystal (2026-09-29)
- gh api repos/stravu/crystal/contributors (2026-09-29)
- WebSearch: Crystal stravu Nimbalyst deprecated open source license (2026-09-29)
- WebSearch: Stravu company Crystal Claude Code founder funding (2026-09-29)
- Clone: ~/repos/market-research-clones/crystal, HEAD at clone time v0.3.5, last commit 2026-02-26
- README.md
- CHANGELOG.md
- package.json
- docs/CRYSTAL_ARCHITECTURE.md
- main/src/services/ directory listing, permissionManager.ts, cliToolRegistry.ts, stravuAuthManager.ts read in full or in part
- main/src/ipc/ directory listing, codexPanel.ts read in part
- main/src/services/panels/codex/codexPanelManager.ts, grep for sandboxMode
- screenshots/ directory listing
