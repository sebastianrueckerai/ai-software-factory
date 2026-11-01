# Round 15 — the chain's steps on the card

Roadmap 325's open piece, filed by Sebastian's question of 2026-10-31: a merged
card reads "chain running" on its face while the gates table ends at "merge".
The wait between merge and live is the only part of a card's life the drawer
does not show. This round designs it. "Build that now" — Sebastian, 2026-10-31.

## What the chain is, in facts

A merged card waits until the repository's CI chain runs its change live. The
facts the factory records (table `chain_runs`, roadmap 297):

- The card's **carry run**: the main push run that carries the card's merge
  commit, its number, its link on Forgejo, its verdict and the time it was
  first seen. A newer run that carries the same change takes the row over.
- The **verdict of a commit** is the AND of every run on the commit and every
  required context of the project's file (the code project requires
  `factory/roll`): pending, success, failure, stalled.
- The **head** of the repository: the newest run's commit and its verdict,
  what every uncovered card of the repository waits behind.
- The **roll**: when a roll request carries the card's pull request, the card
  reads "blocked by roll #n" and the roll task is a card itself, with its
  state (opened, merged, skipped).
- The **stall ladder**: a head pending past the project's stall bound (24 h
  for the code project) is re-run once, then a stall card asks a person; a
  member can dismiss a stall.
- The **cover**: the green run at or after the card's carry that deploys it;
  the card ends done through it ("live through run 3248").

The five stage words on the face (roadmap 297): `chain running`, `chain red`,
`stalled`, `waiting for the chain`, `blocked by roll #n`. The last fact of a
merged card's life, the wait's length, runs about 25 minutes on the code
project, one main run per merge.

## What the round designs

1. The gates table's tail on the drawer's Activity tab (and the Timeline
   page, the same template): does the wait appear as a gate row, a run row,
   or a block of its own?
2. The drawer's Status line and the Overview: what a merged card says about
   its chain, and what the exceptional states (chain red, stalled) open.
3. The face's stage word: does it stay a word, or carry the run and its link?
4. The done card: does the chain leave a trace after it (the cover run), or
   does done close the story?

## What is fixed

- The stylesheet as it stands (round 11's ruling): tokens, hairlines, small
  capitals, monospaced figures, one cyan accent, amber for needs-you. No new
  colour, fill, radius or type scale.
- The landed decisions: C8 and C11's face rules (one time on a card, its
  stage age), C10's Time section, C24's readout grammar, C25's strip, the
  gates table's own columns (gate, attempt, start, duration, outcome, meter).
- The gates table stays the task's own gates; the chain is not a gate of the
  task's workflow. A candidate that puts the chain in the table says why it
  reads there anyway.
- The contrast floor (4.5:1 text, 3:1 fills), 44 px phone targets, both
  themes, 1440 and 390, no new dependencies.

## References, from other products

A survey from knowledge, not a live check (the pattern space is small and
old; a live pass would buy little):

- GitHub's PR checks list: one row per check, a state icon each, the list
  folded under a summary line. The commit's combined state as a dot.
- GitHub's Actions run page: a job tree with per-step durations.
- GitLab's pipeline graph and Buildkite's pipeline rows: stages as nodes or
  rows, duration bars, the pipeline's own state.
- Argo CD and Flux: conditions as key:value rows (sync status, health, last
  applied revision), one word each, the drift named.
- The common thread: the wait is shown as the set of things that must go
  green, each with its state and its clock, not as a percentage or a spinner.

## The questions the candidates answer

- Does the chain belong in the gates table (one more row with its run under
  it, as the checks gate carries its jobs), in a readout block of its own on
  Activity, or in Overview as a section beside Time?
- Does the face's stage word gain the run and its link, or does the face stay
  a word and the drawer carry everything?
- What does the done card say: "live through run n" on the face or in the
  drawer, or nothing?

## Method

Round 11's: candidates as HTML pages in the real stylesheet over the real
rendered markup, shot with the shared harness at 1440 and 390 in both themes,
judged as screenshots by both critics. No image generation; the model that
writes the candidates is not their only judge.

## Limits

Six candidates, two critics, one fix loop, one compare loop. Spending cap $1
(critics only). One session. The pick becomes a C-entry; `ia.md` and
`inventory.md` gain the chain's rows; the build lands in the code repository
with the lab's check extended to the chain.
