---
name: Augment Code Intent
slug: augment-intent
url: https://www.augmentcode.com
repo: none
category: factory-orchestrator
license: proprietary
open_source: no
self_hostable: no
hosting_model: macOS desktop app backed by Augment's hosted Context Engine and model backend, cloud only, no self-host path
company: Augment Inc (Augment Code), Palo Alto CA, founded 2022, came out of stealth 2024, USD 227m Series B in April 2024 at a USD 977m valuation on top of a USD 25m Series A, backed by Sutter Hill Ventures, Index Ventures, Lightspeed Venture Partners and Evolution Equity Partners
maturity: public beta for macOS since roughly February 2026 (release 0.2.5), still macOS only with Windows waitlisted as of June 2026, no Linux plan found, no public repository, parent product Augment Code holds two G2 reviews at 2.8 out of 5
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 1
  verification: 2
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 0
steal:
  - "Three checkpoints in one linear flow, approve the spec, approve the task breakdown, review the diffs, gate every stage of a run behind a single human click. Our console's human lane could adopt the same shape for the approval states we already model as workflow state."
  - "The living spec is a shared artifact that every agent in a Space reads and writes, so a mid-run edit by the human propagates to all running implementors at once. Worth copying as a pattern for TaskBrief revisions mid-session, which our design does not currently support."
  - "A dedicated Verifier agent re-checks implementor output against the spec before the human sees a diff, on top of background agents that run tests, lint and type checks during the run itself. A cheap first-pass gate worth adding ahead of our own CI stage, not instead of it."
  - "Auto-generated PR descriptions that keep updating themselves as later commits land in the same Space. A small, concrete default for our bot-authored PRs."
  - "Per-tool-call credit accounting shown back to the user, task size in credits, model choice in credits, is a transparency pattern worth copying for our own cost view, independent of whether we keep their pooled-allowance billing model."
  - "Bring-your-own-agent support for three external harnesses, Claude Code, Codex and OpenCode, through a Context Engine MCP server rather than a bespoke integration per harness, is a clean way to keep a product's own agent optional."
differs:
  - "There is no sandbox. Agents run as local processes on the developer's own Mac with the same filesystem and network access the developer has. A git worktree gives directory isolation between parallel Spaces, nothing more. This breaks security without half measures outright and nothing here is worth adopting even partially."
  - "There is no task-scoped identity. GitHub is connected once, by OAuth, into the account, through what the product calls the Cosmos dashboard, and every Space reuses that one connection. This is the opposite of identity belongs to the task, not the machine."
  - "Policy lives in the human clicking through three UI checkpoints, not in a capability document enforced by code or network rule. That is adequate for one trusted developer approving their own work and not a substitute for policy enforced outside the model."
  - "Cost is a shared, pre-paid monthly credit pool metered after usage, with per-user caps only on the Enterprise tier. On Standard or Max, one teammate or one runaway Space can drain a whole team's month before anyone notices, the opposite of a per-call hold taken up front."
  - "Nothing here is re-seedable or self-hostable. It is a closed, cloud-backed macOS binary. Deleting and rebuilding from Git, S3 and an offline seed bundle has no equivalent here, and there is no path to run it on commodity Linux hardware at all."
ux_verdict: A checkpointed, living-spec workflow with a real diff, PR and merge view inside one app is ahead of our console's admitted gaps, but it is a single-developer macOS beta with no LSP, test runner or debugger, not a multi-user task queue.
slop_verdict: Real and shipping, not a landing page, with a funded company and paying customers, but independent validation is thin. Two G2 reviews, close to no Hacker News or Reddit discussion of Intent specifically four months into its beta, and most security and performance claims trace back to Augment's own marketing.
---

# Augment Code Intent

## 1. What it is

Intent is a macOS desktop app from Augment Code (legally Augment Inc) that coordinates several coding agents around one shared, editable specification instead of one agent taking a single prompt. Augment calls it "our vision for what comes after the IDE" (augmentcode.com/blog/intent-a-workspace-for-agent-orchestration, fetched 2026-09-29). A developer opens a Space, describes a task, and a Coordinator agent turns it into a spec. The developer approves the spec, a set of Implementor agents work on it in parallel waves inside their own git worktrees, and a Verifier agent checks the result against the spec before handing it back for a human diff review, commit, PR and merge, all inside the app.

