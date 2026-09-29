---
name: Keycard
slug: keycard
url: https://www.keycard.ai
repo: none
category: policy-identity
license: "mixed: proprietary SaaS control plane; SDKs, CLI plugin and Terraform provider under Apache-2.0 or MIT"
open_source: partial
self_hostable: partial
hosting_model: multi-tenant SaaS control plane on AWS (console.keycard.ai); Enterprise tier adds a dedicated cell, BYOC or on-prem, undocumented publicly
company: Keycard Labs, Inc., San Francisco (Delaware-incorporated), founded 2024 or 2025 (PitchBook and Mergr disagree), about 28 employees (PitchBook)
maturity: GitHub org created 2025-07-17, 18 public repos, all under 4 stars, oldest SDK repo from 2025-09-04, most repos pushed within days of 2026-09-29, stealth launch October 2025, coding-agent product in early access since March 2026, two acquisitions in 2026 (Anchor.dev, Runebook)
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 4
  identity_per_task: 4
  cost_control: 0
  ux: 2
  reseedable_selfhost: 1
steal:
  - The credential-provider abstraction in the Python SDK (packages/oauth/src/keycardai/oauth/server/credentials.py): ClientSecret, WebIdentity and WorkloadIdentity as three interchangeable ways to prove an application's identity to the token endpoint, with WorkloadIdentity taking a pluggable IdentityTokenSource (FileTokenSource for EKS, AKS and any Kubernetes projected ServiceAccount token, GCPMetadataTokenSource, FlyTokenSource). A clean shape to copy if our own identity proxy ever needs to support more than one cluster or cloud.
  - The Temporal integration (packages/temporal): a `@grant(resource)` decorator plus a `KeycardInterceptor` that mints a fresh token per activity execution and writes nothing to workflow history. We also run one Temporal workflow per task; the discipline of scoping a credential to the activity rather than the workflow, and keeping it out of durable history, is worth checking against our own gate and session activities.
  - Cedar as the policy language for per-tool rules, with `forbid` always overriding `permit`, an `@itl("prompt")` annotation that turns a single rule into a human-approval gate, and a console-level observe-only mode that replays a new policy version against real recent traffic before it goes live, with one-click rollback. Richer authoring and test workflow than our flat YAML file.
  - The Claude Code hook wiring itself (plugins/keycard-cli/.claude-plugin/plugin.json): a SessionStart hook that warns when the session was not launched under policy control, and PreToolUse plus UserPromptSubmit hooks that shell out to a policy check before every tool call and every prompt. A working, minimal reference for hooking Claude Code if we ever add local guardrails for engineers running agents outside the factory.
  - Policy evaluated at issuance, not at use: their STS either mints a scoped credential or mints nothing, so a denied request has no credential to leak, intercept or revoke later. Worth an explicit check that our gateway never holds a virtual key before the capability, budget and approval checks all pass.
  - Delegation chaining: each hop in a multi-agent call gets its own narrower token, and revoking the originating session invalidates every token in the chain at once. We mint one task-scoped token per pod and have no equivalent for a task that spawns sub-agents or calls another agent's tools; worth a look once that shape appears in our design.
differs:
  - Their coding-agent enforcement point is a CLI process on the same machine as the agent (laptop or CI runner), wrapping the agent and trusting its own hooks not to be bypassed by the process it constrains. Ours is a network boundary the agent cannot reach around even fully compromised: default-deny egress plus a gateway that never lets key material into the sandbox. Copying their model into our worker plane would weaken us, not strengthen us; their reach across laptops and arbitrary CI is a problem we do not have, because every task already runs in a namespace we control.
  - Keycard is itself a hosted multi-tenant SaaS dependency. We cannot make "call an external STS for every tool call" part of our core identity path without breaking re-seedability: it is a fourth thing we would not own and could not rebuild from Git, S3 and a seed bundle. Self-hosting exists only behind an undocumented Enterprise tier.
  - Their four-part identity (user, device, agent, task) assumes a human is normally delegating into an agent session, with SSO federation and a consent screen per resource. Most of our tasks start from an issue or an alert with no requesting human at all; the closest match we have is the approver at the merge gate, not a per-call delegator. Adopting their consent-chain machinery would require inventing a human for every task we currently run without one.
  - Task, as an identity dimension, is not a claim in Keycard's own token schema: the documented JWT claims are `iss`, `sub`, `sub_profile`, `keycard_app_id`, `client_id`, `aud`, `scope`, `sid`, `exp`, `iat`, `jti`, none of them a task identifier. The dimension is carried informally through scope and session id and asserted in blog prose, not in the wire format. Our task already has a durable Temporal workflow, a Postgres row and a budget ledger behind it; an external broker like this would only ever be a credential-issuance layer on top, never a replacement for that state.
