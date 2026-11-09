# Needs you on full auto: what stopped, who decided, and why the factory did not

Started 2026-11-09. The rule (Sebastian, 2026-11-09): on full auto the factory agent looks at every stop first and decides whenever it can. A human decides only what the factory cannot. This register records every stop that reached Needs you, who decided it in the end, what full auto should have done, and why it did not. It is the list of what to fix. Each entry carries one of four verdicts:

- **not built**: the step that should decide exists in the design and not in the code. The entry names the phase or card that builds it.
- **bug**: the step exists and acts wrong. The entry names the card.
- **by design**: the design sends this stop to a human. The entry says whether that still fits the rule, and names the decision if not.
- **works**: the factory decided on its own. Kept so the record shows what already holds.

The entries come from the board loop of 2026-11-09 (notes in `session-notes-2026-11-09-board-loop.md`, untracked). The code is main `e3c62276`. Phases refer to [card-flow-redesign-2026-11-02.md](card-flow-redesign-2026-11-02.md) section 9. Phase 3 is plan #1541's round 1 (cards #1559, #1561, #1563, #1566). Phases 4 and 5 are its rounds 2 and 3.

## 1. A plan's questions wait for a human

Nine questions on the revision 1 of plans #1541, #1545, #1547 and #1548. Every question carried a recommended choice. Who decided: Claude, as Sebastian, by a comment on the issue, each within three minutes of the revision. Corrected at 19:24: on plan #1580 the factory agent answered both questions itself on rung 2 ("sebastian answered 2 questions of plan t-6f35f0f70857 via chat"), three minutes after the revision posted, and asked the planner for the revision that carries them. So rung 2 does answer a plan's questions, and the nine earlier answers were Claude's only because Claude was faster. The lag cost one thing: Claude had answered #1580's questions two minutes before, and the two answers differ on question 2 (Claude: also push every 10 minutes; rung 2: check-ins only, as the issue words it). The planner reads both. Rule from here: leave a plan's questions to rung 2 for five minutes. What phase 4's first shot still adds (design 5.9): the recommended answer taken at the plan's filing, with no model call and no lag. Verdict: **works** on rung 2 with a three-minute lag; phase 4 makes it instant.

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

## 20. The factory's own deploy holds while a plan is open on main (the group hold)

