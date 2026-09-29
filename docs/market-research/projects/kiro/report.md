---
name: Kiro
slug: kiro
url: https://kiro.dev
repo: none
category: spec-driven
license: proprietary
open_source: no
self_hostable: no
hosting_model: vendor-hosted SaaS on AWS. IDE and CLI run on the developer's machine and call Kiro cloud services. Web sessions and the autonomous agent run in AWS-managed sandboxes, fixed to us-east-1. No self-hosting path exists.
company: Amazon Web Services (Amazon.com, Inc.), Seattle. Not an independent company. Publicly fronted by Nikhil Swaminathan and Deepak Singh. Announced 14 July 2025.
maturity: closed product, no public source. Public issue tracker github.com/kirodotdev/Kiro created 2025-06-17, 4338 stars, 322 forks, 1352 open issues, last push 2026-09-15. GA date disputed among third-party reviews (March or May 2026, not verified against an AWS source). Autonomous agent announced 2 December 2025, still Preview.
similarity: 2
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 2
  verification: 4
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 2
  ux: 4
  reseedable_selfhost: 0
steal:
  - "EARS grammar for requirements.md: numbered 'Requirement N' blocks with a User Story and 'WHEN trigger, THE Component SHALL behaviour' criteria, plus an upfront component glossary."
  - "tasks.md convention: checkbox tasks, an optional-task marker for tasks skippable in an MVP, a trailing '_Requirements: X.Y_' tag on every leaf task, and explicit numbered Checkpoint tasks whose content is 'ensure tests pass, ask the user if questions arise.'"
  - "Analyze Requirements: a dedicated pass that reasons over the whole requirement set for contradictions, ambiguity and gaps, and turns findings into chat questions with selectable fixes rather than guessing."
  - "Correctness properties: the design phase extracts quantified invariants from EARS requirements and generates property-based tests with shrinking, each property tagged back to the requirement and task it validates."
  - "Permission engine shape: deny beats ask beats allow with the most restrictive rule winning regardless of scope, hardcoded invariants the agent cannot edit even under full autonomy, and headless mode turning every ask into a deny."
  - "Named network-egress tiers per sandbox (git-proxy only, common package registries, open internet, plus a custom allowlist) offered as a simple per-task choice instead of one fixed allow-list."
  - "Issue-label intake: a plain 'kiro' label or an '/kiro' mention starts a task, and each triggering user gets a separate sandbox, so simultaneous claims never collide."
differs:
  - "On the IDE and CLI, the agent runs with the user's own ambient credentials and Kiro's own docs push isolation onto the user (separate profile, container, dedicated account) instead of the product. Copying this would break our identity-belongs-to-the-task principle, which keeps the sandbox credential-free by construction."
  - "Kiro is single-tenant SaaS with cloud sandboxes fixed to us-east-1 and no exposed control-plane source. Nothing here is adoptable as infrastructure, only as a format or UX reference. It fails our commodity-hardware and open-source-with-escape-hatch constraints outright."
  - "Cost control is a monthly credit pool per seat or org with one overage toggle, not a per-task hard cap with a database-locked hold and a real-cost ledger booked afterward. Copying it would remove the per-task and per-project budget envelopes our design treats as load-bearing."
  - "Kiro's own docs call generated property tests evidence for correctness, not formal verification, and the whole tier is optional and IDE-only. Our verification plane assumes cheap deterministic checks run before any model judgement, so a Kiro-style property tier would have to sit above that floor, not replace it."
ux_verdict: A real multi-surface product with checkpoints, session replay and wave-based task execution beats our console today, but independent reviewers still call it a rough, credit-hungry v1.x tool.
slop_verdict: Real and used in anger. AWS sells it as a paid product, a Financial Times-reported AWS outage was attributed to it, and its issue tracker carries over a thousand open issues, not a landing page with no substance behind it.
---

# Kiro

## 1. What it is

Kiro is AWS's agentic IDE, built on Code OSS, the open-source base of VS Code. It was announced on 14 July 2025 and reached general availability in 2026, though reviewers disagree on the exact month (March per several sources, May per one, not verified against an AWS primary source). It ships as a desktop IDE, a terminal CLI (kiro-cli), a web surface for cloud sessions (app.kiro.dev), a mobile app for monitoring and approving, and a separate open-source companion called Kiro Crew (a 4,196-star Apache-2.0 GitHub project describing itself as "a persistent workspace for development work"). AWS sells it as a monthly per-seat credit subscription from Free through Power, plus an enterprise tier billed through AWS itself. It is not an independent company. It is an Amazon product that calls Anthropic Claude models through Amazon Bedrock, and its source is closed.

