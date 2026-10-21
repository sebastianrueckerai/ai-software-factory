# The film, version 1: notes

Started 22 October 2026. The working file for the film's first version: what Sebastian asked, the decisions, the state. A fresh session rebuilds from here.

## What Sebastian asked, 22 October

- The film starts on the landing page's hero image, or one like it. If only one freeze frame shows the system, it is that frame. If the reader clicks, the video behind it plays.
- In medias res: the full board first, since readers know a kanban. Effects highlight the points the image makes, and captions and sound explain each quickly.
- Before ingestion, the board drains, so the film gets the board-populating effect.
- Then animations of how it works: accept a pull request by hand, raise the dial from manual to full auto and the next card merges by itself, errors (a card over its budget, a self-heal by an agent, a case that lands with the human after the agent has a good reason), ingestion with plans spawning implementation cards, the metrics page (delivery metrics over time: throughput, escalations, and tuning model choice and prompts against them), and last a zoom into a card with an animated graphic of the isolated pod: the agent never holds a token or a key, every call is metered against a cap.
- One board where possible. A transition animation where the film jumps to another board state. Video overlays to highlight parts of the board.
- More than one version, to show different possibilities for the animated graphics and overlays.
- The cards' subject: something cooler than a calendar app, a computer game or a better idea.

## Decisions

- **Videos with contact sheets.** Motion is what Sebastian judges. Each variant also gets a sheet of stills so he compares at a glance.
- **The demo project becomes a game.** Nebula Run, a co-op browser space shooter with a Go game server, repository `orbit/nebula-run`. Every card keeps its number, size, role and timings; only the fiction changes. The mapping is below.
- **Order of the film.** Hero frame and its three points, the budget stop answered by the split, the board drains, ingestion populates it again, by hand then full auto, a self-heal and an escalation with a reason, the metrics, the zoom into the sandbox, back to the hero frame and the link.
- **Wording kept true.** "The four DevOps delivery metrics", not DORA, unless Sebastian lifts the rule. Tuning names models and prompts, not harnesses: one adapter exists. The agent never holds a push token or a model key: the pod holds a one-hour gateway identity. Every model and tool call is metered and held against a cap: package downloads are not.
- **Tooling.** The console footage comes from the demo bank (`demo/run.sh`). The recorder writes each step's element boxes into the sidecar, so overlays, spotlights and zooms follow the UI and regenerate with the bank. The film is a HyperFrames composition: the bank's videos as clips, GSAP overlays on top. Captions only in version 1: the voice track costs money and waits until the lines are approved.

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
- The opening can not show the board draining forward and then the request for level 4, because level 4 is the plan whose child stopped at its budget in the hero frame. The drain is a rewind: cards leave the board newest first, a clock runs back from Friday to Monday, and the ingestion that follows is Monday's request.

## How to build and render

1. `demo/run.sh <scenes>` records the footage. The film uses 34, 35, 03, 22, 25, 08, 21 and 27. Each names its overlay regions in `boxes`.
2. `node demo/video/render.js sandbox-a`, `sandbox-b`: the procedural clips. `sandbox-b` first needs `node demo/video/film.js sandbox-b` for the hero frame and the running card's box.
3. `node demo/video/film.js opening-a` (and `-b`, `-c`, `film-a`) copies the clips, writes `data.js` and renders `index.html` from the template. Then `node demo/video/render.js <name>`.
4. Before every render, run the geometry probe on the composition. The rough cut's template refuses a caption shorter than 1.2 s, so a page error in the probe means a beat in `film.json` starts on its successor.
5. Contact sheets: `ffmpeg -i demo/out/p-<name>.mp4 -vf "fps=1/3,scale=533:-1,tile=3x4" -frames:v 1 demo/out/p-<name>-sheet.png`. The critic: `uv run tools/img.py critique --critic gemini ...` from the main checkout.

## What the critic said, and what changed

- Sandbox A, first pass 3/5: text too small, a push by "the factory" with no factory on screen. Fixed: larger layout, a factory box from the start, the probe before the agent works, the fund press before the agent finishes.
- Sandbox B, first pass 2/5: the probe, the keys and the fresh, revoked token were in captions only. Fixed: a model key chip at the gateway, a token chip that pushes and is revoked, the factory named, captions at 48 px.
- Openings A, B, C, first pass 2/5 each: the split's result not shown, the step from sentence to plan confusing, "the board fills" overstated four cards. Fixed: a held spotlight on the two landed cards, the planner's running step cut and replaced by a clock from 09:01 to 09:21, "the four cards land".

## Open, for Sebastian

- Which opening style: spotlight, brackets or camera. Which sandbox: schematic or from the card.
- The case that lands with the human uses scene 21, a decision only a person makes. A scene where an agent tried twice and explains why it cannot fix the problem does not exist yet.
- The rough cut runs 114 s. Cutting to 90 means shorter middle sections or dropping one.
- The voice track: lines are not written. They come from the captions once the cut is approved, generated under the fal cap.
- DORA: the film says "the four DevOps delivery metrics", as the page does.

## State

- [x] The story rewritten to the game (c03c2e8), the bank recorded again, 82 tests green.
- [x] The recorder writes element boxes per step (`boxes`, `stillMs`) and can turn the cursor ring off (`cursor: false`).
- [x] New footage: scene 34 continues past the hero still to two Do it presses, scene 35 rewinds the board to Monday, scene 03 ends with the accepted plan's four cards on the board. The demo project's backlog cap is 16.
- [x] Sandbox A and B, openings A, B and C, the rough cut A: probed clean, rendered, each identical over two renders.
- [x] The landing page shows the game's frames.
- [ ] Sebastian picks; then the cut to length, the voice, the page's film slot.
