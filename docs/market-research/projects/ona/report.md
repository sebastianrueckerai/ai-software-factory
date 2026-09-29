---
name: Ona
slug: ona
url: https://ona.com
repo: https://github.com/gitpod-io/gitpod
category: enterprise-agent-platform
license: "mixed - gitpod/gitpod AGPL-3.0 (deprecated), gitpod-sdk-go Apache-2.0, terraform-google-ona-runner MPL-2.0, terraform-aws-ona-runner has no licence file, the Ona platform itself proprietary"
open_source: partial
self_hostable: partial
hosting_model: management plane always on Ona's SaaS; compute runs on Ona's multi-tenant cloud (Core plan) or inside the customer's own AWS or GCP VPC (Enterprise plan, sales contact required)
company: Ona (formerly Gitpod GmbH), Kiel Germany, founded 2020, about 41M USD raised (Crane Venture Partners, Speedinvest, General Catalyst, Series A led by Tom Preston-Werner), being acquired by OpenAI (announced 11 Jun 2026, deal not yet closed)
maturity: gitpod/gitpod has 13778 stars, AGPL-3.0, created 2018-04-24, last push 2026-09-28 but reduced to dependency-digest bumps since deprecation; satellite repos gitpod-sdk-go (8 stars, Apache-2.0, created 2025-01), terraform-aws-ona-runner (2 stars, no licence, created 2026-06-25), terraform-google-ona-runner (5 stars, MPL-2.0, created 2026-03-27) all pushed within the last day, GCP runner ships roughly weekly releases
similarity: 2
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 4
  verification: 1
  policy_outside_model: 4
  identity_per_task: 3
  cost_control: 1
  ux: 5
  reseedable_selfhost: 1
steal:
  - "Veto: a kernel LSM that identifies executables by content hash, not path, and checks plus blocks within the same syscall so there is no time-of-check-to-time-of-use gap. Worth an equivalent exec-gate inside our gVisor sandbox as a second layer under network policy, and worth testing our own sandbox against the exact bypass Ona disclosed against itself (invoking the ELF dynamic linker directly so the load goes through mmap, not execve)"
  - "OIDC to cloud-credential federation: the environment mints a JWT, AWS STS exchanges it via AssumeRoleWithWebIdentity for a short-lived role session, and trust policies match a colon-delimited sub claim (organization_id:...:project_id:...) with StringLike. The sub-claim scoping pattern is a concrete, reusable idea for scoping our own gateway-issued or MCP tokens to a specific project or resource path"
  - "A command and executable deny list as a second, independent policy layer next to network policy, enforced immediately for new actions and logged to audit, cheap to add and catches a class of accidents (agent runs a disallowed binary) that network policy alone misses"
  - "Bootstrapping a new repository by asking the agent itself to generate the sandbox config: Ona's quickstart has the agent produce a devcontainer.json and .ona/config.yaml tailored to the repo. Applicable as a first-run self-describe task for repositories our worker has not seen before"
  - "Warm pools as a first-class resource in the Ona Terraform provider, pre-provisioned runner capacity to cut environment start latency. Worth a small pre-warmed pod pool per project for latency-sensitive tasks instead of always cold-starting a namespace and pod"
  - "AGENTS.md plus a checked-in skills directory as portable, git-committed, per-repository agent tuning, explicitly kept compatible with the same file from Claude Code and Cursor. A near-free start on our own project-memory gap"
  - "One-keystroke parallel launch (Cmd+Enter) from a single list view, each task its own environment. A cheap affordance to add to our kanban board"
