---
name: microsandbox
slug: microsandbox
url: https://microsandbox.dev
repo: https://github.com/superradcompany/microsandbox
category: sandbox-runtime
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted by default, no server or daemon; a closed-beta hosted cloud is opt-in
company: Super Rad Company, rebranded in 2026 from Zerocore AI, YC-backed (X26/P26 batch, sources disagree on the exact label), founded 2024, two co-founders (one ex-Cloudflare)
maturity: 8472 stars, 458 forks, 30 contributors, first commit Oct 2024, last commit 2026-09-29, releases weekly (v0.7.4 latest)
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 5
  verification: 0
  policy_outside_model: 4
  identity_per_task: 3
  cost_control: 0
  ux: 4
  reseedable_selfhost: 3
steal:
  - "Secret placeholder substitution at egress: the guest env only ever holds `$MSB_<VAR>`, and the host-side TLS-intercepting proxy swaps in the real credential only when the DNS-pinned destination IP, SNI and HTTP authority all match the secret's allowed host. A real value never enters the VM. Directly applicable anywhere a worker must call a third-party API without routing through factory-gateway."
  - "DNS-to-IP pin set: a domain rule only matches a connection whose destination IP was actually returned by a DNS query for that domain from that sandbox, closing the TOCTOU gap a name-only allowlist leaves open. Worth checking against our own gateway/git/module-proxy egress rules."
  - "`msb doctor` and `msb context`: one command reports virtualization support and fixes, another reports the fully resolved backend and config without ever printing a secret. Good shape for a factoryd debug verb on a task's resolved policy."
  - "Config precedence with a hard-wired top layer: built-in defaults, global config, per-workload YAML, CLI/SDK input, then an administrator `managed.json` that always wins and cannot be weakened by any layer below it. Clean model for keeping our Git-sourced policy always outranking a per-task override."
  - "Restricted in-guest security profile (no_new_privs, drop mount-admin capability, nosuid/nodev on user mounts) as an opt-in knob independent of the network policy. A reusable idea for a pod security tier per capability class once we have more than `coder`."
differs:
  - Single host, no daemon, one trusted operator: each machine keeps its own SQLite catalog (crates/db) of sandboxes, images and volumes, and there is no scheduler, queue or multi-tenant admission control. Adopting it as our worker-plane VMM would not remove the work of building fleet scheduling, per-task namespace/quota and bin-packing across our three Hetzner boxes; it would sit inside a pod, not replace one.
  - Identity is a static, developer-held secret, not a task-scoped credential. Microsandbox stops a bound credential from leaking to the wrong host; it never mints a new, short-lived, audience-scoped credential per workload the way factory-gateway's projected ServiceAccount token does. Copying its secrets model without our own identity layer would be a step back on "identity belongs to the task, not the machine."
  - No budgets, no cost ledger, no verification stage: entirely consistent with being one component rather than a loop, and confirms this project is a worker-plane idea source only, not a control-plane or cost-control one.
