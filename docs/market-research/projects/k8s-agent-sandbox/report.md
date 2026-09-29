---
name: Kubernetes SIG agent-sandbox
slug: k8s-agent-sandbox
url: https://agent-sandbox.sigs.k8s.io
repo: https://github.com/kubernetes-sigs/agent-sandbox
category: sandbox-runtime
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted, any Kubernetes cluster; GKE ships a managed superset (Pod Snapshot, Autopilot support)
company: Kubernetes SIG Apps subproject, no vendor ownership; contributor base and OWNERS file dominated by Google engineers (Janet Kuo, Justin Santa Barbara, Marlon Gamez, Barney Stratford); launched at KubeCon NA, Atlanta, November 2025
maturity: 4082 stars, 536 forks, 196 open issues, created 2025-08-12, last push 2026-09-29 (today), release cadence roughly weekly (v1.0.0 2026-08-28 through v1.0.4 2026-09-24, five releases in under a month)
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 4
  verification: 0
  policy_outside_model: 4
  identity_per_task: 2
  cost_control: 0
  ux: 3
  reseedable_selfhost: 4
steal:
  - "The SandboxTemplate/SandboxWarmPool/SandboxClaim split: a template is the security-reviewed blueprint, a warm pool pre-provisions N idle pods against it, and a claim atomically checks one out (or cold-starts if the pool is empty). This replaces our per-task hand-built pod spec with a three-object chain a platform team can review once and reuse; the claim is the only object a task-spawning caller touches."
  - "Managed NetworkPolicy at the template level, not per pod: one shared NetworkPolicy object covers every sandbox from a template, with a secure default (ingress from the router only, egress to the public internet minus RFC1918 and the cloud metadata address) that a template author can override once. Cheaper to audit than a policy generated per task."
  - "The ValidatingAdmissionPolicy in examples/policy/vap/secure-sandbox-policy.yaml: seven CEL expressions rejecting any Sandbox that lacks runtimeClassName: gvisor, sets hostNetwork, mounts a service account token, runs privileged, keeps a capability, skips resource limits, or runs as root. This is policy enforced by the API server itself, before the controller ever sees the object; worth lifting directly as a template for our own admission gate on task pod specs."
  - "System-reserved label/annotation protection (agents.x-k8s.io/* is stripped from user-supplied pod template metadata on both create and adopt): closes a concrete cross-tenant traffic-hijack bug class (spoofing the Service-selector label to steal another sandbox's traffic) that a naive metadata-passthrough implementation would have. Worth checking our own namespace/pod metadata propagation code for the same hole."
  - "Ed25519 scoped bearer tokens (sandbox-router/authz/scopedtoken_v2.go): a token signed over namespace, sandbox name, sandbox UID, port, method, path and expiry, unforgeable without the private key, and useless for anything but the one call it names. A cleaner shape than a broad per-task bearer token for any narrow, short-lived, single-purpose credential we hand to a task (e.g. a one-shot callback token to the gateway)."
  - "Suspend/resume via spec.operatingMode with PVC-backed state (pod deleted, PVC retained, identical pod recreated on resume): a generic, cluster-agnostic hibernate primitive that does not need GKE-specific memory snapshotting to be useful for cost control on idle long-running sandboxes."
differs:
  - "The controller deliberately implements zero isolation itself: it is a thin, declarative passthrough of runtimeClassName onto a PodTemplate. All the actual hard work (gVisor, Kata) is exactly the RuntimeClass mechanism we already hand-configure; adopting this project would not change our isolation posture, only how the pod spec around it gets assembled and templated."
  - "No task or job model at all: a Sandbox/Claim is a long-lived-until-claimed environment, not a unit of work with a lifecycle, retries, or an audit trail. Everything in our control plane (task state, scheduler, policy engine, approvals, cost ledger) would have to be built on top, unchanged in shape, with this project supplying only the pod underneath it."
  - "No automatic per-task identity: SandboxTemplate defaults automountServiceAccountToken to false (deny by default), but there is no mechanism to mint or bind a distinct ServiceAccount per claim. examples/sandbox-ksa/README.md shows this wired by hand, and roadmap.md lists dynamic per-claim identity association as Planned, not built. Our factoryd's automatic namespace+ServiceAccount-per-task is currently ahead of this project on the one axis the hint asked about most directly."
