---
name: Cycles
slug: cycles
url: https://runcycles.io
repo: https://github.com/runcycles/cycles-server
category: policy-identity
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, Docker Compose or pre-built GHCR images; no hosted/cloud offering or pricing page found
company: No registered company found. Solo founder Albert Mavashev (also runs scalerX.ai, GitHub handle K2NIO), New York area. No disclosed funding.
maturity: cycles-server 5 stars/2 forks/772 commits/30 releases, first commit 2026-02-27, last 2026-09-28; cycles-protocol 4 stars/2 forks/379 commits, first commit 2026-02-09, last 2026-09-27; near-weekly patch releases
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 4
  ux: 2
  reseedable_selfhost: 2
steal:
  - reserve.lua checks every affected scope in the tenant hierarchy and mutates all of them in one atomic Redis script, so two concurrent reservations can never jointly overdraw shared headroom without any explicit lock code
  - three named overage policies (REJECT, ALLOW_IF_AVAILABLE, ALLOW_WITH_OVERDRAFT) set per reservation or per tenant default, with an explicit debt ledger and an is_over_limit circuit breaker, instead of one hardwired "book it afterwards"
  - mandatory idempotency_key on every mutating call, with a documented per-operation TTL table and a distinct 409 IDEMPOTENCY_MISMATCH vs transparent replay of the original response
  - fail-closed on ledger-store outage: reserve fails rather than silently allowing when Redis is unreachable
  - dry_run flag on the reserve/decide path for shadow-testing a new budget policy against live traffic before it can deny anything
  - CyclesEvidence, an Ed25519-signed, content-addressed audit envelope per decision, fetchable from a stable public capability URL and verifiable offline via a JWKS endpoint, independent of live ledger access
  - calendar-bucketed rolling windows (per_minute_tumbling, per_hour_tumbling, per_day_tumbling) for action-count quotas, implemented as plain Redis keys with natural TTL expiry, no external cron needed
differs:
  - enforcement is cooperative, not inline. the agent's own SDK or MCP call chooses to invoke reserve/commit; nothing stops code that skips it from reaching the provider directly. Our network-level default-deny egress makes that bypass structurally impossible, which is the whole point of policy living outside the model
  - Cycles never prices a call. the caller supplies estimate.amount in whatever unit it likes. Our gateway is the one place that knows the model price list and clamps to actual free headroom, so a hold means something even if the agent is wrong or lying about cost
  - identity is a static, long-lived per-tenant API key issued once via the Admin API, not a short-lived, task-scoped, audience-bound credential. adopting this as-is would break identity belongs to the task, not the machine
  - the ledger's only backing store is a single Redis instance with no documented HA or clustering story. acceptable for a budget component, not for a system of record, which is why our ledger sits in CloudNativePG Postgres instead
ux_verdict: Zero-infrastructure onboarding (mock-mode MCP tool, one-command quickstart.sh) beats ours, but there is no verified working dashboard, no kanban-style view, and no human-approval lane, only inline allow/deny/cap and webhook events an operator must build their own UI around.
slop_verdict: Real, tested and thoughtfully specified (atomic Lua scripts, property-based concurrency tests, fail-closed design), but effectively a one-founder project padded with an AI commit author, 30 releases and a 20-repo org against 5 GitHub stars, 2 forks and zero independent reviews or discussion.
---

# Cycles

## 1. What it is

Cycles is an open protocol plus a self-hosted reference server (cycles-server) that lets an application reserve a budget before a costly agent action, then commit the real cost or release the hold afterwards. It is built and, as far as the public record shows, maintained by one person, Albert Mavashev, who also runs scalerX.ai and posts the project's origin story and tutorials on dev.to. The runcycles GitHub organisation holds twenty repositories: the server (Java or Spring Boot), the protocol specs (cycles-protocol), an admin API, an events or webhook worker, SDKs for Python, TypeScript and Rust, a Spring AI starter, an MCP server, and thin integration shims for LangChain, OpenAI Agents SDK and OpenClaw agents.

