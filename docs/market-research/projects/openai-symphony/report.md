---
name: OpenAI Symphony
slug: openai-symphony
url: https://openai.com/index/open-source-codex-orchestration-symphony/
repo: https://github.com/openai/symphony
category: factory-orchestrator
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, one daemon on a devbox or server, no SaaS
company: OpenAI (Codex team), San Francisco, reference implementation, "not a standalone product"
maturity: 27.5k stars, 2.8k forks, 9 contributors (one with 34 of 47 commits), repo created 2026-02-26, last commit 2026-09-15, releases v0.0.1 (2026-07-18) to v0.0.3 (2026-09-15) plus nightly
similarity: 3
axes:
  signals_intake: 3
  control_plane: 1
  sandbox_isolation: 1
  verification: 1
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 1
  ux: 3
  reseedable_selfhost: 2
steal:
  - One persistent "Codex Workpad" issue comment, edited in place with plan, acceptance criteria, validation and notes, as the live progress view in the forge
  - Blocker-aware dispatch, only issues whose blockers are terminal get an agent, plus agents filing follow-up issues into Backlog with blockedBy links
  - Reconcile on every tick, a human stops or parks work by moving the issue state, the orchestrator kills the agent and cleans the workspace
  - In-worker continuation turns on the same agent thread up to max_turns, with a short continuation prompt instead of the full brief
  - Host-side execution of tracker tools with the declared secret variables stripped from the child environment (unset plus Port env false)
  - docs/token_accounting.md rules for Codex app-server usage events (total_token_usage over last_token_usage, delta against last reported) for our Codex harness
  - A per-repo WORKFLOW.md contract, YAML front matter plus strict Liquid prompt, hot-reloaded with last-known-good fallback
  - Codex approval policy in reject-object form and treating turn_input_required as a blocked state instead of a hang
differs:
  - The tracker is the state machine and the agent itself moves issues between states through a tool, we keep state in Temporal and never let the agent own a transition
  - Agents run as processes on one trusted devbox with host gh auth, we run one gVisor pod per task with no credentials in reach
  - The agent merges its own PR with gh after a human moves the issue to Merging, we merge by a bot after gates in code
  - Verification, PR creation and review handling live in a prompt and skills, not in the orchestrator, so nothing enforces them
  - Codex app-server is the only harness and OpenAI the implied model vendor, we keep a model-independent gateway and harness interface
  - No spend caps, the design assumes token-rich teams ("token billionaires")
ux_verdict: Strong idea, weak surface. The tracker (including its mobile app) is the UI and a workpad comment shows progress, while Symphony's own dashboard is read-only.
slop_verdict: Real and used inside OpenAI, but a deliberately thin prototype. The orchestrator is honest code, the safety and done-ness live in a long prompt, and OpenAI says it will not maintain it as a product.
---

# OpenAI Symphony

## 1. What it is

Symphony is a daemon that polls an issue tracker, creates one workspace directory per active issue and runs a Codex app-server session in it until the issue leaves an active state. OpenAI's Codex team built it after their "harness engineering" work, where engineers hit a ceiling of three to five interactive Codex sessions each. It was published on GitHub in February 2026 and announced on 27 April 2026 in the post "An open-source spec for Codex orchestration: Symphony" by Alex Kotliarskyi, Victor Zhu and Zach Brock.

The product is mainly `SPEC.md`, a 2,312-line language-agnostic specification. The README tells users to "tell your favorite coding agent to build Symphony in a programming language of your choice". An Elixir/OTP reference implementation sits in `elixir/`, marked "prototype software intended for evaluation only". It is Apache-2.0 and free. OpenAI sells the Codex runtime and models behind it, not Symphony.

