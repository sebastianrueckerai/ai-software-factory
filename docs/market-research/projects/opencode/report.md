---
name: OpenCode
slug: opencode
url: https://opencode.ai
repo: https://github.com/anomalyco/opencode
category: coding-harness
license: MIT
open_source: yes
self_hostable: yes
hosting_model: single self-hosted binary (CLI, server, web, desktop); optional hosted extras (Zen gateway, Go subscription, share-link CDN, Enterprise SSO)
company: Anomaly Innovations (formerly SST), founded 2025, pre-seed or seed stage, investors reportedly Spearhead and the a16z Scout Fund (Crunchbase, not verified), HQ not disclosed in sources checked
maturity: 210,753 stars, 27,908 forks, 6,250 open issues (gh api, 2026-09-29), first commit 2025-04-30, last push 2026-09-29, 43 releases in the last 3 months, all patch-level semver bumps, no breaking change announced in that window
similarity: 2
axes:
  signals_intake: 2
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 1
  ux: 4
  reseedable_selfhost: 4
steal:
  - "opencode run --format json plus --attach <url> against a warm opencode serve instance: a documented JSON event stream over a long-lived process, instead of parsing interactive TUI output or paying a cold-start cost per task"
  - "The plugin hook surface (tool.execute.before/after, shell.env for env injection, experimental.session.compacting to replace the compaction prompt) as a place to bolt our own audit or double-check logic onto the harness without forking it"
  - "The policies-vs-permissions split: a separate experimental.policies layer (glob-matched, last-rule-wins, resource-scoped, currently gating provider.use) sitting next to the per-tool permission engine, a clean way to keep 'what can this task use' apart from 'what can this task do'"
  - "{env:VAR} and {file:path} substitution in config files, a one-line way to keep secrets out of committed config without building a secrets manager integration"
  - "opencode stats: a built-in CLI command that breaks down token usage and cost by session, tool, model and project, worth copying as a debugging and cost-visibility surface even though it enforces nothing"
  - "The Go proxy's published compatibility table of third-party clients that do or do not send a stable routing header, an honest way to document cross-harness interoperability that we could copy for our own model-tier documentation"
differs:
  - "opencode ships no execution sandboxing at all and is allow-by-default on every tool, trusting the deployer's machine or container for isolation, the opposite of our default-deny, gVisor-sandboxed, identity-per-task worker plane"
  - "Its unit of coordination is a chat session (a saved, shareable transcript), not a structured artifact; our principle that agents exchange artifacts, not chat, would not survive adopting opencode's session model as anything more than an in-sandbox harness"
  - "Policy and credentials live inside the same process that runs the agent, so a compromised opencode binary can bypass its own permission and policy checks, whereas our factory-gateway sits outside the sandbox and the agent never holds a real key"
ux_verdict: faster to a first result than our console (one binary, a TUI in seconds, no cluster) and richer to watch live (TUI, a mirrored web UI, opencode attach, shareable session links), but none of that surface is a governed, queued, cost-tracked task the way our console's kanban view is
slop_verdict: real, heavily used and actively maintained (210k stars, 43 releases in three months, commits the same day as this research), but several evocatively named directories are hollow next to their names, and the vendor's own stated security posture, plus three real 2026 advisories, are a genuine caution flag
---

# OpenCode

## 1. What it is

OpenCode is an open source, terminal-first coding agent built by Anomaly Innovations, the company formerly known as SST (maker of the SST framework, OpenNext, OpenAuth and OpenTUI), all now consolidated under the `anomalyco` GitHub organisation. It is MIT licensed and pitched as a model-agnostic, provider-agnostic alternative to closed coding agents, for developers who want to bring their own model and run the same agent in a terminal, a browser, an editor, or headless via API and SDK.

