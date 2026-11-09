# Needs you on full auto: what stopped, who decided, and why the factory did not

Started 2026-11-09. The rule (Sebastian, 2026-11-09): on full auto the factory agent looks at every stop first and decides whenever it can. A human decides only what the factory cannot. This register records every stop that reached Needs you, who decided it in the end, what full auto should have done, and why it did not. It is the list of what to fix. Each entry carries one of four verdicts:

- **not built**: the step that should decide exists in the design and not in the code. The entry names the phase or card that builds it.
- **bug**: the step exists and acts wrong. The entry names the card.
- **by design**: the design sends this stop to a human. The entry says whether that still fits the rule, and names the decision if not.
- **works**: the factory decided on its own. Kept so the record shows what already holds.

The entries come from the board loop of 2026-11-09 (notes in `session-notes-2026-11-09-board-loop.md`, untracked). The code is main `e3c62276`. Phases refer to [card-flow-redesign-2026-11-02.md](card-flow-redesign-2026-11-02.md) section 9. Phase 3 is plan #1541's round 1 (cards #1559, #1561, #1563, #1566). Phases 4 and 5 are its rounds 2 and 3.

## 1. A plan's questions wait for a human

Nine questions on the revision 1 of plans #1541, #1545, #1547 and #1548. Every question carried a recommended choice. Who decided: Claude, as Sebastian, by a comment on the issue. What full auto should do: take the recommended answer, record it as the factory's, and let a human overrule in the revision. Why it did not: phase 4, the first shot (design 5.9, "the planner's recommended answers"), is not built. The planner already marks the recommendation, so the first shot is one rule at the plan's filing. Verdict: **not built**, phase 4.

## 2. A plan's confirmation waits for a human

Six plans, #1541 and #1545 to #1549. Who decided: Claude, as `controller`, through the console. What full auto should do: the design says a human confirms the spec and the criteria ([spec-driven.md](spec-driven.md): "the human confirms, never writes"), at every autonomy level. Sebastian's rule of today says the factory decides whenever it can. These two conflict. Candidate: at full auto, a plan whose questions are all answered confirms itself after a wait (one hour, say), and a human's Request changes within that hour wins. Verdict: **by design**, decision open: does the confirmation stay human at full auto?

## 3. A plan's hold-out candidates wait for an okay or a drop

Seven candidates on five plans. Each was sound, and all were okayed. Who decided: Claude, as `controller`. What full auto should do: okay the candidates by default, since a wrong one costs the builder one session with the test in hand ([spec-driven.md](spec-driven.md), the limits). Why it did not: the drop is the human's by design, and the confirmation refuses until every candidate is decided. Verdict: **by design**, the same decision as entry 2.

## 4. `grant_bought_nothing` on a planner's session

Seen on #1540, #1541, #1543, #1545, #1547 and #1548. A human's answer counts as a grant, the planner's next session files a revision and pushes nothing, and the flag fires. Who decided: the factory agent, on rung 2, within a minute each time. What full auto should do: not raise the flag. Why it did not: the rule in `carddigest_flags.go` tests the session for `pushed` and has no sibling for a filed revision. Verdict: **bug**, card #1555.

## 5. Agent time used up after two OOMKilled sessions (#1542)

Both sessions ran a bare `go test -race ./...` and the 4 GiB sandbox killed the worker. The face said "Use Extend on the board". Who decided: Claude closed the card and refiled it as #1554 with `bash check changed` named. What full auto should do: rung 1 reads the digest, sees two sessions killed on the same command, and restarts with the test command named. Why it did not: rung 1 is not built (phase 3), and the sandbox lets a bare `go test` exceed its memory. Verdict: **not built**, phase 3 (#1561), plus the sandbox card for the trap (see entry 11).

## 6. The check-in hit its own 10-minute cap (#1543)

