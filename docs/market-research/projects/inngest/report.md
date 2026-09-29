---
name: Inngest
slug: inngest
url: https://www.inngest.com
repo: https://github.com/inngest/inngest
category: durable-execution
license: "mixed: SSPL-1.0 with a 3-year delayed Apache-2.0 grant for the server and CLI; SDKs (inngest-js, inngest-py, inngestgo) are Apache-2.0"
open_source: partial
self_hostable: yes
hosting_model: single Go binary or Helm chart, self-hosted (SQLite/in-memory for dev, Postgres+Redis to scale), or Inngest Cloud SaaS
company: Inngest Inc, San Francisco, founded 2021 by Tony Holdstock-Brown and Tina Zheng, ~31-34M USD raised total, 21M USD Series A led by Altimeter (Sept 2025)
maturity: 5,899 stars, 368 forks, 249 open issues, first commit 2021-06-07, last commit 2026-09-28, active daily commit cadence
similarity: 1
axes:
  signals_intake: 2
  control_plane: 3
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 0
  identity_per_task: 1
  cost_control: 1
  ux: 3
  reseedable_selfhost: 3
steal:
  - "Declarative per-function flow control (concurrency key + limit, throttle, debounce, batch, rate limit) sits on the function definition, not hand-rolled in workflow code. pkg/execution/queue implements this as a Redis-backed, multi-tenant fair queue with constraint-aware leasing (constraints.go, backlog.go). Worth stealing the declarative shape for any per-task or per-project concurrency limit we express in policy YAML, even staying on Temporal."
  - "cancelOn and waitForEvent take a CEL-like match expression against the live event stream, so a running function is cancelled or resumed the moment a matching event arrives, no polling. Directly applicable to auto-cancelling a task workflow when the originating issue closes or a newer commit supersedes it."
  - "The Connect protocol (pkg/connect, docs/plans/003-connect-gateway-lifecycle-controller.org) lets a worker open a long-lived outbound connection to the server instead of the server making inbound calls to the worker. Same shape as our default-deny-inbound, worker-initiates posture; worth comparing against how factory-gateway holds worker connections."
  - "End-to-end payload encryption middleware (event.data.encrypted, encrypted step/function output) means the platform itself never sees plaintext task payloads. A pattern to consider for any findings or TaskBrief content that transits a shared control plane we do not fully trust."
  - "The dev server (inngest-cli dev) bundles every service in one process with in-memory Redis and SQLite for a true zero-dependency local loop, npx inngest-cli@latest dev to a working dashboard in one command. A good bar to hold our own local-dev story to."
differs:
  - "Inngest orchestrates calls into code that runs entirely on the user's own infrastructure; it provides no sandbox, no network egress control and no credential broker for that code. Function auth is one pre-shared HMAC signing key per environment, not a short-lived, task-scoped credential. Adopting Inngest's execution model would not give us any of the sandbox_isolation or identity_per_task guarantees we require; we would still have to build the entire worker plane ourselves on top of it."
  - "The unit of work is a short HTTP request/response step, with a bounded per-step duration, replayed from the top of the function on each step boundary using memoized results. That fits request/response backend jobs well but is a poor match for a long-lived, stateful gVisor agent session waiting on a human approval for hours; Temporal's worker-polls-task-queue model, which already anchors our control plane, fits that shape better."
  - "There is no concept of policy, capability or approval gating anywhere in the engine; SSO, audit trails and RBAC are Enterprise-tier SaaS features, not code paths in the open server. Our capability-rules-in-Git model has no equivalent to adopt from here."
ux_verdict: "npx inngest-cli@latest dev to a working dashboard with live step traces and replay in under a minute is a strong bar for local dev loop speed, but the dashboard watches request/response steps, not an agent working through a codebase, so it has nothing to say about diff review or approval UX."
slop_verdict: "Real and used in anger: active daily commits, a 2026 Series A, a deep Redis queue implementation with real production concerns (backlog normalization, shadow queues, scavenging). The SSPL license and Enterprise-gated SSO/audit/HIPAA are open-core gating dressed as 'self-hostable', not slop, but worth reading past the README's plain 'open source' framing."
---

# Inngest

## 1. What it is

Inngest is a durable execution platform: you write a function as a sequence of step.run() calls, send it an event, and Inngest handles retries, scheduling, concurrency limits and state persistence across steps that can span minutes to months. It is built by Inngest Inc (San Francisco, founded 2021), sold as a metered SaaS (free tier, then per-execution pricing) with a self-hosted path, and its agent-kit sibling project (a separate TypeScript package, @inngest/agent-kit, own docs site) adds multi-agent orchestration (Networks, a Router, Agents, Tools) on top of the same durable-step primitive. The README calls the whole server and CLI "open source"; the actual license (LICENSE.md) is the Server Side Public License with a three-year delayed grant to Apache 2.0, which is not an OSI-approved open-source license, so "open source" describes the SDKs, not the server.

