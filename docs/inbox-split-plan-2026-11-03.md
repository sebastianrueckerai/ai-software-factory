# The inbox split: the agent's thread, the inbox read, merge wakes and the same-cause verdict

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Written 2026-11-03. Status: Sebastian's OK the same day, in the chat that
designed it. The code tasks run in the code repository on the branch
`inbox-split`. The docs task runs here.

**Goal:** A human plans in several threads at once while the inbox stays the
agent's own thread, every card that would reach a human wakes the agent
first, and two alerts with one cause make one card.

**Architecture:** The console's chat already has threads per project, an
inbox per member where the Waker runs, and tools for every console read.
This plan changes four things inside that shape: the inbox refuses typed
messages and keeps its buttons, every thread gets an `inbox` read tool,
merge approval rows join the Waker's kinds, and `alert_verdict` gains the
verdict `same_cause`. Timers and watches stay as built.

**Tech Stack:** Go (factoryd, console), Postgres migrations under
`internal/schema/migrations/factoryd`, the console's `chat.js` and
`chat.html`. Tests: `go test -race -p 1 ./...` with
`FACTORYD_TEST_DATABASE_URL` and `GATEWAY_TEST_DATABASE_URL` set.

**Spec:** this file's section "The decisions". The design conversation of
2026-11-03 is its source, and [architecture.md](architecture.md) section 5.7
describes the chat it changes.

## Global Constraints

- Copy says human, never member, in every refusal, hint and tool sentence.
- A tool's about sentence is 100 characters or fewer, and each argument
  phrase 60 or fewer (`TestChatToolSentences`, `internal/console/chat_test.go:1927`).
- Every refusal names the state and the fitting action.
- The `tools` list in `internal/console/chat_tools.go` keeps the order of
  `policy.ChatTools` (`internal/policy/policy.go:138-146`).
- No comment narrates a change. A comment says only what the code cannot.
- Tests derive their expectations by hand. Never bend an assertion to pass.
- No ruling number and no ledger path in a tracked file or a commit message.
  The pre-commit hook refuses them.
- One commit per task, on the branch `inbox-split` of the code repository,
  message in the repository's style (`console: …`, `factoryd: …`), ending with
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Run the tests with the Postgres container: `PW=$(docker inspect ladder-pg --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p')`, then export `FACTORYD_TEST_DATABASE_URL="postgres://postgres:${PW}@127.0.0.1:55445/postgres?sslmode=disable"` and `GATEWAY_TEST_DATABASE_URL` the same. Never print the password.

## The problem in one view

Sebastian wants to plan in two threads at once and talk about a small card
in a third. The chat allows that today: threads are project-wide, each
thread runs one turn at a time, and different threads run in parallel.
Three things get in the way.

1. **The inbox is both the human's default thread and the Waker's venue.**
   A human who plans in the inbox makes every wake turn queue behind the
   planning turn, and the next typed message queues behind the wake turn.
   The inbox becomes current on one click in the switcher
   (`internal/console/chat.go:338`, `OpenConversation`), and from then on
   every reload lands there with the input box.
2. **A merge request that misses the auto conditions reaches the human
   with no agent turn.** It writes an approval row and the event
   `approval_requested`, which the Poker reads (`internal/factoryd/pokes.go:48`)
   and the Waker does not (`internal/factoryd/wakes.go:101`). At full auto
   the agent may approve without a confirm, but nothing wakes it to look.
3. **Two alerts with one cause make two cards, two asks and two threads.**
   `alert_verdict` knows real and noise only (`internal/console/chat_tools.go:1399`).

The threads also lack a read of the inbox: `active_threads` leaves it out
on purpose (`internal/console/notes.go:98`), and `chat_search` finds rows by
word only.

## The decisions

Sebastian decided these on 2026-11-03.

1. **The inbox is the agent's thread.** It refuses a typed message from
   every door: the page, the MCP tool `chat_send`, `/compact`, the `owner`
   field and a card answer in words. Its rows keep their buttons: the
   five-part ask, the inline answer, a proposal's Do it, undo, fund, the
   card door and every choice button. The page shows no input box on the
   inbox and offers a thread of the human's own instead. Reading the inbox
   never makes it current. A human whose inbox is current lands on a thread
   of their own.
2. **Every thread reads the inbox.** A tool `inbox {query?, before?}`
   answers one page of the inbox's rows, open asks first, then the newest
   first, filtered by a word and paged by a row id. It reads the turn
   member's inbox when that member is a poke recipient, else the venue
   member's, and names whose inbox it read.
