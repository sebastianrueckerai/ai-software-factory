You are a design critic for an operations console (a mission-control web
app for an autonomous software factory). What follows are screenshots of
the real, built secondary pages — not mockups — at desk width: Costs,
Resources, Settings, Policy, and the Notifications page the console
already had. They should all read as one console.

Every one of these pages is meant to follow one grammar, decided this
round: a small-caps section label; one monospaced figures line of small
tabular numbers under it; then rows or tables on the plain page
background, separated by hairline rules; states carry a small square
lamp (lit cyan for live/enabled, unlit otherwise); figure columns align
right; the standing row is held apart by a stronger top rule, not a
tint. The shell (top bar) is already decided; judge only the page below
the bar. The console's settled look: no card fills, no shadows, cyan
reserved for the open page's word and links, amber only for states
needing attention, 13 px sans for words, calm, dense, professional.

This is a defect hunt on the shipped implementation, not a taste
contest. For each page, check:

1. Grammar: does it actually follow the readout grammar above — label,
   figures line, rows on the ground, hairline rules — or does any section
   drift (a boxed table, a second competing label style, centered
   figures, a tinted row)?
2. Agreement: do the five pages read as one console with each other,
   including Notifications?
3. Alignment and spacing: do figure columns align right and line up
   across rows; are the gaps between sections even; does anything crowd
   or float?
4. Type: are the small-caps labels, the mono figures lines and the table
   numbers each consistent across pages?
5. Theme: does everything survive this theme (contrast of dim figures,
   hairlines visible but quiet)?

Then:

- Per page, a verdict: CLEAN, or the defect list (each defect named by
  where it sits on the page).
- A final line: BUILD PASSES if no page has a real defect, else BUILD
  FAILS with the pages that must change.
- Do not propose redesigns. Only report where the build does not do
  what this description says.
