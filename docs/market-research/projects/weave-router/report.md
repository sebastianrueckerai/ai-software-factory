---
name: Weave Router
slug: weave-router
url: https://www.workweave.ai
repo: https://github.com/weave-os/router
category: model-gateway
license: "mixed: Apache-2.0 since router-v0.2.24 (2026-09-24, PR #1460); Elastic License 2.0 from 2026-05-11 to then"
open_source: yes
self_hostable: yes
hosting_model: self-hosted (Docker Compose, Postgres) or Weave's managed router at 5% of routed spend or a flat seat fee
company: Workweave, Inc. (dba Weave), San Francisco, founded 2024, YC-backed, seed $4.2M (2025), Series A $13.5M (2026-07-28, led by Standard Capital)
maturity: 5,405 stars, 144 forks, ~16 contributors (2 dominant humans plus a devin-ai-integration bot with 167 commits), first commit 2026-04-27, last release 2026-09-28, roughly one tagged release every 1-2 days
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 4
  ux: 3
  reseedable_selfhost: 2
steal:
  - "Hold-then-settle PrepaidAuthorization state machine (Reserved to Settled or Released, UpperBoundUsdMicros as a worst-case reserve) as a concrete, production-tested pattern for our own per-task budget holds."
  - "Explicit fail-closed rule for model selection: a scorer failure returns 503 with no silent fallback model, written down after a past silent heuristic fallback masked a real regression."
  - "Generated, hash-stamped policy documentation (docs/POLICY_INFERENCE.md) produced from the same source that enforces it, so the policy table read by humans can never drift from the code."
  - "Per-key model and provider exclusion list as a primitive for scoping a shared router to an approved model set (how we would keep it to our own ladder's models only)."
  - "GET /v1/sessions/:id/cost and a POST /v1/route dry-run endpoint as cheap, user-facing cost and routing transparency primitives worth mirroring in our console."
  - "One-command per-harness installer (npx @weave-os/router --claude / --codex / --opencode) that patches the target tool's config and ships a clean uninstall path."
differs:
  - "It decides per single upstream call (an 'action'), not per task or session outcome. It would slot in where LiteLLM sits today, not replace factory-gateway's task-identity or budget layer."
  - "Its most sophisticated routing policy (the HMM sidecar strategy) leans on a proprietary embedding API (Gemini) and a separately shipped frozen artifact, unlike the fully local ONNX default. Picking that mode reopens the vendor-lock question our constraints try to close."
  - "Multi-replica production self-hosting is hardcoded to the real GCP Pub/Sub client for cross-replica cache invalidation, not an abstracted broker interface. Single-instance self-hosting avoids it but is not the horizontal-scale story."
  - "It has no concept of a disposable per-task sandbox, a verification gate, or a merge step. Adopting it only ever touches one line item inside our control plane (model tier choice), never the worker or verification planes."
ux_verdict: "Fast to trial (one npx command patches Claude Code, Codex or opencode in place) with a live dashboard, a session-cost endpoint and a route dry-run endpoint, but all of that UX is scoped to routing transparency, not to running or supervising agent work."
slop_verdict: "Real and actively engineered: a release roughly every one to two days, a reproducible benchmark harness shipped in the repo, and a documented production incident that changed the architecture. Not a README with a landing page, though its own marketing numbers are looser than its own bench data."
---

# Weave Router

## 1. What it is

Weave Router is a reverse proxy, written in Go, that sits in front of Claude Code, Codex, opencode, Cursor and similar coding-agent harnesses and picks a model and provider for every individual upstream API call. It speaks the Anthropic, OpenAI and Gemini wire formats, so a harness switches to it by changing one base URL, no code changes on the client side. It is built and open-sourced by Workweave, Inc. (dba Weave), a YC-backed San Francisco company whose main business is an "engineering-intelligence platform" that measures AI and human engineering output and ROI; the router is one product line inside that platform, sold as a self-hosted open-source binary or as Weave's own managed, metered service.

The GitHub repository tagline claims it "routes every prompt to the right model in <50ms" and "cuts costs 40-70% with just an endpoint change." Press coverage of Weave's July 2026 Series A quotes a wider "20 to 80 percent" cost-cut range from the same company, and the company's own product page separately claims "1,000+ companies" while press citing Weave puts the number at "500+ companies" and "20,000+ engineers." These are marketing numbers from the same source disagreeing with each other; treat the specific percentages and customer counts as unverified.

