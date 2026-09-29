---
name: Portkey AI Gateway
slug: portkey
url: https://portkey.ai
repo: https://github.com/Portkey-AI/gateway
category: model-gateway
license: MIT
open_source: partial
self_hostable: partial
hosting_model: self-hosted gateway container (npx, Docker, Cloudflare Workers) or Portkey-hosted cloud; enterprise "hybrid" runs the data plane in your VPC but keeps the Control Plane hosted by Portkey
company: Portkey AI, San Francisco, founded 2023. Raised a $15M Series A in February 2026 (Elevation Capital, Lightspeed). Acquired by Palo Alto Networks; deal closed 29 May 2026, folded into the Prisma AIRS AI security line
maturity: 13,108 stars, 1,320 forks, 279 open issues, 30 contributors (GitHub API), repo created 2023-08-23, last commit to main 2026-05-25 (the week the acquisition closed), last npm release v1.15.2 on 2026-01-12
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 1
  ux: 2
  reseedable_selfhost: 2
steal:
  - "Stateless proxy on Hono: the whole gateway is one Hono app (src/index.ts) that runs unmodified on Node, Docker, or Cloudflare Workers, with no database in the open-source core. Worth copying for factory-gateway if we ever want an edge-deployable variant."
  - "Config-driven strategy tree resolved per request: tryTargetsRecursively (src/handlers/handlerUtils.ts) walks a JSON target graph with modes single/loadbalance/fallback/conditional (schema in src/middlewares/requestValidator/schema/config.ts), merging retry, cache and guardrail settings down the tree. Cleaner than hardcoding our coding-cheap to coding-frontier ladder in Go if we ever want operators to edit the ladder without a redeploy."
  - "Guardrail hooks as small addressable plugins: HooksManager and HookSpan (src/middlewares/hooks/index.ts) run named checks before and after the provider call; each guardrail vendor is a plugin folder with its own manifest.json under plugins/ (22 of them: aporia, pangea, patronus, promptfoo, walledai and others). A reasonable shape for wiring extra automated checks into LiteLLM without a bespoke integration each time."
  - "conf.json's admin_token plus a 12-hour session cookie (src/middlewares/adminAuth/index.ts) is a minimal, dependency-free way to gate a local debug console. Smaller than anything we would build for a throwaway dev view."
  - "npx @portkey-ai/gateway to a running proxy with a local log console in under two minutes is a genuinely fast zero-to-first-result path. Our own onboarding gap (noted as a weak spot in 00-our-vision.md) is exactly this kind of local, no-cloud-dependency quickstart."
differs:
  - "Budget enforcement is a stub in the open-source repo. The hook point PreRequestValidatorService (src/handlers/services/preRequestValidatorService.ts) reads c.get('preRequestValidator') and does nothing if it is unset; nothing in src/ ever sets it. Real spend caps live only in Portkey's closed, centrally hosted Control Plane. Our hard-cap-with-holds design has to be real in code we own; Portkey's open gateway cannot be that on its own."
  - "The conf.json integrations[].rate_limits field is accepted but never read anywhere in src/ (grep finds no consumer). It looks like enforced policy and is not, which is the opposite of our 'policy lives outside the model, enforced in code' principle: here policy sits in a config file that nothing enforces."
  - "Even the 'self-hosted' enterprise deployment keeps virtual keys, configs, prompts and the transaction database on Portkey's hosted Control Plane, synced to the VPC-side gateway every 60 seconds with a 7-day local cache TTL (per portkey.ai/docs/self-hosting/hybrid-deployments/architecture). That is a permanent external dependency our 're-seedable, no vendor-specific service' constraint rules out."
  - "Identity is a static API key or virtual key resolved from that hosted Control Plane, not a short-lived, audience-scoped, task-bound token. There is no equivalent of our per-task ServiceAccount token verified against a cluster OIDC issuer."
  - "The project is now owned by Palo Alto Networks (closed 29 May 2026, about $117M per PANW's 10-K) and points at Prisma AIRS. A neutral open-source dependency became a security vendor's product line in the same week its main-branch commits stopped."
ux_verdict: The two-minute npx quickstart and local log console beat our console's onboarding for a lone developer, but the console only shows request logs, not agent runs, and there is no approval or intervention model at all because there is no task concept.
slop_verdict: "Real and used in anger before 2026 (1T+ tokens/day and 24,000+ orgs claimed around the Series A), not a README project, but development looks stalled since the Palo Alto Networks acquisition closed: no commits to main and no release since before the deal."
---

# Portkey AI Gateway

## 1. What it is

Portkey AI Gateway is an open-source HTTP proxy that puts a single OpenAI-compatible API in front of 250+ language, vision and audio models, with retries, fallbacks, load balancing, caching and guardrails. It targets application developers who call several LLM providers and want one client library, not agent-factory builders. The company sells a hosted "Control Plane" (dashboard, virtual keys, budgets, RBAC, semantic caching) on top of the same open gateway.

The README claims "blazing fast (<1ms latency)" and "over 10B tokens processed everyday" and, as of a March 2026 release, that the "core enterprise gateway" is now fully open source under MIT. The repository backs up the "fast, small proxy" claim: the gateway is a single Hono app with no required database. It does not back up any claim about budgets or access control being enforced in the open-source code; those checks are stub hook points that only the closed Control Plane fills in.

