# Chain-done Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A task is done only when its change is live: `merged` becomes a state, chains are tracked for every repository, and every red or stalled chain triggers agent-first repair that escalates to needs-you.

**Architecture:** A chain poller records every repository's main runs into `chain_runs` (generalizing the Roller's single-repo recordChain); merge moves a task to a new `merged` state whose workflow waits for a chain signal instead of finishing; done happens when a green head chain covers the card's merge commit; red or stalled chains file one repair work item per repository that runs the existing escalation ladder; the roll watcher posts its own failure verdict; CI's bootstrap escape is deleted.

**Tech Stack:** Go, Temporal workflows (the factoryd task engine), Postgres (chain_runs, tasks), Forgejo API, the console's html/template + htmx board.

**Spec:** [chain-done-design-2026-10-19.md](../chain-done-design-2026-10-19.md) — the plan argues from the spec; executors read both.

## Global Constraints

- No prompt rules where a tool or a deterministic step carries the rule.
- Every wait has a bound; every bound has a verdict; every verdict reaches the workflow or the store as a fact.
- `Final("merged")` is false. Completion, settling, costs and the ledger stay final-only.
- Existing done rows are grandfathered: tasks finished before the state exists stay done (deployLive's third clause).
- No per-project deploy code: the chain's facts come from Forgejo runs and commit statuses only.
- TDD throughout: every task is test-first, the full race suite (`scripts/pg-test.sh go test -race -p 1 ./...` in CI; locally with FACTORYD_TEST_DATABASE_URL) green before each push.
- Branch per phase in a worktree, merged to main, pushed to origin and github; the ledger (`.superpowers/sdd/2026-09-24-build-plan/progress.md`) records each phase.

## Review Focus

- A repository with several push workflows on one commit: a fast green lint run must never green a red build. Test in Task 3 (the poller records the run AND across runs; the head row's status is the AND).
- A merged card whose run never appears (paths-filtered CI, mode run): it stalls into repair within the bound, never silent. Test in Task 5.
- factoryd restarts mid-wait: the workflow re-reads recorded facts on entry and re-waits; the done poke fires exactly once, at live. Test in Task 4.
- The first pushes of a brand-new repository with mode run: no escape green; the job fails on silence at its deadline. Test in Task 8.
- A red roll after a green run: the required context holds the card undone until the watcher's failure or success verdict. Test in Task 8.

---

### Task 1: Policy chain configuration

**Files:**
- Modify: `internal/policy/project.go` (ProjectConfig, yaml parsing)
- Modify: `internal/policy/policy.go` (defaults wiring)
- Test: `internal/policy/project_test.go`

**Interfaces:**
- Produces: `type ChainConfig struct { Mode string; Requires []string; Stall time.Duration }`, `ProjectConfig.Chain ChainConfig` (yaml `chain: {mode, requires, stall}`), and `func (c ChainConfig) Resolved() ChainConfig` which fills Mode ("run" when empty — the has-workflows degradation lives in the poller), Requires (nil keeps none) and Stall (0 → 30 * time.Minute).

- [ ] **Step 1: Write the failing test** in `project_test.go`: `TestChainConfigDefaults` — a project file with `chain: {mode: "run", requires: ["factory/roll"], stall: 45m}` parses all three; an empty chain parses to Mode "", nil Requires, Stall 0; `Resolved()` fills Stall 30m and leaves Mode and Requires as given.
- [ ] **Step 2: Run** `go test ./internal/policy/ -run TestChainConfigDefaults -v` → FAIL (no field Chain).
- [ ] **Step 3: Implement** ChainConfig, the yaml keys and Resolved() in project.go.
- [ ] **Step 4: Run** the policy package → PASS.
- [ ] **Step 5: Commit** `chain config: mode, requires and stall on the project's file`.

### Task 2: Chain coverage in the store

**Files:**
- Modify: `internal/factoryd/console_store.go` (BoardTask query, deployLive)
- Modify: `internal/factoryd/console_store.go` (BoardTask.ChainLive fill)
- Test: `internal/factoryd/console_store_pg_test.go` (PG, schematest)

**Interfaces:**
- Consumes: chain_runs rows as recorded today (repository, pr_number, sha, run, status).
- Produces: the poller's head-row convention — for each main run the poller writes per-carried-PR rows (status = the run's status) plus one head row (pr_number = 0, status = run status AND every required context); `BoardTask.ChainLive bool`; deployLive's second clause replaced by coverage: a card is live when its carry row exists and the newest success run (any row, by run id) is at or after its carry run — SQL `EXISTS(carry row) AND COALESCE(max(run) over success rows,0) >= min(run) over the card's rows`. The head row carries the required contexts, so coverage includes them. The grandfather clause stays.

- [ ] **Step 1: Write the failing PG test** `TestChainCoverageHoldsTheCard`: seed repo r with carry row (pr 7, run 10, failure), head rows (run 9, success), (run 10, failure) → card pr 7 NOT live; add head row (run 12, success) → live; a card with pr 8 (no rows), finished before the first row → live (grandfather); a pr-0 card → live.
- [ ] **Step 2: Run** with FACTORYD_TEST_DATABASE_URL → FAIL.
- [ ] **Step 3: Implement** the new deployLive SQL and ChainLive fill.
- [ ] **Step 4: Run** → PASS; run the console package (its fake BoardTasks never set ChainLive; adjust the fake's default to live for done tasks so existing tests keep their meaning, one line, noted).
- [ ] **Step 5: Commit** `chain coverage: a card is live when a green head chain covers it`.

### Task 3: The chain poller per project

**Files:**
- Create: `internal/factoryd/chainpoll.go`
- Modify: `internal/factoryd/rolltask.go` (recordChain moves; the Roller keeps roll judging only)
- Modify: `cmd/factoryd/main.go` (wire one ChainPoller; the Roller keeps its repo)
- Test: `internal/factoryd/chainpoll_test.go`

**Interfaces:**
- Consumes: Task 1's ChainConfig.Resolved(); Task 2's head-row convention; the Roller's carry mapping (chainCarried, RefreshChainStatus) moved into the poller.
- Produces: `type ChainPoller struct { Forgejo *Forgejo; Store ChainStore; Projects ChainProjects; Policy func() policy.Version; Timeline *Timeline; Poll time.Duration }` with `func (p *ChainPoller) Run(ctx)`; per tick, for each project with `Resolved().Mode == "run"`: read the newest main push runs (the Roller's read), record per-PR rows and the AND head row, refresh concluded runs by sha; on a run's first conclusion post nothing for foreign repos; detect stalls (head pending or required context pending past Stall since the row's first recording) and call `p.stalled(repo, sha)`; on a red head call `p.repair(repo, run, findings)` (Task 5's interface).

- [ ] **Step 1: Write the failing test** `TestChainPollerRecordsEveryProject`: two fake repos, runs on both, both recorded (the Roller's single-repo bug as the failing shape); `TestChainPollerAndsTheRuns`: two push runs on one commit, one green one red → head row failure; `TestChainPollerDegradesNoWorkflowRepos`: a project whose workflow list is empty records nothing and is noted once.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** chainpoll.go (move recordChain/chainCarried from rolltask.go; add the per-project loop, the AND head row, the workflow-list cache, stall detection). The Roller keeps OpenRollTask/judge/rollStatus for its repo only.
- [ ] **Step 4: Run** the factoryd package → PASS (the Roller's tests keep passing; the moved recordChain tests move to chainpoll_test.go).
- [ ] **Step 5: Commit** `chain poller: every run-mode repository's chain, recorded`.

### Task 4: `merged` as the state; done at live

**Files:**
- Modify: `internal/policy/graph.go` + process states (`merged` node and edges in-review→merged→done/failed? no: merged→done only; failed stays pre-merge)
- Modify: `internal/factoryd/activities.go` (MoveTask from-sets; taskEnded fires only at done)
- Modify: `internal/factoryd/workflow.go` + `workflow_stages.go` (the merge choke point; chainWait)
- Modify: `internal/factoryd/console_store.go` (Final; BoardTasks keeps merged)
- Modify: `internal/console/board.go` (fiveColumn maps merged→colProgress; stateColumns gains Merged; the v.deploys placement hack deleted)
- Test: `internal/factoryd/workflow_chain_test.go` (mirror the rig in workflow_intake_test.go), `internal/console/approval_card_test.go` additions

**Interfaces:**
- Consumes: Task 2's ChainLive; Task 3's signals.
- Produces: status `merged` (non-final); `func (t *taskRun) chainWait()` — on entry reads ChainLive (covered → finish done "live on <project>"; else wait); the poller's `SignalChainCovered(taskID)` and the workflow's `SignalChainCovered` handler finishes done, reason "live: covered by run <id>"; the stall timer arms `ActivityChainStalled` (Task 5's interface); EventTaskEnded fires only at the done transition; the merged inform poke fires at the move; Final("merged") false; the board's v.deploys map and column() override deleted (the state carries the wait).

- [ ] **Step 1: Write the failing workflow test** `TestMergeWaitsForTheChain`: a task merges → status merged, no EventTaskEnded, no done poke; the poller signals covered → done, reason "live...", the done poke fires once; a factoryd restart mid-wait (workflow replay) re-reads facts and still fires the poke once.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the state graph edits, the choke point (one helper every merge finish calls), chainWait, the signal, and the board edits (fiveColumn, stateColumns, delete the v.deploys hack; deployStage words stay for the stage line).
- [ ] **Step 4: Run** factoryd + console packages → PASS (expect the console tests that pin done-at-merge placement to flip to merged; update by intent, hand-derived).
- [ ] **Step 5: Run** the full local suite; **Step 6: Commit** `merged is a state: done waits for the chain`.

### Task 5: Repair through the escalation ladder

**Files:**
- Modify: `internal/factoryd/chainpoll.go` (stall and red-head handling)
- Modify: `internal/factoryd/rolltask.go` (the roll task escalates after its attempts)
- Create: the repair-filing helper in chainpoll.go
- Test: `internal/factoryd/chainpoll_test.go`, `internal/factoryd/rolltask_test.go` additions

**Interfaces:**
- Consumes: Task 3's stalled()/repair() hooks.
- Produces: `func (p *ChainPoller) repair(ctx, repo, run, findings)` — the factory's repo: no-op (mainfix owns red push runs; the roll task owns red rolls); any other repo: file one repair agent card per repo while a red head persists (source `chain-repair`, deduplicated on an open repair card; objective = the failing step, its link and the affected cards' issue numbers; lane ready of the project's process). `func (p *ChainPoller) stalled(...)` — record the stall on the head row (status `stalled`), file the repair card the same way. The roll task: after its configured retries (RebaseRolls path) fail, EscalateToHuman with the five-part question (Retry the roll / park / close), its choices as buttons.

- [ ] **Step 1: Write the failing tests**: `TestRepairFilesOneCardPerRedHead` (two red ticks, one card; a second red repo, its own card); `TestRepairCardCarriesTheFindings` (objective names the failing check, the run link, the affected issues); `TestStalledHeadRecordsAndRepairs`; `TestRollEscalatesAfterAttempts` (the question's choices as buttons, needs-you).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** repair()/stalled() and the roll task's escalation.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `chain repair: one agent-first card per red head, needs-you at the ladder's end`.

### Task 6: Surfaces speak the state

**Files:**
- Modify: `internal/factoryd/pokes.go` (the merged inform; done at live)
- Modify: `internal/factoryd/alerts.go` (the chain-red and chain-stalled rules)
- Modify: `internal/console/templates/board.html` + `drawer.html` (the pill reads the status; merged words)
- Modify: `internal/console/static/console.css` (the merged pill's hue)
- Test: `internal/console/approval_card_test.go` additions, `internal/factoryd/pokes_test.go` additions

**Interfaces:**
- Consumes: Task 4's states and EventTaskEnded timing.
- Produces: the merged inform poke ("#603 merged; the chain is running", red: "the chain failed; repair #N is on it"); done's poke unchanged ("is done and live" wording); the face and drawer pills both read the status (the drawer stops saying done on an undone card); the merged pill's hue (the st-review family); statusClass/statusWord entries for merged; two alert rules, chain red and chain stalled, per project.

- [ ] **Step 1: Write the failing tests**: `TestMergedPokeInformsOnce`; `TestDonePokeSaysLive`; `TestDrawerPillReadsTheState` (a merged card's drawer pill says merged, a done card's says done); `TestChainAlertsRule` (a red head and a stalled head raise their rules).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**. **Step 4: Run** → PASS. **Step 5: Commit** `surfaces: the card speaks its chain state`.

### Task 7: The roll watcher owns its verdicts

**Files:**
- Modify: `internal/factoryd/roll.go` (the deadline path and the measured success)
- Modify: `internal/factoryd/rolltask.go` (RollFailed record)
- Test: `internal/factoryd/roll_test.go` additions

**Interfaces:**
- Consumes: the watcher's measure loop; the roller's rollStatus writer.
- Produces: on deadline, the watcher posts factory/roll failure ("not live within <timeout>; the deployments did not take the digest") for the shas it watched and records the roll requests failed; on a measured live it posts factory/roll success. The roller keeps the judge-time skip success ("nothing to roll"). The watcher's timeout stays the shortest clock (watcher < stall < CI's rollout deadline).

- [ ] **Step 1: Write the failing test** `TestWatcherDeadlinePostsFailure` (fake forgejo records the commit status; deadline forced); `TestWatcherSuccessPostsOnMeasure`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**. **Step 4: Run** → PASS. **Step 5: Commit** `roll watcher: its verdict, posted, both outcomes`.

### Task 8: CI's escape deleted

**Files:**
- Modify: `.forgejo/workflows/ci.yml` (the rollout job)

**Interfaces:**
- Consumes: Task 3 (every run-mode repo watched, verdicts exist) and Task 7 (verdicts posted on both outcomes).
- Produces: the job drops the commit-and-parent five-minute check; past its deadline it fails naming the missing verdict; the pending wait keeps polling.

- [ ] **Step 1: Edit** the job: delete the parent escape block; the deadline branch fails with "no factory/roll verdict on <sha> within 30 minutes: not proven live".
- [ ] **Step 2: Verify** by reading the job's script top to bottom (no remaining exit 0 on silence) and by the next real run on main.
- [ ] **Step 3: Commit** `ci: silence is a fault, the bootstrap escape deleted`.

### Task 9: The limbo migration

**Files:**
- Modify: `internal/factoryd/chainpoll.go` (one migration pass at startup)
- Test: `internal/factoryd/chainpoll_test.go`

**Interfaces:**
- Consumes: Task 2's ChainLive; Task 4's merged state.
- Produces: at startup the poller moves every done-but-not-live card (the old v.deploys set: done, has PR, not covered) to `merged`; grandfathered rows stay done; from then on the chain facts drive them.

- [ ] **Step 1: Write the failing PG test** `TestMigrationMovesLimboToMerged`: a done card with a red carry row → merged; a done card covered by a later green head row → stays done; a grandfathered card → stays done.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the startup pass. **Step 4: Run** → PASS. **Step 5: Commit** `chain migration: the limbo moves to merged`.

## Out of scope

- The drawer's chain steps list: ships after Sebastian's design round (roadmap 297's own deferral); the facts it needs are recorded by Task 3.
