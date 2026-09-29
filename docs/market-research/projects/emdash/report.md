---
name: Emdash
slug: emdash
url: https://emdash.com
repo: https://github.com/generalaction/emdash
category: multi-agent-ui
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: local desktop app (or SSH to your own remote hosts). A separate sales-led Cloud and Enterprise offering exists with no published pricing or architecture.
company: General Action, San Francisco. YC W26. Founders Raban von Spiegel and Arne Strickmann. Reported funding around 500k USD from YC/pre-seed trackers, not company-confirmed.
maturity: 5875 stars, 614 forks, 125 contributors, repo created 2025-08-28, last commit 2026-09-27, 30 GitHub releases (stable and canary channels), roughly weekly cadence
similarity: 2
axes:
  signals_intake: 2
  control_plane: 2
  sandbox_isolation: 1
  verification: 2
  policy_outside_model: 0
  identity_per_task: 1
  cost_control: 1
  ux: 5
  reseedable_selfhost: 2
steal:
  - Provider plugin registry (packages/plugins/src/agents/registry.ts, impl/) declares PATH binary names, install and self-update argv, ACP capability and hook installation per agent CLI in one file. A clean template for widening our Go Harness interface past opencode.
  - Agent Client Protocol (@agentclientprotocol/sdk) drives structured session and turn events for 23 of 37 providers, replacing stdout scraping for status. Worth adopting once opencode or Codex expose it, instead of the log-pattern detectors our supervisor relies on.
  - Diff-and-checks pane (source-control/browser/diff-view, checks-list.tsx, CheckRunBucket) puts the PR diff, review comments and per-check pass/fail/pending/duration in one view next to the terminal. Directly answers our console's missing diff view.
  - Cron-triggered automations (builtin-catalog.ts) pair a cron expression and timezone with a canned prompt, for example a Monday 10:00 "find critical bugs" sweep. A cheap model for a scheduled, prompt-driven TaskBrief source alongside our issue-driven one.
  - Secret<string> wrapper that only exposes plaintext at true boundaries (safeStorage/keychain writes, ssh2 connect, wire edges), enforced by convention across the codebase. A useful discipline pattern even though our agents should never hold key material at all.
  - Host-authoritative reconciliation (ADR 0001): treat the filesystem as ground truth and the local database as a mirror plus annotations, rather than Kubernetes-style spec/status convergence, because the tool is a guest on a shared host. Relevant if we ever let a human touch a worktree outside factoryd.
  - Session resume: closing and reopening the app reattaches the running terminal and agent state without losing context. A concrete bar for a live task detail page in our console, which today has no real-time view of a running session.
differs:
  - Emdash is single-user and local-first by construction: task state is a per-machine SQLite file, credentials sit in the OS keychain, and the "control plane" is a connection supervisor to remote hosts, not a multi-tenant scheduler. Copying this would mean giving up the durable, shared server-side state we already have.
  - No sandboxing or network egress control anywhere. Agent CLIs run as ordinary node-pty child processes with the full permissions and network reach of the host user. This breaks our security-without-half-measures constraint outright and is not something to borrow.
  - Work starts when a human clicks Add Task and picks an issue or a branch. Automations are cron-triggered, not event or alert-triggered. Turning this into a factory posture would require adding the webhook-to-task and alert-to-task pipeline our signals plane already has.
  - Credentials are long-lived, account-scoped OAuth tokens reused across every task in a project, not minted per task. Fine when the task and the human share one trust boundary (one desktop, one user), incompatible with our identity-per-task principle once more than one human or an untrusted contributor is involved.
ux_verdict: The best diff, checks and multi-agent terminal UX we reviewed, built entirely around one human watching and steering, not around unattended autonomy.
slop_verdict: Real and actively maintained. 125 contributors, weekly releases, a positive independent review, and a codebase mid-rewrite (three ADRs replacing the same workspace abstraction inside months) rather than a README with a landing page.
---

# Emdash

## 1. What it is

