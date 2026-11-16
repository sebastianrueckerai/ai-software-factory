# Round 19: notes

Sebastian picked C, one paragraph, on 2026-11-16. The director recommended A, the stack, with C as the runner-up, and both critics ranked A first and C second in both loops. His pick stands. It is C46 in [design-decisions.md](../../design-decisions.md).

## The pick: C46

Sebastian's pick against the critics' scores: Gemini scored C one point under A in loop 1 and nine points under it in the compare loop. GLM scored C one point over A in loop 1 and two points under it in the compare loop.

C46 settles what the frames left open or drew wrong:

- gpt-image drew a top row on C's work cards in Queued. C has none, as the nano-banana drawing shows.
- The frames dropped #2102's own number for its waits clause. The number stays, and the waits clause follows it.
- The frames drew every `#N` as a bare number. Each reference names its target's title and state.
- The frames drew the carousel in the middle of the card's foot. It stays at the right, as C44 sets.
- The frames drew the ask on the small card and the why line on the opened card at 15 px. C46 takes the theme's 16 px for both.
- The frames left the plan's name off the cards in Needs you. C40 stands, so the band holds the place after the number.
- No frame showed a card whose suggested answer needs a field. Its label stands as a link that opens the card with that answer pressed, and the small card holds no button.

## The director's view

A is the problem document's sketch drawn as a card. Each layer has its own line: the ref and the state on top, then the title, the why line and the place line. A human who knows the work reads the title and stops. A human who dropped in cold reads three more short lines. The full-width amber button makes the suggested answer the loudest thing on the board, and "suggested by the project agent" and "1 other answer" sit under it in small type.

C saves the top row on a work card, so a card is one line shorter. Its title and why line run into one paragraph. The bold weight marks where the title ends, but a human must read into the paragraph to find that end. C's compact answer button is quieter than A's.

B adds a plan rail to every work card. The rail shows the card's place in its plan at a glance, but it is one more line of chrome on a quiet card. Its split button "Run the tests now | +1" puts the other answers one press away, and both critics found "+1" unclear in the compare loop.

D labels each line (WHY, PLAN, WAITS). A human who dropped in cold learns what each line is, but the labels make every card speak, and the narrow Queued column loses about 40 px of width to them.

## The critics' scores

Each critic scored G3 (layers), G8 (one decision) and the whisper rule from 1 to 10. The table shows the sum, at most 30. Loop 1 judged the gpt-image set. The compare loop judged the nano-banana set, a second drawing of the same directions.

| Direction | Gemini loop 1 | GLM loop 1 | Gemini compare | GLM compare |
|---|---|---|---|---|
| A, the stack | 26 | 25 | 28 | 27 |
| B, the plan rail | 16 | 22 | 18 | 18 |
| C, one paragraph | 25 | 26 | 19 | 25 |
| D, the labelled rows | 18 | 17 | 13 | 16 |

GLM scored C one point above A in loop 1 and still named A the winner, for its mono place line and its hairlines. The critics disagree on third place: Gemini put D above B in loop 1, GLM put B above D in both loops.

In loop 1 GLM proposed B's split button for A. Gemini found "+1" unclear. In the compare loop both critics found "+1" unclear and kept A's single button.

## Claims the director overruled

- Gemini, loop 1: "B repeats the plan name in the rail and the footer." The small card's foot holds the state and the number only. The claim holds for B's opened card, where "5 cards, all ended" shows in the head line and again under the rail.
- Gemini, loop 1: "the amber 'suggested by' text fails 4.5:1 in the light theme." The image model drew a light amber. The theme's amber text colour `#8a4f00` measures 6.5:1 on the light card and 6.0:1 on the Needs-you fill. A builder uses that colour.
- Gemini, loop 1: "B's plan rail segments are too small for 44 px targets." The rail shows a state. It is not a control.
- GLM, loop 1: "C lets a human see twice as many queued cards." In the gpt-image set C's #2100 card has the same height as A's. That drawing also gave C a top row the direction did not ask for. In the nano-banana set, which follows C, a card is one line shorter.
- GLM, loop 1: "B's plan rail shows even on the done cards." B's Done cards have no rail in either set.
- GLM, loop 1: "the routine card lacks a state dot in B and D." C16 gives a routine card a dot only while its run is running.
- GLM, loop 1: "D's labels make the content overflow the 280 px Queued column on the phone." On the phone the column is the full width, and no card overflows in either set.
- GLM, compare: "the amber button must be the only saturated colour on a Needs-you card." The amber band and the 3 px bar of C44 stay.

## What the image models drew wrong

- nano-banana wrote part names of the prompt onto the screen in its first pass: "WHY LINE:", "PLACE LINE:", "THE ASK BLOCK", "NOTE FIELD", "245 px", "390 px", "GHOST CARD". The prompt now says that part names never show. Three frames of A ran again, and the first pass is in [first-pass/](first-pass/). Some leaks stay in the other nano-banana frames ("1.5x", "Composer", "ROUTINE GHOST CARD #5", "#1c7448 mono"). The critics were told to ignore them.
- nano-banana drew A's Done cards with green and red fills in its second pass. The direction asks for quiet text on the card colour.
- gpt-image drew C's work cards in Queued with a top row and "queued 2 h" twice, which the direction does not have. It wrote a slogan into the foot of each phone board. It drew B's #2099 rail as "criteria gate 1/3" instead of "quiet inbox 2/4".
- The two phone screens of one opened card sometimes show different presses or a head drawn twice (B and C in both sets).
- `alibaba/qwen-image-3` refused the prompt: it takes at most 5,000 characters, and the probe's prompt had 6,900. The final prompts have 4,800 to 7,500. The call cost nothing.

## Cost and time

$8.44 of the $10 cap, estimated by `tools/img.py`. The fal key cannot read the real spend.

| Item | Calls | USD |
|---|---|---|
| nano-banana-2.1 at 2K, 16 frames, 3 frames again, 1 probe | 20 | 4.00 |
| gpt-image-2.5 at 1536 by 1024, 16 frames, 1 probe | 17 | 4.25 |
| flux-3 at 2K, 1 probe | 1 | 0.07 |
| Gemini 2.5 Pro and GLM 5V Turbo, 2 loops | 4 | 0.12 |

The nano-banana price at 2K is unknown, so the estimate is $0.20 per image, above the list's $0.15 at 1K. The images and the critics ran from 12:18 to 12:30 by the sidecars.

## What worked

- A probe of one frame on four models before the batch. gpt-image drew the console's real density with almost no leaks. nano-banana drew larger type and wrote part names onto the screen. flux-3 was legible but drew a grey theme.
- One sheet per direction, with the four frames in a 2 by 2 grid, sent at 2,560 px. Both critics answered on the first call.
- A second drawing by another model as the compare loop. It showed that the ranking does not depend on one model's drawing.
- Part names in a prompt end up on the screen. Name the parts once and say that they never show.
- The provider PNGs came to 124 MB. JPEG at quality 90 brought the round to 29 MB. Each sidecar names its stored file.
