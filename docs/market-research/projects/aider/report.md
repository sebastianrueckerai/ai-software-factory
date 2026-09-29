---
name: Aider
slug: aider
url: https://aider.chat
repo: https://github.com/Aider-AI/aider
category: coding-harness
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: local CLI, pip or Docker install, runs on the developer's own machine and calls out to cloud or local LLMs
company: Aider AI LLC, solo founder Paul Gauthier, no disclosed funding round or HQ
maturity: 49,270 stars, 5,016 forks, 172 contributors, 1,390 open issues, 512 open PRs, first commit 2023-05-09, last GitHub tagged release v0.86.0 on 2025-08-09, latest PyPI patch 0.86.2 on 2026-02-12, last commit in the clone 2026-05-22
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 2
steal:
  - The repo map: tree-sitter tag extraction (grep_ast, aider/repomap.py) ranked with networkx PageRank and cached with diskcache, a dependency-light way to give an agent codebase context without embeddings. Directly answers the "no codebase index" gap in our own vision.
  - litellm's model_cost metadata table, already used in aider/models.py for per-call and per-session cost display, is a ready-made $/token and context-window source factory-gateway could read from instead of hand-maintaining one.
  - The ConfirmGroup pattern in aider/coders/base_coder.py: ask once per class of repeated risky action ("run shell commands? (yes/no/always/never this session)") rather than once per action, a cheap approval-batching idea for the console.
  - An exact per-turn cost line printed after every model reply, not an estimate, worth matching in granularity in our own cost view.
differs:
  - No sandbox anywhere. aider/run_cmd.py runs suggested shell commands with subprocess.Popen(shell=True) directly on the host, gated only by a confirm_ask prompt the user can switch off globally with --yes-always. Fine for a human running their own machine, disqualifying for an unattended worker under our default-deny egress rule.
  - No durable task state. A session lives in process memory and the git log; nothing survives a crash beyond commits already made, and there is no resumable workflow or audit trail. Matching aider's simplicity here means giving up the recoverability our Temporal-backed control plane exists for.
  - The user's own long-lived provider API key is passed straight to the process that edits files (flag, env var or ~/.aider.conf.yml), and PostHog/Mixpanel telemetry is on by default. Both are the opposite of "identity belongs to the task" and "policy lives outside the model."
ux_verdict: Three commands from zero to a first edit, a visible diff and an exact cost line after every turn, but everything happens in one terminal with one human watching one session, nothing like our queued, parallel, kanban model.
slop_verdict: Real and heavily used (7M+ pip installs, 15B tokens/week claimed) but strained. One maintainer, 512 open PRs, no tagged GitHub release since August 2025, and a community fork (aider-ce, now cecli) formed in late 2025 specifically because upstream stopped merging.
---

# Aider

## 1. What it is

Aider is a terminal based AI pair-programming tool created by Paul Gauthier and first released in 2023, distributed under Apache-2.0 via PyPI (`aider-chat`) and an official Docker image. One developer runs it in a repository, types requests in a REPL, and aider edits files on disk and auto-commits each change to git with a generated message.

The README claims cloud and local LLM support, a codebase map for large projects, 100+ languages, voice input, image and web page context, IDE integration through file-watched comments, and a lint/test auto-fix loop, plus a "Singularity" badge claiming 88% of the last release's new code was written by aider itself. The repository backs most of this: `aider/coders` holds around fifteen edit-format implementations and `aider/repomap.py` is a genuine tree-sitter-based codebase index, not a slogan. What the badges and 30-plus testimonial wall do not show is the current pace of change: commit and release activity have visibly slowed since mid-2025 (see section 8), so "actively developed" is now the weaker of the two claims.

## 2. Mapping to our five planes

Aider has no equivalent of four of our five planes. It is a single interactive session, not a loop.

