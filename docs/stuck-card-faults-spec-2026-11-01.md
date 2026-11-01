# The stuck-card faults: three fixes that keep a dead card from looping, 2026-11-01

From the death of card #1396 (task `t-ab4be8e03ffc`, pull #1408). The
moved-head adoption that card carried is fixed on code main (`ee585427`,
salvaged from the branch by hand the same day; the branch itself closed
stale). Three faults remain. Each turned a card that could not finish
into a card that would not stop asking. Nothing below is built; each
section names where a fix lands.

## 1. A card branch never swallows main wholesale

What goes wrong today. A card branch should hold one card's work. On
#1396 the session's sandbox carried an old copy of main (`13d47231`,
about 25 commits behind), and the sync that brought main's newer state in
landed as one flat commit (`e91ada1e`, 101 files, +7205/−247): no merge
ancestry, so git counts main's own work as the branch's additions. The
pull then read 9282 changed lines against the card's 1000-line bound, its
four chat migrations clashed with main's own copies (all four exist on
main), and Forgejo reported `mergeable=false`. No card limits could admit
it, the review demanded a split, and the card spent €9 and a day before
closing stale. Its real fix was three files (`7b59efeb`, +155/−4).

The fix, two halves:

- The worker brings main's newer state into a branch only by merge or
  rebase, never a flat copy of files. Git then sees the shared history
  and the pull counts only the card's own lines.
- A guard at push time: a branch whose own diff against its merge base
  exceeds the card's line bound several times over stops before the pull
  opens, with a named error that says what the sync mistake looks like.

Where it lands: the agent worker's git steps (merge/rebase discipline)
and the push path (the bound guard). Trace first: whether the session or
the worker harness performed the flat copy (`e91ada1e`'s author is
factory-agent; the harness's sync step has not been read).

## 2. A reply that cannot change anything stops asking

What goes wrong today. Every reply on a stopped card starts a new
attempt, and nothing counts repetitions. On #1396 five replies between
12:17 and 13:50 UTC on 2026-11-01 each produced the same stop: three were
the spend guard's fabricated "the check-in's share of the budget is
spent" (the guard stops the attempt before any judgment runs,
internal/factoryd/runner.go:1100), one asked for money (0.368 EUR of the
9.000 EUR budget remained, a session floor costs 0.600), and the last
real check-in at 13:47:46 named the true deadlock: session 4 of 4, 9282
lines against the 1000-line bound, and two owner exits no reply could
execute. The card would have asked forever.

The fix: when an answer arrives and neither the code (the head) nor the
limits (cap, bound, budget) changed since the last stop, the card does
not repeat that stop. It asks a different question, or states plainly
that no reply can change this and names the exits. The parked spec
([checkin-grant-loop-spec-2026-10-31.md](checkin-grant-loop-spec-2026-10-31.md))
fix 1 is this guard; its other two fixes (no merge request on red checks,
grants carry instruction) belong with it.

Where it lands: factoryd's answer path (internal/factoryd/workflow.go,
the answer-verify and grant branches).

## 3. A stop that names a decision offers that decision

What goes wrong today. The 13:47:46 stop correctly said only the owner
can "extend the card to restructure and re-merge, or overrule the review
and merge as-is", but the card offered no control for either; every reply
fell back into the attempt machinery and bounced. And the stops that led
there hid the work: the spend guard's stop carries spend numbers only
(QuestionFacts has no field for a review or any work state), so a card
whose review had refused the merge asked only for money.

The fix: a stop that names an owner decision carries it as a form on the
card: Extend with the limit fields filled (session cap, line bound,
budget), Overrule, Close. A fabricated spend stop carries the work state
its ask already holds (the findings and the last review verdict; the
session-cap stop already carries findings, internal/factoryd/workflow.go).
The needs-you draft
([needs-you-analysis-2026-11-01.md](../needs-you-analysis-2026-11-01.md),
ready to file) covers this family: complaint 3 (the check-in names the
core issue), complaint 6 (every ask carries a recommendation) and
complaint 7 (context on every ask).

Where it lands: the stop templates (internal/factoryd/question.go and
QuestionFacts) and the card face (internal/console board rendering, the
stop's exit forms).

Two face faults ride with this fix: the board shows the newest checks
step from an earlier pass as if current (#1396 wore "5/5 checks" while
its cycle never reached checks), and the gate clock restarts on every
retry, so "under a minute" measured the last restart, not progress. The
face should tie the checks to the head it judged and show the attempt
count.

## Status

None of the three is built; none is on main (checked 2026-11-01 at
`fe4f36fb`). The incident's fourth fault, the moved-head death, is fixed
on main `ee585427` and reaches the cluster with the next roll.
