---
name: Happy
slug: happy
url: https://happy.engineering
repo: https://github.com/slopus/happy
category: multi-agent-ui
license: MIT
open_source: yes
self_hostable: yes
hosting_model: hosted relay (free) by default, or self-host with one command, "happy server" (embedded PGlite, no external Postgres/Redis/S3)
company: No company found. Copyright holder is "Happy Coder Contributors". Top committers (ex3ndr, bra1nDump) read as an independent two-to-three person team. No funding, HQ or incorporation disclosed anywhere in the repo or site.
maturity: 23,944 GitHub stars, 71 contributors, first commit 2025-07-18, last commit 2026-09-27, weekly-ish tagged releases (cli-1.2.2 through cli-1.2.5 in recent weeks)
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 0
  ux: 5
  reseedable_selfhost: 3
steal:
  - the hasActiveUiClient presence check, which suppresses a push when a desktop or web client already shows the same session, plus an explicit sent/partial/suppressed/no_tokens/failed outcome on every push so a silent push outage cannot hide for months again
  - the QR-pairing key exchange, an ephemeral NaCl box keypair drawn on the terminal as a QR code, phone encrypts its reply to that public key, so the relay carrying the handshake never sees the resulting shared secret
  - ship a single-binary, embedded-database self-host path ("happy server" over PGlite) as a first-class alternative to the hosted service, with an explicit "fail closed, no silent fallback to the hosted relay" rule if self-host is misconfigured
  - wrap the agent process with Anthropic's own "@anthropic-ai/sandbox-runtime" package for OS-level read/write path and network-domain restriction, instead of writing a bespoke sandboxer
  - a named decision enum on every approval (approved, approved_for_session, denied, abort) instead of a bare yes/no, so "allow this tool for the rest of the session" is a first-class state, not a client-side hack
  - one shared, versioned wire-protocol schema package (Zod) imported by the CLI, the server and the app, so a client and a harness cannot silently drift out of sync
differs:
  - "Happy trusts a device once. QR pairing binds a phone to a running terminal session indefinitely. We need identity bound to a task and a short-lived credential, not to a paired device. Copying their pairing model would give us persistent human-to-agent trust where our design wants ephemeral, revocable, per-task trust."
ux_verdict: A phone push that opens straight into a diff and an approve or deny button beats anything our console offers today, and it took the team roughly four steps of onboarding to get there.
slop_verdict: Real and actively maintained by a small independent team, not a marketing shell, but it is a personal remote-control tool for one human's own coding-agent session, not a factory.
---

# Happy

## 1. What it is

Happy is an end-to-end encrypted mobile and web client that mirrors a Claude Code, Codex or similar CLI coding session running on a developer's own machine, and lets that developer watch, approve or reply to it from a phone. It is built and maintained by a small team (slopus/happy on GitHub, copyright "Happy Coder Contributors"), MIT licensed, and distributed both as a free hosted relay service and as a self-hosted server. Users are individual developers who want to keep an agent working while away from their laptop, not organisations running a fleet of agents.

The README and site claim "same encryption as Signal (TweetNaCl)" and complete end-to-end encryption of "your code and conversations". The code backs most of this up for message content, but the relay and the push infrastructure necessarily see plaintext metadata: session titles, tool names, directory names and push copy (see section 5). That gap between the marketing claim and the code is the single most important finding of this report.

Happy is not a factory. It has no task intake, no scheduler, no verification gate and no cost control. It is a well-built remote control and notification layer for a session a human already started by hand.

## 2. Mapping to our five planes

| Plane / principle | What Happy does | What we do | Verdict |
|---|---|---|---|
| Signals | None. A session exists only because a human ran happy in a terminal. No issue, alert or telemetry intake. | Issues, telemetry and alerts feed a durable control plane. | We lead |
| Control plane | A thin per-session state object (AgentState, monotonic seq, requests and completedRequests) synced over Socket.IO. No scheduler, no multi-task queue, no policy engine. | Durable task state, scheduler, policy, approvals, audit, spend limits. | We lead |
| Worker plane (sandbox) | The CLI wraps an existing harness process on the user's own machine. Optional, off-by-default OS-level sandboxing via "@anthropic-ai/sandbox-runtime" (read and write path and network-domain restriction), not disposable containers. | Ephemeral per-task sandboxes, constrained egress, temporary credentials, spawned by the control plane. | We lead |
| Verification | None. No CI, no gate, no second model review before a change lands. | Tests, security scan, stronger-model review, policy evaluation before merge. | We lead |
| Merge and deploy | Out of scope. Happy never touches remotes or deploy pipelines itself. That is entirely the wrapped harness's business. | Verification plane gates merge and deploy. | Not comparable |
| Policy outside the model | Tool permission is delegated to the Claude Agent SDK's canCallTool hook, intercepted in code (permissionHandler.ts) and turned into a human decision when the SDK's permission mode requires one. Real code-level enforcement, but the rule set (which modes exist) is inherited from the SDK, not authored by Happy. | Capability rules enforced outside the model, in the gateway and sandbox. | Equal |
| Identity per task | A device is paired once, indefinitely, to an account via an ephemeral-keypair QR exchange. No task-scoped or short-lived credential. | Short-lived, task-scoped credentials, no standing keys. | We lead |
| Artifacts not chat | Sessions exchange chat-shaped messages (assistant chunks, tool_use, tool_result) over a realtime socket, exactly the "chat" our design tries to avoid. | Agents exchange artifacts (diffs, PRs, reports), not chat transcripts. | We lead |

