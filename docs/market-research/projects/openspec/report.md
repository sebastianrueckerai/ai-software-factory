---
name: OpenSpec
slug: openspec
url: https://openspec.dev
repo: https://github.com/Fission-AI/OpenSpec
category: spec-driven
license: MIT
open_source: yes
self_hostable: yes
hosting_model: local CLI only, no server; a paid team product ("Workspaces") is announced but not shipped
company: Fission AI, Y Combinator W26, Sydney, founder Tabish Bidiwale, no disclosed funding beyond YC, founded 2025
maturity: 70.6k stars, 4.8k forks, 915 commits, 51 npm releases, first commit 2025-08-05, last push 2026-09-28, roughly weekly release cadence
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 3
  reseedable_selfhost: 3
steal:
  - The delta-spec format (ADDED Requirements / MODIFIED / REMOVED, each with Given/When/Then scenarios) is a ready template for the "specification with acceptance criteria" intake we do not have yet.
  - One canonical artifact schema (schemas/spec-driven/schema.yaml and its templates) rendered into many tool-specific command files is the same trick our Harness interface needs when swapping opencode for Codex CLI.
  - openspec validate runs a cheap, deterministic schema check on a spec before any model touches it, a pattern that fits directly ahead of our reproduction gate.
  - SECURITY.md's in-scope/out-of-scope threat-model table is a compact, reusable shape for documenting factoryd's own trust boundary.
  - The forced pause after /opsx:propose (plan written, human reads it, only then /opsx:apply runs) is a cheap textual approval gate worth adding before an agent starts on a weak issue.
  - Stores (planning kept in its own repo, referenced read-only from several code repos) is the shape to copy if factory planning ever needs to span more than one registered project.
differs:
  - OpenSpec enforces nothing at runtime. Every rule ("write a proposal first", "use deltas") lives only in a prompt or skill file a model is free to ignore, the opposite of our "policy lives outside the model" principle. Its spec format is safe to borrow, its trust model is not.
  - Specs are optional and advisory with no automatic check that code matches spec ("enablers not gates"). Our reproduction gate needs acceptance criteria to be machine-checked, not just human-read, so we would have to make specs authoritative in a way OpenSpec deliberately avoids.
ux_verdict: Best-in-class onboarding for injecting a workflow into a tool you already use, but there is no agent-run UI at all because OpenSpec never runs the agent.
slop_verdict: Real and actively used, not a landing page, but a one-founder YC company with no enforcement behind its own convention and a recurring independent complaint of spec drift.
---

# OpenSpec

## 1. What it is

OpenSpec is a free CLI and a set of prompt templates that put a lightweight spec layer between a person and whatever AI coding assistant they already use. It is made by Fission AI, a Y Combinator (W26) company founded by Tabish Bidiwale in Sydney, with no disclosed funding beyond YC and no evidence of a team beyond the founder and one other listed maintainer (MAINTAINERS.md). It runs entirely on the user's machine: openspec init writes tool-specific slash-command or skill files for the tool already open (Claude Code, Cursor, Codex, Copilot, Amazon Q and dozens more, docs/supported-tools.md lists 62 file-format combinations), and a small CLI manages plain-Markdown state under openspec/.

