---
name: Tembo
slug: tembo
url: https://tembo.io
repo: none
category: factory-orchestrator
license: "mixed: proprietary product; Apache-2.0 on satellite repos sdk and rv; mcp repo public with no LICENSE file"
open_source: no
self_hostable: partial
hosting_model: cloud SaaS by default, agents run in per-session VMs inside the customer's own AWS, GCP or Azure account; a custom-priced Enterprise tier ships the control plane as a Docker image for self-hosting
company: Tembo, Cincinnati OH, founded 2022 by Darren Baldwin, Benjamin Akar and Ry Walker (co-founder of Astronomer); seed 6.5M USD (Venrock, 2022) and Series A 14M USD (GreatPoint Ventures, July 2024); pivoted from managed Postgres to autonomous coding agents in May 2025
maturity: GitHub org renamed from tembo-io to tembo (tembo-io now 404s); main repo tembo/tembo has 1267 stars but its history was wiped to a single commit on 2026-03-19; satellite repos sdk and mcp pushed within the last day as of 2026-09-29; changelog entries every few days through 2026-09-29; team shrank from about 28 at Postgres peak to about 7 FTE by early 2026
similarity: 3
axes:
  signals_intake: 4
  control_plane: 3
  sandbox_isolation: 4
  verification: 3
  policy_outside_model: 2
  identity_per_task: 3
  cost_control: 2
  ux: 5
  reseedable_selfhost: 1
steal:
  - Live per-session diff and event stream as a first-class API object, worth copying as a structured per-task feed instead of only kanban-card state
  - Sandbox snapshotting and pre-warmed projects to cut cold-start time, the same problem our gVisor and build-VM path already has
  - Automatic session recovery when its sandbox restarts, a pattern for resuming a Temporal task after its worker pod is evicted
  - Port-tunnel previews of the running app for reviewers, a cheaper trust signal than a diff alone
  - A published stop-and-comment guardrail for alert-driven tasks, one rule we can add to our own alert-to-issue path
  - Multi-surface task creation (Slack, Linear, forge mention, a Raycast extension) in addition to a web console
  - A customer-facing per-second and per-token cost table, not only an operator-facing cost view
differs:
  - Sandboxes are hyperscaler VMs inside the customer's own AWS, GCP or Azure account, not commodity self-owned hardware
  - Cost model is a monthly usage allowance with overage billing, not a pre-flight hard cap with a database-locked hold
  - No published capability policy outside the model, coarse RBAC plus a human-approval merge gate is the whole trust boundary
  - Closed core with access-gated deep docs, opposed to a project meant to be inspectable end to end
ux_verdict: Ahead of our console on live session streaming, redirect and cancel, and chat-native entry points, but behind us on transparency since its queueing and prioritisation logic is unpublished marketing language.
slop_verdict: Real and actively shipped, with daily commits, a live changelog and a genuine funding and pivot history, but its deepest architecture claims sit behind gated docs and NDA'd audits, and its own 1267-star flagship repo was quietly wiped to a single commit.
---

# Tembo

## 1. What it is

Tembo is a Cincinnati-based company founded in 2022 by Darren Baldwin, Benjamin Akar and Ry Walker (a co-founder of Astronomer). It began as Tembo Cloud, a managed Postgres platform built around Postgres extensions, raised a 6.5M USD seed round (Venrock) and a 14M USD Series A (GreatPoint Ventures, July 2024), and reached over 15,000 developers on the Postgres product. In March 2025 the team shipped a side experiment, dba, an agent that fixed slow Postgres queries and opened PRs. By May 2025 the company pivoted entirely: managed Postgres was wound down (migration deadline 27 June 2025) and Tembo rebuilt itself as an autonomous software maintenance company. Headcount fell from about 28 at the Postgres peak to about 7 full-time staff by early 2026.

The product today is sold as subscription SaaS: Free (14-day trial), Pro (60 USD per month plus usage), Max (200 USD per month plus usage), and a custom-priced Enterprise tier with self-hosting. Teams connect GitHub, GitLab, Bitbucket, Linear, Jira, Slack, Sentry or Notion and tag or trigger Tembo from those tools. Datadog, PagerDuty, Confluence and Figma are listed on the integrations page as "Soon", not yet shipped, as of 2026-09-29.

