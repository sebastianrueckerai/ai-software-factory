---
name: CubeSandbox
slug: cubesandbox
url: https://cubesandbox.com
repo: https://github.com/TencentCloud/CubeSandbox
category: sandbox-runtime
license: "mixed: Apache-2.0 (primary) with vendored BSD-2-Clause (cilium/bpf) and BSD-3-Clause (hypervisor/, a Cloud Hypervisor rust-vmm fork)"
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, no SaaS or managed tier, marketed as a free replacement for E2B cloud hosting
company: Tencent Cloud (Tencent Holdings), Shenzhen. Internal Tencent Cloud open-source project, not a separately funded startup. First public commit 2026-04-10
maturity: 12.7k stars, 1166 forks, 100+ contributors (57 credited in the v0.7.0 release alone), first commit 2026-04-10, last commit 2026-09-28, 30 releases in under six months, roughly biweekly cadence (v0.7.2 on 2026-09-24)
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 5
  verification: 0
  policy_outside_model: 4
  identity_per_task: 2
  cost_control: 0
  ux: 4
  reseedable_selfhost: 3
steal:
  - "PVM: install a replacement host kernel (Tencent's OpenCloudOS-Kernel fork) on an ordinary cloud VM to get a real /dev/kvm without the cloud provider exposing VT-x/AMD-V, directly unblocking microVMs needing bare metal"
  - "CubeEgress design: TPROXY interception, per-SNI MITM with a proxy-held root CA, a small Match/Action/Inject policy language, and transparent credential injection so the sandbox never holds the real third-party API key"
  - "cubecow: XFS reflink (FICLONE) copy-on-write engine for instant, storage-cheap per-sandbox rootfs forks instead of copying a whole template image"
  - "CONTRIBUTING.md's AI-Generated Code Policy (AI agents must not add their own Signed-off-by, a human reviews and certifies DCO) is worth copying verbatim"
  - "Dashboard hardening pattern: public JWT API plus an admin API bound to localhost/Docker-bridge only, 15-minute access tokens and 7-day refresh tokens with separate typ/aud claims"
  - "The two harness-integration examples (Claude Code PreToolUse hook, OpenCode tool.execute.before hook) show a lighter sandboxing granularity: redirect only the Bash tool call into a microVM, leave Read/Write/Edit on the host"
differs:
  - "Their strongest isolation tier needs either bare metal or a Tencent-published host kernel fork (PVM, x86_64 only, validated mainly on Tencent's own infrastructure), a bigger and less reversible operational commitment than gVisor's stock-kernel model, which is exactly why we chose gVisor"
  - "It has no durable task state, budgets, approvals or verification, it is a stateless execution primitive driven synchronously by an external caller, so adopting it replaces one plane's implementation, never the orchestration around it"
  - "Its egress control is a full TLS-terminating MITM with a proxy-trusted root CA in every sandbox, more powerful than our gateway-mediated per-call proxying but a materially bigger trust surface, the proxy itself sees plaintext traffic to every allowed domain"
ux_verdict: "A more polished single-purpose UX than our console for its own narrow job (live sandbox list, template catalog, streaming logs, command palette), but it manages microVMs, not coding tasks, so nothing here replaces our missing task kanban, diff view or approval flow"
slop_verdict: "Real and active (1000+ commits, 100+ contributors, biweekly releases, a named production adopter in MiniMax), but several performance numbers are self-reported or uncited and Kubernetes support is an explicit preview untested against Cilium, our own CNI"
---

# CubeSandbox

## 1. What it is

CubeSandbox is Tencent Cloud's open-source microVM sandbox runtime for AI agents. It is built and published by the Tencent Cloud team as a self-hosted, API-compatible replacement for the E2B cloud sandbox service. The pitch, stated plainly in the README and docs, is to run the same E2B SDK code (from e2b_code_interpreter import Sandbox) against a self-hosted cluster instead of E2B's paid cloud, with hardware-VM isolation per sandbox, sub-60ms creation, and a built-in egress gateway. It targets teams running agent code execution, sandboxed shell tools, or agentic reinforcement-learning training at volume who want E2B's API shape without E2B's bill or multi-tenant trust model.