## 3. Architecture and stack

Monorepo (pnpm, packages/): happy-app (Expo and React Native mobile and web client), happy-cli (TypeScript CLI, wraps Claude Code, Codex, and others), happy-server (Fastify, Socket.IO, Prisma and Postgres relay, read from docs/backend-architecture.md), happy-server-self-host (single-command server bundling embedded PGlite, read from its README.md and bin/happy-server.cjs), happy-wire (shared Zod wire-protocol schema, docs/happy-wire.md), happy-agent.

The CLI dispatches to one of several harness backends from packages/happy-cli/src/index.ts: claude (Claude Code, the primary target), codex, gemini (marked deprecated in the CLI's own help text), agy (Antigravity CLI), and openclaw. This is conceptually the same shape as our own Harness Go interface: one wire protocol, several pluggable backends.

Sync is Socket.IO with a per-account monotonic seq for ordering (docs/backend-architecture.md), Prisma and Postgres storage of opaque encrypted blobs, Redis and S3 for the hosted deployment (docs/deployment.md). The self-host package replaces all three with an embedded PGlite database so happy server needs nothing external, at the cost of not being the horizontally-scaled shape the hosted service uses.

Sandboxing (packages/happy-cli/src/sandbox/manager.ts, config.ts, packages/happy-cli/src/persistence.ts) is real but optional. A SandboxConfig Zod schema (enabled defaults to false) carries denyReadPaths (~/.ssh, ~/.aws, ~/.gnupg by default), denyWritePaths, networkMode (blocked, allowed or custom, default allowed), and allowedDomains and deniedDomains. initializeSandbox hands this to SandboxManager.initialize() from Anthropic's own @anthropic-ai/sandbox-runtime package, which does the actual OS-level enforcement. Happy did not build a sandboxer. It configured someone else's.

Auth and pairing (packages/happy-cli/src/ui/auth.ts): the CLI generates an ephemeral NaCl box keypair, posts the public key to /v1/auth/request, and renders happy://terminal?<base64url(pubkey)> as a QR code. The phone scans it, encrypts its reply (a 32-byte legacy secret, or a dataKey credential pair) to that ephemeral public key with tweetnacl.box, and the CLI decrypts it locally in decryptWithEphemeralKey. The relay only ever forwards the encrypted bundle. It cannot compute the shared secret because it never holds the ephemeral private key. This is the same trick Signal and WhatsApp Web use for device linking.

## 4. UX

Onboarding is short: install the CLI, run happy in a project directory, scan a QR code with the phone app, and the session appears live (happy.engineering/docs/quick-start/, Firecrawl-scraped 2026-09-29). Roughly four steps to a first result, no account creation form, no API key entry by the user, since the CLI already holds the harness's own credentials.

While an agent works, the phone shows the live session transcript, streamed over the encrypted socket, and receives push notifications for three event kinds: done ("It's ready!"), permission, and question (packages/happy-cli/src/api/pushNotifications.ts). A permission push opens into an approve or deny screen backed by PermissionFooter.tsx and the decision enum (approved, approved_for_session, denied, abort) documented in docs/encryption.md. If the user already has the session open in a desktop or web client, the server suppresses the duplicate push (the hasActiveUiClient check in pushDispatch.ts) rather than double-buzzing them.

This is clearly ahead of our own console, which the baseline vision (00-our-vision.md) itself describes as "functional, not designed. No onboarding, no real-time streams of the agent's work, no diff view, no mobile view." Happy is worse than a factory console at everything a factory console needs to do, since it has no multi-task view, no audit trail and no policy surface, but it is a better answer to one narrow question: how does a human get pulled in fast, on the device they actually have in hand.

## 5. Security, identity, sandbox, policy, cost

Security: message content (assistant text, tool calls, file diffs) is end-to-end encrypted, either with NaCl secretbox (legacy, one shared 32-byte secret) or AES-256-GCM with a NaCl-box-wrapped per-device data key (newer variant), per docs/encryption.md. The relay stores and forwards ciphertext it cannot read. But metadata is explicitly not encrypted: PRIVACY.md lists message IDs, timestamps, device IDs, session IDs and push tokens as plaintext, and pushNotifications.ts shows push title, body (a session summary or directory name), tool name, provider, and session ID travelling in plaintext through the relay and then through Apple's or Google's push infrastructure, because a push provider must be able to read a payload to route and display it. No independent security audit was found for the encryption implementation itself (WebSearch, 2026-09-29). The "same as Signal" claim is a marketing comparison of primitive choice, not a citation of an audit.

Identity: a device is paired to an account once, via the QR and ephemeral-key exchange, and stays paired indefinitely (readCredentials and writeCredentialsDataKey in persistence.ts). There is no task-scoped or time-boxed credential. Server-side-only encryption via a KeyTree derived from HANDY_MASTER_SECRET (legacy naming, matches the old handy:// URL scheme in packages/happy-cli/src/api/auth.ts) is used strictly for third-party vendor tokens (GitHub, OpenAI, Anthropic, Gemini OAuth), and is explicitly documented as not end-to-end.

Sandbox: off by default. When enabled, @anthropic-ai/sandbox-runtime enforces read and write path denial and a network mode (blocked, allowed or custom, with domain allow and deny lists) around the wrapped harness process on the same host. This is real code-level enforcement, not a prompt instruction, but it is host-level process confinement, not a disposable per-task container, and a user must opt in.

Policy: tool permission gating comes from the Claude Agent SDK's permission modes (default, acceptEdits, bypassPermissions, plan, read-only, safe-yolo, yolo), intercepted by Happy's own permissionHandler.ts via the SDK's canCallTool callback and turned into a push-driven human decision when the mode calls for one. The rule set itself is the SDK's, not Happy's. Happy adds the notification and remote-decision path around it.

Cost: none found. No spend cap, no budget ledger, no per-session cost tracking in the CLI, server or app source. RevenueCat appears only for Happy's own subscription billing (voice feature), unrelated to agent run cost.

## 6. What we should take from it

Narrow, this month: the hasActiveUiClient push-suppression pattern and the explicit PushOutcome taxonomy (sent, partial, suppressed, no_tokens, failed) are worth lifting directly into any notification path we build. The comment in pushDispatch.ts, that a silent push outage went undetected for two months because every outcome looked the same to the caller, names a specific, avoidable bug we should design out from the start. The ephemeral-keypair QR pairing pattern is a clean way to let a phone join a session without ever handing the relay a usable secret, and is a better model than a long-lived API key or bearer token for an "authorise by proximity" step, if we ever add one. Anthropic's own @anthropic-ai/sandbox-runtime package is worth evaluating directly for any host-level process confinement we still need inside a worker sandbox, rather than hand-rolling seccomp or bubblewrap rules for the same purpose.

Broad, this quarter: the fact that Happy exists and has 23,944 stars is itself a signal. Our own console has no mobile view and no push channel, and the baseline document already names this gap. A push-to-phone escalation channel, built to our own identity and policy model rather than Happy's, is a real product gap worth closing. Section 7 answers the specific question the task asked about this.

## 7. Where our philosophy differs and what that costs or buys us

Happy's trust model is device-to-account, established once and kept indefinitely. Ours needs to be task-to-credential, short-lived and revocable, because our agents are disposable workers acting under policy, not a single developer's own laptop session. Copying Happy's pairing model outright would hand a paired phone standing trust over every future session on that account, which is the opposite of "identity belongs to the task, not the machine" from our own architecture baseline. The QR and ephemeral-key mechanism itself is reusable, since it is just a secure bootstrap handshake. The "pair once, trust forever" policy layered on top of it is not something we should copy.

Happy also treats the human as the control plane. Nothing happens until a human runs a CLI command, and every "task" is really a human's own terminal session. Our design puts a durable control plane in charge and pulls a human in only for escalate_to_human calls. This is a strength, not a cost, of our approach: Happy could not run unattended fleets of agents even if it wanted to, because it has no scheduler and no policy engine to hand a task to an agent in the first place.

On the specific question this report was asked to answer: push approvals on a phone belong in our escalation path, as one channel among several, not as the only one. The useful part of Happy's mechanism is narrow: a durable per-decision record with an explicit outcome (approved, approved_for_session, denied, abort), a presence check that skips a push when a human is already watching, and a push payload that carries just enough plaintext (tool name, session id, one line of context) to act on without exposing task content. None of that needs Happy's relay, its pairing model or its mobile app.

A self-hosted equivalent needs three things Happy already proves are sufficient. First, a way to reach a human's phone. Ntfy running on our own infrastructure covers this, since it accepts a plain HTTPS POST and delivers a push without any vendor account or SDK. Second, a callback path the human's tap or reply can hit to record the decision against the task. A short-lived, single-use signed URL back to factory-gateway, scoped to one escalation, is enough, and is more in line with "identity belongs to the task" than a paired device. Third, the same presence check so a human already looking at the console does not also get paged. Forgejo notifications cover the case where a human is willing to wait for their normal notification channel. Ntfy or a similar push gateway is the one to build for the "reach a human fast" requirement, since Forgejo has no concept of a task-scoped approval callback.

## 8. Red flags and slop assessment

Not slop: 71 contributors, a last commit 2 days before this report's date (checked directly against the clone's history on 2026-09-29, returning 2026-09-27 20:52:08 -0700), roughly weekly tagged CLI releases (cli-1.2.2 through cli-1.2.5 observed via the GitHub API), a CONTRIBUTING.md that describes a real review process including mandatory Codex-bot review before human review, and a working, documented self-host path (happy-server-self-host) that goes beyond the planning stage. docs/plans/happy-serve-self-host.md reads as a forward-looking design note, but the package itself is built and has a populated usage README.md.

Genuine gap between marketing and code: the "same encryption as Signal" and "fully end-to-end encrypted" claims describe message content correctly but omit that push notification copy, session titles, tool names and various IDs travel in plaintext by necessity. This is a normal trade-off for any push-based system, not a lie, but the marketing does not say it and a careful reader has to go to PRIVACY.md and the CLI source to find it.

One specific backend has weaker security than the others: a WebSearch on 2026-09-29 found a claim that the agy (Antigravity CLI) backend runs one-shot (agy --print) with no interactive approval surface at all, so the phone approval flow this report is centred on would not apply to that harness. This is not independently verified against agy-specific source in this review. It is flagged as "not verified in source" rather than confirmed.

No independent security audit of the encryption code was found. No funding, company structure or governance beyond "tag @bra1ndump if ignored" was found. This reads as a personal or small-team project run well, not an organisation with a roadmap commitment.

## 9. Sources

Repository clone, depth 1, read 2026-09-29: ~/repos/market-research-clones/happy (monorepo, current)
~/repos/market-research-clones/happy-cli (legacy standalone repo, superseded by the monorepo, checked for metadata only)
~/repos/market-research-clones/happy-server (legacy standalone repo, superseded by the monorepo, checked for metadata only)
README.md
docs/backend-architecture.md
docs/user-identity.md
docs/encryption.md
docs/happy-wire.md
docs/deployment.md
docs/plans/happy-serve-self-host.md
docs/roadmap.md (partial)
docs/CONTRIBUTING.md
PRIVACY.md
LICENSE
packages/happy-server-self-host/README.md
packages/happy-cli/src/claude/utils/permissionHandler.ts
packages/happy-cli/src/api/pushNotifications.ts
packages/happy-cli/src/ui/auth.ts
packages/happy-cli/src/api/auth.ts
packages/happy-cli/src/sandbox/manager.ts
packages/happy-cli/src/sandbox/config.ts
packages/happy-cli/src/persistence.ts (sandbox schema section)
packages/happy-cli/src/commands/sandbox.ts
packages/happy-cli/src/utils/sandboxFlags.ts
packages/happy-server/sources/app/push/pushDispatch.ts
packages/happy-app/sources/components/tools/PermissionFooter.tsx (props and interfaces only)
packages/happy-cli/src/index.ts (grepped for harness subcommands)
Last commit date checked directly against the clone's history, run 2026-09-29, returned 2026-09-27 20:52:08 -0700
GitHub API: repository metadata, organisation repositories, contributor list, release list, all queried 2026-09-29
https://happy.engineering, Firecrawl scrape, 2026-09-29
https://happy.engineering/docs/, Firecrawl scrape, 2026-09-29
https://happy.engineering/docs/quick-start/, Firecrawl scrape, 2026-09-29
https://happy.engineering/docs/guides/push-notifications/, Firecrawl scrape, 2026-09-29
WebSearch: "Happy Coder slopus review happy.engineering claude code mobile security", 2026-09-29
WebSearch: "Happy Coder app happy-coder vs alternatives Vibetunnel Claude Code remote", 2026-09-29
