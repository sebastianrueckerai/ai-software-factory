# Escalation ladder, plan B: facts, detectors and the planner

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A session starts with its budget, time and attempt in its brief and is told to wrap up near a limit; a card that spends without pushing, or whose context grows large, is caught by code; a background job is waited on in one call; the planner is warned and gets a second session instead of a fail; the sandbox's capabilities are a fact in the brief; a session that pushed on a budget refusal is recorded as `pushed`.

**Architecture:** Facts and warnings are factoryd's: the brief carries a rendered line (`FACTS` env), and the runner's supervision tick sends a warning through the worker's existing `/message` path, so no gateway body is rewritten. The two detectors are thresholds in `limits` (policy). The context detector is opencode's own compaction, set by the generated config from the same threshold. The wait tool is a subcommand of the `agent-worker` binary that is already in the image. The planner's second session is a version-gated change in `planLoop`. The sandbox list is derived from `sandboxRegistries` and a tool table that a test holds to `Dockerfile.sandbox`.

**Tech Stack:** Go (`go test -race ./...`, Postgres tests through `scripts/pg-test.sh`), Temporal test suite, opencode v1.18.32 (pinned in `Dockerfile.sandbox`), policy YAML with a generated JSON schema.

**Spec:** [escalation-ladder-redesign-2026-10-15.md](../escalation-ladder-redesign-2026-10-15.md), section 5, "Changes that need no model": the rows "Budget left, time left...", "A spend-without-push detector", "A context-size detector", "A blocking wait tool", "The planner gets a warning", "The sandbox's capabilities", "A session record says `pushed`". Facts: [escalation-ladder-facts-2026-10-15.md](../escalation-ladder-facts-2026-10-15.md). Earlier plan: [2026-10-13-agent-facts-tools.md](2026-10-13-agent-facts-tools.md) (roadmap 199). Notes: [2026-10-15-escalation-ladder-implementation.md](2026-10-15-escalation-ladder-implementation.md).

Repositories: code `~/repos/ai-software-factory-code` (all tasks but 10 and 11), infra `~/repos/ai-software-factory-infra` (task 10), docs `~/repos/ai-software-factory` (task 11). Code at `461f4d8` on `main` when this plan was written; other sessions push to main, so `git pull --rebase` before every push.

## What was taken from the 2026-10-13 plan, and what was left

Taken: the ruling that no agent is asked for a fact an injected input can carry (item 3, extended from the supervisor, review and gate inputs to the coding and planning agent's brief), and roadmap 199's budget steering (a warning when a task nears its budget, session cap or wall-clock cap, so it wraps up instead of being cut off).

Left, because the design's scope says the injected facts and the warning are the scope: the `task_costs` MCP tool (item 1), the supervised `task_id` read (item 2), the cost block for the supervisor, review and gate inputs (item 3, the part for single-shot calls), the policy allow-list of the tool (item 4), the chat's tool catalogue (item 5) and the principle line in architecture.md (item 6, already recorded). Roadmap 199 stays open for them.

## Where the design does not fit the code

1. **The warning is not added to a gateway response.** The gateway holds only the budget (`gateway.Task`: `BudgetEUR`, `SpentEUR`). Time left and the attempt live in factoryd, and a streamed SSE response cannot take a line without the model storing it as its own words in history. factoryd's runner already ticks every 1 to 15 seconds, reads the task row, and delivers text to the running agent as its next user turn (`Runner.message`, the path the climb and the supervisor's messages use). Task 3 sends the warning that way, once per limit per session.
2. **The context detector is not a detector in `supervise.go`.** opencode v1.18.32 compacts by itself (research below). The threshold is set in the generated config, so no trip, no supervisor call and no race with the running turn exist. The graceful-end fallback is not needed.
3. **`opencode.go:891-903` no longer holds the `no_push` mapping** (those lines are now the tool-use parser). The mapping is `sessionResult` in `internal/factoryd/activities.go:811` (the `case out.result != nil` branch at 862) and the `RunSession` activity that calls it (`activities.go:700-770`). Task 9 changes it there.
4. **A `pushed` budget-refused session goes through `verify`, with an empty budget.** The workflow switches on `Outcome`; `pushed` runs the gates on the commit, and the model review of an empty budget is refused by the gateway, which `ModelReview` turns into a note (`gates.go:950-961`). The next attempt's funding check still asks the human to fund. The note travels as a finding to the next session. If Sebastian prefers the old flow with only the record changed, task 9's step 3 is the one line to drop (open question 2).
5. **The planner has no session counter.** `reportSession` carries no attempt, so the planner's brief states budget and time, and the session line only for coding sessions (`Attempt == 0` leaves it out).
6. **"Session cap" has no mid-session warning.** The cap is a count of sessions, not a quantity that runs down inside one. The brief's fact line carries "session N of M, the last one" (task 2). The budget and the wall clock are what the warning watches.
7. **`session_started` records** that the design names do not exist under that name; the record is `session_start` (`activities.go:686`). Not touched here.
8. **Line references of the facts file at `83c7073`, checked against `461f4d8`:** `plan.go:1082-1085` holds (the remaining-time fail); `workflow.go:1288-1311` holds; `runner.go:554-556` is now `560-563`; `supervise.go:134-166` is `130-166`; `opencode.go:891-903` is stale (item 3). Every other reference in this plan is to the current tree.

## What opencode v1.18.32 offers for compaction (research)

Read from the release tag `v1.18.32` (`packages/sdk/openapi.json`, `packages/opencode/src/session/{compaction,overflow,prompt}.ts`, `packages/server/.../handlers/session.ts`, `packages/core/src/v1/config/provider.ts`):

- **A call exists.** `POST /session/{id}/summarize` with `{"providerID","modelID","auto"?}` creates a compaction message and then calls `promptSvc.loop` (`handlers/session.ts:273-293`). `loop` goes through `state.ensureRunning`, which joins the already running loop of that session: while the agent works, the HTTP call would block until the session is idle. The worker's `serveCall` has a 30 second timeout, and cancelling the request mid-turn is not documented to leave the loop alone. So the call is a poor trigger for a running session. A newer `POST /api/session/{id}/compact` (v2) takes no body and answers 204; the worker uses the v1 routes everywhere else.
- **Auto-compaction exists and takes a threshold.** After every finished step the loop calls `compaction.isOverflow` (`prompt.ts:1160-1167`); when the last assistant message's token total reaches `usable(model)` it queues a compaction and continues (`overflow.ts`): with `limit.input` set, `usable = limit.input - compaction.reserved` (reserved defaults to `min(20000, max output)`); without it, `usable = limit.context - max output`. The factory's config declares `limit.context = 200000` and `output = 24576`, so today compaction starts near 175,000 tokens, which card #854 (138,000) never reached.
- **Decision.** Set `limit.input = context_tokens` and `compaction: {auto: true, reserved: 0}` in the generated config. Then `usable = context_tokens` exactly (`reserved` is read with `??`, so 0 counts). The compaction is one more model call through the gateway, on the session's alias, summarising the conversation and keeping the recent turns (`preserve_recent_tokens`, 2,000 to 15,000). The config schema accepts all three keys (`Config.compaction.{auto,reserved}`, `provider.models.*.limit.input`).
- **Not verified live.** No opencode binary ran here. The source reading is the evidence. Task 5's last step is the live check on the first card after the roll.

## Global constraints

- "Policy values live in the infra repository's `factory/policy.yaml`; a code change that needs a new key ships with its default and the infra change follows." Every new `limits` key has a code default; the infra edit is the last code-adjacent task (10).
- "Temporal workflow changes that alter control flow for runs in flight carry a version gate." Task 7 changes `planLoop`'s control flow and carries `planner-retry`. Tasks 3, 4, 5, 6, 8, 9 change activities, the runner or the worker only; activity results are recorded, so replays are unchanged.
- Code changes go on a worktree branch of the code repository and land on `main` after the repository's gates: `go vet ./...`, `gofmt -l .`, gosec, `go test -race ./...`, the Postgres tests (`scripts/pg-test.sh go test ./internal/factoryd/ ./internal/gateway/ ./internal/policy/`). The repository's own `bash check` runs the same.
- House style: minimal comments, no change narration, one way only, no shim for an old format. Tests: hand-derived expectations; never edit an assertion to make it pass.
- Commits end with the `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` line the session is given. Delete the worktree after the push.
- Coordination: plan A edits `workflow.go`'s attempt loop and `sessionResult`'s findings; plan C edits `gates.go`. Task 9 touches `RunSession` just after `sessionResult` returns; rebase over A.

## Review Focus

Failure modes the spec implies that no single row's wording covers. Each has its test in the task named.

1. A card whose budget row is 0 (a report task, an old row): the warning and the spend detector must divide by nothing. Tasks 3 and 4.
2. The worker's message endpoint is not ready or the pod is gone when a warning is due: the warning must come again on the next tick, not be marked sent. Task 3.
3. A policy version pinned before the new keys (all four read as 0): defaults apply, the config carries no `limit.input`. Tasks 1 and 5.
4. `agent-worker wait` on a pid that never was a job, on a zombie the worker (init) has not reaped, and on a wait longer than the bash tool's 600 s: each answers truthfully and never blocks past 590 s. Task 6.
5. The planner's automatic second session must happen once: a second exhaustion fails with the old reason, and a run from before the version gate still fails at once. Task 7.

---

## File structure

| File | Responsibility |
|---|---|
| `internal/policy/policy.go` (modify) | `Limits.WarnAt`, `PlanWarnAt`, `NoPushSpend`, `ContextTokens`, defaults, accessors, validation, JSON |
| `internal/policy/schema.go` (modify) | minimums and maximums of the four keys |
| `internal/factoryd/facts.go` (create) | `SessionFacts` and its brief line |
| `internal/factoryd/limits.go` (create) | `limitWatch`: which warning is due, what it says |
| `internal/factoryd/sandbox.go` (create) | `SandboxFacts()`: tools, names, no browser |
| `internal/factoryd/supervise.go` (modify) | `TripSpendNoPush`, `Supervisor.Spent`, `Supervisor.Reads` |
| `internal/factoryd/runner.go` (modify) | facts into the pod env, the limit watch in the tick, config knobs, `planner` flag |
| `internal/factoryd/opencode.go` (modify) | brief sections (facts, sandbox), config (`limit.input`, `compaction`), wait sentence |
| `internal/factoryd/activities.go` (modify) | `pushed` on a budget refusal |
| `internal/factoryd/store.go` (modify) | `Store.BudgetRefused` |
| `internal/factoryd/plan.go`, `workflow.go`, `report.go` (modify) | planner second session, the reads finding |
| `internal/harness/types.go` (modify) | `TaskBrief.Facts` |
| `cmd/agent-worker/main.go` (modify), `wait.go` (create) | `FACTS`, `CONTEXT_TOKENS` env; `wait` subcommand |
| infra `factory/policy.yaml`, `factory/schema/policy.schema.json` | live values |
| docs `docs/architecture.md` | the new keys |

Setup, once:

```bash
cd ~/repos/ai-software-factory-code
git pull --rebase origin main
git worktree add ../worktrees/ladder-b -b ladder-b main
cd ../worktrees/ladder-b
```

All code paths below are relative to that worktree.

---

### Task 1: The four policy values

**Files:**
- Modify: `internal/policy/policy.go` (`Limits` at 260, `limitsJSON`/`MarshalJSON`/`UnmarshalJSON` at 336-370, `Limits.validate` at 392)
- Modify: `internal/policy/schema.go` (`minimums`, `maximums` at 42-45)
- Test: `internal/policy/policy_test.go`

