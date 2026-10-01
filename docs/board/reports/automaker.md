# AutoMaker

## Header

- Product and URL: AutoMaker, https://automaker.app, repository
  https://github.com/AutoMaker-Org/automaker. Built in public by Cody Seibert
  (webdevcody). Electron/React/Express desktop app with Docker and dev-server
  modes.
- License and price: MIT, with a preamble in the LICENSE file stating the
  project "is no longer actively maintained". Free and open source; the vendor
  charges nothing, per seat, per task or in credits. It is local-first: your
  project, your git worktrees, your model access. You bring either per-provider
  API keys or an already-authenticated Claude Code CLI subscription. The only
  metering that exists is your provider's, and the README documents the 15 June
  2026 Anthropic change that moves Claude Agent SDK usage on subscription plans
  into a separate dollar-denominated monthly credit pool (Pro 20 USD, Max 5x
  100 USD, Max 20x 200 USD, Team tiers 20/100 USD; claimed once a month, no
  rollover, then pay-as-you-go at API rates or stop). A self-hosted tier is not
  a tier here: self-hosting is the product.
- Alive? Stalled. The clone used for this report is from the last commit,
  2026-05-22 (5888d2e). v1.0.0 was tagged 2026-03-15 and the LICENSE preamble
  announcing no active maintenance shipped with it. Roughly 3.2k stars. Issues
  keep arriving (up to #849) and a couple of community PRs sit open, but no
  maintainer commit has landed since May 2026.
- Studied how: studied from a clone at
  5888d2e6f3618e06762803687ea7b181c10edcbd, on 2026-10-02. The app was run for
  real, keyless: dev server (Vite on 9151, API on 9152 with the app's own
  AUTOMAKER_DISABLE_AUTH dev flag), a scratch DATA_DIR, and a seeded demo
  project with eight features covering every status (backlog with plan, backlog
  blocked by a dependency, in_progress with an approved plan, waiting_approval
  with a summary, verified with a summary, errored, merge_conflict). No agent
  was ever started, so nothing spent; flows that require a live run were read
  in source and are marked as such. Screenshots come from that live UI.
- One sentence: AutoMaker is a local, open-source agentic IDE where a kanban
  backlog of "features" is executed end to end by AI coding agents in isolated
  git worktrees, for a solo developer delegating whole features rather than
  prompts.
- Prior coverage: the phase 1 scan (docs/board/scan.md) had this product
  wrongly filed as a closed SaaS; the correction (open source, local-first) is
  already pushed, and this report is the deep pass.

## 1. The board model

### Columns

Columns are fixed by feature status, not user-made. The default board is
Backlog | In Progress | Waiting Approval | Verified, and if the project
configures an execution pipeline, each pipeline step inserts its own column
(statuses named `pipeline_*`) between In Progress and Waiting Approval. The
product's own words, from the column-mapping source: "'merge_conflict', 'ready',
and 'interrupted' are backlog-lane statuses that don't have dedicated columns" —
a merge conflict, an approved-but-not-picked-up plan, and an aborted run all
render inside Backlog, distinguished only by badges and buttons. Completed work
is not a column at all: it is archived, reachable through an archive modal, and
invisible on the board.

The status set is a state machine the agent drives. A human never invents a
column; the most a human can add is pipeline steps in project settings.

Shot: [board.png](shots/automaker/board.png) shows the seeded board with a card
in every lane.

### Card anatomy

Top to bottom on the card face (composition order verified in
kanban-card.tsx, text verified in the live DOM; magnified specimens
[card-backlog.png](shots/automaker/card-backlog.png),
[card-merge-conflict.png](shots/automaker/card-merge-conflict.png),
[card-error.png](shots/automaker/card-error.png)):

1. Badge row: a merge-conflict warning triangle, or a red error badge whose
   tooltip is the feature's `error` string. Absent when healthy.
2. Category chip (free-text tag from an autocomplete) plus a selection checkbox
   that appears on hover for mass edit.
3. Priority and state badges: the priority letter H/M/L in fixed colors
   (red/amber/blue, stored as 1..999, default 999); a hand icon meaning
   "Manual verification required" (the card was created with tests skipped); a
   lock meaning "Blocked by N incomplete dependencies", tooltip listing the
   blockers by name; a sparkle for the two minutes after completion; a pulsing
   FileCheck meaning "Plan ready for review"; a violet SkipForward when
   pipeline steps are excluded for this card.
4. Title.
5. Description, two-ish lines, clipped — and this is the spec, not a summary
   someone typed separately.
6. Model chip with the provider's display name ("Opus 4.6", "Sonnet 4.6",
   "Haiku 4.5").
