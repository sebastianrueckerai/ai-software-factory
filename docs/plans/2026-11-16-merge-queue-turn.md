# The merge queue's turn: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A card that waits for a human never blocks other cards' merges, the criteria gate never runs the whole test suite again, a card that waits its turn to merge neither raises a flag nor looks stale, the policy gate counts a moved file by its changed lines, and a session told that a host does not resolve also learns how it reaches one.

**Architecture:** A card holds its project's merge-queue turn only while factoryd works on it. Every wait for a human leaves the queue, and every merge happens at a turn the card holds, taken again after such a wait (Task 1). An invariant criterion makes no gate run: its verdict is the head's required checks, whose test job already runs the packages the diff reaches (Task 2). One store query gives each card its place in the merge queue. The monitor flags a wait only for the card at the front, and the board names the card ahead (Task 3). The policy gate takes its paths and line count from the pull request's unified diff, which shows renames, not from Forgejo's file list, which does not (Task 5).

**Tech Stack:** Go (`factoryd`, the console), Temporal workflows with version gates, Postgres.

**Where the work runs:** locally, in a worktree of `~/repos/ai-software-factory-code`, not through the factory. Paths are relative to that repository's `internal/factoryd/` unless they start with `internal/` or `cmd/`. Line numbers are from commit `188c42aca`.

**Spec:** the incident below. No other document binds this plan.

## The incident (2026-11-16)

Nothing merged on the code repository from 08:46 to after 20:20 UTC. Five cards waited in the merge queue behind card #1949 (PR #2099, the acceptance card of plan #1939):

| Card | PR | entered the queue (UTC) |
|---|---|---|
| #1949 | #2099 | 09:00 |
| #1984 | #2106 | 09:46 |
| #2098 | #2113 | 12:02 |
| #2097 | #2114 | 12:07 |
| #2104 | #2116 | 15:03 |

1. #1949 took the turn at 09:00. The turn merged main in (head 51278a82), and `approval` (`workflow_stages.go:336`) ran the criteria gate on that head inside the turn. The plan's invariant `existing_suites_stay_green` (suite `./...`) ran the whole suite in a gate pod. The gate supervisor stopped it at its bound of 15 minutes (`DefaultBounds["GateCriteria"] = 900`, `internal/policy/policy.go:819`, beside `REPRO_TIMEOUT=15m` on the factoryd deployment). The prior attempt stopped the same way, with no failing test. CI's `pr / test` job had passed the same head in 716 s.
2. The stop asked a human (case 5866, at the human from 09:27). `gateEscalated` (`workflow.go:3288`) waits through `awaitHuman` and does not leave the queue. Only an approval wait leaves it (`waitsOutOfQueue`, `queue.go:373`). #1949 held the turn through the whole wait, and no card behind it could merge.
3. The monitor treated each card behind #1949 as owning a gate wait (`ownedWait`, `carddigest_flags.go:90`) and raised `wait_over_bound` on #1984, #2098 and #2097. The check-in settled each case with "the card merges on its own": its facts name the gate `merge-queue`, not the card ahead. The board showed all three as "verifying" and "stale".
4. Card #2093 (PR #2105) moves eight test files into `internal/factoryd/pg`. Git's rename-aware diff against main is 473 lines in 12 files, and the session's push rule (`FitBound`, `pushrules.go:51`) accepted it. The policy gate (`GatePolicy`, `gates.go:540-562`) sums Forgejo's file list, which lists each moved file as added with its whole content and no previous name: 1961 lines, 961 over the 1000-line bound. The card spent three sessions on a finding no session could fix, then stopped at its session cap. The same list also drops a moved file's old path, so a move out of a guarded directory is not classed by that directory.
5. Card #2091, the weekly bump of pinned outside inputs, stopped after 151 seconds and asked a human to open the upstream registries to its sandbox. The sandbox never reached them: the earlier bumps (#1540, #1574) rented a throwaway server with `commission_server` and ran the lookups there over SSH. The session held that tool, but its brief's sandbox line (`SandboxFacts`, `sandbox.go:61`) only says that every other name fails to resolve. It names `request_tool` for a missing tool and nothing for a missing host.

## Global Constraints

