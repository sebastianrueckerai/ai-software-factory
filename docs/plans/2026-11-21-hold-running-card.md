# Hold a running card: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a human puts a running card on hold with the existing "Put on hold". Its session stops and keeps its work, the card frees its slot and waits in Queued, and after the release it goes on from its saved work ahead of the cards that have not started.

**Architecture:** the existing hold widens from cards that have not started to running cards and to cards that wait queued to resume. The press stops a live session with a new ask kind, as a person's replan does. `AdmitResume`, which every session start passes, reads the hold first and parks a held card queued with `resumed_at`. Held cards count neither as ahead of others nor against the cards that have not started.

**Tech Stack:** Go (`factoryd`, the console's `html/template` with htmx), Temporal, Postgres.

**Spec:** [hold-running-card-spec-2026-11-21.md](../hold-running-card-spec-2026-11-21.md). Its sections bind every task. Section numbers below (§) refer to it.

**Where the work runs:** locally, in the worktree `~/repos/ai-software-factory-code/.worktrees/hold-running` on branch `hold-running`, cut from `origin/main` (`f56249721`). Paths are relative to that repository's `internal/` unless they start with `cmd/`, `acceptance/` or `docs/`. Line numbers are from `f56249721`.

## Global Constraints

- One way only. No new control, status, store column, route or chat tool. The hold of a running card is `hold_card` and `release_hold`, the columns `hold_at`, `hold_by`, `hold_reason` and `hold_release`, and `EventCardHeld` and `EventCardHoldEnded`.
- A press takes a bound agent card on the coding loop that is queued (started or not), in waiting-deps on an open dependency, or running. Every other card is refused with a line that names its state and what fits (§5.1).
- A stored hold stands on every status that is not final, until a human releases it, its release card ends merged or done, or the card ends (D6).
- The project agent takes no hold on its own. `humanWord` stays on both chat tools.
- A held stop gives the session's room back through `refund()`. Money is not refunded.
- New workflow commands sit behind `versionHoldStop`, change id `"hold-stop"`, `workflow.Version = 1`, declared after `versionRoomWindow` (`factoryd/workflow.go:987`) and read at run start as `run.roomWindow` is (`:646`).
- Every text a human reads passes `writingguide.Lint` and calls a human a human.
- Tests come first and derive their expectations by hand from the spec. No assertion is weakened to pass.
- Verify with `scripts/pg-test.sh go test -race -p 1 ./...` and `bash check static`. Postgres-backed tests need the throwaway Postgres that `scripts/pg-test.sh` starts.
- No ruling number and no ledger path in a tracked file or a commit message. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Comments stay minimal: only what the code cannot say.

## Review Focus

1. **A press during the session's start check-in.** The session has not registered for asks, so `EscalateSession` answers `ErrNoLiveSession`. Expected: the session reads the hold when it registers and stops at once with `TripHold`. Pinned in Task 3.
2. **A release pressed while the session stops,** before the park. Expected: the hold ends, `awaitSlot` grants, and the next session starts from the pushed head with no park and no second stop. Pinned in Task 4.
3. **A hold on a card in its last session,** with no start and less than a session's worth of agent time left. Expected: after the release the card starts a session and asks for no room. Pinned in Task 4.
4. **A second press while the session stops,** with a new reason. Expected: the reason changes, `EscalateSession` sends no second ask, and the console answers the stop line once more. Pinned in Task 3.
5. **"End the card" on a held, parked card.** Expected: the card closes and its hold columns are empty, as `transitionSet` clears them on every final status. Pinned in Task 1.

---

## Tasks

### Task 1: The store and the task read a hold on started cards

(§5.1, §5.4's `SetResumeWait`, D6.)

**Files:**
- Modify: `factoryd/cardhold.go:30-40` (`Held`, `Holdable`), `factoryd/store.go:2600-2627` (`SetCardHold`, `EndCardHold`, `HeldOn`), `factoryd/store.go:2632-2636` (`SetResumeWait`).
- Test: `factoryd/cardhold_test.go`, `factoryd/pg/cardhold_pg_test.go`.

**Interfaces:**
- Produces:
  - `func (t Task) Held() bool`: `t.Hold != nil && !Final(t.Status)`.
  - `func (t Task) Holdable() bool`: today's set, plus `status == "running"` and `status == "queued" && ResumedAt != nil`, for `Kind == "agent"`, `!Unbound()`, and, for the two new cases, `Track != policy.TrackPlan`: a plan's own planning run takes no hold.
  - `SetCardHold` takes the same set in SQL. `EndCardHold` and `HeldOn` read a hold on every status that is not final.
  - `SetResumeWait` also moves `status = 'running' AND hold_at IS NOT NULL`.

- [ ] **Step 1: Write the failing tests.**
  - `TestHoldableTakesStartedCards` (table): running → true. Queued with `ResumedAt` set → true. Queued, never admitted → true. In-review, closing, merged, waiting-human, waiting-poster, waiting-image → false. A plan card running its planning → false. An unbound running card → false.
  - `TestHeldReadsEveryStatusThatIsNotFinal` (table): a hold on running, in-review, waiting-human → `Held()` true. On done, failed, closed → false.
  - `TestPGStoreHoldsARunningCard`: `SetCardHold` on a running card returns true and stores reason, by and release. On an in-review card it returns false and stores nothing. `EndCardHold(id, "")` on the running card returns true and empties the four columns.
  - `TestPGStoreParksAHeldRunningCard`: `SetResumeWait(id, "on hold: x", t0)` on a held running card leaves it queued with `resumed_at = t0`, `queue_reason = "on hold: x"`. On an unheld running card it changes nothing.
  - `TestPGStoreEndClearsAHeldParkedCard` (Review Focus 5): a held card queued with `resumed_at`, moved to closed, has empty hold columns.
  - `TestNoRungStopsAHeldRunningCard` (§5.10): `holdRefusal` on the facts of a held running card refuses `resume`, `continue`, `close` and a replan of the card for rungs 0 to 2, and refuses nothing for rung 3.
  - `TestTheMonitorSkipsAHeldParkedCard` (§5.10): `ownedWait` on the digest of a held card, queued with a queue reason and `queue_since` 3 hours old, returns no wait.
- [ ] **Step 2: Run them and see them fail.** Run `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/ ./internal/factoryd/pg/ -run 'TestHoldable|TestHeldReads|TestPGStoreHoldsARunning|TestPGStoreParksAHeld|TestPGStoreEndClears|TestNoRungStops|TestTheMonitorSkips'`. Expected: FAIL.
- [ ] **Step 3: Implement** the two predicates and the four SQL changes. Grep every caller of `Held` and `Holdable` (`MoreOf`, `holdFact`, `cardHoldWait`, `heldFindings`, `unholdable`, `agentOnHeld`, `carddigest.go:327`) and keep each test of theirs green. A caller whose meaning was "has not started" gets an explicit status check.
- [ ] **Step 4: Run the package suites and see them pass.** Run `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/... ./internal/console/...`. Expected: PASS.
- [ ] **Step 5: Commit** with the message "A hold stands on a started card until a human releases it, its release card ends it or the card ends".

### Task 2: Admission parks a held card and lets the others pass

(§5.4, §5.5, §5.8's release card.) It depends on Task 1.

**Files:**
- Modify: `factoryd/surge.go:58-108` (`AdmitResume`, `admitResume`), `factoryd/bounded.go:135-145` (`admit`'s resumed-first count), `factoryd/bounded.go:170` (`wakeResumed`, unchanged in behaviour), `factoryd/console_store.go:362` (`setSlotWaits`).
- Test: `factoryd/surge_test.go`, `factoryd/bounded_test.go`, `factoryd/pg/` (a new `hold_park_pg_test.go`).

**Interfaces:**
- Consumes: Task 1's `Held` and `SetResumeWait`.
- Produces:
  - `func unheld(ts []Task) []Task` in `bounded.go`: the cards of `ts` that `Held` does not name. `admit` and `admitResume` count `unheld(waiters)`. `wakeResumed` wakes every waiter.
  - `AdmitResume` calls `cardHoldWait` first, for every card. On a line: `SetResumeWait(id, line, since)`, then `pullQueued`, then `mirrorTaskState(..., "queued")`, and returns `ResumeSlot{}`. On "": today's path.

- [ ] **Step 1: Write the failing tests.**
  - `TestAdmitResumeParksAHeldRunningCard` (PG): a project at `work_in_progress: 1`, `surge: 0`. Card A running with a hold "out of the way", card B queued. `AdmitResume(A, t0)` returns `Granted: false`. A is queued, `resumed_at = t0`, `queue_reason = "on hold: out of the way"`. B is admitted.
  - `TestAHeldWaiterBlocksNoFreshCard` (PG): card A held, queued with `resumed_at`. Card B queued, never admitted. Bound 2, nothing live. `admit(B)` admits B, and its queue reason holds no "resumed first".
  - `TestAHeldWaiterIsNotAhead` (PG): A held and queued since t0, C resumed and queued since t1 > t0. `AdmitResume(C, t1)` grants.
  - `TestTheReleaseCardEndsTheParkedHold` (PG): A held until card R, parked. R moves to done. `AdmitResume(A, t0)` ends the hold, records `EventCardHoldEnded` with `release` R's issue, and grants.
  - `TestTheBoardCountsNoHeldCardAhead`: `setSlotWaits` over a held waiter and a fresh card gives the fresh card "0 ahead".
  - `TestAdmitResumeParksAHeldCardBackFromReview` (PG, D6): card A in-review in gate `checks` with a hold. `AdmitResume(A, t0)` returns `Granted: false`, and A is queued with `resumed_at = t0` and its hold line.
  - `TestReleasingAParkedHoldWakesTheCard`: `ReleaseCardHold(A)` on a held, parked card ends the hold and sends `SignalSlotFree` to A once.
- [ ] **Step 2: Run them and see them fail.** Run `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/... -run 'TestAdmitResumeParks|TestAHeldWaiter|TestTheReleaseCardEnds|TestTheBoardCounts|TestReleasingAParked'`. Expected: FAIL.
- [ ] **Step 3: Implement** `unheld`, the hold read at the top of `AdmitResume`, and the park.
- [ ] **Step 4: Run the package suites and see them pass.** Run `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/...`. Expected: PASS, including `TestAdmitResumeStartsTheSurgeAndQueuesTheRestInAnswerOrder` and `TestBoundedHoldsANeverStartedCardBehindAResumedOne` unchanged.
- [ ] **Step 5: Commit** with the message "A held card parks queued before its next session, and it blocks no other card".

### Task 3: The press stops the live session

(§5.2, §5.3's trip, §5.7's `HoldStop`.) It depends on Task 1.

**Files:**
- Modify: `factoryd/escalation.go:61-130` (`AskHold`), `factoryd/supervise.go:44-46`, `:466` (`TripHold`), `factoryd/supervisor.go:35` (`ActionHold`), `factoryd/workflow.go:336` (`OutcomeHeld`), `:364-417` (`SessionInput.HoldStop`), `:68-81` (`SignalHeld`), `factoryd/activities.go:1647-1656` (the outcome), `factoryd/runner.go:314-345` (`EscalateSession`), `:1164` (the read at registration), `factoryd/cardhold.go:240` (`HoldCard`).
- Test: `factoryd/supervise_test.go`, `factoryd/runner_test.go`, `factoryd/cardhold_test.go`.

**Interfaces:**
- Consumes: Task 1's `Holdable`.
- Produces:
  - `AskHold = "hold"`, `TripHold TripKind = "hold"`, `ActionHold SupervisorAction = "hold"`, `OutcomeHeld SessionOutcome = "held"`, `SignalHeld = "held"`.
  - `SessionInput.HoldStop bool` with `json:",omitempty"`.
  - `type HoldResult struct { Held, Stopped bool }`.
  - `func (r *Runner) HoldCard(ctx context.Context, id, release, reason, by string) (HoldResult, error)`. After the store, for a running card: `EscalateSession(AskHold)`. On nil, `Stopped: true`. On `ErrNoLiveSession`, it sends `SignalHeld` and returns `Stopped: false`.
  - `EscalateSession` refuses `AskHold` with `ErrNoLiveSession` when the session's input lacks `HoldStop`, and answers nil without a second send while a hold ask stands, as `ls.replan` does for replans.
  - The outcome: `res.Outcome, res.Reason, res.Commit = OutcomeHeld, d.Reason, cmp.Or(out.commit, out.wip)`.

- [ ] **Step 1: Write the failing tests.**
  - `TestAgentAskHoldTripsHold`: `Supervisor.AgentAsk(AgentAsk{Kind: AskHold, Reason: "held by sebastian: out of the way"})` gives a trip of kind `TripHold`, decided with `ActionHold`.
  - `TestAHeldStopEndsHeldWithItsPush`: a fake session with `HoldStop` takes `AskHold`. The pod is deleted, the worker's end push lands at `abc123`, and the result is `OutcomeHeld` with `Commit == "abc123"`.
  - `TestAnOldSessionRefusesTheHoldAsk`: a live session without `HoldStop` answers `AskHold` with `ErrNoLiveSession` and keeps running.
  - `TestASecondHoldPressSendsNoSecondAsk` (Review Focus 4): two `HoldCard` calls a second apart send one ask. The stored reason is the second's. Both return `Stopped: true`.
  - `TestASessionRegisteringOnAHeldCardStopsAtOnce` (Review Focus 1): the hold lands during the start check-in. When the session registers, it stops with `TripHold` before the agent's first step.
  - `TestHoldCardBetweenSessionsSignalsHeld`: no live session. `HoldCard` sends `SignalHeld` once and returns `HoldResult{Held: true}`.
- [ ] **Step 2: Run them and see them fail.** Run `go test -race ./internal/factoryd/ -run 'TestAgentAskHold|TestAHeldStop|TestAnOldSession|TestASecondHold|TestASessionRegistering|TestHoldCardBetween'`. Expected: FAIL.
- [ ] **Step 3: Implement** the constants, the trip, the outcome, the refusal, the read at registration and the new `HoldCard`. Change `console.Config.HoldCard` (`console/console.go:283`) to the new signature, and the stand-ins at `acceptance/console_rig_test.go:490` and `acceptance/write_seams_test.go:102` with it. `doHoldCard` reads `HoldResult.Held` where it read the bool. Task 5 uses `Stopped`.
- [ ] **Step 4: Run the suites and see them pass.** Run `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/... ./internal/console/... ./acceptance/...`. Expected: PASS.
- [ ] **Step 5: Commit** with the message "The hold's press stops the card's live session the way a person's replan stops it, and a session that starts on a held card stops at once".

### Task 4: The workflow takes the held stop

(§5.3's handling, §5.6, D5.) It depends on Tasks 2 and 3.

**Files:**
- Modify: `factoryd/workflow.go`: `versionHoldStop` after `:987`, the read at `:646`, `SessionInput.HoldStop` set where the input is built (`:1879`), `OutcomeHeld` in the `versionWipStart` list (`:1936`), the case beside `OutcomeReplan` (`:2181`), and `SignalHeld` in `waitOnLimit`'s selector (`:2508-2547`). Also every other wait a running card holds its slot in, which Step 1's list finds.
- Test: `factoryd/workflow_test.go`, the replay tests (`factoryd/fixture_replay_test.go`, `TestWorkflowReplaysDevServerHistories`).

**Interfaces:**
- Consumes: Task 3's `OutcomeHeld`, `SignalHeld` and `SessionInput.HoldStop`, and Task 2's park in `AdmitResume`.
- Produces: under `versionHoldStop`, `case OutcomeHeld: refund(); continue`, with `startRef` taken from `res.Commit` by the `versionWipStart` switch.

- [ ] **Step 1: List the waits.** Read `workflow.go` for every selector that blocks while the status is running, besides `waitOnLimit`. Write the list in the task report with each line number. Each listed wait takes `SignalHeld` in Step 4.
- [ ] **Step 2: Write the failing tests.**
  - `TestAHeldStopRunsNoGateAndResumesFromItsPush`: the first session ends `OutcomeHeld` with `Commit "abc123"`. No verify activity runs. `AdmitResume` answers not granted once, then granted after `SignalSlotFree`. The second session's `StartRef` is `"abc123"`, and the starts left, `MaxSessions + u.SessionsAdded() - u.Attempts`, equal their value before the held session started.
  - `TestAHeldStopInTheLastSessionAsksNoRoom` (Review Focus 3): the card's cap is 3 sessions, the held stop is its third, and 2 minutes of agent time are left. After the release the fourth session starts, and no `awaitCap` and no room ask runs.
  - `TestAReleaseDuringTheStopStartsTheNextSession` (Review Focus 2): the hold ends before the session's result. `AdmitResume` grants at once, and the next session starts from the pushed head.
  - `TestAHoldThatMissedTheStopParksAfterReview` (D6): the hold lands as the session ends with its verdict. The card runs verify with the hold stored. Review returns changes, and the next activity after verify is `AdmitResume`, which parks the card. No session starts.
  - `TestAFrozenCardTakesTheHold`: the card waits in `waitOnLimit` with its reset 2 hours ahead. `SignalHeld` ends the wait, and the next activity is `AdmitResume`.
  - `TestAnOldRunSetsNoHoldStop`: with `OnGetVersion("hold-stop", DefaultVersion)` the session's input has `HoldStop == false`.
- [ ] **Step 3: Run them and see them fail.** Run `go test -race ./internal/factoryd/ -run 'TestAHeldStop|TestAReleaseDuring|TestAHoldThatMissed|TestAFrozenCard|TestAnOldRunSets'`. Expected: FAIL.
- [ ] **Step 4: Implement** the version, the case, the list entry and the signal in each listed wait.
- [ ] **Step 5: Run the tests and the replays and see them pass.** Run `scripts/pg-test.sh go test -race -p 1 ./internal/factoryd/... ./acceptance/...`. Expected: PASS, including `TestWorkflowReplaysDevServerHistories` and the fixture replays.
- [ ] **Step 6: Commit** with the message "A held stop runs no gate, gives its session's room back and parks the card before its next session".

### Task 5: The board, the drawer and the chat

(§5.1's refusals, §5.2's answers, §5.9.) It depends on Task 3.

**Files:**
- Modify: `console/actions.go:2778-2850` (`doHoldCard`, `unholdable`), `:2901-2925` (`doReleaseHold`), `factoryd/faces_copy.go:70` (`variantStarted = "started"`), `:190-194` (the two variants), `factoryd/faces.go:571-600` (`MoreOf` picks the variant), `console/chat_tools.go:1908-1932` (`hold_card`'s `about`), `docs/manual/console.md:473-481`, `docs/manual/tasks.md:84-90`.
- Test: `console/card_hold_test.go`, `factoryd/faces_test.go`.

**Interfaces:**
- Consumes: Task 3's `HoldResult` and Task 1's `Holdable` and `Held`.

The exact copy (§5.2, §5.9):

| place | text |
|---|---|
| press, session stopped | `#N stops its session, keeps its work and waits in Queued until a human releases it.` |
| press, session stopped, release card | `#N stops its session, keeps its work and waits in Queued until #M is merged or done, or a human releases it.` |
| press, running, no live session | `#N waits in Queued before its next session until a human releases it.` (with a release card: `…until #M is merged or done, or a human releases it.`) |
| refusal, in-review, closing or merged | `Card #N is in review: its checks decide it now, and it ends or goes back to work without you. Hold it once it runs again, or end it.` (`closing` and `merged` replace "in review" with "closing" and "merged") |
| refusal, waiting-human, waiting-poster, waiting-image | `Card #N waits for an answer and holds no work slot, so a hold frees nothing: answer it, or end it.` |
| "Put on hold", started | `The session stops now and keeps its work. The card waits in Queued until you release it, or until the card you name is merged or done.` |
| "Release the hold", started | `The card goes on from its saved work, ahead of the cards that have not started.` |
| `hold_card` about | `Hold a queued or running card, on the human's word, until it is released: a running card stops its session and keeps its work.` |
| `doReleaseHold` refusal | `Card #N is not on hold, so there is nothing to release: ` + "`hold_card`" + ` puts a queued or running card on hold.` |

- [ ] **Step 1: Write the failing tests.**
  - `TestHoldARunningCardFromTheBoard`: a writer presses "Put on hold" on a running card with reason "out of the way". The seam gets the reason and the writer's login, returns `Stopped: true`, and the answer is the first line of the table. `EventCardHeld` carries `stopped: true`.
  - `TestHoldARunningCardBetweenSessions`: the seam returns `Stopped: false`. The answer is the third line.
  - Extend `TestHoldButtonsAndTheirRefusals`: in-review, closing, merged, waiting-human, waiting-poster and waiting-image each answer their table line with status 409.
  - `TestTheDrawerOffersTheStartedVariants`: a running card's drawer offers "Put on hold" with the started effect line. A held parked card offers "Release the hold" with the started effect line.
  - Extend `TestChatHoldsACardOnTheHumansWord`: `hold_card` on a running card on the human's line answers the stop line. On an agent-originated turn it is refused as today.
- [ ] **Step 2: Run them and see them fail.** Run `go test -race ./internal/console/ ./internal/factoryd/ -run 'TestHoldARunning|TestHoldButtons|TestTheDrawerOffers|TestChatHolds'`. Expected: FAIL.
- [ ] **Step 3: Implement** the copy, the variant pick and the refusals. Rewrite the two manual passages to describe the hold of a started card in the same words.
- [ ] **Step 4: Run the suites and see them pass.** Run `scripts/pg-test.sh go test -race -p 1 ./internal/console/... ./internal/factoryd/... ./acceptance/...` and `bash check static`. Expected: PASS, and `writingguide.Lint` passes on every new text.
- [ ] **Step 5: Commit** with the message "console: Put on hold takes a running card, and the drawer and the chat say what the hold does to it".

### Task 6: Land, roll and check live

- [ ] **Step 1: Make the branch green against the newest main.** Merge the newest `origin/main`. Then run `scripts/pg-test.sh go test -race -p 1 ./...` and `bash check static`. Expected: PASS.
- [ ] **Step 2: Have the whole branch reviewed.** A fresh reviewer on the most capable model reads the whole diff against the spec. Fix every finding and review again until a review is clean.
- [ ] **Step 3: Land.** Open the pull request on Forgejo, wait for the checks to pass, and merge as the ledger's landing recipe describes.
- [ ] **Step 4: Wait for the roll.** The Roller files the roll, and its pull request waits for an approval. Once it merges, the commit status `factory/roll` on the merge reads that the change runs live.
- [ ] **Step 5: Check live.** Pick a running card that started after the roll. Press "Put on hold" with a reason. Expected, each read from the live board, the database or the card's branch:
  - The session's pod is gone within 90 s.
  - The branch head moved to the session's last work.
  - The card shows in Queued with "on hold: reason".
  - The next queued card of the project starts.
  - The card's starts left (its session cap plus `raised_sessions` and `extra_attempts`, minus `attempts`) equal their value before the press.
  Then press "Release the hold". The card starts a session whose start ref is that branch head.
- [ ] **Step 6: Update the docs.** In this repository, regenerate the agent pages with `go run ./cmd/agentdoc -out docs/agents -policy <factory tree> -opencode <pinned binary>` from the code repository at the merge, so `docs/agents/project-agent.md` carries the new `hold_card` text. Search `docs/` and `README.md` for "has not started" next to a hold and fix each text. Then fetch both code clones, run `node launch/site/evidence.js`, and commit with the message "evidence: …". Write this plan's Outcome section.
- [ ] **Step 7: Clean up.** Delete the code worktree and this repository's worktree, and prune both.

## Outcome

The work landed on main of `ai-software-factory-code` as `15d8ec3ef` on 2026-11-24, pushed to both remotes after the full suite passed on the merged head. Before the landing it was merged twice with main, once for the death reader and once for the rule that a stop factoryd sent for a decision keeps its outcome. The roll `01e8a1350` (pull request #2285) merged on its own, and the commit status `factory/roll` on `15d8ec3ef` reads that the change runs live.

What the factory does now:

- "Put on hold" takes a running card, and a card that waits to resume, beside the queued and waiting-deps cards it took before. The chat's `hold_card` takes the same set, on the human's word only.
- A press on a running card stops its session through factoryd's own stop. The worker pushes its work, the session ends `held`, its start is given back, and the card waits in Queued with "on hold: reason". It frees its slot and is not counted ahead of other cards.
- "Release the hold" sends the card on from its saved work, ahead of the cards that have not started. A release card that ends merged or done releases it too.
- A session that starts on a held card stops as soon as it registers. A hold during a platform kill of the pod stays a hold: the death record keeps its platform class, and the next session is not told that the end did not count.
- The monitor keeps watching a held card that still runs or is in review, and goes quiet only while the card is parked. The heal pass does not wake a parked held card until its hold no longer stands.

The live check ran on a probe card, #2286 on the code project, on 2026-11-24:

- The hold was pressed at 08:06:28 UTC while the card's first session ran. The press answered in 2.6 s.
- factoryd recorded its stop at 08:06:31. The worker pushed its work to `factory/t-de370c5cd6f4` at `27fbde66`, and the session ended `held` at 08:06:41.
- By 08:06:43 the pod was gone, and the card was in Queued with "on hold: …" and no longer held a slot. Its starts left were the same as before the press.
- The drawer offered "Release the hold" with "The card goes on from its saved work, ahead of the cards that have not started."
- The release at 08:08:38 started the next session at once, cloned at `27fbde66`. The probe card was then closed unmerged.

Each task passed a task review and its fix rounds. A whole-branch review on Fable followed, then one fix wave, a re-review, and a scoped review of each merge with main.

Not seen live: "the next queued card starts" after the hold. No other card of the project waited in Queued at the time. The slot count showed the held card left out.

Found during the live check: the probe's sizing session waited on the month cap at a rung below the human. A reset of the month's count at 07:30 woke only the cap waits that already stood at the human, so at 07:38 this one asked the human about a cap that no longer bound. Fixed on main as `7f9b7642f`: a reset or a policy load now wakes every card that has not ended and has a live day, month or project cap case, whichever rung holds it. Two gaps stay open, waiting on Sebastian's answer to a broader design: a cap case that climbs gets no new check of the cap first, and a cap case waits 35 minutes at a rung whose chat cannot run under the cap.

Found at that fix's roll: the roll's pull request failed its tests because `internal/factoryd` lost its test database mid-run. A test in `internal/factoryd/pg` used the same database name, and CI runs the two packages in parallel, so one dropped the other's database. The same fault failed two other pull requests that day. Fixed on main as `030e7da6e`: a test database's name now carries its package, so two packages can no longer share one.
