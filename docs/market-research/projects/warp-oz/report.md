---
name: Warp Oz
slug: warp-oz
url: https://www.warp.dev/oz
repo: none
category: factory-orchestrator
license: "mixed: Oz orchestration platform proprietary; the separate Warp terminal client went MIT (warpui crates) / AGPL-3.0 (rest) in April 2026"
open_source: partial
self_hostable: partial
hosting_model: Warp-hosted SaaS control plane (oz.warp.dev) by default; self-hosted task execution (Docker, Kubernetes Jobs, direct) on the Enterprise plan only, with orchestration, transcripts and LLM traffic still routed through Warp's backend under a Zero Data Retention agreement
company: Warp, Inc. (legal name Denver Technologies Inc.), New York, founded June 2020 by Zach Lloyd (ex-Google); Series A 23M USD (2022), Series B 50M USD led by Sequoia (June 2023), about 73-75M USD total raised, no disclosed round since; about 100 employees as of August 2026
maturity: Oz launched 2026-02-10, multi-harness update 2026-05-19, renamed "Automation Platform" in September 2026 with the Oz name and CLI retired by 2026-10-06; no public repository for Oz itself; the separate Warp client repo opened April 2026 and had about 64,200 GitHub stars by August 2026; CEO claims Oz writes 60 percent of Warp's own PRs (self-reported, not verified)
similarity: 2
axes:
  signals_intake: 3
  control_plane: 1
  sandbox_isolation: 2
  verification: 1
  policy_outside_model: 1
  identity_per_task: 2
  cost_control: 2
  ux: 4
  reseedable_selfhost: 1
steal:
  - Parent and child runs communicate over a durable, server-backed message bus with a per-agent inbox and a global sequence number, so a child's result is guaranteed to arrive before its SUCCEEDED state is observed. A concrete pattern for ordering our own supervisor and worker events.
  - Orchestration is offered as named, documented patterns (supervisor/worker, fan-out/fan-in, critic/verifier, review-swarm, DAG) behind two API modes, an orchestrate mode and a plan mode, rather than left to prompt engineering. Worth copying as vocabulary and an API shape once we add non-coder capability classes.
  - A required approval step before any child agent launches, where the parent proposes child count, prompts, environments and parallelism, and a human approves or edits the plan first. A lightweight version of approval-as-workflow-state for multi-agent fan-out.
  - Environments as the reusable unit of task setup (a Docker image, one or more git repos, a startup command), created in under five minutes and shared across a team. A good default shape for cutting our own per-task cold start.
  - Session Sharing links as the audit primitive. Every run gets one link that shows a live, steerable transcript and can be listed by who started it. Directly addresses our stated gap of no real-time stream and no diff view.
  - Kubernetes self-hosting keeps the orchestration daemon's ServiceAccount separate from the per-task Job's serviceAccountName, so the worker and the task it runs carry different identities. Worth checking our own RBAC against this split.
  - Cost is shown as one spend unit ("credits") across both AI and compute usage, with a team-wide spend cap and per-seat pooling, which is a more legible framing than raw dollars-per-token for a cost view.
differs:
  - Even in "self-hosted" mode, session transcripts, orchestration metadata and LLM traffic still route through Warp's servers under a ZDR agreement. There is no path to running the control plane itself from our own Git and Postgres. Copying this dependency would break our re-seedable and no-vendor-service constraints outright.
  - No declarative, versioned policy document was found anywhere in the docs. Access is granted per integration or per agent ad hoc, and "least privilege" is stated as a principle, not enforced as a checked artifact. This is the opposite of policy lives outside the model as a file in Git that a prompt cannot alter.
  - Sandbox strength is a deployment choice, not a guarantee. The "Direct" backend shares the host kernel and the "Unmanaged" backend explicitly inherits the host's network access, tools and credentials. Our default is one gVisor pod with default-deny egress for every task, with no configuration that removes it.
ux_verdict: Ahead of our console today. CLI, a web app with a mobile view, API and SDK, Slack/Linear/Jira/GitHub triggers, live session links and a sub-agents tab beat our lack of real-time streams and diff views, but almost none of this has been exercised by independent users yet.
slop_verdict: Real and shipping fast from a funded, revenue-growing company, with working Docker Hub images and enterprise docs, but seven months after launch it has one zero-comment Hacker News thread, no independent reviews beyond a sponsored newsletter post, and it has already renamed and half-deprecated itself.
---

# Warp Oz

## 1. What it is

