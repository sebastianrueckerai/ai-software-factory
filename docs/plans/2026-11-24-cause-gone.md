# An ask whose cause is gone closes by itself: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Line numbers are from the code repository's main at `535256ea0` (2026-11-24). Main moved to `0d2ead278` while this plan was written, and no file this plan touches changed. Check each line before you edit it.

**Status:** built and landed on the code repository's main on 2026-11-25, in three batches. The section "Outcome" at the end says what landed and what was checked live.

**Goal:** When the reason for a "needs you" ask is gone, the ask closes by itself and says why, and a human who was reading the ask sees where it went.

**Architecture:** Rung 0's `Fire` rows stay the one check of "does the cause still hold". The retake pass runs them once a minute on asks at the human, and `Climb` runs them once more before it hands a case up. Every close of an ask at the human by the factory writes one `question_withdrawn` row with its reason and the moments the reason names. The screens read that row.

**Tech stack:** Go (factoryd, console), PostgreSQL, Temporal, the console lab (Playwright).

**Spec:** Sebastian's rule of 2026-11-24: "If the reason for a 'needs you' ask is gone, the ask closes by itself. The closed ask says why it closed." Display, decided the same day: for an ask on a card that keeps running, the running card shows one line "needed you no more: <reason>" until its next step, and the drawer's history is the lasting record. A factory-filed card that closes this way shows the same line on its face in Done instead of plain "done". There is no separate pile of closed asks.

## Global constraints

- Fix by construction: in code, in a tool's shape or in a check. No new prompt rule.
- One way only: no legacy path, no shim, no second implementation.
- Tests first. Expectations are derived by hand. Never change an assertion to make a test pass.
- Each test that reads time runs on a fixed clock.
- A reason that names a time carries a `factoryd.Moment` under the row's `moments` key. Screens show it in the human's zone (C49). Agents, issue comments, Discord and logs read the UTC words.
- Code, policy and prompts name model aliases (`small`, `big`, `premium`, `vision`), never exact models.
- A human is a human: never a member, an operator or a resource, in copy or in docs.
- No ruling number and no ledger path appears in a tracked file or a commit message. The docs repository's `.githooks/pre-commit` refuses them, and so does the code repository's.
- Unit tests: `go test -race ./internal/factoryd/ ./internal/console/`. Tests on PostgreSQL: `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/pg/`. All tests: `make test`.

## Why this plan exists

On 2026-11-24 the sizing helper of card #2286 (task `t-0d5e3918007a`, source `sizing`, no issue) hit the month cap.

| UTC | What happened |
|---|---|
| 07:03:21 | The gateway refused the helper's session at the month cap. |
| 07:03:25 | `month_cap` case 7517 opened. Rung 0 found "no resolver fits". |
| 07:03:26 | Rung 2, the project chat, got the case, due at 07:38:26. |
| 07:03:35 | The gateway refused the chat's own `operator` call on `big` at the same cap. Rung 2 never ran. |
| 07:30:32 | Sebastian reset the month's count. `CapWaits.Wake` missed the case at rung 2 (fixed since on main by `7f9b7642f`). |
| 07:38:26 | Rung 2's step expired. `ClimbExpired` climbed the case to the human with no new look at the cap. |
| 07:38:30 | The face asked "Wait for it to reset, or end the sizing?", eight minutes after the reset. |
| 08:03:26 | The run's hourly month check ended the wait. The case closed as "the wait ended on its own: the cap no longer binds a session". |

The human was asked for 25 minutes about a cap that no longer held, and the closed ask gave no reason a human could use. The card has no issue, so `EndCase` (act.go:936) wrote no `question_withdrawn` row, and the drawer's history shows no withdrawal at all. The three cards stopped at the month cap since 01:20 (#2272, #2273, #2274, cases 7471 to 7473) closed at 07:31:03 with the same generic reason, while `CapResume` had composed "the month cap's count was reset at 07:30 UTC by sebastian" and kept it only in each card's timeline (activities.go:1048).

Two faults remain open on main:

- `Climb` (ladder.go:360) hands a case to the human without a look at its cause.
- Rung 2 takes a cap case although the cap also refuses the chat's calls. The gateway holds every call against the day cap, the factory's month cap and the project's month cap of the task's repository (gateway/server.go:501-508). The chat's calls run on the project's chat task (chat.go:155-156), so all three caps bind them.

Five ways of closing an ask exist, and they lose the reason in four places:

- The heal pass (`ReconcileCases`, cases_heal.go:26) writes only "card ended <status>" or "the card moved on to <status>", and no row.
- The run's own wait (`EndCase`) writes a row only when the face posted a comment.
- The retake pass (monitor.go:171, ladder.go:1133) writes a row with the rule's words. It does nothing for kinds with no firing row, and the `cap_wait` row (ladder.go:135) fires on nothing.
- The seven watchers that close their own factory card post their reason on the issue. The heal pass then withdraws the case with "card ended done".

## What already works and stays

- The retake pass, `firing` and its guard against a stop that came back (ladder.go:1101-1122), and `Act` as the one door that answers a case.
- `CapResume` (activities.go:995) and the run's `capWait` (workflow.go:4675). The run's wait stays the first way out of a cap stop.
- The events writer `casesFromEvent` (cases_events.go:65-79): a `question_withdrawn` row that names a case withdraws it in the row's own transaction, and one that names none withdraws the card's newest ask.
- The inbox notice "<Card> needs you no more: <reason>." (pokes.go:300-316), which already reads the row's `moments`.

## The closure record

One row is the record of every ask the factory closes at the human: kind `question_withdrawn`, actor `factoryd`, and a detail built by one function, `WithdrawnRow` (Task 1), with `case_id`, `case_kind`, `reason`, `question` and, when the reason names a time, `moments`.

Its writers:

- the retake pass and the new check in `Climb`, through `Act` (act.go:447-455)
- `EndCase` for every case at the human, through `withdrawQuestion` (gatesupervisor.go:281)
- the monitor's withdrawal of a flag (monitor.go:300)
- the heal pass for a case at the human on a card that moved on (Task 2)
- the watchers, through `Timeline.WithdrawAsk` (Task 7)

These closes write no row:

- A case that never reached the human. No human was asked, and its steps hold the record.
- A case on a card that ended ("card ended <status>"). The card's end is the record on every screen.
- A case that a plan revision, a plan's close or a merge decision ended. That event is the record.

The reason is a clause: a lower-case start and no full stop at the end, such as "the month cap's count was reset at 07:30 UTC by sebastian".

**The card's next step.** The face line of Task 10 shows until the card's next step. Take W, the card's newest event that is either `question_asked` or one of the settling kinds of settle.go:19-20. The line shows only when W is a `question_withdrawn` by `factoryd`. The next step is the first of these:

- A new ask, or an answer. Either one becomes the newest such event.
- A second status. The `task_status` rows after W name more than one status.

The resumption itself writes one status. `withdrawQuestion` moves the card from waiting-human to in-review before it writes W (gatesupervisor.go:290-308), so that row comes before W. The rows the run then writes name one status, such as `running` at the gates `intake` and `session`. The card's next status, such as `in-review` for its checks, ends the line. Gates are not counted.

## What closes, on what signal

This table answers which asks close by themselves after this plan, and why.

