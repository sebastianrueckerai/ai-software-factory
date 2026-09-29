---
name: Arize Phoenix
slug: arize-phoenix
url: https://phoenix.arize.com
repo: https://github.com/Arize-ai/phoenix
category: observability-evals
license: Elastic-2.0
open_source: partial
self_hostable: yes
hosting_model: self-hosted (pip, Docker, Helm, Kubernetes, CLI) or Arize AX managed SaaS
company: Arize AI, San Francisco/Berkeley CA, founded 2020, ~131-135M USD raised through a 70M Series C (Feb 2025), agreed to be acquired by Dynatrace for 915M USD (announced Aug 2026, not yet closed)
maturity: 11,652 stars, ~230+ contributors, repo created 2022-11-09, last push 2026-09-28, releases across 7 sub-packages several times a week
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 2
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 2
  ux: 4
  reseedable_selfhost: 3
steal:
  - "A maintained per-model dollar-per-token pricing table as a plain JSON manifest (src/phoenix/server/cost_tracking/model_cost_manifest.json) matched by regex specificity (regex_specificity.py) instead of hand-coded price constants; factory-gateway's cost model could use the same shape."
  - "A pluggable sandbox backend interface (src/phoenix/server/sandbox/types.py, SandboxBackend ABC) with one session manager handling idle TTL eviction, refcounts and per-config session fingerprinting (session_manager.py) across seven providers (Daytona, E2B, Modal, Deno, Vercel, WASM, an in-process 'Monty' runtime). Same shape as our Harness interface, applied to sandboxes instead of harnesses."
  - "Multi-variant release images per version: root, nonroot and debug Docker tags built from one Dockerfile. Worth copying for the agent worker image: a debug variant with a shell for a human investigating a stuck sandbox, without weakening the hardened default."
  - "A single boolean flip from single-user to multi-user: PHOENIX_ENABLE_AUTH plus PHOENIX_SECRET turns on OAuth2, LDAP or local accounts and role-based permissions; off by default for a local laptop run. Clean default-closed-when-it-matters pattern."
  - "A built-in OTLP receiver inside the same process that serves the UI (pyproject.toml lists opentelemetry-exporter-otlp and grpcio) so sending traces needs no separate collector. Worth weighing against a second SigNoz-adjacent path for agent-session-scoped, developer-facing trace debugging."
  - "A Playground that replays a single traced model call with an edited prompt, model or parameters, and an experiment comparison table that diffs runs side by side. Direct answer to our own listed gap: no per-task trace or diff view in the console."
differs:
  - "Phoenix ships its own embedded AI assistant (PXI, src/phoenix/server/agents/) that holds long-lived provider API keys as server-side environment variables or in a self-hosted secrets store (model_factory.py reads OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY and similar directly) and can reach GitHub and the open web (github.py, web_access.py) on its own account, not a per-session token. That is the opposite of our identity-belongs-to-the-task principle; copying the embedded-copilot idea would force it through factory-gateway's per-task virtual keys instead of a static server credential."
  - "License is Elastic License 2.0: source-available, not OSI-approved, and it explicitly forbids offering the software to third parties as a hosted or managed service. Fine to run internally, but not the escape-hatch kind of open source our stack constraint asks for if a component like this ever became load-bearing rather than a reference."
  - "Cost is computed and displayed everywhere but never capped: no hold, no per-task or per-day budget, nothing blocks a call. Treating a Phoenix-style ledger as equivalent to our cost-control principle would quietly drop the hard-cap half of it."
ux_verdict: "pip install and phoenix serve get a running trace UI in under a minute, and the trace, eval and playground screens beat our console for watching and replaying a single model call, but there is no task queue, no approval flow and no kanban of parallel agent work anywhere in the product."
slop_verdict: "Real and used in anger: 11.6k stars, near-daily releases across seven packages, and it is the tracing layer behind several named coding-agent integrations. Not a landing-page project. The open question is roadmap independence once the pending Dynatrace acquisition closes."
---

# Arize Phoenix

## 1. What it is

Arize Phoenix is an open-source (Elastic License 2.0) AI observability and evaluation platform: OpenTelemetry-based tracing for LLM applications, LLM-as-judge and code-based evals, versioned datasets, experiments that compare prompt or model changes, a prompt playground, and prompt version management. It is made by Arize AI (San Francisco/Berkeley, founded 2020), which also sells a commercial managed platform, Arize AX, built on the same OpenInference/OpenTelemetry instrumentation. The README frames Phoenix as the free, self-hosted, no-feature-limitations sibling of AX, which adds managed compute, large-team features (workspaces, audit trails, compliance certifications) and support.

The makers claim no license fees, no usage limits and no feature gates for the self-hosted product (arize.com/docs/phoenix/self-hosting). The repository backs this up: pyproject.toml and the Helm chart ship the full feature set (tracing, evals, datasets, experiments, playground, prompt management, an embedded assistant) with no license-key check found anywhere in src/phoenix. The ELv2 licence text itself does mention a license-key mechanism, but nothing in the codebase implements one; the restriction that matters in practice is the ban on reselling Phoenix as a hosted service.

