---
name: ChatDev (DevAll)
slug: chatdev
url: https://github.com/OpenBMB/ChatDev
repo: https://github.com/OpenBMB/ChatDev
category: agent-framework
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, Docker Compose or manual run. No current SaaS offering for 2.0
company: OpenBMB, with THUNLP (Tsinghua NLP lab) and ModelBest. Community open source, no disclosed funding, Beijing, started 2023
maturity: 34.4k stars, 4.3k forks, 17+ contributors, first commit Aug 2023, last commit 24 Jul 2026, 12 releases, latest v2.2.0 Mar 2026
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 3
  reseedable_selfhost: 2
steal:
  - Visual DAG canvas backed by editable YAML (entity/graph_config.py, frontend/) as a reference for a diff-and-flow view our console lacks.
  - Per-session WebSocket log and artifact streaming (server/routes/websocket.py) closes our "no real-time stream of the agent's work" gap cheaply.
  - Provider-per-node abstraction (runtime/node/agent/) swaps model and base URL per node from one registry, the same shape as our tiered LiteLLM routing, confirming the pattern rather than adding a new one.
  - HumanNodeExecutor's request/response pause (runtime/node/executor/human_executor.py) is a minimal template for turning "waiting on a human" into a typed graph node instead of bespoke workflow code.
  - Tarjan-cycle-detection scheduler (workflow/executor, docs/user_guide/en/execution_logic.md) for bounded agent retry loops expressed declaratively rather than in Go control flow.
differs:
  - No sandbox. Python and function nodes shell out via subprocess.run with the parent process's full environment (functions/function_calling/code_executor.py, runtime/node/executor/python_executor.py). Copying this breaks our default-deny, per-task sandbox constraint outright.
  - Single shared API key for the whole backend (.env BASE_URL/API_KEY), no per-task identity or capability policy. Any node can do whatever the process can, the opposite of policy living outside the model.
  - No durable task state. A session is a folder under WareHouse/<session>/, not a workflow engine row with audit trail. Fine for one desktop user, not for a re-seedable, audited factory.
  - The unit of exchange between nodes is a chat message, not a merge-ready artifact. That fits its general-purpose scope but is the exact shallow-verification pattern independent research found broken for coding tasks.
ux_verdict: The web canvas plus real-time WebSocket log streaming beats our static kanban for watching an agent work, but the only intervention point is an unscoped free-text human node, not a typed approve, redirect or deny.
slop_verdict: Real and actively maintained, but no longer the software-factory project it is famous for. That identity now lives on a comparatively frozen legacy branch, and independent research found the original's reviewer agents shallow and its benchmarks irreproducible.
---

# ChatDev (DevAll)

## 1. What it is
ChatDev began in 2023 at Tsinghua's THUNLP lab and ModelBest, published as "Communicative Agents for Software Development" (arXiv:2307.07924). It simulated a virtual software company: CEO, CTO, programmer and reviewer agents moved through phases (design, coding, testing, documenting) to turn a one-line idea into a small working program. That version is now frozen on the chatdev1.0 branch.

In January 2026 the maintainers shipped "ChatDev 2.0 (DevAll)", a full rewrite that generalises the same agent-collaboration research into a zero-code multi-agent workflow platform for arbitrary domains: data visualisation, 3D generation with Blender, game development, deep research and video generation. The README's own framing is explicit: it moved from a coding assistant to a Zero-Code Multi-Agent Platform. The repository confirms this: there is no software-specific role model left, only a generic node graph (agent, python, human, tooling, subgraph, memory, loop nodes) authored in YAML or a visual canvas. What the maintainers claim (accessible orchestration for everyone) matches what the code does; what it no longer claims is end-to-end software delivery, which is what earned it 34k stars in the first place.

## 2. Mapping to our five planes

