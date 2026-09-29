---
name: OpenHands
slug: openhands
url: https://openhands.dev
repo: https://github.com/OpenHands/OpenHands
category: factory-orchestrator
license: "mixed - MIT (OpenHands, software-agent-sdk, automation, typescript-client), PolyForm Free Trial 1.0.0 (enterprise, OpenHands-Cloud), MIT except an embedded enterprise subdirectory (sandbox-server)"
open_source: partial
self_hostable: yes
hosting_model: self-hosted (Docker, VM, one-pod Kubernetes Helm chart) or OpenHands Cloud SaaS, Enterprise adds on-prem delivery via Replicated-packaged Helm charts
company: All Hands AI (OpenHands), Boston, founded 2024, founders Robert Brennan, Xingyao Wang, Graham Neubig, $23.8M raised ($5M seed, Menlo Ventures, Sep 2024, plus $18.8M Series A, Madrona, Nov 2025), no disclosed valuation
maturity: 89,479 stars, 11,798 forks, 879 open issues, first commit 2024-03-13, last push 2026-09-29, releases roughly weekly (npm package v1.9.0 to v1.24.0, May to Sept 2026)
similarity: 3
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 3
  verification: 1
  policy_outside_model: 1
  identity_per_task: 2
  cost_control: 1
  ux: 4
  reseedable_selfhost: 2
steal:
  - JMESPath webhook filters (trigger.filter evaluated by evaluate_filter() against the raw payload) decouple "which events matter" from forge-specific parsing code, worth copying for factoryd's intake regardless of language.
  - The RemoteWorkspace interface (one abstract backend, five concrete implementations: Docker, Apptainer, hosted API, Cloud, Kubernetes) is a clean template for letting our Harness interface's execution side vary without touching agent code.
  - The kubernetes-sigs/agent-sandbox operator (SandboxTemplate, SandboxWarmPool, pause/resume via spec.operatingMode) solves gVisor cold-start latency with warm pods, a problem our worker plane has not addressed.
  - Monaco diff view plus an xterm.js live terminal in one conversation screen closes two gaps our own baseline names as missing: no diff view, no real-time work stream.
  - The Agent Client Protocol (ACP) subprocess-relay pattern for driving a third-party CLI harness (Claude Code, Codex, Gemini) behind one UI validates our own Harness-interface plan and gives an open wire format to converge on instead of inventing one.
  - The SecurityRisk enum (UNKNOWN, LOW, MEDIUM, HIGH) plus ConfirmationPolicyBase (AlwaysConfirm, NeverConfirm, ConfirmRisky) is a usable risk vocabulary even if we keep the actual gate outside the agent process.
differs:
  - Capability decisions run inside the same process as the model (SecurityAnalyzerBase, ConfirmationPolicyBase, sometimes an LLM call), against our principle that policy lives outside the model in gateway code and network policy.
  - No NetworkPolicy manifests exist in any Helm chart we read, egress is left to the operator, against our default-deny-network requirement on every task.
  - Sandbox identity is a shared static init key bootstrapping every pod in a pool, against our per-task, short-lived, audience-scoped ServiceAccount token verified by the cluster OIDC issuer.
  - The default Agent Canvas mode runs the agent unsandboxed on the local host unless the user opts into Docker or Kubernetes sandboxing, against our constraint that everything always runs in a sandbox.
ux_verdict: The web UI's live terminal, diff view and conversation screen beat our console today, but "zero to first result" now means installing a local Node 24 agent-server rather than opening a URL.
slop_verdict: Real, large, funded and actively shipping, with a responsibly disclosed CVE and working Kubernetes sandbox code, but a disruptive rebrand about four months old and unverified enterprise cost-control claims make current marketing fluid.
---

# OpenHands

## 1. What it is

OpenHands (formerly OpenDevin) is built by All Hands AI, a Boston startup founded in 2024 by Robert Brennan, Xingyao Wang and Graham Neubig, funded with $23.8M across a seed and a Series A. It ships an open-source coding agent and SDK, a bundled web control surface called Agent Canvas, a paid OpenHands Cloud service, and a separately licensed Enterprise tier for fleet governance.

