# Handover: the landing page

Paste this as the first message of a new session. It carries everything; you need nothing from past sessions. Read it fully before acting.

## What you work on

One static page, `launch/site/index.html`, no build step, dark design, no JavaScript. It sells the factory to two readers: an engineer who might run it (what does it do, can I run it) and a CTO or hiring reader (the sandbox, the gates, the proof). Sebastian's ruling of 21 October: the page must make its points in text and images early, with no walls of text and no dense summaries. Depth goes behind a fold or a link. The film is a later concern.

## What exists, as of the commit after 83e3714 on 21 October

The page is built for progressive disclosure. Nine stops, each one point:

1. **Hero.** The eyebrow names the product ("AI software factory · Self-hosted · Source available"). The line takes the sandbox route: "The worst an agent can do is wreck its own sandbox." A three-sentence subhead, two buttons (`How it works` to the loop, `Source and setup` to the repository), then the annotated console frame and the one-line positioning band. The frame carries the kanban and chat points, so the line no longer has to.
2. **The loop.** Title "One card's life. The amber steps are yours." and one line: "Everything else runs on its own." An inline SVG: nine stops from roadmap to telemetry and back to cards. Amber marks where the human appears: confirm the spec, fund or end at a cap, and "manual: you approve · full auto: it merges" under Merge. A dashed wall around the sandbox. The three panels that repeated the diagram are gone.
3. **What you get.** Six cards, each a clip, a bold line, one or two sentences and a link to the evidence page or the spec-driven doc. Since 22 October they sit in a grid of three columns, two below 960 px and one below 640 px. No clip plays on its own any more: each shows its still with a Play badge. A click or Enter makes the card take the whole width of its row and plays the clip once with controls. The other cards flow around it, animated by a view transition where the browser has one and the reader allows motion. The close button, Escape or another clip shrinks it. The stall clip in its fold and the hero film also start on a click on the video.
4. **What the agent can reach.** An inline SVG: the pod in the middle, four blocked targets on the left with crossed wires, three reachable hosts on the right, the push after the agent at the bottom. Four fact lines and an amber box for the risk that stays.
5. **Run it.** Three sentences, the three layers as an inline SVG, the button.
6. **The parts.** Added 22 October. Title "Open source parts. Our code only where none fit." A two-sentence lede, then an inline SVG system diagram. The four parts written in Go have a cyan outline and a `Go` tag: the console, factoryd, agent-worker and factory-gateway. Fourteen open source parts carry their licence: Forgejo, SigNoz, OpenBao, Temporal, PostgreSQL, LiteLLM, opencode, gVisor, Kubernetes, Talos Linux, Cilium, Flux, OpenTofu and cert-manager. The config files are `.file` boxes. The harness slot shows opencode as the default and a dashed "your harness, one more adapter". The facts come from the code and infra repositories as of 22 October. Licences come from each project's own LICENSE file. If a part is added or swapped, change the diagram.
7. **Under the hood.** One lede sentence, then six `<details>` folds, closed by default: the sandbox, the gates, the money, recovery (with the supervisor frame), the numbers, three more facts.
8. **How it compares.** One lede, the table behind a fold, the tradeoffs box visible. Each cell opens with its verdict in bold after a square mark: full cyan for Yes, half cyan for Partial, a grey outline for No and No gate, a dashed outline for Not documented (`<b class="v yes|part|no|nd">`).
9. **Proof and limits.** The four links and the open limits in one line. The counts are gone: the page links the repository instead.

A footer links the imprint and the privacy notice, both in `legal.html`, on every page. Sebastian's ruling of 23 October: the imprint lists his name and e-mail only, no postal address and no phone. The privacy notice rests on the site setting no cookies and loading nothing from other servers. If the page ever loads a font, a script or a video from another host, or moves off GitHub Pages, change the notice.

Visible words per section stay between 33 and 201. The old eight-paragraph reach section, the module cards, the numbers section and the table are the folds and the diagrams now.

Since 22 October the demo project is a browser game, Nebula Run, and every frame on the page comes from the game bank. Scene 34 records 29 steps: the third is the hero still, typed without a click so no pointer shows, and the steps after it are the film's opening: the click that answers #120's design question, the drain, intake and the ice moon's plan. The hero frame is `34-busy-board-3.png`, from scene 34 of the bank, written for the hero: one afternoon with every column full (three cards in Needs you: a question, a budget stop, a payments merge; three queued; five in progress; seven done) and the chat holding the agent's proposal to steer the refund's session. Over it sits one inline SVG: three callouts in a band above the frame, each with a bracket over the region it names ("Change anything from one chat" over the chat, "See what is stuck" over Needs you, "Decide what runs next" over Queued) and a box around its Do it button. The brackets come from the console's own element boxes, which the recorder now writes into scene 34's sidecar (`steps[2].boxes`). If the console's layout changes, re-record scene 34 and regenerate the hero SVG from that sidecar. Since 22 October the frame is the film's poster: the SVG holds only the callouts and lies over the `<video>`, which clicks reach through it. A second after the film starts, the callouts fade out, and when it ends they return with the play button. The film opens inset in black bars, not on the full frame, so the brackets miss their regions for that second until the film opens on the full hero frame. Below 640 px the SVG hides and the video with a numbered list shows.

Since 22 October the cards of What you get play silent clips: each `<video class="loop">` loads `assets/clips/<name>.mp4` only when it scrolls into view, starts muted, loops, pauses on a click and keeps a still as its poster. Under `prefers-reduced-motion` the clips do not start. The hero carries a play button that swaps the frame for `assets/film.mp4`. The video files are copies of `demo/out/p-clip-*.mp4` and `p-film-a.mp4` at 1280 px, and git ignores them until Sebastian approves a cut; without them the page shows its stills. The recipe is in `launch/film/notes.md`. Since 23 October the six cards are: The chat orchestrates development, A plan is a card you accept, Stuck sessions get help in steps, Control spending intelligently, Routines run themselves, and Going full auto. The stall clip sits in its fold. Four of them and the stall clip open with an animated diagram of the theory, and every such card shows its diagram's last full frame as its poster (`assets/diagram-*.png`), so a clip that does not play still shows the diagram. The chat card's poster is a static diagram, `assets/poster-chat.png` from `demo/video/poster-chat`: you, the project agent, the board and the roadmap it reads, and its steering arrow into the running cards in In progress. Its clip opens on the console, not on that diagram. The routines clip is one console scene. Its poster is an enlarged crop of the scene's last step, its dashed card in Queued and its run in Done (`assets/poster-routine.png`), cut from scene 38 recorded with `POSTER=1` right after the bank's recording, so both read the same weekly slot. The recipe is in `launch/film/notes.md`. Every clip plays inside black bars and ends on its moral. The dial card no longer says migrations stay human at every level: the code lets the project agent approve a merge at full auto.

Assets in `launch/site/assets/`: the hero frame, two posters (`poster-chat`, a static diagram, and `poster-routine`, a console crop), and five diagram frames (`diagram-plan`, `diagram-ladder`, `diagram-dial`, `diagram-stall`, `diagram-pool`), each the last full frame of its diagram before the fade. Each frame was picked from its scene script's step list, not by eye. The hero frame is checked by pixel count: its board columns hold 4 to 13 % non-background pixels and the Needs you column is lit amber, where the old hero's board held 0.2 %. The sidecars stay in `demo/out/`. The two procedural clips left the page and the assets folder; the diagrams are hand-written SVG inside the HTML, generated once by a throwaway script and spliced in.

Other files: `launch/revision/concept.md` is the copy's source (section 2 copy, section 4 table rows, section 5 tradeoffs, section 6 what the page never claims). The page now departs from its section order; the copy of each kept sentence is verbatim. `launch/concept.md` is the older twelve-block concept. Which file becomes the source of truth is undecided. The page links its docs on GitHub, on the design repository's master: `docs/architecture.md`, `docs/threat-model.md`, `docs/spec-driven.md`, `docs/layers.md`, `docs/comparison.md`. Its proof links go to the claims page, `evidence.html`, which `node launch/site/evidence.js` builds from `docs/evidence.md`: every path in backticks links to its file on GitHub at the commit `github/main` of the code or infra repository points at, so fetch both first, and a path missing there fails the build. A scene a landing page clip shows links to that clip's card (each card's id is its clip's name, the stall fold's too, and a link into a fold opens it), any other scene to the demo handover's scene table, a stage to the build plan's stage table. Every card links its section of the claims page as "the file · the test · the run", as the folds do. Both pages share `site.css`. The film handover is `launch/handover.md`.

## Calls made on 21 October without Sebastian, open to reversal

- The hero line moved from "See everything on the kanban. Feed it a roadmap. Change anything from the chat." to the sandbox line, on Sebastian's suggestion of 21 October. The sandbox section, which carried that line as its title, is now "What the agent can reach". The first card of What you get moved from the chat, which the hero now shows, to talking to a running agent.
- The callout "Decide what runs next" rests on the priority labels a card files with and on the backlog lane, which waits until a card moves to ready.
- The film button and the loop clip left the hero and the loop section. The film returns to the loop section when it is cut.
- The loop diagram says one thing: the human appears at the spec, at a cap and at the merge rule, the agent is walled in, the checks stand before the merge. It replaces the five-plane clip, which showed stages without a point.
- The comparison table sits behind a fold. Revision section 12 point 5 left open whether it goes to the docs.
- The three layers sit under "Run it", not as their own section.