| Plane / principle | What ChatDev does | What we do | Verdict |
|---|---|---|---|
| Signals | None. A user types a task prompt and picks a YAML workflow in the UI or SDK | Forgejo issues, SigNoz alerts, factoryd intake API | we lead |
| Control plane | A session is a timestamped folder under WareHouse/, tracked in memory during the run; no scheduler, budgets or approval state | Temporal workflow per task, Postgres, policy in Git | we lead |
| Worker plane | One shared backend process runs all node executors; python/function nodes are host subprocesses with the parent's environment | One gVisor pod, ServiceAccount, default-deny egress per task | we lead |
| Verification | None built in for 2.0. 1.0's reviewer agents checked compile status and TODO markers, found shallow by outside research | Forgejo CI, policy gates, stronger-model review | we lead |
| Merge and deploy | Not applicable, DevAll produces artifacts in a session folder, not a PR | Bot-merged PR, Flux staged rollout | not comparable |
| Policy outside the model | None. Whatever a node's YAML config allows, it can do | Capability rules in Git, enforced in gateway and network policy | we lead |
| Identity per task | One global API key in .env shared by every session | Per-task projected ServiceAccount token, per-task virtual key | we lead |
| Artifacts not chat | Nodes exchange Message objects along typed edges (entity/messages.py), including code-run nodes | TaskBrief in, branch and PR out | not comparable, different problem shape |

