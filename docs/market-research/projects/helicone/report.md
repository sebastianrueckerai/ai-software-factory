---
name: Helicone
slug: helicone
url: https://www.helicone.ai
repo: https://github.com/Helicone/helicone
category: observability-evals
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted (Docker Compose or Helm on EKS) or hosted SaaS; free tier plus $79/mo Pro and $799/mo Team, Enterprise on contact
company: San Francisco, YC W23, founded 2023, small pre-seed (sources disagree, $0.5-2M); acquired by Mintlify in March 2026, now in maintenance mode
maturity: 6.2k stars, 677 forks, 161 open issues, first commit Jan 2023, last commit 2026-09-16 (a security fix), commit cadence now maintenance-only
similarity: 1
axes:
  signals_intake: 1
  control_plane: 0
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 3
  ux: 4
  reseedable_selfhost: 2
steal:
  - "Helicone-RateLimit-Policy header: quota;w=window;u=request|cents;s=user|property, an IETF-shaped, provider-agnostic way to express per-user or per-cost ceilings at the gateway edge."
  - "packages/cost is an open, file-based registry (providers/mappings.ts, models/calculate-cost.ts) covering 300+ models and providers. Worth vendoring or diffing against instead of hand-rolling our own price table for the cost ledger."
  - "Sessions: three headers (Helicone-Session-Id/-Path/-Name) build a parent/child call tree across LLM, tool and vector-db calls with no tracing SDK. Cheap way to give the console a per-task call tree before a real OTel trace view exists."
  - "Provider routing string syntax (model/provider, comma fallback chains, ! to exclude a provider) is a compact way to express a routing policy inline, without a config file."
  - "Two-tier prompt-injection screening: a small model (Prompt Guard, 86M) gates every call, a bigger model (Llama Guard) runs only on suspicion. Same cheap-detector-then-strong-model shape as our supervisor ladder, one more data point that the pattern generalises."
differs:
  - "Identity is a long-lived static API key (sk-helicone-...) proxied through a central vault that decrypts provider keys server-side, the opposite of our per-task, audience-scoped, no-raw-credentials model. CVE-2026-85178 (a missing organisation filter in the vault's key-lookup endpoint) shows the failure mode: any org admin could read another tenant's plaintext OpenAI or Anthropic key."
  - "There is no task or workflow concept. Helicone observes calls an application already decided to make; it has no scheduler, no approval state and nothing resembling our control plane. Adopting it adds a log and cost sink next to our ledger, not a replacement for any plane."
  - "The AI Gateway's core proxy is a Cloudflare Worker using Cloudflare KV and Durable Objects for rate limiting (worker/src/lib/rate-limit, durable-objects). Self-hosting it ties the gateway to Cloudflare-shaped primitives, in tension with our commodity-hardware, no-vendor-specific-service constraint."
ux_verdict: Two lines of code and a base URL swap get a first logged request in minutes; the dashboard, sessions view and playground are materially ahead of our htmx console's current state.
slop_verdict: Real and used in anger (16,000 orgs, 14.2 trillion tokens over three years, per the founders), but Mintlify acquired the company in March 2026 and put it into maintenance mode (security and bug fixes only), so treat anything beyond what already exists in the repo as unlikely to arrive.
---

# Helicone

## 1. What it is

Helicone is an open-source LLM observability platform and, since mid-2025, an AI gateway: a single OpenAI-compatible endpoint (`https://ai-gateway.helicone.ai`) that routes to 100+ providers, with logging, cost tracking, sessions, prompt management and a playground built on top. It was built by three YC W23 founders and is sold as a freemium SaaS (free tier, $79/month Pro, $799/month Team, Enterprise on contact) with an Apache-2.0-licensed self-hosted path. The README claims "SOC 2 and GDPR compliant" and "Enterprise Ready"; the pricing page shows SOC-2/HIPAA only unlocks at the $799/month Team tier and SSO, on-prem deployment and custom MSAs require an Enterprise contact, so "open source" and "enterprise ready" cover different parts of the product.

