# Handover: the landing page

Paste this as the first message of a new session. It carries everything; you need nothing from past sessions. Read it fully before acting.

## What you work on

One static page, `launch/site/index.html`, no build step, dark design already built. It sells the factory to two readers: an engineer who might run it (what does it do, can I run it) and a CTO or hiring reader (the sandbox, the gates, the proof). Sebastian is looking at the page right now to judge whether it crams too much in or needs better progressive disclosure. Your first job is to take his rulings and reshape the page: cut sections, collapse them behind folds, move them to the docs, reorder. He decides, you build.

## What exists, as of commit 72973ec on 21 October

- The page follows `launch/revision/concept.md` section 2 exactly, copy verbatim: hero, what the agent can reach (eight paragraphs), who it is for (one band), run it yourself, the loop with the film slot, under the hood (four module cards), three layers, the numbers, how it compares (eight guarantee rows, six competitor columns), tradeoffs, proof and limits, footer.
- Assets in `launch/site/assets/`: `hero.png` (copied from `demo/out/01-chat-to-card-4.png`, a guess at the proposal beat, unverified by eye), `loop.mp4` and `layers.mp4` (the rendered procedural clips from `demo/out/`).
- The demo bank: `demo/out/`, 34 console scenes, each with numbered png frames, webm, mp4 and a json sidecar holding the story and step timings. `demo/run.sh` regenerates the bank in 13 minutes.
- The revision concept: `launch/revision/concept.md`, third version, written with other AIs and Sebastian's evening review. Section 2 is the page copy, section 4 the comparison rows, section 5 the tradeoffs, section 6 what the page never claims, section 11 the phases and stop-ship rules, section 12 the open decisions.
- The older `launch/concept.md` disagrees with it (the twelve-block page). The page follows the REVISION. Which file becomes the source of truth is undecided; do not merge them without Sebastian's word.
- Docs the page links: `docs/architecture.md`, `docs/threat-model.md`, `docs/evidence.md` exist. `docs/deployment.md` does not exist yet.
- The film handover for the 90-second film lives in `launch/handover.md`. The film is the next stage after the page settles; its slot in the loop section plays `loop.mp4` until then.

## Known gaps, by design

- Comparison cells that say "not surveyed" or "not verified" wait for Sebastian to check them against the vendors' own pages before anything goes public.
- Docs links are relative (`../../docs/...`) and work in-repo; they break when the page moves to GitHub Pages and must be reworked then.
- The eyebrow says "Source available" while the licence file does not exist yet. Stop-ship rule: nothing public before the BSL 1.1 file is committed with its parameters.
- The hero frame and the overall layout are unverified by eye; no session so far could view rendered images.

## The rules that bind the page

From revision section 6 and section 11:

- Never "open source" about the factory. "Source available", and only once the licence file exists. The components (gVisor, Forgejo, SigNoz, opencode) may be called open source.
- No "compliant", "certified", "safe", "secure", no named regulation.
- No install time and no server price until an outside engineer has installed it and the numbers exist.
- No count older than the day the page goes public; the counts get recounted that day.
- Links only to paths that exist. No numbers from the demo project on the page.
- The word is roadmap, never "roadmap YAML": the intake is linked Markdown, the YAML is the process, and the two must not be conflated.
- Every generated image or clip keeps its sidecar JSON. No spend past the $20 fal cap without asking.

## How to work in this repo

- Terminal output of repo files is mangled by a renderer. Edit with unique substrings, or view exact lines with `awk 'NR>=X && NR<=Y {printf "L%d|%.250s\n", NR, $0}'`, or copy a file to `/tmp` and read it there. IDE spelling diagnostics are noise.
- In `launch/site/index.html` a heading and its body sit on single long lines with HTML between; edit small unique substrings, never assume newlines.
- Verify every change: `python3` html.parser parse, anchor and asset path check, and `google-chrome --headless=new --no-sandbox --screenshot=... --window-size=1440,960` for a render. You cannot view images (image reads upload to a CDN), so say plainly what is unverified by eye.
- Git: work in a worktree (`git -C ~/repos/ai-software-factory worktree add -b <branch> /tmp/claude-1000/wt-<name> master`), commit with the trailer `Co-Authored-By: Claude Code <noreply@anthropic.com>`, then `git fetch forgejo` first, because the factory's own document writer pushes to forgejo master and master can move under you, ff-merge to master, push both `origin` (GitHub) and `forgejo`, remove the worktree, delete the branch. Removing the worktree you stand in prints a getcwd error; it is harmless.
- Never commit `terraform.tfstate`. `launch/revision/` is Sebastian's untracked input; leave it unless he says commit it.
- Provider keys live in the gitignored `.env.tools`; never print one.

## Open, for Sebastian (ask with context, then act)

1. **Density.** He looks at the page and rules. Twelve stops stand today; the reach section with its eight paragraphs and the comparison table are the heaviest. Ask which sections go, which collapse behind a fold, which move to the docs.
2. **The hero frame.** Right beat? If not, he names the scene and step from `demo/out/`; copy the new frame into `launch/site/assets/`.
3. **The comparison table.** Revision section 12 point 5 leaves open whether it stays low on the page or moves to the docs.
4. **The source of truth.** `launch/concept.md` or `launch/revision/concept.md`. Until ruled, the revision wins for the page.
