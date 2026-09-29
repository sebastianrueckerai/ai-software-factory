---
name: Namespace
slug: namespace
url: https://namespace.so
repo: none
category: ci-build
license: proprietary
open_source: no
self_hostable: no
hosting_model: cloud only, on hardware Namespace owns and racks itself; no self-hosted or bring-your-own-cloud option found in the docs
company: Namespace Labs, Inc. Crunchbase lists San Francisco, Tracxn lists Wilmington, Delaware as the legal domicile. Founded by ex-Google engineer Hugo Santos around 2020-2021, pivoted from an earlier build-test-deploy platform ("Foundation") to managed developer compute in 2023. $23m raised in combined seed and Series A led by NEA, with Susa Ventures and burst.vc, announced March 2026
maturity: no public repository or star count to cite. Public changelog live since July 2023, 5 to 10 shipped entries a month through 2026 (8 in the first three weeks of September alone), SOC 2 Type II certified, 1,000+ customer claim as of August 2026, named references include Ramp, Framer, Zed and DuckDB
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 3
  verification: 0
  policy_outside_model: 0
  identity_per_task: 2
  cost_control: 2
  ux: 4
  reseedable_selfhost: 0
steal:
  - "The one-line runs-on swap for adopting a different runner backend without touching the rest of the workflow file: a model for letting a project pick a faster worker pool without a pipeline rewrite."
  - "Cache Volumes replace actions/cache with a locally-mounted cache instead of a remote upload/download, removing a full round trip on every job; worth comparing against our own gVisor-runner cache path if CI minutes are going to cache transfer."
  - "The Remote Builder pattern: Docker builds run on a machine sized and provisioned independently from (and larger than) the runner itself. This is the same shape as our own throwaway Hetzner build VM, used because no rootless BuildKit runs under gVisor; their public numbers (about 0.05 USD per build) are a useful sizing reference."
  - "A fresh Devbox per agent session that is torn down the moment the worker process exits (their Cognition/Devin integration, blog post 'Giving Devin a fast computer'). It is external, paid-customer validation of the exact per-task disposable sandbox lifecycle we already run, not a new idea, but confirmation the pattern holds at their scale."
  - "A per-compute-instance workload token that every API call and immutable audit-log entry traces back to. Cheap to add to our own sandbox pods for finer audit attribution, though it authenticates the machine, not a task's capability set, so it is a smaller idea than our ServiceAccount token (see differs)."
  - "Idle auto-shutdown (Devboxes stop after 15 minutes idle, adjustable) as a single, simple, automatic cost backstop. We already exceed it with hard caps and holds, but it is a cheap belt-and-suspenders addition for any long-lived interactive sandbox we might add later."
differs:
  - "Namespace sells compute, not policy. Nothing in its docs evaluates what an agent or job may do once it has a runner; RBAC and SSO gate the dashboard for humans, not tool or network access for a running workload. Adopting Namespace would not remove a single line of our own capability-policy or gateway code; it is a worker-plane hardware vendor, not a control-plane substitute."
  - "There is no self-hosted or BYOC mode. Both Namespace's own docs and an independent competitor review (Northflank, July 2026) agree the whole product runs exclusively on hardware Namespace owns and racks itself. That is a hard conflict with our re-seedable, commodity-Hetzner constraint: we could at most rent it as an optional CI accelerator for one project, never fold it into infrastructure we can delete and rebuild from Git and S3."
  - "Egress control is an allow-listable stable outbound IP range (plus enterprise dedicated pools), open by default until a customer configures a filter. Our sandbox network policy is default-deny, opened only to specific hosts a task's capability grants. Their model optimises for 'let CI reach package registries without a support ticket'; ours optimises for 'an agent reaches nothing it was not explicitly given'. Namespace's per-workspace filtering is a coarser, opt-in version of the same idea, not an equivalent."
