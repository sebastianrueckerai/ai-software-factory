# Round 11 — the compact screen, reorganised in the current style

Sebastian's ruling at the start of this round, 2026-10-19: round 10's directions
restyled the console, and that was not the ask. The current style, colours and
shape language stay. What may change is what we do with them: the information
hierarchy, what sits where, what folds, what becomes a lamp, which elements are
new. Reorganisations and new elements from round 10 carry over when they fit
this constraint; its restylings do not.

## What the round designs

The routine screen's organisation, the same scope round 10 opened from
Sebastian's four screenshots:

1. The chat and the board: the split, its minimum widths with the threads
   unfolded, and the control that grows the chat and brings it back.
2. The status strip's expanded panel: what it holds, in what form.
3. The card drawer: its Chat tab, and the document view's overlap.
4. The composer: the Grow button's retirement by auto-grow.
5. Tooltips on every control that is not self-evident.

## What is fixed

- The stylesheet as it stands: the tokens, the hairlines, the small capitals,
  the monospaced figures, one cyan accent, amber for needs-you, the quiet.
  Every candidate is built in the real `console.css`, unchanged; a direction
  may not introduce a colour, a fill, a radius or a type scale that is not
  already there.
- The landed decisions: C23's bar, C24's readout grammar, C25's strip behind
  its click, C14's threads as an instrument table beside the conversation
  (a direction may propose moving them, and says so as a reversal question),
  C10's drawer Time section, C17's documents.
- The contrast floor, 44 px phone targets, both themes, no new dependencies.

## The questions the candidates answer

- Where does the window control live: the divider's edge, the chat's head, or
  both, and does a glyph alone carry it?
- Does the conversation get its width from a wider floor, or from moving the
  threads behind a tab?
- Does the panel's dependency list read better as rows or as lamp chips with
  their ages on hover, and does the bare "provider ok" row survive?
- Does the drawer need its Chat tab back, and should the document view stop
  covering the chat?

## Method, and why it differs from round 10

Round 10 drew its directions with an image model, and the model invented a new
visual language in every cell; that is the restyle Sebastian rejected. The
process's own rule (design/process.md, the condensed round, step 3) says: use
images when the question is layout, build candidates when it is a detail
images cannot draw. Holding a style constant is exactly that. So every
direction here is an HTML page in the real stylesheet, shot with the same
Playwright harness, and judged as a screenshot. No image generation runs in
this round; the critics judge real renders.

## Limits

Six directions, two critics, one fix loop at most, one compare loop. Spending
cap $1 (critics only; the expected cost is about $0.15). One session. Round 10's
lab-built sheets — the window-control states, the lamp chips, the composer, the
secondary pages — were already in the current style and carry into this round
as evidence, not as new spend.
