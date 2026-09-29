---
name: Agent Orchestrator (AO)
slug: untrivial-agent-orchestrator
url: https://orchestrator.inc
repo: https://github.com/Untrivial-ai/agent-orchestrator
category: multi-agent-ui
license: "mixed: Apache-2.0 for the desktop app and daemon, proprietary for the AO Cloud control plane (closed submodule, waitlist only)"
open_source: partial
self_hostable: yes
hosting_model: "local desktop daemon you run on your own machine today. A closed-source, AWS-hosted Cloud tier exists in docs but is waitlist-only, not GA"
company: "Untrivial-ai. Opened inside Composio (YC W24, about 29 million USD raised) in February 2026, transferred to creator Prateek Karnal's personal AgentWrapper account around June 2026 as Composio refocused on MCP infrastructure, now under the Untrivial-ai org. A Y Combinator application has reportedly been submitted, not confirmed accepted. Untrivial's own funding and HQ are not disclosed anywhere found."
maturity: "12,516 stars, 1,732 forks, about 115 contributors, first commit 2026-02-13, last push 2026-09-29, 30 releases at a near-nightly cadence, active issue traffic the same day this report was written"
similarity: 2
axes:
  signals_intake: 2
  control_plane: 2
  sandbox_isolation: 1
  verification: 2
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 0
  ux: 4
  reseedable_selfhost: 2
steal:
  - "SCM Observer pattern (backend/internal/observe/scm): a provider-neutral poller (30s tick, ETag guards, semantic diffing) that writes durable PR, CI and review facts, decoupled from the lifecycle logic that reacts to them. Good template for adding GitHub or GitLab intake without duplicating our reaction code, and for a lighter nudge-the-existing-worker path for cheap retries."
  - "Status derived at read time, never stored: AO's OBSERVE to UPDATE to DERIVE split keeps a durable fact log and computes kanban state fresh on every read. Removes a whole bug class where a stored status drifts from reality. Worth adopting for our own console."
  - "ACP (Agent Client Protocol, github.com/coder/acp-go-sdk) as the wire format for structured, non-terminal driving of a coding agent. An emerging shared standard with several agent vendors already implementing it, worth evaluating against our bespoke Go Harness interface."
  - "The reviewer capability gateway pattern (ADR 0002): a structured, no-shell surface for specific git reads, bound to an immutable task manifest, shipped honestly labelled as not a sandbox. Useful middle step wherever we want an agent to read repo state without a full sandboxed pod."
  - "The PostHog cost-control runbook (docs/posthog-cost-controls.md): ingestion rate limits, per-install caps, a kill-switch env var, billing hard limits. A reusable checklist for our own SigNoz telemetry cost discipline, unrelated to agent spend but a real ops pattern worth lifting."
  - "Mobile approval companion over an opt-in LAN listener or Cloudflare tunnel/Tailscale, password-protected and off by default. Our console has no mobile view at all. A tunnel-based approval-only view would be a small, high-value addition."
differs:
  - "Host-trusted, unsandboxed execution by design versus our default-deny sandbox: AO runs the agent directly on the developer's machine with real credentials and full network access on purpose. Our security constraint rules this out. The price we pay is worse local ergonomics for a single interactive developer."
  - "Bring-your-own, long-lived personal credentials versus identity per task: AO has no capability policy or credential brokering because every session already runs as the user. Copying this breaks our identity-belongs-to-the-task principle outright."
  - "Single-machine, single-user architecture (SQLite, loopback daemon) versus our multi-tenant, re-seedable, Kubernetes-native fleet: AO's stronger multi-tenant design (Postgres control plane, per-session JWT fencing, container sandboxes) exists only in the closed, non-GA Cloud product, not in anything inspectable or self-hostable today."
  - "Feed feedback into the still-running session versus our new session per attempt: cheaper and faster for small corrections since context is not rebuilt, but AO ships no supervisor-style circuit breaker on a nudged session, and its own users hit that gap the day this report was written."
