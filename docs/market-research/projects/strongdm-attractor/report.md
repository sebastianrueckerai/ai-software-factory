---
name: Attractor (StrongDM Software Factory)
slug: strongdm-attractor
url: https://factory.strongdm.ai/
repo: https://github.com/strongdm/attractor
category: factory-orchestrator
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: no hosted product, it is a natural-language spec you feed to your own coding agent, which then produces something you host yourself
company: StrongDM, about 111M USD raised over a Series A to C (last round 34M USD, May 2024), Burlingame CA, founded 2015, acquired by Delinea (announced 2026-01-15, closed 2026-03-05)
maturity: 1321 stars, 196 forks, 4 contributors, first commit 2026-02-06, last commit 2026-03-17 (15 commits total, then silent for over 6 months), no tagged releases
similarity: 2
axes:
  signals_intake: 2
  control_plane: 2
  sandbox_isolation: 1
  verification: 4
  policy_outside_model: 1
  identity_per_task: 0
  cost_control: 0
  ux: 2
  reseedable_selfhost: 2
steal:
  - DOT/Graphviz as the pipeline definition format, version controllable, diffable in a pull request, and free SVG visualisation with standard tooling. Our Temporal workflow has no equivalent diagram.
  - The per-stage status.json/prompt.md/response.md contract (Section 4.5, Appendix C) is a dead simple audit trail any tool can read or write. Worth mirroring in the worker's log layout for cheap forensics without touching SigNoz.
  - The five-step deterministic edge selection algorithm (condition match, preferred label, suggested next ids, weight, lexical tie break) is a clean, inspectable routing order we could reuse for the supervisor's continue/redirect/retry/escalate decision.
  - Context fidelity modes (full, truncate, compact, summary:low/medium/high) with explicit precedence (edge over node over graph over default) name a lever for context window cost we currently handle ad hoc.
  - The pluggable Interviewer pattern (AutoApprove, Console, Callback, Queue, Recording) lets a human gate be swapped for a deterministic stub in tests. Useful for testing our own approval workflow without a human in CI.
  - The scenario-as-holdout principle: keep the exact input a step will be graded against out of that step's own read access. Worth auditing what our reproduction gate and model review can currently see versus what they are scored on.
differs:
  - Sandbox isolation, credential handling and capability policy are explicit "out of scope, nice to have" extension points in the specs, not core requirements. Copying that permissiveness would break our security-without-half-measures constraint outright.
  - Their published cost posture is spend more (at least 1000 USD of tokens per engineer per day, uncapped). Ours is hard caps, holds and a per-project envelope on three Hetzner boxes. Matching their spend would violate our commodity hardware constraint.
  - Scenario holdouts need someone to author and maintain scenarios plus a Digital Twin Universe of every third party dependency. That standing cost is real but absent from their own headline number, and we are one developer, not a three person team.
  - The rule that code must not be reviewed by humans is a stronger claim than our design makes anywhere. We treat human approval as a workflow state to minimise, not a step to delete, because that approval is also the accountability trail a security product needs.
ux_verdict: No shipped product to use, onboarding is pasting one README line into your own coding agent and waiting, the one real UX idea is that a DOT graph renders to a diagram for free, which our console still lacks.
slop_verdict: Real, technically dense specs (about 5700 lines read in full) behind a viral manifesto, but the released repo has no code, no releases, four contributors and has been silent for six months, and the one thing they did ship as actual code (cxdb) was shown on Hacker News to have the review gaps the whole pitch is about.
---

# Attractor (StrongDM Software Factory)

## 1. What it is

StrongDM is a Burlingame, California access management vendor, founded in 2015, acquired by Delinea in a deal that closed 2026-03-05. In February 2026 a three person internal team (Justin McCarthy, the CTO and co-founder, Jay Taylor and Navan Chauhan) published a manifesto describing a "Software Factory" in which humans neither write nor review code. Attractor is the name of the non-interactive coding agent orchestrator at the centre of that factory. StrongDM released it not as software but as three markdown specification files under Apache-2.0, with instructions to feed them to any modern coding agent (Claude Code, Codex, OpenCode, Amp, Cursor) and have that agent build the system.

