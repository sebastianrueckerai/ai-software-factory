---
name: E2B
slug: e2b
url: https://e2b.dev
repo: https://github.com/e2b-dev/e2b
category: sandbox-runtime
license: "mixed: Apache-2.0 (runtime, self-host Embed stack), MIT (client SDKs), orchestrator-ee (secrets resolution) closed source"
open_source: partial
self_hostable: partial
hosting_model: E2B Cloud (managed, GCP) | BYOC and private cloud (Enterprise, E2B-operated) | Embed (self-hosted, single node, open source)
company: FoundryLabs, Inc., San Francisco; founded 2023 by Vasek Mlejnsky and Tomas Valenta (Czech); $21M Series A July 2025 led by Insight Partners, $32-48M total raised depending on source
maturity: e2b-dev/e2b (SDKs) 14k stars, 1058 forks, created 2023-03-04; e2b-dev/runtime (infra) 1.6k stars, 451 forks, 214 open issues, created 2023-08-10; both pushed commits on 2026-09-29, per-package releases via conventional commits
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 5
  verification: 0
  policy_outside_model: 3
  identity_per_task: 3
  cost_control: 1
  ux: 2
  reseedable_selfhost: 2
steal:
  - "userfaultfd lazy memory restore + copy-on-write NBD rootfs for pause/resume/fork (e2b-dev/runtime packages/orchestrator/pkg/sandbox/{uffd,rootfs,nbd,block}): the concrete recipe for our own aspirational microVM tier"
  - "secret-marker pattern: store a reference in the control plane, resolve the real value only at point of use, never let it cross an API, a log or a span"
  - "best-of-K node placement with full-jitter backoff on a busy signal (internal/orchestrator/placement/), a small reusable scheduling heuristic"
  - "per-sandbox nftables egress firewall with SNI/Host-inspecting domain allow and deny lists, finer-grained than a static Cilium allowlist"
  - "Embed's preflight discipline: two pinned files, docker compose up, and a failing check prints an actionable FIX: line instead of a stack trace"
differs:
  - "E2B answers only the worker-plane question; copying it replaces one plane at most and leaves signals, verification, merge/deploy and control-plane task state entirely ours to build"
  - "its real production topology (autoscaled node pools, external Postgres/Redis/ClickHouse, GCS/S3, historically Nomad) is heavier than our three-server shape, and is not itself published; Embed is explicitly a single-node evaluation package, not a deployment pattern"
  - "the security feature regulated users care about most, orchestrator-ee's secret resolution, is closed source, which breaks our policy-lives-in-auditable-code principle if we ever depended on it directly"
  - "Firecracker needs /dev/kvm: bare metal or nested virtualization, which our Hetzner Cloud servers do not expose, the same fork in the road our own target-architecture.md already names for its own microVM tier, not a new cost E2B introduces"
ux_verdict: two files and one command to a running Firecracker sandbox in about two minutes beats anything we offer a newcomer, but it is a generic sandbox demo with no task, approval or diff view because there is no task concept.
slop_verdict: real and actively developed (commits today on both repos, 14k/1.6k stars), but its two deployment shapes that matter for a self-operated enterprise (BYOC, private cloud) are Enterprise-only and negotiated, and its own secrets-resolution component is closed source.
---

# E2B

## 1. What it is
E2B (legal entity FoundryLabs, Inc., San Francisco) sells hosted Firecracker microVM sandboxes that AI agents run code, browse or use a desktop in, reached through Python and JavaScript SDKs, a CLI and a REST API. Founded in 2023 by Vasek Mlejnsky and Tomas Valenta, it raised a $21M Series A led by Insight Partners in July 2025. It is metered: a free Hobby tier, a $150/month Pro tier plus usage, and a negotiated Enterprise tier with a $3,000/month minimum that is the only route to BYOC or a private, air-gapped deployment.

The marketing calls it "the Enterprise AI Agent Cloud." The code and docs are more candid: the open-source self-host package, Embed, describes itself in its own README as "a single-machine evaluation package... not a deployment pattern." What E2B actually runs in production (autoscaled node pools, external Postgres/Redis/ClickHouse, object storage) is not what an outside operator can reproduce from the public repo.

