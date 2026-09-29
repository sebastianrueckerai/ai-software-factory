---
name: Open SWE
slug: open-swe
url: https://www.langchain.com/blog/open-swe-an-open-source-framework-for-internal-coding-agents/
repo: https://github.com/langchain-ai/open-swe
category: factory-orchestrator
license: "mixed: MIT (Open SWE code); Elastic License 2.0 (the LangGraph Agent Server runtime a standalone production deployment must run)"
open_source: partial
self_hostable: partial
hosting_model: local dev is free and self-hosted (langgraph dev, in-memory); production is either LangGraph Platform SaaS or a standalone Docker deployment that requires a paid LangGraph Enterprise plan and license key
company: LangChain Inc, San Francisco, founded 2022-2023 by Harrison Chase and Ankush Gola, Series B (125M USD, Oct 2025, ~1.25B USD valuation)
maturity: "10,773 stars, 1,288 forks (gh api, 2026-09-29), repo created 2025-05-21, launched publicly Aug 2025 as a TypeScript/Daytona agent, rewritten onto Python/Deep Agents/LangGraph and relaunched 2026-03-17, last commit 2026-09-28, near-daily commits, GitHub Issues disabled (has_issues false), no CONTRIBUTING.md"
similarity: 3
axes:
  signals_intake: 4
  control_plane: 3
  sandbox_isolation: 2
  verification: 4
  policy_outside_model: 2
  identity_per_task: 2
  cost_control: 1
  ux: 4
  reseedable_selfhost: 1
steal:
  - Workflow-file push guard (agent/middleware/workflow_push_guard.py) parses every git push, and any push touching .github/workflows/ is held for a human approval card in Slack or the dashboard before it reaches GitHub, keyed to a content fingerprint so a later commit re-opens approval.
  - The /baby-sit skill (agent/bundled_skills/baby-sit/SKILL.md) watches PR checks by webhook plus a token-free 10-minute fallback poll, classifies a failure as deterministic, flaky or ambiguous before acting, and reruns only the failed jobs with gh run rerun --failed, capped at three reruns per head SHA.
  - Expedited Slack review (docs/reference/expedited-slack-review.md) posts a small PR's full diff as a Slack card, needs one non-author approval, and fingerprints the exact head SHA so an unrelated later commit keeps the vote and a diff-changing one invalidates it.
  - Per-repository review style learning with a dry_run before approve gate (agent/review/styles.py): the reviewer earns write authority on a repository only after its synthesized style profile has run in observe-only mode.
  - A reviewer eval harness with golden PR review comments mined from real repositories (evals/reviewer/golden_comments: keycloak, grafana, discourse, cal.com, sentry) scored by an LLM judge, exactly the benchmark-of-agent-success-rate our own design admits it lacks.
  - Settings resolve through four sparse-override tiers, instance, workspace, user, thread, each unset field inheriting the one before (docs/reference/workspaces.md), a cleaner shape than one flat per-project config.
  - A tiny SandboxBackendProtocol (ls, read, write, edit, glob, grep, execute, id) made six sandbox providers (LangSmith, Daytona, Runloop, E2B, Modal, local) drop-in interchangeable behind one interface, comparable to and worth benchmarking against our own Go Harness interface.
differs:
  - GitHub identity is installation-wide by default, a sandbox's proxy-injected token normally covers every repository the GitHub App can reach, narrowed to one repository only for threads a public-repo webhook or automation started. That is a materially wider blast radius than our per-task, audience-scoped ServiceAccount token, and copying it would break identity belongs to the task, not the machine.
  - Beyond the one hardcoded workflow-file guard, what a sandbox may do is bounded by GitHub App scopes set once at installation and by prompt instructions, not by a versioned, database-backed capability policy evaluated per task. Adopting this as our model would break policy lives outside the model.
  - Real standalone self-hosting needs a LangGraph Enterprise plan, a database URI, a redis URI, a LangSmith API key and a license key that phones home to beacon.langchain.com at startup for license verification, or else the LangGraph Platform SaaS. Our re-seedable, no-vendor-service constraint rules this out as a durable-execution layer, however good the agent code above it is.
  - Cost is recorded after the fact for a usage leaderboard, not held or capped before a model call, there is a soft per-run model-call ceiling that posts a Slack notice, not a hard budget the gateway enforces. We would have to add our own budget layer entirely, nothing here transfers.
