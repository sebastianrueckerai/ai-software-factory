# The case record and the card digest: phase 1 of the card flow redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Written 2026-11-02. Status: built on code main `17376fb1` (2026-11-03), merged from branch `case-record`, 15 task commits plus a fix wave, every task reviewed and the whole branch reviewed once more before the merge. The build departs from the text below in these points. The case is written at the events writer for `question_asked`, `question_answered`, `question_withdrawn`, `session_granted`, `plan_question_answered` and `approval_requested`, and the five store functions that move an approval out of pending keep the merge case in step. A merge request the factory ends withdraws its case rather than recording a denial. A plan question's key carries its revision (`@rN`), so a question asked again in a later revision gets its own case. The heal pass has six rules, not three: it also withdraws plan cases of a replaced revision, withdraws non-merge, non-plan cases of a card that moved on, and opens a merge case for a pending request older than the table; it leaves asks younger than a minute to their writer and opens a human card's ask with the card's own source. `Escalate` and the stale sweep record the reason on `question_asked`. Each rendered digest line starts with its step number (format ` %3d %-6s  %-22s → %s`), folds ignore the session's attempt number, and a session's cost window ends at the next session's start. `card_created` carries the filing budget and `budget_moved_no_event` reads it. The chat's `card` and the check-in's `card_facts` lead with the digest and say "digest unreadable" and keep their facts when it fails. The drawer's fold loads on `toggle once`, on its own request's settle. A heal-opened case carries no `by`. Not done: the agent context map's loop pages are not byte-stable across runs (fault 9 of the register), and the gateway's `audit` table has no `task_id` index, so the digest's cost read scans it once per session. Phase 1 of five in [card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md), section 9. Code references are to the code repository's `origin/main` at `03b204bd`. Line numbers were read at `70725856` and may have moved in `activities.go`, `workflow.go`, `question.go`, `board.go`, `board.html`, `store.go`, `escalation.go` and `checkin.go`. Grep for the symbol before trusting a line.

**Goal:** Every ask a card makes becomes one case record with appended steps, and one deterministic builder writes a card's whole life as a few lines with named flags, readable by the chat, the check-in, the drawer and the brief writer.

**Architecture:** Two new tables, `cases` and `case_steps`, written from the one place every ask writer already passes through, the events writer, and reconciled by the heal pass. One builder, `CardDigest`, reads the task row, the events, the S3 timeline, the sessions, the gateway's audit rows, the dependencies, the approvals and the cases, and renders a skeleton with folds and flags. Three consumers get it as tools and views. No routing changes: every stop still asks as it does today, and the case is a shadow record this phase, the primary record from phase 2.

**Tech Stack:** Go, Postgres through `database/sql` and pgx with hand-written SQL and embedded migrations, the S3 timeline (`Timeline`, `internal/factoryd/timeline.go`), the console's Go templates and htmx, the chat tool table.

**Spec:** [card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md), sections 5.1, 5.3, 5.12 and 9 (phase 1).

## Global Constraints

