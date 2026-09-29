---
name: LangWatch
slug: langwatch
url: https://langwatch.ai
repo: https://github.com/langwatch/langwatch
category: observability-evals
license: "mixed: Apache-2.0 core, proprietary Enterprise module under platform/app/ee/, MIT SDKs"
open_source: partial
self_hostable: yes
hosting_model: self-hosted (Docker Compose, Helm, or your own VPC) or LangWatch Cloud (EU, US, UK, APAC), identical container images either way
company: LangWatch B.V., Amsterdam. Founded 2023 by Rogerio Chaves (CTO, ex-Booking.com) and Manouk Draisma (CEO), who met during an Antler residency. EUR 1m pre-seed announced 25 Feb 2025, led by Passion Capital with Volta Ventures and Antler. About 9 staff as of mid-2026 (Tracxn). No later round found as of 2026-09-29.
maturity: 4,888 stars, 401 forks, 36 contributors, first commit 2023-09-09, last commit 2026-09-29 (today), latest release v3.18.0 on 2026-09-27, weekly point releases, 152 numbered ADRs under dev/docs/adr
similarity: 2
axes:
  signals_intake: 1
  control_plane: 1
  sandbox_isolation: 2
  verification: 1
  policy_outside_model: 3
  identity_per_task: 3
  cost_control: 3
  ux: 4
  reseedable_selfhost: 3
steal:
  - Assemble a replay transcript by ordering every event in a task's own stream by timestamp, not by re-parsing the latest agent call, so a session that ends on a single tool-only turn still renders in full.
  - Join a session to its pull request over two channels, the working directory a session reports at each turn plus an explicit declare-your-context command for anything done outside it, matched against the PR's head branch.
  - Keep an agent's self-reported cost beside the cost computed from its own token counts, using the computed figure as the total and treating a mismatch between the two as a drift signal, not noise.
  - Mint a git credential per turn rather than per task, scoped to the two permissions actually needed, cached only briefly, handed to the worker as an environment variable and never written to disk.
  - Redact secrets in three layers, exact vendor key prefixes, a shape and entropy heuristic, and contextual naming such as "the password is", replacing a hit with a flat marker rather than a blank, and treat over-redaction as a bug as serious as a leak.
  - Write a sandbox's actual limits into its own docs in plain language, naming which boundary is enforced in the kernel and which is cooperative today, instead of only describing the parts that work.
  - Number design decisions as individual dated files under one directory rather than folding them into a single running log.
  - Split a spend cap into named scopes, organisation, team, project, key, person, group and end user, so one key can protect a noisy caller without capping everyone behind it.
differs:
  - LangWatch isolates a conversation's workers from each other by Unix UID inside one shared pod and network namespace, we give every task its own gVisor pod and its own network namespace, copying their density model would trade our harder tenant boundary for lower sandbox cost.
  - Their AI Gateway checks a budget against a config snapshot refreshed once a minute and books spend after the provider replies, we hold a worst-case price under a database lock before the call and reconcile after, copying their model reopens the overspend window our hold exists to close.
  - Their coding-agent session feature exists because an externally run agent must tell LangWatch what it did after the fact, our tasks already carry their own repository, branch and issue before a sandbox exists, so we do not need their attribution machinery at all.
  - Their SSO, RBAC, SCIM, audit log and gateway webhooks sit behind a paid Enterprise licence even in the self-hosted image, funding a team that ships weekly and writes a dated decision record for almost everything, our own build-it-ourselves stance means we do not collect that revenue and have to earn the same hardening by our own effort.
ux_verdict: The Sessions and Pull Requests pages are close to the replay and cost view our console is missing, well built but read only, a human still approves and merges on GitHub or in their own terminal, not inside LangWatch.
slop_verdict: Real and actively worked, a commit landed today, a point release shipped two days ago, and 152 numbered decision records sit behind a nine-person, single-round seed company, not a landing page.
---

# LangWatch

## 1. What it is

LangWatch is an open-core LLM ops platform for observability, evaluation and optimisation, built by LangWatch B.V. in Amsterdam. It pitches three pillars, Simulate, Evaluate and Observe, aimed at "teams that ship AI to production" (langwatch.ai, fetched 2026-09-29). It ingests OpenTelemetry traces from any instrumented LLM call or coding agent, runs evaluations and guardrails against that traffic, and since its v3 architecture also ships an AI Gateway for routing and budgeting model calls, plus an in-product autonomous coding agent called Langy.

