---
name: GitHub Copilot cloud agent and Agent HQ
slug: github-agent-hq
url: https://github.com/features/copilot
repo: none
category: forge-integrated
license: proprietary
open_source: no
self_hostable: no
hosting_model: SaaS only. Cloud agent runs on GitHub-hosted Actions runners, sandboxed inside Azure Container Apps Sandboxes.
company: GitHub, a Microsoft subsidiary. San Francisco. Founded 2008, acquired by Microsoft in 2018.
maturity: 'no public product repo, this is a hosted feature not an open project. Docs source repo github/docs: 20.9k stars, CC-BY-4.0, created 2019-05-31, pushed 2026-09-29. Community repo github/awesome-copilot: 39.5k stars, 5018 forks, MIT, created 2025-06-11, pushed 2026-09-29, 69 open issues. Cloud agent (formerly "Copilot coding agent") reached general availability in 2025. Agent HQ announced at GitHub Universe, October 2025. Copilot code review went agentic in March 2026.'
similarity: 3
axes:
  signals_intake: 4
  control_plane: 2
  sandbox_isolation: 4
  verification: 3
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 1
  ux: 5
  reseedable_selfhost: 0
steal:
  - "Org/repo two-tier firewall override (Enabled / Disabled / Let repositories decide), configurable independently per agent surface"
  - "copilot-setup-steps.yml: one named job, a narrow honoured key set, hard 59-minute cap, as a deterministic worker bootstrap file"
  - "Hooks taxonomy (sessionStart, preToolUse allow/deny, postToolUse, agentStop, errorOccurred) as minimal, scriptable lifecycle instrumentation"
  - "Custom Agents precedence (repo overrides org overrides enterprise), resolved by simple file lookup, for shared but overridable agent profiles"
  - "Agents panel pattern: one running-session view, natural-language session search, live steering, stop, archive, share link"
  - "Automation rationale/confidence autonomy dial paired with an explicit not-a-security-boundary warning in the UI"
  - "Multi-channel intake (issue assignment, PR @mention, scheduled automation) beyond issue-or-telemetry-only"
differs:
  - "Everything runs inside one vendor's SaaS on GitHub-hosted Actions and Azure, no self-hosted path, breaks our reseedable and commodity-hardware constraint if copied wholesale"
  - "Identity is org or repo scoped, long-lived secrets exposed as plain environment variables, close to the opposite of identity belonging to the task with short-lived credentials"
  - "Cost control lives at the subscription and billing-cycle layer, not per task, with no hard per-task cap or spend ledger"
ux_verdict: Best-in-class session UX, live steering, natural-language session search, multi-surface reach, well ahead of our undesigned console.
slop_verdict: Real and actively maintained, but "Agent HQ" is a marketing umbrella ahead of the shipped surface. Only Claude and Codex are confirmed third-party agents. Jules and Devin remain unconfirmed despite the October 2025 announcement naming them.
---

# GitHub Copilot cloud agent and Agent HQ

## 1. What it is

GitHub sells this as the industry's control point for AI coding agents, not as a single agent. Two products matter for this comparison: the Copilot cloud agent, an autonomous pull-request-writing agent formerly called "Copilot coding agent", and Agent HQ, a name for a set of UI and governance features that let several agents run side by side inside GitHub.

GitHub's claim from the October 2025 Universe announcement was broad. Agents from Anthropic, OpenAI, Google, Cognition and xAI would become assignable inside GitHub "over the coming months" (github.blog/news-insights/company-news/welcome-home-agents/). What the docs corpus actually shows, in the 2026-09-28 snapshot of github/docs, is narrower. `content/copilot/concepts/agents/about-third-party-coding-agents.md` names only Claude and Codex as shipped third-party agents, both in public preview. Google's Jules and Cognition's Devin do not appear anywhere in the docs tree.

Independent search confirms the gap. Grok has shipped as a selectable model inside Copilot (Grok 4.5 in July 2026, 4.6 in August, 4.7 in September 2026) but not as an agent with its own identity in the agents panel. No official GitHub changelog entry confirms Jules or Devin as native agents as of September 2026, despite Cognition's own October 2025 post naming itself a "launch partner" for Devin.

