---
name: Factory (Droids)
slug: factory-ai
url: https://factory.ai
repo: none
category: enterprise-agent-platform
license: proprietary
open_source: no
self_hostable: partial
hosting_model: vendor SaaS control plane, agent binary runs on laptops, CI runners, BYO machines or Factory-managed E2B VMs; hybrid and airgapped only on Enterprise
company: Factory AI (Matan Grinberg, Eno Reyes), San Francisco, founded 2023, over 400M USD raised, 200M at 5B valuation in September 2026
maturity: closed product; public docs mirror Factory-AI/factory (37 stars), droid-action (57 stars, pushed 2026-09-29), 181 dated release-note entries, CLI v0.179.0 by 2026-07-23, several releases per week
similarity: 3
axes:
  signals_intake: 4
  control_plane: 2
  sandbox_isolation: 2
  verification: 3
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 2
  ux: 5
  reseedable_selfhost: 1
steal:
  - CI Steward limits from droid-action - config read only from the default branch, editing tools withheld unless the failing job is in `fix.scope`, `protected_paths` reverted after the run, three separate budgets (`max_retries`, `max_fix_attempts`, `max_runs_per_pr`)
  - Two-pass model review - a candidates pass (`review_candidates_max_turns` 100) then a validator pass (`review_validator_max_turns` 40) that throws out false positives before anything is posted
  - Software Factory coverage map - one console row per lifecycle stage (triage, code-gen, validate, release, document, monitor) showing automation count, health and which repositories are covered
  - Mission Control layout - orchestrator, worker and validator sessions in a left rail, per-role model dropdowns, feature checklist, live progress log, time and credits in the header, pause and re-plan button
  - Incident runbook as agent-maintained memory - after each RCA the agent updates `.factory/skills/incident-guidelines/SKILL.md` so the next alert of the same kind starts from learned guidance
  - Agent Readiness report - score a repository on how well an agent can build, run and test it, offer a fix task, and refuse long autonomous runs below a set level
  - Cost estimate before a run - `total runs ≈ features + 2 × milestones` as a floor, shown before approval
  - Extension-only policy merge - arrays union and cannot be removed, scalars first-wins, object keys locked per level, and a malformed org file resolves to an empty policy that is logged, never silently skipped
differs:
  - The agent runs on the user's laptop, CI runner or a persistent sudo-enabled VM with the machine's own git credentials, and policy is enforced inside the agent client. We run one disposable sandbox per task and enforce policy in a gateway the agent cannot touch.
  - The control plane, billing and model routing are Factory's SaaS. Self-hosting is an Enterprise sales conversation and nothing about the control plane can be rebuilt from Git.
  - Human approval is a session dial (Autonomy Off to High) on an interactive agent. We treat the human as a rare tool call and an approval as a workflow state.
ux_verdict: Far ahead of our console. Desktop app, CLI, Slack, Linear, mobile and a Mission Control view with live worker logs and a pause button, first result in about five steps.
slop_verdict: Real, heavily funded and shipped almost daily, but closed. Security and deployment docs promise more than a buyer can check, and the benchmark and customer claims are self-reported.
---

# Factory (Droids)

## 1. What it is

Factory is a closed, commercial platform for AI coding agents called Droids. It is made by Factory AI in San Francisco, founded in 2023. It raised a 150M USD Series C at 1.5B in April 2026 and 200M USD at 5B in September 2026 (press coverage, 2026-09). It shares our name and our "software factory" framing. As of 2026-09-29 `factory.ai` redirects to `factory.com`.

The core is one agent harness, the `droid` binary. It runs as an interactive CLI, headless (`droid exec`), inside a desktop and web app, behind Slack and Linear, and in GitHub Actions. Around it Factory sells a hosted layer: Automations (triggers), Missions (multi-agent orchestration), Droid Computers (persistent remote machines), Software Factory (a lifecycle dashboard, private preview), a model router and enterprise controls. It is sold per seat with rolling rate limits: Pro 20 USD, Plus 100 USD, Max 200 USD per month, and Business and Enterprise by sales contact.

