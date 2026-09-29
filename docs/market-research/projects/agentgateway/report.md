---
name: agentgateway
slug: agentgateway
url: https://agentgateway.dev
repo: https://github.com/agentgateway/agentgateway
category: model-gateway
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: "self-hosted binary, Docker image, or Kubernetes controller; no hosted SaaS offering"
company: "Built by Solo.io (Istio/kgateway vendor, San Francisco, ~175M USD raised through a 2021 Series C); donated to the Linux Foundation in August 2025; hosted by the Linux Foundation's Agentic AI Foundation (AAIF) since June 2026"
maturity: "5,089 stars, 895 forks, created 2025-03-18, last commit 2026-09-28 (daily commits), latest stable v1.5.0 with v1.6.0-alpha.2 in flight, 300+ contributors from 60+ organisations per the AAIF announcement"
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 4
  identity_per_task: 3
  cost_control: 4
  ux: 4
  reseedable_selfhost: 4
steal:
  - "one CEL expression language reused everywhere: HTTP/MCP authorization rules, rate-limit keys, virtual-model routing (crates/agentgateway/src/cel, http/authorization.rs, mcp/rbac.rs)"
  - "budget counters held in memory (dashmap) and flushed to Postgres/SQLite every 5s with an atomic upsert and restart reconciliation (http/budget/database.rs) - a working reference for our hold-then-ledger design"
  - "token-based local rate limiting settled after the real response is known, keyed by an arbitrary CEL expression such as jwt.sub or jwt.sub + model (examples/llm-keyed-rate-limit)"
  - "SPIFFE workload identity (control/spiffe.rs): an X509Source rotates the gateway's own mTLS certificate from a local Workload API for inbound and outbound TLS"
  - "a built-in LLM/MCP playground and spend dashboard shipped in the UI (ui/src/pages/Playground.tsx, Costs.tsx), not curl as the only way to see a result"
  - "conditional virtual-model routing by CEL on parsed request fields (cost_tier metadata, max_tokens) as a declarative cheap-to-frontier fallback ladder, the same shape as our model tiers"
  - "MCP guardrail phases (mcp/guardrails: client.rs, methods.rs, phase.rs) as a pluggable pre/post filter pipeline around tool calls, worth copying once agents call MCP tools through our gateway"
differs:
  - "it is a data-plane proxy only: no task registry, workflow, sandboxing, CI gate or merge step. It fills at most the LLM/MCP-facing slice of our worker plane, never the four planes around it"
  - "identity is per-request or per-workload (JWT claims, SPIFFE SVID, virtual keys), not a credential minted and torn down for one task's lifetime; fine-grained enough to key budgets, not to satisfy 'a task, not a machine'"
  - "Kubernetes-native by design: its richest policy and identity features (AgentgatewayPolicy CRDs, Gateway API ReferenceGrant, SPIFFE) assume a full Gateway API mesh, complexity our three-box constraint does not otherwise need"
ux_verdict: "nine steps and one curl from a fresh binary to a chat completion, then a spend dashboard and playground with no code, well ahead of the JSON-log-only feel of a pure proxy"
slop_verdict: "real and heavily used, not a readme project: Linux Foundation and AAIF governed, 300+ contributors from AWS, Microsoft, Cisco and Red Hat, daily commits, four published CVEs/GHSAs each fixed within about one release cycle, fuzz targets and e2e UI tests in the tree; the linked Enterprise page is empty"
---

# agentgateway

## 1. What it is

Agentgateway is an open source Rust proxy that puts LLM, MCP (Model Context Protocol) and A2A (agent-to-agent) traffic behind one data plane, alongside ordinary HTTP/gRPC routing. Solo.io, the company behind Istio and kgateway, built it, then donated it to the Linux Foundation in August 2025; since June 2026 the Linux Foundation's Agentic AI Foundation (AAIF) hosts it alongside MCP itself and Goose. It ships as a single binary, a Docker image, or a Kubernetes controller with its own CRDs on top of the Gateway API.

The makers call it "the first complete connectivity solution for Agentic AI": routing, security, observability, governance and cost control for agent traffic in one layer. The repository backs that claim with real code, not only a landing page: a large Rust workspace with budget, rate-limit, JWT/OAuth, CEL policy, guardrail and SPIFFE modules, a shipped TypeScript/React UI, fuzz targets, and four fixed CVEs/GHSAs with public advisories.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None; no concept of an issue, alert or task | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | XDS config distribution plus a Kubernetes controller (controller/pkg/syncer) reconciling Gateway API objects; no task registry, scheduler or approvals | factoryd with a Temporal workflow per task, Postgres task registry, approvals | not comparable |
| Worker plane | None; it proxies calls out of a worker, it does not create or isolate one | gVisor pod per task, default-deny egress | not comparable |
| Verification | None beyond content guardrails on LLM/MCP traffic | Forgejo Actions, policy gates, stronger-model review | not comparable |
| Merge and deploy | None | Bot merge, Flux GitOps deploy | not comparable |
| Policy outside the model | CEL rule sets compiled once and evaluated in Rust for HTTP authorization, MCP tool/prompt/resource RBAC, and rate-limit keys (http/authorization.rs, mcp/rbac.rs); nothing here is a prompt | Capability YAML in Git, enforced in factory-gateway code and Cilium network policy | equal principle, more expressive rule language on their side |
| Identity per task | JWT claims, API keys, virtual keys and SPIFFE X.509-SVIDs identify a caller or workload per request; nothing is minted and destroyed for one task's lifetime | Projected, audience-scoped ServiceAccount token verified against the cluster OIDC issuer, one per task | we lead on task-scoping; they lead on a live mTLS identity for the proxy itself |
| Artifacts not chat | Not applicable; it moves and polices traffic, not task state | TaskBrief in, branch/PR/event stream out | not comparable |

