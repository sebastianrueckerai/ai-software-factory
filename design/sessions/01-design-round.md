# Session 01: the console design round

The portfolio's process ([portfolio/docs/process.md](../../../portfolio/docs/process.md)) applied to the Factory console. Images go wide, a vision critic judges, Sebastian picks, code follows. Everything here runs in isolation: the docs worktree `asf-docs-console-design` for the artefacts, the code worktree `asf-code-console-design` for the console's templates and CSS. Nothing deploys.

## Goal

When the round ends, Sebastian opens one page, [design/index.html](../index.html), and sees 6 to 12 built versions of the console, each in dark and light, each screenshotted in the same four real scenarios (busy, idle, fire, quiet) and the same views (board with chat, drawer open, phone), with the critic's ranking and the director's notes. He picks. The pick is then implemented in the console's templates and CSS, in the code repository.

## Inputs

- The brief: [brief.md](../brief.md). The hierarchy: pulse, then chat as the main affordance, then the board. Drawer docked right. Phone: chat first, board below.
- The inventory of every control and data point: [inventory.md](../inventory.md). Nothing is dropped; anything may move.
- The lab: `scripts/console-lab/run.sh` in the code worktree serves the real console with fake data in four scenarios and screenshots every view in both themes. The baseline shots of today's console come from it, free.
- Models and keys: the portfolio's [models.md](../../../portfolio/docs/research/models.md) and `.env.tools`; `tools/img.py` and `tools/shoot.sh` run from the portfolio root with absolute `--out` paths. The critic is Gemini 2.5 Pro through fal's `any-llm/vision`.
- Spending cap: **$100** (Sebastian, 2026-10-14, for fal and other services; tokens are not capped), estimated $12 to $30. The fal key cannot read the real spend; `tools/img.py cost` adds up estimates. Sebastian checks the fal dashboard afterwards.
- Picks between rounds are the director's with the critic's ranking next to them, provisional, as in the portfolio's overnight run. Only Sebastian's picks are decisions and go into `design-decisions.md` in this folder.

## Stages