The term "Agent HQ" never appears in the technical docs. Every doc file calls the feature "the agents panel", "the Agents tab", or `github.com/copilot/agents`. GitHub is selling a platform story while shipping a narrower, GitHub-plus-two-partners product.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Issue assignment, @mention on a PR, chat, and Automations triggered by schedule or issue/PR events. No telemetry or alert intake. | Issues, telemetry and alerts feed a control plane. | Not comparable: they cover more forge-native triggers, we cover more operational signals. |
| Control plane | No single durable task store. Each session is a GitHub Actions run plus a PR or session record. Scheduling is Actions' own. Org and enterprise policy pages gate features per agent type. Automations are private to their creator with no shared queue. | Durable task state, scheduler, policy, approvals, spend and audit in one system. | We lead: our design centralises the task lifecycle, theirs is scattered across settings pages and per-repo Actions runs. |
| Worker plane (sandbox) | Ephemeral GitHub Actions job. Local MXC sandbox (Seatbelt, bubblewrap, ProcessContainer) or Azure Container Apps Sandboxes for the cloud tier. Egress firewall on by default, allowlist based, independently configurable for the cloud agent and for code review. | gVisor sandbox, single tier, documented in our own notes as slow to provision. | They lead: two named, documented isolation tiers and a mature firewall product, ours is one tier and known slow. |
| Verification | Copilot code review (agentic since March 2026), required status checks, branch protection, the agent cannot approve or merge its own PR. | CI, gates, stronger-model review before merge. | Roughly equal: both gate on human or tooled review before merge. |
| Merge and deploy | Agent opens a draft PR, a human reviews and merges. No agent-initiated auto-merge found in the docs. | Verification plane feeds merge and deploy, ceiling not yet defined for auto-merge either. | Roughly equal: both leave the final merge decision outside the agent. |
| Policy outside the model | Firewall enforced at the network layer inside the Actions appliance. Hooks are synchronous shell scripts, not model calls; `preToolUse` can deny a tool call outright. Automation approval levels are documented as "a workflow convenience, not a security control." | Policy lives outside the LLM, for example Kubernetes RBAC and network policy. | Equal in principle: GitHub's own docs state the same principle we hold, then hand you real enforcement points to use it. |
| Identity per task | Secrets and variables are org or repo scoped, long-lived, exposed to the agent's shell as plain environment variables. No task-scoped, short-lived credential model documented. | Short-lived, task-scoped credentials. Identity belongs to the task, not the machine. | We lead: this is close to the opposite of our identity-per-task principle. |
| Artifacts not chat | Custom Agents are versioned YAML files in Git. Agent output is a PR diff. Automations, by contrast, are explicitly "not committed to Git" and exist only as scheduled configuration. | Agents exchange artifacts, not chat. | Mixed: agent profiles and PRs are artifacts, automations configuration is not. |

## 3. Architecture and stack

This is a set of features built on top of GitHub Actions and GitHub's own hosting, not a separate system. There is no scheduler, database or agent-runtime repository to read, because none is public. Everything below comes from GitHub's own documentation source, `github/docs`, `content/copilot/` tree, sparse-checked-out at commit `f4e8afc` (2026-09-28), not from a product repository, because none exists.

The cloud agent runs inside a GitHub Actions workflow that the platform manages. Users do not see or edit that workflow YAML. `.github/workflows/copilot-setup-steps.yml`, if present in the repository, is the one hook a user gets into that job. Its `steps`, `permissions`, `runs-on`, `services`, `snapshot` and `timeout-minutes` keys are honoured (`timeout-minutes` maxes at 59, which is also the hard session cap). Anything else in the file is ignored, and `fetch-depth` is always overridden by the platform (`how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment.md`).

Sandboxing is two-tiered (`concepts/security-governance-and-network-settings/about-cloud-and-local-sandboxes.md`). Local sandboxing is Microsoft's own eXecution Container (MXC), OS-level and lighter-weight than a VM or container: Seatbelt on macOS, bubblewrap on Linux, a ProcessContainer/BaseContainer pair on Windows. Cloud sandboxing for the hosted agent is built on Azure Container Apps Sandboxes, billed per compute-second, memory GiB-second and storage GiB-month, all closed Azure infrastructure.

Egress is controlled by a firewall (`how-tos/copilot-on-github/customize-copilot/customize-the-firewall.md`), on by default, allowlist based, configurable independently for the cloud agent and for code review, at both org and repo level, defaulting to "let repositories decide". Its own docs list three limitations verbatim: it only covers processes the agent starts via its Bash tool, not MCP server processes and not setup-step processes; it only operates inside the Actions appliance; and "sophisticated attacks may bypass the firewall." The docs conclude, word for word: "these limitations mean that the firewall provides protection for common scenarios, but should not be considered a comprehensive security solution."

