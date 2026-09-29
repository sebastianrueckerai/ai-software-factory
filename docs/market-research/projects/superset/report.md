---
name: Superset
slug: superset
url: https://superset.sh
repo: https://github.com/superset-sh/superset
category: multi-agent-ui
license: "mixed: Elastic-2.0 (core repo) and MIT (first-party plugins, for example plugins/slack)"
open_source: no
self_hostable: partial
hosting_model: "local execution is self-hosted and free forever. The account, relay, gate and billing control plane that every non-local surface depends on is Superset's own SaaS, with no self-host deployment path documented or shipped"
company: "San Francisco. Y Combinator backed, batch label inconsistent across sources (seen as S26, P26 and P25). Three co-founders, Kiet Ho, Satya Patel and Avi Peltz. About 4 employees. Self-reports $11M raised, Caplight lists $12M, unreconciled. Started as a November 2025 hackathon project."
maturity: "14,723 stars, 1,311 forks, 802 open issues, 126 contributors, 234 releases. Repo created 2025-10-21, last commit 2026-09-29 (today). Releasing roughly every 1 to 2 days."
similarity: 2
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 2
  verification: 1
  policy_outside_model: 1
  identity_per_task: 3
  cost_control: 0
  ux: 4
  reseedable_selfhost: 0
steal:
  - "The relay JWT and gate ticket split: one set of host-service procedure names, callable identically from CLI, MCP, mobile or web, addressed differently only by where the work physically runs. A template for giving factoryd one API that future surfaces can share."
  - "Audience-scoped signed tokens where the executor holds only the verification public key and can never mint its own. Worth checking our own gateway-verified tokens give the same guarantee."
  - "Stripping all identity material, workspace id, git token, agent credentials, before a sandbox is promoted to a shared golden fork base. Apply the same rule to any template or base image we let agents fork."
  - "Per-terminal, short-lived, host-issued attribution tokens kept separate from the main host auth token. Finer grained than one identity per task."
  - "An explicit, commented tool allowlist for a chat-triggered agent. Worth copying if we ever add chat intake."
  - "A reaction emoji as an in-progress indicator, plus an explicit thread quiet, stop and hand-back state machine for async chat sessions. Cheap and effective."
differs:
  - "Harness adapters observe an unmodified CLI agent through its own hooks and transcripts and never mediate tool calls, so enforcement is whatever the agent itself provides, or nothing. Incompatible with policy living outside the model."
  - "The one place they do isolate, cloud sandboxes, defaults to allow-all egress through a credential-injecting proxy rather than default-deny. Incompatible with security without half measures."
  - "The default, free, higher-usage tier, local desktop mode, has no process isolation at all, by the README's own admission. The opposite of our always-sandboxed-per-task rule."
  - "No ledger or cap on coding-agent model spend anywhere in the product, by design, since Superset states it never touches model traffic. A structural difference from our budget-holding model gateway, not something to import as is."
  - "Every non-local surface depends on Superset's own hosted accounts, relay, gate and billing with no self-host path shipped, despite the licence permitting internal self-hosting. The opposite of our re-seedable, commodity-hardware requirement."
ux_verdict: "Richer moment to moment surface for a human watching a handful of agents than our console offers today, but built around a present human, not unattended task throughput."
slop_verdict: "Real and actively shipping but eleven months old, and its own and outside marketing round a source-available Elastic licence up to open source."
---

# Superset

## 1. What it is

Superset is a desktop-first tool for running several coding agents on the same repository at once, each in its own git worktree, reviewed from one place. It is made by three repeat Y Combinator founders (Kiet Ho, Satya Patel, Avi Peltz) as a roughly four-person San Francisco company, started as a November 2025 hackathon project. It is free forever for local, single-user use, and sold as a subscription (Pro, Enterprise) for remote access, mobile review, Slack and Linear integration, and organisation controls.

The makers claim one core behind every surface, desktop, web, CLI, MCP, SDK, Slack and an iPhone app, so a task started in Slack can be finished on a phone. The repository shows that claim is true for the machine-level operations (git, terminal, agent process, file diff): they all go through one local API reached identically from any surface. It is not true for the wider product: accounts, billing, organisations and automations are a second, cloud-only API that a self-hoster never gets a copy of.

## 2. Mapping to our five planes

