# Chain and Autonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A card is done only when its chain is live, moved by one reconciler from recorded facts; the roll is a visible card the merged cards name; a stall gets a re-run and then a human; full auto merges on proof and funds small raises from a pool; the infra repository gets its chain; Forgejo moves to 17.

**Architecture:** The Finish activity decides `merged` at merge for a card with a merged pull request in a run-mode project, and the chain poller ends every covered merged card through the same Finish every tick. The workflow's post-merge wait, the signal, the store fallback and the migration are deleted. The roll task shows on the board and the merged cards read their roll from `roll_requests`. The merge gate decides by who wrote the change. A `fund` chat tool spends a per-project pool. Infra's chain is a token grant plus Flux commit statuses. Forgejo 17 brings the rerun API and the run webhook, both optional seams the poller uses when present.

**Tech Stack:** Go (factoryd, console), Temporal, Postgres, Forgejo API, Flux notification-controller, the console's html/template board.

**Spec:** [chain-and-autonomy-design-2026-10-20.md](../chain-and-autonomy-design-2026-10-20.md). The plan argues from the spec. Executors read both.

## Global Constraints

- Every wait has a bound, every bound has a verdict, every verdict has a worker. No prompt rule where a deterministic step carries it.
- No optional interface by type assertion in production composition. A capability the poller or the runner needs is a method of the interface it takes.
- One mechanism per outcome: one writer of `done` for a merged card (Finish), one writer per `factory/roll` outcome, one SQL predicate for live (`deployLive`).
- Exact strings the spec fixes: the end reason `live: covered by run %d`, the done poke `%s is done and live: %s. €%.2f in all.` (as built), the merged inform `%s merged; the chain is running.` (as built), the board words `blocked by roll #%d`, `chain red`, `stalled`, `waiting for the chain`, `chain running`, the alert kinds `chain_red`, `chain_stalled`, `chain_uncarried`, the gauge `factory.chain.poll_age` in seconds.
- Project file keys: `chain: {mode, requires, stall}` as built, `budget: {discretionary_eur, raise_max_eur}` new. The factory's own file: `chain: {requires: [factory/roll], stall: 24h}`.
- TDD throughout. Before each push: `go test -race ./...` green, the PG tests green with `FACTORYD_TEST_DATABASE_URL`, `gofmt`, `go vet`, `gosec` clean.
- Branch per phase in a worktree, merged to `main`, pushed to origin and github. Infra changes on the infra repository's `main`, its `config-check` green. The ledger (`.superpowers/sdd/2026-09-24-build-plan/progress.md` in the design repository) records each phase and the reversed rulings.
- British spelling in every string a human reads.

## Review Focus

- A card merged while the head is already green: `done` within one tick, no alert, no second poke. Pinned in Task 2.
- A roll approved 3 hours after its images: `main` stays green, no mainfix card, the roll card sits in Needs you, its cards read `blocked by roll #N`. Pinned in Task 7 (the head stays pending on the required status, the 24h bound) and Task 6 (the word).
- A commit whose run Forgejo cancelled for a newer push: its cards are covered by the next green run, never by their own. Pinned in Task 4.
- factoryd restarts between a merge and the chain's green: the card flips on the first tick after the restart, with one `task_ended` event. Pinned in Task 1 (Finish on a `done` card is a no-op) and Task 2 (a second tick calls Finish again).
- A high-class agent pull request at full auto whose audit found something: it goes to the human with the audit named, never merges. Pinned in Task 10.

---

## Phase A: the chain

### Task 1: Finish decides merged, the workflow ends at merge

**Files:**
- Modify: `internal/factoryd/activities.go` (`Finish`, `ChainFacts`, `ChainStalled`, `SetState`)
- Modify: `internal/factoryd/workflow.go:3730-3792` (`finish`, `chainWait`), `:1064-1069` and `:533` (the `chain-done` version)
- Modify: `internal/factoryd/completion.go:35` (`Complete` to `merged`)
- Modify: `internal/factoryd/runner.go` (activity registration of `ChainFacts`, `ChainStalled`)
- Test: `internal/factoryd/workflow_chain_test.go`, `internal/factoryd/activities_test.go`

