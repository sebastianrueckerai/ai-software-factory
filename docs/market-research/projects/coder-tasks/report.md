---
name: Coder Tasks / Coder Agents (with Boundary and AgentAPI)
slug: coder-tasks
url: https://coder.com/docs/ai-coder
repo: https://github.com/coder/coder
category: kubernetes-agents
license: "mixed: AGPL-3.0 core (coder/coder), proprietary Enterprise Software license for enterprise/ (source-visible, licence-key gated), MIT for boundary and agentapi"
open_source: partial
self_hostable: yes
hosting_model: self-hosted control plane (coderd) plus workspaces on the customer's own Kubernetes, cloud, VM or Docker infrastructure; no SaaS-only path
company: Coder Technologies, founded 2017, Austin TX. 90 USD million Series C led by KKR (with QRT, Uncork, Georgian, Kleiner Perkins, Redpoint), announced 2026-04-01, on top of an earlier 65 USD million Series B. CEO Rob Whiteley.
maturity: coder/coder created 2021-12-22, 16750 stars, 1597 forks, 1142 open issues, 30 listed contributors, last commit 2026-09-29. agentapi created 2025-04-07, 1500 stars, archived 2026-09-13 (marked deprecated and unmaintained). boundary created 2025-09-01, 25 stars, active, last commit 2026-08-12. Releases roughly every 1-2 weeks (current line 2.37, GA 2026-09-01).
similarity: 3
axes:
  signals_intake: 1
  control_plane: 3
  sandbox_isolation: 3
  verification: 1
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 2
  ux: 4
  reseedable_selfhost: 3
steal:
  - Agent loop moved out of the disposable sandbox and into the durable control plane, so the workspace never needs outbound access to a model provider and a crashed or killed sandbox does not lose conversation state
  - Real-time chat UI with a live git diff sidebar and a plan-mode step, both rendered from the same event stream the API exposes, not a screen-scraped terminal
  - Landlock-based egress enforcement (landjail) as a capability-free alternative to iptables/CAP_NET_ADMIN for the common case, falling back to network-namespace interception (nsjail) only where the LSM is unavailable
  - Default-deny allowlist rule engine with three matchable keys (method, domain, path) that OR together, small enough to read as a single Go file (rulesengine/engine.go)
  - Post-response cost booking per call plus proactive steering (warn the agent as it nears its cap) as a cheap addition on top of a hard ceiling, not a replacement for one
differs:
  - Identity belongs to the human who typed the prompt, not to the task; every PR, push and API call the agent makes carries the submitting user's own permissions and OAuth token, with no task-scoped credential and no audit boundary between a person's manual actions and their agent's actions
slop_verdict: Real, funded, and in production at named enterprise customers (KKR, QRT), but the product itself churns hard. Tasks shipped, was deprecated within roughly a year, and was removed from new releases on 2026-09-01, the same week a critical (CVSS 9.0) supply-chain compromise of Coder's own module registry (GHSA-vx42-ghc9-gw65) shipped malicious Terraform modules to self-hosted deployments.
ux_verdict: "Fastest onboarding in this comparison set for a human pairing with one agent (open a chat, type a prompt, watch a live diff), but the thing being reviewed keeps changing under the user: three architectures (Tasks, Coder Agents, Agent Relay) shipped or deprecated in 2026 alone."
---

# Coder Tasks / Coder Agents (with Boundary and AgentAPI)

## 1. What it is

The project named in the brief, "Coder Tasks" with AgentAPI driving agents inside Kubernetes-native workspaces, is Coder's product as it existed through early 2026. It no longer exists in that form. Coder Technologies sells a self-hosted platform, `coderd`, that provisions developer workspaces from Terraform templates on whatever infrastructure the customer runs (Kubernetes, AWS, Azure, GCP, Docker, VMs). Tasks was a 2025-era feature that ran a coding agent (Claude Code, Aider, Goose, Codex) inside one of those workspaces, wrapped by AgentAPI, a small Go HTTP server that drove the agent by screen-scraping its terminal. Coder's own docs (`docs/ai-coder/agents/tasks-to-chats-migration.md`) say Tasks was deprecated at 2.34, moved to a 12-month Extended Support Release from 2026-06-02, and removed from new releases starting with 2.37 on 2026-09-01. `curl -sI https://coder.com/docs/ai-coder/tasks` and `.../github-to-tasks` both now 301 to `/docs/ai-coder/agents` (checked 2026-09-29); `coder.com/tasks` 404s. AgentAPI itself was archived on GitHub on 2026-09-13 with a README banner: "This project is deprecated and no longer actively maintained."

