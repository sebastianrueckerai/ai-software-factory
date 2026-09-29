---
name: LiteLLM
slug: litellm
url: https://litellm.ai
repo: https://github.com/BerriAI/litellm
category: model-gateway
license: mixed, MIT for litellm/, proprietary BerriAI Enterprise licence for enterprise/
open_source: partial
self_hostable: yes
hosting_model: self-hosted (Docker image, Helm chart, pip package) or a BerriAI-hosted proxy, Enterprise adds a licence key on top of the same self-hosted image
company: BerriAI Inc, Y Combinator W23, San Francisco, founded 2023
maturity: 59.9k stars, 11.9k forks, about 374 contributors, first commit 2023-07-27, last commit 2026-09-29 (today), several releases a week
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 3
  identity_per_task: 2
  cost_control: 3
  ux: 2
  reseedable_selfhost: 3
steal:
  - litellm/integrations/prometheus.py and opentelemetry.py are free OSS callbacks. They could push per-call LLM traces straight into SigNoz instead of us only parsing x-litellm-response-cost and x-litellm-model-name off response headers.
  - The custom_pricing config lets an operator declare a price for a model LiteLLM cannot price itself. Our PriceBook.Price currently just refuses (LiteLLM has no model) for anything unpriced. A custom entry would turn that refusal into a usable price the day we add a self-hosted or uncommon model.
  - The built-in /health endpoint pings every configured deployment credential. Cheap to wire into our own alerting to catch a rotated or expired provider key before a task fails mid-session.
  - security.md three-tier bug bounty triage (P0 supply chain, P1 unauthenticated access, P2 authenticated privilege escalation) plus a mandatory exploit video is a lightweight template for our own disclosure process once outside reports are worth inviting.
  - Cosign-signed images verified against a pinned commit cosign.pub is a supply-chain check we do not do for our own factoryd, factory-gateway and agent-worker images yet.
differs:
  - LiteLLM philosophy is maximal, one project now also covers a2a, OCR, RAG, realtime audio, assistants, batches, fine-tuning, vector stores, images and video, none of which we call. Running it means that whole surface sits inside our trust boundary for the slice we use, which is what 2026 CVE run actually hit.
  - LiteLLM owns its own Postgres schema and migration job for keys, budgets and spend, a second source of truth our gateway must poll and settle against rather than a single ledger we own outright.
  - Real per-task identity (mapping a caller own JWT to a key) is an Enterprise-only feature, so a design that wanted identity belongs to the task through LiteLLM own auth alone could not get it on the free tier. We solved this by never handing LiteLLM the task real identity at all.
ux_verdict: There is no agent-facing UX here, only an admin dashboard we do not deploy, our own console reads LiteLLM spend through its API instead.
slop_verdict: Not slop. 374 contributors, several releases a week, named production adopters and a maintained, funded bug bounty are the opposite of a README with a landing page, but the 2026 security record shows real attackers now treat it as a serious target too.
---

# LiteLLM

## 1. What it is
BerriAI markets LiteLLM as "the fastest, litest AI Gateway": one OpenAI-compatible endpoint in front of over 100 model providers, usable as a Python SDK inside an application or as a standalone proxy server for a team. It is the piece we already run. Our platform namespace deploys the litellm-helm chart pinned to >=1.102.1 <1.103.0, and factory-gateway mints one virtual key per task against it. BerriAI is a Y Combinator W23 company. The repository has run since July 2023 and ships several releases a week. The README claims production use at Stripe, Netflix, Google ADK, Greptile and OpenHands. The repository itself backs that claim up: 374 contributors, 5,425 open issues, and, as section 7 shows, a year of real attackers building exploit chains against it, which happens to projects people actually run.

## 2. Mapping to our five planes

| Plane or principle | What LiteLLM does | What we do | Verdict |
|---|---|---|---|
| Signals | Nothing, it only receives calls | Forgejo webhooks, SigNoz alerts, intake API | not comparable |
| Control plane | Routes an alias to a weighted deployment, tracks spend and budget per key in its own Postgres tables | Temporal workflow per task, capability policy, approvals, cost ledger | not comparable, far narrower scope |
| Worker plane | None, it is a callee, not a runtime | gVisor pod per task | not comparable |
| Verification | None | CI gates, model review | not comparable |
| Merge and deploy | None | Forgejo PR, Flux | not comparable |
| Policy outside the model | A virtual key allowed models and budget are set by an admin API call, never by a prompt | Capability YAML in Git, enforced in gateway code and network policy | equal in spirit, narrower scope, models and euros only |
| Identity per task | A virtual key is a static bearer secret carrying metadata | A projected, audience-scoped, kubelet-rotated ServiceAccount token, verified by our own gateway before it ever mints a LiteLLM key | we lead |
| Artifacts not chat | Request and response bodies only | TaskBrief, branch, PR, event stream | not comparable |

