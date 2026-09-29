---
name: Continue
slug: continue-dev
url: https://continue.dev
repo: https://github.com/continuedev/continue
category: factory-orchestrator
license: Apache-2.0
open_source: yes
self_hostable: partial
hosting_model: CLI and IDE extensions run fully local or inside your own CI; the Mission Control orchestration layer (tasks, triggers, secrets, metrics) was cloud SaaS only at api.continue.dev, now shut down
company: Continue Dev, Inc, San Francisco, YC S23, founded June 2023 by Ty Dunn and Nate Sesti, about 9 employees, roughly 5.1M USD raised (Heavybit, Y Combinator), acquired by Cursor (SpaceX-owned) around 2026-06-23
maturity: about 36k GitHub stars, 5.4k forks, first commit 2023, last commit 2026-07-20 (5522c6f), README states the repository "is no longer actively maintained and is read-only for all users", no release cadence going forward
similarity: 2
axes:
  signals_intake: 3
  control_plane: 1
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 0
  ux: 4
  reseedable_selfhost: 1
steal:
  - "Three-tier tool permission model (allow, ask, exclude) with glob argument matching per call, e.g. Write(**/*.ts), stored in ~/.continue/permissions.yaml and overridable by CLI flags or a mode (extensions/cli/src/permissions, ToolPermissionService.ts) - more granular than a single capability class"
  - "Headless-mode default: any tool at ask is silently excluded rather than blocking, so an unattended run degrades safely with no human to approve (docs/cli/headless-mode.mdx) - worth checking our worker does the same when a step needs approval it cannot get"
  - "Org secrets are referenced as a mustache-style secrets.NAME token and resolved server-side; model calls are proxied through api.continue.dev so the raw key never reaches the IDE or CLI process - same shape as our gateway-holds-the-key principle, a useful external validation of the pattern"
  - "Per-run Session record (summary, diff, logs) plus a personal Inbox of PRs awaiting review is a concrete, buildable UX target for our console's missing diff view"
  - "Intervention Rate, the percentage of agent-generated output that needed a human edit before merge, is a simple outcome metric we do not track yet and could add cheaply to our audit trail"
  - "Trigger breadth in one abstraction: cron, webhook, GitHub issue, Sentry alert and Slack message all start the same kind of agent run, a wider signals surface than our Forgejo-plus-SigNoz-only intake"
  - "PR review runs the agent inside a forked process against a git worktree copy of the repo (extensions/cli/src/commands/review/reviewWorker.ts) - a cheap, dependency-free way to isolate a review pass without a full sandbox, useful for low-stakes internal tooling"
differs:
  - "An agent run is a stateless prompt-plus-tools trigger with no pre-flight policy or budget gate; the model can be handed an allow-all flag and go. Our control plane checks capability, budget and approval state before a task's sandbox is even created. Copying Continue's trigger-then-run shape would break policy-outside-the-model, since nothing stops a run before it starts."
  - "No published sandbox for cloud agents (Mission Control) and no sandbox at all for local CLI runs by design, it is a developer's own machine or their own CI. Adopting that would break our default-deny, gVisor-per-task constraint outright; it is not a gap to close, it is a different problem (personal tool vs multi-tenant factory)."
  - "No budget primitives anywhere in the product: pricing is bring-your-own-key with an optional per-seat SaaS fee, no per-task hold, no spend ledger. This is not a lesson to take, it reflects that a human always pays and approves per session, which our largely-autonomous design does not have."
ux_verdict: Zero to a first agent response is three commands (install, cd project, run cn, log in or paste a key) and the TUI/headless split is clean, genuinely faster onboarding than our console, but nothing public shows a live multi-agent view or a stop button for a run already in progress
slop_verdict: Was real and used in anger, 36k stars, YC-backed, paying enterprise customers, a genuine TypeScript agent runtime, not a landing page. It is dead now, acquired by Cursor in June 2026, repository frozen read-only, cloud data deleted after the 2026-07-15 export deadline, no future patches
---

# Continue

## 1. What it is

Continue was an open-source coding agent shipped as a VS Code extension, a JetBrains plugin and a terminal CLI (cn), built by Continue Dev, Inc, a 2023 Y Combinator company. It later added Mission Control, a cloud dashboard billed as "the orchestration layer on top" of the open-source agent, comparing itself to how GitHub sits on top of Git: cloud agents running in parallel, triggered by events, opening PRs for review. The makers claimed it let developers "create and share custom AI coding assistants" and, later, that Mission Control let teams "automate developer work in two clicks."

