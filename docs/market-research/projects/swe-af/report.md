---
name: SWE-AF and CodeAF (AgentField)
slug: swe-af
url: https://agentfield.ai
repo: https://github.com/Agent-Field/SWE-AF
category: factory-orchestrator
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: Self-hosted only. Both products run as a container or a single binary with no managed SaaS offering. The shared AgentField control plane self-hosts as a binary, Docker Compose or Kubernetes, with an unpriced Enterprise AgentField tier layered on top for governance and audit features.
company: Agent Field Inc, Toronto. Founded by Oktay Goktas (CEO) and Santosh Kumar Radha (CTO). Publicly launched in December 2025. No disclosed funding round found in press coverage or Crunchbase.
maturity: SWE-AF has 1018 stars, 177 forks, 7 open issues and 12 contributors, was created 2026-02-04, last pushed 2026-09-24, and was rewritten from Python to Go mid-life. CodeAF has 132 stars, 21 forks, 267 open issues and 5 contributors, was created 2026-08-05, carries an early preview label, last pushed 2026-09-28, and has merged over 1650 pull requests in under two months, almost all from one author. The shared AgentField runtime has 2588 stars, 424 forks and 24 open issues, was created 2025-11-05 and last pushed 2026-09-29.
similarity: 3
axes:
  signals_intake: 1
  control_plane: 3
  sandbox_isolation: 0
  verification: 3
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 4
  ux: 4
  reseedable_selfhost: 3
steal:
  - "The deterministic git fast-path, mechanical worktree setup, conflict-free merge and cleanup done by plain git calls instead of an LLM agent, with the LLM called in only for real conflicts. SWE-AF's own docstring says this replaced 23 of 88 agent calls and about 20 minutes of a 103-minute build ('swe_af/execution/git_fast_path.py'). A ready template for cutting our own agent-call count on mechanical git steps."
  - "The CI-gate anti-cheat rule. The bounded, two-cycle LLM fix loop that runs after a failing PR check is explicitly forbidden from 'pytest.skip', 'xfail', commenting tests out or loosening assertions. Worth lifting near verbatim into our own reproduction-gate fix prompts."
  - "Typed, severity-rated technical debt objects instead of silent scope-narrowing. When an issue cannot fully meet its acceptance criteria, the result carries a structured item with a severity and a reason that survives into the PR body, rather than the agent quietly declaring success."
  - "Risk-proportional review depth. A middle-loop Issue Advisor can route a flagged issue into a four-call path with QA, reviewer and a synthesiser running in parallel, while ordinary issues take a cheap path with up to five inner coder-reviewer retries. A concrete version of 'scrutiny scales with risk', an idea our own supervisor design only sketches."
  - "CodeAF's spend-rail catalogue ('docs/LIMITS.md'). Fourteen named dollar and time limits, each documented with what it blocks, what zero means for that specific rail, and a visible receipt string shown to the user. A ready checklist for our own budget defaults and console copy."
  - "The sub-harness issue-level entry point ('implement_issue'). Lets a caller that has already planned hand off one scoped issue for four to eight LLM calls, instead of paying for a full multi-hour build. A useful shape for letting our supervisor delegate small, pre-scoped work cheaply."
differs:
  - "There is no per-task sandbox anywhere in the stack. SWE-AF runs every concurrent build as git worktrees inside one shared, root-user Docker container with no seccomp or filesystem hardening, and CodeAF runs tasks as plain OS processes on the operator's own machine. Copying this would mean giving up gVisor-per-task isolation entirely, which our security-without-half-measures constraint does not allow."
  - "Identity is bound to the agent node, not the task. AgentField issues one DID per node, derived once, and SWE-AF's real secrets ('ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY', 'GH_TOKEN') are declared 'scope: global' and injected as plain container-wide environment variables shared by every concurrent build. Our identity-belongs-to-the-task principle would have to be dropped, not weakened, to run this way."
  - "Merge is agent-driven, not a fixed actor. SWE-AF's PR step is an LLM with a bash tool told to run 'gh pr create' and told not to merge. We use a separate factory-merge identity so merge authority is never a judgement call an LLM makes for itself. A real split on where automation should stop and a fixed, auditable actor should start."
  - "A wide agent taxonomy against our narrow one. SWE-AF names 22 roles and CodeAF assigns a worker, planner and checker crew to every task. We use one coder class plus a supervisor and a reviewer. Their bet is that narrow roles with typed handoffs shrink error surface. Ours is that one capable coder and a cheap escalation path are cheaper to build and reason about. Matching their granularity would mean widening our agent taxonomy, something we have deliberately deferred."
