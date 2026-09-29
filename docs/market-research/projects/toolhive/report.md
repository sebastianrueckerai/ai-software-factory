---
name: Stacklok ToolHive
slug: toolhive
url: https://docs.stacklok.com/toolhive/
repo: https://github.com/stacklok/toolhive
category: policy-identity
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted (CLI/Docker or Kubernetes operator); Stacklok Enterprise adds a hosted control-plane UI and SSO on top
company: Stacklok Inc, Seattle. Founded 2023 by Craig McLuckie (Kubernetes, Heptio) and Luke Hinds (Sigstore). $17.5M Series A (Madrona, Accel, May 2023); Crunchbase lists a later round with Bain Capital Ventures, amount undisclosed
maturity: 2224 stars, 306 forks, 132 contributors, 368 open issues; first commit 2025-03-12, last commit 2026-09-29 (today); releases roughly every 1-2 days (v0.51.0 to v0.51.4 in one week)
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 5
  identity_per_task: 3
  cost_control: 1
  ux: 2
  reseedable_selfhost: 4
steal:
  - "Cedar (github.com/cedar-policy/cedar-go) as a real declarative ABAC language for tool authorisation, checked through one interface (pkg/vmcp/core/admission.go's core.Admission) shared by list-filtering and call-denial, closing the class of bug where a tool is listed but its call is refused"
  - "The two-boundary auth split: incoming caller auth (OIDC/anonymous) is a fully separate concern from outgoing auth to each backend (token exchange RFC-8693, header injection, AWS STS), configured per backend in MCPExternalAuthConfig"
  - "Rate limiting as a decorator around the CallTool seam only (pkg/vmcp/ratelimit/decorator.go), explicitly not on the pre-flight CheckToolCall path, so a check never consumes a token, and fail-open on limiter infrastructure errors so a broken limiter cannot become a denial-of-service on the whole gateway"
  - "CRD/operator lifecycle split into two Helm charts (operator-crds, operator), so CRD upgrades and controller upgrades roll independently, with Helm snapshot tests to catch accidental template drift"
  - "The open-core stub pattern (oboStrategyStub returning obo.ErrEnterpriseRequired, replaced only if an out-of-tree binary calls RegisterOBOStrategy from its own init()): the gated feature fails loud and typed at the call site, not silently, and the OSS binary never needs to know the enterprise code exists"
differs:
  - "ToolHive's unit of work is a long-lived MCP server process serving many callers; ours is a disposable per-task sandbox serving one agent once. Adopting ToolHive's model would mean pooling and multiplexing tool servers across tasks, which trades our task-scoped blast radius for their operational efficiency: a security posture we do not want to give up for a cost saving we do not need at our scale."
ux_verdict: CLI- and YAML-only in the open-source core (thv, kubectl, Helm), no screenshots or in-flight call visibility in the docs, no approval step before a tool runs; a separate closed-by-us-unverified desktop app (toolhive-studio) targets individual developers but was not inspected.
slop_verdict: Real and used in anger. Daily commits, a release every one to two days, 132 contributors, 306 forks, and a genuinely deep internal design (dual MCP protocol revisions, a documented Cedar edge case in conflict resolution). Not a README with a landing page.
---

# Stacklok ToolHive

## 1. What it is

ToolHive is Stacklok's open-source platform for running Model Context Protocol (MCP) servers as first-class, policy-governed workloads, on a laptop via Docker/Podman or in Kubernetes via an operator and a set of CRDs. Stacklok is a security-tooling vendor (previously Minder, donated to OpenSSF in October 2024) that pivoted its MCP work into ToolHive during 2025-2026 as "the MCP and skills management capability of Stacklok Enterprise." It is aimed at platform teams who must let many people's coding agents call many third-party MCP servers (GitHub, Slack, Postgres, arbitrary vendor tools) without handing every agent raw credentials or trusting every server's declared tool list.

The makers claim ToolHive is "enterprise-grade" and that Stacklok's platform "secures 10M+ tool calls every month" (stacklok.com homepage, 2026-09-29). The repository backs a meaningful slice of that claim: a real Kubernetes operator with a wide CRD surface, a real Cedar authorisation engine wired into an actual admission path, and OpenTelemetry-instrumented code, not just a diagram. It does not back a task-state or spend-control claim, because ToolHive has neither; that is out of scope for what it does (see axes above).