7. Target branch in monospace, and a purple "Pull Request #N" external link
   once a PR exists.
8. Status-dependent action buttons (next subsection). While an agent runs, the
   whole card gets an animated border.

Never on the board face, anywhere: cost, token usage, elapsed time, progress
percentage, or the agent's conversation. Those live behind clicks or not at
all.

### Where the human's decisions live

On the cards, as buttons that change with status. This is the product's best
idea: the button set is the state machine made visible.

- Backlog (and the backlog-lane statuses): "Edit" and "Make".
- Plan generated, approval required: "Approve Plan" (the FileCheck badge
  pulses to pull the eye).
- Running: "Logs" and "Force Stop".
- Waiting Approval: "Summary", "Refine", "Mark as Verified".
- Verified: "Logs" and "Complete" (Complete archives).
- Merge conflict: "Edit" and "Restart".

One click from the board reaches every decision; a second click confirms inside
the dialog. The plan-approval dialog shows the generated plan (T001-style task
list) with a View/Edit toggle, and its reject path is a feedback textarea with
the honest label "Leave empty to cancel the feature, or provide feedback to
regenerate the plan" — deny is never a dead end, it is a redirect. The summary
dialog at Waiting Approval shows what the agent did, in the agent's own
structured summary: our seeded card reads "Implemented reset request, token
minting (15 min TTL, single use), email template and tests. 6 files changed,
+412 -38." with tabs for Summary and raw Output (shot:
[summary-dialog.png](shots/automaker/summary-dialog.png)).

Off the board, a Notifications view (X) collects events with unread counts in
the sidebar, and toasts carry transient outcomes ("Concurrency limit reached").

### Filters, swimlanes, cross-project views

Search filters cards by description and category text. The bigger filter is
worktrees: the board is branch-scoped, so a feature assigned to branch X only
renders when that worktree's tab is active, and the primary board shows the
unassigned plus primary-branch work. There is a kanban/list segmented toggle,
multi-select with a mass-edit dialog, and no swimlanes. Projects are switched
(picker on P, cycle on Q/E), never combined: no cross-project view exists.

## 2. Agent-task specifics

This is an agent-native product; nothing here is skipped.

### The card is the run configuration (our pattern 15, verified)

Double-click a backlog card and the Edit Feature dialog is the entire run
config, on one screen (shot: [card-edit-dialog.png](shots/automaker/card-edit-dialog.png)):

- Description is the spec. "Enhance with AI" offers modes (improve clarity,
  simplify, add technical details, add acceptance criteria; issue #803 reports
  the additive modes actually replace the text — a bug, but the design intent
  is spec-crafting in place). Title is optional; the description is the card.
- Model: Sonnet/Haiku/Opus per provider, per card, overriding the project
  default.
- Planning mode: Skip / Lite / Spec / Full. With "Require approval" on, the
  agent must produce a plan a human approves before it touches code.
