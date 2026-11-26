# Open Faults Before the Next Autonomous Run: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the faults that are in the code or on the cluster today, and watch the two fixes that no live run has proven.

**Architecture:** Every item below was checked on 2026-11-26 between 22:30 and 23:30 UTC against one of three sources: the code at main `c2dddcd67`, the live `gateway` database (SELECT only), or the cluster (`kubectl get`). A note or a plan that names a fault counts for nothing here. The result is three small code faults in one pull request, some housekeeping, and a watch. No feature is added.

**Tech Stack:** Go (factoryd, policy), Markdown.

**Spec:** None. The evidence tables below stand in for it.

## What the live record shows

The factory's own record of 2026-11-19 to 2026-11-26 answers what stopped at a human. Of 83 cases opened in that week, factoryd ended 45 by itself, the factory agent decided 21, the check-in 9, and a human or a by-hand session 7. One is open.

| Case | Date | What stopped | Time at the human | State today |
|---|---|---|---|---|
| 7455, 7744 | 11-19, 11-26 | A card's checks ran past their time limit, turned green, and the card still waited | 8 h 47 min, 9 h 14 min | Fixed in code commit `63b54a95c`, rolled 11-26 19:58. No session ran since. Not proven live. Task 4 watches it. |
| 7456, 7629 | 11-19, 11-24 | A schema copy to the infra repository waited for a human merge | 1 min, 9 h 19 min | Closed, proven live. `factory-agent` merged the copies #348, #351 and #352 itself on 11-25 and 11-26 (infra main's log). |
| 7513 | 11-24 | Three failed rolls asked "Try the roll again?" | 1 h 58 min | Closed in code commit `38d52bc3f`. A merged roll closes the older failed roll cards. |
| 7727 | 11-24 | A plan's criteria were never judged because the checks still ran after 40 minutes | 7 h 32 min | Same cause as the first row. |
| 7458 | 11-19 | The provider's limit froze the coder class | 4 days | Outside: the provider's credits were spent. A human pressed Retry now. |
| 7747 | 11-26 | The follow routine's move of part signoz waits for a merge | open | By design: the part is of the `human` lane. See Task 3. |

Two more facts of the same week:

- The follow routine merged two infra moves on 11-26 that broke the factory: local-path stopped every CI runner for ten hours, and LiteLLM stopped every model call for eleven. Both are fixed by hand on infra main (`a41cc58`, `56c1f5e`, `e4d10c6`), and the judgment now asks again after the settle time. A fault on a path that nothing takes inside the 10 minutes of settling still passes. That limit is written in [../infra-follows-bump-spec-2026-11-25.md](../infra-follows-bump-spec-2026-11-25.md) section 7 and is accepted.
- The cluster is healthy: Flux reports every Kustomization and HelmRelease ready, no pod is pending, and the 19 pods in `Error` are single failed runs of cron jobs from 2 to 29 days ago whose later runs passed.

## Faults that are in the code today

The table answers which faults were read in the code at main `c2dddcd67`, and what each costs.

| No. | Fault | Evidence | Cost when it occurs | Seen live |
|---|---|---|---|---|
| 1 | Every follow judgment raises a false `gate_bound` alert that nothing resolves | `ActivityFollowJudge` and `ActivityRoutineRun` take the default bound of 120 s (`internal/factoryd/gatewatch.go:89-97`, `internal/policy/policy.go:866-868`). The judgment waits 10 minutes by design (`rolloutSettle`). | A false alert row for each run | Yes: 5 open rows from `FollowJudge` and 3 from `RoutineRun` in `alerts`, 11-25 and 11-26 |
| 2 | A close comment is lost when its call fails after the close | `closeRevertPR` closes, then comments (`internal/factoryd/mainfix.go:540-543`). The template update does the same (`internal/factoryd/templateupdate.go:416-419`). The retry reads the pull request as closed and returns. | One comment that says why the factory closed a pull request | No |
| 3 | A retry refusal prints a task id to a human | `internal/factoryd/deps.go:587`: "was cut into successor #%d (%s)" with `succ.ID` | A wording rule broken | No |

## Claims of the first version of this plan that did not hold

| Claim | What the check showed |
|---|---|
| Card #2292 needs a hand close | Its row has `settled_at` 2026-11-24 12:52 and the closing reason "closed into successor". The step is removed. |
| The schema copy is an open human stop | The factory merges it itself since 11-25. Proven on infra main. |
| The runner image's input list stops a card "twice in 11 days" | One card stopped, #2100 on 11-16 (case 5916 and the human card #2101). The edit of 11-24 was a commit by hand, no stop. One stop in six weeks does not pay for a change to `Dockerfile.runner`, its cache and the image epoch. Dropped. |
| The unused `merge.groups` setting should be deleted | True that nothing selects it: `spec.yaml` sets `groups: free` and `maintenance.yaml` has no key. It is no fault and no gap. The delete needs an ordered change across two repositories for no gain in autonomy. Dropped. |
| The follow routine's failure path "never ran live" | Half true. Two moves failed live on 11-26 and the judgment passed both. The cause is fixed. What never ran is the return and its "Try again" card. |