The check-in, the step that judges a stop, ran out of time and the card went to a human with "Reply on this issue to start a new attempt". The stop's label was `spend_above_policy`, a money word on a time cap. Who decided: Claude, by a reply. What full auto should do: a check-in that fails is the factory's own failure and goes to rung 2, never to a human. Why it did not: phase 3 rebuilds the check-in as a forced tool call on the case, with the digest instead of the whole transcript, and the cap's misnaming is a wording bug in the stop template. Verdict: **not built**, phase 3 (#1559, #1561). The label is a small bug to fix with #1559.

## 7. Agent time used up, and rung 2 bought the wrong thing (#1543)

At 15:55:49 the factory agent extended the card by one session. The cap that tripped was agent time, so the card stopped again at once. The monitor flagged `answer_changed_nothing`, the agent raised the ceiling at 15:56:42, and at 15:57:43 it replanned the card, which turned a 20-line fix into a plan. Who decided: the factory agent, in three tries. What full auto should do: the first action fits the trip fact, agent time at a time cap, as the Grant button already does since phase 2a. Why it did not: rung 2 chooses from the whole action set and the trip fact does not bind the fitting one. Verdict: **bug** in rung 2's choice. Check after phase 3's forced call (#1559) whether the trip fact reaches rung 2's schema. If not, a card.

## 8. The review refused for money (#1544)

The review was refused with 0.03 EUR of headroom. The factory agent funded 2.00 EUR from the pool at 10:24, the review ran, the card merged. Verdict: **works**.

## 9. A card waited on a human for 27 days (#568)

A Stage 19 verification card from 2026-10-13 sat in Needs you until Claude closed it. What full auto should do: a daily sweep lists every card waiting on a human for longer than a bound. Why it did not: Sebastian ruled no clocks on a wait at the human (design decisions of 2026-11-02), and the stale-card poke of [routines.md](routines.md) is a candidate routine with no file entry. Verdict: **by design**, decision open: a daily list of long human waits in the inbox is not a clock and would have caught this.

## 10. Alert cards on the infra project (#235, #239, #240, #241, #250)

Five "Job failed" and "Premium served by another model" alerts on a project with no agents. Each job's CronJob completed on its next run. Who decided: Claude closed each with a note. What full auto should do: a "Job failed" alert whose CronJob completes after the failure closes its card with that fact. Why it did not: the alert rule labelled `event` keeps its card until a person closes it (ruled 2026-10-28, after a backup card closed itself on SigNoz's resolve). The job's later success is a different and deterministic signal from SigNoz's resolve. Verdict: **by design**, decision open: a closer on the CronJob's next completion for Job-failed alerts.

## 11. A bare `go test -race ./...` kills the sandbox

