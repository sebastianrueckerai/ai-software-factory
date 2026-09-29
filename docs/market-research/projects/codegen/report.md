---
name: Codegen
slug: codegen
url: https://codegen.com
repo: https://github.com/codegen-sh/codegen
category: factory-orchestrator
license: "mixed: Apache-2.0 SDK and CLI client, proprietary platform"
open_source: partial
self_hostable: no
hosting_model: SaaS on Modal until 2026-01-16, enterprise on-prem was claimed, now folded into ClickUp Brain
company: Codegen Inc., San Francisco, founded 2023 by Jay Hack, 16.2M USD seed led by Thrive Capital, acquired by ClickUp in December 2025
maturity: 518 stars, 25 contributors, repo created 2025-01-21, last commit 2025-10-07, last release v0.57.0 on 2025-09-24, repository and whole GitHub org archived
similarity: 3
axes:
  signals_intake: 4
  control_plane: 2
  sandbox_isolation: 2
  verification: 2
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 1
  ux: 4
  reseedable_selfhost: 0
steal:
  - Typed trace records per run (message_type ACTION, PLAN_EVALUATION, FINAL_ANSWER, ERROR, USER_MESSAGE, FIX_PR_ERRORS with thought, tool_input, tool_output, observation) as the shape of our normalised event stream and trace view
  - Explicit terminal statuses TIMEOUT, MAX_ITERATIONS_REACHED and OUT_OF_TOKENS next to FAILED, so a budget stop is visible on the board as its own state
  - Per-repo setup commands run once, then a filesystem snapshot with a 24 hour TTL and a manual invalidate button, plus an agent run that drafts the setup commands
  - Check auto-fixer settings as data (check_retry_count 0 to 10, per-check retry counts, ignored_checks, per-check custom prompts) and a "ban" call that stops all agents on a PR and ignores further check events
  - One agent per context, with ticket, PR and chat thread comments routed into the same running agent as interrupts
  - Remote code-server editor and a web preview on port 3000, both linked from the trace page, with a per-session generated password
  - Rule file discovery (AGENTS.md, CLAUDE.md, .cursorrules and globs) under a 25,000 character budget, shown in the trace as the files that were loaded
differs:
  - Policy and credentials sit inside the agent's reach - rules are prompts "not hard constraints", repo secrets are env vars in the sandbox, and the agent may pass skip_trufflehog=true to bypass the secret scan
ux_verdict: Trigger from Slack, Linear, GitHub or the web, watch a live trace, talk to the running agent in the same thread, open its editor or preview, a clearly smoother loop than our console
slop_verdict: A real, paid product with named customers that was retired on 2026-01-16 after the ClickUp acquisition, the open SDK is an archived 100-line wrapper over a generated REST client
---

# Codegen

## 1. What it is

Codegen was a hosted issue-to-PR agent platform. It is now retired. ClickUp announced the acquisition on 2025-12-22 and deprecated the standalone service on 2026-01-16. The founder became ClickUp's Head of AI. codegen.com is now a directory of AI coding tools with a "Codegen has joined ClickUp" banner, and its "Try Codegen" button goes to a ClickUp Brain agent page. docs.codegen.com still serves the old docs with no retirement notice.

Before the acquisition it sold a SaaS that took work from Slack, Linear, Jira, ClickUp, Monday, GitHub comments, a web form, a CLI and a REST API. Each request became an "agent run" in a cloud sandbox that opened a GitHub PR, watched CI, pushed fixes and answered review comments. Plans were Free (10 runs), Individual at 9.99 USD per month and Teams at 199 USD per month with a 150 USD monthly usage limit. Enterprise had custom pricing and on-prem. Named customers were Ramp, Notion and Ironclad.

The makers claimed "the building blocks (sandboxes, integrations, telemetry) for successful enterprise code agent deployments", SOC 2 Type I and II, and Kubernetes-native on-prem. The repository shows a thin Python client for the REST API, a CLI and TUI, a Claude Code session logger and the product docs. None of the platform is in it.

