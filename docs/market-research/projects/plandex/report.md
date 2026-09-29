---
name: Plandex
slug: plandex
url: https://plandex.ai
repo: https://github.com/plandex-ai/plandex
category: coding-harness
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted only now (Docker Compose, Postgres). Cloud offering shut down 2025-11-07
company: PlandexAI Inc, no public funding found, founder Danenania, no HQ found, founded 2023
maturity: 15.7k stars, 1178 forks, 66 open issues, first commit 2023-10-24, last code commit 2025-07-16, last repo commit 2025-10-03 (wind-down notice only), no release since v2.2.1
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 2
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 3
  reseedable_selfhost: 2
steal:
  - "Autonomy-level matrix (none/basic/plus/semi/full, in docs/docs/core-concepts/autonomy.md) bundles related booleans (auto-load-context, auto-apply, auto-exec, auto-debug, auto-commit) into named presets instead of one flag. Our supervisor concept could borrow the naming, not the mechanism."
  - "Auto-debug loop: a failed command re-enters the plan as a prompt (getOnApplyExecFail in app/cli/plan_exec/apply_exec.go) with the exit status and output, bounded by an attempt counter (AutoDebug tries). Same idea as our supervisor retries, worth comparing bound choices."
  - "Cumulative diff sandbox: changes are held as a separate pending layer and only written to the working tree on explicit or auto apply, with an atomic rollback path (lib.Rollback). Cheaper than a full sandbox for local single-user use, not a substitute for ours."
  - "Server ships its own embedded LiteLLM proxy (app/server/model/litellm.go, EnsureLiteLLM) as the single point of model routing. Independent confirmation that LiteLLM is the default choice for this job."
  - "Plan-level version control distinct from git (docs/docs/core-concepts/branches.md, version-control.md): every plan update is a revertible step, and branches let you compare two model runs on the same task. Not needed since our unit of work is already a Git branch and PR, but the compare-two-attempts-side-by-side UX is worth a look for the console."
differs:
  - "No sandbox at all: commands run with exec.Command(shell, -c, scriptPath) directly in the user's own working directory (app/cli/lib/apply.go), with only an optional systemd cgroup scope for resource cleanup on Linux (apply_cgroup_linux.go), no filesystem jail, no network restriction. Our whole worker plane exists to prevent exactly this."
  - "Single-user, single-machine trust model: whoever runs the CLI holds the provider API key in an env var and can approve any auto-mode. There is no separate identity for the agent, no capability policy layer, and RBAC (app/server/db/rbac_helpers.go) is only org owner/member for a human team, not agent permissions."
  - "No budget or spend cap anywhere in the code (checked db/data_models.go, db/models.go): cost is left entirely to the user watching their model provider's own dashboard."
ux_verdict: A capable single-developer terminal tool (REPL, chat then tell mode, streaming TUI) that is easy to start (curl install, one env var, plandex in a project dir) but has no team-facing console, no web UI, and depends on a user actively present at a terminal.
slop_verdict: Real and was used in anger (15.7k stars, a genuine architecture, 50 migrations over two years), but now dormant. The company behind it wound the hosted product down in late 2025, plandex.ai and docs.plandex.ai no longer resolve (checked 2026-09-29), the last feature commit is from 2025-07-16, and issues keep arriving in 2026 with no maintainer response.
---

# Plandex

## 1. What it is

Plandex is a terminal-based, open source AI coding agent built by PlandexAI Inc (Go, MIT licence, first commit 2023-10-24). It targets large, multi-file coding tasks rather than quick single-file edits: a "plan" holds a multi-step task, builds a project map with tree-sitter, loads only the context a step needs, and applies changes as a batch the user can review, roll back, or auto-apply.

The README claims a "2M token effective context window," support for 30+ languages via tree-sitter, and full autonomy with automatic debugging of failed commands. The repository backs this up: real tree-sitter integration (app/server/syntax), a real diff-and-apply pipeline (app/cli/lib/apply.go), and 50 SQL migrations (app/server/migrations) spanning December 2023 to July 2025 show sustained, non-trivial engineering, not a thin wrapper.

What the docs do not show is any hosted future. The README's own hosting table says: "Plandex Cloud: Winding down as of 10/3/2025 and no longer accepting new users." As of this report (2026-09-29), plandex.ai and docs.plandex.ai fail to resolve at all (getaddrinfo EAI_AGAIN), which a third-party review (dev.to, "Plandex v2 review 2026") also reports. That review states the founder moved to an engineering role at Promptfoo, not verified here, the primary blog post could not be fetched.

## 2. Mapping to our five planes

