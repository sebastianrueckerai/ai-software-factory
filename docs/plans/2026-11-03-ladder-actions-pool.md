# The ladder, the actions and the pool: phase 2a of the card flow redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Written 2026-11-03. Status: built on code main `84c154da` (2026-11-03), merged from branch `ladder`, 25 task and fix commits plus the merge of main, every task reviewed and the whole branch reviewed once more before the merge. Not verified live: the factory was down when it merged. The build departs from the text below in these points. Policy: a 0 in an `escalation` part reads as the default, and `Draw.Sessions` has a minimum of 1 in the schema. Store and facts: `FundCard` keeps a `ceiling` argument so the policy cap stays atomic; the case facts carry a `Kind`, a `Final`, the trip's id and the check-in stop's kind; `tripFacts` reads the trip's head, and `RerunOnHead` is true for a head a rerun made as well as a head reran; a missing timeline makes the facts partial, and rung 0 takes nothing on partial facts. Actions and `Act`: the action names are `Act*` constants; rung 0 is keyed on the identity (`By` factoryd is rung 0 and rung 0 is factoryd's), and factoryd posts no comment; `Act` takes a `Post` callback instead of a comment id, calls it once its checks passed and before the case ends, posts factoryd's record only when none is given, and a human's answer with no words posts the resolution's sentence as the human's; the pool and the card bound are enforced inside `ResolveCase`'s transaction under an advisory lock per project for rungs 0 to 2, the human is unbounded and counted, and a ceiling raise is bounded by the pool but not recorded as a draw; `Act` holds an in-process lock per case from the claim to the resolution (one factoryd replica, as `allDoneMu` assumes); the fund's amount is `Args.eur` and `Resolution.Fund` is the draw beside another action; `extend` applies on the cap kinds, `gate_stop` and `findings_repeated`, refuses on an ended card, and takes `lines` and `checkin_shares` (0 or 1) that draw nothing, a draw of nothing is recorded and not weighed and is not the last draw the bought-nothing rule reads; `fund` and `raise_ceiling` refuse on an ended card; `withdraw` is factoryd's own; a retry of a dependency already retried finishes it through `RetryCard` and names the replacement; the step and the answer's sentence name every part an extend raised; on a case of a run from before the gate (no trip fact, no rung 0 step) an extend records its draw and raises nothing on the row. `RetryCard`: direct-track work cards only, a plan task or a report task is refused naming the action; the replacement carries the failed card's size and its sizing step. `OpenTrip` and the run: under the gate the session cap's grant, the time cap's answer, `buy` and `grantCheckin` buy nothing (the draw is the row's, an extend runs the next session, a plain comment asks again); the agent-time cap with nothing pushed asks instead of ending the card; rung 0 fires once per kind and key, and a row that `Act` refuses or that fails hands up; `retry_dependency` does not retry a retry; the impasse row runs through `Act` as `replan` with the dependency's task id; a step equal to the case's last step is not appended again; on an activity attempt after the first, the case the attempt before opened is the trip's outcome, found by trip id and kind; a restart with no live ask reopens the stop it asked last as that stop's own case; the face's footer names the fitting action per kind; the run keeps `t.head` at the head it knows, a check-in stop moves `startRef` to the push before a re-verification, a gate wait takes `handover` and `rerun_checks` beside `successor` and cancels the old head's beside runs first; a `close` resolution is a wait for the issue's close; a writer's change request at the cap records its session as the human's draw under an identity key; `closeIntoSuccessor` returns the final and the reason, and both callers finish. Console and chat: every answer meets `doAnswerValue`'s gates before `Act`; a typed action on a human card goes to `doHumanAnswer` with the action as its value, and a human card's choice gives `Act` the id of the comment its work posted; words become a grant only at a session or agent-time cap; the Grant value maps by the case's kind (one session, the card draw's agent time, one check-in share); a grant on no live case is refused; `doRetry` answers every dependent's open case; the chat's `answer` carries `action`, `fund_eur` and `args`; park and keep_waiting are notes on the case and write no `question_answered` row; a refusal names the control the actor has. Task 8: the filing answers its own confirmation through `storePlanAnswers`; `GateAudit` takes the stages' round; the audit's and the review's identity keys carry the task id; under the gate the plan loop reads the row's raises at the top of every pass, keeps a plain answer's words for the session a later extend starts, wakes on its own case's resolution and lets the case go once its wait ends. Heal: the moved-on sweep withdraws only a case that has its face or sat open past ten minutes; `Escalate` opens its case open and sets it at the human after the face; `openMissedAsks` opens nothing for an ask whose card's newest case was resolved after it. Not done: a review activity retried across the deploy writes one row with the old key and one with the new; a pre-gate run's share stop answered by Grant draws one pool session; the beside question's resolution during another wait is dropped and its comment counts; the retry's post-commit steps are not serialised per card; an audit that fails for good writes no `gate_audit` row, as the review; the audit's own gap at the cap still buys a session outside the pool. Phase 2 of [card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md) section 9 ships as two plans, each live before the next: this one, and [2026-11-03-monitor-clocks-slots.md](2026-11-03-monitor-clocks-slots.md), which builds the monitor, the clocks and the freed slots on the ladder this plan lays. Code references are to the code repository's `origin/main` at `8beeba06`. Line numbers were read there and move with every merge: grep for the symbol before trusting a line.

**Goal:** Every stop a card makes opens its case through one function that runs the mechanical resolvers first, every answer resolves a case by its id with one typed action and an optional draw from the escalation pool, and the workflow waits on one signal.

**Architecture:** One entry, `OpenTrip`, replaces the direct `Escalate` call behind `awaitHumanUntil`, the funnel every human wait of the workflow already passes through. It opens or finds the case, runs the rung 0 table in place, and only then writes the human face the console reads today. One action table in code carries the `applies` predicate, the rungs allowed and the bounds of every action. One entry, `Act`, resolves a case by id, draws from the pool in the same transaction, runs the actions that live outside the run, and sends the run one signal, `case_resolved`. The workflow takes the typed resolution under one version gate. The pool and the per-card draw bound are policy fields with code defaults, so the live tree keeps loading on the old factoryd and on the new.

**Tech Stack:** Go, Temporal (one new version gate), Postgres through hand-written SQL and embedded migrations, the policy package's generated schema, the console's Go templates and htmx, the chat tool table.

**Spec:** [card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md), sections 5.2, 5.5, 5.6, 5.7, 5.12 and 9 (phase 2). The case record and the digest are built: [2026-11-02-case-record-and-digest.md](2026-11-02-case-record-and-digest.md).

## Decisions this plan makes

Each is the planner's call where the design leaves the builder a choice, or a departure the code forced. Sebastian reads these first.