ux_verdict: A working sandbox is close in Python (pip install, SandboxClient, create_sandbox, commands.run) once a cluster, CRDs, and a WarmPool already exist, but that prerequisite setup is kubectl/YAML work with no UI; a dashboard is a roadmap item, not shipped.
slop_verdict: Real and actively used, not a landing page; weekly releases, a working GKE production consumer (GKE Agent Sandbox GA May 2026, Google states 16x sandbox growth and named adopters LangChain and Lovable), a formal KEP process, and a threat-model doc that names its own unfixed gaps rather than hiding them.
---

# Kubernetes SIG agent-sandbox

## 1. What it is

agent-sandbox is a Kubernetes SIG Apps subproject: a set of CRDs (Sandbox, SandboxTemplate, SandboxWarmPool, SandboxClaim) and controllers that turn "give me one isolated, stateful, disposable pod" into a declarative Kubernetes object instead of a hand-assembled pod spec. It targets exactly the problem framed in the task hint: one isolated sandbox per agent session, with warm pools for fast start and a router/SDK layer for a client to reach the pod once it exists. The maintainers describe the desired characteristics as singleton (one identity, one pod, unlike a Deployment), stateful (a stable name and, optionally, a PVC that survives pod recreation), and disposable (cheap to create and destroy in bulk). It ships Go, Python, and (in progress) TypeScript client SDKs, and a PyPI package, k8s-agent-sandbox.

