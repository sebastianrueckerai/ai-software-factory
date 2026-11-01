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

Status: built 2026-11-01 on the code repo's main. Found 2026-11-01 on
approval 1005 of plan #1345.

The gap ask's console card renders a brief error ("kind 'criteria' carries
no brief") instead of the five parts: which criteria, what state each is in,
what granting costs, what waiving means. The decision is left to a card
that shows nothing. The mark is permanent, too: the brief sweep skips rows
it has once marked failed, so a criteria card never heals even after the
writer learns the kind. Fix direction: give the criteria approval a brief
built from the plan's criteria and their missing verdict rows, and retry
the rows already marked.

## 8. The criteria gap approval is console-only

Status: built 2026-11-01 on the code repo's main, from the parked spec
(planfilingfact-and-criteria-closeout-spec-2026-10-31.md, pieces 2 and 3,
widened 2026-11-01). Found 2026-11-01 on plan #1345, approval 1005.

Every other ask that reaches a human is answerable from the chat: the chat
agent holds answer tools for questions, merges, checks. The criteria gap
approval has none, so the one actor awake at 03:00 cannot close the plan.
The 00:19 to 00:30 close-out ran the failure whole: locked out of the
request, the chat opened a second ask about it and handed Sebastian five
reason lines to retype into the console himself. The kind is invisible to
the chat besides: the poke path escalates merge and plan only, and the
access table carries no criteria row a chat tool could sit behind. The
parked spec's answer, widened with the run's evidence: the request's whole
answer surface (waive with a reason, approve the grant, confirm the
delivered children) is answerable from the chat on the human's word, the
human the decider of record, and the card ends.

## 9. The gap card loses the typed reasons, and its close is a guess

Status: built 2026-11-01 on the code repo's main. Found 2026-11-01 on
approval 1005 of plan #1345.

Each criterion's Waive is its own form, and the press re-renders the whole
board from server state, so the reasons typed into the sibling forms
vanish with the first submit. The board's find field carries the preserve
attribute that saves it across a swap; the waive inputs carry none, and no
typed field on the board is safe from any action. The close is guessed
too: nothing on the card says that every criterion met or waived ends the
request on the next sweep with no final press, so the chat advised
pressing Approve to submit the waivers, and the record gained an approved
grant (one more bounded card) with no criterion left open, a card nobody
drafted and a toast that miscounts. Fix direction: typed text on the
board is draft state and survives any swap; the card names its closing
rule; the grant is offered only while a criterion is open; the store
refuses to waive a criterion already met, which a stale board offers
today.

## 10. attach_analysis cannot reach an approval ask, and its refusal points at the wrong one

Status: built 2026-11-01 on the code repo's main. Found 2026-11-01 on
card #1345, during the 1005 close-out.

The tool attaches findings to the newest question asked on a card and to
nothing else. The one ask that needed the findings, the open criteria
request, is out of reach by construction, and the refusal that came back
("The ask of #1345 is answered by sebastian. An ask already answered is
done.") named the card, not the ask it had examined: an already-answered
question, not the open request. The chat read that as the decision
existing somewhere, spent its calls hunting a decision that was never
made, then opened a fresh ask instead. Fix direction: the tool addresses
an open ask by identity across both families, question and approval, and
a refusal names the ask, its kind and its state.

## 11. The chat's file tool cannot read past 64 KiB

Status: built 2026-11-01 on the code repo's main. Found 2026-11-01
reading main's store.go (111 KB) for the 1005 close-out.

The file tool serves the first 64 KiB and appends a cut note, and takes
no range, so the chat read FundCard's merged wording out of other agents'
session transcripts instead: three tools deep to see one function's
comment on main. Fix direction: the tool takes a range (a start line and
a count) and its cut names the range that continues the read.