| Plane or principle | What Superset does | What we do | Verdict |
|---|---|---|---|
| Signals | Slack app-mention and message events, Linear webhooks, GitHub PR-comment feedback to a running agent, a Sentry error webhook, and cron-like Automations | Forgejo issue and webhook intake, SigNoz alert webhooks, every task a Forgejo issue | equal (comparable breadth, different shape) |
| Control plane | A Postgres-backed cloud API tracking accounts, organisations, workspaces, tasks and billing. Durable, but it is workspace and billing state, not a policed task lifecycle | factoryd with one Temporal workflow per task, Git-versioned capability policy, budgets, approvals, a cost ledger and an audit trail | we lead |
| Worker plane | The user's own unmodified CLI agent binary launched as a subprocess in a pty, inside a git worktree or a cloud sandbox VM. The harness only watches, via the agent's own hooks and transcript | One gVisor pod per task behind a Go Harness interface, read-only root filesystem, non-root, default-deny egress | we lead on isolation and on owning execution, they lead on breadth of pre-integrated agent binaries |
| Verification | In-app diff, PR and CI-check viewing on desktop and mobile. No built-in gate or model review before merge, a human clicks merge | Forgejo Actions on gVisor runners, path-risk classes, a reproduction gate, then a stronger-model review with a strict verdict before a bot-only merge | we lead |
| Merge and deploy | An ordinary GitHub PR merge, from desktop, CLI or phone. No deploy step of its own | Bot-only merge after approval or an auto rule, Flux deploy, a staged rollout with an alert-free soak window | we lead, not really comparable in scope |
| Policy outside the model | None as a rule. The underlying CLI agent's own permission system decides, or it is deliberately bypassed in cloud sandboxes. The one coded exception is a hand-built allowlist for the Slack bot | Gateway-enforced, per-call capability policy read from a Git file, independent of the model | we lead |
| Identity per task | Audience-scoped signed tokens, a JWT per personal host or a short-lived ticket per cloud workspace. The executor cannot mint its own token | Projected, audience-scoped, kubelet-rotated ServiceAccount tokens verified against the cluster OIDC issuer | equal, a genuinely close parallel on a different substrate |
| Artifacts not chat | Git is the artifact, but Slack is an intentional chat front end, and the mobile app has its own chat composer | A TaskBrief document in, a branch, a PR and an event stream out. No chat surface | differs by design |

## 3. Architecture and stack

Superset is a Bun and Turborepo TypeScript monorepo: an Electron desktop app, an Expo and React Native iOS app, Next.js marketing and docs sites, a cloud control-plane API, and two Cloudflare Workers (a gate and a relay) built on Hono and Durable Objects.

tRPC is the API layer everywhere, but there are two separate routers. One is the cloud router: accounts, organisations, billing, tasks, automations, plugins, connectors. The other is the local router that runs on whichever machine actually holds the git checkout, and handles workspace, terminal, git and agent-session mechanics.

"One core, many surfaces" is concretely true for the local router only. Every non-cloud surface, CLI, MCP server, mobile app, and desktop's own remote-access mode, calls host-service procedures by the same name. A personal machine is reached through the relay, with a bearer token scoped to that organisation and host. A cloud sandbox is reached through the gate, with a bearer ticket scoped to that workspace. This is confirmed directly in the MCP package's host-service client module, whose call function branches only on which of those two option shapes it receives, then calls the same procedure name either way. For factoryd, the equivalent move is not one literal API for everything, it is one procedure surface reachable through more than one address and auth scheme depending on where the work runs, so a future mobile or CLI client would consume the same calls the web console does today rather than a bespoke subset.

Harness adapters parse one vendor's own hook events and on-disk session transcript to classify a terminal as idle, working, done or waiting, and to track subagents the tool spawned. This is a thin, passive supervisor. It never mediates a tool call and does not own the execution loop, unlike our Go Harness interface.

Cloud sandboxes are built from a content-addressed rootfs, asset and step bundle, booted through a hosted sandbox VM provider. A release step builds a golden image, probes a fork of it including a stop and a wake, then writes environment rows only if the probe passes.

The repository's own docker-compose file runs Postgres, an HTTP-proxy shim, and a Redis shim, each commented as local dev only. This is a developer convenience for hacking on Superset itself, not a production self-host recipe. No Helm chart or self-host deployment manifest exists anywhere in the repository, which is why self_hostable above is scored partial rather than yes, despite the README's own claim that the licence lets a team self-host it for their team.

