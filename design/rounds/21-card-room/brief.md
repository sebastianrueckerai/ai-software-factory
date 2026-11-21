# Round 21 brief: the look of "Give more room"

A condensed round: one control, candidates built in the console lab, two critics, a recommendation with its runner-up. The control and its rules come from the [card room spec](../../../docs/card-room-spec-2026-11-20.md), sections 5.7 and 6.

## What the round designs

1. **The count.** How many sessions' worth the press gives: a whole number from 1 to 5, opened at 1. A human accepts it without typing.
2. **The readout's lines,** which the server writes from the count and the tick, in this order:
   1. one session's worth and its source: "About 14 min and 1.20 EUR per session, from its 3 sessions so far";
   2. time: what the press adds, what is left, and what the card then has, or that the time is enough;
   3. money, with its tick: the same three figures, or that the money is enough, or that it is left out;
   4. the spend limit, only when it rises: "The spend limit rises from 8.00 to 8.70 EUR first.";
   5. the starts, only when they rise: "It may also start 3 more sessions.";
   6. the project's money left this month.
3. **The money tick.** Set when the card lacks money, clear when the money is enough. The human can untick it, and the readout then says that money is left out.
4. **Send.** One press posts the count, the tick and the guard of what the readout showed.

In three places:

- **Ahead of time,** among the opened card's "Other actions" on a running card (lab scene `room-ahead`, card #640: 1 start, 18 of 60 minutes and 2.10 EUR left, a spend limit of 8.00 EUR).
- **At the money stop,** as the first answer on the ask's face (lab scene `room-money`, card #641: 0.40 EUR left, under the 0.50 EUR a session opens with).
- **On the chat's budget ask,** the money line alone with the project's month line (lab scene `room-chat`, card #642: the chat spent its 5.00 EUR for November). The chat has no sessions, so this ask keeps its own action and its EUR field.

## What is fixed

- The shell: the opened card of C46, a page with hairlines and no box. The answer row: a button of one width with its effect line at its right. The press outlines the button in `--need` and opens its fields under it. One Send, the amber fill, as wide as the answer buttons.
- The rules of "Every card readable": the label "Give more room" from the one vocabulary, one effect line, the fields only after the press, at most four answers on an asking face, no word rung, case or pool.
- What the control does. The field names `extend.sessions` and `extend.money`, the guard inputs `extend.shown_*`, the readout route `GET /tasks/{id}/room`, the re-read on every change of the count or the tick, and the refusal of a press whose readout moved. No figure is worked out in the browser.
- The theme tokens of `internal/console/static/console.css`, both themes. Every text pair 4.5:1. No inline style: every rule lives in `console.css`.
- The phone, at 390 px: every target 44 px, nothing scrolls sideways.

## The questions the candidates answer

1. How does a human set the count: a step at a time, a direct pick among five, a word in a sentence, or a small number field?
2. What does the eye find first in the readout: what the press adds, what the card then has, or what one session costs?
3. Where does the money tick sit, so that it reads as "this money, on this line", and does unticking it read plainly?
4. Do the spend limit line and the starts line, which come and go with the count, shift the control around?
5. Does the same look carry the chat's money line, which has an amount field and no count?

## The candidates

Four, each restyling the count and the readout together. Built as markup that [candidates.js](candidates.js) puts into the lab's real opened card: the candidate's count drives the real field, the server's readout route answers, and the candidate lays the answer out. No Go code changes.

- **A. Stepper:** minus, the count, plus. The readout as rows, each with a short label at its left.
- **B. Five buttons:** 1 to 5 as one segmented row. The readout as sentences, the money tick in the money line's gutter.
- **C. Sentence:** "Give [2] sessions' worth, [x] with its money." with the count as a choice inside the sentence. The readout as one paragraph.
- **D. Table:** a small number field. Time and money as a compact table of left, adds and then.

## Limits

- Four candidates, at most two critique loops: one over the four, one fix loop and one compare loop over two finalists.
- Two critics, Gemini and GLM, on the same sheets.
- Spending cap: 3 USD for the critics. No image generation.
- The round stops at its page. Sebastian picks.