The company started as a codemod library. The January 2025 Show HN (15 points) presented "Codegen" as an open source Python library for code manipulation on Tree-sitter. That code moved to `codegen-sh/graph-sitter`, now archived. The `pyproject.toml` of the SDK still carries the old description "Scriptable interface to a powerful, multi-lingual language server built on top of Tree-sitter". Leftovers such as `cli/utils/codemod_manager.py` and `shared/compilation/` remain, with no command wired to them in `cli/cli.py`.

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Slack mentions, Linear, Jira, ClickUp and Monday assignment or mention, GitHub comments, web form, CLI, REST API, CI check failures on its own PRs, PR review on every PR. Sentry only as an agent tool behind a feature flag | Forgejo issues and comments, SigNoz alert webhooks, intake API | they lead on breadth, we lead on telemetry as a trigger |
| Control plane | Closed backend on Modal. Agent run rows with status, source_type, metadata, linked PRs, kanban ordering, resume, stop, ban. Org settings and three user roles | factoryd with a Temporal workflow per task, Postgres, policy in Git, approvals as states, cost ledger | we lead (theirs not verifiable) |
| Worker plane | One sandbox per context from a Docker image with sshd, nginx, supervisor, code-server, gh CLI. Snapshot after setup commands. State persists across follow-up messages | One gVisor pod per task, read-only root, default-deny egress, ephemeral | we lead on isolation, they lead on convenience |
| Verification | Customer CI, check auto-fixer with 3 retries, AI PR review, Trufflehog on agent commits | Forgejo Actions on gVisor runners, policy gates, reproduction gate, stronger-model review | we lead |
| Merge and deploy | Human merges in GitHub. No deploy | Bot merge after whitelisted approval or auto rule, Flux deploy, staged rollout | we lead |
| Policy outside the model | Toggles for PR creation, rule detection and signed commits. Rules are prompt text | Capability document in Git enforced in gateway and network policy | we lead |
| Identity per task | GitHub App with broad write scopes, personal API tokens, repo secrets as sandbox env vars | Projected per-task ServiceAccount token, gateway holds keys | we lead |
| Artifacts not chat | Chat-first: Slack threads and ticket comments steer a live agent. Output is a PR | TaskBrief in, branch and PR out | not comparable |

## 3. Architecture and stack

The platform was closed. What the repository reveals is the edge of it.

The backend ran on Modal. `src/codegen/cli/api/modal.py` builds hostnames from workspaces `codegen-sh`, `codegen-sh-staging` and `codegen-sh-develop`. `cli/api/endpoints.py` lists `https://codegen-sh--rest-api.modal.run/` as the API, plus Modal endpoints for an MCP server and an OpenTelemetry collector. The sandboxes probably also ran on Modal. That is inference, the docs never say where sandboxes run.

The REST API is in `docs/api-reference/openapi3.json` ("Developer API" 1.0.0). The core objects:

| Endpoint | Purpose |
|---|---|
| `POST /v1/organizations/{org_id}/agent/run` | Create a run. `CreateAgentRunInput`: prompt, images (base64), metadata, repo_id, model, agent_type (`codegen` or `claude_code`). 10 requests per minute |
| `GET .../agent/run/{id}`, `GET .../agent/runs` | `AgentRunResponse`: id, status, web_url, result, summary, source_type, github_pull_requests, metadata |
| `POST .../agent/run/resume` | Send a follow-up prompt into an existing run |
| `POST .../agent/run/ban`, `unban` | Stop all agents on a PR and ignore future check-suite events |
| `POST .../agent/run/remove-from-pr` | Detach Codegen from a PR |
| `GET/PUT .../repos/check-suite-settings` | Auto-fixer retry counts, ignored checks, per-check prompts |
| `POST .../setup-commands/generate` | An agent run that drafts setup commands for a repo |
| `POST .../sandbox/{id}/analyze-logs` | An agent run that reads sandbox logs |
| `GET /v1/alpha/.../agent/run/{id}/logs` | Paginated trace entries |

`ApiAgentRunSourceType` lists LOCAL, SLACK, GITHUB, GITHUB_CHECK_SUITE, GITHUB_PR_REVIEW, LINEAR, API, CHAT, JIRA, CLICKUP, MONDAY and SETUP_COMMANDS. `StopAgentRunInput` carries `before_card_order_id` and `after_card_order_id` for "the CANCELLED column", so the web UI was a kanban board keyed on run status. The TUI in `cli/tui/app.py` shows the status set: PENDING, RUNNING, ACTIVE, EVALUATION, COMPLETE, ERROR, FAILED, CANCELLED, STOPPED, TIMEOUT, MAX_ITERATIONS_REACHED, OUT_OF_TOKENS. A run with a merged PR is drawn as "done".