Emdash is a free, open-source desktop application from General Action (YC W26) for running several AI coding agent CLIs in parallel. Every task gets its own git branch and worktree, so agents editing the same repository do not collide. It ships for macOS, Windows and Linux, detects installed agent CLIs (Claude Code, Codex, Cursor, OpenCode, Amp, Devin, Qwen Code, Droid, GitHub Copilot and more), pulls issues from a wide set of trackers, and gives the user one pane for the diff, the PR conversation and the CI check results. It also reaches remote codebases over SSH through a companion "workspace server" daemon.

The makers call it an "Agentic Development Environment" and claim over 1 million downloads. The repository backs that up with real engagement: 5875 stars, 614 forks, 125 contributors and 30 tagged releases as of 2026-09-29. It is not a thin wrapper. The source is a large, actively refactored pnpm monorepo (Electron main, renderer and preload, a separate workspace-server daemon, five Drizzle-managed SQLite schemas, a vertical-slice "core/features" layout with over 30 feature slices) with architecture decision records that show real engineering churn, not a static demo.

Separately, the company sells "Emdash Cloud" and "Emdash Enterprise", both sales-led with no published pricing or technical detail beyond marketing copy ("run on your infrastructure", "fully isolated, everything tears down when done"). Neither claim could be verified from the code, since the free desktop app and its workspace-server daemon are the only parts that are open source.

## 2. Mapping to our five planes

| Row | What Emdash does | What we do | Verdict |
|---|---|---|---|
| Signals | A human opens the app, clicks Add Task, and picks an issue (from 12 tracker plugin types), a branch or a PR. Automations add a second source: cron-triggered agent runs with a canned prompt. No webhook or alert ever creates a task on its own. | Forgejo webhooks, SigNoz alert webhooks and factoryd's intake API create a task with no human click. One forge only, no GitHub or Jira intake. | they lead on tracker breadth, we lead on autonomous triggering |
| Control plane | Durable per-machine task and automation state in SQLite (Drizzle migrations), resumable terminal sessions, a heavily engineered host-connection supervisor (ADR 0008) for SSH reliability. No policy, budget, approval or audit concept. | Temporal workflow per task, Postgres, policy-as-YAML in Git, budgets, approvals, audit trail. | we lead |
| Worker plane | One git worktree per task, 37 registered harness adapters (23 speak the Agent Client Protocol), remote execution over SSH via a versioned wire protocol. No sandbox: agents run as ordinary child processes with the host user's full permissions and network reach. | One Kubernetes namespace, ServiceAccount and gVisor pod per task, read-only root filesystem, default-deny egress, one harness (opencode) behind a Go interface. | not comparable: they lead on harness-adapter breadth, we lead on isolation strength |
| Verification | Surfaces the forge's own CI check runs (pass, fail, pending, duration) and PR comments next to the diff. Performs no verification itself: no gates, no reproduction step, no model review before merge. | Forgejo Actions on gVisor runners, policy gates (path risk, migration flag, reproduction at base and head), stronger-model review with a strict verdict. | we lead |
| Merge and deploy | A human clicks Create PR or Merge from the diff view. No bot-merge policy, no auto rule, no deploy step. | Bot-only merge after a whitelisted human approval or an auto rule for reproduced, strictly-improving changes, then GitOps deploy with a staged rollout. | we lead |
| Policy outside the model | None found. An agent process has whatever the host user's PATH, tokens and network access allow. | Capability rules live in Git, enforced in gateway code and network policy. A prompt cannot grant a capability. | we lead |
| Identity per task | Long-lived, account-scoped OAuth or SSH credentials, stored in the OS keychain via a typed Secret wrapper, shared across every task in a project. | A short-lived, task-scoped, kubelet-rotated ServiceAccount token, verified by factory-gateway against the cluster OIDC issuer. | we lead |
| Artifacts not chat | The unit of work is one interactive terminal or chat session per task. There is no inter-agent handoff, no TaskBrief passed between sessions beyond conversation resume. | TaskBrief in, a branch, a PR and a normalised event stream out, so agents and reviewers exchange artifacts, not chat. | we lead |

## 3. Architecture and stack

