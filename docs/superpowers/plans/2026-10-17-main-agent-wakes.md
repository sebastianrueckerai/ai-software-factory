# Main Agent Wakes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The factory's chat agent wakes on events (asks, watched cards, timers, a heartbeat), attempts every ask before the human sees it at high autonomy, gets a card-bound thread per needs-you card, sees all project threads with a `chat_search`, and owns timers it can rearm.

**Architecture:** One new factoryd loop, the Waker, copies the Poker pattern: it reads the event stream behind its own durable cursor and, for chosen event classes, starts one ordinary chat turn through a new exported console seam (`Console.StartWake`) that reuses the whole existing turn pipeline without HTTP. Caps, levels and the budget rule live in code, never in prompts. The ask boundary falls out of the existing per-tool confirm lists by construction.

**Tech Stack:** Go 1.x, PostgreSQL (embedded SQL migrations), html/template + vanilla JS console, existing OperatorModel gateway client.

**Spec:** `docs/main-agent-concept-2026-10-17.md` in the DESIGN repo `/home/womb/repos/ai-software-factory` (master). Code lives in `/home/womb/repos/ai-software-factory-code` (branch `main`). The question-format contract: `docs/question-format-concept-2026-10-17.md`, same repo. Executors read both.

## Global Constraints

- Verification is `scripts/pg-test.sh go test -race ./...` from the code repo root (throwaway PG, env vars set by the script). PG-backed tests need it; without it they skip and that is NOT a pass.
- A new chat tool is registered in exactly three places, in the same order: the `tools` slice (`internal/console/chat_tools.go`), `policy.ChatTools` (`internal/policy/policy.go`), `accessTable` (`internal/console/access.go`). A parity test asserts slice order.
- Migrations: one file per concern under `internal/schema/migrations/factoryd/`, named `YYYYMMDDHHMMSS_<slug>.sql`, dated after the newest file in the tree at implementation time. No semicolons inside SQL comments (the splitter is naive). One transaction per file.
- Policy lives outside the LLM: caps, level gates, the budget rule and the ask boundary are code. No new prompt rule may carry what a check can carry.
- Every agent act records events with `via=chat`, `decider=agent` (existing actor plumbing); first answer wins everywhere an ask can be answered.
- The writing guide governs every string a person reads (it already rides the system text).
- Wake caps: at most one wake turn per 10 seconds per project, at most one wake per card per minute, monthly chat task budget stands. Caps queue causes; they never drop events. The wake cursor moves only after the cause had its turn.
- A wake never fires on an event the agent itself caused (`via=chat`).
- Levels: ask wakes at `autonomous` only (full auto is autonomous plus merge rule); card/timer/heartbeat wakes at `assisted` and above; a wake turn has exactly the powers of a human-started turn at the project's level.
- Commit style: lowercase area prefix like existing history (`main agent: ...`), ending with `Co-Authored-By: Claude Code <noreply@anthropic.com>`. Push to `origin` and `github`.

## Review Focus

The five conditions most likely to bite, each pinned by a test in the owning task:

1. **A wake turn fails (gateway down, model error):** the cause must not be dropped and must not hot-loop. Cursor stays, retry no faster than once a minute (cooldown mark). Tested in Task 2 (`TestWakerFailedTurnRetriesColdly`).
2. **A human turn is in flight on the inbox when a wake fires:** the wake queues behind it through the existing per-thread gate; rows and turns never interleave. Tested in Task 1 (`TestStartWakeQueuesBehindALiveTurn`).
3. **Burst plus restart:** three asks in one minute produce one turn; after a factoryd restart no ask gets a second attempt and no pending cause is lost (durable cursor and durable marks). Tested in Task 2 (`TestWakerBatchesAsks`, `TestWakerMarksSurviveRestart`).
4. **Budget death (card #1013):** exactly one money ask filed in code, zero wake turns, and waking resumes once the budget is raised. Tested in Task 2 (`TestWakerBudgetDeathAsksOnce`).
5. **The human answers while the attempt runs:** `attach_analysis` refuses on an answered ask; the attempt's settle path loses gracefully to first-answer-wins. Tested in Task 3 (`TestAttachAnalysisRefusesAnsweredAsk`).

---

### Task 1: The console wake seam

**Files:**
- Create: `internal/console/wake.go`
- Modify: `internal/console/chat.go` (factor the non-HTTP core of `chatTurn`/`chatPost` if needed)
- Test: `internal/console/wake_test.go`

**Interfaces:**
- Consumes: the private turn pipeline (`turnGate`, `EnsureChatTask`, `AddChatMessage`, `StartQueued`, `t.run`), the `PulseContext` request-less pattern (`internal/console/pulse.go:106-113`), the `Sessions` port.
- Produces: `func (c *Console) StartWake(ctx context.Context, project, login string, conversation int64, birth, text string) error` — runs one synchronous member turn on `conversation` with `birth` as the user row's `BirthKind`. Birth kinds: `wake_ask`, `wake_card`, `wake_timer`, `wake_heartbeat`. Task 2 calls this through the `factoryd.WakeStarter` interface.

- [ ] **Step 1: Write the failing tests**

In `wake_test.go` on the `AcceptanceRig`: `TestStartWakeRunsATurnWithoutHTTP` — script the fake gateway with `Reply`, call `StartWake` on the rig's project for the member with the inbox conversation; assert the user row exists with `birth_kind=wake_ask` and the scripted assistant row follows, both on the passed conversation. `TestStartWakeQueuesBehindALiveTurn` — start a slow human turn over `httptest` (a gateway reply that blocks), call `StartWake` on the same thread, assert the wake's user row is written `queued` and its turn only runs after the human turn finishes.

- [ ] **Step 2: Run tests to verify they fail**

Run: `scripts/pg-test.sh go test -race ./internal/console/ -run TestStartWake -v`
Expected: FAIL, no `StartWake` exported.

- [ ] **Step 3: Implement `StartWake` in `internal/console/wake.go`**

Build the request-less turn the `PulseContext` way: a `*http.Request` whose context carries a `*session` for `login`. The session's tokens come from the member's newest `console_sessions` row (add `ConsoleSessionForUser(ctx, user) (access, refresh string, expiry time.Time, ok bool, err error)` to the `Sessions` port and `PGStore`); with no live session the wake still runs and token-needing tools refuse. Then do what `chatPost` does after its HTTP prologue: resolve project and `ChatOf` config, set the actor (`via: chat`, decider starts empty), `EnsureChatTask`, `turns.enter` + `turns.slot`, write the user row (`Queued` when position > 0, `StartQueued` after the wait), and `t.run(taskID, "")` with the turn's event sink discarded (the `stream(write, nil)` pattern, `chat.go:136-151`). Return when the turn ends.

- [ ] **Step 4: Run tests to verify they pass**

Run: `scripts/pg-test.sh go test -race ./internal/console/ -run TestStartWake -v`
Expected: PASS.

- [ ] **Step 5: Commit**

`git add internal/console/wake.go internal/console/wake_test.go internal/console/chat.go && git commit -m "main agent: the console wake seam, a turn without a request"` (+ attribution line).

### Task 2: The Waker — cursor, ask class, caps, budget

**Files:**
- Create: `internal/factoryd/wakes.go`, `internal/schema/migrations/factoryd/<ts>_chat_wake.sql` (cursor + marks tables), `internal/factoryd/wakes_test.go`
- Modify: `internal/factoryd/chat.go` (store methods), `cmd/factoryd/main.go` (wire the loop)

**Interfaces:**
- Consumes: `Console.StartWake` (Task 1) behind a local port: `type WakeStarter interface { StartWake(ctx context.Context, project, login string, conversation int64, birth, text string) error }`.
- Produces: `type Waker struct { Store WakeStore; Current func() policy.Version; Start WakeStarter; Pulse func(ctx context.Context, repository string) (workOpen, waitingHuman bool, err error); Now func() time.Time }`, `func (w *Waker) Loop(ctx context.Context, every time.Duration)`, `func (w *Waker) Pass(ctx context.Context) error`. Store methods on `PGStore`: `WakeEvents(ctx, repository string, after int64, limit int) ([]Event, error)` (kinds `question_asked`, `card_moved`, `task_status`, `task_ended`, ordered ascending), `WakeCursor`/`SetWakeCursor(ctx, repository string, id int64)`, `WakeMark(ctx, repository, key string, at time.Time) error` (upsert), `WakeMarkAt(ctx, repository, key string) (time.Time, bool, error)`. Migration creates `chat_wake_cursor(repository text PK, event_id bigint)` (per repository, unlike the Poker's single row) and `chat_wake_state(repository text, key text, at timestamptz, PK (repository, key))`. Keys in use: `turn` (last wake start), `ask:<taskID>:<sha of ask text>`, `card:<taskID>`, `hb:open`, `hb:idle`, `budget:<YYYY-MM>`, `cooldown`.

- [ ] **Step 1: Write the failing tests**

PG-backed (`schematest.DSN`), fake `WakeStarter` recording calls, `Now` pluggable:
`TestWakerWakesOnAskAtAutonomous` (event `question_asked` via=factoryd on an autonomous project → one `StartWake`, birth `wake_ask`, on the venue member's inbox conversation, cursor advanced past the event),
`TestWakerIgnoresChatFiledAsksAndManualProjects` (via=chat ask → row only; autonomous gate: assisted/manual → no wake),
`TestWakerBatchesAsks` (three asks, different cards, one batch → ONE `StartWake` whose text names all three; every `ask:` mark set),
`TestWakerNoSecondAttemptOnRepeatedAsk` (identical ask text again → no new wake),
`TestWakerTurnRateCaps` (second eligible batch within 10 s → no start, cursor unchanged; after `Now+11s` → starts),
`TestWakerBudgetDeathAsksOnce` (chat task spent to cap → one human-lane card via `EscalateToHuman` with the month-cap question, mark `budget:<month>` set, zero starts; raise budget → next Pass wakes),
`TestWakerFailedTurnRetriesColdly` (starter errors → cursor stays, mark `cooldown`; a Pass inside the cooldown does not call the starter; a Pass after it does),
`TestWakerMarksSurviveRestart` (new `Waker` over the same store after a handled batch → no duplicate starts; after an unhandled batch → the cause still starts).

- [ ] **Step 2: Run tests to verify they fail**

Run: `scripts/pg-test.sh go test -race ./internal/factoryd/ -run TestWaker -v`
Expected: FAIL, no `Waker`.

- [ ] **Step 3: Implement the Waker and store methods**

`Pass`: for each project in `Current()`: read `WakeEvents` after the per-repository cursor (seed at max id on first read, the Poker's no-history rule). Split the batch: `via=chat` events are skipped (agent-caused); `question_asked` events are eligible only at autonomy `autonomous`; each eligible ask gets key `ask:<task>:<sha256(ask text)>`. If every eligible ask is already marked, just advance the cursor. Otherwise check the `turn` mark (10 s), the `cooldown` mark (60 s), and the chat task budget (`EnsureChatTask` + spent vs cap): blocked → return without advancing. Ready → venue member by the Poker's recipient rule (`pokeTo`, `pokes.go:196-201`; no recipient → advance and move on), `EnsureInbox` for the conversation, build one wake text naming every ask with its card ref, `Start(ctx, project, login, conv, "wake_ask", text)`, await it. On success: mark every ask key, mark `turn`, advance the cursor to the newest handled event. On error: mark `cooldown`, leave the cursor. Budget dead → `EscalateToHuman` with `monthCapQuestion` once per month key, mark it, advance nothing that needs a turn. `Loop(ctx, 5s)` ticks `Pass`; `main.go` wires it beside the Poker with `Start: consoleHandler`, `Pulse` from `Console.PulseContext` plus the project lookup.

- [ ] **Step 4: Run tests to verify they pass**

Run: `scripts/pg-test.sh go test -race ./internal/factoryd/ -run TestWaker -v`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and commit**

Run: `scripts/pg-test.sh go test -race ./...`
Expected: all packages ok.
`git add ... && git commit -m "main agent: the waker, asks wake a turn at autonomous"`.

### Task 3: The ask attempt — wake text and `attach_analysis`

**Files:**
- Modify: `internal/factoryd/wakes.go` (final wake text), `internal/factoryd/chat.go` (`AttachAnalysis` store method), `internal/console/chat_tools.go` (+`attach_analysis`), `internal/policy/policy.go` (`ChatTools`), `internal/console/access.go`, `internal/console/answer.go` or new `analysis.go` (handler)
- Test: `internal/console/analysis_test.go`, extend `internal/factoryd/wakes_test.go`

**Interfaces:**
- Consumes: `HumanQuestion` and its intake row (`internal/factoryd/question.go:37-51`), the escalation row builder the Poker uses (`pokeOf`, `pokes.go:205-304`).
- Produces: store method `AttachAnalysis(ctx, repository, taskID string, found, recommendation string) error` — updates the task's newest open ask: appends `found` to the question's `Info`, sets `Recommendation` with `Source: "agent"`, and rewrites the ask's chat escalation row content from the enriched question so the inbox row itself carries the analysis. Tool `attach_analysis` with params `task` (required), `found` (required), `recommendation`; `write: true`.

- [ ] **Step 1: Write the failing tests**

`TestAttachAnalysisEnrichesOpenAsk` (rig: card with an open five-part ask; a turn calls `attach_analysis`; assert the intake question's `Info` grew, `Recommendation` set with source `agent`, and the inbox escalation row's content now contains the analysis), `TestAttachAnalysisRefusesAnsweredAsk` (answer the ask first; the tool refuses with a reason naming the state and the fitting action). In `wakes_test.go`: `TestWakeAskTextNamesCardsAndTools` — the wake text lists each ask with its card ref and names `attach_analysis` as the way to record what it found.

- [ ] **Step 2: Run tests to verify they fail**

Run: `scripts/pg-test.sh go test -race ./internal/console/ ./internal/factoryd/ -run 'TestAttachAnalysis|TestWakeAskText' -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Wake text (writing guide, exact copy): `Wake: %d asks wait for a human.` then one line per ask: `#<card>: <ask sentence>`. Then: `Read each card. Settle what your permissions allow. For what stays the human's, record what you found with attach_analysis. An ask already answered is done.` `attach_analysis` validates the ask is still open (else refuse, naming that it is answered), calls `AttachAnalysis`. Register in the three places, next to `escalate` in order.

- [ ] **Step 4: Run tests, then the suite; commit**

Run: `scripts/pg-test.sh go test -race ./...`
Expected: all ok.
`git commit -m "main agent: the attempt records its analysis inside the ask"`.

### Task 4: Wake turns render as one row with an expand

**Files:**
- Modify: `internal/console/static/chat.js` (`factoryHTML`), `internal/console/chat.go` (row JSON carries `birth_kind` if it does not yet)
- Test: the console-lab check with new assertions (find the runner via the design repo's `design/` evidence scripts; if no headless lab exists, a manual check plus a screenshot under `design/rounds/` evidence is the evidence)

**Interfaces:**
- Consumes: row JSON from the chat load endpoint; `birth_kind` values `wake_*` from Task 1.
- Produces: consecutive rows of one wake turn (user row + assistant rows) collapse into a single row titled with the wake's first line, full text behind an expand, the same interaction as a poke row's fold.

- [ ] **Step 1: Add the lab/browser check asserting the collapsed wake row and its expand.**
- [ ] **Step 2: Run it against a worktree build with a seeded wake turn; verify it fails before the JS change.**
- [ ] **Step 3: Implement the collapse in `factoryHTML`: a row whose `birth_kind` starts `wake` opens collapsed; the expand reveals the turn's messages.**
- [ ] **Step 4: Re-run the check; commit** `main agent: a wake turn is one row with an expand`.

### Task 5: Card-bound threads — the door

**Files:**
- Create: `internal/schema/migrations/factoryd/<ts>_chat_card_threads.sql` (`chat_conversations` gains `task_id text`, partial unique index on `(repository, task_id) WHERE task_id IS NOT NULL`)
- Modify: `internal/factoryd/chat.go` (`EnsureCardThread`, `CardThreadFor`), `internal/factoryd/pokes.go` (later asks append to the bound thread), `internal/console/board.go` (`cardThread` reads the binding; drawer data gains the card thread; handler `cardThreadStart`), `internal/console/console.go` (route `POST /cards/{id}/thread`), `internal/console/access.go`, `internal/console/templates/drawer.html` (door control; the worker Chat tab renames to `Session`), `internal/console/static/chat.js` (ask row gains a thread chip when the card has one)
- Test: `internal/factoryd/card_thread_test.go`, `internal/console/card_door_test.go`

**Interfaces:**
- Consumes: `ensureInbox`'s numbering scheme (`factoryd/chat.go:427-446`), the five-part question record, `chat.js` `[data-open-thread]` handling (`chat.js:611-615`).
- Produces: `EnsureCardThread(ctx, repository, login, taskID string) (int64, error)` (creates the bound conversation titled `#<taskID>` on first call for the card, any later caller gets the same conversation), `CardThreadFor(ctx, repository, taskID string) (login string, conversation int64, ok bool, err error)`, route `POST /cards/{id}/thread` returning the conversation number; the first message is written by code from the ask record (role user, kind `escalation`, `Choices` and `TaskID` set so answer buttons render and settle through `chatAnswer`), no model call.

- [ ] **Step 1: Write the failing tests**

Factoryd (PG): `TestEnsureCardThreadIsOnePerCard` (two calls, different logins → same conversation; `task_id` set), `TestPokerAppendsLaterAsksToCardThread` (a card with a bound thread gets a second `question_asked` → the row lands in the inbox AND the card thread). Console (rig): `TestCardDoorOpensBoundThread` (card with open ask → `POST /cards/{id}/thread` → 200 with a conversation number; the thread's first row is the five parts with choices; answering through `/chat/answer` on that thread settles the ask), `TestDrawerShowsDoorAndSessionTab` (drawer HTML contains the door control and the tab named `Session`, not `Chat`).

- [ ] **Step 2: Run to verify they fail.** `scripts/pg-test.sh go test -race ./internal/factoryd/ ./internal/console/ -run 'CardThread|CardDoor|DrawerShows' -v`
- [ ] **Step 3: Implement** the migration, store methods, the Poker append (inside `Poke`'s transaction: when the row is an escalation and `CardThreadFor` hits, `insertChatMessage` into the card thread too), `cardThread` binding-first (event scan stays for cards filed from a thread), the route and handler, the drawer template change, the ask-row thread chip.
- [ ] **Step 4: Run the suite; commit** `main agent: every needs-you card gets a thread, the drawer names the door`.

### Task 6: Threads visible across the project, `chat_search`

**Files:**
- Modify: `internal/console/notes.go` (`activeThreads` goes project-wide with the owner named per thread), `internal/console/chat_tools.go` (+`chat_search`), `internal/policy/policy.go`, `internal/console/access.go`, `internal/console/chat.go`/`threads.go` (conversation read resolves across logins; the conversations listing groups own and others'), `internal/console/static/chat.js` (thread switcher shows others' threads with owner)
- Create: `internal/console/chat_search.go`
- Test: `internal/console/chat_search_test.go`

**Interfaces:**
- Consumes: the `session_search` recipe (`internal/console/chat_sessions.go:594-700`: query 2-200 runes, quoted regex, 20 hits, 100-byte excerpts), the `Chat` port's `Conversations`/`ChatMessages`.
- Produces: tool `chat_search` (params `query` required, `thread` optional) returning lines `thread %d (%s's, %s): row %d %s: <excerpt>`; `active_threads` lines gain the owner when the thread is another member's; the chat page opens any project conversation read/write with the owner named.

- [ ] **Step 1: Write the failing tests**

`TestChatSearchFindsAcrossMembers` (two members' threads; searching from member A's turn finds a hit in B's thread with owner named and excerpt capped at 100 bytes; 21st hit counted but not shown), `TestActiveThreadsListsProjectWide` (B's non-inbox thread appears in A's `active_threads` output with B named), `TestConversationReadAcrossMembers` (A opens B's conversation by number → rows render, owner named; A's turn on it records actor A).

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the search (scan live rows per conversation, newest conversations first, stop at 20 hits), the visibility change, the UI grouping.
- [ ] **Step 4: Suite; commit** `main agent: threads are project-visible and searchable`.

### Task 7: Timers, watches, heartbeat

**Files:**
- Create: `internal/schema/migrations/factoryd/<ts>_chat_timers.sql` (`chat_watches(id bigserial, repository, login, conversation bigint, task_id, created_at, UNIQUE(repository, login, task_id))`, `chat_timers(id bigserial, repository, login, conversation bigint, due_at timestamptz, note text, task_id text NULL, created_at)`), `internal/factoryd/timers_test.go`
- Modify: `internal/factoryd/chat.go` (watch/timer CRUD + counts), `internal/console/chat_tools.go` (+`watch_card`, `unwatch_card`, `set_timer`), `internal/policy/policy.go`, `internal/console/access.go`, `internal/factoryd/wakes.go` (watched-card class at assisted+, due timers, heartbeat, dies-with-card cleanup, per-project count cap), `cmd/factoryd/main.go` (`Pulse` wiring if not already)
- Test: as above plus `internal/factoryd/wakes_test.go` extensions

**Interfaces:**
- Consumes: `Pulse` port from Task 2 (`workOpen`, `waitingHuman`).
- Produces: tools `watch_card(task)` / `unwatch_card(task)` (thread-stored subscriptions), `set_timer(minutes, note, task optional)` (one-shot row, gone after firing; a wake turn calling it again is the rearm). Waker classes: watched card moves (`card_moved`/`task_status` on a watched task, level assisted+, turn on the watch's conversation, `card:<task>` mark enforces one wake per card per minute, same-card events in one batch combine); timer due (poll `DueTimers`, never combined, turn on the timer's conversation with the note, delete after its turn); heartbeat (assisted+; `workOpen` → one turn an hour on the inbox, else one a day; keys `hb:open`/`hb:idle`); cleanup (`task_ended` on a watched/timer task deletes its watches and timers). Per-project cap `wakeTimersMax = 16` across watches plus timers; the adding tool refuses with the count when exceeded. None of the three tools appear in a confirm list.

- [ ] **Step 1: Write the failing tests**

`TestWatchedCardWakesAtAssistedOnItsThread` (watch on conversation X → `card_moved` → one wake on X at assisted; manual → none; second move inside a minute → none; after a minute → wake), `TestTimerFiresOnceOnItsThread` (`set_timer` row due → wake with the note on its conversation, row gone; a turn calling `set_timer` again creates the rearm), `TestWatchesDieWithTheCard` (`task_ended` → watch and bound timers deleted), `TestHeartbeatOpenHourlyIdleDaily` (`workOpen=true` → wake, mark `hb:open`; `Now+30min` → none; `Now+61min` → wake. `workOpen=false` → wake once, `Now+2h` → none, `Now+25h` → wake), `TestTimerCapRefuses` (17th add refused naming the cap).

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the migration, CRUD, tools, the three classes in `Pass` (timers first — they never combine — then watched cards, then asks), the cleanup, the cap.
- [ ] **Step 4: Suite; commit** `main agent: watches, one-shot timers with rearm, and the heartbeat`.

### Task 8: Docs, level review, ledger (design repo)

**Files:**
- Modify: `/home/womb/repos/ai-software-factory/docs/architecture.md` sections 5.6 and 5.7, rewritten against the concept note.
- Create: `/home/womb/repos/ai-software-factory/docs/level-review-2026-10-17.md` — one table: each level manual to full auto, what it guards today, what wakes change, a recommendation. Sebastian decides; nothing here changes code.
- Modify: the SDD ledger progress entry and this plan's checkboxes.

- [ ] **Step 1: Rewrite 5.6/5.7 to the built reality** (wakes, attempts, card threads, visibility, timers), following the writing guide.
- [ ] **Step 2: Write the level review proposal** from the shipped code: name the confirm lists each level produces, where a wake turn hits them, and what the review should decide.
- [ ] **Step 3: Commit and push both repos** (design: `origin` and `forgejo`; code: `origin` and `github`).

---

## Execution notes

- Work in a git worktree of the code repo (`superpowers:using-git-worktrees`), branch from `main`, merge back and push `origin` + `github`.
- The heartbeat's `workOpen` predicate: `Console.PulseContext` returns the project snapshot; "work open" is the snapshot's count of cards in working lanes (exact field pinned during Task 7 from the snapshot struct in `internal/console/pulse.go`).
- The venue member is the Poker's recipient (`pokeTo`, `internal/factoryd/pokes.go:196-201`); factor it if reuse needs an export, do not duplicate the rule.
- Out of scope, on record: the inbox volume filter (contingency, not built), messengers inbound (outbox-only ruling stands), any roadmap filing (Sebastian's to curate).
