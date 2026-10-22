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

## What Sebastian asked, 22 October, after round 3 (round 4)

- The budget sentence in the rough cut comes too fast and is too long: build it ("A card failed twice" alone first, then longer), and slow the moves; a zoom in and then a quick move elsewhere disorients.
- The drain can be a little faster, still one card after another.
- "Too big for one card": the highlight left the screen because it moved faster than the zoom. Often show enough of the screen and skip the zoom; the highlight alone can point. "For your accept" becomes "for you to accept".
- On manual, open the pull request in Forgejo, to show the code is a click away.
- A section title must not show the earlier highlight behind it: title first, then the move, then the highlights.
- The captions sit at the very bottom, where a player's controls cover them: try thin black bars top and bottom, reversibly.
- The short clips end on their moral, for example that the control chat writes no code but orchestrates the workers.
- Show routines (the dashed card, the weekly bump) in a clip of their own.
- The budget clip mostly shows a split: replace it with the discretionary pool, so the factory does not ask about five-cent overruns.

## What Sebastian asked, 23 October, after round 9 (posters)

- A suggestion for one form across the six card titles, in the chat.
- A few posters for the chat card and the routines card, whose console frames do not read at card size.

## Poster candidates

- **Diagrams.** Each poster is a static page in `demo/video/poster-*` on the diagrams' stylesheet and `demo/video/poster.css`. `node demo/video/poster.js <name>...` writes `demo/out/<name>.png`. A poster's bottom-right corner stays empty, under the card's Play button.
- **Console crops.** `POSTER=1 demo/run.sh <scene>` records into `demo/out/poster/` at three times the pixel density, without the pointer, then ffmpeg cuts the crop.
- The critic (Gemini 2.5 Pro) on the first two candidates, after larger text and thicker wires: the diagrams tell each card better at card size and fit the other four. Its claim that the Play button covers the diagrams was checked on a magnified crop and is wrong.

## What Sebastian asked, 23 October, after the posters

- The ladder card's title: "Stuck sessions get help in steps", picked from variations of "Stuck sessions climb a ladder".
- The routines card shows the console crop.
- For the chat card, a few diagram variations: the project agent talking to several running cards on one side and to you on the other, or the agent with the whole board and roadmap.

## Decisions, 23 October

- **The routines poster.** Scene 38's slot follows the recording clock, so the bank's recording and the poster recording run back to back and read the same slot, every Thursday 22:15: `demo/run.sh 38-image-bump`, then `POSTER=1 demo/run.sh 38-image-bump`, then `ffmpeg -i demo/out/poster/38-image-bump-5.png -vf "crop=1890:1062:2850:420,scale=1600:-1:flags=lanczos,pad=1600:900:0:(oh-ih)/2:color=0x070b12" launch/site/assets/poster-routine.png`. The routines clip was rendered again from the new recording, 31.8 s.
- **The chat posters.** Four variations: A `poster-chat-hub`, B `poster-chat-context`, C `poster-chat-both`, D `poster-chat`. The project agent reads the board, sessions and the document repository, where the roadmap lives, through its tools, so B says "sees the whole project", not that it holds it all in its context. The critic ranks D, A, C, B: D tells the card's text step by step, A shows one chat to many cards at a glance, C is crowded at card size, B shows no action. Sebastian picks.
- **The routines diagram** is gone, since the routines card took the crop.

## What Sebastian asked, 22 October, after round 8 (round 9)

- A second of the drained board before "New work files itself", so the first new card stands out.
- Snappier titles for two cards on the site: "Control spending intelligently" for the pool, "Going full auto" for the dial.

## Round 9 decisions

- **The pause.** The drain ends on the step that empties In progress, and the intake starts 1.1 s before the scan's card lands, from the same recording. The drained board holds about 1.2 s. The film runs 185 s.
- **The titles.** The site's cards, the clips' metadata and this page carry the new titles. The clips themselves show no title, so nothing was rendered again for them.

## What Sebastian asked, 22 October, after round 7 (round 8)

- Go on cutting the split: the opening's design question is answered in one click and the board drains.
- The primer stays, for the board only: the chat is already explained by "Change anything from one chat".

## Round 8 decisions

