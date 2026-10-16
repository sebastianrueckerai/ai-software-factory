# Spec intake step 1: criteria, item ids, coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The plan JSON gains the spec's criteria with ids and kinds, every acceptance item cites the criterion it works on, the plan validation enforces completeness and coverage, and the recording rule's `plan_catches` table lands with its first kind (roadmap 285, rollout step 1).

**Architecture:** One schema change in `Plan` and `PlanCard` ripples through the plan validation, the plan and card rendering, both planner guides and the split, and one new table written where questions are asked. No new stage, no gate, no process-file change, no model call: the criteria are data the planner files and the validation judges. The split shares `readPlan`, so its guide re-dictates the item shape and stays exempt from criteria by its zero-value shape.

**Tech Stack:** Go (internal/factoryd, internal/schema), PostgreSQL migration, the docs repo's roadmap.

**Spec:** [docs/spec-intake-concept-2026-10-16.md](../../spec-intake-concept-2026-10-16.md), pieces 1 to 3 and the recording rule (section 7), section 8 (no process change), the rollout list. The concept is binding; this plan argues from it.

## Rulings the plan argues from

- C1 (piece 1): a criterion has an id, a kind and the fields its kind names. Kind `test`: test name, inputs, expected numbers, the house format. Kind `invariant`: a test suite, no inputs. Kind `judgement`: claim, fixed inputs, pinned prompt, no test. Kind `human`: claim, evidence. The planner drafts the cheap judgement by default; the human moves criteria between judgement and human later (flip rules are piece 10, not this step).
- C2 (piece 1, ruling 2026-10-17): a criterion's test must run under the project's own `check` in-process. Beyond the sandbox it becomes a human criterion or a note; nothing pretends to a proof that cannot run. The guide says this; the validation cannot check it.
- C3 (piece 2): the citation rides in the acceptance item itself, `criterion` beside `text`, no second list. One criterion, several cards; one card, several criteria. A foundation card need not cite any, though it may.
- C4 (piece 3): three rules, only when the plan carries criteria: every criterion cited by at least one card; every non-foundation card cites at least one; the integration card's items are the criteria, one item per criterion by id, a judgement or human criterion arriving as an item that names its claim.
- C5 (recording rule): every hole catch names its finder on the plan. The table lands now with kind `question`, finder `planner`; later steps add kinds.
- C6 (rollout step 1): the criteria come from a human-written criteria list in the card body until drafting lands (step 4). The planner carries that list into the plan, or drafts one from the spec's acceptance tests when the issue carries none.
- D1 (my ruling, flagged for Sebastian): criteria are required when the process shape has `integration: true` (every spec plan today); the split's zero-value shape stays exempt, with or without criteria.
- D2 (my ruling, flagged for Sebastian): criterion ids are snake_case, `^[a-z][a-z0-9_]{1,31}$`, as the concept's examples are (`schedule_test`); card keys stay dashes. Two vocabularies, two patterns.
- D3 (my ruling): the criterion count is capped at `maxCardAcceptance` (10), because the integration card carries one item per criterion inside its own 10-item cap; more criteria can never pass.

## Global Constraints

