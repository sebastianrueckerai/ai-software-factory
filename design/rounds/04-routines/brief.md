# Round 04: where the routines live

Sebastian on 2026-10-15: periodic tasks exist, such as the weekly bump of pinned versions. A timer that files a card works, but it surprises. Where does a member check what runs on its own, and how does that marry with the one screen? The facts and the proposal on the factory's side are in [docs/routines.md](../../../docs/routines.md). This round designs the human's side. The process is the condensed round of [process.md](../../process.md): directions as images in both themes, the critics' ranking, three built variants on the current prototype, the critics' loop, the director's recommendation, Sebastian's pick.

## What the round designs, and nothing else

1. **The home.** Where a member sees what runs on its own: each routine's name, rhythm, next run, last run and its outcome, and whether a run is held because the last card is open.
2. **The announcement.** How the next run shows before it files, so the card never surprises.
3. **The card's face.** How a card a routine filed says so on the board and in the drawer: the routine's name, the run's number, the last run's outcome, a link to the routine.
4. **The acts.** Skip once and Run now, and where a change of rhythm is proposed. A change is a configuration commit through the chat's proposal, as the level change is.
5. **The history.** Per routine, its runs.
6. **The jobs.** Whether and where the cluster's own CronJobs (the backup at 02:00, the dump at 02:30) are listed beside the routines.

## What is fixed

The Mission control shell as the console has it on 2026-10-15: the top bar with the moon and sun selector (C15), the pulse band with the instrument strip and its expandable status panel (C7, C9), the chat on the left at 40 percent with the thread table and the level control under Send (C14), the board on the right with the four columns of C8, the find box and the column menus of C13, the drawer at the right edge, no ticker (C12). The token ladder of [the theme](../../themes/06-mission-control/DESIGN.md). Both themes. 1440 and 390, the phone as one column with the chat first. Every text pair at 4.5:1 in both themes, no horizontal scroll at 390, reduced motion respected.

Normal states whisper, exceptional states speak. A routine that runs on time is a normal state. A held run, a failed run and a routine's human card are the exceptional ones.

The word in every image is "routine". The word itself is a question to Sebastian ([docs/routines.md](../../../docs/routines.md), open question 1), so the images keep one word and differ in design only.

## The moment the images show

Monday 13 October, 05:40, the busy scenario. Four routines on the project ai-software-factory-code:

- "Weekly bump" · every Monday 06:00 · human card · next in 20 minutes · last run Mon 6 Oct, #781, merged in 2 days.
- "Template pass" · hourly and on a configuration version · pull-request card · last run 05:03, no change.
- "Dependency update" · every Thursday 06:00 · agent card · last run Thu 9 Oct, #779, merged · next Thursday.
- "Audit" · after 20 merges · agent card · 14 of 20 · last run 2 Oct, #702, 3 findings filed.

Two jobs of the cluster: "Backup" · daily 02:00 · last 02:00 ok. "Forgejo dump" · daily 02:30 · last 02:30 ok.

The board stays the busy board of round 02 (the merge of PR #612 and the #603 question in Needs you), with #781 "Weekly bump of the pinned outside inputs" and #779 "Dependency update" as done cards, each with a routine chip.

## The questions the images must answer

1. Where is the home: the board, the status panel, a page of its own, the Policy page, an instrument under the strip, the inbox, the drawer, or a column's head?
2. Does the next run show without a click, and quietly?
3. Does a filed card say which routine filed it, at a glance?
4. Does the home stay quieter than the pulse and the Needs you column?
5. Can a member act (skip once, run now) where they read, and does a change of rhythm read as a configuration change, not a toggle?
6. Will it survive the phone?

## The directions

Eight, each a different home. Prompts from [prompts.py](prompts.py), `google/nano-banana-2.1` at 1K, 16:9, dark and light.

| # | Direction | The home |
|---|---|---|
| 01 | Ghost card | The next due routine as a dashed card at the foot of Queued. The board is the home. |
| 02 | Panel column | A Routines column in the expanded status panel: name, next, last. |
| 03 | Routines page | A secondary page in the top bar: a table per project, the runs under the selected row, Skip once and Run now. |
| 04 | Policy in force | A Routines table on the Policy page beside the stages table, the rhythm as configuration with next and last as live columns. |
| 05 | Schedule tape | A fourteen-day tape under the instrument strip: past runs as filled ticks in the outcome's hue, future runs hollow. |
| 06 | Inbox standing row | A pinned panel under the inbox thread's head with the next runs and the acts as choice buttons. The chat is the home. |
| 07 | Routine drawer | A routine opens in the drawer like a card: Overview, Runs, Config. Reached from the chip on any routine card and a Routines menu in the board's head. |
| 08 | Column head | The Queued head carries "2 due this week" as a menu with the due routines. Nothing else new. |

## Limits of the run

Eight directions in both themes, two critics over the sheets, three directions carried into built variants on the instrument prototype of round 02, at most two critic loops per variant, a spending cap of $15 for the round's images and critiques, and a stop when the variants are presented. Sebastian picks.
