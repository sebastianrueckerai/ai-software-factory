---
name: OpenSandbox
slug: opensandbox
url: https://open-sandbox.ai
repo: https://github.com/opensandbox-group/OpenSandbox
category: sandbox-runtime
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, Docker or Kubernetes; no managed or SaaS tier; Apache-2.0, Helm chart shipped
company: Originated at Alibaba (package namespaces, Go module path and the Alibaba Cloud registry still carry Alibaba's name); released 2026-03-03; governance moved to a neutral org, opensandbox-group, created 2026-06-04 with no company metadata; confirmed production user is Alibaba Cloud Lingyang
maturity: created 2025-12-17, 15,582 stars, 1,435 forks, 131 open issues, 30 contributors, 3,225 commits, 30 tags/releases (per-component, roughly weekly), last push 2026-09-29 (today)
similarity: 3
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 5
  verification: 0
  policy_outside_model: 4
  identity_per_task: 2
  cost_control: 0
  ux: 3
  reseedable_selfhost: 4
steal:
  - "Server-wide [secure_runtime] config (type/docker_runtime/k8s_runtime_class) validated at startup, refusing to boot on a mismatch: a clean pattern for offering runc/gVisor/Kata-QEMU/Kata-Firecracker as one operator choice instead of a per-task decision nobody audits."
  - "Kata-Firecracker as a documented, ~125ms-overhead microVM tier between gVisor and full Kata-QEMU: directly answers our own noted gap that gVisor on systrap is slow for builds and microVMs need bare metal."
  - "Egress sidecar deny.always/allow.always overlay (components/egress/pkg/policy/always_rules.go, MergeAlwaysOverlay): platform rules that unconditionally outrank any tenant-supplied network policy, hot-reloaded every 60s with no restart."
  - "Credential Vault: the sandboxed process only ever sees a fake credential; the sidecar injects the real bearer/apiKey/basic header into matching outbound requests by host, method and path. Worth weighing against our own design, where the worker process holds two real per-session Forgejo tokens directly."
  - "execd's PTY-over-WebSocket holder/viewer sharing model plus SSE command streaming: a concrete mechanism for the real-time 'watch the agent work' console view we do not have."
  - "Pool CRD's two-level buffer/total warm-capacity model with Delete/Restart/Noop recycle strategies, and a 'fresh identity per allocation' guard (503 on all business endpoints until a recycled pod is atomically rebound) that closes the obvious warm-pool tenant-bleed risk."
differs:
  - "Sandbox-only scope: no task state, scheduler, approvals or cost ledger. OpenSandbox could only ever replace pieces of our worker plane, never the rest of the loop."
  - "Its strongest network isolation (egress sidecar deny.always, Credential Vault) structurally requires runc or Kata, because gVisor's netstack has no iptables nat table; adopting it where we use gVisor today means trading syscall isolation for network isolation, not getting both."
  - "Provenance is unsettled: Alibaba-originated code and branding under a six-month-old neutral-looking org, with no primary source stating the long-term governance relationship; our best-of-breed-but-swappable constraint means treating this as an Alibaba project for now, not a vendor-independent one."
ux_verdict: SDK, CLI and MCP quickstart reach a running command in about five lines once a server and one image are pulled, faster onboarding than our console flow, but there is no web UI at all; watching or steering a live sandbox means execd's terminal-share and SSE streams, not a page a human opens.
slop_verdict: Real and fast-moving, not a landing page - 3,225 commits and 30 tags in under three months of releases, every architecture-doc claim checked against working code - but the neutral opensandbox-group branding is ahead of the facts (Alibaba names still fill the packages, module path and one registry), and adoption evidence outside Alibaba's own Lingyang business is self-reported evaluation, not confirmed production.
---

# OpenSandbox

## 1. What it is

OpenSandbox is a general-purpose sandbox platform for running untrusted or agent-generated code: coding agents, browser and GUI agents, code interpreters and RL training workloads each get an isolated place to execute, with one client API from a laptop running Docker to a Kubernetes cluster. Alibaba released it on 2026-03-03 under Apache-2.0 (MarkTechPost, 2026-03-03), built on infrastructure Alibaba says it already used internally for large-scale AI workloads. The one publicly disclosed production consumer is Alibaba Cloud Lingyang, Alibaba's enterprise digital-intelligence business, which runs it via the project's own Kubernetes/Helm deployment path. Governance follows a containerd-style OSEP (OpenSandbox Enhancement Proposal) process with lazy-consensus and formal voting thresholds (`GOVERNANCE.md`), hosted under a GitHub org, `opensandbox-group`, created 2026-06-04 - six months after the repository itself (created 2025-12-17) - with no company, blog or description metadata of its own (`gh api orgs/opensandbox-group`). Package namespaces still carry Alibaba's name throughout: `com.alibaba.opensandbox` (Java/Kotlin), `@alibaba-group/opensandbox` (npm), `Alibaba.OpenSandbox` (.NET), a Go module path of `github.com/alibaba/OpenSandbox`, and one of three official container registries is Alibaba Cloud's own (`sandbox-registry.cn-zhangjiakou.cr.aliyuncs.com`). This reads as an Alibaba project moving toward neutral community governance, not one that has arrived there.

What the maintainers claim: a portable, runtime-agnostic sandbox API that scales from a laptop to a cluster, with production-grade security (pluggable isolation, per-sandbox egress control, a credential vault) and near-zero warm-pool cold-start latency. What the repository shows: this is substantially true at the code level. Every mechanism named above exists as real, tested code, not doc-only description - `server/opensandbox_server/services/validators.py` hardcodes the gVisor/egress incompatibility as a request-time rejection, `components/egress/pkg/policy/always_rules.go` implements the platform-rules overlay described in the docs verbatim. Production adoption outside Alibaba itself is thinner: the project's own "who is using OpenSandbox" GitHub issue lists self-reported evaluation (for example Unicom Digital Technology, researching it for agent-platform code execution) rather than confirmed production use, and a third-party review (Wavect, September 2026) warns explicitly against treating the Docker quickstart as evidence that a production multi-tenant deployment is secure.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals (issues, telemetry, alerts) | Nothing. No intake, no issue or alert model. | factoryd consumes issues, telemetry and alerts as work sources. | Not comparable |
| Control plane (task state, scheduler, policy, approvals, cost) | A `BatchSandbox`/`Pool` allocation has a TTL (`expireTime`) and pause state, tracked by a Kubernetes controller; no task concept, no approvals, no cost ledger. | factoryd holds durable task state in Temporal and Postgres, scheduling, approvals, model tier choice, cost ledger and audit. | We lead |
| Worker plane (sandbox) | This is the project's whole scope: `BatchSandbox`/`Pool`/`SandboxSnapshot` manage sandboxes at scale, five isolation runtimes, warm pools, pause/resume, per-sandbox and platform-wide egress control, a Credential Vault. | factoryd hand-creates one namespace, ServiceAccount and gVisor pod per task, default-deny Cilium egress to four named destinations. | They lead |
| Verification (tests, security review, policy eval before merge) | None. Out of scope; a sandbox is an execution environment, not a pipeline. | Forgejo Actions, policy gates, stronger-model review before merge. | Not comparable |
| Merge and deploy | None. | Bot-merged PRs, Flux GitOps deploy, staged rollout. | Not comparable |
| Policy outside the model | Egress sidecar's `deny.always`/`allow.always` overlay and Credential Vault bindings are enforced in the sidecar process and nftables, never in a prompt; the server also enforces request-time policy (HTTP 400 on an invalid gVisor+`network_policy` combination). | Cilium default-deny egress allowlist, capability policy as a Git file applied by Flux, enforced in factory-gateway and network policy. | Equal, different layer |
| Identity per task | Credential Vault substitutes real headers at the network edge, scoped to host, method and path, so the sandboxed process never holds the real secret; state is process-local to the sidecar and lost on any pod recreation, including pause/resume. No automatic per-sandbox Kubernetes ServiceAccount or workload-identity binding was found. | factoryd auto-creates a namespace and a `task-<id>` ServiceAccount per task, a projected token verified against the cluster OIDC issuer; the worker still holds two real per-session Forgejo tokens directly. | Mixed: stronger on outbound-API secrecy, no answer on Kubernetes-native task identity |
| Artifacts not chat | A client calls exec/files/terminal APIs on a sandbox (`execd`), not a chat interface; MCP server exposes the same lifecycle as tool calls to an MCP-speaking host. | Same intent: `TaskBrief` in, branch and PR out. | Equal |

## 3. Architecture and stack

Six surfaces sit around one core: client SDKs (Python, Java/Kotlin, TypeScript/JS, C#/.NET, Go), a CLI (`osb`) and an MCP server talk to a FastAPI lifecycle server (`server/opensandbox_server/`) over OpenAPI-defined contracts (`specs/sandbox-lifecycle.yml`, `execd-api.yaml`, `egress-api.yaml`, `diagnostic-api.yml`). The lifecycle server hides Docker, Kubernetes and a lighter "FastSandbox" runtime behind one `SandboxService` interface, so the same client call creates a container on a laptop or a pod in a cluster. Inside each sandbox, a Go daemon called `execd` (default port 44772, Gin-based) is the actual data plane: persistent bash sessions, PTY-over-WebSocket, file and directory operations, Jupyter code contexts, and an optional eBPF audit sidecar (`execd-ebpf`). A separate network and security plane wraps the sandbox: an egress sidecar (DNS proxy plus nftables), a process-local Credential Vault, and an optional Node Agent DaemonSet for at-least-once log and syscall shipping to local files or Alibaba OSS.

On Kubernetes, three CRDs do the scheduling work, each with its own controller under `kubernetes/apis/sandbox/v1alpha1/` and `kubernetes/internal/controller/`: `BatchSandbox` (replicas, pod template, `poolRef`, `shardPatches`, `taskTemplate`, `expireTime`, pause), `Pool` (a warm-pod buffer with a two-level buffer/total capacity model and a `recycleStrategy` of `Delete`, `Restart` or `Noop`), and `SandboxSnapshot` (pause/resume via a `rootfs-v1` or `qemu-v1` checkpoint format). OSEP-0002 (`oseps/0002-kubernetes-sigs-agent-sandbox-support.md`, status "implemented") adds a second, swappable Kubernetes workload provider, `kubernetes-sigs/agent-sandbox` (`agents.x-k8s.io/v1beta1`, minimum v0.5.0, with v1.0.0 due to drop v1alpha1 with no fallback), selected via `kubernetes.workload_provider = "agent-sandbox"` in server config; OpenSandbox's own client-facing API stays `sandbox.opensandbox.io/v1alpha1` either way.

Isolation itself is chosen once, for the whole server, not per sandbox: a `[secure_runtime]` block in `~/.sandbox.toml` sets `type` to `""`, `"gvisor"`, `"kata"` or `"firecracker"`, plus `docker_runtime` and `k8s_runtime_class`. The pydantic model backing this, `SecureRuntimeConfig` in `server/opensandbox_server/config.py`, validates the combination is internally consistent as soon as it is parsed; `server/opensandbox_server/services/runtime_resolver.py`'s `validate_secure_runtime_on_startup` then checks the chosen runtime actually exists (Docker's `info()["Runtimes"]`, or the Kubernetes `RuntimeClass` object) and refuses to start the server otherwise. The project's own docs (`docs/guides/secure-container.md`) give indicative overhead: runc ~0ms, gVisor/runsc ~10-50ms, Kata-Firecracker ~125ms, Kata-Cloud-Hypervisor ~200ms, Kata-QEMU ~500ms.

The stack is Python (FastAPI, pydantic) for the lifecycle server, Go for `execd`, the egress sidecar and the Kubernetes controllers (controller-runtime), and generated OpenAPI clients for every SDK language. Deployment is a Helm chart or a single Docker Compose file; there is no SaaS or managed offering. Governance runs on an OSEP (OpenSandbox Enhancement Proposal) process modelled on containerd's, with lazy consensus and a formal vote (two-thirds of Project Maintainers, seven-day minimum) for anything contentious; `CODEOWNERS` names `@jwx0925 @hittyt @Pangjiping @ninan-nn` as maintainers plus component-specific owners.

## 4. UX

There is no web console. A user installs one SDK or the `osb` CLI, points it at a running server (a local Docker Compose stack or a cluster endpoint), and creates a sandbox in roughly five lines: import the client, call create with an image, call exec or open a session, read the result. The MCP server exposes the same lifecycle calls as tool calls to any MCP-speaking agent host, which is the intended integration path for coding agents rather than a human driving a UI. The three worked examples in the repository (`examples/opencode/main.py`, `examples/codex-cli/main.py`, `examples/agent-sandbox/main.py`, documented at `docs/examples/opencode.md`, `codex-cli.md`, `agent-sandbox.md`) all follow this shape: create a sandbox, install the coding agent inside it at runtime (`opencode-ai@latest` via npm, or `@openai/codex@latest`), then drive it non-interactively (`opencode run`, `codex exec "..." --skip-git-repo-check`). The Codex example documents multi-turn sessions by capturing a `thread_id` from the `thread.started` event in `codex exec --json` output and resuming with `codex exec resume "<thread_id>" "..."`, and it carries a clear warning that Codex's own `--yolo` / `--dangerously-bypass-approvals-and-sandbox` flag is safe only inside a hardened sandbox (gVisor or Kata), not runc.

Watching or steering a running sandbox means using `execd` directly: SSE-streamed command output, or a PTY-over-WebSocket session with a holder/viewer sharing model, so a second party can attach to the same terminal a running agent is using. This is a real mechanism, not a placeholder, but it is a protocol a client has to implement, not a page a human opens. Onboarding to a first result is faster than our own console-driven flow once a server and one base image are pulled; the cost is that there is no equivalent of watching a task graph or approving a step from a UI. A third-party review (Wavect, September 2026) makes the same UX observation from a security angle: the Docker quickstart is fast to try but is not itself evidence the production (Kubernetes) path is hardened out of the box.

## 5. Security, identity, sandbox, policy, cost

Sandbox isolation is real and configurable, but scoped to the whole server rather than to a task: an operator picks one of runc, gVisor, Kata-QEMU, Kata-Cloud-Hypervisor or Kata-Firecracker, and the server validates the choice both for internal consistency (`SecureRuntimeConfig.validate_secure_runtime`) and for actual availability at startup (`validate_secure_runtime_on_startup`). There is a documented, code-enforced incompatibility: gVisor's user-space network stack has no iptables `nat` table, so the egress sidecar's DNS-redirect mechanism cannot attach to it. `server/opensandbox_server/services/validators.py` hardcodes this as `_GVISOR_NAT_INCOMPATIBLE_RUNTIMES = frozenset({"gvisor"})` and the server returns HTTP 400 on any request that combines `network_policy` with a gVisor sandbox; the docs point to gVisor upstream issue #170 and recommend Kata-QEMU or a Cilium `toFQDNs` policy as a workaround. Network egress control itself is real: the egress sidecar runs in a `dns+nft` mode, where a DNS proxy returns NXDOMAIN for denied hosts and nftables default-denies everything except bounded-lease, DNS-learned allowed IPs. A platform operator can layer `deny.always` and `allow.always` overlay files on top of any tenant's own `network_policy`; `components/egress/pkg/policy/always_rules.go`'s `MergeAlwaysOverlay` prepends these so they always win, and the files are hot-reloaded every 60 seconds with no restart. This per-sandbox policy only applies to sandboxes created fresh; a pool-served sandbox is already running before it is handed to a tenant, so a per-allocation network policy cannot be retrofitted onto it.

Credentials for outbound calls live in the egress sidecar's process memory only, never on the sandbox's own root filesystem, and do not survive a pod recreation such as pause/resume (`docs/guides/credential-vault.md`). The sandboxed process is handed a fake or empty credential; the sidecar matches outbound HTTPS requests by host, method and path and substitutes the real bearer, basic, API-key or custom header before the request leaves. This requires `[egress] mode = "dns+nft"` with `defaultAction = "deny"`, so it only exists on the same code path as the network policy above, and by extension only on runc or Kata. There is no equivalent binding found for Kubernetes-native workload identity: nothing in the CRDs or controllers issues a per-sandbox ServiceAccount or OIDC-verified token the way a projected token does in our own design. Cost control is entirely absent: `BatchSandbox` has an `expireTime` and pause state, which bounds how long a sandbox runs, but there is no spend ledger, no budget, and no hold mechanism. Policy enforcement generally sits in code (the sidecar, the FastAPI validators) rather than in a prompt, which matches our own "policy outside the model" principle, but it is enforced at the network and process layer, not by a Kubernetes-native admission mechanism such as a `ValidatingAdmissionPolicy`.

## 6. What we should take from it

Narrow, code-level items to copy this month: the server-wide `[secure_runtime]` config pattern with startup-time availability validation is a clean way to make isolation-backend choice an explicit, auditable operator decision instead of a per-task default nobody revisits; our own gVisor-only setup could use the same fail-fast validation on factoryd startup. The `deny.always` / `allow.always` egress overlay (`components/egress/pkg/policy/always_rules.go`) is a concrete, hot-reloadable pattern for platform-level network rules that always outrank a tenant's own policy, which is a cleaner separation than folding both into one Cilium policy object. The Pool CRD's two-level buffer/total warm-capacity model, paired with a "fresh identity per allocation" guard that returns 503 on all business endpoints until a recycled pod is atomically rebound, is a specific, implementable answer to the tenant-bleed risk any warm-pool design has to solve, and would generalise to a gVisor pod pool in our own worker plane.

Broader, product-shape items worth weighing rather than copying wholesale: Kata-Firecracker as a documented microVM tier (~125ms overhead, per the project's own numbers) sits between our current gVisor pods and a full VM, and speaks directly to a gap we have already named ourselves: gVisor on systrap is slow for builds, and microVMs need bare metal. It is worth a spike on Hetzner bare-metal boxes to see whether Kata-Firecracker gives CI image builds a workable rootful path without giving up sandbox isolation. The Credential Vault's model, where the sandboxed process never holds a real secret and a sidecar injects it at the network edge by host/method/path, is a stronger property than our worker holding two real per-session Forgejo tokens directly; it would take a design decision to adopt, since it only works cleanly outside gVisor. `execd`'s PTY-over-WebSocket holder/viewer model and SSE command streaming are a concrete mechanism for a "watch the agent work" console feature we do not have today, independent of whether we ever adopt OpenSandbox itself.

## 7. Where our philosophy differs and what that costs or buys us

OpenSandbox only ever covers our worker plane. It has no task state, no scheduler, no approvals and no cost ledger, so adopting it would replace how we run a sandbox, not how we decide what to run or when to stop; every other plane in our design stays ours regardless. Its two strongest security properties, the egress sidecar's `deny.always` overlay and the Credential Vault, are structurally tied to runc or Kata, because gVisor's network stack cannot support the iptables-based DNS redirect the sidecar depends on. Since our own sandbox runs on gVisor specifically for syscall isolation, taking either of these mechanisms as-is would mean trading gVisor for Kata somewhere in the path, not adding network isolation on top of what we already run. That is a real architectural choice, not a free upgrade, and the cost is Kata's heavier per-sandbox overhead (roughly 125-500ms against gVisor's 10-50ms by the project's own figures) against the benefit of real credential secrecy and always-on network policy.

Provenance is the other place our philosophy costs us something if we lean on this project. We prefer best-of-breed tools that are also swappable, and OpenSandbox's origin is Alibaba's, not yet a neutral foundation's: the code, package namespaces, Go module path and one of three registries all still carry Alibaba's name, and the community-looking `opensandbox-group` GitHub org is six months younger than the code and carries no organisational metadata of its own. The one disclosed production user is an internal Alibaba business unit. None of this makes the software worse today, but it means treating OpenSandbox as an Alibaba project under a governance model in transition, not as an independent one, when weighing how much of our own architecture to couple to it.

## 8. Red flags and slop assessment

The activity is real: 3,225 commits and 30 tags across roughly per-component, near-weekly releases since the repository's creation on 2025-12-17, with a push as recent as today (2026-09-29) and every architecture claim in the docs checked here against working code rather than aspirational prose. Dependency security handling looks competent rather than absent: known CVEs are all at the dependency level and all patched, not left open. The Python SDK's `anyio` dependency carried CVE-2026-63374 (critical, a TLS certificate-spoofing risk from IDNA 2003 hostname encoding), fixed at anyio >=4.14.2 alongside the medium CVE-2026-64847 and a low-severity OpenTelemetry-Go issue (CVE-2026-81870) in pull request #1921; the JavaScript SDK's `fast-uri` (CVE-2026-84292, CVE-2026-84394) and `undici` (CVE-2026-85024) dependencies, plus a `containerd` issue (CVE-2026-53493), were fixed together in pull request #2057. No CVE was found against OpenSandbox's own runtime, `execd`, or egress code specifically.

The two things to watch are provenance and adoption breadth, both already noted above: the neutral-sounding `opensandbox-group` branding is ahead of the underlying facts, since Alibaba's name is still baked into packages, the Go module path and one registry, and the only confirmed production user is Alibaba's own Lingyang business. The project's own "who is using OpenSandbox" GitHub issue lists other organisations (for example Unicom Digital Technology) as self-reported evaluators, not confirmed production deployments, and a third-party review (Wavect, September 2026) separately warns that the ease of the Docker quickstart should not be read as evidence that the Kubernetes production path is secure by default. There is no sign of open-core gating, a licence change, or a vendor lock-in mechanism: the whole project is Apache-2.0, self-hosted only, with no paid tier to steer users toward.

## 9. Sources

https://open-sandbox.ai
https://github.com/opensandbox-group/OpenSandbox
https://github.com/opensandbox-group/OpenSandbox/blob/main/README.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/GOVERNANCE.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/CONTRIBUTING.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/SECURITY.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/CODEOWNERS
https://github.com/opensandbox-group/OpenSandbox/blob/main/oseps/0002-kubernetes-sigs-agent-sandbox-support.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/docs/guides/secure-container.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/docs/guides/credential-vault.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/docs/examples/opencode.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/docs/examples/codex-cli.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/docs/examples/agent-sandbox.md
https://github.com/opensandbox-group/OpenSandbox/blob/main/docs/public/CNAME
https://github.com/opensandbox-group/OpenSandbox/blob/main/examples/opencode/main.py
https://github.com/opensandbox-group/OpenSandbox/blob/main/examples/codex-cli/main.py
https://github.com/opensandbox-group/OpenSandbox/blob/main/examples/agent-sandbox/main.py
https://github.com/opensandbox-group/OpenSandbox/blob/main/server/opensandbox_server/config.py
https://github.com/opensandbox-group/OpenSandbox/blob/main/server/opensandbox_server/services/runtime_resolver.py
https://github.com/opensandbox-group/OpenSandbox/blob/main/server/opensandbox_server/services/validators.py
https://github.com/opensandbox-group/OpenSandbox/blob/main/components/egress/pkg/policy/always_rules.go
https://github.com/opensandbox-group/OpenSandbox/blob/main/kubernetes/apis/sandbox/v1alpha1/batchsandbox_types.go
https://github.com/opensandbox-group/OpenSandbox/blob/main/kubernetes/apis/sandbox/v1alpha1/pool_types.go
https://github.com/opensandbox-group/OpenSandbox/blob/main/kubernetes/apis/sandbox/v1alpha1/sandboxsnapshot_types.go
https://github.com/opensandbox-group/OpenSandbox/pull/1921
https://github.com/opensandbox-group/OpenSandbox/pull/2057
gh api repos/opensandbox-group/OpenSandbox
gh api orgs/opensandbox-group
WebSearch: OpenSandbox Alibaba release announcement, MarkTechPost, 2026-03-03
WebSearch: OpenSandbox review, Wavect, September 2026
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/projects/k8s-agent-sandbox/report.md
