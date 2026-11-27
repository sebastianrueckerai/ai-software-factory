# Drift review after six weeks of bug fixing: the findings and the eight plans

**Question.** Six weeks of bug fixing, from 2026-10-28 to 2026-11-26, added about 106,000 non-test Go lines to the code repository. Did the fixes drift from the factory's tenets: a process defined by config files, one flow with one escalation ladder, every decision recorded, reliability by construction and not by prompt, and one way to do each thing?

**Answer.** Mostly no, in places yes. Of 243 fault fixes read, 145 fixed the general cause at the shared place. 32 patched the one path the report named and left a sibling path with the same fault. 15 were not fixed at main, or their record's claim does not hold. The drift concentrates in five places: how a human card closes when its reason goes away, how an answer reaches the factory, the factory's own repository as a special case, the workflow's accumulated version markers, and the writing guide loaded into every model call. Each has its plan below.

**How the review ran.** Eight reviews read the code at main `c2dddcd67` of `ai-software-factory-code`, the config tree at `e4d10c6` of `ai-software-factory-infra`, and the fault records of this repository. Each review wrote its findings with `file:line` evidence. Eight plans were then drafted from those findings, one per theme. Each drafter read the code again at every cited line and corrected the review where it was wrong, so each plan carries its own evidence and a reader needs no other file. Nothing ran against the live cluster or the live database. No code changed.

## What the numbers say

The table answers how large each kind of drift is at main `c2dddcd67`.

| Theme | Measure | Value |
|---|---|---|
| Closing a card whose reason is gone | per-cause closer functions beside the one rung 0 table | 14 in 12 files |
| Closing a card whose reason is gone | places that record one close | up to 7, in 3 wordings |
| Answering a card | POST routes that take an answer | 8 |
| Answering a card | ways an answer becomes an action | 6 |
| The factory's own repository | non-test lines that serve only its deploy and red main | 3,472 (plus about 8,950 test lines) |
| Config surface | key paths, 2026-10-28 to 2026-11-26 | 212 to 299 |
| Config surface | new policy schema keys never set in any file | 24 of 39 |
| Workflow versioning | `GetVersion` change ids | 41 |
| Workflow versioning | ids whose old branch no run can reach today | 13 |
| Prompts | fixed words every model call carries, over 31 prompts | about 19,900 |
| Prompts | share of each chat turn that is the writing guide | 43 percent, 2,541 words |
| Prompts | distinct rules that code already carries | 22 of 163 |
| Tests | hand-written fake Forgejo servers | 41, 4,604 lines |
| Tests | test functions copied between `factoryd` and `factoryd/pg` | 132 pairs, 1,814 lines |
| Tests | export shim that exists only for the `pg` tests | 888 lines |
| Code shape | non-test functions over 150 lines | 32, 9,155 lines |
| Code shape | periodic loops written by hand beside `Passes.Run` | 23 |

## What the review found fine

The tenets hold in the places that matter most. The plans below do not touch them.

- No non-test Go names a project repository, an organisation or a person. The config tree in `factory/` drives the stages, the tracks, the lanes and the merge queue.
- The escalation ladder's kind table drives the rungs. Rung 0 reads facts from one table and calls no model. The check that a cause is gone before a rung hands a case to the human reads the same facts.
- 29 of the 31 actions that have both a button and a chat tool call one shared function.
- The face register is one register with an entry per kind and one vocabulary of answer labels. The fixtures are tests over the kind lists, not snapshots.
- The hold on a card's work and the provider's freeze of a model class are two things, and their two files are right to be apart.
- The check-in's answer construction, a forced tool with closed enums and parse refusals that name the allowed values, is the model every other model call should follow.
- `gofmt` and `go vet` are clean. 145 of 243 fixes were general.

## The eight plans

Each plan explains its situation from the ground up, names the tenet it argues from, lays out the trade-off, and ends in tasks with tests. The plans are independent of each other except where a plan names a seam. The line figures are estimates from the code's spans.