The repository is substantial and active: 12.7k GitHub stars, 1166 forks, over 1000 commits and 100+ contributors since the first commit on 2026-04-10, with releases roughly every two weeks (most recently v0.7.2 on 2026-09-24). Tencent names one external production adopter in public material found by search, MiniMax, for large-scale agentic reinforcement-learning training across heterogeneous environments, plus unspecified internal Tencent workloads, under a "Cube 100 Program" that reads more as an outreach incentive than evidence of a broad existing customer base. There is no pricing page and no hosted tier. cubesandbox.com is a documentation and pitch site, not a SaaS signup page.

What the makers claim: E2B API compatible, KVM-grade isolation, under 60ms sandbox creation, under 5MB memory per idle instance, instant copy-on-write snapshots, and, per one uncited Medium post found in search, "up to 95.8%" resource savings versus running full VMs. What the repository actually shows: a real, componentised, multi-language system (Rust, Go, Lua) built on a modified Cloud Hypervisor, with working E2B-compatible REST endpoints, a functioning eBPF network dataplane, and an OpenResty-based egress proxy, all independently readable in the source. The headline numbers themselves are self-reported. Independent commentary on the original Show HN thread flagged that E2B's own hosted p50 startup time had already improved to about 78ms by January 2026, narrowing the gap CubeSandbox advertises, and the sub-5MB memory figure depends heavily on how stripped the guest OS image is.

## 2. Mapping to our five planes

| Plane / principle | What CubeSandbox does | What we do | Verdict |
|---|---|---|---|
| Signals | None. A sandbox exists only in response to a synchronous SDK or API call from an external caller. No issue, webhook or telemetry intake of its own | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | CubeMaster: a stateless Go orchestrator over Redis (optionally MySQL or Postgres) that schedules sandbox placement across Cubelet nodes. No task workflow, no approvals, no cost ledger | factoryd with a Temporal workflow per task, Postgres, policy as YAML in Git, budgets, approvals | not comparable, different problem (VM fleet scheduling, not task lifecycle) |
| Worker plane / sandbox isolation | CubeShim (containerd shim v2) launches a forked Cloud Hypervisor microVM per sandbox, XFS-reflink copy-on-write rootfs, a per-sandbox eBPF network namespace, warm starts from snapshot templates | gVisor-on-systrap pod per task, read-only root filesystem, default-deny egress via a gateway allow-list | they lead |
| Verification | None | Forgejo Actions on gVisor runners, policy gates, a stronger-model review | not comparable |
| Merge and deploy | None | Bot merge after approval, Flux GitOps rollout | not comparable |
| Policy outside the model | CubeEgress enforces domain allow/deny and injects credentials at the network layer (eBPF plus a Lua MITM proxy), independent of anything the sandboxed process decides to do | Capability policy as YAML in Git, enforced by factory-gateway and Cilium network policy | equal, same principle at a different layer |
| Identity per task | The sandbox itself never holds the real third-party API key for an allow-listed domain, CubeEgress injects it at the proxy. But the control API itself uses one static key or an optional external auth callback, not a short-lived per-sandbox workload identity | A projected, audience-scoped ServiceAccount token per task, verified against the cluster OIDC issuer, mapped to the task row, plus per-task LiteLLM virtual keys | mixed, we lead on control-plane identity, they lead narrowly on third-party egress credential handling |
| Artifacts not chat | Not applicable, it is a stateless execution primitive with no concept of exchanging artifacts | Git branch, PR and TaskBrief exchange | not comparable |

## 3. Architecture and stack

A layered, multi-language microVM stack, not a monolith: a Rust and Axum API gateway, a Go control plane, a Rust containerd shim wrapping a forked Cloud Hypervisor VMM, Go and eBPF networking, and a Lua and OpenResty egress proxy. Deployed by shell script or a preview Helm chart. No workflow engine of its own.