3. **Merge approval rows wake the agent.** At autonomous and full auto,
   `approval_requested` rows of kind `merge` join the asks in one wake turn.
   At merge rule `auto`, when the woken login is an approver, the turn
   approves, denies, or leaves the row to a human with its analysis. At
   merge rule `human`, or for a login that is no approver, the turn attaches
   its analysis only, and the code refuses `approve_merge` and `deny_merge`
   from a wake turn there. An agent never approves a factory pull request
   that carries GitHub commits. Plan and criteria rows only move the cursor.
4. **A third alert verdict, `same_cause`.** It names the first card. The
   second card closes with the comment "Same cause as #N." and its alert row
   records the link. It applies to escalation alerts, the ones
   `alert_verdict` judges today.
5. **Timers and watches die with their thread**, as built. Images in the
   chat are a separate item, not in this plan.

## Review Focus

1. A writer types into another member's inbox through the `owner` field.
   Expected: the same refusal as for their own inbox. Pinned in Task 1.
2. A wake turn's `ask` without choices lands in an inbox nobody types in.
   Expected: the tool refuses and names choices or `attach_analysis`.
   Pinned in Task 1.
3. A human approves a merge while the wake turn reads it. Expected: the
   turn's `approve_merge` answers 409 and the turn attaches nothing to a
   settled row. Pinned in Task 6.
4. A `same_cause` verdict names the alert's own card. Expected: 400, the
   card stays open. Pinned in Task 7.
5. The inbox tool is called on a project where the turn member is no poke
   recipient and the venue member has no inbox row yet. Expected: an
   answer that says no inbox exists yet, and no row created. Pinned in
   Task 4.

---

### Task 1: The inbox refuses typed messages, and its buttons keep working

**Files:**
- Modify: `internal/console/chat.go:733-859` (`say`)
- Modify: `internal/console/wake.go:93-154` (`answerInChatTurn`)
- Modify: `internal/console/answer.go:29-100` (`chatAnswer`), `:105-200` (`chatAskPress`), `:252` (`askMember`)
- Modify: `internal/console/mcp.go:131` (the `chat_send` description), `mcpThread`
- Modify: `internal/console/chat_tools.go:1589`, `:2079` (wording)
- Test: `internal/console/chat_test.go`, `internal/console/answer_test.go`, `internal/console/mcp_test.go`, `internal/console/wake_test.go`, `internal/console/chat_title_test.go:66-84`, `internal/console/chat_criteria_test.go:171-210`, `internal/console/lab_test.go`

**Interfaces:**
- Produces: `const inboxRefusal = "The inbox is the factory's thread: answer with its buttons, and write in a thread of your own."` in `internal/console/chat.go`, answered with status 409 by `say` and as the tool error by `chat_send`.
- Produces: `mcpThread.Inbox bool` with JSON name `inbox`.
- Produces: `const inboxAskRefusal = "The inbox takes buttons only: give choices, or record what you found with attach_analysis."`

- [ ] **Step 1: Write the failing tests**

In `internal/console/chat_test.go`:
- `TestChatInboxRefusesATypedMessage`: a member posts to their own inbox through `chatPost` and gets 409 with `inboxRefusal` in the body. A writer posts to another member's inbox through the `owner` field and gets the same. No `chat_messages` row is written in either case.
- `TestCardAnswerInWordsLandsInAnOwnThread`: with the member's inbox current, `doAnswerValue` with words lands the words in a non-inbox thread, which is current afterwards.

In `internal/console/mcp_test.go`:
- `TestMCPChatSendRefusesTheInbox`: `chat_send {conversation: <inbox number>}` answers an error containing `inboxRefusal`. `chat_threads` lists the inbox with `inbox: true`.

In `internal/console/answer_test.go`:
- `TestChatAnswerPressesAnUnboundAskInTheInbox`: an `ask` row with choices and no proposal in the inbox, pressed through `/chat/answer`, saves the choice row and runs the turn.
- `TestChatAnswerPressesAPokeChoiceInTheInbox`: a poke row with the choices Retry and Leave it, pressed through `/chat/answer`, saves the choice row and runs the turn.