Claim: "a 24/7 autonomous system that connects AI agents across the software development lifecycle" (`docs/web/software-factory.mdx`). What the docs show: a strong single-agent harness, an automation scheduler with Slack, GitHub and cron triggers, and a dashboard. Release and deploy are listed as "as available". Software Factory and Incident Response are both private preview.

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Slack mentions, Slack alert channels (bots only by default), Linear assignment, Jira fetch, GitHub events via workflow files, cron schedules, Sentry via Linear | Forgejo issues and comments, SigNoz alert webhooks, intake API | they lead |
| Control plane | Hosted: automations with owner, run-as identity, run target, run history, pause and resume. Missions orchestrator with milestones. Admin audit log. Engine and storage not disclosed | factoryd, Temporal per task, Postgres, policy in Git, approvals as states, cost ledger | we lead |
| Worker plane | `droid` on laptops, CI runners, BYO machines or managed "Droid Computers" (4 CPU, 8 GB, E2B-hosted, persistent, `factory-user` with passwordless sudo). Optional per-command bubblewrap or Seatbelt sandbox (beta) | One gVisor pod per task, namespace and ServiceAccount per task, default-deny egress, disposable | we lead |
| Verification | droid-action review (candidates then validator), STRIDE security review, CI Steward auto-fix, Mission validators that run the app ("user testing") | Forgejo Actions on gVisor runners, path risk classes, reproduction gate, stronger-model review | equal |
| Merge and deploy | Left to GitHub branch protection. "Release" stage is "as available" | Bot merge after approval or `auto` rule, Flux, staging soak, prod | we lead |
| Policy outside the model | Hierarchical `.factory/settings.json`, command risk classes, allow, deny and blocklists, org max autonomy, kernel sandbox, hooks. Enforced by the `droid` client on the agent's host | Policy YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | User OAuth tokens rotated every 30 days, `FACTORY_API_KEY` secrets, service-account API keys (Enterprise). GitHub App token by OIDC exchange, revoked after each Action run | Projected, audience-scoped token per task, no key material in the sandbox | we lead |
| Artifacts not chat | Missions track features, commits and a `validation-state.json`. Most surfaces are chat sessions | TaskBrief in, branch, PR and event stream out | we lead |

## 3. Architecture and stack

Closed source. Everything below comes from the public docs mirror and the open GitHub Action. Anything about the hosted backend is inference.

The docs source is the whole of `Factory-AI/factory` (`docs/`, Mintlify MDX, `docs.json`). The README says "All rights reserved". The binary is installed by `curl -fsSL https://app.factory.ai/cli | sh` or `npm -g install droid`. The SDK repositories (`droid-sdk-typescript`, `droid-sdk-python`) hold examples. The SDK spawns the `droid` CLI or connects to a running "Droid daemon".

Three deployment patterns are documented in `docs/enterprise/network-and-deployment.mdx`. Cloud-managed: `droid` on laptops and CI, Factory cloud holds "control plane and org metadata". Hybrid: `droid` in the customer's network with the customer's LLM gateway and OTEL collector. Fully airgapped: no Factory cloud at runtime, artifacts imported offline. The airgapped mode appears to be the CLI with a system-managed policy file at `/etc/factory/settings.json`, not a self-hosted control plane. Automations, Missions dashboards and Software Factory are not described for airgapped use. Not verified.

Remote compute is "Droid Computers" (`docs/cli/features/droid-computers.mdx`). The managed kind is described as "E2B-hosted", provisioned with a daemon, reached through a WebSocket relay, auto-paused when idle. It keeps state between sessions. BYOM registers any machine with `droid computer register`. "Cloud Templates" (repo plus setup script) are marked as superseded.

Model access: Factory-billed inference by default ("Standard Usage"), BYOK for many providers, and "Droid Core", a pool of open-weight models (GLM-5.2, Kimi K2.7 Code, DeepSeek V4 Pro, MiniMax M3) with its own limits (`docs/models.mdx`). "Factory Router" picks a model per task and per request with prompt-cache awareness and claims 43 percent lower aggregate cost (`docs/web/factory-router.mdx`, self-reported). The Continuum review notes that BYOK only applies to the local CLI and desktop app. Hosted delegation runs on Factory-billed inference.

The GitHub Action (`droid-action`, TypeScript on Bun) is the one piece of real source. Its layout follows the Anthropic Claude Code action pattern: `src/entrypoints/prepare.ts`, `src/github/token.ts`, `src/github/validation/permissions.ts`, `src/mcp/*` for GitHub tools, `src/create-prompt/templates/*`. `token.ts` gets a GitHub OIDC token (`core.getIDToken("droid-github-action")`) and exchanges it at `https://app.factory.ai/api/github/token-exchange` for an app installation token. `checkWritePermissions` rejects actors without write access unless `allowed_non_write_users` is set. `src/steward/*` implements CI Steward. `isTrustedRun` in `gate.ts` refuses fork heads in `workflow_run`. `config.ts` defaults `protected_paths: [".github/workflows/**"]`, `scope: ["lint","types","tests","build"]`, `max_attempts: 2`. The Action has no licence file (`gh api` returns null).

