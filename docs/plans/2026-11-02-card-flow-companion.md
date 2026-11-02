# The card flow companion: what the redesign leaves open, built beside it

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Written 2026-11-02. Status: plan, awaiting Sebastian's OK. Code references are to the code repository's `origin/main` at `70725856`. Main has moved to `8b4b5525` since, so grep for the symbol before trusting a line. Infra references are to infra main `2b59f75`.

**Goal:** Every open point of the fault register and the needs-you analysis that the card flow redesign does not carry gets built or scheduled here, in the redesign's shape, without touching the files its phase 1 edits or the workflow code its phase 2 owns.

**Architecture:** Three kinds of work. Sentences the redesign needs so that phases 2 to 5 build the right thing, written now as edits to [card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md). Code that needs no case record and no workflow change: the floor at every session opening, the enforced money on every face, a bound on a plan question at its writer, a refusal that names its error. A design round for the Needs-you cards' separation, run before phase 5 so the carousel lands inside the chrome the round picks. One task is outside the card flow: the runner's docker volume, fault 8 of the register, which no other plan holds.

**Tech Stack:** Go, Postgres through hand-written SQL, the console's Go templates and htmx, the design process of [design/process.md](../../design/process.md), Kubernetes and SigNoz for the runner.

**Spec:** [card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md), [needed-fixes.md](../needed-fixes.md) faults 2, 3, 4 and 8, [needs-you-analysis-2026-11-01.md](../../needs-you-analysis-2026-11-01.md) complaints 4, 5 and 9 and the grant-loop spec's second fix in [checkin-grant-loop-spec-2026-10-31.md](../checkin-grant-loop-spec-2026-10-31.md), [2026-11-02-unpayable-sessions.md](2026-11-02-unpayable-sessions.md) parts A, C and D.

## Why this plan exists

Opus read the register and the needs-you analysis against the redesign on 2026-11-02 and named seven points the redesign does not carry. This plan verified each against the three documents, the phase 1 plan and code main. The table gives the verdict and where the point lands.

| Point | Opus's claim | Verified | Where it lands |
|---|---|---|---|
| Fault 3, the digest's name | The redesign's card digest and the `digest(path, ask)` tool share one name | True in the prose. The phase 1 plan already keeps the code names apart: `CardDigest`, `card_step`, `board_digest`, never `digest` alone | Task 1, one sentence in 5.3. The tree hand stays Sebastian's, by the runbook |
| Fault 4, the chat's answer tool | A watch item the redesign does not mention | True, and the register's premise was wrong. The chat rows of 2026-10-31 show the two failures: the catch-all refusal "The answers could not be recorded; see the factoryd log" at 21:19:56 and 21:20:02, after two guards that named their action. The 4xx fix of 05cd9e12 was not this fault | Task 8 makes the five catch-all refusals carry their error. Task 1 pins that phase 2's one typed answer removes the fork between the answer and the plan tools |
| Fault 2, parts C and D | Not in the redesign | True. The board's Left, NearBudget, the brief line, the chat's card view, the chat budget message, the session's facts line, the pace and the spend warnings all read the settled `SpentEUR` and never the holds. The console skips the floor when a card has no alias | Tasks 2, 3 and 4. Part A, the floor at every opening, lands here too: it is the mechanism behind the redesign's rung 0 row and no phase builds it. Part B is that row, phase 2 |
| Complaint 4, the plan card fills the column | Not in the redesign | True. A question's text is checked non-empty only, the plan card's escalation text skips the 2000-byte cap the task cards get, and the face renders the revision, every question and the hold-outs at once | Task 5 bounds the question at the writer and caps the plan card's text. The fold of the revision is phase 5's face, Task 1 says so |
| Complaint 9, card separation | Sent to a round of its own and left out of the build order | True | Tasks 6 and 7, the round and the CSS |
| Grant-loop fix 2, no merge request on red checks | Not stated | Half true. `headGreen` sends a red head back to the agent until the checks stage's return cap, then opens the approval request with `RedChecks` set, which a human can only deny | Task 1 states the rule in 5.5 and 5.6 and names #1381 as a fixture. Phase 2 builds the row |
| Complaint 5, the record gap | The reversal of #506 is not named, and one case per plan question is not stated | True in the prose. Phase 1 already keys a case by the ask's text, and the planner records one `question_asked` event per question, so each question is its own case | Task 1, two sentences in 5.8 |

