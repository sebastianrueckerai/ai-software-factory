# Needed fixes: faults found in the live factory

A standing register. Each entry names the fault, the evidence from the live
run, the fix direction and its status. Nothing here is implemented until
Sebastian says go. Updated as faults are found and as fixes land. A fault
whose fix lands on a code or infra main leaves the list, the remaining
faults are renumbered to stay contiguous, and the plan or spec that built
it keeps the record. Renumbered on 2026-11-02 to close the gaps the
departures left: 12 became 7, 14 became 8, 15 became 9, 16 became 10,
17 became 11. Renumbered again the same day when fault 4 left: 5 to 15
became 4 to 14, when fault 2 left: 3 to 14 became 2 to 13, and twice when
fault 3 left: 4 to 13 became 3 to 12, then 4 to 12 became 3 to 11. Older
documents cite the numbering of their day, and the old
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
fallback). Gone on 2026-11-02: the generic stops that carried no numbers
and no recommendation (code 21ee41a2,
docs/five-part-stops-plan-2026-11-02.md). The check-in spend stops show
the card's spend against its budget and its check-in share, say what Go on
buys, and recommend going on when the last review approved the head. The
session cap names its cap and the grants and keeps the stop's work state,
the month cap names the month's spend and cap, the budget stop recommends
the raise when the card holds a pull request, and the plain check-in stop
shows the card's spend against its session cap. The flavoured confirmation
that never filed left the same day with the file tool that said filed (code
ed3d5f40 and 2531bae7, docs/confirmation-decision-plan-2026-11-02.md): the confirmation is
a decision field, confirm or revise, set by the card's Confirm and Request
changes and by the chat's answer tool and held by database checks. Only a
confirm fixes the spec and the criteria. The file tool says a stored plan is
the session's answer and whether the human's confirmation still waits on its
cards. The review refused for money that vanished, and the plan that could
not close, left the same day (code a62ef21d to 0310f028,
docs/refused-review-plan-2026-11-02.md). The merge ask names a review that
did not run, with what lifts its refusal. The merge of a plan's integration
card holds while a criterion has no verdict row, and the press runs the
review again first. The plan close files a criteria-never-judged ask apart
from the gap ask for criteria unmet. That ask offers waive, confirm and deny
but no review: the gateway takes no hold of a finished card, so who pays for
that review is a later plan's. The raised month cap that did not end a card's
month-cap wait left the same day (code 0bbfe484,
docs/plans/2026-11-02-cap-waits-resume.md). A stop at the month cap or a
project's month cap now waits as a day-cap stop does. It resumes once the cap
no longer binds or the UTC month turns, or sooner on an answer. A policy load
wakes every cap wait, and a refusal that the version in force already lifted
asks nothing. The month alarm files a cap card at each cap it reaches and
closes the card a raise lifted, and the stop's question says that the card
resumes on its own and when.

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

## 2. Sessions open that the task budget cannot pay for

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

## 3. The planner dies on a big spec's read set

Status: code landed (448048b0, 2026-11-02), the tree hand waits. The
`digest` tool, the planGuide read discipline and the reads finding are on
code main. No session sees the tool until the policy tree's coder,
analyzer and planner stanzas list `digest: {}`, a commit on the infra
side after the roll that carries 448048b0
(digest-tree-hand-runbook-2026-11-02.md). The fault leaves the list when
the tree lands and a session sees the tool. The compaction-model probe
found no model key in opencode 1.18.32's compaction block, so
compaction stays on the session's own model. Plan:
planner-read-cut-plan-2026-11-02.md. The cap relief landed 2026-11-01
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

## 4. The chat's answer tool failed twice on plan questions

Status: a fix landed on code main 2026-11-01 (05cd9e12), and whether it was
this failure is not proven. Found 2026-10-31 on card #1383 at 21:20. The
chat worked around it by posting the answers as issue comments, which the
planner reads.

What the fix changed: a chat tool with no parameters marshalled
"properties: null", which the model rejects with a 4xx, and the chat read
every 4xx as "The model could not be reached", so the call read as a failed
tool. The 4xx now names its refusal. Watch the next plan-question ask
before closing this.

