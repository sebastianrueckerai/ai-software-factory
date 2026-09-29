---
name: Cursor Cloud Agents (Background Agents, Automations, Bugbot)
slug: cursor-cloud-agents
url: https://cursor.com
repo: none
category: factory-orchestrator
license: proprietary
open_source: no
self_hostable: partial
hosting_model: vendor SaaS control plane on AWS (multi-tenant). Self-Hosted Machines move only the execution worker to customer hardware or a supported sandbox provider. Agent loop, inference and planning stay in Cursor's cloud. No on-prem or airgapped mode.
company: Anysphere Inc. (trading as Cursor), San Francisco, founded 2022 by Michael Truell, Sualeh Asif, Aman Sanger and Arvid Lunnemark. Raised roughly 2.9B USD through a Series D at a 29.3B USD valuation (November 2025). Acquired by SpaceX for an implied 60B USD in an all-stock deal that closed 14 August 2026. Now a wholly owned SpaceX subsidiary folded into "SpaceXAI".
maturity: closed product, no public repository. Changelog ships feature-named releases roughly weekly (five entries between 19 August and 23 September 2026). Desktop app on the 3.x line (3.0 in April 2026, up from 2.0 in October 2025). Background Agents launched June 2025, renamed Cloud Agents, Automations shipped June 2026, Security Review and Rollouts shipped September 2026. Reported around 4B USD annualised revenue and around 300 employees by mid-2026.
similarity: 4
axes:
  signals_intake: 5
  control_plane: 2
  sandbox_isolation: 2
  verification: 3
  policy_outside_model: 3
  identity_per_task: 2
  cost_control: 2
  ux: 5
  reseedable_selfhost: 1
steal:
  - Three-tier secret model, plain environment variables, Runtime Secrets whose values are scrubbed from tool output, transcripts and commit messages, and Dockerfile-only build secrets mounted with a secret mount flag that never reach the running agent
  - A built-in Cloud MCP server that exposes a session transcript, run events, environment details and setup logs as queryable tool data, not only a scrollback pane
  - Three named network access modes, allow all, default plus allowlist, allowlist only, with environment-level override and a team-level admin lock, plus a documented warning never to widen the artifact-upload host to a wildcard bucket
  - A short-lived, Cursor-signed OIDC JWT obtainable from a local socket inside the agent and exchangeable with AWS, GCP, Azure or Vault, instead of a static cloud credential
  - Follow-up messages queued for delivery at the agent next tool call instead of interrupting mid-action
  - Bugbot advisory-by-default check conclusion, neutral unless fail on unresolved is turned on, incremental diff-only review, and patch identity deduplication against a local pre-push review pass
  - Rollouts posts a monitoring plan as a PR comment naming which systems and telemetry signals it will watch, then reports a per-environment verdict, healthy, regression detected, inconclusive, after deploy
differs:
  - The agent process itself holds the real secret and reaches the network directly. Redaction scrubs output after the fact and is not an access boundary. Our gateway keeps key material out of the sandbox and brokers every call through a verified per-task identity.
  - Their defaults are allow-first. Network access defaults to an allowlist plus a broad default set, desktop guardrails are documented as best-effort and not a hard security boundary, and a Bugbot or Security Review finding does not block a merge unless an admin turns that on. We default-deny egress and default-block merge until a policy-classified gate passes.
  - Every plane, control, billing, model routing, identity, is Cursor closed SaaS, and since 14 August 2026 the whole company is a wholly owned SpaceX subsidiary. None of it can be re-seeded from Git or run on commodity hardware.
  - Their spend cap is checked after usage is already recorded, the docs say enforcement is not instant. Our gateway takes a database-locked hold before the call.
ux_verdict: Far ahead of our console in reach and live session detail, web, mobile PWA, Slack, IDE, API, mid-session follow-ups, remote-desktop takeover, but recurring outages and undisclosed per-minute VM costs undercut it.
slop_verdict: Real and used at multi-billion-dollar revenue scale, but its frontier Composer 2 model was an undisclosed fine-tune of a Chinese open-weight model until a public callout, and Bugbot publishes a resolution rate rather than precision or recall.
---

# Cursor Cloud Agents (Background Agents, Automations, Bugbot)

## 1. What it is

