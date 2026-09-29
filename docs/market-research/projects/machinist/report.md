---
name: Machinist
slug: machinist
url: https://machinist.sh
repo: https://github.com/owainlewis/machinist
category: factory-orchestrator
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, one local Go binary, no hosted or SaaS option
company: none, a solo project by Owain Lewis, a UK-based AI engineer and former Director of Engineering at Oracle Cloud Infrastructure, now running his own AI consultancy
maturity: 468 stars, 89 forks, 21 open issues, created 2026-07-16, last pushed 2026-09-28, effectively one maintainer (425 of roughly 448 contributions), near 500 merged pull requests in 2.5 months, 30 Go test files
similarity: 3
axes:
  signals_intake: 2
  control_plane: 3
  sandbox_isolation: 1
  verification: 2
  policy_outside_model: 4
  identity_per_task: 1
  cost_control: 1
  ux: 3
  reseedable_selfhost: 4
steal:
  - "the argv-template capability model: worker.toml holds a fixed argv array per executor, and the only substitution allowed is a single {{machinist.model}} placeholder that must be a whole standalone --flag=value token, never argv[0] and never a partial word (internal/config/config.go, validateCommand); untrusted prompt text only ever lands inside the piped stdin string, never in argv"
  - "the classify-then-merge example's merge gate (examples/workflows/risk_delivery/gate.py): a trusted, non-agent script re-derives every fact needed to merge (exact head SHA, mergeability, check rollups, unresolved review threads) straight from the GitHub API instead of trusting the agent's self-report, and only auto-approves a hard-coded narrow case (low risk, at most 10 markdown or text files, at most 200 changed lines, no renames or executables)"
  - "crash-safe state publication: write to a temp file, fsync, atomic rename, then fsync the containing directory (internal/runner/runner.go, writeResult/createDurableDirectory/syncDirectory), and a worker whose lease expires unexpectedly fails the run closed for manual reconciliation instead of silently handing it to another worker"
  - "hard-fail config migration with no legacy shim: loadConfigFile rejects removed or renamed keys (pipelines, shepherd, agents to commands) with a specific migration message baked into the error, rather than quietly accepting the old shape (internal/config/config.go)"
  - "a one-tick retry safeguard in the console: before letting a human retry an interrupted or cancelled job, the UI forces an explicit checkbox, 'I have verified the previous worker process has stopped' (internal/controlplane/web/src/task-detail.jsx), a cheap guard against double execution"
  - "uniform secret redaction and strict input allow-listing in the GitHub adapter: every logged or error string is passed through a token-redaction regex, and repository slugs, actors and labels are checked against regexes before they reach gh's argv, with no shell involved at all (internal/controlplane/github_cli.go)"
differs:
  - "sandbox_isolation is the core difference: Machinist's runner is a plain exec.Command with only Setpgid for process-group kill (internal/runner/process_unix.go), and SECURITY.md says outright that commands run 'with the operating-system permissions, tools, environment, and credentials of the worker host user'; the one sandboxed pattern (examples/workflows/gvisor-pr, Docker plus gVisor) is an opt-in example, not a core guarantee, and it still hands the agent long-lived API keys with outbound network access inside the sandbox"
  - "no identity-per-task: one shared worker bearer token authenticates every worker to the control plane (constant-time compared in internal/controlplane/server.go), and one shared CSRF token gates the browser UI; nothing mints a short-lived, task-scoped credential anywhere"
  - "no cost control: token usage is recorded per run as a plain integer column (internal/controlplane/store.go) for display only; there is no budget, spend ceiling or spend-based kill switch anywhere in the control plane"
  - "single machine by design, not a fleet: the control plane binds to 127.0.0.1:7331 by default, docs warn against exposing it behind a reverse proxy, storage is one SQLite file, and there is no Kubernetes packaging; our design assumes a Kubernetes substrate and many concurrent sandboxed workers"
  - "'never merges' is a convention enforced by one optional example script, not a structural property of the system; any other [executors.*] entry in worker.toml could run gh pr merge directly with no gate at all, because the core has no concept of a merge-incapable credential"