What the repository actually shows is narrower and more concrete than the marketing: a real routing engine (an in-process ONNX classifier plus an optional learned-policy sidecar plus bandit exploration), a real billing ledger with holds and settlement, a real and reproducible internal benchmark harness (bench/), and a licence history that moved from source-available to fully permissive five days before this report was written. All of the technical claims below are grounded in code and docs read in the local clone, not in the marketing site.

## 2. Mapping to our five planes

| Plane / principle | What Weave Router does | What we do | Verdict |
|---|---|---|---|
| Signals | None. It receives already-formed inference API calls from a coding agent, not issues, alerts or telemetry as work items. | Forgejo webhooks, alerts, and factoryd's own intake API turn external signals into tasks. | not comparable |
| Control plane | Durable Postgres state per installation and API key: routing decisions, prepaid holds, audit log. No task registry, no scheduler, no approval workflow. Scoped to "which model handles this one call." | Temporal-backed task registry, capability policy, budgets and approvals, cost ledger, all per task. | not comparable (Weave Router covers a much narrower slice) |
| Worker plane | None. A stateless proxy process, not an agent runtime; it has no notion of a sandbox or a workspace. | Disposable gVisor sandbox per task, constrained egress, temporary credentials. | not comparable |
| Verification | None for code output. An async "escalation judge" scores a finished conversation only to inform future routing weights, not to gate a merge. | Forgejo CI, policy gates, stronger-model review before merge. | not comparable |
| Merge and deploy | None. | Bot merge on passing gates, Flux deploy. | not comparable |
| Policy outside the model | A generated, sha256-stamped inference policy registry (docs/POLICY_INFERENCE.md) enforced in Go; per-key model and provider exclusions; the cluster scorer fails closed (503) rather than degrading silently. | Policy as YAML in Git, applied via Flux, enforced in gateway code and network policy. | equal (narrower scope, comparable rigor) |
| Identity per task | A long-lived per-installation rk_... bearer key, optionally a short-lived RSA-JWT for the enterprise router-gateway admission path. No task-level identity; BYOK provider secrets are Tink AES-256-GCM encrypted at rest. | A projected, audience-scoped ServiceAccount token minted and rotated per task. | we lead |
| Artifacts not chat | Not applicable. The product's entire job is proxying chat/completions calls; it has no notion of git branches, PRs or an artifact exchange between agents. | Agents exchange branches, PRs and an event stream, not chat transcripts. | not comparable |

## 3. Architecture and stack

Go 1.25, Gin for HTTP, pgx over Postgres for durable state, Google Cloud Pub/Sub for cross-replica cache invalidation (a local emulator is used for the docker-compose dev stack, the real service for production multi-replica deployments), Tink for at-rest encryption of BYOK provider keys, OpenTelemetry for traces and metrics, and the hugot library plus ONNX Runtime for in-process embedding inference. There is no workflow engine, no Kubernetes client, and no Temporal dependency in go.mod: this is a standalone proxy, not an orchestrator.

The routing decision happens per "action" (the finest grain the codebase defines: one upstream API call, see docs/SEMANTICS.md), not per task or session. The primary strategy is a "cluster scorer" derived from the Avengers-Pro paper (arXiv:2508.12631): an in-process ONNX embedder (Jina v2 base code, 768 dimensions, or Qwen3-Embedding-0.6B, 1024 dimensions) computes an embedding of the request, which is classified against a versioned bundle of centroids and model rankings (internal/router/cluster/artifacts/v0.75/ is the current default, containing 18 deployed models). internal/router/cluster/CLAUDE.md documents an explicit "what not to do" list that forbids any fail-open fallback: if the scorer cannot run, the router returns ErrClusterUnavailable and the caller gets a 503, on the record that a previous silent heuristic fallback once masked a real regression.

