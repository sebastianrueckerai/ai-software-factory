---
name: Temporal
slug: temporal
url: https://temporal.io
repo: https://github.com/temporalio/temporal
category: durable-execution
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted (binary, Docker, Helm chart) or Temporal Cloud, same server code both ways
company: Temporal Technologies Inc., Bellevue WA (remote-first), founded Oct 2019 by Samar Abbas and Maxim Fateev (ex-Uber Cadence, ex-AWS SQS/SWF); Series D 300M USD at 5B USD (Feb 2026, a16z) then Series E 550M USD at 12.55B USD (Sep 2026, Lightspeed)
maturity: server repo 23.4k stars, 1.9k forks, 1024 open issues, created 2019-10-16, pushed 2026-09-29 (active daily); separate temporalio/ai-cookbook repo created 2025-09-30, 96 stars, pushed 2026-09-29; yearly Replay conference, continuous server and per-language SDK releases
similarity: 1
axes:
  signals_intake: 0
  control_plane: 4
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 1
  reseedable_selfhost: 3
steal:
  - Worker Versioning (GA at Replay 2026) replaces our hand-rolled workflow.GetVersion markers. Pinned workflows freeze to the Worker Deployment Version that started them; Auto-Upgrade workflows move to the Current or Ramping Version automatically. Temporal's own Kubernetes/GitHub Actions posts describe a Worker Controller that derives Build IDs from image digests, ramps traffic, and treats a return to a known-good version as an instant rollback.
  - Workflow Streams (Public Preview), durable streaming built on the existing Signal and Update primitives, is a first-party fix for the console gap we already flag ("no real-time streams of the agent's work"). It could carry session progress to the console instead of a bespoke side channel.
  - Standalone Activities (Public Preview for Go, Python, .NET) run outside any workflow and later slot into one without a rewrite. A fit for one-off infra actions (build VM commissioning, runner pod spin-up) we currently hand-roll retry logic for.
  - External Payload Storage (Public Preview, Python/Go, S3 driver out of the box) is Temporal's own claim-check implementation. It validates the split we already do by hand (full session history to object storage, compact restart state to Postgres) and could replace the hand-rolled half of it.
  - Nexus (GA for the Python SDK, Public Preview for TypeScript/.NET) is the pattern to reach for if factoryd ever splits into more than one Temporal namespace, for example one per project: a typed, cancellable, durable async RPC across namespace boundaries instead of ad hoc cross-namespace activity code.
  - The AI cookbook's guardrail recipe (deterministic hard rules layered over an LLM verdict, with an auditable override) is close in shape to our own policy-gate-then-model-review pairing and is worth reading as a second implementation to check ours against.
  - activity_as_tool's rule of thumb, "anything that does I/O is an Activity, everything else runs in-process," is a clean litmus test for our own harness and gateway-tool code even without touching the SDK it comes from.
differs:
  - Every 2026 Temporal agent integration (OpenAI Agents SDK, Google ADK, Vercel AI SDK) puts the agent loop itself inside Temporal workflow and activity code, one Activity per model call and per I/O tool call. Our harness interface runs the coding agent (opencode, later Codex CLI) as an opaque external CLI subprocess we never rewrite. Copying Temporal's fine-grained pattern would trade "swap the harness binary" for "reimplement the agent loop against one specific SDK," a different worker plane, not an upgrade to the current one.
  - Worker Versioning's Pinned mode assumes a workflow finishes inside one deployment's lifetime; a long Pinned execution blocks that deployment from draining, which Temporal's own docs admit. Our task workflows can wait three days at zero cost for a human, so Pinned-by-default would fight our own workload shape; Auto-Upgrade avoids it but keeps exactly the patching discipline we already carry.
  - Self-hosted Temporal ships no RBAC and no audit logging; both are Temporal Cloud extras or a "build it yourself" line item on Temporal's own production checklist. That matches our principle of keeping policy and audit outside the workflow engine, so it costs us nothing, but it means Temporal itself will never become our policy or audit layer.
  - Several of the exact features this report was asked to focus on (Workflow Streams, External Payload Storage, Standalone Activities, Nexus for TypeScript/.NET, serverless Lambda workers) are Public Preview or Pre-release as of 2026-09-29, not GA. Adopting them now means tracking a moving API.
