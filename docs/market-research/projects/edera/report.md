---
name: Edera
slug: edera
url: https://edera.dev
repo: https://github.com/edera-dev/krata
category: sandbox-runtime
license: "mixed: krata GPL-2.0, sprout Apache-2.0, styrolite Apache-2.0, Edera Protect proprietary"
open_source: partial
self_hostable: partial
hosting_model: self-hosted only, per-node commercial licence, official node images for AWS/GCE/Azure/Linode
company: Edera, Seattle WA, founded 2024 by Ariadne Conill, Alex Zenla, Emily Long (CEO, ex-Chainguard); Series A
maturity: krata 328 stars (2024-01 to 2025-07), sprout 297 stars, styrolite 282 stars (both active to 2026-09); Protect 1.0 shipped April 2025, now v1.12.7, 36 releases
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 5
  verification: 0
  policy_outside_model: 0
  identity_per_task: 1
  cost_control: 0
  ux: 1
  reseedable_selfhost: 1
steal:
  - "PV-mode paravirtualisation as working prior art that a per-pod kernel does not require /dev/kvm; worth reading krata's xenclient/xenplatform crates even if we never adopt Edera itself"
  - "am-i-isolated (ghcr.io/edera-dev/am-i-isolated, Rust, 326 stars): a free isolation-posture scanner we can run against our own gVisor sandbox today for an objective score instead of an assumption"
  - "hyperbench: an open benchmark harness comparing hypervisor, interposer and namespace runtimes on raw compute and syscall overhead; run it ourselves against systrap gVisor instead of citing a 2019 USENIX number"
  - "Their agent-sandbox guide's hard lesson: an unset memory limit makes the sandbox default to 1024M and OOM-kill the agent; always set resources.limits.memory on our gVisor pod specs, never rely on an implicit default"
  - "edera-check's preinstall/postinstall/collect CLI pattern: a small readiness-report tool run before and after a node joins the fleet, worth copying as a factoryd node-readiness check"
  - "A single host-level Falco instance covering all zones' eBPF events, instead of one instrumented agent per sandbox; a lighter observability shape than gVisor allows today"
  - "SPIFFE/SPIRE-based per-zone workload identity (their spire-controller-manager fork) is a second working reference point for short-lived, workload-scoped credentials, to compare against our projected ServiceAccount token design"
differs:
  - "The part that actually works (Edera Protect: daemon, CRI, zone image management, installer) is closed source and sold per node on a sales-negotiated, undisclosed price; adopting it for the worker plane reintroduces the single-vendor, opaque-billing dependency we avoid everywhere else"
  - "Edera isolates by replacing the node's boot and kernel layer (Xen dom0 baked into the node image); our gVisor sandbox needs zero node changes. Adopting it means giving up Talos's minimal, extension-only, immutable model for a custom Xen-enabled kernel image with no official Talos integration, not a drop-in RuntimeClass swap"
  - "Edera is built and priced for Fortune-500 and federal multi-tenant and GPU isolation at enterprise scale; our project is a three-node, roughly 210 EUR/month commodity setup, a budget tier Edera's go-to-market does not appear to serve"
ux_verdict: Infra-ops UX (kubectl, Helm, edera-check reports), not agent UX; no dashboard, no task view, because it solves a different problem than ours
slop_verdict: Real, funded, audited (Trail of Bits, zero high/medium findings) and actively shipping (v1.12.7, 36 releases since April 2025), but the interesting core is closed, undisclosed-priced and enterprise-sales-led, and the only performance numbers anywhere trace back to the vendor's own arXiv paper
---

# Edera

## 1. What it is

Edera is a Seattle security startup (founded 2024, Series A, about 20 million USD raised as of February 2025) that sells "Edera Protect": a Kubernetes `RuntimeClass` that runs every pod inside its own lightweight VM, called a zone, each with a dedicated Linux kernel, instead of sharing the node's kernel through namespaces and cgroups. It is sold to platform and security teams that need hard multi-tenancy: regulated enterprises, GPU providers renting capacity to multiple tenants, and, since 2025, teams running autonomous AI agents that execute untrusted, non-deterministic commands.