- "Run tests" toggle; off means the card carries the hand badge ("Manual
  verification required") forever after.
- Category and Priority (H/M/L).
- Work Mode: Current Branch (with the explicit warning "Work will be done
  directly on master. No isolation."), Auto Worktree (the default flow:
  isolated worktree per feature), or Custom Branch.
- Parent/child dependencies, with "View Dependency Tree".

Persisted per feature in `{project}/.automaker/features/{id}/feature.json`:
model, providerId, thinkingLevel, reasoningEffort, planningMode,
requirePlanApproval, dependencies, skipTests, excludedPipelineSteps, branchName,
and the planSpec with its parsed task list. The board card is the readable
projection of that file: category, priority letter, title, spec text, model
chip, branch, and the state badges. The card doubles as the spec sheet, which
is exactly our pattern 15.

### While the agent runs

The card sits in In Progress (or its pipeline-step column) with an animated
border, and pressing 1-9 or 0 jumps straight to that running card's output
modal — up to ten live runs, one keystroke each, no hunting. The Agent Runner
view (A) lists all running agents with their output (shot:
[running-agents.png](shots/automaker/running-agents.png)). What the card does
not show while running: progress percentage, elapsed time, current step, cost.
The pipeline columns say which phase a card is in, and that is the whole
granularity. Issue #839 ("Plan stuck indefinitely... This happens with every
local model I use") is what that gap costs: a hung run looks identical to a
working one.

### Finish, fail, ask

On finish, the card lands in Waiting Approval with the structured summary on it
(what was done, files changed, diffstat) and Refine / Mark as Verified buttons;
the sparkle badge pulses for two minutes. On failure, the card returns to the
backlog lane with the red error badge carrying the error string in its tooltip.
On merge failure, merge_conflict: warning badge in Backlog with Edit/Restart,
and the maintainer's own issue #832 admits the experience "still feels broke".
A plan awaiting review is a question the card asks: pulsing FileCheck plus
"Approve Plan".

### Where the conversation lives

Behind one click (Logs on the card, output modal with Summary/Output tabs) or
in the Agent Runner view. Nothing of the transcript renders by default; the
board shows outcomes (summary, diffstat, PR link), not chatter. This is the
artifacts-not-chat stance, taken literally in the UI.

### Can the human steer mid-run?

"Force Stop" on the card stops the agent (status becomes interrupted, a
backlog-lane status); dragging a running card to Backlog does the same.
Redirect happens at the gates: reject the plan with feedback (regenerates), or
Refine at Waiting Approval (regenerates the implementation with feedback).
There is no mid-run chat injection into a live session — steering is
stop-or-wait, then redirect at the next gate. (Flow read in source; not
exercised live, since a live run would spend.)

### Approvals, spend limits, budgets

Approval is a first-class gate in two places (plan approval before execution,
Waiting Approval after), both surfaced on the card. Spend is nowhere: no
budget, no per-run cost, no token counter, in a product whose only cost is
model spend. The controls that exist are indirect — model tier per card
(Haiku vs Opus is the real spend decision), maxConcurrency in settings, and
BYO keys. The June 2026 Anthropic credit-pool change (Header) makes the
omission sharper: subscription users now watch a separate dollar pool drain,
with a hard stop, and the board gives them nothing to watch it with.

### Multi-agent and parallel work

Every feature can run in its own worktree branch, so parallel agents are
parallel branches; the board you look at is the active worktree's board.
"Start Next" (G on the board) fills free slots up to maxConcurrency from the
backlog, current-branch-scoped, blocked features sorted last, priority order
within, with a toast when the limit is hit. Up to ten in-progress cards get
the number keys; the Agent Runner aggregates everything running. The graph
view (H) draws the dependency DAG behind the backlog (shot:
[graph.png](shots/automaker/graph.png)).

## 3. Interaction model

### Moving work

Both dragging and buttons, and they mean the same thing: a status transition.
The drag handler (use-board-drag-drop.ts) distinguishes three drops. Card onto
card: creates a dependency link (dialog to confirm, refuses completed
features). Card onto a worktree tab: reassigns the feature's branch (refused
while running). Card onto a column: changes status — Backlog to In Progress
starts implementation immediately (concurrency-checked), dragging a running
card back to Backlog stops the agent, and any other transition just persists
the new status. That last part deserves attention: a human can drag a card
straight to Verified, past every check the pipeline defines. Buttons are the
curated subset of the same machine; drag is the uncurated superset.

### Keyboard

Single-letter views, our pattern 16, verified live and in source
(DEFAULT_KEYBOARD_SHORTCUTS in shortcut-utils.ts; shot:
[keyboard-map.png](shots/automaker/keyboard-map.png), the visual map opened
from Settings, and [settings-keyboard.png](shots/automaker/settings-keyboard.png)):

- Views: K board, H graph, A agent runner, D spec, C context, Y memory,
  S settings, Shift+S project settings, T terminal, I ideation, X
  notifications, G GitHub issues, R pull requests.
- UI: backquote toggles the sidebar.
- Actions: N new feature (board) / new context file (context) / new session
  (agent) — same key, context-scoped by design; O open project; P project
  picker; Q/E cycle projects; on the board, N adds a card and G starts the
  next features; Alt+D/S/W/T split and close terminals.
- Live-run keys: 1-9 and 0 open the output of up to ten in-progress cards.
- Guards: shortcuts are suppressed while typing (inputs, textareas,
  contenteditable), while any dialog, menu, or picker is open, and while focus
  is in an xterm terminal — so the letter keys never eat text.
- Every binding is user-customizable in Settings, defaults merged under the
  user's map, and the keyboard-map overlay renders the whole current layout
  visually.

One defect worth naming: G is bound twice by default — GitHub-issues
navigation (sidebar's listener) and Start Next (board's listener) — and both
window listeners receive the same keydown, so on a board with a GitHub remote
the key does both. Customization without collision detection produces this;
verified in source, not pressed live (it would have started agents).

### Refresh model

WebSocket push from the server, optimistic cache updates on top: a card's
border starts animating, badges appear, and summaries land without any reload
or manual refresh. The code carries explicit race handling so a card that just
started never flashes back into Backlog on a stale fetch. The board feels live
because it is.

### The click map