What the makers claim: Tembo is "the orchestration layer for AI coding agents", running a "fleet of ephemeral cloud computers" that is harness- and model-agnostic, taking work through five stages, Plan, Execute, Verify, Review, Ship, to a human-approved pull request. What the evidence actually shows: the product itself has no public repository (closed, matching the brief for this report). The public API schema, read from the sdk repository's OpenAPI document, exposes a concrete data model of sessions, agents, projects, pull requests and organizations, but the deeper lifecycle documentation is access-gated behind a code, so several of the marketing claims about autonomy and prioritisation could not be checked against a primary source.

## 2. Mapping to our five planes

| Plane or principle | What Tembo does | What we do | Verdict |
|---|---|---|---|
| Signals | Webhooks and mentions from GitHub, GitLab, Bitbucket, Linear, Jira, Slack, Sentry, Notion, plus schedules; Sentry project-mapping gates which projects can fire; docs state Tembo deduplicates fixes for already-addressed errors, mechanism undocumented; Datadog and PagerDuty are Soon, not live | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API; every task is a Forgejo issue | they lead on breadth of sources, not comparable on dedup depth (unverified) |
| Control plane | A session object (create, list, search, stop), a sortable, filterable, pinnable session list, reorderable queued messages, retry and reset, an events and audit tab; the underlying workflow engine is not disclosed | factoryd with a Temporal workflow per task, Postgres task registry, YAML policy applied by Flux | not comparable, their engine is undisclosed |
| Worker plane | One hardware-isolated VM per session inside the customer's own AWS, GCP or Azure account, sizes nano through ultra, snapshot and warm-start; harnesses claudeCode, codex, opencode, pi, amp, cursor in the public API (marketing pages also list fx, Grok Build, Antigravity) | One gVisor pod and namespace per task, opencode headless behind a Go Harness interface | they lead on VM fidelity, snapshotting and harness menu |
| Verification | Verify and Review stages inside the five-stage flow, sandboxed test, build and Playwright runs, a default PR-review agent (Codex plus GPT-5.2), a feedback loop that re-invokes a session from reviewer comments | Forgejo Actions on gVisor runners, policy gates (path risk class, migration flag, reproduction at base and head), a stronger-model review with a strict verdict | equal, our reproduction-at-base-and-head gate is more explicit |
| Merge and deploy | Security page states nothing merges without human approval; ordinary PR merge to the connected forge; no auto-merge path found | Bot merge after human approval, or an auto rule for normal-risk, reproduced, strictly-improving changes; Flux GitOps deploy with a staged rollout | we lead, we also automate low-risk merges and own the deploy step; Tembo stops at the PR |
| Policy outside the model | RBAC roles (admin, reviewer, operator) scoped per team and repository; org model controls let admins disable models org-wide | Capability policy as a YAML file in Git, versioned in the database, enforced in gateway code and Cilium network policy | we lead |
| Identity per task | Secrets are injected per session and scoped to the run, per the security page, and never sent to Tembo; an org-level secrets API resource; API keys support rotation and per-key scoping | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by factory-gateway against the cluster OIDC issuer | not comparable, their token type, lifetime and audience scoping for the session-to-control-plane leg are undisclosed |
| Artifacts not chat | Per-session diffs and events as API resources, an artifacts resource, the PR as the deliverable | TaskBrief in, a branch, a PR and a normalised event stream out | equal |

## 3. Architecture and stack

The core product is closed. Its GitHub organisation is tembo (org id 1798452); the old tembo-io login now returns 404, confirming a rename rather than a second org. Org description: "Move engineering work to the cloud."

Public satellite repositories read for this report:

- sdk (TypeScript, Apache-2.0, package.json, openapi/openapi.json): the real public API surface. The spec has 76 paths and 70 schemas, including sessions (with diffs, events, stop), agents (with templates, runs, schedules, triggers), projects (with builds, snapshots, environment-variables), organizations (with secrets, members, settings), pull-requests, repositories, integrations, mcp-connections, billing usage, insights, skills, artifacts, models. The session-creation schema exposes a startupAgent enum of claudeCode, codex, opencode, pi, amp, cursor; a sandboxSize enum of nano, micro, small, medium, large, xl, xxl, ultra; mcpServers; codeRepositoryIds; a sessionMode enum of chat, terminal; a visibility enum of private, public. None of the 70 schemas has a priority or score field. The Tembo Score named as a hint for this research does not appear in this schema, in the docs, in the changelog or in any marketing page found. The closest documented item is a changelog line stating Tembo will start finding the highest-impact tasks on its own, with no published scoring method.
- mcp (TypeScript, no LICENSE file, requires Node 22 or later): an MCP server generated from the same OpenAPI contract that drives the SDK, exposing either one tool per API operation or a four-tool compact mode. Hosted transport uses OAuth or an API key; local stdio is read-only unless run with an explicit write flag.
- internal-mcp: an older CLI whose README states that the CLI also functions as the MCP connector, handling authentication automatically in the sandbox, direct evidence for how in-sandbox authentication is wired, though the repo has not been pushed since February 2026 and looks superseded by mcp in practice.
- rv (Rust, no license file found): a PR-review CLI across GitHub, GitLab and Bitbucket with local credentials. Its existence, plus a separate bitbucket TypeScript API client generated from Bitbucket's OpenAPI spec, shows multi-forge support is real down to internal tooling, not only a marketing claim.
- Forks kept in the org: litellm (the same LiteLLM gateway used in our own design), KasmVNC and selkies (WebRTC and VNC remote-desktop streaming built for Kubernetes self-hosting), and several Nix packaging forks. The KasmVNC and selkies forks line up with the marketing claim of a session with a live computer desktop a human and the agent can both drive; how they are wired into the product is not confirmed and is marked as inference.
- fx, listed in the org, is a fork of vercel-labs/fx, a Zig coding-agent CLI, kept about a day behind upstream. It is evidence that Tembo vendors rather than builds at least one of the harnesses it advertises.
- The original repository, created 2022-11-23 with 1267 stars, now contains only a one-line README. git log on the shallow clone returns one commit, and the GitHub commits API confirms a single commit, labelled Initial commit, dated 2026-03-19. The multi-year Postgres-operator history behind the star count was overwritten, not archived under a different name.

Deployment shape: a SaaS web app and API control plane; agents execute in per-session VMs inside the customer's own AWS, GCP or Azure account on the cloud tiers, described as hardware-isolated; the Enterprise self-hosted tier ships the control plane from a Docker image per the changelog entry of 2026-09-25.

## 4. UX

Entry points read: the web app, Slack, Linear, Jira, GitHub, a Raycast extension (screenshots show Create Task, View Tasks and a menubar status item), and the API, SDK and MCP server. A task starts from a prompt box with a repository picker and an agent or model dropdown, a mention in a connected tool, a schedule, or a webhook.

While an agent works, the marketing mockups show a queue panel (four queued, with per-task user avatars) and a triggers panel (fired-today counts, last-fired time, per-trigger status). The docs describe a live session view covering every command, file edit, tool call and reasoning step, backed by the per-session diffs and events API resources, with one dashboard for all parallel runs.

Intervention happens by redirecting or cancelling a running session from the dashboard, or through a feedback loop that reopens a finished session with reviewer comments so the agent revises its own PR. Preview tunnels let a reviewer click through the running app instead of only reading a diff. Approval is manual: the security page states nothing merges without human approval, and no auto-merge rule was found in any source read.

Onboarding could not be fully verified: the quickstart URL tried returned a 404, and no page found states an exact step count from connecting a repository to a first PR. Vendor copy only claims setup in minutes and that a task can start via prompt, dropdown swap, or mention. This is marked not verified.

Compared with our console, Tembo is ahead exactly where our own weaknesses list says we are weak: real-time per-task event and diff streaming, a redirect-and-cancel control on a running task, and chat-native surfaces (Slack, Linear, Raycast) instead of one dedicated web console. Tembo is behind us on transparency: its queueing and prioritisation logic is not published in a form a user or admin can inspect, and it has nothing resembling our alerts-with-verdicts view.

## 5. Security, identity, sandbox, policy, cost

