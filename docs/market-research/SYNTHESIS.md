# Synthesis: the software factory market in September 2026

Written for Sebastian. Built from the analyst reports in [projects/](projects/), the comparison table in [matrix.md](matrix.md), the one-line findings log in [PROGRESS.md](PROGRESS.md) and the three candidate lists in [scouting/](scouting/). Our own design is summarised in [00-our-vision.md](00-our-vision.md).

## Headline findings

1. **Nobody ships our whole loop.** Of 148 analysed projects, 4 scored 4 out of 5 for similarity and 27 scored 3. The other 117 scored 1 or 2. The closest are Stripe's internal Minions, the AWS autonomous coding agents sample, Cursor's cloud agents and GitLab Duo Agent Platform. Each of them lacks at least two of our planes or principles.
2. **The market converged on the shape we chose.** One disposable sandbox per task, an issue or chat message in, a pull request out, a human review before merge, a gateway in front of models and tools, and credentials injected outside the agent. Hyperscalers (AgentCore Gateway, Vertex Agent Gateway, Foundry Toolbox) now sell the gateway as a named product.
3. **Our strongest differentiators are rare everywhere.** Across the 34 end-to-end orchestrators the mean score is 1.3 out of 5 for per-task identity, 1.3 for hard cost caps and 1.6 for self-hosting and re-seedability. No commercial product lets a customer rebuild the control plane from Git. Devin, Factory, Cursor, Jules, Managed Agents, Ona, Blitzy, Warp and Braintrust all keep the control plane in their own cloud, even on their "VPC" tiers.
4. **We trail on user experience.** The same orchestrators average 3.6 for UX, the multi-agent desktop tools 4.3. Every serious product has a live stream of the agent's work, a diff view with inline comments that go back to the agent, and progress shown where the requester already is (the issue, Slack, a phone). Our console has none of the three.
5. **The market is unstable, which vindicates the escape-hatch constraint.** In the 12 months to September 2026, at least 20 of the analysed projects were shut down, archived, taken private, pivoted or bought: Codegen (ClickUp), Continue (Cursor), Charlie Labs (closes 2026-10-05), Terragon (shut 2026-02), TensorZero (archived 2026-06), Sweep (pivoted), Vibe Kanban (backer closed 2026-04), HumanLayer (abandoned), Crystal (deprecated), Plandex (dormant), Sentry Seer (core repository taken private), Daytona (core development moved private 2026-06), Coder Tasks (removed in v2.37), Helicone (Mintlify), Invariant (Snyk), Langfuse (ClickHouse), Portkey (Palo Alto Networks, stalled since), Arize (Dynatrace), promptfoo and Ona (OpenAI buying both).
6. **Security incidents cluster exactly where our principles forbid shortcuts.** Paperclip (unauthenticated RCE, CVSS 10.0), Gemini CLI (CVSS 10.0 trust-boundary failure), Cline (supply-chain compromise), Composio (credential store breach), Replit (agent deleted a production database), Lovable (two public breaches), Vertex Agent Engine (shared service identity readable from the agent), gh-aw (credential header in an artifact), Antigravity (RCE through its strictest mode), Helicone (cross-tenant key leak). Almost every one is an agent or tool holding a standing credential or trusting in-process policy.
7. **Future AGI is not slop, and it is not a software factory.** It is a real, large LLM evaluation and observability product, adjacent to Langfuse, Phoenix, Braintrust and Helicone, the tools it compares itself with. Its marketing overstates two checkable features (two broken routing strategies and a missing benchmark directory, both reported in open issues). It would sit next to SigNoz, not replace any of our planes. Details in [future-agi](projects/future-agi/report.md).
8. **"Software factory" is a crowded name.** Factory (factory.ai, valued at 5 billion USD in September 2026) owns it commercially. Cole Medin's AI Software Factory (23.6k stars), StrongDM's manifesto, Loki Mode, Machinist, Fusion, FactoryKit, Fabro ("dark software factory") and ESF use it too. The name alone does not position us. The rare combination does: self-hosted and re-seedable, per-task identity, hard spend caps with holds, policy in a gateway, and evidence-ranked gates.

## 1. Coverage and method

- 148 reports, one analyst agent each (two reports cover a pair of related tools). 24 tier-1 and 78 tier-2 projects from the seed list, 46 finds from three scout agents.
- Each analyst cloned the repository where one exists (to `~/repos/market-research-clones/`, not committed), read code and docs, fetched the website, searched for independent views, and wrote a report on [01-report-template.md](01-report-template.md).
- Scores are relative to our design. 3 means roughly what we do, 5 means clearly better, 0 means absent. They are an analyst's judgement, not a measurement.
- Closed products were analysed from their docs, blogs and public SDKs only. Those reports mark inference.
- I read every front matter, every steal and differs list and the findings log, and a sample of full reports. I did not re-verify every claim in every report.

