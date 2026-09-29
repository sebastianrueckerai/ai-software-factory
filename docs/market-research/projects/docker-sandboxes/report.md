---
name: Docker Sandboxes, MCP Gateway, cagent
slug: docker-sandboxes
url: https://docs.docker.com/ai/
repo: https://github.com/docker/cagent
category: sandbox-runtime
license: "mixed: Apache-2.0 (cagent/Docker Agent), MIT (mcp-gateway), proprietary (Docker Sandboxes cloud compute, Docker AI Governance)"
open_source: partial
self_hostable: partial
hosting_model: local sandboxes run free on the developer's own machine. Cloud sandboxes are Docker-managed SaaS from 0.07 USD/hour. Org-wide policy governance is a separate paid subscription sold through sales
company: Docker, Inc., Palo Alto CA, founded 2013 (dotCloud rebrand). Last priced round 105M USD Series C led by Bain Capital Ventures, March 2022, 2.1B USD valuation. Secondary-market estimates (TrueUp, Aug 2026) put current value near 1.0B USD. About 1,055 employees, CEO Don Johnson
maturity: "docker/cagent (now docker/docker-agent): 3,361 stars, 466 forks, 43 open issues, repo created 2025-09-01, last push 2026-09-29, near-daily releases (v1.145.0 on 2026-09-28). docker/mcp-gateway: 1,587 stars, MIT, created 2025-04-22, pushed 2026-09-23. Docker Sandboxes launched March 2026, Cloud Sandboxes launched 2026-09-24, five days before this report"
similarity: 2
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 4
  verification: 0
  policy_outside_model: 3
  identity_per_task: 2
  cost_control: 1
  ux: 4
  reseedable_selfhost: 1
steal:
  - "Sandbox Kits: a YAML spec declaring tools, env vars, injected credentials, allowed network domains, files to drop in and startup commands for a sandbox. Docker has committed to submitting the spec to the CNCF, which would make it a portable declarative sandbox-launch format worth adopting or mapping our own TaskBrief-plus-policy shape onto."
  - "Host-side forward proxy credential injection: the agent inside the microVM only ever sees a placeholder value in its outbound request. The proxy on the host swaps in the real API key or token after the request leaves the VM, so the raw credential never enters the sandbox. Same shape as our own 'sandbox holds no key material' rule, worth comparing against our gateway-verifies-JWT approach for any secret that is not a Kubernetes-native identity."
  - "The harness concept (docs/features/harnesses): an agent config can declare harness type claude-code, codex, opencode or pi and delegate the whole coding loop to an external CLI, while Docker Agent supplies orchestration, hooks, permission checks and OCI distribution. This is an independent, shipped implementation of exactly our own pluggable Harness interface, one generation ahead in breadth (four external CLIs, not one)."
  - "Board (docker agent board): a Kanban TUI where each card runs an agent in a tmux session on its own git worktree, with a customisable column pipeline (Dev -> Review -> Push -> Done) whose forward move sends the destination column's prompt to the agent, live status per card (starting/loading/attaching/running/crashed) and a bound diff view. Our own vision doc lists 'no diff view' and 'no real-time stream' as known console gaps. This is a working answer to both, in a TUI rather than a web console."
  - "Deny-by-default host proxy for all outbound sandbox traffic, managed by a sbx policy CLI independent of the agent process and the model, with sbx policy ls and sbx policy log to inspect rules and traffic. Confirms our own default-deny network policy is the right default, but also a cautionary tale: Docker ships a permissive default allowlist with broad wildcards (*.googleapis.com) that the docs explicitly warn to prune, a trap worth checking we do not repeat in our own gateway defaults."
  - "pkg/permissions: an Allow/Ask/Deny Checker over glob tool-name and argument patterns (e.g. shell:cmd=rm*), evaluated deny-then-allow-then-ask entirely in Go, with a Merge to combine several rule sets. A small, reusable shape for any place we want per-tool-call policy finer than network egress without touching a prompt."