| Plane / principle | What Plandex does | What we do | Verdict |
|---|---|---|---|
| Signals | None. A human types a task into the REPL or CLI. No issue, webhook or telemetry intake. | Forgejo issues, alert webhooks, intake API | we lead |
| Control plane | A Postgres-backed server tracks plans, orgs, users, convo state (app/server/db). No workflow engine, no scheduler, no approval gate beyond the CLI user's own choices. | factoryd with a Temporal workflow per task, budgets, approvals, audit | we lead |
| Worker plane | Commands run directly on the user's machine via sh -c, in the project directory, with the user's own environment and file access. Optional systemd cgroup for cleanup only. | gVisor pod per task, read-only root FS, default-deny egress | we lead |
| Verification | Auto-debug re-runs failed commands and feeds output back to the model up to a configured retry count. No CI, no independent review step, no policy gate. | Forgejo Actions, policy gates, stronger-model review | we lead |
| Merge and deploy | auto-commit can commit applied changes to the user's local git repo. No PR, no merge gate, no deploy. | Bot-merge after approval or auto-rule, Flux deploy | we lead |
| Policy outside the model | None found. Autonomy level is a user-set config value the agent itself can be told to raise ("Debug in full auto mode" in apply_exec.go lets a failed run flip the plan to full auto). | Capability rules in Git, enforced in gateway and network policy | we lead |
| Identity per task | None. One long-lived provider API key per user, held in RAM for the CLI or server process (docs/docs/security.md). Org RBAC is owner/member for humans only. | Per-task projected ServiceAccount token, per-task virtual model key | we lead |
| Artifacts not chat | Partial. A "plan" is a structured, versioned sequence of steps with its own diff/rollback state, closer to an artifact than a chat log, but it lives outside git until applied. | TaskBrief in, branch and PR out | not comparable (different unit of work: local plan vs. cross-agent handoff) |

## 3. Architecture and stack