ux_verdict: "Clearly ahead of our console on watching and steering a running agent, with real, independently reported rough edges around stale status and idle approval waits."
slop_verdict: "Real and actively maintained, not a landing-page project, but corporate lineage and domain naming have churned twice in months and the strongest security architecture is locked behind an unreleased, closed-source Cloud tier."
---

# Agent Orchestrator (AO)

## 1. What it is

AO is a desktop application for running several coding-agent CLI sessions in parallel, each in its own git worktree, watched and steered from one Electron app. It is built and maintained by Untrivial-ai, and it now markets itself as a way to run "teams of coding agents from planning to merge" across about 25 supported harnesses (Claude Code, Codex, Cursor, Aider, OpenCode, and more), with a desktop, web, mobile and cloud front end. It is aimed at individual developers and small teams who already have their own coding-agent subscriptions and forge accounts, and it is free and open source (Apache-2.0) for the local daemon and desktop app, with a separate, closed-source, waitlisted Cloud tier for anything beyond one machine.

The README and marketing site claim automatic routing of CI failures and review comments back into the owning agent session, and the code substantiates this concretely: a polling SCM Observer plus a lifecycle Nudge Engine genuinely dispatch that feedback into a still-running session. Other claims are thinner than the pitch suggests. Isolation is a git worktree, not a sandbox, and the project's own architecture decision record says so directly. There is no product-level control over agent spend. Concurrency is bounded only by the host machine's own resources. A GitHub issue filed the same day this report was written asks for a stop lever because no reliable way exists to interrupt a worker stuck in a token-burning loop.

## 2. Mapping to our five planes

| Plane / principle | What AO does | What we do | Verdict |
|---|---|---|---|
| Signals | An SCM Observer polls GitHub and GitLab PR, CI and review state every 30 seconds (ETag guarded, semantically diffed). A separate opt-in tracker-intake observer starts one session per eligible GitHub issue once a minute | Forgejo webhooks, SigNoz alert webhooks and a factoryd intake API push work in. Every task is a Forgejo issue | not comparable |
| Control plane | SQLite with trigger-based change-data-capture into a fact log, polled and broadcast over SSE. A lifecycle manager derives session state from facts on read. No scheduler, no budgets, no approval workflow | factoryd with a Temporal workflow per task, Postgres, policy as a file in Git, budgets, approvals and an audit trail | we lead |
| Worker plane | The agent runs on the host inside a dedicated git worktree, in a real terminal (TUI) or a structured chat (Chat/ACP). No container, no VM, no network restriction | One gVisor pod per task, non-root, read-only root filesystem, default-deny egress | we lead |
| Verification | Relies on the forge's native CI plus an optional agent or human PR review. Failures and comments are pushed straight back into the running session instead of gating a merge | Gated pipeline: cheap deterministic checks, policy gates by risk class, reproduction gate, then a stronger-model review with a strict verdict | not comparable |
| Merge and deploy | Stops at the forge PR. A human or bot merges on GitHub or GitLab. No deploy step, no telemetry-from-production loop | Bot merge after human approval or an auto rule, GitOps deploy, staged rollout watched for alerts, telemetry back into signals | we lead |
| Policy outside the model | Permission modes are passed through to the underlying agent CLI's own approval flags. No independent, code-enforced capability policy found in the open daemon | Capability rules are a Git-versioned document enforced in gateway code and network policy | we lead |
| Identity per task | The user's own long-lived CLI login and forge token, shared across every session on the machine | A projected, audience-scoped, per-task ServiceAccount token verified by the gateway against the cluster OIDC issuer | we lead |
| Artifacts not chat | One worktree and one PR per session is a real artifact boundary, but the coordination substrate for feedback is a typed nudge into a live terminal or an enqueued chat turn, closer to conversation than a structured handoff | TaskBrief in, branch, PR and normalised event stream out, git as the coordination mechanism | we lead |

## 3. Architecture and stack