Custom Agents (`reference/custom-agents-configuration.md`) are Markdown files with YAML front matter (`name`, `description`, `target`, `tools`, `model`, `disable-model-invocation`, `user-invocable`, `mcp-servers`, `metadata`), versioned by Git commit SHA, resolved with repo-over-org-over-enterprise precedence, and using a tool-alias naming convention the docs describe as compatible with Claude Code's own tool names.

Hooks (`concepts/agents/hooks.md`) are synchronous shell commands declared in `.github/hooks/*.json`, firing on `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse` (can approve or deny the call), `postToolUse`, `agentStop`, `subagentStop` and `errorOccurred`. The docs are explicit these are deterministic scripts, not a model-based supervisor.

Model routing is a subscription concept, not a task concept. Pro is $10/month for 300 premium requests, Pro+ is $21/month for 1,500, Business is $19/user, Enterprise is $39/user. Each third-party agent session (Claude or Codex) currently counts as one premium request during public preview, formal per-session pricing is not yet set (`concepts/agents/about-third-party-coding-agents.md`).

## 4. UX

This is the strongest part of the product, and clearly ahead of anything we have designed.

From zero to a first agent PR: open an issue and assign it to Copilot, or type `@copilot` in a PR comment, or set up an Automation to do either on a trigger. That is one or two clicks once Copilot is enabled for the repository, no separate console or CLI login needed (`how-tos/copilot-on-github/use-copilot-agents/manage-and-track-agents.md`). Not verified: the exact look of the initial repository setup screen, this was read from docs markdown, not rendered pages or screenshots.

While an agent works, a user watches from the Agents panel (`github.com/copilot/agents`): a live session log with tool calls, a session overview, and the ability to search past sessions in natural language, for example "find the session that touched the auth module". A user can steer the agent mid-session with a comment, stop it, archive a session, or share a session link with a teammate. Sessions are continuous with Copilot Chat, so a conversation can move from chat into an autonomous session and back.

The agent's output is always a draft pull request. A human reviews and merges. The agent cannot approve or merge its own PR, enforced by branch protection rules, not by the agent's own restraint.

Multi-surface reach is real: the same agents panel is reachable from github.com, VS Code, JetBrains IDEs, Eclipse, Xcode, the GitHub mobile app and the Copilot CLI (`concepts/agents/index.md`, `concepts/agents/cloud-agent/about-custom-agents.md`).

Automations add a second UX layer worth separating out. A repo owner can set a rationale and confidence "automation level" (Full control, Cautious, Balanced, Full automation) that decides whether a triage or fix suggestion auto-applies or waits for review. The docs are blunt about its limits: "Approvals are a workflow convenience, not a security control ... Use repository and agent permissions, not approvals, to control what a Copilot automation is allowed to do" (`concepts/agents/cloud-agent/about-automation-rationale-and-approvals.md`). That is a good UX idea paired with an honest warning label, worth copying both halves of.

Independent reviews complicate the polish story. A widely read GitHub community discussion (github.com/orgs/community/discussions/198015, June 2026) reports unpredictable, fast-draining premium-request consumption after a June 2026 pricing change, with "no way to know how much a task will cost before running it." G2 reviewers and a January 2026 report describe 90-plus second cold-start latency for the web agent, sometimes repeating 10 to 20 times per session before a task completes.

## 5. Security, identity, sandbox, policy, cost

Security is enforced in code at two points: the sandbox boundary (MXC locally, Azure Container Apps Sandboxes in the cloud) and the egress firewall. Both are documented with named limitations rather than sold as complete. `concepts/security-governance-and-network-settings/risks-and-mitigations.md` reads like a real threat model, matching prompt injection, secret leakage and supply-chain risks to specific mitigations, not marketing copy.

Identity is the weakest area relative to our design. Agents secrets and variables (`how-tos/copilot-on-github/customize-cloud-agent/configure-secrets-and-variables.md`) are org or repo scoped and, apart from the `COPILOT_MCP_`-prefixed subset reserved for MCP servers, are exposed to the agent's shell as plain environment variables. They sit in a separate namespace from Actions, Codespaces and Dependabot secrets, but the model is still a long-lived, broadly-scoped secret handed to a process, not a short-lived credential minted per task and bound to that task's identity. Nothing in the docs describes token exchange, audience restriction or per-session credential rotation.

Sandbox internet access defaults on, through the firewall described above. An org or repo owner can disable the firewall entirely, with a docs warning that doing so "will allow Copilot to connect to any host, increasing risks of exfiltration of code or other sensitive information." MCP server processes are explicitly outside the firewall's reach.