Portkey raised a $15M Series A in February 2026 and was acquired by Palo Alto Networks about ten weeks later, closing 29 May 2026 for roughly $117M, to become part of the Prisma AIRS AI security platform. The last commit to the gateway's main branch is dated 25 May 2026, four days before that close, and the last npm release predates it by over four months.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. The gateway only receives inline chat/completion calls from a caller's own code | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | A hosted dashboard that stores routing configs, virtual keys and prompts, synced to the gateway every 60s | Temporal workflow per task, Postgres task registry, budgets, approvals, audit trail | we lead |
| Worker plane | None. No concept of an agent, a sandbox or a disposable task runner | One gVisor pod per task, read-only root FS, default-deny egress | not comparable |
| Verification | None. Guardrails check a single request/response pair, not a code change | CI, policy gates, stronger-model review before merge | not comparable |
| Merge and deploy | None | Bot-merged PR, Flux GitOps rollout with a soak window | not comparable |
| Policy outside the model | Guardrails (input/output checks) are JSON config executed by HooksManager in gateway code, not a prompt | Capability rules as a Git-versioned YAML file enforced in gateway code and network policy | equal, narrower scope |
| Identity per task | A long-lived virtual key or API key resolved from the hosted Control Plane | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task | we lead |
| Artifacts not chat | Not applicable; there is no agent and no artifact, only a proxied API call | TaskBrief in, branch/PR/event stream out | not comparable |

## 3. Architecture and stack

TypeScript on Hono, built with Rollup, tested with Jest. src/index.ts wires one Hono app and mounts routes for /v1/chat/completions, /v1/completions, /v1/embeddings, /v1/messages (Anthropic format) and others straight to handler modules under src/handlers/. There is no required datastore in the open-source core: Redis (ioredis) is optional and only used for response caching (src/middlewares/cache, src/shared/services/cache).

The routing brain is tryTargetsRecursively in src/handlers/handlerUtils.ts (1,353 lines total), which walks a JSON strategy.targets tree with modes single, loadbalance, fallback and conditional (validated by a Zod schema in src/middlewares/requestValidator/schema/config.ts), merging retry, cache, timeout and guardrail settings down the tree per request. selectProviderByWeight implements weighted load balancing. Guardrails run through HooksManager and HookSpan (src/middlewares/hooks/index.ts), each guardrail vendor supplying a plugin under plugins/<name>/manifest.json (22 plugins: aporia, pangea, patronus, promptfoo, walledai, panw-prisma-airs, and more). Each LLM provider is a folder under src/providers/<name>/ implementing a standard api.ts / chatComplete.ts / embed.ts interface that normalises to the OpenAI-compatible schema.

Local secrets and guardrail activation live in conf.json (admin_token, plugins_enabled, credentials, integrations[] with per-integration rate_limits). Grepping src/ shows that field is never read outside the finetune provider code, so it is not enforced anywhere in the open-source gateway. Deployment shapes in the repo: npx @portkey-ai/gateway, a multi-stage Node 20 Alpine Dockerfile, docker-compose.yaml, a bare Kubernetes deployment.yaml (single replica, NodePort Service, no Ingress, no TLS, no resource limits), and wrangler.toml for Cloudflare Workers. The enterprise "hybrid" Helm chart for VPC deployment is not in this repository; per portkey.ai's hybrid-deployments architecture page it still depends on Portkey's hosted Control Plane for the transaction database, virtual keys and config sync.

## 4. UX

npx @portkey-ai/gateway starts a local server on port 8787 and a static console at /public/. A first request is one SDK or curl call with a provider name and that provider's own API key; the console then shows it as a log line. That is three steps and under two minutes, matching the README's claim; nothing in the repo contradicts it for the local, no-cloud path. Interfaces: REST API, JS/Python SDKs, and the bundled local console (src/public/index.html, not read in depth: static bundle, not analysed line by line).

There is no notion of watching an agent work, approving a step, or stopping a run, because the gateway has no concept of a multi-step task. The console is a request log viewer, not an operations console. Compared with our console's stated gaps (no onboarding, no real-time work stream), Portkey's local quickstart is faster to a first result, but it solves a much smaller problem: seeing one proxied call, not supervising a running agent.

## 5. Security, identity, sandbox, policy, cost

Security and policy are enforced by guardrail plugins running inside the gateway process against a config object (example from the README: an output_guardrails entry with a "contains" check set to deny). This part is genuinely in code, not a prompt. Local admin console access is a single shared admin_token bearer plus a 12-hour session cookie (src/middlewares/adminAuth/index.ts); there is no per-user RBAC in the open-source code, RBAC is listed as a hosted-plane feature.

Identity for outbound provider calls is whatever key sits in conf.json's credentials block or whatever virtual key the hosted Control Plane resolves; it is not short-lived and not scoped to a task. Sandboxing does not apply: the gateway executes no agent code, it only proxies HTTP calls to model providers, and it makes no attempt to restrict its own egress (it must be allowed to reach every configured provider).

