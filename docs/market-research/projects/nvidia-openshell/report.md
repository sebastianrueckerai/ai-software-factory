---
name: NVIDIA OpenShell
slug: nvidia-openshell
url: https://docs.nvidia.com/openshell/latest/
repo: https://github.com/NVIDIA/OpenShell
category: sandbox-runtime
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, Docker, Podman, Kubernetes (Helm) or MicroVM, no hosted SaaS, optional paid NVIDIA BlueField-4 Sentry hardware sold separately
company: NVIDIA, public company, HQ Santa Clara, built with Red Hat as co-maintainer, GTC 2026 announcement, GA 28 Sep 2026
maturity: 9991 stars, 1376 forks, 465 open issues, 1558 commits, 99 releases, 147 contributors, 13 named maintainers (NVIDIA and Red Hat), first commit ~24 Feb 2026, last push 29 Sep 2026, near-daily release cadence through Aug-Sep 2026
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 5
  verification: 0
  policy_outside_model: 5
  identity_per_task: 4
  cost_control: 0
  ux: 2
  reseedable_selfhost: 3
steal:
  - Trust-on-first-use SHA256 binary pinning for process identity (docs/security/best-practices.mdx), a cheap defence against a swapped executable inheriting a capability grant.
  - An SMT-solver boundary proof before a policy change ships (openshell-prover, docs/how-it-works/policies/prover.mdx), a machine-checked "stays within X" proof rather than a diff review, for auto-approved policy widenings.
  - Non-overridable SSRF hard blocks (loopback, link-local, 0.0.0.0, 169.254.169.254) that no policy YAML can lift, per docs/security/best-practices.mdx.
  - Two independent authorisation checks before a credential is released (network policy must allow the call, and the credential binding must match host/port/path), narrower blast radius than one combined check.
  - OCSF-native JSONL audit export (docs/observability/ocsf-json-export.mdx) for SIEM ingestion, something our SigNoz traces do not give us today.
  - An agent-facing policy API (policy.local: GET /v1/denials, POST /v1/proposals) so an agent reads its own denials and proposes a fix, instead of a human hand-editing YAML first.
differs:
  - OpenShell has no task registry, budgets, verification or merge/deploy loop. It is a sandbox-plus-policy-plus-credential runtime, not a competing factory, so adopting it only ever answers the worker-plane and identity/policy questions, never the whole system.
  - Its Kubernetes driver depends on an external CRD (kubernetes-sigs/agent-sandbox) and the docs warn Kubernetes accepts NetworkPolicy objects even when no CNI enforces them. Running it on our Cilium cluster is safe, but it adds a second policy authority next to our CiliumNetworkPolicy-in-Git model unless we pick one as canonical.
  - Its default credential store is its own AES-256-GCM envelope database, a second secret store next to our OpenBao standard, unless we adopt its Vault-compatible credential driver, which we have not checked for OpenBao compatibility.
ux_verdict: CLI and TUI only, no web console. The policy.local self-service denial API is a good idea we lack, but there is nothing here like a kanban board or a human approval lane.
slop_verdict: Real and actively maintained, 1558 commits, 99 releases, near-daily cadence, 13 named maintainers, a 28 Sep 2026 NVIDIA GA launch and positive independent hands-on coverage from Red Hat. Not a landing-page project.
---

# NVIDIA OpenShell

## 1. What it is

NVIDIA OpenShell is an open-source, Rust-based runtime for running autonomous AI agents inside isolated sandboxes, with a declarative policy enforced outside the agent process by a supervisor. NVIDIA builds it with Red Hat as a co-maintaining partner: MAINTAINERS.md lists 13 maintainers with mixed NVIDIA and Red Hat affiliation, and GOVERNANCE.md sets out a CNCF-style Contributor to Reviewer to Maintainer ladder with lazy-consensus voting. The GitHub description calls it "the safe, private runtime for autonomous AI agents."

