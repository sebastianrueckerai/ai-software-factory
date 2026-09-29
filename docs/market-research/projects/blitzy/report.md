---
name: Blitzy
slug: blitzy
url: https://blitzy.com
repo: none
category: factory-orchestrator
license: proprietary
open_source: no
self_hostable: partial
hosting_model: vendor SaaS (Blitzy Cloud VPC) by default; customer VPC, single-tenant, on-prem or "black-box on-prem" at the top two paid tiers
company: Blitzy Inc, Cambridge MA, founded 2023 by Brian Elliott (CEO) and Sid Pardeshi (CTO); about 204-206M USD raised total, 1.4B USD valuation (Northzone-led round, May 2026)
maturity: no public repository or stars; company grew from about 80 to 200+ staff between May and September 2026; free Sandbox tier shipped 2026-09-14, PR Review feature shipped 2026-09-28, headline SWE-Bench Pro claim revised from 66.5% (March 2026) to 84.95% (June 2026)
similarity: 2
axes:
  signals_intake: 1
  control_plane: 1
  sandbox_isolation: 2
  verification: 3
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 2
  ux: 2
  reseedable_selfhost: 1
steal:
  - A persistent, always-current knowledge graph of the whole codebase, rebuilt on every merge, given to every agent as shared context. Directly answers our own listed weakness of having no project memory or codebase index.
  - PR Review as a rationale-plus-evidence summary (what changed, why, what validated it) instead of a raw diff, aimed at PRs too large to review line by line. A concrete pattern for our console's missing diff view.
  - A .blitzyignore file, gitignore syntax, to scope what an agent run may touch. Trivial to add to our worker plane as a repo-level exclusion list on top of policy.
  - A hard two-phase approval gate: approve a generated plan of action (tech spec) before any code is written, then approve the PR after. Matches our "approval as workflow state" principle better than most competitors we reviewed.
  - Secrets for build and runtime are entered through an encrypted UI and are "never exposed to AI agents" (per their FAQ, not verified in code). The intent, injecting credentials at the build step rather than into agent context, matches our identity-per-task principle even though we cannot check the implementation.
  - A non-cancellable job that consumes a fixed, pre-agreed quota of lines. A blunt but simple hard-cap pattern for a single expensive multi-day run, worth considering alongside our budget holds.
differs:
  - The whole pipeline, reverse engineering, orchestration, QA, runs inside Blitzy's own sealed VPC that the customer cannot inspect, rebuild or re-seed. Even the "on-prem" and "black-box on-prem" tiers are a vendor appliance dropped into the customer's network, not something buildable from Git and OpenTofu. This is the opposite of our re-seedable constraint.
  - Pricing is per line of code onboarded and generated (0.10 and 0.20 USD per line) inside 250K to 50M USD annual contracts. The product is shaped as a vendor batch service sold to enterprises, not a tool a small team runs and owns.
  - Work is one giant asynchronous batch job per prompt, days to weeks long and not cancellable, with only two checkpoints (plan approval, PR review). There is no issue or alert intake, no telemetry loop, and no supervisor watching a running job, so the whole signals-plane and gate-supervision half of our design has no counterpart here.
ux_verdict: Fire-and-forget batch UX, submit a spec, get notified days or weeks later, with no live view of agents at work and no visible way to pause or redirect a running job. Weaker than our console's kanban board and worse than most other factory-orchestrator products in this survey.
slop_verdict: A real, well-funded product (1.4B USD valuation, SOC 2 Type II, ISO 27001, named enterprise customers in press coverage) but its headline benchmark numbers are self-reported and were checked only by a firm Blitzy itself hired and pointed at 20 of 731 tasks; treat "record" SWE-Bench Pro scores as marketing until an independent party reproduces them.
---

# Blitzy

## 1. What it is

Blitzy is a proprietary, venture-funded platform that sells autonomous code generation for enterprises with large existing codebases. It is made by Blitzy Inc, Cambridge MA, founded in 2023 by Brian Elliott and Sid Pardeshi, and raised 200M USD at a 1.4B USD valuation in May 2026 (Northzone-led round, per SiliconANGLE and Boston Globe, 2026-05-05). It is sold to Global 2000 engineering organisations and development agencies, priced per line of code, from a free "Reverse Engineer" tier up to 50M USD-a-year "Transformation" engagements.

