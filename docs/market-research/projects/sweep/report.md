---
name: Sweep
slug: sweep
url: https://sweep.dev
repo: https://github.com/sweepai/sweep
category: factory-orchestrator
license: "mixed: MIT for parts shipped as Sweep's Free Software, proprietary Sweep EE licence for the rest (production or commercial use needs an enterprise subscription)"
open_source: partial
self_hostable: partial
hosting_model: self-hosted Docker Compose on one VM (original GitHub App backend, now unmaintained) or a JetBrains plugin (current product)
company: Sweep AI Inc, YC S23, San Francisco, founded 2023 by Kevin Lu, William Zeng and Samip Dahal, about USD 2 to 2.5M seed (Goat Capital, Replit's Amjad Masad, Exceptional Capital), about 5 people per PitchBook
maturity: 7.7k stars, 465 forks, 244 open issues, first commit 2023 (YC S23 launch), org listing shows last update around September 2025, pyproject version 2.1.4, no tagged releases found in the clone
similarity: 2
axes:
  signals_intake: 2
  control_plane: 0
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 0
  ux: 2
  reseedable_selfhost: 1
steal:
  - The issue-native status view: on_ticket.py edits a single comment on the triggering issue into a live checklist with a progress link, instead of a separate dashboard. Worth copying for small tasks where opening the console is overhead.
  - sweep.yaml per-repo policy file (blocked_dirs, rules, gha_enabled, draft) that repo owners commit themselves. A minimal, self-service version of "policy as a file in Git" scoped per project rather than factory-wide.
  - on_failing_github_actions.py re-triggers a fix from a failing CI run's own logs, closing the loop from verification failure back to a new attempt without a human filing a new issue. Matches our "reproduction gate" idea but done as a webhook, not a workflow step.
  - GitHub comment buttons ("Restart Sweep", "Rollback Files For Sweep") give one-click abort/undo entirely inside the PR thread, no custom UI needed for those two actions.
  - DOCKERFILE_CONFIG_LOCATION optionally replays a repo's own CI Dockerfile in a throwaway container to reproduce a failure before proposing a fix, a cheap way to get a real repro signal without owning the CI system.
differs:
  - No durable task state. Working state lives in process-memory dicts (events, on_ticket_events) and Python threads that get force-killed with ctypes on timeout. A backend restart silently drops every in-flight task, which is the opposite of our per-task Temporal workflow and would break the re-seedable constraint.
  - Open-core gating is wired directly into the agent code path: on_ticket.py asserts validate_license() before doing any work, and self-hosting starts from a 14-day trial key from a company that has since stopped selling this product. Our rule is to pick tools with an escape hatch from enterprise gating; this is the gating itself, not a tool that has it.
  - No sandbox for the agent. It edits a locally cloned repo and calls the GitHub API from inside the same container as the webhook server, with no per-task isolation and no egress control. Copying this shape would drop our default-deny sandbox constraint entirely rather than trade it for something else.
ux_verdict: "Lower friction than our console for a single fix (comment \"Sweep: fix the login bug\" on an issue and watch a checklist update in place) but there is no fleet view, no cost view and no approval workflow beyond normal GitHub PR review."
slop_verdict: Real and once popular (YC S23, seed funded, 7.7k stars) but abandoned as a factory-orchestrator. The README says the team is "now building an AI coding assistant for JetBrains", the org's repo list shows no meaningful backend activity since around September 2025, and self-hosting the old product still needs a licence key from a company that no longer sells it. Read every finding here as a snapshot of a 2023 to 2024 design, not a maintained target.
---

# Sweep

## 1. What it is
Sweep was a GitHub App that turned an issue labelled or titled "Sweep: ..." into a pull request, sold as an "AI junior developer" for small chores and tech debt. It launched from YC Summer 2023, raised a seed round, and shipped both a hosted SaaS and a self-hosted Docker Compose backend under a proprietary "Enterprise Edition" licence with an MIT carve-out for the free parts.

The repository itself now says otherwise: the top-level README (README.md) reads only "Thank you for all of the support on Sweep. We're now building an AI coding assistant for JetBrains." The company pivoted to an IDE autocomplete and agent plugin and stopped developing the GitHub-bot product this report analyses. The code that remains in sweepai/ is the last state of that product, useful as a design sample, not as a live target.

## 2. Mapping to our five planes

| Plane / principle | What Sweep does | What we do | Verdict |
|---|---|---|---|
| Signals | GitHub issues and comments with a sweep: label or title prefix, failing GitHub Actions runs (handlers/on_failing_github_actions.py), Jira tickets (handlers/on_jira_ticket.py) | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable (different forge, no telemetry) |
| Control plane | In-memory Python dicts (events, on_ticket_events, review_pr_events in sweepai/api.py) and daemon threads, killed by a ctypes-based terminate_thread on timeout | factoryd with a Temporal workflow per task, Postgres | we lead |
| Worker plane | Same process as the webhook server: clones the repo with GitPython, edits files, pushes via the GitHub API, no container per task | One gVisor pod per task, default-deny egress | we lead |
| Verification | Reads existing GitHub Actions logs and can optionally replay a repo's own Dockerfile in a disposable container (handlers/on_check_suite.py) to reproduce a failure; no independent model review | Forgejo Actions on gVisor runners, policy gates, stronger-model review | we lead |
| Merge and deploy | Opens a normal PR (draft optional via sweep.yaml), a human merges it through GitHub; no auto-merge path found | Bot merge after approval or an auto rule for reproduced, normal-risk changes | equal |
| Policy outside the model | sweep.yaml blocked_dirs and rules are read and enforced in Python before file edits are applied | YAML policy in Git, enforced in gateway code and network policy | equal, narrower scope |
| Identity per task | One GitHub App installation token per repo (rotated by GitHub, not per task), one shared Anthropic/OpenAI API key from .env for every task | Projected, audience-scoped, per-task ServiceAccount token, per-task LiteLLM virtual key | we lead |
| Artifacts not chat | A TaskBrief-like object is assembled from the issue body, but coordination is a single long-lived issue comment edited in place, not a branch-scoped exchange | TaskBrief in, branch, PR, event stream out | equal |

## 3. Architecture and stack
Python 3.10, FastAPI (sweepai/api.py, 878 lines), PyGithub for the GitHub API, GitPython for local clones, Redis for caching, optional MongoDB (MONGODB_URI) and Sentry. Embeddings and code search use Voyage AI or Cohere plus a home-grown vector index (sweepai/core/vector_db.py, lexical_search.py) and tree-sitter parsing. A separate Next.js app, sweep_chat/, is a chat UI with its own GitHub OAuth flow (@octokit/oauth-methods) and Cypress e2e tests, apparently a later, separate product surface from the issue-to-PR bot.

Deployment is one Dockerfile (installs ripgrep, cargo, npm, python deps in a single 3.10-slim image) run via docker-compose.yml's hosted service, one FastAPI process with three Uvicorn workers, no queue, no orchestrator. The one exception to "no sandboxing" is handlers/on_check_suite.py, which shells out to docker build and docker run to replay a repo's own CI Dockerfile when DOCKERFILE_CONFIG_LOCATION is set, purely to get failure logs, not to isolate the agent.

Model access is direct: sweepai/config/server.py reads OPENAI_API_KEY, ANTHROPIC_API_KEY, AZURE_API_KEY, COHERE_API_KEY, VOYAGE_API_KEY from environment variables, with assert OPENAI_API_KEY and assert COHERE_API_KEY at import time. There is no gateway, no per-task budget, and no routing between model tiers beyond a single DEFAULT_GPT4_MODEL constant.

## 4. UX
From zero: install the GitHub App, add a .env with a GitHub App PEM, a licence key and model API keys, run docker compose up hosted, point the app's webhook at the instance, then open an issue titled "Sweep: <task>". That is roughly five steps to a first PR, all inside GitHub, no separate login. While the agent works, on_ticket.py and ticket_rendering_utils.py keep editing one issue comment into a checklist (plan, code changes, PR link) with an emoji reaction as a status flag, and a restart button and a rollback link as the only controls. There is no kanban view, no cost view, no multi-task overview; each task lives in its own issue thread. sweep_chat/ adds a separate chat-style UI for asking questions about a codebase, unrelated to the ticket flow.

Compared to our console, this is lighter for a single fix (no context switch out of the issue) but has no equivalent of our kanban board, human lane or cost view once more than a handful of tasks run at once.

## 5. Security, identity, sandbox, policy, cost
Identity: a GitHub App installation token scoped to the installing org or repo, generated per webhook installation, not per task. Model provider keys are static secrets in .env, shared by every task the instance ever runs. There is no distinction between the credentials a task needs and the credentials the process holds.

Sandbox: none for the agent itself. Code changes are computed in-process against a git clone and pushed through the GitHub API; the only container use is the optional CI-replay described above, and that only reproduces logs, it does not run the agent inside it.

Policy: sweep.yaml's blocked_dirs list is read in create_pr.py and enforced before writing files, and gha_enabled and draft gate whether generated PRs trigger CI. That is real code-level policy, just repo-scoped and narrow (a directory denylist), with nothing resembling capability classes, spend limits or approval states.

Cost: none found. sweepai/utils/chat_logger.py and PostHog events track usage for the business, not for a spend cap, and the enforcement mechanism for "pay to keep using this" is the licence key check, not a technical budget.

## 6. What we should take from it
Narrow: the in-thread status comment pattern (one comment, continuously edited, with a restart and a rollback affordance) is worth copying for lightweight tasks in our console or even mirrored into the Forgejo issue itself, so a human does not have to leave the issue to see progress. The sweep.yaml per-repo blocked_dirs idea is a good complement to our factory-wide policy file: let a project's own maintainers add narrow, repo-local exceptions on top of the global policy. The CI-log-triggered retry in on_failing_github_actions.py is a concrete pattern for closing the loop from a failed Forgejo Actions run straight back into a new attempt.

Broad: nothing here. The product's core shape, one process, one set of shared keys, license-gated self-hosting, is exactly what our four constraints rule out.

## 7. Where our philosophy differs and what that costs or buys us
Sweep's in-memory, single-process control plane is simpler to run (one container, no Temporal, no Postgres) but cannot survive a crash or a redeploy without losing every task in flight, which fails our re-seedable constraint outright. Its licence-gated self-hosting is the direct trade we refuse to make: their maintainers can turn off a self-hosted deployment by not renewing a key, which is the enterprise-tier lock-in our "open source where possible, with an escape hatch" rule exists to avoid. Its lack of any per-task sandbox is cheaper to build and debug than our gVisor-per-task pods, but it means a bad or malicious prompt can run arbitrary git and file operations with the same reach as the whole backend, which our security constraint does not allow.

## 8. Red flags and slop assessment
The product is abandoned in this category: the README (README.md) is a one-line pivot notice, the GitHub org listing shows the backend last touched around September 2025, and self-hosting instructions (docs/pages/deployment.mdx) still describe a 14-day trial licence key issued by a team that has since moved to a different product (the JetBrains plugin, confirmed by its own site and Y Combinator profile). The licence itself is a proprietary "Enterprise Edition" grant dressed up with an MIT carve-out, so "open source" only ever applied to part of the code. Concurrency is handled by force-killing Python threads with ctypes (api.py, terminate_thread), a fragile mechanism for anything meant to run untrusted, long-lived work. No security advisories or incidents were found in the time available; the bigger risk is relying on unmaintained code at all.

## 9. Sources
- https://github.com/sweepai/sweep (WebFetch, 2026-09-29)
- https://en.wikipedia.org/wiki/Sweep_(software) (WebFetch, 2026-09-29, wrong "Sweep", not useful)
- WebSearch "Sweep sweepai GitHub AI coding agent shut down OR sunset OR pivot 2024 2025" (2026-09-29)
- WebSearch "sweepai/sweep github stars license" (2026-09-29)
- WebSearch "Sweep AI sweep.dev Y Combinator funding raised founded 2023" (2026-09-29)
- Clone: repos/market-research-clones/sweep, shallow clone, 2026-09-29
- Read: README.md, LICENSE, sweep.yaml, docker-compose.yml, Dockerfile, pyproject.toml
- Read: sweepai/api.py, sweepai/config/server.py, sweepai/utils/validate_license.py, sweepai/handlers/on_ticket.py, sweepai/handlers/on_check_suite.py, sweepai/web/health.py
- Read: docs/pages/deployment.mdx
- Read: sweep_chat/package.json
- sweep.dev (attempted WebFetch, DNS failure, not reachable from this environment)
