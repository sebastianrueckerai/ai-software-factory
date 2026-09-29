---
name: Cline
slug: cline
url: https://cline.bot
repo: https://github.com/cline/cline
category: coding-harness
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: local CLI, VS Code/JetBrains extension or desktop app, self-hosted hub daemon; optional SaaS dashboard (app.cline.bot) and WorkOS SSO for Enterprise governance
company: Cline Bot Inc, Sacramento CA, founded 2024 by Saoud Rizwan. $32-37M seed and Series A (Emergence Capital, Pace Capital, July 2025), about $110M post-money
maturity: 69,543 stars, 7,548 forks, 1,484 open issues, created 2024-07-06, last commit 2026-09-29 (commits land daily), weekly-ish releases
similarity: 2
axes:
  signals_intake: 1
  control_plane: 2
  sandbox_isolation: 1
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 2
  ux: 4
  reseedable_selfhost: 3
steal:
  - Hub-spoke session architecture: a singleton local daemon (the hub) owns session state and event routing, spoke worker processes run the agent loop, and any number of clients (CLI, IDE, Telegram) attach over WebSocket and can disconnect and reattach mid-task without killing the run.
  - Kanban's ephemeral git worktree per task, with gitignored directories like node_modules symlinked in from the main checkout, so parallel tasks never fight over install time or files, only a real container boundary is missing.
  - Checkpoint-scoped diffs: the review view can show the diff for one message range instead of only the full cumulative diff, and a click on a diff line sends an inline comment back to the agent as steering feedback.
  - Subagents are a hard-permissioned read-only role (read_file, list_files, search_files, list_code_definition_names, read-only execute_command, use_skill only, no writes, no browser, no MCP, no nested subagents) with cost tracked per subagent and rolled into the parent task total.
  - A resume ID survives after a task card is trashed, so a finished or abandoned session can be picked up again later.
  - The OpenTelemetry event vocabulary (agent_created, tool_usage, model_api_call, session_ended) is a reasonable starting taxonomy for our own SigNoz task events.
differs:
  - Policy lives inside the model. The requires_approval flag on a shell command is a field the LLM itself sets when it proposes the tool call, not a rule enforced by infrastructure. Our principle is the opposite: capability must be enforced in gateway code and network policy, never left to a prompt or the model's own judgement.
  - No per-task credential scoping. A provider API key (or an enterprise-routed equivalent) is configured once per user or org and used directly by whichever session runs, with no audience-scoped, short-lived, per-task token and no forced key rotation between tasks.
  - The unit of execution is a long-lived hub daemon plus worktrees on the user's own machine or CI runner, not one disposable, non-root, default-deny-egress sandbox per task. Multi-client convenience and session persistence are bought at the cost of the isolation boundary we require.
ux_verdict: The strongest thing in this report. A kanban board with parallel worktrees, checkpoint diffs, inline comments and phone access over Tailscale beats our console on every UX axis we admit to being weak on, but it assumes a trusted single operator, not our multi-project, multi-human approval model.
slop_verdict: Real and heavily used (69.5k stars, funded, enterprise customers named), but the 2026 security record (a supply-chain compromise plus two critical WebSocket RCEs) shows the "let the model judge risk, run on the host" model failing in production, not just in theory.
---

# Cline

## 1. What it is

Cline is an open-source coding agent shipped as a VS Code and JetBrains extension, a CLI (npm i -g cline), a macOS/Windows desktop app, and a TypeScript SDK (@cline/core, @cline/agents, @cline/llms). Cline Bot Inc sells an Enterprise layer on top: SSO, RBAC, remote configuration, OpenTelemetry export and prompt-storage backup, aimed at platform teams rolling AI coding out to many developers who bring their own model contracts (AWS Bedrock, Vertex, Azure OpenAI, direct Anthropic or OpenAI keys).

The makers describe it as "the coding agent millions of developers trust", built so "your code never leaves your environment". The repository backs part of that up: the core loop, CLI, SDK and IDE extensions are Apache-2.0 and run entirely on the user's machine or CI runner. It does not back up the SSO and central dashboard claim, since app.cline.bot and the WorkOS-backed identity plane are not in this repository, so that part is a SaaS dependency layered on an otherwise local tool.

## 2. Mapping to our five planes

