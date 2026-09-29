---
name: FactoryKit
slug: factorykit
url: https://factorykit.ai
repo: none
category: factory-orchestrator
license: "mixed: proprietary (platform), FSL-1.1-ALv2 (Passmark/qa-agent evidence library)"
open_source: no
self_hostable: no
hosting_model: hosted SaaS only, GitHub App install, no VPC or self-hosted option found
company: LinearBytes Inc. (Delaware, founded 2016, trades as Hashnode and Bug0); Hashnode raised a 6.7M USD Series A in Aug 2021 led by Salesforce Ventures; no separate funding disclosed for the factory product
maturity: platform has no public repo; launched as Darkshift (~Mar 2026), renamed FactoryKit (~Jul 2026), renamed again Buildful (by Sep 2026), built in 23 days by 2 engineers per the founder; related OSS repo bug0inc/qa-agent created 2026-03-29, last push 2026-09-25, 1274 stars, 188 forks, 38 open issues
similarity: 3
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 3
  verification: 4
  policy_outside_model: 3
  identity_per_task: 4
  cost_control: 1
  ux: 4
  reseedable_selfhost: 0
steal:
  - Egress-time credential injection: platform tokens and model keys are brokered into outbound requests and scoped per repository, encrypted at rest, and never enter the sandbox process; only the repo's own application env vars do. Matches our "identity belongs to the task" principle almost exactly and is described as running in production.
  - The agent never runs git. Only the control plane commits, pushes and opens the pull request (one PR per changed repo, follow-up messages stack commits). Removes an entire class of credential and integrity risk versus giving the agent a write token.
  - Browser-regression evidence attached to every PR: the repo's own checks run first (with up to 3 fix attempts), the agent self-reviews the diff, then a real browser session verifies the change in plain language and the recording is attached to the PR. We have no UI/runtime evidence step at all today.
  - Multi-model consensus assertion (their open-source QA engine): Claude and Gemini both judge an assertion, a third model (Gemini 3.1 Pro) arbitrates on disagreement, with a fail-on-disagreement mode to surface ambiguity instead of hiding it. A cheap pattern for any verdict we want more than one model to agree on.
  - Their QA engine's secure-script-runner.ts (src/utils/secure-script-runner.ts, over 1700 lines): an acorn-based AST allowlist that restricts an AI-generated Playwright script to a fixed set of methods, blocks constructor/__proto__/prototype, and validates fetch URLs against localhost/private-IP ranges plus DNS-rebinding at resolution time. A concrete, tested pattern for constraining any code an agent is allowed to emit and run.
  - Snapshot VM templates baked per coding agent (CLI plus Playwright and a bundled Chromium), forked per run and keyed to a bootstrap hash so bumping the hash forces a rebuild. Same warm-start idea we could apply to our per-task pod images to cut cold-start time.
  - Server-owned run state with live narration streamed into a server-side buffer that the UI tails, replaying from the last seen event, so closing the laptop is "a display problem, not a lost run." Directly addresses a console gap we flagged (no real-time stream of the agent's work).
differs:
  - Pure hosted SaaS with no self-hosted or VPC path anywhere in the docs or FAQ. This is the opposite of our re-seedable, commodity-hardware constraint; there is nothing to adopt here, our whole model requires operator-owned infrastructure.
  - No visible policy-as-code or capability/budget engine. Their one hard guardrail is architectural (the agent cannot call git); everything else (which repos, which secrets, how much to spend) is configured per integration, not expressed as a versioned policy document. Copying their minimalism would cost us the hard spend caps and audit trail our design treats as non-negotiable.
  - Verification's second opinion is the agent reviewing its own diff, not an independent stronger-model reviewer. Cheaper, but weaker than our separate review-frontier gate; adopting it would reduce reviewer independence.
  - The product identity itself has churned three times in seven months (Darkshift to FactoryKit to Buildful) with no dedicated security or architecture page at any point. That pace is incompatible with the stable, auditable posture this project's portfolio purpose needs to demonstrate.
ux_verdict: Zero-setup SaaS onboarding (GitHub App plus Linear/Jira/Slack, describe a task, watch live narration, review a PR with an attached QA recording) is more polished than our functional-but-undesigned console, which has no live stream and no video evidence today.
slop_verdict: Real and dogfooded in production (runs Hashnode and Bug0 itself), from a funded, multi-year team, but the platform is entirely closed and unverifiable, and three rebrands in under seven months with no security or architecture documentation page is a genuine stability red flag.
---

# FactoryKit

## 1. What it is

FactoryKit is a hosted "background coding agent" product from LinearBytes Inc., the company behind the developer blogging platform Hashnode and the AI QA company Bug0. A user (or a Linear/Jira ticket, or a Slack mention) describes a change in plain language; an isolated cloud sandbox clones the repo, an off-the-shelf coding agent (Claude Code, Codex, Grok Build, or Kimi Code) implements it, the repo's own checks run with retry attempts, the agent self-reviews its diff, then a real browser session exercises the UI change and the recording is attached to a pull request that the platform itself opens. It is sold as infrastructure a team would otherwise have to build themselves: "sandbox infrastructure, image caching, credential plumbing, browser QA, then permanent maintenance," per its own FAQ.

The founders' claim, repeated across three successive marketing sites, is that this began as their own internal tool ("we did not set out to build a dev tools company... the factory was the internal tool that made that possible") and that the factory now writes a large share of its own code: a founder's blog post states 403 commits in 23 days, of which 95 were written by the factory itself, and 69 of 99 merged pull requests in that window came from the factory. What the sites actually show, independent of the claim, is a working marketing funnel (pricing, FAQ, demo booking) and one genuine, separately maintained open-source repository (the QA/evidence engine, see below); there is no public code, deployment artifact, or third-party technical review of the factory platform itself to check the claims against.

The product has traded under three names in about seven months of this project's timeline: Darkshift (launched around March 2026, darkshift.dev), FactoryKit (around July 2026, factorykit.ai), and Buildful (live as of 2026-09-29, buildful.ai). As of this research, factorykit.ai 301-redirects to darkshift.dev, which 308-redirects to buildful.ai; all three are confirmed by direct fetch to be the same product, same team, same 99 USD per seat pricing, same tagline family.

## 2. Mapping to our five planes

| Plane / principle | What FactoryKit does | What we do | Verdict |
|---|---|---|---|
| Signals | Linear (label-triggered) and Jira (announced, not confirmed live) tickets, Slack mentions, pasted PRDs, or screenshots create a task. No telemetry or alert-based intake found. | Forgejo issues, PR comments, SigNoz alert webhooks, agent escalations, all through one intake API. | equal |
| Control plane | Run state is "owned by the server and persisted"; no policy engine, budget system or approval workflow is documented beyond code review of the resulting PR. Entirely closed, so depth is unverifiable. | factoryd with a Temporal workflow per task, Postgres task registry, policy-as-YAML in Git, budgets, approvals, cost ledger, audit trail. | we lead |
| Worker plane | Fresh cloud VM per task (Amazon Linux is the only platform named), snapshot template per coding agent (CLI plus Playwright/Chromium), forked per run. Isolation mechanism (container, microVM, plain VM) is not disclosed. | gVisor pod per task, one Kubernetes namespace and ServiceAccount, read-only root FS, default-deny egress with an explicit allowlist. | not comparable (their isolation depth is unverified) |
| Verification | Repo's own checks with up to 3 fix attempts, agent self-review of the diff, then a real-browser QA pass (multi-model consensus assertions) with the recording attached to the PR. | Forgejo Actions, policy gates (risk class, migration flag, reproduction gate), then a separate stronger-model review with a strict verdict. No browser/UI evidence step. | they lead |
| Merge and deploy | Platform commits, pushes and opens the PR; a human merges. No auto-merge or deploy step is described. | Bot-only merge after human approval or an auto rule for reproduced, strictly-improving changes; Flux deploys with a staged rollout and alert-free wait. | we lead |
| Policy outside the model | One hard-coded rule enforced in code: the agent cannot invoke git. No broader capability or network policy is documented. | Capability rules live in a Git-versioned YAML document, enforced in gateway code and network policy; a prompt cannot grant a capability. | we lead |
| Identity per task | Platform tokens and model provider keys are "brokered into outbound requests... scoped per repository" and "encrypted at rest," never entering the sandbox; described as running this way in production across real customers. | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer by factory-gateway. | equal |
| Artifacts not chat | Tasks come in as tickets/messages/PRDs; output is a PR with an attached QA recording; "key decisions and caveats from every run persist to a team-wide shared memory." | TaskBrief in, a branch/PR/event stream out; findings pass to the next session of the same task, no cross-task memory yet. | they lead (persistent cross-task memory is something we do not have) |

## 3. Architecture and stack

Everything about the platform itself is second-hand: the founders' own blog posts (sandeep.dev/blog/software-factory-you-can-buy, sandeep.dev/blog/what-a-software-factory-costs) and the current marketing site (buildful.ai, formerly factorykit.ai/darkshift.dev). All of the following is inference from those sources, not verified code.

The cost-of-building post describes seven "stations": isolated execution (fresh VM per task), snapshot templates (one image per supported coding agent, baked with the agent CLI plus Playwright and a bundled Chromium on Amazon Linux, forked per run and keyed to a bootstrap hash), credential handling (platform tokens and provider keys brokered into outbound requests and never entering the sandbox; application env vars the repo itself needs do enter it), git/PR orchestration (the agent edits files only; the platform authenticates as a GitHub App, exchanging a signed JWT for a per-repository installation token, then commits, pushes and opens the PR through the GitHub API), a server-owned run loop (state persisted server-side so a closed laptop does not kill a run), live observability (narration streamed to a server-side buffer the UI tails, with replay from the last event), and verification (browser QA inside the sandbox, recorded, attached to the PR). Verification leans on Bug0's open-source Passmark library. The founders single out verification as the most expensive station to build and credential handling as "the station most likely to be underestimated."

The one piece of this stack that is actually public and readable is github.com/bug0inc/qa-agent, published as the npm package @bug0/ai (package name in package.json is passmark), under the marketing name "Bug0 AI." It is a TypeScript/Playwright library, not the factory platform: src/assertion.ts (398 lines) implements the multi-model consensus assertion engine (Claude as primary, Gemini as secondary, Gemini 3.1 Pro as arbiter, configurable consensusPolicy: "fail-on-disagreement"); src/data-cache.ts (587 lines) implements Redis-backed step caching with auto-healing; src/cua/loop.ts (277 lines) implements an OpenAI computer-use-agent mode via the Responses API computer tool; src/utils/secure-script-runner.ts (over 1700 lines read) is an acorn-based AST allowlist runner for AI-generated Playwright scripts, with a hand-maintained allowlist of locator/action/assertion methods, blocked prototype-pollution properties, and SSRF/DNS-rebinding guards on fetch; src/instrumentation.ts wires optional Axiom/OpenTelemetry tracing. The repo has a real CHANGELOG.md, CONTRIBUTING.md, a documented src/ layout, and a test suite (src/__tests__/*.test.ts). It is licensed FSL-1.1-ALv2 (source-available now, converts to Apache-2.0 two years after each release; commercial use that competes with Bug0 Studio is excluded), which GitHub reports as license Other/NOASSERTION. gh api repos/bug0inc/qa-agent shows: created 2026-03-29, last push 2026-09-25, 1274 stargazers, 188 forks, 38 open issues, default branch main.

Whether the platform literally imports this npm package or reuses the same team's private fork of it is not confirmed; the README's own words are that FactoryKit "works your backlog" and a Bug0 AI suite "slots in" as a check FactoryKit could run, which reads as the two being complementary products rather than one embedding the other's source. Treat the platform's verification step as very likely the same technique and possibly the same code, not as a proven fact.

## 4. UX

Onboarding, as described on the current site and the two blog posts: install a GitHub App scoped to chosen repositories, connect Linear/Jira/Slack (or just submit a task through the web UI), optionally sign in once to the target app so QA runs can test signed-in pages, then describe a task in plain language. From zero to a first PR is roughly three steps (install, connect or describe, wait), with no local dev environment at any point ("no local dev environment, ever" and "I haven't touched my local dev setup at all" are both direct founder quotes).

While an agent works, the described experience is a live-tailed narration stream (server-side buffer, UI tails it, replays from the last event on reconnect) rather than raw tool-call logs, which are deliberately hidden as noise. A user intervenes by sending a follow-up message, which stacks another commit onto the same PR, or by closing the PR if the result is wrong; the FAQ is explicit that Buildful never merges and never pushes to the default branch, so the worst case is stated to be a branch to delete. There is no mention of a pause, approve or redirect control mid-run, only before (task description) and after (PR review) the run. No screenshots of the actual working UI were retrievable through WebFetch: the page describes UI elements in prose (for example "ISOLATED SANDBOX" panels and a task-to-PR pipeline figure) but did not surface as inspectable images.

Compared to our own console (server-rendered htmx kanban board, explicitly functional rather than designed, no real-time stream, no diff view): FactoryKit's live narration and attached QA recording are things we do not have, and both are flagged as known weaknesses in our own baseline. What FactoryKit lacks that we have: a visible task board across projects, a cost-per-task view, and an explicit human-approval workflow state (their control is closing a PR after the fact, ours is a pre-merge gate).

## 5. Security, identity, sandbox, policy, cost

Credentials. Platform tokens (GitHub) and model provider API keys are described as brokered or injected into outbound requests in transit and scoped per repository, encrypted at rest, and never entering the sandbox process; the agent is explicitly said to be unable to leak what it never had. This is the same shape as our gateway-mediated, task-scoped credential model, but none of it is independently verifiable since the enforcement code is closed.

Sandbox. Each task gets a fresh cloud VM (Amazon Linux is the only platform detail given) provisioned from a pre-baked snapshot per coding agent. No network egress policy (allowlist, default-deny, DNS control) is documented for the sandbox itself; the only concrete network-security artifact seen is in the separate Passmark library, whose secure-script-runner.ts blocks fetches to localhost and private IP ranges and checks DNS resolution against the same list to stop rebinding attacks.

Policy. The only capability rule stated outright is architectural, not configurable: the agent cannot invoke git, so nothing it does can land without going through the platform's own commit, push and PR path. There is no visible policy-as-code system, no mention of network policy, and no per-project capability document; access control is a GitHub App install scoped and revoked in GitHub, which is coarser than a capability-per-tool model.

Cost. Pricing is 99 USD per user per month for the platform, plus model usage billed one of three ways: metered at each provider's published token rates with no markup, billed directly against the customer's own provider API key, or, for Codex, an existing subscription. No hard per-task or per-day spend cap, budget hold, or cost ledger is described anywhere in the public material; cost control is left to the provider billing relationship the customer already has.

## 6. What we should take from it

Narrow, copyable this month: the acorn AST-allowlist pattern in secure-script-runner.ts for constraining any code an agent is allowed to run, including its SSRF and DNS-rebinding guard on outbound fetches; the multi-model consensus-with-arbiter pattern for any verdict where we want more than one model to agree (their default is Claude plus Gemini plus a Gemini arbiter on disagreement, with a stricter fail-on-disagreement mode); keying a warm sandbox image to a bootstrap hash so a version bump forces a rebuild, otherwise reuse.

Broad, shapes priorities rather than code: attaching runtime browser evidence (a recorded QA session) to a pull request is a verification signal our five-plane design does not produce at all today, and it directly targets the kind of regression a diff-only or unit-test-only review misses. Live-tailed narration with replay-from-last-event is a concrete answer to our own flagged console gap of having no real-time stream of the agent's work. Persistent team-wide memory across tasks, seeded by importing Notion, Jira or Linear context, is also a gap we call out in our own baseline as no project memory and no codebase index.

## 7. Where our philosophy differs and what that costs or buys us

FactoryKit is SaaS-only with no self-hosting or VPC path found anywhere in its docs, FAQ, or blog; this is the direct opposite of our re-seedable, commodity-hardware constraint, and there is nothing here we could adopt without abandoning that constraint entirely. Their policy layer is a single hard-coded architectural rule (no git access for the agent) rather than a versioned, auditable capability document; that buys them a smaller surface to build but costs them the fine-grained, per-project, per-capability control and the audit trail our design treats as required, not optional. Their verification's second opinion is the same agent reviewing its own diff, which is cheaper than running a distinct stronger review model but weaker on independence than our separate review-frontier gate. Finally, their own architecture-cost blog post is candid that verification, the browser QA and evidence step, was the single most expensive station to build, which is a useful data point that our own lack of a UI evidence step today is not cheap to close either.

## 8. Red flags and slop assessment

The product has changed its public name and domain three times within roughly seven months of the same calendar year covered by this research (Darkshift, around March 2026; FactoryKit, around July 2026; Buildful, live by 2026-09-29), each time via a full HTTP redirect chain from the older domain, with no public rename announcement found for either transition. At no point across any of the three sites is there a dedicated security, architecture, or self-hosting documentation page; the current site's FAQ navigation link is anchored to a security fragment but the section it points to contains no security content at all. No independent Hacker News or Reddit discussion of the product under any of its three names was found by direct search, consistent with an earlier attempt's finding; all technical claims (credential injection, sandbox isolation, git orchestration) trace back to the founders' own blog and marketing copy, none to third-party verification. Weighing the other way: the team has a multi-year track record (Hashnode since 2016, funded), a second product (Bug0) in the same space, and the one genuinely inspectable artifact, the bug0inc/qa-agent repository, is a real, tested, actively maintained codebase (1274 stars, 188 forks, commits through 2026-09-25, a real changelog and contributor guide), which lends some credibility to the team's general technical competence even though it does not prove anything about the closed factory platform itself.

## 9. Sources

https://factorykit.ai (redirects 301 to https://darkshift.dev)
https://darkshift.dev (redirects 308 to https://buildful.ai)
https://buildful.ai
https://buildful.ai/#security
https://factorykit.ai/pricing (redirects to https://darkshift.dev/pricing)
https://sandeep.dev/blog/software-factory-you-can-buy
https://sandeep.dev/blog/what-a-software-factory-costs
https://bug0.com
WebSearch: FactoryKit factorykit.ai software factory AI coding agent
WebSearch: LinearBytes Inc Bug0 Hashnode funding crunchbase
WebSearch: Buildful OR Darkshift OR FactoryKit Sandeep Panda hacker news
WebSearch: site:news.ycombinator.com Darkshift OR Buildful OR FactoryKit background coding agent
gh api repos/bug0inc/qa-agent
Clone: ~/repos/market-research-clones/factorykit (github.com/bug0inc/qa-agent, depth 1)
  README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE.md, package.json, .env.example
  src/utils/secure-script-runner.ts
  src/ directory listing (config.ts, assertion.ts, data-cache.ts, tools.ts, cua/loop.ts, cua/prompts.ts, prompts/index.ts, providers/emailsink.ts, utils/index.ts, utils/playwright-best-practices.ts, utils/tab-manager.ts, __tests__/*.test.ts)
