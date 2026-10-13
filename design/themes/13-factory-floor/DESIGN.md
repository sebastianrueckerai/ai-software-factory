# Theme: Factory floor

Read off round 01 `13-factory-floor-dark.png`, `13-factory-floor-light.png` and the round 02 images (drawer, idle, phone), with the director's notes of 2026-10-14. The images are the target; this file is the rule set a builder follows when the image is ambiguous.

## Idea in one line

A factory floor at night (dark) and by day (light): work orders on painted lanes, a radio panel to the foreman, an andon lamp for the line's state, one safety yellow for what needs a person. Industrial and exact, never cartoonish: the grid carries the look, every gimmick stays small.

## Tokens

Materials keep their colour across the two moods: paper stays light, the radio faceplate stays dark, only the floor changes (night shift, day shift). That is what keeps light from being an inverted dark.

| Token | Dark | Light | Use |
|---|---|---|---|
| --bar, --band | #0e0f11, #111214 | #f3f3ef, #f3f3ef | top bar, pulse band |
| --bg | #18191b | #dcdbd5 | the floor (concrete) |
| --bg-raised | #222326 | #fafaf8 | the chat panel, the drawer (opaque; a scrim dims the board while the drawer is open) |
| --turn | #1a1b1d | #f0f0ec | the agent's turn in the chat, a faint faceplate panel |
| --plate | #0c0d0e | #26282b | faceplates: the chat header, the drawer header (dark in both) |
| --bg-sunken | #141517 | #d2d1ca | the board's lanes (columns) |
| --card | #26272a | #ecebe5 | a queued slip (order not yet on the line) |
| --paper | #dcdbd5 | #ffffff | Needs you bodies, the chat's proposal, the drawer's open need |
| --paper-dim | #bdbcb6 | #f2f2ef | a work order on the line (working, verifying): dimmed so the yellow stays the only bright thing on the board; darker paper inks (#0f4f29, #6c3a00, #1a4285, #8a1b15, muted #45463f) keep 4.5:1 |
| --line, --line-2 | #2c2e31, #3d4044 | #c4c3bc, #a9a8a0 | hairlines, card top rule |
| --text | #ebeae5 (14.2:1) | #161719 | ink |
| --text-muted | #a09f99 (6.3:1) | #50514b | meta, the done ledger |
| --accent | --text as a fill | --text as a fill | no hue accent: the primary button is solid ink (light on dark surfaces, black on paper); focus is a 2 px ring in the surface's ink |
| --need | #ffcf1a, ink #141414 (12.5:1) | same | Needs you bands and the pulse's warning sign only |
| --st-running | #5fcb92 / on paper #11592f | #11592f | dot, state word |
| --st-waiting | #f2a53c / on paper #7a4200 | #7a4200 | waiting on a human or dependencies, near budget |
| --st-review | #84b5ff / on paper #1d4a92 | #1d4a92 | in review |
| --st-done, --st-closed | #a09f99 | #50514b | stamp ink: muted text in a --line-2 outline |
| --fail-muted | #d98478 | #9a3b30 | the failed stamp, outline at 55 percent |
| --st-failed | #ff7b6c / on paper #98201a | #98201a | stamp, over-cap spend, provider down |
| andon | lit #39d07a, #ffab2e, #ff4d3d; unlit = 1 px ring | same | the lamp stack |

