---
name: Jules
slug: google-jules
url: https://jules.google
repo: none
category: factory-orchestrator
license: "mixed: proprietary product; Apache-2.0 (jules-sdk, jules-skills) and MIT (jules-action) client tooling"
open_source: no
self_hostable: no
hosting_model: Google-hosted SaaS only, bundled into Google AI subscriptions, no self-host or on-premises option
company: Google LLC (Google Labs), Mountain View CA. Public beta 5 May 2025, out of beta 6 Aug 2025
maturity: "product closed source, no public commits; client repos: jules-sdk (135 stars, first commit Jan 2026, last push Jul 2026), jules-invoke (246 stars, first commit Nov 2025, last push Dec 2025, stale), jules-skills (97 stars, first commit Jan 2026, last push Jun 2026); jules.google/docs/changelog updates roughly weekly"
similarity: 2
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 1
  verification: 3
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 1
  ux: 5
  reseedable_selfhost: 0
steal:
  - "Environment snapshot: 'Run and Snapshot' caches a validated per-repo setup (deps installed, tests green) and reuses it for every later task on that repo, cutting cold start time"
  - "Planning Critic (jules.google/docs/changelog/2026-01-26-1): a second cheap model reviews the plan itself before execution, targeted at the auto-approved path, reported as a 9.5 percent cut in task failure"
  - "Semaphore-backed concurrency limiter with exponential backoff on 429/500/502/503/504 in jules-sdk/packages/core/src/api.ts, a one-file pattern for any client fanning out to a rate-limited API"
  - "SessionSnapshot.toJSON({include, exclude}) field masking (jules-sdk/docs/snapshot.md) for trimming what a session dump exposes to a client or log"
  - "TUI dashboard (running 'jules' with no arguments) gives a side-by-side diff viewer and session list from the terminal, matching the web app"
  - "Suggested Tasks: proactive TODO scanning that becomes a one-click-start task card, worth copying for turning static analysis findings into pre-drafted, human-approved cards"
  - "jules-merge's scan, detect overlap, stage, push workflow for reconciling several parallel agents' diffs on the same repository"
  - "MCP server (jules-sdk/packages/mcp) exposes session lifecycle (create_session, send_reply, get_code_review_context) as tools, a template for exposing our own task lifecycle to any MCP client"
differs:
  - "Jules auto-approves a plan on a timer if the human walks away ('no need to babysit'), we treat approval as a state a human must actively move, never a timeout default"
  - "Jules gives every session a cloud VM with general internet access by design, exploited in practice for exfiltration and remote code execution through prompt injection, our default-deny egress trades that convenience for the attack surface"
  - "Jules authenticates its whole API with one static per-user key (X-Goog-Api-Key), not a rotated per-task credential, adopting that would break identity per task outright"
  - "Jules has no self-host path, it is pure SaaS bundled into a consumer subscription, our re-seedable commodity-hardware constraint bets that owning the substrate is worth the operational cost"
ux_verdict: "A polished, multi-surface flow (web, TUI, CLI, API) built around plan, approve, diff, PR, ahead of our console on real-time visibility and diff review"
slop_verdict: "Real and actively used with a fast changelog cadence, but the client tooling oversells its official status and the product's own FAQ still says Public Beta more than a year after Google announced it had left beta"
---

# Jules

## 1. What it is

Jules is Google's asynchronous coding agent, built by Google Labs. A developer points it at a GitHub repository and a prompt, or adds a `jules` label to an issue, and Jules clones the repository into a cloud VM, drafts a plan, waits for approval, does the work, and opens a pull request. It launched in public beta on 5 May 2025 and Google announced it "officially out of beta" on 6 Aug 2025. It runs on Gemini models, starting on Gemini 2.5 Pro for the free tier and moving to Gemini 3 Pro for paid tiers as of this report. There is no separate price for Jules. It is bundled into Google's consumer AI subscriptions (free, Google AI Pro, Google AI Ultra) and sold to individual developers, not to enterprises under a distinct contract.