Policy is enforced through GitHub's enterprise "AI Controls" dashboard (`concepts/enterprise/agent-management.md`) and matching org and repo settings pages: per-agent-type enablement (disabling the cloud agent does not disable third-party agents or code review), agent session visibility and an audit log, MCP server allow and block lists with a registry, and an enterprise-managed settings file. This is real policy outside the model, comparable in spirit to our own principle, spread across several settings screens rather than one file.

Cost is entirely a subscription and billing-cycle concept, not a per-task one. Budgets (`tutorials/budgets/index.md`, `tutorials/budgets/getting-started-with-budget-controls.md`) are universal, cost-centre or individual-user budgets against organisation or enterprise spend, with an opt-in hard-stop toggle at the enterprise spending-limit level. There is no per-task budget, no per-task spend ledger, and no way to cap what a single agent session may cost before it runs. The June 2026 community backlash cited above is a direct symptom of that gap.

## 6. What we should take from it

Narrow, copyable this month:

The org and repo two-tier firewall override, "Enabled / Disabled / Let repositories decide", independently for each agent surface, is a small policy shape worth copying for our own egress control, cheaper to build than it sounds.

`copilot-setup-steps.yml`'s narrow set of respected keys (`steps`, `permissions`, `runs-on`, `services`, `snapshot`, `timeout-minutes`) is a good model for a deterministic, auditable worker bootstrap file: name one job, ignore everything else in the file, cap its runtime.

The hooks taxonomy (`sessionStart`, `preToolUse` with allow or deny, `postToolUse`, `agentStop`, `errorOccurred`) is a minimal, ready-made set of lifecycle points worth mirroring in our own worker plane instrumentation, small enough to implement in a week.

The Custom Agents precedence rule, repo overrides org overrides enterprise, resolved by a simple file lookup, is a cheap way to let a task-owning team refine a shared agent profile without forking it.

Broad, product shape and priorities:

The Agents panel's natural-language session search and live steering, comment while it runs, stop, archive, share a link, is the single biggest UX gap between GitHub and our undesigned console. We do not need their scale to copy the interaction pattern: one running-session view, one intervention box, one share link.

The automation rationale and confidence dial, paired with an explicit "this is not a security boundary" warning, is worth taking as a pattern: separate the autonomy dial a user turns from the permission wall a policy engine enforces, and say so out loud in the UI, not only in docs.

Multi-channel intake, issue assignment, PR mention, chat, scheduled automation, covers more of "how does work start" than our current issue-and-telemetry-only intake. Adding a PR-mention and a scheduled-trigger intake path is a small addition with a real payoff, directly answering one item on our own weak list, the absence of spec-driven or varied intake.

## 7. Where our philosophy differs and what that costs or buys us

The biggest difference: GitHub collapses task execution, policy enforcement and identity into one vendor's single-tenant SaaS, running on GitHub-hosted Actions runners inside Azure. That buys them a good UX at zero infrastructure cost to the user, and a firewall and sandbox they can afford to build once and refine continuously. It costs them, and would cost us if copied, exactly what our reseedable, self-hosted, commodity-hardware constraint rules out: none of this runs anywhere but GitHub's own cloud, there is no self-hosted deployment path in the docs, and GHES (self-hosted GitHub) support for the cloud agent is not documented in this corpus, not verified.

Second: identity belongs to the org and the repo, not the task. Our principle that identity belongs to the task, with short-lived credentials, is close to the opposite of GitHub's plain-env-var, repo-scoped secrets model. Copying their model would be a straightforward regression against our own principle. Keeping ours means more plumbing, token minting and audience binding per task, that GitHub does not need to build because it is not trying to hold that line.

Third: cost control at the subscription layer, not the task layer, is a real product decision, not an oversight. It works for GitHub because premium-request accounting is cheap to build against an existing billing system. It would not satisfy our own requirement for hard per-task caps with holds. The June 2026 "credits drain unpredictably" backlash is evidence of what happens without a per-task ledger, and it is a gap we should not import even though it would be the cheaper build.

## 8. Red flags and slop assessment

Real and maintained: the docs repo, github/docs, was pushed the same day as this report. The community repo, github/awesome-copilot, has 39.5k stars and 5,018 forks and was also pushed the same day. GitHub's own blog publishes honest post-mortems, for example "Better tools made Copilot code review worse. Here's how we actually improved it." (github.blog, July 2026), which describes a real regression GitHub introduced and fixed, not a marketing piece.