The maker's claim is "agree on what to build before any code is written." The repository backs that up for the narrow part it controls: /opsx:propose, /opsx:apply and /opsx:archive really do write proposal.md, specs/, design.md and tasks.md to a change folder (src/core/init.ts, src/core/archive.ts) and later merge the delta into openspec/specs/, checked against schemas/spec-driven/schema.yaml. What the "framework" branding does not cover, despite the README calling it that, is running, sandboxing or supervising an agent. The actual coding happens inside whatever tool the user already had open, with whatever permissions and network access that tool already had.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work starts when a person types a prompt; no issue, alert or telemetry intake | Forgejo webhooks, SigNoz alerts, factoryd intake API | we lead |
| Control plane | Change state is a folder's position (changes/ vs changes/archive/YYYY-MM-DD-name) plus a status enum in change-status-policy.ts, no daemon, no scheduler | factoryd, Temporal workflow per task, Postgres state, budgets, approvals | we lead |
| Worker plane | None, reuses whatever sandbox (or none) the host AI tool already runs in | Disposable gVisor pod per task, default-deny egress | we lead |
| Verification | openspec validate schema-checks Markdown structure; optional /opsx:verify has the same agent re-read the diff against spec, no test execution | Forgejo Actions, policy gates, reproduction gate, stronger-model review | we lead |
| Merge and deploy | None, left to the user and the IDE | Bot merge after approval, Flux GitOps rollout | we lead |
| Policy outside model | None. Every rule is a convention in a prompt/skill file an agent can ignore | Capability rules in Git, enforced by gateway code and network policy | we lead |
| Identity per task | Not applicable, runs as the local user with the local user's own credentials | Per-task ServiceAccount token verified against cluster OIDC | we lead |
| Artifacts not chat | Genuine match: a change folder (proposal, specs, design, tasks) is a structured artifact both sides read, not chat history | TaskBrief in, branch/PR/event stream out | equal |

## 3. Architecture and stack