differs:
  - "There is no task registry, scheduler, approval workflow, budget or audit trail anywhere in the product family. docker-agent persists session state per sandbox but never claims durable multi-task orchestration. Adopting any of this would replace at most our worker-plane sandbox, never factoryd. It is not a competing control plane."
  - "Identity is developer- and session-scoped, not task-scoped. One host proxy per developer machine holds long-lived provider API keys and injects them into whichever sandbox is running. There is no short-lived, audience-restricted, per-task token verified against an external identity provider. Copying this pattern as-is would pull us back from 'identity belongs to the task' toward 'identity belongs to the laptop'."
  - "The parts that would make this an operable multi-developer platform, not just a personal dev tool, are paywalled: centralised network/filesystem/MCP policy enforcement and audit logs (Docker AI Governance) are a separate subscription reached by contacting sales, with no self-hosted open equivalent shown in the docs. Depending on that layer would violate our 'escape hatch if maintainers gate needed features' constraint."
  - "Cloud sandboxes run only on Docker-managed infrastructure with no bring-your-own-cloud or on-prem multi-tenant mode. It could never sit inside a 'delete everything, rebuild from Git and S3' pipeline as anything but an optional, rentable accelerator for one developer or one project, the same ceiling Namespace hits in the ci-build category."
ux_verdict: The fastest zero-to-first-result path in this survey for a coding-agent tool (Docker Desktop ships the plugin, one API key, docker agent run), and Board's Kanban-plus-diff-plus-live-tmux-attach TUI is closer to what our console still owes its users than anything else surveyed so far, even though it manages developer sessions, not factory tasks.
slop_verdict: Real and shipped by a large, active vendor (near-daily docker-agent releases, 3.3k and 1.6k GitHub stars across the two open repos, Cloud Sandboxes launched five days before this report), but it is three fast-moving products under one name with a mid-2026 rebrand already behind it (cagent to Docker Agent) and its governance and audit story sold, not published.
---

# Docker Sandboxes, MCP Gateway, cagent

## 1. What it is

This is three Docker Inc. products that only make sense read together. **cagent**, renamed **Docker Agent** during 2026 but still living at github.com/docker/cagent, is an Apache-2.0 CLI and TUI for defining and running AI agents from a declarative YAML config, with multi-agent delegation, an OCI-distributable agent format, and a docker agent board Kanban TUI for running several agent sessions on separate git worktrees. **Docker Sandboxes** is a March 2026 product that runs each agent in a disposable microVM with its own kernel and its own Docker daemon, on the developer's own machine or, since 24 September 2026, on Docker-managed cloud compute. **MCP Gateway** (docker/mcp-gateway, MIT) is a proxy that launches MCP servers as containers with restricted privileges and forwards tool calls to them, backed by a hosted catalog (desktop.docker.com/mcp/catalog/v3).

Docker's own framing, repeated across its docs and a September 2026 blog post, is that "containers weren't designed for the level of isolation AI agents demand," positioning Sandboxes as the missing layer between a laptop and a coding agent with shell access. What the code and docs actually show is narrower but genuine: docker-agent shells out to a separate sbx/docker sandbox binary for isolation (pkg/sandbox/backend.go), rather than implementing a VM boundary itself, and the enterprise-grade parts (org-wide policy enforcement, audit logs) are an invite-only paid add-on, not in either open repository.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. A developer starts an agent by hand or via Board. Nothing reacts to an issue, PR comment or alert | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | None. Session state is per-sandbox and per-tmux-card, no durable task registry, no budgets, no approvals beyond a tool-call Allow/Ask/Deny prompt | Temporal workflow per task, Postgres, policy in Git, budgets, approvals, cost ledger | we lead |
| Worker plane | One microVM sandbox per session, own kernel, own Docker daemon, host proxy for network and credentials (axis: sandbox_isolation 4) | gVisor pod per task, ServiceAccount, read-only rootfs, default-deny egress | comparable strength, different mechanism |
| Verification | None. No test gate, no policy gate, no model review before an agent's diff is used | Forgejo Actions, policy gates, stronger-model review | we lead |
| Merge and deploy | None. Board's "Push" column is a prompt sent to the agent, not an enforced merge gate | Bot merge after approval, Flux GitOps, staged rollout | we lead |
| Policy outside the model | Host-side deny-by-default network proxy plus a Go permissions.Checker (Allow/Ask/Deny glob patterns), both enforced outside the model. Org-wide enforcement is paid (axis: policy_outside_model 3) | Capability YAML in Git, enforced in gateway code and network policy | we lead on scope and cost, comparable on mechanism |
| Identity per task | One host-proxy credential per developer machine injected into whichever sandbox runs. No per-task token or audience check (axis: identity_per_task 2) | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task | we lead |
| Artifacts not chat | Agents are packaged and shared as OCI images. Sub-agent delegation passes a clean task description, but Board and handoffs also keep live conversational sessions | TaskBrief in, branch, PR, event stream out | partial equivalence |

