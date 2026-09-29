---
name: Charlie Labs
slug: charlie-labs
url: https://charlielabs.ai
repo: none
category: factory-orchestrator
license: proprietary
open_source: no
self_hostable: no
hosting_model: SaaS only, on Google Cloud Platform, no self-hosting offered
company: Charlie Labs, New York, founded 2025, about 7 employees (PitchBook). $10M seed from HF0, The General Partnership, Abstract Ventures, Maple VC and Soma Capital, plus angels including Guillermo Rauch
maturity: no public repository, so no stars or contributors. SOC 2 Type II attested (Vanta). Charlie V2 (CAOS) shipped 2026, Daemons launched as a Show HN in April 2026. Company announced it is winding down on 2026-09-21, new signups closed, service ends 2026-10-05
similarity: 2
axes:
  signals_intake: 4
  control_plane: 3
  sandbox_isolation: 2
  verification: 1
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 1
  ux: 4
  reseedable_selfhost: 0
steal:
  - "Daemon spec: a role definition as a committed Markdown file (YAML frontmatter for name, watch triggers, routines, deny rules, cron schedule; prose body for policy and escalation), reviewed and versioned like code"
  - "\"Roles, not tasks\" framing for standing maintenance work, distinct from one-shot coding tasks, as a model for a future capability class beyond our single coder class"
  - "Durable turn-based kernel primitives named explicitly: single-winner task claiming, a mailbox for mid-run follow-ups, and cancellation checked every turn"
  - "Two-identity split on the forge: a human-facing bot account (CharlieHelps, MFA'd, for mentions and reviews) kept separate from the machine-facing GitHub App (CharlieCreates, repo-scoped token) that actually holds access"
  - "Onboarding default: the GitHub App is installed per repository with explicit \"start narrow and add more repositories later\" guidance, not org-wide by default"
  - "Pooled, team-based credit billing so agent maintenance work does not eat an individual's personal budget"
differs:
  - "No per-task identity: one GitHub App token and one bot account cover every run, no ServiceAccount-equivalent scoped to a single task, so nothing here informs our identity-per-task principle"
  - "Model roster is the opposite of ours by design: the trust center states Charlie exclusively uses OpenAI, Anthropic and Google and explicitly excludes open-source and DeepSeek models, where we start on DeepSeek and Qwen and treat OpenAI and Anthropic as absent on purpose"
  - "Everything is closed SaaS on GCP with no re-seed or self-host path; copying their product shape at the infrastructure level would break our commodity-hardware and re-seedable constraints outright"
ux_verdict: Two required steps to first use (GitHub sign-up, install the scoped GitHub App) and work happens inside tools people already use, which beats our console's own onboarding, but nothing we read describes a live view of an agent mid-run
slop_verdict: Real and technically detailed, not a landing-page shell, but commercially dead. The company announced on 2026-09-21 that it is closing, with the service switched off entirely on 2026-10-05
---

# Charlie Labs

## 1. What it is

Charlie Labs built "Charlie," a coding agent that lives in GitHub, Linear and Slack, and later pivoted its main pitch to "Daemons," always-on background agents that maintain a codebase between human-directed coding sessions. The company frames the split as "use agents to build, and use daemons to maintain what you have built." It sold to engineering teams via team-based credit billing, with a free tier of 10,000 credits and no credit card required.

The makers claim Charlie is "an operating system for the model," not a chatbot, with durable multi-step execution that survives interruptions and follows through to merge. The docs and blog actually show a genuine custom runtime (a turn-based kernel, a task scheduler with claiming and cancellation) rather than a thin prompt wrapper, but the deepest technical claims (beating Claude Code, GPT-5 evals) come from the company's own internal evaluations, not outside benchmarks.