The makers claim Edera gives "near-native speed and full Kubernetes compatibility" with "no shared kernels, no shared blast radius," achieved through a Xen-derived type-1 hypervisor rewritten largely in Rust that does not require hardware virtualisation extensions. The repositories and docs substantiate the architecture claim (the isolation mechanism is real and technically distinct from gVisor and Kata) but not the performance claim independently: every concrete number on the public web, including Edera's own docs, traces back to one arXiv paper co-authored by Edera's CTO, compared only against Docker, not against gVisor or Kata on the same hardware.

## 2. Mapping to our five planes

| Plane / principle | What Edera does | What we do | Verdict |
|---|---|---|---|
| Signals | Nothing; no issue, alert or telemetry intake | Forgejo webhooks, SigNoz alerts, factoryd intake | not comparable |
| Control plane | A per-node daemon and CLI manage zone lifecycle, CPU/memory pinning and image caching; no task registry or workflow | Temporal workflow per task, Postgres, policy in Git | not comparable |
| Worker plane | Runs the actual pod inside a zone: separate kernel, memory and device boundaries, enforced by the hypervisor, not by namespaces | gVisor pod on Talos node, opencode harness, default-deny egress | they lead on kernel-level isolation strength, if it runs on our infrastructure at all (not verified on Hetzner or Talos); not comparable on everything else a worker needs (harness, egress policy, artifact handoff) |
| Verification | None; a zone is not a CI system or a review gate | Forgejo Actions, policy gates, stronger-model review | not comparable |
| Merge and deploy | None | Bot merge, Flux, staged rollout | not comparable |
| Policy outside the model | N/A; Edera has no model in the loop. Kubernetes admission (Kyverno) still decides which pods get the `edera` RuntimeClass, which is policy-in-code, consistent with our principle but unrelated to agents | Capability policy in Git, enforced in gateway and network policy | not comparable |
| Identity per task | Ships SPIFFE/SPIRE workload identity for zones (a forked `spire-controller-manager`); explicitly states it does not protect credentials an agent already holds or its network destinations | Projected, audience-scoped ServiceAccount token per task, verified by factory-gateway | equal in spirit for infrastructure identity, not evaluated for our task-credential model |
| Artifacts, not chat | N/A; Edera never sees agent output, only the process boundary around it | TaskBrief in, branch and PR out | not comparable |

## 3. Architecture and stack

Everything is Rust except the guest kernel (stock Linux) and the demo/tooling glue (Python, TypeScript, shell). Three open repositories make up the visible stack, all cloned to `~/repos/market-research-clones/`:

- **krata** (`edera-dev/krata`, GPL-2.0, created 2024-01-08, last push 2025-07-03): "a Xen control-plane in Rust." Crates under `crates/xen/` (`xenclient`, `xenplatform`, `xengnt`, `xencall`, `xenstore`, `xenevtchn`) reimplement the pieces normally supplied by upstream `libxl`/`xl` in memory-safe Rust. `technical-overview.md` in the repo states plainly that zones "are paravirtualized using the Xen PV protocol... no hardware virtualization required. But when hardware support is available (e.g., on x86 with VT-x), Edera uses it." `FAQ.md` gives the reason for choosing Xen over KVM: "a type-1 hypervisor... provides a minimal attack surface upon which less-trusted guests can be launched on top of," and describes an in-progress move away from Xen's netback driver toward direct userspace networking for security.
- **sprout** (`edera-dev/sprout`, Apache-2.0, created 2025-10-01, pushed 2026-09-26, so still under active development): a Rust UEFI bootloader that chainloads the host into the Xen hypervisor at boot, configured by a `sprout.toml` file rather than GRUB's Turing-complete config language. It supports Secure Boot.
- **styrolite** (`edera-dev/styrolite`, Apache-2.0, created 2025-02-06, pushed 2026-08-25): "a programmable sandboxing tool," the OCI-adjacent container runtime embedded inside each zone's initramfs (`/bin/styrolite`), used by the zone's own init (`/bin/zone`) to start and manage containers from inside the zone, without a separate `containerd`/`runc` process. It leverages Linux namespaces for container-within-zone separation; styrolite is not itself the multi-tenant isolation boundary, the zone kernel is.

