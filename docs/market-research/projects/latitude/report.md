---
name: Latitude
slug: latitude
url: https://latitude.so
repo: https://github.com/latitude-dev/latitude-llm
category: telemetry-to-fix
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted (Docker Compose single host or Helm/Kubernetes cluster) and cloud SaaS, identical container images for both
company: Latitude Data SL, Barcelona. Founders Cesar Miguelanez and Gerard Clos. Pivoted from a data-app framework and a prompt-engineering platform to agent observability. Around 13-15 people. One confirmed seed round, about 1.3M USD in 2022 (Moonfire, Sur Ventures), predating this product; no later round found
maturity: 4.7k GitHub stars, 397 forks, 41 contributors (top 4 hold most commits, plus dependabot and two bot accounts), first commit 2024-06-28, last commit 2026-09-29 same day as this report, 30+ tagged CLI and SDK releases with several in the last week
similarity: 2
axes:
  signals_intake: 4
  control_plane: 1
  sandbox_isolation: 0
  verification: 3
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 1
  ux: 4
  reseedable_selfhost: 3
steal:
  - Volume-scaled promotion gate for discovered clusters (PROMOTION_MIN_SESSIONS=2, PROMOTION_MAX_SESSIONS=15, PROMOTION_WINDOW_DAYS=30, CANDIDATE_EXPIRY_IDLE_DAYS=45 in packages/domain/signals/src/constants.ts) so a one-off failure never becomes a task, and near-duplicate candidates merge their evidence before anything is created.
  - pgvector hybrid search (lexical tsvector plus cosine) with a cheap reranker as a second pass and an explicit fallback to embedding-order when the reranker is unreachable (assign-or-create-signal-from-score.ts), rather than one all-or-nothing similarity call.
  - Regression-test recipe: capture the traces behind a fixed signal as a dataset, replay them against the new build, and score the replay with the exact evaluation that first caught the failure, so the acceptance bar is identical to the production detection bar.
  - Webhook dispatch contract (X-Latitude-Signature HMAC-SHA256, X-Latitude-Delivery idempotency key, retries only on 429/5xx, a documented optional JSON reply carrying externalRunId and deepLinkUrl to link back an external run) is a clean template for a signed, idempotent, loosely-coupled hand-off to any external actor, not just Forgejo.
  - Config resolution ladder per AI feature: LAT_AI_<FEATURE>_<SETTING> then LAT_AI_GENERATION_<SETTING> then a built-in default, the same shape as a model-tier fallback, worth copying for per-capability overrides in the gateway.
  - One-shot, concurrency-safe feedback latch: a single conditional UPDATE ... WHERE feedback IS NULL claims the "was this alert real" verdict before any side effect runs, so two racing callers cannot both win and the verdict cannot be edited after the fact.
differs:
  - Latitude never runs the fix. It is a trigger and context provider that hands a prompt, sample trace ids and a deep link to a coding agent product the customer already owns (Claude Code cloud routines, Cursor, a generic webhook) and stops. There is no sandbox, no egress control, and no task-scoped identity for that step, because Latitude does not hold the step. Adopting this would mean giving up our whole worker plane for whatever agent product the customer already pays for.
  - The replay-and-check step is a documented pattern the customer wires into their own CI, not an enforced gate inside a durable workflow. Latitude supplies the dataset, the SDK and the scores API; pass or fail is whatever pipeline the customer built around them. Our reproduction gate is a workflow activity that blocks merge on its own; theirs is a recipe.
ux_verdict: Fast, polished self-serve path (four lines of code to a first trace, a clean signals and trace UI, CLI/MCP/web parity), but the product is blind to the fix itself, once dispatched it only shows accepted-or-not and an outbound link.
slop_verdict: Real and actively worked (daily commits, weekly releases, 4.7k stars) but built by a small core team at a roughly 13-person company with a documented history of pivots (data apps, then a prompt playground, then Latitude Agents, then the current agent-observability-only V2), and the "verify the fix" claim in the README overstates what ships, the gate is a pattern the customer assembles, not an automatic block.
---

# Latitude

## 1. What it is

