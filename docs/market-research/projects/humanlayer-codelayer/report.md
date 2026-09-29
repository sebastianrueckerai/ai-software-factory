---
name: HumanLayer and CodeLayer
slug: humanlayer-codelayer
url: https://humanlayer.dev
repo: https://github.com/humanlayer/humanlayer
category: multi-agent-ui
license: "mixed: Apache-2.0 (deprecated open-source repo), proprietary (current hosted product)"
open_source: partial
self_hostable: yes
hosting_model: self-hosted desktop app and local daemon (deprecated); successor is closed SaaS plus bring-your-own compute
company: HumanLayer Inc, founded 2023 by Dexter (Dex) Horthy (CEO, ex-Replicated) and Kyle Mistele (CTO), YC Fall 2024, San Francisco, about USD 3M raised per the company's own jobs page (YC, Pioneer Fund, angels; third-party trackers cite a lower seed figure, unverified)
maturity: 11,622 stars, 957 forks, 28 contributors, 49 open issues, first commit 2024-08-05, real development through 2026-01-07, one deprecation-only commit 2026-06-19, silent since (checked 2026-09-29)
similarity: 2
axes:
  signals_intake: 0
  control_plane: 2
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 3
steal:
  - The request_approval MCP tool pattern: wire Claude Code's own permission_prompt_tool hook straight to an external daemon endpoint, so escalation happens at the exact point a tool would otherwise run.
  - The RPI slash-command files (research_codebase.md, create_plan.md, implement_plan.md) as a ready template for a plan-review gate: versioned prompts that force research and plan into written artifacts before any code.
  - The hierarchical hotkey-scope stack (HotkeyScopeBoundary, scopeManager) for a keyboard-first console, so approval views and session views never fight over the same keys.
  - Surfacing cost_usd and total_tokens directly in per-task state from day one, taken straight from the harness's own self-reported totals, instead of bolting cost visibility on later.
  - Git worktrees as the concrete unit of parallel agent workspace on one host (hack/create_worktree.sh, launch -w DIRECTORY), proven workable even if unpolished.
differs:
  - They treat the operator's own workstation as the trust boundary, filesystem permissions are the entire security model; identity-per-task and sandbox-isolation are incompatible with that at the core, so we can copy the interaction pattern, not the deployment shape.
  - Approvals never time out and carry no policy content beyond one human decision; a durable control plane needs default decisions, multiple channels and an audit trail behind the same tool call.
  - Every session starts from a human-typed query, there is no signals plane at all, copying their UX still leaves the entire intake side of our loop to build ourselves.
ux_verdict: The best-built part of the project, a fast keyboard-driven desktop console with real approve, deny and fork controls, undercut by running with zero sandboxing on the operator's own machine.
slop_verdict: Real and used in anger for about seventeen months, then abandoned in place rather than removed, real commits stop 2026-01-07, a lone deprecation commit lands 2026-06-19, and the maker's own README now points users to a closed, paid rebuild.
---

# HumanLayer and CodeLayer

## 1. What it is

HumanLayer began as a human-in-the-loop approval SDK for AI agents, then rebuilt itself twice. It first became CodeLayer, an open-source desktop UI for running Claude Code sessions through a Research-Plan-Implement (RPI) workflow. It has since become a closed, paid product the maker calls "the multiplayer control plane for your software factory." The repository this report examines, github.com/humanlayer/humanlayer, holds only the middle phase, and its own README now calls that code deprecated.

HumanLayer Inc was founded in 2023 by Dexter (Dex) Horthy, previously at Replicated, joined later by Kyle Mistele as CTO. The company went through YC in Fall 2024 and is based in San Francisco. Its jobs page states its mission as helping engineering organisations move toward "99% AI-written code" and cites about USD 3M raised from YC, the Pioneer Fund and angels. Horthy is also the author of "12-Factor Agents," a separate, much larger (about 23,500 stars) open-source principles document that is itself stale, last pushed September 2025.

