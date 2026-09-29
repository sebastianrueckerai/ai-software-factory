---
name: Devin
slug: devin
url: https://devin.ai
repo: none
category: enterprise-agent-platform
license: "mixed: closed product, plus MIT (devin-outpost-k8s), Apache-2.0 (devin-connect, terraform-provider-devin), no licence file (actions, blockdiff, devin-cli)"
open_source: partial
self_hostable: no
hosting_model: SaaS control plane always hosted by Cognition, optional customer VPC only for sandbox compute (Customer Dedicated Deployment)
company: Cognition AI Inc, San Francisco, founded 2023, publicly reported multi-billion dollar valuation and a 2025 acquisition of the Windsurf IDE and team (figures from public reporting, not re-verified against a primary source this session)
maturity: product GA since March 2024, Devin 2.0 relaunch April 2025, docs updated continuously. Public companion repos range from a push today (devin-connect) to fifteen months stale (blockdiff, 259 stars, last push 2025-06-25)
similarity: 3
axes:
  signals_intake: 3
  control_plane: 3
  sandbox_isolation: 4
  verification: 2
  policy_outside_model: 3
  identity_per_task: 3
  cost_control: 2
  ux: 4
  reseedable_selfhost: 0
steal:
  - devin-connect's outbound-only tunnel plus a small gateway with a declarative, hot-reloadable network allowlist, so a project's egress list changes without a Cilium policy redeploy and without opening an inbound port on the runner side
  - RFC 8693 OIDC token exchange as a CLI step before a CI job calls an external control plane (setup-devin-oidc), reusable anywhere we still hand a job a static token
  - A policy hierarchy with mandatory rules fixed at a higher level and recommended rules a lower level may override (Security Profiles), a concrete shape for splitting our one flat policy YAML into a floor plus a per-project narrowing file
  - Playbooks as versioned, macro-invoked ("!name") instruction documents kept separate from freeform context, a workable shape for the spec-driven intake we do not have yet
  - DeepWiki, an auto-generated, git-trackable wiki and diagram per repository with a maintainer-editable override file, a direct answer to our own "no project memory, no codebase index" gap
  - The multi-pane live session view (plan, shell, IDE, browser) as a concrete target for the real-time stream and diff view our console admits it lacks
differs:
  - The control plane never leaves Cognition's cloud at any tier, including the VPC-branded deployment, so no version of Devin can be deleted and rebuilt independently the way our re-seedable constraint demands
  - Policy is role-based and ambient (RBAC and org-scoped Security Profiles) rather than minted per task, so a granted role keeps working for as long as it is held instead of expiring with the task
  - Verification is advisory by default. Devin Review only blocks a merge if the customer's own branch protection makes it required, our pipeline can auto-merge low-risk work without needing that external wiring
  - Cost control is a monthly or per-cycle ceiling set by an admin, not a per-call priced hold, so it bounds blast radius over a period rather than before a single action runs
ux_verdict: The live multi-pane session view and DeepWiki onboarding beat our console on every point we admit weakness on, but the scheduler and policy engine underneath stay invisible SaaS internals.
slop_verdict: Real, funded and in enterprise use, with actively maintained integration tooling, but the clearest public security evidence found this session is a documented prompt-injection exploit against it, not the compliance marketing.
---

# Devin

## 1. What it is

Devin is Cognition AI's commercial, closed "autonomous software engineer". It is sold as SaaS, priced through a compute unit called an ACU, with an enterprise tier that adds VPC-adjacent deployment, custom roles and audit controls. Buyers range from individual developers on a self-serve plan to enterprise engineering organisations under a contract.

Cognition's own materials claim Devin plans, codes, tests and opens pull requests from a Slack message, a Linear or Jira ticket, or an API call, largely unattended, and that many sessions can run in parallel. The public evidence supports a narrower claim. The docs and the six public companion repositories show a real session-based API, a real OIDC and VPC integration story that a genuine platform-engineering customer base clearly demanded, and a working review and wiki feature set, but the agent loop itself, the model or models behind it, and the sandbox hypervisor are entirely closed. Nothing about how well the agent actually performs is visible from the repositories, only from independent reviews (Section 8).

