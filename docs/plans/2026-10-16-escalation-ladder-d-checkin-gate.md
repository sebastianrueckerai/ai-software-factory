# Escalation ladder, plan D: the check-in agent at the gate moment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One model conversation judges every gate return before a session is bought: the check-in agent confirms, drops or remarks each finding under the evidence rule, hands the next session a note of at most 2,000 characters at the top of its brief, and stops the pod before the coding agent spends anything when only a human can act. Every check-in, verdict and handover is recorded so the validation can find them.

**Architecture:** The check-in is a conversation on the strong rung under its own alias (`checkin`), driven by factoryd inside the `RunSession` activity of the next session's pod, before the coding conversation starts. Factoryd builds the statement from the findings and the session record's tail; its tools read the parent session record and the card's facts factoryd-side and reach the workspace through two new authenticated endpoints on the worker's message server (`POST /tool`, `POST /brief`, `POST /records`). The gateway books the calls as purpose `checkin`, so the ledger ref is `checkin/<alias>` and the audit kind is `checkin`, which the session cap's `ModelAnswered` never counts. Three deterministic guards sit in code, not in the prompt: a drop without checkable evidence is not a drop, a finding re-raised after a drop goes to the human with both records, and a finding confirmed as many times as `checkin_sessions` grants sessions goes to the human. A round whose findings are all dropped verifies the commit again; the re-review reads the drop record, and only its own approve merges. Verdicts live on the `Review` struct next to `Adjudicated`; the record per check-in is a `checkin` timeline step, the handover a `handover` step. The runner, the tool surface, the verdict types, the statement builder, the records and the alias are moment-generic: plan E adds the in-session and dead-session moments by passing a different `Moment` and statement into the same machinery, and adds the coding agent's own per-finding report as another statement input.

**Tech Stack:** Go 1.2x, Temporal SDK (`go.temporal.io/sdk` v1.44.0), Postgres-backed tests through `scripts/pg-test.sh`, the gateway's `/v1/chat/completions` with OpenAI tool calls, `git` CLI, LiteLLM proxy admin API.

**Spec:** [escalation-ladder-redesign-2026-10-15.md](../escalation-ladder-redesign-2026-10-15.md) section 5, the check-in table's gate row, "Where it runs", "Its model", "Limits in code", "The handover note", the findings loop, the drop guardrails, the remark verdict and the replay testing section. Records: [escalation-ladder-validation.md](../escalation-ladder-validation.md) section 2. Phase 1's plans A, B and C are landed on main; their structs (`Review.Dropped`, `MergeSpec.RedChecks`, `capAnswer`) are the ground this plan builds on. Line references below were verified against code commit `09e6fe5` (main).

## Design decisions this plan makes (the three the task left open)

1. **Where verdicts and records live.** The check-in's verdicts go on the reviewed round's `Review` as `Verdicts map[string]CheckVerdict`, keyed by finding text exactly as `Adjudicated map[string]Adjudication` (gates.go:129) is — so they sit next to the adjudications on the card, ride `MergeSpec.Review` onto the approval card without a `MergeSpec` change, and are rebuilt by `Reconcile` from a `checkin` timeline step that carries the round number. The handover is a `handover` step carrying its text and the session that read it.
2. **How the re-review reads the drop record.** A dropped round verifies the commit again through the ordinary `t.verify(res.Commit)`; no second review path exists. `lastVerdict(t.reviews)` (gates.go:852) passes the reviews with their verdicts attached, and the review prompt's repeat instruction ("list each one it did not address as a finding again", gates.go:762 and 767) is replaced by a verdicts-aware instruction: a finding dropped with evidence is named as dropped with that evidence, and the review re-raises it only against new evidence. The re-review's own approve is the only approve that merges — `AutoMerge` is unchanged.
3. **How the scripted check-in is injected for the replay tests.** The check-in never runs inside a workflow test: the workflow tests script `RunSession` results that carry a `CheckIn` outcome, exactly as they script sessions and reviews today (the harness `h.onSessions`). The runner's model and tools are two small interfaces (`checkinChat`, `podTools`), so the runner's own tests substitute scripted answers and tool outputs. No production stub exists.

## Three conflicts between the design's letter and the code, resolved here