The project went public around 24 February 2026 (created_at from gh api repos/NVIDIA/OpenShell), was announced at GTC 2026 and demoed at RSAC 2026, and reached general availability on 28 September 2026 as one half of NVIDIA's "Open Agent Safety Platform" launch. The other half, Sentry, is a paid hardware watchdog on NVIDIA's BlueField-4 DPU, sold separately from the free, Apache-2.0 OpenShell software.

What the makers claim: any harness runs unmodified while OpenShell enforces filesystem, network, process and credential isolation at the kernel level, with a full audit trail of every allow and deny decision. Secondary press (not verified against the docs I read) names Claude Code, Codex and "OpenClaw" as example harnesses.

What the repository and docs actually show: three binaries (CLI, openshell-gateway, openshell-supervisor), a driver-plugin model for compute, credentials and identity, Landlock LSM plus two-phase seccomp plus a forced-egress network proxy for isolation (docs/security/best-practices.mdx), a YAML policy schema (docs/how-it-works/policies/schema.mdx), an SMT-solver-based prover (openshell-prover) and a mostly deterministic advisor (crates/openshell-sandbox/src/mechanistic_mapper.rs) that turns denials into proposed rules, and a Helm chart that leans on the external kubernetes-sigs/agent-sandbox controller rather than owning pod scheduling itself. Direct grep of the repository confirms Claude Code (13 files), Codex (22 files, including a full worked example under examples/codex-app-server) and opencode (12 files, mostly skill docs and README mentions) are all named as supported harnesses, with Codex the most deeply documented.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. OpenShell has no issue, alert or webhook intake. It is invoked by a human or an external orchestrator to provision a sandbox | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API, every task a Forgejo issue | not comparable |
| Control plane | Gateway tracks sandbox lifecycle (Provisioning, Ready, Stopping, Stopped, Starting, Completed, Error, Deleting), leases ownership of live supervisor sessions across replicas Nomad-style, SQLite or Postgres state, policy changes logged as CONFIG:PROPOSED / CONFIG:APPROVED / CONFIG:REJECTED / CONFIG:LOADED. No task registry, no budgets, no cost ledger | factoryd with a Temporal workflow per task, Postgres, policy as a YAML file in Git applied by Flux, budgets and approvals | equal on the slice they cover, we lead on scope |
| Worker plane | One sandbox per invocation via Docker, Podman, Kubernetes (external CRD) or MicroVM. Landlock plus seccomp plus a forced-egress network namespace. Harness-agnostic, proven with Claude Code, Codex and opencode | One gVisor pod per task, ServiceAccount, read-only root filesystem, default-deny egress, opencode headless behind a Go Harness interface | they lead, deeper isolation stack and multi-harness support already proven |
| Verification | None. The Prover checks that a policy proposal stays within a boundary, it does not check code correctness | Forgejo Actions on gVisor runners, policy gates, stronger-model review before merge | not comparable, different problem |
| Merge and deploy | None | Bot merge after approval or an auto rule, Flux GitOps deploy, staged rollout with an alert wait | not comparable, absent in OpenShell |
| Policy outside the model | Full YAML policy (filesystem, network, process, Landlock) enforced by the supervisor outside the agent process, with an SMT-solver formal boundary proof (prover) and a deterministic, non-LLM proposal path as the default | Policy YAML in Git applied by Flux to Cilium NetworkPolicy, plus gateway capability checks, no formal proof step | they lead, formal verification is something we lack entirely |
| Identity per task | Placeholder-token credential injection resolved only when network policy and credential-binding endpoint both match. SPIFFE-based dynamic token exchange. AWS STS minting. Trust-on-first-use binary SHA256 pinning | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer, mapped to the task row, forwarded under a per-task LiteLLM virtual key. Two ephemeral Forgejo tokens for git | roughly equal, their two-boundary check and binary pinning are refinements worth stealing, our task-row and budget binding is something they lack |
| Artifacts not chat | Not applicable in the same sense. OpenShell has no task or PR artifact model, a sandbox is ephemeral compute and the harness inside it produces whatever it produces | TaskBrief in, a branch, a PR and a normalised event stream out, Git as the coordination mechanism | not comparable |

## 3. Architecture and stack