ux_verdict: More invocation surfaces than our console (Slack, GitHub, Linear, dashboard, CLI, desktop) and a genuine small-diff fast-approval flow, but the docs ship no dashboard screenshots and the project is not yet seeking outside users.
slop_verdict: Real and heavily engineered, not a landing page, but it is LangChain's own internal tool released as reference code rather than a community project, GitHub Issues are off and there is no CONTRIBUTING.md.
---

# Open SWE

## 1. What it is

Open SWE is LangChain's open-source framework for building an internal, asynchronous coding agent. A team runs its own deployment; the agent investigates a repository, implements a change in an isolated sandbox, validates it, opens or updates a pull request, then keeps watching CI and responding to review comments on the same durable thread. LangChain builds and hosts it as a company (San Francisco, founded 2022 to 2023 by Harrison Chase and Ankush Gola, Series B in October 2025 at roughly 1.25 billion USD valuation), and sells the managed deployment path (LangGraph Platform, now sold as LangSmith Deployment) alongside the free self-hosted path.

The README frames the current release plainly: "Under active development. Expect breaking changes and rough edges. We're not accepting issues or external contributions at this time." The GitHub repository confirms this in its settings (has_issues: false) and has no CONTRIBUTING.md. LangChain's own announcement (2026-03-17) says the project distils patterns it observed in Stripe's Minions, Ramp's Inspect and Coinbase's Cloudbot into a customizable foundation rather than a finished product.

What the README claims and what the repository shows agree closely here: the code backs every feature the docs describe, including narrow, carefully specified ones (see the workflow-push-guard and expedited-review design docs below). What is not verified independently is production reliability at scale: no SWE-bench or similar benchmark is published for the current graph, and the one independent review found (andrew.ooo, itself an AI-authored publication) explicitly calls validation the weakest layer compared with the internal tools it is modelled on.

## 2. Mapping to our five planes

| Plane / principle | What Open SWE does | What we do | Verdict |
|---|---|---|---|
| Signals | GitHub issue and PR comments, Slack mentions and slash commands, Linear issue comments, scheduled tasks, and Slack incident channels that queue every message and auto-investigate (docs/incidents-design.md) | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API; every task is a Forgejo issue | they lead (more trigger surfaces, though telemetry intake is Slack-channel text, not a structured alert schema) |
| Control plane | A LangGraph thread per unit of work, checkpointed durably (Postgres and Redis in production), a workspace record for settings tiering, an analytics schema for usage and PR outcomes | factoryd with one Temporal workflow per task, Postgres, policy as YAML in Git applied by Flux | equal (comparable durability; they have no capability-policy document, we have no per-repo settings tiering) |
| Worker plane | One sandbox per thread from a pluggable provider (LangSmith cloud by default, or Daytona, Runloop, E2B, Modal, local); sandboxes persist with the thread and are not silently replaced if unreachable | One gVisor pod per task, read-only root filesystem, non-root, default-deny egress | we lead (sandboxes here are not documented as network-restricted, and a persistent per-thread sandbox is less disposable than a per-task one; local mode has no isolation at all) |
| Verification | A dedicated reviewer graph plus review-scout, a baby-sit skill that watches CI webhooks and classifies failures before any rerun, and a reviewer eval harness against real-repo golden comments | Forgejo Actions on gVisor runners, policy gates, then a stronger-model review with a strict verdict | they lead (live CI diagnosis and an evaluated reviewer are ahead of what we have running) |
| Merge and deploy | The agent itself calls a merge tool once required checks, non-author approval and no unresolved threads hold; expedited Slack approval fast-paths tiny diffs; no deploy step is in scope | Merge by bot only after a whitelisted human or an auto rule; Flux deploys; staged rollout with an alert-free wait | not comparable (Open SWE stops at merge, we own deploy too) |
| Policy outside the model | One code-enforced guard (workflow-file pushes); everything else is GitHub App scope set once at install plus prompt instructions | Capability rules as a Git document, enforced in gateway code and network policy, versioned in the database | we lead |
| Identity per task | A GitHub proxy token minted at sandbox creation from the App's installation credentials, never stored as an env var, but installation-wide by default (repo-scoped only for public-repo-triggered threads) | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, mapped to capability and budget at the gateway | we lead |
| Artifacts not chat | Threads carry structured context (repo, PR, Linear issue, Slack messages with citable IDs) but the agent's own working memory is conversational; tool calls are the real handoff points | A TaskBrief in, a branch, PR and event stream out; Git is the coordination mechanism | equal |

