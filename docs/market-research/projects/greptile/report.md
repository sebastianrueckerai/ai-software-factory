---
name: Greptile
slug: greptile
url: https://greptile.com
repo: none
category: code-review
license: proprietary
open_source: no
self_hostable: partial
hosting_model: cloud SaaS by default, on-prem or bring-your-own-cloud offered to enterprise customers on request
company: Tabnam Inc, San Francisco. Founded 2023 by three Georgia Tech CS graduates (Daksh Gupta, CEO; Soohoon Choi; Vaishant Kameswaran). YC W24. Seed 4.1M USD (Initialized Capital, Jun 2024). Series A led by Benchmark, about 180M USD valuation (Sep 2025)
maturity: no public repo, so no stars or contributor count. v3 shipped with the Series A (Sep 2025), v4 "most significant update" in early 2026. Vendor claims range from 2,000 to 22,000+ customer teams depending on the source and date
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 1
  verification: 3
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 2
steal:
  - Build a dependency graph (files, functions, classes, call edges) before review starts, so the reviewer sees callers outside the diff, not just the patch. Our review-frontier step could take the same graph as extra context.
  - Feed a model the team's own past PR review comments as few-shot context so it learns house conventions instead of restating generic advice on every PR.
  - Runtime verification as a distinct pass after static review, spin up dev servers, mocks and browser agents against the PR branch, attach logs, screenshots and traces as evidence on the PR. Close to our reproduction gate, and shows what the evidence artifacts could look like in the console.
  - A single merge-safety confidence score, 0 to 5, per PR plus a user-set minimum-severity floor, instead of a binary pass or fail verdict. Worth trying on our review-frontier step to cut noise without hiding real findings.
  - Plain-English, file-pattern-scoped rules as a lightweight per-repo review policy layer, separate from our capability YAML, for style and convention concerns that do not need code-level enforcement.
  - One-click handoff of unresolved review comments to a coding agent (Claude Code, Cursor, Codex, Devin), and a mode that keeps an agent iterating against the reviewer until clean. Our worker could consume unresolved review findings as a follow-up TaskBrief without a human round-trip.
differs:
  - Every rule, severity judgement and learned convention lives inside the model prompt. There is no enforcement in code or network policy behind any of it. Copying this wholesale for anything that gates merge or spend would break our policy-lives-outside-the-model principle. Fine only as advisory input to our own gate, never as the gate itself.
  - There is no task or session concept, each PR is a stateless review request against a cached index, not a durable multi-step worker. Nothing resembles per-task identity, budgets or an audit trail, so it is not a model for our control plane or identity layer, only for the narrow review step.
  - The default posture sends code to OpenAI's and Anthropic's hosted APIs and opts code into model training unless a customer turns that off. Self-hosting with your own model requires a sales conversation, not a documented self-serve path. Matching our no-vendor-specific-service, own-the-box stance means only the enterprise BYOC tier is usable, and that tier is undocumented in public.
ux_verdict: Zero-setup review that lands as comments inside the PR the developer is already looking at, with in-PR chat and one-click handoff to a coding agent, the lowest-friction UX in this survey, bought by being narrow, review only, no task board, no cross-repo view.
slop_verdict: Real product with paying customers and institutional funding (YC W24, Benchmark Series A at 180M USD), but every bug-catch and noise number in circulation is either vendor-published or from a competing vendor's comparison page, and the figures contradict each other between sources. Treat all comparative numbers as marketing until reproduced independently.
---

# Greptile

## 1. What it is

Greptile is a paid AI code review product. It comments on pull requests on GitHub and GitLab using a graph index of the whole repository, not only the diff. It sells to engineering teams from solo developers up to enterprise, with a free single-seat tier, a 30 USD per seat per month Pro tier billed in review credits, and a sales-led enterprise tier for larger or regulated customers (the site names defense, healthcare and financial services). There is no public source repository. The company is closed source with an on-prem option for enterprise.

The makers claim it builds a Semantic Code Graph of files, functions and dependencies, runs a swarm of agents per PR, and learns a team's conventions from its own comment history, catching cross-file bugs a diff-only reviewer misses. What the docs and independent testing actually show: a real product with three years of iteration (v3 in Sep 2025, v4 in early 2026), a working GitHub and GitLab integration, and a genuine second pass, TREX, that executes the PR branch in a sandbox rather than only reading it. Independent comparisons (Panto AI, Levelop, a LinkedIn review) consistently find it catches more issues than CodeRabbit but also raises more false positives, so the catches-more-bugs marketing line and the noisy complaint are both attested, from different angles, by the same body of evidence.