- **The opening.** Scene 34 no longer splits #110. The hero's chat holds the agent's proposal to steer the refund (the steer of scene 36), so "The agent proposes, you approve" shows on screen. The hero's last beat is #120's design question; one click on "No refund" on its card slides it to In progress, and the drain follows. In the drain the merge is approved and #110 is funded for one more session, off screen, so #112 runs once #110 is done.
- **The primer.** The rough cut opens on the board alone ("A kanban board: where development stands, at a glance."), then the chat, the columns and the design question. The test clip `film-primer` is gone.
- **When it needs you.** Gone from the film: the opening shows that moment now. Scene 21 stays in the bank. The film runs 184 s.
- **The budget stop.** Settled: the opening no longer answers a budget stop, so its three options are moot.
- **Busy cards.** A card the drain moves to building or review is 20 minutes on the card, so the board shows no stale mark on it.

## What Sebastian asked, 22 October, after round 6 (round 7)

- After 2:09 the cut goes light and dark: one fade to black is not needed.
- The text under "full auto" in the menu sits at the frame's edge under the caption's band. Zoom out a little, or pan past the console and show black there.
- The switch to full auto shows the menu, then a cut, then the click and the new level. Make it one quick scene.
- "The four DevOps delivery metrics": the page has more than four, so name no number.
- "Escalations 4 · 4 %" looks made up: make it something like 13 and 4 %, and check the other figures for plausibility.
- The lamps: each one, dim to bright, shows only when its level is chosen. Change it wherever the old way shows.
- A clip built around a diagram shows the diagram as its poster.
- The rough cut sat still for its first two seconds: the first highlight and caption start at 0.5 s.
- Asked, not ordered: should the split go from the opening, replaced by a design question answered in one click that unblocks the board? And a test of a primer that lights the board, then the chat, before the column-by-column opening.

## Round 7 decisions

- **No dip after the approval.** Scene 22's merge reaches the open board as an event does, with no reload, so the cut runs from the click to the merged card without a fade.
- **The switch in one scene.** The console lab now writes each scene's project file onto its infra fake, so a level pick commits as on the factory (code commit 9d3e1a21). Scene 25 opens the menu, clicks full auto, and the chip shows full auto at once; the agent's wake turn follows after one reload.
- **Free camera.** A cam may set `free: true` and pan past the console's edge, which shows black, to keep its box clear of the caption band. The full-auto menu uses it.
- **Lamps.** C36: the menu draws a lamp only beside the chosen level, in build 9d3e1a21.
- **The figures.** The quiet work is 300 cards a week, 60 each weekday at one to three cents. Every 33rd asks one question, answered in nine minutes; every 25th's first review asks for changes; they book no human act, as on a merge rule. Week 2 reads 310 cards, 13 escalations, 4 % of the cards, 0.1 acts per card, 96 % review acceptance, 16 % human-blocked, €0.02 a card and 59 thousand tokens a card, at 1.6 million tokens a euro for the cheap model. Change failure stays 0 %: the factory counts reverts, and #118 was fixed forward.
- **The primer.** A test clip, `film-primer`, opens on the dimmed frame, lights the board, then the chat, then plays the opening as it is.
- **The first half second.** The opening's highlights and captions moved 1.5 s earlier, the first at 0.5 s, and the hero still runs 15.5 s; the chat clip's first label also starts at 0.5 s.
- **Posters.** A clip with a diagram at its heart shows the diagram's last full frame as its poster, what a viewer sees while it does not play. The plan card switched from its console frame to `diagram-plan`; ladder, pool, dial and stall already did.

## What Sebastian asked, 22 October, after round 5 (round 6)

- The level menu shows several lamps lit. At first only manual's lamp may be on, after the switch only the brighter full auto lamp. Check it wherever the menu shows.
- Unchanging views can be shorter: the stall, the manual review, the Forgejo page and other places. Nobody reads the screen's text; the screen only has to look real. Keep enough time for the captions, judged from the last camera move. The cards can leave the board faster, still one by one.
- No highlight on the Forgejo page. In full auto, do not open the drawer at "the card merges once the gates pass".
- The metrics page should look better: 40 % of cards needing a human looks bad, about 4 % is right.
- The pool clip's moral names no amount: "You are not alerted for peanuts".
- The dial clip flickers and shakes from 34 s, and at 41 s a highlight outlasts what it marks.

