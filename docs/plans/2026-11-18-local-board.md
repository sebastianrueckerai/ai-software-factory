# Local landing of the board's open work: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** land on main of `ai-software-factory-code` the work the factory's board held on 2026-11-18, while the model credits are out until Monday. The cards are closed. Their specs and branches are kept, and this plan does their work locally.

**Spec:** each task's spec is the card or pull request text saved from the factory as `cards/<number>.md` beside the plan's working notes, read with the plan revision it came from. The text is the factory planner's brief. Where it says "this card", "the session" or "the sandbox", read "this task". The sandbox rules (no git credentials, no fetch, the harness pushes) do not apply locally.

## Global Constraints

- The code repository is `~/repos/ai-software-factory-code`. Read its CLAUDE.md. Every task works in its own git worktree on a branch from `origin/main`, merged with the newest `origin/main` before its pull request.
- A task lands as one pull request from the controller's fork (`fork` remote, user `controller`) to `sf/ai-software-factory-code` main. It merges only after its CI checks pass (`pr / test`, `vet-and-format`, `security`, `job-env-audit`, `changes`) and the task review is clean.
- Tests: `go test -race ./...` for the packages a task touches. Postgres-backed tests run beside a throwaway Postgres 17 in docker, with `FACTORYD_TEST_DATABASE_URL` and `GATEWAY_TEST_DATABASE_URL` pointing at it. The factoryd package takes about 4 to 8 minutes.
- Workflow code changes need a `workflow.GetVersion` change id, checked with the replay fixtures under `internal/factoryd/testdata/fixtures`.
- No test is weakened, skipped or deleted to pass. A moved test keeps its name.
- No ruling number and no ledger path in a tracked file or a commit message. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Another session lands fault fixes on main at the same time. Merge `origin/main` before the pull request and again if main moves before the merge.

## Lane A: the factoryd Postgres tests move into internal/factoryd/pg (plan #1915)

