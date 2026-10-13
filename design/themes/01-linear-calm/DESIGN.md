# Theme: Linear calm

Read off round 01 `01-linear-calm-dark.png`, `01-linear-calm-light.png` and the round 02 images, with the director's notes of 2026-10-14. The images are the target; this file is the rule set a builder follows when the image is ambiguous. Where the notes and the image differ, the notes win: the chat takes 44 percent of the width (the image shows about a quarter).

## Idea in one line

The control direction: a Linear or Height product screen, monochrome cool greys, one blue, hairlines and exact spacing, and the only warm colour on the screen marks what waits for a person.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| --bg | #0c0d0f | #f6f7f8 | page |
| --bg-raised | #141518 | #ffffff | the pulse band, the chat panel, the drawer |
| --bg-card | #121316 | #ffffff | board cards (quieter than the chat panel in dark) |
| --bg-hover / --bg-active | #1a1b1f / #202227 | #f0f1f3 / #e8eaed | hover, the active nav item, pressed |
| --line, --line-2, --line-3 | #222429, #2d3036, #3a3d44 | #e4e6e9, #d6d9de, #c3c7ce | hairlines, control borders, hover borders |
| --text | #e6e7ea | #17181b | titles, the pulse sentence, chat text |
| --text-2 | #b0b4bc | #34373d | secondary text, column titles |
| --text-muted | #8a8e98 | #4b4f58 | meta, done rows and their icons, the status figures, the composer's helper line (light: 8.2:1 on the card and the panel, 7.7:1 on the page, 7.8:1 on the Needs you fill) |
| --accent | #7ea6f8 | #2a5fd6 | links on hover, focus ring |
| --accent-bg | #3b6ee0 | #2f64dc | the primary button (Do it, Approve as you, Send with text), white text 4.6:1 |
| --need | #f0a24a | #df8d2c | the Needs you treatment: outline, the pulse rule, the waiting dot |
| --need-fill, --need-tint | --need at 7 % over the card, --need at 14 % | #fff8ee, #fcecd6 | the Needs you card's fill, its header strip |
| --need-text | #f4b065 | #995210 | warm text (5.9:1 on white) |
| --st-running | oklch(0.72 0.14 250) | oklch(0.52 0.15 250) | the running icon |
| --st-waiting | = --need | = --need | waiting on a human |
| --st-review | oklch(0.72 0.15 305) | oklch(0.52 0.18 305) | in review |
| --st-done | oklch(0.74 0.14 155) | oklch(0.52 0.13 155) | the applied check and a passed gate; the Done column and its rows stay grey |
| --st-failed | oklch(0.70 0.18 25) | oklch(0.53 0.19 25) | a failed card face, spend over the cap |
| --st-failed-muted | oklch(0.64 0.12 25) | oklch(0.50 0.13 25) | the failed done row's mark and word only |
| --st-closed, --st-queued | #8a8e98 | #626670, #8b8f98 | closed, backlog, queued |

The state hues sit on Linear-style status icons (dashed circle queued, half pie running, three-quarter pie in review, filled check done, filled cross failed, slashed circle closed), never on fills, so the shape and the word carry the state and the hue only confirms it. The state word stays grey, except waiting on a human (warm) and failed (red).

## Type