The README calls it the world's most-used open-source AI development agent. The repositories show something more specific: a multi-repository open-core project where the agent, its SDK and a webhook automation service are MIT licensed, while the enterprise integrations, the Kubernetes sandbox server and the hosted Cloud product sit in separate repositories under the PolyForm Free Trial 1.0.0 licence, which permits use for at most 30 days per calendar year without a commercial agreement and forbids redistribution.

It is sold three ways: free self-hosted core, paid OpenHands Cloud (hosted, usage billed), and a licensed Enterprise product ("Agent Control Plane") aimed at companies wanting on-prem multi-forge governance, RBAC and spend tracking across a fleet of agents.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Automation service (_automation) matches webhooks and cron against triggers with a JMESPath filter (trigger_matcher.py). Enterprise adds resolver mixins for GitHub, GitLab, Forgejo, Bitbucket and Azure DevOps that pull issue, PR and comment text into agent context. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. One forge. | They lead on forge breadth, we lead on telemetry as a signal, no alert-to-task path found in their code. |
| Control plane | Automation service persists run definitions and history in Postgres via SQLAlchemy and Alembic, then dispatches to a sandbox. Enterprise markets a fleet "Agent Control Plane" with RBAC and an audit trail. | factoryd (Go) with a Temporal workflow per task, Postgres, YAML policy in Git applied by Flux. | We lead. No durable workflow engine or Git-versioned policy document found in the repositories read, enterprise claims are marketing we could not verify in code. |
| Worker plane | Five pluggable RemoteWorkspace backends, Docker, Apptainer, OpenHands-hosted API, OpenHands Cloud, Kubernetes via the agent-sandbox operator, with warm pools and pause and resume. Default local Agent Canvas mode runs unsandboxed. | One gVisor pod per task, default-deny egress, read-only root filesystem, always on. | They lead on backend engineering, we lead on default posture. |
| Verification | An optional in-SDK "critic" (openhands-sdk/openhands/sdk/critic) can self-review or call an external critic API and retry. No independent CI, policy gate or stronger-model review pipeline found before a PR merges. | Forgejo Actions on gVisor runners, policy gates, a stronger-model review with a strict verdict. | We lead. |
| Merge and deploy | The agent opens a PR through the forge resolver flow. No bot-merge rule, auto-merge policy or GitOps deploy loop found. | Bot merge after human or auto rule, Flux deploy, staged soak with alert watch. | We lead, not really comparable. |
| Policy outside the model | SecurityAnalyzerBase and ConfirmationPolicyBase run inside the agent SDK process, an analyzer can itself be an LLM call. DefenseClaw (Cisco) is an optional third-party sidecar, not shipped by default. | Capability rules are a Git document enforced in factory-gateway code and Cilium network policy. | We lead. |
| Identity per task | Forge OAuth App installation tokens, short-lived and forge-scoped, Keycloak for humans, a hashed per-sandbox session key bootstrapped from a shared static init key across the pool. | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer. | We lead. |
| Artifacts not chat | The product's core interaction is a conversation view, chat-style turns plus a live terminal and diff view. Events are the internal wire format but the UX is built to watch a conversation. | TaskBrief in, branch, PR and a normalised event stream out, no chat surface. | Differs in philosophy, not simply better or worse. |

## 3. Architecture and stack

It is a multi-repository open-core system: a Python backend, a React frontend, five pluggable sandbox backends, a real Kubernetes operator integration, and no durable workflow engine that we could find.

Frontend (OpenHands/OpenHands, package.json): React Router 7, Tailwind 4, TanStack Query 5, Zustand for state, Monaco for the diff and code view, xterm.js for the live terminal, HeroUI, MSW for mocks, Node 24 or later required. The npm package is @openhands/agent-canvas, at v1.24.0, matching the Helm chart's pinned appVersion.

Backend is split three ways. The Agent Server, in OpenHands/software-agent-sdk, runs the actual agent loop and exposes the API the frontend and ACP clients talk to. The Automation service, a separate FastAPI app (openhands/automation/app.py, router.py, scheduler.py, dispatcher.py, models.py) backed by Postgres through SQLAlchemy and Alembic, owns cron and webhook scheduling and run history. The Enterprise app server (openhands/app_server/ in the enterprise repository) adds forge integrations, settings, RBAC and the Kubernetes sandbox client, and is PolyForm licensed, not MIT.