Opus missed one point: fault 8, the runner's docker volume, is in no plan. Task 9 holds it. Everything Opus marked covered is covered where Opus said.

## Global Constraints

- The code worktree starts from the code repository's `origin/main` at `8b4b5525` or newer. Rebase before every commit. Phase 1 of the redesign is being built on the branch `case-record` of that repository: after it merges, re-read every shared file this plan touches (`store.go`, `store_test.go`, `runner.go`, `chat_tools.go`, `board.go`) before the next commit.
- No change to workflow code (`workflow.go`, `workflow_stages.go`, `plan.go`'s loops, `queue.go`). That is phase 2's ground. Every change here runs in an activity, in the store or in the console, so no Temporal version gate is needed.
- No change to the files phase 1 creates or to the functions it modifies: `cases*.go`, `carddigest*.go`, `boarddigest.go`, `insertEvent` in `event_store.go`, `HealPass` in `temporal.go`, the `tools` table and the `card` tool's digest prefix in `chat_tools.go`, `checkinTools` and `checkinSystem` in `checkin.go`, `runnerTools.Tool` in `runner.go`, `drawer.html`, `board.html:93`, `brief.go`'s `write`, `digest_handler.go`.
- The name `digest` stays the file digest tool's. The card digest's names are `CardDigest`, `card_step` and `board_digest`.
- Every new store method goes on the `Store` interface (`store.go:289`) with a stub on `fakeStore` (`store_test.go:44`) and every other fake the compiler names. A new field on `Task` or `BoardTask` is scanned in every scanner the compiler and the tests name.
- Every refusal names the state and the fitting action.
- Text a person reads follows the writing guide (`internal/writingguide`): short words, British spelling. A human is a human, never a member or an operator.
- Tests: `make test` runs `go test -race -p 1 ./...` under a throwaway Postgres. `bash check static` runs vet, gofmt and gosec. Both green before every commit. Postgres tests use `schematest.DSN(t, name)` and skip without `FACTORYD_TEST_DATABASE_URL`.
- Commit messages state what changed and why, with no ruling number and no ledger path. The docs repository's `.githooks/pre-commit` refuses both.
- The infra repository sits outside every agent credential. A task that needs an infra commit ends with a runbook page in the shape of [digest-tree-hand-runbook-2026-11-02.md](../digest-tree-hand-runbook-2026-11-02.md), and the commit is Sebastian's hand.
- The design round follows [design/process.md](../../design/process.md), the condensed form, inside its cap. Read [design/models.md](../../design/models.md) before any critic call and [design/design-decisions.md](../../design/design-decisions.md) before changing the look. Provider keys live in the gitignored `.env.tools`.

## Review Focus

1. A card with no holds row shows every figure as today. `HeldEUR` is 0 and `Left()` equals budget minus spent. Pinned in Task 4.
2. A hold that expired but was not yet swept still counts, as the gateway's `TakeHold` counts it. The face and the enforcer agree until the sweep. Pinned in Task 4.
3. A dev factory with no prices configured opens sessions as before. The floor returns "" on the nil-Prices path. Pinned in Task 2.
4. A reattached session, one already open and paid into, is not floored a second time. The guard sits in the fresh-session branch alone. Pinned in Task 2.
5. A question of 300 runes passes and one of 301 is refused, counted in runes, so a German text with umlauts is not cut short by bytes. Pinned in Task 5.

---

### Task 1: The redesign carries the seven points

Docs repository. No code.

**Files:**
- Modify: `docs/card-flow-redesign-2026-11-02.md` sections 5.3, 5.5, 5.6, 5.8, 9 and 10
- Modify: `docs/needed-fixes.md` faults 2, 3, 4 and 8 (the status lines, done with this plan's commit)

- [ ] **Step 1: 5.3.** After the sentence "A later live monitor reads the same flags, so the digest is built once and read by four consumers." add:

  > The card digest is not the `digest(path, ask)` file tool of the session menu (fault 3 of the register, on code main since 448048b0). In code the names are `CardDigest`, `card_step` and `board_digest`, never `digest` alone.

- [ ] **Step 2: 5.5.** Add a third bullet to the two rules that live in the action functions:

  > An approval request opens only on a green head. A head still red after the checks stage's return cap is a cap case, not a request: rung 0 re-runs the checks once per red head, then rung 1 reads the log and picks the next session, whose note carries the checks log. Today `headGreen` sends a red head back to the agent until the cap, then opens the request with its red checks, which a human can only deny (#1381, 2026-10-31). The queue's withdrawal of a head whose checks went red at its merge stays. This is the grant-loop spec's second fix, which that build reached at the queue and not at the approval stage.

  And after the sentence "The chat's tools are the same functions." add:

  > The chat's answer tool and the human's send resolve a case by its id, whatever its kind, with one argument shape. A plan question and a stop are answered by the same call, so the fork between the answer and the plan tools that refused the chat twice on 2026-10-31 (fault 4) is gone.

- [ ] **Step 3: 5.6.** Extend two rows. The row "a cap, a pull request open, checks red with the checks log" becomes "hand to rung 1 with the log in the facts. No approval request opens." The row "budget headroom below the opening's cost" gains: "The floor that produces this trip runs at every opening, `RunSession` and `reportSession`, and every face shows the enforced money, budget minus spent minus holds. Both are built by the companion plan before phase 2. The ask that fires as the money ask before an attempt is this row."

- [ ] **Step 4: 5.8.** After "The column keeps one row per card, so the board's overview stays." add:

  > Each plan question is a case of kind plan question, keyed by its text as phase 1 keys every ask, and the confirmation is a case of kind plan confirmation. The carousel shows one, and the forms post one answer per question index as they do today. This reverses the presentation half of issue #506, "Every plan answer in one turn (roadmap 179)": the planner still asks all its questions in one turn, and the human reads and answers them one at a time. The plan card's face shows the five parts of one case and nothing raw. The revision's text, the summary and the hold-outs sit behind `card_step` and the drawer, and the brief writer's prose keeps the approval brief's bounds of 600 and 4000 characters. A question's text is bounded at its writer by the companion plan.

  Change the last sentence of 5.8 to:

  > The card separation on the face is a design round of its own, run by the companion plan before phase 5 with the carousel's count and arrows among the round's fixed parts, so phase 5 lands inside the chrome the round picked.

- [ ] **Step 5: Section 9.** After the five phases and before "Phases 1 and 2 need no model change" add:

  > Beside the phases, [the companion plan](plans/2026-11-02-card-flow-companion.md) carries what no phase builds: the floor at every session opening and the enforced money on every face (fault 2), the plan question's bound at its writer and the plan card's cap (complaint 4), the Needs-you cards' separation round (complaint 9), the catch-all refusals that name their error (fault 4), and the runner's docker volume (fault 8), which is outside the card flow.

- [ ] **Step 6: Section 10.** In the fixtures bullet, change "#1347, #1410, #1345 and #1451 are the four this document names." to "#1347, #1410, #1345, #1451 and #1381, the red head after the checks cap, are the five this document names."

- [ ] **Step 7: Check and commit.**

Run: `git diff --stat` shows the two files. `git commit` passes the pre-commit hook.

```bash
git add docs/card-flow-redesign-2026-11-02.md docs/needed-fixes.md
git commit -m "design: the card flow redesign names the red head's rule, one case per plan question and the #506 reversal, the one typed answer, the card digest apart from the digest tool, and the companion plan"
```

---

### Task 2: The floor at every session opening

Fault 2 part A. Every session opens through `RunSession` (`activities.go:800`) or `reportSession` (`report.go:135`), whose callers are the planner's `RunPlan`, the report's `RunReport` and the hold-out audit. Neither runs the floor today. The plan loop opens sessions with no floor at all.

**Files:**
- Modify: `internal/factoryd/activities.go` (`RunSession`, the `live == nil` branch at :904 to :923, before the Forgejo token mint)
- Modify: `internal/factoryd/report.go` (`reportSession`, the fresh-session path before its token mint, around :170)
- Modify: `internal/factoryd/runner.go:1701` (`startFailure`: a `stepBudget` beside the image and egress steps) and `:1734` (`escalation(then string)`: the budget step's wording states the money with no sandbox prefix)
- Test: beside the existing `RunSession` and `reportSession` tests (grep `StartFailed` under `internal/factoryd/*_test.go`)

**Interfaces:**
- Consumes: `(*Runner).funded(ctx, taskID, model string, opening bool) (string, error)` at `activities.go:640`. It returns the refusal text, "" when the opening can run or `r.cfg.Prices == nil`.
- Produces: `stepBudget` on `startFailure`. A refused `RunSession` returns the `SessionResult` the image and egress failures return today (grep `sessionResult` and `StartFailed`), with the refusal as its escalation. A refused `reportSession` returns `end.start` set to the refusal, which `RunPlan` already turns into an escalation (`plan.go`, grep `end.start`) and the plan loop counts as no attempt.

- [ ] **Step 1: Write the failing tests.**

```go
func TestRunSessionRefusesAnOpeningTheBudgetCannotPay(t *testing.T)
// funded returns a refusal → Outcome OutcomeEscalate, StartFailed true,
// the escalation contains "Fund the card (Fund on the board) and answer",
// no sessions row inserted, the pod maker not called.
func TestReportSessionRefusesAnOpeningTheBudgetCannotPay(t *testing.T)
// end.start contains the same phrase, no session row, no pod.
func TestRunSessionOpensWhenNoPricesAreConfigured(t *testing.T)
// cfg.Prices nil → the session opens as before.
func TestRunSessionDoesNotFloorAReattachedSession(t *testing.T)
// live != nil → funded is not called (count its store reads).
func TestReportSessionLeavesADayCapToTheCapWait(t *testing.T)
// funded returns a refusal DayCapped recognises → no start failure, the
// opening proceeds.
```

- [ ] **Step 2: Run them.** `go test ./internal/factoryd -run 'RefusesAnOpening|NoPricesAreConfigured|Reattached' -v` fails: the refusal is not produced.

- [ ] **Step 3: Implement.** In both fresh-session paths, before the token mint: `why, err := r.funded(ctx, t.ID, model, true)`. An error returns as the activity's error. A non-empty `why` that names the task's own money returns through `startFailure{step: stepBudget, text: why}`. The escalation wording for `stepBudget` is `why` followed by the action "Fund the card (Fund on the board) and answer". A refusal at the day, month or project cap is not a start failure: `DayCapped(why)` and its cap siblings (grep `CapDecision`) let the opening proceed, and the gateway's refusal of the first call takes the cap wait the loops already have. The loops are workflow code and do not change here.

- [ ] **Step 4: Run.** The four tests pass. `make test` and `bash check static` green.

- [ ] **Step 5: Commit.**

```bash
git add internal/factoryd/activities.go internal/factoryd/report.go internal/factoryd/runner.go internal/factoryd/*_test.go
git commit -m "every session opening runs the budget floor, so a card with less than an opening's cost gets a money ask and no dead session"
```

---

### Task 3: The console's floor covers a card with no alias

Fault 2 part D. `unfundedSession` (`actions.go:1256`) skips every card whose row has no model alias, on the strength of a comment that is false for plan tasks. `funded` already resolves the class's session model from the task's capabilities (`sessionModel`, `policy.go:765`).

**Files:**
- Modify: `internal/factoryd/activities.go:655` (`funded`: after `sessionModel`, an empty model returns "", nil)
- Modify: `internal/console/actions.go:1257` (drop the `t.ModelAlias == ""` clause)
- Test: `internal/factoryd/activities_test.go` (or where `funded` is tested), `internal/console/actions_test.go`

- [ ] **Step 1: Write the failing tests.**

```go
func TestFundedPassesACardWhoseClassHasNoSessionModel(t *testing.T)
// model "" and a policy document with no session_model for the class → "", nil.
func TestUnfundedSessionAsksTheFloorForACardWithNoAlias(t *testing.T)
// t.ModelAlias == "", SessionFunded stub records the call with alias ""
// and returns "0.10 EUR free, 0.60 needed" → the grant is refused with that text.
```

- [ ] **Step 2: Run them.** They fail: the stub is never called, and `funded` prices "".

- [ ] **Step 3: Implement.** Two edits as in Files.

- [ ] **Step 4: Run.** Pass. `make test`, `bash check static` green.

- [ ] **Step 5: Commit.**

```bash
git add internal/factoryd/activities.go internal/console/actions.go internal/factoryd/activities_test.go internal/console/actions_test.go
git commit -m "the console's floor reads the class's session model, so a plan card with no session yet gets the money ask instead of a silent pass"
```

---

### Task 4: The enforced money on every face

Fault 2 part C. `tasks.spent_eur` is the settled ledger sum. While a call flies its money is a hold, counted by the gateway's `TakeHold` and by `readTaskFree` (`policy/holds.go:633`) and by nothing a person or an agent reads. The one way: the task row reads carry the holds, and every figure a human or an agent decides on reads them. `tasks.spent_eur` itself stays the settled sum.

**Files:**
- Modify: `internal/factoryd/store.go:27` (`Task`: `HeldEUR float64` after `SpentEUR`, two methods), `:1189` (`PGStore.Task`: the holds subquery), and every scanner of the task row the compiler names
- Modify: `internal/factoryd/console_store.go:95` to `:99` (`boardTaskColumns`: the same subquery, `BoardTask.HeldEUR`, `scanBoardTask`)
- Modify: `internal/console/board.go:1581` (`NearBudget`), `:2029` (`Left`), `internal/console/approvals.go:149` (`BriefShort`), `internal/console/chat_budget.go:94`, `:129`, `:175`, `internal/console/chat_tools.go:749` (the `card` tool's money line, after phase 1's digest prefix), `internal/factoryd/runner.go:644` (`SessionFacts.SpentEUR`), `:1154` (`Pace`), `:1287`, `:2706` and `:2722` (the supervisor's spend warnings)
- Test: `internal/factoryd/store_pg_test.go` (or the file that tests `PGStore.Task`), `internal/console/board_test.go`, `internal/console/approvals_test.go`, `internal/console/chat_test.go`, `internal/factoryd/runner_test.go`

**Interfaces:**
- Produces: `Task.HeldEUR`, `func (t Task) EnforcedSpent() float64` (spent plus held), `func (t Task) Left() float64` (budget minus spent minus held), `BoardTask.HeldEUR` with the same two methods, and one SQL fragment `heldEURSQL = "(SELECT COALESCE(sum(eur), 0)::float8 FROM holds WHERE holds.task_id = tasks.id)"` in `store.go`, used by both reads.
- A history line keeps the settled sum: `lifeLine` (`board.go:3638`) and the sort at `board.go:224` do not change.

- [ ] **Step 1: Write the failing tests.** Hand-derived figures: budget 5.00, spent 4.50, one hold of 0.40.

```go
func TestTaskReadNetsHolds(t *testing.T)            // pg: HeldEUR 0.40, EnforcedSpent 4.90, Left 0.10
func TestTaskReadWithoutHoldsIsUnchanged(t *testing.T) // pg: HeldEUR 0, Left 0.50
func TestTaskReadCountsAnExpiredUnsweptHold(t *testing.T) // pg: expires_at in the past still counts
func TestBoardTaskReadNetsHolds(t *testing.T)       // pg: BoardTask.HeldEUR 0.40
func TestBoardLeftNetsHolds(t *testing.T)           // the card's Left renders 0.10, NearBudget as for 4.90 of 5.00
func TestBriefShortNetsHolds(t *testing.T)          // "has 0.10 EUR of its 5.00 EUR budget left"
func TestChatCardMoneyNetsHolds(t *testing.T)       // "€4.90 of €5.00"
func TestChatBudgetNetsHolds(t *testing.T)          // spent_eur 4.90
func TestSessionFactsSpendIncludesHolds(t *testing.T) // SessionFacts.SpentEUR 4.90
```

- [ ] **Step 2: Run them.** They fail: no `HeldEUR`.

- [ ] **Step 3: Implement.** The fragment, the field, the two methods, the scanners, then each surface reads `EnforcedSpent()` or `Left()`. The chat budget message's `spent_eur` is the enforced spend. The supervisor's warnings (`due`, `Spent`) take the enforced spend.

- [ ] **Step 4: Run.** Pass. `make test`, `bash check static` green.

- [ ] **Step 5: After phase 1's Task 4 merges**, `CardDigest`'s `HoldsEUR` reads `t.HeldEUR` instead of its own read, one line. Skip this step while phase 1 is unmerged and leave a note in the commit message.

- [ ] **Step 6: Commit.**

```bash
git add internal/factoryd/store.go internal/factoryd/console_store.go internal/console/board.go internal/console/approvals.go internal/console/chat_budget.go internal/console/chat_tools.go internal/factoryd/runner.go internal/factoryd/*_test.go internal/console/*_test.go
git commit -m "every money figure a human or an agent decides on nets the gateway's holds, the figure the caps and the floor already count"
```

---

### Task 5: A plan question is bounded at its writer, and the plan card's text is capped

Complaint 4. `questionFindings` (`plan.go:492`) checks a question's text non-empty only, where a choice is already bounded at `MaxChoice` 60 (`escalation.go:229`) and an outline part at `maxOutlinePart` 100. The plan card's escalation text is set raw (`board.go:2429`) where a task card's goes through `cardReason` (`board.go:2066`, `maxCardReason` 2000). The fold of the revision and the one-question face are phase 5's.

**Files:**
- Modify: `internal/factoryd/plan.go:81` (`MaxQuestion = 300` beside `maxQuestions`), `:504` (the bound in `questionFindings`)
- Modify: `internal/console/board.go:2429` (`k.Escalation = cardReason(e.Escalation)`)
- Test: `internal/factoryd/plan_test.go` (where `questionFindings` is tested), `internal/console/board_test.go`

**Interfaces:**
- Produces: `MaxQuestion` 300 runes. The finding reads `plan: question %d: text is over %d characters`, so the planner reads the bound and files again.

- [ ] **Step 1: Write the failing tests.**

```go
func TestQuestionFindingsRefuseATextOverTheBound(t *testing.T)
// 301 runes → one finding "plan: question 1: text is over 300 characters";
// 300 runes of "ü" → no finding.
func TestPlanCardEscalationIsBounded(t *testing.T)
// a plan approval card whose escalation is 3000 bytes renders at most
// maxCardReason bytes plus "\n- the rest is on the issue".
```

- [ ] **Step 2: Run them.** They fail.

- [ ] **Step 3: Implement.** One case in the switch, one call at the plan card.

- [ ] **Step 4: Run.** Pass. `make test`, `bash check static` green.

- [ ] **Step 5: Commit.**

```bash
git add internal/factoryd/plan.go internal/factoryd/plan_test.go internal/console/board.go internal/console/board_test.go
git commit -m "a plan question is bounded at 300 characters where the planner writes it, and the plan card's text gets the cap the task cards have"
```

---

### Task 6: The Needs-you separation round

Complaint 9. Docs repository. A design round in the condensed form of [design/process.md](../../design/process.md). The question is a CSS detail, so the candidates are built in the lab, not drawn.

**Files:**
- Create: `design/rounds/18-needs-you-separation/brief.md`, then the round's artefacts as the process names them: candidates under `design/prototypes/needs-you-separation/`, `contact-sheet*.jpg`, `critique/*.json`, `index.html`, `notes.md`
- Modify, after Sebastian's pick: `design/design-decisions.md` (C44), `design/ia.md` and `design/inventory.md` where the card's treatment is listed

- [ ] **Step 1: Write the brief.** What the round designs: the separation between two adjacent highlighted Needs-you cards, by spacing, border, background or a divider, so that two never read as one. Fixed: the shell, the theme tokens, the contrast floor, the phone rule, amber as the one hue for "needs a person", the card's 3 px amber bar and 4 percent tint of today (`console.css:214` to `:216`) as the baseline, the five-part face of 5.8 in its order, and the carousel's count and arrows of 5.8 as a part every candidate places. Questions: which separation reads at 1x and 3x in both themes with two, three and five cards, and where the count and arrows sit so the chrome survives phase 5. Limits: three candidates, two critics (Gemini and GLM), one fix loop and one compare loop, a cap of 3 USD, stop time two hours.

- [ ] **Step 2: Run the round** by the process: candidates in the lab with the real `console.css` and two to five highlighted cards, shots at 1440 and 390, the critics on the same sheets, the director's checks against the pixels, the recommendation with its runner-up on `index.html`, the cost and what worked in `notes.md`. Stay inside the cap. Ask before a run that would pass it.

- [ ] **Step 3: Sebastian picks.** The pick becomes C44 with the theme, `ia.md` and `inventory.md` updated. Until he picks, the director's recommendation stands as provisional, marked so.

- [ ] **Step 4: Commit** the round's files and the C-entry.

```bash
git add design/rounds/18-needs-you-separation design/prototypes/needs-you-separation design/design-decisions.md design/ia.md design/inventory.md
git commit -m "design: round 18, the Needs-you cards' separation, with the carousel's count and arrows as fixed parts"
```

---

### Task 7: The separation lands in the console

Code repository, after C44.

**Files:**
- Modify: `internal/console/static/console.css:214` to `:216` (the `.lane.five #needs-you > .card` rules), and the rules C44 names
- Test: the lab's shots before and after at 1x and 3x, the same region, as the evidence the CLAUDE.md asks for a visual change

- [ ] **Step 1: Shoot the board** with three highlighted cards at 1440 and 390 before the change (`tools/shoot.sh` in the docs repository against a local console, or the lab's fixture).

- [ ] **Step 2: Change the rules** to C44's values. No other rule moves.

- [ ] **Step 3: Shoot again**, crop the same region at 3x, and put both crops in the commit's description or the round's `notes.md`.

- [ ] **Step 4: `bash check static` green. Commit.**

```bash
git add internal/console/static/console.css
git commit -m "console: two highlighted Needs-you cards read apart, the pick of design round 18 (C44)"
```

---

### Task 8: A catch-all refusal names its error

Fault 4. On 2026-10-31 the chat's answer tool was refused four times on #1383. At 21:10:42, "A plan's question is answered with its revision (revision), from the plan tool." At 21:19:49, "an answer of 1 to 1000 characters is required." Both named the state and the action. At 21:19:56 and 21:20:02, "The answers could not be recorded; see the factoryd log." The error went to a log that is gone, and the chat posted the answers as comment 25297 instead. Five refusals have that shape: `actions.go:629` (one answer), `:720` (answers), `:765` (the decision), `:2043` (the grant), `analysis.go:44` (the analysis).

**Files:**
- Modify: `internal/console/actions.go:629`, `:720`, `:765`, `:2043`, `internal/console/analysis.go:44`
- Test: `internal/console/chat_test.go` (the answer tool through the chat rig) or `actions_test.go`

**Interfaces:**
- Produces: each refusal reads `<what> could not be recorded: <err>. <the action>`. For the answers: "The answers could not be recorded: %v. Read the plan (the plan tool) and answer the open questions of its newest revision." The log line stays.

- [ ] **Step 1: Write the failing test.**

```go
func TestAnswerToolRefusalNamesTheError(t *testing.T)
// AnswerPlanQuestions returns errors.New("plan t-x revision 1: idx 2 out of range")
// → the tool result is "Refused: The answers could not be recorded: plan t-x
// revision 1: idx 2 out of range. Read the plan (the plan tool) and answer the
// open questions of its newest revision."
```

- [ ] **Step 2: Run it.** Fails on the old wording.

- [ ] **Step 3: Implement** the five refusals. The action per site: the answer and the decision say what the answers one says, the grant says "Grant again, or Fund the card when the refusal names money", the analysis says "Attach the analysis again".

- [ ] **Step 4: Run.** Pass. `make test`, `bash check static` green.

- [ ] **Step 5: Commit.**

```bash
git add internal/console/actions.go internal/console/analysis.go internal/console/*_test.go
git commit -m "a refusal that could not record an answer, a decision, a grant or an analysis names the error and the next step, not the factoryd log"
```

The register's fault 4 closes when this is live and the next plan question's answers land through the tool.

---

### Task 9: The runner's docker volume, measured and bounded

Fault 8. Outside the card flow. On 2026-11-02 14:43:34 the kubelet evicted the trusted runner's pod: the `docker-data` emptyDir passed its `sizeLimit` of 50Gi (`k8s/platform/forgejo/runner-helmrelease.yaml:109`). The prune sidecar prunes from `dind.prune.maxGiB` 30 (`:75`), and the chart counts at most 13.3 GiB per run, so the volume should stay under 44 GiB. What filled it past 50 is not measured.

**Files:**
- Create, in the docs repository: `docs/runner-volume-measurement-2026-11.md` (the measurement's findings and the infra hand, in the runbook's shape)
- The infra commit is Sebastian's hand: `k8s/platform/forgejo/runner-helmrelease.yaml` or the sidecar's command in `runner-chart/templates/deployment.yaml:137`

- [ ] **Step 1: Read the eviction.** `kubectl -n forgejo describe pod forgejo-runner-6f89cff589-g85km` (the pod in Error since 2026-10-28 is a candidate for the evicted one) and `kubectl -n forgejo get events --field-selector reason=Evicted`. Record the message and the usage it names.

- [ ] **Step 2: Read the prune's account.** `kubectl -n forgejo logs <running runner pod> -c docker-prune --since=48h`. Record what the sidecar measured each pass, when it pruned and how much it freed.

- [ ] **Step 3: Measure a peak.** During a main test job, `kubectl -n forgejo exec <pod> -c dind -- docker system df -v` and `du -sh /var/lib/docker/*`, against SigNoz's `k8s.volume.available` for volume `docker-data` and `k8s.pod.filesystem.usage` over two back-to-back main runs. The difference between docker's account and the kubelet's names what the prune's measure misses: the build cache, dangling volumes, container writable layers or container logs.

- [ ] **Step 4: Pick the bound** the measurement names, one of: `maxGiB` lowered so that `maxGiB + 2 × 13.3 < 50` (20), the missing target added to the sidecar's prune command, or `sizeLimit` and the ephemeral-storage request raised with the node's disk in view. Write the finding, the chosen bound and the exact edit with its verify command in the measurement page.

- [ ] **Step 5: Commit the page** in the docs repository. The infra commit is Sebastian's, by the page.

```bash
git add docs/runner-volume-measurement-2026-11.md
git commit -m "runner: what filled the docker volume past 50Gi, measured, and the bound that holds it"
```

---

## What stays with the redesign's phases

- Fault 2 part B, the ask that fires as the money ask before an attempt: the rung 0 row of 5.6, phase 2.
- The red head after the checks cap: the resolver row and the approval request's green precondition, phase 2. The #1381 fixture, phase 5.
- One typed answer for every case kind, which ends the fork between the answer and the plan tools: phase 2's action set.
- One question at a time, the fold of the revision and the context on the face: phase 5's carousel and five parts.
- The clocks on a wait at the human: after the five phases, as decided.

## Parallel safety

| Task | Repository | Files phase 1 also touches | Workflow code |
|---|---|---|---|
| 1 | docs | none | none |
| 2 | code | `runner.go` (phase 1: `runnerTools.Tool` at :1307; this plan: `startFailure` at :1701 and :1734) | none |
| 3 | code | none | none |
| 4 | code | `store.go`, `store_test.go` (phase 1 adds methods to the interface; this plan adds a field and two methods to `Task`), `chat_tools.go` (phase 1: the `card` tool's prefix; this plan: its money line at :749) | none |
| 5 | code | `board.go` (phase 1 does not edit it; `board.html:93` only) | `plan.go` outside its loops: `questionFindings` |
| 6, 7 | docs, code | none | none |
| 8 | code | none | none |
| 9 | docs, infra | none | none |

Order: Task 1 first, since the sentences coordinate the two plans. Tasks 2 to 5 and 8 in any order, each a commit on the code repository's main. Task 6 whenever a director session is free, Task 7 after the pick. Task 9 whenever a main test job runs.