It is licensed Apache-2.0 for the full OSS core (CLI, operator, vMCP gateway, registry API). "Stacklok Enterprise" is a separate, not-fully-open distribution sold as an annual subscription: turnkey Okta/Entra ID integration, backported security patches, hardened images, a cloud console, SLA support, and the one feature genuinely gated inside the OSS codebase itself, Microsoft Entra On-Behalf-Of token exchange (see section 5).

## 2. Mapping to our five planes

| Plane / principle | What ToolHive does | What we do | Verdict |
|---|---|---|---|
| Signals | None. No issue, alert or webhook intake; MCPWebhookConfig only notifies external systems about ToolHive's own lifecycle events | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | An operator reconciliation loop (desired CRD state to K8s resources) plus vMCP request routing; no task registry, no scheduler, no human approval workflow | factoryd: Temporal workflow per task, Postgres task registry, console approvals | not comparable |
| Worker plane | Each MCP server is a long-lived Deployment/StatefulSet, not a disposable per-invocation sandbox; one workload serves many callers over its lifetime | One gVisor pod per task, killed after use | they solve a different problem |
| Verification | None. No CI, no gates, no model review of anything | Forgejo Actions, path risk gates, reproduction gate, stronger-model review | not comparable |
| Merge and deploy | None (not applicable to a tool gateway) | Bot merge after approval, Flux GitOps rollout | not comparable |
| Policy outside the model | Cedar policy documents, evaluated in Go against caller identity, action and resource entities, never touching a prompt | YAML capability document, evaluated in Go against task classes | they lead: Cedar is a real ABAC language with a formal semantics; our per-class tool caps are a flatter, simpler model that covers less shape (no resource hierarchies, no arbitrary attribute conditions) |
| Identity per task | Identity is per-caller (OIDC JWT claims and group membership), not per-task; a two-boundary model separates who is calling from what credential reaches the backend (token exchange, header injection, AWS STS, Entra OBO enterprise-only) | A projected, audience-scoped ServiceAccount token minted per task, verified against the cluster OIDC issuer, mapped to exactly one task row | equal on rigour, different unit: theirs is bound to a durable caller identity meant to be reused across many calls over a server's lifetime, ours is bound to a task that is deleted after one use |
| Artifacts not chat | N/A: ToolHive brokers tool calls, it does not coordinate agents. MCP calls are JSON-RPC requests/responses, not chat turns, a mild structural echo of "artifacts not chat" but not the same claim | Git branches, PRs and a TaskBrief are the coordination unit | not comparable |

## 3. Architecture and stack

Go throughout (go.mod: go 1.27.0). Two operator binaries: cmd/thv-operator reconciles CRDs into Kubernetes objects; cmd/thv-proxyrunner runs inside the resulting pod, dynamically creates the actual MCP server StatefulSet, and proxies traffic through a middleware chain (docs/arch/09-operator-architecture.md). A third binary, cmd/vmcp, is the virtual gateway that aggregates multiple MCPServer/MCPGroup backends behind one endpoint.

CRD taxonomy (docs/arch/09-operator-architecture.md, docs/arch/10-virtual-mcp-architecture.md): MCPServer and MCPRemoteProxy at the core; MCPGroup for organisation; VirtualMCPServer and VirtualMCPCompositeToolDefinition for aggregation; MCPRegistry for discovery; MCPToolConfig, MCPExternalAuthConfig, MCPOIDCConfig, MCPTelemetryConfig, MCPWebhookConfig for configuration. A VirtualMCPServer picks up every MCPServer in its MCPGroup, resolves tool-name conflicts by prefix, priority or manual strategy, and can advertise a filtered subset of a backend's tools while keeping the full set in its internal routing table (docs/arch/10-virtual-mcp-architecture.md, filtering section).

Authorisation runs on github.com/cedar-policy/cedar-go. pkg/vmcp/core/admission.go defines a single Admission interface (IsAllowed) used both to filter a tools/list response and to gate a tools/call, closing the "list says yes, call says no" gap a two-middleware design would risk. pkg/authz/authorizers/cedar/entity.go builds the principal as the caller's JWT claims plus group membership (EntityTypeTHVGroup as Cedar parent UIDs), the action as MCPFeature{Tool,Resource,Prompt} crossed with MCPOperation{Call,Read,Get,List}, and the resource as the named tool optionally parented under MCP::"<serverName>" for server-scoped rules (pkg/authz/middleware.go carries the exact MCP-method-to-Cedar-action table).

