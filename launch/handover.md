# Launch: handover for the next session

Written 21 October 2026 at the end of the session that wrote the concept. Read this, then [concept.md](concept.md), then [the demo handover](../demo/handover/README.md). The three sweeps under [research/](research/) are the evidence behind the concept. Read them when a claim needs its source.

## The prompt to paste

```
Continue the launch work for the AI software factory: one 90-second film and a landing page, for hiring readers and investors.

Read first, in this order: launch/handover.md, launch/concept.md, demo/handover/README.md. Read the sweeps under launch/research/ when you need a claim's source.

My answers to the eight decisions of concept.md section 10. Where I left one blank, take the default the concept names and say so in your report.
1. Narration:
2. The fal cap:
3. The three cards of the film's tail:
4. The hero line:
5. The perimeter claim:
6. The comparison table's names:
7. The "known limits" block:
8. Prompts as data:

Then do, in this order, each as its own round with a result I can look at (a page, frames, a video), not a narration of how you worked:
1. The script, launch/script.md, by the method of concept section 8: the story graph with named nodes, every beat with its entry and exit nodes, the fold pass, the spine with timings and transitions. One card creation on screen. Stop and show me the spine before recording anything.
2. The issue beat scene in demo/scenes/: an issue with a repro block filed on the scene's repository, the card within a minute, the reproduction gate red at base and green at head, the merge. Record it with demo/run.sh and add it to the results page.
3. The page skeleton, launch/site/index.html: static, no build step, the sections of concept section 6, an empty film slot.
4. The procedural trial: HyperFrames on demo/diagrams/loop.html, 30 seconds, rendered locally with a sidecar, judged against filmed scene 29. If it wins, the three layers diagram next.
5. Group H by demo/generated/PLAN.md, only once the cap is set.

Rules: work in a git worktree, commit to master, push to origin and forgejo, and fetch forgejo first because the factory's own document writer pushes there. Every generated image or clip gets its sidecar JSON. No spend past a cap without asking. Never print a key. terraform.tfstate never enters a commit.
```

## What exists

- [concept.md](concept.md): the two readers, tier 1 (twelve points with their bang, proof and material), tier 2 by layer with the market verdicts, what we do not claim, the hero drafts, the surfaces, the three video routes, the script method with the folded spine, the process, the eight decisions, the next steps.
- [research/docs-sweep.md](research/docs-sweep.md): 25 candidate points from the design documents, what is not built, five quotable sentences, where the docs say we are weak.
- [research/code-sweep.md](research/code-sweep.md): 30 built features with paths, the 64 chat tools, the nine stage kinds and the floor, the ladder and the autonomy levels as the code has them, identity and sandbox facts, the counts of 21 October, fourteen claims the code does not back, the re-seed sequence.
- [research/market-sweep.md](research/market-sweep.md): twelve differentiators with verdicts and counts from the 148-tool matrix, what to concede, the competitors' positioning lines, the five names for the comparison table with their cells, the steal lists, wording hazards.
- The scene bank: 33 scenes, the lab, the recorder, the results page. All in [the demo handover](../demo/handover/README.md), with its pitfalls and prerequisites.

## What Sebastian said this session

In order. His decisions are marked.

- The video is for a landing page with text and images, as a portfolio for hiring and a pitch for investors. People watch one video, so plan one main film. The landing page may later move to GitHub or stand alone.
- The bank's scenes show features one by one from the start. The film needs a script: the best moments condensed, one after the other, cuts only where needed, the coolest and most foundational first.
- His first list of points: three layers, process in configurable YAML (bring your own process and prompts), every task on the board but one chat, the AI escalates only when stuck or out of money, no stalling sessions, the sandbox instead of guardrail snake oil, at full auto the human still holds spending and the roadmap.
- Value first, then difference: show why the factory is good, then how it beats the competition. **Decision.**
- Try both video routes, model-generated and procedural from code. **Decision.**
- Build a landing page in tandem with the concept. **Decision.**
- "Did you just copy my ideas?" He wanted the docs, the code and the market research mined for the strongest points, not his list organised. The three sweeps followed.
- His most important point was missing: total transparency through the board, the chat as the only tool to steer, no writing of individual cards. It is now tier 1 point 1. **Decision.**
- Point 5 must show an issue landing on Forgejo and the process starting: agents fix clear, reproducible errors on their own. **Decision.**
- The three layers are a point of their own and the frame of the difference: the factory (sandboxes, workflows), the process (all YAML, bring your own), the prompts (the writing guide, changeable), and the harness swaps on top. **Decision.** The code narrows two words: the factory's guides are compiled in, and the harness is one adapter. Both in concept section 4.
- "I like the direction." Then: fold the film's segments so one process is shown once and the film keeps going along the flow, rewinds to branch, no dead time, no repetition. The script method in concept section 8 is the answer. **Decision: the film follows one card's life.**

## Open

- The eight decisions of concept section 10. None answered yet.
- The three factory cards in [factory-bugs.md](../demo/handover/factory-bugs.md), plus a card for a self-hosted model option (decision 5) and a card that moves the factory's guides into the config tree (decision 8). Sebastian files them. Intake is closed to agents.
- The pitch, [docs/pitch.md](../docs/pitch.md), carries four lines to change before anyone reads it again: the perimeter claim, "the only way", the stale counts, Conductor. Concept section 4 has the replacements. Sebastian's text, so he changes it or says go.
- No secret scan of the three repositories' histories yet.

## Pitfalls of this repository and this work

- The remotes here are `origin` (GitHub) and `forgejo`. The sibling repositories name them the other way round. A push to a remote named `github` fails here.
- The factory's own document writer commits to Forgejo's master as `factory-docs` (a one-line roadmap change landed during this session). Fetch forgejo before pushing. A merge commit keeps both remotes fast-forward.
- Claude Code's worktree hook refuses compound shell commands that mention git inside a worktree. Run git with `-C <path>` from the main checkout, or split the commands. Use the Write tool for long files.
- The IDE's spell checker flags every proper noun in a written file. Ignore it.
- The lab, the recorder, Node, Playwright and ffmpeg: see the demo handover's pitfalls. A reboot wipes Playwright under `/tmp`.
- `terraform.tfstate` sits untracked in this repository's root. Never add it.