The actual product that ships to customers, referred to across the docs as "Edera Protect", "the Edera daemon," "the Edera CRI," and the node installer/AMI, is not in any public repository. What is public is supporting tooling: `edera-check` (a Rust CLI, `preinstall`/`postinstall`/`collect` subcommands, published to crates.io, for validating a node before and after install), `am-i-isolated` and `hyperbench` (isolation-posture and performance benchmarking tools, both distributed as OCI images), `linux-kernel-oci` and `xen-oci` (build the guest kernel and Xen itself into OCI images for zone consumption), a Xen fork, a QEMU fork, a Cloud Hypervisor fork and a `virtiofsd` fork (the latter three line up with the incoming KVM backend, see below), and a `spire-controller-manager` fork for SPIFFE/SPIRE workload identity. None of these amount to a working "Protect" you could assemble yourself; the daemon, the CRI plugin and the zone orchestration logic are absent.

Deployment shape: a zone consumes OCI images for its kernel, init and any driver zone (shared services like networking), unpacked by the (closed) Edera daemon at zone start. Installation is "baked into the node image at build time" (Edera's own comparison against Kata), via an Edera-maintained AMI for AWS, or equivalent images for GCE, Azure Linux and Linode. Kubernetes plumbing is a standard `RuntimeClass` object (`handler: edera`) plus `runtimeClassName: edera` on the pod spec; Kyverno can inject the field automatically. No files were found describing how Edera talks to LLM providers, because it does not: it isolates whatever process runs inside the pod, model-agnostic.

## 4. UX

There is no chat or web console. The path from zero to a first isolated pod, per the docs and FAQ: install via the Edera AMI or an install guide for your managed Kubernetes (EKS, GCE, Azure Linux, Linode), confirm with `kubectl get runtimeclass edera`, add `runtimeClassName: edera` to a pod spec, apply it, and confirm isolation by diffing `kubectl get node -o ... kernelVersion` (suffixed `-edera`) against `kubectl exec <pod> -- uname -r`. For the AI-agent use case specifically, the guide additionally requires setting `resources.limits.memory` (otherwise the zone silently caps at 1024M and OOM-kills the agent) and a `dev.edera/cpu` annotation for multi-core agents.

Watching and intervening happens through ordinary Kubernetes tooling: `kubectl logs`, `kubectl exec`, Prometheus-style per-zone and per-hypervisor metrics, and an optional single host-level Falco instance for eBPF-based auditing across all zones (gVisor cannot offer this, since its Sentry process is not a real kernel). There is a CLI (`edera` / `edera-check`) for host-level operations and a system report generator for support cases. This is platform-engineer UX, not end-user or agent-operator UX: it assumes someone comfortable with Kubernetes primitives, not a task board. It is easier than our console in one narrow sense (verifying isolation is a two-command diff), and has nothing comparable to our kanban board, approval lane or per-task cost view because it solves a different, lower-level problem.

## 5. Security, identity, sandbox, policy, cost

**Sandbox.** The isolation boundary is the hypervisor plus a fully separate zone kernel, not the host kernel's namespaces. Docs state plainly: "code running inside a zone cannot escape the zone to reach the host node or other zones," and that classic container-escape techniques (`/proc/1/root` traversal, `nsenter`) "fail because there is no shared kernel to exploit." `hostNetwork: true` pods are rejected outright as breaking the isolation model; `hostPID`/`hostIPC` are silently ignored; `hostPath` and `privileged` are honoured (the boundary holds, but the attack surface widens, by the docs' own admission).

**Identity.** SPIFFE/SPIRE-based workload identity exists for zones (their own fork of `spire-controller-manager`), addressing infrastructure identity. The AI-agent isolation page states its own limits directly: Edera "does not protect API credentials the agent holds" or "outbound network destinations." Credential brokering and egress policy are explicitly left to the operator, the same division of labour our design already assumes (policy and credentials live outside the sandboxed process).

**Policy.** Kubernetes admission (Kyverno, OPA, or the Restricted Pod Security Standard) decides which workloads get the `edera` RuntimeClass; Edera enforces the boundary once assigned but does not itself gate anything by policy.

**Cost.** No task-level or spend-level cost control exists; this is infrastructure, not an agent budget system. Commercial cost is a per-node licence, two tiers (Starter, Enterprise) sold directly or through an AWS Marketplace listing; no public per-node price was found in the marketplace listing, Edera's site, or third-party trackers, only that enterprise pricing is negotiated ("request a private offer").