## 2. Mapping to our five planes
| Plane / principle | What E2B does | What we do | Verdict |
|---|---|---|---|
| Signals | None: an SDK call is the only input, no issue, alert or telemetry intake | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | Sandbox lifecycle state only: placement, quotas, auth (Postgres, Redis) | Temporal workflow per task, budgets, approvals, audit trail | not comparable |
| Worker plane | One Firecracker microVM per sandbox, own cgroup and netns, pause/resume/fork from a snapshot | One gVisor pod per task, Cilium default-deny egress, read-only rootfs | they lead |
| Verification | None | CI, policy gates, stronger-model review | not comparable |
| Merge and deploy | None | PR merge, Flux GitOps | not comparable |
| Policy outside the model | Egress allow/deny lists and secret markers set through API/config, not by the agent's prompt; no tool-capability policy | Capability rules as a YAML document in Git, enforced in gateway code and network policy | equal (narrow scope) |
| Identity per task | Workload identity gives a sandbox a short-lived token the API never mints as a credential; secrets resolve only at egress, inside closed-source orchestrator-ee | Projected ServiceAccount token per task, verified against the cluster OIDC issuer, per-task virtual key | equal |
| Artifacts not chat | Not applicable: no multi-agent coordination, git is not part of the product | TaskBrief in, branch and PR out, Git as the coordination mechanism | not comparable |

## 3. Architecture and stack
Two repositories matter. `e2b-dev/e2b` (MIT) holds the client SDKs: `packages/python-sdk`, `packages/js-sdk`, `packages/cli`, `packages/code-interpreter-{js,python}`, `packages/desktop-{js,python}`, all thin clients over the control-plane REST API and the in-VM agent. `e2b-dev/runtime` (Apache-2.0, Go 1.26, an 11-module `go.work`) is the actual infrastructure: `packages/api` (Gin, OpenAPI spec in `spec/openapi.yml`) is the control plane; `packages/orchestrator` is the root-privileged binary on every sandbox node that drives Firecracker over its unix-socket HTTP API, restores memory lazily via `userfaultfd`, and backs the rootfs with a copy-on-write NBD block device; `packages/envd` is the in-VM agent the SDKs actually talk to (process, PTY, filesystem, port APIs over Connect RPC); `packages/client-proxy` is the edge router for `<port>-<sandbox>.<domain>` traffic; `packages/db`, `packages/clickhouse`, `packages/auth`, `packages/shared` support it; `packages/nomad-nodepool-apm` is a Nomad autoscaler plugin.

Node discovery for placement supports Kubernetes, DNS, a static list, or, per `docs/ARCHITECTURE.md:702`, "the legacy Nomad backend the code still carries" - Nomad is optional and being retired, not a hard requirement. Storage: Postgres for control state, Redis as the source of truth for running sandboxes, ClickHouse for metrics and events, GCS/S3 for template and snapshot artifacts.

