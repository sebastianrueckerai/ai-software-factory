---
name: Linear for Agents
slug: linear-for-agents
url: https://linear.app/developers/agents
repo: none
category: issue-tracker
license: proprietary
open_source: no
self_hostable: no
hosting_model: cloud SaaS only, no self-hosted or on-prem option
company: Linear, San Francisco, founded 2019 by Karri Saarinen, Jori Lallo and Tuomas Artman; ~134M USD raised, 2.5B USD valuation after an Accel-led employee tender in Aug 2026
maturity: closed source, no public repository; Agent API still "Developer Preview" (Sep 2026); Linear Agent launched Mar 2026, Coding sessions Jun 2026, weekly-ish changelog cadence since
similarity: 2
axes:
  signals_intake: 2
  control_plane: 2
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 0
  identity_per_task: 1
  cost_control: 0
  ux: 4
  reseedable_selfhost: 0
steal:
  - Six-state AgentSession lifecycle (pending, active, error, awaitingInput, complete, stale) derived automatically from the latest emitted activity, no separate state bookkeeping
  - Typed AgentActivity vocabulary (thought, action, elicitation, response, error) with an ephemeral flag on thought and action so noisy steps collapse and get replaced by the next entry
  - A delegate relation kept distinct from assignee, so agent acts on behalf of and human still owns this are two separate, visible facts
  - Fixed unresponsiveness clock (ack within 10s, stale after 30 minutes of silence, recoverable by one more activity) as a concrete number to steal for our own supervisor stall detector
  - externalUrls array on the session for publishing the eventual pull request link, separate from the comment thread
differs:
  - Policy is a markdown guidance document injected into the prompt context for the agent to follow voluntarily; Linear enforces nothing about what the agent actually does, because Linear never runs or sandboxes the agent itself
ux_verdict: Best-in-class transparent session lifecycle and activity trace for an issue tracker, but live intervention (stop, pause, redirect mid-session) is thin to absent in the published docs.
slop_verdict: Real and heavily used (Linear claims agents installed in 95 percent of paid workspaces, 50 percent of issue volume agent-created), actively shipped, but the third-party Agent API is still a Developer Preview and its own docs defer the full object schema to a linked GraphQL explorer.
---

# Linear for Agents

## 1. What it is

Linear is a project and issue tracker for software teams, and "Linear for Agents" is the layer it built on top so that AI agents can be first-class workspace participants: mentioned, delegated issues, and able to comment and update status like a teammate. It ships two things: a public Agent API (OAuth apps, webhooks, GraphQL mutations) for third parties to build agents that plug into any workspace, and a first-party "Linear Agent" with its own "Coding sessions" feature that reads an issue, investigates the codebase, writes code and opens a pull request.

Linear's own claim is that AI agents are now installed in 95 percent of paid workspaces and generate half of all issue activity, up from 3 percent a year earlier (SaaStrAI, Sep 2026, citing Linear). The docs and API surface back that up for the mechanics of showing agent work in an issue: they do not show a durable task engine, a sandbox, or any spend control, because Linear is a tracker and a thin protocol, not an execution platform.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | An issue delegated or an agent mentioned fires an AgentSessionEvent webhook (created, prompted); no telemetry or alert ingestion | Forgejo webhooks, SigNoz alerts and escalations all become one intake, every task an issue | not comparable |
| Control plane | Session state (6 values) derived from the latest activity; no workflow engine, no budgets, no approvals in the API | Temporal workflow per task, Postgres task registry, budgets, approvals, audit trail | we lead |
| Worker plane | Agent execution is entirely the developer's own infrastructure; Linear's own coding sessions run in an undisclosed secure cloud environment | gVisor pod per task, read-only rootfs, default-deny egress | not comparable / we lead |
| Verification | Agent opens a pull request; review happens in the host repo (GitHub etc), outside Linear | Multi-stage CI, policy gates, reproduction check, stronger-model review before merge | we lead |
| Merge and deploy | Not Linear's job at all | Bot merge after whitelisted human approval, Flux staged rollout | not comparable |
| Policy outside the model | Guidance is markdown injected into promptContext; the agent decides whether to follow it | Capability policy is a YAML file enforced by gateway code and network policy | we lead |
| Identity per task | One workspace-scoped OAuth token per installed app, reused across every session it runs | Per-task projected ServiceAccount token, audience-scoped, checked by the gateway | we lead |
| Artifacts not chat | Typed, frozen AgentActivity entries are the source of truth, explicitly not the mirrored comment thread | Session records exist, but the console has no replay or trace UI yet (our own listed gap) | they lead |

