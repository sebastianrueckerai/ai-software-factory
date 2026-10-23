# Round 03, the theme toggle: notes

The run of [the brief](brief.md). References from 33 products and standards, twelve candidates built in the console lab's top bar, two critics over four loops, the recommendation. Scripts: [candidates.js](candidates.js) (the symbols), [shoot.js](shoot.js) (the shots), [sheet.js](sheet.js) (the sheets), [live.js](live.js) (the live bars on [the round page](index.html)).

## The recommendation

**Selector, third (selector-3).** Moon and sun side by side in a thin frame. A 1 px outline in the muted text colour marks the half in force, and it slides across in 280 ms. In the console it is two buttons in a group: a click on the sun sets the light theme, a click on the moon the dark theme, and each button carries `aria-pressed`. Both critics picked it in the compare loop (9 of 10 each), and both preferred its outlined key to the filled key in the last check.

It is the only finalist whose symbol shows both the theme in force and the other one, so nobody has to guess what a click does. It reads as a mode switch on an instrument panel, which suits the Mission control idiom. It costs 46 px of the top bar at the desk, against 30 px for a single glyph.

The runner-up depends on the critic: the half disc (Gemini) or the second eclipse (GLM).

## The pick: C15

Sebastian picked E, selector-3, on 2026-10-15. It shipped in the code repository as 418cc0d: two buttons in a group named Theme, each with `aria-pressed`, the outline and the glyph colours keyed on `data-theme`, 44 px halves with 22 px glyphs on the phone. The lab's structural check sets, keeps and resets the theme through both buttons and counts them among the phone's targets: green. Recorded as C15 in [design-decisions.md](../../design-decisions.md), with [the theme](../../themes/06-mission-control/DESIGN.md), [ia.md](../../ia.md) and [the inventory](../../inventory.md) updated. The shipped top bar from the lab: [dark](shots/shipped/dark-header.png), [light](shots/shipped/light-header.png), [phone dark](shots/shipped/dark-phone.png), [phone light](shots/shipped/light-phone.png), [the sun hovered, 3x](shots/shipped/dark-hover-sun-3x.png).

The lab's check had failed on main before this change, at an archived thread's row. The thread table starts folded since 6aacfdd, and the check still expected it unfolded. Every step after that one never ran. Three stale entries surfaced once it ran again: "Apply" (removed in 6298360), "own thread" (removed in e54f60e) and the fire card's Fund, which 5a6e5de offers only for factoryd's budget refusal while the lab's fake still worded the refusal the old way. All four were fixed in e12a5d3, before the selector's commit.

## The references

A research agent checked 33 references live on 2026-10-14 and 15: [the table and the patterns](references/README.md), [the sheet](references/sheet.png). Tailwind, GitHub Docs, MDN, Stripe, Raycast and Linear have no theme control in the top bar today. Ten patterns appear: sun and moon swap, moon inside the sun, half-filled circle, eclipse, horizon, lightbulb, physical switch, segmented control, day and night disc, brightness dial. Two of them were not among the ten first candidates and became candidates 11 and 12: the IEC 60417-5435 brightness and contrast symbol, and the hatched half disc of shadcn and Phosphor.

## The candidates

Each candidate shows the theme in force, as a switch shows its position. Each is an inline SVG in `currentColor`, muted at rest, with its motion as CSS transitions keyed on `[data-theme=light]`. The director's view from the 1x pixels:

| # | Candidate | The director's view at 1x |
| --- | --- | --- |
| 01 | swap | Crisp in both themes. The common web icon. |
| 02 | morph | Crisp, filled. Its middle frames are an unnamed blob. |
| 03 | half | The crispest of all. The theme in force cannot be read from it: both themes show a half fill. |
| 04 | eclipse | In the dark theme two overlapping rings with rays. Reads as a sun. Fixed as eclipse-2. |
| 05 | horizon | Legible: a moon or a sun over a line. Reads as a weather icon. |
| 06 | aperture | The moon in the window is a blob, and the sun with its dashes reads as an eye. |
| 07 | knob | The pointer is lost. Reads as a sun. |
| 08 | dimmer | The dark state is a sun with dotted rays, so it reads as light. |
| 09 | panel | Crisp. Reads as fullscreen. |
| 10 | selector | Crisp. Its filled key is the loudest mark of the top bar. Fixed as selector-2. |
| 11 | iec | Crisp. Reads as the brightness setting of a monitor. |
| 12 | hatch | The hatch turns to a grey dither in the dark theme. State as in 03. |

Three faults of the first build, fixed before the critics saw the sheets: the eclipse's disc left a speck in the corner and slid out as a square, the watch disc was too small, and the watch disc turned around the wrong point. The shared rule had a higher specificity than the candidate's own `transform-origin`, so the shared rule now sits inside `:where()`.