Every state text pair is 4.5:1 or better on its surface (paper hues 5.3 to 5.7:1 on #d3d2cb).

## Type

- Sans (body, 13 px director's rule): Inter, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial.
- Condensed (section heads, card titles, stamps, the home word): Roboto Condensed, Helvetica Neue Condensed, Arial Narrow, Liberation Sans Narrow. Heads are bold with `font-variant-caps: all-small-caps` and 0.08 em tracking: a stencil feel without a stencil face, and the words stay in their real case for assistive tech.
- Mono (activity line, tool blocks, file paths): JetBrains Mono, SF Mono, Menlo, Consolas, Noto Sans Mono.
- Scale: 11 (stamps, labels), 12 (state row, chips), 13 (card body), 14 (card title, condensed 600), 15 (chat message), 16 (Needs you band headline, condensed 700), pulse sentence clamp(21 px, 1.75 vw, 30 px) at 700.
- Numerals tabular everywhere a figure sits: status row, state rows, tables, times.

## Layout at 1440 and 1920

- Top bar 44 px, pulse band under it across the full width.
- Below: the chat as a full-height panel on the LEFT at 42 percent (director's note: the mockup's bottom radio panel moves left so the drawer never covers it), the board on the floor at the right.
- The chat faceplate and the board's header row are both 56 px: one line runs across the screen under the pulse.
- Light theme: the top bar uses the full text ink, never the muted one.
- Board columns: Needs you 1.5 fr, the other four 1 fr each, min 132 px; under that the lanes scroll sideways inside the board, never the page.
- Drawer: right edge, min(46 vw, 720 px), from the pulse band to the bottom, over the board only; 42 + 46 percent leaves the chat free.
- Wide view: the board takes the full width (the chat folds away until Five columns), Human lane over Needs you, Agent lane over the rest, lane badges and drag handles on the cards.

## The pulse

The sentence first, the largest type on the screen. Under it the status row: the andon stack (three 10 px lamps, red, amber, green top to bottom, the lit one filled, the others a ring) beside the state word, then the figures separated by 1 px rules. Spend carries a 40 px meter.

- Prominent (a card needs a person): the yellow warning sign before the sentence, weight 700.
- Subdued: no sign, weight 500, same size: it still reads first.
- Lamp: red when the provider refuses or spend passed the cap, amber when waiting on you, green when working, none when idle.

## The chat

The main region. Messages at 15 px; each agent turn sits on a faint faceplate panel (--turn, 1 px line); the composer is three rows at 15 px. Faceplate header 56 px (dark plate in both themes): an on-air lamp (unlit ring, lit red while the agent types), "Chat" in stencil caps, "project agent · project", the old-conversations select, New conversation. The log at most 68 ch; your message a plate on the right; an agent reply under a small "agent" call sign; tool blocks a mono line with a 2 px rule, closed; a proposal is a paper work order (top rule, punch hole) with Do it (solid ink) and Skip (quiet); applied is a green-ink line with undo. "This is your own conversation…" above the composer: a three-row box with Send; the queue under it as editable, removable slips.

## The board and the card

- Column head: 2 px top rule, stencil caps name, a count box. Needs you's rule and count box turn yellow when it holds items.
- Work order: 2 px top rule in ink, a 6 px punch hole at top centre, the ref as the order number, the title (condensed 600, two lines), the state row (dot and word in the state's hue, elapsed, then only the exceptional figures), the mono activity line on working cards, exceptional chips, a row of quiet small buttons.
- Queued cards are dark slips; Working and Verifying are dimmed paper; done, failed and closed are ledger lines on the lane, no box, stamped "done", "failed" or "closed" in a muted outline tag (failed in a muted red outline); titles in the muted token. One line when the lane is wide enough (container query at 210 px), else the ref and stamp over the title.
- Stale: a dashed waiting-hue outline around the order, the stale words in the activity line. Near budget: the spend figure with ⚠ in the waiting hue.

## Needs you

The loudest thing on the screen: a yellow band with dark condensed 700 text (the headline: "Merge PR #n" or the escalation's ref and title) and its age, over a paper body.

- Merge approval: the task, chips (risk in red ink, migration), "Model review" and "Agent's recommendation" lines, Approve as you full width in solid ink, Deny and Split quiet, Details opens the drawer at Reviews and audit. Deny unfolds the reason box and the "Deny by" choice.
- Escalation: the state row, the question with "answer on the issue", the choices as full-width buttons, "Or in your words" as a disclosure, the verdict buttons small at the end.
- Capped: the text box open, "Grant one session with this answer" as the primary.
- Resource approval, plan approval and human task follow the same band and body (not in the four scenarios).
- An action turns its row into a one-line ✓ confirmation in place.

## The drawer

An opaque panel at the right edge, the board under it dimmed by a scrim (a click on the scrim closes), with a faceplate header (ref, title in condensed 700, close), the facts row, tabs Overview, Chat, Activity, Files (2 px ink underline on the active tab). Overview: the four-line top block as a ruled definition list (2 px top rule, hairline per row, an 88 px label column in stencil caps), the open need on paper, then the collapsed sections with stencil-caps summaries. spaced section heads (15 px padding, a hairline each). Chat: the session log with a 96 px speaker column (name in stencil caps, time under it). Activity: gates with a meter against the longest, steps. Files: a tabular table.

## The phone

Under 900 px one column: the top bar with a menu, the pulse, the status row as one line of 12 px small caps with the lamps at 8 px in a row and the figures as plain text under it, the chat (log 55 vh, composer), then the board as stacked lanes: Needs you, Working, Verifying, Queued, Done (collapsed). Every Needs you button and choice is 44 px tall, full width, one per row, ink-filled (primary) or outlined; the Deny choices are two outlined 44 px rows. The drawer full screen.

## Motion

Hover: buttons lift one step of ink, rows tint, title underlines. Focus: 2 px ring, 2 px offset, in the surface's ink. Typing: three dots in the log and the on-air lamp lit. The drawer slides 12 px and fades in 160 ms. Reduced motion: no slide, no dot animation.
