---
name: Minions (Stripe)
slug: stripe-minions
url: https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents
repo: none
category: factory-orchestrator
license: mixed, proprietary internal system, harness forked from Apache-2.0 Block Goose
open_source: no
self_hostable: no
hosting_model: internal only, runs on Stripe's own devbox fleet and Toolshed MCP server, never offered to customers
company: Stripe, private, about 9.8B USD raised, about 159B USD valuation (February 2026 tender offer), dual HQ San Francisco and Dublin, founded 2010
maturity: no public repo. Harness forked from Block's Goose in late 2024, internal use for over a year before disclosure, first public account February 2026 (two blog posts, days apart), conference talk May 2026, over 1300 PRs a week as of the March 2026 press coverage, no update cadence disclosed since
similarity: 4
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 3
  verification: 3
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 0
  ux: 3
  reseedable_selfhost: 0
steal:
  - The blueprint state machine itself, deterministic nodes (lint, push, PR creation, CI gates) and agent nodes (implement, fix CI failures) as typed graph nodes, exactly what our Temporal workflow's activities and gate activities already are, just not exposed as an authorable graph other capability classes can compose
  - Per-node context engineering as an explicit mechanism, restrict tools, alter the system prompt, trim conversation context for each subtask node, rather than one session that sees everything
  - A hard local lint loop before the first push, under five seconds using a caching daemon, so the branch has a real chance of passing CI on attempt one, cutting CI queue time and the token cost of a doomed first round
  - The two-round CI cap and its stated reason, diminishing marginal returns from repeated full CI loops, is the same number we chose and gives us an external citation for it
  - Toolshed's curation default, give each agent a small default tool subset from a shared registry (near 500 tools) and let it opt into named thematic groups, rather than exposing the whole tool catalogue to every session
  - One rule-file format read by both the interactive IDE tools (Cursor, Claude Code) and the unattended agent, directory-scoped rather than global, so coding conventions are authored once
  - CI-generated tickets carry a one-click "start an agent" button (their flaky-test ticket flow), a cheap signal-to-task UX pattern for our console's own alert and ticket views
differs:
  - Their trust boundary is environmental, a devbox with no path to production or the internet, not a scoped credential. That works because the devbox never needs to act on the outside world beyond git and their internal LLM endpoint. Our tasks must push code upstream and spend metered money per call, so we cannot get away with pure network denial and need the projected per-task token our design already has.
  - Their harness is intentionally not interruptible, no steering commands, no confirmation prompts, the run either lands a good PR or a discardable bad one. We spend real engineering on a supervisor loop (stall and repeat detectors, a strongest-model call, redirect or retry) because a wasted attempt costs us a meaningful slice of a hard budget cap that Stripe has not disclosed having.
  - Verification stops at deterministic CI plus a mandatory human review of every single PR, there is no automated model-review gate between CI and the reviewer. That is affordable with thousands of engineers absorbing 1300 reviews a week. We built the review-frontier gate and a conditional auto-merge rule specifically because we do not have that reviewer pool.
  - Their coordination surface is still chat, the same Slack thread that started the run is where an engineer gives more instructions if the result is wrong. We deliberately removed chat as the exchange mechanism in favour of TaskBrief in, branch and PR out.
ux_verdict: The lowest-friction intake seen in this survey, tag a bot in a Slack thread you are already in, but nothing public shows how a run is watched or how one time-boxed sandbox is inspected mid-flight.
slop_verdict: Real and used in anger. A named engineering manager and a named head of AI platform put figures behind it, an independent conference talk did a live demo, and Hacker News engaged critically rather than dismissing it as vapor. The gap is disclosure, not substance, cost, model choice and credential handling are simply not published.
---

# Minions (Stripe)

## 1. What it is

