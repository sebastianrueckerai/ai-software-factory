---
name: Superpowers
slug: superpowers
url: https://github.com/obra/superpowers
repo: https://github.com/obra/superpowers
category: spec-driven
license: MIT
open_source: yes
self_hostable: yes
hosting_model: a plugin dropped into a coding agent's plugin directory, no service, no server
company: Prime Radiant (Jesse Vincent and team), no public funding or HQ found, sells optional enterprise support by email
maturity: 292,716 stars, 26,200 forks, 278 open issues, 683 commits, created 2025-10-09, last commit 2026-09-27, weekly-ish releases (v6.4.2 on 2026-09-25), listed on Anthropic's official plugin marketplace (third-party, not Anthropic-verified) with 1,009,371 installs
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 1
  verification: 3
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 1
  ux: 3
  reseedable_selfhost: 4
steal:
  - "SessionStart hook injects a short 'check for a relevant skill before any action, including clarifying questions' directive at session start and after compaction: the model for a preamble our own worker prompt or TaskBrief could inject before every session"
  - "A per-plan ledger file (progress.md) recording 'Task N: complete (commits a..b)' and 'Ruling: <decision> - <why> - <cost if wrong>' as the recovery map after context loss, read before trusting the agent's own memory: directly answers our own gap that session records exist but nothing resumes cleanly from them"
  - "Model-tier selection by task complexity (mechanical edit = cheap model, integration/judgment = standard, architecture and final review = most capable, +1 tier on a stuck fix loop) is the same ladder shape as our coding-cheap/coding-frontier/review-frontier/supervisor, but tied to a legible rubric (file count, whether the plan already gives the exact code) we could fold into factoryd's escalation policy"
  - "'Rulings, not stalls': decide on ambiguity and keep going, log 'Ruling: <what> - <why> - <cost if wrong>', and stop only for four named cases (irreversible op, security-sensitive action, external side effect, plan broken beyond repair), a tighter, more general version of our supervisor's continue/redirect/retry/escalate that we could apply to the agent itself, not just the supervisor"
  - "Fix-loop cap of 5 rounds: rounds 1-3 resume the same implementer with the findings verbatim, rounds 4-5 hand off to a fresh implementer on a stronger model, then a human-visible adjudication step if still unresolved: a concrete, boundable algorithm to drop into our review-gate retry policy instead of an open-ended retry count"
  - "diagnosing-superpowers' evidence discipline (every finding cites path:line, parallel per-dimension analyst subagents read the same transcript, explicit approval gate before any bundle is built or shared) is close to a ready design for the trace/replay UI we admit we lack, and a pattern for staffing our own 'every alert gets a verdict' loop with cheap parallel analysts"
  - "The eval harness named in AGENTS.md (superpowers-evals/Quorum drives real CLIs through a QA agent graded against scenario acceptance criteria plus deterministic post-checks, before/after numbers required in every skill-changing PR) is exactly the regression suite we flagged as missing for our own harness prompt"
  - "brainstorming's three-tier approval gate (spike/bounded/architectural, each needing an explicit human sign-off before the next artifact exists) is a usable shape for the spec-driven intake we do not have yet: an issue could carry a state machine of 'design proposed -> design approved -> plan approved -> executing' instead of jumping straight from issue to code"
differs:
  - "Every rule here is prompt text enforced by rhetorical pressure ('Iron Law', tables of rationalizations to reject) and by the model's own willingness to comply, with no code-level backstop. This is the exact opposite of our 'policy lives outside the model' principle: nothing in Superpowers stops a model that decides to skip the skill, and none of it is a substitute for gateway or network-policy enforcement"
  - "The unit of isolation is a git worktree on the operator's own machine, not a sandboxed, credential-scoped pod. There is no default-deny egress, no per-task identity, no untrusted-input boundary. The human partner and the codebase are both implicitly trusted. Adopting the workflow wholesale would still leave our worker-plane isolation problem completely unsolved"
  - "The whole design assumes one synchronous human partner narrating a single interactive session, with 'ask your human partner' as the default escape hatch throughout. Our factory is built for autonomous, asynchronous, many-tasks-in-parallel operation where a human is a rare tool call; several of Superpowers' stopping rules need 'ask' rewritten as 'escalate_to_human and move on to other tasks' before they fit us"