| Plane / principle | What Cline does | What we do | Verdict |
|---|---|---|---|
| Signals | No built-in intake. A documented sample workflow (docs/cli/samples/github-integration.mdx) wires an @cline mention in a GitHub issue comment to a GitHub Actions job that runs the CLI headless | Forgejo webhooks and alerts feed a durable task registry automatically | we lead |
| Control plane | A local hub daemon persists sessions (SQLite index plus JSON snapshot per session at ~/.cline/data/sessions/) and a cron-like scheduler (sdk/packages/core/src/cron), but there is no cross-task registry, budget or approval state | factoryd runs one Temporal workflow per task with policy, budgets and approvals in Postgres | we lead |
| Worker plane | The agent runs in-process or in a spoke worker on the same machine as the hub; Kanban isolates concurrent tasks with a git worktree each, not a sandboxed pod | One gVisor pod per task, non-root, read-only root FS, default-deny egress | we lead |
| Verification | Kanban's diff and checkpoint view is for a human, not a gate. No CI, no policy evaluation, no model review step is built in | Forgejo Actions, policy gates, then a stronger-model review before merge | we lead |
| Merge and deploy | Kanban can commit to the base branch or open a PR itself, on a dynamic prompt to the agent | Bot merge only after a whitelisted human approval or an auto rule for reproduced, strictly-improving changes | not comparable, different trust model |
| Policy outside the model | The model sets its own requires_approval flag per command; Auto Approve and YOLO mode are client-side toggles, not infra enforcement | Capability rules are a Git document enforced in gateway code and network policy | we lead |
| Identity per task | One long-lived provider key (or enterprise-routed inference) per user, used directly by whatever session runs | A projected, audience-scoped ServiceAccount token per task, verified by factory-gateway | we lead |
| Artifacts not chat | The hub streams a live chat-and-tool-call transcript to every attached client; git worktrees and PRs are the output, but coordination itself is a shared conversation | TaskBrief in, PR and event stream out, no live chat coupling between agents | not comparable |

## 3. Architecture and stack