## 3. Architecture and stack

docker-agent is a single Go module (github.com/docker/docker-agent, go.mod), built as a docker CLI plugin and a standalone binary. Isolation is delegated: pkg/sandbox/backend.go shells out to either docker sandbox or a standalone sbx binary ("built from the same source"), constructing commands like sbx policy allow network --sandbox <name> <hosts> (pkg/sandbox/backend.go) and sbx run --cloud ... for cloud sandboxes (pkg/sandbox/cloud.go). Tool-call policy lives in pkg/permissions/permissions.go as a glob-and-argument pattern Checker evaluated deny-then-allow-then-ask, entirely outside the model. MCP servers are resolved through pkg/gateway/catalog.go, which fetches and caches Docker's hosted MCP catalog JSON. Model traffic for hosted auth flows goes through pkg/modelsgateway/relay, a generic credential-relaying HTTP proxy. Multi-agent orchestration (docs/concepts/multi-agent/index.md) offers two patterns: sub_agents (hierarchical delegation via a transfer_task tool, always auto-approved) and handoffs (peer-to-peer, shared conversation history). A harness agent (docs/features/harnesses/index.md) delegates its coding loop entirely to an external CLI (claude, codex, opencode, pi) found on PATH. Docker Sandboxes itself is closed source: per its own architecture docs it is a custom hypervisor-based microVM (Docker states it built its own VMM rather than adopting Firecracker, for macOS/Windows portability), not verified from source since none is published.

## 4. UX

Onboarding for docker-agent is effectively two steps once Docker Desktop (4.63+) is installed. Set one provider API key, run docker agent run. docker agent new scaffolds a YAML config interactively. Watching and intervening happens through a TUI by default, or through docker agent board, which shows every running agent as a card with a live status (starting, loading, attaching, running, crashed) mirrored from the agent's own control socket, supports attaching a terminal to any card, viewing its worktree diff, opening it in an editor, or moving it through a customisable review pipeline whose column change sends a prompt to the agent. Docker Sandboxes adds a Sandboxes API and SDK for programmatic control of cloud sandboxes. There is no chat-first or web console surface. Everything is CLI or TUI.

## 5. Security, identity, sandbox, policy, cost

**Sandbox.** Each sandbox is a microVM with its own kernel and its own Docker Engine, "no path to the host daemon." Direct workspace mode mounts the host tree read-write with real-time edits, which the docs themselves flag as a risk for anything that runs implicitly (Makefiles, CI configs, git hooks that "do not appear in git diff output"). Clone mode mounts read-only instead. Local stdio MCP servers run on the host with host permissions, explicitly called out as outside sandbox isolation.

**Identity and credentials.** A host-side forward proxy injects real credentials into outbound HTTP requests. The agent inside the VM only ever sees a placeholder, so "the credential remains on the host." This is a session- and machine-scoped secret, not a task-scoped one.

**Policy.** Outbound TCP is deny-by-default through the host proxy, managed by sbx policy. The shipped default allowlist is permissive (wildcard domains like *.googleapis.com) and the docs recommend pruning it. Centralised, org-wide enforcement of network, filesystem and MCP policy, plus audit logs, exists only as Docker AI Governance, a paid subscription sold through Docker Sales with no self-hosted open path shown.

**Cost.** Local compute and the CLI are free including for commercial use. Cloud sandbox compute is billed pay-as-you-go from 0.07 USD/hour. Model provider fees are billed separately to the user's own key. No budget cap, spend hold or cost ledger of any kind was found in the code or docs.

## 6. What we should take from it

Narrow: the harness-as-config pattern and the permissions Checker (section "steal" above) are both small, concrete, independently-arrived-at validations of choices we already made (a swappable Harness interface, policy enforced in code). Worth reading pkg/permissions/permissions.go in full if we ever want per-tool-call rules finer than network egress.

