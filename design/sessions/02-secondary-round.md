# Session 02: the secondary pages

Sebastian's instruction of 2026-10-17 (verbatim intent, not wording): the
Notifications tab belongs to another session; this round takes the other tabs
and the pages behind them. Board can go (the home word opens the board), New
task probably goes (the chat is the way to file work, but he is unsure — the
director answers), Projects can go (the project select switches), Alerts can
probably go (the notification channel carries it), Policy, Costs and Resources
stay. What remains is redesigned: first the information hierarchy, then the
pages, under one overarching design so they do not each look different. Several
versions, and at the end the best one fully implemented. He is asleep; the
director picks provisionally; the round runs as many loops as it takes.

## Goal

When the round ends, the console's top bar carries the decided C23 design with
this round's destination set, and every remaining secondary page (Settings,
Resources, Costs, Policy) is redesigned and built in the code repository on
`main`, shot by the lab in both themes, and passed by both critics. The Alerts
and Projects pages are gone, their content either reachable where it already
lives (the board, the card drawer) or moved into the remaining pages.

## The decisions this round owns (the director's, provisional)

1. **Board** goes from the bar: the home word is the board.
2. **New task** stays as the bar's one action (the bordered word of C23), not a
   destination: the chat is the intended path, the form is the no-chat path.
3. **Projects** goes as a cross-project page; its per-project content becomes
   **Settings**, the open project's wiring, read-only with its console actions
   (GitHub export, Sync latest, Remove). New project is a quiet link at its
   foot.
4. **Alerts** goes: an alert files a card (roadmap 74), the verdict buttons
   live on the board's escalation card (architecture 5.6), and the push
   channel carries the ping. Nothing unique is lost.
5. **Policy, Costs, Resources** stay, redesigned under one page system.
6. The bar's groups become two: the project's figures (Costs, Resources) and
   how the factory runs (Settings, Policy, Notifications).

## Limits that keep the run from drifting

- 8 directions as images (one representative page, both themes = 16 images),
  nano-banana-2.1 at a tracked $0.15 per image (round 08's actual rate).
- 2 carried into one fix loop (4 images), one compare pass (both critics).
- The pick is built in the code worktree `asf-code-round09` on branch
  `round09-secondary`; the lab's structural check must be green before the
  round builds on it and green after. At most 2 fix loops on the built pages.
- Generation cap **$8** (estimates at $0.15/image tracked as actuals). Stop
  generation at the cap and finish with built candidates, which cost tokens.
- Two critics per pass: gemini and glm. Every legibility or layout claim is
  checked against the pixels by the director. This session's director cannot
  read pixels directly (image reads return URLs); the pixel pass runs through
  a vision model with a checklist prompt, and notes.md records that.
- Stop time: when the build is green, shot, critiqued, fixed and pushed — or
  when a step genuinely needs Sebastian. Nothing else stops it.
- Worktrees hold the work; on completion both branches fast-forward
  `master`/`main` and push, the worktrees are deleted.

## Stages

1. Concept (this file's decisions + `rounds/09-secondary/brief.md`).
2. Baseline: the lab's fresh shots of today's five pages, both themes.
3. Breadth: 8 directions as images, contact sheets, two critics.
4. Fix loop on the carried two, compare pass, director's provisional pick.
5. Build: all pages + the C23 bar with the new destinations, in the code
   worktree. The lab shoots the built pages; both critics judge them against
   the brief; at most 2 fix loops.
6. The round page `rounds/09-secondary/index.html`, `notes.md`, the C-entry
   (provisional), `ia.md` and `inventory.md` updated. Push.

## Final state (2026-10-18 ~01:25)

Stage 5 done: build judged by both critics, one real fault found (standing
rule at header weight) and fixed to the reference's measured weight
(`2px var(--btn-line)`), pixel-verified both themes; every other critic item
traced to a ruling, a misread, or the out-of-scope notifications page. Lab
241 shots + structural check green; `go test -race ./...` 21 ok. Round total
≈ $3.31 of $8; ≈ $30.75 of $100. Remaining: commit+push both worktrees, ff,
delete worktrees, report.

## The rebase (2026-10-18 ~01:45)

origin/main advanced twice mid-round (the landed C23 bar 9564f0d, then
factory rolls to f9343d3). The commit rebased onto the landed bar: the C23
CSS and classes stand as round 08 shipped them, the commit swaps in the six
words and points `cur` at them; the settings page gets its own project
select (`.pagehead`) since the bar's select is the board's alone again.
Post-rebase: race exit 0, 21 ok; lab 241 shots, page checks green. Three
lab checks fail byte-identically on pure origin/main (verified in a clean
worktree): the notifications session's in-flight expectations — not this
round's regression, not this round's ground.
