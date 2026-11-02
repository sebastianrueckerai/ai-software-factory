# Round 18: the Needs-you cards' separation

Sebastian's complaint of 1 November 2026: highlighted cards run together. Two cards side by side in the Needs-you column differ by their text and a 6 px gap. The card flow redesign changes what such a card shows: one open case at a time, as a carousel with a count of the card's other open cases and arrows ([section 5.8](../../../docs/card-flow-redesign-2026-11-02.md)). This round designs the chrome that face lands in. It is a condensed round by [process.md](../../process.md), built in the lab, with no image generation: the question is a CSS detail.

## What the round designs, and nothing else

1. **The separation between two adjacent Needs-you cards**, by spacing, border, background or a divider, so that two never read as one.
2. **Where the carousel's count and arrows sit** on the card, so the chrome survives phase 5 of the redesign.

## What is fixed

- The shell, the top bar, the pulse, the chat and the other three columns as the lab's busy scenario shows them.
- The theme tokens of `console.css` in both themes. No new colour, fill, radius or type scale.
- Amber as the one hue for "needs a person".
- The contrast floor: 4.5:1 for text, 3:1 for a fill or line that carries a state, in both themes.
- The phone rule: at 390 px one column, every target 44 px, no horizontal scroll.
- The card's treatment of today as the baseline: the 3 px amber bar at the left, the 4 percent amber tint in the dark theme (the light card ground is plain `--bg-card`), the border mixed 38 percent toward amber (55 percent in the light theme), 14 px left padding (`console.css` lines 213 to 215).
- The five-part face of 5.8 in its order: the ask, why, what you need for the call, the recommendation, the premade answers with the one fund control, a note box and one Send. The board's clamps of today hold: the ask at three lines, why and the info at two, the recommendation at three.
- The carousel's count and arrows of 5.8. Every candidate places them. A card with one open case shows neither.

## What the lab showed first

The baseline does not render. Its selector, `.lane.five #needs-you > .card`, asks for a card that is a child of the column. Since 14 October 2026 the cards sit in the column's `.cards` body, so the rule matches nothing. The column's cards are plain cards today: the card ground, a `--line` hairline, 8 px padding and a 6 px gap, on the lit column's amber tint. In the dark theme the card ground and the column's tint are near the same lightness, and the hairline barely shows. That is the complaint.

So the round shows two references beside the candidates: **before**, the board as it renders today, and **base**, today's values with a selector that reaches the cards. A candidate must beat base, not only before.

## The questions the candidates answer

1. Which separation reads at 1x and at 3x in both themes, with two, three and five cards?
2. Where do the count and the arrows sit: in the card's head, beside its ref, or at its foot, after the answers?
3. Does the start of each card show at a glance in a long column, so a human finds the next card without reading?
4. Does it hold on the phone, where the arrows are 44 px targets?

## The candidates

- **A, spacing.** Base, with the gap between two cards grown from 6 px to 16 px, past the card's own padding, so the amber bar and the border break where a card ends. The carousel at the right of the head row.
- **B, a head band.** Base, with each card opening on an amber band across its width that holds the ref, the waiting time and the carousel, ruled off from the case. The band marks where a card starts. The gap grows to 8 px.
- **C, a frame and a pager foot.** Base, with the border in the full `--need-line`, a 12 px gap, and the carousel as the card's last row under a hairline, the arrows at its two ends.

## Method

The prototype in [design/prototypes/needs-you-separation/](../../prototypes/needs-you-separation/) is the lab's busy board, taken from the real console at code commit 1d5d4163 by its `capture.js`, over a byte copy of that commit's `console.css`. `cases.js` fills the Needs-you column with two, three or five cards of the lab's busy and fire scenarios, each showing one case in the five parts. `face.css` draws the parts, the same under every treatment. `base.css` and one sheet per candidate draw the chrome. [shoot.js](shoot.js) shoots each treatment in both themes at 1440 px and 390 px: the screen, the column, the whole column, and the seam between the first two cards at 1x and 3x. [sheets.sh](sheets.sh) builds the sheets. Gemini 2.5 Pro and GLM 5V Turbo judge the same sheets. The director checks every claim against the pixels and writes the overruled ones into [notes.md](notes.md).

## Limits

Three candidates, two critics, one fix loop and one compare loop. A spending cap of $3 for critic calls. A stop time of two hours. The director's pick is provisional until Sebastian confirms it. It becomes C44, with [ia.md](../../ia.md) and [inventory.md](../../inventory.md) updated where they list the card's treatment. The build lands in the code repository after C44.
