# Needed fixes: faults found in the live factory

A standing register. Each entry names the fault, the evidence from the live
run, the fix direction and its status. Nothing here is implemented until
Sebastian says go. Updated as faults are found and as fixes land. A fault
whose fix lands on a code or infra main leaves the list, the remaining
faults are renumbered to stay contiguous, and the plan or spec that built
it keeps the record. Renumbered on 2026-11-02 to close the gaps the
departures left: 12 became 7, 14 became 8, 15 became 9, 16 became 10,
17 became 11. Older documents cite the numbering of their day, and the old
numbers 7 to 11, 13 and 18 to 20 in them name faults that have left. Gone
on 2026-11-01: the criteria-card family (the criteria card's brief, its
chat answer and
its draft state, attach_analysis, the file read's ranges, all on code main),
the compaction fold with thinking off (code 34b778bd, infra c53d5bb, the
served-window follow 91ec3b8a), the board's month meter (13d47231) and
the resumed card that died on a moved head (code ee585427, the
fix salvaged from #1408's branch by hand: the branch's flat copy of main
made its pull unmergeable, so 7b59efeb was rebased onto main directly).
The note press outlet that broke the screen grid: the outlet sat
as a fourth child of the screen's three-column grid, took the board's
column and pushed the board under the chat; it now shares the board's cell
(code b36ba3cb). The chain-run links that spoke the run's global id where
the forge's pages address the per-repo run number, so every /actions/runs
link read "resource does not exist" (card #1439, run 3356 against the
page of 2260): the run's number is now recorded beside the id with a
guard a numberless rerun cannot erase, old rows are backfilled, and the
board, the drawer and the facts link number with number (code a0e2803e,
docs/plan-run-link-index-2026-11-01.md). The card branch that
swallowed main as a flat copy left with its fix (code 576b8afb: the sync
lands as a merge, a diff over the card's line bound is refused by name,
the gate enforces the same bound), and the spec's other two fixes landed
the same day: a reply that cannot change anything stops asking (c1716385),
and a stop that names a decision offers that decision while a grant
carries its instruction (5dc22e59). The ask that repeated a
sentence and woke nobody left with its fix (code 59f8490b: the wake key
takes the ask's issue comment id, the sentence hash only as the
fallback).

## 1. The check-in's policy stop preempts the approval card

Status: plan written, awaiting Sebastian's OK
(checkin-policy-approval-plan-2026-10-31.md). Found 2026-10-31 on card
#1347. Verified unbuilt on main 2026-11-01: no change id
checkin-policy-verification anywhere.

A supervising agent stops a card with a bare "how should it go on?"
question one step before the card's own flow would show the proper approval
card with the brief, the numbers and the Approve button. The card sat 19
hours with nothing to decide from. The fix: close the agent's reason words
to a fixed set, and when the reason is a policy class and a pull request is
open, go to the checks that end in the approval card instead of stopping.

## 2. A flavoured confirmation never files, and the file tool lies about it

Status: plan written, awaiting Sebastian's OK
(handover-fault02-confirmation-and-file-tool-2026-11-01.md). Found
2026-10-31 on card #1345, cost about €2 in dead sessions before it was
caught. Verified unbuilt on main a0e2803e: confirmedByAnswers (plan.go:2061)
still demands the bare choice word.

Two defects that make one loop:

- The filing rule accepts a plan confirmation only when the answer is the
  bare choice word. Sebastian answered "okay — confirmed. Revision 15
  is ..." and the rule read it as not confirmed, so nothing filed. The
  answer sat recorded, no question open, no revision written: the only way
  out the factory offered was another planner session.
- The session agent's file tool answers "filing succeeded" while it filed
  nothing. Six sessions each believed they were done, ended, and changed
  nothing. A tool result that names a state the tool did not reach breaks
  the factory's own rule that every result names the real state and the
  fitting action.

Fix direction: the confirmation becomes a decision field with closed values,
written by the card's buttons and the chat tool's structured call, held by a
database check. No code parses prose for a decision: the words stay findings,
and where the chat must read them, its model sets the field. The file tool
names what its call reached: stored, and what the revision waits for. The
plan carries the details.

## 3. Sessions open that the task budget cannot pay for

Status: plan written, awaiting Sebastian's OK
(docs/plans/2026-11-02-unpayable-sessions.md). Found 2026-10-31 on card
#1345; four openings burned about €0.53 and filed nothing. Re-verified
unbuilt on main a0e2803e: the session floor (SessionFunded, every session's
start since 6c579a24 of 2026-10-16) predates the fault and did not stop the
four openings, and nothing since changes what a grant buys. The dig found
why: the plan loop opens sessions with no floor at all, and the floor that
ran read figures the gateway's holds had already
spent — the plan puts the floor at every opening and the enforced task
money on every surface.

The factory grants and opens planner sessions without checking that the
task's remaining budget covers a whole session opening. With €0.03 to €0.44
left, each session opened, spent what was left mid-call and died on a 402.
Every grant comment bought another dead opening. Fix direction: before a
session opens, compare the task's free headroom with the opening's cost;
when it cannot cover it, the ask asks for money, not a session. A smaller
sibling to verify: a session that dies mid-call left about €0.40 spent in
the gateway that the task row's spent amount never recorded.

## 4. Generic check-in stops carry no five parts

Status: plan written, awaiting Sebastian's OK
(five-part-stops-plan-2026-11-02.md). The check-in stops gained most of
the parts on main 2026-11-01: the spend guard's stop carries the findings
and the last review verdict (b58d8e86), a stop whose answer changed
nothing is not repeated and names its exits (c1716385), and a stop that
names a decision offers Extend, Overrule or Close while a grant carries
its instruction (5dc22e59). The part that stays open at a0e2803e: no
check-in template builds a recommendation, the concept's fifth part.

The stop that fault 1 surfaced shows the shape: a check-in stop renders a
generic question with no numbers, no recommendation and no fitting buttons.
Fault 1's fix removes the worst case. The remaining human stops still
deserve the five-part treatment the concept promises.

## 5. A review refused for money vanishes, and the plan cannot close

Status: plan written, awaiting Sebastian's OK
(refused-review-plan-2026-11-02.md). Found 2026-11-01 on plan #1345
(incident plan), card #1380. Verified unbuilt on main 2026-11-01.

The integration card's final model review was refused by the spent October
cap and left no trace a person can see: no session row, no review event, no
note on the approval card. The approval ask named only "risk class normal:
a human decides the merge", and the merge went through with no model review
at all. The hidden half: that review is also the only writer of the plan's
criteria verdict rows. With none written, the plan can never close, and the
close check files a gap ask that reads as "criteria not met" when the truth
is "criteria never judged". Fix direction: a review that does not run for
money must be named on the approval card and must hold the merge; and the
plan close must tell an empty verdict table (a plumbing failure, ask again
or re-run the review) from verdict rows that say unmet (a real gap).

## 6. A raised month cap does not end a card's month-cap wait

Status: plan written, awaiting Sebastian's OK
(docs/plans/2026-11-02-cap-waits-resume.md). Found 2026-11-01. Verified
unbuilt on main 21ee41a2: CapRefusal.until (monthcap.go:48) still gives a
month's cap no end of its own.

The enforcement moved with the raise. The gateway refused 20 calls with
refused_month_cap from 23:19 to 23:31 on 2026-10-31, all from its own hold
under policy version 971 (month_eur 544). Version 972 (month_eur 600)
activated at 23:31:02, and from 23:32 every call was allowed. LiteLLM's
proxy-wide max_budget played no part: it last refused a call on
2026-10-15. An earlier text of this entry blamed a gateway or proxy that
kept the old cap until a restart. The audit rows show neither.

The cards did not move. A month-cap stop waits for an answer only, while a
day-cap stop resumes on its own. #1352 asked "Raise the cap to let it
finish?" at 23:22 and waited until the chat agent answered at 00:11, 40
minutes after the raise. #1353's session ended at 23:51, after the raise,
and factoryd still asked to raise the cap, from a refusal of 23:28. The
question itself says "This card resumes once the cap moves", which the
workflow does not do. Fix direction: a month or project cap wait ends on its
own when the cap no longer binds or the UTC month turns, a policy load
wakes it, and no stop asks about a cap that no longer binds.

## 7. The planner dies on a big spec's read set

Status: plan written, awaiting Sebastian's OK
(planner-read-cut-plan-2026-11-02.md). The cap relief landed 2026-11-01
on infra main (18e7418: limits.context_tokens goes, premium's window
pinned at its real 128000), and the judgment the fault now rests on: the
window is a ceiling, not a cure — the deaths were flow deaths, reads
feeding compactions feeding the wall clock, and the chat's digest of
798ea748 never reaches a session. Found 2026-10-31 on card #1383: three
planner sessions in a row ended without filing a plan, each after
reading 20+ files against the 98K context max, twice on "opencode
serve: context canceled". Six sessions ran under a grant of three, then
the session cap closed the card, €3.54 of €5.00 sunk.

Fix direction: the session-side cut — a `digest(path, ask)` tool on the
factory-tools menu (one Small call through the chat's Digest wrapper,
the answer bounded, the file's bytes never enter the premium context;
its listing in the policy tree's three class stanzas is a human hand on
the infra side, code rolled first), the planGuide read discipline that
maps before reading and digests the big files, and the readsFinding
pointing the retry at digests instead of re-reads. Until it lands, a
big card needs a trimmed read set, the cheap rung, or the spec-on-card
shape that saved #1383.

## 8. The chat's answer tool failed twice on plan questions

Status: a fix landed on code main 2026-11-01 (05cd9e12), and whether it was
this failure is not proven. Found 2026-10-31 on card #1383 at 21:20. The
chat worked around it by posting the answers as issue comments, which the
planner reads.

What the fix changed: a chat tool with no parameters marshalled
"properties: null", which the model rejects with a 4xx, and the chat read
every 4xx as "The model could not be reached", so the call read as a failed
tool. The 4xx now names its refusal. Watch the next plan-question ask
before closing this.

## 9. A red-main revert card does not jump the queue

Status: the queue policy is unbuilt. The #1333 revert itself merged by hand
(pull 1332, 2026-11-01 02:42). Found 2026-10-31 on card #1333: "Revert
6b368fd: main red since 2026-10-30T03:30:07Z, no fix landed" sat open more
than a day while ten-plus pulls merged after it. Either main was red and
the merges rode a broken base, or the card was stale and nothing closed it.

Fix direction: a revert card for red main blocks the queue or jumps it.

## 10. No scripted door into the chat

Status: candidate only. Found 2026-10-31: the console's OAuth2 login works
end to end with curl (PKCE, grant, callback), and the trust gate then 403s
factory-admin, which is not a writer of the code repository. That is
correct by design (task 54), but it means no agent, script or CI can file a
chat turn or read the thread without a writer's session.

Fix direction: a service identity with read-only access to the project, or
a scoped chat API token.

## 11. A rename that changes the policy tree cannot land before its roll

Status: candidate only. The loader still rejects an unknown tool name
outright (policy.go:267). Found 2026-10-31: the ask tool's rename merged
into the code main (5a07d16c) and the infra tree (82ab246) while the
running factoryd knew only escalate_to_human, so the tree's tip sat
unloadable and the roller held the rename's roll on the open plans
#1344/#1345, whose cards needed the spend the month cap had stopped. A
three-way deadlock. Only the manual name revert (infra bed2930) broke it.

Fix direction: the config loader accepts the union of the old and the new
name across a rename, or the roll that carries a rename commits the tree's
rename with it, so the tree never names a tool no factoryd knows.


## 12. The size gate moves a card's budget with no event

Status: candidate only. Found 2026-11-02 while digging fault 3 on card
#1345: the task's budget read 5.60 EUR after its only fund event (+0.60 at
00:06) and 7.60 by the evening's end, the +2.00 written by the size gate's
budget writer (SetTaskSizeBudget, store.go:1358) with no card_funded or
other event, so the evening's true headroom had to be reconstructed from
the ledger. A budget that moves silently leaves no line a person or a dig
can read.