Arize AI agreed in August 2026 to be acquired by Dynatrace for 915 USD million; the deal had not closed as of today (2026-09-29, per public reporting).

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None in the OSS product: traces and evals are the substrate, not work items. Arize AX has a paid Signal feature that clusters recurring failures into issues, not present in Phoenix. | Forgejo issues, SigNoz alerts and factoryd intake spawn tasks. | we lead |
| Control plane | No durable task registry. server/daemons/experiment_runner.py and experiment_sweeper.py track in-flight eval or experiment jobs only. | factoryd with a Temporal workflow per task, Postgres state, policy, budgets, approvals. | we lead |
| Worker plane | server/sandbox/ runs short code snippets (evaluator functions, tool calls) through pluggable providers (Daytona, E2B, Modal, Deno, WASM). No multi-step coding session, no git checkout, no egress policy. | One gVisor pod per task, read-only root FS, default-deny egress. | not comparable |
| Verification | Datasets, experiments and LLM-judge evals produce quality signals a human reads; nothing gates a merge. | Forgejo Actions, policy gates, reproduction gate, stronger-model review before merge. | we lead |
| Merge and deploy | Absent. Phoenix does not touch source repositories or deployments. | Bot merge after approval or auto-rule, Flux GitOps rollout. | we lead |
| Policy outside the model | Role-based permissions and OAuth2, LDAP or local accounts govern which humans can see or edit Phoenix data. PXI's own tool access (GitHub, web) is not policy-gated, only credential-gated. | Capability rules as a Git document, enforced in gateway code and network policy. | not comparable |
| Identity per task | A single set of provider API keys (env vars or Phoenix secrets) serves the whole server and the PXI assistant. | Per-task, audience-scoped, kubelet-rotated ServiceAccount token, mapped to capability and budget per call. | we lead |
| Artifacts not chat | PXI is a conversational copilot embedded in the console for a human operator, by design. | Agents exchange a TaskBrief in, a branch and PR out; no chat transcript is the deliverable. | not comparable |

## 3. Architecture and stack