## 2. Mapping to our five planes

| Plane / principle | What Greptile does | What we do | Verdict |
|---|---|---|---|
| Signals | None. It reacts to a PR push or a review request, it does not take issues, alerts or telemetry as work sources | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | not comparable |
| Control plane | None. No task registry, no scheduler, no budgets beyond a per-seat credit balance, no approval workflow | factoryd with a Temporal workflow per task, Postgres task state, policy as YAML, approvals | not comparable |
| Worker plane | None for coding. TREX runs the PR branch (dev servers, mocks, browser agents) in an unspecified sandbox purely to observe runtime behaviour, it does not write code | gVisor pod per task, opencode harness, default-deny egress | not comparable |
| Verification | Its whole product: graph-aware static review plus TREX runtime execution, a merge-safety score from 0 to 5, custom rules, learned conventions | Forgejo Actions, policy gates (risk class, migration flag, reproduction gate), stronger-model review with a strict verdict | equal, arguably ahead on review depth, behind on gate determinism |
| Merge and deploy | None. It comments and can auto-apply a fix suggestion via a connected agent, it does not merge or deploy | Bot merge after approval or an auto rule, Flux deploy, staged rollout | not comparable |
| Policy outside the model | Rules are natural-language text interpreted by the LLM at review time, no code-level or network enforcement | Capability policy as a Git-versioned document, enforced in gateway code and network policy | we lead |
| Identity per task | None. Access is a GitHub or GitLab app installation per repository, not a short-lived credential per unit of work | Projected, audience-scoped ServiceAccount token per task, no key material in the sandbox | we lead |
| Artifacts not chat | PR comments, a merge-safety score and TREX evidence (logs, screenshots, traces) attached to the PR, chat exists too, for follow-up questions | TaskBrief in, branch, PR and event stream out | equal in spirit, they mix both |

## 3. Architecture and stack

Closed source, so this is inferred entirely from the marketing site and docs (greptile.com/agent.md, greptile.com/trex.md, greptile.com/security), nothing is verified against code. The pipeline as described: index the repository into a graph of files, functions, classes and dependencies, run a swarm of review agents (count and orchestration undisclosed) against each PR with that graph as context, score the result 0 to 5 for merge safety, and optionally run TREX, which launches services, mocks, dev servers and browser agents against the PR branch in a sandbox (implementation undisclosed) and attaches logs, screenshots, traces or video as evidence. Inference runs on OpenAI's and Anthropic's hosted APIs by default, the security page states self-hosted customers may bring their own model by supplying a base URL and key. Chat logs are stored in AWS DynamoDB with an opt-out. The self-hosted image is built on Amazon Linux and is meant to run inside a customer's own VPC or behind their VPN. None of this is independently verifiable, there is no open repository, Dockerfile or Helm chart to read.

## 4. UX

Onboarding is an app installation on GitHub or GitLab, then a push or PR triggers a review automatically, no separate console to learn. Comments appear inline on the diff, exactly where a developer already reviews code, plus a PR summary, sequence diagrams and a chat thread for follow-up questions. A human intervenes by replying to a comment, adjusting a custom rule, changing the minimum-severity threshold, or dismissing a finding, all inside the PR they are already on. There is a one-click path from an unresolved comment to a connected coding agent (Claude Code, Cursor, Codex, Devin) and a loop mode that keeps an agent iterating against Greptile's review until it is satisfied. This is the most frictionless UX in this survey precisely because the product does one thing: no dashboard, no task board, no project view, which is also its ceiling, it is not a place to watch or steer a longer-running agent task the way our console's kanban board is meant to be.

## 5. Security, identity, sandbox, policy, cost

Security and data handling: SOC 2 Type II, HIPAA and GDPR compliance are claimed. Code is cached on Greptile's servers until GitHub or GitLab access is revoked, then deleted. Admin-triggered deletion hard-deletes from production within 24 hours and from backups within 30 days (the page's own wording on backups is inconsistent, "may be destroyed" versus "are destroyed"). Customer data may be anonymised and used to improve models unless the customer opts out, a default we would not accept for our own repositories.

Identity: there is no per-task credential of any kind. Access is a single GitHub or GitLab app installation per repository, and every review shares that installation's scope.

Sandbox: only TREX touches a sandbox, to execute the PR branch for runtime checks, not to run an editing agent. No isolation technology, network policy or resource limits are disclosed.

Policy: entirely prompt-level, natural-language custom rules and comment-history-derived conventions, both interpreted by the reviewing model. Nothing is enforced outside it.

