# The film: notes

Started 22 October 2026. The working file for the film and its small clips: what Sebastian asked, the decisions, the state. A fresh session rebuilds from here.

## What Sebastian asked, 22 October

- The film starts on the landing page's hero image, or one like it. If only one freeze frame shows the system, it is that frame. If the reader clicks, the video behind it plays.
- In medias res: the full board first, since readers know a kanban. Effects highlight the points the image makes, and captions and sound explain each quickly.
- Before ingestion, the board drains, so the film gets the board-populating effect.
- Then animations of how it works: accept a pull request by hand, raise the dial from manual to full auto and the next card merges by itself, errors (a card over its budget, a self-heal by an agent, a case that lands with the human after the agent has a good reason), ingestion with plans spawning implementation cards, the metrics page (delivery metrics over time: throughput, escalations, and tuning model choice and prompts against them), and last a zoom into a card with an animated graphic of the isolated pod: the agent never holds a token or a key, every call is metered against a cap.
- One board where possible. A transition animation where the film jumps to another board state. Video overlays to highlight parts of the board.
- More than one version, to show different possibilities for the animated graphics and overlays.
- The cards' subject: something cooler than a calendar app, a computer game or a better idea.

## What Sebastian asked, the night of 22 October, after version 1

- The red ring as the mouse cursor goes: it is ugly.
- Highlights were mistimed: one did not enclose its card, and at one moment three boxes stood around a card at once.
- Captions do not name what the game builds where it does not matter ("we build the asteroid belt" confuses).
- The clock that ran back is bad. Instead the board drains forward: the work resolves and moves to Done. Then intake switches on and new items come in.
- The animation inside the pod is bad: back to the drawing board. The schematic sandbox A looks better: improve it and make one or two other variants.
- Clean up, use the critic, then make the small clips too. He likes the spotlight style.

## What Sebastian asked, 22 October, after version 2 (round 3)

- The sandbox videos are all good. Keep D, the sequence diagram, in reserve: it explains a workflow, who decides what, better than the real UI can. For the sandbox itself A and C work better. All three move a bit too fast at points, and many stacked shapes are stark white like the captions, so the eye does not know where to look.
- Talk to an agent while it works: confusing, it moves fast in a zoomed view. Start on the whole board with the card in question, click the card and show its session. Then the main chat's real strength: a request that names no card ("find out who is implementing X and tell them ..."); the main chat searches, finds the card and passes the message on, live. The old title is not accurate.
- The plan before the code: too fast. The plan is itself a card, and that must come across.
- Where it helps, a short clip opens with the theory as an animated sequence diagram, like sandbox D, then shows the example. Every clip starts on the full board so people can orient. No fast camera moves or cuts. Zooms are gentle; we need not zoom all the way. After a zoom, stay there long enough that the in and out does not make people motion sick.
- The review rejects, an issue files its fix: simple and expected; maybe not shown at all. If anything, show the escalation ladder.
- Many clips end on a black frame: the recording goes dark but the highlight box stays.
- The money is held: highlights work for columns and cards; on buttons they get chaotic. Keep the card or column around the button highlighted and let the pointer and its click show the press.
- One dial: show how the workflow changes, the combined flow asked for at the start (accept by hand, raise the dial, the next card goes through on its own), not just the selection.
- Recovery from stalls: too fast. Stay on the stall longer. Harnesses stall in many ways, so the factory checks many things (no message, no commit, and the rest) again and again and takes ever stronger measures. No agent stays stalled, no task just waits.
- The rough cut: "Do it files the parts" does not say Do it is a button; say it shorter, a click files the parts. The work resolving moves to Done one card at a time. "New work files itself": the note breaks off here; the arrivals now come one at a time, each with its source named.
- Overall: slower, gentle zooms, the full board first, no zoom onto buttons or small elements; inside a highlighted region the click animation shows the press. Use the animated sequence diagram more.

## Decisions

