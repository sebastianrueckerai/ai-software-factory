# Concept: the card #1345 incident from the ground up

Written 2026-10-31, from the live incident of the night of 30 to 31 October and the morning after. Status: concept, waiting for Sebastian's go. The plan fixes live in `internal/factoryd/plan.go` of ai-software-factory-code, the ask and carry-over fixes in the console.

## What you need to know first

Seven things, in plain words:

1. **Cards.** The factory turns a request into a card: one unit of work with its own budget in euros and a small cap on how many agent runs it may use.
2. **Sessions.** A card runs agent sessions: short work runs by an AI agent inside a sealed sandbox it cannot leave. Every session spends from the card's budget. A session that cannot go on stops and asks, and the card then waits for a human. That question is the ask. It shows on the card and in the Needs you list.
3. **The chat.** Beside the board sits a chat with the project agent. It reads and writes files in the project's document repository, files cards and answers asks for Sebastian, the one human the factory calls the member. It is the main channel between the two.
4. **Plans.** A card too big for a single run goes to the plan track. A planner agent writes a plan: the work cards to create, plus criteria, the named checks that later decide the work counts as good. The plan lives in numbered versions called revisions. The newest revision is the current one.
5. **Criterion ids.** Every criterion has an id, and the meaning behind an id never changes. When a check changes, its new version gets a new id and names the old id in a `replaces` field: v11 replaces v10 means v11 is v10's successor. This keeps the record honest from revision to revision.
6. **Confirmations.** A revision whose criteria changed asks the member to confirm it. The answer wakes a planner session, which is expected to file the next revision.
7. **Money.** The factory holds the cost of every model call against the card's budget before the call runs. A card with too little budget runs nothing, not even the delivery of an answer.

## The night, step by step

1. Card #1345 asked for house doc comments on three old files of factoryd. The chat filed it, the sizing called it medium, and a medium card goes to the plan track.
2. Sebastian asked from the console for a split by territory. The planner delivered it: two territory cards and their criteria.
3. The plan asked for a confirmation of its criteria. Sebastian answered okay.
4. The answer woke a planner session. Nothing had changed, so the session filed the plan unchanged.
5. The filing rule compares a new plan with the newest stored revision. The newest stored revision was that same plan. The rule asked whether that revision still holds the ids its own criteria had replaced. It does not, because a revision drops an id when another replaces it: when v11 replaced v10, v10 left. The filing was refused:

```
the plan was refused:
- criterion store_function_comments_v11: replaces store_function_comments_v10, an id the previous revision does not hold
- criterion kube_routine_comments_v11: replaces kube_routine_comments_v10, an id the previous revision does not hold
correct the plan and file it again in this session
```

6. That advice, correct the plan and file it again, demands exactly the one change the rules accept for a changed criterion: a new id pair. The session renumbered. A renumbered criterion is a changed criterion, so the plan asked a new confirmation. Step 3 again.
7. Nine turns ran this way, revisions 5 to 13. Revisions 8 to 13 each renamed both judgement criteria one step (v6 replaces v5, up to v11 replaces v10) inside 34 minutes. Fifteen planner sessions ran on the card between 23:39 and 01:40, all on the strong model, and the card asked and received confirmations for revisions 9 to 13 between 01:15 and 01:40. No work card was ever filed, no comment written, no issue touched.
8. Sebastian's instruction to the card said: if the gate refuses the metadata again, do not re-plan, report the exact refusal on the issue. The gate refused again. The session reached for gh, GitHub's command line client. It is not installed in the sandbox, and it speaks GitHub's API, not the forge's (see the reporting concept). Its last move was to stop and ask, at 01:41.

## The two defects, each harmless alone

1. **A re-file of the newest revision is judged as an amendment of itself.** The comparison in `revisionFindings` asks whether the previous revision holds each replaced id. When the incoming plan is the newest revision, the previous revision is the plan itself, and the ids its criteria replaced are gone by design. An unchanged re-file is always refused, with advice that forces a renumber. The stored revisions exist throughout: plan_revisions holds every revision 8 to 13. The comparison is against the wrong thing.
2. **An answered confirmation always returns to the planner.** `RequestPlan` sends every fully answered revision to a planner session, on the theory that answers must be folded in. A confirmation answered okay has nothing to fold in. The session re-files (defect 1), the refusal renames, the rename re-asks the confirmation. The circle closes.

No move from the agent side can end it. Filing unchanged hits defect 1. Filing the criteria without the `replaces` markers hits the other refusal, "the previous revision holds this id with another definition". New ids pass, but re-ask the confirmation. The machinery must be fixed. The agents did nothing wrong.

## The ask reached the human, the blocker did not

The stop ask at 01:41 said: "This card stopped and needs your decision: how should it go on?" Its reason carried the session's stop note: told to report the exact refusal, and cannot. The refusal itself, the two criterion lines above, sat in the session's findings one query away. The ask wording also speaks of pull requests and re-verification, which fits no plan card. The fix: the ask quotes the refusal verbatim, and a plan card's ask names what its choices do. The channel question, why gh is refused on both counts, is argued in the reporting concept.

## The money walls

The loop did not only burn time. It starved every way out:

1. **The burn.** The card spent 4.60 EUR of its 5.60 EUR budget and used 12 sessions under a cap of 3 with 9 extras granted, all on planning.
2. **A choice press records, it does not pay.** At 06:35 Sebastian pressed the choice "Fund €1.50, file with fresh criterion ids" on the ask's Needs you card. The press closed that card and kept his words as its note. It moved no money and delivered no answer: card #1345 has had no event since the ask at 01:41. His instruction never reached the card it was about.
3. **The chat's own paths were refused.** The project agent tried to fund the card and got "Refused: This project sets no pool: discretionary_eur is absent or 0". It tried to send the answer directly and got "Refused: the remaining budget cannot fund a call: Raise the budget (Fund on the board) and answer, or close the card. 1.003 EUR of the 5.600 EUR budget remains, and a session's opening on premium needs 1.410645 EUR" (three opening calls on the strong model, quoted trimmed).
4. **What remained.** The Fund control on the card face, pressed by hand, then the answer. Nothing else moved.

With the loop fixed, #1345 needs none of this: the confirmed plan files its cards inside the factory with no session, so no budget and no session grant (see the fixes). The general gaps stay and are open decisions below.

## The dropped question

The same morning, in the chat. At 06:46 Sebastian asked for both concepts as committed text files: "Make a concept for this. But only if you can commit it as a text file into the repo. Can you do that?"

The reply promised three things: raise the card's budget, send the answer, and check where concept files can live. The check was a read of docs/roadmap.md, a read and not a write: nothing was ever added to the roadmap. Then the money walls took the turn, the next message was all fund and board, and the question can you do that was never answered. Every turn after that was a timer or a poke with its own job, and nothing in the chat carries an unanswered question into the next turn. The word concept appears nowhere in the chat after 06:48, and no file write happened at all that day.

The tool was never the gap. `write_doc` commits a new file to the document roots (docs/roadmap.md, docs/plans/, docs/board/ or docs/<name>.md), straight to master. The gap is the carry-over, and it is one of the fixes below.

## The alerts

The supervisor's gate-bound detector fired on every turn of the loop: seven alerts (2815 to 2828) opened and nothing closed them. With the loop gone they stop firing.

Checking them found a second defect: alerts 2292 and 2294 sit open on a card that finished done on 29 October at 10:55. Alerts outlive their cards. They need a resolution pass when their card ends.

## The fixes

1. **A re-file that equals the newest revision is a no-op.** In `FilePlan`, after the plan is normalised exactly as the stored one was (round stamps, settled cards of earlier rounds prepended), compare it with the newest revision by value. Equal: return "this is already revision N", store nothing, ask nothing, run none of the filing bookkeeping (no criteria records, no child restarts). Compare by value, not by hash: a settled card gaining its issue number between filings changes the hash of an otherwise equal plan.
2. **An unchanged criterion is exempt from the replaces check.** `revisionFindings` skips a criterion that the previous revision holds with the exact same definition. Its `replaces` marker is history, not an amendment. This keeps the no-op stable even when the value comparison drifts, and it is the correct reading of the freeze rule: only a criterion that is new or changed needs a lineage claim.
3. **A confirmed plan files its cards instead of waking a planner.** In `RequestPlan`, when the revision's questions are all answered and every question was a confirmation answered with its offered choice word, the criteria are fixed: file the cards, end the plan done ("revision N filed M cards"). This covers the moment the confirmation is answered and every later pass, such as a plan card's stop ask answered with Go on. An answer that adds words returns to the planner as today, because it may carry a change. Real questions also return to the planner as today.
4. **The ask carries its own facts.** A plan card's stop ask names what its choices do (a planner session, holding the plan, closing the plan), not the generic card-stop wording about pull requests. When a session stops right after a tool refusal, the ask quotes the refusal verbatim in its info block. The blocker then reaches the member without any agent-side reporting; see the reporting concept for the channel question.
5. **An unanswered question carries over.** When a member message holds a question the reply does not address, the console carries the question into the next turn's prompt until a reply answers it, and the chat shows it as open. The morning's dropped question then cannot happen.

## Tests, hand-derived from the live shape

- Re-file the newest revision unchanged: no new revision row, no findings, the answer names the existing revision.
- Re-file after a settled card gains its issue number (values equal, hash different): still a no-op.
- A criterion identical to the previous revision's, stale `replaces` and all: no finding.
- A changed criterion under its old id: the existing "another definition" finding, unchanged.
- A revision whose only question was a confirmation, answered with the choice word: cards file, the plan ends done.
- The same revision answered with extra words ("okay, but drop the third criterion"): back to the planner.
- A revision with a real question answered: back to the planner, unchanged behaviour.
- A plan card's stop ask names planner sessions; the info block quotes the session's last tool refusal.
- A member question the reply does not address reaches the next turn's prompt, and clears when a reply answers it.

## What the fixes retire

The batching instruction. "File everything in one revision, keep confirmations down" was a prompt rule patching this loop. With confirmations filing cards, the tax is gone and the rule goes.

## What card #1345 does once this rolls

Answer "Go on" at its ask. No session starts, so the empty budget and the 12 of 12 sessions stop mattering and no Fund press is needed. factoryd files the two territory cards from the confirmed revision 13 and ends the plan done. If a planner session is already awake when the fix rolls, its re-file is a no-op and harmless.

## Open decisions

1. An answer to a stop ask at the card's budget floor: guaranteed by the project pool, or refused as today? The fixes make the case rare.
2. The alert resolution pass: close a card's open alerts when it ends, or when their subject ends?
3. The press that names money: a choice like "Fund €1.50" either moves the money and carries the instruction to its card, or its wording says it records the decision only.
4. The project pool: give the project a small discretionary pool so the chat can fund a card the member has approved, or keep every fund in the member's hand.

## Sources

The live events and plan_revisions of task t-cdb2a651712a and the chat ledger rows 3173 to 3201 of 31 October, both read from the controller's database. `internal/factoryd/plan.go` (`FilePlan`, `revisionFindings`, `RequestPlan`, `askConfirmation`). The conversations with Sebastian and the project agent's read of the same incident, 31 October.
