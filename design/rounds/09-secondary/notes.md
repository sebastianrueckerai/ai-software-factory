# Round 09 notes: the secondary tabs and pages

## Scope ruling (task 1, the information hierarchy)

Six decisions, formed before any image:

1. **Board goes.** The bar's "Factory console" home link already opens the
   board; a second word for the same page is noise.
2. **New task stays** as the bar's one bordered action (the phone's "+"),
   because the chat is the expected path but a one-click exit to the form
   earns its place.
3. **Projects becomes Settings**, one page per open project, driven by the
   bar's project select (`?project=`). The envelope moves to Resources
   (where the money it bounds is spent), the new-project form stays at
   `/settings/new`, "New project" is a quiet link at the page's foot.
4. **Alerts goes.** Verdict buttons live on the board's escalation card;
   POST `/alerts/{id}/verdict` and the chat's "alerts" tool stay. The
   supervisor's action and diagnosis moved into the tool read
   (`alertSupervisor`), so nothing is lost with the page.
5. **Costs, Resources, Policy stay**, redesigned under one system.
6. **The bar's groups**: the figures (Costs · Resources) and how the
   factory runs (Settings · Policy · Notifications).

## The round (task 2)

- Breadth: 8 directions (readout, ledger, sheet, figures, rail, cards,
  terminal, fold) × dark+light, from `prompts/gen16.sh`; content deck
  `content.md` fixes the exact Resources page every image shows.
- Critics (both contact sheets): gemini — best Ledger, Fold; worst Sheet,
  Figures. glm — best Readout, Ledger; worst Cards, Figures. Both flag
  invented content on figures (hero numbers), cards (search), terminal
  (badges), rail (a nav rail). Fold dropped by the director: it hides live
  rows behind a click.
- Pixel pass (analyze_image on the four finalists): all content-clean, no
  garbles in dark; the defects were minor typography (rule weights,
  separator spacing, standing-row units, divider crowding).
- Fix loop (`prompts/genfix.sh`): readout + ledger revised in both themes;
  both fix lists landed (analyze_image check on the revised darks).
- Compare pass (gemini, `critique/gemini-fix.md`): **readout** becomes the
  system — its grammar (a small-caps section label, a figures line, then
  rows) is the notification page's, and Settings' key: value rows and
  Policy's small tables live in it naturally. Ledger's asset (strict
  lateral alignment) already exists inside readout's tables.

**Pick: READOUT.** Provisional C24.

## The build (task 3), and its overrules of the deck

- Every project keeps its envelope figures line even without a file (the
  deck's "gone" showed only a dim line): a file-less repo still has the
  policy's default envelope, and losing it from the page lost real
  information. The dim no-file sentence stays.
- The jobs table keeps seven honest columns (Last run · Last ok ·
  Suspended); the deck's compressed "State: ok" would have invented a
  health verdict the data does not carry.
- The standing server's row keeps per-hour and accrued figures (the deck
  showed the monthly rate in the cost cell); the standing money lives in
  the figures line, no invented numbers in the row.
- Tables drop visible captions for `aria-label` (the small-caps h3 already
  labels the section); Costs keeps its captions — they carry the date
  window, which is data.
- State cells and the policy's Enabled cells carry the C19 lamp square
  (cyan lit for live/enabled, unlit otherwise).
- Figures columns (EUR/h, cost, by-day, by-task EUR) right-align (`num`).
- Policy: h2 "Policy", the version as one figures line, policy.yaml
  collapsed under `.compacted`.
- Settings: restyle only — the facts list becomes hairline rows
  (`ul.rows`), the gateway YAML collapses.

## Costs

Breadth 16 images ≈ $2.43, montages 2 × $0.00, critiques gemini+glm $0.06,
gemini-fix $0.03, fix images 4 ≈ $0.61. Round total ≈ $3.13 of the $8 cap.
Running total ≈ $30.57 of $100.

## The build, judged

Both critics judged the built pages (dark and light, desk width) against
the round's grammar: [gemini dark](critique/gemini-built-dark.md),
[gemini light](critique/gemini-built-light.md),
[glm dark](critique/glm-built-dark.md),
[glm light](critique/glm-built-light.md). Costs and Policy: CLEAN from
glm in both themes. The rest of their items, weighed against the page
and the pixels:

- The standing row's stronger top rule — flagged by everyone, four
  times. Pixel truth: the rule was there (a `--line-strong` 1 px edge,
  the same token the header rules use), but that weight is exactly a
  header rule's, so it read as nothing special. Two steps followed:
  2 px, then matching the reference candidate's measured weight
  (`--btn-line`, the button-border token — in the mockup the standing
  rule is (65,79,93)/(45,58,72), not `--line-strong`). Final:
  `tr.standing > td { border-top: 2px solid var(--btn-line) }`,
  pixel-verified in both themes in the shipped shots and confirmed by
  computed style. Neither critic's pipeline resolves a 1-vs-2 px line
  in a 1440 px screenshot (both also "confirmed" alignment details the
  CSS contradicts, e.g. top-aligned cells read as centered), so their
  FIX NOT VISIBLE stands recorded as a resolution limit, not a
  verdict: [gemini](critique/gemini-built-fix2.md), [glm](critique/glm-built-fix.md).
  The same token draws the buttons, which both critics read fine at the
  same scale; a human at 100 % zoom sees it.