- **`/workspace/.factory/sessions/<session>.jsonl` does not exist.** Session records are written factoryd-side to S3 (`SessionRecorder`, session.go:24). This plan makes the path true: factoryd pushes the parent session's record to the pod (`POST /records`) before the check-in, the worker writes `/workspace/.factory/sessions/<parent>.jsonl`, and the coding agent can grep it as the design says. The transcript tools read the record factoryd-side, where it already sits; the pod copy is delivery, S3 stays the store of record.
- **The coding agent's per-finding report (fixed/disputed/open) has not landed.** No `disputed` exists in the code; plan A landed `LastMessage` and `handoverLines`, not the report. Plan D does not add a prompt rule or an extra model call to extract one — both are against the design's own principle. The check-in reads the parent transcript (its tail is in the statement, its whole text is a tool) and stands every verdict on its own checkable evidence. The structured report belongs to plan E's in-session machinery, where the session-end runner exists to collect it; this plan says so and the replay scenario of #836 uses a transcript fixture, not a report field.
- **A `concerns` whose findings are all dropped falls through to approval today** (the review branch of `runStage`, workflow_stages.go:560-600: findings dropped by plan C's grep leave no finding, and the round proceeds to approval with verdict `concerns`). The design says a drop never counts as the review's approve. This plan's re-review on the drop record replaces that fall-through for check-in rounds; plan C's grep drops keep their shape and are treated as verdicts the review already checked.

## Policy keys

All defaults in code; the infra values land after the roll (Task 1 Step 6). A pinned policy version without them reads the defaults, as plan C's `review_diff_kib` does.

| Key (`limits`) | Type | Default | Meaning |
|---|---|---|---|
| `checkin_calls` | int | 12 | model calls of the check-in per card, all moments and rounds together |
| `checkin_share` | int | 10 | at most this percent of the card's budget on check-in calls |
| `checkin_tail_kib` | int | 24 | the parent session record's tail cut into the statement |
| `checkin_handover_chars` | int | 2000 | the handover note's cap (matches `maxHandoverMessage`, store.go:148) |
| `checkin_sessions` | int | 1 | fresh sessions one confirmed finding gets before the human asks for it |

Class alias: `checkin_model` on a policy class (`Class`), absent reads the class's `review_model` — a pinned policy needs nothing. The infra sets `checkin_model: checkin` on the coder class after the roll, with a `prices.max_output_tokens` entry for the alias; the LiteLLM alias itself can land before the roll, since an unused model name breaks nothing.

## Global Constraints

- Code repo: `/home/womb/repos/ai-software-factory-code` (branch `main`). Infra repo: `/home/womb/repos/ai-software-factory-infra`. Docs repo: `/home/womb/repos/ai-software-factory`.
- Work in a git worktree of each repo, never the main working tree. Other sessions push to `main` while you work: `git pull --rebase origin main` before every push, and re-read a function before you edit it if the pull touched its file.
- Commit to `main` and push to `origin` and `github`. Delete the worktree afterwards. Commit only your own files. End each commit message with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Before each commit run `gofmt -l .` (empty), `go vet ./...`, and the task's tests with `-race`. Before the last push of the code repo run `bash check` (vet, gofmt, gosec v2.29.0, `make test`).
- Postgres-backed tests: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ ...` and `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/gateway/...`. Plain `go test -race ./...` skips them.
- House style: minimal comments, no change narration, no legacy path or second implementation. Hand-derive expectations. Never edit an assertion to force a pass.
- Workflow code must stay replay-safe. Every workflow change below fires only on data an activity returns (`SessionResult.Outcome` values `checkin_human` and `checkin_dropped`, `SessionResult.CheckIn`) or changes only an activity's input (`SessionInput.CheckInAsk`, the reviews' verdicts inside `lastVerdict`). Temporal matches replayed commands by type and id, not by input, and an input struct's new fields decode as zero in old histories; histories recorded before this plan replay unchanged and need no `workflow.GetVersion`. State it in the review if you add any gate.
- A pinned policy version without the five keys reads their defaults; a class without `checkin_model` reads its `review_model`. Factoryd loaded today's policy must keep loading it.
- Rolling out: the infra `policy.yaml` keys and the regenerated schema land only after the factoryd image that knows them runs, or the policy version is rejected. The LiteLLM alias and its price may land before.

## Review Focus

Failure modes the spec implies and no single task's happy path covers. Each has a test in the task named.

1. A check-in pod whose every model call is refused (provider down, no budget left) must not be a session and must not loop: the outcome is `checkin_dropped` with no verdicts only when the evidence rule allowed it, else the findings stand and the round proceeds as today, and the card records the failed check-in (Task 3, `TestCheckinRunnerRefusedCallsEndTheConversation`).
2. A drop whose evidence names a file that does not exist, or a command with no output, is not a drop (Task 2, `TestEvidenceShape`, `TestVerdictGuards`).
3. A re-raised finding must reach the human with both records, never a third session on it (Task 6, `TestWorkflowReraisedDropGoesToTheHuman`; Task 7, scenario 8).
4. A check-in-only pod must not count as a session (`ModelAnswered`), must not book `session_started`, and must not grant an attempt (Task 5, `TestRunSessionCheckinHumanIsNoSession`; Task 6 asserts the loop counter in the replay).
5. Two loops must be impossible: drop, re-review re-raises, drop again; and confirm, session fails, confirm again (Task 2 guards, Task 7 scenarios 2 and 8).
6. The worker's `/tool` endpoint must answer only its message-token bearer, only the allow-listed names, and must cut output (Task 4, `TestToolEndpointAuth`, `TestToolEndpointBounds`).
7. The handover must be at the top of the brief, above findings and answers, and a handover longer than the cap must be cut, never dropped (Task 2, `TestHandoverCut`; Task 4, `TestBriefWait`).
8. A healed run (restart between the drop and the re-review) must converge: the verdicts come back from the timeline, and a lost `gateFindings` degrades to today's behavior, never to a skipped human (Task 6, `TestReconcileRebuildsCheckinVerdicts`).

## Verified facts (commit `09e6fe5`)

| Fact | Where |
|---|---|
| `SessionInput` has `CheckIn time.Duration` (the check-in's time budget) and no ask field | workflow.go:253-277 |
| `SessionResult` outcomes are a closed string set; `LastMessage` cut at `maxHandoverMessage` 2000 | workflow.go:208-237, 279-310; store.go:148 |
| The attempt loop calls `RunSession`, switches on `res.Outcome`, then `t.verify(res.Commit)` and `apply(v)` | workflow.go:1504-1507, 1611-1646 |
| `apply(v)` takes a verification's findings for the next session; a change request with none left buys the session (`capAnswer`, ruling 225) | workflow.go:1150-1170 |
| `handoverLines` builds "the branch holds …" and the last-message line; its comment already says the check-in's handover replaces them | workflow.go:1693-1720 |
| `drainChanges` returns the change requests as finding texts | workflow.go:2879-2889 |
| Human asks go through `ask` → `ActivityEscalate` (reason, choices) and `awaitHuman` | workflow.go:2915-2960 |
| The review stage calls `besideGate(..., lastVerdict(t.reviews), len(t.reviews)+1)`; a `concerns` with no finding after grep drops falls through to approval | workflow_stages.go:542-600 |
| `Review` carries `Adjudicated map[string]Adjudication`, `Claims`, `Dropped` | gates.go:129-148 |
| The review prompt's repeat sentence ("list each one it did not address as a finding again") sits in `reviewPrompt` and the parts form | gates.go:762, 767 |
| The gateway derives the ledger ref as `purpose + "/" + model` and `FactoryModels` when `X-Factory-Purpose` is set, and audits the row with `kind = purpose` | gateway/server.go:312-314, 330 |
| `ModelAnswered` counts `kind = gateway.AuditKindAgent AND tool = ''`; a purposeful call's kind is the purpose, so it is never counted | store.go:857-863; gateway/store.go:74-77 |
| `FactoryModel(classes, purpose)` switches on purpose; `Purposes` is the admitted list | policy/policy.go:1113-1141, 757-779 |
| `Limits` has `CheckIn time.Duration` and `SupervisorCalls` already; new keys join the struct, `limitsJSON`, defaults and `Validate` | policy/policy.go:260-420 |
| The worker's message server answers `POST /message` under a constant-time token hash; factoryd posts through `postWorker` | cmd/agent-worker/message.go:51, 158; factoryd/message.go:36, 61 |
| The worker's start sequence is: load env, clone, build brief (250), `oc.Prepare` (284), `serveMessages` (288), `oc.Run` (319) | cmd/agent-worker/main.go:202-330 |
| `briefText` renders the brief factoryd-side; `LeftOut` is its first section today | factoryd/opencode.go:645-700 |
| `SessionRecorder` accumulates events factoryd-side and puts the whole object per event to `sessions/<task>/<session>.jsonl` | factoryd/session.go:24-60 |
| Reconcile rebuilds workflow state from timeline steps | factoryd/activities.go:1412 |
| `MergeSpec` embeds the full `Review`; the console's approval card renders from it | gates.go:189-216; console/approvals.go:19-110 |

## File structure

| File | New or touched for |
|---|---|
| `internal/policy/policy.go`, `policy_test.go`, `tree_test.go` | Task 1 |
| `internal/factoryd/checkin.go`, `checkin_test.go` | Tasks 2, 3 (create) |
| `internal/factoryd/store.go` | Task 3 (`CheckinSpent`) |
| `internal/gateway/server_test.go` | Task 3 (tools pass through) |
| `cmd/agent-worker/message.go`, `main.go`, `message_test.go`, `main_test.go` | Task 4 |
| `internal/factoryd/runner.go`, `runner_test.go` | Task 5 |
| `internal/factoryd/workflow.go`, `workflow_stages.go`, `gates.go`, `activities.go`, `store.go` | Task 6 |
| `internal/factoryd/workflow_test.go`, `workflow_gates_test.go`, `gates_test.go` | Task 6 |
| `internal/factoryd/ladder_replay_test.go` | Task 7 (create) |
| `internal/console/approvals.go` and its template | Task 6 |
| `docs/architecture.md` (docs repo) | Task 8 |
| infra `factory/policy.yaml`, `factory/schema/policy.schema.json`, `k8s/platform/litellm/helmrelease.yaml` | Landing, after the roll |

Order: Tasks 1 to 4 are independent of each other; Task 5 needs 2, 3 and 4; Task 6 needs 5; Task 7 needs 6; Task 8 last. Task 1 first anyway: Task 3's defaults name its constants.

---

## Task 1: Purpose `checkin`, the class alias and the five limits keys

What happens today. The gateway admits seven factoryd purposes (`Purposes`, policy.go:757-779) and resolves a purposeful call's alias through `FactoryModel`'s switch (policy.go:1113-1141); a purpose outside the list is refused. `Limits` carries the supervisor's call cap and the check-in's time budget but nothing of the check-in agent's own.

**Files:**
- Modify: `internal/policy/policy.go` (`Purposes` 757-779, `Class` around 730, `FactoryModel` 1113, `Limits` 260, defaults 344-360, `limitsJSON` 394, `Validate` around 459)
- Test: `internal/policy/policy_test.go`, `internal/policy/tree_test.go` (`TestLimitsJSON`)

**Interfaces:**
- Produces: `policy.PurposeCheckin = "checkin"`, `Class.CheckinModel string` (yaml `checkin_model,omitempty`), `DefaultCheckinCalls = 12`, `DefaultCheckinShare = 10`, `DefaultCheckinTailKiB = 24`, `DefaultCheckinHandoverChars = 2000`, `DefaultCheckinSessions = 1`, `Limits.CheckinCalls, CheckinShare, CheckinTailKiB, CheckinHandoverChars, CheckinSessions int`, `Limits.CheckinCallCap() int`, `Limits.CheckinShareOf(budget float64) float64`, `Limits.CheckinTailBytes() int`, `Limits.CheckinHandoverCap() int`, `Limits.CheckinSessionCount() int`, `FactoryModel` case `PurposeCheckin → cmp.Or(cl.CheckinModel, cl.ReviewModel)`.

- [ ] **Step 1: Write the failing policy tests**

In `internal/policy/policy_test.go`, extend the limits table (the one plan C's Task 1 extended, `grep -n 'review_diff_kib' policy_test.go`) with rows for the five keys: each set, each absent (zero → the method returns the default), and each out of bounds. Hand-derived expectations:

```go
{"checkin defaults", Limits{}, ...}          // CheckinCallCap 12, CheckinShareOf(5) 0.5, CheckinTailBytes 24576, CheckinHandoverCap 2000, CheckinSessionCount 1
{"checkin set", Limits{CheckinCalls: 20, CheckinShare: 25, CheckinTailKiB: 32, CheckinHandoverChars: 4000, CheckinSessions: 2}, ...}
```

Add a `Validate` bounds test: `CheckinCalls` outside 1..48, `CheckinShare` outside 1..100, `CheckinTailKiB` outside 4..64, `CheckinHandoverChars` outside 200..8000, `CheckinSessions` outside 1..3 each refuse the document with an error naming the key.

Add a `FactoryModel` test: a document whose coder class sets `checkin_model: checkin` returns `checkin` for purpose `checkin`; one without returns the class's `review_model`; and `FactoryModels(classes)` contains the alias once.

In `internal/policy/tree_test.go` `TestLimitsJSON` (plan C set `ReviewDiffKiB: 256` there): extend `l` with `CheckinCalls: 12, CheckinShare: 10, CheckinTailKiB: 24, CheckinHandoverChars: 2000, CheckinSessions: 1` and change the wanted JSON to end `...,"review_diff_kib":256,"checkin_calls":12,"checkin_share":10,"checkin_tail_kib":24,"checkin_handover_chars":2000,"checkin_sessions":1}`.

- [ ] **Step 2: Run to verify they fail**

Run: `cd /home/womb/repos/ai-software-factory-code && go test ./internal/policy/ -run 'Checkin|FactoryModel|Validate' 2>&1 | tail -15`
Expected: compile FAIL, `unknown field CheckinCalls`, `undefined: policy.PurposeCheckin`.

- [ ] **Step 3: Implement**

`internal/policy/policy.go`:

1. In the purposes block after `PurposeCompact`:
```go
	// PurposeCheckin is the check-in agent's conversation at a gate
	// return (the escalation ladder's plan D).
	PurposeCheckin = "checkin"