Warp Oz is a cloud orchestration platform for coding agents, built by Warp, the venture-backed maker of a terminal application. Warp launched Oz on 2026-02-10 as a way to run, track and audit many coding agents in parallel from one control plane, instead of each agent living unsupervised on a developer's laptop. It targets teams: CEO Zach Lloyd's framing is "Claude Code is built for individuals, Oz is built for teams." By September 2026 Warp had folded Oz into a broader "Automation Platform" brand and begun retiring the Oz name and CLI, with cutover set for 2026-10-06.

The makers claim hundreds of agents running in parallel with full visibility and audit, and that Oz already writes 60 percent of Warp's own pull requests. What the docs actually show is a control plane that launches agents (Claude Code, Codex or Warp's own harness) inside Docker containers or Kubernetes Jobs, tracks their state over a message bus, and exposes everything through a CLI, a web app and an API. There is no repository for Oz itself to check any of this against; a sibling product, the Warp terminal client, went open source in April 2026, which is a different codebase.

## 2. Mapping to our five planes

| Plane or principle | What Oz does | What we do | Verdict |
|---|---|---|---|
| Signals | Triggers from Slack, Linear, Jira, GitHub, GitLab, GitHub Actions, cron schedules and an @warp mention, plus a webhook and API entry point | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API, every task a Forgejo issue | they lead on breadth, not comparable on telemetry-driven intake |
| Control plane | Run states (INPROGRESS, SUCCEEDED, FAILED, BLOCKED, ERROR, CANCELLED) tracked over a message bus, a cron scheduler, no policy document or task registry found | factoryd with a Temporal workflow per task, Postgres task registry, policy as a file in Git applied by Flux | we lead |
| Worker plane | Docker container per task by default (destroyed after the run), Kubernetes Job/Pod option, or a "Direct" mode with no container and shared kernel, or "Unmanaged" mode that inherits the host's network and credentials outright | One gVisor pod per task, namespace and ServiceAccount per task, default-deny egress, always disposable | we lead |
| Verification | An optional critic/verifier orchestration pattern; no CI, no described policy gate, no default review step before a PR merges | Forgejo Actions on gVisor runners, path and migration risk gates, reproduction gate, stronger-model review | we lead |
| Merge and deploy | Agents open PRs; merge and deploy are left to the customer's own GitHub, GitLab or CI process | Bot merge after a whitelisted approval or an auto rule, Flux GitOps rollout, staging soak before prod | not comparable |
| Policy outside the model | Access is scoped per integration and per agent through granted permissions, described as least-privilege in prose; no capability language or enforced document found | Capability rules as YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | Worker-level secrets (WARP_API_KEY) held only by the orchestration daemon; on Kubernetes the worker's ServiceAccount is kept separate from the task Job's serviceAccountName, but no short-lived, audience-scoped token per task was found | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, no key material reaches the sandbox | we lead |
| Artifacts not chat | Runs produce PRs, branches and plans as "artifacts," but the primary surface for both starting and steering a run is a live chat session | TaskBrief in, a branch, a PR and a normalised event stream out, no chat channel is the coordination path | we lead |

## 3. Architecture and stack

Everything below is from Warp's docs and blog, since Oz has no public source. Warp separates a control plane (orchestration, observability, LLM inference) from an execution plane (where agents run, code is checked out, commands execute). The unit of work is an "environment": a Docker image, one or more git repositories, and a startup command, created via a slash command, the Oz web app, the CLI or the API. Cloud runs use Warp's hosted infrastructure (oz agent run-cloud --environment slug); local runs use oz agent run on the developer's own machine or CI.

Orchestration is one level deep: a parent run creates one or more child runs, and children cannot spawn further children. Parent and children communicate over what the docs call a "durable, server-backed message bus," with each agent addressed by an agent ID inbox and messages carrying a global sequence number. Named patterns are documented explicitly: supervisor/worker, fan-out/fan-in, critic/verifier, review-swarm (one child per open pull request) and DAG. Launching children through orchestrate or plan mode always requires a human approval step before any child starts.

Self-hosted execution, Enterprise plan only, has two modes. "Unmanaged" runs the agent inside the customer's own orchestrator or CI with no Docker dependency, on Linux, macOS or Windows. "Managed" runs an oz-agent-worker daemon (a public image on Docker Hub, warpdotdev/oz-agent-worker) that Warp's cloud drives to start tasks as Docker containers, Kubernetes Jobs, or directly on the host. In every mode, session transcripts, orchestration metadata and LLM requests still route through Warp's servers under a Zero Data Retention agreement, so "self-hosted" means customer-hosted execution with Warp-hosted orchestration, not an offline stack. Enterprise customers can route inference through their own cloud accounts (BYOLLM), documented as available for local agents with cloud-agent support "coming" as of an April 2026 doc page.

