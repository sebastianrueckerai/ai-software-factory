---
name: TensorZero
slug: tensorzero
url: https://tensorzero.com
repo: https://github.com/tensorzero/tensorzero
category: model-gateway
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only (Docker Compose or Helm); the hosted Autopilot beta ended with the company
company: TensorZero, Inc., New York; founded 2024; $7.3M seed Aug 2025 (FirstMark, Bessemer, Bedrock, DRW, Coalition); wound down June 2026
maturity: 11.7k stars, 969 forks, first commit 2024-07-16, last commit 2026-06-04, repo archived 2026-06-12, CalVer releases (UI v2026.6.0)
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 3
  ux: 2
  reseedable_selfhost: 2
steal:
  - Cost rate limits estimate cost upfront with a configurable default_cost, take the hit, then reconcile against the provider's real reported usage after the call (crates/tensorzero-core/src/rate_limiting) -- the same estimate-then-reconcile shape as our gateway's hold-then-book, worth checking our clamp logic against.
  - Rate limit rules scope by tag (tensorzero::each per value, tensorzero::total summed) or by API-key public ID, matched in priority order until the first hit -- a compact declarative shape for per-project or per-user quotas.
  - API keys are sk-t0-PUBLICID-SECRET, twelve characters public then secret: the public id is embedded in the key itself, so scoping, revocation and audit logs never need a lookup table.
  - Per-provider cost config is a list of JSON-pointer extraction rules (pointer, cost_per_million, required), including negative entries to net out prompt-cache discounts -- a clean, provider-agnostic way to keep a cost ledger honest without hardcoding per-vendor response shapes.
  - Dynamic per-request credential override (a dynamic:: prefix on api_key_location) sits next to static env-var credentials as a one-line escape hatch, worth having in factory-gateway for one-off overrides without a redeploy.
differs:
  - TensorZero only ever sees a single inference call plus later feedback events. It has no concept of a multi-hour task with state transitions, so however good its budgeting and auth are, a model gateway cannot be our control plane; LiteLLM's role in our design stays a thin proxy under a separate Temporal-backed task layer, and this project is two years of funded engineering confirming that boundary rather than blurring it.
  - Autopilot, its one agentic feature, only ever calls TensorZero's own typed tools (crates/autopilot-tools: config, evals, datasets, feedback) through an in-house durable-tools executor. It never touches a filesystem, a shell or arbitrary code, so nothing here informs sandbox or worker-plane design, only the evaluation plane.