## Items checked and left as they are

Each line was read in the code today.

- **A plan stalls on a failed card nothing depends on.** Closed: `ownFailedCard` (`internal/factoryd/verdict.go:2562`, commit `c314d5946`) opens a case on the plan card. Not verified: that the factory agent decides that case before a human does.
- **The heal pass's false "factoryd restarted" sentence.** Closed: `AsklessReason` (`internal/factoryd/temporal.go:486`).
- **A card that cites a test main already has.** Covered: `ProofsAtMain` (`internal/factoryd/proofsatmain.go`) closes such a card done when its branch holds no work and the cited tests pass at main.
- **A carry card is measured from main.** By design: `FitBound` (`internal/factoryd/pushrules.go:55`) bills every branch against its merge base with main, a continued branch too. The bound caps one pull request's size.
- **CI runs over the 40-minute checks bound.** Real and frequent: 11 of 304 runs since 11-17, the median run takes 14 to 29 minutes. The stop goes to the ladder, and the fix of the first row above retires it once the checks are green. No change until Task 4 shows that fix failing.
- **Node data partition.** Each node reports 83.5 GiB allocatable. No eviction and no pending pod. [../roadmap-by-hand.md](../roadmap-by-hand.md) item 252 holds the resize for the next rebuild.
- **Not checked today, taken from one earlier read of the code:** the seven freeze-card cases, the lost webhook on a failed card, `halt`'s order, the merge with no file overlap, the factory month cap at admission. None was ever seen live. No task builds on them.

## Global Constraints

- Code work runs in a git worktree off `origin/main` of `~/repos/ai-software-factory-code`. One pull request from `controller/ai-software-factory-code`, with the controller login, merged as `sebastian`.
- The merge needs green CI and an independent review on the most capable model with no blocker.
- `bash check changed` passes before each commit. Go tests run with `go test -race`.
- Task 1 changes no workflow code. If a change reaches workflow code, it needs a `workflow.GetVersion` change id and a replay test.
- A fix reaches production only through a roll, and a roll needs Sebastian's go.
- No task id in a text a human reads. A human is a human. No ruling number and no ledger path in a tracked file or a commit message.

## Review Focus

1. A follow judgment that hangs must still raise its alert. Task 1's bound equals the activity's own timeout, so a run past it trips.
2. A comment call that fails must leave the pull request open, so the next pass comments and closes. Task 1's tests pin 0 comments and an open pull request after the first pass, and 1 comment and a closed pull request after the second.
3. A policy file that sets its own `bounds.FollowJudge` is refused today as an unknown activity. Task 1 keeps that: the new values go into `DefaultBounds` only, as `CopyUpstreamImages` does.

---

### Task 1: Three small faults in one pull request

**Files (code repository):**
- Modify: `internal/policy/policy.go:866-868` (`DefaultBounds`)
- Modify: `internal/factoryd/mainfix.go:535-545` (`closeRevertPR`), `internal/factoryd/templateupdate.go:416-421`
- Modify: `internal/factoryd/deps.go:587`
- Test: `internal/factoryd/gatewatch_test.go`, `internal/factoryd/mainfix_test.go`, the test file of `templateupdate.go`, the test that asserts "was cut into successor"

- [ ] **Step 1: Write the failing test** `TestLongActivitiesAreBoundAtTheirOwnTimeout` in `gatewatch_test.go`. For a policy document with no `bounds`: `Bound(ActivityFollowJudge)` equals `rolloutCap+rolloutSettle+followJudgeSlack` (50 minutes), and `Bound(ActivityRoutineRun)` equals the start-to-close timeout that the routine workflow sets for that activity. Read that timeout where the workflow schedules `ActivityRoutineRun`, and name its constant in the test.
- [ ] **Step 2: Write the failing test** `TestRollerCommentsBeforeItClosesTheRevert` beside `TestRollerEndsTheRevertWhenMainTurnsGreenWithoutIt`: a human-lane revert card, main green without it, and a Forgejo fake whose `CreateIssueComment` fails once. After the first pass the pull request is open with 0 comments. After the second pass it is closed with exactly 1 comment.
- [ ] **Step 3: Write the same test for the template update's close:** a comment that fails once leaves the pull request open, and the next call ends with 1 comment and a closed pull request.
- [ ] **Step 4: Change the expected text** of the cut refusal's test to `Card #<old> was cut into successor #<new>, which carries its work and its dependents: answer that card instead.` with the fixture's numbers.
- [ ] **Step 5: Run the four tests and see them fail.** `go test -race -run 'TestLongActivitiesAreBoundAtTheirOwnTimeout|TestRollerCommentsBeforeItClosesTheRevert' ./internal/factoryd/` plus the two others by name.
- [ ] **Step 6: Implement.** Add `"FollowJudge": 3000` and `"RoutineRun": <its timeout in seconds>` to `DefaultBounds`. In `closeRevertPR` and at `templateupdate.go:416-421`, call `CreateIssueComment` before `ClosePullRequest`. A close that fails after the comment gets a second comment at the next pass: accepted, no guard. In `deps.go:587` drop ` (%s)` and `succ.ID`.
- [ ] **Step 7: Run** `go test -race ./internal/factoryd/ ./internal/policy/` and `bash check changed`. Expected: PASS.
- [ ] **Step 8: Commit, open the pull request, merge after CI and review.**
- [ ] **Step 9: Roll** with Sebastian's go: Deploy now on the roll-held card. Check that the `rolls` table shows main's head live for all four images. The eight open alert rows of today stay as they are.