**Interfaces:**
- Produces: `Limits.WarnShare() float64`, `Limits.PlanWarnShare() float64`, `Limits.NoPushShare() float64`, `Limits.ContextCap() int`; consts `DefaultWarnAt = 80`, `DefaultPlanWarnAt = 67`, `DefaultNoPushSpend = 60`, `DefaultContextTokens = 100000`, `MinContextTokens = 20000`, `ModelContext = 200000`.

- [ ] **Step 1: Write the failing test** (append to `policy_test.go`)

```go
func TestLimitsStopValues(t *testing.T) {
	d, err := Parse([]byte(valid))
	if err != nil {
		t.Fatal(err)
	}
	l := d.Limits
	if l.WarnShare() != 0.80 || l.PlanWarnShare() != 0.67 || l.NoPushShare() != 0.60 || l.ContextCap() != 100000 {
		t.Errorf("defaults = %v %v %v %d, want 0.8 0.67 0.6 100000", l.WarnShare(), l.PlanWarnShare(), l.NoPushShare(), l.ContextCap())
	}
	d, err = Parse([]byte(strings.Replace(valid, "stronger_after: 1}", "stronger_after: 1, warn_at: 75, plan_warn_at: 50, no_push_spend: 40, context_tokens: 90000}", 1)))
	if err != nil {
		t.Fatal(err)
	}
	l = d.Limits
	if l.WarnShare() != 0.75 || l.PlanWarnShare() != 0.50 || l.NoPushShare() != 0.40 || l.ContextCap() != 90000 {
		t.Errorf("set = %v %v %v %d, want 0.75 0.5 0.4 90000", l.WarnShare(), l.PlanWarnShare(), l.NoPushShare(), l.ContextCap())
	}
	b, err := json.Marshal(l)
	if err != nil {
		t.Fatal(err)
	}
	var back Limits
	if err := json.Unmarshal(b, &back); err != nil || back != l {
		t.Errorf("json round trip = (%+v, %v), want %+v", back, err, l)
	}
	var pinned Limits
	if err := json.Unmarshal([]byte(`{"sessions":3,"agent_time":"20m0s","supervisor_calls":3,"supervisor_timeout":"6m0s","stronger_after":1,"steps":200}`), &pinned); err != nil {
		t.Fatal(err)
	}
	if pinned.WarnShare() != 0.80 || pinned.ContextCap() != 100000 {
		t.Errorf("pinned version without the keys: %v, %d, want the defaults", pinned.WarnShare(), pinned.ContextCap())
	}
}

func TestLimitsStopValuesAreBounded(t *testing.T) {
	d, err := Parse([]byte(valid))
	if err != nil {
		t.Fatal(err)
	}
	for name, tc := range map[string]struct {
		mutate func(*Limits)
		want   string
	}{
		"warn_at 100":         {func(l *Limits) { l.WarnAt = 100 }, "limits.warn_at must lie between 1 and 99 percent, is 100"},
		"plan_warn_at -1":     {func(l *Limits) { l.PlanWarnAt = -1 }, "limits.plan_warn_at must lie between 1 and 99 percent, is -1"},
		"no_push_spend 100":   {func(l *Limits) { l.NoPushSpend = 100 }, "limits.no_push_spend must lie between 1 and 99 percent, is 100"},
		"context_tokens 1000": {func(l *Limits) { l.ContextTokens = 1000 }, "limits.context_tokens must be 0 or lie between 20000 and 200000, is 1000"},
		"context past window": {func(l *Limits) { l.ContextTokens = 200001 }, "limits.context_tokens must be 0 or lie between 20000 and 200000, is 200001"},
	} {
		l := d.Limits
		tc.mutate(&l)
		if err := l.validate(); err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: validate = %v, want %q", name, err, tc.want)
		}
	}
	for _, doc := range []string{"warn_at: 0", "context_tokens: 1000", "no_push_spend: 100"} {
		if _, err := Parse([]byte(strings.Replace(valid, "stronger_after: 1}", "stronger_after: 1, "+doc+"}", 1))); err == nil {
			t.Errorf("%s: parsed, want the schema's refusal", doc)
		}
	}
}
```

- [ ] **Step 2: Run, expect failure**

Run: `go test ./internal/policy/ -run 'TestLimitsStopValues' -v`
Expected: FAIL to compile, `l.WarnShare undefined`.

- [ ] **Step 3: Implement**

In `policy.go`, after the `SameCall` field of `Limits`:

```go
	// WarnAt is the percent of a card's budget, or of a session's agent
	// time, spent when factoryd tells the running agent to wrap up and
	// push, 1 to 99. Absent: DefaultWarnAt.
	WarnAt int `yaml:"warn_at,omitempty" json:"warn_at"`
	// PlanWarnAt is WarnAt for a planner session. Absent: DefaultPlanWarnAt.
	PlanWarnAt int `yaml:"plan_warn_at,omitempty" json:"plan_warn_at"`
	// NoPushSpend is the percent of a card's budget spent with nothing
	// pushed at which the session supervisor is called, 1 to 99. Absent:
	// DefaultNoPushSpend.
	NoPushSpend int `yaml:"no_push_spend,omitempty" json:"no_push_spend"`
	// ContextTokens is the context size at which opencode compacts a
	// session's conversation, MinContextTokens to ModelContext. Absent:
	// DefaultContextTokens.
	ContextTokens int `yaml:"context_tokens,omitempty" json:"context_tokens"`
```

After `SameCallAfter`:

```go
// The wrap-up warning, the spend-without-push line and the compaction
// threshold of a policy without the keys, and of a version pinned before
// they existed. ModelContext is the context window the factory declares
// for its models in opencode's config.
const (
	DefaultWarnAt        = 80
	DefaultPlanWarnAt    = 67
	DefaultNoPushSpend   = 60
	DefaultContextTokens = 100000
	MinContextTokens     = 20000
	ModelContext         = 200000
)

// WarnShare, PlanWarnShare and NoPushShare are the percents as shares of 1.
func (l Limits) WarnShare() float64     { return float64(cmp.Or(l.WarnAt, DefaultWarnAt)) / 100 }
func (l Limits) PlanWarnShare() float64 { return float64(cmp.Or(l.PlanWarnAt, DefaultPlanWarnAt)) / 100 }
func (l Limits) NoPushShare() float64   { return float64(cmp.Or(l.NoPushSpend, DefaultNoPushSpend)) / 100 }

// ContextCap is ContextTokens, or DefaultContextTokens when unset.
func (l Limits) ContextCap() int { return cmp.Or(l.ContextTokens, DefaultContextTokens) }
```

`limitsJSON` gains `WarnAt int \`json:"warn_at"\``, `PlanWarnAt int \`json:"plan_warn_at"\``, `NoPushSpend int \`json:"no_push_spend"\``, `ContextTokens int \`json:"context_tokens"\``; `MarshalJSON`'s literal ends `..., l.SameCall, l.WarnAt, l.PlanWarnAt, l.NoPushSpend, l.ContextTokens})`; `UnmarshalJSON`'s `out` literal gains `WarnAt: j.WarnAt, PlanWarnAt: j.PlanWarnAt, NoPushSpend: j.NoPushSpend, ContextTokens: j.ContextTokens`.

`validate()`'s switch gains, before the closing brace:

```go
	case l.WarnAt < 0 || l.WarnAt > 99:
		return fmt.Errorf("policy: limits.warn_at must lie between 1 and 99 percent, is %d", l.WarnAt)
	case l.PlanWarnAt < 0 || l.PlanWarnAt > 99:
		return fmt.Errorf("policy: limits.plan_warn_at must lie between 1 and 99 percent, is %d", l.PlanWarnAt)
	case l.NoPushSpend < 0 || l.NoPushSpend > 99:
		return fmt.Errorf("policy: limits.no_push_spend must lie between 1 and 99 percent, is %d", l.NoPushSpend)
	case l.ContextTokens != 0 && (l.ContextTokens < MinContextTokens || l.ContextTokens > ModelContext):
		return fmt.Errorf("policy: limits.context_tokens must be 0 or lie between %d and %d, is %d", MinContextTokens, ModelContext, l.ContextTokens)
```

In `schema.go`, extend the maps: `minimums` gets `"Limits.WarnAt": 1, "Limits.PlanWarnAt": 1, "Limits.NoPushSpend": 1, "Limits.ContextTokens": MinContextTokens`; `maximums` gets `"Limits.WarnAt": 99, "Limits.PlanWarnAt": 99, "Limits.NoPushSpend": 99, "Limits.ContextTokens": ModelContext`.

- [ ] **Step 4: Run, expect pass**

Run: `go test ./internal/policy/ -v -run 'TestLimitsStopValues|TestNudge'` then `go test -race ./internal/policy/`
Expected: PASS. If a schema test fails because the generated schema changed, the test names the file; the infra copy is regenerated in task 10, not here.

- [ ] **Step 5: Commit**

```bash
git add internal/policy
git commit -m "policy: limits warn_at, plan_warn_at, no_push_spend and context_tokens, with defaults"
```

---

### Task 2: The session's facts in the brief

**Files:**
- Create: `internal/factoryd/facts.go`, `internal/factoryd/facts_test.go`
- Modify: `internal/harness/types.go:14-54` (`TaskBrief`), `internal/factoryd/opencode.go:599` (`briefText`), `internal/factoryd/runner.go` (`sessionSpec` 390, `runSession` before `CreatePod` at ~521, `workerPodSpec` 1462), `cmd/agent-worker/main.go` (`workerEnv` 436, `loadEnv` 472, brief at 248)
- Test: `internal/factoryd/opencode_test.go`, `internal/factoryd/runner_test.go`, `cmd/agent-worker/main_test.go`

**Interfaces:**
- Produces: `factoryd.SessionFacts{BudgetEUR, SpentEUR float64; TimeLeft time.Duration; Attempt, Sessions int}` with `Line() string`; `harness.TaskBrief.Facts string`; `sessionSpec.facts string`; pod env `FACTS`.

- [ ] **Step 1: Write the failing tests**

`facts_test.go`:

```go
package factoryd

import (
	"testing"
	"time"
)

func TestSessionFactsLine(t *testing.T) {
	// 5.00 budget, 1.80 spent: 3.20 left; 71m30s is 71 whole minutes
	f := SessionFacts{BudgetEUR: 5, SpentEUR: 1.8, TimeLeft: 71*time.Minute + 30*time.Second, Attempt: 2, Sessions: 3}
	want := "factoryd's facts for this session: budget 3.20 of 5.00 EUR left; 71 minutes of agent time left; this is session 2 of the 3 the policy allows before a human is asked."
	if got := f.Line(); got != want {
		t.Fatalf("Line = %q, want %q", got, want)
	}
	f.Attempt = 3
	last := "factoryd's facts for this session: budget 3.20 of 5.00 EUR left; 71 minutes of agent time left; this is session 3 of the 3 the policy allows before a human is asked. It is the last one: push your work before it ends."
	if got := f.Line(); got != last {
		t.Fatalf("last session: %q, want %q", got, last)
	}
}

func TestSessionFactsWithoutAnAttemptNamesNoSession(t *testing.T) {
	f := SessionFacts{BudgetEUR: 2, SpentEUR: 2.5, TimeLeft: 90 * time.Second}
	want := "factoryd's facts for this session: budget 0.00 of 2.00 EUR left; 1 minutes of agent time left."
	if got := f.Line(); got != want {
		t.Fatalf("Line = %q, want %q", got, want)
	}
}
```

(The overspent card shows 0.00 left, not a negative figure.)

`opencode_test.go` (append):