## 3. Architecture and stack
Python (FastAPI, Prisma against Postgres) runs the proxy. Recent releases have started moving hot paths into a Rust core (litellm-rust/), still additive, the Python path is the one we run. The admin dashboard is React (ui/litellm-dashboard). Deployment is the Helm chart we use (helm/litellm-helm), a Docker image (a hardened variant exists too) or the pip package. State lives in Postgres, migrated by the chart's own migrationJob, a second migration lifecycle outside factoryd's own schema. It runs no agents and holds no sandbox. It is a reverse proxy with a router (litellm/router_strategy/) and a metering and auth layer (litellm/proxy/). Our own helmrelease.yaml (ai-software-factory-infra/k8s/platform/litellm) shows what we actually configure: routing_strategy simple-shuffle with enable_weighted_failover true, allowed_fails 1 and cooldown_time 60, so a failing deployment cools down for a minute while every other deployment of its tier keeps getting picked, a deliberate choice recorded in a comment there because latency or usage based routing would starve all but the fastest provider and the model-tier report needs every provider measured. fail_closed_budget_enforcement true is a second, backstop budget check behind our own gateway's holds.

## 4. UX
There is no agent-facing UX. The Admin UI lists keys, teams, spend and model health behind SSO or the master key. We do not deploy it. factory-gateway drives LiteLLM entirely through its HTTP API (/key/generate, /key/list, /key/block, /model/info, /chat/completions), and our own console shows the resulting spend, not LiteLLM's. Adding a model alias is a model_list entry in the Helm values and a Flux reconcile, no UI step at all. Scored 2: the dashboard is more polished than anything we built for key or model administration, but it solves an administrator's problem, not an agent task's, so it does not touch our console's actual weak spots.

## 5. Security, identity, sandbox, policy, cost
Identity lives in a bearer secret. LiteLLM can map a caller's own JWT to a key, but litellm/proxy/auth/user_api_key_auth.py line 1639 refuses with "JWT Auth is an enterprise only feature" unless premium_user is true, confirming what target-architecture.md already assumed. We avoid the gate rather than pay for it. Our gateway verifies the Kubernetes ServiceAccount token itself and mints the LiteLLM key from the master key, so LiteLLM never sees the task's real identity, only a key it issued itself. Cost tracking is real and free: spend per key, and a refusal when a key is already over budget once fail_closed_budget_enforcement is set, which we do. But that check runs before the call, not during it, so one call can still run past the cap. That gap is why internal/policy/prices.go rebuilds a worst-case per-token price from /model/info, treating any rate a hold cannot bound (tiered pricing, service tiers, cache writes) as unpriced and refusing the call, and why internal/gateway/server.go takes a database-locked hold before ever calling LiteLLM. Policy is config and API calls, not prompts, matching our own principle within its scope. There is no sandbox, it is not a runtime.

## 6. What we should take from it
Listed in steal above. All five are narrow, code-level items we could add this quarter without changing anything about how we use LiteLLM today. There is no broader product shape to take. LiteLLM solves one problem, routing and metering calls to model providers, and we already use it for exactly that.

## 7. Where our philosophy differs and what that costs or buys us
LiteLLM's philosophy is maximal. One project now also covers a2a, OCR, RAG, realtime audio, assistants, batches, fine-tuning, vector stores, images and video generation, alongside the router and metering we actually call. Running it means that whole surface sits inside our trust boundary for the small slice we use. 2026 showed what that costs: a poisoned PyPI release from a compromised CI credential, a pre-auth SQL injection in the auth path (CVE-2026-42208), an authorization bypass on the config update endpoint that lets an authenticated caller register arbitrary Python code and reach remote code execution (CVE-2026-35029), an MCP command-execution bug, a guardrails code-execution bug, and, most recently, exploit chains built specifically to extract the master key, the one secret our whole design treats as never leaving the gateway. We are not the exposed case Wiz measured, roughly one in ten public instances running the default master key on the open internet. LiteLLM sits on a ClusterIP inside platform, reachable only from factoryd and factory-gateway. The pattern still costs us patch discipline. Our Flux OCIRepository pins >=1.102.1 <1.103.0 on purpose, and every minor bump needs a look at that release's advisories first.

