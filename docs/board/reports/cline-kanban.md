# cline/kanban

## Header

- Product and URL / repository: Cline Kanban, https://github.com/cline/kanban (npm package `kanban`, current v0.1.70)
- License, price model, self-hosted or free tier: Apache-2.0, free and open source, fully local (binds 127.0.0.1); no account, no cloud, no telemetry when keyless (DEVELOPMENT.md). Costs only the agent CLIs you configure.
- Alive? Last commit 2026-09-04 (`abd4912`, a dependency-security fix); steady issue/PR flow through late September 2026 (e.g. #652 opened Sep 20, PR #592 in flight). Self-described "research preview".
- Studied how: studied from a clone at `abd4912c27ce6b7f18b5a8106c145fd838e90cc4` plus a live keyless server (clone at `~/repos/market-research-clones/kanban`, server run on port 9149 with tasks created through its own CLI; no API key entered, no agent started), on 2026-10-01/02.
- One sentence: a local-first web kanban that gives every task card its own ephemeral git worktree, branch and PTY terminal, runs one coding-agent session per card, and streams the agents' hook events onto the card faces — for a single operator running many agents in parallel.

Screenshots (all mine, taken keyless against the live server unless noted): [board.png](shots/cline-kanban/board.png) (whole board, first-run popover included), [card-anatomy.png](shots/cline-kanban/card-anatomy.png) (crop of the backlog cards), [create-dialog.png](shots/cline-kanban/create-dialog.png), [sidebar-agent.png](shots/cline-kanban/sidebar-agent.png), [settings.png](shots/cline-kanban/settings.png), [card-detail.png](shots/cline-kanban/card-detail.png), [git-view.png](shots/cline-kanban/git-view.png), and five frames of the official README demo GIF (source: https://github.com/user-attachments/assets/2aa3dcc7-94e3-4076-bcfe-6d0272007cfe, showing keyed runs I could not perform): [frame 000](shots/cline-kanban/readme-demo-frame-000.png), [044](shots/cline-kanban/readme-demo-frame-044.png), [089](shots/cline-kanban/readme-demo-frame-089.png), [134](shots/cline-kanban/readme-demo-frame-134.png), [174](shots/cline-kanban/readme-demo-frame-174.png).

## 1. The board model

**Columns: fixed, four, and one of them is a lie.** `backlog`, `in_progress`, `review`, `trash` — no user-made columns, no swimlanes, no WIP limits. The fourth column is titled "Done" in the UI but its id is `trash` (`{ id: "trash", title: "Done" }` in `src/state/workspace-state.ts:35-40` and `web-ui/src/data/board-data.ts:4-9`); old "done" ids migrate to "trash" (`src/core/api-contract.ts:77-87`). "Done" is therefore a trash-can with a restore: cards there get a line-through title, a "Restore task from done" button, and the column header offers "Clear done" = permanent delete. Completion is modeled as discard-with-undo, not as an archive.

**Card anatomy** (all from `web-ui/src/components/board-card.tsx`, 857 lines, read in full; see [card-anatomy.png](shots/cline-kanban/card-anatomy.png)):
1. Column-specific corner controls, top-right: Play (start task) on backlog, trash icon elsewhere, RotateCcw (restore) in trash; review cards with changes additionally get **Commit** and **Open PR** buttons, plus a "Cancel Auto-commit" / "Cancel Auto-PR" chip while the per-task auto-review (commit|pr) is armed.
2. Title, single line, inline-editable via a pencil that appears on hover.
3. Description, 3-line clamp with an inline "See more" that expands to 10 lines.
4. An agent·model pill (Bot icon) when the task overrides the workspace agent (e.g. "claude · sonnet").
5. In in_progress/review/trash: a git line — worktree path, branch, ref, and `(+add/-del)`.
6. The live line: a 6px colored dot plus a 12px monospace activity string (see section 2).
7. Status marker overlaid: spinner while in_progress, red `AlertCircle` when failed, orange `AlertTriangle` at the credit limit.

Cards are uniform and quiet; nothing on the face is user-colorable. **Behind a click:** a backlog card opens the edit dialog; a card in any other column opens the full card detail view (chat or terminal, diff with line comments, file tree, commit/PR actions). **Never on the board at all:** elapsed time, cost, conversation content, and — despite being in the data model — *why* a card awaits review (see section 2).

**Where the human's decisions live.** The Review column *is* the inbox: a session that needs the human auto-moves its card there. Approve/deny is one click on the card face (Commit / Open PR), or two into the detail view to comment on diff lines first. A browser Notification fires when a card becomes review-ready. There is no separate approvals page.

**Filters, swimlanes, cross-project views: none.** One board per project; the sidebar switches projects (with backlog/done counters) and there is a "Add Project" flow, but no aggregated view — the top open feature request (#562, below).

## 2. Agent-task specifics

This is the agent-native reference product; this section is the heart of the report.

**State model.** A session is `idle | running | awaiting_review | failed | interrupted` with a mode `act | plan` and a nullable `reviewReason: attention | exit | error | interrupted | hook` (`src/core/api-contract.ts:252-261`). The state machine (`src/terminal/session-state-machine.ts`): only `attention`, `hook` and `error` may return to running; a process exit maps to review with reason `exit` when exit code 0, else to `failed` with reason `error`, with `interrupted` overriding both; resuming a card from trash re-enters `awaiting_review` with reason `attention` (`src/terminal/session-manager.ts:532-547`). The reasons' origins: `hook` = an agent hook fired (Stop, PermissionRequest, permission Notification, per-agent mappings in DEVELOPMENT.md), `attention` = human resumed it, `error`/`exit` = process outcome, `interrupted` = killed.

**What the card shows while running.** The spinner plus the activity line, fed entirely by hooks — never polling. The hook payload carries `activityText, toolName, toolInputSummary, finalMessage, hookEventName, notificationType, source` (`api-contract.ts:263-272`) and the card renders one line from it through a precedence chain (`getCardSessionActivity`): blue dot "Thinking...", green success, tool labels like `Read(src/index.ts)`, gold "Waiting for review", red error text, orange "Out of credits" (the credit-limit warning). The tests pin the intended behavior: while awaiting review the tool name is suppressed and only "Waiting for review" shows; during assistant streaming the last tool label stays visible instead of flipping back to "Thinking..." (`web-ui/src/components/board-card.test.tsx:539,579`). **Missing:** no progress percentage, no elapsed time, no cost. `startedAt` exists in the session summary but is rendered only inside the detail-view terminal panel, never on a card (grep-verified: the single card-relevant use is `agent-terminal-panel.tsx:352`).

**The biggest gap for us: the reason never reaches the face.** `reviewReason` is set everywhere in the runtime but rendered nowhere in the web UI — its only non-test occurrence is a reset to null (`web-ui/src/hooks/app-utils.tsx:107`). A card that awaits review because the agent asked permission looks identical to one that finished cleanly or one that resumed from trash: gold dot, "Waiting for review". The five-word vocabulary we adopted in stage10 item 26 pattern (4) is *their* data model, and even they do not surface it.

**Finish, fail, question.** Finish → `awaiting_review` → auto-move to Review, Commit/Open PR appear if the worktree has changes; the README demo frames show the review flow end to end. Fail → red marker, error text in the activity line, card stays put. Question/permission → hook event flips the session to `awaiting_review` mid-run (agent still alive), card jumps to Review while the process waits. Interrupted (server stop, kill) → card auto-moves to trash and board selection jumps to the next task.

**Conversation.** Lives behind the click, in the card detail view (`web-ui/src/components/card-detail-view.tsx`): Cline tasks get the native Cline chat panel; every other agent (Claude Code, Codex, Gemini, Droid, OpenCode, Kiro…) gets the raw PTY terminal. On mobile these become tabs (chat / diff / files). Nothing of the conversation appears on the board — the right call at board level.

**Mid-run steering.** Full: type into the chat/terminal in the detail view (writes straight to the PTY), stop from the card, restart (auto-restart caps at 3 per 5s window, `session-manager.ts:38-39`), start in plan mode, queue images with @file references and paste. Diff lines are clickable to comment, and comments queue then send to the agent's terminal as one follow-up (`diff-viewer-panel.tsx`, cited by our own stage10 item 23).

**Approvals, spend, budgets.** No budgets, no cost, no spend limits anywhere — the only money signal is the orange credit-limit warning. Agent permission prompts are surfaced as review states, not as an approve/deny queue; the settings dialog merely shows (and can enable) each agent's dangerous flag verbatim — e.g. Claude Code `claude --permission-mode auto`, Codex `codex --dangerously-bypass-approvals-and-sandbox`, Factory Droid `droid --auto high`, Kiro `kiro-cli --trust-all-tools` (visible in [settings.png](shots/cline-kanban/settings.png)). That is trust-the-operator security, by design.

**Multi-agent.** No grid of live outputs; parallelism is expressed as N cards each with its own spinner and activity line, "Start all" on the backlog, and dependency links (⌘/Ctrl-click two cards) whose arrows render on the face and that auto-start the linked backlog task when the blocker finishes (`use-linked-backlog-task-actions.ts`, `src/prompts/append-system-prompt.ts`). The agent can organize its own board: a sidebar "Kanban Agent" gets an injected system prompt that forbids editing code and exposes `task list/create/update/done/delete/link/unlink/start` (`append-system-prompt.ts`) — though it cannot set per-task agent/provider/model, only the workspace default (#431, below; PR #592 in flight).

**Transport.** One WebSocket state stream, snapshot then incremental patches, exponential-backoff reconnect (`web-ui/src/runtime/use-runtime-state-stream.ts`). Every streaming token is its own frame, which the community reports as lag on long outputs (#629).

## 3. Interaction model

**Moving work: drag and drop for humans, programmatic animation for the agent — through the same engine.** Human drags are *rule-gated* to exactly: backlog→in_progress, any→trash, trash→review (`web-ui/src/state/drag-rules.ts`). in_progress↔review is reserved for the session state machine: when a session flips, the UI animates the card through the same @hello-pangea/dnd drag engine using a `ProgrammaticCardMoveInFlight` token with behaviors `skipKickoff / skipTrashWorkflow / skipWorkingChangeWarning / insertAtTop` (`web-ui/src/hooks/use-programmatic-card-moves.ts`); the auto-moves themselves live in `use-board-interactions.ts:440-500`. So a human can never drag work past review, and an agent's state change never teleports — it moves like a drag the human didn't perform. Buttons coexist: Play/Start on cards, Start-all on backlog, Commit/Open PR on review cards, restore/clear in trash.

**Keyboard and mobile.** `c` create task, Ctrl+B start backlog tasks, Ctrl+Shift+S settings, Ctrl+G git view (a built-in commit browser with the file tree — [git-view.png](shots/cline-kanban/git-view.png)), Ctrl+J terminal, ⌘/Ctrl+click to link dependencies, hover hints document all of it. Mobile-friendly since v0.1.60 (praised by users), with the tabbed detail view.

**Refresh model.** Live push over WebSocket; the spinner animates and the activity line changes per hook event without reloads. No polling anywhere in the UI.

**Click map** (from the board):
- read status: 0 clicks — spinner, dot, activity line are on the face.
- read detail: 1 click for cards outside backlog; backlog cards open the edit dialog instead (2 to reach detail).
- decide: 1 click (Commit / Open PR on the face); comment-then-decide: 2 clicks (open detail, click diff lines).
- steer: 2 clicks (open detail, type into chat/terminal).
- comment: 2 clicks (open detail, click a diff line).

## 4. Visual system

**Themes.** GitHub-flavored dark by default (theme-color `#24292E`), light mode in Settings → Appearance. Color is *only* system-set semantics: the activity dot's five colors (thinking blue, success green, waiting gold, error red, warning orange), red failure marker, orange credit warning. There are no user-set colors, labels, priorities, or tags anywhere — the only per-card identity is agent·model.

**Typography and density.** 12-14px UI text, 12px mono for activity and git lines, 3-line clamped descriptions; at 950px viewport roughly four cards per column are visible with the detail popover closed. Cards read fine as thumbnails (title + marker), though the activity line is near the legibility floor.

**Status vocabulary** (what a card can be, and how each is distinguished):

| State | Marker | Dot/line | Position |
|---|---|---|---|
| idle (backlog) | Play button | none | Backlog |
| running | spinner | blue "Thinking..."/tool label | In Progress |
| awaiting_review (hook/exit/attention) | — | gold "Waiting for review" | Review |
| awaiting_review, permission prompt | — | gold, agent alive in detail view | Review |
| failed | red `AlertCircle` | red error text | stays in In Progress |
| credit limit | orange `AlertTriangle` | orange "Out of credits" | In Progress |
| interrupted | — | — | auto-moved to trash ("Done"), line-through, Restore |
| done-as-trash | line-through | — | "Done" column |

Plus mode: plan vs act, set per task ("Start in plan mode" in the create dialog, visible in [create-dialog.png](shots/cline-kanban/create-dialog.png)).

## 5. What users say

**Three most common complaints:**

1. **No cross-project view.** "Support a Global Kanban Agent view across multiple projects" — "the Kanban Agent appears to be scoped around individual projects" ([#562](https://github.com/cline/kanban/issues/562), open since 2026-07-09); users run multiple instances as a workaround ([r/CLine](https://www.reddit.com/r/CLine/comments/1sbw32p/kanban_multiple_project_instances_for_parallel)).
2. **Performance with heavy content.** "A single card with ~100KB prompt (pasted runtime logs) makes the whole board extremely slow to open and laggy… Deleting… that single 100KB log card… makes the UI immediately smooth again" ([#648](https://github.com/cline/kanban/issues/648), open, Sep 14, 2026); compounded by one WebSocket frame per streamed token ([#629](https://github.com/cline/kanban/issues/629)).
3. **Session durability and trust at restart.** "After restarting the Kanban server, every task card shows no conversation history even though the conversations exist on disk" ([#652](https://github.com/cline/kanban/issues/652), open, Sep 20, 2026); plus stalls with bypass-permissions agents ([#644](https://github.com/cline/kanban/issues/644)) and `.env` symlinked into every task worktree ([#619](https://github.com/cline/kanban/issues/619)).

**Three most praised details:**

1. **A worktree and terminal per card.** "Each task card gets its own terminal… a replacement for your IDE better suited for running many agents in parallel and reviewing diffs" (official intro, [r/CLine](https://www.reddit.com/r/CLine/comments/1s4catz/introducing_cline_kanban)); "assigning an independent Git worktree and terminal to each task card, allowing multiple agents to work simultaneously" ([note.com review](https://note.com/humble_bobcat51/n/n4ce8b02772b0)).
2. **The board as the at-a-glance monitor.** "I've been pretty impressed with Kanban, especially v0.1.60 with its mobile-friendly design. Kanban feels like a glimpse into a next-gen IDE" ([r/CLine, "Impressed with Kanban"](https://www.reddit.com/r/CLine/comments/1smeeqg/impressed_with_kanban)).
3. **The review flow.** Checkpoint diffs, click-a-line-to-comment, and Commit/Open PR straight from the card (README; echoed in our own earlier scan: docs/market-research/projects/cline/report.md line 35).

**Change since the 2026-09-29 market-research report:** none in the product — upstream HEAD equals the studied clone (`abd4912`, 2026-09-04; re-checked today). The scan (docs/market-research/projects/cline/report.md) covered Kanban as a surface note with a UX verdict; what is new here is the interaction-level study: the drag-rule/programmatic-move split, the session state machine and its reviewReason vocabulary, and the finding that the reason is never rendered.

## 6. Verdict for us

**Steal:**
- The `reviewReason` vocabulary (attention / exit / error / interrupted / hook) as *the* data model for a waiting card (stage10 item 26 pattern 4) — and, the lesson, actually render it; cline/kanban has the enum and drops it at the UI.
- Programmatic moves animated through the same drag engine as human moves, with explicit behaviors (skipKickoff, insertAtTop…): one motion language, so agent mutations never look like glitches next to human drags.
- Rule-gated human drags: humans may only drag toward work or trash; entry to Review is owned by the session state machine. The board structurally cannot express "human dragged it past review".
- Hook-fed card faces with no polling: every visible change is a harness event (patterns 1 and 2) — the activity line ("Thinking…", `Read(src/index.ts)`, "Waiting for review") is the best quiet live-signal in the field.
- The cancelable automation chip: "Cancel Auto-PR" sits on the card from creation, so armed automation is always visible and reversible before it fires.
- Dependency links on the face with auto-start of the unblocked task (pattern 9) and the board-as-API for the agent (`kanban task` CLI behind an injected "manage, don't code" system prompt — pattern 10).

**Skip:**
- Done-as-trash: a "Done" column that is literally the trash with permanent delete. It conflates completion with discarding and makes history a liability; our Done must be an archive.
- Zero numbers on the card: no elapsed, no cost, no checks (pattern 7 unmet). For a factory with budgets and gates this is not restraint, it is missing information.
- Raw PTY as the agent conversation for non-Cline agents: agent-leak and noise; we want the normalized event schema (pattern 2), not an xterm stream per card.
- Single-operator trust model: no auth, per-agent `--dangerously-bypass-approvals` toggles one checkbox away, `.env` symlinked into worktrees (#619). Fine for a lone dev; refused for our multi-human approval model (the scan's verdict, unchanged).
- One WebSocket frame per token (#629/#648): batch server-side.

**Decision needed (for the aggregate report):**
- Who may move a card into Review: here only the session can. Do our humans get a manual "needs review" drag, or is review entry always machine-owned?
- Is Done terminal or restorable? cline/kanban votes restorable-trash; classic tools vote archive. Affects history, metrics and the column's name.
- Card-face budget for numbers: cline/kanban carries none (clean but blind), Factory carries elapsed+spend+checks. What exactly does our card show?

**Cloneability:** trivial. `npm i -g kanban` (or run from clone), Apache-2.0, fully local, works keyless — I ran server + CLI task CRUD with no account and no key; only running an actual agent session needs a configured agent CLI and credentials.

## Scoring axes

| Axis | Score | Reason |
|---|---|---|
| Card scannability (read ten cards in one glance) | 4 | Uniform, clamped, calm cards; title+marker+one activity line read at a glance; the 12px mono line is the only strain. |
| State clarity (what is happening, how far, what next) | 3 | Column+spinner+dot say what, never why (reviewReason unrendered) and never how far (no elapsed/progress/cost). |
| Human-decision surface (find and make the next decision) | 4 | Review column is the inbox, Commit/Open PR is one click on the face; no cross-project "needs you" list (#562) and no approve/deny queue. |
| Agent-activity legibility (is the agent working, waiting, stuck) | 4 | Hook-fed live activity line per card is best-in-class for working-vs-waiting; loses a point for no stuck signal (no elapsed/no-output-age on the face). |
| Noise level (5 means quiet: nothing without meaning) | 4 | Everything on the face is session-derived; no labels, avatars or decoration — only the churning mono line and the first-run popover cost it. |
