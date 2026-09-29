---
name: Modal Sandboxes
slug: modal-sandboxes
url: https://modal.com/docs/guide/sandbox
repo: none
category: sandbox-runtime
license: "mixed: proprietary SaaS platform, Apache-2.0 modal-client SDK"
open_source: no
self_hostable: no
hosting_model: cloud only, Modal-hosted SaaS, no self-hosted or BYOC option
company: Modal Labs, private, HQ New York, founded 2021 by Erik Bernhardsson and Akshat Bubna, roughly 150 staff, 466M+ USD raised through a May 2026 Series C at 4.65B USD, in talks for a further round near 15.75B USD as of 2026-09-28 (unconfirmed)
maturity: no public repo for the product engine; Sandboxes went GA 2025-01-21 after a year in beta; modal-client SDK is Apache-2.0 on PyPI, current line 1.0.x; company blog and docs updated through 2026-09
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 4
  verification: 0
  policy_outside_model: 2
  identity_per_task: 3
  cost_control: 2
  ux: 3
  reseedable_selfhost: 0
steal:
  - "The three-tier outbound egress model: block_network for a full cutoff, outbound_cidr_allowlist for IP/CIDR ranges, and outbound_domain_allowlist (beta) that matches on TLS SNI without decrypting traffic, the two allowlists additive. Our Cilium egress policy could adopt the same SNI-domain-match shape instead of hand-maintained CIDR lists for third-party API domains."
  - "Runtime policy hot-swap (alpha): a running sandbox's outbound allowlist can be replaced in place, with now-disallowed connections torn down immediately, no pod restart. A direct fit for our supervisor's redirect action: tighten a task's egress the moment a stall or anomaly detector fires, instead of killing and rescheduling the pod."
  - "Connect Tokens for tunnel access: an authenticated path to a sandboxed HTTP server that injects an unspoofable X-Verified-User-Data header, cheaper than standing up mTLS or full OIDC for a narrow, short-lived callback from inside a sandbox to a caller."
  - "Filesystem snapshot to persist and fan out sandbox state past the normal lifetime cap, the same idea as Kubernetes SIG agent-sandbox's golden warm pool but shipped as a documented product primitive. Relevant to our supervisor's retry-on-stronger-model path: resume from exact filesystem state rather than replaying the task from the branch tip."
  - "Sidecar egress relay (proxy_traffic_via_sidecar) that centralises TLS-port-443 policy and logging for one process without terminating and re-encrypting traffic, an option if we ever want one egress audit point without breaking end-to-end TLS."
differs:
  - "The whole product is a closed, cloud-only SaaS with no self-hosted or BYOC path; the execution engine, scheduler and file system are proprietary and run only on Modal's own infrastructure. This is the direct opposite of our re-seedable, commodity-hardware constraint. Nothing here can be adopted as infrastructure, only copied as a design pattern."
  - "No task or workflow concept, the same gap as every other sandbox-runtime project reviewed: an App and a Sandbox are a compute primitive, not a unit of work with retries, approvals or an audit trail. Taking Modal on, hypothetically, would still leave 100 percent of our control plane (task state, scheduler, policy, budgets, cost ledger) to build ourselves."
  - "The execution environment is defined at runtime through Modal's own Image API (a Python builder chained onto modal.Image), not an arbitrary Dockerfile or OCI image. Northflank's review calls this out as inflexible next to E2B or Daytona. It is a vendor-specific coupling our no-vendor-specific-service constraint rules out even before the self-hosting question comes up."
ux_verdict: Four lines of Python from pip install to a running sandboxed command, backed by a paid dashboard for logs and tunnels, but there is no task-level UI at all, this is a developer building block, not an agent-facing console.
slop_verdict: Real and used in anger, not a landing page. SWE-bench Verified runs behind a --modal flag, Quora/Poe, Codegen and Anthropic's own Claude Managed Agents integration all run production workloads on it, and the company is raising at a reported 15.75B USD valuation. The sandbox engine itself is closed source behind a paid SDK, so none of that activity is independently auditable.
---

# Modal Sandboxes

## 1. What it is

Modal Labs sells a serverless compute cloud (functions, GPUs, Sandboxes) and added Sandboxes as an API for running untrusted or agent-generated code in an isolated, disposable container, billed per second. Modal's own framing: Sandboxes are "secure containers for executing untrusted user or agent code," built for LLM-driven and agentic systems where no human watches each execution. The docs and blog show a real, widely used compute primitive, not a factory: there is no task registry, no issue intake, no approval flow and no merge step anywhere in the product. It sells to teams that need to execute code an agent wrote, not to teams that want an end-to-end agent-to-PR pipeline.