The makers claim a working internal factory that writes, tests and ships production code, including code for their own security product, without a human reading a diff. What the repository actually contains is an nlspec: a DOT-based pipeline execution engine specification (attractor-spec.md, 2090 lines), a provider-agnostic coding agent loop specification (coding-agent-loop-spec.md, 1467 lines) and a unified LLM client specification (unified-llm-spec.md, 2169 lines). There is no executable code, no test suite and no CI in this repository. A companion repository, cxdb (not part of this review), is the one piece of actual shipped code, an immutable DAG-based context store in Rust, Go and TypeScript.

The wider claims (scenario holdouts, a Digital Twin Universe, the 1000 USD per engineer per day cost benchmark) come from the factory.strongdm.ai manifesto and from Simon Willison's write-up of a visit to the team, not from anything in the Attractor repository. That separation matters for this report: the repository is a narrow, well-specified orchestration engine, the manifesto is a much broader and less verifiable set of claims about how StrongDM actually runs it.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Humans author specs and curate "scenarios". The manifesto also describes an agent that wakes on a cluster of bad telemetry, finds a root cause and writes a fix, but the mechanics of that loop are not documented anywhere we could read | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API, every task a Forgejo issue | not comparable, ours is a documented, code enforced intake plane, theirs is described in prose only |
| Control plane | Attractor's single DOT graph, one JSON checkpoint per run, retry policy per node, goal gates before exit. No cross task registry, no budgets, no audit trail beyond per stage status.json files | factoryd with a Temporal workflow per task, Postgres task registry, policy as a YAML file in Git, cost ledger, audit trail | we lead, theirs is a single pipeline's state machine, not a factory wide control plane |
| Worker plane | ExecutionEnvironment interface, only LocalExecutionEnvironment is a required implementation, Docker/Kubernetes/WASM/SSH are named as optional extension points, not built. Environment variable filtering of *_API_KEY/*_SECRET/*_TOKEN patterns is described explicitly as "a safety default, not a security boundary" (coding-agent-loop-spec.md line 1467) | One gVisor pod, ServiceAccount and namespace per task, read-only root filesystem, non-root, default-deny egress | we lead by a wide margin, isolation is optional in their spec and mandatory in ours |
| Verification | Goal-gated DOT nodes, plus the manifesto's scenario holdouts: end-to-end user stories stored outside the codebase like a machine learning holdout set, judged by an LLM for probabilistic "satisfaction" rather than pass/fail, run against a Digital Twin Universe of cloned third party services (Okta, Jira, Slack, Google Docs). Motivated by an observed incident of agents writing return true to pass their own tests | Forgejo Actions CI, policy gates by path risk class, migration flag, a reproduction gate that reruns the issue's own reproduction command against the PR at base and head in a fresh sandbox with a read-only token, then a stronger model review with a strict verdict | they lead on the specific anti-gaming property, our reproduction gate still runs a command the agent can read from the issue it was given |
| Merge and deploy | Not described. No merge mechanism, no rollout, no rollback is documented anywhere in the specs or the manifesto | Bot merge (factory-merge) only after a whitelisted human approves, or an auto rule for normal-risk, reproduced, strictly-improving changes, Flux staged rollout with a 15 minute alert-free bake window | we lead, this is the highest-stakes step and it is the one they say least about, for a company that sells access control software |
| Policy outside the model | An approval/permission system is explicitly listed under "Out of Scope (Nice-to-Haves)" (coding-agent-loop-spec.md Section 8). No capability language anywhere in any of the three specs | Capability rules as a document in Git, versioned in the database, enforced in gateway code and network policy | we lead, this is a real design gap in their approach, not a difference of degree |
| Identity per task | Not addressed in any of the three specs or in the manifesto. The Digital Twin Universe sidesteps live third party credentials during development and test, it does not solve credential handling for a deployed system | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by factory-gateway, no key material in the sandbox | we lead, not comparable, they simply do not publish an identity story |
| Artifacts, not chat | The status.json contract per node (outcome, preferred_label, context_updates, notes) is a genuine typed artifact exchange, and the DOT file itself is a version-controlled artifact | TaskBrief in, a branch, a PR and a normalised event stream out, via Git | equal, both reject a chat transcript as the coordination medium in favour of small, checkpointable, typed state |

## 3. Architecture and stack

Attractor is language-agnostic pseudocode, not code. The engine runs a six phase lifecycle, parse, transform, validate, initialize, execute, finalize (attractor-spec.md Section 3.1), traversing a digraph whose node shape decides its handler: Mdiamond is start, Msquare is exit, box is an LLM call (codergen), hexagon is a human gate (wait.human), diamond is conditional routing, component/tripleoctagon are parallel fan-out/fan-in, parallelogram is a shell tool, house is a supervisor loop over a child pipeline (Section 2.8). Execution is single-threaded at the top level, edge selection is a deterministic five-step algorithm, and a JSON checkpoint is written after every node so a run can resume (Section 3.2, 5.3). A model_stylesheet graph attribute lets CSS-like selectors (*, shape, .class, #id) set llm_model/llm_provider/reasoning_effort per node (Section 8).

The companion coding-agent-loop-spec.md defines a provider-aligned agent loop (OpenAI/codex-rs style tools, Anthropic/Claude Code style tools, Gemini/gemini-cli style tools) built on top of an ExecutionEnvironment interface with required methods for file I/O, command execution, grep and glob. Only a local implementation is required. Docker, Kubernetes, WASM and SSH implementations are sketched as extension points, not delivered. Approval/permission gating, sandbox/security policies and a read-before-write guardrail are all listed under "Out of Scope (Nice-to-Haves)" (Section 8) with a one-line note on where a host application could hook them in.

unified-llm-spec.md defines a provider adapter interface (ProviderAdapter, complete, stream), middleware hooks including "cost tracking and budgets" as a named but unimplemented use case, and a token bucket pattern for client-side rate limiting. There is no ledger, no hold, no spend cap anywhere in the text, only per-call usage numbers (input/output token cost per million).

No deployment shape is prescribed anywhere: no Helm chart, no docker-compose, no Dockerfile, because there is nothing to deploy. The product page (factory.strongdm.ai/products/attractor) lists seventeen community reimplementations in Rust, Go, Python, Java, F#, TypeScript, Scala, Ruby, C and C#, none of which we cloned or verified.

The one artifact of actual shipped code, strongdm/cxdb (16,000 lines of Rust, 9,500 of Go, 6,700 of TypeScript per Hacker News discussion, not independently verified here since it is a separate repository), is "an immutable DAG-based context store" for agent conversation and tool-output history. Hacker News reviewers found a stringly-typed StoreError using substring checks for control flow, excessive String::clone, silently swallowed errors, an 800-line closure in an HTTP handler and heavy unwrap use. StrongDM's Jay Taylor acknowledged the feedback on the thread and said he would run agents on "optimization / purification passes" over the code.

## 4. UX

There is no product UI to describe. Onboarding is one line from the README: paste "codeagent> Implement Attractor as described by https://github.com/strongdm/attractor" into your own coding agent CLI and wait for it to build something. That is zero to first result in one step, but the result is an implementation of your choosing, not a running factory.

The spec describes an optional HTTP server mode (Section 9.5): POST /pipelines, GET /pipelines/{id}/events as a server-sent-events stream, POST /pipelines/{id}/questions/{qid}/answer for human gates, GET /pipelines/{id}/graph for an SVG render of the running graph. None of this is built, it is a description of endpoints an implementer should add. The Interviewer interface (Section 6) is the intervention model: a human answers yes/no, multiple choice or freeform questions at hexagon nodes, with accelerator keys parsed from edge labels ([Y] Yes, deploy), a configurable timeout and a default choice. Five built-in interviewer implementations are specified (console, callback, queue, recording, auto-approve), which is a genuinely useful testing pattern even though none of them is a real UI.

What we saw no evidence of at all: a kanban board, a cost view, a diff view, a mobile view, or any screenshot of the actual internal StrongDM factory in operation. The one UX idea worth taking seriously is structural rather than visual: a DOT file renders to an SVG with stock Graphviz tooling, so the shape of a pipeline is visible for free the moment it is written down. Our Temporal-based workflow has no equivalent, and "no diff view" and "no real-time streams of the agent's work" are named weaknesses in our own baseline.

## 5. Security, identity, sandbox, policy, cost

Security and sandbox. The spec's only required execution environment runs commands directly on the local machine. Docker, Kubernetes, WASM and OS-level sandboxing (Seatbelt, Landlock, restricted tokens) are named as extension points an implementer may add, not defaults the spec enforces (coding-agent-loop-spec.md Section 8). Environment variable filtering excludes *_API_KEY/*_SECRET/*_TOKEN/*_PASSWORD/*_CREDENTIAL by name, and the spec is explicit that this "is a safety default, not a security boundary, the agent can still run commands that access these variables through the shell's own environment if needed" (line 1467).

Identity. No credential brokering, no short-lived tokens, no task-scoped identity of any kind appears in any of the three specs or in the manifesto. The Digital Twin Universe removes the need for live third party credentials during development and testing by cloning Okta, Jira, Slack and Google Docs behaviour into standalone binaries, which lowers exposure in test but says nothing about how a deployed agent would hold credentials for the real thing.

Policy. An approval/permission system for sensitive operations (file writes, shell commands, destructive actions) is explicitly "Out of Scope (Nice-to-Haves)" with a note that the tool execution pipeline "has a natural extension point between VALIDATE and EXECUTE where an approval step can be inserted" (Section 8). Nothing in the spec enforces a capability outside of what a node's prompt asks the model to do.

Cost. The unified LLM spec names "cost tracking and budgets" as a middleware use case (Section 2.3) and tracks per-call token cost, but defines no cap, no hold and no ledger. The manifesto's own benchmark points the other way: "if you haven't spent at least 1000 USD on tokens today per human engineer, your software factory has room for improvement," a target of maximum spend, not a limit on it.

## 6. What we should take from it

Narrow, things we could copy this month: the DOT/Graphviz pipeline format for a free, diffable, renderable view of a workflow, the status.json/prompt.md/response.md per-stage audit contract, the five-step deterministic edge-selection order for supervisor decisions, the named context fidelity levels with explicit precedence, and the pluggable Interviewer pattern (especially AutoApproveInterviewer and QueueInterviewer) for testing approval gates deterministically in CI.

Broad, things that change how we think about a problem: the core lesson of the scenario holdout is that a verification step is only as strong as what it is blind to. Our reproduction gate reruns a command that came from the same issue the agent read, and our model review reads the same diff and brief the agent produced. Neither is blind to anything the agent could have shaped. Worth an explicit audit of what our verification plane can see versus what it grades, even without building a Digital Twin Universe of our own. Separately, the Digital Twin Universe idea generalises past StrongDM's specific SaaS dependencies: cloning a third party API we call from CI (rather than calling the real thing) removes rate limits, flakiness and cost from the reproduction gate, worth considering if we ever add outbound tool calls beyond Forgejo, Replicate, Firecrawl and fal.ai to a verification path.

## 7. Where our philosophy differs and what that costs or buys us

Sandbox isolation, credential handling and capability policy are core, non-negotiable parts of our design (Constraint 4, security without half measures). Attractor's specs treat all three as extension points an implementer may add later. That is a legitimate choice for a generic methodology document meant to be dropped into anyone's own coding agent, but adopting the same permissiveness ourselves would break our own stated constraint outright. The cost of not copying it is that we carry sandboxing, identity and policy machinery that their specs leave to the reader, which is also most of what makes our system harder to build and slower to ship than pasting one prompt into Claude Code.

Their published cost posture (spend at least 1000 USD in tokens per engineer per day) is the opposite of our hard caps, holds and per-project spend envelope on three Hetzner cpx42 boxes. Their number may work for a funded, since-acquired security vendor. It is incompatible with our commodity hardware constraint, and adopting anything close to it would mean abandoning the constraint rather than the factory.

Scenario holdouts and a Digital Twin Universe are the one place their approach is genuinely stronger than ours on a specific axis (gaming resistance), but the manifesto's own cost figure does not include the standing cost of authoring and maintaining scenarios and twins for every third party dependency. Stanford CodeX's critique names this directly: "who maintains the twins?" is at StrongDM three highly skilled engineers with full-stack knowledge and the time to do it. We are one developer. Buying the stronger verification property would mean building spec-driven intake (which we already list as unbuilt) plus an ongoing scenario-and-twin maintenance burden we have no spare capacity for.

Finally, "code must not be reviewed by humans" is a stronger claim than anything in our design. We treat a human approval as a workflow state to minimise, never a step to remove, partly because that approval is the accountability trail a security-relevant product needs. Stanford CodeX's critique makes the same point from the regulatory side: "the humans designed the system that designed the system," and when it fails, tracing responsibility back to a person becomes much harder once no person has looked at anything downstream of the spec. That is a cost we choose to keep paying.

## 8. Red flags and slop assessment

The repository we cloned contains zero executable code: three markdown files (attractor-spec.md, coding-agent-loop-spec.md, unified-llm-spec.md), a README and an Apache-2.0 LICENSE file, confirmed by directly reading all three specs and listing the repository tree, not by taking the README's word for it.

The full commit history is fifteen commits between 2026-02-06 and 2026-03-17, four authors (Navan Chauhan responsible for ten of the fifteen), no tags, no releases (gh api repos/strongdm/attractor/releases and /tags both return empty lists). As of this report (2026-09-29) the repository has been silent for a little over six months. 1321 stars and 196 forks (gh api repos/strongdm/attractor, snapshot taken 2026-09-29) is a lot for a spec repository, and is consistent with a viral Hacker News thread rather than sustained maintenance or usage.

The one piece of code StrongDM actually released, cxdb, was picked apart on the Hacker News thread itself within hours: a stringly-typed error type using substring matching for control flow, excessive cloning, swallowed errors, an 800-line closure in an HTTP handler and heavy use of unwrap, exactly the pattern of defects you would expect from code nobody reviewed, found by humans, on the one artifact that had code in it to review.

The company behind the manifesto had already signed a definitive acquisition agreement with Delinea (announced 2026-01-15, three weeks before the manifesto was published, closed 2026-03-05, a month after). Navan Chauhan said on Hacker News that the team was "not selling a product or service" and that the repository was released to share what had worked. The three-person team's status and the factory's future inside Delinea are unconfirmed as of this report.

Independent critique came from Eran Kahana at Stanford CodeX ("Built by Agents, Tested by Agents, Trusted by Whom?", 2026-02-08), arguing that an LLM judging scenario satisfaction is the same class of technology marking its own homework, and that no current liability, disclosure or contract framework accounts for software nobody wrote or reviewed, a point sharpened by StrongDM selling access and privilege management software.

Slop verdict: this is real, carefully specified engineering (we read all three specs end to end, about 5700 lines) describing techniques (scenario holdouts, a probabilistic satisfaction metric, a Digital Twin Universe) that a working team plausibly used for at least seven months. It is not a maintained open-source project. The repository is closer to a very detailed engineering blog post with a build prompt attached than to software anyone can install and run, and the one time StrongDM shipped actual code, it showed the exact review gap their own manifesto is about.

## 9. Sources

- /home/womb/repos/market-research-clones/strongdm-attractor/README.md
- /home/womb/repos/market-research-clones/strongdm-attractor/attractor-spec.md (read in full, 2090 lines)
- /home/womb/repos/market-research-clones/strongdm-attractor/coding-agent-loop-spec.md (Sections 1, 3, 4, 8, 9 read closely, 1467 lines total)
- /home/womb/repos/market-research-clones/strongdm-attractor/unified-llm-spec.md (cost, budget and middleware sections read closely, 2169 lines total)
- /home/womb/repos/market-research-clones/strongdm-attractor/LICENSE
- gh api repos/strongdm/attractor (stars, forks, license, dates, snapshot 2026-09-29)
- gh api repos/strongdm/attractor/commits (full commit list, snapshot 2026-09-29)
- gh api repos/strongdm/attractor/contributors (snapshot 2026-09-29)
- gh api repos/strongdm/attractor/releases and /tags (both empty, snapshot 2026-09-29)
- https://github.com/strongdm/attractor (repository landing page, snapshot 2026-09-29)
- https://factory.strongdm.ai/ (StrongDM Software Factory manifesto, published 2026-02-06)
- https://factory.strongdm.ai/products/attractor (product page, snapshot 2026-09-29)
- https://simonwillison.net/2026/Feb/7/software-factory/ (Simon Willison, "How StrongDM's AI team build serious software without even looking at the code", published 2026-02-07)
- https://news.ycombinator.com/item?id=46924426 ("Software factories and the agentic moment", Hacker News thread, posted around 2026-02-09)
- https://law.stanford.edu/2026/02/08/built-by-agents-tested-by-agents-trusted-by-whom/ (Eran Kahana, Stanford CodeX, published 2026-02-08)
- WebSearch: "StrongDM software factory Attractor no human writes code" (2026-09-29)
- WebSearch: "StrongDM dark factory Justin McCarthy agents" (2026-09-29)
- WebSearch: "strongdm/attractor github hacker news" (2026-09-29)
- WebSearch: "StrongDM Attractor test scenarios outside repository software factory" (2026-09-29)
- WebSearch: "StrongDM company funding headquarters founded Delinea acquisition 2026" (2026-09-29)