## 3. Architecture and stack

A Rust workspace (rust-toolchain.toml, Cargo.toml) split into crates/agentgateway (the proxy binary and internal representation), crates/llm (per-provider request/response conversion: anthropic.rs, bedrock.rs, azure.rs, gemini.rs, vertex.rs, openai.rs, plus a model_catalog.rs of capability tags), crates/xds (control-plane transport), crates/hbone and crates/core for transport and shared types, plus a Go controller/ tree that reconciles Kubernetes Gateway API resources and agentgateway's own CRDs (controller/api/v1alpha1) into XDS. Configuration has three layers (architecture/configuration.md): static (env/flags, set once), local (a hot-reloaded YAML/JSON file, the common case), and XDS (a remote control plane pushing the same internal representation). tokio/axum serve the proxy, sqlx backs Postgres-or-SQLite persistence for the one piece of durable state (budget counters, crates/agentgateway/src/http/budget), dashmap holds hot counters between 5-second flushes, and OpenTelemetry is native. MCP support (crates/agentgateway/src/mcp) covers stdio/HTTP/SSE/Streamable-HTTP transports, OAuth, per-tool RBAC, and a guardrail phase pipeline. The shipped ui/ is a Vite/React app with a Monaco-based config and CEL editor, a spend dashboard, and an LLM/MCP playground, built into the same binary.

## 4. UX

