---
name: Infisical Agent Vault
slug: infisical-agent-vault
url: https://infisical.com
repo: https://github.com/Infisical/agent-vault
category: policy-identity
license: "mixed: MIT core, reserved (currently empty) ee/ carve-out"
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, single Go binary or Docker image, SQLite or Postgres; optional read-only sync from a hosted or self-hosted Infisical instance as a credential store backend
company: Infisical Inc., San Francisco. Founded 2022, YC W23. Raised 19.3M USD total, 16M Series A in June 2025 led by Elad Gil. About 43 employees (Aug 2026). Says it is cash-flow positive.
maturity: repo created 2026-03-27, last push 2026-09-27. 2,280 stars, 156 forks, 83 open issues, 16 contributors. 30 releases in six months, latest v0.39.3 (2026-09-01). Self-described "research preview"
similarity: 2
axes:
  signals_intake: 0
  control_plane: 2
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 4
  identity_per_task: 1
  cost_control: 0
  ux: 3
  reseedable_selfhost: 3
steal:
  - The proposal flow: an agent that hits a 403 gets a proposal_hint naming the denied host, files a structured request (services and credential slots, one human-readable message), gets an approval_url to hand the human in chat, then polls. A self-service capability-request pattern our human-approval flow lacks.
  - "Netguard: cloud metadata IPs blocked unconditionally, RFC-1918 and other private ranges blocked by default, and a resolve-then-validate-then-dial dialer that re-checks the IP right before connecting, closing the DNS-rebinding TOCTOU gap. Directly portable to any Go egress proxy."
  - Container isolation mode's default-deny egress, iptables OUTPUT DROP with a single allowed destination, host.docker.internal pinned via /etc/hosts instead of DNS so there is no DNS-exfiltration channel, capability-dropped non-root user. A concrete worked example to check our own gVisor and Cilium policy against.
  - Deterministic host and path matching, exact host beats wildcard, port-specific beats any-port, longest literal path prefix wins, ties break on declaration order, with a documented worked example. Good reference if factory-gateway ever needs finer HTTP-path-level capability matching than whole-tool grants.
  - A fire-and-forget request log, method, host, matched service, status, latency, auth scheme and which credential keys were used, but never header values, bodies or query strings, with a pluggable sink interface and age-or-row-count retention trimming. A cheap, safe-by-construction shape for our own audit trail.
  - A 34-entry built-in catalog of common APIs, host, auth type, suggested credential key, so a new service rule starts from a template instead of a blank form.
differs:
  - Identity is a long-lived, shared bearer token per named agent, hashed and stored server-side, with no expiry unless the operator rotates it by hand. Ours is a projected, audience-scoped, kubelet-rotated Kubernetes ServiceAccount token, minted per task and verified per call against the cluster OIDC issuer. Their model authenticates a standing actor, ours authenticates a single unit of work. Copying their model would mean giving up per-task credential lifetime for a simpler but weaker durable-service-account trust anchor.
ux_verdict: A working wrapped agent behind the proxy in about five CLI commands, with a clean browser page for approving proposals, but nothing to watch once it is running because the product has no notion of a task.
slop_verdict: Real and actively built, not a landing page. Thirty releases in six months, a large test suite, 16 contributors. But Infisical's own blog calls it an experimental "research preview" expecting a redesign, and most non-bot commits come from a single author, so treat interfaces as unstable.
---

# Infisical Agent Vault

## 1. What it is

Infisical Agent Vault is a standalone, self-hosted Go service that gives an AI agent an HTTPS forward proxy instead of raw API keys. The agent sends HTTPS_PROXY-routed traffic to the vault; the vault terminates TLS, strips any credential the agent supplied itself, injects the real one server-side, and forwards the request. It is built by Infisical, an open-source secrets manager (San Francisco, YC W23, Series A June 2025). Agent Vault is a separate repository and binary from Infisical's core secrets platform, not a mode of it, though it can optionally read credentials from an Infisical instance and Infisical also ships a same-shaped feature ("Agent Vault") built into its own commercial platform under the infisical agent-vault CLI namespace.