`Factory-AI/vfs` (Rust, beta) is a SQLite-backed copy-on-write filesystem over FUSE or NFS. It packs a live agent session into a delta file that can be adopted on another machine at the same base commit. It is not referenced by the product docs, so its production use is not verified.

## 4. UX

Their UX is the strongest part of the product and far ahead of ours. Every surface uses the same agent and the same session model.

Zero to first result on the desktop app: download, install, sign in, set working directory, type a prompt. Five steps (`docs/web/getting-started/quickstart.mdx`). CLI: install script, `cd`, `droid`, sign in, prompt. There is no free tier, so a card or sales contact comes first.

Starting work: `@Factory` in a Slack thread, assign Factory on a Linear issue (changelog 1.8), `@droid review` on a PR, an automation trigger, or a new session in the app with a machine picker (local, Droid Computer). Linear docs in the current tree still describe an "Open in Factory" link that creates a session. Only the 1.8 changelog documents assignment.

Watching: the Mission Control screenshot (`docs/images/mission-web.png`) shows a left rail with the orchestrator and numbered worker and validator sessions per milestone. The centre holds the chat and a completion summary with commit hashes and "25/25 assertions passed". The right rail has per-role model pickers (orchestrator Opus 4.8, worker Opus 4.7, validator GPT-5.3-Codex), a feature checklist and a timestamped progress log. The header shows elapsed time (02:57:04), progress 12/12 and "Factory Standard Credits 35.5M". Clicking a worker shows its terminal output and reasoning.

The Software Factory screenshot (`docs/images/software-factory-dashboard.png`) is a dark dashboard. Columns: Signal (198 per 7 days, 15 sources), Triage, Code Gen, Validate, Release, Document, Monitor, Deploy (147 per 7 days). Each column shows automation count, throughput, cycle time and a sparkline, above charts for tickets triaged, PRs validated, PRs shipped and incidents processed. The numbers look like demo data.

Intervening: in the CLI, `Ctrl+L` cycles autonomy Off, Low, Medium, High, `Shift+Tab` toggles Spec Mode (read-only planning, then an approval dialog). Sandbox violations raise "Allow once / Allow always / Deny" prompts with a 60 second auto-deny. In `droid exec` they are auto-denied. In Mission Control a user pauses the orchestrator, asks it to re-plan and resumes. A stuck managed machine has "Force Reboot" in the session menu.

Easier than ours: live streams of each agent, a diff and commit view, per-role model choice in the UI, a Slack thread as the entry point, a mobile client. Worse than ours: approvals are prompts inside a live session, not durable states. A reviewer cannot see policy or budget per task. The "task" is a chat session, and its state lives in Factory's cloud.

## 5. Security, identity, sandbox, policy, cost

**Sandbox.** The OS-level sandbox is beta and opt-in (`sandbox.enabled`, `docs/cli/configuration/sandbox.mdx`). It uses bubblewrap plus seccomp on Linux, Seatbelt on macOS, and an HTTP and SOCKS filtering proxy for egress. The default mode `per-command` wraps each shell command but leaves the main `droid` process unconfined. `whole-process` confines everything and refuses to start if isolation fails. Defaults: reads allowed everywhere except `denyRead`, writes only in the working directory, network denied except Factory's own domains, which are always allowed. The docs call it "defense in depth" and "not a hard boundary around untrusted code". Managed Droid Computers are persistent, and the docs admit that `factory-user` has passwordless sudo and can change the iptables rules. Relay mode is the stronger option. Nothing is disposable per task by default.

**Policy.** This is a real strength. Settings live in `.factory/` at org, folder, project and user level with extension-only merging (`docs/enterprise/hierarchical-settings-and-org-control.mdx`). Org denies cannot be removed. `commandBlocklist` entries never run, even with `--skip-permissions-unsafe`. The docs say `droid` resolves the actual program before matching, so `bash -c` or absolute paths do not bypass it (`docs/cli/user-guides/auto-run.mdx`). Org "Maximum Autonomy Level" caps what users can pick. Hooks can block prompts, file access, commands and git pushes. All of this runs inside the `droid` client on the host where the agent works. It is code, not prompt, but it sits in the agent's own process space. We have not verified any of it in code, because the binary is closed.

**Identity.** CLI users hold an OAuth token rotated every 30 days. CI uses a long-lived `FACTORY_API_KEY` secret. Service accounts (Enterprise only) authenticate with API keys that can have an expiry (`docs/enterprise/service-accounts.mdx`). Git access on managed machines is the user's personal GitHub integration, "added automatically". The one strong pattern is the Action's OIDC-to-app-token exchange with revocation after the run. The agent can always reach the credentials of the machine it runs on.