It is not a company product. It is hosted under kubernetes-sigs, governed by the standard Kubernetes CLA/OWNERS/KEP process, and its OWNERS file lists Google engineers (janetkuo, justinsb, soltysh, barney-s) as approvers. Google Cloud separately sells "GKE Agent Sandbox," announced on the Google Open Source Blog in November 2025 and reaching GA on GKE on 2026-05-20, with Google stating a 16x growth in sandbox count in the following five months and naming LangChain and Lovable as adopters. The README and roadmap describe the OSS project and the GKE product as closely related (shared authors, synchronized examples under examples/*gke*, a GKE-only gke_extensions Python module for Pod Snapshot), but no primary source read here states explicitly that GKE Agent Sandbox's control plane runs this exact OSS controller code; treat that specific claim as strongly correlated, not verified.

What the maintainers claim: a Kubernetes-native, portable standard for agent sandboxing, usable on any cluster, isolation-runtime-agnostic. What the repository shows: a real, fast-moving, tested controller (300 sandboxes/second claimed under a roadmap "Completed" item) that does what it says for the pod-lifecycle problem, with several adjacent features (automatic per-claim identity, attach-network-policy-at-claim-time, a first-class router, a UI) explicitly still on the roadmap rather than built.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals (issues, telemetry, alerts) | Nothing. No intake, no issue or alert model. | factoryd consumes issues/telemetry/alerts as work sources. | Not comparable |
| Control plane (task state, scheduler, policy, approvals, cost) | A SandboxClaim is a transactional request against a warm pool, tracked in etcd with conditions and a shutdownTime/TTL; no task concept, no approvals, no cost ledger. | factoryd holds durable task state, scheduling, policy, approvals, model choice, cost and audit. | We lead |
| Worker plane (sandbox) | This is the project's whole scope: Sandbox/SandboxTemplate/SandboxWarmPool manage one pod per claim, RuntimeClass-pluggable isolation, managed NetworkPolicy, suspend/resume. | factoryd hand-creates one namespace, one ServiceAccount, and one gVisor pod per task. | They lead |
| Verification (tests, security review, policy eval before merge) | None. Out of scope; a sandbox is an environment, not a pipeline. | Our verification plane runs tests, security scans, and stronger-model review before merge. | Not comparable |
| Merge and deploy | None. | Ours exists as a plane. | Not comparable |
| Policy outside the model | NetworkPolicy generated and owned by the controller (not the tenant), a ValidatingAdmissionPolicy example enforcing gVisor/non-root/no-capabilities/resource-limits at admission time, system-label protection against spoofing. All enforced in Kubernetes objects and CEL, never in a prompt. | Cilium default-deny egress allowlist, OIDC-verified projected tokens, policy.yaml in Git, enforced in factory-gateway and admission. | Equal, different layer |
| Identity per task | automountServiceAccountToken defaults to false; no automatic per-claim ServiceAccount or workload-identity binding exists yet (roadmap: Planned). Ed25519 scoped tokens exist for router-to-sandbox routing, not for a sandbox's own outbound identity. | factoryd auto-creates a namespace and a task-<id> ServiceAccount per task, verified via the cluster OIDC issuer on projected tokens. | We lead |
| Artifacts not chat | N/A; a client talks to a sandbox over exec/files/process APIs (sandboxd), not chat. Agents exchange file writes and command output through the SDK, which is artifact-shaped, not conversational. | Same intent in our design. | Equal |

## 3. Architecture and stack

Go controllers (controller-runtime/kubebuilder pattern) reconcile four CRD groups: api/v1beta1 (core Sandbox) and extensions/api/v1beta1 (SandboxTemplate, SandboxWarmPool, SandboxClaim), read in full at api/v1beta1/sandbox_types.go, extensions/api/v1beta1/sandboxtemplate_types.go, extensions/api/v1beta1/sandboxwarmpool_types.go, extensions/api/v1beta1/sandboxclaim_types.go. A Sandbox wraps a SandboxBlueprint (a PodTemplate plus a Service toggle); spec.operatingMode is Running or Suspended, and Ready/Suspended/PodScheduled conditions report observed state separately from desired state, modelled explicitly on Gateway API condition conventions. A SandboxTemplate adds NetworkPolicySpec and a NetworkPolicyManagement enum (Managed default, Unmanaged to hand control to something like Cilium). A SandboxWarmPool has a /scale subresource (HPA-compatible) and an UpdateStrategy (OnReplenish leaves stale unclaimed pods until claimed or deleted; Recreate replaces them immediately). A SandboxClaim references a warm pool, carries its own Lifecycle (shutdownTime, ttlSecondsAfterFinished, shutdownPolicy of Delete/DeleteForeground/Retain), and can force a cold start by setting env or volumeClaimTemplates the warm pool couldn't have pre-baked.

Isolation is a pure runtimeClassName field on the pod template; the controller implements none of it. docs/security/threat_model.md states this outright: "Agent Sandbox itself does not implement isolation but supports configuring these runtimes." examples/openclaw-gvisor-sandbox/README.md shows gVisor via runtimeClassName: gvisor plus a hardened securityContext; examples/kata-gke-sandbox/README.md shows Kata via runtimeClassName: kata-qemu with GKE-specific node-pool and machine-type prerequisites (Intel N2, Ubuntu image). Networking: a Managed SandboxTemplate produces one shared, controller-owned NetworkPolicy for every sandbox from that template (ingress from the router only, egress to the public internet minus RFC1918 and the metadata address); this is plain Kubernetes NetworkPolicy (IP/CIDR-only). examples/demo-cilium-egress/README.md is a separate, Unmanaged-mode worked example showing identity-based, FQDN-level egress allowlisting with real CiliumNetworkPolicy toFQDNs rules on GKE Standard (not Autopilot, because Autopilot only exposes a wrapper, not raw Cilium policy); it notes Cilium keys off a pod label it calls demo.identity, not the ServiceAccount.

Connectivity runs through sandbox-router (Go, an HTTP reverse proxy keyed on the X-Sandbox-ID header, routing to <id>.<namespace>.svc.<cluster-domain>), with a pluggable Authorizer interface (sandbox-router/authz/authorizer.go): the shipped default is AllowAll (documented in the threat model as an accepted gap, "for Python client compatibility"), a TokenReviewAuthorizer (tokenreview.go) validates a Kubernetes bearer token via the TokenReview API but does not yet check per-sandbox ownership, and a v2 Ed25519 scoped-token mechanism (scopedtoken_v2.go) mints tokens bound to one namespace/sandbox/UID/port/method/path/expiry tuple. Inside the pod, packages/sandboxd (KEP-539.2) is the newer in-pod daemon: gRPC ProcessService on :9090 for streaming exec, REST FilesystemService on :8080 for file read/write; USER_GUIDE.md notes the router currently can't proxy the gRPC service because it disables HTTP/2 upstream. The Go SDK's default ServerPort is 8888 (clients/go/sandbox/options.go), a different, older "legacy runtime" HTTP surface the Go and Python SDKs' run/read/write convenience methods target; this is a live split between an older runtime image family and the newer sandboxd, not something I could find documented as resolved.

Suspend/resume is PVC-based and generic: spec.operatingMode = Suspended terminates the pod, keeps the PVC, and a resume recreates an identical pod that reattaches it (roadmap: "Suspend/Resume (PVC-based): Completed"). A distinct, GKE-only "Pod Snapshot" feature (clients/python/.../gke_extensions/snapshots/README.md, examples/podsnapshot-golden-warmpool/README.md) is memory-and-filesystem-level, keyed to the GKE Pod Snapshot controller and PodSnapshotStorageConfig/PodSnapshotManualTrigger CRDs backed by a GCS bucket; it lets a whole warm pool boot pre-restored from one "golden" primer sandbox's live memory state. This is a materially stronger and materially more GKE-locked feature than the generic PVC suspend/resume, and the two should not be conflated. Deployment is kubectl apply -f a release manifest (sandbox-with-extensions.yaml) or pinned version tags; a helm/ directory exists in the repo alongside the raw manifests (not inspected past its existence).

## 4. UX

Starting point is CLI and SDK, not a UI. examples/quickstart/README.md and examples/python-sdk-quickstart/README.md walk: install CRDs and controller (kubectl apply), apply a SandboxTemplate and SandboxWarmPool, pip install k8s-agent-sandbox, then in Python: client = SandboxClient(), sandbox = client.create_sandbox(warmpool=..., namespace=...), sandbox.commands.run(...), sandbox.files.write(...). Default connectivity mode is a kubectl port-forward tunnel, which needs a working kubeconfig and cluster access on the machine running the SDK; in-cluster, port-forward, and direct-URL modes are also supported. Counting from an empty cluster to a first executed command: apply CRDs/controller (1), apply a template (2), apply a warm pool (3), pip install (4), four lines of Python (5) - five steps, all YAML/CLI/code, none of it a web flow.

There is no shipped web console. roadmap.md lists "UI Support in OSS" under Documentation/UI as "Planned," explicitly not done. Observability is OpenTelemetry tracing on the runtime APIs (roadmap: "Completed") and Prometheus counters (roadmap: "Planned" for more granular ones); a user watches sandbox state via kubectl get sandboxclaim printer columns (Ready, Sandbox, Reason, Age) or a metrics/tracing backend they wire up themselves, not a built-in dashboard. Intervention is Kubernetes-native: delete a claim, patch operatingMode to suspend, or change replica counts on a warm pool; there is no approval-gate or human-in-the-loop primitive at all, because there is no task concept to gate. Against a console meant to let a person watch and steer running agent tasks, this project gives a platform engineer clean primitives to build one on, not a finished one.

## 5. Security, identity, sandbox, policy, cost

Isolation is enforced by RuntimeClass (gVisor/Kata), not by this project's code; its contribution is making that configuration declarative and template-reusable rather than hand-assembled per pod, plus the ValidatingAdmissionPolicy example (examples/policy/vap/secure-sandbox-policy.yaml) that rejects any Sandbox lacking runtimeClassName: gvisor, disallowing hostNetwork, requiring automountServiceAccountToken: false, banning privileged containers, requiring capabilities.drop: [ALL], requiring CPU/memory limits, and requiring runAsNonRoot: true - seven concrete CEL checks enforced by the API server before the controller ever runs.

Identity: a sandbox pod gets no Kubernetes API credential by default (automountServiceAccountToken defaults false when a template omits it), a correct default-deny, but there is no mechanism to mint or bind a distinct, scoped ServiceAccount or workload identity per claim automatically. examples/sandbox-ksa/README.md documents wiring a specific ServiceAccount to a sandbox by hand (create namespace, create SA, reference it in the template); roadmap.md's "Sandbox / Pod Identity Association" item ("Planned," Networking/Storage/Tenancy section) states the gap directly: dynamic per-claim identity allocation "based on the user/system making the SandboxClaim" does not exist yet. This is the one place factoryd's current hand-rolled per-task namespace-plus-ServiceAccount automation is ahead of what this project ships today.

Network egress: the Managed default policy blocks RFC1918 ranges and the cloud metadata address and otherwise allows the open internet, a coarser default than our own Cilium allowlist restricted to named destinations (gateway, Forgejo, module proxy, storage bucket). Getting to our tighter posture on this project means either writing a custom NetworkPolicySpec per template (still IP/CIDR-only in core, no FQDN matching) or switching to Unmanaged and installing Cilium CiliumNetworkPolicy with toFQDNs ourselves, which examples/demo-cilium-egress/README.md proves works but is not built in, requires GKE Standard (not Autopilot) or an equivalent self-managed Cilium install, and is presented as a demo, not a supported feature.

Router-level auth is the most honestly documented weak spot: the shipped default Authorizer is AllowAll; docs/security/threat_model.md states this outright and calls the router's IP-class check (rejecting 169.254.169.254-style targets) "currently the only SSRF defense" under that default, recommending operators configure TokenReviewAuthorizer or the Ed25519 scoped-token authorizer themselves. The threat model also documents, and the code fixes, a real cross-tenant bug class: a tenant setting the reserved agents.x-k8s.io/sandbox-name-hash label on their own pod template to hijack another tenant's Service-routed traffic; the controller strips agents.x-k8s.io/* and extensions.agents.x-k8s.io/* keys from user-supplied metadata on both the create and adopt paths. Cost control does not exist in this project's scope: no spend cap, no budget ledger, no per-task cost accounting; warm-pool-plus-HPA and cold-standby-node integration reduce idle infrastructure cost, a different concern from bounding what a task can spend.

## 6. What we should take from it

Narrow, copy this month: the ValidatingAdmissionPolicy in examples/policy/vap/secure-sandbox-policy.yaml is a ready-made template for hardening our own task-pod admission (gVisor-required, non-root, capabilities-dropped, resource-limited, no hostNetwork, no automounted token); seven CEL rules we could adapt directly rather than re-derive. The system-reserved-label-stripping pattern is a one-function fix worth checking our own pod/namespace metadata propagation code against, since the failure mode (a task spoofing a routing label to hijack another task's traffic) is generic to any controller that copies user metadata onto a controller-managed object. The Ed25519 scoped-token shape (namespace, name, UID, port, method, path, exp, signed and base64url-joined) is a clean, small pattern for any single-purpose, short-TTL credential we hand a task, such as a one-shot callback token to factory-gateway, and is simpler than standing up full OIDC for narrow cases.

Broad, shape not code: the SandboxTemplate to SandboxWarmPool to SandboxClaim three-object split is a genuinely better shape than one hand-assembled pod spec per task, because it separates "what a sandbox looks like and what it's allowed to do" (reviewed once, by a platform engineer) from "how many idle ones we keep warm" (an ops/cost knob) from "give me one now" (the only object the task-spawning path touches). If factoryd's per-task pod creation ever needs multiple task profiles (different tool sets, different base images) this split is worth copying even without adopting the CRDs themselves. The project's own published threat model, naming the AllowAll default, the router's missing connection limits, and the exact cross-tenant label-spoofing scenario it had to patch, is a documentation habit worth adopting for our own sandbox design docs; naming unfixed gaps is cheap and raises trust more than implying a design is airtight.

## 7. Where our philosophy differs and what that costs or buys us

The most direct cost: adopting this project's warm-pool/claim model as our task-sandbox layer would not close our per-task-identity gap, because this project doesn't have an answer to it yet. We would still need to build automatic per-claim ServiceAccount minting ourselves, or wait for the "Planned" roadmap item and accept it lands on their timeline, not ours. Our current hand-rolled approach is worse ergonomically (one-off pod construction in Go, no warm pool, no templating) but is not behind on this specific axis.

The most direct buy: taking on SandboxTemplate/SandboxWarmPool would hand us HPA-scalable pre-warmed pods and a documented, community-reviewed default-deny NetworkPolicy and admission-policy pattern, from a project that is Apache-2.0, moves in the open with a KEP process, and is not gated behind an enterprise tier, consistent with the "open source where possible, best-of-breed over obscure" constraint. The cost of taking it on whole is scope creep in the other direction: it brings no task state, no scheduler, no approvals, and no cost ledger, so it would sit purely inside our worker plane and every control-plane concern stays entirely ours to build, same as today.

Where our constraint bites hardest: the strongest network-isolation story this project can point to (identity-based FQDN egress allowlisting via Cilium toFQDNs) is demonstrated only on GKE Standard with a self-managed Cilium install, explicitly because GKE Autopilot and Dataplane V2 don't expose raw Cilium policy. Our own "cheap commodity hardware, no vendor-specific services" constraint means we would be doing exactly the same Cilium toFQDNs setup ourselves on Hetzner/Talos rather than inheriting it from this project's examples, which are GKE-flavoured throughout (kata-gke-sandbox, demo-cilium-egress, the whole gke_extensions module).

## 8. Red flags and slop assessment

No licence games: Apache-2.0 throughout, hosted under kubernetes-sigs, no dual-licensing or enterprise gate visible in the repository. No incidents found in a targeted CVE search beyond ordinary dependency hygiene: a September 2026 PR bumping gRPC, the OpenTelemetry SDK, and the Go toolchain to close CVE-2026-33186, CVE-2026-39883, and several Go stdlib CVEs, already fixed on main; nothing project-specific found assigned against the controller, router, or sandboxd code itself. Maintenance signal is strong: five releases in the last month (v1.0.0 through v1.0.4), a last push timestamped today, 196 open issues against 4082 stars (an active, not abandoned, issue queue), and a roadmap document dated to 2026 with explicit In Progress/Planned/Completed states rather than aspirational-only prose.

The one place marketing outruns the shipped OSS code is the GKE/OSS relationship: Google's own blog posts and the "16x growth," "millions of agents" language describe the managed GKE product, and while the OSS repository and the GKE product share authors, timing, and example manifests, no source read for this report states plainly that GKE Agent Sandbox's control plane is this OSS controller's code running managed. A second, smaller flag: the default router Authorizer is AllowAll, which the project's own threat model names as a real, currently unmitigated-beyond-IP-class gap rather than something discovered independently, a maturity signal in how it is disclosed, but still a gap a self-hoster must close before this is safe multi-tenant infrastructure.

## 9. Sources

https://github.com/kubernetes-sigs/agent-sandbox (cloned --depth 1 to /home/womb/repos/market-research-clones/k8s-agent-sandbox)
https://agent-sandbox.sigs.k8s.io
README.md
roadmap.md
CONTRIBUTING.md
SECURITY.md
OWNERS
docs/keps/README.md
docs/security/threat_model.md
api/v1beta1/sandbox_types.go
extensions/api/v1beta1/sandboxclaim_types.go
extensions/api/v1beta1/sandboxwarmpool_types.go
extensions/api/v1beta1/sandboxtemplate_types.go
sandbox-router/authz/authorizer.go
sandbox-router/authz/tokenreview.go
sandbox-router/authz/scopedtoken_v2.go
examples/kata-gke-sandbox/README.md
examples/openclaw-gvisor-sandbox/README.md
examples/sandbox-ksa/README.md
examples/demo-cilium-egress/README.md
examples/policy/vap/secure-sandbox-policy.yaml
examples/quickstart/README.md
examples/python-sdk-quickstart/README.md
examples/podsnapshot-golden-warmpool/README.md
clients/go/README.md
clients/go/sandbox/options.go
clients/go/sandbox/connector.go
packages/sandboxd/USER_GUIDE.md
clients/python/agentic-sandbox-client/k8s_agent_sandbox/gke_extensions/snapshots/README.md
gh api repos/kubernetes-sigs/agent-sandbox (stars, forks, open issues, created/pushed dates, licence, archived status; fetched 2026-09-29)
gh api repos/kubernetes-sigs/agent-sandbox/releases (release tags and dates; fetched 2026-09-29)
WebSearch: kubernetes-sigs agent-sandbox CVE security vulnerability (fetched 2026-09-29)
WebSearch: agent-sandbox kubernetes KubeCon talk sig-apps adopters (fetched 2026-09-29)
https://opensource.googleblog.com/2025/11/unleashing-autonomous-ai-agents-why-kubernetes-needs-a-new-standard-for-agent-execution.html
https://kubernetes.io/blog/2026/03/20/running-agents-on-kubernetes-with-agent-sandbox
https://kubernetes.io/blog/2026/09/22/sig-apps-spotlight/
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/01-report-template.md
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/projects/openhands/report.md