Since 16:55 the roller writes "plan #1546 is open on main: no roll until no plan is open on main" and "the factory's Kustomization is suspended". The show_doc plan merged its first card (#1562) and its two others are not in, so item 336's group hold keeps production at c8c4b521 until the plan is whole or a human presses Deploy now after the 6-hour ask (due about 22:55). Meanwhile the merges of #1554, #1555 and #1562 wait, and the false flag of #1555 keeps firing on the live code. Who decided: nobody yet. Verdict: **by design**, first live run of the hold. The decision it raises: with seven plans in flight on the factory's own project, a plan is nearly always open on main, so the factory's own deploy lags main by hours. Candidates: a shorter ask for the factory's own project, or the hold only for a plan whose merged part changes what a human sees.

## 21. The bump's pull request cannot pass its own image build (#1574, PR #1598)

At 19:05 the card's check-in stopped with "access the factory lacks": the bump is pushed (PR #1598), and `pr / image-build` fails at `load metadata` for the store's copy of the new golang base, because the store gets a new upstream-images.txt line from main's upstream job after the merge. The routine's brief describes a pull-request build from the upstreams that does not exist, and the untrusted pull-request job holds no registry write credential by design. The test job is red too (`TestUpstreamImagesPinEachImageByDigest` on Dockerfile.sandbox, `TestFactoryStackIsTheFactoryImage`), which the card's next session fixes. Who decided: the factory agent resumed the card at 19:07 for session 4. What full auto should do: the store holds a pull request's new lines before its build runs. Verdict: **by design** gap, card #1603 (factoryd copies the pull request's new lines into the store, trusted side). Until it lands, a bump pull request reaches the human with its tests green and its image build red, and the human merges it on that evidence or waits for #1603.

## 22. The gates refused for money four times in one day (#1544, #1568 twice, #1574)

Entry 8's shape, four times today: 10:22 (#1544, 0.03 EUR free), 17:42 and 18:18 (#1568, 0.07 EUR free each time; between the two the factory agent denied merge request 1066 because no review had run), 19:32 (#1574, 0.02 EUR free of 5.00). Each time the factory agent funded 1.00 to 2.00 EUR from the pool within two minutes and the gates ran. Who decided: the factory agent, every time. What full auto should do: never reach the stop. The card's budget pays the sessions and the gates from one pot (design section 8), and the sessions are the only spender that can empty it; a session that spends to the last cents leaves the review and the audit nothing, and a complete diff then waits for a fund, a review round and a second merge request. By construction: the sessions' ceiling is the budget less a reserve for one review call and one audit call. Verdict: **works** on rung 2, **bug** in the budget's shape, card #1605.

## 23. A share stop's reply granted one share, and the next session stopped at its start (#1572)

At 19:09 #1572's check-in stopped on "the check-in's share of the budget is spent", with 0.45 EUR of check-in spend against a 0.20 EUR share. Claude replied at 19:14 to start the attempt. The reply grants one more share (0.40 in all), still under the 0.45 spent, so session 4 met the same check at its start (`checkinBlock`, before any model call) and ended within a minute with zero model calls; the stop came back at 19:29 with `grant_bought_nothing` and `money_ask_hides_findings` beside it. Who decided: the factory agent at 19:32, with an extend of one more share (case 159), so session 5 runs on 0.15 EUR of check-in headroom. What full auto should do: a grant that cannot cover the spend is no grant; the face offers "one more share (€0.20)" against a spend it cannot reach. Why it did not: the grant is one base share by construction (`TaskUsage.ExtraCheckinShare`). Verdict: **bug**. Phase 3's #1563 removes the share stop, so no new card. Until it lands: when the spent figure is more than one share over, reply and extend one share.

## 24. A review's answer did not parse, and the review counted as not run (#1565, PR #1600)

Twice on the same card: at 18:58 the review's answer was empty (`model review answer invalid (EOF)`), at 19:38 it was cut inside its summary at the output bound (`unexpected EOF`, the JSON began `{"verdict": "approve", "summary": ...`). `parseReview` makes an answer that does not parse a note, never a failure, so the review counts as not run, `review_refused_not_run` flags it, and the case reaches the factory agent with nothing to do but note. Who decided: the factory agent, with a note at 19:39, and the card waits for its next head for a review. What full auto should do: the step corrects itself: one more call with the parse error and the bounds in the input, the note only after a second failure. Verdict: **bug**, card #1606.

## 25. A schema migration's merge waits for a human's approval (#1585, PR #1604)

The receipt card's pull request adds the table `merge_receipts`, so the policy gate reads risk class **migration**, requires_approval: "A human approves the merge." The model review approved at 19:30 (the migration as described, first write stands) and CI was green at 19:40. The rail is deliberate: a human reads the SQL before it runs on the factory's own database. Who decided: the factory agent, on rung 2, at 19:45, two minutes after the approval request opened ("sebastian approved PR #1604 ... via chat"), and factory-merge merged it at once. So the policy's "a human approves" is met by rung 2 acting as Sebastian, and the factory approved its own schema migration with no human reading the SQL. Verdict: **works** on rung 2, **by design** at the policy. Decision 7 asks whether that is wanted.

## 26. The bump's merge call reached a human with red checks and no session left (#1574, PR #1598)

At 19:43 the card's merge approval opened on the board (approval 1082, risk class high): "agent and model review both say merge, but the image-build check failed in all four rounds, so the PR cannot merge as it stands. The card is out of sessions, its granted third session bought nothing, and the audit holds 6 findings for a human." The face offered Return and Close, no Approve: Forgejo refuses a merge with red checks. The factory agent wrote that call for a human and stopped there. Two faults under it. The image build fails because the store lacks the pull request's new base images until main's upstream job runs after the merge (entry 21, card #1603). The test job (run 2494, 19:51) fails on four pin mistakes of the card's own: a 63-digit digest on the kube-scheduler v1.37.2 line, Dockerfile's Debian snapshot left at 20261015T000000Z while the two other Dockerfiles moved to 20261108T000000Z, and node v24.21.0 left in internal/factoryd/sandbox.go:42 and toolpark.go:60 while upstream-files.txt moved to v24.22.2. The agent's own caveat on the pull request says the full `bash check changed` did not fit the remaining budget. Who decided: Claude as controller, 19:56, on Sebastian's "take care of it": returned the pull request with the four fixes named to the line, granted one session and 2.00 EUR, and copied the four base images and the seven files of the pull request's lists into the store by hand with crane and the upstream scripts, the stand-in for #1603, so the image build can pass on the next push. What full auto should do: #1603 for the store, and #1605 for the budget that let the sessions run the card down to 0.02 EUR before its gates and its tests ran. Verdict: **by design** at the merge call (red checks are a human's), **bug** in the two causes, cards #1603 and #1605.

## 27. A session stopped on a goal conflict between the card's text and five review rounds (#1572)

At 19:54 session 5 stopped with "goal conflict and no agent budget left: round 5 orders the guard at workflow_stages.go:776 reverted to the verified base 7b6e409f while the card mandate says a missing row means fix the workflow, and with sessions at 4 of 4 and the agent push of 971883fd refused on expired credentials only the owner can pick the direction". The card's text (plan #1543's revision) carries a clause with a false premise, and five sessions chose the clause over five unanimous reviews, the check-in gate and the criteria gate. Who decided: the factory agent at 19:56, by a comment ("the owner picks the direction: round 5 wins, revert the guard ... this is the last answer this card gets") and a resume, session 6 started at 19:56. What full auto should do: what rung 2 did, one round earlier: a reviewer's finding repeated three times against a card clause is the card clause's defeat, not a conflict for the owner. Verdict: **works** on rung 2 at the sixth round, and the cost of the five rounds (five sessions, 4.5 hours, four human stops) says the repeat guard of design 5.6 (a finding re-raised thrice ends the attempt) is not in the check-in's hands yet: phase 3, card #1561.

## Decisions this register asks of Sebastian

1. Entry 2 and 3: does a plan's confirmation stay human at full auto, or does it confirm itself after a wait that a Request changes can interrupt?
2. Entry 9: a daily list of cards waiting on a human for longer than a bound, in the inbox.
3. Entry 10: a Job-failed alert card closes when its CronJob completes after the failure.
4. Entry 12: merge pull request #1582, then set the routine `weekly-bump` to `files: agent` in the infra project file, so the bump runs as an agent card whole.
5. Entry 20: how long the factory's own deploy may hold on an open plan when many plans run at once.
6. Entry 21: merge the bump's pull request #1598 with its image build red once its tests are green, or wait for #1603.
7. Entry 25: rung 2 approved a schema migration on the factory's own project (PR #1604) from the SQL, the review and the policy gate's facts, two minutes after the request. Does a migration stay with rung 2, or does the risk class `migration` need a human's read that rung 2 cannot give?