What the marketing claims (best-in-class agent sandboxing, GPU-in-the-sandbox, 100,000+ concurrent sandboxes) is mostly consistent with what independent 2026 comparisons (LogRocket, Northflank, Superagent) report, though the concurrency figure varies between sources (50,000 to 100,000+) and Modal's own "best sandbox for X" blog series is marketing, not engineering documentation. The isolation and egress mechanics, by contrast, are concretely documented in the product docs and match what the comparison pieces independently describe.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None | Forgejo issues, SigNoz alerts, intake API | Not comparable |
| Control plane | None; an App is a namespace for resources, not a task | factoryd, Temporal workflow per task, Postgres | Not comparable |
| Worker plane | This is their whole scope: one gVisor container per Sandbox, runtime-configurable image, volumes, tunnels, snapshot/resume, up to 24h lifetime | One gVisor pod per task, read-only root FS, Cilium default-deny egress | They lead on egress granularity and snapshot, equal on isolation technology |
| Verification | None as a product feature; used as a substrate by others (SWE-bench harness runs on Modal) | Forgejo Actions, policy gates, stronger-model review | Not comparable |
| Merge and deploy | None | Bot merge, Flux GitOps rollout | Not comparable |
| Policy outside the model | Egress and inbound rules are set by the calling application through the SDK/API and enforced by Modal's platform, never by the sandboxed process itself | policy.yaml in Git, enforced in factory-gateway and Cilium NetworkPolicy | Equal in spirit, we lead on policy being versioned and reviewable outside the caller's own code |
| Identity per task | Per-sandbox secrets as env vars, optional OIDC identity token, unspoofable X-Verified-User-Data header on tunnel connections | Projected, OIDC-verified, audience-scoped ServiceAccount token per task, minted and rotated by Kubernetes | We lead on automatic per-task identity; they lead on the tunnel-auth header ergonomics |
| Artifacts not chat | A Sandbox exchanges exec calls, stdout/stderr and files, not chat, consistent with our principle | Same intent | Equal |

## 3. Architecture and stack

Sandboxes run on gVisor, the same syscall-filtering user-space kernel we use for our own task pods. Modal describes a custom Rust-based container runtime, scheduler and file system built for fast cold starts and dynamic scaling; the worker side is Rust, the control-plane API and client are Python. Language SDKs are Python (sync and async), JavaScript/TypeScript and Go, all calling a gRPC API. A Sandbox has a lifecycle (Created to Scheduled to Started to optional Ready to Finished) and is created against an App looked up or created with App.lookup(name, create_if_missing=True), then Sandbox.create(app=app, ...). Environments are Modal Image objects built at runtime or pre-published, not arbitrary Dockerfiles. Default lifetime is 5 minutes, adjustable up to 24 hours, plus an optional idle timeout.

Networking is the best-documented part of the architecture (modal.com/docs/guide/sandbox-networking): sandboxes cannot accept inbound connections or reach the caller's other Modal resources by default, and outbound is open to the public internet by default unless the caller sets block_network=True, an outbound_cidr_allowlist, or the beta outbound_domain_allowlist (SNI-matched, TLS port 443 only, wildcard-subdomain support, no ECH, no domain-fronting protection). Inbound exposure goes through Connect Tokens (recommended, authenticated HTTP/WebSocket with an injected verified-identity header) or raw encrypted_ports/unencrypted_ports/h2_ports tunnels. There is no repository to read for any of this: the execution engine, scheduler and networking layer are closed source behind the SDK. Only the thin Python/JS/Go client (modal-client, Apache-2.0 on PyPI and GitHub) is open.

## 4. UX

Start to first result is four steps: pip install modal (or uv add modal), modal setup to authenticate in a browser, App.lookup(..., create_if_missing=True), then Sandbox.create(app=app).exec(...). A paid web dashboard shows logs, app state and tunnel URLs; there is no view of an agent's task queue, no kanban, no per-task approval flow, because the product has no task concept to show. Watching a running sandbox means reading its stdout/stderr stream or the dashboard's log tail; intervening means calling terminate() or, since the alpha runtime-policy API, patching its network allowlist while it runs. Against our console (kanban of tasks, human lane, cost view, alerts view) Modal offers nothing comparable, because it is infrastructure a factory would sit on top of, not a factory itself.

## 5. Security, identity, sandbox, policy, cost

