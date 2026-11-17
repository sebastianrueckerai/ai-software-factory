# AI-first ladder: design and implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Each task names its behaviour, its files, its tests and its live check. Line numbers are from the code repository's main at `cf5b5bdce` (2026-11-17). Check each line before you edit it.

**Goal:** No case reaches a human before the factory's AI worked on it. The few exceptions are named in one table in code, each with its reason.

**Architecture:** Every case opens `open` and climbs the same ladder: rung 0 (rules in code), rung 1 (the check-in model), rung 2 (the project agent), and only then rung 3 (the human). One function is the only door to the human, and it refuses a case that no AI rung worked on. The face of a case (the issue comment, the Needs you entry, the poke) is written by that door and by nothing else.

**Tech stack:** Go (factoryd, console), PostgreSQL.

**Spec:** This plan. It applies goal 1 of `docs/card-flow-redesign-2026-11-02.md` ("No problem reaches a human before AI judged it with the full picture") and Sebastian's rule of 2026-11-09 in `docs/needs-you-register-2026-11-09.md` ("the factory agent looks at every stop first and decides whenever it can").

**Depends on:** the fixes of `factory-faults-2026-11-17.md` for faults 3, 4 and 5. Fault 4 makes the criteria gate judge main's head when a plan's cards are final. Task 1 of this plan builds on that gate.

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
| A case whose face says "not judged, judgment budget spent" | The same reason, for any kind. |
| A human card that the project agent filed itself (the chat's `escalate` tool) | The agent already worked on the problem and chose to ask. Its filing is recorded as the rung 2 step. |

These are not exceptions. They are human-only for the decision, and rung 2 still analyses them: money beyond the pool, a cap that only a commit raises, a policy class the merge gate marks human, access the factory lacks, a goal conflict, a plan confirmation that takes work off main, a merge of a migration or of the runner image.

## Decision for Sebastian

Ask before Task 1 is built.

**What may the project agent decide on a criteria case?** After fault 4's fix the criteria gate judges a finished plan on main by itself. A criteria case then opens only when the gate could not judge (two cut runs, no room) or when a criterion is unmet. The action table already lets rung 2 take `answer_criteria`, `grant_criteria`, `confirm_criteria` and `deny_criteria`. No rung ever got the case, so this was never in use.

- **Recommended:** rung 0 runs the criteria gate again when a run is possible. Rung 2 may grant one bounded card for the open criteria (`grant_criteria`), inside the pool. Waive, deny and confirm stay with the human, and rung 2 attaches its analysis and its recommended option. A waiver drops a requirement of the spec, and that is direction. A confirm says "met" without the gate, and the gate is the factory's judge.
- **Wider:** rung 2 may also waive with a reason and confirm with evidence. The human sees a criteria case only when rung 2 hands it up. A wrong waiver then closes a plan with an unmet requirement and no human saw it.

## Global constraints

- Go tests run with `go test -race`. Tests that need Postgres run under `scripts/pg-test.sh` or with `FACTORYD_TEST_DATABASE_URL` set.
- `bash check changed` passes before each commit.
- No prompt rule where code, a tool's shape or a check can carry the rule. A refusal names the state and the fitting action.
- One way only. A task that moves a kind into the ladder deletes the old path of that kind in the same task: its direct `at_human` insert, its wake beside the human, its exclusion in `Climb`.
- No workflow code changes. The workflows keep waiting on their signals (`plan_answered`, `approved`). A rung's answer goes through `Runner.Act`, as a human's press does, and `Act` sends the same signal. If a task finds that it must change workflow code, it adds a `workflow.GetVersion` change id and checks replay with the fixtures under `internal/factoryd/testdata/fixtures`.
- Comments: only what the code cannot say. No change narration.
- A human is a human in every text the factory writes: never a member, an operator or a resource.

## How a case moves after this plan

1. An opener calls `openCase` (`internal/factoryd/cases.go:270-307`, the only `INSERT INTO cases`). `openCase` accepts only status `open`. It sets `owner_rung` 0 and `next_wake_at` to now.
2. The monitor's sweep picks up the due case (`DueCases`, `cases.go:513-515`; `monitor.go:138-156`) and runs `OpenTrip` on it (`monitor.go:283-298`). `OpenTrip` runs rung 0 and then `Climb` (`ladder.go:234-294`, `:310-399`). This mechanism exists today and carries every trip kind.
3. `Climb` reads one table, the kind table of Task 6, to learn what each rung does with the kind.
4. When the rungs hand up, `Face` runs. It is the only writer of `at_human`, and it writes the face.

An opener that runs inside the events writer's transaction (`askCase`, `openRequestCase`) cannot run a model there. It does not need to: it opens the case and the sweep does the rest.

## Tasks

The tasks run in this order. Each one lands on its own, leaves main working, and removes the old path of the kinds it moves.

### Task 1: a criteria case climbs the ladder

**Behaviour**
- `openRequestCase` (`cases_events.go:355-403`) opens a `plan_criteria` case as `open`, with no rung 3 step and no poke.
- Rung 0 gets a row for `plan_criteria`: when `gateDue` holds for the plan (fault 4's form, which takes main's head), queue the criteria gate and wait for its result. The case resolves when every criterion has a row. Rung 0 fires this row once per case.
- `Climb` no longer excludes `plan_criteria` at rung 2 (`ladder.go:586`). Rung 1 stays off it: the case is board-level, as the dependency stops are.
- Rung 2 takes the actions that the decision above allows. The refusal of the others names the state and the action that fits.
- The case sits on a final plan card. Two checks drop such a case today: the sweep skips a due case whose card is not open (`monitor.go:143-148`), and `Face` withdraws a case on a card that cannot wait (`ladder.go:841-845`). `plan_criteria` joins the kinds that sit beside a card (`ladder.go:1375-1379`), so both checks keep it.
- The chat tool `answer_criteria` (`console/chat_tools.go:1671-1714`) keeps its demand for a line the human typed for waive, deny and confirm, if the decision keeps those with the human.
- The poke text for a criteria case (`pokes.go:396-397`) goes out from the face, with rung 2's recommended option.

**Tests**
- A plan with three unjudged test criteria and a possible gate run: the case opens `open`, rung 0 queues the gate, the gate meets all three, the case resolves by factoryd and no rung 3 step exists.
- The same plan with the gate cut twice: rung 2 runs once. With `grant_criteria` taken, a delta card is filed and the case is withdrawn. With a hand-up, the face carries rung 2's analysis and the case is `at_human` with a rung 2 step before the rung 3 step.
- Rung 2 answering `waive` is refused when the decision keeps waive with the human, and the refusal names `grant_criteria` and `hand_up`.
- A `plan_criteria` case on a `done` plan card is not skipped by the sweep and not withdrawn by `Face`.

**Live check:** on the next finished plan, `select rung, actor, decision from case_steps where case_id = <id> order by id` shows a rung 0 step first. `select count(*) from cases where kind = 'plan_criteria' and status = 'at_human'` counts only cases with a rung 2 step.

### Task 2: a restart's case climbs

**Behaviour:** `healedTrip` (`ladder.go:942-977`) opens the case and calls `Climb`, not `Face`. The repeat guard of `OpenTrip` (`ladder.go:281-283`) already keeps a live case that waits at the human where it is.

**Tests:** a trip asked again after a restart gets a rung 1 or rung 2 step before any face. A case that was `at_human` before the restart stays there and gets no second face.

**Live check:** after the next factoryd restart, no case of kind `other` with the step "asked again after a restart" is `at_human` without a rung 2 step.

### Task 3: a merge approval climbs

**Behaviour**
- `openRequestCase` opens `merge_approval` as `open`. `openMissedMerges` (`cases_heal.go:154-169`) and `reopenMergeCase` (`cases_events.go:409-426`) do the same: a reopened case climbs again.
- `Climb` no longer excludes `merge_approval` at rung 2. Rung 2 takes `approve_merge` and `deny_merge` (`actions.go:273-296`). A merge of a human class (a migration, the runner image) stays refused to rung 2 (`actions.go:616-618`), and rung 2 attaches its analysis.
- The Waker stops waking on merge rows (`isMergeRow`, `wakes.go:602-606`). The ladder gives the agent its one turn.
- The human's poke for a merge goes out from the face.

**Tests**
- A merge request inside the merge rule: rung 2 approves, the workflow gets `approved`, and no poke went out.
- A migration merge: rung 2's `approve_merge` is refused, the case reaches the human with rung 2's analysis, and one poke goes out.
- An approval that is undone reopens the case as `open` and it climbs again.
- No wake row is written for a merge request.

**Live check:** `select count(*) from cases c where kind = 'merge_approval' and status = 'at_human' and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung = 2)` reads 0 for cases opened after the roll. The time from the request to rung 2's answer stays under 2 minutes. If it does not, the opener must wake the sweep at once.

### Task 4: a planner's question and a plan confirmation climb

**Behaviour**
- `askCase` (`cases_events.go:94-165`) opens `plan_question` and `plan_confirmation` as `open`. The planner's rows are written at `plan.go:3442` and `:3480`.
- Rung 2 answers a plan question from the spec, the plan and the record when it can. It confirms a plan revision under the existing guard: at full auto, when the revision takes nothing off main. Otherwise the decision is the human's and rung 2 attaches its analysis.
- Find the tools the agent uses for these answers in its woken chat turn today. Give the ladder the same actions through the action table. Then remove the Waker's wake on these rows.
- The comment on the plan's issue and the poke go out from the face.

**Tests**
- A plan question whose answer stands in the spec: rung 2 answers, the workflow gets `plan_answered`, and no poke went out.
- A confirmation of a revision that drops merged work: rung 2 may not confirm, and the face carries its analysis.
- A confirmation of a revision that takes nothing off main at full auto: rung 2 confirms.

**Live check:** the count of `plan_question` and `plan_confirmation` cases that are `at_human` with no rung 2 step reads 0 for cases opened after the roll.

### Task 5: factoryd's own human cards climb

**Behaviour**
- These callers of `EscalateToHuman` and `FileHumanCard` (`chat_escalation.go:17-44`) file an issue for the human first today: the chain stall (`chainpoll.go:1495`), main still red (`mainfix.go:277`, `:420`), a refused configuration (`policy.go:867`), the production hold (`releasekeeper.go:233`), a failed or refused roll (`rolltask.go:953`, `:1402`), an alert (`signozwebhook.go:935`).
- Each one opens a trip through `OpenTrip` with its kind (`red_main`, `roll_held`, `config_refused`, `human_card`). Rung 2 gets the case with the action table's actions, for example `deploy_now` on `roll_held` (`actions.go:365-370`). The entries for these kinds in `boardKinds` (`ladder.go:566-568`) are dead today and become live.
- The human card (the issue and the poke) is the face. `Face` files it when rung 2 hands up. No caller files it before.
- The chat's own `escalate` tool keeps filing at once. Its filing is recorded as the rung 2 step of the case (the exception in the table above).
- `Climb` no longer excludes `human_card` at rung 2 (`ladder.go:586`).

**Tests**
- A production hold: the case opens `open`, no issue exists yet, rung 2 takes `deploy_now` inside its rule, and no issue is ever filed.
- Main still red with no action for rung 2: rung 2 hands up, and the issue is filed with its analysis.
- A chat-filed human card: one case, a rung 2 step by the agent, then the face.

**Live check:** `select count(*) from cases c where kind in ('human_card','red_main','roll_held','config_refused') and status = 'at_human' and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung = 2)` reads 0 for cases opened after the roll.

### Task 6: one door, one table

Tasks 1 to 5 moved every kind. This task makes a bypass impossible to write.

**Behaviour**
- `openCase` refuses any status but `open` (`cases.go:271-274`).
- One function writes `at_human`. Today four places do: `SetCaseStatus` called by `Face` (`cases.go:366-375`, `ladder.go:849`), `askCase`'s update for an ask that names its case (`cases_events.go:97-98`), `reopenMergeCase` (`:411`) and `openCase`. After this task only the door does. The door refuses a case with no rung 1 or rung 2 step unless the kind table names an exception, and the refusal names the case, the kind and "the case climbs first".
- One table holds, for every case kind: the rung 0 rows, whether rung 1 judges, what rung 2 does (decides, analyses, or nothing) and, for "nothing", the reason. It replaces the lists that hold this today: `humanOnlyKinds` (`rung1.go:21-57`), `boardKinds`, `choiceKinds` (`ladder.go:564-577`) and the two exclusions in `Climb` (`ladder.go:586`, `:628`).
- A test goes over every `Case*` constant and fails when a kind has no row, and when a row says "nothing" at rung 2 without a reason.
- Remove the kind `agent_request_info`: nothing produces it (`cases_events.go:233-278`).
- `FaceStop` (`face_stop.go:5-30`) has no production caller. Its tests go through the door or the function goes.
- The record names the decider: when a human's answers close a request and the sweep then resolves the case, the resolution keeps the human and rung 3 (`decideRequestCase`, `cases_events.go:455-471`; `caseRung`, `:560-568`).

**Tests**
- `openCase` with status `at_human` returns the refusal.
- The door refuses a case with only a rung 0 step and a kind with no exception. It passes the same case after a rung 2 step. It passes a `judgment_budget` case with no step.
- The kind table test above.
- A criteria request that a human waived resolves with the human as decider and rung 3.

**Live check:** this query reads 0 for cases opened after the roll.

```sql
select count(*) from cases c
where c.status = 'at_human'
  and c.kind not in ('judgment_budget')
  and not exists (select 1 from case_steps s where s.case_id = c.id and s.rung in (1, 2))
  and c.facts->>'face' not like '%judgment budget spent%';
```

The factory's `month_cap` card is a `human_card` today. Give it a kind of its own or a fact the query can read, so the exception shows in the record.

### Task 7: the monitor watches the rule, and the guarantee is claimed

**Behaviour**
- The monitor gets one flag: a case that is `at_human` with no AI step and no exception. It can only fire on a bug, and it makes that bug visible in a day, not in a review weeks later.
- After seven days of live record with a count of 0, change the guarantee in `docs/evidence.md` ("Every ask gets one model attempt, recorded, before a human sees it") from "not yet" to built, with the query above and its result as the evidence. `README.md` and the landing page repeat the guarantee count, so change them together and run `node launch/site/evidence.js`.

**Tests:** the flag fires on a seeded `at_human` case with no rung 1 or 2 step and stays silent on a `judgment_budget` case.

## Review focus

1. No case kind gets two AI turns: a kind that climbs has no wake on its opening row.
2. No face is written before `Face` runs: grep for issue comments and pokes written at the opening of a case.
3. A human-only decision stays human-only. The move into the ladder gives rung 2 the analysis, and the action table still refuses the decision.
4. A case on a final card (a done plan) is neither skipped by the sweep nor withdrawn by `Face`.
5. The time a human waits for a case they must decide grows by one rung 2 turn at most. Measure it on merges in Task 3.
6. With the judgment budget spent, every kind still reaches the human, marked "not judged, judgment budget spent".

## What this plan does not change

- The workflows and their signals.
- What each rung may decide on the kinds that already climb.
- The money rules: the pool, the caps and the card's draw.
- The human's console. A face looks as it does today, with rung 2's analysis on kinds that had none.