1. **Two plans for phase 2.** The monitor's flags open cases that run this plan's ladder, and this plan stands alone. Each is the size phase 1 was.
2. **The human face stays the four old records this phase.** `OpenTrip` writes the issue comment, the escalation row, the `question_asked` event and the alert that the board, the inbox, the chat and the brief writer read today, through the same code `Escalate` runs now, moved behind the case. The `question_asked` row carries `case_id`, and the case writer of phase 1 appends to that case instead of keying on the ask's words. Phase 5 moves the face to the case and drops the records.
3. **One funnel changes, not twenty call sites.** `awaitHumanUntil` is the wait every `awaitHuman`, `awaitHumanAgain`, `awaitCap`, `awaitCapWait`, screening, report, dependency, image and plan stop runs through (`workflow.go:4081`). It becomes `awaitCase` under the gate `cases`. `awaitPlan` keeps its `plan_answered` signal and `awaitApproval` keeps `approved`: their cases are kept in step by phase 1's store hooks, and their answers are typed already.
4. **A plain issue comment is an answer of kind `continue`.** A human who writes on the Forgejo issue instead of the console resolves the case with the comment as the note. Nothing is parsed. The console's `Act` posts the same comment for the record and names its id in the signal, so the webhook's copy of it is not a second answer.
5. **The pool replaces `discretionary_eur` and `raise_max_eur`.** The live tree sets neither, so the fields go. The chat's `set_pool` tool, which edits the project file by a pull request, now edits `escalation.pool.eur`. The pool's defaults: 30 sessions, 30 hours of agent time and 60 EUR per project and UTC month. The per-card draw bound of rungs 0 and 1: 2 sessions, 1 hour and 4 EUR for a medium card, half for a small, one and a half times for a large, the scale `SizeAgentTime` uses. Sebastian changes them in the tree.
6. **A human's draw is never refused, and it counts.** Rungs 0 to 2 are refused at the pool's edge and at the card bound. The human may fund past the pool, and the draw still records against it, so the pool can read overdrawn and the board digest says so.
7. **The `judgment` field lands now and is read in phase 3.** A tree that carries the key before the rungs read it avoids the rename deadlock of fault 4.
8. **Finding verdicts stay phase 3's.** The human's `overrule` of 5.5 is the check-in's verdict machinery on the case, which phase 3 builds. This phase gives the human `reverify`, which sends the head through the gates again with no session.
9. **Rung 0's rows this phase** are the ones whose facts a trip carries: route to approval, re-run the checks once, the money fact on a budget floor, the cap wait, the failed dependency's one replacement outside a plan and the impasse inside one, the identical plan re-file, the repeat guard. The closed dependency goes to the human until phase 4 gives it rung 2. "A finished pod after a roll" is a runner matter and is not a row here. The queue refusal, the wait bounds and the freed slots are the monitor plan's.
10. **`retry` is for any failed card.** `RetryPlanCard` refuses a card outside a plan. The generalised `RetryCard` keeps its guards (failed, not retried, a deterministic id) and drops the plan test, so rung 0's row and the console's Retry share it.
11. **`closeIntoSuccessor` no longer finishes the card itself.** It returns the final and the reason, and its callers finish, so `held` can return a successor chosen at any wait, not only at the check-in's stop.
12. **The size gate's budget move records `card_funded`**, closing fault 5 of the register in passing. The audit's "not run" gets an events row like the review's, so the monitor plan's `review_refused_not_run` flag can read both.

## Global Constraints

- The worktree starts from the code repository's `origin/main` at `8beeba06` or newer. Rebase before every commit.
- Workflow code changes under exactly one new version gate, `versionCases` with change id `cases`, registered in the top block of `Run` (`workflow.go:534-618`) with a field on `taskRun`, read as `t.cases >= versionCases`. The old branch stays until no pre-change run is open. No other change id. An arithmetic change whose result is identical for every existing row (a new usage field that reads 0) needs no gate.
- The live policy tree in infra main keeps loading on the old factoryd and on the new: every new key is optional with a code default, and this plan does not edit `factory/policy.yaml` or a project file. The schema copies under the infra repository's `factory/schema/` are regenerated and committed there after the code lands, with the command `internal/policy/schema.go` names.
- No new dependency. Migrations are hand-written SQL in `internal/schema/migrations/factoryd/`, named `YYYYMMDDHHMMSS_snake.sql`, sorting after `20261114090000_cases.sql`.
- Every new store method goes on the `Store` interface (`internal/factoryd/store.go:306`) with a stub on `fakeStore` (`store_test.go:44`), `acceptanceStore` (`acceptance/backends_test.go:151`), `accBatchStore` (`acceptance/batch_answer_test.go:435`) and every other fake the compiler names. A method the console needs goes on `console.Tasks` (`console.go:78`), its fakes (`fakeTasks`, `acceptTasks`, `accBatchTasks`, `AcceptanceRig`) and `stampedTasks` (`console/stamp.go:50`). A new `console.Config` func field is wired in `cmd/factoryd/main.go`, or `wiring_test.go` fails.
- Every new activity is registered in `RegisterActivities` and added to the stub map of `workflowHarness` (`workflow_test.go:152-266`).
- Every new case kind goes into the CHECK constraint by a migration and into `internal/schema/kinds_test.go`.
- Text a person reads follows the writing guide (`internal/writingguide`): short words, British spelling, no em dashes. A human is a human, never a member or an operator, in any new copy. Code identifiers keep their names.
- Every refusal names the state and the fitting action.
- The name `digest` stays the file digest tool's. The card digest's names are `CardDigest`, `card_step`, `board_digest`.
- No change to a registered agent prompt part. `CardDigest.Render`'s format is unchanged. Run the factoryd agentdoc tests before every commit that touches `carddigest*.go` or `brief.go`.
- Tests: `make test` runs `go test -race -p 1 ./...` under a throwaway Postgres. `bash check static` runs vet, gofmt and gosec. Both green before every commit. Postgres tests use `schematest.DSN(t, name)` and skip without `FACTORYD_TEST_DATABASE_URL`.
- Commit messages state what changed and why. No ruling number, no ledger path.

## Review Focus

