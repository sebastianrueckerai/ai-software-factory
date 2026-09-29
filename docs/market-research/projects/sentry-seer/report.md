---
name: Sentry Seer
slug: sentry-seer
url: https://sentry.io/product/seer/
repo: none   # the core "seer" agent repo (github.com/getsentry/seer) is private; see section 1
category: telemetry-to-fix
license: "mixed: proprietary (Seer agent service), FSL-1.1-Apache-2.0 (sentry, sentry-mcp client glue)"
open_source: partial
self_hostable: no
hosting_model: SaaS add-on to Sentry.io only, sold on Team, Business and Enterprise plans, no on-prem or self-hosted option
company: Sentry (Functional Software, Inc.), San Francisco, founded 2012 from a 2008 open-source project, roughly 217M USD raised through a 2022 Series E at a 3B USD valuation
maturity: Autofix launched March 2024 and was rebranded and expanded into "Seer" through 2025; core agent repo is private with no public stars; sentry-mcp (public, 869 stars, 106 open issues, created 2025-03-29) last commit 2026-09-28; getsentry/sentry (44878 stars, created 2010-08-30) pushed 2026-09-29; pricing model last changed 2026-01-21
similarity: 2
axes:
  signals_intake: 4
  control_plane: 3
  sandbox_isolation: 1
  verification: 3
  policy_outside_model: 3
  identity_per_task: 2
  cost_control: 2
  ux: 5
  reseedable_selfhost: 0
steal:
  - A numeric fixability and actionability score, 0 to 1, with named thresholds super low, low, medium, high, super high, used twice, once to decide whether to act at all and again to decide how far to go, instead of a single automation on or off switch.
  - The stopping point ladder, root cause, then solution, then code changes, then open PR, where the run always stops at whichever is more conservative of the score suggested point and the human configured ceiling, a one line minimum over an ordered enum.
  - Delegating only the final code writing step to an already authenticated external coding agent, Claude Code, Cursor Background Agents, or GitHub Copilot, while keeping retrieval and root cause reasoning in house, so the hardest part, sandboxed execution, stays with a specialist.
  - A scheduled overnight job that re reads the previous night's agent runs with a stronger model and files tickets for the broken ones, a cheap automatic verdict pass over agent output quality itself.
  - Reusing the same telemetry plus code context store to review PRs a human wrote, not only PRs the agent wrote, so the same investment pays twice.
  - GitHub permission tiering that names exactly which feature breaks when a specific OAuth scope is missing, instead of a single all or nothing integration broken flag.
  - A tool catalog indirection, search tools and execute tool, that keeps the directly registered MCP tool count near 20 while still exposing dozens of operations, to stay under other agents' tool count ceilings.
differs:
  - Seer is a single purpose, SaaS only, closed core pipeline bolted onto one existing product; it never has to be a general task system for arbitrary work across arbitrary repos and forges the way our factory does.
  - Cost control is a flat per seat subscription with no visible hard per task spend cap, which only works because a large customer base absorbs the variance; our per task, per day, per project budget with holds exists because we have no such base.
  - The gate before opening a PR is a confidence score, not test evidence; we require a reproduction gate, fails at base and passes at head, because we treat that evidence, not a probability estimate, as load bearing before a human reviews the diff.
  - Where visible, execution identity borrows the initiating human's own OAuth token, the GitHub Copilot handoff, rather than a credential scoped to the task itself, the opposite of identity belongs to the task.
ux_verdict: "Zero extra onboarding for an existing Sentry user and a live reasoning drawer beat our static console today, but Seer only ever shows one workflow per issue, never a cross project queue."
slop_verdict: "Real and used in anger, with production code level fixability gating and a reported 38000 plus auto fixed issues, but the once public core agent repo went private in 2025 and self hosted users have no date to ever get it, the sharpest open core bait and switch found in this survey."
---

# Sentry Seer

## 1. What it is