The one public repository, github.com/kirodotdev/Kiro, states plainly that it "is the public issue and feedback tracker for Kiro" and that "the Kiro product source code is not hosted here." It does, however, contain Kiro's own dogfooded spec files under .kiro/specs/github-issue-automation/, the best primary evidence of the spec file format available outside the paid product.

AWS's claim is that Kiro turns a prompt into a structured spec (requirements, design, tasks) before any code is written, checks that result with property-based tests, and in late 2025 added an autonomous agent that picks up GitHub issues and works unattended in the cloud. What the docs and the dogfooded repo actually show: the three spec files are plain markdown with a defined grammar (EARS acceptance criteria, a component glossary, numbered "Property" traceability), tasks are tracked with checkboxes and requirement-ID trailers, and the autonomous agent is a real GitHub App integration with documented permission scopes, still labelled Preview more than nine months after announcement.

## 2. Mapping to our five planes

| Plane / principle | What Kiro does | What we do | Verdict |
|---|---|---|---|
| Signals | GitHub issue gets the kiro label, or a user comments /kiro, or a prompt is typed into IDE, CLI, Web or Mobile. Team plans also mention Jira, GitLab, Slack, Teams and Confluence integration, not verified end to end. No telemetry or alert intake. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. Every task is a Forgejo issue. | Equal |
| Control plane | Session state persists server-side for 90 days, up to 10 concurrent cloud tasks, cross-device resume and replay. No documented workflow engine, no versioned policy file, no per-task budget object. | factoryd with a Temporal workflow per task, Postgres, policy as YAML in Git applied by Flux, budgets, approvals, model tier choice, cost ledger, audit trail. | We lead |
| Worker plane | Cloud and autonomous tasks get an isolated sandbox with three named egress tiers plus a custom allowlist, encrypted secrets, auto-config from a Devfile or Dockerfile. IDE and CLI tasks run directly on the developer's machine with the user's own credentials in reach, a risk the docs name explicitly. | One namespace, ServiceAccount and gVisor pod per task, read-only root filesystem, non-root, default-deny egress to a short allowlist. | We lead |
| Verification | Branch protection and required status checks are respected before merge. A "verification agent" checks output in the autonomous pipeline. Correctness properties, generated from EARS requirements, run as property-based tests with shrinking, IDE-only and optional. | Forgejo Actions on gVisor runners, then policy gates (path risk class, migration flag, reproduction at base and head), then a stronger-model review with a strict verdict. | Equal |
| Merge and deploy | Agent branches off default, opens a PR with a description, cannot push to protected branches, answers /kiro fix and /kiro all review comments. Nothing beyond the PR is documented. | Bot merge after human or auto-rule approval, Flux GitOps deploy, staged rollout with a 15-minute alert-free bake before prod. | We lead |
| Policy outside the model | A capability engine resolves deny, ask, allow per action, with the most restrictive rule winning across scopes. Hardcoded invariants cannot be edited by the agent even in full autonomy. Headless mode turns every ask into a deny. Enterprise admins push model, MCP and web-tool allowlists centrally. | Capability rules as a YAML file in Git, versioned in the database, enforced in gateway code and network policy. | Equal |
| Identity per task | On IDE and CLI the agent runs with the user's own environment, including local AWS credentials, a risk the security docs name and push onto the user to mitigate. Cloud and autonomous tasks use GitHub App installation tokens; rotation and lifetime are undisclosed. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer. The sandbox holds no key material. | We lead |
| Artifacts not chat | Specs turn intent into three markdown files, a real artefact-based step. Day-to-day work and PR feedback stay inside one continuous, stateful chat thread that lives only in Kiro's own session store. | TaskBrief in, a branch, a PR and a normalised event stream out. All coordination state is a git artefact. | Not comparable |

## 3. Architecture and stack