The company announced on 2026-09-21, eight days before this research, that it is winding down. New signups are closed and the service shuts down completely on 2026-10-05.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | GitHub mentions, reviews and assignments, Linear issues, Slack messages and Sentry regressions, normalised into a work request, plus per-daemon cron schedules | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API; every task is a Forgejo issue | they lead |
| Control plane | A custom durable kernel: Task objects, single-winner claiming, cancellation, a mailbox for follow-ups, persisted transcript and state, policy gates before execution | `factoryd` with one Temporal workflow per task, Postgres, YAML policy applied by Flux | equal |
| Worker plane | One "ephemeral devbox VM" per run, repository checked out, Bash plus CLI tools, cleaned up after; V2 adds a real browser via Playwright | One gVisor pod, namespace and ServiceAccount per task, opencode headless behind a `Harness` interface, read-only root FS, default-deny egress | we lead |
| Verification | Undocumented beyond the agent opening a PR; V2 browser checks are the only stated pre-PR verification, no stated CI gate or second-model review | Forgejo Actions on untrusted gVisor runners, policy gates by risk class, reproduction gate, stronger-model review with a strict verdict | we lead |
| Merge and deploy | Opens a PR for a human to merge; nothing on auto-merge, staged rollout or deploy | Bot merge after human approval or an `auto` rule, Flux deploy, staged rollout with an alert-free wait | we lead |
| Policy outside the model | "Deny" rules and "policy gates" limit capabilities, but the deny list sits in the same Markdown file the model reads as its own prompt; only the GitHub App OAuth scope is enforced outside the model | Capability rules are a document in Git, versioned in the database, enforced in gateway code and network policy | we lead |
| Identity per task | One shared GitHub App (CharlieCreates) and one bot user (CharlieHelps, MFA), tokens repo-scoped, not per task | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by `factory-gateway` | we lead |
| Artifacts not chat | Mixed: Slack and Linear messages and GitHub review comments feed the agent directly; the daemon file is the closest thing to a structured artifact | `TaskBrief`, a branch, a PR and a normalised event stream; git is the coordination mechanism | we lead |

## 3. Architecture and stack

No source is public, so this section is inference from docs and blog posts, marked as such. Charlie Labs calls its runtime CAOS (Coding Agent Operating System). Work starts from an "interrupt" (a mention, review request, regression or scheduled trigger), gets normalised and enriched, passes "routing and policy gates," then becomes a durable Task. "The executor claims the Task" through "single-winner claiming" and runs "a turn-based loop (context, decide, tool calls, observe) that persists state and transcripts." Each turn checks a mailbox and cancellation signal before continuing, which is how a human's follow-up comment reaches a run already in progress.

Compute is "an ephemeral devbox VM with the repository checked out as needed," torn down when the run ends. The agent interface is "Bash plus composable CLI tools." Infrastructure runs on Google Cloud Platform with Terraform, per the trust center. Charlie is described as a TypeScript-focused agent; no framework, queue or database is named. Model routing is not described as tiered: the trust center states Charlie "exclusively uses OpenAI, Anthropic, and Google as AI service providers" and explicitly excludes open-source and DeepSeek models.

Daemons are the one artifact format published in any detail: a Markdown file with YAML frontmatter (name, purpose, watch, routines, deny, schedule) and a prose body for policy and escalation, stored at a path like `.agents/daemons/<name>/DAEMON.md`. The company calls the format open and portable ("the same file works across any provider that supports the spec"), documented separately at ai-daemons.com, not reviewed here.

## 4. UX

Onboarding per docs.charlielabs.ai/installation: sign up at dash.charlielabs.ai with GitHub, then install the CharlieCreates GitHub App scoped to specific repositories ("start narrow and add more repositories later"). That is two required steps to a working install. Inviting the CharlieHelps bot user is optional and only improves discoverability (mentions, autocomplete, review requests); Linear, Slack, Sentry and Vercel connections are also optional and needed only for non-GitHub event wakes.

A human interacts with Charlie inside GitHub (mentions, assignment, review requests), Linear and Slack, not through a separate control surface for daily work; a web dashboard exists for account and integration setup. No source we read describes a live view of an agent mid-run, a diff view, or an explicit stop button, which our template asks for directly. That is worse than what we can build even though our own console is admittedly unfinished on the same points. The daemon Markdown file doubles as a lightweight configuration UI: a team edits a file in a PR to change a daemon's future behaviour, which is a real and portable pattern.

## 5. Security, identity, sandbox, policy, cost

Identity: one GitHub App (CharlieCreates) holds the actual repo-scoped access; a separate bot user (CharlieHelps) with MFA is the human-facing name. Both are shared across every run in the account; no per-task credential exists in anything we read.

Sandbox: each run gets "an ephemeral devbox VM," cleaned up afterward. No document we found states an egress policy, so whether a run can reach arbitrary internet hosts is not verified.

Policy: "deny" lists and "policy gates" limit what a daemon or agent does, but the deny rules for a daemon live in the same Markdown file the model reads as context, which is closer to a strong prompt than to code-enforced policy. The trust center describes only forge-level access control (GitHub App scope, GCP least privilege, network and secret controls), not a capability system independent of the model.