Backend: Go 1.27 (backend/go.mod, module github.com/aoagents/agent-orchestrator/backend), go-chi/chi for HTTP, modernc.org/sqlite (pure Go, WAL mode) for storage with a trigger-based change_log table polled for Server-Sent Events at GET /api/v1/events with Last-Event-ID replay. docs/stack.md explicitly rejects Temporal, NATS, Kafka, Redis and go-git for this version, choosing SQLite plus change-data-capture plus SSE because the daemon is single-user and local. TUI-mode agents run under a real PTY (github.com/creack/pty, github.com/aymanbagabas/go-pty, github.com/Microsoft/go-winio for ConPTY on Windows). Chat-mode agents are driven over the Agent Client Protocol via github.com/coder/acp-go-sdk. Migrations use pressly/goose, the CLI uses spf13/cobra, errors go to getsentry/sentry-go.

Frontend: Electron with React 19, TanStack Router and Query, Tailwind, Radix and shadcn components, xterm.js for terminal rendering over a WebSocket mux, Zustand for state, react-i18next, electron-updater for auto-update (frontend/package.json). A mobile companion is an Expo/React Native app that pairs over an opt-in, password-protected LAN listener or a Cloudflare tunnel/Tailscale connection. Deployment shape is a signed desktop installer or a Homebrew formula (brew install agentwrapper/tap/agent-orchestrator, the tap name is a fossil of the project's brief life under creator Prateek Karnal's personal AgentWrapper account), not a server you deploy yourself.

A separate, closed-source tier exists as a git submodule, private/ao-cloud pointing at https://github.com/Untrivial-ai/ao-cloud.git (.gitmodules), not present in this clone. Its docs (cloud/README.md, cloud/docs/control-plane.md) describe a Postgres-backed control plane with one-transaction, idempotent session creation, desired-state versus observed-state sandbox reconciliation similar to a Kubernetes controller, per-session JWT worker identity fenced by an epoch counter, and short-lived, single-use, hashed-at-rest terminal tickets. cloud/docs/deployment.md and Terraform under cloud/coder/ and cloud/coder-azure-vm/ point at AWS ECS/Fargate behind an ALB with ACM certificates and RDS in eu-north-1, with Docker locally and a NodeOps or Coder-on-Azure-VM sandbox provider in staging. This whole tier is read from documentation only, the code is not in this repository and none of it is independently verified against a running system.

## 4. UX

Getting to a first running agent takes about four or five actions: install the desktop app or the Homebrew formula, open it, connect an already-authenticated coding-agent CLI, pick a repository, then use the Create a new task modal (docs/assets/readme/new-task.png: a prompt textarea, an agent picker showing Claude Code, a model picker showing Opus, a Start task button). The session then appears as a card on a four-column kanban, Working, Needs you, In review, Ready to merge (docs/assets/readme/hero.png), with a status badge, PR number and timestamp that the daemon recomputes from its fact log rather than storing directly.

Watching a session means opening its card to either a real terminal with full scrollback (TUI mode) or a structured chat transcript (Chat/ACP mode). An agent-controllable, worker-isolated in-app Chromium browser with full DevTools is available for web work. Intervening means typing into the terminal or sending a new chat turn. CI failures and review comments appear as an automatic nudge in the running session rather than requiring the user to paste anything back in. Approval happens at two places: the forge, where a human merges the PR, and whatever native permission prompt the underlying agent CLI itself shows, since AO maps its own permission modes onto the harness's own ask or bypass semantics (docs/STATUS.md) rather than adding its own approval layer. This is stronger than our console today, which the baseline itself describes as functional but undesigned, with no real-time work stream, no diff view and no mobile view.

Independent use surfaces real rough edges, though. Augment Code's August 2026 comparison of nine orchestrators found AO "pushes hardest past session management into autonomous PR handling" but also saw agents "idle more than expected between steps," with two of four parallel sessions stalled 90 or more seconds waiting on a tool approval. A July 2026 UI/UX audit filed against the repository itself found problems the authors call "not cosmetic," including the screen showing stale information and it being unclear whether a task had actually finished, the exact failure mode the OBSERVE/DERIVE architecture is meant to prevent. A dated postmortem records the desktop app's Files view going blank after six to seven hours of continuous use on macOS in v0.12.0, fixed in v0.12.1.

## 5. Security, identity, sandbox, policy, cost

