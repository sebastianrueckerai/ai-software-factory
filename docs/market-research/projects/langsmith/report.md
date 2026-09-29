---
name: LangSmith
slug: langsmith
url: https://www.langchain.com/langsmith
repo: none
category: observability-evals
license: "mixed: client SDK (langsmith-sdk) MIT, Helm chart (langchain-ai/helm) Apache-2.0, backend/UI/SmithDB proprietary"
open_source: partial
self_hostable: yes
hosting_model: "multi-region SaaS, BYOC (LangChain control plane, customer data plane), or fully self-hosted Kubernetes via Helm; self-host and BYOC both require an Enterprise contract and a license key"
company: LangChain, Inc., San Francisco, founded 2022 by Harrison Chase and Ankush Gola; Series B $125M at $1.25B valuation (Oct 2025, led by IVP, Sequoia/Benchmark/CapitalG among backers); headcount estimates 200-430
maturity: "core platform has no public repo; client SDK langchain-ai/langsmith-sdk (MIT, 1065 stars, 304 forks, created 2023-05-30, pushed 2026-09-29) and langchain-ai/helm chart (Apache-2.0, 96 stars, 48 forks, created 2023-10-11, pushed 2026-09-28) are open; product launched Feb 2024 with the Series A; ships weekly, 2026 additions include SmithDB, LLM Gateway public beta and Mission Control (all May 2026)"
similarity: 1
axes:
  signals_intake: 1
  control_plane: 0
  sandbox_isolation: 0
  verification: 2
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 3
  ux: 4
  reseedable_selfhost: 1
steal:
  - "Trajectory vs. Details tabs on one trace: Trajectory shows the conversation exactly as sent to the model, Details shows the full nested run tree (outer span, tool span, LLM span with exact prompt and response). A direct template for our own listed gap, no per-task trace or replay view in the console."
  - "process_inputs / process_outputs hooks on the traceable decorator (python/langsmith/run_helpers.py) let a caller scrub a payload client-side before it ever leaves the process, before the PII/secrets redaction the LLM Gateway does later at the wire. Worth two layers, not one, if we ever pipe agent transcripts anywhere outside the cluster."
  - "LLM Gateway spend caps at four levels (org, workspace, user, API key) return a plain 402 with a clear error when a cap is hit, plus real-time cost rollups per level. A concrete convention to check factory-gateway's own budget responses against."
  - "Insights: automatic clustering of traces into recurring usage and failure patterns, plus generated error-analysis summaries. A mechanism worth adding on top of our own SigNoz traces for the console's alerts and task views, instead of a human reading raw traces one at a time."
  - "Prompt Hub versioning: every push gets a content-addressed commit hash tying an exact prompt, its variables and model config to every trace produced with it. Directly answers our own listed weakness of no regression suite for the harness prompt: pin a hash, diff outcomes across hashes."
  - "SmithDB's stated shape (three stateless components over object storage and Postgres, no local disks, no sharding) is a clean pattern for a trace store if SigNoz/ClickHouse ever becomes the bottleneck; not something to copy today since SigNoz already covers this for us."
differs:
  - "LangSmith is downstream observation, not a control plane: it holds no task registry, no scheduler and makes no decision about what an agent should do next. It cannot replace factoryd or Temporal, only sit beside them the way SigNoz does."
  - "The entire backend, storage engine (SmithDB) and UI are closed source, and both self-hosting and BYOC are Enterprise-only, gated by a license key that phones home to beacon.langchain.com for validation unless run in an offline mode. That conflicts with our open-source-with-an-escape-hatch and fully re-seedable-from-Git constraints: a component we could not run at all without a live vendor relationship and a sales contract."
  - "Self-hosting needs Postgres, Redis and ClickHouse (or the early-access SmithDB) plus 16 vCPU/64GB minimum, a fourth and fifth stateful service on top of our three-cpx42 budget, for a slice of functionality SigNoz already covers for infra telemetry."
  - "Identity is a workspace API key or a human login (SSO on Enterprise), not a short-lived credential scoped to one task; adopting LangSmith as infrastructure would mean it sits behind our perimeter as an internal tool, never a boundary we hand external trust to."
ux_verdict: "The best trace/replay visualization we have seen in this survey (Trajectory and Details tabs, Insights clustering, Prompt Hub diffing) but zero task queue, approval flow or kanban, because the product answers 'what happened', never 'what should happen next'."
slop_verdict: "Real and used in anger: SOC 2 Type II since 2024, 12x year-on-year trace volume growth by the vendor's own account, 35% of the Fortune 500 claimed as users, and a 12,000-line client (client.py) doing real async batching, not a stub. Two disclosed CVEs (CVSS 8.8 and 8.5, both patched) and near-universal third-party advice to pick Langfuse instead above modest trace volume temper the marketing claim of being framework-agnostic and effortless."
---