```
and append it to `Purposes`.
2. On `Class`, after `AuditModel`: `CheckinModel string \`yaml:"checkin_model,omitempty" json:"checkin_model,omitempty"\`` — mirror the field tags the neighbours use (read them first).
3. In `FactoryModel`'s switch: `case PurposeCheckin: alias = cmp.Or(cl.CheckinModel, cl.ReviewModel)`.
4. On `Limits`, after `ReviewDiffKiB`, the five ints with `yaml:"checkin_calls,omitempty" json:"checkin_calls,omitempty"`-style tags matching the file's convention.
5. Defaults and methods in the style of `WarnShare`/`ContextCap`:
```go
const (
	DefaultCheckinCalls         = 12
	DefaultCheckinShare         = 10
	DefaultCheckinTailKiB       = 24
	DefaultCheckinHandoverChars = 2000
	DefaultCheckinSessions      = 1
)

func (l Limits) CheckinCallCap() int       { return cmp.Or(l.CheckinCalls, DefaultCheckinCalls) }
func (l Limits) CheckinShareOf(budget float64) float64 {
	return float64(cmp.Or(l.CheckinShare, DefaultCheckinShare)) / 100 * budget
}
func (l Limits) CheckinTailBytes() int     { return cmp.Or(l.CheckinTailKiB, DefaultCheckinTailKiB) << 10 }
func (l Limits) CheckinHandoverCap() int   { return cmp.Or(l.CheckinHandoverChars, DefaultCheckinHandoverChars) }
func (l Limits) CheckinSessionCount() int  { return cmp.Or(l.CheckinSessions, DefaultCheckinSessions) }
```
6. `limitsJSON` gains the five fields after `review_diff_kib` (int, no duration strings), and `MarshalJSON`/`UnmarshalJSON`'s positional literals gain them in the same order — hand-check the field order against the struct.
7. In `Validate`, five bounds checks in the file's existing error style (`fmt.Errorf("limits: checkin_calls %d: ...")`).

- [ ] **Step 4: Run the policy tests**

Run: `go test -race ./internal/policy/ 2>&1 | tail -5`
Expected: `ok`. If another test pins the exact Limits JSON (`grep -rn '"same_call"' internal --include=*_test.go`), update its expected string by the same appended fields, hand-derived.

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/policy
git commit -m "policy: purpose checkin, the class's checkin_model alias, and the check-in's five limits" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
git pull --rebase origin main
```

- [ ] **Step 6: Infra, after the image with these keys has rolled** (see Landing)

In `/home/womb/repos/ai-software-factory-infra`: `k8s/platform/litellm/helmrelease.yaml` gains a `model_name: checkin` entry pointing at the strong tier's deployment (copy the `review-frontier` entry's shape; different family only if one is at hand — recommendation only, do not hunt). `factory/policy.yaml`: the coder class gains `checkin_model: checkin`, `prices.max_output_tokens` gains a `checkin` entry (read the deployed model's real limit through the LiteLLM `/model/info` probe of plan C Task 1 Step 9 first), and the `limits:` block gains the five keys with their defaults and one comment line each. Regenerate `factory/schema/policy.schema.json` from the pulled code checkout the way plan A's infra step did; run the config check and the policy tests. Commit and push to both remotes only after the roll card settles.

---

## Task 2: The check-in's types, the evidence rule and the three guards

What happens today. Nothing exists. This task creates the check-in's vocabulary: the ask the workflow hands the activity, the outcome it gets back, a verdict with its evidence, the shape of checkable evidence, the three deterministic guards, the statement builder and the handover cut. No model call happens here.

**Files:**
- Create: `internal/factoryd/checkin.go`, `internal/factoryd/checkin_test.go`

**Interfaces:**
- Produces: `CheckInGate = "gate"` (plan E adds `CheckInSession`, `CheckInDead`), `type CheckFinding struct{Text, Source string; PriorConfirmed, PriorDropped int}`, `type CheckVerdict struct{State, Evidence string; Round int}`, verdict states `CheckConfirmed = "confirmed"`, `CheckDropped = "dropped"`, `CheckRemark = "remark"`, `type CheckInAsk struct{Moment string; Findings []CheckFinding; Review *Review; Gates *GateResults}`, `type CheckInOutcome struct{Decision, ReasonKind, Reason, Handover string; Verdicts map[string]CheckVerdict; Remarks []string; Record *CheckInRecord}`, decisions `CheckHandover = "handover"`, `CheckHuman = "human"`, `CheckDropped = "dropped_all"`, reason kinds `CheckGoalConflict = "goal_conflict"`, `CheckSpend = "spend_above_policy"`, `CheckPolicyClass = "policy_class"`, `CheckAccess = "access_factory_lacks"`, `type CheckInRecord struct{Model, Session, ParentSession, Moment string; StatementBytes, TailBytes int; Calls []CheckCall; ToolCalls int; Decision, ReasonKind, Reason string; CostEUR float64; Duration time.Duration}`, `type CheckCall struct{Name, Args string; ResultBytes int; Duration time.Duration}`, `type CheckinChat interface{ Call(ctx context.Context, taskID, alias string, in CheckinRequest) (CheckinResponse, error) }`, `type podTools interface{...}`, `evidenceOK(s string) bool`, `applyVerdictGuards(findings []CheckFinding, verdicts map[string]CheckVerdict, sessions int) (human string, ok bool)`, `checkinStatement(ask *CheckInAsk, tail []byte, callsLeft int, eurLeft float64, handoverCap int) string`, `cutHandover(s string, cap int) string`.

- [ ] **Step 1: Write the failing tests**

Create `internal/factoryd/checkin_test.go`. Hand-derive every expectation.

`TestEvidenceShape`: `evidenceOK` accepts `internal/factoryd/store.go:672 at main: func (s *PGStore) TasksByPR`, `store.go:672 at 09e6fe5: line text`, and `go test ./internal/factoryd/ -run TestX: ok  PASS` (a command and its output); refuses `""`, `it exists on main`, `the method is defined somewhere`, and a string with a path but neither a `:line` nor a command shape. Keep the check to structure, not truth: a file and a line at a ref, or a command and an output marker.

`TestVerdictGuards`: `applyVerdictGuards` over a table —
- a dropped finding whose evidence fails `evidenceOK` becomes confirmed with evidence `drop without evidence: <the text>` and `human` stays empty;
- a finding with `PriorDropped > 0` answered `dropped` upgrades to human `re-raised after a drop` (the guard returns the reason, `ok` false → the conversation ends as `CheckHuman`);
- a finding with `PriorConfirmed >= sessions` answered `confirmed` upgrades to human `confirmed <n> times`;
- a remark never upgrades anything;
- a clean confirm/drop set returns `ok` true with the verdicts as answered.

`TestCutHandover`: a 3,000-rune note with cap 2,000 comes back exactly 2,000 runes ending on a rune boundary, never mid-UTF-8.

`TestCheckinStatement`: build an ask with two findings (one `PriorConfirmed: 1`), a review with a summary, a 100-byte tail, calls left 7, eur left 1.5. Assert the statement's sections in order: the moment and the task, the rules (three verdicts; the evidence rule with its two shapes; "if only a human can act — a goal conflict, spend above policy, a policy class, access the factory lacks — stop and say which, with why"), the findings each with its history line (`confirmed once before`, `dropped before: keep it dropped only against new evidence`), the review's text, the gates' lines, the tail between `<<<SESSION-TAIL>>>` and `SESSION-TAIL>>>` markers, and the budget line (`calls left 7, 1.50 EUR left for the check-in on this card`). Assert the statement names the tool names (`transcript_search`, `transcript_read`, `card_facts`, `gates`, `read_file`, `grep`, `git_log`, `run`) and that the parent record's path `/workspace/.factory/sessions/<parent>.jsonl` is named.

- [ ] **Step 2: Run to verify they fail**

Run: `go test ./internal/factoryd/ -run 'Evidence|VerdictGuards|CutHandover|CheckinStatement' 2>&1 | tail -10`
Expected: compile FAIL, `undefined: evidenceOK` and the rest.

- [ ] **Step 3: Implement `internal/factoryd/checkin.go`**

The types exactly as under Interfaces, with doc comments in the house voice. The load-bearing bodies:

```go
var evidenceFile = regexp.MustCompile(`\S+:\d+ at (?:main|head|[0-9a-f]{7,40}):`)
var evidenceCommand = regexp.MustCompile(`(?:^|\n)\$ .*\n`)

