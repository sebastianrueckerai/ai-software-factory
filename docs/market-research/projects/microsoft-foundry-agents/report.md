---
name: Microsoft Foundry Agent Service, Agent Framework, Agent 365
slug: microsoft-foundry-agents
url: https://azure.microsoft.com/en-us/products/ai-foundry
repo: https://github.com/microsoft/agent-framework
category: enterprise-agent-platform
license: "mixed: Agent Framework SDK MIT, Foundry Agent Service and Agent 365 proprietary Azure services"
open_source: partial
self_hostable: partial
hosting_model: Agent Framework SDK runs anywhere; Foundry Agent Service and Agent 365 are Azure-only PaaS, no self-host option
company: Microsoft Corporation, public company, founded 1975, HQ Redmond WA
maturity: 13,861 stars, 2,394 forks, 273+ contributors, created 2025-04-28, last commit 2026-09-29, weekly point releases (dotnet-1.22.0 and python-1.19.0 both 2026-09-18)
similarity: 2
axes:
  signals_intake: 0
  control_plane: 2
  sandbox_isolation: 4
  verification: 1
  policy_outside_model: 3
  identity_per_task: 4
  cost_control: 1
  ux: 4
  reseedable_selfhost: 0
steal:
  - "FIDES (docs/decisions/0024-prompt-injection-defense.md, python/packages/core/agent_framework/security.py): deterministic label-based IFC middleware, IntegrityLabel TRUSTED/UNTRUSTED and ConfidentialityLabel PUBLIC/PRIVATE/USER_IDENTITY, most-restrictive-wins composition, quarantined_llm for isolated processing of untrusted tool output. Directly applicable to how we mark issue and PR comment text as untrusted."
  - "Toolbox pattern (Foundry docs, concepts/toolbox-overview): curate MCP tools once, expose behind one managed, versioned, centrally authenticated endpoint consumed by every agent. Close to what factory-gateway should be for MCP tool calls instead of per-task ad hoc wiring."
  - "On-Behalf-Of token passthrough from a per-agent Entra identity to remote MCP servers, so a tool call carries the calling user's own scoped grant rather than a shared service credential. Worth comparing against our per-task ServiceAccount-to-gateway mapping."
  - "Built-in agent versioning with automatic snapshotting and one-click rollback for prompt agent definitions. A cheap default our console lacks for TaskBrief or policy edits."
  - "Lightweight ADR log (docs/decisions, adr-short-template.md) for every non-trivial design change, including ones that get superseded a month later. Cheap discipline, easy to copy for our own ledger."
  - "MCP ToolAnnotations hint mapping (readOnlyHint, openWorldHint) to auto-label tool trust and a server _meta.ifc metadata convention for per-result security labels, an emerging convention worth watching if we grow our own MCP surface."
differs:
  - "The whole platform is a proprietary Azure PaaS control plane. Copying the control-plane shape would mean giving up commodity hardware and re-seedability outright; there is no path to run Foundry Agent Service or Agent 365 outside Azure."
  - "Identity is per-agent, not per-task: a dedicated Entra identity is created once for an agent and rotated over its lifetime (Agent 365's create/rotate/decommission lifecycle), closer to a durable service account than our disposable, task-scoped, kubelet-rotated token. Their model suits a long-lived digital worker; ours suits a disposable one-shot job."
  - "Durable execution is delegated to a separate Azure Durable Functions extension repository, not built into the framework or the hosted runtime. It is a real answer to durability, but it ties you to Azure Functions the way we tie ourselves to Temporal, so it is not a reason to add a dependency, only a data point that others also factor this out."
  - "There is no notion of a task born from an issue with a PR and a merge gate at the end. Foundry publishes an agent version to a stable endpoint; it does not turn a bug report into a reviewed, merged, deployed change. The whole verification-before-merge loop we care about does not exist here."