- `go test -race ./...` green, `gofmt` clean, `gosec` clean (the repo's CI gates).
- Findings follow the house shape: one line each, prefix `plan: `, naming the card or criterion and the fitting action. Never tweak an assertion to force a pass; expectations are hand-derived.
- Comments in the codebase's voice: prose comments that name what and why, citing the concept piece or roadmap item as neighbours do (`(roadmap 285)`). No narration comments.
- No new stage, no stage kind, no doors, no process-file change, no model call. One way only: no shims for the old string items.
- The ship unit is the rollout step: one commit per repo at the end (code and docs), pushed to both remotes of each (code: origin and github; docs: origin and forgejo). No per-task commits.
- Commit messages end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Work happens in a git worktree of each repo, merged to master only as the step's commit.

## Review Focus

The five input classes the spec implies but the happy path misses, each pinned to its owning task:

1. A citation naming a criterion that does not exist (a typo) must be refused at the plan, not discovered at the gate. Test: `TestValidatePlan` "unknown citation" case (Task 2).
2. An integration card that cites one criterion twice and another not at all must fail the bijection rule even though its item count matches the criteria count. Test: `TestValidatePlan` "integration cites one twice" case (Task 2).
3. A cited item whose rendered line (`text [id]`) passes 300 characters must be refused at plan validation, so the ready check never trips on a line the plan itself wrote. Test: `TestValidatePlan` "long cited line" case (Task 1).
4. A split answer with the old `"acceptance": ["string"]` shape must fail decode with the json finding, and `splitGuide` must dictate the object shape. Test: `TestSplitGuideAcceptanceObject` and the decode case in `TestCheckSplit` (Task 4).
5. `askQuestions` running twice (a Temporal activity retry) must not duplicate catch rows. Test: `TestPGStoreCatches` second insert returns false (Task 5).

---

### Task 1: The item schema and its rendering

**Files:**
- Modify: `internal/factoryd/plan.go` (the `Plan` and `PlanCard` structs around lines 69-105; the constants around lines 58-66; `acceptanceFindings` around line 328; `cardFindings` around line 383; `cardFacts` around line 610)
- Test: `internal/factoryd/plan_test.go` (`testPlan`, the `TestValidatePlan` table), `internal/factoryd/ready_test.go` (only if it builds cited lines)

**Interfaces:**
- Produces: `type PlanItem struct { Criterion string `json:"criterion,omitempty"`; Text string `json:"text"` }`; `PlanCard.Acceptance []PlanItem`; `Plan.Criteria []PlanCriterion `json:"criteria,omitempty"``; `type PlanCriterion struct { ID string `json:"id"`; Kind string `json:"kind"`; Test, Inputs, Expected, Claim, Prompt, Evidence string, all `json:"...,omitempty"` }`; constants `CriterionTest = "test"`, `CriterionInvariant = "invariant"`, `CriterionJudgement = "judgement"`, `CriterionHuman = "human"`, `criterionKinds []string`; `criterionID = regexp.MustCompile(`^[a-z][a-z0-9_]{1,31}$`)`; `func itemText(it PlanItem) string` (the text alone when uncited, `text [id]` when cited). Task 2 consumes `PlanItem.Criterion` and `PlanCriterion`; Task 3 consumes `itemText`.

- [ ] **Step 1: Give `testPlan` the new shape and update the item findings table**

`testPlan` gains three criteria: `links_crud` (kind test: `TestCreateLink in internal/links`, inputs `POST /api/links with a url`, expected `201 and the row in the store`), `redirect_302` (kind test: `TestRedirect in internal/links`, inputs `GET /abc`, expected `302 and a click counted`), `all_green` (kind invariant: `go test ./... passes`). The cards' items cite: foundation `all_green` (a foundation may cite), links-api `links_crud`, redirects `redirect_302`, integration one item per criterion by id (`links_crud`, `redirect_302`, `all_green`, each text the criterion's test against the assembled feature). The `TestValidatePlan` table's item cases move to the object shape; new cases:

- "empty item text": `plan: card links-api: acceptance test 1 is empty`
- "long cited line": links-api's item text 296 characters plus ` [links_crud]` renders past 300: `plan: card links-api: acceptance test 1 is over 300 characters`

`acceptanceFindings` keeps its signature and messages but is fed the rendered lines: `cardFindings` maps `itemText` over the items before calling it, so plan validation and the ready check judge the same line `cardFacts` writes.

- [ ] **Step 2: Run the plan package tests to see the ripple**

Run: `go test ./internal/factoryd/ -run 'TestValidatePlan|TestPlanComment|TestChild|TestReady|TestSplit' -count=1`
Expected: compile errors first (the struct change), then failing assertions in the body, comment and guide tests. Fix only what the schema change compels (bodies now show `- text [id]` lines); the criteria findings are Task 2, the comment table Task 3, the guides Task 4.

- [ ] **Step 3: Implement the schema and renderers**

`cardFacts` writes `- ` + `itemText(it)` per item. Keep `maxAcceptanceItem` 300 as the rendered line's cap; no new constant. The whole repo must compile: `go build ./...`.

- [ ] **Step 4: Run the package tests**

Run: `go test ./internal/factoryd/ -count=1`
Expected: PASS for the item-level cases; the criteria cases do not exist yet.

### Task 2: The criteria block and the completeness and coverage rules

