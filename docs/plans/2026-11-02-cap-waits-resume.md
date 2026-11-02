# Cap stops: the card resumes when the cap moves or the month turns

Written 2026-11-02. Status: plan, awaiting Sebastian's OK. Nothing changed.
This is fault 6 of docs/needed-fixes.md. Code references are to the code
repository's main at 21ee41a2. The incident figures come from the live
cluster's database, read 2026-11-02.

## What happened

Neither the gateway nor LiteLLM kept the €544 month cap after the raise of
2026-10-31. The register's mechanism is wrong. What stayed frozen was the
wait of the two cards the cap had stopped: a raised cap does not end a card's
month-cap wait, only an answer does.

The gateway's audit rows for the night:

- From 23:19 to 23:31 the gateway refused 20 calls with refused_month_cap.
  Every reason reads "free headroom ... month 0.000001 EUR" or similar: the
  gateway's own hold under policy version 971, not LiteLLM's backstop.
- At 23:31:02 version 972 activated, with month_eur 600 (infra bed2930).
  The two refusals at 23:31 under version 971 fall inside the gateway's
  30-second policy cache (policyTTL, server.go:171).
- From 23:32 on every call was allowed. No refused_month_cap appears after
  23:31. Versions 973 and 974 (23:34:32, 23:35:33) carried 600 too.

LiteLLM's proxy-wide max_budget refused calls only from 13 to 15 October (71
rows, all "Max budget: 55.0"), when it was set below its own counter. That
night it held 680 USD, 1.25 times 544, set on 2026-10-15. Its config map
carries a checksum annotation, so Flux restarts the proxy whenever its values
change, with no factory roll. The raise to 750 (infra d828b36) reached the
proxy that way. Its budget row reads max_budget 750 and a November spend of
108.02 USD.

Two cards stopped at the cap, and neither resumed when it moved:

- #1352 (t-4a9f29667345) asked "The month cap is reached and the card's
  session was refused. Raise the cap to let it finish?" at 23:22:52. It
  waited until the chat agent answered at 00:11:11, 40 minutes after the
  raise freed €56 of the month.
- #1353 (t-22eefd162d41) had a call refused at 23:28. Its session ended at
  23:51:36, and factoryd then asked the same question, 20 minutes after the
  raise. The ask came from the 23:28 audit row, not from the cap in force.
  The chat agent answered at 00:11:10.

The register's first entry (34135b3) read these stopped cards as the
gateway's refusals. Its correction (5c60c98) moved the blame to LiteLLM
without reading the audit. Fault 3's plan built on the same premise. Its
"policy skew" did not exist: versions 962 to 971 all carried month_eur 544,
and card #1345's only refusal that evening was refused_budget at 19:17, with
€53.30 of the month free.

## The mechanism

A cap stop has three ways out: an answer, the cap no longer binding, and the
period's turn. The day cap has all three. The month cap and the project's
month cap have only the answer.

- `CapRefusal.until` (monthcap.go:48) returns zero for every cap but the
  day's: "a month's cap, which only a human raises".
- `awaitCap` (workflow.go:3894) sends a zero until to `awaitHuman`, a wait
  with no end of its own. The day cap goes to `awaitDay`, whose `dayWait`
  (workflow.go:3921) runs `DayResume` every `dayCheck` (5 minutes) and ends
  at the UTC day's turn.
- `RunSession` (activities.go:986 to 996) returns a month or project
  refusal as `OutcomeEscalate` with a reason string. Only the day cap's
  refusal travels as `res.Capped`. The plan track (plan.go:1908 to 1945) and
  the report session (workflow_stages.go:1368) already carry every cap in
  `res.Capped`, and both reach the human-only wait through `until`.
- The attempt floor (workflow.go:1865) waits on its own only when
  `DayCapped(why)`. A month or project floor refusal goes to `awaitHuman`
  with "Raise budget.month_eur in policy.yaml by a commit and answer"
  (activities.go:730).
- Nothing reads the cap in force before the ask. #1353's question came from
  a refusal that version 972 had already lifted.
- The question promises what the code does not do. `monthCapQuestion`
  (question.go:503) says "This card resumes once the cap moves". The card
  waits for an answer.

Two smaller faults sit in the same flow:

- The month alarm keys its cap card by month alone (`fp := m.Month + "/" +
  strconv.Itoa(pct)`, monthcap.go:181). October's 100 percent alert (545)
  fired on 11 October at that day's cap and filed card t-9c891f0a1083
  (infra #33, done). On 31 October the alarm filed no card, and the stop
  question's "the cap card on the board links it" pointed at a card closed
  20 days before.
- `DayResume` (activities.go:763) ends a day wait once the day's free
  headroom fits the cheapest call (`startFits`, `policy.MinCallTokens`).
  The floor that runs next needs a session's recorded opening or
  `budget.session_floor_*_eur`. If the free headroom sits between the two,
  the wait ends, the floor refuses at the day cap, and the card asks again,
  every 5 minutes. The live record holds no such loop yet.

## The fix

### A. Every cap wait ends on its own

A cap stop waits for the first of three things: an answer, the cap no longer
binding, the period's turn. One wait serves the day, the month and the
project.

1. At the new version, a cap's until is the period's turn for every cap:
   `dayTurn` for the day, a new `monthTurn` (the first of the next UTC
   month, 00:00) for the month and the project. The ledger counts UTC
   months (`policy.MonthSpentSQL`), so the turn matches the gateway's reset.
   `until` and `reason` move to the run (`t.capUntil(c)`, `t.capReason(c)`),
   because a planner or report run from before the change already reaches
   them with month refusals (plan.go:1940, workflow_stages.go:1368) and
   must keep its zero until and today's reason on replay.
2. At the new version, every cap gets a "resumes on its own" reason, built
   like the day cap's. The constants follow the day cap's pair
   (`dayCapReached`, `dayCapResumes`): `monthCapReached` and
   `projectCapReached` shorten to "the month cap is reached" and "the
   project's month cap is reached", today's full opening stays the form an
   old run writes, and a new `monthCapResumes` and `projectCapResumes` add
   ": the card resumes on its own". The first line names the turn and the
   way out: "Raise budget.month_eur in policy.yaml to resume it sooner, or
   close the card." The project cap names `projects/<name>.yaml`. The second
   line carries the refusal's state. Every reader of the openings matches
   the short opening, so old and new reasons read alike:
   `escalationSource` (alerts.go:103 to 107, which gives A5 its alert
   sources `month_cap` and `project_cap`), the question's choice
   (question.go:167), `capRefusedSuffix` (question.go:532) and the
   month-spend facts (question.go:828). The alert sources stay, so
   `budgetSources` (pokes.go:53) needs no change.
3. `dayWait` becomes `capWait` and carries the refusal's decision. It checks
   every `dayCheck` (5 minutes) at the day cap and every hour at the month's
   and the project's. A 31-day wait at 5 minutes would write about 8,900
   checks into one run's Temporal history, against a hard limit of 51,200
   events. An hourly check writes at most 744. A wait that a healed run
   restores checks at once, so a raise during a factoryd restart is not
   missed for an hour.
4. A new activity `CapResume(taskID, model, decision, turned)` ends the wait
   when the session floor (`r.funded(ctx, taskID, model, true)`, the check
   `SessionFunded` runs) no longer refuses at that cap, and the policy
   version in force activated at least the gateway's `policyTTL` (30
   seconds, exported from the gateway package) ago. The second condition
   matters because the gateway may enforce the old version for up to 30
   seconds after a load. Without it, a check right after a raise ends the
   wait, the next session is refused at its first call by the gateway's
   cached cap, and that refusal counts as no attempt, so the card would loop
   with no wait. `policy.Version.ActivatedAt` holds the activation time. A
   floor refusal for another reason, such as the task's budget, also ends
   the wait: the attempt's own floor (workflow.go:1858) then asks its own
   question, a fresh ask, not a second cap wait. An unpriced model waits for
   the turn, as today. `DayResume` keeps its name for runs from before the
   change and calls `CapResume` with the day cap, which closes the
   cheapest-call gap above for every run.
5. `CapResume` resolves the task's open escalation alerts of its cap and
   records `cap_resumed` with the reason, as `DayResume` records
   `day_cap_resumed` for source `day_cap` today.
6. `RunSession` returns every cap refusal in `res.Capped`. At the month and
   the project cap it keeps `Outcome` at `OutcomeEscalate` and `Reason` as
   today, so a run from before the change reads the result as it always did:
   the code track's capped branch demands `OutcomeDayCap` (workflow.go:2009),
   and the planner track runs `RunPlan`, not `RunSession`. A run at the new
   version tests `res.Capped != nil` before its escalate branch and takes
   every cap down the day cap's path (workflow.go:2009 to 2016 and 2103). A
   month or project refusal at the session's first call (`Allowed` false)
   is no attempt, as the day's is, here and in the planner's count
   (plan.go:1909).
