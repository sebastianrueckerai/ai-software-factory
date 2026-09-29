---
name: Laminar
slug: laminar
url: https://www.lmnr.ai
repo: https://github.com/lmnr-ai/lmnr
category: observability-evals
license: Apache-2.0
open_source: partial
self_hostable: partial
hosting_model: self-hosted (docker compose or Helm) and managed cloud at laminar.sh, plus a licensed "managed self-hosted" mode run by Laminar inside the customer's own AWS or GCP account
company: Laminar AI Inc, YC S24, San Francisco. 3 million USD seed round announced March 2026, led by Atlantic.vc with Y Combinator and AAL.vc. Founders Robert Kim (CEO, ex-Palantir, ex-Bloomberg) and Dinmukhamed Mailibay (CTO, ex-AWS)
maturity: 3287 stars, 240 forks, 29 contributors, first commit 2024-08-29, GitHub API last push 2026-09-29, cloned default branch last commit 2026-09-13, near-daily commits on dev
similarity: 1
axes:
  signals_intake: 1
  control_plane: 0
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 2
  ux: 3
  reseedable_selfhost: 2
steal:
  - Compress a trace to roughly 10% of its tokens before any expensive step (dedupe repeated system prompts, move the user request to the front, keep LLM turns and tool calls, drop plumbing spans unless they error) — cuts the cost of any stronger-model read of a session, directly applicable to our supervisor calls.
  - Signals — a user writes a plain-English rule plus a JSON output schema, a trigger point and trace-level filters; an agent with tools reads the compressed trace, can pull any span's full uncompressed content by id, and emits typed findings with a severity that route to Slack or email. Close to a shipped version of our own supervisor plus "alerts with verdicts" idea; read the mechanism before building ours.
  - Per-span dollar cost rendered inline next to each LLM call in the trace view, not just an aggregate — a cheap, high-value console default for showing an agent's live spend per step.
  - app-server/src/features/mod.rs — optional integrations (RabbitMQ, a ClickHouse read replica, Sentry) are enabled purely by whether their env vars or credentials are present, never by a separate on/off flag that can drift from what is actually deployed.
  - One SQL layer ("query_engine") fronts every stored entity, traces, spans, signal events, evaluations, and is exposed identically through the UI SQL editor, the CLI, the MCP server and the HTTP API, so a coding agent and a human use the same read path.
  - Agent debugger — set a checkpoint on any span, then rerun the trace from that point reusing cached upstream outputs, so a config or prompt tweak can be tested without repeating a whole multi-step run.
differs:
  - Laminar is a metered multi-tenant SaaS with billing woven deep into the schema (four places that must stay in sync per tier, Stripe webhooks, per-workspace soft and hard usage limits). Our control plane bills no one; copying this stack would import a billing domain we do not need.
  - The one feature that overlaps our supervisor design, Signals, is not in the Apache-2.0 tree. "app-server/src/signals/mod.rs" compiles a no-op "public.rs" unless the "signals" cargo feature links "signals/private", which the code comments say typically lives in a separate private repo, named directly as "lmnr-private" in "docs/internal/auth.md". We would have to build the equivalent ourselves regardless, which our design already plans to do.
  - It has no task, sandbox, or credential model at all. It assumes the watched workload runs and is secured elsewhere, so nothing here substitutes for our worker plane, policy engine, or per-task identity. At best it is a bolt-on to the signals plane, and only for visibility, not enforcement.
ux_verdict: Fast to first trace (SDK install, two lines of code, or one docker compose up) and its trace and debugger UI is far richer than our console's flat kanban, but it is a dashboard to look at, not a place to approve or steer a running agent.
slop_verdict: Real and used in anger, 3287 stars, 29 contributors, near-daily commits, YC-backed with named customers (Browser Use, OpenHands), but the README's checked-off "Signals" box ships as a closed-source no-op in the public tree, disclosed only in source comments, not in the README.
---

# Laminar

## 1. What it is

Laminar (lmnr.ai / laminar.sh) is a YC S24 startup selling an OpenTelemetry-native observability and evaluation platform built specifically for LLM agents, not general services. It traces LLM calls and tool use, lets you run evals against datasets, and layers an anomaly-detection feature ("Signals") on top that reads whole agent traces and can page a human. It is sold as a managed cloud product with a free self-hosted path and a licensed, higher-tier self-hosted or "managed self-hosted" path for companies that need data residency.

The README checks off Tracing, Signals, Evals, MCP/CLI, Dashboards and Data annotation as done. The repository backs most of that up: tracing, evals, dashboards and the SQL layer are genuinely there and functional in the OSS build. Signals is the exception: the OSS build compiles a documented no-op stub for it (see section 8).

## 2. Mapping to our five planes