ux_verdict: Portal-first onboarding (create in ai.azure.com, test in a playground, call from code) is faster to a first result than our console, but it is onboarding into an Azure subscription, not a self-hosted product.
slop_verdict: Real and heavily used. MIT-licensed SDK with weekly releases and hundreds of contributors, but it is the third Microsoft agent framework in three years (Semantic Kernel and AutoGen both now in maintenance mode) and the hosted protocol has already had one breaking rework (AgentServer 1.0 to 2.0) in months, so today's integration code is not guaranteed to survive the next one.
---

# Microsoft Foundry Agent Service, Agent Framework, Agent 365

## 1. What it is

Three things sold as one story. Microsoft Agent Framework (MAF) is an open-source, MIT-licensed SDK (Python, .NET, a separate Go repo) for building and orchestrating agents and multi-agent workflows; it is the announced successor to both Semantic Kernel and AutoGen, which Microsoft now keeps in maintenance mode only. Foundry Agent Service is the proprietary Azure PaaS that hosts agents built with MAF, LangGraph, the OpenAI Agents SDK or your own code, giving them a managed endpoint, autoscale, tracing and a dedicated Entra identity. Agent 365 is a further paid add-on ($15/user/month, part of Microsoft 365 E7, GA 2026-05-01) that layers an agent registry, Entra-based identity lifecycle and cross-cloud discovery (AWS Bedrock, Google Cloud) on top.

Microsoft's claim is "production-grade agents ... governed end to end." What the repository actually shows is a fast-moving, well-engineered agent SDK with a serious internal security research thread (FIDES) and an ADR trail that documents real trade-offs, not marketing copy. What the docs site shows for the hosted pieces is consumption pricing with no published numbers, and enterprise features (private networking, RBAC, content filters) gated behind an Azure subscription.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. Agents are invoked via portal, SDK call or Responses API; no issue or alert intake turns into a task | Forgejo webhooks, SigNoz alerts, factoryd intake API; every task is a Forgejo issue | not comparable |
| Control plane | Agent versioning, publishing to a stable endpoint, Entra Agent Registry, Agent Optimizer; no task registry or approval workflow | Temporal workflow per task, Postgres task state, policy as YAML in Git, approvals as workflow state | we lead |
| Worker plane | Hosted agents: Foundry-managed container per agent, each session in a VM-isolated sandbox, BYO VNet | gVisor pod per task, namespace and ServiceAccount per task, default-deny egress | they lead (VM isolation beats gVisor; but only for hosted agents, prompt agents run in undisclosed multi-tenant infra) |
| Verification | Built-in evaluators (coherence, relevance, groundedness, safety) and tracing, no code-merge gate | Forgejo CI, policy gates, reproduction at base and head, stronger-model review before merge | not comparable |
| Merge and deploy | Version snapshot and rollback of an agent definition, publish to Teams/Copilot/A2A channels | Ordinary PR merge by bot after approval or auto rule, Flux GitOps, staged rollout with alert wait | not comparable |
| Policy outside model | FIDES label middleware inside the agent process (code-enforced, deterministic) plus Entra RBAC and content filters at the platform layer | Capability rules as a Git document enforced by gateway code and network policy, outside the agent's own process entirely | equal, different locus: FIDES gives finer content-flow control but lives in the agent's own code path; ours cannot be skipped by the agent regardless of what it runs |
| Identity per task | Dedicated Entra identity per agent (not per task), rotated over the agent's life, OBO token passthrough to tools | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, mapped by factory-gateway to the task row | equal, opposite lifetimes: theirs is a durable identity for a durable worker, ours is a disposable one for a disposable job |
| Artifacts not chat | Workflow graphs pass typed messages between nodes with checkpointing; prompt agents run on conversation threads (chat history) | TaskBrief in, branch/PR/event stream out, no chat history as the unit of exchange | we lead |

## 3. Architecture and stack

