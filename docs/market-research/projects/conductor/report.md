---
name: Conductor
slug: conductor
url: https://conductor.build
repo: none
category: multi-agent-ui
license: proprietary
open_source: no
self_hostable: no
hosting_model: free local Mac app, plus paid Conductor Cloud sandboxes (Vercel, us-east-1)
company: Conductor (formerly Melty Labs), YC S24, San Francisco, founded 2024 by Charlie Holtz and Jackson de Campos, $22M Series A led by Matrix and Spark, announced 2026-03-30
maturity: no public repository or stars; app version 0.87.6 as of 2026-09-29; SOC 2 Type II attested; self-reported 10x user growth since January 2026
similarity: 1
axes:
  signals_intake: 2
  control_plane: 1
  sandbox_isolation: 1
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 4
  reseedable_selfhost: 0
steal:
  - Multi-model mode: fire the same prompt at Claude Code and Codex in parallel tabs on the same workspace, then pick a branch. A ready-made pattern to A/B our model-tier ladder or a harness swap, not just trust the fixed order.
  - Checkpoints, an automatic snapshot per agent turn with one-click rollback, layered on top of git history. Cheaper than a diff view to build, and it plugs the "no diff view" gap our own vision page lists as unfinished.
  - The Checks tab: one pane per workspace merging git status, PR state, CI and status checks, review comments and open todos. A concrete shape for a task detail page richer than a kanban card.
  - Routines: a saved prompt tied to a webhook URL, with GitHub trigger filters by label, author and base branch, and cron presets (hourly, daily, weekly, weekdays). Worth stealing as UX vocabulary for factoryd's own trigger definitions, even though the auth model (bearer token embedded in the URL, no scoping) is one we would not copy.
  - Spotlight testing, syncing a worktree's changes back into the main checkout to run against untracked files like .env or node_modules. A direct answer to the bootstrap problem every worktree-per-task design hits.
differs:
  - No sandbox, no policy layer, no per-task identity. The agent runs with the full authority of the developer's own Mac, their own long-lived GitHub token and their own model API keys or subscription. That is the opposite of "identity belongs to the task" and "policy lives outside the model", and it only works because the trust boundary is one already-trusted developer's own machine, not an autonomous agent started by anyone who can file an issue.
  - There is no control plane. Conductor is a UI shell over existing harnesses (Claude Code, Codex, Cursor, OpenCode) with local app state, not a durable task registry with budgets, approvals or an audit trail. It solves the worker-plane UX problem only; it has nothing to say about signals, verification policy, cost, or deploy.
ux_verdict: The most polished per-task console we found, a workspace per branch with its own terminal, live diff and a merged Checks pane, checkpoints for rollback, one-click PR, and a mobile app to follow along, but it is a human-supervised multiplier for one developer, not an unattended factory console.
slop_verdict: Real and funded (22 million dollar Series A, March 2026, Matrix and Spark), SOC 2 Type II attested, shipping a public changelog in the 0.8x range, and reportedly used daily inside several YC companies. Proprietary and closed source throughout, and the promised self-hosted offering does not exist yet, so "enterprise-ready" is aspirational on that axis.
---

# Conductor

## 1. What it is

Conductor is a macOS app, built by the YC S24 team formerly known as Melty Labs, that runs several coding agents side by side, each in its own git worktree and branch. A developer opens a workspace, gives Claude Code, Codex, Cursor or OpenCode a prompt, watches the terminal and diff, and when the agent is done reviews, opens a pull request and merges. It is free for local use against a developer's own model subscriptions or API keys; paid tiers add Conductor Cloud (workspaces that keep running after the laptop closes), live multiplayer collaboration, and an admin portal.

The makers claim it turns one developer into a team, letting several agents work on independent tasks without the working-directory conflicts of running everything from one CLI session. The docs and pricing pages back that up for the collaboration and review layer but say nothing about sandboxing, security policy or credential scoping. What the product actually is, from the docs, is a session manager and diff/PR reviewer wrapped around other people's coding agents, not an orchestrator with its own task or security model.

## 2. Mapping to our five planes

