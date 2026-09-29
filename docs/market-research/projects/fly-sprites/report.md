---
name: Fly.io Sprites
slug: fly-sprites
url: https://sprites.dev
repo: none
category: sandbox-runtime
license: proprietary
open_source: no
self_hostable: no
hosting_model: hosted SaaS on Fly.io's own infrastructure only, no self-hosted option
company: Fly.io, San Francisco (Crunchbase says Chicago), founded 2017, Series D $25M Aug 2026 co-led by Dell Technologies Capital and Intel Capital, about $135.5M raised in total
maturity: Sprites launched Jan 2026, no public repo or stars for the core product, docs and blog updated through Sep 2026, four Sprites API incidents logged on Fly's own infra log in 2026 including a roughly 20-hour one on 23-24 Sep
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 4
  verification: 0
  policy_outside_model: 2
  identity_per_task: 3
  cost_control: 2
  ux: 3
  reseedable_selfhost: 0
steal:
  - Checkpoint/restore of the sandbox filesystem as an agent-callable tool, distinct from git, with the last few checkpoints mounted read-only for inspection.
  - DNS REFUSED fast-fail on a denied egress domain instead of a hanging connect, a small legibility win over a silent network-policy drop.
  - Connectors' "test this connection before an agent run" step in the control plane, worth copying for our own gateway-held git and cloud tokens.
  - A pre-installed agent skill file that teaches the harness the sandbox's gateway conventions at boot, instead of relying on prompt text in the TaskBrief.
  - The storage split (fast local cache in front of durable object storage, metadata kept small and shipped via Litestream) as a reference for a future microVM-tier design.
differs:
  - Egress is open by default; ours forbids by default. Their DNS-allowlist mechanism is portable, their default is not.
  - A Sprite is a persistent, reusable machine with save points; our sandbox is disposable per task, recreated from git plus findings. Copying checkpoint/restore does not require copying persistence-as-default.
  - No task, approval or policy-version concept exists at all. It can only ever replace the pod/VM under one task's sandbox, and only if we hosted on Fly.io rather than Hetzner and Talos, which the no-vendor-lock-in constraint rules out.
ux_verdict: Fast and pleasant for one machine (CLI, SDKs, MCP, preinstalled agent plugins), but no multi-task oversight view, no diff view, no per-action approval, intervention is "restore a checkpoint."
slop_verdict: Real and used in anger, but young and still finding its shape; a founder-admitted "skunkworks" project pivoted into the company's main focus after a funding round, with a rougher-than-average 2026 uptime record for a service meant to hold an agent's only copy of its state.
---

# Fly.io Sprites

## 1. What it is
Sprites (sprites.dev) is Fly.io's hosted product for renting persistent Linux virtual machines by the hour, marketed as "computers for agents" rather than throwaway sandboxes. Fly.io is a commodity-cloud-hosting company, founded 2017, roughly $135M raised through an August 2026 Series D that named a former Docker CEO to run the company with Sprites as its focus. The makers claim an agent gets root on a full Linux box with checkpoint/restore, DNS-based egress control and a "Connectors" mechanism so it never sees a real API key. The docs and API back most of this. One claim does not fully hold together: the marketing pages (fly.io/sprites/yolo-mode) name Firecracker, while the founder's own engineering write-up (fly.io/blog/design-and-implementation) says only that Sprites run on Fly Machines, "OCI containers repackaged as KVM micro-VMs," and never mentions Firecracker. Treat the hypervisor as "some KVM micro-VM," not confirmed Firecracker. There is no public repository for the core product (repo: none, per the seed table and confirmed by search); the one open-source artifact found is a plugin, superfly/sprites-adk, for Google's Agent Development Kit.