Cost control is the weakest area. conf.json accepts per-integration rate_limits, but nothing in src/ reads them. The one enforcement seam, PreRequestValidatorService (src/handlers/services/preRequestValidatorService.ts), reads a Hono context value ("preRequestValidator") that is never set anywhere in this repository, confirmed by grepping the whole tree outside the test mocks. Spend caps are a real feature of Portkey's paid, hosted product, not of the code in this repository.

## 6. What we should take from it

Narrow: the recursive, config-driven fallback and loadbalance tree (tryTargetsRecursively) is a cleaner shape than a hardcoded model-tier ladder, and worth a look next time factoryd's model-tier logic needs to grow past a fixed coding-cheap to coding-frontier to review-frontier chain. The guardrail-as-plugin pattern (manifest.json per vendor, hooks run before and after the call) is a reasonable template if LiteLLM ever needs more pluggable pre/post checks than it has built in. The admin-token-plus-session-cookie pattern is enough for gating a throwaway local debug view without pulling in a real auth stack.

Broad: the two-minute, zero-dependency npx to first-logged-request path is the kind of onboarding speed our own console lacks, and is worth studying even though it solves a much narrower problem (one proxied call, not a running agent). Beyond that, Portkey's open-source gateway does not compete with LiteLLM for our purposes: LiteLLM keeps budgets, virtual keys and spend tracking in its own open-source code, where our design needs them to live.

## 7. Where our philosophy differs and what that costs or buys us

Our "policy lives outside the model" principle assumes the enforcement code is ours and auditable end to end. Portkey's gateway looks like it does this for guardrails, but for cost control the enforcement point is a no-op stub that only the closed Control Plane fills in, and the rate_limits config field is accepted but silently unenforced. Adopting Portkey as a budget layer would mean either buying the hosted product or writing our own enforcement behind its stub, at which point we would not be gaining anything over extending LiteLLM (which already enforces budgets in its own open-source code) or factory-gateway directly.

Our "re-seedable, no vendor-specific service" constraint rules out Portkey's enterprise hybrid mode outright: even self-hosting the data plane keeps a hosted Control Plane in the loop for keys, configs and the transaction database. Our "identity belongs to the task, not the machine" principle has no counterpart here at all; Portkey's identity model is a long-lived key, which is exactly the pattern our per-task ServiceAccount tokens were designed to avoid.

## 8. Red flags and slop assessment

The clearest red flag is timing: the last commit to main is dated 2026-05-25, four days before Palo Alto Networks closed its acquisition on 2026-05-29, and the last npm release (v1.15.2) predates that by over four months (2026-01-12). Twenty-plus open branches with feature work exist, but none show commits more recent than March 2026. This reads as a project in maintenance mode immediately after an acquisition, not as slop, since the usage claims made around the Series A (1T+ tokens/day, 24,000+ organisations) are independently reported in press coverage of the funding round, not just marketing copy.

Open-core gating is real and specific: the budget and spend-cap enforcement point in the open-source code is an unfilled stub, and a config field that looks like it enforces rate limits does nothing. The project's future roadmap and support now run through a security vendor whose priorities may or may not include keeping the plain LLM-gateway use case maintained as a neutral, community-driven project.

## 9. Sources

- https://github.com/Portkey-AI/gateway (cloned shallow to a market-research-clones checkout, read 2026-09-29)
- README.md, CLAUDE.md, conf.example.json, docker-compose.yaml, Dockerfile, deployment.yaml, wrangler.toml, package.json
- docs/installation-deployments.md
- src/index.ts, src/handlers/handlerUtils.ts, src/handlers/services/preRequestValidatorService.ts, src/services/conditionalRouter.ts, src/middlewares/hooks/index.ts, src/middlewares/hooks/types.ts, src/middlewares/adminAuth/index.ts, src/middlewares/requestValidator/schema/config.ts, src/providers/ (directory layout), plugins/ (directory layout)
- tests/unit/src/handlers/services/preRequestValidatorService.test.ts
- gh api repos/Portkey-AI/gateway (2026-09-29): stars, forks, open issues, license, created and pushed dates
- gh api repos/Portkey-AI/gateway commit, branch, contributor and release listings (2026-09-29)
- npm view @portkey-ai/gateway version and time (2026-09-29)
- https://portkey.ai/docs/self-hosting/hybrid-deployments/architecture (fetched 2026-09-29)
- https://finance.yahoo.com/news/portkey-raises-15m-series-170000953.html (Series A, 2026-02-19)
- https://www.globenewswire.com/news-release/2026/03/24/3261574/0/en/portkey-s-gateway-is-now-fully-open-source-processing-over-1-trillion-tokens-every-day.html (2026-03-24)
- https://www.paloaltonetworks.com/company/press/2026/palo-alto-networks-completes-acquisition-of-portkey-to-secure-ai-agents (2026-05-29 close)
- WebSearch: Portkey funding and acquisition coverage, and Portkey vs LiteLLM comparison coverage (2026-09-29), including api7.ai, a Medium piece by Adnan Masood, Hacker News item 48688213, and Maxim/Bifrost comparison posts