Backend: Python (pyproject.toml, requires-python >=3.11,<3.15), FastAPI (>=0.137.0) plus Starlette for HTTP, Strawberry GraphQL for the app API, a gRPC/OTLP receiver (grpcio, opentelemetry-exporter-otlp) built into the same process. Storage is SQLAlchemy (async) with Alembic migrations (src/phoenix/db/migrations), backed by SQLite by default (aiosqlite, the project's own arize-phoenix-sqlean extension) or Postgres for production (docker-compose.yml wires a Postgres 16 sidecar via PHOENIX_SQL_DATABASE_URL). No separate queue: background work runs as in-process daemons (src/phoenix/server/daemons/, for example experiment_runner.py, span_cost_calculator.py, agent_session_sweeper.py).

Frontend is a TypeScript/React app under js/app. Deployment shapes: pip install arize-phoenix or uvx arize-phoenix serve for a single process, a multi-arch Docker image (Dockerfile, root/nonroot/debug variants), a Helm chart (helm/Chart.yaml, depends on a community Postgres chart, appVersion 20.14.0 at the time of cloning), Kustomize overlays (kustomize/), and one-click templates for Railway, Render, Cloud Run and Azure.

Agent code lives in src/phoenix/server/agents/ (PXI): model_factory.py builds a pydantic-ai client per provider by reading OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY/GOOGLE_API_KEY, or Azure credentials from the environment or Phoenix's own secret store; github.py and web_access.py give it GitHub and open-web tool access; subagent.py and capabilities/ structure its tool set; an in-process MCP server is mounted at /mcp (server/mcp/) so external clients (Claude Code, Cursor) can query traces, datasets and experiments, and fastmcp-slim also lets PXI itself act as an MCP client.

## 4. UX

Zero to first result: pip install arize-phoenix && phoenix serve, or a single uvx arize-phoenix serve, gives a running UI on port 6006. Instrumenting an app is a second step: npx @arizeai/phoenix-cli setup auto-detects the framework and LLM provider and wires OpenInference instrumentation, or a user adds the OpenTelemetry SDK by hand. That is roughly two to three commands to a first trace.

Watching an agent work: traces stream into the UI as spans arrive (README links a real-time trace video, not independently verified here since no screenshot or video was rendered). A user can annotate spans and add human feedback labels (tutorials/annotations/custom-annotations-tool-for-eval-driven-development.ipynb), run evals against a dataset, and use the Playground to replay one traced call with a different prompt, model or parameters. None of this is intervention in a running agent: Phoenix observes and evaluates after the fact or on demand, it does not pause, approve or redirect a live coding task, because it does not run coding tasks. Interfaces: web UI, Python/TypeScript/Java/Go SDKs, CLI (phoenix serve, px setup), and an MCP server for IDE agents. What is easier than our console: the trace waterfall, span detail and experiment-diff screens, none of which our console has today. What is missing entirely: any queue, approval or multi-task kanban view.

## 5. Security, identity, sandbox, policy, cost

Identity and access: PHOENIX_ENABLE_AUTH and PHOENIX_SECRET (src/phoenix/config.py) turn on OAuth2, LDAP or local accounts with role-based permissions; off by default, so a fresh local install has no login. A default admin account (admin/admin@localhost/admin, src/phoenix/auth.py) exists until changed. Provider credentials for PXI are static environment variables or entries in Phoenix's own secret store, held by the server process, not scoped per task or per session.

Sandbox: code execution (for evaluator functions and PXI tool calls) goes through src/phoenix/server/sandbox/, a SandboxBackend abstraction with adapters for Daytona, E2B, Modal, Vercel, Deno, an in-process WASM runtime called Monty, and a no-op backend, managed by a session manager with idle eviction and per-provider session caps. This isolates arbitrary short-lived code, not a whole coding-agent workspace with git state and multi-step tool use.

Policy: RBAC governs which humans can see or change data in the UI; there is no capability policy for what PXI itself may do beyond which credentials it was given.

Cost: src/phoenix/server/cost_tracking/ computes per-span and per-trace cost from a maintained pricing manifest and matches model names by regex specificity. This is a ledger and a UI, not a control: nothing here holds, caps or blocks spend.

## 6. What we should take from it

Narrow, copyable this month: the JSON pricing-manifest-plus-regex-match pattern for model_cost_manifest.json, the SandboxBackend interface and its session manager for anyone building a second sandbox backend behind an interface, the root/nonroot/debug image variant convention, and the single-flag auth toggle.

Broad: the Playground and experiment-diff UX is a direct template for the trace and diff view our own weak-points list says the console lacks. The OTLP-receiver-in-the-app pattern is worth weighing against a second SigNoz-adjacent path for agent-session-scoped, developer-facing trace debugging, separate from ops-facing infra telemetry.

## 7. Where our philosophy differs and what that costs or buys us

Phoenix's embedded PXI assistant holds long-lived, server-wide provider credentials and unmediated GitHub/web tool access. Building anything similar in our design would break identity-belongs-to-the-task unless it were rebuilt to call out through factory-gateway with a per-session token, the same discipline our worker plane already applies to opencode.

The Elastic License 2.0 buys Arize a defensible business and still gives us full source access and a real self-hosting path, but it is not OSI open source and specifically bars re-hosting the software as a service. That is an acceptable cost for a tool we would only ever run internally, and a reason not to lean on it for anything resold.

Their cost ledger without caps is cheaper to build than our budget system (a hold under a database lock, per-task and per-day envelopes) but does not meet our cost-control principle on its own; adopting their approach would mean adding the caps ourselves, not treating the ledger as sufficient.

## 8. Red flags and slop assessment

Maintenance is strong: 11.6k GitHub stars, releases across arize-phoenix, arize-phoenix-otel, arize-phoenix-evals and other sub-packages landing several times a week (gh api repos/Arize-ai/phoenix/releases shows five releases in the week before 2026-09-29), last push 2026-09-28, 1,033 open issues against 1,170 forks, both consistent with heavy real use rather than an abandoned or thin project.

The biggest open flag is not in the code: Dynatrace agreed in August 2026 to acquire Arize for 915 USD million; the deal was not reported closed as of today. An open-core vendor mid-acquisition is a real risk to roadmap independence and to whether no-feature-gates holds after integration into a much larger observability vendor's product line, though nothing in the repository today shows gating in progress.

No open security incidents were found in this pass (not exhaustively searched beyond a general web search). The Elastic License 2.0's hosted-service restriction is a licence-model flag, not a maintenance one, and is disclosed plainly in LICENSE and pyproject.toml.

## 9. Sources

- https://github.com/Arize-ai/phoenix (cloned to /home/womb/repos/market-research-clones/arize-phoenix, depth 1, commit at clone time 2026-09-28 19:02:08 -0400)
- README.md, LICENSE, pyproject.toml, docker-compose.yml at repo root
- helm/Chart.yaml, helm/values.yaml
- src/phoenix/config.py, src/phoenix/auth.py
- src/phoenix/server/sandbox/ (types.py, session_manager.py)
- src/phoenix/server/agents/ (model_factory.py, github.py, web_access.py)
- src/phoenix/server/cost_tracking/ (model_cost_manifest.json, token_cost_calculator.py, regex_specificity.py)
- src/phoenix/server/daemons/
- tutorials/annotations/custom-annotations-tool-for-eval-driven-development.ipynb
- gh api repos/Arize-ai/phoenix, 2026-09-29: stars 11652, forks 1170, open_issues 1033, created 2022-11-09, pushed 2026-09-28
- gh api repos/Arize-ai/phoenix/releases, 2026-09-29
- gh api repos/Arize-ai/phoenix/contributors, 2026-09-29
- https://arize.com/docs/phoenix/self-hosting, fetched 2026-09-29
- https://arize.com/docs/phoenix/resources/frequently-asked-questions/what-is-the-difference-between-phoenix-and-arize, fetched 2026-09-29
- web search "Arize AI company funding Series C headquarters founded", 2026-09-29: arize.com blog Series C announcement, Dynatrace press release on the Arize acquisition