The replacement, "Coder Agents," inverts the architecture: the agent loop is a first-party Go program running inside `coderd`, the control plane, not inside the workspace. A user drives it through a web chat UI or the `/api/v2/chats` REST and WebSocket API. Coder's docs are explicit that this is not a wrapper around Claude Code or Codex: "a standalone agent written in Go." Workspaces used only for Coder Agents can be fully network-isolated, since the model call now originates from the control plane. Coder Agents went to beta 2026-05 (InfoQ, 2026-05) and GA in 2.37 on 2026-09-01 (`coder.com/changelog/coder-2-37`, titled "Coder Agents Goes GA in 2.37"). A third path, Agent Relay, launched 2026-09-02 and added Claude Code support 2026-09-15 (GlobeNewswire): it keeps the agent loop in a cloud vendor's own hosted service (Cursor Cloud Agents, Claude Code) and only runs the tool-execution worker inside a self-hosted Coder workspace.

Boundary (`github/coder/boundary`, formerly called "Agent Boundaries") is a separate, small, MIT-licensed Go binary that enforces a default-deny network allowlist around any process, agents included. It is one of two components of the Premium-gated "Agent Firewall" feature; the raw CLI is free.

Coder's marketing calls this "secure environments for developers and their agents" and leans hard on governance and audit for regulated enterprises. The code substantiates parts of this: the control-plane-hosted agent, the Tailnet-based connectivity, the rule engine. It does not substantiate a stable product: three different architectures for running an agent shipped or were deprecated inside 2026, and the identity model (below) is weaker than the marketing implies.

## 2. Mapping to our five planes

| Plane or principle | Coder | Us | Verdict |
|---|---|---|---|
| Signals | A human types a prompt in the chat UI or API. `docs/ai-coder/agents/getting-started.md` describes a bring-your-own pattern -- "Creating Coder Agents from GitHub webhooks on new issues or PRs" -- but this means a customer's own webhook receiver calling `POST /api/v2/chats`. There is no first-party GitHub App, issue-tracker connector, or alert intake in the product | Forgejo webhooks, SigNoz alert webhooks, an intake API; every task is a Forgejo issue by construction | we lead |
| Control plane | `coderd` holds chats as durable rows: `Get chat by ID`, `Interrupt chat`, `Reconcile invalid chat state`, `List chat queued messages` (grepped from `docs/reference/api/chats.md`). Concurrency is capped (5 concurrent agents on Community, queued beyond that) and usage is metered hourly to an internal billing service ("Tallyman") and Metronome on Premium. No workflow engine, no approvals-as-state, no budgets object beyond AI Gateway (Premium only) | `factoryd` with one Temporal workflow per task, Postgres, capability policy as a YAML file in Git, approvals and audit as first-class rows | we lead |
| Worker plane | Coder Agents: the loop runs inside `coderd` itself; a workspace only executes tool calls the agent requests, over the same Tailnet tunnel used for SSH/IDE access, so no new inbound port. Isolation between the agent and the human's own workspace, if wanted, is a documented but opt-in two-pod Kubernetes NetworkPolicy example (`docs/ai-coder/agents/platform-controls/agent-isolation.md`), not a default | One gVisor pod, own namespace and ServiceAccount, default-deny egress, per task, always | we lead |
| Verification | None built in. A human reviews the diff in the chat UI before merging; Coder's own docs say "Developers should still review all agent-produced code before merging." No CI gate, no policy gate, no second-model review is part of the product | Forgejo Actions on untrusted gVisor runners, path-risk policy gates, a reproduction gate, a stronger-model review with a strict verdict | we lead |
| Merge and deploy | Out of scope. The agent pushes to a branch or opens a PR through the git provider using the user's own token; merge and deploy are the customer's ordinary process | Bot merge after a whitelisted approval or an `auto` rule for reproduced, strictly-improving, normal-risk changes; Flux deploy with a staged rollout | we lead |
| Policy outside the model | Boundary's allowlist (`method=`, `domain=`, `path=`) is real code-level policy, but it is Premium-gated as "Agent Firewall" and has to be wired per template; AI Gateway MCP tool allowlisting is also Premium-only | Capability YAML in Git, enforced in gateway code and Cilium network policy, for every task by default | we lead |
| Identity per task | The agent acts as the human who submitted the prompt: same OAuth session, same git token, same permissions, "tied to the user who submitted the prompt" (agent-isolation.md). No task-scoped identity exists | A projected, audience-scoped ServiceAccount token per task, verified against the cluster OIDC issuer, mapped to the task row; no key material in the sandbox | we lead |
| Cost control | AI Gateway (Premium) checks a budget before a request and books the real cost after the response, so a burst of concurrent calls can overshoot; Community has no spend control at all beyond the 5-agent concurrency cap | The gateway prices worst case, clamps output to headroom, takes a hold under a database lock, books the real cost after | we lead |
| Artifacts not chat | The opposite by design: the product is named "Chats," the API is `/api/v2/chats`, and the UI is a conversational thread with a diff sidebar. State is the conversation | `TaskBrief` in, a branch, a PR and a normalised event stream out; the chat transcript is not the interface | not comparable |