The IDE is a fork of Code OSS, inheriting VS Code themes, shortcuts and Open VSX extensions, per third-party reviews (not verified in source, since the product is closed). Reasoning runs on Anthropic Claude models (Sonnet, Opus) served through Amazon Bedrock. The Free tier also offers open-weight models: Qwen3 Coder Next, DeepSeek 3.2, MiniMax M2.1. Kiro's own dogfooded automation calls a Bedrock inference profile directly, us.anthropic.claude-sonnet-4-20250514-v1:0, visible in .kiro/specs/github-issue-automation/design.md.

The CLI, kiro-cli, ships as an installed binary with a terminal UI, browser-based login, HTTP_PROXY, HTTPS_PROXY and NO_PROXY support, a headless mode for CI/CD, and subagents with a crew monitor. The language it is written in is not stated anywhere found. No queue or workflow engine is named in the docs. Task dependency graphs and "wave" batching for tasks.md execution appear to be computed client-side by the IDE or CLI rather than by a documented server component, not fully verified.

Deployment shape is proprietary SaaS plus downloadable IDE and CLI binaries. There is no Helm chart, no docker-compose and no self-host path anywhere in the docs. Enterprise governance is a set of central toggles in a console (Settings > Shared settings) covering model allowlists, MCP allowlists, web-tool access and Cloud Sessions enablement, not an exported policy file a customer can version.

Agent execution splits in two. Locally (IDE, CLI) the agent runs inside the developer's own OS session. In the cloud (Web sessions, the autonomous agent) each task provisions an isolated sandbox, clones repositories server-side, and chooses from three network-egress tiers (GitHub proxy only, common package registries, open internet) plus a custom domain allowlist, with MCP server support, encrypted secrets, and auto-configuration from a Devfile or Dockerfile. The underlying sandbox technology (container, microVM or otherwise) is never named, so treat it as not verified.

Files and directories read: README.md, CONTRIBUTING.md, docs/README.md, docs/STALE_ISSUE_CLOSING_EXPLAINED.md, .kiro/specs/github-issue-automation/requirements.md, .kiro/specs/github-issue-automation/design.md, .kiro/specs/github-issue-automation/tasks.md, .github/workflows/ (all workflow files), and the top-level layout of scripts/ (all in the local clone at market-research-clones/kiro-repo).

## 4. UX

Zero to a first executed task: install the IDE or run the CLI installer, complete browser authentication (social login, Builder ID, or enterprise SSO), open a project, then either chat directly or click the "+" under Specs. For a spec-driven start: open the Specs pane, choose feature or bug, choose Requirements-First, Design-First or Quick Spec, describe the work in one prompt, approve or edit requirements.md, approve design.md, approve tasks.md, then run tasks one at a time or all together. That is five to eight steps depending on whether Quick Spec's no-gate path is used.

While an agent works, the user sees one chat thread with consecutive reasoning and tool-call steps grouped into a collapsible block, a "Session setup" section for startup actions, and in cloud sessions a Summary view with Files, Artifacts and Reviews tabs. Task execution against tasks.md shows real-time per-task status, batched into dependency-free "waves" that run concurrently.

Intervention has several layers. Autopilot (proceed on allowed operations) versus Supervised (confirm every action) is a session-wide toggle. Underneath it sits a fine-grained per-capability allow, ask or deny rule set, with approval prompts offering Allow, Deny, Always allow or Always deny. Checkpoints snapshot automatically on every prompt, and restoring one reverts files and discards later chat context together, so the agent's belief state and the file state never diverge. A lighter "Revert" undoes only the last turn's files. CLI-only "Rewind" forks the conversation without touching files. Cloud and autonomous sessions drop the per-action prompt for the sandbox boundary instead: if the agent needs permission for an action while nobody is connected, the request waits for the next client to attach.

Interfaces: IDE, CLI, Web, Mobile, and chat-driven PR commands (/kiro fix, /kiro all). No public API beyond MCP is documented.

Compared with our console, Kiro's multi-surface reach (desktop, terminal, browser, phone) and its checkpoint, rewind and session-replay UX are ahead of our server-rendered htmx console, which we already flag as having no diff view, no live stream and no mobile view. What is worse: task state lives only inside a proprietary session object, with no visible audit trail, no cost-per-task view and no org-wide kanban of the kind our console already has across every project.

## 5. Security, identity, sandbox, policy, cost

Security is split by surface. On IDE and CLI, Kiro's own privacy and security docs warn that signing in with GitHub or Google runs the agent locally with access to local files, environment variables and AWS credentials in the environment, and the mitigations offered (separate accounts, containers, temporary credentials) are the user's job, not the product's. On Web and the autonomous agent, work happens inside an "isolated sandbox," a stronger boundary, but its technology is not named.

