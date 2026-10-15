# Round 04, the routines: notes

The run of [the brief](brief.md). The factory's side is [docs/routines.md](../../../docs/routines.md). Images from [prompts.py](prompts.py), the variants built by three builders on the instrument prototype of round 02 from [BUILDER.md](BUILDER.md) and [routines.js](routines.js), the shots from [shoot.js](shoot.js), the check from [check.js](check.js), the page from [page.py](page.py).

## The recommendation

**D. Hybrid: the ghost card on the board, the strip's cell, the Routines column in the status panel.** Both critics asked for it after the first loop, and both ranked it first in the second (Gemini 10, GLM 9). The director agrees. [Open it live](hybrid/index.html?scenario=due&theme=dark).

Three places, one job each, in the order of loudness the console already has. The instrument strip names a run only when it is under an hour away or held: "↻ bump in 20 min" in the muted colour, "↻ bump held" in amber. The board announces the next due routine as a dashed ghost card at the foot of Queued, where the card will land, with its time and its acts, and the Audit ghost under it counts merges. The expanded status panel holds the one list of every routine (name, rhythm, next, last), the cluster's jobs under a hairline, and the configuration line, in the place C7 made for depth. A routine's own drawer holds its runs and its configuration, and a filed card says on its face and in its drawer which routine filed it. Nothing is shown twice: the board's "due" menu of variant B is gone.

What it costs: one cell in the strip, seen only when a run is near or held, and one more column in a panel that opens on click. What it answers: the member sees the next run without a click and without being told where to look, a card never surprises, the list has one home, the acts sit where the member reads, and a change of rhythm goes through the chat as a configuration commit.

The runner-up is B. Board alone, both critics' first pick of the first loop, with its list in the Queued head's menu. A. Panel is third: the best list, and the strip's cell carries the announcement, but the ghost card's "where the card will land" is missing. C. Chat is out: the home is gone whenever another thread is open, and the builder and both critics agree that the poke before the run is a notification for a normal state.

Two things for the implementation, not design questions: the strip's cell and the ghost card must read as one system (Gemini's one craft note on the hybrid), which the same ↻ glyph and the same words do, and the ghost card's text on the phone wraps to five lines and wants one line fewer.

## The pick: C16

Sebastian picked the hybrid on 2026-10-15 and amended it: every routine of the project stands as a ghost card at the foot of the lane its card will land in, so all of them are in view, with a control in the board's head that hides the far ones or all. The status panel's Routines column is out, since the board holds the one list. The strip's cell, the chip, the provenance line and the routine's drawer stay. The main chat creates, changes and deletes routines through tools. The schedule is any mix of a cron pattern, a merge count and an event, stated in words on the card. Run now files the card at once and the autonomy level decides the start. Routines are per project. The word: the thing is a routine, its rhythm line is its schedule. Recorded as C16 in [design-decisions.md](../../design-decisions.md), with [ia.md](../../ia.md), [the inventory](../../inventory.md) and [the theme](../../themes/06-mission-control/DESIGN.md) updated. The factory's side, with the clock as Temporal Schedules and store counters reconciled from the configuration tree, is in [docs/routines.md](../../../docs/routines.md) and roadmap 267.

It shipped in the code repository as 68ff141 on 2026-10-15, through a plan of thirteen tasks with a review after each and one review of the whole branch. The ghost cards stand at the foot of their lanes with the schedule and the next run in words, the control in the board's head keeps the choice in the URL, the strip's cell names a run under an hour away or a held one, the chip and the provenance line sit on a filed card, the drawer has Overview, Runs and Config with Skip once and Run now, and the chat has five tools. The cluster's CronJobs and CNPG's ScheduledBackup list on the infra project's Resources page. The lab's structural check covers the ghosts, the control, the drawer, both acts and the phone's targets: green. One thing the images could not show came up in the build: the strip's word is the routine's name's last segment ("bump", "pass") and not a word of the card's title, which said "inputs". The shipped views from the lab: [the board with its ghosts, dark](shots/shipped/routines-1440-dark.png), [light](shots/shipped/routines-1440-light.png), [the far ones hidden](shots/shipped/routines-hidden-1440-dark.png), [a held run in the strip](shots/shipped/held-1440-dark.png), [the routine's drawer](shots/shipped/routine-drawer-1440-dark.png), [the phone](shots/shipped/phone-ghosts-390-dark.png).

## The directions

Eight directions, both themes, `google/nano-banana-2.1` at 1K, $0.15 each, $2.40: [the dark sheet](contact-sheet-dark.jpg), [the light sheet](contact-sheet-light.jpg). The prompts share one head (the fixed shell of 2026-10-15 with the thread table and the moon and sun selector), one content block (the four routines and the two jobs at Monday 05:40, the two done cards with the chip, the acts) and differ in the home.

The director's view from the sheets, before the critics:

- **01 Ghost card.** The dashed card at Queued's foot says "due Mon 06:00 · in 20 min" where the card will land. The image also drew a Routines panel at the board's right that the prompt never asked for, and the critics praised that panel. The direction is the ghost card alone.
- **02 Panel column.** The Routines column in the expanded panel looks like it was always there: the same hairlines, the same small-capitals head, the jobs under a rule. It needs the strip's click, so the announcement is one click away unless the strip itself says something.
- **03 Routines page.** The cleanest table of the eight, with the runs under the selected row. It leaves the screen, and the brief's first rule is that the next run shows where the member already looks.
- **04 Policy in force.** The configuration as a table beside the stages. Right as the record of what is configured, wrong as the place a member looks for "what happens next".
- **05 Schedule tape.** The fourteen-day tape reads as a timeline, a new idiom in a screen of lists. The image model drew the chat badly around it. It fails on the phone.
- **06 Inbox standing row.** The pinned Routines panel under the inbox's head and the factory's poke read well together. When another thread is open, the home is gone, and the poke at 05:40 for a 06:00 run is a notification for a normal state.
- **07 Routine drawer.** A routine opened like a card: Overview, Runs, Config. The right depth for every home, and no home by itself.
- **08 Column head.** "↻ 2 due this week ▾" in the Queued head with its menu. The lightest on the screen. The menu is a popover, so the next run is a click away, and the head line alone must carry the announcement.

## The critics' ranking of the directions

Gemini 2.5 Pro and GLM 5V Turbo over both sheets, [the prompt](critique-prompt.txt), [Gemini](critique/gemini-directions.json), [GLM](critique/glm-directions.json), $0.06.

| Direction | Gemini | GLM | Mean |
| --- | --- | --- | --- |
| 01 Ghost card | 8 | 8 | 8.0 |
| 02 Panel column | 6 | 9 | 7.5 |
| 06 Inbox standing row | 9 | 6 | 7.5 |
| 08 Column head | 3 | 7 | 5.0 |
| 07 Routine drawer | 5 | 4 | 4.5 |
| 05 Schedule tape | 4 | 5 | 4.5 |
| 03 Routines page | 1 | 3 | 2.0 |
| 04 Policy in force | 1 | 2 | 1.5 |

Both carry 01 and 02 and both propose 01 with 02 as a hybrid. Gemini's third is 06, GLM's third is 08. Both drop the two pages for the same reason: they hide the announcement. Both drop the tape for the phone. Gemini scored 01 for "the dedicated panel for the list", which is the image model's addition, not the direction. GLM flags 06 for loudness: the chat layer outranking the amber column. Gemini's note: no direction shows how a skipped or failed run looks afterwards. GLM's note: the cluster's jobs need their own quiet group, apart from the routines that file cards.

## The provisional picks

Three variants, each a different home, so the comparison is clean. Everything else is shared: the chip on a filed card, the provenance line in its drawer, the routine's own drawer (07's depth), the acts, the jobs under a hairline. The held and the skipped run are moments and rows in every variant, which answers both critics' notes.

- **A. Panel** (02 with 07): the status panel's Routines column. The strip, folded, names a run only when it is under an hour away or held.
- **B. Board** (01 with 08 and 07): the ghost card at Queued's foot and the "due this week" menu in the head.
- **C. Chat** (06 with 07): the pinned Routines panel under the inbox's head, foldable, and the factory's poke. Built as Gemini's first pick, with GLM's loudness risk as its question.

Not built: 03 and 04, since both critics and the director find that a page hides the announcement. The Policy page stays the read-only record of the configuration in force, and a Routines table belongs there once routines are configuration, without being the home. 05 is not built because of the phone.

## The variants

Three builders, one per home, in parallel from [BUILDER.md](BUILDER.md), each on a copy of round 02's instrument prototype with [routines.js](routines.js) layered over the busy scenario. Each passed [check.js](check.js) (no page error in eight moment and theme pairs, the words, the chip on #781 and #779, the home with four rows and the jobs, the routine's drawer with its Runs, the acts' confirmations, the provenance line on #790, the held word, every `rt-` text pair at 4.5:1 in both themes at 1440 and 390, no horizontal scroll, 44 px targets) and shot the sixteen views of [shoot.js](shoot.js).

What the builders found in the base and fixed in their copies: a hidden "Decided by" label escaped the log and scrolled the page by 52 px (chat), the status panel's `open` class collided with the card title's `.open` rule and broke the band's border at 390 (panel), the escalation's Close link was 17 px on the phone (all three), a card without a budget showed "€NaN" (board). These are faults of the round 02 prototype, not of the console.

The director's view of the shots:

- **A. Panel.** The Routines column aligns with In progress, Needs you and Spend as if it had always been there. The strip's cell "↻ bump in 20 min" announces without a click, and "↻ bump held" in amber speaks when it should. The whole list is one click away, in the place C7 already made for depth. On the phone the strip's cell is its own 44 px row and the panel stacks, Routines last.
- **B. Board.** The ghost card at Queued's foot says "due Mon 06:00 · in 20 min" where the card will land, with its acts, and the Audit ghost under it counts merges. The quietest home of the three. Its list sits in a menu under the Queued head, a wide popover over In progress, and the head's label at 1440 is cut to "↻ 2 due ▾". The phone opens the list inside the Queued section.
- **C. Chat.** The pinned Routines panel under the inbox's head reads well with the factory's poke and its decider line. The home is gone whenever another thread is open, and on the desk the inbox is one of four threads. The builder's answer to the brief's question: the poke at 05:40 should not exist, since the row already names the run and a poke for a normal state trains members to skim the inbox. On the phone the panel starts folded to one row. In the first build the log under it was scrolled so that a half-cut turn sat right under the row and read as covered. The second loop ends the log at a turn's top while the home shows.

## The critics' loop over the variants

Gemini 2.5 Pro and GLM 5V Turbo over one labelled sheet per variant, [the prompt](critique-variants-prompt.txt), [Gemini](critique/gemini-variants.json), [GLM](critique/glm-variants.json), $0.06.

| Variant | Gemini | GLM | Mean |
| --- | --- | --- | --- |
| B. Board | 9 | 9 | 9.0 |
| A. Panel | 7 | 5 | 6.0 |
| C. Chat | 4 | 7 | 5.5 |

Both put the board first for the same reason: the ghost card shows the next run without a click, where the member expects work to arrive, under the pulse and the amber column. Both ask for the same hybrid: the ghost card with the panel's strip cell and column. The director checked each claim against the pixels:

- GLM: the panel's next run "hides inside the collapsed status panel until the member expands the strip". The strip's cell "↻ bump in 20 min" is visible folded in `panel/shots/due-dark-1440.png`. Overruled.
- GLM, high: the panel's held state "uses the same amber tone as the Needs you column header, creating confusion". A held run is a human card waiting in Needs you, so amber is the theme's rule, not a confusion. Overruled.
- GLM: the chat's phone panel "consumes sixty percent of the vertical space". It starts folded to one 44 px row (`chat/shots/phone-due-dark-390-home.png`). Overruled. The half-cut turn under the row was the director's own finding, fixed in the second loop.
- Gemini: on the board's filed card "the amber highlight bleeds out of the column's left boundary". No bleed in `board/shots/filed-dark-1440-card.png` at 1x. Overruled.
- GLM: the board's ghost border "loses sufficient contrast against the white background" in light. True at 1x: the token `--line-strong` on the Queued panel is faint. Fixed in the second loop with `--btn-line` in both themes.
- Both: the chip on a filed card and the provenance line in its drawer are what every variant needs. Kept.

## The second loop: the hybrid

A fourth builder made the hybrid from the board variant: the ghost card and its acts stay, the Queued head's menu and its popover go, the panel variant's strip cell and Routines column come in. It passed the same check and shot the same sixteen views. The board builder drew the ghost's border in `--btn-line`, and the chat builder ended the log at a turn's top under the folded row. Then both critics judged all four sheets with [the compare prompt](critique-compare-prompt.txt): [Gemini](critique/gemini-compare.json), [GLM](critique/glm-compare.json). Gemini's first answer at 2880 px a side came back empty, and the rerun at 2048 px answered.

| Variant | Gemini | GLM | Mean |
| --- | --- | --- | --- |
| D. Hybrid | 10 | 9 | 9.5 |
| B. Board | 8 | 7 | 7.5 |
| A. Panel | 5 | 6 | 5.5 |
| C. Chat | 3 | 3 | 3.0 |

Both say the hybrid beats the board alone because the list has one home and the board keeps the announcement, and both say dropping the head's menu is right: the ghost card is an effect, a forthcoming filing, not a registry. Checked against the pixels: Gemini's "amber dot in the status panel's header" on the hybrid is not there in `hybrid/shots/due-dark-1440-home.png`, overruled. Gemini's "high" on the chat's phone panel repeats the first loop's claim against a row that starts folded, overruled. GLM's "high" on the panel's phone ("collapsing the status panel likely hides the routines list") is a guess against a shot that shows the list, overruled. Gemini's note that the ghost card's text wraps to five lines on the phone is true and goes to the implementation.

## Cost and time

The round cost $2.58 of its $15 cap: sixteen direction images at $0.15, and seven critic calls at about $0.03. The design folder's running total went from $15.52 to $18.10 of the $100 cap. Wall clock: from the brief at 11:05 to the hybrid's shots at 12:03 and the second loop's verdicts at 12:10 on 2026-10-15, with the three first builds in parallel at 25, 26 and 31 minutes and the hybrid at 11 minutes. Tokens are not capped and were not counted.
