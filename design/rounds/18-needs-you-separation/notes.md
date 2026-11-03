# Round 18, the Needs-you cards' separation: notes

The run of [the brief](brief.md) in the condensed form. Three candidates were built over the lab's busy board in [design/prototypes/needs-you-separation/](../../prototypes/needs-you-separation/), on a byte copy of `console.css` at code commit 1d5d4163. [shoot.js](shoot.js) shot each in both themes at 1440 px and 390 px with two, three and five cards, the seam between the first two cards at 1x and 3x. Two critics judged the same sheets in a first loop and in a compare loop. No image model ran. The round page is [index.html](index.html).

## The recommendation: F, confirmed

**The separation.** Each Needs-you card opens on an amber band across its width that holds the card's head row, ruled off from the case by an amber hairline. The band sits behind the card's head row: the case's head in phase 5, with the ref in the amber text colour and the waiting time in the muted grey. On today's cards it is `.need-top` on an approval, the `h4` on a plan's approval, and the face's first line on an escalation or a human card. The band is that row's own background, so its height follows the row. It is 32 px at the least, at both widths, with no fixed height, so a title that wraps grows the band and never has the band cut through it. The band is the amber mixed 14 percent into the card ground in the dark theme and 22 percent in the light one: it mixes `--need` into `--bg-card` as the baseline's tint does, so it adds no new token. The gap between two cards grows from 6 px to 12 px. Today's treatment stays under it: the 3 px amber bar, the 4 percent tint in the dark theme, the amber-mixed border and 14 px left padding, with a selector that reaches the cards.

**The count and the arrows.** A card with more than one open case ends on the carousel: under a hairline, at the right, one unit of the previous arrow, the count "1 of 4" in mono and the next arrow. The arrows are 24 px at the desk and 44 px on the phone. A card with one case shows neither, and ends on its links.

Why F. The band marks where every card starts, so in a column of five the eye jumps from band to band without reading. The 12 px gap marks where a card ends. Neither alone did both: A's gap leaves the start to the ref's grey text, and B's 8 px gap let the next band crowd the card above. The carousel at the foot comes after the human has read the case and its answers, which is when they move on, and it keeps the head clear on the phone, where 44 px arrows filled B's band. Both critics asked for the carousel at the foot in the first loop, and both picked F in the compare loop, 9 of 10.

**The runner-up is B**: the same band with the carousel at the band's right and an 8 px gap. It answers the placement question the other way: the human sees "1 of 4" before reading. Both critics scored B 7 in the compare loop. The critics disagreed on the runner-up: in the first loop both named C, and in the compare loop Gemini scored C level with B at 7 and GLM scored C 6. Gemini's first-loop winner was A.

Sebastian confirmed F on 2026-11-03. It is C44 in [design-decisions.md](../../design-decisions.md).

## What the lab found first

The card treatment the brief names as the baseline does not render. `console.css` lines 213 to 215 select `.lane.five #needs-you > .card`, a card that is a child of the column. Since 14 October 2026 (code commit a2e1cc5e, "The columns scroll only when they must") the cards sit in the column's `.cards` body, so the rule matches nothing. The lab's computed style on the busy board shows the card with no box shadow, 8 px left padding and the plain `--line` border. In the dark theme the plain card ground and the lit column's tint measure 1.00:1, and the hairline barely shows. That is the complaint. The same block's rule that sets a card's `h4` at 16 px is dead for the same reason, so an approval's headline is 14 px today.

The round therefore showed two references: **before**, the board as it renders, and **base**, today's values with the selector `.lane.five #needs-you .cards > .card`. Both critics said base alone is not enough: its border measures 2.6:1 against the column in the dark theme and 1.6:1 in the light one, and the gap stays 6 px.

## The candidates

| Treatment | What it is |
|---|---|
| before | the board as it renders today |
| base | today's values reaching the cards, gap 6 px, the carousel at the right of the head |
| A | base with a 16 px gap, the carousel at the right of the head |
| B | base with an amber head band holding the ref, the waiting time and the carousel, gap 8 px |
| C | base with the border in the full `--need-line`, a 12 px gap, the carousel as the card's last row with the arrows at its ends |
| F | B's band with the ref and the waiting time, the carousel at the foot as one unit at the right, gap 12 px |

