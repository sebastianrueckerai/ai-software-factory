# Parked card spec: the production hold should not close intake

Filed 2026-10-31, after the member asked: "is there a good reason? Should that be changed?"

## The rule and its two halves

While a plan is open on main, the factory holds production. Two effects, one state:

1. **The deploy hold**: no live roll while a plan's chain is mid-flight. The plan's merged children deploy as one batch when the plan closes.
2. **The intake closure**: no new card files at all until then ("a wake files nothing").

## What the deploy half is worth (keep it)

A plan's children reshape main — tonight #1348's own merge hit a conflict with the dedupe work that landed minutes before, *inside* the same plan. Mid-roll, the code repo and the running factory can disagree: alert 2870 (chain red, 21:54) is exactly that shape — infra named a config the running factoryd did not accept. One batch, one validation window, one atomic roll. That half is sound and should stay.

## What the intake half costs (drop or narrow it)

- Tonight: plans done in the ledger since ~21:00, children still rolling at 23:00 — two hours in which four ready, fully-specced cards were refused at the door: the phase-2 refile (objective verbatim on closed #1383), the PlanFilingFact fix (two lines, one test, from #1347's deferred review finding), the member's human-not-member card, and the check-in grant-loop card (spec 9f1ddef) — whose subject, the grant loop, was LIVE and costing money while the spec sat parked.
- Filing is free. The queue is the natural waiting room. The queue cap already bounds its depth. The danger the hold guards against is a card *starting* against a moving main — not a card *existing*.
- The member's own ask bypasses the hold ("their own ask still files and starts") — the design already concedes urgency matters; it just denies the agent the same hand.

## The fix (surgical)

Intake accepts filings during a production hold. Held cards enter the queue in filing order and do not start until the plan closes and the chain rolls. The queue cap still applies (a capped refusal is honest; a closed door is not). The deploy hold and merge.groups one_at_a_time are untouched. The human bypass stays for genuine urgency (starting mid-hold).

## Tests

- A filing during a hold lands queued, does not start, and shows why.
- When the last open plan closes, held cards start in filing order.
- The queue cap still refuses beyond cap during a hold.
- The member's own ask still files AND starts during a hold.

## Non-goals

No change to the deploy hold, merge order, one_at_a_time, or plan children's lifecycle. Small card: one intake branch, one start-gate condition, four pinned tests. go test -race ./... green.

Order in the parked queue (all waiting on the very hold this card would soften): phase-2 refile, PlanFilingFact fix, human-not-member card, grant-loop card, then this. The irony is noted.