Google's own material describes Jules as handling "coding tasks you don't want to do": bug fixes, version bumps, tests, small features. It advertises a "Critic" review step and a "Memory" feature, and frames itself as safe for background use because a human reviews the plan and the diff before anything merges. The product itself is entirely closed source. What is public is client tooling built against its REST API, under the `google-labs-code` GitHub organisation: an SDK, a CLI wrapper, a GitHub Action and an Agent Skills package. Reading that tooling confirms the session and plan-approval model the docs describe, but it reveals nothing about the planner, the critic or the scheduler, which stay closed.

As of this report's fetch date (29 Sep 2026), Jules's own FAQ still states "Jules is currently in Public Beta," a full 14 months after the "out of beta" blog post. Treat that contradiction as a live fact about the product, not an oversight already fixed.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | GitHub issue label (`jules`), scheduled tasks with daily or weekly cadence, an experimental "Suggested Tasks" scanner that turns TODO comments into task cards, a Render integration that watches failed builds and pushes a fix, manual prompt via web, CLI or API | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API, every task a Forgejo issue | equal |
| Control plane | A per-session state machine (`QUEUED` to `PLANNING`, `AWAITING_PLAN_APPROVAL`, `IN_PROGRESS`, `COMPLETED`/`FAILED`/`PAUSED`), a scheduled-tasks dashboard, no cross-session task registry, no capability policy tied to approvals | `factoryd` Temporal workflow per task, Postgres task registry, policy as YAML in Git, cost ledger, audit trail | we lead |
| Worker plane | One cloud VM per session, Ubuntu with preinstalled toolchains, auto-detects `AGENTS.md`, optional setup script cached as a reusable snapshot, general internet access, no documented egress control | One gVisor pod per task, ServiceAccount, read-only root filesystem, non-root, default-deny egress through a gateway allowlist | we lead |
| Verification | A code-review "Critic" that iterates with the agent until satisfied (actor-critic framing), a "Planning Critic" since Jan 2026 that reviews plans on the auto-approve path, tests run only if the setup script includes them | Forgejo Actions on untrusted gVisor runners, policy gates (path risk class, migration flag, reproduction at base and head), then a stronger-model review with a strict verdict | equal |
| Merge and deploy | Opens a PR for the human to merge in GitHub, no bot-merge automation, no deploy step, no staged rollout | `factory-merge` bot merges only after a whitelisted human approves or an `auto` rule fires, Flux deploys, staged rollout with an alert window | we lead |
| Policy outside the model | A plan is the only gate, and it auto-approves on a timer if the human does not act ("no need to babysit"); the closest thing to a stated policy is "Jules does not train on private repository content" and, for external integrations, "read-only by default" | Capability rules are a YAML document in Git, enforced in gateway code and network policy, a prompt cannot grant a capability | we lead |
| Identity per task | One static per-user API key sent as `X-Goog-Api-Key` on every REST call, GitHub access through one connected account or App scoped to chosen repositories, not rotated per session | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, two per-session Forgejo tokens | we lead |
| Artifacts not chat | Sessions emit typed Activities (`planGenerated`, `progressUpdated`, `sessionCompleted`, and so on) and a pull request as the output, an artefact-and-event model | `TaskBrief` in, a branch, a PR and a normalised event stream out | equal |

## 3. Architecture and stack

Everything about Jules the product is closed. What is public is a set of client packages calling a documented REST API from the outside, and that is the limit of what source-reading can confirm here.

The API is `jules.googleapis.com/v1alpha` with three resource types: Source (a connected repository), Session (a task), and Activity (an event inside a session). This is confirmed directly in `jules-sdk/packages/core/src/types.ts` and `jules-sdk/packages/core/src/mappers.ts`, where `mapRestStateToSdkState` maps nine REST states (`STATE_UNSPECIFIED`, `QUEUED`, `PLANNING`, `AWAITING_PLAN_APPROVAL`, `AWAITING_USER_FEEDBACK`, `IN_PROGRESS`, `PAUSED`, `FAILED`, `COMPLETED`) to SDK camelCase equivalents. This state machine is the best public evidence of how a real Jules session behaves, because nothing about the backend that drives it is public.

