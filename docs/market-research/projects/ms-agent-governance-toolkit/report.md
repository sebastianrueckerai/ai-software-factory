---
name: Agent Governance Toolkit
slug: ms-agent-governance-toolkit
url: https://microsoft.github.io/agent-governance-toolkit/
repo: https://github.com/microsoft/agent-governance-toolkit
category: policy-identity
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted libraries only (pip, npm, NuGet, cargo, go get), embedded in the agent process, no hosted SaaS control plane, reference Azure/AWS/GCP and Kubernetes/Istio deployment guides are optional and explicitly marked untested
company: Microsoft, created as an MIT-licensed org repo on 2026-03-02, led by Microsoft engineer Imran Siddique with a named multi-org Technical Steering Committee (Microsoft, MythologIQ, Dayos, Robert Half Inc.)
maturity: 6,362 stars, 1,135 forks, 89 open issues, 160 contributors (100-contributor stats sample already sums to 3,976 commits), tags v1.0.0 to v5.0.0, latest published GitHub Release is v4.1.0 (2026-06-09) with no Release object yet for the v5.0.0 tag, last push 2026-09-29
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 1
  verification: 0
  policy_outside_model: 4
  identity_per_task: 2
  cost_control: 2
  ux: 2
  reseedable_selfhost: 3
steal:
  - "Action-bound approval protocol (ADR-0030): an action_digest is a SHA-256 hash of the RFC 8785 JCS canonical serialisation of the exact tool call, and it is re-verified immediately before execution, so an approval silently stops covering a call whose parameters changed after the human clicked approve. Worth copying into our own approval-gate schema."
  - "Reserved reason-code namespace: policy authors cannot emit a reason string starting with runtime_error:, so a genuine enforcement failure can never be spoofed as a policy verdict. A one-line convention worth adding to our gateway's decision schema."
  - "Named, numbered intervention points (agent_startup, input, pre_model_call, post_model_call, pre_tool_call, post_tool_call, output, agent_shutdown) give a clean shared vocabulary for documenting where a decision is made, even though we enforce at the network edge, not in-process."
  - "OpenTelemetry metric and event naming (acs_intervention_{allow,deny,warn,escalate,transform}_total counters, acs_intervention_duration_ms histogram, a fixed decision/annotator_dispatch/policy_evaluation/policy_failed event set with a documented never carries raw tool arguments contract) is a ready-made naming scheme for our gateway's own per-decision telemetry."
  - "docs/LIMITATIONS.md is a dated, versioned, first-class file listing each known gap with a plain-language example, today's mitigation and the roadmap fix, and it names external critiques by source. Our own Where we know we are weak section in 00-our-vision.md would read sharper in this format."
  - "The paired policy/lib/egress.rego and policy/cedar-lib/egress.cedar for the same rule, with the Cedar file's comments spelling out exactly what Cedar cannot express (no URL parser, no glob, no substring match) and how the host must pre-compute those into annotations, is a good reference for how to degrade gracefully if we ever add a second policy backend."
differs:
  - "AGT's own docs admit the policy engine and the agent share one process boundary, and that a bypass exists whenever code calls an unwrapped model or tool reference directly, so it recommends the operator add container isolation itself. That is the architectural opposite of policy lives outside the model: we assume the agent process is untrusted and cannot be relied on to invoke its own guard, and enforce at the gateway and the network instead. We would only ever use AGT as an in-process linting layer, never as the security boundary, without breaking our security without half measures constraint."
  - "Identity is agent-scoped and long-lived (a DID plus an Ed25519 keypair, SVID TTLs configurable up to hours) rather than task-scoped and freshly minted. The SPIFFE/SPIRE integration is documented as production behaviour but the code in agentmesh/identity/spiffe.py fabricates SVIDs locally with comments reading in production, this would request an SVID from the SPIRE server, and docs/LIMITATIONS.md separately admits AGT does not revoke credentials at task boundaries within a session. Copying this would reintroduce the identity belongs to the machine pattern we deliberately rejected."
  - "AGT is a horizontal guardrail library, not an orchestrator: it has no signals plane, no build or test verification plane, and no merge or deploy plane. It assumes a pipeline already exists and drops governance calls into it. Three of our five planes are simply not comparable to anything in this project."
