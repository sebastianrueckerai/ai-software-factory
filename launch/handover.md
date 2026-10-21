# Launch: handover for the next session

Written 21 October 2026 at the end of the second launch session, the one that wrote the script, the issue scene, the page skeleton, the two procedural clips and group H. Read this, then [concept.md](concept.md), then [script.md](script.md), then [the demo handover](../demo/handover/README.md). The three sweeps under [research/](research/) are the evidence behind the concept.

## The prompt to paste

```
Continue the launch work for the AI software factory: one 90-second film and a landing page, for hiring readers and investors.

Read first, in this order: launch/handover.md, launch/concept.md, launch/script.md, demo/handover/README.md.

My answers, given 21 October and already carried by the page and the script:
- The spine: approved in shape. The hero line is mine: "You control everything via chat." The closing cards carry my three-layers framing: the factory works out of the box and runs anywhere, everything is a YAML file, ours ships and yours plugs in. Two points stay open, both fine as the script has them: the criteria's kinds (B2) and the two terminals (B12) off screen, and the calendar as the film's card.
- Narration: a generated voice. Draft the spoken lines from the spine's titles, generate the track under the cap, keep the titles on screen so the film still works muted. If I dislike the voice, I record my own and the track swaps without a recut.
- The fal cap: $20.
- The perimeter: claim only that the factory is easy to self-host, that nothing runs on someone else's computer unless I want it to, that model APIs and self-hosted LLMs sit behind the gateway, and that we do not push this as SaaS.
- The comparison table's six names stand; I verify the cells.
- The known limits block stays, its five lines.
- Prompts as data is dropped as a point. The page claims the project's AGENTS.md as the prompts you change.

Then do, in this order, each as its own round with a result I can look at:
1. The spine scene and the two branch scenes of script.md section 6, recorded with demo/run.sh and on the results page.
2. The cut list launch/cut.json and the film launch/film.mp4 from one command, with the titles of the script as procedural overlays and the generated voice track under them. Show me the film.
3. The page's film slot filled, the twelve clip slots cut from the spine, the diagram slots from the procedural clips' frames.
4. The public steps of concept section 9 phase 5: the secret scan of the three histories, the README, the pitch's remaining lines, the counts recounted.

Rules: work in a git worktree, commit to master, push to origin and forgejo, and fetch forgejo first because the factory's own document writer pushes there. Every generated image or clip gets its sidecar JSON. No spend past a cap without asking. Never print a key. terraform.tfstate never enters a commit.
```

## What exists

- [concept.md](concept.md): the readers, the two tiers, what we do not claim, the hero drafts, the surfaces with their state, the three routes with their state, the script method, the process, the eight decisions.
- [script.md](script.md): the story graph with 19 named nodes, 18 beats with entry and exit nodes, the fold pass, the 90-second spine with timings and transitions, the six 20-second clips as sub-paths, what the recording needs. The film's card is the calendar, #105, and its child the week view, #110.
- [site/index.html](site/index.html): the landing page skeleton, one static file, every section of concept section 6, the film slot empty, the clip and diagram slots captioned with their sources. The comparison table has the five names plus Factory, and the known limits block sits under it.
- Scene 33, [demo/scenes/33-issue-to-fix.js](../demo/scenes/33-issue-to-fix.js), recorded: a developer's issue with a repro block becomes card #126 within a minute, the agent reproduces and fixes the fault, the reproduction gate passes with `base_exit` 1 and `exit` 0, the fix merges. The story gained card #126 and `state.reproduction`.
- Two procedural clips under [demo/video/](../demo/video/): the loop (30 s) and the three layers (24 s), rendered by `node demo/video/render.js <name>` with HyperFrames, each proven identical over two renders. The critic picked the loop over filmed scene 29: [demo/video/loop/judge/notes.md](../demo/video/loop/judge/notes.md).
- Group H under [demo/generated/](../demo/generated/): 21 stills, four contact sheets, four critiques, six takes, every output with its sidecar. [notes.md](../demo/generated/notes.md) has the picks and the cost, about $2.88 of the $10 cap.
- The results page, [demo/index.html](../demo/index.html), now with group P (procedural) and group H (generated) beside the bank.

## The decisions, as answered

Sebastian answered the eight on 21 October. A generated voice over the titles, so the film works muted and his own voice can replace the track without a recut. The fal cap is $20. The closing cards carry his three-layers framing: the factory is the base layer, it works out of the box and runs anywhere, everything is a YAML file, ours ships and yours plugs in; "every euro held before it is spent" is gone, he could not read it. The hero line is his: "You control everything via chat." The perimeter claim is replaced by the self-hosting claim: easy to self-host, nothing on someone else's computer unless he wants it, model APIs and self-hosted LLMs behind the gateway, not SaaS. The six table names stand, he verifies the cells. The known limits block stays. Prompts as data is dropped as a point: the page claims the project's AGENTS.md as the prompts you change.

Two cards for Sebastian to file (intake is closed to agents):

- **A self-hosted model option behind the gateway.** The new claim says self-hosted LLMs work behind the gateway, and today every session routes to hosted model APIs. An operator can add a LiteLLM route by hand, but no self-hosted route is configured or tested. The card makes the claim factory-tested. Acceptance: a project can name a self-hosted route for its small class, and a session runs on it end to end.
- **The factory's guides move into the configuration tree.** Optional now that the prompts point is dropped. The writing guide and the other guides are compiled into the binaries; the card would let a project override each. File it only if that control matters to him.

## Open

- The spine stands approved in shape. Two points stay open, both fine as the script has them: the criteria's kinds (B2) and the two terminals (B12) off screen, and the calendar as the film's card.
- The spoken lines of the voice track are not written; the next session drafts them from the spine's titles.
- The pitch, [docs/pitch.md](../docs/pitch.md), carries the self-hosting claim now; its other guarded lines ("the only way", the stale counts, Conductor) wait for phase 5. The pitch is Sebastian's text.
- The secret scan of the three repositories' histories has not run.
- The three factory cards of [factory-bugs.md](../demo/handover/factory-bugs.md) are not filed.

## Pitfalls of this repository and this work

- The remotes here are `origin` (GitHub) and `forgejo`. The sibling repositories name them the other way round.
- The factory's own document writer commits to Forgejo's master as `factory-docs`. Fetch forgejo before pushing.
- Claude Code's worktree hook refuses shell variables, heredocs, loops and compound commands inside a worktree, and writes outside it. Plain commands with literal paths chained with `&&` pass. Use the Write tool for files.
- A recording fails while a HyperFrames render runs beside it: the render's four Chrome workers starve the recorder, and Playwright reports an element "not stable" or "not attached". Record alone.
- A click on the drawer's open tab reloads the drawer, and the next action lands on a replaced element. A queued or done card opens on Overview, a running card on Session: click a tab only to change it.
- fal's `flux-3` has `aspect_ratio`, `resolution` and `output_format` and no field for the number of images or a seed. `recraft` flash has `image_size` only. One call makes one image. `tools/img.py gen` now uploads the still and uses fal's queue for the video models.
- HyperFrames pins its version in `render.js`. Its lint warns about Studio's editing model and tween boundaries; neither matters for a render.
- The IDE's spell checker flags every proper noun. Ignore it.
- `terraform.tfstate` sits untracked in this repository's root. Never add it.