Isolation is gVisor, matching our own choice, with Modal citing continuous synthetic tests for network and application isolation but no published threat model or admission-policy artifact comparable to Kubernetes SIG agent-sandbox's. Identity is per-sandbox: injected secrets as env vars, an optional OIDC identity token, and an unspoofable verified-identity header on tunnel connections, but no automatic per-task ServiceAccount-equivalent minted by a cluster identity provider, that is entirely our own factoryd's design. Policy (egress rules) is enforced by Modal's platform from parameters the calling application sets in code, not from a prompt and not from a separately versioned Git policy document; this is code-enforced but caller-owned, a weaker separation than our policy.yaml applied by Flux. Cost is per-second billing with no idle charge, the only hard cap product feature is "environment-level budgets," gated to the Team and Enterprise plans; there is no publicly documented hold-then-book ledger like ours, and the free Starter plan's real cap is concurrency limits, not spend.

## 6. What we should take from it

Narrow, worth copying into our Cilium policy layer this month: the additive CIDR-allowlist-plus-domain-allowlist split, matching third-party API egress by TLS SNI rather than only by IP, would simplify our per-project allowlist maintenance for domains whose IPs rotate (package registries, SaaS APIs). The runtime policy hot-swap (alpha in their product) is a pattern worth having in our own gateway: today a supervisor redirect verdict likely means killing and rescheduling a task's pod; an in-place egress tightening would be cheaper and less disruptive.

Broad: Modal's snapshot-and-resume model, and the fact that a heavily gVisor-isolated sandbox still hits their claimed 100,000+ concurrent scale, is evidence that our own gVisor-on-systrap slowness (noted as a weakness in our own design doc) is an implementation detail, not a ceiling gVisor imposes. Worth revisiting our pod cold-start numbers against a custom scheduler assumption rather than accepting gVisor as inherently slow.

## 7. Where our philosophy differs and what that costs or buys us

Copying Modal wholesale is not on the table: it is a closed, cloud-only SaaS, so every constraint we hold (self-hosted, commodity Hetzner hardware, re-seedable from Git and S3) rules it out as infrastructure outright. The cost of our approach against theirs is operational: we build and operate our own scheduler, network policy and snapshot mechanism on Talos and Cilium, where Modal's customers get all three from a vendor at the price of vendor lock-in and a closed execution engine they cannot audit or self-host. Their per-sandbox egress and identity primitives are more polished than what we have generated per task today, and that gap is real, but closing it means writing more Cilium policy and gateway code ourselves, not adopting their stack, since nothing in Modal is available to run outside their cloud.

## 8. Red flags and slop assessment

No licence bait-and-switch found: Modal has always been proprietary SaaS with an Apache-2.0 client library, a stable split, not a recent enterprise-tier gate. No security incident found in a targeted search beyond the routine severity-tiered patch SLA the security page publishes itself (critical in 24 hours, high in a week). The one real flag is opacity, not misconduct: the execution engine, scheduler and network enforcement are entirely closed source, so every isolation and egress claim in this report rests on Modal's own docs and blog, not on code we could read. The company's valuation trajectory (1.1B in autumn 2025 to 4.65B in May 2026 to a reported, unconfirmed 15.75B in September 2026) says the business is growing fast, which cuts both ways for a dependency: well funded and unlikely to shut down soon, but a company still finding its final pricing and product shape.

## 9. Sources

https://modal.com/docs/guide/sandbox (fetched 2026-09-29)
https://modal.com/docs/guide/sandbox-networking (fetched 2026-09-29)
https://modal.com/docs/guide/security (fetched 2026-09-29)
https://modal.com/pricing (fetched 2026-09-29)
https://modal.com/blog/sandbox-launch (fetched 2026-09-29)
https://modal.com/blog/introducing-claude-managed-agents-with-modal-sandboxes (fetched 2026-09-29)
WebSearch: Modal Sandboxes gVisor isolation architecture blog 2026 (fetched 2026-09-29)
WebSearch: Modal Labs funding Series C valuation 2026 founded Erik Bernhardsson (fetched 2026-09-29)
WebSearch: Modal Sandboxes vs E2B vs Daytona vs Anthropic sandbox comparison agent coding (fetched 2026-09-29)
WebSearch: Modal Sandboxes quickstart getting started steps (fetched 2026-09-29)
https://techcrunch.com/2026/09/28/source-inference-provider-modal-labs-closing-in-on-750m-round-at-15-75b-valuation/ (via search, fetched 2026-09-29)
https://blog.logrocket.com/comparing-ai-agent-sandbox-platforms-e2b-modal-daytona-and-more/ (via search, fetched 2026-09-29)
https://northflank.com/blog/modal-vs-vercel-sandbox (via search, fetched 2026-09-29)
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/01-report-template.md
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/README.md
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/projects/k8s-agent-sandbox/report.md