The card's face is the same under every treatment ([face.css](../../prototypes/needs-you-separation/face.css)): the head, the title, the ask, why, the info, the recommendation, the premade answers with the recommended one outlined, the draw field, the note and Send, then the links. The cases are the lab's busy and fire cards (#558, #603, #607, #610, #619), so two adjacent cards differ in text as on the real board.

## The first loop

Both critics judged eight sheets ([prompt](critique-prompt.txt)): the seam at 1x in both themes, the seam at 3x per theme, the column of three per theme, five cards dark and two light, the seam on the phone and the phone's screen. Answers: [Gemini](critique/loop1/gemini.json), [GLM](critique/loop1/glm.json).

| | Gemini | GLM |
|---|---|---|
| Ranking | A, C, B | B, C, A |
| Base enough? | no | no |
| Fastest to scan, five cards | B | B |
| Count and arrows | the foot | the foot |
| Change to the winner | the carousel to the foot | the carousel to the foot |

F is B with the change both critics asked for, C's foot row made one compact unit at the right as Gemini asked, and a 12 px gap between B's 8 px and A's 16 px.

## The compare loop

A, B, C and F on six sheets ([prompt](critique-compare-prompt.txt)): the seam at 1x, the seam at 3x per theme, five cards dark and two light, the phone, and F on the whole screen in both themes. Answers: [Gemini](critique/compare/gemini.json), [GLM](critique/compare/glm.json).

| Treatment | Gemini | GLM |
|---|---|---|
| A | 6 | 5 |
| B | 7 | 7 |
| C | 7 | 6 |
| F | 9 | 9 |

Both picked F. Both read F's foot carousel as part of the card it closes, and F's light band as legible and calm. Gemini asked for no change. GLM asked for 2 px more air above the foot's hairline.

The compare loop leaned toward F: questions 2 and 3 of its prompt asked about F alone, and only F had a sheet of the whole screen ([sheets.sh](sheets.sh)). This is a limit of the method, for Sebastian to weigh with the pick.

## What the director overruled

Every claim was checked against the shots at 1x and 3x and against the page's computed layout.

- **Gemini, first loop: B's band has black metadata text, muddy and failing contrast in the dark theme.** The band's text is the amber text colour for the ref and the muted grey for the time, not black. On the band they measure 7.8:1 and 5.0:1 dark, 5.6:1 and 6.6:1 light. This claim put B last in Gemini's first ranking.
- **GLM, first loop: B's band squeezes the phone's arrows under 44 px.** The page measures every arrow at 44 by 44 px at 390, in B as in every treatment. B's band is 46 px tall there. The crowding of the head row is real, and F moves the arrows out of it.
- **Gemini, first loop: C's arrows at the ends of the foot make a small tap area for the count.** The count is not a target. Each arrow is 44 px on the phone. The split did read as two loose controls, so F keeps the unit together.
- **GLM, first loop: A's 16 px gap wastes density.** Five cards in A are 48 px taller than in base, against cards of about 500 px each. A lost on its unmarked start, not on its height.
- **Gemini, compare loop: C separates fastest at 1x.** C's frame does read at once, and its full `--need-line` measures 5.5:1 against the column in the dark theme. In the light theme it measures 2.4:1, stronger than F's band rule at 1.5:1 against the card. The overrule rests on loudness alone: both critics called the frame loud beside the Send button. F keeps base's border.
- **GLM, compare loop: the foot carousel sits close to the Send cluster, add 2 px.** The links row stands between Send and the hairline: the hairline is 30 px below Send, the arrows 35 px. No change.
- **GLM, compare loop: make the band exactly 24 px rather than auto-sized.** The band the critics saw was a fixed 32 px at both widths in F (46 px on the phone only in B, to hold its 44 px arrows). Since the fix round the band follows the head row with 32 px as its floor, so it is never shorter than its text. 24 px would crowd the 12 px ref.
- **GLM, compare loop: the light band's text is near-black at 7 to 10:1.** The ref is the amber text colour #8a4f00 at 5.6:1. The conclusion stands, the colour was misread.

## Measured

Contrast, by the theme tokens:

| Pair | Dark | Light |
|---|---|---|
| ref (`--need-text`) on F's band | 7.8:1 | 5.6:1 |
| waiting time (`--text-muted`) on F's band | 5.0:1 | 6.6:1 |
| the card's title (`--text-muted`) on the card | 6.2:1 | 7.6:1 |
| base's border against the column | 2.6:1 | 1.6:1 |
| the 3 px bar against the card | 8.7:1 | 2.0:1 |

The bar in the light theme is under the 3:1 of a line that carries a state, today as in F. The column's head carries the state too, in `--need-text` with the amber count, so the bar is a second cue. It stays, as the brief fixes it. Sebastian may want the light bar in `--need-text`, as the lit column's corner marks already are.

Layout, by the page at 390 px and 1440 px, five cards: at 390 every arrow, answer, draw field, note and Send is 44 px or more. The face's links row (Details, issue, timeline) has no 44 px rule in the prototype, so its links are smaller. Nothing scrolls sideways, the gaps measure 6 px (before, base), 16 px (A), 8 px (B), 12 px (C, F). F's cards are 503 to 518 px tall at the desk, 11 to 41 px taller than base's. F's band is 32 px on every prototype card at 1440 and at 390.

## Cost and time

Four critic calls at $0.03 each by `tools/img.py`'s estimate: $0.12 of the $3 cap. The house total moved from $39.05 to $39.17. No image generation. The real figures sit in the fal and Z.ai dashboards. The round took 24 minutes on 2 November 2026, from 22:15 to the commit at 22:39, inside its two hours. The fix round below added no critic call.

## What worked

- Running the lab before designing. The computed style showed that the baseline never renders, which no image and no reading of the stylesheet alone would have shown. It turned the round's question from "which treatment" into "which treatment beats today's treatment once it renders".
- Taking the board from the real console and filling only the column. The candidates differ in three to eight CSS rules, so the build is CSS and the shots show the real neighbours.
- Showing base beside before. Both critics judged base on its own and found it short, which settles that fixing the selector is not the whole answer.
- Measuring the critics' craft claims in the page. Two of the first loop's faults, one of which reversed a ranking, were misreads.

## For the build

C44's values land in the code repository's `console.css`, with the selector fixed: `.lane.five #needs-you .cards > .card`. The `h4` rule of the same block takes the same fix, which makes today's approval headline 16 px, as the shots of today's cards show. The band and the foot carousel are the card's chrome. Phase 5's five parts land inside it, and today's escalation and approval cards take the band and the gap the day the rules land. The values are in [F.css](../../prototypes/needs-you-separation/F.css) and [base.css](../../prototypes/needs-you-separation/base.css).

## The fix round: the band on today's cards

The band must also land on today's cards, because the build comes before phase 5's face. F's band was a fixed 32 px drawn behind the head. It is now the head row's own background, from the 3 px bar to the right border, with a 32 px floor and 6 px above and below its text, so its height follows the row. The prototype's cards keep the same look. The judged shots stay in `shots/F-judged`, and the compare sheets are built from them.

[today.js](today.js) shot two of today's cards in the lab's busy scenario, as the console renders them and under F: the escalation #603 and the merge approval #607, in both themes at 1440 and 390, each card at 1x and its head at 3x, into `shots/today`. No critic judged them. Its check, under F, measured each head row and every text box in it:

| Card | 1440 | 390 |
|---|---|---|
| escalation #603, the title wraps at 1440 | band 52 px, text 39 px | band 33 px, text 19 px |
| approval #607, the chips and the time wrap | band 56 px, text 44 px | band 55 px, text 43 px |

In both themes no text box lies outside the band, and nothing scrolls sideways at 390. The 3x crops show the wrapped title, the chips and the time inside the band, with the band's hairline under the last row. The approval's headline is 16 px under F and 14 px before.

The shots showed one fault, now fixed: the approval's waiting time is `.need-top .since` in `--text-faint`, which measures 3.8:1 on the dark band. Under F the waiting time in the band takes `--text-muted`, 5.0:1 dark and 6.6:1 light, as the prototype's head already did. The approval's chips stay readable on the band: the risk chip's text measures 6.1:1 dark and 5.2:1 light on its fill.

## Evidence

[shots/](shots/) holds every shot by treatment and theme, for N of 2, 3 and 5: at 1440 `view-1440-n3` the screen, `col-1440-nN` the column as seen, `strip-1440-nN` the whole column, `seam-1440-nN` and `seam-1440-nN-3x` the seam. At 390 `col-390-nN` the whole column, `view-390-nN` the screen at the column's top, `seam-390-nN` and `seam-390-nN-3x` the seam. The seam shots of N 2 and 5 are byte copies of N 3's, because the seam sits between the first two cards whatever the count. `shots/F-judged` is F as the critics saw it, `shots/F` the pick after the fix round, and `shots/today` today's two cards. [sheets.sh](sheets.sh) builds the sheets again (`first`, then `compare`). [capture.js](../../prototypes/needs-you-separation/capture.js) takes the board from the lab again.
