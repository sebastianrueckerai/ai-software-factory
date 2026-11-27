# A routine's run shows while it works and says why it failed: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

This plan is the ninth of the drift review's set ([the overview](2026-11-27-drift-review.md)). Its Task 3 follows the shapes of "One close for every card" and "One door for every answer" and builds after them. Line numbers are from the code repository's main at `306caad7a` (2026-11-26). Main moved to `2af2e0ed2` on 2026-11-27, when the open faults merged and rolled, so check each line before you edit it.

**Goal:** Every routine stands in In progress while one of its runs works, and a run that fails puts its error on a card that the factory agent reads first and a human sees in Needs you only when the agent cannot settle it, until a later run of the routine ends well.

**Architecture:** A run's row with no outcome is the one fact of "this run works". The board and the drawer read it through one new store query. The run writes each failed attempt's error on that row, and Temporal gives up after three attempts. A failed run files one held human card per routine, which climbs the case ladder like every factoryd card: the factory agent first, then the human. The routine's next run that ends well closes the card with its reason.

**Tech stack:** Go (factoryd, console, htmx templates), PostgreSQL, Temporal, the console lab (Playwright).

**Spec:** Sebastian's request of 2026-11-27: "They go to 'in progress' while working, they show clear errors (in 'needs you' - unless an ai agent can sort them out or a later run completes)." It covers every routine, not only the weekly bump.

## Why this plan exists

On 2026-11-26 Sebastian pressed Run it now on the weekly bump of `ai-software-factory-code`.

| UTC | What happened |
|---|---|
| 22:58:01 | The console started run 10 and waited for its outcome. The press greyed the drawer. |
| 22:58 to 23:00 | The bump pod moved the pins. A second pod copied four images into the store. |
| 22:58:21 | The console stopped waiting after `runNowWait` (20 s) and drew the drawer again, unchanged. |
| 23:01:04 | Run 10 filed card #2351 with pull request #2350. #2350 merged later as code main `306caad7a`. |

The run worked, and the console showed none of it:

- The button throws away the note that `doRoutineRun` returns (`internal/console/routines.go:36`).
- The routine stays a ghost at the foot of Queued while it works (`placeGhosts`, `internal/console/board.go:2491-2530`). Its foot shows no running run, because `routineFace` reads "running" only from a filed card's status.
- The drawer's Last row printed an empty value, as `runWords` (`board.go:2603`) has no word for a run with no outcome.
- No event marks a run's start, so nothing refreshes the board when a run begins.

A failure would show even less:

- Temporal retries a failed attempt for up to 24 hours (`internal/factoryd/routine_workflow.go:54-56`). No attempt's error is written anywhere a screen reads.
- After the last attempt, `RoutineRunFailed` (`routine_run.go:278`) writes "failed" and the words on the run's row and tells nobody: its poke is `""`.
- The live table holds no run that ended this way so far. The three `failed` rows of `routine_runs` are filed cards that failed later.

## What already works and stays

- `RoutineRunWorkflow` with its ID `<project>/<routine>/<due time>`. `BeginRoutineRun` and its `began` flag, and `RoutineRunFailed` as the one writer of a failed run.
- The case ladder for factoryd's held human cards: `HumanCardStatus` files a source outside `askAtOnce` as `waiting-agent` with no issue, rung 2 (the factory agent) takes it first, and `Face` files the issue and moves it to Needs you on a hand-up. This plan adds no rung. The new source maps to a kind of its own, `routine_failed`, through `cardKinds` of "One close for every card".
- The follow routine's failure card (`FollowFail`, `followfail.go:70`) is the pattern: one standing card per routine, found by a marker in its objective, a retry choice, and a close by rung 0's row `follow_target_gone` once "One close for every card" built it. It stays as it is for a failed move, which is not a failed run.
- `Act`'s end of a human card that rung 0 withdraws (`EndHumanCard`, "One close for every card"), with the reason as C51 words it.
- The board's stream: an event row with no task swaps the board (`static/console.js:465-477`), and a heartbeat compares `boardData.faces()` every 25 s.

## Decisions this plan makes

These are execution defaults. Sebastian may change any of them before the build.

1. **The working routine keeps its ghost look.** It moves from the foot of Queued to the foot of In progress, with the breathing cyan dot that C16 already gave a running run. The lane's count stays the count of its cards.
2. **Three attempts, then the run fails.** Attempts 2 and 3 come 10 s and 20 s after the one before. A blind retry for 24 hours is gone. The factory agent's retry on the card takes its place.
3. **The factory agent retries once per failure.** Rung 2 may press Run it again when the failed run was not itself a retry from a failure card. Otherwise it hands the case up with its analysis. This bounds the agent's loop by a fact, not by a prompt rule.
4. **One standing card per routine.** A second failure while the card stands files no second card. The run's row and the drawer show each failure.
5. **"Ends well" means the outcome `filed`, `no change` or `reported`.** `held`, `skipped` and `gone` prove nothing about the error, so they leave the card open.
6. **A factory routine's card files on the configuration repository.** A routine of `policy.yaml` (project `""`, the template pass today) has no project, so its failure card goes to `CONFIG_REPO`, where the platform card goes.
7. **The press answers on the board (C42).** Run it now waits only until the run's row exists, at most 5 s. The drawer then shows "running since 23:58", and the board shows the routine in In progress.