Seer is Sentry's paid, hosted feature that turns an error or performance issue already captured by the Sentry SDK into a root cause explanation, a proposed fix, and a pull request, without anyone filing a ticket first. Sentry, the company, sells it as an add-on on top of its existing error tracking and APM product, priced per active contributor per month. It ships four connected surfaces: automated issue triage and a fixability score, an Autofix root cause to PR pipeline, Seer Code Review, an AI reviewer for any pull request, not only Autofix's own, and a hosted MCP server that lets external coding agents call into the same pipeline.

The makers claim Seer is an AI debugging companion that finds root causes with the same context an engineer would use, and can go end to end to an opened PR. The documentation and code show something narrower but real: a scored triage step that decides how far to automate per issue, a private agent service that does the actual reasoning, and an explicit, repeated exclusion of the whole feature from self-hosted Sentry. The task hint that described this as "the open-source seer service" does not hold: github.com/getsentry/seer, the actual agent, is a private repository. Sentry staff confirmed on a public GitHub issue that it "became closed source" in mid-2025, and a February 2026 comment on the self-hosted tracker still gives self-hosted users "no timeframe" for ever getting it. What is public is the RPC glue inside the FSL-licensed getsentry/sentry monorepo, path src/sentry/seer, and a separate, genuinely open MCP server, getsentry/sentry-mcp, that calls the same private service. This report is built from those public parts, not from the private agent's own source.

## 2. Mapping to our five planes

| Plane or principle | What Seer does | What we do | Verdict |
|---|---|---|---|
| Signals | Every ingested error or performance issue is auto-scored for fixability; further triggers come from Slack, PR comments such as "at sentry review", the MCP tool, the CLI, and a scheduled overnight agentic triage sweep, internal name night_shift. No human has to file anything. | Forgejo issues and SigNoz alerts become tasks via webhook and intake API; a human or an alert rule creates the issue. | They lead. Their intake is telemetry-native with a numeric confidence gate; ours still routes through an issue object first. |
| Control plane | A per-issue run, SeerRun and AutofixState, with named stopping points, dedupe locks, org and project automation tuning settings, quota checks and analytics events per phase, but scoped to exactly one pipeline shape. | Temporal workflow per task, Postgres task registry, policy documents in Git, budgets, model tier choice, cost ledger, full audit trail, general across work types. | Equal for the one pipeline they run; not comparable in scope, since theirs never has to be general. |
| Worker plane | A private SeerAgentClient does root cause, solution and code changes by default; the code changes step can instead be handed to Claude Code, Cursor Background Agents or GitHub Copilot's own hosted agent and sandbox. No sandbox detail is published for the in-house steps. | One gVisor pod per task, read-only root filesystem, default-deny egress, an opencode-based harness behind a Go interface. | Not comparable. We cannot verify what, if anything, isolates their own execution; where they do disclose an environment, it belongs to someone else's product. |
| Verification | A fixability and actionability score gates automatic runs; an optional AI Code Review pass comments on the opened PR and on any human PR; a person merges. No evidence of running the proposed fix's tests before the PR opens. | Forgejo Actions on gVisor runners, policy gates on path risk and migrations, a reproduction gate that requires the change to fail at base and pass at head, stronger-model review, verdict-gated auto-merge for low-risk reproduced changes. | We lead on gate rigor: a confidence score is not test evidence. They lead on breadth: they also review PRs their own agent never touched. |
| Merge and deploy | Seer only ever opens a PR. It never merges or deploys; that is left entirely to the target repository's own CI and CD. | Bot merge after approval or an auto rule for reproduced low-risk changes, Flux deploy, staged rollout with an alert-wait window. | Not comparable. Deploy is explicitly out of scope for Seer. |
| Policy outside the model | Eligibility, quota and automation-tuning checks run as plain Django code before any model call: get_seer_automation_ineligibility_reason, is_self_hosted, quotas.backend.check_seer_quota, github_permission_tiers. None of it is a prompt instruction. | Capability rules live as a document in Git, enforced in gateway code and NetworkPolicy. | Equal in spirit. Theirs is feature and quota gating; ours is a document a non-engineer can read, so we lead on legibility. |
| Identity per task | GitHub access is a scoped GitHub App installation, short-lived installation tokens, but shared across every run for that installation, not minted per task. The GitHub Copilot handoff explicitly borrows the initiating human's own OAuth token to poll status. The internal coding step's own credential scope is unverified, closed source. | A projected, audience-scoped, per-task ServiceAccount token; two short-lived, per-session forge tokens the worker holds only around the agent's run. | We lead. Per-task identity is a stated principle here and only partly evidenced there. |
| Artifacts not chat | Root cause and solution are structured artifacts passed between phases and to a handed-off coding agent, but a live conversation drawer and Slack chat are also first-class surfaces, and PR iteration explicitly reads free-text PR comments as control input. | A TaskBrief in, a branch, PR and event stream out, no chat surface at all. | Not comparable. Their phase-to-phase handoff matches our principle, but they deliberately also expose a chat surface we deliberately do not build. |