## 2. Market overview

### Segments

Which kinds of product exist, and how close is each segment to our loop? The orchestrators and forge-integrated agents are closest. Everything else covers one plane.

| Segment | Reports | Mean similarity | What they do | Examples |
|---|---|---|---|---|
| Factory orchestrators | 34 | 2.6 | Issue, spec or alert in, agent run in a sandbox, PR out, some with their own task state | Symphony, OpenHands, Devin (as product), Cursor cloud agents, Stripe Minions, Kelos, Optio, ESF, Open-Inspect, Open SWE, Paperclip, Fusion, Blitzy |
| Forge-integrated | 2 | 3.5 | The forge itself assigns an issue to an agent, runs it in CI, and gates the merge | GitHub Agent HQ and Copilot coding agent, GitLab Duo Agent Platform |
| Enterprise agent platforms | 9 | 2.2 | Vendor-hosted control planes: runtime, identity, gateway, memory, policy | AgentCore, Claude Managed Agents, Vertex Agent Engine, Foundry, Factory, Devin, Ona |
| Kubernetes-native agent runtimes | 6 | 2.3 | Operators and CRDs that run agents as pods | Coder, Kelos, Agyn, Centaur, kagent, Dapr Agents |
| Coding harnesses | 10 | 1.9 | The agent that edits code, usable headless | Claude Code, Codex CLI, opencode, Gemini CLI, Goose, Cline, Aider |
| Multi-agent UIs | 11 | 1.5 | Desktop or web apps that run many agents in worktrees and show diffs | Vibe Kanban, Conductor, Claude Squad, Emdash, Orca, Superset, Antigravity |
| Sandbox runtimes | 12 | 1.6 | Isolated execution: microVMs, gVisor, namespaces, egress control | E2B, Daytona, Modal, Docker Sandboxes, CubeSandbox, OpenSandbox, k8s agent-sandbox, Edera, NVIDIA OpenShell, microsandbox |
| Policy and identity | 12 | 1.5 | Credential brokers, egress firewalls, policy engines, MCP gateways | Cedar, ToolHive, iron-proxy, Infisical Agent Vault, OneCLI, Claw Patrol, Keycard, Arcade |
| Model gateways | 7 | 1.7 | Proxies in front of model providers with keys, routing, budgets | LiteLLM, Portkey, Bifrost, TensorZero, agentgateway, Envoy AI Gateway, Weave Router |
| Observability and evals | 11 | 1.2 | Tracing, evaluation, prompt management | Future AGI, Langfuse, Phoenix, Braintrust, Helicone, Opik, LangSmith, Laminar, LangWatch, promptfoo, Harbor |
| Telemetry to fix | 5 | 2.2 | Alert or error in, root cause and PR out | Sentry Seer, Datadog Bits AI, Cleric, Latitude, Temps |
| Spec-driven | 6 | 1.3 | Methods that turn specs into agent work | Kiro, Spec Kit, OpenSpec, BMAD, Tessl, Superpowers |
| Durable execution | 5 | 1.0 | Workflow engines | Temporal, Inngest, Restate, DBOS, Hatchet |
| Agent frameworks | 6 | 1.2 | Libraries to build agents | LangGraph, CrewAI, OpenAI Agents SDK, Google ADK, MetaGPT, ChatDev |
| Code review, CI, app builders, trackers | 12 | 1.2 | One verification or UX piece each | CodeRabbit, Greptile, Qodo, Depot, Namespace, Nx, Dagger, Lovable, Replit, Linear for Agents |

The segment counts come from [matrix.md](matrix.md), which also averages every axis per segment.

### Where each segment is strong

The per-axis averages show a clear division of labour. Nobody is strong on more than three axes.

| Axis | Strongest segment (mean) | Factory orchestrators (mean) |
|---|---|---|
| Signals intake | Telemetry to fix (3.6), forge-integrated (4.0) | 2.5 |
| Control plane | Durable execution (2.8), Kubernetes runtimes (2.5) | 2.1 |
| Sandbox isolation | Sandbox runtimes (4.2) | 1.6 |
| Verification | Spec-driven and code review (2.5) | 2.1 |
| Policy outside the model | Policy and identity (3.7), forge-integrated (3.5) | 1.7 |
| Identity per task | Kubernetes runtimes (2.5), enterprise platforms (2.4) | 1.3 |
| Cost control | Model gateways (3.0) | 1.3 |
| UX | App builders (4.5), multi-agent UIs (4.3) | 3.6 |
| Re-seedable self-hosting | Durable execution (3.2) | 1.6 |

## 3. Approaches: consensus and the distinct schools

### What almost everyone agrees on

