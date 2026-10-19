# Round 10 — the settling pass

The condensed form. Sebastian's words: the UI "has evolved quite a bit and I
like it in principle", but many little incremental changes have piled up; this
round takes a holistic look at the main view — status line, board, chat — and
the secondary pages' fit, addressing his points and any the director finds.

## What the round designs

1. **The chat's window states.** The way into full screen and the way back
   (today: a "Full" word button whose pressed state is the only way back),
   the drag divider's discoverability (a 10 px hairline today), and the
   chat's minimum width with the thread switcher unfolded (18 rem today —
   too small; the board's 30 rem he calls just right).
2. **The composer's long-message growth.** The "Grow" word button (38 vh
   tall mode) — auto-growth, a clearer control, or both.
3. **The status detail's dependencies block.** Five rows of
   "up · detail · under a minute ago" become compact: lamps with the time
   on hover, per Sebastian's own sketch — with down and degraded still loud.
4. **The provider row's wording.** "provider ok" words a zero state: it
   counts this project's runs stalled on the model provider (refusals,
   backoff) and says "ok" when none are. The strip already carries
   "N waiting on the provider" when nonzero, and the dependency probe
   "provider api" sits two rows below with another meaning of "provider".
   Candidates may re-word, fold, or drop the zero state; the stalled count
   must survive somewhere on the panel.
5. **The secondary pages' fit.** The measure on wide windows (80 rem today —
   the pages "expand endlessly outward"), the Settings page's unaligned
   `label: value` list (a `<ul>`, not a grid), tables that stretch to the
   measure instead of sizing to content. Compact reads, not wide ones.
6. **The tooltip discipline.** Every non-obvious control gets a tooltip
   (title + aria-label): window states, divider, lamps, glyphs.
7. **The whole main view as one instrument again** — strip, board, chat —
   with nothing that reads as a leftover from an earlier design.

## What is fixed

- The shell and the rulings that stand: the C23 top bar, C24's content
  rulings for the secondary pages (what each page carries; this round
  re-fits, it does not re-cut), C25's strip with the panel behind its click,
  C19's notifications page, the drawer and documents views, the board's
  five-column lane, the chat's feature set (intake, New, autonomy level,
  commands, queue, proposals).
- The theme tokens and type (13 px sans UI, mono figures), the contrast
  floor (4.5:1 text), the phone rule (390, 44 px targets), the strip as a
  native details/summary.

## The questions the candidates answer

1. Can the window-state controls — full screen and back, the divider, the
   composer's growth — state themselves as one recognizable grammar (glyph,
   pressed state, tooltip) that needs no words and no learning?
2. What minimum does the chat hold its unfolded threads at, and what does
   the screen give up for it?
3. How far can the status detail compress before a down dependency stops
   being loud?
4. Where does a reference page stop on a wide window, and how do its fact
   rows align into one read?
5. Does the main view read as one instrument again?

## The limits

- 8 directions as images (the main view, busy scenario, 1440, dark and
  light), nano-banana-2.1; the Settings fit joins in the fix loop for the
  finalists.
- Lab-built candidates for what images cannot draw: the glyphs, the pressed
  states, the tooltips, shot in the lab at 1x and 3x.
- 2 carried into one fix loop (both themes), one compare pass with both
  critics.
- Generation cap $8. The pick is built in the code worktree; the lab's check
  must be green before and after.

## References

Sebastian asked for other products' answers explicitly. A survey pass
(panel full-screen toggles, compose growth, drag dividers, health lamps,
tooltip discipline) runs alongside; its findings land in
[references.md](references.md) and steer the directions.
