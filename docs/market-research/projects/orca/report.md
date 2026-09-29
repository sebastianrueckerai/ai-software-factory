---
name: Orca
slug: orca
url: https://onorca.dev
repo: https://github.com/stablyai/orca
category: multi-agent-ui
license: MIT
open_source: yes
self_hostable: yes
hosting_model: Local Electron desktop app by default; optional self-hosted `orca serve` remote runtime over SSH; optional BYO cloud-VM recipes; mobile pairing requires Stably's hosted relay and push SaaS
company: Stably AI, YC W22 (legal entity Lovecast Inc., pivoted from an earlier product), San Francisco. Founders Jinjing Liang (CEO) and Neil Parker (CTO). Funding undisclosed beyond YC.
maturity: created 2026-03-17, 81.2k stars, 5.3k forks, 7,056 open issues, 390+ contributors (heavily concentrated), releases roughly daily (six tags in the week before 2026-09-29), last commit 2026-09-29
similarity: 1
axes:
  signals_intake: 1
  control_plane: 2
  sandbox_isolation: 1
  verification: 0
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 4
  reseedable_selfhost: 1
steal:
  - "The plain-text diff-comment wire format (formatDiffComment/formatDiffComments in src/shared/diff-comments-format.ts): file path, line number and quoted comment body batched into one prompt block. Worth copying the format even though we would deliver it differently."
  - "Guarded prompt delivery with a pre- and post-send readiness check (sendPromptWithGuardedPasteAndEnter in src/renderer/src/lib/active-agent-note-send-delivery.ts): paste, wait, re-check the target is still ready, then send Enter as a separate step. A useful pattern anywhere we inject text into a process we do not fully control."
  - "--precheck on scheduled automations (docs/site/content/docs/cli/automations.mdx): skip a scheduled run when a cheap shell probe exits non-zero, and record it as a skipped run rather than a failure. Cheap to add to our own scheduled jobs."
  - "The mandatory PR-template field in .github/CONTRIBUTING.md forcing every PR (including AI-authored ones) to carry a short security and cross-platform review summary. Low-cost nudge worth requiring on our own bot-authored PRs."
  - "Anonymous, opt-out product telemetry that explicitly excludes file, prompt and terminal content (docs/site/content/docs/telemetry.mdx). A reasonable default if we ever add usage analytics to the console."
  - "The documented 'race N agents' recipe (docs/site/content/docs/recipes/parallel-agents.mdx) as a piece of user-facing documentation, not code: worth writing our own short doc on running the same TaskBrief twice when a task is ambiguous, even without new engineering."
differs:
  - "Zero credential brokering. Orca holds no keys and reads the agent CLI's own local auth state (for example ~/.claude), so the agent runs with the user's full ambient identity. This is the opposite of 'identity belongs to the task'; we could not adopt it without giving up per-task scoped tokens."
  - "No sandbox by default. Isolation is a git worktree (directory separation only) on the same OS, same user, same network. The optional SSH/cloud-VM modes are bring-your-own and Orca provides no sandboxing itself. Copying this would remove our gVisor-pod, default-deny-egress boundary entirely."
  - "Best-of-N is human-judged with no automated evidence and no cost accounting: N full agent runs, a human reads N diffs and picks one. Layering this on our metered LiteLLM gateway as-is would multiply real spend by N with nothing for the budget ledger to reason about."
  - "No durable server-side task state. State is a local orca-data.json plus an experimental in-process orchestration layer (Run/Task/Dispatch). There is no re-seedable-infra story because there is no shared infra: it is a single-user desktop tool, not a multi-tenant control plane, so its architecture answers a different problem than ours."
ux_verdict: The best UX we have reviewed for watching and steering several coding agents at once; it has no equivalent of an approval workflow, an audit trail, or a cost view for a second reviewer.
slop_verdict: Real and heavily used, with daily releases and 390+ contributors, but the security model is a marketing feature ("bring your own subscription, no sandbox") rather than an oversight, and a live, unresolved GitHub issue shows that trade-off breaking in the wild.
---

# Orca

## 1. What it is

Orca is a free, open-source desktop application ("agent development environment", ADE) from Stably AI that runs several coding-agent CLIs (Claude Code, Codex, Cursor, opencode, Gemini, and 25+ others) side by side, each in its own git worktree, inside one Electron app with terminals, an embedded browser, a Monaco-based diff viewer, and iOS/Android companion apps for remote monitoring. It is sold as free forever and open source, with an "Enterprise" page linked from the site but no published enterprise features or pricing. It targets individual developers and small teams who already pay for one or more agent CLI subscriptions and want a cockpit to run many of them in parallel.

