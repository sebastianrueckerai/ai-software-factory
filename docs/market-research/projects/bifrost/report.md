---
name: Bifrost (Maxim)
slug: bifrost
url: https://getbifrost.ai
repo: https://github.com/maximhq/bifrost
category: model-gateway
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted binary, Docker image, Helm chart or Terraform module (AWS/GCP/Azure/k8s); Maxim also sells a hosted Enterprise tier
company: Maxim AI (H3 Labs Inc.), San Francisco and India, founded 2023 by Vaibhavi Gangwar and Akshay Deo, 3M USD seed led by Elevation Capital (2024-06-18), no later round reported as of 2026-08
maturity: 8439 stars, 1308 forks, 1157 open issues, repo created 2025-03-19, last commit 2026-09-29, near-daily releases per Go module (core, transports, plugins each separately semver-tagged)
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 4
  identity_per_task: 1
  cost_control: 4
  ux: 4
  reseedable_selfhost: 3
steal:
  - "Hierarchical budget and rate-limit checking (customer > team > virtual key > provider config), each level independently checked and independently deducted on every request, see docs/features/governance/budget-and-limits.mdx"
  - "Calendar-aligned budget resets (1d/1w/1M/1Q/1Y snap to UTC boundaries, sub-day windows stay rolling) as an opt-in flag on any budget owner, a small config idea worth copying into our cost ledger"
  - "Deny-by-default model access since v1.5.0: an empty models array on a key denies every model, callers must opt in with an explicit list or a wildcard, a safer default than an implicit allow-all"
  - "RE2 regex allow/deny patterns for model names on a key (regex:^gpt-4.*), cheaper than enumerating every model id per tier rule"
  - "Gitleaks-backed secrets-detection guardrail that scans prompts and completions before they leave the gateway, a concrete pattern for stopping credential leakage through model output"
  - "MCP tool calls are suggestions only by default, a second explicit API call is required to execute one, autoexecution is opt-in per tool via tools_to_auto_execute, matching our default-deny instinct for anything an agent can do"
differs:
  - "Bifrost keeps all governance state (provider configs, keys, budgets, usage) in memory per node and never re-reads it from the database after boot; OSS explicitly refuses multiple nodes against one Postgres backend, only Enterprise (with a modified RAFT) syncs nodes. Our control plane's entire premise is the opposite, Temporal plus Postgres as the durable source of truth factoryd resumes from after a crash, which our re-seedable constraint requires; copying Bifrost's in-memory model would break it"
  - "Identity is a caller-supplied, optionally-expiring virtual key (sk-bf-*), not a short-lived credential minted per unit of work. That fits a stable pool of developers and services calling a shared gateway, but it is the opposite of identity belonging to the task, not the machine; the closest fit in our stack is a stable key for our own operators or CI calling factory-gateway, not a substitute for the projected ServiceAccount token we mint per agent task"
  - "The guardrail suite, RBAC, audit logs, SSO/identity federation, clustering and adaptive load balancing are entirely Enterprise-gated behind a 14-day trial; the docs say plainly that is part of how we draw the OSS vs Enterprise line. Our own escape-hatch requirement for a tool means we could use Bifrost's OSS tier (already well above our RPS needs) but we would hit the same wall they name if we ever wanted multi-node HA or content guardrails without paying, a gate LiteLLM does not impose on budgets or routing"
ux_verdict: three commands to a first response (npx or docker run, open the web UI, curl a completion), and a genuinely built-out governance and analytics dashboard, but nothing to watch or approve an agent doing multi-step work because that is out of scope for a gateway
slop_verdict: real, actively maintained (commits land daily, per-module semver releases weekly), used in the open by a funded company, but its headline "50x faster than LiteLLM" benchmark is run against a 60ms mocked provider response by Bifrost's own admission, and no independent benchmark against a real provider was found
---

# Bifrost (Maxim)

## 1. What it is

Bifrost is an AI gateway: a proxy that sits between an application and 23-plus model providers (OpenAI, Anthropic, AWS Bedrock, Google Vertex, Azure, Groq, Ollama and more) behind one OpenAI-compatible API, adding failover, load balancing, budgets, rate limits, semantic caching and an MCP tool gateway. It is built by Maxim AI (legal entity H3 Labs Inc.), a seed-stage LLM-observability company, and doubles as the free front door to Maxim's paid Enterprise gateway. The README's central claim is "50x faster than LiteLLM" and "under 100 microseconds overhead at 5k RPS"; the repository confirms a real, large, Go-based gateway with genuine breadth of providers and governance features, but the speed claim is Maxim's own marketing (see section 8), not something this research could verify against a real provider.

The product is sold two ways: the Apache-2.0 OSS gateway (npx, Docker, Go SDK) and Bifrost Enterprise, "a strict superset" adding clustering, guardrails, RBAC, audit logs, identity federation and adaptive load balancing, sold on a 14-day trial with no listed price.

## 2. Mapping to our five planes