ux_verdict: SWE-AF has no dedicated interface beyond one API call and the pull request it produces at the end. CodeAF's terminal UI, a cross-project task tree, a needs-you queue resolved with one keypress, and phone access over SSH to a session running on another machine, is the more developed and more transferable half of this project's UX.
slop_verdict: Not slop. Both repos carry real, tested code, Go and Python unit tests in both, and SWE-AF's deployment doc lists known issues tied to live GitHub issue numbers, the kind of detail a landing-page project does not bother to write down. SWE-AF rewrote its core from Python to Go, and CodeAF merged over 1650 pull requests in under two months, though CodeAF is explicitly labelled early preview and is close to a one-person effort so far.
---

## 1. What it is

AgentField is an open-source "AI backend" control plane, a stateless Go service that lets agent logic written in Python, Go or TypeScript register as REST-callable reasoners and skills, with cross-agent calls, async execution, memory and a governance layer built on W3C DIDs and signed Verifiable Credentials. It is Apache-2.0 and made by Agent Field Inc, a Toronto company that launched publicly in December 2025.

SWE-AF is an AgentField node, a 22-agent autonomous software engineering pipeline that takes one natural-language goal through a PRD, an architecture pass, an issue DAG, parallel coding in per-issue isolated workspaces, review and QA, merge, integration testing, verification against acceptance criteria, and a GitHub pull request. It markets itself as "an autonomous engineering team from one API call". The README's own quick start bears this out closely: set a provider key, run one command to start the node, then one call with a goal string starts a full build.

CodeAF is a separate, much younger product from the same maker (created 2026-08-05, labelled "early preview" in its own README), a single Go binary that runs a coding factory on the operator's own machine across every local project at once, rather than as a hosted pipeline. It claims first place among ten coding harnesses on the DeepSWE benchmark, on the same model, at the lowest cost per solved issue, a claim not independently checked here. Both products share the same open-models-first positioning: DeepSeek, Qwen, GLM, Kimi and MiniMax sit alongside Claude and Codex as first-class model choices, which is the detail that put this project in scope for us.

What the makers claim and what the code shows line up in most places but diverge sharply on isolation, covered in section 5.

## 2. Mapping to our five planes

| Plane / principle | What SWE-AF/CodeAF does | What we do | Verdict |
|---|---|---|---|
| Signals | A goal string passed to one API call for SWE-AF, or a chat message for CodeAF. CodeAF's standing orders can watch a project for a named trigger, but neither product has an issue or alert intake queue. | Forgejo webhooks, SigNoz alert webhooks and factoryd intake feeding a continuous backlog. | We lead |
| Control plane | AgentField is a stateless Go control plane tracking DAG execution state with a bounded in-process admission queue, human-in-the-loop pause and resume, and every call signed into a Verifiable Credential chain for audit. SWE-AF adds its own checkpoint and resume on top. | factoryd with Temporal, Postgres, durable task state, a scheduler, approvals, model choice and a cost and audit ledger. | Equal |
| Worker plane | SWE-AF runs every concurrent build as isolated workspaces inside one shared, root-user Docker container. CodeAF runs tasks as plain OS processes on the operator's own machine. Neither isolates at the OS level. | One gVisor pod per task, read-only root filesystem, default-deny egress. | We lead |
| Verification | An inner coder-reviewer loop, a risk-flagged parallel QA path, then a deterministic CI gate with a bounded, anti-cheat-instructed fix loop. | Forgejo Actions on gVisor runners, policy gates, then a stronger-model review. | Equal |
| Merge and deploy | An LLM agent runs the PR creation commands itself from a bash tool, and opens the PR ready for review. No separate deploy stage. CodeAF lands passing work on the operator's own branch, never main or dev. | A dedicated factory-merge bot, then Flux and a staged rollout. | We lead |
| Policy outside the model | Tag-based ALLOW or DENY rules plus a signed DID and Verifiable Credential per agent-to-agent call, enforced by the control plane. Governs call authorisation, not network egress or the credentials a build actually uses. | Default-deny network egress and capability rules enforced in gateway code and network policy. | Equal |
| Identity per task | A DID is issued once per agent node, not per task. SWE-AF's real secrets are declared as globally scoped environment variables shared by every concurrent build. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against cluster OIDC. | We lead |
| Artifacts, not chat | Typed result objects pass between agents, and CodeAF sub-harnesses take typed input and return typed output or an explicit incomplete. | A TaskBrief in, a branch, a PR and an event stream out. | Equal |

