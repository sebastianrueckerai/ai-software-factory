# Drift review after six weeks of bug fixing: the findings and the decisions

**Status:** open. It waits for Sebastian's go on the 26 decisions below.

## The question and the answer

Six weeks of bug fixing, from 2026-10-28 to 2026-11-26, added about 106,000 non-test Go lines to the code repository. The question: did the fixes drift from the factory's tenets? The tenets are a process defined by config files, one flow with one escalation ladder, every decision recorded, reliability by construction and not by prompt, and one way to do each thing.

Mostly no, in places yes. The review read 243 fault fixes. 145 fixed the general cause at the shared place. 32 patched the one path the report named and left a sibling path with the same fault. 15 were not fixed at main, or their record's claim does not hold. The drift sits in five places: how a human card closes when its reason goes away, how an answer reaches the factory, the factory's own repository as a special case, the workflow's accumulated version markers, and the writing guide loaded into every model call. Each has a plan. A sixth plan finishes the 32 one-path fixes, a seventh tidies the tests and the repositories, and a parallel session's plan on routine runs is the ninth, folded into the set.

**How to read this document.** Each plan has one section with three parts: what is wrong today, what the plan changes, and what you decide. Every decision ends in a recommendation. One line answers it all: "go with every recommendation", or the numbers you change and your answer for each. The build then runs in the order of the section before last.

## The numbers that matter

The table answers how large each kind of drift is at code main `c2dddcd67`.

| Drift | Measure | Value |
|---|---|---|
| A card's close | per-cause closer functions beside rung 0's one table | 14 in 12 files |
| A card's close | places that record one close, in 3 wordings | up to 7 |
| An answer's path | POST routes that take an answer | 8 |
| The factory's own repository | non-test lines that serve only its deploy and its red main | 3,472 |
| The config | new policy schema keys set in no file | 24 of 39 |
| The workflow | `GetVersion` change ids | 41 |
| The workflow | change ids whose old branch no run can reach | 13 |
| The prompts | share of each chat turn that is the writing guide | 43 percent |
| The tests | hand-written fake Forgejo servers | 41, 4,604 lines |
| The fixes | fixes that patched one path and left a sibling | 32 of 243 |

## What holds

The tenets hold where they matter most, and the plans leave these alone. No non-test Go names a project repository, an organisation or a person. The config tree in `factory/` drives the stages, the tracks, the lanes and the merge queue. The ladder's kind table drives the rungs, and rung 0 reads facts from one table with no model call. 29 of the 31 actions with both a button and a chat tool share one function. The face register is one register with one vocabulary. The check-in's answer, a forced tool with closed enums and refusals that name the allowed values, is the model every other model call should follow. `gofmt` and `go vet` are clean.

## Plan 1: One close for every card

[2026-11-27-one-close-for-every-card.md](2026-11-27-one-close-for-every-card.md). 16 tasks, about 600 non-test lines go.

**Today.** The factory files a card for a human when something stops it: the month cap is reached, a provider froze a model class, main is red, a roll failed. When the reason goes away, the card should close by itself with a record of why. Agent cards get this from one table, rung 0, read every minute. Factoryd's own human cards do not. A guard in `Act` refuses rung 0's withdrawal of a human card, so each cause got its own closer: 14 functions in 12 files, each with its own schedule, its own way to end the card out of six, and its own record. One close is written in up to 7 places in 3 wordings, and two closers write no record at all. A third copy of the facts decides whether the factory agent may close such a card, and it has drifted: the agent cannot end a roll card, a follow card or an alert card whose cause is gone. The freeze card alone grew from 464 to 1,879 lines in ten days, with its own retry, its own outbox and a parser that reads its state back from the card's text.

**The change.** Every cause becomes a row of rung 0's table, 14 new rows. The retake pass is the one sweep. `Act` ends the human card in one store transaction with one record, and Forgejo follows through the outbox that exists today. The 14 closers lose their close halves, the third copy of the facts goes, and the freeze card keeps its state in its case's facts. A stop's kind travels as a typed field instead of the first words of its reason, which 28 places parse today. The risk: every factory card's close path changes in one plan. The plan rolls in groups and reads the record a week after each roll.

**You decide.**