ux_verdict: A tight, single-developer CLI loop (`keycard run -- claude`, then ask Claude in plain language what is allowed or why a tool was blocked) with no visible equivalent to a fleet-wide task board, since watching and steering many concurrent agent runs is simply outside what this product does.
slop_verdict: Real company, real funding, real and actively committed-to open SDKs, but the coding-agent product is early access as of its March 2026 launch. Codex is named in launch marketing with no corresponding open plugin or hook code found anywhere in the `keycardai` GitHub org, only Claude Code has one.
---

# Keycard

## 1. What it is

Keycard is a hosted identity and policy broker for AI agents, sold by Keycard Labs, Inc. (San Francisco, founded around 2024 to 2025 depending on the source, about 28 employees per PitchBook). It replaces static API keys and long-lived service tokens with short-lived, task-scoped credentials minted just before a tool call and discarded after. The company's own framing: "Every agent gets an identity. Every tool call gets a credential. Every action gets a log." It emerged from stealth in October 2025 with 38 million USD in seed and Series A funding (Andreessen Horowitz, Boldstart Ventures, Acrew Capital), founded by Ian Livingstone and Matthew Creager, both former Snyk platform leaders, and Jared Hanson, former Auth0 chief architect and the creator of Passport.js.

Two product lines exist: "Keycard for Multi-Agent Apps" (SDKs for Python, TypeScript, Go and, in private preview, Ruby, for services and agents that call each other and third-party APIs) and "Keycard for Coding Agents" (a CLI, `keycard run`, that wraps Claude Code, Cursor, OpenAI Codex, OpenCode and, per the marketing copy, "any coding agent"), launched to early access in March 2026. In February 2026 Keycard acquired Anchor.dev, a certificate-based identity tooling team, to extend attestation into the coding-agent line; it separately acquired Runebook, maker of the MCP desktop client Tome. Chime is the one named production customer (May 2026).

What the company claims: identity resolved from four dimensions (user, device, agent, task), workload attestation through SPIFFE, Kubernetes ServiceAccounts, cloud instance identity or mTLS, and a security token service that only ever issues a credential when policy already permits it. What the code and docs actually show: RFC 8693 OAuth token exchange is real and implemented (`packages/oauth/src/keycardai/oauth/operations/_token_exchange.py` in the Python SDK), SPIFFE is not referenced anywhere in any of the open SDKs, and "task" has no claim of its own in the documented JWT schema (`docs.keycard.ai/reference/token-claims` lists eleven claims, none of them a task identifier). The coding-agent product's only public hook implementation, for Claude Code, is a conventional set of Claude Code hooks (`SessionStart`, `PreToolUse`, `UserPromptSubmit`) shelling out to a local CLI binary that reads a Cedar policy file from disk.

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. Keycard has no concept of an incoming issue, alert or ticket; it activates only when an already-running agent makes a tool call. | Forgejo webhooks, SigNoz alerts, factoryd intake API; every task is a Forgejo issue. | not comparable |
| Control plane | A "zone" holds users, applications, resources, providers and policy versions, plus a session id shared across an authentication session. No task registry, no scheduler, no budget or approval workflow for the work itself. | `factoryd` with one Temporal workflow per task, Postgres task registry, policy in Git via Flux, cost ledger, approvals as workflow state. | we lead |
| Worker plane | Assumes a sandbox exists elsewhere (laptop, CI runner, container) and wraps the agent process inside it with a CLI; does not create or isolate the sandbox itself. | One gVisor pod, namespace and ServiceAccount per task, read-only root filesystem, non-root, default-deny egress. | not comparable |
| Verification | None. No CI, no gates, no model review; a Cedar `@itl("prompt")` annotation can force a human approval before one specific tool call runs, which is the closest analogue. | Forgejo Actions, policy gate, migration gate, reproduction gate, stronger-model review, human or `auto` merge rule. | we lead |
| Merge and deploy | Out of scope entirely. | Bot merge after approval or the `auto` rule, Flux deploy, staged rollout with a soak window. | we lead |
| Policy outside the model | Cedar permit/forbid rules per tool (and, for Bash, per command pattern), evaluated by a local CLI process before a hook lets a tool call through; a separate console-side policy engine gates credential issuance for the multi-agent SDK line. Versioned, testable against live traffic, one-click rollback. | Capability policy is a YAML document in Git, applied by Flux, enforced in gateway code and Cilium network policy. | they lead on authoring and test workflow, we lead on where enforcement actually sits |
| Identity per task | A composite of user, device, agent and task, workload attestation via SPIFFE/K8s SA/cloud instance ID/mTLS (per marketing; only cloud instance ID and Kubernetes-style projected tokens appear in the open SDK code), RFC 8693 token exchange with delegation chains that narrow at each hop and revoke together. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer, mapped to the task row. | they lead on delegation-chain modelling, we lead on a proven, code-verified enforcement path |
| Artifacts, not chat | Not applicable; Keycard has no opinion on how an agent receives work or reports back, only on what it is allowed to touch while doing so. | `TaskBrief` in, branch and PR out, a normalised event stream in between. | not comparable |

