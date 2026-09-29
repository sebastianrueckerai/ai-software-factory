---
name: Vertex AI Agent Engine
slug: google-vertex-agent-engine
url: https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview
repo: none
category: enterprise-agent-platform
license: proprietary
open_source: no
self_hostable: no
hosting_model: Google Cloud managed SaaS only, billed per GCP project. No self-hosted or on-prem option for Runtime, Sessions, Memory Bank or Sandbox
company: Google LLC, subsidiary of Alphabet Inc, Mountain View. Vertex AI launched May 2021
maturity: Previewed 2024-04 as Reasoning Engine/LangChain on Vertex AI, renamed and GA with billing from 2025-03-04. Code Execution sandbox previewed 2025-09-10, GA 2026-02-18. Renamed again to Agent Runtime under the Gemini Enterprise Agent Platform around 2026-04-22, same underlying service. No repo of its own; the companion SDK most used to build for it, google/adk-python, has 21675 stars, created 2025-04-01, pushed 2026-09-29, Apache-2.0
similarity: 2
axes:
  signals_intake: 0
  control_plane: 2
  sandbox_isolation: 2
  verification: 1
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 1
  ux: 2
  reseedable_selfhost: 0
steal:
  - Sessions (short-term conversation state) split from Memory Bank (long-term memories generated from events by a model). Our design admits "no project memory, no codebase index" as a known gap; a memory bank fed by task findings across sessions is a concrete shape to copy.
  - Idle time is not billed, the compute clock stops between agent turns and usage rounds to the second. A cleaner metering unit than wall-clock time for our own gateway holds, which should track active sandbox work, not pod lifetime.
  - Sandbox templates, snapshots and bring-your-own-container images for warm reuse of a prepared execution environment. Relevant to our own pain point, gVisor cold start and the 38-second throwaway build VM path.
  - Evaluation Service plus Example Store as a standing offline-eval, simulation and online-monitor loop, feeding a "Feedback service" alongside telemetry. We admit no benchmark of agent success rate per model tier exists yet; this is a concrete shape for one.
  - Agent Gateway as a named, separate hop that routes all agent egress to MCP servers and VPC networks under one governed point. Confirms the factory-gateway pattern is converging industry practice, not a one-off choice.
differs:
  - There is no task, issue or PR concept anywhere in the product. Its unit of work is a live invocation or session against a deployed agent, not a signal that becomes a reviewed, merged, deployed change. It could at most replace pieces of our worker plane, never the control plane, signals plane or merge-and-deploy plane.
  - It is closed and bound to one GCP project with no self-hosted path for Runtime, Sessions, Memory Bank or Sandbox. Building any control-plane piece on it breaks our re-seedable and commodity-hardware constraints outright, there is no way to reconstruct it from Git and an offline seed bundle.
  - The default identity model is a shared Per-Project, Per-Product Service Agent (P4SA), not a per-task credential. Unit 42's March 2026 "Double Agents" research showed any code running inside a deployed agent's execution context could read the P4SA token off the metadata service and use it to read every Cloud Storage bucket in the project, and even reach Google-internal container registries. That is the direct opposite of "identity belongs to the task, not the machine." Google's fix, Bring Your Own Service Account and an opt-in Agent Identity, is per-agent-deployment, still not per-task.
  - Model routing is Gemini-first, Model Garden favours Google's own models with a few open-weight additions bolted on, unlike our tiered, vendor-independent ladder behind LiteLLM. Building here buys deep GCP integration, BigQuery, Workspace, IAM, at the cost of the model independence and cross-provider cost arbitrage our design treats as a first principle.
ux_verdict: A five-step SDK or CLI quickstart (adk deploy, or client.agent_engines.create) reaches a traced, running agent faster than our console's time to first result, and Cloud Trace call-chain tracing is reported clearer than competing clouds, but G2-sourced reviews describe days lost to service accounts and IAM roles, and there is no kanban-style view of running work to watch or intervene in.
slop_verdict: Real, metered, billed production infrastructure since March 2025 with a steady GA cadence through 2026, but the pricing structure has changed at least three times in a year, the product has been renamed twice (Reasoning Engine to Agent Engine to Agent Runtime), and a March 2026 Unit 42 disclosure showed the default identity model handed any compromised agent read access to the whole GCP project and to Google's own internal container images.
---

# Vertex AI Agent Engine

## 1. What it is