## 3. Architecture and stack

SWE-AF ships two implementations in the same repository. The original is Python (swe_af/), the newer one is Go (go/), and the package manifest marks the Python entry as superseded by the Go one, so the install path now redirects there. Both carry real unit tests, a Python unittest suite and Go tests for the DAG executor.

The build pipeline is a six-phase DAG (plan, architect, decompose into issues, code, integrate, verify) run by a five-agent planning chain, then parallel per-issue coders in isolated per-issue workspaces on the same checkout. Three nested control loops bound retries: an inner coder-reviewer loop (up to 5 iterations, or a 4-call flagged path with parallel QA, reviewer and synthesiser for risky issues), a middle Issue Advisor (up to 2 invocations, five possible actions from retry to escalate), and an outer Replanner (continue, modify the DAG, reduce scope, or abort). This is documented with diagrams and named as eight architecture patterns in docs/ARCHITECTURE.md, a substantial design document, not just README claims.

Three coding runtimes sit underneath: claude_code (the Claude Agent SDK), open_code (the OpenCode CLI, routed to OpenRouter, Infron, MiniMax or other open models), and codex (the OpenAI Codex CLI). Model choice per role resolves through a layered default (runtime default, then a role map, then a per-role override), and a coarse three-tier system (low, med, high, in swe_af/execution/schemas.py) lets an operator swap a whole tier with one environment variable, conceptually close to our own cheap-tier-first ladder but simpler and not model-family aware.

Deployment is a single Docker container (python:3.12-slim, root user) with a compose file wiring one shared Postgres for integration tests and a named volume for all workspaces. There is no Kubernetes manifest and no Helm chart in the repository.

CodeAF is a from-scratch Go codebase (dozens of internal packages, for example internal/delegate, internal/guard, internal/crewroute, internal/plandb), compiled to one binary under 60MB, with no server component of its own to run. It talks to model providers directly (OpenRouter, DeepSeek, GLM, Kimi, MiniMax, Qwen, Codex via a ChatGPT plan, Ollama, or any OpenAI-compatible endpoint) and keeps its own local task and spend state. It shares no runtime dependency on the AgentField control plane, only the maker and the model-routing philosophy.

Files and directories read, in the local clone at market-research-clones/swe-af: README.md, docs/ARCHITECTURE.md, docs/deployment.md, docs/CONTRIBUTING.md, the Dockerfile, the compose file, the package manifest, swe_af/execution/schemas.py, swe_af/execution/git_fast_path.py, swe_af/execution/ci_gate.py, swe_af/hitl/credentials_store.py, swe_af/prompts/github_pr.py, and the top-level layout of swe_af/ and go/. CodeAF and AgentField were read directly from GitHub via content-API calls rather than cloned, given the time budget, specifically CodeAF's README, docs/ARCHITECTURE.md, docs/LIMITS.md, docs/GUIDE.md, docs/JOBS.md, docs/FEATURES.md, internal/workspace/workspace.go, internal/delegate/launch.go and the top-level internal/ package listing, and AgentField's README and its agentfield.ai deployment doc.

## 4. UX

