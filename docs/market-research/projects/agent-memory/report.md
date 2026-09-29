---
name: "claude-mem and Letta Code (agent memory for coding agents)"
slug: agent-memory
url: https://letta.com and https://docs.claude-mem.ai
repo: https://github.com/thedotmack/claude-mem and https://github.com/letta-ai/letta-code
category: coding-harness
license: "mixed. Apache-2.0 core for both projects. claude-mem reserves commercial cloud and team features as open-core. Letta's licence adds a Brand Assets Exclusion clause on name and logo"
open_source: yes
self_hostable: partial
hosting_model: "claude-mem runs fully local by default, a Bun and Express worker daemon plus SQLite and ChromaDB on disk, with an optional hosted cloud sync and a beta Postgres and BullMQ team server. Letta Code defaults to Letta Cloud over OAuth, with a local backend and self-hosted app server available but secondary"
company: "claude-mem has a solo maintainer, Alex Newman (@thedotmack), no registered company found, commercial layer sold through cmem.ai. Letta Code is built by Letta Inc, a UC Berkeley Sky Lab spinout founded by MemGPT authors Charles Packer and Sarah Wooders, $10m seed led by Felicis in September 2024, San Francisco"
maturity: "claude-mem: 94.9k stars, 8.4k forks, 330 open issues, first commit 2025-08-31, last commit 2026-09-28, 100 or more contributors per the GitHub API page cap. Letta Code: 3.5k stars, 423 forks, 472 open issues, first commit 2025-10-25, last commit 2026-09-28, 51 contributors"
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 3
steal:
  - Git-backed MemFS as the persistent memory store. A real git repo under $MEMORY_DIR, a required MEMORY.md index, size and depth limits from .memfs.config.json (Letta Code). Project memory as a git repo we clone and reseed like any other.
  - The paired pre-commit and post-commit git hooks that validate memory markdown frontmatter and protect a read_only field from agent edits (src/agent/memory-git-hooks.ts, Letta Code). The right place to attach a stronger trust rule of our own.
  - Kernel-level sandboxing for cross-agent memory writes using bwrap on Linux and seatbelt on macOS (src/sandbox/bwrap.ts, Letta Code). A known primitive worth a look for our own worker sandbox alongside gVisor.
  - The three-layer MCP retrieval pattern, search then timeline then get_observations (claude-mem). Cheap coarse search first, full detail only on demand, for any memory or codebase-index tool we build.
  - The never store secrets, reference dollar SECRET_NAME rule written straight into the agent's own system prompt (src/agent/prompts/letta_local_memfs.md, Letta Code). Cheap to copy verbatim into any memory-writing prompt of ours.
  - Content-hash deduplication of new memory entries, a SHA256 of session, title and narrative inside a 30 second window (claude-mem). A one-line guard against duplicate or noisy memory growth.
differs:
  - Letta's whole model rests on long-lived, named, identity-bearing agents that accumulate memory across unrelated tasks, the opposite of our principle that identity belongs to the task not the machine and workers are disposable.
  - Neither project gates memory writes on who is allowed to write. claude-mem trusts any local process that can reach its loopback HTTP port, and Letta's pre-commit hook runs client-side inside the same sandbox doing the writing, so a compromised agent can skip it.
  - Both projects treat an agent, not a task, as the unit of memory and cost, so our hard per-task and per-day caps would not transplant onto either model without first inventing a task-scoped accounting unit neither project has.
ux_verdict: "Both beat our console on visibility into agent memory with no extra UI work from us, but neither adds an approval or intervention step a human can act on."
slop_verdict: "claude-mem is real, heavily used code with careful engineering, but its star count is hard to trust given its embraced crypto token and a CRITICAL prompt-injection report still open nine days on. Letta Code is thin on independent scrutiny at eleven months old, but is funded, MemGPT-lineage code, not a landing page."
---

# claude-mem and Letta Code

## 1. What it is