## 3. Architecture and stack

`coder/coder` is a single Go monorepo (module `github.com/coder/coder`, 319 MB shallow clone). `coderd/` is the control plane server; `codersdk/` holds the typed API client, including `codersdk/agentfirewall.go` and `codersdk/aibridge.go` for the two Premium features; `coderd/entitlements/entitlements.go` defines the `Set` struct and `New()` constructor that gates features by licence claim. The repository ships two licences: `LICENSE` (AGPL-3.0) for the tree at large, and `LICENSE.enterprise` for the `enterprise/` directory, a proprietary "Enterprise Software" licence whose terms explicitly forbid circumventing the licence-key gate. The gated code is visible in the AGPL clone; it just refuses to run without a Premium licence key checked against `entitlements.Set`.

Workspaces come from ordinary Terraform using the `coder` Terraform provider (`examples/templates/` lists AWS, Azure, GCP, Docker, Kubernetes, Nomad, Incus and DigitalOcean templates side by side). This directly contradicts the "Kubernetes-native" framing in the brief: Kubernetes is one of many supported provisioner targets for a workspace, though the Helm chart (`helm/coder/templates/`) is the primary way to deploy `coderd` itself, and it is the substrate used in Coder's own Kubernetes isolation example.

Agent-to-control-plane traffic reuses Tailnet, the existing Tailscale-based mesh that already carries SSH, VS Code Remote and web terminal connections (`docs/ai-coder/agents/architecture.md`). The workspace always dials out to `coderd`; there is no new inbound port and no separate channel for agent traffic versus a human's terminal session. This is a real piece of engineering reuse and it is why control-plane-hosted agents can talk to a fully egress-isolated workspace: the agent's tool calls travel over a tunnel the workspace already has open, not over a fresh network path.

AgentAPI is a separate Go binary, cloned to market-research-clones/coder-tasks/agentapi, MIT, now archived. Its server subcommand starts the target CLI agent inside a pty, screen-scrapes its terminal output through lib/screentracker and lib/termexec, and exposes four HTTP endpoints on port 3284: /messages, /message, /status, /events. Config flags include allowed-hosts and allowed-origins. This was the mechanism Tasks used to drive a terminal agent headlessly; it is a genuinely different technique from Coder Agents native Go loop, and it is the part of the brief description that is now historical.

Boundary is a standalone process supervisor, cloned to market-research-clones/coder-tasks/boundary, MIT, 952 KB. It launches a target process under two of its own processes, boundary-parent and boundary-child, all non-root. rulesengine/engine.go, read directly for its top 80 lines, implements Engine.Evaluate and matches as a straightforward linear scan over allow rules, ORed together, matching the documented method, domain and path syntax with wildcard segments. Enforcement has two backends. nsjail, the default, uses a network namespace plus an iptables PREROUTING REDIRECT rule to force all traffic through a transparent local proxy, needs CAP_NET_ADMIN, and auto-escalates through sudo or setpriv if not already privileged. landjail uses the Landlock V4 Linux Security Module, kernel 6.7 or newer, to forbid every bind and connect syscall except to the local proxy port, needs no special capability, but only works against processes that respect the HTTP_PROXY and HTTPS_PROXY environment variables, so a statically linked or proxy-ignoring binary can bypass it (docs/ai-coder/agent-firewall/landjail.md). Both backends are Linux only; docs/ai-coder/agent-firewall/index.md lists platform support as Linux only. The standalone boundary binary is free; the Terraform module that wires it into a workspace template, plus streaming its audit log into coderd's own audit trail over a documented Unix socket protocol (agent/boundarylogproxy/codec/codec.go), is the part sold as Agent Firewall under Premium.