## 4. UX

Zero to first result: install Warp or the Oz CLI, sign in, either type a prompt at oz.warp.dev, run a create-environment command in Warp, or trigger from an integration. Warp's own launch post puts most of a team's onboarding at "under five minutes" to a working environment. Interfaces span CLI, a web app with a mobile view, a REST API and SDK, and Warp's terminal itself, which is a wider surface than our console, CLI and API today.

Watching a run: a "pill bar" in the Warp app shows live status per agent, the Oz web app has a dedicated Sub-agents tab for orchestrated work, and every run produces a Session Sharing link a teammate can open to watch or steer it. An API endpoint lists a parent's children by ancestor run ID.

Intervening and approving: a run enters a BLOCKED state when it needs a command approval or a permission decision, visible in the same status surfaces. Multi-agent fan-out always pauses for a human approval on the proposed plan before children launch. Beyond that, oversight is informal: watch the session, or hand the run back to a human to continue locally. There is no described gate equivalent to our reproduction gate or model review before a PR is considered done.

This is ahead of our console's acknowledged weak point (no real-time streams, no diff view), but it is largely undemonstrated: the one Hacker News submission of the Oz launch drew zero comments, and the clearest independent user reaction found was a Product Hunt comment describing initial confusion with the interface.

## 5. Security, identity, sandbox, policy, cost

Sandbox. The default managed backend is one Docker container per task, deleted after the run. Kubernetes gives one Job and Pod per task. Neither is gVisor or a microVM. Two other backends exist and are weaker by design: "Direct" shares the host OS and kernel with no container boundary, and "Unmanaged" explicitly inherits the host's network access, tools and credentials, leaving isolation entirely to the customer's own pod security and RBAC.

Identity. The orchestration daemon holds the Warp API key; on Kubernetes its ServiceAccount is kept separate from the per-task Job's service account, and the docs tell the operator to scope each one. No mechanism was found for minting a short-lived, audience-scoped credential per task the way our gateway does; task credentials are whatever the operator wires into the pod template or an external secrets operator.

Policy. No declarative or versioned policy document was found. The docs describe "granular permissions" and least-privilege access to internal services as a principle, applied per integration or per agent, not as a capability language enforced by code independent of the model.

Cost. Billing is credit-based across AI and compute usage, with per-plan credit allotments (1,500 to 18,000 credits a month), pay-as-you-go reloads, and a team-wide spend cap plus advanced spend controls on Enterprise. There is no documented per-task hard cap, hold or ledger comparable to ours. A public GitHub issue against the warp repository (numbered 10052) reports credit usage and run time differing between the Oz web app and the local Warp app for the same run.

Egress. Self-hosted agents need only outbound HTTPS to a short list of Warp domains, Docker Hub (managed mode) and, for GitHub-backed environments, github.com. No inbound access is required. This is a real control, though it is coarser than our default-deny-plus-allowlist network policy per task.

## 6. What we should take from it

Narrow: the message-bus-with-sequence-numbers pattern for ordering supervisor and worker events, the explicit orchestration-pattern vocabulary (supervisor/worker, fan-out/fan-in, critic/verifier, review-swarm, DAG) as a naming scheme once we add capability classes beyond coder, the mandatory approval-before-fan-out step as a template for our own multi-agent approval gate, and Session Sharing links as a cheap, concrete answer to our missing real-time stream and diff view.

Broad: "environments" as a reusable, team-shared unit of task setup (image, repos, startup command) is worth copying as a way to cut per-task cold start below our current per-namespace bootstrap. The credit-as-single-spend-unit framing across AI and compute cost is a more legible cost view than raw token counts, worth trying in our own cost page even though the underlying budget mechanics stay ours.

## 7. Where our philosophy differs and what that costs or buys us

Oz's control plane cannot be separated from Warp's cloud. Even the Enterprise "self-hosted" mode keeps orchestration, transcripts and LLM traffic on Warp's servers under a data-retention agreement rather than a contract we could inspect or re-seed from our own Git and Postgres. Copying this shape would directly break our re-seedable and no-vendor-service constraints. There is no version of Oz that survives deleting everything and rebuilding from Git.