## 3. Architecture and stack

No central product repository exists to read; the issuer, console and CLI binary are closed. What is open, and what this report reads directly, is a set of SDKs and a Claude Code plugin under `github.com/keycardai` (18 public repos, org created 2025-07-17):

- `python-sdk` (MIT, packages for `oauth`, `mcp`, `fastmcp`, `a2a`, `langchain`, `starlette`, `temporal`). The `oauth` package implements OAuth 2.0 discovery, PKCE, client credentials, and RFC 8693 token exchange from scratch (`packages/oauth/src/keycardai/oauth/operations/_token_exchange.py`, `_client_credentials.py`, `_discovery.py`). `packages/oauth/src/keycardai/oauth/server/credentials.py` defines `ClientSecret`, `WebIdentity` (RFC 7523 private-key JWT) and `WorkloadIdentity`, the last taking a pluggable `IdentityTokenSource`: `FileTokenSource` (explicitly documented as covering "EKS pod identity, AKS workload identity, any Kubernetes projected service-account token"), `GCPMetadataTokenSource`, and `FlyTokenSource`. `EKSWorkloadIdentity` is kept only as a deprecated alias. No file in the SDK mentions SPIFFE.
- `packages/temporal` ships `KeycardInterceptor` and a `@grant(resource)` decorator that mints one token per Temporal activity execution, with per-activity identity modes for acting as the application, acting on behalf of a user (RFC 8693 exchange of a session token) or impersonating a stable user identifier (a separate, policy-gated trust mode, off by default).
- `keycard-go` and `go-sdk` (Apache-2.0 and MIT) are a Stainless-generated REST client over the Management API (zones, applications, resources, policies, secrets), not a runtime SDK.
- `plugins` (Apache-2.0) contains exactly one plugin, `keycard-cli`, for Claude Code: a `SessionStart` hook, `PreToolUse` and `UserPromptSubmit` hooks that run `keycard agent hook claude`, and six Claude Code skills (`/keycard-credentials`, `/keycard-query-policy`, `/keycard-upsert-policy`, and others) that let a developer ask Claude in plain language what the active Cedar policy allows or why a tool was blocked. The reference docs bundled with the plugin (`reference/cedar-policy.md`, `reference/keycard-config-fields.md`) describe the actual mechanics: the policy lives as a plain file at `~/.local/state/keycard/policy.cedar`, read fresh on every hook call with no cache; `keycard.toml` maps environment variable names to OIDC resource URIs, and the CLI exchanges tokens for those resources and injects them into the wrapped process's environment, never to disk.
- `terraform-provider-keycard` and `gha-keycard-auth` (Apache-2.0) round out the infrastructure-as-code and CI story: the GitHub Action exchanges a workflow's own OIDC token for a scoped Keycard credential, the same workload-identity pattern as `FileTokenSource` applied to Actions instead of Kubernetes.

Commit activity is real and current: `keycard-go` was pushed hours before this research (2026-09-29), `python-sdk` has ten contributors including a bot attributed to Devin (41 commits) alongside two named engineers doing most of the work (247 and 140 commits). Star counts across every repo are 0 to 3, unsurprising for SDKs whose users are Keycard's own paying customers rather than an open community.