AI Gateway, at docs/ai-coder/ai-gateway/, formerly named AI Bridge per rebranding-migration.md, is an LLM proxy that can run inside coderd or standalone. It centralises provider credentials, audits prompts and tool calls, and administers MCP servers. Both AI Gateway and Agent Firewall are sold together as AI Governance, GA since release 2.30 (docs/ai-coder/ai-governance.md), explicitly unavailable to Community deployments.

## 4. UX

Starting a task is short: open the web chat, type a prompt, or send a POST request to the chats API with a JSON body holding one text content block, as shown in docs/ai-coder/agents/getting-started.md. The docs own screenshot, agents-hero-image.png, referenced from docs/ai-coder/index.md, shows a chat pane on the left and a live git diff sidebar on the right, which is a materially better watching experience than a plain terminal transcript.

While an agent works, a user watches the conversation stream and the diff update through a WebSocket connection to the chat stream endpoint, and a separate endpoint watches the chat workspace git state. Intervention is a plain chat message: the API lists an interrupt-chat call, delete and promote calls for queued messages, and a plan-mode toggle that makes the agent propose a plan before it edits. There is no kanban-style board of many tasks in flight in what the docs show; the unit of UX is one chat, one workspace.

Onboarding for one developer pairing with one agent is close to instant: log in, open a chat, type a prompt, watch the diff. This is better than our console, which has no live event stream and no diff view at all, an explicit gap in our own baseline. What Coder's UX does not show, and what the docs do not claim, is a cross-task view: no cost dashboard across tasks in the free tier, Premium only per platform-controls/spend-management.md, no equivalent of an approvals queue, and no multi-agent board comparable to a factory console watching many tasks in different states at once.

## 5. Security, identity, sandbox, policy, cost

Sandbox. A Coder Agents workspace is exactly as isolated as its template makes it. Nothing in the default template restricts egress. docs/ai-coder/agents/platform-controls/agent-isolation.md shows a full two-pod Kubernetes NetworkPolicy example, an agent pod plus an execution pod, one Terraform resource block for the policy, as a pattern to copy into a template, not a default. Boundary adds process-level egress control on top of whatever sandbox exists, but it is a Premium Terraform module, and its landjail backend can be bypassed by any process that ignores the proxy environment variables.

Credentials. The agent uses the submitting user's own Coder session and the user's own git provider token. agent-isolation.md states this plainly: actions are tied to the user who submitted the prompt, with no shared bot identity. This is the clearest philosophical gap from our own design. We hold that identity belongs to the task, not the machine or the human. Coder's default is the opposite: one identity for both the person and everything their agent does on their behalf. There is no task-scoped, short-lived credential anywhere in the docs we read.

Policy. Enforced in code, when purchased: Boundary's allowlist engine, AI Gateway's MCP server and tool allowlist. Enforced by convention otherwise: template authors choose whether to isolate a workspace at all. Nothing in Community stops an agent from reaching the whole internet by default.

Content handling. Not verified. Neither the docs nor the source we read describe a sanitiser for untrusted text reaching the agent, such as comment bodies or issue text, or for agent output before it is posted back to a git provider.

Cost. Community: five concurrent agents deployment-wide, unlimited duration and task count, free, hard concurrency cap only. Premium: usage-based Agent Time, unlimited concurrency by default, usage reported hourly to Coder's own Tallyman service and to Metronome, which bills through Stripe (docs/ai-coder/agents/licensing-usage.md). AI Gateway budgets, Premium only, are checked before a request but the real cost is booked after the response, so concurrent calls can overshoot the cap before it is enforced (platform-controls/spend-management.md). There is no worst-case pre-charge or database-level hold comparable to ours.

## 6. What we should take from it

### Narrow

