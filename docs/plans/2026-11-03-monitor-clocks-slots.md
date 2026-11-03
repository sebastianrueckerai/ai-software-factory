# The monitor, the clocks and the freed slots: phase 2b of the card flow redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Written 2026-11-03. Status: plan, awaiting Sebastian's OK. The second half of phase 2 of [card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md) section 9. It builds on [2026-11-03-ladder-actions-pool.md](2026-11-03-ladder-actions-pool.md), which must be live first: every flag here opens a case through that plan's `OpenTrip`. Code references are to the code repository's `origin/main` at `8beeba06`, before phase 2a. Grep for the symbol before trusting a line.

**Goal:** No wait the AI owns passes its bound unseen, no refused admission is silent, no card holds a work slot while it waits on a person or a dependency, and no stuck pass takes the others down with it.

**Architecture:** One monitor reads the events table behind a cursor, as the poker does, and recomputes the flags of every card an event touched, at once. A minute sweep over every live card is the fallback for the waits no event ends, and the same sweep expires rung steps past their bound and wakes due cases. A flag new for its card and state key opens a case of kind `monitor_flag` through `OpenTrip`, where rung 0 handles the ones that need no judgment and the rest go up. The bounds are policy fields with code defaults. The minute loop of `cmd/factoryd` becomes one goroutine per pass, each under a bound with a watchdog. Slots free at the approval wait and the dependency wait by the admission count's rule, and the card leaves the merge queue at the approval wait and re-enters at its head.