The repository and docs actually show a working, non-trivial monorepo (core/, extensions/vscode, extensions/intellij, extensions/cli, gui/, packages/*) with a real tool-permission system, MCP support and dozens of model provider adapters, not a thin wrapper. Cursor acquired the company around 2026-06-23; the deal was reported as an acqui-hire, the product was discontinued, and the GitHub README now states the repository "is no longer actively maintained and is read-only for all users."

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Mission Control triggers: cron schedule, webhook, GitHub issue, Sentry alert, Slack message, all starting the same kind of agent run | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API; every task is a Forgejo issue | equal |
| Control plane | Closed-source: a Session per run with summary, diff and logs, recorded in Continue's cloud; no published workflow engine, scheduler or pre-run approval gate | factoryd with one Temporal workflow per task, Postgres, capability and budget checks before a sandbox is created | we lead |
| Worker plane | cn CLI process; local runs are unsandboxed on the developer's own machine, cloud (Mission Control) execution environment is undocumented | One gVisor pod, namespace and ServiceAccount per task, read-only root FS, default-deny egress | we lead |
| Verification | "AI Checks" as a PR check, a review command that runs the agent in a forked process against a git worktree diff, an Intervention Rate metric measured after the fact | Forgejo Actions on untrusted gVisor runners, policy gates by risk class, reproduction gate, stronger-model review with a strict verdict before merge | we lead |
| Merge and deploy | Docs recommend keeping human approval before merge; nothing published on auto-merge, staged rollout or deploy | Bot merge after human approval or an auto rule, Flux deploy, staged rollout with an alert-free wait | we lead |
| Policy outside the model | Tool permissions (allow/ask/exclude) are enforced in the CLI's own code, not the prompt, with a persistent permissions.yaml | Capability rules as a document in Git, enforced in gateway code and network policy | equal |
| Identity per task | Fixed org or user secrets, proxied through api.continue.dev so raw keys stay server-side, but the same secret is reused across every run, not rotated per task | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, exchanged for a per-task LiteLLM virtual key | we lead |
| Artifacts not chat | The PR is the artifact; a Session record and an Inbox exist, but Slack messages and GitHub comments also feed the agent directly | TaskBrief in, a branch, a PR and a normalised event stream out | equal |

## 3. Architecture and stack

TypeScript monorepo. core/ holds the shared agent logic including core/llm/llms (one adapter file per model provider, plus a separate packages/openai-adapters package), core/tools, core/indexing and core/config. extensions/cli is the open-source cn binary (published as @continuedev/cli): src/permissions and src/services/ToolPermissionService.ts implement the allow/ask/exclude policy engine, src/subagent spawns nested agent runs, src/commands/review/reviewWorker.ts forks a child process that runs the agent against a git worktree copy of the diff and reports a patch back over IPC. configLoader.ts and hubLoader.ts pull shared assistant configs from the Continue Hub. extensions/vscode and extensions/intellij are the IDE integrations; the README recommends the CLI over the JetBrains plugin now.

Mission Control itself (the task/workflow/trigger backend, secrets store, metrics) is not in this repository: it lived behind api.continue.dev and continue.dev/agents, closed source. Nothing in the public code shows how task state was persisted, how triggers were scheduled, or how cloud agent compute was isolated - this whole layer is inference from docs and blog posts, marked as such, and is now offline. package.json at the repo root lists almost no direct dependencies (@ai-sdk/deepseek is the only one), consistent with most of the real dependency graph living in per-package package.json files under workspaces.

## 4. UX

Onboarding (docs/cli/quickstart.mdx): install the CLI, cd into a project, run cn, then log in with a Continue account or paste an Anthropic key. That is three commands to a first interactive session. Two modes: an interactive TUI (approve tool calls, switch modes with Shift+Tab) and headless mode (cn -p "prompt") for scripts, CI and git hooks, with a JSON output flag for structured output and a resume flag to replay a session non-interactively.

Mission Control (now dead) added a web UI: a Tasks tab for one-off prompts, an Agents page to create and edit cloud agents, an Inbox of PRs awaiting review, and a Metrics view (workflow runs, PR output, Intervention Rate, time from alert to fix PR). That is a more complete watch-and-approve surface than our console currently has (no diff view, no per-task trace UI yet), though nothing public shows a live, in-progress view of an agent mid-run, only a completed Session record afterward.

## 5. Security, identity, sandbox, policy, cost

Identity: org and user secrets are stored by Mission Control and referenced by a templating syntax; LLM calls are proxied through api.continue.dev so a raw provider key never reaches the IDE or CLI process for org secrets. The same secret is shared across every run and every team member with access, not scoped to one task or rotated.

Sandbox: local and headless cn runs are unsandboxed by design, they execute with the permissions of the invoking user or CI job. The review command isolates itself only as far as a git worktree and a forked process. No public documentation describes how Mission Control's cloud agents were isolated (container, VM or microVM) or what network egress they had; this is explicitly not verified.

Policy: the allow/ask/exclude tool-permission system is enforced in the CLI's own TypeScript code, a real code-level policy layer, but it is scoped to tool calls on one machine, not to network egress or spend. Continue's own "Operating Cloud Agents Safely" guide is process advice (least privilege, no silent writes to main, human approval before merge), not a technical control.

Cost: no budgets, holds or spend ledger anywhere in the product. Pricing was bring-your-own-API-key for solo use, a per-seat fee for team features. A GitHub issue (#8533) noted the docs never fully explained the on-premise proxy option for secrets, a sign the enterprise story was thin even before the shutdown.

## 6. What we should take from it

Narrow: the allow/ask/exclude permission model with glob argument matching (for example Write matched only against **/*.ts) and a persisted permissions.yaml is a small, concrete design worth comparing against our single coder capability class as we add more classes. The headless-mode rule (an ask tool becomes exclude when no human can answer) is a one-line guard our worker's supervisor logic should also apply explicitly rather than assume. Intervention Rate is cheap to compute from our own PR history (auto-merged vs human-edited-before-merge) and worth adding to the cost/audit view.