In `internal/console/wake_test.go`:
- `TestInboxAskNeedsChoices`: in a turn whose thread is the inbox, whatever started it, `ask` without choices answers `inboxAskRefusal` and writes no ask row. A wake in an ordinary thread keeps the old choices refusal. With choices it writes the row as today.

Move the two existing tests: `TestChatNamesNoInboxOrCardThread` keeps its card-thread half and expects 409 for the inbox half. `TestChatRefusesTheWakeOverAnOlderHumanLine` seeds the older line with `AddChatMessage` instead of `chatPost`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `go test -race -run 'TestChatInboxRefusesATypedMessage|TestCardAnswerInWordsLandsInAnOwnThread|TestMCPChatSendRefusesTheInbox|TestChatAnswerPresses|TestInboxAskNeedsChoices' ./internal/console/`
Expected: FAIL, the refusals and the new paths do not exist.

- [ ] **Step 3: Implement**

- In `say`, before `EnsureChatTask` (`chat.go:737`): read the thread, and when `th.Inbox` refuse 409 with `inboxRefusal`. This one guard covers `chatPost`, `chat_send`, `/compact` and the `owner` path.
- In `answerInChatTurn` (`wake.go:104`): when the current thread is the inbox, call `NewConversation` and use the thread it returns.
- In `chatAnswer` (`answer.go:47-49`): widen the lookup from `Proposal != ""` to any `MessageAsk` row and any `MessagePoke` row with choices, and route them to `chatAskPress`. An empty token takes the existing `ErrNoProposal` branch, which saves the choice row and runs the turn.
- In `askMember` (`answer.go:252`): when the turn's thread is the inbox and the call carries no choices, refuse with `inboxAskRefusal`.
- `mcpThread` gains `Inbox bool \`json:"inbox"\``. The `chat_send` description says that the inbox refuses a message.
- Reword `chat_tools.go:2079` to "a choice in their inbox or a reply in a thread of their own answers it" and `:1589` so a wake turn is told to give choices.

- [ ] **Step 4: Run the console package**

Run: `go test -race ./internal/console/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A internal/console
git commit -m "console: the inbox refuses a typed message and keeps its buttons"
```

### Task 2: Reading the inbox never makes it current

**Files:**
- Modify: `internal/console/chat.go:338` (`chatGet`)
- Modify: `internal/console/threads.go:348-389` (`thread`)
- Modify: `internal/factoryd/chat.go:350-366` (`OpenConversation`)
- Modify: `internal/console/chat_test.go:586`, `:269`, `~240` (`fakeChat`)
- Test: `internal/console/threads_test.go`, `internal/factoryd/threads_test.go:160-200`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `OpenConversation` refuses the inbox with `ErrNotFound` and leaves the current thread as it was.

- [ ] **Step 1: Write the failing tests**

- `internal/console/threads_test.go`: `TestChatGetOfTheInboxLeavesTheCurrentThread`: a GET of the inbox with messages answers 200 and the member's current thread is unchanged.
- `internal/console/threads_test.go`: `TestChatLandsOffAnInboxThatIsCurrent`: with the inbox marked current in the store, a GET with no conversation answers a non-inbox thread, which is current afterwards, and no second empty thread exists after a second GET.
- `internal/factoryd/threads_test.go`: `TestOpenConversationSkipsTheInbox` (Postgres): `OpenConversation` on the inbox returns `ErrNotFound` and the current flag stays where it was.

- [ ] **Step 2: Run the tests to see them fail**

Run: `go test -race -run 'TestChatGetOfTheInboxLeavesTheCurrentThread|TestChatLandsOffAnInboxThatIsCurrent' ./internal/console/ && go test -race -run TestOpenConversationSkipsTheInbox ./internal/factoryd/`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `chat.go:338`: add `&& !th.Inbox` to the condition that calls `OpenConversation`.
- `factoryd/chat.go` second UPDATE in `OpenConversation`: add `AND NOT inbox`.
- `threads.go` `thread`: when no conversation is named and the current thread is the inbox, call `NewConversation` and continue with its thread.
- `fakeChat` mirrors: `OpenConversation` refuses the inbox, `startNew` reuses an empty non-inbox current thread the way the real store does.

- [ ] **Step 4: Run both packages**

Run: `go test -race ./internal/console/ ./internal/factoryd/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A internal/console internal/factoryd
git commit -m "console: a read of the inbox never makes it the current thread"
```

### Task 3: The inbox page shows buttons and no input box

