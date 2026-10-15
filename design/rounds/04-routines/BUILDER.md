# The builder's brief, round 04

You build one variant of the Factory console's project screen that gives the routines a home. Read, in this order, before writing a line: [brief.md](brief.md) (what the round designs, what is fixed, the moment), [../../../docs/routines.md](../../../docs/routines.md) (what a routine is, the rules that remove the surprise), [routines.js](routines.js) (the data of the four moments), [../../themes/06-mission-control/DESIGN.md](../../themes/06-mission-control/DESIGN.md) (the token ladder and the rules), your variant's direction images in this folder (`01-ghost-card-*.png`, `02-panel-column-*.png`, `06-inbox-standing-row-*.png`, `07-routine-drawer-*.png`, `08-column-head-*.png`) and the base file.

The base: copy `../02-multi-chat/instrument/index.html` to `<variant>/index.html`. It is the Mission control prototype with the thread table, the inbox, the pokes, the level control, the find box, the column menus, the drawer and the four columns of C8. Its script tags load `../../../prototypes/scenarios.js` and `../multichat.js`; from your folder those become `../../../prototypes/scenarios.js` and `../../02-multi-chat/multichat.js`, and you add `../routines.js`. Keep the shell as it is. Change nothing the round does not design.

## The moments

`?scenario=due|filed|held|audit` picks the moment (`window.ROUTINES.moments`), default `due`. Every moment draws the busy board and the busy threads of the base, then adds `ROUTINES.cards(moment)` to their columns (a card with `routine` carries the chip, see below; a card in `needs-you` is a human card with its `need` line and its actions; a card in `in-progress` shows its `activity`) and `ROUTINES.pokes(moment)` as the newest turns of the inbox thread, each with its `decider` line and its `choices` as choice buttons. The scenario switch of the base (`#scenario`) lists the four moments by their `momentWords`.

## What every variant shares

The three variants differ in the home only. They share, built the same way:

1. **The chip.** A card a routine filed carries a small mono chip `↻ routine` on its face, in the faint colour, after the state row. Class `rt-chip`. Quiet: it is a normal state.
2. **The provenance line.** The drawer of such a card (`#790`, `#781`, `#779`, `#792`) shows under its top block one line, class `rt-prov`: `ROUTINES.provenance(card)` with the routine's name as a button `[data-open-routine="<id>"]` that opens the routine's drawer, and the last run's outcome after it ("last run #781 merged in 2 days").
3. **The routine's drawer.** A routine opens in the same drawer as a card: the title `↻ Weekly bump`, the mono subtitle `routine · every Monday 06:00 · human card · next in 20 min`, three tabs Overview, Runs, Config. Overview: a four-line top block (next, last, while open, tells), then the acts as two quiet outlined buttons, then the collapsed sections "The brief" (`ROUTINES.brief`), "Runs (14)" (the first three rows), "Config" (the yaml). Runs: every row of `ROUTINES.runs` in the style of the drawer's Time section (C10): the time in mono, the card ref as a link, the outcome word in its hue (merged green, no change grey, closed grey, skipped grey, 3 findings amber, running cyan, failed red), the duration right aligned, the cost, the note on its own line below 720 px. Config: the yaml in a `pre`, the line "A change of rhythm is a configuration change. Ask the project agent; it proposes the commit.", and a button "Propose a change in the chat" that puts "Change the weekly bump to " into the composer and focuses it. The held moment's routine shows its `held` line in the amber text colour in the top block.
4. **The acts.** `Skip once` and `Run now` as small quiet buttons, `[data-act="skip"]` and `[data-act="run"]`, wherever a routine row or card shows them. A click shows a one-line confirmation in place, class `rt-confirm`: Skip once gives "Skipped once · next Mon 20 Oct 06:00" with an "undo" link; Run now gives "Filed #790 in Needs you" and adds the filed moment's `#790` card to Needs you. No backend.
5. **The jobs.** The two cluster jobs of `ROUTINES.jobs` are listed in the home, under a hairline, in the faint colour, read-only, with "jobs of the cluster" as their label.
6. **The states.** A routine on time whispers: the muted colour, no mark. A due run (under an hour) names its time in the text colour. A held run says `held: #781 is still open` in the amber text colour. A running run carries the breathing cyan dot of the theme. Colour is never the only signal.
7. **Hooks.** `#routines-home` on the home's element. `[data-routine="<id>"]` on every routine row or ghost card. `[data-open-routine="<id>"]` on whatever opens a routine's drawer. `.rt-chip`, `.rt-prov`, `.rt-confirm`. Every new class starts with `rt-`, so the check can measure its contrast.
8. **The phone.** At 390 the home becomes one row or one list in the single column, no horizontal scroll, every target 44 px. Say in your report how the home reads on the phone.
9. **Tokens only.** No new colour. Every new text pair at 4.5:1 or better in both themes on the surface it sits on. The check measures every `rt-` element.