## 3. Architecture and stack

The orchestration layer is Python and Django, living inside the public, FSL-licensed getsentry/sentry monorepo under src/sentry/seer, with subdirectories for autofix, code_review, agentic_triage, similarity, smart_assignment, explorer, entrypoints, models, workflows. It is RPC glue, not the agent. Every call to the actual reasoning service goes over HMAC-signed HTTP, in src/sentry/seer/signed_seer_api.py: hashlib and hmac signing, a SeerViewerContext, and separate urllib3 connection pools per subsystem such as SEER_AUTOFIX_URL, SEER_SUMMARIZATION_URL, SEER_ANOMALY_DETECTION_URL, SEER_GROUPING_URL. The receiving service, github.com/getsentry/seer, is confirmed private: a Sentry engineer's comment on getsentry/sentry issue 94850 says it "became closed source" in mid-2025, and a 2026-08-03 update on getsentry/self-hosted issue 3625 still lists AI and Autofix features as unavailable with "no timeframe."

The fixability mechanism lives entirely in src/sentry/seer/autofix/constants.py: FixabilityScoreThresholds, super high 0.76, high 0.66, medium 0.40, low 0.25, super low 0.0, and AutofixAutomationTuningSettings, off, super low, low, medium, high, always, a per-org and per-project dial that decides which threshold is enough to trigger an automatic run at all. src/sentry/seer/autofix/issue_summary.py computes the score itself with make_fixability_score_request, a POST to the path v1/automation/summarize/fixability on the private service, and a function named get stopping point from fixability maps the resulting float to how far an automatic run goes: below medium, no run; medium to high, root cause only; high up to just past super high, code changes; above that, an opened PR. A function named apply user preference upper bound then caps that against whatever stopping point the org configured, always taking the more conservative of the two. At general availability the documented defaults are automatic issue scans on and automatic fixes for issues scored highly actionable and above.

For the coding step itself, an internal, undocumented SeerAgentClient does root cause, solution and code changes by default. src/sentry/seer/autofix/coding_agent_handoffs.py and coding_agent.py let the code changes step instead be delegated to Claude Code, Cursor Background Agents, or GitHub Copilot's coding agent; Sentry then only polls the third party's own status API, for example a function named poll github copilot agents, and records the resulting PR against its own run. No public source, doc or blog post describes a sandbox for the steps Seer keeps in-house; this is marked not verified.

GitHub write access runs through a dedicated Seer by Sentry GitHub App, being folded into the main Sentry GitHub App, requesting Pull Requests and Checks, read and write, and Contents, write, used only to create branches, not for direct pushes to existing branches. src/sentry/seer/autofix/github_perms.py resolves, per repository, which named feature tier an installation's granted scopes actually satisfy, and degrades individual features rather than failing the whole integration. src/sentry/seer/autofix/commit_author.py resolves a real GitHub identity for commit and PR authorship via ExternalActor mapping where one is known, rather than always using one shared bot account.

