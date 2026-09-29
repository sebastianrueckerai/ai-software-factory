---
name: Langfuse
slug: langfuse
url: https://langfuse.com
repo: https://github.com/langfuse/langfuse
category: observability-evals
license: "mixed: MIT for the core app, commercial Enterprise licence for ee/, web/src/ee/ and worker/src/ee/"
open_source: partial
self_hostable: yes
hosting_model: "self-hosted (Docker Compose for local/test, Helm charts and AWS/Azure/GCP guides for production) or Langfuse Cloud, a multi-region managed SaaS"
company: "Langfuse GmbH, Berlin. Y Combinator W23, 4.5M USD seed (Lightspeed, La Famiglia, YC) closed Nov 2023. Acquired by ClickHouse Inc in Jan 2026 alongside ClickHouse's 400M USD Series D; founders and team say the roadmap and self-host model are unchanged"
maturity: "35.2k GitHub stars, 3,874 forks, 961 open issues; first commit 2023-05-18, last push 2026-09-29 (today); on v4.47.0, near-daily releases, every PR gets a preview deploy per CONTRIBUTING.md"
similarity: 1
axes:
  signals_intake: 1
  control_plane: 1
  sandbox_isolation: 2
  verification: 2
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 2
  ux: 3
  reseedable_selfhost: 2
steal:
  - "The in-app agent's 'one log, three derivations' rule (web/src/features/in-app-agent/ARCHITECTURE.md): one durable event table (in_app_agent_events, ordered by sequence_number) is the only source of truth; canonical, display and replay views are all folded from it at read time, never stored separately. Directly applicable to our own task event stream and the diff/replay view our console lacks."
  - "SSE tail-watching over a persisted cursor (app/api/in-app-agent/watch): the browser hydrates one snapshot, then tails new events above its cursor; closing the drawer detaches without cancelling the run, reopening re-hydrates and resumes the tail. This is exactly the 'real-time stream of the agent's work' our own weak-spots list says the console is missing."
  - "Durable approval interrupts as first-class events in the same log (packages/shared/src/in-app-agent/interrupts.ts) rather than a side table for human-in-the-loop state. A clean shape for our own approval workflow state next to a task's event stream."
  - "LLM-as-judge and code-evaluator pipelines with datasets and dataset-run-items (web/src/features/evals, features/datasets) are a ready-made pattern for scoring model output against criteria at scale. Reusable almost as-is for the harness-prompt regression suite and per-model-tier success benchmark we say we do not have."
  - "The Rust ai-gateway's pass-through design (ai-gateway/README.md): native /openai/v1 and /anthropic/v1 namespaces relay provider bytes unmodified while still capturing full generation traces via OTLP. A lighter alternative to LiteLLM's normalise-everything approach worth weighing whenever exact provider wire semantics matter more than a unified schema."
  - "Automations turn a metric or score threshold into a Slack message, generic webhook or GitHub repository_dispatch call out of the box (web/src/features/automations/githubDispatchUrl.ts). A small, concrete pattern for wiring a telemetry alert to an external action without hand-rolling the dispatch code."
differs:
  - "Open-core licensing with a commercial carve-out: ee/, web/src/ee/ and worker/src/ee/ are gated by a separate Enterprise licence, and the free self-hosted 'oss' plan is missing project-level RBAC roles, audit logs, admin API and UI customisation until a 'self-hosted:enterprise' licence key is applied (web/src/features/entitlements/constants/entitlements.ts). Our best-of-breed-open-source principle rules out ever putting core factory capability behind a licence key ourselves."
  - "Storage sprawl by design: Postgres, ClickHouse, Redis/Valkey and S3-compatible storage for one plane, with traces written to S3 first and only a reference queued in Redis before ClickHouse ingestion. That buys load-spike durability but is four stateful systems for a slice of what we run on three servers; we would pick one store, not copy the stack, unless trace volume forced our hand."
  - "Long-lived, project-scoped API key pairs and org/project RBAC roles, not short-lived task-scoped credentials. Fine for a human dashboard, but the opposite of identity-belongs-to-the-task; nothing in Langfuse's own auth model is portable to how our agents authenticate."