The company claims it reverse-engineers 100M+ line codebases into a "dynamic knowledge graph", then runs "thousands of specialized agents" for days or weeks per job to deliver 80%+ of a project as compiled, tested code, leaving a "developer's guide for the last 20%" (blitzy.com, fetched 2026-09-29). What the site and docs actually show: a three-stage pipeline (reverse engineer, generate a tech spec for human approval, generate code with multi-agent cross-review), sold as a black box with no inspectable runtime, no public repository, and no way to verify agent count, model mix or isolation claims beyond the vendor's own text.

## 2. Mapping to our five planes

| Plane / principle | What Blitzy does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work starts when a user submits a natural-language spec; the knowledge graph refreshes on repo merges but nothing triggers a new job | Forgejo issues and comments, SigNoz alert webhooks, intake API | we lead |
| Control plane | A job holds a fixed quota of lines to onboard/generate, cannot be cancelled once submitted; no documented task registry, scheduling or audit trail | factoryd, Temporal workflow per task, Postgres, policy in Git, audit trail | we lead |
| Worker plane | Thousands of specialized agents in an air-gapped, inbound-only VPC the vendor operates; no per-task disposability described | gVisor pod and namespace per task, default-deny egress, disposable | not comparable (closed) |
| Verification | Multi-agent QA that cross-reviews output, compile and runtime validation, then a PR Review summary with rationale and evidence | Forgejo Actions, path risk classes, reproduction gate, stronger-model review | equal |
| Merge and deploy | Ends at a PR for the customer's own team to merge; no deploy step documented | Bot merge after approval or auto rule, Flux, staging soak, prod | we lead |
| Policy outside the model | .blitzyignore exclusions, org/team/individual coding-standard settings; enforcement mechanism not disclosed | Policy YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | Secrets entered through an encrypted UI, said to be kept from agents; no task-scoped credential model described | Projected, audience-scoped token per task, no key material in the sandbox | we lead |
| Artifacts not chat | Tech spec document and a PR are the exchanged artifacts; the interaction is still one long natural-language prompt | TaskBrief in, branch, PR and event stream out | equal |

## 3. Architecture and stack

Closed source, no repository. Everything below is from blitzy.com and docs.blitzy.com (fetched 2026-09-29) and is marked as the vendor's claim, not verified.

The pipeline has three stages, per blitzy.com/how_it_works: (1) reverse-engineer a connected GitHub/VCS repo into a knowledge graph ("infinite context stitching", "dynamic agent recruitment"), refreshed on every merge; (2) generate a technical specification the user must edit and approve; (3) run "3,000+ specialized agents" across "every major foundation model" (OpenAI, Anthropic, Google named) to produce up to 3M lines of code, validated at compile and runtime, with a written scope of the remaining 20% for humans. The security page (blitzy.com/security) describes the generation platform as "completely isolated", "not accessible via our user-facing interface or publicly over the internet", and an "inbound-only, VPC-based system that never initiates outbound requests" with "no publicly exposed endpoints". No infrastructure detail (containers, queueing, model routing logic) is disclosed beyond this.

Deployment options listed on the security page: Cloud VPC, Black-box VPC, On-prem, Black-box on-prem. The pricing page ties these to contract tiers: Commercial (500K USD/year, Blitzy Cloud VPC), Enterprise (5M USD/year, Cloud VPC or single-tenant), Transformation (about 10-50M USD/year, customer VPC, on-premises or "black box"). Even the on-prem options are described as a vendor-operated appliance inside the customer's network, not a self-hostable stack a customer's own team can rebuild.

## 4. UX

Zero to first result, per the docs FAQ and how-it-works page: connect a GitHub/VCS repo, receive a generated tech spec, edit and approve it, submit, then wait, the site's own framing is "kick off code generation, then plan your next sprint, or just take a break. We'll notify you when it's done." That is four to five steps to a submitted job, then an asynchronous wait of hours to weeks with no described live view of the agents working. The only screenshots on the marketing site are static dashboard mockups (a "code onboarded" panel, a "timeline" panel); no session log, terminal stream or agent-tree view was found.