ux_verdict: The fastest zero-to-first-result loop seen in this survey for a ci-build tool, one label swap in a workflow file, plus SSH/VNC debugging into a live runner and a usage dashboard broken down by repository and shape, ahead of anything our console shows for a CI run today.
slop_verdict: Real and used in anger. 23m USD raised, a changelog shipping every few days through all of 2026, SOC 2 Type II, 1,000+ claimed customers with named references, and paid integration partnerships with Cursor and Cognition (Devin) for agent compute, not a landing page over a thin product.
---

# Namespace

## 1. What it is

Namespace (Namespace Labs, Inc.) sells fast, cloud-hosted compute for building, testing and now running coding agents: GitHub Actions and GitLab CI runners, Docker remote builders, Bazel remote execution, and "Devboxes", ephemeral or persistent VMs and Macs for humans or agents to work on directly. It runs on hardware the company owns and racks itself ("custom hardware, hypervisor, scheduler"), which it claims gives it a speed and consistency edge over managed cloud CI. It is sold as a metered cloud service (namespace.so, dashboard at cloud.namespace.so) with free, Team, Business and Enterprise tiers, not as software you install.

The company's own claim is that CI/CD and dev environments are an under-optimised, commodity-hardware-adjacent infrastructure line item it can do better than GitHub, GitLab or AWS by owning the full stack down to the rack. What the docs and changelog actually show is narrower but real: it is a competent, actively shipped runner and build-cache product (Namespace vs Depot vs the now-defunct BuildJet is a live three-way comparison in the CI space) that pivoted hard toward "Devboxes for agents" in 2026, with paid integrations for Cursor's cloud agents and Cognition's Devin. There is no factory-orchestrator layer anywhere: Namespace does not pick work, does not review it and does not merge it.

## 2. Mapping to our five planes

