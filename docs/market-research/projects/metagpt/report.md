---
name: MetaGPT
slug: metagpt
url: https://github.com/FoundationAgents/MetaGPT
repo: https://github.com/FoundationAgents/MetaGPT
category: agent-framework
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted only (pip package or local clone), bring your own LLM endpoint
company: DeepWisdom, Shenzhen, founded around the paper's 2023 release. Raised about $30.6M in 2025 (Ant Group, Cathay Capital, Jinqiu, Baidu Ventures and others) for its commercial spin-off, not for MetaGPT itself
maturity: 70.7k stars, 8.98k forks, about 116 contributors, first commit 2023-06-30, last real commit 2026-01-21 (trivial), last tagged release v0.8.2 on 2025-03-09
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 1
  ux: 2
  reseedable_selfhost: 3
steal:
  - ActionNode (metagpt/actions/action_node.py) forces an LLM turn to emit a typed, schema-checked document rather than free text, one concrete way to make a harness turn produce a structured TaskBrief-shaped artifact.
  - Roles hand off through ProjectRepo/FileRepository, not chat: WritePRD writes docs/prd/*.json, WriteDesign writes docs/system_design/*.json, the next role reads the file. Validates our own "artifacts not chat" principle from the other direction.
  - BM25ToolRecommender (metagpt/tools/tool_recommend.py) narrows a large registered tool set to the k most relevant per turn, worth copying if our worker's tool list grows past what fits comfortably in a system prompt.
  - The experience pool (metagpt/exp_pool) caches (context, action, outcome) so a repeated task shape can skip a fresh model call, a cheap idea for cutting spend on repeat-shaped tasks.
  - HumanProvider (metagpt/provider/human_provider.py) substitutes a human typing in the terminal for the LLM backend of any single role, a minimal way to get a human-in-the-loop checkpoint without a separate approval workflow.
differs:
  - No sandbox anywhere. ExecuteNbCode runs a Jupyter kernel and tools/libs/shell.py calls subprocess.run(shell=shell) directly in the same process as the framework. Reusing this worker code means wrapping it in a sandbox first, not adapting it.
  - Identity is one static provider API key in ~/.metagpt/config2.yaml, read by every role in every run. There is no task-scoped credential to copy, only a pattern to strip out before reuse.
  - Policy is whichever Python functions are registered in tool_registry and whichever of them the LLM's free-text command the role parses (parse_commands in role_zero.py) happens to name. Nothing enforces a capability outside that parse step.
  - Cost control is a single in-process float compared once per round (Team._check_balance), not a pre-call hold. The budget can already be blown by the time it is checked.
ux_verdict: Genuinely fast from pip install to a generated repo (three commands, one idea string), but it is a batch run watched as scrolling terminal output, not a workflow with approval or mid-run intervention beyond Ctrl-C or swapping a role's LLM for HumanProvider.
slop_verdict: Real and heavily used code, not a landing page, but the open-source repository has gone quiet since mid-2025 (README edits and one Windows-terminal patch are the last commits, pushed 2026-01-21) while the same team's funding and attention moved to its closed commercial product, renamed Atoms in January 2026. Treat it as a mature but now lightly-maintained research artifact.
---

# MetaGPT

## 1. What it is

MetaGPT is a Python framework from DeepWisdom (Shenzhen) that plays out a software company as a set of LLM roles: ProductManager, Architect, ProjectManager, Engineer, QaEngineer, orchestrated by a fixed SOP so that `Code = SOP(Team)`. It takes one requirement string and outputs a small generated repository. It is sold as open source research tooling (MIT licence, arXiv paper, ICLR-adjacent AFlow and SPO follow-up papers) rather than as a product; the product built on the same team's later work is MGX, launched February 2025 and renamed Atoms in January 2026, which is closed and separate from this repository.

The README claims a company-like collaboration process automating requirements through to code and tests. The code shows a narrower reality: a `Team` of `Role` objects passing structured `Message` objects through an in-memory `Environment`, each role running one or more `Action`s (`WritePRD`, `WriteDesign`, `WriteCode`, `RunCode`) and writing its output as a JSON or code file under a generated project directory (`metagpt/utils/project_repo.py`). There is a second, more general track (`RoleZero`, `DataInterpreter`, `Engineer2` in `metagpt/roles/di/`) that lets one role plan, call tools, run a notebook kernel and use a browser, aimed at coding and data-analysis tasks beyond the fixed SOP.

## 2. Mapping to our five planes

| Plane / principle | What MetaGPT does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work starts from a CLI argument or a library call, never an issue, webhook or alert | Forgejo issues, webhooks, SigNoz alerts | not comparable |
| Control plane | A Team/Environment pair held in process memory for one run, optionally serialized to a JSON file for later resume | Temporal workflow per task, Postgres task registry, policy, approvals, audit | we lead |
| Worker plane | Roles run in the same process and host as the framework; code execution uses a local Jupyter kernel or a direct subprocess call | gVisor pod per task, read-only root FS, default-deny egress | we lead |
| Verification | An LLM code-review action and an optional QA/run-tests step gated by a flag | Forgejo Actions, policy gates, a separate stronger-model review | we lead |
| Merge and deploy | No loop; a PyGithub-backed pull-request tool exists for an agent to call if asked, no gate before it | Bot merge after approval or auto rule, Flux deploy, staged rollout | not comparable |
| Policy outside the model | Absent. A capability is whatever function is registered in the tool registry and whichever of them the role's freeform LLM output happens to name | Capability rules in Git, enforced in gateway code and network policy | we lead |
| Identity per task | Absent. One static provider API key in a local config file, shared by every role and every run | Short-lived, audience-scoped ServiceAccount token per task | we lead |
| Artifacts not chat | Partial match. Roles hand off structured documents (PRD, design, task list, code) through a project repo abstraction, not raw chat | TaskBrief in, branch and PR and event stream out | equal |

## 3. Architecture and stack

Pure Python (3.9 to 3.11), Pydantic v2 models throughout. No queue, no workflow engine, no database: state is a Pydantic object tree, persisted only via explicit serialize and deserialize calls writing JSON to local disk. Deployment shape is a pip package, a plain Dockerfile (a Node and Python base image with Mermaid CLI for diagrams, meant for development, not isolation), and a devcontainer compose file for local development. It talks to models through per-provider adapter modules (OpenAI, Azure, Anthropic, Bedrock, Gemini, Ollama, Zhipu, Qianfan, Spark and others) selected by one config field, each adapter holding its own raw key read from a local YAML file. Tool execution for the newer DataInterpreter and RoleZero roles runs through a tools library: a real subprocess-backed terminal and shell tool, a Jupyter-kernel-backed notebook executor, and a Playwright-backed browser tool, all invoked in-process with the framework's own permissions.

## 4. UX

Interface is CLI and Python library only, no web UI in this repository (the team's web UI is the closed commercial product). Zero to first result is three steps: install the package, run an init-config command then edit the generated YAML to add a provider key, then run one CLI command with an idea string. Output lands in a local workspace folder. While it runs, a Rich-based console prints each role's think and act steps and, for the notebook-executing roles, streams cell output live. Intervention is coarse: interrupt to stop, or swap a role's model for a human-input provider so a person types the "model" response for that one role. There is no pause, approve or redirect workflow, no diff view, no kanban, nothing resembling our console's task lanes.

## 5. Security, identity, sandbox, policy, cost

Identity: a single static provider API key in a YAML file on the machine running MetaGPT, read directly by whichever provider adapter is selected. No scoping, no rotation, no per-task anything.

Sandbox: none. Code and shell commands execute as the framework's own OS user, in the framework's own process or a locally spawned notebook kernel, with whatever filesystem and network access that process already has.

Policy: entirely a function of what is registered in the tool registry and what the role's own LLM output parses into a call. There is no separate enforcement layer, the trust boundary is the prompt.

Cost: a cost manager accumulates prompt and completion tokens against a static per-model price table and compares the running total to a max-budget value once per round, raising an exception if already over. It is an in-process courtesy counter, not a pre-call hold, and nothing stops one expensive round from exceeding the whole budget before the check fires.

## 6. What we should take from it

Narrow: the schema-checked structured-output node used for every LLM turn is a clean pattern for forcing a harness turn to emit a typed artifact instead of free text, directly applicable to how we shape TaskBrief responses. The BM25-based tool recommender is a cheap, already-built answer to "the tool list got too long for the system prompt." The experience-pool idea, caching context-action-outcome tuples, is worth a look if we ever see the same task shape recur often enough to skip a model call.

Broad: MetaGPT's role-to-role handoff through files, not chat, is independent validation of our own "artifacts not chat" principle, for a different reason (research reproducibility rather than security) but the same mechanism. Its human-as-model trick, plugging a person in as the backend for one role, is a low-effort escape hatch worth remembering for debugging our own harness locally, though it would not fit our production approval flow.

## 7. Where our philosophy differs and what that costs or buys us

MetaGPT has no sandbox, no policy layer and no per-task identity because it was built as a research artifact to demonstrate multi-agent SOP collaboration, run by its own author on their own machine with their own key. Reusing its worker code (notebook execution, shell tool, browser tool) as-is would violate our security-without-half-measures constraint outright; every one of those tools would need to move behind our sandboxed pod and default-deny egress before we could use it. Where MetaGPT wins is minimalism: zero infrastructure, a single install, useful on a laptop with a local model in minutes. That is not available to us because our constraint set (durable audit, hard spend caps, sandboxed multi-tenant workers) requires the control plane MetaGPT deliberately does not have.

## 8. Red flags and slop assessment

The repository moved from its original owner account to a new organisation account (old links redirect, same code). GitHub shows the last substantive commits are a terminal-compatibility patch (November 2025) and a "simplify" refactor merge (June 2025); the most recent push (January 2026) is a merge of that same patch. Before that, commit density visibly drops off after February 2025, the same month the team launched its commercial product. The company behind MetaGPT raised roughly thirty million US dollars in 2025 from several named investors for that separate product, renamed in January 2026, which is closed source and unrelated to this repository's licence. Open issues stand at 143 on GitHub. Independent reviews found in this research note real production limits: generated code needs treating as a draft, cost and context loss on long multi-agent runs, and a steeper learning curve than lighter frameworks. No security advisories found. No open-core gating inside this repository itself, the gating happens by product line: the framework stays open, the commercial app does not.

## 9. Sources

https://github.com/FoundationAgents/MetaGPT, files read: README.md, Dockerfile, SECURITY.md, setup.py, requirements.txt, metagpt/team.py, metagpt/software_company.py, metagpt/config2.py, metagpt/environment/base_env.py
metagpt/roles/di/data_interpreter.py, metagpt/roles/di/role_zero.py, metagpt/actions/di/execute_nb_code.py, metagpt/tools/libs/shell.py, metagpt/tools/libs/terminal.py, metagpt/tools/libs/git.py, metagpt/utils/cost_manager.py, metagpt/utils/git_repository.py, metagpt/provider/human_provider.py, metagpt/utils/project_repo.py
GitHub repository API (2026-09-29): stars, forks, licence, created date, pushed date, open issue count
GitHub commits API (2026-09-29): recent commit dates and messages
GitHub contributors API (2026-09-29): contributor count
GitHub releases API (2026-09-29): last tagged release
Web search "MetaGPT DeepWisdom funding MGX.dev commercial product 2025" (2026-09-29), including https://kr-asia.com/from-metagpt-to-atoms-deepwisdom-leads-chinas-push-into-vibe-coding and https://www.cathaycapital.com/are-you-ready-to-start-your-own-company-when-ai-learns-to-collaborate/
Web search "MetaGPT geekan agent framework review not maintained abandoned criticism" (2026-09-29), including https://www.promptquorum.com/power-local-llm/metagpt-review and https://www.zhongzhuzhou.org/blog/2026-03-16-2026-03-16-MetaGPT-technical-review-en/
