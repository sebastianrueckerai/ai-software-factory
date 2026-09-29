---
name: CrewAI
slug: crewai
url: https://crewai.com
repo: https://github.com/crewAIInc/crewAI
category: agent-framework
license: "mixed: MIT (crewai, crewai-core, crewai-cli, crewai-tools libraries), proprietary (CrewAI AMP platform)"
open_source: partial
self_hostable: partial
hosting_model: library is self-hosted by definition (pip/uv install, no server); CrewAI AMP is a hosted control plane, with an unverified on-premise option claimed only in marketing copy
company: CrewAI Inc., San Francisco, founded 2023 by Joao Moura. $18M inception plus Series A (Oct 2024, Insight Partners, Boldstart Ventures, Craft Ventures); a 2026 Series B (~$20-38M, sources disagree) is reported by aggregators but has no confirmed press release
maturity: 59,175 stars, 8,606 forks, 497 open issues, 336+ contributors (paginated), repo created 2023-10-27, last commit 2026-09-29, patch releases roughly weekly (1.15.21 to 1.15.23 across 9-19 days)
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 0
  identity_per_task: 1
  cost_control: 0
  ux: 2
  reseedable_selfhost: 3
steal:
  - "Fingerprint dual-ID (crewai/security/fingerprint.py): every agent gets an auto human-readable id plus a UUID, creation timestamp and free-form metadata for tracing and audit. Cheap idiom worth copying for tagging every log line and event with a stable per-agent identity, independent of our task ID."
  - "HumanInputProvider protocol (crewai/core/providers/human_input.py): human-in-the-loop is one Protocol with sync and async variants, so the default blocking CLI input() can be swapped for a different channel without touching agent logic. Same seam we would want if the console ever needs to inject approval into a running agent loop rather than only gate a workflow step."
  - "LLMGuardrail and HallucinationGuardrail (crewai/tasks/llm_guardrail.py, hallucination_guardrail.py): a second, cheap LLM call checks a task's output against a rule or the source context before it is accepted, with automatic retry on failure. A smaller-scale version of our own 'cheap detectors before a stronger model' philosophy, worth a look for a fast pre-check ahead of our review-frontier gate."
  - "DeployValidator (crewai_cli/deploy/validate.py): `crewai deploy` runs local, deterministic checks (lockfile present, project shape valid) and blocks the network step on failure. Confirms the value of ordering gates cheap-and-local first, which is already our own CI policy."
  - "First-party MCP client and A2A wrapper live inside the framework core (crewai/mcp/, crewai/a2a/), not as a bolted-on plugin. crewai/mcp/tool_resolver.py, which maps MCP tool schemas onto CrewAI's own Tool type, is worth a skim if we ever proxy more MCP tools through factory-gateway."
  - "agents/*.jsonc plus crew.jsonc (the new default scaffold from `crewai create crew`): agent role, goal, backstory and tool list live in a git-diffable JSON file, not Python, with {placeholder} templating filled at run time. A cleaner model than a Python class for any of our own agent configuration that should be editable without a code change."
differs:
  - "CrewAI has no sandbox, no network policy and no credential brokering anywhere in the codebase. A Task's tool is plain Python that runs in the calling process with the calling process's full environment (crewai_core/tool_credentials.py copies os.environ verbatim into tool subprocess calls). Adopting CrewAI as a harness would not reduce our sandboxing or identity work by one line; every tool call would still need to go through our own gateway and gVisor pod."
  - "security/security_config.py states its own intent plainly: 'Authentication credentials *TODO*', 'Scoping rules *TODO*', 'Impersonation/delegation tokens *TODO*'. Policy enforcement outside the prompt does not exist in the open-source library; the commercially load-bearing half (CrewAI AMP: RBAC, audit trails, governance, webhook triggers) is entirely proprietary SaaS reached only through a 'book a demo' page, with no pricing, no self-hosted technical detail and no security specifics published. That fails our 'open source with an escape hatch' bar the moment governance is actually needed."
  - "The Crew abstraction is autonomy-first: agents role-play and can enter a hierarchical manager's multi-round delegation loop with no deterministic path guarantee. Independent 2026 reviews (SimilarLabs, AgileSoftLabs) describe this trading away debuggability and cost predictability at scale, agents can 'enter extended deliberations' that burn budget with no built-in cap. That is the opposite bet from our supervisor-plus-hard-budget model, which exists precisely to bound that failure mode."