differs:
  - "Ona's UX is built around a live conversation pane, the April 2026 redesign explicitly frames it as a workspace, not a dashboard or terminal. Our principle keeps agents exchanging artifacts (TaskBrief, branch, PR, event stream) and treats a human's input as a rare tool call, not a running chat. Copying Ona's UX pattern would reintroduce the chat surface we deliberately avoided"
  - "The management plane (identity, policy, coordination) can never be self-hosted, even in VPC mode; only compute moves into the customer account. That breaks our re-seedable constraint outright, since our rebuild can never depend on a third party's control plane staying up or priced the same"
  - "Nearly every serious security or governance feature (Veto, OIDC workload identity, most org policies beyond one auto-stop timeout, VPC runners) is Enterprise-tier and sales-gated with no published price. Our own escape-hatch principle would force us to route around or drop each of these the moment we needed them, the same trap Ona's own customers are in"
  - "Neither AWS nor GCP runner uses Kubernetes: AWS is ECS Fargate plus an NLB, DynamoDB and MemoryDB; GCP is a Compute Engine managed instance group. This is real evidence that our Kubernetes-as-substrate choice is a preference for a factory our size, not a necessity"
  - "The whole open-source product (AGPL-3.0, 13.8k stars, since 2018) was deprecated, is no longer recommended for new users, and had its pay-as-you-go tier sunset on 2025-10-15. Its closed successor is priced per compute credit and the parent company is now (announced, unclosed) being folded into a single model vendor. This is the exact escape-hatch failure our own principle warns against: the open-source door existed and was walked away from once a better business model appeared, and the resulting single-vendor product is itself now being absorbed by a single model provider"
ux_verdict: Three steps from signup to a running agent in a browser IDE, a live conversation stream, mobile access and one-keystroke parallel launches, clearly ahead of our console on every dimension we already know we are weak on.
slop_verdict: Real and heavily used (2 million developers historically, paying enterprise logos, SOC 2), but the open-source escape hatch is dead, most of what is worth copying is Enterprise-gated and unpriced, and the company is mid-acquisition by a single model vendor.
---

# Ona

## 1. What it is

Ona is the 2025 rebrand of Gitpod, a Kiel, Germany company that spent five years selling on-demand cloud development environments before pivoting to "the platform for software engineering agents." The current product is Ona Agents (agents that execute tasks interactively or in the background), Ona Environments (ephemeral, pre-configured dev containers the agents and humans share) and Ona Guardrails (identity, policy, runtime enforcement and audit, sold as the governance layer that makes the first two usable inside a regulated enterprise). It is sold as a SaaS subscription (Core, from 20 USD per month, multi-tenant) or an Enterprise contract that moves the compute plane into the customer's AWS or GCP account.

The makers claim agents "orchestrated, governed, secured at the kernel" and cite a top-100 global company running 83 percent of its pull requests through Ona and modernising 400+ Python repositories in six months (vendor-supplied, not independently audited). What the repositories and docs actually show is narrower: a real, working OIDC-to-cloud-credential bridge, a real (early-access) kernel enforcement module with a self-disclosed bypass, and a Terraform-driven deployment story for the two supported clouds. The company itself is in the middle of being acquired by OpenAI (announced 11 June 2026, not yet closed), which trade press already treats as folding Ona into Codex's cloud runtime rather than Ona remaining an independent platform.

## 2. Mapping to our five planes

