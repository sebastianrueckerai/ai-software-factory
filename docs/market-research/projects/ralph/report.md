---
name: Ralph (the Ralph Wiggum technique)
slug: ralph
url: https://ghuntley.com/ralph/
repo: https://github.com/snarktank/ralph
category: factory-orchestrator
license: MIT
open_source: yes
self_hostable: yes
hosting_model: no service at all, a shell loop and a prompt file run on the operator's own machine against a locally installed CLI coding agent (Amp or Claude Code)
company: no company. Geoffrey Huntley is an individual practitioner who named and popularised the technique on his own blog. snarktank/ralph is a separate, unofficial community reference implementation, not authored by Huntley
maturity: technique dated to mid-2025 by independent coverage (Huntley's ghuntley.com/ralph). snarktank/ralph repo, 21.9k stars, 2.1k forks, MIT, 34 open issues plus 41 open pull requests, last commit 2026-02-01 (from the depth-1 clone). GitHub API was rate-limited during research so exact repo creation date is not verified
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 1
  reseedable_selfhost: 1
steal:
  - "The machine-checkable stop sentinel: the agent prints the literal string <promise>COMPLETE</promise>, ralph.sh greps stdout for it to end the loop. A one-line, robust completion signal worth reusing anywhere a supervisor needs a deterministic 'this session is truly done' check."
  - "The prd skill's right-sized-story rule, written as a 2-3 sentence test with worked right-sized versus too-big examples (add a column and migration versus refactor the API). Better-phrased task-scoping guidance than most TaskBrief authoring advice, worth stealing the wording."
  - "AGENTS.md and CLAUDE.md as a living, agent-maintained lessons file read at the start of every session and updated at the end of each one. Crude (one file, no dedup, no expiry) but a real, working answer to the 'no project memory' gap in our own weak-spot list."
  - "Auto-archiving the previous run's state (prd.json, progress.txt) into an archive folder keyed by date and feature name whenever the tracked branch name changes, so a new feature never silently overwrites the last one's history."
  - "Explicit 'backpressure' framing: treat type checks, tests, static analysis and security scanners as the thing that makes fast generation safe, and size the checks to the language (fast for dynamic languages, accept slow correctness for compiled ones). A useful vocabulary for our own verification-plane tradeoffs, even though Ralph's checks are self-run and self-graded."
differs:
  - "Ralph's worker model has no sandbox, no network policy and no scoped identity, because it runs the CLI tool with its permission checks turned off directly on the operator's own machine, with the operator's own credentials. Disabling the CLI's own permission system is the load-bearing move that makes an unattended loop possible at all. We cannot adopt any part of this without breaking 'security without half measures', it is not that Ralph is ahead of us here, it is that Ralph only works because one trusted developer is watching their own laptop."
  - "Ralph is deliberately monolithic: one process, one task per loop, and Huntley argues multi-agent orchestration is premature complexity ('a red hot mess'). Our design is the opposite bet, many disposable workers behind a durable control plane, because we need concurrent tasks across many projects with budgets and approvals. Adopting Ralph's stance would mean giving up the fan-out our factory exists to provide."
  - "Verification in Ralph is the same agent grading its own homework: it decides which checks to run and sets its own completion flag. Our verification plane exists specifically to avoid this (independent CI on untrusted runners, then a separate stronger-model review). Copying Ralph's self-graded model anywhere would reintroduce the exact failure Hacker News critics name as the technique's weak point: an agent presenting a wrong answer as correct with nobody independent checking."
ux_verdict: Zero-account, CLI-only, about five steps from a written PRD to a running loop, but watching Ralph work means reading raw terminal scrollback, there is no pause, approve, or multi-run view, only Ctrl+C.
slop_verdict: Real and genuinely viral (21.9k stars on the reference repo alone, a wave of independent blog and video coverage through early 2026, half a dozen independent reimplementations), but folklore around one person's blog posts, not a maintained product, with no company, no support and no roadmap behind it.
---

# Ralph (the Ralph Wiggum technique)

## 1. What it is

Ralph is a technique, not a product: an autonomous coding loop invented and named by Geoffrey Huntley in mid-2025 and first described on his blog at ghuntley.com/ralph. In its purest form it is a one-line bash loop that pipes a prompt file into a coding agent forever. Each pass spawns a coding agent with a completely fresh context window. The agent reads a prompt and a plan, does one task, validates it, commits, and exits. Then the loop starts the next agent from nothing. Memory survives only in git history and in files the agent itself writes, typically a plan file and a lessons file. Huntley calls the result "deterministically bad in an undeterministic world" and is openly hostile to letting an agent's context get compacted, calling compaction "the devil."

snarktank/ralph on GitHub is the most visible community reference implementation, separate from Huntley's own work. It wraps the same idea in a small toolkit: `ralph.sh` (the loop), a `prd.json` task list with a `passes` flag per user story, a `progress.txt` append log, and two Claude Code or Amp skills (`prd`, `ralph`) that turn a written PRD into that JSON. It also ships an interactive React Flow diagram of the loop, published to GitHub Pages as a teaching aid.

Huntley's headline claim is a rewrite he prices as "a $50k USD contract" delivered for about $297 in model spend, plus later claims of porting 750,000 lines of code in 11 days. What the snarktank repository actually contains is far more modest: a 113-line bash script, three markdown prompt templates and a JSON schema. All of the intelligence is in the wording of the prompt and the operator's judgement about how to tune it, not in any code in the repository.

## 2. Mapping to our five planes

| Plane / principle | What Ralph does | What we do | Verdict |
|---|---|---|---|
| Signals | None built in. A human writes the PRD by hand before the loop starts. Some variants swap the queue for GitHub Issues or Linear, but that is not core | Forgejo webhooks, SigNoz alerts and the factoryd intake API all create tasks automatically | we lead |
| Control plane | No scheduler and no workflow engine. State is a JSON file, an append-only text log and git commit history, read back by each new agent invocation. No approvals, no budgets, no audit trail beyond the commit log | factoryd with a Temporal workflow per task, Postgres task registry, policy, budgets and approvals as first-class state | we lead |
| Worker plane | No isolation of any kind. The loop runs the CLI tool with its own permission checks disabled directly in the operator's own checkout, with the operator's own credentials and network access | One gVisor pod per task, read-only root filesystem, default-deny egress, one ServiceAccount per task | we lead |
| Verification | "Quality checks" means whatever typecheck, lint or test command the agent itself chooses to run, then the same agent marks the story as passing. No independent CI, no second reviewer, no policy gate | Forgejo Actions on untrusted runners, path-risk and reproduction gates, then a stronger-model review with a strict verdict | we lead |
| Merge and deploy | Out of scope. Commits land on a local feature branch. Nothing pushes, opens a PR, or deploys, the operator does that by hand | Bot-only merge after approval or an auto rule, Flux deploy, staged rollout | we lead |
| Policy outside the model | None. Every rule ("work on ONE story", "keep CI green", do not cheat with placeholder code) is a sentence in a markdown prompt the model is trusted to obey | Capability rules are a Git-versioned document enforced in gateway code and network policy | we lead |
| Identity per task | None. The loop authenticates as whichever human is already logged into the CLI tool, commits land under the operator's own configured git identity | Short-lived, task-scoped, audience-bound tokens. No key material reaches the sandbox | we lead |
| Artifacts not chat | Aligned in spirit only. The progress log, the task JSON and git commits are exactly the kind of durable, file-based handoff between one throwaway agent instance and the next that our own design also relies on, though Ralph reuses the same checkout and branch rather than a fresh sandboxed workspace per run | A TaskBrief in, a branch, a PR and a normalised event stream out, from a disposable sandbox per task | equal |

## 3. Architecture and stack

`ralph.sh` is 113 lines of bash: argument parsing for a tool choice (amp or claude) and a max-iteration count, archiving logic keyed on the task file's branch name field, then a loop that invokes the chosen CLI tool with its permission checks disabled, tees the output to the terminal, and greps it for a literal completion marker to break out. `prompt.md` (for Amp) and `CLAUDE.md` (for Claude Code) are near-duplicate operator instructions: ten numbered steps to read the task file, read the progress log, check out the right branch, pick the highest-priority story not yet passing, implement it, run quality checks, update the shared lessons file with reusable learnings, commit, flip the story to passing, and append to the progress log.

`skills/prd/SKILL.md` and `skills/ralph/SKILL.md` are Claude Code and Amp "skills" (YAML front matter with name, description, user-invocable) that respectively interview the user into a markdown PRD and convert that PRD into the JSON schema shown in `prd.json.example`. The `.claude-plugin` folder registers both skills as an installable Claude Code plugin marketplace. `flowchart/` is an unrelated React 19 plus React Flow Vite app, deployed to GitHub Pages by a workflow file, a presentation aid with no runtime link to `ralph.sh`. There is no server, no database, no queue and no container image anywhere in the repository. Model access is whatever the installed CLI tool already has configured, `ralph.sh` never calls a model API directly.

## 4. UX

Zero to a first run is about five steps, all CLI: install the `jq` tool, install the Amp or Claude Code CLI, ask the `prd` skill to write a PRD, ask the `ralph` skill to convert it to the task JSON, then run the loop script with a chosen tool and iteration count. No account beyond the coding tool's own login. While the loop runs, the user watches raw terminal scrollback, with an iteration banner marking the boundary between agent instances. There is no pause, redirect, or approve action, only Ctrl+C, and no view of several loops running side by side. The one polished piece of UX is the standalone flowchart microsite, a click-through animated diagram aimed at explaining the idea to newcomers, not at operating a real run. Against our console's kanban board and human approval lane, Ralph has no equivalent at all.

## 5. Security, identity, sandbox, policy, cost

**Security and sandbox.** None enforced in code. Both CLI invocations explicitly disable the tool's own permission prompts, because an unattended loop cannot answer an approval dialog, so the operator's own machine and its ambient credentials are the entire blast radius. Huntley's own companion guide is explicit that any sandbox has to be supplied by the operator, Ralph provides none.

**Identity.** None. The agent runs as whichever OS user and CLI login started the loop, and commits land under that user's own configured git identity.

**Policy.** Entirely prompt text spread across the three instruction files. "Do NOT commit broken code" and "work on ONE story per iteration" are instructions, not code paths that can reject a bad commit.

**Cost.** No budget, hold or ledger anywhere in the repository. Independent reporting found during research describes a misconfigured loop reaching iteration 1,966 with no iteration cap set, and a separate guide estimates $50 to $100 in API spend for a typical fifty-iteration run. The only guard rail is the max-iterations argument the operator remembers to set.

## 6. What we should take from it

Narrow: the completion sentinel grepped from stdout is a trivially simple, robust stop condition worth reusing wherever our own supervisor needs a deterministic "this session is truly done" signal. The `prd` skill's right-sized-story test ("if you cannot describe the change in two to three sentences, it is too big", with worked right-sized versus too-big examples) is better-written scoping guidance than most TaskBrief authoring advice, worth stealing the wording. Auto-archiving prior run state whenever the tracked branch changes is a cheap habit worth having for any of our own file-based run state.

Broad: a living, agent-maintained lessons file, read at the start of every session and updated at the end, is a crude but working answer to the "no project memory, no codebase index" gap in our own weak-spot list. It deduplicates nothing and never expires, but the instinct, let the agent write down what it learned about the codebase and not only about the task, is exactly the mechanism we do not have yet. Separately, a community variant that swaps the local task file for a real issue tracker plus an explicit decision log is useful independent confirmation that a decision log, not just a status field, is the upgrade that matters for handing state to the next fresh session.

## 7. Where our philosophy differs and what that costs or buys us

Ralph's worker model has no sandbox, no network policy and no scoped identity, because disabling the CLI's own permission system is the load-bearing move that makes an unattended loop possible at all. We cannot adopt any of this without breaking "security without half measures". This is not Ralph being ahead of us, it is Ralph only working because one trusted developer is watching their own laptop with their own credentials at stake.

Ralph is also deliberately monolithic. Huntley argues multi-agent orchestration is premature complexity, "a red hot mess" compared to one process doing one task per loop. Our design takes the opposite bet on purpose, many disposable workers behind a durable control plane, because we need concurrent tasks across many projects with budgets and approvals that a single loop cannot express. Adopting Ralph's stance would mean giving up the fan-out our factory exists to provide.

The one place Ralph's approach might be cheaper than ours: for a single trusted developer building greenfield, throwaway software with nobody else's money or data at risk, Ralph's total absence of sandboxing and policy machinery is genuinely less to build and run than our five planes. That is the price of generality, our constraints exist because we serve tasks and projects Ralph's design never has to consider.

## 8. Red flags and slop assessment

Real and genuinely viral: 21.9k stars and 2.1k forks on the reference repository alone, a wave of independent blog and video coverage through early 2026 (including a HumanLayer interview with Huntley and multiple "what is the Ralph loop" explainers), and at least half a dozen independent reimplementations found in search (community loop scripts for Claude Code and Codex, a Vercel AI SDK port, an OpenCode-native port, a dedicated marketing site, and Anthropic's own Claude Code loop plugin, later folded into built-in commands). This spread because the idea is genuinely simple enough to copy in an afternoon, not because of marketing spend.

The hype has clearly outrun the discipline. Huntley's own successor post ("everything is a ralph loop", January 2026) folds Ralph into a vaguer "programming the loop" mindset and links to his own unreleased "Loom" project, which he calls a "software factory" in the same breath as warning readers not to use it. A widely read mid-2026 rebuttal, "We Stopped Calling It Ralph Wiggum", argues the joke name undersold the real engineering discipline the technique needs. A January 2026 Hacker News thread, "Someone needs to say it: Ralph Wiggum Doesn't Work", argues the failures are structural (no isolated steps, no explicit state passing, no independent verification) rather than a tuning problem. Community accounts describe both cost runaways and silent breakage, waking up to a codebase that no longer compiles, in Huntley's own writing. No company, funding or support model exists behind either the technique or the snarktank reference implementation, this is a personal blog and a community GitHub repository, not a vendor.

## 9. Sources

- https://ghuntley.com/ralph/ (fetched 2026-09-29)
- https://ghuntley.com/loop/ (fetched 2026-09-29)
- https://github.com/snarktank/ralph (fetched 2026-09-29, stars, forks and issue counts from the page)
- clone of https://github.com/snarktank/ralph, depth 1, at /home/womb/repos/market-research-clones/ralph
- /home/womb/repos/market-research-clones/ralph/README.md
- /home/womb/repos/market-research-clones/ralph/ralph.sh
- /home/womb/repos/market-research-clones/ralph/prompt.md
- /home/womb/repos/market-research-clones/ralph/AGENTS.md
- /home/womb/repos/market-research-clones/ralph/CLAUDE.md
- /home/womb/repos/market-research-clones/ralph/prd.json.example
- /home/womb/repos/market-research-clones/ralph/skills/prd/SKILL.md
- /home/womb/repos/market-research-clones/ralph/skills/ralph/SKILL.md
- /home/womb/repos/market-research-clones/ralph/.claude-plugin/plugin.json
- /home/womb/repos/market-research-clones/ralph/.claude-plugin/marketplace.json
- /home/womb/repos/market-research-clones/ralph/.github/workflows/deploy.yml
- /home/womb/repos/market-research-clones/ralph/flowchart/package.json
- /home/womb/repos/market-research-clones/ralph/LICENSE
- commit log of the clone (last commit date, 2026-02-01)
- WebSearch "Geoffrey Huntley Ralph Wiggum technique variants ralph while loop coding agent" (2026-09-29), including https://github.com/ghuntley/how-to-ralph-wiggum, https://www.humanlayer.dev/blog/brief-history-of-ralph, https://github.com/KLIEBHAN/ralph-loop, https://github.com/vercel-labs/ralph-loop-agent, https://ralph-wiggum.ai/, https://dev.to/ghalex/the-ralph-loop-running-coding-agents-for-hours-3po2
- WebSearch "Ralph Wiggum coding agent loop hacker news reddit criticism" (2026-09-29), including https://news.ycombinator.com/item?id=46672413, https://news.ycombinator.com/item?id=46750937, https://news.ycombinator.com/item?id=46785684, https://paddo.dev/blog/loop-engineering-rename-and-invoice, https://dev.to/sean8/i-accidentally-made-claude-ask-itself-the-same-question-1966-times-1c5h