The makers claim a runtime authority for autonomous agents that is self-hosted, stores no prompts, and enforces hard limits on AI agent spend, risk, and tool actions before execution, concurrency-safe across thousands of tenants. The repository and code back most of this up: the reservation lifecycle is real, atomic and property-tested. What the code does not show is any inline enforcement. The server only ever answers a question an integrator chooses to ask it (see section 5). It is licensed Apache-2.0 throughout, has no pricing page, and shows no evidence of revenue, funding, or a company beyond the founder's own ventures.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Emits outbound webhooks on budget events (reservation.denied, budget.exhausted, etc.); does not ingest issues or alerts as work | Forgejo webhooks, SigNoz alerts, factoryd intake create tasks | Not comparable |
| Control plane | Redis-backed reservation/budget state, tenant and API-key admin, signed audit trail; no task scheduler, no approvals | factoryd + Temporal workflow per task, Postgres, Git-versioned policy, approvals | Not comparable (on the cost-ledger and audit slice specifically, they are comparably deep, see cost_control below) |
| Worker plane | None, never executes agent code or model calls | gVisor pod, ServiceAccount, default-deny egress per task | Not comparable |
| Verification | None, no CI/test/review gate on agent output | Forgejo Actions, policy gates, stronger-model review | Not comparable |
| Merge and deploy | None | Bot merge after approval/auto rule, Flux GitOps | Not comparable |
| Policy outside the model | Caps and action-kind quotas evaluated in server code, but only reached if the agent's SDK/MCP call chooses to invoke it; their own docs call this a cooperative enforcement boundary | Capability rules are a Git document enforced in gateway code and Kubernetes network policy; there is no other route to a model | We lead |
| Identity per task | One static, long-lived API key per tenant, shown once at creation, no rotation | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer | We lead |
| Artifacts not chat | Exchanges structured JSON (reserve/commit requests, signed evidence envelopes), not chat, but for budget accounting, not agent coordination | Git artifacts: TaskBrief in, branch/PR/event stream out | Not comparable |

## 3. Architecture and stack

cycles-server is Java 21 / Spring Boot 3.5, built as three Maven modules under cycles-protocol-service/: cycles-protocol-service-model (POJOs), cycles-protocol-service-data (Redis repository plus Lua scripts), cycles-protocol-service-api (controllers, ApiKeyAuthenticationFilter). The only datastore is Redis 7; there is no Postgres or other SQL option. All mutating operations run as atomic Lua scripts in cycles-protocol-service-data/src/main/resources/lua/: reserve.lua, commit.lua, release.lua, extend.lua, event.lua, expire.lua, plus helper scripts for int64 arithmetic and ledger math. I read reserve.lua in full: it does a single-pass check of every scope in the subject hierarchy (tenant, workspace, app, workflow, agent, toolset), fails the whole reservation if any budgeted scope lacks headroom, then mutates reserved and remaining on every budgeted scope inside the same script, so Redis's serial script execution rules out a torn read between two concurrent reservations sharing the same budget.

A second service, cycles-server-events (referenced but not in this clone), drains a Redis dispatch queue and delivers HMAC-SHA256-signed webhooks; it also holds the private Ed25519 key used to sign CyclesEvidence audit envelopes, while cycles-server holds only the public half. A third service, cycles-server-admin, exposes tenant, budget, API-key and webhook management. There is no workflow engine and no message queue beyond the in-Redis dispatch list; background reservation expiry runs on a scheduled tick coordinated across replicas with a Redis lease.

Deployment is Docker Compose only: docker-compose.yml (build from source), docker-compose.prod.yml (pull ghcr.io/runcycles/cycles-server), and docker-compose.full-stack(.prod).yml bundling Redis, the runtime, the admin server and the events worker. I found no Helm chart and no Kubernetes manifests anywhere in the clone, confirming the tip from the earlier research pass. The server never calls a model provider itself: an agent or its SDK calls POST /v1/reservations (or the MCP tool cycles_reserve) before making its own direct call to OpenAI, Anthropic or similar, then reports back via commit or release. SDKs exist for Python, TypeScript, Rust and Java/Spring AI; there is no LiteLLM plugin or proxy mode anywhere in the org.

## 4. UX

Fastest path to a first result is a single quickstart script from the repo root: one command starts Redis, the runtime and the admin server, creates a tenant, an API key and a budget, and exercises a full reserve or commit cycle end to end (not run, per the no-execute rule; behaviour described from the script name and README, cross-checked against the Quick Start section). A second path needs no server or infrastructure at all: install the MCP server package, set a mock-mode environment variable, and Claude Desktop, Claude Code, Cursor or Windsurf get budget tools (cycles_reserve, cycles_commit, cycles_release, cycles_decide, cycles_check_balance) with synthetic responses. This is the fastest zero-infrastructure onboarding seen in this comparison so far.

Watching an agent work is left to the operator: Prometheus metrics, a balances endpoint, and webhook events are the building blocks, but there is no verified, running dashboard. A cycles-dashboard TypeScript repo exists in the org, described as an AI agent governance dashboard covering budgets, action authority, tenants, webhooks, reservations and audit, but it has zero stars and its maturity is not verified. It was not cloned or read further given the time budget. Intervening is binary at the protocol level: a reservation call returns ALLOW, ALLOW_WITH_CAPS (with caps such as max_tokens) or DENY, and the agent is expected to self-regulate; an operator can freeze or unfreeze a budget scope via the Admin API. There is no approval workflow or human-in-the-loop lane comparable to our console's waiting-on-a-human state. A denial is final for that call, not an escalation. The README embeds two demo GIFs hosted on runcycles.io (not fetched, described from alt text and surrounding prose): one showing a runaway agent loop hard-stopped at a dollar figure, one showing an unauthorized tool call blocked before the side effect lands.

