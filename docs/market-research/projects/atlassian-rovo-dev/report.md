---
name: Atlassian Rovo Dev
slug: atlassian-rovo-dev
url: https://www.atlassian.com/software/rovo-dev
repo: none
category: factory-orchestrator
license: proprietary
open_source: no
self_hostable: no
hosting_model: Atlassian-hosted SaaS. CLI and VS Code extension run on the developer's machine but call Atlassian's cloud control plane for every turn
company: Atlassian, public company (NASDAQ ticker TEAM), founded 2002, Sydney and San Francisco
maturity: no public repository, no star count. CLI beta since mid-2025, Rovo Dev Standard paid plan generally available in 2026, blog and support docs updated through September 2026
similarity: 2
axes:
  signals_intake: 2
  control_plane: 3
  sandbox_isolation: 2
  verification: 2
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 2
  ux: 3
  reseedable_selfhost: 0
steal:
  - Split-plane resilience: the user-facing conversation lives in a always-up control plane, the compute sandbox is disposable. A sandbox crash gets a fresh container and a retry with no visible break, instead of killing the session.
  - A callback bridge so the sandbox never gets direct external network access at all. Every tool call, including calls to remote MCP servers, is proxied back through the control plane, which does the permission and auth check before any external API is touched. Stronger than an egress allowlist: there is no egress path from inside the sandbox.
  - Three-tier tool approval (once, this session, always) with compound shell commands split and checked subcommand by subcommand, saved to a config file. A concrete default for how our console should ask a human to approve a tool call.
  - Milestone checkpointing so a failure late in a run resumes without repeating side effects such as duplicate artifacts, instead of restarting the whole task.
  - A named self-evolution loop: failed or inefficient runs are flagged from telemetry, turned into eval cases, and only promoted to the harness after a human engineer reviews and approves the change. Directly answers our own no-benchmark-of-agent-success-rate gap.
  - Runtime, per-user tool manifests (which of thousands of API actions are enabled) generated at session start rather than baked into a static policy file, worth comparing against our YAML-in-Git capability policy for cases where policy depends on live user state.
differs:
  - Identity is the invoking human's existing product permissions, carried through for the whole session, never a short-lived task-scoped credential. This is the opposite of identity belongs to the task, not the machine, and would cost us least-privilege per task if copied wholesale.
  - Closed source, single-tenant SaaS with no self-host option. Nothing here can be re-seeded onto our own cluster; adopting Rovo Dev's mechanisms means re-implementing them, not running them.
  - The product stops at a plan, a diff, or a review comment on a PR. There is no orchestrated state machine driving a task through merge and deploy; a human always runs the CLI turn or clicks merge. Our Temporal-driven workflow through auto-merge and staged rollout has no equivalent here.
  - Two independently reported prompt-injection paths (RovoBlast, a PromptArmor technique) show the boundary between the user's instruction and untrusted content the agent reads is enforced by the model's judgement, not by a deterministic layer outside it, for that specific class of input. This is the one place their content policy is inside the model, against their own stated principle for tool calls.
ux_verdict: A CLI and VS Code extension with Claude-Code-like permission prompts, sessions, memory and worktree mode; its edge is Jira and Bitbucket context, not a better terminal experience.
slop_verdict: Real and revenue-generating, not a landing page. Marketing oversells (SWE-bench Full quoted where rivals quote the harder Verified split) and two real, since-patched prompt-injection findings sit alongside it.
---

# Atlassian Rovo Dev

## 1. What it is

Rovo Dev is Atlassian's paid AI coding agent, sold separately from the general Rovo assistant, aimed at engineers already on Jira, Confluence and Bitbucket. It plans from Jira work items and acceptance criteria, generates code, tests and docs, and reviews Bitbucket pull requests against those same acceptance criteria. It ships as a CLI (built on Atlassian's acli), a VS Code extension, and a PR-triggered review bot in Bitbucket Cloud.

Atlassian's claim is that its advantage is not a better generic coding agent but the Teamwork Graph: requirements, issue history and knowledge base context wired directly into the loop. The docs and pricing page bear this out. There is no public repository, no architecture beyond a control-plane blog post, and independent reviewers (terminaltrove.com, a Medium comparison) agree the product's differentiation collapses for teams not already on Atlassian's stack.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Jira work items and acceptance criteria feed plans; Bitbucket PR open triggers the review agent. No telemetry or alert intake found. | Forgejo issues, SigNoz alerts, factoryd intake API, all normalised to one task type. | we lead |
| Control plane | Hosted split-plane service: durable conversation state, async sub-agents as durable handles, milestone checkpointing, transparent sandbox retry. No visible approval workflow or budget ledger to the user beyond credits. | factoryd with one Temporal workflow per task, capability policy, budgets, approvals, cost ledger, audit trail. | not comparable |
| Worker plane | Isolated compute sandboxes for the chat/analysis agent, reached via a callback bridge with no direct egress. The CLI's own bash execution appears to run on the developer's local machine with permission prompts, not a disposable per-task sandbox (not verified whether CLI runs route through the same sandboxes as chat). | One gVisor pod per task, ServiceAccount-scoped, default-deny egress to a short allowlist. | not comparable |
| Verification | A code review agent checks diffs against Jira acceptance criteria and suggests fixes on the PR. No mention of CI gating, reproduction at base and head, or a strict-verdict stronger-model review. | Forgejo Actions, policy gates, reproduction gate, stronger-model review with a strict verdict, before bot merge. | we lead |
| Merge and deploy | None found. A human merges the PR; Rovo Dev does not drive deploy. | Bot merge after approval or an auto rule, Flux deploy, staged rollout with an alert-free wait. | we lead |
| Policy outside the model | Server-side permission and auth checks on every tool call (native or MCP), admin allowlist/blocklist (Rovo Access), org-level enablement checks, CMK and IP allowlisting at Enterprise tier. | Capability policy as YAML in Git, enforced in gateway code and network policy. | equal |
| Identity per task | The agent always acts as the inviting human's existing product permissions; no short-lived per-task credential. | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, no keys in the sandbox. | we lead |
| Artifacts not chat | The CLI is an interactive terminal chat session; Jira/Bitbucket are the artifact stores at the edges. | TaskBrief in, branch/PR/event stream out, no long-lived chat. | not comparable |