7. The attempt floor's month and project refusals wait like the day's.
   `DayCapped` becomes `CapDecision(why) (decision string, ok bool)` over the
   openings in `capRefusals`. The console's `unfundedAnswer`
   (actions.go:1196) takes an answer at any cap, as it does at the day cap
   today.
8. A healed run (workflow.go:1695, plan.go:1797) restores a month or project
   wait as it restores a day wait. `dayCapWait` becomes `capWait(events)`,
   which knows the three "resumes on its own" openings and computes the
   until from the escalation's time.

### B. A policy load wakes every cap wait

A raise must not wait for the hourly check.

1. Add the signal `SignalPolicyLoaded` ("policy_loaded").
2. The loader's `Loaded` hook (policy.go:82, wired to `configAlarm.Resolve`
   at main.go:117) also signals every task in status waiting-human whose
   last escalation `capWait` recognises. A new store read lists those tasks
   with their intake events, and `capWait(events)` picks the cap waits. The
   hook runs once per loaded head. If a signal fails, the head stays
   unsettled, and the loader tries again at its next poll. A signal to a
   workflow that has ended or does not exist (Temporal's NotFound) counts as
   delivered, so an ended card never holds a head unsettled.
3. The loader is built and booted at main.go:115 to 119, before the
   Temporal client exists (main.go:253), and `Boot` already runs `Loaded`.
   The wake is a field of its own on the loader, set after the client exists
   and before `Watch` starts. `Boot`'s first settle runs without it, which
   costs nothing: a restored wait checks at once (A3).
4. `capWait.add` wakes on the signal and arms its next check `policyTTL`
   out, by which time the gateway enforces the loaded version. The wait
   drains the channel when it starts, so a signal sent before the wait
   starts no check.

`imageReady` (toolpark.go:802) already ends a wait on a signal. The cap wait
copies its shape. The factory loaded 18 policy versions in the last 7 days,
and a card waits on a cap only in a stop like this one, so the signals add
a few history events per stop.

### C. No ask for a cap that no longer binds

`awaitCap` runs `CapResume` once before it asks. If the cap no longer binds,
the card asks nothing and goes on to its next attempt, whose floor runs as
always. #1353 would have started its next session at 23:51 with no question.
A refusal made inside the gateway's cache window still asks: `CapResume`
refuses while the version in force is younger than `policyTTL`, and the
wait's next check resumes the card.

### D. The question says what the card does

`monthCapQuestion` says that the card resumes on its own, and when:

- Ask: "The month cap of €544.00 is reached (€543.73 spent, 2026-10). The
  card resumes on its own when the cap is raised or on 2026-11-01 00:00 UTC.
  Raise it now?" The project's form names the project's file.
- Info: the line to change (`budget.month_eur` in policy.yaml, or in
  `projects/<name>.yaml`), and the open cap card when one exists.
- `QuestionFacts` gains the month's turn, which the facts read computes
  from the clock as it computes the month today.
- Choices: "Leave it waiting" first, then "Retry now", then "End the card".
  "Raised it — retry now" goes: a raise resumes the card by itself.

The fault 4 work on main (21ee41a2) added the cap and the spend to this
question. D keeps them and changes the promise and the choices only.

### E. The month alarm files a card at each cap it reaches

1. The 100 percent alert's fingerprint carries the cap: `2026-10/100/544`.
   The 50 and 80 percent alerts stay once a month, so a raise files no new
   early alerts.
2. `MonthAlarm.Check` closes its open cap card with a comment once the cap
   in force is above the card's `cap_eur` and the month's spend is below the
   new cap: "budget.month_eur is 600 in policy version 972: the cap card
   closes."

## Versioning

One new workflow version, change id "cap-wait", gates A1 to A3, A6 to A8,
B4 and C. A run from before the change keeps today's waits: its month and
project stops wait for a human with today's reason, and its day wait calls
`DayResume`. The existing
pair `AttemptFunded` and `SessionFunded` (activities.go:566 to 577) is the
precedent for an old activity kept for runs from before a version.
Activities change behaviour for every run, which replay allows, so the new
`DayResume` check and E apply at once. A6 only adds `res.Capped`, so an old
run reads `RunSession`'s result unchanged.

## Tests

Hand-derived, in the style of the existing day-cap tests:

1. The handover's test, at the card's level. A card waits at a month cap of
   544. The store raises month_eur to 600 and the loader settles the new
   head. The card starts its next session with no answer and no restart of
   any part, and its timeline holds `cap_resumed`.
2. #1353's case. A call is refused at 23:28 under a cap of 544. The session
   ends after the cap became 600. No question is asked, and the next attempt
   starts.
3. The UTC month turns during a month wait: the wait ends at 00:00 on the
   first.
4. A project cap. Raising `budget.month_eur` in the project's file ends the
   wait. Raising only the factory's month cap does not.
5. A day cap with 0.10 EUR free, a cheapest call of 0.02 EUR and a session
   floor of 0.60 EUR: the wait does not end. Today it ends and asks again.
6. The floor's month refusal waits on its own, and the console takes an
   answer at the month cap.
7. A healed run restores a month wait with its until.
8. A history recorded before "cap-wait", with a month stop, replays and
   waits for a human as before.
9. The month alarm. A cap reached at 544, raised to 600 and reached again
   files a second card, and the first card closes after the raise.
10. The cache window. Version 972 activated 10 seconds ago, and the session
    was refused at its first call under version 971. `CapResume` answers no,
    the card asks, and the check 30 seconds after the activation resumes it.
    No attempt runs in between.
11. A policy load while one waiting card's workflow has ended: the other
    cap waits get their signal, and the head settles.
12. A planner run from before "cap-wait" whose `RunPlan` result carries a
    month refusal replays with today's zero until and asks a human.

The gateway half of the handover's test exists: server_test.go:1639 pins
that a new policy version is in force within policyTTL.

## Alternatives considered

- **Make LiteLLM's max_budget follow the policy store.** LiteLLM 1.102.4
  cannot. `_global_proxy_budget_check` (litellm/proxy/auth/auth_checks.py)
  compares against `litellm.max_budget`, a process attribute that only
  `load_config` sets, at start. `/user/update` on the `litellm-proxy-budget`
  row changes nothing that check reads, and `max_budget` is not in
  `LITELLM_SETTINGS_SAFE_DB_OVERRIDES`. The backstop also played no part in
  this fault.
- **Remove the backstop.** It played no part in this fault. It guards
  against a gateway hold that fails open, so removing it is a security
  decision of its own. It stays.
- **Re-read the month line when a refusal would fire,** the register's fix
  direction. The gateway already reads policy within 30 seconds, so the
  change would do nothing.
- **Check month waits every 5 minutes, with no signal.** That writes up to
  8,900 checks a month into one run's history. An hourly check with no
  signal resumes a raise up to an hour late, longer than the 40 minutes
  #1352 lost.
- **Leave the cards to the chat agent.** The chat agent answered both cards
  at 00:11. That answer is the only way out the fault leaves.

## Corrections to the record

These ship in the same commit as this plan:

- docs/needed-fixes.md, fault 6: the title and the body name the fault this
  plan fixes, with the audit's figures. The status names this plan.
- docs/needed-fixes.md, fault 3: drop "and the frozen month cap" from the
  dig's finding.
- docs/plans/2026-11-02-unpayable-sessions.md: drop the fault 6 clause from
  the mechanism's point 4 and the out-of-scope bullet on fault 6. The floor
  passed at 19:50:59 because of gap 3's in-flight money. The month cap had
  €53.30 free.

## Out of scope

- The factory's roll hold on open plans. It did not hold this cap. Fault 11,
  the rename deadlock of the same night, is the case where a roll mattered.
- LiteLLM's backstop. `scripts/budget-backstop-check` keeps it at 1.25 times
  month_eur, and Flux applies a change within its 10-minute interval.
- Every month-capped card resumes at 00:00 UTC on the first, as every
  day-capped card does at the day's turn. Each still passes its floor first.

## Cost and risk

- One activity call per cap stop (C) and one per wake (B). One check an hour
  per month wait, at most 744 in a month.
- A card at the month cap now resumes with no answer when the month turns or
  the cap moves. A human raised the cap by a commit to the human-only
  configuration repository, and a new month's budget is one the policy
  already grants, so neither resume needs a second human step. The day cap
  works this way today.
- The risk is replay. A history from before "cap-wait" must replay
  unchanged, which tests 8 and 12 hold.
- A LiteLLM backstop set below the policy's month cap would refuse calls
  that `CapResume` reads as funded. The card would then ask again at each
  check, once an hour, which shows the fault on the board. Every model call
  of the factory fails in that state too, as on 13 to 15 October, and
  `scripts/budget-backstop-check` refuses such a pair at config-check.
