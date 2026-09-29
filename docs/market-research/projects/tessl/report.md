---
name: Tessl
slug: tessl
url: https://tessl.io
repo: https://github.com/tesslio/cli
category: spec-driven
license: "mixed: proprietary (cli, LICENSE.md: \"Copyright 2025 Tessl. All rights reserved... proprietary\"), MIT (spec-driven-development-tile and other published tiles/skills)"
open_source: partial
self_hostable: no
hosting_model: hosted SaaS (registry, skill evals, billing by credits); CLI binary installed locally via curl or npm, skills/tiles stored as files in the project's .tessl/ directory
company: Tessl, London, founded 2024 by Guy Podjarny (ex-Snyk co-founder/CEO, ex-Akamai CTO). $125M total ($25M seed led by boldstart and GV, $100M Series A led by Index, Nov 2024), reported $500-750M valuation
maturity: cli repo 70 GitHub stars, spec-driven-development-tile 55 stars, tile repo first commit 2025-12-05, last commit 2026-03-30, 14 commits total; underlying @tessl/cli npm package has 107 published versions since 2025-09-15, latest 0.111.0 published 2026-09-24
similarity: 1
axes:
  signals_intake: 1
  control_plane: 0
  sandbox_isolation: 0
  verification: 2
  policy_outside_model: 1
  identity_per_task: 0
  cost_control: 1
  ux: 2
  reseedable_selfhost: 1
steal:
  - "The .spec.md format: YAML frontmatter (name, description, targets: file globs) plus inline [@test] links next to each requirement. A greppable, git-native way to trace a requirement to its implementation and its test, worth copying for the spec-driven intake our own vision names as missing."
  - "rules/spec-before-code.md spells out what counts as approval (an explicit yes, or a correction plus confirmation) and what does not (silence, \"just do it\", the agent's own judgement). That exact distinction is reusable almost verbatim for our own approval-as-workflow-state gate, to stop an agent from treating a non-answer as a yes."
  - "The eval shape: evals/<scenario>/task.md plus criteria.json as a weighted checklist, run locally with tessl eval run . and in CI on every PR (lint, skill review, version-bump check, publish-on-merge). A cheap template for the harness-prompt regression suite our own vision lists as absent."
  - "work-review's step 4 (capture ALL discovered requirements, not just new features but behavioural differences from the spec) is a good discipline for closing the loop between an implementation and its spec, applicable to our own end-of-session findings record."
  - "Distribution as a one-line install (tessl install tessl-labs/spec-driven-development) that layers a methodology onto whatever agent is already running (Claude Code, Cursor, Copilot) rather than requiring a new agent or runtime. Worth remembering as the friction floor for any optional methodology add-on to opencode."
differs:
  - "Tessl's only enforcement mechanism is prompt context: rules carry alwaysApply: true and are loaded into the agent's context window, with nothing checking that the agent actually followed spec-before-code or that a chat message really was an approval. This is the opposite of our 'policy lives outside the model' principle; adopting it as a real gate would mean a prompt alone decides whether code gets written."
  - "The whole workflow assumes one human live in a chat with one agent at a laptop, asking one question at a time and answering in the same session. It has no notion of a disposable per-task worker, a task queue, or a credential scoped to a task, so it cannot be lifted into our headless, one-shot sandbox model without being rebuilt as something else."
  - "Tessl itself walked back from being a spec-driven orchestrator: it paused Tessl Framework development and removed Framework functionality from a rebuilt CLI in 2025, then repositioned in January 2026 around a skills package manager and governance registry. The spec-driven tile we analysed sits stale since 2026-03-30 while the company's real investment went into skill governance, which we read as market evidence that spec-driven methodology alone is a feature, not a product, for this category."
ux_verdict: Two commands (tessl init, tessl install tessl-labs/spec-driven-development) are a lower floor than anything in our console, but there is no board, no run history and no way to watch or interrupt a task beyond the host agent's own chat, because Tessl is not itself an agent runtime.
slop_verdict: Real company and real usage (107 npm releases in a year, $125M raised, named enterprise logos on the homepage, not independently verified), but the specific spec-driven-development-tile that defines this category entry is a secondary, largely dormant artifact (14 commits, none since March 2026) next to a company that pivoted twice in eighteen months, from Framework to Registry to skills-and-governance.
---

