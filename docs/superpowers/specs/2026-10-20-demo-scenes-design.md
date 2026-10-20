# Demo scenes: regenerable recordings of the real console over scripted data

Design, 20 October 2026. Sebastian decided the direction in the design conversation of the same day. The calls marked "my call" are the author's and open to his correction.

## Intent

The factory becomes a portfolio project and an accelerator pitch. The thing to show is the process, not the apps it builds: a card travels from a chat message to a spec, a plan, a sandbox, a pull request, a review, a merge, a deploy, and a telemetry fix, with the human only at the gates. A video shows that best. Sebastian wants a bank of short scenes, each a self-contained story of ten to forty seconds, recorded wide now and cut later into the videos the landing page and the pitch need.

Every scene must be regenerable by one command, so a change of the console's look regenerates the whole bank. The recordings show the real console. The data is scripted: one fake project whose history tells exactly the stories the scenes need, with none of the mess of the real projects. Sebastian ruled out any caption that marks footage as staged.

## Goals

- A scene bank: every scene in the catalogue below that the console can show, recorded as a video file with a sidecar.
- One command regenerates the bank from the current console code.
- The real console, pixel for pixel. The fake data enters below the console at the store boundary, nowhere in the rendering.
- Deterministic output: the same scene recorded twice shows the same states in the same order. Only the wall clock on the recording differs.
- Zero model spend per recording. Chat answers are scripted.
- A plan for the clips the browser cannot record, generated with the fal video models, with prompts and a cost estimate, run only after Sebastian sets a cap.

## Non-goals

- The landing page, the cut, the final videos, the GitHub README. They come after the bank exists.
- Recording the live factory. Nothing in this design touches the cluster, the live database or a real model.
- A demo that strangers can drive themselves.
- Generated footage of the console. Video models invent text and layout. Every console frame comes from the browser.

## Anti-goals

- A scene bank that only the author can regenerate. If it needs a running cluster, a database restore or a provider key to record, it fails this design.
- Scripted data that contradicts the console's rules. A card in state X with a gate the state cannot have breaks the illusion and may break the render. The fakes check nothing today, so the seed checks what is cheap to check: strict JSON decoding with no unknown fields, statuses, gates and lanes against factoryd's lists, references (parents, dependencies, cards an event or alert names) that exist in the scene. The recorder fails a scene on any console response of 400 or above and on any page script error, as the lab's shoot script already does. No table of which status goes with which gate: that would have to follow factoryd forever.
- Footage that shows the factory's own project or Sebastian's real projects. The scenes show the fake project only.

## Constraints

- The console is the Go package `internal/console` in `~/repos/ai-software-factory-code`. Its test rig and lab are in the same package: `console_test.go` (the rig and the fakes), `lab_test.go` (TestLab and its scenes), `chat_test.go` (the scripted chat gateway, `chatGateway`).
- The design repository `~/repos/ai-software-factory` holds this document and the recorder. Its provider keys live in the gitignored `.env.tools` and are never printed.
- Tooling on this machine: Node 22, Playwright 1.64 at `/tmp/claude-1000/pw/node_modules` with Chromium under `~/.cache/ms-playwright`, ffmpeg 4.4, Go 1.22. Playwright for Python is not installed, so the recorder is Node.
- The lab's structural check (`scripts/console-lab/run.sh`) must stay green. `go test -race ./...` of the code repository must stay green.
- Commit to the default branch and push, in both repositories, as the working agreement says.

## The base: the console lab

The code repository already has the fixture mode this design needs. `TestLab` in `internal/console/lab_test.go` serves the real console on `127.0.0.1:8090` over the test rig's in-memory fakes: tasks, dependencies, plans, approvals, events, chat threads, proposals, attachments, alerts, resources, routines, costs and the metrics report. `GET /lab/scenario/{name}` replaces the whole state in place with one of twelve Go-coded scenes (busy, idle, fire, quiet, assisted, threads, compacted, poke, escalation, history, wake, metrics). `scripts/console-lab/run.sh` starts it, screenshots every scenario in both themes and runs the structural check. It needs no database, cluster or network.

So the console already renders scripted data through its real code. What it lacks for the scenes:

1. **Scenes as data.** Today a scene is a Go function that builds a `labScene` struct. The scene bank wants scenes as files beside the recorder, written and changed without a Go edit. The lab gets `POST /lab/scene`, which decodes a JSON scene and seeds it through the same path as `labSeed`.
2. **A project of the scene's choosing.** `labSeed` hardcodes the factory's own project (`sf/code`, `ai-software-factory-code`, login `sebastian`) in the event rows, the chat keys, the ledger's project config, the mirror and the resource envelopes. `TestLab` itself carries more of the factory's identity: the project rows (so `ai-software-factory-infra` and `demo-app` show in the project select), the `sf/docs` roadmap and plans, the ledger and cap maps, the messenger links, the cluster jobs and `labPRFiles`. The JSON scene names its project, repository and login, and carries its own project rows, documents, pull request files, caps, messenger links and jobs. The seed uses them everywhere the constants stand today. The existing Go scenes keep their project through the same fields, filled with the constants, so nothing of theirs changes.
3. **Scripted chat answers.** The lab's operator points at a dead port, so a sent chat message fails. `chat_test.go` has `chatGateway`, a fake that serves scripted replies as the gateway's event stream, text chunks and tool calls alike. The lab gets one, and the JSON scene carries the replies the next turns get, in order. A scene without replies keeps the dead port.
4. **A board that redraws on seed.** The board redraws at a stream heartbeat (25 seconds) or on a recorded event row. A recording cannot wait 25 seconds. After a seed, the lab wakes the open streams so the board redraws within a second. The builder finds the smallest way: emitting the stream's data-less `board` event is the hint.

Sebastian offered a second base: a fake project seeded into the live factory's Postgres. This design rejects it, on what a read of factoryd found:

- A project is its file in the infra repository plus a Forgejo repository. Chat, metrics, events and the drawer check that the viewer writes to that repository, so a project without one answers 503 on those pages.
- Every minute the heal pass starts a real workflow for any agent card in queued, waiting-deps, running, in-review, merged, waiting-human or closing. Only done, failed, closed and backlog cards stay inert. The scenes need the running states most of all.
- A pending approval without a brief gets a model call within five seconds. A chat turn calls the real model and answers differently each run. Seeded ledger rows count against the factory's day and month caps and show on every board's spend.
- Every console button on a fake card (approve, retry, answer, go, split, a lane move) starts a real workflow.

The lab gives the same console code with none of that, at no cost, and a regeneration needs no cluster.

## The recorder

Lives in the design repository under `demo/`:

- `demo/scenes/<name>.js`: one file per scene. It exports the scene's metadata (title, the story in one line, theme, viewport, the group below) and its steps. A step is a function of the wall clock that returns the full state as a JSON scene, plus the browser actions after the seed (navigate, click, type, hover, wait) and the hold time before the next step.
- `demo/lib/state.js`: helpers that build the state consistently, the counterparts of the lab's `labCard`, `labEvent`, `pushedTimeline`, `labCosts`: a card with its issue number and age, its timeline object, its session transcript, an event row, an alert, an approval, a chat message, a proposal, a metrics report. The helpers carry the fake project's identity so a scene file reads as a story, not as JSON.
- `demo/lib/project.js`: the fake project: name, repository, display, members, environments, routines.
- `demo/record.js`: starts a browser context that records video, sets the lab cookie from `$CONSOLE_LAB_DIR/cookie.txt`, and for every step posts the state to `POST /lab/scene`, waits for the board's redraw, runs the actions, holds. Renders a visible cursor, because Playwright's video shows none. Writes `demo/out/<scene>.webm` and the sidecar.
- `demo/run.sh`: starts the lab the way `scripts/console-lab/run.sh` does (the same `go test -run ^TestLab$` with `CONSOLE_LAB=1`), waits for the cookie, records every scene or the ones named on the command line, converts each to mp4 with ffmpeg, stops the lab.
- `demo/out/`: ignored by version control. Videos and sidecars. Regenerable, so never committed.

The sidecar, `demo/out/<scene>.json`: scene name, title, story, the console repository's commit, the design repository's commit, the steps with their wall-clock offsets in the video, viewport, theme, duration, recording date. An output without its sidecar does not count, as in the design rounds.

Time passes in the data, not in the recording. A step says a card was created 2 minutes ago, the next step says 40 minutes ago with a pull request open. The relative times on the cards jump, which is the time-lapse. The recording itself runs in real time with holds of one to four seconds per step, so no speed change in ffmpeg is needed. Typing runs at human speed through Playwright's keyboard delay.

Viewports: desk 1600 by 900 at device scale 1, phone 390 by 844 at device scale 2. Dark theme as default, the scene file may say light. My call: dark for the bank, decided per scene when cutting.