ux_verdict: zero-config once installed (a SessionStart hook fires the bootstrap on every session and after every compaction), narrates itself as it works ("Using [skill] to [purpose]"), and a user intervenes by typing, not by clicking through a dashboard
slop_verdict: real, in daily use including by the person who wrote this report, actively released weekly with named eval evidence attached to skill-behaviour changes, and the 94%-PR-rejection contributor bar in AGENTS.md is itself evidence the maintainers are not coasting
---

# Superpowers

## 1. What it is

Superpowers is a plugin for coding agents (Claude Code, Codex, Cursor, Gemini CLI, OpenCode and a dozen more) that installs a library of Markdown "skills": instruction files a session is required to consult and follow before it brainstorms, plans, writes code, debugs, reviews or finishes a branch. Jesse Vincent (obra) and Prime Radiant publish it under MIT, distribute it through the official Anthropic plugin marketplace and a `superpowers-marketplace` for other harnesses, and offer paid enterprise support by email. It targets individual developers and teams who want a coding agent to behave like a disciplined engineer instead of an eager one.

The README claims a full loop from rough idea to merged, tested, reviewed change, done "autonomously for a couple hours at a time without deviating from the plan." The repository backs a good part of that: seventeen skill directories, each with a `SKILL.md`, most with helper scripts and templates, a hook that injects the bootstrap at session start (`hooks/session-start`), and a real eval harness referenced from `AGENTS.md` (`superpowers-evals`, cloned separately) that grades skill-behaviour changes against scenario acceptance criteria before they ship. What the README does not show as code: the "Commercial Services" for enterprise, which is an email address, not a product in this repo.

## 2. Mapping to our five planes

| Plane / principle | What Superpowers does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work starts from a human typing into a live session, not an issue or alert | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | A per-plan ledger file (`progress.md`) recording task completion and rulings, git-ignored, scoped to one plan's workspace | `factoryd` with a Temporal workflow per task, Postgres, policy in Git | not comparable |
| Worker plane | A git worktree per feature branch, no network or filesystem isolation, the agent runs with the operator's own shell and credentials | gVisor pod per task, ServiceAccount, default-deny egress | we lead |
| Verification | TDD (red-green-refactor), a task-scoped reviewer plus a whole-branch reviewer, a 5-round fix loop with escalating model tiers, `verification-before-completion`'s evidence gate | Forgejo Actions, policy gates, reproduction gate, stronger-model review | equal, different mechanism |
| Merge and deploy | `finishing-a-development-branch` presents merge/PR/keep/discard to the human; no deploy step | Bot merge after approval or `auto` rule, Flux GitOps, staged rollout | we lead |
| Policy outside the model | None. Every rule is prompt text the model is instructed to follow | Capability rules as YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | None. The agent has whatever access the human's own session has | Projected, audience-scoped ServiceAccount token per task | we lead |
| Artifacts not chat | Partial: briefs, reports and ledgers are files handed between subagents, but the controlling loop is still one long chat | TaskBrief in, branch and PR out, normalised event stream | equal, narrower scope |

## 3. Architecture and stack

Zero external dependencies (`package.json` declares none). The whole product is Markdown plus a handful of small hook scripts (`hooks/session-start`, `hooks/hooks.json`, `hooks/hooks-cursor.json`, `hooks/run-hook.cmd`). There is no server, no database, no queue: `npx` or a package manager drops the plugin into the harness's own plugin directory, and a `SessionStart` hook fires on every new session and after every context compaction, injecting the `using-superpowers` skill body as JSON-escaped `additionalContext` (or `additional_context` on some harnesses). Per-harness install paths are documented in the README for Claude Code, Codex, Cursor, Gemini CLI, OpenCode and others; each gets its own hook wiring file under `hooks/`.