Self-hosting ships as Embed (`embed/`): Docker Compose, Terraform for GCP, Terraform for AWS, or a single-node Kubernetes manifest, all four "single-machine evaluation packages, not deployment patterns" per `embed/README.md`. The hard requirement is Linux with `/dev/kvm` and a 4 KiB-page kernel: bare metal, or a VM with nested virtualization explicitly turned on (GCE `--enable-nested-virtualization`, EC2 `NestedVirtualization=enabled` on types such as `m8i`, or an M3-or-newer Mac's Linux VM). No Hetzner Terraform module ships, and Hetzner Cloud VMs expose no nested virtualization on any shared or dedicated-vCPU line (confirmed by community reports; Hetzner publishes no claim otherwise). Firecracker on Hetzner means a Hetzner dedicated (Robot, bare-metal) server, not a Hetzner Cloud instance, the identical fork our own target-architecture.md already names for its own aspirational microVM tier.

## 4. UX
Cloud path to a first result: install the SDK, get an API key from the dashboard, set `E2B_API_KEY`, call `Sandbox.create()` then `.commands.run()` - four steps, seconds, no infrastructure. Self-hosted path: download two files (`compose.yaml`, `.env`) and run `docker compose up -d --wait`, about two minutes to a ready `base` template on an 8-vCPU host, then the same SDK call. Both are faster to a first result than our stack offers a newcomer, but the result is one generic sandbox, not a finished agent task.

Watching work happens in the open-source web dashboard (port 3001 in Embed): a list of sandboxes and templates, with a terminal and a filesystem inspector per sandbox. There is no task board, no diff view and no approval flow, because there is no task concept to show one for. Intervention is process-level: `kill()`, `pause()`, run another command. Interfaces are the Python/JS SDK, the CLI (template build and management), the REST API and the dashboard; no chat UI.

## 5. Security, identity, sandbox, policy, cost
Sandbox: one Firecracker microVM per sandbox in its own cgroup and network namespace, with a per-sandbox nftables egress firewall carrying SNI- and Host-inspecting domain allow and deny lists, enforced in code.

Identity: "workload identity" mints a short-lived, audience-scoped token for a sandbox without the control-plane API ever minting or holding the underlying credential (the OIDC path is in private beta). Secrets are stored as metadata-only markers and resolved to a real value only at sandbox egress, inside the closed-source `orchestrator-ee` component, never touching the API, a log or a span.

Policy: egress allow/deny lists and secret markers live in API-configured objects, not in the agent's prompt. There is no capability-policy layer for what an agent may ask a sandbox to do beyond running commands; that decision is left to whatever application calls the SDK.

Cost: per-second metered billing for vCPU and RAM. The Hobby tier caps at a one-time $100 credit, 20 concurrent sandboxes and a 1-hour session limit; nothing comparable to a per-task spend hold or ledger exists above that, this is billing, not budget enforcement.

Credentials: the calling application holds one long-lived, team-scoped `E2B_API_KEY`; nothing shorter-lived is exposed to the developer, though the sandbox itself need not hold one under the workload-identity design.

## 6. What we should take from it
Narrow: the userfaultfd-plus-copy-on-write-NBD pause/resume/fork design (`packages/orchestrator/pkg/sandbox/{uffd,rootfs,nbd,block}`) is a concrete reference for whatever we eventually build on the "reserved stronger tier" our own docs already name, before picking between Kata Containers and raw Firecracker. The secret-marker pattern, store a reference and resolve the value only at point of use, never letting it cross an API, log or span, is directly applicable to any secret our gateway proxies beyond model calls, such as commissioned cloud-server credentials. Embed's preflight discipline, two pinned files and a check that fails with an actionable `FIX:` line instead of a stack trace, is a good bar for our own bootstrap scripts.

Broad: Firecracker-grade isolation (a real kernel per sandbox) is a materially stronger security story than gVisor's systrap mode, exactly the gap our own documentation flags as a weakness. E2B's runtime proves this is buildable on ordinary Linux with KVM; what is still missing for us is the hardware, not the design, since Hetzner Cloud exposes no `/dev/kvm`.

## 7. Where our philosophy differs and what that costs or buys us
E2B only ever answers the worker-plane question. Copying it replaces at most our sandbox layer; every other plane, task state, verification, merge and deploy, signals, stays ours to build regardless of this choice.

Its real production topology, autoscaled node pools historically discovered through Nomad, external Postgres, Redis, ClickHouse and object storage, is heavier than our three-server OpenTofu-and-Flux shape, and it is not published: Embed caps at one node and is explicitly not a deployment pattern, so there is component-level code to read but no small-scale production recipe to borrow.

The feature that matters most for a regulated, self-operated deployment, `orchestrator-ee`'s secret resolution, is closed source. Depending on it directly would break our principle that policy lives in auditable code; where we need the same guarantee we already build it ourselves with per-task virtual keys and a sandbox that holds no key material.

Firecracker needs bare metal or nested virtualization, which our Hetzner Cloud cpx42 servers do not provide. This is the same fork in the road our target-architecture.md already prices for its own microVM tier (bare-metal Hetzner or a nested-virt cloud), not a new cost this project introduces; choosing E2B's runtime would mean paying it sooner.

## 8. Red flags and slop assessment
Both repositories carry commits from today (2026-09-29), release automation via conventional commits, and real adoption signals (14k and 1.6k GitHub stars, 1058 and 451 forks). This is not a README-only project.

Open-core gating is explicit and matches the exact pattern our own constraints warn about: the two deployment shapes that matter for a self-operated enterprise, BYOC and private cloud, are Enterprise-only with a $3,000/month minimum and negotiated terms, and the secrets-resolution component referenced throughout the public changelog, `orchestrator-ee`, never appears in the open repository. The enterprise page itself lists SSO, SCIM and RBAC as "planned," not shipped, despite the "Enterprise AI Agent Cloud" positioning.

Independent commentary gathered through web search (not read directly on Hacker News) describes pricing as a recurring complaint and rates a competitor, Daytona, ahead on cold-start latency and openness; treat both as informal and vendor-adjacent, not verified benchmarks. No security incident turned up in the time available: not verified, not confirmed clean. The licence is mixed and worth reading carefully before reuse: Apache-2.0 for the runtime and Embed, MIT for the SDKs, and at least one production-relevant service that is closed source.

## 9. Sources
- https://github.com/e2b-dev/e2b (cloned locally, README.md, packages/ manifests)
- https://github.com/e2b-dev/runtime (cloned locally, README.md, embed/README.md, embed/compose/README.md, DEV-LOCAL.md, docs/ARCHITECTURE.md, packages/nomad-nodepool-apm/README.md and CHANGELOG.md, packages/api/CHANGELOG.md, go.work, LICENSE)
- gh api repos/e2b-dev/e2b (2026-09-29)
- gh api repos/e2b-dev/infra (2026-09-29, resolves to e2b-dev/runtime metadata)
- https://e2b.dev/enterprise (fetched 2026-09-29)
- https://e2b.dev/pricing (fetched 2026-09-29)
- web search: E2B funding, founding, HQ (2026-09-29)
- web search: Hetzner Cloud nested virtualization / KVM support (2026-09-29)
- web search: E2B vs Daytona vs Modal reviews and Hacker News commentary (2026-09-29)
- docs/target-architecture.md (sections on the worker plane and the build VM / microVM discussion)