## Global constraints

- Fix by construction: in code, in a tool's shape or in a check. No new prompt rule.
- One way only: no legacy path, no shim, no second implementation.
- Tests first. Expectations are derived by hand. Never change an assertion to make a test pass.
- Each test that reads time runs on a fixed clock.
- Screens show times in the human's zone (C49). Agents, issue comments, Discord and logs read the UTC words.
- A change to workflow code needs a `workflow.GetVersion` change id only when a history recorded before it would make today's code issue other commands, so a change to an activity's input or options needs none.
- An error's words pass `Runner.scrub` (`checkin.go:1139`) before they reach a row, a card, an issue or a screen.
- A human is a human: never a member, an operator or a resource, in copy or in docs.
- No ruling number and no ledger path appears in a tracked file or a commit message. Both repositories' pre-commit hooks refuse them.
- Unit tests: `go test -race ./internal/factoryd/ ./internal/console/`. Tests on PostgreSQL: `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/pg/`. All tests: `make test`. `bash check changed` passes before each commit.
- Code work runs in a git worktree off `origin/main` of `~/repos/ai-software-factory-code`. A roll needs Sebastian's go.

## Review Focus

1. **Two runs work at once**, a cron run and a Run now with different due times. The routine shows once in In progress and names the newest run. Task 1's contract test pins it.
2. **The routine is deleted while its failure card stands.** No later run comes. The row `routine_ran` reads the routine as gone, so the retake pass closes the card within a minute, and the factory agent's `close` passes before that. Task 3 pins it.
3. **A run held by `while_open` after a failure** must leave the failure card open. Task 3 pins it.
4. **An error with a secret in it** reaches the row, the card and the face scrubbed. Task 2 pins the row and Task 3 the card.
5. **A retry from the card while a Skip once is pending** must not use up the skip, which is meant for the next scheduled run. Task 3 pins it.

---

### Task 1: The store reads a working run and notes an attempt

