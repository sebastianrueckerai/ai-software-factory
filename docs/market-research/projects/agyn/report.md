---
name: Agyn
slug: agyn
url: https://agyn.io
repo: https://github.com/agynio/platform
category: kubernetes-agents
license: AGPL-3.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted (Helm chart) or managed Agyn Cloud, plus paid support and SLA
company: Agyn, Inc. Founders Nikita Benkovich (ex-Hautech.ai co-founder, ex-Kaspersky ML lead) and Vitalii Valkov. No disclosed funding round found. GitHub org created 14 Oct 2025
maturity: 238 stars and 7 forks on the docs repo, about 90 repos in the org, 3 named contributors, no tagged releases, docs repo created May 2026, last push 19 Sep 2026
similarity: 2
axes:
  signals_intake: 1
  control_plane: 2
  sandbox_isolation: 3
  verification: 0
  policy_outside_model: 3
  identity_per_task: 4
  cost_control: 0
  ux: 4
  reseedable_selfhost: 2
steal:
  - "Egress Gateway rule shape (domain or private-resource-id, path glob, method, port, deny beats allow) with header injection resolved from a secret store at request time is a clean model for our own egress policy documents"
  - "Default-to-public-trust TLS verification when a rule sets no upstream_tls (system roots against the dialed hostname) fails loud instead of silently trusting an internal certificate, worth copying verbatim"
  - "Run Timeline's three event types (LLM call with full context, tool execution with streamed stdout and stderr, summarization event) plus a Terminate button is a concrete, minimal spec for the trace UI we admit we lack"
  - "Kata plus Firecracker as an opt-in RuntimeClassName that only schedules onto prepared nodes is a safe partial-rollout pattern for mixing isolation tiers in one fleet"
  - "Agent definitions, secrets, MCP servers and volumes exposed as Terraform resources (agyn_agent, agyn_environment, agyn_llm_model) is a real agents-as-code surface worth matching for the parts of our policy admins hand-edit today"
  - "Each MCP tool as its own sidecar container, not just a gateway policy check, gives a hard process and network boundary per tool worth considering for our own MCP calls"
differs:
  - "Chat-only intake by design, no issues, telemetry, DAG or batch UI, is a different product shape from our signals plane, not a maturity gap, and copying it would cost us structured task specs and ticket-tied audit"
  - "No verification or merge and deploy plane at all, the platform's job ends when the agent replies in a thread, so its simplicity is not available to us if we want to keep shipping tested and reviewed changes"
  - "Cost governance as post hoc metering rather than a pre call hold is cheaper to build, which is likely why the marketing outruns the code, but it breaks our hard caps constraint outright"
  - "Identity scoped to the workload for its whole lifetime rather than minted per task, with a shared namespace and no Kubernetes ServiceAccount at all, buys a lighter identity story at the cost of the namespace level isolation we get by default"
ux_verdict: "A strong per run trace view and a polished console beat our console's complete lack of one, but chat only intake with no kanban or diff view means it reads as a governed chat product, not a work tracking one"
slop_verdict: "Real and shipping, the OpenZiti, egress and RBAC claims hold up in code, but small (three named contributors, no disclosed funding, no tagged releases) and its headline spend cap claim is not backed by the code"
---

# Agyn

## 1. What it is

Agyn is a Kubernetes-native runtime, built by Agyn, Inc., that takes an agent CLI (Claude Code, Codex, or a custom loop) out of a laptop and runs it as a container inside a company's own cluster, with network identity, egress control, metering and RBAC replacing the laptop's local API key and open internet access. The agyn.io homepage frames it against "Google AX, AWS Bedrock AgentCore, and Claude Code Cloud" and pitches itself on security: per-agent isolation, egress rules, a gateway that holds API keys so agents never see credentials, and tracing of every step. It is open source under AGPL-3.0, with a hosted "Agyn Cloud" and paid support and SLA as the stated commercial offer.

