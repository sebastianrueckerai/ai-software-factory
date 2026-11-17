# Factory faults 12 to 22 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The eleven faults of 2026-11-17 that lost a card's finished work, filed the same work twice, or sent a human a question the factory could answer can no longer happen.

**Architecture:** Each fault is fixed where it starts. A successor always continues the branch its old card holds and keeps the line raise. One fact, the card's branch head against main, feeds the budget question, the successor offer and the proofs-at-main close. A plan card's successor stays a card of its plan. The heal pass reads every live case and restores a plan's own ask. No task adds a prompt rule.

**Tech Stack:** Go (factoryd, console, agent-worker), Temporal workflows, PostgreSQL, git.

**Spec:** `factory-faults-2026-11-17.md` in the root of this repository (not tracked). It holds the live evidence of each fault. Where this plan and that file differ, this plan is right: every cause below was checked again in the code at main `1bf6dd055`, and the section "Corrections to the fault file" lists the differences.

**Where the work runs:** in a worktree of `~/repos/ai-software-factory-code`, cut from `origin/main`. All line numbers are at main `1bf6dd055`. Main moves several times a day, so check each line before you edit it. Commit each task on its own and push to `main` on `origin` and on `github`, as the session that fixed faults 1 to 11 did.

## Decisions for Sebastian

Two choices change the product's shape. The tasks are written for the recommended answers. Task 10 waits for the first answer.

1. **Fault 12: may the criteria gate run a criterion's test in a package other than the one the criterion names?** The case: a plan's criterion names `TestX` in `./internal/factoryd`, and a later move card puts `TestX` in `./internal/factoryd/pg`. Today the gate finds no test, and only a human can end the stop, because no session may edit a plan's criteria. With "yes", the gate runs the test where it now stands, if exactly one directory of the tree declares it, and the gate's line names both packages. With "no", a move card must rewrite the criteria of every open plan, which needs a new tool and a new permission. Recommendation: yes.
2. **Fault 20: does a running session take the time that an extend adds?** Today a session's window is fixed when it starts. An extend of 60 minutes during a session reaches only the next session. With "no" (Task 9 as written), the raised line bound reaches the running session at once, the session's check-in reads the fresh caps, and the added time and the added session apply from the next session, which starts without a question to the human. With "yes", the session's window must be scheduled up to the card's ceiling and the supervisor's deadline must follow the card's row. That is a workflow change with a `workflow.GetVersion` id and a longer activity timeout for every session. Recommendation: no.

## The faults and their verified causes

| No. | Fault | Cause at main `1bf6dd055` | Task |
|---|---|---|---|
| 17 | A successor does not continue the branch its old card holds | `Successor` calls `ContinueBranch` only when the findings start with the over-bound note (`activities.go:531`) | 1 |
| 21 | A successor and a cut lose the raised line bound | `Successor` copies no usage (`activities.go:537-540`). `ResetTaskUsage` zeroes `extra_lines` (`store.go:1777`), and the landing card inherits the zero (`plan.go:3896-3897`) | 1 |
| 22 | A card whose push the bound refused closes done | `ProofsAtMain` (`proofsatmain.go:46`) knows only the task id. It runs before the over-bound successor (`workflow.go:1973-1988`, `:2067`), and it counts invariants that hold with or without the work | 2 |
| 18 | A budget floor case says "Nothing is lost" over lost work | `BudgetQuestion` (`question.go:581-584`) reads no branch fact. `CaseFacts` holds none | 3 |
| 19 | The same work is filed twice in two plans | A plan card's successor has `Source: SourceSuccessor`, so every replan router treats it as a direct card and cuts it into a plan of its own. It keeps `parent_task` and `plan_key`. The parent plan never sees it (`PlanCards`, `store.go:1304-1306`) | 4 |
| 15 | The heal pass asks a plan's standing confirmation again | `healParkedAsk` (`temporal.go:393-400`) reads `NewestAskCase`, which leaves out plan cases (`cases_events.go:477`) | 5 |
| 13 | A moved file counts twice at the check-in | The worker counts with `--no-renames` (`cmd/agent-worker/main.go:1507`, `:1517`), and so does `listWipParts` (`wippush.go:396`). The patch read of a large move passes the 1 MiB cap and the checkpoint drops its whole event (`main.go:1521-1523`) | 6 |
| 16 | Confirm records nothing on a plan whose last card ended off main | Fixed on main by the rewrite of the plan's close. One refusal fault remains: `DecideCriterion` (`verdict.go:343`) reads all rows, not the rows that settle | 7 |
| 14 | A change request at the planner's session cap stops at a cap case | The loop's cap check (`plan.go:2131-2136`) does not know that a human started the next session | 8 |
| 20 | An extend does not reach the running session, and Steer refuses it | The worker reads `LINE_BOUND` once (`main.go:662`). The check-in builds its pace once (`runner.go:1468-1469`). A session in its start check-in is not in `r.live` yet (`runner.go:832-846`, registered at `:1082`), so Steer answers `ErrNoLiveSession` | 9 |
| 12 | A criterion's suite goes stale when its test moves | `runProof` (`cmd/agent-worker/repro.go:584`) runs the suite the criterion names and nothing else | 10 |

## Corrections to the fault file