The docs and marketing claim "no lock-in" and model neutrality, plus an enterprise tier with central policy and single sign-on. Source inspection confirms most of the core claims: the permission engine, the plugin system, MCP support and the config precedence chain are all real, working code. The enterprise SSO and central-config layer described on the marketing site is not: the OSS `packages/enterprise/` directory only holds the share-link hosting backend, not the SSO or policy logic the enterprise page describes, which is undisclosed.

The CLI, server, web UI, desktop app and SDK are free and fully self-hostable. Revenue comes from two optional hosted add-ons that sit beside the free tool: Zen, a pay-as-you-go curated model gateway with team spend caps, and Go, a fixed $10 or $40 per month subscription bundling discounted access to a curated list of open-weight models, plus a per-seat Enterprise tier. One August 2026 review (unverified) put annual revenue near $25 million.

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | A GitHub Action listens for `/opencode` comment mentions, issue and PR events, schedules and manual dispatch, all inside GitHub Actions only | Forgejo webhooks, SigNoz alert webhooks, a factoryd intake API, every task is a Forgejo issue | we lead |
| Control plane | Session and message state in a local SQLite database, no scheduler, no durable workflow, the only "approval" is an interactive per-call permission prompt | factoryd with a Temporal workflow per task, Postgres, policy as a YAML file in Git applied by Flux | we lead |
| Worker plane | This is what sits inside our worker plane, not an alternative to it: a single process running tools directly on the host, no isolation of its own | One gVisor pod, namespace and ServiceAccount per task, opencode is our harness inside that pod today | not comparable, but on isolation specifically we lead |
| Verification | None built in. No gating, no CI, no model review. A user can wire opencode into their own CI, but opencode provides no gate itself | Forgejo Actions on gVisor runners, policy gates by risk class, a reproduction gate, a stronger-model review with a strict verdict | we lead |
| Merge and deploy | None. A GitHub Action run can open a PR, nothing more | Merge by bot only after a whitelisted human approval or an auto-rule, Flux deploy, a staged rollout with an alert-free wait | we lead |
| Policy outside the model | A real permission engine (JSON config, allow/ask/deny per tool, glob patterns, last-rule-wins) plus a separate policies layer for provider access, both enforced in the opencode process itself, pushable via a `.well-known` endpoint or an MDM profile | A YAML policy file in Git, enforced in `factory-gateway` code and Kubernetes network policy, outside the sandbox | equal, theirs is more configurable per tool, ours is enforced outside the process the agent runs in |
| Identity per task | API keys and OAuth tokens sit in a local SQLite table, shared by whatever process runs opencode, no short-lived scoping except the GitHub Action's own OIDC-to-installation-token exchange | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by the gateway, no key material in the sandbox | we lead |
| Artifacts not chat | The durable unit is a session, a saved and shareable conversation transcript with tool calls inline, though the actual output is still a real git diff | A `TaskBrief` in, a branch, a PR and a normalised event stream out, Git is the coordination mechanism | we lead |

## 3. Architecture and stack

A Bun monorepo in TypeScript. Model calls go through the Vercel AI SDK's provider abstraction, plus opencode's own Zen and Go proxy endpoints. The HTTP server is built on Hono. Session, credential and permission state is stored in SQLite through Drizzle ORM. The terminal and web UI share a rendering layer built on the project's own `@opentui/*` packages and Solid.js. The desktop app wraps the same UI in Electron (`desktop/src/main/windows.ts`), with Electron's `sandbox: true` covering only the renderer process, unrelated to agent execution. Effect-TS runs through the codebase, including `effect/unstable/process` for spawning shell commands. Repo tooling is oxlint, turbo and husky.

Deployment shape is a single compiled binary per platform, built with `./packages/opencode/script/build.ts --single`. There is no Helm chart or Docker Compose file in the OSS repo for running the agent itself. `packages/containers/` only holds CI build images (`ghcr.io/anomalyco/build/*`) used to speed up Anomaly's own GitHub Actions jobs, not runtime sandboxing for agents.