For SWE-AF, zero to a first result is short but has no visible interface while it runs. Install the CLI, set one provider key, start the node, then one call with a goal string starts a build. The user then waits for the pull request. There is no dashboard shown or claimed for watching a build in progress, only logs and, at the end, a GitHub pull request with a structured body. Human-in-the-loop exists at one point, a pause call that a scout agent uses to ask for credentials it cannot infer, answered through whatever channel the operator wired up. Approval of the actual change happens the ordinary GitHub way, since the agent is explicitly told not to merge.

CodeAF's UX is the more developed of the two and worth describing in more detail, from the README's own screenshots (described here from their alt text, not independently viewed as rendered images). Zero to a first running task is three steps: install with a one-line install script, connect a model provider, and type a message. That message can fan out into several tasks, each in its own copy of the repository on its own branch, shown as a task tree beside the conversation. A cross-project home dashboard shows what needs you, what is unread, what is running and what it cost, for every project on the machine at once, and a single digit answers a waiting question from its row. Work that passes its own check lands on the user's branch by itself. Work nothing could check waits under an unread queue, and a single keypress, accept or reject, resolves it. A headless mode gives the same factory to CI or cron with a timeout and JSON output, and a split host mode keeps a conversation running on a remote machine while a local screen, including a phone over SSH, just follows it.

Compared with our own server-rendered console, which we already flag as having no diff view, CodeAF's cross-project queue, one-key resolution and remote-follow design are ahead of what we have built. SWE-AF, on the other hand, has effectively no UX of its own beyond the API and the PR, behind us on this axis even though the underlying pipeline is sophisticated.

## 5. Security, identity, sandbox, policy, cost

Sandboxing is absent in both products, in different ways. SWE-AF runs every concurrent build inside one shared Docker container as root, python:3.12-slim, no read-only filesystem, no seccomp, no network policy, confirmed directly from the Dockerfile and the compose file. Isolation between builds and between issues within a build is separate checkouts on the same filesystem, nothing more. CodeAF has no sandbox at all by design: it runs plain child OS processes on the operator's own trusted machine (confirmed in internal/delegate/launch.go, a process-group-based launcher with a terminate-then-kill sequence after a 15-second grace, no container or namespace involved), a defensible choice for a personal tool, but one that means the comparison to our gVisor-per-task model does not really apply to CodeAF at all.

Identity is where the gap with our own design is largest. AgentField issues a DID to each agent node once, via hierarchical key derivation, and signs every reasoner-to-reasoner call into a Verifiable Credential chain, real cryptography, but scoped to the node, not the task, and it governs call authorisation between agents, not the credentials those agents use against GitHub or a model provider. Those credentials, in SWE-AF, are declared globally scoped in the package manifest and injected as plain, container-wide environment variables in the compose file, shared by every build running in that container at once. The one exception is a genuinely careful piece of code, swe_af/hitl/credentials_store.py, a process-local, execution-id-keyed, in-memory-only store for credentials a scout agent negotiates mid-build, never logged, never serialised through a control-plane call, cleared in the build's finally block. It is well built, but it covers one narrow, optional credential path, not the ordinary provider and GitHub tokens every build actually uses.

Policy outside the model exists, narrowly. AgentField's tag-based ALLOW/DENY rules and its Verifiable Credential chain are enforced by the control plane, not a prompt, for deciding which agent may call which reasoner. It says nothing about network egress and nothing about what a running build's shell can reach, which the SWE-AF Dockerfile suggests is unrestricted, since the coding CLIs are installed with ordinary outbound network access.

Verification is the strongest part of SWE-AF specifically. Beyond the inner review loop, a deterministic, non-LLM CI gate polls pull-request check status (swe_af/execution/ci_gate.py) and, on failure, runs a bounded two-cycle LLM fix-and-repush loop that is explicitly told not to skip, xfail, comment out or loosen any test to make a check pass, a concrete anti-cheat instruction we do not currently have written down anywhere as explicitly.

