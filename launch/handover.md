# Launch: handover for the next session

Written 21 October 2026 at the end of the second launch session, the one that wrote the script, the issue scene, the page skeleton, the two procedural clips and group H. Read this, then [concept.md](concept.md), then [script.md](script.md), then [the demo handover](../demo/handover/README.md). The three sweeps under [research/](research/) are the evidence behind the concept.

## The prompt to paste

```
Continue the launch work for the AI software factory: one 90-second film and a landing page, for hiring readers and investors.

Read first, in this order: launch/handover.md, launch/concept.md, launch/script.md, demo/handover/README.md.

My answers, given 21 October and already carried by the page and the script:
- The spine: approved in shape. The hero line is mine, the combo in the active voice: "You run the factory from one chat. The kanban shows everything." The interlude over the layers diagram says the dev process is a YAML file, ours is spec-driven, bring your own; no phrase stands alone. The closing cards carry the three-layers framing: the factory works out of the box and runs anywhere, ours ships and yours plugs in. B2 adds "Some tests stay hidden until the end." Two points stay open, both fine as the script has them: the criteria's kinds (B2) and the two terminals (B12) off screen, and the calendar as the film's card.
- Narration: a generated voice. Draft the spoken lines from the spine's titles, generate the track under the cap, keep the titles on screen so the film still works muted. If I dislike the voice, I record my own and the track swaps without a recut.
- The fal cap: $20.
- The perimeter: model APIs are an expected commodity, like Hetzner holding your data when you run on Hetzner. Claim that the factory pulls you into no SaaS scheme and is as open as we could make it.
- The comparison table's six names stand; I verify the cells.
- The limits block is now "Tradeoffs we made": every line a choice with its reason, nothing else.
- Prompts as data is dropped; it is no killer feature. Advertise the spec-driven hold-out instead: the builders never see the hold-out tests, one blind run, then the gate opens them and the audit names the defective side.

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
- [site/index.html](site/index.html): the landing page skeleton, one static file, every section of concept section 6, the film slot empty, the clip and diagram slots captioned with their sources. The comparison table has the five names plus Factory, and the tradeoffs block sits under it.
- Scene 33, [demo/scenes/33-issue-to-fix.js](../demo/scenes/33-issue-to-fix.js), recorded: a developer's issue with a repro block becomes card #126 within a minute, the agent reproduces and fixes the fault, the reproduction gate passes with `base_exit` 1 and `exit` 0, the fix merges. The story gained card #126 and `state.reproduction`.
- Two procedural clips under [demo/video/](../demo/video/): the loop (30 s) and the three layers (24 s), rendered by `node demo/video/render.js <name>` with HyperFrames, each proven identical over two renders. The critic picked the loop over filmed scene 29: [demo/video/loop/judge/notes.md](../demo/video/loop/judge/notes.md).
- Group H under [demo/generated/](../demo/generated/): 21 stills, four contact sheets, four critiques, six takes, every output with its sidecar. [notes.md](../demo/generated/notes.md) has the picks and the cost, about $2.88 of the $10 cap.
- The results page, [demo/index.html](../demo/index.html), now with group P (procedural) and group H (generated) beside the bank.

## The decisions, as answered

Sebastian answered the eight on 21 October and sharpened them the same evening. A generated voice over the titles, so the film works muted and his own voice can replace the track without a recut. The fal cap is $20. The hero line carries his combo in the active voice: "You run the factory from one chat. The kanban shows everything." The interlude over the layers diagram says the dev process is a YAML file, ours is spec-driven, bring your own; he hates phrases standing alone. "Every euro held before it is spent" is gone, he could not read it. Model APIs are commodities to him, like Hetzner: the perimeter claim is that the factory pulls you into no SaaS scheme and is as open as we could make it. The six table names stand, he verifies the cells. The limits block became "Tradeoffs we made": every line a choice with its reason, nothing else. Prompts as data is dropped, no killer feature; the freed emphasis goes to the spec-driven hold-out, one blind run then the gate opens the tests and the audit names the defective side.

Two cards for Sebastian to file (intake is closed to agents), both optional:

- **A self-hosted model option behind the gateway.** The claim stands on the gateway's design; this card would make one self-hosted route configured and tested, which helps the compliance reader. Acceptance: a project can name a self-hosted route for its small class, and a session runs on it end to end.
- **The factory's guides move into the configuration tree.** The writing guide and the other guides are compiled into the binaries; the card would let a project override each. File it only if that control matters to him.

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