Superset's own code never proxies coding-agent model traffic. Users bring their own agent subscription or API key, and the product states this directly in its own model policy document. The one exception is the Slack conversational assistant, which calls the model provider directly by itself, with its own four-minute run budget.

## 4. UX

Getting to a first result takes about three steps: open a repository in the desktop app, pick an agent, type a prompt. While an agent works, a sidebar status flips between working and done, a live terminal pane streams output, a diff viewer shows changes as they happen, and an in-app browser pane can preview a running dev server. A "Design Mode" lets a user click a UI element in that preview and send it as context for a requested change. A user intervenes by typing into the terminal or composer at any point, or, from Slack, by replying in the same thread, which the thread's own quiet, stop and hand-back state machine picks up. Stopping a task means closing the workspace or telling the Slack thread to stop.

The mobile app (iPhone only, Superset Pro, iOS 26 or later, requires a host machine online with remote access on) is a genuine second UI, not a cut-down view. Screens exist for a files-changed diff, PR checks, PR reviewers, and a merge action, confirmed by file and hook names in the mobile app's source tree. The screens' internal logic was not read, so any claim about exact mobile diff rendering beyond "the screen and hook exist" is not verified.

Compared with our console, Superset is richer for a human sitting with a handful of agents: live preview, design mode, a command palette, a mobile app. Our console has none of that today, a gap our own vision document already names (no real-time stream of an agent's work, no diff view, no mobile view). Our console is stronger for the opposite case, many queued, running, waiting and done tasks a human dips into rather than watches: a kanban board across tasks and a human-approval lane, which Superset's flatter per-workspace list does not really offer. Superset is built around a present human. We are built around one that mostly is not.

## 5. Security, identity, sandbox, policy, cost

Sandbox. Two tiers exist. The default, free, higher-usage tier is a plain git worktree on the user's own machine with no process isolation. The README says this outright: worktrees separate working files, they do not sandbox processes or prevent merge conflicts. The agent runs as the user, with the user's shell, keys and network all reachable. The paid cloud-sandbox tier adds real VM isolation, but the network policy defaults to allow, routed through a per-domain, credential-injecting TLS proxy, not default-deny. The sandbox_isolation axis scores 2, present, but off for most usage and permissive where it is on.

Policy. No capability policy is enforced independent of the running agent. Cloud sandboxes run as root with permission prompts pre-accepted in the baked agent config, meaning the coding agent's own prompts are bypassed and the VM boundary is the only remaining control. The one coded exception is the Slack bot's explicit tool allowlist. The policy_outside_model axis scores 1.

Identity. This is the strongest parallel to our own design. Personal-host access uses an organisation- and host-scoped token through the relay. Cloud-sandbox access uses a workspace-scoped, short-lived ticket through the gate. The sandbox itself holds only a public verification key and cannot mint tokens. GitHub access tokens are short-lived and refreshed automatically, an hour for an app-installation token, eight hours for a personal token, refreshed on a thirty-minute loop. Local git access goes through a per-invocation askpass temporary script rather than a stored credential. A shared "golden" environment strips all identity files before it becomes a fork base. The identity_per_task axis scores 3.

Cost. There is no ledger and no cap on coding-agent model spend anywhere in the product, by design, since Superset states it never touches that traffic. An organisation's exposure is whatever each member's own agent subscription allows. Billing exists only for Superset's own seat and feature pricing. The cost_control axis scores 0.

## 6. What we should take from it

Narrow, this month. The relay-token and gate-ticket split is a clean template for giving factoryd one procedure surface that a future mobile or CLI client can call the same way the web console does, addressed differently only by where the work runs. The pattern of stripping all identity material before a sandbox becomes a shared fork base applies directly to our own per-task sandbox templates. Per-terminal, short-lived attribution tokens kept separate from the main host auth token are a finer grain of identity than we currently issue. If we ever add chat intake, their explicit, commented tool allowlist for a chat-triggered agent, and the reaction-emoji-as-progress-indicator with a thread quiet and stop state machine, are both small and worth copying whole.

Broad. The product bet that a human stays present and watches, live preview, design mode, one-click diff review, mobile follow-up, is a different product shape from ours. But the underlying gap it plugs, seeing what a running agent is doing and nudging it without waiting for the task to finish, is one we genuinely lack, named directly in our own vision document as no real-time stream of an agent's work and no diff view. Closing that gap in our own console, streaming the harness's events, adding a diff view, fits our existing plane and does not require adopting their chat-first shape.

Mobile review specifically: not worth building as a native app. Superset's iPhone app required a full mobile codebase, a Pro subscription gate, a recent iOS floor, and it only works as a thin client through their relay to a live host machine, a large and ongoing investment. Forgejo's own mobile web view already renders diffs, checks and a merge button in a phone browser today, at zero additional engineering cost, with a plainer but working review experience. The gap worth closing is the shared one above, a live diff and event view in the web console, which would improve both desktop and mobile-web review at once. A dedicated native app would only improve mobile, and would cost roughly what Superset has visibly spent to build and keep one, a second codebase, a relay, a video and terminal-streaming path.

## 7. Where our philosophy differs and what that costs or buys us

Superset's harness adapters observe an unmodified CLI agent through its own hooks and transcripts. They never mediate a tool call. Enforcement is whatever the underlying agent provides, or nothing, since cloud sandboxes ship with the coding agent's own permission prompts pre-accepted. Copying this would break policy living outside the model: we would lose the guarantee that a capability change takes effect no matter which model or harness is running. Their approach buys near-zero integration cost per new agent, since any CLI tool with hooks and a session transcript format works, which is why they support several agent brands out of the box and we support one. That is a genuine price of our stricter design, not a mistake on either side.

Their default-allow, credential-injecting egress model, the one place they do isolate, would break security without half measures if copied outright. It is also the more permissive setting behind the one documented security incident on record, a launch command briefly showing an API key in plain text, though the fix there, a watchdog pre-answering a trust prompt using only a key hash, was independent of the egress policy itself.

Superset's SaaS-only control plane is the mirror of our re-seedable, commodity-hardware constraint. Every non-local surface depends on Superset's own hosted accounts, relay, gate and billing, with no self-host path shipped even though the licence text would allow internal self-hosting. That fits a subscription business selling the multi-surface, multi-user layer. It is incompatible with our requirement to delete everything and rebuild from Git, S3 and an offline seed bundle.

## 8. Red flags and slop assessment

Real, maintained, used in anger. Roughly one release every one to two days across eleven months, 126 contributors, a last commit today, and a security policy with a named past incident and a stated no-LTS policy, only the latest released version receives security fixes. The contributing guide documents developing Superset inside a Superset workspace. This is not a landing page with no engine behind it.

Marketing ahead of the licence. The root licence is the Elastic License 2.0, a source-available licence, not OSI open source, that explicitly bars offering Superset to third parties as a hosted or managed service. At least one third-party write-up found in search results called it a fully open-source, Apache-licensed project, which is wrong. Superset's own README is more careful, it says use it, fork it, modify it, self-host it for your team, but still invites a reader to round that up to open source.

No LTS and a young codebase. The project is eleven months old with several hundred open issues against well over two hundred releases, and security fixes are promised only for the latest version, so a team pinned to an older release has no patch path.

Company facts do not fully reconcile. The Y Combinator batch label varies across sources seen during research. The seed round is reported as two different figures by two different sources. Both are left as not verified rather than resolved here.

## 9. Sources

- Local clone of the repository, cloned shallow and read at a local path outside this worktree, with the repository's own commit log checked for the last commit date.
- GitHub's API for the repository, and its contributors and releases pages, for stars, forks, open issues, contributor count, release count, licence badge and creation date.
- Files read in full: README.md, LICENSE.md, package.json, AGENTS.md, SECURITY.md, docker-compose.yml, the Slack plugin manifest, the MCP package's server manifest and index and host-service-client modules, the host-service terminal-agents types module, the trpc root router module, the sandbox package README, the review-host app README, the environment-variables doc, and the cloud-sandbox-acceptance doc through roughly its sixth section (later sections not read).
- Files read in part: CONTRIBUTING.md, the Slack integration's run-agent and process-agent-message modules, the host-service git askpass provider, and the sandbox-credential-refresh runtime module.
- Existence confirmed by directory listing only, contents not read: the mobile app's files-changed screen, its pull-request merge and actions hooks, its PR check and reviewers screens, its diff-view store, and the API's Sentry webhook route and normaliser.
- The project's own homepage, fetched directly.
- General web search for independent coverage, the project's Y Combinator listing, third-party funding trackers, and at least one third-party review that mischaracterised the licence. Exact URLs for these were not retained after a context compaction in this session, so they are cited by source description rather than link, and the underlying claims are marked not verified in the prose above where that matters.
