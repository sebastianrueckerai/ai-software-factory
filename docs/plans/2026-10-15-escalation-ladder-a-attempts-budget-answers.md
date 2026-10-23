# Escalation ladder, plan A: attempts, budget and answers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eight code changes of the escalation ladder that need no model: the session cap counts answered sessions, a session starts only on a funded floor per rung, every wait for a human returns its answer and Fund is an answer, a strong-rung card gets at least the medium budget, answers carry a date and stand below the findings, a dead session's command lines never pass as findings, an agent card on red checks offers return and close instead of Approve, and a `concerns` verdict without findings is a remark.

**Architecture:** The control-flow changes of the card's Temporal workflow (`internal/factoryd/workflow.go`, `workflow_stages.go`) sit behind two new `workflow.GetVersion` gates (`session-ladder`, `review-remark`). The count of a session comes from the gateway's ledger (an allowed agent call) through one new short activity, which also writes the `session_started` record. Policy gains two floor values; `SessionFunded` prices them. The console, the brief and the session result change without a gate (no control flow).

**Tech Stack:** Go (factoryd, gateway, agent-worker, console), Temporal Go SDK test environment, PostgreSQL-backed tests through `scripts/pg-test.sh`, OpenTofu-free infra repo with `factory/policy.yaml`.

**Spec:** [escalation-ladder-redesign-2026-10-15.md](../escalation-ladder-redesign-2026-10-15.md) section 5, "Changes that need no model", the rows on budget and attempts, `concerns` without findings, dead sessions' lines, answers and the approval at the cap. Facts: [escalation-ladder-facts-2026-10-15.md](../escalation-ladder-facts-2026-10-15.md) (its line numbers are for commit 83c7073; this plan cites the code at 461f4d8). Notes and sibling plans: [2026-10-15-escalation-ladder-implementation.md](2026-10-15-escalation-ladder-implementation.md).

## Global Constraints

- Code repository `~/repos/ai-software-factory-code`, infra repository `~/repos/ai-software-factory-infra`. Work in a git worktree of the code repository (`git worktree add ../worktrees/asf-code-ladder-a -b ladder-a origin/main`), never in the main working tree. Other sessions push to main: `git fetch origin && git rebase origin/main` before the first task and before the last.
- Checks before every commit that changes Go: `gofmt -l .` prints nothing, `go vet ./...`, and the touched packages' tests. Postgres-backed tests: `scripts/pg-test.sh go test ./internal/factoryd/ -run <Name>`. Before the last commit: `bash check` (go vet, gofmt, gosec v2.29.0, `make test` = `scripts/pg-test.sh go test -race -p 1 ./...`).
- A change that alters a Temporal workflow's control flow carries a `workflow.GetVersion` gate. Plain Go in `internal/factoryd/workflow.go` reads gates as `t.<field> >= version<Name>`; a test pins the old path with `h.env.OnGetVersion("<change id>", workflow.DefaultVersion, version<Name>).Return(workflow.DefaultVersion)`.
- House style: minimal comments, no change narration, one way only, no legacy shim except a Temporal gate. Tests: hand-derive expectations, never tweak an assertion to force a pass.
- Policy values live in `factory/policy.yaml` of the infra repository with Go types in `internal/policy/policy.go`. The infra commit follows the code roll: a running factoryd rejects an unknown policy key.
- Sibling plans B (facts, detectors, planner) and C (review, records) edit the same files: B edits `briefText` in `opencode.go`, C edits `runStage` in `workflow_stages.go`. Rebase, do not merge blindly; the edits here are small anchored replacements.

## Review Focus

- A run in flight at the deploy replays under the old counting: a gate-pinned test (Task 5) keeps `attempt` numbers and the budget branch as before.
- A fund too small to clear the floor: the card asks again and names the new amount (Task 5 test, two refusals).
- A signal or event with no time (`TaskSignal.At` zero, runs from before the change): the answer and the change request keep their old text, no date, no panic (Task 7).
- An activity error or a lost pod: the session still counts when the ledger shows an answered call, so the session cap bounds a loop of dying sessions (Task 5 counts after every `race`, before the error branches).
- A fund note over the 4000-byte answer bound is refused before the budget is raised (Task 6).
- A `concerns` verdict without findings on a roll task keeps its old path (Task 10).

## What does not fit the code as it is, and what this plan does

