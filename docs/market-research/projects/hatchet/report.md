---
name: Hatchet
slug: hatchet
url: https://hatchet.run
repo: https://github.com/hatchet-dev/hatchet
category: durable-execution
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted (Hatchet Lite single Docker image, Docker Compose, or a separate Helm chart repo) on your own Postgres, or Hatchet Cloud SaaS; workers always run on the user's own infrastructure in both models
company: Hatchet Technologies Inc, New York City, YC-backed, founded 2023, about 7 employees per the founders' own 2026 retrospective blog post
maturity: 8,023 stars, 513 forks, 149 open issues, 89+ contributors via the GitHub API, created Dec 2023, last commit 2026-09-29, SDK releases most days (py/1.41.1 on 2026-09-24), engine releases roughly weekly (v0.107.2 on 2026-09-18)
similarity: 1
axes:
  signals_intake: 2
  control_plane: 3
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 1
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 3
steal:
  - "hatchet-dev/pgoutbox (used in pkg/scheduling/v1/pool.go): a transactional outbox reading Postgres logical replication to publish committed state changes to NATS/RabbitMQ without the dual-write race a polling outbox table has. Directly reusable for getting factoryd's Postgres task state onto our own event stream reliably."
  - "internal/cel wraps Google's cel-go and is used to match durable event waits (frontend/docs/content/docs/v1/durable-event-waits.mdx) against a payload, e.g. this approval event is for task X. A ready vocabulary for our own gate conditions instead of hand-rolled YAML predicates."
  - "The DurableContext event-wait pattern: a task blocks on an event key plus a CEL match, and on worker crash it replays from the durable event log instead of re-running the steps (including any human approval) that already completed. Close to the approval-is-a-workflow-state primitive we want inside our own Temporal workflow."
  - "Payload-visibility is a single per-member or per-user-group boolean (docs/v1/user-roles.mdx): VIEWER/MEMBER roles can be shown run status without task input/output payloads, while OWNER/ADMIN and API tokens always see them. Cheap pattern for our console's own can-this-viewer-see-raw-agent-output question."
  - "Hatchet Lite (build/package/lite.dockerfile) bundles engine, API and migrations in one image for small deployments. A concrete reference shape if we ever want a single-binary story for a from-scratch factoryd re-seed, beyond what we build today."
differs:
  - "Workers authenticate with one long-lived HATCHET_CLIENT_TOKEN per tenant (docs/self-hosting/worker-configuration-options.mdx), stored in a Kubernetes secret and shared by every worker process. That is the opposite of our per-task, audience-scoped, kubelet-rotated ServiceAccount token; using Hatchet's own client auth as our identity layer would put a standing credential inside every agent sandbox."
  - "A Hatchet task is just a function your own worker process runs. There is no sandbox, no egress control and no concept of a disposable per-task environment anywhere in the engine. Hatchet would only ever be a Temporal alternative in our stack; it does not reduce anything we build for the worker plane."
  - "Its authorisation model is dashboard RBAC for humans (OWNER/ADMIN/MEMBER/VIEWER), not runtime policy for agents. Nothing in the engine evaluates whether a task may call a given tool or reach a given host, so adopting Hatchet would not remove the need for factory-gateway sitting between a worker and the network."
ux_verdict: The dashboard gives a live run list, a per-run trace and log timeline, and one-click replay from a checkpoint, which is materially ahead of our console's current no-live-stream, no-diff-view state, but it is watching Hatchet's own task graph, not an agent's diff or reasoning.
slop_verdict: Real and used in anger, 8k stars, 89+ contributors, near-daily SDK releases, and testimonials from agent-heavy customers (Cursor, Greptile, Distill) running large volumes of tasks; independent comparisons treat it as a genuine Temporal alternative, not a thin wrapper.
---

# Hatchet

## 1. What it is

Hatchet is a Postgres-backed durable execution and task-queue engine from Hatchet Technologies Inc, a small YC-backed company founded in 2023 and based in New York. It markets itself as "the orchestration engine for background tasks, AI agents, and durable workflows" and is sold both as Hatchet Cloud (usage-based, a free tier of 100,000 runs a month, paid tiers reportedly starting around 180 USD a month and rising to enterprise contracts) and as a 100 percent MIT-licensed self-hosted product with no feature gap between the two versions. Customers named on the marketing site (Cursor, Greptile, Distill, Kaylie.ai) use it to run long-lived, replayable agent loops and document pipelines.