Agent loop out of the sandbox. Running the model conversation in the control plane rather than inside the disposable worker is the single most portable idea here. Our worker plane calls out to LiteLLM directly from inside the gVisor pod today. If the orchestration loop itself moved into factoryd, or stayed a thin client of it, and only tool execution stayed in the sandbox, a task's sandbox could plausibly go to true default-deny-everything, with model traffic never touching it. This is a bigger change than a narrow item usually allows, but the mechanism, reusing an outbound tunnel the worker already needs, is the transferable part; see the broad item below.

Landlock as a second sandbox-egress backend. Our gVisor pods already get default-deny network policy from Cilium, so a userspace LSM-based firewall is not urgent. But for any future non-Kubernetes worker, a bare VM or a CI build VM, landjail's pattern, forbid bind and connect via Landlock and redirect everything through a local proxy, is a lighter-weight egress control than iptables and needs no elevated capability. Worth a look when the build-VM egress story is revisited.

Small, linear, readable policy engine. rulesengine/engine.go's default-deny, three-key, ORed allowlist is short enough to read end to end. Our capability YAML is more expressive but also more code. Boundary's engine is a useful lower bound for how simple a network policy matcher can be and still be correct.

Cost steering as a warning, not just a cap. The pattern of warning the agent as it nears its budget, mentioned in spend-management.md, is a cheap addition to our own hold-then-book model. A soft warning at eighty percent alongside the hard database-level hold costs little and might reduce wasted retries near the ceiling.

### Broad

Live diff-as-you-go UI. Our own baseline names no real-time streams of the agent's work and no diff view as a known weakness. Coder's chat-plus-diff-sidebar is exactly the shape to copy: stream the event log we already produce into a diff view that updates as the agent commits, rather than only showing a final PR link. We do not need their chat metaphor, since ours is artifacts not chat by design, but a live diff pane keyed to the same event stream is a UX gap they close and we do not.

Plan mode as a checkpoint. A model-authored plan the human can edit before execution starts is a cheap, generally useful gate that fits inside our existing supervisor and gate-supervision machinery: treat plan approval as a workflow step with its own time bound, same as any other gate.

## 7. Where our philosophy differs and what that costs or buys us

Identity per task versus identity per human. Coder's default of running the agent as the submitting human is simpler to build and easier for a developer to reason about, since it can do what I can do. But it means there is no task-scoped audit boundary: a compromised or misdirected agent has exactly the blast radius of its human operator, and Coder's own August 2026 registry compromise, described below, shows why that matters at platform scale, not just per task. Our projected-ServiceAccount-per-task model costs more control-plane machinery, a gateway that verifies and maps tokens, but buys a hard ceiling: no key material in the sandbox at all, regardless of what the human who filed the task could otherwise do.

Policy as a paid add-on versus policy as the default. Boundary and AI Gateway are real, well-built code, but both live behind a Premium licence key, so a Community deployment runs agents with no network policy and no spend cap beyond a concurrency count. This is a direct violation of our own security-without-half-measures constraint if we copied it as is: our default-deny egress and budget holds exist for every task, not as an upsell. The cost to Coder of gating this is that their free tier is meaningfully less safe by default than ours; the benefit to them is a funded enterprise product.

No verification plane at all. Coder ships no CI gate, no policy gate, no automated review step between an agent's diff and a human clicking merge. This is a legitimate scope choice for a developer-pairing tool, but it means developer review is the only gate, which does not transfer to our goal of a largely autonomous factory where a human is the exception, not the default reviewer.

Chat as the interface versus artifacts as the interface. Coder's whole product is a conversation thread; ours is deliberately not. Their model is better for one developer steering one agent interactively. Ours is the right one for a factory running many tasks unattended, where a persistent chat transcript per task does not scale as an operator-facing surface. Neither constraint forces the other to change; they are answers to different questions.

## 8. Red flags and slop assessment

The company and the codebase are real: 16,750 stars, 1,142 open issues, commits daily, a 90 USD million Series C from KKR and QRT in April 2026, both of whom are also named production customers, with KKR reporting over 500 engineers and more than half of commits now flowing through Coder-managed environments, per Coder's own funding announcement. This is not a README with a landing page.