It is sold three ways. LangWatch Cloud is the hosted product. Self-Managed is the same container image on the customer's own Kubernetes or Docker Compose, Apache-2.0 at the core with an Enterprise licence key unlocking SSO, SCIM, role-based access control and audit logs (platform/app/ee/, see docs/self-hosting/licensing.mdx). Hybrid puts LangWatch's control plane in front of a customer-owned ClickHouse and S3 so trace data never leaves the customer's network.

The docs claim "full data sovereignty" and state plainly "there is no separate community or enterprise build" (docs/self-hosting/overview.mdx). The repository backs that up structurally, one Helm chart with subcharts you can turn off, one licence-check module rather than a fork. What the brief for this report undersold is which feature matters most for our comparison. The brief named "coding agent sessions", the more useful analogue is Langy: a chat-driven agent that reads a project's own traces and evals, writes a failing test, drafts a fix and opens a bot-authored pull request from inside a sandboxed pod. That is closer to our worker and verification planes than the session-replay feature is.

## 2. Mapping to our five planes

| Plane / principle | What LangWatch does | What we do | Verdict |
|---|---|---|---|
| Signals | Coding-agent telemetry and AI Governance anomaly rules surface problems on a dashboard for a human to read. Langy itself starts only on a chat turn a human types, nothing spawns it automatically from an issue or an alert. | Forgejo webhooks and SigNoz alert verdicts feed factoryd intake directly into tasks, no human has to notice first. | We lead |
| Control plane | A Langy conversation keeps an event-sourced turn log and an idle-reaper timeout, per-conversation state, not a durable task registry with queued, running, waiting and done states or an approvals ledger. | factoryd, Temporal and Postgres hold every task's state, retries and approvals as one queryable record. | We lead |
| Worker plane | Each Langy conversation runs as a worker process, isolated from its siblings by Unix UID inside a pod the chart pins to a gvisor RuntimeClass (self-hosted docs disagree on whether this is fail-closed by default, see section 8). Multiple conversations still share one pod and one network namespace. | One gVisor pod per task, its own network namespace, default-deny egress through gateway, git and module proxies. | We lead |
| Verification | A Langy pull request relies on the human reviewer and whatever CI the target repository already runs against the test Langy wrote, no independent gate or stronger-model review of Langy's own diff. | Forgejo Actions gates, policy checks and a stronger-model review before merge. | We lead |
| Merge and deploy | Langy never merges its own pull request, a human always does, on GitHub. LangWatch's job stops there. | Bot merge behind policy gates, then staged Flux rollout to deploy. | Not comparable, LangWatch has no deploy step to compare |
| Policy outside the model | GitHub App scopes (contents:write, pull_requests:write), gateway virtual-key budgets and network allow-lists are enforced in code and infrastructure, not in Langy's system prompt. | Same principle, capability rules live in Git and are evaluated per task. | Equal |
| Identity per task | A fresh 1-hour GitHub installation token is minted per turn, scoped to one repository, cached in Redis, handed to the worker only as an environment variable. | Short-lived, task-scoped credentials, identity belongs to the task, not the machine. | Equal |
| Artifacts not chat | Langy is chat-driven end to end, a plain-English request in a chat panel is the task's whole spec, the pull request is the output artifact. | A TaskBrief document and a PR are the exchange, not a chat transcript. | We lead on process, though the PR endpoint is shared |

## 3. Architecture and stack

The monorepo (~/repos/market-research-clones/langwatch, cloned at depth 1, about 731 MB) is a pnpm workspace rooted at package.json (@langwatch/server, Node >=20) for the web app and workers, a separate Go module (go.mod, module github.com/langwatch/langwatch, Go 1.26.6) for the AI Gateway, Langy's agent manager and assorted CLI tools, plus Python services named in the compose file, langevals for evaluators and guardrails and langwatch_nlp for NLP and workflow processing.