There is no source repository for the product. `https://github.com/CognitionAI` hosts integration tooling only: a Kubernetes operator (`devin-outpost-k8s`), a network gateway (`devin-connect`), a Terraform provider (`terraform-provider-devin`), GitHub Actions (`actions`), a VM snapshot CLI (`blockdiff`), and a CLI stub (`devin-cli`) that points at closed docs. None of these is the product. They are the plumbing enterprise customers write to connect their own infrastructure to Devin's SaaS.

## 2. Mapping to our five planes

| Plane or principle | What Devin does | What we do | Verdict |
|---|---|---|---|
| Signals | API session create, a Slack app ("Ask Devin"), Linear and Jira connectors, scheduled recurring sessions, PR comments trigger Devin Review | Forgejo issues, PR comments, SigNoz alert webhooks, `factoryd` intake API | equal, more native chat and tracker connectors on their side, no first-party telemetry-to-task path on theirs |
| Control plane | Proprietary session registry, Outposts claim queue for worker distribution, org-level ACU limits and roles, an audit log for compliance, no customer-visible scheduler | Temporal workflow per task in Postgres, capability policy as YAML in Git applied by Flux, a cost ledger, a kanban console | we lead on transparency and customer control, not necessarily on operational maturity, which is not verified either way |
| Worker plane (sandbox) | A VM per session on a custom hypervisor (inferred, not confirmed in any first-party document read this session), `blockdiff`-based snapshot fork and resume, the Outposts operator runs workers in the customer's own namespaces with no account credentials in the pod | A gVisor pod per task, its own namespace and ServiceAccount, ephemeral, default-deny egress through Cilium | they lead, if the VM isolation claim holds, since we have flagged gVisor as slow and MicroVMs as needing bare metal we do not have |
| Verification | Devin Review, a PR-grouping bot with a "Bug Catcher" for bugs, flags and security findings, non-blocking unless the customer's own branch protection requires it | Forgejo Actions, policy gates by risk class, a reproduction gate at base and head, a stronger-model review, some changes auto-merge | we lead, our gate is required by default, theirs is opt-in |
| Merge and deploy | Devin opens a PR, a human merges it, no built-in deploy step found in the docs read | `factory-merge` bot merges after human approval or an auto-rule for low-risk reproduced changes, Flux deploys, staged rollout with an alert-free soak | we lead |
| Policy outside the model | Security Profiles (Enterprise, Org, Automation, Session, with mandatory and recommended rules) and Custom Roles (RBAC), both enforced server side | Capability policy as a document in Git, enforced in `factory-gateway` code and Cilium network policy, no prompt can grant a capability | equal in spirit, coarser grain on their side (role and profile scoped, not per task) |
| Identity per task | `devin-oidc` does RFC 8693 token exchange for short-lived, audience-scoped tokens, Outpost worker pods hold no account credentials, the gateway issues a session-scoped `connect_token` only after a successful queue claim | A kubelet-projected, audience-scoped ServiceAccount token per task, verified by `factory-gateway` against the cluster OIDC issuer | equal for the open Outposts path, not verified for Devin's own SaaS-hosted sessions |
| Artifacts not chat | A session is a chat transcript with optional Playbook macro invocations, the work product is a PR, DeepWiki is a generated side artifact | A `TaskBrief` object in, a branch, a PR and a normalised event stream out, Git is the coordination mechanism throughout | we lead, their unit of work is fundamentally a conversation, ours is a structured object |

## 3. Architecture and stack

Almost none of Devin itself is public. What follows is read from six companion repositories and from docs.devin.ai, with inference marked as inference.