- The worktree starts from `origin/main` at `03b204bd` or newer. Rebase before the first commit.
- No change to workflow code (`workflow.go`, `workflow_stages.go`, `plan.go`'s loops). Every new write runs in an activity or in the store, so no Temporal version gate is needed this phase.
- No new dependency. The schema is hand-written SQL in `internal/schema/migrations/factoryd/`, named `YYYYMMDDHHMMSS_snake.sql`, sorting after `20261113120000_chat_tokens.sql`.
- Every new store method goes on the `Store` interface (`internal/factoryd/store.go:289`) and gets a stub on `fakeStore` (`store_test.go:44`) and every other fake the compiler names.
- Every new kind constant with a CHECK constraint is added to `internal/schema/kinds_test.go`.
- Text a person reads follows the writing guide (`internal/writingguide`): short words, no metaphors, British spelling. A human is a human, never a member or an operator, in any new copy.
- The name `digest` is taken by the file digest tool (`policy.ToolDigest`, `internal/factoryd/digest.go`). This phase's names are `CardDigest`, `card_step`, `board_digest`. Never `digest` alone.
- Tests: `make test` runs `go test -race -p 1 ./...` under a throwaway Postgres. `bash check static` runs vet, gofmt and gosec. Both green before every commit. Postgres tests use `schematest.DSN(t, name)` and skip without `FACTORYD_TEST_DATABASE_URL`.
- Commit messages state what changed and why, with no ruling number and no ledger path.
- The companion plan landed `Task.HeldEUR`, `EnforcedSpent()` and `Left()` on main (code 3b904433). `CaseMoney.SpentEUR` reads `t.EnforcedSpent()` and `CardDigest.HoldsEUR` reads `t.HeldEUR`, not figures of their own.

## Review Focus

1. A card that never ran a session has no timeline object. `CardDigest` renders its head and its events and returns no error. Pinned in Task 4.
2. A healed restart writes a second `question_asked` with the same ask text and a NULL question. It appends one step to the open case and opens no second case. Pinned in Task 2.
3. A card answered once and asked again with a different ask has two cases, the first resolved, the second open. Pinned in Task 2.
4. A queued plan child whose `issue_number` is 0 appears in the board digest with the reason "no issue". Pinned in Task 5.
5. A timeline line with a step kind the builder does not know is skipped, and the digest still renders. Pinned in Task 4.

---

### Task 1: The `cases` and `case_steps` tables and their store

**Files:**
- Create: `internal/schema/migrations/factoryd/20261114090000_cases.sql`
- Create: `internal/factoryd/cases.go`
- Create: `internal/factoryd/cases_pg_test.go`
- Modify: `internal/factoryd/store.go:289` (the `Store` interface), `internal/factoryd/store_test.go:44` (`fakeStore` stubs)
- Modify: `internal/schema/kinds_test.go:64`

**Interfaces:**
- Produces, in `cases.go`:

```go
type CaseKind string

const (
	CaseSessionCap          CaseKind = "session_cap"
	CaseAgentTimeCap        CaseKind = "agent_time_cap"
	CaseBudgetFloor         CaseKind = "budget_floor"
	CaseDayCap              CaseKind = "day_cap"
	CaseMonthCap            CaseKind = "month_cap"
	CaseProjectCap          CaseKind = "project_cap"
	CaseCheckinHuman        CaseKind = "checkin_human"
	CaseCheckinShare        CaseKind = "checkin_share"
	CaseGateStop            CaseKind = "gate_stop"
	CaseFindingsRepeated    CaseKind = "findings_repeated"
	CaseDependencyClosed    CaseKind = "dependency_closed"
	CaseWaitExpired         CaseKind = "wait_expired"
	CasePodNeverStarted     CaseKind = "pod_never_started"
	CaseProviderRefused     CaseKind = "provider_refused"
	CaseNoAnswer            CaseKind = "no_answer"
	CaseContentFilter       CaseKind = "content_filter"
	CaseImageWait           CaseKind = "image_wait"
	CaseScreeningSuspect    CaseKind = "screening_suspect"
	CaseAgentEscalate       CaseKind = "agent_escalate"
	CaseAgentRequestInfo    CaseKind = "agent_request_info"
	CasePlanQuestion        CaseKind = "plan_question"
	CasePlanConfirmation    CaseKind = "plan_confirmation"
	CaseMergeApproval       CaseKind = "merge_approval"
	CaseHumanCard           CaseKind = "human_card"
	CaseOther               CaseKind = "other"
)

const (
	CaseOpen      = "open"
	CaseAtHuman   = "at_human"
	CaseResolved  = "resolved"
	CaseWithdrawn = "withdrawn"
)

type Case struct {
	ID         int64
	TaskID     string
	Repository string
	Kind       CaseKind
	StateKey   string
	Status     string
	Problem    string
	Facts      map[string]any
	Money      *CaseMoney
	CommentID  int64
	Follows    int64
	OpenedAt   time.Time
	ResolvedAt *time.Time
	Resolution *CaseResolution
}

type CaseMoney struct {
	Kind      string  `json:"kind"`
	BudgetEUR float64 `json:"budget_eur"`
	SpentEUR  float64 `json:"spent_eur"`
	NeedEUR   float64 `json:"need_eur,omitempty"`
	Buys      string  `json:"buys,omitempty"`
}

type CaseResolution struct {
	By     string         `json:"by"`
	Rung   int            `json:"rung"`
	Action string         `json:"action"`
	Args   map[string]any `json:"args,omitempty"`
	Reason string         `json:"reason,omitempty"`
}

type CaseStep struct {
	ID        int64
	CaseID    int64
	Rung      int
	Actor     string
	StartedAt time.Time
	EndedAt   *time.Time
	Read      []CaseRead
	Found     string
	Did       []CaseAction
	Decision  string
	Grounds   string
	CostEUR   float64
	Outcome   string
}

type CaseRead struct {
	Tool  string `json:"tool"`
	Args  string `json:"args,omitempty"`
	Bytes int    `json:"bytes"`
}

type CaseAction struct {
	Action string         `json:"action"`
	Args   map[string]any `json:"args,omitempty"`
	Result string         `json:"result,omitempty"`
}

const (
	StepInProgress = "in_progress"
	StepResolved   = "resolved"
	StepHandedUp   = "handed_up"
	StepWithdrawn  = "withdrawn"
)
```

- Store methods, on `*PGStore` and on the `Store` interface:

```go
// OpenCase inserts c unless an open or at_human case with the same
// task, kind and state key exists; then it returns that case and false.
OpenCase(ctx context.Context, c Case) (Case, bool, error)
AppendCaseStep(ctx context.Context, s CaseStep) (int64, error)
EndCaseStep(ctx context.Context, id int64, outcome, found string, did []CaseAction, decision, grounds string, costEUR float64) error
SetCaseStatus(ctx context.Context, id int64, status string) error
ResolveCase(ctx context.Context, id int64, r CaseResolution) error
WithdrawCase(ctx context.Context, id int64, reason string) error
CaseByID(ctx context.Context, id int64) (Case, error)
OpenCasesOf(ctx context.Context, taskID string) ([]Case, error)   // open and at_human, oldest first
CasesOf(ctx context.Context, taskID string) ([]Case, error)       // every status, oldest first
CaseSteps(ctx context.Context, caseID int64) ([]CaseStep, error)  // oldest first
OpenCasesIn(ctx context.Context, repository string) ([]Case, error)
```

- [ ] **Step 1: Write the migration**

`20261114090000_cases.sql`:

```sql
CREATE TABLE cases (
    id          bigserial PRIMARY KEY,
    task_id     text NOT NULL,
    repository  text NOT NULL DEFAULT '',
    kind        text NOT NULL CHECK (kind IN ('session_cap','agent_time_cap','budget_floor','day_cap','month_cap','project_cap','checkin_human','checkin_share','gate_stop','findings_repeated','dependency_closed','wait_expired','pod_never_started','provider_refused','no_answer','content_filter','image_wait','screening_suspect','agent_escalate','agent_request_info','plan_question','plan_confirmation','merge_approval','human_card','other')),
    state_key   text NOT NULL,
    status      text NOT NULL CHECK (status IN ('open','at_human','resolved','withdrawn')),
    problem     text NOT NULL,
    facts       jsonb NOT NULL DEFAULT '{}'::jsonb,
    money       jsonb,
    comment_id  bigint NOT NULL DEFAULT 0,
    follows     bigint REFERENCES cases(id),
    opened_at   timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolution  jsonb
);
CREATE UNIQUE INDEX cases_open_key ON cases (task_id, kind, state_key) WHERE status IN ('open','at_human');
CREATE INDEX cases_task ON cases (task_id, id);
CREATE INDEX cases_repo_open ON cases (repository) WHERE status IN ('open','at_human');

CREATE TABLE case_steps (
    id         bigserial PRIMARY KEY,
    case_id    bigint NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    rung       smallint NOT NULL CHECK (rung BETWEEN 0 AND 3),
    actor      text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at   timestamptz,
    read       jsonb NOT NULL DEFAULT '[]'::jsonb,
    found      text NOT NULL DEFAULT '',
    did        jsonb NOT NULL DEFAULT '[]'::jsonb,
    decision   text NOT NULL DEFAULT '',
    grounds    text NOT NULL DEFAULT '',
    cost_eur   numeric(12,6) NOT NULL DEFAULT 0,
    outcome    text NOT NULL CHECK (outcome IN ('in_progress','resolved','handed_up','withdrawn'))
);
CREATE INDEX case_steps_case ON case_steps (case_id, id);
```

- [ ] **Step 2: Write the failing store tests** in `cases_pg_test.go`, each on `OpenStore(ctx, schematest.DSN(t, "cases"))`:

```go
func TestOpenCaseReturnsTheOpenCaseOnTheSameKey(t *testing.T)
// OpenCase(kind session_cap, key "k1") → opened true, id a.
// OpenCase(same task, kind, key) → opened false, same id a, status unchanged.
// OpenCase(same task, kind, key "k2") → opened true, id b != a.
// After ResolveCase(a, {By:"sebastian", Rung:3, Action:"grant_session"}):
// OpenCase(key "k1") → opened true, new id c; CaseByID(a).Status == "resolved", Resolution.Action == "grant_session".

func TestCaseStepsKeepTheirOrderAndTheirEnd(t *testing.T)
// AppendCaseStep(rung 3, actor "factory", outcome in_progress) twice → ids s1 < s2.
// EndCaseStep(s1, handed_up, found "no new facts", did [{Action:"ask"}], decision "ask", grounds "", 0.0125).
// CaseSteps(case) → [s1, s2]; s1.EndedAt != nil, s1.CostEUR == 0.0125, s1.Did[0].Action == "ask"; s2.EndedAt == nil.

func TestWithdrawCaseRecordsItsReason(t *testing.T)
// WithdrawCase(a, "card ended done") → Status "withdrawn", Resolution.Reason == "card ended done", Resolution.Action == "withdraw".

func TestOpenCasesInListsOnlyTheRepositorysOpenCases(t *testing.T)
// three cases: repo A open, repo A resolved, repo B at_human → OpenCasesIn(A) has one, OpenCasesIn(B) has one.
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `FACTORYD_TEST_DATABASE_URL=... go test -race -p 1 ./internal/factoryd/ -run 'TestOpenCase|TestCaseSteps|TestWithdrawCase|TestOpenCasesIn' -v` (or `make test` filtered through `scripts/pg-test.sh`)
Expected: FAIL, the methods do not exist.

- [ ] **Step 4: Implement `cases.go`**: the types above, the methods on `*PGStore` with `toJSON`/`fromJSON` (`store.go:868`) for the jsonb columns, `OpenCase` as `INSERT ... ON CONFLICT (task_id, kind, state_key) WHERE status IN ('open','at_human') DO NOTHING RETURNING ...` followed by a select of the open row when nothing returned. `ResolveCase` and `WithdrawCase` set `status`, `resolved_at = now()` and `resolution`, and end every `in_progress` step of the case with the same outcome. Add the methods to the `Store` interface and stubs to `fakeStore` that return zero values and nil.

- [ ] **Step 5: Add the kind and status constants to `kinds_test.go`** so every `Case*` kind constant and every case status is inserted against the CHECK constraints, in the style of the `Alert*` block at `:64`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: the Step 3 command, then `bash check static`
Expected: PASS, static clean.

- [ ] **Step 7: Commit**

```bash
git add internal/schema/migrations/factoryd/20261114090000_cases.sql internal/factoryd/cases.go internal/factoryd/cases_pg_test.go internal/factoryd/store.go internal/factoryd/store_test.go internal/schema/kinds_test.go
git commit -m "cases: one record per problem on a card, with appended steps"
```

---

### Task 2: Cases written from the events chokepoint

Every ask writer (`Escalate` at `activities.go:1337` on origin/main, `recordAsk` ×4, `escalateStale`, the plan questions) records a `question_asked` event, every answer path records `question_answered`, withdrawal records `question_withdrawn`, and `openMergeRequest` records `approval_requested`. The case follows the event, in the same transaction, so no writer is missed.

**Files:**
- Create: `internal/factoryd/cases_events.go`
- Create: `internal/factoryd/cases_events_pg_test.go`
- Modify: `internal/factoryd/event_store.go:209` (`insertEvent`)
- Modify: the one function that moves `approval_requests.status` out of `pending` (grep `UPDATE approval_requests` in `store.go`; around `OpenApproval` at `:2282`)

**Interfaces:**
- Consumes: Task 1's types and methods.
- Produces, in `cases_events.go`:

```go
// caseFromAsk maps a question_asked event to the case it opens or appends to.
func caseFromAsk(t Task, e Event) (Case, error)
// caseKindOf maps the ask's source and reason prefixes to a CaseKind.
func caseKindOf(source, reason string) (CaseKind, map[string]any)
// caseStateKey is sha256(kind + "|" + normalised ask)[:16], plus "@" + head when a gate_head fact names one.
func caseStateKey(kind CaseKind, ask, head string) string
// casesFromEvent runs inside insertEvent's transaction for the four kinds.
func (s *PGStore) casesFromEvent(ctx context.Context, tx *sql.Tx, e Event) error
```

- [ ] **Step 1: Write the failing tests** in `cases_events_pg_test.go` on a Postgres store with a task row inserted:

```go
func TestAQuestionAskedOpensACaseAtTheHuman(t *testing.T)
// Record question_asked {source:"cap", ask:"Card 1410 asks: grant one more session?", comment: 27001, why:"...", choices:["Grant one session","Leave it waiting"]}
// → OpenCasesOf(task) has one case: Kind session_cap, Status at_human, Problem == the ask, CommentID 27001,
//   Facts["source"]=="cap", Facts["choices"] has 2, Money != nil with Kind "session_cap" and BudgetEUR == the task's budget_eur.
//   CaseSteps has one step: Rung 3, Actor "factory", Outcome in_progress.

func TestAHealedReAskAppendsAStepAndOpensNoSecondCase(t *testing.T)
// the same ask recorded again with question NULL (detail without why/info) → still one case, two steps, the second Found == "asked again after a restart".

func TestAnAnswerResolvesTheNewestOpenAskCase(t *testing.T)
// after the ask, Record question_answered {actor:"sebastian", via:"console", answer:"Grant one session", comment:27001}
// → CaseByID.Status resolved, Resolution.By "sebastian", Resolution.Action "answer", Resolution.Args["answer"]=="Grant one session"; the in_progress step ended with outcome resolved.

func TestASecondAskAfterAnAnswerOpensASecondCase(t *testing.T)
// ask A, answer, ask B (different text) → CasesOf has 2; first resolved, second at_human, second.Follows == first.ID.

func TestAWithdrawalWithdrawsTheCase(t *testing.T)
// ask, then question_withdrawn → Status withdrawn, Resolution.Reason == the event's reason detail.

func TestAnApprovalRequestOpensAMergeCaseAndItsDecisionResolvesIt(t *testing.T)
// OpenApproval(merge, pr 1479) plus its approval_requested event → one case Kind merge_approval, StateKey "pr:1479@<commit>", at_human.
// the decision write (status approved, decided_by "sebastian") → case resolved, Resolution.Action "approve", By "sebastian".

func TestCaseKindOfReadsTheSourceAndThePrefixes(t *testing.T)
// table: ("cap", "<sessionCapCard text>") → session_cap; ("cap", "<planner out of time text>") → agent_time_cap;
// ("supervisor", "check-in: policy_class: ...") → checkin_human with facts reason_kind "policy_class";
// ("supervisor", "<checkinSpendAsk prefix>...") → checkin_share; ("supervisor", "<deadlockAskMark>...") → findings_repeated;
// ("budget", ...) → budget_floor; ("month_cap", ...) → month_cap; ("queue", ...) → gate_stop; ("capacity", ...) → pod_never_started;
// ("agent", "The agent asks: ...") → agent_escalate; ("stale", ...) → wait_expired; ("chat", ...) → agent_escalate; unknown → other.
```

Read the exact prefixes from `escalationSource` (`alerts.go:97`), `checkinSpendAsk` (`workflow_stages.go:109`), `deadlockAskMark`, `sessionCapCard`, `healedReason` (`workflow.go:4439`) and `depEndedReason`, and put the real strings in the table.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `go test -race -p 1 ./internal/factoryd/ -run 'TestAQuestionAsked|TestAHealedReAsk|TestAnAnswerResolves|TestASecondAsk|TestAWithdrawal|TestAnApprovalRequest|TestCaseKindOf' -v` under the Postgres DSN
Expected: FAIL.

- [ ] **Step 3: Implement `cases_events.go`** and call `casesFromEvent` from `insertEvent` after the insert, inside its transaction, for kinds `question_asked`, `question_answered`, `question_withdrawn`, `approval_requested`. `question_asked`: read the task row, build the case with `caseFromAsk`, `OpenCase`; when not opened, append a step (rung 3, actor "factory", outcome in_progress, Found "asked again after a restart" when the detail has no `why`, else "asked again: " plus the ask). `question_answered`: the newest open case of a non-merge kind on the task, `ResolveCase` with By the event's actor, Action "answer", Args {"answer": detail answer or body, "comment": comment}. `question_withdrawn`: `WithdrawCase` with the detail's reason. `approval_requested`: `OpenCase` kind merge_approval, state key `"pr:" + pr + "@" + commit`, Problem "Pull request #N waits for a merge approval", Facts from the detail. The approval decision: in the store function that sets `approval_requests.status` from pending, resolve the task's open merge_approval case with Action "approve" or "deny" and By `decided_by`. Each new case's `Follows` is the task's newest resolved or withdrawn case id, 0 when none.

- [ ] **Step 4: Run the tests to verify they pass**, then the whole factoryd package and `bash check static`.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd/cases_events.go internal/factoryd/cases_events_pg_test.go internal/factoryd/event_store.go internal/factoryd/store.go
git commit -m "cases: every ask, answer, withdrawal and approval request writes its case at the events writer"
```

---

### Task 3: The heal pass reconciles cases

**Files:**
- Create: `internal/factoryd/cases_heal.go`
- Create: `internal/factoryd/cases_heal_pg_test.go`
- Modify: `internal/factoryd/temporal.go:219` (`HealPass`)

**Interfaces:**
- Consumes: Task 1's methods, `ListTasksByStatus` (`store.go:1961`), the newest escalation row per task (`console_store.go:125`, the LATERAL join, or `IntakeEvents` filtered by kind `escalation`).
- Produces: `func (s *PGStore) ReconcileCases(ctx context.Context, repository string) (CaseHealReport, error)` with `CaseHealReport{Withdrawn, Resolved, Opened int}`.

- [ ] **Step 1: Write the failing tests**:

```go
func TestReconcileCasesWithdrawsTheCasesOfEndedCards(t *testing.T)
// an at_human case on a task whose status is done → Withdrawn 1, Resolution.Reason "card ended done".

func TestReconcileCasesOpensACaseForAnAskThatPredatesTheTable(t *testing.T)
// a task in waiting-human with an intake_events escalation row (question jsonb set, comment 27002) and no case
// → Opened 1, the case has Kind from caseKindOf, CommentID 27002, Problem == question.ask, Status at_human.

func TestReconcileCasesResolvesAMergeCaseWhoseApprovalWasDecided(t *testing.T)
// an at_human merge case whose approval row reads approved → Resolved 1.
```

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement `ReconcileCases`**: three statements per repository. Withdraw open cases whose task status is `done`, `failed` or `closed`. Resolve open merge cases whose approval row is not pending. Open a case for every `waiting-human` task with no open case from its newest escalation row that carries a question. Call it from `HealPass` once per repository after the existing scan, log the report when any count is above 0.

- [ ] **Step 4: Run to verify they pass**, package and static.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd/cases_heal.go internal/factoryd/cases_heal_pg_test.go internal/factoryd/temporal.go
git commit -m "cases: the heal pass withdraws ended cards' cases, resolves decided approvals and opens cases for asks older than the table"
```

---

### Task 4: The card digest builder

**Files:**
- Create: `internal/factoryd/carddigest.go`
- Create: `internal/factoryd/carddigest_test.go`
- Modify: `internal/factoryd/store.go` (one new read, `SpendBetween`), `store_test.go` (the stub)

**Interfaces:**
- Consumes: `Task` (`store.go:27`), `TaskEventsFor` (`event_store.go:289`), the timeline read (`Timeline`, `timeline.go:27`, its steps `session_start`, `session_end`, `session_pushed`, `checkin`, `handover`, `checks`, `model_review`, `audit`, `escalated`, `approval_requested`), `RecentSessions` (`store.go:2208`), `Dependencies` and the dependency tasks' statuses (`deps.go`), `ApprovalRequests`, `CriteriaVerdicts` (`verdict.go:51`), `CasesOf` and `CaseSteps` (Task 1), `CountAdmitted` logic for the slot (`store.go:1890`).
- Produces:

```go
type CardDigest struct {
	Head  DigestHead
	Steps []DigestStep // pre-fold, N is 1-based
	Flags []DigestFlag
}
type DigestHead struct {
	Issue, Plan int; PlanName string
	BudgetEUR, SpentEUR, HoldsEUR float64
	SlotHeld bool; Status, Gate string; Since time.Time
}
type DigestStep struct {
	N int; At time.Time; Offset time.Duration
	Kind, Actor, Outcome string // Kind ∈ filed, session, checkin, handover, checks, review, audit, criteria, ask, answer, funded, extended, granted, approval, merged, ended, status, dependency, retried, replanned, cut
	CostEUR float64
	Findings []string // finding ids, 12 hex of sha256 over the lowercased, space-collapsed text
	Ref DigestRef     // {Session, Comment, Case, Event, Step string} whichever applies
	Count int         // 1 before folding, N after
}
type DigestFlag struct{ Name, Detail string }

// SpendBetween sums the gateway audit rows of the task in [from, to).
func (s *PGStore) SpendBetween(ctx context.Context, taskID string, from, to time.Time) (float64, error)

func (r *Runner) CardDigest(ctx context.Context, taskID string) (CardDigest, error)
func (d CardDigest) Folded() []DigestStep
func (d CardDigest) Render() string
```

Render format, exact:

```
#1410 · plan #1344 session-metrics · budget 5.00 spent 4.92 holds 0.00 EUR · slot held · in-review, approval
 +0:00  filed by planner        → revision 2, depends on #1402 (done)
 +0:41  session 1 small         → pushed a1b2c3d, 0.41 EUR, 23 calls
 +0:58  review                  → concerns, findings 3f2a1c9b0e44 7d1e0aa2c4f1
 +1:02  checkin gate            → confirmed 3f2a1c9b0e44 7d1e0aa2c4f1, handover
 +2:10  ask                     → session_cap: Card 1410 asks: grant one more session?
 +9:40  answer by sebastian     → Grant one session
 +9:41  session 4 small         → no push ×2
flags: finding_confirmed_twice(3f2a1c9b0e44), grant_bought_nothing(session 4), money_ask_hides_findings
```

Line: `fmt.Sprintf(" %-6s  %-22s → %s", offset, kindActor, outcome)`, offset `+h:mm` with hours unbounded. A folded run appends ` ×N` to the outcome. The flags line reads `flags: none` when empty. Costs print with two decimals and ` EUR`. The head's `slot held` prints only when held, the status prints as `status, gate` or `status` alone when the gate is empty.

- [ ] **Step 1: Write the failing tests** in `carddigest_test.go` on `fakeStore` plus a fake timeline (find how `Runner` tests inject a timeline: grep `fakeTimeline` or the object store fake in `timeline_test.go`). Seed the #1410-shaped sequence above with fixed times (filed 2026-11-01T00:00Z, session 1 at +41m with a `session_end` outcome `pushed` and audit spend 0.41 over 23 rows, review at +58m with findings "metricDivideReplans lacks e.repository = $1" and "metricDividePlansByRounds lacks e.repository = $1", a checkin step at +62m confirming both, a `question_asked` at +130m source cap, a `question_answered` at +580m by sebastian, two sessions at +581m and +600m with outcome `no_push`):

```go
func TestCardDigestRendersTheSkeleton(t *testing.T)
// Render() == the exact 9 lines above, with the finding ids computed by the test from the same hash.

func TestCardDigestFoldsConsecutiveIdenticalSteps(t *testing.T)
// Folded() has one step for the two no_push sessions with Count 2, N == the first's N.

func TestCardDigestFlagsAGrantThatBoughtNothing(t *testing.T)
// Flags contains {grant_bought_nothing, "session 4"}: an answer or card_funded/session_granted followed by a session that ended without a push and no newer session_pushed.

func TestCardDigestFlagsAFindingConfirmedTwice(t *testing.T)
// two checkin steps confirming the same finding id → {finding_confirmed_twice, "<id>"}.

func TestCardDigestFlagsMoneyAskHidingFindings(t *testing.T)
// an open case with Money != nil while the newest review verdict is concerns → {money_ask_hides_findings, ""}.

func TestCardDigestFlagsAnswerChangedNothing(t *testing.T)
// a resolved case, then an open case with the same StateKey → {answer_changed_nothing, "<state key>"}.

func TestCardDigestFlagsTheOtherPatterns(t *testing.T)
// table: checkin_cut (a checkin step whose record has no decision), session_no_push (2 consecutive no-push sessions, the constant sessionNoPushBound = 2),
// slot_held_by_wait (status waiting-deps with admitted_at set, or in-review at gate approval), dependency_failed (a dependency task with status failed),
// issue_open_after_end (status done and an open case), budget_moved_no_event (budget_eur != 5.00 default + sum of card_funded/card_extended amounts).

func TestCardDigestWithoutATimelineRendersTheEventsAlone(t *testing.T)
// the timeline read returns not-found → no error, Render() has the head and the filed/ask lines.

func TestCardDigestSkipsAStepKindItDoesNotKnow(t *testing.T)
// a timeline line with kind "zebra" → no error, not in Steps.
```

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement `carddigest.go`**: gather the rows, map each source row to a `DigestStep` (the table of source → Kind is the Interfaces block's Kind list; a session's cost is `SpendBetween(session_start, session_end)`; a session's calls is the count of audit rows in that window, add `CallsBetween` beside `SpendBetween` if the count needs its own query), sort by time, number, compute the flags in one pass over the sorted steps and the cases, then `Folded` and `Render`. Finding ids by the hash rule. `SpendBetween` reads the gateway `audit` table as `CheckinSpent` (`store.go:1547`) does, over `ts`.

- [ ] **Step 4: Run to verify they pass**, package and static.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd/carddigest.go internal/factoryd/carddigest_test.go internal/factoryd/store.go internal/factoryd/store_test.go
git commit -m "card digest: a card's life as a few lines, folded, with named flags"
```

---

### Task 5: The step detail and the board digest

**Files:**
- Create: `internal/factoryd/carddigest_detail.go`
- Create: `internal/factoryd/carddigest_detail_test.go`
- Create: `internal/factoryd/boarddigest.go`
- Create: `internal/factoryd/boarddigest_test.go`

**Interfaces:**
- Consumes: Task 4's `CardDigest` and `DigestRef`, the session step reader the chat's `session_steps` tool uses (`internal/console/chat_tools.go`, the `session_steps` entry, which calls a factoryd reader; reuse that reader), `CaseSteps`, the admission checks of `BoundedWorkflows.admit` (`bounded.go:74`) read as pure functions, `CountAdmitted`, `WorkInProgressOf` (`project.go:130`), the queue (`queue.go`), the plan close state (`plan_closed` event absent), the month and day spend reads the month alarm uses (`monthcap.go`).
- Produces:

```go
// CardStep returns one step of the card's digest in full: a session's steps, a gate's full result,
// a check-in's record with its calls, an ask's five parts and its answer, a funding event's detail.
func (r *Runner) CardStep(ctx context.Context, taskID string, n int) (string, error)

type BoardDigest struct {
	Cards  []BoardDigestCard // live cards: not done, failed or closed
	Queue  []BoardDigestQueued
	Slots  BoardDigestSlots  // {Held, Bound int}
	Plans  []BoardDigestPlan // {Issue int; Name string; Children map[string]int}
	Caps   []BoardDigestCap  // {Name string; SpentEUR, CapEUR float64}
}
type BoardDigestCard struct{ Issue int; Status, Gate string; Age time.Duration; SlotHeld bool; Flags []DigestFlag }
type BoardDigestQueued struct{ Issue int; Reason string } // Reason ∈ "no issue", "waits on #N", "project month cap", "work bound 5 of 5", "next"

func (r *Runner) BoardDigest(ctx context.Context, repository string) (BoardDigest, error)
func (b BoardDigest) Render() string
```

Render format, exact:

```
cards 7 live · slots 5 of 5 · queue 4
#1410  in-review, approval   9h40m  slot  flags finding_confirmed_twice, money_ask_hides_findings
#1452  waiting-deps          3h02m  slot  flags dependency_failed(#1451), slot_held_by_wait
#1472  running, session      0h12m  slot
queue:
#1453  waits on #1451
#1414  work bound 5 of 5
#1460  no issue
plans:
#1344 session-metrics  done 9 · running 2 · queued 3 · failed 1
caps:
month 544.00 of 600.00 EUR · day 12.40 of 150.00 EUR
```

- [ ] **Step 1: Write the failing tests**:

```go
func TestCardStepReturnsASessionsStepsForASessionLine(t *testing.T)
// n of a session step → the string contains the session id and one line per timeline step of that session.

func TestCardStepReturnsTheFivePartsAndTheAnswerForAnAskLine(t *testing.T)
// n of an ask step → contains "Ask:", "Why:", "Choices:", and after an answer "Answer by sebastian:".

func TestCardStepRefusesAnUnknownStep(t *testing.T)
// n == 0 or n > len(Steps) → error "no step N on #1410".

func TestBoardDigestRendersLiveCardsQueueSlotsPlansAndCaps(t *testing.T)
// seed the fake store with the three live cards, three queued (one waits on a failed #1451, one at the work bound, one with issue_number 0), one plan, the caps → Render() == the exact block above (ages from a fixed now).

func TestBoardDigestNamesAQueuedCardWithoutAnIssue(t *testing.T)
// issue_number 0 → Reason "no issue" (Review Focus 4).
```

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement both files.** `BoardDigest` builds each live card's `CardDigest` for its flags (one timeline read per live card, bounded by `work_in_progress` plus the parked cards). The queue reason runs the same checks as `admit` in order: issue 0 → "no issue", open dependencies → "waits on #N" naming the first, project cap → "project month cap", `CountAdmitted >= bound` → "work bound H of B", else "next".

- [ ] **Step 4: Run to verify they pass**, package and static.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd/carddigest_detail.go internal/factoryd/carddigest_detail_test.go internal/factoryd/boarddigest.go internal/factoryd/boarddigest_test.go
git commit -m "card digest: one step in full, and the board as one line per card with queue reasons"
```

---

### Task 6: The tools: the chat's `card`, `card_step` and `board_digest`, the check-in's `card_facts` and `card_step`

**Files:**
- Modify: `internal/console/chat_tools.go:1216` (the `tools` table: `card`, new `card_step`, new `board_digest`), `internal/policy/policy.go:131` (`ChatTools`, append the two names), `internal/console/access.go:157` (two rows, same role as `card_history`), `internal/console/chat_test.go:1527, 1938, 1946` (the expected tool lists)
- Modify: `internal/factoryd/checkin.go:451` (`checkinTools`: `card_facts` description, new `card_step`), `checkin.go:430` (`checkinSystem` names the tools), `internal/factoryd/runner.go:1307` (`(*runnerTools).Tool` cases)
- Test: `internal/console/chat_test.go`, `internal/factoryd/checkin_test.go` (or the file that tests `runnerTools.Tool`)

**Interfaces:**
- Consumes: Task 4's `(*Runner).CardDigest` and `Render`, Task 5's `CardStep` and `BoardDigest`. The console reaches factoryd readers through its `cfg` (see how `card_history` reaches `cfg.Events.TaskEvents`); add `CardDigest`, `CardStep` and `BoardDigest` to that config surface the same way.
- Produces: tool names `card_step` (params `task_id`, `step` integer ≥ 1) and `board_digest` (no params) for the chat. The chat's `card` output starts with `CardDigest.Render()` followed by a blank line and the output it has today. The check-in's `card_facts` output starts the same way, followed by `p.facts`. The check-in's `card_step` takes `step`.

- [ ] **Step 1: Write the failing tests**:

```go
// internal/console/chat_test.go, on newChatRig
func TestChatCardLeadsWithTheDigest(t *testing.T)   // the card tool's result starts with "#" + issue + " ·" and contains "flags:"
func TestChatCardStepReturnsOneStep(t *testing.T)    // card_step{task_id, step:1} returns the filed line's detail
func TestChatBoardDigestRendersTheBoard(t *testing.T) // board_digest returns a string starting with "cards "

// internal/factoryd
func TestCheckinCardFactsLeadsWithTheDigest(t *testing.T)
func TestCheckinCardStepReturnsOneStep(t *testing.T)
```

- [ ] **Step 2: Run to verify they fail**, including `TestAccessTableCatchesAMissingEntry` and the tool-list tests once the names are added.

- [ ] **Step 3: Implement.** Keep `card`'s existing body after the digest. `card_step` and `board_digest` are read-only, not priced, offered to the same roles as `card_history`. In the check-in, `card_step` reads from factoryd in-process (not posted to the pod).

- [ ] **Step 4: Run** the console and factoryd packages and `bash check static`.

- [ ] **Step 5: Commit**

```bash
git add internal/console/chat_tools.go internal/console/access.go internal/console/chat_test.go internal/policy/policy.go internal/factoryd/checkin.go internal/factoryd/runner.go internal/factoryd/checkin_test.go
git commit -m "tools: the chat's card and the check-in's card_facts lead with the card digest, card_step and board_digest beside them"
```

---

### Task 7: The drawer's case fold and the brief writer's digest

**Files:**
- Modify: `internal/console/templates/drawer.html:20` (a fold "The card's life" with `hx-get`), `internal/console/templates/board.html:93` (nothing on the face)
- Create: `internal/console/digest_handler.go` (`GET /tasks/{id}/digest`), a route beside the drawer's routes (grep `tasks/{id}` in `internal/console/routes.go` or `server.go`)
- Modify: `internal/factoryd/brief.go:107` (`write`: the supervisor call's input gains the card digest render under a heading "The card's life")
- Test: `internal/console/face_test.go` (or a new `digest_handler_test.go`), `internal/factoryd/brief_test.go`

**Interfaces:**
- Consumes: Task 4's render, Task 1's `OpenCasesOf` and `CaseSteps`.
- Produces: `GET /tasks/{id}/digest` returns HTML: a `<pre class="digest">` with the render, then one `<li>` per case step of the open cases: rung, actor, outcome, found. Same access rule as the drawer.

- [ ] **Step 1: Write the failing tests**: the handler returns 200 with the render for a task the session may read and 403 for one it may not; the drawer template contains `hx-get="/tasks/{{.ID}}/digest"` with `hx-trigger="revealed"`; `brief.write`'s request body contains "The card's life" and the digest's first line.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement.** The fold loads lazily so the board's render pays no S3 read. The brief writer reads the digest once per approval it briefs.

- [ ] **Step 4: Run** the console and factoryd packages and `bash check static`.

- [ ] **Step 5: Commit**

```bash
git add internal/console/templates/drawer.html internal/console/digest_handler.go internal/console/digest_handler_test.go internal/factoryd/brief.go internal/factoryd/brief_test.go
git commit -m "console: the drawer folds the card's life, and the brief writer reads it"
```

---

### Task 8: The whole suite, the manual and the agent pages

**Files:**
- Modify: `docs/manual/` in the code repository, the chat tools page (grep `card_history` under `docs/manual`): add `card_step` and `board_digest` and the `card` change, one line each.
- The agent context map in the design repository, `docs/agents/`, regenerated per [agent-context-map.md](../agent-context-map.md) after the code is on main. If the pinned opencode binary is not on this machine, record the regeneration as a hand step in the report.

- [ ] **Step 1: Run the whole suite**: `make test` and `bash check`. Expected: every package ok, static clean.

- [ ] **Step 2: Update the manual page** and commit:

```bash
git add docs/manual
git commit -m "manual: the chat's card leads with the card digest, card_step and board_digest"
```

- [ ] **Step 3: Report** which of the two agent pages (checkin, project-agent) change and whether the regeneration ran.
