# Round 17, the chat token's label and the Tokens section: notes

The run of [the brief](brief.md) in the condensed form. Three candidates per part were built in the real templates and stylesheet and served by the lab's `tokens` scenario. [shoot.js](shoot.js) shot each one at 1440 px and 390 px in both themes, with crops at 1x and 3x. Two critics judged the same sheets in a first loop and in a compare loop. No image model ran. The candidates are kept as patches against the base commit 9f0444c2: [A](cand/A.patch), [B](cand/B.patch), [C](cand/C.patch) and the pick [F](cand/F.patch). The round page is [index.html](index.html).

## The recommendation: F, provisional

**The label.** A row a chat token sent keeps the human as its author. Its avatar becomes a dashed cyan ring around the human's initial, and its who line reads `sebastian via claude-laptop`, with "via" and the name in the muted grey. A row the browser sent keeps the filled disc and shows nothing new. The agent's replies carry no label. A name too long for the line ends in an ellipsis, and the row's tooltip holds it whole.

**The Tokens section.** The answer to the form shows the block at the top of the page, above Connections, on a raised panel with a 2 px cyan rule at its left and the mark "shown once". The `claude mcp add` line sits in a dark line behind a `$` prompt with a Copy button. The bearer sits under "bearer, for a script" with its own Copy button. A press puts the value on the clipboard and the button reads "Copied". Where the browser refuses the clipboard, the press selects the text instead. A click on either value also selects it whole. The token list keeps its six columns and names the project as Level per project does, by its repository only when the human no longer reads it. A lamp beside the last use is lit for a token in use and unlit for one never used or expired. The form folds behind "Make a chat token" once a token exists and stands open while there is none. On the phone each stacked token row names its fields: project, created, expires, last used.

Both critics put the dashed avatar and the command panel first in the first loop, and both picked F in the compare loop.

**The runner-up** is A for both parts. For the label, A keeps the filled disc and says `via claude-laptop` in words only. It is the quietest, and a human must read each who line to find the token's rows. For the Tokens section, A has the same block at the top with boxes that select whole on a click and no Copy button, and the form as one row of fields. The critics disagreed on the runner-up of the Tokens section in the first loop: Gemini named A, GLM named B. In the compare loop both scored A above B.

This pick is provisional, awaiting Sebastian's confirmation. It is C43 in [design-decisions.md](../../design-decisions.md).

## The candidates

| Part | Candidate | What it is |
|---|---|---|
| Label | A | `via claude-laptop` in muted grey after the name |
| Label | B | the token's name as a bordered chip after the name |
| Label | C | the avatar as a dashed ring, and `· claude-laptop` after the name |
| Tokens | A | the block on top, values in boxes that select whole, a lamp on the last use, the form in one row |
| Tokens | B | the block inside the table under the new token's row, the answer scrolled to it, a lamp before the name, the form as label-beside-field rows |
| Tokens | C | the block on top as a command panel with a Copy button per value, a lamp on the last use, the form folded once a token exists |

F is C for both parts with the changes the first loop asked for: "via" from A in the who line, the 2 px cyan rule from A on the block, the bearer under its own label instead of a `#` prompt, the field names on the phone, and a guard for a refused clipboard.

## The first loop

Both critics judged the same sheets: the label at 1x and 3x in both themes and at 390 px ([prompt](critique-label-prompt.txt)), and the Tokens section at the desk landing, the block, the phone landing, the list and the whole phone page ([prompt](critique-tokens-prompt.txt)). Answers: [label, Gemini](critique/loop1/label-gemini.json), [label, GLM](critique/loop1/label-glm.json), [tokens, Gemini](critique/loop1/tokens-gemini.json), [tokens, GLM](critique/loop1/tokens-glm.json).

The ranking of each critic in the first loop:

| Part | Gemini | GLM |
|---|---|---|
| Label | C, A, B | C, A, B |
| Tokens | C, A, B | C, B, A |

On the label, both found the dashed ring the fastest to scan and A the quietest. Gemini asked for A's "via" in C's who line. GLM asked for C's token name in the muted grey. On the Tokens section, both preferred the Copy button to a box that selects on a click, and the folded form. Gemini asked for the lamp before the name. GLM asked for a thicker cyan rule on the block.

## The compare loop

F against A for the label, and F against A and B for the Tokens section ([label prompt](critique-compare-label-prompt.txt), [tokens prompt](critique-compare-tokens-prompt.txt)). Answers: [label, Gemini](critique/compare/label-gemini.json), [label, GLM](critique/compare/label-glm.json), [tokens, Gemini](critique/compare/tokens-gemini.json), [tokens, GLM](critique/compare/tokens-glm.json).

| Part | Candidate | Gemini score | GLM score |
|---|---|---|---|
| Label | F | 9 | 7 |
| Label | A | 6 | 6 |
| Tokens | F | 9 | 9 |
| Tokens | A | 6 | 7 |
| Tokens | B | 3 | 5 |

