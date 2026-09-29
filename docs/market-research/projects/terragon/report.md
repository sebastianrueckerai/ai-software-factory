---
name: Terragon
slug: terragon
url: https://www.terragonlabs.com
repo: https://github.com/terragon-labs/terragon-oss
category: factory-orchestrator
license: Apache-2.0
open_source: yes
self_hostable: partial
hosting_model: was cloud SaaS, shut down 2026-02-09; code now published as an unmaintained self-host snapshot, no hosted option remains
company: Terragon Labs, three founders (Sawyer Hood and two co-founders posting as @brsabel and @_ymichael on X), no external funding found in this session, HQ not verified. Founded around 2025-06-29 (first public build), wound down 2026-02-09 for lack of traction
maturity: terragon-oss repo has 259 stars and 43 forks (Apache-2.0, created 2026-01-16 as the shutdown snapshot, last pushed 2026-02-10, 0 open issues). The product itself ran about eight months, the npm CLI (@terragon-labs/cli) shipped its last release 2025-12-03 at v0.1.20, no commits since the snapshot
similarity: 2
axes:
  signals_intake: 2
  control_plane: 2
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 2
  ux: 4
  reseedable_selfhost: 1
steal:
  - packages/sandbox/src/provider.ts switches between four sandbox backends (E2B, Daytona, Docker for dev, Mock for tests) behind one ISandboxProvider interface, a clean working precedent for a swappable sandbox backend if gVisor's build slowness ever forces a second provider.
  - packages/daemon/src/{claude,codex,gemini,amp,opencode}.ts are five real per-agent adapters behind one IDaemonRuntime, a working multi-harness abstraction at a larger scale than our single opencode implementation, worth reading before building the Codex successor path.
  - A per-sandbox DAEMON_TOKEN bearer plus server-side proxy routes (apps/www/src/app/api/proxy/{anthropic,openai,google,openrouter}) inject the real model API key only on the control-plane side, so the sandbox never holds a usable provider credential, the same shape as our gateway's virtual key and independent validation of the pattern.
  - BYO subscription (packages/shared/src/db/schema.ts's agentProviderCredentials table, encrypted OAuth token or API key per user) lets an operator's own Claude Max or ChatGPT Plus quota power a session instead of metered API calls, worth offering alongside our LiteLLM ladder for cost-conscious solo use.
  - A pre-flight balance check (balanceCents <= 0 blocks the call, apps/www/src/app/api/proxy/anthropic route.ts) plus auto-reload on low balance is a minimal working shape for a hard spend floor, simpler than our priced hold and worth a look as a cheap fast path.
  - Live progress over a small dedicated WebSocket service (apps/broadcast, built on PartyKit) plus streamed git checkpoints is a proven, low-effort architecture for exactly the live-stream and diff-view gap our own console admits to.
  - terry, the CLI, both hands a running task to a local terminal and runs an MCP server so a task can be created or steered by natural language from inside Cursor or Claude Code, a light pattern for driving factoryd intake from inside a coding session rather than only from Forgejo.
differs:
  - Per-repo user secrets (the environment table's environmentVariables, decrypted and injected as plain env vars into the sandbox) reach the agent directly, and GitHub identity is one 30-day, repo-scoped App installation token reused across every task on that repo, not minted per task. Copying either breaks our identity-per-task and no-keys-in-the-sandbox principles; only the model-credential path, proxied, key stays server-side, matches our approach.
  - The product's job stops at "PR opened". No CI gate, no policy evaluation, no model review, no merge or deploy step exists anywhere in the code read. That is a smaller product, not a worse implementation of ours, and it shows a background-agent tool can succeed without ever touching verification. Our factory's whole premise is unattended merge, so we cannot shrink scope the way they did.
  - The sandbox is a fat, root, general-purpose Ubuntu 24.04 image with Docker-in-Docker, Rust, PHP and more preinstalled (packages/sandbox-image/Dockerfile.hbs), optimised for "any repo boots fast" rather than a minimal attack surface. Matching our non-root, read-only root FS, default-deny egress sandbox means giving up their instant multi-language support; matching their image costs us the hardening our security constraint demands.
  - It is one company's single Next.js monolith over Postgres and Redis with one small WebSocket side-service, sized for one team's paying users, not a multi-tenant control plane. That simplicity is exactly why three people could build and then shut it down in eight months; our heavier shape exists because we have to survive being deleted and re-seeded as a whole company's infrastructure, a requirement they never had.
ux_verdict: Fewer steps to a first running task than anything else in this survey (connect a GitHub App, type a task, pick a model, hit Execute), and the live checkpoint stream plus terry CLI handoff directly answer our console's admitted gaps, but the product never grew a place to review, gate or merge the work it produced.
slop_verdict: Real and once paying, not a landing-page project (259 stars and 43 forks on the post-shutdown snapshot, a working npm CLI published for eight months), but it is dead. shut down 2026-02-09 for lack of traction, its own maintainers call the code an unmaintained as-is snapshot, and an independent write-up pins the failure on a moat thin enough for Anthropic's and OpenAI's own CLIs to absorb.
---

# Terragon

## 1. What it is

Terragon was a paid, cloud-hosted way to run Claude Code, OpenAI Codex, Amp and Gemini as background agents instead of in a terminal you have to keep open. A user connected a GitHub repository, typed a task in a chat box, and Terragon booted an isolated cloud sandbox, ran the chosen coding CLI against a fresh branch, streamed progress to the browser, and opened a pull request. It billed by usage credits or let a user bring their own Claude or ChatGPT subscription. Three founders (Sawyer Hood plus two co-founders) shipped the first version around June 2025, per Hood's own X post citing roughly 500 merged PRs from early internal use.

The company wound down on 2026-02-09. Its own shutdown notice, read via WebSearch, says plainly: "we weren't able to reach the level of traction needed to turn Terragon into a sustainable, long-term business." The team then open-sourced the entire monorepo as terragon-labs/terragon-oss under Apache-2.0, tagged as an open-source snapshot at shutdown time, provided as-is with no maintenance guarantee. What the README and marketing claimed (multi-agent, sandboxed, real-time, automatable) matches what the code shows. What neither claimed, and what the code confirms, is any verification, gating or merge step beyond opening the PR.

## 2. Mapping to our five planes

| Plane / principle | What Terragon does | What we do | Verdict |
|---|---|---|---|
| Signals | GitHub PR, issue and mention triggers, cron schedules, Slack mentions, or a manual chat prompt, each tied to one automations row | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | not comparable, no telemetry-to-task path on theirs, more native chat-app triggers |
| Control plane | A thread table (Postgres via Drizzle) holds sandbox status, branch, PR number, schedule and retry fields per task, no approvals, no audit trail, no budget beyond a per-user credit balance | Temporal workflow per task, capability policy as YAML, cost ledger, kanban console, approvals | we lead, durable state exists on both sides, governance only on ours |
| Worker plane | One E2B or Daytona container per thread, root Ubuntu 24.04 image with most languages and Docker preinstalled, no documented egress control | gVisor pod per task, non-root, read-only root FS, default-deny egress via Cilium | we lead on hardening, they lead on breadth of what boots without per-project image work |
| Verification | None found. The product stops once a PR exists | Forgejo Actions, risk-class gates, reproduction gate, stronger-model review, some auto-merge | we lead, not comparable in ambition |
| Merge and deploy | A human merges the PR Terragon opened, nothing further | Bot merge after approval or auto-rule, Flux deploy, staged rollout | we lead |
| Policy outside the model | A per-provider model-name allowlist enforced in code, nothing about capability or spend | Capability policy as a Git document, enforced in gateway code and network policy | we lead, theirs only gates which model string is well-formed |
| Identity per task | A 30-day GitHub App installation token scoped to a repo and reused across tasks, model credentials proxied server-side (good), custom per-repo secrets injected as plain env vars into the sandbox | Projected, audience-scoped ServiceAccount token per task, no key material in the sandbox | we lead |
| Artifacts not chat | A thread is a chat session with git checkpoints, the work product is a PR | TaskBrief in, branch, PR and event stream out | we lead, their unit of work is a conversation |

## 3. Architecture and stack

Apache-2.0, a pnpm/Turborepo monorepo. apps/www is the Next.js control plane and UI. apps/broadcast is a small PartyKit WebSocket service that streams task progress to the browser. apps/cli is terry, a local CLI that can take over a running remote task and also runs an MCP server so Cursor or Claude Code can create and manage Terragon tasks by natural language. Storage is Postgres via Drizzle ORM (packages/shared/src/db/schema.ts, 1165 lines) plus Redis, R2 for attachments, and Stripe for billing.

Task state lives in the thread table: repo, base branch, current branch, PR and issue numbers, sandboxProvider/sandboxStatus/bootingSubstatus, a cached git diff, scheduleAt and reattemptQueueAt columns for retry and cron. packages/sandbox/src/provider.ts picks an ISandboxProvider implementation by name (e2b, daytona, docker, mock), and packages/sandbox/src/sandbox.ts drives create, hibernate, extend-life and lookup against whichever provider is selected. Inside the sandbox, packages/daemon runs a small runtime (runtime.ts's DaemonRuntime, spawning processes, a Unix socket for local IPC, an HTTP callback authenticated with an X-Daemon-Token header) with one adapter file per agent (claude.ts, codex.ts, gemini.ts, amp.ts, opencode.ts). The sandbox image (packages/sandbox-image/Dockerfile.hbs) is Ubuntu 24.04 running as root, with Node 22, Rust, PHP, gh, and full Docker CLI baked in.

Model calls from inside the sandbox go through apps/www/src/app/api/proxy/{anthropic,openai,google,openrouter} routes. Each route strips any client-supplied key header, checks the caller's credit balance (balanceCents <= 0 returns 402), and either injects Terragon's own platform API key or, for BYOK users, decrypts a stored agentProviderCredentials row (OAuth token for a Claude or ChatGPT subscription, or a raw API key) before forwarding. packages/agent/src/proxy.ts's validateProviderModel restricts which model name strings each provider route accepts.

GitHub access is a single GitHub App (packages/shared/src/github-app.ts), and getInstallationToken mints a 30-day, repo-scoped installation token on demand, not a token scoped to one task.

## 4. UX

A screenshot bundled in the README shows the whole product on one screen: a left sidebar lists tasks grouped by day, each with a title, repo, relative time and a status icon; the main pane is a single compose box with a model picker (Sonnet 4.5), an Execute button, and repo/branch selectors. Onboarding is roughly three steps: connect a GitHub repository through the App, type or dictate a task, pick a model and hit Execute. That beats our console, which assumes a task already exists as a Forgejo issue.

While a task runs, progress streams live to the browser over the apps/broadcast WebSocket service, with git checkpoints appearing as the agent commits. A user intervenes by sending a follow-up chat message, by using terry to pull the sandbox down to a local terminal, or by mentioning the Terragon GitHub or Slack app on an existing issue or PR. There is no review or gate UI, because the product does not have one, once the PR exists, everything past that point happens on GitHub itself.

## 5. Security, identity, sandbox, policy, cost

Sandbox: one container per thread, provisioned through E2B or Daytona, running the root Ubuntu image described above with a full toolchain and Docker CLI preinstalled. No egress allowlist or non-root hardening is visible in the code; any such control would live inside the chosen provider's own infrastructure.

Identity: the sandbox authenticates callbacks with a per-sandbox DAEMON_TOKEN bearer, the one part of the design that resembles a scoped, ephemeral credential. Everything else is coarser: a GitHub App installation token lives 30 days and is scoped to a repository, not a task. Model provider keys are decrypted and injected server-side per call so the sandbox never holds one, matching our no-keys-in-the-sandbox principle for that one path.

Policy: the only enforcement found in code is the per-provider model-name allowlist, which stops a malformed model string, not a capability or spend decision. What an agent is allowed to do inside its sandbox is left to the sandbox provider's defaults and the coding CLI's own prompt.

Cost: a credit ledger (userCredits, usageEvents tables) is checked before every proxied model call, and a request is rejected once the balance reaches zero, with an optional auto-reload top-up. That is a real hard floor, but a per-user balance check, not a per-call priced hold and not a per-task or per-project budget.

Credentials: custom per-repository secrets (the environment table's environmentVariables) are decrypted and injected into the sandbox as plain environment variables, a direct route for a secret to reach the same process an untrusted prompt can influence.

## 6. What we should take from it

Narrow: the ISandboxProvider and per-agent daemon adapters are the two most directly reusable pieces, both small, working abstractions over a problem we have only solved once (gVisor, opencode). The server-side model-key proxy and the pre-flight credit-balance check are worth comparing against factory-gateway's hold logic, since both solve "the sandbox never holds a real key" with less code than we carry. terry's MCP server is a cheap way to let a coding session create a factoryd task without a human touching Forgejo first.

Broad: the live WebSocket progress stream and the three-step onboarding are the clearest answer in this report to our console's admitted lack of a real-time view, and cost little to build since it is one small side-service, not a rewrite. BYO subscription is worth considering for anyone running the factory against their own paid Claude or ChatGPT plan.

## 7. Where our philosophy differs and what that costs or buys us

Terragon's identity model is ambient, not per-task: a 30-day GitHub token and plaintext-injected custom secrets both outlive and outscope any single thread. That is simpler to build, but a compromised session on day one can act with the same credentials on day thirty. Our per-task token costs more moving parts and buys an expiry that tracks the work itself.

Terragon never built verification, policy or merge automation, not because it failed to, but because its product boundary stopped at "open a PR". That let three people ship a working, paying product in months. Our factory cannot take that shortcut, unattended merge to production is the entire point.

Their sandbox trades hardening for breadth: a root, fat, general-purpose image boots any repo in any language without per-project curation. Ours trades that breadth for a smaller attack surface. Adopting their image approach would undo the sandboxing half of our security constraint; adopting our image approach would have cost them the "just point it at any repo" pitch their whole product was built on.

## 8. Red flags and slop assessment

Terragon is dead. The company's own shutdown notice cites insufficient traction, effective 2026-02-09, and the GitHub repository's own top line calls the published code an as-is snapshot with no guarantee of maintenance or support. The npm CLI (@terragon-labs/cli) shipped its last release on 2025-12-03, about two months before the shutdown. gh api repos/terragon-labs/terragon-oss shows 0 open issues and no commits since the shutdown snapshot's own follow-up push on 2026-02-10, consistent with an abandoned repository rather than a live one with unresolved bug reports.

No funding round, investor or accelerator affiliation was found for Terragon Labs in this session. That is consistent with a small, likely self-funded team, and it lines up with the founder's own framing of the project as something that took off rather than a planned long-term venture.

An independent blog post by JM Duke argues Terragon's moat was thin because its core value, a polished way to run someone else's coding CLI in the cloud, was always going to be absorbed by the model providers' and CLI makers' own hosted offerings, and predicts the same fate for at least one still-live competitor built the same way. That is a specific, named mechanism for the failure, worth treating as a caution for any part of our own design that is a thin layer over a harness we do not control.

## 9. Sources

https://www.terragonlabs.com, https://docs.terragonlabs.com/docs, https://github.com/terragon-labs/terragon-oss, https://cdn.terragonlabs.com/dashboard-beRp.png (viewed directly), https://registry.npmjs.org/@terragon-labs/cli, https://www.jmduke.com/posts/failed-experiments.html, gh api repos/terragon-labs/terragon-oss, WebSearch on Terragon Labs shutdown/funding/founders, and the cloned repo ~/repos/market-research-clones/terragon (README.md, LICENSE, packages/shared/src/db/schema.ts, packages/sandbox/src/{provider,sandbox}.ts, packages/sandbox-image/Dockerfile.hbs, packages/agent/src/proxy.ts, packages/daemon/src/runtime.ts, packages/shared/src/github-app.ts, packages/shared/src/automations/index.ts, apps/www/src/server-lib/{credentials,user-credentials,credit-balance,proxy-model-validation}.ts, apps/www/src/app/api/proxy/anthropic route.ts).