Cost control differs sharply between the two products. SWE-AF's is coarse, a three-tier (low, med, high) model map set by environment variable, with a self-reported optimisation, a deterministic fast-path for mechanical repository housekeeping, that cut roughly 20 minutes and 23 of 88 agent calls from one 103-minute benchmark build. CodeAF's is far more developed: fourteen named dollar and time rails (docs/LIMITS.md), each documented with exactly what it blocks and what a value of zero means for that specific rail, shown to the user as a visible receipt string. Neither product takes a payment hold before a call the way our gateway does. Both are ledgers and refusals after the fact, or before the next call, not a guaranteed cap on a call already in flight.

## 6. What we should take from it

Narrow, copyable this month: the deterministic fast-path for repository housekeeping is the clearest one, mechanical operations done by plain code, with an LLM called in only for genuine conflicts, directly reusable in our own worker plane wherever an agent is currently paying for housekeeping it does not need to reason about. The CI gate's anti-cheat instruction, forbidding skipped tests, expected-failure markers, commented-out tests or loosened assertions in any automated fix loop, is a one-paragraph addition worth copying into our own reproduction-gate prompts almost verbatim. CodeAF's spend-rail catalogue, a named rail per kind of spend, each with an explicit meaning for zero and a visible receipt string, is a ready structure for our own budget defaults and console copy, better thought through than what we currently show a user. The sub-harness issue-level entry point, a cheap path for a caller that has already planned to hand off one scoped issue for four to eight calls instead of a full build, is a useful shape for letting our supervisor delegate small, pre-scoped work without paying for a full pipeline.

Broad, product-shape items: CodeAF's whole premise, one control surface across every project on a machine, with a needs-you queue and one-key resolution, is a genuine answer to a problem our console does not yet address, watching and steering many tasks across many projects at once rather than one task at a time. SWE-AF's risk-proportional review depth, a cheap path for ordinary issues and a four-call parallel path for issues flagged as risky, is a concrete version of "scrutiny scales with risk" that our own supervisor design currently only sketches as an idea, not a routing rule.

## 7. Where our philosophy differs

The sharpest split is sandboxing. Neither product isolates a task at the OS level. SWE-AF's builds share one root container, and CodeAF has no sandbox because it is built to run as the operator on the operator's own machine. Our security-without-half-measures constraint rules this out entirely for a multi-tenant factory, a gVisor pod per task is not negotiable, so this is not a trade-off we would make, only a place where their target user, a single developer on a trusted machine, differs from ours, many tasks and many trust levels on one shared cluster.

Identity is the same story. AgentField's DID and Verifiable Credential chain is real, useful and auditable, and it governs agent-to-agent calls well. But binding it to the node instead of the task means SWE-AF's actual provider and GitHub credentials sit as global environment variables reachable by every concurrent build. Copying this would mean giving up identity-belongs-to-the-task, not weakening it, so there is nothing here to adopt short of the underlying idea of signing every call for audit, which we could add without touching our credential model at all.

Merge authority is a smaller but real difference. SWE-AF has an LLM run the push and PR-creation commands itself, from a bash tool, with instructions not to merge. We keep a separate factory-merge identity specifically so merge is never a judgement call an agent makes for itself. Their approach is simpler to build. Ours keeps a fixed, auditable actor at the one step that changes a shared branch.

Where their approach may be ahead and our constraint is the price: cost control. CodeAF's granular, well-documented spend rails are more usable than what we currently show an operator, and adopting that level of UX polish would cost us nothing structural. It is a console and defaults improvement we should simply make, not a philosophy trade-off at all.

Their multi-role team, 22 named agents for SWE-AF and a worker/planner/checker crew per task for CodeAF, against our single coder class plus a supervisor and a reviewer, is a genuine design bet on both sides. Their bet is that narrow roles with typed handoffs shrink the error surface of any one call. Ours is that one capable coder, backed by a cheap escalation path, is less to build, less to route between and less to keep consistent as models change. Nothing read here shows one bet clearly winning over the other, since no independent evaluation of either exists yet.

## 8. Red flags and slop assessment

Not slop, on the evidence read. Both SWE-AF and CodeAF carry real implementation with tests, Go and Python unit tests in both repositories, and SWE-AF's deployment doc lists specific known issues tied to live GitHub issue numbers, the kind of detail a landing-page project does not bother to write down. SWE-AF was rewritten from Python to Go mid-life, a real engineering decision with a real cost, not a cosmetic change.