The SaaS side is described only in docs and blog posts, not code. `docs.keycard.ai/reference/security-architecture` (fetched 2026-09-29) documents envelope encryption per "zone" (a per-zone DEK under an AWS KMS-held key, ChaCha20, 15-minute in-memory DEK cache), customer-managed KMS keys gated by an `aws:PrincipalOrgPaths` condition, and PrivateLink for KMS traffic. It states plainly that self-hosting is not offered outside the undocumented Enterprise tier, and it does not mention SPIFFE, Kubernetes ServiceAccounts, or cloud instance identity documents anywhere, despite those being the headline attestation list on the marketing site and in the "Agent Security Stack" blog post.

## 4. UX

Onboarding for the coding-agent product, reconstructed from the docs navigation and the `plugins` README (the specific quickstart and use-case doc URLs guessed from the site map both 404, so exact screenshots and step counts are not verified): install the CLI, `claude plugin marketplace add keycardai/plugins`, `claude plugin install keycard-cli@keycardai`, then run `keycard run -- claude` instead of `claude` directly. From that point, tool calls that Cedar policy already permits proceed silently; a call that policy denies is stopped before it runs, and one flagged with `@itl("prompt")` pauses for a human's explicit approval. A developer can ask Claude Code itself, in a normal message, "what tools am I allowed to use" or "why was that tool blocked," and the bundled skill reads the policy file and answers, or drafts a Cedar edit for the developer to confirm.

This is a narrower and more local kind of "watching" than our console: there is no dashboard for a fleet of concurrent tasks, because Keycard's coding-agent line is scoped to one developer's one session on one machine at a time. The `console.keycard.ai` side (used by the multi-agent SDK line and by administrators) is described in the docs navigation as having an activity/audit log, session views and policy version history, but no screenshot was captured directly. Intervention for the coding-agent line is per-tool-call (approve or deny in the moment) rather than per-task (redirect, add budget, escalate), which fits a product built around one interactive session rather than an autonomous multi-hour run.

## 5. Security, identity, sandbox, policy, cost

**Identity.** Real and implemented in code for the SDK line: RFC 8693 token exchange, three application credential types, and a `WorkloadIdentity` abstraction that reads a platform-projected token file (Kubernetes, EKS, AKS) or a cloud metadata endpoint and uses it as a JWT-bearer client assertion, never a shared secret. The composite "user, device, agent, task" framing is real at the level of marketing and blog prose but thinner in the wire format: the documented JWT carries `sub`, `sub_profile`, `keycard_app_id`, `aud`, `scope` and `sid`, no discrete task claim, so "task" is asserted through scope and session grouping rather than carried as data.

**Attestation.** SPIFFE, Kubernetes ServiceAccounts, cloud instance identity and mTLS are the marketing site's list. Only the Kubernetes/cloud-metadata style (via `FileTokenSource` and `GCPMetadataTokenSource`) and a private-key-JWT device identity (via `WebIdentity`) appear anywhere in the open code. SPIFFE does not appear in any file across the three repositories read for this report. The February 2026 Anchor.dev acquisition (certificate-based identity, X.509) is pitched as the technology that will fill this gap for the coding-agent line, but the announcement gives no protocol-level detail on how a certificate feeds the token exchange flow, so treat SPIFFE-grade attestation as roadmap, not shipped.

**Sandbox.** Not their concern. The coding-agent product explicitly targets "laptops, sandboxes, and CI environments" built by someone else; Keycard adds a policy and credential layer inside whatever process boundary already exists. For the CLI-wrapped case, that boundary is the CLI process itself and its Claude Code hooks, running as the same operating-system user as the agent it constrains. Whether the local Cedar policy file at `~/.local/state/keycard/policy.cedar` is protected from being edited or bypassed by the very agent process it governs, versus only being editable through the CLI, is not documented and not verified from the public material.

**Policy.** Cedar (the same policy language AWS uses in Verified Permissions) with `permit`/`forbid` clauses matched against a tool name, `forbid` unconditionally winning, `@itl("prompt")` for a per-rule human-in-the-loop gate, and pattern matching on Bash command strings. Console-side, policy has versions, a documented observe-only test mode against live traffic, and one-click rollback. For the multi-agent SDK line, the STS evaluates policy at the moment of issuance: a denied request produces no credential at all rather than a credential that is later blocked. That is a stronger invariant, on paper, than "a valid credential exists and something downstream checks a rule," though we could not verify, for the CLI-wrapped coding-agent path specifically, whether every enforcement decision round-trips to that same server-side evaluation or is sometimes made from the local, disk-resident policy file alone.