## 5. An ended card's issue stays open, and both red-main remedies can land

Status: plan written, awaiting Sebastian's OK
(docs/red-main-revert-plan-2026-11-02.md). Found 2026-10-31 on card #1333
("Revert 6b368fd: main red since 2026-10-30T03:30:07Z, no fix landed"),
filed as "a red-main revert card does not jump the queue". The check on
2026-11-02 shows that the queue did its job: the revert merged on its own
at 2026-10-30 05:34 UTC, 4 minutes after its filing, and all 47 push runs
of main after it to 2026-11-01 03:00 ended green. The card looked stuck
because its issue never closed.

Two faults stand. The issue of an ended card stays open on three paths:
a card that factoryd filed around its own pull request and that ends done
(#1157, #1333), a card that ends closed while its issue has open
dependencies, which Forgejo refuses to close with 412 (10 plan-dropped
cards), and a closed plan (all 15 in the code repository). Both remedies
of a red main can land: on 2026-10-20 the fix-forward card #1154 and the
revert #1157 merged 2 seconds apart, and the revert put three stray log
files back on main.

Fix direction: a red main gets one automatic remedy at a time, the
revert's filing ends the fix-forward card, a human decides when the
remedy merges and main stays red, a green main ends the remedy that did
not merge, and every card that ends done or closed, and every closed
plan, closes its issue.

## 6. No scripted door into the chat

Status: plan written, awaiting Sebastian's OK
(docs/chat-door-design-2026-11-02.md, docs/plans/2026-11-02-chat-door.md).
Found 2026-10-31: the console's OAuth2 login works
end to end with curl (PKCE, grant, callback), and the trust gate then 403s
factory-admin, which is not a writer of the code repository. That is
correct by design (task 54), but it means no agent, script or CI can file a
chat turn or read the thread without a writer's session.

Fix direction, by Sebastian's four decisions of 2026-11-02: a chat token
that a human makes in the console for one project. It acts as that human,
with all their rights in the chat, approvals included, and every row it
causes names the token. It reaches the chat only (send, read, Do it),
through an MCP endpoint on the console. The human's own Forgejo access
token stands behind it, sealed in factoryd, because a merge approval is a
review under the approver's own Forgejo name.

## 7. A rename that changes the policy tree cannot land before its roll

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


## 8. The size gate moves a card's budget with no event

Status: candidate only. Found 2026-11-02 while digging fault 2 on card
#1345: the task's budget read 5.60 EUR after its only fund event (+0.60 at
00:06) and 7.60 by the evening's end, the +2.00 written by the size gate's
budget writer (SetTaskSizeBudget, store.go:1358) with no card_funded or
other event, so the evening's true headroom had to be reconstructed from
the ledger. A budget that moves silently leaves no line a person or a dig
can read.

Fix direction: the size gate's budget move records an event, as the fund
and raise paths do.

## 9. A queue sweep started a half-filed card

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

## 10. A failed card froze every card that waited on it

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

## 11. A wake turn kept a human's messages unread

Status: the fix landed on code main 2026-11-02 (120a12d9) and rides the
next factoryd roll. Found 2026-11-02: Sebastian saw the chat stop reading
new messages while a timer the agent set was due, and the code confirmed
it.

A wake (a timer, a watched card, an ask or the roadmap pull) stores its
note queued behind the thread's turn in flight. A message sent after it
parked behind the wake's place. The turn in flight took a joining message
only from the head of the line, so it never read that message, and the
human waited first for the wake turn, then for a turn of their own. Three
faults sat on the same path:

- A queued message that another turn had already read still started its
  own model turn, which answered it a second time.
- A turn that failed after reading joined messages left them marked read,
  and nothing answered them.
- The Waker ran each wake turn inside its pass, so a wake turn minutes
  long held the wakes and timers of every other project.

The fix: a listening turn takes a message from any place in the line.
Landing a queued row says whether this caller landed it, and a message or
a wake note that another turn read starts no turn. A failed turn puts the
rows it read back to the queue, and one quiet retry turn answers them. A
failed retry starts no further one. Each wake turn runs on its own
goroutine, one per project at a time.
