# The open cards of 2026-11-24: root causes and plan

**Status:** plan, written 2026-11-24. Nothing is built and nothing is pressed. Code main at `d5f0078ae`, infra main at `dbfc6c2c`.

**Read with:** [the weekly bump spec](../weekly-bump-lands-alone-spec-2026-11-24.md), which holds the store and the gate faults in full.

## 1. What waits on a human

Five asks wait on a human, on four cards and one ended card. Each has a one-press or one-command answer, and no card says so in words a human can act on.

| Card | Project | What it asks | What it means | Suggested act |
|---|---|---|---|---|
| #343 | infra | "Copy the changed schemas" | Merge pull request #342, the factory's own copy of two schema files | Merge it |
| Ended alert card | infra | "This card ended, and its issue is still open. Close the issue?" | A Flux alert cleared by itself | Close it |
| #2273 | code | "Keep this extra promise?" three times, then a plan confirmation | A finished 70-line fix waits behind four presses | Drop the three promises, confirm the plan |
| #2305 | code | "Fill the factory's file store?" | Run one script with the store's login | Run it, then answer |
| #2306 | code | "A question only you can settle" | The same act as #2305, asked a second time | Nothing. It goes on after #2305 |

## 2. The cards, one by one

### 2.1 #2273, the gateway restart alert

**What happened.** On 2026-11-24 at 01:17 UTC two of the three nodes were unschedulable. The pods of `factory-gateway` and `factoryd` moved to node sf-1, PostgreSQL did not answer for about three minutes, and both programs exited at their first failed connection. Kubernetes restarted them, and SigNoz fired one alert for each. The factory filed #2273 for the gateway and #2274 for factoryd.

#2274 landed: pull request #2288 merged at 09:37 UTC.

#2273 built the same fix by 07:43 UTC: the gateway tries the store again every 5 seconds for up to 3 minutes. Its pull request #2287 had the head `37d4701` at 08:45 UTC: three files, 70 lines added and 1 removed.

**Why it stopped.** A check-in at 09:11 UTC answered "replan". Its answer says that the head `37d4701` has no `t.Setenv("TOOLS", "")` in `cmd/agent-worker/checkin_test.go`, "(I read the file)". The head has that line at `checkin_test.go:264`. The checks of that head were still pending at that time.

The replan closed pull request #2287 without a merge and made the card a plan. A plan needs a human's confirmation, and this plan's round proposed three extra promises, each of which a human keeps or drops first. That is four presses for a fix that was built 90 minutes before.

**Why the card is a mystery.** The page of an extra promise shows "Keep this extra promise for plan …?" and "The plan's cards start only once each extra promise is kept or dropped." The promise itself is not on the small card. Section 3 has the cause.

The three promises:

| Promise | What it adds | Suggestion |
|---|---|---|
| `gives_up_after_three_minutes` | A test that the gateway exits after 3 minutes without a store | Drop. The test runs 3 minutes of real time or needs a clock in the code |
| `opens_first_try_when_store_is_up` | A test that a store that is up opens at the first try | Drop. Every test of the gateway that opens a store shows it |
| `repro_flips_from_base_to_head` | A test that the reproduction command fails on the base and passes on the head | Drop. The reproduction gate does exactly this |

The mark "brief not checked" on the card is the gate fault of the bump spec's section 4.3: the brief writer's model call ended with the answer `{"`.

### 2.2 #2305 and #2306, the weekly bump

The bump spec holds the analysis. The short form: the pull request's build needs five new files in the store, and only a merge to `main` puts them there. The bump was finished at 08:20 UTC. Four plan revisions, five cards and 10.18 EUR followed.

The first replan of this plan has the same shape as #2273's. A check-in at 09:19 UTC answered "replan" because the review's model call timed out. The project agent found at 11:12 UTC that the plan this produced stood on a false premise: its "08:20Z bump commit does not exist on any branch".

Each successor card opened a new pull request. #2289, #2295 and #2304 are closed without a merge, and #2309 is open.

### 2.3 Infra #343, the schema copy

Each build of the code repository that changes a configuration schema makes the factory open a pull request with the new copies in the infra repository. The infra project runs no agents and no gates, so the factory files a human card to merge it.

Pull request #342 changes three files, 7 lines added and 5 removed: the commit the copies come from, and the action list of two schemas. The list gains `find_cards`, `cluster_facts` and `give_room` and loses `grant_session` and `fund`.

This is the fourth such card in six days. Two of the three before it were never merged: a newer build replaced #336 with #338 after two and a half days, and #338 with #342 after five hours.

### 2.4 The ended alert card on infra

Flux fired "HelmRelease forgejo-runner not settled" during the same node event, and cleared it at 01:33 UTC. The factory closed the card with the reason "The alert cleared" and then asked a human whether to close the issue.

## 3. The carousel on the small card

The carousel works. Its pages 1 to 3 hold the same words, so nothing seems to change.

`planConfirmFace` in `internal/factoryd/faces_copy.go:1534` builds the page of an extra promise. Its ask is `"Keep this extra promise for " + askedPlan(f) + "?"` and its why is one fixed sentence. Both are the same for every promise of a plan. The promise's claim is only in the story (`Happened: "The extra promise: " + claim`), which the drawer shows and the small card does not.

Page 4 of #2273 is the confirmation, with other words. That was read from the code and not checked in a browser.

## 4. The causes behind the cards

Nine causes produced the five asks. The first three hit cards of every kind.