Agent Framework: Python (`agent_framework` on PyPI) and .NET (`Microsoft.Agents.AI` on NuGet), a separate Go SDK. Repository layout: `python/packages/` holds ~35 provider and integration packages (openai, anthropic, gemini, bedrock, azure-ai-search, redis, postgres, mongodb, a2a, ag-ui, mcp-adjacent `tools`, `devui`, `hosting*`), `dotnet/src` the .NET equivalent, `declarative-agents/` for YAML-defined agents, `docs/decisions/` an ADR log (40+ entries), `docs/features/durable-agents/` now just a pointer to the separate `agent-framework-durable-extension` repo for Azure Durable Functions integration. Middleware pipeline for tool calls; OpenTelemetry throughout for tracing. Workflows support checkpointing, streaming, human-in-the-loop and "time travel" (replay).

Foundry Agent Service (proprietary, from docs.microsoft.com): an "Agent Runtime" hosts three agent types (prompt agents, voice-based prompt agents, hosted agents). Hosted agents ship as a container or a zip Foundry builds into one; each gets automatic scaling, a managed endpoint and a dedicated Entra identity. State can live in bring-your-own Azure Cosmos DB, Azure AI Search or storage. Toolboxes group tools (web search, code interpreter, file search, custom MCP, 1,400+ Logic Apps connectors) behind one governed MCP endpoint. Billing is consumption-based per call plus container compute; no published unit prices.

Agent 365 (proprietary): Entra Agent ID as the identity anchor, an agent registry with lifecycle rules (create, rotate, decommission), policy templates for least privilege, risk-adaptive access tied to Entra/Defender/Purview signals, and registry sync previews for AWS Bedrock and Google Cloud agents.

## 4. UX

Fastest path to a first result is the "prompt agent": open ai.azure.com, configure instructions, model and tools in the portal, test in a playground, no code. A "hosted agent" (the MAF-code path) needs an Azure subscription, a Foundry project endpoint and `az login`, then the README's ten-line Python or C# snippet runs one call. DevUI gives a local interactive debugger for agent development outside the portal. Tracing, evaluation scores and a rollback-capable version history are all first-class in the portal, which is more than our console offers today (no diff view, no realtime stream, no replay). What is worse than ours: everything is gated behind an Azure subscription and its billing, there is no equivalent of a single self-hosted binary, and the security/governance features (Agent 365) are a further paid add-on on top of the platform itself.

## 5. Security, identity, sandbox, policy, cost

Identity: every hosted agent gets its own Entra identity automatically; Agent 365 adds a registry with explicit create/rotate/decommission lifecycle and risk-adaptive access from live Entra/Defender signals. Credentials for tool calls can flow through OAuth On-Behalf-Of from that identity rather than a shared key.

Sandbox: hosted agent sessions run in "VM-isolated" containers, optionally inside a customer-owned VNet (BYO VNet). Prompt agents run in Foundry's own multi-tenant infrastructure with no isolation detail published; private networking is documented as available for prompt agents but the isolation boundary there is not specified (not verified).

Policy: FIDES is real code, not a slide: `python/packages/core/agent_framework/security.py` (~2,950 lines) implements label types, two middleware classes, a `ContentVariableStore` for physical indirection of untrusted content, and quarantine tools, all opt-in per agent. On the platform side, content filters and RBAC are enforced by Azure infrastructure, not by the model. Both are real enforcement outside the model, but FIDES only fires if the agent author wires it in; nothing forces every agent through it the way our gateway forces every task through capability checks.

Cost: consumption billing with no caps, holds or per-task budgets documented anywhere in the docs read for this report. Azure's general cost-alert tooling exists but nothing agent-specific was found (not verified beyond the docs pages fetched).

## 6. What we should take from it

Narrow: FIDES's label taxonomy and its variable-indirection trick (store untrusted tool output as a reference the model never sees raw) is a concrete pattern we could adapt at the harness or gateway boundary for issue and PR-comment text, which our own vision already treats as untrusted but without a matching mechanical enforcement. The toolbox concept (one governed, versioned MCP endpoint per capability set) is close to what factory-gateway's MCP proxying should grow into. Agent-definition versioning with one-click rollback is a cheap console feature we do not have for policy or TaskBrief templates.

