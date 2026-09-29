---
name: Cyrus
slug: cyrus
url: https://www.atcyrus.com
repo: https://github.com/cyrusagents/cyrus
category: factory-orchestrator
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted for free (own Linear/GitHub/Slack apps), or self-hosted with Cyrus's paid cloud networking layer (Pro 50 USD/mo, Team 120 USD/mo), or fully cloud-hosted (Enterprise, custom price). Model cost is bring-your-own-key/subscription on every tier.
company: Ceedar AI Inc., Victoria BC, Canada. Founded 2023 as an AI-bookkeeping startup, pivoted to Cyrus. Reported 200k USD pre-seed (Metalab Ventures and angels, mid-2025), raised for the bookkeeping business, not confirmed as Cyrus-specific.
maturity: 833 stars, 174 forks, 118 open issues, 26 contributors, created 2025-04-19, last commit 2026-09-28, 66+ releases at roughly weekly cadence
similarity: 2
axes:
  signals_intake: 3
  control_plane: 1
  sandbox_isolation: 1
  verification: 0
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 0
  ux: 4
  reseedable_selfhost: 3
steal:
  - Typed, incremental activity stream posted into the issue during the run (thought/action/response/error), not just a final comment. Even without Linear's native agent-session API, we can emulate the pattern against a Forgejo issue with edited/appended comments keyed by session id.
  - Label-driven tool and prompt presets (Cyrus's labelPrompts): a label on the issue selects a system prompt and an allowed-tool list (readOnly/safe/all/custom). Cheap, config-only policy knob worth copying for Forgejo labels.
  - Routing priority chain for multi-repo setups (teamKeys > projectKeys > routingLabels, most specific wins): a clean, declarative pattern for mapping an incoming issue to a workflow or model tier.
  - One-question-at-a-time inline approval ("select signal") surfaced directly in the issue thread as a dropdown, instead of a separate approvals UI. Worth trying for our console's human lane.
  - userAccessControl allow/blocklist of which requesters may delegate to the agent, with a configurable silent-vs-comment block. A cheap trust-boundary knob at the comment layer, complementary to our "only write-access steers a task" rule.
  - Per-PR FIFO event queue that serialises same-PR comment webhooks instead of letting concurrent sessions race on one PR. Simple, worth having wherever we allow follow-up comments on a task already in flight.
differs:
  - Cyrus runs as, and with the full permissions of, the host machine's already-authenticated git/gh/glab user. There is no task-scoped or short-lived credential anywhere. This is the opposite of "identity belongs to the task, not the machine" and is not something to copy even partially.
  - No sandbox. Git worktrees give filesystem isolation for parallel runs, not a security boundary, and the only network control is an optional, off-by-default HTTP/SOCKS egress proxy that filters Bash subprocess traffic and explicitly leaves the harness's own file and inference tools untouched. Adopting this would break "security without half measures."
  - No control plane. State is one flat JSON file written from an in-process daemon, with an in-process semaphore for concurrency. There is no durable workflow, no audit trail, no approvals-as-state. Fine for a single operator's laptop, not a substitute for Temporal and Postgres.
  - No cost governance anywhere in the code, no cap, no ledger, no hold. Cyrus is BYOK by design so this is a deliberate non-goal for them, but it is a hard requirement for us.
  - No verification plane. Cyrus creates a PR and stops; there is no CI gate, no policy gate, no model review wired into the flow. All correctness checking is left to whatever the human reviewer or the target repo's own CI does.
ux_verdict: The live "workpad" stream and inline approvals are genuinely better than our console for Linear issues, but Cyrus quietly downgrades to a start-reaction plus one final comment for GitHub and GitLab issues, which is worse than the workpad the marketing implies.
slop_verdict: Real and actively used, not a README with a landing page, 66+ releases on a near-weekly cadence, 26 contributors, a funded company selling a paid tier on top of it, and customer names on the homepage, but the security marketing (SOC 2 badge, "enterprise-grade") outruns a codebase that gives the agent the operator's own git identity.
---

# Cyrus

## 1. What it is

Cyrus is a background daemon that lets a Linear, GitHub, GitLab, Slack or Zulip issue be assigned to a coding agent the same way it would be assigned to a person. It watches for assignment events, spins up a git worktree, runs a harness (Claude Code, Codex, Cursor, Gemini or OpenCode) against the issue, and posts progress and a final PR back to the tracker. It is made by Ceedar AI Inc., a small Victoria, BC company that originally built an AI-bookkeeping product and turned an internal tool into Cyrus, now its main product (README.md, CONTRIBUTING.md in the clone).

The project markets itself as "the BYOK solution for Claude Code in Linear": you supply your own model API keys or Claude Code subscription, and Cyrus supplies the plumbing between the tracker and the harness. It is Apache-2.0 licensed and free to self-host end to end with your own Linear OAuth app, GitHub App and Slack App (docs/SELF_HOSTING.md). Ceedar also sells a hosted layer on top: Pro at 50 USD/month and Team at 120 USD/month provide a managed Linear app and networking so you do not run your own OAuth infrastructure, and an Enterprise tier adds dedicated infrastructure and unlimited repositories (atcyrus.com/pricing, fetched 2026-09-29). A fully cloud-hosted option (no self-hosting at all) is also offered through app.atcyrus.com.

What the makers claim: "enterprise-grade security," a SOC 2 Type I badge, and customer logos including Retool, Suno, Airbyte and TinyFish, with claims of "20x faster" delivery and PRs "90-95% complete on first pass" (atcyrus.com homepage, fetched 2026-09-29). What the repository actually shows: no per-task sandbox, no scoped credentials, and a progress-streaming feature that only fully works for Linear. The gap between the marketing and the code is the single most important finding of this report.

## 2. Mapping to our five planes

| Plane / principle | What Cyrus does | What we do | Verdict |
|---|---|---|---|
| Signals | Issue assignment (or a routing label) on Linear, GitHub, GitLab, plus Slack/Zulip mentions, triggers a session. No telemetry or alert intake. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. Forgejo only. | Not comparable: they cover more trackers, we cover more signal types |
| Control plane | A single in-process daemon, state in one JSON file (PersistenceManager.ts, format v4.0), an in-process semaphore for concurrency. No workflow engine, no audit trail. | factoryd with a Temporal workflow per task, Postgres, policy as YAML in Git, cost ledger, approvals as state. | We lead |
| Worker plane | Harness runs as a local subprocess (or the harness's own SDK call) inside a per-issue git worktree on the same host as the daemon. No container or VM isolation. | One gVisor pod per task, own namespace and ServiceAccount, read-only root filesystem, default-deny egress. | We lead |
| Verification | None. A PR is opened; whatever CI the target repo has is the only gate. | Forgejo Actions on isolated runners, policy gates (risk class, migration flag, reproduction), then a stronger-model review with a strict verdict. | We lead |
| Merge and deploy | Human merges the PR by hand in the tracker's own UI. Cyrus does not touch merge or deploy. | Bot-only merge after a whitelisted human approves, or an auto rule for reproduced strictly-improving changes; Flux deploys with a staged rollout. | We lead |
| Policy outside the model | labelPrompts, userAccessControl and tool presets (readOnly/safe/all) are config, enforced by the code that builds the harness invocation, not by asking the model to behave. | Capability policy is a document in Git, versioned in the database, enforced in gateway code and network policy. | Equal in kind, we are more thorough |
| Identity per task | None. The daemon runs, and the harness runs, as the operator's own already-authenticated git/gh/glab identity (docs/GIT_GITHUB.md). Git tokens for GitHub/GitLab apps are the only scoped credential, and only for those two trackers. | A projected, audience-scoped ServiceAccount token per task, verified by factory-gateway against the cluster OIDC issuer; the sandbox holds no key material. | They lead |
| Artifacts not chat | A prompt is built per session, and the output is a PR plus an activity log for Linear. For GitHub/GitLab the exchange is closer to comments than a structured artifact stream. | TaskBrief in, branch/PR/normalised event stream out, for every tracker. | We lead |

## 3. Architecture and stack

Cyrus is a pnpm/TypeScript monorepo (cloned to ~/repos/market-research-clones/cyrus, see CONTRIBUTING.md for the package layout). The daemon (apps/cli) is a long-running Node process, meant to run under tmux, pm2 or systemd on a machine the operator controls (docs/SELF_HOSTING.md). Configuration is a hot-reloaded ~/.cyrus/config.json plus a ~/.cyrus/.env for secrets.

Event handling is split by tracker into separate transport packages: packages/github-event-transport, a GitLab equivalent, and Linear's own webhook/SDK path. GitHubMessageTranslator.ts (545 lines) is the real generic normalisation layer, turning GitHub webhook payloads into tracker-agnostic SessionStartMessage/UserPromptMessage types. Linear does not use this layer: packages/core/src/issue-tracker/AgentEvent.ts defines AgentEvent as a direct alias of Linear's own webhook payload type, and types.ts re-exports AgentSessionStatus, AgentActivityType, AgentActivityContent and AgentActivitySignal straight from @linear/sdk, with a comment stating "Linear SDK is the source of truth." So there are two normalisation layers of different depth: a real cross-tracker one for GitHub/GitLab, and a Linear-shaped one that the rest of the session/activity machinery (AgentSessionManager.ts, ActivityPoster.ts) is actually built around.

Harness adapters live in packages/claude-runner, codex-runner, cursor-runner, gemini-runner and opencode-runner, each wrapping that CLI's own SDK or subprocess protocol. Webhook signature verification is per-transport (HMAC checks found in GitHubEventTransport.ts and SlackEventTransport.ts); inbound IP filtering is handled separately by packages/core/src/security/WebhookIpValidator.ts, which checks the source IP against published Linear IP lists and GitHub/GitLab CIDR ranges (packages/core/src/trusted-domains.ts holds a companion allowlist of about 200 domains matching Claude Code's own web-access "trusted" preset). Persistence is packages/core/src/PersistenceManager.ts: one atomically-written JSON file at ~/.cyrus/state, with migration logic from older format versions, holding sessions, activity entries and an issue-repository cache. There is no database and no workflow engine. Deployment is an npm install, not a Helm chart or container image; the project ships no Dockerfile of its own for the daemon.

## 4. UX

For a Linear repository, the path from zero to a first result is short: npx skills add ceedaragents/cyrus -g, run the /cyrus-setup slash command inside a Claude Code session, and answer its prompts for Linear/GitHub credentials (README.md). Once running, assigning an issue to the Cyrus agent user starts a session. What the user sees is Cyrus's strongest feature: a live sequence of typed AgentActivity entries (thought, action, response) appended to the issue as the agent works, plus one-question-at-a-time inline approvals rendered as a dropdown in the issue thread when the agent needs a decision (AskUserQuestionHandler.ts). This is close to the "workpad" this report set out to look for.

That workpad only exists for Linear. getActivitySinkForRepo in EdgeWorker.ts returns undefined unless the repository config also carries a linearWorkspaceId, which routes GitHub and GitLab sessions to a NoopActivitySink internally; those users see a start-time emoji reaction and then a single final comment with the summary and PR link, posted by GitHubCommentService.postIssueComment or postReviewCommentReply (three methods total in that file: post comment, reply to a review comment, add a reaction). Intervention for non-Linear trackers is limited to posting another comment on the issue or PR, which Cyrus queues per PR rather than dropping. There is no dedicated web console; the tracker's own UI is the UI. Cyrus's own hosted dashboard (app.atcyrus.com) exists for configuration and billing on the paid tiers but was not explored, since it requires signing in.

Compared with our console, which we already flag as "functional, not designed" with "no real-time streams of the agent's work," Cyrus's Linear-only activity stream is a concrete example of what a workpad should feel like: incremental, typed, and attached to the same thread the human already watches. The cost of that is real: it does not exist for two of Cyrus's three main trackers, and it does not exist at all in our current console for any tracker.

## 5. Security, identity, sandbox, policy, cost

Identity: Cyrus has no task-scoped credential. The daemon and the harness it spawns run as, and with the full authority of, whatever git/gh/glab identity is already logged in on the host machine (docs/GIT_GITHUB.md), which explicitly recommends a "dedicated account" as the only mitigation. GitHub and GitLab App installations do issue a scoped installation token, but that only covers those two trackers' API calls, not the git identity used inside the worktree.

Sandbox: there is no process or filesystem sandbox. Git worktrees (docs/SELF_HOSTING.md) isolate parallel sessions from each other's working directory, nothing more. An optional, off-by-default HTTP/SOCKS egress proxy (docs/CONFIG_FILE.md, "Sandbox (Network Egress Control)") can allow- or deny-list domains for Bash subprocess network calls, with a "trusted" preset matching Claude Code's own roughly 200-domain web allowlist; it explicitly does not restrict the harness's own file read/write/edit tools. Any real process-level sandboxing (bubblewrap) is a preflight-checked feature of the underlying Claude Code SDK itself (packages/claude-runner/src/sandbox-requirements.ts), applicable to one harness, not something Cyrus enforces uniformly across Codex, Cursor, Gemini or OpenCode.

Policy: enforced in code, not only in the prompt, for the pieces that exist. labelPrompts maps a Linear label to a system prompt and an allowed-tool preset (readOnly/safe/all/custom array); userAccessControl allow/blocklists which requesters may delegate to the agent. Neither is a capability system as granular as ours, but both are real code-level gates, not just instructions to the model.

Cost: absent. No spend cap, no ledger, no hold was found anywhere in the codebase. Cyrus is BYOK, so model spend happens directly against the operator's own provider account, invisible to Cyrus. The only related knob is maxTurns, a per-session turn-count limit, not a monetary one. Cyrus's own docs note the daemon typically uses three to five times the tokens of running the harness locally, which the operator absorbs with no visibility from Cyrus itself.

## 6. What we should take from it

Narrow, copyable this month: the typed incremental activity pattern (thought/action/response/error posted as the session runs, not just a final comment) is worth emulating against Forgejo comments, even without a native agent-session API; we would key activities by session id and edit or append a running comment rather than posting a stream of separate ones. labelPrompts-style label-to-tool-preset mapping and userAccessControl's allow/blocklist are both small, self-contained config features we could add to factoryd's intake without any architecture change. The per-PR FIFO queue for concurrent comment webhooks is a one-file pattern worth having wherever we accept follow-up instructions on a task already running.

Broad, product-shape level: Cyrus proves that "assign the issue to the agent, watch it work in the issue thread" is a viable and apparently well-liked UX for at least one tracker's users, and that the richness of that experience is what people notice and pay for, more than the model or the harness underneath. Our console's real-time-stream gap is exactly the gap Cyrus's Linear integration fills. The other broad lesson is a caution: Cyrus's simplicity (one daemon, one JSON file, no sandbox, no cost control) is what let it ship fast and support five harnesses and five trackers with a small team, but it is also exactly the set of things our four constraints require us not to skip. We should take the UX ambition, not the infrastructure shortcuts.

## 7. Where our philosophy differs and what that costs or buys us

Identity is the clearest break. Cyrus's "run as the operator's own git identity" is the opposite of "identity belongs to the task, not the machine," and there is no partial version of this worth adopting; short-lived, task-scoped credentials are a hard requirement for us, not a nice-to-have Cyrus happens to skip.

Sandboxing is the same story. Cyrus's git-worktree-only isolation and optional Bash-only egress proxy would fail "security without half measures" outright. Their approach is cheaper and faster to build, which is exactly the trade a single-operator BYOK tool can make and a factory offered as an enterprise-grade portfolio piece cannot.

Cost control is a deliberate non-goal for Cyrus (BYOK means the user's own provider bill is the only ledger), whereas our budget system with hard caps and holds is core to the design. Copying Cyrus here would mean giving up the one control that keeps a "largely autonomous" factory from running up an unbounded bill unattended, which is not an acceptable trade for us even though it buys Cyrus a much simpler codebase.

Verification is absent from Cyrus by design: it treats "open a PR" as the finish line and leaves testing and review to the target repository. Our staged verification plane (deterministic checks, policy gates, model review) is precisely the piece that lets us grant more autonomy (an auto-merge rule) without more risk; Cyrus cannot offer that because it has nothing to make the risk claim on.

## 8. Red flags and slop assessment

The project is genuinely active: 66+ releases at roughly weekly cadence, the last commit on 2026-09-28, 26 contributors, and a company (Ceedar AI) that sells a paid tier on top of the free open-source core, which is a strong signal of real usage rather than an abandoned demo.

Two smaller flags. First, a licence inconsistency: the root package.json declares "license": "MIT", while the actual LICENSE file, README.md, CONTRIBUTING.md and GitHub's own API (spdx_id: "Apache-2.0") all say Apache-2.0. This looks like a stale field rather than a real relicensing, but it is worth flagging to anyone vetting the licence programmatically. Second, the homepage's security claims (SOC 2 Type I, "enterprise-grade security," OAuth, webhook verification, "isolated workspaces") are true as far as they go (webhook HMAC and IP validation are real, see WebhookIpValidator.ts) but "isolated workspaces" refers to git worktrees, not a security sandbox, and the marketing does not mention that the agent runs with the operator's own git and GitHub/GitLab credentials. That gap between claim and code is the main thing to watch if evaluating Cyrus for anything beyond a single trusted operator's own repos.

No security incidents, licence rug-pulls or open-core gating were found in the search for this report. Pricing tiers gate the managed OAuth/networking layer and support SLAs, not core functionality; the free self-hosted path is feature-complete against the paid one aside from setup convenience and multi-workspace/repository caps (Pro: up to 5 Linear workspace members, up to 5 active repositories).

## 9. Sources

https://github.com/cyrusagents/cyrus (cloned to ~/repos/market-research-clones/cyrus, git log -1: 2026-09-28)
gh api repos/cyrusagents/cyrus (stars, forks, open issues, licence, created date, fetched 2026-09-29)
~/repos/market-research-clones/cyrus/README.md
~/repos/market-research-clones/cyrus/CONTRIBUTING.md
~/repos/market-research-clones/cyrus/LICENSE
~/repos/market-research-clones/cyrus/package.json
~/repos/market-research-clones/cyrus/docs/SELF_HOSTING.md
~/repos/market-research-clones/cyrus/docs/CONFIG_FILE.md
~/repos/market-research-clones/cyrus/docs/GIT_GITHUB.md
~/repos/market-research-clones/cyrus/packages/core/src/issue-tracker/AgentEvent.ts
~/repos/market-research-clones/cyrus/packages/core/src/issue-tracker/types.ts
~/repos/market-research-clones/cyrus/packages/core/src/PersistenceManager.ts
~/repos/market-research-clones/cyrus/packages/core/src/security/WebhookIpValidator.ts
~/repos/market-research-clones/cyrus/packages/core/src/trusted-domains.ts
~/repos/market-research-clones/cyrus/packages/github-event-transport/src/GitHubMessageTranslator.ts
~/repos/market-research-clones/cyrus/packages/github-event-transport/src/GitHubCommentService.ts
~/repos/market-research-clones/cyrus/packages/edge-worker/src/EdgeWorker.ts
~/repos/market-research-clones/cyrus/packages/edge-worker/src/AgentSessionManager.ts
~/repos/market-research-clones/cyrus/packages/edge-worker/src/ActivityPoster.ts
~/repos/market-research-clones/cyrus/packages/edge-worker/src/AskUserQuestionHandler.ts
~/repos/market-research-clones/cyrus/packages/edge-worker/src/sinks/IActivitySink.ts
~/repos/market-research-clones/cyrus/packages/edge-worker/src/sinks/LinearActivitySink.ts
~/repos/market-research-clones/cyrus/packages/edge-worker/src/sinks/NoopActivitySink.ts
~/repos/market-research-clones/cyrus/packages/claude-runner/src/sandbox-requirements.ts
https://www.atcyrus.com (homepage, fetched 2026-09-29)
https://www.atcyrus.com/pricing (fetched 2026-09-29)
https://linear.app/integrations/cyrus (found via WebSearch, 2026-09-29)
https://hookdeck.com/webhooks/platforms/how-to-run-claude-code-as-a-linear-agent-with-cyrus-and-hookdeck-cli (found via WebSearch, 2026-09-29)
WebSearch: Cyrus atcyrus.com Ceedar Linear agent funding company (2026-09-29)
WebSearch: Cyrus Linear agent atcyrus reddit OR hacker news review (2026-09-29)
