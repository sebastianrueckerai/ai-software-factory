# Needs-you cards: every human card asks a question, the heartbeat goes, a cleared alert closes itself

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No card reaches a person without the five-part question and its buttons, the two heartbeats and the prompt rule that wrote #1132, #1184, #94, #102 and #108 go, and an alert that clears closes the human card nobody touched.

**Architecture:** `EscalateToHuman` and `fileHumanTask` become the only ways a human card is filed, both from a `HumanQuestion`: the ask is the title, the five parts are the body, the intake row and the `question_asked` row carry all five. The board gives every human card its question and one answer route acts on its buttons. The chat's escalate tool takes all five parts. The Waker loses its heartbeat and its pulse. The alert sweep closes an untouched human card once its alert cleared.

**Tech Stack:** Go 1.25, Postgres (the PG tests), Go templates, the existing fakes in `internal/factoryd` and `internal/console` tests.

**Spec:** [docs/question-format-concept-2026-10-17.md](../question-format-concept-2026-10-17.md) (the five parts, the console rendering, "no question can reach a human unshaped, from any source") and Sebastian's decisions of 2026-10-20 in this session: both heartbeats go, the prompt rule "call escalate once" goes, a cleared alert closes its untouched human card.

## Global Constraints

- `go test -race ./...` green, `gofmt -l` empty, `go vet ./...` and `gosec` clean before every commit. The PG tests run where the suite runs them today.
- The five parts in one order: ask, why, info, recommendation, choices. The ask is one sentence, no newline, at most 200 bytes. The card's title is the ask, never a cut of it.
- No rule in a prompt that a tool or a deterministic step can carry (project CLAUDE.md). Prompt text only shrinks in this plan.
- One way: a human card is filed by `EscalateToHuman` or `fileHumanTask`, both from a `HumanQuestion`. No free-text human card survives.
- Comments: only what code cannot say. No change narration. Tests derive their expected values by hand from the spec.
- Each task is one commit on the worktree branch. Commit messages are one line in the repository's voice (see `git log`).

## Review Focus

1. An escalate ask with a newline or over 200 bytes is refused with the rule, never cut (Task 6).
2. A person closes the issue of an alert card in the same minute the sweep closes it: the card ends once, no second end (Task 7).
3. An agent's own choices repeat "Leave it waiting" or "End the card": the labels stay unique (Task 5).
4. A question row with no close choice, a row from before this build: the card keeps its own Close button (Task 4).
5. A cleared alert on a card a person parked from the board: the park counts as touched and the card stays (Task 7).

---

### Task 1: The heartbeat goes