Identity is the weakest area relative to our design. The dominant local surfaces give the agent whatever credentials the developer's own shell already has. The cloud surfaces use GitHub App installation tokens scoped to authorised repositories, but rotation and lifetime are undisclosed. Nothing resembles our audience-scoped, per-task, kubelet-rotated ServiceAccount token model.

The sandbox, where one exists, is real and specific: three named egress tiers (GitHub proxy only, common package registries, open internet) plus a custom allowlist, encrypted secrets, and up to 10 concurrent tasks. It simply does not apply to the primary local surfaces at all.

Policy is genuinely kept outside the model on both surfaces. A capability engine resolves deny, ask or allow per action, the most restrictive rule wins regardless of which scope it came from, some invariants are hardcoded so the agent cannot edit its own permission files even under full autonomy, and headless mode treats every ask as a deny by default. Enterprise admins push model, MCP and web-tool allowlists centrally through a console.

A spend cap here is a monthly credit pool per seat or organisation, metered to 0.01 credits per action, with no rollover and a manual, off-by-default overage toggle for admins. There is no per-task or per-project hard cap, no hold taken before a call runs, and no real-cost ledger booked afterward in anything documented.

## 6. What we should take from it

Narrow, copyable this month: the EARS grammar for requirements.md (numbered "Requirement N" blocks, a User Story, "WHEN trigger, THE Component SHALL behaviour" criteria, an upfront glossary) is a ready-made acceptance-criteria format for a future spec-intake phase. The tasks.md convention (checkboxes, an optional-task marker, a trailing "_Requirements: X.Y_" tag on every leaf task, explicit numbered Checkpoint tasks) is a plain-markdown task ledger that needs no new service to adopt. The permission engine's three small rules (most restrictive wins across scopes, the agent cannot edit its own policy, headless ask means deny) fold directly into factory-gateway's capability check. The named network-egress tiers (git-proxy only, package registries, open internet) are a better vocabulary than a single fixed allowlist for our own default-deny egress as we add capability classes with different needs. The kiro label or /kiro mention, with one sandbox per triggering user, matches our Forgejo-issue-is-a-task model closely enough to copy verbatim.

Broad, product-shape items: Analyze Requirements is a genuine missing phase in our loop. We already say spec-driven intake does not exist yet. Kiro's version is not just drafting a spec, it is a second, adversarial pass over the whole requirement set that surfaces contradictions, vague wording and missing edge cases as chat questions with selectable fixes, before any design work starts. This would sit between issue intake and TaskBrief construction in our design. Correctness properties, quantified invariants generated from requirements and tested with property-based testing and shrinking, each tagged back to a requirement and task, is a plausible extra verification tier between our deterministic gate and the stronger-model review, worth prototyping even without Kiro's IDE hover UI.

## 7. Where our philosophy differs and what that costs or buys us

Credential handling is the sharpest gap. Kiro's local surfaces run the agent with the user's own ambient credentials by default and rely on the user to isolate a sensitive project into a separate account or container. Our identity-per-task principle exists specifically to remove that failure mode. Adopting Kiro's default would buy convenience, no token plumbing for local dev, at the cost of the one guarantee our design is built around.

Kiro is single-tenant SaaS with cloud sandboxes fixed to us-east-1 and no exposed control-plane source. Nothing here is adoptable as infrastructure, only as a format or UX reference. This is not a place where copying them is even tempting, it simply fails our commodity-hardware, re-seedable and open-source-with-escape-hatch constraints outright.

Cost control is a monthly credit pool per seat or organisation with one overage toggle, not a per-task hard cap with a database-locked hold and a real-cost ledger booked afterward. Their model is simpler to bill and explain. Ours is the one that can actually stop a single runaway task before it drains a budget meant for a hundred others.

Their own docs describe generated property tests as evidence for correctness, not formal verification, and the tier is optional and IDE-only. That is an honest hedge, not a criticism, but it means a Kiro-style property tier would have to sit above our existing floor of cheap deterministic checks, not replace it. Treating generated tests as a substitute for that floor would soften a guarantee we currently keep hard.

## 8. Red flags and slop assessment