1. **A card stopped by a pod that never started, or by a platform fault, resumes once any session ran since.** A commit of 2026-11-26 added this row, the earlier cause-gone plan had refused it, and no decision records the change. A false resume costs one pod start, or at most one session's model spend, since a stop that comes back stays with the human. Recommendation: keep the row and record it.
2. **A provider freeze that comes back after your retry press: reopen the pressed card, or file a new one?** Reopening costs about 180 lines that only the freeze card has, and no other card reopens. Recommendation: a new card, whose first line names the earlier one.
3. **A card the factory withdrew because its reason went: does it end `closed` or `done`?** Today 10 closers say done and 4 say closed. `closed` says the card's work was not done and stores the reason. Recommendation: `closed`. The outcome metric then counts those cards as closed, not done.

## Plan 2: One door for every answer

[2026-11-27-one-door-for-every-answer.md](2026-11-27-one-door-for-every-answer.md). 22 tasks in 6 pull requests, about 1,200 lines go.

**Today.** A human answers a card from the board, the inbox, the opened card or the chat, and the factory agent answers through its tools. Eight POST routes take an answer, and six code paths turn one into an action. A plan's questions and a resource request never pass `Act`, the one function meant to run every answer. The guard "this card is not the human's yet" lives in three console variants instead of `Act`. Human cards carry 14 choice values of their own beside the vocabulary, and `retry` means two things, told apart by the card's source in four places. That caused a fault on 2026-11-18, when a chat retry on a freeze card ran a close beside it. The project agent reads a different card than the human: the raw objective and choices, not the brief and the ask. About 14 renderers tell a card's story, each in its own words.

**The change.** One route answers a card from every screen and the chat. One function builds every resolution, and `Act` runs every kind, plan questions and resource requests included. The guards move into `Act`. Choice values become vocabulary keys, with a migration of the live offers. The agent reads the card the human reads. Each repeated fact has one wording. The risk is the migration of live cases' offers, which a test pins on fixtures.

**You decide.**

4. **Does a human's role bound the factory agent's own answer?** Since 2026-11-18 the human's role is checked on one of the agent's answers, the retry. Checking every approver action that way would refuse the agent's merges in a project whose first notified human is a writer. Recommendation: check none. The agent's authority stays in the policy files: the action table, the project's autonomy and its draw bounds.
5. **As whom does the chat's document write commit?** Today as a service token, so Forgejo names no human. Recommendation: as every other chat write, the human's session when the human's word carries it, the agent's token when the agent decided it.
6. **Does the intake switch get a chat tool?** The switch decides whether the project agent files its own cards. A tool would let the agent open its own intake. Recommendation: no tool, with the reason stated in the route table.

## Plan 3: The factory's own repository is a project like any

[2026-11-27-own-repository-like-any-project.md](2026-11-27-own-repository-like-any-project.md). 18 tasks in 8 pull requests and 4 infra commits by hand, about 2,900 non-test and 7,300 test lines go.

**Today.** A template project deploys through its own CI. Main CI writes the live state to a branch `deploy`, Flux applies it, and the chain poller runs the red-main ladder: pause the queue, re-run once, file a fix card, revert after two hours. The factory's own code repository deploys another way. A roll task in Go files a card with a digest bump, runs it through the task workflow with 12 special branches, and `mainfix.go` runs a red-main ladder of its own, while the chain poller skips this one repository. 3,472 non-test lines and about 8,950 test lines serve one repository. Three smaller pieces have the same shape. The bump pass looks general and reads the code repository's ten files by name, so a bump routine on any other project fails every Monday. Companions, 1,300 lines built on 2026-11-01, are set in no project file. Seven sites name the reference host or namespace.

**The change.** The code repository deploys as a template project does. The chain poller carries the red-main ladder for every project. The roll task, `mainfix`, the `rolling` branches and the companions are deleted. The bump routine lists its files under `paths:`. The risk is the switch of how the factory deploys itself: one infra commit must land during a CI run, and three things were read but not run, the platform runner's labels and network, the reconcile right for the read-token secret, and equal digests without provenance.

**You decide.**