ux_verdict: "`curl | sh` then `msb run debian` is a two-command path from zero to a shell inside an isolated microVM, no server to stand up; ahead of our console for a developer driving sandboxes directly, but there is no web UI, task board or approval flow at all."
slop_verdict: Real and shipping weekly (v0.7.4 landed the day this report was written), 30 contributors, used by third parties (Vercel's Eve, a US GSA coding-agent quickstart), but still labelled beta software, the company renamed itself mid-flight (Zerocore AI to Super Rad Company), and its own AGENTS.md documents a real shipped SDK/runtime incompatibility between v0.6.9 and v0.6.10.
---

# microsandbox

## 1. What it is

Microsandbox is an open-source Rust runtime and CLI (`msb`) that boots untrusted workloads in microVMs on a developer's own machine: AI agents, user code, CI jobs, scrapers. It is built by Super Rad Company, a small YC-backed team (rebranded from Zerocore AI during 2026) that also ships an MCP server and an agent-skills package so a coding agent can spin up its own sandboxes. The README frames it as "Docker-like workflows" with "instant startup" and "no setup server, no long-running daemon"; the code backs this up, each sandbox is a per-process libkrun VM launched directly by the CLI or SDK, not a client of some background service. Boot time claims (under 100ms in the README, ~320ms in company benchmarks) are faster in the docs than in independent Hacker News reports, which describe real usage as closer to 200-300ms with higher CPU/RAM overhead than advertised.

The project targets two audiences: developers embedding sandboxes directly in an application (five SDKs: Rust, TypeScript, Python, Go, Ruby) and people who just want an isolated shell (`msb run debian`). A closed-beta hosted "microsandbox cloud" now exists behind a dashboard and API key, but the local runtime is Apache-2.0 and the vendor states it stays free.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. It has no concept of an inbound issue, alert or task. | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | A per-host SQLite catalog (`crates/db`, `crates/migration`) tracks sandbox, image, volume and lease state. No scheduler, queue or approval workflow. | `factoryd` with a Temporal workflow per task, Postgres, policy as YAML in Git | not comparable |
| Worker plane | One microVM per workload via libkrun (KVM/HVF/WHP), OCI images, live snapshot/fork/branch, a per-sandbox user-space network stack | One gVisor pod per task in a Kubernetes namespace, opencode headless, default-deny egress to four destinations | they lead on isolation strength and boot speed, we lead on fleet-scale multi-tenant scheduling |
| Verification | None. | Forgejo Actions, policy gates, stronger-model review | not comparable |
| Merge and deploy | None. | Bot merge, Flux GitOps rollout | not comparable |
| Policy outside the model | Network egress and secret allow-lists enforced in a host-side Rust proxy (`crates/network`), with DNS pinning, SNI and HTTP-authority checks; an administrator `managed.json` always outranks user and CLI settings. | Capability rules as YAML in Git, enforced in gateway code and Cilium NetworkPolicy | they lead on anti-spoofing depth at this narrow scope |
| Identity per task | A static, developer-supplied secret substituted at egress by placeholder; no per-task minting, no OIDC verification. | Per-task projected, audience-scoped ServiceAccount JWT verified by factory-gateway against the cluster OIDC issuer | we lead |
| Artifacts not chat | Not applicable; it has no agent-to-agent coordination model. | TaskBrief in, branch/PR/event stream out | not comparable |

## 3. Architecture and stack

A Rust workspace (see `Cargo.toml`): `crates/cli` is the `msb` binary; `crates/runtime` (`lib/runner/vm.rs`, `bootstrap_fs.rs`, `checkpoint/*`) drives libkrun (vendored as `vendor/libkrunfw`) as the VMM and implements live snapshot, fork and disk checkpointing; `crates/agentd` is the in-guest PID-1 process (a separately built musl binary, per `Dockerfile.agentd`) that speaks a framed protocol over `virtio-console`, implemented with `crates/vsock` and `crates/protocol`; `crates/network` (`lib/engine/network.rs`, `http_deny.rs`, `proxy/socks.rs`) is a from-scratch, smoltcp-based user-space network stack that terminates every guest packet, does TLS interception, DNS rebind/TOCTOU protection and the secret-substitution proxy, all in host code, no host kernel routing or NAT in the path; `crates/db` and `crates/migration` use `sea-orm`/`sqlx` over SQLite for the local catalog (sandboxes, volumes, images, layers, maintenance leases); `crates/image` pulls OCI images. Deployment shape is a single downloadable binary plus language SDKs (`sdk/rust`, `sdk/python`, `sdk/node-ts`, `sdk/go`, plus a Ruby gem) that either shell out to `msb` or embed the runtime; there is no Helm chart or long-running service in the open-source path. The optional hosted "microsandbox cloud" (`docs/cloud/overview.mdx`) exposes the identical SDK/CLI surface against a remote API when `MSB_BACKEND=cloud` and an API key are set, with a documented feature-parity table (custom networking, live snapshots and resource metrics stay local-only). There is no model-routing concept anywhere in the project; agent integration is by worked example only, `docs/examples/agents/opencode.mdx` shows mounting a host project directory into a microVM and running `opencode` (our own coding harness) inside it, with the diff reviewed on the host side of the mount afterwards.

## 4. UX

Zero to a running sandbox is `curl -fsSL https://install.microsandbox.dev | sh` then `msb run debian` (or `npx microsandbox run debian` with no install step at all), one command to an interactive shell inside an isolated VM. The SDK quickstart (`docs/getting-started/quickstart.mdx`) is a 10-line snippet in five languages. Watching a running sandbox is `msb ps`, `msb inspect --format json`, and `msb metrics` for live CPU/memory/network; intervening is `msb exec`/`msb ssh` to attach a shell into a live sandbox, `msb branch` to fork a running VM, and `msb snap create`/`restore` to checkpoint and rewind. There is no web UI, task board, diff view or approval workflow anywhere in the product, it is a CLI and SDK only, which is worse than our console for a non-technical approver but faster for a developer scripting sandboxes directly.

## 5. Security, identity, sandbox, policy, cost

Isolation is enforced in code and hardware: each sandbox is a real microVM with its own kernel, scheduled by KVM/Hypervisor.framework/WHP, reachable from the host only through a fixed set of virtio devices (`docs/security/isolation.mdx`). Policy (egress rules, secret allow-lists) lives entirely in host-side Rust, never in the guest or a prompt; the one thing left to the user is choosing a strict-enough policy and mount set (`docs/security/hardening.mdx`). Credentials live in host process memory and are only ever substituted into outbound requests to a DNS-pinned, SNI-matched, TLS-inspected destination; the guest never holds a real value, though the allowed destination itself does receive it, and the docs are explicit that a compromised host is out of scope. A workload can reach the public internet by default; private ranges, loopback, link-local and cloud metadata (169.254.169.254) are denied unless a custom policy overrides it. Cost control is entirely absent: only vCPU/memory caps and an idle timeout exist, there is no dollar-denominated budget, hold or ledger of any kind.

## 6. What we should take from it

Narrow: the secret-placeholder-with-TLS-aware-substitution pattern is a concrete mechanism to steal wherever a worker must call an external API directly rather than through factory-gateway or LiteLLM, it keeps the spirit of "sandbox holds no key material" even for cases we cannot proxy. The DNS-pin-plus-SNI-check defense against rebinding and TOCTOU is worth auditing our own gateway/git/module-proxy allowlist against, since a name-only allowlist has the same theoretical gap. `msb context`/`msb doctor` are a good shape for a `factoryd` debug verb that prints a task's fully resolved policy without ever leaking a token.

Broad: microsandbox is a working existence proof that a Rust/libkrun microVM runtime can boot in well under a second, which is directly relevant to a weakness we already flagged ourselves ("gVisor on systrap is slow for builds, microVMs need bare metal"). It is worth a spike to see whether this runtime, or the same backend-abstraction approach Vercel's Eve took, could replace gVisor for the CI build-VM case we currently solve with a throwaway Hetzner VM. Its layered config model, with an administrator override that always wins over user and CLI settings, is a clean pattern for making sure our Git-sourced policy can never be shadowed by a per-task flag.

## 7. Where our philosophy differs and what that costs or buys us

Microsandbox is built for one trusted operator on one machine: a local SQLite catalog, no scheduler, no multi-tenant admission control. Using it as our worker-plane VMM would still leave us to build all of the fleet scheduling, per-task namespace and quota, and bin-packing that Kubernetes gives us today, it is a VM launcher, not a substitute for the pod. Its identity model protects a static, developer-held secret from leaking to the wrong host; it has no equivalent of a short-lived, audience-scoped, per-task credential verified against an OIDC issuer. Taking its secrets model as-is, without also building our own identity-per-task layer on top, would weaken rather than strengthen our "identity belongs to the task, not the machine" principle. Neither cost is a reason to skip the isolation mechanism itself, but both mean it would arrive as a component under our existing control plane, not as a replacement for it.

## 8. Red flags and slop assessment

The seed list's repository URL (`github.com/zerocore-ai/microsandbox`) now redirects to `github.com/superradcompany/microsandbox`, the GitHub org and the company both renamed during 2026 (Zerocore AI to Super Rad Company); the project itself shows no slowdown, v0.7.4 shipped the same day this report was written and the last 90 days of commits are dense. `AGENTS.md` documents a real, shipped SDK/runtime incompatibility between v0.6.9 and v0.6.10 that the maintainers accepted rather than patched retroactively, a concrete sign of breakage during fast iteration, not just a boilerplate beta warning. The README's boot-time and performance claims are faster than what Hacker News commenters report from real use. Image pulls are digest-verified but not signature-verified, a supply-chain gap the docs disclose themselves (`docs/security/overview.mdx`). The monetizable half of the product, microsandbox cloud, is proprietary and gated behind a private-beta dashboard; the open-source local runtime carries no such gate today but is the newer, less battle-tested half of the company's roadmap.

## 9. Sources

- https://github.com/superradcompany/microsandbox (cloned to `~/repos/market-research-clones/microsandbox`, HEAD at 2026-09-29 01:41:09 -0400)
- README.md
- AGENTS.md
- Cargo.toml
- docs/security/overview.mdx
- docs/security/secrets.mdx
- docs/security/isolation.mdx
- docs/security/network.mdx
- docs/security/hardening.mdx
- docs/operations/backends.mdx
- docs/operations/configuration.mdx
- docs/cloud/overview.mdx
- docs/enterprise/corporate-networking.mdx
- docs/enterprise/managed-configuration.mdx
- docs/enterprise/offline-deployment.mdx
- docs/getting-started/quickstart.mdx
- docs/examples/agents/opencode.mdx
- crates/agentd, crates/runtime/lib, crates/network/lib, crates/db/lib (directory layout and file names only)
- https://api.github.com/repos/zerocore-ai/microsandbox (gh api, stars/license/dates, 2026-09-29)
- https://api.github.com/repos/zerocore-ai/microsandbox/contributors (gh api, 2026-09-29)
- https://api.github.com/repos/zerocore-ai/microsandbox/releases (gh api, 2026-09-29)
- https://api.github.com/orgs/superradcompany (gh api, 2026-09-29)
- https://news.ycombinator.com/item?id=44135977 (launch thread, accessed via WebSearch 2026-09-29)
- WebSearch: "microsandbox zerocore superrad company funding Y Combinator sandbox microVM" (2026-09-29)
- WebSearch: "microsandbox.dev Hacker News launch discussion" (2026-09-29)