| Plane / principle | What Aider does | What we do | Verdict |
|---|---|---|---|
| Signals | None, a human types the request | Forgejo webhooks, SigNoz alerts, factoryd intake | we lead |
| Control plane | None, session state lives in process memory and `.aider.chat.history.md` | factoryd, Temporal, Postgres | we lead |
| Worker plane | One unsandboxed process on the user's own machine, full filesystem and shell access | One gVisor pod per task, read-only root, default-deny egress | we lead |
| Verification | Optional local `--lint`/`--test` hooks that ask to auto-fix; no CI, no independent review | Forgejo Actions, policy gates, stronger-model review | we lead |
| Merge and deploy | Auto-commits to local git; the human pushes and opens a PR by hand | Bot merge after approval or auto-rule, Flux GitOps deploy | we lead |
| Policy outside the model | `confirm_ask` prompts before shell exec, new files, or auto-fix, all client-side UX and disabled in one shot by `--yes-always` | Capability YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | The user's own long-lived provider key, held by the editing process itself | Projected per-task ServiceAccount token, per-task LiteLLM virtual key | we lead |
| Artifacts not chat | The opposite premise: a live, turn-by-turn chat with a human present throughout | `TaskBrief` in, branch/PR/event stream out, no human in the loop per turn | not comparable |

## 3. Architecture and stack

Python 3.10 to 3.14 only (`pyproject.toml`). Key runtime dependencies from `requirements/requirements.in`: `litellm` for all model calls and provider routing, `GitPython` for git integration (`aider/repo.py`'s `GitRepo` class handles auto-commit, dirty-file detection and diffs), `grep_ast` plus `tree_sitter` plus `networkx` for the repo map (`aider/repomap.py`: tag extraction per file, `nx.MultiDiGraph`, `nx.pagerank` to rank definitions, results cached on disk with `diskcache`, cache version bumped when the tag schema changes), `configargparse` and `prompt_toolkit` and `rich` for the CLI and REPL (`aider/io.py`, `aider/args.py`, on the order of 150 flags), `pexpect`/`subprocess` for shell command execution (`aider/run_cmd.py`, `shell=True`, no isolation), `posthog` and `mixpanel` for analytics (`aider/analytics.py`, hardcoded project keys, writes `~/.aider/analytics.json`), `sounddevice`/`soundfile` for voice (`aider/voice.py`), and `beautifulsoup4`/`pypandoc` for pulling URLs into context (`aider/scrape.py`).

There is no queue, no workflow engine and no server. Distribution is a pip entry point (`aider = aider.main:main`) plus `docker/Dockerfile` (`python:3.12-slim-bookworm`, non-root UID 1000) for convenience, not as a security boundary. `aider/coders/base_coder.py` runs the turn loop; per-edit-format subclasses (`editblock_coder.py`, `wholefile_coder.py`, `udiff_coder.py`, `patch_coder.py`, plus `architect_coder.py` for a plan-then-edit mode) parse the model's reply and write straight to working-tree files, after which `GitRepo.commit()` auto-commits.

## 4. UX

`pip install aider-install && aider-install`, `cd` into a repository, `aider --model <name> --api-key <provider>=<key>` -- three commands to a first edit, no account, no web signup. The REPL prints the diff of each change as it lands and an exact token and dollar cost line after every reply, computed from litellm's model metadata. A user intervenes by typing more instructions, by `/undo` (a git revert of aider's last commit), or by answering yes/no/always/never at `confirm_ask` prompts for shell commands, new files and lint/test auto-fixes; `--yes-always` turns all of these off at once. "Watch mode" lets a developer drop `# ai: ...` style comments in source files in their own editor and aider acts on them at save time. There is no board, no queue and no parallel-session view; it is built for one human watching one session, the opposite of our kanban console, but it gets to a first result far faster for that single-session case.

## 5. Security, identity, sandbox, policy, cost

Sandbox: none. `run_cmd.py` executes suggested shell commands with `subprocess.Popen(..., shell=True)` directly on the host. The only gate is a `confirm_ask` prompt, switched off entirely by one flag, and there is no network egress control or filesystem jail; the Docker image is a convenience packaging, not an isolation mechanism.

Identity: the user's own long-lived provider API key, passed by flag, environment variable, or `~/.aider.conf.yml`, held by the same process that edits files. No scoping, no rotation, no per-task binding.

Policy: entirely client-side convention. Every `confirm_ask` call is a UX habit, not an enforced control, and nothing stops a user or a wrapper script from setting `--yes-always` and removing every gate at once.

Cost: displayed, not controlled. `aider/models.py` computes per-call and cumulative cost from litellm's `model_cost` table and prints it after each turn, but there is no cap, no hold and no ledger beyond that printed number.

