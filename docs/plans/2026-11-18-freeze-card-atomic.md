# The freeze card changes state in one write: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** no failed write and no restart leaves a freeze card half changed. The plan [2026-11-18-local-board.md](2026-11-18-local-board.md) ended with four known gaps. Each needs one database write to fail between two others. This plan removes the cause: a change of the freeze card's state is one database transaction, and Forgejo follows the database.

**Spec:** this file. The code is `internal/factoryd/freezecard.go`, `retryswitch.go`, `escalation.go` (`closeIssueAsFactory`, `closeRow`), `intake.go` (`HealFactoryCloses`) and `store.go` in `~/repos/ai-software-factory-code`.

## The cause

The freeze card's state lives in three places in the database: the task row's status, the face (the objective) and the close record (`intake_events`, kind `factory_closed`). The watcher changes them with separate writes and calls Forgejo between them:

- A reopen calls Forgejo, moves the row, writes the face and forgets the close record: four steps.
- A press's close records the close, calls Forgejo, writes the face and moves the row.
- A filing that Forgejo did not take lives in the watcher's memory only.

A failure between two steps leaves a state that no rule describes, and nine fix rounds each patched one such state.

## The model

1. **The database is the commit point.** One store method per state change runs in one transaction. A failed transaction changes nothing.
2. **Forgejo follows.** Every Forgejo call a change needs is recorded in the same transaction as an owed call, made after the commit, and marked done after Forgejo took it. A pass makes the owed calls again until Forgejo took them. Every such call is safe to repeat.
3. **Nothing lives in memory only.** What a restart needs is derived from rows.

### The store methods

- `EndFreezeCard(ctx, t Task, face, comment string) (moved bool, err error)`. In one transaction: if `comment` is not empty, insert the `factory_closed` record for the issue with `comment` as its body. Write `face` when it is not empty. Move the row from `waiting-human` to `done`. Delete an owed reopen of the card. If the row no longer waits, or a close record already stands on the issue (a close in flight that is not the watcher's, a human's console close), write nothing and answer `moved == false`.
- `ReopenFreezeCard(ctx, t Task, face string) error`. In one transaction: move the row from `done` to `waiting-human`, write `face`, take the close record off the issue (as `ForgetFactoryClose` does, and the row must count as confirmed so the heal pass leaves it), and record the owed reopen: one `intake_events` row of the new kind `factory_reopened` with the issue number as `comment_id`. A row that is not `done` changes nothing and answers an error.
- `OwedFreezeReopens(ctx) ([]IntakeEvent, error)` lists the owed reopens. `SettleFreezeReopen(ctx, taskID string, issue int64) error` deletes one.
- `StandingFreezes` answers one event per repository that armed the class since the class's last `class_resumed`, each with that repository and with the time, reset and words of the class's newest `class_frozen`. A restart then files the card of every repository whose filing Forgejo did not take.

`ForgetFactoryClose` stays only if a caller is left. `TransitionTask` and `SetObjective` stay for the single-write changes (a re-arm's face, a resume's face, the ask).

### The watcher

- **A close** (the press's `CloseOnRetry`, the self-resume's `close`, `giveUp`): `EndFreezeCard`, then count the end when it moved (`countHumanEnd`), then `closeIssueAsFactory` for the Forgejo side. Its insert meets the record and it posts the recorded comment once, closes the issue and confirms. A Forgejo failure there is logged and not returned: the heal pass (`HealFactoryCloses`) closes the issue. `giveUp` passes no comment, as its issue is gone. A self-resume's wake of the frozen cards follows a close that moved the row, so a restart wakes nothing twice.
- **A reopen** (`frozen` on a press-closed card): `ReopenFreezeCard`, then the owed call: `ReopenIssue`, the re-arm comment, `SettleFreezeReopen`. A Forgejo answer that the issue is gone for good gives the card up and files its replacement, as today. Any other failure leaves the owed reopen for the next pass.
- **Each pass** (`Check`, after `rehydrate`) makes every owed reopen again: a card that still waits gets `ReopenIssue` and is settled, a card that no longer waits is settled without a call.
- **Deleted**, as their states cannot occur: `rehydrate`'s branch for a waiting row under the press face, `forgetStaleClose` and its callers, the time comparison in `closedBy` against a record a reopen left, the tick's `ErrRefused` and `forgejoGone` branches around `close`, and every test of only those states. A test of a behaviour that still exists keeps its name and its assertions.

No `workflow.GetVersion` change is needed unless a workflow's code changes. The retry press keeps its `retry-press-drop` behaviour.

## Global Constraints

- The code repository is `~/repos/ai-software-factory-code`. Read its CLAUDE.md. Work in the worktree `.worktrees/freeze-atomic` on branch `freeze-atomic`, cut from `origin/main`. Merge the newest `origin/main` before the pull request.
- Tests: `go test -race` for `./internal/factoryd/...` and `./acceptance`. Postgres-backed tests run beside a throwaway Postgres 17 in docker, with `FACTORYD_TEST_DATABASE_URL` and `GATEWAY_TEST_DATABASE_URL` pointing at it.
- Tests come first: the fault dimension of Task 1 fails on main before Task 2's code makes it pass.
- No test is weakened or skipped to pass. An expectation is derived by hand from this plan.
- One way only: no old path stays beside a new one.
- No ruling number and no ledger path in a tracked file or a commit message. Commit messages end with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- A human is a human in every text.