The README and site claim Orca is a complete alternative to a traditional IDE for "agentic development," with "new features shipped daily." What the repository actually shows is narrower and more consistent with that claim than most such pitches: a genuinely large, fast-moving Electron codebase whose core mechanism, underneath the polish, is a git worktree per agent plus a PTY (pseudo-terminal) that pastes text into whatever CLI the user already has authenticated locally. There is no task registry, no policy engine, no sandbox, and no cost ledger anywhere in the product; Orca is a UI and a scripting layer over agent CLIs the user is trusted to have configured safely themselves.

## 2. Mapping to our five planes

| Plane / principle | What Orca does | What we do | Verdict |
|---|---|---|---|
| Signals | CLI-driven worktree creation from a GitHub or Linear issue (orca worktree create --issue), plus scheduled "automations" with a prompt and an optional --precheck shell probe. No webhook listener, no marking of untrusted external text. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API; every task is a Forgejo issue; external text is marked untrusted. | we lead |
| Control plane | Experimental "Orchestration" layer (Settings, Experimental): Run, Task, Dispatch, worker, message, decision-gate objects with statuses (pending/ready/dispatched/completed/failed/blocked). In-process, single-instance, no policy or budget tied to it, explicitly labelled experimental with retired legacy commands. | Temporal workflow per task, Postgres task registry, policy as YAML in Git, budgets, approvals, audit trail. | we lead |
| Worker plane | A child process running the user's own agent CLI inside a git worktree on the host OS. Full ambient user identity, no sandboxing by default. | One gVisor pod, ServiceAccount and namespace per task, read-only root FS, default-deny egress, behind a Harness interface. | we lead |
| Verification | None built-in. Best-of-N selection is a human reading N diffs. CONTRIBUTING.md requires a security/cross-platform review paragraph in PRs to Orca itself, but nothing verifies Orca's own agent output. | CI on gVisor runners, path-risk policy gates, a reproduction gate at base and head, then a stronger-model review with a strict verdict. | we lead |
| Merge and deploy | None. Orca is a local dev tool; the user commits and pushes from the worktree by hand. | Bot merge after human approval or an auto rule for reproduced, strictly-improving changes; Flux GitOps deploy with a staged rollout and an alert window. | not comparable |
| Policy outside the model | None found; permissions are OS file permissions plus whatever guardrails the agent CLI itself enforces. | Capability policy is a document in Git, enforced in gateway code and network policy. | we lead |
| Identity per task | None. Zero credential brokering: Orca reads the agent CLI's own local auth state and launches it as a plain child process with full ambient trust (see section 5 and the open cross-host issue in section 8). | Projected, audience-scoped, gateway-verified ServiceAccount token per task; per-task virtual LiteLLM key; no key material in the sandbox. | we lead |
| Artifacts not chat | Comments are collected in a structured DiffComment type but delivered as literal pasted chat text into the agent's terminal. The artifact (the diff) is real; the instruction channel back to the agent is chat. | TaskBrief in, a branch/PR/event stream out; no chat channel to the agent. | we lead |

## 3. Architecture and stack

Electron 43 desktop app, React 19 renderer, TypeScript 7, Vite (aliased to rolldown-vite), Vitest for tests. UI stack: Monaco editor (monaco-editor + @monaco-editor/react) for the diff view, @xterm/xterm plus several addons and node-pty for terminals, Zustand for state, Zod for schema validation, Tailwind 4, react-i18next for translation, ws for websocket transport. Package metadata: name orca, version 1.4.214 at clone time, description "Next-gen IDE for parallel agentic development", bins orca and orca-dev (package.json).

Persistence is a local JSON file (orca-data.json) written by a "WorktreeMeta" persistence layer; diff comments are normalised and merged into that same file (src/main/folder-workspace-diff-comments.ts). There is no database and no server process required for the core desktop experience.