Emdash is a pnpm workspace monorepo: apps/emdash-desktop (Electron 40, React renderer, better-sqlite3 plus drizzle-orm for local state, node-pty for terminals, ssh2 for remote hosts, croner for cron scheduling, @agentclientprotocol/sdk for ACP, @octokit/rest, @linear/sdk, @gitbeaker/rest, @llamaduck/forgejo-ts, @team-plain/graphql for tracker clients) and apps/workspace-server, a Node daemon that exposes the same runtimes (git, files, ACP, automations, terminals) to a remote machine over SSH-forwarded Unix sockets, versioned by a semver wire protocol (protocol version 9.1.0 at the time of reading). Shared packages (packages/core, packages/shared, packages/plugins, packages/ui, packages/wire) hold transport-agnostic runtime primitives, the agent and integration plugin registries, and the RPC contract layer used between renderer and main process and between desktop and workspace-server.

Code is organised as vertical slices under apps/emdash-desktop/src/core/features/* (tasks, automations, source-control, github, issues, machines, mcp, terminals, workbench and more), each with its own api, node, browser and contributions folders, mounted through manifests. This is a deliberate architecture, documented in eight ADRs under docs/adr/, tracking a multi-month rewrite of the workspace-host abstraction, from host-authoritative workspaces (ADR 0001) through retiring the workspaceHost runtime (ADR 0007) to a single connection supervisor per remote host (ADR 0008).

Harness adapters live in packages/plugins/src/agents/impl/ and are registered in packages/plugins/src/agents/registry.ts. The team's own providers.md doc names this as the source of truth and lists 37 current providers, 23 of them ACP-capable (codex, claude, opencode, grok, devin, qwen among others). Each plugin declares PATH-only dependency metadata, prompt-delivery behaviour, and optional hook installation into the provider's own global config directory, never into a task worktree. Tracker intake is a parallel plugin system: packages/plugins/src/issues/impl/ and packages/plugins/src/integrations/impl/ both list the same 12 providers (asana, featurebase, forgejo, github, gitlab, jira, linear, monday, notion, plain, plane, trello), each owning its own credential schema and verification.

Deployment is a signed Electron installer for the desktop app, and a curl-installed, checksum-verified binary artifact for the workspace-server daemon on a remote host, with immutable version directories and an atomic "current" symlink under a fixed state path on the remote machine. There is no server-side deployment for the core product: the desktop app is the whole runtime. A container setup exists only as a developer fixture for the remote-connection test path, not to sandbox agent execution.

## 4. UX

Starting a task, per the docs, takes six UI actions after the app is installed: click Add Task or press a shortcut, pick a starting point (branch, issue or PR), name the task or let Emdash generate a name, choose a provider, optionally pick a model, click Create. Behind the scenes Emdash creates a git worktree (a configurable local directory, or a fixed path inside a remote project), checks out the branch, and launches the agent CLI in a terminal.

While the agent works, the user watches a terminal (chat or raw TUI, switchable per the changelog) and can type into it directly. Terminal state persists automatically, so closing and reopening the app resumes the session. Separate views cover the diff, PR checks and comments in one pane, an in-app browser for previewing a running dev server, and a file editor. A user approves or intervenes by editing the diff, chatting with the agent, or just watching the terminal. There is no separate approval workflow because the human is always present.

Compared with our htmx console, which the baseline itself calls functional but not designed, with no real-time streams of the agent's work, no diff view and no mobile view, Emdash is clearly ahead on every point that assumes a human is watching: a real diff view, CI checks merged into the same pane, resumable live terminals, and an in-app browser. What it does not have is anything for the case our console is built for: a kanban of tasks queued, running, waiting on a human or done across many unattended agents, a cost view, or an alerts view, because Emdash assumes one user is present for every task.

Interfaces are desktop-only (Electron), plus a CLI-adjacent workflow through the agent CLIs themselves and an MCP server sync feature. There is no web UI and no public API for the desktop product itself.

## 5. Security, identity, sandbox, policy, cost

Sandbox: none for agent execution. Isolation is a git worktree, which separates files and branches, not processes or network. An agent CLI runs as an ordinary node-pty child process with the full permissions and network reach of the signed-in host user, whether local or over SSH to a remote workspace-server. The only isolation claim we could find, "fully isolated, everything tears down when done", is on the paid Cloud marketing page and is not verified against any published architecture.

Credentials: provider API keys pass straight through to spawned agent CLIs via an explicit allowlist in the shared agent-env package. Tracker and git credentials are normalised into a typed Secret wrapper (in the secrets primitive) that is meant to stay wrapped until a true boundary (OS keychain write, SSH connect config, wire serialisation). They live in the OS keychain (Electron's safeStorage, a Linux-specific secret storage backend, an encrypted app secret store as fallback), not in plaintext config files. Credentials are account-scoped and persistent, reused by every task in a project, not minted per task.

Policy: nothing enforces what an agent may do beyond whatever the host OS and the user's own tokens allow. There is no capability model, no network policy, no reviewable rule set.

Cost: a per-conversation cost readout exists in the chat panel, sourced from the provider's own usage reporting. There is no cap, no hold, no ledger, and nothing stops a runaway session from spending without limit.

Telemetry: optional and disableable via an environment variable, sent to the company's own telemetry endpoint, separate from code or chat content, which the README states stays local in SQLite and is never sent to Emdash's own servers. Agent CLIs, however, send whatever they send to their own providers, outside Emdash's control.

## 6. What we should take from it

Narrow, this month: the provider plugin registry pattern (one file per agent CLI declaring PATH names, install and update commands and capabilities, dispatched through a shared interface) is a clean template for widening our Go Harness interface past opencode without a rewrite each time. The diff-and-checks pane is a concrete, buildable target for our console's missing diff view: render the PR diff and the Forgejo Actions run status for the same commit in one htmx partial, close to what Emdash already does against GitHub's check runs API. The cron-plus-canned-prompt automation model is a one-table, one-cron-library feature we could add as a second TaskBrief source alongside issues, for the kind of recurring "scan for X" work our own weak-list already implies we want.

Broad, worth discussing: Emdash proves that a single-user, credential-trusting, sandbox-free tool can still win real adoption and a strong reputation (independent review, YC backing, fast release cadence) by being excellent at the part we treat as an afterthought: the moment a human actually watches an agent work. Our console's real-time view, diff view and session resume are the concrete gaps Emdash's UX highlights, and none of them require relaxing our security posture to build, since we can add read-only observability without adding the trust Emdash extends to a human sitting at the same keyboard.

## 7. Where our philosophy differs and what that costs or buys us

Emdash is built for one human operating many agents. We are built for zero humans operating any given task by default. That single choice explains every gap: no sandbox (a human is right there to notice and kill a runaway process), no policy engine (the human is the policy), no per-task identity (the human's own tokens are the task's identity), and no autonomous triggering (the human decides what becomes a task). None of this is a shortcut we could adopt piecemeal. Relaxing our sandbox or identity model to look more like Emdash's would directly break the security-without-half-measures and identity-belongs-to-the-task commitments the whole design rests on, for a convenience Emdash can afford only because a human is always present to absorb the risk. Where their approach is genuinely better (tracker breadth, harness-adapter breadth, UX for a watched task) the cost we pay for not copying it directly is more of our own integration work, not a security trade-off.

## 8. Red flags and slop assessment

The project is real. 125 contributors, 30 releases across stable and canary channels, a last commit the day before this research, and a positive third-party review (TeqVolt, dated May 2026, calling the isolation design "the cleanest implementation we've seen of a workflow that has been quietly inevitable") all point to an actively used, actively maintained tool rather than a demo with a landing page.

The codebase is mid-rewrite. Three ADRs (0001, 0005, 0007) describe the same workspace and host abstraction being replaced twice within months, and ADR 0008 documents a from-scratch connection supervisor rewrite with an explicit fault-injection test suite. That is a sign of a team iterating hard under real usage, not of instability, but it means large parts of the architecture we read may already look different in a few weeks.

Open-core direction is visible but not yet biting. The free desktop app under Apache-2.0 is fully functional, while "Cloud" and "Enterprise" are separate, sales-led products with no published pricing and marketing claims ("fully isolated", "your code, credentials, and workflows stay under your control") that could not be verified against any public architecture. Reported funding, around 500k USD from third-party trackers and not from the company itself, is consistent with a standard YC batch investment rather than a disclosed institutional round. Not verified.

One inconsistency worth flagging: an earlier third-party review (TeqVolt, citing a version from around March 2026) recorded the project as MIT licensed, while the current repository and README both state Apache-2.0. We could not determine whether the licence changed or the earlier review was simply wrong.

The most material security gap for any team considering this tool is the complete absence of sandboxing or network egress control for agent execution. That is a reasonable choice for a personal desktop tool with one trusted user, and a real risk for anyone running it against production credentials on a shared or unattended machine.

## 9. Sources

- https://github.com/generalaction/emdash, README.md and CONTRIBUTING.md, cloned 2026-09-29
- GitHub API repository metadata: stars, forks, licence, created and pushed dates, fetched 2026-09-29
- GitHub API contributors list, fetched 2026-09-29
- GitHub API releases list, fetched 2026-09-29
- Last commit timestamp read from the shallow clone, checked 2026-09-29
- /home/womb/repos/market-research-clones/emdash/README.md
- /home/womb/repos/market-research-clones/emdash/CONTRIBUTING.md
- /home/womb/repos/market-research-clones/emdash/docs/adr/0001-host-authoritative-workspaces.md
- /home/womb/repos/market-research-clones/emdash/docs/adr/0007-workspace-host-runtime-retired.md
- /home/womb/repos/market-research-clones/emdash/docs/adr/0008-host-connection-supervisor.md
- /home/womb/repos/market-research-clones/emdash/agents/integrations/providers.md
- /home/womb/repos/market-research-clones/emdash/agents/integrations/mcp.md
- /home/womb/repos/market-research-clones/emdash/agents/integrations/integration-plugins.md
- /home/womb/repos/market-research-clones/emdash/agents/architecture/workspace-server.md
- /home/womb/repos/market-research-clones/emdash/agents/workflows/flows.md
- /home/womb/repos/market-research-clones/emdash/apps/workspace-server/docs/docker-remote.md
- /home/womb/repos/market-research-clones/emdash/apps/emdash-desktop/package.json
- /home/womb/repos/market-research-clones/emdash/apps/emdash-desktop/src/core/primitives/secrets/api/secret-store.ts
- /home/womb/repos/market-research-clones/emdash/apps/emdash-desktop/src/core/features/source-control/browser/diff-view/changes-panel/components/pr-entry/checks-list.tsx
- /home/womb/repos/market-research-clones/emdash/apps/emdash-desktop/src/core/features/github/api/browser/checks/types.ts
- /home/womb/repos/market-research-clones/emdash/apps/emdash-desktop/src/core/features/automations/api/contract.ts
- /home/womb/repos/market-research-clones/emdash/apps/emdash-desktop/src/core/primitives/automations/api/automation.ts
- /home/womb/repos/market-research-clones/emdash/apps/emdash-desktop/src/core/features/automations/browser/builtin-catalog.ts
- /home/womb/repos/market-research-clones/emdash/apps/emdash-desktop/src/main/lib/telemetry.ts
- /home/womb/repos/market-research-clones/emdash/packages/plugins/src/issues/impl/ directory listing
- /home/womb/repos/market-research-clones/emdash/packages/plugins/src/integrations/impl/ directory listing
- top-level and apps/emdash-desktop/src layout, read via directory listing
- https://emdash.com, fetched 2026-09-29
- https://emdash.com/docs, fetched 2026-09-29
- https://emdash.com/enterprise, fetched 2026-09-29
- https://emdash.com/cloud, fetched 2026-09-29
- https://emdash.com/docs/tasks, fetched 2026-09-29
- Show HN thread for Emdash, referenced via search, 2026-09-29
- TeqVolt independent review of Emdash, dated May 2026, referenced via search 2026-09-29
- Y Combinator company page for Emdash, referenced via search 2026-09-29
- Tracxn company profile for Emdash, funding data, referenced via search 2026-09-29
- VCBacked company profile for Emdash, funding data, referenced via search 2026-09-29
