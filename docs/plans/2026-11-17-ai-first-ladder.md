# AI-first ladder: design and implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Each task names its behaviour, what it deletes, its tests, its live check and its workflow code. Line numbers are from the code repository's main at `d9b3a808f` (2026-11-18). Check each line before you edit it.

**Goal:** No case reaches a human before the factory's AI worked on it. The few exceptions are named in one table in code, each with its reason.

**Architecture:** Every case opens `open` and climbs the same ladder: rung 0 (rules in code), rung 1 (the check-in model), rung 2 (the project agent), and only then rung 3 (the human). One function is the only door to the human, and it refuses a case that no AI rung worked on. The face of a case (the issue comment, the Needs you entry, the poke) is written by that door and by nothing else.

**Tech stack:** Go (factoryd, console), PostgreSQL.

**Spec:** This plan. It applies goal 1 of `docs/card-flow-redesign-2026-11-02.md` ("No problem reaches a human before AI judged it with the full picture") and Sebastian's rule of 2026-11-09 in `docs/needs-you-register-2026-11-09.md` ("the factory agent looks at every stop first and decides whenever it can").

**Depends on:** nothing left open. The fixes of `factory-faults-2026-11-17.md` for faults 3, 4 and 5 and the plan `docs/plans/2026-11-17-work-loss-faults.md` are on main at `d9b3a808f`. Fault 4's fix makes the criteria gate judge main's head when a plan's cards are final (`planGateOf`, `verdict.go:941-974`), and Task 1 builds on that gate. The work-loss plan's heal pass reads every live case of a card (`healParkedAsk`, `temporal.go:389-428`), so a plan case that Task 4 opens as `open` gets no second case from it.

## Why this plan exists

On 2026-11-17 the plans #1938, #1990, #1806 and #1989 ended with criteria that no gate had judged. Each opened a `plan_criteria` case that went straight to the human. No AI rung saw it. 21 criteria were waived by hand, and 20 of them were test and invariant criteria that the factory can run itself.

The rule was specified and the build narrowed it. These are the facts.

- `docs/card-flow-redesign-2026-11-02.md` states the rule as goal 1 (line 43). Line 111 says "The ladder is one function in code that every trip calls." Line 122 says that even the kinds only a human decides get rung 2's analysis. Line 298 says every `awaitHuman` and `awaitApproval` call site opens its case through the ladder.
- `docs/plans/2026-11-03-ladder-actions-pool.md:21` narrowed it: `awaitPlan` and `awaitApproval` kept their own signals. Their cases stayed as the earlier phase wrote them: opened by the events writer, already at the human.
- Commit `2325ec1bb` (2026-11-11) kept rung 2 off `human_card`, `judgment_budget` and `merge_approval`. Commit `117896b3a` (2026-11-11) created `plan_criteria` and copied that exclusion. Neither commit states a reason.
- The rule "the human stays the decider of record" for criteria requests dates from 2026-10-31, before goal 1. Its money reason (a rerun spends money no human granted) no longer holds: the criteria gate runs from the sweep and the card's gate reserve pays for it.

The table shows which case kinds reach the human with no AI rung before, counted on cases opened from 2026-11-13 10:00 UTC to 2026-11-17 13:00 UTC. Every case of these kinds bypassed the AI.