**Cost.** No budget, hold or spend-ledger concept anywhere in the docs, blog or pricing page. Keycard's own pricing is a transaction-count metric on itself (credential issuance, validation, exchange, step-up approval), not a control over what an agent spends on model calls or cloud resources. This is a gap in their product, not an oversight in this report: cost control simply is not a problem Keycard sets out to solve.

## 6. What we should take from it

**Narrow, worth copying this month or next quarter.** The `WorkloadIdentity` / `IdentityTokenSource` split (`packages/oauth/src/keycardai/oauth/server/credentials.py`) is a clean shape for our own identity proxy: one interface, one implementation per platform (file-based projected token, cloud metadata endpoint), so a future multi-cluster or multi-cloud factory would only need a new `IdentityTokenSource`, not a rewrite. The Temporal `@grant`/`KeycardInterceptor` pattern is directly applicable, since we already run Temporal: minting a credential per activity execution rather than per workflow, and being deliberate that nothing sensitive is written into workflow history, is a concrete check to run against our own gate and session activities. The Cedar policy authoring workflow (observe-only test against real recent traffic, versioned rollback, an `@itl` annotation that turns one specific rule into a human-approval gate) is more mature tooling around policy change than our single Git-tracked YAML file, and worth stealing as a workflow pattern even without adopting Cedar itself.

**Broad, a product shape or priority to notice.** Keycard treats "identity belongs to the task" as sellable on its own, decoupled entirely from running the task: no scheduler, no sandbox, no CI, just credentials and policy for whatever already exists. That is evidence our own principle is not a niche concern, an outside company raised 38 million USD to sell exactly this one plane. Their delegation-chaining model, where a multi-agent call chain narrows scope at every hop and a single revocation invalidates the whole chain, is a shape we do not have any equivalent for yet, since today's factory is one agent per task with no sub-agent delegation; worth keeping in mind as a target shape for whenever that changes.

## 7. Where our philosophy differs and what that costs or buys us

Keycard's coding-agent enforcement is a trust boundary drawn around a CLI process on the same machine as the agent it restrains, which only works because their target is a laptop or an arbitrary CI runner they do not control the shape of. Our target is a Kubernetes pod we create ourselves, so we can and do draw the boundary at the network layer instead: default-deny egress and a gateway that never lets key material reach the sandbox at all, a stronger guarantee than "a well-behaved hook ran first." Copying their approach into our worker plane would be a downgrade for us; their approach exists to reach places we do not need to reach.

Keycard is a SaaS dependency by construction, and self-hosting is gated behind an Enterprise tier with no public technical detail. Our first constraint is that the whole factory must be deletable and re-seedable from Git, S3 and one offline bundle. We could not adopt "call Keycard's STS for every tool call" as a load-bearing part of our identity path without adding a service we do not own and cannot rebuild ourselves, so at most this is a pattern to learn from, never a dependency to take on.

Their four-part identity assumes a human is usually present, delegating into an agent session, with SSO and a consent screen. Most of our tasks start from an issue or a telemetry alert with nobody delegating anything in the moment; the closest thing we have is the approver at the merge gate. Their whole consent and delegation-chain machinery solves a shape of the problem (an interactive human-plus-one-agent session) that is not the shape our autonomous, issue-triggered tasks take.

## 8. Red flags and slop assessment

The company and the funding are real and independently reported (Help Net Security, SecurityWeek, Digital Commerce 360, all 2025-10-21 to 2025-10-23), the founding team's prior roles at Snyk, Auth0 and Okta check out across multiple sources, and the open SDKs show real, current, multi-contributor engineering rather than a marketing shell. A named production customer, Chime, is cited from May 2026, later than a November 2025 competitor analysis (WorkOS) that said no customer deployments existed yet, so the product has visibly moved since launch.

Two specific gaps between marketing and evidence stood out during this research. First, SPIFFE is listed on the homepage and in the "Agent Security Stack" blog post as one of four attestation mechanisms, but it appears in none of the three open repositories read for this report; only Kubernetes/cloud-metadata-style projected tokens and private-key JWT device identity are implemented in the open SDK. Second, OpenAI Codex is named explicitly in the "Announcing Keycard for Coding Agents" launch post as a supported agent, but the only agent-harness plugin published anywhere in the `keycardai` GitHub org is for Claude Code; no Codex hook, plugin or integration code is public.