The SDK itself is small. `src/codegen/agents/agent.py` has `Agent.run(prompt)`, which posts a `CreateAgentRunInput` with only the prompt, and `AgentTask.refresh()`, which polls the run. It depends on the generated `codegen-api-client` package (also archived). The whole `src/` tree is about 14,000 lines, mostly CLI, TUI, auth, telemetry and a local git operator.

The CLI adds three things of interest. `codegen agent create` wraps the API. `codegen claude` writes `UserPromptSubmit` and `Stop` hooks into `~/.claude/settings.json` (`cli/commands/claude/hooks.py`) and posts session status and log lines to `/v1/organizations/{org}/claude_code/session/...` (`claude_session_api.py`), so local Claude Code sessions appeared on the same web board. `cli/mcp/` exposes the API as MCP tools through fastmcp.

Model access went through Codegen-held keys by default. Org settings chose Anthropic, OpenAI, Google or Grok, with bring-your-own keys and a custom base URL. The docs push Claude 4 Sonnet as the tuned default. A Claude Code harness mode existed as `agent_type=claude_code`.

## 4. UX

The UX was the product's strength. Zero to first result took about four steps: sign in with GitHub OAuth, install the GitHub App, optionally connect Slack or Linear, then type a prompt at `codegen.com/new` or mention `@codegen`. No card was needed.

Work started where the user already was. Each Slack thread, ticket, GitHub issue or PR mapped to one agent. Comments in any of these went to the same agent. A PR created from a Linear ticket shared context with that ticket.

While an agent worked, the user saw a trace page at `codegen.com/agent/trace/{id}`. It rendered tool cards, such as `SetActiveCodebase` listing "Repository Rules (Filesystem)". Buttons on the trace opened a VS Code (code-server) session in the sandbox and a web preview of a dev server on port 3000. The docs describe the `sandbox-buttons.png` screenshot this way. I did not see the live UI.

Intervention was chat. "Interrupts" delivered a new Slack reply or Linear comment to the running agent. The "Propose Plan" setting made the agent post a plan with confidence levels and wait for approval before any edit. Stop and ban existed in the API. Approval of the result was the ordinary GitHub review.

Other surfaces: a kanban board of runs, a PR list, an analytics page with PR velocity, tool usage and cost by model, a CLI with a Textual TUI, an MCP server and GitHub Actions recipes.

What is easier than our console: live trace, talk to the agent in place, open its editor, see its running app, a board fed from many sources. What is worse: the approval of a plan and the steering are chat messages, not typed workflow states. The docs admit that interrupts may be ignored ("If your interrupt seems ignored... Be more explicit").

## 5. Security, identity, sandbox, policy, cost

**Sandbox.** The base image is published in `docs/sandboxes/base-image.mdx`: Debian bookworm with uv and Python 3.13, Node 22 via nvm, git, gh, ripgrep, sshd, nginx, supervisor, tmux and code-server. Nothing in the image restricts the network. The docs say networking is "controlled... (can be restricted)" with no mechanism named. Filesystem state persists across messages in one context, so a sandbox is per conversation, not per step. Isolation technology is not stated. Not verified.

**Secrets.** Repository secrets are key-value pairs "injected into the sandbox" as environment variables. The docs warn: "Only use staging credentials and non-production secrets." That is an honest statement that the agent can read and leak them.

**Identity.** The GitHub App asks for write on contents, PRs, issues, status checks and Actions workflows, plus webhooks and org member read. API tokens are personal and "inherit your permissions". Whether a GitHub token sits in the sandbox is not stated. The `gh` CLI in the image suggests it did. Not verified.

**Policy.** Enforced toggles are few: `enable_pr_creation`, `enable_rules_detection`, org-wide signed commits and three user roles (Member, Manager, Admin). Everything else is prompt text. `repo-rules.mdx` says: "Rules are text prompts, not strict settings." The Trufflehog check on agent commits can be skipped by the agent itself with `skip_trufflehog=true`. "Require explicit GitHub mentions" limits who triggers the agent by mention only, with no trust model for outside authors.

