---
name: OpenAI Agents SDK
slug: openai-agents-sdk
url: https://openai.github.io/openai-agents-python/
repo: https://github.com/openai/openai-agents-python
category: agent-framework
license: MIT
open_source: yes
self_hostable: yes
hosting_model: pip package embedded in your own process, no hosted service of its own; tracing defaults to OpenAI's hosted dashboard unless disabled or redirected
company: OpenAI, San Francisco, founded 2015; first-party official SDK, no separate entity or funding, successor to the experimental Swarm framework
maturity: 29,761 stars, 4,830 forks, 11 open issues, about 402 contributors via the GitHub API, created 2025-03-11, last commit 2026-09-28, 30 releases at a near-weekly cadence (v0.22.1/.2/.3 across 8-17 Sep 2026)
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 2
  verification: 1
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 1
  ux: 2
  reseedable_selfhost: 1
steal:
  - "Guardrail design in docs/guardrails.md: separate input, output and tool guardrails, an explicit run_in_parallel=False/True choice between latency and guaranteed-no-side-effects, and a fail-closed rule that malformed or non-object tool-call arguments always force manual approval instead of invoking the approval callable. Worth copying verbatim into factory-gateway's own approval-callback path."
  - "RunState pause/resume in docs/human_in_the_loop.md: result.to_state() serializes a paused run, state.approve()/reject() resume it, and always_approve/always_reject decisions are sticky per tool identity and survive state.to_string()/from_string() round trips. A clean serialization boundary for 'task paused on a human' that our Temporal workflow could adopt directly instead of the ad hoc shape we have."
  - "The tracing span taxonomy in docs/tracing.md and src/agents/tracing (agent_span, generation_span, function_span, guardrail_span, handoff_span, transcription_span, speech_span, all children of one trace per Runner.run) is a ready event vocabulary for our own normalised event stream instead of inventing span names from scratch."
  - "Manifest-declared sandbox workspaces (docs/sandbox/guide.md: Manifest(entries={'repo': GitRepo(...)})) separate the fresh-session contract from live sandbox state, with named pluggable backends (Docker, E2B, Daytona, local Unix) behind one SandboxRunConfig. A clean shape to compare our TaskBrief-plus-git-branch construction against."
  - "Redaction-on-rejection in docs/guardrails.md: when an output guardrail rejects a terminal tool result, the SDK keeps replay-valid function-call metadata but replaces only the payload with a fixed placeholder ('Output withheld by an output guardrail.'). A concrete pattern for redacting a rejected agent output from our own event stream and console without breaking replay."
differs:
  - "It is a stateless client library embedded in your own process, not a service. Anything durable across restarts is the app's problem, which OpenAI's own community example proves: examples/sandbox/extensions/temporal/temporal_session_manager.py and temporal_sandbox_agent.py wrap the SDK inside literal Temporal workflows and activities. That is our factoryd-plus-Temporal shape already; the SDK gives us nothing to replace there."
  - "Identity and credentials are entirely the embedding application's problem. SECURITY.md states plainly that 'applications choose credentials, providers, tools, storage, and execution permissions' and that the SDK trusts the host app to isolate untrusted execution. Using it buys zero task-identity machinery, the opposite of our identity-belongs-to-the-task principle."
  - "The reference local sandbox backend (UnixLocalSandboxClient) runs commands directly on the host with no OS-level confinement, and the docs say outright that 'a session does not itself guarantee OS-level confinement' -- isolation is whichever backend you pick. If any agent of ours ever used SandboxAgent we would have to hard-forbid that backend and always force Docker/E2B/Daytona, the opposite of safe-by-default."
  - "Tracing ships on by default and exports to OpenAI's own hosted platform.openai.com/traces dashboard unless you call set_tracing_disabled() or register a custom processor, and it is unavailable entirely under OpenAI Zero Data Retention accounts. A vendor-coupled default that conflicts with our no-vendor-specific-service constraint until rewired to a custom exporter."