**Independent verification.** Trail of Bits ran a four-engineer-week assessment in September-October 2025 (source: Edera's own blog post; the full report is not public, available "on request") and reported zero high- or medium-severity findings, 15 low/informational findings related to input validation and defence in depth. This is real third-party scrutiny, but only Edera's summary of it is public.

## 6. What we should take from it

**Narrow (copy this month).** Run `am-i-isolated` (`ghcr.io/edera-dev/am-i-isolated`) against our own gVisor pods; it is free, open, and gives an objective isolation score instead of an assumption. Run `hyperbench` the same way to get our own syscall/compute overhead numbers for systrap gVisor, rather than citing a 2019 USENIX figure that predates systrap. Adopt their agent-sandbox lesson directly in our own pod specs: never let a coding-agent sandbox run without an explicit memory limit, because an implicit default silently caps and OOM-kills. Their `edera-check preinstall`/`postinstall`/`collect` CLI shape is a small, worth-copying pattern for a factoryd node-readiness check run before a gVisor or build-VM workload is scheduled onto a node.

**Broad (shape, priorities, a problem we under-invest in).** Edera treats "does this sandbox survive a kernel exploit, not just a container escape" as the central question, and backs that with a paid third-party audit. Our own weak-spot list already names "gVisor on systrap is slow for builds" and "microVMs need bare metal" as open problems; Edera is direct evidence that a third architecture exists (paravirtualised, no-VT-x-required VM-per-pod) that is worth tracking even though it is not something we can adopt today. If Edera or an equivalent ever ships a working, open, Talos-compatible install path, it would directly answer our own stated weakness better than gVisor does today.

## 7. Where our philosophy differs and what that costs or buys us

The product that actually does the isolating is closed source and sold per node at an undisclosed, sales-negotiated price. Our constraint is "best-of-breed open source... with an escape hatch if gated behind an enterprise tier"; Edera's core value is the enterprise tier from day one, with only supporting tooling (krata, sprout, styrolite, the benchmarking and validation utilities) public. Adopting it for our worker plane would mean depending on a single vendor for the one thing standing between an autonomous coding agent and the host kernel, with no way to inspect, patch, or fork the actual enforcement code if the vendor changes terms or shuts down. That is exactly the dependency our open-source constraint exists to prevent.

Edera secures isolation by owning the node's boot layer: their bootloader (sprout) chainloads into their hypervisor (Xen, via krata) before the node's own kernel ever starts, and the whole stack ships baked into a node image. Talos Linux, our chosen node OS, is deliberately the opposite: immutable, no general package manager, extensibility only through narrow, vetted "system extensions." No official Talos integration exists; the only trace found was a September 2024 social-media aside pointing at a GitHub issue, not a shipped extension. Getting Edera running on our nodes would mean replacing Talos's boot and kernel model with a custom Xen-dom0-enabled image on an unsupported, "email support to validate" path, a foundational rework of the node layer rather than a RuntimeClass swap. This is a real, unresolved incompatibility, not a paperwork gap.

Even setting aside the licence and Talos questions, Edera is architected and priced for Fortune-500 and federal multi-tenant and GPU isolation (its AWS GovCloud and Carahsoft partnership, and pricing sold as "Starter/Enterprise" per node with no public number, both point the same way). Our project runs on three Hetzner cpx42 servers for about 210 EUR a month; nothing in Edera's public pricing signalling suggests that scale is a market they are built to serve cheaply, even if the technology worked on our infrastructure unmodified.

## 8. Red flags and slop assessment

Edera is real and actively shipping: three open repositories with commits within the last five weeks of this report (sprout 2026-09-26, styrolite 2026-08-25), a product at v1.12.7 across 36 tracked releases since its April 2025 launch, a funded and staffed team (Series A, about 20 million USD by February 2025; one third-party tracker claims 26.4 million USD total by mid-2026, not independently verified), and a paid third-party security audit with a public summary.

Two things temper that. First, the company reversed a stated security position: for roughly two years Edera argued Xen's type-1 design was categorically more secure than KVM ("Linux's built-in KVM is described as a general-purpose hypervisor with an expanded attack surface" per its own FAQ), then announced at KubeCon EU 2026 that it is adding a KVM backend for summer 2026 because "customers are demanding" it (The New Stack). That KVM backend requires VT-x/AMD-V like Kata does, so it does not help the exact problem (Hetzner cpx with no `/dev/kvm`) this report was written to answer; the PV/Xen path remains the only relevant one for us, and it is the older, not the newer, half of their roadmap.

Second, every performance number in circulation, Edera's own docs, its FAQ, its blog, and every trade-press writeup found, traces back to one arXiv paper ("Goldilocks Isolation," arXiv:2501.04580) co-authored by Edera's own CTO, comparing Edera only against Docker (0.9% slower CPU, 0-7% faster memory, 3% faster average syscalls, +648ms boot time versus Docker's 177.4ms), not against gVisor or Kata on the same hardware. No independent, hands-on third-party benchmark of Edera versus gVisor or Kata was found. A machine-generated paper review (pith.science) flagged the same gap: numbers lack detail, and isolation itself is not empirically tested in the paper. Treat "near-native performance" as a vendor claim, not a demonstrated fact.

## 9. Sources

- https://edera.dev (fetched 2026-09-29)
- https://docs.edera.dev (fetched 2026-09-29)
- https://docs.edera.dev/sitemap.xml (fetched 2026-09-29)
- https://docs.edera.dev/technical-overview/concepts/edera-vs-kata/ (fetched 2026-09-29)
- https://docs.edera.dev/technical-overview/concepts/edera-vs-gvisor/ (fetched 2026-09-29)
- https://docs.edera.dev/technical-overview/concepts/ai-agent-isolation/ (fetched 2026-09-29)
- https://docs.edera.dev/guides/deployment/agent-sandbox/ (fetched 2026-09-29)
- https://docs.edera.dev/support/faq/ (fetched 2026-09-29)
- https://docs.edera.dev/technical-overview/security/security-model/ (fetched 2026-09-29)
- https://docs.edera.dev/reference/release-notes/ (fetched 2026-09-29)
- https://docs.edera.dev/technical-overview/architecture/kvm/ (via search snippet, 2026-09-29)
- https://docs.edera.dev/technical-overview/architecture/overview/ (via search snippet, 2026-09-29)
- https://arxiv.org/abs/2501.04580 (fetched 2026-09-29)
- https://news.ycombinator.com/item?id=43492596 (2025-03, via search)
- https://thenewstack.io/edera-adds-kvm-support/ (2026-03-25, via search)
- https://www.themoonlight.io/en/review/goldilocks-isolation-high-performance-vms-with-edera (via search)
- https://pith.science/paper/2501.04580 (via search)
- https://virtualizationreview.com/articles/2026/03/13/why-edera-is-betting-on-micro-vms.aspx (via search)
- https://edera.dev/stories/series-a (via search)
- https://siliconangle.com/2025/02/25/edera-raises-15m-expand-workload-isolation-technology-ai-security/ (via search)
- https://edera.dev/stories/security-built-into-our-dna-how-edera-achieves-enterprise-grade-protection (via search)
- https://aws.amazon.com/marketplace/pp/prodview-5gyboc6vhso2q (via search, pricing tiers)
- GitHub API: https://api.github.com/repos/edera-dev/krata, /sprout, /styrolite, /protect-webhook, https://api.github.com/orgs/edera-dev/repos (fetched 2026-09-29)
- Clone: ~/repos/market-research-clones/edera-krata (README.md, FAQ.md, technical-overview.md, crates/ layout, git log)
- Clone: ~/repos/market-research-clones/edera-sprout (README.md, crates/ layout, git log)
- Clone: ~/repos/market-research-clones/edera-styrolite (README.md, top-level layout, git log)
- https://raw.githubusercontent.com/edera-dev/edera-check/main/README.md (fetched 2026-09-29)
- https://raw.githubusercontent.com/edera-dev/am-i-isolated/main/README.md (fetched 2026-09-29)
- https://raw.githubusercontent.com/edera-dev/hyperbench/main/README.md (fetched 2026-09-29)
- https://raw.githubusercontent.com/edera-dev/isolation-for-agentic-ai/main/README.md (fetched 2026-09-29)
- https://raw.githubusercontent.com/edera-dev/xen-oci/main/README.md (fetched 2026-09-29)
- https://raw.githubusercontent.com/edera-dev/protect-webhook/main/README.md (fetched 2026-09-29)
