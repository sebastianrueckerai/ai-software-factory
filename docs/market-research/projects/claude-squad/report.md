---
name: Claude Squad
slug: claude-squad
url: https://github.com/smtg-ai/claude-squad
repo: https://github.com/smtg-ai/claude-squad
category: multi-agent-ui
license: AGPL-3.0
open_source: yes
self_hostable: yes
hosting_model: local CLI only, no server, no SaaS tier, runs entirely on the developer's own machine
company: smtg-ai (GitHub org), no published company, funding or HQ, small team, active since March 2025
maturity: 8545 stars, 621 forks, 20 contributors, first commit 2025-03-09, last commit 2026-08-20, releases roughly every 1-2 months (v1.0.16 to v1.0.20 between March and August 2026), 56 open issues
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 1
  verification: 0
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 4
  reseedable_selfhost: 2
steal:
  - "Pause/Resume: dropping the git worktree but keeping the branch to park an idle task cheaply, then rebuilding the worktree from the branch on Resume. A candidate for how our worker plane parks a task that is waiting on a human, instead of tearing the whole pod down and starting cold."
  - "Graceful handling of a dead session: session/instance.go Start() treats a missing tmux session as pause this one instance, not a fatal error, so one crashed session never blanks the whole instance list on load. Same shape as a task-list reconciler that should skip, not abort, on one bad row."
  - "Orphaned-worktree recovery: Pause() checks IsValidWorktree() first and takes a separate cleanup path (skip dirty check, force-remove directory, prune metadata) when the worktree's directory or .git is already gone, rather than erroring out."
  - "Profiles: a short list of name/program pairs in config.json to switch which CLI (claude, codex, aider, gemini) a new session launches, with a picker in the creation overlay when more than one is defined."
  - "Program-specific trust-prompt auto-dismiss for claude, aider and gemini, so a new session can start unattended without reaching for a blanket skip-all-permissions flag."
differs:
  - "No sandbox at all. The chosen CLI runs as the developer's own OS user in the worktree directory, with the developer's full network access and ambient credentials. Git worktrees separate code, not machines, processes or network. Our gVisor-pod-per-task and default-deny egress is a hard requirement claude-squad has no equivalent for."
  - "No task identity, no control plane, no cost ledger. State is one local JSON file; credentials are whatever gh, git and the model CLI already have configured on the host, shared by every instance. Fine for one trusted developer on one laptop, incompatible with identity belongs to the task at any multi-project or semi-autonomous scale."
  - "Single-user, single-machine by design. It solves one developer runs several coding agents from one terminal, not a signal comes in and a reviewed, deployed change comes out with minimal human involvement. Verification, merge policy and deploy are left entirely to the developer's own judgement and a manual gh push."
ux_verdict: Best-in-class terminal UX for one developer juggling several coding-agent sessions, but it is a session manager, not a factory. Nothing happens unless a human is attached.
slop_verdict: Real and used. 8500-plus stars, 620-plus forks, 20 contributors, steady releases since March 2025 through August 2026, plain AGPL-3.0 licence, no landing-page hype. Not slop.
---

# Claude Squad

## 1. What it is

Claude Squad is a terminal application that runs several coding-agent CLIs (Claude Code, Codex, Gemini CLI, Aider, and others via a custom launch command) side by side, each in its own tmux session and its own git worktree. It is built and maintained by the GitHub organisation smtg-ai, a small team with no published company details, funding or headquarters. It targets individual developers who want to run more than one coding agent at once from a terminal, without waiting for one to finish before starting the next.

The README and the GitHub Pages site (smtg-ai.github.io/claude-squad) both describe it plainly: "manage multiple AI terminal agents... allowing you to work on multiple tasks simultaneously." The repository backs that up. It is a real Go TUI, not a wrapper around a marketing page: main.go, app/app.go, session/instance.go and the session/git and session/tmux packages implement the whole loop with no server component.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. A human presses n/N in the TUI and types the task | Forgejo webhooks, SigNoz alerts, factoryd intake API | we lead |
| Control plane | One local JSON file (config/state.go, in the claude-squad config dir) holding each Instance's title, path, branch, status. No scheduler, no approvals, no audit trail | factoryd with a Temporal workflow per task, Postgres, policy in Git | we lead |
| Worker plane | One tmux session (session/tmux) plus one git worktree (session/git) per task, running the chosen CLI directly as the developer's own OS process. No filesystem or network isolation beyond the worktree | gVisor pod, per-task ServiceAccount, default-deny egress | we lead |
| Verification | None automated. A diff tab (tab key) lets the human read the diff before pushing | Forgejo Actions, policy gates, reproduction gate, stronger-model review | we lead |
| Merge and deploy | The s key commits locally then syncs the branch to the remote and opens it in a browser for the human to raise a PR by hand (session/git/worktree_git.go, PushChanges) | bot merge after approval or an auto rule, Flux GitOps rollout | we lead |
| Policy outside the model | None of its own. Relies on the underlying CLI's own permission prompts; the experimental autoyes flag auto-accepts them instead of enforcing anything | Capability rules in Git, enforced in gateway code and network policy | we lead |
| Identity per task | None. Every instance shares the developer's ambient auth, git identity and whatever model API key is in the shell | Per-task projected ServiceAccount token, per-task LiteLLM virtual key | we lead |
| Artifacts not chat | Partial. The worktree and branch are the artifact boundary, but the human attaches to a live tmux pane to chat with the agent directly and steer it | TaskBrief in, branch/PR/event stream out, no live chat channel | not comparable, different operating model |

## 3. Architecture and stack