Skills live one per directory under `skills/<name>/SKILL.md`, each with YAML front matter (`name`, `description`) that the harness's own skill index matches against the task at hand, and some carry helper scripts or templates (for example `skills/using-superpowers/references/claude-code-tools.md` for platform-specific tool mapping). State that persists across a session lives in plain files the skills tell the agent to create: a plan file under `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` (`writing-plans/SKILL.md`), and an ignored ledger `progress.md` inside a per-feature workspace (`subagent-driven-development/SKILL.md`) recording task status and "Rulings." Model routing is left entirely to the host harness: skills say things like "hand off to a fresh implementer on a stronger model" but Superpowers itself has no model client, no gateway and no cost tracking of its own; it assumes the harness already exposes a way to pick a model per subagent.

## 4. UX

There is no UI beyond the chat session itself. A user installs the plugin once per harness (one command, per the README's per-harness sections), and from then on every session opens with the injected `using-superpowers` skill text, so onboarding is a single install step with zero further configuration. Work is narrated as it happens: skills instruct the agent to announce "Using [skill] to [purpose]" before following one, so a user watching the transcript sees which process is active without a dashboard. Intervention is typing into the same chat: `brainstorming`'s three-tier gate (spike/bounded/architectural) and `writing-plans`'s execution handoff both stop and ask a direct question before the next artifact is created, and `subagent-driven-development` names four conditions (irreversible operation, security-sensitive action, external side effect, plan broken beyond repair) as the only points it should stop for otherwise, logging a "Ruling" and continuing on everything else. There are no screenshots in the README; the whole interface is the one CLI or IDE session the harness already provides.

## 5. Security, identity, sandbox, policy, cost

Security and policy are prompt text, not code. Every constraint in Superpowers (TDD's Iron Law, the stop conditions, the skill-check mandate) is a Markdown instruction the model is asked to follow, backed by no runtime enforcement; a model that ignores a skill is not stopped by anything in this repository. Identity is whatever the operator's own shell session already has: the agent runs with the human's own credentials, filesystem access and any API keys already in the environment, with no per-task scoping. Sandboxing is a worktree checked out from the same repository (`using-git-worktrees`, referenced from `writing-plans`), which isolates a working tree from the main checkout but not the filesystem, network or process from the host machine. There is no egress control of any kind, since Superpowers assumes a human is present and trusted, using the harness the operator already trusts. Cost is not tracked or capped in the repository; the closest mechanism is the model-tier-by-task-complexity rubric in `subagent-driven-development/SKILL.md`, which routes cheap tasks to cheap models to save money as a side effect of a task-sizing heuristic, not as a spend limit.

## 6. What we should take from it

Narrow, code-level: the ledger file pattern in `subagent-driven-development/SKILL.md` (a `progress.md` recording `Task N: complete (commits a..b)` and `Ruling: <decision> - <why> - <cost if wrong>` per ambiguous call) is a one-file, zero-infrastructure recovery mechanism we could add to a task's workspace inside factoryd today, giving a worker (or a human reviewing later) a legible trail of what happened and why, closing part of the gap we already flagged: session records exist but nothing resumes cleanly from them. The 5-round fix loop (3 rounds same implementer, 2 rounds fresh implementer on a stronger model, then forced human-visible adjudication) is similarly a direct, boundable policy we could encode in the review-gate retry logic instead of an open-ended or purely count-based retry.

Broad, product-shape: `diagnosing-superpowers/SKILL.md`'s evidence discipline, every finding cited as `path:line`, parallel per-dimension analyst subagents reading the same transcript, an explicit approval gate before anything is exported, is close to a working design for the trace and replay UI we admit our own console lacks, and doubles as a template for a cheap-parallel-analyst pass over telemetry so "every alert gets a verdict" without a human reading every trace. The eval harness referenced from `AGENTS.md` (superpowers-evals, a QA agent that drives real CLIs against scenario acceptance criteria plus deterministic post-checks, with before/after numbers required in every skill-changing pull request) is exactly the regression suite we do not have for our own harness prompt and Harness interface implementations; nothing currently stops a prompt change from silently regressing worker behaviour. `brainstorming`'s three-tier approval gate (spike/bounded/architectural, each requiring sign-off before the next artifact exists) is a usable shape for the spec-driven intake we do not have: an issue could move through "design proposed -> design approved -> plan approved -> executing" instead of jumping straight from issue to code, with a human decision point sized to the risk of the change rather than one fixed approval step.

## 7. Where our philosophy differs and what that costs or buys us

Superpowers gets a rich, evolving process (17 skills, weekly releases, a real eval harness) for the price of zero infrastructure, because it enforces nothing: every rule is prompt text a compliant model follows voluntarily. Our "policy lives outside the model" principle rules this out as a substitute for anything security-relevant; we can borrow the ledger, the fix-loop shape and the eval-harness idea as mechanisms, but none of them may stand in for gateway-enforced capability rules, network policy or the reproduction gate. Where Superpowers stops and asks a human mid-task, our factory is built to keep other tasks moving and escalate asynchronously, so the mechanisms we take (rulings, stop conditions, approval gates) need "ask" rewritten as "escalate and continue elsewhere," not copied verbatim. And where Superpowers' isolation unit is a bare worktree with full operator credentials, our sandbox-isolation and identity-per-task axes are strictly better already; nothing here argues for loosening gVisor, default-deny egress or per-task ServiceAccount tokens. The cost of taking the useful parts is discipline: extracting a prompt pattern without also importing its enforcement-free assumption that the agent will comply.

## 8. Red flags and slop assessment

`AGENTS.md` states a 94% pull request rejection rate and a zero-dependency policy enforced in review, both signs of an actively maintained, opinionated project rather than a drive-by repository. Release notes (`RELEASE-NOTES.md`) show version 6.4.2 and 6.4.1 with concrete before/after evidence for skill-behaviour changes ("9/9 against planted-defect probes on Sonnet 5," "11 of 12 probe runs," stated cost and time reductions), which is unusual rigour for a prompt library and matches the eval-harness claim in `AGENTS.md`. The most recent change at clone time was dated 2026-09-27, two days before this report, against a created date of 2025-10-09, so the project is under a year old and still growing fast (292,716 stars, 26,200 forks, 278 open issues per the GitHub API). No licence changes, no open-core gating and no security incidents were found in the README, release notes or web search; MIT covers the whole repository. The one caution: star and fork counts this high for a markdown-only plugin are unusual and worth treating as a popularity signal rather than a correctness one, since nothing in the repository is independently tested beyond the maintainers' own eval harness, which is not itself in this repository.

## 9. Sources

- https://github.com/obra/superpowers (README.md, AGENTS.md, LICENSE, package.json, RELEASE-NOTES.md)
- https://github.com/obra/superpowers/blob/main/hooks/hooks.json
- https://github.com/obra/superpowers/blob/main/hooks/hooks-cursor.json
- https://github.com/obra/superpowers/blob/main/hooks/run-hook.cmd
- https://github.com/obra/superpowers/blob/main/hooks/session-start
- https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/diagnosing-superpowers/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md
- https://api.github.com/repos/obra/superpowers (stars, forks, open issues, created and pushed dates, licence, fetched 2026-09-29)
- Anthropic plugin marketplace listing for Superpowers (install count, fetched 2026-09-29)
- local clone at repos/market-research-clones/superpowers, last commit 2026-09-25 11:06:27 -0700
