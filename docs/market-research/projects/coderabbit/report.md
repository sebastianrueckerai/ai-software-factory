---
name: CodeRabbit
slug: coderabbit
url: https://coderabbit.ai
repo: none
category: code-review
license: proprietary
open_source: no
self_hostable: partial
hosting_model: SaaS app on GitHub, GitLab, Bitbucket Data Center and Azure DevOps, plus IDE and CLI clients. Enterprise-only self-hosted agent container (500+ seats) with bring-your-own LLM
company: CodeRabbit Inc, San Francisco Bay Area. Founded August 2023 by Harjot Gill (CEO) and Guritfaq Singh. Over 223M USD raised, 1.5B USD valuation as of the August 2026 round
maturity: Closed SaaS, no core repo to count commits against. GitHub Marketplace app live since 2023, vendor claims most-installed AI app on GitHub and GitLab, 17K customers and 6M repositories by Sep 2026, 50M USD ARR in Jul 2026 up from 25M USD end of 2025 per Sacra, shipped a CLI, Pre-Merge Checks and Security scanning as new product lines through 2026
similarity: 2
axes:
  signals_intake: 1
  control_plane: 1
  sandbox_isolation: 1
  verification: 4
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 2
  ux: 4
  reseedable_selfhost: 1
steal:
  - "Pre-merge checks live in .coderabbit.yaml with three modes (off, warning, error) tied to a request-changes workflow that blocks merge through the forge's own required-review rule, with a logged single-PR override rather than a silent bypass"
  - "@coderabbitai evaluate custom pre-merge check --name ... --instructions ... dry-runs a natural-language policy rule against the live PR before it goes into config, a cheap way to test a gate prompt before it goes live"
  - "Built-in deterministic checks (docstring coverage threshold, PR title and description shape, linked-issue and scope-creep checks) run before the expensive full LLM review, matching our own cheap-and-deterministic-first ordering"
  - "A per-plan reviews-per-hour rate limit plus a 0.25 USD per file overage charge with a user-set spending cap, a simple ceiling worth mirroring for any pay-per-artifact step in our own pipeline"
  - "IDE and CLI review clients pair directly with the coding agent CLI that wrote the change (Claude Code, Codex, Cursor CLI) so a check runs before a PR even opens, worth an equivalent pre-push hook in our own harness loop"
  - "Per-repo learnings persist reviewer feedback and get replayed into later reviews, a small step toward the project memory we admit we do not have"
differs:
  - "A custom pre-merge check's pass or fail is an LLM's verdict on a natural-language instruction, not a deterministic rule. Using this as a merge gate keeps the approve-or-deny decision inside the model, the opposite of our policy-lives-outside-the-model principle enforced in factory-gateway and network policy"
  - "The review engine is closed source, including in the Enterprise self-hosted tier, which only relocates the agent container and the Git integration. This piece of a verification plane could never be deleted and rebuilt from our own Git the way our policy YAML and gate code can"
ux_verdict: Installed once, a review appears as an ordinary PR comment within minutes of opening or pushing, with one-click-apply suggestions and no separate dashboard to learn, but large or unusual diffs draw noisy comments that independent reviews say take a team one to two weeks of .coderabbit.yaml tuning to quiet
slop_verdict: Real and heavily used, most-installed AI app on GitHub and GitLab, 50M USD ARR by mid-2026, 223M USD raised, but an independent 2026 benchmark scored it 1 of 5 on completeness and 2 of 5 on depth, and its own commit-status integration can report false "success" while rate-limited
---

# CodeRabbit

## 1. What it is

CodeRabbit is a closed-source AI code review product, sold as a GitHub, GitLab, Bitbucket Data Center and Azure DevOps app, an IDE extension (VS Code, Cursor, Windsurf) and a CLI. It reviews a pull request automatically on open and on every push, posts inline comments and committable suggestions, and since 2026 adds "Triage" (a kanban-style PR queue scored by business value and risk), "Change Stack" (semantic diffs for large PRs) and continuous dependency and secret scanning. The founders' framing, repeated across the blog and press, is that AI coding agents now produce more code than humans can review, and CodeRabbit exists to be the "quality gate" for that output.

What the marketing claims (17K customers, 6M repositories, "most installed AI app" on GitHub and GitLab) cannot be checked from outside. What the docs and public GitHub org actually show is narrower: a real, documented pre-merge check mechanism with three enforcement modes, a public .coderabbit.yaml schema used across thousands of visible open repositories, and a small set of open-source side tools (a Bash worktree manager, Claude and Codex agent skills, an ast-grep fork) that are unrelated to the closed review engine itself.

## 2. Mapping to our five planes