1. **The budget branch discards change requests, not the answer.** The facts and the design say the budget branch's `final, end, _ := t.awaitHuman(why, nil)` loses the human's answer. A comment answer already reaches every later session: `awaitAnswer` files it in `t.answers` (`SessionInput.Answers`) whatever the branch does. What the branch discards is the returned slice, the change requests drained during the wait. Task 5 adds one closure `held` that every wait of the attempt loop passes through, so the returned slice is added to the findings in one place; Fund posts its note as an ordinary answer (Task 6).
2. **`session_started` is written at the pod's start today** (`activities.go:690`). The design wants the coding conversation's answered session. Task 4 moves the record to `SessionAnswered`, written once per session that got an `allowed` agent call in the ledger, and removes the pod-time write. The record is evidence; the workflow's count comes from the activity's result, because `Timeline.recordEvent` is best effort by design (an event never fails its step) and must not drive a cap.
3. **The floor values are not in the design.** Task 1 adds `budget.session_floor_cheap_eur` and `session_floor_frontier_eur`; absent means 0, no floor. Task 11 proposes 0.30 and 0.60 EUR from the 2026-10-15 sessions (#839's starved sessions died at 0.15 and 0.07 EUR left, #854's useful session 1 spent 4.89 EUR). Sebastian should confirm them (open question 1).
4. **`AttemptFunded` cannot be deleted yet.** Runs started before the gate schedule the activity by that name on replay. `Runner.AttemptFunded` and `ActivityAttemptFunded` stay for those runs; the console's answer path, which is not a workflow, moves to `SessionFunded` and loses its `AttemptFunded` config field.
5. **"Strong rung" at filing means the `Rung` field.** A project file with `model: stronger` makes `TaskConfig.Stronger` true without a rung on the card (`activities.go:1351`); the card's budget does not rise for it. One rung test, one place.
6. **The dead session's three facts ride as lines.** The handover note of the design's later step (top of the brief) does not exist yet. Task 8 removes the command lines and appends the branch state and the agent's last message as two lines to what the next session already receives; the check-in step replaces them with the note.
7. **Explicit replacement of an older answer is the date, the question and one sentence of the heading.** Marking replaced answers by code would need a structured answer type through the worker's environment variables; Task 7 keeps the strings, adds the date and moves the findings, a request for changes among them, above the answers.
8. **Two line numbers moved.** `SessionFunded` is at `activities.go:430` and `AttemptFunded` at `:422` (facts: 428 and 441-545); `rungOf` at `intake.go:485` (facts: 479-493). All other citations in the facts hold at 461f4d8.

## File Structure

| File | Change |
|---|---|
| `internal/policy/policy.go` | `Budget` floors, `Budget.SessionFloor`, validation, `CardBudget` takes `strong bool` |
| `internal/policy/policy_test.go` | floor parse and validation tests, `CardBudget` rows |
| `internal/factoryd/intake.go`, `plan.go`, `delegate.go` | `CardBudget` callers; `rungOf` result used for the budget |
| `internal/factoryd/activities.go` | `funded` applies the floor; `SessionAnswered`; `sessionResult` drops command lines; `RunSession` stops writing `session_started`; heartbeat resume without command lines |
| `internal/factoryd/store.go` | `Store.ModelAnswered`, `PGStore.ModelAnswered` |
| `internal/factoryd/workflow.go` | gate `session-ladder`, `SessionAnswerInput`, `SessionResult.LastMessage`, the loop, `held`, `unfunded`, handover lines, `TaskSignal.At`, dated answers |
| `internal/factoryd/workflow_stages.go` | gate `review-remark`, the remark |
| `internal/factoryd/opencode.go` | `briefText` order and heading |
| `internal/factoryd/gatewatch.go` | default-bound list gets the two new activities |
| `internal/console/actions.go`, `console.go`, `approvals.go`, `templates/board.html` | answer path on `SessionFunded`, Fund answers, red agent card |
| `cmd/factoryd/main.go` | drop the `AttemptFunded` wiring |
| `~/repos/ai-software-factory-infra/factory/policy.yaml`, `factory/schema/policy.schema.json` | floor values and regenerated schema (Task 11, after the roll) |
| `~/repos/ai-software-factory/docs/architecture.md` | one paragraph (Task 11) |

---

### Task 1: Policy floors and the rung-aware card budget

**Files:**
- Modify: `internal/policy/policy.go` (`Budget` at :637, `Validate` at :818, `CardBudget` at :1101)
- Test: `internal/policy/policy_test.go`

**Interfaces:**
- Produces: `Budget.SessionFloorCheapEUR`, `Budget.SessionFloorFrontierEUR float64`; `func (b Budget) SessionFloor(frontier bool) float64`; `func CardBudget(b Budget, p *ProjectBudget, size string, strong bool, requested float64) float64`.

- [ ] **Step 1: Write the failing tests**

In `internal/policy/policy_test.go`, change the existing call in `TestCardBudget` (line 723-724) to pass `false`, add rows and a strong table, and add the floor tests.

```go
		if got := CardBudget(tc.b, tc.p, tc.size, false, tc.requested); got != tc.want {
			t.Errorf("CardBudget(%+v, %+v, %q, %g) = %g, want %g", tc.b, tc.p, tc.size, tc.requested, got, tc.want)
		}
```

Append after `TestCardBudget`:

```go
// A card filed on the strong rung gets at least the medium budget, whatever
// its size or the default; an asked budget stays the filer's, and the
// project's card maximum still bounds it.
func TestCardBudgetOfAStrongCard(t *testing.T) {
	b := Budget{TaskDefaultEUR: 2, TaskMaxEUR: 15}
	for _, tc := range []struct {
		p         *ProjectBudget
		size      string
		requested float64
		want      float64
	}{
		{nil, "small", 0, 5},
		{nil, "medium", 0, 5},
		{nil, "large", 0, 10},
		{nil, "", 0, 5},
		{nil, "small", 1, 1},
		{&ProjectBudget{TaskMaxEUR: 3}, "small", 0, 3},
		{&ProjectBudget{TaskMaxEUR: 3}, "", 0, 3},
	} {
		if got := CardBudget(b, tc.p, tc.size, true, tc.requested); got != tc.want {
			t.Errorf("CardBudget(strong, %+v, %q, %g) = %g, want %g", tc.p, tc.size, tc.requested, got, tc.want)
		}
	}
	if got := CardBudget(b, nil, "small", false, 0); got != 2 {
		t.Errorf("CardBudget(cheap, small) = %g, want 2", got)
	}
}

func TestSessionFloorByRung(t *testing.T) {
	b := Budget{SessionFloorCheapEUR: 0.3, SessionFloorFrontierEUR: 0.6}
	if b.SessionFloor(false) != 0.3 || b.SessionFloor(true) != 0.6 {
		t.Fatalf("floors = %g, %g, want 0.3 on cheap and 0.6 on frontier", b.SessionFloor(false), b.SessionFloor(true))
	}
	if (Budget{}).SessionFloor(true) != 0 {
		t.Fatal("an absent floor asks nothing")
	}
}
```

In `TestParseRejects` add two rows to the table:

```go
		"negative session floor": {strings.Replace(valid, "month_eur: 50", "month_eur: 50\n  session_floor_cheap_eur: -1", 1),
			"session_floor_cheap_eur and session_floor_frontier_eur must not be negative"},
		"session floor above the card maximum": {strings.Replace(valid, "month_eur: 50", "month_eur: 50\n  session_floor_frontier_eur: 6", 1),
			"exceeds budget.task_max_eur"},
```

and add after `TestParseValid`:

```go
func TestParseSessionFloors(t *testing.T) {
	doc := strings.Replace(valid, "month_eur: 50", "month_eur: 50\n  session_floor_cheap_eur: 0.3\n  session_floor_frontier_eur: 0.6", 1)
	d, err := Parse([]byte(doc))
	if err != nil {
		t.Fatal(err)
	}
	if d.Budget.SessionFloorCheapEUR != 0.3 || d.Budget.SessionFloorFrontierEUR != 0.6 {
		t.Fatalf("budget = %+v", d.Budget)
	}
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd ~/repos/ai-software-factory-code && go test ./internal/policy/ -run 'TestCardBudget|TestSessionFloor|TestParseSessionFloors|TestParseRejects'`
Expected: compile failure, `too many arguments in call to CardBudget` / `unknown field SessionFloorCheapEUR`.

- [ ] **Step 3: Implement**

`internal/policy/policy.go`, in `Budget` after `MonthEUR`:

```go
	// SessionFloorCheapEUR is the least free budget a session on the cheap
	// rung needs to start; a card that cannot fund it asks a human to fund
	// it. Absent: 0, no floor beyond the session's opening calls.
	SessionFloorCheapEUR float64 `yaml:"session_floor_cheap_eur,omitempty" json:"session_floor_cheap_eur,omitempty"`
	// SessionFloorFrontierEUR is SessionFloorCheapEUR for a session on the
	// frontier rung.
	SessionFloorFrontierEUR float64 `yaml:"session_floor_frontier_eur,omitempty" json:"session_floor_frontier_eur,omitempty"`
```

After the `Budget` type add:

```go
// SessionFloor is the least free budget a session starts on, by its rung.
func (b Budget) SessionFloor(frontier bool) float64 {
	if frontier {
		return b.SessionFloorFrontierEUR
	}
	return b.SessionFloorCheapEUR
}
```

In `Validate`, after the `TaskDefaultEUR > TaskMaxEUR` check:

```go
	if b.SessionFloorCheapEUR < 0 || b.SessionFloorFrontierEUR < 0 {
		return errors.New("policy: budget.session_floor_cheap_eur and session_floor_frontier_eur must not be negative")
	}
	if floor := max(b.SessionFloorCheapEUR, b.SessionFloorFrontierEUR); floor > b.TaskMaxEUR {
		return fmt.Errorf("policy: a session floor of %g exceeds budget.task_max_eur %g, which no card could fund", floor, b.TaskMaxEUR)
	}
```

Replace `CardBudget` with:

```go
// CardBudget is a new card's budget: the one asked for, else its size's,
// at most the project's card maximum (without one, a large card's budget)
// and the policy's task maximum. A card that asks for nothing gets the
// default, at most the project's card maximum and the policy's task
// maximum. A strong card (filed on the strong rung) is given at least a
// medium card's budget unless it asked for its own.
func CardBudget(b Budget, p *ProjectBudget, size string, strong bool, requested float64) float64 {
	ceiling, own := b.SizeBudget("large"), p != nil && p.TaskMaxEUR > 0
	if own {
		ceiling = p.TaskMaxEUR
	}
	floor := func(eur float64) float64 {
		if strong {
			return max(eur, sizeEUR["medium"])
		}
		return eur
	}
	_, sized := sizeEUR[size]
	switch {
	case requested > 0:
	case sized:
		requested = floor(sizeEUR[size])
	case own:
		return min(floor(b.TaskDefaultEUR), ceiling, b.TaskMaxEUR)
	default:
		return min(floor(b.TaskDefaultEUR), b.TaskMaxEUR)
	}
	if eur := min(requested, ceiling, b.TaskMaxEUR); eur > 0 {
		return eur
	}
	return b.TaskDefaultEUR
}
```

- [ ] **Step 4: Run to verify the policy package passes (callers still fail to compile elsewhere)**

Run: `go test ./internal/policy/`
Expected: PASS. (`go build ./...` fails in `factoryd` until Task 2.)

Hand check of the strong table: `{nil,"small",0,5}`: sized, floor(2)=5, min(5,10,15)=5. `{nil,"",0,5}`: not sized, not own: min(floor(2)=5, 15)=5. `{&ProjectBudget{3},"small",0,3}`: ceiling 3, min(5,3,15)=3. `{&ProjectBudget{3},"",0,3}`: own: min(5,3,15)=3. `{nil,"small",1,1}`: requested 1.

- [ ] **Step 5: Commit**

```bash
git add internal/policy/policy.go internal/policy/policy_test.go
git commit -m "policy: a floor per rung for a session, and the medium budget for a strong card"
```

---

### Task 2: Filing passes the rung to the budget

**Files:**
- Modify: `internal/factoryd/intake.go:673-681`, `:935`; `internal/factoryd/plan.go:1757`; `internal/factoryd/delegate.go:109`
- Test: `internal/factoryd/intake_test.go` (`TestIntakeBudgetBySize`, line 1564)

**Interfaces:**
- Consumes: `policy.CardBudget(b, p, size, strong, requested)` from Task 1; `rungOf(body, size string) string` (`intake.go:485`), `RungFrontier`.

- [ ] **Step 1: Write the failing test rows**

In `TestIntakeBudgetBySize` add to the table (policy default 5, max 15, no project maximum):

```go
		{"Size: small\nRung: frontier, the queue code is subtle", 0, 5},
		{"Size: small\nRung: cheap, a rename", 0, 2},
		{"Size: small\nFix internal/factoryd/rolltask.go", 0, 5},
		{"Size: small\nRung: frontier, subtle\nBudget: 1", 0, 1},
```

Hand derivation: a frontier small card gets max(2, 5) = 5; a cheap one 2; the factoryd path derives the frontier rung (`rungOf`), so 5; an asked budget wins, 1.

- [ ] **Step 2: Run to verify failure**

Run: `go test ./internal/factoryd/ -run TestIntakeBudgetBySize`
Expected: compile failure first (`CardBudget` arity), after Step 3's edits to `intake.go` only: FAIL `budget = 2, want 5` on the first and third new rows.

- [ ] **Step 3: Implement**

`intake.go` around line 673, replace

```go
	size, eur := askedBudget(issue.Body)
	task := Task{
```
with
```go
	size, eur := askedBudget(issue.Body)
	rung := rungOf(issue.Body, size)
	task := Task{
```
and change the two fields:
```go
		BudgetEUR:    policy.CardBudget(in.Policy().Document.Budget, p.Budget, size, rung == RungFrontier, eur),
		Size:         size,
		Rung:         rung,
```
`intake.go:935`: `policy.CardBudget(budget, p.Budget, "", false, 0)`. `plan.go:1757`: `policy.CardBudget(v.Document.Budget, project.Budget, c.Size, c.Rung == RungFrontier, 0)`. `delegate.go:109`: `policy.CardBudget(d.Budget(), p.Budget, "small", false, 0)`.

- [ ] **Step 4: Run to verify pass**

Run: `go build ./... && go test ./internal/factoryd/ -run 'TestIntakeBudgetBySize|TestIntakeReadsAndDerivesTheRung'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd/intake.go internal/factoryd/plan.go internal/factoryd/delegate.go internal/factoryd/intake_test.go
git commit -m "intake: a card filed on the strong rung gets at least the medium budget"
```

---

### Task 3: `SessionFunded` prices a useful session

**Files:**
- Modify: `internal/factoryd/activities.go:417-433` (comments), `funded` at :463-545
- Test: `internal/factoryd/activities_test.go` (after `TestSessionFundedPricesASessionsOpening`, line ~2480)

**Interfaces:**
- Consumes: `Budget.SessionFloor(frontier bool) float64` (Task 1); `r.cfg.Models.Stronger` (the frontier alias, `ModelLadder`).
- Produces: `Runner.SessionFunded(ctx, taskID, model string) (string, error)` refuses a free headroom under the rung's floor and names the amount.

- [ ] **Step 1: Write the failing test**

```go
// A session needs more than its opening calls: the floor of its rung (budget.session_floor_*_eur)
// is the least free budget it starts on. Card of 5 EUR with 4.50 spent has 0.50 free: the frontier
// floor 0.60 refuses, naming 0.600000 EUR; the cheap floor 0.30 funds. At 4.80 spent (0.20 free) the
// cheap floor refuses too. With the floor absent only the opening decides.
func TestSessionFundedAsksTheFloorOfTheRung(t *testing.T) {
	store := newFakeStore()
	if err := store.CreateTask(context.Background(), Task{ID: "t-1", Status: "waiting-human", BudgetEUR: 5, SpentEUR: 4.5}); err != nil {
		t.Fatal(err)
	}
	v := testPolicyVersion()
	v.Tree.Document.Budget.SessionFloorCheapEUR = 0.3
	v.Tree.Document.Budget.SessionFloorFrontierEUR = 0.6
	r := &Runner{store: store, cfg: RunnerConfig{
		Prices: stubPrices{price: policy.Price{In: 3e-6, CacheRead: 3e-7, Out: 1.5e-5, MaxOutput: 32768}},
		Policy: func() policy.Version { return v },
		Models: ModelLadder{Start: "factory/coding-cheap", Stronger: "factory/coding-frontier"}}}
	ctx := context.Background()

	why, err := r.SessionFunded(ctx, "t-1", "factory/coding-frontier")
	if err != nil || !BudgetRefusal(why) || !strings.Contains(why, "0.500 EUR of the 5.000 EUR budget remains, and a session on factory/coding-frontier needs 0.600000 EUR "+
		"(the floor of its rung, budget.session_floor_frontier_eur in policy.yaml)") {
		t.Fatalf("frontier at 0.50 free = (%q, %v), want the 0.600000 EUR floor named", why, err)
	}
	if why, err := r.SessionFunded(ctx, "t-1", "factory/coding-cheap"); err != nil || why != "" {
		t.Fatalf("cheap at 0.50 free = (%q, %v), want funded", why, err)
	}
	raised := store.tasks["t-1"]
	raised.SpentEUR = 4.8
	store.tasks["t-1"] = raised
	if why, err := r.SessionFunded(ctx, "t-1", "factory/coding-cheap"); err != nil ||
		!strings.Contains(why, "a session on factory/coding-cheap needs 0.300000 EUR (the floor of its rung, budget.session_floor_cheap_eur in policy.yaml)") {
		t.Fatalf("cheap at 0.20 free = (%q, %v), want the 0.300000 EUR floor named", why, err)
	}
	v.Tree.Document.Budget.SessionFloorCheapEUR = 0
	if why, err := r.SessionFunded(ctx, "t-1", "factory/coding-cheap"); err != nil || why != "" {
		t.Fatalf("cheap without a floor at 0.20 free = (%q, %v), want the opening alone to decide (0.01536 EUR)", why, err)
	}
}
```

Hand derivation of the last line: no opening recorded, the base need is the cheapest call, 1024 output tokens at 1.5e-5 = 0.01536 EUR, which 0.20 funds.

- [ ] **Step 2: Run to verify failure**

Run: `go test ./internal/factoryd/ -run TestSessionFundedAsksTheFloorOfTheRung`
Expected: FAIL `frontier at 0.50 free = ("", <nil>)`.

- [ ] **Step 3: Implement**

In `funded`, inside `if opening { ... }`, after the block that sets `need, measure = eur, fmt.Sprintf(...)` (just before the closing brace of `if opening`), add:

```go
		frontier := r.cfg.Models.Stronger != "" && model == r.cfg.Models.Stronger
		if floor := v.Document.Budget.SessionFloor(frontier); floor > need {
			key := "budget.session_floor_cheap_eur"
			if frontier {
				key = "budget.session_floor_frontier_eur"
			}
			need, call, measure, then = floor, "a session on "+model, "the floor of its rung, "+key+" in policy.yaml",
				"a session started now would end before it could push"
		}
```

Update the comment of `SessionFunded` to: `SessionFunded is the floor of every session's start (roadmap 243, plan A): "" when the free headroom can fund a session's opening calls on model and the policy's floor of its rung, else the refusal naming the amount.` And the comment of `AttemptFunded`: append `Kept for runs from before versionSessionLadder, which schedule it on replay; no new caller.`

- [ ] **Step 4: Run to verify pass, and the neighbours**

Run: `go test ./internal/factoryd/ -run 'TestSessionFunded|TestAttemptFunded|TestAttemptFloorsCheckTheCaps'`
Expected: PASS (Postgres-backed `...AgreesWithTheGateway` tests: `scripts/pg-test.sh go test ./internal/factoryd/ -run 'FundedAgrees'`).

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd/activities.go internal/factoryd/activities_test.go
git commit -m "SessionFunded: the floor of the session's rung, with the amount in the question"
```

---

### Task 4: The answered-session fact and the `session_started` record

**Files:**
- Modify: `internal/factoryd/store.go` (interface near `ProviderRefusal` :310, `PGStore` near :815), `internal/factoryd/workflow.go` (activity constants :119, `SessionAnswerInput`), `internal/factoryd/activities.go` (registration :131, `RunSession` :690, new `SessionAnswered`), `internal/factoryd/gatewatch.go:87`
- Test: `internal/factoryd/store_test.go` (fake and a Postgres test), `internal/factoryd/runner_test.go`

**Interfaces:**
- Produces: `Store.ModelAnswered(ctx, taskID string, since time.Time) (bool, error)`; `type SessionAnswerInput struct { TaskID, SessionID, Model string; Attempt int; Since time.Time }`; `const ActivitySessionAnswered = "SessionAnswered"`, `const ActivitySessionFunded = "SessionFunded"`; `func (r *Runner) SessionAnswered(ctx context.Context, in SessionAnswerInput) (bool, error)`.

- [ ] **Step 1: Write the failing tests**

`store_test.go`: add to `fakeStore` a field next to `providerRefusals` and a method:

```go
	answered map[string]bool // ModelAnswered's answer by task
```
```go
func (s *fakeStore) ModelAnswered(ctx context.Context, taskID string, since time.Time) (bool, error) {
	return s.answered[taskID], nil
}
```

A Postgres test (same file, near `TestPGStoreMonthCap`):

```go
// A session got a model answer when the gateway booked one of its agent's
// calls allowed: a supervisor's call, a refused call and an earlier session's
// do not count.
func TestPGStoreModelAnswered(t *testing.T) {
	ctx := context.Background()
	s, err := OpenStore(ctx, schematest.DSN(t, "factoryd_answered"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	if _, err := s.db.ExecContext(ctx, `TRUNCATE audit;
		INSERT INTO audit (task_id, decision, reason, kind, ts) VALUES
		('a', 'allowed', '', 'supervisor', '2026-10-15 10:00:00Z'),
		('b', 'refused_budget', 'the task', 'agent', '2026-10-15 10:00:00Z'),
		('c', 'allowed', '', 'agent', '2026-10-15 10:00:00Z')`); err != nil {
		t.Fatal(err)
	}
	at := func(h, m int) time.Time { return time.Date(2026, 10, 15, h, m, 0, 0, time.UTC) }
	for _, tc := range []struct {
		task  string
		since time.Time
		want  bool
	}{
		{"a", at(9, 0), false}, {"b", at(9, 0), false}, {"c", at(9, 0), true}, {"c", at(10, 1), false}, {"nobody", at(9, 0), false},
	} {
		if got, err := s.ModelAnswered(ctx, tc.task, tc.since); err != nil || got != tc.want {
			t.Errorf("ModelAnswered(%s, %v) = (%v, %v), want %v", tc.task, tc.since, got, err, tc.want)
		}
	}
}
```

`runner_test.go` (next to `TestRunSessionResultCarriesFindings`):

```go
// SessionAnswered writes the session_started record of a session that got a
// model answer, and none for one that did not.
func TestSessionAnsweredRecordsTheStartedSession(t *testing.T) {
	objects := &fakeObjectStore{}
	runner, _, store := newTestRunner(t, supervisedTask("t2"), newFakeKube(), objects)
	in := SessionAnswerInput{TaskID: "t2", SessionID: "s1", Model: "factory/coding-cheap", Attempt: 2, Since: time.Now().Add(-time.Minute)}

	if ok, err := runner.SessionAnswered(t.Context(), in); err != nil || ok {
		t.Fatalf("starved session = (%v, %v), want false", ok, err)
	}
	tl, _ := objects.Get(t.Context(), "sessions/t2/timeline.jsonl")
	if strings.Contains(string(tl), "session_started") {
		t.Fatalf("timeline = %s, want no session_started for a starved session", tl)
	}
	store.answered = map[string]bool{"t2": true}
	if ok, err := runner.SessionAnswered(t.Context(), in); err != nil || !ok {
		t.Fatalf("answered session = (%v, %v), want true", ok, err)
	}
	tl, _ = objects.Get(t.Context(), "sessions/t2/timeline.jsonl")
	for _, want := range []string{`"event":"session_started"`, `"session":"s1"`, `"model":"coding-cheap"`, `"attempt":2`} {
		if !strings.Contains(string(tl), want) {
			t.Errorf("timeline lacks %s:\n%s", want, tl)
		}
	}
}
```

- [ ] **Step 2: Run to verify failure**

Run: `go vet ./internal/factoryd/`
Expected: `fakeStore does not implement Store`/`undefined: SessionAnswerInput`.

- [ ] **Step 3: Implement**

`store.go`, in the `Store` interface after `ProviderRefusal`:

```go
	// ModelAnswered reports whether the task's agent got a model answer
	// since since: the gateway booked one of its calls allowed.
	ModelAnswered(ctx context.Context, taskID string, since time.Time) (bool, error)
```
and after `PGStore.ProviderRefusal`:

```go
func (s *PGStore) ModelAnswered(ctx context.Context, taskID string, since time.Time) (bool, error) {
	var answered bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM audit WHERE task_id = $1 AND kind = $2 AND tool = '' AND decision = 'allowed' AND ts >= $3)`,
		taskID, gateway.AuditKindAgent, since).Scan(&answered)
	return answered, err
}
```

`workflow.go`, activity constants (after `ActivityAttemptFunded`):

```go
	ActivitySessionFunded               = "SessionFunded"
	ActivitySessionAnswered             = "SessionAnswered"
```
and next to `SessionInput`:

```go
// SessionAnswerInput asks whether the session that began at Since got a
// model answer (versionSessionLadder); the rest is its record.
type SessionAnswerInput struct {
	TaskID, SessionID, Model string
	Attempt                  int
	Since                    time.Time
}
```

`activities.go`: in the registration map add `ActivitySessionFunded: r.SessionFunded, ActivitySessionAnswered: r.SessionAnswered,` after `ActivityAttemptFunded: r.AttemptFunded,`. Delete the line

```go
		r.timeline.recordEvent(ctx, t.ID, EventSessionStarted, map[string]any{"session": s.id, "model": aliasOf(s.model), "attempt": in.Attempt})
```
(in `RunSession`, :690). Add after `SessionFunded`:

```go
// SessionAnswered reports whether the session of a task that began at in.Since
// got a model answer, and records the session_started event of one that did:
// a pod that started and made no answered call is no session. The ledger, not
// the timeline, is the fact the session cap counts.
func (r *Runner) SessionAnswered(ctx context.Context, in SessionAnswerInput) (bool, error) {
	answered, err := r.store.ModelAnswered(ctx, in.TaskID, in.Since)
	if err != nil || !answered {
		return false, err
	}
	r.timeline.recordEvent(ctx, in.TaskID, EventSessionStarted, map[string]any{"session": in.SessionID, "model": aliasOf(in.Model), "attempt": in.Attempt})
	return true, nil
}
```
`gatewatch.go` list: add `ActivitySessionFunded, ActivitySessionAnswered` after `ActivityAttemptFunded`. Update the comment at `events.go:25-26` ("a session's start with its model and attempt") to "an answered session's start".

- [ ] **Step 4: Run to verify pass**

Run: `scripts/pg-test.sh go test ./internal/factoryd/ -run 'TestPGStoreModelAnswered|TestSessionAnswered'` then `go test ./internal/factoryd/ -run 'Activit|Bound|Register'`
Expected: PASS. If a test enumerates activities against the bounds list it passes with the two additions; if it names a missing activity, add the name to the list it checks, not a bound to the policy tree.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd/
git commit -m "factoryd: the session_started record and its fact come from the gateway's ledger"
```

---

### Task 5: The attempt loop counts answered sessions, funds a useful session and keeps every answer

Items 1, 2 and 3 of the scope, one gate.

**Files:**
- Modify: `internal/factoryd/workflow.go` (version const after :917, field after :1011, `GetVersion` after :466, loop :1288-1531, `unfunded` :1716, `timeCap` :1126)
- Test: `internal/factoryd/workflow_test.go` (harness :133-210, mocks at :612, :639, :1628)

**Interfaces:**
- Consumes: `ActivitySessionFunded(taskID, model) string`, `ActivitySessionAnswered(SessionAnswerInput) bool` (Task 4).
- Produces: `versionSessionLadder`, `taskRun.sessionLadder`, `taskRun.sessionAnswered(res SessionResult, began time.Time, attempt int, model string) bool`.

- [ ] **Step 1: Harness and the failing tests**

In the harness map (`workflow_test.go` ~:212) add next to `ActivityAttemptFunded`:

```go
		ActivitySessionFunded:   func(ctx context.Context, taskID, model string) (string, error) { return "", nil },
		ActivitySessionAnswered: func(ctx context.Context, in SessionAnswerInput) (bool, error) { return true, nil },
```
The three existing mocks of `ActivityAttemptFunded` (lines ~612, ~639, ~1628: `TestWorkflowUnfundedAnswerRefusesTheAttempt`, `TestWorkflowFundedAnswerGrantsTheAttemptAsBefore`, and the one at :1628) become `ActivitySessionFunded` (same argument list, same return), since the new gate version is the default of the test environment.

Add:

```go
// refusedThenFunded answers the funding floor: the nth call (1-based) in
// refusing is refused with a budget refusal, the others funded. Both the
// floor of the new gate and the old one answer it.
func (h *workflowHarness) refusedThenFunded(refusing ...int) *int {
	calls := 0
	refuse := func(ctx context.Context, taskID, model string) (string, error) {
		calls++
		if slices.Contains(refusing, calls) {
			return budgetRefused + ": Raise the budget (Fund on the board) and answer, or close the card.\n0.100 EUR of the 2.000 EUR budget remains, and a session on " + model + " needs 0.300000 EUR", nil
		}
		return "", nil
	}
	h.env.OnActivity(ActivitySessionFunded, mock.Anything, "t1", mock.Anything).Return(refuse)
	h.env.OnActivity(ActivityAttemptFunded, mock.Anything, "t1", mock.Anything).Return(refuse)
	return &calls
}

// A session the gateway starved is no session: #839 ran attempts 1, 2, 3 and
// 5 and #854 1, 2 and 4 because refused attempts took numbers. A session that
// got no model answer counts none, whatever ended it, so the fourth run here
// is the second session and the cap of 3 is never reached.
func TestWorkflowStarvedSessionsTakeNoNumber(t *testing.T) {
	h := newWorkflowHarness(t)
	h.onSessions(
		SessionResult{Outcome: OutcomeNoPush, SessionID: "s1", Summary: "the gateway refused a call"},
		SessionResult{Outcome: OutcomeNoPush, SessionID: "starved", Summary: "the gateway refused a call"},
		SessionResult{Outcome: OutcomeNoPush, SessionID: "starved", Summary: "the gateway refused a call"},
		pushed("s4", "c4"))
	h.env.OnActivity(ActivitySessionAnswered, mock.Anything, mock.Anything).Return(
		func(ctx context.Context, in SessionAnswerInput) (bool, error) { return in.SessionID != "starved", nil })
	h.onChecks(ChecksResult{State: ChecksSuccess})
	h.signalAfter(3*time.Hour, SignalPRMerged, TaskSignal{Author: "sebastian", PR: 9})

	if final := h.run(t); final != "done" {
		t.Fatalf("final = %q, escalations = %q", final, h.escalated)
	}
	var attempts []int
	for _, in := range h.sessions {
		attempts = append(attempts, in.Attempt)
	}
	if !slices.Equal(attempts, []int{1, 2, 2, 2}) || len(h.escalated) != 0 {
		t.Fatalf("attempts = %v, escalations %q; want 1 2 2 2 and no cap question", attempts, h.escalated)
	}
	if u := h.usage[len(h.usage)-1]; u.Attempts != 2 {
		t.Fatalf("usage = %+v, want two sessions counted", u)
	}
}

// A run from before the gate counts every session that ran.
func TestWorkflowBeforeSessionLadderStarvedSessionsTookNumbers(t *testing.T) {
	h := newWorkflowHarness(t)
	h.env.OnGetVersion("session-ladder", workflow.DefaultVersion, versionSessionLadder).Return(workflow.DefaultVersion)
	h.onSessions(
		SessionResult{Outcome: OutcomeNoPush, SessionID: "starved"}, SessionResult{Outcome: OutcomeNoPush, SessionID: "starved"},
		SessionResult{Outcome: OutcomeNoPush, SessionID: "starved"}, pushed("s4", "c4"))
	h.onChecks(ChecksResult{State: ChecksSuccess})
	h.signalAfter(3*time.Hour, SignalHumanComment, TaskSignal{Author: "sebastian", Body: "go on", Comment: 602})
	h.signalAfter(6*time.Hour, SignalPRMerged, TaskSignal{Author: "sebastian", PR: 9})

	if final := h.run(t); final != "done" || len(h.sessions) != 4 || h.sessions[3].Attempt != 4 || len(h.escalated) != 1 || !strings.HasPrefix(h.escalated[0], capReached) {
		t.Fatalf("final = %q, sessions %d, escalations %q; want the cap question after three counted sessions and the fourth as attempt 4", final, len(h.sessions), h.escalated)
	}
}

// The budget branch used to discard the change requests that answered it
// and to count the refused attempt: session 1 pushes, the red checks go back,
// the floor refuses session 2, a change request on the pull request answers
// the wait, and session 2 starts as attempt 2 with both findings.
func TestWorkflowFundRefusalKeepsTheAnswerAndTheNumber(t *testing.T) {
	change := "reviewer sebastian requested changes: rename it"
	run := func(t *testing.T, pinned bool) *workflowHarness {
		h := newWorkflowHarness(t)
		if pinned {
			h.env.OnGetVersion("session-ladder", workflow.DefaultVersion, versionSessionLadder).Return(workflow.DefaultVersion)
		}
		h.refusedThenFunded(2)
		h.onSessions(pushed("s1", "c1"), pushed("s2", "c2"))
		h.onChecks(ChecksResult{State: ChecksFailure, Findings: []string{"red"}}, ChecksResult{State: ChecksSuccess})
		h.signalAfter(time.Hour, SignalChangesRequested, TaskSignal{Author: "sebastian", Body: "rename it", PR: 9})
		h.signalAfter(4*time.Hour, SignalPRMerged, TaskSignal{Author: "sebastian", PR: 9})
		if final := h.run(t); final != "done" {
			t.Fatalf("final = %q, finals %v", final, h.finals)
		}
		return h
	}
	h := run(t, false)
	if len(h.sessions) != 2 || h.sessions[1].Attempt != 2 || !slices.Equal(h.sessions[1].Findings, []string{"red", change}) {
		t.Fatalf("sessions = %+v, want the second as attempt 2 with the red check and the change request", h.sessions)
	}
	h = run(t, true)
	if len(h.sessions) != 2 || h.sessions[1].Attempt != 3 || !slices.Equal(h.sessions[1].Findings, []string{"red"}) {
		t.Fatalf("pinned sessions = %+v, want the old run's attempt 3 and the dropped change request", h.sessions)
	}
}

// A fund too small to clear the floor asks again, each time naming the
// amount; the session starts once the floor is met.
func TestWorkflowFundThatMissesTheFloorAsksAgain(t *testing.T) {
	h := newWorkflowHarness(t)
	calls := h.refusedThenFunded(1, 2)
	h.onSessions(pushed("s1", "c1"))
	h.onChecks(ChecksResult{State: ChecksSuccess})
	h.signalAfter(time.Hour, SignalHumanComment, TaskSignal{Author: "sebastian", Body: "funded 0.1", Comment: 602})
	h.signalAfter(2*time.Hour, SignalHumanComment, TaskSignal{Author: "sebastian", Body: "funded 1.0", Comment: 603})
	h.signalAfter(5*time.Hour, SignalPRMerged, TaskSignal{Author: "sebastian", PR: 9})

	if final := h.run(t); final != "done" {
		t.Fatalf("final = %q", final)
	}
	if len(h.escalated) != 2 || !strings.Contains(h.escalated[0], "needs 0.300000 EUR") || !strings.Contains(h.escalated[1], "needs 0.300000 EUR") || *calls != 3 {
		t.Fatalf("escalations %q after %d floor reads; want two questions naming the amount, then the session", h.escalated, *calls)
	}
	if len(h.sessions) != 1 || h.sessions[0].Attempt != 1 || len(h.sessions[0].Answers) != 2 {
		t.Fatalf("sessions = %+v, want one attempt-1 session with both answers", h.sessions)
	}
}
```

Hand derivations. *Starved:* s1 (answered) sets `u.Attempts` to 1; the next three sessions all start at attempt 2 (`u.Attempts+1`), the two starved leave `u.Attempts` at 1, s4 pushes and counts: usage 2; the cap test `attempt > 3+0` never holds. *Old gate:* every session counts: attempts 1, 2, 3 run, attempt 4 `> 3` asks the cap question (escalation text starts with `capReached`), the comment grants one session, attempt 4 pushes `c4`. *Fund refusal:* floor reads 1 (before s1) funded, 2 (before s2) refused, 3 (after the wait's `continue`) funded. New: `u.Attempts` is 1 after s1, so s2 is attempt 2 and `held` adds the drained change request after the findings `["red"]` (the red-check verdict); old: the refused attempt took `u.Attempts++` to 2, s2 is attempt 3 and the change request is dropped. The first two floor reads of the third test are refused, the third funds; answers are comments, they land in `Answers` (2).

- [ ] **Step 2: Run to verify failure**

Run: `go test ./internal/factoryd/ -run 'TestWorkflowStarvedSessionsTakeNoNumber|TestWorkflowBeforeSessionLadder|TestWorkflowFundRefusalKeepsTheAnswerAndTheNumber|TestWorkflowFundThatMissesTheFloorAsksAgain'`
Expected: compile failure `undefined: versionSessionLadder`.

- [ ] **Step 3: Implement the gate**

`workflow.go` after line 917 (`versionFactoryPRActions workflow.Version = 1`):

```go
	// versionSessionLadder (change id "session-ladder", plan A of the
	// escalation ladder): the session cap counts the sessions that got a
	// model answer (SessionAnswered), read after every session whatever
	// ended it, so a starved or refused session takes no number and no branch
	// of the loop corrects the count; the check before a session is
	// SessionFunded (the opening calls and the floor of the rung); every
	// wait for a human adds the change requests that answered it to the next
	// session's findings. A run from before counts every session that ran,
	// funds on AttemptFunded and drops the budget wait's change requests.
	versionSessionLadder workflow.Version = 1
```
Field in `taskRun` after `factoryPRActions`: `sessionLadder workflow.Version // the cap counts answered sessions (versionSessionLadder)`. In `Run`, after the `run.factoryPRActions = ...` line: `run.sessionLadder = workflow.GetVersion(ctx, "session-ladder", workflow.DefaultVersion, versionSessionLadder)`.

`unfunded`:

```go
func (t *taskRun) unfunded(model string) string {
	activity := ActivityAttemptFunded
	if t.sessionLadder >= versionSessionLadder {
		activity = ActivitySessionFunded
	}
	var why string
	if err := workflow.ExecuteActivity(t.short, activity, t.taskID, model).Get(t.ctx, &why); err != nil {
		workflow.GetLogger(t.ctx).Warn("read the attempt's funding", "task", t.taskID, "error", err)
		return ""
	}
	return why
}
```
and its comment: `unfunded is the session's floor: "" when the task's remaining budget can fund the session on model, else the refusal the card carries (SessionFunded; a run from before versionSessionLadder asks AttemptFunded). A failed read is no refusal: the per-call hold still guards the money.`

New method (near `unfunded`):

```go
// sessionAnswered reports whether the session that ran since began got a
// model answer (versionSessionLadder), and records its start. A failed read
// counts the session: a broken ledger must not loosen the cap.
func (t *taskRun) sessionAnswered(res SessionResult, began time.Time, attempt int, model string) bool {
	var ok bool
	in := SessionAnswerInput{TaskID: t.taskID, SessionID: res.SessionID, Model: cmp.Or(res.Model, model), Attempt: attempt, Since: began}
	if err := workflow.ExecuteActivity(t.short, ActivitySessionAnswered, in).Get(t.ctx, &ok); err != nil {
		workflow.GetLogger(t.ctx).Warn("read whether the session got an answer", "task", t.taskID, "error", err)
		return true
	}
	return ok
}
```

- [ ] **Step 4: Implement the loop**

In `lifecycle`, after the `apply` closure add the single place every wait ends:

```go
	// held ends every wait for a human of this loop: the task's final state
	// when the wait decided one, else the change requests that answered it join
	// the next session's findings (the human's comments are in t.answers)
	held := func(final, why string, answer []string) (string, string) {
		if final == "" {
			findings = append(findings, answer...)
		}
		return final, why
	}
```
`timeCap` (workflow.go ~:1126) becomes:

```go
		if final, why := held(t.awaitHuman(t.sessionCapCard(reason, slices.Concat(findings, own)), nil)); final != "" {
			return final, why
		}
		t.grant(&u)
		return "", ""
```
(the old body: `final, why, answer := ...; if final != "" {return final, why}; findings = append(findings, answer...); t.grant(&u); return "", ""`).

Replace the loop header and its first block (current `for attempt := u.Attempts + 1; ; attempt++ {` through the `if t.attemptFunded...` block):

```go
	for {
		attempt := u.Attempts + 1
		if t.attemptFunded >= versionAttemptFunded {
			// the session is refused before it starts: no session, no key,
			// no failure round, and the card says why an answer will not run
			if why := t.unfunded(model); why != "" {
				if DayCapped(why) {
					// a spent day cap resets on its own: the day cap's
					// wait, not a human's, and no session ran
					_, state, _ := strings.Cut(why, "\n")
					until := dayTurn(workflow.Now(t.ctx))
					if final, end := held(t.awaitDay(dayCapRefused(dayCapFloor, state, until), until, model)); final != "" {
						return t.finish(final, end)
					}
					continue
				}
				if t.sessionLadder >= versionSessionLadder {
					if final, end := held(t.awaitHuman(why, nil)); final != "" {
						return t.finish(final, end)
					}
					continue
				}
				u.Attempts++
				if final, end, _ := t.awaitHuman(why, nil); final != "" {
					return t.finish(final, end)
				}
				continue
			}
		}
```
Cap branch (`if attempt > t.cfg.MaxSessions+u.ExtraAttempts {` ...) inner wait:

```go
			if !answered {
				if final, why := held(t.awaitHuman(t.sessionCapCard(reason, slices.Concat(findings, own)), nil)); final != "" {
					return t.finish(final, why)
				}
				t.grant(&u)
			}
```
After the session race, the four correction branches lose `attempt--` and use `held`:

```go
		if t.podWait >= versionPodWait && err == nil && !decided && res.Outcome == OutcomeNotStarted {
			// no agent ran: no attempt, no agent time, the same input after
			if ask := t.notStarted(res.Summary); ask != "" {
				if final, why := held(t.awaitHuman(ask, nil)); final != "" {
					return t.finish(final, why)
				}
			}
			continue
		}
		t.pendingPods = 0
		if t.providerWait >= versionProviderWait && err == nil && !decided && res.Outcome == OutcomeProviderRefused {
			if ask := t.providerRefused(&refusals, ProviderWait{Status: res.Status, Reason: res.Reason}); ask != "" {
				if final, why := held(t.awaitHuman(ask, nil)); final != "" {
					return t.finish(final, why)
				}
			}
			continue
		}
		dayCapped := t.dayCap >= versionDayCap && err == nil && !decided && res.Outcome == OutcomeDayCap && res.Capped != nil && res.Acceptance == nil
		if dayCapped && !res.Capped.Allowed {
			// refused at its first call: no attempt, the same input after
			if final, why := held(t.awaitCap(*res.Capped, model)); final != "" {
				return t.finish(final, why)
			}
			continue
		}
```
These three `continue`s recompute `attempt = u.Attempts + 1`, the number the removed `attempt--` restored: nothing before `u.Attempts = attempt` changes `u.Attempts`.

The count (replaces `u.Attempts = attempt`):

```go
		if !res.StartFailed {
			t.providerAnswered(&refusals, err)
			u.AgentTime += workflow.Now(t.ctx).Sub(began)
		}
		if t.sessionLadder < versionSessionLadder || t.sessionAnswered(res, began, attempt, model) {
			u.Attempts = attempt
		}
		t.recordUsage(u)
```
The remaining waits of the loop:

```go
		if decided && v.escalate != "" {
			// a human's answer to a stopped session buys the next one
			if final, why := held(t.awaitHuman(v.escalate, nil)); final != "" {
				return t.finish(final, why)
			}
			t.grant(&u)
			continue
		}
```
```go
		if dayCapped {
			// it made calls before the cap refused one: an attempt
			if final, why := held(t.awaitCap(*res.Capped, model)); final != "" {
				return t.finish(final, why)
			}
			continue
		}
```
```go
		case OutcomeNeedsInfo, OutcomeEscalate:
			if res.Outcome == OutcomeNeedsInfo && t.v14 >= versionNeedsInfo {
				if final, why := held(t.awaitPoster(res.Reason)); final != "" {
					return t.finish(final, why)
				}
				t.grantPoster(&u)
				continue
			}
			// a run from before request_info takes it as an escalation
			if t.v3 < versionSupervisor {
				return t.finish("failed", "supervisor escalated: "+res.Reason)
			}
			if final, why := held(t.awaitHuman(res.Reason, res.Choices)); final != "" {
				return t.finish(final, why)
			}
			t.grant(&u)
			continue
```
`held` has the same effect as the replaced `findings = append(findings, answer...)` lines (those sites already kept their answer); only the budget wait changes, under the gate above.

- [ ] **Step 5: Run to verify pass**

Run: `go vet ./internal/factoryd/ && go test ./internal/factoryd/ -run 'TestWorkflow|TestAnswerSlice|TestStronger'`
Expected: PASS including the four new tests. If an older test fails on an attempt number, hand-derive: it must be a run whose session got no answer (the harness answers true for every session, so none should).

- [ ] **Step 6: Commit**

```bash
git add internal/factoryd/workflow.go internal/factoryd/workflow_test.go
git commit -m "workflow: the session cap counts answered sessions; SessionFunded before a session; every wait keeps its answer"
```

---

### Task 6: The console answers on `SessionFunded`, and Fund is the answer

**Files:**
- Modify: `internal/console/actions.go` (`doAnswer` :829, `unfundedAnswer` :914, `doFund` :947), `internal/console/console.go:213-217`, `internal/console/templates/board.html:95`, `cmd/factoryd/main.go:503`
- Test: `internal/console/fund_test.go`, `internal/console/console_test.go` (:1546-1585)

**Interfaces:**
- Consumes: `Config.SessionFunded` (unchanged), `answerFits(text) error`, `c.comment`, `c.answerWhole`, `c.record`.
- Produces: `func (c *Console) answerCard(ctx context.Context, a actor, t factoryd.Task, text string) error`; `Config.AttemptFunded` is gone.

- [ ] **Step 1: Write the failing tests**

`fund_test.go` additions and edits:

```go
// Fund takes a note and resumes the card in one step (plan A): the note is
// posted on the issue as the member's answer, so a fund is the answer and no
// second form is owed. A note over the answer bound is refused before the budget moves.
func TestFundIsTheAnswer(t *testing.T) {
	r := newRig(t)
	ck, s := r.loggedIn(t)
	cappedCard(r, t)
	rec := r.do(post("/tasks/t-e/fund", url.Values{"csrf": {s.csrf}, "eur": {"0.5"}, "reason": {"funded; the fix is in store.go"}}), ck)
	if rec.Code != http.StatusSeeOther {
		t.Fatalf("fund = %d: %s", rec.Code, rec.Body)
	}
	if got := r.fg.comments["/api/v1/repos/sf/code/issues/13/comments"]; got != "funded; the fix is in store.go" {
		t.Fatalf("issue comment = %q, want the note as the answer", got)
	}
	if rows := r.events.rows; len(rows) != 2 || rows[0].Kind != factoryd.EventCardFunded || rows[1].Kind != factoryd.EventQuestionAnswered {
		t.Fatalf("event rows = %+v, want card_funded then question_answered", rows)
	}

	r = newRig(t)
	ck, s = r.loggedIn(t)
	cappedCard(r, t)
	rec = r.do(post("/tasks/t-e/fund", url.Values{"csrf": {s.csrf}, "eur": {"0.5"}, "reason": {strings.Repeat("x", factoryd.MaxAnswer+1)}}), ck)
	if task, _, _ := r.tasks.Task(t.Context(), "t-e"); rec.Code != http.StatusBadRequest || task.BudgetEUR != 2 || len(r.fg.comments) != 0 {
		t.Fatalf("fund with a long note = %d, budget %v, %d comments; want 400, 2, none", rec.Code, task.BudgetEUR, len(r.fg.comments))
	}
}
```

In `cappedCard` delete the `AttemptFunded` line (`r.c.cfg.SessionFunded = r.c.cfg.AttemptFunded` becomes `r.c.cfg.SessionFunded = func(context.Context, string, string) (string, error) { return budgetRefusal, nil }`). In `TestFundOpensWhereASessionCannotStart` delete the line `r.c.cfg.AttemptFunded = func(...) { return "", nil }`. In `TestFundIsNotOfferedWhereNoBudgetHelps` replace the two lines setting `AttemptFunded` and `SessionFunded` by `r.c.cfg.SessionFunded = func(context.Context, string, string) (string, error) { return unpriced, nil }`. In `TestFundWritesTheAuditRow` replace `if len(rows) != 1 {` ... by

```go
	if len(rows) != 2 || rows[1].Kind != factoryd.EventQuestionAnswered {
		t.Fatalf("the raise wrote %d event rows, want the raise and the answer it carries", len(rows))
	}
```
In `console_test.go` the three `r.c.cfg.AttemptFunded = ...` assignments (:1546, :1561, :1577) become `r.c.cfg.SessionFunded = ...` with the same bodies.

- [ ] **Step 2: Run to verify failure**

Run: `go test ./internal/console/ -run 'TestFund|TestAnswerRefused|TestAnswerTaken'`
Expected: `TestFundIsTheAnswer` FAIL (`issue comment = ""`), the converted answer tests FAIL (the answer path still reads `AttemptFunded`).

- [ ] **Step 3: Implement**

`actions.go`: replace the posting half of `doAnswer` (from `kind := factoryd.EventQuestionAnswered` to the end) with

```go
	if err := c.answerCard(ctx, a, t, text); err != nil {
		return "", err
	}
	return fmt.Sprintf("Answered #%d.", t.IssueNumber), nil
}

// answerCard posts text as the member's answer to card t's escalation; at the
// session cap the answer is a grant, and its event session_granted.
func (c *Console) answerCard(ctx context.Context, a actor, t factoryd.Task, text string) error {
	kind := factoryd.EventQuestionAnswered
	if c.capFactsOf(ctx, t).capped {
		kind = factoryd.EventSessionGranted
	}
	var posted int64
	if err := c.comment(ctx, a, t, text, &posted); err != nil {
		return &forgejoRefusal{"post the answer", err}
	}
	c.answerWhole(ctx, a, t, posted)
	log.Printf("console: %s answered the escalation of %s via %s", a.s.user, t.ID, a.via)
	c.record(ctx, a, t.Repository, t.ID, t.IssueNumber, kind, commentDetail(posted))
	return nil
}
```
`unfundedAnswer` (comment and body):

```go
// unfundedAnswer is the answer path's floor: the refusal a card's remaining
// budget owes an answer, the session it would start being unfunded
// (SessionFunded), "" when one can run. A card with no session yet (no model
// to price) and a failed read answer as before: the workflow's floor refuses
// the session anyway. An answer at the day cap is taken: its session waits
// for the day on its own.
func (c *Console) unfundedAnswer(ctx context.Context, t factoryd.Task) string {
	if why := c.unfundedSession(ctx, t); !factoryd.DayCapped(why) {
		return why
	}
	return ""
}
```
`doFund`: rename the parameter `reason` to `note`, with the checks and ending

```go
	note = strings.TrimSpace(note)
	switch {
	case !(eur > 0) || math.IsNaN(eur) || math.IsInf(eur, 0):
		return "", refuse(http.StatusBadRequest, "an amount in EUR above zero is required")
	}
	if err := answerFits(note); err != nil {
		return "", err
	}
	t, err := c.cardIn(ctx, a, id)
	if err != nil {
		return "", err
	}
	if t.Kind != "agent" || t.Status != "waiting-human" || t.IssueNumber == 0 {
		return "", wrongState(t, c.capFactsOf(ctx, t), "a card waiting on a human after a budget refusal")
	}
```
(the `switch why := c.unfundedSession(...)` block and the `RaiseTaskBudget` block stay), the log and record keep `reason: note`, and the end becomes

```go
	c.record(ctx, a, t.Repository, t.ID, t.IssueNumber, factoryd.EventCardFunded,
		map[string]any{"from_eur": from, "to_eur": to, "amount_eur": eur, "reason": note})
	if err := c.answerCard(ctx, a, t, note); err != nil {
		log.Printf("console: %s funded %s, the answer failed: %v", a.s.user, t.ID, err)
		return "", refuse(http.StatusBadGateway, fmt.Sprintf("Raised #%d's budget by %.2f EUR to %.2f, but Forgejo refused the note as the answer; answer the card on the board.", t.IssueNumber, eur, to))
	}
	return fmt.Sprintf("Raised #%d's budget by %.2f EUR to %.2f and posted your note as the answer; the card resumes.", t.IssueNumber, eur, to), nil
```
Update `doFund`'s doc comment: `...The note is the member's answer to the card's question, posted as doAnswer posts it, so the raise resumes the card in one step.`

`console.go`: delete the `AttemptFunded` field and its comment; change the comment of `SessionFunded` to `SessionFunded is the floor of a session's start (roadmap 243, plan A): "" when the task's free headroom can fund a session's opening calls and its rung's floor on model, else the refusal (factoryd's Runner.SessionFunded); nil offers no fund and checks no answer.` `main.go`: delete `AttemptFunded:  runner.AttemptFunded,`. `board.html` line 95: label text `why` becomes `note, also the card's answer`.

- [ ] **Step 4: Run to verify pass**

Run: `go build ./... && go vet ./internal/console/ && go test ./internal/console/`
Expected: PASS. A failing console test that still sets `cfg.AttemptFunded` is a missed conversion: the compiler names it.

- [ ] **Step 5: Commit**

```bash
git add internal/console cmd/factoryd/main.go
git commit -m "console: the answer path asks SessionFunded; Fund posts its note as the answer"
```

---

### Task 7: Answers keep their date and stand below the findings

**Files:**
- Modify: `internal/factoryd/workflow.go` (`TaskSignal` :65, `changeRequested` :2682, `drainChanges` :2693, `awaitAnswer` :2787-2790, :3119, `answerText` :3200), `internal/factoryd/workflow_stages.go:690`, `internal/factoryd/activities.go` (:1414, :1547), `internal/factoryd/intake.go:1356`, `internal/factoryd/opencode.go` (`briefText` :593)
- Test: `internal/factoryd/workflow_test.go`, `internal/factoryd/opencode_test.go:664-676`

**Interfaces:**
- Produces: `TaskSignal.At time.Time`; `answerText(author, question, body string, at time.Time) string`; `changeRequested(author, body string, at time.Time) string`; `dated(at time.Time) string`. A zero time gives the old text exactly.

- [ ] **Step 1: Write the failing tests**

`workflow_test.go`:

```go
func TestAnswersAndChangeRequestsCarryTheirDate(t *testing.T) {
	at := time.Date(2026, 10, 15, 13, 30, 0, 0, time.UTC)
	if got, want := answerText("sebastian", "which file?", "docs/a.txt", at), `sebastian (2026-10-15), to "which file?": docs/a.txt`; got != want {
		t.Errorf("answer = %q, want %q", got, want)
	}
	if got, want := answerText("sebastian", "which file?", "docs/a.txt", time.Time{}), `sebastian, to "which file?": docs/a.txt`; got != want {
		t.Errorf("undated answer = %q, want %q", got, want)
	}
	if got, want := changeRequested("sebastian", "rename it", at), "reviewer sebastian requested changes (2026-10-15): rename it"; got != want {
		t.Errorf("change request = %q, want %q", got, want)
	}
	late := time.Date(2026, 10, 16, 1, 30, 0, 0, time.FixedZone("CEST", 2*3600))
	if got := changeRequested("a", "b", late); got != "reviewer a requested changes (2026-10-15): b" {
		t.Errorf("a time in another zone = %q, want its UTC date, 2026-10-15", got)
	}
}

// A live answer is tagged with its comment's date and the question it answered.
func TestWorkflowAnswerReachesTheSessionDated(t *testing.T) {
	h := newWorkflowHarness(t)
	h.refusedThenFunded(1)
	h.onSessions(pushed("s1", "c1"))
	h.onChecks(ChecksResult{State: ChecksSuccess})
	at := time.Date(2026, 10, 15, 13, 30, 0, 0, time.UTC)
	h.signalAfter(time.Hour, SignalHumanComment, TaskSignal{Author: "sebastian", Body: "go on", Comment: 602, At: at})
	h.signalAfter(5*time.Hour, SignalPRMerged, TaskSignal{Author: "sebastian", PR: 9})

	if final := h.run(t); final != "done" || len(h.escalated) != 1 || len(h.sessions) != 1 {
		t.Fatalf("final = %q, escalations %q, sessions %d", final, h.escalated, len(h.sessions))
	}
	want := fmt.Sprintf("sebastian (2026-10-15), to %q: go on", escalationQuestion(h.escalated[0]))
	if !slices.Equal(h.sessions[0].Answers, []string{want}) {
		t.Fatalf("answers = %q, want %q", h.sessions[0].Answers, want)
	}
}
```
(hand check: the refusal's first line is the question; `answerText` truncates a question to 300 bytes and the refusal's first line of `refusedThenFunded` is 85 bytes.)

`opencode_test.go`: replace `TestBriefPutsTheHumansAnswersFirst`:

```go
// Plan A: the findings, a request for changes among them, stand above the
// human's answers, so an old answer cannot outrank a newer request; each
// answer says its date and the question it answered.
func TestBriefPutsTheFindingsAboveTheAnswers(t *testing.T) {
	got := briefText(harness.TaskBrief{
		Objective: "Write the note; ask the human for its name first.",
		Answers:   []string{`sebastian (2026-10-14), to "which file?": change nothing`},
		Findings:  []string{"reviewer sebastian requested changes (2026-10-15): change the name"},
	}, "T")
	want := "The task is the issue's text between the lines <<<ISSUE-T and ISSUE-T>>>.\n<<<ISSUE-T\nWrite the note; ask the human for its name first.\nISSUE-T>>>" +
		"\nFindings from earlier attempts:\n- reviewer sebastian requested changes (2026-10-15): change the name" +
		"\n\n" + answersHeading + "\n- sebastian (2026-10-14), to \"which file?\": change nothing" +
		"\n\n" + workGuide(nil)
	if got != want {
		t.Fatalf("objective =\n%s\nwant\n%s", got, want)
	}
	if !strings.Contains(answersHeading, "replaces the older answer") {
		t.Fatalf("heading = %q, want it to say that a newer finding replaces an older answer", answersHeading)
	}
}
```

- [ ] **Step 2: Run to verify failure**

Run: `go test ./internal/factoryd/ -run 'TestAnswersAndChangeRequestsCarryTheirDate|TestWorkflowAnswerReachesTheSessionDated|TestBriefPutsTheFindingsAboveTheAnswers'`
Expected: compile failure (`answerText` arity, `answersHeading`).

- [ ] **Step 3: Implement**

`workflow.go`: `TaskSignal` gains `At time.Time // when the comment or review was made; zero for a signal from before dates`. Replace `changeRequested` and `answerText`:

```go
func changeRequested(author, body string, at time.Time) string {
	return "reviewer " + author + " requested changes" + dated(at) + ": " + body
}
```
```go
func answerText(author, question, body string, at time.Time) string {
	return fmt.Sprintf("%s%s, to %q: %s", author, dated(at), textutil.Truncate(question, 300), textutil.Truncate(body, MaxAnswer))
}

// dated is " (YYYY-MM-DD)" in UTC, "" for no time.
func dated(at time.Time) string {
	if at.IsZero() {
		return ""
	}
	return " (" + at.UTC().Format("2006-01-02") + ")"
}
```
Callers: `drainChanges` → `changeRequested(sig.Author, sig.Body, sig.At)`; :3119 `return "", "", []string{changeRequested(sig.Author, sig.Body, sig.At)}`; `awaitAnswer` both `answerText(sig.Author, question, sig.Body, sig.At)`; `workflow_stages.go:690` `answerText(sig.Author, a.question, sig.Body, sig.At)`; `activities.go:1414` `changeRequested(e.Author, e.Body, e.CreatedAt)`; :1547 `answerText(e.Author, a.question, e.Body, e.CreatedAt)`; `intake.go` `signalOf`: `sig = TaskSignal{Author: e.Author, Body: e.Body, At: e.CreatedAt}`. Fix the comment of `answerText` ("tagged with the question it answers" gains "and its date").

`opencode.go` `briefText`: delete the answers block at its top, and after the findings block insert

```go
	if len(brief.Answers) > 0 {
		b.WriteString("\n\n" + answersHeading)
		for _, a := range brief.Answers {
			fmt.Fprintf(&b, "\n- %s", a)
		}
	}
```
with, beside `toolsLine`:

```go
// answersHeading opens the brief's section of the human's answers, which
// stands below the findings: a finding dated after an answer, a request for
// changes among them, replaces it, and a newer answer replaces an older one to
// the same question.
const answersHeading = "The human has answered this task's escalations (newest first, each with its date and the question it answered). " +
	"These answers settle those questions: act on them and do not escalate them again. " +
	"A finding above that is dated after an answer, a request for changes among them, replaces the older answer, " +
	"and a newer answer replaces the older answer to the same question."
```
The rest of the brief (`Map`, guide) is unchanged.

- [ ] **Step 4: Run to verify pass**

Run: `go vet ./internal/factoryd/ && go test ./internal/factoryd/ -run 'Brief|TestWorkflow|Answer|Reconcile|Intake'`
Expected: PASS. Existing tests with `Answer`/change-request texts use zero times, so their strings are unchanged; a failing one means a time leaked in through `IntakeEvent.CreatedAt`: hand-derive the date and extend the expected text.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd
git commit -m "answers and change requests carry their date; the findings stand above the answers in the brief"
```

---

### Task 8: A dead session's command lines never pass as findings

**Files:**
- Modify: `internal/factoryd/activities.go` (`sessionResult` :810-890, heartbeat :324-372, dead-session resume :629-633), `internal/factoryd/runner.go` (:494, :555, :568, :704, :856, `sessionOutcome` :440-452), `internal/factoryd/supervise.go:349`, `internal/factoryd/workflow.go` (`SessionResult`, the `own` site ~:1425, new `handoverLines`)
- Test: `internal/factoryd/runner_test.go` (:1198-1226, :1513-1523), `internal/factoryd/supervisor_test.go:135`, `internal/factoryd/workflow_test.go`

**Interfaces:**
- Produces: `SessionResult.LastMessage string`; `func (t *taskRun) handoverLines(res SessionResult) []string`; `sessionProgress` without `Findings`; `const maxHandoverMessage = 2000`.

- [ ] **Step 1: Write the failing tests**

`runner_test.go`: replace `TestRunSessionResultCarriesFindings` with

```go
// What a session that ended without a push did does not reach its result as
// lines: its commands are in its record, and the next session gets the stop
// reason, the branch and the agent's last message instead.
func TestRunSessionResultCarriesNoCommandLines(t *testing.T) {
	runner, _, _ := newTestRunner(t, supervisedTask("t2"), newFakeKube(), &fakeObjectStore{})
	logs := envLine(harness.Event{Kind: harness.EventCommand, Time: time.Now(), Detail: map[string]any{"command": "go test ./...", "exit": 1}}) + "\n" + resultLine(false, "gave up")
	res, err := runSession(t, nil, runner, SessionInput{TaskID: "t2", Attempt: 1, Model: "m"}, nil, logs)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(res.Findings, []string{"previous session ended without a pushed commit: gave up"}) {
		t.Fatalf("findings = %q, want the stop line alone", res.Findings)
	}
}

func TestSessionResultCarriesTheBranchAndTheAgentsLastMessage(t *testing.T) {
	res := sessionResult(sessionSpec{id: "s1"}, sessionOutcome{noResult: "the worker exited without a result", commit: "c-wip", agentText: "I ran out of budget"})
	if res.Commit != "c-wip" || res.LastMessage != "I ran out of budget" ||
		!slices.Equal(res.Findings, []string{"previous session ended unfinished: the worker exited without a result"}) {
		t.Fatalf("result = %+v, want the branch's commit, the last message and the stop line", res)
	}
}
```
In `TestRunSessionRetryReplacesDeadSession` remove `Findings: []string{"changed a.go"}` from `dead`, and change the checks to

```go
	if len(findings) != 2 || findings[0] != "earlier note" || !strings.Contains(findings[1], "s-dead stopped after 7 events") {
		t.Fatalf("findings = %q, want the input and the interruption, no command line of the dead session", findings)
	}
```
and the timeline expectation `"findings":["earlier note","changed a.go","session s-dead stopped after 7 events` becomes `"findings":["earlier note","session s-dead stopped after 7 events`. `supervisor_test.go:135`: `sup.Findings()` becomes `sup.findings`.

`workflow_test.go`:

```go
// A session that ended without a push hands on its stop line, the commit its
// branch holds with the gates' judgment of it and the agent's last message.
func TestWorkflowUnpushedSessionHandsOnTheBranchAndTheLastMessage(t *testing.T) {
	h := newWorkflowHarness(t)
	h.onSessions(
		SessionResult{Outcome: OutcomeNoPush, SessionID: "s1", Summary: "stopped", Commit: "c-wip", LastMessage: "tests still fail",
			Findings: []string{"previous session ended unfinished: stopped"}},
		pushed("s2", "c2"))
	h.onChecks(ChecksResult{State: ChecksSuccess})
	h.signalAfter(3*time.Hour, SignalPRMerged, TaskSignal{Author: "sebastian", PR: 9})

	if final := h.run(t); final != "done" || len(h.sessions) != 2 {
		t.Fatalf("final = %q after %d sessions", final, len(h.sessions))
	}
	want := []string{"previous session ended unfinished: stopped", "the branch holds c-wip; the gates have not judged it", "the agent's last message: tests still fail"}
	if !slices.Equal(h.sessions[1].Findings, want) {
		t.Fatalf("second session's findings = %q, want %q", h.sessions[1].Findings, want)
	}
}

func TestHandoverLinesNameTheJudgmentOfTheBranch(t *testing.T) {
	run := taskRun{judged: []string{"c1"}}
	want := []string{"the branch holds c1; the gates have judged it", "the agent's last message: done"}
	if got := run.handoverLines(SessionResult{Commit: "c1", LastMessage: "done"}); !slices.Equal(got, want) {
		t.Fatalf("lines = %q, want %q", got, want)
	}
	if got := run.handoverLines(SessionResult{}); len(got) != 0 {
		t.Fatalf("lines = %q, want none for a session that left no branch and no message", got)
	}
}
```

- [ ] **Step 2: Run to verify failure**

Run: `go test ./internal/factoryd/ -run 'TestRunSessionResultCarriesNoCommandLines|TestSessionResultCarriesTheBranch|TestWorkflowUnpushedSessionHandsOnTheBranch|TestHandoverLines|TestRunSessionRetryReplacesDeadSession'`
Expected: compile failure `unknown field LastMessage`.

- [ ] **Step 3: Implement**

`workflow.go`: `SessionResult` gains

```go
	// LastMessage is the agent's last message, cut at maxHandoverMessage, ""
	// when it said none; the next session is told it beside the stop reason.
	LastMessage string
```
with `const maxHandoverMessage = 2000` beside `maxAgentSummary` in `activities.go`. In `lifecycle`, the `own` site becomes

```go
		if !res.StartFailed {
			own = res.Findings
			if res.Outcome != OutcomePushed {
				own = slices.Concat(res.Findings, t.handoverLines(res))
			}
		}
```
and the new method (next to `sessionReturn`):

```go
// handoverLines are what the next session is told beside a session's stop
// lines when that ended without a push: the commit its branch holds and
// whether the gates judged it, and the agent's last message. The check-in
// agent's handover note replaces them.
func (t *taskRun) handoverLines(res SessionResult) []string {
	var lines []string
	if res.Commit != "" {
		judged := "the gates have not judged it"
		if slices.Contains(t.judged, res.Commit) {
			judged = "the gates have judged it"
		}
		lines = append(lines, fmt.Sprintf("the branch holds %s; %s", res.Commit, judged))
	}
	if res.LastMessage != "" {
		lines = append(lines, "the agent's last message: "+res.LastMessage)
	}
	return lines
}
```
`activities.go` `sessionResult`: delete `res.Findings = out.findings` in both pushed branches (the two returns keep their other assignments); before `if out.trip != nil {` add `res.LastMessage = textutil.Truncate(out.agentText, maxHandoverMessage)`; the trip line becomes `res.Findings = out.stopReport()`; the provider-repetition line `res.Findings = []string{loopFinding("the model provider refused its repeated tool calls: " + res.Summary)}`; the final lines become

```go
	res.Commit = out.commit
	res.Findings = []string{ended + res.Summary}
```
`runner.go`: delete the `findings []string` field of `sessionOutcome`; line 568 becomes `defer func() { out.model = s.model }()`; `progress func(events int, findings []string)` becomes `progress func(events int)`, with the calls `progress(0)`, `progress(events)` (two places). `activities.go` heartbeat: delete `Findings []string` from `sessionProgress`; `update(events int)` sets `h.p.Running, h.p.Events = true, events`; `snapshot` returns `sessionProgress{SessionID: h.p.SessionID, Running: h.p.Running, Events: h.p.Events}`; the resume (`if dead.Running {`) becomes

```go
			s.findings = slices.Concat(in.Findings, []string{fmt.Sprintf(
				"session %s stopped after %d events without finishing; continue from the branch as it is", dead.SessionID, dead.Events)})
```
`supervise.go`: delete `func (s *Supervisor) Findings() []string` (its doc comment too); the supervisor keeps `s.findings` for the session record's snapshot.

- [ ] **Step 4: Run to verify pass**

Run: `go build ./... && go vet ./internal/factoryd/ && go test ./internal/factoryd/ -run 'RunSession|SessionResult|Supervisor|TestWorkflow|Handover|Heartbeat|Escalat'`
Expected: PASS. The tests that assert stop lines (`escalation_test.go` :493-583, `runner_test.go` :1929, :2392-2428) still hold: only the command lines left `res.Findings`.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd
git commit -m "a dead session's command lines no longer pass as findings; the branch and the last message do"
```

---

### Task 9: The approval at the cap with red checks offers return and close

**Files:**
- Modify: `internal/console/approvals.go:53`, `internal/console/actions.go` (`doApprove` :1487), `internal/console/templates/board.html` (:123-142)
- Test: `internal/console/console_test.go` (after `TestFactoryPullRequestApprovalFitsItsHead`, :1862-1930)

**Interfaces:**
- Consumes: `MergeSpec.RedChecks`, `MergeSpec.Factory` (`gates.go:204`); the workflow already writes `RedChecks` for any card whose head is red when the request opens (`headGreen`, `approve`).
- Produces: `func (k approvalCard) Returns() bool`.

- [ ] **Step 1: Write the failing test**

```go
// An agent card's merge request on red checks (#838: the cap reached, the sync
// with main turned the head red) cannot merge: its card offers the return to
// the agent and the close, no Approve, and an approve refuses naming both.
func TestAgentApprovalOnRedChecksOffersReturnAndClose(t *testing.T) {
	r := newRig(t)
	ck, s := r.loggedIn(t)
	r.approvals.mu.Lock()
	r.approvals.rows[1].Spec = json.RawMessage(`{"risk_class":"standard","head_sha":"abc123","red_checks":true,"why_human":["session cap reached"]}`)
	r.approvals.mu.Unlock()

	body := r.do(httptest.NewRequest(http.MethodGet, "/?view=wide", nil), ck).Body.String()
	start := strings.Index(body, `action="/approvals/4/`)
	if start < 0 {
		t.Fatalf("the board shows no form of request 4:\n%s", body)
	}
	start = strings.LastIndex(body[:start], "<article")
	got := body[start : start+strings.Index(body[start:], "</article>")]
	for _, want := range []string{`aria-controls="deny-4">Return or close</button>`, `name="action" value="request_changes" checked`, "return it to the agent",
		`name="action" value="reject"`, "close it (closes the pull request)", `aria-label="Return or close PR #9 of t-m">Send</button>`} {
		if !strings.Contains(got, want) {
			t.Errorf("the red agent request lacks %q:\n%s", want, got)
		}
	}
	for _, not := range []string{`action="/approvals/4/approve"`, `action="/approvals/4/rerun"`, ">Deny</button>"} {
		if strings.Contains(got, not) {
			t.Errorf("the red agent request shows %q:\n%s", not, got)
		}
	}
	r.fg.calls = nil
	rec := r.do(post("/approvals/4/approve", url.Values{"csrf": {s.csrf}}), ck)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "return it to the agent") || !strings.Contains(rec.Body.String(), "close it") || len(r.fg.calls) != 0 {
		t.Fatalf("approve on red = %d %q, calls %q: want the refusal naming both ways and no review", rec.Code, rec.Body, r.fg.calls)
	}
	rec = r.do(post("/approvals/4/deny", url.Values{"csrf": {s.csrf}, "action": {"request_changes"}, "note": {"make the stub match the interface"}}), ck)
	if rec.Code != http.StatusSeeOther {
		t.Fatalf("return = %d: %s", rec.Code, rec.Body)
	}
}
```

- [ ] **Step 2: Run to verify failure**

Run: `go test ./internal/console/ -run TestAgentApprovalOnRedChecksOffersReturnAndClose`
Expected: FAIL, the card lacks `Return or close` and shows an Approve form.

- [ ] **Step 3: Implement**

`approvals.go`, after `Rerun`:

```go
// Returns: the card is an agent's merge request on red checks, which cannot
// merge: it offers the return to the agent and the close, not Approve.
func (k approvalCard) Returns() bool {
	return k.Kind == factoryd.ApprovalMerge && !k.Merge.Factory && k.Merge.RedChecks
}
```
`doApprove`: replace `if spec.Factory && spec.RedChecks {` with

```go
		if spec.RedChecks && !spec.Factory {
			return "", refuse(http.StatusConflict, fmt.Sprintf("Pull request #%d's checks are red, so it cannot merge: return it to the agent with what to change "+
				"(deny_merge with request_changes, the card's Return) or close it (deny_merge with reject, the card's Close).", q.PRNumber))
		}
		if spec.Factory && spec.RedChecks {
```
(the factory refusal body is unchanged).

`board.html`, five replacements (each string occurs once in the `approval` template):
1. `</form>{{else if .Approver}}{{if eq .Kind "resource"}}` → `</form>{{else if .Returns}}<div class="acts">{{else if .Approver}}{{if eq .Kind "resource"}}`
2. `{{if .Merge.Factory}}Close{{else}}Deny{{end}}</button>` → `{{if .Merge.Factory}}Close{{else if .Returns}}Return or close{{else}}Deny{{end}}</button>`
3. `{{if .Merge.Factory}}Why it closes, posted on its issue and pull request{{else}}Reason` → `{{if .Merge.Factory}}Why it closes, posted on its issue and pull request{{else if .Returns}}What the agent changes, or why it closes, posted on the pull request as you{{else}}Reason`
4. `<fieldset><legend>Deny by</legend>` → `<fieldset><legend>{{if .Returns}}Send it{{else}}Deny by{{end}}</legend>`; `> requesting changes</label>` → `> {{if .Returns}}return it to the agent{{else}}requesting changes{{end}}</label>`; `> rejecting (closes the pull request)</label>` → `> {{if .Returns}}close it (closes the pull request){{else}}rejecting (closes the pull request){{end}}</label>`
5. In the submit line, `{{else}}<button type="submit" class="deny" aria-label="Deny {{if eq .Kind "merge"}}` → `{{else if .Returns}}<button type="submit" class="deny" aria-label="Return or close PR #{{.PRNumber}} of {{.TaskID}}">Send</button>{{else}}<button type="submit" class="deny" aria-label="Deny {{if eq .Kind "merge"}}`

- [ ] **Step 4: Run to verify pass**

Run: `go test ./internal/console/`
Expected: PASS, including `TestFactoryPullRequestApprovalFitsItsHead` (factory cards keep their Re-run and Close) and the green-card test that expects `Deny by` with Approve.

- [ ] **Step 5: Commit**

```bash
git add internal/console
git commit -m "console: an agent card on red checks offers return and close, not Approve"
```

---

### Task 10: A `concerns` verdict without findings is a remark

**Files:**
- Modify: `internal/factoryd/workflow.go` (const after `versionSessionLadder`, field, `GetVersion`), `internal/factoryd/workflow_stages.go` (`runStages` :145-150, `runStage` :524-530, new `remarked`)
- Test: `internal/factoryd/workflow_test.go`

**Interfaces:**
- Produces: `versionReviewRemark`, `taskRun.reviewRemark`, `func (t *taskRun) remarked(review Review) bool`.

- [ ] **Step 1: Write the failing tests**

```go
// #837: a review that answered concerns with no finding cost a session that
// fixed nothing. It is a remark on the approval card: one session, one
// request for approval, the remark among the reasons for a human.
func TestWorkflowConcernsWithoutFindingsIsARemark(t *testing.T) {
	h := newWorkflowHarness(t)
	h.onSessions(pushed("s1", "c1"))
	h.onChecks(ChecksResult{State: ChecksSuccess})
	h.env.OnActivity(ActivityModelReview, mock.Anything, "t1", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(
		Review{Verdict: "concerns", Summary: "a human decides the merge"}, nil)
	var asked []ApprovalInput
	h.env.OnActivity(ActivityRequestApproval, mock.Anything, "t1", mock.Anything).Return(
		func(ctx context.Context, taskID string, in ApprovalInput) error { asked = append(asked, in); return nil })
	h.signalAfter(3*time.Hour, SignalPRMerged, TaskSignal{Author: "sebastian", PR: 9})

	if final := h.run(t); final != "done" {
		t.Fatalf("final = %q", final)
	}
	if len(h.sessions) != 1 || len(asked) != 1 || !slices.Equal(asked[0].WhyHuman, []string{"review: remark, no finding: a human decides the merge"}) {
		t.Fatalf("sessions %d, approvals %+v; want one session and the remark as the reason for a human", len(h.sessions), asked)
	}
}

// A run from before the gate turns it into the finding "model review: ..." and
// pays a session for it.
func TestWorkflowBeforeReviewRemarkConcernsWithoutFindingsCostASession(t *testing.T) {
	h := newWorkflowHarness(t)
	h.env.OnGetVersion("review-remark", workflow.DefaultVersion, versionReviewRemark).Return(workflow.DefaultVersion)
	h.onSessions(pushed("s1", "c1"), pushed("s2", "c2"))
	h.onChecks(ChecksResult{State: ChecksSuccess})
	reviews := 0
	h.env.OnActivity(ActivityModelReview, mock.Anything, "t1", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(
		func(ctx context.Context, taskID string, pr PullRequest, commit string, g GateResults, earlier []Review, round int) (Review, error) {
			if reviews++; reviews == 1 {
				return Review{Verdict: "concerns", Summary: "a human decides the merge"}, nil
			}
			return Review{Verdict: "approve", Summary: "fine"}, nil
		})
	h.signalAfter(5*time.Hour, SignalPRMerged, TaskSignal{Author: "sebastian", PR: 9})

	if final := h.run(t); final != "done" || len(h.sessions) != 2 || !slices.Equal(h.sessions[1].Findings, []string{"model review: a human decides the merge"}) {
		t.Fatalf("final = %q, sessions = %+v; want the second session sent back with the summary as its finding", final, h.sessions)
	}
}
```

- [ ] **Step 2: Run to verify failure**

Run: `go test ./internal/factoryd/ -run 'TestWorkflowConcernsWithoutFindingsIsARemark|TestWorkflowBeforeReviewRemark'`
Expected: compile failure `undefined: versionReviewRemark`.

- [ ] **Step 3: Implement**

`workflow.go`, after the `versionSessionLadder` const:

```go
	// versionReviewRemark (change id "review-remark", plan A): a review that
	// answers concerns and names no finding is a remark on the card, not a
	// finding for the agent and not a session. A run from before turns it into
	// the finding "model review: <summary>".
	versionReviewRemark workflow.Version = 1
```
field `reviewRemark workflow.Version // concerns without findings is a remark (versionReviewRemark)` after `sessionLadder`; in `Run` after the `session-ladder` line: `run.reviewRemark = workflow.GetVersion(ctx, "review-remark", workflow.DefaultVersion, versionReviewRemark)`.

`workflow_stages.go`, in `runStage` replace the `concerns` block with

```go
		if review.Verdict == "concerns" {
			if len(review.Findings) == 0 {
				if t.remarked(*review) {
					return nil, verdict{}, false
				}
				return []string{"model review: " + review.Summary}, verdict{}, false
			}
			return review.Findings, verdict{}, false
		}
```
(`review` is the `*Review` of `runStage`'s parameters; `runStages` holds the value). In `runStages`, after the no-verdict block (`... continue` of `noVerdict`) and before `if len(findings) == 0 {`:

```go
		if s.Name == policy.StageReview && t.remarked(review) {
			card = append(card, s.Name+": remark, no finding: "+review.Summary)
			continue
		}
```
and at the end of the file's stage helpers:

```go
// remarked: the review answered concerns and named no finding
// (versionReviewRemark), a remark on the card. A roll has no agent to answer
// a finding and keeps its old path.
func (t *taskRun) remarked(review Review) bool {
	return t.reviewRemark >= versionReviewRemark && !t.rolling && review.Verdict == "concerns" && len(review.Findings) == 0
}
```
If `runStage` takes `review` by value in the tree at rebase time, drop the `*`.

- [ ] **Step 4: Run to verify pass**

Run: `go vet ./internal/factoryd/ && go test ./internal/factoryd/ -run 'TestWorkflow|Review|Stage|Approval'`
Expected: PASS. Hand check of the first test: the card holds the one remark, `AutoMerge` is not consulted (`len(card) != 0`), `WhyHuman` is the card; the review ran once, so one session.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd
git commit -m "workflow: a concerns verdict without findings is a remark on the card, not a session"
```

---

### Task 11: Verification, the policy values, the documents

**Files:**
- Verify: the whole code repository
- Modify (after the roll): `~/repos/ai-software-factory-infra/factory/policy.yaml`, `~/repos/ai-software-factory-infra/factory/schema/policy.schema.json`
- Modify: `~/repos/ai-software-factory/docs/architecture.md` (after :1096), `~/repos/ai-software-factory/docs/plans/2026-10-15-escalation-ladder-implementation.md` (State)

- [ ] **Step 1: Rebase and run the repository's checks**

```bash
cd ~/repos/ai-software-factory-code/../worktrees/asf-code-ladder-a
git fetch origin && git rebase origin/main
bash check
```
Expected: `go vet`, gofmt, gosec and `make test` pass. The Postgres suite takes minutes; run it in the background and read the verdict line. A conflict with plans B or C in `briefText` or `runStage` is resolved by keeping both edits.

- [ ] **Step 2: Land the code**

```bash
git push origin HEAD:master   # fast-forward only; the standing authorization commits to master
git push github HEAD:master
```
Then delete the worktree (`git worktree remove ../worktrees/asf-code-ladder-a`) and prune dangling ones. The roll card puts the commit on the cluster; the next step waits for it, because a running factoryd rejects an unknown policy key.

- [ ] **Step 3: Policy values and the regenerated schema (after the roll)**

In `~/repos/ai-software-factory-infra/factory/policy.yaml`, in the `budget:` block after `month_eur: 544`:

```yaml
  # the least free budget a session starts on, by its rung (plan A of the
  # escalation ladder, 2026-10-15): the starved sessions of cards #839 and #854
  # died at 0.15 and 0.07 EUR left
  session_floor_cheap_eur: 0.30
  session_floor_frontier_eur: 0.60
```
Then:

```bash
cd ~/repos/ai-software-factory-code
go run ./cmd/factoryd schema --out ~/repos/ai-software-factory-infra/factory/schema
go run ./cmd/factoryd config check ~/repos/ai-software-factory-infra/factory
```
Expected: the check prints no error and no "differs from this factoryd's schema" warning. Commit in the infra repository: `git add factory/policy.yaml factory/schema/policy.schema.json && git commit -m "policy: a floor per rung for a session's start"`, push to `origin` and `github`.

- [ ] **Step 4: The architecture document and the notes file**

In `architecture.md`, after the paragraph that ends "...with no pull request." (line 1096, before "Since Stage 12 finished work survives every cap") insert:

```
Since the escalation ladder's plan A (change id `session-ladder`) the session
cap counts the sessions that got a model answer: after every session the short
activity `SessionAnswered` reads the gateway's ledger and writes the
`session_started` record of one that did, so a starved or refused session takes
no number. A session starts only when `SessionFunded` finds its opening calls
and the floor of its rung (`budget.session_floor_cheap_eur` and
`session_floor_frontier_eur`) free, and the question names the amount; the
console's Fund posts its note as the answer, and every wait for a human adds the
change requests that answered it to the next session's findings. A card filed on
the strong rung gets at least the medium budget. Answers carry their date and
the question, and stand below the findings in the brief; a dead session leaves
its stop line, the commit its branch holds with the gates' judgment of it and the
agent's last message, never its command lines; an agent card on red checks at the
cap offers return and close, not Approve; and a review's `concerns` without a
finding is a remark on the card (change id `review-remark`).
```
In `2026-10-15-escalation-ladder-implementation.md`, under "State", add: `- Plan A is implemented on main at <commit>; the policy floors 0.30 and 0.60 EUR are in the infra repository.`

- [ ] **Step 5: Final check**

Run in the code repository on master: `go build ./... && go test ./internal/policy/ ./internal/console/` and `scripts/pg-test.sh go test ./internal/factoryd/ -run 'TestPGStoreModelAnswered|TestSessionFunded|TestWorkflow'`.
Expected: PASS. State in the report which parts are not verified: the live ledger path of `ModelAnswered` runs against a throwaway Postgres only, and the floors' values (0.30, 0.60) are an estimate.

---

## Self-review

**Spec coverage.**

| Scope item | Task |
|---|---|
| 1 Session cap counts answered sessions; no branch keeps `attempt--`; version gate | 4 (fact, record), 5 (loop, gate `session-ladder`) |
| 2 `SessionFunded` replaces `AttemptFunded`, floor per rung, question names the amount | 1 (values), 3 (`funded`), 5 (`unfunded`), 6 (console answer path) |
| 3 Every wait returns its answer, one place; Fund takes a note and resumes | 5 (`held`), 6 (`doFund` + `answerCard`) |
| 4 Budget from rung and size | 1, 2 |
| 5 Dated answers with their question, replaced explicitly, findings above answers | 7 |
| 6 Dead session's command lines gone; stop reason, branch state with judgment, last message | 8 |
| 7 Red checks at the cap: return and close | 9 |
| 8 `concerns` without findings is a remark | 10 |

**Placeholders.** None: every code step shows the code; the two places that say "the compiler names it" (Task 6 step 4) and "hand-derive the date" (Task 7 step 4) are instructions for a failure that should not occur, and the first test they guard (`TestFund...`) is fully written.

**Type consistency.** `CardBudget(b, p, size string, strong bool, requested float64)` (Tasks 1, 2); `Budget.SessionFloor(frontier bool)` (Tasks 1, 3); `SessionAnswerInput{TaskID, SessionID, Model string; Attempt int; Since time.Time}` and `Runner.SessionAnswered` (Tasks 4, 5); `ActivitySessionFunded` takes `(taskID, model string)` as `AttemptFunded` did (Tasks 4, 5); `answerText(author, question, body string, at time.Time)` and `changeRequested(author, body string, at time.Time)` at all six call sites (Task 7); `SessionResult.LastMessage` (Task 8); `held(final, why string, answer []string) (string, string)` takes `t.await*`'s three results directly (Task 5); `remarked(review Review) bool` (Task 10).

**Review Focus.** The old-gate run (Task 5 tests 2 and 3), the too-small fund (Task 5 test 4), an undated signal (Task 7 test 1), the dying-session loop (Task 5: `sessionAnswered` runs before the error branches), the over-long fund note (Task 6 test), and the roll (Task 10: `!t.rolling`) each have a test or a named code line.

**Not verified by this plan, for the report:** the floor values; whether `Temporal` replay of a recorded history under the two gates holds beyond the gate-pinned unit tests (no recorded history of a real run is replayed); the effect of `held` on a run in flight at the day-cap wait (unchanged by construction, since that site already kept its answer).
