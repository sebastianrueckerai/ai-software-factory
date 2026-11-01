# Parked card spec: PlanFilingFact and the criteria-request close-out (plan #1345)

Filed 2026-10-31 after #1345's plan reached its terminal state with a criteria request (1005) still pending on a card whose two children are done. Widened 2026-11-01 after the same request closed by hand; the needed-fixes register's faults 8 to 10 carry the evidence.

Status: built 2026-11-01 on the code repo's main, widened pieces included.

## Observed

Plan #1345 (store-side doc comments) split into two children: #1379 (store-sql-doc-comments, done, merged 21:52) and #1380 (kube-routine-doc-comments, done). The plan track itself shows its session cap spent (26 sessions) and its planner output gone ("the planner filed no plan"; the last sessions died on opencode serve: context canceled). A criteria request (1005) sits pending with nothing left to deliver against it: both children merged, the plan's whole objective is in main.

The work is DONE. The paperwork is not. Nothing in the current tool set closes a criteria request on a card whose plan has already delivered — the answer tool routes to plan questions and card questions, neither of which this is, and the retry tool refuses (the card is not a plan child). The card cannot end; it sits in Done's antechamber with a request nobody can service.

Follow-up, 2026-11-01, the 00:19 to 00:30 close-out: the request reached the human bare and closed only by hand. The chat, holding no answer tool for the kind, opened a second ask about the request and handed Sebastian the five reason lines to retype into the console; the first Waive erased the other four (one form per criterion, the board swap carrying no draft state); and the closing advice, press Approve to submit, approved a grant with no criterion open: one more bounded card on the record, none drafted. Four of the five criteria were met at the head and took waivers anyway, for want of the delivered confirmation. A denied grant never re-asks in the same shape either, so denial is a dead end the confirmation must replace.

## The fix (three pieces, all small)

1. **PlanFilingFact (from #1347's deferred review finding).** The fact that records a plan's filing should carry the plan's revision and origin in canonical fields, not an extras blob: `PlanFilingFact{Plan, Revision, Origin, Card, Key}` written at the filing boundary, with first-write-wins identity. This is the two-line-plus-one-test fix the reviewer already specced; it belongs in the parked queue before anything new.
2. **Criteria requests are answerable wherever the human is.** The request's whole answer surface, on the human's word: waive one criterion with its reason; approve the grant of one more bounded card; and, keyed on every child of the plan done and merged, confirm that the delivered children satisfy the criteria, which closes the request with no waivers. The console keeps its buttons, and the chat gains the same door: a criteria answer behind the approver scope the console's approve and waive routes already require (the access table carries no criteria row for a chat tool today), and a poke for the kind like the merge and plan kinds (pokes.go escalates those two only). The human stays the decider of record: the tool refuses unless the thread holds the human's answering line, and the verdict rows and events name the human, via chat, with that line kept as the authority. No new lane, no new gate.
3. **The card keeps what was typed and names its close.** The reasons are draft state: one criterion's Waive must not erase its siblings' texts, the preserve treatment the board's find field already carries, given to every typed field on the board. The card states its closing rule (every criterion met or waived ends the request on the next sweep; no final press), offers the grant only while a criterion is open, and records a grant with nothing open as nothing granted. The store guards the stale board: waiving a criterion already met refuses.

## Tests

- PlanFilingFact carries revision/origin canonically (first write wins, re-files keep the original).
- A criteria request on a plan whose children are all done accepts the human's confirmation and ends the card.
- A criteria request on a plan with an open child stays pending.
- The chat answers a criteria request on the human's word: the rows name the human as decider and keep the authorizing line; with no human line in the thread, the tool refuses.
- One Waive press leaves the other criteria's typed reasons in place.
- Waiving a criterion already met refuses.

## Non-goals

No change to plan sessions' caps, no planner retry path, no change to the filing channel. One fact shape, one answer surface, one card-state pass. go test -race ./... green.

Parked queue order: phase-2 refile (closed #1383), this card, human-not-member, grant-loop (9f1ddef), intake-hold (a38e092).