The competitor-authored WorkOS comparison (dated shortly after the October 2025 launch) called the product "experimental" with no disclosed enterprise deployments and limited documentation; that critique is a year stale against the May 2026 Chime reference and against the documentation actually read for this report, which is substantial and technically specific for the SDK line, though still thin for the newer coding-agent line specifically. No licence changes, security incidents or open-core gating were found. The two 2026 acquisitions (Anchor.dev, Runebook) both read as capability buys still being integrated rather than completed products, so the SPIFFE and certificate-based attestation story for coding agents is more roadmap than shipped as of this report's date.

## 9. Sources

- https://www.keycard.ai (fetched 2026-09-29)
- https://www.keycard.ai/pricing (fetched 2026-09-29)
- https://www.keycard.ai/blog/agent-security-stack/ (fetched 2026-09-29)
- https://www.keycard.ai/blog/announcing-keycard-for-coding-agents/ (fetched 2026-09-29, dated March 2026 launch post)
- https://www.keycard.ai/blog/keycard-acquires-anchor-dev (fetched 2026-09-29, dated 2026-02-10)
- https://docs.keycard.ai (fetched 2026-09-29)
- https://docs.keycard.ai/reference/security-architecture (fetched 2026-09-29)
- https://docs.keycard.ai/reference/token-claims (fetched 2026-09-29)
- https://docs.keycard.ai/concepts/applications (fetched 2026-09-29)
- https://docs.keycard.ai/get-started/how-keycard-works (attempted 2026-09-29, HTTP 404)
- https://docs.keycard.ai/get-started/use-cases/govern-a-coding-agent (attempted 2026-09-29, HTTP 404)
- https://docs.keycard.ai/get-started/quickstart (attempted 2026-09-29, HTTP 404)
- https://workos.com/blog/keycard-vs-workos-agent-credentials-enterprise-authentication (fetched 2026-09-29, competitor-authored, dated around November 2025)
- https://www.digitalcommerce360.com/2025/10/21/keycard-raises-38-million-funding-ai-agents-ecommerce/ (search result, dated 2025-10-21)
- https://www.helpnetsecurity.com/2025/10/22/keycard-ai-agents-identity-access-platform/ (search result, dated 2025-10-22)
- https://www.helpnetsecurity.com/2026/05/15/keycard-for-multi-agent-apps/ (search result, dated 2026-05-15)
- https://intellyx.com/2026/03/19/keycard-identify-based-security-and-governance-for-agentic-ai/ (search result, dated 2026-03-19)
- https://sacra.com/c/keycard/ (search result, undated)
- https://pitchbook.com/profiles/company/820190-89 (search result, employee count and founding year)
- https://mergr.com/company/keycard-labs (search result, HQ and founding year)
- WebSearch: "Keycard.ai identity credentials agents funding" (2026-09-29)
- WebSearch: "keycard.ai SPIFFE agent identity task credentials" (2026-09-29)
- WebSearch: "keycard.ai docs \"govern a coding agent\" OR \"Connect Claude to Resources\"" (2026-09-29)
- WebSearch: "Keycard.ai review Hacker News reddit \"vs\" comparison agent identity" (2026-09-29)
- WebSearch: "keycard.ai \"task\" identity dimension \"on behalf of\" definition docs" (2026-09-29)
- WebSearch: "\"Keycard Labs\" headquarters San Francisco founded 2024" (2026-09-29)
- gh api repos/keycardai/python-sdk (2026-09-29)
- gh api repos/keycardai/keycard-go (2026-09-29)
- gh api repos/keycardai/plugins (2026-09-29)
- gh api orgs/keycardai (2026-09-29)
- gh api repos/keycardai/python-sdk/contributors (2026-09-29)
- Clone: ~/repos/market-research-clones/python-sdk (README.md, packages/oauth/src/keycardai/oauth/server/credentials.py, packages/oauth/src/keycardai/oauth/operations/_token_exchange.py, packages/temporal/README.md, docs/standards, docs/project/decisions)
- Clone: ~/repos/market-research-clones/keycard-go (README.md, top-level layout)
- Clone: ~/repos/market-research-clones/plugins (README.md, plugins/keycard-cli/.claude-plugin/plugin.json, plugins/keycard-cli/reference/cedar-policy.md, plugins/keycard-cli/reference/keycard-config-fields.md, plugins/keycard-cli/reference/keycard-management-api.md, plugins/keycard-cli/skills/keycard-query-policy/SKILL.md)
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/01-report-template.md
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md (worker plane and security model sections)