- One grotesk: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui`. Mono: `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, "Roboto Mono"`.
- Scale: 11.5 (kickers, chips), 12 (meta, state rows, status figures, buttons), 13 (body, card titles, nav), 14 (chat messages, the composer), 15 (the pulse sentence, weight 500), 17 (the drawer title, weight 600).
- Weights 400, 500, 600 only. Tabular numerals everywhere except chat prose.
- Activity line: mono 11 px, muted. A path splits before its file name: the head and the file share one line when they fit, else the file name takes the second line and the head ellipsises, so the file always shows. Text without a path wraps to two lines.

## Layout at 1440 and 1920

- Top bar 44 px, one quiet row: home word, "/", the project select, the page links, then theme, user, Log out and the scenario switch, all 13 px.
- The pulse band under it, full width, 12 px from every edge.
- The work area: the chat panel left at 44 percent, 16 px gap, the board right. Both run to the bottom of the viewport; the chat log and each column scroll on their own.
- Board columns: Needs you 1.3 fr, Queued, Working, Verifying 1 fr, Done 0.95 fr, 10 px gaps. Below 1200 px the columns keep 150 px and the board scrolls sideways inside itself.
- The drawer: absolute in the work area, flush to the right edge, min(46vw, 720 px) wide, from the pulse band down. It covers the board only.
- Wide view: the chat steps aside and the board takes the whole width; cards show their lane badge and the backlog drag grip.
- Radii 6 px on everything; spacing on a 4 px grid (4, 6, 8, 10, 12, 16, 20).

## The pulse

A raised band with a hairline. The sentence first at 15 px/500 in --text, "more" at the right end on the sentence's first baseline, opening the bullets. Under it the status figures in one 12 px tabular row: state dot and word, n working (`workingCount`), n waiting on the provider (when any), n need you (warm, links to the column), spend / cap with a 36 px meter, GitHub. Prominent: a 3 px --need rule on the left edge and the warm warning sign. Subdued: no rule, no sign. Spend over the cap turns the figure and its meter red. Three dots after the sentence while it recomputes.

## The chat

The main region and the brightest surface: raised panel, hairline, a soft drop shadow in dark only. Header row: "Chat" 14/600, "project agent · project", the old conversations select, New conversation. The log is a 560 px reading column centred in the panel. Your message: a right-aligned grey bubble. Agent reply: plain 14/21 text under a meta line. Tool block: a collapsed mono row (chevron, name, duration right), opening to arguments and result. Proposal: a hairline card, "I will:", the changes as a list, the detail muted, Do it (blue) and Skip (quiet). Applied: one line with a green check, "applied", the changes and undo. The composer: a bordered box, three rows of 14 px, the own-conversation line and Send in its bottom bar; the box takes the focus ring. Send turns blue once there is text. The queue sits under it as small editable rows.

## The board and the card

- Column header: status icon, sentence-case title 12.5/500, count muted. Needs you title in --need-text.
- Card: --bg-card, hairline, padding 8/10. Title 13/500 clamped to two lines with the ref in muted tabular. State row 12 px: icon and word, elapsed, n/n checks, gate and age, spend from 80 percent with "⚠ near its budget" in --text, fine states, PR link. Activity line in mono only on working and waiting cards. Chips 11.5 px hairline. Actions: 22 px buttons, Close quiet.
- Stale card: a dashed --line-3 border.
- Done, failed, closed: no box, 12 px muted text, outline glyphs in --text-muted (check, slashed ring; the failed row a cross and its word in --st-failed-muted), never brighter than a Working card; a row with the glyph, ref and title; one line where the column is 170 px or wider, two below that. Failed and closed add an 11.5 px line with the state word and elapsed. The elapsed of a done row appears when the column is 200 px or wider. At most 12 rows, then one quiet link "and n earlier"; the column never needs its own long scroller.
- Hover: border to --line-3, background to --bg-hover. Open card: --accent border.

## Needs you

The loudest thing on the screen and the only warm area. A 1 px --need outline, a 3 px warm glow in dark, the whole card filled with --need-fill, the header strip with --need-tint, the kicker (kind, since) and the headline 13/600. Merge: the chips, one line of model review, one line of recommendation, then the actions with the primary first. Escalation: the title is the headline and the question is not repeated; only its context follows in muted text, then the choices as full-width rows, then "Or in your words" as a small disclosure. The state and elapsed form one muted 11.5 px line, and the verdict ("Was this escalation a real problem?" with real problem · false alarm as text links) another. A capped card shows the text box open and "Grant one session with this answer". The full question and "answer on the issue" live in the drawer's open block.

## The drawer

Header: the ref as the issue link, the task id in mono, the close button; the title 17/600; the facts row; underline tabs Overview, Chat, Activity, Files (the underline in --text). Overview: the four-line top block as a 72 px label column, the open need in the Needs you treatment, then the collapsed sections as hairline-separated rows with a chevron. Dark: a soft left shadow. Light: a hairline only.

## The phone

Under 900 px one column: the top bar (home, project, menu), the pulse with its figures as wrapping plain text (no spend bar), the chat with its log at its natural height (no inner scroller, the page follows the composer when a message is sent) and the composer, then the board as sections in the order Needs you, Working, Verifying, Queued, Done, Done collapsed. Needs-you buttons and choices full width at 36 to 40 px. The drawer takes the full screen.

## Motion

120 ms colour transitions on hover. The focus ring is 2 px --accent with a 2 px offset. Typing dots and the streaming cursor pulse at 1 s. The drawer slides 12 px in 160 ms. With reduced motion: no slide, no pulse, the reply appears whole.