Broad: Board is the clearest external evidence that a Kanban-plus-live-attach-plus-diff view is both buildable and valuable for exactly the console gaps our own vision doc names as unfinished (no real-time stream, no diff view). It manages developer sessions rather than factory tasks, but the interaction shape (a card per running agent, a column pipeline that sends a prompt on advance, live status mirrored from a control socket) is a closer model to copy than anything else surveyed here.

## 7. Where our philosophy differs and what that costs or buys us

Docker's stack buys real, shipped, cross-platform microVM isolation without us having to build or operate a hypervisor layer ourselves, at the cost of it only running on a developer's laptop or Docker's own cloud, never on our own Hetzner boxes as a Kubernetes-native, multi-tenant sandbox. That rules it out as a worker-plane substitute under our commodity-hardware and re-seedable constraints. At most it is a pattern to study, not infrastructure to adopt.

Its credential model (one host proxy, one set of long-lived keys, injected per session) is simpler to operate than our per-task ServiceAccount token verified against the cluster OIDC issuer, and that simplicity is the point for a single-developer tool. For us it would be a regression: it reintroduces exactly the "a compromised sandbox can act as the developer" risk our per-task identity principle exists to remove.

Its governance layer being sold, not published, is the same open-core shape we flag as a risk elsewhere in this survey: fine as a note today since we depend on none of it, but a reason not to build against Docker's sandbox or governance APIs as a dependency later without checking the licence terms first.

## 8. Red flags and slop assessment

Real and actively developed: docker-agent ships near-daily (v1.145.0 on 2026-09-28, four figures of merged PRs since a 2025-09-01 repo creation), mcp-gateway is pushed weekly, and Cloud Sandboxes shipped five days before this report was written. Docker Inc. itself is large (about 1,055 employees) but financially ambiguous: its last priced valuation (2.1B USD, March 2022) is three and a half years stale, and a secondary-market estimate from August 2026 puts current value near 1.0B USD, roughly half. The cagent-to-Docker-Agent rename mid-product-life is a minor but real signal of a still-settling product identity. No security incident was found in search for either repository. The clearest open-core tell is structural, not a scandal: the parts a multi-developer organisation would actually need to operate this safely at scale (central policy enforcement, audit logs) are explicitly "coming soon" or paid-and-sales-gated, while the parts that make good marketing (the CLI, the TUI, the isolation story) are free and open.

## 9. Sources

- https://github.com/docker/cagent (redirects to docker/docker-agent. `gh api repos/docker/cagent` confirmed the rename, 2026-09-29)
- Clone: `git clone --depth 1 https://github.com/docker/cagent /home/womb/repos/market-research-clones/docker-sandboxes`
- Clone file: README.md
- Clone file: AGENTS.md
- Clone file: CHANGELOG.md
- Clone file: go.mod
- Clone file: LICENSE
- Clone file: SECURITY.md
- Clone file: pkg/sandbox/sandbox.go
- Clone file: pkg/sandbox/backend.go
- Clone file: pkg/sandbox/cloud.go
- Clone file: pkg/sandbox/options.go
- Clone file: pkg/permissions/permissions.go
- Clone file: pkg/gateway/catalog.go
- Clone file: pkg/gateway/types.go
- Clone file: pkg/modelsgateway/relay/relay.go
- Clone file: docs/concepts/multi-agent/index.md
- Clone file: docs/features/harnesses/index.md
- Clone file: docs/features/board/index.md
- https://docs.docker.com/ai/sandboxes/security/ (fetched)
- https://docs.docker.com/ai/sandboxes/architecture/ (fetched)
- https://docs.docker.com/ai/sandboxes/governance/ (fetched)
- https://docs.docker.com/ai/ (site listed in the seed table)
- WebSearch: "Docker Inc valuation 2026 employees", cited results including PitchBook/Sacra-style secondary-market estimate (~1.0B USD, August 2026) against the March 2022 primed round (2.1B USD)
- WebSearch: "Docker Sandboxes security incident breach 2026", no incident reports found for docker-agent, mcp-gateway, or Docker Sandboxes