| Plane or principle | What CodeRabbit does | What we do | Verdict |
|---|---|---|---|
| Signals | None of our kind. Reviews trigger on PR open or push, not on an issue, alert or telemetry event. Triage reorders existing PRs, it does not create work | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task is a Forgejo issue | we lead |
| Control plane | No task registry or scheduler. State is per-PR (review, pre-merge check status, learnings), held in CodeRabbit's own SaaS database | factoryd with a Temporal workflow per task, Postgres, policy in Git | we lead |
| Worker plane | No general agent sandbox. Each review runs in an isolated environment disposed after posting comments, and Enterprise self-hosting moves the review agent container to the customer's infrastructure | One gVisor pod per task, ServiceAccount, default-deny egress | not comparable |
| Verification | Its whole product: LLM review, docstring and title checks, custom natural-language pre-merge checks, a request-changes workflow that blocks merge until resolved or explicitly overridden | Forgejo Actions, deterministic policy gates, then a stronger-model review with a strict verdict | they lead, on this plane alone |
| Merge and deploy | Blocks merge via the forge's own required-review branch rule, no deploy step of its own | Bot merge after human approval or an auto rule, Flux GitOps, staged rollout | not comparable |
| Policy outside the model | Mixed. Blocking is enforced by the forge's branch protection (code), but a custom check's verdict is itself an LLM judging a natural-language instruction | Capability rules as a Git-versioned YAML file, enforced in gateway code and network policy | we lead |
| Identity per task | A GitHub or GitLab App installed at org or repo scope, one identity for all reviews. No per-task credential | A projected ServiceAccount token per task, verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | Reviews are PR comments, a form of chat, though pre-merge check config lives in a repo file | TaskBrief in, a branch and a PR out, Git is the coordination mechanism | equal |

## 3. Architecture and stack

The review engine is entirely closed. Public evidence is limited to the documented .coderabbit.yaml schema, the CLI and IDE client binaries, and the coderabbitai GitHub org, which holds only side projects (a Bash worktree manager git-worktree-runner, Apache-2.0, 1784 stars, unrelated to review logic, plus agent skill packs and a Bitbucket integration shim). The vscode-extension repo contains only a README and issue tracker, no source. CodeRabbit's own architecture page describes an internal "Codegraph" (a deterministic dependency map of a change's blast radius) combined with an "ensemble of models and tools" for review generation, not independently verifiable.

Deployment is SaaS by default. Enterprise self-hosting (500 or more seats) ships the review agent as a container image the customer runs, connected to a self-managed Git platform through a service account, with inference sent to a customer-configured bring-your-own LLM provider. CodeRabbit states that in this mode code and PR data stay inside a customer-controlled network boundary, with inference to the chosen LLM provider as the one stated exception. No component of the control plane, scheduling or the review model itself moves off CodeRabbit's design, only where the container process executes.

## 4. UX

From zero to a first result is one GitHub or GitLab app install, no CLI setup required. The first review posts automatically on the next PR, as a normal PR comment thread with a walkthrough summary, inline suggestions with one-click apply, and (Team plan and above) a checkbox to ignore a failing pre-merge check for that PR only. The IDE extension and CLI move the same review earlier, into the editor or before a commit, paired explicitly with agent CLIs (Claude Code, Codex, Cursor CLI, Gemini) so an agent's own output gets reviewed before a human sees it. There is no equivalent to our console's kanban board across tasks, Triage is the closest thing, a queue of open PRs scored and ranked, not a view of agents at work. Intervention is PR comment commands (@coderabbitai run pre-merge checks, @coderabbitai ignore pre-merge checks), not a UI control.

## 5. Security, identity, sandbox, policy, cost

Identity is coarse: a Git-forge App installed once per org or repo, not a credential scoped to one task. Security posture is SOC 2 Type II and GDPR certified per its Trust Center (Vanta-hosted, some documents gated behind a request), with stated zero data retention for source code itself, the review runs in a disposed environment, while vector embeddings of past review feedback are retained by default unless a customer opts out. LLM calls are covered by zero-data-retention agreements with OpenAI and Anthropic per documents listed on the Trust Center. Sandboxing is per-review, not per-task, an isolated environment torn down after comments post, not a persistent agent workspace with network policy. Policy enforcement is split: a check's blocking behaviour (error mode plus the request-changes workflow) is enforced through the Git forge's branch protection, a code path, but a custom check's pass-or-fail judgement is itself an LLM evaluating a plain-English instruction, so the actual decision can sit inside the model even though the mechanism that acts on it does not. Cost control is a per-plan reviews-per-hour limit plus a metered overage (0.25 USD per file beyond plan limits, 0.40 USD per agent minute) with a spending cap the customer sets, coarser than our own per-task, per-day, per-project ledger with holds, but a real, user-facing ceiling.

## 6. What we should take from it