// evidenceOK: the evidence cites a file and line at a ref, or a command
// and its output. Structure only; the truth is the card's to check.
func evidenceOK(s string) bool { return evidenceFile.MatchString(s) || evidenceCommand.MatchString(s) }
```

`applyVerdictGuards(findings, verdicts, sessions)` walks the findings in order, applies guard one (unevidenced drop → confirmed), then guards two and three (upgrade to human, first one wins) and returns the human reason and whether the verdicts stand.

`checkinStatement` builds the statement as `TestCheckinStatement` pins it. The rules section says, in plain sentences: confirm (the finding is real and must be fixed), drop (only with checkable evidence: a file and line at a ref, or a command and its output), remark (an opinion: say it, block nothing); the two human shapes; and that the handover is at most `<cap>` characters.

`cutHandover` cuts on `utf8.RuneLen` safety via `textutil.Truncate` if it is rune-safe (read `internal/textutil` first; if it cuts bytes, cut runes here).

- [ ] **Step 4: Run the tests**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run 'Evidence|VerdictGuards|CutHandover|CheckinStatement' 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd/checkin.go internal/factoryd/checkin_test.go
git commit -m "check-in: the ask, the outcome, verdicts with evidence, the three guards, the statement builder" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
git pull --rebase origin main
```

---

## Task 3: The conversation runner, the tools and the records

What happens today. Nothing. This task builds the loop: statement in, tool calls answered, one of three decisions out, every call recorded. The model and the pod are interfaces; Task 5 wires the production clients.

**Files:**
- Modify: `internal/factoryd/checkin.go` (the runner joins the types)
- Modify: `internal/factoryd/store.go` (add `CheckinSpent` beside `ModelAnswered` 857)
- Test: `internal/factoryd/checkin_test.go`, `internal/gateway/server_test.go` (one test)
- Modify: `internal/gateway/server.go` only if the pass-through test fails (it should not)

**Interfaces:**
- Produces: `type podTools interface{ Tool(ctx context.Context, name string, args map[string]any) (string, bool, error) }` (output, cut, error), `type checkinChat interface{ Call(ctx context.Context, taskID, alias string, in CheckinRequest) (CheckinResponse, error) }` with `type CheckinRequest struct{ System, Input string; Tools []CheckinTool }`, `type CheckinResponse struct{ Text string; ToolName string; ToolArgs map[string]any; UsageEUR float64 }`, `func (r *Runner) runCheckin(ctx context.Context, taskID, alias string, ask *CheckInAsk, parent []byte, chat checkinChat, tools podTools, callsLeft int, eurLeft float64, sessions int) CheckInOutcome`, `func (s *PGStore) CheckinSpent(ctx context.Context, taskID string) (float64, error)`, `func (s *PGStore) CheckinCalls(ctx context.Context, taskID string) (int, error)`, `type checkinGateway struct{ URL, Token string; HTTP *http.Client }` (the production `checkinChat`).

- [ ] **Step 1: Write the failing store tests**

In `internal/factoryd/store_test.go` (the Postgres-backed file `ModelAnswered`'s test lives in; `grep -n ModelAnswered store_test.go`): add `TestCheckinSpentAndCalls` — insert audit rows through the store's own insert path the way the `ModelAnswered` test does: two rows with kind `checkin` (spend 0.01 and 0.02, one with `tool` set to prove the tool filter does not apply here — check-in records count every call), one kind `agent` row (spend 0.5, never counted), one kind `checkin` row of another task (never counted). Expect `CheckinSpent` 0.03 and `CheckinCalls` 2.

- [ ] **Step 2: Write the failing runner tests**

In `internal/factoryd/checkin_test.go`, script the two interfaces:

```go
type scriptedChat struct{ answers []CheckinResponse; calls int; got CheckinRequest }
func (c *scriptedChat) Call(_ context.Context, _ string, _ string, in CheckinRequest) (CheckinResponse, error) {
	c.got = in
	if c.calls >= len(c.answers) { return CheckinResponse{}, errors.New("provider refused") }
	r := c.answers[c.calls]; c.calls++; return r, nil
}
type scriptedTools struct{ out map[string]string }
func (t scriptedTools) Tool(_ context.Context, name string, _ map[string]any) (string, bool, error) {
	o, ok := t.out[name]; return o, false, nil
}
```

`TestCheckinRunnerDropsWithEvidence`: the model answers one tool call (`grep`), then a final answer whose text is JSON `{"findings":[{"text":"TasksByPR is undefined","verdict":"dropped","evidence":"store.go:672 at main: func (s *PGStore) TasksByPR"}],"decision":"handover","handover":"the finding is false; build and test as usual"}`. Assert: decision handover, the verdict state dropped with the evidence kept, `Record.Calls` holds the model calls with non-zero durations and the tool call recorded with its result size, `Record.CostEUR` is the sum of the answers' `UsageEUR`, and the handover passed `cutHandover` at the given cap.

`TestCheckinRunnerGuardsUpgradeToHuman`: the model confirms a finding whose `PriorConfirmed` equals `sessions` — the outcome is `CheckHuman` with reason kind `""` and reason `confirmed 1 times`; and a second subtest where the model drops a `PriorDropped: 1` finding → `re-raised after a drop`.

`TestCheckinRunnerRefusedCallsEndTheConversation`: every `Call` errors after the first — the outcome is `CheckHuman`? No: a provider that refuses the check-in must not page a human for a conversation that never happened. The outcome is decision `dropped_all` with no verdicts and `ReasonKind` "" only if the evidence rule could hold — it cannot, so the findings stand: the decision is `handover` **with no handover text and no verdicts**, meaning "run the round as if no check-in existed", and `Record.Reason` says `check-in calls refused: <err>`. Assert that, and assert the workflow (Task 6) treats exactly this shape as today's path. (This is the spec's "the pod stops before the agent spends anything" read backwards: a check-in that cannot run must not invent a human question.)

`TestCheckinRunnerFinalAnswerShape`: a final answer that is not valid JSON, or names an unknown finding text, or carries an unknown verdict state — each ends the conversation as `CheckHuman` with reason `check-in answer unreadable: <why>`; the model gets one repair round (the runner re-asks with the parse error), hand-derived: first answer invalid, second valid → the valid one stands.

`TestCheckinRunnerLimits`: `callsLeft` 2 with a model that wants three tool calls — the third call is refused by the runner (no `Call`), the outcome is `CheckHuman` with reason `check-in call cap reached` (the design's spend-above-policy shape, reason kind `CheckSpend`).

- [ ] **Step 3: Run to verify they fail**

Run: `go test ./internal/factoryd/ -run 'CheckinRunner|CheckinSpent' 2>&1 | tail -10`
Expected: compile FAIL, `undefined: runCheckin`, `undefined: CheckinSpent`.

- [ ] **Step 4: Implement**

`CheckinSpent`/`CheckinCalls` in store.go, modelled on `ModelAnswered` (857): `SELECT COALESCE(SUM(spend_eur), 0)` / `SELECT COUNT(*)` `FROM audit WHERE task_id = $1 AND kind = 'checkin'`. Take the literal `checkin` from `policy.PurposeCheckin` if store.go imports policy (check; else a local const with a comment pointing at the purpose).

`runCheckin` in checkin.go:
1. Build the statement (`checkinStatement`), record its size and the tail size.
2. Loop at most `callsLeft` model calls: send `{System: checkinSystem, Input: <conversation so far>, Tools: checkinTools}`. A response with `ToolName` executes `tools.Tool`, records `{Name, Args (cut at 512 bytes), ResultBytes, Duration}`, appends the result to the conversation; a response without runs the final-answer parse (JSON shape as the tests pin; one repair round on a parse failure).
3. Apply `applyVerdictGuards`; an upgrade returns the `CheckHuman` outcome with the guard's reason.
4. Any exhaustion path returns the pinned outcome of the tests (cap → `CheckSpend` human; provider refused → the no-check-in handover shape).
5. `Record` fills as it goes; `Duration` is the whole conversation.

`checkinSystem` is a short constant paragraph: the agent is the factory's check-in at a gate return; it judges findings on evidence it gathered itself; it never edits anything; its answer is one JSON object; a human ask names the reason kind and why, in one sentence, with the state of the work. No rule here that the guards already carry.

`checkinGateway.Call` posts to `URL + "/v1/chat/completions"` with `Authorization: Bearer Token` — the factoryd token — and headers `X-Factory-Task: taskID`, `X-Factory-Purpose: checkin` (the exact names from gateway/server.go:104-105), body `{"model": alias, "messages":[...], "tools":[...], "stream": false}`, reads `choices[0].message` (`content`, or `tool_calls[0].function.name/arguments`) and `usage` if present; `UsageEUR` from the response's cost field if the gateway echoes one, else 0 (the record's cost comes from the ledger read in Task 5, this field is the in-conversation estimate only). Cut tool arguments with `json.Unmarshal` into `map[string]any`.

