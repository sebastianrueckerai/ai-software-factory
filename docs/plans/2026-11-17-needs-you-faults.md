# Needs-you faults of 2026-11-16 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five faults that put cards in front of the human on 2026-11-16 can no longer happen.

**Architecture:** Each fault is fixed where it starts: the check-in's prompt and its repair call, the runner image's list of source trees, the plan check at filing, and the brief writer's input. No task adds a prompt rule where code can carry the rule.

**Tech Stack:** Go (factoryd), Dockerfile with BuildKit, Forgejo Actions YAML.

**Spec:** This plan. The faults below are the requirements. The design principle in the root `CLAUDE.md` ("Reliability comes from how an AI step is built") decides each fix.

**Where the work runs:** locally, in a worktree of `~/repos/ai-software-factory-code`, by a session with Sebastian's or the controller's Forgejo login. Task 2 changes `Dockerfile.runner` and `.forgejo/workflows/ci.yml`, which no agent may push. Open each pull request with the controller login, so that Sebastian can approve it. Line numbers are from main at `338ad1c43`.

## The faults (2026-11-16)

1. **The check-in names a finding that does not exist.** Card #2098's session 3 ended with a check-in answer that set `repeats` to `"f2"` with no earlier findings. `parseCheckinAnswer` refused it (`checkin.go:816-818`) and the card went to a case. The check-in's system prompt shows `"repeats":"<id>"` in its answer example whether or not earlier findings exist (`checkinSystem`, `checkin.go:516`). The answer schema leaves `repeats` out with no earlier findings (`momentAnswerSchema`, `checkin.go:595-620`), so the prompt and the schema disagree. A refusal on the forced last call ends the step at once, because `runCheckin` does not set `RepairPastCap` (`checkin.go:1083`). Only the rung conversation sets it (`rungconv.go:59`).
2. **A new Go folder needs a human.** Card #2100 (plan #1947) added the top-level Go folder `proofs/`. The runner image's warm step bind-mounts each Go tree by name (`Dockerfile.runner:184-187`), and `ci.yml`'s `RUNNER_INPUTS` lists the same names (`.forgejo/workflows/ci.yml:28`). `TestRunnerWarmCacheHoldsNoTestResultsAndNoSource` (`internal/reproducible/dockerfile_test.go:325`) demands both lists equal the Go trees. Agents may not push either file. So the card's CI stayed red until a human landed card #2101 with the two lines. Landing that edit first does not work either: a bind mount of a folder that does not exist fails the build.
3. **A plan rebuilds a test that main already has.** Plan #1938's revision 7 cut card #2096 to build `TestWallClockStopShipsTheWork`, while PR #2083 of another card held the same test in review. PR #2083 merged at 08:46. Revision 8 (09:25) still cited the test as a `kind: test` criterion, so it cut two cards that land no change and only rerun green tests. The planner's context names no open work outside its own plan (`RunPlan`, `plan.go:2684`), and the plan check never looks at main (`criteriaFindings`, `plan.go:742`; `FilePlan`, `plan.go:2907`).
4. **A brief describes the wrong revision and guesses card states.** The brief of case 5869 (plan #1938) described revision 8 by the handover text of a replan step, not by the revision. It also called two `closed` cards "closed done". The brief of case 5675 (plan #1850) said the gate of card #1837 was unknown, though the record holds it. `caseFacts` (`brief_case.go`, the facts map near line 95) carries the case row, its steps, the card digest and a pending approval. It carries no plan revision and resolves no `#N` that the text names.
5. **A human card's case gets no brief.** A human card has no capability classes (`plan.go:3879` sets `RequiredCapabilities` to nil). `FactoryModel(nil, PurposeBrief)` (`internal/policy/policy.go:1574`) returns "", and the brief call fails with "the policy names no brief model for the task's capability classes". 58 cases since 2026-11-09 carry this error, among them 5848 and 6197.

Two more faults of that night are in other plans. The plan-criteria case that reopened every minute was fixed in PR #2132 (`338ad1c43`). A plan whose criteria were never judged and whose integration card ended without a pull request has no way to land its work: that is Task 7 of `docs/plans/2026-11-16-merge-queue-turn.md`.

## Global Constraints

- Go tests run with `go test -race`. Tests that need Postgres run under `scripts/pg-test.sh` or with `FACTORYD_TEST_DATABASE_URL` set.
- `bash check changed` passes before each commit.
- No prompt rule where code, a tool's shape or a check can carry the rule. A refusal names the state and the fitting action.
- Comments: only what the code cannot say. No change narration.
- A human is a human in every text the factory writes: never a member, an operator or a resource.

## Review Focus

1. A check-in with earlier findings still offers `repeats`, and a `repeats` that names a real earlier finding still parses. Task 1's second assertion pins it.
2. A change only under `docs/` or `k8s/` keeps the runner image's warm layer. Task 2's Step 5 checks it with two builds.
3. A plan whose own earlier round merged the test does not get refused for citing it. Task 3's control case pins it.
4. A test criterion whose suite is `./...` or a path with no test files is not refused, and the check does not fail the filing when Forgejo is down. Task 3's tests pin both.
5. A brief of a case that is not about a plan carries no `plan_revision` key. Task 4's second test pins it.

---

### Task 1: The check-in offers `repeats` only when earlier findings exist

**Built on 2026-11-27 in pull request #2354 (`fc92cc9fd`),** keeping today's signature `checkinSystemFor(ask *CheckInAsk)`, which reads the priors from the ask.

**Files:**
- Modify: `internal/factoryd/checkin.go:516-530` (`checkinSystem`, `checkinSystemFor`), `:595-620` (`momentAnswerSchema`), `:884` (the caller), and the `conversation` that `runCheckin` builds
- Test: `internal/factoryd/checkin_test.go`

**Interfaces:**
- Produces: `func checkinSystemFor(moment string, replan, priors bool) string`

- [x] **Step 1: Write the failing tests.**
  - `TestCheckinSystemOffersRepeatsOnlyWithPriors`: `checkinSystemFor(<the gate moment>, false, false)` holds neither `"repeats"` nor `repeats is optional`. `checkinSystemFor(<the gate moment>, false, true)` holds `"repeats":"<id>"`. With no priors, `momentAnswerSchema`'s finding item has `"additionalProperties": false`.
  - `TestCheckinRepairsALastCallRefusal`: an ask with one finding (`f1`), no priors, and a call cap of 1. The scripted model answers first `{"findings":[{"id":"f1","verdict":"confirmed","evidence":"e","repeats":"f2"}],"decision":"handover","handover":"n"}`, then the same answer without `repeats`. The check-in ends with decision `handover` after exactly 2 model calls.
- [x] **Step 2: Run them and see them fail.** `go test -race -run 'TestCheckinSystemOffersRepeatsOnlyWithPriors|TestCheckinRepairsALastCallRefusal' ./internal/factoryd/`
- [x] **Step 3: Implement.** `checkinSystemFor` builds the answer example and the `repeats` sentence only when `priors` is true. The caller at line 884 passes `len(ask.Priors) > 0`. The finding item of `momentAnswerSchema` gets `"additionalProperties": false`. `runCheckin`'s `conversation` sets `RepairPastCap: true`, as `rungconv.go:59` does.
- [x] **Step 4: Run** `go test -race ./internal/factoryd/` and `bash check changed`. Expected: PASS.
- [x] **Step 5: Commit and open the pull request.**

### Task 2: The runner image reads every Go tree with no list

**Dropped on 2026-11-26.** One card stopped on the list in six weeks (#2100 on 11-16). That does not pay for a change to `Dockerfile.runner`, its cache and the image epoch.

**Files:**
- Modify: `Dockerfile.runner:164-187` (the warm step and its comment), `.forgejo/workflows/ci.yml:28`, `:101`, `:218`
- Create: `Dockerfile.runner.dockerignore`
- Test: `internal/reproducible/dockerfile_test.go:325` (`TestRunnerWarmCacheHoldsNoTestResultsAndNoSource`)

**Interfaces:**
- Consumes: `goTrees(t)` in `dockerfile_test.go`, unchanged.

- [ ] **Step 1: Rewrite the test.** `TestRunnerWarmCacheHoldsNoTestResultsAndNoSource` keeps its `-count=1` and `-run '^$'` checks and its checks of the final image. It drops the per-tree mount list and asserts:
  - the warm step has exactly one `--mount`, and it is `--mount=type=bind,target=/tmp/src` with no `source`;
  - `Dockerfile.runner.dockerignore` excludes none of `go.mod`, `go.sum` or any tree that `goTrees(t)` returns;
  - `ci.yml` holds no `RUNNER_INPUTS`, and both `EPOCH=` lines equal `EPOCH=$(git log -1 --pretty=%ct -- . $(sed -e '/^#/d' -e '/^$/d' -e 's/^/:(exclude)/' Dockerfile.runner.dockerignore))`.
- [ ] **Step 2: Run it and see it fail.** `go test -race -run TestRunnerWarmCacheHoldsNoTestResultsAndNoSource ./internal/reproducible/`
- [ ] **Step 3: Implement.**
  - The warm step's mounts become the one bind of the whole build context.
  - `Dockerfile.runner.dockerignore` lists `.git`, `.forgejo`, and today's top-level entries that hold no Go files: `CLAUDE.md`, `Dockerfile`, `Dockerfile.sandbox`, `LICENSE`, `Makefile`, `README.md`, `SECURITY.md`, `check`, `docs`, `factory`, `k8s`, `opencode-plugin`, `upstream-files.txt`, `upstream-images.txt`. Check the list against `ls` and `goTrees`.
  - `ci.yml` drops `RUNNER_INPUTS` and computes `EPOCH` as Step 1 states, in both places.
  - The warm step's comment says that a new Go tree needs no edit here, and that a new entry with no Go files only rebuilds the layer until someone lists it.
- [ ] **Step 4: Run** `go test -race ./internal/reproducible/` and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Check the cache with two builds.** Build with `docker build -f Dockerfile.runner --build-arg SOURCE_DATE_EPOCH=1 .`. Touch a file under `docs/` and build again: the warm step shows `CACHED`. Then add `newtree/x.go` (`package newtree`) and build again: the warm step runs and compiles it. Remove `newtree/`. Find out which tool the image job uses (`ci.yml`'s image job). If it is `buildctl`, check that it applies the per-Dockerfile ignore file the same way.
- [ ] **Step 6: Commit and open the pull request** with the controller login. Its merge needs Sebastian, because the runner class keeps a human.

### Task 3: A plan cannot cite as new a test that main already has

**Covered on 2026-11-26 by `ProofsAtMain`** (`internal/factoryd/proofsatmain.go`): a card whose branch holds no work and whose cited tests pass at main closes done. The filing check below was not built.

**Files:**
- Modify: `internal/factoryd/plan.go:2907` (`FilePlan`) and `:2684` (`RunPlan`)
- Test: `internal/factoryd/plan_test.go`

**Interfaces:**
- Consumes: `(*Forgejo).BranchHeadSHA` (`forgejo.go:1225`), `(*Forgejo).TreeEntries` (`forgejo.go:1597`), `(*Forgejo).FileContent` (`forgejo.go:2176`), `(*Forgejo).OpenPullRequests` (`forgejo.go:1348`).
- Produces: `func (r *Runner) existingTestFindings(ctx context.Context, repo Repo, p Plan, merged []string) ([]string, error)` and `func (r *Runner) openWorkLine(ctx context.Context, repo Repo, planID string) (string, error)`

- [ ] **Step 1: Write the failing tests.**
  - `TestFilePlanRefusesATestCriterionMainAlreadyHolds`: the fake Forgejo's main head is `188c42aca`, and `acceptance/wall_clock_stop_test.go` holds `func TestWallClockStopShipsTheWork(t *testing.T) {`. The plan has one `kind: test` criterion `committed_session_ends_pushed` with suite `./acceptance` and name `TestWallClockStopShipsTheWork`. `FilePlan` files no revision and returns the finding `plan: criterion committed_session_ends_pushed: TestWallClockStopShipsTheWork is already on main at 188c42a (acceptance/wall_clock_stop_test.go): file it as kind invariant with suite ./acceptance, or name a new test`.
  - Control cases in the same test: the name `TestOther` files the revision. A criterion that a merged card of this plan cites files the revision. A suite of `./...` files the revision. A Forgejo error files the revision and logs the error.
  - `TestRunPlanNamesOpenWork`: one open pull request #2083 of card #2064, titled `Wall-clock stop ships the work`, outside the plan. The planner's findings hold the line `Open work in this repository outside this plan: #2064 (PR #2083): Wall-clock stop ships the work`. With no open pull request, no such line.
- [ ] **Step 2: Run them and see them fail.** `go test -race -run 'TestFilePlanRefusesATestCriterionMainAlreadyHolds|TestRunPlanNamesOpenWork' ./internal/factoryd/`
- [ ] **Step 3: Implement.**
  - `existingTestFindings` reads main's head once. For each `kind: test` criterion whose suite is one directory and that no card in `merged` cites, it lists the `*_test.go` files under that directory from `TreeEntries` and reads them with `FileContent` until one holds `func <Name>(`. A Forgejo error returns the error. `FilePlan` logs it and files the plan, so a Forgejo outage does not block planning.
  - `FilePlan` appends the findings to `judgePlan`'s before it refuses.
  - `openWorkLine` lists the open pull requests of the plan's repository whose card is not one of this plan's, one entry each: `#<issue> (PR #<n>): <title>`. `RunPlan` adds the line to `findings` when it is not empty.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Commit and open the pull request.**

### Task 4: A case brief carries the plan revision and the cards it names

**Not built; superseded on 2026-11-26.** The brief writer was rebuilt after 11-17 (code commits `01900c99b` and `d2d846523` of 11-19). The fault caused one mislabelled sentence in a brief.

**Files:**
- Modify: `internal/factoryd/brief_case.go` (`caseFacts`), `internal/factoryd/carddigest_timeline.go:125-135` (the replan step's label)
- Test: `internal/factoryd/brief_test.go`

**Interfaces:**
- Produces: `func (b *Briefer) planRevisionFacts(ctx context.Context, plan Task, revision int) (map[string]any, error)` and `func (b *Briefer) referencedCards(ctx context.Context, repository string, texts ...string) ([]map[string]any, error)`. Use the brief writer's real receiver type.

- [ ] **Step 1: Write the failing tests.**
  - `TestBriefFactsCarryThePlanRevision`: a plan task whose revision 8 has the summary `Drop the duplicate test and start from main` and a card with issue 2096 and task status `closed`. The digest holds a replan step with the message `commit and push the current work first`. For a `plan_confirmation` case with `Facts{"revision": 8}`, the facts sent to the model hold `plan_revision`, its summary text, and `{"issue":2096,...,"status":"closed"}`. The replan step's line starts with `asked the planner:`.
  - `TestBriefFactsCarryNoPlanRevisionOffAPlan`: for a `checkin_failed` case on a card, the facts hold no `plan_revision` key.
  - `TestBriefFactsResolveCardReferences`: a criterion text `After #1837's view-rebuild cards merge` and a task with issue 1837, status `done`, and a `plan_closed` event. The facts hold `referenced_cards` with issue 1837, status `done` and its criteria met.
- [ ] **Step 2: Run them and see them fail.** `go test -race -run 'TestBriefFacts' ./internal/factoryd/`
- [ ] **Step 3: Implement.**
  - For a case of kind `plan_confirmation`, `plan_question` or `plan_criteria`, `caseFacts` adds `plan_revision`: the revision's summary, its outcome, each card (key, title, filed issue and its task's real status from `PlanCards`) and the criteria. The revision number is the case's `revision` fact, else the plan's newest (`newestPlan`, `brief.go:355`).
  - `referencedCards` scans the problem, the objective, the criteria texts and the digest's outcomes for `#N`. It reads each card with `TaskByIssue` and returns issue, title, status, pull request, end reason, and criteria met and open. `caseFacts` adds them as `referenced_cards` when any exist.
  - The digest labels the replan step's message `asked the planner: <message>`, so that it cannot read as the revision.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` and `bash check changed`. Expected: PASS.
- [ ] **Step 5: Commit and open the pull request.**

### Task 5: A human card's case gets a brief

**Done on 2026-11-19 in code commit `73811a1db`, by another shape:** `BriefClasses` (`internal/policy/policy.go`) writes a human card's brief under every class of the policy. `BriefModel` was not built.

**Files:**
- Modify: `internal/policy/policy.go` (next to `FactoryModel`), `internal/factoryd/brief.go:296`, `internal/factoryd/brief_case.go:46`
- Test: `internal/policy/policy_test.go`, `internal/factoryd/brief_test.go`

**Interfaces:**
- Produces: `func (d Document) BriefModel(classes []string) string`

- [x] **Step 1: Write the failing tests.**
  - `TestBriefModelFallsBackForACardWithNoClasses`: with class `coder` whose `SupervisorModel` is `mid`, `BriefModel(nil)` returns `mid`, and `BriefModel([]string{"coder"})` returns `mid`.
  - `TestBriefWriterBriefsAHumanCard`: a task of kind `human` with nil `RequiredCapabilities`. The case brief is written with no error, by alias `mid`.
- [x] **Step 2: Run them and see them fail.** `go test -race -run 'TestBriefModelFallsBackForACardWithNoClasses' ./internal/policy/` and `go test -race -run TestBriefWriterBriefsAHumanCard ./internal/factoryd/`
- [x] **Step 3: Implement.** `BriefModel` returns `FactoryModel(classes, PurposeBrief)`, and when that is "", the first alias of `classModels(PurposeBrief)`. The gateway already allows these aliases on the chat task that the brief is billed to (`PurposeModels`, `policy.go:1624`). Both brief calls use `BriefModel`.
- [x] **Step 4: Run** `go test -race ./internal/policy/ ./internal/factoryd/` and `bash check changed`. Expected: PASS.
- [x] **Step 5: Commit and open the pull request.**

### Task 6: Land and check on the live factory

- [ ] Merge the pull requests of Tasks 1 to 5, each after green CI and a review with no blocker. Task 2 needs Sebastian's approval.
- [ ] Roll. If the merge-queue plan's Deploy now has not run yet, these merges go with it. Otherwise answer the roll-held card with Deploy now, and say in the note what these fixes stop.
- [ ] Check the roll: the factoryd deployment's image digest is the digest that main's last image build made.
- [ ] Check Task 5 at once: the next case at the human on a human card has a brief and an empty `brief_error`. Query: `SELECT id, brief_error FROM cases WHERE opened_at > '<roll time>' AND task_id IN (SELECT id FROM tasks WHERE kind='human')`.
- [ ] Check Tasks 1, 3 and 4 on their first occurrence: no `checkin_unreadable` case names `unknown repeats`, the next plan revision's planner findings hold the open-work line, and the next plan confirmation's brief names the revision's own summary.
- [ ] Record the results, with the event and case ids, in this plan's progress ledger. Tick the boxes.
