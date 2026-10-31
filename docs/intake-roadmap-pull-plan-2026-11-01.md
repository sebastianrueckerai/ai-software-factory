# The intake switch becomes the roadmap pull

Written 2026-11-01. Status: plan, awaiting Sebastian's OK. Nothing is built.

## The decision

The intake switch of 2026-10-18 said: the project agent files nothing on its
own. Sebastian rescopes it on 2026-11-01: the switch stops one thing, the
autonomous pull of roadmap items. Everything else an agent does at intake
stays open whatever the switch says. Three rules:

1. **Intake on**: the agent pulls ripe roadmap items onto the board until
   none remain ripe.
2. **The wake is the queue's depth.** No heartbeat, no clock (the decision
   of 2026-10-20 stands). The agent wakes when the project holds fewer than
   `refill_below` waiting cards. Once the roadmap has no ripe item, the same
   roadmap never wakes it again: only a change to the roadmap does.
3. **Never gated**: the human's own ask (it files and starts today already),
   and the agent filing because something needs solving: an incident, a
   finding, a deferred review outcome, an instruction.

The production hold is untouched (the intake-hold spec of 2026-10-31 stays
dead: its two-effects-one-state premise was wrong, the events table holds one
intake change ever, Sebastian's own press of 2026-10-18).

## What is ripe, what is pulled

Ripe is a filled `Priority` field in `docs/roadmap.md` of the project's doc
repository, the field the file already documents as Sebastian's
(roadmap.md 23). Today five items carry a value, 59 are empty. No new marker.
The side files (`roadmap-by-hand.md`, `roadmap-process.md`) are never pulled:
by-hand items are by hand. Every pulled card goes through sizing like any
card: small changes direct, big ones plans.

## The wake

The Waker gains one source, `queue_refill`. Its condition, all three required:

- the project's intake is open, and
- the project's waiting cards (the count behind `CountQueue`) are fewer than
  `refill_below`, and
- the doc repository's head of `docs/roadmap.md` differs from the project's
  last pull stamp.

The Waker's existing pass runs the check; a card's end is the event that
drops the depth, so no poller and no timer join the code. The wake's turn
gaps and cooldowns apply as to every wake.

**The stamp.** A new row per project: `roadmap_pull (repository, head, at)`,
written when a pull turn ends with the head the turn read (the `file` read of
`docs/roadmap.md` names it); a turn that read nothing stamps the head at its
end, so a misbehaving turn cannot refire the wake in a loop. The stamp does
not move when a wake fails to start: a lost turn loses nothing, the next
pass fires again. A roadmap edit during a turn stamps the read head, so the
next depth drop pulls the new items. Worst case left over: one extra turn
after an edit that lands mid-turn.

Wake text: `The queue of <project> is below <n>: read docs/roadmap.md of the
project's doc repository, file every item whose Priority is filled and whose
number no card cites, then end.`

## The filing's origin and the gate

`new_card` gains `roadmap_item`, the item number the card builds. A filing
that carries it is a pull, whatever turn files it. Two deterministic guards
replace the judgement no prompt should carry:

- **The dedupe.** The store refuses a filing whose `roadmap_item` any
  existing card already cites, open or done, naming that card. An item
  returns to the pull only after its Priority leaves the roadmap (by hand,
  or by the close-out when it is built). The pattern to copy is the
  issue-holder check of `store.go`.
- **The gate.** `chatFiling` drops its closed-intake refusal of wake
  filings and refuses exactly one thing instead: a `roadmap_item` filing
  while the switch is closed. Refusal text: `The intake of <project> is
  closed: the roadmap is not pulled. Tell the human what needs filing; an
  ask or a need still files.`

With the switch closed a timer wake files, a watched card files, a need
files; last night's four parked cards would all have filed.

## The threshold

`refill_below`, an integer per project in the policy tree beside
`queue_cap`, absent or zero meaning no pull wake. The values are set by hand
in the infra repository (the config tree is human-only); no console field,
the autonomy button does not grow one.

## The copy and its record

The switch's meaning changes everywhere it is written down:
`intake_switch.go` and `events.go` comments, `autonomy.go`'s button comment
and log line, `chatFiling`'s comment, the board's switch labels, the refusal
strings. The board's switch line also shows its last change, who set it and
when (`chat_intake` already stores both): the agent that wrote the false
cause into two documents on 2026-10-31 could not read it, and one read
kills that class of story.

In this repository, `roadmap.md` 31's sentence "the project agent pulls no
work off this file on its own" is rewritten to the new scope with the date,
and item 276's "The pull half is dead" line comes alive, both naming this
plan. No reversal passes silently.

## Tests

- The wake fires on all three conditions; one pin per refusal: switch
  closed, head unchanged, queue at or above the threshold.
- A dry pull turn stamps the head and never refires on it; a roadmap change
  refires; a wake that fails to start moves no stamp.
- A `roadmap_item` filing is refused while the switch is closed; a reactive
  wake filing passes while it is closed; the human's ask still files and
  starts.
- A `roadmap_item` any card already cites is refused, naming the card.
- The copy pins: the switch's new meaning, the board line with setter and
  time.

## Order of work

1. Code repository, one card or two by the sizing: the store (stamp row,
   the `roadmap_item` column, the dedupe), the wake source, the origin
   param and the gate swap, the copy sweep with its pins. `go test -race
   ./...` green.
2. Infra repository, by hand: `refill_below` in the code project's file.
3. This repository, one commit: the roadmap lines above, this plan's status
   line.

## Non-goals

No clock wake in any form. No change to the production hold, merge groups,
`queue_cap`, or the sizing of pulled cards. No close-out automation: item
276's other half stays as it stands, and a merged item's Priority is cleared
by hand until a later card builds that. No pull from the side files, no
fanout across projects, no console field for the threshold.