- Costs' "missing small-caps labels" — the captions are the labels
  there, and carry the date window; a C24 ruling, not a defect. The
  light-theme "tinted standing row" gemini reported does not exist:
  the page ground is one uniform color edge to edge (measured).
- Settings' "missing figures line" — settings has no figures; its
  identity line (project, file state) opens the page, and the sibling
  notifications page (the other round's, out of scope here) opens the
  same way. The grammar's figures line lives where figures exist.
- Resources' "prose paragraphs" — the per-project figures lines, misread
  at the critics' resolution; both also invented content not on the
  page (an "SF/INFRA" prose block, a "How the factory works"
  paragraph). The jobs ages stay left-aligned: they are prose ("17 h
  ago"), like every other age in the console, not money.
- The reference candidate also sat its released row on a quiet fill;
  the build omits it — C24's grammar puts rows on the page ground with
  no fills, and a released row already carries its unlit lamp and the
  "released by" line. If Sebastian wants the released dim too, it is a
  one-line `td` background on that row class.

Build evidence: [resources, dark](build/resources-dark.png),
[resources, light](build/resources-light.png),
[costs, dark](build/costs-dark.png). The lab: 241 shots, structural
check green at this point (before the rebase below); `go test -race
./...` 21 ok, no failures.

## The rebase onto the landed bar

origin/main moved twice mid-round: the round-08 session's C23 bar landed
(5b9ac7d) with factory rolls behind it, then more rolls (8567205). The
build rebased onto the landed bar: the C23 CSS and its classes stand as
round 08 shipped them, and the round's commit now only swaps the words —
six destinations (New task, Costs, Resources, Settings, Policy,
Notifications), no Board, Projects or Alerts — and points `cur` at
them. The bar's project select stays the board's alone (`switch` as
landed); the settings page carries its own project select on its
heading line (`.pagehead`). `pageOf` names the settings pages; the
status panel passes `board`, so no word marks current there.

Verified after the rebase: build ok, `go test -race ./...` exit 0, 21
ok; the lab's 241 shots with every page check green. Three lab checks
fail — the split tab title and two phone 44px target checks — and fail
byte-identically on pure origin/main (8567205, lab run in a clean
worktree): the notifications session's in-flight expectations, landed
ahead of their chat.js and CSS. chat.js is byte-identical between this
branch and origin/main; recorded, not fixed, as their tab's ground.

## Costs, final

Breadth 16 ≈ $2.43, montages $0.00, first critiques $0.06, fix images
$0.61, gemini-fix $0.03; build judging gemini+glm dark+light $0.12,
fix checks gemini+glm $0.06. Round total ≈ $3.31 of the $8 cap.
Running total ≈ $30.75 of $100.

## The live gap (2026-10-18)

Sebastian pasted the live console against the reference: not the same.
Four real gaps, all build-side, closed as 2f39c6cf in the code
repository (on 59d317af):

1. Closed rows carried no quiet ground. The build had generalised the
   standing rule's no-tint to every row; the reference sits the
   released row on a raised fill. `tr.closed` (state outside open)
   now dims; the standing top rule stands.
2. A project with no rows dangled after its figures. It now says
   "none open or closed in the last 7 days".
3. Lease ends printed full UTC stamps that wrapped to two lines, plus
   a "released by" second line. The cell now words short ("in 2 h",
   "2 d ago") via the new `until` helper; the stamp and the releaser
   ride the cell's title, as the jobs table words its ages.
4. Money spelled "EUR". The reference and the board face's own eur2
   use €; the secondary pages now carry € too.

Evidence, magnified same-region crops (dark, 1440, busy scene):
[ev/fix2-table-before.png](ev/fix2-table-before.png) against
[ev/fix2-table-after.png](ev/fix2-table-after.png),
[ev/fix2-sections-before.png](ev/fix2-sections-before.png) against
[ev/fix2-sections-after.png](ev/fix2-sections-after.png). A pixel scan
of the full page: the raised ground appears on exactly one 48-px band
(the released row, y 563 to 610) and on nothing before the fix. Race
suite exit 0.

Kept on purpose against the mock: the bar is C23's landed bar (the
mock's interim bar carried the project select, which is the board's),
and the page head keeps the console's 15-px h2 with its meta
paragraph (the mock's 36-px title was generator flourish the grammar
never specified).

Lab catch-up in the same push (c093cb8c): main's C20 roll made the
status panel static, and the lab's chevron click hung the shoot on
pure main; the lab now reads the panel where it sits.

C25 later corrected C20's record: the panel folds again, closed behind
the strip's click, built in the code repository as pull 1085. The lab
checks above ride that fold.