Vertex AI Agent Engine is Google Cloud's managed runtime for deploying, running and scaling agentic applications, most commonly ones built with Google's Agent Development Kit (ADK) but also LangChain, LangGraph, AG2, LlamaIndex or a custom Python class. Google frames it as taking "testing, release management, and reliability" off a team's hands so they can focus on agent logic, sold as consumption-based Google Cloud billing (vCPU-hours, GiB-hours, per-operation charges) layered on top of ordinary Gemini token pricing. It targets teams already on GCP who want a production home for an agent without building their own container orchestration, session store and observability stack. Around Cloud Next in April 2026 Google folded Vertex AI and Agent Engine into a renamed "Gemini Enterprise Agent Platform," where Agent Engine became "Agent Runtime" with no change to the underlying service, both names still appear across docs and billing. The docs describe a broad, well-organised set of managed primitives; independent security research shows the default configuration of those primitives was materially weaker than the documentation implied.

## 2. Mapping to our five planes

| Plane or principle | What Agent Engine does | What we do | Verdict |
|---|---|---|---|
| Signals | None. An agent is invoked by direct API call from the customer's own application, no issue, alert or webhook intake | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API, every task is a Forgejo issue | we lead |
| Control plane | Sessions (short-term state) and Memory Bank (long-term, model-generated memories) plus Runtime revisions and traffic splitting, but no task registry, no approval workflow | `factoryd` with a Temporal workflow per task, Postgres, policy as a YAML file in Git | equal to we lead |
| Worker plane | One sandbox per Code Execution call, GA since 2026-02-18, with templates, snapshots and custom containers, isolation mechanism undocumented | One gVisor pod per task, ServiceAccount, default-deny egress to an explicit allowlist | not comparable |
| Verification | Evaluation Service (offline evals, simulation, online monitors) and Example Store, aimed at agent response quality, not code review before merge | Forgejo Actions, deterministic policy gates, then a stronger-model review with a strict verdict | we lead |
| Merge and deploy | None, there is nothing to merge, an agent is a long-running service, not a change that lands in a repository | Bot merge after approval or an auto rule, Flux deploy, staged rollout with an alert-free soak | not comparable |
| Policy outside the model | IAM Conditions on Sessions and Memory Bank, VPC Service Controls, Agent Gateway routing, Semantic Governance Policies (billing pending late 2026), all code-enforced, but the default P4SA was over-permissioned | Capability rules are a Git-versioned document enforced in gateway code and network policy | equal, weakened by the P4SA default |
| Identity per task | A shared per-project, per-product service agent by default, readable from inside the agent's own execution context via the metadata service; an opt-in Agent Identity and Bring Your Own Service Account exist but are per-agent, not per-task | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | A session is a stored record of user-agent turns, resumable within the session | `TaskBrief` in, a branch, a PR and a normalised event stream out | not comparable |

## 3. Architecture and stack

Agent Engine is closed. A developer writes an agent in Python (an ADK `Agent`, a `LangchainAgent`, or any class exposing a query method), wraps it, and calls `vertexai.Client(...).agent_engines.create(agent=app, config={...})` or the ADK CLI's `adk deploy agent_engine`. Deployment stages the bundle through a Cloud Storage bucket, builds a container server-side and creates a `reasoningEngine` resource (the API's internal name survives the two renames). A deployed `AdkApp` automatically gets a `VertexAiSessionService` for persistent session state, replacing the in-memory session store used for local testing. Observability is built on Cloud Trace, Cloud Logging and custom metrics/alerts, not on anything we could adopt directly. Code Execution/Sandbox is described only as "a secure, isolated, and managed sandbox environment," the docs never name the isolation technology (no mention of gVisor or a microVM). Egress from a deployed agent goes through a Private Service Connect interface into the customer's VPC or through "Agent Gateway" to Google or external MCP servers.

## 4. UX

Zero to a first running agent is the official ADK quickstart's five steps: enable APIs and create a staging bucket, install the Vertex AI SDK and ADK, write an `Agent` with one tool, deploy with one `agent_engines.create` call or `adk deploy agent_engine`, then query the deployed endpoint. That is comparable in step count to our own console but ends in an API endpoint, not a UI. There is no dashboard for watching several agents at once, an operator uses Cloud Trace and Cloud Logging, and one independent reviewer specifically praised Agent Engine's call-chain tracing as clearer for diagnosing anomalous behaviour than the equivalent on AWS or Azure. Against that, a BetterClaw review drawing on G2 complaints describes a typical setup burning three days on service accounts, IAM roles and API enablement before an agent could read the resources it needed. There is no equivalent of our kanban board, human lane or approval workflow, because Agent Engine has no task concept to render one for; human oversight is whatever the customer's own calling application chooses to build.

## 5. Security, identity, sandbox, policy, cost