The README's central claim is that Hatchet's durable tasks are "a drop-in replacement for Temporal or DBOS workflows" while needing only Postgres, not a purpose-built log store. The code backs this up: the engine (cmd/hatchet-engine, hatchet-api, hatchet-lite, hatchet-admin, hatchet-migrate, hatchet-cli) is Go, state lives entirely in Postgres tables under sql/schema/, and correctness comes from a durable event log rather than an external consensus store. What the README does not say up front: the OSS engine has no concept of sandboxing, network policy or per-task credentials at all. It is a scheduler and a durability layer, nothing more.

## 2. Mapping to our five planes

| Plane / principle | What Hatchet does | What we do | Verdict |
|---|---|---|---|
| Signals | Cron, scheduled runs, pushed events, incoming webhooks (GitHub, Stripe, Slack cookbooks), CEL-matched event waits | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | not comparable, generic trigger bus vs opinionated intake |
| Control plane | Postgres-backed durable task and DAG state, retries, concurrency, priority, worker slots, cron, a dashboard; no budgets, capability or approval concept | Temporal workflow per task plus factoryd's registry, policy, budgets, approvals, cost ledger, audit | equal on raw durability, we lead on the domain layer above it |
| Worker plane | A worker is any process you run; slots and affinity route work to it; no isolation, no credential scoping | One gVisor pod per task, read-only rootfs, default-deny egress, projected ServiceAccount token | we lead |
| Verification | None | Forgejo Actions, policy gates, stronger-model review | we lead, absent in Hatchet |
| Merge and deploy | None | Bot merge, Flux GitOps, staged rollout | we lead, absent in Hatchet |
| Policy outside the model | Human RBAC on the dashboard (OWNER/ADMIN/MEMBER/VIEWER) | Capability YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | One long-lived tenant API token shared by every worker | Per-task projected, audience-scoped ServiceAccount token | we lead |
| Artifacts not chat | Tasks pass typed inputs and outputs and durable events between steps, no chat | TaskBrief in, branch, PR, event stream out | equal at the plumbing level |

## 3. Architecture and stack