**Secrets.** Droid Shield scans files, prompts and commands for secrets and can block `git commit` and `git push` (`docs/cli/account/droid-shield.mdx`). This is pattern scanning, not credential isolation.

**Egress.** Unrestricted unless the sandbox is on or the customer puts the agent in a restricted network. The Action has `experimental_allowed_domains`.

**Cost.** Individual plans have rolling 5-hour, weekly and monthly windows shared per org. A running agent is paused when a window is exhausted. The audit log has a `user_limit_change` event with `toTokens`, so per-user token limits exist on Business and Enterprise (`docs/enterprise/audit-log.mdx`). No per-task hard cap, hold or ledger is documented. Missions require Extra Usage (prepaid credits, 10 USD minimum) to be enabled. Cost control for enterprises is described as "model policy, usage patterns and observability" plus OTEL dashboards. CI Steward's `max_runs_per_pr` is the only per-work-item budget found.

**Audit.** The audit log covers admin events (membership, API keys, service accounts, integrations, managed settings). Per-action agent telemetry goes to OTEL, including command risk levels.

## 6. What we should take from it

### Narrow

**CI Steward limits.** When we build our CI-fix loop, copy the four rules from `droid-action/src/steward/`. Read the config from the default branch only. Withhold editing tools unless the failing job's category is in scope. Revert protected paths after the run and fail the job. Keep three budgets (per job retry, consecutive fixes, lifetime per PR). All four fit our gateway capability check and our workflow gates.

**Two-pass review.** Split our `review-frontier` step into a candidate pass and a validator pass with separate turn limits. Only validated findings reach the PR. This reduces noise without a stronger model.

**Incident runbook memory.** Let the agent write a per-project runbook per alert class after each telemetry-driven task, committed to the project repo. This gives us project memory for our weakest area, stored as Git artifacts.

**Pre-run cost estimate.** Show `features + 2 × milestones` style run counts, priced at the tier rate, on the approval card. It fits our budget holds.

**Extension-only merge.** If projects get their own policy overlays, adopt the merge rules and the "malformed org file means empty policy, logged" behaviour.

### Broad

**A lifecycle coverage view.** Add a console page with one row per stage and per project: which gates, automations and alerts are wired, and their health. It sells the "enterprise-grade" story better than a kanban board.

**Mission Control as the task view.** Our task detail page should show the session tree (worker, supervisor, reviewer), per-role model, live event log, commits and gate results, and a pause and redirect action. This closes our "no real-time streams, no diff view" gap.

**Readiness gate at project registration.** Score a new project on whether an agent can build, run and test it headless, open a fix task if not, and refuse `auto` merge below a threshold.

**Chat surfaces as intake.** A Slack or Matrix mention that creates a Forgejo issue would widen intake without moving the source of truth.

**Scheduled automations.** Recurring security audits and docs refresh as policy-defined schedules that create tasks.

## 7. Where our philosophy differs and what that costs or buys us

**Where the agent runs.** Factory meets developers where they are: laptops, existing CI, persistent machines. Adoption is instant and the agent sees the real environment. The price is ambient credentials and client-side policy. Copying it would break our identity-per-task and sandbox principles. Our constraint buys a blast radius of one task, and it costs us onboarding speed and environment fidelity.

**Hosted control plane.** Factory owns orchestration, billing, routing and dashboards. That gives a polished UX and a fast release cadence. It breaks our re-seedable and no-vendor constraints outright. Their airgapped story covers only the CLI.

**Human in the loop.** Factory's default is an interactive session with an autonomy dial. Missions go further but require High autonomy or `--skip-permissions-unsafe`. That is the reverse of our model, where autonomy is the default and gated by policy and evidence. Their approach is better for adoption by cautious teams. Ours is better for unattended throughput.

**Persistent machines.** Stateful Droid Computers make long investigations and incident work easier because tools, logins and MCP servers stay configured. We pay for disposability with re-setup time per task. A reviewer called the drift risk "hidden state" (Continuum, 2026-08). We keep our choice, but a warm-cache image per project would narrow the gap.

**Where they are better and our constraint is the price.** Breadth of intake, UX polish and multi-agent orchestration. None of these are blocked by our constraints. They are only unbuilt.

## 8. Red flags and slop assessment

The product is real and busy. There are 181 dated release-note entries, CLI versions landing several times a week, and droid-action commits on the day of writing. The Action source is careful (fork checks, post-run path enforcement).

