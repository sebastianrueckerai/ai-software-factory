# The script: one card's life, told once

Written 21 October 2026 by the method of [concept section 8](concept.md#8-the-script-one-cards-life-told-once). Three parts: the story graph with its nodes named, the beats with their entry and exit nodes, and the spine with timings and transitions. The fold pass between them says how the beats became the spine.

Decisions this script rests on, answered by Sebastian on 21 October: a generated voice over the titles (decision 1), so the film works muted and the sound track swaps without a recut; the three layers as the tail's three cards in his framing (decision 3); his hero line (decision 4): "See everything on the kanban. Feed it a roadmap. Change anything from the chat."

The film's card is the calendar. Sebastian asks for a calendar rewrite in the chat, the factory files #105, the planner splits it into four cards, and the week view, #110, is the child the film follows through its build. The branches off its running session, the stall and the cap, are states the story already gives this card: #110 is the card that stopped at its budget. The signals of the second half are the two cards nobody typed, #119 from an alert and #126 from an issue.

The bank's scenes are the references for every beat: the step span named is where the state is on screen today. The film's footage is recorded after Sebastian approves the spine: one continuous scene on #110 for the chain, one short scene per branch seeded at its fork node, and the cuts from the procedural and generated routes. The story's own data (`demo/lib/story.js`) is unchanged by the script; the spine scene seeds its own life for #110, as scene 07 does for #116.

## 1. The story graph

Nodes are states of the world: the board, one card, the drawer and the chat at one moment. The ids are the names the beats and the spine use.

| Node | The state of the world | Where the bank has it |
|---|---|---|
| `idle` | Wednesday morning of week 1. Four done cards in Done, nothing running, Needs you calm, the chat on a new thread, €3.32 of the €60 month cap | Scene 03 step 1 |
| `asked` | "Rewrite the calendar." in the chat. The agent's answer ("That is several cards: the week, the month, moving a class and the model under them") and the proposal panel: I will file a card, lane plan, size large. Do it waits | Scene 03 step 2 |
| `landed` | Do it pressed. The applied line "Filed nord/booking#105 in lane plan". #105 in Queued | Scene 03 step 3 |
| `planned` | The planner ran on the big model. Needs you holds "Plan #105, revision 1" with its one question and Accept plan. The drawer's plan section lists the four cards in filing order: events-model (foundation), week-view, month-view (features), drag-move (integration), each with its size and what it depends on | Scene 03 steps 5 and 6 |
| `accepted` | Accept pressed. The four children in Queued in dependency order, the events model running first, the week view waiting on it | Not recorded. A new state of the spine scene |
| `running` | The fork node. #110 the week view running on the small model: the drawer open on Session, the agent's words arriving; the facts row with its spend | Scene 06 step 2 for the shape |
| `pr` | The session pushed. The header shows PR #208, the gates table reads intake, session pushed, checks success, and the four jobs under it | Scene 06 step 4 |
| `rejected` | The review gate's row reads concerns. The finding is on its way back to the agent; a second session is open | Scene 07 step 2 |
| `steered` | A line typed in the chat for the running card, the steer proposed, Do it pressed. The session transcript shows the line arrive as "you" and the agent's next turn take it | Scene 11 steps 2 to 4 |
| `green` | The second session pushed. Checks success, review approve, the card in the merge queue. Every row of the gates table green | Scene 07 step 4 |
| `stalled` | Branch. The Activity tab's supervisor row: the flip-flop detector tripped, decision redirect, the reason. Under it the second session's start row on the big model | Scene 08 step 2, scene 10 step 3 |
| `capped` | Branch. The costs page's task rows with #110 the costliest. The inbox's budget question: €0.40 of €5.00 left, fund one more session or end | Scene 28 step 3, scene 20 step 1 |
| `merged` | The Activity tab: merged by factory-merge at the gated head, the chain pending | Scene 12 step 3 |
| `live` | The final row "live: covered by run 57", the card in Done, the metrics page's deploys per week one higher | Scene 12 steps 6 and 8 |
| `signal` | The board minutes later, two new cards in Queued that nobody typed: #119 from the alert with the stack trace in its objective, #126 from an issue with a repro block in its objective, filed by a developer, not by Sebastian | Scene 13 step 3, scene 33 steps 2 and 3 |
| `reproduced` | #126's Activity tab: the reproduction gate's row passed, its step detail with base_exit 1 and exit 0, then merged and live | Scene 33 steps 5 and 6 |
| `day` | A state of the world, not of the card. The chat's level control open, full auto picked. On the phone, three asks in Needs you answered one after the other | Scene 25 step 2, scene 24 steps 2 to 4 |
| `numbers` | The metrics page, week 2 against week 1: deploys, lead time, cost per card | Scene 27 steps 4 to 6 |

Edges are events. Each is the action of exactly one beat.

| From | To | Event |
|---|---|---|
| `idle` | `asked` | A sentence typed |
| `asked` | `landed` | Do it |
| `landed` | `planned` | The planner's verdict: too large, four cards |
| `planned` | `accepted` | Accept plan |
| `accepted` | `running` | The foundation card done, the week view takes its slot. Shown as a cut through the sandbox interlude, not as footage |
| `running` | `pr` | A push, the checks |
| `pr` | `rejected` | The review verdict: concerns |
| `rejected` | `steered` | A line typed, Do it |
| `steered` | `green` | The second session's push, checks, the review verdict: approve |
| `running` | `stalled` | The same failing test three times, the detector trips, the supervisor redirects |
| `running` | `capped` | The budget reached, the factory asks |
| `green` | `merged` | The merge queue's turn, factory-merge |
| `merged` | `live` | A green run covers the merge |
| `live` | `signal` | An alert fires, an issue is filed |
| `signal` | `reproduced` | The fix's session, the reproduction gate, the merge |

Three nodes are not on the card's life and are reached by cuts: `day`, `numbers`, and the interlude states of the sandbox and the three layers, which are not console states at all.

## 2. The beats

Every point of [tier 1](concept.md#2-tier-1-the-value) as a beat. Seconds are the beat's length in the film; a rewind takes a quarter second off the beat it enters. The words on screen are the titles (decision 1). The source names the bank's scene and step span; the sidecars' `steps[].atMs` give the span's start in the video.

| Id | Points | Entry | Action | Exit | s | On screen | Words on screen | Source |
|---|---|---|---|---|---|---|---|---|
| B0 | title | cut | | cut | 4 | The five planes ring on the dark field, the hero line over it | See everything on the kanban. Feed it a roadmap. Change anything from the chat | Procedural loop (round 4), else generated clip 33 |
| B1 | 1, 2 | `idle` | "Rewrite the calendar." typed, Enter, the proposal, Do it | `landed` | 8 | The console at rest, the sentence, the agent's answer and its proposal panel, Do it pressed, the applied line, #105 in Queued | Say it, or hand it the roadmap. The factory writes the cards. You press Do it | Scene 03 steps 1 to 3 (0.0 to 9.8 s) |
| B2 | 3 | `landed` | The planner's verdict, the plan's cards, Accept | `accepted` | 6 | #105 running on big, then the plan in Needs you with its question, the drawer's four cards in dependency order with their roles and sizes, Accept plan, the four children in Queued | Too large. It plans before it builds. Some tests stay hidden until the end | Scene 03 steps 4 to 6 (9.8 to 24.9 s); the exit state is new |
| B3 | 10 | cut | The sandbox's life | cut | 5 | A cell appears, a token and a key slide in, work glows, everything dissolves | Each card runs in its own throwaway sandbox. The agent never holds a push token | Generated clip 34, else scene 32 steps 1 to 4 |
| B4 | 2, 4 | `running` | The session pushes, the checks run | `pr` | 5 | The drawer on #110: the agent's words on Session, then the header's PR #208 and the gates table with checks success and its four jobs | Agents build. A pull request, checks, then the review | Scene 06 steps 2 and 4 (2.8 to 8.9 s, 13.8 to 19.1 s) |
| B5 | 4 | `pr` | The review verdict | `rejected` | 4 | The gates table: review 1, 6 min, concerns. Session 2 open under it | Nothing merges unproven. The review rejects, with a reason | Scene 07 step 2 (4.7 to 11.0 s) |
| B6 | 1 | `rejected` | A line typed for the card, Do it | `steered` | 4 | The chat: the line, the steer proposal, Do it; the session transcript's "you" row and the agent's "Taking your message" turn | The same chat talks to a running agent | Scene 11 steps 2 to 4 (3.9 to 22.7 s, cut to the press and the quote) |
| B7 | 4 | `steered` | The second push, checks, the review | `green` | 3 | The gates table all green: session 2 pushed, checks success, review approve, merge-queue | Green | Scene 07 step 4 (16.8 to 23.9 s) |
| B8 | 7 | `running` | The detector trips, the supervisor redirects | `stalled` | 5 | The supervisor row: flip_flop, redirect, the reason; then the second session's start row on big | It does not stall. A detector, a supervisor, then the stronger model. No human yet | Scene 08 step 2 (6.6 to 14.4 s), scene 10 step 3 (8.3 to 14.6 s) |
| B9 | 8 | `running` | The budget reached, the factory asks | `capped` | 5 | The costs page's task rows, #110 the costliest; the inbox's budget question with Fund and End | No model call runs without its cost covered. At the cap: fund or end | Scene 28 step 3 (6.1 to 9.6 s), scene 20 step 1 (0.0 to 4.2 s) |
| B10 | 2 | `green` | The merge, the green run | `live` | 5 | The merged row, the final row "live: covered by run 57", Done, deploys per week one higher | Say it, it ships. Merged, deployed, live. No human in between | Scene 12 steps 3, 6 and 8 (7.0 to 12.2, 20.5 to 25.9, 30.0 to 33.8 s) |
| B11 | 5, 6 | `live` | An alert fires, an issue lands | `signal` | 4 | The board: #119 and #126 in Queued, nobody typed them. #119's objective with the stack trace, #126's with the repro block | Live software talks back. An alert files a card. An issue files a card | Scene 13 step 3 (17.0 to 23.5 s), scene 33 steps 2 and 3 |
| B12 | 5 | `signal` | The fix's session, the reproduction gate, the merge | `reproduced` | 6 | #126's gates table: reproduction passed; the step's detail: base_exit 1, exit 0; then merged and live | Red at the base commit. Green at the fix. Merged | Scene 33 steps 5 and 6 |
| B13 | 9 | cut | The dial, three answers | `day` | 6 | The level menu, full auto picked; the phone with three asks in Needs you, each answered with one press | You hold the roadmap and the money. Full auto asks only for decisions and euros | Scene 25 step 2 (4.2 to 8.7 s), scene 24 steps 2 to 4 (4.2 to 23.3 s, cut to the three presses) |
| B14 | 11 | cut | The three bands, the file, the swap | cut | 6 | Three bands: the factory, your process, your prompts. The process file's stage list slides in beside the middle band. The harness box in the bottom band swaps | Our dev process is spec-driven. The process is a YAML file: bring your own | A new procedural diagram (round 4, after the loop) |
| B15 | 12 | cut | | `numbers` | 4 | The metrics page: deploys, lead time, cost per card, week 2 beside week 1 | The week before, the week after | Scene 27 steps 4 to 6 (15.3 to 22.2 s) |
| B16 | tail | cut | | cut | 7 | Three title cards, one after the other | The factory: sandboxes, workflows, gates. Works out of the box, on rented servers. Your process: a YAML file. Ours is spec-driven, bring your own. Your prompts and harness: plug in yours | Procedural titles (round 4) |
| B17 | link | cut | | cut | 3 | The repository and the page over the title loop | github.com/sebastianrueckerai/ai-software-factory | Generated clip 36 |

Two notes on what the console shows, so no title claims more than the frame:

- B2's bang in the concept names the criteria list with an id, a kind and a named test per line. The drawer's plan section shows the cards with their roles, sizes and dependencies, and the objective shows the acceptance as prose lines. The console has no criteria table. The title says "it plans before it builds"; the gate chain diagram (scene 30) is the source if the cut wants the criteria's kinds on screen.
- B12's bang in the concept is two terminals. The console shows the reproduction gate as a row of the gates table (passed) and a step row whose detail carries `"base_exit":1` and `"exit":0`. The cut zooms the step row; the two terminals are a procedural overlay if the row alone reads too small.

## 3. The fold pass

1. Sorted along the card's life: B1, B2, B4, B5, B6, B7, B8, B9, B10, B11, B12. Then the states of the world: B13, B15. Then the interludes and the tail: B0, B3, B14, B16, B17.
2. Chained, each entry node the previous beat's exit node: B1 → B2 (`landed`), B4 → B5 (`pr`), B5 → B6 (`rejected`), B6 → B7 (`steered`), B10 → B11 (`live`), B11 → B12 (`signal`). B2 → B4 is not a chain: B2 exits at `accepted` and B4 enters at `running`. The sandbox interlude B3 sits in the gap, and the week view's slot is taken by the time the interlude ends. One cut, no rewind.
3. Left over: B8 and B9 both enter at `running`, which the chain passed at B4. Each forks there with a rewind. B10 enters at `green`, which the chain reached at B7 and left for the branches: a rewind back to `green`, then continue. Three rewinds in all, none of them new footage.
4. Cuts, not branches: B0, B3, B13, B14, B15, B16, B17. They are not console states of the card.
5. Count. Card creations by a person on screen: one, B1's Do it. The planner's four children (B2) and the two signal cards (B11) are filings by the factory, each the point of its beat. The steer's Do it (B6) files no card. Every other beat is cut to its bang: B4 shows the session's words and the green checks, not the walk between them; B10 shows the merged row and the final row, not the queue; B13 shows the pick and the three presses.

The folds the concept foresaw hold. Points 1 and 2 are one shot (B1). The steer and the rejection share the drawer (B5, B6). The issue and the alert file their cards in one board shot (B11) and only the issue runs to its end (B12). The stall and the cap are two branches off `running` (B8, B9). The dial and the asks are the one-day shot (B13).

## 4. The spine

| From s | To s | Beat | Transition in | On screen | Words on screen | Source |
|---|---|---|---|---|---|---|
| 0 | 4 | B0 | cut | The loop under the hero line | See everything on the kanban. Feed it a roadmap. Change anything from the chat | Procedural loop, else clip 33 |
| 4 | 12 | B1 | cut | The console at rest. "Rewrite the calendar." The proposal. Do it. #105 lands | Say it, or hand it the roadmap. The factory writes the cards. You press Do it | Scene 03 steps 1 to 3 |
| 12 | 18 | B2 | continue | Too large: the plan's four cards in order, Accept, the children in Queued | Too large. It plans before it builds. Some tests stay hidden until the end | Scene 03 steps 4 to 6, a new exit state |
| 18 | 23 | B3 | cut, interlude | The cell, the token, the key, the work, the dissolve | Each card runs in its own throwaway sandbox. The agent never holds a push token | Clip 34, else scene 32 |
| 23 | 28 | B4 | cut to `running` | The drawer on the week view: the agent's words, PR #208, checks green | Agents build. A pull request, checks, then the review | Scene 06 steps 2 and 4 |
| 28 | 32 | B5 | continue | The review's row: concerns | Nothing merges unproven. The review rejects, with a reason | Scene 07 step 2 |
| 32 | 36 | B6 | continue | A line typed, Do it, the transcript quotes it | The same chat talks to a running agent | Scene 11 steps 2 to 4 |
| 36 | 39 | B7 | continue | The gates table all green | Green | Scene 07 step 4 |
| 39 | 44 | B8 | rewind to `running` | The supervisor's row, the second session on big | It does not stall. A detector, a supervisor, then the stronger model. No human yet | Scenes 08 step 2, 10 step 3 |
| 44 | 49 | B9 | rewind to `running` | The costs page, the budget question: fund or end | No model call runs without its cost covered. At the cap: fund or end | Scenes 28 step 3, 20 step 1 |
| 49 | 54 | B10 | rewind to `green`, continue | Merged, live, Done, the deploy count moves | Say it, it ships. Merged, deployed, live. No human in between | Scene 12 steps 3, 6 and 8 |
| 54 | 58 | B11 | continue | Two cards nobody typed: the alert's stack trace, the issue's repro block | Live software talks back. An alert files a card. An issue files a card | Scene 13 step 3, scene 33 steps 2 and 3 |
| 58 | 64 | B12 | continue | The reproduction gate: base_exit 1, exit 0. Merged | Red at the base commit. Green at the fix. Merged | Scene 33 steps 5 and 6 |
| 64 | 70 | B13 | cut | Full auto picked. Three asks on the phone, three presses | You hold the roadmap and the money. Full auto asks only for decisions and euros | Scenes 25 step 2, 24 steps 2 to 4 |
| 70 | 76 | B14 | cut, interlude | Three bands, the process file slides in, the harness swaps | Our dev process is spec-driven. The process is a YAML file: bring your own | The three layers diagram, procedural |
| 76 | 80 | B15 | cut | Week 2 beside week 1 | The week before, the week after | Scene 27 steps 4 to 6 |
| 80 | 87 | B16 | cut | Three title cards | The factory: sandboxes, workflows, gates. Works out of the box, on rented servers. Your process: a YAML file. Ours is spec-driven, bring your own. Your prompts and harness: plug in yours | Procedural titles |
| 87 | 90 | B17 | cut | The link over the title loop | github.com/sebastianrueckerai/ai-software-factory | Clip 36 |

Ninety seconds. Three rewinds, four interludes or cuts to a state of the world, the rest one card. A rewind plays the entering beat's last second backwards at four times speed, then holds a quarter second on the fork node's frame before the branch starts.

## 5. The 20-second clips

Sub-paths of the spine. Each adds the hero line's first sentence as a two-second title and the link as a two-second tail; no new footage.

| Clip | Beats | s | Point it carries |
|---|---|---|---|
| One board, one chat | B1, B2 | 14 | 1, 2, 3 |
| Build, gate, steer | B4 to B7 | 16 | 2, 4, 1 |
| It does not stall | B4 (3 s of it), B8, B9 | 13 | 7, 8 |
| Live software talks back | B10 to B12 | 15 | 2, 5, 6 |
| One day | B13, B15 | 10 | 9, 12 |
| Three layers | B14, B16 | 13 | 11 |

## 6. What the recording needs

Nothing records before Sebastian approves the spine. Then, in the material phase:

1. The spine scene, one continuous recording on the calendar's cards: `idle` to `accepted` on #105, then `running` to `live` on #110, then `signal` to `reproduced` on #126 with #119 beside it. It seeds its own life for #110 with a merge the story's #110 never had, as scene 07 seeds its own life for #116. New texts to author: the week view's session words, the review's finding on the week view, the steer and the agent's answer to it. The sidecar's `steps[].atMs` give the cut its spans.
2. Two branch scenes seeded at `running`: the stall (the supervisor's trip on the week view, the second session on big) and the cap (the story's own budget question on #110).
3. Scenes 24, 25 and 27 as recorded, for B13 and B15.
4. The procedural loop and the three layers diagram (round 4), the titles of B16, and the generated clips 34 and 36 (round 5).
5. The cut list `launch/cut.json`: one row per spine row, a scene and a step span or a clip, the transition, the title. ffmpeg assembles the film from it, so the film regenerates with the bank.

## 7. For Sebastian

- The hero line carries his essence: all the positives of a kanban, none of the curating, one chat as the only control. "See everything on the kanban. Feed it a roadmap. Change anything from the chat." B0 carries the line alone; the sandboxes have their own beats, B3 and B16's first card. B1 bridges the roadmap beat: say it, or hand it the roadmap, the factory writes the cards, you press Do it. The word is roadmap, never roadmap YAML: the intake is Markdown, the YAML is the process (concept section 5). Concept section 5 holds the alternates; one word swaps one in.
- B2 now names the hidden hold-outs: "Some tests stay hidden until the end." If that sentence must go, the beat keeps "Too large. It plans before it builds."
- B2 and B12 claim less than the concept's bangs, for the reasons under the beats table. Say if the criteria's kinds or the two terminals must be on screen; both are procedural overlays, half a day each.
- The film's card is the calendar. If another card should carry it, every node after `landed` changes, the beats do not.