Go monorepo under app/: cli (plandex-cli module, Cobra commands, a custom REPL with fuzzy autocomplete via plandex-ai/go-prompt, a Bubble Tea-style stream TUI in app/cli/stream_tui), server (plandex-server module, Gorilla Mux routes in app/server/routes/routes.go, Postgres access via sqlx in app/server/db), and shared (types and schema shared by both, app/shared). Local self-hosting is one docker-compose.yml (app/docker-compose.yml): a postgres:latest container and a plandexai/plandex-server container exposing ports 8099 (API) and 4000 (the server's embedded LiteLLM proxy). The server starts LiteLLM itself as a subprocess (app/server/model/litellm.go, EnsureLiteLLM) and routes every model call through it. Command execution and file edits happen as plain OS operations on the user's own machine (os/exec, os.WriteFile), not in any container or VM, even for the self-hosted server, which acts purely as a plan-state and model-proxy backend; the actual file edits and command execution happen client-side in the CLI.

Context loading uses tree-sitter (app/server/syntax) to build a project map without loading full file contents, and falls back to full files when tree-sitter has no grammar for a language. Diffs are computed and staged server-side (app/server/diff) before the CLI applies them locally.

## 4. UX

Zero to first result: curl -sL https://plandex.ai/install.sh | bash, export one provider key (OPENROUTER_API_KEY or another provider's), cd into a project, run plandex. That is four steps, all in a terminal, no sign-up (self-hosted) or a Plandex Cloud account (defunct). The REPL opens in chat mode for exploring a task, then switches to tell mode to generate and run a plan; a streaming TUI (app/cli/stream_tui) shows model output as it arrives.

Intervention happens through the five-level autonomy dial (none, basic, plus, semi, full, docs/docs/core-concepts/autonomy.md), set per plan or globally, which independently controls context auto-loading, auto-build, auto-apply, auto-exec and auto-debug. A user can also run a plan in the background (plandex tell --bg), list background plans (plandex ps), and reattach (plandex connect). There is no web UI or dashboard at all, even when the (now-defunct) cloud existed the surface was still the CLI. Compared with our console, Plandex is easier to start alone at a terminal but has nothing for a team to watch shared work, no kanban, no mobile view, and no way to approve someone else's running task, since there is no multi-user task queue, only org/billing RBAC for a shared server.

## 5. Security, identity, sandbox, policy, cost

Security is limited to two things per docs/docs/security.md: respecting .gitignore/.plandexignore when loading context, and keeping provider API keys "ephemerally in RAM" on the server, never written to disk or logged. Everything else, a spend cap, a permission boundary, a network restriction, is absent from the docs and the code.

Identity is a single long-lived provider API key set as an environment variable by the person running the CLI (app/cli/auth/api.go sends it as a bearer token to the Plandex server, which forwards it to the provider through LiteLLM). There is no task-scoped or short-lived credential anywhere; org RBAC (app/server/db/rbac_helpers.go) governs which humans can administer a shared server, not what an agent may do.

Sandboxing does not exist. app/cli/lib/apply.go runs the generated _apply.sh script with the user's real shell, in the real project directory, with the user's real environment (execCmd.Env = os.Environ()), and the only isolation attempted is an optional Linux-only systemd transient cgroup scope (apply_cgroup_linux.go) for process cleanup, not confinement; there is no such isolation at all on macOS or Windows (apply_cgroup_other.go is a no-op). An agent in full-auto mode can read, write, and execute anything the user could.

Cost control was not found anywhere in the schema (app/server/db/data_models.go, models.go) or the routes. There is no hold, cap, or ledger; the closest field is reasoning_budget, which is a per-model reasoning-token setting, not a spend limit.

## 6. What we should take from it

Narrow: the auto-debug retry pattern (feed failing command output back into the same plan, bounded by an attempt count) is close to our own supervisor retries and is a useful second data point on where to set the bound. The autonomy-level naming (none/basic/plus/semi/full as named presets of several booleans) is a clean UX pattern for exposing a dial without a wall of individual flags; we could reuse the naming convention for how the console exposes supervision aggressiveness per project.

Broad: nothing here changes our product shape. Plandex solves a problem we deliberately do not have (a single developer working interactively at a terminal on one big local change) and skips every problem we exist to solve (multi-tenant trust, sandboxing, budgets, audit). The cumulative diff sandbox (hold changes as a staged layer before writing them to disk) is a UX idea worth a glance for our own diff review in the console, but it solves local review, not our verification plane.

## 7. Where our philosophy differs and what that costs or buys us

Plandex's entire security model rests on one assumption we explicitly reject: that the person running the agent and the person who owns the credentials and the filesystem are the same trusted individual. That collapses identity-per-task, policy-outside-the-model and sandbox-isolation into "whatever the user's shell can already do." It costs Plandex nothing in its target use case (a solo developer, already trusted with their own machine) and buys them a much smaller amount of infrastructure: no Kubernetes, no Temporal, no gateway, just a CLI and an optional shared Postgres server. Adopting that model would violate our security constraint outright the moment a task comes from an untrusted issue reporter rather than the machine's owner, so this is not a place where copying them is even on the table.

## 8. Red flags and slop assessment

The company's hosted product is gone: the README and quickstart both state Plandex Cloud "wound down as of 10/3/2025," and both plandex.ai and docs.plandex.ai fail to resolve as of 2026-09-29 (checked directly, getaddrinfo EAI_AGAIN on both). GitHub commit history shows the last feature commit on 2025-07-16 (version bump to 2.2.1) and the only commits after that, on 2025-10-03, are the wind-down notice itself. Open issues keep arriving into September 2026 (for example #372 and #371, updated 2026-09-27/28) with no visible maintainer response in that window, which is unaddressed-issue drift, a classic abandonment signal, not active maintenance. No licence games were found: MIT throughout, copyright held by "PlandexAI Inc." No security incidents surfaced in search. The project is real and was clearly used (15.7k stars, 1178 forks, a genuine two-year commit history with 50 migrations) but is not a going concern today.

## 9. Sources

- https://github.com/plandex-ai/plandex (cloned shallow, 2026-09-29)
- gh api repos/plandex-ai/plandex (stars, licence, dates, open issues, 2026-09-29)
- gh api repos/plandex-ai/plandex/commits (2026-09-29)
- gh api repos/plandex-ai/plandex/issues (2026-09-29)
- README.md
- LICENSE
- app/docker-compose.yml
- app/server/go.mod, app/cli/go.mod
- app/cli/plan_exec/apply_exec.go
- app/cli/lib/apply.go
- app/cli/lib/apply_cgroup_linux.go, app/cli/lib/apply_cgroup_other.go
- app/cli/lib/model_credentials.go
- app/cli/auth/api.go
- app/server/model/litellm.go
- app/server/db/rbac_helpers.go, data_models.go, models.go
- app/server/routes/routes.go
- app/server/migrations/ (directory listing, 50 files 2023-12 to 2025-07)
- docs/docs/security.md
- docs/docs/quick-start.md
- docs/docs/core-concepts/autonomy.md
- docs/docs/core-concepts/branches.md
- docs/docs/core-concepts/background-tasks.md
- https://plandex.ai (DNS failure, 2026-09-29)
- https://docs.plandex.ai (DNS failure, 2026-09-29)
- WebSearch "Plandex AI coding agent review vs 2025 winding down funding" (2026-09-29), including https://dev.to/jovan_chan_9500711396d4e6/plandex-v2-review-2026-cloud-shut-down-self-hosted-survives-is-the-terminal-agent-still-worth-11pp and https://theaiagentindex.com/agents/plandex