ux_verdict: A pip install and two lines of code get a first policy decision fast, and a CLI (agt doctor, agt verify, agt red-team scan) and a Streamlit demo dashboard exist, but there is no first-party console for watching or intervening in a running multi-step agent task the way our kanban board does.
slop_verdict: Real and fast-moving, not a landing page (3,976 commits summed in the top-100 contributor stats alone, 6,362 stars, MIT-licensed, a named multi-org steering committee, 992-test conformance suite, an external red-team review and its own SOC 2 mapping), but one author holds 900 of those commits, dependabot holds 857 more, an account literally named claude has 160, the v5.0.0 tag has no published GitHub Release seven months in, and the project's own compliance docs and an external red-team report both confirm real gaps behind the marketing (partial PII redaction, an in-memory-only audit chain by default, admitted fail-open corners).
---

# Agent Governance Toolkit

## 1. What it is

Agent Governance Toolkit (AGT) is a Microsoft-led, MIT-licensed open source library that adds policy checks, identity, an approval step and a tamper-evident audit log to agent frameworks such as LangChain, AutoGen, Semantic Kernel and raw SDK calls. It ships as a family of packages (Python, npm, NuGet, Rust, Go), the largest being agent-mesh in Python, wrapped around a shared Rust policy engine called the Agent Control Specification (ACS). Microsoft's own framing, from the README, is that this is "governance for agentic AI, embedded where the agent runs" and the project maps itself explicitly against OWASP Agentic AI Top 10, NIST AI RMF, the EU AI Act and SOC 2. The README says it enforces policy "before Microsoft or any other vendor's model ever sees a tool call." What the code actually shows is narrower and more honest than the marketing: it is a library you import into your own agent process, it runs in that process's memory and under its identity, and several of its headline security claims (SPIFFE, execution rings) are specifications and simulations more than they are hardened infrastructure. docs/LIMITATIONS.md says so itself, at length.

It is governed by a Technical Steering Committee (CHARTER.md) that "actively seeks maintainers from multiple organisations to avoid single-vendor control," and MAINTAINERS.md lists people from Microsoft, MythologIQ, Dayos and Robert Half Inc. alongside the project lead. It is used, per its own docs and examples, as a compliance and guardrail layer bolted onto an existing agent stack, not as a replacement for one.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. AGT has no issue, alert or telemetry intake; it governs calls inside a process someone else already started. | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue. | not comparable |
| Control plane | A stateless, deterministic ACS runtime evaluates policy at 8 named intervention points; approval requests are meant to be persisted by a host-provided coordinator (ADR-0030) outside process memory, but the reference implementation itself is in-memory. No task registry, no scheduler. | factoryd with a Temporal workflow per task, Postgres task/approval/budget state, policy as a Git-reviewed YAML file applied by Flux. | we lead |
| Worker plane (sandbox) | None by default. AGT's own docs say policy engine and agent share a process boundary; it recommends the operator add container isolation. "Execution Rings" are a software privilege tier inside that shared process, not OS isolation. | One gVisor pod, one Kubernetes namespace and ServiceAccount per task, read-only root filesystem, default-deny egress. | we lead |
| Verification | None. AGT has its own CI and test suite for its own code (992+ conformance tests cited in policy-engine/README.md) but nothing that verifies an agent's output before merge; that is out of scope. | Forgejo Actions on gVisor runners, policy gates, a stronger-model review with a strict verdict before merge. | not comparable |
| Merge and deploy | None. | Bot-only merge after human approval or an auto rule, Flux GitOps deploy, staged rollout. | not comparable |
| Policy outside the model | Strong and explicit: Rego (OPA) or Cedar policies compiled from a signed manifest, evaluated in Rust, fail-closed by design (ADR-0004 bars LLM output from being an authoritative verdict). This is enforced in code, not prompts. | Capability rules as a Git-reviewed YAML document, enforced in factory-gateway code and Cilium network policy. | equal in intent, they lead on formal policy tooling, we lead on the enforcement boundary |
| Identity per task | A DID plus a long-lived Ed25519 keypair per agent, SVID TTL configurable but typically hours, no automatic credential revocation at task boundaries (docs/LIMITATIONS.md section 8, "Credential Persistence Gap"). SPIFFE/SPIRE integration is simulated in the OSS code, not wired to a real SPIRE server. | A projected, audience-scoped, kubelet-rotated ServiceAccount token minted fresh per task, verified against the cluster OIDC issuer, mapped to a task row. | we lead |
| Artifacts not chat | Not applicable in the same sense: AGT agents still talk to models and tools directly, AGT just intercepts and logs the calls; the policy manifest and audit chain are the artifacts. | TaskBrief in, branch/PR/event stream out; Git is the coordination mechanism. | not comparable |