The repository backs the marketing: five real services (web, worker, valhalla/jawn, Supabase, ClickHouse, Minio), a working docker-compose self-host path, and code depth in the gateway (routing, rate limiting, cost calculation) that goes well past a thin wrapper. What the README does not say: Mintlify acquired Helicone in March 2026 ([Helicone's own announcement](https://www.helicone.ai/blog/joining-mintlify), [Mintlify's acquisition post](https://www.mintlify.com/blog/mintlify-acquires-helicone), both dated 2026-03-03) and the team moved to Mintlify to work on unrelated "knowledge infrastructure." The product is now in maintenance mode: the last commit in the repo (2026-09-16) is a security fix, not a feature.

## 2. Mapping to our five planes

| Plane / principle | What Helicone does | What we do | Verdict |
|---|---|---|---|
| Signals | Alerts on request metrics and per-request webhooks fire after a call completes; nothing consumes issues or triggers agent work | Forgejo webhooks, SigNoz alerts and factoryd intake all create tasks | not comparable |
| Control plane | None. Jawn is a logging API, not a task or workflow engine | Temporal workflow per task, Postgres task registry, budgets, approvals | we lead |
| Worker plane | None. Helicone proxies calls an app already made; it runs nothing on the app's behalf | One disposable gVisor sandbox per task | we lead |
| Verification | None | Forgejo Actions, policy gates, stronger-model review | we lead |
| Merge and deploy | None | Bot merge after approval, Flux GitOps rollout | we lead |
| Policy outside the model | Rate limits enforced in Cloudflare KV/Durable Objects at the edge; a separate Prompt Guard/Llama Guard model blocks flagged prompts before they reach the target model. Real code enforcement, but content-moderation and quota shaped, not capability-shaped, and org roles are a flat owner/admin/member, not fine-grained rules | Capability rules in Git, enforced in gateway code and network policy | equal on "outside the model," we lead on granularity |
| Identity per task | One long-lived API key per org/user; provider keys held decrypted in a central vault. CVE-2026-85178 shows a missing org filter let any admin read another tenant's provider key | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, no raw key ever in the sandbox | we lead |
| Artifacts not chat | N/A, no agents | Git is the coordination mechanism | not comparable |

## 3. Architecture and stack

TypeScript throughout. `web/` is the Next.js dashboard. `worker/` is a Cloudflare Worker (Wrangler) that does the actual proxying, provider translation and rate limiting (`worker/src/routers/aiGatewayRouter.ts`, `worker/src/lib/ai-gateway`, `worker/src/lib/rate-limit`, `worker/src/lib/durable-objects`). `valhalla/jawn` is an Express + Tsoa server that ingests logs and serves the REST API. Storage is Supabase (Postgres, org/user/auth tables, e.g. `supabase/migrations/20230724194151_org_role.sql` adding a flat `org_role` column) for application state, ClickHouse for analytics, and MinIO/S3 for request and prompt bodies. `packages/cost` is a standalone, versioned model-pricing registry used by both the worker and jawn. Self-hosting is `docker/docker-compose.yml` (Postgres, ClickHouse, MinIO, Redis, Jawn, web, migrations via Flyway) for local/small use, or a Helm chart plus Terraform for AWS EKS (`docs/getting-started/self-host/kubernetes.mdx`) for production, though the top-level README still says the "production-ready Helm chart" requires an enterprise contact, an inconsistency between the two documents. There is no separate agent runtime: Helicone never executes model calls itself, it only sits in front of calls the client app initiates.

## 4. UX

Onboarding is two edits to existing code: change `baseURL` to `https://ai-gateway.helicone.ai` and set the API key, then the first request shows up in the dashboard. No sandbox to configure, no agent to watch, because there is no agent: the user's own application makes the call, Helicone only observes and optionally routes it. The dashboard (requests, sessions, users, HQL query view, playground, cost charts) is real product, per the screenshot in `docs/features/sessions.mdx`, and is well ahead of our console, which has no real-time stream and no diff view. There is nothing to approve or intervene in, since Helicone runs no autonomous work; the closest analogue is killing a session by revoking a key or turning off a route.

## 5. Security, identity, sandbox, policy, cost

Credentials: BYOK provider keys are stored encrypted in a central vault and decrypted server-side per request; Helicone's own managed keys are used as fallback when the user has none. There is no sandbox and no agent execution, so that axis does not apply. Policy is enforced partly in code: the `Helicone-RateLimit-Policy` header is checked against Cloudflare KV counters, and `Helicone-LLM-Security-Enabled` routes the prompt through Meta's Prompt Guard (and optionally Llama Guard) before the real model sees it, blocking the call server-side on a threat verdict, OpenAI models only. Cost control is a real strength: a public, versioned pricing table (`packages/cost`) for 300+ models, cost-based rate limits (`u=cents`), 0%-markup credits, per-user or per-property quotas. None of this is a hard spend cap with a database-locked hold like ours; it is an async counter with a small latency cost the docs admit to.

## 6. What we should take from it

Narrow: the `packages/cost` pricing registry is directly reusable reference data for our own cost ledger rather than something to hand-maintain. The rate-limit header shape (`quota;w=window;u=unit;s=segment`) is a clean, provider-agnostic format worth mirroring for any header-driven, per-task ceiling we expose. The Sessions header trio (`Helicone-Session-Id/-Path/-Name`) is a nearly-free way to build a call tree in a console before we invest in a real trace UI.

Broad: the two-minute, no-sandbox onboarding is only possible because Helicone's job is narrower than ours (observe calls, don't run agents); it is a reminder that our own onboarding path should be judged against "how fast to a first result," not against feature count. The two-tier cheap-model-then-expensive-model security screen is one more confirmation that a cheap detector gating a stronger model, our supervisor pattern, is a common and sound shape, not something specific to coding agents.

## 7. Where our philosophy differs and what that costs or buys us

Against SigNoz specifically: Helicone adds LLM-specific views SigNoz does not have out of the box (per-model cost, prompt-level sessions, a query language over LLM logs, provider fallback routing) but none of it is task-aware; it has no idea a "task" exists, only requests and sessions an application chose to tag. It would sit next to LiteLLM and factory-gateway as a place to view spend and traces, not replace either, since it enforces no capability policy and issues no scoped credentials, it enforces rate and content limits at the edge of a call, which is a narrower and weaker guarantee than gateway-verified ServiceAccount tokens mapped to task, budget and approval state.

Where copying them would cost us: their identity model (one static key per org, decrypted centrally) is exactly the shape our per-task, no-raw-credentials principle exists to reject, and CVE-2026-85178 is a live example of what goes wrong when a vault holding many tenants' real provider keys has one missing filter. Where their approach might buy us something: their edge-enforced, cost-based rate limit is simpler to operate than a DB-locked hold-and-book, at the cost of being an eventually-consistent counter rather than a hard cap; we accept that cost deliberately because "hard cap" is one of our four constraints.

## 8. Red flags and slop assessment

Mintlify acquired Helicone in March 2026; the founders' own post and Mintlify's acquisition post both confirm the team moved on and the product is now maintenance-only, security and bug fixes, with Mintlify actively helping customers migrate off ([Helicone blog, 2026-03-03](https://www.helicone.ai/blog/joining-mintlify); [Mintlify blog, 2026-03-03](https://www.mintlify.com/blog/mintlify-acquires-helicone)). The commit history matches: the last commit (2026-09-16) is a security fix, not a feature.

Two serious authorization bugs surfaced in 2026, both broken-object-level-authorization (BOLA/IDOR) class: CVE-2026-85178, a missing organisation filter in the vault's `GET /v1/vault/key/{providerKeyId}` endpoint that let any org admin decrypt another tenant's plaintext provider key, reported by email on 2026-06-03, unanswered until [VulnCheck published it](https://www.vulncheck.com/advisories/helicone-cross-tenant-provider-key-disclosure-via-missing-organization-filter) and [GitHub issue #5712](https://github.com/Helicone/helicone/issues/5712) went public, CVSS 7.7/8.3, fixed in commit `ca34549`; and a second pair of issues fixed 2026-09-16 (`fix(jawn): close platform-admin takeover and HQL cross-tenant bypass`, commit message visible in `git log`), a case-insensitive path check that let a forged API key reach `/v1/admin/...` routes, plus an HQL cross-tenant bypass, both reported through Helicone's disclosure programme. Both incidents sit exactly in the multi-tenant org-scoping logic our per-task, gateway-verified identity model is designed to avoid needing to get right in application code.

Open-core gating is real: SOC-2/HIPAA needs the $799/month Team tier, SSO and on-prem deployment need an Enterprise contact, despite "open source" and "self-hostable" marketing on the same page. Docs have drifted: the top-level README still tells users the production Helm chart needs an enterprise contact, while the docs site links a fully public Helm repository, a small but telling sign of a project no longer getting routine cleanup.

## 9. Sources

- ~/repos/market-research-clones/helicone: README.md, AGENTS.md, FULL_AGENT_LOOP.md, DIAGRAMS.md (cloned 2026-09-29, HEAD at last commit 2026-09-16)
- ~/repos/market-research-clones/helicone/docs/gateway/overview.mdx
- ~/repos/market-research-clones/helicone/docs/gateway/provider-routing.mdx
- ~/repos/market-research-clones/helicone/docs/features/advanced-usage/custom-rate-limits.mdx
- ~/repos/market-research-clones/helicone/docs/features/advanced-usage/llm-security.mdx
- ~/repos/market-research-clones/helicone/docs/features/sessions.mdx
- ~/repos/market-research-clones/helicone/docs/features/webhooks.mdx
- ~/repos/market-research-clones/helicone/docs/getting-started/self-host/kubernetes.mdx
- ~/repos/market-research-clones/helicone/docker/docker-compose.yml
- ~/repos/market-research-clones/helicone/supabase/migrations/20230724194151_org_role.sql, 20240102173127_organization_owner_backfill.sql, 20221221051842_user_auth_rbac.sql
- ~/repos/market-research-clones/helicone/packages/cost (costCalc.ts, index.ts, providers/mappings.ts, models/calculate-cost.ts)
- ~/repos/market-research-clones/helicone/worker/src/routers, worker/src/lib (ai-gateway, durable-objects, rate-limit)
- gh api repos/Helicone/helicone (fetched 2026-09-29): 6188 stars, 677 forks, 161 open issues, Apache-2.0, created 2023-01-31
- gh api repos/Helicone/helicone/commits (fetched 2026-09-29): last commit 2026-09-16, "fix(jawn): close platform-admin takeover and HQL cross-tenant bypass (#5816)"
- https://www.helicone.ai (fetched 2026-09-29)
- https://www.helicone.ai/pricing (fetched 2026-09-29)
- https://www.helicone.ai/blog/joining-mintlify (2026-03-03)
- https://www.mintlify.com/blog/mintlify-acquires-helicone (2026-03-03)
- https://www.vulncheck.com/advisories/helicone-cross-tenant-provider-key-disclosure-via-missing-organization-filter (2026-09-03)
- https://github.com/Helicone/helicone/issues/5712