Intervention is limited to two points: approving or reworking the generated plan of action before generation starts, and reviewing the delivered PR afterwards (the new PR Review feature, shipped 2026-09-28, gives a change summary, stated rationale and linked test/QA evidence instead of a raw diff). The FAQ states explicitly that "jobs are not cancelable" once submitted. No pause, redirect or escalate action during a run is documented anywhere we found.

This is weaker than our console on every point that matters for supervision: no kanban of running jobs, no per-task cost view, no way to stop a run mid-flight, and a single all-or-nothing approval gate per stage instead of our workflow-state model. The PR Review summary pattern is the one piece worth copying (see section 6).

## 5. Security, identity, sandbox, policy, cost

Sandbox. Isolation is described at the platform level, not the task level: one air-gapped, inbound-only VPC serving all customers' generation jobs, not a disposable sandbox per job. No claim of per-job network or filesystem isolation was found.

Identity. No task-scoped credential model is documented. Internal dependencies, environment variables and secrets needed to compile/run the target code are collected through an encrypted UI and the FAQ says they are "never exposed to AI agents", but the mechanism is not described and cannot be checked, it is proprietary.

Policy. .blitzyignore (gitignore syntax) excludes paths from tech-spec and code generation. Org/team/individual coding and design standards can be set, again with no disclosed enforcement point, prompt or code.

Cost. Per-line pricing (0.10 USD/line onboarded, 0.20 USD/line generated) inside fixed annual contracts, with free and paid evaluation tiers capped by lines of context and lines generated. The only hard cap mechanism found is quota consumption on submission; there is no described ledger, hold, or per-task budget comparable to ours.

Compliance. SOC 2 Type II and ISO 27001 are claimed on the homepage and security page; no report or audit artifact was published for us to check.

## 6. What we should take from it

Narrow. The .blitzyignore mechanism is a one-line addition to our worker plane: a repo-committed exclusion list, on top of (not instead of) our capability policy. The PR Review pattern, a short "what changed, why, how it was validated" summary with links to test evidence, attached to the actual diff, is worth building into our task detail page; it is a smaller lift than a full trace UI and addresses the same "no diff view" gap Factory's Mission Control also points at. Treat their non-cancellable, fixed-quota job as a reminder that a hard upfront cap (not just a running ledger) is a legitimate, simple budget control for a single long-running task.

Broad, for a factory-orchestrator specifically. Blitzy's knowledge graph validates that project memory and a codebase index (our named weakness) is worth solving, but their approach (a vendor-held index refreshed on merge) does not fit our model: we would want the index reproducible from Git, not living in a third party's VPC. Their two-checkpoint approval (plan, then PR) is close to our "approval as workflow state" principle and confirms that a small, fixed number of human touch points is workable at enterprise scale, we do not need to add more approval steps to look more trustworthy, we need better summaries at the ones we have.

## 7. Where our philosophy differs and what that costs or buys us

Blitzy is a sealed vendor service: the reverse-engineering, orchestration and QA all run in Blitzy's own VPC, and even "on-prem" is their appliance in the customer's network. This buys the customer zero operational burden but breaks our re-seedable and no-vendor-lock-in constraints outright; we could not adopt this shape without giving up the ability to delete and rebuild everything from Git.

Per-line, multi-year-contract pricing (0.10/0.20 USD per line, 250K to 50M USD annual tiers) assumes an enterprise buyer paying for a managed outcome, not a cost ledger a small team can watch per task. Our budget-holds-and-caps model serves a different goal, keeping one operator's spend bounded on commodity hardware, and is not something Blitzy's numbers transfer to.

The single long batch job, uncancellable, checkpointed only at plan approval and PR review, is the opposite of our supervised, gated workflow with stall detection and a supervisor model. Their approach may suit a "come back in two weeks" enterprise engagement; ours suits an unattended, continuously running factory that must catch a runaway task quickly. We keep our approach; the cost is that we cannot promise "80% of a quarter of work in one shot" the way Blitzy markets itself.

## 8. Red flags and slop assessment