The makers' claim, stated plainly in their launch blog post: agents are "non-deterministic and easy to manipulate," so prompt injection can turn any credential placed in an agent's reach into a leak, and short-lived tokens only shrink the damage window rather than stopping the leak. Their conclusion: "if an agent can't be trusted with credentials, it shouldn't have them." The repository backs this claim with a real MITM proxy, a service-matching engine, a proposal-based human-approval workflow, and a working self-hosting story for both SQLite and Postgres.

What the docs claim and what the code does mostly agree, with one exception worth flagging up front. The project's tagline implies a deny-by-default posture, but the vault's actual default (unmatched_host_policy) is passthrough: an unmatched host is proxied through unauthenticated rather than blocked. Strict deny is real but opt-in.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. No issue, webhook, or alert intake; the product starts at "an agent wants to make an HTTP call" | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | A proposal state machine (pending to applied, rejected or expired, 7-day TTL), instance and vault RBAC, a request log with retention. No task registry, no scheduler, no budgets | Temporal workflow per task, Postgres task registry, policy as YAML in Git, cost ledger | not comparable in scope; where it overlaps (approvals, audit) they lead on the narrow slice, we lead on the whole |
| Worker plane | vault run forks or Docker-isolates one child process per invocation; a named agent is just a bearer-token holder with no lifecycle tied to a unit of work | One Kubernetes namespace, ServiceAccount and gVisor pod per task, default-deny egress except gateway, git, module proxy and telemetry | we lead, their isolation is opt-in and cooperative by default, ours is mandatory |
| Verification | None. No test gates, no model review | Forgejo Actions on gVisor runners, policy gates, stronger-model review | not comparable |
| Merge and deploy | None. Not in scope | Bot merge after approval or auto-rule, Flux GitOps | not comparable |
| Policy outside the model | Host, path and port allow-lists matched in Go code before any request leaves the proxy; a denied host returns 403 with a machine-readable hint, never a prompt-level refusal | Capability rules as a Git-versioned document, enforced in factory-gateway and network policy | they lead on granularity (per-path glob, per-port), we lead on scope, their check is HTTP-only, ours also covers non-HTTP MCP tool calls, budget and approval state in the same check |
| Identity per task | A per-agent bearer token (av_agt_...), SHA-256 hashed at rest, no expiry by default, rotatable only by an explicit agent rotate command. Not derived from any workload or cluster identity | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer on every call | we lead |
| Artifacts not chat | Proposals are structured JSON (services, credential slots, messages), which is artifact-like, but agents share an approval link in chat as the actual hand-off mechanism | TaskBrief in, branch, PR and event stream out, no chat hand-off | we lead |

## 3. Architecture and stack

Go 1.25, cobra CLI, gorm over SQLite (default) or Postgres/pgx (production), charmbracelet TUI libraries for the interactive proposal review flow, posthog-go for telemetry, and Infisical's own go-sdk for the optional external credential store sync. Deployment is a single binary or Docker image; there is no Helm chart or Kubernetes operator, only a plain Deployment manifest in the self-hosting docs for stateless multi-instance Postgres deployments behind an L7 API load balancer and a separate L4 TCP-passthrough load balancer, since the MITM CONNECT tunnel cannot go through an ordinary HTTP L7 proxy.