Sandbox: the open-source daemon runs the agent directly on the host inside a dedicated git worktree. No container, no VM, no network restriction was found anywhere in the open code. ADR 0002, covering the interactive reviewer capability gateway, states outright that the gateway "is not by itself a process sandbox," and lists several review harnesses as shipped only "experimental and host-trusted" pending an OS-level isolation provider that does not yet exist. The closed AO Cloud tier documents Docker locally and NodeOps or Coder-on-Azure-VM sandboxes in staging, but that code is not in this repository and is not independently verified.

Credentials: fully bring-your-own. AO reuses whatever coding-agent CLI login the user already has on the host, and for git access it falls back through AO_GITHUB_TOKEN then gh auth token, or AO_GITLAB_TOKEN then glab (docs/scm-observer.md). These are the user's own long-lived personal credentials, shared across every session on the machine, not something AO issues or scopes per task. AO Cloud documents per-session JWTs fenced to a worker's epoch and short-lived, single-use, hashed terminal tickets, a materially stronger design, but closed-source and not GA.

Policy: no independent, code-enforced capability policy exists in the open daemon. What AO calls permission modes are flags passed through to the underlying agent CLI's own approval semantics, configured per session, not a policy document AO itself evaluates. This gap is not just an outside observation: a GitHub issue filed 2026-09-29 (#6035) explicitly asks for "a policy surface for orchestrator-driven actions, limits, attribution, approval gates, a stop lever," describing almost exactly the mechanisms our own design already has.

Cost: no product-level control over LLM or agent spend exists anywhere in the material read. The only documented cost control (docs/posthog-cost-controls.md) governs AO's own PostHog analytics bill, not agent spend. This is not theoretical: issue #6032, filed the same day as this report, records a Claude Code worker that "burned ~45M tokens (~$1.5) over 45 minutes while looping," with the daemon's own periodic status checks piling up unread in the stuck worker's input queue. The issue's own text shows an interrupt endpoint does exist (POST /api/v1/sessions/{id}/conversation/interrupt, backed by InterruptTUI), but it only works for TUI-mode sessions on harnesses with semantic turn acceptance, has no CLI verb, and is not exposed in the UI, so it did not help here.

## 6. What we should take from it

Narrow, copyable this month: the SCM Observer pattern (backend/internal/observe/scm), a provider-neutral poller with ETag guards and semantic diffing that writes durable facts, cleanly separated from the lifecycle code that reacts to them, is a good template for adding a second forge without duplicating reaction logic, and more directly a template for a lighter nudge-the-existing-worker path for cheap, fast corrections. The OBSERVE-UPDATE-DERIVE split, where display status is computed fresh from a fact log on every read rather than stored, is worth adopting in our own console to remove an entire bug class, though note from section 4 that AO shipped this architecture and users still reported stale-status bugs, so the pattern alone is not sufficient without care in the read path. The Agent Client Protocol (github.com/coder/acp-go-sdk) is worth evaluating against our bespoke Go Harness interface, since it is gaining multiple independent implementations. The reviewer capability gateway (ADR 0002), a structured, no-shell surface for specific git operations bound to an immutable task manifest, is a usable middle step wherever we want an agent to read repository state without a full sandboxed pod, and its honest not-a-sandbox framing is itself worth copying as a documentation habit. The PostHog cost-control runbook is a reusable ops checklist for our own SigNoz telemetry spend, unrelated to agent cost but concretely transferable.

Broad, product shape: AO treats watching and steering several running agents as the core product, with a live-derived kanban, a real terminal, an agent-controllable browser and a password-gated mobile companion over a tunnel. Our own baseline names exactly this area as unfinished. A tunnel-based, approval-only mobile view, far short of AO's full companion app, would close part of that gap cheaply. Feeding CI failures and review comments back into a still-running session rather than always starting fresh is a genuine win for small, cheap corrections, since it avoids rebuilding context. See section 7 for how narrowly we think this should be adopted.

## 7. Where our philosophy differs and what that costs or buys us

AO runs the agent directly on the developer's own machine with real credentials and full network access, on purpose, to preserve the developer's own environment. Our security-without-half-measures constraint rules this out outright: we cannot hand an agent a human's real git and cloud credentials or unrestricted egress. The price of our approach is worse local ergonomics for a single attentive developer, exactly the ergonomics AO is optimised for. This is a trade worth keeping, not copying.

