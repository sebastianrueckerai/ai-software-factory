# The question format: how a card asks a human

Concept, 2026-10-17, from the overnight run's frozen-card episode. This note is the contract for every question the factory puts to a human, in the console or in chat. The build card for the code repo carries it.

## The problem

A card stopped with this question: "check-in: spend_above_policy: check-in call cap reached". That is an internal reason string wearing a question mark. The human could not tell what the card wanted, what an answer would do, or whether answering was safe. Nothing in the card carried the facts that made the decision easy: the pull request was finished and verified, one rebase from merge, and the grant at stake was 3% of what the card had already cost.

The board counts say this family is the norm, not the exception. Of every question ever asked (~170), the deterministic kinds carry ~85%:

| Times asked | Question |
|---|---|
| 87 | the session cap is reached |
| 13 | check-in call cap reached, spend above policy |
| 33 | card quiet past its SLA waiting on a dependency |
| 8 | month cap, the gateway refused the task's spend |
| 3 | remaining budget cannot fund a call |
| 6 | gate supervisor stopped WaitChecks past its cap |

The tail is thin: about twenty shapes, most asked once (split failed twice, screening suspects an issue, provider refusals, a p95-or-mean question, an injection guard).

## The format

Every question has the same five parts, always in the same order. The human's reading order never changes, whatever asked.

1. **The ask.** One sentence with the numbers in it. "Card 962 asks: may it spend €0.31 above the check-in budget to finish?"
2. **Why.** One or two sentences from the stop's data: which cap, what was spent, what remains of the work.
3. **What you need for the call.** State of the work, what each answer does, and the card's liveness. Example: "Pull request #969 passed every check. Yes grants one €0.30 slice and continues. No parks the card with the pull request open. Last processed answer: 09:45."
4. **Recommendation, when grounds exist.** "Check-in recommends: yes. The grant is 3% of the card's cost so far and the work is one rebase from merge." Two rules: the source is always named (the check-in's judgment, built from the factory's own numbers, or the agent's judgment, an opinion), and grounds exist or the field stays empty. A made-up line dressed in the template borrows trust it did not earn. No grounds, no recommendation: the question shows four parts instead of five.
5. **Premade answers.** Buttons for the shaped cases, free text always open. A button delivers a structured value, so its effect is deterministic: yes grants, no parks. Free text routes to the model as today.

The first two parts decide most questions alone. The rest is depth, folded away in the inbox, fetched on expand.

## Where each part comes from

The top families are pre-written templates, filled by code from the stop's structured data. The stop already knows its kind, its amounts, its attempt count. No model writes them. The recommendation for these comes from the check-in's own recorded judgment. The templates, drafted:

- **Call cap.** "Card N asks: may it have 12 more check-in calls to finish?" Why: the card used all 12; its session had made 183 model calls of real work. Buttons: grant, park.
- **Check-in share spent.** "Card N asks: may it spend €X above the check-in budget to finish?" Why: the €Y share is spent; the work is <state>. Buttons: grant, park.
- **Budget too low.** "Card N asks: raise its budget by €X to continue?" Why: €Y remain, one call costs about €Z. Buttons: fund, close.
- **Month cap.** "Card N asks: lift this month's cap by €X?" Why: the gateway refused the task's spend at the month cap. Buttons: lift, park until next month.
- **Quiet on a dependency.** "Card N has waited 61 minutes on card M. Keep waiting?" Why: the dependency's state. Buttons: keep waiting, close, take over the dependency's work.
- **WaitChecks past its cap.** "Card N's checks waited past their cap. Keep waiting?" Buttons: keep waiting, close.

Exact wording of each template is settled at build time against the reason strings in the code; the shape above is the contract.

The unpredictable tail is the agent filling the same five fields through a structured escalation tool. Today the tool takes a question string and optional choices, and choices arrive buried in prose ("approve, deny or split the..."). The tool takes five fields instead; then no question can reach a human unshaped, from any source.

## Liveness

A question whose card cannot process an answer must say so. Tonight a card sat frozen for two hours while its question looked normal: the workflow under it had panicked and queued every answer as a dead signal. Every question carries the time of its last processed answer, and a card that stopped processing shows a warning line instead of an answer box.

## The writing guide

The prose parts, template or agent, follow [the writing guide](writing-guide.md). It is the owner's guide, copied into this repo. The context builder inserts it into every step that writes text a person reads: check-in questions, chat answers, pokes, notifications. It is not a skill, not a call, and implementation sessions never see it.

## Console rendering

In the settled inbox (round 06): the ask as the card's headline line, the why under it, buttons for the premade answers, the rest behind the fold. The answer box keeps free text. A button click and a typed answer land in the same record.

## What this is not

Not a new escalation ladder, not a new channel. The stops, the routing and the grants stay as they are. This changes the shape of the question the human reads and the shape of the answer the factory records, so the human's mental load drops to one sentence plus a click.