## The three variants

### panel (direction 02, with 07 as the depth)

The home is the expanded status panel. The instrument strip's panel (opened by `#status-toggle`) gets its fourth column titled "Routines" in small capitals: one row per routine, `[data-routine]`, "Weekly bump · Mon 06:00 · in 20 min" with the acts at the row's right on hover and focus, then the jobs under a hairline, then the configuration row the panel has today. The name of each row is the `[data-open-routine]` button. The strip itself, folded, gets one quiet cell only when a run is under an hour away or held: "↻ bump in 20 min" in the muted colour, or "↻ bump held" in the amber text colour; otherwise nothing new. The board stays as it is apart from the chip.

### board (direction 01 with 08, 07 as the depth)

The home is the board. The Queued column's head carries, right of its count, a quiet mono button `#queued-due` "↻ 2 due this week ▾" that opens `#routines-home` as a menu under the head: every routine as a row with its next and last and the acts, the jobs under a hairline, and a foot "all routines" that opens the drawer of the first. At the foot of the Queued column, under the real cards, the next due routine (under 24 hours, or held) sits as a ghost card: a dashed hairline border, no fill, the title "↻ Weekly bump" as the `[data-open-routine]` button, the mono state row "due Mon 06:00 · in 20 min · human card", the acts as ghost buttons. A held routine's ghost says "held: #781 is still open" in the amber text colour. The Audit, counted in merges, shows as a second ghost "↻ Audit · after 6 more merges" only in the due moment. The strip stays as it is.

### chat (direction 06, 07 as the depth)

The home is the inbox thread. Under the inbox's head, above the log, a pinned panel `#routines-home` titled "Routines" in small capitals: one row per routine with the acts at the right, the jobs under a hairline. A fold toggle `[data-rfold]` at the panel's head folds it to one line "↻ 4 routines · next bump 06:00" and back; on the phone it starts folded. The due moment's poke at 05:40 ("In 20 minutes I file the weekly bump card…") carries the choices "Skip this week", "Run now", "Fine"; a choice answers in place as the base's pokes do. When another thread is open the home is not visible: the inbox row's badge counts the poke. Say in your report whether the pre-announcement poke should exist at all, given that routine work whispers (docs/routines.md, rule 7).

## Check and shoot yourself before reporting

```
cd /home/womb/repos/worktrees/asf-periodic-tasks/design/rounds/04-routines
NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright node check.js <variant>
NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright node shoot.js <variant>
```

`check.js` must print `ok <variant>`. Look at every PNG in `<variant>/shots/` yourself and fix what is wrong: cut-off content, overlaps, unreadable text, a home louder than the pulse or the Needs you column, a drawer over the chat, a phone layout with a horizontal scroll, a light theme that is only an inverted dark one. Compare the due dark shot with the direction's image: same idea, the prototype's own craft.

Report: the file path, the check's output, how the home reads on the phone, what you deviated from the images and why, your answer to the variant's question, and anything you could not make work. Do not commit.