Minions are Stripe's in-house, unattended coding agents. An engineer gives a single instruction, most often by tagging a Slack app in a thread, and the agent carries the task all the way to a pull request that has already passed CI, with no back-and-forth in between. Stripe's own framing: "A typical minion run starts in a Slack message and ends in a pull request which passes CI and is ready for human review." Over 1,300 fully minion-written PRs merge every week, all human-reviewed, none of it human-written code (Cameron Bernhardt, Stripe engineering manager, quoted by InfoQ, 2026-03-20). This is not a product. Stripe does not sell it, document it for external use, or open its source. It exists purely as an internal account of what a mature, well-resourced software factory looks like inside one company, which is exactly why it is worth comparing against our design.

The two source posts are by Alistair Gray, an engineer on Stripe's internal "Leverage" team, published 2026-02-09 and 2026-02-19 on stripe.dev. The first covers triggers, the devbox environment, and the CI feedback loop. The second, "Part 2", is entirely about Blueprints, the deterministic-plus-agent orchestration model this task specifically asked to compare against our Temporal workflow. A third post was not published as of 2026-09-29, over seven months later, though the first post promised more implementation detail and said the team was hiring.

What Stripe claims: a production system generating "over a thousand" (later "over 1,300") fully agent-written PRs weekly across a codebase that supports more than 1 trillion USD a year in payment volume. What the posts actually show: two well-written engineering narratives with real numbers (3 million tests, a 2-round CI cap, under 5 second local lint, roughly 500 internal MCP tools) but zero code, zero screenshots of a UI, zero PR examples, and zero mention of model names, dollar costs, or credential handling. Independent coverage (InfoQ, a Background Agents Summit talk, Hacker News threads with 60 to 130 comments) corroborates the throughput figure but does not add verifiable detail beyond it.

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Slack thread mention (primary), CLI, a web UI, plus buttons embedded in Stripe's docs platform, feature-flag platform and ticketing UI; CI-generated flaky-test tickets carry a "start a minion" button. All engineer-initiated, no disclosed autonomous trigger from a monitoring alert. | Forgejo webhooks (issues, comments), SigNoz alert webhooks, factoryd intake API. Every task is a Forgejo issue, alerts can open one without a human. | equal, different strengths |
| Control plane | A per-run blueprint executes as a state machine of deterministic and agent nodes. No disclosed fleet-wide task registry, queue, scheduling, budget or approval store beyond a single run's graph. | factoryd plus one Temporal workflow per task, Postgres task registry, policy in Git via Flux, cost ledger, approvals as workflow state. | we lead |
| Worker plane | One isolated "devbox" per run, pulled from a pre-warmed pool, ready in about 10 seconds, the same machine type and image engineers use for QA, full local permissions inside it, no path to production or the internet. | One gVisor pod, Kubernetes namespace and ServiceAccount per task, read-only root filesystem, non-root, default-deny egress with a short allowlist, disposable. | equal |
| Verification | Local lint under 5 seconds, then CI against a suite of over 3 million tests with automatic fixes for known failure patterns, capped at two CI rounds, then mandatory human review of every PR. No automated model-review gate. | Forgejo Actions on gVisor runners, policy gate (path risk classes), migration gate, reproduction gate, a stronger-model review with a strict verdict, then human approval or an `auto` rule for reproduced normal-risk changes. | equal |
| Merge and deploy | The requesting engineer opens the drafted PR and asks a colleague to review it. Nothing published past a green, reviewed PR. | Bot merge (`factory-merge`) only after a whitelisted human's approval or the `auto` rule, Flux deploy, staged rollout with a soak window. | we lead |
| Policy outside the model | An internal "security control framework" blocks destructive tool calls in code; the devbox's total isolation from production and the internet is the main backstop; Toolshed hands each agent a curated tool subset rather than the full ~500-tool catalogue. | Capability policy is a YAML document in Git, versioned, applied by Flux, enforced in gateway code and Cilium network policy. | equal |
| Identity per task | Not discussed in either post. The write-ups lean entirely on environmental isolation, no mention of scoped tokens, secrets, or how the agent reaches git, an LLM endpoint, or Toolshed. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by factory-gateway, no key material reaches the sandbox; two short-lived Forgejo tokens are the one named exception. | we lead |
| Artifacts, not chat | The trigger is a Slack thread and, per the post, a dissatisfied engineer's correction is also given as more instructions in the same conversational surface. The output is a branch and a PR built from Stripe's own PR template. | `TaskBrief` in, branch, PR and a normalised event stream out. Corrections happen through workflow signals and issue comments, not a persistent chat session with the agent. | we lead |