| Kind | Cause | Signal that it is gone | Action on close | Reason text |
|---|---|---|---|---|
| `day_cap`, `month_cap`, `project_cap` | the cap refuses the session's start | `capLift` (Task 3), the check the run's wait uses: the floor funds under the cap in force, that version has bound at the gateway for `PolicyTTL`, or the UTC period turned | `resume` on rung 0 | "the month cap's count was reset at 07:30 UTC by sebastian", "the month cap of 900.00 EUR in policy version 973 leaves room for a session", "the UTC month turned" |
| `provider_refused` | the provider refused the first call of 6 sessions in a row on the card's model | an allowed call on the same model alias by any card after the case opened (audit rows) | `resume` on rung 0, once per card and model | "a call on big answered at 05:43 UTC, so the provider answers again" |
| `platform_deaths` | 3 platform deaths within 24 hours | no counted death since the newest one for 24 hours, and 3 sessions started after it | the platform card's pass closes its card (done) | "no platform death since 23 November at 14:02 UTC, while 7 sessions started, so the card closes" |
| `factory_month_cap` | the month cap is reached | the month alarm's `closeLifted` (monthcap.go:300) | the watcher closes its card | the watcher's first sentence, such as "sebastian reset the month's count at 07:30 UTC, so the cap card closes" |
| `judgment_budget` | the chat's budget is spent | the chat budget card's `Check` (chat_budget_card.go:144) | the watcher closes its card | "the judgment budget is 40.00 EUR for 2026-11: the card closes" |
| `provider_freeze` | a provider's limit freezes a model class | the freeze card's `close` (freezecard.go:1483) | the watcher closes its card | "the freeze of the big class ended: the freeze held <time>, and the card closes" |
| `red_main` | main is red | a green push run (mainfix.go:494-500) | the watcher closes its card | "<the green run>: the merge queue's pause has ended" |
| `roll_held` | an open plan holds production | the release keeper's `keep` (releasekeeper.go:147, :262) | the watcher closes its card | "no plan is open on main any more, so production goes ahead" |
| `config_refused` | the loader refused a configuration commit | the config alarm's `Resolve` (policy.go:913) | the watcher closes its card | "the factory loaded commit <sha> as version <n>, so this rejection is resolved" |
| the live ask of an alert card | an alert fires | SigNoz clears the alert (signozwebhook.go:613) | the watcher closes its card | "the alert cleared at 2026-11-24T07:30:00Z" |

`dependency_closed`, `platform_fault` and `pod_never_started` stay as they are. The section "Not built and why" says why.

## Store changes

No table changes and no migration. The plan adds three reads: `ModelAnsweredSince` on `audit` (Task 6), `SessionsStartedSince` on `events` (Task 8) and `ClosedAsks` on `events` (Task 10). Each new store method goes into its interface and into the test fakes.

## Review focus

These five conditions are the most likely to hurt a human, and no task's main path exercises them. Each line names the test that pins it.

1. A cause check fires while `Act` refuses its action, for example a lifted cap on a card at its session cap. The ask stays with the human, nothing is written, and `Climb` faces it. Pinned by Task 3, test 3.
2. The run's own wait and the retake pass close the same case in the same second. One row, one resume. Pinned by Task 3, test 5.
3. `Climb` runs under `Act`'s lock on the case, when rung 2's proposal climbs (act.go:706-735). It must not wait for its own lock. Pinned by Task 4, test 3.
4. A human closes a factory card's issue. No "needs you no more" notice goes out, and the Done face reads "done". Pinned by Task 2, test 2, and Task 10, test 3.
5. A watcher's pass fails after it wrote its row. The next pass writes no second row and closes the card. Pinned by Task 7, test 2.

---

### Task 1: Every close of an ask at the human writes one row with its reason