## 2. Mapping to our five planes

| Plane / principle | What Inngest does | What we do | Verdict |
|---|---|---|---|
| Signals | A generic Event API (pkg/api) accepts arbitrary named JSON events plus cron; functions trigger on event-name and expression matches. No built-in connector for issues, PR comments or alerts | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | not comparable |
| Control plane | Runner schedules function runs into a Redis-backed multi-tenant queue (pkg/execution/queue), state store (pkg/execution/state/redis_state) persists per-run step output, Postgres/SQLite (pkg/db) holds history for the API and dashboard | Temporal workflow per task, Postgres task registry, policy, budgets, approvals, cost ledger | equal on durable state and scheduling, we lead on policy/budget/approval |
| Worker plane | None as a managed concept: function code runs on the caller's own server, container or Lambda, invoked over signed HTTP or a persistent Connect socket | One disposable gVisor pod per task, read-only root FS, default-deny egress | we lead |
| Verification | None. Inngest never reviews or gates code, it only retries and checkpoints whatever the function does | Forgejo Actions, policy gates, stronger-model review before merge | we lead |
| Merge and deploy | None | Bot merge after approval, Flux GitOps rollout | we lead |
| Policy outside the model | None in the open engine; RBAC/SSO/audit trails are Enterprise SaaS add-ons, not code the self-hosted server enforces | Capability rules in Git, enforced in gateway code and network policy | we lead |
| Identity per task | One pre-shared HMAC signing key per environment authenticates every function call and Connect worker; the same key protects config sync | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task | we lead |
| Artifacts not chat | N/A, no agents in the core engine; AgentKit's Network State is shared mutable state between agents and tools in one process, not an artifact handoff | Git is the coordination mechanism | not comparable |

## 3. Architecture and stack

Go monorepo (go.mod, Go 1.26). cmd/start and cmd/devserver boot the bundled services described in the README's architecture diagram: Event API, event stream, Runner, Queue, Executor, State store, GraphQL/REST API, dashboard UI. The queue (pkg/execution/queue, backed by pkg/execution/state/redis_state, Lua-scripted for atomicity) implements leasing, backlogs, shadow queues and per-key concurrency/throttle/rate-limit/debounce/batch constraints (constraints.go, backlog.go, shadow_queue.go). Run history and the read-facing API live in pkg/cqrs, backed by dialect-specific SQL under pkg/db/postgres/sqlc and pkg/db/sqlite/sqlc; pkg/cqrs/base_cqrs/README.md flags this layer as mid-refactor. pkg/connect implements an outbound-worker protocol (gateway, gRPC, websocket) as an alternative to inbound HTTP calls to the user's function endpoint. pkg/config/config.go loads a CUE-based config (inngest.cue/.json) selecting queue/state/messaging service backends per deployment. Self-hosting deploys one binary (inngest start) with zero external dependencies by default (in-memory Redis, SQLite at ./.inngest/main.db), or --redis-uri/--postgres-uri flags plus a documented Docker Compose (Postgres 17, Redis 7) or the inngest/inngest-helm OCI Helm chart with KEDA autoscaling for production. Model calls are entirely out of scope: Inngest orchestrates arbitrary HTTP-callable functions and does not talk to LLM providers itself; that is AgentKit's job, one layer up, in a separate TypeScript-only package.

## 4. UX