Identity defaults to a Per-Project, Per-Product Service Agent (P4SA), a single Google-managed service account shared across an agent product in a project. Unit 42's "Double Agents" research (published 2026-03-31) showed this token, plus project ID, agent identity and OAuth scopes, is fetchable from the metadata service by any code executing inside the agent, including code reached through prompt injection or a compromised tool, with no alert raised. The stolen token gave unrestricted read access to every Cloud Storage bucket in the project and, separately, to Google-owned Artifact Registry images underpinning the Reasoning Engine container itself. Google's fix is Bring Your Own Service Account plus an opt-in Agent Identity, both scoped per agent deployment, not per invocation or task. Sandbox isolation for Code Execution is asserted, not documented, network egress is governed by VPC Service Controls and routing through Agent Gateway rather than a stated default-deny posture. Policy that is genuinely code-enforced exists, IAM Conditions on Sessions and Memory Bank, VPC-SC, and Semantic Governance Policies, whose own billing had not started as of this report. Cost has no documented pre-call hold or per-task spend cap, it is pure metered billing (vCPU-hours, GiB-hours, per-operation charges for writes and gateway calls) left to Cloud Billing budgets and alerts after the fact, the same gap the AgentCore report found on AWS.

## 6. What we should take from it

The Sessions/Memory Bank split is the most directly reusable idea: short-term conversation state kept separate from a long-term store whose entries are generated by a model reading raw events. Our own admitted gap, no project memory beyond findings passed to the next session of the same task, could take this shape without adopting any GCP infrastructure, a small memory service the harness queries and writes to. The billing detail that idle time between turns is free and metering rounds to the second is a good precedent for our own gateway holds, which should track active sandbox compute, not pod uptime. Sandbox templates, snapshots and BYOC images address a cold-start problem we already have with gVisor and our throwaway build VM, worth a look when that becomes a bottleneck again. The Evaluation Service and Example Store, an offline-eval and simulation loop feeding back from a Feedback service, is a template for the benchmark and regression suite we admit does not exist yet for our harness prompt.

## 7. Where our philosophy differs and what that costs or buys us

Agent Engine is a worker-plane product wearing a platform's clothes. It has no signals plane, no task registry, no approval workflow and no merge-and-deploy step, because its unit of work is a live invocation, not an issue that becomes a shipped change. Building on it would only ever replace a slice of our worker plane, never the loop as a whole, and even that slice is locked to one cloud with no self-hosted path, which our commodity-hardware and re-seedable constraints rule out regardless of its features. The P4SA default is the sharper lesson: a shared, broadly-scoped identity reachable from inside the very execution context it is meant to secure is precisely the half measure our identity-per-task principle exists to prevent, and it took an outside security team, not the vendor, to surface it publicly.

## 8. Red flags and slop assessment

The product is real and billed in production since 2025-03-04, with a steady stream of GA milestones through 2026 (Sessions and Memory Bank GA 2025-12-17, Code Execution GA 2026-02-18). Against that, the pricing model changed structure at least three times within a year (per-1,000-events to per-write-operation for memory, a roughly three-orders-of-magnitude repricing by one blogger's account), and the product carries two renames in its short life, LangChain on Vertex AI to Agent Engine to Agent Runtime under the Gemini Enterprise Agent Platform, with both old and new names live in docs and billing simultaneously. The Unit 42 "Double Agents" disclosure and a separate June 2026 SDK bucket-squatting flaw (the second such bug in Vertex AI that year, after CVE-2026-2473 in February) are not marketing-adjacent nitpicks, they are concrete breaks of the isolation the product's own documentation implies. Independent third-party reviews (BetterClaw, Engini) are consistent that setup and billing predictability are real friction, not just isolated complaints.

## 9. Sources

https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview, redirects to docs.cloud.google.com, fetched 2026-09-29
https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview, fetched 2026-09-29
https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/sessions/overview, fetched 2026-09-29
https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/sandbox/overview, fetched 2026-09-29
https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/set-up, fetched 2026-09-29
https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/set-up/agent-identity, fetched 2026-09-29
https://cloud.google.com/vertex-ai/generative-ai/pricing, fetched 2026-09-29, content truncated by fetch tool
https://unit42.paloaltonetworks.com/double-agents-vertex-ai/, WebSearch summary, 2026-09-29
WebSearch, 2026-09-29, "Vertex AI Agent Engine 2026 review reddit hacker news"
WebSearch, 2026-09-29, "Vertex AI Agent Engine vs Bedrock AgentCore comparison 2026"
WebSearch, 2026-09-29, "Vertex AI Agent Engine general availability date 2025 launch history preview"
WebSearch, 2026-09-29, "Vertex AI Agent Engine deploy agent quickstart steps ADK reasoning engine"
WebSearch, 2026-09-29, ""Agent Engine" OR "Agent Runtime" Vertex AI pricing vCPU-hour sessions memory bank 2026 official"
gh api repos/google/adk-python, 2026-09-29