## 3. Architecture and stack

Python 3.14, FastAPI, LangGraph 1.x for durable thread state, and the deepagents package (pinned ==0.7.17) for planning, file tools, shell execution and subagent orchestration (pyproject.toml). Six graphs are declared in langgraph.json: agent (agent/server.py, the main coding, review and incident agent), reviewer (agent/reviewer.py), analyzer (agent/analyzer.py), review-scout (agent/review_scout/graph.py), chat (agent/chat.py), and scheduler (agent/scheduler.py). This is a materially different shape from the manager, planner, programmer, reviewer graph the original August 2025 TypeScript release used: the current agent is one Deep-Agents-composed graph with a write_todos planning primitive and a task tool for subagents, not four hand-wired graph stages.

Storage: PostgreSQL for the application's own tables (repository, pull_request, pull_request_review, users, user_identity, workspace, workspace_repository, workspace_slack_channel, plus an open_swe_analytics schema), created by Alembic migrations (agent/database/migrations) and required at startup, the server refuses to start without it (docs/INSTALLATION.md). LangGraph's own Store and checkpointer hold thread state; in local dev this is in-memory (langgraph dev), in production it is the platform's or a licensed standalone server's Postgres and Redis.

Sandboxing lives in agent/sandboxes/providers/: langsmith.py (default), daytona.py, runloop.py, e2b.py, modal.py, local.py (no isolation, development only), selected by the SANDBOX_TYPE environment variable and registered in agent/sandboxes/providers/registry.py against the SandboxBackendProtocol interface from deepagents. For the default LangSmith provider, two GitHub proxy rules are configured per sandbox, Basic auth for git and Bearer for gh and REST, with the token minted at runtime from the GitHub App installation credentials; the docs explicitly say not to store GitHub access tokens as deployment environment variables.

Deployment shape: one LangGraph server image serving the API, webhooks and the built dashboard from a single origin (Dockerfile, langgraph.json dockerfile_lines). docs/INSTALLATION.md gives two paths: LangGraph Platform (managed, injects a LangSmith API key), or a standalone docker run of the same image that additionally needs a database URI, a Redis URI and a LangGraph Cloud license key, a licensed Enterprise-plan key, per LangChain's public deploy-standalone-server docs, needed because the langgraph-api package behind the Agent Server is Elastic License 2.0, not MIT (confirmed independently by web search, not by reading that package's source, which is not in this repository).

Models are addressed as LangChain chat models in provider:model form (agent/config.py), with Anthropic, OpenAI, Google, Fireworks, Groq and Baseten keys supported directly, or one LangSmith gateway API key to route every call through LangSmith's LLM gateway. The default model resolves from agent/dashboard/options.py (an Anthropic model if only an Anthropic key is set, otherwise an OpenAI one), overridable per instance, workspace, user or thread.

## 4. UX

Onboarding for a team deployment is roughly nine steps end to end (docs/INSTALLATION.md): stand up the deployment, get a LangSmith key, create and install a GitHub App, set model provider keys, create a Slack app from a provided manifest, generate two local secrets and an admin allowlist, then flip the deployment live. Local development adds an ngrok tunnel and a Postgres container (docs/DEVELOPMENT.md). This is a heavier zero-to-first-result path than our console, which uses Forgejo OAuth2 login with no per-deployment app registration, but it buys three genuinely different entry points into the same running system.

