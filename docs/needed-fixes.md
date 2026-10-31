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