ux_verdict: Fewer steps to a first local multi-agent run than our console needs for a first task (scaffold, edit two JSON files, `crewai run`), but once a crew is executing there is no view into it beyond stdout and a blocking input() call for human-in-the-loop; CrewAI AMP's dashboard, tracing and approval UI could not be verified beyond marketing screenshots and copy.
slop_verdict: Real and heavily used, 59k stars, weekly patch releases, a claimed 2 billion agent executions in the last 12 months, and 336+ contributors. The paid AMP layer, which is where governance and security live, is pure marketing copy behind a demo gate with no pricing, no self-hosting detail and no independent verification found anywhere.
---

# CrewAI

## 1. What it is

CrewAI is an MIT-licensed Python framework, maintained as a monorepo (`lib/crewai`, `lib/crewai-core`, `lib/cli`, `lib/crewai-tools`, `lib/crewai-files`, `lib/devtools`) for building multi-agent LLM systems. It offers two primitives: Crews, teams of role-played agents that collaborate autonomously through delegation, and Flows, event-driven Python workflows that call Crews or single LLM calls with explicit state and branching. CrewAI Inc. sells CrewAI AMP on top, a hosted control plane pitched for "observability, governance, security, and enterprise support," reachable only through `app.crewai.com` or a sales demo.

The README's claim ("over 100,000 developers certified," "the standard for production-ready agentic automation") is marketing. What the repository actually shows is a genuinely large, active open-source library (59,175 stars, weekly releases) with a thin, three-file security module that is explicitly unfinished, and a separate closed-source product that carries every enterprise capability the marketing page promises.

## 2. Mapping to our five planes