What the README says: "public issues repo for humanlayer, the code here is pretty much all deprecated, you can try the rebuild of humanlayer at https://humanlayer.com, thanks for all your support, dex." What the repository actually shows: a real, working two-part system, a Go daemon (hld) and a Tauri and React desktop UI (humanlayer-wui), wired together over a Unix socket, developed actively for about seventeen months before that notice appeared.

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Nothing. A session starts only when a human types a query into the WUI or CLI (launchSession, query field required in hld/PROTOCOL.md). No issue tracker, alert or telemetry intake exists anywhere in the code. | Issues, telemetry and alerts feed the control plane as work sources. | we lead |
| Control plane | A single local SQLite store (hld/store/store.go) holds sessions and approvals. The hld daemon schedules nothing beyond spawning Claude Code processes and exposes state over JSON-RPC. Single user, single machine, no multi-tenant queue. | Durable task state, scheduler, policy, approvals, model choice, cost and audit, across many tasks on a cluster. | we lead |
| Worker plane | No sandbox at all. hld runs Claude Code as a subprocess with the operator's own OS privileges and inherited shell environment. PROTOCOL.md: "the daemon runs with the same privileges as the user who started it." | Disposable per-task sandboxes, ephemeral workspace, constrained network, temporary credentials. | we lead |
| Verification | No CI, no automated gate. The RPI convention substitutes a human plan review (.claude/commands/create_plan.md) before implementation starts, a real but purely procedural checkpoint with nothing enforcing it. | Tests, security scanning, stronger-model review and policy evaluation before merge. | we lead |
| Merge and deploy | Out of scope. CodeLayer edits a working tree or worktree and stops there, no PR, merge or deploy step of its own. | Verified output passes to merge and deploy, telemetry feeds back into signals. | we lead |
| Policy outside the model | Real but thin. The request_approval MCP tool (hld/mcp/server.go) is wired into Claude Code's own permission_prompt_tool hook, so the model cannot silently skip a flagged call. No rule engine sits behind it, one human decision is the whole policy. | Capability rules enforced in code or network, independent of what the model decides to do. | equal |
| Identity per task | None. One OS identity, the operator's own, covers the daemon, the agent process and every credential it inherits. | Short-lived, task-scoped credentials, no standing keys within an agent's reach. | we lead |
| Artifacts not chat | Strong. Research and plan documents are literal markdown files, kept in a separate git-based "thoughts" repository synced with humanlayer thoughts sync, reviewed and edited by a human before implementation starts. | Agents exchange artifacts, not chat. | equal |

## 3. Architecture and stack

CodeLayer is a Go daemon plus a Tauri and React desktop app talking JSON-RPC over a Unix socket, built for one developer on one machine, not for a fleet.

The daemon, hld, is Go 1.24 (hld/go.mod). Key dependencies: mark3labs/mcp-go for the MCP server, mattn/go-sqlite3 for the local store, gin-gonic/gin, r3labs/sse/v2, spf13/viper for config. The go.mod still carries replace directives pointing at a now-deleted ../humanlayer-go module, a leftover from before the SDK was removed. The UI, humanlayer-wui, is a Tauri app: a Rust bridge (src-tauri/src/daemon_client) wraps a React and TypeScript frontend, following a documented layering (humanlayer-wui/docs/ARCHITECTURE.md): daemon client (pure protocol) below hooks (state and enrichment) below components (presentation only).

The protocol is line-delimited JSON-RPC 2.0 over a Unix domain socket at ~/.humanlayer/daemon.sock, permissions 0600 (hld/PROTOCOL.md). Methods: launchSession, listSessions, getSessionState, continueSession, getConversation, fetchApprovals, sendDecision, Subscribe (long-poll, 30-second heartbeat). A separate CLI and MCP client, hlyr, talks to the daemon; the original humanlayer-go and humanlayer-ts SDKs that once routed approvals through a hosted Cloud API were deleted wholesale in pull request 646, merged 2025-09-29, titled "Clean up humanlayer sdk stuff, this is codelayer now." Model routing is a bare string: launchSession takes model set to opus or sonnet and passes it straight to the Claude Code invocation, no gateway, no per-model cost policy.

Deployment is a signed desktop binary plus a go install-able daemon, not a Helm chart or SaaS. Community forks were still cutting CodeLayer nightly builds as late as 28 September 2026 (brew install with the codelayer-nightly cask), which keeps the tool usable but is not the maker's own doing.

The repository also contains an unrelated, half-built Bun and Turborepo scaffold, apps/daemon, apps/react, packages/contracts, packages/database, plus a Yjs and ElectricSQL collaborative-editor setup (apps/react/YEJS_SETUP.md) and a Postgres schema for shared notes (y-schema.sql, tables notes, notes_operations, ydoc_awareness). Commit timestamps place this in a roughly two-week burst in October 2025. Every README in it is unedited bun init boilerplate. This is plausibly an early prototype of the closed product's collaboration layer, left behind rather than finished or removed.

## 4. UX

The UX is the strongest part of the project, a fast, keyboard-first desktop console for watching and approving Claude Code sessions, with real approve, deny and fork controls, scoped to one operator on one machine.

Onboarding, per docs/introduction.mdx: install via a script or Homebrew, run humanlayer launch, the WUI auto-launches the daemon if it is not already running. From the docs alone this is roughly four or five steps to a first running session (install, launch, type a query, approve the first tool call, see a result). This count is not verified by running the code, per the analyst brief's rule against executing cloned code, and no screenshots were captured or viewed, this description comes from the documentation and the hotkey reference, not from images.

