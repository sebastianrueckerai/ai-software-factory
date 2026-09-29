---
name: kagent
slug: kagent
url: https://kagent.dev
repo: https://github.com/kagent-dev/kagent
category: kubernetes-agents
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, Helm chart on any Kubernetes cluster
company: Started at Solo.io (Istio's founders); now a CNCF Sandbox project ("kagent, a Series of LF Projects, LLC")
maturity: 3.9k stars, 792 forks, 1758 commits on main, 93 open issues, 61 open PRs, nightly + tagged releases, last commit 2026-09-28
similarity: 2
axes:
  signals_intake: 1
  control_plane: 3
  sandbox_isolation: 4
  verification: 0
  policy_outside_model: 3
  identity_per_task: 3
  cost_control: 0
  ux: 3
  reseedable_selfhost: 3
steal:
  - Harness as a Kubernetes CRD (Agent, Harness, ModelConfig, SandboxTemplate) lets an operator swap the coding/ops agent runtime with a YAML edit, no controller rebuild, unlike our compiled Go Harness interface.
  - Substrate's golden-snapshot suspend/resume per Actor (gVisor or microVM/Cloud Hypervisor+Kata) reuses a warm sandbox instead of a cold pod per task, worth stealing if our worker cold-start cost ever matters.
  - Egress mTLS-interception gateway swaps an inert placeholder header for the real provider API key at the network edge, so no SDK or process ever holds the real key, a cleaner variant of "no raw credentials in the sandbox" for non-Git secrets.
  - A2A human-in-the-loop extension, a versioned, framework-neutral tool_approval_request/response and ask_user protocol that pauses a task at an exact boundary and resumes the same task, a cleaner wire shape than a bespoke approval state.
  - EP-1270 scoped authorization, where collection filtering happens before pagination/totals, decisions come from stored or validated resource attributes (never the caller's request), and failure is closed by default.
  - Idle-session expiration via a leader-only sweep under a Postgres row lock, once a minute, with a durable per-row execution claim that expires if the worker crashes, a concrete pattern for our own task garbage collection.
differs:
  - kagent is an interactive, chat/A2A-driven runtime for infrastructure operator agents (Kubernetes, Istio, Helm, Argo, Prometheus, Grafana, Cilium tools), not an autonomous issue-to-PR factory. It has no CI, no test gate, no reviewer-model verification, and no merge/deploy plane at all, so at most it could ever inform our worker and control planes, never verification or merge/deploy.
  - No budget, spend cap, or cost ledger exists anywhere in the code or docs. LLM cost control is left entirely to the operator's own provider account limits, which conflicts with our "hard caps with holds" principle; we would have to build the whole cost-control axis ourselves regardless of anything borrowed here.
  - The default auth mode ships as insecure, and even trusted-proxy mode decodes JWT claims without checking signature or expiry, trusting an upstream boundary. Our gateway verifies task identity against the cluster's own OIDC issuer at every hop; adopting kagent's identity code as-is would break "identity belongs to the task."
ux_verdict: A real kubectl-native console (chat, dashboard, agent forms) but built for watching a conversation, not reviewing a diff; there is no PR or code-change view because kagent does not produce one.
slop_verdict: Real and maintained (CNCF Sandbox, daily commits, deep internal architecture docs with file-level citations, an E2E suite), but young in hardening, its own docs admit an insecure default and a forgeable interim identity header.
---

# kagent

## 1. What it is

kagent is a Kubernetes-native framework for building, deploying and managing AI agents as Kubernetes custom resources, started at Solo.io (the company behind Istio) and now a CNCF Sandbox project under the Linux Foundation. The README frames it as a generic agent runtime for any framework (Google ADK, LangGraph, CrewAI) and any model provider, with a built-in MCP server exposing Kubernetes, Istio, Helm, Argo, Prometheus, Grafana and Cilium tools, aimed at platform and SRE teams running ops agents inside their own cluster.

The README undersells the depth of what is actually built. The repository contains a full durable-state control plane (go/core), a sandbox and credential-injection runtime built on a separate "Agent Substrate" project, a scoped-authorization design, an A2A human-in-the-loop extension, and Go harness adapters for the Codex CLI and Claude Code (go/harness/codex, go/harness/claude), alongside the advertised ADK-based Python engine. None of that produces a pull request: the unit of work throughout is an A2A conversation/session, not a code change.

## 2. Mapping to our five planes

| Plane / principle | What kagent does | What we do | Verdict |
|---|---|---|---|
| Signals | None built in. Work starts from a chat message or an external A2A/MCP call; no issue, webhook or alert intake | Forgejo webhooks, SigNoz alerts, factoryd intake API; every task is a Forgejo issue | we lead |
| Control plane | PostgreSQL-backed Session/Sandbox state machine, revisioned ActorTemplates, checkpoints and forks, bounded idempotent lifecycle claims, idle-expiration sweep | factoryd with a Temporal workflow per task, Postgres, policy as a Git file applied by Flux | equal |
| Worker plane | One Substrate Actor per session, gVisor or microVM (Cloud Hypervisor + Kata) per WorkerPool, golden-snapshot suspend/resume; standalone Sandboxes currently have no egress restriction | One namespace/ServiceAccount/gVisor pod per task, read-only root fs, non-root, default-deny egress to four named destinations | they lead on density and resume speed, we lead on default-deny egress |
| Verification | None. No CI, no test gate, no model review before anything ships | Forgejo Actions gVisor runners, policy gates, reproduction gate, stronger-model review | not comparable, we lead |
| Merge and deploy | None. No PR, branch or deploy concept | Bot merge after approval or auto rule, Flux GitOps rollout with a soak window | not comparable, we lead |
| Policy outside the model | EP-1270 resource-scoped, fail-closed authorization in the API layer for AgentTemplate/Harness/ModelConfig; default OSS install grants everything until an external policy engine narrows it; chart ships no NetworkPolicy | Capability rules as a Git-versioned document enforced in gateway code and Cilium network policy | equal intent, we lead on default enforcement |
| Identity per task | Actor UID checked against the session row; credential injection keeps real API keys out of the agent process via an egress mTLS gateway; but actor-to-TaskStore identity currently rides an admittedly forgeable unsigned header, and default auth mode is insecure | Projected, audience-scoped, kubelet-rotated ServiceAccount token verified against the cluster OIDC issuer at every hop | we lead |
| Artifacts not chat | A2A tasks and MCP tool calls are the native unit; HITL pauses at a structured metadata boundary, but the overall paradigm stays a conversation | TaskBrief in, a branch, a PR and a normalised event stream out; Git is the coordination mechanism | not comparable, different unit of work by design |

## 3. Architecture and stack

Go (go/core controller and apiserver, go/api CRDs and clients, go/harness/{codex,claude} CLI-harness adapters, go/adk a Go agent-development-kit) plus Python (python/packages, the Google ADK-based engine) plus a Vite-built React UI (ui/src) served by nginx behind an optional oauth2-proxy. Storage is a single PostgreSQL database (schema in go/core/pkg/migrations/core/000001_initial.sql) holding runtime_revision, agent_revision/sandbox_revision, runtime_instance and session/sandbox rows; there is no separate workflow engine, a hand-rolled bounded-execution-claim state machine plays that role.

Agents run as Substrate Actors managed by the separate agent-substrate/substrate project: a WorkerPool picks a sandboxClass (gvisor by default, or microvm using Cloud Hypervisor with Kata kernel/image assets on KVM-capable nodes), and Actors suspend to and resume from an object-storage snapshot rather than restarting cold. Deployment is two Helm charts (kagent-crds, kagent) publishing six OCI component images to ghcr.io. Models are configured through a ModelConfig CRD (go/api/v1alpha3/modelconfig_types.go) supporting OpenAI, Azure OpenAI, Anthropic, Gemini and Vertex AI variants, Bedrock, SAP AI Core, Foundry and Mistral; the real API key never reaches the agent process, Substrate's egress gateway injects it into the outbound header for an exact matched hostname (docs/architecture/credential-injection.md).

## 4. UX

Interfaces are kubectl-native CRDs (Agent, AgentTemplate, Harness, ModelConfig, SandboxTemplate, RemoteMCPServer), a kagent CLI, a React console (chat, dashboard, agent-instances, scheduled-runs, harness/model config forms), and the A2A/MCP APIs directly. The official quickstart page (kagent.dev/docs/kagent/getting-started/quickstart) returned HTTP 500 on 2026-09-29 through both WebFetch and Firecrawl, so the canonical path is not verified live; from DEVELOPMENT.md and the README the path is helm upgrade --install kagent-crds, then helm upgrade --install kagent -f values.yaml, then kubectl apply a ModelConfig and an AgentTemplate/Agent, then open the UI or CLI to chat, roughly four steps to a first response.

Watching work is a live chat transcript per session, streamed over A2A subscribe, because the unit of work is a conversation turn, not a diff. Intervention uses the HITL extension: the agent pauses with an input-required status, any A2A client (including the console) renders the pending tool approval or question, and answering resumes the exact same task. There is no PR or code-diff review screen anywhere in the product, unlike our console's planned diff view, because kagent does not produce code changes as its output.

## 5. Security, identity, sandbox, policy, cost

Identity for humans goes through oauth2-proxy; in the shipped trusted-proxy controller mode the backend decodes JWT claims without checking signature or expiry, trusting that the proxy already validated the token (docs/architecture/oidc-proxy-authentication.md). The default controller.auth.mode is insecure. The private actor-to-TaskStore identity currently uses a documented, explicitly forgeable unsigned header, called out as a prerelease-only path pending a real actor JWT from an open upstream issue.

Sandboxing is one Substrate Actor per session or standalone Sandbox, gVisor or microVM, with a pinned digest-only guest image and a golden-snapshot revision model. Standalone Sandboxes have "no allowed egress destinations" enforcement today, a gap the docs mark as a follow-up. Policy is EP-1270's resource-scoped, fail-closed authorization for a handful of configuration resources, applied in code before pagination, but the default OSS install permits full access and the Helm chart installs no NetworkPolicy, leaving the documented UI/proxy/controller trust boundary to the operator. There is no budget, spend cap or cost ledger anywhere; LLM spend is bounded only by whatever the configured provider account allows.

## 6. What we should take from it

Narrow: the credential-injection pattern (inert placeholder header, real value swapped at an mTLS egress gateway keyed by exact hostname) is a clean way to keep a secret out of an agent process for any non-Git external call, not just model providers; our gateway already does this for LLM calls but the MCP-tool-call path could reuse the same shape. The A2A human-in-the-loop wire format (tool_approval_request/response, ask_user, pause-and-resume on the same task) is a ready-made shape for our own approval states instead of inventing one. The idle-session leader-sweep-under-row-lock pattern is a direct fit for garbage-collecting stale tasks.

Broad: the golden-snapshot suspend/resume sandbox model (warm Actor reuse instead of a cold pod per task) is worth watching if our per-task pod cold-start ever becomes a real cost or latency problem; it would mean trading our current one-pod-per-task simplicity for Substrate's actor-multiplexing complexity. Declaring the harness as a Kubernetes resource rather than a compiled Go interface is a broader shape question: it buys runtime harness swaps at the cost of moving harness selection logic out of type-checked Go into CRD validation.

## 7. Where our philosophy differs and what that costs or buys us

kagent has no verification or merge/deploy plane by design, because its product is an always-on conversational ops agent, not a batch process that ends in a reviewed code change. Copying its control and worker planes would still leave us building everything downstream of a result ourselves. Its actor-multiplexing sandbox buys real density and fast resume at the cost of a second external dependency (Agent Substrate, pre-1.0, "APIs and behavior may still change significantly") and a more complex failure model than our disposable one-pod-per-task; we accept slower cold starts for a simpler, more auditable blast radius per task. Its default-insecure auth and forgeable interim identity header are the opposite of "identity belongs to the task," and would need our own OIDC-verifying gateway in front of any of its code before it could sit in our trust boundary at all.

## 8. Red flags and slop assessment

Agent Substrate, the dependency underneath kagent's sandboxing and credential injection, is pre-1.0 with an explicit no-backward-compatibility warning. The default controller.auth.mode is insecure, and the private runtime-identity header is documented by the maintainers themselves as forgeable, with a named tracking issue (agent-substrate/substrate#1660) rather than a shipped fix. The Helm chart installs no NetworkPolicy despite describing one as necessary for its own documented trust boundary. kagent.dev's quickstart page was down (HTTP 500) on the day of this research, so the canonical onboarding claim is not verified live. Against that, the project is genuinely active: CNCF Sandbox status, 3.9k stars, 792 forks, a commit the day before this report, nightly releases, and internal docs that cite exact file paths and describe real test coverage (store/service tests, transport tests, an E2E suite) rather than marketing copy. No security incident or licence change was found in search; that absence is not verified beyond a short search.

## 9. Sources

- /home/womb/repos/market-research-clones/kagent (shallow clone, HEAD 2026-09-28)
- /home/womb/repos/market-research-clones/kagent/README.md
- /home/womb/repos/market-research-clones/kagent/DEVELOPMENT.md
- /home/womb/repos/market-research-clones/kagent/go/go.mod
- /home/womb/repos/market-research-clones/kagent/docs/architecture/sandboxes.md
- /home/womb/repos/market-research-clones/kagent/docs/architecture/credential-injection.md
- /home/womb/repos/market-research-clones/kagent/docs/architecture/oidc-proxy-authentication.md
- /home/womb/repos/market-research-clones/kagent/docs/architecture/runtime-and-lifecycle.md
- /home/womb/repos/market-research-clones/kagent/docs/architecture/human-in-the-loop.md
- /home/womb/repos/market-research-clones/kagent/docs/architecture/a2a-gateway.md
- /home/womb/repos/market-research-clones/kagent/docs/architecture/configuration-and-compilation.md
- /home/womb/repos/market-research-clones/kagent/design/EP-1270-scoped-authorization.md
- /home/womb/repos/market-research-clones/kagent/go/api/v1alpha3/modelconfig_types.go
- /home/womb/repos/market-research-clones/kagent/go/api/v1alpha3/harness_types.go
- /home/womb/repos/market-research-clones/kagent/go/harness/runtime/runtime.go
- /home/womb/repos/market-research-clones/kagent/go/harness/codex, go/harness/claude (directory layout only)
- /home/womb/repos/market-research-clones/kagent/ui/src (directory layout only)
- /home/womb/repos/market-research-clones/kagent/helm/kagent/values.yaml
- https://github.com/kagent-dev/kagent (stars, forks, issues, PRs, licence; fetched 2026-09-29)
- https://kagent.dev (product framing, company, pricing; fetched 2026-09-29)
- https://kagent.dev/docs/kagent/getting-started/quickstart (HTTP 500 via WebFetch and Firecrawl, 2026-09-29)
- WebSearch "agent-substrate kagent Substrate microVM OR firecracker OR gVisor isolation actor runtime" (2026-09-29), including https://kagent.dev/blog/kagent-agent-substrate-sandboxes and https://github.com/agent-substrate/substrate