Files and directories read: `README.md`, `CONTRIBUTING.md`, `package.json`, the full English docs tree under `packages/web/src/content/docs/` (`server.mdx`, `permissions.mdx`, `sdk.mdx`, `acp.mdx`, `zen.mdx`, `go.mdx`, `agents.mdx`, `cli.mdx`, `config.mdx`, `policies.mdx`, `network.mdx`, `enterprise.mdx`, `share.mdx`, `github.mdx`, `mcp-servers.mdx`, `plugins.mdx`, `web.mdx`, `tools.mdx`, `ecosystem.mdx`, `providers.mdx` in part), `packages/core/src/credential/sql.ts`, `packages/core/src/tool/bash.ts`, `packages/core/src/control-plane/` (listing), `packages/core/src/permission/` (listing), `packages/containers/README.md`, `packages/identity/` (listing), `packages/enterprise/` (listing), `packages/function/src/github.ts`, `packages/server/src/` (structure).

Two directory names are misleading. `packages/identity/` holds only logo and brand image assets (`mark.svg`, `mark-96x96.png`), nothing to do with credentials or auth. `packages/core/src/control-plane/` holds one workspace database table (`workspace.sql.ts`) and a session-move helper (`move-session.ts`), nothing resembling scheduling or policy.

## 4. UX

Getting to a first result takes about three steps: install with one shell command (curl script, npm, or brew), run `opencode` inside a repository, type a prompt. The TUI opens, prompts for a provider connection (`/connect` or an API key) if none is configured, and then streams tool calls live as the agent works. Because the permission default is allow-all, nothing interrupts the flow unless the operator has set a tool to `ask`, in which case an inline prompt appears before that specific call runs. Diffs are shown inline as edits happen. Session state is saved automatically to the local SQLite database, so a session can be resumed later.

`opencode web` starts a local server on `127.0.0.1` (a random port by default, unauthenticated unless `OPENCODE_SERVER_PASSWORD` is set) and opens a browser UI mirroring the same session list and new-session screen the docs illustrate with screenshots (`web-homepage-new-session.png`, `web-homepage-active-session.png`, `web-homepage-see-servers.png`; screenshot content itself not independently verified, only the docs text describing them). `opencode attach <url>` lets a separate TUI attach to a running `serve` or `web` instance and share the same session and state, so more than one person or interface can watch or drive the same run. `/share` publishes a read-only link at `opncd.ai/s/<id>` for showing a session to someone without giving them access to the machine. `/unshare` revokes it.

Intervention is conversational: a human watching a TUI or web session can type at any point, answer a permission prompt, or answer a structured multiple-choice question if the agent calls the `question` tool. There is no separate stop or kill control beyond closing the process, no approval queue, and no cost dashboard.

Against our console, opencode is faster to a first result and nicer to watch live: no cluster to stand up, a polished TUI, a browser mirror, shareable links. What our console has and opencode does not: a multi-task kanban view, a per-project and per-task cost view, an audit trail, and a queued or approval workflow state that outlives a single conversation. Each opencode session is one live conversation, not a governed task in a registry.

## 5. Security, identity, sandbox, policy, cost

Security: opencode's `bash` tool (`packages/core/src/tool/bash.ts`) is a plain child process spawn through `effect/unstable/process`, gated only by the permission check, with no seccomp, namespace or container isolation of its own. The vendor's stated security position is that securing the server is the end user's responsibility, and that functionality the server exposes by design "is not a vulnerability." Three real 2026 incidents back this up as a live concern rather than a theoretical one: CVE-2026-22812 (an unauthenticated HTTP server RCE through permissive CORS on shell, pty and file endpoints, fixed in 1.0.216 and 1.1.10), GHSA-c83v-7274-4vgp (an XSS through a web UI URL-override parameter, fixed by removing the parameter), and GHSA-632h-h47v-g4x4 (a Datadog-disclosed content-type confusion RCE in `/global/upgrade`, patched in 1.18.22 a month before public disclosure and deliberately not assigned a CVE, per Anomaly's stated policy against rewarding low-quality vulnerability hunting).