ux_verdict: Temporal ships no agent-facing UI. Its Web UI is a workflow-execution debugger, and even Workflow Streams, its newest AI-adjacent feature, is a plumbing primitive for someone else's console to consume, not a console itself.
slop_verdict: Real and used at large scale in production (OpenAI and Replit are named reference customers, 43 million open-source installs and 4,300 paying customers claimed in the Series E announcement); the MIT-licensed server core is untouched by the funding run-up, but several of the specific agent features asked about here are recent Public Preview or Pre-release additions riding a valuation that tripled in about seven months, not features proven at GA.
---

# Temporal

## 1. What it is

Temporal is an open-source durable execution platform: a server plus per-language SDKs that run application logic ("Workflows") in a way that survives crashes, retries failures automatically, and can wait for days or months at no compute cost. It is built by Temporal Technologies, a company founded in 2019 by the creators of Uber's Cadence, from which the server is a fork. It is already the durable execution engine our own design runs: `target-architecture.md` names Temporal as the plane that runs "the task lifecycle as workflow code," one workflow per task, with `factoryd` waiting on Temporal signals for human approval and enforcing heartbeat and wall-clock timeouts through it.

This report does not re-justify that choice. The brief is narrower: what has Temporal shipped for agent workloads specifically, in 2026, that we do not yet use. The company's own framing has shifted hard toward this: the September 2026 Series E announcement quotes CEO Samar Abbas on customers who "run agents that work for days, weeks, or months," and a secondary source claims OpenAI's internal usage of Temporal grew 60x in one year. What the code and docs show, independent of that framing, is a real, if partly unstable, set of features: an official SDK integration for the OpenAI Agents SDK (GA, March 2026), a parallel one for Google's ADK (announced May 2026), an official `ai-cookbook` repository of runnable recipes, and two core server mechanisms, Nexus and Worker Versioning, that both reached GA status in 2026 and are directly relevant to a long-running, versioned task workflow like ours.

## 2. Mapping to our five planes