ux_verdict: Excellent developer experience for writing an agent (clean quickstart, a REPL via repl.py, graph visualisation via visualization.py, a hosted trace viewer), but there is no operator-facing surface at all for watching or approving a fleet of tasks; that is entirely the embedding app's job, unlike our console.
slop_verdict: Real and heavily used, OpenAI's own first-party SDK with 29.7k stars, near-weekly releases and a same-day-fresh commit, but its own CONTRIBUTING.md says external pull requests are not accepted at all, only issues, so "open source" here means readable and forkable, not community-governed.
---

# OpenAI Agents SDK

## 1. What it is

The OpenAI Agents SDK is OpenAI's first-party Python library (`pip install openai-agents`) for building agents, multi-agent handoffs, tool use, guardrails, sessions and voice or realtime pipelines. It is the production successor to OpenAI's earlier experimental Swarm framework. It is free and open source (MIT), distributed as a library, not a hosted product; OpenAI's income from it is indirect, through API usage of the models it calls.

The README's claim is "a lightweight yet powerful framework for building multi-agent workflows," provider-agnostic across the Responses API, Chat Completions API and "100+ other LLMs." The repository backs the multi-agent and tool-use claims with real code (`src/agents/handoffs`, `src/agents/tool.py`, `src/agents/guardrail.py`), but the "100+ other LLMs" claim is softer than it sounds: non-OpenAI routing goes through two adapters, LiteLLM and Any-LLM, both documented in `docs/models/index.md` as "best-effort, beta" rather than first-class.

## 2. Mapping to our five planes

| Plane / principle | What it does | What we do | Verdict |
|---|---|---|---|
| Signals | None. A run starts only when your code calls `Runner.run()` | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | we lead |
| Control plane | `RunState` serializes one paused run for later resume (`to_state()`/`from_string()`); no registry, scheduler or multi-run durability of its own | Temporal workflow per task, factoryd registry, policy, budgets, approvals, cost ledger | we lead |
| Worker plane | `SandboxAgent` plus `Manifest` and pluggable backends (Docker, E2B, Daytona, local Unix); isolation strength depends entirely on the chosen backend | One gVisor pod per task, read-only rootfs, default-deny egress, projected ServiceAccount token | we lead |
| Verification | Input/output/tool guardrails with tripwires; no CI, no independent model review, no merge concept | Forgejo Actions, policy gates, stronger-model review before merge | we lead |
| Merge and deploy | None, the SDK never produces a PR or a deploy | Bot merge, Flux GitOps, staged rollout | not comparable |
| Policy outside the model | `needs_approval` callables and `require_approval` on tools are app code, evaluated before the tool runs, genuinely outside the prompt | Capability YAML in Git, enforced in gateway code and network policy | equal at the mechanism level, we lead on having a declarative document |
| Identity per task | None; SECURITY.md pushes all credential and isolation decisions to the embedding application | Per-task projected, audience-scoped ServiceAccount token | we lead |
| Artifacts not chat | `RunState`/session items are structured, but the primary loop is still a conversational input/output list (`to_input_list()`) | TaskBrief in, branch, PR, event stream out | we lead |

## 3. Architecture and stack

Pure Python (3.10+), MIT licensed, `src/agents/` is the whole package: `agent.py`, `run.py`, `run_config.py`, `tool.py`, `guardrail.py`, `tool_guardrails.py`, `handoffs/`, `mcp/`, `memory/` (sessions), `models/` (OpenAI Responses and Chat Completions clients, plus `extensions/models/litellm_model.py` and an Any-LLM adapter), `sandbox/`, `realtime/`, `voice/`, `tracing/`. Core dependencies from `pyproject.toml`: `openai`, `pydantic`, `mcp`, `websockets`, plus optional extras for `voice`, `viz` (Graphviz), `litellm`, `any-llm`, `sqlalchemy` and `redis` sessions, `encrypt` (encrypted sessions), and `dapr`.