**Files (code repository):**
- Modify: `internal/factoryd/routine_store.go` (the `RoutineStore` interface at `:54-89`, the PG store)
- Modify: `internal/factoryd/store_test.go` (the fake store's routine runs, near `:2975` and `:3028`)
- Modify: `internal/factoryd/routines.go` (`RoutineView` at `:41-71`, `Views` at `:376-450`)
- Test: `internal/factoryd/routine_store_test.go` (`checkRoutineStore`), `internal/factoryd/routines_test.go` (`TestViews`)

**Interfaces:**
- Produces: `RoutineStore.WorkingRoutineRun(ctx context.Context, project, routine string) (RoutineRun, bool, error)`: the newest row with `outcome = ''` and `ended IS NULL`.
- Produces: `RoutineStore.NoteRoutineAttempt(ctx context.Context, project, routine string, run int, note string) error`: sets `note` on that row only while `outcome = ''` and `ended IS NULL`.
- Produces: `RoutineView.Working *RoutineRun`, nil when no run works.
- Deletes: `RoutineView.Column`. It always said "queued" and only tests read it.

- [ ] **Step 1: Write the failing contract cases** in `checkRoutineStore`, so the PG and the fake store both run them:
  - Begin run 1 and read `WorkingRoutineRun`: ok, run 1.
  - `NoteRoutineAttempt(run 1, "attempt 1 of 3 failed: boom")`, then `RoutineRuns(.., 1)[0].Note == "attempt 1 of 3 failed: boom"`.
  - `RoutineRunFiled(run 1, ..)`: `WorkingRoutineRun` is not ok. `NoteRoutineAttempt(run 1, "x")` leaves the note `"attempt 1 of 3 failed: boom"`.
  - Begin run 2 (due D) and run 3 (due D+1 h) without ending either: `WorkingRoutineRun` returns run 3.
  - `EndRoutineRun(run 3, "no change", ..)`: `WorkingRoutineRun` returns run 2.
- [ ] **Step 2: Extend `TestViews`:** a routine with a begun, unended run has `Working.Run` equal to that run. A routine whose newest run ended has `Working == nil`. Remove the three `Column == "queued"` assertions (`:432`, `:439`, `:501`) together with the field.
- [ ] **Step 3: Run and see them fail.** `go test -race -run 'TestFakeStoreRoutineRuns|TestViews' ./internal/factoryd/` and `scripts/pg-test.sh go test -race -p 1 -run TestPGStoreRoutineRuns ./internal/factoryd/pg/`.
- [ ] **Step 4: Implement** both methods in the PG store and the fake. `Views` sets `Working` from `WorkingRoutineRun` for each routine's key.
- [ ] **Step 5: Run the tests again.** Expected: PASS.
- [ ] **Step 6: Commit.**

### Task 2: The run records its start, notes each failed attempt and stops after three

**Files (code repository):**
- Modify: `internal/factoryd/routine_run.go` (`RoutineRun` at `:26-167`, `routineRan` at `:309-333`)
- Modify: `internal/factoryd/routine_workflow.go` (the run's `RetryPolicy` at `:56`)
- Modify: `internal/factoryd/event_store.go` (the routine events at `:84-103`)
- Test: `internal/factoryd/routine_run_test.go`, `internal/factoryd/routine_workflow_test.go`

**Interfaces:**
- Consumes: `NoteRoutineAttempt` (Task 1).
- Produces: `EventRoutineWorking = "routine_working"`, detail `{"project", "routine", "run", "trigger", "note"}`. It is written at a run's start with note `""` and at each failed attempt with that attempt's note. It joins no poke list and no inbox kind.
- Produces: `const routineAttempts = 3` and `attemptNote(attempt, of int, words string) string`, which returns `"attempt 2 of 3 failed: <words>"`.

- [ ] **Step 1: Write the failing test** `TestRoutineRunRecordsItsStart`: a project routine of kind report whose run begins records exactly one `routine_working` row with run 1, trigger `cron` and note `""` before its `routine_ran` row. A second call for the same due records no second `routine_working` row.
- [ ] **Step 2: Write the failing test** `TestRoutineRunNotesAFailedAttempt`. A bump routine runs with a Forgejo fake whose `BranchHeadSHA` fails with `boom token=s3cr3t`, under an activity context whose attempt is 2:
  - The call returns the error.
  - The row's note is `"attempt 2 of 3 failed: main's head: boom token=[redacted]"`. Derive the redacted form from what `Runner.scrub` does to that input, and write it as a literal.
  - One `routine_working` row carries that note.
  - An error before the row exists (no project in the store) writes no note and no row.
- [ ] **Step 3: Write the failing test** `TestRoutineRunWorkflowStopsAfterThreeAttempts` in the workflow test suite: `ActivityRoutineRun` always fails with `boom`. It runs exactly 3 times. `ActivityRoutineRunFailed` runs once with the words `boom`, and the workflow fails.
- [ ] **Step 4: Run and see them fail.** `go test -race -run 'TestRoutineRunRecordsItsStart|TestRoutineRunNotesAFailedAttempt|TestRoutineRunWorkflowStopsAfterThreeAttempts' ./internal/factoryd/`
- [ ] **Step 5: Implement:**
  - `RoutineRun` records `routine_working` when `began` and the row's outcome is `""`, through the same writer as `routineRan`, which writes nothing for a repository `""`.
  - On an error returned after `run.Run > 0`, it calls `NoteRoutineAttempt` with `attemptNote(attempt, routineAttempts, r.scrub(failureWords(err)))` and records `routine_working` with that note. The attempt comes from `activity.GetInfo(ctx).Attempt` when `activity.IsActivity(ctx)` (`go.temporal.io/sdk@v1.44.0/activity/activity.go:108`), else 1.
  - In the workflow, the run's activity options set `RetryPolicy.MaximumAttempts = routineAttempts` (`routine_workflow.go:56`). A change to an activity's input or options needs no `workflow.GetVersion` change id, and `RoutineRunWorkflow` has no change id today.
  - `RoutineRunFailed` scrubs its words the same way.
  - Update the doc comment of `EventRoutineRunNow` for Task 5's detail.
- [ ] **Step 6: Run** `go test -race ./internal/factoryd/`. Expected: PASS.
- [ ] **Step 7: Commit.**

### Task 3: A failed run files one held card, the factory agent retries once, and a later run closes it

This task builds after Tasks 2, 3, 4, 7 and 9 of "One close for every card" and Tasks 5, 6 and 9 of "One door for every answer". Tasks 1, 2, 4 and 5 of this plan build before it. This task adds the failed card's row to the board's foot and to the drawer's Last row, which Tasks 4 and 5 leave out. Until it lands, a failed run reads on both as today's last run.

**Files (code repository):**
- Create: `internal/factoryd/routinefail.go`, `internal/factoryd/routinefail_test.go`
- Create: `internal/schema/migrations/factoryd/20261202100000_routine_failed_kind.sql` (the name is the next free timestamp after the set's migrations, inferred)
- Modify: `internal/factoryd/intake.go` (the sources near `:1297`), `internal/factoryd/source_briefs.go` (near `:103`), `internal/factoryd/kinds.go` (`CaseKinds`, `CardSources`)
- Modify: `internal/factoryd/cases.go` (the `CaseKind` constants and the kind table `caseKinds`), `internal/factoryd/cases_events.go` (`cardKinds`), `internal/factoryd/ladder.go` (the row `routine_ran` in `rung0`)
- Modify: `internal/factoryd/routine_run.go` (`RoutineRunFailed` at `:278-302`, the `end` and `filed` helpers at `:55-68`, the skip flag at `:45-46`)
- Modify: `internal/factoryd/routine_store.go` (`TriggerRetry` beside `TriggerRunNow` at `:19`, `StandingQuestion` in the `RoutineStore` interface at `:54-89`), `internal/factoryd/routines.go` (`Routines.RunNow` at `:307-313`)
- Modify: `internal/factoryd/act.go` (`heldRefusal`), `internal/factoryd/faces_copy.go` (the variants at `:50-72`, the vocabulary near `:128`, the key constants, `CaseFaces`)
- Modify: `internal/factoryd/followpass.go` and `followfail.go` (the two `Follow.Cards.StandingQuestion` calls)
- Modify: `internal/factoryd/runner.go` (`RunnerConfig` at `:46`), `cmd/factoryd/main.go` (`configRepo` at `:90`)
- Modify: `internal/console/board_actions.go` (`choiceWork`), `internal/console/access.go` (`accessTable`), `internal/console/ports.go` (`Routines.RunNow` at `:311`), `internal/console/routines.go` (the call in `doRoutineRun` at `:127`)
- Modify: `internal/factoryd/routines.go` (`RoutineView`, `Views`), `internal/console/board.go` (`routineFace`), `internal/console/faceview.go` (`routineFoot`), `internal/console/routine_drawer.go` (the Last row)
- Test: `internal/factoryd/routinefail_test.go`, `internal/console/actions_test.go` or the file that tests the `KeyRetryFollow` arm of `choiceWork`, `internal/console/ghost_test.go`, `internal/console/routine_drawer_test.go`

**Interfaces:**
- Consumes: `RoutineRun`, `EndRoutineRun`, `RoutineRunFiled` and `RoutineRuns`.
- Consumes, from "One close for every card": `cardKinds` (Task 2), `Act`'s end of a human card that rung 0 withdraws, `EndHumanCard` (Task 3), `Runner.Retire` and the retake pass's read of every factory card kind (Task 4), the fact method shape of `Runner.followGone` (Task 7), and `heldRefusal` reading `firing` (Task 9).
- Consumes, from "One door for every answer": `Resolution.Key` (Task 4), a human card's stored keys and `choiceWork` (Task 5), `answerRule` (Task 6), and `doResolve` behind `POST /tasks/{id}/resolve` (Task 9).
- Produces: `SourceRoutineFailed = "routine-failed"`, held, outside `askAtOnce`.
- Produces: `CaseRoutineFailed CaseKind = "routine_failed"`, the entry `SourceRoutineFailed` to `CaseRoutineFailed` in `cardKinds`, and its kind table row: `Words: "failed routine run"`, `Rung0: []string{"routine_ran"}`, `NoRung1: choicesAnswer` (rung 1 does not judge it), `Rung2: rung2Decides` (the factory agent takes it first), `Choices: true` (its question's choices answer it, at rung 3 the human's), and `Retires: "a later run of the routine filed its card or ended “no change” or “reported”, or the routine left the configuration: rung 0 closes the card (routine_ran)"`.
- Produces: the row `routine_ran` of `rung0` and `func (r *Runner) routineFailGone(ctx context.Context, t Task) (string, Moments, error)` in `routinefail.go`. The name `routineRan` is taken: it is the event writer at `routine_run.go:309`.
- Produces: `TriggerRetry = "retry"`, the trigger of a run that a failure card's Run it again starts.
- Produces: the vocabulary row `{Action: ActRetry, Variant: variantRoutine, Label: "Run it again", Effect: "Runs the routine now and closes this card. If the run fails again, a new card says why."}`, with `variantRoutine = "routine"` in the variant block and `KeyRetryRoutine = ActRetry + "/" + variantRoutine` beside `KeyRetryFollow`. The card stores the key `retry/routine`.
- Produces: the arm `case factoryd.KeyRetryRoutine:` of `choiceWork`.
- Produces: the entry `"answer retry/routine": rCard` in `accessTable`.
- Changes: `Routines.RunNow(ctx context.Context, project, routine, trigger string) error`, in factoryd and in the console's port.
- Produces: the facts `routine_project`, `routine_name`, `routine_run` and `routine_trigger` on the card's ask.
- Produces: `routineFailedMarker(project, routine string) string`, unique per routine. A project `""` reads as "the factory".
- Produces: `RoutineFailedQuestion(rt policy.Routine, run RoutineRun, words string) HumanQuestion`.
- Produces: `RunnerConfig.ConfigRepo Repo`, set from `configRepo` in `cmd/factoryd/main.go:90`.
- Moves: `StandingQuestion` joins the `RoutineStore` interface, which `Runner.Routines` embeds and `Routines.Views` reads. The follow routine calls `r.Routines.StandingQuestion`, and `Follow.Cards` goes.
- Produces: `RoutineView.Failure *Task`, which `Views` fills with `StandingQuestion(repository, routineFailedMarker(..))`. The board's foot reads `run 10 failed · #2360` for a failed run whose card stands, with no dot, the class `it held` and #2360 linked as every reference is. The drawer's Last row reads `failed: <words>` with the link to the card.

The card's copy, which the tests pin word for word:

- Ask: `Run 10 of “Weekly bump of the pinned outside inputs” failed`
- Why: the routine's why line.
- Info, in order:
  1. `The run started at 22:58 UTC on Run it now and failed after 3 attempts.`
  2. `The last attempt's error: <words>`
  3. `Run it again runs the routine now and closes this card. End the card leaves it to the next run at its time. A later run that ends closes this card by itself.`
- Happened: `Run 10 of the routine weekly-bump failed after 3 attempts: <words>.`
- Waits: `Nothing waits for this card: the routine's next run comes at its time.`
- The close reason (C51): `run 11 of the routine ended “no change” at 06:00 UTC`.

The trigger words are "on its schedule" for `cron`, "on Run it now" for `run-now`, "on Run it again" for `retry`, and the trigger's name for any other.

- [ ] **Step 1: Write the failing test** `TestAFailedRunFilesOneHeldCard` with project `ai-software-factory-code`, routine `weekly-bump`, run 10, trigger `run-now`, started 22:58 UTC, words `the bump pod: image pull failed`:
  - `RoutineRunFailed` files one task with source `routine-failed`, status `waiting-agent` and no issue. Its case has the kind `routine_failed`.
  - Its ask carries the copy above, the four facts, and the stored offers `retry/routine` and `close`.
  - With the words `boom token=s3cr3t`, the Info and the Happened line carry the scrubbed form that Task 2 derives (Review Focus 4).
  - The run's row ends `failed` with the words.
  - A second call for the same run files nothing. A failed run 11 while the card stands files nothing and still ends its row `failed`.
- [ ] **Step 2: Write the failing test** `TestAFailedFactoryRoutineFilesOnTheConfigRepository`: a failed run of `template-pass` (project `""`) files its card on `RunnerConfig.ConfigRepo`.
- [ ] **Step 3: Write the failing test** `TestALaterRunClosesTheFailureCard`:
  - With run 10's card standing in `waiting-agent`, run 11 ends `no change` at 06:00 UTC. The run's call of `Retire` ends the card before `RoutineRun` returns. The card is `closed` with the closing reason `run 11 of the routine ended “no change” at 06:00 UTC`, its case is `withdrawn`, and one `question_withdrawn` row carries that reason, the moment of 06:00 UTC and `held: true`.
  - With an issue on the card, `closeIssueAsFactory` closes it with the one comment `Run 11 of the routine ended “no change” at 06:00 UTC.`
  - For the outcome `reported`, and for a run 11 that filed card #2360, the card closes the same way, the second with the reason `run 11 of the routine filed #2360 at 06:00 UTC`. For `held` (Review Focus 3) and `skipped`, it stays.
  - A retry of run 11's activity, after the row ended but before the close, returns at the early return (`routine_run.go:50-52`) and calls no `Retire`. The card stands until one `Monitor.Retake`, which closes it with the same reason.
- [ ] **Step 4: Write the failing test** `TestTheRoutineRanRowEndsAFailureCard`, through `Monitor.Retake`:
  - The row fires when a run numbered above the card's `routine_run` fact ended `no change` or `reported`, or filed its card, and its clause is the reason of Step 3.
  - The row fires when the routine is no longer in the configuration, with the clause `the routine is no longer in the configuration` (Review Focus 2). The factory agent's `close` passes `heldRefusal` on that card before the sweep.
  - Otherwise the row does not fire and the card stays. The factory agent's `close` is refused with `card #N's reason stands: ` followed by the `Retires` words of `routine_failed` and the hand-up advice. Take `N` from the fixture.
- [ ] **Step 5: Write the failing test** `TestTheFactoryAgentRetriesAFailedRoutineOnce`. Rung 2's `retry/routine` on a card whose `routine_trigger` fact is `cron` passes `heldRefusal`. On a card whose `routine_trigger` is `retry`, it is refused with: `run 10 was itself a retry from a failure card and failed again, so the factory agent tries no more: hand the case up (` + "`hand_up`" + `) with ` + "`retry/routine`" + ` as the recommendation`. The human (rung 3) may always retry.
- [ ] **Step 6: Write the failing test** `TestARetryRunStartsNowAndKeepsTheSkip`:
  - `Routines.RunNow(ctx, "ai-software-factory-code", "weekly-bump", TriggerRetry)` starts one run of the routine with trigger `retry` and due equal to the fixed clock's now.
  - With a pending Skip once, the retry's run does not consume it: the run's outcome is not `skipped`, and the routine's state still has `SkipNext` (Review Focus 5).
- [ ] **Step 7: Write the failing console test** `TestRunItAgainStartsARetryRunThroughTheOneDoor`. A writer of the project who is no approver posts `POST /tasks/{id}/resolve` with the card's `case_id` and the key `retry/routine`:
  - The `Routines` fake's `RunNow` is called once, with `ai-software-factory-code`, `weekly-bump` and `retry`.
  - The answer's note is `Answered #N: the routine runs again now and the card is closed.`
  - A `RunNow` that fails refuses with `The routine's retry failed: <error>. Try again in a moment.`
  - The writer's press is not refused, because `answerRule` finds `"answer retry/routine"` before it falls back to `"answer retry"`, which needs an approver.
  - `TestAFailedRoutineNamesItsCard` in `ghost_test.go`: a bump whose run 10 failed and whose card #2360 stands has the foot `run 10 failed · #2360`, no dot, the class `it held`, and #2360 linked. The drawer's Last row for the same routine reads `failed: <words>` with the link to #2360 (`routine_drawer_test.go`).
- [ ] **Step 8: Run and see them fail.** `go test -race -run 'FailedRun|FailedFactoryRoutine|LaterRunCloses|RoutineRanRow|RetriesAFailedRoutineOnce|RetryRunStarts' ./internal/factoryd/` and `go test -race -run 'TestRunItAgainStartsARetryRunThroughTheOneDoor|TestAFailedRoutineNamesItsCard' ./internal/console/`. Expected: compile errors on `CaseRoutineFailed`, `KeyRetryRoutine` and `TriggerRetry`.
- [ ] **Step 9: Implement:**
  - In `RoutineRunFailed`, file the card before `EndRoutineRun`, so a retry of the activity after a filing finds the standing card. Only an outcome `failed` files: a pre-set outcome such as `skipped` does not.
  - Do not file the card with `Source: SourceRoutine`, and do not call `RoutineRunFiled` for it. `OpenRoutineTask` would then hold every later run, and `RoutineRunFailed` returns early on a row with a task.
  - The skip flag at `:45-46` becomes true only for triggers other than `run-now` and `retry`.
  - The start time in Info carries a `factoryd.Moment` in the question's `Moments`, as `humanquestion.go:123` does for an alert, so a screen shows it in the human's zone.
  - The kind: add `CaseRoutineFailed` to the constants, `CaseKinds` and the kind table, `SourceRoutineFailed` to `CardSources` and `cardKinds`, and the kind to `CaseFaces` with `humanFace`, as "One close for every card" Task 2 does for its kinds. The migration drops `cases_kind_check` and adds it with `routine_failed`. No live case needs a new label, because no card of the source exists before this task.
  - The row `routine_ran` has no `Needs` and no `Back`. Its `Fire` calls `r.routineFailGone(ctx, t)` and, for a clause that is not `""`, answers `rungZeroMay(f, Resolution{Action: ActWithdraw, Note: note, Moments: said})`. Its `Took` answers `res.Note`.
  - `routineFailGone` reads the facts of the card's newest ask case. With no routine of `routine_project` and `routine_name` in the configuration, it answers `the routine is no longer in the configuration`. Else it reads `RoutineRuns` and answers for the newest run numbered above `routine_run` that ended `no change` or `reported`, with the moment of its end (`LayoutClock`), or that filed its card. A run with a card answers `run 11 of the routine filed #2360 at 06:00 UTC` at its start, because its row stays open until the card ends and then takes the card's end as its outcome. With no such run it answers `""`.
  - The run's good end: `end` after `EndRoutineRun` and `filed` after `RoutineRunFiled`, for an outcome `filed`, `no change` or `reported`, find the routine's standing card with `r.Routines.StandingQuestion(ctx, repository, routineFailedMarker(in.Project, in.Routine))` and call `r.Retire(ctx, card.ID)`. The repository is the project's, or `RunnerConfig.ConfigRepo.String()` for a factory routine. A failed `Retire` is logged. The early return at `:50-52` needs no close of its own, because the retake pass sweeps the row every minute.
  - The retry: `RoutineFailedQuestion` stores `choices(KeyRetryRoutine, ActClose)`. The arm of `KeyRetryRoutine` in `choiceWork` reads `routine_project` and `routine_name` from the case's facts and calls `c.cfg.Routines.RunNow(ctx, project, name, factoryd.TriggerRetry)`, with the note and the refusal of Step 7, as the arm of `KeyRetryFollow` does. `Routines.RunNow` starts the run with the trigger it takes, and `doRoutineRun` passes `factoryd.TriggerRunNow`. No factoryd function of its own starts the retry, because the console starts a run through the port it already holds.
  - The role: `"answer retry/routine": rCard` in `accessTable`. It is the need of a routine's Run it now, `"POST /routines/{project}/{name}/run": rProject` (a writer of the project), judged on the card's project.
  - The guard: `heldRefusal` refuses rung 2's `retry/routine` (`in.Res.Key() == KeyRetryRoutine`) when the case's `routine_trigger` fact is `retry`, with the words of Step 5.
  - Add `SourceRoutineFailed` to `SourceBriefs`, and `retry/routine` to the vocabulary test that lists every answer.
  - The screens: `Views` fills `RoutineView.Failure`. `routineFace` builds the failed row of Task 4's table from it, and the drawer's Last row reads `failed: <words>` with the card's link.
- [ ] **Step 10: Run** `go test -race ./internal/factoryd/ ./internal/console/` and `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/pg/`. Expected: PASS, including `TestTheKindTableHoldsEveryKind` with the row of `routine_failed`, whose `Retires` names `routine_ran`, `TestEveryFactoryHumanCardSourceHasAKind` with `routine-failed` added to its list, and `TestEveryHumanCardChoiceIsAVocabularyKey` with `RoutineFailedQuestion` added to its builders.
- [ ] **Step 11: Commit.**

### Task 4: The board stands a working routine in In progress

**Files (code repository):**
- Modify: `internal/console/board.go` (`placeGhosts` at `:2491-2530`, `routineFace` at `:2545-2583`, `faces()` at `:1359-1381`)
- Modify: `internal/console/faceview.go` (`routineFoot` at `:68-72`), `internal/console/templates/face.html` (line 15)
- Modify: `internal/console/lab_test.go` (`addRoutines` at `:1495-1576`), `scripts/console-lab/check.js` (`:1764-1824`)
- Test: `internal/console/ghost_test.go`, `internal/console/proof_ghosts_wide_lane_once_test.go`, `internal/console/census_fixes_test.go`

**Interfaces:**
- Consumes: `RoutineView.Working` (Task 1) and the run's note (Task 2).
- Produces: `routineFoot.Retrying bool`, which renders the foot's last part in the amber class `it held`, as `Held` does.

The foot's last part, which the tests pin, with times in the human's zone. Task 3 adds the third row, a failed run whose card stands. Until then a failed run reads as today's last run.

| State | Words | Dot | Class |
|---|---|---|---|
| Working | `run 10 running since 23:58` | yes | `it run` |
| Retrying | `attempt 1 of 3 failed: <note cut to 100 runes>` | yes | `it held` |
| Failed, card standing (Task 3) | `run 10 failed · #2360`, with #2360 linked as every reference is | no | `it held` |

- [ ] **Step 1: Write the failing test** `TestBoardStandsAWorkingRoutineInProgress`:
  - A bump with a working run 10 started at 22:58 UTC stands once in `colProgress`'s ghosts and not in Queued's.
  - Its foot reads `run 10 running since 23:58` for a human in Europe/Berlin, with the dot.
  - Queued's count and In progress's count are unchanged.
- [ ] **Step 2: Write the failing test** `TestAWorkingRoutineShowsUnderEveryRoutinesChoice`: under `routines=none` and under `within` 1 hour with a next run in 6 days, the working routine still stands in In progress, and `GhostsHidden` does not count it.
- [ ] **Step 3: Write the failing test** `TestARetryingRoutineSaysItsError`, with the words and class of the table's second row.
- [ ] **Step 4: Write the failing test** `TestFacesChangeWhenARunStartsAndEnds`: `faces()` differs between no working run, a working run, the same run with a note, and the run ended. The heartbeat's refresh then carries a template-pass run, which records no event.
- [ ] **Step 5: Change the console lab check.** Replace "a ghost stands in X, not only Queued" (`check.js:1775-1780`) with two checks:
  - Every ghost outside Queued stands in In progress and carries `.dot`.
  - The lab's working bump stands in In progress with `running since`.
  - `addRoutines` gains the working bump and a retrying audit routine.
- [ ] **Step 6: Run and see them fail.** `go test -race -run 'WorkingRoutine|RetryingRoutine|FacesChangeWhenARun' ./internal/console/`
- [ ] **Step 7: Implement.** `placeGhosts` puts a routine with `Working != nil` into `colProgress`, ahead of the routines choice. `routineFace` builds the foot by the table. `faces()` adds the working run's number and note and the last run's outcome to each ghost's line.
- [ ] **Step 8: Run** `go test -race ./internal/console/` and the console lab (`scripts/console-lab/`, its README's run command). Expected: PASS. Compare same-region crops of the lab's In progress column before and after at 2× zoom.
- [ ] **Step 9: Commit.**

### Task 5: The drawer says what the run does, and Run it now answers at once

**Files (code repository):**
- Modify: `internal/console/routine_drawer.go` (the Last row at `:205-214`), `internal/console/templates/routine_drawer.html`
- Modify: `internal/console/board.go` (`runWords` at `:2603`)
- Modify: `internal/console/routines.go` (`doRoutineRun` at `:114-138`, `awaitRun` at `:143-164`, `runNowWait` at `:23`)
- Test: `internal/console/routine_drawer_test.go`, `internal/console/routines_test.go` (`TestRoutineRunNowAnswersHeld` at `:313`), `internal/console/routine_tools_test.go`, `acceptance/write_tools_stream_test.go`

**Interfaces:**
- Consumes: `RoutineView.Working`.
- Produces: `EventRoutineRunNow` detail `{"project", "routine", "run", "outcome"}`. The outcome is `started` while the run works.

- [ ] **Step 1: Write the failing drawer tests.**
  - The Last row reads `running since 23:58` (class `running`) for a working run.
  - It reads the note with class `warn` for a retrying run.
  - `runWords` returns `running` for a run with no outcome. The failed run's line with its card link is Task 3's.
- [ ] **Step 2: Write the failing test** `TestTheDrawerRefreshesWhileARunWorks`:
  - With a working run, the drawer's root carries `hx-get` of its own URL with its tab, `hx-trigger="every 3s"` and `hx-swap="outerHTML"`.
  - With no working run, it carries no `hx-trigger`.
  - The re-rendered drawer after the run ends drops the trigger, so the refresh stops by itself.
- [ ] **Step 3: Rewrite `TestRoutineRunNowAnswersHeld`** as `TestRoutineRunNowAnswersWhenTheRunBegins`:
  - A fake whose `Runs` shows the new run-now row with outcome `""` makes `doRoutineRun` return within one poll, with the note `Run 10 started at 22:58 UTC. It stands in In progress until it ends or files its card.`
  - A row that already has its outcome keeps today's notes: "Held: …", "Filed #790 in Needs you", "No change".
  - No row within `runNowWait` (5 s, 50 ms in the test) returns `The run did not start within 5 s: look at the routine's Runs tab.`
  - The events carry `run` and the outcome `started`, and no `pending`.
  - Update the chat tool's expectation in `routine_tools_test.go` and `acceptance/write_tools_stream_test.go:246` to the same notes.
- [ ] **Step 4: Run and see them fail.** `go test -race -run 'RoutineDrawer|DrawerRefreshes|RoutineRunNow|ChatRoutineRun' ./internal/console/` and `go test -race -run WriteTools ./acceptance/`.
- [ ] **Step 5: Implement.** `awaitRun` matches `run.Run > after && run.Trigger == TriggerRunNow` with any outcome. The button keeps no note (C42): the drawer's re-render and the board are its answer.
- [ ] **Step 6: Run** `make test`. Expected: PASS.
- [ ] **Step 7: Commit, open the pull request, and merge after green CI and an independent review on the most capable model with no blocker.**

### Task 6: The docs and the decision

**Files (this repository):**
- Modify: `design/design-decisions.md` (a new C-entry after C52)
- Modify: `docs/routines.md` (rule 1 at `:99`, the run workflow at `:80`), `docs/architecture.md` (near `:3630`), `design/inventory.md` (near `:81`)

- [ ] **Step 1: Write the C-entry** "A routine stands in In progress while its run works, and a failed run asks the factory agent first, then a human (2026-11-27, Sebastian)". It amends C16 and states:
  - Sebastian's rule as quoted in this plan's Spec.
  - The seven decisions above. Mark any that Sebastian did not confirm as the director's, provisional.
  - The foot words of Task 4's table, and the drawer's Last words.
- [ ] **Step 2: Change `docs/routines.md`.** Rule 1 says where a working routine stands. The run workflow paragraph names three attempts, the attempt note and the failure card with its close.
- [ ] **Step 3: Change the two other docs** to say In progress for a working run.
- [ ] **Step 4: Commit** to `master` and push to both remotes.

### Task 7: The roll and the live check

- [ ] **Step 1: Roll** with Sebastian's go. Check that the `rolls` table shows main's head live for factoryd and the gateway.
- [ ] **Step 2: Press Run it now on the weekly bump** of `ai-software-factory-code`. #2350 merged the pins at 2026-11-26, so the run most likely ends `no change` after its bump pod.
  - Within 1 s of the press, the drawer's Last row reads "running since".
  - The board shows the bump in In progress with the dot until the outcome.
  - The routine then stands in Queued with its last run.
  - Record the times and a screenshot of each state.
- [ ] **Step 3: Read the run's row and events:** `SELECT run, trigger, started, ended, outcome, note FROM routine_runs WHERE routine='weekly-bump' ORDER BY run DESC LIMIT 1` and the `routine_working` and `routine_run_now` rows of its repository since the press.
- [ ] **Step 4: Say what was not checked live.** The failure path runs only in tests and the console lab, because no safe way exists to make a live routine fail. The first live failure is its check: one held card, the factory agent's turn on it, and its close by the next run that ends well.