The proxy itself (internal/mitm/proxy.go, connect.go 238 lines, forward.go 453 lines, websocket.go 560 lines, proxy_test.go 1,906 lines) handles two paths: HTTP CONNECT tunnelling with a per-host leaf certificate minted on the fly from a locally-generated CA for HTTPS, and absolute-form request forwarding for plain HTTP. internal/brokercore applies header injection (ApplyInjection, injected values always win over anything the agent sent) and body, path and query substitution (internal/brokercore/substitution.go) for credentials that are not simple headers. internal/broker/broker.go holds the service, auth-type (bearer, basic, api-key, custom, passthrough) and matching logic, plus a second, broker-level SSRF blocklist for internal hosts. internal/netguard/netguard.go is a separate, general-purpose safe-dialer package: always-blocked IMDS ranges, default-blocked private ranges, DNS-rebinding-safe resolve-then-dial. internal/auth/auth.go implements Argon2id password hashing and a KEK/DEK envelope (AES-256-GCM DEK, Argon2id-derived KEK) for encryption at rest, with an explicitly weaker passwordless mode that stores the DEK in plaintext and relies on filesystem permissions. internal/store/sql_store.go (3,660 lines) and migrate.go (1,292 lines) carry the persistence layer; internal/infisical/dynamic.go (513 lines) implements lease-based dynamic secrets sourced from an Infisical instance. internal/isolation/docker.go (296 lines, plus a 293-line integration test) builds and runs the container-isolation mode described in section 5. internal/requestlog/ (508 lines across three files) is the audit sink.

Total internal/ code across the packages read is in the tens of thousands of lines, with large accompanying test files rather than only smoke tests, which is a real maturity signal for a six-month-old repository.

## 4. UX

Zero to a first proxied call is about five commands: install, agent-vault server (or Fly.io or Docker), agent-vault register (the first user becomes instance owner, a default vault is auto-created), then either agent-vault vault run -- <agent command> (host mode, cooperative isolation) or agent-vault agent create plus AGENT_VAULT_TOKEN for a long-running or containerised agent. vault init binds a project directory to a vault via a committed agent-vault.json, avoiding repeated --vault flags, a small but real convenience.