# LangSmith

## 1. What it is

LangSmith is LangChain, Inc.'s commercial platform for tracing, evaluating and monitoring LLM applications and agents, sold alongside the open-source LangChain and LangGraph frameworks it was originally built to debug. The company says it is framework-agnostic, with SDKs for Python, TypeScript, Go and Java and native OpenTelemetry interoperability, and markets it to engineering teams from prototype through enterprise scale (its own logos include Lyft, Workday, Nvidia, Coinbase and Cisco).

The makers claim a unified platform: every plan bundles observability and evaluation, "you only pay for what you use," and self-hosted deployments keep full data ownership with no vendor training on customer traces. What the docs and repos actually show is narrower: the core backend, UI and new SmithDB trace store are proprietary with no public source, self-hosting is an Enterprise-only add-on behind a license key, and only the client SDK (langchain-ai/langsmith-sdk, MIT) and the deployment Helm chart (langchain-ai/helm, Apache-2.0) are open. LangSmith launched in February 2024 alongside LangChain's 25M dollar Series A and has since grown into a five-product suite (Observability, Evaluation, Deployment/LangGraph Platform, Sandboxes, LLM Gateway, Fleet); this report covers the Observability/Evaluation product named in the seed list.

## 2. Mapping to our five planes

| Plane / principle | What LangSmith does | What we do | Verdict |
|---|---|---|---|
| Signals | Alerts on dashboard metrics (latency, error rate, feedback score, cost) fire a webhook or PagerDuty page; nothing creates a task or ticket from it | Forgejo webhooks, SigNoz alerts and factoryd intake turn signals into tasks | we lead |
| Control plane | None: no task registry, scheduler or workflow engine in the Observability/Evaluation product | factoryd, a Temporal workflow per task, Postgres state, policy in Git | we lead |
| Worker plane | None in this product; agent execution is out of scope (Sandboxes is a separate, unreviewed LangChain product) | gVisor pod per task, read-only root FS, default-deny egress | not comparable |
| Verification | Online and offline evals (LLM-as-judge, code evals), datasets, experiments, a PyTest plugin for CI-style eval assertions | Forgejo Actions, policy gates, reproduction gate, stronger-model review | we lead on workflow, they lead on judge-metric tooling |
| Merge and deploy | Absent from this product | Bot merge after approval, Flux GitOps rollout | we lead |
| Policy outside the model | LLM Gateway (beta) enforces spend caps and PII/secrets redaction in gateway code before a call reaches a provider, not in a prompt | Capability rules as a Git document, enforced in gateway code and network policy | equal in mechanism, narrower in scope |
| Identity per task | Workspace API keys and per-user SSO login; no per-task, short-lived credential | Projected, audience-scoped ServiceAccount token per task, verified against cluster OIDC | we lead |
| Artifacts not chat | The trace and the trajectory are the artifact; Prompt Hub versions prompts by commit hash tied to the traces they produced | TaskBrief in, branch and PR out | equal, different artifact type |

## 3. Architecture and stack

No core-platform source is public, so this section relies on vendor docs and blog posts, marked as such; the client SDK and Helm chart are the only parts read directly. Self-hosted deployments (docs.langchain.com/langsmith/kubernetes) run seven-plus services behind a frontend LoadBalancer: backend, platform-backend, ace-backend, playground, a queue, an ingest-queue, plus optional Insights and Polly add-ons, each needing an encryption key generated at install. Required data stores are PostgreSQL, Redis and ClickHouse (ClickHouse holds trace data); LangChain's own docs recommend using managed cloud instances rather than the in-cluster defaults. LangChain announced in May 2026 that its US cloud offering replaced ClickHouse with SmithDB, described as a proprietary Rust engine on Apache DataFusion and Vortex, self-hostable in early access as three stateless components over object storage and Postgres. Deployment is via an official Helm chart (langchain-ai/helm, verified: Apache-2.0, 96 stars, 48 forks) or a Terraform bundle that provisions EKS, RDS, ElastiCache and S3 end to end; recommended minimum is 16 vCPU and 64GB memory, tested on GKE, EKS, AKS, OpenShift 4.14+ and Minikube/Kind.