## Round 6 decisions

- **The lamp.** C34: each row keeps its lamp, only the current level's is lit, at C33's values, in console build c9dd1fe4. Scene 25 opens the menu again after the switch, where only the full auto lamp is lit, before the wake turn.
- **The flicker.** The dial clip's last unspot before each cut fell inside the lift's 0.05 s tolerance, so it moved to the lift's end, the same moment as the next highlight. Two tweens on one attribute that start together render by seek history, and HyperFrames renders every fourth frame in its own worker, so one worker in four showed the frame without its highlight. Now taking a highlight away is never delayed, each highlight move and camera move ends before the next begins, and the page refuses to load when two tweens still change one property of one element at once. Single blank frames came from how film.js wrote each media element's start and length, both rounded to the millisecond apart: piece 4 of the stall ended at 157.766 and piece 5 began at 157.767, so frame 4733 showed no video. film.js now writes each length as the rounded end minus the rounded start, so one element ends exactly where the next begins.
- **The quiet work.** The ledger adds 90 small cards a week that no scene shows, filed by routines and the intake each half hour of every weekday, 3 to 8 cents each, live after the merge click manual asks for. A week now reads 100 cards; week 2 escalates 4 of them, 4 %. Board spend, the costs page and the cost review's note follow from the same ledger.
- **Pacing.** The drain runs at 9 times speed, the manual review and the Forgejo page at twice the hold speed, the stall at 1.4 with holds at 2.4, the question at 1.0 with holds at 2.2. The caption guard keeps every caption long enough to read.

## What Sebastian asked, 22 October, after round 4 (round 5)

- Rough cut: "you press Do it" becomes "you approve". "Player" becomes "user" everywhere.
- No zoom on the plan card, only a mark. On "Then approve", the highlight must leave with the card, and the merged card needs no zoom and less time.
- The board behind "Full auto" zooms erratically. Every section title: fade the board to black, show the title, fade back, and only then move.
- The highlight on the question must reach its choices.
- "Measured" becomes "Metrics", a little slower, the whole page first, and a line that the metrics let you tune the process, the harness and the prompts on data.
- The caption over "Inside a card" looks dimmed. Should "Inside a card" come earlier, and should Metrics come last? Keep the black bars, in every video.
- Clips: the chat clip's first label names no card content, its moral becomes "The chat writes no code, it orchestrates development for you", its page title "The chat orchestrates development". The labels get a bigger box and a shadow. The ladder loses its duplicate label. The pool box shows only a fund you set for small overruns. The dial's title becomes "Manual control or full auto, and anything in between", the level menu shows lamps brighter with each level, the full auto lamp is seen on, and the zoom jitter at 55 s goes. The stall clip says "human", not "person". Routines become one simple console scene, without a diagram. Sandbox A stays.

## Round 5 decisions

- **Order.** Inside a card follows the plan: the plan ends with "the agents take it from here", and the sandbox shows what one agent does inside its card. Every later section then reads as what happens around a card. Metrics comes last: it sums up the run and leads into tuning.
- **Slates.** A section title is a segment of its own, `{"id", "title", "dur"}`: the scene before fades to black, the camera resets under the black, the title shows alone, and the next scene lifts from black before any highlight, caption or camera move starts.
- **Zoom.** Only the stall, the question, the menu and the manual review keep a zoom, capped at 1.35. The merged card shows as a still with a highlight for 2.6 s.
- **Template rules.** A caption ends before the next title, so no old caption returns over a slate. A page change through black lands on the whole frame; a zoom on the new page is its own cam. Where a scene reloads the page, the cut splits into two segments at the reload, so the load costs one 0.9 s dip instead of up to 2 s of black. The film's tail is gone, so it ends on the closing still, not on black.
- **The level menu.** C33: every row of the menu carries its own lamp, brighter with each level, in console build 549cbaee. The lab cannot change the level, so the switch to full auto is seeded and shown after a reload, with the chip's lamp highlighted.
- **Routines.** New scene 38: one sentence in the chat, the routine proposal, the dashed card in Queued, its card running on its day, done, and the dashed card waiting again. The approval press and the run are seeded, since the lab cannot commit the project file. The lab runs on the real clock, so the weekly slot is the last quarter hour at least ten minutes before the recording, and the chat thread sits a week earlier: the dashed card's next run, the card's age and its run then agree. The routine diagram is gone.
- **The pool.** The pool box shows only "€10 a month, you set it, for small overruns". The raise limit, the card cap and the month's limit rows are gone.
- **Users.** The demo project's cards, its Forgejo code and every caption say "user" where they said "player". All scenes were recorded again.
- **Harness.** The metrics caption names the harness among the things to tune. The factory has one harness adapter today, so tuning it means its tools, skills and settings, not a switch to another harness.