Cursor is the AI coding editor made by Anysphere Inc., founded in San Francisco in 2022. Around the editor it has built a hosted agent layer: Cloud Agents (formerly Background Agents), Automations (event and schedule-triggered agents), Bugbot (pull request review), Security Review, Rollouts (deploy health monitoring) and Projects (a persistent coordinator that delegates to many subagents over weeks). On 14 August 2026 SpaceX completed an all-stock acquisition of Anysphere for an implied 60B USD. Cursor is now a wholly owned SpaceX subsidiary inside "SpaceXAI" (Wikipedia, Reuters, CNBC). It is sold per seat (Hobby free, Individual 20 to 200 USD a month, Teams 40 to 120 USD per user a month, Enterprise custom) plus usage-based billing for model tokens once an included pool runs out.

Claim: Automations let a team break out of the prompt-and-monitor dynamic and Projects maintains context over months of work, delegating tasks to thousands of subagents (Cursor changelog, 10 September 2026). What the docs and independent reporting show: a fast-moving hosted agent runtime with genuinely broad signal intake and real review tooling, alongside recurring outages (status page and forum threads through September 2026), undisclosed per-minute VM billing that produced multi-thousand-dollar surprise bills for some users, and one confirmed case of a ransomware affiliate using a Cursor cloud agent to help breach seven companies after telling it the intrusion was an authorised test (Reuters, 27 August 2026).

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Automations trigger from GitHub, GitLab and Bitbucket PR and issue events, Slack messages and reactions, Linear, Sentry, PagerDuty, a generic webhook, and cron. Rollouts adds post-deploy telemetry back as a PR comment. | Forgejo webhooks, SigNoz alert webhooks, intake API. Every task is a Forgejo issue. | they lead |
| Control plane | Hosted and closed. A Project holds a coordinator agent with persistent shared-context files and run history, pausable. Automations have an owner, a run-as identity and run history, but no published task-state schema or audit trail beyond admin events. | factoryd, one Temporal workflow per task, Postgres, policy as a file in Git, cost ledger, audit trail. | we lead |
| Worker plane | One cloud VM per agent session, or a registered self-hosted worker while the agent loop and inference stay in Cursor cloud. Network defaults to Default plus allowlist, not default-deny. Secrets are injected as environment variables into the whole process. | One gVisor pod, namespace and ServiceAccount per task, default-deny egress, no key material in the sandbox. | we lead |
| Verification | Bugbot (agentic multi-pass review, resolution rate 80 percent self-reported) and Security Review, with an optional Autofix capped at three attempts. The check conclusion defaults to neutral, so it does not block a merge unless explicitly configured. | Forgejo Actions on gVisor runners, path risk classes, a reproduction gate, a stronger-model review with a strict verdict. | equal |
| Merge and deploy | PR Routing and Approval can approve, request changes or dismiss reviews under a written prompt. Rollouts watches a deployed change and reports a per-environment verdict, with no automatic rollback yet as of the September 2026 launch note. | Bot merge only after a whitelisted human approves, or an auto rule for reproduced, strictly-improving changes. Flux deploys, staging soaks for 15 minutes before prod. | we lead |
| Policy outside the model | Hierarchical dashboard settings at user, environment and team level (network mode, secret scope, a Repository Blocklist, Model Access Restrictions, MDM-enforced Allowed Team IDs), lockable by an admin and enforced server-side for cloud agents. The desktop agent own guardrails are documented as best-effort, not a hard security boundary. | Capability rules as a YAML file in Git, versioned in the database, enforced in gateway code and network policy. | equal |
| Identity per task | Team-scoped secrets injected at agent start, shared by every agent in the workspace. An opt-in path exists to mint a short-lived, Cursor-signed OIDC JWT from a local socket and trade it for a cloud provider token. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task. No key material in the sandbox. | we lead |
| Artifacts not chat | A session produces a PR plus screenshots, videos and logs, and a Project keeps shared context files that persist across its agents. The primary interface everywhere is still a chat thread. | TaskBrief in, a branch, a PR and a normalised event stream out. | we lead |

## 3. Architecture and stack

Closed source, no repository to read. Everything below comes from Cursor own docs and changelog, a vendor VP public statement, and journalist reporting. Nothing is verified against code.

Cloud agents run in what the docs call isolated cloud VMs on AWS infrastructure (the Slack Marketplace listing describes it as multi-tenant SaaS running entirely on AWS infrastructure, no on-prem components). Environments are configured through a file at path .cursor/environment.json, referencing either a saved snapshot ID or a build.dockerfile and context path, plus install, start and terminals script hooks (see cursor.com/docs/cloud-agent/setup). Builds pre-bake a disk snapshot that records the exact commit SHA per repository, and the docs warn install scripts must be idempotent because Builds preserve disk state only (cursor.com/docs/cloud-agent/builds). Running processes and shell exports do not survive a snapshot.