## 3. Architecture and stack

Closed internal system, nothing to clone. Everything below is read from the two stripe.dev posts, the InfoQ writeup (2026-03-20), a Background Agents Virtual Summit talk page for Alistair Gray's May 2026 session, and a Sourcegraph blog post on Toolshed (undated, cites the same author). Anything about internals the posts do not show is marked not verified.

**Harness.** The agent loop is an internal fork of Block's Goose (Apache-2.0 upstream), forked in late 2024 and "adapted to Stripe's LLM infrastructure and tuned for unattended use, no interruptibility or human steering commands, and no confirmation prompts, because each run is confined to a single isolated devbox." No model name, model tier, or model-selection logic is published anywhere in either post, the InfoQ piece, or the summit talk page. Cursor and Claude Code are named only as tools Stripe engineers use for their own interactive, human-driven work, alongside the same directory-scoped rule files Minions read; they are not stated to be what Minions run on.

**Blueprints.** Part 2's whole subject. A blueprint is "a workflow defined in code that directs a minion run," positioned between a pure workflow (deterministic, rigid) and a pure agent loop (flexible, unreliable). Stripe's own summary: "a state machine that intermixes deterministic code nodes and free-flowing agent nodes." Agent nodes, labelled things like "Implement task" and "Fix CI failures," get broad discretion. Deterministic nodes, "Run configured linters," "Push changes," never call a model. The stated reason to hard-code an anticipatable decision rather than leave it to the agent: it "saves tokens (and CI costs) at scale and gives the agent a little less opportunity to get things wrong," which Stripe calls "putting LLMs into contained boxes." The main devloop blueprint is: implement, lint locally in a loop, push, run CI, fix, push once more, hand off to a human. Teams can also author their own blueprints for narrower jobs, Stripe names large-scale LLM-assisted code migrations as one example a purely deterministic codemod could not handle. The blueprint layer also does per-node context engineering, restricting tools, editing the system prompt, or trimming the conversation for a given subtask, rather than one session carrying full context throughout.

This maps closely onto our Temporal workflow. Our workflow is already a graph of deterministic activities (create the sandbox, open the PR, run the policy gate, the migration gate, the reproduction gate, wait for a Temporal signal) interleaved with agent-loop activities (up to three agent sessions). The difference is exposure: Stripe's blueprints are a small authoring framework other teams reuse to build new node graphs for new task shapes, ours is one workflow definition for one capability class (`coder`). Since analyzer, integration tester and release agent classes are already on our own list of what is missing, the concrete thing to copy is not the state-machine idea, we have it, it is making our workflow's activities into a reusable node library so a new capability class is a new graph, not new factoryd code, plus adopting explicit per-node context scoping as a named mechanism rather than an implicit side effect of what a session happens to be given.

**Dev environment.** Each run gets a "devbox," pulled from a pre-warmed pool, ready in about 10 seconds with the codebase, tools and services already loaded, "the same machine type engineers use." It is "isolated from production resources and the internet, so we can run minions on devboxes without human permission checks." Devboxes were originally built so humans could experiment safely and turned out equally useful for agents, giving Minions environment parity with what a human developer already debugs in. The posts give no cloud provider, machine spec, or per-box cost; a secondary summary (ByteByteGo) guesses AWS EC2 without sourcing it, treat that as unverified.