`checkinTools` is the OpenAI tool list: name, description and JSON schema for the eight tools of Task 2's statement test. Keep descriptions to one sentence each.

The gateway pass-through test in `internal/gateway/server_test.go`: `TestChatPurposefulCallCarriesTools` — a purposeful call (`X-Factory-Task`, `X-Factory-Purpose: checkin`, factoryd-token auth, the same rig `TestChatFactoryPurposeResolvesModels`-shaped tests use; `grep -n 'X-Factory-Purpose' server_test.go` for the closest one) whose body carries `"tools":[{...}]` reaches the fake upstream with the tools intact, and the audit row's alias ref is `checkin/<alias>` (assert through the store's audit rows the way sibling tests do). If the gateway strips or rejects the tools field, fix `proxy`'s request rewrite (server.go:706+) to pass it — the smallest change that makes the test true.

- [ ] **Step 5: Run the tests**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ ./internal/gateway/... -run 'Checkin' 2>&1 | tail -15`
Expected: PASS (the gateway test runs without Postgres; the store test needs the script).

- [ ] **Step 6: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd internal/gateway
git commit -m "check-in: the conversation runner with recorded calls, the ledger reads, and tools passing through the gateway under purpose checkin" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
git pull --rebase origin main
```

---

## Task 4: The worker's `/tool`, `/brief` and `/records` endpoints

What happens today. The worker's message server (cmd/agent-worker/message.go:158) answers `POST /message` only, under a constant-time token-hash bearer. `start` builds the brief (main.go:250-267), calls `oc.Prepare` (284), serves messages (288) and goes straight into `oc.Run` (319). Factoryd can reach the worker only through `postWorker` (factoryd/message.go:61), which posts JSON and reads the response.