**Cost.** Caps were billing caps. Creating a run past the plan returns HTTP 402 `AgentRunLimitReachedErrorResponse`. Teams had a 150 USD monthly usage limit. Per-run stop states TIMEOUT, MAX_ITERATIONS_REACHED and OUT_OF_TOKENS show internal limits on each run, with values not published. There is no per-task budget, no hold and no ledger visible to the user beyond the analytics cost breakdown. Auto-fix retries were capped at 3 by default, 0 to 10 on Enterprise.

**Compliance.** SOC 2 Type I and II and regular pen tests were claimed on docs.codegen.com. The report was behind a request link. Not verified.

## 6. What we should take from it

### Narrow

**Trace record schema.** Their log entry carries `message_type`, `thought`, `tool_name`, `tool_input`, `tool_output` and `observation`, with types for plan evaluation, user messages, PR errors and links to other runs. Our normalised event stream should adopt a fixed type enum of this kind, and the console task page should render one card per entry. This is the cheapest start on our missing trace UI.

**Budget stops as terminal states.** TIMEOUT, MAX_ITERATIONS_REACHED and OUT_OF_TOKENS sit next to FAILED on their board. Our session end reason should surface the same way on the kanban, so "budget exhausted" and "time bound hit" are not buried under failed.

**Setup commands with snapshot.** Per repo, a list of shell commands runs once. The resulting filesystem becomes the base for later runs, cached 24 hours, with an invalidate button and a TTL setting. A generator run drafts the commands. For us this maps to a per-project prepared layer (a cached PVC or image per base commit) that the worker mounts, which would cut our slow gVisor dependency installs.

**Check auto-fixer as data.** `check_retry_count`, `check_retry_counts` per check, `ignored_checks` and `custom_prompts` per check are a good policy schema. Our CI-failure retry should read these fields from the policy YAML. The "ban" call, which stops every agent on a PR and ignores future check events, is a kill switch we lack.

**Rule file discovery with a budget.** Loading AGENTS.md, CLAUDE.md and editor rule files under a 25,000 character cap, and listing the loaded files in the trace, is a small change to our TaskBrief builder.

### Broad

**One agent per context, reachable from every surface.** A ticket, its PR and a chat thread all route to one run. Follow-ups become interrupts. We already key a task to a Forgejo issue. Routing PR review comments and a console message into the running session, marked with trust level, would give us the same loop without chat as the coordination medium.

**Look inside the sandbox.** A code-server link and a dev-server preview from the task page make the agent's work inspectable. For us this is a Cilium-guarded port-forward into the task pod, opened only for write-access humans, with the session token checked by the console.

**Many intake sources.** Slack, Linear and Jira intake was their main adoption driver. Our single-forge intake is a known weakness. Their docs show the value but not a design we can copy.

## 7. Where our philosophy differs and what that costs or buys us

**Credentials in the sandbox.** Codegen put repo secrets and probably a GitHub token where the agent can read them, and told users to use only staging secrets. Our gateway and per-task identity forbid this. The cost is that our agents cannot run a dev server against a staging database without a gateway tool for it. We keep our rule.

**Policy as prompt.** Their rules are advisory text and their secret scan is skippable by the agent. Copying this would break "policy lives outside the model". Their approach buys fast onboarding: a user types rules into a box. We should keep enforcement in code and still offer a free-text rules field that is labelled as advisory.

**Persistent sandbox per conversation.** Their sandbox lives across Slack messages, which makes follow-ups fast. Our sandbox is disposable per session, and findings carry forward in the TaskBrief. Our way costs setup time on every session. The snapshot mechanism above recovers most of that without giving up disposability.

**SaaS on a vendor platform.** Their backend was a set of Modal apps. It could not be re-seeded by a customer, and on 2026-01-16 it stopped existing. This is the strongest argument for our re-seedable, self-hosted constraint.

## 8. Red flags and slop assessment

