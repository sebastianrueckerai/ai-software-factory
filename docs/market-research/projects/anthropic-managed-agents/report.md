---
name: Claude Managed Agents
slug: anthropic-managed-agents
url: https://platform.claude.com/docs/en/managed-agents/overview
repo: none
category: enterprise-agent-platform
license: proprietary
open_source: no
self_hostable: partial
hosting_model: vendor SaaS control plane, cloud sandbox by default, self-hosted sandbox option covers tool execution only
company: Anthropic PBC, San Francisco. Series H reported May 2026 at roughly 965 billion USD valuation, S-1 filed June 2026 per press coverage
maturity: Beta since public launch around April 2026, anthropic-beta header managed-agents-2026-04-01 still required. No stars of its own as a closed SaaS. Reference repo anthropics/launch-your-agent created 2026-06-16, pushed 2026-09-23, 1018 stars, Apache-2.0. Cookbook repo anthropics/claude-cookbooks, 53000 plus stars, pushed 2026-09-28. Named production users include Notion, Rakuten, Asana, Sentry and Atlassian
similarity: 3
axes:
  signals_intake: 2
  control_plane: 4
  sandbox_isolation: 3
  verification: 3
  policy_outside_model: 3
  identity_per_task: 4
  cost_control: 3
  ux: 4
  reseedable_selfhost: 0
steal:
  - Vault credentials are write only and substituted only at egress, for mcp_oauth, static_bearer and environment_variable types. Tighten our own MCP tool call proxying in factory-gateway so a vault read never lands in agent visible state, even transiently in a log line.
  - Outcomes give a bounded revise and regrade loop, a rubric graded definition of done checked by a separate context grader, max_iterations default 3 maximum 20, with results satisfied, needs_revision, max_iterations_reached, failed or interrupted. Worth adding as an explicit workflow node ahead of or alongside our stronger model review gate.
  - Every policy flavoured event carries an evaluated_permission and a reason_code. Add equivalent structured fields to our own gateway audit log so a policy decision's reasoning is queryable after the fact, not just its outcome.
  - Scheduled deployment firing is jittered, up to 15 percent of the interval, minimum 5 seconds, maximum 9 minutes, and a schedule auto pauses when a dependency is archived. Copy both details for our own cron triggered tasks to avoid thundering herd firing and dangling schedules.
  - Session hours are billed to the millisecond and only while status is running, idle, rescheduling and terminated time is free. A precedent worth matching in our own cost ledger's granularity.
differs:
  - Their control plane, session state and billing are entirely Anthropic's. Self-hosted sandboxes move only tool execution, and even then only memory_store resources are supported there, a file or github_repository resource returns a 400 error. Adopting this model at the control plane level would break our re-seedable and commodity hardware constraints outright, there is no path to rebuilding it from Git.
  - Model choice is fixed to Claude. There is no multi vendor router comparable to our LiteLLM fronted model tier ladder. Building on this platform buys a single very capable model family and loses model independence and cross provider cost arbitrage entirely.
  - The auto permission mode hands the allow or deny judgement for a tool call to a server side LLM evaluator rather than to a deterministic rule. That is a direct conflict with our principle that policy lives outside the model, even though it is audited and even though always_allow and always_ask remain code enforced.
  - There is no native signals plane. Session creation is push only from the customer's own application, so the issue tracker, alert and webhook intake we treat as core still has to be built and hosted by us regardless of which worker plane we choose.
ux_verdict: Four API calls, agent, environment, session, stream, reach a working sandboxed coding agent in every major SDK language, and the chat framework quickstarts render an inline tool approval gate out of the box. Faster time to first result than our console, but it is a developer experience to build a UI against, not a ready dashboard to watch and intervene from.
slop_verdict: Real and used in production, named customers, a maintained cookbook repo and a maintained reference skill repo, but still beta five months after launch, ineligible for zero data retention and HIPAA, and self-hosted sandboxes cover far less of the stack than the name suggests.
---

# Claude Managed Agents

## 1. What it is

Claude Managed Agents (CMA) is Anthropic's server hosted harness as a service. A developer defines an Agent (model, system prompt, tools, MCP servers, skills), an Environment (a cloud sandbox or a self hosted sandbox, networking policy, packages) and then creates Sessions that run the agent loop, execute tools inside the sandbox and stream events back over an API or SDK. Anthropic runs the harness, the sandbox, the checkpointing and the billing. The customer supplies the trigger, the configuration and, optionally, the sandbox infrastructure. It launched publicly around April 2026 behind the `managed-agents-2026-04-01` beta header and is still marked beta today. Pricing is standard per model token rates with no markup, plus 0.08 USD per session hour metered to the millisecond, plus 0.01 USD per web search call.