| Plan | What it changes | Tasks | Net lines |
|---|---|---|---|
| [One close for every card](2026-11-27-one-close-for-every-card.md) | Rung 0's table becomes the one registry of facts that close a card, the retake pass the one sweep, and `Act` the one place that ends a human card and writes the record. The 14 per-cause closers lose their close halves. The freeze card loses its own retry, outbox and text parsing. A case's kind travels as a typed field, not a sentence prefix. | 16 | about −600 |
| [One door for every answer](2026-11-27-one-door-for-every-answer.md) | One route answers a card from the board, the inbox and the chat. `Act` runs every kind, plan questions and resource requests included. Guards move from the console's callers into `Act`. The agent reads the card the human reads. | 22 | about −1,200 |
| [The factory's own repository is a project like any](2026-11-27-own-repository-like-any-project.md) | The code repository deploys as a template project deploys, the red-main ladder lives in the chain poller for every project, and the roll task, `mainfix` and the `rolling` branches go. Companions go. | 18 | about −2,900, and −7,300 test lines |
| [The config says it once](2026-11-27-config-says-it-once.md) | Every key has a reader and more than one legal value, or it goes. Facts that Go forces are in the file and read from it, or out of the file. The config check refuses what Go refuses at run time. The factory ships one process. | 18 | about −200, and −60 YAML lines |
| [Collapse the workflow's history](2026-11-27-collapse-the-workflow-history.md) | 13 version markers go now. A drain step lets the other 25 go, and a test caps the workflow at two. A card's end is one typed enum, the over-bound push a typed field, and every periodic pass runs through `Passes.Run`. | 15 | about −940 |
| [Prompts carried by construction](2026-11-27-prompts-carried-by-construction.md) | The writing guide's forms load where a text has no other carrier and come on demand elsewhere, 13 steps answer through one forced tool with a schema, rules that code already carries go, and three numbers that disagree with the code are fixed. | 15 | about +500, and −4,700 prompt words |
| [Tests share one fake, and the repositories lose their leftovers](2026-11-27-tests-and-housekeeping.md) | One fake Forgejo server, the `pg` test split resolved, dead and copied helpers deleted, stale testdata and docs removed, the console's prose rules turned into tests, and this repository's notes and plans given a status. | 12 | about −5,200, and −250 in this repository |
| [Finish the general fix](2026-11-27-finish-the-general-fix.md) | The fixes that patched one path get their general form at the shared function: one repair path for every model answer, the card filers, the criteria gate's invariants, the alert names, and the rest. 40 items in 16 pull requests. | 36 | about −130, and +400 test lines |

## The order to build them

1. **Finish the general fix**, its live faults first. The retry at low thinking depth that the check-in and rung 1 still lack stopped 28 cards in 14 days.
2. **One close for every card.** It removes the largest source of per-fault code and the human cards that close without a record.
3. **Collapse the workflow's history.** The 13 dead markers go at once. The drain step needs Sebastian's decision and should land before the plans below add new markers.
4. **One door for every answer** and **The config says it once.** Both are independent of the first three and of each other.
5. **The factory's own repository is a project like any.** The largest deletion, with four infra commits by hand and one that must land while a CI run is in flight. It runs after the chain poller carries the red-main ladder, which its own tasks build.
6. **Prompts carried by construction.** The decision on the forms comes first. The deletions of redundant rules can land any time.
7. **Tests share one fake** runs beside any of the above. Its stale-artefact tasks can run today. The shared fake makes every later plan's tests cheaper, so it pays to start it early.

## Decisions for Sebastian

Each plan lists its decisions with the context to decide and a recommendation. They are gathered here so they can be answered in one sitting. The recommendation stands after each.

**One close for every card**

1. A card stopped by `pod_never_started` or `platform_fault` resumes once any session ran since. Commit `63b54a95c` did this and the cause-gone plan had refused it. Keep it and record it.
2. A freeze that comes back after a retry press files a new card that names the earlier one, instead of reopening the pressed card. A new card.
3. A card the factory withdrew because its reason went ends `closed`, not `done`. `closed`, with the reason stored.

**One door for every answer**

4. The human's role does not bound the factory agent's own answer. Today one action, the retry, checks it. Check none.
5. The chat's document write commits as the human's session or the agent's own token, like every other chat write. Yes.
6. The intake switch gets no chat tool, since it is the human's control over the agent's own filings. No tool.

**The factory's own repository is a project like any**

7. The per-deploy roll card goes. The merge rule gates each change and the plan hold with Deploy now gates production. Yes.
8. The deploy job goes ahead after five minutes when factoryd does not answer `/release`. Yes.
9. The roller's signature check goes and main CI's signing stays. Yes.
10. Every project, the infra repository included, gets the red-main ladder: the queue pause, one re-run, a fix card, a revert after two hours. Yes.
11. Companions are deleted. Built on 2026-11-01, never set in any project file. Delete.

**The config says it once**

12. `maintenance.yaml` is deleted, so the factory ships one process, `spec`. Delete.
13. The 21 never-set keys that have a reader stay. Keep.
14. The stage list stays a list in the one order the check refuses to change. Keep the list.

**Collapse the workflow's history**

15. The drain restarts only runs whose card waits on a human, the issue's author, an image or its dependencies. A run in review or frozen on a provider limit holds the floor until it moves on. Yes.
16. The replay corpus is recorded by a committed recorder on a dev server under stub activities, not exported from live runs. The recorder.
17. A test caps the workflow at two change ids, the floor and the newest, so every workflow change first collapses the one before it. Yes.

**Prompts carried by construction**

18. Where the writing guide's forms load. Each writer keeps the forms of its main text. The forms of a text it files now and then come with the door's first refusal. The whole guide stays in the chat's prompt and moves behind the `manual` tool for sessions. This reverses part of the 2026-11-16 decision. Option C in the plan.

**Tests share one fake**

19. The Postgres tests move back into `package factoryd`, behind a skip when no database is present, and the 888-line export shim and the copied tests go. The split's reason went away on 2026-11-17. Yes, at about 90 seconds more on CI's longest package.
20. `staticcheck` runs in CI only, not in `bash check`, since a cold run takes 46 seconds and 2.7 GB. Yes.
21. A built plan gets one status line under its title, and the pre-commit hook refuses a plan without one. An archive directory would break 171 references. The status line.
22. The 27 untracked entries in this repository's root. Commit three that tracked documents link or name. Delete the other 24, among them the board-loop notes of 2026-11-09, which name where the credential files live and must not reach the public mirror. The plan lists each entry with one line.

**Finish the general fix**

23. The check-in loses the `policy_class` reason on every moment, and the merge gate stays the only router of policy. Yes.
24. A hold whose release card ended failed or closed opens the existing dependency case, not a notice outside the ladder. Yes.
25. The audit reads the raw diff, and a pure rename costs one confirmation per item. Record the rule instead of building a rename check pod.

## What this review did not do

- Nothing ran against the live database or the cluster, so no finding here is proven live. Each plan says what it verified by reading and what it inferred.
- The size estimates come from reading the code's spans, not from trial changes.
- The plans corrected the review in places. The merge-without-audit fault of the needs-you register does not reproduce at main, since a failed audit becomes a finding and a card with a finding never reaches the bot's merge. The hand-written loop count is 23, not 13. Seven rules the review called redundant have no carrier and stay.
- Two sessions were at work while the review ran. One carries out the open-faults plan of 2026-11-26 in the branch `open-faults` of the code repository, with four fixes in one pull request. The other wrote the plan on routine runs of 2026-11-27 and changed no code. The plans here read main `c2dddcd67` and name the seams where the open-faults branch touches the same code.