Identity: API keys and OAuth tokens live in a local SQLite table (`packages/core/src/credential/sql.ts`), with no OS keychain or vault integration seen in the code read. MCP OAuth tokens are stored at `~/.local/share/opencode/mcp-auth.json`. The one short-lived, task-scoped credential mechanism anywhere in the product is the GitHub Action's OIDC-to-installation-token exchange (`packages/function/src/github.ts`), and it only applies inside a GitHub Actions run, not to local or server use.

Sandbox: none. The word "sandbox" in the codebase (`Project.sandboxes`, `addSandbox`, `removeSandbox`) refers to a list of git worktree paths in a database column, not process, container or VM isolation. Network egress is whatever the host process can reach; opencode does not constrain it.

Policy: two separate, code-enforced systems. The `permission` config gates tool execution per tool, with glob patterns and last-rule-wins, defaulting to allow-all unless an operator sets `ask` or `deny`. `experimental.policies` gates resource access (currently only `provider.use`) with the same glob and last-rule-wins mechanics, and can be pushed to a whole fleet through a remote `.well-known/opencode` endpoint or, on macOS, an MDM `.mobileconfig` profile. Both live inside the opencode process, so a compromised binary can bypass its own checks; there is no separate gateway process standing outside the agent the way ours does.

Cost: `opencode stats` shows token usage and cost broken down by session, tool, model and project, so visibility is real. There is no hard spend cap, hold or ledger in the open-source tool for bring-your-own-key use: nothing stops a call that would exceed a budget. The paid Go subscription is the one exception, enforcing monthly-dollar allowances split into 5-hour, weekly and monthly usage tiers, but that cap lives in the hosted product, not in the harness itself.

## 6. What we should take from it

Narrow, copyable this month: the `opencode run --format json` plus `--attach <url>` pattern is worth adopting in our Go `Harness` interface, a documented JSON event stream against a long-lived server instead of parsing interactive output or paying a cold start per task. The plugin hook surface (`tool.execute.before` and `after`, `shell.env`, `experimental.session.compacting`) is a clean extension point we could target if we ever want to inject our own audit or double-check logic into the harness without forking it. `{env:VAR}` and `{file:path}` config substitution is a one-line idea for keeping secrets out of committed config. `opencode stats` is worth copying as a debugging and cost-visibility command even where it enforces nothing.

Broad, worth studying: the policies-versus-permissions split (a resource-scoped layer for "what can this task use" separate from a tool-scoped layer for "what can this task do") is a useful structuring idea for our own capability policy file, even though we would keep enforcement outside the sandboxed process. The GitHub Action's OIDC-token-exchange-or-caller-token dual path is a workable short-lived-credential pattern to study if we ever take GitHub issues as a signal source. The MDM-managed-config tier is a reminder that "policy applies before the agent process starts" is a real enterprise expectation, one our Git-based policy file does not cover for unmanaged devices, worth a note even though it is not directly relevant to a Kubernetes-only shop. The Go proxy's published table of client compatibility with its routing header is a good honesty pattern worth copying in our own documentation of harness and model-tier compatibility.

## 7. Where our philosophy differs and what that costs or buys us

The biggest difference is that opencode ships no execution sandboxing and is allow-by-default on every tool, trusting the deployer's machine or container entirely for isolation and network control. This is the opposite of our default-deny, gVisor-sandboxed, identity-per-task worker plane. Copying opencode's ease here would break our "security without half measures" constraint. Their approach buys them a lighter, faster product because most of their users run it on their own laptop against their own code, a threat model that does not hold for us, since we run untrusted, autonomous, unattended agents across many projects at once.