Anthropic pitches it at teams who want an agent that operates inside the systems they already use, a codebase, a wiki, a ticket tracker, a chat surface, without building the sandboxing, orchestration and credential brokering stack themselves. That is close to what our own factory builds by hand across `factoryd`, `factory-gateway` and the worker plane. Anthropic's launch materials name production users including Notion, Rakuten, Asana, Vibecode, Sentry, Atlassian, General Legal and Blockit. The claim that this gets a team "to production 10x faster" is marketing and not independently checkable. What is checkable is the primitive set itself, documented down to API payload shape in the official docs, an official cookbook repository (`anthropics/claude-cookbooks`, 53000 plus stars, pushed 2026-09-28) with 19 plus worked notebooks, and a maintained reference skill repository (`anthropics/launch-your-agent`) that walks a founder through composing the primitives end to end.

## 2. Mapping to our five planes

| Plane or principle | What CMA does | What we do | Verdict |
|---|---|---|---|
| Signals | No native intake. Session creation is push only, the customer's own application calls the API. Scheduled deployments give native cron, issue and alert intake are bring your own | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API, every task is a Forgejo issue | we lead |
| Control plane | Durable checkpointed sessions, versioned agents, per session budget and iteration caps, scheduled cron with jitter, structured audit fields on every event | `factoryd` with a Temporal workflow per task, Postgres, policy as a YAML file in Git applied by Flux | equal |
| Worker plane | One sandbox per session, cloud managed by default or self hosted for tool execution only, networking is unrestricted or limited | One gVisor pod per task, ServiceAccount, default deny egress to an explicit allowlist | we lead |
| Verification | Outcomes, a rubric graded definition of done checked by a separate context grader, bounded by max_iterations | Forgejo Actions, deterministic policy gates, then a stronger model review with a strict verdict | not comparable |
| Merge and deploy | No native plane. GitHub access is a tool or an MCP server the customer wires in | Bot merge after a whitelisted human approval or an auto rule, Flux deploy, staged rollout with an alert free soak | we lead |
| Policy outside the model | always_allow and always_ask are enforced server side by code, auto hands the judgement to a server side LLM evaluator | Capability rules are a Git versioned document enforced in gateway code and network policy | we lead |
| Identity per task | Vaults hold credentials write only, substituted only at egress, a git token is fetched once at session start and discarded before the agent loop begins | A projected, audience scoped ServiceAccount token per task, verified by factory-gateway against the cluster OIDC issuer | equal |
| Artifacts not chat | A session is an append only event log of domain.action events, resumable within the session | `TaskBrief` in, a branch, a PR and a normalised event stream out, Git is the coordination mechanism across sessions | not comparable |

## 3. Architecture and stack