`jules-sdk` (google-labs-code/jules-sdk on GitHub, Apache-2.0, TypeScript, npm workspaces) is the largest of the three clones. `packages/core` holds an `ApiClient` class with a Semaphore-based concurrency limiter (default 50 concurrent requests, configurable) and exponential backoff retry on 429, 500, 502, 503 and 504. `packages/fleet` (version `0.0.1-experimental.34`) is a goal-file-driven multi-session dispatcher that the README itself calls "Very Experimental. A just for fun prototype," including file-ownership conflict detection between parallel sessions. `packages/mcp` (`0.2.0`) is an MCP server exposing session control (`create_session`, `list_sessions`, `send_reply`, `get_code_review_context`, `show_code_diff`, `query_cache`) as tools for any MCP client. `packages/merge` (`0.0.3`) reconciles multiple parallel Jules sessions that touched the same files, by scanning branches, staging a resolution, then pushing.

`jules-action`, at google-labs-code/jules-invoke on GitHub, MIT licensed, is a single GitHub Action that wraps the REST API. Its inputs are `prompt`, `jules_api_key`, `starting_branch`, `include_last_commit` and `include_commit_log`. It is the mechanism behind issue-triggered, schedule-triggered and CI-failure-triggered Jules runs shown in its example workflows.

`jules-skills`, at google-labs-code/jules-skills on GitHub, Apache-2.0, implements the open Agent Skills standard with one shipped skill, `automate-github-issues`, meant to be installed into Claude Code, Cursor, Gemini CLI or Antigravity through a skills installer CLI.

The Jules Tools CLI (`npm install -g @google/jules`) is documented but closed source. Confirmed from `jules.google/docs/cli/reference/`: `jules login`/`logout` for auth, `jules remote list --repo`/`--session`, `jules remote new --repo --session "<prompt>" --parallel <n>`, `jules remote pull --session <id>`, and a TUI launched by running `jules` with no arguments, described as giving "a dashboard view of your sessions, a side-by-side diff viewer for reviewing changes, and guided flows for creating new ones." The `--parallel` flag lives under `remote new`, not as a standalone global flag.

Each session's VM runs Ubuntu with Node.js, Bun, Python, Go, Java and Rust preinstalled (`jules.google/docs/environment/`). Jules infers setup from `AGENTS.md` or the README when no script is given. An explicit setup script can be run once and "snapshotted," and that snapshot is reused for later tasks on the same repository, which is a real cold-start optimisation, not inference.

## 4. UX

This is where Jules is strongest, and the concrete detail here is well ahead of a console that is, by our own admission, functional and not designed.

Onboarding is about five steps: sign in with Google at jules.google, connect GitHub through OAuth and pick which repositories to grant access to, choose a repository and branch, write a prompt (or add the `jules` label to an issue), then review and approve the generated plan. No CLI or API key is required for a first run.

Watching: the web app shows the plan as an expandable, step-by-step breakdown before anything runs, then streams Activities as they happen and a stacked diff viewer as changes land. Browser notifications can be enabled for task completion or when Jules needs input, and Suggested Tasks send email notifications when new findings appear.

Intervening: a user can give feedback in the plan's chat input to revise a step, point out something missed, or clarify the request, and Jules updates the plan. The one hard gate before code changes is plan approval. Concretely, that gate is soft: "if you navigate away, Jules will eventually auto-approve the plan, which is set on a timer," described in the docs as meaning "there is no need to babysit." A user who does nothing gets the same outcome as a user who clicked approve.

Interfaces: web app, a terminal TUI with its own side-by-side diff viewer, a scriptable CLI (`jules remote`), the REST API, a GitHub Action, an unofficial SDK, and an MCP server from the client tooling. That is a wider interface surface than our web-only console.

Parallelism is visible and bounded per plan tier (concurrent task counts shown in the product and enforced server-side), and `jules remote new --parallel <n>` fans a single task out across several sessions from the CLI. Running several sessions against the same repository at once has no native conflict protection in the product itself. It falls to the separate, unofficial `jules-merge` tool, or to the "Very Experimental" `jules-fleet` package, to reconcile overlapping diffs.