**Interfaces:**
- Consumes: `policy.ChainConfig.Resolved()`, `Completion.Complete(ctx, taskID, finalStatus)`.
- Produces: `Finish(ctx, taskID, final, reason string) error` keeps its signature. Its new rule, before any cleanup: `final == "done" && t.Status != "merged" && t.PRNumber > 0 && t.Source != SourceRoll && chain.Mode == policy.ChainModeRun` sets `final = "merged"`. A `merged` final runs every cleanup step as `done` does: every branch of Finish that tests `final == "done"` or `final != "done"` treats `merged` as `done` (no pull request close, the branch deleted, approvals, queue, alerts, `Complete`), records the `final` step with state `merged`, and does not call `taskEnded`. A Finish called with `done` on a card whose status is `merged` ends it: `Complete` moves `merged` to `closing` to `done`, `taskEnded` fires. `Final("merged")` stays false.

- [ ] **Step 1: Write the failing tests** in `activities_test.go`: `TestFinishEndsAMergedPullRequestInMerged` (a running agent card with `PRNumber: 7` in a run-mode project, `Finish(done, "pull request merged")` → status `merged`, the Forgejo tokens revoked, the live session deleted, no `task_ended` event, the `final` step recorded with state merged); `TestFinishEndsARollDone` (source roll → `done`); `TestFinishEndsANoneModeProjectDone` (chain mode none → `done`); `TestFinishEndsAMergedCardDone` (status `merged`, `Finish(done, "live: covered by run 12")` → `done`, one `task_ended` event with that reason; a second call is a no-op).
- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestFinish' -v` → FAIL.
- [ ] **Step 3: Implement** the rule in `Finish`, the `merged` branch of `Complete`'s final transition, and delete `chainWait`, the `finish` choke's first branch, `ActivityChainFacts`, `ActivityChainStalled`, `ChainFacts`, `ChainStalled`, their registrations and `SignalChainCovered`. Keep the `workflow.GetVersion(ctx, "chain-done", ...)` call at `:533` with a comment that its value is unused until no running history carries the marker. Delete `SetState`'s `merged` entry.
- [ ] **Step 4: Rewrite** `workflow_chain_test.go`: `TestAMergeEndsTheWorkflowMerged` (the merge path ends the workflow, Finish called with done, status merged); delete the chain wait tests. Run the replay rig in `ladder_replay_test.go` with a history that recorded `chain-done` → PASS.
- [ ] **Step 5: Run** `go test -race ./internal/factoryd/` → PASS. **Step 6: Commit** `finish decides merged: the workflow ends at merge`.

### Task 2: The reconciler ends every covered merged card

**Files:**
- Modify: `internal/factoryd/chainpoll.go` (`ChainPoller`, `ChainStore`, `project`, delete `cover`, `finishCovered`, `livingWorkflow`, `moveLimbo`, `MigrateChainLimbo`, the `covered` map)
- Modify: `internal/factoryd/temporal.go:158` (`HealPass` lists no `merged` cards)
- Modify: `cmd/factoryd/main.go:378` (wire `End`)
- Test: `internal/factoryd/chainpoll_test.go`, `internal/factoryd/console_store_pg_test.go`, `cmd/factoryd/wiring_test.go`

**Interfaces:**
- Consumes: Task 1's Finish; `PGStore.ChainCovered(ctx, repository) (map[string]int64, error)` as built (merged cards with a carry row and a green row at or after it, mapped to that run).
- Produces: `ChainPoller.End func(ctx context.Context, taskID, final, reason string) error`, wired to `runner.Finish`. `func (p *ChainPoller) reconcile(ctx, repository string)` runs after `record` in `project`: for every id in `ChainCovered`, `End(ctx, id, "done", fmt.Sprintf("live: covered by run %d", run))`, each error logged and the rest continued. `ChainStore` loses `MigrateChainLimbo` and `TransitionTask`. The `Workflows` field of `ChainPoller` goes if nothing else uses it.