A user installs one binary (curl -sL https://agentgateway.dev/install | bash), sets a provider API key as an env var, and runs agentgateway with no config file; it writes a default config.yaml on first launch and opens a UI at localhost:4000/ui. A first-run wizard adds a model through a form, then the user either curls /v1/chat/completions or sends the same request from a built-in playground. That is nine actions, four of them terminal commands, from a clean machine to a visible chat response, per the LLM quickstart (agentgateway.dev/docs/standalone/latest/documentation/quickstart/llm, fetched 2026-09-29). Ongoing operation is watched through the UI's Costs, Logs, Policies and Traffic pages, or through the agctl CLI for live debugging, not through a terminal log stream alone. There is no equivalent of our kanban board or human-approval lane, because agentgateway has no task concept to show; the honest comparison is console-to-dashboard, not console-to-console.

## 5. Security, identity, sandbox, policy, cost

Identity: JWT (with JWKS), OAuth/OIDC, API keys and SPIFFE X.509-SVIDs (control/spiffe.rs) identify a caller or workload; a virtual key scopes an LLM caller to a budget and a set of models. None of it is scoped to a single task's lifetime; it is scoped to a caller, a workload, or a key, reused across calls.

Sandbox: none. Agentgateway assumes the agent already runs somewhere else and only mediates its outbound LLM/MCP/A2A traffic.

Policy: one CEL rule language, compiled once and evaluated in Rust, covers HTTP authorization, MCP tool/prompt/resource RBAC, and rate-limit and budget keys. The one LLM-touching feature, content guardrails (mcp/guardrails), filters traffic through regex, OpenAI moderation, Bedrock Guardrails, Model Armor or a webhook, not through a policy prompt.

Cost: budget counters live in memory per key and flush to Postgres or SQLite every five seconds with an atomic upsert (http/budget/database.rs, postgres_schema.sql), enforcing a USD or token cap per window; local and remote (fleet-wide) rate limits key on any CEL expression, and a token-typed rate limit settles against real usage once a response is known (examples/llm-keyed-rate-limit/README.md). A spend dashboard (ui/src/pages/Costs.tsx) shows it without a separate tool.

## 6. What we should take from it

Narrow: the CEL-everywhere design is the strongest idea to copy - one expression language instead of a different micro-DSL for authz, rate-limit keys and routing. The budget flush pattern (in-memory counter, periodic atomic upsert, reconcile on restart) is close to what our gateway's hold-then-ledger needs and small enough to read end to end in http/budget/database.rs. The keyed, post-settlement token rate limit is a cleaner shape than a fixed per-task-per-day counter for bursty agent traffic.

Broad: shipping a spend dashboard and a request playground in the product itself, not bolted on later, is worth taking as a console priority once a diff/stream view exists - watching cost and trying a call are both zero-code for them and impossible without curl or SigNoz for us today. The guardrail-phase pattern (pre/post filters around a tool call, independent of the model) is worth adopting the day a factory agent calls an MCP tool through factory-gateway, since it is the same "policy outside the model" principle applied to tool arguments, not only to HTTP routes.

## 7. Where our philosophy differs and what that costs or buys us

Agentgateway solves a narrower problem than LiteLLM does for us today: LiteLLM is a request-first, provider-agnostic proxy that fits directly where we put it; agentgateway is traffic-infrastructure-first, built to be the one data plane in front of services, models and MCP tools on a full Kubernetes Gateway API mesh. Its best features (AgentgatewayPolicy CRDs, cross-namespace ReferenceGrant, SPIFFE mTLS) assume that mesh exists; running them on three commodity Hetzner boxes without a service mesh would mean adopting infrastructure our "cheap, no vendor-specific service, as few tools as possible" constraint does not otherwise need. Swapping LiteLLM for agentgateway to get its CEL policy engine would mean a second language (Rust, alongside our one Go module) and a second control-plane protocol (XDS) for request volume that does not need agentgateway's claimed 37k QPS ceiling; the project's own benchmark against LiteLLM (agentgateway.dev/blog/2026-06-26-benchmarking-agentgateway-vs-litellm, run by agentgateway on a mock backend) is honestly read as a gap that only matters at a scale we are not at.

Where their approach is clearly better and our constraint is the price: our capability policy today is a fixed YAML document interpreted by Go code, not a general expression language, so a new authorization dimension means a code change. CEL rules would let that live in the policy document itself. That gap is real independent of whether we ever run agentgateway.

## 8. Red flags and slop assessment

No maintenance red flags: daily commits, four security advisories (one with a CVE) published and fixed within roughly one release cycle each (GHSA-v2x6-wwfw-r2rq / CVE-2026-29791, GHSA-mvgg-jvj2-4frq, GHSA-jwm2-83f3-52xc, GHSA-g7j8-wp7h-wmgr, via GitHub's security-advisories API, fetched 2026-09-29), and governance by the Linux Foundation's AAIF rather than a single vendor. The one open question is the linked Enterprise page (agentgateway.dev/enterprise, fetched 2026-09-29), which loads with only a heading: no pricing, feature list or named seller. That is not evidence of open-core gating, only evidence the page is unwritten; worth re-checking before relying on any enterprise claim. The project is young (created 2025-03-18) and still cuts alpha releases (v1.6.0-alpha.2) alongside its latest stable (v1.5.0), so its APIs should be assumed to still move.

## 9. Sources

- https://github.com/agentgateway/agentgateway (cloned --depth 1, latest commit 2026-09-28)
- README.md, CHARTER.md, CONTRIBUTION.md, architecture/README.md, architecture/configuration.md
- crates/agentgateway/src/http/authorization.rs, http/budget/database.rs, http/budget/postgres_schema.sql, http/jwt.rs
- crates/agentgateway/src/mcp/rbac.rs, mcp/auth.rs, mcp/guardrails/client.rs, mcp/guardrails/methods.rs, mcp/guardrails/phase.rs
- crates/agentgateway/src/control/spiffe.rs
- crates/llm/src/model_catalog.rs
- examples/llm-cost-routing/config.yaml, examples/llm-cost-routing/README.md, examples/llm-keyed-rate-limit/config.yaml, examples/llm-keyed-rate-limit/README.md
- controller/api/v1alpha1, controller/pkg/syncer
- ui/src/pages/Costs.tsx, ui/src/pages/Playground.tsx, ui/src/pages/Policies.tsx, ui/src/pages/Logs.tsx, ui/src/celMonaco.ts
- Cargo.toml
- GitHub API repos/agentgateway/agentgateway (fetched 2026-09-29)
- GitHub API repos/agentgateway/agentgateway/security-advisories (fetched 2026-09-29)
- https://agentgateway.dev (fetched 2026-09-29)
- https://agentgateway.dev/docs/standalone/latest/documentation/quickstart (fetched 2026-09-29)
- https://agentgateway.dev/docs/standalone/latest/documentation/quickstart/llm (fetched 2026-09-29)
- https://agentgateway.dev/enterprise (fetched 2026-09-29)
- https://mlops.community/blog/litellm-is-the-known-option-agentgateway-is-the-open-one (fetched 2026-09-29)
- https://agentgateway.dev/blog/2026-06-26-benchmarking-agentgateway-vs-litellm/ (referenced, fetched 2026-09-29)
- https://www.solo.io/blog/solo-contributes-agentgateway-linux-foundation (fetched 2026-09-29)
- https://www.solo.io/blog/agentgateway-joins-aaif-as-an-open-gateway-for-agentic-ai-infrastructure (fetched 2026-09-29)
