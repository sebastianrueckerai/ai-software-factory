---
name: Composio
slug: composio
url: https://composio.dev
repo: https://github.com/ComposioHQ/composio
category: policy-identity
license: "mixed: MIT for the SDKs, CLI and docs in this repo; the execution backend, sandbox and dashboard are closed SaaS"
open_source: partial
self_hostable: no
hosting_model: proprietary multi-tenant SaaS (backend.composio.dev); the MIT-licensed pieces are client libraries only, there is no self-hosted or BYOC deployment of the platform itself
company: "Composio, legal name Sampark Inc., San Francisco, founded June 2023 by Soham Ganatra and Karan Vaidya (IIT Bombay); $4M seed (Together Fund) then $25-29M Series A led by Lightspeed, closed around early-mid 2025 and announced July 2025; about 71 staff (Tracxn, May 2026)"
maturity: "MIT licence; 30.4k stars, 4.8k forks, 79 watchers, 5,498 commits, 34 open issues, 60 open PRs (GitHub page, fetched 2026-09-29); last commit 2026-09-29 (today); repo creation date not verified, GitHub API was rate-limited during this research"
similarity: 1
axes:
  signals_intake: 1
  control_plane: 0
  sandbox_isolation: 1
  verification: 0
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 2
  ux: 2
  reseedable_selfhost: 0
steal:
  - "The meta-tool / tool-router pattern (python/composio/core/models/tool_router_session.py): an agent gets a small fixed set of meta tools (search, authorize, execute) instead of hundreds of tool schemas up front, and the router resolves the real tool at call time. Worth checking against our own factory-gateway if its tool surface ever grows past a handful of first-party tools."
  - "Reusable, persistent per-user connected accounts (ConnectedAccounts.ts, connected_accounts.py): a user authorises once and every later session reuses the stored connection. A pattern to weigh only for a future long-lived per-project integration, never for our per-task credentials, which are deliberately not reused."
  - "Treating an untrusted API response field as attacker-controlled before using it to build a network destination: triggers.py validates the Pusher `cluster` value against `_PUSHER_CLUSTER_PATTERN` (`^[a-z0-9-]+$`, max 64 chars) before it is formatted into a websocket host, with a comment noting the field arrives from an untrusted response. A concrete habit worth grepping our own gateway code for missing equivalents."
  - "A hard, legible free-tier cap with no silent overage (Hobby plan stops at 100K tool calls a month until upgrade) is a simple model worth comparing to our own hold-then-settle ledger for the tone of our own budget messaging."
  - "\"Self-managed credentials\", where a caller passes its own token at execution time and Composio never stores it, is offered as an explicit lower-trust mode on their own platform. It is a tacit admission from a company whose whole product is storing other people's OAuth tokens that not storing them is the safer default, the default our design already takes."
differs:
  - "Composio's product is breadth: 1,500+ pre-integrated apps reached by centralising every customer's OAuth tokens in one multi-tenant credential store. Our principle is the opposite, identity belongs to the task and no standing credential exists anywhere the agent can reach. We could use Composio only as an optional third-party tool catalogue behind our own gateway, never as a place to let real credentials live."
  - "Composio's May 2026 breach (disclosed 2026-05-21: about 5,241 API keys and 5,001 GitHub OAuth tokens taken from internal systems, one account tracing it to a compromised internal agent's remediation tool reaching code execution in their own execution sandbox) is close to the exact failure our sandboxing and default-deny egress exist to make structurally impossible: one compromised internal path exposing every customer's long-lived tokens at once. Our per-task gVisor pod holds no key material and is destroyed after use, so an equivalent compromise cannot reach another task's credentials by construction."
  - "A Composio 'session' is an app-integration execution context (which SaaS apps can this call touch, with which stored token), with no concept of a git branch, a PR, a task registry or a merge gate. It solves 'let an agent act on Gmail, Slack or GitHub' as an end in itself; it has no path to becoming a task orchestrator, only a candidate tool-and-auth layer bolted onto our worker plane for calling third-party SaaS apps."
ux_verdict: "A five-line SDK quickstart and a hosted connections dashboard, fast for a developer wiring up one more app to one agent, but built around one user's one app connection, not a fleet of concurrent tasks to watch, approve or stop."
slop_verdict: "Real, funded and used in production (200+ customers including Glean, 100k+ developers claimed, 30.4k stars, a commit the same day as this report), but with a real scar record: a disclosed May 2026 credential-store breach and four independently confirmed CVEs on NVD, including a critical authentication bypass and a 2026 path-validation bypass reachable by prompt injection. Not a README with a landing page, but not a platform to trust with sensitive credentials without its own compensating controls."
---

# Composio

## 1. What it is