The MCP server is a separate, fully public repository, getsentry/sentry-mcp, FSL-1.1-Apache-2.0, 869 stars. It is a pnpm and TypeScript monorepo, packages/mcp-core for the shared implementation, mcp-server for the published stdio transport, mcp-cloudflare for the Cloudflare Workers hosted remote transport at mcp.sentry.dev, built on the official MCP SDK. Its analyze_issue_with_seer tool, in packages/mcp-core/src/tools/catalog/analyze-issue-with-seer.ts, starts or polls the same Autofix pipeline and is gated behind a seer "skill" that the README, lines 60 to 66, states is left out of the default skill set whenever the server targets any host other than sentry.io, a third independent confirmation that Seer does not run on self-hosted Sentry. To stay under other agents' tool-count ceilings, the architecture doc states a 45-tool hard cap for some clients and a self-imposed target of about 20, never above 25, most operations are reached indirectly through search_sentry_tools and execute_sentry_tool rather than registered directly. A second, unrelated embedded agent, GPT-5 by default, lives inside search_events and search_issues to translate natural language into Sentry's own query syntax, a two-tier agent pattern documented in docs/architecture/overview.md.

Licensing is mixed by design: getsentry/sentry and getsentry/sentry-mcp are FSL-1.1-Apache-2.0, source-available, converts to Apache-2.0 two years after each release, not OSI-approved, and its Competing Use clause bars offering a substitute commercial product. The private getsentry/seer repository has no public licence at all.

## 4. UX

Onboarding is close to zero steps for an existing Sentry customer: the SDK is already installed, so turning Seer on means installing or upgrading the GitHub App and leaving the two default org toggles, scan issues, auto-trigger fixes, as they are. There is no separate signup, agent config file, or API key to manage on the user's side.

From an issue page, a user clicks Start Root Cause Analysis, the docs also show the older labels Find Root Cause and Autofix. A drawer streams Seer's reasoning live as a sequence of expandable insights, each one linking to the exact line of code or the trace and span that supports it, rather than a plain progress spinner. Once root cause and a proposed solution appear, the user can request code changes and a PR in place, or route the code-changes step to an external agent through a handoff dropdown, which then shows a live-status card for that agent's own session and a link to its branch. Control is not confined to the web UI: a Slack surface offers a fix-with-Seer action, a conversational Seer Agent answers production questions in natural language, and PR comments, a review command, a stop-iterating command, or freeform feedback, steer an in-progress PR iteration without opening Sentry at all.

Compared with our console, which the baseline itself calls out as a functional but undesigned kanban board with no real-time streams of an agent's work and no diff view, Seer's issue-page drawer is a clear step ahead on watching an agent think and on intervening in place. What it does not have that we do: a cross-project queue view, per-task cost visibility, or any notion of my tasks across an organisation. It surfaces exactly one workflow, tied to exactly one issue, at a time.

Sentry's own dogfooding write-up, found via web search, not independently fetched, date of post not confirmed, describes a concrete handoff seam worth noting: a user panicked after a handoff to Cursor because there was no link back to Sentry and they could not find the Cursor agent's own chat either. That is exactly the kind of context loss we would hit if we ever handed a task mid-flight to a third-party agent.

## 5. Security, identity, sandbox, policy, cost

Identity for GitHub access is a GitHub App installation, not a personal access token: short-lived, GitHub-issued installation tokens scoped to the org and repo the app was installed on. The app states it uses its contents-write grant only when a user runs features that propose code fixes via pull requests. One path breaks this pattern: the GitHub Copilot handoff needs the initiating human's own OAuth token, via a function named get access token for user in the GitHub Copilot identity service, to poll that agent's task status, so that specific credential is user-bound, not task-bound.

Sandbox isolation for Seer's own in-house reasoning and code-changes steps is not verified. Nothing in the public getsentry/sentry code, the docs, or blog material describes an isolated execution environment for those steps; the visible behaviour, retrieval, code search, an LLM call, does not obviously require one. Whenever the code-changes step is delegated to Claude Code, Cursor, or GitHub Copilot instead, the sandbox is whichever that third party provides, which sits outside Seer's own security boundary entirely.

