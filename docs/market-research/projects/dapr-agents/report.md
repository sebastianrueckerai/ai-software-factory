---
name: Dapr Agents
slug: dapr-agents
url: https://dapr.github.io/dapr-agents/
repo: https://github.com/dapr/dapr-agents
category: kubernetes-agents
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, a Python library you deploy on your own Kubernetes plus the Dapr control plane; no hosted SaaS
company: CNCF project under the Dapr umbrella (Linux Foundation), no separate company or funding; built with NVIDIA collaboration; Dapr Agents sub-project started 2025-01-02
maturity: 752 stars, 142 forks, 36 contributors, created 2025-01-02, last commit 2026-09-28, v1.0 GA announced March 2026 at KubeCon EU, monthly point releases since (latest v1.0.6, 2026-09-28)
similarity: 1
axes:
  signals_intake: 0
  control_plane: 2
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 0
  ux: 1
  reseedable_selfhost: 2
steal:
  - "The Hooks vocabulary (Deny, RequireApproval, Mutate, Skip, Proceed) in dapr_agents/hooks.py is a small, closed decision set for gating a tool or LLM call; worth copying the shape for our own before/after Harness hooks."
  - "AgentApprovalConfig.default_timeout_seconds auto-denies a stuck human approval instead of hanging forever, a good default for our own approval-as-workflow-state wait."
  - "MCPServer auto-discovery (agent queries the Dapr sidecar's metadata API for loaded MCPServer resources and lists tools with zero tools= wiring) removes per-agent boilerplate we still hand-write."
  - "The per-agent GET/POST /hitl/approvals REST pair (dapr_agents/workflow/runners/agent.py, _mount_hitl_routes) is a minimal fallback approval surface worth having even where a console exists, for scripts and CI."
  - "dapr_agents/observability/wrappers/* wraps every workflow, activity, tool and LLM call in an OTel span; a ready checklist of what to instrument in our own harness."
differs:
  - "No sandbox: tools and MCP calls run in the same long-lived process as the agent, not in a disposable per-task container. Incompatible with our default-deny-egress, one-sandbox-per-task worker plane."
  - "Identity is Dapr mTLS plus declarative component scopes, granted to a whole running app deployment, not minted per task. A compromised agent process can reach everything its app-id is scoped to for the deployment's lifetime."
  - "Policy is Python code (the Hooks) shipped inside the same repository as the agent, not a separately governed, GitOps-applied document. A single PR can change both the agent and its own guardrails."
  - "No cost control anywhere: no budgets, spend holds or a cost ledger. Dapr's resiliency policies (retry, circuit breaker, timeout) are about reliability, not spend."
ux_verdict: No UI beyond a raw HITL REST endpoint and generic OTel traces; watching or approving a run means writing a client or curling the sidecar yourself.
slop_verdict: Real and maintained, not a landing page. v1.0 GA in March 2026, monthly point releases, a DCO- and lint-gated CI, and named production users.
---

# Dapr Agents

## 1. What it is
Dapr Agents is a Python framework for building "durable" AI agents and multi-agent systems on top of Dapr, the CNCF-graduated distributed-application runtime. It is a library, not a hosted product: `uv add dapr-agents`, run `dapr init`, write a Python `DurableAgent`, and it rides Dapr's workflow engine (virtual actors under the hood) for state, retries and pub/sub between agents. It reached v1.0 general availability in March 2026 at KubeCon EU, a joint effort between the Dapr community and NVIDIA.

The makers claim production reliability: agents survive crashes and node loss, scale to zero at double-digit-millisecond wake latency, and coordinate securely over Dapr's messaging. The repository backs this up with a real durable-workflow implementation (`dapr_agents/agents/durable.py`, 4,360 lines) rather than a thin wrapper. What it does not claim, and does not have, is any of the issue-intake, sandboxing, verification or cost-control machinery of a software factory: it is infrastructure for one agent process, not a pipeline from signal to deploy.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Generic pub/sub message routing (`message_router`, `TriggerAction`); no built-in issue, alert or telemetry intake | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | Dapr-workflow-backed task state per agent instance, an `AgentRegistryConfig` for multi-agent discovery, retry policy | `factoryd` with a Temporal workflow per task, Postgres, policy in Git | they lead on low-level durability primitives, we lead on fleet-wide scheduling and audit |
| Worker plane | Tools and MCP calls run in-process inside the agent's own long-lived pod, no per-task isolation | gVisor pod per task, read-only root FS, default-deny egress | we lead |
| Verification | None | Forgejo Actions, policy gates, stronger-model review | we lead |
| Merge and deploy | None; out of scope for the framework | Bot merge after approval, Flux GitOps | we lead |
| Policy outside the model | `Hooks` (Deny/RequireApproval/Mutate) run in the deterministic workflow body, so the model cannot override a Deny | Capability YAML in Git, enforced in gateway and network policy | equal in spirit, we lead on separation of policy from the agent's own repo |
| Identity per task | Dapr mTLS and component "scopes" per app-id, granted once per deployment | Projected ServiceAccount token per task, verified by factory-gateway | we lead |
| Artifacts not chat | Agents exchange pub/sub messages and shared workflow state, not raw chat transcripts | Git branch, PR, TaskBrief, event stream | equal in spirit |

