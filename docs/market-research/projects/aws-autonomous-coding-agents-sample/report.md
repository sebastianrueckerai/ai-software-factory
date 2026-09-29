---
name: ABCA (Autonomous Background Coding Agents on AWS)
slug: aws-autonomous-coding-agents-sample
url: https://aws-samples.github.io/sample-autonomous-cloud-coding-agents/
repo: https://github.com/aws-samples/sample-autonomous-cloud-coding-agents
category: factory-orchestrator
license: MIT-0
open_source: yes
self_hostable: yes
hosting_model: self-hosted, but only onto your own AWS account (CDK deploy); not portable to another cloud or bare metal
company: AWS sample under the aws-samples org, not a product, no company financials apply
maturity: 153 stars, 48 forks, 22 contributors, 326 open issues, created 2026-03-31, last push 2026-09-29 (today), PR #915 merged a week ago, README declares "maintenance mode" pending a V2 rewrite
similarity: 4
axes:
  signals_intake: 3
  control_plane: 4
  sandbox_isolation: 4
  verification: 2
  policy_outside_model: 4
  identity_per_task: 4
  cost_control: 3
  ux: 3
  reseedable_selfhost: 1
steal:
  - Cedar policy engine for tool calls, with a plain @tier("soft") annotation that turns a hard-deny rule into a human-in-the-loop gate, files at agent/policies/hard_deny.cedar and agent/policies/soft_deny.cedar.
  - Golden-fixture parity testing between the two Cedar language bindings (cedarpy in the Python agent, @cedar-policy/cedar-wasm in the TypeScript CDK Lambdas) in contracts/cedar-parity, so the same policy cannot silently diverge across runtimes.
  - Per-task IAM SessionRole via sts:AssumeRole tagged with user_id, repo and task_id, paired with dynamodb:LeadingKeys conditions on the state tables, so both compute credentials and data access are scoped to one task.
  - CLI approval scoping: bgagent approve --scope tool_type:Bash | write_path:tests/** | rule:<id> | all_session, so an operator can clear a class of future gates instead of clicking through each one.
  - bgagent nudge, a mid-run steering message the agent acknowledges (nudge_acknowledged) between tool calls, without cancelling the task.
  - Fail-closed pre-flight checks (GitHub reachability, repo access) before compute is spent, with typed reasons like GITHUB_UNREACHABLE and REPO_NOT_FOUND_OR_NO_ACCESS.
  - ADR-002's versioned least-privilege CDK bootstrap policy with a computeBootstrapHash() check, giving an auditable trail for the deployer's own IAM footprint.
differs:
  - The whole design is AWS-native on purpose (AgentCore Runtime, Bedrock, Lambda Durable Functions, Cognito, DynamoDB, WAF). "Self-hosted" means your own AWS account, not commodity hardware. Copying this wholesale breaks our no-vendor-lock-in and cheap-hardware constraints outright, it is not a variant of our design, it is the opposite bet.
  - There is no web console. Every human surface is a CLI (bgagent) plus chat and ticket integrations (Slack, Linear, Jira); the one dashboard construct in the code is a CloudWatch operator view, not an end-user UI.
  - The GitHub credential the agent pushes and opens PRs with is one long-lived PAT per onboarded repository, stored in Secrets Manager and shared by every task on that repo, not a token scoped to the single task, this is the one place their "identity per task" story does not hold.
ux_verdict: CLI-first, with real watch, nudge and scoped-approval primitives that are ahead of a typical chatbot loop, but nothing for a human who does not want a terminal.
slop_verdict: Real and actively engineered (22 contributors, roughly 900 merged PRs in six months, design docs that name the exact files they describe), but read the phasing tables before quoting the architecture diagram, much of the governance story (tiered PR-risk validation, team budgets, DNS-firewall enforcement, AgentCore Identity token vault) is marked Next, Later or Future, not shipped.
---

# ABCA (Autonomous Background Coding Agents on AWS)

## 1. What it is

ABCA is an AWS-authored open-source sample (`aws-samples/sample-autonomous-cloud-coding-agents`) that shows what a self-hosted background coding-agent platform looks like when built entirely on AWS managed services. A user submits a task (a repo plus a description or issue reference) through the CLI, a webhook, or a Slack, Linear or Jira integration. An agent runs unattended in an isolated per-task environment, clones the repo, edits code, runs lint and tests, and opens a pull request. There is no live back-and-forth during the run.

The README and docs site both frame this in the same vocabulary we use ourselves: a "software dark factory" as the long-term goal, "lights-sparse" as the honest description of where the industry (and this sample) actually is today, human PR review as the current only governance gate, and a published gap list against a fuller governance checklist tracked as GitHub issues. The maintainers are explicit that this is a demonstration, not a product: the README calls it "experimental and educational" and says it is "not intended for direct use in production environments," and a maintenance-mode notice (added 2026-09-22, PR #915) says a V2 rewrite is coming.

What the docs claim and what the code shows mostly agree, with one exception worth flagging up front: several governance features described at length in the design docs (tiered PR-risk scoring, team-wide budgets, an AgentCore Identity credential vault, DNS-firewall enforcement) are documented as intent, not shipped behaviour. This report marks each such case as "documented, not implemented" where it applies.

## 2. Mapping to our five planes

| Plane / principle | What ABCA does | What we do | Verdict |
|---|---|---|---|
| Signals | Task creation from CLI, REST API, HMAC-signed webhooks, Slack mention, a Linear label (`bgagent`), or a Jira label via a Forge app. All channels funnel through one Input Gateway concept that normalises to a single internal message schema (see `docs/design/INPUT_GATEWAY.md`). No telemetry or alert-sourced intake, no auto-triage of production incidents. | Issues, telemetry and alerts feed a durable control plane. | Not comparable: they have more chat-tool breadth, we (aim to) have telemetry breadth. Neither does both well today. |
| Control plane | DynamoDB task state (`Tasks`, `TaskEvents`, `UserConcurrency`, an approvals table), an orchestrator built on Lambda Durable Functions for checkpoint/replay, and standing reconciler Lambdas (`stranded-task-reconciler.ts`, `stranded-orchestration-reconciler.ts`, `concurrency-reconciler.ts`) that repair state after partial failures. | Durable per-task state, scheduling, approvals and audit, Temporal-based. | They lead: the reconciler set for stranded state is more explicit than anything we have documented, though their own docs mark "orchestration replay" only "Partial." |
| Worker plane | Firecracker microVM isolation behind three swappable `ComputeStrategy` backends: AgentCore Runtime (default), ECS Fargate, or the newer Lambda MicroVMs. VPC private subnets, a DNS Firewall for egress control that is currently in observation mode (logging, not blocking). | gVisor sandboxes on Hetzner nodes, constrained network, temporary credentials. | They lead on isolation technology (Firecracker over gVisor) but their own egress control is not turned on, so on enforced egress we are roughly equal. |
| Verification | Agent-run lint and tests inside the sandbox, a CI pipeline, and human PR review as the only shipped pre-merge gate. EVALUATION.md describes a Tier 1/2/3 PR-risk pipeline (tool validation, code quality, blast-radius analysis feeding a risk label) but its own phasing table marks most of it "Next" or "Later." | Tests, security scanning, stronger-model review and policy evaluation before merge. | We lead: an automated stronger-model review step before merge is part of our design and is absent (not just partial) in ABCA today. |
| Merge and deploy | PR is opened, human reviews and merges through normal GitHub flow. No agent-driven deploy step. | PR opened, verification gates, then merge and deploy through our own pipeline. | Not comparable in depth; ABCA stops at the PR. |
| Policy outside the model | Cedar policy files (`agent/policies/hard_deny.cedar`, `soft_deny.cedar`) evaluated in `agent/src/policy.py` against every tool call, independent of the LLM, with a three-outcome result (allow, deny, require-approval) layered on Cedar's native binary allow/deny. | Policy enforced in code and network config, not prompts. | They lead: this is a genuinely shipped, tested (parity-fixture tested across two language bindings) mechanism, more concrete than most of what we have written down. |
| Identity per task | Per-task IAM `SessionRole` via `sts:AssumeRole`, tagged `user_id`/`repo`/`task_id`, with `dynamodb:LeadingKeys` conditions scoping DynamoDB access to the task's own rows. GitHub push access, however, is one shared PAT per repo, not per task. | Short-lived, task-scoped credentials, no standing keys in the agent's reach. | Equal on the AWS side, we lead on the one credential that actually reaches an external system (source control). |
| Artifacts not chat | The task's contract is the Blueprint (compute strategy, model, turn limits, Cedar policies) resolved once at admission; the agent produces a PR, not a chat transcript, though Slack/Linear/Jira integrations do post conversational progress updates back into those tools. | Agents exchange artifacts; chat only where a human needs updates. | Roughly equal. |

## 3. Architecture and stack

Three workspaces under Yarn/mise: `cdk/` (TypeScript, AWS CDK, the deployment and API layer), `cli/` (TypeScript, the `bgagent` CLI), and `agent/` (Python 3.13, the runtime that actually executes inside the sandbox). `agent/pyproject.toml` pins `claude-agent-sdk==0.2.110` as the coding harness, so the agent loop is literally the Claude Agent SDK, not a homegrown loop. It also pins `bedrock-agentcore==1.18.1`, `fastapi`/`uvicorn` for the in-sandbox control server (`agent/src/server.py`), `mcp==1.28.1` for tool federation, and `cedarpy` for the Python side of the Cedar policy engine.

CDK is the only deployment mechanism, there is no Terraform path. Key constructs read directly: `cdk/src/constructs/blueprint.ts` (the per-repo configuration unit), `task-orchestrator.ts`, `task-table.ts` / `task-events-table.ts` / `task-approvals-table.ts` / `user-concurrency-table.ts` (DynamoDB), `agent-session-role.ts` (the per-task IAM role), `dns-firewall.ts`, `lambda-microvm-compute.ts`, `ecs-agent-cluster.ts`, `tool-gateway.ts`, `budget-table.ts` / `budget-alerts.ts`, and per-integration constructs for Slack, Linear and Jira (`slack-integration.ts`, `linear-integration.ts`, `jira-integration.ts`, plus their own mapping tables). Task state is DynamoDB throughout, no separate message queue product is named beyond SQS-shaped constructs implied by `admission-queue-pickup.ts` and `fanout-consumer.ts`.

Design intent is documented in unusual depth under `docs/design/` (`ARCHITECTURE.md`, `ORCHESTRATOR.md`, `SECURITY.md`, `IDENTITY_AND_AUTH.md`, `COMPUTE.md`, `COST_MODEL.md`, `CEDAR_HITL_GATES.md`, `INPUT_GATEWAY.md`, `REGISTRY.md`, `EVALUATION.md`, `MEMORY.md`) and 22 numbered ADRs under `docs/decisions/`. This is markedly more design documentation than code in some areas, several of the richest docs (EVALUATION.md's PR-risk tiers, REGISTRY.md's versioned asset catalog) describe systems whose CDK constructs do not yet exist in the tree, each with a tracking issue number quoted in the doc itself, which is honest but means the doc is ahead of the repo.

Models are invoked through Amazon Bedrock (`bedrock-models.ts`), selected per Blueprint, there is no separate model gateway product, Bedrock itself is the gateway. Observability runs through OpenTelemetry (`aws-opentelemetry-distro` pinned in `pyproject.toml`) into CloudWatch, with `cdk/src/constructs/task-dashboard.ts` building a CloudWatch dashboard from Logs Insights queries over structured log lines (`METRICS_REPORT`, `TRAJECTORY_TURN`, `TRAJECTORY_RESULT`) emitted by the agent.

## 4. UX

There is no web UI. Every human-facing surface is either the `bgagent` CLI, the REST API it wraps, or a chat/ticket integration (Slack mention, Linear label, Jira label). The `task-dashboard.ts` construct is a CloudWatch dashboard for operators, not a task browser for end users.

Onboarding, per `docs/guides/QUICK_START.mdx`, is "zero to your first PR in about 30 minutes" across six steps: (1) clone and `mise run build` the monorepo, (2) fork a sample repo (`awslabs/agent-plugins`) and note its `owner/repo` slug, (3) `cdk deploy` the stack (requires Bedrock model access already granted in the account, Docker plus QEMU/binfmt if building the arm64 image on an x86 host), (4) register the fork as a Blueprint, (5) store a GitHub PAT in Secrets Manager, (6) `bgagent submit --repo <fork> --issue <n>`. This is a competent infrastructure engineer's 30 minutes, not a signup form's, the prerequisites list includes AWS credentials, a Bedrock Marketplace subscription flow, Node 20+, and mise.

Once a task is running, `bgagent watch <task_id>` streams turns, tool calls, tool results and cost updates and exits automatically on a terminal state, `bgagent status` shows a heartbeat age rather than a timestamp so staleness is visible at a glance, and `bgagent nudge <task_id> "<message>"` lets a human redirect the agent mid-run without cancelling it, delivered between tool calls and acknowledged with a `nudge_acknowledged` milestone. Approval is a first-class CLI object: `bgagent pending` lists every gate awaiting a decision with the matched rule, severity, a command preview and a ready-to-paste approve/deny line, and `bgagent approve <task> <request> --scope <this_call|tool_type:Bash|write_path:tests/**|rule:<id>|all_session>` lets an operator clear either one call or a whole class of future calls. Denials can carry a `--reason` that is injected back into the agent's context so it can adapt instead of blind-retrying. In Slack and Linear, the same lifecycle shows up as threaded progress comments and reaction-based status rather than CLI text.

Screenshots in `docs/imgs/` are all setup screenshots (Slack event-subscription toggles, a "find credentials" walkthrough), not product screenshots of a running task, there is no dashboard mock or demo GIF of an agent working. The `docs/abca-plugin/` Claude Code plugin (skills for setup, deploy, onboard-repo, submit-task, troubleshoot, status) is itself a UX choice worth noting: the maintainers point new users at an AI coding assistant to be walked through the CLI, rather than building a wizard.

## 5. Security, identity, sandbox, policy, cost

**Sandbox.** Firecracker microVMs, chosen behind a swappable `ComputeStrategy` interface with three implementations: AgentCore Runtime (the default, fully managed), ECS Fargate, or a newer Lambda MicroVMs backend (ADR-021). All run inside a VPC with private subnets. Network egress is meant to be constrained by a Route 53 Resolver DNS Firewall, but `docs/design/SECURITY.md` states this is currently in observation mode, it logs disallowed domains, it does not yet block them. That is a real, admitted gap between the security design and what is enforced.

**Identity.** Compute credentials are a per-task IAM `SessionRole` obtained via `sts:AssumeRole`, tagged with `user_id`, `repo` and `task_id`, and DynamoDB access is scoped further with `dynamodb:LeadingKeys` conditions so one task cannot read another task's rows even under the same role family. This is a real, working "identity belongs to the task" mechanism. It does not extend to the GitHub credential: `agent/src/config.py:resolve_github_token()` resolves one long-lived PAT per onboarded repository from Secrets Manager, shared by every task against that repo. A more ambitious AgentCore Identity Token Vault design (workload access tokens, USER_FEDERATION/M2M/ON_BEHALF_OF_TOKEN_EXCHANGE flows) exists in the docs and in a vestigial Python dependency, but a code comment in `agent/pyproject.toml` calls it "parked" pending an open AgentCore service-side bug, so treat it as dormant, not shipped.

**Policy.** Cedar (AWS's open-source policy language) evaluates every tool call (Bash, Write, Edit, WebFetch) against blueprint-level policy files, in `agent/src/policy.py`, independent of the model. Most calls resolve to a plain Cedar allow/deny. Rules annotated with a soft tier instead pause the agent and create an AWAITING_APPROVAL state (the Cedar HITL mechanism), rather than denying outright. Hard-deny rules cannot be bypassed even by a pre-approval flag at submit time. The engine exists in two language bindings, cedarpy in the Python agent and the cedar-wasm package in the TypeScript CDK Lambdas, kept in sync by golden-fixture parity tests in `contracts/cedar-parity/`, a genuinely careful piece of engineering for a sample project. Prompt-injection screening runs through Amazon Bedrock Guardrails (a PROMPT_ATTACK filter, MEDIUM strength) at task submission and again at context-hydration time, fail-closed.

**Cost.** `docs/design/COST_MODEL.md` estimates 2 to 15 US dollars per task, dominated by Bedrock token spend, against an infrastructure floor of roughly 140 to 150 US dollars a month for the always-on stack. Per-task budgets are real and enforced client-side (a max-budget flag on submit, validated to a 0.01 to 100 dollar range before the request is even sent) and turn caps exist per blueprint. Team or monthly budgets and cost-aware model routing are documented as planned, not shipped, matching the docs site's own scorecard, which marks cost metering "Partial."

## 6. What we should take from it

**Narrow, copyable this month.** The Cedar three-outcome tool-call gate (a soft-tier annotation flipping hard-deny into human-in-the-loop) is a clean, small pattern for anywhere we enforce capability policy today with an all-or-nothing gate. The CLI approval-scoping vocabulary (this call only, this tool type for the session, a write-path glob, a specific rule, or the whole session) is a directly reusable taxonomy for our own approval UX, it solves the real problem of not making a human click approve fifty times for the same class of action, without giving up per-call control by default. The nudge mechanism, a mid-run steering message acknowledged between tool calls, is a cheap addition if we ever want a human to redirect a running agent without cancelling it. The fail-closed pre-flight check pattern, verifying GitHub reachability and repo permissions before spending compute, with typed failure reasons, is worth copying wherever we start a task against an external system we do not control.

**Broad, product-shape.** Their willingness to publish an honest phasing table (Now, Next, Later, Future) against their own governance checklist, right there in the design doc, is a communication pattern worth imitating, it lets a reader trust the parts marked Now more, not less. Treating the GitHub PAT as the shared secret bottleneck it is, and saying so in the docs rather than glossing over it, is the kind of scepticism we should apply to our own weakest credential boundary. Their multi-channel intake, CLI, webhook, Slack, Linear, Jira, all normalised through one Input Gateway schema before touching task state, is a pattern for the day we want more than one way into our own system, add a channel, not a new task-creation code path.

## 7. Where our philosophy differs and what that costs or buys us

Their whole design is a bet that a hyperscaler-native stack is the right one: AgentCore, Bedrock, Lambda Durable Functions, Cognito, DynamoDB, WAF, and CDK as the only deployment mechanism. Self-hosted in their vocabulary means deployed into your own AWS account, not deployed onto commodity hardware you own. Adopting any of this wholesale would break our cheap commodity hardware, no vendor-specific services constraint outright, not bend it, it is the opposite starting assumption to ours. Where their approach is genuinely better, Firecracker microVMs over gVisor, a maintained managed durable-execution primitive over a self-run one, the price of matching it would be giving up the constraint that lets us run on three Hetzner boxes for roughly 210 EUR a month. We keep our constraint and accept slower, heavier isolation as the cost.

Their lack of a web console is not a philosophy difference so much as an admitted gap, their own docs site scorecard calls the orchestration replay and evaluation stories Partial. We should not read the absence of a UI as validation that a console is unnecessary, read it as a project that chose to spend its documentation effort on the control and policy planes first and has not yet reached the UI.

Their per-repo shared GitHub PAT, next to a genuinely careful per-task AWS IAM story, shows how easily identity per task degrades at the one boundary that touches an external system outside your own cloud account. It is a useful warning for us: our own weakest credential is probably wherever we touch something we do not control, a forge token, a registry credential, and it deserves the same scrutiny we give our internal ones.

## 8. Red flags and slop assessment

Real engineering effort: 22 contributors, roughly 900 merged pull requests in six months, issue and PR numbering already past 915 by 2026-09-29 against a 2026-03-31 creation date, a last push today, and design docs that quote actual file paths and function names rather than only diagrams. This is not a README-and-landing-page project.

Two things temper that. First, the README's own maintenance notice, added 2026-09-22, says the current version is in maintenance mode while AWS builds the next version, ABCA V2, with no migration required at this time but no committed timeline either, worth checking again before relying on this repo's current shape for anything long-lived. Second, several of the most interesting governance claims in the design docs are marked as not yet built: the PR-risk tier pipeline in EVALUATION.md is mostly Next, Later or Future in its own phasing table, the versioned asset registry in REGISTRY.md is prefaced by a description of the problem it would solve rather than a shipped system, the DNS Firewall is in observation mode not enforcement, and the AgentCore Identity Token Vault credential redesign is explicitly parked pending an AWS-side bug. None of this is slop in the sense of vapourware, it is disclosed, tracked against issue numbers, and dated, but a reader who only reads ARCHITECTURE.md and not the phasing tables will overestimate what is actually enforced today.

No independent security incidents, licence changes, or comparison pieces against other products were found in search. No AWS blog post or re:Invent talk specific to ABCA was found either, despite that being a likely source named in the brief, the closest adjacent AWS re:Invent 2025 material is about Kiro and frontier agents, a different, separately branded product line, not this sample.

## 9. Sources

- https://github.com/aws-samples/sample-autonomous-cloud-coding-agents, cloned locally, depth 1, at repos/market-research-clones/aws-autonomous-coding-agents-sample
- README.md
- docs/design/ARCHITECTURE.md
- docs/design/VISION.md
- docs/design/ORCHESTRATOR.md
- docs/design/SECURITY.md
- docs/design/IDENTITY_AND_AUTH.md
- docs/design/COMPUTE.md
- docs/design/COST_MODEL.md
- docs/design/CEDAR_HITL_GATES.md, partial, design decision table and table of contents
- docs/design/INPUT_GATEWAY.md
- docs/design/EVALUATION.md, partial, head
- docs/design/MEMORY.md, partial, head
- docs/design/REGISTRY.md, partial, head
- docs/decisions/ADR-002-least-privilege-bootstrap-policies.md
- docs/decisions/ADR-013-tiered-validation-pyramid.md, partial, head
- docs/decisions/ADR-019-agentcore-gateway-tool-federation.md, partial, head
- docs/decisions/ADR-021-lambda-microvms-compute-backend.md, partial, head
- docs/guides/USER_GUIDE.md
- docs/guides/DEVELOPER_GUIDE.md, partial, head
- docs/guides/QUICK_START.mdx, partial
- package.json, agent/pyproject.toml
- top-level layout via find, maxdepth 2, directories only
- cli/src, agent/src, cdk/src, cdk/src/constructs directory listings
- cdk/src/constructs/task-dashboard.ts
- docs/imgs/, screenshot inventory, no product screenshots present
- https://aws-samples.github.io/sample-autonomous-cloud-coding-agents/, WebFetch, 2026-09-29
- WebSearch, AWS Autonomous Background Coding Agents ABCA blog re:Invent, 2026-09-29, no dedicated blog post or talk found
- gh api repos/aws-samples/sample-autonomous-cloud-coding-agents, 2026-09-29: 153 stars, 48 forks, 326 open issues, MIT-0, created 2026-03-31, pushed 2026-09-29
- gh api repos/aws-samples/sample-autonomous-cloud-coding-agents/contributors: 22 contributors
- git log -1 --format=%ci: 2026-09-22 19:55:42 plus 0000