Layered on top of the cluster scorer are three optional, more advanced strategies: an HMM policy sidecar (sidecars/hmm, self-hostable, Python, serving frozen PCA, HMM and XGBoost artifacts over a versioned policy_router_v3 HTTP contract, with Go doing the deterministic arm selection); bandit and reinforcement-learning packages (internal/router/bandit, banditexplore, bandswap, rl) for online exploration between model choices; and an async LLM "escalation judge" (internal/router/llmescalation, using NVIDIA's Switchyard prompt and schema, fixed to z-ai/glm-5.3-flash on Fireworks) that reviews completed conversation prefixes to detect stalls or loops and feeds that signal back into future routing, not into a merge gate.

docs/HMM_GO_SELECTION.md documents why arm selection specifically moved from the Python sidecar into Go: a real production incident where a roster or catalog mismatch silently routed 19.8% of traffic, $821 of $1,022 in spend, to the most expensive tier. That incident is the direct cause of the current split (sidecar classifies, Go decides) and of the no-fail-open rule generally.

Deployment is a single Go binary (cmd/router) plus a Next.js frontend served from the same process in self-hosted mode (paths /ui and /admin/v1). A separate binary, cmd/router-gateway, exists only for Weave's own managed SaaS: it is a thin, stateless admission-and-forwarding hop (confirmed by reading internal/gateway/gateway.go in full) that authenticates a request, resolves a signed "serving assertion" against Weave's own release and lane registry, and reverse-proxies to a pinned worker revision with a fresh GCP IAM identity token. It is WorkWeave's internal control plane for its own hosted product, not a general-purpose model gateway, and self-hosters never run it.

The docker-compose.yml self-host stack (Postgres, a Pub/Sub emulator, a migration step, the router server) runs on a single commodity machine with no external account, which matches our "cheap commodity hardware" constraint for one replica. Horizontal scale-out for production HA imports the real cloud.google.com Pub/Sub client directly with no swappable broker interface, which does not match that constraint if the deployment target is more than one Kubernetes replica of the router.

## 4. UX

There is no product screenshot in the README (the only images are shield.io badges); a Next.js dashboard exists at frontend/src/app but was not explored in depth within the time box. The documented UX path is a CLI installer: "npx @weave-os/router --claude" (or --codex, --opencode) patches the target harness's own configuration file to point at the router, verifies a health check and a routing credential, and can cleanly restore the prior configuration. "docker-compose up" brings up the full self-hosted stack, and the router prints a generated rk_... key to its own logs on first boot, so a self-hoster gets from clone to a working proxy in a small number of commands with no sign-up.

Once running, a caller can hit GET /v1/sessions/:session_id/cost for a per-session realised cost and estimated savings figure, and POST /v1/route (or /v1/route/preview) to see what model the router would pick for a given request without dispatching it. Both are cheap, concrete transparency primitives that our own console does not yet expose per task. Everything else in the UX (the admin dashboard, OTLP traces exportable to Honeycomb or Datadog) is scoped to observing routing decisions and spend, not to watching or intervening in agent work itself; it has nothing analogous to approving a merge, inspecting a sandbox, or replaying a task.

## 5. Security, identity, sandbox, policy, cost

Identity is per API key, not per task: a long-lived rk_... bearer token identifies an installation and a key, and BYOK provider secrets are encrypted at rest with Tink AES-256-GCM (internal/auth/CLAUDE.md documents the convention; an unset encryption key falls back to unencrypted storage with a boot-time warning, so this is not a hard fail-closed guarantee for a careless deployer). The managed router-gateway path additionally signs a short-lived assertion per request and mints a fresh GCP IAM identity token per forward, which is closer to short-lived credentialing, but that path only exists inside Weave's own SaaS.

There is no sandbox of any kind. The router never executes agent-produced code; it only forwards inference requests, so egress and sandboxing questions do not apply to it. It sits entirely inside the "which model" decision, not the "what can this task touch" decision.

Policy is enforced in Go against a generated registry, not in a prompt: docs/POLICY_INFERENCE.md is generated from the same source that the router executes, and is hash-stamped so the human-readable table cannot silently drift from the enforced rules. Per-key model and provider exclusions let an operator scope a key to an approved model set. The cluster scorer's fail-closed behaviour (503, no default-model fallback) on any internal failure is the strongest single piece of evidence that this team treats "wrong model chosen silently" as worse than "request refused loudly," which matches our own policy-outside-the-model instinct.

Cost control is the most developed area. internal/billing/prepaid_authorization.go implements a genuine hold-then-settle mechanism: a PrepaidAuthorization is created in a Reserved state against a caller-supplied UpperBoundUsdMicros worst-case bound before a provider call is dispatched, then moves to Settled (partial or full) once the real cost is known, or Released if nothing billable happened. A SubscriptionOnlyReason type records whether a request fell back to subscription capacity because metered credits were depleted or because the key is subscription-only by policy, and billing failures are marked for reconciliation rather than silently dropped. This is architecturally the same shape as the hold and settle budget mechanism described in our own vision doc, and is evidently running in production (it is the subject of the roster-mismatch incident write-up), which is stronger evidence than most of what we found for other projects.

## 6. What we should take from it

Narrow, copyable this month: the PrepaidAuthorization state machine (Reserved to Settled or Released, a worst-case micro-dollar reserve before dispatch, settlement to the exact real cost, explicit failure marking for reconciliation) is worth reading in full before we harden our own hold mechanism, since it is a second independent implementation of the same idea already exercised by a real incident. The explicit "no fail-open fallback on scorer failure" rule is a one-line policy we should adopt verbatim for our own capability or model-selection code: a documented instance exists (theirs) of a silent fallback masking a real regression, which is exactly the failure mode a "policy outside the model" design is supposed to prevent, and it is easy to get wrong by adding a "just in case" default. The pattern of generating policy documentation from the same source that enforces it, then hash-stamping the generated file, is a cheap way to guarantee our own policy docs cannot drift from what Flux actually applies. The per-key model and provider exclusion list is the concrete mechanism we would use if we ever pointed factory-gateway at a router like this one: scope a key to only the model IDs on our ladder. The session cost endpoint and the route dry-run endpoint are worth copying conceptually into our own console, as a per-task realised-cost view and a "what would this route to" debug view respectively.

Broad, a problem they solve that we do not: Weave Router treats "which model handles this specific call" as a first-class, continuously measured decision with its own benchmark harness, rather than a static ladder set once and revisited occasionally. Their bench/ directory runs their own routed lane against pinned models and a competitor metarouter on public coding benchmarks (SWE-Atlas Codebase QnA, Terminal-Bench 4.0) with proper statistics (Wilson confidence intervals, McNemar's test, a sign test), and ships that harness in the open repository rather than only publishing the resulting numbers. Even if we never adopt their router, adopting their discipline of measuring cost and pass-rate together, with confidence intervals, before believing a model-choice change is an improvement, would directly address the weakness our own vision doc names: model choice is a fixed ladder, not learned from outcomes.

## 7. Where our philosophy differs and what that costs or buys us

Weave Router routes per single upstream call, using a request-content embedding plus session-level hints (cache affinity, subscription capacity, session pin), not from our kind of outcome signal (issue resolution, verification pass or fail, human escalation). Its evaluation loop closes on public coding benchmarks and an async "did this look like a stall" judge over finished conversations, not on our own task-level ground truth (did the PR merge, did CI pass, did it need a human). This means it could sit exactly where LiteLLM sits today in our stack, receiving calls and choosing a model, but it could not replace factory-gateway's task-identity or budget-hold layer, because its identity and billing model is per API key and per installation, not per task. Using it would mean layering our own task identity and hold-then-settle budget enforcement in factory-gateway in front of it, and treating its model choice as advisory input, not as the authority on spend or identity.

Their strongest routing mode (the HMM sidecar strategy) depends on Google's gemini-embedding-2 for the query embedding, delivered as a versioned frozen artifact rather than trained and served entirely in the open, unlike their fully local ONNX-based default. Choosing that mode to get the best routing quality would reopen exactly the vendor-coupling question our "no vendor-specific services" constraint tries to close; the fully local default strategy avoids it but is, by their own description, the less sophisticated of the two. Similarly, their production multi-replica story requires the real GCP Pub/Sub client, not an abstracted broker; a single self-hosted replica sidesteps this but forecloses horizontal scaling without either accepting the GCP dependency or forking the cache-invalidation layer ourselves.

Where their approach is clearly better and our constraint is the price: our fixed ladder cannot benefit from a large, continuously retrained embedding classifier and a published, reproducible benchmark harness without us building both from scratch. Their AvengersPro-derived cluster scorer and their bench/ harness represent real engineering investment we have not made; building an equivalent in-house, rather than adopting theirs, is the direct cost of keeping model selection fully inside our own trust boundary and outcome-signal model.

## 8. Red flags and slop assessment

The licence changed from the Elastic License 2.0 (source-available, restricts commercial redistribution and managed-service resale, added 2026-05-11 in PR #49) to Apache-2.0 (2026-09-24, PR #1460, tagged router-v0.2.24) only five days before this report. This is a genuine move toward more openness, not an open-core bait-and-switch, but it means the permissive licence has under a week of track record, and Weave's own marketing has not caught up: the weaveos.com product page and the "Weave Router 2.0" blog post (2026-09-09) both still describe the router as "Elastic License 2.0 to self-host," which is now wrong for the current default branch.

The company's own numbers disagree with each other across sources: the GitHub repository description claims "cut costs 40-70%," press coverage of the July 2026 Series A quotes Weave saying "20 to 80 percent," and customer-count claims range from "500+ companies" (press) to "1,000+ companies" (Weave's own blog). None of this is independently verified; treat all percentage and customer-count claims as marketing, not evidence.

The one piece of evidence that is independently checkable, the bench/ harness, is more honest than the marketing: its own published comparison table shows most pass-rate deltas between the router and pinned frontier models sitting inside the reported 95% Wilson confidence interval (for example the Atlas benchmark shows the router within roughly -9 to +5 percentage points of a pinned model, and the Terminal-Bench 4.0 comparison reports p=0.29 against another arm), so the credible, statistically supported wins are cost and latency (roughly 45-55% cost reduction, 2 to 2.5x faster), not pass-rate superiority. The comparison also runs the pinned competitor at a higher "effort" setting than the router's own arm in at least one case, which understates the router's real quality cost if that setting matters. No independent third-party benchmark of routing quality was found in the time available.

Maturity signals argue against "just a README": the repository was created 2026-04-27, has 5,405 stars and 144 forks, and tags moved from v0.2.13 (2026-09-03) to v0.2.27 (2026-09-28), roughly one release every one to two days. Contributor concentration is real, though: of roughly 16 contributors, two humans (the CTO and one other engineer) account for the large majority of commits, and a devin-ai-integration bot account has 167 commits, itself a top-3 committer. This reads as an internal WorkWeave tool that was open-sourced, with real engineering behind it, rather than a community project with broad external contribution; that does not make it slop, but it does mean "maintained" currently means maintained by two or three WorkWeave engineers plus an AI coding agent, not a broad community.

## 9. Sources

- Local clone read in full or in large part, HEAD as of 2026-09-29 (repository https://github.com/weave-os/router)
- README.md
- AGENTS.md, CLAUDE.md (repository root)
- CONTRIBUTING.md
- LICENSE, NOTICE, THIRD_PARTY.md
- docs/SEMANTICS.md
- docs/POLICY_INFERENCE.md
- docs/HMM_GO_SELECTION.md
- docs/CONFIGURATION.md
- internal/router/cluster/CLAUDE.md
- internal/router/cluster/artifacts/latest, internal/router/cluster/artifacts/v0.75/model_registry.json
- internal/auth/CLAUDE.md
- internal/billing/service.go
- internal/billing/prepaid_authorization.go
- internal/gateway/gateway.go
- sidecars/hmm/README.md
- bench/README.md
- docker-compose.yml
- go.mod
- frontend/src/app (listing only)
- https://github.com/weave-os/router (repository metadata: stars, forks, created_at, open_issues; fetched 2026-09-29)
- https://github.com/weave-os/router/commits?path=LICENSE (LICENSE file history; fetched 2026-09-29: PR #49 on 2026-05-11 added Elastic License v2, PR #1460 on 2026-09-24 moved to Apache-2.0)
- https://github.com/weave-os/router/pull/1460 (Move to Apache 2.0 license, a-churchill)
- https://github.com/weave-os/router/tags (release tag list; fetched 2026-09-29)
- https://www.workweave.ai (linked from README as "Built by Weave"; fetched 2026-09-29)
- https://weaveos.com/products/router (product page; accessed 2026-09-29)
- https://weaveos.com/blog/introducing-weave-router-2-0 (2026-09-09, "Weave Router 2.0: Astra quality at half the cost"; accessed 2026-09-29)
- https://weaveos.com/blog/weave-raises-13.5m-series-a-to-build-engineering-and-token-intelligence (accessed 2026-09-29)
- https://www.finsmes.com/2026/07/weave-raises-13-5m-in-series-a-funding.html (2026-07-28 Series A coverage; accessed 2026-09-29)
- https://www.citybiz.co/article/880622/weave-nabs-13-5m-series-a-to-give-execs-insight-into-ai-roi/ (accessed 2026-09-29)
- https://vibecodinghub.org/tools/weave-router (third-party listing; accessed 2026-09-29)
- Web search: Workweave Weave Router Series A funding Standard Capital (2026-09-29)
- Web search: weaveos router Elastic License 2.0 blog workweave.ai (2026-09-29)
- arXiv:2508.12631 (Avengers-Pro paper, cited by internal/router/cluster/CLAUDE.md and README.md, not independently read in full)