| Plane / principle | What CrewAI does | What we do | Verdict |
|---|---|---|---|
| Signals | None in the open-source library. CrewAI AMP has "triggers" (`crewai_cli/triggers/main.py`), but every call goes through `PlusAPIMixin` to CrewAI's own hosted API, not a self-hosted webhook receiver | Forgejo webhooks, SigNoz alerts, factoryd intake API | we lead |
| Control plane | `Flow` state checkpointed to a local SQLite file (`crewai/flow/persistence/sqlite.py`), whose own docstring calls it "suitable for development and testing, or production use cases with moderate performance requirements." No scheduler, no approvals, no cost ledger, no cross-process durability | `factoryd` with a Temporal workflow per task, Postgres, budgets, approvals, audit | we lead |
| Worker plane | Tools run as plain Python in the calling process, full access to `os.environ` (`crewai_core/tool_credentials.py`) | gVisor pod per task, read-only root FS, default-deny egress | we lead |
| Verification | `LLMGuardrail` / `HallucinationGuardrail` re-check a task's output with a second LLM call before accepting it, with retry | Forgejo Actions, policy gates, stronger-model review | we lead on rigor; their guardrail is a smaller version of the same idea |
| Merge and deploy | `crewai deploy` zips the project and uploads it to CrewAI's cloud after local `DeployValidator` checks | bot merge after approval, Flux staged rollout | not comparable (no code-change target) |
| Policy outside the model | `security/security_config.py` marks authentication, scoping and delegation tokens as `*TODO*` in the docstring itself; nothing enforces capability outside whatever the tool's own Python code does | Capability policy as a YAML document in Git, enforced in `factory-gateway` and network policy | we lead |
| Identity per task | `Fingerprint`: an auto-generated UUID, human-readable id, timestamp and metadata per agent, used for tracing/audit, not for authorization or credential scoping | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | Agents exchange free-text context and task outputs (delegation is literal role-play dialogue in `Crew`'s hierarchical process); `Flow` state is typed but internal to one process | `TaskBrief` in, branch, PR and event stream out | we lead |

## 3. Architecture and stack

Pure Python (`>=3.10,<3.14`), managed with `uv`. `lib/crewai` holds the framework: `agent/`, `crews/`, `tasks/`, `flow/` (with `flow/persistence`, `flow/dsl`, `flow/runtime`, `flow/async_feedback`), `memory/` (Chroma/LanceDB/Qdrant-backed vector storage via `memory/storage/factory.py`), `knowledge/` (RAG ingestion), `mcp/` and `a2a/` (first-party MCP client and Agent2Agent protocol support), `security/` and `auth/` (thin, see above), `telemetry/` (OpenTelemetry-based, opt out via `OTEL_SDK_DISABLED`). `lib/crewai-core` holds cross-cutting utilities shared with the CLI: `token_manager.py` (Fernet-encrypted local token store for the developer's own CrewAI AMP login, not a task credential), `plus_api.py` (client for the proprietary API), `settings.py`, `project.py`. `lib/cli` is the `crewai` command: `create crew` scaffolds `agents/*.jsonc` + `crew.jsonc` (or `--classic` for the older `crew.py`/YAML layout), `run`, `deploy` (zips and uploads, `crewai_cli/deploy/`), `triggers` and `enterprise` (both thin wrappers over the hosted Plus API). No queue, no external orchestrator, no container runtime anywhere in this codebase: the framework's entire "infrastructure" is an optional local SQLite file and an optional Chroma/LanceDB index for memory.

## 4. UX

Zero to a first result is short: `uv tool install crewai`, `crewai create crew <name>`, edit `agents/researcher.jsonc` and `crew.jsonc`, `crewai run`. That is four steps and two small JSON edits, shorter than our own console's path from a filed issue to a running task. While a crew executes, the user sees stdout (verbose agent/task logs) only; the one built-in intervention point is a blocking `input()` call when a task sets `human_input: true` (`crewai/agents/crew_agent_executor.py`), which pauses the whole process until someone types a reply in the same terminal. There is no pause, redirect or budget-extend mechanism visible in the open-source code. CrewAI AMP's marketing page claims a dashboard with tracing, RBAC and "human-in-the-loop checkpoints," but the page gives no screenshots, no pricing and no operational detail, so none of that could be verified.

## 5. Security, identity, sandbox, policy, cost

**Sandbox**: none. Tool code runs as plain Python in the host process with the full calling environment; `build_env_with_all_tool_credentials()` copies `os.environ` and adds private-index passwords for tool installs. **Identity**: `Fingerprint` is a UUID and metadata bag for tracing, not a credential; nothing verifies who or what is calling a tool. **Policy**: `SecurityConfig`'s own docstring lists authentication, scoping and delegation as unimplemented; a `@crewai.tool` is just a Python function, so any capability restriction is whatever the developer hand-writes into that function. **Cost**: `types/usage_metrics.py` counts prompt and total tokens per execution for reporting; there is no cap, no hold, no budget enforcement anywhere in the library. Credentials for model providers and tool APIs live in the developer's own `.env` file, read directly by the process. All of this is consistent with CrewAI's own framing: it is a library for code the developer already trusts, not a system for constraining code an LLM just wrote.

## 6. What we should take from it

For our design, the practical answer is that no agent in our stack should adopt CrewAI as its harness or framework. Our worker plane runs one disposable, sandboxed coding agent per task behind the `Harness` interface; CrewAI's Crew and Flow solve a different problem, coordinating several distinct-role LLM calls inside one trusted process. Temporal already gives us the workflow layer (state, retries, human wait states) that `Flow`'s local SQLite persistence approximates at a much smaller scale, so adding CrewAI as a second in-process orchestration layer for a future capability class (analyzer, release-notes agent) would be a redundant dependency, not a gap-filler; rung 2 of the ladder ("already in the codebase") applies. The narrow, copyable pieces are the small mechanisms listed under steal: the fingerprint-per-agent idiom for tracing, the pluggable human-input Protocol as a seam if the console ever needs to inject a live reply, the guardrail-before-accept pattern as a cheap pre-check ahead of our own model review, and the deploy-time local validator as confirmation that our cheap-checks-first CI ordering is the right default.

## 7. Where our philosophy differs and what that costs or buys us

CrewAI's core bet, that agents can be given roles and goals and trusted to collaborate autonomously with minimal scaffolding, buys real speed to a first prototype, which is exactly what the independent 2026 reviews (SimilarLabs, Vibecoding, AgileSoftLabs) credit it for. It costs determinism and cost predictability at scale: those same reviews describe agents entering unbounded "deliberations" in the hierarchical process and debugging turning into detective work once several agents are composed. That is the specific failure mode our budget holds, supervisor escalation and explicit workflow gates exist to prevent, so copying CrewAI's autonomy-first model at the core would directly undercut our "spending has hard caps" and "policy lives outside the model" constraints. Where CrewAI's approach is genuinely better for its target user, fast iteration on a single trusted process with no infrastructure, our constraint (multi-tenant, untrusted-code-safe, spend-capped) is the reason we cannot take the same shortcut; the price of our security stance is a slower path from zero to a first running agent than CrewAI's four-step scaffold.

## 8. Red flags and slop assessment

The open-source side is unambiguously real: 59,175 stars, 8,606 forks, weekly patch releases through 2026-09-29, 336+ contributors, and a company blog claiming 2 billion agent executions over the trailing 12 months (unverified, self-reported). No licence change or security incident surfaced in search. The clearer red flag is the open-core split itself: the security module that would matter for any regulated or multi-tenant use is three files marked `*TODO*` in the free library, while every governance, RBAC, audit and trigger feature is locked behind a proprietary, demo-gated cloud product with no visible pricing or self-hosting detail, the same shape our own vision doc's constraint 3 ("an escape hatch if maintainers gate needed features") warns against. Funding is murkier than usual: a 2024 $18M seed-plus-Series-A is well documented, but a reported 2026 Series B (figures ranging $20.5M to $44.5M across aggregators) has no confirmable press release, a mild caution flag for a vendor whose AMP product this report could not evaluate first-hand.

## 9. Sources

- https://github.com/crewAIInc/crewAI (cloned 2026-09-29, depth 1)
- /home/womb/repos/market-research-clones/crewai/README.md
- /home/womb/repos/market-research-clones/crewai/LICENSE
- /home/womb/repos/market-research-clones/crewai/lib/crewai/pyproject.toml
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/security/security_config.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/security/fingerprint.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/auth/token_manager.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai-core/src/crewai_core/token_manager.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai-core/src/crewai_core/tool_credentials.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/core/providers/human_input.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/agents/crew_agent_executor.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/flow/persistence/sqlite.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/tasks/llm_guardrail.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/tasks/hallucination_guardrail.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/types/usage_metrics.py
- /home/womb/repos/market-research-clones/crewai/lib/crewai/src/crewai/mcp/tool_resolver.py
- /home/womb/repos/market-research-clones/crewai/lib/cli/src/crewai_cli/deploy/main.py
- /home/womb/repos/market-research-clones/crewai/lib/cli/src/crewai_cli/deploy/validate.py
- /home/womb/repos/market-research-clones/crewai/lib/cli/src/crewai_cli/triggers/main.py
- gh api repos/crewAIInc/crewAI (2026-09-29)
- gh api repos/crewAIInc/crewAI/contributors --paginate (2026-09-29)
- gh api repos/crewAIInc/crewAI/releases (2026-09-29)
- https://crewai.com/amp (fetched via WebFetch, 2026-09-29)
- WebSearch "CrewAI funding Series A valuation 2025 2026" (2026-09-29), incl. https://getlatka.com/companies/crewai.com, https://en.wikipedia.org/wiki/CrewAI, https://www.crunchbase.com/funding_round/crewai-series-a--d2a29a84
- WebSearch "CrewAI criticism reddit over-engineered production agent framework review 2026" (2026-09-29), incl. https://similarlabs.com/blog/crewai-review, https://vibecoding.app/blog/crewai-review, https://www.agilesoftlabs.com/blog/2026/06/crewai-in-production-2026-real-lessons
- WebSearch "CrewAI vs LangGraph 2026 comparison" (2026-09-29), incl. https://www.zenml.io/blog/langgraph-vs-crewai, https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen
