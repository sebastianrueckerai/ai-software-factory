# Launch: handover for the next session

Written 21 October 2026 at the end of the second launch session, the one that wrote the script, the issue scene, the page skeleton, the two procedural clips and group H. Read this, then [concept.md](concept.md), then [script.md](script.md), then [the demo handover](../demo/handover/README.md). The three sweeps under [research/](research/) are the evidence behind the concept.

## The prompt to paste

```
Continue the launch work for the AI software factory: one 90-second film and a landing page, for hiring readers and investors.

Read first, in this order: launch/handover.md, launch/concept.md, launch/script.md, demo/handover/README.md.

My answer on the spine of script.md section 4 (approve, or name the beats to change):

The spine runs one card's life in 90 seconds: the calendar card born in the chat, its four planned children, the sandbox, the pull request, the rejected review, a steer while the agent runs, the green gates, the stall handling, the cost stop, merge and deploy, the alert and issue cards nobody typed, the reproduction gate red then green, full auto's three asks, the three layers, the week before and after, three title cards, the GitHub link. Three points await a word:
- The hero line over the opening beat B0 is draft 1: "One board shows everything. One chat steers it. Agents do the rest in sandboxes on your own servers." Drafts 2 and 3 sit in concept section 5. Pick one or write one.
- Beats B2 and B12 claim less than the concept's bangs: the criteria's kinds and the two terminals are not on screen. Both can become procedural overlays, half a day each. Say if either must.
- The film's card is the calendar, #105, with the week view, #110, as its child. Another card changes the nodes after `landed`, not the beats.

My answers to the eight decisions of concept.md section 10. All eight stand at the defaults the last session took; name any to change, a blank keeps it:
1. Narration: titles on screen, so the film works muted where GitHub and LinkedIn autoplay without sound. A voice track joins later without a recut. The other choices are a generated voice or Sebastian's own.
2. The fal cap: $10 for the generated clips. Group H spent about $2.88 of it.
3. The film's three closing cards, seconds 80 to 87: the three layers. Your servers: rebuilt from Git, every euro held before it is spent. Your process: a YAML file, proofs named first. Your prompts: files you change.
4. The hero line: draft 1 (the spine above). This decision names no default, so say the word if another line goes there.
5. The perimeter claim in docs/pitch.md: the pitch sells code that never leaves the perimeter, and today every session sends diffs to hosted model APIs. Default: reword to "the model is your choice behind the gateway" and file the card that puts one self-hosted model behind the gateway, so the claim becomes true. The other way: keep the pitch and accept that a compliance reader catches it.
6. The comparison table's names: GitHub Copilot cloud agent, Cursor cloud agents, Devin, GitLab Duo, OpenHands, Factory sixth. Default: yes.
7. A known limits block on the page: five lines of concessions under the comparison table. A hiring reader reads it as judgement, an investor may read it as weakness. Default: yes.
8. Prompts as data: the writing guide and the other guides are compiled into the binaries, so "bring your own prompts" is worded precisely today. Default: keep the wording and file the card that moves the guides into the config tree beside the process files.

Then do, in this order, each as its own round with a result I can look at:
1. The spine scene and the two branch scenes of script.md section 6, recorded with demo/run.sh and on the results page.
2. The cut list launch/cut.json and the film launch/film.mp4 from one command, with the titles of the script as procedural overlays. Show me the film.
3. The page's film slot filled, the twelve clip slots cut from the spine, the diagram slots from the procedural clips' frames.
4. The public steps of concept section 9 phase 5: the secret scan of the three histories, the README, the pitch's four lines, the counts recounted.

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

## The decisions, as taken

Sebastian left all eight blank, so the session took the concept's defaults: titles on screen, the $10 cap, the three layers as the tail's cards, the perimeter claim reworded, the five names plus Factory, the known limits block, prompts worded precisely. Decision 4 names no default, so draft 1 of concept section 5 is the hero line on the page and in beat B0. Any of them can still change; the page and the script carry them.

Two cards the defaults call for, for Sebastian to file (intake is closed to agents):

- **A self-hosted model option behind the gateway.** Decision 5: the pitch sells code that stays inside the perimeter, and today every session sends diffs to hosted model APIs. One self-hosted model configured as a gateway route makes "the model is your choice" true. Acceptance: a project can name a self-hosted route for its small class, and a session runs on it end to end.
- **The factory's guides move into the configuration tree.** Decision 8: the writing guide and the other guides are compiled into the binaries, so "bring your own prompts" needs a footnote. Acceptance: the guides live beside the process files, a project may override each, and the binaries read them from there.

## Open

- The spine. Nothing of it records before Sebastian approves [script.md](script.md) section 4. Two beats claim less than the concept's bangs, said under the beats table: the criteria's kinds (B2) and the two terminals (B12) are procedural overlays if he wants them.
- The pitch, [docs/pitch.md](../docs/pitch.md), still carries the four lines concept section 4 names. The page applies the replacements; the pitch is Sebastian's text.
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