The people behind it are Nikita Benkovich, previously co-founder and Chief AI Officer at Hautech.ai and before that an ML lead at Kaspersky, and Vitalii Valkov. Both are co-authors on two 2026 arXiv papers about the system (2602.01465, a multi-agent coding paper claiming 72.2 percent on SWE-bench Verified, evaluated post hoc rather than tuned for the benchmark by the authors' own account; 2605.27575, the platform paper). No funding round was found in web search; the founders' own LinkedIn activity (per search results) hints at active fundraising rather than a closed round. The GitHub org `agynio` was created 14 Oct 2025 and holds about 90 repositories; the repository named in the task brief, `agynio/platform`, is documentation only, not the implementation.

What the README claims and what the code shows mostly line up, with one exception. The OpenZiti identity, egress credential injection and MCP-sidecar-per-tool claims all hold up against the source of `agyn-egress-gateway` and `agyn-k8s-runner`. The claim that does not hold up is cost: the homepage and README advertise "spend caps at any level, per agent, per team, per org," but nothing in `agyn-llm-proxy` or `agyn-metering` enforces a cap before a call goes out (Section 5).

## 2. Mapping to our five planes

| Plane / principle | What Agyn does | What we do | Verdict |
|---|---|---|---|
| Signals | Chat only. A message in a thread is the sole native trigger. Slack, Telegram and Reminders "apps" bridge external events but land as a chat message (`docs/administer/slack-connector.md`: "mention-driven, not mirrored"). `docs/introduction/what-is-agyn.md` explicitly rules out workflow builders, DAG editors and batch UIs. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. Every task is a Forgejo issue. | we lead |
| Control plane | Agents, Agents Orchestrator, Runners and Organizations services hold desired state. The Orchestrator reconciles "conversations with unacknowledged messages" to running workloads (`docs/introduction/architecture.md`). No approval-gate workflow state exists beyond one-time app-permission grants (`docs/build-extend/apps.md`); no budget or cost-ledger state anywhere. | factoryd with a Temporal workflow per task, policy as YAML in Git, budgets, approvals as workflow state, audit trail. | we lead |
| Worker plane | One Pod per workload (agent container, MCP sidecars, init container, Ziti sidecar), all workloads for all orgs and agents in one shared namespace (`agyn-k8s-runner/internal/server/workload.go`), `AutomountServiceAccountToken: false`, default isolation `docker=rootless` (kernel-shared), Kata plus Firecracker microVM isolation optional via `RuntimeClassName`, off by default. | One namespace, ServiceAccount and gVisor pod per task, default-deny egress. | we lead (default posture is weaker; shared namespace and no default NetworkPolicy are real gaps, see Section 5) |
| Verification | None. No CI, no policy gate, no stronger-model review. The platform's job ends when the agent posts to the thread. | Forgejo Actions on gVisor runners, path-risk and reproduction gates, stronger-model review with a strict verdict. | we lead |
| Merge and deploy | None native to the platform. Agents can call tools and APIs but there is no built-in "ship the change" workflow. | Bot merge after human or auto approval, Flux deploy, staged soak. | we lead |
| Policy outside the model | Real for authorization and network: OpenFGA ReBAC (`docs/operate/authorization.md`) fronted by a thin Authorization service, Istio STRICT mTLS plus AuthorizationPolicy for internal RPCs, and the Egress Gateway's rule matcher (`agyn-egress-gateway/internal/egress/evaluator.go`, functions `ruleMatches` and `hasDeny`) enforced entirely in code and network, not prompts. Absent for cost: no cap exists anywhere in code (Section 5). | Capability rules as a Git-versioned document enforced in gateway code and network policy, including budgets. | equal on authz and network, we lead on cost |
| Identity per task | Every workload gets one OpenZiti x509 mTLS identity for its lifetime, resolved through a Ziti-Management and Agents service chain (`agyn-egress-gateway/internal/egress/identity.go`, `IdentityResolver.ResolveDialer` and `resolveWorkload`) to an `AgentContext` (AgentID, EnvironmentID, WorkloadID, OrganizationID). No Kubernetes ServiceAccount is ever assigned. | A projected, audience-scoped, kubelet-rotated ServiceAccount JWT minted per task, verified against the cluster OIDC issuer, mapped to the task row. | equal, different mechanism, same guarantee that no bearer key sits in the sandbox |
| Artifacts not chat | The opposite by design. The unit of work is a chat thread; messages are the medium; there is no branch, PR or event-stream artifact contract. | TaskBrief in, a branch, a PR and a normalised event stream out. Git is the coordination mechanism. | we lead (a different product, not a maturity gap) |

## 3. Architecture and stack

The GitHub org `agynio` splits the system across roughly 90 repositories rather than a monorepo. `agynio/platform` (the repository named in the task brief) is documentation only, confirmed by reading its full tree: no source directories, only `docs/`, a README, and a LICENSE file. The actual implementation lives in sibling repos: `gateway` (the ConnectRPC external API surface, also reachable as gRPC and gRPC-Web), `agents`, `agents-orchestrator`, `runners`, `organizations`, `threads`, `chat`, `files`, `llm`, `llm-proxy`, `secrets`, `notifications`, `tracing`, `authorization`, `metering`, `egress`, `egress-gateway`, `networks`, `ziti-management`, `k8s-runner` and `docker-runner` (pluggable runner backends), `console-app`, `chat-app`, `tracing-app`, `terraform-provider-agyn`, `agynd-cli` (the in-pod wrapper daemon), `agn-cli` (the reference agent loop), `reminders`, `slack-connector`, `telegram-connector`, plus Helm chart repos (`base-chart`, `postgres-helm`) and CLI and devcontainer variants. Language is predominantly Go for the backend services (confirmed by reading `agyn-metering`, `agyn-llm-proxy`, `agyn-egress-gateway` and `agyn-k8s-runner` source) with the `platform` repo itself flagged as TypeScript by GitHub, which is misleading for the org as a whole since `platform` is only docs tooling.

Storage: PostgreSQL per service (Agents, Threads, Tracing, Metering, Organizations, Identity, Authorization each own a database per `docs/operate/backup-disaster-recovery.md`), a separate PostgreSQL-backed OpenFGA store for authorization tuples, Redis for ephemeral pub/sub and short-lived caches only (explicitly "no backup needed"), and S3-compatible object storage for uploaded files. There is no workflow engine comparable to Temporal; the "workflow" is a single reconcile loop in Agents Orchestrator that starts or stops one Pod per active conversation.

Deployment is a Helm chart on any Kubernetes cluster, with a Terraform provider (`agynio/terraform-provider-agyn`, documented in `docs/build-extend/terraform-provider.md`) as the declarative front end for agents, environments, secrets, MCP servers and volumes. Local development runs `agyn local start`, which the docs describe as running "a full Kubernetes cluster inside" a VM (`docs/local-install/install.md`) — a heavier local footprint than a bare-metal-first setup. `docs/operate/backup-disaster-recovery.md` gives conventional advice (WAL archiving and PITR for Postgres, bucket versioning and replication for S3, VolumeSnapshots for agent state) but no evidence of an automated, benchmarked re-seed pipeline or rebuild-time figure; agent state on Persistent Volumes is explicitly "best-effort."

Agents talk to models through `llm-proxy`, an OpenAI-Responses-compatible and native-mode endpoint. `agynd` (read in `docs/build-extend/agent-clis.md` and referenced `docs/build-extend/agynd.md`) exports `OPENAI_API_BASE` and `ANTHROPIC_API_URL` inside the pod so an unmodified Claude Code or Codex CLI calls the proxy instead of the vendor directly; there is no protocol translation, only endpoint and credential substitution. Switching agent CLIs is a configuration change (which init image an environment uses), confirmed in `docs/build-extend/agent-clis.md`'s Terraform example.

## 4. UX

Onboarding from zero to a first agent reply is short: `agyn local start`, `agyn local ca install`, sign in, send a message — four steps per `docs/local-install/install.md`. Production install is a Helm release plus Terraform for agent and environment configuration.

Four product surfaces exist: Chat, Console, Tracing app, and the `agyn` CLI or Terraform for programmatic access. The Console screenshot in the repo (`agyn-tour.webp`) shows a "Create Agent" form (Name, Nickname, Role, Model, Description, Image, Init Image fields) with a left-hand nav grouped into Agents, MCP Servers, Secrets, Teams, Sharing, Chat, Usage, Kubernetes, Security, IaC — a fuller admin surface than our own console, which the baseline itself describes as "functional, not designed." The other repo image, `getting_started.png`, is a plain title card ("Getting Started") with no other content; it is not informative as a UX artifact and is noted here only for completeness.

While an agent works, `docs/use/chat.md` describes a list-detail chat layout with conversation status (Open or Resolved) and live activity status (Running, Pending, Finished, Degraded), updated over WebSocket via the Notifications service. Separately, `docs/use/run-timeline.md` describes the Tracing app's Run Timeline: every LLM call with its full context, every tool execution with streamed stdout and stderr, summarization events, and a Terminate button. This is a real, working answer to a UX gap our own baseline names explicitly ("no replay or trace UI"). Intervention is limited to stopping a run; no document describes a mid-flight "approve this tool call" gate, so a human watches and can kill a run, but cannot pause-and-approve a step the way an approval-as-workflow-state does in our design.

## 5. Security, identity, sandbox, policy, cost

Identity. Four identity types (user, device, app, workload) each get an OpenZiti x509 mTLS identity, provisioned and resolved centrally by a Ziti-Management service (`docs/operate/identity.md`). No bearer token is placed in a workload pod. The egress path resolves the calling identity from the Ziti mTLS handshake, not a header (`agyn-egress-gateway/internal/egress/identity.go`).

Sandbox. One Pod per workload holds the agent container, its MCP sidecars, an init container and a Ziti sidecar (`agyn-k8s-runner/internal/server/workload.go`, function `StartWorkload`), with `AutomountServiceAccountToken: false` and no ServiceAccount at all. All workloads for all organizations and agents run in one shared namespace on a given runner. Default isolation is `docker=rootless`, meaning the workload shares the node's kernel and the only boundary is the container itself; Kata Containers with Firecracker microVMs is available but off by default, applied only via a conditionally-set `RuntimeClassName` (`agyn-k8s-runner/internal/server/capabilities.go`), and `docs/production-install/install.md` states plainly: "Skip this and everything still works — only the isolation is weaker." `docs/operate/security.md` states `NetworkPolicy` is "not enabled by default in bootstrap," so the shared namespace has no default network isolation between tenants beyond whatever the OpenZiti identity mediates.

Policy. Capability and access policy is OpenFGA ReBAC tuples (`docs/operate/authorization.md`) behind a thin Authorization service, Istio STRICT mTLS with AuthorizationPolicy for internal service-to-service RPCs, and the Egress Gateway's rule engine for outbound traffic: rules match on domain-or-private-resource-id, path glob, method and port, deny always wins over allow, and matched rules inject headers with credentials resolved from the Secrets service at request time (`agyn-egress-gateway/internal/egress/evaluator.go`, `injectedHeaders` and `headerValue`). All of this runs in code and network configuration, not prompts, matching our own "policy outside the model" principle closely for authorization and egress.

Cost. This is where the marketing does not match the code. `agyn-llm-proxy/internal/proxy/native.go`, function `NativeForwarder.Forward`, checks only a model allowlist (`modelAllowed`) before forwarding the request to the real provider (`f.client.Do(upstream)`); no budget, hold or threshold check precedes the call. `agyn-metering/internal/server/record.go` only validates and stores a usage record after the call completes. `agyn-metering/internal/config/config.go` has no cap, budget or threshold configuration at all, and `docs/reference/limits.md`, a comprehensive limits table covering files, agents, API, authorization, tracing, OpenZiti, devices, tokens and apps, has no spend or budget entry anywhere. `docs/use/usage.md` confirms the usage view is explicitly read-only and non-live. A "spend cap" in Agyn today is a number on a dashboard, not a control that stops a call.

## 6. What we should take from it

Narrow, copyable this month:
The Egress Gateway's rule shape — domain or private-resource-id, path glob, method, port, deny beats allow, with `Effect.Inject` headers resolved from a secret store at request time — is a clean, small, table-driven design worth adopting as the shape of our own egress policy documents, independent of which engine enforces them. Its default TLS behaviour is worth copying verbatim too: an unset `upstream_tls` verifies exactly like a public destination (system roots against the dialed hostname), so a misconfigured internal certificate fails loudly instead of being silently trusted (`agyn-egress-gateway/internal/egress/forwarder.go`, `upstreamTLSConfig`). The Run Timeline's three event types — LLM call with full context, tool execution with streamed stdout and stderr, summarization event — plus a Terminate button is a concrete, minimal specification for the trace UI our own baseline admits we lack; we could build to this exact shape rather than invent one from scratch. Kata plus Firecracker as an opt-in `RuntimeClassName`, scheduled only onto nodes that have it while unprepared nodes keep the weaker default, is a safe pattern for rolling out a stronger isolation tier into an existing gVisor fleet without a flag day.

Broad, product-shape ideas worth weighing:
Exposing agent definitions, secrets, MCP servers and volumes as Terraform resources (`agyn_agent`, `agyn_environment`, `agyn_llm_model`) is a genuine "agents as code" surface, reviewable in a pull request, that goes further than our own policy-as-YAML-in-Git for the parts an admin hand-edits today. Running each MCP tool in its own sidecar container, rather than routing every tool call through one shared worker process behind a gateway policy check, gives a hard process and network boundary per tool; worth asking whether our own MCP calls should get a matching container boundary in addition to the capability check we already do at the gateway.

## 7. Where our philosophy differs and what that costs or buys us

Agyn's intake is chat-only by design, not by omission — `docs/introduction/what-is-agyn.md` explicitly disclaims workflow builders, DAG editors and batch UIs. This is a different product shape from our issue-and-telemetry-driven signals plane, not a maturity gap, and copying it would cost us structured task specs and the ticket-tied audit trail our whole factory is built around.

There is no verification or merge-and-deploy plane at all in Agyn: the platform's job ends when the agent replies in a thread. Its resulting simplicity — no CI, no gate, no stronger-model review — is not available to us if we want to keep shipping tested, reviewed and deployed changes, which is the actual outcome we sell.

Cost governance is post-hoc metering rather than a pre-call hold. This is cheaper to build, which is likely why the marketing claims a spend cap the code does not enforce, but it is incompatible with our "hard caps" constraint; we cannot copy this shape and keep our security-without-half-measures commitment.

Identity is scoped to the workload for its whole lifetime rather than minted per task, and it comes with a shared namespace and no Kubernetes ServiceAccount at all. This buys Agyn a lighter identity story — no per-task namespace or ServiceAccount churn — at the cost of the namespace-level network isolation between tenants that we get for free from a per-task namespace. Our constraint of security without half measures makes the shared-namespace, rootless-by-default, no-NetworkPolicy-by-default posture a non-starter for us even though it is clearly cheaper to operate.

## 8. Red flags and slop assessment

Marketing outruns the code on the single most security-relevant claim: "spend caps at any level, per agent, per team, per org" is not implemented anywhere in `agyn-llm-proxy` or `agyn-metering` (Section 5). This is the biggest gap between claim and reality found in this review.

The team is small: three named contributors on the main repo (vitramir, 30 contributions; Benkovichnikita, 8; casey-brooks, 2), no disclosed funding round, and the founders' own recent LinkedIn activity (per web search) reads more like active fundraising than a closed round. That is a small team for a 90-repository surface area.

There are no tagged releases and no tags at all on `agynio/platform` (`gh api repos/agynio/platform/releases` and `/tags` both return empty). Versioning runs through container image tags (for example `ghcr.io/agynio/agent-init-codex:<version>`) and the Terraform provider's own version, not GitHub releases, so there is no changelog to audit for breaking changes.

Activity is real but unevenly distributed across the split repos: `platform` shows 0 open issues and a push as recent as 19 Sep 2026 (ten days before this report), but the actual code repos carry the open work — 46 open issues on `agents-orchestrator`, 26 on `architecture`, 22 on `gateway`. The repository named in the task brief is the least representative one to judge activity from.

Licence is consistent everywhere sampled: AGPL-3.0 on `platform`, `agynd-cli`, `k8s-runner`, `console-app` and `gateway`. No open-core gating was found; the commercial offer is hosting (Agyn Cloud) and paid support, not a closed module. This looks like a legitimate open-core-free commercial-open-source model, though AGPL's network-copyleft clause is itself a real constraint for anyone building a hosted product on top of the code.

Independent scrutiny is thin: one Hacker News Show HN thread (news.ycombinator.com/item?id=48206973, 30 May 2026) was found, with a sceptical top comment questioning whether teams already handing out Claude Code seats will adopt a Kubernetes-native runtime at all. No Reddit threads, no security incidents, and no licence-change history turned up in search.

Two arXiv papers exist (2602.01465, Feb 2026; 2605.27575, May 2026), both self-published by the same two authors. The 72.2 percent SWE-bench Verified figure and the platform paper's competitor comparison table (claiming Agyn is the only surveyed system combining self-hosting, pre-built coding agents, MCP isolation, agent-as-code and zero-trust networking) are the authors' own claims, not independently benchmarked, and should be read as marketing until reproduced by a third party.

Overall verdict: real and shipping. The code backs the OpenZiti, egress and RBAC claims in detail, not just in the README. But it is small, unfunded as far as public records show, has no GitHub-release history, and its headline cost-control claim is marketing that the code does not back.

## 9. Sources

https://agyn.io (WebFetch, 2026-09-29)
https://github.com/agynio/platform (cloned to ~/repos/market-research-clones/agyn, git log -1 --format=%ci: 2026-09-19 15:01:19 +0200)
https://arxiv.org/abs/2605.27575 and https://arxiv.org/html/2605.27575v2 (WebSearch summary, 2026-09-29)
https://arxiv.org/abs/2602.01465 (WebSearch summary, 2026-09-29)
https://news.ycombinator.com/item?id=48206973 (Show HN thread, posted 30 May 2026, found via WebSearch 2026-09-29)
https://www.crunchbase.com/person/nikita-benkovich (WebSearch summary, 2026-09-29)
gh api repos/agynio/platform
gh api orgs/agynio
gh api orgs/agynio/repos --paginate
gh api repos/agynio/architecture
gh api repos/agynio/agents-orchestrator
gh api repos/agynio/gateway
gh api repos/agynio/platform/contributors
gh api repos/agynio/agynd-cli
gh api repos/agynio/k8s-runner
gh api repos/agynio/console-app
gh api repos/agynio/platform/releases
gh api repos/agynio/platform/tags
~/repos/market-research-clones/agyn/README.md
~/repos/market-research-clones/agyn/LICENSE
~/repos/market-research-clones/agyn/docs/operate/architecture.md
~/repos/market-research-clones/agyn/docs/operate/identity.md
~/repos/market-research-clones/agyn/docs/operate/authorization.md
~/repos/market-research-clones/agyn/docs/operate/security.md
~/repos/market-research-clones/agyn/docs/operate/networking.md
~/repos/market-research-clones/agyn/docs/operate/backup-disaster-recovery.md
~/repos/market-research-clones/agyn/docs/operate/runners.md
~/repos/market-research-clones/agyn/docs/reference/limits.md
~/repos/market-research-clones/agyn/docs/administer/mcp-servers.md
~/repos/market-research-clones/agyn/docs/administer/secrets.md
~/repos/market-research-clones/agyn/docs/administer/llm-providers.md
~/repos/market-research-clones/agyn/docs/administer/reminders-app.md
~/repos/market-research-clones/agyn/docs/administer/slack-connector.md
~/repos/market-research-clones/agyn/docs/administer/telegram-connector.md
~/repos/market-research-clones/agyn/docs/administer/console-overview.md
~/repos/market-research-clones/agyn/docs/administer/apps.md
~/repos/market-research-clones/agyn/docs/build-extend/gateway-api.md
~/repos/market-research-clones/agyn/docs/build-extend/terraform-provider.md
~/repos/market-research-clones/agyn/docs/build-extend/agent-clis.md
~/repos/market-research-clones/agyn/docs/build-extend/apps.md
~/repos/market-research-clones/agyn/docs/use/usage.md
~/repos/market-research-clones/agyn/docs/use/chat.md
~/repos/market-research-clones/agyn/docs/use/run-timeline.md
~/repos/market-research-clones/agyn/docs/introduction/what-is-agyn.md
~/repos/market-research-clones/agyn/docs/introduction/architecture.md
~/repos/market-research-clones/agyn/docs/local-install/install.md
~/repos/market-research-clones/agyn/docs/production-install/install.md
~/repos/market-research-clones/agyn/getting_started.png
~/repos/market-research-clones/agyn/agyn-tour.webp
~/repos/market-research-clones/agyn-metering/internal/server/record.go
~/repos/market-research-clones/agyn-metering/internal/config/config.go
~/repos/market-research-clones/agyn-llm-proxy/internal/proxy/native.go
~/repos/market-research-clones/agyn-egress-gateway/README.md
~/repos/market-research-clones/agyn-egress-gateway/internal/egress/forwarder.go
~/repos/market-research-clones/agyn-egress-gateway/internal/egress/evaluator.go
~/repos/market-research-clones/agyn-egress-gateway/internal/egress/identity.go
~/repos/market-research-clones/agyn-k8s-runner/internal/server/workload.go
~/repos/market-research-clones/agyn-k8s-runner/internal/server/capabilities.go