TypeScript on Node 20.19+, published to npm as @fission-ai/openspec. Dependencies: commander (CLI), @inquirer/prompts (interactive setup), zod (schema validation), yaml, chalk/ora (terminal output), diff, fast-glob, cross-spawn (argument-array subprocess calls, no shell string interpolation). src/core holds the domain logic (archive.ts, init.ts, list.ts, validation/, parsers/, templates/, store/ for the Stores beta); src/commands wraps it as CLI subcommands; src/ui is plain console.log with chalk, no TUI framework. schemas/spec-driven/schema.yaml plus schemas/spec-driven/templates/*.md define the canonical artifact shape once; skills/openspec-*/SKILL.md and .agents/skills/* are the generated per-tool files. There is no database, queue or server: state is Markdown files under openspec/ in the user's own repository. The Stores beta (docs/stores-beta/user-guide.md) lets that same folder live in a separate repo, registered locally by name, so several code repos can read one shared spec.

## 4. UX

Onboarding is one command and genuinely best in its narrow scope, but there is no execution UI at all, because OpenSpec never runs an agent. From zero: npm install -g @fission-ai/openspec@latest (or brew install openspec), openspec init in the project, then type /opsx:propose <idea> in whichever chat tool is already open. Three steps to a first artifact. Watching the agent work means watching the host tool's own chat window; OpenSpec adds nothing there. Intervention is a deliberate pause built into the workflow, not a UI feature: /opsx:propose stops after drafting proposal.md/specs/design.md/tasks.md and waits for a human read before /opsx:apply runs, and /opsx:archive is a second explicit gate. openspec view (src/core/view.ts) is a scrolling chalk-coloured terminal report of draft/active/archived changes, not the interactive dashboard the README screenshot implies. Against our console: the kanban board, human lane and cost view show live state across a whole factory; OpenSpec shows only one repo's planning artifacts, on demand, after the fact.

## 5. Security, identity, sandbox, policy, cost

Identity: not applicable, the CLI runs as the local user with the local user's shell permissions. SECURITY.md states subprocess calls use argument arrays or fixed literals, never shell interpolation, and the one self-upgrade path (openspec update calling npm install -g) fires only after an explicit yes and never in CI.

Sandbox: none. The agent writes directly into the project the CLI was pointed at; isolation is whatever the host coding tool already provides.

Policy: none in code. Every constraint ("write a proposal before a big change", "use deltas not full rewrites") lives in a prompt or skill file the agent is free to skip.

Cost: none. No budget and no ledger; whatever the wrapped model call costs is tracked by the host tool, if at all. Telemetry is opt-out, anonymous, and limited to command name plus version (SECURITY.md).

## 6. What we should take from it

Narrow: the delta-spec format (ADDED Requirements / MODIFIED / REMOVED, each with Given/When/Then scenarios, see the README example) is a ready template for the "specification with acceptance criteria" intake this project says it lacks. One canonical schema rendered into many tool-specific formats is the same trick our Harness interface needs for a second harness. openspec validate as a pre-flight schema check ahead of any model call fits directly before our reproduction gate. The SECURITY.md in-scope/out-of-scope table is a compact shape worth reusing for factoryd's own threat model.

Broad: the forced pause after /opsx:propose, plan written, human reads it, only then does anything execute, is a cheap approval gate worth adding wherever we accept an issue with weak acceptance criteria, before an agent starts, not only before merge. Stores (planning in its own repo, referenced read-only from code repos) is the shape to copy if factory planning ever needs to span more than one registered project.

## 7. Where our philosophy differs and what that costs or buys us

OpenSpec enforces nothing at runtime. Every rule is a convention in a prompt a model can ignore, the opposite of "policy lives outside the model." Copying its spec format is safe, copying its trust model would break our security constraint outright.

Specs are optional and advisory, with no automatic check that implementation matches spec ("enablers not gates" is the project's own phrase for this). Our reproduction gate needs acceptance criteria to be machine-checked, not just human-read, so adopting this artifact shape means making the spec authoritative in a way OpenSpec deliberately does not.

## 8. Red flags and slop assessment

Real and maintained: 70.6k stars, 4.8k forks, 915 commits, 51 npm releases since first commit on 2025-08-05, last push 2026-09-28, roughly weekly releases (CHANGELOG.md). CI is real, not decorative: CodeQL, Dependabot, dependency review, secret scanning, pnpm audit on every pull request, and every GitHub Action pinned to a commit SHA (SECURITY.md). Independent coverage (several Hacker News threads, a comparison piece on labitcode.com) treats it as a tool people run, not a star-farm.

Governance is thin: Fission AI is functionally a one-founder company, no disclosed funding beyond YC, no public team page, no foundation, per an independent review at tomrochette.com. The whole project depends on one steward. The workflow has already been rebuilt once, the current /opsx:* artifact flow replaced an older command set (README's own "we've rebuilt OpenSpec" note, and README_OLD.md is still in the repo), so command names and file shapes have already churned once. The recurring independent criticism, across multiple Hacker News threads and a CodeMySpec write-up, is spec drift: nothing enforces that openspec/specs/ stays true to the code once /opsx:apply starts editing, so specs rot on any project that skips the optional, expanded-profile /opsx:verify step. Monetisation is undecided: MIT today, no paid tier, but the YC company page describes a coming "Workspaces" product for team-scale, multi-repo planning built on the same Stores beta flagged as worth stealing above, so a feature we might come to rely on could move behind a paywall.

## 9. Sources

- https://github.com/Fission-AI/OpenSpec (README.md, README_OLD.md, CONTRIBUTING.md, MAINTAINERS.md, SECURITY.md, LICENSE, package.json, CHANGELOG.md), cloned shallow 2026-09-29
- Local read: docs/overview.md, docs/how-commands-work.md, docs/concepts.md, docs/supported-tools.md, docs/stores-beta/user-guide.md, docs/README.md, schemas/spec-driven/schema.yaml, src/core/view.ts, src/core/ and src/commands/ directory listings, 2026-09-29
- https://api.github.com/repos/Fission-AI/OpenSpec (stars, forks, open issues, created/pushed dates), fetched 2026-09-29
- https://news.ycombinator.com/item?id=49734264, 2026-09-29
- https://news.ycombinator.com/item?id=45663874, 2026-09-29
- https://news.ycombinator.com/item?id=47019109, 2026-09-29
- https://news.ycombinator.com/item?id=48510002, 2026-09-29
- https://news.ycombinator.com/item?id=47418296, 2026-09-29
- https://codemyspec.com/blog/openspec-explained, 2026-09-29
- https://tomrochette.com/agents/spec-driven-development/openspec/, 2026-09-29
- https://labitcode.com/blog/spec-driven-development-openspec-vs-spec-kit, 2026-09-29
- https://www.ycombinator.com/companies/openspec, 2026-09-29
- https://www.ycombinator.com/launches/Pdc-openspec-the-spec-framework-for-coding-agents, 2026-09-29
- https://tekai.dev/catalog/fission-ai, 2026-09-29
- https://rywalker.com/research/openspec, 2026-09-29