Request path, top to bottom:

- CubeAPI (Rust, Axum 0.7, tokio, tower and tower-http, CubeAPI/src/{handlers,routes.rs,services,cubemaster,state.rs}): terminates the E2B-compatible REST and WebSocket API. openapi.yml lists /sandboxes, /sandboxes/{id}/{connect,logs,network,pause,refreshes,resume,rollback,snapshots,timeout}, /templates..., /v2/sandboxes..., /volumes..., /snapshots, /health. Optional auth via --auth-callback-url or AUTH_CALLBACK_URL, a passthrough callback pattern, off by default.
- CubeMaster (Go, module github.com/tencentcloud/CubeSandbox/CubeMaster, go 1.25.7): a stateless cluster orchestrator, Redis-backed (redigo) with pluggable relational backends (glebarez/sqlite, go-sql-driver/mysql, jackc/pgx/v5, migrated with pressly/goose), packages under CubeMaster/pkg/{scheduler,task,lifecycle,sandboxspec,volume,cubelet,templatecenter,...}. Exposes cubemastercli, an operator CLI and TUI built with charmbracelet bubbletea.
- Cubelet (Go, per-node agent) and CubeShim (Rust, containerd Shim v2, with the in-guest agent under agent/src/{sandbox.rs,mount.rs,network.rs,device.rs,rpc.rs,...}) hand off to CubeHypervisor, a fork of rust-vmm's Cloud Hypervisor under hypervisor/, which carries its own Apache-2.0/BSD-3-Clause dual licence per rust-vmm convention and a bundled virtiofsd.
- CubeVS (Go and eBPF, documented in docs/architecture/network.md): three TC-attached BPF programs (from_cube, from_world, from_envoy) do per-sandbox NAT, stateful session tracking that mirrors nf_conntrack, and CIDR or DNS-learned policy, with a hardcoded always-deny of private and link-local ranges (10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.168.0.0/16) regardless of user policy.
- CubeEgress (OpenResty and Lua): a TPROXY-intercepted L7 MITM proxy for domain filtering and credential injection, detailed in section 5.
- cubecow (Rust): an XFS reflink (FICLONE) copy-on-write storage engine for sandbox rootfs and snapshots, O(1) fork cost, requires an XFS-formatted /data/cubelet.
- CubeProxy (OpenResty and Go), cube-lifecycle-manager (Go, auto-pause and resume of idle sandboxes), CubeOps (Go, split out of CubeMaster in v0.7 to hold node ops and the dashboard's admin API on port 3010), CubeTemplateCenter (Go), and a React, Vite, TypeScript and Tailwind dashboard under web/ complete the system.

Deployment shape: no Kubernetes-native default. The primary path is deploy/one-click/{online-install.sh,install.sh}, a shell installer that runs MySQL and Redis via Docker Compose and the Go and Rust components as host processes or systemd units. A Helm chart exists at deploy/kubernetes/chart/Chart.yaml but is explicitly a preview (section 5). There is no Temporal-like workflow engine and no job queue beyond Redis-backed scheduling. Task state here means "is this sandbox running, paused or gone", not a multi-step approval workflow.

## 4. UX

Fast, scriptable onboarding for a narrow job, getting a KVM sandbox running, with a genuinely useful web dashboard on top. But the dashboard manages virtual machines, not coding tasks, so there is no task kanban, diff view or approval flow to compare against ours.

Zero to first result on a host that already has /dev/kvm (docs/guide/bare-metal-deploy.md, docs/guide/quickstart.md): run the one-click installer as root, run cubemastercli tpl create-from-image against a prebuilt sandbox-code OCI image and wait for READY, pip install e2b-code-interpreter and set E2B_API_URL, E2B_API_KEY and CUBE_TEMPLATE_ID, then run literal E2B SDK code (Sandbox.create(...).run_code(...)). Four steps, no CubeSandbox-specific SDK to learn. On an ordinary cloud VM without /dev/kvm, the PVM path (section 5) adds two steps before this: install a replacement host kernel package and reboot, then pass CUBE_PVM_ENABLE=1 to the same installer.

Interfaces: the E2B-compatible REST and WebSocket API (plus a /v2/sandboxes variant), cubemastercli (a bubbletea TUI plus scriptable subcommands), and the web Dashboard on port 12088. The Dashboard (docs/guide/webui.md) has 11 sidebar sections: Overview, Sandboxes, Templates, Nodes, Versions, Warehouse, Network, Observability, API Keys, Template Store, AgentHub and Settings, a command palette (Cmd or Ctrl+K), and per-sandbox live log streaming. Watching an agent work means opening a sandbox's detail page and reading its log stream. There is no higher-level "agent task" view, because CubeSandbox has no concept of an agent task, only a sandbox process. Intervention is pause, resume or kill on a sandbox row, not an approval gate. Login is JWT-based since v0.6.0: 15-minute access tokens, 7-day refresh tokens, and default credentials admin and admin that the docs say to change immediately, with the admin API (/opsapi/*, CubeOps port 3010) restricted to localhost and Docker-bridge networks at the nginx layer.

Two example integration repos, examples/claude-code-integration and examples/opencode-plugin-sandbox, show the intended agent-harness UX pattern: a PreToolUse or tool.execute.before hook rewrites only the harness's Bash tool call to run inside a CubeSandbox microVM, while Read, Write and Edit keep operating on the host project tree. This is a genuinely different sandboxing granularity from our per-task whole-pod isolation (section 7).

## 5. Security, identity, sandbox, policy, cost

Sandbox. Real hardware isolation per sandbox: a microVM booted by a forked Cloud Hypervisor under KVM, not a container or a gVisor-style syscall-interception sandbox. This is the project's central claim and, on the evidence in the source and docs, real. hypervisor/ is a working rust-vmm-derived VMM, CubeShim implements containerd Shim v2 to launch it, and cubecow gives each sandbox an XFS-reflink copy-on-write rootfs so spinning one up does not copy a whole template image.

Host requirements, and the Hetzner question. CubeSandbox needs /dev/kvm. On a machine that already has it, a physical machine, a Hetzner dedicated server, or any cloud VM with the provider's nested virtualisation switched on, the plain bare-metal path applies directly (x86_64 or ARM64), install and go. Hetzner dedicated servers expose /dev/kvm natively, so CubeSandbox would run there with no special measures. On an ordinary cloud VM without /dev/kvm, such as a stock Hetzner Cloud server, CubeSandbox's own recommended path is PVM (Pagetable-based Virtual Machine, docs/guide/pvm-deploy.md): a page-table-based shadow-paging nested-virtualisation technique, built into a replacement Linux kernel that Tencent publishes on the OpenCloudOS-Kernel project, that gives the guest a working /dev/kvm (via modprobe kvm_pvm after a reboot) without the underlying cloud hypervisor exposing VT-x or AMD-V at all. That is architecturally different from, and less restrictive than, "needs a cloud provider that supports nested virtualisation": PVM works because the trick lives entirely inside the guest kernel. In practice, this means CubeSandbox could plausibly run on ordinary Hetzner Cloud virtual servers by installing the PVM host kernel package and rebooting, but this is not verified on Hetzner specifically. Tencent states PVM is production-validated only on its own OpenCloudOS-based, Tencent Cloud infrastructure, the kernel packages are x86_64-only RPM and DEB builds with no ARM64 equivalent, and swapping a rented server's host kernel is a bigger, less reversible operational step than anything else in this comparison. It would also give up the stock-vendor-kernel property that is part of why we chose gVisor over microVMs in the first place (section 7).

Policy. Enforced outside the sandboxed process, in code and in the network path, matching our own principle. CubeVS (eBPF, TC-attached) hardcodes a deny of private and link-local ranges regardless of user configuration and applies CIDR allow and deny lists per sandbox. CubeEgress adds an L7 layer on top: it intercepts outbound traffic via TPROXY, terminates TLS per SNI with leaf certificates signed by a proxy-held root CA installed into the sandbox's trust store, matches requests against a small policy language of Match, Action and Inject rules (allow this domain, deny that path, inject this header or credential on match), and writes a three-tier JSONL audit log of every decision. Domains can also be learned dynamically from DNS responses rather than only from a static allow-list. This is a materially more detailed egress policy engine than our current gateway allow-list, at the cost of running a TLS-terminating proxy the sandbox is told to trust.

Identity and credentials. The control-plane API itself is thin here. By default, CubeAPI accepts every request unchecked, authentication is opt-in via --auth-callback-url, a synchronous POST to an external service that must return HTTP 200 to allow the request. This is a bring-your-own-auth passthrough, not a built-in scoped-identity system, and the docs explicitly warn that a callback must check both path and method or a read-only key can escalate to a delete, since /templates/:id mounts GET, POST, DELETE and PATCH on the same path. The Dashboard adds JWT auth on top (short-lived access token, 7-day refresh, typ and aud claim separation, rate-limited login), but that is a UI concern, not a per-task workload identity. Where CubeSandbox is genuinely stronger than a naive design is the egress direction: CubeEgress's credential injection means a sandbox can be allowed to call a third-party API without ever holding that provider's real key itself, the proxy attaches it on the way out. That is a narrower but real analogue of "the sandbox holds no key material", limited to HTTP egress, rather than covering the control-plane API or Git credentials the way our per-task ServiceAccount tokens and per-session Forgejo tokens do.

Cost. Absent. No budgets, no spend caps, no cost ledger anywhere in the docs or code read. The Dashboard's Network page configures API rate limits, a request-rate control, not a cost control. An operator can see how many sandboxes are running and their CPU and memory, but nothing prices a sandbox-hour or caps spend per project or per task.

## 6. What we should take from it

Narrow, copyable this quarter. PVM is a concrete unblock for the "microVMs need bare metal" line in our own weaknesses list: prototype installing Tencent's published OpenCloudOS-Kernel PVM host package on one Hetzner Cloud (non-dedicated) node, reboot, confirm /dev/kvm appears, and see whether a Cloud Hypervisor guest boots. If it works cleanly, it turns "microVMs need bare metal" into "microVMs need one extra kernel image in the node's cloud-init", which could be baked into the Talos and OpenTofu image recipe and stay re-seedable. If it does not reproduce cleanly outside Tencent's own infrastructure, that is useful information before committing to a microVM tier. Separately, the CubeEgress design (TPROXY plus per-SNI MITM plus a Match, Action, Inject policy language plus JSONL audit) is a good reference architecture for a stronger egress layer than our current allow-list, in particular the credential-injection idea: let the gateway attach a real third-party API key to an allowed outbound call so the agent process never sees it, rather than only gating which calls it may reach. The XFS reflink copy-on-write pattern (cubecow, FICLONE) is worth considering for our own worker pod filesystem or build-VM base images, contingent on the host filesystem being XFS. The CONTRIBUTING.md "AI-Generated Code Policy" (AI agents must not add their own Signed-off-by, a human reviews and certifies DCO) is a one-paragraph governance addition worth lifting verbatim, since we are exactly the kind of project that will have AI-authored commits. Finally, the split "public JWT API, admin API bound to localhost and Docker-bridge only" nginx pattern, and the 15-minute access plus 7-day refresh JWT split with separate typ and aud claims, are small, concrete hardening defaults worth matching if we ever add a JWT-based path alongside our OIDC one.

Broad, product shape. The two harness-integration examples demonstrate a lighter sandboxing granularity than ours: redirect only the dangerous tool call, Bash, into an isolated microVM, while the agent keeps its normal view of host files for Read, Write and Edit. We isolate the whole worker pod per task, which is safer but heavier, and it means the agent never sees the developer's actual working tree. This is worth a deliberate look as an alternative, cheaper tier for low-risk tasks, not a wholesale replacement. More broadly, CubeSandbox's whole bet is to be the fast, self-hostable, drop-in E2B API, a narrow, well-scoped problem solved thoroughly. The lesson for our own console, already named as weak, with no onboarding, no live stream and no diff view, is less about any specific feature and more about the payoff of picking one narrow surface and polishing it end to end rather than spreading effort across five planes at once.

## 7. Where our philosophy differs and what that costs or buys us

The biggest cost of copying CubeSandbox's strongest isolation tier is giving up our stock-kernel, no-custom-host-image posture, which is exactly why gVisor was chosen in the first place. To get CubeSandbox's real hardware isolation on Hetzner Cloud, rather than dedicated, servers means either moving to Hetzner dedicated servers, a real hardware and cost change, consistent with our own docs already saying microVMs pay off once the build volume outweighs running such nodes, or replacing the host kernel with Tencent's PVM build on our existing cloud VMs. The second option keeps us on commodity cloud hardware but trades our stock-vendor-kernel property for a vendor-published OpenCloudOS kernel fork that we would then be responsible for patching and re-validating ourselves, x86_64 only, and validated mainly on Tencent's own fleet rather than Hetzner's. Our constraint of using best-of-breed but boring, escape-hatch-friendly tools is not violated, PVM's improvements are upstreamed to a public kernel repository, not a proprietary blob, but the operational surface, kernel security patching cadence, one more thing that can fail to boot, is real and is the price, not the benefit, of adopting it.

CubeSandbox has no notion of durable task state, budgets, approvals or verification. It is a stateless execution primitive that a caller, any E2B client, drives synchronously. Adopting it changes nothing about our control plane, policy engine or merge and deploy story, at most it replaces the implementation of one plane, the worker or sandbox layer, never the orchestration around it. Reading this report as "should we replace factoryd with CubeSandbox" is the wrong question, the two solve non-overlapping problems.

Its egress model is a full TLS-terminating MITM with a proxy-trusted root CA baked into every sandbox. That is more powerful than our current gateway-mediated, per-call API proxying, it works for arbitrary protocols and legacy tools that were never written to call our gateway, but it means the proxy itself becomes a high-value target that sees plaintext traffic to every domain it is allowed to reach. Our principle of policy outside the model survives either way, but how much the network layer gets to see is a real design choice, not a free upgrade.

## 8. Red flags and slop assessment

Genuinely active and used, not a README-only project, but treat the headline performance numbers as marketing until measured ourselves, and treat Kubernetes support as unfinished.

Activity is real: 1026 or more commits by API count (gh api repos/TencentCloud/CubeSandbox/commits --paginate), 100+ contributors (57 credited in the v0.7.0 changelog alone, docs/changelog/v0.7.0.md), 30 releases since 2026-04-10, roughly biweekly cadence through 2026-09-24. Named production use is thin outside Tencent itself: only MiniMax surfaced in search as a named external adopter, alongside unspecified internal Tencent workloads and a "Cube 100 Program" that reads as an incentive to attract more adopters rather than evidence of a broad existing customer base.

Licence bookkeeping is messier than the README implies. GitHub's own detector reports the repository licence as "other" or NOASSERTION rather than Apache-2.0, almost certainly because LICENSE documents a primary Apache-2.0 grant plus a carved-out BSD-2-Clause election for the vendored cilium/bpf code, used throughout CubeNet/cubevs/*.go and Cubelet/network/runtime/*.go, and the hypervisor/ tree carries its own Apache-2.0 and BSD-3-Clause dual licence per rust-vmm convention. Not a red flag by itself, every licence involved is open source, but it means an automated licence scan on this dependency would need a human to confirm the SPDX expression rather than trusting GitHub's badge.

Kubernetes support is explicitly a preview (docs/guide/kubernetes/index.md) with three named unresolved issues: pod eviction under resource pressure interrupts running sandboxes, a compute-node upgrade recreates the cube-node and interrupts pod-network sandboxes, and the default host-network mode can clash with restrictive CNIs or Pod Security Admission. It is tested against Tencent TKE, plain Kubernetes with Flannel, and K3s with Flannel, explicitly not against Cilium, which is our own CNI. Running CubeSandbox nodes inside our existing Talos and Cilium cluster is an open integration risk, not a solved problem.

Some published numbers outrun what is verifiable from outside Tencent. A Medium post's claim of "up to 95.8%" resource reduction is uncited. The sub-5MB idle-memory figure depends heavily on how stripped the guest image is. Independent commentary on the original Show HN thread (news.ycombinator.com/item?id=47863430, posted 2026-04-23) noted that E2B's own hosted p50 start time had already improved to about 78ms by January 2026, narrowing the "under 60ms" comparison CubeSandbox advertises against E2B specifically. Separately, one source found in search described event-level snapshot rollback as still "in development", while the README's own v0.3.0 changelog entry claims it already shipped, an internal inconsistency, marked here as not fully verified.

Two default-credential footguns exist but each has a stated mitigation: the E2B-compatible API allows every request unless an operator opts into --auth-callback-url, and the Dashboard ships with admin and admin as default credentials, mitigated by the admin API being bound to localhost and Docker-bridge networks at the nginx layer, and the docs explicitly telling operators to change the password. Worth noting as defaults that need changing on day one of any deployment, not evidence of neglect.

## 9. Sources

- https://github.com/TencentCloud/CubeSandbox (clone, last commit 80614ab4, 2026-09-28)
- README.md
- LICENSE
- CONTRIBUTING.md
- hypervisor/LICENSE-APACHE
- hypervisor/LICENSE-BSD-3-Clause
- hypervisor/virtiofsd/LICENSE-APACHE
- hypervisor/virtiofsd/LICENSE-BSD-3-Clause
- docs/architecture/overview.md
- docs/architecture/network.md
- docs/guide/security-proxy.md
- docs/guide/pvm-deploy.md
- docs/guide/quickstart.md
- docs/guide/bare-metal-deploy.md
- docs/guide/dev-environment.md
- docs/guide/webui.md
- docs/guide/authentication.md
- docs/guide/kubernetes/index.md
- docs/changelog/v0.7.0.md
- docs/.vitepress/config.mjs
- docs/public/CNAME
- openapi.yml
- CubeAPI/Cargo.toml, CubeAPI/src/ (layout)
- CubeMaster/go.mod, CubeMaster/pkg/ (layout)
- CubeShim/Cargo.toml (dependency grep)
- agent/src/ (layout)
- examples/claude-code-integration/README.md
- examples/opencode-plugin-sandbox/README.md
- deploy/ (layout, including deploy/kubernetes/chart/Chart.yaml)
- top-level repository layout (find . -maxdepth 2)
- https://cubesandbox.com (WebFetch, 2026-09-29)
- gh api repos/TencentCloud/CubeSandbox (stars, forks, licence, dates, 2026-09-29)
- gh api repos/TencentCloud/CubeSandbox/contributors (2026-09-29)
- gh api repos/TencentCloud/CubeSandbox/releases (2026-09-29)
- gh api repos/TencentCloud/CubeSandbox/commits --paginate (commit count, 2026-09-29)
- https://news.ycombinator.com/item?id=47863430 (Show HN thread, posted 2026-04-23, read via WebSearch 2026-09-29)
- dev.to post by jerrylin_0101 on E2B-compatible sandboxes (via WebSearch, 2026-09-29)
- medium.com post citing "up to 95.8%" resource reduction, uncited (via WebSearch, 2026-09-29)
- WebSearch: "CubeSandbox TencentCloud microVM E2B review OR hacker news OR reddit 2026" (2026-09-29)
- WebSearch: "CubeSandbox Tencent sandbox agents adopters in production" (2026-09-29)
