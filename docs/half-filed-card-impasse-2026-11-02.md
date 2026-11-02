# The half-filed card and the impasse, 2026-11-02

The fix for the stuck board of 2026-11-01 (register faults 12 and 13),
landed on code main in c78869b2. Two faults, one chain: card #1451
failed a second after its creation, and the three cards behind it
froze.

## What happened

A plan files a card in four steps: the row (queued, no issue), the
Forgejo issue, the labels, the link. At 20:16:42 the filer wrote #1451's
row; at 20:16:43 the heal pass's sweep listed it and started it; at
20:16:43 the issue was linked, too late. EnsureIssue, the workflow's
first activity, terminal-failed the card at 20:16:44: no linked issue.
The admitted_at stamp proves a bound admission started it, not the
issue webhook: the bound admits only bound cards, and the webhook path
ignores unlinked bot issues.

The failure then froze the board. A dependency counts as met only when
its card is done, or ended closed. A failed card is neither, so #1452,
queued on #1451, never started, and #1453 behind it, and #1454, #1414
and #1441 behind that. Nothing wakes a queued dependent when a
dependency fails, no alert fired, and the retry the dependency code
waits for is not built. The design assumed a person would retry the
card; nothing asked the person to.

## The fix

Two guards close the race (fault 12). The queue list
(ListQueuedByRepository) skips rows with no issue, so a sweep cannot see
a half-filed card, and the work bound (admit) declines one that slips
through, without failing it. The card holds no slot until its issue is
filed; the next sweep a minute later starts it. EnsureIssue stays as it
is: a card that reaches its workflow with no issue is an orphan, and a
terminal failure is the right answer to that.

The impasse clears the freeze (fault 13). When a card fails and a card
still live waits on it, factoryd sends the failed card back to its
plan's planner through the existing replan machinery (ReplanChild): the
waiting cards of the plan wait on the plan, the plan reopens queued,
the planner files its next revision. Two triggers, one path: the card's
own end (FinishTask, after taskEnded) and a sweep each minute beside
the criteria pass. Once per card, marked by an "impasse" step on its
timeline; a card that belongs to no plan, or whose plan can take no
replan, gets one comment on its issue naming the state and the fitting
action instead. The marker is written only after the send decided, so
a transient error retries on the next sweep and a refusal never
repeats.

Two decisions shape it, both Sebastian's: the replan fires without
asking first (a stuck board is worse than a planner woken once), and
half-made cards are kept out of the queue rather than shown in a board
column (they were never shown, only started).

## Verified and not

`go test -race ./...` green and `bash check static` clean on c78869b2,
with five new tests: the bound leaves a half-filed card and starts it
once its issue is filed; the impasse sends a dead card to its planner,
fires once per card, leaves a lone failure alone, and its refusal
comments once naming the state. Not verified: the cluster's behavior,
which changes only when factoryd rolls; the first sweep after that roll
is what unsticks the live board (#1451's plan reopens and replans
#1452's work).