## Tasks

### Task 1: The state table fails on a fault

`TestFreezeCardStateTable` (internal/factoryd/freezecard_test.go) walks 144 cells: 9 states, 8 events, each with and without a restart. Add a third dimension. For each cell, count the store writes and the Forgejo calls of a run without a fault. Then, for each such write or call, run the cell again with that one failing once, both without a restart and with a restart right after the failure. After the fault, run passes until two passes in a row change nothing. An event that answered an error to its caller (the press) is made again, as a human presses again. The gateway's rows need no second delivery: the cursor delivers them.

The end state must equal the end state of the run without a fault, in every part a human or a later freeze can see: each card's row status and face, each issue open or closed at Forgejo, each comment the run without a fault posted present exactly once, each card's end counted exactly once, the close records, the owed reopens (none), and the wakes sent.

A cell that cannot converge to the same state names its reason in the table, in one line, and asserts the state it reaches. A fault of a multi-write store method fails the whole method and changes nothing in the fake, as a transaction does.

- [x] The fault dimension runs every write and every call of every cell, and fails on main for the four gaps of the earlier plan: a reopen's failed face write, a press's failed row close with a restart, a reopen's failed forget with a restart and a human's console close, and a kept filing in a second repository over a restart.

### Task 2: One transaction per state change, and Forgejo follows

Build the model above: the store methods on `PGStore` with their Postgres tests in `internal/factoryd/pg` (each method's effects after a commit, and no effect at all when its guard does not hold), the fake's versions, the watcher's use of them, the owed reopens in each pass, and the deletions.

- [x] The whole state table with its fault dimension passes, with every exception named. `go test -race ./internal/factoryd/...` and `./acceptance` pass beside Postgres.
- [x] No store write of a freeze card's close or reopen runs outside `EndFreezeCard` and `ReopenFreezeCard`.

### Task 3: Land and roll

- [x] The pull request's CI checks pass, a review is clean, and the work is on main.
- [x] The cluster runs the new main, and `node launch/site/evidence.js` passes in the docs repository with the pins moved.

## Outcome

The work landed on main of `ai-software-factory-code` with pull request #2250, merge 94c800580, after six fix rounds. Each review from the second round on passed, and each round's findings were smaller than the round's before.

What the code does now:

- `EndFreezeCard` and `ReopenFreezeCard` each write the row, the face and the close record in one transaction. No close or reopen of a freeze card is written outside them.
- A reopen records its owed Forgejo call in the same transaction. Each pass of the watcher makes the owed reopens and the unconfirmed closes of freeze cards again until Forgejo took them. The heal pass lists no close of a freeze card. A human's close always wins.
- The watcher keeps no state between passes. Each pass reads the standing freezes and the held resumes from the gateway's rows, so a restart equals a next pass.
- The order of the gateway's rows alone tells which arms a press answered. The gateway changes a hold only together with its row, under the hold's lock: the arm, the lapse and the clear share `changeHold`. The hold-clear route always writes its `class_resumed` row.
- The wake of the frozen cards after a resume that held five minutes is derived from the rows and recorded as a `class_woken` row.
- The fault dimension of `TestFreezeCardStateTable` and its named scenarios fail every store write and every Forgejo call once, before and after its effect, with and without a restart, and compare the end state with the run without a fault. 155 fault runs failed on main before the change. About 1,800 pass now.

Found on the live factory on 2026-11-18 and fixed in the same pull request:

- The freeze was switched off in production: the policy named no provider. The four work classes now name `zai`, and `provider_limits` holds `zai` with `tz: Asia/Singapore`.
- A count of one reads "1 card of the class waits."
- A report task (sizing, screening, prover) outlived its closed card and stayed frozen to the provider's reset. The heal pass now ends each open report task whose card is gone, and a card that lives again gets its report run again.

The live check on main 260024d66 passed: a test card met z.ai's dated limit, the freeze card filed itself nine seconds later with no case and no question, the Retry now press cleared the hold, closed the card and woke the frozen card, the next refusal opened the same card again, and a human's close stayed closed.

What stays as it is, each named in the tests or accepted by the review:

- The lost press. If the press's write fails and a pass reads the `class_resumed` row before the human presses again, the card takes the resumed face and closes itself five minutes later.
- The lost close. A human's close that failed before its record, and was not made again, leaves the card as if no one closed it.
- A filing that a failed cursor write makes again after its class resumed shows a card for a freeze that ended. The card closes itself five minutes later.
- An issue that Forgejo made, whose answer was lost, and whose retry at the resume failed too, stands with no card until the class's next freeze in that repository.
- While the events table refuses rows, each refused arm or lapse holds the gateway's hold lock for up to three seconds, which slows the calls of the other limited classes.
- The three-second deadline can fire after Postgres committed the row. The next row repairs the hold.
- A retry press that arrives while a frozen card's session still runs costs one more session start, which the hold answers locally.
- The freeze is per work class. One provider limit can freeze four classes and file four cards, and a press clears one class.
