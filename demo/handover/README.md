# Demo scene bank: handover for the next session

Update of 22 October: the fake project is now a browser game, Nebula Run, not Studio Nord's booking app (commit c03c2e8). The scene descriptions below still name the old fiction. The recorder writes element boxes per step for the film's overlays; see [launch/film/notes.md](../../launch/film/notes.md).

Written 21 October 2026 at the end of the session that designed and built the bank. Read this first, then the files beside it:

- [requirements.md](requirements.md): what Sebastian asked for, in his words, and the decisions he took.
- [rulings.md](rulings.md): the decisions I took on his behalf, each with what it costs to reverse.
- [factory-bugs.md](factory-bugs.md): three defects of the factory found on the way, as card texts to file.
- [research-procedural-video.md](research-procedural-video.md): the research on making 2D explainer clips from code.

The design document is [docs/superpowers/specs/2026-10-20-demo-scenes-design.md](../../docs/superpowers/specs/2026-10-20-demo-scenes-design.md), the plan [docs/superpowers/plans/2026-10-20-demo-scenes.md](../../docs/superpowers/plans/2026-10-20-demo-scenes.md). The execution ledger with every review and fix round is `.superpowers/sdd/2026-10-20-demo-scenes/progress.md` in the main checkout (gitignored, about 140 lines; the task reports and review packages sit beside it).

## The purpose

The factory becomes a portfolio project and an accelerator pitch. The thing to show is the process, not the apps it builds: a card travels from a chat message to a spec, a plan, a sandbox, a pull request, a review, a merge, a deploy and a telemetry fix, with the human only at the gates. Sebastian wants short video scenes of that, recorded wide now and cut later into the videos a landing page and a pitch need, regenerable by one command when the console changes, over a fake project whose data tells exactly the stories the scenes need.

## What exists now

### The results page

[demo/index.html](../index.html), built by [demo/build-index.js](../build-index.js), rebuilt at the end of every `demo/run.sh`. It lists every scene in its catalogue group with its video playing in place, its story line, viewport, duration and a strip of its step frames, then the planned generated clips and the regeneration commands. Open it from the main checkout: the videos live in `demo/out/`, which git ignores, so a fresh clone shows the page without media until `demo/run.sh` has run.

### The recorded bank

38 scenes in `demo/out/` of the main checkout (`/home/womb/repos/ai-software-factory/demo/out`): per scene an mp4 cut to the script's span, the raw webm, a sidecar JSON (`name, title, story, group, theme, viewport, consoleCommit, designCommit, recordedAt, durationMs, videoMs, steps[].atMs`, and where a scene names them `steps[].acts`, the end of each action, `steps[].stillMs` and `steps[].boxes`, the page boxes of named elements at the still) and one PNG per step. The recorder draws an arrow pointer with a ripple on each click; `cursor: false` in a scene hides it. All 38 were recorded again on 22 October 2026 on the console at commit 549cbaee, 15.4 minutes in all, no scene failed. Scene 22 needs the local Forgejo running; scene 38 takes its weekly slot from the recording's clock, so the weekday and hour in its chat change from one recording to the next.