| Plane / principle | What Laminar does | What we do | Verdict |
|---|---|---|---|
| Signals (intake) | "Signals" here means telemetry-anomaly detection on already-running agents, alerting Slack or email. Not issue, PR or webhook intake. | Forgejo webhooks, SigNoz alerts, factoryd intake API feed a task registry. | not comparable |
| Control plane | None. No task state, scheduling or approvals. | Temporal workflow per task in factoryd, Postgres task registry. | we lead |
| Worker plane | None. Laminar never executes the traced agent. | gVisor pod per task, opencode harness behind a Go interface. | we lead |
| Verification | Evals SDK/CLI grades LLM outputs against a dataset, can run in CI/CD. One evidence source, not a merge gate. | Forgejo Actions, policy gates, reproduction gate, stronger-model review before merge. | we lead |
| Merge and deploy | None. | Bot merge after approval or auto rule, Flux deploy, staged rollout. | we lead |
| Policy outside the model | Workspace and project RBAC controls who can see data or billing, nothing about what an agent may do. | Capability rules in Git, enforced in gateway code and network policy. | we lead |
| Identity per task | User and API-key identity (Better Auth, project API keys) for humans and SDKs writing telemetry. No per-task credential for a worker. | Projected, audience-scoped ServiceAccount token per task, verified by factory-gateway. | we lead |
| Artifacts not chat | Not applicable, no agents run here. | TaskBrief in, branch, PR and event stream out. | not comparable |

## 3. Architecture and stack

"app-server/" is Rust (actix-web, Cargo edition 2024). It talks Postgres directly via sqlx ("app-server/src/signals/service.rs"), ClickHouse for trace storage ("app-server/src/ch/"), a forked RabbitMQ stream client for ingestion queueing ("app-server/src/mq/stream/", Cargo.toml pins an lmnr-ai fork "configurable-channel-capacity"), Redis via the moka and redis crates for caching and rate limiting, S3 for export storage, and Quickwit for full-text span search. A separate Rust microservice, "pii-redactor/", runs an ONNX NER model (the ort crate) behind gRPC to strip PII from span input and output when a project turns that on.

"frontend/" is Next.js with Drizzle ORM against the same Postgres (migrations run at frontend startup, a deliberate Next.js "instrumentation.ts" hack per CONTRIBUTING.md), Better Auth for sign-in (GitHub, Google, Azure, Okta, Keycloak, or passwordless local email self-hosted), and the Vercel AI SDK for chat-with-trace and SQL-with-AI.

Deployment is docker compose (five separate compose files, explained in CONTRIBUTING.md, spanning quickstart, full self-host, and three local-dev shapes) for small installs, or a Helm chart for EKS/GKE production, optionally unlocked further with an LMNR_LICENSE_KEY. Model access for server-side AI features (chat-with-trace, Signals) goes through one configurable LLM_PROVIDER (OpenAI-compatible, Gemini, Bedrock, or Azure), read from "app-server/src/llm/".

## 4. UX

Onboarding to first trace: sign up, create a project, generate an API key, "npm add @lmnr-ai/lmnr" or "pip install lmnr[all]", call Laminar.initialize() and wrap one function with observe(). Five steps, no infrastructure if using cloud; self-hosting adds one "docker compose up -d".

A screenshot in the repo ("images/trace-screenshot.png") shows the actual product: a left rail (dashboards, traces, signals, evaluations, datasets, labeling, SQL editor, playgrounds, debugger, settings), a traces list with a daily success/error bar chart, and a trace detail panel with a waterfall timeline of spans, a Signals tab showing a fired "Failure Detector" ("the main agent performed redundant work by re-verifying findings already established by its subagents"), and a transcript view listing named steps with token counts and per-step dollar cost. It is a watch-and-alert product: a Signal firing pages a human over Slack or email, but there is no in-product approve, redirect or escalate action, that judgment happens outside Laminar once someone reads the trace.

## 5. Security, identity, sandbox, policy, cost

Identity is Better Auth (OAuth or passwordless local email) for humans, plus project-scoped API keys for SDKs with optional expiry (none by default). A CLI device-flow login mints short-lived JWTs verifiable via JWKS, but per "docs/internal/auth.md" app-server does not validate that JWT yet, so SDK and API traffic still runs on the long-lived project key.

Sandbox: not applicable, Laminar never runs the traced code.

Policy is workspace and project RBAC (owner and admin gates for billing actions), not a capability system for what a traced agent may do. PII redaction is a real, code-enforced control: a per-project toggle ("projects.settings.removePii") routes span input and output through the pii-redactor gRPC service before storage, gated by "Feature::PiiRedaction".

Cost control is sophisticated but aimed at Laminar's own invoice, not the traced agent's model spend: per-workspace soft usage warnings, hard caps that block further ingestion, and per-cycle notification dedup, all keyed off actual ClickHouse-measured usage ("docs/internal/billing.md"). Signal token cost is metered from raw input, cache and output token counts with tier-specific rates. There is no cap on what the agent being observed spends; that is out of scope for the product.

## 6. What we should take from it