- **One disposable workspace per task.** Worktree for local tools, container or microVM for hosted ones. Warm pools and snapshots to hide the cold start (k8s agent-sandbox, Centaur, Ona, Jules, Codegen, Tembo, Kelos, OpenSandbox, E2B, Modal).
- **Issue or chat in, PR out.** Almost every orchestrator uses an issue, a Slack thread or a tracker assignment as the unit of work, and the pull request as the only output that matters.
- **The human reviews at the PR.** Auto-merge is rare. Where it exists it is a narrow rule (Machinist's risk gate, Nx's triple-AND gate) or a known risk (Optio lets an AI review post a binding approval).
- **Credentials injected at egress, not handed to the agent.** Placeholder or sentinel tokens swapped by a proxy outside the sandbox: OpenSandbox Credential Vault, Claude Managed Agents vaults, Claw Patrol, microsandbox, kagent, FactoryKit, Atlassian Rovo Dev's callback bridge, Terragon's model proxy, CubeEgress, iron-proxy, Infisical Agent Vault, OneCLI. This is the pattern our gateway already uses for models and tools, and the market now applies it to every outbound call.
- **LiteLLM is the common model substrate.** SWE-agent, Plandex, Google ADK, GitLab's AI Gateway, Aider's pricing table and several orchestrators use it underneath.
- **AGENTS.md as the rule file.** One committed, directory-scoped instruction file read by every harness (Codex's resolution algorithm, Stripe, Ona, Datadog, Codegen).
- **The Agent Client Protocol (ACP) as the harness wire format.** OpenHands, Agent Orchestrator, Emdash (23 of 37 providers), Goose, Coder and Zed drive agents through it instead of scraping stdout.

### The distinct schools

**Forge-integrated.** GitHub Agent HQ, GitLab Duo and gh-aw make the forge the control plane: assign the issue, run in CI, gate with branch protection. The simplest mental model for a team. It locks the factory to one vendor's forge, and GitHub's per-task identity is weak (long-lived repository secrets as environment variables). GitLab is ahead with composite identity (an agent service account bound to the triggering human, intersecting both permission sets).

**Vendor SaaS control plane.** Devin, Factory, Cursor, Jules, Codex cloud, Managed Agents, AgentCore, Vertex, Foundry. The best UX and the fastest release cadence, and none of them can be rebuilt by the customer. "VPC deployment" in this school moves the sandbox, never the brain.

**Local multi-agent UIs.** Vibe Kanban, Conductor, Claude Squad, Crystal, Emdash, Orca, Superset, Antigravity. They trust the developer's machine completely and lead the market on watching and steering agents. Several already failed on that trust (Orca's open issue shows a remote agent controlling the desktop).

**Tracker-driven daemons.** Symphony, Sortie, Cyrus, Paperclip, Gas Town, Machinist. A process polls a tracker and runs a harness per ticket on a trusted host. The tracker is the UI and often the state machine. Honest code, small blast-radius thinking.

**Kubernetes-native self-hosted orchestrators.** Kelos, Optio, Agyn, Centaur, OpenHands, Coder, kagent, ESF, Open-Inspect. Our own school. Each lacks something we have: Kelos puts raw provider keys in the pod, Optio can auto-merge without a human, Agyn's spend caps are not in the code, Centaur has no spend governance, ESF stops at a local patch file, Open-Inspect needs a paid sandbox vendor.