ux_verdict: "A mature, well-documented dashboard for humans watching traces and evaluations, plus one genuinely strong pattern, an SSE-tailed and approval-aware live agent run, that our own console has nowhere at all."
slop_verdict: "Real and used in anger: 2,000+ paying customers and 26M+ monthly SDK installs per ClickHouse's own acquisition announcement, daily commits, and CVEs (RBAC leak, SSRF, SSO bypass) patched within weeks of disclosure rather than ignored."
---

# Langfuse

## 1. What it is

Langfuse is an open source LLM engineering platform: tracing, prompt management, evaluation and datasets for teams building LLM applications. It is made by Langfuse GmbH (Berlin, YC W23), acquired by ClickHouse in January 2026, and sold as a free self-hosted product, a paid self-hosted Enterprise tier, and a managed multi-region Cloud SaaS with five pricing tiers from free Hobby to 2,499 USD/month Enterprise.

The README's headline claims, "open source," "self-hosted in minutes," "battle-tested," hold up in the repository: the app is a real pnpm/turborepo monorepo with a Next.js web app, a Node worker, a Rust gateway, tests, and a four-year commit history. What the README does not say up front is that "open source" is open core: `ee/`, `web/src/ee/` and `worker/src/ee/` carry a separate commercial licence, and a growing list of entitlements (RBAC roles, audit logs, admin API) require a paid licence key even to self-host.

## 2. Mapping to our five planes

| Plane / principle | What Langfuse does | What we do | Verdict |
|---|---|---|---|
| Signals | "Monitors" fire on a metric or score threshold and dispatch to Slack, a generic webhook, or GitHub `repository_dispatch` via "automations" (web/src/features/monitors, automations) | Forgejo webhooks, SigNoz alert webhooks and a factoryd intake API, every task a Forgejo issue | not comparable |
| Control plane | No general task registry; a durable event log and run lifecycle exist only for the in-app agent feature (approvals, continuations, one active run per conversation) | factoryd with a Temporal workflow per task, Postgres, budgets, approvals, audit trail | we lead |
| Worker plane | The in-app agent runs in a Docker container locally or an AWS Lambda MicroVM in the cloud, as an unprivileged `sandbox-server` user (packages/in-app-agent-sandbox-runtime); scoped to one assistant feature, not general coding tasks | One gVisor pod per task, non-root, read-only root filesystem, default-deny egress | not comparable |
| Verification | LLM-as-judge and code evaluators score traces and dataset runs against criteria (features/evals); not wired to any merge or deploy gate | Cheap deterministic checks, policy gates by risk class, reproduction gate, then stronger-model review with a strict verdict | not comparable |
| Merge and deploy | None; Langfuse stops at observing and scoring whatever your own application produced | Bot merge after approval or an auto rule, GitOps deploy, staged rollout, telemetry back into signals | not comparable |
| Policy outside the model | Org/project RBAC roles enforced server-side in tRPC routers (features/rbac/utils/checkProjectAccess.ts), plus plan entitlements gating features | Capability rules as a Git-versioned document enforced in gateway code and network policy | not comparable (different domain: human dashboard permissions, not agent capability) |
| Identity per task | Long-lived, project-scoped public/secret API key pairs; no short-lived or audience-scoped tokens found | A projected, audience-scoped, per-task ServiceAccount token verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | The in-app agent's AG-UI event log is a real durable artifact of a conversation, but the unit of work is a chat turn, not a task handoff | TaskBrief in, branch, PR and normalised event stream out | we lead |

## 3. Architecture and stack