- **Videos with contact sheets.** Motion is what Sebastian judges. Each variant also gets a sheet of stills so he compares at a glance.
- **The demo project becomes a game.** Nebula Run, a co-op browser space shooter with a Go game server, repository `orbit/nebula-run`. Every card keeps its number, size, role and timings; only the fiction changes. The mapping is below.
- **Order of the film.** Hero frame and its three points, the budget stop answered by the split, the board drains, ingestion populates it again, by hand then full auto, a self-heal and an escalation with a reason, the metrics, the zoom into the sandbox, back to the hero frame and the link.
- **Wording kept true.** "The four DevOps delivery metrics", not DORA, unless Sebastian lifts the rule. Tuning names models and prompts, not harnesses: one adapter exists. The agent never holds a push token or a model key: the pod holds a one-hour gateway identity. Every model and tool call is metered and held against a cap: package downloads are not.
- **Tooling.** The console footage comes from the demo bank (`demo/run.sh`). The recorder writes each step's element boxes and the end of each action (`acts`) into the sidecar, so spotlights and zooms follow the UI, land on the clicks and regenerate with the bank. The film is a HyperFrames composition: the bank's videos as clips, GSAP overlays on top. Captions only: the voice track costs money and waits until the lines are approved.
- **Version 2.** The cursor is an arrow with a soft ripple on each click. One highlight at a time, moved by a track of spots timed to the clicks. The waits between clicks play faster (`holdRate`), the actions at their pace. Gentle zooms, never below the console's own size. Scene 34 runs on past the hero still: the split, the drain in five waves, intake (a nightly scan, an alert, a player's issue), one sentence that becomes a plan, the accept. The sandbox has three variants: A the schematic, C nested walls, D a sequence diagram.
- **The small clips.** One per landing page card, 7 to 11 s, silent, a short label at the bottom left per moment instead of captions (`"plain": true` and the `label` caption class). The waits play four times faster.

## Round 3 decisions