Broad: Microsoft is betting that agent identity belongs to Entra as a durable, registered principal with a lifecycle, the opposite of our "identity belongs to the task" principle. Watching how Agent 365's registry and risk-adaptive access play out is useful even though we would not adopt the durable-identity model: it tells us what an enterprise buyer will expect a governance story to look like, which matters for the portfolio-project framing of our own design.

## 7. Where our philosophy differs and what that costs or buys us

Adopting the Foundry Agent Service model wholesale would break two of our four constraints outright: commodity hardware and open self-hosting, since the service only runs on Azure, and re-seedability, since there is nothing to re-seed, only an Azure tenant to reconfigure. Their per-agent durable identity is arguably a better fit for a fleet of long-lived customer-facing agents than our per-task ephemeral identity; the price we pay for the ephemeral model is more machinery per task (a fresh ServiceAccount token, a fresh sandbox), and the price they pay for durable identity is a bigger blast radius if one agent's credential is misused, which is exactly the problem Agent 365's rotation and risk-adaptive access exist to manage after the fact rather than by construction.

## 8. Red flags and slop assessment

The hosted protocol broke once already: ADR-0026 (`ResponseContext.Isolation`, June 2026) was superseded five days later in the same file set by ADR-0030 when `Azure.AI.AgentServer.*` went to 2.0 and removed the header contract it depended on. That is normal for a fast-moving platform but means code written against the hosting layer today is not guaranteed stable. Semantic Kernel and AutoGen, the two frameworks MAF replaces, are both now maintenance-only after years as Microsoft's recommended path, which sets a precedent for MAF's own lifespan. Marketing outruns the docs in the usual way: "enterprise-grade trust built in" and "80,000 enterprises" claims sit next to a pricing page with no published unit costs and an isolation model for prompt agents that is not documented. None of this reads as a thin or abandoned project: 13,861 stars, 2,394 forks, 273+ contributors, weekly point releases, an active Discord and a real internal security research output (FIDES) are all present and current as of 2026-09-29.

## 9. Sources

- Clone at ~/repos/market-research-clones/microsoft-foundry-agents (microsoft/agent-framework, depth 1)
- README.md
- docs/decisions/ (0024-prompt-injection-defense.md, 0026-hosted-session-identity-context.md, 0030-hosted-platform-context-agentserver-2.0.md, 0031-hosted-per-user-session-storage-isolation.md, adr-short-template.md, full index)
- docs/features/FIDES_IMPLEMENTATION_SUMMARY.md
- docs/features/durable-agents/README.md
- python/packages/ (directory listing, ~35 packages)
- git log -1 on the clone, 2026-09-29
- https://api.github.com/repos/microsoft/agent-framework (stars/license/dates/contributors/releases), fetched 2026-09-29
- https://azure.microsoft.com/en-us/products/ai-foundry, fetched 2026-09-29
- https://learn.microsoft.com/en-us/azure/ai-foundry/agents/overview, fetched 2026-09-29
- https://www.microsoft.com/en-us/microsoft-agent-365, referenced via search, 2026-09-29
- https://www.microsoft.com/en-us/security/blog/2026/05/01/microsoft-agent-365-now-generally-available-expands-capabilities-and-integrations/, 2026-05-01
- https://entro.security/blog/microsoft-agent-365-pushes-ai-identity-forward-but-enterprise-agents-still-need-cross-environment-governance/, referenced via search, 2026-09-29
- https://futurumgroup.com/insights/microsoft-agent-365-turns-shadow-ai-into-a-governed-asset-class/, referenced via search, 2026-09-29
- https://www.paulswider.com/p/microsofts-agent-framework-evolution, referenced via search, 2026-09-29
- https://drel.ai/blog/microsoft-agent-framework-security-review, referenced via search, 2026-09-29
- https://visualstudiomagazine.com/articles/2025/10/01/semantic-kernel-autogen--open-source-microsoft-agent-framework.aspx, referenced via search, 2026-09-29