Go, built on Charm's bubbletea, bubbles and lipgloss libraries for the TUI (see go.mod). Two OS-level dependencies are required: tmux and the GitHub CLI. No database, no queue, no workflow engine: config/state.go persists everything to one JSON file on disk, loaded and saved wholesale.

Each task is a session.Instance (session/instance.go). Start() creates a git worktree (new branch off HEAD, or an existing branch) and a tmux session running the configured program. Pause() commits any dirty changes locally, detaches the tmux session and removes the worktree while keeping the branch; Resume() recreates the worktree and either reattaches the still-alive tmux session or starts a new one. An optional daemon (daemon/daemon.go, launched with a flag) polls all instances on an interval and taps Enter on any that are waiting for input, giving background "autoyes" operation without the TUI open; it is a detached child process tracked by a PID file, not a service.

There is a web directory in the repository, but it is the Next.js scaffold for the GitHub Pages marketing site, not a product dashboard or API.

Talking to models is entirely indirect: claude-squad launches whatever CLI the user configures (claude, codex, aider, gemini) and never calls a model API itself.

## 4. UX

Zero to first result: install the binary, run the app, press n, type a task, watch the agent work in the embedded pane. That is two keystrokes and one prompt after installation. A user watches an agent through a live preview pane built on tmux pane capture, switches to a diff tab to see file changes, attaches directly to the tmux session to reprompt, and uses one key to checkout (commit and pause) or another to push. There is no queue, no approval step and no kanban view; the interface is a single list of instances with status Running, Ready, Loading or Paused.

Against our console: this beats our console today for one job, watching several agent sessions at once with a live terminal view and a diff pane, which the baseline itself lists as things our console lacks (no real-time streams, no diff view). It loses on everything our console is built for: multi-project, multi-user, approval workflows, cost views and audit, none of which claude-squad has or needs, since it manages one developer's own laptop.

## 5. Security, identity, sandbox, policy, cost

Sandbox: none beyond the git worktree, which isolates changed files, not the process, filesystem or network. The agent CLI runs as the same OS user that started the app, with the same network access.

Identity: no concept of per-task identity. Every instance uses the ambient authentication and git identity already configured on the host, and whatever model credentials are in the environment.

Policy: none of the tool's own. It depends entirely on the underlying CLI's built-in permission prompts (a helper in session/instance.go only dismisses first-run trust dialogs for claude, aider and gemini). The autoyes flag, described in the README as "experimental," auto-accepts prompts rather than evaluating them, which removes rather than adds a check; GitHub issue 151 shows it has had reliability problems.

Cost: not tracked. No budget, no spend cap, no ledger of any kind.

## 6. What we should take from it

Narrow (copy this month): the pause and resume pattern of dropping a worktree but keeping its branch is a cheap way to park a task waiting on a human without paying for a live sandbox; worth comparing against however our worker plane currently handles a task sitting in the "waiting on a human" kanban column. The dead-session recovery in Start(), treating one instance's missing tmux session as "pause it" instead of aborting the whole load, is a small but real resiliency pattern for any reconciler that loads a list of task state and must not let one bad row block the rest.

Broad: the baseline lists "no real-time streams of the agent's work, no diff view" as a known console weakness. Claude Squad's live preview pane plus diff tab is proof that this is a solved, small UX problem at the single-session level; our version needs to solve it for many concurrent tasks across a team over a network connection, which is a harder version of the same problem, not a different one.

## 7. Where our philosophy differs and what that costs or buys us

Claude Squad has no sandbox, no per-task identity and no policy layer because it is built for one developer who already trusts their own machine completely. Copying that simplicity would break our security constraint directly: agents in our design get capabilities, never raw credentials, and every task runs in a gVisor pod with default-deny egress. Claude Squad's approach buys it a much smaller codebase and a much faster path to a first result, at the cost of being unusable for autonomous or multi-tenant operation. A single unattended session with ambient credentials is an acceptable risk for one developer's own laptop and an unacceptable one for a factory acting on issues filed by outsiders.

## 8. Red flags and slop assessment

None found that affect trust in the project. It is actively released (five tagged releases from March to August 2026), has 20 contributors and an open issue tracker that gets used (issue 151 on autoyes reliability, fixed per the v1.0.17 changelog note about trust prompt handling). One governance detail worth watching, not treating as a problem yet: the project pairs AGPL-3.0 with a Contributor License Agreement that assigns contribution rights to the project, the same combination some projects have used before a later relicense to more restrictive or commercial terms. No such change has happened here as of 2026-09-29.

## 9. Sources

- https://github.com/smtg-ai/claude-squad (cloned shallow to a local clones directory, 2026-09-29)
- README.md, CONTRIBUTING.md, CLA.md, LICENSE.md, go.mod (repository root, read 2026-09-29)
- session/instance.go, session/git/worktree_git.go, session/git/worktree_ops.go, session/git/worktree_branch.go (read 2026-09-29)
- config/config.go, config/state.go, daemon/daemon.go, app/app.go (read 2026-09-29)
- web/ directory listing (confirmed Next.js marketing-site scaffold, not a product UI)
- GitHub API repo metadata for smtg-ai/claude-squad (2026-09-29)
- GitHub API releases list for smtg-ai/claude-squad (2026-09-29)
- GitHub API contributors list for smtg-ai/claude-squad (2026-09-29)
- https://smtg-ai.github.io/claude-squad/ (fetched via WebFetch, 2026-09-29)
- https://github.com/smtg-ai/claude-squad/issues/151 (2026-09-29)
- WebSearch "claude-squad smtg-ai review OR vs OR hacker news 2026" (2026-09-29)
- WebSearch "claude-squad smtg-ai security dangerously skip permissions OR yolo OR incident" (2026-09-29)
</content>
