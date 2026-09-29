---
name: LangGraph and LangGraph Platform
slug: langgraph
url: https://www.langchain.com/langgraph
repo: https://github.com/langchain-ai/langgraph
category: agent-framework
license: "mixed: langgraph library MIT, langgraph-api server Elastic-2.0"
open_source: partial
self_hostable: partial
hosting_model: self-hosted library (free), or LangSmith Deployment (formerly LangGraph Platform) cloud, hybrid or self-hosted-with-control-plane, gated behind LangSmith Plus or Enterprise
company: LangChain Inc, San Francisco, founded 2022 by Harrison Chase and Ankush Gola, about 160M USD raised, 1.25B USD valuation (Series B, Oct 2025, led by IVP)
maturity: 42.5k GitHub stars, 7.2k forks, 834 open issues, repo created 2023-08-09, last commit 2026-09-27, PyPI release cadence roughly weekly (v1.2.12 current)
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 2
  reseedable_selfhost: 2
steal:
  - "interrupt()/Command(resume=...): a typed, resumable pause exception raised inside a node, matched to a caller-supplied resume value by call order. A clean vocabulary for expressing a human-wait state, worth reusing as naming, not code, on top of Temporal signals."
  - "BaseCheckpointSaver: one small interface (put/get_tuple/list) with three swappable backends (memory, SQLite, Postgres) in libs/checkpoint, libs/checkpoint-sqlite, libs/checkpoint-postgres. A compact reference shape for a per-step snapshot store if we ever need one outside Temporal history."
  - "EncryptedSerializer (libs/checkpoint/langgraph/checkpoint/serde/encrypted.py): opt-in at-rest encryption for whatever gets persisted as step state. Cheap to imitate for any findings or state blob we write to Postgres."
  - "BaseStore (libs/checkpoint/langgraph/store/base): a namespaced put/get/search interface for memory that outlives one run, kept deliberately separate from per-run checkpoint state. Matches a gap we already flagged: no project memory across tasks."
  - "langgraph.json: a single declarative manifest (graphs, deps, env) that the CLI turns into a reproducible Docker build. A boring, worth-copying convention for describe-once, build-once."
differs:
  - "The execution unit is shared mutable state (channels merged by reducers) read and written by every node in one process, not artifacts handed between isolated workers. Using LangGraph as a worker-plane substrate would mean giving up per-task process and network isolation."
  - "No identity-per-task or credential brokering exists anywhere in the library. A tool call inside a node inherits whatever ambient credentials the hosting process holds. Any task-scoped token model has to be built entirely outside LangGraph, which is what our design already does."
  - "The business model splits an MIT loop from an Elastic-2.0 server: the CLI's own production path (langgraph build/up) pulls the proprietary langchain/langgraph-api image and, at scale, a commercial LangSmith key. That is the open-core gate our constraint on open source with an escape hatch warns against; the escape hatch is to never run their server and write a thin one ourselves, since the library needs nothing but Postgres."
ux_verdict: Minutes from pip install to a running graph in code, but nothing to watch or approve without buying the separate, proprietary LangSmith/Studio layer.
slop_verdict: The library is real and heavily used (42.5k stars, weekly releases, cited by Klarna, Uber, Elastic, Replit), but the production server it steers you toward is a closed, source-unavailable binary, not the open-source deal the product page implies.
---

# LangGraph and LangGraph Platform

## 1. What it is

LangGraph is a Python (and separately, JS/TS) library from LangChain Inc for building the internal control flow of a single stateful agent: a graph of node functions sharing a persisted state object, with built-in pause and resume. It is not a factory. It has no issue intake, no sandboxing, no policy engine and no merge step; it is the loop that runs inside one agent, meant to be embedded in someone else's application or platform.

The README and product page (docs.langchain.com/oss/python/langgraph, langchain.com/langgraph) claim durable execution, human-in-the-loop, memory and "production-ready deployment," and say the library is "MIT-licensed... and free." That last claim is true only of the library. The repository shows the library itself (libs/langgraph, libs/checkpoint*, libs/prebuilt) is MIT and fully self-contained. The CLI (libs/cli) that turns a graph into something you actually run in production builds a Docker image FROM langchain/langgraph-api (libs/cli/langgraph_cli/config.py:1647). PyPI's own JSON metadata for that langgraph-api package (pypi.org/pypi/langgraph-api/json, checked 2026-09-29) declares "license": "Elastic-2.0", a source-available, not open-source, licence, with no public repository. LangChain's self-hosting docs (docs.langchain.com/langsmith/deployments, fetched 2026-09-29) describe three self-run topologies, all of which require "a LangSmith license" or an Enterprise plan.

