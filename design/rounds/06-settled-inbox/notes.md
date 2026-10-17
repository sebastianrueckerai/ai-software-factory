# Round 06 · the settled inbox — the run

Condensed form, one feature: how a settled poke row recedes, where its reason
line sits, what the split badge looks like. The rule itself (what settles a
row, the reason's words, the badge's split) was ruled before the round —
item 292 and the concept doc of 2026-10-17; the round shapes only the form.

## Built

Six candidates as static pages over the console's own stylesheet
(`refs/console.css`, verbatim from the code repository at 4286a6f), one fixed
thread in `page.tmpl.html`, assembled by `build.js` into fourteen pages (dark
and light). No image generation: the round is a styling question over real
markup, the same call round 03 made for its glyph. Shot at 1440 and 390
(`tools/shoot.sh`), 28 shots, montage sheets for desk and phone in both themes.

The fixed thread: three settled rows (seen inform, answered ask with the
reply below, superseded approval), three new informs, one open escalation
with a repeat bump and choices, the answer bar. Row 00 is today's console.

## The director's 1x check

Before the critics: c0, c1 (dark and light), c2 (phone) and c4 inspected on
pixels. One false alarm — a text dump of a page carries hidden hooks
(`display: none` spans stay in the DOM), so "every hook is visible" was a
reading artefact, not a render fault; the built css order and specificity are
correct. Two claims by the vision passes (choice buttons living only in the
answer bar, buttons clipped at 390) were disproved by tight crops. All
fourteen pages render as designed; nothing fixed.

## The critic loop

Both critics over the four sheets, `critique-prompt.txt`:

| candidate | Gemini | GLM |
|---|---|---|
| 01 dim-line | 8 | 5 |
| 02 quiet-log | 7 | **9** |
| 03 ink-swap | 4 | 3 |
| 04 settled-run | 3 | 6 |
| 05 right-reason | **9** | 8 |
| 06 half-fade | 6 | 6 |

Carried (both critics, identical lists): 05 right-reason and 02 quiet-log.
Convergent findings: the two-pill badge (02/06) wins decisively; 03 fails to
recede; 06's half opacity reads as disabled and fails contrast on light; 04's
hard fence is heavy-handed for the calm idiom.

## The fix loop (one, on the carried)

- 05: badge swapped to the two-pill form, the "· 1 ask waits" head count
  dropped — both critics' named fixes. Re-shot.
- 02: its carry fix (fold legibility on the phone) was already verified at
  1x; unchanged.

## The compare loop

`critique-compare-prompt.txt`, A 02 quiet-log against B 05 right-reason
(both wearing the two-pill badge). Both critics pick A — Gemini 9 : 6, GLM
9 : 5 — flipping their round-1 recommendations once the dividing axis was
explicit: what happens when the settled history grows. The fold treats
history as an index; the dimmed full row keeps every word but spends full
scroll on what already passed. Both name the same pre-ship fix: a folded row
expands on click or tap for the audit trail.

Claims checked against pixels and arithmetic:

- Light-theme grey "vulnerable to WCAG" — dismissed: the fold reason
  measures 7.0:1 and the snippet 5.2:1 on the light panel, both above 4.5:1
  and both at or above the decider line, the brief's floor.
- Phone clipping of the fold or the buttons — dismissed by crops at 1x.

## The pick (provisional)

**02 quiet-log, with the two-pill badge** — the settled row folds to one
line, reason first, first words after it; the amber pill counts open asks,
the bordered pill counts unseen new rows. Runner-up: 05 right-reason.

Pre-ship notes for the build: a folded row expands on tap or click (both
critics, agreed); if the reason and snippet read mushy live, a 1 px tick
between them sharpens the log entry — build note, not ruled here.

Sebastian is away; per `design/process.md` the director picks provisionally
and his pick overrides, becoming the C-entry in `design/design-decisions.md`.

## The build (phase 2, landed)

The pick is in the code repository (2be0d7c on main, 2026-10-17). The
settled row keeps its who line and folds to the reason word plus a content
ellipsis; tap or click expands it back; the settled-row and badge rules
match `cand/c2.css`. The badge is two pills, amber `1` and bordered `1`,
behind one aria-label, and the read inform settles with its word, "seen".
Evidence from the console lab's poke scenario, same region before and
after, in [ev/](ev/): the settled row, three dimmed lines at 146 px,
becomes the who line plus fold at 74 px; the thread row's single badge
becomes the split pair; `ev-montage.png` holds both pairs labeled. Both
checks on the final tree green: `go test -race ./...` (21 packages) and
the lab (239 shots, every control present). The live check stays open:
answering an escalation on the live board and watching its row settle is
Sebastian's first look.

## Cost

| step | calls | cost |
|---|---|---|
| critic loop | Gemini + GLM | $0.06 |
| compare loop | GLM + Gemini (one empty answer, retried) | $0.09 |
| generation | none — static pages | $0.00 |
| **total** | | **$0.15 of $3** |

The director's pixel checks ran through the session's vision tool, not the
round's providers.