| Plane / principle | What Conductor does | What we do | Verdict |
|---|---|---|---|
| Signals | Routines: a saved prompt behind a webhook URL, filterable GitHub PR triggers, cron schedules, plus manual "new workspace from GitHub or Linear issue" | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | we lead |
| Control plane | Local app state per workspace (in progress, in review), no budgets, approvals or audit trail found in the docs | factoryd with a Temporal workflow per task, Postgres, policy as code | we lead |
| Worker plane | One git worktree and branch per workspace, agent runs directly on the developer's Mac, or in a Vercel sandbox for Conductor Cloud | gVisor pod per task in its own namespace and ServiceAccount, default-deny egress | not comparable, different trust model |
| Verification | Checks tab surfaces existing CI status, PR comments and todos for a human to read; advisory, not a gate | Forgejo Actions, policy gates, stronger-model review before merge | we lead |
| Merge and deploy | One-click PR creation and merge through GitHub; no deploy step | Bot merge after approval or auto rule, Flux GitOps deploy, staged rollout with an alert window | we lead |
| Policy outside the model | None found; whatever permission prompts exist come from the underlying harness, not a Conductor-owned layer | Capability YAML in Git, enforced in factory-gateway and network policy | we lead |
| Identity per task | The developer's own GitHub token and model credentials, reused across every workspace and every Routine | Projected, audience-scoped ServiceAccount token per task, verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | Deliberately the opposite: each workspace is a live chat session a human watches and steers, with a diff and PR as the eventual by-product | TaskBrief in, branch, PR and event stream out, no live chat required | we lead by our own principle, but this is Conductor's intended shape, not a gap |

## 3. Architecture and stack