## 5. Security, identity, sandbox, policy, cost

Security. Enforced in code: an API-key authentication filter on every mutating endpoint, HMAC-SHA256-signed webhooks, AES-256-GCM encryption of webhook secrets at rest, Ed25519-signed evidence envelopes. Left to the operator: TLS (the server deliberately speaks plain HTTP and expects a reverse proxy in front), Redis password and network segmentation, and keeping the admin port off the public network. The README states plainly that compromise there is total. Left to the integrator entirely: actually calling reserve or commit at all.

Identity. A single long-lived, opaque API key per tenant, created through the Admin API and shown once. No workload identity, no OIDC, no per-task or per-session token, no automatic rotation. The bootstrap admin API key is one shared secret controlling tenants, budgets and keys for the whole deployment.

Sandbox. None. Cycles never executes agent code or a model call; it is an accounting service adjacent to the data plane, not part of it.

Policy. Caps (max tokens, tool denylist, max steps, cooldowns) and action-kind quotas are defined through the governance or admin API and evaluated inside the atomic Lua scripts, genuinely in code, not a prompt. But the MCP server's own documentation names an explicit Security Model and Enforcement Boundary section and states that using the standalone tools remains cooperative, since the calling bot could call the other connector directly. Their one example of true hard enforcement, a paid-media gateway example, puts Cycles inline as an actual proxy, which is not how the product is normally deployed.

Cost. This is the project's real depth. The estimate amount is supplied by the caller in tokens, USD micro-cents, credits or risk points; Cycles holds no model price list and does not price a call itself, unlike our gateway, which prices the worst case before it clamps output length. Once reserved, the lifecycle is active to committed or released, with three overage policies (reject, allow-if-available, allow-with-overdraft) chosen per reservation or defaulted per tenant, a debt ledger with an overdraft limit and an is-over-limit breaker, and a documented invariant that remaining equals allocated minus spent minus reserved minus debt, checked under concurrency by named property tests for budget exhaustion, overdraft, scope attribution and audit log completeness. Budgets are hierarchical (tenant, workspace, app, workflow, agent, toolset) and enforced at every derived scope that has one. There is no automatic time-based reset for a dollar budget; an operator must trigger a reset-spent funding operation manually, for example on a cron. The only genuinely automatic time window in the protocol is calendar-bucketed action-count quotas, per minute, hour or day, on a tumbling basis.

## 6. What we should take from it

Narrow, copyable this month. The single-atomic-script discipline in reserve.lua, check every affected scope then mutate every affected scope inside one atomic unit, failing entirely if any scope fails, is directly portable to factory-gateway's own hold-taking even though we use a Postgres row lock rather than Redis. It is a cleaner mental model than lock, check, mutate, unlock. The three named overage policies plus an explicit debt and over-limit breaker are a better vocabulary than booking the real cost afterwards, and worth adopting for our per-task, per-day and per-project envelopes. The mandatory idempotency key with a documented per-operation TTL table, and a distinct mismatch error versus transparent replay, is a tighter retry contract than we currently specify. Fail-closed on ledger-store outage is worth stating as an explicit requirement, not an assumption, for our own gateway. A dry-run flag on the decision path is a cheap way to shadow-test a new budget policy before it can deny anything.

Broad, shapes priorities. Treating the audit record of a decision as a signed, independently fetchable artefact, the CyclesEvidence envelope, Ed25519-signed, served from a stable capability URL, verifiable offline via a JWKS endpoint without touching the live ledger, is a stronger story than a cost row in a console, and worth studying given our own enterprise-grade portfolio ambitions. Their habit of writing down, in the docs, exactly which controls are server-enforced versus cooperative is a discipline we should hold ourselves to explicitly in our own architecture notes, rather than leaving what a prompt cannot bypass implicit.

## 7. Where our philosophy differs and what that costs or buys us

The core difference is inline versus cooperative enforcement. Cycles' normal integration, an SDK call or an MCP tool, is something the agent's own code chooses to invoke; nothing at the network layer stops a bypass, a fact their own documentation states outright. Our default-deny egress and gateway-only path to model providers make that bypass structurally impossible. Copying Cycles' integration model as our primary path would reopen exactly the hole our policy-outside-the-model principle exists to close. Where Cycles buys something real is breadth: because it asks nothing of the network topology, it works unmodified with any agent framework, in any deployment, including ones that do not control egress the way we do.