## Round 4 decisions

- **Template rules.** A section title or a moral holds the frame alone: the highlight leaves as it comes, captions and highlights of the next moment wait until it leaves. A highlight that meets a camera move leaves as the move starts and appears in place once it stops. A caption with `parts` lays out its whole sentence from the start and fades each part in, so nothing shifts. A `reveals` entry with `from` and `to` dissolves a page change through the background colour. `matte` in film.json scales the picture into black bars: 54 px top and bottom, which leaves pillar bars at the sides, since a 16:9 picture inside a 16:9 frame cannot shrink only in height without a crop. Removing the key reverses it; the review page shows both.
- **Forgejo.** `demo/forgejo/setup.sh` starts a local, throwaway Forgejo (codeberg.org/forgejo/forgejo:15.0.9) with orbit/nebula-run and pull request #220 of the refund card, five files whose line counts match the console's. The recorder serves https://git.example, where the lab's console links, from it (`forgejo: true` in a scene). Scene 22 needs it running.
- **The pool.** The console shows the pool nowhere: no page states its size or what it funded. The clip shows the theory in a diagram and the console's real traces: the wake turn's `fund` call and its result, and the card's "question answered" line. The demo's wake text gained the pool sentence factoryd writes when the woken member is an approver. New scene 37.
- **Routines.** Scene 19 records its boxes and a fourth step, the bump's Runs tab. The demo's bump files agent cards; the factory's own weekly bump files a card for a person.
- **Morals.** Every clip ends on one sentence held over a dimmed last frame.

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
| 101 | Waitlist when a class is full | Co-op: a full lobby queues users for the next free seat |
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
| 117 | Reminder mail 24 hours before class | Daily challenge: notify users when a new one opens |
| 118 | Schedule: filter by teacher | Leaderboard: filter by ship |
| 119 | Schedule: 500 when no teacher is chosen | Leaderboard: 500 when no ship is chosen |
| 120 | Class pass: 10 classes, 6 months | Season pass: 10 tiers, valid for the season |
| 121 | Account page: past bookings | Profile: a user's past runs |
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

1. `demo/run.sh <scenes>` records the footage. The film uses 34, 22, 25, 08, 21 and 27, the clips 36, 03, 10, 37, 22, 25, 08 and 38. Scene 22 needs `demo/forgejo/setup.sh` first. Each names its overlay regions in `boxes`.
2. `node demo/video/render.js sandbox-a` (and `sandbox-c`, `sandbox-d`, and each `diagram-*`): the procedural clips.
3. `node demo/video/film.js film-a` (and each `clip-*`) copies the clips, writes `data.js` and renders `index.html` from the template. Then `node demo/video/render.js <name>`.
4. Before every render, run the geometry probe on the composition. The template refuses a caption shorter than its words need (1.4 s at least, 0.22 s a word), so a page error names the caption to retime.
5. Contact sheets: `ffmpeg -i demo/out/p-<name>.mp4 -vf "fps=1/3,scale=533:-1,tile=3x4" -frames:v 1 demo/out/p-<name>-sheet.png`. The critic: `uv run tools/img.py critique --critic gemini ...` from the main checkout.
6. The landing page's copies: `ffmpeg -i demo/out/p-clip-<name>.mp4 -vf scale=1280:-2 -c:v libx264 -crf 30 -preset slow -an -movflags +faststart launch/site/assets/clips/<name>.mp4`, and the same for the film into `launch/site/assets/film.mp4`. Both stay out of git until a cut is approved.

## What the critic said, and what changed