At main, ten `*_pg_test.go` files remain in `internal/factoryd`: ladder, rung1_ladder, rung2, monitor, cases_events, console_store, judgment_budget, store, case_waits and queue_reason. The act family (#2195) shows the pattern: package `pg`, new exported names only in a new `internal/factoryd/pgexport_*.go`, the smallest `pg/pg.go` shim, fixtures copied to `pg/helpers_*_test.go`, the replay register rows of moved tests in the `"internal/factoryd/pg TestName"` form.

### Task 1: Move the ladder pair (#2212)

Spec: `cards/2212.md`. Start from branch `refs/local-board/t-23bbfa2371f4` (c1729d85, #2177's green half: ladder_pg_test.go moved) and `refs/local-board/t-b431e652a447` (fafa28ad6, #2212's session) in the local code repository. Port the ladder and rung1_ladder move onto current main. Main changed ladder_pg_test.go (+102 lines), rung1_ladder (+6) and pg/pg.go (131 lines) since, so take main's content of each test and move that.

- [x] Both files are in `internal/factoryd/pg`, every top-level test keeps its name, and both packages pass.

### Task 2: Move rung2, monitor and cases_events (#2178)

Spec: `cards/2178.md`.

- [x] The three files are in `internal/factoryd/pg`, and both packages pass.

### Task 3: Move the last five (#2179)

Spec: `cards/2179.md`: console_store, judgment_budget, store, case_waits, queue_reason.

- [x] No `*_pg_test.go` file is left directly under `internal/factoryd`, and both packages pass.

### Task 4: Prove the move (#2062)

Spec: `cards/2062.md`. Measure both suites, the factoryd one in the background, and report the times against the 900-second cap. Check that every top-level test function of the 14 files at the round's start still runs under `./internal/factoryd/pg`, that `internal/factoryd` still exports every name it exported before, and that no test in either suite is skipped.

- [x] The measured times and the checks are in the task report. A cap overrun is reported, not hidden.

## Lane B: the provider-limit freeze and its retry switch (plans #1955 and #2188)

### Task 5: Land the retry switch mechanism (#2201, pull request #2215)

Spec: `cards/2201.md`, `cards/2215.md`. Pull request #2215 is open on branch `factory/t-1a7696e5bb58` (local `refs/local-board/t-1a7696e5bb58`, 675af846b). Its gates did not run (the model credits ran out). Review it against the spec, run its tests, fix what fails, merge main. It must reuse `FreezeCard.CloseOnRetry` (internal/factoryd/freezecard.go) and add no second close.

- [x] `TestRetrySwitchEndsFreeze` and the gateway's hold-clear tests pass, the hold-clear route refuses a request without the per-request identity auth, and #2215's work is on main.

### Task 6: The retry switch's two entry points (#2202)

Spec: `cards/2202.md`: the freeze card's retry button with its console route and `Config.RetryFreeze`, the chat's `ActRetry` routing a frozen case to `RetryFreeze`, `CaseFacts.FreezeCard`, and the wiring in cmd/factoryd.

- [x] Both entry points reach `RetryFreeze`, with tests.

### Task 7: The retry switch end to end (#2203)

Spec: `cards/2203.md`.

- [x] `TestRetrySwitchEndsFreeze` covers both entry points and passes.

### Task 8: Land the acceptance rig (#2204, pull request #2213)

Spec: `cards/2213.md`. Pull request #2213 is open on branch `factory/t-6bc7e4bccc36` (local `refs/local-board/t-6bc7e4bccc36`, 8bf559772). Its audit reported findings and its review concerns. The gate texts are on the pull request's comments. Address them, run the acceptance tests it adds, merge main.

- [x] The rig and its five tests are on main and pass.

### Task 9: The remaining acceptance tests (#2206, #2207, #2208)

Specs: `cards/2206.md` (retry switch), `cards/2207.md` (wait to reset), `cards/2208.md` (digest quiet, brief wake). Built on Task 8's rig and Tasks 5 to 7's switch.

- [x] Each test is on main and passes.

### Task 10: Prove plan #1955's nine criteria (#2209)

Spec: `cards/2209.md`. Run every criterion's named test on main and the acceptance suite, and report each outcome.

- [x] All nine pass on main, or the report names the one that does not and why.

## Lane C: two single pull requests

### Task 11: Land the re-cut test (#2210, pull request #2214)

Spec: `cards/2210.md`, `cards/2214.md`. Pull request #2214 is open on branch `factory/t-d9c474e16061` (local `refs/local-board/t-d9c474e16061`, 4b06b994c). Review it, run `TestCardRecutMidRunKeepsAWorkingPush` and the push packages, merge main.

- [x] The test is on main, in its own file at the path its criterion names, and passes.

### Task 12: The census fixes main still lacks (#2211)

Spec: `cards/2211.md`. Start from branch `refs/local-board/t-2f63144cdfcd` (d3019466, #1899's branch), merge main, taking main's side in the conflicts. Land the fold summary naming the size in KiB, the planSlotFacts derivation so every plan case takes the one-question slot, and the extend form in the drawer only, with the five proof tests the spec names.

- [x] The three fixes and five tests are on main and pass, with the console suite green.

## Outcome

The work landed on main of `ai-software-factory-code` as nine merges:

| Pull request | Merge | Tasks |
|---|---|---|
| #2219 | ae504788c | 11 |
| #2221 | 1c92cb5cf | 12 |
| #2224 | 9c04b765b | 1 to 4 |
| #2220 | 77d6a1899 | 5 |
| #2230 | 9935270b7 | 6 |
| #2229 | 4a3e37537 | 8, and 9's wait, digest and brief tests |
| #2235 | 12dee5d08 | 7 |
| #2238 | f11808c2b | 9's retry switch test |
| #2243 | 260024d66 | the final review's fixes |

At f11808c2b the nine criteria passed as unit tests and as acceptance tests, and the whole acceptance suite passed.

The final review's fixes bound a press to the reset its freeze card showed, so a later freeze files a new card. Every close of a freeze card posts its own comment, and every press writes a `freeze_retried` event naming who pressed. A self-resume that holds five minutes wakes the class's frozen cards. A card a human closed stays closed. `TestFreezeCardStateTable` walks the freeze card's states, each with and without a restart.

Known gaps after the fixes, each needing a failed database write between two others:

- If the reopen's face write fails and the class resumes before the retry, the card stays waiting under the press face. A later freeze then adopts it and asks the 24-hour question at once.
- If a press's row close fails and factoryd restarts, that card's end is not counted.
- If a press and a re-arm fall in one write window, the reopen's forget fails, factoryd restarts and a human closes the card in the console, the card reopens once with a false comment.
- A restart restores a kept filing only in the repository of the class's newest arm.

