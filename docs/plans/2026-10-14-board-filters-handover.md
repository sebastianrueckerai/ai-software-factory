# Handover: a design study for filtering and sorting the board's columns

You are the controller of the AI Software Factory. This is a design study first and a build second: think about what filtering and sorting would be useful on the console's board, show it with the least clutter, let Sebastian pick, then build the pick. Do not start the build before the pick.

## Read first

- [The console design plan](2026-10-14-console-design.md): "Where it stands", the ledger, the rulings, the final review. The board you change is the one that round built.
- [The console design handover](2026-10-14-console-design-handover.md): the mechanics of a round. The lab (`scripts/console-lab/run.sh`), the structural check (`check.js`), one pull request per item from the controller's fork, landed by a push to main after a green test job, decisions recorded, the plan's ledger kept.
- [design/ia.md](../../design/ia.md): the information architecture, the card face, the columns, the phone.
- [design/design-decisions.md](../../design/design-decisions.md): C1 to C12. C8 (four columns), C11 (one time on a card), C12 (no ticker) bound the board you start from.
- [design/themes/06-mission-control/DESIGN.md](../../design/themes/06-mission-control/DESIGN.md): the tokens and the rules of the look.
- The code: `internal/console/board.go` (`boardOf`, `fiveColumn`, `columnTitles`, `boardFilter`, `urlFilter`, the `card` struct), `templates/board.html`, `static/console.js` (`busy`, `swapBoard`, the stream's `follow`), `events.go` (the stream carries the board's filter), the tests' helpers `col` and `columnItems`.

## What the board is today

Four columns: Needs you, Queued, In progress, Done. Needs you holds the items oldest first. Queued holds backlog, plan, ready and waiting-deps cards. In progress holds running, closing and in-review cards, each with its stage word (planning, building, verifying). Done holds done, failed and closed cards as two-line rows, newest first. The wide view (the lanes as columns, kept until 225) stays as it is; this study is about the four columns.

The board's filter is the project (the top bar's select) and the view. Both live in the URL query (`?project=`, `?view=`), the board's `data-query` carries them, and every poll, card fragment and the event stream ask with the same query, so a swap keeps them. An accent filter existed and was removed on 2026-10-14: an accent is a colour with no meaning of its own, and no card wore one.

What a card knows, and so what a filter or a sort could use: the status and the stage, the lane (backlog, plan, ready, human), the age, the time in the stage, the budget and the spend, the checks, the issue number and the title, the author, the model alias, the priority and the size labels, the plan it came from, what it waits on, what blocks it, the pull request, the accent colour, the stale ring, the fine states (retrying, held, on the provider).

## What the study answers

1. Per column, what a member wants to find or to put first, and what already needs no control because a default order does it. Needs you oldest first is such a default. Say which orders and filters earn a control and which do not.
2. One control for the board or one per column. A sort menu in each column's header, a single search box that takes words and tokens such as `stage:verifying` or `plan:531`, a row of chips, or something smaller. Weigh clutter against reach: the IA's rule is no hover-only controls and nothing on the face that is not exceptional.
3. Where the state lives. The URL query, as the project does, so the poll and the stream follow it and a reload keeps it. Say how the pulse strip's counts behave: today the strip counts the project's cards and the status panel's lists follow the filter.
4. The phone (under 900 px, one column of sections) and the keyboard (the keys list behind `?`).
5. What the chat agent's board text does with it. Probably nothing: the agent reads the whole project. Say so if so.

Produce two or three variants, not ten. Build them on the prototype `design/prototypes/06-mission-control/index.html` (copy it to `design/rounds/02-board-filters/<variant>/`), with the busy scenario's data, both themes, 1440 and the phone, and a short page `design/rounds/02-board-filters/index.html` that shows the variants side by side with one paragraph each: what it does, what it costs in clutter, what it cannot do. Run an independent critic over the variants as the design process describes, and put its verdict on the page. Then stop and ask Sebastian to pick. Say so at the top of your message.

## After the pick

Record the pick as C13 in design-decisions.md with his reasons, add the roadmap item, and build it in one pull request per item with the lab's before and after shots in the description, `go test ./internal/console/` green, the structural check green with the new controls' words added to `check.js`, every text pair at 4.5:1 measured in both themes, no inline style (the page's policy drops them), tests hand-derived, the plan's ledger kept. Land by the push after the green test job; close the pull request with the commit. Record every ruling you take in the plan. Stop only when a decision is Sebastian's.

## Constraints that bit last time

- A squash against a moved main carries the inverse of main's new commits. Rebase onto `origin/main` with `git rebase`, never `git reset --soft origin/main` after a fetch.
- The factory's rolls merge main a few times an hour; main moves under you. Check `git merge-base --is-ancestor origin/main <branch>` before every push to main, and rebase when it fails.
- The live console serves the last roll, not main's head. A change you landed shows on the live board after the next roll.
- A `form` closes a `p`: the rows that hold forms are `div`s.
- The structural check reads `innerText` plus `aria-label`, `title` and `placeholder` values; what a disclosure hides counts only once the check opens it (it opens the Deny and "Or in your words" buttons).