1. A run started before the roll receives a `case_resolved` signal it has no receiver for. Its wait must still end on the posted comment: `Act` posts the comment and sends `answer_whole` for every run, gated or not. Pinned in Task 4.
2. Two answers on one case at once, a button and the chat. The second must be refused with the first's action named, and no draw may happen twice. Pinned in Task 4: the resolution and the draw are one transaction, and a case that is not live ends it.
3. A trip whose facts cannot all be read (the S3 timeline missing, the gateway's audit down) must still open the case and ask, with the facts it has. Pinned in Task 3.
4. A console answer and its own webhook copy. The comment `Act` posted arrives as `human_comment` a second later. It must not count as a second answer. Pinned in Task 6: the signal names the comment, and the answer key dedupes.
5. A human's extend past the pool goes through, and a rung's is refused with the pool's figures. Pinned in Task 4.

---

### Task 1: The escalation pool, the per-card draw bound and `judgment` in policy

**Files:**
- Modify: `internal/policy/policy.go` (`Document`, defaults, `Validate`), `internal/policy/project.go` (`ProjectConfig`, `ProjectBudget`, `checkBounds`, the validator at `project.go:625`), `internal/policy/schema.go` (`minimums`, `maximums`, `enums`)
- Modify: `internal/policy/policy_test.go`, `internal/policy/project_test.go`
- Test: `internal/policy/escalation_test.go`

**Interfaces:**
- Produces:

```go
// Draw is an amount of the escalation pool: sessions, agent time and money.
type Draw struct {
	Sessions  int           `yaml:"sessions,omitempty" json:"sessions,omitempty"`
	AgentTime time.Duration `yaml:"agent_time,omitempty" json:"agent_time,omitempty"`
	EUR       float64       `yaml:"eur,omitempty" json:"eur,omitempty"`
}

// Escalation is the escalation pool of the design's 5.7 and the field that
// says whether the AI rungs run below full auto.
type Escalation struct {
	Pool     Draw   `yaml:"pool" json:"pool"`           // per project and UTC month
	CardDraw Draw   `yaml:"card_draw" json:"card_draw"` // rungs 0 and 1, per card life, a medium card's
	Judgment string `yaml:"judgment,omitempty" json:"judgment,omitempty"`
}

const (
	JudgmentAlways             = "always"
	JudgmentAutonomousAndAbove = "autonomous_and_above"
)

var JudgmentValues = []string{JudgmentAlways, JudgmentAutonomousAndAbove}

var DefaultEscalation = Escalation{
	Pool:     Draw{Sessions: 30, AgentTime: 30 * time.Hour, EUR: 60},
	CardDraw: Draw{Sessions: 2, AgentTime: time.Hour, EUR: 4},
	Judgment: JudgmentAlways,
}

func (d Draw) IsZero() bool
func (d Draw) Fits(in Draw) bool   // every part of d at most in's part
func (d Draw) Minus(o Draw) Draw   // never below zero in any part
func (d Draw) Plus(o Draw) Draw

// Document.Escalation, absent keys take DefaultEscalation field by field.
// ProjectConfig.Escalation *Escalation, stricter wins: a project may lower
// the pool or the card draw and may not raise either above the document's.
func (t Tree) EscalationOf(repository string) Escalation
// CardDrawOf scales CardDraw by size: small halves, large takes one and a
// half times, sessions rounded up, any other size the medium figure.
func (e Escalation) CardDrawOf(size string) Draw
```

- Leaves `ProjectBudget.DiscretionaryEUR` and `RaiseMaxEUR` in place this task: Task 7 deletes them with their last readers, the validator that ties them and the test that pins the tie, in one commit.

- [ ] **Step 1: Write the failing tests**

```go
func TestEscalationDefaultsFieldByField(t *testing.T)
// a document with `escalation: {pool: {eur: 10}}` reads Pool.EUR 10,
// Pool.Sessions 30, Pool.AgentTime 30h, CardDraw as the default, Judgment "always"

func TestProjectEscalationMayOnlyLower(t *testing.T)
// a project file with escalation.pool.eur 100 under a document pool of 60
// is rejected by checkBounds with a message naming "escalation.pool.eur";
// 20 is accepted and EscalationOf returns 20

func TestCardDrawOfScalesBySize(t *testing.T)
// CardDraw {2, 1h, 4}: small {1, 30m, 2}, medium {2, 1h, 4}, large {3, 1h30m, 6}, "" medium

func TestJudgmentIsAnEnum(t *testing.T)
// "sometimes" is rejected by Validate naming JudgmentValues; the generated
// schema's enum for Escalation.Judgment equals JudgmentValues
```

- [ ] **Step 2: Run them to see them fail**

Run: `go test ./internal/policy -run 'Escalation|CardDraw|Judgment' -v`
Expected: FAIL, undefined `Escalation`.

- [ ] **Step 3: Implement**

Put `Draw` and `Escalation` in a new file `internal/policy/escalation.go`. `Document.Escalation` sits beside `Budget` and `Limits` and is filled by the same default pass those use. `Validate` rejects a negative part, a `Judgment` outside `JudgmentValues`, and a `CardDraw` with any part above the pool's. `checkBounds` compares a project's `Escalation` against the document's. Add `"Escalation.Judgment": JudgmentValues` to `enums` and `"Draw.Sessions": 0`, `"Draw.EUR": 0` to `minimums`. Regenerate the schema and run `TestSchemas` or whatever test `DiffSchemas` feeds, and fix the testdata copy it compares with.

- [ ] **Step 4: Run the package's tests**

Run: `go test ./internal/policy`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/policy
git commit -m "policy: the escalation pool, the per-card draw bound and judgment are fields with defaults, so every rung draws from one preallocated amount"
```

---

### Task 2: The draws in the store, the agent-time raise, the ceiling and the size gate's event

**Files:**
- Create: `internal/schema/migrations/factoryd/20261115090000_escalation.sql`
- Modify: `internal/factoryd/store.go` (`TaskUsage`, `Task`, `taskColumns`, `scanTask`, `FundCard`, `ExtendCard`, `SetTaskSizeBudget`, `agentFundedEUR`, the `Store` interface), `internal/factoryd/store_test.go`, `acceptance/backends_test.go`, `acceptance/batch_answer_test.go`
- Modify: `internal/factoryd/workflow.go` (`readRaise`, the four agent-time sums), `internal/factoryd/carddigest_flags.go` (`expectedBudget` reads the size gate's row as a fund)
- Test: `internal/factoryd/draws_pg_test.go`

**Interfaces:**
- Consumes: `policy.Draw` from Task 1.
- Produces:

```sql
ALTER TABLE tasks ADD COLUMN raised_time_s bigint NOT NULL DEFAULT 0,
                  ADD COLUMN ceiling_eur numeric(12,2);
CREATE INDEX events_pool_draws ON events (repository, at)
    WHERE kind IN ('card_funded','card_extended') AND detail->>'pool' = 'true';
ALTER TABLE cases DROP CONSTRAINT cases_kind_check;
ALTER TABLE cases ADD CONSTRAINT cases_kind_check CHECK (kind IN (<the phase 1 list>, 'dependency_failed'));
```

```go
// TaskUsage gains, console-owned like RaisedSessions:
RaisedTime time.Duration // the agent time an extend added, column raised_time_s
func (u TaskUsage) TimeAdded() time.Duration // ExtraTime + RetryTime + RaisedTime

// Task gains:
CeilingEUR float64 // the most this card may be funded to, 0 for the policy's

// A draw event's detail, on card_funded and card_extended rows, written by the
// inner forms below: "pool": true, "rung": 0..3, "case_id": N (0 for none),
// "head": the head at the draw, "checks": the checks verdict at the draw.
const CaseDependencyFailed CaseKind = "dependency_failed"

// Inner forms, callable inside a transaction, which FundCard and ExtendCard
// now wrap:
func (s *PGStore) fundCard(ctx context.Context, tx *sql.Tx, id string, eur, ceiling float64, e Event) (from, to float64, err error)
func (s *PGStore) extendCard(ctx context.Context, tx *sql.Tx, id string, d policy.Draw, lines int, e Event) (from, to float64, err error)

// Store gains or changes:
FundCard(ctx, id string, eur float64, e Event) (from, to float64, err error)              // loses bounds
ExtendCard(ctx, id string, d policy.Draw, lines int, e Event) (from, to float64, err error) // replaces (sessions, lines, eur)
PoolDrawn(ctx, repository string, month time.Time) (policy.Draw, error)   // the month's pool draws, rungs 0 to 3
CardDrawn(ctx, taskID string) (policy.Draw, error)                        // the card's life draws of rungs 0 and 1
SetCeiling(ctx, taskID string, eur float64, e Event) error                // writes ceiling_eur and a card_funded row with amount 0 and "ceiling_eur"
```

- `FundCard` loses `bounds`: `FundBounds` and `PoolSpentError` go, the pool check moves to `Act` (Task 4), and `CardCapError` stays as the ceiling's refusal, the ceiling now `Task.CeilingEUR` when set, else the policy's as today. The lines of an extend ride free: they are no part of the pool.
- `SetTaskSizeBudget` writes a `card_funded` row in its transaction when the budget moved: detail `{"size": sized, "from_eur", "to_eur", "amount_eur", "by": "size gate"}`, actor `FactoryDecider`, via `ViaFactoryd`.
- `readRaise` copies `RaisedTime` from the row with `RaisedSessions` and `ExtraLines`. Every sum of the form `t.cfg.WallClockCap+u.ExtraTime+u.RetryTime` becomes `t.cfg.WallClockCap+u.TimeAdded()` (four sites: `workflow.go:1600`, `grantTime`, and the two the grep finds). No gate: the field reads 0 on every existing row.

- [ ] **Step 1: Write the failing tests**

```go
func TestPoolDrawnSumsTheMonthsPoolRows(t *testing.T)
// three rows in the month: card_extended {sessions 1, agent_time_s 1800, amount_eur 0, pool true},
// card_funded {amount_eur 2.5, pool true}, card_funded {amount_eur 9, no pool key} ->
// PoolDrawn = {1, 30m, 2.5}; a row dated last month is not counted

func TestCardDrawnCountsRungsZeroAndOne(t *testing.T)
// rows with rung 0, 1, 2, 3 on one task: CardDrawn sums rung 0 and 1 only

func TestExtendCardRaisesTimeAndWritesTheDraw(t *testing.T)
// ExtendCard({1, 20m, 0.5}, 100 lines, e with detail pool true) raises
// raised_sessions 1, raised_time_s 1200, extra_lines 100, budget +0.5, and
// the card_extended row carries sessions 1, agent_time_s 1200, lines 100, amount_eur 0.5

func TestFundCardStopsAtTheCardsCeiling(t *testing.T)
// a task with ceiling_eur 6 and budget 5: FundCard 2 -> CardCapError{5}; FundCard 1 -> 6

func TestSizeGateBudgetMoveRecordsAFund(t *testing.T)
// SetTaskSizeBudget from 5 to 10 writes card_funded {amount_eur 5, by "size gate"};
// an unchanged budget writes none; and the digest's budget_moved_no_event
// flag stays quiet on that task (build the digest in the test as carddigest tests do)
```

- [ ] **Step 2: Run them to see them fail**

Run: `FACTORYD_TEST_DATABASE_URL=... go test ./internal/factoryd -run 'PoolDrawn|CardDrawn|ExtendCardRaisesTime|Ceiling|SizeGateBudget' -v`
Expected: FAIL to compile on the new names.

- [ ] **Step 3: Implement**

The sums read `detail->>'pool' = 'true'` and the UTC month as `agentFundedEUR` does, with `(detail->>'sessions')::int`, `(detail->>'agent_time_s')::bigint` and `(detail->>'amount_eur')::numeric`. `agentFundedEUR` and `AgentFundedEUR` go (`PoolDrawn` is the console's read, Task 7). Add `dependency_failed` to `kinds_test.go`.

- [ ] **Step 4: Run the store and workflow tests**

Run: `make test` (or the package under the docker Postgres)
Expected: PASS. The `ExtendCard` signature change breaks `console` callers: fix `doExtend`'s call to pass `policy.Draw{Sessions: sessions, EUR: eur}` with no other change there, since Task 7 rewrites it.

- [ ] **Step 5: Commit**

```bash
git add internal/schema internal/factoryd acceptance internal/console
git commit -m "store: draws from the escalation pool are rows with their rung and case, an extend raises agent time, a card has a ceiling, the size gate's budget move is a fund event"
```

---

### Task 3: The case facts and the action table

**Files:**
- Create: `internal/factoryd/casefacts.go`, `internal/factoryd/actions.go`
- Test: `internal/factoryd/actions_test.go`, `internal/factoryd/casefacts_test.go`

**Interfaces:**
- Consumes: `CardDigest` and its data readers (`carddigest.go`, `carddigest_timeline.go`), `Task.Left()`, `policy.Draw`, `PoolDrawn`, `CardDrawn` from Task 2.
- Produces:

```go
// CaseFacts is what the ladder knows about a case when it decides: the
// state of the work, the money, the open findings, the dependencies and
// what the pool still holds. Stored as the case's facts.
type CaseFacts struct {
	Head           string   `json:"head,omitempty"`
	PR             int64    `json:"pr,omitempty"`
	PROpen         bool     `json:"pr_open,omitempty"`
	Checks         string   `json:"checks,omitempty"` // green, red, pending or ""
	ReviewApproved bool     `json:"review_approved,omitempty"` // the newest model_review on Head was reviewed and approved
	RerunOnHead    bool     `json:"rerun_on_head,omitempty"`   // rung 0 re-ran the checks on Head once already
	Stage          string   `json:"stage,omitempty"`
	Attempts       int      `json:"attempts"`
	SessionCap     int      `json:"session_cap"`
	AgentTimeS     int64    `json:"agent_time_s"`
	AgentTimeCapS  int64    `json:"agent_time_cap_s"`
	Model          string   `json:"model,omitempty"`
	BudgetEUR      float64  `json:"budget_eur"`
	SpentEUR       float64  `json:"spent_eur"`   // Task.EnforcedSpent()
	LeftEUR        float64  `json:"left_eur"`    // Task.Left()
	FloorEUR       float64  `json:"floor_eur"`   // what the next opening needs
	CeilingEUR     float64  `json:"ceiling_eur"`
	Findings       []string `json:"findings,omitempty"` // open finding ids on Head, phase 1's ids
	LastDrawAt     *time.Time `json:"last_draw_at,omitempty"`
	DrawHead       string   `json:"draw_head,omitempty"`   // the head at the last draw
	DrawChecks     string   `json:"draw_checks,omitempty"` // the checks at the last draw
	PushedSinceDraw bool    `json:"pushed_since_draw,omitempty"`
	Dependencies   []DepFact `json:"dependencies,omitempty"`
	Plan           string   `json:"plan,omitempty"` // the parent plan's task id
	Running        bool     `json:"running,omitempty"` // a session is live
	Autonomy       string   `json:"autonomy"`
	PoolLeft       policy.Draw `json:"pool_left"`
	CardDrawLeft   policy.Draw `json:"card_draw_left"`
	Partial        []string `json:"partial,omitempty"` // the readers that failed, by name
}

type DepFact struct {
	TaskID   string `json:"task_id"`
	Issue    int64  `json:"issue"`
	Status   string `json:"status"`
	Why      string `json:"why,omitempty"`      // the end reason of a failed one
	Replaced string `json:"replaced,omitempty"` // the replacement's task id, if retried
}

// tripFacts reads every fact it can and names the readers that failed in
// Partial; it fails only when the task row itself cannot be read.
func (r *Runner) tripFacts(ctx context.Context, t Task) (CaseFacts, error)

// Action names, the typed set of 5.5.
const (
	ActionResume        = "resume"
	ActionContinue      = "continue"
	ActionHandover      = "handover"       // args: model = same | stronger | cheaper
	ActionReverify      = "reverify"
	ActionRouteApproval = "route_approval"
	ActionRerunChecks   = "rerun_checks"
	ActionExtend        = "extend"         // args: sessions, agent_time_s, lines
	ActionFund          = "fund"           // args: eur
	ActionRaiseCeiling  = "raise_ceiling"  // args: eur
	ActionSuccessor     = "successor"
	ActionRetry         = "retry"          // args: task_id of the failed dependency
	ActionReplan        = "replan"
	ActionClose         = "close"
	ActionWithdraw      = "withdraw"
	ActionNote          = "note"           // records a step and resolves nothing: today's park and keep waiting
)

// Resolution is one answer on a case: the action with its arguments, an
// optional draw that rides beside it, and a note.
type Resolution struct {
	Action string         `json:"action"`
	Args   map[string]any `json:"args,omitempty"`
	Fund   *policy.Draw   `json:"fund,omitempty"`
	Note   string         `json:"note,omitempty"`
}

// Action is one row of the action table.
type Action struct {
	Name    string
	Rungs   [4]bool                        // which rungs may pick it; index 3 is the human
	Applies func(f CaseFacts, r Resolution) string // "" when it applies, else why not, in a sentence
	InRun   bool                           // the run carries it out on case_resolved; false: Act runs it
}

var Actions []Action
func ActionByName(name string) (Action, bool)
// Offered lists the actions whose Applies holds for rung on facts f, in table order.
func Offered(f CaseFacts, rung int) []Action
// boughtNothing reports the design's refusal of a draw: a draw happened, no push
// since, the head and the checks unchanged since it.
func boughtNothing(f CaseFacts) bool
// drawWithin reports why draw d does not fit rung's bounds on f: the pool for
// rungs 0 to 2, the card bound for rungs 0 and 1, the ceiling for fund.
func drawWithin(f CaseFacts, rung int, d policy.Draw, toBudget bool) string
```

The `Applies` rules, one line each, the table in code:

| Action | Rungs | Applies when |
|---|---|---|
| resume | 0 1 2 3 | not Running, attempts left under the cap, agent time left, LeftEUR at least FloorEUR |
| continue | 1 2 3 | Note non-empty and (resume applies or Running) |
| handover | 0 1 2 3 | as resume, and args model in same, stronger, cheaper |
| reverify | 0 1 2 3 | PROpen and Head set and not Running |
| route_approval | 0 1 2 3 | PROpen, Checks green, ReviewApproved |
| rerun_checks | 0 1 2 3 | PROpen, Checks red, not RerunOnHead |
| extend | 0 1 2 3 | sessions or agent time above 0 (lines ride free), drawWithin holds for the rung, not boughtNothing |
| fund | 1 2 3 | eur above 0, drawWithin holds with toBudget, not boughtNothing |
| raise_ceiling | 2 3 | eur above 0, fits the pool |
| successor | 0 1 2 3 | PROpen or a branch head exists |
| retry | 0 1 2 3 | a dependency with Status failed and Replaced empty and a retryable Why |
| replan | 0 1 2 3 | Plan set, or the card is a direct card and not Running |
| close | 2 3 | always |
| withdraw | 0 1 2 | always, not shown to the human |
| note | 1 2 3 | Note non-empty |

`Fund` on a resolution is checked with `drawWithin` for the resolver's rung whatever the action, so a note with a draw beside it is bounded the same way.

- [ ] **Step 1: Write the failing tests**

```go
func TestResumeAppliesOnlyWithRoom(t *testing.T) // table: attempts at cap -> names "session cap"; LeftEUR below floor -> names the floor; running -> "a session is running"
func TestRouteApprovalNeedsGreenAndApproved(t *testing.T)
func TestRerunChecksOnceOnAHead(t *testing.T)
func TestExtendRefusesWhenTheLastDrawBoughtNothing(t *testing.T) // LastDrawAt set, PushedSinceDraw false, DrawHead == Head, DrawChecks == Checks -> refused naming the draw's time; a push since -> applies
func TestDrawWithinByRung(t *testing.T) // rung 1 with CardDrawLeft {0,0,0} refused naming the card bound; rung 2 same draw allowed within the pool; rung 3 past the pool allowed; rung 2 past the pool refused naming the pool
func TestFundIsNeverRungZeros(t *testing.T)
func TestOfferedFollowsTheTable(t *testing.T) // a green approved head at a cap, rung 3: route_approval, reverify, extend, successor, replan (direct), close, in that order
func TestTripFactsNamesWhatItCouldNotRead(t *testing.T) // a task with no timeline object and no audit: facts with Partial ["timeline"] and no error
```

- [ ] **Step 2: Run them to see them fail**

Run: `go test ./internal/factoryd -run 'Applies|RouteApproval|RerunChecksOnce|BoughtNothing|DrawWithin|FundIsNever|Offered|TripFacts' -v`
Expected: FAIL, undefined.

- [ ] **Step 3: Implement**

`tripFacts` reuses the digest's readers: the head and checks from the newest `gate_head` event and `HeadChecks`, the review from the newest `model_review` row on the head (`reviewed` true and verdict approve), the findings from phase 1's finding ids, the draws from the newest `card_funded` or `card_extended` row with `pool` true (`LastDrawAt`, `DrawHead`, `DrawChecks`) and `session_pushed` rows after it, the dependencies from `OpenDependencies` plus the ended ones with their `task_ended` reason and `RetryID` lookup, the pool from `PoolDrawn` and `EscalationOf`, the card bound from `CardDrawn` and `CardDrawOf`. A retryable `Why` is one that does not start with the terminal reasons: the forbidden class text of `gate`, `ReasonIssueClosed`, and the cleared-alert close. Put them in `terminalEnds []string` beside `retryableEnd(why string) bool`.

- [ ] **Step 4: Run the tests**

Run: `go test ./internal/factoryd -run 'Applies|RouteApproval|RerunChecksOnce|BoughtNothing|DrawWithin|FundIsNever|Offered|TripFacts'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd/casefacts.go internal/factoryd/actions.go internal/factoryd/casefacts_test.go internal/factoryd/actions_test.go
git commit -m "factoryd: the case facts and the action table with its applies predicates, one list every rung and the human's buttons read"
```

---

### Task 4: `Act`, the one way to answer a case

**Files:**
- Create: `internal/factoryd/act.go`
- Modify: `internal/factoryd/cases.go` (`ResolveCase` gains the draw in its transaction), `internal/factoryd/workflow.go` (the `SignalCaseResolved` constant and `CaseSignal` type only), `internal/factoryd/activities.go` (`ActivityEndCase` registered)
- Test: `internal/factoryd/act_pg_test.go`, `internal/factoryd/act_test.go`

**Interfaces:**
- Consumes: `Actions`, `drawWithin`, `CaseFacts` from Task 3, the inner `fundCard` and `extendCard` from Task 2, `RetryCard` from Task 5 (stub it as `RetryPlanCard` until Task 5 lands, then switch), `Runner.Replan`, `Runner.RerunChecks`, `doClose`'s factoryd half (`CloseCard` and the issue close), `WithdrawCase`.
- Produces:

```go
const SignalCaseResolved = "case_resolved"

// CaseSignal is case_resolved's payload: the case, its resolution, who
// resolved it on which rung, and the issue comment Act posted for it (0
// when none), so the webhook's copy of that comment is not a second answer.
type CaseSignal struct {
	CaseID  int64
	Rung    int
	By      string
	Res     Resolution
	Comment int64
}

// ActInput is one answer: by whom, on which rung, on which case (0 for an
// action on a card with no open case, such as a fund while it runs).
type ActInput struct {
	TaskID string
	CaseID int64
	By     string
	Rung   int
	Res    Resolution
}

type ActResult struct {
	Case    Case
	Did     []CaseAction // what ran outside the run, with results
	Drawn   policy.Draw
	Comment int64
	Text    string // one line for the human or the chat: what happened
}

// Act is the one way a human, the chat or a rung answers a case. It reads
// the facts, refuses an action the table does not offer rung on them,
// refuses a draw past the rung's bounds, resolves the case and writes the
// draw in one transaction, runs the actions outside the run, posts the
// comment, records the events, and signals the run.
func (r *Runner) Act(ctx context.Context, in ActInput) (ActResult, error)

// Store: ResolveCase gains the draw.
ResolveCase(ctx, id int64, r CaseResolution, d *policy.Draw, draw Event) error
// ErrCaseEnded names the resolution that ended it: "case 12 was resolved by sebastian with extend at 10:04".
type ErrCaseEnded struct{ Case Case }

// ActivityEndCase = "EndCase": the run withdraws a case whose wait ended on
// its own (a cap turned, an image came), reason in words.
func (r *Runner) EndCase(ctx context.Context, caseID int64, reason string) error
```

What `Act` does, in order:

1. Reads the task and, when `CaseID` is set, the case. A case that is not live returns `ErrCaseEnded`.
2. Builds `tripFacts`. Checks `ActionByName`, the rung, `Applies` and the fund with `drawWithin`. A refusal is one sentence naming the fact and the actions `Offered` would take, as the console's refusals do today.
3. For a draw (`extend`'s args or `Res.Fund` beside any action): the event detail `{"pool": true, "rung", "case_id", "head", "checks"}`, through `ResolveCase`'s transaction when a case is set, else `FundCard` or `ExtendCard` on their own.
4. Runs the actions outside the run: `retry` calls `RetryCard`, `replan` calls `Replan`, `close` closes the issue as `doClose` does when one exists and `CloseCard` otherwise, `withdraw` calls `WithdrawCase`, `raise_ceiling` calls `SetCeiling`. `note` appends a step and resolves nothing. Everything else is `InRun`.
5. Posts the comment on the issue as `By` when the case had an issue comment and the action is not `note` or `withdraw`: the note, or the action's sentence when the note is empty (`"extend: one session from the pool"`). This is the record the pre-roll runs wake on.
6. Records `question_answered` (or `session_granted` when the draw holds sessions, as `answerCardValue` does today) with `detail.action`, `detail.case_id` and `detail.comment`. The answer hooks of `casesFromEvent` (`cases_events.go:31-41`) resolve the case `detail.case_id` names when it is live and do nothing when it is not, instead of the newest ask case, so `Act`'s own resolution and the event's hook never touch two cases.
7. A `human_card` case takes any value of its question's choices as the action: `Act` runs nothing for it, records the value and resolves, and `doHumanAnswer` keeps doing the work as today.
8. Signals the run: `SignalCaseResolved` with `CaseSignal`, and `SignalAnswerWhole` with the comment when one was posted. Both through `Workflows.Signal` as `AnswerWhole` does. A run with no receiver for the first drops it, which is the pre-roll run's case.
9. Appends the step with `Did`, the decision and the grounds, outcome resolved, when the case resolves.

- [ ] **Step 1: Write the failing tests**

```go
func TestActRefusesAnActionTheTableDoesNotOffer(t *testing.T) // rung 1 picks close -> refused naming "rung 1" and the offered actions
func TestActResolvesAndDrawsInOneTransaction(t *testing.T) // Postgres: extend {1 session} on a live case: the case reads resolved, raised_sessions 1, the card_extended row carries pool true, rung 3, case_id; a second Act on the same case -> ErrCaseEnded naming the first's action and nothing drawn twice
func TestActRefusesARungsDrawPastThePool(t *testing.T) // pool left {0,0,0}: rung 2 extend refused naming the pool; rung 3 same draw goes through and PoolDrawn reads over the pool
func TestActSignalsTheRunAndPostsTheComment(t *testing.T) // fake workflows record case_resolved {CaseID, Res, Comment} and answer_whole {Comment}; fake forgejo holds the comment
func TestActWithNoCaseFundsTheCard(t *testing.T) // CaseID 0, fund 1 EUR on a running card: budget +1, card_funded with pool true, no case touched
func TestActNoteKeepsTheCaseOpen(t *testing.T)
func TestEndCaseWithdrawsWithTheReason(t *testing.T)
```

- [ ] **Step 2: Run them to see them fail**

Run: `go test ./internal/factoryd -run 'Act|EndCase' -v`
Expected: FAIL, undefined.

- [ ] **Step 3: Implement**

`ResolveCase`'s transaction: `UPDATE cases SET status='resolved', resolved_at=now(), resolution=$2 WHERE id=$1 AND status IN ('open','at_human') RETURNING ...`, zero rows reads the case and returns `ErrCaseEnded`, then the draw by the inner forms, then the step. The step's `Did` carries each outside action with its result text. `Act` wraps `Workflows.Signal` as `AnswerWhole` in `cmd/factoryd/main.go:611` does, so the console's `Config.Act` (Task 7) is `runner.Act`.

- [ ] **Step 4: Run the tests**

Run: `FACTORYD_TEST_DATABASE_URL=... go test ./internal/factoryd -run 'Act|EndCase|Case'`
Expected: PASS, with the phase 1 case tests still green.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd
git commit -m "factoryd: Act answers a case by id with one typed action and a draw in the same transaction, posts the record and signals the run once"
```

---

### Task 5: `RetryCard` for any failed card, and the failed dependency's trip

**Files:**
- Modify: `internal/factoryd/deps.go` (`RetryPlanCard` becomes `RetryCard`, `ReplaceFailedCard`, `DepState`, `Dependencies` activity, `awaitDependencies`), `internal/factoryd/replan.go` (`ImpassePass` calls stay), `internal/console/actions.go` (`doRetry` calls `RetryCard`), `cmd/factoryd/main.go` (the wiring)
- Test: `internal/factoryd/deps_test.go`, `internal/factoryd/deps_pg_test.go`

**Interfaces:**
- Consumes: `retryableEnd` from Task 3, `OpenTrip` from Task 6 (the workflow half of this task lands in Task 6's gate: write the activity half here, and the `awaitDependencies` branch in Task 6).
- Produces:

```go
// RetryCard files a replacement for failed card taskID once, by its
// deterministic id, whatever the card's source: the guards of RetryPlanCard
// without the plan test. A card in a plan keeps its plan key on the
// replacement as today; a card outside one gets the replacement with the
// same source and parent.
func (r *Runner) RetryCard(ctx context.Context, taskID, by string) (int64, error)

// DepState gains Failed: the first dependency that ended failed and has no
// replacement yet, nil for none.
type DepState struct { Waiting []Dep; Ended *Dep; Failed *Dep }
```

`ReplaceFailedCard`'s `UPDATE` matches `plan_key IS NOT DISTINCT FROM $2`, so a card with no plan key is replaced too. `ErrNoRetry` keeps its texts, minus the plan one.

- [ ] **Step 1: Write the failing tests**

```go
func TestRetryCardReplacesADirectCardOnce(t *testing.T) // a failed direct card: RetryCard files RetryID with the same source, the dependents repointed, the failed issue closed; a second call -> ErrNoRetry "already retried"
func TestRetryCardKeepsThePlanPath(t *testing.T) // the existing RetryPlanCard tests, renamed
func TestDependenciesNamesTheFirstFailedOne(t *testing.T) // one failed dep, no RetryID task: Failed set; with RetryID present: Failed nil and Waiting holds the replacement
```

- [ ] **Step 2: Run them to see them fail**

Run: `go test ./internal/factoryd -run 'RetryCard|DependenciesNames' -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Rename, drop the plan guard, widen the SQL, fill `Failed` in the `Dependencies` activity from `OpenDependencies` joined with the ended tasks' status. The console's `doRetry` keeps its route and its text and calls `RetryCard`.

- [ ] **Step 4: Run the tests**

Run: `go test ./internal/factoryd ./internal/console ./cmd/factoryd`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd internal/console cmd/factoryd
git commit -m "factoryd: RetryCard replaces any failed card once, and the dependency wait learns which dependency failed"
```

---

### Task 6: `OpenTrip`, rung 0 and `awaitCase` in the workflow

**Files:**
- Create: `internal/factoryd/ladder.go` (`OpenTrip`, the rung 0 table), `internal/factoryd/ladder_test.go`, `internal/factoryd/ladder_pg_test.go`
- Modify: `internal/factoryd/activities.go` (`Escalate` becomes `askHuman(ctx, t Task, c Case, reason string, choices []string) (int64, error)`, `ActivityOpenTrip` registered), `internal/factoryd/cases_events.go` (`askCase` reads `detail.case_id`), `internal/factoryd/workflow.go` (`versionCases`, `ask`, `awaitHumanUntil`, `awaitAnswer`, `held`, `buy`, `closeIntoSuccessor`, the wait ends), `internal/factoryd/deps.go` (`awaitDependencies`'s failed branch), `internal/factoryd/workflow_test.go` (the stub map)
- Test: `internal/factoryd/workflow_cases_test.go`

**Interfaces:**
- Consumes: `tripFacts`, `Actions`, `Act`, `EndCase`, `RetryCard`, `impasse`, `RerunChecks`, `CaseSignal`.
- Produces:

```go
const ActivityOpenTrip = "OpenTrip"

// TripInput is what the run knows when it stops: the reason as today's
// Escalate took it, the choices, and the head, pull request and stage when
// it has them. The kind comes from the reason as phase 1's caseKindOf
// derives it, the state key from the kind: the head for a cap, a floor, a
// gate stop or a merge matter; the dependency's task id for a dependency
// kind; phase 1's text key for a plan kind and for a kind with no head.
type TripInput struct {
	TaskID  string
	Reason  string
	Choices []string
	Head    string
	PR      int64
	Stage   string
}

// TripOutcome is what the run gets back: the case, the comment the human
// face posted (0 when rung 0 resolved it and nobody was asked), and the
// resolution when rung 0 resolved it in place.
type TripOutcome struct {
	CaseID     int64
	Comment    int64
	Resolution *Resolution
	Rung       int
}

// OpenTrip is the one function every trip calls.
func (r *Runner) OpenTrip(ctx context.Context, in TripInput) (TripOutcome, error)

// resolver is one row of rung 0: it fires on a case's kind and facts and
// returns the resolution it took, or nil.
type resolver struct {
	Name string
	Fire func(ctx context.Context, r *Runner, c Case, f CaseFacts) (*Resolution, error)
}
var rung0 []resolver
```

`OpenTrip`, in order:

1. Reads the task, builds the facts, derives the kind and the state key, the problem line from the kind's template (`ShapedQuestion`'s ask for the kinds that have one, the reason's first line otherwise).
2. `OpenCase`. When a live case with the key exists, that is the repeat guard: it appends a step `{Rung: 0, Found: "the same stop again: " + problem, Outcome: handed_up}` and, when the case is already `at_human`, returns the case with the comment of its newest ask and no new face. A `healedReason` trip finds the card's newest live ask case as `askCase` does today and returns it the same way.
3. Runs `rung0` in table order on a fresh case, the first row that fires wins, and records its step `{Rung: 0, Actor: FactoryDecider, Did, Decision, Outcome: resolved}` through `Act` with `Rung: 0`, which also writes the draw and the events. The outcome carries the resolution and no comment.
4. When no row fires: the step `{Rung: 0, Found: "no resolver fits", Outcome: handed_up}`, then `askHuman`, the body of today's `Escalate` with the case id on the `question_asked` row, and `SetCaseStatus(at_human)`. The outcome carries the comment.

The rows of `rung0`, in this order:

| Name | Fires when | Does |
|---|---|---|
| `route_approval` | kind in session_cap, agent_time_cap, budget_floor, checkin_share, gate_stop, and route_approval applies | resolution route_approval |
| `rerun_checks` | the same kinds and rerun_checks applies | resolution rerun_checks, and the case's facts get RerunOnHead true |
| `cap_wait` | kind in day_cap, month_cap, project_cap | nothing: the run's `capWait` end stays, the case waits at the human as today, and the run withdraws it with `EndCase` when the cap turns |
| `retry_dependency` | kind dependency_failed, the card is in no plan, retry applies | `RetryCard(failed, FactoryDecider)`, resolution retry |
| `impasse` | kind dependency_failed and the card is in a plan | `impasse(failed)`, resolution replan |

A budget floor opens no session already (the floor refuses at the opening). Its case carries `Money{Kind: "budget", BudgetEUR, SpentEUR, NeedEUR: FloorEUR - LeftEUR, Buys: "one session on " + Model}` and goes to the human: the money fact is the row.

The workflow under `t.cases >= versionCases`:

- `ask` executes `ActivityOpenTrip` with `TripInput{TaskID, Reason, Choices, Head: t.head, PR: t.pr.Number, Stage}` and keeps `t.escalation = out.Comment` and the anchor as today, plus `t.caseID = out.CaseID`. When `out.Resolution` is set, `ask` stores it in `t.resolution` and returns `resolved = true`.
- `awaitHumanUntil` returns at once with `("", "", nil)` when `ask` resolved. Otherwise `awaitAnswer` adds `SignalCaseResolved` to `wake`. In `pass`, every `CaseSignal` received with `CaseID == t.caseID` sets `t.resolution = &sig.Res`, inserts the note as an answer under the key `answerKey{t.escalation, sig.Comment}` (so the webhook's `human_comment` with the same id dedupes), and counts as heard. A `human_comment` that is counted and not deduped sets `t.resolution = &Resolution{Action: ActionContinue, Note: sig.Body}` when none is set yet.
- `held` under the gate: after `readRaise`, it acts on `t.resolution`: `successor` returns what `closeIntoSuccessor(t.stopFindings)` returns, where the check-in's stop sets `t.stopFindings` to its `workStateLines` before its wait and every other wait leaves it empty. `handover` sets the lifecycle's `model` from `args.model`. `reverify`, `route_approval` and `rerun_checks` set `t.reverify = true` (and `t.rerun = true` for the last), which the loop top reads before opening a session: it runs `RerunChecks(t.head)` when `rerun` and then takes the head through `t.verify` as the check-in's `verify` return does today, with no session. `extend`, `fund`, `resume`, `continue`, `note` need nothing more: the row's raises are read, the note is in `t.answers`.
- `buy` is a no-op under the gate: a draw is the row's. `grantTime` after an uncounted session stays, it is the run's own slice and no pool draw.
- `closeIntoSuccessor` returns `(final, reason string)` and no longer calls `finish`. Its two callers (`workflow.go:2278`, `:2308`) finish.
- A wait that ends on its own (`end.over()` in `awaitAnswer`) executes `ActivityEndCase(t.caseID, "the wait ended on its own: " + end's name)` before returning.
- `awaitDependencies`: when `d.Failed != nil` under the gate, `t.awaitHuman(depFailedReason(*d.Failed), nil)` with the reason prefixed so `caseKindOf` maps it to `dependency_failed` (add the prefix to `escalationSource`), then back into the loop: rung 0 retried or replanned, the wait continues on the replacement.
- Pre-gate runs take every old branch untouched.

- [ ] **Step 1: Write the failing tests**

```go
// ladder_pg_test.go
func TestOpenTripRoutesAGreenApprovedHeadToApproval(t *testing.T) // a session_cap reason on a card with an open PR, green checks, an approving model_review: the case reads resolved by FactoryDecider with route_approval, one step on rung 0, no comment posted, no question_asked row
func TestOpenTripRerunsRedChecksOnceThenAsks(t *testing.T) // first trip: rerun_checks and RerunOnHead; second trip on the same head: the same case (repeat guard), a handed_up step, the human face posted once
func TestOpenTripRepeatsAppendAndAskNothingNew(t *testing.T) // two trips with one key while at_human: one case, two steps, one comment
func TestOpenTripHealedFindsTheLiveAsk(t *testing.T)
func TestOpenTripRetriesAFailedDependencyOnce(t *testing.T) // outside a plan: RetryCard ran, the case resolved with retry; the replacement failed too -> the second trip keys on the replacement's id, retry does not apply, the human is asked
func TestOpenTripCarriesTheMoneyFact(t *testing.T) // a budget floor: Money.NeedEUR is the floor minus what is left, Buys names the model
func TestOpenTripWritesTheFaceWithTheCaseID(t *testing.T) // question_asked detail.case_id equals the case, and askCase appended to it rather than opening a text-keyed case

// workflow_cases_test.go, with workflowHarness
func TestWorkflowTakesRungZerosResolutionWithoutWaiting(t *testing.T) // OnActivity OpenTrip returns Resolution route_approval: the run verifies the head with no RunSession call
func TestWorkflowResumesOnCaseResolvedExtend(t *testing.T) // at the cap, a case_resolved extend arrives and the row reads raised_sessions 1: the next session runs
func TestWorkflowFinishesIntoTheSuccessorFromAnyWait(t *testing.T)
func TestWorkflowDedupesTheWebhookCopyOfTheAnswer(t *testing.T) // case_resolved {Comment 7} then human_comment {Comment 7}: one answer, one session
func TestWorkflowWithdrawsTheCaseWhenTheCapTurns(t *testing.T) // EndCase called with the reason
func TestWorkflowTripsOnAFailedDependency(t *testing.T)
```

- [ ] **Step 2: Run them to see them fail**

Run: `go test ./internal/factoryd -run 'OpenTrip|WorkflowTakesRung|WorkflowResumesOnCase|WorkflowFinishesInto|WorkflowDedupes|WorkflowWithdrawsTheCase|WorkflowTripsOn' -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

The body of today's `Escalate` moves into `askHuman` with the case passed in and `asked["case_id"] = c.ID`. `Escalate` stays registered for the runs from before the gate: it opens the case by the same key rules and writes the face, and runs no resolver, since the run that called it cannot take a resolution. `askCase` in `cases_events.go` reads `detail.case_id` first and appends a step to that case, falling back to the text key when absent.

- [ ] **Step 4: Run the suite**

Run: `make test` and `bash check static`
Expected: PASS, every workflow test of the old branches still green.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd
git commit -m "factoryd: every stop opens its case through OpenTrip, rung 0 resolves what needs no judgment, and the run waits on case_resolved under the cases gate"
```

---

### Task 7: The console and the chat answer through `Act`

**Files:**
- Modify: `internal/console/console.go` (`Config.Act`, `Config.PoolDrawn`, `Tasks.ExtendCard`, the nil checks), `internal/console/actions.go` (`doAnswerValue`, `answerCardValue`, `doGrantSession`, `doExtend`, `doFund`, `fundWithinBounds`, `doHumanAnswer`'s record, `doClose` keeps its route), `internal/console/chat_tools.go` (`answer`, `grant_session`, `fund` tools, the `toolInput` fields `Action` and `FundEUR`), `internal/console/pool.go` (`poolEdit` targets `escalation.pool.eur`, the `loaded` check reads `EscalationOf`), `internal/console/board.go` and `templates/board.html` (the pool line reads `PoolDrawn` against `EscalationOf`), `internal/console/access.go`, `cmd/factoryd/main.go` (`Act: runner.Act`, `PoolDrawn: store.PoolDrawn`)
- Modify: `internal/policy/project.go` (delete `DiscretionaryEUR` and `RaiseMaxEUR` with their last readers), `docs/manual/console.md` (the answers and the pool)
- Test: `internal/console/act_test.go`, the existing answer, grant, fund, extend and pool tests updated

**Interfaces:**
- Consumes: `Runner.Act`, `ActInput`, `Resolution`, `Actions`, `OpenCasesOf`, `PoolDrawn`, `EscalationOf`.
- Produces:

```go
// Config gains:
Act       func(ctx context.Context, in factoryd.ActInput) (factoryd.ActResult, error)
PoolDrawn func(ctx context.Context, repository string, month time.Time) (policy.Draw, error)

// answerAction maps a choice value of the five-part question to its action:
// grant -> extend {sessions: 1}; fund and fund:N -> fund {eur}; go -> resume;
// close -> close; successor -> successor; extend -> extend with the form's
// amounts; park and keep_waiting -> note; overrule -> reverify with the
// reason as the note; "" with text -> continue.
func answerAction(value, text string, eur float64) factoryd.Resolution
```

Every answer path finds the card's newest live case with `OpenCasesOf` and calls `Act` with `Rung: 3`, `By: a.s.user`. A card in `waiting-human` with no live case (a run from before phase 1's heal, which cannot happen after one heal pass) gets the refusal "this card waits with no open case: the heal pass opens one within a minute". The chat's `answer` tool gains `action` (one of the action names, optional) and `fund_eur` (optional). Its text alone is `continue`. `grant_session` becomes `extend {sessions: 1}` through `Act`. `fund` becomes `Act` with `fund` and `Rung: 2` when the agent decides and `Rung: 3` when a human confirmed, so the bounds are the table's: `fundWithinBounds` and `FundBounds` go. `doHumanAnswer` keeps its human-card choices and their work, and resolves the card's `human_card` case through `Act` with `Action: value`, which Task 4's rule for that kind accepts. The board's pool line shows `PoolDrawn` against `EscalationOf(repo).Pool` in the three parts, "overdrawn" when past it.

- [ ] **Step 1: Write the failing tests**

```go
func TestAnswerGoesThroughActOnTheCardsCase(t *testing.T) // the rig's fake Act records ActInput{CaseID: the open case, Rung 3, Res extend {1 session}} for the Grant button
func TestAnswerTextAloneIsContinue(t *testing.T)
func TestAnswerRefusalNamesTheOfferedActions(t *testing.T) // Act returns a refusal: the response carries it as a 409 with the text
func TestChatAnswerCarriesActionAndFund(t *testing.T) // answer {task, text, action: "reverify", fund_eur: 1}: ActInput with Res.Fund {EUR 1}
func TestAgentFundIsRungTwo(t *testing.T) // the chat's fund decided by the agent: Rung 2; confirmed by a human: Rung 3
func TestSetPoolEditsTheEscalationPool(t *testing.T) // the committed file diff sets escalation.pool.eur
func TestBoardShowsThePoolInThreeParts(t *testing.T)
```

- [ ] **Step 2: Run them to see them fail**

Run: `go test ./internal/console -run 'ThroughAct|TextAloneIs|OfferedActions|CarriesActionAndFund|AgentFundIsRung|SetPoolEdits|PoolInThreeParts' -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Delete `answerCardValue`'s own comment and record: `Act` does both. Delete `agentFundedEUR`'s console reader. The access table rows keep their roles. `docs/manual/console.md`: the answer paragraph names the typed actions in plain words and the fund beside them, the pool paragraph names the three parts and that the tree sets them.

- [ ] **Step 4: Run the suites**

Run: `go test ./internal/console ./acceptance ./cmd/factoryd ./internal/policy ./internal/manual`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/console internal/policy cmd/factoryd docs/manual/console.md
git commit -m "console: every answer, grant, extend and fund resolves the card's case through Act, the chat's answer carries an action and a draw, the pool is the escalation pool"
```

---

### Task 8: Two small records: the audit's "not run" row and the identical plan re-file

**Files:**
- Modify: `internal/factoryd/audit.go` (`recordAudit`, `AuditResult`'s not-run path), `internal/factoryd/events.go` (`EventGateAudit`), `internal/factoryd/plan.go` (the filing that calls `askConfirmation`, `plan.go:3042`)
- Test: `internal/factoryd/audit_test.go`, `internal/factoryd/plan_test.go`

**Interfaces:**
- Produces: an events row of kind `gate_audit` per audit attempt, detail `{"pr", "commit", "model", "ran": bool, "verdict", "reason"}` with `identity_key` from `(EventGateAudit, commit, round)` as `reviewFact` builds the review's, so a repeated attempt on one head writes once. `ran` is false when `AuditResult` holds the `auditNoVerdict` finding, and `reason` is that finding's text cut at `maxFactReason`.
- The identical re-file (incident I1, rung 0's row of 5.6): when the revision the planner files has the same normalised text as the newest confirmed revision of the plan, the filing still writes the confirmation question and its `question_asked` row, and answers it at once as `FactoryDecider` through `AnswerPlanQuestions` with the text "the same plan as revision N, confirmed there", so the record shows the ask and its answer, the case opens and resolves in one pass, and no human and no planner is woken. Normalised means trimmed, with runs of whitespace folded.

- [ ] **Step 1: Write the failing tests**

```go
func TestAuditRecordsItsAttemptAsAnEvent(t *testing.T) // a clear audit: gate_audit {ran true, verdict clear}; an unfunded one: {ran false, reason "the audit did not run: ..."}; the same commit and round twice: one row
func TestIdenticalPlanRefileConfirmsItself(t *testing.T) // revision 6 with revision 5's text, 5 confirmed: the confirmation of 6 reads answered by FactoryDecider naming revision 5, OpenPlanQuestions is 0, no poke row; a changed text asks as today
```

- [ ] **Step 2: Run them to see them fail**

Run: `go test ./internal/factoryd -run 'AuditRecordsItsAttempt|IdenticalPlanRefile' -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

One `r.timeline.RecordRow` call beside the timeline step in `recordAudit`, through a small `auditFact` mirroring `reviewFact`. The re-file check reads the newest confirmed revision's text from the plan's revisions as the heal's `max(plan_revisions)` read does, in the activity that files the revision, before it asks.

- [ ] **Step 4: Run the tests and commit**

Run: `go test ./internal/factoryd -run 'Audit|PlanRefile|Plan'`
Expected: PASS.

```bash
git add internal/factoryd
git commit -m "factoryd: every audit attempt is an events row that says whether it ran, and a plan re-filed unchanged confirms itself"
```

---

### Task 9: The documents follow the build

**Files:**
- Modify: `docs/card-flow-redesign-2026-11-02.md` (section 9's phase 2 text names the two plans and what this one built), `docs/plans/2026-11-03-ladder-actions-pool.md` (the status paragraph: built on which main, with every departure), `docs/needed-fixes.md` (fault 5 leaves the register with the commit named), `docs/manual/console.md` if Task 7 left a sentence out
- Run: `node launch/site/evidence.js` after both repositories' main moved, as the project's CLAUDE.md asks. Regenerate `docs/agents/` with `cmd/agentdoc` on the landed main and commit the pages if any byte moved

- [ ] **Step 1: Write the status paragraph** with the commit, the departures and what is not verified live.
- [ ] **Step 2: Run the evidence script and the agent map**, commit, push both remotes.

---

## Self-review notes

- Spec coverage: 5.2's one ladder function (Task 6), 5.5's action list with `applies`, the refusal when the last extension bought nothing and the approval request only on a green head (Task 3, Task 6's `rerun_checks` row), 5.6's rows (Task 6 and Task 8, decision 9 names the ones left), 5.7's hierarchy (Task 1, Task 2's ceiling, Task 4's bounds by rung), the `fund` call beside any action (Task 3's `Resolution.Fund`, Task 4, Task 7), 5.12's `case_resolved` and the case outside the run (Task 4, Task 6), the durable repeat guard (Task 6 step 2), the size gate's event (Task 2), the gate's not-run marker (Task 8). The queue reason, the clocks, the slots and the monitor are the monitor plan's.
- Type consistency: `policy.Draw` is the one draw type in both packages. `Resolution` is factoryd's and the console imports it. `CaseSignal.Res` is a `Resolution`. `TripOutcome.Resolution` is a pointer to one.
- What a reviewer should doubt first: Task 6 is the largest and touches the workflow. Its fix rounds will take the longest. The implementer must read `awaitAnswer`'s burst logic before touching it.