A user starts work by mentioning the bot in a GitHub issue or PR comment, mentioning the Slack bot or using a slash command, commenting on a Linear issue, or opening a thread from the web dashboard; the CLI instead runs commands locally as the user's own identity, explicitly without sandbox isolation. While an agent works, progress posts back to wherever the thread lives, Slack replies, GitHub PR comments, the dashboard's thread view; docs/images/workspace-mcp-oauth.png is the only screenshot shipped in the repository, so beyond that the interface is described, not shown.

Intervention is a small, named set of mechanisms rather than a single approval gate: a follow-up message mid-run is queued and injected before the next model call; a git push touching .github/workflows/ is held for a Slack or dashboard approval card; a tiny PR can be fast-approved by one Slack click that submits a real GitHub review; the baby-sit skill is a standing watch a user starts or stops explicitly. There is no single approve-the-plan interrupt of the kind the original 2025 design used, the current agent plans, executes and opens the PR in one pass, and review happens on the PR, not before it starts.

## 5. Security, identity, sandbox, policy, cost

Identity. GitHub credentials never reach the sandbox as stored secrets: a proxy mints a token from the GitHub App installation at sandbox-creation time (agent/github/token.py, agent/sandboxes/providers/langsmith.py). The scope of that token is the gap: by default it is installation-wide, narrowed to one repository only for threads a public-repository webhook or automation started (docs/reference/workspaces.md, GitHub access and the sandbox image). A member-started thread can reach every repository the installation covers, including ones the member cannot access on GitHub themselves, by the docs' own admission.

Sandbox. Isolation is real but provider-dependent and not detailed for network egress in the docs read: the default is a LangSmith-managed Linux sandbox; local mode runs commands directly on the host with the explicit warning that it has no sandboxing and should only be used for local development with human-in-the-loop enabled. Nothing in the customization or installation docs describes a default-deny egress policy comparable to ours; the README's own caution is that sandboxes have powerful tools and may have network access, and that operators should tailor approval policies to their deployment, which puts that burden on the operator.

Policy. The one capability rule enforced in code, not a prompt, is the workflow-file push guard (agent/middleware/workflow_push_guard.py): it parses git push invocations and blocks anything touching .github/workflows/ until approved. Everything else, what a reviewer may do, what PR chat may touch, is prompt instruction (reviewers are instructed not to commit or push) plus which tools are wired into a given graph, PR chat's tool list simply excludes mutation tools, per the README.

Cost. No hard cap exists. agent/analytics/usage.py records a cost_usd figure per run into Postgres for a usage leaderboard and reporting, after the run. The only ceiling on runaway spend is a step-limit notification middleware that posts a Slack message when the agent hits a model-call limit; it informs, it does not stop the run or block the next call.

## 6. What we should take from it

Narrow, this month. The workflow-file push guard is a complete, small pattern worth copying almost as-is: parse the git command a sandbox is about to run, compute a content fingerprint of what it would push, and hold anything matching a protected path class until a human clicks approve, keyed so a later commit re-opens the gate. It would fit directly into our gateway's git-token boundary. The baby-sit failure taxonomy (deterministic vs flaky vs ambiguous, evidence required before any rerun, a hard cap of three reruns per head SHA, rerun only the failed jobs) is a ready-made refinement for our reproduction gate. The reviewer eval harness (evals/reviewer, golden comments from real public repositories scored by a judge model) is a direct fix for the benchmark gap our own design document names as a weakness.

Broad, product shape. Multiple invocation surfaces sharing one thread and one identity model, GitHub, Slack, Linear, dashboard, CLI, is a UX shape we do not have: we are Forgejo-only. We should not necessarily add Slack or Linear, but the underlying pattern, one deterministic thread id per source and conversation, context queued and drained before the next model turn, generalises past chat platforms. The incident-channel design (docs/incidents-design.md) is a genuine telemetry-to-investigation loop built from the same primitives as coding work, worth studying even though its trigger is a Slack channel rather than a structured alert payload like our SigNoz webhooks.

## 7. Where our philosophy differs and what that costs or buys us

Their identity model trades task-scoped isolation for simplicity: one GitHub App, one installation-wide token pattern, narrowed only for the public-repository case. This is cheaper to build and reason about than our per-task, gateway-verified, cluster-issued token, but it means a single compromised or misdirected sandbox session can reach every repository the App can, not just the one it was given. We should not adopt this; our constraint that identity belongs to the task, not the machine, is the more expensive but correct choice for a system meant to run largely unattended.