Sandbox. The security page states that every agent runs in its own hardware-isolated VM, inside the customer's own AWS, GCP, or Azure account, with no shared state and no ambient access, and that source code is never stored on Tembo's infrastructure. Egress is customer-configurable, from reaching internal services directly to full air-gap support. Sizes run nano through ultra with snapshot and keep-alive for warm starts. Not verified: the actual hypervisor or isolation technology, or the default egress posture when a customer sets no policy.

Identity. Secrets are injected per session and scoped to the run, per the security page, never written to disk, never logged, never sent to Tembo. An org-level secrets API resource is keyed by organization ID. API keys support creation, rotation, revocation, per-key scoping and a full audit trail on key usage. How a running session itself authenticates back to Tembo's control plane, token type, lifetime, audience, is not documented anywhere read for this report.

Policy. RBAC roles for admin, reviewer and operator, scoped per team and repository, plus org model controls letting admins disable specific models org-wide. No evidence of a versioned, Git-stored capability policy enforced independently of the running agent was found; the closest control is the human-approval merge gate.

Cost. Published pricing includes per-second VM rates (0.0403 USD per vCPU-hour, 0.0130 USD per GiB-hour) and a per-model token price table run through a gateway (for example one model priced at 11.50 USD input and 57.50 USD output per million tokens). Bring-your-own-key or subscription OAuth inference is free through Tembo but still draws down the VM-hour allowance. Plans are a monthly usage allowance with overage billing, meaning spend continues and is billed past the allowance rather than stopping. No evidence of a pre-flight cost hold comparable to our gateway pricing a call's worst case and taking a database-locked hold before it runs.

## 6. What we should take from it

Narrow. The per-session diff and event API is a concrete shape for exposing our own Temporal workflow history and pod logs as a structured feed instead of only kanban-card state, directly answering our own documented weakness of no real-time streams and no diff view. Sandbox snapshotting and keeping projects ready for faster session starts is a pattern worth copying against our own slow gVisor and build-VM cold start. Automatic session recovery when a sandbox restarts, per the 2026-09-18 changelog entry, is a concrete resume pattern for a Temporal task whose worker pod is evicted. Port-tunnel previews for reviewers are a cheap addition to our merge-and-deploy review step. The published Incident Triage guardrail, stop and comment with findings if no safe fix is found rather than guessing, is a one-line supervisor rule worth adding to our own alert-to-issue path.

Broad. Multi-forge signal intake (GitHub, GitLab, Bitbucket all live, not only GitHub) shows the productised shape of a webhook router keyed by forge type, worth planning toward given our own stated weakness of one forge only. A customer-facing cost table, not only an operator-facing one, is a UX pattern our own per-task cost view could adopt using data our gateway already has; showing the running total to the person who requested the task, not only to us, builds trust cheaply.

## 7. Where our philosophy differs and what that costs or buys us

Tembo's sandboxes are VMs inside the customer's own hyperscaler account, the opposite of our commodity-hardware constraint of a few owned boxes and no vendor-specific service. Copying that sandbox model outright would break that constraint. Where it is genuinely better, full VM fidelity such as Docker, Postgres, a real desktop, and 32 GB or more of RAM, is a real capability gVisor pods lack; our constraint buys us a single cheap substrate at the price of workloads we cannot run as smoothly, GUI apps and heavy multi-service builds among them.

Its cost model is a subscription plus metered overage billing, not a pre-flight hard cap with a held budget. Adopting that would break our principle that spending has hard caps. Keeping ours costs us the simplicity of billing more when needed but buys the guarantee that one runaway task cannot overspend past what was reserved for it.

There is no published capability policy independent of the model in anything read for this report; the trust boundary is coarse RBAC plus a human approving the final PR. Our policy-outside-the-model principle is stricter: it bounds what an agent can reach while it runs, not only what gets merged. Tembo's worst case during a run is bounded mainly by whatever network egress rule the customer happened to set; ours is bounded by a versioned, gateway-enforced capability document regardless of what the customer remembered to configure. A looser model like theirs would be cheaper to build but is a regression against our stated constraint.

A closed core with access-gated deep documentation is structurally opposed to our project's second purpose, a portfolio piece meant to be inspectable end to end. We can take mechanisms and UX patterns from Tembo, not its business posture of keeping the interesting half of the architecture behind an access code or an NDA'd audit report.

## 8. Red flags and slop assessment