## 3. Architecture and stack

No source is public, so this section is built from Atlassian's own blog and docs, marked as such. The agent harness post (atlassian.com/blog/rovo/agent-autonomy) describes a split-plane design: a control plane holding the conversation, separate from disposable compute sandboxes used for code execution, large-dataset pagination and artifact storage. Tools are either built in or hosted on remote MCP servers; either way every call passes through an internal server for permission and auth checks first, and a callback bridge relays sandbox tool calls back through the control plane so the sandbox itself never gets direct external network access. Sub-agents are implemented as background, durable hidden Rovo Chat conversations rather than synchronous function calls. CI/CD packages tools into a versioned Python package with sub-100ms warm starts.

The Rovo Dev CLI docs (support.atlassian.com/rovo/docs) describe a separate, more familiar shape closer to Claude Code or Aider: a local binary, workspace-scoped file access by default, a config file for saved tool permissions, sessions, project/user memory, subagents with their own system prompts, a worktree mode for isolated git operations, and an opt-in YOLO mode that skips all approval prompts. One settings page mentions an OS-level bash sandbox, described as macOS-only and possibly internal-use-only; this is the only concrete sandboxing detail found for the CLI itself, distinct from the hosted sandboxes described for the wider harness. External agents reach Rovo through a separate A2A Gateway (developer.atlassian.com/cloud/rovo-a2a/architecture): Agent Card discovery, OAuth 2.0, an org-level enablement check, a JSON-RPC dispatcher, then a proxy into the Rovo backend, which owns task state (the gateway does not).

Models are third-party: OpenAI and Anthropic today, Google mentioned in a training FAQ, under what Atlassian calls zero-data-retention agreements with providers.

## 4. UX

Zero-to-first-result for the CLI: install acli, authenticate to an Atlassian site, run rovodev in a repo, optionally point it at a Jira issue key. Atlassian's own doc structure (separate pages for install, commands, tool permissions, settings) suggests this is a handful of steps, comparable to Claude Code's onboarding; exact step count could not be confirmed because the top-level Use Rovo Dev CLI page is an index with no inline walkthrough.

While the agent works, tool calls surface as approval prompts: allow, ask (default for most tools) or deny per tool, with a scope of once, this session, or always, saved to the config file. Chained shell commands are parsed and each subcommand is checked on its own. A user intervenes by answering these prompts, or disables them entirely with YOLO mode for trusted workflows. The Bitbucket-side review agent has no CLI equivalent: it posts comments directly on the PR, which is closer to how our console shows agent output as a diff and a verdict than to a live terminal stream.

Compared with our console: Rovo Dev has no kanban-style task board of its own, but effectively inherits one from Jira, since work items are already boards. It has no cost view beyond a credit counter, no project view, and no alerts view. It is easier for a lone developer to start (one CLI command, no cluster) and harder for a team lead to see everything running at once.

## 5. Security, identity, sandbox, policy, cost

Identity. Rovo agents run as the inviting user's existing Jira/Confluence/Bitbucket permissions; Atlassian states explicitly that this is always the user's permissions, never the agent creator's. There is no per-task, short-lived credential; the credential is the human's own session for as long as it runs.

Sandbox. Two different things share the name. The CLI executes bash and file operations locally by default, gated by workspace-path restriction and the ask/allow/deny prompts described above; an OS-level sandbox is called out as macOS-only and likely not generally available. Separately, the broader Rovo harness (used by chat and, inferred but not confirmed, by the Bitbucket review agent) runs code in disposable compute sandboxes with no direct outbound network access, all external calls proxied through the control plane.

Policy. Enforcement points named in the docs and the CISO's Secure AI Architecture whitepaper v2 include server-side permission checks on every tool call, an org-level admin enablement switch, Rovo Access allow/blocklists, IP allowlisting and customer-managed keys at Enterprise tier, and audit logs. This is policy outside the prompt for authorisation; it is not policy outside the model for distinguishing trusted instructions from untrusted content, which is exactly what the two 2026 prompt-injection findings exploited.