`devin-outpost-k8s` is Rust, using `kube-rs`, with a custom resource `OutpostPool` reconciled by a controller (`src/controller/reconcile.rs`, `src/controller/pod.rs`) and leader election through a Kubernetes `Lease`. It is a pull-based worker distribution model, not push scheduling. `src/api/types.rs` defines the wire model: an `OutpostDevin` has a `Phase` (`Pending`/`Claimed`), and a claim carries a `claim_deadline` for TTL-based renewal. Comments in `src/api/types.rs` state the model mirrors "the Pydantic response models in `devin-webapp/apps/webserver/app/routers/opbeta/outposts_router.py`", which is concrete, code-cited evidence that Devin's own backend is a Python web service (framework not confirmed) even though that repository itself is not public. A Helm chart ships at `charts/devin-outposts-k8s`. `gh api repos/CognitionAI/devin-outpost-k8s` shows 15 stars, MIT licence, created 2026-07-12, last pushed 2026-07-21.

`devin-connect` (Apache-2.0, 0 stars, created 2026-09-15, pushed today 2026-09-29 at "v0.0.2" per its last commit) is a `tunnel/` plus `gateway/` pair. The tunnel opens an outbound-only connection from the customer's network to Cognition's edge, the gateway enforces a declarative, hot-reloadable allowlist and proxies via HTTP CONNECT. No inbound port is required on the customer side. This is the single most directly comparable piece of engineering to our own `factory-gateway` plus Cilium default-deny egress, and it is the newest and most actively pushed of the six repos.

`terraform-provider-devin` is Go, built on `hashicorp/terraform-plugin-framework`. Its README lists resources for organisations, secrets, playbooks, roles and schedules, of which `secret_resource.go` and `organization_resource.go` were read in full. `organization_resource.go` defines `MaxSessionACULimit` and `MaxCycleACULimit` as `int64` fields on the org resource, the concrete evidence behind the cost-control claims in Section 5. `secret_resource.go` shows every secret attribute forcing resource replacement, because "the Devin API has no secret update endpoint" (its own doc comment), and the value is never returned by the read API. Apache-2.0, 7 stars, created 2026-06-16, pushed 2026-08-13.

`blockdiff` is a Rust `clap` CLI with `create` and `apply` subcommands, using `nix::fcntl::copy_file_range` for fast block-level diffing and reapplication of disk images, which supports fast VM fork, suspend and resume for a sandbox. It has no licence file, 259 stars, created 2025-06-19, and has not been pushed since 2025-06-25, about fifteen months before this report. If the production snapshot path has diverged from this reference, that gap is invisible from outside.

`actions` bundles eight composite GitHub Actions for Devin, including `setup-devin-oidc`, which exchanges a long-lived enterprise credential for a short-lived, audience-scoped token via RFC 8693 before a workflow calls the Devin API. No licence file, 9 stars, created 2026-06-13, pushed 2026-09-22. `devin-cli`'s repository is a stub pointing at `docs.devin.ai/cli`, confirming the real CLI is closed source. No licence file, 3 stars, created 2026-06-10, pushed 2026-09-23.