Narrow: the trace-compression step before any LLM read (deduplicate system prompts, move the user turn to the front, drop uninteresting plumbing) is a cheap, concrete way to shrink what we pay our supervisor model to read. The "one SQL layer for four consumers" pattern (UI, CLI, MCP, HTTP) is worth copying for any future read surface we add to factoryd's event stream. The env-presence feature-flag pattern ("is_feature_enabled" keyed on whether credentials exist, not a separate toggle) is a small, real discipline worth adopting for factoryd's optional integrations.

Broad: Signals is the interesting idea for us, an agent that reads a compressed trace, can zoom into any span, and emits a typed, severity-ranked finding that becomes a Slack ping, structurally close to our planned "supervisor reads the event stream, answers continue, redirect, retry or escalate" mechanism, and close to our "every alert gets a verdict" principle. It is worth reading "docs/internal/signals.md" in the clone for the evaluator's three-stage design (compress, agentic investigation, findings) before we build ours, even though the implementation itself is closed.

Next to SigNoz specifically: SigNoz gives us general OpenTelemetry metrics, logs and traces; Laminar's OSS core adds LLM-call-aware span extraction, large trace compression for agent-length runs, and a trace and debugger UI built around "what did the agent do and why," which SigNoz has no notion of. If we ever expose per-task trace replay in our console (a listed weakness), Laminar's trace and debugger screen is the right reference for the shape of that UI, more than SigNoz's own dashboards.

## 7. Where our philosophy differs and what that costs or buys us

Laminar's core loop assumes an agent already exists and is trusted to run; it adds eyes, not a cage. Adopting it as-is would buy us nothing on sandboxing, policy or identity, the three places we spend the most design effort, because it has none of those. Its billing-first schema (four tier tables kept in sync, Stripe webhooks) is a cost we would pay for no benefit, since we do not resell access.

The one place their approach beats ours today is depth of trace UI: a compressed, cost-annotated, replayable view of an agent run, against our current state where SigNoz holds traces but the console does not show them per task. Copying the idea (not the code, since the relevant part is closed) is cheap; building it ourselves is the honest path anyway, since the interesting mechanism is not in the Apache tree to copy.

## 8. Red flags and slop assessment

Open-core gating, disclosed but not obvious: "app-server/src/signals/mod.rs" states plainly that the real implementation "is only compiled when the signals feature is on (typically inside the private repo)" and ships "public.rs" as a no-op; "clustering/" has the identical split. "docs/internal/auth.md" names the private counterpart directly as "lmnr-private". The README nonetheless lists Signals as a checked-off feature with no asterisk. A cloner who reads only the README would expect a working detector; the source comments explain why it silently does nothing.

Community lead gap: an independent comparison (LLMTools, July 2026, and OpenAlternative's live GitHub stats) puts Langfuse at roughly 33,800 stars against Laminar's about 3,200, and growing faster in absolute terms. Laminar is real but a distant second in this category by adoption.

Pricing predictability: the same independent review flags Signals' token-metered pricing as "the least predictable pricing model in the category," since the bill depends on how much of your own data you interrogate plus a vendor compression claim.

No security incidents or licence changes found in the time available. Apache-2.0 on the whole tree is genuine and unchanged since the repository's creation.

## 9. Sources

- https://github.com/lmnr-ai/lmnr, cloned shallow to ~/repos/market-research-clones/laminar, HEAD 5b71e45, commit date 2026-09-13
- gh api repos/lmnr-ai/lmnr, fetched 2026-09-29 (stars, forks, open issues, license, created and pushed dates)
- gh api repos/lmnr-ai/lmnr/contributors, fetched 2026-09-29
- Clone files read: README.md, CONTRIBUTING.md, LICENSE.md, Cargo.toml, frontend/package.json, docker-compose*.yml (listing only), app-server/src/signals/mod.rs, app-server/src/signals/public.rs, app-server/src/signals/service.rs, app-server/src/clustering/mod.rs, app-server/src/clustering/public.rs, app-server/src/data_plane/, app-server/src/traces/input_extraction/, app-server/src/features/mod.rs, docs/internal/auth.md, docs/internal/billing.md, images/trace-screenshot.png
- https://www.lmnr.ai/pricing, redirected to https://laminar.sh/pricing, fetched 2026-09-29
- https://www.lmnr.ai/docs/signals/introduction, redirected to https://laminar.sh/docs/signals/introduction, fetched 2026-09-29
- https://laminar.sh/docs/hosting-options, fetched 2026-09-29
- WebSearch "Laminar lmnr.ai Y Combinator funding observability agents", fetched 2026-09-29, including https://tech.eu/2026/03/17/agent-debugging-startup-laminar-raises-3m-seed-to-tackle-the-observability-gap-in-ai-agents/ and https://laminar.sh/blog/2026-03-16-laminar-launch
- WebSearch "Laminar lmnr vs Langfuse review", fetched 2026-09-29, including https://llmtools.cc/blog/laminar-vs-langfuse/ and https://openalternative.co/compare/laminar/vs/langfuse
