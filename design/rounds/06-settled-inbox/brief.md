# Round 06: the settled inbox row

The concept of 2026-10-17 ([notification settling](../../../docs/notification-settling-concept-2026-10-17.md), roadmap 292) rules the mechanics: a poke row's state derives at read time from the event log, asks settle on their settling event, informs on the seen marker, and no model runs a loop. Phase 1 builds that logic with plain styles. This round shapes what the settling looks like: how a settled row recedes, where its reason line sits, and the badge's form. Sebastian ruled the reason line's content (word, actor, time) and the badge's split (needs you / new); the round refines their rendering, not their meaning.

Sebastian is away. His order of 2026-10-17, "make sure all phases get built", is the approval of record for this run. The director picks provisionally; Sebastian's pick overrides and becomes the C-entry.

## What the round designs, and nothing else

The inbox thread's settled rows (asks whose settling event has passed, informs the seen marker covers) and the switcher's split badge: how far a settled row recedes, where the reason line sits, what form the badge takes. The open ask keeps today's full amber; the rows' order never changes; a re-asked row re-opens to full amber.

## What is fixed

- The chat shell, its tokens and its rules: [console.css](refs/console.css) copied verbatim from the code repository at cec02b5. The candidates add rules; they change none of it.
- The concept's rulings: the reason line reads word, actor, time ("answered by sebastian · 13:47") in the decider line's faint mono idiom; the badge splits "needs you" (open asks) from "new" (unseen rows that are not asks).
- Amber is the one signal that needs a person. A settled row carries no amber; an open ask carries it in full.
- The thread's content and order, identical in every candidate: two settled asks, one seen inform, three new informs, one open escalation, one member reply. The candidates differ in treatment only.
- Both themes, dark the default; the desk at 1440 and the phone at 390.
- Settled text stays legible: no lower contrast than the decider line's faint mono on the raised panel, in both themes.
- The phone keeps the folded switcher summary row (C14).

## The questions the candidates answer

1. How far does a settled ask recede: a whole-row dim, a fold to one line, or only the amber leaving while the text stays?
2. Where does the reason line sit: under the text in the decider line's place, at the right edge of the name line, or as a chip beside the name?
3. Does the split badge read as one text line ("1 needs you · 3 new"), or as counts in two pills, and does the amber belong to the number or the words?

## The candidates

Six, each a direction of its own, built as real markup over the copied stylesheet in [cand/](cand/), assembled by [build.js](build.js) into [c1.html](c1.html) to [c6.html](c6.html) and their light twins, shot by [tools/shoot.sh](../../../tools/shoot.sh) at 1440 and 390.

1. **dim-line**: the plain ruling. The settled row's colour drains to muted, the reason line follows the text in decider style, the badge is one text line.
2. **quiet-log**: the settled row folds to one line, reason and first words together, like an index of what passed; the head names the waiting ask.
3. **ink-swap**: the text stays full colour; only the amber leaves (ring, name, label, box) and a bordered reason chip sits beside the name.
4. **settled-run**: runs of settled rows fold under a thin rule labelled "settled", the archived rule's in-thread twin.
5. **right-reason**: the dim of dim-line, with the reason at the right edge of the name line and the head naming the waiting ask.
6. **half-fade**: the settled row keeps its whole layout and fades to half, reason line under the text; the uniform-fade direction.

## Why no image generation

The round refines one treatment inside an existing surface whose stylesheet is the design. An image model redraws the whole console and answers a question nobody asked. The review unit is the real markup with the real tokens, at 1x.

## Limits of the run

Six candidates, all built by hand. One critic loop over the contact sheets (both critics), at most one fix loop for the two carried candidates, one compare loop. A spending cap of $3 for critic calls; no image generation. The round stops when the page and the notes exist; the director's pick is provisional until Sebastian picks.