```go
func TestBriefStatesTheSessionsFacts(t *testing.T) {
	got := briefText(harness.TaskBrief{Objective: "o", Facts: "FACTS LINE"}, "T")
	if !strings.Contains(got, "FACTS LINE\n") {
		t.Fatalf("brief lacks the facts line:\n%s", got)
	}
	if got := briefText(harness.TaskBrief{Objective: "o"}, "T"); strings.Contains(got, "factoryd's facts") {
		t.Fatal("a brief without facts must not mention them")
	}
}
```

`main_test.go` (append):

```go
func TestLoadEnvReadsTheFacts(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("FACTS", "factoryd's facts for this session: budget 3.20 of 5.00 EUR left")
	e, err := loadEnv()
	if err != nil || e.facts != "factoryd's facts for this session: budget 3.20 of 5.00 EUR left" {
		t.Fatalf("facts = %q, %v", e.facts, err)
	}
}
```

`runner_test.go` (append; same shape as `TestRunSessionPassesTheOpenTools`):

```go
func TestRunSessionStatesTheFactsInThePodEnv(t *testing.T) {
	task := Task{ID: "t1", Status: "running", Objective: "fix it", Repository: "sf/repo", SHA: "base", BudgetEUR: 5, SpentEUR: 1.8}
	kube := newFakeKube()
	runner, _, _ := newTestRunner(t, task, kube, &fakeObjectStore{})
	if _, err := runSession(t, nil, runner, SessionInput{TaskID: "t1", Attempt: 1, Model: "factory/coding-cheap"}, nil,
		pushedLine("c0ffee")+"\n"+resultLine(true, "done")); err != nil {
		t.Fatal(err)
	}
	got := podEnv(kube.podAt(0))["FACTS"]
	if !regexp.MustCompile(`^factoryd's facts for this session: budget 3\.20 of 5\.00 EUR left; \d+ minutes of agent time left; this is session 1 of the \d+ `).MatchString(got) {
		t.Fatalf("FACTS = %q", got)
	}
}
```

(`runner_test.go` imports `regexp` if it does not.)

- [ ] **Step 2: Run, expect failure**

Run: `go test ./internal/factoryd/ ./cmd/agent-worker/ -run 'SessionFacts|StatesTheSessionsFacts|StatesTheFacts|ReadsTheFacts' -v`
Expected: FAIL to compile (`SessionFacts`, `Facts`, `e.facts` undefined).

- [ ] **Step 3: Implement**

`facts.go`:

```go
package factoryd

import (
	"fmt"
	"time"
)

// SessionFacts are the numbers a session starts with: factoryd states them
// in the brief, so no agent is asked for them (roadmap 199). A zero Attempt
// (a report or plan session) names no session.
type SessionFacts struct {
	BudgetEUR, SpentEUR float64
	TimeLeft            time.Duration
	Attempt, Sessions   int
}

func (f SessionFacts) Line() string {
	line := fmt.Sprintf("factoryd's facts for this session: budget %.2f of %.2f EUR left; %d minutes of agent time left",
		max(f.BudgetEUR-f.SpentEUR, 0), f.BudgetEUR, int(f.TimeLeft/time.Minute))
	if f.Attempt == 0 {
		return line + "."
	}
	line += fmt.Sprintf("; this is session %d of the %d the policy allows before a human is asked.", f.Attempt, f.Sessions)
	if f.Attempt >= f.Sessions {
		line += " It is the last one: push your work before it ends."
	}
	return line
}
```

`harness/types.go`, in `TaskBrief` after `LeftOut`:

```go
	// Facts is factoryd's line of the session's budget, time and attempt;
	// "" for a brief without one.
	Facts string `json:"facts,omitempty"`
```

`opencode.go` `briefText`, directly after the `Repository:` block (the `if brief.Repository != "" {...}` ends with `b.WriteString("\n")`):

```go
	if brief.Facts != "" {
		b.WriteString(brief.Facts + "\n")
	}
```

`runner.go`: `sessionSpec` gains `facts string` (comment: `// facts is factoryd's FACTS line for the brief`). In `runSession`'s `else` branch, before `r.kube.CreatePod`:

```go
		s.facts = SessionFacts{BudgetEUR: t.BudgetEUR, SpentEUR: t.SpentEUR, TimeLeft: time.Until(deadline),
			Attempt: s.attempt, Sessions: s.policy.Limits.Sessions}.Line()
```

`workerPodSpec`, with the other conditional envs (after `PARENT_SESSION_ID`):

```go
	if s.facts != "" {
		env = append(env, map[string]any{"name": "FACTS", "value": s.facts})
	}
```

`cmd/agent-worker/main.go`: `workerEnv` gains `facts string // FACTS: factoryd's line for the brief`; `loadEnv` gets `e.facts = str("FACTS")` after the `e.docsDir` line; the brief literal at 248 gains `Facts: s.env.facts,`.

- [ ] **Step 4: Run, expect pass**

Run: `go test -race ./internal/factoryd/ ./cmd/agent-worker/ ./internal/harness/`
Expected: PASS (existing brief tests that compare whole briefs may need `Facts` left empty, which they are).

- [ ] **Step 5: Commit**

```bash
git add internal/harness internal/factoryd cmd/agent-worker
git commit -m "brief: budget left, time left and the attempt stand in the session's brief"
```

---

### Task 3: The wrap-up warning near a limit, the planner's included

**Files:**
- Create: `internal/factoryd/limits.go`, `internal/factoryd/limits_test.go`
- Modify: `internal/factoryd/runner.go` (`sessionSpec.planner`, `runSession` tick at 808-830), `internal/factoryd/report.go:140` (`reportSession`), `internal/factoryd/plan.go:1455`, `internal/factoryd/split.go:163`, `internal/factoryd/report.go:71`
- Test: `internal/factoryd/runner_test.go`

**Interfaces:**
- Consumes: `policy.Limits.WarnShare()`, `PlanWarnShare()` (task 1); `Runner.message(ctx, t, s, ns, pod, text) error` (`message.go:160`); `store.Task(ctx, id) (Task, bool, error)`.
- Produces: `limitWatch`, `newLimitWatch(l policy.Limits, planner bool, started time.Time, span time.Duration) *limitWatch`, `(*limitWatch).due(spent, budget float64, now time.Time) []warning`, `(*limitWatch).sent(kind string)`; `warning{kind, text string}`; `reportSession(..., planner bool, ...)`.

- [ ] **Step 1: Write the failing tests**

`limits_test.go`:

```go
package factoryd

import (
	"slices"
	"testing"
	"time"

	"github.com/sebastianrueckerai/ai-software-factory-code/internal/policy"
)

func TestLimitWatchWarnsOnBudgetOnce(t *testing.T) {
	w := newLimitWatch(policy.Limits{}, false, time.Unix(0, 0), 2*time.Hour)
	if got := w.due(3.9, 5, time.Unix(0, 0)); len(got) != 0 {
		t.Fatalf("78 percent warned: %v", got)
	}
	// 4.5 of 5 is 90 percent, 0.50 left
	got := w.due(4.5, 5, time.Unix(0, 0))
	want := "factoryd: 90 percent of this card's budget is spent, 0.50 of 5.00 EUR are left. " + codingWrapUp
	if len(got) != 1 || got[0].kind != warnBudget || got[0].text != want {
		t.Fatalf("due = %+v, want one budget warning %q", got, want)
	}
	w.sent(warnBudget)
	if got := w.due(4.9, 5, time.Unix(0, 0)); len(got) != 0 {
		t.Fatalf("warned again after sent: %v", got)
	}
}

// A warning that did not reach the agent comes again.
func TestLimitWatchKeepsAWarningUntilItIsSent(t *testing.T) {
	w := newLimitWatch(policy.Limits{}, false, time.Unix(0, 0), 2*time.Hour)
	if len(w.due(4.5, 5, time.Unix(0, 0))) != 1 || len(w.due(4.5, 5, time.Unix(1, 0))) != 1 {
		t.Fatal("an unsent warning must stay due")
	}
}

func TestLimitWatchWarnsOnTimeAtTheCodingShare(t *testing.T) {
	// 2h span, 80 percent: 96 minutes in; 24 minutes left
	w := newLimitWatch(policy.Limits{}, false, time.Unix(0, 0), 2*time.Hour)
	if got := w.due(0, 5, time.Unix(0, 0).Add(95*time.Minute)); len(got) != 0 {
		t.Fatalf("95 of 120 minutes warned: %v", got)
	}
	got := w.due(0, 5, time.Unix(0, 0).Add(97*time.Minute))
	if len(got) != 1 || got[0].kind != warnTime || got[0].text != "factoryd: 23 minutes of agent time are left. "+codingWrapUp {
		t.Fatalf("due = %+v", got)
	}
}

// The planner is warned at two thirds of its time and told to file.
func TestLimitWatchWarnsAPlannerAtTwoThirds(t *testing.T) {
	// 30m span, 67 percent: 20.1 minutes in
	w := newLimitWatch(policy.Limits{}, true, time.Unix(0, 0), 30*time.Minute)
	if got := w.due(0, 5, time.Unix(0, 0).Add(20*time.Minute)); len(got) != 0 {
		t.Fatalf("20 of 30 minutes warned: %v", got)
	}
	got := w.due(0, 5, time.Unix(0, 0).Add(21*time.Minute))
	if len(got) != 1 || got[0].text != "factoryd: 9 minutes of agent time are left. "+planWrapUp {
		t.Fatalf("due = %+v", got)
	}
}

func TestLimitWatchSkipsWhatHasNoBudgetOrSpan(t *testing.T) {
	w := newLimitWatch(policy.Limits{}, false, time.Unix(0, 0), 0)
	if got := w.due(1, 0, time.Unix(0, 0).Add(time.Hour)); !slices.Equal(got, nil) {
		t.Fatalf("a zero budget and a zero span warned: %v", got)
	}
}
```

`runner_test.go` (append; modelled on `TestRunSessionClimbsInPlace`):

```go
// Near the budget the running agent is told to wrap up and push: the warning
// reaches the worker's message endpoint once.
func TestRunSessionWarnsNearTheBudget(t *testing.T) {
	kube := newFakeKube()
	runner, _, store := newTestRunner(t, supervisedTask("t2"), kube, &fakeObjectStore{})
	tk := store.tasks["t2"]
	tk.BudgetEUR, tk.SpentEUR = 5, 4.5
	store.tasks["t2"] = tk
	v := runner.cfg.Policy()
	v.Document.Limits.NoPushSpend = 99 // the spend detector is task 4's
	runner.cfg.Policy = func() policy.Version { return v }
	runner.cfg.Supervisor.NoProgressAfter = 3 * time.Second // the tick every second
	worker := &fakeWorkerEndpoint{status: http.StatusNoContent}
	worker.start(t, runner)
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		deadline := time.Now().Add(5 * time.Second)
		for time.Now().Before(deadline) {
			worker.mu.Lock()
			n := len(worker.texts)
			worker.mu.Unlock()
			if n > 0 {
				time.Sleep(2500 * time.Millisecond) // two more ticks: no second warning
				break
			}
			time.Sleep(10 * time.Millisecond)
		}
		cancel()
	}()
	runSession(t, ctx, runner, SessionInput{TaskID: "t2", Attempt: 1, Model: "factory/coding-frontier"}, nil, hangLogs)
	worker.mu.Lock()
	texts := slices.Clone(worker.texts)
	worker.mu.Unlock()
	if len(texts) != 1 || !strings.HasPrefix(texts[0], "POST /message factoryd: 90 percent of this card's budget is spent, 0.50 of 5.00 EUR are left.") {
		t.Fatalf("worker got %q, want one budget warning", texts)
	}
}
```

