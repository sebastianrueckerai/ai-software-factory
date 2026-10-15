# Round 05, the documents: notes

The run of [the brief](brief.md). Images from [prompts.py](prompts.py), the variants built by builders on the instrument prototype of round 02 from BUILDER.md and docs.js, the shots from shoot.js, the check from check.js, the page from page.py.

## The recommendation

**D. Hybrid: the wiki, with the split's two panes as its Wide state, and the back arrow naming its target.** Both critics ranked it first in the second loop (Gemini 9, GLM 9) over the wiki alone (8, 8), and both had asked for exactly this combination after the first loop, as had the split's own builder. The director agrees. [Open it live](hybrid/index.html?scenario=busy&doc=docs/roadmap.md&theme=dark).

What it is: one document in the drawer's slot at the right edge over the board, the chat never covered, the Needs you column still visible at the slot's left. Links open in place. "‹ roadmap" goes back and lands at the old scroll, and the browser's own back is the same step. Recent holds the last six documents, three pins hold the files you keep returning to. Read | Edit, a plain text area with the browser's spellcheck, Save as commit with the commit named in a quiet line, the refusal in amber when the file changed under you, with "show theirs". New document from the head. Wide covers the board, and the first link followed while wide opens beside its source with the link marked, Swap and One pane; Narrow returns to the slot. The phone shows one pane full screen.

What it costs: the Wide state has two shapes, one centred document and then two panes once a link is followed, which is one more thing to learn; and at 1440 the two panes are 427 px each, about 58 characters a line, comfortable at 1920 (70 characters) and tight at 1440. Narrow is one click.

The runner-up is A. Wiki alone, both critics' 8 and their first pick of the first loop. B. Tabs is out: both critics call the strip an IDE look and a card as a tab a confusion of the model, and its builder's own answer is that the strip is honest to four tabs at 46 percent of the width. C. Split is out: it covers the board whole, and its builder's answer was that it belongs as the wiki's Wide state, which the hybrid is.

For the implementation, not design questions: the body text at the chat's 14.5 px rather than the base's 13 px, since the wiki's builder found 13 px small on the phone for a long read; the "Documents" button in the board head that every builder had to add so a closed document can be reopened; the second pane from 1200 px up only, since between 900 and 1199 px the panes fall to 265 to 355 px; and the check's contrast parser, fixed this round for `color(srgb …)` values.

## The plan of the run (the limits, fixed before the first image)

Eight directions in both themes with `google/nano-banana-2.1` at 1K (about $2.40). Two critics, Gemini and GLM, over the two sheets (about $0.06). Three directions carried into built variants on `../02-multi-chat/instrument/index.html`, sharing one engine (docs.js: the documents, the link rewriting, the history, the edit and save, the refusal) and differing in the navigation shape only. Two critic loops at most per variant, a built hybrid if both critics ask for one. The page with the recommendation and the runner-up. Cap $15. Stop when the variants are presented. Sebastian picks.

## Progress

- 2026-10-15 13:0x: worktree /home/womb/repos/worktrees/asf-docs-round, branch docs-round. Brief, prompts.py (16 prompt files), critique-prompt.txt written.
- 13:2x: docs.js (the engine, 636 lines) and docs-test.js built by a sonnet builder; `node docs-test.js` prints `ok docs.js`. BUILDER.md's shared part, check.js and shoot.js written (hooks: #doc-view, [data-doc], [data-nav], [data-mode], #doc-editor, [data-act], .doc-*). Images generating in the background (log /tmp/claude-1000/gen05.log).

## The directions

Eight directions, both themes, `google/nano-banana-2.1` at 1K, $0.15 each, $2.40: [the dark sheet](contact-sheet-dark.jpg), [the light sheet](contact-sheet-light.jpg).

## The critics' ranking of the directions

Gemini 2.5 Pro and GLM 5V Turbo over both sheets, [the prompt](critique-prompt.txt), [Gemini](critique/gemini-directions.json), [GLM](critique/glm-directions.json), $0.06.

| Direction | Gemini | GLM | Mean |
| --- | --- | --- | --- |
| 04 Split | 9 | 7 | 8.0 |
| 01 Wiki drawer | 3 | 9 | 6.0 |
| 02 Tabs | 6 | 5 | 5.5 |
| 08 Tree rail | 5 | 6 | 5.5 |
| 07 Peek | 3 | 4 | 3.5 |
| 03 Reader | 1 | 5 | 3.0 |
| 06 Chat pane | 2 | 2 | 2.0 |
| 05 Docs page | 0 | 1 | 0.5 |