Narrow, copyable this month: the three-mode check (off, warning, error) paired with a request-changes workflow that blocks merge through the forge's own required-review rule rather than a bespoke status check is a cleaner shape than a simple pass or fail gate, and the single-PR, logged override (who overrode, which checks, on this PR only) is a better default than a global bypass switch. The @coderabbitai evaluate custom pre-merge check dry-run command, testing a natural-language policy rule against a live PR before saving it, is worth copying as a way to test our own stronger-model review or supervisor prompts before they gate real merges.

Broad: shifting review earlier, into the IDE and the CLI, paired directly with the coding agent that wrote the change, treats "review happens too late, at the PR stage" as a problem worth solving on its own. We currently only gate at the PR. An equivalent pre-push or pre-commit check inside our own harness loop, cheap and deterministic first, would catch issues before a branch and PR even exist, cutting wasted verification-plane cycles.

## 7. Where our philosophy differs and what that costs or buys us

CodeRabbit's custom pre-merge checks let a team write a merge-blocking rule in plain English, evaluated by an LLM on every PR. That is a direct trade against our principle that policy lives outside the model. Their approach buys speed of authoring, a policy is one sentence, not a YAML capability rule reviewed and applied by Flux, at the cost of a non-deterministic gate: the same PR could plausibly get a different verdict on a re-run, something a compiled rule cannot do.

The review engine itself, and even the Enterprise self-hosted container, is closed source. Adopting CodeRabbit for any part of our verification plane would mean depending on a component that cannot be deleted and rebuilt from our own Git the way our gate code and policy YAML can, breaking the re-seedable constraint for that slice of the pipeline. Our own stronger-model review step is slower to build and to tune, but it stays inside the boundary a full re-seed can reconstruct.

## 8. Red flags and slop assessment

CodeRabbit is real and widely deployed: 223M USD plus raised across at least three rounds (60M USD Series B September 2025 led by Scale Venture Partners and NVentures, 143M USD round August 2026 led by Atomico and Smash Capital at a 1.5B USD valuation), named enterprise customers including NVIDIA, and vendor-claimed status as the most-installed AI app on GitHub and GitLab. The Trust Center shows a SOC 2 Type II report, a pentest summary and zero-data-retention agreements with OpenAI and Anthropic, though the SOC 2 report itself is gated behind a request, not independently verified here.

Independent signal is more mixed than the funding numbers suggest. Review-site aggregation of Reddit, Hacker News and G2 feedback names noisy false positives and overly verbose comments on large PRs as the most consistent complaint, often requiring one to two weeks of .coderabbit.yaml tuning. One cited 2026 benchmark of 309 pull requests scored CodeRabbit 1 of 5 on completeness and 2 of 5 on depth, reliably catching syntax and style issues but missing intent mismatches and cross-service effects, self-reported vendor numbers are not independently validated. A specific documented footgun: the optional commit_status integration can report success for a review that never ran while CodeRabbit is rate-limited, the opposite of what a team adding it as a required check would expect.

## 9. Sources

https://coderabbit.ai, fetched 2026-09-29
https://docs.coderabbit.ai/self-hosted/overview, fetched 2026-09-29
https://docs.coderabbit.ai/, fetched 2026-09-29
https://docs.coderabbit.ai/platform-overview, attempted 2026-09-29, returned HTTP 404
https://docs.coderabbit.ai/guides/pre-merge-checks, attempted 2026-09-29, returned HTTP 404, correct path found by search is docs.coderabbit.ai/pr-reviews/pre-merge-checks
https://www.coderabbit.ai/blog/coderabbit-series-b-60-million-quality-gates-for-code-reviews, fetched 2026-09-29
https://www.coderabbit.ai/blog/pre-merge-checks-built-in-and-custom-pr-enforced, fetched 2026-09-29
https://www.coderabbit.ai/pricing, fetched 2026-09-29
https://docs.coderabbit.ai/security-and-privacy/data-privacy-and-security, attempted 2026-09-29, returned HTTP 404
WebSearch, 2026-09-29, CodeRabbit funding Series B valuation 2026
WebSearch, 2026-09-29, CodeRabbit review Hacker News criticism false positives 2026
WebSearch, 2026-09-29, CodeRabbit pre-merge checks docs coderabbit.yaml block merge status check
WebSearch, 2026-09-29, CodeRabbit SOC 2 certification trust center data retention
WebSearch, 2026-09-29, CodeRabbit founders Harjot Gill headquarters founded year
api.github.com/users/coderabbitai, 2026-09-29
api.github.com/orgs/coderabbitai/repos, 2026-09-29
api.github.com/repos/coderabbitai/vscode-extension and its /contents, 2026-09-29
api.github.com/repos/coderabbitai/git-worktree-runner and its README, 2026-09-29
api.github.com/repos/coderabbitai/coderabbit-pr-review, 2026-09-29
