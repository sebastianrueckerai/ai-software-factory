# Round 15, the chain's steps on the card: notes

The run of [the brief](brief.md), the condensed form: candidates as HTML pages in the real stylesheet over the real rendered markup, shot with the shared harness, judged as screenshots by two critics. No image generation. Scripts: [build.py](cand/build.py) (the candidates and the shots), [shoot.js](cand/shoot.js) (the harness). The candidates open in a browser: [d1-table](cand/d1-table.html), [d2-block](cand/d2-block.html), [d3-section](cand/d3-section.html), [d4-face](cand/d4-face.html), [d5-open](cand/d5-open.html), [d6-lean](cand/d6-lean.html), each with a light twin and a board variant, and the round page [index.html](index.html) holds the pick request.

## The recommendation

**A, the fusion** ([fusion.html](cand/fusion.html), [tall sheet](cand/fusion-tall-1440.png), [light](cand/fusion-light-1440.png)): d4's face change joined with d2's readout block. The face's stage word becomes the run and its link: `chain run 3251`, `run 3251 red`, `run 3252 stalled`, `waiting for the chain` and `blocked by roll #n` as they stand. The Activity tab carries a Chain readout after the two tables, in the drawer's own section idiom (a collapsed `details.sec`, small-capitals summary, the live fact as its hint): the carry run with its clock, age and verdict, the project's required contexts, the head of main, and the chain's actors — the repair card of a red head as its own row, the stall card appended to the carry row, the ladder's re-run as its own row. Collapsed while the chain is quiet, open when red or stalled. The done face carries the cover clause in its elapsed slot: `live through run 3248, 25 min after merge`.

Both critics asked for one change to the winner, and both asked for the same thing in two shapes: GLM wants the readout dimmed to 60 to 70 percent opacity or shrunk a step, Qwen wants it pinned above the gates table as the triage surface. The ruling refuses both mechanisms and keeps the substance: the block stays after the tables, because the Activity tab reads oldest first and the chain is the newest chapter of the card's story; a pinned block would fight the tab's grammar and shout during the hours-long quiet wait, and dimmed type would sink below the 4.5:1 floor the style pins. Hierarchy is answered with the console's own grammar instead: the section idiom, the hint carrying the live fact, collapsed when quiet.

## The pick: C38

Sebastian picked A on 2026-11-01 with no change named. Recorded as C38 in [design-decisions.md](../../design-decisions.md), built in the code repository the same day. The build differs from the prototype in three words' grounding: the prototype's "re-run run 3252 queued" on a red head is really the repair card the red head files, so the row names the card, not a re-run; the re-run row is the stall ladder's own (the head run re-run at the bound, before any stall card); and ages read in the console's `minutes()` words (`1 d 2 h`, not `26 h`).

## The first loop: the six directions

GLM judged [all six at full size](critique/glm-dark.json); Qwen judged [the sheet plus d2 and d4](critique/qwen-dark.json).

| Direction | What it is | GLM | Qwen |
|---|---|---|---|
| d1-table | chain as tail rows inside the gates table | 5th, drop outright | 4th |
| d2-block | a Chain readout block after the gates table | 2nd, carry | 2nd, carry |
| d3-section | a Chain section on the Overview tab, beside Time | 6th | 3rd |
| d4-face | the stage word becomes the run and its link; drawer unchanged | 1st, carry | 1st, carry |
| d5-open | the exception states in the Overview's Open block | 4th | 6th, drop outright |
| d6-lean | a hybrid: one table row, a Status clause, exceptions in Open, the done trace | 3rd | 5th |

Both put d4 first and d2 second and both would carry exactly those two into refinement, GLM naming the fusion itself ("d4's always-visible status-line hint with d2's expandable detail pane"). The agreement on the drops is sharper than the rankings: GLM drops d1 because tail rows teach that the chain is a gate of the task, the exact misconception the brief warns against; Qwen drops d5 because a normal wait shown in an exception block reads as a failure. d6 lost with both for fragmentation: the story scattered across four places.

## The light check

[GLM on the light twins](critique/glm-light.json): every direction holds its hairlines, small-capitals labels and figures on the light ground. One flag: the `done` word in one states-band cell renders in a grey it read as near the 4.5:1 floor. That cell is the probe's own wording; the built done face carries the cover clause in the elapsed style, whose colour the lab's contrast check already pins.

## The compare loop: A against B

Both critics [judged the fusion against d4's face-only shape](critique/compare-glm.json) ([Qwen](critique/compare-qwen.json)). B is the honest minimal: only the face changes, and every question past "which run" leaves the console for the forge.

| Question | GLM | Qwen |
|---|---|---|
| Where is my merge, how fast | instant in both; A answers the follow-up too | a split-second glance in both |
| What must go green: A's block wanted? | the critical path, not second-screen detail | A superior; B forces a navigation step out |
| The exceptional states tell what to do next | A: "stalled · stall card #209" is resolution, not alarm | A |
| Calm | B calmer; A's second list competes with the gates | both calm; A's block reads a little loose |

Both pick A. GLM: "B's serenity is bought at the price of ignorance; in a factory where merged does not mean shipped, ignorance is latency." Qwen: "The whole value of mission control is visibility into dependencies."

## What the director overruled

- Both critics' one change to the winner (dim it, pin it above the gates). Refused for the reasons above; the section idiom carries the hierarchy instead.
- Qwen, compare loop: in B "the band must do the heavy lifting", in A it "feels redundant". The states band is the round's probe, a sheet of every state at once; the console has no such band. The claim judges the harness, not the design.
- GLM, first loop, on d4: the status line "answers what, state, age" and the exceptions "remain equally prominent". True of the prototype's band, where every state was drawn large; on the real board a red run's repair card and a stalled run's stall card are facts the face cannot carry, which is A's case.
- GLM, light check, the `done` grey. See above: the probe's cell, not the built face.

## Cost and time

Five critic calls at $0.03 each by `tools/img.py`'s estimate: $0.15 of the $1 cap, no image generation. The real figures sit in the Z.ai dashboard. The round took one session across 31 October and 1 November 2026.