## 2. Mapping to our five planes
| Plane / principle | What Sprites does | What we do | Verdict |
|---|---|---|---|
| Signals | None. No issue, alert or telemetry intake | Forgejo webhooks, SigNoz alerts, intake API | not comparable |
| Control plane | A thin API and dashboard for one VM's lifecycle: create, checkpoint, restore, connector and network-policy CRUD. No task registry, no scheduler, no approval workflow | factoryd with a Temporal workflow per task, Postgres task state, policy in Git, human approvals | not comparable |
| Worker plane | One persistent, checkpointable KVM micro-VM per Sprite, reusable across sessions for as long as it is billed | One disposable gVisor pod per task, destroyed after use; microVMs reserved for bare metal | they lead on isolation strength (real kernel per VM), we lead on disposability and default-deny |
| Verification | None | Forgejo Actions, policy gates, reproduction gate, model review | not comparable |
| Merge and deploy | None | Bot merge after approval, Flux GitOps rollout | not comparable |
| Policy outside the model | Network policy is a JSON document applied through the API and enforced by DNS resolution outside the agent's control; default with no policy is fully open | Capability YAML in Git, enforced in gateway code and Cilium network policy, default deny | equal mechanism, we lead on default (axis: policy_outside_model = 2) |
| Identity per task | Connectors keep provider credentials in Fly's control plane; the agent calls through a gateway path keyed by connection id, the key is attached server-side | A projected, kubelet-rotated ServiceAccount token per task, mapped by the gateway to the task row, plus two per-session Forgejo tokens | equal design goal, ours is finer-grained: per task, not per Sprite or org (axis: identity_per_task = 3) |
| Artifacts not chat | Not applicable; a Sprite is a machine an external harness drives, no inter-agent exchange | TaskBrief in, branch, PR and event stream out | not comparable |

## 3. Architecture and stack
Everything below comes from Fly's own blog and docs, not from source code, since none is public; mark it as vendor-disclosed. Storage is a heavily modified JuiceFS with a rewritten SQLite metadata backend, made durable with Litestream, on top of S3-compatible object storage (Tigris). A sparse 100GB NVMe volume acts as a dm-cache-like read-through cache in front of it; chunks are immutable, so checkpoint and restore "merely shuffle metadata around" and land in about one second. Compute runs on Fly Machines, described as OCI containers repackaged into KVM micro-VMs; each Sprite boots one inner container so it can restart without a full VM reboot, even on a checkpoint restore. Public networking uses Corrosion, Fly's gossip-based service discovery, with HTTPS terminated at Fly's edge and an incoming request waking a sleeping Sprite. The API surface is api.sprites.dev/v1 (bearer token auth), SDKs for JavaScript (@fly/sprites), Go, Python and Elixir, a CLI (sprite exec, sprite console, sprite restore), an MCP server, and preinstalled plugins for Claude Code, Cursor, Codex and Gemini CLI. There is no deployment shape to read (no Helm chart, no docker-compose, no self-hosted binary); an "open-source local Sprite runtime" is described as in development, not shipped.

## 4. UX
Zero to first result is short: install the CLI, log in, sprite create, then sprite exec or sprite console. About three or four commands, or none at all if a user just points an already-installed coding agent's plugin at a Sprite, since Claude Code, Codex and Gemini CLI come preinstalled and Sprite-aware. While the agent works, a human watches through a shell (sprite console) or the dashboard; the product's own copy recommends stepping away ("Go make lunch") rather than approving each action. Intervention is coarse: restore a checkpoint if something goes wrong, tighten the network policy, or revoke a Connector. There is no per-action approval UI, no live diff view, and no multi-task timeline comparable to a kanban board. This beats our console on single-machine ergonomics (a roughly 300ms checkpoint beats waiting on a fresh pod) and loses to it on oversight of many concurrent tasks, which Sprites does not attempt.

## 5. Security, identity, sandbox, policy, cost
Sandbox: each Sprite is a KVM micro-VM (a Fly Machine); user code runs in an inner container inside the VM, while Fly's own services (storage, port forwarding, orchestration) occupy the VM's root namespace. This is a real kernel boundary, stronger than our gVisor-on-systrap pods on cloud servers without /dev/kvm, and validates microVMs as the tier we already named as our own reserved stronger option once bare metal pays for itself.

Identity: Connectors hold provider credentials in Fly's control plane; the agent calls a gateway path (for example OPENAI_BASE_URL=.../gateway/openai/<connection_id>/v1) and the real key is attached server-side, matching our "sandbox holds no key material" principle, though the credential is scoped to a Sprite or an organisation, not minted fresh per task the way our ServiceAccount token is.

Policy: network egress is a DNS allow/deny list applied from outside the Sprite and mounted read-only inside it at /.sprite/policy/network.json, so the agent can see but not rewrite it. The default with no policy applied is fully open: "a Sprite can resolve and reach any domain." That is the opposite of our default-deny stance.

Cost: pure metered billing (CPU-hour, RAM-hour, storage), scale-to-zero when idle, optional monthly plans with allowances. There is no described spend hold, no per-task budget enforced mid-call, and no cost ledger tied to a unit of work. A runaway Sprite is bounded only by the account's own compute spend, not by a policy the platform enforces.