| Kind | Cases | AI turn after the face | How it opens |
|---|---|---|---|
| `plan_criteria` | 3078 (15 distinct problems, the rest a reopen loop fixed in PR #2132) | none | `openRequestCase` |
| `merge_approval` | 70 | the project agent is woken beside the human | `openRequestCase` |
| `plan_confirmation` | 45 | woken beside the human | `askCase` |
| `human_card` | 44 | woken beside the human for factoryd's cards | `askCase` |
| `plan_question` | 29 | woken beside the human | `askCase` |
| `roll_held` | 11 | woken beside the human | `askCase` |
| `other` after a restart | 4 | none before the face | `healedTrip` |
| `red_main`, `config_refused` | 0 in the window | woken beside the human | `askCase` |
| `judgment_budget`, the factory's `month_cap` card | 1 | none, by design | `askCase` |

The kinds that open through `OpenTrip` (caps, gate stops, check-in stops, monitor flags, dependency stops) work as designed. In the same window none of them reached the human without an AI rung, except three cases marked "not judged, judgment budget spent".

## The rule

1. Every case opens with status `open` at rung 0.
2. A case reaches the human only through one function, the door. The door passes a case when a rung 1 or rung 2 step stands on it, or when its kind has a named exception.
3. A rung decides a case when the action table lets it. When only a human may decide, rung 2 still runs once and attaches its analysis and its recommended option. The human never reads a bare template.
4. The face of a case is written by the door: the issue comment, the Needs you entry and the poke. An opener writes none of them.
5. The record of a case names who decided it. A case that a human decided never reads "resolved by factoryd at rung 0".

## The exceptions

These kinds pass the door with no AI step. The list is closed. A new entry needs a reason in the table and a line in this section.

| Kind | Reason |
|---|---|
| `judgment_budget` | The budget that pays the rungs is spent. No rung can run. |
| The factory's `month_cap` card | The cap refuses the agent's own model calls. No rung can run. |
| A case whose face says "not judged, judgment budget spent" or "not judged, judgment budget unreadable" | The same reason, for any kind. The budget is unreadable when the card's repository names no project. |
| A case whose face says "not judged: the model provider refused" | The model provider refused the rungs' calls, so no rung could judge the case. Its refused rung steps are the record. |
| A human card that the project agent filed itself (the chat's `escalate` tool) | The agent already worked on the problem and chose to ask. Its filing is recorded as the rung 2 step. |

The provider's refusal joined the list by Sebastian's decision of 2026-11-18 (see Decisions).

These are not exceptions. They are human-only for the decision, and rung 2 still analyses them: money beyond the pool, a cap that only a commit raises, a policy class the merge gate marks human, access the factory lacks, a goal conflict, a plan confirmation that takes work off main, a plan answer below full auto, a merge on merge rule human, a merge of a migration or of the runner image.

## Decisions

Sebastian decided these on 2026-11-18. The tasks build them.

**What rung 2 may decide on a criteria case.** Rung 2 may grant one bounded card for the open criteria (`grant_criteria`). Waive, deny and confirm stay with the human, and rung 2 attaches its analysis and its recommended option. A waiver drops a requirement of the spec, which is direction, and a confirmation says "met" without the gate, which is the factory's judge. Commit `b8355fdb3` built rung 2's part: rung 2 is offered the grant and refused every verdict, waiver, confirmation and denial.

**The criteria gate runs once more per case.** Rung 0 runs the criteria gate again, once per case, when main's head moved since the gate's last run. Then rung 2 analyses the case and may grant one delta card. A criteria case opens only when the gate could not judge or found a criterion unmet. A newer main may meet that criterion, and one run per case bounds the cost.

**A run takes the answer of the case that asks its question again.** Task 2 may change workflow code: a waiting run takes the face and the answer of the case that asks its question again, once its own case has ended. The change has one `workflow.GetVersion` change id and is checked against the recorded histories. Without it the heal pass's case gets a rung's answer that no run hears, and the heal pass opens a new case, with a new rung 2 turn, every few minutes.

**On merge rule human, rung 2 decides no merge.** Rung 2 analyses the merge and hands it up with `approve_merge` or `deny_merge` as its recommendation. On merge rule auto it approves or denies, and a merge of a migration or of the runner image stays the human's at every level. On merge rule human a human approves every merge, and a denial by rung 2 would take that decision away.

**A plan's comment is a record, and its face comes at the hand-up.** The plan's comment stays at the opening, worded as a record ("Revision N of the plan"), because its id is the floor from which the plan run reads writers' comments. At the hand-up the face writes the Needs you entry, the poke and one short comment per revision that names the open questions with the project agent's recommendations.

**factoryd's human cards wait out of sight until their face.** A factoryd human card's row and question are written at once, in a new status that Needs you does not list, with no issue. At the hand-up the face files the issue, moves the card to `waiting-human` and pokes, and if rung 2 decides, the card ends with no issue. Rung 2 may close such a card only after factoryd has checked again that the card's condition is gone, so that a close never ends a card whose cause still stands.

**A provider's refusal is treated like a spent budget.** When the model provider refuses a rung's calls, the case climbs on at once, and if no rung judged it, it reaches the human marked "not judged: the model provider refused". No rung can judge it, and the human should not wait out the rung's bound of 35 minutes for a step that cannot answer.

## Global constraints

- Go tests run with `go test -race`. Tests that need Postgres run under `scripts/pg-test.sh` or with `FACTORYD_TEST_DATABASE_URL` set.
- `bash check changed` passes before each commit.
- No prompt rule where code, a tool's shape or a check can carry the rule. A refusal names the state and the fitting action.
- One way only. A task that moves a kind into the ladder deletes the old path of that kind in the same task: its direct `at_human` insert, the faces its opener wrote, its wake beside the human and its exclusion in `Climb`.
- No workflow code changes, except Task 2's change id `asked-again-case`. The workflows keep waiting on their signals (`plan_answered`, `approved`, `case_resolved`). A rung's answer takes the door a human's answer takes: `Runner.Act` for a case action, whose work sends the signal a human's press sends, and the chat's `answer` tool for a plan's questions, which reaches `AnswerPlan` and sends `plan_answered`. A task that finds it must change other workflow code stops and reports.
- Comments: only what the code cannot say. No change narration.
- A human is a human in every text the factory writes: never a member, an operator or a resource.

## How a case moves after this plan

1. An opener calls `openCase` (`internal/factoryd/cases.go:270-307`, the only `INSERT INTO cases`). After Task 6 it accepts only status `open`. It writes `owner_rung` 0.
2. The openers that run in the events writer's transaction or in the heal pass set `next_wake_at` to the time of opening: `askCase` (`cases_events.go:94-166`), `openRequestCase` (`:356-404`), `reopenMergeCase` (`:410-427`), and through them `openMissedMerges` (`cases_heal.go:154-169`) and `restorePlanAsk` (`temporal.go:435-469`). The three cases that reach the human at their opening get no wake (Task 6). The openers cannot run a model inside a transaction, and they do not need to: the wake hands the case to rung 0.
3. `OpenTrip` (`ladder.go:234-294`) and `healedTrip` (`:959-994`) set no wake. They run rung 0 and `Climb` in the same call, so the case-wake pass never runs a second rung 0 on a trip's case. A trip that dies between its insert and `Climb` leaves an open case with no wake, as today. The heal's moved-on rule (`cases_heal.go:52-68`) ends it, and the run's retried activity opens it again (`retriedTrip`, `ladder.go:1040-1055`).
4. The case-wake pass (Task 0) runs every 5 seconds. It ends the steps past their bound and climbs their cases (`ExpireSteps`, `ClimbExpired`), then wakes each due case through `OpenTrip`'s repeat path (`Monitor.wake`, `monitor.go:286-298`). `OpenTrip` finds the case it did not open still `open`, runs rung 0 on it (`rungZero`, `ladder.go:901-935`) and then `Climb` (`:322-399`).
5. `Climb` reads the kind table of Task 6 to learn what each rung does with the kind. Rung 1 works in the background. Rung 2 is the project agent's turn on the `case_climbed` row (`startRung2`, `:597-618`), the one wake the Waker gives a case.
6. When the rungs hand up, or no rung can judge and the case says why, `Face` (`:841-856`) runs. It asks the door, writes the face, and the door writes `at_human`.

The faces of a case are written in these places today. Each moves to the face of its case.

| Part of the face | Written today | After this plan |
|---|---|---|
| The issue comment | `AskHuman` (`ladder.go:1464-1469`) for a trip, `openPlanAsk` (`verdict.go:2332`) for a criteria request, and the issue `FileHumanCard` files (`intake.go:1242-1255`) for factoryd's human cards | the face. A plan's whole-plan comment (`postPlan`, `plan.go:3677-3694`) stays at the opening as the revision's record, and the face adds one short comment per revision. |
| The poke | the Poker on `approval_requested` for merge, criteria and plan requests (`pokes.go:302-308`, `:390-412`), and on `question_asked` for the planner's rows and factoryd's human cards (`pokes.go:253-273`) | the face's ask row |
| The Needs you entry | every pending request whose card holds no `at_human` case (`console/board.go:2592-2614`), and every human card in `waiting-human` (`console/board.go:161`) | a request is listed once its case is `at_human`, and a factoryd human card waits in `waiting-agent` until its face |
| The wake beside the human | the Waker on merge rows, the planner's rows and factoryd's human cards' rows (`wakes.go:262`) | gone. Rung 2's one turn is the `case_climbed` wake. |

## Tasks

The tasks run in this order. Each one lands on its own, leaves main working, and removes the old path of the kinds it moves. Task 0 is the shared foundation. Tasks 1 to 5 need it and nothing else. Task 6 needs Tasks 1 to 5, and Task 7 needs Task 6.

In every live check, `:rolled_at` is the time the task's roll reached factoryd. A case reached the human when it holds the face's step: a rung 3 step by `factoryd`.

### Task 0: an opened case climbs, and a case no rung can judge says why

**Behaviour**
- `openCase` (`cases.go:270-307`) writes `owner_rung` 0 on an open case and takes `next_wake_at` from the case it is given. The openers of Tasks 1 to 6 set it. `OpenTrip` and `healedTrip` leave it empty. `fakeStore.OpenCase` (`store_test.go:1736-1751`) mirrors both, in place of its fixed `OwnerRung 3` and nil wake.
- The case-wake pass: the tail of `Monitor.Sweep` (`monitor.go:128-156`: `ExpireSteps`, `ClimbExpired`, `DueCases` and the wake of each due case) becomes its own pass, run every 5 seconds beside the minute sweep (`cmd/factoryd/main.go:447`). The sweep keeps its card loop. The expiry still runs before the wakes, so a step and its case due at the same time find the case climbed.
- One predicate, `besideRun(c, t)`, beside `PlanWaitCase` (`ladder.go:1407-1411`), says that no run waits on the case's face: today a monitor flag and `PlanWaitCase`. Its face moves no card, writes no escalated step and sends no `case_faced`. `AskHuman` (`:1424`), `waitsAtHuman` (`:1080-1083`), `Climb`'s `signalFaced` (`:388-397`) and `pendFaced` (`cases_events.go:575-589`) read it. A face sends `case_faced` only where `runHears` (`act.go:696-698`) holds and `besideRun` does not.
- A second predicate, `outlivesCard(c, t)`, says that the case stays live after its card ended: today a monitor flag and `PlanWaitCase`. The wake pass's skip (`monitor.go:143-149`), `ClimbExpired`'s skip (`ladder.go:875-878`) and `AskHuman`'s `errNoWait` (`:1429-1439`) read it. Today `ClimbExpired` and the wake skip a `PlanWaitCase` on its done plan, so its expired rung 2 step never reaches a face.
- The not-judged path. `Climb` (`ladder.go:322-399`) faces a case with no rung 1 or rung 2 step only with a mark that says why, as `judgmentSpent` (`:425-457`) does today. The mark goes on the case's problem (`AppendCaseProblem`, `cases.go:420`), into a rung 0 step (`stepOnce`, `ladder.go:461-469`) and onto the face's ask (`AskHuman`, `:1506-1508`). The marks are "not judged, judgment budget spent", "not judged, judgment budget unreadable" and "not judged: the model provider refused". `startRung2` (`:597-618`) gives the unreadable mark for a repository that names no project, as `spentJudgment` (`:405-416`) does on the rung 1 path. Today `rungTwoTakes` (`:582-590`) returns false there and the case faces with no mark.
- The provider's refusal at rung 1. A refused conversation (`runRung`, `rungconv.go:78-79`) ends its step with the found "not judged: the model provider refused: <detail>" and climbs to rung 2 as today (`rung1Run`, `rung1.go:682-693`).
- The provider's refusal at rung 2. A wake turn whose call the gateway refuses for any reason but money and the context window, or that a 4xx answer refuses (`console/chat.go:1289-1320`), hands up at once each case its thread's wakes named (`wakeBooks`, `console/wake.go:99-152`). It does so through a new console hook beside `HandUpRung2` (`console/console.go:419-424`, wired at `cmd/factoryd/main.go:735`). The hook's factoryd side, beside `HandUpRung2` (`rung2.go:96-175`), ends the case's in-progress rung 2 step handed up with the same found and climbs from rung 2. A model that cannot be reached (`console/chat.go:1322`) keeps today's one retry and the step's bound.
- When every rung 1 and rung 2 step of a case ended with that found, `Climb` gives the face the mark "not judged: the model provider refused". When one rung judged, the face carries that rung's work and a note line, as `noJudgmentLine` (`ladder.go:419`) does for a spent budget.
- The judgment setting. `rungTwoTakes` no longer reads `Judges` (`ladder.go:590`, `policy/escalation.go:57-59`), and the Waker wakes on `case_climbed` whatever the setting (`wakes.go:244`, `:262`). `judgment: autonomous_and_above` keeps rung 1 off below autonomous (`rungOneJudges`, `ladder.go:627-632`). Rung 2 takes its cases at every level, and below autonomous its answer is a proposal the human confirms (`Proposes`, `act.go:482-493`). The setting's text (`policy/escalation.go:35-39`, and the schema generated from it) says so.

**Delete**
- The minute sweep's expiry and due-case wake (`monitor.go:128-156`): the 5-second pass is their one home.
- The site-by-site beside checks (`ladder.go:1080`, `:1424`, `:875`, `monitor.go:143`, `cases_events.go:580`): the two predicates replace them.
- The found "the rung's calls were refused" (`rungconv.go:79`).
- The `Judges` check in `rungTwoTakes` (`ladder.go:590`) and the Waker's `judges` gate on `case_climbed` (`wakes.go:262`).

**Tests**
- An open case opened with a wake at t0 reads `owner_rung` 0 and is due at t0. A case `OpenTrip` opened reads `owner_rung` 0 and no wake. Template: `TestSetCaseWakeAndDueCases` (`case_waits_pg_test.go:22`).
- The wake pass climbs a due open case once: `newMonitorRig` (`monitor_pg_test.go:126`, `pass` at `:185`), template `TestMonitorSweepWakesDueCasesAndExpiresSteps` (`:406`). An open case of kind `other` with rungs on and a wake at t0: after one pass it holds a rung 0 step "no resolver fits" and a rung 1 step in progress. A second pass adds no rung 0 step.
- A trip's own case is not woken: `newTripRig` (`ladder_pg_test.go:97`), `g.trip`, then one wake pass. The case's steps are the ones the trip wrote.
- A `PlanWaitCase` on its done plan whose rung 2 step expired reaches its face: `rungTwoRig` (`rung2_pg_test.go:19`) and a wake pass after the step's due. One comment is posted, and the case is `at_human`.
- Both rungs refused: `rungTwoRig` with the check-in's call scripted to fail, then the rung 2 refusal hand-up. The problem ends " (not judged: the model provider refused)", one face is posted and its ask ends with the same mark, and the rung 2 step's found begins "not judged: the model provider refused". The face comes in the same call, not after `RungAnswer`.
- Rung 1 refused, then rung 2 hands up through `HandUpRung2`: no mark, and the face's info carries "The factory agent found: ".
- The console: a wake turn that names case 7 and whose model call answers 400 calls the hook with case 7. One that answers 503 calls it with nothing. Template: `TestAWakesFailureStaysInItsThread` (`console/wake_test.go:77`).
- A repository that names no project: a `dependency_failed` trip, on which rung 1 is off, faces with " (not judged, judgment budget unreadable)" on its problem. Rig: `newTripRig` with the repository taken out of its policy.
- `judgment: autonomous_and_above` at assisted: `rungTwoRig(t, policy.JudgmentAutonomousAndAbove)` at assisted, a trip of kind `other`. No rung 1 step, one rung 2 step in progress, and one `case_climbed` row that the Waker wakes on (`drainPass`, `wakes_test.go:525`).

**Live check:** both queries read 0.

```sql
select count(*) from cases c
where c.opened_at > :rolled_at
  and (select z.rung from case_steps z where z.case_id = c.id order by z.id limit 1) = 0
  and exists (select 1 from case_steps f where f.case_id = c.id and f.rung = 3 and f.actor = 'factoryd')
  and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung in (1, 2))
  and c.kind <> 'judgment_budget'
  and c.problem not like '%(not judged%'
```

```sql
select count(*) from cases c join case_steps s on s.case_id = c.id and s.rung = 2
where c.opened_at > :rolled_at
  and s.found like 'not judged: the model provider refused%'
  and not exists (select 1 from case_steps f where f.case_id = c.id and f.rung = 3 and f.started_at <= s.ended_at + interval '2 minutes')
```

**Workflow code:** none.

### Task 1: a criteria case climbs the ladder

**Behaviour**
- `openRequestCase` (`cases_events.go:356-404`) opens a `plan_criteria` case `open`, with its wake and no rung 3 step. `openPlanAsk` (`verdict.go:2301-2336`) still opens the request and records `approval_requested`, whose row opens the case. Its comment (`:2332`) no longer goes out at the opening. The comment's words ride on the `approval_requested` row (`:2333-2335`), and `openRequestCase` keeps them as the case's `face` fact.
- Rung 0 gets a hold. `rungZero` (`ladder.go:901-935`) gets a third outcome beside a resolution and a hand-up: a row may hold the case at rung 0 until a time it names. `OpenTrip` then returns that time in `TripOutcome` (`ladder.go:76-81`) and climbs no further, and `Monitor.wake` (`monitor.go:286-298`) writes it as the case's wake instead of clearing the wake (`:297`).
- Rung 0 gets the row `rerun_criteria_gate` (`rung0`, `ladder.go:98-162`). It fires on a `plan_criteria` case when main's head differs from the commit of the plan's newest gate run (`gateRunsOf`, `verdict.go:1868`, the `commit` each run records at `:2038-2045`) and no rung 0 step of the case names a rerun yet. It records a gate run with the outcome `rerun` and the cards' mark, queues the gate (`queueGate`, `:1957-1963`), writes the rung 0 step "criteria gate run again at main <sha>", and holds the case until the gate's bound (`criteriaGateBound`, `:1858`) plus one criteria pass. While the gate runs or waits in the queue for the plan (`gateRunning`, `:1950-1954`), the row holds the case again.
- The rerun is a gate run beyond the gate's own bound. `due()` (`verdict.go:1925-1927`) counts only the runs after the newest `rerun` row. While such a row stands, the gate judges the open gate-judged criteria (`openCriteria`, `:1195`), not only the never-judged ones (`neverJudged`, `:1211`). `planCloseCheck` (`:1677-1835`) and `runCriteriaGate`'s check (`:1995-2030`) both read it.
- When the gate meets every open criterion, the close check resolves the requests by factoryd (`verdict.go:1780-1785`, `ResolveApprovals` at `store.go:3060-3093`), and the case ends resolved by factoryd at rung 0 with no rung 3 step. That path exists today.
- When the hold ends with the case still open, the row does not fire again, and the case climbs. Rung 1 stays off (`rungOneJudges`, `ladder.go:628`). `rungTwoTakes` no longer excludes `plan_criteria` (`ladder.go:586`).
- Rung 2 may take `grant_criteria`. The grant decides the request and resolves the case (`grantCriteria`, `console/actions.go:3201-3221`, then `GrantCriteria`, `verdict.go:681-722`). It writes one delta due per open criterion, and `DeltaPass` (`verdict.go:2367`) drafts the one delta card later. The grant draws nothing (`actions.go:726-728`).
- Rung 2's waive, deny and confirm stay refused (`actions.go:703-705`). The refusal becomes rung 2's own text, which names the state and the fitting actions: "settling a plan's criteria by word is the human's: take grant_criteria for one more bounded card, or hand_up with waive, deny or confirm as your recommendation". `ErrNotPerson` (`verdict.go:279-283`) stays the refusal of the store and the console to anyone but a person.
- `plan_criteria` joins `besideRun` and `outlivesCard` (Task 0). The wake pass does not skip the case on its done plan card, `ClimbExpired` climbs it, `Face` does not withdraw it, `waitsAtHuman` and the face move no card, and no `case_faced` goes to the ended run. This is the criteria case's own rule, not `PlanWaitCase`, whose callers read the state key as a dependency's task id (`act.go:317-325`, `casefacts.go:253-259`). A withdrawal could not stand anyway: the heal's `openMissedMerges` (`cases_heal.go:154-169`) opens a pending request's case again within a minute.
- The face. `Face` posts the comment's words from the `face` fact on the plan's issue, with rung 2's analysis and recommendation. Its ask row names the case and the request, and the Poker pokes it. The row settles as an approval row does: it stays open while its request pends, whatever the plan card's status (`SettleOf`, `settle.go:104-152`, the open rules at `:140-146`). Today the moved-on rule at `:148-151` settles a question row on a done card at once.
- Needs you lists the pending request (`console/board.go:2592-2614`) once its case is `at_human`, not while the case is open.
- The chat. Rung 2 grants through `answer` with the case id and `grant_criteria` (`console/chat_tools.go:1557-1595`). `answer_criteria` (`:1689-1732`) stays the human's tool for waive, confirm, met and not met, each with the typed line it demands (`humanAnswerLine`, `:960-978`). A human denies through `answer` with `deny_criteria`, which the actor's decider governs (`console/actions.go:1730-1737`).

**Delete**
- `openRequestCase`'s `at_human` and its rung 3 step for a criteria request (`cases_events.go:370`, `:402`).
- `plan_criteria` in `rungTwoTakes` (`ladder.go:586`).
- `openPlanAsk`'s comment at the opening (`verdict.go:2332`).
- The opening poke of a criteria request: the `ApprovalCriteria` and `ApprovalCriteriaRerun` branches of `approvalPoke` (`pokes.go:406-409`). The face's row is the poke.
- `answer_criteria`'s `grant` (`console/chat_tools.go:1689-1732`), so the chat has one grant door.

**Tests**
- The rerun row, on the fakeStore rigs of `verdict_test.go`: `mainGatePlan` (`:3094`), `gateOutcomes` (`:4139`), `gateMet` (`:2843`) and `sweep` (`:2849`). A plan whose gate ran `done` on main at commit `aaa` with three test criteria not met, and main now at `bbb`: the row fires once, the gate queue holds the plan, a `rerun` run row stands, and `due()` reads true. With main still at `aaa` the row does not fire. With the case's rerun step present it does not fire again.
- The rerun meets the criteria: the same plan, and the gate meets all three on `bbb`. The close check resolves the request by factoryd. In Postgres (`criteriaRig`, `pg/helpers_2e_test.go:200-219`) the case ends resolved by `factoryd` at rung 0, with two rung 0 steps and no rung 3 step.
- The gate cut twice and main unmoved: no rerun, and rung 2 runs once (`rungTwoRig`, `rung2_pg_test.go:19`, with `criteriaRig`). With `grant_criteria` taken, the case is resolved, not withdrawn, one delta due stands per open criterion, and no card is filed yet. Template: the "grant" subtest of `TestRung2SettlesNoCriteriaByWord` (`pg/act_board_pg_test.go:194-203`). With a hand-up through `HandUpRung2` (`rung2.go:96`), the case is `at_human`, its steps read rung 0, rung 2 and rung 3 in that order, the plan's issue holds one comment with "The factory agent found: ", and one poke row stands.
- Rung 2's `waive` is refused, and the refusal names `grant_criteria` and `hand_up`: `TestSettlingCriteriaByWordIsTheHumans` (`actions_test.go:1395-1435`) and `TestRung2SettlesNoCriteriaByWord` (`pg/act_board_pg_test.go:154-204`). Their pinned texts change.
- A `plan_criteria` case on a `done` plan card: the wake pass climbs it, `ClimbExpired` climbs it after its rung 2 step expired, and `Face` faces it without a withdrawal. Template: `TestNoFaceOnACardThatCannotWaitForAHuman` (`rung1_ladder_pg_test.go:1700-1760`) with `newMonitorRig` (`monitor_pg_test.go:126`). The heal opens no second case: `TestAConfirmedCriteriaRequestGetsNoCaseFromTheHeal` (`pg/round3_pg_test.go:40-58`).
- While the case is open, a Poker pass over the opening's rows writes no row (`pokes_test.go:17`), and the board lists no approval for the card. Console rig: `newRig` with `r.approvals.rows` and `r.openCases`, template `TestMergeApprovalYieldsTheCardInNeedsYou` (`console/approval_card_test.go:21`).
- Changed pins: `criteriaRig` and `TestAResolveWithNothingDecidedLeavesThePlansCriteriaCase` (`cases_events_pg_test.go:1006-1040`) assert `at_human` at the opening, and the criteria rows of `pokes_test.go` assert the opening poke.

**Live check:** both queries read 0.

```sql
select count(*) from cases c
where c.kind = 'plan_criteria' and c.opened_at > :rolled_at
  and exists (select 1 from case_steps f where f.case_id = c.id and f.rung = 3 and f.actor = 'factoryd')
  and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung = 2)
  and c.problem not like '%(not judged%'
```

```sql
select count(*) from cases c
where c.kind = 'plan_criteria' and c.opened_at > :rolled_at
  and (select s.rung from case_steps s where s.case_id = c.id order by s.id limit 1) <> 0
```

**Workflow code:** none. The plan card is final when its criteria request opens, and every piece runs in factoryd's passes, the events writer or the console. No workflow function reads a criteria request or a `plan_criteria` case.

### Task 2: a restart's case climbs

**Behaviour**
- `healedTrip` (`ladder.go:959-994`) calls `Climb` from rung 0 instead of `Face` (`:993`). `waitsOnRung` (`:990-992`) stays before it, because with rung 2 at work `Climb` would face a case that rung 2 still holds. The arm that reuses an open case with no face reads its facts as `ClimbExpired` does (`ladder.go:883-886`).
- No rung 0 resolver runs on a healed trip. A resolution there would reach `awaitHumanAgain` (`workflow.go:3955-3961`), which reads none, and the stop's own rung 0 ran when it was first asked. The case's rung 0 step is "asked again after a restart", or "asked again: " with the heal pass's reason (`askedAgainFound`, `ladder.go:944-949`).
- The repeat guard is `healedTrip`'s own (`:965-967`, `waitsAtHuman`): a case at the human before the restart stays there and gets no second face. `OpenTrip`'s guard (`:281-283`) never sees a healed trip, which branches off at `:239-241`.
- The face of a healed case carries the rungs' work. With an anchor, the case's `face` fact holds the stop's words (`tripCase`, `ladder.go:1130-1132`), so `Climb` faces the stop's five-part ask with the hand-up. With no anchor, the stop is the restart's or the heal pass's own sentence, and `AskHuman` puts the hand-up on that face too: the recommendation, the found line, the mark and the note (`ladder.go:1478-1520`). The human never reads a bare "the question above still stands".
- The heal pass's case names the case whose question it asks again. Its fact `asks_again` is the case of the card's newest anchor (`restartedStop`, `ladder.go:1022-1031`, which reads `AskAnchors`), else the card's newest ended ask case. `CaseSignal` (`workflow.go:116-122`) gets the field `Again`. `resolvedSignal` (`act.go:702-704`), `facedSignal` (`ladder.go:622-624`) and `pendFaced` (`cases_events.go:575-589`) set it from the fact.
- The waiting run takes that case as its own (Workflow code below). The heal pass's loop ends: a rung resolves the case, the run hears it, and the card moves on.

**Delete**
- `healedTrip`'s direct `Face` call (`ladder.go:993`).
- `AskHuman`'s skip of the hand-up on an asked-again face (`ladder.go:1478`).

**Tests**
- A restart with an anchor and rungs on (`newRungRig`, `rung1_ladder_pg_test.go:50`): face the stop with `FaceStop`, withdraw its case as `TestOpenTripRestartWithNoLiveCaseAsksItsStopAgain` does (`ladder_pg_test.go:804`), then `g.trip(t, HealedReason)` (`ladder_pg_test.go:140`). The new case's steps read rung 0 "asked again after a restart" and rung 1 in progress, and no comment is posted. After rung 1's scripted hand-up (`handUp`, `rung1_ladder_pg_test.go:79`), one comment is posted. Its ask is the stop's own, and its info carries "The check-in found: ".
- A restart with no anchor, on `rungTwoRig` (`rung2_pg_test.go:19`): after `HandUpRung2`, the face's info carries "The factory agent found: " and the recommendation.
- A case at the human before the restart: `FaceStop` with rungs on, then `g.trip(t, HealedReason)`. One comment stands, no rung 1 or rung 2 step exists, and the last step reads "asked again after a restart".
- The heal pass, in package `pg`: `healAskRig` (`pg/heal_ask_pg_test.go:63`) with the `pg` rung rigs (`newRungRig` at `pg/helpers_2e_test.go:80`, `rungTwoRig` at `pg/helpers_3d_test.go:222`). Card t1 is parked `waiting-human` past the `at_human` bound, with case 5 faced and withdrawn. One `HealPass` opens case X with `asks_again` 5 and a rung 2 step. Rung 2's answer through `Act` sends `case_resolved` with `Again` 5, which `fakeWorkflows` (`pg/helpers_2d_test.go:95-111`) records. `TestHealPassReasksACardWaitingWithNoAsk` (`pg/heal_ask_pg_test.go:144`) now expects the stop's own ask in the face, not `AsklessReason`.
- The workflow: a run waiting on case 5 takes `case_resolved` of case 9 with `Again` 5 as its answer and ends its wait. A signal of case 9 with `Again` 0 is queued as today. Template: `TestWorkflowKeepsAnotherCasesResolutionForItsOwnWait` (`workflow_cases_test.go:579`).
- A `case_faced` of case 9 with `Again` 5 and comment 300 makes 300 the escalation after which the run counts replies. Template: `TestWorkflowCountsTheReplyToAFacePostedAfterTheTrip` (`workflow_cases_test.go:1731`).
- The plan loop: `planResolution` takes case 9 with `Again` 5 while it waits on case 5. Template: `TestPlanLoopDropsALateResolutionOfItsTakenCase` (`plan_test.go:2579`).
- Replay: `TestWorkflowReplaysDevServerHistories` (`workflow_test.go:1832`) and `TestReplayFixtures` (`fixture_replay_test.go:1114`, over the 22 fixtures under `internal/factoryd/testdata/fixtures`) pass unchanged.

**Live check:** both queries read 0.

```sql
select count(*) from cases c
where c.opened_at > :rolled_at
  and exists (select 1 from case_steps z where z.case_id = c.id and z.rung = 0 and z.found like 'asked again%')
  and exists (select 1 from case_steps f where f.case_id = c.id and f.rung = 3 and f.actor = 'factoryd')
  and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung in (1, 2))
  and c.problem not like '%(not judged%'
```

```sql
select count(*) from cases c
where c.opened_at > :rolled_at and c.facts ? 'asks_again' and c.status = 'resolved'
  and exists (select 1 from cases d where d.task_id = c.task_id and d.id > c.id and d.facts ? 'asks_again'
    and d.opened_at < c.resolved_at + interval '30 minutes')
```

**Workflow code**
- Change id `asked-again-case`. Version constant `versionAskedAgainCase workflow.Version = 1`, in the version block of `workflow.go` (`:687-945`), with a comment that says what changes, where it is read and what a run from before does.
- Three functions change: `takeFaced` (`workflow.go:4058-4075`), the `case_resolved` arm of `awaitAnswer` (`:4146-4163`) and `planResolution` (`plan.go:2543-2559`). Each takes a signal whose `CaseID` is not the wait's case but whose `Again` is as the wait's own, and moves `t.caseID` to the signal's case. In `awaitAnswer` the new arm comes before the queue arm (`:4155-4163`).
- `workflow.GetVersion(t.ctx, "asked-again-case", workflow.DefaultVersion, versionAskedAgainCase)` is the last term of each condition, after `c != nil`, `t.caseID != 0`, `c.CaseID != t.caseID` and `c.Again == t.caseID`. No recorded history holds a signal with `Again` set, so a replay never reaches the call.
- Replay checks: `TestWorkflowReplaysDevServerHistories` and `TestReplayFixtures`, as in Tests.

### Task 3: a merge approval climbs

**Behaviour**
- `openRequestCase` (`cases_events.go:356-404`) opens `merge_approval` `open`, with its wake and no rung 3 step. Every opener of a merge case goes through it: the events writer on `approval_requested` (`:80-83`), `openMissedMerges` (`cases_heal.go:154-169`), `reopenMergeCase` (`cases_events.go:410-427`) when no ended case fits, and `ReopenApproval` (`store.go:3119-3139`).
- `reopenMergeCase` puts the ended case back `open`, at `owner_rung` 0 and with its wake (`:412-417`). An undone approval can leave rung 2's step in progress, because `Act` returns the work's error before it ends the step (`act.go:305-308`). That step now ends handed up with "approval undone: <reason>", so the case climbs at once and does not wait out `RungAnswer`. Rung 2 runs once per case (`startRung2`, `ladder.go:603-605`), so a reopened case it worked goes from rung 0 to the face with rung 2's earlier analysis (`HandedUpBy`, `:730-801`).
- On the wake's path, `OpenTrip` runs `atCaseOf` on the case `OpenCase` answers, not on the case it built (`ladder.go:255`, moved after `:267`). A woken merge then reads the human classes of its pinned policy version (`atCaseOf`, `casefacts.go:250-270`), not the current version's.
- `rungTwoTakes` no longer excludes `merge_approval` (`ladder.go:586`). Rung 1 stays off (`:628`).
- Rung 2 decides a merge only at full auto. `Action.refusal` (`actions.go:677-757`) refuses rung 2's `approve_merge` and `deny_merge` below full auto: "the merge rule is human at <state>: hand_up with approve_merge or deny_merge as the recommendation". At full auto `Proposes` (`act.go:482-493`) lets both run. `approve_merge` reaches the run as `approved` through `Act`'s work (`answerRequest` and `boardWork`, `console/board_actions.go:18-92`, then `approveMerge`, `console/actions.go:3130-3197`, then `ApproveMerge`, `gates.go:2965-2981`). A migration or the runner image stays refused at every level (`actions.go:709-718`).
- Rung 2 approves a head once. `atCaseOf` reads whether an earlier case of the same key (`pr:<n>@<head>`) ended with rung 2's `approve_merge`, and `Action.refusal` then refuses rung 2's `approve_merge`: "rung 2 approved head <h> of pull request #<n> on case <id> and its merge did not land: hand_up with what the merge said". This bounds `ReopenApproval`'s loop. A refused or failed merge (`note`, `gates.go:2450-2455`) opens a new case for the same head, and the workflow takes a fresh approval as a new start (`workflow.go:3062-3069`).
- The merge face keeps the card in review. `merge_approval` joins `besideRun` (Task 0): the face and `waitsAtHuman` move no card, the face writes no escalated step, and the run gets no `case_faced`. The frozen brief's wake (`brief.go:578-581`) no longer moves an `in-review` card through `waitsAtHuman` either.
- The face's ask row offers Approve, or Run again on red checks, as the opening poke did (`approvalPoke`, `pokes.go:396-403`), with rung 2's analysis. It settles as an approval row does and stays open while its request pends (`SettleOf`, `settle.go:104-152`). The inbox press then reaches `doApprove` or `doRerun` as today (`console/answer.go:224-236`).
- Needs you lists a pending merge request (`console/board.go:2592-2614`) once its case is `at_human`. Until then the card stays in In progress (`mergePended`, `:2586`).
- The Waker no longer wakes on a merge row. Rung 2's turn is the `case_climbed` wake, which starts within one 5-second wake pass (Task 0) and one 5-second Waker pass of the request.

**Delete**
- `openRequestCase`'s `at_human` and rung 3 step for a merge (`cases_events.go:370`, `:402`), and `reopenMergeCase`'s `at_human`, `owner_rung = 3` and rung 3 step (`:412-417`, `:425`).
- `merge_approval` in `rungTwoTakes` (`ladder.go:586`).
- `Proposes`'s autonomous branch (`act.go:488-491`): the refusal above comes first.
- The Waker's merge wake and what only it reads: `isMergeRow` (`wakes.go:604-606`) and its use at `:262`, `EventApprovalRequested` in `wakeKinds` (`:124`), `mergeLine` (`:611-622`), `askText`'s merge counting and closing sentence (`:513-514`, `:544-545`, `:574-579`) and `askKey`'s approval branch (`:635-638`).
- The merge branch of `approvalPoke` (`pokes.go:396-403`) as the opening poke. Its words move to the face's row.
- The store's `AttachAnalysis` path for a merge's `approval_requested` row (`chat.go:1192`, pinned by `TestAttachAnalysisReachesAMergeRow`, `attach_analysis_test.go:481`). Rung 2's analysis of a merge goes through its step (`HandUpRung2`).
- `inboxMerge` (`console/chat.go:1469-1486`) and its call at `:1513`. The action table's refusal covers the inbox.

**Tests**
- Full auto, in package `pg`: `mergeRig` (`pg/helpers_2e_test.go:156-170`) with `atAutonomy(policy.AutonomyFullAuto)` (`pg/helpers_3d_test.go:608-618`), `rungTwoRig` with `drainPass`, and the review and audit rows `TestApproveMergeAtRung2NeedsTheGates` seeds (`pg/act_board_pg_test.go:66`). The request opens the case `open`, the wake pass starts rung 2, rung 2 answers `approve_merge`, and `fakeWorkflows` (`pg/helpers_2d_test.go:95-111`) records "t1 approved factory-chat #<pr>". A Poker pass writes no row, and the case is resolved by `factory-chat` at rung 2.
- Merge rule human at autonomous: rung 2's `approve_merge` and `deny_merge` are refused with the hand-up's words. After `HandUpRung2` with `approve_merge` as the recommendation, the case is `at_human`, the card is still `in-review`, and one poke row offers Approve. `TestApproveMergeAtAutonomousRung2IsAProposal` (`pg/act_board_pg_test.go:92`) becomes this refusal.
- A migration merge at full auto: `TestRung2ApproveOfAMigrationMergeIsRefusedOnThePinnedPolicy` (`pg/act_board_pg_test.go:310-347`), with the case woken by the wake pass so that `atCaseOf` reads the pinned version. The approve is refused, the face carries "The factory agent found: ", one poke row stands, and the card stays `in-review`. Its `at_human` at the opening changes to `open`.
- An undone approval: `TestUndecideApprovalReopensTheMergeCaseItsDecisionResolved` (`cases_events_pg_test.go:572-617`) now reads the case `open`, at `owner_rung` 0, with its wake and no rung 3 step. When rung 2's own approve was undone, its step ends handed up "approval undone: ..." and the case reaches its face in one wake pass. `TestEveryWayOutOfPendingEndsTheMergeCase` (`:520-570`) changes the same way.
- Approve a head once: rung 2 approves head h, the merge is refused, and `ReopenApproval` (as at `cases_events_pg_test.go:553-559`) opens case 2 for the same key. Rung 2's `approve_merge` on case 2 is refused and names case 1, while a human's approve passes. Unit template: `TestApproveMergeOfAHumanClassIsTheHumansAlone` (`actions_test.go:1443`).
- No wake row for a merge request: `newWakeRig` (`wakes_test.go:67`), `wakeApproval` (`:313`) and `mergeRow` (`:323-330`). The batch only moves the cursor, as in `TestWakePlanAndCriteriaRowsOnlyMoveTheCursor` (`:440-468`). `TestWakeMergeRowWakesAtAutonomous` (`:332`), `TestWakeMergeRowWakesAtFullAuto` (`:367`), `TestWakeTwoMergeRowsOfOneCardWakeOnceEach` (`:471`), `TestWakeMergeAndAskBatchInOneTurn` (`:503`) and the merge batches of `TestWakeAskTextCountsAsks` (`:826-850`) go. `TestWakeApproveMergeRefusedOnMergeRuleHuman` (`console/wake_test.go:502`) now reads the action table's refusal.
- Needs you: a pending merge request whose case is open is not listed, and the card stays in In progress. Once the case is `at_human`, `TestMergeApprovalYieldsTheCardInNeedsYou` (`console/approval_card_test.go:21`) holds as today.

**Live check:** all three queries read 0. The second one measures review focus 5.

```sql
select count(*) from cases c
where c.kind = 'merge_approval' and c.opened_at > :rolled_at
  and exists (select 1 from case_steps f where f.case_id = c.id and f.rung = 3 and f.actor = 'factoryd')
  and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung = 2)
  and c.problem not like '%(not judged%'
```

```sql
select count(*) from cases c join case_steps s on s.case_id = c.id and s.rung = 2
where c.kind = 'merge_approval' and c.opened_at > :rolled_at
  and s.started_at > c.opened_at + interval '30 seconds'
```

```sql
select count(*) from cases c join tasks t on t.id = c.task_id
where c.kind = 'merge_approval' and c.opened_at > :rolled_at
  and c.status = 'at_human' and t.status = 'waiting-human'
```

**Workflow code:** none. `awaitApproval` (`workflow.go:3004-3161`) takes an `approved` from `factory-chat` for its pull request, and `Merge` takes that approver on merge rule auto (`gates.go:2557-2580`).

### Task 4: a planner's question and a plan confirmation climb

**Behaviour**
- `askCase` (`cases_events.go:94-166`) opens `plan_question` and `plan_confirmation` `open`, with their wake and no rung 3 step (`CaseFromAsk`, `:204-231`, the status at `:225`). The planner's rows come from `AskQuestions` (`plan.go:3431-3469`, the row at `:3466`), `AskConfirmation` (`:3505-3547`, the row at `:3528`) and the heal's `restorePlanAsk` (`temporal.go:435-469`, the row at `:462`). An identical re-file's confirmation row carries `settled` and is answered in the same call (`plan.go:3522-3546`), and its case resolves at rung 0 as today.
- Rung 1 stays off both kinds. They join `rungOneJudges`'s exclusion (`ladder.go:628`) until Task 6's table, because `PlanAnswerRefusal` (`planguard.go:21-37`) refuses every plan answer of rung 1.
- Rung 2's turn is the `case_climbed` wake. It answers through the chat's existing door: `answer` without a case id (`console/chat_tools.go:1557-1595`, `turn.answer` at `:717-752`) or `request_changes` (`:1645-1655`). Both reach `planAnswerGuard` (`console/actions.go:856-869`) and `AnswerPlan` (`plan.go:1471-1513`), which sends `plan_answered`. `Act`'s plan branch (`act.go:233-249`) stays: the action table holds no plan action.
- The guard stands. Rung 2 answers a question or a revise only at full auto. It confirms only at full auto, on a revision that takes nothing off main, and once a human decided every hold-out (`planguard.go:21-37`, `ErrHoldoutsOpen` at `plan.go:1490-1497`). Otherwise it analyses and hands up.
- The wake's text for a plan case names the plan answer, not "End case N with answer and its case_id" (`wakes.go:564`), which `doAnswerCase` refuses for a plan case (`console/actions.go:1239-1244`).
- `HandUpRung2` (`rung2.go:96-175`) takes one of the question's offers as the recommendation on a plan case. Today it takes only an action the human may take (`:134-145`), and no plan answer is one.
- The record names rung 2. `resolvePlanCase` (`cases_events.go:319-350`) takes the decider from `plan_questions.answered_by`, which `AnswerPlan` writes (`plan.go:1813`, `:1863`). An answer by `factory-chat` resolves the case at rung 2, and a human's at rung 3. Today it takes the event's actor, which a wake records as the venue's human (`console/actions.go:283`).
- Plan kinds join `besideRun` (Task 0). The plan run waits on `plan_answered`, not on a face (`awaitPlan`, `plan.go:2582-2624`), and `RequestPlan` moves the card itself (`:3416-3422`). So a face moves no card and sends no `case_faced`, and a face that comes before `RequestPlan`'s own move cannot make that move fail.
- The plan's comment stays at the opening (`postPlan`, `plan.go:3677-3694`, called from `RequestPlan` at `:3391`), because its id is the floor from which the run reads writers' comments (`:2097`, `:2121`, `:2338`, `:2477`). Its first line becomes a record, "Revision N of the plan" (`planComment`, `:1101-1102`), and no line of it asks for answers.
- The face of a plan case writes its ask row: the planner's row again, which the case's facts hold (`cases_events.go:211-212`), with the revision, the index, the kind, the choices and offers, the planner's recommendation, the case id, and rung 2's analysis and recommendation. The Poker pokes it. `SettleOf` settles it on the plan answer (`settle.go:125`, `answersPlan` at `:199-205`), and `movesOn` reads its revision (`:178-195`).
- Needs you lists the pending plan request (`console/board.go:2592-2614`) once a plan case of its revision is `at_human`.
- The last plan case of a revision to leave its rungs posts one short comment on the plan's issue: the revision's open questions, each with rung 2's recommendation, and the line that a reply asks the planner for a new revision. It replaces `AskHuman`'s comment per case (`ladder.go:1464-1469`) and `tripNext`'s plan line (`:1397-1398`) for these kinds.

**Delete**
- `CaseFromAsk`'s `at_human` and `askCase`'s rung 3 step at the opening for plan kinds (`cases_events.go:225`, `:134`, `:164`).
- The Waker's wake on the planner's rows (`wakes.go:262`). A row with a revision wakes nobody, as a `settled` one does (`:259-261`).
- The Poker's poke on the planner's rows at the opening (`pokes.go:253-273`) and the plan request's poke (the `ApprovalPlan` branch of `approvalPoke`, `pokes.go:404-405`).
- `planComment`'s line that the questions wait for the humans' answers (`plan.go:1101-1102`).
- The face's comment per plan case (`ladder.go:1464-1469` for these kinds).

**Tests**
- A plan question whose answer stands in the spec, at full auto. The rows come through `g.r.AskQuestions`, as in `TestHumanCardAndPlanQuestionAsksReachTheFace` (`ladder_pg_test.go:952-992`), and the plan request through `OpenApproval`, as in `planAwaitingConfirmation` (`pg/heal_ask_pg_test.go:298-329`). Then a wake pass (`newMonitorRig`, `monitor_pg_test.go:126`) and `rungTwoRig`'s Waker (`rung2_pg_test.go:19`, `drainPass`). The case opens `open` and gets a rung 2 step. `AnswerPlan` by `factory-chat` sends `plan_answered` (`caseSignals`, `act_pg_shared_test.go:18-29`). The case resolves by `factory-chat` at rung 2, and a Poker pass writes no row.
- The console half of the same answer: `planGuardRig` (`console/plan_questions_test.go:581-600`) at full auto with `trn.a.birth = factoryd.EventCaseClimbed`, template `TestAnAgentsPlanAnswerRecordsTheAgentAndItsWake` (`:746-767`). Its event's actor "sebastian" stays, and the case's resolution reads `factory-chat`.
- A confirmation of a revision that drops merged work: rung 2's confirm is refused (`planAskRig`, `planguard_test.go:90-114`, with `TestActAsksThePlanAnswerGuard`, `:122-166`, and `planGuardRig(t, true, "api")` with `refusedOffMain`, `console/plan_questions_test.go:602`). After `HandUpRung2` with the offer `confirm` as the recommendation, the case is `at_human`, its face row carries the revision, the index and "The factory agent found: ", the plan's issue holds one face comment for the revision, and one poke row stands.
- A confirmation at full auto that takes nothing off main, with every hold-out decided: rung 2 confirms (`planGuardRig(t, true)`, template `TestAnAgentsPlanAnswerRecordsTheAgentAndItsWake`). With one hold-out undecided, seeded as in `TestRungTwoStatementOffersTheConfirmationWhereTheGuardPasses` (`ladder_pg_test.go:1052-1056`), rung 2's confirm is refused with `ErrHoldoutsOpen`.
- One comment per revision: three questions of revision 2, handed up in turn, post one face comment, after the third hand-up.
- The Waker skips the planner's rows. Template: `TestWakerWakesOnFactoryAsksButNotTheMonthCap` (`wakes_test.go:715-749`).
- The heal: `TestHealPassRestoresAPlansConfirmation` (`pg/heal_ask_pg_test.go:335-367`) now reads the restored case `open` with its wake. `TestHealPassLeavesAPlanWaitingOnAQuestion` and `TestHealPassLeavesAPlanWaitingOnItsConfirmation` (`:253-259`) hold.
- The record: `TestAPlanAnswerResolvesItsQuestionsCase` (`cases_events_pg_test.go:620-645`) with `answered_by` `factory-chat` resolves the case at rung 2.

**Live check:** the query reads 0.

```sql
select count(*) from cases c
where c.kind in ('plan_question', 'plan_confirmation') and c.opened_at > :rolled_at
  and exists (select 1 from case_steps f where f.case_id = c.id and f.rung = 3 and f.actor = 'factoryd')
  and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung = 2)
  and c.problem not like '%(not judged%'
```

**Workflow code:** none. `AnswerPlan` and `AnswerPlanQuestions` send `plan_answered` from factoryd (`plan.go:1506`, `:1546`), and `awaitPlan` waits on it. `RequestPlan` is an activity, and `ref.Comment` stays as it is.

### Task 5: factoryd's own human cards climb

**Behaviour**
- Every factoryd human card goes through `CreateHumanCard` (`store.go:2363-2416`), called by `FileHumanCard` (`intake.go:1242-1255`), by `EscalateToHumanWith` (`chat_escalation.go:32-44`) through it, by `fileHumanTask` (`monthcap.go:343-354`) and directly. Its sources are the chain stall (`chainpoll.go:1495`), main still red (`mainfix.go:277`), the re-run card (`mainfix.go:420`), a refused configuration (`policy.go:867`), the production hold (`releasekeeper.go:233`), a failed roll (`rolltask.go:953`), a refused roll (`rolltask.go:1402`), an alert (`signozwebhook.go:935`), the chain repair card (`chainpoll.go:1682`), a routine's human card (`routine_run.go:104`), a factory pull request card (`intake.go:1380`), a human-labelled issue (`intake.go:1120`), a queued card moved to the human lane (`intake.go:1172`) and a plan's workflow card (`plan.go:3999`).
- Each such card is written at once, in the new status `waiting-agent`, with its ask row marked `held`. No issue is filed where `FileHumanCard` would file one. A card whose issue exists already (a human-labelled issue, a card moved to the human lane, a plan's workflow card) keeps it. The kinds stay as `CaseKindOf` and `HumanCardKind` give them (`cases_events.go:172-177`, `:233-279`): `red_main` for main still red, `roll_held` for the production hold, `config_refused` for a refused configuration, `human_card` for the rest. The re-run card is `human_card`, not `red_main`.
- The exceptions keep filing at once: the month cap card (`monthcap.go:331`), the judgment budget card (`chat_budget_card.go:97`) and the chat's `escalate` tool (`console/answer.go:357-390`). The freeze card (`freezecard.go:573`) writes no ask row and opens no case, so it keeps `waiting-human`.
- `askCase` opens the held row's case `open`, with its wake and no rung 3 step. Rung 1 stays off these kinds (`choiceKinds`, `ladder.go:564`). `rungTwoTakes` no longer excludes `human_card` (`ladder.go:586`). Rung 2 never excluded `red_main`, `roll_held` or `config_refused`, and no case of these kinds reached `Climb` before. The `boardKinds` entries for them (`ladder.go:568`) stay dead, because only `rungOneJudges` reads `boardLevel`, and Task 6's table replaces both lists.
- Rung 2 reads the held row. Its statement lists the row's choices (`RungTwoStatement`, `rung2.go:42-47`, `CaseAsk` at `rung1.go:161-173`), and `Act`'s `humanChoice` (`act.go:862-882`) checks rung 2's answer against the row's offers. The console routes rung 2's choice on a held card to its work (`routeAnswer`, `console/actions.go:1165-1176`, then `doHumanAnswer`, `:1545-1676`), with no issue needed. `deploy_now` runs in `Act` as today (`actions.go:388-393`, `act.go:956-976`).
- Rung 2 closes a factoryd human card only after factoryd checked its condition again. `humanChoice` lets rung 2's `close` through (`act.go:870-871`) only when the check of the card's source says the condition is gone. The check is the one the source's own code closes the card on: the chain stall and the chain repair card (the head's verdict, `settleChainCards`, `chainpoll.go:1512`), main still red and the re-run card (main's push run green, `endFixCard`, `mainfix.go:508-522`), a refused configuration (a valid version current, `ConfigAlarm.Resolve`, `policy.go:887`), the production hold (no hold stands, `closeAsk`, `releasekeeper.go:566`) and an alert (the alert cleared, `endCard`, `signozwebhook.go:599-610`). A source with no check keeps `close` refused at rung 2: "no code checks the condition of card <id>: hand_up with close as the recommendation".
- The face of a held card. `Face` files the issue with the card's title, its question, the caller's labels and rung 2's analysis (`fileOnIssue`, `intake.go:1306-1328`), and stores the issue's number on the card. It writes the ask row naming the case, unmarked, so the Poker pokes it, with the held row's decider line. It moves the card from `waiting-agent` to `waiting-human` (`waitOnHuman`, `ladder.go:1634-1649`, whose list of statuses it moves from gains `waiting-agent`). A card whose issue exists gets the face's comment, as `AskHuman` posts it today.
- If rung 2 decides, the card ends with no issue: `closeIssueAsFactory` (`escalation.go:230`) and the card's end make no forge call for a card with no issue.
- No `case_faced` goes to a human card, which runs no workflow (`runHears`, `act.go:696-698`, read by `Climb` and `pendFaced` since Task 0).
- The Waker and the Poker skip a `held` row, as they skip a `settled` one (`wakes.go:259-261`, `pokes.go:254-257`).
- The callers' work after filing that reads the issue waits for the face's issue, or skips while the card has none: `mainfix.go:290-291`, `policy.go:873`, `signozwebhook.go:346-350`, `:393-396`, `:942` and `releasekeeper.go:231`. Their reads that find a standing card (`ChainCard`, `StandingQuestion` at `rolltask.go:347-350`, `humanPauseCard` at `mainfix.go:228-230`) and their closers (`settleChainCards`, `endFixCard`, `ConfigAlarm.Resolve`, `closeAsk`, `RetryRoll` at `rolltask.go:976`, `endCard`) take a card in `waiting-agent` as one in `waiting-human`.
- The new status `waiting-agent` joins `manual.Statuses` with its meaning (`internal/manual/meaning.go:34`) and `openStatuses` (`schemasync.go:234`). The console's reads leave it out of Needs you: the Needs you column (`console/board.go:161`), the `NeedYou` count, `escalated` (`:2029`) and the inbox's answer guard (`console/answer.go:238`). The board shows the card in In progress (`console/board.go:163`), with its own label in the status filter (`:481`) and its own style (`:690`).
- The chat's `escalate` records its filing as rung 2's step. `askCase` appends, before the rung 3 step, a step of rung 2 by `factory-chat`, handed up, with the question's recommendation as its grounds and its why as its found. It keys on the ask row's via `chat`, which `EscalateToHumanWith` sets for `SourceChat` (`chat_escalation.go:33-34`).

**Delete**
- The issue filed before the face (`FileHumanCard`'s filing for the sources above).
- `human_card` in `rungTwoTakes` (`ladder.go:586`).
- `CaseFromAsk`'s `at_human` and `askCase`'s rung 3 step at the opening for held rows (`cases_events.go:225`, `:134`, `:164`).
- The Waker's wake on factoryd's human cards' rows (`wakes.go:262`). Today the agent's analysis then lands on the faced ask and poke rows through the store's `AttachAnalysis` (`chat.go:1192`), with no case step.

**Tests**
- The production hold at autonomous, in package `pg`: `newHeldRig` (`pg/act_deploy_pg_test.go:82`) over the `pg` `rungTwoRig` (`pg/helpers_3d_test.go:222`), set up from the keeper's pass instead of a filed card. The hold writes the card in `waiting-agent` with no issue, and its case opens `open` with its wake. Rung 2 takes `deploy_now`, the card ends, and `chainForgejo` (`pg/helpers_3d_test.go:254`) holds no new issue. At assisted the same answer is a proposal, and the face files one issue with deploy_now preselected (`TestRung2DeployNowRunsOrProposesByLevel`, `pg/act_deploy_pg_test.go:240`).
- Main still red: a `Roller` with `Store: g.s` and `rollForgejo` (`rolltask_test.go:363`) over `rungTwoRig` (`rung2_pg_test.go:19`), set up as `TestRollerStillRedAfterTheRemedyGoesToAHuman` does (`mainfix_test.go:273`), with a policy that names the roller's repository as a project. Rung 2's `close` is refused while main's push run is red. After `HandUpRung2`, one issue is filed on `rollForgejo.issues`, its question's info carries "The factory agent found: ", the card is `waiting-human`, and one poke row stands. With main's push run green, rung 2's `close` passes and no issue is ever filed.
- A chat-filed card: `caseEventStore` (`cases_events_pg_test.go:19`) with `fileStub` (`tracks_test.go:235`), calling `EscalateToHuman` with `Task{Source: SourceChat}` as `TestEscalateToHuman` does (`chat_escalation_test.go:30`). One case is `at_human`, and its steps read a rung 2 step by `factory-chat` handed up, then a rung 3 step. `rungTwoRig`'s Waker with `drainPass` records no wake.
- The console: a human card in `waiting-agent` is in no Needs you row and adds 0 to `NeedYou`. Console rig: `newRig`, template `TestMergeApprovalYieldsTheCardInNeedsYou` (`console/approval_card_test.go:21`).
- A `held` row pokes nobody and wakes nobody: the table of `pokes_test.go:17` and `TestWakerWakesOnFactoryAsksButNotTheMonthCap` (`wakes_test.go:715-749`).

**Live check:** both queries read 0.

```sql
select count(*) from cases c
where c.kind in ('human_card', 'red_main', 'roll_held', 'config_refused') and c.opened_at > :rolled_at
  and exists (select 1 from case_steps f where f.case_id = c.id and f.rung = 3 and f.actor = 'factoryd')
  and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung = 2)
  and c.problem not like '%(not judged%'
```

```sql
select count(*) from tasks
where kind = 'human' and status = 'waiting-human' and issue_number = 0
```

**Workflow code:** none. Every caller is poller or handler code, human cards run no workflow, and rung 2's answer goes through `Act` and the console.

### Task 6: one door, one table

Tasks 1 to 5 moved every kind. This task makes a bypass impossible to write.

**Behaviour**
- `openCase` refuses any status but `open` (`cases.go:271-274`): "OpenCase opens a case only as open: the door moves it to the human". `CaseFromAsk` opens every kind `open` (`cases_events.go:225`), and `askCase` gives every case it opens its wake, except the three that reach the human at their opening.
- The door. `ToHuman` replaces `SetCaseStatus` (`cases.go:366-375`). It is the one writer of `at_human`: one statement writes the status, `owner_rung` 3 and no wake, after `doorRefusal` passes. `doorRefusal` reads the case's steps, its kind's row in the table and its problem. It passes a case with a rung 1 or rung 2 step, a kind the table names an exception, or a problem with a not-judged mark. Its refusal names the case, the kind and the fitting action: "case <id> (<kind>) has no rung 1 or rung 2 step and no exception: the case climbs first".
- The door's callers. `Face` (`ladder.go:841-856`) asks `doorRefusal` before `AskHuman` posts anything, and calls `ToHuman` after the face, in place of `:849` and `:852`. `askCase` calls `ToHuman` in the events writer's transaction for the three cases that reach the human at their opening: the factory's month cap card, the judgment budget card and the chat's escalation, which carries its rung 2 step.
- `askCase`'s update for an ask that names its case (`cases_events.go:95-113`) keeps its rung 3 step and its pending `case_faced` and writes no status. `reopenMergeCase` reopens `open` since Task 3. No other code writes `at_human`.
- One table holds, for every case kind: its words (today's `caseKindWords`, `cases.go:59-93`), its rung 0 rows, whether rung 1 judges and why not, what rung 2 does (decides, analyses, or nothing with the reason), whether its question's choices answer it, and its exception's reason. It sits beside the kind constants (`cases.go:23-56`). It replaces `humanOnlyKinds` (`rung1.go:21-28`), `choiceKinds` (`ladder.go:564`), `boardKinds` (`:568`) and the kind checks in `rungTwoTakes` (`:586`) and `rungOneJudges` (`:628`). `humanOnly`'s rules on facts (`rung1.go:39-57`: a check-in's reason kind, a floor beyond the pool) stay rules on facts.
- The factory's month cap card gets its own kind, `factory_month_cap`. Today it opens a `month_cap` case (source `month_cap`, `cases_events.go:235`), the kind of an agent card's month cap stop too (`alerts.go:101`), which climbs. The table names `factory_month_cap` an exception, and `ChoiceCase` (`ladder.go:558-560`) reads the new kind.
- The kind `agent_request_info` goes, because nothing produces it: `cases.go:45`, `:82`, `actions.go:527`, `ladder.go:1397`, `runganswer.go:28` and their tests.
- `FaceStop` (`face_stop.go:9-30`) has no production caller, and it faces with no rung step, which the door refuses. It goes. Its 31 test calls in 11 files seed a rung 2 step and call `Face`, so they pass the door as production does.
- The record names the decider. When a person's verdicts or waivers settled a criteria request's criteria and factoryd then resolves the case (`decideRequestCase`, `cases_events.go:456-472`, reached from `verdict.go:1780-1785`), the resolution names that person at rung 3 (`caseRung`, `:561-569`). Factoryd at rung 0 stays the decider only when the gate's rows alone settled them.
- The Waker wakes a case only on `case_climbed`. After Tasks 1 to 5, a face's `question_asked` row comes after rung 2 or with no rung able to run, so a wake on it would be a turn beside the human. `EventQuestionAsked` leaves `wakeKinds` (`wakes.go:124`), and the branches that only it reads go: the source and `settled` skips (`:256-261`) and the skips Tasks 4 and 5 add beside them.

**Delete**
- `openCase`'s `at_human` (`cases.go:272`) and `SetCaseStatus` (`:366-375`).
- `askCase`'s status write for a named ask (`cases_events.go:97-98`).
- `humanOnlyKinds`, `choiceKinds`, `boardKinds` and the two kind checks in `Climb`'s predicates.
- `agent_request_info`, `FaceStop` and the Waker's `question_asked` wake.

**Tests**
- `openCase` with status `at_human` returns the refusal.
- The door refuses a case of kind `other` with only a rung 0 step, and its refusal names the case, the kind and "the case climbs first". It passes the same case after a rung 2 step. It passes a `judgment_budget` case with no step, and a case whose problem ends " (not judged: the model provider refused)".
- `Face` on a refused case posts no comment.
- The kind table: a test goes over every `Case*` constant (`cases.go:23-56`) and fails when a kind has no row, and when a row says "nothing" at rung 2 without a reason.
- A criteria request whose criteria a human waived, then resolved by the close check, ends with that human as the decider at rung 3. Rig: `criteriaRig` (`pg/helpers_2e_test.go:200-219`).
- The factory's month cap card opens a `factory_month_cap` case `at_human` through the door, and an agent card's month cap stop opens `month_cap` and climbs.

**Live check:** the query reads 0.

```sql
select count(*) from cases c
where c.opened_at > :rolled_at
  and exists (select 1 from case_steps f where f.case_id = c.id and f.rung = 3 and f.actor = 'factoryd')
  and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung in (1, 2))
  and c.kind not in ('judgment_budget', 'factory_month_cap')
  and c.problem not like '%(not judged%'
```

**Workflow code:** none.

### Task 7: the monitor watches the rule, and the guarantee is claimed

**Behaviour**
- The monitor gets one flag, `faced_unjudged` (`digestFlags`, `carddigest_flags.go:170-360`): a case of the card that is `at_human` with no rung 1 or rung 2 step, no exception in the kind table and no not-judged mark. After Task 6 it can only fire on a bug, and it makes that bug visible in a day, not in a review weeks later.
- After seven days of live record with a count of 0 on Task 6's query, change the guarantee in `docs/evidence.md` ("Every ask gets one model attempt, recorded, before a human sees it") from "not yet" to built, with the query and its result as the evidence. `README.md` and the landing page repeat the guarantee count, so change them together and run `node launch/site/evidence.js`.

**Delete:** nothing.

**Tests:** template `TestCardDigestFlagsTheOtherPatterns` (`carddigest_test.go:359`). The flag fires with the case's id on a seeded `at_human` case of kind `other` with only a rung 0 and a rung 3 step. It stays silent on a `judgment_budget` case, on a case whose problem carries " (not judged: the model provider refused)" and on a case with a rung 2 step.

**Live check:** Task 6's query, read daily for seven days, and `select count(*) from cases where kind = 'monitor_flag' and facts->>'flag' = 'faced_unjudged' and opened_at > :rolled_at`. Both read 0.

**Workflow code:** none.

## Review focus

1. No case kind gets two AI turns: a kind that climbs has no Waker wake on its opening row.
2. No face is written before `Face` runs: grep for issue comments and pokes written at the opening of a case.
3. A human-only decision stays human-only. The move into the ladder gives rung 2 the analysis, and the action table still refuses the decision.
4. A case on a final card (a done plan) is neither skipped by the sweep nor withdrawn by `Face`.
5. The time a human waits for a case they must decide grows by one rung 2 turn at most. Measure it on merges in Task 3.
6. With the judgment budget spent, every kind still reaches the human, marked "not judged, judgment budget spent".

## What this plan does not change

- The workflows and their signals, with one exception: Task 2's change `asked-again-case`, by which a waiting run takes the face and the answer of the case that asks its question again.
- What each rung may decide on the kinds that already climb. The one change there is Task 0's: the judgment setting no longer keeps rung 2 off below autonomous, where rung 2's answer is a proposal.
- The money rules: the pool, the caps and the card's draw.
- The human's console, apart from what the tasks name: a pending request and a factoryd human card stay out of Needs you until their face. A face looks as it does today, with rung 2's analysis on kinds that had none.