AO has no capability policy or credential brokering because it does not need one: every session already runs as the user. Copying this would break our identity-belongs-to-the-task principle directly, handing every task a human's long-lived credentials instead of a short-lived, scoped one. AO's simplicity here is bought by being single-user and host-trusted, an option a largely autonomous, multi-project factory does not have.

AO's genuinely stronger multi-tenant design, a durable Postgres control plane, per-session JWT fencing, container sandboxes, exists only in the separate, closed-source, waitlisted Cloud product. Our factory is multi-tenant and re-seedable by design from day one. Matching AO's open-source simplicity would mean giving up the fleet model that is the point of our project.

The comparison this report was asked to make directly: AO's SCM Observer polls PR, CI and review state every 30 seconds and, on a real change, has the lifecycle manager's Nudge Engine inject that feedback as typed input into the running TUI or as a new turn in the running chat, keeping the same worktree, process and accumulated context. Our loop ends the session, writes findings into the next TaskBrief, and starts clean.

AO's model is cheaper and faster for small, tightly scoped corrections, since the agent keeps its working memory of the change it just made and nothing needs re-cloning or re-reading. It is worse wherever trusting the old session's state is itself the risk: a session going in circles, one that has used its budget, or one whose prior action is exactly what needs reconsidering benefits from a clean slate and an outside model's fresh reading of the findings, which our design gives every attempt by construction. AO has no equivalent of our supervisor (stall, repeated-failure or flip-flop detectors that can redirect or escalate), and it shows: issue #6032, filed the same day as this report, documents a worker looping for 45 minutes and burning 1.5 US dollars in tokens with no way to stop it, because the daemon's own status nudges just queued up behind the stuck turn instead of triggering any circuit breaker.

For us, the right answer is not to switch models but to add a narrow, explicit exception. For the cheapest, most local class of feedback, a lint failure, a single failing unit test, a trivial review comment, it is worth resuming the same session with the finding appended, provided the budget and step-count checks that already gate a fresh attempt still apply. Anything that has already needed a retry, tripped a supervisor check, or crosses a capability or budget boundary should keep starting fresh, exactly as today. AO's own users are, as of this week, asking their maintainers for the policy surface, approval gates and stop lever our design already has. That is a strong outside signal that our stricter boundary is worth its latency cost for a low-supervision factory, even though it costs us the speed AO gets on the easy cases.

## 8. Red flags and slop assessment

Real and actively maintained, not a landing-page project: 12,516 stars, 1,732 forks (up from about 7,500 stars in June 2026 per an outside review), about 115 contributors, 30 releases at a near-nightly cadence, and issue and PR traffic on the day this report was written, including a dated postmortem for a real macOS-only bug (Files view blank after six to seven hours in v0.12.0, fixed in v0.12.1).

Corporate lineage and naming have churned fast. The project began inside Composio (YC W24, about 29 million US dollars raised) in February 2026, was transferred to creator Prateek Karnal's personal AgentWrapper GitHub account by June 2026 as Composio refocused on MCP infrastructure, and now sits under the Untrivial-ai org with the AO brand. A Y Combinator application has reportedly been submitted for Untrivial. It is not confirmed accepted, and Untrivial's own funding and headquarters are not disclosed anywhere found. The docs site itself is mid-move: a live pull request says "do not merge until orchestrator.inc is live and verified," and search results currently show docs split across aoagents.dev/docs and docs.orchestrator.inc at once, while the once-referenced docs.aoagents.dev (no trailing path) resolves to a bare, unclaimed GitHub Pages 404.

Doc and code drift was found directly, not just warned about. docs/STATUS.md claims the tracker integration "does nothing at runtime," but backend/internal/observe/trackerintake/observer.go and backend/internal/daemon/tracker_intake_wiring.go implement and wire a working once-a-minute issue-intake poller. The project's own docs/documentation-map.md names this exact risk and says prose loses to the contract layer on disagreement, a sound rule that had not yet caught this particular staleness.

