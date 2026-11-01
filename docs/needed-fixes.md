# Needed fixes: faults found in the live factory

A standing register. Each entry names the fault, the evidence from the live
run, the fix direction and its status. Nothing here is implemented until
Sebastian says go. Updated as faults are found and as fixes land. A fault
whose fix lands on a code or infra main leaves the list, its number stays
retired, and the plan or spec that built it keeps the record. Gone on
2026-11-01: faults 7 to 11 (the criteria card's brief, its chat answer and
its draft state, attach_analysis, the file read's ranges, all on code main),
the compaction fold with thinking off (code 34b778bd, infra c53d5bb, the
served-window follow 91ec3b8a), the board's month meter (13d47231) and
fault 13, the resumed card that died on a moved head (code ee585427, the
fix salvaged from #1408's branch by hand: the branch's flat copy of main
made its pull unmergeable, so 7b59efeb was rebased onto main directly).
Fault 19, the note press outlet that broke the screen grid: the outlet sat
as a fourth child of the screen's three-column grid, took the board's
column and pushed the board under the chat; it now shares the board's cell
(code b36ba3cb).

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

Status: plan wanted. Found 2026-10-31 on card #1345, cost about €2 in dead
sessions before it was caught. Verified unbuilt on main 2026-11-01:
confirmedByAnswers (plan.go:2052) still demands the bare choice word.

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
about €0.53 and filed nothing. Verified unbuilt on main 2026-11-01: no
opening-cost check anywhere in the grant path.

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
card #1380. Verified unbuilt on main 2026-11-01.

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
Verified unbuilt on main 2026-11-01: the gateway still reads its policy at
boot, no watch, no re-read on refusal.

The cap raise to €600 landed in policy version 974 at 23:35 and factoryd's
own loader activated it within seconds, but the enforcing gateway kept
refusing calls against the €544 of version 971 it loaded at boot. Only a
pod restart applies it, and a restart comes only with a roll, and the roll
is held while a plan is open on main, and the plan's cards need the money
the raise would free. The loop closes only through the six-hour production
hold ask. Fix direction: the enforcing gateway must follow the same policy
watch factoryd uses, or re-read the month line when a refusal would fire.

## 12. The planner dies on a big spec's read set

Status: the cap relief landed 2026-11-01 on infra main (18e7418:
limits.context_tokens goes, premium's window pinned at its real 128000).
The structural fix, phase 2's digest and ask reads, is still unfiled since
#1383 closed. Found 2026-10-31 on card #1383: three planner sessions in a
row ended without filing a plan, each after reading 20+ files against the
98K context max, twice on "opencode serve: context canceled". Six sessions
ran under a grant of three, then the session cap closed the card, €3.54 of
€5.00 sunk.

Fix direction: file phase 2, the digest and the ask reads. Until it lands,
a big card needs a trimmed read set, the cheap rung, or the spec-on-card
shape that saved #1383.

## 14. The chat's answer tool failed twice on plan questions

Status: a fix landed on code main 2026-11-01 (05cd9e12), and whether it was
this failure is not proven. Found 2026-10-31 on card #1383 at 21:20. The
chat worked around it by posting the answers as issue comments, which the
planner reads.

What the fix changed: a chat tool with no parameters marshalled
"properties: null", which the model rejects with a 4xx, and the chat read
every 4xx as "The model could not be reached", so the call read as a failed
tool. The 4xx now names its refusal. Watch the next plan-question ask
before closing this.

## 15. A red-main revert card does not jump the queue

Status: the queue policy is unbuilt. The #1333 revert itself merged by hand
(pull 1332, 2026-11-01 02:42). Found 2026-10-31 on card #1333: "Revert
6b368fd: main red since 2026-10-30T03:30:07Z, no fix landed" sat open more
than a day while ten-plus pulls merged after it. Either main was red and
the merges rode a broken base, or the card was stale and nothing closed it.

Fix direction: a revert card for red main blocks the queue or jumps it.

## 16. No scripted door into the chat

Status: candidate only. Found 2026-10-31: the console's OAuth2 login works
end to end with curl (PKCE, grant, callback), and the trust gate then 403s
factory-admin, which is not a writer of the code repository. That is
correct by design (task 54), but it means no agent, script or CI can file a
chat turn or read the thread without a writer's session.

Fix direction: a service identity with read-only access to the project, or
a scoped chat API token.

## 17. A rename that changes the policy tree cannot land before its roll

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

## 18. A card branch swallows main as a flat copy

Status: the fix landed on code main 2026-11-01 (576b8afb: the sync lands
as a merge, a diff over the card's line bound is refused by name before
the pull opens, and the gate enforces the same bound), built as fix 1 of
[stuck-card-faults-spec-2026-11-01.md](stuck-card-faults-spec-2026-11-01.md).
Found 2026-11-01 on #1396: the branch synced
main's newer state as one flat commit (e91ada1e, 101 files, +7205/−247, no
merge ancestry), so git counted main's own work as the branch's additions.
Pull #1408 read 9282 changed lines against the card's 1000-line bound, its
four chat migrations clashed with main's own copies, and Forgejo reported
mergeable=false. The card closed stale at €9 spent; its fix was three
files (+155/−4).

Fix direction: the worker brings main into a branch only by merge or
rebase, and a push whose own diff exceeds the card's line bound several
times over stops before the pull opens, with a named error.

## 20. An ask that repeats a sentence wakes nobody

Status: the fix landed on code main 2026-11-01 (59f8490b: the wake key
takes the ask's issue comment id, the sentence hash only as the fallback),
built as the plan's fault 4
([unseen-ask-plan-2026-11-01.md](unseen-ask-plan-2026-11-01.md)). Found
2026-11-01 on card
#1427: two asks 5 minutes apart carried the same sentence, so the wake
loop's dedup key ("ask:" plus the task id plus the sha256 of the
sentence) read the second, unanswered ask as the first, answered one. The
chat never woke, and the card sat in waiting-human behind a green checks
badge until a human looked by hand.

The dedup's purpose is delivery idempotence, one wake per ask when an
event batch is reprocessed. Fix direction: the key takes the ask's own
identity, the issue comment id, and falls back to the sentence hash only
when the ask carries no comment. A new ask then always wakes the chat,
however it is worded.