ux_verdict: A clean observability and dataset UI for people who already think in "functions" and "variants," but no task board, no approval step and, since the shutdown, the docs site itself 301-redirects to the GitHub repo.
slop_verdict: Was real and used in anger (claimed roughly 1% of global LLM API spend, a public reference customer, 11.7k stars honestly earned as GitHub's number one trending repo). Not slop, but dead -- the company wound down and archived the repo on 2026-06-12, so it is a frozen Apache-2.0 snapshot, not a maintained dependency.
---

# TensorZero

## 1. What it is

TensorZero was an open-source LLMOps platform: a Rust gateway unifying LLM provider access, observability, evaluation, optimization and experimentation, plus a companion React-based UI. TensorZero, Inc. (New York, founded 2024) sold a complementary hosted "Autopilot" feature and presumably enterprise support around the free Apache-2.0 core; no other paid tier existed. The README claims "fuels ~1% of global LLM API spend" and "<1ms p99 latency overhead at 10k+ QPS" (README.md); these are the vendor's own numbers, not verified here. What the repository actually shows is a genuinely large, well-tested Rust workspace (crates/tensorzero-core, crates/gateway, 30+ crates) plus a real production user referenced in the CEO's own posts (SuperDial). On 2026-06-12 the company wound down and archived the GitHub repository; the live site now says only that the code remains available but is no longer maintained, and the docs subdomain 301-redirects to the GitHub docs/ tree.

## 2. Mapping to our five planes

| Plane / principle | What TensorZero does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Only inputs are inference requests and explicit feedback (metrics, human edits) tied to an inference or episode ID | Forgejo issues, PR comments, SigNoz alerts, escalations | not comparable |
| Control plane | Stateless gateway plus Postgres/Valkey for auth and rate-limit counters; no task or workflow concept | factoryd plus a Temporal workflow per task, Postgres, policy in Git | we lead |
| Worker plane | None for code. Autopilot runs typed tool calls (config edits, eval runs, dataset uploads) inside the gateway process, not a sandbox | gVisor pod per task, read-only root FS, default-deny egress | not comparable |
| Verification | LLM-judge and heuristic evaluations score inference outputs (crates/tensorzero-core/src/evaluations); no CI, no merge gate | Forgejo Actions, policy gates, stronger-model review | not comparable |
| Merge and deploy | None; Autopilot can propose and, if enabled, auto-apply config file edits via an "Apply changes" UI button, with no review step described | Bot merge after human approval or an auto rule | not comparable |
| Policy outside the model | Auth and rate limits enforced in the gateway's Rust code, keyed on tags or API-key public ID (crates/tensorzero-auth) | Capability policy as YAML in Git, enforced in gateway code and network policy | equal in spirit, narrower scope |
| Identity per task | Long-lived virtual API keys (sk-t0-publicid-secret) scoped by tag or key; no per-task minting or expiry beyond an optional fixed expiration date | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task | we lead |
| Artifacts not chat | N/A: no multi-agent handoff exists | TaskBrief in, branch/PR/event stream out | not comparable |

## 3. Architecture and stack

Rust workspace under crates/ (Cargo workspace root), notably tensorzero-core (config, model routing, evaluations, experimentation, rate limiting), gateway (Axum HTTP server, crates/gateway/src/router.rs), tensorzero-auth (API keys, Postgres-backed), and the newer autopilot-client / autopilot-worker / autopilot-tools / durable-tools crates for the Autopilot agent. The UI (ui/) is a React Router (Remix-style) app, CalVer-versioned independently (ui/package.json shows 2026.6.0). Storage is pluggable: ClickHouse for observability/eval/experimentation data at scale, or Postgres for the same data plus auth and adaptive A/B testing state (docs/deployment/clickhouse.mdx, docs/deployment/postgres.mdx); Valkey/Redis is optional for sub-millisecond rate limiting (docs/deployment/valkey-redis.mdx). Deployment is one gateway Docker image plus one UI image, with an official Helm chart example (examples/production-deployment-k8s-helm: gateway/ui Deployments, Services, Ingress, a ClickHouse values file). Model access is direct: the gateway holds provider credentials (env vars by default) and calls each provider's native API, with routing expressed as static [models.*.providers.*] config, not a policy engine.

## 4. UX

There is no console for watching agents; the UI is an inference/dataset/eval browser. First result: run one Docker Compose file (gateway plus ClickHouse or Postgres), point an existing OpenAI SDK client at the gateway's OpenAI-compatible endpoint with a placeholder API key, and change only the model name (docs/quickstart.mdx, README.md). That is two steps to a first inference. Seeing it in the UI (screenshots docs/quickstart-observability-inference.png, docs/quickstart-observability-function.png) is steps three and four. There is no approval or intervention step to describe because there is no long-running agent task to intervene on; Autopilot's "Apply changes" button is the closest thing, a single accept or reject on a proposed config diff, and the docs explicitly warn it is unsafe with more than one UI user. Interfaces: HTTP gateway (OpenAI-, Anthropic- and native-compatible), a web UI, and an MCP server (crates/tensorzero-mcp) for programmatic or agent access to TensorZero's own data.

## 5. Security, identity, sandbox, policy, cost

Security and identity: provider API keys live in the gateway's environment only; clients authenticate with a separate virtual API key (docs/operations/set-up-auth-for-tensorzero.mdx), so callers never see upstream credentials. The UI itself has no auth yet ("coming soon"); the docs tell operators to put Nginx, OAuth2 Proxy or Tailscale in front of it, i.e. auth for the human-facing surface is left to the user entirely. Sandbox: none exists or is needed, nothing here executes arbitrary code. Policy: enforced in Rust code (auth middleware, rate-limit manager), not prompts, but the only policy vocabulary is quotas and scopes, not capabilities or approvals. Cost: per-provider cost rules extract real token counts via JSON pointer and price them; rate limits can cap cost_per_day with an upfront estimate reconciled after the call (docs/operations/track-usage-and-cost.mdx, docs/operations/enforce-custom-rate-limits.mdx). There is no concept of a project-wide spend envelope or a human-approval-on-overspend path, only hard per-window caps.

## 6. What we should take from it

Narrow: the estimate-then-reconcile cost accounting and the tag- or API-key-scoped, priority-ordered rate-limit rules are worth diffing against factory-gateway's own hold and book logic this month; the embedded-public-id API key format is a one-line win if we ever mint more virtual keys than tasks. Broad: nothing changes our product shape. TensorZero spent two years and $7.3M proving that a best-in-class model gateway, however fast and well designed, stays a component and not a control plane; that is a validation of keeping LiteLLM firmly underneath our own Temporal-backed task layer rather than a reason to add scope to it.

## 7. Where our philosophy differs and what that costs or buys us

TensorZero centres everything on a "function and variant" abstraction (a named, schema-typed LLM call with pluggable implementations) so it can A/B test and fine-tune per function. Adopting that shape for our own agent-model calls would buy structured prompt versioning and easier optimisation later, at the cost of an extra abstraction layer between the harness and LiteLLM that our current design has deliberately avoided. Its "UI has no auth yet" stance is the opposite of our identity-per-task, no-half-measures principle; copying its "put an OAuth2 proxy in front of it" pattern for our own console would be a regression, not a saving.

## 8. Red flags and slop assessment

The clearest red flag is terminal: the GitHub repository is archived (gh api repos/tensorzero/tensorzero returns archived: true, last push 2026-06-04) and the company wound down in June 2026, confirmed by the CEO's own Hacker News comment and by the live site's "no longer maintained" notice; the docs subdomain now 301s to the raw docs/ folder on GitHub. No security incidents or licence changes were found; the Apache-2.0 licence and its CLA process stayed constant throughout. Before the shutdown the project showed normal healthy-project signals (392 open issues, 969 forks, frequent CalVer releases, a named security contact) -- the failure mode here was commercial, not technical or a governance lapse. The lesson for us is about dependency choice, not code quality: a single-company-backed tool can vanish inside two years even with real usage and no debt.

## 9. Sources

- https://github.com/tensorzero/tensorzero (cloned shallow to ~/repos/market-research-clones/tensorzero)
- README.md, AGENTS.md, CLA.md, SECURITY.md, package.json, ui/package.json
- crates/gateway/Cargo.toml, crates/gateway/src (router.rs, cli.rs, main.rs)
- crates/tensorzero-auth/Cargo.toml, crates/tensorzero-auth/src (key.rs, middleware.rs, postgres/)
- crates/tensorzero-core/src (rate_limiting/, evaluations/, experimentation/, cost.rs, model.rs, model_table.rs)
- crates/autopilot-client, crates/autopilot-worker, crates/autopilot-tools, crates/durable-tools
- docs/quickstart.mdx
- docs/deployment/tensorzero-autopilot.mdx, docs/deployment/clickhouse.mdx, docs/deployment/postgres.mdx, docs/deployment/valkey-redis.mdx
- docs/operations/set-up-auth-for-tensorzero.mdx, docs/operations/enforce-custom-rate-limits.mdx, docs/operations/track-usage-and-cost.mdx, docs/operations/manage-credentials.mdx
- docs/comparison/litellm.mdx
- examples/production-deployment-k8s-helm/ (Chart.yaml, templates/, values.yaml)
- gh api repos/tensorzero/tensorzero, fetched 2026-09-29
- https://www.tensorzero.com/, fetched 2026-09-29, shows "no longer maintained"
- https://www.tensorzero.com/docs/quickstart, 301-redirects to GitHub, checked 2026-09-29
- Hacker News item 48518120, CEO's wind-down comment, 2026-06
- https://pulse2.com/tensorzero-7-3-million-seed-funding-raised-for-building-stack-for-industrial-grade-llm-applications/, 2025-08
- https://venturebeat.com/infrastructure/tensorzero-nabs-7-3m-seed-to-solve-the-messy-world-of-enterprise-llm-development, 2025-08
- https://future-stack-reviews.com/tensorzero-shut-down/, 2026-06-23
- https://ai-tldr.dev/releases/tensorzero-archived-jun12/, 2026-06