- [ ] **Step 2: Run, expect failure**

Run: `go test ./internal/factoryd/ -run 'LimitWatch|WarnsNearTheBudget' -v`
Expected: FAIL to compile (`newLimitWatch` undefined).

- [ ] **Step 3: Implement**

`limits.go`:

```go
package factoryd

import (
	"fmt"
	"time"

	"github.com/sebastianrueckerai/ai-software-factory-code/internal/policy"
)

// The kinds of warning a session gets, once each.
const (
	warnBudget = "budget"
	warnTime   = "time"
)

const (
	codingWrapUp = "Finish what runs, run bash check if it is quick, and end the session with your last message, so the factory pushes your work."
	planWrapUp   = "File the plan now with the file_plan tool, with what you have read: a plan filed late is better than none."
)

type warning struct{ kind, text string }

// limitWatch decides which wrap-up warning a running session is due: its
// card's budget spent, or its agent time used, past the policy's share.
// A warning stays due until sent says it reached the agent.
type limitWatch struct {
	share   float64
	wrapUp  string
	started time.Time
	span    time.Duration
	done    map[string]bool
}

func newLimitWatch(l policy.Limits, planner bool, started time.Time, span time.Duration) *limitWatch {
	w := &limitWatch{share: l.WarnShare(), wrapUp: codingWrapUp, started: started, span: span, done: map[string]bool{}}
	if planner {
		w.share, w.wrapUp = l.PlanWarnShare(), planWrapUp
	}
	return w
}

func (w *limitWatch) due(spent, budget float64, now time.Time) []warning {
	var out []warning
	if !w.done[warnBudget] && budget > 0 && spent >= w.share*budget {
		out = append(out, warning{warnBudget, fmt.Sprintf("factoryd: %.0f percent of this card's budget is spent, %.2f of %.2f EUR are left. %s",
			100*spent/budget, max(budget-spent, 0), budget, w.wrapUp)})
	}
	if elapsed := now.Sub(w.started); !w.done[warnTime] && w.span > 0 && float64(elapsed) >= w.share*float64(w.span) {
		out = append(out, warning{warnTime, fmt.Sprintf("factoryd: %d minutes of agent time are left. %s", int((w.span-elapsed)/time.Minute), w.wrapUp)})
	}
	return out
}

func (w *limitWatch) sent(kind string) { w.done[kind] = true }
```

`runner.go`:
- `sessionSpec` gains `planner bool // a plan card's session: its warning says file the plan`.
- In `runSession`, after `sup` is created:

```go
	watch := newLimitWatch(s.policy.Limits, s.planner, time.Now(), time.Until(deadline))
```

- Replace the tick case:

```go
		case <-tick.C:
			trip := sup.Tick(time.Now())
			if trip == nil {
				trip = r.watchLimits(ctx, t, s, ns, podName, sup, watch)
			}
			if trip != nil {
				if end, err := onTrip(trip); end {
					return out, err
				}
			}
```

- New method (task 4 fills the last line):

```go
// watchLimits reads the card's spend once per tick and sends the agent
// the warning it is due; a warning the pod did not take stays due.
func (r *Runner) watchLimits(ctx context.Context, t Task, s sessionSpec, ns, pod string, sup *Supervisor, w *limitWatch) *Trip {
	cur, ok, err := r.store.Task(ctx, t.ID)
	if err != nil || !ok {
		log.Printf("task %s: read the card's spend: %v", t.ID, err)
		return nil
	}
	for _, wn := range w.due(cur.SpentEUR, cur.BudgetEUR, time.Now()) {
		if err := r.message(ctx, t, s, ns, pod, wn.text); err != nil {
			log.Printf("task %s: send the %s warning: %v", t.ID, wn.kind, err)
			continue
		}
		w.sent(wn.kind)
	}
	return nil
}
```

- `reportSession` gets a `planner bool` parameter after `standing string`: signature `reportSession(ctx, t, repo, model, standing string, planner bool, pin int64, guide string, findings, answers []string)`; `s := sessionSpec{..., planner: planner}`. Callers: `plan.go:1455` passes `true`; `report.go:71` and `split.go:163` pass `false`.

- [ ] **Step 4: Run, expect pass**

Run: `go test -race ./internal/factoryd/ -run 'LimitWatch|WarnsNearTheBudget|Report|Split|Plan' -v` then `go test -race ./internal/factoryd/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd
git commit -m "runner: a session near its budget or time is told to wrap up and push; the planner to file the plan"
```

---

### Task 4: The spend-without-push detector

**Files:**
- Modify: `internal/factoryd/supervise.go` (consts at 21-35, `SupervisorConfig` 66, `validate` 86, `Supervisor` struct 108, `stuck` 372), `internal/factoryd/runner.go` (`supervisorConfig` 903, `runSession` 559, `watchLimits`)
- Test: `internal/factoryd/supervise_test.go`, `internal/factoryd/runner_test.go`

**Interfaces:**
- Consumes: `Limits.NoPushShare()` (task 1); `watchLimits` (task 3).
- Produces: `TripSpendNoPush TripKind = "spend_no_push"`; `SupervisorConfig.NoPushSpend float64` (share of 1, 0 off) and `PriorPush bool`; `(*Supervisor).Spent(spent, budget float64) *Trip`.

- [ ] **Step 1: Write the failing tests**

`supervise_test.go` (append):

```go
func spendSupervisor(t *testing.T, mutate func(*SupervisorConfig)) *Supervisor {
	t.Helper()
	cfg := SupervisorConfig{NoProgressAfter: 5 * time.Minute, WallClockCap: time.Hour, RepetitionEvents: 100, MaxCalls: 3,
		NoWriteAfter: 100 * time.Hour, NoPushSpend: 0.6}
	if mutate != nil {
		mutate(&cfg)
	}
	s, err := NewSupervisor(cfg, time.Unix(0, 0), time.Unix(0, 0))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

// 60 percent of 5 EUR is 3.00: 2.90 is under the line, 3.10 over it.
func TestSpendWithoutPushTripsOncePastTheShare(t *testing.T) {
	s := spendSupervisor(t, nil)
	if trip := s.Spent(2.9, 5); trip != nil {
		t.Fatalf("tripped at 58 percent: %+v", trip)
	}
	trip := s.Spent(3.1, 5)
	if trip == nil || trip.Kind != TripSpendNoPush || trip.Detail != "3.10 of the card's 5.00 EUR are spent (62 percent, the line is 60) and no work is pushed" {
		t.Fatalf("trip = %+v", trip)
	}
	s.Resume(time.Unix(10, 0))
	if again := s.Spent(4.9, 5); again != nil {
		t.Fatalf("tripped twice in a session: %+v", again)
	}
}

func TestSpendWithoutPushIsOffWhereItDoesNotApply(t *testing.T) {
	for name, mutate := range map[string]func(*SupervisorConfig){
		"unset":            func(c *SupervisorConfig) { c.NoPushSpend = 0 },
		"a report session": func(c *SupervisorConfig) { c.ReadOnly = true },
		"work pushed":      func(c *SupervisorConfig) { c.PriorPush = true },
	} {
		if trip := spendSupervisor(t, mutate).Spent(4.9, 5); trip != nil {
			t.Errorf("%s: tripped: %+v", name, trip)
		}
	}
	if trip := spendSupervisor(t, nil).Spent(1, 0); trip != nil {
		t.Errorf("a zero budget tripped: %+v", trip)
	}
	s := spendSupervisor(t, nil)
	s.Event(harness.Event{Kind: harness.EventPushed}, time.Unix(1, 0))
	if trip := s.Spent(4.9, 5); trip != nil {
		t.Errorf("a pushed session tripped: %+v", trip)
	}
}

// A spend trip after the supervisor's message is no evidence of being stuck.
func TestSpendTripAfterAMessageIsNotTheStuckRule(t *testing.T) {
	s := spendSupervisor(t, nil)
	s.Messaged(time.Unix(1, 0))
	trip := s.Spent(3.5, 5)
	if trip == nil || trip.decided != nil {
		t.Fatalf("trip = %+v, want the supervisor asked, not the stuck climb", trip)
	}
}

func TestSpendNoPushShareMustBeBelowOne(t *testing.T) {
	cfg := SupervisorConfig{NoProgressAfter: time.Minute, WallClockCap: time.Hour, RepetitionEvents: 10, MaxCalls: 3, NoPushSpend: 1}
	if _, err := NewSupervisor(cfg, time.Unix(0, 0), time.Unix(0, 0)); err == nil {
		t.Fatal("a share of 1 accepted")
	}
}
```

`runner_test.go` (append):

```go
// A card past its budget share with nothing pushed asks the supervisor.
func TestRunSessionSpendWithoutPushAsksTheSupervisor(t *testing.T) {
	kube := newFakeKube()
	runner, hub, store := newTestRunner(t, supervisedTask("t2"), kube, &fakeObjectStore{})
	tk := store.tasks["t2"]
	tk.BudgetEUR, tk.SpentEUR = 5, 3.5 // 70 percent, past the default 60
	store.tasks["t2"] = tk
	f := &fakeLiteLLM{content: `{"action":"continue","reason":"it is making progress"}`}
	runner.supervisor = testSupervisorModel(f.srv(t).URL)
	runner.cfg.Supervisor.NoProgressAfter = 3 * time.Second
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		deadline := time.Now().Add(6 * time.Second)
		for time.Now().Before(deadline) {
			hub.mu.Lock()
			found := slices.ContainsFunc(hub.comments, func(c string) bool { return strings.Contains(c, "spend_no_push") })
			hub.mu.Unlock()
			if found {
				break
			}
			time.Sleep(10 * time.Millisecond)
		}
		cancel()
	}()
	runSession(t, ctx, runner, SessionInput{TaskID: "t2", Attempt: 1, Model: "factory/coding-frontier"}, nil, hangLogs)
	hub.mu.Lock()
	defer hub.mu.Unlock()
	if !slices.ContainsFunc(hub.comments, func(c string) bool { return strings.Contains(c, "spend_no_push") && strings.Contains(c, "**continue**") }) {
		t.Fatalf("comments = %q, want the supervisor's continue on spend_no_push", hub.comments)
	}
}
```

- [ ] **Step 2: Run, expect failure**

Run: `go test ./internal/factoryd/ -run 'SpendWithoutPush|SpendTrip|SpendNoPush' -v`
Expected: FAIL to compile (`TripSpendNoPush`, `Spent`, `NoPushSpend` undefined).

- [ ] **Step 3: Implement**

`supervise.go`:
- Const block (beside `TripCheapCap`): `// TripSpendNoPush: the card spent its policy share of the budget and nothing is pushed` `TripSpendNoPush TripKind = "spend_no_push"`.
- `SupervisorConfig` gains:

```go
	// NoPushSpend is the share of the card's budget (0 to under 1) whose
	// spend with nothing pushed trips the supervisor; 0 = off. PriorPush:
	// an earlier session of the card already pushed work.
	NoPushSpend float64
	PriorPush   bool
```
- `validate()` gains, before `return nil`:

```go
	if c.NoPushSpend < 0 || c.NoPushSpend >= 1 {
		return fmt.Errorf("supervisor: NoPushSpend must be a share from 0 up to under 1, is %v", c.NoPushSpend)
	}
```
- `Supervisor` struct gains `spendTripped bool`.
- New method after `cheapCap`:

