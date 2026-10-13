# The console design round, overnight 2026-10-14

## Where we are

Ten working prototypes of the console exist, one per carried direction, each in dark and light, each switchable between the four real moments (busy, idle, fire, quiet), with the drawer, the chat with a proposal, every Needs you action and a phone layout. Behind them: a model probe, a round of 16 directions in both themes, a depth round with the drawer, the phone and the idle state, and two or three critique loops per prototype; the final `check.js` run passed on all ten. Estimated spend on images and critiques: $12.58 of the $100 cap. Everything is committed on the `console-design` branches of the two worktrees. Nothing touched `main`, nothing deployed.

Nothing is decided. Every pick in this run is the director's and provisional until you fill in [PICKS.md](../PICKS.md).

## Start here

1. **[design/index.html](../index.html)**, the morning page. Open it in Chrome from the docs worktree (`~/repos/worktrees/asf-docs-console-design/design/index.html`). It shows the ten prototypes in the director's order with their shots, then the console today from the lab, then the rounds.
2. **Open a prototype** from the page, or directly: `prototypes/<slug>/index.html?scenario=busy&theme=dark`. The switch at the top right steps through busy, idle, fire and quiet; the theme toggle is in the top bar; click a card title for the drawer; press Escape; click Do it in the chat; resize to phone width.
3. **[prototypes/notes.md](../prototypes/notes.md)**: the ranking and why.
4. **[PICKS.md](../PICKS.md)**: the form for your decisions.

## The ten, in the director's order

1. **06 Mission control**: the amber Needs you tray, the instrument strip with a spend gauge, the chat as the console on the left, an event ticker at the foot. The "wow" candidate.
2. **11 Terminal**: amber phosphor and box-drawing, the REPL across the bottom, bracketed buttons, a paper-tape light theme. The critic's top score (9/8).
3. **10 Command palette**: the chat as a Raycast-style command bar with its sheet, the board in dense tiles below, one violet.
4. **02 Geist contrast**: pure black or white, rules not boxes, one amber for Needs you. The Vercel look.
5. **09 Inbox first**: Needs you as an inbox on the left, the chat centre, the board as a strip that unfolds.
6. **16 Messenger dock**: the board on top, the chat as a full-width messenger dock below, the pulse band above both. The friendliest for a visitor.
7. **03 Soft SaaS**: warm, rounded, the chat centred above a shelf of columns. The light theme leads.
8. **01 Linear calm**: the control: chat left, board right, one blue. Shows what the shared IA alone does.
9. **04 Swiss grid**: black, white and one red, big figures, a 12-column grid. Strong at 1920, cramped at 1440.
10. **13 Factory floor**: yellow work orders, andon lamps, the chat as the foreman's radio on the left.

Dropped after round 01 with the critic's agreement: Broadsheet, Trading floor (its ticker went into Mission control), Grafana dense, Blueprint, Glass depth, Riso.

## What the shared information architecture changed

Every prototype follows [ia.md](../ia.md): the pulse band on top with the status figures under it; the chat as a region, never a side panel; the five columns with a quiet card face (no "More" fold, the model chip and the spend only when they matter, done cards one or two muted lines); Needs you items as decisions with the primary action first; the drawer docked at the right edge over the board, never over the chat, with the four-line top block and collapsed sections; the phone as one column, chat first, board sections below, Done collapsed. [inventory.md](../inventory.md) lists every control that stays; `check.js` verified each prototype has them.

## What the process taught

- **Edit models pinned to a screenshot cannot redesign.** Five of them reproduced the console's layout with garbled text. Text-to-image from a content deck (nano-banana-2.1) made legible, designed screens. For a UI that exists, describe the content and ask for a design.
- **Prototypes in plain HTML beat skins on the real console for a design round.** Ten builders in parallel, about 30 minutes each for the first build, free; the real console takes the pick afterwards.
- **Shared scripts keep ten builders honest.** `check.js` (every control, the mechanics) and `shoot.js` (the same shots for everyone) made the critique comparable and caught real faults (a phone overflow, a missing start line).
- **The critic is right on craft, wrong on structure.** Contrast, tap targets, cut text: take them. "The drawer covers the chat": look first.
- **Every first build had Done too loud and the light theme as an inversion.** Both are now rules in the builder's brief for the next time.

## Not done, or not verified

- The scenarios hold no plan approval, resource approval or human task, so those Needs you kinds are designed in the themes but never rendered. The lab's fake data has them; the next round seeds them into `scenarios.js`.
- Fonts: the prototypes use system stacks, and the shots show this machine's fallbacks (Noto, Roboto, Nimbus, DejaVu). A Mac shows SF and Menlo.
- Checked in Chromium only. No Safari, no Firefox, no screen reader.
- The wide view is partial in most prototypes: the lane badges and drag handles, no Human lane / Agent lane layout, because the scenarios have no lane data.
- The real console is unchanged. The lab (`scripts/console-lab/run.sh` in the code worktree) serves it with the four scenarios and shoots 80 baseline PNGs; the implementation of the pick starts from `ia.md` and the picked theme.

## Costs and time

| Step | Images | Spend |
|---|---|---|
| Round 00, model probe | 11 | $1.35 |
| Round 01, 16 directions, dark on two models and light | 48 | $5.60 |
| Round 02, depth and hybrids | 33 | $4.95 |
| Critiques, 2 round sheets plus 26 prototype passes | | $0.84 |
| Total | | about $12.58 of $100 |

The fal dashboard has the real number; the key cannot read it.

## Next

1. You pick in [PICKS.md](../PICKS.md): one to implement, or two for one more round (hybrids are cheap: a builder with two themes).
2. The pick is implemented in the console: `ia.md` becomes the template changes, the picked theme becomes `console.css`. The lab re-shoots the four scenarios for the before-and-after.
3. Seed the plan, resource and human-task items into the scenarios and the lab before the implementation, so they are designed on the real thing.
