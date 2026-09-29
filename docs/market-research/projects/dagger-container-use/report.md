---
name: Dagger and container-use
slug: dagger-container-use
url: https://dagger.io
repo: https://github.com/dagger/container-use
category: ci-build
license: "mixed: Apache-2.0 (container-use and the Dagger engine), proprietary (Dagger Cloud observability add-on)"
open_source: yes
self_hostable: yes
hosting_model: single Go binary plus a local container runtime (Docker); no server component; optional proprietary Dagger Cloud SaaS for pipeline tracing, not required
company: Dagger, Inc., San Francisco, founded 2018 by Solomon Hykes (Docker co-founder and ex-CTO), Sam Alba and Andrea Luzzardi, about 30M USD raised (20M Series A March 2022, Redpoint Ventures), no reported round since
maturity: container-use has 4048 GitHub stars, 206 forks, 33 contributors, 62 open issues, created 2025-05-23, last commit to main 2026-08-12 (48 days before this report), latest tagged release v0.4.2 on 2025-08-19 with no newer tag despite continued main commits; parent Dagger engine repo has 16308 stars and dates to 2019
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 0
  identity_per_task: 1
  cost_control: 0
  ux: 3
  reseedable_selfhost: 2
steal:
  - "Secret redaction pattern: secrets are configured as references (op://, env://, vault://, file://), resolved to real values only inside the container via Dagger's own dagger.Secret type, and stripped from command output and logs. The agent's model never sees a raw credential even though the code it runs can use one. Worth copying into how factory-gateway hands MCP tool output back to the model, wherever a tool result could echo a secret."
  - "Non-interactive review before checkout: container-use list/log/diff let a human see what an agent did (files, exit codes, stdout/stderr per command) without checking out the branch or opening a shell. This is exactly the diff view and real-time work stream our own vision document names as missing from the console; the CLI shape (list of environments, per-environment structured log, diff) is a concrete, small target to copy."
  - "One environment equals one git branch plus one container, with the environment's JSON state and command history stored as git notes on a container-use/<id> ref (repository/repository.go, environment/state.go, environment/note.go). No separate database row is needed to track a worker's identity or history; git already carries it. This matches our own 'artifacts not chat' principle almost exactly and shows it is implementable with plain git plumbing (worktrees, notes, refs) rather than custom infrastructure."
  - "container-use terminal drops a human directly into the live container an agent is working in, for the case log and diff are not enough. A cheap, literal answer to 'how does a user intervene' that our console does not yet offer at all."
  - "Config layering: a committed .container-use/environment.json holds the project's default base image, setup and install commands, env vars and secrets; agents can adapt their own environment's config during a session, and a human explicitly promotes useful changes with config import. A clean default-versus-session-override split we could reuse for per-project worker image customisation."
  - "It ships as a plain stdio MCP server (mcpserver/tools.go, using github.com/mark3labs/mcp-go), so it attaches to any MCP-compatible harness including opencode, our own harness today, with one config line and zero code on the harness side. Confirms that betting on a harness-agnostic interface, as our Harness abstraction does, is the right layer to standardise on."
differs:
  - "container-use has no control plane at all: no task queue, no scheduler, no multi-tenant identity, no audit trail, no budget. It assumes one human driving one laptop's Docker daemon for one or a few agents at a time. Copying its model wholesale would mean giving up the entire reason our control plane exists (durable state, policy, unattended operation across many tasks and projects); it solves a narrower problem, local multi-agent git hygiene for one developer, not a fleet-scale factory."
  - "Isolation is a plain container from Dagger's BuildKit-based engine (runc-level namespaces and cgroups), not a hardened sandbox, and nothing in environment.go, config.go or the MCP tool surface sets up a default-deny network policy: a container can reach the internet unless the base image or the surrounding network happens to block it. Our default-deny egress and gVisor pod are the more expensive, deliberately stronger answer to the same worker-isolation problem; matching container-use's isolation level would be a regression against our own security-without-half-measures constraint."
ux_verdict: onboarding is one CLI install plus one MCP-server line per repository, then the agent is told to use it via a rules file; from there container-use list/log/diff/terminal give more granular, cheaper-to-check observability into what an agent did than our console currently offers, but it is a single-developer CLI with no web view, no kanban, no approval workflow and no cost or audit view.
slop_verdict: real and used in anger (33 contributors, its own git-history path-traversal bug fixed via a PR co-authored by an AI agent, listed in independent MCP-tool directories and 2026 agent-sandbox roundups), but still labelled "early development" 16 months after its June 2025 launch, no tagged release since August 2025 despite commits continuing on main into August 2026, and 20 open feature/dependabot branches against a main branch that has not moved in 48 days as of this report.
---