OpenShell is written in Rust, organised as crates under crates/: openshell-core (settings, feature flags such as agent_policy_proposals_enabled in crates/openshell-core/src/settings.rs), openshell-gateway, openshell-supervisor, openshell-sandbox (denial_aggregator.rs, mechanistic_mapper.rs), openshell-server (grpc/policy.rs), openshell-cli (run.rs), openshell-tui (ui/sandbox_draft.rs) and openshell-prover. The gateway delegates to four pluggable driver subsystems, Compute, Credentials, Control-Plane Identity and Sandbox Identity, each a separate gRPC or UDS driver process, a model the RFC (rfc/0001-core-architecture/README.md) states is deliberately copied from HashiCorp's Terraform and Nomad provider plugins.

State storage is SQLite for single-node or development use (workload.kind=statefulset in the Helm chart) or Postgres for production multi-replica deployment (workload.kind=deployment). Credential envelopes are AES-256-GCM encrypted in the gateway's own database by default, with pluggable kubernetes-secrets and vault credential drivers for shared backends. The Helm chart auto-generates PKI secrets via pre-install hooks and retains a Kubernetes Secret holding the envelope key-encryption key.

Deployment shape: three binaries, a CLI, openshell-gateway, and openshell-supervisor (the last runs inside the sandbox). Compute drivers target Docker, Podman, Kubernetes and MicroVM, all exposing the same gateway API surface (docs/how-it-works/gateways/overview.mdx). The Kubernetes driver does not schedule pods itself, it creates a Sandbox custom resource (sandboxes.agents.x-k8s.io) consumed by the separate kubernetes-sigs/agent-sandbox controller, plus its own supervisor Pod, a Service for a stable boundary address, a PVC for /sandbox persistence, and a NetworkPolicy that only allows supervisor-to-workload ingress. docs/kubernetes/setup.mdx states plainly that this NetworkPolicy is inert unless the cluster's CNI actually enforces NetworkPolicy, Kubernetes accepts but does not require enforcement. The Helm chart is distributed as an OCI artifact, oci://ghcr.io/nvidia/openshell/helm-chart, split into a gateway chart (openshell) and a workspace chart (openshell-workspace), with shared, managed and operator workspace modes.

Agents run unmodified inside the sandbox. The supervisor forces all outbound traffic through a host-side veth at 10.200.0.1 where an HTTP CONNECT proxy sits, so a process that ignores proxy environment variables still cannot reach the network directly. Landlock LSM enforces filesystem access, a two-phase seccomp filter (a narrow startup prelude, then a broader post-privilege-drop runtime filter) restricts syscalls, and the executable's SHA256 hash is pinned on first connection. OpenShell does not itself route or price model calls, it enforces policy on whatever outbound calls the agent's own harness makes, with named example provider profiles for OpenAI, Anthropic, NVIDIA, DeepInfra and Google Vertex AI (docs/how-it-works/providers/overview.mdx). There is no cost or budget ledger anywhere in the docs I read.

## 4. UX

OpenShell is CLI and TUI first, there is no web console in the docs I found. A user runs openshell sandbox create, sandbox connect and sandbox exec from the CLI (docs/how-it-works/sandboxes/overview.mdx), or installs an agent skill directly with npx skills add NVIDIA/OpenShell. Counting the README quickstart, a first sandboxed agent run is roughly install CLI, start or point at a gateway, sandbox create, sandbox connect, run the agent inside, five steps.

While an agent works, a human watches through the TUI (crates/openshell-tui) or reads logs, both the OCSF JSONL stream and a parallel human-readable openshell.YYYY-MM-DD.log. Intervention and approval happen two ways. First, the standard human-in-the-loop path: a policy proposal from the advisor waits for human approval by default, reviewed and approved through the TUI's sandbox_draft.rs view or the CLI. Second, an agent-facing self-service path unique to OpenShell: the sandbox exposes a policy.local HTTP API (GET /v1/policy/current, GET /v1/denials, POST /v1/proposals, GET /v1/proposals/{id}, GET /v1/proposals/{id}/wait) so the agent itself can read what it was denied and file a proposal, without a human first transcribing the denial into YAML.