## 3. Architecture and stack

Closed source, no repository to read. The public surface is a standard OAuth2 application model (actor=app, scopes app:assignable, app:mentionable, customer:read/write), a GraphQL API, and webhooks. Key mutations: agentActivityCreate (posts a typed activity), agentSessionUpdate (replaces externalUrls or plan), agentSessionCreateOnIssue / agentSessionCreateOnComment (agent-initiated sessions), and issueRepositorySuggestions (an LLM ranks candidate repos for a PR). A viewer { id } query gives the app its per-workspace id. Linear publishes a TypeScript SDK and a Cloudflare Workers sample agent, Weather Bot, at https://github.com/linear/weather-bot, as the reference implementation; the agent's own runtime, storage and model calls are entirely the developer's concern. Full AgentSession and AgentActivity schemas are not in the prose docs, only in a linked Apollo schema explorer and raw SDL (not fetched in this pass, noted as not verified).

## 4. UX

Delegating: a user assigns the issue to the agent from the normal assignee-style menu, which sets a delegate field distinct from assignee, or mentions the agent in a comment. One step. Building an agent takes more: register an OAuth app, turn on the Agent session events webhook category, pick scopes, and on the first created event emit a thought activity within 10 seconds or the session shows as unresponsive; roughly 5 steps to a working session, per https://linear.app/developers/agents and https://linear.app/developers/agent-interaction.

While an agent works, its session shows one of six visible states, and the docs promise no manual state management. Activities render with type-specific treatment: thought and action can be marked ephemeral so only the latest one shows, response, elicitation and error each post a durable comment as well. For Linear's own Coding sessions (its docs page only points elsewhere, cross-checked via search against https://linear.app/now/coding-sessions-for-linear-agent), a session is shared with the whole team, not just the person who started it: anyone can follow along, add context, redirect or take over, and the agent opens a pull request. The Sep 24, 2026 changelog, "New controls for Linear coding agent", adds only a post-hoc redirect (restart on the default model, keep the old PR for reference) and adaptive model routing; no live stop, pause or mid-session steering is described. Approval of the actual change happens afterwards, in the pull request, not as an in-session checkpoint. A practitioner write-up (Fred Jonsson, X, Jul 2026) calls his own tooling for tracking which agent sessions are stuck "deeply disturbing" hacks built on top of the API, which suggests the built-in visibility stops short of full observability today.

## 5. Security, identity, sandbox, policy, cost

Identity is one OAuth token per installed app per workspace, workspace-admin-approved, with narrow optional scopes (app:assignable, app:mentionable); there is no per-session or per-task credential, the same app token is reused for every session it runs. Sandboxing is out of scope for the third-party API entirely, the agent runs on whatever the developer hosts; Linear's own Coding sessions run in an unspecified secure cloud environment with no published isolation model (not verified). Policy is guidance, markdown text written by admins at workspace or team level and folded into promptContext for the agent to read; nothing in Linear enforces that the agent obeys it, it is a system-prompt addition, not a capability gate. Cost has no surface in the docs beyond one throwaway line that model routing saves tokens; the only cost-related fact is a business one, agents do not count as billable seats, which is pricing, not a spend cap or ledger.

## 6. What we should take from it