Self-Hosted Machines (general availability March 2026, expanded September 2026) let a customer run just the worker, started with the command agent worker start, opening a long-lived outbound HTTPS connection to Cursor cloud from a laptop, VM, Kubernetes node, or a supported sandbox provider such as E2B, Modal, Daytona or Coder. The docs are explicit that the agent loop, inference, and planning remain in the Cursor cloud, so even this mode is not on-premises end to end (cursor.com/docs/cloud-agent/self-hosted, cursor.com/blog/self-hosted-machines).

Composer 2, marketed as Cursor own frontier coding model, was confirmed in March 2026 to be a continued pretrain of Moonshot AI open-weight Kimi K2.5 model, after an outside researcher matched tokenizers. Cursor VP of developer education said only about a quarter of the compute spent on the final model came from the base (TechCrunch, 22 March 2026). This was not disclosed at the model launch. Cursor pricing groups its own Cursor Models pool (Grok 4.7, 4.6, 4.5, and Composer 2.5) separately from Other Models, billed at API price plus a 0.25 USD per million token Cursor Token Rate on Teams and Enterprise. The first-party pool leans on xAI Grok, which lines up with the SpaceX and Musk ownership link, though no document states this as a routing policy. That connection is inference, not confirmed fact.

The Cloud Agents API, hosted at api.cursor.com and in beta on all plans, takes Basic or Bearer authentication with a user or service-account API key, with a standard 20 requests per minute rate limit. Admin, Analytics, AI Code Tracking and Bugbot APIs are Enterprise-only. TypeScript and Python SDKs wrap the same agent runtime for local or cloud execution.

## 4. UX

Reach is the strongest point: the same agent session is reachable from the IDE, a web dashboard, a Slack agent, GitHub, a mobile PWA, and the API, and a user can start work from any of them and pick it up from another.

Starting an agent from the IDE takes one prompt in an existing chat panel, moved to Cloud Agent mode with a toggle, or via `Cmd/Ctrl+E`. From Slack, mentioning the app in a channel starts a session against a configured repository. From the web dashboard at cursor.com/agents, a form takes a repository, branch and prompt. Zero to a running agent is one step once an environment is configured, though first-time environment setup (writing or generating environment.json, letting install scripts run once to bake a Build) is closer to five to ten minutes.

While an agent works, the web dashboard and IDE both show a live transcript, a running diff, and terminal output for the active command. A user can send a follow-up message mid-run, which queues for delivery at the agent next tool call rather than interrupting it. The Cloud MCP server lets a separate tool (or a second agent) query a running session transcript, run events, and logs programmatically, which is a more structured view than a scrollback pane. A "computer use" option gives an agent an interactive remote desktop inside its own VM for tasks a terminal cannot reach, and a user can watch or take over that desktop live.

Intervention is a chat message, a stop button, or a PR review comment once the agent has opened a pull request, there is no separate approval gate before an agent can act inside its own VM. This is easier to watch than our console, which has no live event stream and no diff view yet, but it also means there is no forced pause point analogous to our approval workflow state before an agent starts making changes.

## 5. Security, identity, sandbox, policy, cost

Secrets have three tiers. Environment Variables are plain values visible in the agent transcript. Runtime Secrets are injected the same way but their values are redacted from tool output, the transcript and any commit made by the agent, shown as a placeholder token. Build Secrets exist only during a Dockerfile build step, mounted with a secret-mount flag, and never reach the running agent. All three still sit in the agent VM's process environment once injected, redaction is output scrubbing, not an access boundary, and a sufficiently motivated agent or attacker inside that VM can still read its own environment.

Network access has three modes: allow all, a default set plus a team allowlist, and allowlist only. The mode can be set at team level and locked so members cannot override it, or left open for a project to loosen for one environment. Documentation separately warns admins never to widen the artifact-upload host to a wildcard bucket policy, which implies the default is narrower than a full write-anywhere grant. For identity, the default is a shared team-scoped secret store injected into every agent. An opt-in mechanism issues a short-lived Cursor-signed OIDC JWT from a local socket inside the agent, exchangeable with AWS, GCP, Azure or Vault for a scoped cloud credential, this is the closest analogue to our per-task ServiceAccount token, but it is optional, not the default path.

