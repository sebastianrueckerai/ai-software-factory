# Parked card spec: PlanFilingFact and the criteria-request close-out (plan #1345)

Filed 2026-10-31 after #1345's plan reached its terminal state with a criteria request (1005) still pending on a card whose two children are done.

## Observed

Plan #1345 (store-side doc comments) split into two children: #1379 (store-sql-doc-comments, done, merged 21:52) and #1380 (kube-routine-doc-comments, done). The plan track itself shows its session cap spent (26 sessions) and its planner output gone ("the planner filed no plan"; the last sessions died on opencode serve: context canceled). A criteria request (1005) sits pending with nothing left to deliver against it: both children merged, the plan's whole objective is in main.

The work is DONE. The paperwork is not. Nothing in the current tool set closes a criteria request on a card whose plan has already delivered — the answer tool routes to plan questions and card questions, neither of which this is, and the retry tool refuses (the card is not a plan child). The card cannot end; it sits in Done's antechamber with a request nobody can service.

## The fix (two pieces, both small)

1. **PlanFilingFact (from #1347's deferred review finding).** The fact that records a plan's filing should carry the plan's revision and origin in canonical fields, not an extras blob: `PlanFilingFact{Plan, Revision, Origin, Card, Key}` written at the filing boundary, with first-write-wins identity. This is the two-line-plus-one-test fix the reviewer already specced; it belongs in the parked queue before anything new.
2. **Criteria requests on delivered plans close.** When every child of a plan is done and merged, a pending criteria request on the plan card becomes answerable by the console (and by the project agent on the member's word): the answer records the member's confirmation that the delivered children satisfy the criteria, the request closes, the card ends. No new lane, no new gate — one branch in the criteria-request path keyed on "all children done".

## Tests

- PlanFilingFact carries revision/origin canonically (first write wins, re-files keep the original).
- A criteria request on a plan whose children are all done accepts the member's confirmation and ends the card.
- A criteria request on a plan with an open child stays pending.

## Non-goals

No change to plan sessions' caps, no planner retry path, no change to the filing channel. Small card: one fact shape, one branch, three tests. go test -race ./... green.

Parked queue order: phase-2 refile (closed #1383), this card, human-not-member, grant-loop (9f1ddef), intake-hold (a38e092).