Compared with our console, a server-rendered kanban board with a human lane and a cost view, OpenShell has no equivalent. There is nothing to browse tasks across projects, no cost view, because OpenShell does not model "tasks" or "cost" at all. What it does better is putting the policy-repair loop directly in the agent's own reach through policy.local, rather than requiring a human to be the sole editor of the policy document.

## 5. Security, identity, sandbox, policy, cost

Security is enforced in code at the kernel boundary, not in prompts. docs/security/best-practices.mdx documents the enforcement order precisely: privileged bootstrap helpers, a startup-prelude seccomp filter, namespace entry, privilege drop, core-dump hardening, Landlock, then the runtime seccomp filter. This is Landlock plus seccomp plus a network-namespace-forced proxy, explicitly not gVisor. Red Hat's independent testing (16 July 2026, developers.redhat.com) confirms this holds in practice for network egress ("in our testing, the secrets didn't leave the sandbox") but flags that Landlock, seccomp and the proxy all sit inside the same kernel's integrity boundary, a kernel exploit still escapes everything, which is why the MicroVM driver or a TEE is recommended for that threat class.

Identity for credentials never lets the agent process see a real secret. Placeholder tokens are injected into the environment at sandbox startup, and the supervisor's proxy resolves them only at the point of an authorised HTTP call, resolving them in headers, query parameters, URL path segments, and opted-in request bodies or WebSocket text frames. Release requires two independent checks to pass: the network policy must allow the calling binary and destination, and the credential binding must separately match host, port and path. A mismatch fails closed with HTTP 403 credential_endpoint_mismatch, and nothing about the secret, placeholder or resolved value is logged. SPIFFE JWT-SVID backed dynamic token exchange and AWS STS role assumption (minting all three AWS credential variables atomically) are both supported for zero-static-secret flows.

Sandboxing runs on four compute drivers, Docker, Podman, Kubernetes and MicroVM, with a default image nvcr.io/nvidia/base/ubuntu:24.04. An agent can reach the internet only through the destinations its network policy allows, deny-by-default, with loopback, link-local, 0.0.0.0 and the cloud metadata address 169.254.169.254 blocked unconditionally, not overridable by any allowed_ips entry.

Policy is a YAML document (docs/how-it-works/policies/schema.mdx), capped at 4 MiB, covering filesystem, Landlock, process and network layers, locked at sandbox creation for filesystem and process, hot-reloadable for network. Every policy layer can run in audit mode (log but forward) or enforce mode (block), and audit is the shipped default, worth noting for anyone assuming a fresh install blocks by default. Before a proposed policy ships, the openshell-prover CLI can run an SMT-solver boundary check against a fixed boundary policy, covering exactly five domains (filesystem, network L4, network REST, process, Landlock), explicitly not GraphQL, MCP, WebSocket, JSON-RPC or audit-mode REST, and returning inconclusive past documented resource limits (over 1024 network rules or 4096 endpoints).

Cost has no equivalent here. I found no budget, spend cap or cost ledger concept anywhere in the docs I read (schema, provider profiles, gateway overview, sandbox overview, security best practices). This axis is absent, not merely thin.

## 6. What we should take from it

Narrow, things we could copy this month. Trust-on-first-use SHA256 binary pinning (docs/security/best-practices.mdx) is a small, concrete addition, hash the executable at first connection and deny later connections if the file on disk changes, cheap insurance against a swapped binary silently inheriting a capability grant. The two-independent-check model for credential release, network policy allows it and the credential binding separately matches the destination, is a narrower blast radius than a single combined check, and would fit into our identity proxy without a redesign. The non-overridable SSRF block list (loopback, link-local, 0.0.0.0, 169.254.169.254) is worth checking explicitly against our own Cilium policy, to confirm these are hard-coded rather than left to whoever writes the policy YAML. OCSF-native JSONL export is a plausible addition if we ever need to feed telemetry into an external SIEM, SigNoz today gives us traces, not a SIEM-shaped stream.

