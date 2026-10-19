# Round 13 notes — the metrics page

2026-10-19. Breadth round: six directions × both themes, `google/nano-banana-2.1`, off the fixed C23 bar, the exact content deck and the console palettes. Stage 0 was Sebastian's ASCII pick in chat: instrument rows, with the strip carried as a direction. The judge approved the round plan before any generation.

## The director's pixel pass

- **rows** carries the picked grammar exactly: name · value · move · spark, sparks aligned down the page. The strongest render of the hierarchy in both themes.
- **twin** balances five sections into two columns at 1440 without scrolling; the section order survives column-major. The light render's delta language (plain ink for good moves, amber only on a bad one) is a candidate answer to the delta question.
- **strip** is the best single picture of "how the weeks developed": one shared axis, weekly bars and marks per family, lead time as a stepped line, the 28-day figures in a right column. As predicted, the values live at the margin; it is a second view, not the page.
- **headline** kept the deck's real numbers best (31 cards +6, 23 deploys +4) and drew the ghosted previous window genuinely well — but the hero chart is loud and the word "Headline" leaked into the render. The ghost idea is worth stealing later, not the layout.
- **figures** and **free** die: giant invented numerals, card fills, widget soup. Neither is a mission-control readout.
- Content fidelity is poor everywhere (invented sections and figures); the known image-model limit. The directions are judged as layouts; the build renders the real deck.

## The critics

| Direction | Gemini (glance/row/delta/fidelity/calm) | GLM (same) |
|---|---|---|
| rows | 10 / 10 / 8 / 4 / 10 | 6 / 9 / 7 / 9 / 10 |
| twin | 3 / 6 / ? / ? / ? | 8 / 9 / 7 / 9 / 9 |
| strip | 3rd rank | 5 / 6 / 7 / 7 / 8 |
| headline | 5 / 7 / 8 / 2 / 4 | 7 / 8 / 7 / 9 / 6 |
| free | 2 / 4 / 7 / 1 / 6 | 3 / 8 / 7 / 5 / 4 |
| figures | last rank | 4 / 5 / 7 / 8 / 4 |

Gemini ranks rows, twin, strip, headline, free, figures. GLM puts twin's glance above rows' ("no visual weight differentiation between sections") and scores rows' text fidelity 9 against Gemini's 4 — the critics disagree on how much invented text to hold against a layout.

Overruled by the director, with reasons:

- GLM's fidelity demerit for "reflies" — the deck's own word is REFILED; the render matched the deck. The critic judged without the content deck.
- Gemini's glance 3 for twin — the sections keep their order column-major; the real cost is that the eye must jump columns, which the pixel pass weighs as acceptable at 1440, not a hierarchy break.
- Gemini's calm 4 for headline — the ghosted-previous-window idea is not the loud part; the hero scale is. The idea survives as a later option.

## The recommendation (provisional)

**rows** as the page: one column of sectioned figure rows at the console's content width, the window control in the page head, plain signed moves in ink, amber reserved for a figure that crosses into an exceptional state. **Runner-up: twin**, the two-column arrangement, if one column proves too tall in the lab. The strip returns later as a toggleable weeks view; the ghosted previous window returns later as an optional delivery chart. Both die for v1.

Cost: 12 images and 3 critic calls, about $0.40 of the $15 cap (see `cost` in the round's sidecars against the tool's $35.36 of $100 across rounds). Sebastian's pick becomes the C-entry.

## Stage 1, live prototypes (2026-10-19, Sebastian's call)

Sebastian looked at the image mockups' index page, found the invented numbers useless for judging a data page, and asked for prototypes: "show me the prototypes". The image directions stand as breadth; the review unit moved to live HTML. One builder per direction built four single-file candidates in `cand/`, each rendering the exact content deck (18 rows, real demo values), honest SVG sparks whose shapes match the deck's words, real dark and light themes, self-shot at 1440 and 390, with the director's pixel pass on top:

- `try-rows.html` — the picked hierarchy strict; one spark column machine-checked to share both edges; content grep-audited against the deck; the page column at 64 rem (its call: 80 rem carried dead middle per row).
- `try-twin.html` — the same rows in two columns, one screen at 1440; the director fixed the builder's stretched left column (flex chain grew rows to the viewport) to natural heights.
- `try-strip.html` — the shared time axis: weekly bars, tick tallies, spend area, lead time the one strong stepped line, the 28-day figures in a right column; the chart scrolls in its own container at 390.
- `try-headline.html` — the quiet ghost: previous 28 days labelled and faint, current window stepped with a light wash, the chart's own sums matching the deck's moves (25→31 cards, 19→23 deploys), then all five sections as rows.

Bar-case note: rows renders the shell words in title case with a boxed theme toggle; twin, strip and headline render FACTORY CONSOLE small capitals per the shell spec. The judge sees the difference live.
