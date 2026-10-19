# Waiting Cards Get Real Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A card that waits for a human always names its ask and offers a real action: a routine carries one live toggle, needs me or runs on its own, flippable on the card until the run fires; a waiting human card can be handed to the factory or closed with a note; every ask shows the same buttons on every surface; and the browser tab title counts only what waits for the member now.

**Architecture:** The ask becomes durable data before a card ever waits (intake events written and failing loudly ahead of the status transition), the routine's mode lives in `routine_state` beside the skip and is read once when the run fires (the config's `files` value is only the toggle's starting side), one hand-over action (`Runner.Go`) files the agent card from a human card's own text through the existing `FileAgentTask` path, the console renders go and close-with-note where it today renders a meaningless answer form, and the settle rule already derived for the chat badge grows a third count (`waits_you`) that replaces unread rows in the tab title.

**Tech Stack:** Go (html/template + htmx console inside factoryd), PostgreSQL (CNPG), plain JS in `internal/console/static/chat.js`. No new dependencies.

**Spec:** this file's **Decisions** section, ruled by Sebastian in conversation on 2026-10-19, plus the live investigation of card #1131 (`t-c892b0f86d93`) on 2026-10-19.

## Decisions

- **One routine, one live toggle** (Sebastian, 2026-10-19): a routine is not created one way or the other; it carries a toggle, **needs me** ↔ **runs on its own**. The difference only matters when the run fires; until then he can flip it back and forth on the card. The config's `files` value (`human`/`agent`) sets the toggle's starting side, and the live toggle overrides it from then on — no new config value. The weekly bump keeps `files: "human"` (roadmap 267's supply-chain checkpoint), so it starts at needs me. A waiting card's **go** action is the same choice made after the run fired: flip this one to run now.
- **The tab title counts what waits now** (Sebastian, 2026-10-19): open asks and notes about cards still waiting for the member. Settled asks and notes about finished cards never count, read or not. On 2026-10-19 the honest number was 1 (the weekly bump), not 5.
- **The ask is durable before the wait** (from the #1131 analysis): a card that shows `waiting-human` always has its intake escalation row; a failure to write it fails the escalation instead of only logging.
- **Ask buttons live on every surface**: a chat-filed escalation's question reaches the board and drawer through the same intake row the runner's escalations write, not only through the chat thread.
- Copy is fixed by this plan: the two actions read **Have the factory do it** and **Close with note**; the go note posted on the closing issue reads `The factory runs it as #N.`

## Non-goals

- No automation of the weekly bump (`files` stays `"human"`); the toggle starts it at needs me, and he flips it when he stops caring.
- No per-occurrence scheduling: the toggle persists where he leaves it, and each run reads it as it fires.
- No change to the two-pill thread badge (amber asks, bordered new) or the status strip.
- The eight waiting cards on the infra project board are real waits, not defects; nothing here touches them.
- A waiting card named in two threads counts twice in the title. Accepted corner; both rows point at one card and the click settles both.

## Global Constraints

- `go test -race ./...` green on all packages; `gofmt` empty, `go vet` clean, `gosec` 0 (CI runs all).
- PG-backed tests run only with `FACTORYD_TEST_DATABASE_URL` set; a green run without them skips them (ledger 2026-10-17). Run the suite with PG for this work: `scripts/pg-test.sh` or the docker Postgres, as earlier cards did.
- Comments: minimal, only what code cannot say. Match the file's existing comment style (lowercase, the codebase's plain voice).
- No new dependencies, no new templates beyond the named ones; every route registered in `internal/console/console.go`'s table.
- Every UI string goes through the existing template helpers and the console's plain-copy voice (short common words, British spelling).
- Tests are hand-derived: never adjust an expectation to force a pass.

## Review Focus

1. **A card gains an ask between render and the go POST** (two tabs, slow hands): `doGo` re-checks kind, status and open ask server-side and refuses; the agent card is filed at most once. Pinned in Task 3's handler test.
2. **The live DB still holds chat-filed waiting cards whose question never left the chat thread** (card #102's shape): the Task 2 backfill writes their intake rows, and the Task 5 gate reads the row, so those cards show their ask, not go. Pinned in Task 2's backfill test.
3. **`escalateStale` runs with `in == nil`** (no Forgejo, no timeline): the intake insert still happens first and its failure returns the error before any transition. Pinned in Task 1's stale test.
4. **The toggle is flipped in the moment the run fires**: the run reads the mode once at its start, so a flip mid-run changes only the next run, never the one under way. Pinned in Task 4's runner test.
5. **A routine whose `files` is `pull-request` or a report**: no toggle renders and none is read; those kinds have no needs-me side. Pinned in Task 4's console and runner tests.
6. **An ask-less human card in `backlog`** (not yet waiting): go and close-with-note are offered there too; the drawer's Open block appears for waiting cards only. Pinned in Task 5's face test.
7. **The same waiting card named by an ask row and a poke row in one thread**: the title counts it once (`waits_you` counts distinct cards). Pinned in Task 6's settleCounts test.

---

### Task 1: The durable ask before the wait

**Files:**
- Modify: `internal/factoryd/activities.go:1015-1107` (`Runner.Escalate`)
- Modify: `internal/factoryd/temporal.go:354-397` (`escalateStale`)
- Test: `internal/factoryd/activities_test.go`, `internal/factoryd/temporal_test.go` (follow the existing escalate tests' store doubles)

**Interfaces:**
- Consumes: `r.store.InsertIntakeEvent(ctx, IntakeEvent{...})`, `store.TransitionTask` — unchanged signatures.
- Produces: the ordering invariant later tasks rely on: `status == "waiting-human"` implies an intake escalation row exists. No new symbols.

- [ ] **Step 1: Write the failing tests**

In the existing escalate test style (store double recording calls): one test asserts that when `InsertIntakeEvent` returns an error, `Runner.Escalate` returns a non-nil error **and** `TransitionTask` was never called; one test asserts the same for `escalateStale` with `in == nil` (insert fails → error, no transition). Hand-derive the call log: `["InsertIntakeEvent", "CreateIssueComment"]` and no `TransitionTask`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `go test ./internal/factoryd/ -run 'TestEscalate' -race`
Expected: FAIL — today the insert error is only logged and the transition happens first.

- [ ] **Step 3: Reorder both bodies**

In `Runner.Escalate`: move the issue comment and the `InsertIntakeEvent` call **ahead** of `TransitionTask`; return the error from `InsertIntakeEvent` instead of logging it. The transition, mirror, `r.record`, and the `EventQuestionAsked` timeline row follow. In `escalateStale`: same — insert (returning the error) before `TransitionTask`; the comment stays logged-only there, as today.

- [ ] **Step 4: Run the package tests**

Run: `go test ./internal/factoryd/ -run 'TestEscalate|TestStale' -race`
Expected: PASS, and the pre-existing escalate tests still pass (their expectations about rows and comments are order-free).

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd/activities.go internal/factoryd/temporal.go internal/factoryd/activities_test.go internal/factoryd/temporal_test.go
git commit -m "factoryd: the intake escalation row is written before the wait"
```

### Task 2: Chat escalations carry the durable ask

**Files:**
- Modify: `internal/factoryd/chat_escalation.go:19-58` (`EscalateToHuman`)
- Create: migration `internal/factoryd/migrations/` (next number after the latest; SQL backfill)
- Test: `internal/factoryd/chat_escalation_test.go`

**Interfaces:**
- Consumes: `InsertIntakeEvent(ctx, IntakeEvent{TaskID, Kind: IntakeEscalation, Author, Body, CommentID, Choices, Question *HumanQuestion})`.
- Produces: every chat-filed waiting card has an intake escalation row, so `bt.Escalation` (Task 4's gate) is the single ask truth on every surface.

- [ ] **Step 1: Write the failing test**

After `EscalateToHuman` with a five-part `HumanQuestion`, `IntakeEvents(taskID)` holds one `IntakeEscalation` row whose `Question` equals the question passed. Hand-derive the fields; the existing test in this file already builds the question.

- [ ] **Step 2: Run it to verify it fails**

Run: `go test ./internal/factoryd/ -run TestEscalateToHuman -race`
Expected: FAIL — no intake row today.

- [ ] **Step 3: Insert the row in `EscalateToHuman`**

One `InsertIntakeEvent` call beside the card creation: `Kind: IntakeEscalation`, `Author: "factoryd"`, `Body: q.Ask`, `Question: &q`. Its error is returned, not logged (the card without its ask would be Task 1's orphan in new clothes).

- [ ] **Step 4: Run the test; then write the backfill migration and its test**

Run the test (PASS). Then a migration that inserts, for every `chat`-source task in `waiting-human` with a `question_asked` timeline row but no `IntakeEscalation` row, one intake row whose question JSON is built from the timeline row's `ask`/`why`/`info`/`choices` detail (read the `events`/timeline schema in `store.go` for the exact column names). Test in the PG migration-test style used by earlier migrations; on the seeded lab it writes exactly one row for card #102's shape and none for runner-escalated cards.

- [ ] **Step 5: Run the package tests with PG; commit**

Run: `go test ./internal/factoryd/ -race` with `FACTORYD_TEST_DATABASE_URL` set.
Expected: PASS.

```bash
git add internal/factoryd/chat_escalation.go internal/factoryd/chat_escalation_test.go internal/factoryd/migrations/
git commit -m "factoryd: a chat escalation's question reaches the board through its intake row"
```

### Task 3: The go action

**Files:**
- Modify: `internal/factoryd/runner.go` (or the file holding `RetryPlanCard`; `Runner.Go` next to it)
- Modify: `internal/factoryd/routine_store.go` (two small store methods)
- Modify: `internal/console/console.go` (cfg field `GoCard`, route), `internal/console/lanes.go` or `actions.go` (`goCard`, `doGo`), `cmd/factoryd/main.go` (wiring)
- Test: `internal/factoryd/runner_test.go`, `internal/console/actions_test.go`

**Interfaces:**
- Consumes: `FileAgentTask(ctx, store, forgejo, workflows, tl, p, title, body, labels, Task)` (`intake.go:1048`); `fileHumanTask`'s Task shape for what a routine card carries.
- Produces: `func (r *Runner) Go(ctx context.Context, taskID, by string) (int64, error)` — files the agent card, returns its issue number; `var ErrNoGo` for refusals; console cfg field `GoCard func(ctx context.Context, taskID, by string) (int64, error)`; route `POST /tasks/{id}/go` → `c.goCard`.

- [ ] **Step 1: Write the failing factoryd test**

`Runner.Go` on a fake store + Forgejo double, given a `kind: "human"`, `waiting-human` routine card whose `routine_runs` row points at it: asserts one `CreateTask` with `Kind: "agent"`, `Source: "routine"`, budget from the policy clamp, labels `["routine"]`; asserts `routine_runs.task_id` now names the new card (the `while_open: "hold"` keeps holding); returns the new issue number. A second test: `kind: "agent"` card → `ErrNoGo`, nothing filed; a `backlog` human card → filed (go works before the wait too).

- [ ] **Step 2: Run it to verify it fails**

Run: `go test ./internal/factoryd/ -run TestGo -race`
Expected: FAIL — no `Go`.

- [ ] **Step 3: Implement the store methods and `Runner.Go`**

Store: `RoutineOfTask(ctx, taskID) (project, routine string, run int, ok bool, err error)` (one query on `routine_runs` by `task_id`, newest first) and `RepointRoutineRun(ctx, taskID, newTaskID string) error` (one `UPDATE ... WHERE task_id = $1`). `Runner.Go`: load the task; guard `Kind == "human"` and status `backlog`/`waiting-human` (else `ErrNoGo`); resolve the routine; body = `"Run the skill " + rt.Skill + ".\n\n" + t.Objective + "\n\nhanded over by " + by` when a routine was found, else `t.Objective` alone; `FileAgentTask` with `Task{ID: NewTaskID(), Kind: "agent", RiskClass: t.RiskClass, BudgetEUR: v.Document.Budget.ClampBudget(0), Objective: t.Title + "\n\n" + body, Source: t.Source}` and labels `["routine"]` for routine cards, none otherwise; repoint the run when found; return `ref.Number`.

- [ ] **Step 4: Wire and test the console side**

`console.go`: `GoCard` cfg field (doc comment in the file's voice) and `{"POST /tasks/{id}/go", http.HandlerFunc(c.goCard), nil}`. `doGo`: `cardIn`; refuse unless `Kind == "human"`, status `backlog`/`waiting-human`, and the card has no intake escalation row (`ErrNoGo` wording follows `ErrNoRetry`'s); call `GoCard`; then reuse `doClose(ctx, a, id, "The factory runs it as #"+n+".")` so the note lands as the issue comment and the close records. `main.go`: `GoCard: runner.Go` beside `RetryPlanCard`. Console test with a fake `GoCard`: happy path returns the close note naming the new number; wrong-kind card → refusal; a second go after the first → refusal (the card is closed).

- [ ] **Step 5: Run both packages; commit**

Run: `go test ./internal/factoryd/ ./internal/console/ -race`
Expected: PASS.

```bash
git add internal/factoryd/ internal/console/ cmd/factoryd/main.go
git commit -m "factoryd: Go files a human card's work as an agent card and hands it over"
```

### Task 4: The routine's toggle

**Files:**
- Create: migration `internal/schema/migrations/factoryd/` (next number after `20261019100000_criteria_verdicts.sql`): `routine_state` gains `needs_me boolean` (NULL = follow the config's `files`).
- Modify: `internal/factoryd/routine_store.go` (the state row and its read carry the column; a setter beside the skip's upsert at line ~140)
- Modify: `internal/factoryd/routine_run.go:92-111` (the fire-time read)
- Modify: `internal/console/routines.go` + `internal/console/console.go` (route), `internal/console/board.go` (the ghost's fill), `internal/console/templates/board.html` (`ghost` at line 283, beside `routine-acts` at 292)
- Test: `internal/factoryd/routine_store_test.go`, `internal/factoryd/routine_run_test.go`, `internal/console/routines_test.go` (or the file holding `doRoutineSkip`'s tests)

**Interfaces:**
- Consumes: the skip's whole pattern — `routine_state` upsert, `doRoutineSkip`'s permission gate and route shape, the ghost's data.
- Produces: `SetRoutineNeedsMe(ctx, project, routine string, needsMe bool, by string) error`; `RoutineState.NeedsMe *bool`; route `POST /routines/{project}/{name}/needs-me` → `c.routineNeedsMe` (form field `undo=1` flips back to following the config, the skip's pattern); the runner honours it only for `files` `human`/`agent`.

- [ ] **Step 1: Write the failing tests**

Store (PG): set then read round-trips `needs_me` and `by`; a routine never touched reads NULL. Runner: config `human` + state `needs_me=false` → the run files an agent card (the `FilesAgent` branch's shapes, labels `["routine"]`); config `agent` + state `needs_me=true` → a waiting human card with the needs-you poke; state NULL → the config's side; config `pull-request` → the toggle is ignored, template pass runs. Console: the ghost of a `human`/`agent` routine shows the toggle's current side and the flip form posting to the route; a `pull-request` routine's ghost shows none; the permission refusal mirrors `doRoutineSkip`'s test. Hand-derive all expectations.

- [ ] **Step 2: Run them to verify they fail**

Run: `go test ./internal/factoryd/ -run 'TestRoutine' -race` and `go test ./internal/console/ -run 'TestRoutine' -race`
Expected: FAIL — no column, no read, no route.

- [ ] **Step 3: Implement the store and runner sides**

Migration: `ALTER TABLE routine_state ADD COLUMN needs_me boolean` (and `needs_me_by text`, the skip's `skip_by` pattern). `routineStateColumns` and `scanRoutineState` grow the column; `SetRoutineNeedsMe` upserts beside `SetSkip`. In `RoutineRun`, where `rt.Files` switches: when `rt.Files` is `policy.FilesHuman` or `policy.FilesAgent`, read the state once (`RoutineState` for the project/routine) and let a non-NULL `NeedsMe` pick the branch — read it before the switch, decide the effective `files` there, nothing else changes.

- [ ] **Step 4: Implement the console side**

Route in `console.go`'s table beside the skip's; `doRoutineNeedsMe` mirrors `doRoutineSkip`'s gate, actor and note (the note names the side: `Weekly bump runs on its own.` / `Weekly bump needs you.` / `Weekly bump follows its config.`). The ghost's fill carries the current side (config's, or the override) and the form reuses `routine-acts`' inline pattern, `hx-target` per `routine-act-target`. The toggle renders only for `files` `human`/`agent` routines.

- [ ] **Step 5: Run both packages with PG; commit**

Run: `go test ./internal/factoryd/ ./internal/console/ -race` with `FACTORYD_TEST_DATABASE_URL` set.
Expected: PASS.

```bash
git add internal/schema/migrations/ internal/factoryd/ internal/console/
git commit -m "routines: one live toggle, needs me or runs on its own, read when the run fires"
```

### Task 5: The board and drawer offer go and close-with-note

**Files:**
- Modify: `internal/console/board.go` (`card` struct fields, `boardCard`'s escalation block ~1865-1883, `setForms` ~2000-2011, the drawer's `Need`/`Door` block ~3262-3272)
- Modify: `internal/console/templates/board.html` (`escalation-actions` 86-134, the face's acts block), `internal/console/templates/drawer.html` (the Open section)
- Modify: `internal/console/lanes.go:249-251` (`closeCard` reads `note`)
- Test: `internal/console/face_test.go`, `internal/console/board_test.go`, the console lab where the drawer's Open block is pinned

**Interfaces:**
- Consumes: Task 3's `POST /tasks/{id}/go`; `doClose`'s existing note parameter.
- Produces: `card.Go *goForm` and `card.Ask bool`; templates render the two named actions wherever a human card waits without an ask.

- [ ] **Step 1: Write the failing tests**

Face test: a `kind: "human"`, `waiting-human` card with no intake escalation row, viewer a writer → the face acts contain a form posting to `/tasks/{id}/go` with the label `Have the factory do it`, and a `Close with note` form with a `note` textarea posting to `/tasks/{id}/close`; the same card in `backlog` shows both too; the same card **with** an escalation row shows the ask buttons and **no** go form. Drawer test: the ask-less waiting human card's Open block shows the same two actions; the free-text answer form (`Your answer, posted on the issue`) appears only when `Ask` is true. Hand-derive the exact HTML the way the existing face and board tests do.

- [ ] **Step 2: Run them to verify they fail**

Run: `go test ./internal/console/ -run 'TestCardFace|TestBoard|TestDrawer' -race`
Expected: FAIL — no go form; the answer form renders without an ask.

- [ ] **Step 3: Implement**

`card` gains `Go *goForm` (CSRF only, mirrors `retry`) and `Ask bool`. In `boardCard`'s escalated block: `k.Ask = bt.Escalation != nil` (read the exact `bt.Escalation` type around line 1866). In `setForms`: for `t.Kind == "human"`, status `backlog`/`waiting-human`, no escalation row, and `MayWriteSummary` (the writer gate `Closes` already uses): set `k.Go` and a close-with-note form. Templates: `escalation-actions`' issue branch (lines 106-119) and its free-text form gate on `.Card.Ask`; the face's acts condition grows `.Go`; the two forms use the existing `inline` form markup. Drawer: set `d.Need` only when the card has its ask; otherwise an ask-less waiting human card gets the go/close block in the Open section. `closeCard`: `c.doClose(ctx, a, id, r.PostFormValue("note"))`.

- [ ] **Step 4: Run the console tests and the lab**

Run: `go test ./internal/console/ -race` and the console lab (the shots suite the repo already runs).
Expected: PASS; the lab shots show the two actions on the weekly-bump scenario card.

- [ ] **Step 5: Commit**

```bash
git add internal/console/
git commit -m "console: a waiting human card without an ask offers the factory or a close with note"
```

### Task 6: The title counts what waits

**Files:**
- Modify: `internal/factoryd/chat.go:183-216` (`ChatConversation.WaitsYou`), `internal/factoryd/chat.go:822-839` (a sibling read of `ChatAsks`, or a widened one if no other caller breaks — check callers first)
- Modify: `internal/console/chat.go:339-381` (`settleCounts`)
- Modify: `internal/console/static/chat.js:302-308` (`unreadOf`), its callers at `1035`
- Test: `internal/console/chat_panel_test.go`, `internal/console/threads_test.go`

**Interfaces:**
- Consumes: `SettleOf`, `askFacts`, `ApprovalWaits` — the settle rule machinery already in `settleCounts`.
- Produces: `waits_you` per thread in the conversations JSON; the tab title sums it. The two-pill badge is untouched.

- [ ] **Step 1: Write the failing tests**

`settleCounts` test with hand-derived rows: thread with an open ask (card `waiting-human`) → `NeedsYou 1`, `WaitsYou 1`; thread with a settled merge ask (card done) → both 0; thread with a done-poke → both 0; thread with the weekly-bump poke (card `waiting-human`, no ask) → `NeedsYou 0`, `WaitsYou 1`; a thread holding both an ask and a poke about the same card → `WaitsYou 1`. Chat panel script test: `unreadOf` over those threads returns the sum of `waits_you` (2 in the fixture), and the title pin at `chat_panel_test.go:149` updates to match; `TestChatInboxBadge` keeps its pill expectations unchanged.

- [ ] **Step 2: Run them to verify they fail**

Run: `go test ./internal/console/ -run 'TestChatPanel|TestChatInboxBadge|TestSettleCounts' -race`
Expected: FAIL — no `waits_you`.

- [ ] **Step 3: Implement**

`ChatConversation.WaitsYou int64 \`json:"waits_you,omitempty"\``. A store read returning the member's escalation **and** poke rows with `task_id <> ''` (if `ChatAsks`' only callers are `settleCounts` and the ask-analysis path, widen `ChatAsks` and filter at the callers; otherwise add `ChatWaitingRows` beside it). `settleCounts`: derive `SettleOf(...).Open` for every such row (the `askFacts` ids list grows to cover them), then per thread count **distinct** task IDs whose row derives open. `chat.js`: `unreadOf` sums `t.waits_you` only; rewrite the comment above it in the same voice ("the tab title's count: the member's own threads' cards that wait for them now"). The visible summary (`sumHTML`) and pills stay as they are.

- [ ] **Step 4: Run the full suite with PG; commit**

Run: `go test -race ./...` with `FACTORYD_TEST_DATABASE_URL` set.
Expected: PASS, all packages.

```bash
git add internal/factoryd/chat.go internal/console/chat.go internal/console/static/chat.js internal/console/chat_panel_test.go internal/console/threads_test.go
git commit -m "console: the tab title counts the cards that wait for the member"
```

## Rollout

Factoryd and console ride the next roll as usual (image pin bump through the factory's own PR flow). After the roll, on the live console: the weekly bump's ghost shows the toggle at needs me; its card shows both actions; pressing go files the agent card, closes #1131 with the note, and the title drops to the honest count.
