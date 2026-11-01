# Parked card spec: the check-in grant loop (no-instruction restarts on red checks)

Filed 2026-10-31 after the #1381 incident. Observed cycle, from the card's history and this chat's record:

- 22:25 — #1381's check-in asks "may it go on?" (share spent, €0.66 of €0.40).
- 22:29 — the member presses grant. The press carries no instruction.
- 22:30 — the restart re-runs the gates on UNCHANGED code; a pending merge request opens with red_checks: true (one test failing at 241s).
- 22:30 — the factory refuses the merge approval on that request ("checks were red when its request opened"), and the request must be manually denied with request_changes.
- 22:31 — denied. The attempt ends, the share is still spent, so:
- 22:34 — the check-in asks the SAME question again. Each press of grant repeats the cycle. Two full turns were observed before the project agent broke it with an instruction-bearing answer.

The trap: a grant is meant to buy more WORK, but when the remaining work is a code fix and the grant carries no direction, the restart has nothing to do but re-run gates on the same commit. Nothing in the loop counts repetitions, and nothing requires the state to have changed between grants.

## The three fixes (cheapest first, all additive)

1. **Loop guard in the check-in.** When a check-in would ask "may it go on" again and the card's head commit is unchanged since the previous grant ended, do not ask the same question. Ask a different one ("the restart produced no new commit — what should the agent do?") or fail the attempt with an honest report. Site: the supervisor's check-in path in internal/factoryd (the ask at the attempt's end). Test: pin that a second consecutive ask names the unchanged commit.

2. **No merge request on red checks.** The factory already knows a request's checks were red at open (it refuses approval with that fact). Opening it anyway manufactures a human decision (deny) per cycle. Change: when the head's checks are red, auto-return to the agent without opening a pending request; the agent gets the CI failure directly. Site: the pending-merge-request opening path in internal/factoryd. Test: a red-checks head produces no pending request, the agent is returned the CI failure instead.

3. **Grants carry instruction.** The console's grant press (and the project agent's grant path) accepts and routes a one-line instruction, defaulting to showing the previous denial's note. A bare grant on a card whose last event was a denial re-offers that denial text. Site: internal/console (the ask's choices) and the answer/grant plumbing in internal/factoryd. Test: a grant with instruction reaches the session; a bare grant after a denial surfaces the denial note in the ask.

Fix 1 alone stops the observed loop. Fix 2 removes the manufactured denials. Fix 3 makes the human's press as good as the project agent's answer.

## Non-goals

No change to the budget rules themselves, no change to gate order, no new columns. The card is small: one guard, one branch, one routing field, each with its pinned test. go test -race ./... green.

File when intake reopens, cheap rung. Order of parked filings: phase-2 refile (closed #1383's objective), PlanFilingFact fix, human-not-member card, then this.

## Status

All three landed on code main 2026-11-01, so the filing line above is
moot. The loop guard and the instruction-bearing grant came with
[stuck-card-faults-spec-2026-11-01.md](stuck-card-faults-spec-2026-11-01.md)
(`576b8afb`: the deadlock question; `5dc22e59`: the stop offers Extend,
Overrule, Close, and the grant carries its instruction). The red-checks
fix landed earlier the same night in another shape (`e076b80a`): the
queue withdraws a head whose checks were red at its merge, runs the
checks again, and a head still red after its re-runs leaves the queue.
No human denial is manufactured per cycle. Nothing is rolled to the
cluster yet.