Composio (legal entity Sampark Inc., San Francisco, founded June 2023) sells a hosted layer that gives an AI agent authenticated access to a large catalogue of third-party apps: OAuth handled end to end, a remote sandbox to process results outside the model's context, and event triggers that push app activity back into a running session. It targets developers building agents (an SDK in TypeScript and Python plus a CLI) and, per its own marketing, "everyday" users wiring MCP-capable clients like Claude or Cursor directly to apps with no code. The company claims agents built on it take action "100M+ times a week" across "1,500+ apps."

What the repository (github.com/ComposioHQ/composio, MIT) actually is: the client SDKs, CLI, provider adapters and docs site, not the platform. Every code path that matters, session state, the tool router, OAuth token storage, and the sandbox itself, calls out to Composio's own closed backend at `backend.composio.dev` through a generated client (`composio_client`). Nothing in the open repository runs a sandbox or stores a credential; this is a thin, well-documented client over a proprietary SaaS control plane, the same shape as LangSmith's open SDK over a closed backend.

## 2. Mapping to our five planes

| Plane / principle | What Composio does | What we do | Verdict |
|---|---|---|---|
| Signals | "Triggers": app events (new email, new Slack message) delivered over a Pusher websocket into a running session (`triggers.py`, `webhooks.py`). Reacts to app state, not issues or telemetry as units of work. | Forgejo webhooks, SigNoz alerts, factoryd intake API; every task is a Forgejo issue. | not comparable |
| Control plane | None. A "session" holds tool access, auth state and sandbox files for one user; no task registry, scheduler, or approval workflow. | Temporal workflow per task, Postgres registry, budgets, approvals. | we lead |
| Worker plane | A remote, session-scoped "workbench" sandbox for running code against tool output; isolation mechanism undocumented, and the May 2026 breach traces one path through this same execution sandbox. | Disposable gVisor pod per task, read-only root FS, default-deny egress. | we lead |
| Verification | None. | Forgejo CI, policy gates, stronger-model review before merge. | we lead |
| Merge and deploy | Not applicable. | Bot merge after approval, Flux GitOps rollout. | not comparable |
| Policy outside the model | Per-session toolkit/tool allowlists and tags set through the SDK; Enterprise adds SSO/SCIM and a customer-run KMS keyring proxy. No standalone policy document or language found. | Capability YAML in Git, applied by Flux, enforced in gateway code and network policy. | we lead |
| Identity per task | Identity is per-user, via long-lived stored OAuth "connected accounts" reused across sessions, or a self-managed token passed in at call time. No task-scoped credential concept. | A projected, audience-scoped ServiceAccount token minted per task, held nowhere else. | we lead |
| Artifacts, not chat | Not applicable; a session exchanges tool calls and results, with no branch, PR or artifact concept. | `TaskBrief` in, branch and PR out. | not comparable |

## 3. Architecture and stack

TypeScript and Python SDKs live in one monorepo (`ts/packages/core`, `python/composio`), both thin wrappers generated around a private REST API client (`composio_client`). Core objects: `Session` (`ts/packages/core/src/models/Sessions.ts`, `python/composio/core/models/session_context.py`), `ToolRouterSession` (search, authorize, execute, files), `ConnectedAccounts` and `AuthConfigs` for OAuth, `MCP.ts` for exposing a session as an MCP endpoint, and `Triggers`/`Webhooks` for the Pusher-backed event push. Provider adapters translate Composio's tool schema into the native tool format of about fifteen agent frameworks (OpenAI, Anthropic, LangChain, CrewAI, Google ADK and others). The CLI (`ts/packages/cli`, installed via `curl -fsSL https://composio.dev/install | sh`) gives a coding-agent host a local `composio search/execute/link/run` surface. No queue, workflow engine or storage layer is open source; sessions, the sandbox, and the credential store all live behind `backend.composio.dev`. Files read: `README.md`, `CONTRIBUTING.md`, `LICENSE`, `python/composio/core/models/tool_router_session.py`, `triggers.py`, top-level layout of `ts/packages/core/src`.

## 4. UX

Zero to first result: `npm install @composio/core ...` or `pip install composio ...`, get an API key from the dashboard, `composio.create(user_id)`, hand `session.tools()` to an agent framework, run it, about 5 steps plus the dashboard signup. The CLI path is `curl | sh`, then `composio login`, then `search`/`execute`/`link`. A user watches nothing beyond their own agent framework's own output; there is no task board, no per-run trace view, and intervention is scoped to one OAuth consent screen per app connection, not to steering or approving an in-flight multi-step task the way our console's human lane does.

## 5. Security, identity, sandbox, policy, cost

**Identity.** Per-user OAuth "connected accounts," stored centrally and reused across sessions, or a caller-supplied token at execution time that Composio says it never stores. No task-scoped or short-lived credential model.