CMA is closed. What is visible is the API surface, the `ant` CLI (Go, source at `github.com/anthropics/anthropic-cli`) and eight language SDKs (Python, TypeScript, Java, Go, C#, Ruby, PHP, plus curl as the lowest common denominator). None of the harness, the sandbox runtime or the storage layer is open source or documented at the implementation level.

Anthropic's own engineering blog, "Scaling Managed Agents, decoupling the brain from the hands", gives the clearest architecture statement available. It describes three parts. The brain is the harness plus the model loop, run entirely on Anthropic's infrastructure. The hands are the sandbox where tools execute, which can be Anthropic managed or, for self hosted sandboxes, run on the customer's own infrastructure through the `ant` CLI worker or the SDK's `EnvironmentWorker`. The session is a durable append only event log that survives disconnects and lets a client resume by reconnecting to the stream. Even in self hosted mode only tool execution moves. Orchestration, session state and billing stay with Anthropic, and self hosted sandboxes only support `memory_store` resources, a `file` or `github_repository` resource on a self hosted sandbox returns a 400 error (documented on the self hosted sandboxes page and confirmed in `cma-api.md`'s troubleshooting notes in the cloned reference repo).

Model routing is Claude only, there is no equivalent of a multi vendor gateway. The quickstart's example agent uses `claude-opus-5-5` and the `agent_toolset_20260401` tool type, which bundles bash, file operations and web search into one declared tool.

Files read for this report, both live docs and the local reference clone at `/home/womb/repos/market-research-clones/anthropic-managed-agents`, are listed in Section 9.

## 4. UX

From zero to a first result is four API calls, the same shape in curl, the `ant` CLI and every SDK. Create an agent (model, system prompt, tools). Create an environment (cloud sandbox, networking type). Create a session referencing both. Open the session's event stream, send one `user.message` event, then read `agent.message`, `agent.tool_use` and `session.status_idle` events until the agent goes idle. The quickstart's own worked example has the agent write a Fibonacci script, run it in the sandbox and verify the output file, in under 20 lines of code against the SDK.

Three official chat framework quickstarts (Vercel's Chat SDK, assistant-ui, CopilotKit's AG-UI adapter) turn that same handler into a running chat application. The assistant-ui example is the most concrete on human oversight, it renders an inline allow or deny gate before each bash tool call runs, using the `always_ask` permission policy. That is the closest thing CMA ships to a built in human in the loop control, everything else is a primitive a developer wires into their own UI. A Console at platform.claude.com lets a developer inspect agents, environments and sessions, but nothing in the docs or the cookbook repo shows a polished dashboard for watching several running sessions at once. Intervening mid session means sending another `user.message` event on the open stream, or resolving a `requires_action` pause raised by an `always_ask` policy. Compared to our own console, which is functional and not designed, CMA's onboarding is faster to a first result, but it hands a developer an event stream to build a UI on rather than a UI to use.

## 5. Security, identity, sandbox, policy, cost

Credentials live in workspace scoped vaults holding `mcp_oauth`, `static_bearer` or `environment_variable` secrets. A vault is write only after creation, nobody, including the agent, can read a stored secret back out. Substitution happens only at the point of egress, in the outbound HTTP call the sandbox or the gateway makes on the agent's behalf. The engineering blog states the harness itself never holds credentials. A GitHub token, when one is needed, is fetched once when a session starts and discarded before the agent loop begins, so it is never present during a model turn.

The sandbox is a per session container, cloud managed by default. Networking is a two value choice, unrestricted or limited, which is coarser than our own default deny plus an explicit allowlist for the gateway, git, the module proxy and telemetry. A self hosted sandbox moves tool execution to the customer's infrastructure through the `ant` CLI worker or the SDK's `EnvironmentWorker`, but orchestration, session state and billing stay with Anthropic regardless, and only `memory_store` resources are supported there.

Policy is three tiered. `always_allow` and `always_ask` are enforced by code server side. `auto` hands the allow or deny judgement for a tool call to a server side LLM evaluator, not to a human or a deterministic rule, and every event carries an `evaluated_permission` and a `reason_code` for audit. `always_ask` is the real human in the loop path, it raises a `requires_action` pause the client must resolve.

Cost is standard per model token rates with no markup, plus 0.08 USD per session hour metered to the millisecond and charged only while `status` is `running` (idle, rescheduling and terminated time is free), plus 0.01 USD per web search call, with cache reads at 10 percent of the base input price. Outcomes bound a grading loop with `max_iterations`, default 3, maximum 20. I found no evidence of a project or organisation level spend envelope with holds, comparable to our gateway's price the worst case, take a hold, book the real cost pattern. The caps that exist are per session or per grading loop, not a multi task ledger.

Anthropic's own docs also flag prompt injection poisoning of cross session memory stores (mounted at `/mnt/memory/`, read_write or read_only, versioned writes) as a live, unresolved risk, an unusually candid admission for vendor documentation.

## 6. What we should take from it

Narrow, things we could copy this month. Vault credentials that are write only and substituted only at egress. Our own gateway already keeps raw keys out of the sandbox, but tightening the MCP tool call proxy in `factory-gateway` so a vault value never appears in a log line, even transiently, is a small change worth making regardless of this report.

Outcomes, a bounded revise and regrade loop against a rubric, graded by a model in a separate context, capped by `max_iterations` with a small default and a hard ceiling. This is a clean shape for a workflow node we do not currently have, a bounded self correction step ahead of or alongside our stronger model review gate.

Structured audit fields, `evaluated_permission` and `reason_code`, on every policy flavoured event. Adding equivalent fields to our own gateway's tool call audit log would let us query why a call was allowed or denied after the fact, not just what happened.

Scheduled deployment jitter, up to 15 percent of the interval with a 5 second floor and a 9 minute ceiling, plus an automatic pause when a dependency is archived. Both details are worth copying into our own cron triggered tasks.

Broad, things that would change our shape. The brain, hands, session split is a documentation discipline as much as an architecture. Naming the model and harness loop, the sandbox execution and the durable event log as three separate things makes a credential isolation story easy to state and easy to audit, "the harness never holds credentials" becomes a one line invariant a reader can check claim by claim. We could adopt this three way naming for our own worker plane even though our substrate is different.

Chat framework quickstarts that map one conversation to one resumable session, with official adapters for Slack, Teams, Discord, WhatsApp and web chat. This is a problem we have admitted we ignore, chat based task intake, and CMA treats it as a first class, officially maintained integration surface with three example repositories rather than a one off demo.

## 7. Where our philosophy differs and what that costs or buys us

Their control plane, session state and billing are entirely Anthropic's, and self hosted sandboxes relocate only tool execution, with only `memory_store` resources supported even there. Building any part of a factory on this model would break our re-seedable and commodity hardware constraints outright. There is no way to reconstruct CMA's control plane from Git, and no offline seed bundle equivalent. If Anthropic's control plane is unavailable, nothing runs.

Model choice is fixed to Claude, with no multi vendor router comparable to our LiteLLM fronted model tier ladder of `coding-cheap`, `coding-frontier`, `review-frontier` and `supervisor`. Building on CMA buys a single, very capable model family and loses model independence and cross provider cost arbitrage entirely, a real cost given our own preference for open, swappable tools.

The `auto` permission mode hands the allow or deny judgement for a tool call to a server side LLM evaluator. That is a direct conflict with our principle that policy lives outside the model, even though the decision is audited and even though `always_allow` and `always_ask` remain plain code. Where their approach buys convenience, no policy has to be authored for every tool, ours buys an explainable, non probabilistic answer to the same question.

CMA has no native signals plane. Session creation is push only from the customer's own application, scheduled deployments give native cron but issue and alert intake do not exist as a built in feature. Building on CMA does not remove the work of building and hosting an intake layer, it only removes the worker plane and control plane work downstream of it, work that is a large share of what we have actually built.

## 8. Red flags and slop assessment

CMA looks real and used in anger rather than a demo. The launch blog names production customers including Notion, Rakuten, Asana, Vibecode, Sentry, Atlassian, General Legal and Blockit. The official cookbook repository `anthropics/claude-cookbooks` carries 53000 plus stars and was pushed 2026-09-28, with 19 plus notebooks under `managed_agents/` covering data analysis, SRE response, Slack, MongoDB and self hosted sandboxes. The reference skill repository `anthropics/launch-your-agent` is Apache-2.0, has 1018 stars, was pushed 2026-09-23 and carries only two open issues.

It is still beta five months after its public launch, every call requires the `anthropic-beta: managed-agents-2026-04-01` header, and the feature is explicitly ineligible for zero data retention and for HIPAA, which rules it out for regulated customers today no matter what the marketing says.

The name "self hosted sandboxes" claims more than the product delivers. Only tool execution moves to customer infrastructure, orchestration, session state and billing never do, and even the sandboxed part only supports `memory_store` resources, a `file` or `github_repository` resource returns a 400 error there. A buyer skimming the feature name could reasonably expect more of the stack to be self hostable than it is.

Anthropic's own docs flag prompt injection poisoning of cross session memory stores as a live risk, worth taking at face value as a real gap rather than boilerplate caution.

Reception outside Anthropic is mixed. Hacker News discussion of the launch raised framework lock in concerns and scepticism that a single vendor's harness is the right place to optimise multi agent coordination, a live objection rather than a settled one.

One small maintenance nit in the reference repository itself. Its own README's "Repo layout" table names `interview-to-config.md` and `examples-bank.md` as top level files. Both have moved to `.claude/skills/launch-your-agent/references/`, and the first was renamed to `interview.md`, without the README being updated.

Pricing at 0.08 USD per session hour is consistent across several independent third party breakdowns found by web search, but I did not fetch Anthropic's own raw pricing page directly, so treat the figure as corroborated rather than independently confirmed at the primary source.

## 9. Sources

https://platform.claude.com/docs/en/managed-agents/overview, fetched 2026-09-29
https://platform.claude.com/docs/en/managed-agents/quickstart, fetched 2026-09-29
https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes, fetched 2026-09-29
https://platform.claude.com/docs/en/managed-agents/security-model, attempted 2026-09-29, returned HTTP 404, page does not exist at this path
https://www.anthropic.com/engineering/managed-agents, "Scaling Managed Agents, decoupling the brain from the hands", fetched 2026-09-29
https://claude.com/blog/claude-managed-agents, launch post, fetched 2026-09-29
WebSearch, 2026-09-29, Claude Managed Agents pricing and session hour cost breakdown, cross checked against several third party articles
WebSearch, 2026-09-29, Anthropic funding and valuation 2026
WebSearch, 2026-09-29, Claude Managed Agents Hacker News launch reception
gh api repos/anthropics/launch-your-agent, 2026-09-29
gh api repos/anthropics/claude-cookbooks, 2026-09-29
gh api repos/anthropics/claude-cookbooks/contents/managed_agents, 2026-09-29
git log -1 on the local clone, last commit 2026-09-23 08:36:40 +0100
/home/womb/repos/market-research-clones/anthropic-managed-agents/README.md
/home/womb/repos/market-research-clones/anthropic-managed-agents/cma-primitives.md
/home/womb/repos/market-research-clones/anthropic-managed-agents/.claude/skills/launch-your-agent/SKILL.md
/home/womb/repos/market-research-clones/anthropic-managed-agents/.claude/skills/launch-your-agent/references/examples-bank.md
/home/womb/repos/market-research-clones/anthropic-managed-agents/.claude/skills/launch-your-agent/references/cma-api.md
/home/womb/repos/market-research-clones/anthropic-managed-agents/.claude/skills/launch-your-agent/references/interview.md