The flagship open source repository carries 1267 stars from a 2022 creation date but was reduced to a single Initial commit dated 2026-03-19 containing only a one-line README. This was confirmed two ways: git log on the shallow clone returns one line, and the GitHub commits API returns exactly one commit. The star count is retained; the multi-year Postgres-operator history behind it is not.

Deeper architecture and lifecycle documentation is access-gated: the workflows page under docs.tembo.io returned an access-restricted message asking for an access code when fetched. Task-state, concurrency and escalation claims in this report therefore rest on marketing pages and the public OpenAPI schema, not on primary lifecycle documentation.

Compliance badges (SOC 2 Type II, ISO 27001, ISO 42001, HIPAA) are self-reported on the marketing site with reports available under NDA and were not independently verified here.

Two of the five signal sources named as a hint for this research, Datadog and PagerDuty, are listed on the integrations page as Soon as of 2026-09-29, not shipped. The Tembo Score priority mechanism named as a hint does not appear in the docs, the changelog, the marketing copy, or the 70-schema public API, so it either does not exist under that name or is unreleased.

Independent review coverage is thin. No meaningful Reddit or Hacker News discussion specific to Tembo as a coding-agent product was found. Nearly all comparison content found, of the best AI coding agents for 2026 style, is self-published by Tembo and ranks Tembo favourably. The one third-party first-hand account found, a November 2025 blog post, reports both useful output and failures of continuity that led to incorrect output, from a single user's experience.

Signals of genuine, active maintenance: the sdk and mcp repositories were pushed within the last day as of 2026-09-29, the public changelog carries entries every few days through the same date, and the funding and pivot history (seed in 2022, Series A in mid-2024, pivot in May 2025, headcount down to about 7 by early 2026) is corroborated by independent funding trackers and press coverage, not only by self-reported claims.

Verdict: real and actively shipped, not a landing page over a stalled idea. Its deepest architectural claims are unverifiable from outside, gated docs, NDA'd audits, an undisclosed workflow engine, and its own open source history was quietly erased at the same time its business pivoted.

## 9. Sources

https://tembo.io (2026-09-29)
https://www.tembo.io/blog/autonomous-software-maintenance-has-arrived (2026-09-29)
https://tembo.io/pricing (2026-09-29)
https://tembo.io/security (2026-09-29)
https://docs.tembo.io (2026-09-29)
https://www.tembo.io/changelog (2026-09-29)
https://www.tembo.io/blog/goodbye-background-agents (2026-09-29)
https://docs.tembo.io/integrations/sentry (2026-09-29)
https://docs.tembo.io/ai-agent/workflows (2026-09-29, access-gated, no content obtained)
https://www.tembo.io/features/agents (2026-09-29)
https://www.tembo.io/integrations (2026-09-29)
https://www.tembo.io/quickstart (2026-09-29, 404)
https://news.ycombinator.com/item?id=44038896 (2026-09-29, referenced via search)
WebSearch: Tembo tembo.io autonomous coding agent Tembo Score pivot Postgres (2026-09-29)
WebSearch: Tembo tembo.io funding acquisition Postgres pivot 2025 2026 (2026-09-29)
WebSearch: Tembo Score tembo.io priority queue triage (2026-09-29)
WebSearch: Tembo coding agent review Reddit Hacker News experience 2026 (2026-09-29)
WebSearch: dba.ai Tembo priority score deduplication issues (2026-09-29)
GitHub API: repos/tembo-io (2026-09-29, 404, confirms org rename)
GitHub API: orgs/tembo, orgs/tembo/repos (2026-09-29)
GitHub API: repos/tembo/fx, repos/tembo/mcp, repos/tembo/sdk, repos/tembo/tembo (2026-09-29)
GitHub API: repos/tembo/rv/readme, repos/tembo/aifsd/readme, repos/tembo/raycast/readme, repos/tembo/internal-mcp/readme, repos/tembo/bitbucket/readme (2026-09-29)
GitHub API: repos/tembo/tembo/commits (2026-09-29)
Local clone: tembo/fx (README, top-level listing, log)
Local clone: tembo/mcp (README, top-level listing)
Local clone: tembo/sdk (README, openapi/openapi.json, top-level listing)
Local clone: tembo/tembo (README, log)