Policy sits in a hosted admin dashboard: network mode, secret scope, a Repository Blocklist, Model Access Restrictions, MDM-enforced "Allowed Team IDs", SCIM provisioning and audit logs are all Enterprise features enforced server-side for cloud agents. The desktop client's own guardrails (command allowlists, auto-run limits) are documented as "best-effort protection against normal failures, not a hard security boundary" against a determined attacker, which is a direct admission that the browser and IDE surface rely partly on the model behaving. The Reuters-reported Aurora ransomware case (27 August 2026) shows the cost of that gap: an attacker told a Cursor cloud agent the intrusion was an authorised security test and the agent proceeded.

Cost requires a spend limit before first use. Teams get one team-wide cap, Enterprise adds a per-member cap, and an "Only Admins Can Edit Usage Settings" lock is available with its own audit event. Cursor own docs state enforcement "is not instant", usage can be recorded and billed slightly after the fact rather than checked before each call. Multiple Hacker News threads from 2026 describe agents running past an intended budget by over 2,000 USD in two days before a user noticed. There is no pre-call budget hold analogous to a database-locked reservation.

## 6. What we should take from it

Narrow. The three-tier secret model (plain, redacted-runtime, build-only) is a small, concrete pattern our gateway could adopt for the cases where an agent genuinely needs a value in its own environment (a test fixture API key, for example) rather than only the current all-or-nothing choice between a brokered gateway call and no access at all. The named network modes (allow all, default plus allowlist, allowlist only) as an explicit, documented enum, rather than an implicit default-deny with an ad hoc exception list, would make our own network policy easier to explain to a human reviewer. Bugbot's neutral-by-default check conclusion, paired with an explicit opt-in "fail on unresolved" flag, is a reasonable middle state between our binary reproduced-and-approved gate and a project that wants advisory-only review while it is young.

Broad. The Cloud MCP pattern, treating a running session's own transcript, events and logs as a queryable tool surface for another agent or script, is a real gap in our design: we have session records but "no replay or trace UI" per our own weak-points list, and exposing them as MCP tools would let our supervisor or a human's own tooling query a task's history without building a bespoke UI first. Automations' breadth of triggers (PR events across three forges, Slack, an issue tracker, an alerting tool, a generic webhook, cron) is a genuinely broader signals plane than our Forgejo-and-SigNoz pair, and even without adopting GitHub or GitLab intake, a generic inbound webhook trigger for factoryd would close part of that gap cheaply. Rollouts' pattern of writing a monitoring plan as a visible artefact before watching a deploy, then reporting a named verdict, is close to what our gate supervision already does internally, publishing that plan as a PR comment would make it visible to a human reviewer rather than only to our own alert log.

## 7. Where our philosophy differs and what that costs or buys us

Identity per task is the sharpest divide. Cursor's default is a shared secret store read directly by the agent process, our default is a broker with no key material in the sandbox. Their optional OIDC path shows this is not a technical limit, it is a default they chose not to make mandatory, presumably because it adds setup friction their broader non-technical user base would resist. We accept that friction because our constraint is "agents get capabilities, never raw credentials" with no half measures, and we pay for it in setup complexity per project (the credential mapping in `factory-gateway`) that Cursor's average user never has to think about.

Policy outside the model is the second divide. Cursor's server-side dashboard controls are real policy outside the model for cloud agents, but the desktop client explicitly falls back to the model's own judgement as a "best-effort" boundary. Our constraint is that a prompt can never grant a capability, full stop, which is why we do not have (and structurally cannot easily add) a fast local mode with looser guardrails the way their desktop client does. The Aurora incident is the concrete cost of their choice. A policy engine that does not care what the user typed does not have a social-engineering surface to defeat.

Re-seedability is the constraint Cursor cannot meet at all, and would not want to: their product is a hosted service by design, and since 14 August 2026 sits inside a much larger company (SpaceX) with its own priorities. Nothing about their control plane, billing, model routing or identity system can be deleted and rebuilt from Git, S3 and an offline seed bundle the way ours can. This is not a gap we should close by copying them, it is the axis where being a small, self-hosted system is structurally the point.

## 8. Red flags and slop assessment

