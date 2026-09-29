---
name: Google Agent Development Kit
slug: google-adk
url: https://google.github.io/adk-docs/
repo: https://github.com/google/adk-python
category: agent-framework
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: pip package, self-hosted container, GKE, Cloud Run, or Google Cloud managed Agent Runtime (Agent Engine)
company: Google LLC. Part of the Gemini/Google Cloud org, no separate funding, project started April 2025
maturity: 21.7k stars, 4080 forks, 419 contributors (paginated), first commit 2025-04-01, last push 2026-09-28, weekly to biweekly releases (v2.10.0 on 2026-09-25)
similarity: 2
axes:
  signals_intake: 1
  control_plane: 1
  sandbox_isolation: 2
  verification: 1
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 0
  ux: 2
  reseedable_selfhost: 2
steal:
  - BasePlugin (src/google/adk/plugins/base_plugin.py): before/after callbacks on user message, agent, model and tool calls, executed in registration order with short-circuit on a returned value. A clean interception pattern for hooks even though our own enforcement has to live outside the agent process.
  - ToolConfirmation (src/google/adk/tools/tool_confirmation.py) and the request_confirmation flow: a single tool call can pause mid-turn for a human decision with a hint and a JSON payload, then resume. Worth stealing as a UX shape for approving one action, distinct from approving a whole task.
  - One BaseSessionService interface with five interchangeable backends (in-memory, SQLite, SQLAlchemy database, Vertex AI managed, Firestore/Redis via integrations). Good reference for keeping our own session/finding store swappable.
  - LLMRegistry (src/google/adk/models/registry.py): native classes for Gemini, Anthropic, Gemma and Apigee, and one LiteLlm wrapper that defers to litellm.provider_list for everything else instead of hand-listing providers. Cheap to copy for our own model-tier ladder.
  - Pub/Sub and Eventarc trigger endpoints (src/google/adk/cli/trigger_routes.py) bake a concurrency semaphore and exponential backoff on 429/RESOURCE_EXHAUSTED into the intake path itself, so a burst of events cannot blow the model quota. A concrete pattern for our own signal intake.
  - container_code_executor.py runs a supervisor as a separate forked process to enforce the timeout, so sandboxed code cannot disarm its own deadline and SIGKILL reaches the whole process group. Good detail for our own gVisor time bounds.
differs:
  - The trust boundary is the process, not the task. An ADK app is a long-lived multi-session service; isolation is opt-in per tool call (a code-execution sandbox) rather than mandatory per unit of work. Adopting ADK as-is would mean giving up per-task disposable pods unless we wrapped it in our own Kubernetes layer, which is the same conclusion most frameworks force.
  - Identity means credentials the agent uses to call other APIs on the user's behalf (OAuth2, API key or service account stored per session via CredentialManager), not credentials scoped to one disposable task with no key material reachable from the sandbox. Using ADK's auth stack unmodified would put semi-durable tokens in the same process as the model loop, against our identity-per-task principle.
  - There is no control plane. No task registry, scheduler, budget, approval state machine or audit trail; those are explicitly left to whatever hosts the ADK app, including Google's own Agent Engine product. Even in the best case ADK only ever replaces the innermost per-agent code, and there it competes with keeping opencode/Codex CLI behind our Harness interface, which is already model-agnostic without a large Python SDK that pulls in Google Cloud client libraries by default.
ux_verdict: A solid single-developer inner loop (adk web, adk run, adk eval, adk deploy) but no fleet view, nothing shows several agents or tasks at once, and human-in-the-loop is a paused chat turn, not an approval queue.
slop_verdict: Real and actively used, not a landing page. The 1.x to 2.0 graph rewrite (May 2026) broke prior agent code and several 2026 reviews still call parts of the new stack beta and Google-Cloud-flavoured.
---

# Google Agent Development Kit

## 1. What it is
ADK is Google's open-source Python (also TypeScript, Go, Java, Kotlin) framework for writing, testing and deploying AI agents, optimised for Gemini but model-agnostic. It targets developers building a bespoke agent or multi-agent application, not people who want an off-the-shelf coding agent. It is sold as free and open source (Apache-2.0); Google's commercial angle is the managed deployment targets (Cloud Run, GKE, and the hosted Agent Runtime, formerly Vertex AI Agent Engine).

Google's own claim, from adk.dev: "Build production agents, not prototypes," with context management, graph workflows and deploy-anywhere flexibility as headline features. What the repository actually shows: a large, fast-moving Python package (src/google/adk has over 30 top-level submodules) that gives building blocks, Agent, Workflow, tools, sessions, plugins, evaluation, code executors, deployers, and expects the caller to wire them into an application. It is a library, not a running system.