The SDK (OpenHands/software-agent-sdk) is organised as openhands-sdk (agent, conversation, security, critic), openhands-tools, openhands-agent-server (the ACP-capable server), and openhands-workspace. The workspace package holds five backend implementations under openhands/workspace/remote_api, cloud, apptainer, agent_sandbox (workspace.py in each) plus a local Docker path, all behind one RemoteWorkspace interface.

The Kubernetes story is not home-grown. It is built on kubernetes-sigs/agent-sandbox, a CRD-based operator (SandboxTemplate, SandboxWarmPool). AgentSandboxWorkspace on the client side and k8s_agent_sandbox_service.py (889 lines) on the enterprise server side implement pause and resume through spec.operatingMode (Suspended or Running) with PVC-backed state, gVisor or Kata isolation through runtimeClass on the template, warm-pool claiming, and a TTL safety net (shutdown_after_seconds).

Deployment shapes: a single-image agent-canvas Helm chart (helm/agent-canvas, a StatefulSet with a PVC, optional RBAC and ingress, one pod) for individual self-hosting, and a separate OpenHands-Cloud repository shipping EKS and GKE install charts plus a Replicated-only openhands-secrets chart (Keycloak, GitLab, Bitbucket and Azure DevOps OAuth, Postgres, JWT, sandbox API key secrets) for enterprise on-prem delivery.

No workflow or durable-execution engine, nothing Temporal-like, appears in any of the six repositories read. Control-plane durability rests on Postgres rows and a scheduler process, not a replayable state machine.

Cost is tracked as accumulated_cost and an optional max_budget_per_task field on conversation metrics, persisted by sql_app_conversation_info_service.py in the enterprise app server. We did not find a separate gateway process that prices or holds a budget before a model call happens. This is inference from the field names and call sites, not a confirmed enforcement point.

CVE-2026-33718, a command injection in openhands/runtime/utils/git_handler.py line 134 (get_git_diff) through an unsanitised path parameter, present since v1.5.0, was disclosed and fixed, with impact contained to the sandbox. This is a real hardening cycle, not only a marketing claim.

## 4. UX

Their onboarding and live-watch experience is stronger than our console today, a gap our own baseline names directly, but zero to first result now runs through a local install rather than a browser tab.

Agent Canvas is one Node process, frontend, agent server and automation together in one image, run locally (Docker or the published binary) or as the one-pod Helm chart (docs/architecture.md). We did not sign in to OpenHands Cloud, so the SaaS onboarding step count is not verified.

Watching an agent means a conversation view (chat-style turns) plus a live terminal (xterm.js, streaming the sandbox shell) plus a diff view (Monaco), directly answering the two gaps our baseline names as missing: no real-time work stream, no diff view.

Intervening uses the SDK's confirmation policies. AlwaysConfirm, ConfirmRisky with a threshold, or NeverConfirm decide whether a risky action pauses for approval. Outside that, the agent runs on its own.

ACP support lets the same UI front a third-party harness the user already trusts, Claude Code, Codex or Gemini, a capability our console does not offer today even though our own Harness interface is built with a second harness (Codex CLI) already planned.

The docs admit the trade-off rather than hide it. docs/architecture.md states local operation can give agents access to user workspaces and recommends Docker sandbox mode, meaning the easiest onboarding path is also the least isolated one.

## 5. Security, identity, sandbox, policy, cost

Security is enforced in code inside the agent process, not outside it. SecurityAnalyzerBase grades each ActionEvent as UNKNOWN, LOW, MEDIUM or HIGH, ConfirmationPolicyBase decides whether to pause, and a real analyzer can itself be an LLM call. Nothing outside that process double-checks the verdict by default. DefenseClaw, from Cisco, is documented as an optional sidecar that scans skills, MCP servers and LLM traffic without source changes, so policy outside the model is available but not shipped as a default.

Identity is layered but not per-task. Human identity runs through Keycloak in enterprise deployments or forge OAuth elsewhere. Agent-to-forge identity uses GitHub, GitLab, Azure DevOps and Bitbucket App installation tokens, short-lived and scoped by the forge, a reasonable pattern. Agent-to-sandbox identity uses a hashed per-sandbox session API key, but that key is bootstrapped from a shared static secret (OH_SECRET_KEY and AGENT_SANDBOX_INIT_API_KEY) across the whole pool, not a per-task cryptographic workload identity.

