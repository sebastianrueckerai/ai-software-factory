# Round 03: a symbol for the theme toggle

Sebastian on 2026-10-14: "Theme: dark" in the top bar looks boring. This round finds a symbol to replace the text. The process is the portfolio's, scaled to one control: references from other products, candidates built and shot in the console, the critic's ranking, the director's recommendation, Sebastian's pick.

## What the round designs, and nothing else

The theme toggle in the top bar: its symbol in the dark and the light theme, its hover, and its motion when it switches. The behaviour stays: dark is the default, a click switches, localStorage remembers the choice, theme.js applies it before the first paint.

## What is fixed

- The top bar of [the Mission control theme](../../themes/06-mission-control/DESIGN.md): one quiet 44 px row. The toggle sits right of the navigation, before the user's name and Log out. The button is 24 px high on the desk, without a border at rest, in `--text-muted`, and turns `--text` with a `--btn-line` border on hover.
- Normal states whisper. A theme in force is a normal state, so the symbol stays quiet: no cyan, no amber, no glow.
- The symbol is an inline SVG in `currentColor`. The page's policy allows no inline style (`style-src 'self'`), so every rule lives in `console.css`.
- The button keeps its accessible name, "Switch to the light theme" or "Switch to the dark theme", and its tooltip.
- On the phone the button is a 44 px target.
- Under reduced motion the switch is instant.

## The questions the candidates answer

1. Which symbol reads as "theme" at 18 px beside 13 px text, in both themes, at 1x as well as on a high-density screen?
2. Does the symbol fit the instrument character of the console (thin lines, exact, calm), or is it the common web icon?
3. Does the symbol show the theme in force, as a switch shows its position? Every candidate here does: a symbol that shows the target state reads as the opposite of what is on screen.
4. Does the motion of the switch add something, and does it stay under 600 ms?

## The candidates

Ten, each a direction of its own, from the common web icon to instrument metaphors. Defined in [candidates.js](candidates.js), shot by [shoot.js](shoot.js) in the console lab (the code repository's `internal/console/lab_test.go`, the busy scenario), laid out by [sheet.js](sheet.js) as [the dark sheet](contact-sheet-dark.png) and [the light sheet](contact-sheet-light.png).

## Why no image generation

The round is about one 18 px glyph. An image model draws a glyph at that size neither exactly nor the same twice. The review unit is the real top bar with the real candidate in it, at 1x and 3x.

## Limits of the run

Ten candidates, one critic loop over the sheets and the references, at most one fix loop for the carried candidates, a spending cap of $3 for critic calls. The round stops when the candidates are presented. Sebastian picks.