## 3. Architecture and stack

The policy core, Agent Control Specification (ACS), is a Rust crate (now vendored externally as agent-control-spec, per policy-engine/README.md) that loads a signed manifest describing policy rules (type: rego, cedar, test or custom) and evaluates them at 8 named intervention points, returning one of allow, deny, warn, escalate or transform. Language SDKs (Python's agent-mesh, plus npm/NuGet/Go/Rust equivalents) wrap this core with framework adapters. The Python package tree under agent-governance-python/agent-mesh/src/agentmesh/ has separate submodules for identity/ (SPIFFE/DID simulation, spiffe.py), governance/ (approval.py, approval_webhook.py, audit.py, budget.py) and adapters for LangChain/AutoGen/Semantic Kernel.

Policy is written twice for the same rule where both backends are supported: policy-engine/policy/lib/egress.rego (OPA/Rego, package agt.egress, using glob.match and a host_of() helper against an allowlist) and policy-engine/policy/cedar-lib/egress.cedar (Cedar forbid rules keyed on resource.security_labels.contains(...)). The Cedar file's own comments explain that Cedar has no URL parser, glob or substring matching, so anything beyond exact-match must be pre-computed into annotations by the host before Cedar sees it, an explicit, documented limitation rather than a silent gap.

Storage is deliberately minimal and mostly in-process. Reading the class body of agentmesh/governance/budget.py's BudgetTracker (not just grepping for keywords) confirms it keeps a plain dict of agent id to usage record in memory, resets counters when a rolling time window expires, and has no database, cache or file backing. agentmesh/governance/audit.py's MerkleAuditChain computes a SHA-256 hash chain (ADR-0017) over AuditEntry records in memory unless the host wires up its own persistent sink. The audit design explicitly rules out external blockchain anchoring: "No protection against a complete chain replacement (requires external anchoring for that threat model)." Approval flow (ADR-0030) defines ActionBinding, PolicyDecision, ApprovalRequest, hash-chained ApprovalChainEntry and ApprovalResolution objects, with ConsoleApproval, CallbackApproval (300s default timeout) and a generic WebhookApproval (its own docstring says "Slack, Teams, PagerDuty, etc." with no native integration for any of them, just a webhook contract).

Deployment is "you import the library"; there is no service to run. policy-engine/docs/deploy-istio-reference.md and policy-engine/deploy/kubernetes/acs-sidecar-reference/README.md sketch an Istio-mesh reference architecture that would supply real SPIFFE/mTLS at the infrastructure layer, but both documents carry an explicit disclaimer that they are untested reference material, not CI-verified deployments.

## 4. UX

Onboarding is a package install (pip install agent-mesh or equivalent) plus wrapping an existing agent call, so "first decision" is minutes away, faster than standing up any part of our stack. Interfaces are developer-facing: a CLI (agt doctor, agt verify, agt red-team scan per README.md), an SDK, and, per the cost-governance example (examples/cost-governance/README.md), a Streamlit demo dashboard for budget state. There is no first-party console for watching a running multi-step agent task, no equivalent of our kanban board (queued/running/waiting-on-human/in-review), and no diff or trace view. Intervention happens through the approval channel a host wires up (console prompt, callback, or webhook to an existing chat tool), which is a workflow primitive, not a UI. Screenshots in the repo and docs site are limited to code snippets, badges and the Streamlit budget dashboard; there is no screenshot of a live-agent monitoring surface.

## 5. Security, identity, sandbox, policy, cost

Security boundary. Enforced in code, not prompts, for the policy decision itself (fail-closed by ADR-0004). But the enforcement point lives inside the agent's own process, and the project's own README and docs/LIMITATIONS.md say a bypass exists if code reaches a tool or model client that was never wrapped by AGT. Sandboxing is left to the operator; "Execution Rings" are an in-process privilege tier, not OS isolation.

Identity. A DID plus an Ed25519 keypair per agent, with an SVID-like structure for session-scoped claims. Read from agentmesh/identity/spiffe.py: issue_svid() builds the object locally and its own docstring says "In production, this would request an SVID from the SPIRE server," and validate_svid() checks only temporal validity, trust domain and local in-memory registration, not a cryptographic chain to a SPIRE bundle. Real SPIFFE/mTLS, if you want it, comes from an Istio sidecar in the untested reference deployment, not from AGT's own code.

Policy. OPA/Rego and Cedar are both supported for the same manifest schema, evaluated in the Rust ACS core against a documented intervention-point contract. Policies are files (.rego / .cedar) reviewed like any other code, not chat-configured.

Cost. BudgetTracker enforces per-agent token and dollar caps over a rolling time window (window strings like "1h") with an allowed-false decision when a projected call would exceed the limit. State is a plain in-memory dict, reset on process restart, not shared across replicas, with no ledger.

Approval. The ADR-0030 protocol binds an approval to a SHA-256 digest of the exact canonicalised action, and revalidates that digest immediately before execution, so a modified call invalidates a stale approval. Channel is whatever the host wires up: console, callback, or generic webhook; there are no native Slack/Teams/PagerDuty integrations, only a documented HTTP contract.

## 6. What we should take from it

Narrow (copy this month). The action-bound approval digest pattern (ADR-0030): hash the canonical serialisation of the exact operation before asking for approval, and re-check that hash immediately before execution, so a changed parameter always invalidates a stale approval. This would tighten our own approval-gate schema. Pair it with the reserved runtime_error: reason-code namespace, so our gateway's decision log can never have a real enforcement failure mistaken for, or spoofed as, a policy verdict. Also worth lifting verbatim: the OpenTelemetry metric names (acs_intervention_verdict_total counters, acs_intervention_duration_ms histogram) and the fixed, secrets-free telemetry event set, as a naming convention for our own gateway's per-decision metrics.

Broad (a problem they solve that we ignore). docs/LIMITATIONS.md is a standing, versioned, dated document that names each known gap in plain language, gives today's mitigation and the roadmap fix, and cites external critiques by name. Our own "Where we know we are weak or unfinished" section in 00-our-vision.md covers the same ground but far more tersely; giving it this format (one gap, one example, one mitigation, one roadmap line) would make it more useful both to us and to anyone auditing the project. Separately, the paired Rego/Cedar policy files for the same rule are a useful worked example if we ever want a second policy backend: they show exactly how to keep a simpler policy language honest about what it cannot express, by pushing the hard parts into pre-computed annotations.

## 7. Where our philosophy differs and what that costs or buys us

AGT's core design bet is that the policy engine and the agent can share a process boundary as long as the policy call itself is deterministic and fail-closed. Its own docs admit the corollary: anything that reaches an unwrapped tool or model reference bypasses governance entirely, so real isolation has to come from the operator wrapping the whole process in a container. Our principle, "policy lives outside the model," goes further: we do not trust the agent process to call its own guard correctly, so enforcement sits in factory-gateway and in Cilium network policy, outside the sandbox the agent runs in. Adopting AGT's in-process model as our security boundary would violate "security without half measures"; we would only use it, if at all, as a defense-in-depth developer-experience layer inside the sandbox, never as the thing standing between an agent and a capability.

The same trade shows up in identity. AGT's DID-and-long-lived-keypair model, plus a self-admitted "Credential Persistence Gap" where tokens are not revoked at task boundaries within a session, is the "identity belongs to the machine or session" pattern we deliberately rejected in favour of a fresh, audience-scoped, kubelet-rotated token per task. Where AGT's approach genuinely buys something we do not have is in its formal policy specification and dual-backend (Rego/Cedar) tooling with 992+ conformance tests: that is more rigorous policy-authoring infrastructure than our single YAML-file-in-Git approach, and it is a fair price to consider paying for, separate from the question of where enforcement physically sits.

## 8. Red flags and slop assessment

The project is real and active: 6,362 stars, 1,135 forks, 89 open issues, 160 contributors, and the 100-contributor stats sample alone sums to 3,976 commits, with a push as recent as today (2026-09-29). It has a named multi-org Technical Steering Committee (CHARTER.md, MAINTAINERS.md) rather than a single corporate owner, an MIT licence with no dual-licensing or open-core gating found anywhere in the repo, and its own SOC 2, OWASP and NIST compliance mapping documents.

But the commit graph is concentrated: one author (imran-siddique) holds 900 of the sampled commits, dependabot[bot] holds 857 more, and an account literally named claude holds 160, a visible sign of AI-agent-authored commits landing directly in a security-sensitive governance library. The v5.0.0 git tag exists with no corresponding GitHub Release published as of today; the latest published Release is v4.1.0 from 2026-06-09, a sign the release process is lagging the tags. The project's own docs/LIMITATIONS.md and docs/compliance/soc2-mapping.md admit real gaps behind the OWASP/NIST badges: only two built-in PII regex patterns (SSN, credit card), historically unredacted audit-log parameters (now partially mitigated for credential-like secrets only, per CredentialRedactor), and an audit chain that is in-memory unless a host wires up persistence. An independent red-team review (Periculo, cited in prior research for this report, not re-verified against current source) lists further bypass vectors including Unicode homoglyph evasion, token replay and an unauthenticated metrics endpoint. None of this reads as a landing page with no code behind it; it reads as a fast-moving, partly AI-assisted, single-vendor-led project that is candid about its own limitations, which is worth more than the badges.

## 9. Sources

https://github.com/microsoft/agent-governance-toolkit
https://microsoft.github.io/agent-governance-toolkit/
gh api repos/microsoft/agent-governance-toolkit
gh api repos/microsoft/agent-governance-toolkit/contributors --paginate
gh api repos/microsoft/agent-governance-toolkit/stats/contributors
gh api repos/microsoft/agent-governance-toolkit/tags
gh api repos/microsoft/agent-governance-toolkit/releases
WebSearch: "agent-governance-toolkit" microsoft review, red team, critique
Periculo red-team review of Agent Governance Toolkit (external, cited not re-verified)
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/README.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/MAINTAINERS.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/CHARTER.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/LICENSE
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/AGENTS.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/docs/LIMITATIONS.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/docs/adr/0017-merkle-chain-for-audit-tamper-evidence.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/docs/adr/0030-action-bound-approval-protocol.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/docs/compliance/soc2-mapping.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/policy-engine/README.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/policy-engine/policy/cedar-lib/egress.cedar
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/policy-engine/policy/lib/egress.rego
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/policy-engine/docs/deploy-istio-reference.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/policy-engine/deploy/kubernetes/acs-sidecar-reference/README.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/agent-governance-python/agent-mesh/docs/identity.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/agent-governance-python/agent-mesh/src/agentmesh/identity/spiffe.py
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/agent-governance-python/agent-mesh/src/agentmesh/governance/audit.py
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/agent-governance-python/agent-mesh/src/agentmesh/governance/approval.py
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/agent-governance-python/agent-mesh/src/agentmesh/governance/approval_webhook.py
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/agent-governance-python/agent-mesh/src/agentmesh/governance/budget.py
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/agent-governance-python/agent-runtime/README.md
/home/womb/repos/market-research-clones/ms-agent-governance-toolkit/examples/cost-governance/README.md