**Toolshed.** A centralised internal MCP server. The first post says it "hosts more than 400 MCP tools spanning internal systems and SaaS platforms we use at Stripe," a later Sourcegraph piece puts the count at "nearly 500," serving "a fleet of hundreds of different agents" company-wide, not just Minions. Adding a tool to Toolshed "immediately grants capabilities to our whole fleet." Minions get a small default subset; an engineer can opt a given minion into named thematic tool groups. Stripe's stated reason: "Agents perform best when given a 'smaller box' with a tastefully curated set of tools." Static context comes from the same directory-scoped rule files Cursor and Claude Code read (mostly scoped by subdirectory, global rules used sparingly), so there is one source of truth for coding conventions rather than a duplicate prompt per tool.

**Codebase scale, unresolved.** A YouTube talk title from the same author calls it "one-shot coding agents on a 30-million-line codebase." A ByteByteGo summary of the same posts says "hundreds of millions of lines of code." These cannot both be exact. Neither figure appears verbatim in the two primary posts as fetched. Treat both as approximate and unreconciled.

## 4. UX

Starting work is the fastest intake path seen in this whole survey: tag a bot in a Slack thread you are already in. No separate console, no ticket form. The same trigger also exists as a CLI command, a web UI, and buttons embedded directly in Stripe's docs platform, feature-flag platform and ticketing UI, and a flaky-test ticket generated by CI carries its own "start a minion" button. A live demo at the Background Agents Virtual Summit (2026-05-06, Alistair Gray) turned a real Jira migration ticket into a running agent and a PR on stage; no recording URL or transcript was found on the summit page itself, only a YouTube listing title, so the demo's content beyond the page's own chapter summary is not verified.

Watching a run is not documented anywhere public. Neither post, the InfoQ piece, nor the summit talk page describes a live log, a progress view, or any screenshot of a UI. Given the harness is explicitly built with "no interruptibility or human steering commands," there may be nothing to watch by design, once launched, a run either produces a PR or it does not, and Stripe treats a partial or wrong result as an acceptable, cheap outcome rather than something to redirect mid-flight.

Intervening happens after the fact, not during the run. The PR appears in the requesting engineer's queue; if it is wrong, per the post, they "can give more instructions or edit manually," where "more instructions" reads as another message in the same conversational surface that started the run. There is no described approval gate before merge beyond the normal human PR review that already exists at Stripe.

Compared to our console, this is far simpler to start and far less visible to watch. Our kanban board (queued, running, waiting-human, in-review, done, failed), our per-task cost view, and our approval-as-workflow-state model have no disclosed counterpart here. Stripe's bet, visible in what they chose to build and what they chose not to talk about, is that entry-point breadth and a strict PR gate matter more than mid-run visibility.

## 5. Security, identity, sandbox, policy, cost

**Sandbox.** A devbox per run, pulled from a pre-warmed pool, cut off from production data and services and from "the internet." Inside the box the agent has "full permissions and no confirmation prompts," there is no described read-only filesystem, non-root user, or kernel-level isolation layer equivalent to gVisor. The isolation is a network boundary, not a hardened container, at least as far as the posts describe it. Whether the devbox can reach anything (an internal LLM endpoint, Toolshed) despite being called internet-isolated is not clarified, a devbox that could reach neither the model nor Toolshed could not function, so "isolated from the internet" is presumably shorthand for a default-deny egress list rather than a literal null network. Not verified either way.

**Policy.** Real and enforced outside the prompt: an "internal security control framework" is described as blocking destructive tool actions in code, and Toolshed's per-agent tool curation is itself a capability restriction applied before a session starts, not something the model can request its way around. There is no disclosed equivalent to a versioned, human-readable policy document comparable to our Git-tracked YAML, if one exists, it was not shown.

**Identity.** The weakest documented area. Neither post mentions how a minion authenticates to git, to Toolshed's backing services, or to whatever serves the model. There is no stated credential rotation, scoping, or per-task token. The entire trust story as published is environmental: the devbox cannot reach anything sensitive, so what credentials it holds, if any, matters less. This is a materially different bet from ours, and it is one Stripe has simply not chosen to talk about, not one shown to be weak.