Fix direction: the size gate's budget move records an event, as the fund
and raise paths do.

## 12. A queue sweep started a half-filed card

Status: the fix landed on code main 2026-11-02 (c78869b2) and rides the
next factoryd roll. Found 2026-11-01 at 20:16 on card #1451 (task
t-3bfcd4cd4e2a): the plan filer writes a card's row queued with no issue,
files the Forgejo issue, then links it, about a second end to end. The
heal pass's sweep listed the row inside that window and started it, and
EnsureIssue, the workflow's first activity, terminal-failed the card for
having no linked issue. The only such failure the events table holds.

The fix: the queue list skips rows with no issue and the work bound
declines them without failing, so a half-made card holds no slot until
its issue is filed and the next sweep starts it. No new status and no
board column: the card was never shown half made, only started half
made. EnsureIssue stays as the tripwire for a card that lost its issue
for good.

## 13. A failed card froze every card that waited on it

Status: the fix landed on code main 2026-11-02 (c78869b2) and rides the
next factoryd roll; the first sweep after the roll unsticks the live
board (#1452, #1453, #1454). Found 2026-11-01: a dependency counts as
met only when its card is done, or ended closed. A failed card is
neither, so #1452, waiting on the failed #1451, sat queued forever, with
#1453 behind it and #1454, #1414 and #1441 behind that. Nothing wakes a
queued dependent, no alert fired, and the retry the dependency code
waits for is not built.

The fix: when a card fails with a card still live waiting on it, at its
end and in a sweep each minute, factoryd sends it back to its plan's
planner through the existing replan, once per card (an "impasse" marker
on its timeline). The waiting cards of the plan wait on the plan, the
planner files its next revision, and the dead work is replanned without
asking first. A plan that can take no replan, closed or mid revert,
refuses, and the refusal lands as a comment on the failed card's issue
naming the state and the fitting action.