**Files:**
- Modify: `internal/factoryd/wakes.go` (the `Pulse` field at 60-61, the `heartbeat` call in `passProject` at 135-137, `heartbeat` at 302-365, `heartbeatText` at 400-405, the type comment's mention of the heartbeat)
- Delete: `internal/console/heartbeat.go`, `internal/console/heartbeat_test.go`
- Modify: `internal/console/console_test.go:2352-2370` (the PulseState test goes)
- Modify: `cmd/factoryd/main.go:601-612` (the `Pulse` wiring goes)
- Modify: `internal/factoryd/timers_test.go` (`TestHeartbeatOpenHourlyIdleDaily` at 206-285 and `TestHeartbeatGatesBeforeThePulse` at 472-510 go; `TestDeadBudgetHeartbeatAsksForMoney` at 428-470 becomes `TestDeadBudgetTimerAsksForMoney`)
- Modify: `internal/console/chat.go:1366` (the prompt sentence)

**Interfaces:**
- Produces: `Waker` without `Pulse`; `wakeKinds` unchanged; the marks `hb:open` and `hb:idle` are never written again (old rows stay, harmless).

- [ ] **Step 1: Write the failing tests** in `timers_test.go`: `TestNoWakeWithoutAnEventOrTimer` (a project at autonomous with no events, no timers, no watches; advance the fake clock by 25 hours in one-hour passes; `calls` stays empty). Rewrite `TestDeadBudgetTimerAsksForMoney` from the heartbeat version: a due `ChatTimer` on a dead chat budget files the month-cap card once and no wake runs; after the cap rises the next pass fires the timer with `birth == "wake_timer"`.
- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestNoWakeWithoutAnEventOrTimer|TestDeadBudgetTimerAsksForMoney' -v` → `TestNoWakeWithoutAnEventOrTimer` FAILS (the daily heartbeat wakes).
- [ ] **Step 3: Delete** `heartbeat`, `heartbeatText`, the `Pulse` field and its call, `internal/console/heartbeat.go` and its test, the PulseState test in `console_test.go`, the `Pulse` wiring in `main.go`, and the two heartbeat tests. Update the `Waker` type comment: wakes fire on asks, watched cards and timers.
- [ ] **Step 4: Edit the prompt** in `chat.go:1366`: delete the sentence `You never invent a task: when nothing on the roadmap is ready, call escalate once, naming the state, each remaining item with the reason it fails and the roadmap's open questions, then park.` and keep `You never invent a task. You file your own tasks only where the roadmap grants it in an explicit line.` as two sentences.
- [ ] **Step 5: Run** `go test -race ./internal/factoryd/ ./internal/console/ ./cmd/factoryd/` → PASS. `grep -rn "heartbeat" internal/factoryd/wakes.go internal/console/*.go | grep -v "events.go\|lab_test\|_test.go:.*stream"` → only the SSE stream's `heartbeat` in `events.go` remains.
- [ ] **Step 6: Commit** `the heartbeat goes: a wake fires on an ask, a watched card or a timer, never on the clock`.

### Task 2: One filer for human cards, from a question

**Files:**
- Modify: `internal/factoryd/chat_escalation.go` (`EscalateToHuman` at 23-80)
- Modify: `internal/factoryd/monthcap.go:258-300` (`fileHumanTask`)
- Test: `internal/factoryd/chat_escalation_test.go`, the `fileHumanTask` callers' tests (`grep -rln "fileHumanTask\|needs you: " internal/factoryd/*_test.go`)

**Interfaces:**
- Produces, in `chat_escalation.go`:
  - `const MaxAsk = 200`
  - `func questionBody(q HumanQuestion, footer string) string`: the fenced ask, then `Why: `, `Info: `, `Recommendation: ` (when set), `Choices:` as a `- label` list (when any), then `footer`, then `filed by factoryd`. The body `EscalateToHuman` writes today, factored out.
  - `func recordAsk(ctx context.Context, store interface{ InsertIntakeEvent(context.Context, IntakeEvent) (int64, error) }, tl *Timeline, t Task, q HumanQuestion, by, asker, via string) error`: inserts the `IntakeEscalation` row (`Body: q.Ask`, `Question: &q`, `Choices: q.Labels()`, `Author: "factoryd"`) and records the `EventQuestionAsked` row with `question`, `ask`, `why`, `info`, `source`, `by`, and `recommendation` and `choices` (the labels) when present.
  - `EscalateToHuman` keeps its signature. The title is `q.Ask` with whitespace collapsed, truncated at `MaxAsk` as a guard. It calls `questionBody` and `recordAsk`.
  - `fileHumanTask(ctx, store, forgejo, tl, repo, q HumanQuestion, labels []string, t Task) (Task, int64, error)`: title `q.Ask`, body `questionBody(q, "factoryd asks ("+t.Source+"). Answer on the card in the console or in the chat's inbox, or close this issue once decided.")`, the dedupe by open issue title as today, then `recordAsk` with `by: "factoryd"`, `asker: t.Source`, `via: ViaFactoryd`. The intake row goes in the dedupe branch too: a re-adopted issue has no ask without it.

- [ ] **Step 1: Write the failing tests.** In `chat_escalation_test.go` extend `TestEscalateToHuman`: the issue title equals the ask (no `needs you: ` prefix, no cut); the body holds the five parts in order; the intake row's `Question` is the question and its `Choices` are the labels; the `question_asked` detail holds `recommendation` and `choices`. Add `TestEscalateToHumanGuardsTheAsk`: an ask of 300 bytes files with a title of at most 200 bytes ending in `…`. Add `TestFileHumanTaskRecordsTheAsk` in `monthcap_test.go`: `fileHumanTask` with a question writes the intake row with the question and the `question_asked` row; a second call with the same ask adopts the open issue and still writes the rows.
- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestEscalateToHuman|TestFileHumanTask' -v` → FAIL.
- [ ] **Step 3: Implement** `questionBody`, `recordAsk`, the new `fileHumanTask` signature, and the title rule in `EscalateToHuman`. The two `fileHumanTask` callers (monthcap.go:245, routine_run.go:103) compile against the new signature in Task 3; until then pass a `HumanQuestion{Ask: title, Info: body}` so this task builds and commits on its own.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` → PASS. Fix every test that asserted the old `needs you: ` title (`grep -rn "needs you: " internal/factoryd/*_test.go internal/console/*_test.go`).
- [ ] **Step 5: Commit** `a human card is filed from its question: the ask is the title, the five parts the body, the rows carry them all`.

### Task 3: Every free-text human card asks a question

**Files:**
- Modify: `internal/factoryd/question.go` (the templates go after `stallQuestion`)
- Modify: `internal/factoryd/signozwebhook.go:690-712` (the human branch), `internal/factoryd/rolltask.go:928-948`, `internal/factoryd/mainfix.go:137-150`, `internal/factoryd/policy.go:760-770`, `internal/factoryd/monthcap.go:236-250`, `internal/factoryd/routine_run.go:101-108`, `internal/factoryd/intake.go:849-853`
- Test: `internal/factoryd/question_test.go`, each site's filing test

**Interfaces:**
- Produces, in `question.go`, each returning `HumanQuestion`:
  - `alertQuestion(a SigNozAlert, project, ns string, why, body string)`: Ask `fmt.Sprintf("%s fires the alert %s%s in %s of %s since %s: handle it, or wait for it to clear?", source, name, on, ns, project, stamp(a.StartsAt))` with `source`, `name`, `on` as `alertIssue` builds them; Why the caller's `why` (`"the project runs no agents"` or `"a capacity alert needs a person's evidence: a coding agent can only raise a limit"`); Info the body `alertIssue` builds today (value, annotations, labels, link); Choices `{AnswerPark, "Wait for it to clear"}, {AnswerClose, "Handled, close"}`.
  - `rollRefusedQuestion(short string, names []string, lines []string, runURL string)`: Ask `"roll <short> refused: <names> not signed with the factory's key. Fix the signing, then close."`; Why the signature rule (today's second paragraph); Info the run link and the `- ` list of images with today's "find which, fix it" paragraph; Choices `{AnswerClose, "Fixed, close"}`.
  - `rerunQuestion(short, failed string, lost []string)`: Ask `"main is red at <short>: re-run <failed>, its runner was lost."`; Why today's first paragraph; Info the lost records and today's "Re-run each job" paragraph; Choices `{AnswerClose, "Re-ran it, close"}`.
  - `configRejectedQuestion(dir, short, link, stays, reasons string)`: Ask `"config: <dir>/ at <short> rejected: fix the files and push."`; Why `stays`; Info the fenced reasons and today's "the next valid commit" sentence with the link; Choices `{AnswerClose, "Fixed, close"}`.
  - `monthCapCardQuestion(limit float64, month string, eur float64, link, refusal string)`: Ask `"The month cap of <limit> EUR is reached (<month>): raise it, or let the factory stand until the month ends?"`; Why the spend sentence with both numbers; Info today's "The gateway refuses every further call" paragraph with the link and the refusal; Choices `{AnswerPark, "Let it stand"}, {AnswerClose, "Decided, close"}`.
  - `routineQuestion(rt policy.Routine, brief, provenance string)`: Ask `rt.Title`; Why `"the routine <rt.Name> fired and files to a person"`; Info `brief` then `provenance`; Choices `{AnswerClose, "Done"}`.
  - `issueQuestion(title, body, poster string)`: Ask `textutil.Truncate(oneLine(title), MaxAsk)`; Why `"filed by <poster> into the human lane"`; Info `body`; Choices `{AnswerClose, "Done"}`.
- Consumes: `EscalateToHuman`, `fileHumanTask`, `recordAsk` from Task 2.

- [ ] **Step 1: Write the failing test** `TestHumanCardQuestions` in `question_test.go`: one subtest per template asserting the Ask is one line under 200 bytes, the Why and Info are non-empty, and the Choices are exactly the values listed above in that order.
- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run TestHumanCardQuestions -v` → FAIL (undefined).
- [ ] **Step 3: Implement** the seven templates. Then swap each site: the alert human branch files through `EscalateToHuman(ctx, in.Store, in.Forgejo, in.Timeline, repo, alertQuestion(...), "factoryd", t)` keeping `t`'s fields (Source, ReproBase, AlertFingerprint, labels `bug`, `human`); the roll refusal, the re-run card and the config rejection call `EscalateToHuman` with their templates; the month-cap loader and the routine call `fileHumanTask` with theirs; the intake's human-lane branch calls `recordAsk` with `issueQuestion` right after the task row exists. `EscalateToHuman` gains a variadic tail `labels ...string` appended after `human`; the alert card passes `"bug"`, every other caller nothing.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` → PASS. Every filing test that asserted an old title or body adapts to the ask and the five parts (`grep -rn "alert: \|refused: \|re-run \|rejected\|month cap of" internal/factoryd/*_test.go`).
- [ ] **Step 5: Commit** `every human card asks a question: alerts, refused rolls, lost runners, rejected config, the month cap, routines and human-lane issues`.

### Task 4: The board shows every human card's question, and one route answers it

**Files:**
- Modify: `internal/console/board.go:1863-1868` (the human-lane branch), `internal/console/board.go:574-586` (`Closes`, `ChoiceCard`)
- Modify: `internal/console/actions.go:961-966` (the route), `internal/console/actions.go:1010-1080` (`doChoiceAnswer` becomes the human answer)
- Modify: `internal/console/answer.go:135-138` (the chat's human-card branch)
- Modify: `internal/factoryd/question.go` (`Offers`)
- Test: `internal/console/face_test.go`, `internal/console/actions_test.go`, `internal/console/answer_test.go`

**Interfaces:**
- Produces: `func (q *HumanQuestion) Offers(value string) bool`. `func (c *Console) doHumanAnswer(ctx context.Context, a actor, t factoryd.Task, text, value string) (string, error)` replaces `doChoiceAnswer`: `rerun_again`, `dismiss`, `retry` act as today; `park` and `keep_waiting` record `question_answered` and keep the card; `close` closes with the label as the note; any other offered value closes with the label as the note (the chat escalation's answers); a value the question does not offer is refused with the labels; free text on a card that is not a `choiceCard` is posted as the member's comment, recorded as `question_answered`, and the card stays; free text on a `choiceCard` is refused with the labels.
- `doAnswerValue`: `if t.Kind == "human" && t.Status == "waiting-human" && t.IssueNumber != 0 { return c.doHumanAnswer(...) }` replaces the `choiceCard` branch. `answer.go`'s `case t.Kind == "human"` routes through `c.doAnswer(ctx, a, id, choice)`.
- `board.go`: the human-lane branch sets `k.Question = bt.Question` for every human card. `Closes()` is false when `k.Kind == "human" && k.Question != nil && k.Question.Offers(factoryd.AnswerClose)`. `ChoiceCard()` stays source-based.

- [ ] **Step 1: Write the failing tests.** `face_test.go`: `TestAHumanCardShowsItsQuestion` (a human card from `EscalateToHuman` with a question of two choices renders its ask line and two buttons on the face, no Close of its own, and the drawer renders Why, Info and Recommendation); `TestAQuestionWithoutACloseKeepsTheClose` (a human card whose question offers only `park` keeps the card's Close). `actions_test.go`: `TestHumanAnswerParksClosesAndComments` (park keeps the card and posts nothing; close closes with the label; free text posts one comment and keeps the card; `nonsense` as a value is refused naming the labels). `answer_test.go` `TestChatAnswerRow`: an inbox press on a human card closes it with the pressed label as the note.
- [ ] **Step 2: Run** `go test ./internal/console/ -run 'TestAHumanCard|TestAQuestionWithout|TestHumanAnswer|TestChatAnswerRow' -v` → FAIL.
- [ ] **Step 3: Implement** `Offers`, the board branch, `Closes`, `doHumanAnswer`, the route, and the chat branch. Delete `doChoiceAnswer`'s name; the stall and roll tests keep passing through `doHumanAnswer`.
- [ ] **Step 4: Run** `go test -race ./internal/console/` → PASS.
- [ ] **Step 5: Commit** `the board shows every human card's question, and one route answers it`.

### Task 5: The parts travel: the plain question, the runner's rows, the inbox

**Files:**
- Modify: `internal/factoryd/question.go:100-140` (`ShapedQuestion`, `plainQuestion`)
- Modify: `internal/factoryd/activities.go:1058-1106`, `internal/factoryd/temporal.go:383-397`
- Modify: `internal/factoryd/pokes.go:241-252`
- Test: `internal/factoryd/question_test.go`, `internal/factoryd/activities_test.go`, `internal/factoryd/temporal_test.go` (or the stale sweep's test file), `internal/factoryd/pokes_test.go`

**Interfaces:**
- `func ShapedQuestion(reason string, f QuestionFacts, choices []string) *HumanQuestion`; `func plainQuestion(reason string, choices []string) *HumanQuestion`: the reason's lines are read once; a line `Why: ` fills Why (else the first line); a line `Recommendation: ` fills Recommendation with `Source` `"the agent's"` when the reason starts with `AgentAsks`, else `"the factory's"`; for an `AgentAsks` reason with choices, Choices are the agent's (`Value` and `Label` the choice text) followed by `{AnswerPark, "Leave it waiting"}, {AnswerClose, "End the card"}`, labels deduplicated keeping the first; otherwise `continueChoices()`.
- `activities.go`: `shaped = ShapedQuestion(reason, facts, choices)`; the `asked` map gets `recommendation` when set and `choices` as `shaped.Labels()` when `shaped != nil`. `temporal.go` the same with `nil` choices.
- `pokes.go`: the escalation row's content gains `"\nWhy: " + textutil.Truncate(why, 300)` when the detail has `why`. `saidHTML` in `chat.js` renders the line break; verify once in the browser or the lab, note the result in the commit.

- [ ] **Step 1: Write the failing tests.** `question_test.go` `TestPlainQuestionReadsTheAgentsParts`: reason `AgentAsks + "Ship A or B?\nWhy: both pass.\nRecommendation: A, it is smaller."` with choices `["A", "B", "End the card"]` → Ask `Ship A or B?`, Why `both pass.`, Recommendation `A, it is smaller.`, Source `the agent's`, Labels `["A", "B", "Leave it waiting", "End the card"]`. `TestPlainQuestionReadsASupervisorRecommendation`: a `gateStopped` reason with a `Recommendation: ` line → Recommendation set, Source `the factory's`, Labels `continueChoices`. `activities_test.go`: the `question_asked` row of an agent ask carries `recommendation` and the four labels. `pokes_test.go`: the escalation poke reads `#12 needs you: <ask>\nWhy: <why>`.
- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestPlainQuestion|TestEscalat|TestPoke' -v` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` → PASS.
- [ ] **Step 5: Commit** `an ask's recommendation and choices ride every row: the plain question reads them, the inbox shows the why`.

### Task 6: The chat's escalate tool takes five parts

**Files:**
- Modify: `internal/console/chat_tools.go:1459-1467`, `internal/console/answer.go:171-191`
- Test: `internal/console/answer_test.go` (`TestChatEscalate`)

**Interfaces:**
- The tool schema: `required: ask, why, info, recommendation, choices`; `choices` `minItems: 2`; the ask's description `"one sentence of at most 200 characters with its numbers; it is the card's title"`.
- `turn.escalate`: refuses an ask with a newline or over `factoryd.MaxAsk` bytes with `"ask: one sentence of 1 to 200 characters"`; refuses an empty recommendation with `"recommendation: the answer you would pick and where you read it, 1 to 2000 characters"`; refuses fewer than 2 choices with the existing choices message.

- [ ] **Step 1: Write the failing tests** in `TestChatEscalate`: a two-line ask is refused with the ask rule; a 201-byte ask is refused; no recommendation is refused; one choice is refused; all five parts file a card whose title is the ask and whose intake row holds the question.
- [ ] **Step 2: Run** `go test ./internal/console/ -run TestChatEscalate -v` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `go test -race ./internal/console/` → PASS.
- [ ] **Step 5: Commit** `the chat's escalate takes all five parts: a one-sentence ask, a recommendation and two to four choices`.

### Task 7: A cleared alert closes its untouched human card

**Files:**
- Modify: `internal/factoryd/signozwebhook.go` (a new pass beside `SweepSigNoz` at 460)
- Modify: `internal/factoryd/store.go` (`TouchedByPerson`), `internal/factoryd/store.go`'s `Store` interface
- Modify: `cmd/factoryd/main.go` (the pass runs where `SweepSigNoz` runs)
- Test: `internal/factoryd/signozwebhook_test.go`, the PG store test file that holds `IntakeEvents` tests

**Interfaces:**
- `func (s *PGStore) TouchedByPerson(ctx context.Context, taskID string, bots ...string) (bool, error)`: true when `intake_events` holds a row of the task whose author is not `factoryd`, `FactoryDecider` or one of `bots`, or `events` holds a `question_answered` row of the task.
- `func (in *AlertIntake) CloseCleared(ctx context.Context, now time.Time) error`: for every row of `in.Store.NewestAlertRows(ctx, AlertSigNoz, "")` without a verdict whose detail has `resolved_at` and whose task is a human card in `waiting-human` and not touched: `ResolveAlert(row.ID, row.Kind, VerdictUnjudged, "factoryd", {"closed": "cleared"})`, one issue comment `"factoryd: the alert cleared at <resolved_at>; nobody touched the card, so it closes."`, the issue closed through `in.Forgejo.CloseIssue(ctx, owner, repo, number)`, then `TransitionTask(waiting-human → closed)`, `countOutcome closed`, `mirrorTaskState closed`, `taskEnded(..., "closed", "the alert cleared at <resolved_at>")`. A task already final is skipped. An agent card is skipped. Errors join and the pass goes on.

- [ ] **Step 1: Write the failing tests.** `signozwebhook_test.go`: `TestAClearedAlertClosesItsUntouchedHumanCard` (row with `resolved_at`, human card waiting → the row's verdict `unjudged` by `factoryd`, one comment, the issue closed, the task `closed` with the `task_ended` reason naming the time); `TestAClearedAlertKeepsATouchedCard` (an intake row by `sebastian`, and separately a `question_answered` park → nothing changes); `TestAClearedAlertLeavesAnAgentCard`; `TestAClearedAlertSkipsAFinalCard`. The PG test `TestTouchedByPerson`: a bot comment is not a touch, a member's comment is, a park is.
- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestACleared|TestTouchedByPerson' -v` → FAIL.
- [ ] **Step 3: Implement** and wire the pass into the loop that runs `SweepSigNoz`.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/ ./cmd/factoryd/` and the PG tests → PASS.
- [ ] **Step 5: Commit** `a cleared alert closes the human card nobody touched`.

### Task 8: The alerts tool names a cleared alert

**Files:**
- Modify: `internal/console/chat_page_tools.go:82-84`
- Test: the file that tests `alertsText` (`grep -ln "alertsText\|Open alerts:" internal/console/*_test.go`)

- [ ] **Step 1: Write the failing test** `TestAlertsTextNamesAClearedAlert`: a row without a verdict whose detail has `resolved_at: 2026-10-20T15:12:30Z` reads `, cleared at 2026-10-20 15:12 UTC, verdict pending`; a row without it reads `, open`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `go test -race ./internal/console/` → PASS.
- [ ] **Step 5: Commit** `the alerts tool names an alert that cleared and waits for its verdict`.

### Task 9: Land

- [ ] **Step 1:** `bash check` (the repository's full local check: gofmt, vet, gosec, the race suite and the PG tests) → green. Merge the worktree branch into `main`, push `origin` and `github`.
- [ ] **Step 2:** Watch the roll: the roll card approves as the ledger's watcher does; factoryd restarts on the new image. Evidence: `kubectl logs` shows the pass, and `SELECT id, verdict, resolved_by FROM alerts WHERE id IN (1598,1599,1600,1601,1602,1603,1604,1613,1689,1708,1710)` reads `unjudged factoryd` for every untouched one; the ten infra cards read `closed`.
- [ ] **Step 3:** Close #102 and #108 on the infra project with the note `the daily heartbeat that filed this is gone` through the console as the operator.
- [ ] **Step 4:** Docs in `~/repos/ai-software-factory`: `docs/architecture.md` loses the heartbeat row at 2885 and the failsafe sentence at 2944 (the wake classes are asks, watched cards and timers), and gains one paragraph under the question format: every human card is filed from its question, and a cleared alert closes its untouched human card. The ledger `.superpowers/sdd/2026-09-24-build-plan/progress.md` gets the round's entry: the rulings (the heartbeat goes, reversing the main-agent concept's heartbeat row of 2026-10-17; the prompt rule goes; a cleared alert closes itself; every human card a question), the commits, the evidence of step 2. Commit and push the docs repository.
- [ ] **Step 5:** Delete the worktree, prune.