## 2. Mapping to our five planes

| Plane / principle | What LangGraph does | What we do | Verdict |
|---|---|---|---|
| Signals | None. A graph is invoked by your own code, not by an issue or webhook | Forgejo issues, alert webhooks, intake API | not comparable |
| Control plane | A checkpointer persists full graph state after every superstep, keyed by thread_id, so a run resumes exactly where it stopped. No scheduling of independent tasks, no budgets, no approvals, no audit trail in the OSS library | Temporal workflow per task, Postgres, policy, budgets, approvals, audit | we lead |
| Worker plane | Nodes run as plain function calls in the host process. No isolation, no egress control | gVisor pod per task, read-only root, default-deny egress | we lead |
| Verification | None built in | Forgejo Actions, policy gates, stronger-model review | we lead |
| Merge and deploy | None. LangGraph never touches Git | Bot-merged PR, Flux GitOps rollout | not comparable |
| Policy outside the model | None. Access control is left to the embedding application | Capability rules in Git, enforced by gateway and network policy | we lead |
| Identity per task | None. A tool call inherits the host process's ambient credentials | Projected, audience-scoped ServiceAccount token per task | we lead |
| Artifacts not chat | The unit of exchange is a shared, reducer-merged state dict (often a message list) passed by reference between nodes in one process | TaskBrief in, branch and PR out, between isolated workers | differs |

## 3. Architecture and stack

The core (libs/langgraph/langgraph/pregel) is a Pregel-style bulk-synchronous graph: nodes fire in parallel "supersteps," read and write named "channels" (libs/langgraph/langgraph/channels) that merge concurrent writes with a reducer function, and a BaseCheckpointSaver (libs/checkpoint/langgraph/checkpoint/base/__init__.py) snapshots the whole state after each superstep. Backends are separate packages: InMemorySaver, libs/checkpoint-sqlite, libs/checkpoint-postgres. A second, independent BaseStore interface (libs/checkpoint/langgraph/store/base) holds long-term, cross-thread memory (namespaced put/get/search).

Human-in-the-loop is one function: interrupt(value) (libs/langgraph/langgraph/types.py:887) raises a GraphInterrupt from inside a node, which the client resumes with Command(resume=...) (types.py:827); this requires a checkpointer to be enabled, since the node re-runs from its start on resume. libs/prebuilt supplies a single-agent ReAct loop (chat_agent_executor.py, tool_node.py); multi-agent supervisor and hierarchical patterns are documented recipes and examples (examples/multi_agent, examples/plan-and-execute), not an enforced abstraction.

Deployment (libs/cli/langgraph_cli) reads a langgraph.json manifest (graphs, Python deps, env file) and generates a Dockerfile plus a docker-compose.yml with Postgres, FROM langchain/langgraph-api for the actual HTTP server (assistants, threads, runs, cron, a task queue). That server package is closed (Elastic-2.0, no public source), so the CLI's own reference deployment shape is not something you can build from this repository alone.

## 4. UX

Zero to a running graph is pip install langgraph, roughly ten lines of Python (StateGraph, add_node, add_edge, compile), then .invoke() or .stream() -- a few minutes, all in code, no UI. Watching a run in the open source path means consuming the stream of state updates yourself; there is no console. LangChain's own product page attributes all debugging to LangSmith, a separate paid product, not to LangGraph. LangSmith/Studio (not reviewed here in depth, out of scope for the OSS library) is described in docs and blog posts as adding a graph visualiser and a time-travel run inspector, which would be a stronger UX than our console's current diff-less, replay-less state -- but it sits behind the same paid Deployment product as the server, not inside the framework under review.

## 5. Security, identity, sandbox, policy, cost

No sandboxing anywhere: a node is a function call in the host process, with whatever network and file access that process already has. No credential brokering: a tool call sees the ambient environment's API keys. Persisted checkpoint state is written to whatever database you configure, in plaintext unless the app opts into EncryptedSerializer (libs/checkpoint/langgraph/checkpoint/serde/encrypted.py); this is off by default. No policy layer distinguishes trusted from untrusted input; that is left entirely to the embedding application. No hard spend caps exist in the library; LangSmith exposes per-run token and cost figures for observability and billing, not verified here as any kind of pre-call enforcement.

## 6. What we should take from it

