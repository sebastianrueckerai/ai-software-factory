# Picks

Sebastian's decisions on this round. Fill in and commit; each pick becomes an entry in [design-decisions.md](design-decisions.md).

## Round 01, the 16 directions

Carry forward (any number):

- [ ] 01 Linear calm
- [ ] 02 Geist contrast
- [ ] 03 Soft SaaS
- [ ] 04 Swiss grid
- [ ] 05 Broadsheet
- [ ] 06 Mission control
- [ ] 07 Trading floor
- [ ] 08 Grafana dense
- [ ] 09 Inbox first
- [ ] 10 Command palette
- [ ] 11 Terminal brutalist
- [ ] 12 Blueprint
- [ ] 13 Factory floor
- [ ] 14 Glass depth
- [ ] 15 Riso print
- [ ] 16 Messenger dock

Notes:

## The prototypes

Which one becomes the console, or which two go one more round:

- [x] 06 Mission control (Sebastian, 2026-10-14, C5), with the chat turns of 09 Inbox first.

Notes: Needs you as the first column, never a tray (C4). Red stays for problems only. Chat under the board is out (the chat grows down, the board grows down). The implementation plan: [docs/plans/2026-10-14-console-design.md](../docs/plans/2026-10-14-console-design.md), roadmap item 227.

## Round 04, the routines

Where the routines live ([the round page](rounds/04-routines/index.html), [the brief](rounds/04-routines/brief.md), [docs/routines.md](../docs/routines.md)). Which home becomes the console:

- [ ] A. Panel: the status panel's Routines column, the strip's cell when a run is under an hour away or held
- [ ] B. Board: the ghost card at the foot of Queued and the "due" menu in its head
- [ ] C. Chat: the pinned Routines panel under the inbox's head and the factory's poke
- [x] D. Hybrid, the recommendation, amended (Sebastian, 2026-10-15, C16): every routine as a ghost card at the foot of its lane, a control hides the far ones or all, the strip's cell stays, the status panel's column is out

And the word: routine, standing order, or schedule. Sebastian: "you decide". The director: the thing is a routine, its rhythm line is its schedule.

Notes: routines are per project, in the project's file. The main chat creates, changes and deletes them through tools. The schedule is any mix of a cron pattern, a merge count and an event, stated in words on the card. Run now files the card at once and the autonomy level decides the start. The clock is Temporal Schedules and store counters, reconciled from the configuration tree ([docs/routines.md](../docs/routines.md)).
