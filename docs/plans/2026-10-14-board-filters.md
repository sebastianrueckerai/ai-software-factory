# Plan: the board's find box and the column menus

Sebastian's pick of 2026-10-14 from the board filters design study ([design/rounds/02-board-filters/](../../design/rounds/02-board-filters/index.html), its handover [2026-10-14-board-filters-handover.md](2026-10-14-board-filters-handover.md)): the find box of variant A and the column menus of variant C together, recorded as C13 in [design/design-decisions.md](../../design/design-decisions.md), roadmap item 236. The variants in the round folder are the spec where words are ambiguous: `find/index.html` for the box, `menus/index.html` for the menus. The console's board after the round of 2026-10-14 ([2026-10-14-console-design.md](2026-10-14-console-design.md)) is the one this plan changes.

Two asks from Sebastian on the live board the same day, taken into the round ahead of the pick's items: the columns show a horizontal and a vertical scrollbar by default, and they must never scroll sideways and scroll down only when the cards overflow (item 0a); and the default order of every column is arrival, the newest card on top, so a freshly done card sits on top of Done (item 0b). Needs you keeps oldest first, the order the IA and the study set, unless Sebastian says otherwise.

## Work items

- 0a. **The columns scroll only when they must, never sideways.** The column is its own scroll container and its corner marks are a pseudo-element one pixel outside it, so every column overflows by a pixel on the right and the foot and shows both scrollbars with one card. The fix is the prototype's structure: the column holds its head and a body, the body scrolls down when the cards overflow and clips sideways, the column itself never scrolls.
- 0b. **Arrival order, the newest card on top.** Queued by filing time, In progress by admission, Done by finishing time, each newest first, sorted on the board whatever the store's order (roadmap 234 names the store's `priority DESC` on Done). Needs you stays oldest first.
1. **The find.** `boardFilter` carries `Q`, read from `?q=` and from a form's hidden field, written by `query()` and the `filter` template, so every form, the poll, the card fragments and the stream keep it. `boardOf` keeps every column's whole count and narrows its cards and its Needs you items to the terms: a word against what the face says (the ref, the title, the state and stage words, the activity line, the chips, an item's headline), a `key:value` term against a fact behind the face (`plan:`, `stage:`, `status:`, `is:`, `by:`, `model:`, `pr:`), every term matching. The column's count reads "n of m" when they differ, an emptied column says "none match", and the Needs you column keeps its amber from its whole count. The status panel's lists read the whole columns. `board.html` gets the box in the board's head: a GET form with the project and the view as hidden fields, the box with its placeholder, × as a link to the board without `q`. `page.html` lists `f` in the keys. `console.js`: `f` focuses the box, Escape in it clears and submits when it holds text, else leaves it. `console.css`: the box, the on state, the × and the counts, the phone's full-width box at 44 px. `check.js` gets the box's words and a find that narrows. Tests hand-derived on the screen rig.
2. **The menus.** `boardFilter` carries an order and a show per column (`queued`, `queued-only`, `progress`, `progress-only`, `done`, `done-only`), with the same plumbing. The orders, newest first the default everywhere (item 0b): Queued newest first, oldest first, next up (the scheduler's rank); In progress newest first, oldest first, by stage, by spend; Done newest first, oldest first. The shows: Queued all, blocked only, from plan #n; In progress all, exceptional only; Done all, failed only. `boardOf` orders and narrows Queued, In progress and Done after the find. `board.html` renders a `details` in each of the three heads: the summary is the ▾, the body a GET form with two radio groups and an Apply button for a browser without script, the state line under the head with × as a link to the column's default. `console.js`: a change submits the form, Escape and a click outside close the menu. `console.css`: the ▾, the on state, the popover inside the column's width, the state line, the phone's 44 px targets. `check.js` opens the menus before it reads the page and tries one filter. Tests hand-derived.

Each item is one pull request from the controller's fork with the lab's before and after shots in its description, `go test ./internal/console/` green, the structural check green, every new text pair measured at 4.5:1 in both themes, no inline style. Landed by the controller's push to main after a green test job, the pull request closed with the commit.

## Where it stands

Orientation on 2026-10-14 before the first commit, the code repository's `origin/main` at fc5f612 (roadmap 233 landed after C11):

- The lab, the structural check and the four columns are on main. The board's filter is the project and the view (`boardFilter`, `urlFilter`, `formFilter`, `query()`, the `filter` template), the stream reads the board under `urlFilter` and sends the columns' counts as `counters`.
- The console tests read the column by `>Title <span` (`col` in lanes_test.go) and the cards by `data-card` (`columnItems` in screen_test.go), so the menu's control sits after the count in the markup and before it on the screen.
- Open pull request 759 (roadmap 229, the face's title) touches `titleClause` in board.go, far from the filter and the columns.
- The Done column's order came from the store (`priority DESC, finished_at DESC NULLS FIRST`, roadmap 234). The factory's card for 234 landed as #762 the same afternoon and the store now sorts finished cards by date; item 0b sorts on the board as well, so the board's order holds whatever the store does.

## The round's ledger

| Step | Pull request | Commit on main |
|---|---|---|
| Item 0a, the columns' scrolling | 763 | 418a188 (rebased on a roll and on 762, the store's Done order, that landed first) |
| Item 0b, arrival order | 766 | 8f2b0d1 (rebased twice on rolls and the factory's 759) |
| Item 1, the find | | |
| Item 2, the menus | | |

## Rulings

- The find submits on Enter as a plain GET, not on a pause in typing: a swap of the columns alone would leave the stream on the old filter, since the stream opens with the page's query. The reload is the one way that keeps the poll, the fragments and the stream on the same query.