The makers claim a 500% increase in landed PRs on some internal teams in three weeks, with no stated baseline. The repository shows a working scheduler (about 13,000 lines of Elixir), five tracker adapters and a very detailed agent prompt. The PR, review, CI and merge behaviour is prompt text and skills, not orchestrator code.

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Polls one tracker every `polling.interval_ms` (default 30 s). Adapters for Linear, GitHub Issues, Jira Cloud, Asana, GitLab. Filters by active states, `required_labels`, assignee and blockers. No webhooks, no alerts, no telemetry | Forgejo webhooks, SigNoz alert webhooks, intake API, every task a Forgejo issue | Equal. They lead on tracker breadth and blocker DAGs. We lead on alerts and push delivery |
| Control plane | One GenServer (`orchestrator.ex`) with in-memory `running`, `claimed`, `retry_attempts`, `blocked`. No database. Restart loses retries and blocked marks. Durable state is the tracker plus the workspace directory | factoryd, Temporal workflow per task, Postgres, policy, budgets, approvals, audit | We lead |
| Worker plane | `bash -lc <codex.command>` as a local child process or over SSH, cwd set to `<workspace.root>/<workspace_key>`. Isolation is Codex's own sandbox policy. Workspaces persist across runs | gVisor pod per task, own namespace and ServiceAccount, read-only root, default-deny egress | We lead |
| Verification | The target repo's own CI plus whatever the prompt demands (reproduce first, run validation, PR feedback sweep, green checks). Human review in the tracker state `Human Review`. Nothing enforced by Symphony | CI on untrusted runners, policy gates in the workflow, stronger-model review with strict verdict | We lead |
| Merge and deploy | Human moves issue to `Merging`. The agent runs the `land` skill: watch CI, merge main, fix failures, then `gh pr merge --squash`. No deploy | Bot merge after whitelisted approval or `auto` rule, Flux deploy, staged rollout | We lead on control. They lead on automated last-mile shepherding (rebase, conflict fix, flaky retry) |
| Policy outside the model | Codex `approval_policy`, `thread_sandbox` and `turn_sandbox_policy` are enforced by the Codex runtime. Workflow rules are prompt text. Tracker tools run with the full token scope | Capability rules in Git, enforced in gateway code and network policy | We lead |
| Identity per task | Tracker token held by the Symphony host, tools executed host-side, token variables stripped from the child. Git and GitHub use host `gh` auth that the agent can reach. Codex uses the host `~/.codex/auth.json` | Projected per-task ServiceAccount token, gateway maps it to the task, no key material in the sandbox | We lead. Their tracker-tool pattern matches our gateway idea at small scale |
| Artifacts not chat | Issue in, branch and PR out, progress in one workpad comment. The agent also writes tracker state and follow-up issues | TaskBrief in, branch, PR and normalised event stream out | Equal in spirit |

### The loop step by step

| Step | Symphony | Us |
|---|---|---|
| 1. Work appears | Human or agent files an issue in Linear (or another tracker), state `Todo` | Issue or alert in Forgejo, webhook to factoryd |
| 2. Eligibility | Poll tick, `candidate_issue?` and `should_dispatch_issue?`: active state, `dispatchable` (assignee, blockers terminal), labels, not claimed, global and per-state slots | Intake rules, trust boundary check, capability and budget check |
| 3. Claim | Issue id added to in-memory `claimed`. Re-fetched once before dispatch (`revalidate_issue_for_dispatch`) | Temporal workflow start, task row in Postgres |
| 4. Workspace | `Workspace.create_for_issue`, then `hooks.after_create` (usually `git clone`) and `before_run`, arbitrary shell as the Symphony user | Namespace, ServiceAccount, gVisor pod, worker clones with a per-session token before the agent starts |
| 5. Credentials | Tracker secret stripped from env, tracker calls via `linear_graphql` or `github_api` tool. Reference WORKFLOW uses `shell_environment_policy.inherit=all`, so every other host variable reaches Codex | Audience-scoped projected token only, gateway holds everything else |
| 6. Agent run | `AppServer.start_session`, first turn with rendered prompt, then up to `agent.max_turns` (20) continuation turns while the issue stays active | opencode headless behind `Harness`, TaskBrief, supervisor detectors |
| 7. Agent moves state | Prompt tells the agent to set `In Progress`, keep the workpad, push, open PR with label `symphony`, move to `Human Review` | factoryd moves state, the agent cannot |
| 8. Is it done | The agent decides. Symphony only checks whether the tracker state is still active after each turn (`continue_with_issue?`) | Workflow gates decide on evidence |
| 9. Review | Human reads PR and workpad, moves issue to `Rework` (agent resets, closes PR, starts over) or `Merging` | Model review, then approval as a workflow state |
| 10. Merge | Agent runs `land` skill and `gh pr merge --squash`, then sets `Done` | `factory-merge` bot after gates |
| 11. Failure | Abnormal exit: backoff `min(10000 * 2^(attempt-1), max_retry_backoff_ms)`. Normal exit: re-check after 1 s. Stall after `stall_timeout_ms` (5 min) without events: kill and retry. No retry limit | Retry on a stronger tier, supervisor, escalation, hard caps |
| 12. Cleanup | Terminal state seen on reconcile, retry or startup: `before_remove` hook, then directory removed | Namespace deleted, lease GC |