Outgoing auth to backends is a separate Strategy interface (pkg/vmcp/auth/types/types.go): StrategyTypeTokenExchange (RFC-8693), StrategyTypeHeaderInjection, an AwsStsConfig path, and StrategyTypeOBO for Microsoft Entra On-Behalf-Of. Rate limiting is a decorator (pkg/vmcp/ratelimit/decorator.go) wrapping the core.VMCP interface at CallTool only, backed by redis/go-redis with miniredis for tests, fail-open on limiter errors.

Secrets (pkg/secrets/): a Provider interface with EncryptedType (AES, local), OnePasswordType, and EnvironmentType, composed through FallbackProvider (try primary, fall back to TOOLHIVE_SECRET_* env vars on a not-found) and an OS-keyring-backed keyring.NewCompositeProvider(). This is the CLI-side secret store for provisioning an MCP server's own credentials, not a per-call credential broker; it complements, not replaces, the OIDC/token-exchange model above.

Deployment: two Helm charts, operator and operator-crds, kept separate on purpose so CRD and controller upgrades can roll independently, tested with Helm snapshot tests. Telemetry: pkg/telemetry, otelhttp, prometheus, sentry-go in go.mod; an MCPTelemetryConfig CRD exists to wire OTel export per server (config wiring read; a live OTel export was not run, per the never-run-cloned-code rule).

Files read: README.md, go.mod, LICENSE, CONTRIBUTING.md, docs/arch/00-overview.md, docs/arch/09-operator-architecture.md, docs/arch/10-virtual-mcp-architecture.md (lines 1-910 of 1192), docs/arch/05-runconfig-and-permissions.md, docs/arch/15-envoy-network-proxy.md, pkg/vmcp/core/admission.go, pkg/authz/authorizers/cedar/entity.go, pkg/authz/middleware.go, pkg/vmcp/auth/obo.go, pkg/vmcp/auth/types/types.go, pkg/auth/obo/errors.go, pkg/vmcp/ratelimit/decorator.go, pkg/secrets/factory.go, pkg/secrets/types.go, pkg/secrets/fallback.go, pkg/networking/ (listing), pkg/vmcp/server/diagnostics.go, pkg/diagnostics/server.go (NetworkPolicy mentions).

## 4. UX

From zero to a first tool call on the CLI path (docs.stacklok.com/toolhive/guides-cli/quickstart, fetched 2026-09-29): install (brew install thv or a binary download), thv version, thv registry list, thv run toolhive-doc-mcp, thv list to confirm it is up, thv client setup (the one interactive screen: a spacebar-toggle list of IDE clients), then the user leaves the terminal and asks a question inside VS Code or Cursor, which is what actually triggers the agent to call query_docs. That is 6-7 commands before the first real tool call, plus install. Stopping is thv stop (keeps the container) or thv rm (deletes it). No screenshots appear on the page, only pasted terminal tables and a JSON log line.

The Kubernetes path (docs.stacklok.com/toolhive/guides-k8s/quickstart, fetched 2026-09-29) is two Helm installs (CRDs, then operator), one hand-written MCPServer YAML, kubectl apply, then a port-forward and a curl against /health, then adding the server as an HTTP endpoint in VS Code's MCP panel. Roughly 8 kubectl/helm commands for the core path, 14 through cleanup. kubectl get mcpservers doubles as the status view (STATUS Ready, READY True).

