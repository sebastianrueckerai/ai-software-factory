# Round 19: the card's layers

The design round of Task 9 of [the plan "Every card readable"](../../../docs/plans/2026-11-16-every-card-readable.md). The goals and the card model are in [the problem document](../../../docs/board-cards-problem-2026-11-16.md), sections 5 and 6. It is a condensed round by [process.md](../../process.md). The question is layout: where each layer of the card sits and how loud it is. So image models draw the candidates.

## What the round designs, and nothing else

Five frames, each at 1280 px and at 390 px:

1. **A work card in Queued.** Number, wait time, title, why line, place line (plan name, card 1 of 3, what it waits for).
2. **A card in Needs you.** The title is the ask. Then the why line, the suggested answer as one button with who suggests it, and a count of the other answers.
3. **A Done card.** Title, state word, time. One or two lines.
4. **A routine card under Queued.**
5. **The opened card**, in this order: the head (title, why line, place and state), the ask block (each answer with its effect line, a field that opens on a press, one Send), the summary, then five closed folds: "The full brief", "The plan", "The card's life", "What each session got", "Other actions". The tabs stay.

## What is fixed

- The shell: the top bar, the status strip, the chat at the left, the board at the right with its four columns (C4, C7, C8, C20, C25). No new column and no new card state.
- The Needs-you chrome of C44: the 3 px amber bar, the amber band behind the head row, the carousel `1 of 5` at the card's foot, 12 px between cards.
- Routines as ghost cards at the foot of Queued (C16), plan names on cards (C40), presses that answer on the board alone (C31, C42), the criterion row (C45), no verdict buttons (C41), the Time section's content in the card's life (C10).
- The theme tokens of [Mission control](../../themes/06-mission-control/DESIGN.md). No new colour. Amber is the one hue for "needs a human".
- The contrast floor of 4.5:1 for text. On the phone every target is 44 px and nothing scrolls sideways.
- The text rules of the plan: the title is never cut, a why line is one sentence, at most 300 characters of prose on a small card, at most 900 above the folds of the opened card, one question and at most 4 answers on a card that asks.

This round amends C11: the face gets the why line and the place line beside its one time.

## The content

Every candidate shows the same cards with the same words, so the candidates differ in design alone. The copy follows section 6 of the problem document and the facts of card #1850. The exact words are in [prompts.py](prompts.py).

- Needs you: #1850, plan "one face" finished and no test checked its 5 promises, with the carousel at 1 of 5. #2101, two lines in the runner's build files that a human must change.
- Queued: #2100, card 1 of 3 of plan "criteria gate". #2102, card 3 of 3, which waits for #2101. The routine "Update the dependencies".
- In progress: #2099, for context only.
- Done: #2011 closed, #2098 done, #2093 failed.
- The opened card: #1850, with "Drop this promise" pressed, so its note field shows.

## The questions the candidates answer

1. **Layers (G3).** Does a human who knows the work stop at the title, and does a human who dropped in cold understand the card by reading on? Does each line add a fact and repeat none?
2. **One decision (G8).** Does a card in Needs you show one question, the suggested answer first with who suggests it, and at most 4 answers? Does a field show only after the press that needs it?
3. **Whisper.** "Normal states whisper. Exceptional states speak." Is a queued, running or done card quiet, and is the ask the loudest thing on the board?
4. **Width.** Do the four lines of a work card hold in a Queued column of about 160 px at 1280, without a cut title?

## The candidates

- **A, the stack.** The problem document's sketch as drawn: ref and time on the top row, then the title, the why line and the place line, each on its own line. The suggested answer as a full-width button. The opened card's answers as a list of rows.
- **B, the plan rail.** The place line becomes an instrument at the top of the card: the plan's name and one segment per card of the plan, this card lit. State and time at the foot. The suggested answer as a split button. The opened card's answers as tiles.
- **C, one paragraph.** The title and the why line run on as one paragraph, the title bold, the why line in the muted grey. One mono foot line for state, place and number. The opened card reads like a page, the suggested answer as one large button.
- **D, the labelled rows.** Each layer starts with a small faint label (why, plan, promise). The opened card is a list of labelled rows.

## Method

[prompts.py](prompts.py) writes one prompt per direction and frame. The desk frames are drawn in the dark theme at 1280 px. The phone frames are drawn in the light theme at 390 px, so each direction shows both themes. `google/nano-banana-2.1` draws every frame of every direction, the model the process picked for UI text. A probe of frame 1 on four models picks a second model for a second take. Gemini 2.5 Pro and GLM 5V Turbo judge the same contact sheets. The director checks every claim against the pixels.

## Limits

Four directions, one image pass per model, one critic loop and one compare loop. A spending cap of $10 for images and critic calls. Sebastian picks. His pick becomes a C-entry that amends C11, and [ia.md](../../ia.md) is rewritten after the pick.