- New work goes in a git worktree. Each task lands as its own controller pull request (`fork`, `controller/ai-software-factory-code`, opened with the controller login), merged in task order.
- Before a merge: CI is green (`pr / test`, `vet-and-format`, `security`, `job-env-audit`, `changes`, and `image-build` when it runs), and an independent review on the most capable model read the diff and found no blocker.
- Every workflow change sits behind a `workflow.GetVersion` change id kept in a named `taskRun` field, as `names_test.go` enforces. A run from before the change behaves as before, and a replay test pins it.
- Local runs: `bash check changed`, then `go test -race` on the touched packages. `gofmt` comes from `GOTOOLCHAIN=go1.26.10`.
- Expectations in tests are derived by hand. An assertion is never changed to make a test pass. A test whose expectation the new behaviour changes is rewritten from the new rule, and the pull request names it.
- Every text built from an error goes through `redact.Scrubber` before a human or a model reads it.
- A human is a human in every string, never a member or an operator.
- No rule goes into a prompt that code, a tool or a structured field can carry.
- No ruling number and no ledger path appears in a tracked file or a commit message.
- Comments stay minimal.

## Review Focus

1. **Two merges at once.** A card that left the queue for a human and merges on the answer without a new turn lands on a main that the card at the front has not tested. Pinned in Task 1 by the merge trip and the criteria trip cases: no `Merge` runs before the card's second `EnterQueue` answers 0.
2. **A run across the roll.** A card that waits in the queue when the roll happens must keep today's behaviour. Pinned by Task 1's replay test and its `before` case.
3. **An invariant on red or unfinished checks.** The criteria gate can run on a head whose checks are red or still running. Expected: unmet with the red checks named, or no verdict row, so a later press runs the gate again. Never met. Pinned in Task 2.
4. **A queue head waiting on its own gate.** The card at the front still owns its wait and is still flagged past its bound, so a turn held by a stuck gate surfaces. Pinned in Task 3.
5. **A plan card held out of the queue.** `groupWait` (`queue.go:179`) keeps a card in gate `merge-queue` without a queue row while its plan waits for another plan. Expected: no flag, and the board says it waits for that plan to close. Pinned in Task 3.

---

### Task 1: A wait for a human leaves the merge queue