The client SDK (langchain-ai/langsmith-sdk, verified by clone: MIT, 1065 stars, last push 2026-09-29) is the one piece of real source available. python/langsmith/client.py is a 12,000-line client with an in-process background batching queue (put_tracing_queue, auto_batch_tracing, default batch size 100 and 1000ms timeout) that sends spans asynchronously so a LangSmith outage does not block the traced application, matching the vendor's own claim. python/langsmith/run_helpers.py defines the traceable decorator, with process_inputs and process_outputs hooks for scrubbing a payload before it is queued, and an experimental agent_id and agent_environment addressing mode that drops, rather than falls back, traces for a workspace that has not enabled it. pytest_plugin.py wires evals into ordinary pytest runs. LLM Gateway, in public beta since May 2026, is a proxy layer in front of model providers: one API key routes to configured providers with fallback on failure, enforces spend caps, and on Enterprise plans redacts PII and secrets before the call leaves LangChain's edge, restoring original values in the response so the agent still functions; system prompts, developer prompts and tool-call arguments are explicitly not scanned.

## 4. UX

The observability quickstart (docs.langchain.com/langsmith/observability-quickstart) is nine steps from a cold start to a viewed trace: create an account, get a LangSmith API key, get a provider API key, install the SDK, export three environment variables, write an app using wrap_openai or the traceable decorator, run it, then open the Tracing view and click into the run. That is roughly four commands plus a script, comparable to Opik's or Phoenix's one-line decorator but with more required setup (API keys, env vars) up front. Watching an agent work means watching spans populate a trace tree in near-real time; the Trajectory tab reconstructs the exact conversation sent to the model, the Details tab shows the full nested run tree with the raw prompt and response at each LLM span. Insights auto-clusters traces into usage and failure patterns with generated summaries. There is no approval queue, no kanban of parallel tasks and no way to pause or redirect a running agent, because the product does not run agents, only records and scores what already ran. Interfaces: web UI, Python, TypeScript, Go and Java SDKs, a CLI for terminal trace inspection, and an MCP-adjacent LLM Gateway for wiring straight into coding agents' model calls.

## 5. Security, identity, sandbox, policy, cost

Identity and access: workspace API keys plus human login (SSO on Enterprise); self-hosted deployments configure an admin account and JWT secret at install, with a 12-character-minimum password policy. No task-scoped credential exists. Sandbox: none, this product does not execute agent code. Policy: enforced in code only inside the LLM Gateway (spend caps, redaction) and is new (public beta, Enterprise features gated); everything else, who can see or edit data, is workspace RBAC, not a capability document. Cost: LLM Gateway sets hard caps at organisation, workspace, user and API-key level, returns HTTP 402 on breach, and shows real-time cost rollups per level; outside the gateway, cost is metered and billed per trace (14-day retention traces at 2.50 dollars per 1000, 400-day at 5 dollars per 1000) and per seat (39 dollars per seat per month on Plus), with Enterprise pricing custom. Two disclosed CVEs are public record: AgentSmith (June 2025, CVSS 8.8, Noma Security), which let a malicious Prompt Hub proxy configuration capture API keys and user data; and CVE-2026-25750 (March 2026, CVSS 8.5, Miggo Security), a token-theft and account-takeover bug hitting both cloud and self-hosted instances, fixed in 0.12.71. LangSmith holds SOC 2 Type II (scope extended to Security, Availability and Confidentiality in the 2026 report) and claims HIPAA and GDPR compliance; a Trust Center (trust.langchain.com) and DPA process exist. 2026 subprocessor additions route some AI-assist features (LangSmith Engine, Polly) through OpenAI, Anthropic, Fireworks and Baseten, opt-in for Enterprise customers.

## 6. What we should take from it

Narrow, copyable this month: the Trajectory and Details two-tab split for one trace, directly answering our console's missing trace-and-replay view; the process_inputs and process_outputs scrub-before-send hook pattern for any client wrapper we write around the harness; and the four-level (org, workspace, user, key) spend-cap-with-402 convention to check factory-gateway's own budget-exceeded responses against.

Broad: Insights' automatic clustering of traces into recurring failure patterns is a real answer to "alerts with verdicts" applied to output quality rather than infrastructure, worth generalising our own alert-verdict mechanism to cover both. Prompt Hub's commit-hash-per-prompt-version, joined to every trace it produced, is a working design for the harness-prompt regression suite we list as a known gap: pin a hash, compare outcomes across hashes, without inventing a bespoke versioning scheme.

## 7. Where our philosophy differs and what that costs or buys us