**Files:**
- Modify: `internal/console/templates/chat.html:13-26`
- Modify: `internal/console/static/console.css` (near `:1254`, `:1167`, `:1200`)
- Modify: `internal/console/static/chat.js` (`load` ~1438, `headHTML` 447-458, `answerHTML` 470, `factoryHTML` ~113, the choice click handlers ~1346 and ~1614, the pool control 550-565, `send` 995, the "/" key ~1323, row-click focus ~1611, paste and drop 720-737)
- Test: `internal/console/chat_panel_test.go` (`~55`, `271`, `280-281`, `~295`), `internal/console/lab_test.go`

**Interfaces:**
- Consumes: Task 1's `/chat/answer` path for every choice button.
- Produces: the inbox note's copy: "The factory's thread. Answer with its buttons, and write in a thread of your own." with a control that opens a thread of the human's own.

- [ ] **Step 1: Write the failing tests**

In `internal/console/chat_panel_test.go`: the inbox head renders the note above, a poke row with choices renders `data-answer` buttons and no `data-choice`, the answer row of an inbox ask carries no "or in your words below", and the composer template holds the inbox note element. Update `lab_test.go` scenes that set the inbox current to expect the note.

- [ ] **Step 2: Run the tests to see them fail**

Run: `go test -race -run 'TestChatPanel|TestLab' ./internal/console/`
Expected: FAIL on the new markup.

- [ ] **Step 3: Implement**

- `chat.html`: the inbox note next to `.arch-note`, with a button that clicks `#chat-new`.
- `console.css`: `.chat-form.inbox` hides `.prompt`, the chips, `#chat-images` and `#chat-docs`.
- `chat.js`: a flag `inboxOpen = !!openThread.inbox` in `load`, separate from `readOnly`. In the inbox: `send`, the "/" key, row-click focus, paste and drop do nothing, the pool control is hidden, `answerHTML` drops "or in your words below", `headHTML` says "the factory's thread: it speaks here uninvited, you answer with its buttons". Every choice button in `factoryHTML` and `answerHTML` carries `data-answer` and posts to `/chat/answer`.

- [ ] **Step 4: Run the console package**

Run: `go test -race ./internal/console/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A internal/console
git commit -m "console: the inbox page offers buttons and a thread of your own, no input box"
```

### Task 4: The `inbox` read tool

**Files:**
- Create: `internal/console/inbox.go`
- Modify: `internal/policy/policy.go:146` (`ChatTools`)
- Modify: `internal/console/chat_tools.go` (`toolInput`, the row after `chat_search` at `:1859`, `toolNotes` `:2069`)
- Modify: `internal/console/access.go:165`
- Modify: `internal/console/chat.go:516-574` (`settleRows` takes `login, conv`)
- Test: `internal/console/chat_inbox_test.go` (new), `internal/console/chat_test.go:1993-2010`, `:4288`

**Interfaces:**
- Produces: `func (t *turn) inboxText(in toolInput) (string, error)` in `inbox.go`.
- Produces: `toolInput.Before int64` with JSON name `before`.
- Produces: tool row `inbox`, title "Read the inbox", about "The factory's thread: open asks first, then the newest rows. query filters, before pages." Arguments: `query` "a word to filter by, 2 to 200 characters", `before` "a row id: rows older than it".
- Produces: `settleRows(ctx, msgs, login string, conv int64, seenUpto int64, stop ...)` with the same body as today, reading `LiveAskBinds` for the given thread.

- [ ] **Step 1: Write the failing tests**

In `internal/console/chat_inbox_test.go`, in the style of `chat_search_test.go:34`:
- `TestChatInboxReadsTheVenueMembersInbox`: project with notify list `[alice]`, turn by bob (no recipient): the answer's first line names alice's inbox. Turn by alice: her own.
- `TestChatInboxNamesNoInboxYet`: no inbox row exists for the venue member: the answer says so and `Conversations` shows no new row.
- `TestChatInboxListsOpenAsksFirst`: three rows, an older open ask and two newer pokes: the ask comes first, then the pokes newest first.
- `TestChatInboxFiltersByQuery`: only rows holding the word, case-insensitive.
- `TestChatInboxPagesWithBefore`: 25 rows: page one holds 20 and ends with `before=<id> reads on.`, the second call with that id holds the other 5 and ends with `That is the whole window.`
- `TestChatInboxNamesSettledReasons`: a settled ask row shows its reason line as the page does.
- `TestChatOffersTheMembersTools` lists `inbox` for the controller and for bob.