**Files:**
- Modify: `internal/factoryd/plan.go` (new `criteriaFindings` and `citations` beside `cardFindings`; `readPlan` around line 265 calls it after the card loop)
- Test: `internal/factoryd/plan_test.go` (`TestValidatePlan` table; new `TestValidatePlanRefusesElevenCriteria`)

**Interfaces:**
- Consumes: `Plan.Criteria`, `PlanItem.Criterion`, `criterionID`, `criterionKinds`, `maxCardAcceptance` (as the criteria cap, D3).
- Produces: `func criteriaFindings(p Plan, shape policy.PlanShape) []string` and `func citations(p Plan) map[string][]string` (criterion id to citing card keys, in card order). Task 3 consumes `citations`.

- [ ] **Step 1: Add the failing table cases**

Every case is built to keep every other rule green, so each want is one finding (construction principle: a broken criterion stays properly cited, a broken citation changes no criterion). Exact wants, hand-derived from the rules above:

- "no criteria": `p.Criteria = nil` under `testShape` (integration true): `plan: 0 criteria; want 1 to 10`
- "criterion id": append `{ID: "Links API", Kind: "invariant", Test: "go test ./... passes"}`, cited by a new links-api item and a new integration item (both citing `"Links API"`): `plan: criterion 1: id "Links API": lowercase letters, digits and underscores, 2 to 32`
- "criterion id twice": append a copy of `links_crud` and a fourth integration item citing `links_crud` (per-id counts stay equal): `plan: criterion id links_crud is used twice`
- "kind": append `{ID: "perf_test", Kind: "perf"}`, cited the same way: `plan: criterion perf_test: kind "perf", want one of [test invariant judgement human]`
- "test kind incomplete": `links_crud.Inputs = ""`: `plan: criterion links_crud: kind test names its test, its inputs and its expected numbers`
- "test kind overfull": `links_crud.Claim = "x"`: `plan: criterion links_crud: kind test carries no claim, prompt or evidence`
- "invariant overfull": `all_green.Expected = "no failures"`: `plan: criterion all_green: kind invariant carries no inputs, expected numbers, claim, prompt or evidence`
- "judgement incomplete": append `{ID: "reads_calm", Kind: "judgement", Claim: "the page reads calm"}` (no inputs, no prompt), cited by a new integration item: `plan: criterion reads_calm: kind judgement names its claim, its fixed inputs and its pinned prompt`
- "human incomplete": append `{ID: "member_ok", Kind: "human", Claim: "the flow needs no help"}` (no evidence), cited by a new integration item: `plan: criterion member_ok: kind human names its claim and the evidence the approver sees`
- "field over cap": `links_crud.Test` 301 characters: `plan: criterion links_crud: test over 300 characters`
- "unknown citation": links-api's item cites `gone`: `plan: card links-api: acceptance item 1 cites "gone", which is no criterion of the plan`
- "criterion uncited": append `member_ok` (human, complete) cited by no card (so no integration item either): `plan: criterion member_ok is cited by no card` and `plan: card integration: criterion member_ok is cited by no item`
- "card cites none": redirects' item drops its citation (criteria exist): `plan: card redirects: no acceptance item cites a criterion`
- "integration misses one": integration drops the `all_green` item (the foundation still cites `all_green`, so completeness holds): `plan: card integration: criterion all_green is cited by no item`
- "integration cites twice": integration's first item's citation changes to `links_crud` (four items, `links_crud` twice): `plan: card integration: criterion links_crud is cited by 2 items; want one`
- "integration item uncited": integration gains a fourth item with no citation (per-criterion counts unchanged): `plan: card integration: acceptance item 4 cites no criterion`

And `TestValidatePlanRefusesElevenCriteria`: a plan with eleven complete, well-cited criteria is impossible (the integration card caps at ten items), so the count finding leads: `plan: 11 criteria; want 1 to 10` is `got[0]`.

- [ ] **Step 2: Run to verify the cases fail**

Run: `go test ./internal/factoryd/ -run TestValidatePlan -count=1`
Expected: FAIL, the new cases return no findings.

- [ ] **Step 3: Implement `criteriaFindings`**