ux_verdict: a competent local, config-first tool (TOML and Markdown, no GUI authoring) with one small polling dashboard (2 second refresh) that shows task and run state, token use and duration, and puts approve, cancel and a retry-safety checkbox on the same page, but zero to a first PR still means cloning, building a Go binary, running init, and hand-writing a command on the CLI
slop_verdict: not slop, it is a real and carefully built tool (fsync-safe state, no-shell subprocess handling, regex input allow-lists, 30 test files, SECURITY.md that admits its own lack of sandboxing) actively developed by one engineer at high velocity, but it is early access, unreviewed outside its own ecosystem, and its own maintainer has an open pull request (#494) to delete the GitHub issue intake this report describes
---

# Machinist

## 1. What it is

Machinist is a single Go binary that turns a task or a GitHub issue into an implemented, independently checked pull request, and stops there. It is a solo open-source project by Owain Lewis, released under the MIT licence, with no company or hosted offering behind it. The maintainer also publishes a YouTube channel and a newsletter about agentic engineering, and Machinist is the flagship of a small family of related tools he maintains (push, neo, blueprint).

The maintainer's site (machinist.sh) pitches it as "the open-source software factory" built around four claims: local first, supervised by design, open and extensible, and precision tools. The README states the same thing more concretely: "Workers expose named commands and repositories, never arbitrary shell text or machine-local paths" and "Machinist hands back a pull request. It does not decide what ships."

The repository backs up most of that pitch. It is a genuinely durable, capability-scoped command runner with a real (if narrow) intake mechanism and a well-designed, if optional, deterministic merge gate. It does not back up the implied safety story on sandboxing: SECURITY.md and the runner source both say plainly that a Machinist command runs with the full permissions and credentials of the host user.

## 2. Mapping to our five planes

| Plane / principle | What Machinist does | What we do | Verdict |
|---|---|---|---|
| Signals | Polls a GitHub issue label (default `machinist:requested`) across an operator-configured repository allow-list, with cron and fixed-interval triggers alongside it (internal/controlplane/trigger_scheduler.go, internal/triggers/cron.go); a pending, unmerged PR (#494) proposes removing this entirely in favour of "native tasks" | Multiple signal sources (issues, telemetry, alerts) feeding a durable intake queue | not comparable, narrower scope and in flux |
| Control plane | SQLite-backed job, run and trigger state with worker leasing, heartbeats every 10s, config-signature staleness checks and coalesced trigger admission (internal/controlplane/store.go, internal/managedworker/worker.go) | Durable task state, scheduler, policy, approvals, model choice, cost and audit across many workers | we lead on scope, they lead on simplicity for one machine |
| Worker plane | Ephemeral child processes on the worker host, no container or namespace isolation, full inherited environment minus a `GIT_*` and Machinist-variable deny-list (internal/runner/runner.go) | Disposable sandboxes, constrained egress, temporary credentials | we lead |
| Verification | An optional independent-review step plus a deterministic non-agent gate script in one example workflow (examples/workflows/risk_delivery); no built-in test, security or stronger-model review pipeline for ordinary commands | Tests, security scanning, stronger-model review, policy evaluation before merge, applied by default | we lead |
| Merge and deploy | Hands back an open, non-draft PR for a human; one example workflow can auto-merge a hard-coded narrow class of documentation-only changes after re-checking GitHub state itself | Verification-gated merge and deploy plane | equal in spirit for the one example, absent otherwise |
| Policy outside the model | The risk_delivery gate script never trusts the agent's self-report, it re-fetches head SHA, mergeability, checks and review threads from the GitHub API before acting (examples/workflows/risk_delivery/gate.py) | Policy lives outside the LLM, enforced by the gateway | they lead, for the one path that has it |
| Identity per task | None. One shared worker bearer token, one shared CSRF token, ambient host-user credentials for everything a command runs | Short-lived, task-scoped credentials | we lead |
| Artifacts not chat | Commands exchange files through a shared `{{task.output_dir}}` snapshot per workflow stage, not a chat transcript (docs/task-artifact-model.md) | Agents exchange artifacts, not chat | equal |

## 3. Architecture and stack

Machinist is pure Go (no CGo), using `modernc.org/sqlite` for storage, `github.com/pelletier/go-toml/v2` for configuration and `github.com/spf13/cobra` for the CLI. The binary contains both roles: a control-plane server and a worker process, talking over HTTP with a bearer token. The web UI is React and Vite, built with shadcn/ui components, and its production `dist` is embedded into the Go binary.

Configuration is split into `config.toml` (commands, executors by name, workflows, triggers, shareable) and `worker.toml` (the worker's own executors and repositories, i.e. the actual capability grant). `internal/config/config.go` (664 lines) is the core of the capability model: `validateCommand` checks that an executor's argv template contains no null bytes, no legacy `{{factory.` placeholders, and that `{{machinist.model}}` only ever appears as a complete `--flag=value` argument, never in argument zero. `RenderPrompt` and `validatePromptParameters` reject any other `{{machinist.*}}` token. Repository and executor names are resolved only by exact match against the worker's own maps, never a path taken from network input.

Job and run execution goes through `internal/runner/runner.go` (759 lines): a plain `exec.Command` with `Dir` set to the resolved repository and a full inherited environment minus a small deny-list, `Setpgid: true` on Unix so a timeout can `SIGKILL` the whole process group (`internal/runner/process_unix.go`), and a workflow step-result contract, a bounded JSON file at `MACHINIST_STEP_RESULT_PATH` that a step must write with `outcome: complete|blocked|failed` or the step fails even on exit code zero. State changes are written with fsync-then-atomic-rename discipline.

GitHub issue intake lives in `internal/controlplane/github_cli.go` (636 lines): it shells out to the `gh` CLI with `exec.CommandContext` and argv only, never a shell string, applies regex allow-lists to repository slugs and actor names, and redacts tokens from all logged output. `SearchRequestedIssues` polls for the trigger label, `IssueDetails` reads the issue's full label-event timeline to build an idempotency key from the specific labelling event, and `Permission`/`GitHubPermissionCanWrite` check the labelling actor's repository permission through `gh api .../collaborators/{actor}/permission`. `internal/controlplane/trigger_scheduler.go` wires this together: `processGitHubDetails` calls `Permission` and rejects the request outright (`request.State = "rejected"`) unless the actor has admin, maintain or write access, confirmed at the code level, not just documented.

Deployment is one binary plus one SQLite file. `docs/vm-deployment.md` covers running it as a systemd service behind loopback. There is no Helm chart, no Docker Compose for the control plane itself, and no Kubernetes manifest anywhere in the repository (`examples/workflows/gvisor-pr` uses plain Docker, not Kubernetes, for one example executor).

## 4. UX

Zero to a first PR is: `git clone`, `go build -o ./bin/machinist ./cmd/machinist`, `./bin/machinist init` (writes `~/.machinist/config.toml` with `task-to-pr` and `audit` commands), then either `machinist run --command=task-to-pr --repo=<path> --prompt="..."` for a direct local run, or `machinist submit` against an already-running control plane. That is four CLI steps, assuming the user already has a coding-agent CLI (Codex, Claude Code) installed, since Machinist only orchestrates an existing harness.

While an agent works, a user watches through the embedded web UI, a single-page task list and a per-task detail view (`internal/controlplane/web/src/task-detail.jsx`) that polls every 2 seconds (`main.jsx`, `setTimeout(load, 2000)`), no websockets. The detail view shows run metrics (started, completed, exit code, duration, model, token count), the step-result summary, and, for a multi-stage workflow, an "Approve and start `<next stage>`" button when a step is configured to pause for review, plus a "Cancel task" button. Retrying an interrupted or cancelled job requires ticking "I have verified the previous worker process has stopped" first, a deliberate friction point against double execution.

The marketing site (machinist.sh) has no product screenshots, only hand-drawn technical illustrations (a CNC mill cross-section, an exploded rail-and-carriage assembly) alongside TOML and Markdown code samples. This matches the product's own self-description: config-first, not GUI-first. Compared with our own console, Machinist's UI is simpler and narrower, one machine, one queue, no multi-project view, no cost dashboard, no audit-log browser, but its approve/cancel/retry-safety controls on a single page are a genuinely good, minimal pattern for a task-detail view.

## 5. Security, identity, sandbox, policy, cost

Security. SECURITY.md states plainly that "Machinist runs configured coding commands with the operating-system permissions, tools, environment, and credentials of the worker host user" and that repository mappings "do not sandbox a command from other files or tools available to the worker OS user." This is confirmed in `internal/runner/runner.go`: no container, no namespace, no chroot, no capability drop, just `Setpgid` for process-tree cleanup. The control plane binds to `127.0.0.1:7331` by default and `docs/vm-deployment.md` warns against exposing that port or putting "the current unauthenticated UI" behind a public reverse proxy.

Identity. Worker-to-control-plane auth is one shared bearer token, compared in constant time (`internal/controlplane/server.go`, `validBearerRequest`). Browser submissions need either that same bearer token or a CSRF token plus an Origin header that resolves to `localhost` or a loopback IP (`validBrowserRequest`). There is no per-user login and no per-task credential. Credentials a command needs (a GitHub token, a model API key) live in the worker's own environment and are inherited wholesale by every child process it runs.

Sandbox. None in the core. The only sandboxing anywhere in the repository is `examples/workflows/gvisor-pr`, a community-style example that wraps one executor in a disposable `docker run --runtime=runsc` container with `--cap-drop=ALL`, `--read-only`, tmpfs-only storage, and no host mounts. Its own README is honest about the limit: "This example allows outbound network access and passes both credentials into the sandbox. Agent commands and repository tests may access those credentials."

Policy. Outside the LLM, but only in one place. `examples/workflows/risk_delivery/gate.py` is a trusted, separately-invoked script (not the agent) that re-derives every fact it needs from the GitHub API, exact head SHA, mergeability, check roll-up, unresolved review threads, before approving or executing a merge, and only auto-approves a hard-coded narrow case: low risk, at most 10 Markdown or text files, at most 200 changed lines, no renames, symlinks or executable-mode files (verified in `examples/workflows/risk_delivery/test_gate.py`). Every other command in the system is just an argv template; nothing stops a differently configured executor from calling `gh pr merge` with no policy at all.

Cost. `internal/controlplane/store.go` records `token_usage` as a plain integer per run, for display only. There is no budget, no spend ceiling, no per-project or per-task cost ledger, and nothing in `server.go` enforces one.

## 6. What we should take from it

Narrow, copyable this month: the argv-template capability model in `internal/config/config.go` (`validateCommand`), where the only placeholder allowed in an executor's fixed argv is a complete standalone `--flag={{machinist.model}}` token and untrusted text can only ever reach the child process's stdin, never its argv. This is a clean, small pattern for making sure a manipulated prompt can never inject a new command-line flag into anything our gateway exposes. Also narrow and copyable: the fsync-then-atomic-rename write pattern for run state (`internal/runner/runner.go`), the "lease expired, fail closed for manual reconciliation" rule instead of silent reassignment, the hard-fail-on-legacy-config-key pattern with a migration message baked into the error, and the single retry-safety checkbox in the console.

Broad, worth adopting as a design habit: the risk_delivery merge gate is a strong worked example of "policy outside the model" done concretely rather than as a principle statement, an external script that never trusts the agent's own claim and instead re-fetches ground truth from the forge API before it acts. It is also a useful lesson in scope discipline: the auto-merge path is deliberately tiny (documentation only), which keeps the blast radius of a mistake small while the mechanism is new. Our own merge gates should start at least that narrow before widening.

## 7. Where our philosophy differs and what that costs or buys us

The biggest gap is sandbox isolation, which is not a detail Machinist got wrong, it is a choice it makes on purpose. Machinist optimises for one developer's own machine, trusting that machine completely, and treats "sandbox further" as the user's job (the gvisor-pr example, bring your own container runtime). Our design puts disposable sandboxes and short-lived, task-scoped credentials at the centre because we assume many tasks, many repositories and untrusted contributors at once, a fleet, not a laptop. Copying Machinist's trust model would break our "security without half measures" constraint outright; there is nothing to take here except the observation that a single-operator tool can reasonably choose not to pay this cost, and we cannot.

The same trade-off shows up in identity and cost. One shared bearer token and no spend ledger are fine for a tool one person runs against their own repositories with their own credentials. They would not satisfy our fine-grained roles, spend limits and per-task identity constraints, and Machinist does not claim to need to.

Where their approach is arguably better for its own scope: a single Go binary with SQLite is trivially re-seedable, delete the file, run `init` again, and there is no cluster state to reconcile. Our Kubernetes-substrate, multi-tenant design buys us scale and isolation at the cost of a much larger surface to keep re-seedable end to end.

## 8. Red flags and slop assessment

Not slop. The engineering signals are real: fsync-safe state writes, no-shell subprocess handling throughout the GitHub adapter, regex allow-lists on every value that reaches an external command, 30 Go test files including a real unit-test suite for the merge gate's edge cases (`examples/workflows/risk_delivery/test_gate.py`), and a SECURITY.md that undersells rather than oversells what the product protects against.

Maintenance concentration is a real risk: 425 of roughly 448 recorded contributions are from one person (`owainlewis`), with `dependabot[bot]` a distant second. Development velocity is very high, near 500 merged pull requests in about two and a half months, which cuts both ways: fast iteration, but also fast churn. The clearest instance of that churn is directly relevant to this report: pull request #494, open and unmerged as of 2026-09-29, proposes deleting the GitHub issue trigger family, the `gh` CLI adapter and its database table entirely, in favour of an unbuilt "native tasks" model. Everything this report says about Machinist's ticket-queue adapter describes the current `main` branch (pushed 2026-09-28) and could be gone within weeks.

No licence changes were found (MIT since the first commit). No security incidents, funding announcements or independent reviews were found; a search turned up no Hacker News or Reddit threads evaluating the project, only the project's own repository, its site, community forks, and the author's own newsletter and video material. Several near-identical forks exist on GitHub (`CalvinDittkrist/machinist`, `seanGSISG/machinist`, and others including an independent rewrite called "ESF"), consistent with a small but real community rather than a single-repository ghost town.

## 9. Sources

https://machinist.sh (fetched 2026-09-29)
https://github.com/owainlewis/machinist (fetched 2026-09-29)
gh api repos/owainlewis/machinist (fetched 2026-09-29)
gh api repos/owainlewis/machinist/contributors (fetched 2026-09-29)
gh api repos/owainlewis/machinist/commits (fetched 2026-09-29)
gh api repos/owainlewis/machinist/pulls/494 (fetched 2026-09-29)
gh api repos/owainlewis/machinist/pulls/500 (fetched 2026-09-29)
WebSearch: Machinist owainlewis coding agent github machinist.sh review (2026-09-29)
WebSearch: owainlewis github machinist author background (2026-09-29)
~/repos/market-research-clones/machinist/README.md
~/repos/market-research-clones/machinist/ARCHITECTURE.md
~/repos/market-research-clones/machinist/SECURITY.md
~/repos/market-research-clones/machinist/CONTRIBUTING.md
~/repos/market-research-clones/machinist/docs/README.md
~/repos/market-research-clones/machinist/docs/configuration.md
~/repos/market-research-clones/machinist/docs/task-guide.md
~/repos/market-research-clones/machinist/docs/workflows.md
~/repos/market-research-clones/machinist/docs/task-artifact-model.md
~/repos/market-research-clones/machinist/docs/vm-deployment.md
~/repos/market-research-clones/machinist/internal/config/config.go
~/repos/market-research-clones/machinist/internal/managedworker/worker.go
~/repos/market-research-clones/machinist/internal/runner/runner.go
~/repos/market-research-clones/machinist/internal/runner/process_unix.go
~/repos/market-research-clones/machinist/internal/controlplane/github_cli.go
~/repos/market-research-clones/machinist/internal/controlplane/trigger_scheduler.go
~/repos/market-research-clones/machinist/internal/controlplane/server.go
~/repos/market-research-clones/machinist/internal/controlplane/store.go
~/repos/market-research-clones/machinist/internal/triggers/cron.go
~/repos/market-research-clones/machinist/examples/workflows/risk_delivery/README.md
~/repos/market-research-clones/machinist/examples/workflows/risk_delivery/config.toml
~/repos/market-research-clones/machinist/examples/workflows/risk_delivery/gate.py
~/repos/market-research-clones/machinist/examples/workflows/risk_delivery/test_gate.py
~/repos/market-research-clones/machinist/examples/workflows/gvisor-pr/README.md
~/repos/market-research-clones/machinist/examples/workflows/gvisor-pr/Dockerfile
~/repos/market-research-clones/machinist/examples/workflows/gvisor-pr/run.py
~/repos/market-research-clones/machinist/examples/workflows/gvisor-pr/worker.py
~/repos/market-research-clones/machinist/examples/workflows/gvisor-pr/test_workflow.py
~/repos/market-research-clones/machinist/skills/machinist/SKILL.md
~/repos/market-research-clones/machinist/agent.py
~/repos/market-research-clones/machinist/internal/controlplane/web/src/task-detail.jsx
~/repos/market-research-clones/machinist/internal/controlplane/web/src/main.jsx