TypeScript monorepo (pnpm 12, turborepo, Node 24): `web/` is a Next.js app (UI, tRPC API, public REST/OTel ingestion endpoints under `web/src/pages/api/public/`), `worker/` is a Node service that drains BullMQ queues (Redis-backed) to load ingested events into ClickHouse and run evaluators, and `ai-gateway/` is a standalone Rust service. Storage: PostgreSQL for transactional data (org/project/RBAC/API keys), ClickHouse for traces, observations and scores (OLAP), Redis/Valkey for caching and the BullMQ job queue, and S3-compatible storage (MinIO in the Compose file) for raw ingested events and media. Ingestion writes to S3 first and queues only a reference in Redis, so a ClickHouse or worker outage does not lose data.

Deployment is `docker-compose.yml` for local/test only (the file's own comment says "without high availability, scaling, or backups"), with Helm charts and per-cloud guides (AWS, Azure, GCP) for production, all maintained by Langfuse. No Kubernetes manifests ship in this repository itself. Model access has two paths: `web/src/features/llm-api-key` stores per-project provider keys used by evaluators and the playground, and the separate Rust `ai-gateway` (native `/openai/v1`, `/anthropic/v1` namespaces) proxies calls without rewriting provider bytes while auto-capturing traces via OTLP. The newer `in-app-agent` feature (web/src/features/in-app-agent, worker/src/features/in-app-agent) runs Langfuse's own project-scoped AI assistant on the Mastra framework with MCP tools, durable runs, and human-in-the-loop approvals, executed in the sandbox package described above.

## 4. UX

Onboarding is SDK-first: instrument an app with a Python or JS SDK (or point an OpenTelemetry exporter at the OTel ingestion endpoint), and traces appear in the web UI, nested by span with inputs, outputs, cost and latency. From zero, a Cloud sign-up plus one SDK call is two steps to a first trace; self-host adds `docker compose up` and an env file. Interfaces are entirely web UI plus API/SDK; there is no CLI or desktop app.

The one place Langfuse lets a user watch and steer something actively running is the in-app agent drawer: it streams the agent's reasoning and tool calls over SSE as they happen, and a human approves or rejects tool calls flagged as needing consent, with the run continuing durably in the worker even if the drawer is closed. This is a materially better pattern than our own console, which the baseline itself flags as having "no real-time streams of the agent's work, no diff view." Everything else in the product, tracing tables, the prompt playground, dataset runs, is a conventional dashboard, competent but not a template for watching a coding agent do multi-step work.

## 5. Security, identity, sandbox, policy, cost

Identity and secrets: project-scoped API key pairs (public/secret) authenticate SDK and API traffic; LLM provider keys are stored per project and used server-side by the worker and gateway, never handed to a client. No short-lived or per-task credential model exists; this is a per-project, human-managed secret store, not identity-per-unit-of-work.

Sandbox: only the in-app agent feature is sandboxed, in a Docker container (local) or AWS Lambda MicroVM (cloud), running as an unprivileged user with its workspace reset between tool calls. Nothing else in the product executes untrusted code.

Policy: RBAC (owner/admin/member/viewer) is enforced in server-side route handlers, not left to the client or a prompt; a separate entitlements table gates paid features by plan, checked in code (`hasEntitlement.ts`) rather than by hiding UI alone.

Cost: token usage and spend are tracked per trace, project and model, with dashboards and threshold-based alerts ("monitors", the paid `cloud-spend-alerts` entitlement). Nothing found enforces a hard cap that blocks further LLM calls; cost control here is observation and alerting, not a gateway-level hold.

## 6. What we should take from it, next to SigNoz

Narrow, this month: the event-log-with-read-time-derivations pattern and the SSE-tail watch endpoint are almost directly transferable to our console's task view, which today has no live stream at all; SigNoz gives us traces but nothing renders them per task, and Langfuse's `watch` route is a working reference for exactly that gap. The durable approval-interrupt event shape is a similarly small, concrete thing to copy for our own human-in-the-loop state.

Broad: next to SigNoz, Langfuse is not a tracing backend to replace, it is the LLM-specific layer SigNoz does not have, cost and token accounting per call, prompt versioning, and a real LLM-as-judge evaluation pipeline with datasets. We do not need Langfuse's product, but its evaluator/dataset design is a better-thought-out version of the harness regression suite and per-model-tier benchmark we list as missing, and is worth copying in shape even on our own storage.

## 7. Where our philosophy differs and what that costs or buys us

Langfuse's open-core split (free self-hosted "oss" plan versus a paid "self-hosted:enterprise" key for RBAC roles, audit logs and the admin API) is the clearest place copying them would break our own best-of-breed-open-source constraint, which requires every tool we depend on to have an escape hatch, not to hold core capability hostage to a licence key. We would not adopt this model even for our own eventual open-sourcing.

Their storage stack (Postgres, ClickHouse, Redis, S3, four systems for one plane) buys real load-spike durability and fast analytical queries over huge trace volumes, a scale problem we do not have yet on three Hetzner boxes. If our own task-event and cost-ledger volume ever outgrows Postgres, ClickHouse is the concrete thing to reach for; until then, running it purely to mirror Langfuse would violate our commodity-hardware constraint for no present benefit.

## 8. Red flags and slop assessment

Open-core gating is real and getting broader, not narrower: `entitlements.ts` shows `rbac-project-roles`, `audit-logs`, `self-host-ui-customization` and `admin-api` all withheld from the free "oss" self-hosted plan and only unlocked by a paid `self-hosted:enterprise` licence key, a textbook enterprise-tier gate on features that used to be table stakes in early Langfuse versions.

The ClickHouse acquisition (Jan 2026) is a vendor-concentration point to watch: Langfuse now sits inside a company whose own product is the analytical database Langfuse depends on, though both parties say the roadmap and self-host model are unchanged and Langfuse Cloud continues to run.

Security response looks healthy rather than alarming: recent CVEs (an RBAC flaw exposing a provider API key, a Slack OAuth authorisation bypass, an SSO account-takeover path, an SSRF in a webhook handler) were each fixed within one to a few point releases, and the project runs a public Bugcrowd program. No unpatched incident or breach was found.

## 9. Sources

- https://github.com/langfuse/langfuse (cloned shallow to ~/repos/market-research-clones/langfuse)
- README.md, CONTRIBUTING.md, LICENSE, ee/LICENSE, package.json, docker-compose.yml
- web/src/features/entitlements/constants/entitlements.ts
- web/src/features/rbac/utils/checkProjectAccess.ts and sibling files
- web/src/features/in-app-agent/README.md and ARCHITECTURE.md
- packages/in-app-agent-sandbox-runtime/package.json and README
- ai-gateway/README.md, ai-gateway/package.json
- web/src/features/automations, web/src/features/monitors
- web/src/pages/api/public/otel/v1/traces/index.ts, .../metrics/index.ts, ingestion.ts
- worker/package.json (bullmq dependency)
- gh api repos/langfuse/langfuse (2026-09-29)
- https://langfuse.com/docs/deployment/self-host (fetched 2026-09-29)
- https://langfuse.com/pricing (fetched 2026-09-29)
- https://langfuse.com/docs/tracing (fetched 2026-09-29)
- https://langfuse.com/security (fetched 2026-09-29)
- https://clickhouse.com/blog/clickhouse-acquires-langfuse-open-source-llm-observability (2026-01-16)
- https://clickhouse.com/blog/clickhouse-raises-400-million-series-d-acquires-langfuse-launches-postgres
- https://langfuse.com/blog/joining-clickhouse
- https://news.ycombinator.com/item?id=46656552
- https://langfuse.com/blog/announcing-our-seed-round
- https://www.sentinelone.com/vulnerability-database/cve-2026-24055/ (CVE-2026-24055)
- https://osv.dev/vulnerability/CVE-2026-41487 (CVE-2026-41487)