```go
// Spent trips once per session when the card has spent its share of the
// budget with nothing pushed (roadmap 199): a session that reads and
// edits for hours without a push is what the budget pays for. A report
// session pushes nothing and is warned instead.
func (s *Supervisor) Spent(spent, budget float64) *Trip {
	if s.tripped != nil || s.spendTripped || s.cfg.NoPushSpend <= 0 || s.cfg.ReadOnly || s.cfg.PriorPush || s.pushed ||
		budget <= 0 || spent < s.cfg.NoPushSpend*budget {
		return nil
	}
	s.spendTripped = true
	return s.trip(&Trip{Kind: TripSpendNoPush, Detail: fmt.Sprintf("%.2f of the card's %.2f EUR are spent (%.0f percent, the line is %.0f) and no work is pushed",
		spent, budget, 100*spent/budget, 100*s.cfg.NoPushSpend)})
}
```
- `stuck`: `case TripCheckIn, TripWallClock, TripNoProgress, TripSpendNoPush: return false`.

`runner.go`:
- `supervisorConfig`: add `c.NoPushSpend = d.Limits.NoPushShare()`.
- In `runSession` where `supCfg.ReadOnly = s.report != ""` is set: `supCfg.PriorPush = s.startRef != s.base`.
- `watchLimits`' last line becomes `return sup.Spent(cur.SpentEUR, cur.BudgetEUR)`.

- [ ] **Step 4: Run, expect pass**