## 2. Mapping to our five planes
| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Pub/Sub and Eventarc trigger routes (cli/trigger_routes.py) turn a cloud event into an agent run, with a concurrency semaphore and 429 backoff. No issue tracker or alert normalisation. | Forgejo webhooks, SigNoz alerts and an intake API, every task a Forgejo issue. | we lead |
| Control plane | None. Session state only (sessions/base_session_service.py), no task registry, scheduling, budgets or approvals. | factoryd with a Temporal workflow per task, Postgres, policy as Git-applied YAML. | we lead |
| Worker plane | One long-lived process serves many sessions; a sandbox is an optional code-execution tool (Docker, GKE via k8s-agent-sandbox, Vertex AI, or a gVisor-backed Cloud Run sandbox), not the whole agent. | One gVisor pod per task, read-only root FS, default-deny egress. | we lead |
| Verification | evaluation/ gives eval sets, rubrics and criteria for offline agent-quality testing. No CI gate, no merge policy. | Forgejo Actions, policy gates, reproduction gate, stronger-model review before merge. | we lead |
| Merge and deploy | adk deploy pushes a container to Cloud Run, GKE or Agent Engine. No PR, review or GitOps concept. | Bot-merged PR after approval or auto rule, Flux GitOps rollout with a soak window. | not comparable |
| Policy outside the model | BasePlugin callbacks (before/after tool, model, agent) run as deterministic Python in the same process as the agent. Can block or rewrite calls, but shares the agent's trust boundary. | Capability rules in Git, enforced in gateway code and network policy, outside the sandbox entirely. | we lead |
| Identity per task | CredentialManager and auth/ manage OAuth2, API key and service-account credentials so a tool call can act as a user against an external API, stored per session. | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by factory-gateway, no key material in the sandbox. | not comparable |
| Artifacts not chat | Agents exchange typed Event objects and session state in-process; A2A protocol lets separate ADK agents delegate over a wire format. | TaskBrief in, branch, PR and event stream out, Git as the coordination point. | not comparable |

## 3. Architecture and stack
Pure Python (3.10+), pydantic v2 models throughout, FastAPI, Starlette and uvicorn for the dev and trigger servers, SQLAlchemy plus aiosqlite for the database session backend. Core packages under src/google/adk/: agents/ (Agent, LlmAgent, config-driven agents), workflow/ (the ADK 2.0 graph engine, _graph.py, _node.py, _dynamic_node_scheduler.py, retry and join nodes), sessions/ (pluggable BaseSessionService, in-memory, sqlite, SQLAlchemy database_session_service.py, vertex_ai_session_service.py, plus Firestore and Redis under integrations/), models/ (google_llm.py, anthropic_llm.py, gemma_llm.py, lite_llm.py wrapping LiteLLM for everything else, registry.py picking between them), tools/ (function tools, mcp_tool/ with an MCP client and the ability to expose an agent as an MCP server, openapi_tool/, Google-specific tools for BigQuery, Bigtable, Spanner, Pub/Sub), code_executors/ (unsafe_local_code_executor.py, container_code_executor.py for Docker, gke_code_executor.py importing k8s_agent_sandbox.SandboxClient from the Kubernetes SIG project in our own seed list, vertex_ai_code_executor.py), auth/ (OAuth2 and service-account credential exchange for tools), plugins/, evaluation/, and cli/ (cli.py, cli_deploy.py for Cloud Run, GKE and Agent Engine, fast_api.py, adk_web_server.py). Deployment shape is bring-your-own-container: adk deploy cloud_run and adk deploy docker generate a Dockerfile and push; there is no Helm chart in this repository.

## 4. UX
Zero to first result: pip install google-adk, write an Agent(...) in a few lines, then adk run path/to/agent for a CLI loop or adk web path/to/agents_dir for a browser dev UI, three steps, no account needed for a local model-less smoke test, one API key for a real model call. adk web is the most developed surface: a chat pane per agent, a trace and event inspector, and, per screenshots and the README demo video, a graph view of workflow nodes as they execute. A user watches token-by-token streaming and can inject a new message mid-run; ToolConfirmation pauses a specific tool call for an explicit yes or no plus optional payload before it executes. There is no board of many concurrent tasks or agents, no queue of pending approvals across sessions, and no cost view. Interfaces: Python API, CLI, local web UI, and a FastAPI server (fast_api.py) for embedding in another app. Compared with our console: easier to get one agent running from nothing; worse at showing many tasks at once or letting a human approve or steer a queue rather than a single chat turn.

## 5. Security, identity, sandbox, policy, cost
Sandbox. Isolation is a per-tool-call choice, not a property of the agent process. BaseCodeExecutor implementations range from unsafe_local_code_executor.py (runs in a subprocess of the host with no isolation, the name says it) through Docker (container_code_executor.py, with a forked supervisor process enforcing the wall-clock timeout so sandboxed code cannot disarm it) to gke_code_executor.py (delegates to k8s_agent_sandbox) and a documented gVisor-backed Cloud Run sandbox flag (with_cloud_run_sandbox). The agent runtime itself is not sandboxed per task.

Identity. auth/credential_manager.py and auth/credential_service/ store and refresh OAuth2, API key, HTTP and service-account credentials so a tool can call an external API as a specific user; credentials live in session state, not in a separate secret-issuing plane. There is no concept of a short-lived, task-scoped identity for the agent's own compute.