- Read status: 0 clicks — column, badges, and buttons say it on the face.
- Read detail: 1 click (Logs/Summary), or 0 via a number key for running work.
- Decide: 1 click to the dialog (Approve Plan, Mark as Verified, Complete),
  2 with the confirm inside it.
- Steer: 1 click (Force Stop, Restart, Refine).
- Comment: not on the board — feedback boxes exist only inside the reject and
  Refine dialogs, and as PR review comments in the GitHub views. There is no
  per-card comment thread at all.

## 4. Visual system

### Themes and color

Dark by default, light available, accent configurable in Appearance (shot:
[settings-appearance.png](shots/automaker/settings-appearance.png)). Color
channels stay separate the way we want them: system states own column
position, badge shape, and the fixed priority colors; users own only the
category chip text. Priority is user-set but its color meaning is fixed.

### Typography and density

Compact: cards around 240 pixels wide, one title line, two description lines,
11px monospace for branch and meta. Six to eight cards fit per column, twenty
or more across a screen (see [board.png](shots/automaker/board.png)). As
thumbnails the cards still read: priority letter, model chip, and title carry
the scan; the description is a glimpse, not a read.

### The status vocabulary

Every state a feature can be in, and how it is told apart:

| State | Where | How distinguished |
|---|---|---|
| backlog | Backlog | Plain card, Edit/Make buttons |
| ready (plan approved, not picked up) | Backlog lane | Badge; picked up by Start Next |
| in_progress | In Progress | Animated border, Logs/Force Stop |
| pipeline_* (configured steps) | Own columns between | Column position, same border |
| waiting_approval | Waiting Approval | Summary/Refine/Mark as Verified |
| verified | Verified | Logs/Complete buttons |
| completed | Archive modal only | Off the board entirely |
| merge_conflict | Backlog lane | Warning badge, Edit/Restart |
| interrupted | Backlog lane | Status text, Edit/Make again |
| error (any state) | On the card | Red badge, tooltip carries the error string |

Plus the transient overlays: sparkle (just finished, two minutes), pulsing
FileCheck (plan awaiting review), lock (blocked by dependencies), hand (tests
skipped), SkipForward (pipeline steps excluded).

## 5. What users say

Reddit blocks scraping and no HN thread or Product Hunt page exists (Algolia
and site searches, 2026-10-02), so the citable corpus is the GitHub issues —
real users, real links — and one third-party video review.

The three most common complaints:

1. Setup friction: the app cannot see installed agents. "I'm trying this out
   for the first time, but I cannot get past the setup because it can't find
   any of my installed agents... I see '<AGENT> CLI not found' message, for all
   of the installed tools" (Linux AppImage, brew+npm installs),
   https://github.com/AutoMaker-Org/automaker/issues/842.
2. Runs hang with zero feedback. "The plan is stuck indefinitely in the
   running agents tab. This happens with every local model I use... Local AI
   shows no activity/load. automaker-server also sits idly",
   https://github.com/AutoMaker-Org/automaker/issues/839 — the board shows no
   progress or liveness, so a hang is indistinguishable from work.