TypeScript throughout, Bun workspaces (package.json workspaces list sdk/packages/*, apps/*). The SDK splits into sdk/packages/core (ClineCore, session, hooks, cron scheduler, auth), sdk/packages/agents (agent-runtime.ts, the tool loop), sdk/packages/llms (DefaultGateway, a provider-agnostic model catalog and streaming client, docs/sdk/reference/gateway.mdx), and sdk/packages/shared/ui. apps/cli, apps/vscode and apps/cline-hub are the three shipped clients. A new "kanban" surface (docs/kanban/) is a local web app bound to 127.0.0.1:3484 by default, backed by ephemeral git worktrees per task card.

Session state is local: a SQLite index plus one JSON file per session under ~/.cline/data/sessions/, discovered through lock files at ~/.cline/locks/hub/owners/. There is no durable workflow engine, database or queue; backendMode in ClineCore.create() can be local (in-process, no hub), hub (local daemon required) or remote (an operator-run WebSocket hub for cloud deployments), which is the closest Cline gets to our control plane. Model access goes through DefaultGateway, a routing and catalog layer over provider SDKs, comparable in shape to LiteLLM but embedded in the product rather than a standalone proxy.

## 4. UX

Zero to first result is npm i -g cline then cline "do X", one command, auto-approve on by default for CLI runs. The IDE extensions add a sidebar chat with per-tool approval prompts. Kanban is the multi-agent surface: click play on a card, Kanban makes a worktree, the card shows the agent's latest message or tool call live, click the card for the full TUI transcript plus a diff view with checkpoint-scoped ranges and inline comments. Intervention is either an approval click, an inline diff comment, or editing the task text. Remote access (phone, second machine) is documented through Tailscale, SSH tunnel, ngrok or Cloudflare Tunnel, all binding the same local server rather than a hosted product.

This beats our console on every axis we list as weak: it has a real diff view, real-time tool-call streaming per card, and a mobile path. It is worse on multi-project and multi-human scale: Kanban is one operator's board on one machine, with no organisation-level approval queue, project registry or per-project cost view.

## 5. Security, identity, sandbox, policy, cost

Security is enforced by client-side settings, not infrastructure: Auto Approve is a set of per-category toggles evaluated per tool call, and the model itself marks each shell command requires_approval (docs/features/auto-approve.mdx: "Cline does not use a fixed allowlist"). YOLO mode disables all of it. Enterprise adds SSO through WorkOS AuthKit and a three-tier RBAC (Member/Admin/Owner), but that governs who can use Cline and configure it, not what a running agent may touch.

Identity is a single provider API key or an enterprise-routed inference credential, held by whichever process runs the session, no per-task scoping or rotation. There is no sandbox: the agent runs with the permissions of the user's own machine or CI runner, and Kanban's worktrees isolate files between concurrent tasks but not network or process access. Cost control is manual (maxTokensPerTurn, maxIterations in the SDK) plus an Enterprise dashboard that reports spend per team and per model after the fact, not a pre-call hold or hard cap.

## 6. What we should take from it

Narrow: the hub-spoke split (coordinator daemon, execution worker, thin attachable clients) is a clean shape for making our console show a live tool-call stream without coupling it to the worker pod's lifecycle. The subagent permission model (read-only tool subset, no nesting, cost rolled up to the parent) is a good template if we ever add a read-only analyzer capability class. Checkpoint-scoped diffs and inline review comments are a concrete UX target for the diff view our own weak-points list says we lack.

Broad: Kanban proves that git worktrees plus symlinked dependencies make cheap, fast, per-task parallelism without a container per task, useful for cases where full sandbox isolation is not the point (for us, that is never, since our threat model assumes untrusted or semi-trusted task inputs). The "resume ID" for a completed or abandoned task is a small but real gap in our own design, where session records exist but nothing lets a human casually reopen one from the console.

## 7. Where our philosophy differs and what that costs or buys us

Cline's core bet is that the developer is the trust boundary: one operator's machine, one operator's keys, the model's own judgement on what needs approval. That is fast and frictionless for that operator, which is exactly why its UX outscores ours. It cannot satisfy our principle that policy lives outside the model, because Cline's only per-call gate is a field the model fills in about its own request. Copying that model literally would break our security constraint outright.

Where Cline is a genuinely better trade for us is coordination UX for a single human watching several agents at once, since our worker plane already isolates by task and by sandbox, and nothing stops us from putting a hub-spoke-shaped live view in front of it without adopting Cline's trust model underneath.

## 8. Red flags and slop assessment

Real usage and real funding (69.5k stars, $32-37M raised, named enterprise pilots including Samsung), but 2026 was a bad security year for exactly the design gap this report flags. In February 2026 a prompt injection in a GitHub issue title ("Clinejection", disclosed by researcher Adnan Khan) reached Cline's own CI, stole an npm publish token, and pushed a malicious cline@2.3.0 that silently ran npm install -g openclaw on every machine that installed it during a roughly 8-hour window (Snyk, the Register, StepSecurity). Cline's own postmortem is candid: "giving an LLM shell access in a CI context where it processes untrusted input is functionally equivalent to giving every GitHub user shell access", which is the trust-boundary problem our design handles with sandboxed runners and untrusted-input marking. Two further CVEs followed: CVE-2026-44211, a Kanban WebSocket server with no Origin validation on 127.0.0.1:3484 (CVSS reported as 9.3-9.7 by different outlets), and CVE-2026-59723, a dashboard WebSocket RCE from missing origin checks plus an implicit-trust fallback when ROOM_SECRET is unset, fixed in CLI v3.0.30. None of this is spin-only marketing risk, it is the predicted failure mode of "policy inside the model, no sandbox" showing up in the wild. Governance features (SSO, RBAC, OTel export, prompt storage) are open-core: gated behind a paid Enterprise tier and a SaaS dashboard not present in this Apache-2.0 repository.

## 9. Sources

- /home/womb/repos/market-research-clones/cline (shallow clone, HEAD at last commit 2026-09-29)
- README.md
- package.json
- apps/cli, apps/vscode, apps/cline-hub, sdk/packages/core, sdk/packages/agents, sdk/packages/llms, sdk/packages/shared, sdk/packages/ui (directory listings and key files)
- docs/kanban/core-workflow.mdx
- docs/kanban/remote-access.mdx
- docs/enterprise-solutions/overview.mdx
- docs/enterprise-solutions/sso-setup.mdx
- docs/features/auto-approve.mdx
- docs/features/subagents.mdx
- docs/sdk/architecture/hub-spoke.mdx
- docs/sdk/reference/gateway.mdx
- docs/sdk/guides/going-to-production.mdx
- docs/mcp/mcp-overview.mdx
- docs/cli/cli-reference.mdx
- docs/cli/samples/github-integration.mdx
- docs/enterprise-solutions/monitoring/telemetry.mdx
- LICENSE, apps/vscode/LICENSE
- https://cline.bot/enterprise (fetched 2026-09-29)
- gh api repos/cline/cline (fetched 2026-09-29)
- https://snyk.io/blog/cline-supply-chain-attack-prompt-injection-github-actions/ (2026)
- https://www.theregister.com/2026/02/20/openclaw_snuck_into_cline_package/ (2026-02-20)
- https://www.stepsecurity.io/blog/cline-supply-chain-attack-detected-cline-2-3-0-silently-installs-openclaw (2026)
- https://cybersecuritynews.com/cline-ai-agent-vulnerability/ (2026)
- https://gbhackers.com/cline-ai-agent-flaw-launch-rce-attacks/ (2026-05)
- https://www.sentinelone.com/vulnerability-database/cve-2026-59723/ (2026-07)
- https://cline.bot/blog/cline-raises-32m-series-a-and-seed-funding-building-the-open-source-ai-coding-agent-that-enterprises-trust (2025-07-31)
- https://sacra.com/c/cline/ (fetched 2026-09-29)