The session list supports vim-style navigation (J and K to move, G,G and Shift+G to jump, Enter to open, humanlayer-wui/docs/HOTKEYS.md). The session detail view has direct approve (A) and deny (D) keys, Ctrl+X to interrupt a running session, Cmd+Y to fork, Option+A to toggle auto-accept edits, Option+Y to toggle bypass-permissions. The scope system behind this, HotkeyScopeBoundary and a scopeManager stack, is a deliberately layered design (global, root, per-view, per-modal scopes) that stops background shortcuts firing inside a modal, a pattern worth studying independent of the rest of the project's fate.

Two auto-accept mechanisms exist, DangerouslySkipPermissions (with an optional expiry) and AutoAcceptEdits (scoped to edit-type tools via isEditTool). Both bypass the approval flow entirely and are session-level toggles a user flips, not a policy decision made for them.

Worktrees are a manual convention, not a built-in feature: hack/create_worktree.sh plus humanlayer launch with a -w flag and a directory. The docs FAQ says built-in worktree management is "coming, you can ask Claude to do that," meaning it never shipped natively in the tool itself.

Set against our own console, CodeLayer reacts faster to a single running agent, local, sub-second approve and deny keystrokes, but has no fleet view, no cross-machine visibility and no queue of tasks waiting on a human. We need the fast single-session interaction pattern more than we need the multi-user features CodeLayer never finished.

## 5. Security, identity, sandbox, policy, cost

Security and sandbox: there is none. hld/PROTOCOL.md states plainly, "No authentication is required as security is handled by filesystem permissions" and "the daemon runs with the same privileges as the user who started it." A 0600 Unix socket is the entire access-control model. No sandbox, no network egress control and no privilege separation exist anywhere in hld/.

Identity: one identity, the operator's own OS user, covers everything. hld/config/config.go still defines APIKey and APIBaseURL fields marked "for future phases," dead weight left from the deleted Cloud API SDK, unused by the current local-only approval flow.

Policy: the entire policy surface is one MCP tool, request_approval (hld/mcp/server.go), which blocks a tool call until a human clicks approve or deny in the WUI. No rules, no roles and no rate limits sit behind it, and approvals have no timeout, the source contains a commented-out five-minute timer block and the comment "For the moment, we don't timeout approvals." An approval can sit unresolved indefinitely.

Cost: getSessionState returns cost_usd and total_tokens per session, visibility only, taken from Claude Code's own self-reported totals. No cap, no budget and no hold exist anywhere in the daemon or its config.

## 6. What we should take from it

Narrow, copyable this month: the request_approval MCP tool pattern, wiring Claude Code's permission_prompt_tool hook straight to an external daemon endpoint, is a clean way to place escalation-as-a-tool-call at the exact point a tool would otherwise run. We would still need to add the policy engine, timeout and audit trail this project never built, but the interception mechanism itself is worth copying directly. The RPI slash-command files, research_codebase.md, create_plan.md, implement_plan.md, are a ready template for a plan-review gate, versioned prompts that force research into a written artifact before any plan and a plan into a written artifact before any code. The hotkey-scope stack, HotkeyScopeBoundary and scopeManager, is worth lifting for our own console so approval and session views do not fight over the same keys. Surfacing cost_usd and total_tokens directly in per-task state from day one, rather than adding cost visibility later, costs nothing and should be a default from the start.

Broad, shaping priorities: treat "review the plan, not the diff" as a first-class gate rather than a convention enforced only by habit, HumanLayer's own retrospective on where RPI broke down, discussed in section 7, is worth reading before copying it wholesale. A single-operator, single-machine mode is a real and underserved product shape, most of our design assumes a cluster and many concurrent tasks. There may be a case for a stripped-down solo mode of our console, one operator, one daemon, one machine, for local development before a task graduates into the full factory, modelled on how CodeLayer behaves today.

## 7. Where our philosophy differs and what that costs or buys us

A plan-review gate belongs in our loop, but not in the single monolithic-prompt shape HumanLayer first built. Dex Horthy's own account of rebuilding RPI into what he now calls QRSPI names four recurring failures at scale: one overloaded planning prompt, research written with foreknowledge of the intended feature turning into opinion rather than fact, thousand-line plans that take as long to read as the code they produce, and prompts used for control flow that should have been actual control flow. That is a hard-won lesson from a team that ran RPI in anger across YC startups and larger customers, worth taking directly rather than rediscovering ourselves: put the review gate on a short design document with file paths and acceptance criteria, not on raw research or a huge plan. This fits our verification plane cleanly, as an artifact-based gate before the worker plane touches code, and it is the same artifacts-not-chat principle we already hold.