| # | Cause | Cards |
|---|---|---|
| R1 | A gate's or the brief writer's model call spends its whole answer limit on thinking and returns `{"`, or times out. 28 cards in 14 days | #2272, #2301, #2306, #2273 |
| R2 | A check-in answers "replan" for finished work, on a reading that is false or while the checks still run. The replan closes the pull request, starts a planner and adds a human confirmation | #2273, #2272 |
| R3 | Two tests fail on `main` for reasons outside any diff: `TestStartStoresTheSessionsText` reads the shell's `TOOLS`, and `TestInterimPushRefusesTooLargeWorkBeforeReadingIt` failed on a branch that does not touch its package. The repair of the first exists only on the closed pull request #2287 | #2272, #2292, #2273 |
| R4 | The store gets new files only after the merge | #2305, #2306, every bump |
| R5 | An extra promise's page hides the promise on the small card, and a human settles each one at every autonomy level | #2273 |
| R6 | The factory's own schema copy needs a human's merge on a project without gates | infra #343 and three before it |
| R7 | A card that the factory closed for a cleared alert still asks a human to close its issue | the ended infra card |
| R8 | An ask names an act that does not exist, and a second card asks for the same act | #2305, #2306 |
| R9 | The chat's `grep` finds no file under a path, its `file` refusal names no near match, and a replanned card names no successor | the chat's answer on #2305 |

## 5. Part A: clear the board

Nothing here is pressed yet. The order runs from one press to the longest act.

1. **Infra #343:** press "Merge it".
2. **The ended infra card:** press Close.
3. **#2273:** drop the three extra promises on their pages, then confirm the plan. The landing card then runs. When its gates give no verdict (R1) and its checks are green, merge its pull request by hand.
4. **#2305:** run `scripts/upstream-files` at the head of pull request #2309 with the store's login, inside the CI runner image. The bump spec's section 7 has the steps. The script refuses the Go vulnerability database when the database moved since 2026-11-23 20:05 UTC, which is likely. The session of #2306 then pins the new sum, and the script runs once more for that one file.
5. **#2305:** answer "the store holds the files".
6. **#2306:** re-run the checks. When the audit gives no verdict on the green head (R1), merge #2309 by hand. The review approved the heads `57c84a87` and `e89590bb`.

Claude can do step 4 on a go from Sebastian. It needs the store's login from the cluster.

## 6. Part B: remove the causes

The order is by the number of cards a cause stops.

| Step | Cause | Work | Proof that it is done |
|---|---|---|---|
| B1 | R1 | The bump spec's section 5.3: read the finish reason, ask once more with more room, name the cause | No gate call of a week ends with `unexpected EOF` |
| B2 | R3 | Land the three lines of `checkin_test.go` from head `37d4701` on `main`. Find why `TestInterimPushRefusesTooLargeWorkBeforeReadingIt` fails, and repair it | Both tests pass 20 runs in CI's environment |
| B3 | R2 | First read the input of the check-in of 09:11 UTC on #2273 and find why it read the file wrongly. Then make two refusals in code: a check-in cannot answer "replan" while the head's checks run, and a replan of a card with an open pull request keeps that pull request for the successor | The two check-ins of 2026-11-24, run again on their inputs, do not replan |
| B4 | R4 | The bump spec's sections 5.1, 5.2 and 5.5 | A pull request that moves one file pin goes green with no human act |
| B5 | R5 | The small card of an extra promise shows the claim as its ask. Decision D2 settles who answers | The three pages of a plan with three promises show three texts |
| B6 | R6, R7 | The factory merges its own schema copy when the pull request's checks are green (decision D3). The factory closes the issue of a card it closed for a cleared alert | A schema change in a build reaches infra `main` with no card. A cleared alert leaves no ask |
| B7 | R8 | The bump spec's section 5.7 | One card in Needs you for one act, with the act as a command |
| B8 | R9 | `grep` strips the archive's leading directory before it matches the path. `file` names the files of the same directory with the same stem when it finds none. `card` names the successor of a replanned card and gives one line for each card its text names | The chat's turn on #2305, run again, needs 10 calls or fewer |
| B9 | – | The bump spec's section 5.4: a pin lives in the lists | A bump changes no `.go` file |

B1 and B2 are small and unblock every other card, so they go first and in parallel. B3 needs its reading before its design.

## 7. Decisions for Sebastian

- **D1. The lookup program for the bump.** Build it now, or measure four runs first. The bump spec's section 6 recommends to measure.
- **D2. Who settles an extra promise at full auto.** Today a human keeps or drops each one, at every autonomy level. The project agent already confirms plans at full auto: it confirmed revision 3 of plan #2272. The recommendation is that it also settles the extra promises at full auto, with its reason on the card.
- **D3. The factory's own schema copy on infra.** Today a human merges it. Its content is the build's own output, and a wrong copy fails the infra repository's config check. The recommendation is that the factory merges it when the pull request's checks are green.

## 8. Not verified

- Why two nodes were unschedulable at 01:17 UTC.
- That page 4 of #2273's carousel shows other words in the browser.
- That the plan of #2273 lands the head `37d4701` and does not build the fix again.
- That `grep` fails on the live Forgejo for the reason given. The reason was read from the code: the archive's entries start with the repository's name, and the tests use entries without it.
- What `TestInterimPushRefusesTooLargeWorkBeforeReadingIt` fails on.
- That a replan closes the predecessor's pull request by design. The four closed pull requests of 2026-11-24 show that it happens.