Oz enforces access as granted integration and agent permissions rather than as a policy document a machine checks independently of the model. That is faster to set up for a small team and slower to audit at scale. Adopting it would trade our policy-lives-outside-the-model principle for convenience, which we are not willing to do given our security constraint.

Sandbox strength is optional in Oz: an operator can choose the weakest backend and get no isolation at all. Our constraint (mandatory gVisor, default-deny egress, no configuration path that removes it) costs us flexibility for teams who want to point agents at their existing infrastructure directly, which Oz's "Unmanaged" mode supports and we deliberately do not.

## 8. Red flags and slop assessment

The company is real: a funded, several-year-old business (about 73-75M USD raised, Sequoia-led Series B in 2023) reportedly adding meaningful revenue and around 100 employees as of August 2026, with working artifacts (a public Docker Hub image, active documentation, a real GitHub Actions and Slack/Linear/Jira integration story). Warp's own numbers, the 60 percent of PRs written by Oz and the "1,000 bonus credits" promotions, are self-reported and unverified.

Independent scrutiny is close to absent. The Oz launch's single Hacker News submission drew zero comments. The clearest third-party writing found (The Rundown, DataStudios, a Product Hunt AMA) is cautious tool-review or vendor-adjacent content, and at least one favourable newsletter post was marked sponsored. No security incident or CVE was found against Oz specifically.

Product instability: seven months after launch, Warp renamed the product to "Automation Platform," is retiring the Oz name and CLI by 2026-10-06, and is deprecating the standalone Agent CLI it had shipped only weeks earlier in favour of a single warp binary. Pricing is opaque: credit costs per action are not published, and a live GitHub issue documents inconsistent credit and run-time accounting between the two front ends for the same run. "Self-hosted" is marketing shorthand for customer-hosted execution under Warp-hosted orchestration, not a deployable, offline control plane, which matters directly for anyone evaluating it against a re-seedable, vendor-independent constraint like ours.

## 9. Sources

- https://www.warp.dev/oz, fetched 2026-09-29
- https://www.warp.dev/blog/oz-orchestration-platform-cloud-agents, fetched 2026-09-29, dated 2026-02-10
- https://www.warp.dev/blog/multi-harness-cloud-agent-orchestration, fetched 2026-09-29, by Zach Lloyd, dated 2026-05-19
- https://docs.warp.dev/platform/orchestration/, fetched 2026-09-29
- https://docs.warp.dev/agent-platform/cloud-agents/self-hosting/security-and-networking, fetched 2026-09-29
- https://www.warp.dev/pricing, fetched 2026-09-29
- WebSearch: Warp Oz agent orchestration Warp.dev announcement, 2026-09-29
- WebSearch: warpdotdev oz github open source repository, 2026-09-29
- WebSearch: Warp Oz security SOC2 self-hosted enterprise docs.warp.dev, 2026-09-29
- WebSearch: Warp Oz review reddit hacker news experience, 2026-09-29
- WebSearch: Warp terminal company funding Series C valuation 2025 2026, 2026-09-29
- WebSearch: Warp terminal company founded year headquarters San Francisco Zach Lloyd, 2026-09-29
- https://www.warp.dev/newsroom/2026/2/10/warp-launches-oz-the-orchestration-platform-for-cloud-coding-agents and https://www.warp.dev/blog/warp-is-now-open-source, via WebSearch, on the launch and open-source dates
- https://github.com/warpdotdev/warp, https://github.com/warpdotdev/oz-for-oss, https://github.com/warpdotdev/oz-workspace, https://hub.docker.com/r/warpdotdev/oz-agent-worker, via WebSearch, on what is and is not open source
- https://github.com/warpdotdev/warp/issues/10052 and https://news.ycombinator.com/item?id=47937349, via WebSearch, on the billing discrepancy and the lack of independent discussion
- https://www.therundown.ai/tools/oz, https://www.datastudios.org/post/warp-terminal-open-source-client-agent-orchestration-and-oz-pricing-explained, https://www.producthunt.com/p/warp/i-m-lili-one-of-the-engineers-who-built-oz-ama, via WebSearch, third-party reviews and reactions
- https://blog.sandbase.ai/warp-agent-cli-oz-local-cloud-agents-2026/, via WebSearch, on the Oz to Automation Platform rename and CLI deprecation
- https://sequoiacap.com/article/warp-spotlight, https://sacra.com/c/warp/, https://getlatka.com/companies/warp.dev, https://tracxn.com/d/companies/warp, via WebSearch, on founding, funding and headcount