Storage: PostgreSQL is the control-plane database. ClickHouse (a bundled clickhouse-serverless subchart, pinned to 0.2.0 in the compose file) holds traces and analytics and replaced Elasticsearch in v3. Redis is the job queue and also caches AI Gateway budget snapshots and Langy's GitHub tokens. S3 holds cold-tiered ClickHouse data and externalised byte content such as scenario media and datasets (docs/self-hosting/overview.mdx architecture diagram). The v3 changelog states the stack is "event-sourcing architecture" for "reliable, ordered processing", and the coding-agent session logic backs that claim with real idempotency and ordering handling: re-delivered telemetry does not inflate a session's totals, a session whose earliest signal arrives late still lists once under its true start time, and a busy session's queued contributions are "written as one batch... in the order the agent produced them" (specs/coding-agent/session-aggregate.feature).

Deployment is a Helm umbrella chart (charts/langwatch/Chart.yaml) with independently toggleable subcharts, clickhouse-serverless, gateway and langyagent, each behind its own chartManaged flag, or Docker Compose for local use (docs/self-hosting/deployment/docker-compose.mdx, seven services: app, workers, langwatch_nlp, langevals, postgres, redis, clickhouse), or `npx @langwatch/server` for a single-command demo (README.md). A one-line Helm install (`helm install langwatch ./langwatch --set autogen.enabled=true -f langwatch/examples/overlays/size-dev.yaml`) fits roughly 2.6 CPU and 6.7 Gi of requests and auto-generates its own secrets for a first run (docs/self-hosting/overview.mdx), though those auto-generated secrets are explicitly documented as unsuitable to keep past that first run.

LangWatch does not run the coding agents it watches for the "sessions" feature. Claude Code, Codex, Copilot and opencode run wherever the developer already runs them, wrapped by the langwatch CLI (langwatch claude, and so on), which sets each agent's own native OTel exporter environment variables so the agent reports its own spans, logs and metrics (docs/coding-agents/quickstart.mdx, overview.mdx). Langy is the one agent LangWatch itself runs, inside a gVisor-sandboxed pod managed by the Go langyagent service (docs/langy/how-langy-works.mdx, docs/langy/security/sandbox.mdx), shipped on by default in the same umbrella chart (langyagent.chartManaged: true).

Files and directories read: README.md, LICENSE.md, CONTRIBUTING.md (located), package.json, go.mod, charts/langwatch/Chart.yaml, top-level values.yaml keys, docs/coding-agents/{overview,sessions,pull-requests,claude-code,quickstart,headless-and-ci,repository-and-pr-attribution,privacy,secrets-redaction}.mdx, docs/self-hosting/{overview,licensing,deployment/docker-compose}.mdx, docs/langy/{overview,how-langy-works,security/sandbox,security/github-access}.mdx, docs/ai-gateway/budgets.mdx, docs/evaluations/guardrails/code-integration.mdx, specs/coding-agent/{terminal-view,session-aggregate}.feature, dev/docs/adr/ (directory listing, 152 files), docs/images/coding-agents/{terminal-replay,sessions-list,pull-request-detail}.png.

## 4. UX

For a developer already running Claude Code or Codex, LangWatch adds a session and cost view with almost no new steps. For a product manager, Langy adds a chat-to-pull-request loop with no coding agent of their own to run.

Onboarding to see a coding-agent session: run `npx langwatch claude` (or codex, copilot, gemini, opencode) in place of the normal command, sign in once in the browser it opens, then use the agent exactly as normal. The session appears on the Sessions page within about a minute. That is one command and one login before the first result, the agent's own interface is unchanged.