The second difference is the unit of coordination. opencode's durable object is a chat session, a saved and shareable transcript with tool calls inline. Our principle that agents exchange artifacts, not chat, would not survive adopting opencode's session model as anything more than the harness that runs inside one of our sandboxes, which is exactly how we use it today.

The third is where policy and credentials live. opencode enforces its permission and policy checks inside the same process that runs the agent, so a compromised or patched binary can bypass its own rules. We enforce policy in `factory-gateway`, outside the sandbox, so the agent never holds a real credential to bypass. This costs opencode nothing in their threat model, where the process runs on a trusted developer machine, but it would cost us the whole "policy outside the model" principle if we relied on it for an unattended worker.

## 8. Red flags and slop assessment

The project is real and actively maintained: 210,753 stars, 27,908 forks, 6,250 open issues, 43 releases in the last three months, all patch-level semver bumps with no breaking change announced, and a last push the same day as this research (gh api, 2026-09-29).

Several evocatively named directories are hollow next to what their names suggest. `packages/identity/` is brand assets only. `packages/core/src/control-plane/` is one database table and a session-move helper. The OSS `packages/enterprise/` package is the share-link hosting backend, not the SSO and central-policy logic the enterprise marketing page describes, which is entirely undisclosed. `packages/containers/` is CI build images, not agent runtime sandboxing, despite living in a monorepo about running agents.

Security is the sharpest flag. Three real 2026 advisories (CVE-2026-22812, GHSA-c83v-7274-4vgp, GHSA-632h-h47v-g4x4) landed against a stated vendor position that an unauthenticated-by-default, RCE-capable server is not a vulnerability unless the user secures it themselves, plus a stated policy of declining to request a CVE for at least one of them to avoid rewarding low-quality vulnerability hunting. No licence change was found; MIT covers the whole history checked. No lock-in risk was found in the core tool itself, which is open and model-agnostic; any lock-in risk sits in the optional Zen, Go and Enterprise layers, none of which are required to run opencode.

CONTRIBUTING.md states that "any UI or core product feature must go through a design review with the core team before implementation" and that PRs ignoring this will likely be closed, and that new model provider support goes to a separate `models.dev` repository rather than opencode itself. Governance is centralised even though the code is open.

## 9. Sources

https://opencode.ai
https://opencode.ai/docs
https://github.com/anomalyco/opencode
gh api repos/anomalyco/opencode
gh api repos/anomalyco/opencode/releases --paginate
/home/womb/repos/market-research-clones/opencode/README.md
/home/womb/repos/market-research-clones/opencode/CONTRIBUTING.md
/home/womb/repos/market-research-clones/opencode/package.json
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/server.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/permissions.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/sdk.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/acp.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/zen.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/go.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/agents.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/cli.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/config.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/policies.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/network.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/enterprise.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/share.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/github.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/mcp-servers.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/plugins.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/web.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/tools.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/ecosystem.mdx
/home/womb/repos/market-research-clones/opencode/packages/web/src/content/docs/providers.mdx
/home/womb/repos/market-research-clones/opencode/packages/core/src/credential/sql.ts
/home/womb/repos/market-research-clones/opencode/packages/core/src/tool/bash.ts
/home/womb/repos/market-research-clones/opencode/packages/core/src/control-plane/ (listing)
/home/womb/repos/market-research-clones/opencode/packages/core/src/permission/ (listing)
/home/womb/repos/market-research-clones/opencode/packages/containers/README.md
/home/womb/repos/market-research-clones/opencode/packages/identity/ (listing)
/home/womb/repos/market-research-clones/opencode/packages/enterprise/ (listing)
/home/womb/repos/market-research-clones/opencode/packages/function/src/github.ts
/home/womb/repos/market-research-clones/opencode/packages/server/src/ (structure)
WebSearch: opencode Anomaly Innovations funding SST rebrand, 2026-09-29
WebSearch: opencode vs Claude Code review comparison, 2026-09-29
WebSearch: opencode security vulnerability CVE GHSA 2026, 2026-09-29