Renderer and main process talk over an internal RPC (callRuntimeRpc in src/renderer/src/runtime/runtime-rpc-client.ts), which the main process implements against a large src/main/runtime/ module (hundreds of files) that owns PTY sessions, terminal state, agent status detection and session recovery. Prompt delivery to an agent is uniformly a PTY paste: sendPromptWithGuardedPasteAndEnter (src/renderer/src/lib/active-agent-note-send-delivery.ts) wraps the prompt in bracketed-paste markers, sends it over terminal.send, waits POST_PASTE_SUBMIT_DELAY_MS, re-checks the terminal is still in a "sendable" agent state, then sends a separate Enter keystroke. Readiness detection (idle vs busy, "sendable" vs "no-agent") is generic terminal-output heuristics for most agents, but Codex gets its own richer path: a src/main/codex/codex-structured-* family of modules parses Codex's own structured session/journal output (turn end, question order, exit blame, background tasks) rather than relying only on raw terminal text. So the claim "PTY paste is the universal adapter" needs that one qualification: delivery is uniformly PTY, but status parsing is agent-specific and, for at least Codex, more structured than plain terminal scraping.

Isolation is entirely git worktrees (docs/site/content/docs/model/worktrees.mdx): each agent session gets its own working directory and branch off the same repository clone, with optional shared-file mechanisms (orca.yaml, .worktreeinclude) for files that must stay common. There is no process, filesystem or network sandbox layered on top; "Ways to run" (docs/site/content/docs/ways-to-run.mdx) documents four deployment modes: Local desktop (no isolation), SSH target (a remote host, still no isolation once connected), Remote Orca Server (a persistent shared runtime you self-host), and Cloud VM per-workspace (fully opt-in, bring-your-own recipe scripts for Vercel Sandbox, Fly, Modal or Docker), and states plainly that Orca itself does not sell or provide managed VPS hosting or sandboxing; any real isolation is the user's own infrastructure choice.

A separate cloud/ workspace implements "Orca Relay" for the mobile companion apps: a director/cell WebSocket-splicing architecture pairing desktop and phone, X25519-based host authentication, a narrowly-scoped relay-fence-broker service (IAM-only, limited Terraform/Compute mutation rights), a separate Cloud Run push gateway holding APNs keys, Postgres/SQLite storage, and aggregate-only logging (cloud/README.md). This hosted relay is the one part of the product that is SaaS rather than fully local.

## 4. UX

A user installs the desktop app, opens a repository, and picks an agent from a "Quick Launch" menu; Orca creates a worktree and a terminal and starts the CLI, which reads its own existing local login (for example an already-authenticated claude CLI) with no extra configuration (docs/site/content/docs/agents/claude-code.mdx). First result is roughly: open app, pick repo, pick agent, type a prompt: four steps, no signup screen and no API key entry, because Orca never asks for one.