LangSmith is instrumentation, not orchestration: it observes and scores, it never decides what an agent should do next, so it can only ever sit beside factoryd and SigNoz, never inside our control plane. Its self-hosting path is real, a working Helm chart and Terraform bundles tested on real clusters, but licence-gated behind an Enterprise contract and a license key that checks in with LangChain's own servers, which our own delete-everything-and-re-seed-from-Git constraint cannot accept for anything load-bearing; we could run it as an internal convenience tool behind our perimeter, never as infrastructure we depend on to rebuild. Its spend-cap and redaction code in the LLM Gateway shows real policy enforced in code rather than prompts, which we already do more thoroughly (holds under a database lock, per-task and per-day envelopes); adopting LangSmith's version would be a narrowing, not a gain, for that specific mechanism.

## 8. Red flags and slop assessment

Maintenance and adoption signals are real: SOC 2 Type II since July 2024 with the scope widened in 2026, 12x year-on-year trace-volume growth and 35 percent Fortune 500 usage by the vendor's own account, a 1.25 billion dollar valuation after a 125 million dollar Series B in October 2025, and an actively developed 12,000-line client SDK with weekly product releases (SmithDB, LLM Gateway and Mission Control all shipped in a single month, May 2026). This is not a landing-page project.

Two disclosed, high-severity CVEs in under a year (CVSS 8.8 in June 2025, CVSS 8.5 in March 2026, the second hitting self-hosted deployments too) are a real signal for a product that stores full agent transcripts, prompts and sometimes secrets. Independent third-party comparisons in 2026 consistently recommend Langfuse over LangSmith once trace volume or self-hosting needs grow, citing per-trace-plus-per-seat billing that can run far higher than Langfuse's per-unit model at comparable volume, and note that LangSmith's traceable decorator does not integrate with OpenTelemetry as cleanly as Langfuse or Phoenix. The "framework-agnostic" marketing claim is broadly true, any code can use the traceable decorator, but it understates that the deepest integrations and one-line tracing still assume LangChain or LangGraph.

## 9. Sources

- https://www.langchain.com/langsmith, fetched 2026-09-29
- https://docs.langchain.com/langsmith (redirected from docs.smith.langchain.com), fetched 2026-09-29
- https://docs.langchain.com/langsmith/kubernetes, fetched 2026-09-29
- https://docs.langchain.com/langsmith/observability-quickstart, fetched 2026-09-29
- https://docs.langchain.com/langsmith/llm-gateway, referenced via search 2026-09-29
- https://docs.langchain.com/langsmith/llm-gateway-redaction, referenced via search 2026-09-29
- https://docs.langchain.com/langsmith/regions-faq, referenced via search 2026-09-29
- https://trust.langchain.com and https://trust.langchain.com/resources, referenced via search 2026-09-29
- https://www.langchain.com/blog/series-b, referenced via search 2026-09-29
- https://www.langchain.com/blog/mission-control-operating-self-hosted-langsmith-on-kubernetes, referenced via search 2026-09-29
- https://www.langchain.com/blog/introducing-llm-gateway, referenced via search 2026-09-29
- https://changelog.langchain.com/announcements/langsmith-is-now-soc-2-type-ii-compliant, referenced via search 2026-09-29
- https://thehackernews.com/2025/06/langchain-langsmith-bug-let-hackers.html (AgentSmith, CVSS 8.8), referenced via search 2026-09-29
- https://thehackernews.com/2026/03/ai-flaws-in-amazon-bedrock-langsmith.html (CVE-2026-25750, CVSS 8.5), referenced via search 2026-09-29
- WebSearch "LangSmith self-hosted deployment architecture Kubernetes helm 2026", 2026-09-29
- WebSearch "LangSmith pricing plans enterprise 2026", 2026-09-29
- WebSearch "LangChain company funding Series valuation 2025 2026 headquarters founded", 2026-09-29
- WebSearch "LangSmith security SOC2 trust center data privacy", 2026-09-29
- WebSearch "LangSmith vs Langfuse comparison review 2026", 2026-09-29
- WebSearch "LangSmith Hacker News discussion criticism", 2026-09-29
- WebSearch "LangSmith prompt hub prompt management LLM gateway routing features", 2026-09-29
- WebSearch "langchain-ai/langsmith-sdk github license MIT", 2026-09-29
- local clone https://github.com/langchain-ai/langsmith-sdk to ~/repos/market-research-clones/langsmith (depth 1; no core LangSmith backend repo exists, per seed table repo: none): LICENSE, python/README.md, python/langsmith/client.py, python/langsmith/run_helpers.py, python/langsmith/pytest_plugin.py
- gh api repos/langchain-ai/langsmith-sdk, 2026-09-29: stars 1065, forks 304, open_issues 235, created 2023-05-30, pushed 2026-09-29, license MIT
- gh api repos/langchain-ai/helm, 2026-09-29: stars 96, forks 48, open_issues 57, created 2023-10-11, pushed 2026-09-28, license Apache-2.0