No screenshot of a running dashboard appears in anything read; the interfaces are the CLI, a minimal browser approval page (reachable via a token-bearing approval_url, 24-hour TTL, showing the requested services, credential slots and the agent's own message, with Allow and Deny buttons), and an interactive terminal review mode (vault proposal review) that walks pending proposals one at a time. A human intervenes exactly at proposal approval; there is no live view of an in-flight request, no timeline, no way to pause a running proxy session mid-flight beyond killing the process. This is proportionate to what the product is, a proxy rather than a task runner, so there is nothing resembling our kanban board to compare against.

## 5. Security, identity, sandbox, policy, cost

Credentials: real secret values live only inside the vault's encrypted store (SQLite or Postgres) or, optionally, are polled read-only from an external Infisical instance. The agent never receives the plaintext value; it is injected server-side at the point the request leaves the vault. Static credentials have no automatic rotation; the only real automatic rotation is Infisical-backed dynamic secrets, lazily-minted, time-bound leases such as an ephemeral database credential. If the sync to Infisical fails, the vault serves stale cached values with, per their own docs, "no automatic fail-closed window," an availability-over-freshness trade-off, not a credential leak.

Identity: two connection models exist and they are not equivalent. vault run wraps a child process on the host and sets HTTPS_PROXY and CA-trust env vars; the docs state outright that this "is a convenience wrapper, not a sandbox" because a compromised agent can unset the env, spawn a subprocess that does not inherit it, or exfiltrate over raw sockets or DNS. A named agent is a separate, durable actor with its own av_agt_... bearer token, SHA-256 hashed server-side, no expiry unless rotated by hand, intended for CI or always-on agents. Neither model ties identity to a specific unit of work; both are long-lived credentials for a standing actor.

Sandbox: --isolation=container is real. A per-invocation Docker network, iptables OUTPUT DROP on both IPv4 and IPv6 with the sole exception of the vault's own port, host.docker.internal resolved via a baked /etc/hosts entry rather than DNS (closing DNS exfiltration outright), a non-root user with capabilities dropped except the few iptables and gosu need. This is a genuinely defensive design, comparable in spirit to a default-deny NetworkPolicy. But it is opt-in, host mode is the default, Linux and macOS only, and only applies to the wrapping mode; the named-agent production shape has no equivalent and assumes the operator's own container or VM boundary does this job.

Policy: enforced in Go code, not prompts. Service definitions match on host, optional port and an inline path glob, with a documented deterministic priority order, exact host over wildcard, port-specific over any-port, longest literal path prefix, then declaration order. unmatched_host_policy=deny makes an unmatched host a hard 403 with a proposal_hint; the default is passthrough. Two independent RBAC axes, instance role (owner, member, no-access) and vault role (admin, member, proxy), gate who can approve proposals, manage services or touch credentials directly.

Cost: none. No budget, spend cap, ledger or rate-limit-as-cost-control was found anywhere in the docs or code read; the only limits are operational rate-limit tiers and per-proposal size caps (10 services, 10 credential slots, 20 pending proposals per vault), which protect the vault itself, not a spend envelope.

Transport: the vault's own security docs flag that Proxy-Authorization travels between agent and broker in cleartext on the plain-HTTP listener, and recommend deploying on a trusted or private network rather than exposing the listener publicly.

## 6. What we should take from it

Narrow, copyable this month: the proposal-hint 403 pattern, where a denied call returns the exact endpoint and shape needed to self-request access, is a cheap addition to factory-gateway's own capability-denial responses, turning a dead end into a structured next step for the agent. Netguard's pattern of always-blocked IMDS plus default-blocked private ranges plus resolve-then-dial is directly reusable in any Go component of ours that dials a URL an agent or task supplied. The request-log shape, method, host, matched rule, status, latency, credential keys used but never values, is a good minimum bar to check our own audit trail against.

Broad: the proposal system is a real answer to how an agent asks a human for more access without stopping the world, expressed as an artifact, structured JSON and an approval URL, rather than free text, which fits our own artifacts-not-chat principle better than a Slack message would. It is worth asking whether factory-gateway's approval flow, presumably today a human noticing a stuck task, could adopt a similar self-service "file a capability request, get a URL, poll" shape. The container-isolation write-up is also a good sanity-check document: its explicit threat model, in scope meaning no other egress possible and no DNS exfiltration, out of scope meaning kernel escapes and side channels, is a template worth imitating for documenting what our own gVisor plus Cilium boundary does and does not promise.

## 7. Where our philosophy differs and what that costs or buys us

The core difference is the trust anchor. Agent Vault authenticates a standing actor with a durable, manually-rotated bearer token; we authenticate a single task with an ephemeral, cluster-issued, OIDC-verified token that never outlives the sandbox it was minted for. Their model is simpler to operate, one token set once works until revoked, and fits their use case of a small number of long-running named agents. Ours costs more machinery, a Temporal workflow, a ServiceAccount and OIDC verification per task, but means a leaked Agent Vault token is a standing liability until someone notices and rotates it, while a leaked factory-gateway-verified token is worthless once its task's pod is gone. Adopting their model would violate our own principle that identity belongs to the task, not the machine; keeping ours is the more expensive but correct choice for a system built around disposable, high-volume tasks rather than a handful of persistent agents.

The isolation difference is a genuine warning, not just a difference. Their explicit admission that vault run's default mode "is not a sandbox" is the honest version of a trap our own design avoids by making gVisor and default-deny NetworkPolicy mandatory for every task, not an opt-in flag. If we ever borrowed their HTTP-brokering mechanism, we would still need our own sandbox around it; it does not substitute for one.

On the explicit question of whether Infisical as a whole would be a better secrets backend than OpenBao for our use: no. Infisical's core platform, github.com/Infisical/infisical, a separate repository from Agent Vault, has a populated ee/ directory of over 800 files under a proprietary Enterprise License that phones home to Infisical's own license server, gating advanced RBAC, SAML/SCIM SSO, HSM support, parts of PAM, and, most relevant to us, dynamic secrets for some providers, which is the exact feature category we would want from a secrets backend for automatic credential rotation. That is a live, exercised open-core boundary today, not a theoretical risk. OpenBao exists specifically because HashiCorp closed that exact door on Vault in 2023 and the Linux Foundation forked it to guarantee it stays Apache-2.0 with no ee/ directory at all. Swapping our backend to a vendor with an active, already-populated enterprise gate around the feature we would rely on most is a worse bet against our own constraint of best-of-breed open source with a guaranteed escape hatch than staying with OpenBao. Agent Vault's agent-facing mechanisms, the proxy, the proposal flow, netguard, are worth stealing as patterns inside factory-gateway; they are not an argument for changing the secrets store underneath it, since Agent Vault is an HTTP-broker layer analogous to factory-gateway itself, not a KV or dynamic-secret engine analogous to OpenBao.

## 8. Red flags and slop assessment

The repository is real and actively worked: 30 releases in six months, 16 contributors, large test files alongside the implementation (proxy_test.go at 1,906 lines, a 293-line isolation integration test), and a working self-hosting story for both SQLite and Postgres. This is not a landing page with a thin demo behind it.

Three things temper that. First, Infisical's own launch blog post calls Agent Vault an "experimental" "research preview" and explicitly expects a redesign of form factor, ergonomics, security and scalability, meaning the makers themselves do not consider the current interfaces stable. Second, commit concentration is high: of the top contributors by commit count, one individual (159 commits) and a dependabot bot (119 commits) dominate; the next human contributor has 23. Third, the licence is ambiguous today: GitHub reports the licence as "Other" or NOASSERTION because the repo's LICENSE file carves out a not-yet-existent ee/ directory for a future enterprise licence, a clause that mirrors the pattern already fully built out and actively gating features in Infisical's core platform repository. Nothing in the current Agent Vault snapshot is gated, but the carve-out and the sibling repository's precedent both point the same direction. The enterprise upsell is explicit in the docs themselves, an enterprise-cta snippet rendered on several pages, pointing at a commercial "Infisical Agent Vault" feature inside the main paid platform with enterprise support and SLAs, with no further detail on what that tier adds or gates.

No security incidents, licence disputes, or negative independent reviews specific to Agent Vault were found; the project is six months old, which limits how much independent track record can exist yet.

## 9. Sources

- /home/womb/repos/market-research-clones/infisical-agent-vault/README.md
- /home/womb/repos/market-research-clones/infisical-agent-vault/LICENSE
- /home/womb/repos/market-research-clones/infisical-agent-vault/go.mod
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/catalog/catalog.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/netguard/netguard.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/mitm/proxy.go, connect.go, forward.go, websocket.go, proxy_test.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/brokercore/brokercore.go, session.go, substitution.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/broker/broker.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/auth/auth.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/session/session.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/store/store.go, sql_store.go, migrate.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/requestlog/sink.go, batch_sink.go, retention.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/internal/isolation/docker.go, integration_test.go
- /home/womb/repos/market-research-clones/infisical-agent-vault/docs/learn/security.mdx, services.mdx, credentials.mdx, credential-stores.mdx, permissions.mdx, proposals.mdx, vaults.mdx
- /home/womb/repos/market-research-clones/infisical-agent-vault/docs/agents/overview.mdx, protocol.mdx
- /home/womb/repos/market-research-clones/infisical-agent-vault/docs/self-hosting/overview.mdx, postgres.mdx
- /home/womb/repos/market-research-clones/infisical-agent-vault/docs/guides/container-isolation.mdx
- /home/womb/repos/market-research-clones/infisical-agent-vault/docs/snippets/enterprise-cta.mdx
- https://github.com/Infisical/agent-vault, gh api repos/Infisical/agent-vault, contributors, releases, accessed 2026-09-29
- https://infisical.com/blog/agent-vault-the-open-source-credential-proxy-and-vault-for-agents, WebFetch, accessed 2026-09-29
- https://infisical.com/docs/documentation/platform/agent-vault/overview, WebFetch, accessed 2026-09-29
- https://infisical.com/blog/series-a, via WebSearch, accessed 2026-09-29
- https://github.com/Infisical/infisical/blob/main/LICENSE and backend/src/ee/LICENSE.md, via WebSearch, accessed 2026-09-29
- https://infisical.com/docs/self-hosting/ee, via WebSearch, accessed 2026-09-29
- WebSearch: Infisical funding Series A valuation founded YC 2026, accessed 2026-09-29
- WebSearch: Infisical secrets manager license open-core enterprise edition gated features, accessed 2026-09-29