Three sessions today (#1542 sessions 1 and 2, #1543 session 2). `bash check changed` runs with `-p 2` and fits. Verdict: **bug**, card #1570 (the sandbox bounds every `go test` as `bash check` does).

## 12. The weekly bump's hand-over to the factory loses its work at the push (#1540, #1471)

The routine `weekly-bump` files a human card with the choice "Have the factory do it". Sebastian pressed it on #1540 at about 09:05. The agent did the bump in one session: 15 files, +96/-96, `bash check changed` green. The push was refused: `refusing to push: .forgejo/ differs from the base`. The bump edits the `BUILDKIT` pin in `.forgejo/workflows/ci.yml`, and the push rule (`cmd/agent-worker/main.go`, `WorkflowDirs`) lets no agent change a workflow file. Session 2 redid the work and was OOMKilled. Run 2 (#1471, 2026-11-02) was lost at the push too, to a tooling fault. What full auto should do: finish the bump. Why it did not: the push rule is right, and the pin sits in the one place an agent may not write. Verdict: **by design**, with a fix by hand: ci.yml reads the buildkit line from `upstream-images.txt`, which already carries it, so the bump never touches `.forgejo/`. Pull request #1582 makes that change (Sebastian's go, 2026-11-09). Until it merges, card #1574 bumps everything outside `.forgejo/` and names the ci.yml line for a human. Two cards follow from the loss itself: #1580 (plan), the worker pushes its branch at every check-in so a dead session loses no work, and #1581, a write under a workflow directory tells the session at once that the push will refuse it.

## 14. The press "Have the factory do it" on #1551 did nothing

Sebastian pressed it at 10:40:48. The press posted its comment on the issue (as `factory-chat`) and left no event on the card: the timeline holds `card_created` at 10:39:59 and nothing after, and the card stayed a human card. The card was 49 seconds old. factoryd's log of that minute is gone: roll #1552 replaced the pod at 10:57. Verdict: **bug**, cause unknown. To reproduce: press the choice on a routine's human card within a minute of its filing, and read the log.

## 15. The factory agent's `close` on a flag's case ended the card (#1540)

At 10:38:38 the factory agent answered case 54, a `grant_bought_nothing` flag, with `close` and the note "the flag's concern is settled … the replan's 4.36 EUR is now running session 0". `Act` closed the card: the issue closed, the replan's session was lost, and the routine filed #1551 eighty seconds later. A monitor-flag case offers `close` (`monitorActions` in actions.go), and `close` on any case ends the card. The agent read it as "close this case". Verdict: **bug**, card #1575.

## 16. A roll restarted factoryd under a running loop (#1552)

Roll #1552 of c8c4b521 (the merge of #1544) replaced the factoryd pod at 10:57. The restart is by design and keeps every workflow. It cost the log of the morning, which entry 14 needed. Verdict: **works**. A note for the operations residue: the log lives in the pod alone, so a roll ends the record of the hour before it.

## 13. "Needs a human" is posted before rung 2 had its turn

Every monitor flag posts "factoryd: task … needs a human. … The card goes on meanwhile. Answer case N in the project chat" on the issue, and a minute later the factory agent answers it on rung 2. The human reads a call for help that was already answered. What full auto should do: post the face only when rung 2 declined or the kind is the human's. Verdict: **not built**, phase 4 (rung 2 on every case before the human).

## 17. A roll's checks wait asks a human at 10 minutes while the test job runs (#1576)

At 16:43:39 the roll card #1576 stopped: "The gate supervisor stopped WaitChecks (attempt 1) past its bound of 10m0s: a roll task makes no model call: its gate trip goes to a human." Five of the pull request's six jobs were green and `pr / test` still ran, as it does for longer than 10 minutes on a change that reaches factoryd. Who decided: Claude, by a reply that restarts the same wait. What full auto should do: wait as long as CI's own bound. Verdict: **bug**, card #1578.

## 18. A session's pushes were rejected at its end, and the work was lost (#1556)

Session 2 of #1556 ran from 16:22 to 16:47, wrote `internal/policy/manual.go` (206 lines) with its tests, and its three pushes at the end were rejected with "rejected or expired credentials". The pod ended with the work in it. Who decided: Claude, by a reply that starts a new attempt with "push first". What full auto should do: a session's push credential outlives the session's agent-time cap, and the work survives the session (card #1580). Verdict: **bug**, cause to find in the worker's push path and the credential's life. The third push-path loss of the day after #1540 and #1471.

## 19. A roll failed on a test job that ran the whole suite for a k8s-only diff (#1576)

At 16:49 roll #1576 failed: `pr / test` killed after 15m56s, its log silent after the first package at 16:34. The roll's diff is k8s/*.yaml, and the package selection runs the whole suite for any non-Go change, cold, on the untrusted runner, beside the day's other pull requests. Main's own test run on the same code had passed. Who decided: nobody. The roll card is failed, the board offers it no Retry (a roll is no work card), and the merges of #1554 and #1555 wait for the next roll. What full auto should do: a roll's pull request tests what its diff reaches, and a roll whose job was killed without output runs once more before it fails, as a lost runner does. Verdict: **bug**, card for the selection filed (the k8s-only rule), the re-run of a killed job open.

## Decisions this register asks of Sebastian

1. Entry 2 and 3: does a plan's confirmation stay human at full auto, or does it confirm itself after a wait that a Request changes can interrupt?
2. Entry 9: a daily list of cards waiting on a human for longer than a bound, in the inbox.
3. Entry 10: a Job-failed alert card closes when its CronJob completes after the failure.
4. Entry 12: merge pull request #1582, then set the routine `weekly-bump` to `files: agent` in the infra project file, so the bump runs as an agent card whole.