## 6. What we should take from it
Narrow, copyable this month: agent-callable filesystem checkpoint/restore separate from git, with recent checkpoints mounted read-only for inspection, cheap to add to our worker image before a risky operation. DNS REFUSED on a denied domain instead of a silent drop, worth adopting in our own Cilium/CoreDNS config so an agent gets a fast, legible failure. The Connectors "test this connection" step is a good console feature to copy for our own gateway-held git and cloud tokens. A preinstalled agent skill file that teaches the harness our gateway's conventions at sandbox boot is lower effort than encoding the same thing in every TaskBrief.

Broad: Sprites bets that persistence plus checkpoint/restore beats pure disposability for a human sitting with a coding agent. Our worker plane always throws the pod away and resumes from git plus findings, which is right for auditable, CI-grade tasks, but a "resume this exact machine, memory and all, from ten minutes ago" mode has no equivalent in our design and might matter if we ever build an interactive pair-with-the-agent mode. Not worth trading disposability for today, but worth naming as a gap.

## 7. Where our philosophy differs and what that costs or buys us
Default-open egress is a direct contradiction of our "network forbids by default" principle. Their DNS-allowlist mechanism is portable to our design, their default is not: we would have to always ship a strict policy at creation time, which we already do, so nothing here should tempt us into a looser default.

Sprites has no notion of a task, an approval, or a policy version. It cannot replace factoryd, Temporal or policy-as-Git; at most it could replace the pod or VM under one task's sandbox, and only if we hosted on Fly.io's infrastructure instead of Hetzner and Talos, a vendor-specific step our commodity-hardware constraint rules out. Their isolation is stronger than gVisor-on-systrap purely because they have KVM available on every host; we already know this and named microVMs (Kata Containers or Firecracker) as our own reserved stronger tier once bare metal justifies it. Sprites is evidence that tier works in production, not a reason to switch clouds to get it.

Persistent-by-default machines carry a different cost shape than our per-task, per-day, per-project envelope with holds. Simon Willison estimated about $655 per month to keep one Sprite maxed out around the clock. We would have to bolt our own budget ledger on top of a platform like this rather than inherit one.

## 8. Red flags and slop assessment
Fly's own infra log records four Sprites API incidents in 2026: a roughly 20-hour partial outage spanning 23-24 September, a 2 September partial outage from SQLite control-plane database eviction, a March authentication bug affecting organisations with numerically-prefixed names, and a February regional outage blocking new Sprite creation in IAD. A third-party analysis of the September incident (bex.co) argues that checkpoint-and-restore persistence is "cold comfort when the API that manages the checkpoints is erroring." This is a young dependency with real operational risk for anything beyond exploratory use.

Fly founder Kurt Mackey wrote in July 2026 that Sprites began as a "skunkworks project" during a company "identity crisis"; the company then raised a Series D and installed a new CEO around making Sprites the focus, which reads as a strategically-pivoting product rather than a settled one. Marketing copy names Firecracker; the engineering blog names only "KVM micro-VMs" and never Firecracker, an unresolved discrepancy, not verified which is accurate. There is no public source for the core product and no Sprites-specific compliance scope confirmed (a competitor, Blaxel, raised this point, so weight it accordingly, but Fly's own docs do not contradict it either).

Verdict: real and used in anger, evidenced by an independent (if Fly-sponsored) endorsement from Simon Willison, a Hacker News discussion, and a paying customer base, but still young and rockier than average on uptime for a service meant to hold an agent's only copy of its working state.

## 9. Sources
- https://sprites.dev (redirects to https://fly.io/sprites), fetched 2026-09-29
- https://fly.io/sprites, fetched 2026-09-29
- https://fly.io/blog/design-and-implementation/, fetched 2026-09-29
- https://docs.fly.io/sprites/concepts/networking/ (docs.sprites.dev redirects here), fetched 2026-09-29
- https://fly.io/sprites/yolo-mode/, fetched 2026-09-29
- https://simonwillison.net/2026/Jan/9/sprites-dev/, fetched 2026-09-29
- WebSearch: "Fly.io Sprites sandbox agents sprites.dev", 2026-09-29
- WebSearch: "Fly.io Sprites docs Connectors pricing checkpoint restore API", 2026-09-29
- WebSearch: "Fly.io company funding headquarters founded history", 2026-09-29
- WebSearch: "Fly.io Sprites security incident OR outage OR criticism 2026", 2026-09-29
- No repository to clone: seed table lists repo: none for fly-sprites, confirmed by search (only a community ADK plugin, github.com/superfly/sprites-adk, is public)