**Tech Stack:** Go, Postgres, Temporal (one new version gate for the queue's leave and re-entry), the policy package, OpenTelemetry gauges as `meters.go` registers them.

**Spec:** [card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md), sections 5.4, 5.6 (the queue, the wait and the slot rows), 5.12 (the waits as rows) and 9 (phase 2).

## Decisions this plan makes

1. **The monitor copies the poker's shape.** One global cursor table, `monitor_cursor`, planted at `max(id)` on first read, advanced in the same transaction as the work, batches of 100. Per-project isolation (the waker's shape) is not needed: one pass handles every project's events in order.
2. **Flags are computed by the digest's builder, not by a second reader.** `digestFlags` of phase 1 is the one place a flag's rule lives. This plan adds the three flags phase 1 could not build for want of records and bounds: `wait_over_bound`, `queued_over_bound`, `review_refused_not_run`.
3. **A flag's case keys on the flag's name and the state it fired on**: the head for the work flags, the status with its since-time for the wait flags, the dependency's id for `dependency_failed`. One case per flag per state, however many passes see it.
4. **The bounds' defaults**, in policy under `waits`: queued 2 h, dependency 48 h, gate 6 h (the review and audit may run up to 5 h 50 m by the policy comment), merge retry 1 h, provider backoff 30 m, run quiet 30 m (today's `StaleWindow`), rung answer 35 m (the check-in's 30 m cap and a margin). `no_push_sessions` 3. A wait at the human has no row, by Sebastian's decision of 2026-11-02.
5. **The stale sweep stays as the restarter of dead workflows** (its `SignalWithStart`) and loses its own ask: a card quiet past the window whose workflow is dead is the monitor's `wait_over_bound` on `run_quiet`, and the sweep's `escalateStale` goes, so one quiet card gets one case and not two asks.
6. **A step past its bound hands up with "the rung did not answer".** No rung 1 or 2 exists until phases 3 and 4, so the row expires rung 0 steps only in practice. The mechanism lands now because phase 3 needs it on its first day and it is one query.
7. **Rung 0's rows for the flags this phase**: `wait_over_bound` and `queued_over_bound` hand up with the wait's facts (the human reads them until phase 4 gives rung 2 the board), `dependency_failed` runs phase 2a's retry row, `issue_open_after_end` runs the heal's closer in place, `slot_held_by_wait` is moot once Task 7 lands and the flag stays as the record. Every other flag hands up with the digest.
8. **The passes get their own goroutines and a bound, not a scheduler.** A helper `passLoop(ctx, name, every, bound, fn)` runs `fn` under a timeout context and logs plus sets the gauge `factory.pass.late` when it passes its bound. The heal pass, the stale sweep, the criteria pass, the revert pause pass, the impasse pass, the release pass and the SigNoz sweeps each get one. `/readyz` adds the newest pass times as `pass_<name>_age_s` so a human and the status line can see a stuck pass.
9. **The slot's status set changes in one place.** `CountAdmitted`'s SQL and `holdsSlot` read the same rule: a bound card holds a slot while `running`, `in-review` with a gate other than `approval`, or `closing`, or `queued` with `admitted_at`. `waiting-deps` and the approval wait hold none. The freed card re-takes a slot over the bound when it resumes, as parked cards do today, through `MarkStarted`.
10. **The card leaves the merge queue at the approval wait and re-enters at its head** under the gate `queue-waits`: `approval()` calls `leaveQueue` before `awaitApproval` and takes a `turn` again after an approval, which merges main in and re-runs the checks on a head change as today.

## Global Constraints

- The worktree starts from the code repository's `origin/main` with phase 2a merged. Rebase before every commit.
- Workflow code changes under exactly one new version gate, `versionQueueWaits` with change id `queue-waits`, in the top block of `Run`. The old branch stays until no pre-change run is open.
- The live policy tree keeps loading on the old factoryd and the new: every new key is optional with a code default, and this plan edits no tree file. The schema copies in the infra repository are regenerated and committed after the code lands.
- No new dependency. Migrations are hand-written SQL named after `20261115090000_escalation.sql`.
- Every new store method goes on the `Store` interface and every fake the compiler names. Every new `console.Config` func field is wired in `cmd/factoryd/main.go`.
- Every new case kind goes into the CHECK constraint by a migration and into `internal/schema/kinds_test.go`.
- No prompt part changes. `CardDigest.Render`'s format is unchanged: a new flag is one more name in the `flags:` line, which the capture fixture's card does not carry. Run the factoryd agentdoc tests before every commit that touches `carddigest*.go`.
- Text a person reads follows the writing guide. A human is a human.
- Tests: `make test` and `bash check static` green before every commit. Postgres tests use `schematest.DSN`.
- Commit messages state what changed and why. No ruling number, no ledger path.

## Review Focus

1. One card's digest fails to build (its timeline object is gone, S3 is down). The pass must log it, go on with the other cards, and move the cursor, since the minute sweep reads the card again. Pinned in Task 5.
2. A flag that stays true fires on every pass. The repeat guard of `OpenTrip` makes that one case with appended steps, and the monitor must not even call `OpenTrip` for a flag whose case is live: it checks `OpenCasesOf` by key first. Pinned in Task 5.
3. A card approved while the project is at its work bound must resume over the bound and merge. Pinned in Task 7.
4. The heal pass hangs on Forgejo. The other passes must keep their cadence, and the hang must be visible within a minute of its bound. Pinned in Task 6.
5. The stale sweep and the monitor on one quiet card: one case, no second ask. Pinned in Task 5 with Task 6's removal of `escalateStale`.

---

### Task 1: The wait bounds in policy

**Files:**
- Create: `internal/policy/waits.go`, `internal/policy/waits_test.go`
- Modify: `internal/policy/policy.go` (`Document.Waits`, defaults, `Validate`), `internal/policy/project.go` (`ProjectConfig.Waits *Waits`, stricter wins), `internal/policy/schema.go`

**Interfaces:**

```go
// Waits are the bounds of the waits the AI owns (design 5.4): a wait
// past its bound opens a case. A wait at the human has no bound here.
type Waits struct {
	Queued          time.Duration `yaml:"queued,omitempty" json:"queued,omitempty"`
	Dependency      time.Duration `yaml:"dependency,omitempty" json:"dependency,omitempty"`
	Gate            time.Duration `yaml:"gate,omitempty" json:"gate,omitempty"`
	MergeRetry      time.Duration `yaml:"merge_retry,omitempty" json:"merge_retry,omitempty"`
	ProviderBackoff time.Duration `yaml:"provider_backoff,omitempty" json:"provider_backoff,omitempty"`
	RunQuiet        time.Duration `yaml:"run_quiet,omitempty" json:"run_quiet,omitempty"`
	RungAnswer      time.Duration `yaml:"rung_answer,omitempty" json:"rung_answer,omitempty"`
	NoPushSessions  int           `yaml:"no_push_sessions,omitempty" json:"no_push_sessions,omitempty"`
}

var DefaultWaits = Waits{Queued: 2 * time.Hour, Dependency: 48 * time.Hour, Gate: 6 * time.Hour, MergeRetry: time.Hour,
	ProviderBackoff: 30 * time.Minute, RunQuiet: 30 * time.Minute, RungAnswer: 35 * time.Minute, NoPushSessions: 3}

func (t Tree) WaitsOf(repository string) Waits
// Bound is the bound of one wait kind by name: "queued", "dependency", "gate",
// "merge_retry", "provider_backoff", "run_quiet", "rung_answer"; 0 for an unknown name.
func (w Waits) Bound(kind string) time.Duration
```

A project may shorten a bound and may not lengthen one. Every duration is at least one minute and at most 7 days. `NoPushSessions` is at least 1.

- [ ] **Step 1: Write the failing tests**: `TestWaitsDefaultsFieldByField`, `TestProjectWaitsMayOnlyShorten`, `TestWaitsBoundByName`, `TestWaitsAreBounded`.
- [ ] **Step 2: Run** `go test ./internal/policy -run Waits -v`, expect FAIL.
- [ ] **Step 3: Implement**, regenerate the schema and its testdata copy.
- [ ] **Step 4: Run** `go test ./internal/policy`, expect PASS.
- [ ] **Step 5: Commit**: `policy: the bounds of the waits the AI owns are fields with defaults, one row per wait kind`.

---

### Task 2: The case's wait rows and the step's bound

**Files:**
- Create: `internal/schema/migrations/factoryd/20261116090000_case_waits.sql`
- Modify: `internal/factoryd/cases.go` (`Case`, `CaseStep`, `scanCase`, the columns, new methods), `internal/factoryd/store.go` (the interface), the fakes, `internal/schema/kinds_test.go`
- Test: `internal/factoryd/case_waits_pg_test.go`

**Interfaces:**

```sql
ALTER TABLE cases ADD COLUMN owner_rung smallint NOT NULL DEFAULT 3,
                  ADD COLUMN next_wake_at timestamptz,
                  ADD COLUMN wake_on text[] NOT NULL DEFAULT '{}';
CREATE INDEX cases_due ON cases (next_wake_at) WHERE status IN ('open','at_human') AND next_wake_at IS NOT NULL;
ALTER TABLE case_steps ADD COLUMN due_at timestamptz;
CREATE INDEX case_steps_due ON case_steps (due_at) WHERE outcome = 'in_progress' AND due_at IS NOT NULL;
ALTER TABLE cases DROP CONSTRAINT cases_kind_check;
ALTER TABLE cases ADD CONSTRAINT cases_kind_check CHECK (kind IN (<the phase 2a list>, 'monitor_flag'));
```

```go
const CaseMonitorFlag CaseKind = "monitor_flag"

// Case gains OwnerRung int, NextWakeAt *time.Time, WakeOn []string.
// CaseStep gains DueAt *time.Time.

// SetCaseWake sets who owns the next move on case id, the events that end
// its wait, and when the sweep wakes it if none does.
SetCaseWake(ctx, id int64, rung int, on []string, at *time.Time) error
// DueCases lists the live cases whose next_wake_at passed, oldest first.
DueCases(ctx, now time.Time, limit int) ([]Case, error)
// ExpireSteps ends every in_progress step past its due_at as handed_up with
// Found "the rung did not answer within <bound>", and returns them.
ExpireSteps(ctx, now time.Time) ([]CaseStep, error)
// AppendCaseStep takes DueAt when set.
```

- [ ] **Step 1: Write the failing tests**: `TestSetCaseWakeAndDueCases` (a case due a minute ago is listed, one due in an hour is not, a resolved one never), `TestExpireStepsHandsUp` (an in_progress step due a minute ago reads handed_up with the text naming its bound, and a step with no due_at is untouched).
- [ ] **Step 2: Run** them, expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `go test ./internal/factoryd -run 'CaseWake|DueCases|ExpireSteps|Case'`, expect PASS.
- [ ] **Step 5: Commit**: `cases: a case names the rung that owns its next move, the events that end its wait and its fallback wake, and a step carries its bound`.

---

### Task 3: The records the flags read: the queue reason

**Files:**
- Modify: `internal/factoryd/bounded.go` (`admit`), `internal/factoryd/store.go` (`Task.QueueReason`, `QueueSince`, `SetQueueReason`, `taskColumns`, `scanTask`), `internal/factoryd/boarddigest.go` (reads the stored reason, computes none), the fakes
- Create: `internal/schema/migrations/factoryd/20261116100000_queue_reason.sql`
- Test: `internal/factoryd/bounded_test.go`, `internal/factoryd/boarddigest_test.go`

**Interfaces:**

```sql
ALTER TABLE tasks ADD COLUMN queue_reason text NOT NULL DEFAULT '', ADD COLUMN queue_since timestamptz;
```

```go
// SetQueueReason records why card id was refused a slot at now, keeping
// queue_since from the first refusal with that reason; "" clears both.
SetQueueReason(ctx, id, reason string, now time.Time) error
```

`admit` writes the reason on every refusal: `admissionWait`'s reason, or `"work bound N of M"` when the count refused, and clears it on admission. `BoardDigest` reads `QueueReason` and `QueueSince` and no longer computes `admissionWait` itself. The reason strings are the ones `admissionWait` and the board digest already use.

- [ ] **Step 1: Write the failing tests**: `TestAdmitRecordsTheRefusalAndClearsItOnAdmission`, `TestBoardDigestReadsTheStoredQueueReason` (the queue line shows the stored reason and its age).
- [ ] **Step 2: Run** them, expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `go test ./internal/factoryd -run 'Admit|BoardDigest'`, expect PASS.
- [ ] **Step 5: Commit**: `factoryd: every refused admission writes its reason and its first refusal time on the card, which the board digest reads instead of computing`.

---

### Task 4: The three flags phase 1 could not build

**Files:**
- Modify: `internal/factoryd/carddigest_flags.go`, `internal/factoryd/carddigest.go` (`CardDigest` carries `Waits`, the status since-time, the gate, the newest step time), `internal/factoryd/carddigest_test.go`

**Interfaces:**

```go
// CardDigest gains:
StatusSince time.Time     // the newest task_status event's time
Gate        string        // the task's gate column
LastStepAt  time.Time     // the newest timeline step's time
QueueReason string
QueueSince  *time.Time
Waits       policy.Waits  // the project's bounds, filled by the builder

// A wait the AI owns, computed from the digest: its kind, its owner rung
// and since when.
type ownedWait struct{ Kind string; Rung int; Since time.Time }
func (d CardDigest) ownedWait() (ownedWait, bool)
```

The rule of `ownedWait`, one wait per card, the first row that holds:

| Card | Wait kind | Owner rung |
|---|---|---|
| `queued` with a reason, since `QueueSince` | `queued` | 0 |
| `waiting-deps` | `dependency` | 0 |
| `in-review` with a gate other than `approval` | `gate` | 0 |
| `in-review` whose newest timeline step is a failed merge with its retry pending | `merge_retry` | 0 |
| `running` whose newest session ended on a provider refusal | `provider_backoff` | 0 |
| `running` with `LastStepAt` older than `RunQuiet` | `run_quiet` | 0 |
| a case step in progress past `due_at` | `rung_answer` | the step's rung | The flags:

- `wait_over_bound(kind, since)`: the owned wait's age passed `Waits.Bound(kind)`.
- `queued_over_bound(reason, since)`: the owned wait is `queued` and its age passed `Waits.Queued`. It fires beside `wait_over_bound`, so a queued card carries the reason in its flag text.
- `review_refused_not_run(stage)`: the newest `model_review` or `gate_audit` row on the head has `reviewed` or `ran` false, and the card is `in-review`.

- [ ] **Step 1: Write the failing tests**: one per flag, with a digest built from fixture rows (`TestWaitOverBoundOnAQueuedCard`, `TestWaitOverBoundOnAQuietRun`, `TestReviewRefusedNotRunReadsBothRows`, `TestNoFlagInsideTheBound`).
- [ ] **Step 2: Run** `go test ./internal/factoryd -run 'OverBound|RefusedNotRun|InsideTheBound' -v`, expect FAIL.
- [ ] **Step 3: Implement.** Run the agentdoc tests.
- [ ] **Step 4: Run** `go test ./internal/factoryd -run 'Digest|Flag|AgentDoc'`, expect PASS.
- [ ] **Step 5: Commit**: `card digest: the wait flags read the bounds and the queue reason, and a refused review or audit flags its head`.

---

### Task 5: The monitor

**Files:**
- Create: `internal/factoryd/monitor.go`, `internal/factoryd/monitor_test.go`, `internal/factoryd/monitor_pg_test.go`
- Create: `internal/schema/migrations/factoryd/20261116110000_monitor_cursor.sql`
- Modify: `internal/factoryd/store.go` (`MonitorEvents`, `SetMonitorCursor`), the fakes, `internal/factoryd/ladder.go` (the rung 0 rows for `monitor_flag`), `cmd/factoryd/main.go` (the loop)

**Interfaces:**

```sql
CREATE TABLE monitor_cursor (one boolean PRIMARY KEY DEFAULT true CHECK (one), event_id bigint NOT NULL);
```

```go
// monitorKinds are the events that move a card's flags: task_status,
// task_ended, session_end, session_pushed, gate_head, model_review, gate_audit,
// card_funded, card_extended, question_asked, question_answered,
// plan_question_answered, approval_requested, merge_approved, merge_denied,
// pull_request_merged, card_created.
var monitorKinds []string

type Monitor struct {
	Store  Store
	Runner *Runner
	Policy func() policy.Tree
	Now    func() time.Time
}

func (m *Monitor) Loop(ctx context.Context, every time.Duration) // 5 s, like the poker
// Pass reads the events past the cursor in batches of 100 and runs card on
// each card they touch once, then moves the cursor in the same transaction.
func (m *Monitor) Pass(ctx context.Context) error
// Sweep runs card on every live card of every project, wakes the due cases
// (rung 0 again through OpenTrip's repeat path) and expires the steps past
// their bound. The minute loop calls it.
func (m *Monitor) Sweep(ctx context.Context) error
// card builds the digest, reads its flags, and opens a case for each flag
// that is new for its state key: kind monitor_flag, problem the flag's
// line, facts the digest's facts plus flag and state, state key flag|state.
func (m *Monitor) card(ctx context.Context, taskID string) error

// Store gains:
MonitorEvents(ctx, after int64, kinds []string, limit int) ([]Event, error)
SetMonitorCursor(ctx, tx rowQuerier, eventID int64) error  // inner form, planted at max(id) on first read
```

`OpenTrip`'s `TripInput` gains `Kind CaseKind`, `StateKey string` and `Extra map[string]any` for a caller that knows them, the monitor: `Extra` is merged into the case's facts beside `CaseFacts`. Rung 0's rows for `monitor_flag`, in `ladder.go`: `dependency_failed` runs the retry row. `issue_open_after_end` runs the heal's issue closer and resolves. `wait_over_bound` on `rung_answer` ends the step through `ExpireSteps`' text and hands up. Every other flag hands up with the digest in the facts, which this phase means the human face. The monitor skips a flag whose case is live (by key) before calling `OpenTrip`, so a standing flag costs no call per pass.

- [ ] **Step 1: Write the failing tests**

```go
func TestMonitorPassOpensOneCasePerNewFlag(t *testing.T) // Postgres: an event on a queued card past its bound: one monitor_flag case keyed wait_over_bound|queued|<since>; a second pass with another event: no second case, the cursor moved
func TestMonitorPassGoesOnPastACardItCannotRead(t *testing.T) // the digest fails for one card: logged, the other card's case opened, the cursor moved
func TestMonitorSweepWakesDueCasesAndExpiresSteps(t *testing.T)
func TestMonitorPlantsTheCursorAtTheNewestEvent(t *testing.T)
func TestMonitorRungZeroClosesTheIssueOfAnEndedCard(t *testing.T)
```

- [ ] **Step 2: Run** them, expect FAIL.
- [ ] **Step 3: Implement.** Wire `Monitor.Loop` in `cmd/factoryd/main.go` beside the poker, and `Sweep` into Task 6's pass list.
- [ ] **Step 4: Run** `make test`, expect PASS.
- [ ] **Step 5: Commit**: `factoryd: the monitor reads the board's events behind a cursor and opens a case for every new flag, with a minute sweep for the waits no event ends`.

---

### Task 6: Every pass on its own goroutine, under a bound, with a watchdog

**Files:**
- Create: `internal/factoryd/passes.go`, `internal/factoryd/passes_test.go`
- Modify: `cmd/factoryd/main.go` (the minute loop at `main.go:385-422` goes), `internal/factoryd/temporal.go` (`StaleSweep` keeps the nudge and loses `escalateStale`), `internal/factoryd/meters.go` (the gauge), `cmd/factoryd/main.go`'s `/readyz`

**Interfaces:**

```go
// passLoop runs fn every `every` under a context bounded by `bound`, on
// its own goroutine. A run past its bound is logged with its name and the
// time over, sets the gauge factory.pass.late{pass} to 1 until a run ends
// within the bound, and is cancelled by the context. Passes records the
// newest end time per pass for /readyz.
type Passes struct{ ... }
func (p *Passes) Run(ctx context.Context, name string, every, bound time.Duration, fn func(context.Context) error)
func (p *Passes) Ages(now time.Time) map[string]time.Duration
```

The passes and their bounds: heal 4 m, stale 2 m, criteria 4 m, revert pause 2 m, impasse 2 m, releases 4 m, monitor sweep 4 m, branch sweep 10 m (hourly), SigNoz sweeps 2 m. The `nudged` map moves into the stale sweep's own closure. `escalateStale` and its tests go: the monitor's `run_quiet` row covers the quiet card, and the sweep's `SignalWithStart` nudge stays for the dead workflow. `/readyz` prints `pass_<name>_age_s` per pass after the store ping.

- [ ] **Step 1: Write the failing tests**: `TestPassLoopBoundsARunAndFlagsIt` (a fn that blocks past the bound is cancelled, the gauge reads 1, the next quick run clears it), `TestPassesAgesNameEveryPass`, `TestStaleSweepNudgesAndAsksNothing`.
- [ ] **Step 2: Run** them, expect FAIL.
- [ ] **Step 3: Implement.** Check `cmd/factoryd/wiring_test.go` and the readyz test.
- [ ] **Step 4: Run** `make test`, expect PASS.
- [ ] **Step 5: Commit**: `factoryd: every minute pass runs on its own goroutine under a bound, a late pass is logged and metered, and the stale sweep only restarts dead runs`.

---

### Task 7: Slots freed on the approval wait and the dependency wait, and the queue left and re-entered

**Files:**
- Modify: `internal/factoryd/store.go` (`CountAdmitted`, the clear of `admitted_at` in `TransitionTask` and `SetGate` for the two waits), `internal/factoryd/carddigest.go` (`holdsSlot`), `internal/factoryd/bounded.go` (the header's rule), `internal/factoryd/workflow_stages.go` (`approval`), `internal/factoryd/queue.go` (`leaveQueue` before the wait, `turn` after), `internal/factoryd/workflow.go` (`versionQueueWaits`), `internal/factoryd/activities.go` (`pullQueued` after the two waits begin)
- Test: `internal/factoryd/bounded_test.go`, `internal/factoryd/store_pg_test.go`, `internal/factoryd/queue_test.go`, `internal/factoryd/workflow_stages_test.go`

The rule, in `CountAdmitted`'s SQL and `holdsSlot` alike: a bound agent card holds a slot while `status IN ('running','closing')`, or `status = 'in-review' AND gate <> 'approval'`, or `status = 'queued' AND admitted_at IS NOT NULL`. The transitions into `waiting-deps` and into the approval gate clear `admitted_at` and call `pullQueued`, so the next queued card starts at once. `MarkStarted` re-takes the slot over the bound as today. Under `versionQueueWaits`, `approval()` leaves the queue before `awaitApproval` and, on an approval, takes a `turn` again, which syncs main and re-runs the checks on a moved head as a head change does today, before the merge.

- [ ] **Step 1: Write the failing tests**: `TestCountAdmittedFreesTheApprovalAndDependencyWaits`, `TestEnteringAWaitPullsTheNextQueuedCard`, `TestApprovedCardResumesOverTheBound`, `TestApprovalLeavesAndReentersTheQueue` (workflow harness: `LeaveQueue` called before the approval wait, `EnterQueue` and `SyncWithMain` after the approval, the merge last).
- [ ] **Step 2: Run** them, expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `make test`, expect PASS.
- [ ] **Step 5: Commit**: `factoryd: a card waiting on a person or a dependency holds no work slot and no merge queue entry, and re-takes both when it resumes`.

---

### Task 8: The documents follow the build

**Files:**
- Modify: `docs/card-flow-redesign-2026-11-02.md` (section 9's phase 2 text), this plan's status paragraph, `docs/manual/console.md` (the pool and the pass ages on readiness, if the manual names readiness), `docs/needed-fixes.md` (fault 3's open issues read closed by the monitor's row, when they do)
- Run: `node launch/site/evidence.js`, the agent map regeneration, commit and push both remotes.

- [ ] **Step 1: Write the status paragraph** with the commit, the departures and what is not verified live.
- [ ] **Step 2: Run the evidence script and the agent map**, commit, push.

---

## Self-review notes

- Spec coverage: 5.4's event-first monitor with the minute sweep and the watchdog (Task 5, Task 6), its flags table (Task 4 adds the three missing, phase 1 holds the rest), the clocks on every wait the AI owns (Task 1, Task 4), the sweeps on their own goroutines (Task 6), 5.6's queue refusal row (Task 3), its slot row (Task 7), its wait row (Task 5), 5.12's waits as rows and the step that expires (Task 2, Task 5).
- Not here: the human's three bounds (a later step by the design), rung 1 and rung 2 (phases 3 and 4), the face (phase 5).
- What a reviewer should doubt first: Task 7's queue change is the only workflow edit, and the order of leave, approve, turn, merge must match `queue.go`'s invariants (the card holds its entry through approval today, `queue.go:14-16`). Task 6's removal of `escalateStale` must leave no card that only it would have caught: the monitor's `run_quiet` row needs the dead-workflow case too, which the digest sees as a `running` card whose steps stopped.