**Files:**
- Modify: `internal/factoryd/cases_events.go` (new `WithdrawnRow`, beside `casesFromEvent` at :25)
- Modify: `internal/factoryd/actions.go:57-65` (`Resolution`)
- Modify: `internal/factoryd/act.go:443-455` (`Act`'s rows), `act.go:930-952` (`EndCase`), `act.go:600` (`withdrawReplaced`)
- Modify: `internal/factoryd/gatesupervisor.go:273-310` (`withdrawQuestion`)
- Modify: `internal/factoryd/monitor.go:275`, `monitor.go:300-316` (`withdrawAtHuman`)
- Modify: `internal/factoryd/caseface.go:92-98` (export `momentsOf` as `MomentsOf`, and update its callers)
- Test: `internal/factoryd/pg/act_pg_test.go`, `internal/factoryd/monitor_test.go`

**Interfaces:**
- Produces: `func WithdrawnRow(c Case, reason string, said Moments) map[string]any`. It returns `case_id`, `case_kind`, `reason`, `question` (`textutil.Truncate(EscalationQuestion(q), 300)` of `faceOf(c)`, left out when empty) and `moments` (`said.In(reason)`, left out when empty).
- Produces: `func (r *Runner) EndCase(ctx context.Context, caseID int64, reason string, said Moments) error`.
- Produces: `Resolution.Moments Moments` with JSON tag `moments,omitempty`: the instants `Note` names.
- Produces: `func MomentsOf(row map[string]any) Moments`.

- [ ] **Step 1: Write the failing tests**
  1. `TestEndCaseOfAnAskOnACardWithNoIssueWritesItsRow` (pg, `act_pg_test.go`). Set up a card with issue 0 in `waiting-human` and a `month_cap` case at the human with a `question_asked` row and no comment. Call `EndCase(ctx, id, "the month cap's count was reset at 07:30 UTC by sebastian", Moments{{At: 2026-11-24T07:30:32Z, Layout: LayoutClock}})`. Expect one `question_withdrawn` row by `factoryd` whose detail holds that `case_id`, that `reason` and `moments` `[{"at":"2026-11-24T07:30:32Z","layout":"15:04"}]`. Expect the case `withdrawn` with `resolution.reason` equal to the reason, and the card `in-review`.
  2. `TestEndCaseOfAnOpenCaseWritesNoRow` (pg, same file). A case still `open` with no face ends `withdrawn`, and no `question_withdrawn` row is written.
  3. Update `TestRetakeTakesAGreenChecksWaitOnFactsReadWhole` (monitor_test.go:107): its row's detail equals `WithdrawnRow(stop, "every check on head h2 is green, so the factory resumed the checks wait", nil)` plus `"action": "wait_checks"`.
  4. A monitor test of `withdrawAtHuman`: its row now holds `question`, the flag's question, beside `case_id`, `case_kind` and `reason`.
- [ ] **Step 2: Run the tests and see them fail**
  Run: `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/pg/ -run 'TestEndCaseOf'` and `go test -race ./internal/factoryd/ -run 'TestRetake|TestMonitor'`.
  Expect: the first test fails with no row, and the others fail to compile on `WithdrawnRow`.
- [ ] **Step 3: Implement**
  - In `EndCase`, send every case at the human (`c.Status == CaseAtHuman || c.CommentID != 0`) through `withdrawQuestion`. A case still open goes straight to `WithdrawCase`, as today.
  - `withdrawQuestion` takes `said Moments` and builds its detail with `WithdrawnRow` plus `comment` and `withdrawal`. The activity `WithdrawQuestion` (gatesupervisor.go:265) keeps its signature and passes nil.
  - `Act`'s rung-0 row on a case at the human (act.go:447-450) becomes `WithdrawnRow(c, said, res.Moments)` plus `action`.
  - `Act`'s `question_answered` row gets `moments` too, when `res.Moments.In(said)` holds any. The check in `Climb` (Task 4) answers open cases through it.
  - `withdrawAtHuman` builds its detail with `WithdrawnRow(c, reason, nil)` plus `withdrawal`. Keep its `problem` key.
  - `withdrawReplaced` and the monitor (monitor.go:275) pass nil moments. The workflow keeps calling `EndCase` with two arguments until Task 3. The Temporal SDK leaves a missing trailing argument at its zero value (`converter.CompositeDataConverter.FromPayloads`, go.temporal.io/sdk v1.44.0).
- [ ] **Step 4: Run the tests and see them pass**, then `make test`.
- [ ] **Step 5: Commit** "An ask the factory closes at the human writes one withdrawal row with its reason and its times, on a card with no issue too".

**Live check.** Run this after the roll, a day later. Expect no row. `:rolled_at` is the roll's time.

```sql
select c.id, c.kind, c.resolution->>'reason' from cases c
where c.status = 'withdrawn' and c.resolved_at > :rolled_at
  and exists (select 1 from case_steps s where s.case_id = c.id and s.rung = 3)
  and c.resolution->>'reason' not like 'card ended %'
  and c.resolution->>'reason' not like 'plan revision %'
  and c.resolution->>'reason' not like 'the card moved on to %'
  and c.kind not in ('merge_approval', 'plan_question', 'plan_confirmation', 'plan_held', 'plan_criteria')
  and not exists (select 1 from events e where e.task_id = c.task_id and e.kind = 'question_withdrawn'
                  and (e.detail->>'case_id')::bigint = c.id);
```

### Task 2: The heal pass writes the row for an ask on a card that moved on

**Files:**
- Modify: `internal/factoryd/cases_heal.go:77-84` (the "moved on" query) and `cases_heal.go:135-160` (`withdrawCases`)
- Test: `internal/factoryd/pg/cases_heal_pg_test.go`

**Interfaces:**
- Consumes: `WithdrawnRow` (Task 1), `PGStore.Record` (event_store.go:242).

- [ ] **Step 1: Write the failing tests** in `cases_heal_pg_test.go`
  1. `TestReconcileWithdrawsAMovedOnAskWithItsRow`. Put a case at the human on a card that moved to `running`. Expect `Moved: 1`, one `question_withdrawn` row by `factoryd` with reason "the card moved on to running" that names the case, and the case withdrawn with that reason.
  2. `TestReconcileWritesNoRowForAnEndedCard`. Put a case at the human on a card that ended `done`. Expect the case withdrawn with "card ended done" and no `question_withdrawn` row.
  3. A case still `open` that moved on ends with no row, as today.
- [ ] **Step 2: Run** `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/pg/ -run TestReconcile`. Expect test 1 to fail with no row.
- [ ] **Step 3: Implement.** Give `withdrawCases` a switch for the "moved on" query alone. For each case it lists, read the case (`CaseByID`). Withdraw a case at the human by recording `Event{Repository, TaskID, IssueNumber, Kind: EventQuestionWithdrawn, Actor: FactoryDecider, Via: ViaFactoryd, Detail: WithdrawnRow(c, reason, nil)}` through `s.Record`. The events writer withdraws it in the row's transaction. Every other case, and every case of the "card ended" and "plan revision" queries, keeps `withdrawCase`. Count both ways in `Moved`.
- [ ] **Step 4: Run the tests and see them pass**, then `make test`.
- [ ] **Step 5: Commit** "The heal pass records the withdrawal of an ask whose card moved on".

**Live check.** Task 1's query, without the line `not like 'the card moved on to %'`, returns no row.

### Task 3: One cap check serves the run's wait, the cap row and the words

**Files:**
- Modify: `internal/factoryd/activities.go:966-1050` (`CapCheck`, `CapResumed`, `CapResume`)
- Modify: `internal/factoryd/ladder.go:133-135` (the `cap_wait` row)
- Modify: `internal/factoryd/casefacts.go:279` (`capWaitKinds`, read in reverse by the row)
- Modify: `internal/factoryd/workflow.go:4227-4233` (`waitEnd`), `workflow.go:4506`, `workflow.go:4568-4572` (`endCase`), `workflow.go:4675-4799` (`capWait`)
- Modify: `internal/factoryd/plan.go:2662-2676` (`leavePlanWait`), `internal/factoryd/toolpark.go:812` (`imageReady`)
- Test: `internal/factoryd/activities_test.go`, `internal/factoryd/monitor_test.go`, `internal/factoryd/workflow_test.go`

**Interfaces:**
- Produces: `func (r *Runner) capLift(ctx context.Context, in CapCheck) (CapResumed, error)`, the check of `CapResume` with no record.
- Produces: `CapResumed.Why string` and `CapResumed.Moments Moments`, set when `Resume` is true.
- Produces: `waitEnd.said() Moments`, and `func (t *taskRun) endCase(reason string, said Moments)`.
- Consumes: `EndCase(ctx, caseID, reason, said)` and `Resolution.Moments` (Task 1).

- [ ] **Step 1: Write the failing tests**
  1. `activities_test.go`: in `TestCapResumeMonthRaise` (:3424), the end's words become "the month cap of 600.00 EUR in policy version 8 leaves room for a session", in `res.Why` and in the `cap_resumed` step. In `TestCapResumeNamesTheResetOnTheWaitsChecks` (:3551), the version rows read "the day cap of 40.00 EUR in policy version 7 leaves room for a session". `res.Moments` is `[{2026-11-20T14:02Z, "15:04"}]` for today's reset, `[{2026-11-18T09:00Z, "2 Jan 15:04"}]` for the reset of 18 November, and nil for the version's words.
  2. `monitor_test.go`, `TestRetakeTakesAMonthCapAskWhoseCountWasReset`. Build it on `newCapRig` (activities_test.go:3369) for the cap state and the retake pass of `TestRetakeTakesAGreenChecksWaitOnFactsReadWhole` (:107).
     - Setup: a `month_cap` case of t1 at the human, opened 2026-11-24 07:03:25, with facts model `small`. Version 7 activated 06:00. A month reset at 07:30:32 by sebastian leaves 800 EUR of the month free. The clock reads 07:31:00.
     - Expect the case resolved by `factoryd` on rung 0 with action `resume` and reason "the month cap's count was reset at 07:30 UTC by sebastian".
     - Expect one `question_withdrawn` row with that reason and moments `[{2026-11-24T07:30:32Z, "15:04"}]`, and the run told `case_resolved`.
     - With no reset and the month spent, the pass writes nothing.
  3. Same file, `TestRetakeLeavesALiftedCapAtTheSessionCap`. The cap is lifted as in test 2, but the card's attempts equal its session cap. `ActResume` is refused, so the case stays at the human with no step, no row and no signal.
  4. `workflow_test.go`: in `TestWorkflowMonthCapResumesOnAPolicyLoad` (:2542), the `CapResume` mock returns `{Resume: true, Why: "the month cap of 600.00 EUR in policy version 8 leaves room for a session"}`. Expect `EndCase` with `(caseID, that why, nil)`, with no "the wait ended on its own: " in front. In `TestWorkflowMonthCapWaitEndsAtTheMonthsTurn` (:2606), a turn whose check fails ends the case with "the UTC month turned". Update the fake at :301 and the mock at :389 to three arguments.
  5. `monitor_test.go`, `TestARetakeAfterTheRunsOwnEndWritesNothing`. The run's `EndCase` closed the case first. Retake meets `ErrCaseEnded`, writes no second row and sends no signal.
- [ ] **Step 2: Run** `go test -race ./internal/factoryd/ -run 'TestCapResume|TestRetake|TestWorkflowMonthCap|TestARetake'`. Expect failures on the words and on the missing fields.
- [ ] **Step 3: Implement**
  - Move `CapResume`'s body into `capLift`. `CapResume` becomes `capLift` plus the `cap_resumed` record of `Why`.
  - The words are as follows:
    - A reset: today's words, with `Moments{{reset.At, resetLayout(reset.At, r.Clock())}}`.
    - A version: "the <name> of <EUR> EUR in policy version <id> leaves room for a session". The amount is `budget.day_eur`, `budget.month_eur`, or the project's from `v.ProjectCap(task.Repository)`.
    - A turn and another refusal: today's words.
  - The `cap_wait` row's `Fire` calls `capLift` with `CapCheck{TaskID: c.TaskID, Model: c.Facts["model"], Decision: the cap of c.Kind, Turned: !now.Before(CapTurn(decision, c.OpenedAt))}`. `RefusedAt` stays zero, as in the wait's own checks. On `Resume` it returns `rungZeroTakes(f, Resolution{Action: ActResume, Note: Why, Moments: Moments})`. `Took` returns `res.Note`. Update the row's comment and the comment of `TestRetakeReadsOnlyKindsWithAFiringRow` (monitor_test.go:158). That test's day-cap case has a zero `OpenedAt`, which the row reads as a period that turned. Give the case an `OpenedAt` on the rig's day, so the test still takes nothing.
  - `capWait.resumed` keeps the resuming check's `Why` and `Moments`. `name()` is the kept `Why`. Two other cases remain. A turn whose check failed names the turn, "the UTC <period> turned". A check recorded before this change, which carries no `Why`, keeps today's words, "the <name> no longer binds a session".
  - `waitEnd` gains `said() Moments`. `imageReady` returns nil.
  - `awaitHumanUntil` (workflow.go:4506) and `leavePlanWait` (plan.go:2673) call `t.endCase(end.name(), end.said())` with no prefix. `endCase` passes the moments as the activity's third argument. Every other `endCase` caller passes nil.
  - No version gate. Only activity inputs change, and Temporal's replay compares commands, not inputs. Run `ladder_replay_test.go` and the workflow replays to confirm it.
- [ ] **Step 4: Run the tests and see them pass**, then `make test`.
- [ ] **Step 5: Commit** "A cap ask closes once the cap no longer binds, by the run's wait or by rung 0, and names who reset the count and when, the cap in force, or the period's turn".

**Live check.** Every UTC day turn ends the open day-cap waits, so no human press is needed. A day after the roll, list the cap cases that ended since:

```sql
select c.id, c.kind, c.status, c.resolution->>'reason' from cases c
where c.kind in ('day_cap', 'month_cap', 'project_cap') and c.resolved_at > :rolled_at;
```

No reason reads "the wait ended on its own: the cap no longer binds a session". Each reads a reset, a cap in force, a turn or another floor refusal. Each one that had reached the human has a `question_withdrawn` row with the same reason.

### Task 4: Climb checks the cause before it hands a case up

**Files:**
- Modify: `internal/factoryd/ladder.go:395-401` (`Climb`), `ladder.go:1129-1159` (`retake`)
- Modify: `internal/factoryd/monitor.go:195-200`
- Test: `internal/factoryd/pg/rung2_pg_test.go`, `internal/factoryd/pg/act_propose_pg_test.go`, `internal/factoryd/ladder_test.go`

**Interfaces:**
- Produces: `func (r *Runner) retake(ctx context.Context, c Case) (*Resolution, error)`, the resolution `Act` took, nil for none.
- Consumes: the `cap_wait` row (Task 3).

- [ ] **Step 1: Write the failing tests**
  1. `TestRung2ExpiryOfALiftedCapAsksNobody` (pg, `rung2_pg_test.go`, beside `TestRung2ExpiryFacesTheHumanOnce` at :311). It replays the incident.
     - Setup: an issue-less card with source `sizing` has a `month_cap` case opened 07:03:25. Rung 2's step started 07:03:26, due 07:38:26. The month's count was reset at 07:30:32 by sebastian. The clock reads 07:38:27.
     - Run `WakeCases`.
     - Expect the case resolved by `factoryd` on rung 0 with action `resume` and reason "the month cap's count was reset at 07:30 UTC by sebastian".
     - Expect no `question_asked` row, no rung 3 step, the card not in `waiting-human`, and `case_resolved` signalled.
     - With no reset and the month spent, the existing assertions of `TestRung2ExpiryFacesTheHumanOnce` hold.
  2. `TestClimbFromRungOneTakesAGreenChecksWait` (`ladder_test.go`). Rung 1 hands up a `gate_stop` whose checks on head h2 turned green meanwhile. Expect the case resolved on rung 0 with `wait_checks`, no rung 2 step and no face.
  3. `TestAProposalClimbsUnderItsLockWithNoCheck` (pg, `act_propose_pg_test.go`). Below autonomous, rung 2 proposes on an open `gate_stop` whose checks are green. `Act` returns the proposal within the test's 5-second context, with no lock timeout, and the case is at the human. The next `Retake` takes it with `wait_checks`.
- [ ] **Step 2: Run** the three tests. Expect tests 1 and 2 to face the human, which makes them fail.
- [ ] **Step 3: Implement**
  - In `Climb`, after the check that the live case is still open (ladder.go:399-401), and before `startRung2` and `Face`, run the cause check when `firesOn(live.Kind)` holds and `r.TryLockCase(live.ID)` succeeds. Release the lock at once, then call `r.retake(ctx, live)`.
  - When `retake` returns a resolution, `Climb` returns `TripOutcome{CaseID: c.ID, Resolution: res}`. It starts no rung 2 and asks nobody.
  - When the lock is held, skip the check. Only `Act` holds the lock in a climb, for rung 2's proposal. The retake pass checks that case within a minute once it is at the human.
  - `retake` keeps its body and returns the resolution it took. `Monitor.retake` drops it.
- [ ] **Step 4: Run the tests and see them pass**, then `make test`.
- [ ] **Step 5: Commit** "A case whose cause is gone closes before a rung hands it to the human".

**Live check.** A day after the roll, both queries return no row. The first lists the shape of the incident: a month-cap ask that reached the human after a reset of the month's count.

```sql
select c.id from cases c join case_steps f on f.case_id = c.id and f.rung = 3
where c.kind = 'month_cap' and f.started_at > :rolled_at
  and exists (select 1 from cap_resets r where r.cap = 'month' and r.at > c.opened_at and r.at < f.started_at);
```

The second lists the cases rung 0 took from the human within 2 minutes of their face, which `Climb` should have taken itself:

```sql
select c.id, c.kind from cases c join case_steps f on f.case_id = c.id and f.rung = 3
where f.started_at > :rolled_at and c.resolution->>'by' = 'factoryd' and c.resolution->>'rung' = '0'
  and c.resolved_at < f.started_at + interval '2 minutes';
```

### Task 5: Rungs 1 and 2 run only when the caps leave room for their call

**Files:**
- Modify: `internal/factoryd/ladder.go:520-551` (`judgmentSpent`), `ladder.go:402` (the climb past rung 2), `ladder.go:555-563` (`stepOnce`), `ladder.go:611-615` (the marks)
- Modify: `internal/factoryd/cases.go:126-133` (the rows of the three caps), `cases.go:498` (`notJudgedMarks`)
- Test: `internal/factoryd/pg/judgment_budget_pg_test.go`, the kind table's test

**Interfaces:**
- Produces: `markCapRefused = "not judged: a cap refuses the rungs' calls"`.

- [ ] **Step 1: Write the failing tests**
  1. `TestRungsSkipACaseWhileTheMonthCapRefusesTheirCall` (pg, `judgment_budget_pg_test.go`).
     - Setup: the month cap is 800 EUR and 800 EUR is booked this month. The chat task has 20 EUR of budget and none spent. A `month_cap` case opens.
     - Expect no rung 1 or rung 2 step, and a rung 0 step whose `found` starts with "not judged: a cap refuses the rungs' calls: ".
     - Expect the face at once, with the agent's view "The factory agent did not judge it: the month cap refuses its model calls too.", and no `chat_budget_spent` row.
     - With 10 EUR of the month free, rung 2's step starts.
  2. The kind table's test: the rows of `day_cap`, `month_cap` and `project_cap` give `NoRung1` and `Rung2Why` as "only a human lifts the day cap: a reset of its count in the status panel or a raise by a commit". The month and project rows name "the month cap" and "the project's month cap".
- [ ] **Step 2: Run** `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/pg/ -run TestRungsSkip`. Expect rung 2 to start, which fails the test.
- [ ] **Step 3: Implement**
  - In `judgmentSpent`, once the chat task's own budget passes, read the caps the chat's call is held against. Take `n := needOf(ctx, v, chat, model, false)`, `_, free, err := r.store.Free(ctx, n.req)` and `policy.FitResource(free, policy.HoldRequest{TaskID: chat.ID, Kind: policy.KindModel, Ref: n.req.Ref, Project: n.req.Project, EUR: n.eur})`.
  - If the refusal's decision is a cap of `capOpenings`, return `notJudged` with `markCapRefused`. Its found is "<mark>: <the refusal's reason, scrubbed>". Its seen is "The factory agent did not judge it: <capOpenings[d].name> refuses its model calls too.".
  - No judgment card is filed for a cap refusal. With no prices, nothing is read, as today.
  - Add the mark to `notJudgedMarks` and to `stepOnce`'s prefixes. At ladder.go:402, skip rung 2 after either money mark.
  - `Rung2` of the three caps stays `rung2Analyses`. If a cap leaves room for one chat call but not for a session, the chat still writes its analysis.
- [ ] **Step 4: Run the tests and see them pass**, then `make test`.
- [ ] **Step 5: Commit** "A rung that a cap would refuse does not take the case, and the cap asks say a reset in the status panel lifts them".

**Live check.** A day after the roll, this returns no row. It lists rung 2 steps that expired while the gateway refused a chat task's calls at a cap.

```sql
select s.id from case_steps s
where s.rung = 2 and s.started_at > :rolled_at and s.found like 'the rung did not answer within %'
  and exists (select 1 from audit a where a.task_id like 't-chat-%'
              and a.decision in ('refused_day_cap', 'refused_month_cap', 'refused_project_cap')
              and a.ts between s.started_at and s.ended_at);
```

### Task 6: A provider stop closes once another call on its model answers

**Files:**
- Modify: `internal/factoryd/store.go:1988-1998` (beside `ModelAnswered`), the `Store` interface and `fakeStore` (store_test.go)
- Modify: `internal/factoryd/ladder.go:105-188` (a new row, `provider_answers`), `ladder.go:1408-1418` (`tripKey`)
- Modify: `internal/factoryd/cases.go:143` (`Rung0: []string{"provider_answers"}`)
- Test: `internal/factoryd/monitor_test.go`, `internal/factoryd/ladder_test.go`, `internal/factoryd/pg/cases_pg_test.go`

**Interfaces:**
- Produces: `func (s *PGStore) ModelAnsweredSince(ctx context.Context, alias string, since time.Time) (time.Time, error)`. It returns the earliest `audit` row after `since` with `model_alias = alias`, `tool = ''` and `decision = 'allowed'`, from any task and of any kind. Zero means none.

- [ ] **Step 1: Write the failing tests**
  1. `TestRetakeResumesAProviderStopOnceItsModelAnswers` (`monitor_test.go`).
     - Setup: a `provider_refused` case of t1 at the human, opened 2026-11-18 05:00:00, with facts model `big`. Another card has an allowed call on `big` at 05:43:10. The clock reads 05:44.
     - Expect the case resolved on rung 0 with `resume` and reason "a call on big answered at 05:43 UTC, so the provider answers again", with moments `[{2026-11-18T05:43:10Z, "15:04"}]`.
     - An allowed call on `small` alone, or one at 04:59, leaves the case at the human with nothing written.
  2. `TestAProviderStopThatCameBackStaysWithTheHuman` (same file). An earlier `provider_refused` case of t1 on `big` was resolved on rung 0. Retake writes nothing, and `Climb` faces the new case.
  3. `TestTripKeyOfAProviderStopIsItsModel` (`ladder_test.go`). The reasons with status 429 and status 503 on `big` give one key, and `small` gives another.
  4. `TestModelAnsweredSince` (pg, `cases_pg_test.go`). It returns the earliest allowed call after `since` and skips refused rows, tool rows and other aliases.
- [ ] **Step 2: Run** the tests. Expect them to fail to compile on the new store read.
- [ ] **Step 3: Implement**
  - The row `provider_answers` reads `c.Facts["model"]`. An empty model fires nothing.
  - Otherwise `at := r.store.ModelAnsweredSince(ctx, model, c.OpenedAt)`, and a zero `at` fires nothing.
  - Then return `rungZeroTakes(f, Resolution{Action: ActResume, Note: "a call on " + model + " answered at " + said.Say(at, resetLayout(at, now)) + ", so the provider answers again", Moments: said})`. `Took` returns `res.Note`.
  - `tripKey` keys `provider_refused` by its model: `caseStateKey(kind, "model "+f.Model, "")`. The guard in `firing` (ladder.go:1108-1111) then keeps a second stop on the same model with the human. No live `provider_refused` case exists on 2026-11-24, so no stored key needs a change.
- [ ] **Step 4: Run the tests and see them pass**, then `make test`.
- [ ] **Step 5: Commit** "A card stopped by its provider resumes once a call on its model answers again, once per card and model".

**Live check.** After the roll this returns no row, which means no card was resumed twice this way:

```sql
select task_id, count(*) from cases
where kind = 'provider_refused' and resolution->>'by' = 'factoryd' and resolution->>'rung' = '0' and resolved_at > :rolled_at
group by task_id having count(*) > 1;
```

### Task 7: The watchers' reasons reach the case

**Files:**
- Modify: `internal/factoryd/timeline.go` (new `WithdrawAsk`)
- Modify the call sites:
  - `monthcap.go:322-333` (`closeLifted`)
  - `chat_budget_card.go:161-170` (`Check`)
  - `freezecard.go:1483-1490` (`close`, before `w.end`)
  - `mainfix.go:494-500` (`endFixCard`, the human branch)
  - `releasekeeper.go:147` and `releasekeeper.go:262` (`keep`, before `closeAsk`)
  - `policy.go:933-936` (`Resolve`)
  - `signozwebhook.go:613-635` (`closeCleared`, before `endCard`)
- Test: `monthcap_test.go`, `chat_budget_card_test.go`, `freezecard_test.go`, `mainfix_test.go`, `releasekeeper_test.go`, `policy_test.go`, `signozwebhook_test.go`

**Interfaces:**
- Produces: `func (tl *Timeline) WithdrawAsk(ctx context.Context, t Task, sentence string, said Moments) error`. It reads the card's newest live ask (`tl.Store.NewestAskCase`). With none, it does nothing. Otherwise it writes `question_withdrawn` by `factoryd` through `tl.WriteRow` with `WithdrawnRow(c, clause(closeBodyReason(sentence)), said)`.
- Produces: `func clause(sentence string) string`, the sentence with a lower-case first letter and no full stop at the end.

- [ ] **Step 1: Write the failing tests.** Add one test per watcher, in the watcher's own test file. After the pass, the card's case is `withdrawn` with the clause below as its reason, and one `question_withdrawn` row carries it.
  1. The clauses:
     - monthcap: "sebastian reset the month's count at 07:30 UTC, so the cap card closes", with moments `[{2026-11-24T07:30:32Z, "15:04"}]`. Also "the month cap is 900.00 EUR in policy version 973, so the cap card closes" and "the UTC month 2026-10 ended, so the cap card closes".
     - chat budget: "the judgment budget is 40.00 EUR for 2026-11: the card closes"
     - freeze: "the freeze of the big class ended: the freeze held <freezeHeld's words>, and the card closes"
     - red main: "<the green run's words>: the merge queue's pause has ended"
     - release keeper: "no plan is open on main any more, so production goes ahead"
     - config: "the factory loaded commit <sha> as version <n>, so this rejection is resolved"
     - SigNoz: "the alert cleared at 2026-11-24T07:30:00Z", with moments `[{2026-11-24T07:30:00Z, "2006-01-02T15:04:05Z07:00"}]`
  2. `monthcap_test.go`, `TestACapCardWhoseCloseFailedWritesOneRow`. The issue's close fails after the row. The next pass writes no second row and closes the card.
  3. The shared paths write no row. The release keeper's "Deploy now" (releasekeeper.go:538), the freeze card's retry and give-up (freezecard.go:883, :1263) and SigNoz's `CloseCompletedJobs` (signozwebhook.go:738) leave the case to their own answer.
- [ ] **Step 2: Run** `go test -race ./internal/factoryd/ -run 'MonthAlarm|ChatBudgetCard|FreezeCard|Roller|ReleaseKeeper|ConfigAlarm|AlertIntake|ACapCard'`. Expect "card ended done", or no row, which fails the tests.
- [ ] **Step 3: Implement.** Each cause-gone path calls `WithdrawAsk` with its comment before it closes the issue or ends the card. If the write fails, the watcher returns or continues as it does for a failed close, and it closes nothing this pass. The comments, the order of the closes and the statuses stay as they are. The month cap's reset path passes `Moments{{m.Reset.At, resetLayout(m.Reset.At, now)}}`. SigNoz passes `Moments{{At: the parsed resolved_at, Layout: LayoutRFC3339}}`.
- [ ] **Step 4: Run the tests and see them pass**, then `make test`.
- [ ] **Step 5: Commit** "A card the factory files and closes when its cause is gone closes its ask with the same reason".

**Live check.** A week after the roll, this returns no row:

```sql
select t.id from tasks t join cases c on c.task_id = t.id
where t.kind = 'human' and t.finished_at > :rolled_at and c.resolution->>'reason' like 'card ended %'
  and exists (select 1 from intake_events i where i.task_id = t.id and i.kind = 'factory_closed');
```

### Task 8: A platform card closes after a quiet day

**Files:**
- Modify: `internal/factoryd/platformcard.go:29-41` (store: `SessionsStartedSince`), `platformcard.go:64-131` (`Check`)
- Modify: `internal/factoryd/event_store.go` (`PGStore.SessionsStartedSince`)
- Test: `internal/factoryd/platformcard_test.go`

**Interfaces:**
- Produces: `SessionsStartedSince(ctx context.Context, since time.Time) (int, error)`, the count of `session_started` rows of every card after `since`.
- Produces: `const platformQuietLead = "No platform death since "`.
- Consumes: `Timeline.WithdrawAsk` (Task 7).

- [ ] **Step 1: Write the failing tests** in `platformcard_test.go`, on the clock 2026-11-24 15:00 UTC.
  1. `TestPlatformCardClosesAfterAQuietDay`.
     - Setup: the open card was filed 2026-11-23 14:10. Deaths fell at 13:50, 13:58 and 14:02 on 23 November. 7 `session_started` rows came after 14:02.
     - Expect the card `done`, with the comment "No platform death since 23 November at 14:02 UTC, while 7 sessions started, so the card closes."
     - Expect one row with the clause of that comment and moments `[{2026-11-23T14:02Z, "2 January at 15:04"}]`.
     - At 2026-11-24 14:01 the card stays. With 2 sessions it stays.
  2. `TestAPlatformCardAfterAQuietCloseStaysWithTheHuman`. The newest ended platform card's `factory_closed` body starts with `platformQuietLead`. The open card stays after a quiet day.
- [ ] **Step 2: Run** `go test -race ./internal/factoryd/ -run TestPlatformCard`. Expect the card to stay open, which fails the tests.
- [ ] **Step 3: Implement.** In `Check`, with an open card:
  1. Take `last`, the newest death in `deaths` after its filters, else the card's `CreatedAt`.
  2. Close the card when all three hold: `last` is at or before `now - platformDeathsWindow`, `SessionsStartedSince(last)` is at least `platformDeathsFile`, and the newest ended platform card's `factory_closed` body does not start with `platformQuietLead`.
  3. To close it, call `WithdrawAsk`, then `closeIssueAsFactory` with the sentence, then `TransitionTask(waiting-human → done)`, as `chat_budget_card.go:170-174` does.
- [ ] **Step 4: Run the tests and see them pass**, then `make test`.
- [ ] **Step 5: Commit** "The platform's card closes itself after a day with no platform death while sessions ran, unless the card before it closed the same way".

**Live check.** For each platform card this rule closed, no counted death falls in the 24 hours before its `finished_at`:

```sql
select t.id, t.finished_at,
       (select count(*) from pod_deaths d where d.at > t.finished_at - interval '24 hours' and d.at <= t.finished_at) as deaths_in_window
from tasks t join intake_events i on i.task_id = t.id and i.kind = 'factory_closed' and i.body like 'No platform death since %'
where t.source = 'platform_deaths';
```

Take the column names of `pod_deaths` from migration `20261129100000_cluster_facts.sql`. A row with deaths that a cold start explains is not counted.

### Task 9: Every reader names the reason

**Files:**
- Modify: `internal/factoryd/settle.go:246-263` (`ReasonLead`)
- Modify: `internal/console/chat.go:346` (`chatRow`), `chat.go:662`, `chat.go:673`, `internal/console/static/chat.js:140-144` (`reasonHTML`)
- Modify: `internal/console/life.go:20-31` (`run`), `life.go:87-98` (`point`), `life.go:120-123`, `internal/console/templates/opened.html:39`
- Modify: `internal/factoryd/carddigest.go:680-689` (`askOutcome`), `internal/factoryd/carddigest_detail.go:189-194` (the case line)
- Test: `settle_test.go`, `internal/console/chat_test.go`, `internal/console/life_test.go`, `carddigest_test.go`, `carddigest_detail_test.go`

- [ ] **Step 1: Write the failing tests**
  1. `settle_test.go:252`: add a factory `question_withdrawn` row whose reason is "the month cap's count was reset at 07:30 UTC by sebastian". Its lead is "withdrawn: the month cap's count was reset at 07:30 UTC by sebastian", and its line ends " · 09:30". A row with no reason still reads "withdrawn".
  2. `chat_test.go`, `TestASettledAskNamesItsReasonInTheReadersZone`. The settled row's JSON has that `reason` and `reason_times` with one entry at 2026-11-24T07:30:32Z in the screen layout of `LayoutClock`.
  3. `life_test.go:81`: a row with no question reads "withdrawn because the flag no longer holds", with no ": " after it. A row with moments puts them on its run.
  4. `carddigest_test.go`: the ask step of a case the factory closed reads "month_cap: <problem>; closed by the factory: the month cap's count was reset at 07:30 UTC by sebastian". `carddigest_detail_test.go`: the case line reads "case 7517 month_cap, resolved by factoryd: resume because the month cap's count was reset at 07:30 UTC by sebastian".
- [ ] **Step 2: Run** `go test -race ./internal/factoryd/ ./internal/console/ -run 'ReasonLine|SettledAsk|RunsOfACardsLife|CardDigest|CardStep'`. Expect the old words.
- [ ] **Step 3: Implement**
  - In `ReasonLead`, a `question_withdrawn` by the factory with a reason reads "withdrawn: <reason>". The messenger's edit (sender.go:209), the inbox's text for agents (console/inbox.go:146) and the console chat all read it through this one function.
  - `chatRow` gains `ReasonTimes []screenTime` with JSON tag `reason_times,omitempty`, from `screenTimes(factoryd.MomentsOf(s.Event.Detail).In(reason))`. `reasonHTML` renders `timed(esc(m.reason), m.reason_times)`.
  - `point` carries the row's moments, and `run` gathers them as `Moments`. opened.html:39 renders `{{timed .Note .Moments}}`.
  - `askOutcome` appends "; closed by the factory: <reason>" for a case `factoryd` ended, withdrawn or resolved on rung 0, with a reason. The case line appends " because <reason>". Agents read the stored UTC words.
- [ ] **Step 4: Run the tests and see them pass**, then `make test`.
- [ ] **Step 5: Commit** "The chat, the card's life and the agent's card read say why the factory closed an ask".

**Live check.** No press needed: Task 1's live query, and the lab check of Task 10, which opens the chat.

### Task 10: The card shows why it needed you no more

**Files:**
- Modify: `internal/factoryd/event_store.go:460` (beside `NewestTaskEvents`: `ClosedAsks`), the `factoryd.Events` interface, `internal/console/agentdoc.go:345` and the test fakes
- Modify: `internal/console/board.go:445-543` (`card`), `board.go:1915-1960` (`finishCards`)
- Modify: `internal/console/faceview.go:25-58` (`faceView`), `faceview.go:73-92` (`text`), `faceview.go:146-188` (`faceOf`), `faceview.go:410-443` (`stateOf`)
- Modify: `internal/console/templates/face.html:4-15` and the head line of the opened card in `templates/opened.html`
- Modify: `internal/console/lab_test.go:443-447` (a new scene), `scripts/console-lab/check.js`
- Test: `internal/factoryd/pg/console_store_pg_test.go`, `internal/console/faceview_test.go`

**Interfaces:**
- Produces: `type ClosedAsk struct { At time.Time; Reason string; Moments Moments; Statuses int }`.
- Produces: `func (s *PGStore) ClosedAsks(ctx context.Context, tasks []string) (map[string]ClosedAsk, error)`. A card is in the map when its newest event of kind `question_asked` or of `answerKinds` (settle.go:19-20) is a `question_withdrawn` by `factoryd` with a reason. `Statuses` counts the distinct statuses of the card's `task_status` rows after that row. Read it with one lateral query on `events_task_id_idx`. No migration is needed.

- [ ] **Step 1: Write the failing tests**
  1. `TestClosedAsksNamesTheFactorysNewestClose` (pg, `console_store_pg_test.go`). Each card gets its rows in order.
     - Card A: `question_asked`, `task_status` waiting-human, `task_status` in-review, a factory `question_withdrawn` with reason R and moments, then `task_status` running at the gates intake and session. A is in the map with R, its moments and `Statuses: 1`.
     - Card B: as A, then `task_status` in-review. B is in the map with `Statuses: 2`.
     - Card C: a withdrawal, then a new `question_asked`. C is absent.
     - Card D: a withdrawal, then a `question_answered` by sebastian. D is absent.
     - Card E: a `question_withdrawn` by sebastian. E is absent.
  2. `TestARunningCardSaysWhyItNeededYouNoMore` (`faceview_test.go`).
     - A running card with `ClosedAsk{Reason: "the month cap's count was reset at 07:30 UTC by sebastian", Moments: [{2026-11-24T07:30:32Z, LayoutClock}], Statuses: 1}`. Its face text holds "Needed you no more: the month cap's count was reset at 07:30 UTC by sebastian.", and its HTML holds `<time datetime="2026-11-24T07:30:32Z"`.
     - With `Statuses: 2`, or with the card in Needs you, the line is absent.
  3. `TestAFactoryCardInDoneSaysWhyItClosed` (`faceview_test.go`).
     - A human card in `done` with `ClosedAsk{Reason: "sebastian reset the month's count at 07:30 UTC, so the cap card closes"}`. Its state reads "needed you no more: sebastian reset the month's count at 07:30 UTC, so the cap card closes".
     - The same card with no closed ask reads "done".
     - An agent card in `done` with a closed ask reads "done".
     - A human card in `closed` with a closed ask reads the line in place of "closed: <reason>".
- [ ] **Step 2: Run** the tests. Expect them to fail to compile on `ClosedAsks`.
- [ ] **Step 3: Implement**
  - `finishCards` reads `ClosedAsks` beside `NewestTaskEvents` and sets the card's closed ask.
  - A card that is not final and not in Needs you, with `Statuses <= 1`, gets the line `Gone template.HTML`. Build it with `timed(escaped("Needed you no more: "+reason+"."), moments)`. It stands under the paragraph in 13 px in `--text-muted`, and under the lead of the opened card's head.
  - A human card in `done` or `closed` takes "needed you no more: <reason>", timed, as its state word in `stateOf`. Agent cards keep their state word.
  - `text()` adds the line, so the find box finds it.
- [ ] **Step 4: Add the lab scene.**
  1. `closedAsksScene(now)` builds on `busyScene`. It holds four cards:
     - #640 runs. The factory closed its month-cap ask at now−29 min, with a reason whose moment is at now−30 min.
     - #641 is the month cap's human card, done by the watcher.
     - #642 is a human card done by a human's answer.
     - #643 is an agent card done after a closed ask and two later statuses.
  2. Register the scene as `"closed-asks"` in `labScenes`.
  3. In `check.js`, run `seed("closed-asks")` and open the board in `America/New_York` at 1440×900. Check that #640's face holds "Needed you no more:" with a `<time>` that matches `/^\d\d:\d\d (EST|EDT)$/` and no "UTC". Check that #641's foot holds "needed you no more:", and that #642 and #643 read "done".
- [ ] **Step 5: Run** `go test -race ./internal/console/` and `scripts/console-lab/run.sh`. Expect check.js to report no failures. Look at the shots of `closed-asks` in both themes.
- [ ] **Step 6: Commit** "A card says why the factory no longer needs you: one line on a running card until its next step, and the state of a factory card in Done".

**Live check.** Run `ClosedAsks`'s query on the live database for the open cards after the next close. It lists the card with the reason of its row. The lab check covers the face itself.

### Task 11: The design entry and the architecture text (docs repository)

**Files:**
- Modify: `design/design-decisions.md`, a new entry after C49 (:500-515)
- Modify: `docs/architecture.md` at :2063-2069 (the month cap), :2108-2115 (a reset wakes the cap waits), :3432-3443 (the ask attempt), :4447-4460 (a provider refusal) and :4812-4829 (the platform's card for the human)

- [ ] **Step 1: Write C50.** Title: "An ask whose cause is gone closes by itself and says why: one line on the running card until its next step, the state word of a factory card in Done (2026-11-24, Sebastian)". Its text states:
  - Sebastian picked this in words on 2026-11-24, with no round.
  - The running card: "Needed you no more: <reason>." under the paragraph and under the lead of the opened card's head, in 13 px in `--text-muted`, until the card's next ask or answer or its second status after the close.
  - A human card in Done: "needed you no more: <reason>" as the state word, in place of "done" or "closed: <reason>". Agent cards keep "done".
  - The chat's settled ask reads "withdrawn: <reason> · 07:31". The card's life reads "withdrawn because <reason>: <question>". Times read in the human's zone, as C49 sets.
  - No separate list of closed asks.
- [ ] **Step 2: Rewrite the architecture paragraphs** so that each states the new behaviour:
  - :2063-2069: a reset of the month's count in the status panel lifts the cap as a commit does. The ask closes by itself once the cap no longer binds, and names who reset the count and when, the cap in force, or the month's turn.
  - :2108-2115: a reset wakes every cap wait. Before a rung hands an ask to the human, the factory checks the cap once more, so an ask is never faced with a cap that no longer binds.
  - :3432-3443: the ask attempt runs only when a cap leaves room for its own call. Otherwise the ask reaches the human at once, marked as not judged.
  - :4447-4460: a provider stop closes and the card resumes once another call on its model answers, once per card and model.
  - :4812-4829: the platform's card closes itself after a day with no platform death while at least 3 sessions started, unless the card before it closed the same way.
- [ ] **Step 3: Check the hook.** `git commit` runs `.githooks/pre-commit`. It refuses a ruling number or a ledger path. Write no such reference.
- [ ] **Step 4: Commit** "design: an ask whose cause is gone closes by itself and the card says why" and "architecture: asks close by themselves when the cap, the provider or the platform recovers".

## Not built and why

- **`dependency_closed`.** The signal holds: the dependency is open again, or the card no longer depends on it (`caseDep` returns nil, ladder.go:248). No action fits, though. The run reads every answer but Close as "start the card anyway" (deps.go:472-482), `ActRetry` refuses a closed dependency (actions.go:353-371), and `ActWithdraw` tells the run nothing. A fix needs a new action and a new branch in `awaitDependencies`. The record does not justify that: all 16 cases since 2026-11-13 were answered by rung 2 within 4 minutes, and none closed because its dependency came back.
- **`platform_fault`.** No stored fact proves that the platform no longer ends this card's sessions. The `sessions` table holds no node and no outcome, `pod_deaths` holds deaths alone, and the card's own sessions do not run while it waits. A quiet hour proves nothing. No case exists in the record. To build it, the factory must record each session's node and its end.
- **`pod_never_started`.** The pending cause lives only in the reason's text. Another card's pod that started does not prove that this card's pod fits, because its requests and its image differ. No case exists in the record. To build it, the factory must record the pod's requests and the pending reason with the start failure.
- **The heal pass's "card ended" and "plan revision replaced it".** These withdrawals write no row. The card's end and the new revision are already the record on every screen. A row would send every human a "needs you no more: card ended done" notice for each card a human closed, and it would make the Done face of a factory card that a human closed read as closed by the factory.

## Where the plan departs from the decisions of 2026-11-24

- The rungs skip a case when a cap refuses their own call, for every case kind and for rung 1 as well as rung 2. The decision named the cap kinds and rung 2. The one check in `judgmentSpent` reads the caps for every kind, so no kind table field is needed. When a cap leaves room for one chat call but not for a session, the chat still analyses the cap ask.
- `platform_deaths` gets no `Fire` row. Rung 0 may not answer a human card (`humanChoice`, act.go:1066), so the card's own pass closes it, as the seven watchers close theirs.
- The heal pass writes rows only for the cards that moved on, as the section above says.
- `dependency_closed`, `platform_fault` and `pod_never_started` stay as they are.
- Rule (b) also covers a human card that ends `closed`. SigNoz ends its cards `closed` with an RFC 3339 time that no screen shows in the human's zone today.
- The lineage bound uses the guard `firing` already has (ladder.go:1108-1111), which keys on kind and state key. For `provider_refused` the state key becomes the model, so the bound holds per card and model. For `platform_deaths` a new card is filed for each burst, so the bound is "the card before it did not close the same way".

## Cost and risk

- **Loops.** A resume from the cap row runs sessions that spend up to the cap again. That needs a human's reset, a raise or the period's turn first, as the run's own wait does today. A resume from the provider row costs no model money: a session whose first call the provider refuses counts no attempt and no agent time. After one such resume per card and model, a stop that came back goes to the human. The platform's close starts no work.
- **The provider signal needs another caller.** If every card on the model waits at a provider stop and no factoryd call uses the model, no call answers, and the ask waits for the human as it does today.
- **Asks reach the human sooner.** A cap ask that a cap refuses for the chat goes to the human at once, not after 35 minutes of a rung that cannot run. Each such ask is real: the cap still binds when it is asked.
- **Reads.** `Climb` reads the case's facts once more before each face or rung 2 start, a few dozen times a day. The board reads `ClosedAsks` once per load. `ModelAnsweredSince` scans `audit` (140,711 rows on 2026-11-24) once a minute per open provider ask.
- **Replay.** `EndCase` gains a trailing argument, and `endCase` passes it. Temporal's replay compares commands, not activity inputs, and an activity scheduled before the change decodes the missing argument as nil. A `CapResumed` recorded before the change carries no `Why`, and its wait keeps today's words.

## Outcome

Built on 2026-11-24 and 2026-11-25 and landed on the code repository's main in three batches, each a fast-forward push to Forgejo and GitHub. Before each push the race suite (`scripts/pg-test.sh go test -race -p 1 ./...`) and `bash check static` passed on the batch's head. Main moved under batches 2 and 3, so both were rebased and their suites ran again before the push. The console lab's full run passed on the last head, its New York walk included: "ok: every control present, the mechanics work".

This table lists each commit and its batch.

| Batch | Commit | Task |
|---|---|---|
| 1 | `0333af0a6` | 1: every close of an ask at the human writes one row |
| 1 | `00a3008e9` | 2: the heal pass writes the row for a card that moved on |
| 1 | `503f2343e` | 3: one cap check serves the run's wait, the cap row and the words |
| 1 | `6c56562f6` | 4: `Climb` checks the cause before it hands a case up |
| 1 | `8258d42ab` | 5: rungs 1 and 2 run only when the caps leave room for their call |
| 2 | `c1157b704` | 6: a provider stop closes once another call on its model answers |
| 2 | `5327a01b9` | 7: the watchers' reasons reach the case |
| 2 | `aa0cc0547` | 8: a platform card closes after a quiet day |
| 2 | `544c3a986` | none: the factory's close of a pull request's card names its case |
| 3 | `0da019045` | 9: every reader names the reason |
| 3 | `e6350a14a` | 10: the card shows why it needed you no more |

What was checked live:

- CI passed on each batch's head: `ci / test` in about 18 minutes, and the three images.
- `factory/roll` held each batch: "held: plan “Land the weekly bump” (#2272) is open on main; the roll follows once no plan is open on main". Production had been held since 2026-11-24 21:04 UTC. At the end of each batch's 90 minutes, the last at 03:55 UTC on 2026-11-25, factoryd still ran commit `d5f0078ae`, started 2026-11-24 20:15:48 UTC. No batch ran live.
- The live checks ran read-only on the live database, with `:rolled_at` set to the push of the batch that holds the task (batch 1 2026-11-24 23:22 UTC, batch 2 2026-11-25 00:53 UTC, batch 3 02:25 UTC), last at 03:55 UTC. Every query ran and returned no row. That proves the queries run, and nothing about the code, since no batch ran live.
- The same queries on the record of 2026-11-24 before any push show the old faults they look for. Task 1's query listed the month-cap case 7517 of the incident and the pull request cards' cases 7469 and 7515. Task 3's query listed the four month-cap cases 7471 to 7473 and 7517, each with "the wait ended on its own: the cap no longer binds a session". Task 4's first query listed case 7517. Task 5's query listed 7 rung 2 steps that expired while a cap refused the chat. Task 7's query listed 6 human cards. Task 10's query, `ClosedAsks` on the open cards and on the cards finished since, listed the two pull request cards and a card whose run ended with its pull request merged. Task 6's and Task 8's queries listed none.
- factoryd's logs since the first push hold no nondeterminism error, and Temporal reports no workflow with a problem. No card's workflow was running: only the two projects' chat tasks were open.

What the build changed against the text above:

- `EndCase` closes every case at the human through `withdrawQuestion`, also a case whose face posted no comment. That card too moves from waiting-human to in-review, and its issue gets the in-review label.
- The `cap_wait` row fires only for a case whose facts name a model. A case with no model never resumes by this row, because `SessionFunded` needs the model.
- `EndCase` passes its moments only when the reason names a time. The recorded inputs of the workflow replay tests stay equal, because the project's replay tests compare activity inputs as well as commands.
- A cap wait whose check names no `Why` ends with "the UTC <period> turned" after a turn, else with "the <cap> no longer binds a session".
- The retake tests of Task 3 run on the rig's day, 2026-11-03, not on 2026-11-24. `TestRungZeroRowsFireOnTheirFacts` no longer lists the day cap, because the row now reads the store and the retake tests pin it.
- The tests of Task 4 are unit tests in `monitor_test.go` (`TestClimbAfterAnExpiredRungTakesALiftedCap`, `TestClimbUnderTheCasesLockSkipsTheCheck`), not tests on PostgreSQL. When the cause check fails in `Climb`, factoryd logs the error and climbs on, so a failed `Act` never stops a face.
- When `Free` fails, `capRefusesJudgment` logs the error and lets the rung run.
- `clause` keeps an initialism such as "CI" in upper case.
- SigNoz's reason reads "the alert cleared at 07:30 UTC" on the day of the clear and "the alert cleared at 28 Sep 20:40 UTC" on another day, each with its moment, not an RFC 3339 time. The issue's note and the card's closing reason keep the RFC 3339 time.
- The factory's own close of a pull request's card (`WithdrawPRCard`) builds its row with `WithdrawnRow`, so it names the case. Task 1's live query found this path on the baseline of 2026-11-24: cases 7469 and 7515.
- On the settled row's fold line a reason too long for the row ends in an ellipsis. Before, it ran past the row's edge and was cut mid-word.
- The lab scene `closed-asks` builds on the threads scene, not the busy scene, so the inbox holds #640's ask, settled with its reason. `check.js` also checks that row in New York's zone. Task 12 below puts these cards in Done, and the check reads rule (b) there too.
- The design entry is C51. C50 went to the hold's acts on the same day.

### Task 12: Done holds the human lane's ended cards

Rule (b) of Task 10 showed only on the opened card, because Done left out every card of the human lane. Sebastian's request of 2026-11-24 asks for the card in Done: "The closed card on the 'done' pile should say why it closed … if the human was reading the card while it disappeared he can easily look at it on the done pile and see why it vanished."

**Why Done left them out.** No recorded decision chose it. The console's first board (`22e157db8`, 2026-09-28) had a lane of its own for the human, which listed a human card only while it was open. The four columns (`7d9813e91`, 2026-10-11, and C8 of 2026-10-14) kept that rule in code: an ended human card took no column. C8 itself says only that Done holds done, failed and closed. The paged read of finished cards (`897f449cc`, 2026-10-15) wrote the rule into SQL as `kind NOT IN (chat, 'human')`.

**What changed** (`e0ec82161`):

- `FinishedTasks` and its in-memory twin `FinishedPage` list the human lane's ended cards in the same seven days and the same order of finish as the agents' cards. Done's count is the read's count, so it takes them in: one rule for every card in the lane.
- The board places an ended human card in Done, and the page after a card, a find and its filters (such as `status:closed`) list it. The status line's counts do not change.
- A card the factory closed because its cause went reads "needed you no more: <reason>", a card a human answered reads "done", and a card a human closed reads its own words.
- The project agent's `board` read and `find_cards` list these cards with the same words in UTC, for example `#2 t-cap "…" done (is done), needed you no more: the month cap's count was reset at 07:30 UTC by sebastian`.
- Two tests pinned the old rule and now pin the new one: `TestPGStoreFinishedPages` (its human card `h` now follows `a`) and `TestBoardRendersColumnsFromTheStore` (its finished human card now stands in Done).

**Volume, read-only on the live database on 2026-11-25.** In the last 7 days 19 human-lane cards ended: 5 on the code project and 14 on the infrastructure project, 8 of them closed alert cards. In the last 60 days the busiest 7 days held 55, all on the infrastructure project during the alert storms of October and early November. In 67 days no agent card ended on the infrastructure project, so these cards push no agent card down there. On the code project the busiest week held 18 human-lane cards against about 95 agent cards a week.

**Bound: none.** Done lists the newest card first, so the card a human just saw leave Needs you stands at its top however many cards are below it, and Done loads 50 at a time as before. Two bounds were measured and not built. Folding the alert cards that the factory closed by itself into one line would cut the busiest week from 55 cards to 34 and add a new element to the order menu, the filters, the find, the pages and the phone. A 24-hour window for those alert cards would leave 42.

**Checked:** `TestPGStoreDoneHoldsTheHumanLane` on PostgreSQL and `TestDoneHoldsTheHumanLanesEndedCards` in the console. In the lab's `closed-asks` scene in New York, Done reads #643 done, then #641 "needed you no more: the month cap's count was reset at <time> EST by sebastian", then #642 done, and its count rises from 11 to 14. The third new card is the busy scene's ended human card of a routine. The race suite, `bash check static` and the lab's full run with its New York walk passed before the push. CI passed on `e0ec82161`: `ci / test` in 18 minutes and the three images. `factory/roll` held it for plan #2272 as it held the batches, and factoryd still ran `d5f0078ae` at 05:10 UTC on 2026-11-25, so this change is not live either.