While an agent works the user sees a live terminal pane (the agent's own CLI output, unmodified), a sidebar with per-agent status dots (idle/running/waiting/done), and, once there is a diff, a Monaco-based combined diff viewer. The reviewer can leave inline gutter comments on individual lines of the diff (docs/site/content/docs/review/annotate-ai-diff.mdx, src/shared/diff-comment-types.ts); these are stored as structured DiffComment objects (file path, line number, side, comment text, timestamp) and only become agent input when the user explicitly sends them, either by copying a formatted plain-text block to the clipboard or by choosing an existing running agent terminal (or launching a new one) from a "Send notes" menu (NotesSendMenu.tsx, ReviewNotesSendMenuContent.tsx). Sending is not automatic and not real-time; it is a deliberate, one-shot paste-and-submit into a terminal the user is already watching.

For running several attempts at once, the documented pattern ("Race three agents on the same task", docs/site/content/docs/recipes/parallel-agents.mdx) is fully manual: the user creates three worktrees, launches three agents with the same pasted prompt, and reviews three diffs side by side to pick a winner. An "Orchestration" CLI layer (docs/cli/orchestration.mdx, marked Experimental) adds a more structured Run/Task/Dispatch/message model with worker_done reporting and decision gates the coordinator can block on, but even there, selecting a winner among competing attempts is a human or coordinator-agent decision; nothing in the docs describes an automated judge or a test-based score.

This is clearly the strongest UX of anything we have reviewed for a human who wants to watch and steer several agents by hand: real-time terminal streams, a real diff view, drag-files-to-agent, mobile monitoring, and SSH/remote worktrees are all things our own console admits it lacks (00-our-vision.md: "no real-time streams of the agent's work, no diff view, no mobile view"). It has no equivalent, however, of an approval gate, a cost view, or an audit trail a second reviewer could rely on without being the person who watched the terminal live.

## 5. Security, identity, sandbox, policy, cost

Credentials. Orca holds no API keys and brokers nothing. It launches each agent CLI as a plain child process with the worktree as its working directory and lets the CLI find its own local auth state (for example ~/.claude), including switching between multiple locally logged-in accounts (docs/site/content/docs/agents/claude-code.mdx). This is a deliberate "bring your own subscription" design, not an oversight, but it means every agent runs with the full ambient trust of the user's own machine.

Sandbox. None by default. Isolation is a git worktree: same OS, same user, same filesystem outside the worktree, same network. The only ways to get real isolation are self-managed: SSH into an already-sandboxed remote host, self-host a persistent "Orca Server", or wire up a bring-your-own cloud-VM recipe (Vercel Sandbox, Fly, Modal, Docker). Orca explicitly does not sandbox and does not sell managed hosting.

Policy. Nothing enforced in code. Whatever guardrails exist are whatever the agent CLI itself does (for example Claude Code's own permission prompts), not anything Orca adds.

Cost. Not tracked or capped anywhere in the app. Cost is entirely the user's own subscription or API usage with the underlying agent CLI; running N agents in parallel (or racing N agents on one task) simply multiplies that external cost with no ledger, hold or cap inside Orca.

Concrete evidence of the trade-off failing. An open issue filed the same day as this report, stablyai/orca#23835 (https://github.com/stablyai/orca/issues/23835, 2026-09-29), reports that the orca CLI running on a remote host the user believed was sandboxed can list, read and control the local desktop Orca instance's terminals and all its other connected SSH hosts. It is a live, dated confirmation that "no policy or identity boundary between hosts" is not a theoretical gap.

## 6. What we should take from it

Narrow (copy this month). The diff-comment plain-text format (formatDiffComment/formatDiffComments) is a good template for turning a structured review comment into an unambiguous instruction block, regardless of how we deliver it. The guarded-paste pattern (send, wait, re-verify still ready, then submit as a separate step) is a sound template for any place we inject text into a process whose internal state we cannot fully observe. The --precheck idea on scheduled automations (skip and record, don't fail, when a cheap probe says there is nothing to do) is a one-line addition worth making to our own scheduled jobs. The CONTRIBUTING.md requirement that every PR carry a short security/cross-platform review paragraph is a cheap discipline we could require of our own bot-authored PRs.

Broad (product shape). The UX gap Orca closes, real-time visibility into what an agent is doing and a real diff view to review it, is exactly the gap our own baseline names as unfinished. Orca's answer (a rich desktop Monaco-based diff editor with inline comments) is not the one we should copy wholesale, because it assumes a persistent interactive terminal per agent and a fat client; our workers are disposable per-task pods with no kept-alive terminal to paste into. The htmx-compatible version of the same idea is a server-rendered unified-diff partial with a small hx-post form per line or hunk, posting a comment that is stored against the task and surfacing in the next revision of that task's TaskBrief at the next workflow gate (for example the "waiting on a human" state), rather than being pasted live into a running agent's terminal. This fits our disposable-worker model directly: the comment does not need to reach a process that is still alive, because the next session starts fresh from an updated TaskBrief anyway. If we want the review-and-comment loop to feel closer to Orca's immediacy, the smallest useful addition is a diff partial and a comment-submit endpoint in the console; no client-side rich editor, no new dependency.

Best-of-N is not a good candidate for direct adoption as Orca implements it: unmetered, human-judged, and multiplying real cost with no automated evidence. It could fit our model in a reframed form: the gateway takes an N-times cost hold upfront against the task's existing budget envelope, N is capped small (two or three) and restricted to the cheap model tier, and the winner is picked automatically by the verification plane we already have (the reproduction gate and, if needed, the stronger-model review) rather than by a human reading N diffs. That turns "race N agents" from a UX feature into a control-plane feature with an evidence trail, which is the version worth building if we build it at all, and it is worth asking first whether the supervisor's existing "retry on a stronger model" escalation already covers the cases best-of-N would target, before adding a second mechanism for the same problem.

## 7. Where our philosophy differs and what that costs or buys us

Orca's "bring your own subscription, zero credential brokering" model is the clearest place our philosophy cannot follow. "Identity belongs to the task" requires a credential broker in the loop on every model call; Orca's entire value proposition to an individual developer (free, works with the subscription you already pay for, no extra sign-up) depends on there being no broker at all. We could not adopt this model without abandoning per-task scoped tokens, and Orca's own open issue #23835 is a direct illustration of the cost of not having one: an agent on a "sandboxed" remote host can reach back and control everything else the user's Orca instance touches.

The same trade shows up in sandboxing: Orca's worktree-only isolation is cheap, requires no infrastructure, and is exactly why it can be a free single-binary desktop app; our gVisor-pod-per-task model is the reason we do not have that failure mode, at the cost of needing a Kubernetes cluster and a control plane Orca does not need at all. Neither is a mistake; they are answers to different questions: Orca is a tool a single trusted developer runs on their own machine, we are a multi-tenant factory that must not trust the agent with the operator's own blast radius.

Where Orca's approach is simply better and our constraint is the price: our console genuinely has no diff view and no real-time stream today, and that is a real UX cost of building a server-rendered, disposable-worker architecture instead of a rich desktop client with a persistent terminal per task. Closing that gap the htmx way (per section 6) is possible but will never feel as immediate as a local terminal you are staring at live.

## 8. Red flags and slop assessment

This is a real, heavily used and actively maintained project, not a landing-page-with-a-README: 390+ contributors, roughly daily releases (six tagged releases, v1.4.211 through v1.4.216, in the week before 2026-09-29), a commit on the day of this report, and a large, substantive codebase (hundreds of files under src/main/runtime/ alone, extensive test files alongside implementation files). Contribution is heavily concentrated in a small number of core developers (the top contributor alone accounts for well over half of first-page commit counts across the four contributor pages we checked), which is typical of a founder-led, fast-moving startup rather than a broad community project.

Two things temper the "clean OSS project" reading. First, the LICENSE file's copyright holder is "Lovecast Inc.", the founders' earlier, pivoted YC W22 company, not "Stably AI" or "Orca", which the site, docs and marketing all use; this is a paperwork mismatch rather than a licensing problem (the license itself is a plain, unmodified MIT grant), but it is worth knowing the legal entity behind the MIT grant is not the brand name. Second, and more substantively, the product's central security trade-off ("no sandbox, your own subscription, full ambient trust") is not a hidden flaw but a stated design choice, and it is already producing a concrete, dated failure in the wild: issue #23835 (opened 2026-09-29, open at time of writing) describes an agent on a remote host fully controlling the local desktop instance and every other connected host. That is the predictable consequence of the architecture documented in ways-to-run.mdx, not a one-off bug, and it should be read as a live demonstration of exactly the gap our own "identity belongs to the task" and "policy outside the model" principles exist to close.

## 9. Sources

- https://github.com/stablyai/orca (cloned --depth 1 to ~/repos/market-research-clones/orca)
- https://onorca.dev (WebFetch, 2026-09-29)
- https://github.com/stablyai/orca/issues/23835 (gh api, 2026-09-29)
- gh api repos/stablyai/orca (stars, forks, open issues, created date, license, homepage)
- gh api repos/stablyai/orca/releases (release cadence)
- gh api repos/stablyai/orca/contributors, pages 1-4 (contributor count and concentration)
- git log (last commit date) in the local clone
- README.md
- LICENSE
- package.json
- src/shared/diff-comment-types.ts
- src/shared/diff-comment-schema.ts
- src/shared/diff-comments-format.ts
- src/main/folder-workspace-diff-comments.ts
- src/renderer/src/components/editor/DiffNotesSendMenu.tsx
- src/renderer/src/components/editor/combined-diff/review-controls/use-combined-diff-notes-actions.ts
- src/renderer/src/components/editor/NotesSendMenu.tsx
- src/renderer/src/components/editor/ReviewNotesSendMenuContent.tsx
- src/renderer/src/lib/active-agent-note-send.ts
- src/renderer/src/lib/active-agent-note-send-delivery.ts
- src/main/runtime/ (directory listing, hundreds of files, spot-checked for a harness/adapter abstraction)
- src/main/codex/codex-structured-*.ts (directory listing, structured-journal integration for Codex)
- docs/site/content/docs/model/worktrees.mdx
- docs/site/content/docs/recipes/parallel-agents.mdx
- docs/site/content/docs/review/annotate-ai-diff.mdx
- docs/site/content/docs/ways-to-run.mdx
- docs/site/content/docs/agents/claude-code.mdx
- docs/site/content/docs/telemetry.mdx
- docs/site/content/docs/cli/overview.mdx
- docs/site/content/docs/cli/orchestration.mdx
- docs/site/content/docs/cli/automations.mdx
- .github/CONTRIBUTING.md
- cloud/README.md
- WebSearch: "Orca Stably AI YC Lovecast founders review" (2026-09-29), including https://www.ycombinator.com/companies/stably-ai-orca and https://foundertrace.com/companies/lovecast_yc_w22/