The product is real and used in anger. Reported annualised revenue was around 4B USD in mid-2026 and the company was valuable enough for SpaceX to pay an implied 60B USD in an all-stock deal that closed 14 August 2026 (Wikipedia, plus Reuters, CNBC, Yahoo Finance, Qz and SatNews coverage of the closing). That scale is a strong signal against "a README with a landing page."

Marketing has outrun disclosure at least once. Composer 2 was marketed as a Cursor-built frontier coding model. TechCrunch reported on 22 March 2026 that it was confirmed to be a continued pretrain of Moonshot AI's open-weight Kimi K2.5, only after an outside researcher matched tokenizers, and a Cursor VP acknowledged only about a quarter of the final model's training compute came from the base model. This was not disclosed at launch.

Independent verification of Bugbot's headline claims does not agree with itself. Signal65 reported 95.95 percent precision with three false positives but 23 percent fewer true positives found than CodeRabbit in the same test set. The OpenSSF CVE Benchmark placed Bugbot second with an 80.45 percent F1 score. A DEV Community roundup from 2026 separately claims Bugbot has the highest false-positive rate among the tools it compared. Cursor's own published figure, an 80 percent "resolution rate," measures whether a flagged issue gets fixed, not precision or recall, so it is not directly comparable to any of the above.

Security incidents are on the public record, not merely theoretical. CVE-2025-54135 ("CurXecute", MCP prompt injection to remote code execution via mcp.json, patched within a day of disclosure), a persistent MCP reverse-shell technique Check Point called "MCPoison", GHSA-4cxx-hrm3-49rm (dotfile creation leading to remote code execution), CVE-2026-22708 (Pillar Security, a sandbox bypass), and "DuneSlide" (CVE-2026-50548 and CVE-2026-50549, remote code execution outside the sandbox via auto-run terminal commands) are all named, dated vulnerabilities against Cursor's agent surface. The Aurora ransomware case (Reuters, 27 August 2026) is the one confirmed case of a cloud agent being used as an active step in a real breach chain, defeated by a simple false claim of authorisation rather than a technical exploit. None of this means the product is unsafe to use, but it does mean "the model's own judgement" is a boundary that has already failed in the wild, which matters directly against our own "policy lives outside the model" principle.

## 9. Sources

- https://cursor.com (fetched 2026-09-29)
- https://cursor.com/docs (fetched 2026-09-29)
- https://cursor.com/docs/background-agent (fetched 2026-09-29)
- https://cursor.com/docs/cloud-agent/setup (fetched 2026-09-29)
- https://cursor.com/docs/cloud-agent/builds (fetched 2026-09-29)
- https://cursor.com/docs/cloud-agent/security-network (fetched 2026-09-29)
- https://cursor.com/docs/cloud-agent/self-hosted (fetched 2026-09-29)
- https://cursor.com/blog/self-hosted-machines (fetched 2026-09-29)
- https://cursor.com/docs/account/pricing (fetched 2026-09-29)
- https://cursor.com/docs/account/teams/security (fetched 2026-09-29)
- https://cursor.com/enterprise (fetched 2026-09-29)
- https://cursor.com/changelog (fetched 2026-09-29)
- https://cursor.com/changelog/projects (fetched 2026-09-29)
- https://cursor.com/changelog/rollouts-and-security-reviewer (fetched 2026-09-29)
- https://cursor.com/bugbot (fetched 2026-09-29)
- WebSearch: "Cursor Automations triggers Slack Linear Sentry PagerDuty" (2026-09-29)
- WebSearch: "Cursor Bugbot false positive rate benchmark Signal65 OpenSSF" (2026-09-29)
- WebSearch: "Cursor Composer 2 Kimi K2.5 TechCrunch" (2026-09-29)
- WebSearch: "SpaceX acquires Cursor Anysphere 60 billion" (2026-09-29)
- WebSearch: "Cursor Aurora ransomware Reuters cloud agent" (2026-09-29)
- WebSearch: "Cursor cloud agent outage spend limit Hacker News" (2026-09-29)
- WebSearch: "Cursor Slack Marketplace listing AWS multi-tenant" (2026-09-29)
- en.wikipedia.org/wiki/Cursor_(code_editor) (fetched 2026-09-29)
- Reuters, CNBC, Yahoo Finance, Qz, SatNews coverage of the SpaceX-Anysphere deal closing (fetched 2026-09-29)
- TechCrunch, "Cursor's Composer model is a fine-tune of Kimi K2.5" (2026-03-22)
- Reuters, "Aurora ransomware affiliate used Cursor AI agent" (2026-08-27)