- Fault 12: the proofs tree is not a git checkout (`fetchHead` deletes its scratch repository, `repro.go:367`, `:375`), so `git grep` fails there. Task 10 walks the tree. The run's output never reaches the gate's line, so the directories found travel in a field.
- Fault 13: fix 4 is void. `reviewdiff.go` runs no git and reads renames already. The patch takes `-M` too, against fix 3: a `-M` patch still names both paths.
- Fault 14: Request changes sends `plan_answered` with no findings, so the rule `answered && len(findings) > 0` misses the live case. Task 8 keys on who ended the wait.
- Fault 15: test 7 exists as `TestPlanLoopHealedWaitsOnTheRevision` (`plan_test.go:2633`). `HealedReason` has 8 match sites, not 4.
- Fault 16: `planCloseCheck` still exists (`verdict.go:1644`). Confirm returns 2 in the fault file's test 1, not 1.
- Fault 17: the function is `continuesOverBoundWork` (`activities.go:446`), not `successorContinues`. It needs no change.
- Fault 18: `BudgetQuestion` is not workflow code. The fixtures `1396.json` and `1410.json` hold the old text only in recorded asks that no test compares. Nothing there changes.
- Fault 21: fix 3 (measure a carry card's push from the carried head) is not built. The bound is the size of the pull request a reviewer reads, and a chain of successors could otherwise grow a pull request without limit.
- Fault 22: after the fix, an over-bound end files a successor first. The over-bound ask comes on that successor's second over-bound end (`activities.go:1259`).
- Ground rules: `testdata/fixtures/*.json` are ladder replays (`TestReplayFixtures`, `fixture_replay_test.go:1114`, needs Postgres). Temporal replay runs over `testdata/devserver-*.json` in `TestWorkflowReplaysDevServerHistories` (`workflow_test.go:1832`). No such history holds a plan run.

## Global Constraints

- The whole suite is `bash check` (static checks, then `scripts/pg-test.sh go test -race -p 1 -timeout 30m ./...`). Run `bash check changed` before each commit and `bash check` before each push.
- A Postgres test skips silently without its database. Run each one under `scripts/pg-test.sh` and read its PASS line.
- A change to workflow code sits behind `workflow.GetVersion` with a kebab-case change id and a `versionXxx workflow.Version = 1` constant with a doc comment, as in `workflow.go:690-919`. Call `GetVersion` last, after the other conditions of the branch hold. Tasks 4 and 8 change workflow code. No other task does.
- No prompt rule where code, a tool's shape or a check can carry the rule. Every refusal names the state and the action that fits.
- Hand-derive every expected value in a test. Never change an assertion to make a test pass.
- Comments: only what the code cannot say. No change narration.
- A human is a human in every text the factory writes: never a member, an operator or a resource.
- No ruling number and no ledger path in a tracked file or a commit message. `.githooks/pre-commit` refuses them.
- A fix reaches production only through a roll, and a roll needs Sebastian's go.

## Review Focus

1. A successor of a card with no branch starts from main with no error, and a successor that carries nothing gets no line raise. Task 1's tests pin both.
2. A branch head that main already holds counts as no work: `ProofsAtMain` still closes such a card on a test criterion, and the budget question keeps its text. Tasks 2 and 3 pin it with a merge base equal to the head.
3. A case stored before the roll has no branch fact and keeps the text "Nothing is lost". A branch read that fails does the same. Task 3's zero-value test pins it.
4. An answer by a rung or by the project agent at the planner's session cap buys no session. A human's plain comment on a cap ask buys none either. Task 8's control cases pin both.
5. A test that two directories declare, or none, runs in the suite the criterion names, as today. A subtest name `TestX/sub` searches for `TestX`. A stored proof with its own file never searches. Task 10 pins all three.

---

### Task 1: A successor continues the branch its old card holds and keeps the line raise (faults 17 and 21)

**Files:**
- Modify: `internal/factoryd/activities.go:487-548` (`Successor`, its doc comments at `:434-437` and `:487-496`), `internal/factoryd/store.go:1777` (`ResetTaskUsage` SQL), `internal/factoryd/store_test.go:1418` (the fake's `ResetTaskUsage`)
- Test: `internal/factoryd/workflow_roll_test.go`, `internal/factoryd/deps_test.go`, `internal/factoryd/replan_test.go`, `internal/factoryd/toplan_test.go`, a new `internal/factoryd/pg/usage_reset_pg_test.go`

**Interfaces:**
- Produces: `Successor` sets `Task.SHA = old.SHA` and the branch `factory/<successor id>` whenever the old card's branch exists and `old.SHA != ""`. It sets `Usage.ExtraLines = old.Usage.ExtraLines` when it carries work (`pr > 0 || head != ""`).

- [ ] **Step 1: Write the failing tests.**
  - Rewrite `TestSuccessorContinuesTheBranchOnFactorysNoteAlone` as `TestSuccessorContinuesAnyBranchTheOldCardHolds`: `newRetryRig` (`deps_test.go:595`), the old card `t-a` with the fork branch `factory/t-a` at `c7`, findings with no over-bound note. Expect the successor's branch at `c7`, `s.SHA == old.SHA`, and a brief line that names the start (the line `workLine(old)` gives, `plan.go:1278`).
  - `TestSuccessorFilesOneCard`: its rig holds the branch, so it now expects `s.SHA == old.SHA`. Add a case with no branch on the old card: no error and `s.SHA == ""`.
  - `TestSuccessorCarriesTheLineRaise`: the old card has `Usage.ExtraLines` 600 and an open pull request. Expect the successor's `Usage.ExtraLines` 600 and one `card_extended` row with `inherited_from` the old card's id. A second case with no pull request and no branch expects 0 and no row.
  - `TestBecomePlanKeepsTheLineRaise` (beside `TestBecomePlanTurnsADirectCard`): a direct card with `ExtraLines` 600, `RaisedSessions` 1 and `RaisedTimeS` 3600 turns plan. Expect 600, 0 and 0.
  - `TestResetTaskUsageKeepsExtraLines` (Postgres): the same three values through `PGStore.ResetTaskUsage`.
  - Add a row to `TestReplanFindings` (`replan_test.go:1200`): the cut card is a successor whose continued branch holds a commit, and the revision's cards name no `from`. Expect the finding that starts "the cut card #N holds work on its branch".
- [ ] **Step 2: Run them and see them fail.** `go test -race -run 'TestSuccessor|TestBecomePlanKeepsTheLineRaise|TestReplanFindings' ./internal/factoryd/` and `scripts/pg-test.sh go test -race -run TestResetTaskUsageKeepsExtraLines ./internal/factoryd/pg`
- [ ] **Step 3: Implement.** `Successor` calls `ContinueBranch` on every call and keeps the `ErrNoBranch` tolerance. It records the inherited raise as `plan.go:3995-3998` does. `ResetTaskUsage` no longer zeroes `extra_lines`, in the store and in the fake: a planner pushes nothing, so the raise does nothing on the plan row, and `plan.go:3897` then gives it to the landing card.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/`, the two Postgres tests and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 2: A card with work on its branch never closes on proofs at main (fault 22)

**Files:**
- Modify: `internal/factoryd/proofsatmain.go:46-130`
- Test: `internal/factoryd/proofsatmain_test.go`, `internal/factoryd/workflow_test.go` (beside `:4849`)

**Interfaces:**
- Consumes: `r.branchHead(ctx, t, repo)` (`activities.go:2627`), `r.forgejo.MergeBase` (`forgejo.go:1642`), `criterionRun.kind` (`criteria.go:88`).
- Produces: `func (r *Runner) workAhead(ctx context.Context, t Task) (head string, err error)`: the head of the card's branch on the fork, or "" when the fork holds no branch for the card or main already holds its head (the merge base equals the head). `ProofsAtMain` answers not met when `workAhead` gives a head or an error, and never counts an invariant.

- [ ] **Step 1: Write the failing tests** on `newProofsAtMainRig` (`proofsatmain_test.go:45-75`). Add a compare handler to `forgejoHub` after the pattern at `gates_test.go:4456`.
  - `TestProofsAtMainLeavesABranchAheadOfMain`: branch head `c9`, merge base `c1`. Expect not met and zero proof runs.
  - `TestProofsAtMainTakesABranchMainHolds`: merge base equal to the head `c9`, one cited test criterion that passes. Expect met.
  - `TestProofsAtMainFailsClosedOnAnUnreadBranch`: the compare call fails. Expect not met and zero proof runs.
  - `TestProofsAtMainNeverClosesOnInvariantsAlone`: no branch, the card cites only the invariant `all_green`. Expect not met and zero proof runs.
  - Change `TestProofsAtMainClosesOnAFullPass` (`:138`): the card cites one test criterion beside `all_green`. Expect met, with the test criterion as the only id in the result.
  - Workflow test: a plan card's session ends `no_push` with the over-bound note and `ProofsAtMain` answers not met. Expect one `ActivitySuccessor` call and no `task_ended` done.
- [ ] **Step 2: Run them and see them fail.** `go test -race -run 'TestProofsAtMain' ./internal/factoryd/`
- [ ] **Step 3: Implement** inside the activity, so the workflow does not change: return `ProofsAtMain{}` when `workAhead` gives a head or an error. Drop each run of kind invariant from `ids` before anything runs.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 3: A case knows whether the card's branch holds work (fault 18)

**Files:**
- Modify: `internal/factoryd/casefacts.go:24` (`CaseFacts`) and `:298` (`tripFacts`), `internal/factoryd/question.go:160` (`QuestionFacts`), `:581-586` (`BudgetQuestion`), `:997-1006` (`questionFacts`), `internal/factoryd/caseface.go:144` (`questionFactsOf`), `internal/factoryd/ladder.go:1086-1097` and `:1408-1470` (the two callers that copy the fields), `internal/factoryd/actions.go:250-254` (the `ActSuccessor` rule)
- Test: `internal/factoryd/question_test.go`, `casefacts_test.go`, `caseface_test.go`, `actions_test.go`

**Interfaces:**
- Consumes: `workAhead` from Task 2.
- Produces: `CaseFacts.BranchRead bool` and `CaseFacts.BranchHead string`, with the same two fields on `QuestionFacts`. `BranchRead` is true only after a read that succeeded. `BranchHead` is "" when the fork holds no branch for the card or main already holds its head.

- [ ] **Step 1: Write the failing tests.**
  - `TestTripFactsReadsTheBranch` (beside `TestTripFactsReadsTheCard`, `casefacts_test.go:157`): a branch at `c9` with merge base `c1` gives `BranchRead` true and `BranchHead` `c9`. No branch gives true and "". A read that fails gives false and "", and `Partial` names the reader.
  - `TestBudgetQuestionSaysWhenTheWorkIsLost` (beside `TestBudgetQuestionButtons`, `question_test.go:345`): `BranchRead` true, `BranchHead` "", `Attempts` 2, a start of main. Expect the `Why` to hold "The last session's work was not pushed and is lost. A fund starts a new session from main, and the work must be done again." and not "Nothing is lost".
  - The same test, three control cases that keep "Nothing is lost": `BranchHead` `c9`. `BranchRead` false (the zero value of an old stored case). `Attempts` 0.
  - `TestCaseFaceAndAskAgreeOnLostWork` (beside `caseface_test.go:32`): the face from stored facts and the ask posted by `AskHuman` hold the same sentence.
  - `TestSuccessorOfferedOnBranchWork`: facts with no open pull request, `Pushed` false, `Head` "" and `BranchHead` `c9`. Expect `ActSuccessor` offered. With `BranchHead` "" expect the refusal as today.
- [ ] **Step 2: Run them and see them fail.** `go test -race -run 'TestTripFactsReadsTheBranch|TestBudgetQuestion|TestCaseFaceAndAskAgree|TestSuccessorOfferedOnBranchWork' ./internal/factoryd/`
- [ ] **Step 3: Implement.** `tripFacts` gets one reader that calls `workAhead`. The `BudgetRefused` branch of `questionFacts` reads no forge: its two callers copy the fields from the facts they hold, and it sets `Attempts = t.Usage.Attempts`. The `ActSuccessor` refusal becomes `!f.PROpen && !f.Pushed && f.Head == "" && f.BranchHead == ""`, with the text "no pull request is open and the card's branch holds no work".
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/`, `scripts/pg-test.sh go test -race -run TestReplayFixtures ./internal/factoryd/` and `bash check changed`. Expected: PASS, with no fixture's `expect` changed.
- [ ] **Step 5: Commit.**

### Task 4: A plan card's successor stays a card of its plan (fault 19)

The rule is one owner for each key. A plan card's successor is that key's card in its parent plan. A replan of it replans the parent plan, and it never becomes a plan.

**Files:**
- Modify: `internal/factoryd/events.go:255` (lift the inline test), `internal/factoryd/replan.go:218` (`ReplanChild` guard), `:746-750` (`Replan` routing), `:811-829` and `:521-535` (the stop loop and `ReplanStopped` read through successors), `:1101-1110` (`oldCardsOf`), `internal/factoryd/runner.go:1595` (`cuttable`), `internal/factoryd/activities.go:537-540` (`Successor` copies `PlanRevision`), `internal/factoryd/toplan.go:190` (`planRefusal`), `internal/factoryd/store.go:1849-1850` (`SwitchToPlan` SQL), `internal/factoryd/plan.go:2022` (`replanCut`), the `RunState` that Reconcile fills, `internal/factoryd/workflow.go` (the version constant)
- Test: `internal/factoryd/workflow_test.go`, `replan_test.go`, `toplan_test.go`

**Interfaces:**
- Produces: `func (t Task) PlanCard() bool`, true when `t.Parent != "" && (t.Source == SourcePlan || t.Source == SourceSuccessor && t.PlanKey != "")`. `RunState.PlanCard bool`. The change id `"successor-replans-its-plan"` with `versionSuccessorReplansItsPlan workflow.Version = 1`.

- [ ] **Step 1: Write the failing tests.**
  - Beside `TestCheckinReplanClosesAPlansChild` (`workflow_test.go`): a card with `Source = SourceSuccessor`, a parent and a plan key gets a check-in replan. Expect one `ActivityReplanChild` call and no `BecomePlan`.
  - Beside `TestReplanChildCutsItsPlan` (`replan_test.go:111`): the cut step names the successor. The parent's next revision with no card that has `from: <key>` gets the `cutWork` finding, when the successor's branch holds a commit.
  - Beside `TestReplanCutsAndSanitisesTheComment` (`replan_test.go:1104`): a rung's replan of such a successor replans the parent plan and stops the running successor.
  - `TestBecomePlanRefuses` (`toplan_test.go:176`), a new row: a successor with a plan key is refused with "Card #N carries plan #M's card K: its work goes back to plan #M's planner: replan plan #M."
  - `TestReplanFindings`, a new row: the parent's revision resolves `from: <key>` to the successor's branch, not to the failed old card's.
- [ ] **Step 2: Run them and see them fail.** `go test -race -run 'TestCheckinReplan|TestReplanChild|TestReplanCuts|TestBecomePlanRefuses|TestReplanFindings' ./internal/factoryd/`
- [ ] **Step 3: Implement.** Use `PlanCard()` at `events.go:255`, in `Replan`'s routing, in the `ReplanChild` guard and in `cuttable`. Leave `GroupOf` as it is: its 11 callers mean the merge group. `oldCardsOf` appends the cut successor last, as it appends the plan row for a direct cut, so `fromRef` resolves the key to its branch. Add `AND plan_key IS NULL` to the `SwitchToPlan` SQL. In `replanCut`, send a card with `RunState.PlanCard` to `ActivityReplanChild` behind the change id.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/`, with `TestWorkflowReplaysDevServerHistories` in it, and `scripts/pg-test.sh go test -race -run TestReplayFixtures ./internal/factoryd/`. Expected: PASS.
- [ ] **Step 5: Commit.**

Not built: a rule that a dependency on a plan task waits for the sub-plan's cards. After this task a keyed card cannot nest a plan, and no verified path leaves such an edge.

### Task 5: The heal pass reads every live case and restores a plan's own ask (fault 15)

**Files:**
- Modify: `internal/factoryd/temporal.go:386-441` (`healParkedAsk`, `asklessSince`), `internal/factoryd/plan.go:3436-3446` and `:3481-3485` (lift the row building), `internal/factoryd/workflow.go:4873` (a second reason), the 6 match sites the heal path reaches (`ladder.go:1115`, `:1434`, `:1463`, `:1509`, `cases_events.go:104`, `:135`) and the step texts at `ladder.go:946`, `cases_events.go:105`, `:139`, `internal/factoryd/pg/pg.go` (the alias)
- Test: `internal/factoryd/pg/heal_ask_pg_test.go`

**Interfaces:**
- Produces: `const AsklessReason = "the task waited for a human with no question open; the question above still stands."`. `func askedAgain(reason string) bool`, true for `HealedReason` and `AsklessReason`. `func planAskRow(revision, idx int, q PlanQuestion) map[string]any`, used by `AskQuestions`, `AskConfirmation` and the heal pass.

- [ ] **Step 1: Write the failing tests** on `newHealAskRig` (`heal_ask_pg_test.go:63`) with `park` (`:96`), `askPlan` (`cases_heal_pg_test.go:38`) and `AddPlanRevision` (`:202`). Each task is parked with one ended case that resolved 10 minutes ago, past the 5-minute bound (`policy/waits.go:56`), so only the code under test keeps the heal pass out.
  - `TestHealPassLeavesAPlanWaitingOnItsConfirmation`: one live `plan_confirmation` case opened 1 minute ago. After one pass: exactly 2 cases and no new `question_asked` row.
  - `TestHealPassLeavesAPlanWaitingOnAQuestion`: the same with a live `plan_question`. Expect 2 cases.
  - `TestHealPassLeavesAMergeApprovalWait`: the same with a live `merge_approval` (`openMerge`, `helpers_test.go:87`). Expect 2 cases.
  - `TestHealPassReasksWhenOnlyAMonitorFlagIsLive`: one live `monitor_flag`. Expect 1 new case whose step holds `AsklessReason`, and 2 live cases.
  - `TestHealPassRestoresAPlansConfirmation`: a task with `Track: TrackPlan`, revision 1 with an unanswered confirmation, an open approval request (`OpenApproval(ApprovalRequest{Kind: ApprovalPlan})`), and its `plan_confirmation` case withdrawn 10 minutes ago. Expect one live `plan_confirmation` case whose state key ends `@r1`, no case that holds `AsklessReason`, and no comment posted. Then `factoryd.AnswerPlan` resolves that case.
  - `TestHealPassLeavesAnAnsweredRevisionToTheStop`: the same plan with every question answered. Expect no plan case and 1 new case with `AsklessReason`.
  - `TestAsklessSinceSkipsMonitorFlags`: an ask case that resolved 2 minutes ago and a monitor flag with a higher id that ended 10 minutes ago. Expect no new case: the wait is 2 minutes old.
  - Change the one assertion of `TestHealPassReasksACardWaitingWithNoAsk` (`:137`) to `AsklessReason`. A case after a real restart keeps `HealedReason`.
- [ ] **Step 2: Run them and see them fail.** `scripts/pg-test.sh go test -race -run 'TestHealPass|TestAsklessSince' ./internal/factoryd/pg`
- [ ] **Step 3: Implement.**
  - `healParkedAsk` reads `store.OpenCasesOf` and returns when any live case is not a monitor flag. `newestAskCase` stays as it is.
  - Before `asklessSince`, for a task on the plan track: read the newest revision (`store.PlanRevision(ctx, id, 0)`). If it has open questions (`store.OpenPlanQuestions`), no pending replan stands at it (`r.pendingReplan`) and the plan's approval request stands (`pendingPlan`), write each unanswered question's row again through `r.timeline.WriteRow(planAskRow(...))` and return. The case opens from the row with the same state key, so the waiting workflow takes its answer.
  - `asklessSince` skips monitor flags and takes the latest `ResolvedAt`.
  - `healParkedAsk` passes `AsklessReason` to `healedTrip`. The 6 sites match with `askedAgain`, and each step text names its own reason.
- [ ] **Step 4: Run** the Postgres tests above, `go test -race ./internal/factoryd/...` and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Commit.**

Not built: a second `plan_answered` signal for a plan whose newest revision is fully answered while its run still waits. No live case shows it.

### Task 6: A move counts once at every count, and a large patch no longer drops the checkpoint (fault 13)

**Files:**
- Modify: `cmd/agent-worker/main.go:922-964` (`runGitCtx`), `:1470-1539` (`checkpointer.diff`), `internal/factoryd/pushrules.go:94` (`ChangedLines`), `internal/factoryd/wippush.go:383-420` (`listWipParts` and its parser)
- Test: `cmd/agent-worker/main_test.go`, `internal/factoryd/wippush_test.go`

**Interfaces:**
- Produces: `func runGitCapped(ctx context.Context, dir string, env []string, max int, args ...string) (out string, cut bool, err error)`. `runGitCtx` calls it with `maxGitOutput` and still fails on a cut output (`TestGitOutputPastTheCapFails`, `repro_test.go:1367`, stays green).

- [ ] **Step 1: Write the failing tests.** The fixture is a base commit with a 100-line file `a/x.go`. Measured with git 2.34.1: a move to `b/x.go` with one line changed gives 1 file, 1 insertion and 1 deletion with `-M`, and 2 files, 100 insertions and 100 deletions with `--no-renames`.
  - `TestCheckpointCountsAMoveByItsChangedLines` (beside `TestCheckpointMeasuresTheCardAsItsPushDoes`, `main_test.go:2375`): the move with one changed line. Expect `card_diff` and `diff` of 1 insertion, 1 deletion and 1 file. Expect `files` to name both `a/x.go` and `b/x.go`.
  - The same test, a pure move: 0 insertions, 0 deletions, 1 file.
  - `TestChangedLinesCountsAMoveAsTheCheckpointDoes` (beside `wippush_test.go:379`): `ChangedLines` on the two commits gives 2 with the repository's `diff.renames` set to `false`.
  - `TestCheckpointSurvivesAPatchPastTheCap`: a change whose patch is larger than 1 MiB (one new file of 1.2 MiB of text). Expect one checkpoint event with the right counts, the file's name, and a patch that ends with "\n… (diff truncated)" and is at most `maxPatch` plus that suffix.
  - `TestInterimPushListsAMoveAsOnePart` (beside `TestInterimPushNamesThePartsOfTheCardsWholeDiff`, `wippush_test.go:2251`): the move with one changed line gives one part with path `b/x.go`, 1 added and 1 deleted.
- [ ] **Step 2: Run them and see them fail.** `go test -race -run 'TestCheckpoint' ./cmd/agent-worker/` and `go test -race -run 'TestChangedLines|TestInterimPush' ./internal/factoryd/`
- [ ] **Step 3: Implement.** In the argument slice at `main.go:1507` and at `:1517`, `-M` replaces `--no-renames`. The name list at `:1525` adds `--no-renames` after the slice, so both paths stay listed (the later flag wins). The patch and the name list read through `runGitCapped`, the patch with `max = maxPatch`, and a cut adds the existing suffix. That replaces the cut at `:1537-1539`. `ChangedLines` passes `-M`. `listWipParts` passes `-M` and its parser reads the rename record of `--numstat -z` (`added`, `deleted`, an empty path, then the old path and the new path) as one part at the new path.
- [ ] **Step 4: Run** `go test -race ./cmd/agent-worker/ ./internal/factoryd/` and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 7: A waiver reads the rows that settle, and the close off main is pinned (fault 16)

**Files:**
- Modify: `internal/factoryd/verdict.go:343` (`DecideCriterion`)
- Test: `internal/factoryd/verdict_test.go` (beside `:1681` and `:1919`)

- [ ] **Step 1: Write the tests.**
  - `TestConfirmOverGateRowsOffMainClosesThePlan`: `seedVerdictPlan(..., "closed")`, criterion A (test) met by the gate with `gateMet`, B (test) waived by an approver, C (invariant) met by the gate, no gate run on main. `ConfirmDeliveredCriteria` with the human's line returns 2. `CriteriaPass` then approves the criteria request and closes the plan (`closeRows == 1`). This test passes on main. It pins the flow.
  - `TestDecideCriterionWaivesAGateRowOffMain`: the same plan. An approver's waiver of A is accepted and writes an approver row. Today it fails with `ErrCriterionMet`.
  - The control case at `:1919` stays: with the integration card merged, a waiver of a gate-met row is refused with `ErrCriterionMet`.
- [ ] **Step 2: Run them.** `go test -race -run 'TestConfirmOverGateRowsOffMain|TestDecideCriterion' ./internal/factoryd/`. Expected: the first passes, the second fails.
- [ ] **Step 3: Implement.** `DecideCriterion` reads `effectiveVerdict(planGateOf(...).settling(rows), c)`, the rule `ConfirmDeliveredCriteria` (`:841`) and `planCloseCheck` (`:1736-1738`) use.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/ ./internal/console/` and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 8: A human's answer to a plan revision grants the planner session it asks for (fault 14)

**Files:**
- Modify: `internal/factoryd/plan.go:2124-2198` (the loop after the wait) and `:2558-2630` (`awaitPlan` returns who ended the wait), `internal/factoryd/workflow.go` (the version constant)
- Test: `internal/factoryd/plan_test.go` (beside `:2446`, `:2633`, `:2658`, `:2680`), a new plan-run history under `internal/factoryd/testdata/` with its replay test

**Interfaces:**
- Consumes: `t.grant`, `t.grantTime` and `t.recordGrant` (`workflow.go:2623`, `:2751`), `isPerson` (`receipt.go:244`), `t.planAsksAgain` (`plan.go:2381`).
- Produces: the change id `"plan-answer-grant"` with `versionPlanAnswerGrant workflow.Version = 1`. `awaitPlan` also returns the newest person among the authors of the signals that ended a revision wait (`plan_answered` for that revision, or `human_comment`), or "".

- [ ] **Step 1: Record a plan run's history** on the old code by `testdata/README.md`, and add its replay test as `workflow_agent_draw_test.go:20` does. No history under `testdata/devserver-*.json` holds a plan run today, so nothing else proves that an open plan run replays.
- [ ] **Step 2: Write the failing tests** on `planHarness` (`plan_test.go:1666`) with `h.state` at Attempts 3, `MaxSessions` 3, and `ActivityRecordGrant` overridden as at `workflow_cases_test.go:708`.
  - `TestPlanAnswerByAHumanAtTheCapGrantsASession`: the run waits on revision 3. Signal `plan_answered` for revision 3 with `Author: "sebastian"` and a revise decision. Expect one more entry in `h.plans`, `h.escalated` empty, `ExtraAttempts` 1 in `h.usage` and one grant of `{Sessions: 1}` by `sebastian`.
  - `TestPlanAnswerByTheAgentAtTheCapAsks`: the same signal with `Author: ChatUser`. Expect the session cap ask and no new planner session.
  - `TestPlanCommentByAHumanAtTheCapGrantsASession`: a `human_comment` by a person during the revision wait. Expect the grant and the session.
  - `TestPlanConfirmAtTheCapFilesWithNoSession`: a human's Confirm. Expect the cards filed, no grant and no session.
  - `TestPlanLoopSessionCapAndClose` (`:2446`) stays unchanged: a plain comment on a cap ask buys nothing.
- [ ] **Step 3: Run them and see them fail.** `go test -race -run 'TestPlanAnswer|TestPlanComment|TestPlanConfirmAtTheCap|TestPlanLoopSessionCapAndClose' ./internal/factoryd/`
- [ ] **Step 4: Implement.** After `readRaise` (`plan.go:2124`), when the last wait was a revision wait, a person ended it and `t.planAsksAgain(u)` holds: call `t.grant` at the session cap, else `t.grantTime`, then `t.recordGrant(person, draw, u)`. A wait that an ask opened (a cap or a stop) grants nothing. The draw and the budget still bound the session.
- [ ] **Step 5: Run** `go test -race ./internal/factoryd/`, with the new replay test and `TestWorkflowReplaysDevServerHistories` in it. Expected: PASS.
- [ ] **Step 6: Commit.**

### Task 9: A raise reaches the running session, and Steer names the session's state (fault 20)

Written for decision 2 as recommended: the line bound reaches the running session, and the added time and session apply from the next session.

**Files:**
- Modify: `internal/factoryd/runner.go:3334-3360` (`watchLimits`), `:832-846` (the start check-in window), `:1468-1499` and `:1644` (the check-in's pace), `:1855-1869` (`checkinFacts`), `internal/factoryd/supervise.go` (a setter for the size bound), `internal/factoryd/message.go:191-201`, `cmd/agent-worker/main.go:662` and the worker's routes, `internal/console/actions.go` (`doSteer`, near `:2919`)
- Test: `internal/factoryd/runner_test.go`, `internal/factoryd/message_test.go`, `internal/console/screen_test.go`, `internal/console/chat_test.go`, `cmd/agent-worker/message_test.go`, `cmd/agent-worker/push_bound_test.go`

**Interfaces:**
- Produces: the worker route `POST /bound` with the body `{"lines": N}`, which sets the bound the end push and `/wip` use. `var ErrSessionStarting` in factoryd. `func (s *Supervisor) SetSizeLines(n int)`.

- [ ] **Step 1: Write the failing tests.**
  - Worker, beside `TestMessageEndpoint` (`message_test.go:54`): `POST /bound {"lines":1200}` on a worker started with `LINE_BOUND=600`. A push of 796 changed lines then lands. Without the call it is refused.
  - `TestRaiseReachesTheRunningSession` (beside `TestPaceAndSpendWatchNetHolds`, `runner_test.go:4052`): the card's row gains `ExtraLines` 600 between two ticks. Expect one `/bound` call with the card's new effective bound, the supervisor's size bound raised, and one message to the agent that names the new bound and says the added time and session apply from the next session.
  - `TestCheckinReadsTheRaiseBeforeItHandsUp` (beside `TestRunSessionCheckinStatementsCarryThePace`, `runner_test.go:5799`): the row gains 600 lines and 1 session after the pace was built, and the check-in model answers a hand-up. Expect a second check-in run whose statement holds the bound 1200 and 4 sessions, and no case from the first answer.
  - `TestMessageSessionNamesAStartingSession` (beside `message_test.go:1071`): a session inside its start check-in. Expect `ErrSessionStarting`, not `ErrNoLiveSession`.
  - Console, `TestDrawerSteer` (`screen_test.go:947`) and `TestChatSteerAndComment` (`chat_test.go:4388`): three refusals with three texts. `ErrSessionStarting`: "Card #N is in its start check-in since HH:MM, which decides whether the agent starts. Send it once the agent starts, or comment on the card." `ErrNoLiveSession`: "Card #N is between sessions. Comment on the card, and the next session reads it." `harness.ErrNotRunning`: "Card #N's session just ended. Comment on the card, and the next session reads it."
- [ ] **Step 2: Run them and see them fail.** `go test -race -run 'TestRaiseReaches|TestCheckinReadsTheRaise|TestMessageSession|TestDrawerSteer|TestChatSteer' ./internal/factoryd/ ./internal/console/` and `go test -race ./cmd/agent-worker/`
- [ ] **Step 3: Implement.** The worker's `lineBound` becomes atomic. `watchLimits` compares `ExtraLines` on each row read and acts on a rise. The check-in computes its bound and its sessions from the card's row, and reads the row again before it acts on a hand-up. The start check-in window is marked on the runner, and `MessageSession` answers `ErrSessionStarting` inside it. The `live_sessions` deadline does not move.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/ ./internal/console/ ./cmd/agent-worker/` and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 10: The criteria gate runs a moved test in the one package that declares it (fault 12)

Start this task only after Sebastian's answer to decision 1. If the answer is no, drop the task and report it.

**Files:**
- Modify: `internal/harness/envelope.go:61` (`ProofRun`), `cmd/agent-worker/repro.go:584-610` (`runProof`), `internal/factoryd/criteria.go:452-470` (`criterionLine`) and `:686-691` (`gateResult`)
- Test: `cmd/agent-worker/repro_test.go`, `internal/factoryd/criteria_test.go`

**Interfaces:**
- Produces: `ProofRun.Suite string` with the tag `json:"suite,omitempty"`, set only when the run used another directory than the criterion names. `ProofRun.Declared []string` with the tag `json:"declared,omitempty"`, set when two or more directories declare the test. `func declaringDirs(root *os.Root, name string) ([]string, error)` in `repro.go`.

- [ ] **Step 1: Write the failing tests.**
  - Worker, on `proofsWorkspace` (`repro_test.go:612`) with `proofsCheck` (`:600`), which prints the suite it ran: package `a` with no tests and package `b` with `func TestX(t *testing.T) {}`. The entry `{Suite: "./a", Name: "TestX"}` gives a run with `Suite` `./b`, exit 0, and `./b` in the check's output.
  - Worker: `TestX` in `b` and in `c`. The check runs `./a`, `Suite` is empty and `Declared` is `["./b", "./c"]`.
  - Worker: the entry `{Suite: "./a", Name: "TestX/sub"}` with `TestX` in `b` runs `./b` with the name `TestX/sub`.
  - Worker: an entry with a `File` runs in its own suite, and no search runs. A suite of `./...` does the same. `TestProofsRunCheckTestPerEntry` (`:687`) stays unchanged: nothing found runs as today.
  - factoryd, beside `criteria_test.go:474`: `criterionLine` for a passed run with `Suite` `./b` on a criterion that names `./a` gives "TestX in ./b passed (the criterion names ./a)". A missing run with `Declared` gives "no test TestX in ./a (declared in ./b, ./c)".
  - factoryd: a "moved and green" case in `TestGateCriteriaRunsACarriedTestFromTheTree` (`:757`). Expect the criterion met.
- [ ] **Step 2: Run them and see them fail.** `go test -race -run 'TestProofs' ./cmd/agent-worker/` and `go test -race -run 'TestCriterionLine|TestGateCriteria' ./internal/factoryd/`
- [ ] **Step 3: Implement.** `runProof` searches only when the entry has no `File`, has a `Name`, its suite is one directory, and that directory declares no `func <Name>(` in a `*_test.go` file. `declaringDirs` walks the tree through `os.OpenRoot` and `fs.WalkDir`, reads files with `readRegular` (`repro.go:711`), and skips `testdata`, `vendor` and every directory whose name starts with `.` or `_`. `gateResult` carries both fields.
- [ ] **Step 4: Run** `go test -race ./cmd/agent-worker/ ./internal/factoryd/ ./internal/harness/` and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Commit.**

Not covered: a stored proof or a hold-out whose own file calls a test helper that moved out of its package. Its package then fails to build and the run reads as missing with "[build failed]". Step 2 of Task 11 counts how many stored proofs this affects.

### Task 11: Land, roll and check on the live factory

- [ ] **Step 1: Run** `bash check` on the worktree's head. Expected: PASS. Push to `main` on `origin` and `github`. Delete the worktree.
- [ ] **Step 2: Read the live state** with SELECT only (`kubectl -n platform exec sf-cluster-1 -c postgres -- psql -d gateway`):
  - the tasks with `source = 'successor'`, a `plan_key` and `track = 'plan'`. Each is a nested plan that Task 4 no longer makes. Report them. A human closes them.
  - the `plan_proofs` rows whose file sits in a package that plan #1915's cards emptied. Report the count.
- [ ] **Step 3: Ask Sebastian for the roll.** Tasks 6, 9 and 10 change the worker, so the roll needs both digests in `k8s/factoryd.yaml`: the factoryd image and `WORKER_IMAGE`. A session that runs at the roll keeps the old worker until it ends.
- [ ] **Step 4: After the roll, check each fault** by the section "How to check it live after the roll" of the fault file, with these changes:
  - Fault 15: count the cases through `case_steps.found`, not through `facts->>'reason'`, and search for both reasons.
  - Fault 16: on the next plan whose last card ends off main, expect "Confirmed N criteria met" and the request approved within one sweep.
  - Fault 19: no task has `source = 'successor'`, a `plan_key` and `track = 'plan'` with `created_at` after the roll.
  - Fault 20: extend a running card by lines. Expect a `/bound` call in the factoryd log within one tick and a message to the agent. Press Steer during a start check-in and read the refusal.
  - Fault 22: expect a successor after an over-bound end, and the over-bound ask on that successor's second over-bound end.
- [ ] **Step 5: Report** each fault as checked live, or as not yet seen with the query that will show it.

## Order against the AI-first ladder plan

`docs/plans/2026-11-17-ai-first-ladder.md` changes the same case kinds. This plan lands first.

- Its Task 4 opens plan cases as `open`. The heal pass must see them first, which Task 5 here does: `OpenCasesOf` returns `open` and `at_human` cases.
- Its Task 2 changes `healedTrip`. After Task 5 here a heal-pass case carries `AsklessReason`, so its step text and its live check cover both reasons.
- Its Task 1 resolves a criteria case "when every criterion has a row". The rule is the settle rule of the close: `openCriteria(p, g.settling(rows))` is empty. Rows off main settle nothing.
- A rung's answer is no person's, so Task 8 here gives it no session. That fits its Task 4.