Product churn is the clearest weakness. Tasks, launched in 2025, was deprecated at release 2.34, moved to a support-only track from 2026-06-02, and removed from new releases on 2026-09-01, all inside about a year of its own launch. AgentAPI, the mechanism Tasks depended on, was archived on 2026-09-13. A third architecture, Agent Relay, launched 2026-09-02 and gained a named-vendor integration, Claude Code, two weeks later on 2026-09-15. Three different ways to run an agent, one deprecated, inside a single year, is a lot of API and mental-model churn for anyone who built on the old Chats-under-Tasks or AgentAPI surface. Coder's own migration guide, docs/ai-coder/agents/tasks-to-chats-migration.md, exists because of exactly this.

The most serious incident is a supply-chain compromise, not a product bug. On 2026-08-31 an attacker used a stolen Cloudflare API key to redirect Coder's module registry to attacker-controlled servers, shipping malicious Terraform modules to a subset of self-hosted deployments. Stolen data reportedly included environment variables, CI/CD credentials, OIDC tokens, SSH keys and Coder database passwords. Coder published advisory GHSA-vx42-ghc9-gw65 on 2026-09-01, rated critical severity per the GitHub security advisories API, and stated it could not conclusively determine which deployments were affected because the malicious servers communicated directly with customer infrastructure. This landed in the same week as the Coder Agents GA announcement, and is the single most relevant security data point against a platform whose entire pitch is secure environments for developers and their agents.

Open-core gating is explicit and documented, not hidden. LICENSE.enterprise says so outright, and docs/ai-coder/ai-governance.md states plainly that AI Gateway and Agent Firewall are Premium-only and unavailable to Community. That is honest gating, not vapourware, but it does mean the free tier lacks the two features, network policy and spend caps, most relevant to this comparison.

## 9. Sources

- coder.com/docs/ai-coder (fetched 2026-09-29, via clone docs/ai-coder/index.md)
- coder.com/docs/ai-coder/ai-gateway (fetched 2026-09-29, via clone docs/ai-coder/ai-gateway/index.md)
- coder.com/docs/ai-coder/tasks and coder.com/docs/ai-coder/github-to-tasks (checked 2026-09-29 via curl, both redirect to docs/ai-coder/agents)
- coder.com/tasks (checked 2026-09-29, returns 404)
- coder.com/changelog/coder-2-37, titled Coder Agents Goes GA in 2.37 (search result, not directly fetched)
- coder.com/blog/90m-series-c-led-by-kkr-to-advance-secure-enterprise-ai-development (search result, 2026-04-01)
- globenewswire.com news release on Claude Code plus Agent Relay (2026-09-15)
- infoq.com news on Coder Agents self-hosted beta (2026-05)
- github.com/coder/coder security advisory GHSA-vx42-ghc9-gw65, via gh api repos/coder/coder/security-advisories (published 2026-09-01, fetched 2026-09-29)
- bleepingcomputer.com report on the Coder registry compromise (2026-09-04, search result)
- Cloud Security Alliance research note on the Coder Terraform supply-chain incident (search result, 2026-09)
- gh api repos/coder/coder, repos/coder/agentapi, repos/coder/boundary, and the coder/coder contributors endpoint (2026-09-29)
- Clone at market-research-clones/coder-tasks/coder (last commit 2026-09-29 09:52:18 plus 0100)
- README.md, LICENSE, LICENSE.enterprise
- docs/ai-coder/index.md, agents/index.md, agents/architecture.md, agents/tasks-to-chats-migration.md, agents/getting-started.md, agents/licensing-usage.md, agents/platform-controls/spend-management.md, agents/platform-controls/agent-isolation.md
- docs/ai-coder/ai-gateway/index.md, ai-gateway/rebranding-migration.md
- docs/ai-coder/agent-firewall/index.md, agent-firewall/rules-engine.md, agent-firewall/landjail.md
- docs/ai-coder/ai-governance.md
- docs/reference/api/chats.md, grepped section list, read the Create chat body schema in full
- coderd/entitlements/entitlements.go, codersdk/agentfirewall.go, codersdk/aibridge.go, grepped
- examples/templates/, helm/coder/templates/, directory listings
- Clone at market-research-clones/coder-tasks/agentapi, archived 2026-09-13: README.md
- Clone at market-research-clones/coder-tasks/boundary, last commit 2026-08-12: README.md, rulesengine/engine.go