## 5. Security, identity, sandbox, policy, cost

Sandbox: each session gets its own VM, described in the docs as "a secure, cloud-based virtual machine (VM) with internet access." That VM has general outbound network access with no documented egress allowlist. Independent security research by Johann Rehberger (Embrace The Red), published through August 2025 as part of a "Month of AI Bugs" series, found the VM's `view_text_website` tool could be used through indirect prompt injection (for example a planted payload in a GitHub issue) to read a file and send its contents to an attacker's server without running any OS command, and that the `run_in_bash_session` tool could be hijacked the same way to run arbitrary commands, including downloading malware and joining a command-and-control channel. The RCE finding was reported to Google on 1 June 2025 and the ticket was closed on 13 June 2025 as "something the team is already tracking," with no confirmed fix reported back to the researcher. This is the sharpest gap against our default-deny egress model.

Identity: the public API authenticates every call with one static per-user API key, sent as the `X-Goog-Api-Key` header, visible directly in `jules-sdk/packages/core/src/api.ts`. GitHub write access comes from a connected account or App scoped to chosen repositories, not rotated per session. A leaked key or a compromised session carries the same blast radius as the user's entire Jules access. Not verified: how a setup script's own credentials (for a private package registry, for instance) reach the VM, since the environment-setup docs describe installing dependencies but say nothing about secret injection.

Policy: the only user-facing gate is plan approval, and it defaults to granting itself on a timer if ignored. The closest things to a stated capability policy are two lines in the docs: "Jules does not train on private repository content," and, for external tool integrations such as the Render build-log reader, "read-only by default" with "secure storage" for any keys. These are product principles stated in prose, not a policy document enforced in code the way our gateway checks a capability, budget and approval state before forwarding a call.