There is no public repository, so this section rests on the docs at [www.conductor.build/docs](https://www.conductor.build/docs) and the pricing page. Conductor is a native macOS app (Free tier: "on your Mac", no Windows or Linux mentioned anywhere). A workspace pairs a git branch with a "working tree" (the docs never say "git worktree" outright, though third-party write-ups confirm it is git worktrees under the hood) plus a dedicated terminal and running environment. Agents are external processes it drives: Claude Code, Codex, Cursor and OpenCode, using the developer's own subscriptions or API keys, so Conductor itself is not a model gateway.

Conductor Cloud workspaces run in "Vercel sandboxes" in `us-east-1`; chat messages sent in cloud workspaces are stored on Conductor's servers, unlike local sessions which the docs say keep data on-device. A Conductor API exists for Routines: `POST https://api.conductor.build/v0/routines` creates a saved prompt with a webhook URL; a JSON POST to that URL starts a new workspace with the payload attached to the prompt. The routine runs with the creating user's own git and agent credentials, and the webhook URL itself is the only credential checked on the incoming call.

## 4. UX

From zero: install the Mac app, open a repository, press Cmd+N for a new workspace, pick an agent and type a prompt. That is roughly three steps to a first running agent, matching or beating our own console's onboarding, which has none described. While an agent works, the user sees a live terminal, a file diff, and a changes sidebar; workspaces are listed by status (in progress, in review, and further states implied by "archived once merged"). A Checks tab merges git status, PR state, CI results, review comments and open todos into one read before merging. Checkpoints give an automatic snapshot per turn with rollback, and "Spotlight testing" syncs a workspace's changes into the main checkout to run against files git worktrees do not carry, like `.env` or `node_modules`. Multi-model mode runs the same prompt through two harnesses in parallel tabs for comparison. A mobile app and live multiplayer (Pro and up) let a user or team follow or co-drive a session away from the Mac.

This is more built out than our console, which the vision page itself calls "functional, not designed... no diff view, no mobile view". Conductor's gap against us is the opposite one: no kanban across a whole organisation's tasks, no cost view, no alerts view, because those planes do not exist for it.

## 5. Security, identity, sandbox, policy, cost

Security and identity are the weakest parts of the whole product, and outside reviewers (madewithlove's write-up) flag it directly: a closed-source binary clones the full repository, drives multiple agents with read/write access, manages git worktrees, and authenticates to GitHub, all with the credentials already sitting on the developer's machine. There is no separate credential broker; each Routine reuses the creating user's own tokens.

Sandboxing exists only for Conductor Cloud, as "Vercel sandboxes" in one region, with no published detail on network egress control. Local workspaces, the free and presumably most used tier, have no sandbox at all beyond git branch and worktree separation; the agent can read and write anything the developer's own account can reach.

Policy is not a Conductor concept. Whatever tool-call confirmation exists comes from the underlying harness's own permission prompts, not from anything Conductor enforces or audits.

Cost is a flat per-seat subscription (Free, Pro at 50 USD/month, Teams at 60 USD/user/month, Enterprise custom) plus the user's own model spend; Conductor Cloud compute is currently unmetered with "usage-based pricing planned." There is no hold, ledger or per-task budget of any kind.

## 6. What we should take from it

Narrow: Checkpoints (turn-level snapshot plus rollback) and the Checks tab (one merged pane of PR, CI, comments and todos) are both small, concrete UI mechanisms our htmx console lacks today and could copy directly to close the "no diff view" and "no trace UI" gaps on the vision page's own weak-spot list. Multi-model mode is a cheap pattern for validating a harness swap (opencode to the named Codex CLI successor) or a model-tier change before committing to it project-wide.

Broad: Routines show that a webhook-to-agent-workspace pipeline with declarative trigger filters (label, author, base branch, cron) is a viable, well-liked shape for signal intake, worth stealing as a mental model for factoryd's own trigger definitions, even where we would replace their bearer-URL auth with our OIDC-token identity chain. Spotlight testing is a broad reminder that any worktree-per-task design (ours included) needs an explicit answer for untracked files, not just an assumption that a clean checkout is enough.

## 7. Where our philosophy differs and what that costs or buys us

Conductor's entire security model assumes a single trusted human sitting at the keyboard, running trusted agents with their own already-issued credentials. That buys them a genuinely fast time-to-first-agent, no cluster, no ServiceAccounts, no sandboxes to provision. It costs them everything our identity and policy principles exist for: an untrusted issue filer, or a Routine with a leaked webhook URL, has no fence between it and the developer's GitHub token and API keys. Copying that would break our "policy lives outside the model" and "identity belongs to the task" principles outright, and is not a trade our multi-tenant, issue-triggered design can make.

Conductor also has no control plane, which is a scope choice, not a flaw for what it sells. It never claims to run unattended; it claims to make one developer faster at supervising several agents at once. Where our design pays the price of Temporal, Postgres and per-task sandboxes to run without a human watching every session, Conductor skips all of that because a human is always the one driving.

## 8. Red flags and slop assessment

Proprietary and closed source with no public code to verify any claim; everything here rests on docs, the pricing page and third-party reviews. The Enterprise tier lists SSO, SCIM, a DPA and custom security settings but explicitly not on-premises or self-hosted deployment; the docs say a self-hosted offering is still being built, which matters for a buyer told this is "enterprise-ready" today. Mac-only, which rules it out entirely for a Linux, headless-worker design like ours. Growth figures quoted in the Series A announcement (10x users since January 2026, "YC startups writing 100% of their code in Conductor") are self-reported and not independently verified. No security incident was found in the time available.

## 9. Sources

https://conductor.build (fetched 2026-09-29)
https://www.conductor.build/pricing (fetched 2026-09-29)
https://www.conductor.build/docs/ (fetched 2026-09-29)
https://www.conductor.build/docs/core/parallel-agents (fetched 2026-09-29)
https://www.conductor.build/docs/reference/checks (fetched 2026-09-29)
https://www.conductor.build/docs/core/agent-modes (404, not found, 2026-09-29)
WebSearch: Conductor conductor.build Claude Code parallel agents worktrees review (2026-09-29)
WebSearch: Conductor Melty Labs YC S24 funding founders (2026-09-29)
WebSearch: Conductor.build API webhooks Linear GitHub issue intake trigger workspace (2026-09-29)
https://madewithlove.com/blog/conductor-running-multiple-ai-coding-agents-in-parallel/ (via search summary, 2026-09-29)
https://www.conductor.build/blog/series-a (via search summary, 2026-09-29)
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
</content>