Narrow: the typed AgentActivity vocabulary (thought, action, elicitation, response, error, with an ephemeral flag on the noisy two) is a ready-made taxonomy for the trace/replay UI our own design still lacks (listed under "no replay or trace UI" in our weak points). The delegate-versus-assignee split is a one-line idea, not a library: keep the human as the Forgejo issue's real assignee and mark the agent's involvement with a distinct label or field, instead of overloading assignee or relying only on our state/* label. The 10-second-ack, 30-minute-stale clock is a concrete pair of numbers worth reusing as defaults for our supervisor's stall detector.

Broad: Linear makes the agent's live activity trace the default, always-visible surface on the tracked work item, not an optional add-on, and its own adoption numbers (95 percent of paid workspaces) suggest users expect this now. That is exactly the console gap we already flagged. Separately, guidance as inheritable, versioned, team-then-workspace markdown attached to the tracker is worth a lightweight behavioural analogue next to our capability-policy-in-Git, kept clearly labelled as unenforced advice, never confused with the enforced YAML policy.

What Forgejo would need to offer the same: (1) a session object attached to an issue, distinct from a plain comment, with a small state enum the UI renders directly, not just a label; (2) a webhook category for that object's lifecycle (created, prompted-equivalent) with a platform-enforced response SLA; (3) a typed comment or activity API so an agent can post a collapsible thought or action instead of a wall of plain comments, since Forgejo comments today are one undifferentiated type; (4) a delegate concept separate from assignee, since Forgejo has neither; (5) fields to hold a structured plan and an external PR link on the session rather than another comment. Forgejo has no plugin system today (confirmed in our own target-architecture.md, in the console section), so all of this would need to land in Forgejo core or wait for its projects API, not be bolted on from outside.

## 7. Where our philosophy differs and what that costs or buys us

Linear enforces nothing about agent behaviour: guidance is a prompt addition, and the platform never runs, sandboxes or meters the agent, because that is entirely the third party's own infrastructure. This is the opposite of our "policy lives outside the model" principle, where capability rules are enforced in gateway code and network policy regardless of what the agent's prompt says. Copying Linear's shortcut would break our security-without-half-measures constraint outright: we would have no way to claim an agent cannot exceed its budget or reach the network, only a document asking it not to. Their approach is cheaper to build and is enough for a tracker that never touches credentials or infrastructure; our constraint is the price of making the same claim actually true. Separately, Linear is cloud-only with no re-seed or self-host story of any kind, which puts it entirely outside our delete-everything-and-rebuild-from-Git-and-S3 constraint; it is a UX and protocol reference only, never a component we could run.

## 8. Red flags and slop assessment

The core mechanics (delegate, mention, session, typed activity) are documented consistently across three separate docs pages and match independent third-party integration reports (Hookdeck's guide, the Cyrus and agentpod GitHub issues found through search), which is a sign the API is real and used, not vaporware. Against that: the Agent API is still labelled Developer Preview as of Sep 2026, more than a year after third-party agents first appeared on the platform (the "Building the Bucket Linear Agent" HN thread is dated May 2025), so the interface is not yet stable. The docs pages read defer the full object schema and the separate Signals mechanism to a GraphQL explorer and another page, neither fetched here, so parts of the contract are not verified. One independent GitHub issue (cyrusagents/cyrus #1490) reports that agentActivityCreate has no batching and no 429 handling, and another found through search says running more than a couple of concurrent sessions can exhaust Linear's hourly rate limit, both signs of a young API rather than a mature one. No security incident or licence change was found.

## 9. Sources

https://linear.app/developers/agents (fetched 2026-09-29)
https://linear.app/developers/agent-interaction (fetched 2026-09-29)
https://linear.app/docs/agents-in-linear (fetched 2026-09-29)
https://linear.app/changelog/2026-09-24-new-controls-for-linear-coding-agent (fetched 2026-09-29)
https://linear.app/docs/linear-agent (fetched 2026-09-29)
WebSearch: Linear Agent Session API AgentActivity documentation 2026 (2026-09-29)
WebSearch: Linear Agent Sessions review Hacker News Reddit (2026-09-29)
WebSearch: Linear company funding valuation founded headquarters 2026 (2026-09-29)
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md, Forgejo console and labels sections (read 2026-09-29)