| Plane / principle | What Temporal does | What we do | Verdict |
|---|---|---|---|
| Signals | None. No issue, alert or webhook intake of any kind. | Forgejo issues, PR comments, SigNoz alerts, factoryd intake API. | not comparable |
| Control plane | This is the whole product: durable workflow state, timers, signals, versioned deploys of workflow code. 2026 additions we do not use: Worker Versioning (GA), Workflow Streams (Public Preview), Standalone Activities (Public Preview), External Payload Storage (Public Preview). | `factoryd` runs one Temporal workflow per task today, versioned with manual `workflow.GetVersion` markers, no live stream out of the workflow itself. | they lead (on the specific 2026 features; we already use the base) |
| Worker plane | 2026 integrations (OpenAI Agents SDK, Google ADK, Vercel AI SDK) run the agent loop itself inside Temporal workflow and activity code. No sandboxing of its own; the OpenAI Agents SDK's own sandbox is merely wrapped for durability and session lifecycle. | gVisor pod per task, opencode headless behind a `Harness` interface, agent loop opaque to factoryd. | not comparable (different shape, see section 7) |
| Verification | None. No CI, gate or review concept. | Forgejo Actions, policy gates, reproduction gate, stronger-model review. | not comparable |
| Merge and deploy | None. | Bot-only merge after human approval, Flux staged rollout. | not comparable |
| Policy outside the model | None built in; self-hosted Temporal ships no RBAC and no audit logging (Temporal's own production checklist says so). | Capability rules as a Git-versioned YAML document, enforced in gateway code and network policy. | we lead |
| Identity per task | None. Cluster access uses mTLS or API keys, not per-task scoped credentials. | Projected, audience-scoped ServiceAccount token per task, verified by `factory-gateway`. | we lead |
| Artifacts not chat | Workflow history is itself a durable artifact trail (every state transition is an event), a genuine parallel to our principle, but Temporal has no concept of an agent exchanging a PR or a TaskBrief. | `TaskBrief` in, branch/PR/event stream out. | not comparable |

## 3. Architecture and stack

The server (`temporalio/temporal`, cloned to `~/repos/market-research-clones/temporal`) is Go, organised as `service/{frontend,history,matching,worker}` behind gRPC, `common/persistence` abstracting Cassandra, MySQL, PostgreSQL and SQLite, with Elasticsearch for visibility queries. Two 2026-era additions sit in the same tree and are directly relevant here.

`common/nexus/` and `service/history/hsm/nexusoperations/`, documented in `docs/architecture/nexus.md` (read in full). Nexus RPC is a cross-namespace and cross-cluster async-operation protocol: an `Operation` state machine (Scheduled, BackingOff, Started, Succeeded, Failed, Canceled, TimedOut) drives a `StartOperation`/`CancelOperation` exchange over HTTP, with a callback mechanism for async completion, all routed through a per-shard outbound queue with its own circuit breaker (`gobreaker`, trips after 5 consecutive `DestinationDownError`s). The doc is explicit that "Nexus shouldn't be used in multi cluster setups because replication for the registry is not implemented," which matches web docs saying Nexus is GA for the Python SDK but cross-region routing and the global endpoint registry stay Temporal Cloud or Public-Preview-on-self-host features.

`common/worker_versioning/`, backing Worker Versioning (GA per the May 2026 Replay announcement). Each running workflow is tagged Pinned or Auto-Upgrade. Pinned workflows stay on the Worker Deployment Version that started them for their whole life, needing no patch. Auto-Upgrade workflows move to their deployment's Current or Ramping Version and must stay replay-safe through patching, same as our current `workflow.GetVersion` markers.

A third 2026 addition not part of this report's brief but visible in the same repo is CHASM (`docs/architecture/chasm.md`, `chasm/lib/`), a lighter-weight state-machine framework alongside Workflow, aimed at cases too small or too high-volume for a full workflow (millions of signals, large payloads). It is the plumbing that Callbacks and Nexus operations are now built on.

The agent-specific pieces this report was asked about live outside the server repo entirely: `github.com/temporalio/ai-integrations` (the `OpenAIAgentsPlugin` for Python and TypeScript) and `github.com/temporalio/ai-cookbook` (96 stars, pushed 2026-09-29, structured as `foundations/`, `agents/`, `deep_research/`, `mcp/`). The plugin intercepts `Runner.run` so every model call becomes an Activity automatically; tool calls do not get this automatically. `activity_as_tool()` wraps a `@activity.defn` function as a durable tool; `@function_tool` code stays in-workflow and must be deterministic; hosted tools (web search, file search) run at the model provider during the model Activity; `nexus_operation_as_tool` routes a tool call through a Nexus Operation, which is how the two 2026 features connect. The Google ADK integration follows the same shape: LLM calls and tool executions become Activities so a crash resumes exactly where it left off.

## 4. UX

There is no agent-facing UX to describe. Temporal's own Web UI is a workflow-execution debugger (event history, pending activities, query results), useful to us already for our own task workflows, not something a factory operator or an end user would use to watch an agent work. The newest AI-relevant feature, Workflow Streams (Public Preview, built on Signal and Update), emits "token batches and application-level updates" for someone else's UI to render live; Temporal explicitly frames it as infrastructure, not a screen. The AI cookbook's recipes are developer quickstarts (clone, `uv` install, run a worker, run a workflow), not end-user onboarding. None of this competes with, or improves on, our own console's kanban board; it could reduce the work of building the live-stream part of it, which is the actual value here (see section 6).

## 5. Security, identity, sandbox, policy, cost

Credentials. Temporal itself holds no model-provider or git credentials; the OpenAI Agents SDK integration docs carry one explicit warning worth repeating: `UnixLocalSandboxClient` exposes the Worker process's own environment, including `OPENAI_API_KEY`, to the sandboxed agent, and the docs say to use it "only for local development with trusted prompts." That is a documented credential-in-reach risk for anyone tempted to use the sandbox integration in production, exactly the failure mode our own "identity belongs to the task, not the machine" principle exists to prevent.

Sandbox. Temporal does not build its own isolation. The 2026 "sandboxed agents" feature is the OpenAI Agents SDK's own sandbox (Public Preview, "pre-release and may change before general availability"); Temporal's contribution is durability and session lifecycle (session creation, each command, each read or write, PTY interaction and teardown, each modelled as a Temporal Activity), not the isolation boundary itself.

Policy. Self-hosted Temporal ships no RBAC and no audit logging out of the box; Temporal's own production-readiness checklist says to build both into your control plane if you need them. That is exactly what our design already does outside Temporal, in `factory-gateway` and Git-versioned policy, so this is a non-issue for us, not a gap.

Cost. No hard cap or hold mechanism of any kind. Temporal Cloud bills by "Actions" (roughly 50 USD per million, per its docs, with third-party sources quoting different numbers), which is a metering model, not a budget enforcement one. A per-task or per-day spend cap on model calls, like the one our gateway enforces with a database-locked hold, is not something Temporal provides at any layer.

## 6. What we should take from it

See `steal` in the front matter for the concrete list. The two with the clearest near-term payoff are Worker Versioning, which is a drop-in GA replacement for the manual `workflow.GetVersion` markers `target-architecture.md` already describes ("every workflow change sits behind a Temporal version marker"), and Workflow Streams, which is a first-party primitive aimed squarely at a gap we already named ourselves ("no real-time streams of the agent's work"). Both require no change to our five-plane shape, only to how we already talk to the Temporal we already run. Nexus is a broader, later bet: useful only once factoryd's single Temporal namespace stops being enough, for example if projects get their own namespace for blast-radius isolation.

## 7. Where our philosophy differs and what that costs or buys us

The one difference worth taking seriously is architectural, not incidental: Temporal's entire 2026 agent story assumes the agent loop is written against a Temporal SDK, with every model call and every I/O tool call as its own Activity. Our design deliberately keeps the agent loop opaque, inside an off-the-shelf CLI binary (opencode today, Codex CLI as the named successor) that factoryd starts, streams from, and kills, precisely so the harness can be swapped without touching factoryd. Adopting Temporal's fine-grained pattern would mean giving up that swappability in exchange for per-tool-call retry semantics and replay we do not currently have at that granularity; nothing in this research suggests our current tradeoff is wrong, only that it is a real tradeoff, and pursuing per-tool Temporal integration later would mean picking one agent SDK, not keeping a harness interface. Everything else Temporal does not have (policy, identity, audit, cost caps) is not a gap we should look to Temporal to fill either; our own principle already keeps those out of the workflow engine on purpose, and self-hosted Temporal's lack of built-in RBAC and audit logging confirms that keeping them outside was the right call, not an oversight to fix.

## 8. Red flags and slop assessment

No licence or open-core red flag: the server is MIT, the docs and a 2026 community-forum thread agree Temporal Cloud runs the identical server code, and workloads migrate either direction. The genuine caveat is maturity of the specific features this report was asked about: Workflow Streams, External Payload Storage, Standalone Activities, Nexus for TypeScript and .NET, and serverless Lambda workers are all Public Preview or Pre-release as of 2026-09-29, meaning their APIs can still change before GA. The OpenAI Agents SDK integration itself reached GA on 2026-03-23, so it is the most settled of the group. The company's valuation trajectory (5B USD in February 2026 to 12.55B USD in September 2026, a claimed 60x growth in OpenAI's usage) is a steep, hype-adjacent curve; nothing found here suggests the core product is not real and heavily used, but the pace of new, unstable, AI-labelled features shipping alongside that fundraising narrative is worth discounting slightly when picking which ones to depend on this year versus next.