## 3. Architecture and stack
Python >=3.11, built on `dapr`, `dapr-ext-workflow`, `dapr-ext-fastapi`, pydantic, and `litellm` alongside direct `openai`/`anthropic`/`mistralai` SDKs for model calls (`pyproject.toml`). Core layout: `dapr_agents/agents/base.py` (`AgentBase`, 2,212 lines, wires Dapr state store, memory, LLM client) and `dapr_agents/agents/durable.py` (`DurableAgent`, the workflow-backed agent with hooks, human-in-the-loop and MCP auto-discovery). `dapr_agents/workflow/runners/agent.py` runs the FastAPI host and mounts the `/hitl/approvals` routes. `dapr_agents/tool/mcp` and `dapr_agents/tool/workflow` wrap MCP and local tools as workflow-safe child calls. `dapr_agents/memory` offers `ConversationDaprStateMemory` (backed by any of Dapr's 30+ state store components) or an in-process list. `dapr_agents/observability/wrappers/*` instruments workflow, activity, tool and LLM calls with OpenTelemetry.

Deployment is hand-rolled: `examples/04-multi-agent-workflow-k8s` ships per-agent Dockerfiles and raw Kubernetes Deployment/Service manifests plus Dapr Component YAML (`pubsub.yaml`, `agentstate.yaml`, `agentregistrystore.yaml`, `memorystore.yaml`). The project ships no Helm chart or operator of its own; "Kubernetes-native" means "runs well next to a Dapr sidecar", relying on Dapr's own control plane (operator, placement, sidecar injector) which is installed separately. Model access is whatever the agent process's own environment holds (API keys via env vars or a Dapr secret store); there is no gateway or budget layer in this repository.

## 4. UX
There is no web console. Starting an agent is four steps from the README: `dapr init`, `uv init`, `uv add dapr-agents`, write and run a Python script (`dapr run -- python app.py`). Watching a run means reading OTel traces sent to whatever backend you configured (nothing bundled) or Dapr's generic workflow status API. Intervening happens through the `Hooks` mechanism: a `before_tool_call` or `before_llm_call` hook returns `RequireApproval`, which suspends the workflow on `wait_for_external_event` racing a timer; a human resolves it by polling `GET /hitl/approvals` and posting to `POST /hitl/approvals/{id}/respond`, or by calling the Dapr sidecar's `raiseEvent` API directly. No screenshots or demo video of a UI exist because none ships; this is strictly a CLI-and-code experience, weaker than our console even in its unfinished state, since we at least have a kanban board and a human lane.

## 5. Security, identity, sandbox, policy, cost
**Identity**: Dapr's mTLS between sidecars, scoped by app-id, plus declarative component "scopes" (which app-ids may use which state store or pub/sub) configured once in YAML. This authorises a whole running deployment for its lifetime, not a single task.
**Sandbox**: none. Tool functions and MCP calls execute inside the same OS process as the agent; the only boundary is whatever an external MCP server enforces.
**Policy**: the `Hooks` dataclasses (`dapr_agents/hooks.py`) run in the deterministic workflow body, so a `Deny` cannot be talked around by the model, but the hooks are Python the agent author writes and ships in the agent's own repository, not a document a separate policy engine enforces.
**Cost**: absent. No budget, spend hold or cost ledger anywhere in the codebase or docs; Dapr's resiliency policies cover retries and circuit breakers, not spend.

## 6. What we should take from it
Narrow: the `Hooks` decision vocabulary (`Deny`, `RequireApproval`, `Mutate`, `Skip`, `Proceed`, each a small dataclass with a reason field) is a clean shape to reuse for whatever governs tool calls inside our own Harness interface. The `default_timeout_seconds` auto-deny on a stuck approval is a good default for our own approval wait. MCPServer auto-discovery (querying the sidecar's metadata API instead of hand-wiring `tools=`) is worth copying wherever we bolt MCP tools onto a harness. The OTel wrapper layout (`observability/wrappers/{workflow,workflow_task,llm,tool}.py`) is a ready checklist of spans worth having in our own worker.

Broad: their one-line pitch, "most agent frameworks are about what an agent does, Dapr Agents is about whether it survives long enough to finish", is a useful framing discipline even though Temporal already gives us that durability. Their virtual-actor scale-to-zero model (thousands of idle agents on one core, woken in milliseconds) is an argument for a class of workload we do not have a slot for today: a cheap, long-lived, per-project listener agent, as opposed to our current pattern of one disposable pod per task.

## 7. Where our philosophy differs and what that costs or buys us
Running tools in-process with no sandbox is the biggest gap: it buys them simplicity (no per-task pod, no gVisor, no network policy to write) at the cost of exactly the blast-radius containment our security constraint requires. We would never adopt this for the worker plane.

Identity at the app-deployment level instead of the task level is simpler to operate (set scopes once, forget it) but means a single compromised process keeps its credentials for the deployment's whole lifetime instead of a single task's. Our per-task ServiceAccount token is more code but bounds the blast radius to one task.

Policy shipped as code inside the agent's own repository is easier for a single team to iterate on, but it means the same pull request that changes an agent can change its own guardrails. Our split (policy as a Git-versioned document enforced by gateway and network code, outside the agent's reach) costs a second repository and a Flux Kustomization but keeps a compromised agent-authoring change from rewriting its own limits.

## 8. Red flags and slop assessment
No red flags found. 752 stars, 142 forks, 36 contributors (`api.github.com/repos/dapr/dapr-agents/contributors`), Apache-2.0, created 2025-01-02, last commit 2026-09-28, same day as the newest release tag v1.0.6. Point releases have shipped roughly monthly since the v1.0.0 GA in March 2026. CI (`.github/workflows/build.yaml`, described in `AGENTS.md`) runs ruff, flake8, mypy and pytest across Python 3.11-3.14 and requires DCO-signed commits, consistent with a real engineering process rather than a marketing shell. Named production users were reported at KubeCon EU 2026 (ZEISS Vision Care, document data extraction) and by a third-party blog (an unnamed EU logistics company); neither is independently verified beyond press coverage. A proposal to list "Durable Agents (previously Dapr Agents)" in the Agentic AI Foundation's sandbox was declined per a GitHub issue found in search; the reason was not visible in the snippet, so treat it as not verified rather than as a red flag. No open-core gating or pricing tier was found: the whole framework is Apache-2.0 with no paid SaaS variant.

## 9. Sources
- https://github.com/dapr/dapr-agents (cloned shallow to ~/repos/market-research-clones/dapr-agents, read 2026-09-29)
- README.md
- pyproject.toml
- AGENTS.md
- SECURITY.md
- dapr_agents/hooks.py
- dapr_agents/agents/base.py
- dapr_agents/agents/durable.py
- dapr_agents/agents/configs.py
- dapr_agents/workflow/runners/agent.py
- dapr_agents/observability/ (directory listing)
- dapr_agents/agents/orchestrators/ (directory listing)
- examples/04-multi-agent-workflow-k8s/README.md and manifests/
- api.github.com/repos/dapr/dapr-agents (stars, forks, license, created_at, pushed_at, open_issues), fetched 2026-09-29
- api.github.com/repos/dapr/dapr-agents/contributors, fetched 2026-09-29
- api.github.com/repos/dapr/dapr-agents/releases, fetched 2026-09-29
- WebSearch "Dapr Agents review 2026 production use CNCF sandbox", 2026-09-29, including https://www.cncf.io/announcements/2026/03/23/general-availability-of-dapr-agents-delivers-production-reliability-for-enterprise-ai/ and https://www.signisys.com/blog/cncfs-dapr-agents-v1-0-delivers-production-reliability-for-ai-agent-frameworks/
- https://dapr.github.io/dapr-agents/ (WebFetch returned 404 on 2026-09-29, not accessible at that path)