Cost. Rovo Dev Standard costs 20 USD per user per month for 2,000 credits, with 0.01 USD per credit overage billed per user and per site, not pooled across a team. Admins can pause extra usage instead of paying overage. This is a monthly per-seat cap, coarser than a per-task or per-day hold, and offers no equivalent to a project-level spend envelope.

## 6. What we should take from it

Narrow: the callback-bridge pattern (zero direct egress from the sandbox, every external call including MCP round-trips through the control plane) is stronger than our current default-deny-with-an-allowlist and worth a design note for the worker plane's gVisor pods. The three-tier tool approval (once/session/always) with per-subcommand checking of chained shell commands is a concrete default we can lift for how the console asks a human to approve a risky command. Milestone checkpointing to avoid repeating side effects on a resumed task maps directly onto our session records, which today do not distinguish safe-to-resume points.

Broad: the self-evolution loop, human-reviewed promotion of eval cases mined from failed or inefficient real runs into the harness's regression suite, is a direct answer to our own listed weakness of having no benchmark of agent success rate or harness regression suite. Their split-plane resilience (conversation survives a sandbox crash, retries transparently) is a product-shape idea worth having even though our task granularity is coarser than a chat turn: a worker crash today likely fails the whole task rather than resuming from a checkpoint.

## 7. Where our philosophy differs and what that costs or buys us

Copying their identity model (agent acts as the inviting human, for the session) would be cheaper to build than our projected, task-scoped ServiceAccount tokens, but it breaks identity belongs to the task, not the machine: a compromised or over-permissioned human session becomes the agent's full blast radius, for as long as the session lives, not for the lifetime of one task. We keep the more expensive design on purpose.

Their product stops at a diff or a review comment, with no orchestrated merge-and-deploy state machine; a human always clicks merge in Jira/Bitbucket. That is a smaller system to build, and it is also why Rovo Dev is not really comparable to our merge-and-deploy plane at all, rather than being weaker at it. Being closed-source SaaS is not a philosophy difference so much as a category difference: nothing here can be re-seeded onto our own commodity hardware, so steal for this project always means re-implementing a mechanism, never running their code.

The prompt-injection findings are the one place worth flagging as a genuine open question for us too: our stated trust boundary is about who may steer a task (write access vs. outside accounts), not about content an agent reads mid-task (a fetched web page, an attached file) carrying instructions. Rovo's incidents show that gap is real and exploitable even with a mature, funded security team behind it.

## 8. Red flags and slop assessment

Not slop: this is a shipping, paid, revenue-generating product from a public company, reviewed by Gartner Peer Insights and independent bloggers, with visible customer usage complaints (token burn) that read as real production friction, not absence of use. Two concrete red flags found: the SWE-bench Full number Atlassian markets is the easier split, not the SWE-bench Verified number most competitors quote, which a reviewer (terminaltrove.com) called out directly. And two independently disclosed 2026 prompt-injection paths (Varonis's RovoBlast, PromptArmor's document-based exfiltration) show the trusted-instruction-vs-untrusted-content boundary was not reliably enforced; Atlassian patched the first (server-side fix, 8 July 2026, confirmed by the finder) but the second's fix was unconfirmed as of the CSA's early August 2026 note. Vendor lock-in is explicit and self-admitted in Atlassian's own framing: the product's value proposition depends on already running Jira, Confluence and Bitbucket.

## 9. Sources

- https://www.atlassian.com/software/rovo-dev (fetched 2026-09-29)
- https://www.atlassian.com/blog/rovo/agent-autonomy (fetched 2026-09-29)
- https://developer.atlassian.com/cloud/rovo-a2a/architecture/ (fetched 2026-09-29)
- https://support.atlassian.com/rovo/docs/use-rovo-dev-cli/ (fetched 2026-09-29)
- https://labs.cloudsecurityalliance.org/research/csa-research-note-atlassian-rovo-prompt-injection-data-exfil/ (fetched 2026-09-29)
- https://www.atlassian.com/software/rovo-dev/pricing (web search summary, 2026-09-29)
- https://support.atlassian.com/rovo/docs/rovo-usage-limits/ (web search summary, 2026-09-29)
- https://www.gartner.com/reviews/market/ai-code-assistants/vendor/atlassian/product/rovo-dev (web search summary, 2026-09-29)
- https://terminaltrove.com/compare/ai-coding-agents/claude-code-vs-rovodev/ (web search summary, 2026-09-29)
- https://community.atlassian.com/forums/Atlassian-AI-Rovo-articles/Why-I-added-Rovo-Dev-even-though-we-already-had-Claude-Code-in/ba-p/3245127 (web search summary, 2026-09-29)
- https://community.atlassian.com/forums/Rovo-for-Software-Teams-Beta/Rovo-dev-CLI-cache/m-p/3055261 (web search summary, 2026-09-29, token-usage complaint)
- https://news.ycombinator.com/item?id=44262893 and https://news.ycombinator.com/item?id=44853692 (web search summary, 2026-09-29)
- Seed table row for atlassian-rovo-dev in docs/market-research/README.md (repo: none, confirming no public repository to clone)
