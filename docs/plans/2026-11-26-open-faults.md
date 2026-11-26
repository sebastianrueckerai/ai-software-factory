# Open Faults Before the Next Autonomous Run: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every documented open fault and every half-built plan of the factory, so the next work Sebastian files runs with no hand fix.

**Architecture:** An audit on 2026-11-26 traced every open item of the local notes, the plan records and both registers against code main `c2dddcd67` and infra main `e4d10c6`. Three changes are worth building, and one of them is a deletion. Everything else is closed, by design, or cheaper to leave than to fix, and this plan records why. No new feature is added.

**Tech Stack:** Go (factoryd, agent-worker), Dockerfile and Forgejo Actions (runner image), YAML (process file in the infra repository), Markdown.

**Spec:** There is no separate spec. The sources are [2026-11-17-needs-you-faults.md](2026-11-17-needs-you-faults.md) (Task 2 moves here), [2026-11-17-work-loss-faults.md](2026-11-17-work-loss-faults.md), [2026-11-16-merge-queue-turn.md](2026-11-16-merge-queue-turn.md), [../needed-fixes.md](../needed-fixes.md) and [../needs-you-register-2026-11-09.md](../needs-you-register-2026-11-09.md).

## Global Constraints

- Code work runs in a git worktree off `origin/main` of `~/repos/ai-software-factory-code`. One pull request per task from `controller/ai-software-factory-code`, with the controller login. Merge in task order as `sebastian`.
- A merge needs green CI (`pr / test`, `vet-and-format`, `security`, `job-env-audit`, `changes`, and `image-build` when it runs) and an independent review on the most capable model with no blocker.
- `bash check changed` passes before each commit. Go tests run with `go test -race`. Tests that need Postgres run under `scripts/pg-test.sh`.
- No task in this plan changes workflow code. If an implementer finds that a change reaches workflow code, it needs a `workflow.GetVersion` change id and a replay test, and the implementer says so before going on.
- A fix reaches production only through a roll: the Deploy now answer on the roll-held card. A roll needs Sebastian's go.
- Fix by construction. No prompt rule where code, a tool's shape or a check can carry the rule.
- Comments: only what the code cannot say. No change narration.
- A human is a human in every text the factory writes. No task id in a text a human reads: name the card by its issue number.
- No ruling number and no ledger path in a tracked file or a commit message.

## What this plan does not build, and why

The table answers which open items get no change. Each one was traced in the code on 2026-11-26.

| Item | Verdict | Reason |
|---|---|---|
| A plan cannot cite as new a test that main already has (needs-you faults plan, Task 3) | Dropped | `ProofsAtMain` closes such a card done with no human, and the dry run marks the proof `green on main`. The fix adds two Forgejo reads per filing and one more failure path. |
| A case brief carries the plan revision and the cards it names (same plan, Task 4) | Dropped | The brief writer was rebuilt since. The missing facts caused one mislabelled sentence on 2026-11-16 and no wrong answer. It is more context, which is the last resort. |
| A carry card is measured from main, not from the carried head (work-loss fault 21, third fix item) | By design | The bound caps what a human reviews in one pull request. An over-bound carry closes into one successor and then asks for a cut. |
| A plan stalls on a failed card nothing depends on | Closed | `ownFailedCard` (code commit `c314d5946`) opens a case on the plan card. |
| A failed alert, mainfix, tool or delegate card cannot be retried | By design | No card can depend on one unless a human writes the edge by hand. |
| A merge of main with no file overlap skips the checks | Leave | The red-main remedy corrects it at the cost of a paused queue. If it occurs, widen `syncOverlap` from files to directories. |
| A main CI run that stays running holds the red-main pause | Leave | `stalledMain` covers the hang that occurred. If it occurs again, set `timeout-minutes` in `ci.yml`. |
| Admission reads the project's month cap, not the factory's | Leave | The gateway refuses the session and the cap wait resumes the card. Nothing is lost. |
| A lost webhook leaves a failed card failed with its issue closed | Leave | Found by reading, never seen. It needs a lost delivery, and one Close ends it. |
| The seven freeze-card cases and the spare start after a Retry now press | Leave | Each needs a failed database write plus a restart or a race. The spare start costs one refused call, no paid session. |
| `halt` marks the stop before the pod delete | Leave | The other order loses the mark, which is worse. |
| A stored proof whose package helpers moved | Leave | The session gets the compiler errors and can act on them. The pg split that caused the worry is finished. |
| The heal pass's false "factoryd restarted" sentence | Closed | `AsklessReason` carries the true sentence. |
| The 22 "Still open" entries of the needs-you register, and entry 1 of needed-fixes | Closed or by design | Each was checked against code main. Task 4 records it. |
| Node data partition 100 GB against the 200 GB the Talos file asks | Leave | No eviction and no pending pod. [../roadmap-by-hand.md](../roadmap-by-hand.md) item 252 holds it for the next rebuild, which stops the whole factory for 21 to 47 minutes. |

