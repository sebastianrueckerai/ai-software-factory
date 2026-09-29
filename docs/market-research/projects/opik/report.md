---
name: Opik
slug: opik
url: https://www.comet.com/site/products/opik/
repo: https://github.com/comet-ml/opik
category: observability-evals
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted (docker-compose or Helm) or Comet-hosted cloud, free tier on both
company: Comet ML, Inc., New York, founded 2017 by Nimrod Lahav and Gideon Mendels, Series B ($50M, Nov 2021, led by OpenView), about 100 employees
maturity: 22,288 stars, 1,829 forks, 156+ contributors, created 2023-05-10, last push 2026-09-29, releases roughly daily (2.2.8x patch train)
similarity: 1
axes:
  signals_intake: 1
  control_plane: 0
  sandbox_isolation: 1
  verification: 2
  policy_outside_model: 1
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 2
steal:
  - The `uvx opik mcp configure` MCP server lets Claude Code, Cursor, Copilot, Codex or opencode read traces, score outputs and run evaluations from chat. We have no way for a supervisor or reviewer to query past session traces at all; an MCP tool like this over our own SigNoz traces would close that gap cheaply.
  - The `@track` decorator (Python and TypeScript SDKs) turns any function into a full nested trace tree with one line, no manual span plumbing. Our "no replay or trace UI" weakness could shrink a lot just by wrapping the harness call sites the same way, even before building a console view.
  - The PyTest integration runs LLM-as-judge metrics as ordinary test assertions, so an eval regression fails CI like any other test. That is a ready pattern for a fourth, cheap verification signal ahead of stronger-model review in our own gate.
  - Online Evaluation Rules score a sample of production traffic continuously with LLM-as-judge metrics and surface drift on a dashboard. It is the same shape as our "alerts with verdicts" mechanism, aimed at model quality instead of infra, and could feed the same alert stream.
  - IsolatedSubprocessExecutor (apps/opik-python-backend/src/opik_backend/executor_isolated.py) gives each custom scoring script a fresh subprocess with scoped env vars, a 20MB stack cap and a timeout, cheap protection for the many places we run small model-authored snippets outside the main sandbox path (report generation, config validation) where a full gVisor pod is overkill.
differs:
  - Opik has no task registry, scheduler or workflow engine anywhere in the code. It answers "what happened" after the fact; it never decides what an agent should do next. Adopting it changes nothing about our control plane, it is purely an add-on next to SigNoz.
  - Authentication is off by default in the open-source build (authentication.enabled defaults to AUTH_ENABLED:-false in apps/opik-backend/config.yml, basicAuth is false in the Helm values) and, when turned on, delegates to a proprietary "React service" that is part of Comet's own platform, not shipped in this repository. Self-hosting Opik does not give you real multi-user identity or RBAC; that only exists on Comet's cloud. This directly contradicts our "identity belongs to the task, not the machine" principle, so Opik can only ever be an internal tool behind our own perimeter, never a component we point external trust at.
  - The self-hosted stack needs five datastores side by side (MySQL for state, ClickHouse plus Zookeeper for analytics, Redis for queues, MinIO for blobs). That is heavier than the slice of it we would actually want (traces and eval scores), and is a real capacity cost against our three-cpx42 budget if we ran it as a fourth stateful service next to Postgres, Temporal and SigNoz.