The product launched into public beta around February 2026 and reached a 0.2.5 release that month, with 0.3.x by mid-2026 (augmentcode.com changelog and guides, fetched 2026-09-29). It sits on top of Augment's existing paid line, Indie at USD 20 a month up to Enterprise, and carries no separate price of its own. Three months after Intent, in June 2026, Augment launched a second, broader product called Cosmos, described as "the Unified Agents Platform for software teams" and, in one of its own blog titles, a "Programmable Software Factory". Intent's own walkthrough has a user connect GitHub through what it calls "the Cosmos dashboard", which shows Intent is a client on top of the same account and Context Engine infrastructure Cosmos now fronts, not a fully separate product.

What Augment claims: spec-driven multi-agent orchestration beats single-agent tools on complex, multi-file work, and the company holds SOC 2 Type II and ISO/IEC 42001 certification. What the public material actually shows: a beta-tagged, macOS-only app with no independent benchmark found, a company that had already re-centred its pitch around Cosmos within four months of Intent's launch, and close to no organic discussion of Intent on Hacker News or Reddit as of mid-2026, per an independent research page at rywalker.com/research/augment-intent (fetched 2026-09-29).

## 2. Mapping to our five planes

| Plane / principle | What Intent does | What we do | Verdict |
|---|---|---|---|
| Signals | None. A Space starts from a developer typing a prompt. No issue, alert or telemetry intake. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. Every task is a Forgejo issue. | We lead |
| Control plane | Per-Space state held in the desktop app, spec, task list, checkpoint status. No durable workflow engine, no cross-Space scheduling, no audit trail found. | factoryd with a Temporal workflow per task, Postgres, policy in Git, cost ledger, audit trail. | We lead |
| Worker plane | Auggie or a bring-your-own-agent CLI (Claude Code, Codex, OpenCode) runs as a local process on the developer's own Mac, one git worktree and branch per Space. | One gVisor pod per task, own namespace and ServiceAccount, read-only root filesystem, default-deny egress. | We lead |
| Verification | A Verifier agent checks implementor diffs against the spec, and the product page shows background agents running tests, lint and type checks during a run, before a mandatory human diff-review checkpoint. | Forgejo Actions on isolated runners, policy gates, then a stronger-model review with a strict verdict. | We lead |
| Merge and deploy | The developer clicks commit, PR and merge inside the app. No deploy step. | Bot-only merge after a human approves, or an auto rule for reproduced, strictly-improving changes. Flux deploys with a staged rollout. | We lead |
| Policy outside the model | Three UI checkpoints a human clicks through. No capability document found, enforced in code or network. | Capability policy is a document in Git, enforced in gateway code and network policy. | We lead |
| Identity per task | One GitHub OAuth connection per account, made once through the Cosmos dashboard, reused by every Space. | A projected, per-task ServiceAccount token verified against the cluster OIDC issuer, forwarded under a per-task virtual key. | We lead |
| Artifacts not chat | The living spec and task list are genuine structured artifacts, read and written by every agent in a Space, updated as work proceeds. | TaskBrief in, branch, PR and normalised event stream out. | Equal |

## 3. Architecture and stack

Everything below comes from Augment's own site and guides, since there is no repository to read, and is marked accordingly. Intent ships as a macOS app, downloaded directly, with no package manifest, Dockerfile or Helm chart to inspect. The Windows build is still waitlisted and no Linux build is mentioned anywhere found.

Model access and codebase search run through Augment's Context Engine, a hosted service shared with Augment's other products, the IDE extension, the Auggie CLI, and now Cosmos. Bring-your-own-agent users keep their own model subscription for the coding agent itself but need an Augment MCP server, described as "the Augment Context Engine MCP", to get semantic codebase search inside a third-party harness (augmentcode.com/blog/intent-a-workspace-for-agent-orchestration, fetched 2026-09-29). Intent's orchestration layer, spec, checkpoints, worktrees, resumable sessions, is decoupled from the coding agent itself, but codebase understanding for that agent still routes through Augment's own cloud service.