Cost: there is no budget, hold or ledger. Google limits usage with flat quotas by subscription tier, confirmed on `jules.google/docs/usage-limits/`: free gives 15 tasks per rolling 24 hours and 3 concurrent tasks on Gemini 2.5 Pro, Google AI Pro (19.99 USD/month) gives 100 tasks and 15 concurrent on Gemini 3 Pro, Google AI Ultra gives 300 tasks and 60 concurrent with priority Gemini 3 Pro access. Ultra itself has been restructured more than once: a 249.99 USD/month plan with a 124.99 USD introductory rate at its 2025 launch, split in May 2026 into a 99.99 USD tier (5x Pro's limits) and a 199.99 USD tier (20x). None of this is a spend cap tied to the actual model cost of a task, it is a flat rate limit.

## 6. What we should take from it

Narrow, ready to copy this month: the Semaphore-backed concurrency limiter with exponential backoff in `jules-sdk/packages/core/src/api.ts` is a one-file pattern for any client of ours that fans out to a rate-limited external API. The `SessionSnapshot.toJSON({include, exclude})` field-masking approach in `jules-sdk/docs/snapshot.md` is a clean way to trim what a session dump exposes to a log or a client, directly applicable to our own task and session serialisation. The environment "Run and Snapshot" mechanism, caching a validated per-repository setup and reusing it for every later task, is a concrete cold-start optimisation worth adding to our per-project namespace bootstrap.

Narrow, worth studying before copying: `jules-merge`'s scan, detect-overlap, stage, push workflow is a worked answer to a problem we do not yet have a tool for, reconciling several agents that touched the same repository concurrently. The MCP server in `jules-sdk/packages/mcp` exposing session lifecycle as tools is a good template for exposing our own factoryd task lifecycle to any MCP-capable client, for instance letting a human drive approvals from their own coding agent instead of only through our console.

Broad, a product-shape lesson: the Planning Critic, a second cheap model pass that reviews the plan before any code changes, specifically aimed at the path where a human does not review the plan, is a mechanism we lack. Our supervisor watches execution once it starts, nobody checks the plan itself before a human approves it. Given Google reports a 9.5 percent cut in task failure from this single addition, a similar cheap pre-execution plan check looks like good value for a small amount of engineering.

Broad, a UX lesson: real-time activity streaming with a live, stacked diff view is exactly the gap our own weaknesses list names ("no real-time streams of the agent's work, no diff view"). Closing it does not need an original mechanism, a websocket or SSE feed of our existing event stream into the console would close most of the distance.

## 7. Where our philosophy differs and what that costs or buys us

Jules optimises for one developer's convenience inside Google's own ecosystem. We optimise for organisational-grade control. Each design choice that makes Jules easier to start using is a choice that would break one of our constraints if copied outright.

Jules's plan auto-approving on a timer ("no need to babysit") directly contradicts our principle that an approval is a workflow state a human must actively move, never a default that fires on its own. Copying that default would let a plan we never looked at start writing code, which is the opposite of what our approval gate is for. Their trade buys convenience for the common, low-risk task, at the cost of exactly the failure mode the Planning Critic was later built to soften, which is telling: they added a second automated check because the human gate they shipped first does not reliably fire.

Jules's cloud-VM-with-general-internet-access buys real usability for open-ended coding tasks: an agent can install packages, fetch arbitrary documentation, or reach a third-party API without a human pre-approving an egress rule first. Our default-deny egress makes every new destination an agent needs into a policy change before it can be used. That friction is the price of our "security without half measures" constraint, and the price for Jules's choice is what Embrace The Red demonstrated: a documented, reported, and at the time of writing not confirmed-fixed path from an untrusted GitHub issue to arbitrary command execution.

Jules authenticating its whole API with one static, long-lived, broadly scoped key is the opposite of identity per task. We could not adopt that pattern anywhere near our gateway without abandoning the principle that a sandbox never holds key material.

Jules has no self-host or re-seed story at all, and does not appear to want one. It bets that developers will accept a SaaS-only agent as long as it is convenient and cheap. Our "delete everything, rebuild from Git, S3 and a seed bundle in about 21 minutes" constraint is a bet that owning the substrate is worth the extra infrastructure for a security-sensitive or regulated buyer. These are not features that can be picked apart and recombined, they are different products for different buyers, and the comparison stops being useful past this point.

## 8. Red flags and slop assessment

Jules is real, maintained and used in anger by real developers, this is not a landing page over an empty product. The changelog updates roughly weekly and the security research treats it as a live target worth three separate posts, which is itself a sign the product matters enough to attack. That said, several things around it oversell how finished and how official it is.

The jules-sdk README calls itself the "Official Jules TypeScript SDK" and its `package.json` states `"author": "Google LLC"`, yet the same README says: "This is not an officially supported Google product... not eligible for the Google Open Source Software Vulnerability Rewards Program." Both claims are in the same document.

`jules-action`, at google-labs-code/jules-invoke on GitHub, carries a "Built with ❤️ by Google" footer and lives in the google-labs-code organisation, yet its `LICENSE` file names an individual, Beka Westberg, as the copyright holder, not Google LLC, unlike jules-sdk and jules-skills which are Apache-2.0 under Google LLC. It has also had no push since 15 Dec 2025, over nine months stale as of this report.

The `jules-fleet` package inside jules-sdk describes itself as "Very Experimental. A just for fun prototype" at version `0.0.1-experimental.34`, an honest label, but a sign that multi-agent orchestration on top of Jules is not a supported feature, despite parallel sessions being shown as a headline capability elsewhere.

Google's own FAQ (`jules.google/docs/faq/`) still states "Jules is currently in Public Beta" as fetched on 29 Sep 2026, more than fourteen months after a 6 Aug 2025 Google blog post titled "Jules is officially out of beta and launching publicly." The two Google-owned properties disagree with each other about the product's own status.

A second, smaller inconsistency: the docs page for scheduled tasks (`jules.google/docs/scheduled-tasks/`) states "Editing an existing scheduled task is not currently supported," while the 26 Jan 2026 changelog entry for the same feature area says scheduled tasks were "made editable, pausable, and resumable." Either the docs page is stale or the feature did not fully ship, either way the two Google pages do not agree.

Pricing has been restructured twice inside roughly a year: a single 249.99 USD/month Ultra tier at 2025 launch (with a 124.99 USD introductory rate), split in May 2026 into 99.99 USD and 199.99 USD tiers. Anyone quoting the 2025 figures today is out of date, and that churn itself is worth flagging when comparing what Jules costs against a static number.

The security research is the most serious item here. Two independently reported, concretely demonstrated vulnerability classes (data exfiltration through `view_text_website`, remote code execution through `run_in_bash_session`, both via indirect prompt injection) were disclosed to Google on 1 June 2025 and closed on 13 June 2025 as already tracked, with no confirmed fix communicated back to the researcher by the time of publication in August 2025. Treat the sandbox's isolation claims as unresolved until Google states otherwise.

## 9. Sources

- https://jules.google (fetched 29 Sep 2026)
- https://jules.google/docs (fetched 29 Sep 2026)
- https://jules.google/docs/faq/ (fetched 29 Sep 2026)
- https://jules.google/docs/usage-limits/ (fetched 29 Sep 2026)
- https://jules.google/docs/environment/ (fetched 29 Sep 2026)
- https://jules.google/docs/integrations/ (fetched 29 Sep 2026)
- https://jules.google/docs/review-plan/ (fetched 29 Sep 2026)
- https://jules.google/docs/cli/reference/ (fetched 29 Sep 2026)
- https://jules.google/docs/scheduled-tasks/ (fetched 29 Sep 2026)
- https://jules.google/docs/suggested-tasks/ (fetched 29 Sep 2026)
- https://jules.google/docs/changelog/2025-08-083/, Critic Agent changelog entry, found via search 29 Sep 2026
- https://jules.google/docs/changelog/2025-09-30/, Memory for Repositories changelog entry, found via search 29 Sep 2026
- https://jules.google/docs/changelog/2026-01-26-1/, Planning Critic changelog entry, found via search 29 Sep 2026
- https://developers.googleblog.com/meet-jules-sharpest-critic-and-most-valuable-ally/, published 12 Aug 2025, found via search
- https://blog.google/technology/google-labs/jules-now-available/, published 6 Aug 2025, fetched 29 Sep 2026
- https://embracethered.com/blog/posts/2025/google-jules-vulnerable-to-data-exfiltration-issues/, published 13 Aug 2025, found via search 29 Sep 2026
- https://embracethered.com/blog/posts/2025/google-jules-remote-code-execution-zombai/, published Aug 2025, found via search 29 Sep 2026
- https://embracethered.com/blog/posts/2025/google-jules-invisible-prompt-injection/, published Aug 2025, found via search 29 Sep 2026
- Google AI Pro and Ultra pricing history, aggregated by search from Engadget, eesel.ai, ai-toolbox.co and other secondary sources, 29 Sep 2026, current figures cross-checked against jules.google/docs/usage-limits/
- GitHub repository metadata for google-labs-code/jules-sdk: stars, licence, created and pushed dates, checked 29 Sep 2026
- GitHub repository metadata for google-labs-code/jules-invoke: stars, licence, created and pushed dates, checked 29 Sep 2026
- GitHub repository metadata for google-labs-code/jules-skills: stars, licence, created and pushed dates, checked 29 Sep 2026
- local clone: jules-sdk/README.md
- local clone: jules-sdk/package.json
- local clone: jules-sdk/docs/snapshot.md
- local clone: jules-sdk/packages/core/src/api.ts
- local clone: jules-sdk/packages/core/src/types.ts
- local clone: jules-sdk/packages/core/src/mappers.ts
- local clone: jules-sdk/packages/core/src/activities/types.ts
- local clone: jules-sdk/packages/fleet/package.json and README.md
- local clone: jules-sdk/packages/mcp/package.json and README.md
- local clone: jules-sdk/packages/merge/package.json and README.md
- local clone: jules-action/README.md
- local clone: jules-action/LICENSE
- local clone: jules-skills/README.md
- local clone: jules-skills/LICENSE
- local clone: jules-skills/skills/automate-github-issues/SKILL.md
