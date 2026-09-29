---
name: Envoy AI Gateway (now Agent Router)
slug: envoy-ai-gateway
url: https://theagentrouter.ai
repo: https://github.com/theagentrouter/agent-router
category: model-gateway
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted on Kubernetes via Helm (requires Envoy Gateway as a dependency) or a single local binary (aigw run, no Kubernetes); no first-party SaaS, though lead maintainer Tetrate separately sells a hosted/enterprise edition and its own hosted multi-model backend (Tetrate Agent Router Service) that appears as a selectable provider inside the product
company: No single company. An Agentic AI Foundation project (a Series of LF Projects, LLC) since 2026-09-10, formerly an Envoy sub-project under the CNCF; maintainers span Tetrate (lead commercial backer, sells hosted/enterprise editions), Bloomberg, Tencent, Netflix, AMD and Nutanix
maturity: 2155 stars, 395 forks, 312 open issues (GitHub API, post-rename record); repo created 2024-10-21, first release Feb 2025, v1.0.0 GA 2026-06-23, v1.1.0 2026-08-21 (roughly quarterly minors), last commit 2026-09-28
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 2
  ux: 1
  reseedable_selfhost: 4
steal:
  - "CEL-based per-request cost expressions (internal/llmcostcel) that turn token counts into a numeric cost consumed by Envoy's global rate-limit filter. A cleaner way to express a pricing rule than hardcoding it in Go; worth it for factory-gateway's worst-case-price clamp."
  - "BackendSecurityPolicy's OIDC token-exchange option for AWS/GCP/Azure backends (api/v1alpha1/backendsecurity_policy.go), an alternative to a static secretRef that avoids a long-lived provider key sitting in a Secret. Worth mirroring for factory-gateway's own gateway-to-provider leg."
  - "MCP tool authorization scoped per identity via CEL over JWT claims and MCP context (docs/proposals/006-mcp-gateway, 010-mcp-token-exchange, 011-mcp-backend-crd): a caller only discovers and can invoke tools it is permitted to use. More granular than our single coder capability class."
  - "internal/backendauth is one small handler per provider auth scheme (x-api-key for Anthropic, SigV4 for AWS, Azure AD token, GCP), each under 40 lines. A reasonable shape if factory-gateway ever needs to front more providers directly instead of through LiteLLM."
  - "aigw run starts a full local OpenAI-compatible router with one env var and one command, no Kubernetes. Worth stealing as an onboarding idea even though our own target is Kubernetes-only."
differs:
  - "It hard-requires Envoy Gateway's own extension-server hook (manifests/envoy-gateway-values.yaml, config.envoyGateway.extensionManager.hooks.xdsTranslator, pointed at the ai-gateway-controller service) to patch xDS at translation time. Cilium's Gateway API support is a separate, self-contained pipeline: cilium-operator owns GatewayClass cilium (controllerName io.cilium/gateway-controller), turns Gateway API objects straight into CiliumEnvoyConfig, and each Cilium agent programs its own embedded or DaemonSet cilium-envoy over xDS, with no equivalent extension-server hook for a third party to plug into. Agent Router cannot attach to Cilium's existing Envoy."
  - "Fitting it in means installing Envoy Gateway as a second, independent Gateway API implementation next to Cilium: its own GatewayClass, its own CRDs (EnvoyProxy, EnvoyPatchPolicy), its own Envoy Proxy Deployment per Gateway, its own namespace (envoy-gateway-system plus envoy-ai-gateway-system). Cilium keeps doing CNI, kube-proxy replacement and default-deny NetworkPolicy underneath regardless, since that enforcement wraps every pod including Envoy Gateway's, so nothing actively conflicts, but it doubles the L7 proxy fleet and the control-plane surface we would have to reconcile against policy in Git."
  - "Cost control is a token-count quota against Envoy's global rate-limit service (Redis-backed), scoped per Gateway/AIGatewayRoute, not a dollar ledger with a hold taken under a database lock and booked after the real cost is known, and not fleet-wide. Adopting it as our budget mechanism would regress our per-task, per-day, per-project envelope."
ux_verdict: aigw run is a genuinely fast local try-it path, but there is no admin UI, no platform RBAC or SSO, no prompt or response logging and nothing to watch or approve, because it is a wire-level proxy with no task concept at all.
slop_verdict: real and used in anger (multi-vendor maintainers, quarterly releases, a written API-stability promise, three commercial products built on it per an outside review), but it just underwent a governance and branding change (Envoy sub-project under CNCF to standalone Agentic AI Foundation project, new org, new domain) in the same month as this research, worth re-checking link and doc stability in a few months.
---

# Envoy AI Gateway (now Agent Router)

## 1. What it is

