# Vibe Kanban

- Product and URL / repository: Vibe Kanban, https://vibekanban.com / https://github.com/BloopAI/vibe-kanban
- License, price model, self-hosted tier: Apache-2.0 at the studied commit (the closed `vk-billing`
  crate of the old Cloud tier is dead weight since the shutdown). Free entirely; local-first single
  binary. No account, no API key of its own — it shells out to agent CLIs the operator already
  installed. No vendor left to bill anyone.
- Alive? Community-maintained since Bloop AI shut down 2026-04-10. 28,233 stars, 544 open issues,
  not archived, `pushed_at` 2026-09-19 (gh api, checked 2026-10-01). Last commits: "chore: bump
  version to 0.1.45 (#3462)" and "fix: Tanstack router api fix (#3464)" — but **no release
  artifacts past v0.1.44** (GitHub releases stop 2026-04-24; npm latest is 0.1.44). The source is
  alive; the distribution channel is not. Build-from-source works (proved this session).
- Studied how: **studied from a clone at d5cbb5380fa0b32e98ef9b8d987f63decce4be3a** (2026-09-19,
  the head commit), on 2026-10-01/02. The UI was rendered locally keyless from that exact source
  via a Docker build, on host port **9150** (the assigned 9149 was taken; container port 9149).
  No API key, no account, no remote was ever contacted. What could not be triggered keyless
  (the remote kanban board, the Codex-only approval dialog) was studied in source and in the
  upstream docs images, labeled as such below.
- One sentence: a local-first single-binary workbench that runs ten coding-agent CLIs, one git
  worktree per task, behind a workspace list that streams every agent action as a normalized
  event timeline — the board whose name it carries now lives behind a dead company's login.

### Changed since the 2026-09-29 baseline (`docs/market-research/projects/vibe-kanban/report.md`)

The baseline studied the same head commit three days earlier, so the delta is knowledge, not
code:

- **Confirmed: the classic kanban board is unreachable in local mode at this commit.** The
  baseline's UX section still described drag-and-drop columns from the docs. Rendering the real
  local build shows the Workspaces UI is the only local surface: `/workspaces` hard-redirects to
  `/workspaces/create` (`packages/local-web/src/routes/_app.workspaces.tsx`), and the right rail
  of the landing page carries the tombstone of the whole remote tier: *"Kanban Boards — Sign in
  to organise your coding agents with kanban boards. Sign in"* — rendered live in
  `01-landing.png`. Columns exist only in the remote product (docs image, `05-kanban-board-docs.png`).
- **Confirmed: v0.1.45 shipped no binaries.** Release pipeline stopped with the company; npm and
  GitHub Releases both end at 0.1.44. Installing current source now means building it — which
  this session did end to end in Docker (recipe in section 6).
- **The event schema grew past the baseline's description.** The baseline listed the core
  variants; the full enum at this commit (below) adds `next_action` (with failed /
  execution_processes / needs_setup), `user_answered_questions`, `loading`, and
  `user_feedback` (denied_tool) — the schema is still being designed against, five months
  after the company died.
- Stars 28,215 → 28,233; no new commits. Momentum is flat-but-alive.

---

## 1. The board model

There is no board on the local screen. That sentence is the finding, and it is worth more than
any column description: **at this commit, Vibe Kanban's local UI has no columns at all.**

- **Columns: none on the local screen; fixed four on the gated board.** The local "board" is a
  sidebar of workspace cards grouped into three fixed accordions — **Needs Attention, Running,
  Idle** — computed in `packages/web-core` and rendered by
  `packages/ui/src/components/WorkspacesSidebar.tsx`:
  `needsAttention = hasPendingApproval || (hasUnseenActivity && !isRunning)`. The four-column
  kanban the product is named after (Todo / In Progress / In Review / Done, cards carrying mono
  IDs, tags, PR badges, `+447 −165` counters — see `05-kanban-board-docs.png`, from the upstream
  repo's `docs/images/issue-mgmt-kanban-board.png`) *ships inside the local binary* — its routes
  (`packages/local-web/src/routes/_app.projects.$projectId.tsx`, `...issues.$issueId.tsx`) and
  card component (`packages/ui/src/components/KanbanCardContent.tsx`) are all in the local-web
  build — but every path to it is gated by `isSignedIn`
  (`packages/web-core/src/shared/providers/auth/LocalAuthProvider.tsx`: `loginStatus?.status
  === 'loggedin'`), and login status comes from the server's `get_login_status()`
  (`crates/local-deployment/src/lib.rs`), which requires stored remote credentials **and a
  live round-trip to the remote's `/profile`**. The remote is decommissioned, so the gate can
  never open: every local install renders the tombstone rail instead — *"Kanban Boards — Sign
  in to organise your coding agents with kanban boards"* (`01-landing.png`, live capture;
  `packages/web-core/src/shared/components/ui-new/containers/SharedAppLayout.tsx:516`).
  Columns are product-fixed (Todo/In Progress/In Review/Done from the `Task` status enum),
  never user-made.
- **Card anatomy (local sidebar), top to bottom:** workspace name (falls back to branch), branch
  in mono, running dot, and when the summary has fired: `N files changed +A −D`, PR badge with
  number and open/merged state, pin. Updated-at ordering, pinned first. That is the whole card —
  no assignee, no labels, no due date, no estimate. It is a *process* card (what is the machine
  doing) not a *work* card (who owes what). The full anatomy is visible in `01-landing.png`.
- **What hides behind a click:** everything. One click on a sidebar card opens the workspace
  detail — the entire conversation, the diff, the git panel, setup/cleanup scripts
  (`02-workspace-detail.png`). **What never appears on the board at all:** cost (no money
  anywhere in the local product), elapsed time, queue position, failure reason — the sidebar
  card cannot tell you *why* something needs attention, only that it does.
- **The gated board's card, for completeness (from `KanbanCardContent.tsx` and
  `05-kanban-board-docs.png`, not locally renderable):** row 1 sub-issue indicator + mono
  display ID + running dots + hover more-actions; row 2 title; row 3 markdown-collapsed
  description clamped to four lines; row 4 priority icon + assignees; row 5 max 2 tags, 2 PR
  badges, 2 relationship badges with `+N` overflow; below, one attempt card per workspace
  (files changed, +/− lines, PR state). This is a *work* card — richer, denser, more
  conventional than the local process card, and it shows what the Workspaces UI threw away
  when the board went behind the gate.