## 3. Architecture and stack

Elixir on OTP, Phoenix LiveView and Bandit for the optional dashboard, Ecto embedded schemas for config (`config/schema.ex`), Liquid templating for prompts. Burrito builds single-file executables for macOS and Linux (arm64, x86_64). No database, no queue, no container image, no Helm chart. CI in `.github/workflows/make-all.yml`, `burrito-release.yml`, `burrito-nightly.yml`, `pr-description-lint.yml`.

`orchestrator.ex` (1,990 lines) is a single GenServer. `handle_info(:tick)` runs `reconcile_running_issues` (stall check then tracker refresh), config validation, then `maybe_dispatch`. Workers are `Task.Supervisor` children running `AgentRunner.run/3`. The orchestrator is the only writer of scheduling state, which removes duplicate dispatch within one process. Two Symphony processes against one board would double-dispatch. Open PRs #82 and #83 ("claim lease heartbeat recovery", "Jira claim lease support") show this is being worked on, and they come from agent branches (`codex/sd-10-claim-leases`).

`codex/app_server.ex` (1,071 lines) speaks the Codex app-server JSON-RPC protocol over stdio. It sends `approvalPolicy` and `sandbox` at thread start and `sandboxPolicy` per turn. If `approval_policy == "never"` it auto-approves requests. Otherwise approval and user-input requests end the turn as `:approval_required` or `:turn_input_required`, and the orchestrator parks the issue in an in-memory `blocked` map. Dynamic tools from the tracker adapter are advertised at session start and executed host-side.

Tracker adapters implement a small behaviour in `tracker.ex`: `fetch_issues_by_states`, `fetch_issues_by_ids`, `agent_tool_specs`, `secret_environment_names`, `execute_agent_tool`. The spec says to avoid generic CRUD across trackers and expose provider-native tools instead.

The SSH worker extension (`ssh.ex`, SPEC Appendix A) runs `codex app-server` on remote hosts over `ssh -T`, with `worker.max_concurrent_agents_per_host`. Hosts are expected to be pre-provisioned with Codex, git and auth.

Model routing does not exist in Symphony. The model is whatever `codex.command` sets, for example `--config 'model="gpt-5.5"' --config model_reasoning_effort=xhigh` in `elixir/WORKFLOW.md`.

The workflow logic that matters most for our comparison is in `elixir/WORKFLOW.md` (about 330 lines of prompt) and `.codex/skills/{commit,push,pull,land,linear,debug,release}`. `land/land_watch.py` is an asyncio watcher for review comments, CI results and head updates with exit codes 2, 3 and 4.

A third-party page (rywalker.com, June 2026) mentions a spec v1.1 with a "Kata CLI" runtime for Claude Code and Gemini. The current `SPEC.md` says "Draft v1" and the repository has no Kata reference. Not verified.

## 4. UX