7. **The per-deploy roll card goes.** At full auto the gate bot merges it today, so nothing changes there. Below full auto a human approves each roll today. In the target the merge rule gates each change and the plan hold with Deploy now gates production, as for any project. Recommendation: yes. If a gate on every deploy is wanted later, it is a general project key, about 20 lines, not a card.
8. **When factoryd does not answer `/release`, the factory's own deploy goes ahead after 5 minutes.** A template project fails closed. For the factory itself, a silent factoryd is most often the factoryd that the next deploy must fix. A 400 or 401 is an answer and still stops the deploy. Recommendation: yes, with a line in the job's log.
9. **The roller's signature check of its own images goes, and main CI's signing stays.** In the target no step resolves a tag, and only main CI holds the deploy key. Recommendation: yes. If "no unsigned image goes live" must hold as written, the promote job verifies each digest in 4 lines.
10. **Every project gets the red-main ladder, the infra repository included.** On infra, which has no agents and a human merge rule, each rung files a human card and the revert is a pull request a human merges or closes. Recommendation: yes.
11. **Companions: declare in 3 YAML lines, or delete 1,300 lines no configuration switches on?** Recommendation: delete. The docs clone shows the pattern if a read-only clone is needed later.

## Plan 4: The config says it once

[2026-11-27-config-says-it-once.md](2026-11-27-config-says-it-once.md). 18 tasks in 5 groups, about 200 Go lines and 60 YAML lines go.

**Today.** The config surface grew from 212 to 299 key paths in six weeks. 24 of the 39 new policy schema keys are set in no file. Some keys have no reader or one legal value. Pairs of keys must agree, and three places check one of them. Facts that Go forces are restated in the files, and facts the files should hold live only in Go: two class names, four card size tables, and a EUR figure that `policy.yaml` repeats in a comment. `maintenance.yaml` is a second shipped process. No project has named it since 2026-10-15, and it keeps the stage order from before 2026-10-14.

**The change.** Every key has a reader and more than one legal value, or it goes. A fact Go forces is in the file and read from it, or out of the file. The config check refuses what Go refuses at run time. The factory ships one process. The change crosses two repositories in order: the code reads old and new keys, the infra commit moves, the code refuses the old keys.

**You decide.**

12. **Delete `maintenance.yaml`, so the factory ships one process, `spec`.** Recommendation: delete.
13. **Keep the 21 never-set keys that have a reader.** They are knobs a human turns without a release, and the console writes one of them. Recommendation: keep.
14. **The stage list stays a list in one fixed order**, not a mapping keyed by stage name. Recommendation: the list. It reads as the run order.

## Plan 5: Collapse the workflow's history

[2026-11-27-collapse-the-workflow-history.md](2026-11-27-collapse-the-workflow-history.md). 15 tasks in 7 pull requests, about 940 lines go.

**Today.** Temporal replays a workflow's recorded history, so each change to workflow code sits behind a `GetVersion` change id with an old branch and a new one. 41 ids accumulated. A floor already refuses every history older than its marker, so the old branches of 13 ids can never run again: dead code held in place by 17 test pins. The other 25 wait on runs that may be days old, a card parked on a human. No live history has been replayed since 2026-11-11, and `architecture.md` says 18 ids and names 19 that were removed. Around the same code, a card's end is written at 114 sites with free-text reasons and 7 ends bypass the workflow. 23 periodic loops are hand-written copies outside `Passes.Run`, with no bound and no line on `/readyz`.

**The change.** The 13 dead ids go now. A drain step lets the other 25 go: the heal pass ends a parked run that lacks the newest marker, and its next pass starts the run again on today's code, where it waits on the same case with no new face. A test caps the workflow at two ids. A card's end becomes one typed enum through one store function, the over-bound push a typed field, and every loop runs through `Passes.Run`. A committed recorder records the replay corpus.

**You decide.**

15. **Which parked runs the drain restarts.** The plan restarts a run whose card waits on a human, the issue's author, an image or its dependencies. A run in review would take its head through every stage again, a review and an audit call with maybe another verdict. A run frozen on a provider limit would start a session the provider refuses again. Recommendation: the four parked waits only. `/readyz` shows how many runs hold the floor.
16. **What the replay corpus is.** A recorder on a dev server under stub activities covers every wait by construction and holds no card text. Exports from live runs carry real results, and also card text and human answers into a repository GitHub mirrors in public. Recommendation: the recorder.
17. **A test caps the workflow at two change ids, the floor and the newest.** Each workflow change then first collapses the one before it. Without the test, collapses happen when someone remembers, as in the last six weeks. Recommendation: yes.

## Plan 6: Prompts carried by construction

[2026-11-27-prompts-carried-by-construction.md](2026-11-27-prompts-carried-by-construction.md). 15 tasks, about 4,700 prompt words go and about 500 code lines come.