Go monorepo. Binaries under cmd/: hatchet-engine (gRPC scheduling and dispatch via connectrpc, pkg/grpc), hatchet-api (REST, api/v1), hatchet-lite (all-in-one image, build/package/lite.dockerfile), hatchet-admin, hatchet-migrate (schema migrations against sql/schema/), hatchet-cli, hatchet-loadtest. State lives in Postgres, accessed through a generated repository layer (pkg/repository) on pgx/v5. Inter-service messaging is pluggable (internal/msgqueue: postgres/, nats/, rabbitmq/ backends behind one Queue interface), with RabbitMQ recommended for production multi-container deployments and a transactional outbox (github.com/hatchet-dev/pgoutbox, used in pkg/scheduling/v1/pool.go) moving committed Postgres rows onto the bus without dual writes. Scheduling and worker-slot assignment live in pkg/scheduling. Observability is OpenTelemetry (go.opentelemetry.io/otel/* in go.mod) plus Prometheus metrics; docker-compose.infra.yml wires up Prometheus, Grafana and HyperDX for local development. The dashboard is a separate Next.js app under frontend/app, and the docs site (frontend/docs) is also Next.js.

SDKs exist for Python, TypeScript, Go and Ruby under sdks/, each with its own package manifest and release cadence, all thin clients over the same gRPC/REST surface; workers are ordinary processes written against one of these SDKs. Deployment: hatchet server start via the install script for local Docker use, docker-compose.yml plus docker-compose.infra.yml for a fuller local stack, or a Helm chart from a separate repository (helm repo add hatchet https://hatchet-dev.github.io/hatchet-charts, referenced from frontend/docs/content/docs/self-hosting/kubernetes-quickstart.mdx) for Kubernetes. No sandbox runtime, no network policy and no credential broker appear anywhere in this repository; a task is just a function the SDK registers with a worker process that you run and secure yourself.

## 4. UX

From zero to a first run: install the CLI (curl -fsSL https://install.hatchet.run/install.sh | bash), run hatchet server start (needs Docker), install a language SDK, copy a quickstart task, generate an API token from the dashboard's Settings tab, run the worker, and trigger the task from the dashboard, the CLI or an SDK call. That is roughly five to six steps to a first completed run, comparable to our own console-plus-Forgejo-issue path.

The dashboard (seen via the marketing site, not a running instance) shows a runs table (name, status, workflow, timestamps, duration), a per-run detail view with Overview, Traces and Logs tabs, an activity/output/input panel, and a retry diagram showing a failed step resuming from its last checkpoint. Interfaces are the web dashboard, four SDKs, a CLI and a REST/gRPC API; there is no chat interface. Watching an agent work means watching its Hatchet task's log and trace stream, not its diff or reasoning; intervening means pushing an event the task is waiting on (the durable-event-wait mechanism) rather than clicking a dedicated approve button, since the docs describe this at the API level and no first-class approval widget was found in the dashboard description (not verified further, no live instance was run).

## 5. Security, identity, sandbox, policy, cost

Identity. Workers authenticate with a single HATCHET_CLIENT_TOKEN per tenant, generated once from the dashboard or a Helm-chart job, stored in a Kubernetes secret or .env file, with configurable expiration but no per-task scoping. Every worker process in a fleet typically shares the same token.

Sandbox. None. Hatchet schedules work onto whatever process you point a worker at; it does not start, isolate or constrain that process, and has no opinion on network egress.

Policy. RBAC gates the dashboard and REST API for human tenant members (OWNER, ADMIN, MEMBER, VIEWER), with a payload-visibility flag that can hide task input and output from MEMBER or VIEWER roles. Nothing in the engine evaluates what a task's own code may call or reach at runtime.

Cost. No dollar-denominated budget or ledger in the OSS engine. Traffic shaping exists (priority, per-key dynamic rate limits, concurrency limits, worker slots) but governs throughput, not spend. Hatchet Cloud itself bills per run (10 USD per million runs after a free tier), which is a cost signal about Hatchet's own metering, not something the self-hosted product gives you for tracking your own workloads' cost.

## 6. What we should take from it

Narrow: pgoutbox is a directly reusable pattern (or library) for getting committed Postgres task-state changes onto an event stream without a dual-write race, relevant if our own event stream ever grows a polling-outbox problem. The CEL-based event-wait matching (internal/cel, docs/v1/cel-expressions) is a ready, well-known expression language we could adopt for gate conditions in our policy YAML instead of inventing our own predicate syntax. The DurableContext wait-on-event-plus-CEL-match pattern is close to the approval-is-a-workflow-state primitive we want and is a concrete Temporal-workflow design to copy rather than invent from scratch. The payload-visibility boolean on top of ordinary RBAC is a one-field answer to can-this-console-viewer-see-raw-agent-output that we could add to our own console without a separate redaction pipeline.

Broad: Hatchet's public framing of same source, same security between its cloud and self-hosted product (identical codebase, security fixes shared, no feature gate) is a trust argument we already make implicitly and could state as explicitly in our own portfolio narrative. Its dashboard priorities, a live run list, a per-run trace and log timeline, and replay from the last checkpoint, name three of the exact gaps our own vision document lists for the console, and are a reasonable order to build them in when the console gets real design time.

## 7. Where our philosophy differs and what that costs or buys us

Hatchet's identity model (one long-lived, tenant-wide token) is a direct conflict with identity belongs to the task, not the machine. If we ever put Hatchet's engine under a workflow, we could not use its own client auth as our identity layer; factory-gateway would still need to sit in front of the worker and hand it nothing but a scoped capability, at the cost of not getting Hatchet's own auth for free.

Hatchet has no sandbox, egress control or per-task disposability of any kind, so it can only ever replace the Temporal piece of our control plane, never anything in the worker or verification planes. That is not a real gap for us: we do not want a workflow engine to also be a sandbox runtime, and keeping those concerns separate is closer to our own design than a bundled alternative would be.

Its authorisation model is human-facing dashboard RBAC, not agent-facing runtime policy. Adopting Hatchet would not remove or reduce anything we build for policy lives outside the model; that work stays entirely ours regardless of which durable-execution engine sits underneath factoryd.

## 8. Red flags and slop assessment

Independent reviews (an April 2026 Aicoolies comparison, an August 2026 PandaStack architecture guide, a Hacker News thread with the founder) treat Hatchet as a genuine, if younger, alternative to Temporal rather than a thin wrapper, and note Temporal still has the bigger community, longer track record and a slight edge in a January 2026 review-site score (4.5 vs 4.4 out of 5). Hatchet is explicitly slower at very high throughput than a Redis-based queue (its own README says load-tested to 10k tasks per second, irrelevant at our scale). The founders' own two-year retrospective blog post states that some cloud-only code exists for infrastructure reasons that cannot always be merged back promptly, a small but real deviation from 100 percent MIT, no gap; it is framed as infra coupling, not a paid feature tier. The company is small (about 7 employees), so single-vendor risk exists for anyone depending on paid support, though the MIT licence and documented self-host paths (Lite, Compose, Helm) limit lock-in if the company disappears. No licence changes or security incidents surfaced in search.

## 9. Sources

- Repository clone: ~/repos/market-research-clones/hatchet (shallow, depth 1, commit at 2026-09-29 14:55:03 +0200)
- Files read: README.md, LICENSE, go.mod, CONTRIBUTING.md, docker-compose.infra.yml, internal/msgqueue/msgqueue.go, internal/msgqueue/gzip.go, internal/msgqueue/ directory listing, pkg/scheduling/scheduling.go, pkg/scheduling/extension.go, pkg/scheduling/v1/pool.go (grep for pgoutbox), sql/schema/ directory listing, frontend/docs/content/docs/v1/durable-execution.mdx, frontend/docs/content/docs/v1/durable-event-waits.mdx, frontend/docs/content/docs/v1/cloud-vs-oss.mdx, frontend/docs/content/docs/v1/user-roles.mdx, frontend/docs/content/docs/v1/security/index.mdx, frontend/docs/content/docs/self-hosting/index.mdx, frontend/docs/content/docs/self-hosting/worker-configuration-options.mdx, frontend/docs/content/docs/self-hosting/kubernetes-quickstart.mdx, frontend/docs/content/docs/self-hosting/kubernetes-helm-configuration.mdx, frontend/docs/content/docs/self-hosting/docker-compose.mdx, frontend/docs/content/docs/self-hosting/benchmarking.mdx, frontend/docs/content/docs/cookbooks/hatchet-claude-agent-sdk-trusted-env.mdx
- https://github.com/hatchet-dev/hatchet (browsed 2026-09-29)
- https://hatchet.run (fetched 2026-09-29)
- gh api repos/hatchet-dev/hatchet (fetched 2026-09-29): 8,023 stars, 513 forks, 149 open issues, MIT licence, created 2023-12-15
- gh api repos/hatchet-dev/hatchet/contributors (fetched 2026-09-29): 89 contributors returned
- gh api repos/hatchet-dev/hatchet/releases (fetched 2026-09-29): py/1.41.1 2026-09-24, py/1.41.0 2026-09-22, v0.107.2 2026-09-18, py/1.40.3 2026-09-18, v0.107.1 2026-09-15
- WebSearch "Hatchet durable execution vs Temporal review 2026" (2026-09-29): https://hatchet.run/versus/hatchet-vs-temporal, https://news.ycombinator.com/item?id=44233359, https://www.pandastack.ai/blog/best-durable-execution-platforms-2026/, https://aicoolies.com/comparisons/hatchet-vs-temporal, https://hatchet.run/blog/durable-execution
- WebSearch "Hatchet.run pricing self-hosted open core" (2026-09-29): https://hatchet.run/pricing, https://hatchet.run/blog/two-years-open-source, https://www.ycombinator.com/companies/hatchet-run, https://apis.io/plans/hatchet/hatchet-plans-pricing/, https://toolradar.com/tools/hatchet