- **Where the human's decisions live:** there is no inbox and no notification center. The
  Needs Attention group *is* the decision surface, and its only feed is
  `hasPendingApproval` plus unseen activity. From the list to an approve/deny on a tool call:
  one click into the workspace, one click on the inline dialog — but the per-tool-call dialog
  is wired for **Codex only** at this commit (`crates/executors/src/executors/codex.rs`,
  approval bridge in `crates/services/src/services/approvals/`); every other executor runs
  unmoderated. Keyless, with no Codex session, no approval could be triggered — this is source-
  and docs-verified, not screenshotted.
- **Filters, swimlanes, cross-project views:** none that render locally. The complete filter
  surface is the archived/active split (two separate WebSocket streams, `?archived=false|true`
  in `packages/web-core/src/shared/hooks/useWorkspaces.ts`) and pinning. No swimlanes, no
  cross-project rollup — one machine's repos, one list.

**The sunset lesson (what a board loses when its company dies).** This is the sharpest single
data point in the whole field scan. Bloop's April 2026 shutdown split the product exactly along
the local/remote line: everything local survived — workspaces, git worktrees, sessions, the
normalized timeline, diff review, PR creation all still work keyless on 2026 hardware, this
session proved it. Everything board-shaped is *stranded*: the board, issues, sub-issues,
statuses, organisations, comments are fully present in the local binary but sit behind a
sign-in gate whose backend is decommissioned — the code survived, the feature did not
(`05-kanban-board-docs.png` through `07-sub-issues-docs.png` document what is locked out). A
product named *Kanban* whose self-hosted build cannot render a kanban. Two lessons for us, one
obvious, one structural: (1) **every board-defining feature must live in the self-hosted
core** — a remote tier may extend the board, never define it, and a login gate in front of a
local feature is how a shutdown turns working code into a tombstone; (2) **distribution is
part of liveness** — the community kept the source compilable for five months but never
restored a release channel, so "alive" repo, dead product for anyone unwilling to build Rust
from source.

## 2. Agent-task specifics

This is the heart of the study, and it is where the product is genuinely excellent. Everything
below was rendered live, keyless, from seeded data in the local build.

### The event schema: one shape before the UI sees anything

Every agent CLI's raw output is parsed into `NormalizedEntry`
(`crates/executors/src/logs/mod.rs`) before any rendering happens:

```
NormalizedEntry { timestamp: Option<String>, entry_type, content: String, metadata }
```

with `entry_type` one of: `user_message`, `user_feedback {denied_tool}`,
`assistant_message`, `tool_use {tool_name, action_type, status}`, `system_message`,
`error_message {error_type}`, `thinking`, `loading`, `next_action {failed,
execution_processes, needs_setup}`, `token_usage_info {total_tokens,
model_context_window}`, `user_answered_questions {answers}`.

`tool_use` carries `action_type` (`crates/executors/src/logs/mod.rs`): `file_read`, `file_edit`
(with per-change `write`/`delete`/`rename`/`edit` carrying the full unified diff),
`command_run` (with exit status and output, categorized read/search/edit/fetch/other),
`search`, `web_fetch`, `task_create {description, subagent_type}`, `plan_presentation {plan}`,
`todo_management {todos, operation}`, `ask_user_question`, and `tool` (fallback). `status` is
`created`/`success`/`failed`/`denied {reason}`/`pending_approval {approval_id}`/`timed_out`.

The transport is as elegant as the schema: entries are wrapped in JSON-Patch operations
(`crates/executors/src/logs/utils/patch.rs`, op shape `{"op":"add","path":"/entries/N",
"value":{"type":"NORMALIZED_ENTRY","content":{...}}}`), appended to a JSONL `LogMsg` log
persisted in `execution_process_logs.logs`, and the same patch stream is replayed over
WebSocket to the browser, which applies it to a client-side document. One log format, three
consumers: the database (durability), the WS stream (live UI), and the replay (history). This
session seeded that JSONL by hand and the UI rendered it faithfully — the schema is exact,
strict, and sufficient.

### Plan-then-execute as first-class cards, not prose

The two-phase shape the queue item 6/22 wants is visible end to end in `02-workspace-detail.png`:

1. **The plan card** — `ExitPlanMode` arrives as `tool_use` with action
   `plan_presentation`; the plan's numbered steps render as a distinct card *before* any edit
   exists. The plan is an event, so it timestamps, diffs against later plans, and survives
   reload.
2. **The todo cards** — `todo_management` writes the whole list with statuses
   (`in_progress` → `completed` between two cards in the shot). Progress inside the run is
   therefore legible *from the timeline itself* — the second TodoWrite card showing three
   completed items is the run's own progress bar.
3. **Work cards** — each `file_edit` renders the path and `+4`/`+6` counters; `command_run`
   renders the command and its captured output; a `Task` (subagent) spawn renders with its
   `subagent_type` ("GENERAL-PURPOSE" card in the shot).
4. **The gauge** — `token_usage_info` renders a context meter (`41,230 / 200,000`), i.e. how
   full the model's window is — an agent-health signal, not a cost signal. Cost appears nowhere
   in the local product.

### Live status, steering, and the rest

- **While it runs:** the sidebar card shows running; inside, the timeline grows by WS patch —
  no polling anywhere (two workspace-list streams plus a 15-second summary refetch are the only
  polling-shaped calls in `useWorkspaces.ts`). No progress percentage, no elapsed time on the
  card. On finish: status flips to completed, `files changed +A −D` fills in from the summary,
  PR badge appears when `gh` created one. On failure: `error_message` card in the timeline;
  the sidebar only says Idle.
- **Conversation placement:** the workspace detail page *is* the conversation; the timeline is
  the default view, everything visible, outputs collapsed per card. Nothing lives behind a
  "logs" tab because the whole product is the log.
- **Steering mid-run:** the message box at the bottom of the timeline sends a follow-up
  (`spawn_follow_up`); a stop control kills the process (process row status `killed`). One
  click to focus, one to send. There is no queue-of-steering box on the card itself — you must
  open the workspace.
- **Approvals:** per-tool-call approve/deny inline in the timeline via
  `pending_approval {approval_id}` — Codex only, as above. No spend limits, no budgets, no
  kill-switch-on-cost anywhere; the token meter is the entire surface.