0. **Baseline, free.** The lab's screenshots of today's console: four scenarios, two themes, board, wide, drawer, phone, every secondary page. Committed under `rounds/00-baseline/`. These are the reference images every direction restyles and the critic's "before".
1. **The shared information architecture, free.** One template set for every skin. The changes are the brief's hierarchy and roadmap item 177, written as `ia.md` before any code: the pulse as the top band; the chat as the main region; the board quiet (a done card is one line; the activity line, model chip and spend show only when they matter); the drawer docked to the right edge over the board, never over the chat; the face's "More" fold gone, the drawer is the one detail view, its Overview with the four-line top block (task, status, budget, agent) and collapsed sections; the header and the filter row merged into one quiet bar; the phone as one column, chat first, board below. Every skin inherits it. Where a direction wants a different layout (a chat at the bottom, a board as rows), the skin's CSS does it with grid; the markup stays one.
2. **Model probe, about $1.** The busy baseline screenshot as reference, one restyle prompt, on the edit models (`flux-3/edit-image`, `nano-banana-2.1/edit`, `gpt-image-2.5/flare/edit`, `seedream v5 edit`, `qwen-image-3/edit`) and two text-to-image models (`ideogram/v4`, `recraft v4.1`). Pick the cheap one for breadth and the strong one for craft, as the portfolio did.
3. **Round 1, breadth, about $3.** 16 directions that differ in kind, each its own layout and its own answer to "which element is the main one". One dark image per direction, 16:9, from the busy baseline as reference, then the light image as an edit of the dark one so the layout stays identical. Contact sheet, critic, director's notes, provisional picks: 8 to 10 carried forward.
4. **Round 2, depth, about $5.** Per carried direction: the drawer open on a running card, the phone, the idle scenario (the quiet state must look as good as the busy one), and one craft pass of the busy screen with the strong model. Hybrids where two directions want to merge.
5. **Themes.** `themes/<slug>/DESIGN.md` and `tokens.css` per carried direction, read off the images: colours, type, spacing, what whispers and what speaks, the drawer, the phone.
6. **Build.** Prototypes, not the console (Sebastian, 2026-10-14: "by whichever way possible, we can implement it later"). One builder per direction, in parallel: `prototypes/<slug>/index.html`, one plain HTML file with its CSS and JS, no build step, no framework. Each has the dark and light theme on a toggle, the four scenarios on a switch (the content from `content.md` and the lab's scenarios as JSON in the file), the drawer, the chat with a proposal, the Needs you actions, and the phone layout. Every control of `inventory.md` is present. The shared IA of `ia.md` is the floor each builder starts from; the direction may bend it where the theme says so. The real console takes the picked design afterwards, in the code repository.
7. **Render and critique, about $1.** The lab shoots every skin in every scenario and theme. The critic sees the round 2 reference beside the real screenshots. The director filters the critique into a numbered fix list per builder. At most 3 loops per skin.
8. **The page and the picks.** `design/index.html`: every skin as a row, the scenarios and themes as columns, the baseline as the first row, links to run each live. `PICKS.md` for Sebastian. `notes.md` per round with cost, time and what worked.

## The 16 directions of round 1

Each names its layout and which element leads.

| # | Direction | Layout and lead | Kind |
|---|---|---|---|
| 01 | Linear calm | Chat centre, board as a quiet strip left, pulse as a one-line banner. Monochrome greys, one blue, hairlines, 13 px grotesk | calm |
| 02 | Geist mono-contrast | Pure black or white, one accent only for Needs you, no card borders, whitespace as structure. Chat right half, board left | calm |
| 03 | Soft SaaS | Warm whites, rounded cards, pastel pills, friendly type; chat as a wide centre column, board as a bottom shelf | calm |
| 04 | Swiss grid | Strict 12 columns, a big numeral status line (spend, needs you), one red; chat and board as two equal columns, pulse as the headline | editorial |
| 05 | Broadsheet | Newspaper: serif heads, the pulse as the day's headline, columns with rules, light is paper, dark is the night edition | editorial |
| 06 | Mission control | Near-black, telemetry mono numerals, status line as an instrument strip, Needs you as a lit priority tray across the top, chat as the console at the bottom | instrument |
| 07 | Trading floor | Dense Bloomberg-like, orange on black, tabular numerals, every card one row, events as a ticker, chat as the message pane | instrument |
| 08 | Grafana dense | KPI row with sparklines (spend over the month, throughput), compact board tiles, graphite and teal, chat right | instrument |
| 09 | Inbox first | Needs you as an inbox list on the left like Mail, chat centre, board collapsed to a progress strip on top that expands | layout |
| 10 | Command palette | A Raycast-like command bar as the chat input at the top centre, replies as a sheet below it, board in dense tiles beneath, drawer as a right sheet | keyboard |
| 11 | Terminal brutalist | Monospace everything, box-drawing borders, phosphor amber on black, paper tape cream in light, chat as a REPL at the bottom | wild |
| 12 | Blueprint | Grid paper, thin cyan or blue lines, cards as schematic blocks, the flow between columns drawn as wires, the drawer as a detail callout | wild |
| 13 | Factory floor | Stencil labels, an andon lamp stack as the status line, cards as work orders, one yellow used sparingly; chat as the foreman's radio | wild |
| 14 | Glass depth | Translucent panels, soft shadows, 12 px radii, blurred backdrops, Arc or macOS; chat as the front pane, board behind it | material |
| 15 | Riso print | Two inks, halftone status blobs, stamped pills; light is paper, dark is black paper with fluorescent inks; the portfolio's loud end on a tool | wild |
| 16 | Phone first | Designed at 390 first: chat on top, pulse as a chip above it, the board as a horizontally scrolling row of columns below; the desktop is that, widened | layout |

## Limits that keep the run from drifting

- 16 directions in round 1, no more. 8 to 10 carried, at most 3 hybrids.
- At most 3 render and critique loops per skin.
- Stop all generation at $100. Ask before a run that would pass it.
- This is an overnight run (Sebastian, 2026-10-14): he answers in the morning. The director picks provisionally between rounds. Iterate where it is productive, never for hours on one small element. The run stops when the page exists or when a step needs Sebastian.
- Nothing deploys, nothing merges to `main`; the worktrees hold everything until Sebastian picks.
- Prototypes are single HTML files, no build step. The code worktree holds only the lab (the test file and the shoot scripts) until a pick is implemented.

## Done when

- Every image can be made again from its sidecar JSON.
- `design/index.html` shows the baseline, both rounds and every built skin, in both themes and the four scenarios.
- Each round has a filled `notes.md`; `design-decisions.md` holds Sebastian's picks.
- The spend estimate is under $100.
- Both worktrees are committed on their `console-design` branches and pushed.
