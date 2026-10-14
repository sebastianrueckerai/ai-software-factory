# Round 02: the multi-chat console on the Mission control shell

The brief of the UX round of [the autonomy and multi-chat plan](../../../docs/plans/2026-10-14-agent-autonomy-and-multi-chat.md), roadmap 239. Its "UX round" and "Decisions" sections bind this round. The process is the portfolio's, as the console round of 2026-10-14 ran it: this brief, broad directions as images in both themes, the critic's loop, a few variants as built prototypes, Sebastian's pick.

## What the round designs, and nothing else

1. **The thread switcher.** The active threads by last turn, each with its unread mark and its working mark (a turn in flight), New, Archive. Archived threads sit last, read-only, restorable.
2. **The unread badge.** On the switcher's row and in the tab's title. A turn that ends after the member last looked marks the thread unread; opening it clears. Reading another thread never clears the inbox's badge.
3. **The working mark.** A turn in flight on a thread the member is not looking at.
4. **The inbox thread.** Its name and its face: the one thread the agent speaks in uninvited. A poke arrives as an agent turn, one per state change, with choices as buttons where a decision fits.
5. **The escalation's face in the chat.** The question with its choices beside the text box. A reply continues the thread; the answer resolves the card.
6. **Archive and delete.** Archive hides and keeps, restore brings back. Delete is hard: the rows go and one event names the member, the thread and the count. The warning must say so.
7. **The commands.** `/compact` and `/new` as composer affordances. A command is a message and nothing more.
8. **The autonomy level selector.** manual, assisted, autonomous, full auto. Changing it is a policy change and confirms.

## What is fixed

The Mission control shell as the console has it on 2026-10-14: the top bar, the pulse band with the status figures, the chat on the left at 40 percent as the main affordance, the board on the right with the four columns of C8, the find box and the column menus of C13, the drawer at the right edge, the foot without a ticker (C12). The oklch token ladder of [the theme](../../themes/06-mission-control/DESIGN.md). Both themes. 1440 and 390, the phone as one column with the chat first. Every text pair at 4.5:1 measured in both themes, no horizontal scroll at 390, reduced motion respected. Normal states whisper, exceptional states speak: a badge, a poke and an escalation are the exceptional states; a thread list and a level that stands are normal.

## The scenarios the prototypes show

- **threads**: a second thread open while the first runs a turn, so the switcher shows an open thread, a working mark and an unread mark.
- **poke**: a poke arriving in the inbox thread while another thread is open: the badge appears on the row and in the tab title.
- **assisted**: the level is assisted, and the inbox carries the agent's own start of a ready card, recorded with its decider.
- **escalation**: the level is autonomous, and the inbox carries a direction question with its choices beside the text box.
- **busy**: the console round's busy moment, for the shell beside the new parts.

## The questions the images must answer

Where the switcher lives (a rail inside the chat, tabs in its head, one title that opens a list, a strip above the composer). Where the level selector lives (the chat's head, the top bar beside the project, the status strip, the composer's foot). What the inbox thread is called and how its face differs from a planning thread. How a badge, a working mark and an escalation speak without the chat getting louder than the pulse.

## Limits of the run

Eight directions in both themes, three carried into built variants, at most two critic loops per variant, a spending cap of $15 for the round's images and critiques, and a stop when the variants are presented. Sebastian picks.