- **Parallel agents:** each workspace is an isolated git worktree
  (`<worktree-root>/<task-slug>/<repo>`; the `workspaces` row stores the path in
  `container_ref`, plus `branch`, `archived`, `pinned`, `worktree_deleted`), so N agents run
  concurrently on N branches with zero cross-contamination, and the sidebar just lists them.
  A spawned subagent does **not** get a card — it stays a `task_create` card inside the
  parent's timeline. Deliberate subtasks are fully modeled in the local data model — a task
  row with a parent link (`parent_workspace_id`, own branch cut from the parent attempt's
  branch), rendered by the same `KanbanCardContent.tsx` as a regular board card with a
  sub-issue indicator, plus a TASK RELATIONSHIPS / CHILD TASKS panel
  (`06-task-subtasks-docs.png`, upstream `docs/screenshot-task-with-subtasks.png`;
  `07-sub-issues-docs.png` = `docs/issue-mgmt-sub-issues.png`) — but every surface that shows
  them is the sign-in-gated board from section 1. **So subtask-as-board-card is fully built,
  locally, and unreachable**: in the Workspaces UI there is no hierarchy at all, one workspace
  = one conversation = one branch.

### Keyless-strictness note (schema, observed)

Seeding fake sessions surfaced two hard runtime failures worth recording as evidence of the
wire's strictness: `sessions.executor` must be the enum key (`CLAUDE_CODE`; lowercase `claude`
→ HTTP 400 `unknown variant`, which the frontend turns into a whole-app CrashScreen), and
`execution_processes.executor_action` must be the untagged
`{"typ":{"type":"CodingAgentInitialRequest","prompt":...},"next_action":null}` shape — the
timeline builder dereferences `executor_action.typ.type` unguarded
(`packages/web-core/.../deriveConversationSemanticTimeline.ts:54`). Both were seed bugs, not
app bugs; but an unguarded `.typ.type` at the root of the main view is one malformed row away
from a white screen. We should guard at the boundary.

## 3. Interaction model

- **Moving work:** locally, nothing moves. No drag-and-drop exists in the Workspaces UI at all
  (the drag columns were the classic/remote board). Buttons only: create, archive, pin, Create
  PR, send message, stop. A drop used to change a status column on the remote; locally the
  state changes itself from process status, and the human never re-classifies work by hand.
- **Keyboard and mobile:** no keyboard board navigation and no mobile layout found in the local
  build; a driver library and a driver onboarding tour exist (`01-landing.png`, popup), but
  screen-reader and keyboard paths were not exercised this session — not verified beyond
  absence in source.
- **Refresh model:** live push throughout — workspace lists over WebSocket (JSON-Patch over WS,
  same mechanism as the timeline), diff and conversation streamed, summaries refetched every
  15 s. Cards change without reload: running dot, unseen-activity badge, and counters all
  arrive by patch. The WS is the spine of the product; kill it and the screen freezes at
  whatever it last had (headless-Chrome's virtual-time experiments starving the WS produced
  exactly that — a static, empty list).
- **Click map from the list:** read status — 0 clicks (badge on the card); read detail — 1
  click; decide (approve a tool call) — 2 clicks (open workspace, click dialog); steer — 2
  clicks (open, focus box) + typing; comment on a diff line — 3 clicks (open workspace, open
  Changes, plus-icon the line). Everything is at most three clicks away because there is only
  one page to be in.

## 4. Visual system

- **Themes:** LIGHT / DARK / SYSTEM, switchable and persisted server-side through
  `PUT /api/config` (`crates/server/src/routes/config.rs`) — theme is a server document, not a
  browser cookie, so it survives browsers. Dark (`04-dark-theme.png`) and light
  (`02-workspace-detail.png`) are both complete, no washed-out second-class mode. Semantic
  color is strictly system-set: green for adds/success, red for deletes/failure, amber for
  needs-attention, spinner for running. The user sets nothing — there are no labels, colors or
  tags in the local UI. That is a real position: the board refuses to be a decoration surface.
- **Typography and density:** one small UI face, mono reserved for branch names, commands and
  diffs — mono *means* machine, sans *means* human, consistently. Density is high: the
  timeline stacks compact cards; the sidebar fits roughly a dozen workspace cards per screen
  with the three group headers. A sidebar card reads fine as a thumbnail (name, branch, +/−,
  PR badge); a timeline card does not need to, because it is never seen as a thumbnail.
- **Status vocabulary (every state a workspace can be in, and its cue):**
  - *Running* — spinner/dot on the card, conversation live.
  - *Needs attention* — accordion placement + amber cue; caused by `hasPendingApproval`
    (a tool call is waiting) or unseen activity on a finished run. The card does not say which.
  - *Idle* — bottom group, muted.
  - *Completed / failed / killed* — process status inside the workspace (from
    `execution_processes.status`), with `error_message` cards in red in the timeline; failed
    does not color the sidebar card.
  - *Unseen activity* — dot after you leave a workspace that kept producing (clears on view).
  - *Archived / pinned* — separate stream / pinned-first ordering.
  The honest gap: failure and waiting are distinguishable only *inside* the workspace; the
  list flattens both toward the same amber squeeze.

