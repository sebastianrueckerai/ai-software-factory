# Round 21: the look of "Give more room"

Working notes of the director. Rebuild from here after a compaction.

## The ask

The [card room spec](../../../docs/card-room-spec-2026-11-20.md), sections 5.7 and 6: one control gives a card a count of sessions' worth, 1 to 5, opened at 1, with a readout the server writes from the count and the tick. The round designs the count, the readout's lines, the money tick and Send, in three places: among the opened card's "Other actions", as the answer at the money stop, and the money line alone on the chat's budget ask.

## What the lab draws today

The control works in a plain form: a full-width number field "Sessions' worth", a checkbox "With its money" above the readout, and the readout as six plain lines of equal weight. Each change of the count or the tick asks `GET /tasks/{id}/room` for the readout again. The shots are in `shots/before/`.

## How the candidates are built

`candidates.js` keeps the form the server rendered and swaps only what shows: the count's input for the candidate's control, which posts the same field `extend.sessions`, and the readout's lines for the candidate's layout, painted again after every htmx swap. The tick `extend.money` moves into the candidate's money line and is parked outside the readout while htmx swaps it. The guard inputs stay where the server put them. `node shoot.js check` drives each candidate's own count to 3 and its tick off and on again against the live route and checks the readout, the guard the press would post, one `extend.sessions` value, a visible tick, and at 390 px no sideways scroll and no target under 44 px.

The chat's budget ask has no readout route yet. Its money line and month line are drawn from the scene's figures: the chat spent 5.00 of 5.00 EUR, the project has 120.00 - 4.10 = 115.90 EUR left.

At count 3 the ahead-of-time card shows every line: target 4 sessions' worth, so 3 starts, 4 x 14 - 18 = 38 min, 4 x 1.20 - 2.10 = 2.70 EUR, and the budget 6.00 + 2.70 = 8.70 EUR passes the spend limit of 8.00 EUR, which rises by 0.70 EUR first.

## The round (2026-11-21)

- Loop 1, four candidates: A a stepper with the readout as labelled rows, B five buttons with the readout as sentences, C a sentence with the count inside and the readout as one paragraph, D a small number field with time and money as a table. Gemini picked D, runner-up A. GLM picked A, runner-up D. Both put prose (B, C) below structure (A, D).
- Scores, count/readout/tick/places/craft. Gemini: A 7/8/8/9/6, B 10/4/9/6/8, C 4/1/5/3/4, D 3/10/10/10/7. GLM: A 9/9/8/7/8, B 7/5/7/7/6, C 7/4/10/9/9, D 7/10/8/4/7.
- Overruled in loop 1: Gemini's "very small tap targets" for A on the phone (the stepper's buttons measure 44 by 44 px and the tick's label 44 px high at 390 px), its fix that A should disable minus at 1 and plus at 5 (it does), and C's "small tap target" (44 px). GLM's "B's buttons shrink on the phone" (each is about 70 by 44 px), its icons for A's labels (the stepper keeps 44 px, and the console names things in words), and "B buries the spend limit in a paragraph" (true of C, not B).
- Kept from loop 1: Gemini's B count for D. GLM's point that the spend limit row is of another kind: D's "left" cell held a limit, not what is left, so D2 moves the line out of the table. D's tick label fills its cell.
- Fix loop: A2 shows what the card then has in `--text` and lines the chat's field up with the rows. D2 takes B's five buttons, moves the spend limit under the table in `--text`, and shows the then column in `--text`.
- Compare: both critics pick D2. Gemini A2 4/5/8/4/3, D2 9/8/6/9/7. GLM A2 4/5/6/2/6, D2 9/9/9/10/8. GLM changed its pick from loop 1.
- Overruled in the compare: A2's "poor touch targets" and "breaks down on narrow screens" (44 px measured; the money row wraps, nothing is cut, nothing scrolls sideways). "Low contrast" of the small-caps labels and the table headers: `--text-faint` on the drawer's `--bg-raised` is 5.2:1 dark and 5.5:1 light. "0 min" in place of "enough": a 0 hides why nothing is added. The spend limit back into the table: its figure is a limit. GLM's "A2 abandons its pattern in the chat": both keep the EUR field, and A2 keeps its labels. D2's missing focus ring: it has one, and the crop shows no focus. Small targets in the phone's table rows: the only target there is the tick, 44 px.
- Kept for the build: 4 px more between the session's worth and the table at 390 px, and a little more weight on the table's headers.
- The critics disagree on "left out" (Gemini: ambiguous, GLM: plain). The director keeps it, because the cleared tick stands beside it.

## Recommendation

D2, five buttons and the table. Runner-up A2, the stepper and labelled rows. The reasons are on the round page. Sebastian picks; no C-entry before his pick. On 2026-11-22 he said "carry on" without naming a pick, so D2 stands as the provisional pick, C48, and his own pick overrides it.

What the build of D2 takes beyond the CSS: the readout becomes rows of left, adds and then plus the notes, rendered by the server's fragment; the fragment draws the tick with its state from the query; five radios named `extend.sessions` replace the number field; the chat's budget ask needs a readout of its own for its "then" figure. The field names, the guard, the route and the refusal of a moved readout stay.

## Cost, time, what worked

- Cost: 4 critic calls, an estimated 0.12 USD of the 3 USD cap (`tools/img.py cost` moved from 47.73 to 47.85). No image generated. The fal key cannot read the real spend; the estimate is the price list's 0.03 per call.
- Time: about 70 minutes, from the brief to the page.
- What worked: building on the real form instead of copying it. Each candidate's own control drives the real field and the real route, so the shots carry the server's figures and `node shoot.js check` proves that no candidate changes what the control does. Count 3 on the ahead-of-time card shows every line the readout has, the spend limit's included, without a new lab scene.
- What bit: moving a typed field that still has focus fires its change event, and the request went out with the tick already moved, so the first shots showed money left out. `shoot.js` blurs the field before a candidate takes the form. The console's `fieldset label` margin and the fold's `.hint` rule leaked into the candidates. The lab stops itself after 30 minutes; start it again for a long shoot.