Cost: a credit ledger (1 credit per standard review, 3 per TREX review, 50 credits per seat per month, 1 USD per extra credit) is metering, not a hard cap with holds. Nothing on the public site describes a spend limit or a budget approval step.

## 6. What we should take from it

Narrow, code-level: the graph-before-review pattern, index the repo's call graph, hand it to the reviewing model as extra context, is a cheap, concrete addition to our review-frontier step, which today likely sees only the diff and immediate file context. The merge-safety score with a configurable severity floor is a better output shape than a binary verdict for surfacing findings without burying real ones in noise. TREX's evidence-artifact pattern, logs, screenshots and traces attached directly to the PR, is a good model for what our reproduction gate should surface in the console.

Broad: the biggest thing Greptile gets right that we do not build for is frictionless placement, review happens exactly where the developer already looks, with zero separate UI. Our console-first model asks a human to go somewhere else to see agent output. A comment-where-the-work-already-lives pattern, even just for our own PR review step, would lower the activation energy for the humans in our approval loop.

## 7. Where our philosophy differs and what that costs or buys us

Greptile's entire policy surface is prompt text. Adopting that for anything that gates a merge or spend would directly break policy-lives-outside-the-model: a rule a model can be talked out of is not a rule. We keep our YAML policy and gateway enforcement, and treat any Greptile-style natural-language rule as advisory input to our own gate, never the gate.

Its default data posture, hosted third-party inference, code cached on the vendor's servers, opt-out rather than opt-in model training, is the opposite of no-vendor-specific-service, own-the-box. Their BYOC and self-hosted tier exists but is undocumented in public and gated behind a sales call, so it cannot be evaluated the way an open self-hosted stack can. Our constraint of a re-seedable, self-hosted-by-default stack costs us the convenience of a hosted SaaS review tool, but buys us an auditable data path with no vendor default to opt out of.

## 8. Red flags and slop assessment

No public repository, so nothing here is independently checkable, every architecture claim in section 3 traces back to marketing copy. Customer-count claims are inconsistent across the company's own materials and third-party trackers (2,000 versus 22,000+ teams). Every comparative benchmark (bug-catch rate, false-positive count) found in this search was published either by Greptile itself or by a competing vendor (Panto AI, CodeRabbit-adjacent sites), and the numbers contradict each other within the same source in at least one case (Panto AI's own summary table disagrees with its own conclusion). Funding is real and traceable (YC W24, Initialized Capital seed, Benchmark-led Series A at about 180M USD valuation, Sep 2025), a rumoured Series B in Aug 2026 could not be confirmed from any press source. Founder public statements describe a culture of very long hours, a retention risk for a small, fast-scaling team, not a product risk, but worth flagging for anyone tracking maturity. No security incident or breach was found in this search.

## 9. Sources

- https://greptile.com (fetched 2026-09-29)
- https://www.greptile.com/enterprise.md (fetched 2026-09-29)
- https://www.greptile.com/agent.md (fetched 2026-09-29)
- https://www.greptile.com/trex.md (fetched 2026-09-29)
- https://www.greptile.com/security (fetched 2026-09-29)
- https://www.greptile.com/blog/series-a (referenced via search, 2025-09)
- https://techcrunch.com/2025/07/18/benchmark-in-talks-to-lead-series-a-for-greptile-valuing-ai-code-reviewer-at-180m-sources-say/ (2025-07-18)
- https://siliconangle.com/2025/09/23/greptile-bags-25m-funding-take-coderabbit-graphite-ai-code-validation/ (2025-09-23)
- https://www.gatech.edu/news/2026/01/05/y-combinator-backing-and-30m-investment-take-startup-greptile-next-level (2026-01-05)
- https://levelop.dev/blog/best-ai-code-review-tools-2026-coderabbit-greptile-qodo-compared (2026, undated)
- https://dev.to/pantoai/coderabbit-vs-greptile-ai-code-review-tools-compared-4kn4 (undated, referenced via search)
- https://www.linkedin.com/posts/ed-harrod_ai-code-review-i-have-tried-using-activity-7409191086943977473-4frt (undated, referenced via search)
- https://screencli.sh/blog/screencli-vs-coderabbit-vs-greptile (undated, referenced via search)
- https://github.com/sosacrazy126/greptile-mcp (community MCP server, not Greptile's own, checked 2026-09-29)
- https://www.greptile.com/docs/mcp/overview (referenced via search summary, 2026-09-29)
- Seed table row for greptile in docs/market-research/README.md
