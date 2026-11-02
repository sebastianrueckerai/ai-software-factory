# Round 16: the plan's name on its cards

Sebastian asked on 2026-11-02 for every plan to carry a short, telling name beside its number, shown on its cards so a glance tells which cards belong to which plan. He also asked to remove the verdict survey from the escalation card.

## Form

This round is a lab build, not an image round. The question was where an existing chip's text goes, which a screenshot of the real console answers better than a generated image. No image model ran and no critic ran, because there was no generated output to judge. The cost was nothing beyond the build. The pick is Sebastian's, against the shots on [the round page](index.html).

## What was built

- The child card's chip: `from plan #531 · card chips`. The name takes the slot the card's plan key held.
- The plan's own card: `#531 · card chips`, live and as its compact row in Done. The Done row came out of looking at the first shots. A plan card ends done once it files its cards, so without the chip there the children's chips had nothing on the board to match.
- The approval header: `Plan #558 · activity feed, revision 1`.
- The drawer's Overview: one Plan row, `#531 · card chips · drawer-polish`, replacing the collapsed "The plan" section on a child card.
- The find box: `plan:531` and `plan:card` both narrow to the plan's cards, the plan's own card included.
- The escalation card no longer asks "Was this escalation a real problem?".

## The director's view

The colour match works: the cyan chips on #617, #533 and #606 pair with the cyan chip on #531's Done row at a glance. In the narrow Queued and In progress columns at 1440 px the child chip wraps to two lines. It wrapped the same way with the key. On the phone at 390 px it fits on one line.

If the wrap matters, the runner-up is a shorter child chip, `plan #531 · card chips` or `#531 · card chips`, the same text as the plan's own chip. That would change C11's chip copy, so it is Sebastian's call.

## Evidence

Before shots come from the base commit a0e2803e with the same lab cards and no names. After shots come from the build. The lab's structural check passed on both runs with every control present.