Marketing ahead of shipped product: "Agent HQ" is a name that does not appear once in the technical docs corpus, where the same feature is called "the agents panel". The October 2025 Universe announcement named Google, Cognition and xAI as agents coming to the platform. As of this snapshot only Anthropic's Claude and OpenAI's Codex have shipped as agents, Grok has shipped only as a selectable model, and no official GitHub source confirms Jules or Devin as native agents, despite Cognition's own October 2025 post calling itself a "launch partner". Third-party guides, for example andrew.ooo, April 2026, claim broader availability than official docs or changelog entries support, treat those specific claims as unconfirmed.

Cost and reliability complaints are documented by users, not only by critics: a June 2026 GitHub community discussion (github.com/orgs/community/discussions/198015) reports unpredictable premium-request consumption after a pricing change, and multiple independent reviews (G2, a January 2026 report, Netguru's 30-plus codebase evaluation) describe slow cold starts and degraded quality once a change spans more than a handful of files.

No lock-in in the legal sense, this is a subscription SaaS feature with no separate licence to watch, but there is complete platform lock-in: none of it runs outside GitHub's own infrastructure, and there is nothing to self-host.

## 9. Sources

https://github.com/features/copilot
https://docs.github.com/en/copilot
https://github.blog/news-insights/company-news/welcome-home-agents/ (Agent HQ announcement, October 2025)
https://github.blog/ai-and-ml/github-copilot/better-tools-made-copilot-code-review-worse-heres-how-we-actually-improved-it/ (July 2026)
https://github.blog/changelog/2026-07-28-grok-4-5-is-now-available-in-github-copilot/
https://github.blog/changelog/2026-08-14-grok-4-6-is-now-available-in-github-copilot/
https://github.blog/changelog/2026-09-21-grok-4-7-is-now-available-in-github-copilot/
https://github.com/orgs/community/discussions/198015 (premium request cost complaints, June 2026)
https://www.g2.com/products/github-copilot/reviews
https://www.netguru.com/blog/github-copilot
https://x.com/cognition/status/1983251389473271887 (Devin "launch partner" claim, October 2025)
https://thenewstack.io/github-embraces-the-coding-agent-competition-with-agent-hq/
https://www.directionsonmicrosoft.com/reports/github-agent-hq-brings-agent-governance-third-party-support/
https://andrew.ooo/answers/how-to-use-github-agent-hq-2026/ (unofficial, claims not confirmed elsewhere)
gh api repos/github/awesome-copilot (stars, forks, licence, dates, open issues)
gh api repos/github/docs (stars, licence, dates)
Clone: ~/repos/market-research-clones/github-agent-hq, sparse partial clone of https://github.com/github/docs, HEAD f4e8afc6979acd8de6b5da035066281b9a5f4025, 2026-09-28
content/copilot/concepts/agents/index.md
content/copilot/concepts/agents/cloud-agent/about-cloud-agent.md
content/copilot/concepts/agents/cloud-agent/about-automations.md
content/copilot/concepts/agents/cloud-agent/about-automation-rationale-and-approvals.md
content/copilot/concepts/agents/cloud-agent/about-custom-agents.md
content/copilot/concepts/agents/about-third-party-coding-agents.md
content/copilot/concepts/agents/anthropic-claude.md
content/copilot/concepts/agents/openai-codex.md
content/copilot/concepts/agents/hooks.md
content/copilot/concepts/agents/code-review.md
content/copilot/concepts/agents/about-github-agentic-workflows.md
content/copilot/concepts/security-governance-and-network-settings/about-cloud-and-local-sandboxes.md
content/copilot/concepts/security-governance-and-network-settings/risks-and-mitigations.md
content/copilot/concepts/security-governance-and-network-settings/network-settings.md
content/copilot/concepts/enterprise/agent-management.md
content/copilot/concepts/enterprise/cloud-agent-access.md
content/copilot/reference/custom-agents-configuration.md
content/copilot/tutorials/budgets/index.md
content/copilot/tutorials/budgets/getting-started-with-budget-controls.md
content/copilot/how-tos/copilot-on-github/customize-cloud-agent/configure-secrets-and-variables.md
content/copilot/how-tos/copilot-on-github/customize-copilot/customize-the-firewall.md
content/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment.md
content/copilot/how-tos/copilot-on-github/use-copilot-agents/manage-and-track-agents.md
WebSearch: GitHub Agent HQ Jules Devin Grok third-party agents status September 2026 (2026-09-29)
WebSearch: GitHub Copilot coding agent review criticism 2026 (2026-09-29)
