# Handover: the factory's speed round

Written on 2026-10-14 for a fresh controller session in this repository, from Sebastian's questions of the day about a card that sat 52 minutes before its merge, and his decisions: many small tasks, each visible from plan to merge, each merged minutes after green, and the factory updating itself without stalling. No batch merges: the queue stays serial, one task at a time. The fix is a cheap turn, not several turns at once.

## Read first

- [roadmap.md](../roadmap.md): items 222 (development speed), 157 (a second replica, rejected; the reattach form below is a different thing), 225 (the lanes collapse, planned), 227 (the console design, planned, waits for this round).
- [architecture.md](../architecture.md): rulings 269 (rolls in a session gap), 205 and 208 (the merge queue), 299 (`stronger_after`), 109 (the approve click is the only door to a merge), 322 (the attempt's floor).
- [2026-10-14-lane-collapse.md](2026-10-14-lane-collapse.md): the track at filing, which item 5a below must fit.

## Rules of the round

- Work in worktrees of `~/repos/ai-software-factory-code` (Forgejo `origin`, branch `main`), never in the main checkout. Controller-direct merges have precedent (item 222a, commit 28ecf6f); a card through the factory is the normal way.
- Every roll of your own change you approve yourself in the console as `controller` (ruling 109; the controller approved roll PR 647 on 2026-10-14).
- Write the plan as `docs/plans/2026-10-14-speed.md` before the first code change, with the baseline below in it. Record every decision in the roadmap. Reports and commit messages follow the writing guide in `~/.claude/skills/ste-writing`.
- No half measures: every item lands with its verification, or the report says at the top what did not.

## The baseline, measured on 2026-10-14

Card t-1b61adf1c307 (issue 641, PR 648):

| Stage | Window (UTC) | Time |
|---|---|---|
| Intake | 09:00:53 to 09:02:11 | 1.3 min |
| Session 1, coding-cheap | 09:02:11 to 09:17:51 | 15.3 min, pushed nothing, ended by the supervisor's `retry_stronger` after two no-write trips |
| Session 2, coding-frontier | 09:18:13 to 09:46:31 | 27.5 min, the work |
| CI on the pull request | 09:46:31 to 09:53:29 | 7.0 min; the test job 5 min 38 s, the image build 3 min 9 s |
| Policy, reproduction, review, audit gates | 09:53:29 to 09:53:52 | 23 s |
| Queue, behind roll PR 647 | from 09:53:52 | the roll was approved at 09:52:56 and waited for a session gap while card 639 ran |
| Second CI round after the roll merged | from 10:10:17 | the sync re-check, a full round again |

The board showed the card's total age while it sat in Verifying. The gates are not the cost; the roll's gap, the re-check, the test job and the first cheap session are.

## Work items, in this order

Each is a section of the plan with its own verification and its own roll.

1. **Rolls leave the merge queue.** A roll (filed by factory-agent, digest bumps in `k8s/*.yaml`) never takes a project queue turn; cards merge past it. The roll still waits for its gap until item 2 lands. Code: the queue entry in `internal/factoryd/gates.go`, the roll path in `plan.go` (`awaitRollHold`). Verify live: a green card merges while a roll waits.

2. **Sessions survive a factoryd restart, so a roll needs no gap and no hold.** Today `RunSession` (`internal/factoryd/activities.go`) is a Temporal activity on factoryd's worker; a restart stops its heartbeat, Temporal retries it on the new factoryd, and the retry's `freshNamespace` deletes the pod and starts the attempt again from the last checkpoint, losing the model's context and one session of the cap. Build the reattach: the sandbox (namespace, pod) and the runner's `live`, `running`, `admitted` and `filed` maps (`runner.go`) persisted as rows or rebuilt on boot from the rows and a pod listing; the retried activity reconnects to opencode's server in the live pod and reads the messages since the last recorded event; `freshNamespace` only for a dead pod; the agent's pending question read from the issue and the row, not from the dead channel; the gate supervisor's `wait` and `retry` as workflow timers. Then remove the roll hold and the gap (`rollWaitOptions`, `AwaitSessionGap`, `AwaitRollHold`, `roll_holds`) behind a change id, and shorten the boot wait. Verify: kill factoryd under a running session (a real card; `scripts/console-lab/run.sh` on branch `console-design` serves the console for the look) and the session continues to its push; a roll merges at once with sessions running.

3. **CI under 2 minutes for a console change, under 4 for a factoryd change.** `.forgejo/workflows/pr.yml`, the test job: today `go test -race -p 1` runs every package serially on the one Postgres of `scripts/pg-test.sh`. Give each package its own database on that server and run packages in parallel; no `-race` on pull requests; `-race` and the full suite on `main` and a nightly run; the affected-package selection (item 222a) stays. Measure the same cards before and after.

4. **A cheap merge turn.** At the queue head, after `SyncWithMain` merges `main` into the branch cleanly, skip the re-check when `main`'s new commits touch no file of the pull request; otherwise re-check the affected packages only. Review and audit start in parallel with CI. Build the backstop first: a red `main` pauses the project's queue, files the fix-forward card (643's naming is the signal), and reverts the merge when the card does not land within a bound. The queue's five-minute recheck poll becomes event-driven on check completion. Verify: a green small card merges within a minute of green.

5. **The model tier.** (a) The starting rung is chosen at filing: size large, a plan-track card or a change under `internal/factoryd/` starts on coding-frontier; small and medium cards, docs, tests and verification cards start on coding-cheap; the chat's `new_card` and the planner set it with a one-line reason; the policy's `models` ladder stays the bound; the field must fit the track of the lane collapse. (b) A cheap first attempt has a cap of 8 minutes to push or end. (c) The climb happens inside the session: on `retry_stronger` the running session switches to the stronger alias (a key re-mint for the alias, the model switch through the harness) instead of ending; `stronger_after` is 1 for medium and large cards. (d) The price alias: `internal/policy/prices.go` cannot price `coding-cheap` ("LiteLLM has no model"), so `AttemptFunded` fails open; fix the alias map and make an unpriceable model refuse the attempt. Verify on ten cards: time to first push by rung, climbs, cost.

6. **Cheaper subagents for expensive sessions.** Both forms. In the harness: opencode subagents on coding-cheap through the task's own key, so the ledger bills the task and the result returns into the frontier model's context; first check that the gateway admits every alias of the class ladder on one key, and add that if not. As cards: a `delegate` tool that files a small direct child card on the cheap rung with a dependency, in the shape the lane collapse gives children. The frontier model gets both in its tool descriptions with one rule: routine, well-specified work goes down a rung.

## Not in this round

Batch merging (Sebastian: no). A second factoryd replica (157 stays rejected). The lanes collapse itself (its own round; item 5a's field must fit its schema). The console design (227) follows this round, because its rolls need items 1 and 2.

## Report at the end

The baseline above against the after, on the same measurements and the same kinds of cards; every roll's number; what is not verified; the roadmap items ticked and the decisions recorded.