claude-mem is a plugin that hooks into Claude Code's session lifecycle to capture, compress and replay a record of what happened, so a later session starts with the gist of earlier ones instead of a blank context. It has one maintainer, Alex Newman (@thedotmack), first committed 2025-08-31. The README calls it automatic, zero-configuration long-term memory for Claude Code. That claim holds up in the code for the core mechanism: five lifecycle hooks (SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd) drive a local worker daemon that stores summarised "observations" and feeds them back into later sessions.

Letta Code is a coding agent in its own right, not an add-on to one. It descends from the MemGPT research project by Charles Packer and Sarah Wooders at UC Berkeley, commercialised as Letta Inc in September 2024 on a $10m seed round led by Felicis. Where claude-mem bolts memory onto somebody else's harness, Letta Code's premise is that the agent itself should be a persistent, memory-bearing entity, a stateful agent with editable memory blocks in its system prompt and a git-backed memory filesystem, MemFS, that it reads and writes like any other project file. The README's claim that the agent should not forget everything when a session ends is architecturally real: MemFS is a genuine git repository, not a marketing name for a database.

Both projects answer a gap named in our own baseline: memory across tasks is limited to what one session hands the next, with no project memory. Neither is a factory, a multi-agent orchestrator, or a verification pipeline. They are two different answers to one narrow question, what should a coding agent remember between sessions and how, which is why they sit in one report under one slug.

## 2. Mapping to our five planes

| Plane or principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Neither takes issues, alerts or telemetry as work sources. Input is only the live session's own prompts and tool calls | Forgejo webhooks, SigNoz alerts and factoryd's intake API turn external events into tasks | not comparable |
| Control plane | claude-mem is a per-user worker daemon plus SQLite and Chroma with no task concept at all. Letta's agents persist as first-class objects with their own id, but there is no scheduling, approval or audit trail around them | factoryd with a Temporal workflow per task, Postgres, policy in Git, approvals and a cost ledger | we lead |
| Worker plane | claude-mem's daemon runs with the full privileges of the local user, no isolation. Letta sandboxes cross-agent memory writes with bwrap or seatbelt, but agents are long-lived, not per-task disposable, and no network egress control is described | One gVisor pod per task, a scoped ServiceAccount, default-deny egress | we lead |
| Verification | Neither runs CI, a policy gate or a model review. Memory content is trusted once it is summarised or reflected on, never checked afterwards | Forgejo Actions, policy gates by risk class, a stronger-model review before merge | we lead |
| Merge and deploy | Neither ships or deploys code | Bot-only merge after approval, Flux GitOps deploy, staged rollout with an alert window | not comparable |
| Policy outside the model | claude-mem's privacy control is a prompt tag, `<private>`, enforced by the model choosing to honour it. Letta's cross-agent write isolation is a real OS-level rule outside any prompt, but it is one narrow rule, an agent may not touch another agent's files | Capability rules are a document in Git, enforced in gateway code and network policy | Letta leads narrowly, claude-mem does not |
| Identity per task | Both use long-lived identity throughout, a named persistent agent (Letta) or a per-user daemon (claude-mem), never a credential scoped to one task and revoked after | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task | we lead |
| Artifacts not chat | claude-mem exchanges narrated text through hooks and MCP calls, not a structured artifact. Letta's MemFS is a genuine git artifact, close to our own style of coordination | TaskBrief in, a branch, a PR and an event stream out, Git as the coordination mechanism | Letta roughly equal, claude-mem behind |

The three axes not covered by a plane above follow the same evidence. `cost_control` scores 1: Letta Cloud meters spend per active agent per month and per second of tool execution, which is real metering but not a cap a self-hoster sets, and claude-mem has no budget or cap of any kind. `ux` scores 4: both give a person direct, low-effort visibility into what the agent currently believes, which our own console does not yet do, but neither adds an approval or stop control a human can act on, which keeps them short of a 5. `reseedable_selfhost` scores 3: Letta Code's local MemFS backend is a git repository, our exact reseed shape, but its default path is a hosted cloud account, and claude-mem is fully self-hostable on commodity hardware but keeps its state in a SQLite file and a vector index rather than a Git artifact, so restoring it is a database restore, not a clone.

## 3. Architecture and stack