**Today.** 31 prompts carry about 19,900 fixed words. Since 2026-11-16 every writer carries the writing guide's forms: 2,541 words, 43 percent of every chat turn. The project agent's system text grew from 251 to 2,815 words. Of 163 distinct rules, 22 are carried by code already, 23 could be carried by a tool or a check, and 111 stay. 13 steps spell a JSON answer in prose instead of a forced tool with a schema, which the check-in already has. Three numbers in prompts disagree with the code: the review summary 500 against 1,000, the audit's why 300 against 500, the gate supervisor 1,000 against 2,000. A paragraph on reproducing an alert goes into every coding session and matters only for alert cards.

**The change.** The guide's forms load where a text has no other carrier and come on demand elsewhere, through the door's first refusal and the `manual` tool. 13 steps answer through one forced tool with a schema. The 22 rules go, the three numbers are fixed, and conditional text renders only when it applies. The money is small, 0.003 EUR per premium call uncached. The case is the small-default-context principle: depth comes by tools.

**You decide.**

18. **Where the guide's forms load.** A: as today. B: every long form on demand, which saves 2,406 words per chat call and leaves the chat's replies with no carrier of the style rules, since no door checks them. C: each writer keeps the forms of its main text and gets the others on demand, which saves 1,182 words per chat call and keeps a carrier for every style rule. C reverses part of the 2026-11-16 decision. Recommendation: C. A task measures the share of cards that file unchecked before and after.

## Plan 7: Tests share one fake, and the repositories lose their leftovers

[2026-11-27-tests-and-housekeeping.md](2026-11-27-tests-and-housekeeping.md). 12 tasks, about 5,200 code lines and 250 lines of this repository go.

**Today.** 41 hand-written fake Forgejo servers in tests, 4,604 lines. The Postgres tests were split into their own package so one gate entry fit 15 minutes. That reason went on 2026-11-17, and the split costs an 888-line export shim and 132 copied test functions. 136 non-test functions are reached only by tests. Testdata nothing reads, two scripts nothing calls and six unlinked dated docs remain in the code repository. The console's `AGENTS.md` has 7 prose rules, none tested, 3 broken. This repository has 65 plans with unticked boxes and no status line, and 27 untracked entries in its root, one of which names where the credential files live.

**The change.** One shared fake. The Postgres tests return to their package. Dead and copied helpers, stale testdata and docs go. The console's rules become tests. A built plan gets a status line the hook enforces. The root entries are committed or deleted.

**You decide.**

19. **The Postgres tests return to package `factoryd`**, behind a skip when no database is present. It costs about 90 seconds on CI's longest package. Recommendation: yes.
20. **`staticcheck` runs in CI only**, a pinned binary at 46 seconds cold and 2.7 GB, not in `bash check`. Recommendation: yes.
21. **A built plan gets one status line under its title**, refused by the pre-commit hook when missing. An archive directory would break 171 references. Recommendation: the status line. This document carries one.
22. **The 27 untracked root entries.** Commit three that tracked documents link or name: the card-flow directory of 2026-11-02, the faults of 2026-11-17 and the needs-you analysis of 2026-11-01. Delete the other 24. The board-loop notes of 2026-11-09 name where the credential files live and must never reach the public mirror. Recommendation: the plan's table, one line per entry.

## Plan 8: Finish the general fix

[2026-11-27-finish-the-general-fix.md](2026-11-27-finish-the-general-fix.md). 36 tasks in 16 pull requests, about 130 lines go and 400 test lines come.

**Today.** 32 fixes patched the one path the report named. A retry at low thinking depth fixed cut model answers for the gates and the brief writer, a cause that stopped 28 cards in 14 days, while the check-in and rung 1 still repair at the same depth. Two card filers still pay for sessions the push rule refuses. One proof check no longer counts invariants on main while the criteria gate on main still does. The alert card's retire keys on three alert names typed into Go that copy infra's rule names. Refusals are scrubbed at 51 call sites, and the two writers every refusal passes through scrub nothing. 15 more items have no fix on any branch, or a record whose claim does not hold.

**The change.** 40 items, each fixed at the shared function every path passes: one repair round for every direct model answer, the filers, the criteria gate, alert names read from the config, the two refusal writers. The plan checked each item at main and dropped three the review had wrong.

**You decide.**

