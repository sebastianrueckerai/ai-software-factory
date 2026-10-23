# Handover: the console takes the Mission control design

Written on 2026-10-14 for a fresh controller session in this repository. The design round of 2026-10-14 ended with Sebastian's pick, 06 Mission control, and an implementation plan: [2026-10-14-console-design.md](2026-10-14-console-design.md), roadmap item 227. This handover adds what the plan assumes: an orientation step, because other rounds land in the meantime, and the small prerequisites found on 2026-10-14. The speed round ([2026-10-14-speed-handover.md](2026-10-14-speed-handover.md)) may be running or done when you start; its items 1 and 2 make rolls fast, and nothing here waits for the rest of it.

## Read first

- The plan: [2026-10-14-console-design.md](2026-10-14-console-design.md), its work items and their order.
- The design: `design/ia.md` (the structure every part follows), `design/inventory.md` (every control that must stay), `design/themes/06-mission-control/DESIGN.md` (the rule set), `design/prototypes/06-mission-control/index.html` (the spec where words are ambiguous; open it with `?scenario=busy&theme=dark`), `design/design-decisions.md` C1 to C7, and the images the plan links.
- [roadmap.md](../roadmap.md): items 177, 219, 221, 225, 226, 227, and 210 (the budget action on a capped card, card 641).
- [architecture.md](../architecture.md): rulings 247 (colour), 251 (the five parts), 255 (the columns are a view).

## Rules of the round

- Work in a worktree of `~/repos/ai-software-factory-code` (Forgejo `origin`, branch `main`); the lab lives on its branch `console-design` (`scripts/console-lab/run.sh`, `internal/console/lab_test.go`), rebase it onto `main` and merge it first if nobody has.
- One pull request per plan item, each with the lab's before and after shots in the pull request's description, `go test ./internal/console/` green, and the structural check (below) green. Approve your own rolls in the console as `controller` (ruling 109).
- The console tests read the markup. Keep the class names and data attributes they read (`card`, `data-card`, the column titles, `approval-<id>`) unless an item has to change them; then the test gets the one-line change and the commit names it.
- The page copy stays factual and never says how it was made. Every text pair in both themes at 4.5:1, measured.
- Record every decision in the roadmap and in `design/design-decisions.md` (C8 onward). Reports and commit messages follow the writing guide in `~/.claude/skills/ste-writing`.

## Step 0: orient, before any change

Find out what has landed since 2026-10-14 and adjust the plan's order to it. Answer each in the plan's "Where it stands" section before the first commit:

1. `git log origin/main` since f98d5061: which cards touched `internal/console/`? Read their diffs. In particular item 221 (the configuration version and its infra commit on the board, PR 636): where does it sit in the markup now, and where does the design put it (the top bar's right end or the expanded status panel; add it to `design/ia.md` and the prototype if the prototype lacks it).
2. Item 225, the lanes collapse: built or not? Check whether the process files in `~/repos/ai-software-factory-infra/factory/processes/` still carry a `lanes` block and whether `board.html` still renders the lane columns, `moveCard`, `startPlan` and `acceptPlan`. If built, the plan's items 3, 4 and 7 land with the rest; if not, they wait and the first pull requests restyle the lane forms quietly instead of removing them.
3. Item 226: does the whole card chip open the drawer and is Files the last tab already? If so, item 3's opener and item 5's tab order are done.
4. Card 641 (item 210), the budget action on a capped card: landed? Then it is a control the inventory lacks: add it to `design/inventory.md` and to the capped item in the plan's item 4 (a "raise the budget" row with an amount and a reason, under "Grant one session with this answer").
5. The speed round: are rolls out of the merge queue, and do sessions survive a restart (no `roll_holds`, no `AwaitSessionGap`)? If not, expect each roll to wait for a session gap and merge your pull requests when the board is quiet.
6. Open cards and pull requests touching `internal/console/` right now (the Forgejo API, `repos/sf/ai-software-factory-code/issues?state=open` and `pulls?state=open`), so nothing is built twice.
7. The lab branch: merged into `main` or not.

## The small prerequisites, before the plan's item 1

Each is its own small pull request, test-covered:

- The lab merged (step 0.7).
- The board page carries today's spend and the day cap (the costs page has them from `ledger.go`), the GitHub remote's URL (the mirror row), and a flag for a plan-class task (so the face can say "planning"); the status panel and the stage word read them.
- Item 221's element placed in the design (step 0.1).
- The structural check: a Playwright script in `scripts/console-lab/` in the shape of `design/prototypes/check.js`, run against the lab: every inventory control present in the four scenarios, the drawer at the right edge and never over the chat, Escape closes it, the chat above the board at 390 px, no horizontal scroll at 390, Do it becomes an applied line. It runs before every pull request of this round.

## Then the plan's items

In the plan's order: 1 tokens and the base sheet, 2 the shell with the pulse band and the expanding status figures, 5 the drawer, 6 the chat; then 3 the board, 4 the Needs you items and 7 New task's Track, which land with item 225 if it is not yet built (the lane forms must not survive an interim); 8 the secondary pages last. The prototype is the target for each: compare the lab's shot with the prototype's shot of the same scenario and theme before you open the pull request.

## Not in this round

The other nine prototypes (the record), the notification service (145), the PWA (146), the analytics page (147), a wide view with lanes, a console app in the Terminal direction.

## Report at the end

The before and after from the lab in both themes and the four scenarios, side by side; the structural check's output; every pull request and roll number; what is not verified; the roadmap items ticked (227, and 177's parts it closes) and the decisions recorded.