claude-mem is a Bun and TypeScript daemon layered onto Claude Code's own hook system, storing state in SQLite and ChromaDB. Letta Code is a full TypeScript agent runtime whose long-term memory is, concretely, a git repository. The table below lines up both on the dimensions the task asked about.

| Dimension | claude-mem | Letta Code |
|---|---|---|
| What is stored | Typed "observations": titled, narrated summaries of each tool call, plus session and project summaries | Memory blocks, editable segments of the system prompt, and MemFS files: skills, reflections, project notes |
| Compression and summarisation | A Claude Agent SDK sub-agent narrates each tool call into a short observation right after the PostToolUse hook fires | A background sleep-time or reflection subagent consolidates and rewrites memory files independently of the interactive turn |
| Retrieval and injection | SessionStart and UserPromptSubmit hooks inject prior context automatically. MCP tools do on-demand three-layer recall, search then timeline then get_observations | Memory blocks sit permanently in the system prompt, always present and directly editable. MemFS files are read with the agent's normal file tools |
| Where it lives | SQLite (`~/.claude-mem/claude-mem.db`) and ChromaDB (`~/.claude-mem/chroma/`) on disk, an optional Postgres and BullMQ team server in beta | A git repository at `$MEMORY_DIR`, optionally synced through Letta Cloud |
| Privacy and poisoning risk | The worker HTTP API has no request authentication by design, the loopback bind is the only defence. A CRITICAL stored prompt injection report (issue #4141) was open and unfixed as of 2026-09-20. Two earlier CRITICAL findings, an unauthenticated settings leak and a path traversal, are fixed | Kernel sandboxing stops one agent tampering with another agent's files, but nothing filters or marks untrusted content before it becomes a trusted memory block |
| Harness coupling | A plugin for Claude Code, with experimental Grok Bot and Cursor chat-log support. Not usable on its own | Is the harness. Usable headless from the CLI or SDK |
| Maturity | 94.9k stars, 8.4k forks, 330 open issues, first commit 2025-08-31, last commit 2026-09-28 | 3.5k stars, 423 forks, 472 open issues, first commit 2025-10-25, last commit 2026-09-28 |
| Licence | Apache-2.0 core, commercial cloud and team features reserved, open-core (`docs/license.md`, `docs/ip-boundary.md`) | Apache-2.0 plus a Brand Assets Exclusion clause on name and logo |

claude-mem's worker daemon binds a per-user port, `37700 + (uid mod 100)`, with a legacy default of `37777`. Its MCP server exposes `search`, `timeline` and `get_observations` as three separate tools rather than one, so a model spends few tokens finding a lead before it pays for the full narrative (`src/servers/mcp-server.ts`). Observations are deduplicated by a SHA256 hash of session, title and narrative inside a 30 second window before being written. Privacy tags, `<private>` and `<claude-mem-context>`, are read by the summarising sub-agent's own prompt (`src/sdk/prompts.ts`, `wrapPriorContext()`), which means privacy here is a convention the model is asked to follow, not a boundary enforced in code.

Letta Code's memory sits inside `$MEMORY_DIR` as a git working tree. A CLI-installed pre-commit hook (`src/agent/memory-git-hooks.ts`, `buildPreCommitHookScript()`) requires every memory markdown file to carry a frontmatter block with a `description` field, refuses any change to a file whose HEAD version is marked `read_only: true`, and enforces file-size and depth limits sourced from `.memfs.config.json`. A post-commit hook mirrors commits to an optional remote. `src/memory-constraints.ts` (`validateMemoryTreeConstraints()`) re-checks the same shape rules from the harness side. Cross-agent isolation is enforced twice: an in-process guard (`src/permissions/cross-agent-guard.ts`) and, underneath it, kernel-level sandboxing, `bwrap` on Linux and `seatbelt` on macOS (`src/sandbox/bwrap.ts`, `src/sandbox/policy.ts`), so one agent's process cannot open another agent's memory files at the OS level even if the in-process guard were bypassed. `src/headless-memfs-policy.ts` decides how MemFS behaves when the agent runs headless rather than under the interactive CLI.

## 4. UX

Both give a user a working memory system with almost no setup, which is the main thing either product sells. claude-mem installs as a Claude Code plugin, and from that point capture is fully automatic: a user does nothing differently, and the next session simply starts already knowing what the last one learned. An optional "Observation TV" viewer streams observations as they are written, useful for watching an agent think without reading raw transcripts. Letta Code's onboarding is heavier because the object being onboarded is different, a persistent agent rather than a disposable session. A first run creates or resumes a named agent, and Letta's visual Agent Development Environment (the ADE) lets a person inspect memory blocks, watch the agent decide what to keep, and step through retrieval, which is a real answer to a problem our own console does not solve, seeing what an agent currently believes about a project.

Neither interface gives a user an approval step. claude-mem has nothing to approve, memory writes happen silently in the background. Letta's memory edits also happen without a gate, the agent edits its own memory blocks and MemFS files as part of normal operation, and the only human check is reading the ADE or the git history after the fact. Stopping either tool mid-task is the same as stopping any CLI process, there is no graceful pause-and-resume UI beyond what the underlying session already supports.

## 5. Security, identity, sandbox, policy, cost

Security in claude-mem is built around a single load-bearing assumption, that the worker's local HTTP port is only reachable from the same machine. A comment in `src/services/worker/http/middleware.ts` states this directly: "The worker's HTTP surface has no request authentication, its only defence is the loopback bind." An independent audit (GitHub issue #1251, early 2026) reported this as CRITICAL alongside a cleartext API key leak on `GET /api/settings` and a path traversal in the `smart_unfold` and `smart_outline` MCP tools. Reading the current HEAD (commit `ade13f3`, 2026-09-28) against that report: the traversal is fixed, `resolveWithinWorkspace()` in `src/services/smart-file-read/workspace-path.ts` realpath-resolves both sides and rejects anything that escapes the workspace, citing issue #3861 in its own docstring. The key leak is fixed too, `SettingsRoutes.ts` now masks a fixed allowlist of secret setting keys before a response leaves the process. The unauthenticated HTTP surface itself was not treated as the bug, loopback binding remains the accepted boundary, and the only addition since is a narrow allowlist of four read-only routes behind a shared secret, built for an opt-in remote viewer, not a general fix. A newer, more specific finding, issue #4141, opened 2026-09-20 and still open at the time of writing, reports a stored prompt injection: observation titles are only whitespace-collapsed before being assembled into a memory block that a downstream integration delivers into future sessions as an instruction, so adversarial content summarised from a tool call's output can persist into later sessions unless a human notices. This is exactly the scenario the task asked about, an outside actor's text becoming a trusted instruction in project memory, and it is presently unresolved in the upstream project.

Letta Code enforces one specific trust boundary in code rather than in a prompt: an agent must not read or write another agent's memory files. That rule is backed by kernel-level sandboxing (`bwrap`, `seatbelt`) with an in-process guard as a second check. MemFS carries a second, weaker layer, the pre-commit hook described in section 3, which validates shape and blocks edits to `read_only` files. That hook runs inside the same sandboxed process doing the writing, so it stops accidents and a well-behaved agent overstepping its own rules, not a deliberately adversarial one, which can call the git commit no-verify flag or edit the hook file directly if the sandbox does not mount that path read-only. Nothing in the reflection subagent's prompt (`src/agent/subagents/builtin/reflection.md`) or in the structural validator checks provenance. Text summarised from an untrusted source, a fetched web page, an issue, another user's message, can become a permanent memory block with no marker that it came from outside. This is a reading of the code, not a documented incident, and is stated here as an architecture gap rather than a citable finding.

Identity in both projects is long-lived. claude-mem's daemon runs as the local user with that user's full filesystem access, with no scoping per session. Letta's agents hold a persistent identity and, on Letta Cloud, an OAuth-linked account, with API key auth available on the Developer plan. Neither narrows a credential to one task and revokes it afterwards.

Whether an agent can reach the internet is not restricted by either project's own code, as far as this review found. claude-mem's daemon is an ordinary local process with no described egress control. Letta's sandboxing (`FsSandboxPolicy`) is scoped to the filesystem, and Letta's own pricing page bills web search and fetch tools separately, which implies agents reach the internet by design with no sandbox around that path. This is not verified beyond the docstrings and pricing page read for this report.

Cost is not task-scoped in either project. claude-mem runs its summarising sub-agent on every tool call with no visible budget, an invisible cost on whatever model the user's own subscription or API key is already paying for. Letta Cloud meters cost per active agent per month plus per-second tool execution, real metering, but sold and billed as a vendor product, and Letta's own pricing page states heavy coding use commonly runs to $200 or more a month on top of underlying model costs.

## 6. What we should take from it

Narrow, copyable this month: a project memory artifact should be a git repository, the way Letta's MemFS is, with a required index file and machine-checked size and depth limits, because a git repo is exactly the object our whole design already knows how to clone, diff, review and reseed. The attachment point for validating that repo should be a git hook keyed to markdown frontmatter, the way Letta's pre-commit hook is built, moved to run server-side (see section 7) rather than inside the writer's own sandbox. Filesystem-scoped sandboxing with `bwrap` or `seatbelt` is worth evaluating as a lighter complement to gVisor for the narrower question of which paths inside a worker's own workspace it may write to. From claude-mem, the three-layer MCP retrieval pattern, search then timeline then get_observations, and its content-hash deduplication of new entries are both small, cheap habits worth copying into any memory or codebase-index tool we build, search coarse before reading full detail, and hash new entries against a short recent window before writing them. Letta's system prompt line, never store secrets, reference the name instead, is worth copying verbatim into any prompt that writes to memory of ours.

Broad, product shape: both projects treat "what should the agent remember between sessions" as a first-class product question, something our own baseline explicitly leaves unfinished. Letta Code's answer, memory as a git-backed filesystem the agent edits like code, fits our re-seed constraint far better than claude-mem's SQLite-and-vector-store answer, because it is already the artifact type our design is built around. Letta's visible memory UX, the ADE, a place a person can read and edit what the agent currently believes, answers a console weakness we already know about, no real-time view of an agent's state. We do not need Letta's whole runtime to take the idea, an "agent's current memory" view in our own console, backed by a Git diff of the memory repo, is a smaller and achievable version of the same thing.

## 7. Where our philosophy differs and what that costs or buys us

The headline difference is identity. Letta's whole model rests on long-lived, named agents that accumulate memory across unrelated tasks, the opposite of our principle that identity belongs to the task, not the machine, and that workers are disposable. Copying Letta's memory model whole would mean keeping a durable agent object that outlives any single task, a different kind of control-plane object than our TaskBrief-in, PR-out loop, and it would reopen the exact problem short-lived credentials exist to close, a long-lived identity that accumulates privilege and blast radius over time. We keep the constraint and pay for it with more design work: a persistent memory artifact has to be reconstructed and re-consumed by a fresh, disposable worker every time, rather than living inside one continuously running process the way it does for Letta.

There is a place where Letta's approach is genuinely better for the specific sub-problem, project continuity. A persistent process that has watched a project for months has cheaper, more textured recall than a worker that reconstructs context from a memory artifact on every task. Our constraint buys real security properties, no long-lived credential, no long-lived blast radius, at the price of needing to design that recall externally and well, rather than getting it for free from a process that never stops running.

Neither project gates memory writes on who is allowed to write, which is the gap the task specifically asked about. claude-mem trusts any local process able to reach its loopback HTTP port. Letta's pre-commit hook runs client-side inside the same sandbox doing the writing, so a compromised or adversarial agent can skip it outright. Our own rule, that an outside account's text reaches an agent marked as untrusted and only people with write access steer a running task, has no counterpart in either project's memory layer. Building this ourselves means treating project memory as a Git artifact with the trust boundary enforced where neither project puts it, a server-side pre-receive hook or branch protection rule on the memory repository's Forgejo remote, not a client-side git hook inside the worker's own sandbox. Concretely: a task worker may read untrusted issue or PR text and act on it for the current task, but a commit to the memory repository should only be accepted from a specific, narrow writer, for example a step that runs only after the stronger-model review has passed, or a signed commit from the control plane itself, never a commit made directly by the disposable worker process that just read an outside author's words. That rule costs us nothing structurally, since our own control plane already enforces policy outside the model and write-access-only steering for code, and a memory repository is exactly the kind of Git object that pattern was built to protect.

## 8. Red flags and slop assessment

claude-mem is real, actively developed code, with the kind of explanatory comments in the source that come from someone who has actually been paged about the thing they are commenting on, and it fixed two of three CRITICAL findings from an external audit within roughly two quarters. Set against that: the README embraces a third-party crypto token, quoting it directly, "CMEM is a token created by a 3rd party but officially embraced by the creator of Claude-Mem", which is the kind of incentive that correlates with inflated GitHub metrics elsewhere in the ecosystem. A star count of 94.9k for an eleven-month-old, single-maintainer Claude Code plugin, with only 330 open issues and no independent press or review coverage found in this search, is worth treating with real scepticism even though this report found no direct evidence of star manipulation, only the circumstantial combination of a token tie-in and a metric that outruns any other signal of reach. The open, unfixed stored prompt injection report, issue #4141, nine days old at the time of writing, is a genuine current red flag, not a historical one.

Letta Code is young, eleven months old, and independent scrutiny is thin, this report found one substantive third-party review (VibeCodingHub) plus several vendor comparison posts written by competing memory products, which should be read as marketing, not evaluation. Architecture claims beyond the code itself lean heavily on Letta's own blog and docs. No security incident specific to Letta Code turned up in this search, which is not the same as none existing, it is a young enough project that few people have looked. Letta Code is open source and usable headless without payment, but the default onboarding path and the more capable features, remote sandboxes, Letta Auto quota, team access, sit behind Letta Cloud pricing, and the self-hosted path is present in the docs but clearly secondary.

## 9. Sources

- https://github.com/thedotmack/claude-mem
- https://github.com/thedotmack/claude-mem/issues/1251
- https://github.com/thedotmack/claude-mem/issues/4141
- https://github.com/letta-ai/letta-code
- https://letta.com
- https://docs.letta.com/letta-code/pricing
- WebSearch: claude-mem prompt injection OR memory poisoning security 2026
- WebSearch: Letta Code review OR vs agent memory 2026
- WebSearch: Letta Inc funding seed round Felicis Charles Packer Sarah Wooders
- market-research-clones/agent-memory/claude-mem/README.md
- market-research-clones/agent-memory/claude-mem/LICENSE, NOTICE, SECURITY.md, CHANGELOG.md
- market-research-clones/agent-memory/claude-mem/docs/architecture-overview.md, docs/server.md, docs/api.md, docs/ip-boundary.md, docs/license.md, docs/server-architecture-and-team-vision.md
- market-research-clones/agent-memory/claude-mem/src/sdk/prompts.ts
- market-research-clones/agent-memory/claude-mem/src/services/worker/http/middleware.ts
- market-research-clones/agent-memory/claude-mem/src/services/worker/http/routes/SettingsRoutes.ts
- market-research-clones/agent-memory/claude-mem/src/services/smart-file-read/workspace-path.ts
- market-research-clones/agent-memory/claude-mem/src/servers/mcp-server.ts
- market-research-clones/agent-memory/letta-code/README.md
- market-research-clones/agent-memory/letta-code/LICENSE, AI_POLICY.md, CONTRIBUTING.md
- market-research-clones/agent-memory/letta-code/src/agent/prompts/letta_local_memfs.md
- market-research-clones/agent-memory/letta-code/src/agent/subagents/builtin/reflection.md
- market-research-clones/agent-memory/letta-code/src/memory-constraints.ts
- market-research-clones/agent-memory/letta-code/src/headless-memfs-policy.ts
- market-research-clones/agent-memory/letta-code/src/agent/memory-git-hooks.ts
- market-research-clones/agent-memory/letta-code/src/sandbox/bwrap.ts, src/sandbox/policy.ts
- market-research-clones/agent-memory/letta-code/src/permissions/cross-agent-guard.ts
- market-research-clones/agent-memory/letta-code/src/backend/api/memfs-git-proxy.ts