**Cost.** No dollar figures anywhere, no budget, no hold, no ledger. The only cost-consciousness on record is qualitative: the stated reason to make a step deterministic rather than agentic is partly that it "saves tokens (and CI costs) at scale," and the 2-round CI cap is justified by "diminishing marginal returns" rather than a spend number.

## 6. What we should take from it

### Narrow

**Expose our workflow's activities as a small composable library.** Our Temporal workflow already has deterministic activities (gates) and agent-loop activities (sessions), which is functionally what a blueprint is. The gap is that ours is one hard-coded graph for the `coder` capability class. Building analyzer, integration tester and release agent classes, already on our own list of what is missing, as new graphs assembled from the same activity library rather than new bespoke workflow code, is a direct, low-risk copy of Stripe's actual innovation.

**Per-node context scoping.** Adopt restricting tools, trimming context, and adjusting the system prompt per activity as an explicit, named step in our workflow rather than letting every session inherit the same full context. This should cut both token spend and the chance an agent wanders into a tool or a file it has no business touching for that step.

**A fast local-lint loop before the first push.** Stripe's under-5-second cached lint pass before anything reaches CI is a cheap addition to our worker plane, cuts wasted CI runner minutes and gives the agent same-session feedback before the more expensive Forgejo Actions round starts.

**Cite their 2-round CI cap as validation, not a change.** We already cap CI retries at two. Stripe's identical number, reached independently and justified the same way (diminishing returns), is worth keeping as an external data point the next time that cap is questioned.

**Curated default tool sets from a shared registry.** If our MCP tool surface grows past a handful of tools, adopt Toolshed's pattern now rather than later: a small default subset per capability class, with named, opt-in thematic groups, instead of every session seeing every tool the gateway can proxy.

### Broad

**A signal-to-task button wherever a ticket already exists.** Stripe's flaky-test ticket carries a one-click "start a minion" button. Our console's alert and issue views could carry the same pattern, since a SigNoz alert or a labelled Forgejo issue is already most of a TaskBrief.

**Treat environment parity as a first-class investment, not a side effect.** Stripe's devbox pool was built for humans first and paid for itself twice when agents could reuse it unmodified. Our worker-plane sandbox is agent-only; a warmed, reusable project image that a human can also debug in would close some of the "no real-time streams, no diff view" gap on our own weak-points list, since a human inspecting the same environment an agent used lowers the cost of a manual look when something goes wrong.

## 7. Where our philosophy differs and what that costs or buys us

**Environmental trust versus scoped identity.** Stripe's entire credential story, as far as it is published, is "the box cannot reach anything sensitive." That is cheap and simple, and it costs them nothing extra to build once the devbox network boundary exists. It does not transfer to us: our tasks must push real code upstream through git and spend real, metered money per model call, so a null-network sandbox cannot be the whole answer. Our per-task projected token and gateway-mediated spend are the price of agents that must reach the outside world in two specific, audited ways instead of not at all.

**No mid-run steering versus a supervisor loop.** Stripe's harness is deliberately non-interruptible, a run either lands or it does not, and a bad run is a cheap, discardable PR. We built stall and repeat detectors and a supervisor model specifically because a wasted attempt is not free against our hard per-task and per-day budget caps. Their approach is simpler and works because Stripe can absorb a bad PR's cost; ours exists because we cannot.

**Human review as the only qualitative gate versus a model-review gate.** Every Minions PR gets a full human review, no automated review step sits between CI and the reviewer. That is affordable with thousands of engineers reviewing 1,300 PRs a week between them. We do not have that reviewer pool, which is exactly why our review-frontier gate and our conditional `auto` merge rule for reproduced, normal-risk changes exist, to keep the every-change-needs-a-human rule true without needing Stripe's headcount to make it affordable.