ux_verdict: Better trace and evaluation drill-down than our console today (per-span tree, dataset/experiment diffing, prompt playground), but it has no task lane, no approval flow and no kanban, because it solves a different problem than orchestration.
slop_verdict: Real and actively used, not a landing page. Apache-2.0 core, near-daily releases, 22k+ stars, named production users (AssemblyAI, Stability AI per Comet's own page, not independently verified). The marketing language ("true open-source project") is honest about the OSS licence but glosses over the missing self-hosted user management, confirmed both in the code and by independent reviews.
---

# Opik

## 1. What it is
Opik is Comet's open-source LLM observability and evaluation platform: tracing, datasets and experiments, LLM-as-judge metrics, a prompt playground, an "Agent Optimizer" SDK for automated prompt tuning, and a separate Guardrails service for PII and policy checks on model output. Comet sells it as a wedge from their older ML-experiment-tracking product into the LLM/agent market. It targets ML engineers instrumenting an existing LLM app or agent, not a system that decides what work an agent should do.

The README claims "the full platform, backend included" is Apache-2.0 and free to self-host, with no Enterprise gate on core features. The repository backs that up for tracing, evaluation, datasets and guardrails: those are ordinary Apache-2.0 Java, Python and TypeScript code with no ee/ split. It does not back it up for authentication: apps/opik-backend/config.yml ships authentication.enabled defaulting to false and, when enabled, RemoteAuthService calls out to Comet's own hosted "React service" for login and quotas, a component this repository does not contain.

## 2. Mapping to our five planes
| Plane / principle | What Opik does | What we do | Verdict |
|---|---|---|---|
| Signals | Online Evaluation Rules score live traffic and flag drift on a dashboard; no ticket or task is created from it | Forgejo webhooks, SigNoz alerts and factoryd intake turn signals into tasks | not comparable |
| Control plane | None: no task registry, no scheduler, no approvals | factoryd, Temporal workflow per task, Postgres, policy in Git | not comparable |
| Worker plane | IsolatedSubprocessExecutor runs short scoring scripts in a fresh subprocess with an env and stack cap, for judge code only | gVisor pod per task, read-only root FS, default-deny egress | not comparable |
| Verification | Datasets, experiments, LLM-as-judge metrics, PyTest integration for CI gating | Forgejo Actions, policy gates, stronger-model review | we lead on workflow, they lead on judge-metric tooling |
| Merge and deploy | None | Bot merge after approval, Flux, staged rollout | not comparable |
| Policy outside the model | Guardrails is a separate deployable service, but RBAC and audit logging are marketed as enterprise/cloud features, not present in the OSS repo | Capability rules in Git, enforced in gateway and network policy | we lead |
| Identity per task | None: OSS auth is off by default and, when on, needs Comet's proprietary backend | Projected ServiceAccount token per task, verified against cluster OIDC | we lead |
| Artifacts not chat | Traces and datasets are the artifact; the MCP server explicitly lets an agent read and act on them from chat | TaskBrief in, branch and PR out | equal, different artifact type |

## 3. Architecture and stack
Backend (apps/opik-backend) is Java 25 on Dropwizard (pom.xml, config.yml, package com.comet.opik), split into domain, infrastructure, api and utils. State lives in MySQL (STATE_DB_*), trace and span analytics in ClickHouse behind Zookeeper, queueing and caching in Redis, blobs in MinIO/S3. apps/opik-frontend is React 18 with Vite, TypeScript and Zustand. apps/opik-python-backend runs custom Python scoring code (metrics, the Optimization Studio) through IsolatedSubprocessExecutor, a fresh-subprocess-per-call pattern, not a container sandbox. apps/opik-guardrails-backend is a separate Python service, CPU or GPU Dockerfile, for PII and policy checks, reachable at /guardrails through the frontend proxy. Deployment is deployment/docker-compose/docker-compose.yaml (mysql, redis, clickhouse, zookeeper, minio, backend, python-backend, guardrails-backend, frontend, optional Jaeger and an OpenTelemetry collector) or deployment/helm_chart/opik for Kubernetes. Model calls for judges and the playground go through backend-side LLM provider clients (OpenAI, Anthropic, VertexAI, and others under infrastructure/llm), configured per workspace, not through an external gateway.

## 4. UX
Zero to first trace is two commands: pip install opik && opik configure, then decorate a function with @track. The MCP path is one command, uvx opik mcp configure, after which a coding agent in Claude Code, Cursor, Copilot, Codex or opencode can read traces and run evaluations from its own chat. The web console (screenshots on the product page and README) shows a trace tree per request, a prompt playground, dataset and experiment tables with per-row judge scores, and a production monitoring dashboard for cost, latency and feedback scores over time. There is no task list, no approval queue and no kanban board, because Opik never decides what work happens, it only records and scores what already happened. Watching an agent work means watching its trace tree fill in as it runs, which is closer to real-time than our console's current no-live-stream state.

## 5. Security, identity, sandbox, policy, cost
Identity: authentication is off by default in self-hosted Opik; turning it on requires Comet's own hosted auth backend, so the OSS repository alone has no real multi-user login. Sandbox: the only isolation in the codebase is IsolatedSubprocessExecutor, a plain OS subprocess with a resource cap and timeout for running short scoring scripts, not a container or VM boundary, and not meant to hold an adversarial agent. Policy: Guardrails is real code (PII detection, policy checks) but is a separate opt-in service you call explicitly, not a network- or gateway-enforced boundary. Cost: spans and traces carry token counts and a computed cost per call, shown on dashboards, but there is no cap, hold or budget anywhere in the self-hosted code; "Cost Intelligence" spend tracking for coding agents is called out on the marketing page as an enterprise capability. Credentials: LLM provider API keys are configured server-side per workspace, not brokered per task.

## 6. What we should take from it
Narrow: the MCP server pattern (agent reads its own observability data from chat) and the @track-style one-line trace decorator are both small, concrete wins for our "no replay or trace UI" gap, buildable on top of the SigNoz traces we already collect. The PyTest-as-eval-gate pattern is a cheap fourth verification signal. IsolatedSubprocessExecutor is a reasonable model for isolating the small snippets we already run outside the main sandbox path.

Broad: Online Evaluation Rules show a working version of "alerts with verdicts" aimed at output quality rather than infrastructure, worth generalising our alert-verdict mechanism to cover both. The dataset/experiment/judge-score loop is a concrete way to start measuring model-tier choices from outcomes instead of a fixed ladder, which is on our own list of known weaknesses.

## 7. Where our philosophy differs and what that costs or buys us
Opik proves that "open source, free to self-host" can still quietly withhold real identity and RBAC by routing auth through a proprietary hosted service. We could never adopt that shape: our principle that identity belongs to the task, not a login screen, is stricter than what "self-hosted" means for Opik, and we pay for that with more work (OIDC-verified per-task tokens) than a login form would cost. Running the whole Opik stack for its observability slice would also mean a fifth stateful service on our three-server budget; the pieces worth taking (SDK trace decorator, MCP idea, judge-metric library) do not require running Opik's server at all.

## 8. Red flags and slop assessment
Real project: near-daily releases, 22k+ stars, 156+ contributors, an active Slack community, no dormant-repo signs. Apache-2.0 core with no ee/ licence split found in the code, unlike Langfuse's open-core model. The one credible red flag is the gap between "free to self-host the full platform" and the actual absence of self-hosted user management, which the code confirms (AUTH_ENABLED defaults to false, RemoteAuthService calling a Comet-only backend) and which an independent review (Elest.io, cited below) states explicitly, suggesting self-hosted Opik is meant to sit behind a private network rather than serve multiple untrusted users on its own.

## 9. Sources
- https://github.com/comet-ml/opik (cloned shallow to ~/repos/market-research-clones/opik)
- README.md and translated readmes (fetched 2026-09-29)
- apps/opik-backend/config.yml, pom.xml, README.md, AGENTS.md
- apps/opik-backend/src/main/java/com/comet/opik/infrastructure/auth/RemoteAuthService.java
- apps/opik-python-backend/docs/ISOLATED_EXECUTOR_COMPLETE.md
- apps/opik-guardrails-backend/README.md
- apps/opik-frontend/package.json
- sdks/opik_optimizer/README.md
- deployment/docker-compose/docker-compose.yaml
- deployment/helm_chart/opik/values.yaml
- gh api repos/comet-ml/opik (fetched 2026-09-29): stars, licence, dates, issues
- gh api repos/comet-ml/opik/contributors, /releases (fetched 2026-09-29)
- https://www.comet.com/site/products/opik/ (fetched 2026-09-29)
- WebSearch "Opik Comet vs Langfuse review 2026 self-hosted" (2026-09-29): https://blog.elest.io/opik-vs-langfuse-self-hosted-llm-observability-in-2026/, https://www.comet.com/site/products/opik/compare/langfuse-vs-opik/, https://www.truefoundry.com/blog/langfuse-alternatives, https://www.agenticwire.news/article/langfuse-vs-opik
- WebSearch "Comet ML company founded headquarters funding Series" (2026-09-29): https://www.comet.com/site/about-us/news/press-releases/comet-raises-50-million-series-b-to-accelerate-ml-development-for-the-enterprise/, https://www.crunchbase.com/organization/comet-ml