Their policy model is prompt-and-install-time-scope for almost everything except one hardcoded guard. That is far cheaper to write than a Git-versioned, database-enforced capability document, and it is adequate for a tool a platform team runs against repositories it already trusts broadly. It would not be adequate for us: our design explicitly serves as a portfolio proof that policy can live outside the model, and copying their approach would undercut the one claim that differentiates our project from an agent with a system prompt.

Their runtime dependency is the sharpest divergence. Real standalone production self-hosting needs a paid LangGraph Enterprise license and a startup call to LangChain's license server, or the vendor's own SaaS. Every constraint we operate under, re-seedable from Git and object storage alone, commodity hardware, no vendor-specific service, rules out building our durable-execution layer this way, no matter how good the agent code sitting on top of it is. This is the clearest place where best-of-breed is not the same breed we should use: Temporal, which we already run, has no such gate.

## 8. Red flags and slop assessment

The code is real, current and unusually well documented for an OSS drop: every non-trivial mechanism found here, workflow push guard, expedited review, workspace routing, incidents, has its own multi-page design document in docs/, arguing alternatives and listing open questions, not just describing the happy path. The reviewer eval harness with real golden data is a genuine quality signal a slop project would not build.

Three things temper that. First, governance: GitHub Issues are disabled on the repository, has_issues is false via the GitHub API checked 2026-09-29, and there is no CONTRIBUTING.md; the README says outright it is not accepting issues or external contributions at this time. This is LangChain's own internal tool, shared as reference code, not a community project soliciting outside engineering. Second, the project changed its entire architecture and language, TypeScript and Daytona with manager, planner, programmer, reviewer graphs, announced August 2025, for a Python, Deep Agents, LangGraph rebuild announced 2026-03-17; a team adopting today's shape should expect it can change again, and the README's own warning to expect breaking changes is not boilerplate caution. Third, the licence story is mixed in a way marketing does not surface: Open SWE's own code is MIT, but the Agent Server it must run on for a real standalone deployment, the langgraph-api package, is Elastic License 2.0 and gated behind an Enterprise plan and a license key that phones home to beacon.langchain.com, per LangChain's own deploy-standalone-server documentation. This detail was not found in Open SWE's own docs, and the one independent review read did not raise it either. No security incidents were found in the time available; SECURITY.md is a three-line disclosure-contact stub with nothing to evaluate.

## 9. Sources

- https://github.com/langchain-ai/open-swe, cloned depth 1 to the local clones directory, 2026-09-29, HEAD 8447d86
- gh api repos/langchain-ai/open-swe, 2026-09-29, for stars, forks, license, created_at, pushed_at, has_issues, archived
- README.md
- AGENTS.md
- SECURITY.md
- langgraph.json
- pyproject.toml
- package.json
- docs/INSTALLATION.md
- docs/DEVELOPMENT.md
- docs/CUSTOMIZATION.md
- docs/reference/workspaces.md
- docs/reference/expedited-slack-review.md
- docs/incidents-design.md
- agent/graphs/agent.py, analyzer.py, chat.py, reviewer.py, review_scout.py, scheduler.py
- agent/middleware/workflow_push_guard.py
- agent/threads/workflow_approval.py
- agent/github/token.py, token_scope.py
- agent/sandboxes/providers/langsmith.py
- agent/review/styles.py
- agent/analytics/usage.py
- agent/bundled_skills/baby-sit/SKILL.md
- evals/reviewer/ directory listing, including golden_comments json files
- ui/src/ directory listing
- https://www.langchain.com/blog/open-swe-an-open-source-framework-for-internal-coding-agents/, fetched 2026-09-29, dated 2026-03-17
- https://andrew.ooo/posts/open-swe-langchain-coding-agents/, fetched 2026-09-29, independent AI-authored review
- Hacker News launch threads, August 2025, via web search 2026-09-29
- Web search on LangGraph Cloud license key and standalone Agent Server licensing, citing LangChain's deploy-standalone-server docs, 2026-09-29
- Web search on LangChain company funding and founding, 2026-09-29