The clock. The console reads the real clock in production code and shows absolute times in the drawer's feed. No clock gets injected for the demo. A recording shows the hour it was recorded at. So the stories are told in the data's ages ("8 hours ago", "overnight") and in the narration of the cut, never in a clock time on screen. The catalogue's "07:00" and "by the evening" describe the story, not a frame.

The console's surfaces are the limit. A scene shows what the console shows today and adds nothing to the console for the demo. Where the catalogue names a surface the console lacks, the scene uses the nearest real one: the drawer's feed, the settings page's environment state, the metrics page's deploys count.

## The fake project

My call, open to Sebastian: **Studio Nord**, a class booking site for a yoga studio. Repository `nord/booking`, project name `nord-booking`. Members book classes, pay by card, join a waitlist, get a reminder mail. Staging and production environments. Four routines: a weekly dependency bump, a nightly security scan, a weekly performance read, a monthly cost review.

Why this project: everybody understands a class booking. It has features (waitlist, reminders), bugs people recognise (double booking, a missing mail), telemetry stories (500s on checkout, a slow schedule page), a security story (a vulnerable dependency), a cost story (a calendar rewrite that outgrows its budget) and a design question (which calendar library). Two weeks of its life hold every scene below.

The two weeks, as the scenes' shared history:

- Week 1, Monday: Sebastian asks in the chat for a waitlist. The agent asks one question, files the card. Built, reviewed, merged, deployed by the evening.
- Tuesday: an alert, 500s on checkout after a Stripe webhook change. The factory files the fix card itself, the fix merges, the alert settles.
- Wednesday: a member reports a missing confirmation mail. Card, fix, a drafted reply.
- Thursday: the nightly security routine finds a vulnerable dependency. Card, bump, merge.
- Friday: the calendar rewrite hits its budget. The factory asks: raise the cap or split. Sebastian splits. A second ask, which calendar library, gets an answer in the chat.
- Week 2: a review rejects a change and the second attempt passes. Two cards run in parallel. A deploy fails its health check and rolls back, the fix card files itself. The metrics page shows the week: deploys, lead time, cost per card, escalated share, and the improvement after the planning change in week 1.

## The scene catalogue

Wide on purpose. The first shoot records every scene in groups A to F that the lab's fakes can carry. Group G is browser animation of diagrams, group H is generated with the fal models. Each scene is a story with a start state, an action and an end state.

### A. Intake

1. **Chat to card.** Sebastian types "Members ask for a waitlist when a class is full." The agent answers, asks one question (notify by mail or in the app?), Sebastian presses a choice, the agent proposes a card, Sebastian presses Do it, the card appears on the board.
2. **A vague request, measured.** "The schedule page feels slow." The agent reads the metrics by tool, names the p95 of `/schedule` and files a card with the figure in its acceptance.
3. **Too large, split.** "Rewrite the calendar." The agent proposes a plan of four cards with dependencies. The plan card waits for Sebastian's accept.
4. **A card from the board.** The new card form, filled by hand, lane and size chosen, filed.
5. **A card from the phone.** The same as 1 on the phone viewport.

### B. Build

6. **Card to pull request.** A ready card starts: queued, running, the drawer shows the session's words and tool calls, the pull request opens, checks run, the review passes, the card moves to in review, then done.
7. **The review rejects.** The stronger model's review finds a race, the card goes back to running, the second attempt fixes it, the review passes.
8. **The supervisor steps in.** The drawer shows the same failing call three times, the flip-flop detector ends the session, a new attempt starts with the insight in its brief.
9. **Two cards in parallel.** Two running cards, both merge, the board shows both lanes moving.
10. **The stronger model after a failure.** The first attempt on the cheap class fails acceptance, the second runs on the frontier class, the drawer shows the model alias change and the cost.
11. **Steering a running card.** Sebastian types a steer in the chat, the proposal shows, Do it, the running session's transcript shows the steer arriving.

### C. Ship

12. **Merge to done.** The pull request merges, the card moves to done, the drawer's feed shows the merge and the deploy, the settings page shows the environment at the new revision, the metrics page's deploys count moves.
13. **A bad merge.** Minutes after a merge, an alert rises from the running software and names the commit. The factory files the fix card itself with the alert's facts. The fix merges, the alert settles.

### D. Operate