- [ ] **Step 1: Write the failing tests**: `TestEveryTickEndsTheCoveredMergedCards` (two merged cards covered, one not: `End` called twice with the exact reason, the third untouched; a second tick calls `End` again for a card still merged, so Finish's no-op carries idempotence); `TestACardMergedUnderAGreenHeadEndsOnTheNextTick` (head green since earlier, a card's carry row at that run: ended on the next tick, no alert raised); `TestWiringBuildsThePollerAsMainDoes` in `wiring_test.go`: construct `ChainPoller` with `BoundedWorkflows{}` and a `*PGStore` through the same literal `main.go` uses, assert it compiles and one tick on an empty fixture returns no error.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `reconcile`, the deletions, the `HealPass` change, the wiring. Delete `TestEveryTickMovesTheLimbo`, `TestTheTickThatRecordsAlsoMigrates`, `TestMigrationMovesLimboToMerged`, `TestCoveredCardWithoutAWorkflowFinishesInTheStore`, `TestChainPollerSignalsCoveredMerges`, `goneWorkflows`.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/ ./cmd/factoryd/` and the PG tests → PASS. **Step 5: Commit** `the reconciler: a covered merged card ends through Finish every tick`.

### Task 3: Roll requests settle on a merged roll

**Files:**
- Modify: `internal/factoryd/rolltask.go:231` (`SettleRollRequests`)
- Test: `internal/factoryd/rolltask_pg_test.go` or the PG suite the roll uses

**Interfaces:**
- Produces: the settle's CASE reads `WHEN t.status IN ('done', 'merged') THEN 'merged' ELSE 'failed'` and the status filter is `FinalStatuses` plus `merged`.

- [ ] **Step 1: Write the failing PG test** `TestARollRequestSettlesOnAMergedRollTask`: a request `opened` on a task in `merged` → settled `merged`; on `failed` → `failed`; on `running` → untouched.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `roll requests settle on a merged roll`.

### Task 4: Carry rows by the card's own merge commit

**Files:**
- Modify: `internal/factoryd/chainpoll.go:613` (`chainCarried`)
- Modify: `internal/factoryd/store.go` (`MergedCardCommits`)
- Modify: the merge activity that merges a pull request (`internal/factoryd/gates.go:1432-1466` and the approval merge path in `activities.go`), so every merge records `tasks.merge_commit`
- Modify: `internal/factoryd/forgejo.go:1885` (delete `RecentMergedPullRequests`)
- Test: `internal/factoryd/chainpoll_test.go`, `internal/factoryd/store_pg_test.go`

**Interfaces:**
- Produces: `PGStore.MergedCardCommits(ctx, repository string) (map[string]int64, error)`: merge commit sha → pull request number for every card with `pr_number > 0`, `merge_commit <> ''` and status `merged`. `chainCarried` intersects the compare range's commits with that map. Every merge path calls `SetTaskMergeCommit(ctx, id, sha)` with the pull request's `merge_commit_sha` read after the merge.

- [ ] **Step 1: Write the failing tests**: `TestChainCarriedMapsByMergeCommit` (two merged cards with merge commits, one in the range, one not: one carry row); `TestACancelledRunsCardIsCoveredByTheNextGreen` (run 10 cancelled carries PR 7, run 11 green head: PR 7's card covered by 11); PG `TestMergedCardCommitsListsMergedCards`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** Find every writer of a merge in `gates.go` and `activities.go` (grep `MergePullRequest(`) and record the commit after each. **Step 4: Run** → PASS. **Step 5: Commit** `carry rows by the card's own merge commit`.

### Task 5: Silence is a verdict: the uncarried alert, the served re-read, the poll age gauge

**Files:**
- Modify: `internal/factoryd/alerts.go:37` (`AlertChainUncarried = "chain_uncarried"`)
- Modify: `internal/factoryd/chainpoll.go` (`serves`, `watching`, the tick)
- Modify: `internal/factoryd/meters.go` (the gauge)
- Modify: `internal/factoryd/store.go` (`UncarriedMerged`)
- Modify: infra `k8s/platform/signoz/` where the `signoz-objects` job seeds alert rules (the builder reads that job)
- Test: `internal/factoryd/chainpoll_test.go`, PG test

**Interfaces:**
- Produces: `PGStore.UncarriedMerged(ctx, repository string, olderThan time.Duration) ([]Task, error)`: merged cards with no carry row whose `finished_at` is older than the bound. The tick raises `chain_uncarried` per card (fingerprint `repository + " " + id`, detail `{"card": id, "since": finished_at}`) once while it stands, and `ResolveChainAlerts` resolves it with the others. `watching` re-reads the workflow list on every tick when the cached answer is false. The gauge `factory.chain.poll_age` (seconds since the repository's last successful tick, attribute `repository`) and an alert rule at three poll intervals.

- [ ] **Step 1: Write the failing tests**: `TestAnUncarriedMergedCardAlertsAfterTheBound`; `TestARepositoryThatGainsAWorkflowIsServed` (false once, true on the next tick after the fake lists a file); PG `TestUncarriedMergedListsOnlyRowlessCards`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `silence is a verdict: uncarried cards alert, the served check re-reads, the poller reports its age`.

### Task 6: The roll on the board, the merged card names it

**Files:**
- Modify: `internal/console/board.go:2240` (the roll skip goes), `:1789` (`deployStage`)
- Modify: `internal/factoryd/console_store.go:117-176` (`BoardTask.RollIssue`, `FinishedTasks` filter)
- Modify: `internal/console/templates/board.html`, `drawer.html` (the word, the link, the carried list on a roll card)
- Test: `internal/console/approval_card_test.go`, `internal/factoryd/console_store_pg_test.go`

**Interfaces:**
- Produces: `BoardTask.RollIssue int64`: the issue number of the roll task whose `roll_requests` row carries the card's pull request and whose state is `opened`, or `merged` while the card is still `merged` (SQL join on `prs @> ARRAY[tasks.pr_number]`, newest `created_at` first). `deployStage(state string, rollIssue int64) string` returns `blocked by roll #N` when `rollIssue > 0`, else as built. `FinishedTasks` applies `deployLive` only where `status = 'done'`. The drawer of a roll card lists the cards its requests carry (issue numbers with links) under "carries".

- [ ] **Step 1: Write the failing tests**: `TestAMergedCardNamesItsRoll` (RollIssue 1162 → the face word `blocked by roll #1162` with the link); `TestARollCardShowsOnTheBoard` (source roll, status running → In progress column); `TestFailedCardsStayInFinished` (a failed card with an unmerged pull request after chain recording began shows in the finished page); PG `TestRollIssueOfAMergedCard`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `go test -race ./internal/console/ ./internal/factoryd/` → PASS. **Step 5: Commit** `the roll is a card: on the board, named by the cards it carries`.

### Task 7: The factory's chain: requires factory/roll, the rollout job goes

**Files:**
- Modify (code repository): `.forgejo/workflows/ci.yml:200-241` (delete the `rollout` job)
- Modify (code repository): `internal/factoryd/roll.go:254` (`RollWatcher.verdict` no longer posts the status)
- Modify (infra repository): `factory/projects/ai-software-factory-code.yaml` (`chain: {requires: [factory/roll], stall: 24h}`)
- Test: `internal/factoryd/chainpoll_test.go`, `internal/factoryd/roll_test.go`

**Interfaces:**
- Consumes: `headVerdict` as built (runs AND required contexts), `rollStatus` as built (the roller's and the settle's writes).
- Produces: the run ends with the three image jobs. The status has one writer per outcome: the roller at file, fold, skip and refuse, the settle of each carried commit's request at the roll's end. `RollWatcher` keeps its measurement duties if the builder keeps it, and writes no commit status.

- [ ] **Step 1: Write the failing tests**: `TestAGreenRunWithAPendingRequiredStatusStaysPending` (three image contexts green, `factory/roll` pending → head pending, the carry rows pending, no stall before 24h with `Stall: 24h`); `TestTheSettledStatusEndsTheCarriedCards` (the settle posts `factory/roll` success on commit X, the next tick refreshes X's rows to success and `End` is called for every merged card X carried, on that one tick); `TestTheWatcherPostsNoStatus` (the fake Forgejo records no status write from the watcher's verdict path).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** both repositories. Both land in one roll: push the code change first, then the project file, and verify with the next merge on `main` that its run is green in about ten minutes and its card reads `blocked by roll #N` until the roll lands.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** code: `ci: the rollout job goes, the roll rides its status`; infra: `the factory's chain requires factory/roll, stalls at 24h`.

### Task 8: The stall ladder: one re-run, then a human card

**Files:**
- Modify: `internal/factoryd/chainpoll.go:814-925` (`stalled`, `fileRepair`)
- Modify: `internal/factoryd/forgejo.go` (`RerunActionRun`)
- Modify: `internal/factoryd/store.go` (`chain_runs.rerun_at` on the head row, migration `internal/factoryd/schema/<date>_chain_rerun.sql`)
- Modify: `internal/factoryd/question.go` (the stall question and its answers)
- Modify: `internal/console/actions.go` (the choices' actions)
- Test: `internal/factoryd/chainpoll_test.go`, `internal/console/actions_test.go`

**Interfaces:**
- Produces: `Forgejo.RerunActionRun(ctx, token, owner, repo string, runID int64) error` posting `/api/v1/repos/{owner}/{repo}/actions/runs/{id}/rerun`; a 404 answers `ErrNoRerun`. `stalled` runs the ladder: record the stall and raise `chain_stalled` as built, then if the head row has no `rerun_at` and the pending part is a run (not a required context), call `RerunActionRun` and stamp `rerun_at`; on the next stall tick after `rerun_at`, or at once when `ErrNoRerun`, file the stall card through `EscalateToHuman` with `stallQuestion(repository, sha, since, pending []string, cards []int64)` whose choices are `re-run again`, `check again`, `dismiss`, one open card per repository (dedupe on source `chain-stall`), for every repository including the own one. `ResolveChainAlerts` closes the open stall card. `fileRepair` is no longer called from `stalled`. The answers: `re-run again` calls the rerun API and keeps the card, `check again` closes the card, `dismiss` resolves the alert and closes the card until the head changes.

- [ ] **Step 1: Write the failing tests**: `TestAStallRerunsOnceThenAsks` (first stall tick: rerun called, no card; second: no rerun, one card with the three choices; third: nothing new); `TestAStallWithNoRerunAsksAtOnce` (`ErrNoRerun`); `TestAStalledRequiredStatusIsNotRerun`; `TestAGreenHeadClosesTheStallCard`; `TestTheOwnRepositoryGetsAStallCard`; console: the three answers' effects.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `the stall ladder: one re-run, then a human card`.

### Task 9: Phase A lands

- [ ] **Step 1:** Full suite `go test -race ./...`, the PG tests, `gofmt`, `go vet`, `gosec` → all clean. Merge the phase branch to `main`, push origin and github.
- [ ] **Step 2:** Before approving the roll: `temporal workflow list --query 'ExecutionStatus="Running" AND WorkflowType="TaskWorkflow"'` and, for each, `temporal workflow describe` shows no pending `ChainFacts` or `ChainStalled` activity and no open timer from `chainWait`. One that is inside the wait ends first (its chain goes green or its stall bound passes).
- [ ] **Step 3:** Watch the roll of this phase: the five cards of 2026-10-20 end on the first tick (`SELECT id, status FROM tasks WHERE id IN (...)` all `done`, five `task_ended` events with `live: covered by run`), the roll card of this roll shows on the board, the cards it carries read `blocked by roll #N` until it lands.
- [ ] **Step 4:** Ledger entry: the phase, the reversed rulings ("a roll is no card", "the workflow waits"), the evidence of step 3.

## Phase B: autonomy

### Task 10: The merge gate decides by who wrote the change

**Files:**
- Modify: `internal/factoryd/gates.go:159-195` (`AutoMerge`)
- Modify: `internal/factoryd/rolltask.go` (`RollCommit` records the diff's shape)
- Modify (infra repository): `factory/policy.yaml:256-272` (the comment on outcomes names the full-auto rule)
- Test: `internal/factoryd/gates_test.go`

**Interfaces:**
- Consumes: `GateResults.Policy` (class, outcome, lines), `GateResults.Audit *AuditResult` (verdict), `Review.Criteria []CriterionVerdict` (verdict `met` or `waived`), `GateResults.ChecksPassed`, the task's `Source`.
- Produces: `AutoMerge(g GateResults, rv Review, source string) (ok bool, unmet []string)`, every caller updated. Rules: (1) `source` in {roll, revert, template-update, schema-copy, github sync}: ignore the class and the review; require the merge rule auto, checks green, and for a roll every changed path under `k8s/` (the gate's path list, as the risk evaluation reads it); the image references being the only changed lines is `RollCommit`'s construction, and the signatures are verified by the roller's existing refusal before a roll is filed. (2) An agent's change: class normal as built; class high passes only with `g.Policy.MergeRule == auto` and `g.Audit != nil && g.Audit.Verdict == "pass"` (the audit's pass value as `audit.go` names it), else `unmet` gains `risk class high: the audit must pass for a merge without a human`; forbidden and migration unmet as built. (3) Proof: the reproduction rule as built, or `len(rv.Criteria) > 0` and every verdict `met` or `waived`.

- [ ] **Step 1: Write the failing tests**: `TestARollMergesOnItsOwnAtFullAuto`; `TestARollWithANonDigestChangeAsksAHuman`; `TestARevertMergesOnChecksAtFullAuto`; `TestAHighClassChangeMergesWithTheAuditAtFullAuto`; `TestAHighClassChangeWithAuditFindingsAsksAHuman` (unmet names the audit); `TestAHighClassChangeBelowFullAutoAsksAHuman`; `TestAForbiddenChangeAlwaysAsksAHuman`; `TestCriteriaMetProveAFeature`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** Update the policy comment: "an agent's high-class change merges at full auto when the audit passes (Sebastian, 2026-10-20, amending rulings 76, 77, 109); forbidden and migration keep a human". `internal/policy/risk_test.go` mirrors the risk block: keep `TestInfraRiskIsTheCopy` green. **Step 4: Run** → PASS. **Step 5: Commit** `the merge gate decides by who wrote the change`.

### Task 11: The confirm set at full auto, the fund tool, the pool

**Files:**
- Modify: `internal/policy/policy.go:140-210` (`DefaultChat.Confirm`, `AutonomyMeaning`, `ConfirmFor`)
- Modify: `internal/policy/project.go:355` (`ProjectBudget.DiscretionaryEUR`, `RaiseMaxEUR`), the schema `factory/schema/project.schema.json` in the infra repository
- Modify: `internal/console/chat_tools.go` (the `fund` tool beside `grant_session` at `:1342`)
- Modify: `internal/factoryd/store.go` (`AgentFundedEUR`)
- Modify: `internal/factoryd/wakes.go:437` (the ask wake names `fund`)
- Test: `internal/policy/policy_test.go`, `internal/console/chat_tools_test.go`, `internal/factoryd/store_pg_test.go`

**Interfaces:**
- Produces: `ConfirmFor` at merge rule auto drops `approve_merge`, `deny_merge`, `alert_verdict`, `write_doc`. `fund` is in `DefaultChat.Confirm`, not in `assistedOff`, so it is confirmed at manual and assisted and free at autonomous and full auto. `AutonomyMeaning` says "money beyond a card's budget" for assisted and autonomous. `ProjectBudget.DiscretionaryEUR float64` (yaml `discretionary_eur`, absent 0: no pool) and `RaiseMaxEUR float64` (yaml `raise_max_eur`, absent 0). `PGStore.AgentFundedEUR(ctx, repository string, month time.Time) (float64, error)`: the sum of `amount_eur` over `card_funded` events of the repository with `via = 'chat'` in the UTC calendar month. The `fund` tool: params `task_id`, `eur`, `text`; refuses with a line naming the bound when `eur > RaiseMaxEUR`, when `AgentFundedEUR + eur > DiscretionaryEUR`, or when the card's budget after the raise would pass the policy's `task_max_eur`; else calls `doFund`. The ask wake text names `fund` beside `attach_analysis`.

- [ ] **Step 1: Write the failing tests**: `TestFullAutoConfirmsNoAlertVerdictOrDoc`; `TestFundIsConfirmedBelowAutonomous`; `TestFundWithinThePoolRaisesTheCard`; `TestFundAboveRaiseMaxRefuses` (the refusal names `raise_max_eur`); `TestFundPastThePoolRefuses`; `TestFundPastTaskMaxRefuses`; PG `TestAgentFundedEURSumsTheMonth`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `full auto: the agent funds from its pool, judges alerts and writes docs`.

### Task 12: Phase B lands

- [ ] **Step 1:** Full suite, merge, push both remotes. The infra repository: the policy comment and the schema land, `config-check` green.
- [ ] **Step 2:** Ledger entry naming the amended rulings 76, 77, 109 and the pool's two keys. The factory's own project file keeps `merge_rule: human` until Sebastian moves the slider.

## Phase C: the infra chain and Forgejo 17

### Task 13: The infra chain

**Files:**
- Modify (infra repository): `scripts/seed-secrets.sh` (the Forgejo pass makes user `factory-projects` a read collaborator of `sf/ai-software-factory-infra`, and mints a `write:repository` token of user `controller` into the `flux-system` secret `forgejo-commit-status`, key `token`)
- Create (infra repository): `clusters/sf/notifications.yaml` (a `Provider` of `type: gitea`, `address: https://git.aisoftwarefactory.world/sf/ai-software-factory-infra`, `secretRef: {name: forgejo-commit-status}`; an `Alert` with `eventSources` the Kustomizations `flux-system` and `platform` in `flux-system`)
- Modify (infra repository): `factory/projects/ai-software-factory-infra.yaml` (`chain: {requires: [<contexts>]}`)
- Modify (infra repository): `README.md` (the secret and the grant in the rebuild steps)

- [ ] **Step 1:** Run the seed pass. Verify: `GET /api/v1/repos/sf/ai-software-factory-infra/actions/runs` with the projects token answers 200.
- [ ] **Step 2:** Land `notifications.yaml`. Read the statuses Flux posts on that commit: `GET /repos/sf/ai-software-factory-infra/commits/<sha>/statuses` lists two contexts. Write them into the project file.
- [ ] **Step 3:** Prove the acceptance: a docs-only commit on infra `main` carries both contexts green and `config-check` green within the bound, and the poller's head row for the repository is `success`.
- [ ] **Step 4:** Commit infra: `the infra chain: the factory reads the repository, Flux reports its apply`. Ledger entry with the two context strings.

### Task 14: Forgejo 17

**Files:**
- Modify (code repository): `upstream-images.txt:63,89` (the chart and the image of 17.0, digests from the upstream)
- Modify (infra repository): `k8s/platform/forgejo/helmrelease.yaml:10,38` (the chart digest, the image tag and digest)
- Modify (infra repository): `README.md` (the upgrade's notes)

- [ ] **Step 1:** Full Forgejo backup by the README's backup procedure. Read the 16.0 and 17.0 release notes' breaking changes and list the ones that touch this installation (the absolute links change, the action run webhook deprecation, anything about the runner version) in the ledger.
- [ ] **Step 2:** Mirror the chart and the image into the store by the infra README's store procedure (the one every `upstream-images.txt` entry went through), bump both pins, run the infra chain → `config-check` green, `helmrelease-check` and `upstream-images-test` green.
- [ ] **Step 3:** After the rollout: `GET /api/v1/version` answers 17.0.x, the code repository's webhook delivers, the runner picks a job, a push run on `main` goes green.
- [ ] **Step 4:** Commit infra: `forgejo 17.0: the rerun API and the run webhook`. Ledger entry.

### Task 15: The run webhook nudges the poller

**Files:**
- Modify: `internal/factoryd/register.go:162` (`ProjectHookEvents` gains the workflow run event, by its 17 name)
- Modify: `internal/factoryd/intake.go:135-149` (the event dispatches to `handleWorkflowRun`)
- Modify: `internal/factoryd/chainpoll.go` (`Nudge`)
- Test: `internal/factoryd/intake_test.go`, `internal/factoryd/chainpoll_test.go`

**Interfaces:**
- Produces: `ChainPoller.Nudge(repository string)`: a buffered channel of one per repository; the run loop selects on the ticker and the nudges and ticks the named repository at once. `Intake.handleWorkflowRun(ctx, body)` reads the repository's full name from the payload and calls `Nudge`. The registrar subscribes existing hooks to the event on its next reconciliation.

- [ ] **Step 1: Write the failing tests**: `TestAWorkflowRunEventNudgesThePoller`; `TestANudgeTicksOneRepositoryNow`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** The event's name and payload fields come from the 17.0 webhook documentation, read during Task 14. **Step 4: Run** → PASS. **Step 5: Commit** `the run webhook nudges the chain poller`. Merge, push, roll. Verify on the next merge that the card ends within seconds of its run's end.

### Task 16: Roadmap and ledger

- [ ] **Step 1:** In the design repository: a roadmap item for this design under the existing chain items, citing the design document; the ledger's phase entries; `docs/chain-done-design-2026-10-19.md` gains one line at the top pointing to the replacing design.
- [ ] **Step 2:** Commit, push both remotes.

## Out of scope

- The drawer's full chain steps list (its design round).
- Moving the factory's own project to full auto: Sebastian's slider.
- Deleting the `chain-done` version call once no history carries it: a later change, when Temporal lists no running workflow with the marker.