Cost: pricing is team-based credit billing with a free tier (10,000 credits, about 100 PRs), no published caps, holds or ledger. Nothing describes a per-task or per-project spend limit.

Data: the trust center states Charlie Labs does not sell customer data, does not use source code for model training or fine-tuning, and does use aggregated thumbs-up and thumbs-down feedback to fine-tune models. SOC 2 Type II is attested through Vanta.

## 6. What we should take from it

Narrow: the Daemon file format (frontmatter for watch, routines, deny, schedule; prose body for policy) is a concrete, small pattern worth copying for any future non-coder capability class (analyzer, maintainer): a declarative, git-reviewed role definition rather than a hardcoded workflow. The two-identity split (a human-facing bot account distinct from the machine-facing app credential) maps cleanly onto our own Forgejo bot accounts and is worth checking we already do consistently.

Broad: "roles, not tasks" names a gap we already flagged ourselves (only one capability class today). Their bet that recurring maintenance work deserves a different execution shape than a one-shot coding task, with its own trust-building memory, is a product idea worth holding against our own plan for analyzer and integration-tester classes. Their "start narrow, expand later" default for GitHub App scope is a UX default we should enforce explicitly in project registration, not just in policy.

## 7. Where our philosophy differs and what that costs or buys us

Their policy enforcement blends prompt and code: a daemon's deny list is part of the same file the model reads, not a separate enforcement layer. Copying that would break our principle that policy lives outside the model; our capability document in Git, enforced in gateway code and network policy, costs more to build but cannot be argued around by the agent.

Their identity model has no per-task scope at all, only a shared app token and a shared bot account. There is nothing here to steal for our identity-per-task principle; if anything, it confirms our per-task ServiceAccount design is the harder and more correct choice at the cost of more Kubernetes machinery.

Their model roster (OpenAI, Anthropic, Google only, explicitly no open-source or DeepSeek) is the mirror image of our cheap-tier-first ladder. That is a legitimate quality-first choice for a company selling finished PRs, but it is not available to us under our commodity-hardware and cost constraints.

## 8. Red flags and slop assessment

The company is shutting down. The banner on charlielabs.ai and charlielabs.ai/about read "Charlie is shutting down," and the post at charlielabs.ai/blog/charlie-is-shutting-down/ (dated 2026-09-21) says: "We are sad to share that Charlie Labs is closing and winding down operations," with new signups closed immediately, the service running until 2026-10-05, and paid subscriptions already cancelled and refunded. No reason is given. Nothing in the post addresses data export or what happens to a customer's still-configured daemons.

This is not a case of a thin project papering over a landing page: the company shipped a technically detailed 15-part blog series on its runtime internals, held a SOC 2 Type II attestation, and had paying customers quoted by name (Coforma, Aomni). It still failed commercially, roughly a year after founding and about five months after pivoting its whole pitch from agents to Daemons (Show HN, April 2026). That is a useful market signal on its own: a well-built, well-funded coding-agent SaaS with real customers can still not find a sustainable business in this space.

All performance claims found (beating Claude Code "on all 10 case-by-case comparisons" with GPT-5, PRs resolving "29% more issues than o3") are the company's own internal evaluations. No independent benchmark or review was found; the one Hacker News Show HN thread (id 47850907) was not read past the search snippet.

## 9. Sources

- https://charlielabs.ai/ (fetched 2026-09-29)
- https://charlielabs.ai/about/ (fetched 2026-09-29)
- https://charlielabs.ai/blog/charlie-is-shutting-down/ (fetched 2026-09-29)
- https://charlielabs.ai/coding-agents-as-operating-systems/ (fetched 2026-09-29)
- https://trust.charlielabs.ai/ (fetched 2026-09-29, via firecrawl)
- https://docs.charlielabs.ai/installation (fetched 2026-09-29)
- WebSearch: "Charlie Labs charlielabs.ai AI coding agent" (2026-09-29)
- WebSearch: "Charlie Labs" funding Series founders (2026-09-29)
- WebSearch: Charlie Labs shutting down blog post (2026-09-29)
- WebSearch: Charlie Labs charliehelps Hacker News review coding agent (2026-09-29)
- https://pitchbook.com/profiles/company/877090-69 (company profile, via search snippet, 2026-09-29)
- https://www.caplight.com/company/charlielabs (funding total, via search snippet, 2026-09-29)
- https://news.ycombinator.com/item?id=47850907 (Show HN: Daemons, referenced via search snippet, not opened)