**Files:**
- Modify: `cmd/agent-worker/message.go` (the three endpoints; `serveMessages`' signature gains nothing — pass a `*checkinServe` struct), `cmd/agent-worker/main.go` (the wait between `serveMessages` and `oc.Run`)
- Create: `cmd/agent-worker/checkin.go`, `cmd/agent-worker/checkin_test.go` (or extend `message_test.go`, `main_test.go` where the siblings live)
- Modify: `internal/factoryd/message.go` (`recordsWorker`, `briefWorker` beside `messageWorker` 36)

**Interfaces:**
- Produces: `POST /tool {"name": "...", "args": {...}}` → `200 {"output": "...", "cut": bool}`; `POST /brief {"handover": "..."}` → `204`; `POST /records {"session": "...", "record": "<jsonl>"}` → `204`; `const checkinWait = 10 * time.Minute`, `const checkinRunTimeout = 15 * time.Minute`, `const checkinOutputCap = 32 << 10`; the worker's brief carries `Handover` (`harness.TaskBrief.Handover string`), so add the field in `internal/harness/types.go` (TaskBrief, line 14) and render it first in `briefText` (factoryd/opencode.go:645) — `if brief.Handover != ""` writes the note between `<<<HANDOVER>>>` markers as the first section, before `LeftOut`; `(*Runner).recordsWorker(ctx, ns, pod, token, session, record string) error` and `(*Runner).briefWorker(ctx, ns, pod, token, handover string) error` via `postWorker`.

- [ ] **Step 1: Write the failing tests**

In the worker test file, hand-derived:

`TestToolEndpointAuth`: a request without the bearer, or with the wrong one, is 401; the right `tokenSHA256` bearer passes. (Build the server exactly as `message_test.go` builds the `/message` one.)

`TestToolEndpointBounds`: `name: "rm"` → 400 `unknown tool`; `read_file` with `path: "/etc/passwd"` → 403 `outside the workspace`; `run` with a command that prints 100 KiB → output cut at 32 KiB with `cut: true`; `run` with `sleep 600` → the test does not wait 15 minutes: make the timeout a field on the serve struct (default `checkinRunTimeout`, the test sets 50 ms) and assert the error names the timeout.

`TestToolExecutes`: `grep` for `SessionInput` over a workspace file the test writes → the output holds the path and line; `git_log` `-n 1` in the repo dir → one commit line; `run` `go version` → exit 0 output.

`TestBriefWait`: `serveMessages` up, no `/brief` push, `checkinWait` set to 50 ms → `oc.Run` receives a brief whose `Handover` is empty and the worker logs the wait's expiry; with a push arriving 10 ms in → `Handover` holds the pushed text. Assert through a stub `Run` (the existing tests stub `s.oc` — follow them).

`TestRecordsEndpoint`: a `/records` push writes `/workspace/.factory/sessions/<session>.jsonl` under the workspace root with the pushed bytes, creating the directory.

In `internal/factoryd/message_test.go` (or where `postWorker` is tested): `TestRecordsAndBriefWorker` — the fake worker asserts the paths `/records` and `/brief` and the JSON bodies.

- [ ] **Step 2: Run to verify they fail**

Run: `go test ./cmd/agent-worker/ -run 'Tool|Brief|Records' 2>&1 | tail -10`
Expected: compile FAIL or 404s.

- [ ] **Step 3: Implement**

`cmd/agent-worker/checkin.go`:

```go
// checkinServe carries the check-in's endpoints: the tool executions run
// in the session's workspace, the handover and the parent record arrive
// before the coding conversation starts.
type checkinServe struct {
	ws      string        // the workspace root
	wait    time.Duration // how long oc.Run's start holds for /brief
	timeout time.Duration // a run tool's cap
	handover chan string  // exactly one send: the pushed note, or "" at the deadline
}
```

The three handlers join `serveMessages`' mux under the same bearer check as `/message` (read how message.go:51 guards, reuse it):

- `POST /tool`: the allow-list is `read_file` (path under `ws`, 32 KiB cut), `grep` (pattern, ref `head|main`, path prefix optional — `git grep -n -w -F -I` in the repo dir, 32 KiB cut), `git_log` (args joined, `git log` only — reject any arg starting with `-` other than the known set `-n --oneline -- <path>`), `run` (one command via `sh -c` in the repo dir, `exec.CommandContext` with the timeout, combined output, 32 KiB cut, exit status in the error text). Every handler cuts with the same helper and answers `{"output": ..., "cut": ...}`; errors are 400 with the reason, never a stack.
- `POST /brief`: decode `{"handover"}`, send on the channel (non-blocking with a buffered channel of 1), 204.
- `POST /records`: decode `{"session", "record"}`, `os.MkdirAll(ws + "/.factory/sessions")`, write the file, 204. Reject a `session` value containing `/` or `..`.

`cmd/agent-worker/main.go`, in `start` after `serveMessages` (288) and before the `oc.Run` at 319: wait on `handover` for `wait` (a `select` with `time.After`), set `s.brief.Handover` to what arrived (empty on expiry), log the expiry once. `s.brief` is built at 250 — the field assignment after the wait is the whole change there.

`internal/harness/types.go`: `Handover string \`json:"handover,omitempty"\`` on `TaskBrief`, with one comment line.

`internal/factoryd/opencode.go`, `briefText` (645): the `Handover` section first, before the `LeftOut` block:
```go
	if brief.Handover != "" {
		fmt.Fprintf(&b, "<<<HANDOVER>>>\n%s\nHANDOVER>>>\n\n", brief.Handover)
	}
```

`internal/factoryd/message.go`, beside `messageWorker` (36):
```go
func (r *Runner) recordsWorker(ctx context.Context, ns, pod, token, session, record string) error {
	return r.postWorker(ctx, ns, pod, token, "/records", map[string]string{"session": session, "record": record})
}
func (r *Runner) briefWorker(ctx context.Context, ns, pod, token, handover string) error {
	return r.postWorker(ctx, ns, pod, token, "/brief", map[string]string{"handover": handover})
}
```

- [ ] **Step 4: Run the tests**

Run: `go test -race ./cmd/agent-worker/ ./internal/factoryd/ ./internal/harness/ 2>&1 | tail -10`
Expected: PASS. `briefText` tests that pin the brief's first line (`grep -rn 'factoryd left out' internal/factoryd/*_test.go`) must still pass — they assert sections, not the absolute first line; if one pins absoluteness, extend its expected string by the hand-derived handover-less case (no `Handover` → no section, byte-identical to today).

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add cmd/agent-worker internal/harness internal/factoryd
git commit -m "worker: the check-in's tool, brief and records endpoints; the handover stands at the top of the brief" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
git pull --rebase origin main
```

---

## Task 5: `RunSession` runs the check-in before the conversation

What happens today. `RunSession` (factoryd/runner.go; the activity behind `ActivityRunSession`) starts the pod, waits for its message port, and either reports or monitors the coding conversation to its result envelope. `SessionInput` gains `CheckInAsk *CheckInAsk` (workflow.go:253) and `SessionResult` gains `CheckIn *CheckInOutcome` plus two outcomes (workflow.go:208-310) — make those struct changes in this task, they are Task 6's contract.

**Files:**
- Modify: `internal/factoryd/workflow.go` (`SessionInput` 253, `SessionResult` 279, the outcome constants 208)
- Modify: `internal/factoryd/runner.go` (the check-in block between the pod's start wait and the conversation; the production `checkinChat` and `podTools` wiring)
- Test: `internal/factoryd/runner_test.go`

**Interfaces:**
- Produces: `OutcomeCheckinHuman SessionOutcome = "checkin_human"`, `OutcomeCheckinDropped SessionOutcome = "checkin_dropped"`, `SessionInput.CheckInAsk *CheckInAsk`, `SessionResult.CheckIn *CheckInOutcome`; `func (r *Runner) checkinBlock(ctx context.Context, t Task, in SessionInput, ns, pod, token, parentSession string, recorder *SessionRecorder) (*CheckInOutcome, bool)` — `true`: the conversation must not start (human or dropped); the production `podTools` (`type runnerTools struct{r *Runner; ns, pod, token string}` whose `Tool` calls `postWorker` `/tool` and reads the reply); the parent record read (`objects` get of `sessions/<task>/<parent>.jsonl` — read how `ResumeSessionRecorder` loads one, session.go) and the tail cut at `limits.CheckinTailBytes()`; the alias from `pinned.Document.FactoryModel(t.Classes, policy.PurposeCheckin)`; `callsLeft = limits.CheckinCallCap() - store.CheckinCalls(...)`; `eurLeft = limits.CheckinShareOf(t.BudgetEUR) - store.CheckinSpent(...)`.

- [ ] **Step 1: Write the failing tests**

In `runner_test.go` — the file already fakes pods and the message port (find the harness `TestRunSession*` uses; `grep -n 'func TestRunSession' runner_test.go`). Add:

`TestRunSessionCheckinHumanStopsBeforeTheConversation`: input with `CheckInAsk`, the fake chat answers a human decision (goal conflict). Assert: the result's outcome is `checkin_human`, `CheckIn.ReasonKind` is `goal_conflict`, the coding conversation never ran (the fake agent's run counter is 0), the pod is stopped (the harness's stop counter — follow how a supervisor-stop test asserts it), and a `checkin` timeline step exists with the record (assert through the step recorder the harness already captures).

`TestRunSessionCheckinHandoverRunsTheConversation`: the fake chat ends `handover` with a note. Assert: `/brief` was pushed with the note (the fake worker records its posts), the conversation ran with a brief whose handover is the note (the fake `oc` asserts it — the worker-side wait of Task 4 is worker code; at the factoryd level the push is the contract), the result's outcome is the conversation's own (`pushed` from the fake), and `res.CheckIn.Handover` is the note. Assert a `handover` step is recorded with the session id.

`TestRunSessionCheckinDropped`: the fake chat ends `dropped_all` with verdicts (one dropped with evidence, one confirmed — a mixed set cannot be `dropped_all`; assert `runCheckin`'s guard turned the mixed set into `handover` and the conversation ran, so build the drop as all-dropped). Assert: outcome `checkin_dropped`, no conversation, `CheckIn.Verdicts` carried, the pod stopped.

`TestRunSessionCheckinParentRecord`: the fake object store holds the parent record; assert the statement (captured through the scripted chat's first `Call`) contains the tail between the markers and that `/records` was pushed with the whole record.

`TestRunSessionCheckinLimitsExhausted`: the store pre-loaded with `checkin` audit rows at the cap (`CheckinCalls` ≥ `CheckinCallCap`) → `CheckInAsk` is not consulted: no chat call, the conversation runs as today, and the result's `CheckIn` is nil. (The workflow still set the ask; the activity declines.)

`TestRunSessionCheckinHumanIsNoSession`: with the funding/answered-session rig of plan A's `ModelAnswered` tests (`grep -n ModelAnswered runner_test.go`), a `checkin_human` result leaves `session_started` unwritten and the attempt uncounted — assert through the same store assertions that test uses for `OutcomeNotStarted`.

- [ ] **Step 2: Run to verify they fail**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run 'RunSessionCheckin' 2>&1 | tail -15`
Expected: compile FAIL (`unknown field CheckInAsk`) or the new outcomes failing the switch.

- [ ] **Step 3: Implement**

1. `workflow.go`: the two outcome constants with doc comments in the style of `OutcomeNotStarted` (208-237); `SessionInput.CheckInAsk` after `CheckIn`; `SessionResult.CheckIn` after `Choices`. Both comments say what Task 6 does with them.
2. `runner.go`, in `RunSession` after the pod's message port answers and before the report/conversation branch: if `in.CheckInAsk != nil`, run `checkinBlock`. Its body, in order:
   - resolve limits from the task's pinned policy the way the supervisor block does (`grep -n 'supervisor_calls\|SupervisorCalls' runner.go` for the pattern); `callsLeft`, `eurLeft` as under Interfaces; if `callsLeft <= 0` or `eurLeft <= 0`, return `nil, false` (no check-in; Task 6's ask stands unused) — with one log line.
   - read the parent record (`in.ParentSessionID`; empty or a read error → nil, the statement says the transcript is absent).
   - push `/records` (the whole record; best-effort: an error is logged, the check-in proceeds — its transcript tools then answer `absent`).
   - run `runCheckin` with the production `checkinGateway{URL: r.gatewayURL, Token: r.factorydToken, HTTP: r.http}` (field names: read the supervisor client's wiring in `cmd/factoryd/main.go` and reuse its values) and `runnerTools`.
   - write nothing here: the workflow records the steps (Task 6), so the record rides `res.CheckIn.Record` through the result envelope.
   - `CheckHandover` → `briefWorker` push, return `nil, false` (the conversation starts; the outcome rides the conversation's own result with `CheckIn` attached).
   - `CheckHuman` → return `&SessionResult{Outcome: OutcomeCheckinHuman, SessionID: s.id, Reason: ck.Reason, CheckIn: ck}` and stop the pod the way the supervisor-stop path does.
   - `CheckDroppedAll` → the same with `Outcome: OutcomeCheckinDropped`.
3. The `checkinGateway` needs `Call` to satisfy `checkinChat` — it is Task 3's; wire it here only.
4. `runnerTools.Tool` posts `/tool` with a timeout of `checkinRunTimeout` plus transport slack, cuts the reply to 32 KiB, and maps a non-200 to an error whose text the statement shows the model.

- [ ] **Step 4: Run the tests**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run 'RunSession' 2>&1 | tail -15`
Expected: PASS, including the pre-existing `TestRunSession*`. If a prior test's fake pod lacks the new endpoints, its paths are unchanged — the check-in block runs only when `CheckInAsk` is set.

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd
git commit -m "RunSession: the check-in runs before the coding conversation; a human or dropped decision stops the pod before anything is spent" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
git pull --rebase origin main
```

---

## Task 6: The workflow: gate findings go to the check-in, the drop is verified again

What happens today. Every verification finding goes back to the agent (`onFindings`, workflow_stages.go:297) or, at limits, to the card; `handoverLines` tells the next session what the last one said; a `concerns` whose findings plan C's grep dropped falls through to approval.

**Files:**
- Modify: `internal/factoryd/workflow.go` (the `taskRun` fields around 1071, the attempt loop 1440-1652, `handoverLines` 1699)
- Modify: `internal/factoryd/workflow_stages.go` (`onFindings` 297, the review branch 542-600)
- Modify: `internal/factoryd/gates.go` (`Review` 129 gains `Verdicts`, `reviewPrompt` 761-767's repeat sentences, `lastVerdict` 852)
- Modify: `internal/factoryd/activities.go` (`Reconcile` 1412's reviews rebuild)
- Modify: `internal/console/approvals.go` and the template it renders
- Test: `internal/factoryd/workflow_test.go`, `workflow_gates_test.go`, `gates_test.go`, `activities_test.go`; `internal/console` tests

**Interfaces:**
- Produces: `taskRun.gateFindings bool`, `taskRun.lastGates GateResults`; `Review.Verdicts map[string]CheckVerdict`; `func (t *taskRun) recordCheckin(res SessionResult)` (the `checkin` step and, on handover, the `handover` step); `checkinAsk(findings []string, sources []string, g GateResults) *CheckInAsk` — builds `CheckFinding`s carrying `PriorConfirmed`/`PriorDropped` counted from `t.reviews`' `Verdicts`.

- [ ] **Step 1: Write the failing tests**

`internal/factoryd/gates_test.go` — `TestLastVerdictCarriesVerdicts`: `lastVerdict` over reviews whose last has `Verdicts` yields the earlier input with the verdicts (assert through whatever JSON shape the existing `TestLastVerdict` pins; extend it). `TestReviewPromptNamesDrops`: the prompt built for an earlier review with `Verdicts` contains the dropped finding's text with its evidence and the sentence that a re-raise goes to the human; the prompt built without verdicts contains none of it and is byte-identical to today's.

`internal/factoryd/workflow_test.go` (the `workflowHarness`) — the scripted `sessions` closure gains the ability to return `CheckIn` (extend `pushed(session, commit)`'s family with `checkinPushed(session, commit, ck *CheckInOutcome)` and `checkinStopped(session string, outcome SessionOutcome, ck *CheckInOutcome)`). Then:

`TestWorkflowGateFindingsRunTheCheckin`: a first session pushes, the scripted review returns `concerns` with one finding, the second scripted session result is `checkin_human` (goal conflict). Assert: the second `SessionInput`'s `CheckInAsk` is non-nil (capture the inputs — the harness records them; if it does not, add a `gotInputs []SessionInput`), its `Findings` holds the review finding, `Findings[0].Source` is `review`; the escalation asked carries `check-in: goal_conflict:` in its reason (`g.escalated`); `g.steps` holds `checkin`; the attempt count never grew (assert `attempt` through the harness's session results count).

`TestWorkflowCheckinDroppedVerifiesAgain`: the second result is `checkin_dropped` with the finding dropped and evidenced; the scripted `review` closure returns approve on its second call. Assert: the review activity ran twice, the second call's earlier input carries the verdicts, the third session never ran, approval ran once, merge once, `g.steps` holds `checkin` then `model_review` (round 2) then the approval.

`TestWorkflowReraisedDropGoesToTheHuman`: the re-review returns the same finding again; the third result is `checkin_dropped` again (the guard in the runner cannot be scripted at this level — the workflow test scripts the outcome the guard produces, which is `checkin_human`). Assert: the escalation's reason names `re-raised after a drop` and the card lines (the harness `card`) hold both the drop evidence and the re-review's finding.

`TestWorkflowConfirmedTwiceGoesToTheHuman`: round one confirm → session two pushes → review same finding → check-in confirms again (script the outcome `checkin_human`, reason `confirmed 1 times`). Assert the ask.

`TestWorkflowChecksFindingsDroppedEndOnTheCard`: red checks finding; `checkin_dropped`; the checks return red again on the second verify; the third result is `checkin_human` (`re-raised after a drop`). Assert the ask and that no session ran on the dropped round.

`TestWorkflowHandoverReplacesHandoverLines`: a session ends `no_push` with a last message; the next round runs a check-in that ends handover. Assert the second `SessionInput`'s findings hold the stop lines but no `the agent's last message:` line and no `the branch holds` line; and that `handoverLines` is unchanged when `gateFindings` is false (the existing no-push tests already pin that — they must stay green).

`TestWorkflowCapReturnCarriesCheckin`: at the cap with red checks, the human answers a change request (the harness's change-request signal; `grep -n 'SignalChangesRequested' workflow_test.go`). Assert the granted session's `CheckInAsk.Findings` hold the change request with source `changes`, and its handover step exists.

`TestReconcileRebuildsCheckinVerdicts`: record a `checkin` step with verdicts through the store (the step recorder), run `Reconcile`, assert the rebuilt reviews' last entry carries the verdicts and `gateFindings` is false (the drop was consumed before the restart) — and the degraded case: a restart between the findings and the check-in leaves `gateFindings` false and the round runs without a check-in (assert the input's nil ask), with a comment in the test naming the degradation.

`internal/console` — extend the approval card render test: a `MergeSpec` whose `Review.Verdicts` hold a drop with evidence and a remark renders both on the card, evidence and all; a spec without verdicts renders byte-identical to today.

- [ ] **Step 2: Run to verify they fail**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run 'LastVerdict|ReviewPrompt|Workflow' 2>&1 | tail -20`
Expected: compile FAIL (`unknown field Verdicts`, `unknown field gateFindings`).

- [ ] **Step 3: Implement**

1. `gates.go`: `Review.Verdicts map[string]CheckVerdict \`json:"verdicts,omitempty"\`` after `Adjudicated`, comment: "the check-in's verdicts, keyed by finding text, next to the adjudications; a drop carries its evidence". `lastVerdict` includes the verdicts in the earlier input it builds (read its body first; it returns a value the activity JSON-encodes). `reviewPrompt`: replace both repeat sentences (762, 767) with: "`When last_review is present, it holds your last review of an earlier head of this task, whose findings went back to the agent, and verdicts holds what the check-in made of each: a finding marked dropped carries the evidence that dropped it — judge the head again on what you see now; list such a finding again only against new evidence, and say in your summary when you do, for a re-raised drop goes to a human with both records.`" (the parts form at 767 likewise, with `last_findings`). When the earlier review carries no verdicts, the sentence must not appear — build it conditionally as `names_in_other_parts` is.
2. `workflow.go`: `gateFindings` and `lastGates` on `taskRun` beside `judged` (1071 area). In the attempt loop:
   - after `t.lastRound = last; v = t.verify(res.Commit)` (1644): set `t.lastGates` inside the stages pass (`runStages` stores `*g` into `t.lastGates` when the commit matches — one line in `runStages` after the gates resolve; read where `g` is built, workflow_stages.go:117-180).
   - `apply(v)` (1160 area): when `len(v.findings) > 0`, set `t.gateFindings = true`; the drained-changes block (1464-1470) sets it too when it appends.
   - the `RunSession` call (1504): build `CheckInAsk` when `t.gateFindings && t.cfg.Task.CheckIn > 0` — `checkinAsk(slices.Concat(findings, own), sources, t.lastGates)` where sources names each finding's origin (review findings from `v`, the stop lines `session`, change requests `changes` — keep a parallel `[]string` gathered where the findings are; the lazy shape is `checkinAsk` taking `[]CheckFinding` built at each site). Clear `t.gateFindings` after the call.
   - after the result: `if res.CheckIn != nil { t.recordCheckin(res) }` — the `checkin` step with `res.CheckIn.Record` merged with the verdicts, reason and decision; on decision handover, the `handover` step with the text and `res.SessionID`. Attach the verdicts: `if len(t.reviews) > 0 && res.CheckIn != nil { t.reviews[len(t.reviews)-1].Verdicts = res.CheckIn.Verdicts }`.
   - the switch (1611) gains two cases before the `NoPush` group:
```go
		case OutcomeCheckinHuman:
			if final, why := held(t.awaitHuman("check-in: "+cmp.Or(res.CheckIn.ReasonKind, "gate") +": "+res.Reason, nil)); final != "" {
				return t.finish(final, why)
			}
			buy()
			continue
		case OutcomeCheckinDropped:
			// every finding dropped with evidence: no body — control flows
			// on to the shared startRef, verify and apply below, whose
			// re-review judges the head again on the drop record; only its
			// own approve merges, and a finding it re-raises comes back as
			// checkin_human through the runner's re-raise guard
		}
```
   (`buy()` is the closure the `OutcomeEscalate` case at 1620-1627 uses; the human's answer buys the session, as the design says.)
   - `handoverLines` (1699): return nil when `t.gateFindings` was set for the coming session — the lazy shape: `handoverLines` gains no parameter; the two call sites pass `res` and the loop knows the flag; move the decision to the `own = slices.Concat(...)` line (1589): `own = res.Findings; if !checkinComing { own = slices.Concat(own, t.handoverLines(res)) }` where `checkinComing` is the condition built for the `RunSession` call. Comment: the check-in's handover replaces these.
3. `workflow_stages.go`: the review branch's fall-through (560-600) — when the review has no findings and `len(review.Verdicts) > 0` (a check-in round's re-review), the round proceeds exactly as today's fall-through; when it has no findings and no verdicts, plan A's remark line stands. No code change may be needed here beyond reading it — verify and only touch what the tests force.
4. `activities.go`, `Reconcile` (1412): the reviews rebuild merges `checkin` steps' verdicts into the review of their round (the step detail carries `round` — put it there in `recordCheckin`). `gateFindings` is not rebuilt (stated degradation; the test pins it).
5. `internal/console`: the approval card's review section renders `verdicts` — one line per verdict: `dropped (evidence): <finding>` and `remark: <finding>`; confirmed findings appear as the findings they already are. Follow the template's existing `Dropped` rendering if plan C added one; reuse its shape.

- [ ] **Step 4: Run the tests**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ ./internal/console/... 2>&1 | tail -20`
Expected: PASS, and every pre-existing workflow test stays green — especially `TestWorkflowReplaysLiveHistories` (1841): if a live history now diverges, the divergence is a bug in this task's gating, not a reason to re-record.

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd internal/console
git commit -m "workflow: gate findings meet the check-in first; a dropped round verifies again on the drop record, and only the review's own approve merges" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
git pull --rebase origin main
```

---

## Task 7: The replay scenarios of the eight problems

What happens today. The design's promise: "Every model role is stubbed by its recorded answer. The check-in is stubbed by a scripted one. The assertion is who gets asked, and when." The eight problems of 2026-10-15 (design section 4, the table at 244) become workflow tests on the `gateHarness` (workflow_gates_test.go:20) and the `workflowHarness` (workflow_test.go:68), with the check-in scripted through the `CheckIn` field Task 5 gave `SessionResult`.

**Files:**
- Create: `internal/factoryd/ladder_replay_test.go`

**Interfaces:**
- Produces: `TestLadderReplaysTheEightProblems` with eight subtests named `#837_concerns_remarks`, `#836_false_finding_dropped`, `#839_cap_return_carries_the_handover`, `#838_red_checks_never_approve`, `#851_planner_still_asks_the_human`, `#856_waiting_stays_waiting`, `#853_change_request_reaches_the_session`, `#854_seven_of_eight_dropped`.

- [ ] **Step 1: Write the fixtures and the tests**

One subtest per problem, each with a comment naming the design section it replays. Hand-derive every expected ask, session count and step. The fixtures are the recorded shapes, compressed:

1. **#837 concerns remarks** — review returns `concerns` with one opinion finding ("the merge rule reads oddly"); the scripted check-in remarks it (`CheckRemark`), decision handover; the coding session's result `no_push` with no findings of its own. Assert: one session ran (the remark started none — the design: remarks block nothing), the approval was asked once, `g.steps` holds the `checkin` step with the remark on it.
2. **#836 false finding dropped** — review returns `concerns` with `TasksByPR has no implementation`; the check-in drops it with `store.go:672 at main: func (s *PGStore) TasksByPR`; the re-review approves; merge. Assert: sessions == 1, no second `RunSession`, the second review's input held the verdicts (`h.reviewInputs` — capture them as in Task 6), merge ran, the `handover` step exists, and the drop evidence appears on the approval's card lines.
3. **#839 cap return carries the handover** — two `not_started` results (starved), then the cap card; the human answers with a change request naming two tests; the granted session's ask carries the request with source `changes`; the check-in hands over "stamp the test rows, do not drop the check"; the session pushes. Assert: the ask (cap card) precedes the session, `CheckInAsk` non-nil, the `handover` step, merge at the end.
4. **#838 red checks never approve** — at the cap, checks red; the approval card returns (`MergeSpec.RedChecks`), never Approve-merges (`AutoMerge` refuses — assert no merge activity); the human answers request changes with the one-line fix; the check-in hands it over; the session pushes; checks green; merge. Assert the order: escalated → answered → checkin → session → merge, and that `checkin_ask`'s findings name the red check.
5. **#851 planner still asks the human** — a plan task (`TaskConfig` of the planner lane) whose wall clock expires. Assert: failed with the time-cap reason, the human asked, **no `checkin` step** (the gate moment does not exist on a card with no review).
6. **#856 waiting stays waiting** — a task in `waiting-deps` quiet past the stale window with `Alive` true (the harness's `Alive` stub of plan C). Assert: no escalation, no nudge recorded, no check-in.
7. **#853 change request reaches the session** — an old cap answer in `t.answers`, then a change request arrives mid-wait (the drain path). Assert: the session's input carries the change request as a finding **and** `CheckInAsk` set; the check-in hands over; the session acts on the request (its result pushes); the old answer appears below the findings in the brief's inputs (the answers order plan A pinned — keep its assertion).
8. **#854 seven of eight dropped** — verify at the cap returns eight findings; the check-in drops seven with evidence, confirms one; the confirmed finding (prior confirmed 0, `checkin_sessions` 1) starts one session; it pushes; the review returns the same eight; the check-in now faces `PriorConfirmed: 1` on the confirmed one → the scripted outcome is `checkin_human` with reason `confirmed 1 times`. Assert: exactly two sessions, the human asked once with both records on the card (the drop evidence of the seven and the confirm-twice), and never a merge.

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run TestLadderReplays 2>&1 | tail -20` — Expected: PASS, eight subtests.

- [ ] **Step 2: The recorded-answer ledger comment**

Top of the file, one comment block: which recorded facts each fixture compresses (the design's table at 244: #836's `TasksByPR` at store.go:672, #838's one-line fix, #839's two named tests, #854's eight findings and the 5 EUR fund), and that the stubs stand in for the recorded model answers until the live validation of escalation-ladder-validation.md section 2 runs against real cards.

- [ ] **Step 3: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd/ladder_replay_test.go
git commit -m "the eight problems of 2026-10-15 replayed: who gets asked, and when, with the check-in at the gate" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
git pull --rebase origin main
```

---

## Task 8: Architecture notes (docs repo)

**Files:** Modify `/home/womb/repos/ai-software-factory/docs/architecture.md`, `/home/womb/repos/ai-software-factory/docs/plans/2026-10-15-escalation-ladder-implementation.md` (its State section only).

- [ ] **Step 1: Edit the passages**

1. Where the review and the gates are described (`grep -n 'model review' docs/architecture.md`): add the check-in at the gate moment — a conversation under purpose `checkin` on the class's `checkin_model` (else the review alias), run by factoryd inside the next session's pod before the coding conversation, with its three verdicts, the evidence rule, the three guards in code, the re-review on the drop record, the handover at the top of the brief, and the records (`checkin` and `handover` steps, ledger refs `checkin/<alias>`).
2. Where the escalation ladder's phases are listed (the architecture's ladder paragraph, `grep -n 'escalation ladder' docs/architecture.md`): phase 2's plan D is landed; the in-session and dead-session moments are plan E's and reuse the runner, the tools, the records and the alias with a different `Moment`.
3. `docs/plans/2026-10-15-escalation-ladder-implementation.md`: one State line — plan D written (this file), executed on its branch, landed with the roll and the infra keys; the three design-vs-code conflicts and their resolutions, one line each.

- [ ] **Step 2: Commit**

```bash
cd /home/womb/repos/ai-software-factory && git add docs/architecture.md docs/plans/2026-10-15-escalation-ladder-implementation.md
git commit -m "architecture: the check-in at the gate moment, plan D landed" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
git pull --rebase origin master && git push origin master && git push forgejo master
```

---

## Landing

1. **Rebase.** On the worktree branch: `git pull --rebase origin main` before every push; final rebase onto main immediately before landing (main moves while plans run — plan C rebased onto 11 commits).
2. **Gates.** `bash check` (vet, gofmt, gosec, `make test`) on the final tree; `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ ./internal/gateway/... ./internal/policy/... ./cmd/...` green; `TestWorkflowReplaysLiveHistories` green on the final tree.
3. **Land.** Merge to `main` (fast-forward the branch), push to `origin` and `github`; file the roll card; the newer-tip roll watch of plan C's lesson applies (a cancelled run is not a red one — check the run's own status, not the commit status's reading of it).
4. **Roll.** After main CI builds the factoryd image and the roll card settles, port-forward checks: file a scratch card with a forced review finding and watch the `checkin` step appear; `grep` the gateway ledger for `ref like 'checkin/%'`.
5. **Infra keys after the roll.** Task 1 Step 6: the LiteLLM `checkin` alias and its price may land before the roll; the `policy.yaml` keys (`checkin_model`, the five `limits` keys) and the regenerated `factory/schema/policy.schema.json` land only after the image that knows them runs, then config check and policy tests green.
6. **Not verified by this plan.** The live check-in conversation against the real gateway and LiteLLM (the runner is tested against fakes); the pod's `/tool` round-trip latency under a real workspace; the alias's price until the `/model/info` probe runs; plan E's moments are design statements here, not code.

## Final verification (after Task 8)

- [ ] In the code repo: `bash check`. Expected exit 0.
- [ ] `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/... ./cmd/...` Expected `ok` throughout.
- [ ] `TestWorkflowReplaysLiveHistories`, `TestLadderReplaysTheEightProblems` named in the report with their `ok` lines.
- [ ] Remove the worktree and prune; state in the report what was not verified (the landing section's item 6).

## Self-review

- Spec coverage: gate moment Task 5-6; evidence rule and three verdicts Tasks 2-3; drop guardrails Tasks 2 and 6 (evidence on the card, drop never approves, re-raise with both records); remark Task 6 step 3 and scenario 1; handover Tasks 4-6; limits in code Task 1 with the table; own alias Task 1 and the gateway pass-through test; next-session pod, no new shape or credentials Tasks 4-5; records Task 5-6 and the validation doc's three record kinds (check-in, finding verdicts on the review and in the step, handover with its reader); cap completion Task 6 (`checkin_dropped` verifies again; the cap return carries the ask) and scenario 3-4; replay Task 7. The three decided points are stated in their own section; plan E's extension points in the Architecture paragraph and Task 8.
- Placeholders: the recorded answers of the eight fixtures are compressed to the design's table (the live validation against real cards is the design's own follow-up); the alias's price needs the live `/model/info` probe (plan C's Step 9 pattern); everything else is pinned to symbols and expectations.
- Type names: `CheckInAsk`, `CheckInOutcome`, `CheckFinding`, `CheckVerdict`, `CheckInRecord`, `CheckCall`, `CheckinChat`, `CheckinRequest`, `CheckinResponse`, `podTools`, `runCheckin`, `checkinStatement`, `evidenceOK`, `applyVerdictGuards`, `cutHandover`, `checkinGateway`, `runnerTools`, `checkinBlock`, `recordCheckin`, `checkinAsk`, `OutcomeCheckinHuman`, `OutcomeCheckinDropped`, `Review.Verdicts`, `taskRun.gateFindings`, `taskRun.lastGates` are used with one signature across tasks. `CheckIn` (the policy duration) and `CheckInAsk` never collide.