Latitude Data SL, a small Barcelona company, builds an open-source MIT-licensed platform for finding and fixing failures in production AI agents. The GitHub description states the whole loop: "Find where your agent fails, dispatch your coding agent to fix it, and verify the fix against real traces." It began as a data-app framework, then a prompt-engineering playground, then Latitude Agents, and repositioned in 2026 as V2, agent observability plus a fix loop, dropping an earlier AI-gateway proxy along the way (per an independent review, not the vendor's own material).

The repository backs this up: docs/signals, docs/agent-dispatch and docs/test-and-fix are real, current documentation trees, and the constants they describe (promotion thresholds, idle-candidate expiry) are present verbatim in packages/domain/signals/src/constants.ts. What the docs do not fully support is the framing of "dispatch" and "verify" as automated steps Latitude itself performs. Dispatch fires a prompt at an external agent product and returns; the reproduction check is a documented recipe (dataset plus SDK plus your own CI), not a gate Latitude enforces.

It is sold as a free-tier SaaS (20K credits per month) with a $99 per month Pro tier and a custom Enterprise tier (RBAC, SAML SSO, on-prem, SLA), and separately as a fully open, self-hostable stack with the same container images used in the cloud offering.

## 2. Mapping to our five planes

| Plane / principle | What Latitude does | What we do | Verdict |
|---|---|---|---|
| Signals | Discovers failure clusters ("signals") from annotations, built-in flaggers, evaluations and custom scores, using pgvector hybrid search plus a decayed weighted centroid per cluster, gated by a traffic-scaled promotion threshold. No issue-tracker or PR-comment intake. | Forgejo webhooks (issues, PR comments), SigNoz alert webhooks, agent escalations; every task becomes a Forgejo issue. | not comparable, they lead on trace-failure dedup, we lead on breadth of sources |
| Control plane | None for the fix. A dispatch fires and Latitude records "accepted" plus an optional external run id; no task registry, no state machine, no approvals for the fix step. | factoryd with a Temporal workflow per task, Postgres task registry, budgets, approvals, cost ledger, audit trail. | we lead |
| Worker plane | No sandbox. The actual coding agent (Claude Code routine, Cursor, a customer webhook) runs entirely outside Latitude, in the customer's own agent product. | One disposable gVisor pod per task, ServiceAccount, read-only root FS, default-deny egress. | we lead |
| Verification | A documented pattern: turn the signal's traces into a dataset, replay them, score with the same evaluation that caught the failure, gate a pipeline the customer builds. Not enforced by Latitude. | Forgejo Actions, policy gates, a reproduction gate that runs the issue's repro command against the PR in a fresh sandbox, then a stronger-model review, inside the Temporal workflow itself. | we lead on enforcement, equal on the underlying idea of replaying the failing case as the pass bar |
| Merge and deploy | Out of scope. Latitude only sees whether the dispatched routine accepted the prompt and, optionally, a link to an external run or PR. | Bot-only merge after approval or an auto rule, Flux GitOps deploy, staged rollout with an alert-free bake window. | we lead |
| Policy outside the model | No capability policy for the dispatched agent; that authority lives entirely in whatever agent product the customer connected. Latitude's own internal AI (signal naming, flagger review) runs through a read-only toolset (packages/operations/src/toolsets/signal-agent.ts) scoped by construction, not by a rule engine. | Capability rules as a Git-versioned policy document, enforced in gateway code and network policy. | we lead |
| Identity per task | MCP access is OAuth per user, scoped to an organization, revocable from Settings, but not per-task or short-lived. The dispatched agent uses whatever credentials its own product manages. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by factory-gateway. | we lead |
| Artifacts not chat | Dispatch sends a structured context object (trigger, signal id, deep link, sample trace ids) plus a rendered prompt string; the reply is an optional JSON with externalRunId and deepLinkUrl, no branch, no PR, no event stream back into Latitude. | TaskBrief in, a branch, a PR and a normalised event stream out. | we lead on completeness, they lead on being agent-vendor-agnostic |

## 3. Architecture and stack

TypeScript monorepo (pnpm workspaces) of five deployable services: web, api (public API and MCP server), ingest (OTLP trace intake), workers (BullMQ background jobs) and workflows (Temporal workers), plus a standalone Rust CLI (packages/cli, Cargo-built) generated from the same OpenAPI spec as the SDKs (fern/). Domain logic sits in packages/domain/* written with the effect library (Effect.gen, tagged errors) and use-case functions, for example packages/domain/signals/src/use-cases/assign-or-create-signal-from-score.ts and check-eligibility.ts.

Storage is split by purpose: Postgres with pgvector (pgvector/pgvector image) holds signal rows, lifecycle state and the centroid_embedding vector plus a generated tsvector for hybrid search; ClickHouse holds immutable score analytics and trend data; Redis backs BullMQ queues and caches; Temporal (Postgres-backed, temporalio/auto-setup) runs durable workflows such as signal-discovery; SeaweedFS provides the bundled S3-compatible object store. docker-stack.yml and the Helm chart (charts/latitude, 19 templates covering Postgres, ClickHouse, Redis, Temporal, SeaweedFS, and the five app services) deploy identical images either way.

Model calls route through LAT_AI_* environment variables with a per-feature-then-global-then-default fallback (docs/deployment/configuration.mdx), defaulting to Amazon Bedrock for generation and Voyage AI for embeddings and reranking; self-hosters must supply their own provider keys for any AI-dependent feature (signal clustering, flaggers, evaluations), core trace ingestion and viewing work with none. The MCP server (https://api.latitude.so/v1/mcp, or self-hosted equivalent) exposes the full API surface as dynamically generated tools; a Rust CLI mirrors it locally.

## 4. UX

A user starts by adding @latitude-data/telemetry (or the Python or OTel-native equivalent) with an API key and project slug, four lines of code per the README, and traces appear immediately, no dashboard setup, no schema to define first. From there: Observe (traces, sessions, cost, in a screenshot-verified trace viewer showing model, tokens, cost, duration, system prompt and a Trace/Conversation/Spans/Annotations tab set), Understand (a Signals list, screenshotted: date range, summary counts for Ongoing/New/Escalating/Regressed/Resolved/Occurrences, a histogram with incident markers, a grouped table with tags, status, assignee, trend sparkline), Fix (Agent Dispatch to Claude Code, Cursor, Linear, or a generic signed webhook) and Verify (regression datasets and simulations).

A human intervenes only at configuration time (wiring a dispatch target, connecting the MCP, thumbs up or down grading a flagger-detected signal) and never watches an agent work inside Latitude itself: once dispatched, Latitude's own UI shows only "accepted" plus, if the target returns one, a link out to the external agent session. This is easier than our console for the observability half (search, cost, session drill-down are more developed than anything we show today) and strictly worse for the agent-loop half (no run visibility at all, versus our kanban board, even though ours also lacks a diff view or trace replay). Interfaces: web UI, CLI (Rust), MCP (remote OAuth HTTP), REST API, TypeScript and Python SDKs.

## 5. Security, identity, sandbox, policy, cost

Identity. MCP access is OAuth, scoped to an organization the user is a member of and revocable from Settings, Keys; sandboxed test data get a separate lat_sandbox_ key rather than OAuth. There is no per-task, short-lived credential: whatever agent Latitude dispatches to carries its own credentials, issued and controlled entirely outside Latitude.

Sandbox. None on Latitude's side of the fix. The coding agent runs in the customer's own agent product (Claude Code cloud, Cursor). Latitude's own internal AI workers (signal naming, flagger classification) use a deliberately read-only toolset (signal-agent.ts) scoped to one project by the caller, not by an enforced policy layer.

Policy. No capability-rule engine comparable to ours. The closest analogue is tool scoping by construction (the signal-agent toolset cannot mutate) and per-integration dispatch limits (max dispatches per day, a cooldown window per source).

Cost. The SaaS meters usage in monthly credits (20K free, 100K Pro, custom Enterprise, overage at $20 per 10K), with ingest-side rate limits and payload caps (LAT_INGEST_TRACE_MAX_PAYLOAD_BYTES, default 32 MiB). Self-hosted deployments have LAT_BILLING_ENABLED=false by default: no ingest cap, retention set by LAT_TELEMETRY_RETENTION_DAYS. None of this caps what the dispatched coding agent spends; that cost lands entirely on whatever plan the customer holds with Claude Code or Cursor.

Data residency. Hosted Latitude keeps customer data and Latitude-managed inference in AWS eu-central-1; SOC 2 is certified, ISO 27001 and a GDPR review were stated as in progress as of the docs read (target end of May 2026).

## 6. What we should take from it

Narrow (copy this month). The promotion-threshold and idle-expiry constants for turning noisy detector output into a small number of real work items map directly onto SigNoz alert-to-issue: instead of one Forgejo issue per firing alert, hold a candidate until it recurs across N sessions in a rolling window, merge near-duplicates, and drop it if it goes quiet for 45 days. The webhook contract (HMAC signature, idempotency header, an optional typed reply for linking back an external run id) is a clean, small thing to lift wholesale for any of our own outward webhooks. The one-shot feedback latch (a single conditional UPDATE gated on a NULL column) is the right shape for our own "every alert gets a verdict" mechanism.

Broad (product shape, priorities). The core idea worth taking seriously is the acceptance bar: replay the exact traces that proved a bug, using the same detector that flagged it, as the test that must pass before the fix ships. That maps almost exactly onto our reproduction gate today (issue's reproduction command re-run against the PR in a fresh sandbox), and Latitude's version (a stored dataset of real failing inputs plus the same eval, versus a single reproduction command) is a strictly richer input: it would let our gate check a set of recorded failing traces instead of one command, which is closer to what a telemetry-driven bug (an alert on a pattern of failures, not one crash) actually needs. The gap is that Latitude leaves the actual gating to the customer's CI; we would want to keep ours enforced inside the Temporal workflow, just widen what a "reproduction" is from one command to a small dataset of recorded failing cases replayed and scored the same way the alert first caught them.

## 7. Where our philosophy differs and what that costs or buys us

Latitude's central bet is that it should not own the fix step at all: no sandbox, no task state, no policy for what the dispatched agent can do. That buys them agent-vendor neutrality (any team that already has Claude Code or Cursor gets the loop for free) at the cost of everything downstream of "propose a fix" being invisible and unenforced by Latitude itself, exactly the ground our sandbox_isolation, control_plane and policy_outside_model axes cover. We could not adopt this without abandoning identity-belongs-to-the-task and policy-outside-the-model as stated, since both require us to hold the step where the agent acts.

Where their approach is genuinely better and our constraint is the price: turning a stream of noisy detector output into a small number of de-duplicated, evidence-backed work items (their signal discovery) is more sophisticated than our current one-alert-equals-one-candidate-issue path, and building that well (embeddings, centroids, reranking, a tuned promotion threshold) is real engineering effort we have not spent, because our four constraints (commodity hardware, best-of-breed over building our own ML) push us toward simpler thresholding rather than a bespoke clustering pipeline.

## 8. Red flags and slop assessment

The project is genuinely active: commits and PRs merged the same day as this report (git log -1 on the default branch, 2026-09-29), 30 tagged releases with several in the last week, 4.7k stars, 397 forks. Contribution is concentrated: of 41 distinct commit authors, four accounts (geclos, andresgutgon, csansoon, neoxelox) hold the large majority of commits, plus dependabot[bot] and github-actions[bot], consistent with a small core team rather than a broad community.

An independent review (befailproof.ai, not vendor material) documents a history of significant product pivots: data apps, then a prompt playground, then Latitude Agents, then the current agent-observability-only V2, which removed an earlier AI-gateway proxy, triggers and hosted tools. Some marketing content (blog posts) may describe features that no longer exist in the current product; this report only verified what the current docs/ tree and source describe. No security incidents were found in the time available; that is "not checked", not "clean".

The clearest overstatement is in the README's own framing: "dispatches your coding agent to fix it, and verifies the fix against real traces" reads as an automated, enforced loop. The code and docs show a context-rich trigger to an external agent product, and a verification recipe the customer must wire into their own CI. Real and useful, but earlier-stage than the phrase suggests.

Funding is thin and largely unconfirmed for the current product: the one traceable round (about 1.3M USD seed, 2022, Moonfire and Sur Ventures) predates the 2024 pivot to this codebase; web search results for a later round return an unrelated, similarly named payments company, a conflation worth flagging rather than resolving as fact.

## 9. Sources

- https://github.com/latitude-dev/latitude-llm (README, cloned 2026-09-29)
- gh api repos/latitude-dev/latitude-llm (2026-09-29)
- gh api repos/latitude-dev/latitude-llm/contributors (2026-09-29)
- gh api repos/latitude-dev/latitude-llm/releases (2026-09-29)
- Local clone: README.md, CONTRIBUTING.md, LICENSE, docker-compose.yml, docker-stack.yml
- Local clone: docs/signals/overview.mdx, docs/signals/create.mdx
- Local clone: docs/agent-dispatch/overview.mdx, docs/agent-dispatch/claude-code.mdx, docs/agent-dispatch/webhooks.mdx
- Local clone: docs/test-and-fix/regression-testing.mdx, docs/test-and-fix/simulations.mdx
- Local clone: docs/deployment/overview.mdx, docs/deployment/single-host.mdx, docs/deployment/configuration.mdx
- Local clone: docs/security/data-protection.mdx
- Local clone: docs/getting-started/mcp.mdx
- Local clone: dev-docs/signals.md
- Local clone: packages/domain/signals/src/constants.ts, use-cases/assign-or-create-signal-from-score.ts, use-cases/check-eligibility.ts
- Local clone: packages/operations/src/toolsets/signal-agent.ts
- Local clone: charts/latitude/ (Helm templates), packages/cli/ (Rust CLI)
- Local clone: docs/images/signals/signals-list.png, docs/images/traces/trace-detailed.png (viewed)
- https://latitude.so/pricing (fetched 2026-09-29)
- WebSearch: Latitude funding history (2026-09-29)
- WebSearch: Latitude independent reviews and comparisons, including https://befailproof.ai/compare/latitude-vs-langfuse/ (2026-09-29)
