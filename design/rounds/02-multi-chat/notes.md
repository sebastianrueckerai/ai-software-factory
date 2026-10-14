# Round 02, multi-chat: notes

The run of [the brief](brief.md), roadmap 239. Images from `prompts.py`, the variants from `build.py` on the Mission control prototype, the shots from `shoot.js`, the check from `check.js`, the contrast from `contrast.js`.

## The directions

Eight directions, both themes, `google/nano-banana-2.1` at 1K, $0.15 each: [the dark sheet](contact-sheet-dark.jpg), [the light sheet](contact-sheet-light.jpg). The prompts share one head (the fixed shell, no ticker, the find box and the menu marks of C13) and one content block (the four threads, the archived one, the inbox's badge, the level, the composer's command hint), and differ in the placement of the switcher and the level selector.

The director's view from the sheets, before the critic:

- **01 Rail.** One-line rows at the chat's left, the time at the right, the badge and the working dot the only loud marks. Reads at once. The level as a segmented control in the chat's head crowds the head at 40 percent.
- **02 Tabs.** Tabs across the chat's head. Four threads fit, eight do not, and at 390 the row scrolls sideways. The level as a select in the top bar is a quiet placement.
- **03 Title menu.** One title that opens the list. The chat keeps its full width and the list is the cleanest of the eight, but every other thread's state hides behind a click, so a working mark or a badge on another thread is not seen.
- **04 Dock.** Chips above the composer. The list sits between the log and the box, where the eye goes to write. Does not scale past five.
- **05 Command.** The composer as the one control, the list behind ctrl+k. Monitoring fails for the same reason as 03.
- **06 Instrument.** A mono table at the chat's left, the level as four lamps in the strip. The most Mission control of the eight. The lamps make the level a stated fact of the project, not a control of the chat.
- **07 Messenger.** Two-line rows with the newest line. The preview says what happened without opening the thread, which is what the inbox needs most. Risk: a consumer-app look.
- **08 Inbox split.** The inbox as its own region on top. It answers "where is the inbox" loudest, and takes a third of the chat's height for a thread that is quiet most of the day.

## The critic's ranking of the directions

Gemini 2.5 Pro over both sheets, [the prompt](critique-prompt.txt), [the verdict](critique/gemini-directions.json), $0.03.

| Direction | Score | The critic's reason, shortened |
| --- | --- | --- |
| 06 Instrument | 9 | The Mission control idiom, a dense scannable panel. |
| 01 Rail | 8 | At a glance, a proven path to the phone. The level placement is not ideal. |
| 02 Tabs | 6 | The best level placement (the top bar), the worst scaling and phone. |
| 08 Inbox split | 5 | Names the inbox right, wastes the height, risks the hierarchy. |
| 07 Messenger | 5 | Suited to the phone, a consumer look, loud marks risk the hierarchy. |
| 05 Command | 4 | Hides the threads' state. |
| 03 Title menu | 2 | Hides the threads' state. |
| 04 Dock | 2 | Does not scale, scrolls sideways on the phone. |

The critic carries 06, 01 and 07, and says what each prototype must prove: instrument that the table becomes one list at 390, rail that the level can leave the chat's head, messenger that its look can be hardened to the idiom and its marks toned down. On the level selector the critic prefers the instrument strip or the top bar over the chat's head: a project policy, stated, not a control of one chat. On the inbox the critic prefers 01 and 06: a fixed first row with its own mark, otherwise like every other thread. The critic's one note on what every direction misses: a working mark distinct from unread.

Carried: **rail, instrument, messenger.** The director agrees with the critic's three. Tabs and dock fail the phone rule of the brief, which is fixed. Title menu and command fail monitoring. Inbox split spends the chat's height on the quiet case.

## The variants

Three one-file prototypes from `build.py`, each the Mission control prototype with the chat rebuilt for threads and the shell at the console's state of 2026-10-14 (no ticker, the find box, the menu marks, no accent select). One chat engine in all three: the list by last turn with the inbox pinned first, the unread badge on the row and in the tab title, the working mark, the inbox's pokes as agent turns with choices, the escalation's choices beside the text box, Archive and Delete with the hard-delete warning, the "/" palette with `/compact` and `/new`, the level change with its confirm that names the policy change and the audit. The variants differ in the switcher's rows and placement and in the level's placement:

| Variant | The switcher | The level | The thread's actions |
| --- | --- | --- | --- |
| rail | one-line rows, mark, title, time, in a rail at the chat's left | a segmented control in the chat's head | a ⋯ menu on the open thread |
| instrument | a mono table, mark, thread, last, at the chat's left | four lamps in the instrument strip | Archive and Delete… as text buttons on the open thread |
| messenger | two-line rows, a round mark, the title, the newest line, the time; the archived folded | a select in the top bar beside the project; on the phone in the chat's head | a ⋯ menu on the open thread |

The scenarios of the brief as `?scenario=`: busy, threads, poke, assisted, escalation. Each variant shot in both themes at 1440, in the delete warning, the palette and the level confirm, and on the phone at 390 (`shoot.js`), 12 or 13 shots each.

### What the build taught

- The prototype's `.open` class is the card opener (display block, no padding). A thread row with the same class lost its layout. The row's state class is `.on`.
- A horizontal rail of chips at 390 is a second horizontal scroll, which the critic named as the phone's risk. Every variant now shows the list as one vertical list above the log on the phone.
- The lamps live in the pulse band, which re-renders itself. The variant's strip parts are re-inserted after every pulse render.
- The escalation's choices appeared twice, in the turn and in the answer row. Now once, beside the text box; the turn keeps the question.
- The instrument strip has no room for a label and four lamps at 390. There they go under the label as a 2 by 2 grid.
- The top bar has no room for a select at 390 beside the project. Messenger's level moves into the chat's head on the phone.

### The check

`node check.js`: for each variant the words, the badge on the row and in the title and its clearing, the inbox pinned first, a poke's choice answering, archive and restore, the delete warning's words and its keep and delete, the "/" palette, `/compact` leaving a summary and the last two turns, `/new`, the first message naming the thread, the level confirm's words, keep and set and the poke it leaves, Escape, Ctrl+k, the threads' order and working marks, the poke's badge, the deciders, the escalation's answer row and its answer, no horizontal scroll at 390, 44 px targets on the phone, and every text pair of the new parts at 4.5:1 in both themes in six states. Green on all three.

`node contrast.js` gives the ratios in [contrast.tsv](contrast.tsv): the lowest is a row's time, faint on the panel, at 4.7 dark and 4.9 light.

## The critic's verdict on the variants

Gemini 2.5 Pro, one sheet per variant alone ([rail](critique/gemini-rail.json), [instrument](critique/gemini-instrument.json), [messenger](critique/gemini-messenger.json)), then the three compared ([the verdict](critique/gemini-compare.json)). Alone, all three score 9 or 10 on the eight things and differ on craft: rail 7, instrument 6, messenger 8. Compared: messenger 9, instrument 6, rail 5. The critic picks messenger for the two-line rows' context and the phone, names instrument's table as a phone risk (the built phone shot shows one list), and calls rail's level in the chat's head a tactical toggle. On the level the critic preferred the strip over the directions and the top bar compared; both times not the chat's head.

Craft notes taken in the one fix loop: the thread head's title ends in an ellipsis (it was a flex box, which cannot), the rows gained 2 px, the answer buttons wrap. Not taken: padding in the prototype's own bubbles, the spacing of the chips under the box, the archived label's alignment with New.

## The recommendation

Messenger's rows with instrument's lamps for the level, the thread's actions behind the ⋯. If one variant as built: messenger. The reasons are on [the round page](index.html).

## Cost

| What | Count | Each $ | Total $ |
| --- | --- | --- | --- |
| direction images, nano-banana-2.1 at 1K | 16 | 0.15 | 2.40 |
| critiques, Gemini 2.5 Pro | 5 | 0.03 | 0.15 |
| the round | | | 2.55 |

The round's cap was $15.