**Chat as the coordination surface versus artifacts only.** Stripe's correction loop, "give more instructions" when a PR is wrong, happens in the same Slack thread that started the run. We deliberately built TaskBrief-in, PR-out as the only exchange surface, with corrections arriving as workflow signals and issue comments rather than a persistent conversation with the agent. Their model is faster to use for a human already in Slack; ours keeps every exchange attributable and replayable as a Git artifact, which matters more once a task can span multiple sessions and multiple reviewers.

## 8. Red flags and slop assessment

The system is real. Two independent named people, an engineering manager (Cameron Bernhardt) and the head of AI platform (Steve Kaliski, whose viral X thread on 2026-02-09 preceded the first post), attached figures to it. A conference talk with a live demo followed in May 2026. Hacker News engaged with three separate threads (up to 131 points, 65 comments) arguing about whether PR count is a meaningful metric and whether reviews of agent-written PRs risk becoming rubber stamps, that is scepticism about the metric, not evidence the system does not exist.

The gap is disclosure, not substance. No model name, no dollar cost, no credential mechanism, no example PR, and no screenshot of any UI appear in either post, the InfoQ coverage, or the summit talk page. A promised "Part 2" covering "implementation details" arrived and covered blueprints, but a further post has not appeared as of 2026-09-29, seven months on.

One analysis found in search (rywalker.com/research/stripe-minions) is candid that its author is the CEO of a competing product (Tembo) and explicitly labels several of its own figures, engineer-count thresholds and a "deeper MCP than Ramp" comparison, as its own unsourced heuristics rather than Stripe's numbers. Treat its framing as a competitor's read, not a verification of Stripe's claims.

Nothing here is sold, so there is no licence to check, no open-core gating, and no vendor lock-in in the usual sense. The only real risk for anyone trying to learn from it is over-generalising: this is one company's Ruby-and-Sorbet monolith, built on years of internal devex investment (a 3-million-test suite, a 500-tool internal MCP registry, a company-wide devbox fleet) that a small team cannot reproduce, only the mechanisms, not the scale, are portable.

## 9. Sources

- https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents (fetched 2026-09-29, dated 2026-02-09)
- https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2 (fetched 2026-09-29, dated 2026-02-19)
- https://www.infoq.com/news/2026/03/stripe-autonomous-coding-agents/ (fetched 2026-09-29, dated 2026-03-20)
- https://background-agents.com/summit/sessions/alistair-gray/ (fetched 2026-09-29, session recorded 2026-05-06)
- https://sourcegraph.com/blog/mcp-stories-from-the-field (fetched 2026-09-29, undated)
- https://blog.bytebytego.com/p/how-stripes-minions-ship-1300-prs (fetched 2026-09-29, undated third-party summary)
- https://rywalker.com/research/stripe-minions (fetched 2026-09-29, citation review dated 2026-09-23, author discloses a competing product)
- https://news.ycombinator.com/item?id=47086557 (search summary, thread dated 2026-02-21, 127 points, 65 comments)
- https://news.ycombinator.com/item?id=47110495 (search summary, thread dated 2026-02-24)
- https://www.youtube.com/watch?v=W42t-CoXyuE (search result only, title "Stripe Minions: One-Shot Coding Agents on a 30M-Line Codebase", not fetched)
- WebSearch: "Stripe Minions one-shot end-to-end coding agents blueprint" (2026-09-29)
- WebSearch: "Stripe Minions Hacker News discussion" (2026-09-29)
- WebSearch: "Stripe Toolshed MCP server internal tools" (2026-09-29)
- WebSearch: "Stripe company valuation 2026 headquarters founded employees" (2026-09-29)
- WebSearch: "Stripe internal LLM gateway infrastructure model routing engineering" (2026-09-29)
- WebSearch: "stripe.dev/blog Minions Alistair Gray published date February 2026" (2026-09-29)
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/01-report-template.md
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md (Temporal workflow and gate activity sections)
