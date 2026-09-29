---
name: Vibe Kanban
slug: vibe-kanban
url: https://vibekanban.com
repo: https://github.com/BloopAI/vibe-kanban
category: multi-agent-ui
license: "mixed: Apache-2.0 core, closed billing crate for the Cloud tier pulled from a private repo and stripped from self-host builds"
open_source: partial
self_hostable: yes
hosting_model: local-first single binary or npx CLI on the developer's own machine by default. A separate team/cloud edition (Postgres plus ElectricSQL plus a Caddy relay) can be self-hosted with Docker Compose, or was previously offered as Bloop's own hosted SaaS, which is being wound down with the company.
company: Bloop AI Limited, London. Founded 2021 as bloop, a code-search startup, YC-backed, about 7.4m USD raised across two rounds (Tracxn; Crunchbase and Tracxn disagree on funding stage, not independently verified). Pivoted through a COBOL-modernisation product to Vibe Kanban in 2025. Shut down 2026-04-10 citing no viable business model, product continues as community-maintained open source.
maturity: 28,215 stars, 3,027 forks, 64 contributors, 544 open issues (gh api, checked 2026-09-29). First commit 2025-06-14, last commit 2026-09-19. Weekly-ish releases through v0.1.44 on 2026-04-24, then a 4.5-month gap in the default branch's commit history until 2026-09-15, matching the shutdown timeline, then a short burst of commits and release v0.1.45.
similarity: 2
axes:
  signals_intake: 2
  control_plane: 2
  sandbox_isolation: 1
  verification: 2
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 1
  ux: 5
  reseedable_selfhost: 2
steal:
  - The NormalizedEntry and NormalizedConversation event schema (crates/executors/src/logs/mod.rs): one shape (UserMessage, ToolUse, ErrorMessage, Thinking, TokenUsageInfo, ActionType, ToolStatus including PendingApproval, Denied, TimedOut) that every agent CLI's raw stdout is parsed into before the UI ever sees it. A direct template for what our own Harness event stream should normalise to.
  - WebSocket push for both the diff and the process log (stream_workspace_diff_ws, stream_workspaces_ws) instead of polling, the concrete mechanism to fix our console's own admitted "no live streams, no diff view" gap. htmx's SSE or WS extension could carry the same normalised event JSON with little client code.
  - The StandardCodingAgentExecutor trait shape (spawn, spawn_follow_up, spawn_review, normalize_logs, discover_options, get_preset_options, check_availability): one trait, N adapters, each adapter owning only "build this CLI's command" and "parse this CLI's stdout." Everything else (worktree, diff, streaming, database) stays shared code.
  - Batched inline review comments: a human adds a comment to any line in the diff view, and every comment across every file is collected and sent as one combined follow-up message rather than one round trip per comment.
  - The git-worktree-as-per-task-filesystem-layout convention is worth copying on its own, independent of their lack of process isolation. It can sit inside our own gVisor pod as the working-directory layout, giving branch separation without weakening our sandbox boundary.
  - A per-tool-call approve or deny dialog (ExecutorApprovalBridge) as a fast, in-session path for low-risk actions, kept separate from and smaller-grained than our workflow-state approval, which stays the path for anything that needs an audit trail.