**Internal enterprise factories.** Stripe Minions (about 1,300 human-reviewed PRs a week), Ramp Inspect (opencode plus Temporal, over half of Ramp's merged PRs), StrongDM (no human writes or reviews code). The strongest evidence that the approach works at scale. Stripe's "blueprint", deterministic nodes for lint, push and CI interleaved with agent nodes for implement and fix, is the same shape as our Temporal workflow of activities and gates.

**Dark factory and spec-driven.** StrongDM's Attractor, Fabro and the spec tools (Kiro, Spec Kit, OpenSpec, BMAD, Tessl). Humans write specs and hold-out scenarios, agents do the rest. The spec tools enforce nothing at runtime: every rule is a prompt convention.

**Telemetry to fix.** Seer, Datadog Bits, Cleric, Latitude, Temps. The most mature signals planes. Seer gates a PR on a fixability score, not on test evidence, the reverse of our reproduction gate.

### One real disagreement: gates in code or objectives for the agent

OpenAI's Symphony post argues that treating agents as rigid state machine nodes "doesn't work well" and moves done-ness, PR handling and merge into the agent's prompt. Stripe, Temporal's own 2026 agent integrations, ESF, Machinist and GitLab go the other way: deterministic steps and gates around bounded agent steps. The evidence from production (Stripe's volume, the incident list above) supports our side.

## 4. Where we stand

Where do we lead, and where do we trail, against the best in each area? We lead on the axes that need an owned control plane. We trail on the axes that need a product team.

| Area | Best in market | Us | Verdict |
|---|---|---|---|
| Per-task identity, no key in the sandbox | GitLab composite identity, AWS sample's per-task IAM role, Keycard | Projected ServiceAccount token per task, gateway-verified, two Forgejo tokens held by the worker only | We lead, with two gaps below |
| Hard spend caps | Weave Router and TensorZero (hold then settle), gh-aw (per-run credit cap, no hold) | Worst-case hold under a lock, clamp to headroom, settle upwards | We lead |
| Re-seedable self-hosting | Nobody among orchestrators, Temporal and Restate among engines | 21-minute rebuild from Git, S3 and a seed bundle | We lead |
| Policy outside the model | AgentCore Policy (Cedar, session-aware), NVIDIA OpenShell, ToolHive | YAML in Git, enforced in gateway Go code and Cilium | Equal on principle, behind on expressiveness |
| Verification | Factory two-pass review, Nx triple-AND, Cleric post-deploy window | CI, path risk classes, reproduction gate, stronger-model review | Equal, several cheap additions available |
| Signals | Seer, Cursor Automations, gh-aw (about 300 scheduled workflows) | Forgejo webhooks, SigNoz alerts | Behind on breadth and schedules |
| Sandbox speed | E2B, Modal, OpenSandbox Kata-Firecracker | gVisor on systrap, build VMs for images | Behind on speed, equal on isolation |
| UX | Cursor, Factory Mission Control, Vibe Kanban, Emdash, Devin | Server-rendered kanban, no live stream, no diff | Clearly behind |
| Evaluation | Harbor, promptfoo, Open SWE's golden reviewer set, Braintrust | None | Behind |
| Memory | DeepWiki, Letta's git-backed memory, Factory's runbook memory | Findings passed within one task | Behind |

## 5. What to take: narrow (mechanisms, libraries, defaults)

Grouped by plane. Each item names the report it comes from. The shortlist in section 8 ranks the strongest.

### Worker plane and sandbox

- **Warm pools through the SIG controller.** kubernetes-sigs/agent-sandbox splits a reviewed SandboxTemplate, a SandboxWarmPool of idle pods and an atomic SandboxClaim. It is maintained, GKE-adopted and RuntimeClass-agnostic. It lacks per-claim ServiceAccounts (planned), which factoryd would keep doing. [k8s-agent-sandbox](projects/k8s-agent-sandbox/report.md), also used by [openhands](projects/openhands/report.md).
- **An admission policy in CEL on every task pod.** The same project ships a seven-rule ValidatingAdmissionPolicy (gVisor runtime class, no host network, no token automount, non-root, capabilities dropped, limits set). We confine factoryd with an admission policy already, this is a ready rule set to diff against.
- **Per-repository setup snapshot.** Run setup once, snapshot, reuse until the base commit or setup file changes (Codegen 24-hour snapshot, Jules "Run and Snapshot", Fabro's hashed snapshot identity, FactoryKit bootstrap hash). For us: a cached image or PVC per project and base commit.
- **A microVM path without bare metal.** OpenSandbox documents Kata-Firecracker at about 125 ms overhead. CubeSandbox's PVM installs a host kernel that gives real `/dev/kvm` on ordinary cloud VMs, but it is an x86 Tencent kernel fork, validated mainly on Tencent's fleet. Edera needs a Xen dom0 boot replacing Talos, and its core is closed. None of these is a drop-in for Hetzner cpx today. [opensandbox](projects/opensandbox/report.md), [cubesandbox](projects/cubesandbox/report.md), [edera](projects/edera/report.md).
- **Resolved-address egress check.** Resolve an allowed hostname once, refuse loopback, link-local, private and metadata addresses, connect to the resolved IP. Claude's sandbox-runtime, Codex's network proxy, Infisical netguard, microsandbox's DNS pin set, Temps and iron-proxy all do it. Our gateway and module-proxy egress rules should, too.
- **An egress probe before the agent starts.** ESF checks a public canary, the metadata endpoint and the UID before every run and marks the run if egress is open. We enforce egress with static policy and never measure it. [esf](projects/esf/report.md).
- **Deny with DNS REFUSED, not a silent drop.** Fly Sprites fails fast so the agent does not burn minutes on timeouts. [fly-sprites](projects/fly-sprites/report.md).

### Credentials and identity

- **Retire the two raw Forgejo tokens in favour of egress injection or an on-demand helper.** Today the worker process holds two real per-session tokens. OpenSandbox's Credential Vault, microsandbox and Claw Patrol inject the real value only at egress when host, SNI and path match. Optio and Open-Inspect use a git credential helper that fetches a short-lived token on demand with a signed request. Kelos refreshes a token through a kubelet-synced Secret file without restarting the pod. Any of these removes the last raw credential from the pod. [optio](projects/optio/report.md), [opensandbox](projects/opensandbox/report.md), [kelos](projects/kelos/report.md).
- **Mint credentials per Temporal activity and keep them out of workflow history.** Keycard's Temporal interceptor does exactly this. Worth checking our gate and session activities against. [keycard](projects/keycard/report.md).
- **Composite attribution.** GitLab stamps every agent action with both the agent's and the triggering human's identity. Centaur unions the requesting human's credential for one turn. We attribute to the task identity only. [gitlab-duo-agent-platform](projects/gitlab-duo-agent-platform/report.md), [centaur](projects/centaur/report.md).

### Policy

- **Cedar through cedar-go when the YAML outgrows plain Go.** AgentCore Policy, ToolHive, the AWS sample and Keycard all use Cedar for tool-call rules. Two ideas are worth taking even without Cedar: a "soft" annotation that turns a deny into a human gate, and an observe-only replay of a new policy version against recent traffic before it goes live. The Go port lacks Cedar's validator and formal semantics, so our reserved OPA upgrade remains a fair alternative. [cedar](projects/cedar/report.md), [aws-bedrock-agentcore](projects/aws-bedrock-agentcore/report.md).
- **Session-aware policy.** AgentCore rules can read a session's history ("approval required before X", "cap a running total"). Our capability checks are stateless per call.
- **Deny hides the tool.** Gemini CLI removes a denied tool from the model's tool list, which saves context and stops probing. We refuse at call time.
- **Headless means ask becomes deny.** Kiro, Continue and Kilo turn every "ask" permission into "deny" when no human is attached, so an unattended run never stalls on a question. Worth checking our opencode permission config against.
- **A stricter-wins ratchet.** Claude Code hardcodes nine settings where the stricter value wins at any scope. microsandbox's `managed.json` and Factory's extension-only merge do the same. If projects get policy overlays, mark cluster-wide caps the same way.
- **Typed side-effect requests.** gh-aw lets the agent request comments, labels and issues as typed, capped outputs that a privileged step applies after the agent is gone. That fits "artifacts, not chat" and shrinks the gateway's live write tools. [gh-aw](projects/gh-aw/report.md).
- **Default protected-files list.** gh-aw: manifests, lockfiles, agent instruction files, CODEOWNERS, `.github/` and every top-level dot directory. Add as a default high-risk class.
- **Sanitise untrusted text on the way in and out.** gh-aw neutralises mentions, closing keywords, tags and off-list URLs. Microsoft's FIDES labels untrusted tool output deterministically. GitLab strips hidden HTML and Markdown comments from tool output. We mark outside text as untrusted but do not neutralise it, and we do not sanitise the agent's PR body. [microsoft-foundry-agents](projects/microsoft-foundry-agents/report.md).
- **Split reader and writer.** GitLab's documented answer to the lethal trifecta: a read-only agent sees untrusted content, a write-only agent never does.
- **Command-level policy beside network policy.** Codex's execpolicy classifies a shell command from argv. Ona's exec-gate identifies binaries by content hash. NVIDIA OpenShell pins binaries on first use. A second layer under Cilium.

### Cost

- **Budget steering.** gh-aw and Coder warn the agent as it nears the cap, so it wraps up instead of being cut off. One line in the gateway.
- **Budget stops as board states.** Codegen shows TIMEOUT, MAX_ITERATIONS_REACHED and OUT_OF_TOKENS next to FAILED.
- **A spend-rail catalogue.** CodeAF documents 14 limits, each with what it blocks, what zero means and the text the user sees. A checklist for our policy defaults and console copy. [swe-af](projects/swe-af/report.md).
- **Quote bound to the input.** Loki Mode binds its cost preview to a digest of the exact input, so a stale quote cannot authorise a different run.
- **Hierarchical budgets.** Bifrost and LangWatch deduct at several levels (organisation, team, project, key). We have task, day and project envelope.
- **Idle time is free.** Vertex and Managed Agents bill only active time, to the second or millisecond. Our resource collector bills started hours, which matches Hetzner, but the model-call ledger could show active time too.

### Control plane and workflow

- **Temporal already ships three things we hand-built.** Worker Versioning (generally available) replaces our `GetVersion` markers. Workflow Streams (public preview) streams live progress to a client, which is our console gap. External Payload Storage to S3 (public preview) could replace part of our history and Postgres split. [temporal](projects/temporal/report.md).
- **Blocker-aware dispatch.** Symphony only starts an issue whose blockers are closed, and lets agents file follow-ups as blocked issues. Forgejo has issue dependencies. [openai-symphony](projects/openai-symphony/report.md).
- **Closing the issue is the stop button.** Symphony reconciles every tick: a terminal state kills the agent and cleans up.
- **Status derived at read time.** Agent Orchestrator keeps a durable fact log and computes board state fresh on every read, which removes drift between stored status and reality.
- **BLOCKED as an agent-written outcome.** ESF lets the agent declare itself blocked in a file, so it has no incentive to probe out of bounds under pressure.
- **Gates passed and change accepted are separate facts.** ESF records a human rejection without overwriting the verification result.
- **Fail-closed pre-flight with typed reasons.** The AWS sample checks forge reachability and repository access before compute is spent (GITHUB_UNREACHABLE, REPO_NOT_FOUND_OR_NO_ACCESS). Sortie and Fabro verify credentials before claiming.

### Verification

- **Two-pass model review.** Factory runs a candidates pass, then a validator pass that discards false positives. Cheap noise reduction without a stronger model. [factory-ai](projects/factory-ai/report.md).
- **A plan critic before execution.** Jules reports 9.5 percent fewer task failures from a cheap model reviewing the plan. [google-jules](projects/google-jules/report.md).
- **Anti-cheat rule for fix loops.** SWE-AF forbids skip, xfail, commented-out tests and loosened assertions in its CI-fix loop. Lift it into our reproduction-gate retry prompt.
- **Calibrate the gates with mutation testing.** Cole Medin's factory seeds known defects and measures what fraction the gate pipeline catches. [coleam00-ai-software-factory](projects/coleam00-ai-software-factory/report.md).
- **Hold-out scenarios.** StrongDM keeps the scenarios a step is graded against out of that step's read access. Worth auditing what our reproduction gate and model review can see.
- **Gate-file integrity.** ESF compares declared gate files against their baseline blob with `git hash-object`, which survives `assume-unchanged` tricks. Directly portable to our workflow-directory refusal.
- **An evidence receipt.** Loki Mode bundles deterministic facts (base and head SHA, diff hash, exit codes, gate verdicts) apart from labelled AI assessments into one re-verifiable file. A portfolio-grade artifact for every merged task. [loki-mode](projects/loki-mode/report.md).
- **Post-deploy verification keyed to intent.** Cleric watches the metrics a PR claims to affect for up to 14 days. Cursor Rollouts posts a monitoring plan and a per-environment verdict. Our 15-minute staging soak is the start of this.
- **Runtime and browser evidence.** FactoryKit and Antigravity attach a recorded browser session to the PR. We have no UI evidence step.
- **CI fix limits as data.** Factory's CI Steward reads config from the default branch only, withholds edit tools outside `fix.scope`, reverts protected paths and keeps three budgets. Open SWE classifies a failure as deterministic, flaky or ambiguous and caps reruns at three per head SHA.

### Signals

- **Declarative webhook-to-task mapping.** OpenHands (JMESPath) and Kelos (JSONPath plus a prompt template) decouple "which events matter" from parsing code. The cheapest route to a second intake source.
- **Standing, scheduled tasks.** GitHub runs about 300 agentic workflows on the gh-aw repository itself: CI coach, docs upkeep, dead-code hunts. Charlie Labs' "Daemons" are the same idea as Markdown role files. Our factory only reacts.
- **A fixability ladder.** Seer caps how far an automatic run goes (root cause, plan, code, PR) by a score and the owner's preference. Latitude promotes a signal to work only after it recurs 2 to 15 times in 30 days. Useful to stop noisy alerts from spending budget.

### Model gateway

- **Keep LiteLLM, and keep it thin.** None of the six alternatives replaces factory-gateway's task identity and holds. Portkey's open budget enforcement is an empty stub, and development stalled after its acquisition. Bifrost keeps governance in memory per node, with high availability only in Enterprise. TensorZero is archived. Envoy AI Gateway needs Envoy Gateway's extension hook, which clashes with Cilium's own Envoy. agentgateway (Linux Foundation) is the one credible open alternative: a data plane with one CEL language for authorisation, rate-limit keys and routing. [litellm](projects/litellm/report.md), [agentgateway](projects/agentgateway/report.md), [envoy-ai-gateway](projects/envoy-ai-gateway/report.md).
- **Use more of LiteLLM than we do.** Its free OpenTelemetry callback can push per-call traces into SigNoz. `custom_pricing` turns our refusal of unpriced models into a price. `/health` pings every provider credential, so a rotated key raises an alert before a task fails. LiteLLM's 2026 run of CVEs is the reason to keep its large feature surface unreachable from sandboxes, which our gateway already does.
- **Budget counters in memory, flushed to Postgres.** agentgateway holds counters in memory and upserts them every 5 seconds with restart reconciliation. Bifrost deducts at several budget levels at once. Both are references if the gateway's per-call database lock ever becomes a bottleneck.
- **Sign and verify our own images.** LiteLLM ships cosign-signed images verified against a pinned key. We do not sign the factoryd, factory-gateway or agent-worker images yet.

### Harness and event stream

- **Codex CLI is adoptable through LiteLLM.** Codex now speaks only the Responses wire API, and LiteLLM serves `/v1/responses`. The remaining work is the adapter and version pinning, since Codex releases several times a day. [openai-codex](projects/openai-codex/report.md).
- **opencode already offers more than we use.** `opencode serve` plus `run --format json --attach` gives a warm server and a documented event stream. Plugin hooks (`tool.execute.before/after`) are a place for audit. It ships no sandbox and is allow-by-default, so our gVisor and gateway stay essential. [opencode](projects/opencode/report.md).
- **A normalised event vocabulary exists.** Vibe Kanban's NormalizedEntry, Linear's AgentActivity (thought, action, elicitation, response, error, with an ephemeral flag), Codex's `exec --json` and Gemini CLI's JSONL are close enough to adopt one shape for our `Event` type.
- **A conformance suite for harness adapters.** OneCLI makes every adapter declare capabilities and pass a shared test suite, including a fake adapter.

### Evaluation

- **Harbor for a per-project regression suite.** Task directories with instruction, environment and verifier, run against any harness, with a CI job that commits pass rate against a baseline. Our closed issues can become tasks. [harbor](projects/harbor/report.md).
- **promptfoo on prompt changes.** A PR comment with a before-and-after pass-rate table whenever the harness, supervisor or review prompt changes. `indirectInjectionVar` generates injection payloads against a named untrusted variable, which is our issue-body trust boundary. Its red-team generation defaults to their cloud, so run it from CI only. [promptfoo](projects/promptfoo/report.md).
- **Intervention rate.** Continue tracks the share of agent output a human had to edit before merge. A one-column metric for our audit trail.

### Memory

- **AGENTS.md resolution.** Codex walks from the repository root to the working directory, prefers an override file per directory and caps the total at 32 KiB.
- **Agent-maintained runbooks as Git artifacts.** Factory's agent updates a runbook per alert class after each root-cause analysis. Letta keeps memory as a git repository with hooks that protect read-only fields. Both fit re-seedability, provided untrusted input cannot write to them.

## 6. What to take: broad (product shape, priorities, UX)

### UX patterns the market agrees on

- **A live task page.** Stream the agent's events, show the diff, show CI checks, in one view (Vibe Kanban, Emdash, OpenHands, Kelos, Coder, Factory Mission Control). Vibe Kanban pushes logs and diffs over WebSocket. htmx's SSE extension carries the same stream with little client code, so this fits our server-rendered console.
- **Inline diff comments that go back to the agent.** Cline, Orca, Vibe Kanban and Plannotator batch line comments into one follow-up message.
- **Progress where the requester already is.** Symphony's single "workpad" comment edited in place, Cyrus's activity stream in the issue, Sweep's live checklist comment, Linear's agent session panel. With this, a requester never needs the console. Forgejo comments can carry it today.
- **Approval on the phone.** Happy (end-to-end encrypted push approvals), Optio (native apps), Agent Orchestrator (tunnel-based approval view). Self-hosted, this is a push channel (ntfy or Forgejo notifications) plus a small approval page.
- **Approval scopes.** Once, this session, always (Atlassian Rovo Dev, Goose, Continue). The AWS sample lets an operator approve a class of future gates (`tool_type:Bash`, `write_path:tests/**`).
- **Plan approval before code, for larger tasks.** Kiro, Jules, Augment Intent (three checkpoints: spec, task breakdown, diffs), Blitzy, Lovable, HumanLayer. This is our approval-as-state principle applied earlier in the workflow.
- **Onboarding in minutes.** gh-aw's wizard reaches a first result in about 10 minutes. Paperclip's `test-drive` starts a disposable instance with one command. Factory scores a repository's agent readiness and refuses long runs below a threshold.
- **Cost visible per message and per task.** Lovable shows live credit cost inline. Weave exposes cost per session and a routing dry run.
- **A coverage view for the enterprise story.** Factory's Software Factory dashboard shows one row per lifecycle stage and project. It sells "enterprise-grade" better than a kanban board.

### Product shape

- **A spec phase.** Kiro's EARS requirements, OpenSpec's added, modified and removed delta specs with Given/When/Then scenarios, and Superpowers' approval gate show three workable formats. All of them enforce nothing at runtime. For us, a spec becomes one more workflow state before the coding session, with the acceptance criteria feeding the reproduction gate.
- **Standing tasks.** A schedule plus a spec that produces issues or PRs, defined as a file in the project repository and capped by central policy.
- **Wider intake.** Slack or Matrix mentions that file a Forgejo issue, and generic webhooks with a templated prompt and hard caps (Kilo: 256 KB payload, 20 in flight).
- **An authorable workflow graph.** Stripe's blueprints and Fabro's DOT graphs let new capability classes compose deterministic and agent steps. Our Temporal workflow is the same thing, hard-coded. It matters once analyzer, tester and release classes arrive.
- **Evidence as the product.** The receipt, the gate timeline and the audit rows are what an enterprise buyer wants to see. Almost no competitor can show them, because their gates live in prompts.

## 7. Where our philosophy differs, and what it costs or buys

| Our choice | Market default | What it buys | What it costs |
|---|---|---|---|
| Control plane we host and rebuild from Git | Vendor cloud | Survives vendor shutdowns and acquisitions (20 in a year), portfolio proof | We build the UX a product team would build |
| Identity per task, no key in the sandbox | Host credentials or an org-wide app token | Blast radius of one task, survives prompt injection | Every tool needs a gateway path, onboarding is slower |
| Hard caps with holds | Billing caps or none | Real spend limit on cheap hardware | Gateway complexity, occasional refused calls |
| Policy in gateway and network | Policy in the agent process or the prompt | A prompt cannot grant a capability | Less expressive rules than Cedar or session-aware policy, today |
| Gates in code, evidence-ranked | Done-ness in the prompt (Symphony) or a confidence score (Seer) | Merge on evidence, auto-merge possible | Less agent flexibility on the last mile |
| gVisor on cloud servers | microVMs on bare metal, or worktrees | Strong isolation on cheap hardware | Slow builds, cold starts, build VMs as a workaround |
| One forge, self-hosted | GitHub | No vendor lock, portfolio story | No ecosystem of apps, integrations built by hand |
| Model independence behind LiteLLM | One vendor's models (Managed Agents, Codex cloud, Frontier) | Cheap open-weight tiers | We carry harness compatibility |

Two points where the market pushes back on us:

- **The last mile.** Symphony's `land` skill and Open SWE's `/baby-sit` let an agent shepherd an approved PR through rebase, conflicts and flaky checks. We have no agent for "approved but not mergeable". A `lander` capability class that may push to the task branch, while `factory-merge` still merges, closes this without giving up gates.
- **Persistent sandboxes.** Factory and Devin keep machines alive between sessions, so long investigations keep their tools and logins. Our disposable sandboxes pay a setup cost each session. Setup snapshots and warm pools recover most of that without giving up disposability.

## 8. Shortlist for narrowing

These are the items with the best ratio of value to effort, based on how many independent projects converge on them and how directly they close a weakness we already listed. Effort is a rough guess.

| Item | Weakness it closes | Sources | Effort |
|---|---|---|---|
| Live task page: event stream over SSE, diff, checks, inline comments back to the agent | UX, no real-time view | Vibe Kanban, Emdash, OpenHands, Kelos, Temporal Workflow Streams | Medium |
| Progress comment on the Forgejo issue, edited in place | Requesters must open the console | Symphony, Cyrus, Sweep, Linear | Small |
| Normalised `Event` type from one existing vocabulary | Harness breadth, trace UI | Vibe Kanban, Linear, Codex, Gemini CLI | Small |
| Resolved-address egress check and pre-run egress probe | DNS rebinding and metadata gaps | sandbox-runtime, Codex, Infisical, microsandbox, ESF | Small |
| Remove the two raw Forgejo tokens from the pod (credential helper or egress injection) | Last credential in the sandbox | Optio, Open-Inspect, OpenSandbox, microsandbox | Medium |
| Warm pools and setup snapshots via kubernetes-sigs/agent-sandbox | Cold start | k8s agent-sandbox, OpenHands, Centaur, Jules | Medium |
| Harness and prompt regression suite (Harbor tasks from closed issues, promptfoo on prompt changes) | No evaluation | Harbor, promptfoo, Open SWE, Braintrust | Medium |
| Budget steering message, budget stops as board states, spend-rail catalogue | Cost UX | gh-aw, Coder, Codegen, CodeAF | Small |
| Two-pass model review, plan critic, anti-cheat fix rule | Review noise, wasted sessions | Factory, Jules, SWE-AF | Small |
| Sanitiser on untrusted input and on agent output, default protected-files class | Prompt injection, workflow tampering | gh-aw, FIDES, GitLab | Small |
| Temporal Worker Versioning in place of `GetVersion` markers | Workflow change safety | Temporal | Small |
| Evidence receipt per merged task | Portfolio proof, audit | Loki Mode, ESF | Small |
| Plan approval state for large tasks, spec phase with acceptance criteria | No spec-driven intake | Kiro, Augment Intent, OpenSpec, Jules | Large |
| Standing scheduled tasks as files in project repositories | Factory only reacts | gh-aw, Charlie Labs, Emdash | Medium |
| Mobile approval through a push channel | No mobile view | Happy, Optio, Agent Orchestrator | Medium |
| Codex CLI adapter through LiteLLM `/v1/responses` | Single harness | Codex, Terragon, Optio | Medium |

## 9. Caveats

- The reports come from analyst agents on two model tiers. Tier-1 reports go deeper. I spot-checked several but did not re-verify every claim.
- Scores are judgements relative to our design, not measurements. Treat a difference of one point as noise.
- Facts are dated 2026-09-29. This market changes monthly: several products were renamed or retired during the research itself.
- Closed products were analysed from documentation only. Security claims in their docs are unverified.
- About 60 further candidates from the scouting lists were not analysed. They are listed in [scouting/](scouting/) with a relevance guess each.