## 9. Sources

Clone: ~/repos/market-research-clones/temporal (github.com/temporalio/temporal, depth 1, 2026-09-29)
  README.md, docs/architecture/nexus.md, docs/architecture/chasm.md, top-level layout (find -maxdepth 2), common/nexus/, common/worker_versioning/
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md (grep "temporal")
gh api repos/temporalio/temporal (2026-09-29)
gh api repos/temporalio/ai-cookbook (2026-09-29)
https://github.com/temporalio/ai-cookbook
https://docs.temporal.io/develop/python/integrations/openai-agents
https://temporal.io/blog/replay-2026-product-announcements
https://docs.temporal.io/production-deployment/worker-deployments/worker-versioning
https://temporal.io/blog/automated-worker-versioning-with-github-actions
https://temporal.io/blog/safe-deployments-with-temporal-worker-versioning-on-kubernetes
https://docs.temporal.io/ai-cookbook
https://docs.temporal.io/ai
https://temporal.io/solutions/ai
https://temporal.io/change-log/open-ai-agents-sdk-integration-pp
https://temporal.io/blog/announcing-openai-agents-sdk-integration
https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal
https://temporal.io/blog/temporal-raises-usd550m-series-e-at-usd12-55b-valuation-ai
https://www.geekwire.com/2026/temporal-ceo-samar-abbas-on-the-massive-platform-shift-in-ai-fueling-the-startups-5b-valuation/
https://www.425business.com/news/temporal-raises-300m-series-d-to-optimize-agentic-ai-for-companies/article_6a637b0a-861f-4e84-bdff-4567f4c45acb.html
WebSearch: Temporal OpenAI Agents SDK integration temporal plugin durable
WebSearch: Temporal worker versioning docs 2026 pinned auto-upgrade build id
WebSearch: Temporal AI cookbook durable agents patterns github
WebSearch: Temporal 2026 durable agents announcement long-running AI agents
WebSearch: Temporal Technologies founded Samar Abbas Maxim Fateev headquarters Series D 2026
WebSearch: Temporal Cloud vs self-hosted feature parity 2026 open source gating