Broad, things that would change how we build. The SMT-solver boundary proof is the single most interesting idea here: a formal, machine-checked proof that a proposed policy change cannot exceed a fixed boundary, sitting in front of an auto-approval path, rather than a diff review by a model or a human. This would strengthen our own auto merge rule for normal-risk changes, today that rule trusts a policy gate and a stronger-model review, neither of which is a formal proof. The agent-facing policy.local API is a smaller but real UX idea, an agent reads its own denial list and files a structured proposal rather than a human transcribing a log line into YAML by hand, worth a small addition to factory-gateway regardless of whether we ever run OpenShell itself. The provider profile catalogue, reusable per-SaaS YAML definitions of credentials, discovery and endpoints, is a broader problem they solve that we currently ignore, our identity proxy is scoped to git and LLM calls, OpenShell treats arbitrary third-party SaaS credentials as first-class with a public, community-contributed profile registry, worth revisiting if agents ever need to reach more than git and an LLM.

## 7. Where our philosophy differs and what that costs or buys us

OpenShell has no task registry, no budgets, no verification pipeline and no merge or deploy step. It is a sandbox-plus-policy-plus-credential runtime, not a competing factory. Running it would only ever answer the worker-plane and identity or policy questions, it changes nothing about how we would build the other four planes, this is not a cost, we were never going to get those parts from it.

Its Kubernetes driver depends on an external CRD and controller, kubernetes-sigs/agent-sandbox, and the docs state plainly that Kubernetes accepts a NetworkPolicy object even when no CNI enforces it, docs/kubernetes/setup.mdx calls this out as a documented risk, not something I inferred. We already run Cilium, which does enforce NetworkPolicy, so the specific risk does not bite us, but adopting OpenShell's Kubernetes driver as-is would still add a second CRD dependency and a second place capability policy lives, its YAML next to our CiliumNetworkPolicy-in-Git model, unless we pick one as the single source of truth. That conflicts with our principle that policy is one document in Git.

Its default credential store is its own AES-256-GCM envelope database, a second secret-of-secrets next to our OpenBao standard, unless we use its vault-compatible credential driver, which I have not checked for OpenBao compatibility, that check is not verified in this session and should happen before any decision to depend on it.

Where their approach is clearly better and our constraint is the price: their formal SMT-solver boundary proof (the prover) is something we do not have and would need to build, our current gate is a policy check plus a stronger-model review, neither of which is a mathematical proof of a boundary. Building an equivalent would be real, non-trivial work, not a copy-paste.

## 8. Red flags and slop assessment

This is real and actively maintained, not a landing page. gh api repos/NVIDIA/OpenShell shows 9991 stars, 1376 forks, 465 open issues. A GraphQL query against the same repository shows 1558 commits, 99 releases and 147 mentionable users. Releases through August and September 2026 show a near-daily cadence. MAINTAINERS.md names 13 maintainers split between NVIDIA and Red Hat, and GOVERNANCE.md sets out a CNCF-style Contributor to Reviewer to Maintainer ladder with an explicit rule that AI agents or service accounts cannot become Maintainers. Two contributors dominate commit history per gh api repos/NVIDIA/OpenShell/contributors, one with 336 commits and one with 193, with a longer tail behind them.

Independent coverage is mostly positive and hands-on, not just announcement rewrites. Red Hat Developer (16 July 2026) reports first-hand testing of the network isolation, "in our testing, the secrets didn't leave the sandbox," while explicitly flagging that Landlock, seccomp and the network proxy all sit inside the kernel's own trust boundary, a kernel exploit still escapes all of it, and recommending the MicroVM driver or a TEE for that threat class. Tigera, the maker of Calico, frames OpenShell in a blog post as solving single-agent-on-a-single-machine security, explicitly not fleet-wide governance across many agents, a scoping point worth keeping in mind. Hacker News threads (news.ycombinator.com/item?id=47430524, 47430097 and 48479930, dated across March and June 2026 per the search summary, not independently fetched by me) show practitioner engagement, one commenter suggests copying OpenShell's placeholder-credential approach into their own project, another describes it as the one component they got real value from in an otherwise noisy space.

One named sceptic appears only in secondary press, not a source I fetched directly, an unnamed IDC analyst is quoted estimating OpenShell addresses "probably under a quarter" of enterprise agent security problems and that legal liability for agent break-ins remains unsettled. This claim is not verified against a primary IDC publication.