Order: requiredness and count (required and 1 to 10 when `shape.Integration`; 0 allowed otherwise, the cap still held when present), per-criterion shape (id pattern, uniqueness, kind, the kind's fields non-empty and each within `maxAcceptanceItem`, the unused fields empty), then the citation rules (C4) over `citations`. The bijection counts per id with multiplicity: a criterion id cited by no integration item yields `criterion %s is cited by no item`, one cited by two or more yields `criterion %s is cited by %d items; want one`, an integration item citing nothing yields `acceptance item %d cites no criterion`. The split path needs no branch: its shape has no integration card and its plans carry no criteria, and if one ever does, the rules fire as they should.

- [ ] **Step 4: Run the package tests**

Run: `go test ./internal/factoryd/ -count=1`
Expected: PASS.

### Task 3: The plan comment shows the criteria

**Files:**
- Modify: `internal/factoryd/plan.go` (`planComment` around line 560)
- Test: `internal/factoryd/plan_test.go` (`TestPlanCommentMarker`'s plan, or a new `TestPlanCommentCriteria`)

**Interfaces:**
- Consumes: `citations` (Task 2), the criteria of `Plan`.
- Produces: the comment's criteria table between the cards table and the questions.

- [ ] **Step 1: Write the failing test**

The comment of `testPlan` holds a table `| # | id | kind | names | cited by |` with rows like `| 1 | links_crud | test | TestCreateLink in internal/links: POST /api/links with a url: 201 and the row in the store | links-api, integration |`. The `names` cell joins the kind's used fields with `: ` (test and invariant: the test, the inputs, the expected; judgement: the claim; human: the claim). The `cited by` cell lists the citing card keys in filing order.

- [ ] **Step 2: Run to verify it fails, implement, run to pass**

Run: `go test ./internal/factoryd/ -run 'TestPlanComment' -count=1`
Expected: FAIL, then PASS after `planComment` writes the table (only when criteria exist; the split's comments are unchanged).

### Task 4: The guides dictate the criteria

**Files:**
- Modify: `internal/factoryd/plan.go` (`planGuide` around line 641), `internal/factoryd/split.go` (`splitGuide` around line 110)
- Test: `internal/factoryd/plan_test.go` (the `TestPlanGuide*` sentence tests), `internal/factoryd/split_test.go`

**Interfaces:**
- Consumes: the schema of Task 1.
- Produces: the planner's and the split's JSON dictation, which the planners copy literally.

- [ ] **Step 1: Update the guide sentence tests first**

`TestPlanGuideAcceptanceRule` now wants: `acceptance: each item a test by name: TestXxx in <package>, its inputs and the numbers it expects, citing the criterion it works on; the foundation's items need cite none.` New sentence tests pin: the criteria format fragment `"criteria": [{"id": "...", "kind": "test|invariant|judgement|human"}` in the json key (the key's acceptance fragment becomes `"acceptance": [{"criterion": "...", "text": "..."}]`); a sentence naming where criteria come from (the issue's criteria list when it carries one, else drafted from the spec's acceptance tests, C6); a sentence per kind's fields (C1) with the `bash check` rule on test and invariant (C2); a sentence for the citation rules (C3 and C4, the integration card's items one per criterion by id, judgement and human arriving as items that name the claim). `TestSplitGuideAcceptanceObject` wants the fragment `"acceptance": [{"text": "..."}]` and no `criteria` fragment in `splitGuide`.

- [ ] **Step 2: Run to verify they fail, rewrite the guides, run to pass**

`planGuide`'s json key gains the criteria array between `cards` and `questions`, its field rules gain the criteria paragraph; the acceptance line carries the citation clause. `splitGuide`'s key changes its acceptance fragment only; its prose line about items keeps its wording with `criterion` absent. Run: `go test ./internal/factoryd/ -run 'TestPlanGuide|TestSplit' -count=1`. Expected: PASS.

- [ ] **Step 3: Pin the split's decode refusal**

A `TestCheckSplit` case: an otherwise valid split answer with `"acceptance": ["GET /abc answers 302"]` yields the decode finding `plan: json: cannot unmarshal string into Go struct field PlanCard.acceptance of type factoryd.PlanItem` (derive the exact stdlib wording by hand from the decode of a string into a `PlanItem`; if the wording differs from this line, the derived wording is the expectation and this line is corrected in the same commit). Run: `go test ./internal/factoryd/ -run TestCheckSplit -count=1`. Expected: PASS.

### Task 5: The recording rule's table

**Files:**
- Create: `internal/schema/migrations/factoryd/<UTC now>_plan_catches.sql`
- Modify: `internal/factoryd/store.go` (the interface, beside `PutPlanQuestions` around line 461), `internal/factoryd/plan.go` (`PutPlanCatches` beside `PutPlanQuestions` around line 891; `askQuestions` around line 1686)
- Test: `internal/factoryd/plan_test.go` (`TestPGStoreCatches` beside `TestPGStorePlans`; the planner-asks loop test gains the catch assertion)

**Interfaces:**
- Consumes: `plan_revisions` (the FK target), `askQuestions`' sanitised questions.
- Produces: `PutPlanCatches(ctx, id string, revision int, kind, finder string, details []string) (bool, error)` (false when nothing inserted, idempotent under retry); constants `CatchQuestion = "question"`, `FinderPlanner = "planner"`.

- [ ] **Step 1: Write the failing store test**

`TestPGStoreCatches` beside `TestPGStorePlans`, gated the same way it is: inserting two catches for a revision returns true, the rows read back ordered by idx with kind, finder and detail, and a second insert of the same details returns false without error. The test reads the rows through the store's own db handle (same package), no production reader is built.

- [ ] **Step 2: Add the migration and the store method**

The table mirrors `plan_questions`: `task_id text NOT NULL, revision int NOT NULL, kind text NOT NULL, idx int NOT NULL, finder text NOT NULL, detail text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()`, primary key `(task_id, revision, kind, idx)` so one kind's rows never collide with another's, FK `(task_id, revision)` to `plan_revisions`. The comment cites the concept's recording rule and roadmap 285. `PutPlanCatches` follows `PutPlanQuestions`: one INSERT over `jsonb_array_elements` of the details with ORDINALITY, `ON CONFLICT DO NOTHING`, true when a row landed.

- [ ] **Step 3: Write the questions' catches in `askQuestions`**

After `PutPlanQuestions` inserts, `PutPlanCatches(ctx, t.ID, revision, CatchQuestion, FinderPlanner, texts)` with the same sanitised texts. The event rows (`question_asked`) stay as they are; `plan_catches` is the query surface, not a second event stream. Extend the planner-asks loop test to assert the catch rows exist for the revision. Run: `go test ./internal/factoryd/ -count=1`. Expected: PASS.

### Task 6: Ship the step

**Files:**
- Modify: `docs/roadmap.md` (item 285, docs repo), `.superpowers/sdd/2026-09-24-build-plan/progress.md` (docs repo, untracked ledger)
- Modify: none in code beyond Tasks 1 to 5.

- [ ] **Step 1: Full gates**

Run: `go test -race ./...`, `gofmt -l .`, `gosec ./...` from the code repo root.
Expected: all green. Any failure is fixed in this step, not logged.

- [ ] **Step 2: Roadmap item 285 in "The harness and the agents", after 284**

One item, house format, its Sources line naming the concept (pieces 1 to 3, the recording rule) and Sebastian's task of 2026-10-17, its Where-it-stands line naming what built (schema, rules, comment table, guides, plan_catches with kind question) and what did not (drafting, the gate, hold-outs: steps 2 to 7, their own items to come), Priority empty. The push hook refuses a repeated number; 285 is free.

- [ ] **Step 3: Progress entry, commit, push**

Append the step's outcome to `progress.md` (ledger, untracked). Commit the code repo to master (`factoryd: the plan's criteria, item citations and coverage rules (roadmap 285)`) and the docs repo to master (the roadmap item and this plan), each message ending with the Co-Authored-By line, and push each to both remotes. Delete the worktrees afterwards.

## Not in this round

- The console's plan approval surface shows cards only; the criteria table lands in the plan comment the approval links to. If the console should render criteria rows itself, that is its own change.
- Criteria revision comparison, kind flips, staleness at merge (piece 10, step 7), the criteria gate (step 3), drafting and the confirmation question (step 4), hold-outs and the audit session (step 5), the verdict as data (step 6).
- A production reader for `plan_catches`; the week-of-plans analysis is SQL over the table, run by hand when the data exists.