Broad: the Session-plus-Inbox UX pattern (one page per run with summary, diff and logs; a personal queue of PRs to review) is a good next build for our console's stated weakness of no diff view. The trigger breadth (cron, webhook, Slack, GitHub issue, alert, all normalised to the same run) argues for widening our signals plane beyond Forgejo and SigNoz once a second forge or chat surface matters.

## 7. Where our philosophy differs and what that costs or buys us

Continue let an agent run start on a trigger with no pre-flight capability or budget check, trusting allow flags and org secret scoping instead. Our design checks capability, budget and approval state before a sandbox is ever created, which is more machinery but means a prompt cannot argue its way into a capability it was not granted; Continue's docs implicitly concede this by pushing safety onto process advice ("give the smallest permission set") rather than a gate.

Continue's local CLI has no sandbox at all, by design: it is a tool a developer runs on their own machine or their own CI, so isolation is the user's problem. Our worker plane assumes every run is untrusted and gives it a disposable gVisor pod with default-deny egress. Copying Continue's model would break that constraint; the difference exists because the two products solve different problems, not because either design is wrong for its purpose.

Neither product needed a spend ledger while a human held the API key and paid directly. Our largely-autonomous loop cannot rely on that, so a hard-capped budget with holds and a ledger is a cost our constraint forces and Continue's never had to pay.

## 8. Red flags and slop assessment

The product is discontinued. Cursor (itself acquired by SpaceX in 2026) bought Continue Dev, Inc around 2026-06-23; multiple outlets (The New Stack, Dealroom, DEV Community) describe it as a quiet acqui-hire that shut the product down and handed the codebase to the community. The GitHub README confirms this directly: final 2.0.0 release, repository "no longer actively maintained and is read-only for all users." Recurring billing was turned off, and cloud data (Mission Control configs, hub secrets) was deleted after a 2026-07-15 export deadline that has passed. The last commit is 5522c6f4, 2026-07-20, removing the sign-in link after the login flow was retired.

This is not a thin project: it reached roughly 36k GitHub stars and 5.4k forks, went through Y Combinator (Summer 2023), raised about 5.1M USD from Heavybit and others, and press coverage names Ionos, Siemens and Morningstar as users before the shutdown. The code (Apache 2.0) still runs and can be forked, but it will drift from provider APIs with no upstream fixes. Mission Control, the part of the product closest to our factory-orchestrator category, is entirely gone; everything in sections 2 to 6 above about it is reconstructed from docs and blog posts that may themselves disappear.

## 9. Sources

- /home/womb/repos/market-research-clones/continue-dev (shallow clone, HEAD 5522c6f4, 2026-07-20)
- /home/womb/repos/market-research-clones/continue-dev/README.md
- /home/womb/repos/market-research-clones/continue-dev/package.json
- /home/womb/repos/market-research-clones/continue-dev/docs/cli/quickstart.mdx
- /home/womb/repos/market-research-clones/continue-dev/docs/cli/headless-mode.mdx
- /home/womb/repos/market-research-clones/continue-dev/docs/cli/tool-permissions.mdx
- /home/womb/repos/market-research-clones/continue-dev/extensions/cli/src/services/ToolPermissionService.ts
- /home/womb/repos/market-research-clones/continue-dev/extensions/cli/src/commands/review/reviewWorker.ts
- /home/womb/repos/market-research-clones/continue-dev/.continue/agents (breaking-change-detector.md, dependency-security-review.md, error-message-quality.md, input-validation.md, test-coverage.md)
- /home/womb/repos/market-research-clones/continue-dev/core/llm/llms, core/tools, core/config (directory layout only)
- https://continue.dev (fetched 2026-09-29, via WebFetch)
- https://docs.continue.dev/overview (fetched 2026-09-29, via WebFetch, redirects, no content captured)
- https://docs.continue.dev/mission-control (attempted 2026-09-29, via WebFetch, returned 404, product shut down)
- gh api repos/continuedev/continue (2026-09-29), failed, GitHub API rate limit exceeded for this account; stars and fork counts instead come from web sources below
- WebSearch: "Continue.dev continuedev shutting down 2026 no longer maintained" (2026-09-29)
- WebSearch: "Continue.dev mission control continuous AI agents dashboard" (2026-09-29)
- WebSearch: "Continue.dev Mission Control architecture credentials secrets sandbox cloud agent execution" (2026-09-29)
- WebSearch: "continuedev/continue github stars count" (2026-09-29)
- WebSearch: "Continue Dev Inc funding raised seed round headquarters founded 2023" (2026-09-29)
- https://thenewstack.io/cursor-acquires-continue-coding/ (referenced via search snippet, 2026-09-29)
- https://blog.continue.dev/from-extension-to-mission-control (referenced via search snippet, 2026-09-29)