Run: `go test -race ./internal/factoryd/ -run 'Spend|Supervisor|LimitWatch|RunSession' -v` then `go test -race ./internal/factoryd/`
Expected: PASS. The 62 percent in the detail is `100*3.1/5 = 62`, printed with `%.0f`; the line 60 is `100*0.6`.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd
git commit -m "supervise: a card past its budget share with nothing pushed trips the supervisor"
```

---

### Task 5: The context-size detector is opencode's compaction at the policy threshold

**Files:**
- Modify: `internal/factoryd/opencode.go` (`Opencode` struct 56, `Run` config call ~170, `buildOpencodeConfig` 768), `internal/factoryd/runner.go` (`workerPodSpec`), `cmd/agent-worker/main.go` (`workerEnv`, `loadEnv`, `Opencode` literal at 268)
- Test: `internal/factoryd/opencode_test.go`, `cmd/agent-worker/main_test.go`, `internal/factoryd/runner_test.go`; five existing call sites of `buildOpencodeConfig` (`opencode_test.go:240, 283, 299, 1004`, `opencode_record_test.go:153`)

**Interfaces:**
- Consumes: `Limits.ContextCap()`, `policy.ModelContext` (task 1).
- Produces: `buildOpencodeConfig(proxyURL, provider, modelID string, outputLimit, steps, contextTokens int, subagent string, more ...string)`; `Opencode.ContextTokens int`; pod env `CONTEXT_TOKENS`.

- [ ] **Step 1: Write the failing tests**

`opencode_test.go` (append):

```go
// opencode compacts when the last step's token total reaches
// limit.input - compaction.reserved (overflow.ts, v1.18.32): with reserved 0,
// the threshold is limit.input.
func TestOpencodeConfigCompactsAtTheContextCap(t *testing.T) {
	raw, err := buildOpencodeConfig("http://127.0.0.1:45678", "factory", "coding-cheap", 10000, 40, 100000, "")
	if err != nil {
		t.Fatal(err)
	}
	var cfg struct {
		Compaction map[string]any `json:"compaction"`
		Provider   map[string]struct {
			Models map[string]struct {
				Limit map[string]float64 `json:"limit"`
			} `json:"models"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(raw, &cfg); err != nil {
		t.Fatal(err)
	}
	limit := cfg.Provider["factory"].Models["coding-cheap"].Limit
	if limit["input"] != 100000 || limit["context"] != 200000 || limit["output"] != 10000 {
		t.Fatalf("limit = %v, want input 100000 inside context 200000", limit)
	}
	if cfg.Compaction["auto"] != true || cfg.Compaction["reserved"] != float64(0) {
		t.Fatalf("compaction = %v, want auto with reserved 0", cfg.Compaction)
	}
}

// A version pinned before context_tokens leaves opencode's own threshold.
func TestOpencodeConfigWithoutAContextCapLeavesOpencodesDefault(t *testing.T) {
	raw, err := buildOpencodeConfig("http://127.0.0.1:45678", "factory", "coding-cheap", 10000, 40, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), `"compaction"`) || strings.Contains(string(raw), `"input"`) {
		t.Fatalf("config = %s, want no compaction block and no limit.input", raw)
	}
}
```

`main_test.go` (append):

```go
func TestLoadEnvReadsTheContextCap(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("CONTEXT_TOKENS", "100000")
	e, err := loadEnv()
	if err != nil || e.contextTokens != 100000 {
		t.Fatalf("contextTokens = %d, %v", e.contextTokens, err)
	}
	t.Setenv("CONTEXT_TOKENS", "lots")
	if _, err := loadEnv(); err == nil {
		t.Fatal("a malformed CONTEXT_TOKENS was accepted")
	}
}
```

`runner_test.go` (append, in the style of `TestRunSessionPassesTheOpenTools`):

```go
func TestRunSessionPassesTheContextCap(t *testing.T) {
	task := Task{ID: "t1", Status: "running", Objective: "fix it", Repository: "sf/repo", SHA: "base"}
	kube := newFakeKube()
	runner, _, _ := newTestRunner(t, task, kube, &fakeObjectStore{})
	if _, err := runSession(t, nil, runner, SessionInput{TaskID: "t1", Attempt: 1, Model: "factory/coding-cheap"}, nil,
		pushedLine("c0ffee")+"\n"+resultLine(true, "done")); err != nil {
		t.Fatal(err)
	}
	if got := podEnv(kube.podAt(0))["CONTEXT_TOKENS"]; got != "100000" {
		t.Fatalf("CONTEXT_TOKENS = %q, want the default 100000", got)
	}
}
```

- [ ] **Step 2: Run, expect failure**

Run: `go test ./internal/factoryd/ ./cmd/agent-worker/ -run 'ContextCap|CompactsAt' -v`
Expected: FAIL to compile (too many arguments to `buildOpencodeConfig`).

- [ ] **Step 3: Implement**

`opencode.go`:
- `Opencode` gains `ContextTokens int // compaction threshold, policy limits.context_tokens; 0 = opencode's own` after `Steps`.
- `buildOpencodeConfig` signature `(proxyURL, provider, modelID string, outputLimit, steps, contextTokens int, subagent string, more ...string)`. Replace the model block's `limit`:

```go
		limit := map[string]any{"context": policy.ModelContext, "output": outputLimit}
		if contextTokens > 0 {
			limit["input"] = contextTokens
		}
		models[id] = map[string]any{
			"name":        "Factory model",
			"reasoning":   true,
			"interleaved": map[string]any{"field": "reasoning_content"},
			"limit":       limit,
		}
```

and before `return json.Marshal(cfg)`:

```go
	if contextTokens > 0 {
		cfg["compaction"] = map[string]any{"auto": true, "reserved": 0}
	}
```

Add a sentence to the function's doc comment: `// contextTokens, when positive, is the size at which opencode compacts: limit.input with compaction.reserved 0 makes it the overflow line (overflow.ts at v1.18.32).`
- In `Run`: `buildOpencodeConfig("http://"+ln.Addr().String(), provider, modelID, outputLimit, o.Steps, o.ContextTokens, subagent, more...)`.
- The five test call sites gain `0` after the step argument:

```bash
sed -i -E 's/(buildOpencodeConfig\([^)]*, (40|recordSteps|steps)), "/\1, 0, "/' internal/factoryd/opencode_test.go internal/factoryd/opencode_record_test.go
go vet ./internal/factoryd/
```

`runner.go` `workerPodSpec` env list: `{"name": "CONTEXT_TOKENS", "value": strconv.Itoa(s.policy.Limits.ContextCap())},` after `STEPS`.

`cmd/agent-worker/main.go`: `workerEnv` gains `contextTokens int`; `loadEnv`, after the `STEPS` block:

```go
	if raw := str("CONTEXT_TOKENS"); raw != "" {
		if e.contextTokens, err = strconv.Atoi(raw); err != nil || e.contextTokens < 0 {
			return e, fmt.Errorf("CONTEXT_TOKENS must be a token count, is %q", raw)
		}
	}
```

and the `factoryd.Opencode` literal gains `ContextTokens: s.env.contextTokens,`.

- [ ] **Step 4: Run, expect pass**

Run: `go vet ./... && go test -race ./internal/factoryd/ ./cmd/agent-worker/`
Expected: PASS.

- [ ] **Step 5: The live check (after the roll; NOT verified by this plan)**

On the first card after the roll, read the gateway ledger for the session: the call after the first whose prompt tokens passed `context_tokens` should carry a summary instruction (opencode's compaction prompt) and the following calls' prompt tokens should drop to the summary plus the preserved recent turns (2,000 to 15,000 tokens). If no compaction appears, the fallback is the `POST /session/{id}/summarize` call from the worker, which needs its own plan because of the join-the-running-loop behaviour above.

- [ ] **Step 6: Commit**

```bash
git add internal/factoryd cmd/agent-worker
git commit -m "opencode: compaction at the policy's context_tokens, set in the generated config"
```

---

### Task 6: The blocking wait for a background job

**Files:**
- Create: `cmd/agent-worker/wait.go`, `cmd/agent-worker/wait_test.go`
- Modify: `cmd/agent-worker/main.go:40` (`main`), `internal/factoryd/opencode.go:726` (`guideEnd`)
- Test: `internal/factoryd/opencode_test.go`

**Why here.** The gateway's MCP tools run in the gateway and cannot see the sandbox's processes. `opencode-plugin/` holds only the pinned `@opencode-ai/plugin` dependency for the image bake; a custom opencode tool would be new TypeScript run by the harness and unverifiable without the binary. `agent-worker` is already in the image at `/usr/local/bin` (`Dockerfile.sandbox`), is Go, and a bash tool call that runs it is not a model call: the conversation is resent once after the wait, not once per `sleep 120` poll. The worker is the container's init, so an orphaned job reparents to it and stays a zombie until `killOthers`; the wait therefore reads `/proc/<pid>/stat` and counts state `Z` as ended.

**Interfaces:**
- Produces: `agent-worker wait <pid> [seconds]`: exit 0 and `pid N ended after D` when the process is gone or a zombie; exit 124 and `pid N still running after D` at the limit (default 540 s, at most 590 s so a bash timeout of 600000 ms outlasts it); exit 2 on a usage error or pid 1 or less; immediate exit 0 and `pid N is not running` when the pid never existed or ended before the call.

- [ ] **Step 1: Write the failing tests**

`wait_test.go`:

```go
package main

import (
	"bytes"
	"os/exec"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestWaitReturnsWhenTheJobEnds(t *testing.T) {
	cmd := exec.Command("sleep", "0.4")
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	go cmd.Wait()
	var out bytes.Buffer
	pid := strconv.Itoa(cmd.Process.Pid)
	start := time.Now()
	if code := runWait([]string{pid, "10"}, &out, 20*time.Millisecond); code != 0 {
		t.Fatalf("exit %d, output %q", code, out.String())
	}
	if !strings.HasPrefix(out.String(), "pid "+pid+" ended after ") || time.Since(start) > 5*time.Second {
		t.Fatalf("output %q after %s", out.String(), time.Since(start))
	}
}

func TestWaitTimesOutOnARunningJob(t *testing.T) {
	cmd := exec.Command("sleep", "30")
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() { cmd.Process.Kill(); cmd.Wait() }()
	var out bytes.Buffer
	pid := strconv.Itoa(cmd.Process.Pid)
	if code := runWait([]string{pid, "1"}, &out, 20*time.Millisecond); code != 124 || out.String() != "pid "+pid+" still running after 1s\n" {
		t.Fatalf("exit %d, output %q", code, out.String())
	}
}

// The worker is init: an orphaned job stays a zombie until killOthers.
func TestWaitCountsAZombieAsEnded(t *testing.T) {
	cmd := exec.Command("true")
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer cmd.Wait()
	var out bytes.Buffer
	start := time.Now()
	if code := runWait([]string{strconv.Itoa(cmd.Process.Pid), "10"}, &out, 20*time.Millisecond); code != 0 || time.Since(start) > 5*time.Second {
		t.Fatalf("exit %d after %s, output %q", code, time.Since(start), out.String())
	}
}

func TestWaitSaysWhenThePidIsNoJob(t *testing.T) {
	var out bytes.Buffer
	if code := runWait([]string{"2147483646", "5"}, &out, 20*time.Millisecond); code != 0 || out.String() != "pid 2147483646 is not running (it ended, or it never was a job)\n" {
		t.Fatalf("exit %d, output %q", code, out.String())
	}
}

func TestWaitRefusesBadArguments(t *testing.T) {
	for _, args := range [][]string{nil, {"abc"}, {"1"}, {"0"}, {"7", "0"}, {"7", "x"}, {"7", "5", "6"}} {
		var out bytes.Buffer
		if code := runWait(args, &out, time.Millisecond); code != 2 || !strings.Contains(out.String(), "wait") {
			t.Errorf("%v: exit %d, output %q, want exit 2 and a message", args, code, out.String())
		}
	}
}
```

`opencode_test.go` (append):

```go
func TestWorkGuideNamesTheBlockingWait(t *testing.T) {
	got := briefText(harness.TaskBrief{Objective: "o"}, "T")
	if !strings.Contains(got, "agent-worker wait <pid> [seconds up to 590]") || !strings.Contains(got, "timeout of 600000 ms") {
		t.Fatalf("brief lacks the wait: %s", got)
	}
}
```

- [ ] **Step 2: Run, expect failure**

Run: `go test ./cmd/agent-worker/ ./internal/factoryd/ -run 'Wait' -v`
Expected: FAIL to compile (`runWait` undefined).

- [ ] **Step 3: Implement**

`wait.go`:

```go
package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

const (
	waitDefault  = 540 * time.Second
	waitMax      = 590 * time.Second
	waitTimedOut = 124
)

// runWait is `agent-worker wait <pid> [seconds]`: the agent starts a long
// command in the background and waits for it here in one bash call, where a
// sleep loop would cost a model call per poll.
func runWait(args []string, out io.Writer, poll time.Duration) int {
	usage := func(why string) int {
		fmt.Fprintf(out, "wait: %s; usage: agent-worker wait <pid> [seconds]\n", why)
		return 2
	}
	if len(args) < 1 || len(args) > 2 {
		return usage("one pid and an optional number of seconds")
	}
	pid, err := strconv.Atoi(args[0])
	if err != nil || pid <= 1 {
		return usage(fmt.Sprintf("%q is not the pid of a background job", args[0]))
	}
	limit := waitDefault
	if len(args) == 2 {
		n, err := strconv.Atoi(args[1])
		if err != nil || n < 1 {
			return usage(fmt.Sprintf("%q is not a number of seconds", args[1]))
		}
		limit = min(time.Duration(n)*time.Second, waitMax)
	}
	if !alive(pid, "/proc") {
		fmt.Fprintf(out, "pid %d is not running (it ended, or it never was a job)\n", pid)
		return 0
	}
	start := time.Now()
	for alive(pid, "/proc") {
		if time.Since(start) >= limit {
			fmt.Fprintf(out, "pid %d still running after %s\n", pid, limit)
			return waitTimedOut
		}
		time.Sleep(poll)
	}
	fmt.Fprintf(out, "pid %d ended after %s\n", pid, time.Since(start).Round(time.Second))
	return 0
}

// alive reports whether pid runs: a zombie, which the worker as init has
// not reaped yet, is an ended job.
func alive(pid int, procRoot string) bool {
	b, err := os.ReadFile(filepath.Join(procRoot, strconv.Itoa(pid), "stat")) // #nosec G304 -- /proc/<int>/stat
	if err != nil {
		return false
	}
	// "pid (comm) S ...": the state follows the last ')'
	i := bytes.LastIndexByte(b, ')')
	return i >= 0 && i+2 < len(b) && b[i+2] != 'Z' && b[i+2] != 'X'
}
```

`main.go` `main()`, first lines:

```go
	if len(os.Args) > 1 && os.Args[1] == "wait" {
		os.Exit(runWait(os.Args[2:], os.Stdout, time.Second))
	}
```

(`time` is imported in main.go already; add it if not.)

`opencode.go` `guideEnd`: replace `Give a command that may run over two minutes a timeout of up to 600000 ms.` with

`Give a command that may run over two minutes a timeout of up to 600000 ms. To wait for a background job (start it with its output in a file and note $!), run agent-worker wait <pid> [seconds up to 590] with a timeout of 600000 ms: one call blocks until the process ends, where a sleep loop costs a model call per poll.`

- [ ] **Step 4: Run, expect pass**

Run: `go test -race ./cmd/agent-worker/ ./internal/factoryd/ -run 'Wait|Guide|Brief' -v` then both packages whole.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cmd/agent-worker internal/factoryd
git commit -m "worker: agent-worker wait blocks on a background job in one call"
```

---

### Task 7: The planner's fresh session at its time limit, with what it read

**Files:**
- Modify: `internal/factoryd/plan.go:1082-1085` (`planLoop`), `plan.go` `RunPlan` (~1450-1490), `internal/factoryd/workflow.go` (version consts ~880, `taskRun` fields ~1014, `GetVersion` list ~470), `internal/factoryd/supervise.go` (`Supervisor`, `Event`), `internal/factoryd/runner.go` (`sessionOutcome`, the `defer` at ~565), `internal/factoryd/report.go` (`reportEnd`, after `runSession`)
- Test: `internal/factoryd/supervise_test.go`, `internal/factoryd/plan_test.go`

**Interfaces:**
- Consumes: `reportSession(..., planner bool, ...)` (task 3); `minSession` (`workflow.go:946`); `t.recordUsage(u)`.
- Produces: `(*Supervisor).Reads() []string`; `sessionOutcome.reads`, `reportEnd.reads`; `readsFinding(paths []string) string`; `versionPlannerRetry` (change id `planner-retry`).

- [ ] **Step 1: Write the failing tests**

`supervise_test.go` (append):

```go
func readEvent(path string) harness.Event {
	return harness.Event{Kind: harness.EventToolCall, Detail: map[string]any{"tool": "read", "status": "completed", "args": map[string]any{"filePath": path}}}
}

func TestReportSessionRemembersWhatItRead(t *testing.T) {
	s := spendSupervisor(t, func(c *SupervisorConfig) { c.ReadOnly = true })
	for _, p := range []string{"/w/a.go", "/w/b.go", "/w/a.go"} {
		s.Event(readEvent(p), time.Unix(1, 0))
	}
	s.Event(harness.Event{Kind: harness.EventToolCall, Detail: map[string]any{"tool": "grep", "args": map[string]any{"pattern": "x"}}}, time.Unix(2, 0))
	if got := s.Reads(); !slices.Equal(got, []string{"/w/a.go", "/w/b.go"}) {
		t.Fatalf("Reads = %v, want the two distinct paths in order", got)
	}
}

func TestCodingSessionKeepsNoReads(t *testing.T) {
	s := spendSupervisor(t, nil)
	s.Event(readEvent("/w/a.go"), time.Unix(1, 0))
	if got := s.Reads(); len(got) != 0 {
		t.Fatalf("Reads = %v, want none for a coding session", got)
	}
}
```

(`supervise_test.go` imports `slices` if it does not.)

`plan_test.go` (append):

```go
func TestReadsFindingNamesThePathsAndTheWayOn(t *testing.T) {
	got := readsFinding([]string{"/workspace/repo/a.go", "/workspace/docs/b.md"})
	want := "the planner session read 2 files before it ended: /workspace/repo/a.go, /workspace/docs/b.md. File the plan from what they hold; read a file again only where the plan needs a detail."
	if got != want {
		t.Fatalf("readsFinding = %q, want %q", got, want)
	}
}

// A planner that used its time gets one fresh session with its findings
// instead of a fail: 18 of 20 minutes used leaves 2, under the 5 a session
// needs, so half the cap (10 minutes) is added.
func TestPlanLoopTimeLimitStartsAFreshPlanner(t *testing.T) {
	found := []string{"plan: the session ended without filing a plan through the file_plan tool", "the planner session read 1 files before it ended: /w/a.go. File the plan from what they hold; read a file again only where the plan needs a detail."}
	h := newPlanHarness(t, PlanResult{Findings: found}, PlanResult{Revision: 1, SHA256: "sha-1"})
	h.state = RunState{Status: "running", Usage: TaskUsage{AgentTime: 18 * time.Minute, Attempts: 1}}
	h.signalAfter(time.Hour, SignalPlanAccepted, TaskSignal{Author: "sebastian", Revision: 1, SHA256: "sha-1"})
	if final := h.run(t); final != "done" {
		t.Fatalf("final %q, finals %v, want done after a second planner", final, h.finals)
	}
	if len(h.plans) != 2 || !slices.Equal(h.plans[1], found) {
		t.Fatalf("plans %q, want a second session with the first's findings", h.plans)
	}
	if u := h.usage[0]; u.ExtraTime != 10*time.Minute {
		t.Fatalf("first usage %+v, want 10 minutes of extra time", u)
	}
}

// Once only: with extra time already granted and the whole of it used
// (20m cap + 10m extra - 30m used = 0), the card fails as before.
func TestPlanLoopSecondTimeLimitFails(t *testing.T) {
	h := newPlanHarness(t, PlanResult{Findings: []string{"plan: no plan"}})
	h.state = RunState{Status: "running", Usage: TaskUsage{AgentTime: 30 * time.Minute, ExtraTime: 10 * time.Minute, Attempts: 1}}
	if final := h.run(t); final != "failed" || h.finals[0][1] != "wall-clock cap reached" || len(h.plans) != 0 {
		t.Fatalf("final %q, finals %v, plans %q, want the old fail with no session", final, h.finals, h.plans)
	}
}

// A run from before the change fails at the limit (20m cap, 20m used).
func TestPlanLoopBeforePlannerRetryFailsAtTheLimit(t *testing.T) {
	h := newPlanHarness(t, PlanResult{Findings: []string{"plan: no plan"}})
	h.state = RunState{Status: "running", Usage: TaskUsage{AgentTime: 20 * time.Minute, Attempts: 1}}
	h.env.OnGetVersion("planner-retry", workflow.DefaultVersion, versionPlannerRetry).Return(workflow.DefaultVersion)
	if final := h.run(t); final != "failed" || h.finals[0][1] != "wall-clock cap reached" || len(h.plans) != 0 {
		t.Fatalf("final %q, finals %v, plans %q", final, h.finals, h.plans)
	}
}

- [ ] **Step 2: Run, expect failure**

Run: `go test ./internal/factoryd/ -run 'ReportSessionRemembers|CodingSessionKeepsNoReads|ReadsFinding|PlanLoopTimeLimit|PlanLoopSecondTimeLimit|PlanLoopBeforePlannerRetry' -v`
Expected: FAIL to compile (`Reads`, `readsFinding`, `versionPlannerRetry` undefined).

- [ ] **Step 3: Implement**

`supervise.go`: `Supervisor` gains `reads []string // a report session's distinct read paths, in order`. In `Event`, after `s.noteFinding(ev)`: `s.noteRead(ev)`. New:

```go
// maxReads bounds the paths a report session keeps.
const maxReads = 100

// noteRead keeps the paths a report session opened, for the next planner
// session when this one ends without its plan.
func (s *Supervisor) noteRead(ev harness.Event) {
	if !s.cfg.ReadOnly || ev.Kind != harness.EventToolCall || detailString(ev, "tool") != "read" {
		return
	}
	args, _ := ev.Detail["args"].(map[string]any)
	path, _ := args["filePath"].(string)
	if path == "" || slices.Contains(s.reads, path) || len(s.reads) >= maxReads {
		return
	}
	s.reads = append(s.reads, path)
}

func (s *Supervisor) Reads() []string { return slices.Clone(s.reads) }
```

`runner.go`: `sessionOutcome` gains `reads []string`; the `defer` becomes `defer func() { out.findings, out.model, out.reads = sup.Findings(), s.model, sup.Reads() }()`.

`report.go`: `reportEnd` gains `reads []string`; right after the `runSession` error check in `reportSession`: `end.reads = out.reads`.

`plan.go`: add

```go
// readsFinding tells the next planner session what the last one read.
func readsFinding(paths []string) string {
	return fmt.Sprintf("the planner session read %d files before it ended: %s. File the plan from what they hold; read a file again only where the plan needs a detail.",
		len(paths), textutil.Truncate(strings.Join(paths, ", "), maxPlanEcho))
}
```

In `RunPlan`, after the `found` slice has its last-message line appended and before `r.record(ctx, taskID, "plan_invalid", ...)`:

```go
	if len(end.reads) > 0 {
		found = append(found, readsFinding(end.reads))
	}
```

`planLoop` (replace lines 1082-1085):

```go
		remaining := t.cfg.WallClockCap + u.ExtraTime - u.AgentTime
		if t.plannerRetry >= versionPlannerRetry && u.ExtraTime == 0 && remaining < min(minSession, t.cfg.WallClockCap) {
			u.ExtraTime = t.cfg.WallClockCap / 2
			t.recordUsage(u)
			remaining += u.ExtraTime
		}
		if remaining <= 0 {
			return t.finish("failed", "wall-clock cap reached")
		}
```

`workflow.go`: const (with the others, with the same style of comment):

```go
	// versionPlannerRetry (change id "planner-retry"): a plan card whose
	// agent time is used up, with no extra time yet granted, gets half the
	// cap as a fresh planner session with its findings, instead of failing;
	// the second exhaustion fails. A run from before the change fails at
	// the first.
	versionPlannerRetry workflow.Version = 1
```

field `plannerRetry workflow.Version // a used-up planner gets one fresh session (versionPlannerRetry)` beside `podWait`, and `run.plannerRetry = workflow.GetVersion(ctx, "planner-retry", workflow.DefaultVersion, versionPlannerRetry)` after the `pod-wait` line.

- [ ] **Step 4: Run, expect pass**

Run: `go test -race ./internal/factoryd/ -run 'Plan|Supervisor|Report' -v` then `go test -race ./internal/factoryd/`
Expected: PASS. `go vet` flags any `reportSession` caller missed in task 3.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd
git commit -m "plan: a planner out of time gets one fresh session with what the first read"
```

---

### Task 8: The sandbox's capabilities as a fact in the brief

**Files:**
- Create: `internal/factoryd/sandbox.go`, `internal/factoryd/sandbox_test.go`
- Modify: `internal/factoryd/opencode.go` (`briefText` ~611, `guideEnd` 726)
- Test: `internal/factoryd/opencode_test.go`

**Interfaces:**
- Consumes: `sandboxRegistries` (`runner.go:1779`).
- Produces: `SandboxFacts() string`, in every brief, planner's included (`briefText` serves both).

- [ ] **Step 1: Write the failing tests**

`sandbox_test.go`:

```go
package factoryd

import (
	"os"
	"slices"
	"strings"
	"testing"
)

// aptPackages are the packages the sandbox image installs with apt, read from
// Dockerfile.sandbox with the versions left off.
func aptPackages(t *testing.T) []string {
	t.Helper()
	b, err := os.ReadFile("../../Dockerfile.sandbox")
	if err != nil {
		t.Fatal(err)
	}
	var pkgs []string
	for _, line := range strings.Split(strings.ReplaceAll(string(b), "\\\n", " "), "\n") {
		_, rest, ok := strings.Cut(line, "apt-get install -y --no-install-recommends ")
		if !ok {
			continue
		}
		rest, _, _ = strings.Cut(rest, "&&")
		for _, f := range strings.Fields(rest) {
			name, _, _ := strings.Cut(f, "=")
			pkgs = append(pkgs, name)
		}
	}
	return pkgs
}

// The brief's list of tools is the image's: a package added to
// Dockerfile.sandbox without a line here, or a line here with no package,
// fails.
func TestSandboxToolsAreTheImages(t *testing.T) {
	image := aptPackages(t)
	var named []string
	for _, tool := range sandboxTools {
		named = append(named, tool.apt...)
	}
	for _, p := range image {
		if !slices.Contains(named, p) && !slices.Contains(sandboxIncidental, p) {
			t.Errorf("Dockerfile.sandbox installs %s, which sandboxTools and sandboxIncidental do not name", p)
		}
	}
	for _, p := range named {
		if !slices.Contains(image, p) {
			t.Errorf("sandboxTools names %s, which Dockerfile.sandbox does not install", p)
		}
	}
	b, _ := os.ReadFile("../../Dockerfile.sandbox")
	if !strings.Contains(string(b), "golang:1.26.") || !strings.Contains(string(b), "ARG NODE_VERSION=24.") {
		t.Error("Dockerfile.sandbox no longer carries Go 1.26 and Node 24, which SandboxFacts states")
	}
}

func TestSandboxFactsNameToolsNamesAndNoBrowser(t *testing.T) {
	got := SandboxFacts()
	for _, want := range []string{"git", "ripgrep (rg)", "gcc and make", "Go 1.26", "Node 24 with npm", "PostgreSQL 17",
		"proxy.golang.org", "registry.npmjs.org", "no browser"} {
		if !strings.Contains(got, want) {
			t.Errorf("SandboxFacts lacks %q:\n%s", want, got)
		}
	}
}
```

`opencode_test.go` (append):

```go
func TestEveryBriefStatesTheSandbox(t *testing.T) {
	for name, brief := range map[string]harness.TaskBrief{
		"coding":  {Objective: "o"},
		"planner": {Objective: "o", Report: "You are the planner."},
	} {
		got := briefText(brief, "T")
		if !strings.Contains(got, SandboxFacts()) {
			t.Errorf("%s brief lacks the sandbox facts", name)
		}
	}
	if strings.Contains(briefText(harness.TaskBrief{Objective: "o"}, "T"), "reaches only the Go module proxy and the npm registry") {
		t.Error("the guide still carries its own hand-written copy of the sandbox's reach")
	}
}
```

- [ ] **Step 2: Run, expect failure**

Run: `go test ./internal/factoryd/ -run 'Sandbox' -v`
Expected: FAIL to compile (`sandboxTools` undefined).

- [ ] **Step 3: Implement**

`sandbox.go`:

```go
package factoryd

import "strings"

// sandboxTools are the tools of the sandbox image as the brief names them,
// each with the apt packages of Dockerfile.sandbox behind it; Go and Node
// come from stages of the image. A test holds this table to the Dockerfile.
var sandboxTools = []struct {
	text string
	apt  []string
}{
	{"git", []string{"git"}},
	{"curl", []string{"curl"}},
	{"ripgrep (rg)", []string{"ripgrep"}},
	{"ssh", []string{"openssh-client"}},
	{"gcc and make", []string{"gcc", "make"}},
	{"python3", []string{"python3"}},
	{"PostgreSQL 17 (server and client, for tests)", []string{"postgresql-17", "postgresql-client-17"}},
	{"Go 1.26", nil},
	{"Node 24 with npm", nil},
}

// sandboxIncidental are the image's packages that are no tool the agent
// is told about.
var sandboxIncidental = []string{"ca-certificates", "tzdata", "xz-utils", "libc6-dev", "libpq5", "postgresql-common", "postgresql-client-common"}

// SandboxFacts is the brief's statement of what the sandbox has and
// reaches. The names are sandboxRegistries, the list the sandbox's egress
// policy and DNS allowlist are built from.
func SandboxFacts() string {
	tools := make([]string, len(sandboxTools))
	for i, t := range sandboxTools {
		tools[i] = t.text
	}
	return "The sandbox has " + strings.Join(tools, ", ") + ". It reaches the factory's gateway and Git server and " +
		strings.Join(sandboxRegistries, ", ") + " (the Go module proxy and the npm registry); every other name fails to resolve. " +
		"It has no browser and none can be installed, since the download hosts are not reachable: a check that needs a screenshot or a page in a browser cannot run here."
}
```

`opencode.go`: in `briefText`, directly after the `Facts` lines added in task 2:

```go
	b.WriteString(SandboxFacts() + "\n")
```

In `guideEnd`, replace `The sandbox has Go, Node, gcc and make, and reaches only the Go module proxy and the npm registry: install what the checks need with go install, go run or npm; the caches under /cache persist for this project. ` with `Install what the checks need with go install, go run or npm; the caches under /cache persist for this project. `.

- [ ] **Step 4: Run, expect pass**

Run: `go test -race ./internal/factoryd/ -run 'Sandbox|Brief|Guide' -v` then the package.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/factoryd
git commit -m "brief: the sandbox's tools, reachable names and missing browser, derived from the image and the egress list"
```

---

### Task 9: A session that pushed on a budget refusal is recorded `pushed`

**Files:**
- Modify: `internal/policy/holds.go:84` (const), `internal/factoryd/store.go:306` (interface) and `:798` (PG method), `internal/factoryd/activities.go` (`RunSession`, right after `res.Model = s.model`, ~715)
- Test: `internal/factoryd/store_test.go` (fake + PG test), `internal/factoryd/runner_test.go`

**Interfaces:**
- Produces: `policy.RefusedBudget = "refused_budget"`; `Store.BudgetRefused(ctx, taskID string, since time.Time) (bool, error)`; `fakeStore.budgetRefused map[string]bool`.

- [ ] **Step 1: Write the failing tests**

`runner_test.go` (append):

```go
// The gateway refused a call for the card's budget and the worker pushed
// the work in progress: the session is pushed, with that commit.
func TestRunSessionBudgetRefusalAfterAPushIsPushed(t *testing.T) {
	task := Task{ID: "t3", Status: "running", Objective: "x", Repository: "sf/repo"}
	runner, _, store := newTestRunner(t, task, newFakeKube(), &fakeObjectStore{})
	store.budgetRefused = map[string]bool{"t3": true}
	res, err := runSession(t, nil, runner, SessionInput{TaskID: "t3", Attempt: 1, Model: "m"}, nil,
		pushedLine("c-wip")+"\n"+resultLine(false, "free headroom 0.07 EUR fits 0 output tokens (status 402); work in progress pushed to factory/t3 at c-wip"))
	if err != nil || res.Outcome != OutcomePushed || res.Commit != "c-wip" {
		t.Fatalf("result = (%+v, %v), want pushed at c-wip", res, err)
	}
}

// A failure that pushed but met no budget refusal stays no_push, and a
// refusal with nothing pushed has no commit to call pushed.
func TestRunSessionOnlyABudgetRefusalAfterAPushIsPushed(t *testing.T) {
	task := Task{ID: "t3", Status: "running", Objective: "x", Repository: "sf/repo"}
	runner, _, store := newTestRunner(t, task, newFakeKube(), &fakeObjectStore{})
	res, err := runSession(t, nil, runner, SessionInput{TaskID: "t3", Attempt: 1, Model: "m"}, nil,
		pushedLine("c-wip")+"\n"+resultLine(false, "model refused"))
	if err != nil || res.Outcome != OutcomeNoPush {
		t.Fatalf("no refusal: (%+v, %v), want no_push", res, err)
	}
	store.budgetRefused = map[string]bool{"t3": true}
	res, err = runSession(t, nil, runner, SessionInput{TaskID: "t3", Attempt: 1, Model: "m"}, nil, resultLine(false, "free headroom 0 EUR"))
	if err != nil || res.Outcome != OutcomeNoPush {
		t.Fatalf("refusal without a push: (%+v, %v), want no_push", res, err)
	}
}
```

`store_test.go`: the fake gets a field `budgetRefused map[string]bool` next to `capRefusals` (line 64) and

```go
func (s *fakeStore) BudgetRefused(ctx context.Context, taskID string, since time.Time) (bool, error) {
	return s.budgetRefused[taskID], nil
}
```

PG test (append; the audit table's `kind` is `agent` for an agent's call):

```go
func TestPGStoreBudgetRefused(t *testing.T) {
	ctx := context.Background()
	s, err := OpenStore(ctx, schematest.DSN(t, "factoryd"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	if _, err := s.db.ExecContext(ctx, `TRUNCATE audit;
		INSERT INTO audit (task_id, kind, decision, reason, tool, ts) VALUES
			('a', 'agent', 'refused_budget', 'before the session', '', '2026-10-15 10:00:00Z'),
			('b', 'agent', 'refused_budget', 'a tool', 'web_scrape', '2026-10-15 11:30:00Z'),
			('c', 'supervisor', 'refused_budget', 'factoryd call', '', '2026-10-15 11:30:00Z'),
			('d', 'agent', 'refused_budget', 'in the session', '', '2026-10-15 11:30:00Z')`); err != nil {
		t.Fatal(err)
	}
	since := time.Date(2026, 10, 15, 11, 0, 0, 0, time.UTC)
	for task, want := range map[string]bool{"a": false, "b": false, "c": false, "d": true, "none": false} {
		if got, err := s.BudgetRefused(ctx, task, since); err != nil || got != want {
			t.Errorf("BudgetRefused(%s) = (%v, %v), want %v", task, got, err, want)
		}
	}
}
```

(`schematest` and `OpenStore` as used by `TestPGStoreMonthCap`, which opens with a modified URL; this test needs no timezone.)

- [ ] **Step 2: Run, expect failure**

Run: `scripts/pg-test.sh go test ./internal/factoryd/ -run 'BudgetRefus|ABudgetRefusal' -v`
Expected: FAIL to compile (`BudgetRefused` undefined).

- [ ] **Step 3: Implement**

`policy/holds.go`: add `const RefusedBudget = "refused_budget"` beside `RefusedDayCap` and make `HeadroomBound` return `task, RefusedBudget`; the `Refusal.Decision` comment keeps its list.

`store.go`: interface gains `BudgetRefused(ctx context.Context, taskID string, since time.Time) (bool, error)` after `CapRefusal`; the PG method:

```go
func (s *PGStore) BudgetRefused(ctx context.Context, taskID string, since time.Time) (bool, error) {
	var refused bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM audit WHERE task_id = $1 AND kind = $2 AND tool = '' AND decision = $3 AND ts >= $4)`,
		taskID, gateway.AuditKindAgent, policy.RefusedBudget, since).Scan(&refused)
	return refused, err
}
```

`activities.go`, in `RunSession`, immediately after `res.Model = s.model`:

```go
	if res.Outcome == OutcomeNoPush && out.commit != "" {
		refused, err := r.store.BudgetRefused(ctx, t.ID, startedAt)
		if err != nil {
			return SessionResult{}, err
		}
		if refused {
			res.Outcome, res.Commit = OutcomePushed, out.commit
		}
	}
```

- [ ] **Step 4: Run, expect pass**

Run: `scripts/pg-test.sh go test -race ./internal/factoryd/ ./internal/policy/ ./internal/gateway/`
Expected: PASS. In `TestRunSessionBudgetRefusalAfterAPushIsPushed` the worker log has a push and a failed result; `sessionResult` returns `no_push`, and the block turns it into `pushed` at `c-wip`.

- [ ] **Step 5: Commit**

```bash
git add internal/policy internal/factoryd
git commit -m "session: a budget refusal after the worker pushed its work in progress is recorded pushed"
```

---

### Task 10: Whole-repository gates, landing, and the infra values

**Files:**
- Modify (infra): `factory/policy.yaml` (`limits:` block ~line 70), `factory/schema/policy.schema.json` (regenerated)

- [ ] **Step 1: Run the repository's gates in the worktree**

```bash
bash check
scripts/pg-test.sh go test -race ./internal/factoryd/ ./internal/gateway/ ./internal/policy/ ./cmd/...
```
Expected: gofmt, vet, gosec clean; every test PASS. Fix any failure at its root; never edit an assertion to pass.

- [ ] **Step 2: Land the code**

```bash
git fetch origin && git rebase origin/main
bash check
git push origin HEAD:main && git push github HEAD:main
cd ~/repos/ai-software-factory-code && git worktree remove ../worktrees/ladder-b && git branch -d ladder-b
```
The roll card ships the images (`factoryd`, `worker`); the infra values follow the roll, since a factoryd that does not know `warn_at` refuses a policy that names it ("Unknown keys are rejected").

- [ ] **Step 3: After the roll, write the live values** (infra worktree)

In `factory/policy.yaml`'s `limits:` block, after `same_call: 4`:

```yaml
  # warn_at: percent of a card's budget, or of a session's agent time, spent
  # when factoryd tells the running agent to wrap up and push (default 80);
  # plan_warn_at: the same for a planner session (67, two thirds);
  # no_push_spend: percent of the card's budget spent with nothing pushed at
  # which the session supervisor is called (60); context_tokens: the context
  # size at which opencode compacts the conversation (100000, of the 200000
  # window card #854's calls grew toward: 138,000).
  warn_at: 80
  plan_warn_at: 67
  no_push_spend: 60
  context_tokens: 100000
```

- [ ] **Step 4: Regenerate and check the schema**

```bash
cd ~/repos/ai-software-factory-code
go run ./cmd/factoryd schema --out ../ai-software-factory-infra/factory/schema
go run ./cmd/factoryd config check ../ai-software-factory-infra/factory/
INFRA_FACTORY_DIR=../ai-software-factory-infra/factory go test ./internal/policy/
```
Expected: no output from the first two (or the check's OK line), PASS from the third.

- [ ] **Step 5: Commit and push the infra change**

```bash
cd ~/repos/ai-software-factory-infra
git add factory/policy.yaml factory/schema/policy.schema.json
git commit -m "policy: warn_at, plan_warn_at, no_push_spend and context_tokens at their defaults"
git pull --rebase origin main && git push origin HEAD:main && git push github HEAD:main
```
Expected: factoryd loads the commit within 30 seconds; a refused commit files an issue, which would name a key factoryd does not know (the roll has not reached it).

---

### Task 11: Record the keys in architecture.md

**Files:**
- Modify: `~/repos/ai-software-factory/docs/architecture.md` (the limits paragraph ending "takes its time from the task's class, process and project.", near line 1584)

- [ ] **Step 1: Add the paragraph** directly after that sentence:

```
  Roadmap 199's facts and detectors (escalation ladder plan B) added four
  `limits` keys: `warn_at` (80) and `plan_warn_at` (67), the percent of a
  card's budget or a session's agent time at which factoryd sends the running
  agent a wrap-up message (the planner's says to file the plan), `no_push_spend`
  (60), the percent of the card's budget spent with nothing pushed at which
  the session supervisor is called (`spend_no_push`), and `context_tokens`
  (100000), the size at which opencode compacts the conversation, set in the
  generated config as `limit.input` with `compaction.reserved` 0. A session's
  brief states its budget left, agent time left and session number, and the
  sandbox's tools, reachable names and missing browser, derived from the image
  and `sandboxRegistries`. A plan card whose agent time is used up gets half
  the cap as one fresh planner session carrying the paths the first read
  (`planner-retry`).
```

- [ ] **Step 2: Commit and push**

```bash
cd ~/repos/ai-software-factory
git add docs/architecture.md
git commit -m "architecture: the limits keys and brief facts of escalation ladder plan B"
git pull --rebase origin master && git push origin HEAD:master && git push github HEAD:master
```
(Use the repository's default branch name as `git remote show origin` reports it.)

---

## Verification, and what is not verified

Run by the plan: `bash check`, the Postgres tests, the infra schema comparison (task 10). Not verified by running here, and so open until the first card after the roll:

- opencode compacts at `context_tokens`: read from the v1.18.32 source, never run (task 5, step 5).
- The wrap-up message reaches a live agent mid-turn as its next user turn: the unit test uses the fake worker endpoint; the climb message proves the path in production.
- `agent-worker wait` inside gVisor: `/proc/<pid>/stat` is read, the zombie rule is tested against a real child.
- The planner's second session and the reads finding on a real planner stop (`RunPlan`'s end-to-end use of `reportEnd.reads` has no test of its own; `readsFinding` and `Supervisor.Reads` do).
- A `pushed` budget-refused session through `verify` with an empty budget (design point 4).

## Self-review

- **Spec coverage.** Row 1 (facts and warning): tasks 2, 3. Row 2 (spend detector): task 4. Row 3 (context): research section, task 5. Row 4 (wait tool): task 6. Row 5 (planner warning, fresh session): tasks 3 (warning), 7. Row 6 (sandbox facts): task 8. Row 7 (`pushed`): task 9. Policy and landing: tasks 1, 10, 11. No gap found.
- **Placeholders.** None: every step carries its code or command. The repository-style fakes named in tests (`fakeWorkerEndpoint`, `supervisedTask`, `testSupervisorModel`, `fakeLiteLLM`, `podEnv`, `pushedLine`, `resultLine`, `hangLogs`, `newPlanHarness`, `schematest.DSN`) exist in the tree at `461f4d8`.
- **Type consistency.** `newLimitWatch(l, planner, started, span)`, `due(spent, budget, now) []warning`, `sent(kind)` agree in tasks 3 and 4. `SupervisorConfig.NoPushSpend`/`PriorPush` and `Supervisor.Spent` agree between tasks 4's tests and code. `reportSession` gains `planner bool` in task 3 and is used in task 7. `buildOpencodeConfig`'s new `contextTokens` sits between `steps` and `subagent` in every call. `readsFinding`, `Reads`, `reportEnd.reads`, `sessionOutcome.reads` agree in task 7.
- **Review Focus coverage.** Item 1: `TestLimitWatchSkipsWhatHasNoBudgetOrSpan`, `TestSpendWithoutPushIsOffWhereItDoesNotApply` (zero budget). Item 2: `TestLimitWatchKeepsAWarningUntilItIsSent`. Item 3: `TestLimitsStopValues` pinned case, `TestOpencodeConfigWithoutAContextCapLeavesOpencodesDefault`. Item 4: `TestWaitSaysWhenThePidIsNoJob`, `TestWaitCountsAZombieAsEnded`, `TestWaitRefusesBadArguments`, the 590 s cap in `runWait`. Item 5: `TestPlanLoopSecondTimeLimitFails`, `TestPlanLoopBeforePlannerRetryFailsAtTheLimit`.