14. **Alert to fix.** A 500 alert on checkout, the card the factory filed carries the stack trace, the fix merges, the alert settles, the board shows the card done.
15. **A member's report.** A report arrives as an issue, the factory files a card from it, the fix merges, the card's drawer links the report.
16. **The security routine.** The nightly scan finds a vulnerable dependency, files the bump card, the bump merges before morning.
17. **The performance routine.** The weekly read finds a p95 regression and files a card with the numbers.
18. **The settled inbox.** The notifications page: what settled overnight, grouped, nothing to do.
19. **Routines on the board.** The routines panel: four routines, their next runs, one held, one skipped.

### E. The human at the gates

20. **The cap fires.** The calendar card hits its budget. The factory asks: fund one more session or end the card. Sebastian splits the card in the chat instead, and the agent files the two halves. (The budget question has no split answer of its own; the split is the human's move through the chat.)
21. **A design question.** The agent asks which calendar library, with three choices. Sebastian answers. The card continues.
22. **An approval.** A card touching payments waits for approval before merge. Sebastian reads the diff summary in the drawer and approves.
23. **The morning page.** The board at 07:00: three asks. Sebastian answers all three in two minutes. The cards move.
24. **The morning page on the phone.** The same on the phone viewport.
25. **Autonomy levels.** The project at manual, then at the autonomous level: the same card merges without the gate stop, the inbox carries the wake turn.

### F. Metrics

26. **The week in numbers.** The metrics page: deploys per week, lead time, cost per card, escalated share, tool spend.
27. **Before and after.** The metrics page two weeks apart: cost per card, card cycle, lead time and spend fall after the planning change. The escalated share rises, because week 2 holds the morning's three asks and the design question; the figures stay true to the cards the board showed.
28. **The costs page.** Spend by kind (model, tool, resource) and by card over fourteen days.

### G. Diagrams, animated in the browser

29. **The five-plane loop.** Signals, control plane, workers, verification, deploy, telemetry back to signals. A step reveal.
30. **The gate chain.** Chat, spec, plan, build, review, merge, deploy, telemetry.
31. **The escalation ladder.** From self-correction to the human.
32. **Identity belongs to the task.** A card gets its tokens, its namespace, its sandbox, and everything is gone at the end.

These are HTML pages with a CSS or JavaScript step reveal, recorded through the same recorder, so a redesign of a diagram regenerates its clip. The pages live in `demo/diagrams/`. My call: the builder styles them with the console's theme tokens from `design/themes/`, with no design round. They are not the console, and Sebastian can ask for a round on them later. Group G comes after groups A to F.

### H. Generated with the fal models

33. **The opening.** The loop as a visual sequence.
34. **The sandbox life cycle.** A namespace is born, credentials are minted, the pod works, everything is deleted.
35. **The wipe and re-seed.** The whole cluster deleted and rebuilt.
36. **Title and transitions.**

Per clip: a still per scene from the image models first, the critic judges, the chosen still is animated with an image-to-video model from `design/models.md`. Sidecar JSON per output as the design process demands. The models list `minimax/h3-max/image-to-video` as the default at $0.03 a second. Four clips of ten seconds plus stills and critiques come to about $5 to $10. Nothing in group H runs until Sebastian sets the cap.

## Acceptance

- `demo/run.sh` on a clean checkout of both repositories, with the lab's Node modules present, records every scene in groups A to F through the lab and every scene in group G through its diagram page, and leaves a video and a sidecar per scene in `demo/out/`.
- `demo/run.sh chat-to-card` records one scene.
- A second run gives the same sequence of states.
- The lab's existing scenarios and `scripts/console-lab/run.sh` still pass. `go test -race ./internal/console/` passes.
- No recording shows the factory's own project, a real project name, a provider key or a real credential.
- A scene whose state the console cannot render fails the run with the scene's name and the seed's or the console's complaint, not with a blank video.

## Left to the builder

- The JSON shape of a scene: the exported struct the lab decodes, its field names from the factoryd types' JSON tags, and what `labSeed` sets from the scene versus from its defaults.
- How the lab wakes the streams after a seed.
- The scripted gateway's reply format in JSON (text chunks and tool calls, as `chat_test.go`'s `say` and `call` build them).
- The cursor overlay and the typing speed.
- Which lab fields each scene needs. Read the existing scenes (`busyScene`, `fireScene`, `escalationScene`, `metricsScene`) for the shapes the console expects, in particular the timeline objects under `sessions/<task>/timeline.jsonl` and the session transcripts.
- The exact wording of every card, chat turn, alert and review in the fake project's two weeks. Keep it plausible and consistent across scenes: the same issue numbers, the same titles, the same figures.