Envoy AI Gateway was renamed Agent Router on 2026-09-10, moving from an Envoy sub-project under the CNCF to a standalone project of the Agentic AI Foundation (LF Projects, LLC). The code, CRDs (AIGatewayRoute, AIServiceBackend, BackendSecurityPolicy), the aigw CLI, the Go module path (github.com/envoyproxy/ai-gateway) and the Apache-2.0 licence are unchanged; old envoyproxy/ai-gateway and aigateway.envoyproxy.io links redirect. It is an Envoy-based proxy that gives applications one OpenAI-compatible API in front of 16-plus model providers, adding routing, provider credential injection, token-based rate limits, failover and MCP tool proxying.

The maintainers list (Tetrate, Bloomberg, Tencent, Netflix, AMD, Nutanix per an outside review) shows this is not a single-vendor project with an open-source label, though Tetrate is the dominant commercial backer and sells its own hosted/enterprise edition. The repository confirms a real, actively maintained Go project (commits the day before this report was cloned) that does exactly what the docs describe: it is genuinely built as an Envoy extension, not a marketing wrapper.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None, it is not an intake system | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | Kubernetes CRDs declare routing, backend and quota state, reconciled by a controller into Envoy xDS; no task or workflow state | Temporal workflow per task, Postgres, policy in Git | not comparable |
| Worker plane | None, it does not run agents | gVisor pod per task, default-deny egress | not comparable |
| Verification | None | Forgejo Actions, policy gates, stronger-model review | not comparable |
| Merge and deploy | None | Bot merge, Flux GitOps | not comparable |
| Policy outside the model | CEL expressions over JWT claims and MCP context decide routing and which MCP tool a caller may invoke, enforced in the ext_proc filter, never seen by a prompt | Capability YAML in Git, enforced in factory-gateway and NetworkPolicy | equal, narrower scope but deeper on MCP tool visibility |
| Identity per task | BackendSecurityPolicy resolves the gateway-to-provider credential (static Secret or OIDC token exchange); says nothing about how the calling workload itself is identified | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | Not applicable, a request/response proxy | TaskBrief in, branch and PR out | not comparable |

## 3. Architecture and stack