- Sandbox A, first pass 3/5: text too small, a push by "the factory" with no factory on screen. Fixed: larger layout, a factory box from the start, the probe before the agent works, the fund press before the agent finishes.
- Sandbox B, first pass 2/5: the probe, the keys and the fresh, revoked token were in captions only. Fixed: a model key chip at the gateway, a token chip that pushes and is revoked, the factory named, captions at 48 px.
- Openings A, B, C, first pass 2/5 each: the split's result not shown, the step from sentence to plan confusing, "the board fills" overstated four cards. Fixed: a held spotlight on the two landed cards, the planner's running step cut and replaced by a clock from 09:01 to 09:21, "the four cards land".

- Version 2, the film's sections at 3, 2 and 3 of 5 before the last fixes. The approval's empty highlight, the zoom out on the plan, the split's highlight on a card that had left, the highlight before the Do it button existed, and the full-auto story were fixed. Full auto now shows the agent's own answer and the merge and release lines, not the gate's raw log. The wake line itself said "1 asks wait": factoryd's wake text now says "1 ask waits" (code 2d6b6156).
- Version 5: the film's parts at 2, 2 and 3 of 5, the clips at 3 of 5 except the ladder at 2. Its listed defects were checked frame by frame: it reads the black slates, the dips at page changes and the dimmed moral frames as empty, the spotlight's dimming as a zoom, and a highlight around a card with its button as a highlight on the button. Fixed from my own frame checks instead: the Forgejo highlight that stayed over the board, the approval highlight that outlined the empty slot, up to 2 s of black at page reloads, the black last frame, and the routine clip's typed line that scrolled away unread.
- Version 6: the film's parts at 2 of 5 each, the dial clip 2, the pool and stall clips 4; the other clips kept their version 5 content and scores. The dial's two asks, zooms onto the chip and readable console text, run against the direction to zoom less, so they stay undone.
- Version 7: the film's parts at 2, 3 and 2 of 5, the dial clip 4. The primer clip 2: the critic finds the dimmed primer slows the start, but its rules count every dimmed frame as a defect, so the verdict is the test you run with viewers, not this one.

## Open, for Sebastian

- The pool shows nowhere in the console: no page states its size or what it funded. The pool clip shows it through the diagram and the wake turn's trace.
- The case that lands with the human uses scene 21, a decision only a human makes. A scene where an agent tried twice and explains why it cannot fix the problem does not exist yet.
- The rough cut runs 185 s since round 9: black slates, the Forgejo visit and the whole sandbox A (56 s) inside it. Cutting to 90 means dropping sections or moving the sandbox out of the film; the clips already carry each mechanism on their own.
- The voice track: lines are not written. They come from the captions once the cut is approved, generated under the fal cap.
- DORA: the film says "the four DevOps delivery metrics", as the page does.

## State

- [x] The story rewritten to the game (c03c2e8), the bank recorded again, 82 tests green.
- [x] The recorder writes element boxes per step (`boxes`, `stillMs`), the end of each action (`acts`), and draws an arrow pointer (`cursor: false` hides it).
- [x] Scene 34 runs from the hero still through the drain, intake and the ice moon's plan. Scene 35, the rewind, is gone. The demo project's backlog cap is 16.
- [x] Version 2: the rough cut, sandbox A, C and D, seven clips. Probed clean, rendered, each identical over two renders.
- [x] The landing page plays the clips in its cards, with the stills as posters, and the film behind the hero's play button. Its video files stay out of git until a cut is approved.
- [x] Round 5: black slates, Inside a card after the plan, Metrics last, no zoom on the plan, the merged card or the full-auto board, the level menu's lamps (C33), routines as scene 38, all 38 scenes recorded again with "user" for "player".
- [x] Round 6: one lit lamp (C34), the flicker fixed in the template, shorter static views, the quiet work in the ledger, the pool's moral without an amount.
- [x] Round 7: the merge without a dip, the switch in one scene, the free camera, no lamp beside the levels not chosen (C36), 13 escalations at 4 %, the primer as a test.
- [x] Round 8: the split cut from the opening, the design question answered in one click, When it needs you gone, the primer on the board alone, 184 s.
- [x] Round 9: a 1.2 s pause on the drained board before the intake, the titles "Control spending intelligently" and "Going full auto", 185 s.
- [ ] Sebastian approves the cut; then the cut to length, the voice, the videos into git.