Escalation as a tool call compares well in mechanism and badly in scope. Both designs put a human decision inside the model's own tool-calling loop rather than beside it, in HumanLayer's case literally as an MCP tool the model must call and wait on. That validates the shape as implementable and usable by a small team. But everything downstream of the tool call is thinner than ours needs to be, one channel, no timeout, no policy content beyond a single yes or no, one trust boundary covering the whole machine. Their own predecessor SDK had multiple contact channels, Slack, email, CLI, web, before it was deleted in pull request 646, so even they walked that capability back rather than forward.

Adopting their deployment shape outright would break two of our constraints directly. Security handled by filesystem permissions is the opposite of security without half measures, copying it would mean giving every agent worker the same standing privileges as whoever runs it. Their single-machine, single-operator daemon also cannot be the reseedable, commodity-cluster substrate we need, it is a workstation tool, not infrastructure. We should take the UX and the tool-call mechanism. We should not take the trust model.

## 8. Red flags and slop assessment

Real and well-built for about seventeen months, then abandoned in place rather than removed, a pattern worth treating as a warning for the whole coding-harness-UI category.

The repository was created 2024-08-05 and shows real, sustained activity, 11,622 stars, 957 forks, 28 contributors, 49 open issues (checked via the GitHub API, 2026-09-29). Commits continue through 2026-01-07, then stop. A single commit lands 2026-06-19, replacing the README with the deprecation notice quoted in section 1. Nothing has landed since, over three months of silence as of today. The flagship original feature, approval over Slack or email as a require_approval decorator, was deleted wholesale in that same pull request 646, a whole product generation removed in one merge. Licensing has a small but real discrepancy: the repository's LICENSE file is plain Apache-2.0 (2024, humanlayer Authors), but the GitHub API reports the licence as NOASSERTION, worth rechecking before relying on it.

The live marketing site at humanlayer.dev and humanlayer.com describes a third, different, closed product, the multiplayer control plane for your software factory, built around a QRSPI workflow (Question, Research, Design or Structure, Plan, Implement), priced at USD 100 per user per month for Pro and custom for Enterprise, claiming SOC 2 Type II, and explicitly not yet open source per its own FAQ. This is the rebuild the deprecated README points to. Community forks, for example AlexKer/humanlayer, were still cutting CodeLayer nightly builds as late as 28 September 2026, so some users keep the deprecated tool alive through their own effort, not the maker's. Overall verdict: this was a real, actively used tool, not a README with a landing page, but it is not a going concern today, and the maker's current attention and business model live entirely in a separate, closed repository.

## 9. Sources

- https://github.com/humanlayer/humanlayer (cloned to ~/repos/market-research-clones/humanlayer-codelayer)
- https://github.com/humanlayer/humanlayer/pull/646
- https://github.com/humanlayer/humanlayer/commits (via gh api, paginated)
- https://github.com/humanlayer/humanlayer/contributors (via gh api)
- gh api repos/humanlayer/humanlayer (stars, forks, licence, open issues, created and pushed dates)
- https://humanlayer.dev
- https://humanlayer.com
- https://alexlavaee.me/blog/from-rpi-to-qrspi/
- https://vibecodinghub.org/tools/humanlayer
- https://www.ycombinator.com/companies/humanlayer
- https://github.com/humanlayer/advanced-context-engineering-for-coding-agents
- Web search: CodeLayer HumanLayer deprecated rebuild
- Web search: HumanLayer CodeLayer review Hacker News research plan implement
- Web search: humanlayer QRSPI multiplayer control plane software factory
- Web search: HumanLayer company funding Dexter Horthy raised seed round
- Web search: 12-factor agents humanlayer dexhorthy
- README.md
- LICENSE
- humanlayer.md
- CLAUDE.md
- DEVELOPMENT.md
- hld/go.mod
- hld/approval/types.go
- hld/approval/manager.go
- hld/PROTOCOL.md
- hld/mcp/server.go
- hld/store/store.go
- hld/config/config.go
- docs/introduction.mdx
- docs/workshop.mdx
- .claude/commands/research_codebase.md
- .claude/commands/create_plan.md
- .claude/commands/implement_plan.md
- .claude/commands/create_worktree.md
- humanlayer-wui/README.md
- humanlayer-wui/docs/ARCHITECTURE.md
- humanlayer-wui/docs/HOTKEYS.md
- apps/daemon/README.md, apps/react/README.md, packages/contracts/README.md, packages/database/README.md
- apps/react/YEJS_SETUP.md
- y-schema.sql
- package.json, turbo.json