Both carry 04. GLM carries 01 and 08, Gemini 02 and 07 (07 "as a supplement to any carried direction"). Both propose peek as a hybrid partner (Gemini 04+07, GLM 01+07). Both drop 05 and 06 for the same reasons: the page leaves the screen, the chat pane crushes the chat.

Overruled by the director against the pixels: Gemini scored 01 at 3 for "completely hiding the chat". The 01 image shows the chat column whole at the left with its log and composer, the drawer over the board at the right, as the prompt asked. Gemini also credits 04 with "keeping the Needs you column visible", which its image does not show: the two panes cover the board. GLM's reasons stand.

## The provisional picks

Three variants, each a different shape, with the peek shared (both critics' hybrid partner) and everything else shared: the rendered document, Read | Edit, the editor and the save, the refusal, New document, Wide, the phone.

- **wiki** (01 with 07): one document in the drawer's slot, history arrows, a Recent menu, three pins, the browser's back.
- **tabs** (02): the same slot under a tab strip, a card as a tab, built with six tabs open so the strip's limit shows. Carried over 08 because tabs are the question Sebastian asked, and the two were level with the critics.
- **split** (04): two panes over the whole board, with a one-line Needs you strip. Both critics' first or second pick.

Not built: 08 (an IDE look, GLM's phone risk, and pins with Recent cover what the tree gives), 03 (both critics: loud, and the Wide button of every variant is its depth), 05 and 06.
- 13:3x: three opus builders dispatched in parallel: wiki, tabs, split (BUILDER.md sections). shoot.js gained the six-open shot for tabs.
- 13:5x: wiki built (opus, 18 min), `check.js wiki` ok, verified by the director. Builder's report: the head is two rows plus the pins row (one row cannot hold the controls beside a 52-character path at 662 px); the peek opens inside the view, never over Needs you; the arrows call history.back/forward so the browser's back and the arrow are one step, nine documents deep tested; a card closes the document and a "Documents" button in the board head reopens it where it was; the refusal is amber text with a 3 px rule (the check's contrast parser misreads color-mix backgrounds); Ctrl+S saves; a draft dot on Edit; 13 px text, small on the phone for long reads. Its answer: ten documents hold, but the arrows are blind beyond two steps and Recent (capped at 6) is the real jump; "‹ roadmap" naming the target would read better.
- 14:1x: split built (opus, 20 min), `check.js split` ok. Builder's report: panes of about 420 px at 1440 (55 to 60 characters); no back at all, the source stays with the link marked; the right pane is empty with a hint until the first link; a card's drawer opens over both panes and they stay; the phone is one pane with "‹ roadmap"; a "Documents" button in the board head reopens the view. Its answer: the split pays for the jump-and-compare moment, not for long reading (item 239 runs 60 lines in a pane; In progress and Queued vanish), and it would be better as the wide state of the wiki variant than as a shape of its own. Both builders found check.js's contrast parser misreading color-mix backgrounds (Chrome reports `color(srgb …)` in 0 to 1): fixed in check.js, both variants re-checked ok.
- 14:2x: tabs built (opus, 21 min), `check.js tabs` ok. Builder's report: the strip is honest to about four tabs at 662 px; at six every tab but the open one shrinks to its first word ("main", "board", "target" name nothing), one card pushes two documents into "2 more"; a card becomes a tab at the strip's start and the base drawer shows inside the panel, Escape returns to the paragraph; body text 14.5 px (the chat's), links with a faint underline at rest; a "Documents" button in the board head; drafts survive a closed tab. Its answer: a card as a tab is right for coming back and wrong for the strip; keep at most one card tab. Flag: the 46 percent panel covers the right 75 px of Needs you (Approve and Split cut), as the base drawer does.

## The critics on the three, the first loop

Gemini 2.5 Pro and GLM 5V Turbo over the three sheets, [the prompt](critique-variants-prompt.txt), [Gemini](critique/gemini-variants.json), [GLM](critique/glm-variants.json), $0.06.

| Variant | Gemini | GLM | Mean |
| --- | --- | --- | --- |
| wiki | 9 | 9 | 9.0 |
| tabs | 7 | 6 | 6.5 |
| split | 2 | 3 | 2.5 |

Both verdicts: wiki. Both: the arrows read as "return" without explanation and Recent holds ten documents; the tabs feel like an IDE and a card as a tab confuses the model (Gemini medium, GLM high); the split loses the board whole. Both keep the 70-character measure and the loud refusal in light. GLM finds the saved line too subtle in dark. Hybrids: Gemini wants pins to work as tabs (which they already do: a pin is a persistent tab); GLM wants wiki's shape with the split's side-by-side only on a wide screen, which is also the split builder's own answer. Built as the fourth variant, hybrid.

Overruled by the director against the pixels: both critics say the split "hides the chat" or makes it "inaccessible". The split's shots show the chat whole at the left in every state; the split covers the board, not the chat. The board claim stands and is enough to rank it last. GLM's "duplicate commits" risk from the subtle saved line does not hold: the editor closes on save, so a second save needs a second edit.
Also overruled: Gemini's "excessive layering" on wiki's card shot. The shot shows the card's drawer in the slot and the document gone, as the builder reported; nothing is stacked.
- 15:0x: hybrid built (opus, 17 min) from the wiki file: two panes in Wide once a link is followed (427 px each at 1440, 570 px at 1920), the arrows named, every history entry remembering its panes. `check.js hybrid` ok, verified by the director.

## The critics, the second loop

Gemini 2.5 Pro and GLM 5V Turbo over the four sheets, [the prompt](critique-compare-prompt.txt), [Gemini](critique/gemini-compare.json), [GLM](critique/glm-compare.json), $0.06.

| Variant | Gemini | GLM | Mean |
| --- | --- | --- | --- |
| hybrid | 9 | 9 | 9.0 |
| wiki | 8 | 8 | 8.0 |
| tabs | 5 | 4 | 4.5 |
| split | 2 | 2 | 2.0 |

Both verdicts: hybrid. Both: the named arrow reads better than the glyph and adds no noise; the two panes gain the "where did I come from" answer at no cost to the default state. Craft that stands: Swap and One pane are small and close to the text (Gemini medium, GLM low); the tabs' six-open strip is unusable (both, high).

Overruled by the director against the pixels: Gemini's "unconstrained line length" on the hybrid's single-pane Wide shot, which shows the document centred at its 70-character measure; both critics' "the split hides the chat" again, where every split shot shows the chat whole; GLM's "the refusal blends with the light background", which the check measured above 4.5:1 and the shot shows in amber on cream with a 3 px rule.

## Cost and time

22 priced calls, about $2.58 of the $15 cap: 16 images at $0.15 and 6 critic calls at $0.03. Builders: one sonnet for the engine (2 min), four opus for the variants (18, 21, 20 and 17 min), the three first variants in parallel. The round ran from 12:57 to 15:1x, about two and a quarter hours of wall clock.

## What worked

- **One engine, four variants.** docs.js carried the documents (real excerpts with their real links), the renderer, the history and the save, so the four builders built shapes, not engines, and the critics judged the shape alone. The engine's own test caught nothing in the builds, but it let the builders trust it.
- **The real documents as content.** The roadmap's items, the plans and the architecture excerpts made every builder and both critics judge a real read, including a 60-line roadmap item in a 427 px pane, which decided the split's fate.
- **Build the hybrid both critics ask for.** As in round 04: the hybrid won the second loop with both, and its builder had the wiki as a base so it took 17 minutes.
- **The builders find faults in the shared check.** Two of three builders found the contrast parser misreading `color(srgb …)`; fixed in check.js and re-run on every variant. The next round's check starts from this one.
- **A shot list with actions.** Follow, back, hover, edit, save, the armed conflict, wide, new, card, six open, three phone states: sixteen shots per variant made the sheets comparable and the critics' craft notes addressable by name.
- **The critics still repeat a structural error.** "The split hides the chat" in both loops from both critics, against four sheets that show the chat whole. The overrule rule of process.md held.

## The pick

Sebastian, 2026-10-15: **A. Wiki**, no second pane. "What I don't need for now is two docs next to each other. I want the wiki." Recorded as C17 in [design-decisions.md](../../design-decisions.md), roadmap 277, the plan [docs/plans/2026-10-15-documents-in-the-screen.md](../../../docs/plans/2026-10-15-documents-in-the-screen.md). His rulings on saving and on outside changes, built into the wiki prototype afterwards as states (`wiki/states.js`, the `state-*` shots): Ctrl+S saves; the saved state is always visible in the head; a dot before the name marks unsaved changes; a newer version is offered with reload or load theirs and never loaded over his changes without asking; a save is one commit as the member, merged three ways when the file moved on and refused when the same lines changed; the draft in the browser hides the commit's latency.