- [ ] **Step 2: Run the tests to see them fail**

Run: `go test -race -run 'TestChatInbox|TestChatOffersTheMembersTools' ./internal/console/`
Expected: FAIL, the tool does not exist.

- [ ] **Step 3: Implement**

- `policy.ChatTools`: `"inbox"` after `"chat_search"`. The `tools` list in the same place.
- `inbox.go`: resolve the login with `t.p.NotifyOrApprovers(approvers)` (own inbox when `t.a.s.user` is in the list, else the first), find the inbox with `Conversations` and its `Inbox` flag, create nothing. Read `ChatMessages(…, chatSearchRead)`, settle with `settleRows(login, conv)`, filter by `query` as `chat_search` does, keep rows with `id < before` when given, order open asks first then newest first, 20 rows a page. A row: `<id> <time> <kind> <#card>: <excerpt of 100 bytes> (open | <reason>)`. First line `The inbox of <login> on <project>:`. Last line `before=<id> reads on.` or `That is the whole window.`
- `access.go`: `"inbox": rMember`.
- `toolNotes`: one line, "inbox reads the factory's thread: what woke the agent and what waits on a human."

- [ ] **Step 4: Run the package and the policy package**

Run: `go test -race ./internal/console/ ./internal/policy/`
Expected: PASS, including the tool order and schema tests.

- [ ] **Step 5: Commit**

```bash
git add -A internal/console internal/policy
git commit -m "console: the inbox read tool, open asks first, by word and by page"
```

### Task 5: Merge approval rows wake the agent

**Files:**
- Modify: `internal/factoryd/wakes.go:101` (`wakeKinds`), `:218-260` (the event loop), `:301-321` (the ask turn), `:470-491` (`askText`), `:494` (`askKey`)
- Test: `internal/factoryd/wakes_test.go`

**Interfaces:**
- Consumes: `EventApprovalRequested` with `Detail {approval, kind, pr, class, factory, red_checks}` (`gates.go:1723-1737`), `ApprovalMerge` (`store.go:805`).
- Produces: `askText(asks []wakeAsk, approver bool, mergeRule string) string`, where a merge ask renders as `#N: merge of PR #X, <class> risk` with `, checks red` appended when `red_checks` is non-empty.
- Produces: the sentence appended once when the batch holds a merge row. At merge rule `auto` and `approver`: ` A merge you find safe takes approve_merge, a wrong one deny_merge, and the rest goes to a human with attach_analysis.` Otherwise: ` A human approves merges here: record what you found with attach_analysis.`
- Produces: `askKey` for an approval event: `approval:<task>:<Detail["approval"]>`.

- [ ] **Step 1: Write the failing tests**

In `internal/factoryd/wakes_test.go`, beside the existing gate tests at 162-275:
- `TestWakeMergeRowWakesAtAutonomous`: an `approval_requested` event of kind merge on a project with `Autonomy autonomous` and merge rule `human` starts one turn on the venue inbox with birth kind `wake_ask`, whose text holds the merge line and the human sentence.
- `TestWakeMergeRowWakesAtFullAuto`: the same with merge rule `auto` and the woken login an approver: the text holds the approve sentence.
- `TestWakeMergeRowSleepsBelowAutonomous`: at assisted and manual, the event only moves the cursor.
- `TestWakePlanAndCriteriaRowsOnlyMoveTheCursor`: approval rows of kind `plan` and `criteria` start no turn, and the cursor passes them.
- `TestWakeTwoMergeRowsOfOneCardWakeOnceEach`: two approval ids on one task make two keys and two turns across two passes.
- `TestWakeMergeAndAskBatchInOneTurn`: an ask and a merge row in one pass make one turn naming both.

The existing text tests at 550, 581 and 697 stay as they are.

- [ ] **Step 2: Run the tests to see them fail**

Run: `go test -race -run 'TestWakeMerge|TestWakePlanAndCriteria' ./internal/factoryd/`
Expected: FAIL, no turn starts.

- [ ] **Step 3: Implement**

- `wakeKinds` gains `EventApprovalRequested`.
- The event loop: an `approval_requested` event with `Detail["kind"] == ApprovalMerge` on a project at `AutonomyAutonomous` joins `pending` under its key, unless the mark says it had its turn. Other approval kinds fall through to the cursor-only path.
- `askKey` keys approval events as above.
- `askText` takes `mergeRule` and renders merge asks and the sentence. The call at `:309` passes `p.MergeRule`.