Open-core gating is disclosed, not hidden, but real: the strongest security properties (a durable Postgres control plane, per-session credential fencing, real container or VM sandboxes) are entirely in the closed-source ao-cloud submodule, gated behind a waitlist with no published price or GA date. The Apache-2.0 project is a complete, usable local tool on its own, but its best security ideas are not something anyone can inspect or run yet.

A licence question needs care. An outside review from June 2026 (Ry Walker Research) describes the project as MIT-licensed. The current repository and docs state Apache-2.0. This most likely reflects the move from Composio to Untrivial, but the discrepancy is worth flagging as a licence change rather than assumed continuity.

Telemetry is opt-out, not opt-in, and is more identifying than its section title suggests. The README's Anonymous telemetry section discloses that AO sends the signed-in developer's actual GitHub username on session-start events, plus coarse IP-derived geography, and states that "turning telemetry off stops it along with everything else," meaning there is no way to keep using AO while declining just the personally identifying parts.

Security posture is at least stated honestly: ADR 0002 says in its own text that the reviewer gateway "is not by itself a process sandbox" for harnesses it still marks experimental and host-trusted. That candour is a positive signal about the team, separate from the actual state of security on the open-source tier, which remains host-trusted execution with no sandbox.

## 9. Sources

- Repository clone (depth 1): https://github.com/Untrivial-ai/agent-orchestrator, HEAD at clone time 2026-09-29T16:57:01+05:30, "feat: add MiMo Code agent harness (#5893)"
- README.md
- docs/stack.md
- docs/STATUS.md
- docs/architecture.md, targeted excerpts: mental model, feedback routing flow, lifecycle management, session state machine, termination guardrails, SCM observer and runtime reaper flowcharts
- docs/scm-observer.md
- docs/posthog-cost-controls.md
- docs/telemetry.md, referenced from README
- docs/adr/0002-secure-interactive-reviewer-gateway.md
- docs/documentation-map.md, excerpt
- docs/backend-code-structure.md, excerpt
- docs/assets/readme/hero.png
- docs/assets/readme/new-task.png
- .gitmodules
- backend/go.mod
- frontend/package.json
- backend/internal/observe/trackerintake/observer.go
- backend/internal/daemon/tracker_intake_wiring.go
- cloud/README.md
- cloud/docs/control-plane.md
- cloud/docs/deployment.md, head
- cloud/coder/main.tf, cloud/coder/Sandbox.Dockerfile, cloud/coder/README.md, cloud/coder/AZURE.md
- cloud/coder-azure-vm/main.tf
- test/e2e-pod/playwright.electron.config.ts, real-app.spec.ts, boot-real.sh
- gh api repos/Untrivial-ai/agent-orchestrator, fetched 2026-09-29, stars 12516, forks 1732, open issues 683, created 2026-02-13, pushed 2026-09-29, licence Apache-2.0
- gh api repos/Untrivial-ai/agent-orchestrator/contributors, fetched 2026-09-29, two pages, about 115 contributors
- gh api repos/Untrivial-ai/agent-orchestrator/releases, fetched 2026-09-29, 30 releases
- gh api repos/Untrivial-ai/agent-orchestrator/issues/6032, 6035, 6037, 6025, fetched 2026-09-29
- https://orchestrator.inc, fetched 2026-09-29, WebFetch
- https://docs.orchestrator.inc, fetched 2026-09-29, WebFetch
- https://docs.aoagents.dev, fetched 2026-09-29, WebFetch 404, confirmed by Firecrawl scrape as an unclaimed GitHub Pages site
- WebSearch, 2026-09-29: agent orchestrator Untrivial OR aoagents OR orchestrator.inc review OR hacker news 2026
- https://www.augmentcode.com/tools/open-source-agent-orchestrators, Augment Code, August 2026 comparison review
- https://rywalker.com/research/agent-orchestrator, Ry Walker Research, June 2026
- https://github.com/Untrivial-ai/agent-orchestrator/issues/2720, UI/UX Audit 1, July 2026
- https://news.ycombinator.com/item?id=47219229, Show HN: Agent Orchestrator, March 2026