| Plane / principle | What Bifrost does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Webhooks exist only to push async-inference job completion, not to bring work in | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | Virtual keys, teams, customers and provider configs with budgets, stored in Postgres/MySQL/SQLite (framework/configstore), but no task or workflow state | factoryd with a Temporal workflow per task, Postgres, policy in Git | not comparable |
| Worker plane | None. Bifrost runs as a stateless gateway process, it does not execute agents | gVisor pod per task, default-deny egress | not comparable |
| Verification | None. No CI, gate or model review, it only proxies requests | Forgejo Actions, policy gates, stronger-model review | not comparable |
| Merge and deploy | None | Flux GitOps after bot merge | not comparable |
| Policy outside the model | Model/provider allowlists, budgets and (Enterprise) content guardrails enforced in gateway code before/after the call, never in a prompt | Capability rules as a YAML file in Git, enforced in gateway code and network policy | they lead on breadth of enforcement points, narrower on scope (no task capabilities) |
| Identity per task | A long-lived, optionally-expiring virtual key per caller/team/customer; OIDC federation (Enterprise) is for human admins logging into the UI, not workload identity | A projected, audience-scoped ServiceAccount token minted fresh per task, verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | Not applicable, it proxies chat/completions payloads, it does not coordinate multi-step agent work | TaskBrief in, branch and PR out | not comparable |

## 3. Architecture and stack

Go monorepo of many small modules, each with its own go.mod: core/ (bifrost.go, core/providers/ per-provider clients, core/mcp/ for tool calling, core/network/, core/schemas/), framework/ (configstore/ for virtual keys, teams, customers, budgets, migrations, on Postgres, MySQL or SQLite; logstore/ for request logs and billing projections, on Postgres, ClickHouse or SQLite, with materialized-view healing code; vectorstore/ for semantic-cache embeddings via chromem, Pinecone, Qdrant, Weaviate or Redis), transports/bifrost-http/ (the HTTP gateway binary, with the built UI copied in at build time so the whole thing ships as one binary or one Docker image), and plugins/ as a middleware chain (governance, logging, semanticcache, telemetry, otel, maxim, mocker, jsonparser, compat, routing, prompts, modelcatalogresolver). Guardrails (docs/enterprise/guardrails.mdx) are not among the OSS plugins directory, confirming they are Enterprise-only. The UI (ui/) is a Vite/React app using Radix UI and Monaco, built with npm and copied into transports/bifrost-http/ui for the single-binary deploy.

Deployment options: an npx command, a Docker image (maximhq/bifrost), a Helm chart (helm-charts/bifrost, pins podSecurityContext to uid 1000, drops all Linux capabilities, readOnlyRootFilesystem is false by default), and Terraform modules for AWS (ECS or EKS), GCP (GKE or Cloud Run), Azure (AKS or ACI) and generic Kubernetes. Config is a config.json file, the web UI, or a REST admin API; state defaults to local SQLite (config.db, logs.db under an app-dir) and moves to Postgres/MySQL/ClickHouse for production. The OSS docs state plainly that running multiple OSS nodes against one Postgres backend is unsupported, because node state lives in memory and is never re-read from the database after startup; only Enterprise synchronizes nodes, with "a slightly modified version of RAFT."

## 4. UX

Zero to a first response is three steps: start the gateway with npx or docker run, open the web UI at localhost:8080, then curl a chat completion. The web UI (screenshots in docs/media) covers provider and key configuration, a virtual-key builder with budget and rate-limit fields, real-time analytics, and an MCP session manager to inspect, re-authenticate or revoke per-user OAuth tokens. This is a materially more built-out operational surface than our console, which we already flag as "functional, not designed," with no real-time streams and no diff view. The gap runs the other way for our purpose, though: Bifrost's UI manages a gateway (keys, budgets, providers, cached responses), it has no concept of a running multi-step agent task, no kanban, no approval step and nothing for a human to intervene in mid-task, because none of that is its job.

## 5. Security, identity, sandbox, policy, cost

Sandbox: not applicable. Bifrost is a regular process or container; it does not execute untrusted code or isolate tenants from each other beyond normal process boundaries. Identity: a caller authenticates with a virtual key, accepted through several header styles for drop-in compatibility, that can carry an expiry, a team or customer attachment, and per-model allow or deny lists; the real provider API keys are held server-side (environment-variable references or encrypted at rest via framework/encrypt) and never returned to the caller. Policy: model and provider filtering and budgets are enforced in the governance plugin's gateway code; the fuller guardrail suite (secrets detection via Gitleaks, regex PII templates, an LLM-as-judge for natural-language policies, and integrations with Presidio, AWS Bedrock Guardrails, Azure Content Safety, Google Model Armor and others) is Enterprise-only. Cost: a strict hierarchy (customer, team, virtual key, provider config) where every applicable level's budget must have headroom before a request proceeds and every level is debited afterward; no atomic "hold" step comparable to our worst-case-price-then-reconcile lock was found, budget check and debit appear to happen per request against in-memory state, not independently verified for race safety under concurrent bursts.

## 6. What we should take from it