Sessions (`docs/sessions/`) persist conversation history via `SQLiteSession`, SQLAlchemy, Redis, or an encrypted wrapper, purely for conversational continuity, not task state. Tracing (`docs/tracing.md`) wraps a `Runner.run()` call in a `trace()` with nested spans (agent, generation, function, guardrail, handoff, transcription, speech) and exports by default to OpenAI's hosted dashboard at `platform.openai.com/traces`; custom trace processors can redirect or add destinations, and tracing can be disabled per run or globally. There is no server, queue or database the SDK itself owns; deployment shape is "however your app deploys." A community-maintained example (`examples/sandbox/extensions/temporal/`) shows the intended way to make an agent durable: wrap it in an actual Temporal workflow using `temporalio.contrib.openai_agents.OpenAIAgentsPlugin`, which is the same pairing our own `factoryd` already uses, not a substitute for it.

## 4. UX

From zero to a first result for a developer: `pip install openai-agents`, set `OPENAI_API_KEY`, write an `Agent(name=..., instructions=...)`, call `Runner.run_sync(agent, "prompt")`. That is four steps, and the README's own hello-world example runs in under ten lines. A REPL (`agents.repl.run_demo_loop`, `docs/repl.md`) gives an interactive terminal loop for manual testing, and `visualization.py` renders an agent's tools and handoffs as a Graphviz graph.

None of this is operator UX. There is no dashboard, kanban board, or approval UI shipped with the SDK; a paused run surfaces as a Python list of `ToolApprovalItem` objects in `RunResult.interruptions`, and the calling application must build whatever UI shows that to a human and calls `state.approve()`/`reject()`. The only visual surface OpenAI ships is the hosted traces dashboard, which shows LLM calls, tool calls, guardrails and handoffs after the fact, not a live intervention surface. Compared with our console, this SDK is a component library one level below anything a human would look at directly; it would sit inside a worker, not replace the console.

## 5. Security, identity, sandbox, policy, cost

Identity. None is provided. `SECURITY.md` states the trust model explicitly: "Applications choose credentials, providers, tools, storage, and execution permissions," and model or tool output "does not by themselves authorize access to host resources or credentials." The SDK carries no API keys, tokens or scoping logic of its own beyond whatever `AsyncOpenAI` client or provider credentials you pass it.

Sandbox. `SandboxAgent` plus `Manifest` is a real, well-designed abstraction (`docs/sandbox/guide.md`), but isolation strength is delegated entirely to the backend you choose. The reference `UnixLocalSandboxClient` runs directly on the host with no OS-level confinement; Docker, E2B and Daytona backends exist for actual isolation, but the docs are explicit that "a session does not itself guarantee OS-level confinement."

Policy. `needs_approval` (sync or async callables) on `function_tool`, `Agent.as_tool`, `ShellTool` and `ApplyPatchTool`, plus `require_approval` on MCP servers, run as app code before a tool executes, so a prompt genuinely cannot self-approve a sensitive call. This is real, but it is per-tool wiring the app author does, not a separate enforced policy document, and it has no network-layer counterpart.

Cost. `usage.py` reports token counts and (where providers return it) cost-relevant usage per run, surfaced on `RunResult.usage`. There is no cap, hold, budget or ledger anywhere in the SDK; a runaway agent stops only at `RunConfig.max_turns` or when your own code decides to stop it.

## 6. What we should take from it

Narrow: the guardrail fail-closed rule for malformed tool arguments (docs/guardrails.md) is a one-line but important default worth copying into `factory-gateway`'s own approval path verbatim. The `RunState` serialize/approve/resume cycle with sticky per-tool-identity decisions is a cleaner shape for "paused on a human" than anything we have documented for our Temporal workflow today, and costs nothing to borrow conceptually since we already use Temporal. The tracing span taxonomy is a ready vocabulary for our own event stream schema. The output-guardrail redaction-on-rejection behaviour (keep replay-valid metadata, replace only the payload) answers a redaction question our own console will eventually face.

Broad: nothing here changes our product shape. This is a component for writing one agent process, not a factory; it has no opinion on issues, PRs, deploys, or fleets of tasks. The one broad idea worth carrying is the discipline of keeping guardrails, approvals and tracing as small composable primitives on the agent object rather than a monolithic "safety layer," which matches how we already want capability policy, budgets and supervision to be layered rather than fused.