A Go monorepo with three binaries under cmd/: aigw (standalone CLI, runs the whole stack locally with no Kubernetes), controller (a controller-runtime process reconciling the CRDs and doubling as the Envoy Gateway "extension server" that patches xDS at translation time, internal/extensionserver), and extproc (an Envoy external processor gRPC service, internal/extproc, called per request/response by Envoy's ext_proc filter to translate OpenAI/Anthropic/Bedrock/Gemini/Cohere wire formats, inject backend auth via internal/backendauth, and compute token cost via internal/llmcostcel). It holds no database of its own: routing and policy state lives in Kubernetes CRDs applied via GitOps, and rate-limit counters live in the Envoy Gateway rate-limit service (Redis-backed). Deployment is two Helm charts (manifests/charts/ai-gateway-crds-helm, ai-gateway-helm) plus a required upstream oci://docker.io/envoyproxy/gateway-helm install, configured through manifests/envoy-gateway-values.yaml.

On the Cilium question: this project is not a generic Envoy filter, it hooks into one extension point that only Envoy Gateway exposes (config.envoyGateway.extensionManager.hooks.xdsTranslator, pointed at the ai-gateway-controller service). Cilium's Gateway API support is a separate pipeline: cilium-operator owns GatewayClass cilium (controllerName io.cilium/gateway-controller), turns Gateway API objects into CiliumEnvoyConfig, and each Cilium agent programs its own embedded or DaemonSet cilium-envoy over xDS directly, with no extension-server hook for a third party. So Agent Router cannot attach to Cilium's existing Envoy. It fits alongside Cilium only by running Envoy Gateway as a second, independent Gateway API implementation (its own GatewayClass, CRDs, and an Envoy Proxy Deployment per Gateway), while Cilium keeps doing CNI, kube-proxy replacement and NetworkPolicy underneath both. That composes without conflict, since Cilium's enforcement wraps every pod regardless of which controller owns Gateway API, but it means two Gateway API control planes and two Envoy fleets in the cluster, not one filter added to Cilium's own Envoy.

## 4. UX

Local: set OPENAI_API_KEY and run aigw run, then point any client at localhost:1975/v1, two steps to a first response. On Kubernetes: install Gateway API CRDs, install Envoy Gateway via Helm with the provided values file, install the AI Gateway CRDs and controller via a second Helm chart, then apply a Gateway, AIGatewayRoute and BackendSecurityPolicy, roughly five steps before a first routed call. There is no admin UI: every change is a manifest through GitOps or kubectl. Watching means Prometheus metrics and OTel GenAI-convention traces; there is no built-in console, no request or response logging, and no approval or intervention model, because there is no task concept to intervene in.

## 5. Security, identity, sandbox, policy, cost

Sandbox: not applicable, it is trusted proxy infrastructure, not an execution sandbox. Identity: provider credentials live in Kubernetes Secrets referenced by BackendSecurityPolicy and are injected as a header or signature right before the call leaves the cluster (internal/backendauth); an OIDC-token-exchange path exists for AWS/GCP/Azure so a long-lived key is not required for those backends, but the calling workload's own identity is whatever the operator's Gateway already checks, the project supplies the CEL policy engine, not token issuance. Policy: CEL expressions in AIGatewayRoute/MCPRoute decide routing, backend selection and MCP tool visibility, enforced in the extproc filter, matching "policy outside the model" for the slice of traffic it sees. Cost: token counts (input, cached, output, reasoning) are computed per response and can feed Envoy's global rate-limit service as a quota; per an outside review, budgets are scoped per Gateway resource, not fleet-wide, and there is no dollar ledger, no hold-then-book step and no chargeback UI in the open-source build.

## 6. What we should take from it

Narrow: the CEL cost-expression pattern and the OIDC-token-exchange option for backend credentials are both small, concrete mechanisms worth copying into factory-gateway this month. The backendauth per-provider handler shape is a clean reference if factory-gateway ever talks to a provider directly instead of through LiteLLM.

Broad: the MCP tool-authorization model, where a caller only discovers and can invoke tools it is permitted to use, is a sharper shape than our current flat coder capability class and is directly relevant since factory-gateway proxies MCP tool calls itself. It is worth designing our next capability class around per-tool visibility rather than a single coarse role.

## 7. Where our philosophy differs and what that costs or buys us

Agent Router is a wire-level Envoy extension, not a task or workflow system: it has zero concept of a task, an approval or a human lane, so adopting it would only ever cover the "forward this call to a model provider" leg, never factory-gateway's capability, budget and approval logic above the wire. It also hard-requires Envoy Gateway's specific extension mechanism, which does not exist in Cilium's own Gateway API pipeline (see section 3); running it means a second Gateway API control plane and a second Envoy fleet next to Cilium, not a drop-in filter, a real operational cost our "as few tools as possible" constraint has to weigh against the MCP-authorization and credential-exchange gains. Its cost control is a per-gateway token quota, not our dollar-denominated, database-locked hold-and-book ledger; copying it as-is would be a regression on the one axis (cost_control) where our own design is already more complete.

## 8. Red flags and slop assessment

The project changed governance and branding (CNCF/Envoy sub-project to a standalone Agentic AI Foundation project, new GitHub org theagentrouter, new domain theagentrouter.ai) on 2026-09-10, nineteen days before this research; docs and third-party links are still catching up (open issues and PRs in other projects such as vllm-project/semantic-router and apache/skywalking exist specifically to update the name). The maintainer list is multi-vendor, a healthy signal against single-vendor lock-in, and container images, CRDs and the CLI name did not change. Tetrate's own hosted "Tetrate Agent Router Service" appears inside the product's own supported-provider list, a mild open-core-adjacent signal (an upsell path baked into the docs), though the core itself is not feature-gated as far as this research could verify. An outside review (a commercial competitor, so read with that bias) lists concrete open-source gaps consistent with what the code shows: no admin UI, no fleet-wide budgets, no prompt or response logging, no built-in guardrails, production use requires standing up Envoy Gateway, the controller and a rate-limit service yourself.

## 9. Sources

- https://github.com/theagentrouter/agent-router, cloned shallow (as envoyproxy/ai-gateway) to /home/womb/repos/market-research-clones/envoy-ai-gateway
- README.md, LICENSE, CONTRIBUTING.md, go.mod
- manifests/envoy-gateway-values.yaml, manifests/charts/ai-gateway-helm/Chart.yaml, manifests/charts/ai-gateway-crds-helm
- api/v1alpha1/backendsecurity_policy.go, api/v1alpha1/ai_gateway_route.go
- internal/llmcostcel/cel.go, internal/backendauth (anthropicapikey.go, aws.go, azure.go, gcp.go, api_key.go, credential_override.go)
- internal/extensionserver, internal/extproc, internal/controller, cmd/aigw, cmd/controller, cmd/extproc (directory layout)
- examples/token_ratelimit/token_ratelimit.yaml
- docs/proposals/002-inference-gateway-support, 003-epp-integration-proposal, 006-mcp-gateway, 009-quota-aware-routing, 010-mcp-token-exchange, 011-mcp-backend-crd (proposal.md files)
- gh api repos/envoyproxy/ai-gateway (2026-09-29, redirects to theagentrouter/agent-router)
- gh api repos/envoyproxy/ai-gateway/releases (2026-09-29)
- https://theagentrouter.ai/docs/ (fetched 2026-09-29)
- https://www.truefoundry.com/blog/envoy-ai-gateway-review (fetched 2026-09-29, commercial-competitor source, read critically)
- WebSearch: Envoy AI Gateway renamed Agent Router theagentrouter (2026-09-29), surfacing theagentrouter.ai/blog/envoy-ai-gateway-is-now-agent-router, vllm-project/semantic-router#4126, apache/skywalking#14082
- WebSearch: Cilium Gateway API GatewayClass cilium-envoy how it implements Gateway API controllerName (2026-09-29), surfacing docs.cilium.io Gateway API Support and Envoy proxy pages