CodeAF is explicitly labelled "early preview" by its own maintainers, is two months old, and its open issue count (267 against 132 stars) is unusually high for its size, though this is also consistent with the maintainers filing their own audit and design notes as issues rather than a wave of unresolved user complaints, not fully verified either way. Its commit history is dominated by one author, the CTO, with the large majority of all commits, plus an AI-assistant account with dozens more, so treat it as close to a one-person, AI-assisted effort so far, not a team product yet.

No independent reviews, Hacker News threads or Reddit discussion were found for either SWE-AF or CodeAF. Every indexed page found in search was the project's own README mirrored across directory and "awesome list" sites, or a company account's own post. That absence is itself worth recording: this project has had no outside scrutiny yet.

AgentField itself launched publicly only in December 2025, with no disclosed funding round found, and its own deployment docs are light on isolation specifics, no sandboxing, no egress control and no dedicated secrets manager are mentioned for the control plane itself, only an admin token and DID-based call authorisation.

## 9. Sources

https://github.com/Agent-Field/SWE-AF (via gh api repos/Agent-Field/SWE-AF, 2026-09-29)
https://github.com/Agent-Field/SWE-AF/graphs/contributors (via gh api, 2026-09-29)
https://github.com/Agent-Field/agentfield (via gh api repos/Agent-Field/agentfield, 2026-09-29)
https://github.com/Agent-Field/CodeAF (via gh api repos/Agent-Field/CodeAF, 2026-09-29)
https://github.com/Agent-Field/CodeAF/graphs/contributors (via gh api, 2026-09-29)
https://github.com/Agent-Field/CodeAF/commits (via gh api, 2026-09-29)
https://github.com/orgs/Agent-Field/repositories (via gh api orgs/Agent-Field/repos, 2026-09-29)
market-research-clones/swe-af/README.md
market-research-clones/swe-af/docs/ARCHITECTURE.md
market-research-clones/swe-af/docs/deployment.md
market-research-clones/swe-af/docs/CONTRIBUTING.md
market-research-clones/swe-af/Dockerfile
market-research-clones/swe-af/docker-compose.yml
market-research-clones/swe-af/agentfield-package.yaml
market-research-clones/swe-af/swe_af/execution/schemas.py
market-research-clones/swe-af/swe_af/execution/git_fast_path.py
market-research-clones/swe-af/swe_af/execution/ci_gate.py
market-research-clones/swe-af/swe_af/hitl/credentials_store.py
market-research-clones/swe-af/swe_af/prompts/github_pr.py
https://github.com/Agent-Field/agentfield/blob/main/README.md (via gh api repos/Agent-Field/agentfield/readme, 2026-09-29)
https://agentfield.ai/docs/reference/deploy (WebFetch, 2026-09-29)
https://github.com/Agent-Field/CodeAF/blob/dev/README.md (via gh api, 2026-09-29)
https://github.com/Agent-Field/CodeAF/blob/dev/docs/ARCHITECTURE.md (via gh api, 2026-09-29)
https://github.com/Agent-Field/CodeAF/blob/dev/docs/LIMITS.md (via gh api, 2026-09-29)
https://github.com/Agent-Field/CodeAF/blob/dev/docs/GUIDE.md (via gh api, 2026-09-29)
https://github.com/Agent-Field/CodeAF/blob/dev/docs/JOBS.md (via gh api, 2026-09-29)
https://github.com/Agent-Field/CodeAF/blob/dev/docs/FEATURES.md (via gh api, 2026-09-29)
https://github.com/Agent-Field/CodeAF/blob/dev/internal/workspace/workspace.go (via gh api, 2026-09-29)
https://github.com/Agent-Field/CodeAF/blob/dev/internal/delegate/launch.go (via gh api, 2026-09-29)
WebSearch: AgentField SWE-AF OR CodeAF review OR hacker news OR reddit (2026-09-29, no independent discussion found)
WebSearch: agentfield.ai funding OR raised OR company OR who built (2026-09-29, found founder and launch details)