Narrow, copyable this month: the hierarchical budget structure with independent checks at every level is a sharper model than our current flat per-task/per-day/per-project envelope, and calendar-aligned resets are a one-line addition worth adding to our cost ledger. The deny-by-default empty-allowlist rule and regex model patterns are small, concrete defaults for expressing our coding-cheap/coding-frontier tier rules without enumerating every model id. The Gitleaks-backed secrets guardrail is a direct, small library we could bolt onto factory-gateway to catch an agent leaking a credential back out through model output. The pattern that tool calls are suggestions, execution needs a second explicit call, and autoexecution is opt-in per tool, is worth mirroring exactly as-is for any MCP tool factory-gateway proxies to an agent.

Broad: Bifrost's product bet is that governance UX (a builder for keys, budgets and rate limits, live analytics, a session manager for MCP credentials) deserves to be a first-class, well-designed surface rather than an afterthought bolted onto a proxy. That is direct pressure on our own console gap; a governance and budget view in the same spirit is worth prioritizing before a general-purpose diff view. Its guardrail-provider plugin seam (one interface, many pluggable vendors behind it) is a reusable shape: design our own policy or guardrail layer so a PII or secrets tool is a pluggable provider from day one, not a hard-coded dependency added later.

## 7. Where our philosophy differs and what that costs or buys us

Bifrost's control plane keeps everything in memory per node and treats its database as a passive store the node writes to but does not read back from after boot; the OSS tier is explicitly single-node for this reason. Our control plane is built the opposite way: Temporal plus Postgres is the durable source of truth factoryd must be able to crash and resume from, which our re-seedable-from-Git constraint requires. We could not adopt Bifrost's in-memory model without giving up that constraint, and Bifrost's own Enterprise-only RAFT layer for state sync is exactly the extra engineering that durability costs when it is added after the fact rather than designed in.

Bifrost's identity primitive is a long-lived, optionally-expiring virtual key a caller holds and presents; ours is a short-lived, task-scoped ServiceAccount token minted fresh and never seen by a human. These solve different problems (a stable pool of callers hitting a shared gateway, versus one disposable agent per task) and are not directly substitutable: adopting virtual keys as task identity would reintroduce a standing secret an agent could exfiltrate, which our "identity belongs to the task" principle exists to avoid. Where Bifrost's model does fit our stack is as the identity for our own operators or CI jobs calling factory-gateway, a role we do not currently name explicitly.

Finally, Bifrost's most distinctive safety and scale features sit entirely behind Enterprise: guardrails, RBAC, audit logs, SSO federation, clustering and adaptive load balancing. Our "best-of-breed open source with an escape hatch" constraint is satisfied by the OSS tier alone (its stated ceiling of 3,000 to 5,000 RPS on one node is far above our needs), but if we ever wanted a guardrail suite or multi-node HA from this project specifically, we would meet the same paywall Maxim names outright, unlike LiteLLM, which keeps budgets and routing in its OSS tier.

## 8. Red flags and slop assessment

The project is real and fast-moving: commits landed the day this report was written, each Go module is semver-tagged and released independently on a near-daily cadence, and the repo carries 8439 stars, 1308 forks and 1157 open issues. The headline performance claim is the biggest flag: Bifrost's own docs state benchmarks run against a mocked OpenAI response (a 60ms mock, per an independent review), and the "50x faster than LiteLLM" headline does not match the "54x" figure on Maxim's own comparison chart; no independent benchmark against a real provider was found as of 2026-08-22. The company is seed-stage (about 3M USD, June 2024, Elevation Capital), with no later round reported as of August 2026, a vendor-risk consideration for a component sitting on the critical path of every model call, flagged independently by a vendor-risk review site (druce.ai). Open-core gating is explicit and fairly wide: the docs state outright that the OSS versus Enterprise line is drawn partly to justify Enterprise revenue. No licence changes or security incidents specific to Bifrost were found in the time available; LiteLLM, the project Bifrost benchmarks itself against, had a 2026 PyPI supply-chain scare and a disclosed SQL-injection CVE, which is relevant competitive context but not a Bifrost issue.

## 9. Sources

- https://github.com/maximhq/bifrost (cloned shallow to /home/womb/repos/market-research-clones/bifrost)
- README.md, LICENSE
- docs/architecture/README.mdx (empty), docs/enterprise/overview.mdx
- docs/features/governance/budget-and-limits.mdx, docs/features/governance/virtual-keys.mdx, docs/features/keys-management.mdx
- docs/enterprise/guardrails.mdx
- docs/mcp/overview.mdx
- docs/quickstart/gateway/setting-up.mdx
- docs/deployment-guides/k8s.mdx, helm-charts/bifrost/values.yaml
- docs/features/webhooks.mdx
- core/go.mod, core/ (directory layout), framework/configstore, framework/logstore, framework/vectorstore
- ui/package.json, ui/app (directory layout)
- gh api repos/maximhq/bifrost (2026-09-29)
- gh api repos/maximhq/bifrost/releases (2026-09-29)
- https://www.getmaxim.ai/bifrost (fetched 2026-09-29)
- WebSearch: "Bifrost AI gateway maximhq funding company vs LiteLLM 2026" (2026-09-29), surfacing druce.ai vendor-risk profile, getmaxim.ai comparison articles, LiteLLM funding and 2026 security incident coverage