Narrow, this month: the interrupt()/Command(resume=...) naming is worth stealing as vocabulary for how factoryd surfaces a human-wait state, even though Temporal signals already do the mechanics. The BaseCheckpointSaver and BaseStore interfaces are small, well-factored reference shapes: one for per-step durable snapshots, one for cross-task memory, both a fair sketch of the "no project memory, no codebase index" gap our own vision doc already names as unfinished. EncryptedSerializer is a one-line-of-reasoning idea: anything we persist as task state or findings should default to encrypted at rest.

Broad: LangGraph's restraint is itself informative. The best-funded agent-framework player in this market chose to open-source only the reasoning loop and keep sandboxing, policy, identity, cost and the serving layer as a paid, closed wrapper. That is independent confirmation that our five-plane split is the right cut: even LangChain draws the line between "the loop that runs the agent" and "everything that makes it safe to run in production," they just monetise the second half instead of building it in the open. Nothing here suggests any agent in our design should adopt LangGraph itself: our harness (opencode, later Codex CLI) already owns its own reasoning loop, and pulling in a second, incompatible state-machine abstraction for one capability class would be net-new complexity with no constraint it helps us meet.

## 7. Where our philosophy differs and what that costs or buys us

LangGraph's state model assumes one process, one shared mutable object, mutated by every node in place; our model assumes one sandboxed process per task exchanging Git artifacts with no shared memory. Adopting LangGraph anywhere in the worker plane would mean giving up per-task isolation, which our security constraint does not allow, so this is not a live option. Their identity story is simply absent, which costs them nothing since they leave it to whoever embeds the library, and it is exactly the gap our factory-gateway and per-task ServiceAccount already close, so there is nothing to import here either way. The one place their approach outperforms ours today is the debugging UX their paid Studio product offers (visual graph, time-travel replay) against our console's lack of a trace or diff view; that gap is real and already listed in our own weak points, but the fix is to build our own replay UI, not to adopt their closed product.

## 8. Red flags and slop assessment

The library is genuinely used and maintained: 42.5k stars, 7.2k forks, 834 open issues, a commit as recent as 2026-09-27, and named production users including Klarna, Replit, Elastic and Uber. No security incident or licence change to the library itself turned up in search. The gate sits one layer up: langgraph-api, the package behind langgraph dev, langgraph build and langgraph up, is Elastic-2.0 with no public source (verified directly via pypi.org/pypi/langgraph-api/json), and LangChain's own self-hosting docs require a LangSmith licence for any of the three self-run deployment topologies. A LangChain Forum thread from November 2025 (forum.langchain.com/t/question-about-the-license/2242, not independently verified beyond the thread itself) shows at least one user confused about when the licence key is actually enforced, which suggests the boundary is not well documented even for existing customers. Treat "LangGraph is MIT and free" as true for the loop and false for the batteries-included way most people would actually run it.

## 9. Sources

- https://github.com/langchain-ai/langgraph (cloned shallow to ~/repos/market-research-clones/langgraph, commit dated 2026-09-27)
- README.md, libs/langgraph/pyproject.toml, libs/langgraph/langgraph/types.py, libs/langgraph/langgraph/pregel, libs/langgraph/langgraph/channels
- libs/checkpoint/langgraph/checkpoint/base/__init__.py, libs/checkpoint/langgraph/checkpoint/serde/encrypted.py, libs/checkpoint/langgraph/store/base
- libs/checkpoint-postgres, libs/checkpoint-sqlite (directory listing only)
- libs/prebuilt/langgraph/prebuilt/chat_agent_executor.py, tool_node.py
- libs/cli/README.md, libs/cli/langgraph_cli/config.py, libs/cli/langgraph_cli/docker.py, libs/cli/examples/langgraph.json
- examples/multi_agent, examples/human_in_the_loop, examples/plan-and-execute (directory listing only)
- https://api.github.com/repos/langchain-ai/langgraph (gh api, fetched 2026-09-29: 42463 stars, 7191 forks, 834 open issues, created 2023-08-09, MIT licence field)
- https://docs.langchain.com/langsmith/deployments (fetched 2026-09-29)
- https://www.langchain.com/langgraph (fetched 2026-09-29)
- https://pypi.org/pypi/langgraph-api/json (fetched 2026-09-29: license "Elastic-2.0")
- https://en.wikipedia.org/wiki/LangChain, https://www.langchain.com/blog/series-b, https://forum.langchain.com/t/question-about-the-license/2242, http://rvernica.github.io/2026/03/langchain-license (web search, 2026-09-29, blog post claim not independently verified beyond the PyPI licence field above)