- **The clips.** Five cards on the landing page, plus the stall clip in its fold: the chat finds the right card (new scene 36: a line that names no card; the project agent has no search tool, so it reads the board with its `board` tool, then proposes the `steer`), a plan is a card (diagram, then scene 03, which now answers the plan's question and presses Accept for real), the escalation ladder (diagram, then scene 10), the money (scene 20), the dial (diagram, then scenes 22 and 25), recovery from stalls (diagram, then scene 08). The review and issue clips left the page.
- **The facts behind the diagrams** come from a read of the code, not the docs: twelve session detectors in `factoryd/supervise.go` (no events 5 min, no file written 15 min, 60 tool calls with no change, the same call 4 times, the same failure 3 times, flip-flop, 15 changes with no new pass, 60 % spent with nothing pushed, a check-in every 45 min, 8 min on the cheap model with nothing pushed, 2 h of agent time, 3 nudges with no new content), the measures in order (nudge, check-in by the big model, the big model in place, a new session from a handover, caps of 3 sessions, 2 h, 12 check-in calls and the budget floor, then a person), and the decisions per autonomy level from `policy.ConfirmFor`.
- **Rules built into the cuts.** `maxZoom` and `camDur` in film.json cap a zoom and set the camera's pace. A clip's labels sit at the top left, over the console's top bar, clear of the chat input. A tail stops where the next step reloads the page or the video ends. A closing still covers the clock's rounding, so no cut ends on dark. `reveals` bring the console up from the background where a diagram faded out.
- **Scene 34** drains one card at a time: twenty moves from the board right after the presses, the waiting cards keeping their buttons until they move. Scene 08 and scene 10 open on the board before the drawer.
- **Open for Sebastian.** The page and `docs/evidence.md` said database migrations stay human at every level. The code lets the project agent approve a pending merge at full auto with no risk-class check (`console/actions.go` doApprove, `factoryd/gates.go` on the merge rule auto). The page no longer makes the claim. Whether the product or the doc changes is his call.

## The game's cards

| # | Was | Becomes |
|---|---|---|
| 100 | Footer: the studio's address and hours | Title screen: show the version and the server region |
| 101 | Waitlist when a class is full | Co-op: a full lobby queues players for the next free seat |
| 102 | Schedule page under 400 ms | Matchmaking: GET /match under 400 ms at the p95 |
| 103 | Class page: teacher and room | Ship select: show each ship's speed and shield |
| 104 | Checkout: 500 after the Stripe webhook change | Store: 500 after the Stripe webhook change |
| 105 | Calendar: rewrite it as week and month views | Level 4: the asteroid belt |
| 106 | No confirmation mail after booking | No receipt after buying a skin |
| 107 | Confirmation mail once the payment settles | Store: send the receipt once the payment settles |
| 108 | Security: express 4.20.0 | unchanged |
| 109 | Calendar: one events model | Asteroid field: one physics model for rocks and their fragments |
| 110 | Calendar: the week view | Level 4: the belt's map and its enemy waves |
| 111 | Calendar: the month view | Level 4: the mining drone enemy |
| 112 | Calendar: drag a class, bookings follow | Level 4: the belt boss, its fragments follow the physics |
| 113 | Calendar: the week grid | Level 4: the belt's map and its camera |
| 114 | Calendar: class blocks in the grid | Level 4: the enemy waves on the map |
| 115 | Weekly dependency bump | unchanged |
| 116 | Booking: cancel up to 12 hours before | Lobby: leave a match without penalty in its first 60 seconds |
| 117 | Reminder mail 24 hours before class | Daily challenge: notify players when a new one opens |
| 118 | Schedule: filter by teacher | Leaderboard: filter by ship |
| 119 | Schedule: 500 when no teacher is chosen | Leaderboard: 500 when no ship is chosen |
| 120 | Class pass: 10 classes, 6 months | Season pass: 10 tiers, valid for the season |
| 121 | Account page: past bookings | Profile: a player's past runs |
| 122 | Payments: refund a class the studio cancels | Store: refund a purchase the server rolls back |
| 123 | Schedule page p95 up since #118 | Leaderboard: p95 up from 0.31 s to 0.74 s since #118 |
| 124 | Cost review | unchanged |
| 125 | Class page: add the class to your calendar | Replays: share a run as a link |
| 126 | Cancel exactly 12 hours before is refused | Boss fight: pausing in phase two freezes the game |

## Findings so far

- HyperFrames 0.8.183 plays the bank's mp4s as clips: `<video class="clip" data-start data-duration data-media-start>`, frame-accurate (a rendered frame matched the source at its offset, 44 dB against 21 dB at a wrong one). A test render of 4 s took 6 s.
- Media timing must sit in the HTML as literal attributes: the compiler reads them before any script runs. Overlay positions may come from `data.js` at run time.
- The independent critic (Gemini 2.5 Pro through `tools/img.py critique`, about $0.03 a call, run from the main checkout, which holds `.env.tools`) reads a contact sheet of one frame every two seconds. Its useful catches so far: text too small, an actor named in a caption that no box on screen shows, a story step out of order (the cap answered before the agent finishes), claims made only in captions and not shown.
- A geometry probe (`/tmp/claude-1000/film-review/probe.js`, Playwright) seeks the timeline every 0.1 s and reports visible text that collides, overflows or leaves the frame. Run it before every render.
- Captions at 48 px, two lines at most, over a dark band, so they survive a phone screen.
- The board drains forward: the plan behind the hero frame's budget stop is level 4, so the request after the drain asks for level 5, the ice moon, a new plan of four cards.
- A cut build must copy each scene's video on every build. A copy kept from an earlier build played the old recording against the new marks: the approval's highlight sat on an emptied slot until this was found.
- The critic reads one frame a second for the clips and one every two seconds for the film's sections. It cannot see motion, so it calls every camera move a jump and every reading pause a dead frame. Its real catches: a highlight on a slot the card had left, a zoom out that showed black past the console, a highlight on a line that read "waits for a human" under a caption saying the agent answers.

## How to build and render

1. `demo/run.sh <scenes>` records the footage. The film uses 34, 22, 25, 08, 21 and 27, the clips 11, 03, 07, 33, 20, 25 and 08. Each names its overlay regions in `boxes`.
2. `node demo/video/render.js sandbox-a` (and `sandbox-c`, `sandbox-d`): the procedural clips.
3. `node demo/video/film.js film-a` (and each `clip-*`) copies the clips, writes `data.js` and renders `index.html` from the template. Then `node demo/video/render.js <name>`.
4. Before every render, run the geometry probe on the composition. The template refuses a caption shorter than its words need (1.4 s at least, 0.22 s a word), so a page error names the caption to retime.
5. Contact sheets: `ffmpeg -i demo/out/p-<name>.mp4 -vf "fps=1/3,scale=533:-1,tile=3x4" -frames:v 1 demo/out/p-<name>-sheet.png`. The critic: `uv run tools/img.py critique --critic gemini ...` from the main checkout.
6. The landing page's copies: `ffmpeg -i demo/out/p-clip-<name>.mp4 -vf scale=1280:-2 -c:v libx264 -crf 30 -preset slow -an -movflags +faststart launch/site/assets/clips/<name>.mp4`, and the same for the film into `launch/site/assets/film.mp4`. Both stay out of git until a cut is approved.

## What the critic said, and what changed

- Sandbox A, first pass 3/5: text too small, a push by "the factory" with no factory on screen. Fixed: larger layout, a factory box from the start, the probe before the agent works, the fund press before the agent finishes.
- Sandbox B, first pass 2/5: the probe, the keys and the fresh, revoked token were in captions only. Fixed: a model key chip at the gateway, a token chip that pushes and is revoked, the factory named, captions at 48 px.
- Openings A, B, C, first pass 2/5 each: the split's result not shown, the step from sentence to plan confusing, "the board fills" overstated four cards. Fixed: a held spotlight on the two landed cards, the planner's running step cut and replaced by a clock from 09:01 to 09:21, "the four cards land".

- Version 2, the film's sections at 3, 2 and 3 of 5 before the last fixes. The approval's empty highlight, the zoom out on the plan, the split's highlight on a card that had left, the highlight before the Do it button existed, and the full-auto story were fixed. Full auto now shows the agent's own answer and the merge and release lines, not the gate's raw log. The wake line itself said "1 asks wait": factoryd's wake text now says "1 ask waits" (code 2d6b6156).

## Open, for Sebastian

- Which sandbox: A the schematic (in the cut), C nested walls or D the sequence diagram.
- The case that lands with the human uses scene 21, a decision only a person makes. A scene where an agent tried twice and explains why it cannot fix the problem does not exist yet.
- The rough cut runs 180 s since round 3: slower pacing and the whole sandbox A (56 s) inside it. Cutting to 90 means dropping sections or moving the sandbox out of the film; the clips already carry each mechanism on their own.
- The voice track: lines are not written. They come from the captions once the cut is approved, generated under the fal cap.
- DORA: the film says "the four DevOps delivery metrics", as the page does.

## State

- [x] The story rewritten to the game (c03c2e8), the bank recorded again, 82 tests green.
- [x] The recorder writes element boxes per step (`boxes`, `stillMs`), the end of each action (`acts`), and draws an arrow pointer (`cursor: false` hides it).
- [x] Scene 34 runs from the hero still through the drain, intake and the ice moon's plan. Scene 35, the rewind, is gone. The demo project's backlog cap is 16.
- [x] Version 2: the rough cut, sandbox A, C and D, seven clips. Probed clean, rendered, each identical over two renders.
- [x] The landing page plays the clips in its cards, with the stills as posters, and the film behind the hero's play button. Its video files stay out of git until a cut is approved.
- [ ] Sebastian picks; then the cut to length, the voice, the videos into git.
