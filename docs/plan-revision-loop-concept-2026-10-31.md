# Concept: a confirmed plan files its cards (the revision loop of card #1345)

Written 2026-10-31, from the live incident of the night of 30 to 31 October. Status: concept, waiting for Sebastian's go. All fixes live in `internal/factoryd/plan.go` of ai-software-factory-code.

## What happened

Card #1345 (house doc comments on three store-side files, filed by the chat, sized medium, plan track) was replanned from the console to split it by territory. The planner delivered the split. From that moment the plan card turned in a circle for over an hour and never filed a work card:

1. A confirmation of the plan's criteria was asked and answered "okay".
2. The answer woke a planner session, which re-filed the plan unchanged, because nothing had changed.
3. The filing rule judged the plan as an amendment of itself and refused it:

```
the plan was refused:
- criterion store_function_comments_v11: replaces store_function_comments_v10, an id the previous revision does not hold
- criterion kube_routine_comments_v11: replaces kube_routine_comments_v10, an id the previous revision does not hold
correct the plan and file it again in this session
```

4. The only correction the rules accept for changed criteria is a new id pair, so the planner renumbered. A renumbered criterion is a changed criterion, so a new confirmation was asked. Back to step 1.

Nine turns ran this way (revisions 5 to 13). Revisions 8 to 13 each renamed both judgement criteria one step (v6 replaces v5, v7 replaces v6, up to v11 replaces v10) in 34 minutes. Fifteen planner sessions ran on the plan card between 23:39 and 01:40, all on the strong model. The project agent stopped the circle itself with a standing note ("if the gate refuses again, do not re-plan, report the exact refusal"), the session could not report (see the reporting concept), and the card stopped at an ask at 01:41. No work card was ever filed; no comment was written.

## The machinery, in brief

A medium or large card goes to the plan track. The planner writes a plan revision: work cards plus criteria, the checks that decide the work counts as good. One rule protects the contract: a criterion's id never changes its meaning. A changed criterion files under a new id that names the old one in `replaces`. A revision whose criteria changed asks a confirmation. Every answered question wakes a planner session, which is expected to file a plan again.

## Root cause: two defects, each harmless alone

1. **A re-file of the newest revision is judged as an amendment of itself.** `revisionFindings` compares the incoming plan with the newest stored revision. When the incoming plan IS the newest revision, the rule asks whether that revision still holds the ids its own criteria replaced. It does not; a revision drops an id when another replaces it. So an unchanged re-file is always refused, and the refusal's advice, "correct the plan and file it again", demands exactly the renumbering that feeds the loop. Stored revisions exist throughout (plan_revisions holds every revision 8 to 13); the comparison is against the wrong thing, the plan against itself.
2. **An answered confirmation always returns to the planner.** `RequestPlan` sends every fully answered revision back to a planner session, on the theory that answers must be folded in. A confirmation answered "okay" has nothing to fold in. The session re-files (defect 1), the refusal renames, the rename re-asks the confirmation. The circle closes.

No agent-side move can end it. Filing the plan unchanged hits defect 1. Filing the criteria without the `replaces` markers hits the other refusal ("the previous revision holds this id with another definition"). New ids pass, but re-ask the confirmation. The machinery must be fixed; the agents did nothing wrong.

## The fixes

1. **A re-file that equals the newest revision is a no-op.** In `FilePlan`, after the plan is normalised exactly as the stored one was (round stamps, settled cards of earlier rounds prepended), compare it with the newest revision by value. Equal: return "this is already revision N", store nothing, ask nothing, run none of the filing bookkeeping (no criteria records, no child restarts). Compare by value, not by hash: a settled card gaining its issue number between filings changes the hash of an otherwise equal plan.
2. **An unchanged criterion is exempt from the replaces check.** `revisionFindings` skips a criterion that the previous revision holds with the exact same definition; its `replaces` marker is history, not an amendment. This makes the no-op stable even when the value comparison above drifts, and it is the correct reading of the freeze rule: only a criterion that is new or changed needs a lineage claim.
3. **A confirmation answered with its offered choice files the cards in the same step.** In `RequestPlan`, when every open question of the revision was a confirmation and the answer took the offered choice as given (the single word, no additions), the criteria are fixed: file the cards, end the plan done ("revision N filed M cards"). An answer that adds words returns to the planner as today, because it may carry a change. Real questions also return to the planner as today; folding them in is real work.
4. **The ask carries its own facts.** A plan card's stop ask names what its choices do (a planner session, holding the plan, closing the plan), not the generic card-stop wording about pull requests. When a session stops right after a tool refusal, the ask quotes the refusal verbatim in its info block. The blocker then reaches the human without any agent-side reporting; see the reporting concept for the channel question.

## Tests, hand-derived from the live shape

- Re-file the newest revision unchanged: no new revision row, no findings, the answer names the existing revision.
- Re-file after a settled card gains its issue number (values equal, hash different): still a no-op.
- A criterion identical to the previous revision's, stale `replaces` and all: no finding.
- A changed criterion under its old id: the existing "another definition" finding, unchanged.
- A revision whose only question was a confirmation, answered with the choice word: cards file, the plan ends done.
- The same revision answered with extra words ("okay, but drop the third criterion"): back to the planner.
- A revision with a real question answered: back to the planner, unchanged behaviour.
- A plan card's stop ask names planner sessions; the info block quotes the session's last tool refusal.

## Consequences beyond the loop

- **The budget starved the escape hatch.** The loop burned the card to 1.00 EUR of its 5.60 EUR budget, and the answer to the stop ask was itself refused because a session's opening calls cost about 1.41 EUR. The fixes remove the burn. Whether an answer to a stop ask should always be deliverable at the budget floor (a guaranteed session from the project pool, say) is a policy decision left open below.
- **Seven gate-bound alerts opened and stayed.** The supervisor's gate-bound detector fired on every turn of the loop (alerts 2815 to 2828) and nothing closed them. With the loop gone they stop firing.
- **Stale alerts outlive their cards.** Alerts 2292 and 2294 (gate bound, RequestPlan) sit open on a card that finished done on 29 October at 10:55. Alerts need a resolution pass when their card ends; a small card of its own.
- **The batching instruction retires.** "File everything in one revision, keep confirmations down" was a prompt rule patching this loop. With confirmations filing cards, the tax is gone and the rule goes.

## What card #1345 does once this rolls

Answer "Go on" at its ask. The confirmed revision 13 files its two territory cards with no planner session between, and the plan ends done. If a planner session is already awake when the fix rolls, its re-file is a no-op and harmless.

## Open decisions

1. An answer to a stop ask at the card's budget floor: guaranteed by the project pool, or refused as today? The fixes make the case rare.
2. The alert resolution pass: close a card's open alerts when it ends, or when their subject ends?

## Sources

The live events and plan_revisions of task t-cdb2a651712a (30 to 31 October, the controller's ledger under `.superpowers/sdd/`); `internal/factoryd/plan.go` (`FilePlan`, `revisionFindings`, `RequestPlan`, `askConfirmation`); the conversation with Sebastian and the project agent's read of the same incident, 31 October.