Git handling is native to the app. It creates the worktree and branch per Space, stages an auto-commit after the human's diff review, opens the PR with a generated description, and merges on a click. GitHub access is set up once through a connected app the walkthrough calls "the Cosmos dashboard" (augmentcode.com/guides/intent-walkthrough-prompt-to-merge, fetched 2026-09-29), again pointing at shared account infrastructure with Cosmos rather than a standalone token flow.

## 4. UX

The path from install to a merged PR is an 8-step flow after a one-time setup, install the macOS app, optionally the Auggie CLI, connect GitHub: prompt, review and approve the spec (checkpoint 1), review and approve the task breakdown (checkpoint 2), watch parallel implementor agents execute in waves of roughly 3 to 12 minutes for well-scoped tasks, let the Verifier check the result, review the diffs in a built-in editor (checkpoint 3), auto-commit and open a PR, then merge, all from one window (augmentcode.com/guides/intent-walkthrough-prompt-to-merge, fetched 2026-09-29).

While agents work, the app shows a tabbed workspace, a file tree, a context tab listing what the Coordinator has linked in, the living spec once the Coordinator first writes to it, and a changes tab with a diff view of in-progress and finished work. A terminal panel exists for running tests by hand. The guide is explicit about what is missing: no LSP, so no go-to-definition or type errors, no inline test runner, and no debugger, and it recommends keeping a separate IDE open for typed languages. There is no kanban board and no chat panel described anywhere found. Intervention happens by editing the spec or the task list at one of the three checkpoints, which then propagates to every running agent in that Space.

Against our own console, which we already flag as functional but undesigned, with no real-time stream of an agent's work, Intent's checkpointed spec view is a concrete example of what that stream and that approval step could look like. The comparison cuts both ways: Intent is a single-developer macOS beta, not a multi-project, multi-user task queue with a cost view and an alerts view.

## 5. Security, identity, sandbox, policy, cost

Identity is account-wide, not task-scoped. GitHub is connected once by OAuth, through the shared Cosmos account layer, and reused across every Space a developer opens. Augment's security page claims SOC 2 Type II, ISO/IEC 42001, GDPR, CCPA and HIPAA-with-BAA compliance, a "non-extractable API architecture" and a "Proof-of-Possession API" that limits completions to code the user already has locally (augmentcode.com/security, fetched 2026-09-29), but none of this is specific to Intent, none of it is independently checkable without a repository, and the same page confirms code is uploaded to Augment's systems for the Context Engine to work on.

Sandbox: none beyond a git worktree. Agents run as local processes with the same filesystem and network reach as the developer's own machine. No egress control, no process isolation and no container boundary is described anywhere found.

Policy: the three checkpoints, spec, tasks, diffs, are the only gate, and they are UI steps a human clicks through, not a capability rule enforced in code or by a network policy.

Cost: Intent draws down the same monthly credit pool as the rest of Augment Code, from 40,000 credits on the USD 20 Indie plan up to a 450,000-per-seat pool on the USD 200 Max plan, pooled across a team of up to 20 seats on Standard and Max. A medium task on the default model costs roughly 860 credits and a complex one over 4,000 (augmentcode.com/guides/intent-pricing, fetched 2026-09-29). The pool simply stops serving requests once exhausted, and only the Enterprise tier adds a per-user cap, so on every other plan a single agent run or a single teammate can spend a team's whole month before anyone acts.

## 6. What we should take from it

Narrow, copyable this month: the three-checkpoint shape, approve the spec, approve the task breakdown, review the diffs, maps directly onto states our console already models informally, and is worth making explicit as workflow states with a single approve-or-edit action at each one. The living spec as a shared, editable artifact that every agent in a run reads and re-reads is worth a smaller version for TaskBrief, letting a human edit the brief mid-session and have that edit reach a running worker, which our design does not do today. The Verifier-agent-plus-background-test-agents pattern is a cheap first check worth adding before our own CI stage runs, not as a replacement for it. Auto-refreshing PR descriptions as later commits land in the same task are a small, concrete default worth giving our own bot-authored PRs.