# Dagger and container-use

## 1. What it is

Dagger, Inc. is a San Francisco company founded by ex-Docker people (Solomon Hykes, Sam Alba, Andrea Luzzardi) that sells Dagger, an "automation engine to build, test and ship any codebase" where pipelines are written as typed code (Go, TypeScript, Python) and run identically on a laptop or in CI, backed by a BuildKit-derived container engine. The open core is Apache-2.0; the company's revenue comes from Dagger Cloud, a paid pipeline-visualisation and caching SaaS layered on top (free for individuals, a flat monthly rate for teams, custom for enterprise, per dagger.io/blog/new-dagger-cloud-pricing). `container-use` is a separate, smaller open-source tool from the same GitHub organisation, aimed specifically at coding agents rather than CI pipelines.

`container-use` is a Go CLI and MCP server that gives each coding-agent session a fresh Dagger container tied to its own git branch (`container-use/<env-id>`), so several agents (or several attempts by the same agent) can work on one repository in parallel without stepping on the user's working tree or each other. The README's claims (isolation, real-time visibility, direct intervention, standard git review) hold up against the code: the isolation is a real container and a real branch (`environment/environment.go`, `repository/repository.go`), the visibility is a structured command log stored in git notes (`environment/note.go`, `environment/state.go`), and intervention is a literal `container-use terminal` into the live container. The repository itself still carries an "experimental" stability badge and an "early development" banner.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work starts only from a human's prompt to an agent already running in a chat harness | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | None. No task registry, scheduler, approvals or audit trail; state is per-environment JSON plus command notes in git | factoryd with a Temporal workflow per task, Postgres, policy in Git | we lead |
| Worker plane | One disposable Dagger container per environment, on its own git branch, reusing the project's preferred stack via a configurable base image | One gVisor pod and namespace per task, default-deny egress, read-only root FS | they lead on stack flexibility and local UX, we lead on isolation strength |
| Verification | None. A human reviews `container-use diff`/`log` and decides merge, apply, iterate or delete; no CI, no gates, no model review | Forgejo Actions, policy gates, stronger-model review before merge | we lead |
| Merge and deploy | `container-use merge` (fast-forward, keeps agent commits) or `apply` (squash to a human commit); no deploy story | Bot-merged PR after approval or auto-rule, Flux GitOps deploy, staged rollout | not comparable |
| Policy outside the model | None as a system. The only "policy" is a markdown rules file injected into the agent's own prompt (`rules/agent.md`) plus whatever tool allowlist the harness itself enforces | Capability rules as a Git-versioned document, enforced in gateway code and network policy | we lead |
| Identity per task | Project-wide configured secrets resolved inside the container and redacted from logs; no per-task minting, scoping or expiry | Projected, audience-scoped ServiceAccount token per task, verified by factory-gateway | we lead, their log-redaction trick is still worth taking |
| Artifacts, not chat | Yes, closely: one environment is one git branch plus git notes holding state and command history; review happens through `git checkout`/`diff` | TaskBrief in, branch and PR and event stream out | equal in spirit, ours carries more workflow state |

## 3. Architecture and stack