23. **The check-in loses the `policy_class` reason on every moment**, so the merge gate is the only router of policy, as you leant on 2026-11-01. Today one moment routes it and every other moment reaches you with no approval card behind it. Recommendation: yes. Open cases of that kind are withdrawn in a data step.
24. **A hold whose release card ended failed or closed.** Today a notice outside the ladder tells you, and no rung can act first. The plan opens the dependency case that exists today on each held card. Recommendation: the dependency case.
25. **The audit flags pure renames as changes.** A filter was built and deleted the same day, since its type check could not be bounded. Recommendation: record that the audit reads the raw diff and a rename costs one confirmation per item. No live fault since 2026-11-17. The alternative is a rename check pod with its own time bound.

## Plan 9: A routine's run shows while it works and says why it failed

[2026-11-27-routine-runs-shown.md](2026-11-27-routine-runs-shown.md). 7 tasks. Written by the parallel session of 2026-11-27 and folded into this set.

**Today.** On 2026-11-26 you pressed Run it now on the weekly bump. The run worked, filed its pull request, and the console showed none of it: the routine stayed a ghost at the foot of Queued, the drawer's Last row was empty, and the button threw its note away. A failed run would show less. Temporal retries it for up to 24 hours, and after the last attempt a row nobody reads says "failed".

**The change.** A working run stands its routine in In progress with a running dot and "running since". A run gets three attempts, each failure's error goes on the run's row, and then one held card per routine is filed. The factory agent reads it first, and a human sees it in Needs you only on a hand-up. A later run that ends well closes the card.

**What the fold changed.** As written, the plan's Task 3 added a fifteenth per-cause closer, a branch in the third copy of the facts that Plan 1 deletes, and a fifteenth own choice value with a console function switched by the card's source, the shape Plan 2 removes. Task 3 is rewritten: the card's kind and its close row join rung 0's table, the run's good end calls the one retire, the agent's close passes when the row fires, and the retry is a vocabulary key run by key. Task 2's change id goes as well, since a retry policy is an activity option and needs none by Plan 5's rule. Tasks 1, 2, 4 and 5, the showing, build at once. Task 3 builds after Plans 1 and 2.

**You decide.**

26. **The plan's seven defaults stand as a set.** The working routine keeps its ghost look, at the foot of In progress. Three attempts, 10 and 20 seconds apart. The factory agent retries once per failure and hands up a failed retry. One standing card per routine. A run that ends `filed`, `no change` or `reported` closes the card, and `held`, `skipped` or `gone` leaves it open. A factory routine's card files on the configuration repository. The press answers on the board within 5 seconds. Recommendation: accept as a set.

## The order to build

1. **Plan 9, Tasks 1, 2, 4 and 5**, the showing of a run. Small, independent, and the fault is live.
2. **Plan 8**, its live faults first. The low-depth retry the check-in and rung 1 still lack stopped 28 cards in 14 days.
3. **Plan 1.** It removes the largest source of per-fault code and the human cards that close without a record.
4. **Plan 5.** The 13 dead markers go at once. The drain step should land before the plans below add new markers.
5. **Plan 2 and Plan 4**, independent of each other and of the three before.
6. **Plan 9, Task 3**, the failure card, on the shapes Plans 1 and 2 built.
7. **Plan 3.** The largest deletion, after the chain poller carries the red-main ladder, which its own tasks build.
8. **Plan 6.** Decision 18 comes first. The deletion of the 22 redundant rules can land any time.
9. **Plan 7** runs beside any of the above. Its stale-artefact tasks can run today, and the shared fake makes every later plan's tests cheaper.

## The state of main, and what is not verified

- The eight plans read code main `c2dddcd67` of 2026-11-26 and the config tree at `e4d10c6`. On 2026-11-27 the open faults branch merged as `fc92cc9fd` and rolled as `2af2e0ed2`. Plan 8 reads main before its tasks that touch the same code and builds on what merged. The parallel session that ran the open faults plan is done, and so is the one that wrote Plan 9.
- Nothing ran against the live database or the cluster. No finding is proven live, and the line figures come from reading the code's spans, not from trial changes.
- The plans corrected the review in three places. A merge without an audit does not reproduce at main, since a failed audit becomes a finding and a card with a finding never reaches the bot's merge. The hand-written loop count is 23, not 13. Seven rules the review called redundant have no carrier and stay.