Three real product screenshots (docs/images/coding-agents/*.png, viewed directly, not stock images) confirm the docs. The Sessions list is a table of real runs: session, repository, branch, duration, cost and linked pull request as columns. The session's Terminal tab replays prompts, tool calls and replies in order, tool output shown as real stdout or a real diff rather than the model's own capped echo, a denied tool call shown as rejected rather than silently missing, with a fixed footer reporting duration, spans, cost, context size, tokens, model and reasoning effort, all anchored to the session's first turn no matter how far back the reader has scrolled (specs/coding-agent/terminal-view.feature). The Pull Request detail view rolls a PR up by contributor, model and the sessions that touched it, so a reviewer reads cost and session history as one record instead of reassembling it by hand.

A human intervenes on a tracked coding-agent session (Claude Code, Codex) entirely outside LangWatch, by approving or denying a tool call in their own terminal exactly as they would without LangWatch running. LangWatch only replays that decision afterwards. For Langy, a human intervenes by reading and merging, or not, the pull request on GitHub. Neither surface offers a live approval control inside LangWatch's own UI, both approval points sit one layer below it.

Interfaces: a web app (Sessions, Pull Requests, Traces, Evaluations, AI Gateway settings), the langwatch CLI (wraps an agent, or runs subcommands such as login and ingest-context), a REST and OTLP ingestion API, and an MCP server referenced in the package layout (not independently verified beyond its presence). There is no dedicated IDE plugin, the CLI wrapper is the integration point.

What beats our console: nothing to build on the developer's side, they keep their own terminal and agent CLI, and the replay, cache-health and PR-cost views exist today, ours do not. What is worse for our purposes: it is a read-only observability surface with no task queue, no approval gate of its own, and no path to deploy. It cannot replace our console, only fill the one gap it names precisely.

## 5. Security, identity, sandbox, policy, cost

Sandbox: docs/langy/security/sandbox.mdx states the chart "pins the pod to a gvisor RuntimeClass by default" and that a cluster without one leaves the pod waiting rather than silently dropping to the node's runtime, a fail-closed design. docs/self-hosting/overview.mdx, however, states plainly that "Langy, the AI assistant, is part of this install and runs on the node's normal container runtime. To harden it with a sandboxed runtime on EKS, see installing gVisor on EKS", framing gVisor as an EKS-specific opt-in rather than a universal default. The two pages read as inconsistent about the shipped default, not verified which one governs a fresh install. What is unambiguous either way: multiple conversations' workers share one pod and one network namespace, separated only by a distinct Unix UID and a 0700 home directory, and the manager drives each worker over a private stdio pipe rather than a network port. Egress is layered: an L3/L4 NetworkPolicy denies all outbound :443 by default and blocks RFC 1918, CGNAT and the cloud metadata address regardless of what a worker attempts, while an L7 CONNECT proxy adds an allow-list and a TLS SNI cross-check against the CONNECT authority to block domain fronting. The docs state this L7 layer plainly as "cooperative, not mandatory": a worker that ignores HTTPS_PROXY and dials an address directly is "monitored, not blocked, in the stock pod", and call the shared network namespace "a sibling-process boundary, not a full per-tenant boundary" (ADR-053, proposed, not shipped). A worker's storage is disposable, wiped on manager boot and again after 10 minutes idle. For a self-hosted install, egress is denied by default: networkPolicy.allowExternalHttps is false, so Langy cannot reach the internet at all until an operator enables it.

Identity: Langy's only stored secret is a GitHub App private key, held in the control plane and never sent to a worker. Every turn mints a fresh 1-hour installation token scoped to contents:write and pull_requests:write on the one targeted repository, cached in Redis for just under its life, delivered to the worker only as the GH_TOKEN environment variable, git's own credential helper reads it from there so nothing touches disk (docs/langy/security/github-access.mdx). For tracked external agents, LangWatch never holds a coding credential at all, model calls either bypass its gateway (telemetry only) or route through the AI Gateway under a virtual key, never a raw provider key.

Policy outside the model: enforced in the GitHub App's declared repository permissions, the gateway's virtual-key and budget checks, and the network allow-list, not in a Langy system prompt. There is no single Git-versioned capability document evaluated per task the way our design has, policy lives in admin settings screens and Helm values.

Cost: AI Gateway budgets apply across seven scopes, organisation, team, project, virtual key, person, group and end user, and can block or warn on breach (docs/ai-gateway/budgets.mdx). Enforcement reads a config snapshot refreshed every 60 seconds and books spend from provider-reported tokens after the call returns, so a key can keep serving for up to a minute past its limit. That is a softer real-time guarantee than a pre-flight worst-case hold, traded for a richer scope taxonomy: LangWatch can cap one noisy end user or group without capping the whole project, our current per-task and per-day envelope cannot.

## 6. What we should take from it

Narrow, things we could copy this month:

Assemble a replay transcript by ordering every event in a task's own event stream by timestamp, not by re-parsing the latest agent call. LangWatch fixed exactly this bug: the old code parsed only the last model call's rolling message history, so a 458-span, 115-tool session whose final call was a lone tool request rendered as a single collapsed step (specs/coding-agent/terminal-view.feature). Our own event-sourced session records already carry the ordering, this is a rendering problem, not a data problem, worth solving before it bites us the same way.

Copy the two-channel repository attribution: the sandbox reports its own working directory automatically, plus an explicit declare-your-context command for anything done outside it. We may not need this urgently, our tasks already know their repository before the sandbox exists, but any future step that lets an agent touch a second repository, a submodule bump, a shared library fix, would benefit from the same declare-if-automatic-fails pattern.

Keep an agent's self-reported cost figure beside the cost we compute from its token counts, rather than trusting either alone. LangWatch treats a mismatch as a drift signal that a price list or the agent's own pricing has gone stale. Cheap to add to our own per-task cost ledger once tasks report their own totals.

Mint the git credential per turn rather than per task, scoped narrowly, cached only briefly, never written to disk, wired through git's own credential helper rather than a .git-credentials file. Worth diffing against however our own Forgejo tokens are currently issued.

Redact secrets in three layers before storage, exact vendor prefixes, a shape and entropy heuristic, and contextual naming, replacing a hit with a flat marker and treating over-redaction as seriously as a leak. Worth adopting verbatim in our own telemetry ingestion once agent output routinely reaches our event store.

Broad, things that should change how we prioritise:

Treat coding-agent observability as a feature that can bolt onto agents we did not spawn, via OTel environment variables and a thin CLI wrapper, separate from watching agents we run ourselves. If anyone ever runs Claude Code locally outside a factory-spawned task, the same session-and-PR-cost join LangWatch built could apply, our current design only accounts for factory-spawned work.

A single, well-scoped budget taxonomy, organisation, team, project, key, person, group, end user, is worth adopting before, not after, the day the gateway serves more than one human. Our envelope today is per-task and per-day, that stops working the moment two people or two external callers share one key.

Langy's whole shape, a chat request in, a sandboxed read of the project's own traces and evals, a written test before a fix, a bot-authored pull request, a human merge, is a working, shipped instance of the telemetry-to-fix loop our own design aspires to. It is worth studying as a finished example even though its control plane is far thinner than ours, because it proves the loop closes in production behind a fairly small team.

## 7. Where our philosophy differs and what that costs or buys us

Pod density versus pod isolation. LangWatch runs several conversations' Langy workers in one shared, gVisor-pinned pod, separated only by Unix UID and file permissions, and its own docs name the shared network namespace as a real limit rather than a full tenant boundary. Our design gives every task its own pod and its own network namespace. Their choice is cheaper per unit of agent work, ours buys a harder boundary between two unrelated tasks, the price we pay is more pods to schedule and pay for. Copying their density model would directly weaken the isolation guarantee we have chosen as a constraint.

Pre-flight hold versus periodic reconciliation. Our gateway prices a call's worst case, clamps output to the remaining headroom, and takes a hold under a database lock before the call goes out. LangWatch's gateway checks a budget snapshot refreshed once a minute and books the real spend only after the provider replies. Theirs is simpler to build and buys a richer set of budget scopes for the same effort, ours closes a real overspend window theirs openly admits exists, up to a minute of serving past the cap. Adopting their model would trade our guarantee for their scope breadth.

Task-first versus session-first causality. Because LangWatch's tracked coding-agent sessions run on infrastructure it does not control, it has to work out after the fact which repository, branch and pull request a session belongs to, hence its two attribution channels. Our tasks are spawned already knowing their repository, branch and issue, the sandbox exists because the task does, not the other way round. We do not need LangWatch's attribution machinery, copying it wholesale would import a problem we do not have.

Funded open core versus self-built. LangWatch's SSO, RBAC, SCIM, audit log and gateway webhooks sit behind a paid Enterprise licence in the same self-hosted image. Revenue from that licence funds a team that ships roughly weekly and writes a dated decision record for almost every real choice, 152 so far. Our "no vendor-specific service, build the best model ourselves" stance means we never collect that revenue, so matching their pace of hardening has to come from our own time, not a tier we can sell.

## 8. Red flags and slop assessment

Maturity and activity look genuinely healthy: 4,888 stars, 401 forks, 36 contributors (paginated gh api count, the unpaginated call misleadingly shows 30), a commit landed today (2026-09-29), the latest release (v3.18.0) shipped two days ago, and the repository keeps 152 numbered architecture decision records under dev/docs/adr/. That level of process discipline is unusual for a project this size and argues against "readme with a landing page".

The open-core boundary is real, not marketing. Self-hosting without a licence key genuinely runs the full product, the docs state it is "uncapped: unlimited members, teams, projects" (docs/self-hosting/overview.mdx), but SSO, SCIM, role-based access control and audit logs stay behind a paid key even on a self-hosted install. The homepage footer nonetheless states a flat "Open Source, Apache2" (langwatch.ai, fetched 2026-09-29) without qualifying that enterprise identity and audit features sit outside that licence, a mild overstatement worth knowing before quoting LangWatch as a fully open reference.

The self-hosting overview page and the Langy sandbox security page disagree about whether gVisor is the default runtime for a self-hosted install, see section 5. That is a documentation inconsistency on a security-relevant default, worth resolving against an actual fresh chart install before relying on either page.

Two isolation gaps are admitted in the company's own docs rather than hidden: the shared network namespace across a pod's workers, and an L7 egress control the docs call "cooperative, not mandatory". Candour about a real limit is a positive signal about the team, the limit itself is still a limit. A self-hoster who assumes Langy is fully sandboxed by default would be wrong on the network-namespace point regardless of which gVisor default is true.

Company finances are thin next to the claims. A single EUR 1m pre-seed (February 2025, Passion Capital, Volta Ventures, Antler), around nine staff, and no later round found as of 2026-09-29. Shipping pace shows no sign of that being a problem yet, but a self-hoster planning multi-year dependence on this vendor is depending on a small, thinly funded team.

Codex support trails Claude Code by the vendor's own account, not LangWatch's fault: Codex 0.146 exports no assistant reply text over OTel at all, so a Codex session's terminal replay is prompts, tool calls and token economics only, and at least two Codex scenarios in the project's own spec suite are marked unimplemented, pending a Codex telemetry change LangWatch does not control (specs/coding-agent/session-aggregate.feature: the retention-anchor scenario and the helper-thread cost-attribution scenario). Anyone standardising on Codex should expect a thinner replay than Claude Code gets today.

## 9. Sources

Repository, cloned `git clone --depth 1 https://github.com/langwatch/langwatch.git ~/repos/market-research-clones/langwatch`, read 2026-09-29:
README.md, LICENSE.md, CONTRIBUTING.md (located), package.json, go.mod, charts/langwatch/Chart.yaml, values.yaml (top-level keys), docs/coding-agents/overview.mdx, docs/coding-agents/sessions.mdx, docs/coding-agents/pull-requests.mdx, docs/coding-agents/claude-code.mdx, docs/coding-agents/quickstart.mdx, docs/coding-agents/headless-and-ci.mdx, docs/coding-agents/repository-and-pr-attribution.mdx, docs/coding-agents/privacy.mdx, docs/coding-agents/secrets-redaction.mdx, docs/self-hosting/overview.mdx, docs/self-hosting/licensing.mdx, docs/self-hosting/deployment/docker-compose.mdx, docs/langy/overview.mdx, docs/langy/how-langy-works.mdx, docs/langy/security/sandbox.mdx, docs/langy/security/github-access.mdx, docs/ai-gateway/budgets.mdx, docs/evaluations/guardrails/code-integration.mdx, specs/coding-agent/terminal-view.feature, specs/coding-agent/session-aggregate.feature, dev/docs/adr/ (directory listing, 152 files), docs/images/coding-agents/terminal-replay.png, docs/images/coding-agents/sessions-list.png, docs/images/coding-agents/pull-request-detail.png.

Web and CLI, fetched 2026-09-29:
https://langwatch.ai (WebFetch); `gh api repos/langwatch/langwatch`; `gh api repos/langwatch/langwatch/releases`; `gh api --paginate repos/langwatch/langwatch/contributors`; https://www.vestbee.com/insights/articles/lang-watch-raises-1-m; https://siliconcanals.com/langwatch-raises-e1m-in-pre-seed-round/; https://langwatch.ai/blog/langwatch-ai-announcing-1m-funding-round-to-bring-the-power-of-evaluations-to-ai-teams; https://passioncapital.com/passion-capital-leads-langwatchs-e1m-pre-seed-an-ai-quality-control-platform/; https://tracxn.com/d/companies/langwatch (WebSearch results, not independently opened for full text).