Both picked F for both parts.

## What the director overruled

Every claim below was checked against the shots at 1x, and the ring at 8x magnification of the 1x pixels.

- **Gemini, first loop: B's chip border looks fuzzy and thick at 1x.** The chip is the console's own `.chip`, a 1 px line in `--line-strong`, and the sheet shows it at its native size. It is crisp. GLM's other claim on B holds: the chip's text does not sit on the who line's baseline. B lost for other reasons.
- **Gemini, first loop: C adds no width, so it suits the 64-character name best.** C and A both carry the name as text in the who line, so both take its width. Both cut it with an ellipsis. The lab's check now puts a 64-character name on the phone and asserts the cut, the time in view and no horizontal scroll.
- **GLM, first loop: A's muted "via" may fall under 4.5:1.** `--text-muted` on the chat's panel measures 7.2:1 dark and 7.0:1 light. The lab's contrast check measures the label in both themes.
- **GLM, first loop: render C's token name in the muted grey.** It was already in the muted grey. The claim misread the pixels.
- **GLM, first loop: A's one-row form overflows at 390 px.** It stacks to one column with 44 px fields on the phone, as the whole-page sheet shows.
- **Gemini, first loop: A's form has no persistent labels and leans on placeholders.** Each field has its label above it. A lost the form question on its crowding at 1440, not on labels.
- **Gemini, first loop: put the lamp before the token's name.** The lamp stays beside the last use, where C19 puts a lamp beside the state it lights for. Before the name an unlit lamp cannot say whether a token is unused or expired. The words beside the lamp say which.
- **GLM, first loop: a 4 to 8 px cyan rule on the block, "the system's alert pattern".** The console has no such pattern. Its left rules are C14's: 2 px cyan for the open thread, 3 px amber for an escalation. F takes the 2 px cyan rule.
- **Gemini and GLM, compare loop: the dashed ring blurs into a solid ring at 1x in the light theme, so shorten the dashes, thicken the stroke or add a faint fill.** At 8x magnification of the 1x shot the ring shows separate dashes with clear gaps all round, in both themes. The light theme's dashes are lighter at their anti-aliased ends, and the accent on the panel measures 5.6:1 light and 9.9:1 dark, above the 3:1 a graphic needs. A CSS dashed border cannot set its dash length, and a 1.5 px stroke renders unevenly at 1x. The ring stays a 1 px dashed border. The words carry the label too.
- **GLM, compare loop: a dashed circle reads as a placeholder, a load or an error.** The risk is real for a ring alone, which is why F keeps the words "via claude-laptop" beside it. Gemini read the ring as "the human at a remove".
- **Gemini, compare loop: make "shown once" amber.** Amber is the factory's needs-you: a card that waits on the human. The block answers the human's own press and waits on nothing of the factory's. Amber there would teach that the needs-you colour also means "read this".
- **GLM, compare loop: add a "Copied" confirmation.** It was already built. The button reads "Copied" after a press, which a still frame cannot show. The lab's check presses Copy and asserts the clipboard and the word.

## Fixes found on the way

The lab and the page had seven faults that this round fixed beside the pick, because every candidate stood on them.

- The lab's structural check was red at 9f0444c2. It counted every stacked row of the Notifications page on the phone and expected five, and the Tokens section added a sixth. It now counts the rows of the two messenger tables.
- The lab answered 404 to every POST of the Notifications page, because the console mounts those routes at its start, before the lab set its messengers. The lab now starts the console again after that, so the made state is the real answer to the real form.
- The Notifications page showed no destinations in the top bar. It now shows C23's bar with Notifications in cyan, as the other secondary pages do.
- Every select in the light theme lost its chevron, because a light rule reset the whole background. The rule now sets the colour only.
- The page's tables broke names and dates over two or three lines at 1440 px, for example `ai-software-factory-code` as four lines. C19's reference sets them on one line. Cells now keep one line above 900 px.
- The token form's Name field had no type, so it took no field style and showed as a grey box in the dark theme. It is a text field now. The caption and the block's words lost their semicolons.
- A row header drew its bottom rule in the column header's stronger line, so every row of the page's tables, and of the Costs page, showed a darker segment under its first cell. A row header now takes the row's own hairline. This came after the critics' loops, so their F shots still show the darker segment. The F shots in this round are the build's.

## Cost and time

Eight critic calls at $0.03 each by `tools/img.py`'s estimate: $0.24 of the $3 cap. No image generation. The real figures sit in the fal and Z.ai dashboards. The round took one session on 2 November 2026.

## Evidence

[shots/](shots/) holds every shot by candidate and theme: `before` is 9f0444c2's markup over the same lab scenario, then A, B, C and F. The sheets the critics judged are the `sheet-*.png` files and the files in [compare/](compare/). The lab's structural check passed on the base markup after the check's own fix, and on the built pick: the lab's full run of 361 shots, then the check again on the final build after the row header's fix and the project's name.
