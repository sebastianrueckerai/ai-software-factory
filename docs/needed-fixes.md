# Needed fixes: faults found in the live factory

A standing register. Each entry names the fault, the evidence from the live
run, the fix direction and its status. Nothing here is implemented until
Sebastian says go. Updated as faults are found and as fixes land.

## 1. The check-in's policy stop preempts the approval card

Status: plan written, awaiting Sebastian's OK
(checkin-policy-approval-plan-2026-10-31.md). Found 2026-10-31 on card
#1347.

A supervising agent stops a card with a bare "how should it go on?"
question one step before the card's own flow would show the proper approval
card with the brief, the numbers and the Approve button. The card sat 19
hours with nothing to decide from. The fix: close the agent's reason words
to a fixed set, and when the reason is a policy class and a pull request is
open, go to the checks that end in the approval card instead of stopping.

## 2. A flavoured confirmation never files, and the file tool lies about it

Status: plan wanted. Found 2026-10-31 on card #1345, cost about €2 in dead
sessions before it was caught.

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

Fix direction: a confirmation whose answer begins with the choice word, or
carries it as its own word, confirms; everything else still goes to the
planner. The file tool reports what actually happened: which revision it
wrote, which cards exist after the call, and when it cannot file, why and
what can. A session that ends with no new revision and no filed cards must
not read as success.

## 3. Sessions open that the task budget cannot pay for

Status: plan wanted. Found 2026-10-31 on card #1345; four openings burned
about €0.53 and filed nothing.

The factory grants and opens planner sessions without checking that the
task's remaining budget covers a whole session opening. With €0.03 to €0.44
left, each session opened, spent what was left mid-call and died on a 402.
Every grant comment bought another dead opening. Fix direction: before a
session opens, compare the task's free headroom with the opening's cost;
when it cannot cover it, the ask asks for money, not a session. A smaller
sibling to verify: a session that dies mid-call left about €0.40 spent in
the gateway that the task row's spent amount never recorded.

## 4. Generic check-in stops carry no five parts

Status: noted, part of the question-format contract's unfinished tail work
(question-format-concept-2026-10-17.md).

The stop that fault 1 surfaced shows the shape: a check-in stop renders a
generic question with no numbers, no recommendation and no fitting buttons.
Fault 1's fix removes the worst case. The remaining human stops still
deserve the five-part treatment the concept promises.

## 5. A review refused for money vanishes, and the plan cannot close

Status: plan wanted. Found 2026-11-01 on plan #1345 (incident plan),
card #1380.

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

## 6. A raised month cap takes effect only on a roll, which the spent cap blocks

Status: plan wanted. Found 2026-11-01 on the gateway of the live cluster.

The cap raise to €600 landed in policy version 974 at 23:35 and factoryd's
own loader activated it within seconds, but the enforcing gateway kept
refusing calls against the €544 of version 971 it loaded at boot. Only a
pod restart applies it, and a restart comes only with a roll, and the roll
is held while a plan is open on main, and the plan's cards need the money
the raise would free. The loop closes only through the six-hour production
hold ask. Fix direction: the enforcing gateway must follow the same policy
watch factoryd uses, or re-read the month line when a refusal would fire.

## 7. The criteria gap approval carries no brief

Status: plan wanted. Found 2026-11-01 on approval 1005 of plan #1345.

The gap ask's console card renders a brief error ("kind 'criteria' carries
no brief") instead of the five parts: which criteria, what state each is in,
what granting costs, what waiving means. The decision is left to a card
that shows nothing. Fix direction: give the criteria approval a brief built
from the plan's criteria and their missing verdict rows.

## 8. The criteria gap approval is console-only

Status: parked spec by Sebastian
(planfilingfact-and-criteria-closeout-spec-2026-10-31.md, piece 2). Found
2026-11-01 on plan #1345.

Every other ask that reaches a human is answerable from the chat: the chat
agent holds answer tools for questions, merges, checks. The criteria gap
approval has none, so the one actor awake at 03:00 cannot close the plan.
The parked spec's answer: on a plan whose children are all done and
merged, the pending criteria request takes the member's confirmation that
the delivered children satisfy the criteria, and the card ends.