Beside the bank, procedural clips rendered from HTML under `demo/video/` (`p-loop`, `p-layers`, the sandbox variants `p-sandbox-a`, `-c`, `-d`, and the cuts built by `demo/video/film.js` from the bank: the film `p-film-a` and the landing page's clips `p-clip-*`, each with a sidecar in `demo/out/`) and the generated clips of group H under `demo/generated/` (committed, with their sidecars). The results page shows all three.

### The scenes

Catalogue groups and files in [demo/scenes/](../scenes/):

| Group | Scenes | What they show |
|---|---|---|
| A Intake | 01 chat to card, 02 a vague request measured, 03 too large so split, 04 a card from the board form, 05 chat to card on the phone, 34 a busy board (the landing page's hero, and the film's opening: the split, the drain to Done, intake, one sentence to a plan) | The chat's ask, choice buttons, the `new_card` proposal, Do it pressed for real, the card on the board |
| B Build | 06 card to PR, 07 the review rejects, 08 the supervisor steps in, 09 two in parallel, 10 the stronger model, 11 a steer, 36 find the card and tell it (a request that names no card) | The drawer's gates table, session transcripts, review verdicts, the `small` to `big` class change, a steer pressed for real |
| C Ship | 12 merge to done, 13 a bad merge | Merge and live in the Activity steps, the metrics deploys count moving, an alert minutes after a merge |
| D Operate | 14 alert to fix, 15 a member's report, 16 the security routine, 17 the performance routine, 18 the settled inbox, 19 routines on the board, 33 an issue to a fix, 38 a weekly image bump set up from the chat | The alert's stack trace on the card, routine runs on their cron, the inbox's night, a developer's issue with a repro block and the reproduction gate's base and head exits |
| E The human at the gates | 20 the cap fires, 21 a design question, 22 an approval (opens the pull request in a local Forgejo: run `demo/forgejo/setup.sh` first), 23 the morning page, 24 the morning page on the phone, 25 autonomy levels, 37 the pool funds a small overrun | Fund or end, a split by chat, three asks answered, Approve pressed, manual against full auto with the wake turn |
| F Metrics | 26 the week in numbers, 27 before and after, 28 the costs page | Figures derived from the same card ledger as the boards |
| G Diagrams | 29 the five planes, 30 the gate chain, 31 the escalation ladder, 32 identity belongs to the task | HTML pages in [demo/diagrams/](../diagrams/) with a keyboard-driven reveal, filmed by the same recorder |
| Smoke | smoke | One card running, then done |

Every scene file exports `{ title, story, group, theme, viewport, steps }` (and `page` for a diagram). A step is a function of the wall clock returning the full lab state, plus browser actions and a hold. `demo/lib/story.js` holds the fake project's two weeks: every card's title, body, size, life (ages by state), spend, the routines, the alerts, the asks, the chat texts, and the figures derived from them. `demo/lib/state.js` builds the lab's JSON shapes (cards, timelines, transcripts, events, alerts, approvals, chat rows, proposals, routines, metrics, costs). `demo/lib/ui.js` holds the console selectors. `demo/lib/project.js` is Studio Nord.

### The recorder

[demo/run.sh](../run.sh) starts the console lab from the code repository (`CODE_REPO`, default `/home/womb/repos/ai-software-factory-code`, `go test -run ^TestLab$` with `CONSOLE_LAB=1`), waits for its cookie, runs [demo/record.js](../record.js) over every scene or the named ones, converts each webm to an mp4 cut to `durationMs`, rebuilds the index, stops the lab. `record.js` posts each step's state to `POST /lab/scene`, waits for the board's redraw, runs the actions (goto, click, type, press, hover, wait, waitFor, scroll, seed), holds, takes the step's PNG, and records the context's video. A scene fails loudly on a refused seed, a page error, a lab response of 400 or more, or the chat's error row (an unscripted turn); a failed scene leaves no output and the run exits 1 after the other scenes ran. Tests: `node --test demo/test/*.test.js` (82 tests, hand-derived values).

### The lab (code repository)

`internal/console/lab_test.go` and `lab_scene_test.go` on `main` (last lab commit 610f13a4). The lab serves the real console over the test rig's in-memory fakes. What the demo added, all test files: a scene-chosen project, repository and login with its own project rows, config, cap and pull request files; `POST /lab/scene` with a JSON scene and a `check` that refuses bad statuses, gates, lanes, future times, dangling references, missing timeline objects and bad cost dates; a scripted chat gateway (`chatGateway` in lenient mode: `Say` and `Call` chunks, tool calls keep their index across chunks; no reply left answers 500); a one-second heartbeat; issue creation on the scene's repository (Do it and File work for real, numbered on from the scene's highest issue); live chat rows stamped with the real clock; a wake on seed so an empty board redraws; a scene-carried `policy.Costs` ledger. The twelve existing Go scenes are unchanged. The structural check `scripts/console-lab/run.sh` is green again.

## What was not done

- **Group H ran on 21 October** under the concept's default cap of $10: 21 stills, one take per clip, about $2.88 by the price list. [demo/generated/notes.md](../generated/notes.md) has the picks and the critic's rankings, [PLAN.md](../generated/PLAN.md) the prompts and prices. No second takes yet.
- **The procedural route works.** HyperFrames 0.8.183 rendered the loop (30 s) and the three layers (24 s) from `demo/video/<name>/index.html` with `node demo/video/render.js <name>`, each twice with identical frames. The critic picked the loop over filmed scene 29: [demo/video/loop/judge/notes.md](../video/loop/judge/notes.md). The gate chain, the ladder and the identity diagrams are still filmed only.
- **No cut yet, and the landing page is a skeleton.** The script is [launch/script.md](../../launch/script.md); its spine waits for Sebastian. The page is `launch/site/index.html` with an empty film slot. No public README.
- **No secret scan of the three repositories' history** before going public. The infra repository has 1,500 commits of cluster configuration; `terraform.tfstate` sits untracked in this repository's root and must never be committed.
- **The three factory defects are not fixed**; see [factory-bugs.md](factory-bugs.md).
- **Not verified by me**: the 33 videos were not watched end to end, only their step frames; the lab's screenshot check last ran green at 3545dc68 and the two later lab commits touched only the seed and a test.

## Known limits of the recordings

- Times on screen are the recording's clock. Routine scenes 16, 17 and 19 show the routines' next runs and dates relative to the recording day, so they differ by day and hour. The inbox's night anchors at the last 02:00 before the recording.
- Absolute timestamps in chat rows and the drawer feed jump by a few seconds between seeded steps (each seed recomputes "now minus age"). Nobody reads them.
- The console shows the newest checks ("3/4 checks") on a card with a pull request even while a second session builds. Real behaviour, kept.
- Plan children show their plan key as the board title ("week-view"). Real behaviour until the third factory defect is fixed.
- Scene 1 and 5 keep one reload: a streamed ask shows its answer buttons only when the thread is read again.
- The drawer scenes leave the chat panel at "New thread"; a seeded thread would fill the left third. Cosmetic, not done.
- Scene 28's costs page lists task rows by task id and its task rows sum to €17.75 against the days' €18.77 (the chat spend has no task row). No total shows, so it does not read as a contradiction.
- Scene 20 does not offer "split": the factory's budget question offers fund or end; the human splits in the chat.

## Pitfalls for the next session

- **The lab's port and directory are shared.** Other worktrees' labs use `/tmp/claude-1000/console-lab` and port 8090. The demo uses `CONSOLE_LAB_DIR=/tmp/claude-1000/console-lab-demo` and `CONSOLE_LAB_ADDR=127.0.0.1:8147` by default; a second concurrent run needs `8148` and `console-lab-demo2`. The lab ends itself after 30 minutes; a full bank takes about 13.
- **Node's test runner needs the glob**: `node --test demo/test/*.test.js`, not the directory.
- **A board task's JSON is flat**: `BoardTask` embeds `Task`, so `ID`, `Status`, `Escalation` sit at one level. Types with JSON tags (`ChatMessage`, `ChatProposal`, `PlanRevision`, `MetricsReport`, `Costs`) use the tag names; the rest use Go field names.
- **Every state is full**, never a delta; `labSeed` replaces everything. A chat step scripts the reply in that step's `Replies`, and the next step's state carries both rows so the thread survives the redraw.
- **The console's rules decide what renders.** Before inventing a shape, read the lab's Go scenes (`busyScene`, `fireScene`, `escalationScene`, `wakeScene`, `metricsScene`, `addRoutines`) and `check` in `lab_scene_test.go`.
- **Claude Code's worktree hook refuses compound shell commands that mention git** inside a worktree. Split commands; use the Write tool for long files.
- **Session rate limits** stopped two subagents overnight; resumed by message after the reset. The ledger is the recovery map after a compaction.
- **Subagent commits may carry their own model's attribution line**; this session's rule is the Fable 5.1 line, amended where needed.
- **Prerequisites on this machine**: Node 22, Playwright 1.64 at `/tmp/claude-1000/pw/node_modules` (a reboot wipes `/tmp`), Chromium under `~/.cache/ms-playwright`, ffmpeg 4.4 with ffprobe, Go 1.25 toolchain.

## How to continue

In this order, each its own round:

1. **Group H is done** for one take each. A second take of a clip, if the cut wants one: the same `tools/img.py gen` call with the clip's `--ref` and `--label "take 2"`, about $0.30 for a 10-second take.
2. **The procedural route is proven on two diagrams.** The gate chain, the ladder and the identity diagrams can follow the loop's pattern under `demo/video/<name>/` when the cut needs them.
3. **File the three factory cards** from [factory-bugs.md](factory-bugs.md) (Sebastian files; intake is closed to agents). After they merge, regenerate scenes 08 and 25.
4. **The cut.** Pick scenes for one 90-second film and a few 20-second clips. The sidecars' `steps[].atMs` mark where each step starts in the video. Narration and titles are not in the bank; the procedural route can carry titles.
5. **The landing page and the public repository.** Secret scan first (`gitleaks` or `trufflehog` over all three histories). Then the one-page site: a sentence and the film, the loop diagram, a replay of a real card from the factory's own `sessions/<task>/timeline.jsonl`, a nightly static snapshot of the factory's own metrics page, four design decisions, the hall of five real PRs, three console screenshots, the pitch from `docs/pitch.md`.
6. **Keep the bank fresh.** After any console change, `demo/run.sh` regenerates everything in about 13 minutes; the page rebuilds with it.

## Budget expectations

| Item | Expected | Cap proposed |
|---|---|---|
| Four fal clips, one take each | $2.50 | $10 |
| With a second take of every clip | $4.50 | $10 |
| Procedural clips | no API spend | none |
| Three factory fix cards | €2 to €6 | the project's month cap |
| Regenerating the bank | no API spend, about 13 minutes | none |

## How the work was run

Brainstorm, a written design with a builder check, a plan of 14 tasks, then subagent-driven development: one implementer per task, a task review, scoped re-reviews per fix round, a whole-branch review at the end by the most capable model, one fix wave. 28 commits on this repository's `master`, 10 lab commits on the code repository's `main`, all pushed to GitHub and Forgejo. Sonnet did the mechanical tasks, Opus wrote the scenes, Haiku and Sonnet reviewed. What a reviewer could not see in a diff was checked in the frames.