The 28 September 2026 launch bundles the free, Apache-2.0 OpenShell software with Sentry, a paid BlueField-4 DPU hardware watchdog sold separately. The software works without the hardware, but the coordinated launch signals NVIDIA's commercial interest sits in the hardware attach, worth watching for future feature gating between the open software and the paid hardware tier. The Kubernetes NetworkPolicy caveat above is a genuine, documented risk for careless adopters, not a marketing gap.

Not verified in this session: named enterprise adopters beyond NVIDIA's own partner list (an Anthropic Claude Managed Agents integration is announced), any pricing page (none exists, the software is free), and whether the agent-authored policy proposal feature (agent_policy_proposals_enabled, default off, called MVP in rfc/0002-agent-driven-policy-management/README.md) has moved past MVP as of the 28 September 2026 GA.

## 9. Sources

- https://github.com/NVIDIA/OpenShell (cloned --depth 1 to ~/repos/market-research-clones/nvidia-openshell)
- ~/repos/market-research-clones/nvidia-openshell/README.md
- ~/repos/market-research-clones/nvidia-openshell/MAINTAINERS.md
- ~/repos/market-research-clones/nvidia-openshell/GOVERNANCE.md
- ~/repos/market-research-clones/nvidia-openshell/rfc/0001-core-architecture/README.md
- ~/repos/market-research-clones/nvidia-openshell/rfc/0002-agent-driven-policy-management/README.md
- ~/repos/market-research-clones/nvidia-openshell/docs/how-it-works/policies/schema.mdx
- ~/repos/market-research-clones/nvidia-openshell/docs/how-it-works/policies/prover.mdx
- ~/repos/market-research-clones/nvidia-openshell/docs/how-it-works/policies/advisor.mdx
- ~/repos/market-research-clones/nvidia-openshell/docs/how-it-works/providers/overview.mdx
- ~/repos/market-research-clones/nvidia-openshell/docs/how-it-works/providers/profiles.mdx
- ~/repos/market-research-clones/nvidia-openshell/docs/how-it-works/sandboxes/overview.mdx
- ~/repos/market-research-clones/nvidia-openshell/docs/how-it-works/gateways/overview.mdx
- ~/repos/market-research-clones/nvidia-openshell/docs/security/best-practices.mdx
- ~/repos/market-research-clones/nvidia-openshell/docs/observability/ocsf-json-export.mdx
- ~/repos/market-research-clones/nvidia-openshell/docs/kubernetes/setup.mdx
- ~/repos/market-research-clones/nvidia-openshell/examples/codex-app-server/README.md
- ~/repos/market-research-clones/nvidia-openshell/deploy/helm/ (directory listing: openshell, openshell-workspace, test-split-ownership.sh)
- ~/repos/market-research-clones/nvidia-openshell/examples/ (directory listing, 18 examples)
- gh api repos/NVIDIA/OpenShell (2026-09-29)
- gh api repos/NVIDIA/OpenShell/contributors (2026-09-29)
- GitHub GraphQL API queries for history.totalCount, releases.totalCount, mentionableUsers.totalCount (2026-09-29)
- https://developers.redhat.com/articles/2026/07/16/layered-sandboxing-ai-agents-openshift-and-openshell (16 Jul 2026, via WebSearch summary)
- https://www.tigera.io/blog/nvidia-openshell-secures-the-agent-who-governs-the-fleet/ (via WebSearch summary, date not confirmed)
- https://rywalker.com/research/openshell (via WebSearch summary, date not confirmed)
- https://nvidianews.nvidia.com/news/open-agent-safety-platform (28 Sep 2026, via WebSearch summary)
- news.ycombinator.com/item?id=47430524, 47430097, 48479930 (Mar-Jun 2026 per WebSearch summary, not independently fetched)
- WebSearch: "NVIDIA OpenShell agent sandbox Landlock review" (2026-09-29)
- WebSearch: "OpenShell NVIDIA agent sandbox Hacker News" (2026-09-29)