Go module `github.com/dagger/container-use` (go.mod, requiring `dagger.io/dagger v0.21.8`, `github.com/mark3labs/mcp-go`, `spf13/cobra`, `charmbracelet/bubbletea`/`lipgloss`/`huh` for the terminal UI bits). Top-level layout: `cmd/container-use` (CLI entry), `mcpserver/` (the MCP tool surface, `tools.go`, ~1050 lines), `environment/` (container lifecycle: `environment.go`, `config.go`, `state.go`, `note.go`, `service.go`), `repository/` (git plumbing: `git.go`, `repository.go`, `flock.go` for a file lock so concurrent CLI invocations do not race the same worktree), `docs/` (Mintlify `.mdx` site source), `rules/agent.md` (the prompt injected into the coding agent), `.dagger/` (the project's own Dagger build module, `main.go`, showing the same containerised-pipeline pattern Dagger sells: a `golang:1.26` build container with mounted Go module and build caches).

An environment is built by `environment.buildBase`: start `FROM <base-image>` (default `ubuntu:24.04`), set env vars and secrets (`containerWithEnvAndSecrets`, secrets passed as `dagger.Secret` references so raw values never enter the code path the agent inspects), run configured setup commands, start any configured services, copy in the source directory, run install commands. The resulting container's content-addressed ID is stored as the environment's `State.Container`, marshalled to JSON and attached as a git note on the environment's branch; every command run through `environment.Run` or `RunBackground` appends to that note. Fifteen MCP tools are exposed (`environment_open`, `_create`, `_update_metadata`, `_config`, `_list`, `_run_cmd`, `_file_read/list/edit/write/delete`, `_checkpoint`, `_add_service`, `_log`, `_diff`), all wired through `mark3labs/mcp-go`'s stdio transport, so any MCP-capable harness gets the same tool surface. Underneath, `dagger.io/dagger` talks to a local Dagger engine, which needs a container runtime (Docker, or another OCI-compatible engine); there is no hosted execution, no queue and no server process beyond the CLI itself.

## 4. UX

Zero to first result is three steps: install the `container-use` binary (Homebrew or a shell script), run `container-use stdio` once as an MCP server for the target repository (one line, `claude mcp add container-use -- container-use stdio` for Claude Code, or the equivalent for Cursor, VS Code, Goose, opencode, Gemini CLI, Amazon Q, Windsurf, Zed, Sourcegraph Amp, Cline, Qodo, Kilo Code, Kiro, Codex, Warp or JetBrains Junie per `docs/agent-integrations.mdx`), then prompt the agent normally. The agent creates its own environment on first use; the user is not asked to configure a container up front.

Watching and intervening happens entirely through the CLI: `container-use list` shows running environments, `watch` streams activity, `log <id>` gives the exact command/exit-code/stdout/stderr history, `diff <id>` shows code changes without checking anything out, and `terminal <id>` drops into the live container for hands-on debugging. Accepting work is `merge` (keep agent commits) or `apply` (squash into the user's own commit); rejecting is `delete`. There is no web UI, no notification of a stuck agent, and no cost or approval view; the whole experience is single-developer, single-machine, synchronous with a chat session.

## 5. Security, identity, sandbox, policy, cost

Sandbox: each environment is a Dagger-managed container built from a configurable base image, on its own git worktree/branch. This is standard container isolation (namespaces, cgroups via the underlying container runtime), not a stronger sandbox; nothing in the source sets network policy, so egress is whatever the base image and host network allow. Identity: there is no credential-issuance system; the only credential handling is project-wide secret references (`op://`, `env://`, `vault://`, `file://`) resolved to real values only inside the container and stripped from any output the agent or log can see (`docs/secrets.mdx`). Policy: none is enforced by the tool itself; the closest thing is `rules/agent.md`, a markdown instruction file injected into the agent's own prompt telling it to always use environments, which is policy inside the model, the opposite of our principle. Cost: absent entirely; the tool has no concept of spend, budget or ledger, cost is whatever the user's own model subscription costs.

## 6. What we should take from it

Narrow: the secret-reference-and-redaction pattern (`docs/secrets.mdx`, `containerWithEnvAndSecrets` in `environment/environment.go`) is a small, concrete mechanism for keeping raw credential values out of anything an agent or a stronger-model reviewer can read, directly applicable to how factory-gateway shapes MCP tool results. The `list`/`log`/`diff` triage sequence before a human ever checks anything out is a cheap UX pattern our console's missing diff view could copy almost verbatim. Storing an environment's state and command history as git notes on a dedicated branch, rather than a database row, is a reminder that some of our own per-task bookkeeping might not need a table at all.

Broad: the whole tool is a proof that a harness-agnostic MCP surface for "run this agent in a disposable container tied to a git branch" is buildable in a few thousand lines of Go and adopted by essentially every popular coding harness in under a year, which supports our own bet on a Go `Harness` interface rather than one bespoke integration per agent. Its `terminal` command names a real gap in our console (no way to drop into a running task's exact state) worth prioritising even in a minimal form.

## 7. Where our philosophy differs and what that costs or buys us

container-use trades isolation strength and unattended operation for local simplicity: it needs no cluster, no control plane and no policy engine because it assumes a human is at the keyboard driving one Docker daemon. Adopting its container-per-branch model as our worker plane's isolation primitive would break our security-without-half-measures constraint, since it has no default-deny network policy and no stronger-than-runc isolation; our gVisor pod and Cilium network policy are the deliberately more expensive answer to the same problem, and that expense is the price of running fully unattended with a wider trust boundary (public issues, not just a local developer's own prompts). Conversely, its total absence of a control plane is not a gap we would copy, it is simply a different product shape for a different user (one developer, not a factory), so this is not a place where their approach is better and our constraint is the cost; it is a place where we are solving a harder problem by design.

## 8. Red flags and slop assessment

The clearest concrete signal is a real one: commit `2e43e62` (PR #365, based on issue #337) fixed a path-traversal bug in `exportEnvironmentFile` that let a resolved file path escape the worktree root, the kind of bug that matters precisely because this tool's whole value proposition is a filesystem boundary between agent and host; it is fixed, but its existence shows the isolation boundary has been user-maintained application code, not a hardened kernel-level primitive. Maintenance-wise, main last moved on 2026-08-12 (48 days before this report) against 20 open feature and dependabot branches, and the last tagged release is v0.4.2 from 2025-08-19, over a year before this report despite continued main-branch commits, so whatever ships to Homebrew users past that tag is untagged. The project has never dropped its "early development"/"experimental" badge in the 16 months since its June 2025 Hacker News launch. No independent, hands-on 2026 review was found; coverage is limited to Dagger's own blog, directory listings (Augment Code's MCP directory, a May 2026 sandbox-comparison gist) and the README itself. None of this points to abandonment, Dagger the company is clearly still active and well-funded, but container-use reads as a community-maintained side tool next to Dagger's paid Cloud product, not a hardened piece of infrastructure.

## 9. Sources

- /home/womb/repos/market-research-clones/dagger-container-use/README.md
- /home/womb/repos/market-research-clones/dagger-container-use/CONTRIBUTING.md
- /home/womb/repos/market-research-clones/dagger-container-use/go.mod
- /home/womb/repos/market-research-clones/dagger-container-use/docs/introduction.mdx
- /home/womb/repos/market-research-clones/dagger-container-use/docs/quickstart.mdx
- /home/womb/repos/market-research-clones/dagger-container-use/docs/environment-workflow.mdx
- /home/womb/repos/market-research-clones/dagger-container-use/docs/environment-configuration.mdx
- /home/womb/repos/market-research-clones/dagger-container-use/docs/secrets.mdx
- /home/womb/repos/market-research-clones/dagger-container-use/docs/agent-integrations.mdx
- /home/womb/repos/market-research-clones/dagger-container-use/docs/cli-reference.mdx
- /home/womb/repos/market-research-clones/dagger-container-use/environment/environment.go
- /home/womb/repos/market-research-clones/dagger-container-use/environment/config.go
- /home/womb/repos/market-research-clones/dagger-container-use/environment/state.go
- /home/womb/repos/market-research-clones/dagger-container-use/environment/note.go
- /home/womb/repos/market-research-clones/dagger-container-use/mcpserver/tools.go
- /home/womb/repos/market-research-clones/dagger-container-use/repository/git.go
- /home/womb/repos/market-research-clones/dagger-container-use/repository/repository.go
- /home/womb/repos/market-research-clones/dagger-container-use/rules/agent.md
- /home/womb/repos/market-research-clones/dagger-container-use/.dagger/main.go
- https://container-use.com (fetched 2026-09-29)
- https://dagger.io/blog/agent-container-use/ (via search, 2026-09-29)
- https://dagger.io/blog/new-dagger-cloud-pricing/ (via search, 2026-09-29)
- https://news.ycombinator.com/item?id=44193933 (Show HN launch thread, referenced 2026-09-29)
- gh api repos/dagger/container-use (stars, forks, issues, license, dates, fetched 2026-09-29)
- gh api repos/dagger/container-use/contributors (fetched 2026-09-29)
- gh api repos/dagger/container-use/releases (fetched 2026-09-29)
- gh api repos/dagger/container-use/branches (fetched 2026-09-29)
- gh api repos/dagger/container-use/commits/main and /2e43e62 (fetched 2026-09-29)
- gh api repos/dagger/dagger (fetched 2026-09-29)
- gh api repos/dagger/container-use/security-advisories (empty, fetched 2026-09-29)
- WebSearch: "Dagger.io company funding Solomon Hykes headquarters founded" (2026-09-29)
- WebSearch: "container-use dagger review agent sandbox 2026" (2026-09-29)
- WebSearch: "container-use dagger maintained abandoned stale 2026" (2026-09-29)
- WebSearch: "Dagger Cloud pricing tiers 2026" (2026-09-29)