Would a replacement simplify factory-gateway? Only if it turned LiteLLM's pre-call budget check into a real mid-call hard cap, removing our own hold-and-settle logic. It would not. Pre-call cost is unknowable for any token-metered LLM API until the response finishes. Portkey, Bifrost and TensorZero face the identical gap, so the hold logic is a cost of metered billing, not of LiteLLM specifically. What a smaller, narrower gateway could buy us, Bifrost's plain Go binary is the obvious candidate, is a materially smaller attack surface behind the same master-key trust model, at the cost of rebuilding the routing maturity (weighted failover, per-tier cooldown, model pricing lookups) we already depend on.

## 8. Red flags and slop assessment
Not slop, see slop_verdict. The flags are real rather than existential. The CVE list above is long for one calendar year, three of the eight published advisories are rated Critical. The licence is genuinely mixed, MIT for the core, a proprietary enterprise/LICENSE.md that forbids redistributing its own patches without a paid seat. BerriAI's disclosure policy explicitly excludes "not setting a master_key" from bug bounty scope as a user misconfiguration, even though that was the exact condition Wiz found in roughly one in ten public instances. Enterprise gating has grown, not shrunk: v1.98.0 made an unlicensed worker_registry refuse to boot at all, and v1.102.0 put the organisation endpoints behind a licence check, both within the last two months. None of this changes whether we should keep running it, our exposure model already assumes none of its admin surface is internet-facing, but it argues for staying current on patches rather than pinning and forgetting.

## 9. Sources

- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/01-report-template.md
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/README.md
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md
- /home/womb/repos/ai-software-factory-code/internal/factoryd/litellm.go
- /home/womb/repos/ai-software-factory-code/internal/gateway/litellm.go
- /home/womb/repos/ai-software-factory-code/internal/gateway/connectors.go
- /home/womb/repos/ai-software-factory-code/internal/gateway/server.go
- /home/womb/repos/ai-software-factory-code/internal/policy/prices.go
- /home/womb/repos/ai-software-factory-code/cmd/factory-gateway/main.go
- /home/womb/repos/ai-software-factory-code/internal/gateway/config.go
- /home/womb/repos/ai-software-factory-infra/k8s/platform/litellm/helmrelease.yaml
- ~/repos/market-research-clones/litellm: README.md, LICENSE, enterprise/LICENSE.md, security.md, pyproject.toml, docker-compose.yml, top-level layout, litellm/proxy/auth/user_api_key_auth.py, litellm/router_strategy/budget_limiter.py, litellm/secret_managers/hashicorp_secret_manager.py, litellm/proxy/_experimental/mcp_server/bridge_token_flow.py, litellm/proxy/utils.py
- https://github.com/BerriAI/litellm (gh api repos/BerriAI/litellm, contributors, releases), read 2026-09-29
- https://docs.litellm.ai/docs/enterprise, read 2026-09-29
- https://docs.litellm.ai/docs/proxy/token_auth, read 2026-09-29
- https://docs.litellm.ai/docs/proxy/admin_ui_sso, read 2026-09-29
- https://www.litellm.ai/enterprise, read 2026-09-29
- https://docs.litellm.ai/blog/security-hardening-april-2026, read 2026-09-29
- https://docs.litellm.ai/blog/security-update-march-2026, read 2026-09-29
- https://snyk.io/blog/poisoned-security-scanner-backdooring-litellm/, read 2026-09-29
- https://cycode.com/blog/lite-llm-supply-chain-attack/, read 2026-09-29
- https://www.herodevs.com/blog-posts/the-litellm-supply-chain-attack-what-happened-why-it-matters-and-what-to-do-next, read 2026-09-29
- https://www.trendmicro.com/en_us/research/26/c/inside-litellm-supply-chain-compromise.html, read 2026-09-29
- https://starlabs.sg/blog/2026/05-race-against-the-patch-the-evolution-of-four-exploit-chains-in-litellm/, read 2026-09-29
- https://thehackernews.com/2026/06/litellm-vulnerability-chain-lets-low.html, read 2026-09-29
- https://www.wiz.io/blog/off-guard-breaking-litellm-from-authentication-bypass-to-cloud-compromise, read 2026-09-29
- https://gbhackers.com/hackers-exploit-litellm-admin-api-flaw/, read 2026-09-29
- https://www.sysdig.com/blog/cve-2026-42208-targeted-sql-injection-against-litellms-authentication-path-discovered-36-hours-following-vulnerability-disclosure, read 2026-09-29
- https://github.com/BerriAI/litellm/issues/2114, read 2026-09-29