Policy is enforced in code, not prompts, at several points before a model is ever called: the function get_seer_automation_ineligibility_reason refuses self-hosted installs, orgs with generative AI features disabled, projects with scanning turned off, and issues without remaining quota, via quotas.backend.check_seer_quota and a data category named SEER_SCANNER; github_permission_tiers maps the scopes an installation was actually granted to the features they unlock and silently withholds the rest.

There is no public hard per-task spend cap or cost ledger visible to the customer. Since 2026-01-21, pricing is a flat 40 USD per active contributor per month, anyone who pushes two or more PRs a month to a Seer-connected repo, with no stated usage cap, replacing an earlier plan of 20 USD a month plus 25 USD of credits, pay as you go. An internal rate limiter, a function named is_seer_autotriggered_autofix_rate_limited, throttles how often auto-triggered runs can fire, which bounds request volume, not spend, and is not something a customer can see or tune directly.

Sentry states it does not train generative models on customer data without explicit opt in, and that this is off by default, source docs.sentry.io, retrieved 2026-09-29, not independently verified beyond the stated policy.

## 6. What we should take from it

Narrow, copyable this month: a numeric confidence score with named thresholds, used both to decide whether to act and how far to go, is smaller and more legible than a single automation on-off flag; our own auto-merge rule or supervisor escalation could use the same two-purpose gate with thresholds tuned from our own outcome data rather than fixed constants. The stopping-point ladder, capped by taking the minimum of the score-suggested and the user-configured point, is a one-line policy worth copying verbatim anywhere we let a human dial autonomy down per project. GitHub permission tiering, naming exactly which feature stops working when a specific scope is missing rather than reporting one binary integration-broken state, is a good template for our own capability-policy document when a project's forge token or webhook is under-scoped. The overnight critic job, a stronger model re-reading the previous night's agent conversations and filing tickets for the bad ones, is close to our own every-alert-gets-a-verdict principle but applied to session transcripts instead of infrastructure alerts, and is worth adding once we have session records to grade.

Broad, shapes priorities: Seer proves a telemetry-native intake, score every incoming error automatically and act without anyone filing anything, is viable at real scale, Sentry states over 38000 issues auto-fixed, for a narrow, well-understood class of work. Our signals plane currently only reacts to something already promoted to a Forgejo issue; a scored, no-human-filed path for well-understood alert classes, a known crash signature, a specific SigNoz alert type, is a real gap, even if worth closing for only a narrow first slice. The live-reasoning drawer, curated expandable insights rather than a raw log tail, each one linked to the exact code or telemetry it used, is the single biggest UX idea worth stealing outright, since it directly answers a weakness the baseline already names in our own console. Reviewing PRs a human wrote, not only PRs an agent wrote, using the same context store, is a problem we do not currently address at all and is worth a line item once our own model-review step exists, since the marginal cost of pointing it at human diffs too is low.

## 7. Where our philosophy differs and what that costs or buys us

Seer's flat per-contributor subscription with no visible hard cap only works because Sentry prices for margin across a large customer base and eats the variance; we run against a hard per-task, per-day, per-project budget with holds because we have no such base to average risk over. Copying their pricing model would break our commodity-hardware, re-seedable constraint the moment one task ran away.

Seer substitutes a confidence score for test evidence before opening a PR; we require a reproduction gate, the change must fail at base and pass at head, before a human ever reviews it. That buys Seer speed, a reported roughly six-minute run, at the cost of the one thing our design treats as load bearing: evidence over confidence.

Seer can afford to publish nothing about its execution sandbox because it operates inside a single company's own trust boundary, reviewed once by Sentry's own security team rather than by every customer who uses it. We are explicitly building for a setting where the sandbox and the credential story need to be inspectable by the people running it, so silence on that point is not an option open to us the way it is to them.