| Plane / principle | What Namespace does | What we do | Verdict |
|---|---|---|---|
| Signals | None. It reacts to a CI trigger (GitHub Actions, GitLab CI) someone else's system already fired | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | not comparable, absent here |
| Control plane | A billing and usage dashboard (unit minutes, concurrency, per-repo breakdown), no task registry, no approvals | Temporal workflow per task, policy, budgets, approvals, cost ledger, audit | we lead |
| Worker plane | Dedicated VM or bare-metal instance per runner or Devbox, own hypervisor and scheduler, a fresh Devbox per agent session torn down at session end (axis: sandbox_isolation = 3, real machine-level isolation and the same disposable-per-task lifecycle we use, marked down because egress is allow-list not default-deny) | One gVisor pod per task, ServiceAccount, read-only rootfs, default-deny egress | equal on disposability, we lead on egress default |
| Verification | None. It runs the job you point at it; no gate, no model review | Forgejo Actions, policy gates, stronger-model review | we lead, absent in Namespace |
| Merge and deploy | None | Bot merge, Flux GitOps, staged rollout | we lead, absent in Namespace |
| Policy outside the model | Dashboard RBAC and SSO for humans only (axis: policy_outside_model = 0, nothing evaluates what a running job or agent may do) | Capability YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | One workload token per compute instance, traced in an immutable audit log (axis: identity_per_task = 2, real per-instance identity, but scoped to the machine, not a task's capability set, and not independently verified as audience-restricted) | Per-task projected, audience-scoped, kubelet-rotated ServiceAccount token | we lead |
| Artifacts not chat | A CI job or a Devbox session, inputs and logs, no cross-agent artifact model | TaskBrief in, branch, PR, event stream out | not comparable |

## 3. Architecture and stack

Closed source; everything here is inference from docs and blog posts, not code. The company states it runs its own compute, storage and networking on owned racks across multiple data centres, with native macOS (Apple Silicon, up to M5), Windows and Linux/ARM64. A CLI called `nsc` configures workspaces, concurrency and egress policy (`nsc workspace concurrency`, changelog 2026-08-07). Storage is described as co-located NVMe behind volumes, a container registry and an artifact/cache layer; a "Remote Builder" machine (always sized larger than the runner itself) executes Docker builds via `docker/build-push-action` unchanged, provided a customer removes `docker/setup-buildx-action` and `docker/setup-qemu-action` from their workflow. Bazel gets first-class remote execution and remote caching (launched 2026-08-19, priced at 0.10 USD per 1,000 cache hits). Networking is described as at least 1 Gbps per CPU thread, with stable per-workspace egress IP ranges and enterprise dedicated egress pools for allow-listing.

Devboxes, the 2026 pivot, are VMs or Macs a human or an agent connects an IDE, SSH or VNC session to; the company's own framing ("CI/CD is Dead, Agents Need Computers", a March 2026 investor blog post by NEA) is that agents now need the same kind of ephemeral compute CI jobs always did. Cognition (Devin) and Cursor both route agent-side shell commands, file edits and builds onto Devboxes rather than their own infrastructure, with Namespace creating a fresh instance per session and tearing it down when the agent process exits.

## 4. UX

Onboarding for the GitHub Actions product is four steps: connect a GitHub organisation, create a runner profile (platform, shape, a label), change one `runs-on:` value in a workflow file to that label, and the next job runs on Namespace hardware. Docker build acceleration and image/toolchain caching are on by default once a profile is created; adopting Cache Volumes for a git checkout or a language toolchain means swapping in `namespacelabs/nscloud-checkout-action` or `nscloud-cache-action`, a small but real workflow edit.

Watching and intervening: the dashboard shows a usage breakdown by platform, shape and repository (new "Home" page, changelog 2026-09-08), and runners support interactive debugging including SSH and VNC into a live job, which is not something our console offers for a CI run today. Devboxes add a persistent IDE connection, screen capture and simulator access (iOS simulator support shipped 2026-09-21). There is no chat interface; interaction is CLI (`nsc`), dashboard, API and the GitHub/GitLab workflow file itself.

## 5. Security, identity, sandbox, policy, cost

Sandbox. Every customer's environment is isolated from every other's; within one workspace, instances are isolated by default unless explicitly networked together, and each Devbox or runner is a real VM or bare-metal slice, not a shared container. This is a solid axis-3 story for isolation and matches our own per-task disposability, but it is provided at the infrastructure level, not a Kubernetes namespace and network policy an operator can inspect or version in Git.

Identity. Each compute instance gets a dedicated workload token used for API access and audit attribution; the docs do not describe token scope, audience restriction or expiry, so this could not be verified as equivalent to a short-lived, audience-scoped credential. No detail was found on how a Devbox reaches secrets a customer's agent needs.

Policy. RBAC and SCIM-based SSO gate who can manage a workspace and its members; there is no runtime authorisation layer for what a job or agent may do once it is running. Audit logs record workspace, instance and volume changes and can be forwarded to a customer's own SIEM (Enterprise only).

Cost. Purely usage-based: unit-minutes for compute (shape and platform multipliers, Linux 1x up to macOS 10x), per-build pricing for Docker (0.05 USD per build) and per-1,000 pricing for Bazel cache hits, billed with a one-minute minimum. No hard spend cap or budget-alert mechanism was found; the closest controls are per-tier concurrency limits, per-job duration caps, and a 15-minute Devbox idle auto-shutdown.

## 6. What we should take from it

Narrow: the Remote Builder-sized-larger-than-the-runner pattern for Docker builds is close to our own throwaway-build-VM workaround for gVisor's lack of rootless BuildKit, and their public per-build price (0.05 USD) is a useful external benchmark for whether our own build VM economics are competitive. The Cache Volumes idea (mount the cache locally instead of round-tripping it through remote storage on every job) is worth checking against our own gVisor runner cache path if CI minutes are being spent on cache transfer rather than build work.

Broad: Namespace's bet that "agents need their own computer" mirrors the worker plane we already have, and its two paid integrations (Cognition/Devin, Cursor) are a live demonstration that a fresh, disposable, real-machine sandbox per agent session is a sellable primitive on its own, not just an internal implementation detail. Their usage dashboard (breakdown by repository, shape and platform) and SSH/VNC debugging into a live runner name two concrete gaps our own console vision document already lists (no live stream, no diff view); their priority order is a reasonable one to borrow when the console gets real design time.

## 7. Where our philosophy differs and what that costs or buys us

Namespace is a hardware and compute vendor, not a control plane. Buying it would not remove any of the policy, approval, budget or audit code we already build; it could only ever sit underneath the worker plane as a place to run CI jobs or agent sandboxes faster, never replace factoryd or factory-gateway.

Its lack of any self-hosted or BYOC mode is a direct conflict with re-seedable and commodity hardware: everything runs on racks Namespace owns, so a "delete everything and rebuild from Git and S3" story could never include Namespace as anything but an optional, swappable accelerator for one project's CI, and losing access to it must never be able to block a rebuild. This is the same reason we run our own gVisor runners on Hetzner cpx42 boxes rather than buying a faster managed runner outright, even though a managed runner is very likely faster.

Its egress model, an allow-listable IP range that is open until a customer configures a filter, is the inverse of our default-deny network policy. If we ever used Namespace-hosted Devboxes for an agent, we would still need our own gateway and default-deny posture in front of it; Namespace's allow-list would only ever be an outer, coarser layer, not a replacement for capability-scoped egress.

## 8. Red flags and slop assessment

The company is young (seed and Series A only, 23m USD, closed in March 2026) and pivoted its whole product once already (from "Foundation", a build-test-deploy platform, to managed compute in 2023); a second pivot risk is real given how fast the 2026 changelog leans into agent-specific features. Public status pages (namespace-status.com, an incident.io page) show routine incidents through 2026, queue-time slowdowns, a dashboard outage from a third-party provider, degraded network performance, all resolved within hours per the company's own updates; no security breach or data-exposure incident was found in search. No self-hosted escape hatch exists if Namespace changes terms, raises prices or shuts down, unlike the BuildJet shutdown (announced February 2026, runners off by 31 March 2026) that just played out one tier below it in the same market, a concrete precedent for vendor risk in this category. SOC 2 Type II and a public Trust Center are real signals of security maturity for a two-to-three-year-old infrastructure company, better than most projects in this survey, but they say nothing about product or business continuity risk.

## 9. Sources

- https://namespace.so (fetched 2026-09-29)
- https://namespace.so/docs/solutions/github-actions (fetched 2026-09-29)
- https://namespace.so/docs/architecture/networking/security (fetched 2026-09-29)
- https://namespace.so/docs/workspaces/security (fetched 2026-09-29)
- https://namespace.so/pricing (fetched 2026-09-29)
- https://namespace.so/changelog (fetched 2026-09-29)
- https://namespace.so/blog/series-a (found via search, 2026-09-29)
- https://namespace.so/blog/introducing-devboxes (found via search, 2026-09-29)
- https://namespace.so/blog/devin-outposts-devboxes (found via search, 2026-09-29)
- https://namespace.so/blog/cursor-cloud-agents-devboxes (found via search, 2026-09-29)
- https://www.nea.com/blog/namespace-cicd-is-dead-agents-need-computers (found via search, 2026-09-29)
- https://betterstack.com/community/comparisons/namespace-alternatives/ (found via search, 2026-09-29)
- https://cicdpipelinecost.com/depot-vs-namespace-vs-blacksmith (found via search, 2026-09-29)
- https://www.warpbuild.com/blog/buildjet-shutting-down (found via search, 2026-09-29)
- https://www.crunchbase.com/organization/namespace-labs (found via search, 2026-09-29)
- https://tracxn.com/d/companies/namespace-labs (found via search, 2026-09-29)
- https://statusgator.com/services/namespace (found via search, 2026-09-29)
- https://namespace-status.com (found via search, 2026-09-29)
- No public repository exists for this product (seed table lists repo: none); no clone was made