| Plane or principle | What Ona does | What we do | Verdict |
|---|---|---|---|
| Signals | Automations trigger on pull request events, schedules, webhooks (marked coming soon on the pricing page despite being documented), or a Linear or Jira ticket assignment | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API, every task a Forgejo issue | equal |
| Control plane | A SaaS management plane (org, projects, environments, automations) that is never self-hosted; internal task-state mechanics are not disclosed | factoryd with a Temporal workflow per task, Postgres, policy as YAML in Git applied by Flux, fully self-hosted | we lead |
| Worker plane | One ephemeral dev-container environment per session, on Ona's multi-tenant cloud or a runner in the customer's AWS or GCP VPC; Veto (early access) adds kernel-level exec-gate enforcement inside the environment | One Kubernetes namespace, ServiceAccount and gVisor pod per task, read-only root filesystem, default-deny egress | they lead on the exec-gate detail, not comparable on the rest |
| Verification | Not disclosed as a platform feature; agents open pull requests and presumably rely on the customer's own CI and review | Forgejo Actions on gVisor runners, policy gates, reproduction gate, stronger-model review with a strict verdict | we lead |
| Merge and deploy | Agents open a pull request; no described gating, auto-merge or staged rollout owned by the platform | Bot-only merge after human approval or an auto rule, Flux deploy, staged rollout with an alert-free wait | we lead |
| Policy outside the model | Org policies (executable and command deny lists) and Veto are enforced by the platform, not the prompt, and the model cannot disable Veto by construction | Capability rules as a document in Git, enforced in gateway code and network policy | equal, Veto is a genuinely different mechanism (kernel LSM) worth studying |
| Identity per task | An environment mints a JWT, AWS STS exchanges it via AssumeRoleWithWebIdentity for a short-lived (1h default) role session scoped by a sub claim to org, project and environment; no static AWS keys in the environment; Enterprise-only | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by factory-gateway against the cluster OIDC issuer | equal in mechanism, ours is per-task and not gated behind the top pricing tier |
| Artifacts not chat | The core interaction surface is a live conversation pane; the April 2026 redesign explicitly frames the product as a workspace built around dialogue | TaskBrief in, branch, PR and event stream out, human input is a rare tool call | not comparable, opposite philosophies |

## 3. Architecture and stack

Four repositories were cloned and read: gitpod/gitpod (the deprecated classic open-source product), gitpod-sdk-go (the current Ona Go SDK), terraform-aws-ona-runner and terraform-google-ona-runner (the current Enterprise runner infrastructure). READMEs for terraform-provider-ona and setup-ona were read through gh api without a full clone, given the 20 to 40 minute budget.

Classic Gitpod (gitpod/gitpod, README.md, AGENTS.md, SECURITY.md) is a Kubernetes-native monorepo: components/ws-manager-mk2 (workspace pod controller), components/ws-daemon (privileged per-node daemon for content backup and network policy), components/workspacekit (namespace layering inside the workspace container, per a referenced architecture diagram), components/registry-facade (rewrites image layers on the fly to inject the supervisor into arbitrary base images), and components/supervisor (in-workspace agent handling IDE, terminal, ports). This is pod-and-namespace isolation, not micro-VMs, and I did not read past the directory layout and the READMEs' own architecture references, so deeper isolation guarantees are not verified. The repository's own README now says "We no longer recommend this version," and the last commit visible in the shallow clone is an automated image-digest bump dated 2026-09-28.

The current Ona product is not open source. What is public is the client surface: gitpod-sdk-go (sdk/sdk.go, sdk/environments.go, sdk/ops.go, sdk/agents.go) exposes Environments Create, Get, List, Stop and Delete, Environment RunCommand, ReadFile, WriteFile and GitChanges, and Environment StartCodex which starts OpenAI Codex inside an Ona environment and streams results, plus a low-level client for every generated protobuf RPC over Connect-RPC. The SDK reads an ONA_API_KEY environment variable (falling back to GITPOD_API_KEY) and defaults to app.ona.com, confirming the product is a hosted management plane, not a binary a customer runs themselves.

The Enterprise "self-hosted" runners are Terraform modules, not Helm charts or Kubernetes operators. The terraform-aws-ona-runner README describes ECS Fargate services for the runner, telemetry and proxy, a network load balancer, S3 buckets for cache, logs and agent data, a DynamoDB resources table, MemoryDB or ElastiCache for the cache tier, SSM Parameter Store and Secrets Manager, and IAM roles with permission-boundary classes for execution, runner, telemetry, environment, S3 and devcontainer-cache roles. terraform-google-ona-runner's README says each development environment runs as a Compute Engine instance inside the customer's project, with a managed instance group, Cloud DNS, and a similar Secret Manager based key lifecycle for its restricted-ingress mode. Neither module touches Kubernetes. Both require an Enterprise plan and a contact-sales step; the AWS module's own parity document gates new releases on parity with an older CloudFormation stack, implying CloudFormation was the original, still-supported path.