Cycles also never prices a call: the caller supplies the estimate in whatever unit it likes, so a hold is only as honest as the caller's own estimate. Our gateway owns the model price list and clamps to actual free headroom, which costs us the work of maintaining that price list but buys a hold that means something even against a buggy or malicious estimate. Their identity model, one static per-tenant key shown once, is far simpler to adopt than our projected, audience-scoped, rotated ServiceAccount token, at the direct cost of a much larger blast radius on leak, which is the exact trade our identity-belongs-to-the-task principle refuses to make. Finally, Redis alone, one instance, no documented HA or clustering, is a reasonable choice for a component but not for a system of record for money; our ledger sits in CloudNativePG for that reason, and adopting Cycles' storage model unmodified would reintroduce a single point of failure we have already engineered away.

## 8. Red flags and slop assessment

The project is real engineering: atomic Lua scripts, property-based concurrency tests, a documented 95 percent coverage target, fail-closed defaults, a thought-through overdraft and debt model. But the surrounding signals of scale do not hold up. MAINTAINERS.md lists contributing organizations Runcycles, K2NIO and Singleton Labs; K2NIO is the founder's own GitHub handle and no independent trace of Singleton Labs turned up in search. The git history includes a literal AI author, named claude, with 211 commits on cycles-server and 29 on cycles-protocol, confirmed against the contributors list via the GitHub API and against the repo's own CLAUDE.md, which documents Claude Code build conventions for the project. Traction is thin and almost entirely first-party: 5 stars and 2 forks on cycles-server, one fork being the founder's own account, 4 stars and 2 forks on cycles-protocol, no open user-filed issues, and no Hacker News, Reddit or independent review found by search. The only outside writing found is the founder's own dev.to posts. The homepage's claim of over 23,000 package installs is unsourced and not verifiable; package-manager download counts are routinely inflated by CI mirrors and are not evidence of real usage. There is no pricing page or enterprise tier, so there is no open-core gating to flag, but also no evidence yet that the project outlives one person's attention. The sheer size of the documentation, a 250KB AUDIT.md, a 67KB CHANGELOG.md, a 324KB governance spec, reads as agent-generated volume rather than organically accumulated history, and the 30 releases on cycles-server should be read in that light rather than as thirty independent maturity milestones. No CVEs or security incidents were found in search, but no third-party security audit was found either; the README's OpenSSF Scorecard and SafeSkill badges were not independently checked.

## 9. Sources

- /home/womb/repos/market-research-clones/cycles/README.md
- /home/womb/repos/market-research-clones/cycles/CLAUDE.md
- /home/womb/repos/market-research-clones/cycles/MAINTAINERS.md
- /home/womb/repos/market-research-clones/cycles/LICENSE
- /home/womb/repos/market-research-clones/cycles/OPERATIONS.md (grepped)
- /home/womb/repos/market-research-clones/cycles/docker-compose.full-stack.prod.yml
- /home/womb/repos/market-research-clones/cycles/cycles-protocol-service/README.md
- /home/womb/repos/market-research-clones/cycles/cycles-protocol-service/cycles-protocol-service-data/src/main/resources/lua/reserve.lua
- /home/womb/repos/market-research-clones/cycles/ (top-level and depth-2 layout via find)
- /home/womb/repos/market-research-clones/cycles-protocol/ (top-level layout)
- /home/womb/repos/market-research-clones/cycles-protocol/cycles-action-kinds-v0.1.26.yaml (grepped, header read)
- /home/womb/repos/market-research-clones/cycles-protocol/cycles-governance-admin-v0.1.25.yaml (grepped, Budget and BudgetFundingRequest schema read)
- /home/womb/repos/market-research-clones/cycles-protocol/cycles-protocol-v0.yaml (grepped)
- https://runcycles.io (WebFetch, 2026-09-29)
- https://github.com/runcycles/cycles-mcp-server README, fetched via GitHub API (2026-09-29)
- GitHub API: repos/runcycles/cycles-server (stars, forks, license, topics, homepage; 2026-09-29)
- GitHub API: repos/runcycles/cycles-protocol (2026-09-29)
- GitHub API: orgs/runcycles/repos (org repo list; 2026-09-29)
- GitHub API: repos/runcycles/cycles-server/contributors and cycles-protocol/contributors (2026-09-29)
- GitHub API: repos/runcycles/cycles-server/releases, /forks, /issues, /pulls (2026-09-29)
- WebSearch: runcycles.io Cycles AI agent budget protocol review, Hacker News, Reddit (2026-09-29)
- WebSearch: Albert Mavashev runcycles OR cycles-server OR K2NIO (2026-09-29), surfacing github.com/amavashev and four dev.to posts by amavashev on agent-loop cost incidents and budget control patterns