npx inngest-cli@latest dev starts a local dev server and opens a dashboard at localhost:8288 showing events, function runs and step-level traces, with replay of any past run (per the README screenshot and the self-hosting docs). Getting a function running is three steps: write the function with the SDK, run the dev server, send an event; the dashboard then shows the run's step timeline live. There is no approval or intervention concept for a running function beyond cancelling it or waiting on waitForEvent; nothing to review or diff, since Inngest never changes code, only executes functions the user wrote. For our comparison, the fast zero-dependency dev loop and per-step trace view are ahead of our console's current state (no real-time stream, no diff view per the vision doc's "where we are weak" list), but the object being watched (a request/response step trace) is a different, simpler thing than an agent working through a repository.

## 5. Security, identity, sandbox, policy, cost

Identity is a single pre-shared HMAC signing key per environment (pkg/authn), used to sign every callback to the user's function endpoint and to authenticate Connect workers and config syncs; keys rotate but are not per-task or short-lived. There is no sandbox: function code runs entirely on infrastructure the user already controls (their own server, container or serverless platform), and Inngest's own security docs only describe inbound IP allowlisting for calls Inngest makes to the user, nothing about constraining what the user's function can reach outbound. Policy in the open server is effectively absent; SAML/RBAC/audit trails are Enterprise SaaS features layered on top, not enforcement code in the self-hosted binary. Cost control is platform usage metering, not a task-level spend cap: the SaaS bills executions = runs x (steps + 1), the free tier hard-stops at quota ("execution pauses"), and paid tiers meter overage per dimension (executions, concurrency, events) rather than holding and booking a bounded budget per task the way our gateway does.

## 6. What we should take from it

Narrow: the declarative flow-control primitives (concurrency key, throttle, debounce, batch, rate limit) attached to a function definition are a clean, reusable shape for expressing per-task or per-project limits in our policy YAML, independent of whether we keep Temporal underneath. The cancelOn/waitForEvent expression-matched event stream is a concrete mechanism we lack today: cancelling a running task workflow the moment a matching event (issue closed, PR superseded) arrives, instead of only at the next poll or gate check.

Broad: the Connect protocol's outbound-only worker connection validates our own default-deny-inbound posture at the network layer, worth a direct comparison against how factory-gateway holds worker sessions. The zero-dependency local dev server is a useful bar: one command to a working dashboard with live traces, a smaller footprint than what our own console currently offers for local iteration.

## 7. Where our philosophy differs and what that costs or buys us

As a durable-execution engine for our task workflow specifically, Inngest does not fit better than Temporal: its unit of work is a short, replay-from-the-top HTTP step, not a long-lived worker process, so a gVisor agent session that runs for tens of minutes and may block for hours on a human approval is an awkward fit next to Temporal's worker-polls-task-queue model, which already anchors our control plane and handles exactly that shape. Adopting Inngest would also buy us nothing on sandboxing, identity or policy, the three planes where our design is most opinionated: Inngest hands one shared signing key to whatever process runs the function and enforces no capability rules at all, the opposite of policy-outside-the-model and identity-per-task. Where their approach is genuinely stronger is the declarative flow-control surface next to Temporal's bare primitives (task queues, signals) that force us to hand-build equivalent concurrency and throttling logic; copying the shape, not the engine, is the right trade for us.

## 8. Red flags and slop assessment

No security incidents found in the time available; commit history is active (daily commits, last 2026-09-28) and the project raised a 21M USD Series A in September 2025 led by Altimeter with continued participation from a16z, so it is funded and maintained, not abandoned. The license is the main flag: SSPL-1.0 with a delayed Apache-2.0 grant is open-core dressed as open source in the README's own words ("available under the Server Side Public License"), and it is not an OSI-approved license, a materially different position from the SDKs, which are plain Apache-2.0. Enterprise gating is explicit and undisguised on the pricing page (SSO, audit trails, RBAC, HIPAA, dedicated support all Enterprise-only), so at least it is not hidden. Self-hosting docs note operational gaps: no automatic retention or deletion of run/event history in Postgres, and the start command and alpha doctor/debug tooling are still labelled Beta/alpha.

## 9. Sources

- /home/womb/repos/market-research-clones/inngest: README.md, LICENSE.md, AGENTS.md, CHANGELOG.md (cloned 2026-09-29, HEAD at 2026-09-28)
- /home/womb/repos/market-research-clones/inngest/go.mod
- /home/womb/repos/market-research-clones/inngest/pkg/config/config.go, pkg/config/datastore.go
- /home/womb/repos/market-research-clones/inngest/pkg/authn/authn.go
- /home/womb/repos/market-research-clones/inngest/pkg/execution/queue/queue.go and directory listing (constraints.go, backlog.go, shadow_queue.go, queue_processor.go)
- /home/womb/repos/market-research-clones/inngest/pkg/execution/state (redis_state/, README.md)
- /home/womb/repos/market-research-clones/inngest/pkg/cqrs/base_cqrs/README.md
- /home/womb/repos/market-research-clones/inngest/pkg/connect (gateway.go, directory listing)
- /home/womb/repos/market-research-clones/inngest/docs/plans/003-connect-gateway-lifecycle-controller.org (listing only)
- gh api repos/inngest/inngest (fetched 2026-09-29): 5,899 stars, 368 forks, 249 open issues, created 2021-06-07, pushed 2026-09-29
- git log -1 in clone (fetched 2026-09-29): last commit 2026-09-28
- https://www.inngest.com/docs/self-hosting (fetched 2026-09-29)
- https://www.inngest.com/pricing (fetched 2026-09-29)
- https://www.inngest.com/docs/security (fetched 2026-09-29)
- https://agentkit.inngest.com/overview (fetched 2026-09-29)
- WebSearch "Inngest vs Temporal 2026 comparison" (fetched 2026-09-29): https://openalternative.co/compare/inngest/vs/temporal, https://akka.io/blog/inngest-vs-temporal
- WebSearch "Inngest funding Series raised 2025" (fetched 2026-09-29): https://www.inngest.com/blog/announcing-inngest-series-a, https://tracxn.com/d/companies/inngest