Closed core. The binary, backend and SDK are proprietary. Every security claim about the client (blocklist resolution, sandbox scope, Shield) is documentation only. The docs mirror carries "All rights reserved". The Action has no licence.

Enterprise gating. Service accounts, sub-organisations, on-premise deployment, customer-managed keys, data residency and "full admin controls" are Enterprise only. SSO, SCIM and audit logging start at Business. Self-hosting is not a product you can download.

Marketing ahead of evidence. The Terminal-Bench number (58.75 percent on v0.1.1, September 2025) is self-reported and dated. Claims of "hundreds of thousands" of daily developers and six months of month-over-month revenue doubling are unverified (Ry Walker research, 2026-06). Router savings of 43 percent are self-measured. The Software Factory dashboard is private preview and its screenshot uses demo figures. The "Release" and "Deploy" stages have no documented mechanism.

Pricing opacity. Plans are sold as multipliers of Pro with unpublished token amounts. Reviews name mid-Mission exhaustion and prepaid-credit dependence as problems (Continuum 2026-08, UsagePricing 2026-09).

Security. No CVE or public prompt-injection disclosure against Droid was found. Factory disclosed a June 2026 trial-abuse fraud campaign ("The Droid Wars") in which attackers reproduced the client's request signatures. That is a billing incident, not an agent escape. The PR-comment trigger in the Action is the same attack surface that produced CVE-2025-53773 in Copilot. Factory mitigates it with the write-access check and bot filtering.

Sentiment is mixed. Hacker News comments range from "pretty good for a cross-provider solution" to "the hype behind it is extremely forced" (per search summaries, 2026-06). Only the Continuum review compared it methodically, and that author sells a competing product.

## 9. Sources

- https://factory.ai (307 redirect to https://factory.com/, fetched 2026-09-29)
- https://factory.com/ (fetched 2026-09-29)
- https://github.com/Factory-AI (org repository list via `gh api orgs/Factory-AI/repos`, 2026-09-29)
- https://factory.ai/news/series-c (search result, 2026-04)
- https://ground.news/article/factory-raises-200m-at-5b-valuation-tripling-in-five-months (search result, 2026-09)
- https://multiples.vc/private-comps/factory (search result)
- https://factory.ai/news/terminal-bench (search result, 2025-09)
- https://factory.ai/news/droid-neutralizing-fraud (search result, 2026-06)
- https://continuumcode.ai/guides/factory-ai-review/ (fetched, dated 2026-08)
- https://rywalker.com/research/factory-ai (fetched, dated 2026-06)
- https://www.usagepricing.com/blueprint/factory (search result, 2026-09)
- https://www.developersdigest.tech/blog/factory-droid-review-setup-2026 (search result)
- ~/repos/market-research-clones/factory-ai/factory/README.md
- ~/repos/market-research-clones/factory-ai/factory/docs/web/software-factory.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/web/automations.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/web/missions.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/web/factory-router.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/web/getting-started/overview.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/web/getting-started/quickstart.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/web/machine-connection/cloud-templates/index.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/features/missions/overview.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/features/missions/planning.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/features/missions/reference.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/cli/features/droid-computers.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/cli/features/incident-response.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/cli/configuration/sandbox.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/cli/user-guides/auto-run.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/cli/account/security.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/cli/droid-exec/overview.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/enterprise/network-and-deployment.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/enterprise/llm-safety-and-agent-controls.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/enterprise/hierarchical-settings-and-org-control.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/enterprise/privacy-and-data-flows.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/enterprise/usage-cost-and-analytics.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/enterprise/service-accounts.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/enterprise/audit-log.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/enterprise/github-integration-security.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/integrations/linear.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/integrations/slack.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/pricing.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/models.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/changelog/1-8.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/changelog/release-notes.mdx
- ~/repos/market-research-clones/factory-ai/factory/docs/images/software-factory-dashboard.png
- ~/repos/market-research-clones/factory-ai/factory/docs/images/mission-web.png
- ~/repos/market-research-clones/factory-ai/droid-action/README.md
- ~/repos/market-research-clones/factory-ai/droid-action/src/github/token.ts
- ~/repos/market-research-clones/factory-ai/droid-action/src/github/validation/permissions.ts
- ~/repos/market-research-clones/factory-ai/droid-action/src/steward/gate.ts
- ~/repos/market-research-clones/factory-ai/droid-action/src/steward/index.ts
- ~/repos/market-research-clones/factory-ai/droid-action/src/steward/config.ts
- ~/repos/market-research-clones/factory-ai/droid-sdk-typescript/README.md
- ~/repos/market-research-clones/factory-ai/vfs/README.md