Seer's own team, with far more engineering resource than this project, chose to keep the core agent closed rather than make it self-hostable, and cited pace of iteration as the reason on the self-hosted tracker. That is the opposite of our re-seedable constraint. It is evidence the trade off is real and has a genuine cost, not evidence that our constraint is wrong.

## 8. Red flags and slop assessment

The clearest open-core bait-and-switch found across this survey: github.com/getsentry/seer existed as a real, named repository and was made private in mid-2025. A Sentry engineer confirmed this directly on getsentry/sentry issue 94850, and getsentry/self-hosted issue 3625, last updated 2026-08-03, still records no timeframe for bringing any Seer or Autofix functionality to self-hosted installs, roughly two years after Autofix's March 2024 launch.

Pricing changed unit twice in about a year: pay-as-you-go credits, 20 USD a month plus 25 USD of credits, until 2026-01-21, then flat active-contributor pricing, 40 USD per contributor per month, after. That is not itself a red flag, but it means any price figure here is a snapshot, not a stable fact.

A third-party technical write-up, found via web search, not independently verified, describes a real named production incident: the EU-region issue-summary endpoint failed 80 to 90 percent of requests owing to an upstream model outage combined with a missing guard clause in Sentry's own handling code.

Marketing outruns evidence in the usual way for this category: the product page's customer quotes, such as "did better than I would have" and "one shot fixed", are selected testimonials, not benchmarks. Sentry's own more specific numbers, a stated 94.5 percent root-cause accuracy figure and a merge rate climbing from 41 to 46 percent over six months, are still self-reported, with no independent replication found in this search.

No security incident specific to Seer, a credential leak or a prompt-injection exploit, turned up in this search. Given the closed core, absence of evidence here is not evidence of absence.

## 9. Sources

- https://sentry.io/product/seer/, WebFetch, 2026-09-29
- https://docs.sentry.io/product/ai-in-sentry/seer/, WebFetch, 2026-09-29
- https://develop.sentry.dev/self-hosted/, WebFetch, 2026-09-29
- https://github.com/getsentry/sentry/issues/94850, gh api, full issue and comments, 2026-09-29
- https://github.com/getsentry/self-hosted/issues/3625, gh api, full issue body and comments, 2026-09-29
- gh api repos/getsentry/sentry, stars, licence, creation date, open issues, 2026-09-29
- gh api repos/getsentry/sentry-mcp, stars, licence, creation date, open issues, 2026-09-29
- gh api search/repositories, query seer org getsentry, 2026-09-29, confirms no public getsentry/seer repo
- WebSearch: Sentry Seer pricing changes, active-contributor pricing, funding history, dogfooding blog post, third-party technical write-up on Seer's architecture and an EU-region incident, queries run 2026-09-29, figures marked as search-derived where not independently fetched
- clone directory sentry-mcp, git clone depth 1, cloned 2026-09-29, files read: README.md, docs/architecture/overview.md, packages/mcp-core/src/tools/catalog/analyze-issue-with-seer.ts, LICENSE.md
- clone directory sentry-seer-shared-code, git clone depth 1, cloned 2026-09-29, metadata only
- clone directory sentry-for-ai, git clone depth 1, cloned 2026-09-29, README.md
- getsentry/sentry, read via gh api contents endpoint, no full clone, repo exceeds 2 GB: src/sentry/seer directory listing, src/sentry/seer/autofix directory listing, src/sentry/seer/autofix/constants.py full, src/sentry/seer/autofix/trigger.py full, src/sentry/seer/autofix/issue_summary.py partial about 300 lines, src/sentry/seer/autofix/github_perms.py partial, src/sentry/seer/autofix/commit_author.py partial, src/sentry/seer/autofix/coding_agent.py partial about 250 lines, src/sentry/seer/autofix/coding_agent_handoffs.py partial about 150 lines, src/sentry/seer/autofix/autofix_agent.py partial about 120 lines, src/sentry/seer/signed_seer_api.py partial about 100 lines, src/sentry/seer/webhooks.py partial