### Task 2: The docs say what is closed

**Files (this repository):**
- Modify: `docs/needed-fixes.md`, `docs/needs-you-register-2026-11-09.md`, `docs/plans/2026-11-17-needs-you-faults.md`

- [ ] **Step 1: Cut `docs/needed-fixes.md`** to its title, the rule that a fixed fault leaves the list, and one line: no fault is open on 2026-11-26, and this plan holds the three that the code showed. Twenty documents link the file, so it stays.
- [ ] **Step 2: Check the needs-you register before it is closed.** An earlier read found each of its 22 "Still open" entries closed or by design. That read is one agent's and is not confirmed here. For each entry, find the test or the code line that closes it at main, and run the test. Then add one paragraph under the title that names the closed entries and the commit. An entry that is still open becomes a row of this plan's fault table, with its evidence.
- [ ] **Step 3: In the needs-you faults plan,** tick Tasks 1 and 5 after a check that `checkinSystemFor` takes `priors` and that `BriefModel` exists at main. Write under Task 2 that it is dropped for the reason in this plan, under Task 3 that `ProofsAtMain` covers it, and under Task 4 that the brief writer was rebuilt and that the fault caused one mislabelled sentence.
- [ ] **Step 4: Commit** to `master` and push.
- [ ] **Step 5: The local root notes stay** until Sebastian says which may go. They are untracked, so a delete cannot be undone.

### Task 3: Hand work

- [ ] **Step 1: Case 7747.** The database holds one case at a human: 7747, `human_card`, on `sf/ai-software-factory-infra`, card infra #361, pull request #360, opened 2026-11-26 14:15. Open the infra project's screen. If the card shows, Sebastian answers it with Merge it or Reject and close it. If the screen shows nothing, that is a fault: a case at a human that no screen shows. Then trace the board's read for a `human` card whose case carries `"held": true` in its facts, and add the fault to this plan's table with its evidence.
- [ ] **Step 2: The code repository's checkout.** The main tree sits on `factory/t-59bab833d3ef`, 1 commit ahead of main. The worktrees are `criteria-human-verdict` (4 uncommitted files), `t4-n104-pod-memory` (1 commit, `3b0bb8c7e`), `done-reason`, `roll-2044` and `roll-b5d`. For each, read `git log origin/main..HEAD --oneline` and `git status`. Remove a worktree or a branch whose change main holds. Show a change that main lacks to Sebastian in one line before its delete. Then check out `main` and pull.

### Task 4: The next run is watched

No session ran since the roll of 2026-11-26 19:58, so the fix for the week's longest stops has no live proof. The next work Sebastian files is the check. Record each result with its case or event id in this plan's progress ledger.

- [ ] **Step 1: After each working day, list what reached a human:** `SELECT c.id, c.kind, c.opened_at, c.resolved_at, c.resolution->>'by', left(c.problem,150) FROM cases c WHERE c.opened_at > '<roll time>' AND (c.status='at_human' OR c.resolution->>'by' NOT IN ('factoryd','factory-chat','checkin')) ORDER BY c.id`. For each row, decide from the case's steps whether the factory could have decided it. If yes, find the cause in the code, add it to this plan's fault table with its evidence, and fix it by the Global Constraints.
- [ ] **Step 2: Watch the checks stop.** `SELECT id, opened_at, resolved_at, resolution FROM cases WHERE kind='gate_stop' AND opened_at > '<roll time>'`. The fix holds when a case whose checks turned green is resolved by `factoryd` within minutes. It fails when such a case waits at a human: then read the case's `case_steps` for the refused step, which the fix writes.
- [ ] **Step 3: Watch the false alerts.** After Task 1's roll and the next follow run: `SELECT count(*) FROM alerts WHERE kind='gate_bound' AND source IN ('FollowJudge','RoutineRun') AND raised_at > '<roll time>'`. Expected: 0.
- [ ] **Step 4: Watch the follow routine's return.** It is proven only when a move fails. On the first failed move, check that the revert merged, that Flux's statuses on it are success, and that one "Try again" card stands.
- [ ] **Step 5: The plan ends** when one piece of filed work ran from its first card to its roll with no hand fix, and every fault that Steps 1 to 4 found is fixed and rolled.