## 7. Where our philosophy differs and what that costs or buys us

Adopting this SDK inside a worker would not remove or shrink anything we build for the control plane: OpenAI's own Temporal example proves the SDK expects to be wrapped by a real durable-execution layer, which is exactly what `factoryd` already is. There is no cost here because we are not choosing between the two; they are not substitutes.

Its "identity is the app's problem" stance is the opposite of our identity-belongs-to-the-task principle, and that is a real cost only if we ever put this SDK inside an agent's sandbox and assumed it added any credential safety: it would not, and `factory-gateway` would still have to be the only thing holding scoped tokens.

The sandbox abstraction is more flexible on paper than our single `Harness` interface (multiple backends behind one API), but flexibility here means the safety property is optional per backend rather than structural. Our narrower, gVisor-only worker plane is less flexible but never accidentally unsandboxed, which is the better trade for us given the security-without-half-measures constraint.

Our worker plane is Go driving a CLI harness (opencode today, Codex CLI as the named successor); this SDK is Python-only. No agent in our current design should adopt it, since doing so would add a second language and runtime to the worker image to get guardrail, approval and tracing primitives we already get from policy YAML, `factory-gateway`, the supervisor and SigNoz. It would only be worth reconsidering if we ever built a Python-native internal tool (for example a triage bot) that needed a quick agent loop; even then, it competes with just calling LiteLLM directly for something that small.

## 8. Red flags and slop assessment

None of the usual open-core red flags apply: MIT licence throughout, no paid tier, no feature gating, first-party OpenAI maintenance, near-weekly releases, a commit from 2026-09-28 (the day before this report). The open-issue count (11) is unusually low for a 29.7k-star repository, which reads as aggressive triage rather than neglect given the release cadence. The one real governance flag is `CONTRIBUTING.md`'s statement that "Pull requests are limited to repository collaborators. We do not accept pull requests from non-collaborators, including documentation or example changes." MIT and public does not mean community-governed here; it is OpenAI's code with public issue reporting, not a project outsiders can meaningfully steer. Independent 2026 reviews (DEV Community, a Medium piece, Mem0's blog) are consistently positive about its minimalism versus LangChain or CrewAI, but none found evidence of hard production post-mortems; treat the praise as reviewer opinion, not field data. No licence changes or security incidents surfaced in search.

## 9. Sources

- Repository clone: ~/repos/market-research-clones/openai-agents-sdk (shallow, depth 1, last commit 2026-09-28 22:04:26 -0700)
- Files read: README.md, pyproject.toml, CONTRIBUTING.md, SECURITY.md, src/agents/ directory listing, src/agents/extensions/ directory listing, docs/ directory listing, docs/guardrails.md, docs/human_in_the_loop.md, docs/tracing.md, docs/sandbox/guide.md, docs/models/index.md, docs/models/litellm.md, docs/sessions/index.md, examples/sandbox/extensions/temporal/temporal_session_manager.py
- https://github.com/openai/openai-agents-python (browsed 2026-09-29)
- https://openai.github.io/openai-agents-python/ (docs mirrored in the clone, read 2026-09-29)
- gh api repos/openai/openai-agents-python (fetched 2026-09-29): 29,761 stars, 4,830 forks, 11 open issues, MIT licence, created 2025-03-11, pushed 2026-09-29
- gh api repos/openai/openai-agents-python/contributors?per_page=1&anon=1 (fetched 2026-09-29): Link header last page=402, about 402 contributors
- gh api repos/openai/openai-agents-python/releases (fetched 2026-09-29): 30 releases, v0.22.3 2026-09-17, v0.22.2 2026-09-09, v0.22.1 2026-09-08
- WebSearch "OpenAI Agents SDK openai-agents-python review 2026 production experience" (2026-09-29): https://dev.to/stacknotice/openai-agents-sdk-building-production-ai-agents-2026-4d04, https://medium.com/@aman.kohli1/building-production-grade-ai-agents-with-the-openai-agents-python-sdk-486496869212, https://mem0.ai/blog/openai-agents-sdk-review, https://agentlas.pro/frameworks/openai-agents-sdk/