Sandboxing offers five interchangeable backends: Docker, Apptainer, the OpenHands-hosted API, OpenHands Cloud, and Kubernetes through the agent-sandbox operator. The Kubernetes path adds warm pools, pause and resume, and gVisor or Kata isolation. None of this is mandatory. The default Agent Canvas local mode runs the agent directly on the host with no sandbox unless the user turns one on.

Policy lives in Python objects the agent SDK loads at runtime, a risk enum and a confirmation policy, not in a Git-versioned document enforced by a separate gateway or network layer. No NetworkPolicy manifests exist in either Helm chart repository we read, the main repository's helm/agent-canvas or the separate OpenHands-Cloud charts directory, so egress control is left to whoever operates the cluster.

Cost tracking exists as accumulated_cost and an optional max_budget_per_task, persisted per conversation. This reads as a soft, in-process check rather than a pre-flight hold taken under a database lock before the model call happens. Enterprise pages market workflow-level spend tracking against tools like LiteLLM and OpenRouter, but we found no gateway-side enforcement code for this. Not verified.

## 6. What we should take from it

Narrow, copyable this month: the JMESPath webhook filter pattern (trigger.filter evaluated by evaluate_filter() against the raw payload) is a smaller, more general replacement for hand-rolled per-event-type parsing in factoryd's intake, worth lifting as a design regardless of language. The RemoteWorkspace interface shape, one abstract backend with several concrete implementations selected by configuration, is a clean template for letting our Harness interface's execution side vary, gVisor pod today, a future microVM or bare-metal backend, without touching agent code. Their risk vocabulary, SecurityRisk plus ConfirmationPolicyBase, is reusable as a taxonomy even though we would keep the actual gate outside the agent process, in gateway code, rather than let the sandbox grade itself.

Broad, product shape and priorities: the kubernetes-sigs/agent-sandbox operator, with SandboxWarmPool and pause and resume through spec.operatingMode, solves a real problem our design has not addressed, gVisor cold-start latency. A warm-pool pattern for our per-task pods would cut worker-plane startup time without weakening isolation, and is the single broad idea most worth prototyping. The Monaco diff view and xterm live terminal in one conversation screen directly close two gaps our own baseline lists as missing. Our console, server-rendered with htmx, could add a read-only live log and diff pane without adopting their chat-centred interaction model. ACP, as an open, harness-agnostic subprocess protocol, is worth watching as a candidate wire format for our own Harness interface instead of inventing a private one, since it already has three real adopters wired to it from the OpenHands side.

## 7. Where our philosophy differs and what that costs or buys us

The costliest difference is that their capability control lives inside the same process as the model, ours does not, and copying their shape would mean giving up the one guarantee our design is built around.

Policy outside the model: SecurityAnalyzerBase, ConfirmationPolicyBase and the LLM-based analyzer execute inside the sandboxed agent process, so the component deciding whether an action is risky can itself be manipulated by whatever manipulated the agent. Our principle puts that decision in gateway code and network policy the agent cannot touch. We can take their taxonomy but not their enforcement point, there is no shortcut that keeps our principle intact.

Default-deny network: none of the four chart or Helm repositories we read ship a NetworkPolicy. Matching their convenience, working on any cluster with no CNI assumptions, would mean dropping our default-deny requirement. We will not do that, so every environment we support must supply its own network policy layer, Cilium today, which they leave to the operator.

Identity per task: a shared static init key bootstrapping every sandbox in a pool is simpler to run than our per-task, kubelet-rotated, audience-scoped ServiceAccount token, but it means one leaked key affects the whole pool rather than one task. We keep the harder-to-run design on purpose.

Local-first, sandbox-optional default: the Agent Canvas pivot buys a much shorter zero-to-first-result path, no sandbox to provision, at the cost of running the agent on the bare host by default. Our constraint that everything runs in a sandbox forbids that shortcut. We pay for it in setup friction, they pay for it in blast radius.

## 8. Red flags and slop assessment

This is a real, heavily used, well-funded project, not a marketing shell, but a disruptive rebrand roughly four months before this research, plus enterprise claims we could not verify in code, mean anything dated before mid-2026 should be treated as provisional.