The company is well funded and appears to be shipping (PR Review on 2026-09-28, a free Sandbox tier on 2026-09-14, a large new Cambridge office signed 2026-09-24 per PR Newswire) and named enterprise customers exist (GNP, a Mexican insurer, per Forbes, 2026-05-05). This is not a README with a landing page.

The headline benchmark claims are weaker than they look. Blitzy reported 66.5% on SWE-Bench Pro in March 2026 and 84.95% in June 2026, both "independently audited" by Quesma, a firm Blitzy itself hired, which examined the full result set itself but only deep-audited 20 of 731 tasks for leakage or reward hacking (Quesma blog, 2026-06, via dev.to mirror). SWE-Bench Pro's own leaderboard does not accept closed-source agent submissions, and separate academic reviews (Epoch AI; an arXiv paper on SWE-Bench Pro reward hacking, both 2026) found the benchmark itself has scoring defects in over 20% of tasks and is vulnerable to leaked gold solutions. None of this singles out Blitzy, but it means the "record" and "#1" claims on the homepage rest on a benchmark under active dispute, checked by an auditor Blitzy selected and paid.

The product itself admits its own bottleneck: PRs "stretch into hundreds of thousands of lines of code" and "traditional line-by-line review becomes increasingly impractical if not impossible" (Blitzy's own PR Review announcement, 2026-09-28). A hands-on reviewer (Vocal Media, undated 2026) reached the same conclusion from the other side: "I would not deploy anything generated without inspection." No public security incident or CVE was found.

## 9. Sources

- https://blitzy.com/ (Firecrawl scrape, 2026-09-29)
- https://blitzy.com/how_it_works (Firecrawl scrape, 2026-09-29)
- https://blitzy.com/security (Firecrawl scrape, 2026-09-29)
- https://blitzy.com/blog/blitzy-announces-pr-review-helping-teams-understand-and-merge-ai-generated-code-faster (Firecrawl scrape, 2026-09-29)
- https://blitzy.com (WebFetch attempt, blocked HTTP 403, 2026-09-29)
- https://docs.blitzy.com/ (WebFetch attempt, blocked HTTP 403, 2026-09-29)
- https://en.wikipedia.org/wiki/Blitzy (search summary, 2026-09-29)
- https://www.bostonglobe.com/2026/05/05/business/blitzy-ai-software-cambridge-unicorn-startup/ (search summary, 2026-05-05)
- https://www.siliconangle.com/2026/05/05/blitzy-raises-200m-1-4b-valuation-deploy-thousands-coding-agents-parallel/ (search summary, 2026-05-05)
- https://news.crunchbase.com/ai/blitzy-funding-valuation-autonomous-software-development-vibe-coding-startups/ (search summary, 2026-05)
- https://www.forbes.com/sites/sofiachierchio/2026/05/05/this-14-billion-startups-ai-writes-code-for-weeks-at-a-time/ (search summary, 2026-05-05)
- https://quesma.com/blog/verifying-blitzy-swe-bench-pro/ (search summary, 2026-06)
- https://dev.to/teamquesma/compare-harnesses-not-models-blitzy-vs-gpt-54-on-swe-bench-pro-5d7 (search summary, 2026-06)
- https://blitzy.com/blog/blitzy-scores-a-record-66-5-on-swe-bench-pro (referenced via search, 2026-03)
- https://blitzy.com/blog/blitzy-scores-a-record-84-95-on-swe-bench-pro (referenced via search, 2026-06)
- https://epoch.ai/benchmarks/swe-bench-pro/review (search summary, 2026)
- arXiv 2609.08149, SWE-Bench Pro Verified: A Reliable Benchmark for Software Engineering Agents (search summary, 2026-09)
- https://vocal.media/journal/blitzy-review-i-tried-it-and-here-s-my-honest-take-on-this-ai-code-generation-platform (search summary, undated 2026)
- https://www.prnewswire.com/news-releases/blitzy-signs-cambridges-largest-office-deal-of-2026--sealing-a-52-000-sqft-expansion-302888650.html (search summary, 2026-09-24)
- gh api users/blitzy and gh api orgs/blitzy (rate-limited, 2026-09-29; seed list already records repo as none)