Policy. plugins/base_plugin.py gives deterministic before and after hooks around model and tool calls that can veto or rewrite a call. This is code, not a prompt, but it runs inside the same process and trust boundary as the agent it polices.

Cost. No budgets, holds or ledger in the framework. The only cost-adjacent code is a concurrency semaphore in the Pub/Sub and Eventarc trigger routes to stay within model quota; actual spend control is left to whichever billing account calls the model API or hosts Agent Engine.

## 6. What we should take from it
Narrow: the LLMRegistry pattern of native classes for a short list of providers plus a LiteLLM catch-all (_resolve_litellm_provider) is a smaller version of what we already do and worth comparing our tier ladder against. The forked-supervisor timeout technique in container_code_executor.py is a concrete, reusable idea for enforcing wall-clock bounds against code that could otherwise disarm its own alarm. The ToolConfirmation payload-plus-hint shape is a good UX primitive for a single risky action, narrower and lighter than our task-level approval state.

Broad: the plugin callback list (on_user_message, before/after_agent, before/after_model, before/after_tool, on_*_error) is a clean menu of interception points; when we add analyzer, integration-tester or release-agent classes it is worth checking our event stream exposes the same points, even though enforcement itself must stay outside the sandboxed process. The pluggable BaseSessionService (five backends behind one interface) is a reminder to keep our own session and finding storage swappable rather than assuming Postgres forever.

## 7. Where our philosophy differs and what that costs or buys us
ADK treats sandboxing as an optional tool, we treat it as the default unit of execution. Copying ADK's model would break security without half measures: a plain Agent with no code executor runs with no isolation at all, and even the isolated executors only wrap one tool call, not the session. Our cost is more infrastructure, one pod per task; their cost is that an uncontained agent process is the default, not the exception.

ADK's identity model solves a different problem, an agent acting as a user against Google or OAuth APIs, than ours, an agent acting as itself with no standing credentials. If we ever used ADK for one agent class, we would still need to strip its credential storage down to nothing and route every external call through factory-gateway, which is extra integration work ADK does not save us.

Where their approach is better and our constraint is the price: ADK's single-process design makes local development and debugging faster, one adk web command, full trace in one place, than spinning up a namespace, ServiceAccount and gVisor pod per task the way we do. That speed is real and we pay for our isolation with slower iteration.

## 8. Red flags and slop assessment
Real project: 21.7k stars, 4080 forks, 419 contributors, weekly-to-biweekly releases through 2026 (v2.10.0 on 2026-09-25), and 510 open issues on a repository that size is normal churn, not neglect. It is a Google I/O 2026 keynote feature, not a side project.

The ADK 2.0 graph rewrite (May 2026) is a breaking change from 1.x and multiple September 2026 comparison pieces (Medium, ChatForest, dev.to) describe parts of the new workflow runtime and its TypeScript and Go siblings as still maturing, with Google Cloud deployment as the best-supported path. An independent dependency comparison found ADK 1.x pulled in 45 direct dependencies including BigQuery and Spanner clients by default, against 6 for LangGraph; pyproject.toml in this clone confirms a long optional-dependencies.all list spanning google-api-python-client, google-cloud-aiplatform, daytona, e2b and docker. No licence changes found; Apache-2.0 throughout. No security incidents found in the time available; not verified beyond that.

## 9. Sources
- https://google.github.io/adk-docs/ (redirects to https://adk.dev/), fetched 2026-09-29
- https://adk.dev/, fetched 2026-09-29
- gh api repos/google/adk-python, fetched 2026-09-29
- gh api repos/google/adk-python/contributors (paginated), fetched 2026-09-29
- gh api repos/google/adk-python/releases, fetched 2026-09-29
- Local shallow clone of google/adk-python at ~/repos/market-research-clones/google-adk, fetched 2026-09-29
- README.md
- pyproject.toml
- src/google/adk/sessions/ (base_session_service.py, database_session_service.py, sqlite_session_service.py, vertex_ai_session_service.py)
- src/google/adk/auth/ (credential_manager.py, auth_credential.py, credential_service/)
- src/google/adk/code_executors/ (base_code_executor.py, unsafe_local_code_executor.py, container_code_executor.py, gke_code_executor.py)
- src/google/adk/models/ (registry.py, lite_llm.py)
- src/google/adk/plugins/base_plugin.py
- src/google/adk/tools/tool_confirmation.py, src/google/adk/flows/llm_flows/request_confirmation.py
- src/google/adk/cli/ (cli_deploy.py, trigger_routes.py, fast_api.py, adk_web_server.py)
- src/google/adk/integrations/eventarc/
- WebSearch: Google Agent Development Kit ADK 2.0 review 2026 vs LangGraph criticism, fetched 2026-09-29 (Virtualization Review, Medium, developers.googleblog.com, ChatForest, dev.to, fast.io, ZenML)