## What needs Sebastian

1. Approve the merge of Task 1. `Dockerfile.runner` and `ci.yml` are human-class files.
2. Press Merge on the card of infra #361 (case 7747, the SigNoz move). That press is also the first live proof of a human answer on a `human` lane card (Task 6).
3. Give the go for the roll after Tasks 1 to 3 (Task 5).

## Review Focus

1. A build with the legacy Docker builder ignores `Dockerfile.runner.dockerignore` and copies `.git` into the warm step. Task 1, Step 5 checks which builder CI uses.
2. A new non-Go directory at the repository root (say `design/`) busts the runner's warm cache until someone adds it to the ignore file. Task 1's test names every top-level entry that is neither ignored nor a Go input, so the miss fails a test and not a cache.
3. A comment call that fails after the reorder must leave the revert pull request open, so the next pass comments and closes. Task 2's test pins an open pull request with 0 comments after the first pass and 1 comment after the second.
4. A process file that still carries `merge.groups` after the key is gone must be refused with the key's name, not read as free. Task 3's policy test pins it.
5. The infra repository must drop `groups: free` before the code that refuses the key rolls, or factoryd refuses its own process file. Task 3 fixes the order.

---

### Task 1: The runner image reads every Go tree with no list

Twice in 11 days (2026-11-16 and 2026-11-24) a new Go input had to be added by hand to a list that agents may not push. Each time a card stopped at a human. This is Task 2 of the needs-you faults plan, with its stale lines corrected.

**Files (code repository):**
- Modify: `Dockerfile.runner:160-165` (comment), `:186-189` (the per-tree mounts)
- Create: `Dockerfile.runner.dockerignore`
- Modify: `.forgejo/workflows/ci.yml:28` (delete `RUNNER_INPUTS`), `:101` and `:218` (the `EPOCH=` lines)
- Test: `internal/reproducible/dockerfile_test.go:326-385` (`TestRunnerWarmCacheHoldsNoTestResultsAndNoSource`)

- [ ] **Step 1: Rewrite the test.** It keeps its `-count=1`, `-run '^$'` and final-image `COPY` checks. It drops the per-tree mount list and asserts:
  - the warm step holds exactly one bind mount besides `go.mod` and `go.sum`, with `target=/tmp/src` and no `source`;
  - `Dockerfile.runner.dockerignore` holds `.git`, and excludes none of `goTrees(t)`, `go.mod`, `go.sum`, nor any file `rootPackage` reads (`pins.go`, `upstream-files.txt`, `upstream-images.txt`, `factory/images.yaml`);
  - every top-level entry of the repository is either in the ignore file or a Go input from the line above, so a new entry fails the test until someone sorts it;
  - `ci.yml` holds no `RUNNER_INPUTS`, and both `EPOCH=` lines equal the form in Step 4.
  Keep `goTrees` and `rootPackage`: other tests use them.
- [ ] **Step 2: Run it and see it fail.** `go test -race -run TestRunnerWarmCacheHoldsNoTestResultsAndNoSource ./internal/reproducible/`
- [ ] **Step 3: Write `Dockerfile.runner.dockerignore`** with `.git`, `.forgejo`, `.gitignore`, `docs`, `k8s`, `opencode-plugin`, `CLAUDE.md`, `Dockerfile`, `Dockerfile.sandbox`, `LICENSE`, `Makefile`, `README.md`, `SECURITY.md`, `check`. Check the list against `git ls-tree --name-only origin/main`. Do not ignore `factory`, `proofs` or `scripts`. Replace the four mounts with `--mount=type=bind,target=/tmp/src` and rewrite the comment to say that the ignore file decides what the warm step sees.
- [ ] **Step 4: Change `ci.yml`.** Delete line 28. Both `EPOCH=` lines become `EPOCH=$(git log -1 --pretty=%ct -- . $(sed -e '/^#/d' -e '/^$/d' -e 's/^/:(exclude)/' Dockerfile.runner.dockerignore))`.
- [ ] **Step 5: Check the builder and the cache.** Read the image job in `ci.yml`: it must build with BuildKit (`docker buildx build` or `DOCKER_BUILDKIT=1`), because the legacy builder ignores a per-Dockerfile ignore file. Then build three times with `docker build -f Dockerfile.runner --build-arg SOURCE_DATE_EPOCH=1 .`: once plain, once after `touch docs/x.md` (the warm step shows `CACHED`), once after adding `newtree/x.go` with `package newtree` (the warm step runs). Remove both files. Run the `EPOCH=` line in `sh` and check that it prints one number.
- [ ] **Step 6: Run** `go test -race ./internal/reproducible/` and `bash check changed`. Expected: PASS.
- [ ] **Step 7: Commit and open the pull request.** Its merge waits for Sebastian.