The tracker is the UI. A user files an issue, moves it to `Todo`, and later sees it jump to `In Progress`, gain a `## Codex Workpad` comment with a host stamp, plan checklist, acceptance criteria and validation notes, then an attached PR and a move to `Human Review`. The blog stresses that this works from the Linear mobile app. Product managers and designers file issues and get back a review packet with a video walkthrough (the video part depends on the team's own skills, not on Symphony).

Intervention is also through the tracker. Moving an issue to a non-active state stops the agent at the next reconcile without cleanup. Moving it to a terminal state stops it and deletes the workspace. `Rework` makes the agent close its PR and start over. There is no "pause", "grant more time" or "redirect" control, and no chat with a running agent.

Symphony's own surfaces are read-only. The terminal status view (`status_dashboard.ex`, screenshot `.github/media/elixir-screenshot.png`) lists running agents with ID, tracker state, PID, age and turn, tokens, session id and the last humanised Codex event, plus a backoff queue. The screenshot shows 19 of 50 agents and 38.5 million tokens in 1 minute 54 seconds. The Phoenix LiveView page at `/` and `/api/v1/state`, `/api/v1/<identifier>` show the same data. `POST /api/v1/refresh` is the only action. No auth on the HTTP server, bound to 127.0.0.1 by default.

Zero to first result, from `elixir/README.md`: install mise, clone, `mise trust`, `mise install`, `mix setup`, `mix build`, create a Linear API key, add three custom Linear states (`Rework`, `Human Review`, `Merging`), copy and edit `WORKFLOW.md`, copy skills, have `codex` logged in and `gh` authenticated, run `./bin/symphony ./WORKFLOW.md`, file an issue. About 12 steps, fewer with a Burrito binary. The README suggests asking Codex to do the setup.

Easier than our console: nothing new to learn, a mobile client for free, and a single living progress comment instead of scattered events. Worse than our console: no cost view, no human lane, no approvals separate from tracker states, no multi-project view, and a restart loses the blocked list.

## 5. Security, identity, sandbox, policy, cost

**Trust posture.** The README says "a low-key engineering preview for testing in trusted environments". SPEC section 2.2 lists "mandating strong sandbox controls beyond what the coding agent and host OS provide" as a non-goal. Section 15.5 gives hardening advice but mandates none of it.

**Sandbox.** Code defaults are cautious: `thread_sandbox: workspace-write`, a `workspaceWrite` turn policy with `writableRoots: [workspace]`, `readOnlyAccess: fullAccess` and `networkAccess: false`, and an approval policy that rejects sandbox approvals, rules and MCP elicitations (`config/schema.ex`, `default_turn_sandbox_policy`). The shipped `elixir/WORKFLOW.md` overrides all of it: `approval_policy: never`, `networkAccess: true`, `shell_environment_policy.inherit=all`. The agent can read the whole host filesystem in both cases. Hooks run as unsandboxed shell. There is no egress allowlist.

**Credentials.** The one real mechanism is host-side tracker tools. `app_server.ex` passes `{name, false}` in the Port env and prefixes `unset <names>` to the launch command, so declared tracker variables do not reach Codex. Commit #119 (2026-08-12) added GitHub and GitLab token aliases to the scrub list. But the tool forwards any relative REST path with GET, POST, PATCH, PUT or DELETE (`github/agent_tool.ex`, `@allowed_methods`), so the agent has the full power of the token through the tool. Git push and PR creation use the host's `gh` login, which the agent reaches directly. The e2e test mounts `~/.codex/auth.json` into SSH workers.

**Policy.** Workflow rules (do not merge directly, move state only when the bar is met, do not touch other paths) are prompt text. Codex's sandbox settings are the only policy enforced outside the model.

**Cost.** Token totals and the latest rate-limit payload are tracked (`codex_totals`, `codex_rate_limits`). There is no budget, no cap, no per-issue limit and no retry limit. `agent.max_turns` bounds turns per worker run, but the orchestrator re-dispatches after one second while the issue stays active, so a stuck issue can burn tokens indefinitely. `codex.turn_timeout_ms` is a silence timeout, not a total runtime cap.

## 6. What we should take from it

### Narrow

**Workpad comment.** One issue comment with a fixed marker (`## Codex Workpad`) that the agent edits in place with plan, acceptance criteria, validation evidence, notes and a `### Confusions` section. This is the cheapest answer to our "no real-time stream" gap. In our design the worker, not the agent, should own the comment and render it from the normalised event stream plus a structured plan the agent emits, posted through the gateway under the task identity.

**Blocker-aware dispatch.** The Linear adapter only marks a `Todo` issue dispatchable when all blockers are terminal. Agents file follow-up issues in `Backlog` with `blockedBy`. We can read Forgejo issue dependencies in factoryd intake and hold tasks until blockers close. That gives staged migrations (their Vite before React example) without a new planner.

**Reconcile by issue state.** Every tick re-reads running issues. Terminal state kills the agent and cleans up. Non-active state kills without cleanup. We should make closing a Forgejo issue or removing a trigger label a first-class cancel signal to the Temporal workflow, if it is not already, and document "move the issue" as the stop button.

**Continuation turns.** After a normal turn the worker re-checks the tracker and sends a short "continuation guidance" prompt on the same thread instead of resending the brief (`AgentRunner.build_turn_prompt/4`). With opencode or Codex we can keep one session alive across short turns and let the supervisor detectors run between turns.

**Codex app-server details.** When we switch to Codex CLI, reuse their findings: `docs/token_accounting.md` (prefer `thread/tokenUsage/updated` and `total_token_usage`, ignore `last_token_usage`, count deltas against last reported totals), the reject-object `approval_policy`, and mapping `turn_input_required` and approval requests to a blocked state that raises a human task rather than hanging.

**Strict prompt template.** Liquid with unknown variables and filters failing the render, plus hot reload that keeps the last good config on error. A cheap guard for our harness prompt.

### Broad

**Issue tracker as the only UI a requester needs.** Their users never open Symphony. Everything a requester needs is on the issue: state, workpad, PR link, follow-ups. Our console is for the operator. For requesters we should push the same information onto the Forgejo issue so that phone access through Forgejo's web UI is enough.

**Agent-driven last mile.** Their `land` skill watches CI, merges main, resolves conflicts, retries flaky checks and fixes failures until green. We do not have an agent loop for "PR is approved but not mergeable". It would land as a second capability class (`lander`) that may push to the task branch, while the merge itself stays with `factory-merge`.

**Rework as reset.** `Rework` closes the PR, deletes the workpad and starts from a fresh branch, on the view that incremental patching after a rejected approach compounds errors. Worth a policy option on our retry path: a human rejection starts a new session from base, carrying only the reviewer's findings.

**Agents filing scoped follow-up issues.** The prompt forbids scope creep and tells the agent to file a Backlog issue with acceptance criteria instead. We could expose a gateway tool `file_followup` that creates an issue in a non-dispatchable state, attributed to the task.

## 7. Where our philosophy differs and what that costs or buys us

**Tracker as state machine versus workflow engine.** Symphony lets the agent write the state that drives the scheduler. That is simple and needs no database. It also means a prompt injection in an issue body can move tickets, close PRs or file work, and the scheduler will act on it. Copying it would break "policy lives outside the model". Our Temporal workflow costs us an engine to run and rebuild, and buys a state no agent can forge.

**Trusted devbox versus sandbox per task.** Their agents share one host, one user, one `gh` login and full read access to the filesystem. That is why setup takes minutes and 50 concurrent agents fit on one box without Kubernetes. Our gVisor pods cost startup time and slow builds, and buy the "security without half measures" constraint. Their approach is better for a trusted team on its own code. Ours is the only one of the two that can take an issue from an outside account.

**Objectives versus gates.** The blog says treating agents as rigid state machine nodes "doesn't work well" and they moved to "objectives instead of strict transitions ... let them cook". We deliberately keep gates in code. The price is that our agents cannot close old PRs or pull reports unless we add tools for it. The gain is that done means evidence, not the agent's word.

**Agent merges versus bot merges.** Human approval in Symphony is a state change after which the agent merges with host credentials. We split approval and merge identity. We keep ours.

**Single vendor.** Symphony is written against the Codex app-server protocol and says the Codex protocol "controls protocol shape". Nothing prevents another model behind Codex, but nothing helps either. Our gateway and `Harness` interface cost more code and keep model choice open.

**Cost.** No caps is a choice that fits a lab that pays nothing per token. Our hard caps with holds are essential on a portfolio budget and would be an easy contribution for anyone hardening Symphony.

**Re-seedability.** Symphony is almost stateless, so "delete and restart" works trivially. But the host (Codex login, gh login, mise, SSH workers) is hand-built and not described as code. We are ahead on reproducible infrastructure, they are ahead on having nothing to reproduce.

## 8. Red flags and slop assessment

The code is real, tested (22 test files under `elixir/test/symphony_elixir`, live e2e tests per tracker) and dogfooded. Open PRs in the repo come from agent branches named after Jira issues (`codex/sd-9-...`, `codex/sd-10-...`), and `docs/symphony-smoke-test-one.md` reads "Symphony picked up Jira issue SD-4".

Maintenance is thin. 47 commits in seven months, one author with 34 of them, three point releases. OpenAI states it does "not plan to maintain Symphony as a standalone product". The README recommends building "your own hardened version based on SPEC.md". Expect the ecosystem to live in forks (a Go port and an OpenCode port are mentioned by third parties, not checked).

The star count (27.5k) reflects the OpenAI brand and the blog post, not production use outside OpenAI. The 500% landed-PR figure has no baseline.

Spec quality is contested. A Hacker News commenter (thread 47252045, about March 2026) called the spec "inscrutable agent slop" that "mentions a state machine and then proceeds to not describe the state machine". The current SPEC does contain a state list (section 7) and reference algorithms (section 16), so this criticism is partly out of date. The document is still long and repetitive by design ("intentionally redundant so a coding agent can implement the config layer quickly").

Security marketing does not outrun the code: the warnings are explicit. The risk is users copying `elixir/WORKFLOW.md`, which ships `approval_policy: never`, network on and full environment inheritance.

The tracker tools have no scope guard. `project_slug` scopes scheduler reads, "not raw tool calls; the tool can access whatever the configured Linear token can access" (elixir/README.md).

## 9. Sources

- https://github.com/openai/symphony (gh api, 2026-09-29)
- https://openai.com/index/open-source-codex-orchestration-symphony/ (2026-04-27, via Firecrawl, WebFetch returned 403)
- https://news.ycombinator.com/item?id=47252045 (about March 2026)
- https://rywalker.com/research/symphony (June 2026)
- https://www.helpnetsecurity.com/2026/04/28/openai-symphony-codex-orchestration-linear/ (2026-04-28, search result only)
- https://tessl.io/blog/openai-open-sources-symphony-a-spec-for-orchestrating-codex-agents (search result only)
- https://www.latent.space/p/harness-eng (search result only)
- ~/repos/market-research-clones/openai-symphony at be10a1b (2026-09-15)
- README.md
- SPEC.md (full)
- elixir/README.md
- elixir/WORKFLOW.md
- elixir/docs/token_accounting.md
- elixir/lib/symphony_elixir/orchestrator.ex (function map, retry and reconcile paths)
- elixir/lib/symphony_elixir/agent_runner.ex
- elixir/lib/symphony_elixir/codex/app_server.ex (launch, env scrub, approval handling)
- elixir/lib/symphony_elixir/config/schema.ex (defaults, sandbox policy)
- elixir/lib/symphony_elixir/workspace.ex (function map)
- elixir/lib/symphony_elixir/ssh.ex
- elixir/lib/symphony_elixir/github/agent_tool.ex
- elixir/lib/symphony_elixir/tracker.ex, linear/adapter.ex, github/adapter.ex
- elixir/lib/symphony_elixir_web/router.ex, live/dashboard_live.ex
- .codex/skills/land/SKILL.md, land/land_watch.py, push/SKILL.md
- .codex/worktree_init.sh
- .github/workflows/, .github/media/elixir-screenshot.png
- docs/symphony-smoke-test-one.md
- gh api repos/openai/symphony/releases, /contributors, /commits, gh pr list