differs:
  - Zero process or network isolation of its own is the opposite of "security without half measures." Any UI pattern we copy has to keep running inside our gVisor pod with default-deny egress, copying their host-trust model along with the UI would break that constraint outright.
  - No credential brokering at all (the operator's own gh, git and model CLI logins are used as-is) is the opposite of "identity belongs to the task, not the machine." Their 30-second zero-setup onboarding is bought with exactly the raw-credential-to-agent path our design forbids.
  - Multi-user only exists in the now-shutting-down Cloud tier, so none of its auth code (JWT, OAuth, a shared bootstrap password) is reusable. We already build our own multi-tenant auth (Forgejo OAuth2) and would keep doing so regardless of anything here.
  - The product stops at "open a pull request." There is no deploy step and no GitOps concept anywhere in the codebase, so copying its UX buys nothing for our re-seedable constraint or our merge-and-deploy plane, that half of our loop has no analogue to study in this project.
ux_verdict: Live WebSocket log and diff streaming, an embedded preview iframe with click-to-component feedback, and batched inline review comments are exactly the three things our htmx console admits it lacks.
slop_verdict: Real and used in anger (28k stars, 64 contributors, a claimed 100,000 PRs and 30,000 active users, an active GitHub debate about its own UX changes), but its commercial backer folded in April 2026, its commit history shows a 4.5-month gap after that, and its Security page's vault, SSO and zeroize claims describe a Cloud backend that is not in the public repository and is itself being deleted.
---

# Vibe Kanban

## 1. What it is

Vibe Kanban is a local-first desktop and web application that runs several coding-agent CLIs (Claude Code, Codex, Gemini CLI, Amp, OpenCode, Cursor, Qwen Code, GitHub Copilot CLI, Factory Droid, Claude Code Router) against a developer's own repositories, one git worktree per task attempt, behind a kanban board used to plan, watch and review the work. It is made by Bloop AI Limited, a London startup that started as an AI code-search engine, pivoted through a COBOL-modernisation product, and landed on this tool in 2025. It installs with a single npx vibe-kanban command or a downloaded binary, needs no account and no API key of its own, and works by shelling out to CLIs the user has already installed and authenticated.

The company shut down on 2026-04-10, citing no viable business model, and announced the product would continue as open source and community-maintained (WebSearch, Bloop's own shutdown post). Bloop's own marketing calls the tool "not a coding agent" but the thing that lets a developer "plan and review the work of AI agents faster, ship more" (vibekanban.com/docs), and claims 30,000 active users and 100,000 pull requests created (vibekanban.com, not independently re-verified). The repository backs the "used in anger" half of that claim: 28,215 stars, 3,027 forks, 64 contributors, and a large, actively evolving Rust and TypeScript codebase, not a thin wrapper around a landing page.

What the marketing does not fully carry into the code is the multi-user, billed side of the product. The Cloud and team edition (shared issue tracking, comments, organisations, SSO) lives in a crates/remote server plus a closed billing crate pulled from a private repository, and per the company's own shutdown notice this whole half is being switched off, leaving the free, single-user, local mode as the long-term product.

## 2. Mapping to our five planes

| Plane or principle | What Vibe Kanban does | What we do | Verdict |
|---|---|---|---|
| Signals | A human creates an issue on the kanban board, or an external system creates one through the MCP tool surface. The now-closing Cloud tier could sync issues from GitHub, GitLab or Azure DevOps. Nothing starts an agent run without a person clicking start, and no telemetry or alert source exists anywhere in the codebase read this session. | Every task is a Forgejo issue, reached by Forgejo webhooks, SigNoz alert webhooks, or the factoryd intake API. Alerts and telemetry are first-class intake sources. | We lead |
| Control plane | A Task, Workspace, Session, ExecutionProcess hierarchy in SQLite (Postgres for Cloud), each with its own status enum. There is no workflow engine, no capability policy, no budget, and no audit trail beyond process logs. One reactive approve or deny gate exists for individual tool calls, for the Codex executor only. | factoryd runs one Temporal workflow per task against Postgres. Policy is a YAML document in Git applied by Flux, approvals are workflow state, and every step carries a time bound. | We lead |
| Worker plane | One OS process per session inside a git worktree, on the same host or container as the server, with the operator's own shell privileges. Nine different agent CLIs are supported behind one Rust trait. | One gVisor-sandboxed pod per task, non-root, read-only root filesystem, default-deny egress, one harness (opencode) behind a Go interface. | Not comparable: they lead on executor breadth, we lead on isolation |
| Verification | Setup and cleanup scripts (lint, format), an optional LLM-driven review agent, and a human diff review with inline comments. Nothing blocks the Create PR button and there is no CI of its own. | gVisor-sandboxed Forgejo Actions runners, then staged policy gates (risk class, migration flag, reproduction at base and head), then a stronger-model review with a strict verdict, before merge is possible. | We lead |
| Merge and deploy | A human clicks Create PR, which wraps the gh CLI. Merge happens on GitHub, outside the app. There is no deploy step or GitOps concept anywhere in the codebase. | Bot merge after a human approval or an auto rule for low-risk, reproduced, strictly improving changes, then a Flux GitOps deploy with a staged, alert-free rollout. | We lead, different scope: they stop at the pull request |
| Policy outside the model | One reactive approve or deny dialog on individual tool calls, for one executor, with no written capability document and no network-layer enforcement. | Capability rules are a document in Git, enforced in gateway code and Cilium network policy. A prompt cannot grant a capability. | We lead |
| Identity per task | Whatever gh, git and model CLI credentials the operator's own account already holds, used directly, not brokered, scoped or minted per task. | A projected, task-scoped ServiceAccount token, checked by the gateway against capability, budget and approval state before any call is forwarded. | We lead |
| Artifacts not chat | Genuinely artifact-based: Task, Session and ExecutionProcess rows, a normalised event log, unified diffs and pull request objects, not a chat transcript. | A TaskBrief goes in, a branch, a pull request and a normalised event stream come out. | Equal |

## 3. Architecture and stack

The backend is a Rust workspace of more than 35 crates (crates/server, crates/db, crates/executors, crates/git, crates/mcp, crates/services, crates/remote, several crates/relay-*, crates/tauri-app, and others), built on Axum for HTTP and WebSocket routing, SQLx against SQLite for the local product and Postgres plus ElectricSQL for the Cloud edition, git2 (libgit2 bindings) for every git operation, tokio as the async runtime, rmcp for the MCP server, and enum_dispatch behind a CodingAgent enum that switches between executor implementations. ts-rs generates TypeScript types from the Rust api-types crate so the frontend and backend share one schema (crates/api-types, AGENTS.md build notes).

The frontend is a React and TypeScript single-page app split into packages/local-web, packages/remote-web, a shared packages/web-core, and a packages/ui component library, built with Vite and Tailwind.

The Dockerfile shows the whole local deployment shape: a three-stage build, a node:24-alpine stage that builds packages/local-web with pnpm, a rust:1.93-slim-bookworm stage that compiles one server binary, and a debian:bookworm-slim runtime stage that runs that binary as a non-root appuser (uid 10001) under tini, exposing port 3000 with a /health endpoint. The self-hosted local product is one static binary with the frontend assets baked in, no separate services to run. A crates/tauri-app crate also exists in the workspace for a desktop build, not verified whether this is currently published as a downloadable app.

The Cloud and team edition is architecturally separate: a crates/remote Axum server against Postgres, kept in sync with local desktop apps through ElectricSQL's logical replication (a "txid handshake" pattern documented in crates/remote/AGENTS.md), JWT sessions, OAuth through GitHub or Google, or a single shared "bootstrap local auth" credential pair for smaller self-hosted teams (docs/self-hosting/deploy-docker.mdx), plus its own family of relay and tunnel crates (relay-control, relay-hosts, relay-protocol, relay-tunnel-core, relay-webrtc, relay-ws) built to expose a developer's local dev-server preview to teammates over WebRTC without opening an inbound port.

Vibe Kanban does not talk to any model directly. Every agent is a third-party CLI the operator has already installed and authenticated (claude, codex, gemini, amp, opencode, cursor-agent, qwen, and others, per docs/supported-coding-agents.mdx). Vibe Kanban spawns that CLI as a child process, feeds it the task text, and parses its native stdout or JSONL into the shared NormalizedEntry schema. There is no API key handling, model routing or gateway of its own anywhere in the crates read this session, and no model-provider SDK appears in the Cargo manifests.

## 4. UX

Vibe Kanban's UX is its strongest asset, and the one part of this report worth close, literal imitation: live streaming logs and diffs, an embedded live preview, and batched inline review comments, all things our own console currently lacks.

Onboarding runs npx vibe-kanban or a downloaded binary, which starts one local server and opens a browser tab, no account and no sign-up screen. From there: connect a git repository, create a project, write an issue (a title plus a rich-text description that becomes the agent's prompt, docs/issue-management.mdx), then create a task attempt by choosing a coding-agent profile, a variant and a base branch (docs/core-features/new-task-attempts.mdx) and clicking Create Attempt. That is roughly five steps from install to a running agent, all on one screen. The exact click count from a completely fresh machine was not walked through directly in this session and is not verified beyond the documented steps above.

While a session runs, the UI streams a normalised, tool-by-tool log over WebSocket, with a parallel WebSocket stream for the diff (stream_workspace_diff_ws, stream_workspaces_ws in crates/server/src/routes/workspaces/streams.rs), so nothing needs polling. A human can send a follow-up message mid-session, and, for the Codex executor today, approve or deny individual tool calls before they run through the ExecutorApprovalBridge.

Preview Mode is the standout feature. An embedded iframe runs the project's own dev server inside Vibe Kanban, and an optional vibe-kanban-web-companion npm package lets the user click any DOM element in that iframe to hand the agent the exact component hierarchy and source file location, removing "the button in the top right" style descriptions entirely (docs/core-features/testing-your-application.mdx).

When an agent finishes, the task moves itself to an In Review column. The diff view lets a human add a comment to any line with a plus icon, and every comment across every changed file is collected and sent as one combined follow-up message rather than one round trip per comment (docs/core-features/reviewing-code-changes.mdx). Merge is a Create PR button that wraps the gh CLI and opens a normal GitHub pull request. Vibe Kanban never merges anything itself.

The interface is primarily the local web app served by the same binary, plus the MCP tool surface, which is itself a second interface letting an external agent or a human's own Claude Code session create and drive tasks programmatically, and a Tauri desktop build in the workspace. There is no CLI-first or chat-only workflow for a human user.

What is easier than our console is everything about liveness: our server-rendered Go and htmx console has no live log stream and no diff view at all, so this is a direct, well-specified gap to close, not a matter of taste. Multi-agent switching per attempt, drag-and-drop kanban columns, and batched inline review comments are all small mechanisms we do not have. What is worse or missing: no production deploy step, no telemetry-driven intake, and, because everything runs on the operator's own machine with their own credentials, none of the multi-tenant or approval-as-audit-trail concerns our console has to carry.

## 5. Security, identity, sandbox, policy, cost

Sandbox isolation is not something Vibe Kanban provides. container_ref (traced through crates/services/src/services/container.rs) is a plain filesystem path, the worktree directory, not an actual container, VM or namespace. Whatever isolation exists comes from the coding agent CLI itself, for example Codex's own --sandbox flag (ReadOnly, WorkspaceWrite, DangerFullAccess), which Vibe Kanban passes through as a CLI argument (crates/executors/src/executors/codex.rs) without enforcing or verifying it.

Identity and credentials have no authentication layer in local mode. The only access control is an Origin-header check (crates/server/src/middleware/origin.rs, the VK_ALLOWED_ORIGINS setting), a CSRF mitigation, not a login. Any process on the same machine, or any browser presenting the right Origin, can drive the app. The operator's own gh, git and model CLI logins are used directly, not brokered, scoped or minted per task. The Cloud edition adds JWT sessions with GitHub or Google OAuth, or a single shared "bootstrap local auth" pair for smaller self-hosted teams (docs/self-hosting/deploy-docker.mdx), but that whole edition is being wound down with the company.

Policy enforcement in code is limited to the per-tool-call approve or deny dialog (crates/services/src/services/approvals/executor_approvals.rs), reactive rather than declarative, and documented as available for Codex only. There is no written capability policy, no network egress control, and no default-deny found anywhere in the crates read this session.

Cost control is observability only. A Token Usage panel shows consumption per session. No budgets, holds, spend caps or kill switch exist anywhere in the codebase found this session.

There is a clear gap between marketing and code here. vibekanban.com/security claims a "dedicated vault for secrets and keys" with secrets "zeroed from memory after use," OAuth 2.0 with PKCE and Ed25519-signed sessions, and, on the pricing page, SSO and SAML for the Enterprise tier. A grep across every crate for vault, zeroize, saml and sso this session found no matching implementation, only unrelated substring matches and transitive Cargo.lock entries. These claims most plausibly describe Cloud backend infrastructure that is not in this repository and is itself being decommissioned, not the self-hosted code anyone can actually read. Marked as not verified against that backend directly, and as marketing describing a product surface the public repository does not show.

## 6. What we should take from it

Narrow, copyable this month: the NormalizedEntry and NormalizedConversation event schema (crates/executors/src/logs/mod.rs) is a direct template for what our own Harness event stream should normalise to, one shape (UserMessage, ToolUse, ErrorMessage, Thinking, TokenUsageInfo, with ActionType and ToolStatus enums including PendingApproval, Denied, TimedOut) covering every agent CLI's output before the UI sees it. Alongside it, WebSocket push for both the diff and the process log, rather than polling, is the concrete mechanism to close our console's own admitted gap, and htmx's SSE or WS extension could carry the same normalised event JSON with little added client code.

The StandardCodingAgentExecutor trait (spawn, spawn_follow_up, spawn_review, normalize_logs, discover_options, get_preset_options, check_availability) is a usable shape for widening our own Harness interface beyond opencode: one trait, N adapters, each adapter owning only "build this CLI's command" and "parse this CLI's stdout," with everything else (worktree, diff, streaming, database) staying shared code we do not have to duplicate per agent.

Batched inline review comments, where a human comments on any line across any changed file and every comment is sent as one combined follow-up message, is a small, concrete UX pattern worth copying directly into whatever review screen we eventually build. The git-worktree-as-filesystem-layout convention is worth taking on its own, independent of their lack of process isolation, as the working-directory layout inside our own gVisor pod, giving branch separation without weakening the sandbox boundary we already require. A per-tool-call approve or deny dialog is worth adding as a fast, in-session path for low-risk actions, kept smaller-grained than and separate from our workflow-state approval, which stays the path for anything that needs an audit trail.

Broad, a product shape or problem we currently ignore: Preview Mode plus the Web Companion closes a loop we do not close today, from "the agent changed the UI" to "a human points at the exact broken pixel," without describing it in words. Landing this in our design would mean exposing a dev-server route through a short-lived ingress rule scoped to the task's sandbox, not a public relay like theirs. The multi-attempt-per-task model, where a human can retry the same issue with a different agent, model tier or base branch without opening a new issue, is a broader product shape we do not have. It would need its own identity and cost-ledger row per attempt to fit inside our budget and audit design, but the underlying idea, that a task and a worker run are not the same thing, is worth adopting.

## 7. Where our philosophy differs and what that costs or buys us

Zero process or network isolation of its own is the direct opposite of "security without half measures." Any UI pattern we copy has to keep running inside our gVisor pod with default-deny egress, copying their host-trust model along with the UI would break that constraint outright, and nothing about their design changes that calculation.

No credential brokering at all, the operator's own gh, git and model CLI logins used as-is, is the opposite of "identity belongs to the task, not the machine." Their roughly 30-second, zero-setup onboarding is bought with exactly the raw-credential-to-agent path our design forbids. This is a real trade a developer using Vibe Kanban on their own laptop is making, and it is one we should not reproduce even where it would make our own onboarding faster.

Multi-user only exists in the now-shutting-down Cloud tier, so its auth code (JWT, OAuth, a shared bootstrap password) is not reusable for us. We already build our own multi-tenant auth through Forgejo OAuth2 and would keep doing so regardless of anything in this codebase.

The product stops at "open a pull request." There is no deploy step and no GitOps concept anywhere in the code. Copying its UX buys us nothing for our re-seedable constraint or our merge-and-deploy plane, that half of our own loop simply has no analogue to study in this project.

## 8. Red flags and slop assessment

The company behind Vibe Kanban shut down on 2026-04-10, citing no viable business model, and said the product would continue as open source and community-maintained (WebSearch, Bloop's own shutdown post, corroborated by the sunsetting banner still live on vibekanban.com and vibekanban.com/docs). The Cloud and team features (issues, comments, organisations, SSO) are being switched off roughly 30 days after that announcement per third-party coverage found in search results, not independently re-verified against a primary Bloop source beyond the shutdown post itself.

The repository's own commit history backs the slowdown directly: commits land every few days through 2026-04-24 (gh api repos/BloopAI/vibe-kanban/commits), then nothing for four and a half months until 2026-09-15, when a burst of about ten commits landed over five days, followed by release v0.1.45 on 2026-09-19. That gap is the clearest, most concrete maintenance-velocity signal found this session, stronger than any prose claim either way.

Despite the gap, this is not a thin or abandoned project. 28,215 stars, 3,027 forks, 64 contributors, 544 open issues, and a genuinely large Rust and TypeScript codebase all point to real, ongoing use. A GitHub discussion (#2726, found by WebSearch) shows users actively arguing over whether a newer multi-pane UI is worse than the older kanban-only workflow, the kind of opinionated disagreement a real user base has and a landing-page project does not.

The one clear open-core gate found is the billing crate (crates/remote/Cargo.toml, vk-billing feature flag, a git dependency on ssh://git@github.com/BloopAI/vibe-kanban-private), closed and stripped from self-host builds. Since the Cloud and billing product is itself being wound down, this gate is now moot rather than an active lock-in risk for anyone adopting the tool today.

The clearest marketing-versus-code gap is the Security page (vibekanban.com/security): claims of a dedicated secrets vault, memory-zeroed secrets, and SSO/SAML for the Enterprise tier have no matching implementation anywhere in the crates read this session, only unrelated substring matches and Cargo.lock entries for unrelated transitive dependencies. Those claims most likely describe Cloud infrastructure outside this repository, not the self-hosted product most users actually run, which as documented above has no authentication at all beyond an Origin-header check. No CVEs or security advisories for this project turned up in this session's searches.

## 9. Sources

https://vibekanban.com
https://vibekanban.com/docs
https://vibekanban.com/security
https://vibekanban.com/pricing
https://vibekanban.com/blog/shutdown
WebSearch: Vibe Kanban BloopAI review vs comparison 2026
WebSearch: Bloop AI company bloop.ai funding founded London vibe kanban
gh api repos/BloopAI/vibe-kanban
gh api repos/BloopAI/vibe-kanban/commits
gh api repos/BloopAI/vibe-kanban/releases
gh api repos/BloopAI/vibe-kanban/contributors
~/repos/market-research-clones/vibe-kanban/README.md
~/repos/market-research-clones/vibe-kanban/AGENTS.md
~/repos/market-research-clones/vibe-kanban/LICENSE
~/repos/market-research-clones/vibe-kanban/CONTRIBUTORS.md
~/repos/market-research-clones/vibe-kanban/Cargo.toml
~/repos/market-research-clones/vibe-kanban/Dockerfile
~/repos/market-research-clones/vibe-kanban/crates/remote/AGENTS.md
~/repos/market-research-clones/vibe-kanban/crates/remote/Cargo.toml
~/repos/market-research-clones/vibe-kanban/crates/executors/src/executors/mod.rs
~/repos/market-research-clones/vibe-kanban/crates/executors/src/executors/codex.rs
~/repos/market-research-clones/vibe-kanban/crates/executors/src/logs/mod.rs
~/repos/market-research-clones/vibe-kanban/crates/executors/src/actions/review.rs
~/repos/market-research-clones/vibe-kanban/crates/db/src/models/task.rs
~/repos/market-research-clones/vibe-kanban/crates/db/src/models/workspace.rs
~/repos/market-research-clones/vibe-kanban/crates/db/src/models/session.rs
~/repos/market-research-clones/vibe-kanban/crates/db/src/models/execution_process.rs
~/repos/market-research-clones/vibe-kanban/crates/server/src/routes/workspaces/streams.rs
~/repos/market-research-clones/vibe-kanban/crates/server/src/routes/workspaces/git.rs
~/repos/market-research-clones/vibe-kanban/crates/git/src/lib.rs
~/repos/market-research-clones/vibe-kanban/crates/services/src/services/container.rs
~/repos/market-research-clones/vibe-kanban/crates/services/src/services/approvals/executor_approvals.rs
~/repos/market-research-clones/vibe-kanban/crates/mcp/src/task_server/mod.rs
~/repos/market-research-clones/vibe-kanban/crates/mcp/src/task_server/tools/
~/repos/market-research-clones/vibe-kanban/crates/server/src/middleware/origin.rs
~/repos/market-research-clones/vibe-kanban/docs/self-hosting/deploy-docker.mdx
~/repos/market-research-clones/vibe-kanban/docs/core-features/monitoring-task-execution.mdx
~/repos/market-research-clones/vibe-kanban/docs/core-features/reviewing-code-changes.mdx
~/repos/market-research-clones/vibe-kanban/docs/core-features/testing-your-application.mdx
~/repos/market-research-clones/vibe-kanban/docs/core-features/new-task-attempts.mdx
~/repos/market-research-clones/vibe-kanban/docs/supported-coding-agents.mdx
~/repos/market-research-clones/vibe-kanban/docs/issue-management.mdx
~/repos/market-research-clones/vibe-kanban/docs/integrations/github-integration.mdx
grep across crates/ and docs/ for sandbox, saml, sso, vault, zeroize