# Tessl

## 1. What it is

Tessl is an "Agent Enablement Platform" from a London company founded in 2024 by Guy Podjarny (Snyk's co-founder and former CEO). It sells a CLI and a hosted registry that install reusable context (docs for open source libraries, internal team knowledge, and packaged "skills" or "tiles") into whatever coding agent a developer already runs, such as Claude Code, Cursor or Copilot. The company's own pitch has moved twice: it launched in September 2025 around a "Spec Registry" and a beta "Tessl Framework" for spec-driven development, then paused Framework work later in 2025, then relaunched in January 2026 as "Skills on Tessl", a package manager, evaluator and governance layer for agent skills across an organisation.

The artifact that matches our "spec-driven" category is `tessl-labs/spec-driven-development`, one tile in the registry (source at github.com/tesslio/spec-driven-development-tile), not a separate product. Installed, it adds markdown skills and rules to a project's `.tessl/` directory that push an agent to interview the user, write `.spec.md` files, get explicit approval, then implement and self-review. The README's claim ("teaches AI coding agents to gather requirements, write specifications, and get approval before writing code") matches the code: the tile is entirely markdown (four skills, three rules, two docs, two shell scripts, nine eval scenarios), no binary, no server component. The actual Tessl CLI (github.com/tesslio/cli) is a closed-source, proprietary binary distributed via curl or npm (@tessl/cli, 107 releases since 2025-09-15); its public GitHub repo is a README and a LICENSE.md that says "Copyright 2025 Tessl. All rights reserved."

## 2. Mapping to our five planes

| Plane / principle | What Tessl does | What we do | Verdict |
|---|---|---|---|
| Signals | None in the tile. A separate, thinly documented product, Tessl Agent (tessl.io/agent), claims to scan PRs, session logs and tickets continuously and open fix PRs, closer to telemetry-to-fix, but with no detail on triggers, credentials or sandboxing | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | None. No task registry, no scheduler, no durable state; a "session" is just the host agent's own chat | factoryd with a Temporal workflow per task, Postgres, YAML policy, approvals, budgets | we lead |
| Worker plane | None. Runs inside whatever agent and machine the developer already has open, no isolation, no disposability | gVisor pod per task, read-only root FS, default-deny egress | we lead |
| Verification | spec-verification and work-review skills tell the agent to re-run [@test]-linked tests and report drift; the tile's own repo enforces this on itself via CI (lint, skill review, version check) | Forgejo Actions, policy gates, stronger-model review | we lead (theirs is agent self-report with no independent gate for a consuming project) |
| Merge and deploy | None for a consuming project. Tessl Agent claims to open PRs automatically for docs and flaky-test fixes, but never mentions merge or deploy | Bot merge after approval, Flux staged rollout | we lead |
| Policy outside the model | Rules are markdown with alwaysApply: true, loaded straight into the agent's context; enforcement is "the agent chooses to follow the prompt". The separate enterprise registry does gate which skills an org may install, in code, with audit logs | Capability policy as YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | None. No task concept, no credential issuance; the security page explicitly does not describe how Tessl handles credentials | Projected, audience-scoped ServiceAccount token per task | we lead |
| Artifacts not chat | The opposite: the method is built on a live, one-question-at-a-time chat between a human and one agent; .spec.md files are the eventual artifact but the interview is not replaceable by an artifact | TaskBrief in, branch, PR and event stream out | we lead |

## 3. Architecture and stack

The tile is pure markdown and shell: skills/*/SKILL.md (YAML frontmatter with name/description used for skill discovery, then a numbered procedure), rules/*.md (frontmatter alwaysApply: true|false), docs/spec-format.md and docs/spec-styleguide.md, scripts/validate-specs.sh and scripts/check-spec-links.sh (bash, checking frontmatter fields and that [@test] targets resolve on disk), and evals/<scenario>/{task.md,criteria.json} (nine scenarios, each a weighted_checklist graded, per the Makefile, by tessl eval run ., presumably an LLM-graded harness on Tessl's backend since no grading code ships in this repo). tile.json is the manifest read by the Tessl CLI: it lists skill and rule paths and a semver version. CI (via the separate tesslio/setup-tessl action) runs lint, skill review, a version-bump check on PRs, and publish-on-merge to the registry.

The CLI itself (tesslio/cli) ships no source in its public repo; the installer script fetches a compiled binary, and the npm package @tessl/cli is a wrapper (107 versions since 2025-09-15, latest 2026-09-24, near-weekly cadence, confirming active development the public GitHub repo hides). Model calls, skill evaluation and the registry backend are entirely server-side and undocumented beyond marketing pages; nothing in the two repos we could read shows how Tessl talks to a model provider.

## 4. UX

From zero: tessl init then tessl install tessl-labs/spec-driven-development (or one npx command with no install step at all), then typing "use spec-driven development" in a normal prompt to the host agent. That is three actions to a first result, all inside an editor or terminal the developer already uses. There is no separate UI: Tessl has no dashboard for watching or interrupting a running task, because it does not run tasks, it only shapes context for a host agent's own chat. Approval, redirection and stopping all happen through that host agent's native interface (a Claude Code or Cursor conversation), not through anything Tessl built. The enterprise registry does have an admin-facing view (skill inventory, install/block/approve audit log, analytics), aimed at platform teams governing which skills exist across an org, not at watching an individual task run.

## 5. Security, identity, sandbox, policy, cost

Sandbox: none. Tessl never executes code or runs an agent itself; it edits a host agent's context. Whatever isolation exists is entirely the host agent's, outside Tessl's control. Identity: undocumented. The security page lists credential exfiltration only as a threat a bad skill could cause, with no description of how Tessl brokers or scopes any credential of its own. Policy: real but scoped narrowly to skill distribution, not to what an agent does with a task: org admins can gate which skills may be installed by source, severity and version, push mandated security skills automatically, and get a Snyk-scored badge per skill before install, all in code on Tessl's backend. Inside a single project, though, the actual "don't write code without an approved spec" rule is pure prompt content with no code-level check. Cost: a monthly credit allowance (1,000 free, no card required) meters registry/eval usage; no per-task hard cap, no hold-and-book ledger, and self-hosting is not offered, so cost control is entirely Tessl's own account-level billing.

## 6. What we should take from it

Narrow and copyable this month: the .spec.md frontmatter shape (name, description, targets: file globs) with inline [@test] links is a clean, low-ceremony way to make a requirement traceable to its code and its test, and our vision names "spec-driven intake" as a gap we have not built. The spec-before-code rule's definition of what counts as approval versus what does not is worth lifting near-verbatim into our own console's approval-state description, since "silence is not approval" and "the agent's own judgement is not approval" are exactly the failure modes a workflow-state gate needs to rule out explicitly. The evals/<scenario>/{task.md,criteria.json} weighted-checklist pattern, run in CI on every tile change, is a template we could reuse directly for the harness-prompt regression suite our vision lists as missing.

Broader: work-review's instruction to capture every discovered requirement, not just new features but behavioural differences from what was documented, is a useful discipline for our own end-of-session findings record, which today captures findings for the next session of the same task but has no equivalent of "write back into the spec of record."

## 7. Where our philosophy differs and what that costs or buys us

Tessl proves that "spec before code" can be shipped as pure prompt content, with zero infrastructure, riding on whatever agent and machine a developer already has. That buys a genuinely tiny adoption cost: three commands, no server of our own to run. We cannot copy that shortcut, because our worker plane is a disposable, unattended sandbox with no live human to interview one question at a time, and our "policy lives outside the model" principle rules out a rule that only works because the model chooses to obey it. Building spec-driven intake properly for us means the .spec.md-style artifact plus an acceptance-criteria check enforced in the verification plane, a gate rather than a prompt, which is more machinery than Tessl needed but is the price of our per-task, no-live-human model.

The clearer lesson is a market one: Tessl itself did not stay a spec-driven orchestrator. It paused Framework work and rebuilt the CLI without it, then repositioned entirely around skill governance for agents enterprises already run. That is evidence spec-driven methodology alone was not enough product for a Series A company backed by $125M to keep betting on, which supports treating spec-driven intake as one input into our control plane rather than a product surface of its own.

## 8. Red flags and slop assessment

The category-defining artifact is stale: spec-driven-development-tile has 14 commits total, first on 2025-12-05, none since 2026-03-30, six months before this report. Meanwhile the company's real shipping cadence is elsewhere: @tessl/cli on npm has 107 releases in a year, latest five days before this report, so Tessl as a company is active, just not on this specific tile. The product has repositioned twice in under two years (Spec Registry and Framework beta, September 2025; Framework paused and removed from a rebuilt CLI, later 2025; skills package manager and governance, January 2026), which one independent review called "a messaging migration still in progress" because the skills pivot doesn't explain how it relates to the earlier spec registry. Licensing is split: the tiles/skills we read are MIT, but the CLI that runs them is closed source and the registry, evals and enterprise governance are entirely proprietary SaaS with no self-hosting path documented, which is the open-core shape our own "escape hatch" constraint warns about if we ever depended on it. No security incidents found in search. Enterprise customer logos (Cisco, JetBrains, Intercom, Zillow, ByteDance) appear on the homepage; not independently verified.

## 9. Sources

- https://github.com/tesslio/spec-driven-development-tile (cloned 2026-09-29, full history, first commit 2025-12-05, last 2026-03-30, 14 commits)
- /home/womb/repos/market-research-clones/tessl/README.md
- /home/womb/repos/market-research-clones/tessl/tile.json
- /home/womb/repos/market-research-clones/tessl/Makefile
- /home/womb/repos/market-research-clones/tessl/scripts/validate-specs.sh
- /home/womb/repos/market-research-clones/tessl/skills/requirement-gathering/SKILL.md
- /home/womb/repos/market-research-clones/tessl/skills/spec-writer/SKILL.md
- /home/womb/repos/market-research-clones/tessl/skills/spec-verification/SKILL.md
- /home/womb/repos/market-research-clones/tessl/skills/work-review/SKILL.md
- /home/womb/repos/market-research-clones/tessl/rules/spec-before-code.md
- /home/womb/repos/market-research-clones/tessl/rules/one-question-at-a-time.md
- /home/womb/repos/market-research-clones/tessl/docs/spec-format.md
- /home/womb/repos/market-research-clones/tessl/evals/spec-drift-after-refactor/task.md
- /home/womb/repos/market-research-clones/tessl/evals/spec-drift-after-refactor/criteria.json
- /home/womb/repos/market-research-clones/tessl/LICENSE
- https://github.com/tesslio/cli (cloned 2026-09-29, README/LICENSE.md only, closed source)
- /home/womb/repos/market-research-clones/tessl-cli/README.md
- /home/womb/repos/market-research-clones/tessl-cli/LICENSE.md
- https://registry.npmjs.org/@tessl/cli (queried 2026-09-29: created 2025-09-15, 107 versions, latest 0.111.0 on 2026-09-24)
- https://github.com/tesslio (fetched 2026-09-29, org repo list and star counts)
- https://tessl.io/ (fetched 2026-09-29, pricing, enterprise claims)
- https://tessl.io/agent (fetched 2026-09-29)
- https://tessl.io/enterprise/security-and-governance (fetched 2026-09-29)
- https://docs.tessl.io/use/spec-driven-development-with-tessl (fetched 2026-09-29, returned 404)
- WebSearch "tessl.io github repository spec-driven development" (2026-09-29)
- WebSearch "Tessl AI Guy Podjarny spec registry funding" (2026-09-29), incl. https://techcrunch.com/2024/11/14/tessl-raises-125m-at-at-500m-valuation-to-build-ai-that-writes-and-maintains-code/
- WebSearch "Tessl agent skills registry January 2026 governance enterprise pricing" (2026-09-29), incl. https://tessl.io/blog/skills-are-software-and-they-need-a-lifecycle-introducing-skills-on-tessl, https://codemyspec.com/blog/tessl-review