- [ ] **Step 4: Run the package**

Run: `go test -race ./internal/factoryd/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A internal/factoryd
git commit -m "factoryd: a merge approval row wakes the agent like an ask"
```

### Task 6: The merge wake's pins and reads in the console

**Files:**
- Modify: `internal/console/chat.go:1312` (`call`)
- Modify: `internal/console/actions.go:2028` (`doApprove`)
- Modify: `internal/console/chat_reads.go:130-138` (the card's merge line)
- Test: `internal/console/wake_test.go`, `internal/console/chat_reads_test.go`, `internal/factoryd/attach_analysis_test.go:347-410`

**Interfaces:**
- Consumes: Task 5's wake text. `MergeSpec` (`gates.go:313`): `Review.StrictImprovement`, `Audit`, `RedChecks`, `HeadSHA`, `WhyHuman`, and the factory flag of the row.
- Produces: `const wakeMergeRefusal = "A human approves merges on merge rule human: record what you found with attach_analysis."`
- Produces: `const factoryMergeRefusal = "A human approves a factory pull request that carries GitHub commits."`
- Produces: the card's merge line gains `review <verdict>, strict improvement <yes|no>, head <7 chars>` and `checks red: <names>` when any.

- [ ] **Step 1: Write the failing tests**

- `internal/console/wake_test.go`: `TestWakeApproveMergeRefusedOnMergeRuleHuman`: in a wake turn at merge rule human, `approve_merge` and `deny_merge` answer `wakeMergeRefusal` and write no proposal row. At merge rule auto, `approve_merge` runs as today (the test at `:288` stays).
- `internal/console/wake_test.go`: `TestWakeApproveMergeAfterAHumanApprovedAnswers409`: the human approved first, the wake's `approve_merge` answers 409 and `attach_analysis` answers `AskSettledError`.
- `internal/console/actions_test.go`: `TestAgentCannotApproveAFactoryPullRequest`: `doApprove` by `ChatUser` on a row with the factory flag answers `factoryMergeRefusal` at merge rule auto. A human's approval passes.
- `internal/console/chat_reads_test.go`: `TestCardMergeLineNamesTheReviewAndHead`: the merge line holds the review verdict, the strict-improvement word, the head's first 7 characters and the red checks.
- `internal/factoryd/attach_analysis_test.go`: `TestAttachAnalysisReachesAMergeRow`: an approval row of kind merge takes the analysis and the inbox row gains the Analysis line.

- [ ] **Step 2: Run the tests to see them fail**

Run: `go test -race -run 'TestWakeApproveMerge|TestAgentCannotApproveAFactoryPullRequest|TestCardMergeLineNamesTheReviewAndHead' ./internal/console/ && go test -race -run TestAttachAnalysisReachesAMergeRow ./internal/factoryd/`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `call` (`chat.go:1312`): when `a.wake`, the tool is `approve_merge` or `deny_merge`, and the merge rule is not `auto`, answer `wakeMergeRefusal` before any proposal row.
- `doApprove`: when the approver is `ChatUser` and the row's spec marks a factory pull request, refuse with `factoryMergeRefusal`.
- The card's merge line reads the spec's review verdict, strict improvement, head and red checks.

- [ ] **Step 4: Run both packages**

Run: `go test -race ./internal/console/ ./internal/factoryd/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A internal/console internal/factoryd
git commit -m "console: a wake attaches analysis on merge rule human, and the card names the review and head"
```

### Task 7: The `same_cause` verdict

**Files:**
- Modify: `internal/factoryd/alerts.go:52-58`, `:282-287` (`SetAlertVerdict` gains `detail`)
- Create: `internal/schema/migrations/factoryd/<UTC stamp after 20261114090000>_alert_same_cause.sql`
- Modify: `internal/factoryd/meters.go:124`
- Modify: `internal/console/ports.go:98` and the fakes at `internal/console/console_test.go:1002`, `acceptance/costs_date_window_test.go:505`
- Modify: `internal/console/chat_tools.go:1399-1406`, `:597-607`, `toolNotes`
- Modify: `internal/console/chat_page_tools.go:415-447` (`doAlertVerdict`), `:74-81` (`alertsText`)
- Modify: `docs/manual/console.md:131-133`, `docs/manual/operations.md:293-296`
- Test: `internal/console/console_test.go:3382`, `internal/console/chat_pages_parity_test.go:233-293`, `internal/factoryd/console_store_test.go:601-611`, `internal/factoryd/meters_test.go:84`, `internal/factoryd/activities_test.go:2579`, `internal/schema/kinds_test.go`

**Interfaces:**
- Produces: `VerdictSameCause = "same_cause"` in `internal/factoryd/alerts.go`.
- Produces: `SetAlertVerdict(ctx, id int64, verdict, by string, detail map[string]any) error`, one UPDATE that sets the verdict and merges `detail`.
- Produces: the link stored as `detail {"same_as": "<first task id>"}` and in the `alert_verdict` event's detail.
- Produces: tool `alert_verdict {id, verdict: real|noise|same_cause, card?}`, about "Judge an open escalation alert real, noise, or the same cause as a card, which closes this one."
- Produces: the close note `Same cause as #N.`

- [ ] **Step 1: Write the failing tests**

- `internal/console/console_test.go`: `TestAlertVerdictSameCauseClosesTheSecondCard`: `same_cause` with `card: "#N"` records the verdict with `same_as`, closes the alert's card with the comment `Same cause as #N.`, records `alert_verdict` with `same_as` and `card_closed`. `TestAlertVerdictSameCauseNeedsACard`: without a card, 400 and nothing recorded. `TestAlertVerdictSameCauseRefusesTheOwnCard`: the alert's own card, 400. `TestAlertVerdictRealWithACardIs400`.
- `internal/console/chat_pages_parity_test.go`: the proposal text for `same_cause` names the first card.
- `internal/factoryd/console_store_test.go`: `SetAlertVerdict` with detail merges it and keeps the kind and null-verdict guard.
- `internal/factoryd/activities_test.go`: `TestSameCauseVerdictSurvivesTheTasksEnd`: a `same_cause` row stays `same_cause` after the task ends.
- `internal/factoryd/meters_test.go:84`: the zero list holds `same_cause`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `go test -race -run 'TestAlertVerdictSameCause|TestAlertVerdictRealWithACardIs400|TestSameCauseVerdictSurvivesTheTasksEnd' ./internal/console/ ./internal/factoryd/ && go test -race ./internal/schema/`
Expected: FAIL. `TestKindChecksAccept` fails until the migration lands.

- [ ] **Step 3: Implement**

- The constant, the migration that drops and re-adds `alerts_verdict_check` with `same_cause`, the meters list.
- `SetAlertVerdict` with `detail = detail || $5::jsonb`. Update the port, the PGStore and both fakes.
- The tool row: the enum gains `same_cause`, the optional argument `card` maps to `toolInput.Card`.
- `doAlertVerdict(ctx, a, id, verdict, card)`: `same_cause` without a card 400, a card `cardIn` cannot find 404, the alert's own card 400, `real` or `noise` with a card 400. Then set the verdict with `{"same_as": id}`, check the close rule with `c.admit(ctx, accessTable["close"], a, repo, "task "+id)`, and call `doClose(ctx, a, al.TaskID, "Same cause as #N.")`. When the close fails, the verdict stays and the answer names the failure.
- The proposal description appends `same cause as #N <id> "<title>"` and says the second card closes.
- `alertsText` adds `, same cause as <task id>` to a judged line.
- `toolNotes`: one line. The two manual pages name the third verdict.

- [ ] **Step 4: Run the suite**

Run: `go test -race -p 1 ./...` with the database variables set.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "alerts: the verdict same_cause closes the second card and points at the first"
```

### Task 8: The docs follow the code

Done by the session that runs this plan, in this repository, after the code
is on `main`.

**Files:**
- Modify: `docs/architecture.md` (the wake table near `:3330`, the threads paragraph near `:3372`, the tools table near `:2768`, the alert kinds table near `:5302`, the glossary)
- Modify: `docs/roadmap.md` (a new item under section 7, and item 331's note)
- Modify: `docs/agent-context-map.md` by its own recipe
- Run: `node launch/site/evidence.js` after `github/main` of the code repository moves

- [ ] **Step 1: Describe the four changes in `architecture.md`** in the style of the surrounding text, with the decision's date.
- [ ] **Step 2: Add the roadmap item** and note the inbox split in item 331.
- [ ] **Step 3: Regenerate the context map** and run the evidence check.
- [ ] **Step 4: Commit on `master` and push.**