Broad: Intent is evidence that one shared spec, several agents, a human at three checkpoints, is a viable shape for the worker plane specifically, useful validation for our own plan to add analyzer, integration-tester and release capability classes on top of today's single coder class. It is also evidence of the opposite risk. Augment built Intent as a single-developer, single-machine product and then, four months later, launched Cosmos to solve the team-level version of the same problem, which suggests the single-developer shape does not extend cleanly to a multi-user factory without a second product.

## 7. Where our philosophy differs and what that costs or buys us

Sandboxing is the clearest break. Intent runs agents as ordinary local processes with the developer's own filesystem and network access, and a git worktree is not a security boundary. Adopting any part of this would violate security without half measures directly, and Intent's speed and simplicity as a single-developer tool is exactly the trade a solo Mac app can make and a factory cannot.

Identity is the same story in miniature. One account-wide GitHub connection reused by every Space is the opposite of identity belongs to the task, not the machine. There is no partial version of this worth taking.

Cost control is a monthly pool metered after the fact rather than a per-call hold taken before an action runs. That is a reasonable trade for a subscription product selling developer seats, but it would not stop a runaway agent from spending an entire project's budget in one session, which is precisely what our per-call pricing and holds exist to prevent.

Re-seedability does not apply at all. Intent is a closed, cloud-backed macOS binary with no path to self-host, while our whole design assumes the opposite, delete everything and rebuild from Git, S3 and a small offline seed bundle. This is not a case of Intent doing something better at our expense. It is simply not building for the constraint we hold as a requirement.

## 8. Red flags and slop assessment

The product is real and shipping, with paying customers on the parent Augment Code line and a well-funded company behind it, a USD 227m Series B in April 2024 at a USD 977m valuation. That said, several signals suggest Intent itself is still finding its footing. It has been macOS-only through its entire public beta, with Windows still waitlisted and no Linux plan found, four or more months after launch. Independent validation is thin. An outside research page found close to no standalone Hacker News or Reddit discussion of Intent specifically as of June 2026, and the only user reviews found for the parent product are two G2 reviews averaging 2.8 out of 5, both citing pricing complaints, too few to be meaningful on their own but consistent with a Hacker News comment, found via that same research page, citing a broken grandfathering promise after an October 2025 pricing change. Augment launched a second, broader platform, Cosmos, only four months after Intent, and Intent's own walkthrough now routes GitHub setup through Cosmos's dashboard, which reads as the company folding Intent into a larger, newer product rather than Intent standing on its own. Security and performance claims, a non-extractable API architecture, a 20 to 30 percent routing saving from an internal model router, come entirely from Augment's own marketing and could not be checked against any code.

## 9. Sources

https://www.augmentcode.com/blog/intent-a-workspace-for-agent-orchestration (fetched 2026-09-29)
https://www.augmentcode.com/guides/intent-walkthrough-prompt-to-merge (fetched 2026-09-29)
https://www.augmentcode.com/security (fetched 2026-09-29)
https://www.augmentcode.com/guides/intent-pricing (fetched 2026-09-29)
https://www.augmentcode.com/blog/cosmos-the-platform-for-ai-native-engineering-teams (referenced via search, 2026-09-29)
https://rywalker.com/research/augment-intent (fetched 2026-09-29)
WebSearch: Augment Code "Intent" agent product 2026 (2026-09-29)
WebSearch: Augment Code Intent orchestrator announcement (2026-09-29)
WebSearch: Augment Code Intent review reddit OR hacker news bugs stability limitations (2026-09-29)
WebSearch: Augment Code Cosmos dashboard agent orchestration teams (2026-09-29), and Augment Code company funding Sourcegraph founders headquarters founded valuation 2026 (2026-09-29)