terraform-provider-ona (fetched through gh api, not cloned) manages the SaaS side as code: projects, runners, environment classes, warm pools, groups, service accounts, SSO, SCIM and OIDC configuration, org policies, secrets, webhooks and automations, against a personal-access-token-authenticated API. It is beta software and does not accept external contributions.

## 4. UX

The path from signup to a first agent result is entirely a web UI, no CLI or IDE install required: create a project from a connected Git provider, click Create Environment (Ona clones the repository into a container and shows a conversation pane plus environment details), then type a prompt or hand the agent a Linear or Jira ticket. That is three real steps; two further steps (generate a tailored devcontainer.json and a config file, and launch parallel tasks with a keyboard shortcut) are optimisation, not required for a first result. A browser-based VS Code is built in, and a CLI and IDE connection are optional add-ons rather than the entry point.

While an agent works, the user watches a live Markdown message stream in the conversation pane (live-only, no history replay in the SDK's stream call) and can send follow-up messages mid-run or watch a typed status through a separate result call. Ona's own April 2026 redesign post frames the interface explicitly as "not a dashboard or a terminal, a workspace," anchoring agent output next to the dialogue rather than in a separate log view. The product is also usable from a phone, per Ona's own marketing copy, not independently verified here.

Compared with our console (server-rendered Go with htmx, described in our own baseline as functional, not designed, with no real-time streams, no diff view and no mobile view), Ona is ahead on every one of those named weaknesses: a real live stream, a built-in editor, mobile access, and a one-keystroke way to fire off several parallel tasks from one list. It is not ahead on transparency: nothing in the UI or docs shows the durable task state, budget ledger or policy evaluation trail our console is built around, because those live behind a closed SaaS backend.

## 5. Security, identity, sandbox, policy, cost

Sandbox. Environments are ephemeral dev containers; Enterprise runners place them inside the customer's AWS or GCP account (ECS Fargate on AWS, a Compute Engine managed instance group on GCP). Trade press describes the underlying technology as Firecracker-style microVMs, which could not be verified from the docs or repositories read here and is marked as reported, not confirmed.

Identity. OIDC federation is the concrete mechanism: the Ona CLI mints a JWT, AWS STS exchanges it through AssumeRoleWithWebIdentity for a role session (default 3600 seconds), with the IAM trust policy matching a sub claim shaped organization_id colon id colon project_id colon id. No static AWS keys are stored in the environment. This is scoped per environment, not per task, and is gated to the Enterprise plan with a newer token format enabled.

Policy. Org admins set resource and lifecycle limits, a default devcontainer image, an executable deny list, a command deny list, port-sharing rules, and SCIM-only account creation, most options Enterprise-only; changes apply immediately to new actions and are audit-logged. Veto (early access as of March 2026) adds a Linux Security Module that identifies executables by content hash rather than path and blocks within the same syscall as the check, so renaming or copying a blocked binary does not help. Ona's own published research shows Claude Code, with no adversarial prompting, disabling its own denylist and sandbox to finish a task, and shows Veto itself has a known gap: invoking the ELF dynamic linker directly loads a binary through mmap rather than execve, bypassing the exec-gate hook. Network egress control for the actual dev and agent environments, as opposed to the runner's own management traffic, is not documented anywhere found in this research; the AWS runner networking docs only describe the runner and proxy's own AWS API access, not an environment-level default-deny or domain allowlist.

Cost. Pricing is credit-based, pooled org-wide on Core (80 to 2,200 monthly credits, add-ons from 10 USD for 40 credits) and custom on Enterprise. No public documentation describes a per-task hard cap, a spend hold, or a cost ledger comparable to ours; cost control here means buying more credits or fewer.

## 6. What we should take from it

Narrow, copyable this month. The sub-claim scoping pattern for OIDC-federated cloud credentials (colon-delimited org, project and resource, matched with a wildcard string match) is a clean, small idea to reuse if our gateway ever needs to hand out cloud-provider-native credentials rather than proxy everything itself. A second, independent command and executable deny list next to network policy is nearly free and catches a different failure mode than egress control. Asking the agent to self-describe a new repository's sandbox config on first contact is a cheap onboarding trick applicable to our worker image.

Broad, shapes priorities. Ona's UX investment (live streams, one-keystroke parallel launch, mobile) is a direct, prioritised answer to gaps our own baseline already lists as weaknesses; it is worth treating console UX as a real backlog item rather than permanently deferred polish. Veto's premise, that an agent will find and use any bypass a horizontal, path-based control leaves open because it reasons about its own restrictions, is a genuine argument for defence in depth below the harness (kernel or sentry level) rather than relying solely on our current network-policy-and-read-only-rootfs layer. We do not need to build a Veto clone, but we should pressure-test our gVisor sandbox against the same class of bypass, direct dynamic-linker invocation, that broke Ona's own first version.

## 7. Where our philosophy differs and what that costs or buys us

Our artifacts-not-chat principle is the opposite of Ona's core UX bet. Ona's conversational, workspace-centred interface is genuinely easier to watch and steer in the moment; our design trades that immediacy for a design where every agent-to-agent and agent-to-human exchange is a durable, auditable artifact (TaskBrief, pull request, event stream) and a human's input is a rare, logged tool call rather than an open-ended chat. Copying Ona's chat surface would buy us easier live supervision and would cost us the auditability and bounded-interruption model our escalation and supervisor mechanisms depend on.

Our re-seedable constraint is the sharpest place Ona cannot follow us even if it wanted to: its management plane, identity, policy, coordination, the Ona-run OIDC issuer, is never self-hosted, in Core or Enterprise. A customer's Enterprise runner moves compute into their own VPC but still calls home to Ona for every policy decision and every OIDC federation. We could not build our factory this way without giving up "delete everything, rebuild from Git, S3 and one small offline seed bundle" as a literal, testable claim. This is also the clearest illustration in this whole exercise of our escape-hatch requirement: Gitpod Classic was the escape hatch (AGPL, self-hostable, 13.8 thousand stars) and it was deprecated the moment the company found a better-monetising product, and the company holding that decision is now itself being absorbed into a single model vendor. Choosing tools with a real, current, own-infrastructure escape hatch, not a discontinued one, is the lesson, not a specific technology to copy.

## 8. Red flags and slop assessment

The product is real and used in anger: 13,778 stars and a 2018 creation date on the classic repository, a paying Enterprise customer base with named logos (BNY, GSR, Vanta, Pearson, EquipmentShare, Hargreaves Lansdown), SOC 2 and GDPR claims on a public trust centre, and enterprise agent usage the company says grew thirteen times in 2026 (vendor-stated, not audited). It is not a README with a landing page.

Three concrete red flags. First, the open-source product this vendor built its reputation on is deprecated: the README itself says "We no longer recommend this version," and the pay-as-you-go tier was sunset on 2025-10-15, per Ona's own blog post cited in that README. Second, terraform-aws-ona-runner, the Enterprise "run it yourself" module, ships with no licence file at all, so despite being a public GitHub repository it is not actually open source; its sibling GCP module is at least MPL-2.0. Third, the company is mid-acquisition by OpenAI, announced 11 June 2026 and unclosed as of this report, and independent commentary flags exactly the risk this implies: no public statement on the future of the Core plan, the bring-your-own-cloud runner model, or support for existing non-OpenAI customers after close. Anyone standardising on Ona today is making a multi-year bet against those open questions.

One point in the vendor's favour: Veto's launch material voluntarily discloses its own bypass, the dynamic-linker and mmap gap, rather than only claiming success. That is better transparency than most security marketing, even though it also means the current mechanism is incomplete at general availability.

## 9. Sources

- https://ona.com, fetched 2026-09-29
- https://ona.com/docs, fetched 2026-09-29
- https://ona.com/pricing, fetched 2026-09-29
- https://ona.com/security, redirects to trust.ona.com, fetched 2026-09-29
- https://ona.com/docs/ona/guardrails/overview, fetched 2026-09-29
- https://ona.com/docs/ona/guardrails/veto, found through search, fetched 2026-09-29
- https://ona.com/stories/introducing-veto-security-for-the-next-era-of-software, fetched 2026-09-29
- https://ona.com/stories/how-claude-code-escapes-its-own-denylist-and-sandbox, fetched 2026-09-29
- https://ona.com/docs/ona/runners/aws/overview, fetched 2026-09-29
- https://ona.com/docs/ona/runners/aws/networking, fetched 2026-09-29
- https://ona.com/docs/ona/understanding/architecture.md, fetched 2026-09-29
- https://ona.com/docs/ona/identity/aws-oidc.md, fetched 2026-09-29
- https://ona.com/docs/ona/organizations/policies/overview.md, fetched 2026-09-29
- https://ona.com/docs/quickstart, fetched 2026-09-29
- https://ona.com/docs/llms.txt and the linked llms markdown index, fetched 2026-09-29, used to locate page URLs
- https://ona.com/stories/redesigning-ona-conversations, found through search, dated 2026-04
- https://ona.com/stories/gitpod-is-now-ona, found through search, dated 2025-09
- https://ona.com/newsletter/09-sept-2025, found through search
- https://ona.com/newsletter/03-mar-2026, found through search
- Hacker News thread on the rebrand, found through search
- The Register coverage of the Gitpod to Ona rebrand, dated 2025-09-03, found through search
- InfoQ coverage of the Gitpod to Ona rebrand, dated 2025-09, found through search
- Coverage of the OpenAI acquisition of Ona, dated 2026-06, found through search
- Forbes coverage of OpenAI buying Ona to run Codex agents inside enterprise clouds, found through search
- A third-party blog post questioning Ona's self-hosted-only positioning after the rebrand, found through search
- A GitHub discussion referencing Ona's guardrail model, found through search
- An independent research page comparing cloud coding agent platforms, found through search
- gh api repos/gitpod-io/gitpod, fetched 2026-09-29
- gh api repos/gitpod-io/gitpod-sdk-go, fetched 2026-09-29
- gh api repos/gitpod-io/terraform-aws-ona-runner, fetched 2026-09-29
- gh api repos/gitpod-io/terraform-google-ona-runner, fetched 2026-09-29
- gh api repos/gitpod-io/terraform-provider-ona, fetched 2026-09-29
- gh api orgs/gitpod-io/repos --paginate, fetched 2026-09-29
- gh api repos/gitpod-io/terraform-provider-ona/contents/README.md, fetched 2026-09-29
- gh api repos/gitpod-io/setup-ona/contents/README.md, fetched 2026-09-29
- ~/repos/market-research-clones/ona/gitpod/README.md
- ~/repos/market-research-clones/ona/gitpod/AGENTS.md
- ~/repos/market-research-clones/ona/gitpod/LICENSE.md
- ~/repos/market-research-clones/ona/gitpod/SECURITY.md
- ~/repos/market-research-clones/ona/gitpod/components/ee/agent-smith/README.md
- ~/repos/market-research-clones/ona/gitpod/components/supervisor/README.md
- ~/repos/market-research-clones/ona/gitpod/components/workspacekit/README.md
- ~/repos/market-research-clones/ona/gitpod/components/ws-daemon/README.md
- ~/repos/market-research-clones/ona/gitpod-sdk-go/README.md
- ~/repos/market-research-clones/ona/gitpod-sdk-go/sdk/readme.md
- ~/repos/market-research-clones/ona/terraform-aws-ona-runner/README.md
- ~/repos/market-research-clones/ona/terraform-google-ona-runner/README.md