3. Provider and model drift. Gemini CLI dead after Google's Antigravity
   migration (https://github.com/AutoMaker-Org/automaker/issues/849), Codex
   400 invalid_json_schema on regenerate
   (https://github.com/AutoMaker-Org/automaker/issues/846), and the default
   model ignored — "generated with Opus instead of Codex as I have set up in
   the Default Feature Model"
   (https://github.com/AutoMaker-Org/automaker/issues/816). A multi-provider
   harness rots fast, and an unmaintained one rots unfixed.

The three most praised details (all from the AICodeKing review,
https://www.youtube.com/watch?v=MHWX4OF-HiM, 16.4k views, 511 likes — the
most substantive public review found):

1. App Spec to backlog in one step: "The App Spec feature turns a simple text
   prompt into a full project roadmap and feature list in seconds" — the
   roadmap-coupling flow, praised as the fastest idea-to-backlog path in the
   field.
2. Auto Mode's hands-off loop: "agents immediately wake up and start working
   on the next task, running completely hands-free" — Start Next plus
   concurrency, experienced as the product's core magic.
3. Local-first with your own keys: "you aren't uploading your repo to a
   third party SaaS... You are bringing your own keys" — same video; the
   vendor's own page agrees ("Runs locally so your code stays on your
   machine", https://webdevcody.com/products/automaker). The same reviewer's
   caveat is the mirror of complaint 3: "you do need to watch your token
   usage... you might burn through some credits."

## 6. Verdict for us

### Steal

- The card is the run config: spec text, model tier, planning depth, isolation
  mode, dependencies in one dialog; the face shows the projection. Our board:
  card face carries model tier, harness, and dependency count; one dialog
  holds the full run spec. Pattern 15, proven shippable.
- Status-dependent buttons as the visible state machine: each state offers
  exactly its legal transitions (Make, Approve Plan, Force Stop, Refine, Mark
  as Verified, Complete, Restart). Our board: no generic card menu; the
  buttons are the state machine.
- Deny always asks for a redirect: the plan-reject box — empty cancels, text
  regenerates. Our approvals: every reject carries an optional "what would
  make it yes", and empty means cancel, not failure.
- Summary at the review gate: structured what-I-did plus diffstat sitting
  where the verify decision is made. Our waiting cards show the run summary,
  not just a green light.
- Number keys 1-9/0 for live runs: instant jump to any running agent's
  output. Cheap, learnable, and it makes parallelism navigable.
- Backlog-lane statuses: merge_conflict/ready/interrupted stay in Backlog with
  badges instead of breeding columns. Our exception states fold into the
  backlog lane, not new columns.
- Dependency visibility on the face: lock badge with blocker count and names,
  backlog sorted unblocked-first. Our board renders blocking state at a
  glance.

### Skip

- The sandbox-risk modal that blocks Escape and outside-click and must be
  dismissed through "I Accept the Risks" — a consent dark pattern that opens
  on every launch outside a container. We do the opposite: dismissable,
  remembered, never trapping.
- Zero spend surface: no cost, tokens, budget, or limits anywhere on the
  board, while the product's entire cost is model spend and its README
  documents subscription credit pools with hard stops. Our board shows
  per-run cost and budget state; this product is the cautionary tale.
- Drag-to-any-status: dragging can move a card to Verified, past every check,
  because DnD writes status directly. If our statuses derive from verified
  events, human drags can request, never assert.
- Customizable shortcuts without collision detection: G bound twice by
  default, both firing. If we ship single-letter views, the map is ours to
  keep consistent.
- Completed work vanishing into an archive modal: no Done column, no visible
  history. A factory board should show what the factory shipped.

### Decision needed

- Done column versus archive: AutoMaker archives completed features; classic
  kanban shows a Done column. Our volume (agent-produced work) may need Done
  with auto-compaction rather than a modal graveyard. The aggregate report
  should pick.
- Human overrides of agent-owned state: AutoMaker lets humans both drag and
  button-move anything anywhere. We must decide whether a human can force a
  card past verification or only send it back.
- Where the live transcript lives: AutoMaker hides it entirely (outcomes on
  the board, transcript behind a click). Some of our reviewers will want a
  tail pane. Decide once, board-wide.

### Cloneability

Trivial: MIT, public repo, `npm install && npm run dev` (or the Electron app
or Docker compose); we ran it keyless in minutes with a scratch DATA_DIR and
a seeded project — every screenshot here is from that run. One caution from
the run: an authenticated Claude Code CLI on the host is auto-detected at
startup, so a clone can silently gain spending ability — sandbox it or strip
the CLI from PATH before demoing.

## Scoring axes

| Axis | Score | Reason |
|---|---|---|
| Card scannability (read ten cards in one glance) | 4 | Strictly ordered dense face — priority, model, spec, state badges all visible; description clips early and the model chip is the only strength signal |
| State clarity (what is happening, how far, what next) | 4 | Column plus badges plus status-dependent buttons triple-encode state; no progress, step detail, or liveness while running (#839) |
| Human-decision surface (find and make the next decision) | 5 | Every decision is a labeled button on the card itself; pulsing badges queue the next one; one click to the dialog |
| Agent-activity legibility (is the agent working, waiting, stuck) | 3 | Animated border, number-key output, agent runner — but no elapsed, step, or cost, and hangs are invisible |
| Noise level (5 means quiet: nothing without meaning) | 3 | Badges only appear with meaning, but pulses, sparkles, toasts, and a trapping modal keep the surface moving |

Sources: the clone at 5888d2e6f3618e06762803687ea7b181c10edcbd (source-cited
throughout: kanban-card composition, use-board-drag-drop, use-navigation and
shortcut-utils, use-board-column-features, sandbox-risk-dialog, README billing
note, LICENSE preamble), the live keyless UI on ports 9151/9152 with the
seeded demo project, the GitHub issues API (issues 816, 832, 839, 842, 846,
849 quoted), the AICodeKing review video, and webdevcody.com/products/automaker.
Shots taken 2026-10-02 with Playwright driving system Chrome against the dev
server; card specimens are magnified crops from the live board.