### Task 2: A close comment lands before the close, and a retry refusal names cards

Three small faults in texts the factory writes to a human.

**Files (code repository):**
- Modify: `internal/factoryd/mainfix.go:535` (`closeRevertPR`)
- Modify: `internal/factoryd/templateupdate.go:416-419`
- Modify: `internal/factoryd/deps.go:587`
- Modify: `internal/factoryd/workflow.go:2205-2207` (comment only)
- Test: `internal/factoryd/mainfix_test.go`, the template update's test file, the test that pins the "was cut into successor" text

- [ ] **Step 1: Write the failing test** `TestRollerCommentsBeforeItClosesTheRevert` beside `TestRollerEndsTheRevertWhenMainTurnsGreenWithoutIt`. A human-lane revert card, main green without it, and a Forgejo fake whose `CreateIssueComment` fails once. After the first pass: the pull request is open and holds 0 comments. After the second pass: the pull request is closed and holds exactly 1 comment.
- [ ] **Step 2: Write the same test for the template update's close**, in the file that tests `templateupdate.go`'s close path: a comment that fails once leaves the pull request open, and the next call ends with one comment and a closed pull request.
- [ ] **Step 3: Change the expected text** in the test that asserts the cut refusal to `Card #12 was cut into successor #13, which carries its work and its dependents: answer that card instead.` (use the fixture's own numbers).
- [ ] **Step 4: Run the three tests and see them fail.**
- [ ] **Step 5: Implement.** In `closeRevertPR` and at `templateupdate.go:416-419`, call `CreateIssueComment` before `ClosePullRequest`. A close that fails after the comment landed gets a second comment at the next pass. That is accepted: no guard. In `deps.go:587` drop `(%s)` and `succ.ID`. Rewrite the comment at `workflow.go:2205-2207`: the successor continues the old card's branch, and starts from main's tip only when that branch is gone.
- [ ] **Step 6: Run** `go test -race ./internal/factoryd/` and `bash check changed`. Expected: PASS.
- [ ] **Step 7: Commit and open the pull request.**

### Task 3: Delete the unused `merge.groups` setting

The shipped process sets `groups: free`, and nothing selects `one_at_a_time`. The setting is a second way to hold merges beside the production hold, which stays.

**Files:**
- Infra repository, first: `factory/processes/spec.yaml:23` becomes `merge: {queue: project}`.
- Code repository, after the infra change is on infra main and applied:
  - Delete: the group branch of `EnterQueue` (`internal/factoryd/queue.go:173-188`) and `groupWait` (`:221-246`).
  - Delete: `fillHeldFor` and its caller (`internal/factoryd/console_store.go:273`, `:330-350`), `BoardTask.HeldFor` (`:54-56`), its uses in `internal/console/board.go:447-448`, `:1838`, `:1954` and `faceview.go:497-498`.
  - Delete: `GroupsFree`, `GroupsOneAtATime`, `GroupsValues`, the `Merge.Groups` field and its two checks (`internal/policy/process.go:100-104`, `:192-197`, `:289-296`), and the `groups_queue` refusal (`internal/policy/policytest/refusals.go:73-77`).
  - Delete: the tests of the above in `queue_test.go` and `process_test.go`, and `docs/manual/gates.md:468-480`.
  - Keep: `OpenGroups` and every use of it by the roller.
- The process schema in the infra repository (`factory/schema/process.schema.json:199-204`) is a copy of the code's schema. Step 6 checks that the copy follows. Do not edit it by hand.

- [ ] **Step 1: Infra.** Change `spec.yaml:23`, open the pull request, merge it, and check that factoryd loaded the process file with no refusal (`kubectl -n factory logs deploy/factoryd --since=10m | grep -i process`).
- [ ] **Step 2: Write the failing tests.** `TestEnterQueueNeverHoldsForAnotherPlansGroup` in `queue_test.go`: plan A has an open group on main, a card of plan B asks for the queue, and it enters with no wait. `TestProcessRefusesMergeGroups` in `process_test.go`: a process file with `merge: {queue: project, groups: free}` fails to load, and the error names `groups`.
- [ ] **Step 3: Run them.** The second fails: the key still loads. The first passes already, because the process is `free`. It stays as the guard that the deletion removed the hold and not the queue.
- [ ] **Step 4: Delete** everything in the list above. `go build ./...` names each leftover use.
- [ ] **Step 5: Run** `go test -race ./...` under `scripts/pg-test.sh` and `bash check changed`. Expected: PASS.
- [ ] **Step 6: Commit and open the pull request.** After its merge, check that the schema copy opened its pull request on the infra repository without `groups`.

### Task 4: The registers say what is closed

**Files (this repository):**
- Modify: `docs/needed-fixes.md`, `docs/needs-you-register-2026-11-09.md`, `docs/plans/2026-11-17-needs-you-faults.md`
- Delete (untracked, local): the root notes named in Step 4

- [ ] **Step 1: Cut `docs/needed-fixes.md`** to its title, the rule that a fixed fault leaves the list, and one line: no fault is open on 2026-11-26. Twenty documents link the file, so it stays.
- [ ] **Step 2: Add one paragraph under the title of the needs-you register:** on 2026-11-26 every entry marked "Still open" was checked against code main `c2dddcd67`. Entries 77, 80, 81, 83 to 87, 92, 93, 95 to 99, 101 and 102 are closed or by design. Entries 82, 88, 91, 100 and 104 need no change. The register is closed.
- [ ] **Step 3: In the needs-you faults plan,** tick Tasks 1 and 5, write under Task 2 that it moved to this plan, and write under Tasks 3 and 4 that they are dropped, each with its reason from the table above.
- [ ] **Step 4: Delete the local root notes whose every item is closed:** `dogfood-log-2026-10-31.md`, `needs-you-analysis-2026-11-01.md`, the thirteen `handover-fault*` files, `factory-faults-2026-11-17.md`, `card-flow-2026-11-02/`, and every `session-notes-*` file. They are untracked, so the delete cannot be undone. The two `prompt-*` files describe work that is built: delete them too.
- [ ] **Step 5: Commit** the three tracked files to `master` and push.

### Task 5: Hand work, then the roll

- [ ] **Step 1: Close card #2292** (`t-da5066e15781`, failed since 2026-11-24, its work went to a successor) with Close on its card.
- [ ] **Step 2: Clean the code repository's checkout.** For each of the worktrees `criteria-human-verdict` (4 uncommitted files), `t4-n104-pod-memory` (commit `3b0bb8c7e`), `done-reason`, `roll-2044`, `roll-b5d` and the local branches `exp-ci-memory`, `factory/t-59bab833d3ef`, `pr-1450`, `pr1408`, `t319-export`, `t325-daycap-clock`, `t4-n104-pod-memory`, `train-6`: read `git log origin/main..<branch> --oneline` and `git status`. A change that main already holds in another form is deleted. A change that main lacks is shown to Sebastian in one line before its delete. Then check out `main` and pull. In the infra repository: delete `pr197` by the same rule and pull `main`.
- [ ] **Step 3: Roll.** With Tasks 1 to 3 merged and Sebastian's go, answer the roll-held card with Deploy now. Check that the `rolls` table shows main's head live for all four images.

### Task 6: The first run is watched with queries

Nine work-loss fixes, the open-cards fixes and the follow routine's failure path rolled with no session to exercise them. Forcing each one costs more than it proves, so the next work Sebastian files is the check. Run this task once a day while that work runs, and record each result with its event or case id in this plan's progress ledger.

- [ ] **Step 1: Drop the two checks that can no longer run.** The live checks of work-loss faults 18 and 21 read `tasks.extra_lines`, which the card-room migration removed. Rewrite the check of fault 18 to read the budget case's text alone, and delete the check of fault 21, whose fix left with the line raise.
- [ ] **Step 2: Sebastian's Merge press on case 7747** is the proof of a human answer on a `human` lane card: the infra pull request #360 merges, the case resolves, and the card ends done.
- [ ] **Step 3: Each day, run the work-loss plan's live queries** for faults 12 to 19 and 22 with the window set to the roll of Task 5. A row that shows the old fault is a bug: fix it the same day, by the flow of the Global Constraints.
- [ ] **Step 4: Each day, read the new cases at a human:** `SELECT id, kind, task_id, opened_at FROM cases WHERE status='at_human' AND opened_at > '<roll time>'`. For each one, decide whether the factory could have decided it. If yes, that is a fault for this plan's ledger and a fix.
- [ ] **Step 5: On 2026-11-30, close the merge-queue plan's open boxes.** Run `SELECT task_id, created_at FROM events WHERE kind='queue_left' AND detail->>'why'='the card waits for a human'`. With a row, check that the card behind it got its `queue_turn` within a minute. With no row, run that plan's stage-one probe: two small cards in the queue, and the front one asks a human during its turn. Tick the boxes in [2026-11-16-merge-queue-turn.md](2026-11-16-merge-queue-turn.md).
- [ ] **Step 6: Watch for these on their first occurrence**, and record each: a plan's failed card with no dependent goes to the factory agent before a human, a criteria gate runs a moved test where it went, a move card trips no size detector, a card stopped on green checks retires with no human, a failed follow move returns and files its "Try again" card.
- [ ] **Step 7: The plan ends** when one piece of filed work ran from its first card to its roll with no hand fix, or when every fault this task found is fixed and rolled.