## The critics

Gemini 2.5 Pro and GLM 5V Turbo, each over the same sheets. The brief set ten candidates and one critic loop. The references added two candidates, so a second loop judged all twelve. A compare loop and a check of the key followed the fix loop. The spend stayed at $0.24 of the $3 cap. The prompts: [the candidates](critique-prompt.txt), [the compare](critique-compare-prompt.txt), [the key](critique-key-prompt.txt).

The scores of the two loops over all candidates (loop 1 had candidates 01 to 10, loop 2 all twelve), [loop 1](critique/loop1/), [loop 2](critique/loop2/):

| Candidate | Gemini 1 | GLM 1 | Gemini 2 | GLM 2 | Mean |
| --- | --- | --- | --- | --- | --- |
| eclipse | 8 | 5.5 | 10 | 7 | 7.6 |
| swap | 5 | 8 | 8 | 8 | 7.3 |
| half | 9 | 7.5 | 5 | 6 | 6.9 |
| morph | 8 | 4 | 9 | 5 | 6.5 |
| hatch | | | 6 | 7 | 6.5 |
| selector | 3 | 9 | 4 | 8 | 6.0 |
| aperture | 2 | 8.5 | 4 | 9 | 5.9 |
| panel | 6 | 7 | 1 | 7 | 5.3 |
| horizon | 1 | 6 | 7 | 5 | 4.8 |
| iec | | | 3 | 6 | 4.5 |
| knob | 3 | 5 | 2 | 5 | 3.8 |
| dimmer | 4 | 3 | 2 | 4 | 3.3 |

The two critics disagreed, and each disagreed with itself between the loops: Gemini moved the half disc from 9 to 5 and the eclipse from 8 to 10 on the same pixels. The director checked each claim about legibility against the 1x pixels:

- Gemini called the selector "an illegible texture" and the horizon "a smudge" at 1x. Both read cleanly. Overruled.
- GLM called the watch disc "the only candidate that embodies the instrument idiom". Its moon at 1x is a blob. Overruled.
- All four critiques agreed that the knob, the dimmed sun, the panel and the IEC sun read as brightness or fullscreen first. Taken: dropped.

Carried into the fix loop: eclipse, selector and half, with swap as the baseline. The eclipse became eclipse-2: a filled sun with the moon's shadow cut out of it, so the dark theme shows a crescent inside the rays, as Material's brightness_4 did for years. The selector became selector-2, with its frame and key in the panel border colour.

The compare loop over the four finalists, [the answers](critique/compare/):

| Finalist | Gemini | GLM |
| --- | --- | --- |
| selector-2 | 9 | 9 |
| eclipse-2 | 5 | 8 |
| half | 7 | 4 |
| swap | 6 | 6 |

Both picked selector-2. Gemini found the crescent of eclipse-2 illegible at 1x, while GLM ranked eclipse-2 second.

## The key: a fix after the pick

The console's rule asks for 3:1 for a fill that carries a state. The pressed key of selector-2 measured 1.60:1 on the page in the dark theme and 1.75:1 in the light theme, and neither critic named it. The key of selector-3 is a 1 px outline in `--text-muted`, which measures 7.51:1 and 6.58:1. The glyph in force is drawn in `--text`, the other one in `--text-muted`, which measures 7.51:1 and 6.58:1 on the page. The last check, [the answers](critique/key/), with scores out of 10:

| Check | Gemini selector-2 | Gemini selector-3 | GLM selector-2 | GLM selector-3 |
| --- | --- | --- | --- | --- |
| state readable | 2 | 9 | 3 | 8 |
| quietness | 8 | 9 | 5 | 9 |

Gemini's one change, taken for the build: the hover belongs to the half under the pointer, not to the whole control. Two buttons give it for free.

## Not taken

- **A system position (follow the operating system).** Geist, Nuxt UI and Astro offer it. The brief keeps the behaviour: dark is the default, and the choice is remembered.
- **A cyan glow on hover** (Gemini) **and an amber flash during the switch** (GLM). Cyan is the system's colour and amber is the one signal that needs a person. A theme is a normal state, and normal states whisper.
- **An inner shadow under the key, a snap with overshoot** (GLM). The shadow adds noise at 20 px, and the 280 ms ease-out already ends without a bounce.

## Cost

No images were generated. The research agent and the builds cost tokens only.

| What | Count | Each $ | Total $ |
| --- | --- | --- | --- |
| critiques, Gemini 2.5 Pro and GLM 5V Turbo | 8 | 0.03 | 0.24 |
| the round | | | 0.24 |

The round's cap was $3.