- **Product retired.** ClickUp's blog of 2025-12-22 says "the Codegen service will be officially deprecated on January 16, 2026" and points users to Copilot, Cursor, Claude Code, Codex or Devin.
- **Everything archived.** All 23 repositories in the `codegen-sh` org are archived, including `codegen`, `graph-sitter` and `codegen-api-client`. The last commit in `codegen` is 2025-10-07, an automated OpenAPI sync.
- **Stale docs.** docs.codegen.com still advertises signup, SOC 2 and on-prem with no notice of retirement.
- **Open source was thin.** The open part is a client. The SDK `Agent` class is about 100 lines over a generated client. The codemod library that earned the original attention was split out and then archived.
- **Docs quality.** Several doc links point to `http://localhost:3001`. The web preview page says settings are "likely within the same repository settings area". An interrupts page links to a missing "Wake-up Triggers" page.
- **Lock-in.** Models defaulted to Codegen's keys and prompts tuned for one Anthropic model. Hosting was Modal.
- It was used in anger. Named customers, a 2025 review calling it good value, and a detailed product surface all point to a real product that was bought for its team and folded into another.

## 9. Sources

- https://github.com/codegen-sh/codegen (cloned 2026-09-29, archived, last commit 2025-10-07)
- `gh api repos/codegen-sh/codegen`, `.../contributors`, `.../releases`, `orgs/codegen-sh/repos` (2026-09-29)
- ~/repos/market-research-clones/codegen/README.md
- ~/repos/market-research-clones/codegen/pyproject.toml
- ~/repos/market-research-clones/codegen/src/codegen/agents/agent.py
- ~/repos/market-research-clones/codegen/src/codegen/agents/constants.py
- ~/repos/market-research-clones/codegen/src/codegen/agents/README.md
- ~/repos/market-research-clones/codegen/src/codegen/cli/cli.py
- ~/repos/market-research-clones/codegen/src/codegen/cli/api/modal.py
- ~/repos/market-research-clones/codegen/src/codegen/cli/api/endpoints.py
- ~/repos/market-research-clones/codegen/src/codegen/cli/commands/claude/hooks.py
- ~/repos/market-research-clones/codegen/src/codegen/cli/commands/claude/claude_session_api.py
- ~/repos/market-research-clones/codegen/src/codegen/cli/commands/claude/config/claude_session_hook.py
- ~/repos/market-research-clones/codegen/src/codegen/cli/mcp/tools/static.py
- ~/repos/market-research-clones/codegen/src/codegen/cli/utils/codemod_manager.py
- ~/repos/market-research-clones/codegen/src/codegen/cli/tui/app.py
- ~/repos/market-research-clones/codegen/docs/api-reference/openapi3.json
- ~/repos/market-research-clones/codegen/docs/api-reference/agent-run-logs.mdx, authentication.mdx, github-actions.mdx
- ~/repos/market-research-clones/codegen/docs/sandboxes/ (overview, base-image, secrets, image-snapshots, setup-commands, environment-variables, editor, web-preview)
- ~/repos/market-research-clones/codegen/docs/settings/ (agent-permissions, agent-behavior, repo-rules, organization-rules, model-configuration, team-roles, trufflehog-integration, on-prem-deployment)
- ~/repos/market-research-clones/codegen/docs/capabilities/ (capabilities, triggering-codegen, interrupts, checks-autofixer, pr-review, claude-code, analytics)
- ~/repos/market-research-clones/codegen/docs/integrations/ (github, linear, slack, sentry)
- ~/repos/market-research-clones/codegen/docs/introduction/overview.mdx
- https://codegen.com (fetched 2026-09-29, directory site with ClickUp banner)
- https://codegen.com/pricing (fetched 2026-09-29, no pricing shown)
- https://docs.codegen.com (fetched 2026-09-29, old docs still live)
- https://clickup.com/blog/clickup-codegen-acquisition/ (dated 2025-12-22)
- https://clickup.com/brain/agents/codegen (fetched 2026-09-29)
- https://news.ycombinator.com/item?id=42868511 (Show HN, 2025-01-29)
- https://finance.yahoo.com/news/clickup-acquires-cursor-competitor-codegen-171100535.html (December 2025)
- https://techcrunch.com/2023/11/16/codegen-raises-new-capital-llm-automation-for-software-dev/ (2023-11-16)
- https://coldiq.com/tools/codegen (pricing tiers, via search, 2026)
- https://markets.financialcontent.com/stocks/article/marketminute-2025-7-17-codegen-is-the-best-ai-coding-tool-weve-tried (2025-07-17, via search summary)
- https://www.peerspot.com/products/codegen-reviews (December 2025, via search summary)
- https://jay.ai/ (founder site, via search summary)