## 3. Architecture and stack
Python 3.12 backend on FastAPI (server/app.py, server/bootstrap.py), managed with uv (pyproject.toml, uv.lock). A Vue 3 + Vite frontend under frontend/. Workflows are YAML files (yaml_instance/*.yaml) parsed into a typed graph (entity/graph_config.py, entity/configs/node/*.py, entity/configs/edge/*.py) and executed by workflow/executor and runtime/node/executor/*.py, one executor class per node type: agent, python, human, subgraph, passthrough, literal, loop counter and loop timer. Model calls go through openai and google-genai SDKs behind a provider abstraction under runtime/node/agent/; tool calling supports both plain function calls (functions/function_calling/*.py) and MCP (mcp, fastmcp dependencies, mcp_example/). Memory nodes use mem0ai and faiss-cpu for embeddings. State is file-based: each run gets a WareHouse/<session>/ directory holding attachments, a code_workspace/, and logs; there is no database. Real-time updates go over WebSocket (server/routes/websocket.py, server/services/artifact_events.py). Deployment is Docker Compose (compose.yml) with two containers, backend and frontend, each built from a Dockerfile; no Helm chart or Kubernetes manifest exists in the repo. Test coverage is thin: five files under tests/ covering memory embedding, mem0 integration, server reload and websocket send behaviour.

## 4. UX
The web console (localhost:5173) has a Tutorial tab, a drag-and-drop Workflow canvas to build or edit a node graph, and a Launch tab to run one. Zero to first result: pick a demo workflow file such as data_visualization_basic.yaml, open Launch, optionally upload a CSV, type a prompt, and run, three steps once the stack is up. While a workflow runs, the console streams node state, stdout/stderr and artifact events live over WebSocket, and a human node pauses the graph and shows the user a text box to answer before continuing. There is also a Python SDK (runtime/sdk.py, PyPI package chatdev) for scripted execution: run_workflow(yaml_file=..., task_prompt=...). Compared with our console, the live per-node log and artifact stream is clearly ahead of what we have, since we admit to no real-time view at all; the trade is that its intervention is one free-text human node, not our workflow-state approval, and there is no cost or budget view anywhere in the UI.

## 5. Security, identity, sandbox, policy, cost
Credentials: one API_KEY and BASE_URL pair in a single .env file, shared by the whole backend process and every session; there is no per-task or per-node scoping. Sandbox: none. functions/function_calling/code_executor.py and runtime/node/executor/python_executor.py both run arbitrary code with subprocess.run, inheriting os.environ.copy(), on the host filesystem, with only a wall-clock timeout as a limit; no container, no seccomp, no network restriction. Network egress: unrestricted, whatever the host allows. API access: server/bootstrap.py wires CORS middleware but no authentication or authorization middleware; the FastAPI app is open to any caller that can reach the port. Policy: none in code, the only constraint on what an agent can do is whatever the workflow author wrote into the YAML. Cost: no budget, hold or ledger code anywhere in server/ or runtime/, token spend is whatever the configured provider bills.

## 6. What we should take from it
Narrow: the WebSocket-per-session log and artifact stream is the most directly reusable idea, a small, well-scoped addition that would close our own documented console gap without touching the control plane. The provider-per-node registry confirms our per-tier model routing is a common, sound shape, nothing to add, just validation. The HumanNodeExecutor request/response pause is a clean minimal pattern for expressing "wait on a human" as a graph primitive, worth looking at if the console ever grows a workflow-graph view of a task's steps.

Broad: the visual DAG canvas over an editable YAML file is a reasonable direction if we ever want operators to inspect or tweak a task's step sequence without reading Go, though our task shape (issue to PR) is far narrower than DevAll's, so a general canvas is more product than we need. The bigger lesson is the pivot itself: a project whose entire claim to fame was "AI builds your software end to end" broadened into a generic workflow tool once outside scrutiny (see section 8) found its core claim did not hold up well. That is a caution to keep our own verification evidence, the reproduction gate, policy gates, stronger-model review, real and load-bearing rather than decorative.

## 7. Where our philosophy differs and what that costs or buys us
Sandboxing is the sharpest difference: ChatDev runs all generated code in the same process and host as the backend, with the full environment, exactly the half measure our design refuses to accept. That buys them a simpler deployment, one Docker Compose file, no cluster, at the cost of the isolation and blast-radius limits our sandbox plane exists for; we would not trade sandbox isolation for their deployment simplicity.

Their control plane is stateless by design, a session is a folder, not a database row, which fits a single-user desktop tool but not a multi-tenant, auditable factory; our Temporal-plus-Postgres control plane costs more to run and re-seed but is the reason we can promise a durable audit trail.

Policy living in the workflow author's YAML rather than outside the model matches DevAll's build-anything pitch, but it means a compromised or careless workflow file has no code-enforced ceiling, the opposite of our capability-policy-in-Git approach. Their artifact unit is a chat message between nodes rather than a diff or PR; that is the right shape for their broader domains, 3D scenes, videos, research reports, but the wrong shape for software changes specifically, one reason the findings in section 8 land on ChatDev-style systems rather than on PR-based ones.

## 8. Red flags and slop assessment
The project is real and used: 34.4k GitHub stars, 4.3k forks, 12 tagged releases, latest v2.2.0 in March 2026, and a commit history with over 600 merged pull requests into main. It is not a README-only landing page.

Two things temper that. First, the product identity changed under the same name: the virtual software company that made ChatDev famous is now the chatdev1.0 branch, maintained separately from the actively developed main, so anyone evaluating ChatDev for software-factory purposes is actually evaluating a legacy branch, a real source of confusion, which is why this seed list filed it under agent-framework rather than factory-orchestrator. Second, independent academic scrutiny of the original system is unflattering: the Berkeley MAST paper, Why Do Multi-Agent LLM Systems Fail, Cemri, Pan et al., measured only 33.33% task success for ChatDev on the ProgramDev benchmark despite its built-in reviewer agents, and found those reviewers checked shallow signals like whether the code compiles or has leftover TODOs rather than task correctness; adding an explicit goal-verification step raised success by 15.6 percentage points. A separate comparative analysis notes ChatDev's and MetaGPT's self-reported executability numbers, 88 percent versus 41 percent, use incompatible benchmarks and definitions, making either claim hard to trust on its own. No security incidents or licence changes were found; Apache-2.0 throughout, no open-core gating visible in the code.

## 9. Sources
https://github.com/OpenBMB/ChatDev, cloned to ~/repos/market-research-clones/chatdev 2026-09-29: README.md, README-zh.md, compose.yml, Dockerfile, pyproject.toml, entity/, runtime/, workflow/, server/, functions/, docs/user_guide/en/, tests/
gh api repos/OpenBMB/ChatDev, 2026-09-29
gh api repos/OpenBMB/ChatDev/contributors, 2026-09-29
gh api repos/OpenBMB/ChatDev/releases, 2026-09-29
git log -1 in the clone, 2026-09-29
https://arxiv.org/abs/2307.07924, ChatDev original paper, referenced 2026-09-29
https://arxiv.org/pdf/2503.13657, Cemri, Pan et al., Why Do Multi-Agent LLM Systems Fail, referenced 2026-09-29
https://christophermeiklejohn.com/ai/agents/mas-series/2026/04/30/mas-series-07-benchmarks.html, referenced 2026-09-29
https://x.com/OpenBMB/status/2019264779521544636, 30k stars announcement, referenced 2026-09-29
https://yuv.ai/blog/chatdev, referenced 2026-09-29
https://toolbrain.net/blog/chatdev-review-2026/, referenced 2026-09-29
https://deepwiki.com/OpenBMB/ChatDev, referenced 2026-09-29