A December 2025 AWS Cost Explorer outage, thirteen hours in one region, was reported by the Financial Times as caused by a Kiro agent deleting and recreating an environment during an infrastructure change. AWS disputed the framing as "user error, specifically misconfigured access controls," and added mandatory peer review for production changes afterward, but its statement did not deny that a Kiro agent performed the deletion. Sources: [The Register, 20 February 2026](https://www.theregister.com/2026/02/20/amazon_denies_kiro_agentic_ai_behind_outage/), [TechTarget](https://www.techtarget.com/searchsoftwarequality/news/366639129/AWS-Kiro-user-error-reflects-common-AI-coding-review-gap), [Cybernews](https://cybernews.com/ai-news/amazon-aws-disrupted-ai-coding-tool-kiro/).

Independent reviewers place it as a rough v1.x product. Ricardo Gil, after several weeks of hands-on use, called the spec-driven workflow "not a gimmick" but flagged "punishing" credit economics, autocomplete lagging competitors, and a hooks and steering ecosystem needing "a year of community contributions."

The public GitHub repository is explicitly not the product, only its issue tracker, and it carries 1,352 open issues. That is a lot of unresolved user-facing friction for a product past its first year, though it also shows a large, active user base rather than abandonment.

The autonomous agent is still labelled Preview more than nine months after its 2 December 2025 announcement, gated to individual Pro, Pro+ and Power subscribers, with teams still on a waitlist, slower than the autonomous agent marketing framing implies.

No independent security audit or penetration test report for Kiro was found in the searches run for this report. Not verified either way.

## 9. Sources

https://github.com/kirodotdev (org listing, via gh api)
https://github.com/kirodotdev/Kiro (via gh api repos/kirodotdev/Kiro)
https://github.com/kirodotdev/KiroCrew (via gh api repos/kirodotdev/KiroCrew)
https://github.com/kirodotdev/spirit-of-kiro (via gh api repos/kirodotdev/spirit-of-kiro)
https://github.com/kirodotdev/powers (via gh api repos/kirodotdev/powers)
market-research-clones/kiro-repo/README.md
market-research-clones/kiro-repo/CONTRIBUTING.md
market-research-clones/kiro-repo/docs/README.md
market-research-clones/kiro-repo/.kiro/specs/github-issue-automation/requirements.md
market-research-clones/kiro-repo/.kiro/specs/github-issue-automation/design.md
market-research-clones/kiro-repo/.kiro/specs/github-issue-automation/tasks.md
market-research-clones/kiro-repo top-level layout and file listing (find)
https://kiro.dev/docs/specs/ (2026-09-29)
https://kiro.dev/docs/specs/analyze-requirements/ (2026-09-29)
https://kiro.dev/docs/specs/correctness/ (2026-09-29)
https://kiro.dev/docs/specs/feature-specs/ (2026-09-29)
https://kiro.dev/docs/hooks/ (2026-09-29)
https://kiro.dev/docs/steering/ (2026-09-29)
https://kiro.dev/docs/cloud-sessions/ (2026-09-29)
https://kiro.dev/docs/permissions/ (2026-09-29)
https://kiro.dev/docs/checkpoints/ (2026-09-29)
https://kiro.dev/docs/powers/ (2026-09-29)
https://kiro.dev/docs/custom-agents/ (2026-09-29)
https://kiro.dev/docs/cli/setup/ (2026-09-29)
https://kiro.dev/docs/privacy-and-security/ (2026-09-29)
https://kiro.dev/docs/enterprise/governance/ (2026-09-29)
https://kiro.dev/docs/autonomous-agent/github/ (2026-09-29)
https://kiro.dev/docs/autonomous-agent/using-the-agent/ (2026-09-29)
https://kiro.dev/blog/introducing-kiro-autonomous-agent/ (2026-09-29)
https://kiro.dev/pricing/ (2026-09-29)
https://www.theregister.com/2026/02/20/amazon_denies_kiro_agentic_ai_behind_outage/ (2026-02-20)
https://www.techtarget.com/searchsoftwarequality/news/366639129/AWS-Kiro-user-error-reflects-common-AI-coding-review-gap (2026)
https://cybernews.com/ai-news/amazon-aws-disrupted-ai-coding-tool-kiro/ (2026)
https://www.gilricardo.com/blog/kiro-review-spec-driven-agentic-ide (2026)
https://aiagentsquare.com/agents/kiro (2026)
https://toolbrain.net/kiro-review-2026/ (2026)