**Files:**
- Modify: `workflow.go:598` (read the version), `:674` (declare it), `:1044` (the `taskRun` fields), `:2752-2786` (`autoMerge`), `:2880-2915` (the approval merge), `:3202-3222` (`gateActivity`), `:3798` (`ask`)
- Modify: `queue.go:381-428` (`turn`), `:470-476` (the reason), `:614-618` (`leaveQueue`)
- Modify: `workflow_stages.go:235-251` (the approval case of `runStages`), `:1300-1302` (the approval wait's leave), and `approve`'s handling of the auto merge's verdict (`:1277-1280`)
- Test: `queue_test.go`, a replay test beside `workflow_replay_prechange_test.go`

**Interfaces:**
- Produces: change id `"human-wait-queue"`, `versionHumanWaitQueue workflow.Version = 1`, field `taskRun.humanWaitQueue workflow.Version`.
- Produces: `taskRun.inTurn bool` (set by `turn` when `EnterQueue` answers 0, cleared by `leaveQueue`) and `taskRun.turnLost bool` (set when the card leaves the queue for a human, cleared by `turn` when it holds the turn again).
- Produces: `const humanWaitLeft = "the card waits for a human"` in `queue.go`.
- Produces: `func (t *taskRun) holdTurn(commit string) (head string, v verdict, stop bool)` in `queue.go`.

- [x] **Step 1: Write the failing test** `TestHumanWaitLeavesTheQueue` in `queue_test.go`, a table on the harness of `TestApprovalLeavesAndReentersTheQueue` (`queue_test.go:669`). Two cards share the project. Card A holds the turn, card B waits behind it. Cases:
  - `"criteria trip"`: A's `GateCriteria` trips during its turn and the human answers reverify after 2 h. Assert: A's leaves are `[humanWaitLeft]` at the trip, B gets `queue_turn` and merges before the answer, and A after the answer calls `EnterQueue` again, which answers 0, then the gate runs and A merges. A's merges are `[c1]`, and that merge comes after B's.
  - `"merge trip"`: A's `Merge` trips (as `TestWorkflowMergeEscalationKeepsTheApproval`, `workflow_gatesup_test.go:282`) and the human answers. Assert: no second `Merge` runs before A's second `EnterQueue` answers 0.
  - `"synced after the answer"`: as `"criteria trip"`, and the new turn's `SyncWithMain` answers `{From: "c1", To: "c2", Overlap: ["a.go"]}`. Assert: the checks stage waits on `c2`, and the merge names `c2`.
  - `"cheap turn after the answer"`: as `"synced after the answer"` with no overlap. Assert: no checks run on `c2`, and the merge names `c2` with `checkedHead` `c1`.
  - `"before"`: the run reads `"human-wait-queue"` at `workflow.DefaultVersion`. Assert: A holds the turn through the wait, the leaves are empty until A merges, and B merges after A.
- [x] **Step 2: Run it and see it fail.** `go test -race -run TestHumanWaitLeavesTheQueue ./internal/factoryd/`. Expected: the first four cases fail on A's leaves and on B merging after A.
- [x] **Step 3: Implement.**
  - `ask` (`workflow.go:3798`): at `t.humanWaitQueue >= versionHumanWaitQueue`, when `t.inTurn`, call `t.leaveQueue(humanWaitLeft)` and set `t.turnLost` before it opens the trip. Every human wait goes through `ask`: `awaitHuman`, `awaitHumanUntil` and `awaitHumanAgain`.
  - The approval wait's leave (`workflow_stages.go:1300`, `workflow.go:2937` and `:2955`) sets `t.turnLost` as well. `holdTurn` is then the one way back into the queue.
  - `holdTurn`: a no-op that returns `commit` unless `t.turnLost && t.queued()`. Otherwise it takes the turn with `t.turn(commit)` and clears `t.turnLost`. A head the sync did not move returns `commit`. A move past the gated change returns `movedPast`'s verdict. A move with overlap returns `verdict{synced: true, head: sync.To}` with `stop`. A move with no overlap sets `t.checkedHead = cmp.Or(t.checkedHead, commit)` and `t.syncedHead, t.head` to `sync.To`, and returns `sync.To`. This is the inline block of `workflow.go:2890-2906`, which becomes a call to `holdTurn`.
  - `runStages` (`workflow_stages.go:235`): repeat `queueTurn` while `t.turnLost` after it returns without `stop`. A gate that asked a human during the turn's checks stage then takes a new turn before `approval`.
  - The merge: `autoMerge` and the approval merge call `holdTurn` before their `Merge`. In `gateActivity`, an answer to a `Merge` trip while `t.turnLost` does not run `Merge` again: it returns to its caller, which calls `holdTurn` and runs `Merge` on the head that `holdTurn` returns. `approve` handles a `synced` verdict from the auto merge as it does for the approval path (`workflow_stages.go:1321-1330`): the checks stage runs on the new head, then `approve` runs again.
- [x] **Step 4: Run the test and the package.** `go test -race ./internal/factoryd/`. Expected: PASS, with `TestApprovalLeavesAndReentersTheQueue`, `TestQueueOneAtATime` and `TestWorkflowMergeEscalationKeepsTheApproval` unchanged.
- [x] **Step 5: Write the replay test** `TestReplayHumanWaitQueueBefore`: a history recorded before this task, from a card whose criteria gate tripped during its turn and that waited for the answer, replays with no nondeterminism error. Record it with the harness of `workflow_replay_prechange_test.go`.
- [x] **Step 6: Run** `bash check changed`, then commit and open the pull request.

### Task 2: An invariant criterion reads the head's required checks

**Files:**
- Modify: `criteria.go:131-170` (`gateRuns`), `:529-690` (`GateCriteria`)
- Test: `criteria_test.go`

**Interfaces:**
- Consumes: `func (r *Runner) HeadChecks(ctx context.Context, taskID, sha string) (ChecksResult, error)` (`activities.go:2471`), `ChecksSuccess`, `ChecksFailure`, `ChecksTimeout`, `ChecksPending` (`workflow.go:554-560`).
- Produces: `criterionRun.checks bool`, true for an invariant: the run takes no runner entry.

The rule: `pr / test` runs the packages the diff reaches, chosen by the base's `scripts/affected-packages.sh`, which the pull request cannot edit (`.forgejo/workflows/pr.yml:40-60`). A package the diff does not reach cannot change its result. Required checks that are green on the head therefore prove every invariant suite, whatever it names. The criteria gate stops running the suite again in a pod. That run took 15 minutes or more for `./...` and for `./internal/factoryd`.

- [x] **Step 1: Write the failing tests.**
  - `TestGateCriteriaInvariantFollowsGreenChecks`: a plan with one invariant (`./...`) and one stored test proof. `HeadChecks` answers `ChecksSuccess` on the head. Assert: the pod's list holds only the test proof. The invariant's gate row is `met`, and its evidence reads `the required checks passed on <first 8 of the head>`.
  - `TestGateCriteriaInvariantUnmetOnRedChecks`: `HeadChecks` answers `ChecksFailure` with findings `["pr / test: failure"]`. Assert: the row is `unmet`, its evidence holds `pr / test: failure`, and the result's findings name the criterion.
  - `TestGateCriteriaInvariantHeldOnPendingChecks`: `HeadChecks` answers `ChecksPending`. Assert: no row for the invariant, and its card line reads `the required checks are still running on <first 8 of the head>`. The next press runs the gate again.
  - `TestGateCriteriaInvariantOnlyRunsNoPod`: a plan whose only criterion is an invariant. Assert: no pod starts.
- [x] **Step 2: Run them and see them fail.** `go test -race -run 'TestGateCriteriaInvariant' ./internal/factoryd/`.
- [x] **Step 3: Implement.** `gateRuns` marks an invariant `checks: true` and keeps its suite for the evidence. `GateCriteria` calls `HeadChecks` once when a run has `checks`, gives no runner entry to such a run, and maps the answer: success is met, failure or timeout is unmet with the findings, and pending is held. Rewrite the existing tests that expect an invariant entry in the pod's list (`TestGateCriteriaRunsTheStoredProofs` and any other that `go test` names) from the new rule, and list them in the pull request.
- [x] **Step 4: Run** `go test -race ./internal/factoryd/` and `bash check changed`. Expected: PASS.
- [x] **Step 5: Commit and open the pull request.**

### Task 3: A card behind another in the merge queue owns no wait

**Files:**
- Modify: `queue.go` (the store method), `store.go:887` (the interface) and its test fakes
- Modify: `carddigest.go:58-70` (`DigestHead`), `:277-290` (`digestHead`), `carddigest_flags.go:76-96` (`ownedWait`)
- Modify: `console_store.go:39` (`BoardTask`), `:196` (`BoardTasks`), `internal/console/board.go:2113-2150` (`setActivity`)
- Test: `queue_test.go` (a PG test), `carddigest_test.go`, `internal/console/board_test.go`

**Interfaces:**
- Produces: `type QueuePlace struct { Ahead int; HeadTask string; HeadIssue int64 }` and `func (s *PGStore) MergeQueuePlaces(ctx context.Context) (map[string]QueuePlace, error)` in `queue.go`. It returns one row per task in any project's merge queue, in a single query. `HeadTask` is the task that holds the turn, and `Ahead` is 0 for it.
- Produces: `DigestHead.MergeAhead int` and `DigestHead.MergeBehind int64` (the issue of the card that holds the turn, 0 at the front or outside the queue). Also `BoardTask.MergeBehind int64` with the same meaning.

- [x] **Step 1: Write the failing tests.**
  - `TestPGStoreMergeQueuePlaces`: two projects, three tasks in the first (entered 09:00, 09:46, 12:02) and one in the second. Assert: the places are 0, 1 and 2 with the 09:00 task as `HeadTask` in the first project, and 0 with itself as `HeadTask` in the second.
  - `TestWaitBehindAnotherCardInTheMergeQueueRaisesNoFlag`: an in-review card in gate `merge-queue` with `MergeBehind` 1949, 6 h past the gate bound. Assert: no `wait_over_bound`.
  - `TestTheMergeQueueHeadStillOwnsItsGateWait`: the same card at the front (`MergeBehind` 0), past the bound. Assert: `wait_over_bound` with wait `gate`.
  - `TestAHeldPlanCardRaisesNoFlag`: an in-review card in gate `merge-queue` with no queue row, past the bound. Assert: no `wait_over_bound`.
  - `TestBoardNamesTheCardAheadInTheMergeQueue`: a board card in review with `MergeBehind` 1949 and its newest event 4 h old. Assert: it is not stale, and its activity line reads `waits to merge behind #1949`.
- [x] **Step 2: Run them and see them fail.** `go test -race -run 'MergeQueuePlaces|BehindAnotherCard|QueueHeadStillOwns|HeldPlanCard|CardAheadInTheMergeQueue' ./internal/factoryd/ ./internal/console/`.
- [x] **Step 3: Implement.** The query ranks `merge_queue` rows per project by `(entered_at, task_id)`, as `QueueHead` orders them (`queue.go:80`), and joins the head's issue from `tasks`. `digestHead` and `BoardTasks` each read it once. In `ownedWait`, a card in gate `merge-queue` owns a wait only when it is the front of its queue. A card behind another, and a held plan card, fall through to the case steps below the switch. In `setActivity`, a card with `MergeBehind` set is not live for the stale ring, and its activity line is `fmt.Sprintf("waits to merge behind #%d", k.MergeBehind)`.
- [x] **Step 4: Run** `go test -race ./internal/factoryd/ ./internal/console/` and `bash check changed`. Expected: PASS.
- [x] **Step 5: Commit and open the pull request.**

### Task 4: Land and check on the live factory

- [x] Merge the pull requests of Tasks 1, 2, 3, 5, 6 and 7 in that order, each after green CI and a review with no blocker.
- [x] Roll. The production hold keeps main out of production while any plan is open on main (on 2026-11-16 seven were). If the roll-held card is on the board, answer it with Deploy now once all six pull requests are merged, and say in the note that these fixes free the merge queue.
- [x] Check the roll: the factoryd deployment's image digest is the digest that main's last image build made.
- [x] Check Task 3 at once: no `wait_over_bound` case opens on a card behind another in the merge queue after the roll. Query: `SELECT id, task_id FROM cases WHERE kind='monitor_flag' AND opened_at > '<roll time>' AND problem LIKE '%wait_over_bound(gate%'`, and check each task against `merge_queue`. On the board, every card behind the front of the queue reads "waits to merge behind #N".
- [ ] Check Tasks 1 and 2 on the first occurrence: the next acceptance card's `gate_criteria` event holds its invariants met from the checks, with no pod. The next human wait during a turn writes a `queue_left` event with `"why": "the card waits for a human"`, and the card behind it takes the turn within a minute.
- [ ] Land #1949's work. #1949 was closed on 2026-11-16 to free the queue. Its work is finished on branch `factory/t-e78c5fd4ef8a` (PR #2099, head 51278a82). Plan #1939's criteria request (approval 1313) stays pending for it. Once Task 2 is live, grant that request as one card that carries this branch. Its criteria gate then reads the invariant from the checks, and the card merges. #2004 (plan #1990) was closed the same night for the same reason. Its work is on branch `factory/t-e758758121d7` (PR #2085, head 955634ec): land it the same way through plan #1990's request (approval 1315). That request is a `criteria_rerun`, which the grant refuses until Task 7 is live.
- [x] Check Task 5 on the next policy gate of a card that moves files: its `policy_gate` event's line count equals `git diff --shortstat` between the merge base and the head.
- [ ] Record the results, with the event ids, in this plan's progress ledger. Tick the boxes.

### Task 5: The policy gate counts a moved file by its changed lines

**Files:**
- Modify: `gates.go:540-600` (`GatePolicy`)
- Test: `gates_test.go` or the file that holds `GatePolicy`'s tests

**Interfaces:**
- Consumes: `func (f *Forgejo) PullRequestFileDiffs(ctx context.Context, owner, repo string, number int64) ([]fileDiff, error)` (`forgejo.go:2061`) and `fileDiff{Path, OldPath, Added, Removed}` (`reviewdiff.go`), which reads `rename from` and counts only the hunks' lines.

- [x] **Step 1: Write the failing tests.**
  - `TestGatePolicyCountsAMoveByItsChangedLines`: a pull request whose diff renames `a/x_test.go` to `a/pg/x_test.go` with a hunk of 5 added and 5 removed lines, and adds `a/pg/pg.go` with 50 lines. Forgejo's file list reports both as added, with 300 and 50 additions and no previous name. Assert: `Lines` is 60, `Insertions` 55, `Deletions` 5, and `Paths` holds `a/x_test.go`, `a/pg/x_test.go` and `a/pg/pg.go`. With a bound of 100, `OverBound` is empty.
  - `TestGatePolicyClassesAMoveOutOfAGuardedDirectory`: a rename from `.forgejo/workflows/x.yml` to `docs/x.yml` with no hunk. Assert: the class is the one `.forgejo/` gets, not the class of `docs/`.
  - `TestGatePolicyOnAnUnreadDiffCountsTheFileList`: `PullRequestFileDiffs` answers `ErrDiffTooLong`. Assert: the count is the file list's sum, and `Unread` is set, as today.
- [x] **Step 2: Run them and see the first two fail.** `go test -race -run 'TestGatePolicy' ./internal/factoryd/`.
- [x] **Step 3: Implement.** `GatePolicy` reads `PullRequestFileDiffs` before it classifies, and takes the paths (`Path`, and `OldPath` when set) and the lines (`Added + Removed`) from it. `Files` counts the file diffs. The file list stays only for a diff past `maxDiffRead`, which a human already reviews (`Unread`).
- [x] **Step 4: Run** `go test -race ./internal/factoryd/` and `bash check changed`. Expected: PASS.
- [x] **Step 5: Commit and open the pull request.**

### Task 6: The sandbox line names the way to an outside host

**Files:**
- Modify: `sandbox.go:61-80` (`SandboxFacts`)
- Test: `sandbox_test.go`

**Interfaces:**
- Consumes: `policy.ToolCommission` (`"commission_server"`, `internal/policy/policy.go:1116`).

- [x] **Step 1: Write the failing test** `TestSandboxFactsNameCommissionServerForOutsideHosts`: with `tools` holding `policy.ToolCommission`, the text holds `commission_server rents a throwaway server that reaches outside hosts over SSH: run the lookups there and release it when done`. Without the tool, the text holds no `commission_server`. Both for a nil manifest and for a project image's manifest.
- [x] **Step 2: Run it and see it fail.** `go test -race -run TestSandboxFacts ./internal/factoryd/`.
- [x] **Step 3: Implement.** `SandboxFacts` appends that sentence after the line that says every other name fails to resolve, when `tools` holds `policy.ToolCommission`, as it does for `request_tool`.
- [x] **Step 4: Run** `go test -race ./internal/factoryd/` and `bash check changed`. Expected: PASS, with `TestSandboxFactsFollowTheImage` and `TestSandboxFactsNameToolsNamesAndRequestTool` unchanged.
- [x] **Step 5: Commit and open the pull request.**

### Task 7: A plan whose criteria were never judged can be granted one card

A plan's criteria gate runs only from its integration card's pull request (`workflow.go:3396`, `GateCriteria` in `criteria.go:529`). When that card ends without one, `askRerun` (`verdict.go:1722`) opens a `criteria_rerun` request, and `grant_criteria` refuses it (`actions.go:351`: "grants no card and runs no review"). Confirm refuses too while a card is closed. Only waivers remain, so the plan's work can never land through the factory. Plan #1850 ended that way on 2026-11-16, and plan #1990 waits that way now. `GrantCriteria` (`verdict.go:526`) already writes one delta due per open criterion, and `openCriteria` (`verdict.go:815`) counts never-judged criteria as open. The refusal is the only block.

**Files:**
- Modify: `internal/factoryd/actions.go:350-355` (the `ActGrantCriteria` rule)
- Test: `internal/factoryd/actions_test.go` (the table at line ~1036) and `internal/console/actions_test.go`

**Interfaces:**
- Consumes: `criteriaRequestRefusal(f CaseFacts, action string) string` and `GrantCriteria(ctx, store, id, by string, approval int64) (int, error)`, unchanged.

- [x] **Step 1: Write the failing tests.** In the `actions_test.go` table, add `{"grant on a never-judged criteria case", ActGrantCriteria, CaseFacts{Kind: CasePlanCriteria, ApprovalKind: ApprovalCriteriaRerun}, Resolution{}, true}`. In `internal/console/actions_test.go`, add `TestGrantOnANeverJudgedPlanDraftsOneCard`: a done plan with two criteria and no verdict rows, a pending `criteria_rerun` request, and its case at the human. The grant press answers 200 with `Granted one more bounded card for 2 criteria`. The request is approved, and the plan holds two `delta` catch rows from `FinderApprover`.
- [x] **Step 2: Run them and see them fail.** `go test -race -run 'TestBoardRowsApplyOnTheirPreconditions|TestGrantOnANeverJudgedPlanDraftsOneCard' ./internal/factoryd/ ./internal/console/`.
- [x] **Step 3: Implement.** Delete the `ApprovalCriteriaRerun` branch of the `ActGrantCriteria` rule, so it returns `criteriaRequestRefusal(f, ActGrantCriteria)` for both request kinds. Remove the text "grant_criteria grants no card" wherever a test or a tool description still says it.
- [x] **Step 4: Run** `go test -race ./internal/factoryd/ ./internal/console/` and `bash check changed`. Expected: PASS.
- [x] **Step 5: Commit and open the pull request.**

