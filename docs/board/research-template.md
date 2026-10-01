# Board research: the per-solution report format

Every report in `reports/` follows this template exactly, so the final aggregate
report can compare like with like. Fill every section; write "not applicable"
with one line of reason rather than dropping a section. A report is about
10 to 15 screens of text plus screenshots.

File name: `reports/<name>.md` with screenshots in `reports/shots/<name>/`.
Mark the report's header line with how it was studied: `studied live`,
`studied from a clone at <commit>`, or `assessed from documentation only
(<why>)`. A report that never looked at the real thing is not accepted.

---

## Header

- Product and URL / repository
- License, price model, and whether a self-hosted or free tier exists
- Alive? Last release or commit date, and visible momentum
- Studied how (live / clone / docs only), on what date
- One sentence: what this product is, and who it is for

## 1. The board model

- Columns: fixed or user-made? What are they by default, and what do they
  mean in this product's own words?
- Card anatomy: what is on the card face, in what order, at what density?
  What hides behind a click, and what never appears on the board at all?
  One annotated screenshot of a representative card.
- Where do the human's decisions live: an inbox, approval cards on the
  board, notifications, a separate page? How many clicks from the board to
  an approve/deny?
- Filters, swimlanes, cross-project views: what exists, what is default?

## 2. Agent-task specifics (skip for pure-kanban products; say so)

- How is an agent's task shown while it runs: live status, spinner, logs,
  progress percentage, elapsed time, cost? What changes on the card when
  the agent finishes, fails, or asks a question?
- Where does the agent conversation live: on the card, behind a click, or
  on a separate page? How much of it is shown by default?
- Can the human steer mid-run (message, stop, redirect)? From where?
- How are approvals, spend limits, or budgets surfaced?
- Multi-agent or parallel-task handling: what does the board show when
  several agents run at once?

## 3. Interaction model

- Moving work: drag and drop, buttons, or both? What happens on a drop?
- Keyboard and mobile support, if any.
- Refresh model: polling, live push, or manual? Does anything on the card
  animate or change without a reload?
- The click map: for each of read status, read detail, decide, steer,
  comment — how many clicks from the board?

## 4. Visual system

- Themes: dark mode, light mode, default, and how colors are used:
  system-set semantics (status) versus user-set (labels, colors).
- Typography and density: how many cards fit a screen; is a card readable
  as a thumbnail?
- The status vocabulary: list every state a card can be in and how each is
  distinguished (color, icon, position, text).

## 5. What users say

- The three most common complaints and the three most praised details
  (issues, discussions, reviews, HN, Reddit; cite links).

## 6. Verdict for us

- **Steal**: concrete patterns to copy, each with the one-line version for
  our board.
- **Skip**: patterns that exist here and that we should refuse, with the
  reason.
- **Decision needed**: anything the aggregate report must settle because
  products in the field do it in mutually exclusive ways.
- Cloneability: can we run it locally, and how hard?

## Scoring axes (fill the table, 1 to 5, one line of reason each)

| Axis | Score | Reason |
|---|---|---|
| Card scannability (read ten cards in one glance) | | |
| State clarity (what is happening, how far, what next) | | |
| Human-decision surface (find and make the next decision) | | |
| Agent-activity legibility (is the agent working, waiting, stuck) | | |
| Noise level (5 means quiet: nothing without meaning) | | |