**Sandbox.** A "remote workbench" scoped to a session, used to process tool output outside model context; the isolation technology is not documented anywhere read for this report, and the May 2026 incident write-ups describe a path through this same execution sandbox reaching further systems.

**Policy.** Per-session toolkit and tool allow-lists, tags, and (Enterprise only) SSO/SCIM plus a customer-run KMS keyring proxy for secret storage; no independent policy language or document store was found.

**Cost.** Plan-level metered quotas (tool calls, trigger events, LLM tokens) with a hard-capped free tier and optional per-meter spend caps on paid plans; this is account-level metering, not a per-task hold-and-settle ledger.

## 6. What we should take from it

Narrow: the meta-tool/tool-router pattern for keeping an agent's tool list small regardless of catalogue size, and the untrusted-field validation habit in `triggers.py` before building a websocket URL from an API response, are both worth a direct check against our own gateway code. Broad: nothing here changes our product shape, Composio solves "authenticate and call third-party SaaS apps," a problem our factory does not currently have (our tools are first-party and fixed); it is only a candidate future tool catalogue behind our gateway, never infrastructure to depend on for identity or credentials given its own record.

## 7. Where our philosophy differs and what that costs or buys us

Composio's entire value proposition, one place holding everyone's OAuth tokens so agents can reach 1,500 apps, is the design our "identity belongs to the task, never a stored key" principle exists to avoid. Their May 2026 breach makes the cost of that shape concrete: thousands of live customer credentials taken at once from a central store. Our constraint (short-lived, task-scoped, gateway-mediated tokens, no key material in a sandbox) is more expensive to build than "store the OAuth token" but removes this exact failure mode by construction, we have no central store of anyone's tokens to breach.

## 8. Red flags and slop assessment

A real, disclosed security incident: Composio's own post (2026-05-21) confirms roughly 5,241 API keys and 5,001 GitHub OAuth tokens taken from internal systems, with fixes including an OIDC replacement for shared static secrets and IP-allowlisted keys. Independent accounts (Material Security, P0 Security, Scalekit) differ on the exact attack chain but agree a compromised internal path reached the credential store; one account ties it to code execution inside Composio's own agent execution sandbox. Separately, NVD lists at least four confirmed Composio CVEs: CVE-2024-8954 (critical, CWE-304, any value in the `x-api-key` header bypassed authentication entirely), CVE-2024-8864 (critical code injection via a calculator tool), CVE-2024-53526 (CVSS 6.4 command execution in `composio_openai`/`composio_claude`/`composio_julep`), and CVE-2026-59807 (CVSS 8.9, a missing `assertSafeFileUploadPath` check letting prompt injection exfiltrate files like SSH keys via a file-upload tool parameter, patched at SDK 0.2.32-beta.283). Development activity is otherwise real and current (a commit the day of this report, 5,498 commits, 79 watchers). Competitor pages (Arcade, Merge) cite the breach and CVEs to sell against Composio; the incident and the four CVEs above are independently confirmed on NVD and Composio's own blog, not solely competitor claims.

## 9. Sources

- https://composio.dev (WebFetch, 2026-09-29)
- https://composio.dev/pricing (WebFetch, 2026-09-29)
- https://docs.composio.dev/docs/how-composio-works (WebFetch, 2026-09-29)
- https://github.com/ComposioHQ/composio (WebFetch, 2026-09-29; gh api rate-limited, stars/forks/issues read from the page instead)
- Clone: ~/repos/market-research-clones/composio (git log HEAD 2026-09-29 04:57:22 +0400) - README.md, CONTRIBUTING.md, LICENSE, top-level layout, ts/packages/core/src (models, services), python/composio/core/models/tool_router_session.py, triggers.py
- https://composio.dev/blog/composio-may-2026-security-incident (WebSearch result, dated 2026-05-21)
- https://material.security/resources/the-composio-breach-one-token-10242-doors (WebSearch result)
- https://p0.dev/blog/the-composio-breach-lets-stop-blaming-the-agents/ (WebSearch result)
- https://www.scalekit.com/blog/composio-breach-agent-security (WebSearch result)
- https://nvd.nist.gov/vuln/detail/CVE-2024-8954 (WebSearch result)
- https://nvd.nist.gov/vuln/detail/cve-2024-53526 (WebSearch result)
- https://github.com/advisories/GHSA-mrmh-3hqh-pfw7 (CVE-2024-8864, WebSearch result)
- https://www.strix.ai/cve/CVE-2026-59807 (WebSearch result)
- https://www.arcade.dev/compare/arcade-vs-composio/ (WebSearch result, competitor-authored)
- https://www.merge.dev/blog/composio-vs-arcade (WebSearch result, competitor-authored)
- https://composio.dev/blog/series-a (WebSearch result)
- https://tracxn.com/d/companies/composio (WebSearch result, headcount, founding)
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/01-report-template.md