Docs describe (not verified against code) a v3 session API: sessions are created, messages and attachments are appended to a running session, and Playbooks are invoked mid-session with `!macro-name` syntax. DeepWiki auto-generates a wiki, diagrams and a Q&A index per repository, with a git-tracked override file at `.devin/wiki.json` and effort-tiered, ACU-costed regeneration. Deployment comes in two shapes: "Enterprise Cloud" (fully multi-tenant) and "Customer Dedicated Deployment" (sandbox compute in the customer's own VPC over AWS PrivateLink or IPSec, using the Outposts operator). The control plane, which Cognition calls the Brain, always stays in Cognition's cloud in both shapes. There is no self-hosted tier at any price. The model or models behind Devin are not disclosed anywhere read this session, that is not verified either way.

## 4. UX

Devin's session UI is a multi-pane live view. Its onboarding is a chat prompt, ours is a kanban board with no live view at all, so Devin is ahead here. This section is written from documentation and quickstart material, never from a signed-in session, since the task's limits forbid signing in anywhere.

Docs describe onboarding as: create an account or use enterprise SSO, connect a code host, describe a task or invoke a Playbook, and start a session. That is roughly four steps to a first running session by the documentation's own description. The step count could not be independently walked through and is not verified as a hands-on measurement.

While a session runs, the docs and screenshots describe five panes: a Progress pane narrating a running plan or checklist, a Shell pane with a live terminal, an IDE pane with a live editor and diff, a Browser pane showing pages the agent is driving, and Side Chats for parallel sub-conversations that do not derail the main plan. A user intervenes by sending a chat message mid-session to redirect it, by pausing and resuming a session (Outposts support suspend and resume through the snapshot mechanism referenced in `src/api/types.rs`'s `Kind::Resume`), by configuring a Playbook to make Devin ask for confirmation before a risky step, and by commenting on the resulting PR to trigger Devin Review or request changes.

Set against our own console: our console is functional but not designed, with no real-time stream of a running task, no diff view and no mobile view, all points we have flagged ourselves as weak. Devin's live panes and its DeepWiki onboarding artifact answer exactly those gaps. What is worse on Devin's side: no visibility into the scheduler or the policy engine behind a session, and a single chat input line as the primary way to steer a task, against our board's structured view across many tasks at once. Per-action cost visibility in the billing UI was not checked, since checking it requires signing in.

## 5. Security, identity, sandbox, policy, cost

Security claims are broad, the strongest counter-evidence is a real published exploit, not a compliance gap. Cognition's enterprise security page claims SOC 2 Type II, encryption at rest and in transit, an opt-out from training on customer data, and isolated per-session environments. These are vendor claims, not independently checked. Independent security researcher Johann Rehberger, publishing as Embrace The Red, has documented indirect prompt injection against agents including Devin, where content the agent's browser tool encounters on an untrusted page steers the agent into an unintended action. That is a concrete, real-world gap between the marketed isolation and what the sandbox actually contains, and it should weigh more heavily than the compliance badges.

Identity for the open Outposts path is short-lived and scoped. Worker pods hold no account credentials, confirmed in the doc comments of `devin-outpost-k8s`'s `src/controller/pod.rs`. A `connect_token` scoped to one claimed session is only issued after a successful claim, per the `Status` struct in `src/api/types.rs`. For CI-to-Devin authentication, `setup-devin-oidc` exchanges a long-lived enterprise OIDC credential for a short-lived, audience-scoped token via RFC 8693 before any API call, architecturally close to our own per-task ServiceAccount token pattern. How Devin's own SaaS-hosted (non-Outpost) sessions mint and scope credentials is not verified, only the on-prem Outposts path is open source.

The sandbox is described in docs and secondary sources as a per-session virtual machine on a custom hypervisor rather than a container, a claim not confirmed in any first-party source read this session and treated as inference. `blockdiff`'s block-level diff and apply of disk images supports the fork, suspend and resume story referenced by Outposts. If the VM claim holds, that is a materially stronger isolation boundary than our gVisor pods, which we have already flagged as slow for builds and as needing bare metal for a real microVM upgrade we do not have.

Policy is enforced server side, not by asking the model, which matches our principle in spirit. Security Profiles apply at Enterprise, Org, Automation and Session level, with mandatory rules fixed by a higher level and recommended rules a lower level may override. Custom Roles is a separate RBAC system for who can do what in the product. The grain differs from ours: their policy is role- and profile-scoped, ours is minted fresh per task as a capability-scoped token that expires with the task.

Cost control is now two-tier and coarser than ours. Self-serve pricing is credit-based with no published ACU rate any more, a change from the $2.25-per-ACU rate disclosed at the 2025 launch of Devin 2.0, not re-verified against a primary source this session. Enterprise sets a `MaxSessionACULimit` and an optional `MaxCycleACULimit` per organisation, confirmed in `terraform-provider-devin`'s `organization_resource.go`, managed through Terraform or the console. There is no equivalent to our gateway's pre-flight priced hold taken and reconciled per call. A Devin cost cap bounds a session or a billing cycle after the fact, ours bounds a single action before it runs.

## 6. What we should take from it

Narrow, copyable this month: `devin-connect`'s outbound-only tunnel with a small gateway and a declarative, hot-reloadable allowlist is worth studying directly against our Cilium-based egress control, since it would let a project's allowed destinations change without a policy redeploy and without opening an inbound port on the runner. The `setup-devin-oidc` RFC 8693 exchange pattern, a CLI step that trades a long-lived credential for a short-lived audience-scoped one immediately before use, is a template for any place we still hand a CI job a static token. Security Profiles' layering, mandatory rules fixed by a higher level and recommended rules a lower level may override, is a concrete shape for splitting our one flat policy YAML into a factory-wide floor plus a per-project narrowing file.

Broad, product-shape items: DeepWiki, an auto-generated wiki and diagram per repository with a git-tracked override file a maintainer can correct, would land directly on our own admitted gap of no project memory and no codebase index, and it doubles as onboarding for a new project. The multi-pane live session view, showing plan, shell, editor and browser at once, is the clearest answer to our console's lack of a real-time stream or a diff view, and is worth prioritising for the portfolio's own demo value. Playbooks, versioned documents invoked mid-session by macro name and kept separate from freeform context, are a workable shape for the spec-driven intake we say we do not have yet.

## 7. Where our philosophy differs and what that costs or buys us

The single biggest difference: Devin's control plane, the Brain, never leaves Cognition's cloud at any tier, including the VPC-branded "Customer Dedicated Deployment", which only moves sandbox compute into the customer's network. Copying that model would mean giving up our re-seedable, commodity-hardware constraint outright, there is no version of Devin a customer can delete and rebuild from Git and object storage. Their VPC option buys a compliance answer for enterprise buyers, not sovereignty over the control plane, which is exactly what our own constraint is built to keep.

Policy is role-based and ambient rather than minted per task. A person or an automation holding a role in Devin can act on anything that role permits for as long as the role is held, there is no equivalent of a capability grant that exists only for one task's lifetime. That is simpler to administer at enterprise scale, since roles map onto an org chart, but it is a weaker default than ours, where identity belongs to the task and expires with it. The price of our approach is more moving parts, a token minted per task instead of a login session.

Verification is advisory by default. Devin Review only blocks a merge if the customer's own branch protection makes it a required check, which assumes a human reviews every PR list. Our pipeline can auto-merge low-risk, reproduced, strictly-improving changes without that external wiring, which scales further, but it also means we have to trust our own reproduction gate to hold unattended, a bar Devin's default configuration never has to clear.

Cost control bounds a session, a cycle, or an organisation's month. Ours bounds a single model call before it runs. Their shape is cheaper to build and reason about. Ours is the only one of the two that can promise a runaway loop cannot overspend inside one action, not merely across a billing period.

## 8. Red flags and slop assessment

Maintenance is uneven across the six public repositories but real where it matters. `devin-connect` was pushed today at "v0.0.2", `devin-outpost-k8s` and `terraform-provider-devin` were both pushed within the last two months. `blockdiff`, despite 259 stars and underpinning the fork and snapshot story referenced by Outposts, has not been pushed since 2025-06-25, about fifteen months stale. If the production snapshot path has moved on from this public reference, that drift is not visible from outside. `actions` and `devin-cli` carry no licence file at all, `gh api` returns a null `license.spdx_id` for both, so the terms of reuse for that code are unclear.

There is no open-core gating to find, because almost none of the product is open to begin with. The public repositories are integration plumbing, a Kubernetes operator, a gateway, a Terraform provider, a CLI stub and some GitHub Actions, not the product. That also means the agent loop, the model routing and the actual depth of the sandbox hypervisor cannot be checked at all, only trusted from documentation.

Licensing across the six repositories is inconsistent (MIT, Apache-2.0, none) with no stated reason for the split, worth noting for a vendor that also sells governance as an enterprise feature.

The clearest documented security incident found this session is Johann Rehberger's (Embrace The Red) published indirect prompt injection against Devin, where untrusted page content reaching the agent's browser tool caused unintended action, a concrete instance of the sandbox and policy layer not fully containing model behaviour despite the SOC 2 and isolation claims in the enterprise security docs.

On marketing versus reality: Devin's original March 2024 launch demo was disputed, independent examination reported that at least one showcased task involved Devin fixing an error it had introduced itself rather than an existing upstream bug, and Answer.AI's independent review from the same period found real-world task success well below what the demo implied. Later coverage through 2025 and into 2026 (characterised generally from this session's search, not re-quoted article by article) continued to describe a gap between demo polish and unattended reliability on harder tasks. None of that is a reason to call the product fake, Cognition is well funded, the integration tooling is genuinely used, and the enterprise features (Outposts, Security Profiles, custom roles) show real customer demand behind them. It is a reason to treat every unattended-reliability claim as unverified until tested directly.

## 9. Sources

https://devin.ai
https://docs.devin.ai
https://docs.devin.ai/api-reference/overview
https://docs.devin.ai/enterprise/features/usage-policies
https://docs.devin.ai/enterprise/security-access/security/enterprise-security
https://docs.devin.ai/enterprise/security-access/custom-roles
https://docs.devin.ai/work-with-devin/playbooks
https://docs.devin.ai/product-guides/devin-wiki-deepwiki
https://docs.devin.ai/product-guides/devin-review
https://docs.devin.ai/integrations/slack
https://docs.devin.ai/enterprise/outposts
https://devin.ai/pricing
WebSearch: Cognition Devin funding valuation 2025 2026
WebSearch: Cognition Windsurf acquisition
WebSearch: Devin AI independent review Answer.AI
WebSearch: Devin prompt injection security incident Embrace The Red
WebSearch: Devin 2.0 ACU pricing changes
gh api repos/CognitionAI/devin-outpost-k8s
gh api repos/CognitionAI/devin-connect
gh api repos/CognitionAI/actions
gh api repos/CognitionAI/blockdiff
gh api repos/CognitionAI/terraform-provider-devin
gh api repos/CognitionAI/devin-cli
gh api orgs/CognitionAI/repos
/home/womb/repos/market-research-clones/devin/actions/README.md
/home/womb/repos/market-research-clones/devin/actions/setup-devin-oidc/README.md
/home/womb/repos/market-research-clones/devin/blockdiff/README.md
/home/womb/repos/market-research-clones/devin/blockdiff/src/main.rs
/home/womb/repos/market-research-clones/devin/devin-cli/README.md
/home/womb/repos/market-research-clones/devin/devin-outpost-k8s/README.md
/home/womb/repos/market-research-clones/devin/devin-outpost-k8s/Cargo.toml
/home/womb/repos/market-research-clones/devin/devin-outpost-k8s/charts/devin-outposts-k8s
/home/womb/repos/market-research-clones/devin/devin-outpost-k8s/src/crd/outpost_pool.rs
/home/womb/repos/market-research-clones/devin/devin-outpost-k8s/src/controller/reconcile.rs
/home/womb/repos/market-research-clones/devin/devin-outpost-k8s/src/api/types.rs
/home/womb/repos/market-research-clones/devin/devin-outpost-k8s/src/controller/pod.rs
/home/womb/repos/market-research-clones/devin/devin-outpost-k8s/src/config.rs
/home/womb/repos/market-research-clones/devin/terraform-provider-devin/README.md
/home/womb/repos/market-research-clones/devin/terraform-provider-devin/internal/provider/secret_resource.go
/home/womb/repos/market-research-clones/devin/terraform-provider-devin/internal/provider/organization_resource.go
/home/womb/repos/market-research-clones/devin/devin-connect/README.md
/home/womb/repos/market-research-clones/devin/devin-connect/gateway/README.md