## 5. What users say

Most common complaints (numbers checked via gh api, 2026-10-01):

1. **The board was taken away.** [#2687 "Bring back old UI"](https://github.com/BloopAI/vibe-kanban/issues/2687)
   (closed, 39 comments) is the canonical thread: the Workspaces beta replaced the kanban-first
   UI, and the board ended up behind the remote login. Quotes: "Workaround to bring back old UI
   is to downgrade to 0.1.8"; "the old ui is better for me too, and it's support offline mode";
   "Why can't users use kanban board offline(not logined)?"; "Don't force users to log in just
   to access the core." Siblings: [#2288](https://github.com/BloopAI/vibe-kanban/issues/2288)
   (closed, 26 comments, "is the workspaces UI intended to replace the classic UI?"),
   [#2509 "please keep the Kanban board"](https://github.com/BloopAI/vibe-kanban/issues/2509)
   (open), and [discussion #2726 "The old vibe-kanban was better for me"](https://github.com/BloopAI/vibe-kanban/discussions/2726).
2. **Connection/startup fragility.** [#1731 "agents refuses to start (Invalid WS)"](https://github.com/BloopAI/vibe-kanban/issues/1731)
   (closed, 31 comments) — WebSocket and relay-path failures, exactly the spine section 3 says
   the whole screen hangs from.
3. **Self-hosting and ownership post-shutdown.** [#3396 "Support for self-hosted projects and better export"](https://github.com/BloopAI/vibe-kanban/issues/3396)
   (open, 9) and [#1697 "Add self-hosted Gitlab support"](https://github.com/BloopAI/vibe-kanban/issues/1697)
   (open, 8) — users trying to keep the tool alive without the dead remote. Also
   [#3204 "in-panel search for conversation and diffs"](https://github.com/BloopAI/vibe-kanban/issues/3204)
   (open) — the timeline has no search, which matters once a run is long.

Most praised (same sources): the **worktree-per-task parallelism** ("run five agents on five
branches of the same repo without them tripping over each other" is the recurring shape in
#2288 and the HN launch threads); **one UI for ten different agent CLIs** with per-task
executor choice; and the **live streaming log + diff** — even the harshest #2687 voices praise
the timeline while attacking the loss of the board. 28k stars on a tool that requires you to
bring your own everything is the loudest signal of all.

## 6. Verdict for us

**Steal:**

- **The NormalizedEntry schema, verbatim as the base of our `Event` type** — already named in
  stage10 item 21, now field-verified. One-line version: adopt
  `entry_type × content × status` with `action_type` covering file/command/search/plan/todo/
  task/question, and `pending_approval {approval_id}` as a *status on the event*, not a
  separate channel.
- **The plan card and todo cards as first-class events.** One-line: `plan_presentation` and
  `todo_management` are event types, so the plan gate and in-run progress render from the log
  itself and survive reload — no derived state to drift.
- **The context gauge** (`total_tokens / model_context_window`). One-line: put "how full is the
  window" on the session header — it is the earliest stuck-agent warning there is.
- **Needs Attention / Running / Idle as the only list grouping**, fed by
  pending-approval-or-unseen-activity. One-line: three groups, zero configuration, computes
  entirely from event state.
- **The JSON-Patch-over-one-persistent-log design.** One-line: one JSONL log that *is* the
  transport, the history and the DB row; SSE can carry the identical patch stream for our htmx
  console (stage10 item 22).
- **Theme as server-side config.** One-line: `PUT /api/config {theme}` — dark/light survive the
  browser.

**Skip:**

- **Conversation-as-the-whole-product.** The timeline is magnificent and is *still* the wrong
  primary surface for us: our requester reads a card and an issue, not a transcript. Keep the
  timeline as the live task page one click deep (exactly stage10 items 20/22), never as the
  board itself.
- **The no-columns local model.** Removing columns removed WIP limits, flow and the "where is
  it stuck" glance; users revolted (#2687). Our coarse state columns stay.
- **Approvals for one executor only.** A gate that exists on one code path is worse than none —
  it trains users that the gate is decorative. Ours must be executor-independent by
  construction (gateway, not harness).
- **The unguarded `.typ.type` pattern.** One malformed row must never white-screen the board;
  validate at the boundary, render a degraded card instead.
- **Cost blindness.** No money anywhere in the local product; our spend-limit surface is a
  constraint, not an option.

**Decision needed (for the aggregate):**

- **Where do subtasks live?** Vibe Kanban built both halves and shows the split cleanly:
  subtasks as real board cards with a parent link, own branch and a relationships panel — on
  the gated board — versus a plain `task_create` card nested in the parent's timeline in the
  ungated Workspaces UI. Our Forgejo sub-issues plus stage10 item 10 (board as an API the
  agent calls to file sub-cards) must pick one shape for the self-hosted core before we build
  both by accident.
- **Does the "needs attention" state carry its reason on the card?** Vibe Kanban's answer is a
  group, cline/kanban's is a reason string (`RuntimeTaskSessionReviewReason`). Queue item 4
  already votes reason-on-card; this study adds the counter-evidence that a reason-free amber
  group is what users get when the remote that carried reasons dies.

**Against stage10-queue section H, point by point:** (1) column separate from live badge —
VK post-sunset *deleted* the column and kept only the badge; the revolt proves the column half
was load-bearing. (2) One event schema — VK is the named candidate; confirmed adopt. (3)
Batched inline diff comments — exists in VK's diff view (baseline-verified; the comment
affordance needs a live session, not triggerable keyless this session). (4) Reason on every
waiting card — VK lacks it; see decision above. (5) Steering box always there — yes, inside
the workspace, never on the card. (6) Editable plan gate — the plan *renders* as a card but
approval is executor-dependent; weaker than Jules' gate. (7) Elapsed/spend/checks on card —
none of the three on VK's card. (12) Grid of all running agents' live output — VK has no such
second view. (17) Diff stored per session — VK recomputes from the live worktree over WS; fine
locally, wrong for our pod-gone-after-finish case, so queue item 17 (stored per session)
stands.

**Cloneability:** fully runnable locally, keyless, no accounts — the entire study above was
produced that way. Cost: a three-stage Docker build (node pnpm → rust → debian-slim) from
source at d5cbb53, since no current binaries exist. Two upstream build bugs to fix: the
Dockerfile's frontend stage runs `pnpm install --frozen-lockfile` without `COPY patches/
patches/` first (lockfile patched-deps check fails), and the local-web Vite build exceeds
node's default heap (needs `NODE_OPTIONS=--max-old-space-size=4096`). Runtime needs the data
dir writable by uid 10001. About 40 minutes of build, then the server is one binary with the
frontend embedded. Difficulty: moderate (Rust + pnpm toolchains), no traps beyond those two.

## Scoring axes

| Axis | Score | Reason |
|---|---|---|
| Card scannability (read ten cards in one glance) | 4 | Sidebar cards are minimal (name, branch, +/−, PR badge) and three groups hold twenty cards per screen — but there is no board to scan, only a list. |
| State clarity (what is happening, how far, what next) | 3 | Running/attention/idle are crisp at list level; progress, elapsed and *why-waiting* exist only one click down, and failure does not color the card. |
| Human-decision surface (find and make the next decision) | 2 | The Needs Attention group finds decisions, but approvals are Codex-only, there is no inbox, no cross-task "needs you" list, and no reason on the card. |
| Agent-activity legibility (is the agent working, waiting, stuck) | 5 | The normalized timeline is the best agent rendering in the field: plan, todos, diffs, commands, subagents, context gauge, all live over WS. |
| Noise level (5 means quiet: nothing without meaning) | 4 | Every card is a typed event with collapsed output; noise comes only from transcript length itself (no in-panel search, #3204) and re-notifying unseen badges. |

---

* Shots `01`–`04` are live captures from the local keyless Docker render of d5cbb53 (host port
  9150). `05`–`07` are upstream documentation images from the same commit
  (`docs/images/issue-mgmt-kanban-board.png`, `docs/screenshot-task-with-subtasks.png`,
  `docs/issue-mgmt-sub-issues.png`) used because the features they show are remote-tier and
  unreachable in a keyless local build.
* Not verified this session: the Bloop shutdown blog post itself (URL now returns 500;
  shutdown facts remain baseline-sourced from 2026-09-29), the approval dialog's rendered
  appearance (Codex-only, no keyless trigger), keyboard/mobile accessibility paths, and any
  live remote tier (dead).