## Known gaps, by design

- The comparison was checked against each vendor's own documentation on 22 October 2026 by six parallel researchers, one per vendor. Every cell and its source sit in `docs/comparison.md`, which the table's caption links. Vendors ship fast: recheck the cells on the day the page goes public and change the date in the lede and in that file.
- The licence is the PolyForm Noncommercial License 1.0.0, in `LICENSE` of all three repositories since 23 October. Sebastian wants no date that turns the code open source, which rules out BSL 1.1. Commercial use, a company's evaluation included, needs a licence from him.
- No session so far could view rendered images. The frames, the diagrams and the layout are verified by a DOM probe (no horizontal overflow at 1440 and 500 px, every SVG label inside its box, folds closed) and not by eye.
- On narrow screens the three diagrams scroll sideways (`min-width: 860px`). A phone layout for them is not designed.

## The rules that bind the page

From revision section 6 and section 11:

- Never "open source" about the factory: it is "source available". The components (gVisor, Forgejo, SigNoz, opencode) may be called open source.
- No "compliant", "certified", "safe", "secure", no named regulation.
- Every public text reads as it will at release: no wording that waits for the licence, the hosting or the launch day. Sebastian decides when to release.
- No install time and no server price until an outside engineer has installed it and the numbers exist.
- No count older than the day the page goes public; the counts get recounted that day.
- Links only to paths that exist. No numbers from the demo project on the page.
- Sebastian's ruling of 22 October: the page may say the factory has completed tasks on a self-hosted model, with no run link and no date. He ran it end to end, and the test projects are cleared. This replaces the concept's rule that the claim waits for a run on the evidence page.
- The word is roadmap, never "roadmap YAML": the intake is linked Markdown, the YAML is the process, and the two must not be conflated.
- Every generated image or clip keeps its sidecar JSON. No spend past the $20 fal cap without asking.
- A section says its point once and stops. Depth goes behind a `<details>` fold or a link, never into a denser paragraph.
- No working notes in the copy. A reminder such as "only when they are real" belongs in this handover, never on the page.

## How to work in this repo

- Terminal output of repo files is mangled by a renderer. Copy a file to `/tmp` and read it there, or view exact lines with `awk 'NR>=X && NR<=Y {printf "L%d|%.250s\n", NR, $0}'`. IDE spelling diagnostics are noise.
- The SVG diagrams live inside the HTML and no generator is committed. Change a label by its unique text, then run the DOM probe: every text must stay inside its panel and the viewBox. Each panel is a rect, four corner marks, a number, a title and sub lines. Wires are paths with a marker tip. The CSS classes are in the page's stylesheet under `.diagram` and `.hero-annot`. The parts diagram adds `.panel.ours` (cyan outline), `.panel.slot` (dashed, no fill) and `.link` wires with the `#tipn` marker in the mark colour.
- Verify every change: `python3` html.parser parse, anchor and asset path check, the DOM probe (copy the page to `/tmp`, append a script that writes `scrollWidth`, each SVG text's `getBBox()` against its panel rect and the open folds into a `<pre>`, then `google-chrome --headless=new --no-sandbox --dump-dom`), and `google-chrome --headless=new --no-sandbox --screenshot=... --window-size=1440,9000` for a render. You cannot view images (image reads upload to a CDN), so say plainly what is unverified by eye.
- Git: work in a worktree (`git -C ~/repos/ai-software-factory worktree add -b <branch> /tmp/claude-1000/wt-<name> master`), commit with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, then `git fetch forgejo` first, because the factory's own document writer pushes to forgejo master and master can move under you, ff-merge to master, push both `origin` (GitHub) and `forgejo`, remove the worktree, delete the branch.
- Never commit `terraform.tfstate`. `launch/revision/` is Sebastian's private input, ignored by git: the commercial plan and the working concept never go public.
- Provider keys live in the gitignored `.env.tools`; never print one.

## Open, for Sebastian (ask with context, then act)

1. **The four calls above.** Keep or reverse each.
2. **The frames.** Eight frames picked by step, unverified by eye. If a frame shows the wrong beat, he names the scene and step from `demo/out/`.
3. **The source of truth.** `launch/concept.md` or `launch/revision/concept.md`. Until ruled, the revision wins for the copy.
4. **The film.** Where it sits once cut: the loop section's diagram stays and the film goes beside it, or the film replaces the diagram.