Telemetry: PostHog and Mixpanel project keys are hardcoded in `aider/analytics.py`. The tool asks once whether to enable analytics, stores the answer in `~/.aider/analytics.json`, and offers `--no-analytics` to disable it.

## 6. What we should take from it

Narrow: the repo map (tree-sitter plus PageRank plus disk cache) is a small, concrete answer to the codebase-index gap our own vision names as unfinished, worth prototyping against opencode or its successor. The litellm `model_cost` table is already the kind of source `factory-gateway`'s worst-case pricing should read from rather than hand-maintain. The `ConfirmGroup` "ask once for the rest of this session" pattern is a one-file idea for reducing approval fatigue in the console without weakening the policy itself.

Broad: aider is proof that a single, well-scoped interactive harness can reach genuine daily-driver adoption without any of our five planes, because its job is different: a human sits at every turn. It reinforces treating "harness" as a pluggable interface (our Go `Harness`) rather than something to build product UX around. Should any agent in our design use aider directly? No. Aider is built around an attended REPL that blocks on confirm prompts and a TTY; our worker plane needs a headless, unattended harness that never waits on a human mid-task, and aider's docs describe no such mode.

## 7. Where our philosophy differs and what that costs or buys us

Running with the full permissions of the inviting shell and no egress control is aider's whole design, not an oversight; it is what lets a solo developer point it at any project in seconds. Copying that would break our sandbox-everything, default-deny-egress constraint outright, so the gap stays.

Keeping all state in process memory and the git log gives aider its simplicity and its zero-infrastructure install. It also means a crash mid-session loses everything except commits already made. Our Temporal-backed control plane pays in infrastructure for exactly the recoverability aider does without.

Handing the editing process a raw, long-lived API key is the natural shape for a tool one person runs with their own keys. It is the wrong shape for a multi-tenant factory that must issue short-lived, task-scoped credentials, so nothing here transfers.

## 8. Red flags and slop assessment

Bus factor is the real finding. The last GitHub tagged release is v0.86.0 from 2025-08-09, over a year before today; the newest PyPI package is a patch, 0.86.2, from 2026-02-12; the clone's last commit is 2026-05-22, adding model list entries. 512 pull requests and 1,390 issues are open. A January 2026 GitHub issue asking about the project's future direction has no maintainer reply (per WebSearch, not independently re-verified against the live issue). Hacker News commenters describe the project as "in a sad state" with a maintainer who "does not maintain for quite some time." A community fork, first called Aider-CE and now cecli, formed in response and shipped three releases in the first half of September 2026, adding an agent mode, subagents and MCP support that upstream still lacks.

Against that: the project is not abandoned. It still installs and runs against current models, per WebSearch reporting it has roughly 7 million pip installs and a claimed 15 billion tokens processed weekly, and new issues are still being filed as recently as 2026-09-27. No licence changes were found (Apache-2.0 throughout the clone), no open-core gating (fully open source, no paid tier), and no security incidents surfaced in the time available. Treat the "last commit" and "maturity" fields as real but as the trailing edge of a project a single maintainer is only partially keeping up with, not as a sign of a healthy release cadence.

## 9. Sources

https://github.com/Aider-AI/aider, cloned --depth 1 to ~/repos/market-research-clones/aider, 2026-09-29
Files read: README.md, pyproject.toml, requirements/requirements.in, aider/repomap.py, aider/repo.py, aider/models.py, aider/analytics.py, aider/run_cmd.py, aider/io.py, aider/args.py, aider/coders/base_coder.py, aider/coders/ (directory listing), docker/Dockerfile
Last commit timestamp of the clone read via GIT_DIR/GIT_WORK_TREE (2026-05-22), 2026-09-29
GitHub repository metadata API for Aider-AI/aider (stars, forks, licence, dates), 2026-09-29
GitHub search API for open pull requests and open issues on Aider-AI/aider, 2026-09-29
GitHub contributors API for Aider-AI/aider, 2026-09-29
GitHub releases API for Aider-AI/aider, 2026-09-29
https://aider.chat/docs/faq.html, WebFetch, 2026-09-29
WebSearch: aider AI pair programming maintenance status 2026 Paul Gauthier, 2026-09-29
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