In neither path is there an approval step before a tool call runs, nor any view of a call in flight; policy (Cedar, OIDC, rate limits) is configured once, ahead of time, as YAML, and then invisible until something is denied. A separate desktop app, toolhive-studio (github.com/stacklok/toolhive-studio, mentioned in the README's "Desktop experience" section), is aimed at individual developers; its UI was not inspected, so no claim is made about it beyond its existence.

Against our own console (kanban board, human lane, cost view, login through Forgejo OAuth2): ToolHive's OSS UX is comparable in rawness to our own admitted weak point (no real-time stream of work, no diff view), but it never has to show approvals or in-flight agent work because it has no task concept to show progress on. What it does better is a genuinely fast quickstart with clear, copy-pasteable terminal output at every step, something our own quickstart story is not yet measured against.

## 5. Security, identity, sandbox, policy, cost

Security/isolation. Each MCP server is its own container (Docker) or Pod (Kubernetes), one per server, not one per call or per agent task. On the Docker/CLI runtime, --isolate-network builds a per-workload internal=true bridge network plus a DNS sidecar (dnsmasq) and an egress/ingress forward proxy (Squid, with an experimental Envoy replacement, docs/arch/15-envoy-network-proxy.md) that allowlists destination hosts by the :authority/dstdomain match. This isolation is explicitly a bridge-networking construct (docs/arch/05-runconfig-and-permissions.md, "Network isolation requires bridge networking"): on host networking it is dropped with a warning or a hard failure, on none it is redundant.

In Kubernetes, this egress control does not carry over. There is no NetworkPolicy object anywhere in cmd/thv-operator or pkg/operator (grepped the whole tree). The one code comment that names NetworkPolicy (pkg/vmcp/server/diagnostics.go:54, pkg/diagnostics/server.go:15) says restricting a diagnostics endpoint "is a NetworkPolicy job", i.e. the operator explicitly leaves egress and ingress restriction on Kubernetes to the cluster operator to write themselves. For a platform team running ToolHive's own recommended deployment target, per-server network isolation is not shipped; it is homework.

Identity/auth. Incoming: OIDC (MCPOIDCConfig), validated against a JWKS, JWT claims and group membership feeding Cedar's principal entity. Outgoing: token exchange (RFC-8693), static header injection, or AWS STS, chosen per backend in MCPExternalAuthConfig; Entra On-Behalf-Of is the one strategy stubbed to return obo.ErrEnterpriseRequired unless an out-of-tree binary registers a real implementation via auth.RegisterOBOStrategy (pkg/vmcp/auth/obo.go). No prompt-level trust is involved anywhere in this path; policy and identity are both enforced entirely in Go.

Policy. Cedar, evaluated once per tools/list (filtering) and once per tools/call (denial) through the same core.Admission seam, so a hidden tool cannot be called just because it was not listed. The virtual-MCP architecture doc records a real, previously-shipped edge case: under priority conflict resolution a prompt's Cedar policy binding could detach from the winning backend during a resync, a genuine subtlety our flatter YAML-class model does not have to worry about because it has no equivalent resource hierarchy.

Cost. None. There is no budget, hold, spend cap or cost ledger anywhere in the codebase or docs; pkg/vmcp/ratelimit limits request rate (a fixed window or token bucket per caller, default size not read), not spend. A vendor selling "enterprise-grade" MCP infrastructure with 10M+ monthly tool calls and zero financial guardrail is a real gap if any of those calls are billed per-use (this is inference: ToolHive's own bundled MCP servers are mostly free/local, so the gap may simply not matter to Stacklok's own customers today).

Secrets. Local encrypted store, 1Password, environment variables, OS keyring, composed with a primary-then-env fallback (pkg/secrets/fallback.go). This is for provisioning a server's own credentials (e.g. a GitHub PAT an MCP server needs), separate from the OIDC/token-exchange path that governs a caller's access to that server.

## 6. What we should take from it

Narrow (copy this month). Adopt the "one admission interface for both list and call" pattern from core.Admission in our own admitTool: today s.admitTool and the tool-list construction in toolServer() are two separate code paths, which is exactly the shape ToolHive's design doc warns creates a list/call mismatch risk; a single seam would close that even at our current single-Server scale. Second, their rate-limiter's placement (decorate CallTool only, never the pre-flight check, fail-open on infra errors) is a one-paragraph design worth copying verbatim if we ever add a request-rate limit alongside our existing EUR-denominated hold; today we only cap spend and request count via ToolCap, with no time-window rate limit, so a task could burst many cheap calls in a second. Third, the CRD/operator Helm-chart split (operator vs operator-crds) is a good default for any future CRD we add (we have none today, but if TaskBrief-as-CRD is ever revisited, split the chart from day one).

Broad (a problem they solve that we ignore). ToolHive solves "let agents safely call arbitrary third-party MCP servers we did not write", with real multi-server aggregation, conflict resolution and per-tool filtering. Our own factory-gateway does not solve this at all: it implements a small, fixed, first-party tool set (web_scrape, web_search, replicate, fal, escalate, request_info, plus commissioning tools, all in internal/gateway/tools.go and cloud.go) and serves them over MCP; it never proxies to a separate MCP server process. If we ever want an agent to call a genuinely third-party MCP server (a customer's own MCP endpoint, a marketplace tool), we have no mechanism for it today, and that is the actual shape of problem ToolHive was built for.

## 7. Where our philosophy differs and what that costs or buys us

ToolHive's unit of isolation is the server (one container/pod serves every caller for its lifetime); ours is the task (one sandbox, one agent, one use, then deleted). Their model amortises a server's startup cost across many callers and needs Cedar-grade authorisation precisely because many different callers with different rights share one running process. Ours needs no per-caller authorisation inside the tool layer at all, because there is only ever one caller (the task) per sandbox; our policy question is simpler by construction: not "which caller may call this tool on this shared server" but "may this task call this tool at all, within its remaining budget." Copying ToolHive's shared-server-plus-ABAC model would mean giving up our task-scoped blast radius (a compromised call could now see traffic meant for other tasks/callers on the same server) to gain operational efficiency (fewer container starts) we do not need at three-Hetzner-box scale. Our constraint (security without half measures, one sandbox per task) is more expensive per call but buys a strictly smaller blast radius than anything ToolHive's shared-server model can offer, even with Cedar on top.

The other real difference is scope: ToolHive has no notion of money. Every one of our tool calls is priced, held and booked before and after the call (internal/gateway/tools.go's paid()); ToolHive has nothing analogous. Their rate limiter caps request rate, ours caps EUR. If Stacklok ever adds paid third-party MCP servers to its registry, this gap would become a real product decision on their side, not just an OSS/enterprise split, since Cedar and OIDC do not help you avoid an inference-cost bill.

## 8. Red flags and slop assessment

None found that suggest the project is not real or not used. It is under very active development: a commit today (2026-09-29), releases roughly every one to two days (v0.51.0 through v0.51.4 inside one week), 132 contributors, external maintainers from Red Hat per Stacklok's own messaging. 368 open issues on a project this size is normal churn, not a sign of abandonment.

The open-core gating is narrow and honestly drawn in the code: only Entra On-Behalf-Of is stubbed behind obo.ErrEnterpriseRequired (pkg/vmcp/auth/obo.go); RFC-8693 token exchange, header injection, AWS STS, Cedar itself, OIDC, audit logging and the registry server are all fully in the Apache-2.0 tree. This is a defensible open-core line, not a bait-and-switch.

Two things a buyer should note. First, Stacklok has stated an intention to donate ToolHive to an open-source foundation (per Help Net Security, September 2026) but it is not a CNCF Sandbox, Incubating or Graduated project as of 2026-09-29 (checked cncf.io/sandbox-projects and found no listing); until a donation actually happens, the project's governance is entirely Stacklok's. Second, the Kubernetes network-isolation gap in section 5 is a real one: a team deploying ToolHive's own recommended production path (the operator) gets none of the egress allowlisting the Docker/CLI path advertises, unless they write their own NetworkPolicy objects. That is not stated anywhere as a limitation on the marketing pages fetched (stacklok.com, the enterprise pricing page); it only surfaces by reading docs/arch/05-runconfig-and-permissions.md and grepping the operator source.

## 9. Sources

- https://github.com/stacklok/toolhive (gh api repos/stacklok/toolhive, fetched 2026-09-29)
- https://github.com/stacklok/toolhive/releases (gh api, fetched 2026-09-29)
- https://docs.stacklok.com/toolhive/guides-cli/quickstart (WebFetch, fetched 2026-09-29)
- https://docs.stacklok.com/toolhive/guides-k8s/quickstart (WebFetch, fetched 2026-09-29)
- https://stacklok.com (WebFetch, fetched 2026-09-29)
- WebSearch: Stacklok funding Series A founded headquarters 2025 2026 (2026-09-29)
- WebSearch: Stacklok ToolHive CNCF sandbox project (2026-09-29)
- Local clone at repos/market-research-clones/toolhive, HEAD 494dfa2, 2026-09-29 13:44:05 +0300 (git log)
- README.md
- go.mod
- LICENSE
- CONTRIBUTING.md
- docs/arch/00-overview.md
- docs/arch/09-operator-architecture.md
- docs/arch/10-virtual-mcp-architecture.md (lines 1-910 of 1192)
- docs/arch/05-runconfig-and-permissions.md
- docs/arch/15-envoy-network-proxy.md
- pkg/vmcp/core/admission.go
- pkg/authz/authorizers/cedar/entity.go
- pkg/authz/middleware.go
- pkg/vmcp/auth/obo.go
- pkg/vmcp/auth/types/types.go
- pkg/auth/obo/errors.go
- pkg/vmcp/ratelimit/decorator.go
- pkg/secrets/factory.go
- pkg/secrets/types.go
- pkg/secrets/fallback.go
- pkg/networking/ (directory listing only)
- pkg/vmcp/server/diagnostics.go
- pkg/diagnostics/server.go
- internal/gateway/tools.go in ai-software-factory-code (our own comparison code)
- internal/gateway/connectors.go in ai-software-factory-code (our own comparison code)
- internal/gateway/server.go in ai-software-factory-code (grep, our own comparison code)
- internal/policy/policy.go in ai-software-factory-code (grep, our own comparison code)
- docs/target-architecture.md in this repository (our own comparison design)