Maintenance signals are strong: 89,479 stars, 11,798 forks, 879 open issues, first commit 2024-03-13, last push 2026-09-29, today, and a release cadence of roughly weekly on the npm package, v1.9.0 to v1.24.0 across May to September 2026.

A real security incident was handled responsibly. CVE-2026-33718, a command injection in git_handler.py present since v1.5.0, was disclosed and fixed, contained to the sandbox, even though the sandbox is opt-in by default now.

Open-core gating is specific, not vague. Multi-forge resolver logic for GitLab, Forgejo, Bitbucket and Azure DevOps, the Kubernetes sandbox server, and the Agent Control Plane fleet features all live in the enterprise repository under PolyForm Free Trial 1.0.0, 30 days per year of non-commercial use, no redistribution. GitHub-only intake and Docker or local sandboxing are the parts that stay fully open.

Marketing runs ahead of code in at least one place. Enterprise and Cloud pages advertise budget and spend tracking comparable to LiteLLM or OpenRouter. We found a persisted max_budget_per_task field and cost accounting but no pre-flight enforcement code. Not verified from the repositories we could read.

Recency is a risk in itself. The whole Agent Canvas rebrand, local-first control centre, third-party harnesses through ACP, sandboxing made optional, replaced the original one-Docker-container-per-conversation model within the last few months of this research date. A user-reported issue, GitHub issue 16492, describes the bundled VS Code editor sharing the Canvas browser origin through a path prefix rather than isolation, so a script on that origin can read the browser's localStorage, which holds session API keys. Found via search, not independently reproduced, we never signed in or ran code.

Enterprise packaging carries a vendor dependency the open-source core does not have. The on-prem Enterprise Helm charts, including openhands-secrets, are distributed only through Replicated, a third-party packaging and licensing tool.

## 9. Sources

Repositories cloned read-only, depth 1, no code executed: https://github.com/OpenHands/OpenHands (HEAD 94e156a8, 2026-09-28), https://github.com/OpenHands/software-agent-sdk, https://github.com/OpenHands/enterprise, https://github.com/OpenHands/automation, https://github.com/OpenHands/OpenHands-Cloud, https://github.com/OpenHands/sandbox-server
Files read in OpenHands/OpenHands: README.md, docs/README.md, docs/architecture.md, docs/SELF_HOSTING.md, docs/DefenseClaw.md, package.json, LICENSE, helm/agent-canvas/Chart.yaml, helm/agent-canvas/values.yaml, helm/agent-canvas/templates (listing), top-level find -maxdepth 2
Files read in software-agent-sdk: README.md, openhands-sdk/openhands/sdk/security/risk.py, confirmation_policy.py, analyzer.py, openhands-sdk/openhands/sdk/critic/base.py and impl (listing), openhands-workspace/openhands/workspace/remote_api/workspace.py, cloud/workspace.py, apptainer/workspace.py, agent_sandbox/workspace.py, directory structure of openhands-sdk, openhands-tools, openhands-agent-server, openhands-workspace
Files read in enterprise: LICENSE, openhands/app_server/integrations/forgejo/service/resolver.py, github/github_service.py, openhands/app_server/sandbox/k8s_agent_sandbox_service.py (first 180 lines), openhands/app_server/settings/settings_models.py (grep), openhands/app_server/app_conversation/sql_app_conversation_info_service.py (grep)
Files read in automation: README.md, openhands/automation/trigger_matcher.py
Files read in OpenHands-Cloud: charts/openhands-secrets/README.md, charts and eks-install and gke-install directory listings, grep for NetworkPolicy, none found
Files read in sandbox-server: LICENSE, top-level directory listing
gh api repos/OpenHands/OpenHands, 2026-09-29, stars, forks, open issues, created and pushed dates, licence
WebFetch https://openhands.dev, 2026-09-29
WebSearch site:docs.openhands.dev security OR self-hosting enterprise sandbox, 2026-09-29, surfaced docs.openhands.dev/enterprise, /enterprise/docker-in-sandbox, /enterprise/quick-start, /enterprise/enterprise-vs-oss, /overview/faqs, /enterprise/release-notes
WebSearch CVE-2026-33718 OpenHands, 2026-09-29
WebSearch All Hands AI funding Series A Madrona, 2026-09-29
WebSearch OpenHands vs Claude Code review, 2026-09-29
WebSearch OpenHands Agent Canvas pivot, 2026-09-29
