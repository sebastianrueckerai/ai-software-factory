# Handover: the landing page

Paste this as the first message of a new session. It carries everything; you need nothing from past sessions. Read it fully before acting.

## What you work on

One static page, `launch/site/index.html`, no build step, dark design, no JavaScript. It sells the factory to two readers: an engineer who might run it (what does it do, can I run it) and a CTO or hiring reader (the sandbox, the gates, the proof). Sebastian's ruling of 21 October: the page must make its points in text and images early, with no walls of text and no dense summaries. Depth goes behind a fold or a link. The film is a later concern.

## What exists, as of the commit after 83e3714 on 21 October

The page is built for progressive disclosure. Nine stops, each one point:

1. **Hero.** The eyebrow names the product ("AI software factory · Self-hosted · Source available"). The line takes the sandbox route: "The worst an agent can do is wreck its own sandbox." A three-sentence subhead, two buttons (`How it works` to the loop, `Source and setup` to the repository), then the annotated console frame and the one-line positioning band. The frame carries the kanban and chat points, so the line no longer has to.
2. **The loop.** An inline SVG: nine stops from roadmap to telemetry and back to cards. Amber marks where the human appears (confirm the spec, fund or end at a cap, approve or let the merge rule merge). A dashed wall around the sandbox. Under it three panels: you, the agent, the checks.
3. **What you get.** Six cards, each a console frame, a bold line, one or two sentences and a link to the evidence page or the spec-driven doc: the chat, the spec with named proofs, the review that rejects, issues that file their own fix, the money held, the autonomy dial.
4. **What the agent can reach.** An inline SVG: the pod in the middle, four blocked targets on the left with crossed wires, three reachable hosts on the right, the push after the agent at the bottom. Four fact lines and an amber box for the risk that stays.
5. **Run it.** Three sentences, the three layers as an inline SVG, the button.
6. **Under the hood.** One lede sentence, then six `<details>` folds, closed by default: the sandbox, the gates, the money, recovery (with the supervisor frame), the numbers, three more facts.
7. **How it compares.** One lede, the table behind a fold, the tradeoffs box visible.
8. **Proof and limits.** The four links, the counts.
9. **Footer.**

Visible words per section stay between 33 and 201. The old eight-paragraph reach section, the module cards, the numbers section and the table are the folds and the diagrams now.

The hero frame is `34-busy-board-3.png`, from scene 34 of the bank, written for the hero: one afternoon with every column full (three cards in Needs you: a question, a budget stop, a payments merge; three queued; five in progress; seven done) and the chat answering the budget stop with two card proposals. Over it sits one inline SVG: three callouts in a band above the frame, each with a bracket over the region it names ("Change anything from one chat" over the chat, "See what is stuck" over Needs you, "Decide what runs next" over Queued) and a box around each Do it button. The brackets come from the console's own element boxes, read by Playwright on the lab's state at 1600 by 900. If the console's layout changes, re-record scene 34 and re-read the boxes. Below 640 px the SVG hides and the plain frame with a numbered list shows.

Assets in `launch/site/assets/`: the hero frame and seven more console frames from `demo/out/`, named by scene and step ( `11-steer-4`, `03-too-large-split-6`, `07-review-rejects-2`, `33-issue-to-fix-6`, `20-cap-fires-1`, `25-autonomy-2`, `08-supervisor-2`). Each frame was picked from its scene script's step list, not by eye. The hero frame is checked by pixel count: its board columns hold 4 to 13 % non-background pixels and the Needs you column is lit amber, where the old hero's board held 0.2 %. The sidecars stay in `demo/out/`. The two procedural clips left the page and the assets folder; the diagrams are hand-written SVG inside the HTML, generated once by a throwaway script and spliced in.

Other files: `launch/revision/concept.md` is the copy's source (section 2 copy, section 4 table rows, section 5 tradeoffs, section 6 what the page never claims). The page now departs from its section order; the copy of each kept sentence is verbatim. `launch/concept.md` is the older twelve-block concept. Which file becomes the source of truth is undecided. Docs the page links and that exist: `docs/architecture.md`, `docs/threat-model.md`, `docs/evidence.md`, `docs/spec-driven.md`, `docs/layers.md`. The film handover is `launch/handover.md`.

## Calls made on 21 October without Sebastian, open to reversal

- The hero line moved from "See everything on the kanban. Feed it a roadmap. Change anything from the chat." to the sandbox line, on Sebastian's suggestion of 21 October. The sandbox section, which carried that line as its title, is now "What the agent can reach". The first card of What you get moved from the chat, which the hero now shows, to talking to a running agent.
- The callout "Decide what runs next" rests on the priority labels a card files with and on the backlog lane, which waits until a card moves to ready.
- The film button and the loop clip left the hero and the loop section. The film returns to the loop section when it is cut.
- The loop diagram says one thing: the human appears at the spec, at a cap and at the merge rule, the agent is walled in, the checks stand before the merge. It replaces the five-plane clip, which showed stages without a point.
- The comparison table sits behind a fold. Revision section 12 point 5 left open whether it goes to the docs.
- The three layers sit under "Run it", not as their own section.

## Known gaps, by design

- Comparison cells that say "not surveyed" or "not verified" wait for Sebastian to check them against the vendors' own pages before anything goes public.
- Docs links are relative (`../../docs/...`) and work in-repo; they break when the page moves to GitHub Pages and must be reworked then.
- The eyebrow says "Source available" while the licence file does not exist yet. Stop-ship rule: nothing public before the BSL 1.1 file is committed with its parameters.
- No session so far could view rendered images. The frames, the diagrams and the layout are verified by a DOM probe (no horizontal overflow at 1440 and 500 px, every SVG label inside its box, folds closed) and not by eye.
- On narrow screens the three diagrams scroll sideways (`min-width: 860px`). A phone layout for them is not designed.

## The rules that bind the page

From revision section 6 and section 11:

- Never "open source" about the factory. "Source available", and only once the licence file exists. The components (gVisor, Forgejo, SigNoz, opencode) may be called open source.
- No "compliant", "certified", "safe", "secure", no named regulation.
- No install time and no server price until an outside engineer has installed it and the numbers exist.
- No count older than the day the page goes public; the counts get recounted that day.
- Links only to paths that exist. No numbers from the demo project on the page.
- The word is roadmap, never "roadmap YAML": the intake is linked Markdown, the YAML is the process, and the two must not be conflated.
- Every generated image or clip keeps its sidecar JSON. No spend past the $20 fal cap without asking.
- A section says its point once and stops. Depth goes behind a `<details>` fold or a link, never into a denser paragraph.

## How to work in this repo

- Terminal output of repo files is mangled by a renderer. Copy a file to `/tmp` and read it there, or view exact lines with `awk 'NR>=X && NR<=Y {printf "L%d|%.250s\n", NR, $0}'`. IDE spelling diagnostics are noise.
- The SVG diagrams are long single lines inside the HTML. To change one, regenerate it rather than hand-edit: the panel helper draws a rect, four corner marks, a number, a title and sub lines, and the wires are paths with a marker tip. The CSS classes are in the page's stylesheet under `.diagram`.
- Verify every change: `python3` html.parser parse, anchor and asset path check, the DOM probe (copy the page to `/tmp`, append a script that writes `scrollWidth`, each SVG text's `getBBox()` against its panel rect and the open folds into a `<pre>`, then `google-chrome --headless=new --no-sandbox --dump-dom`), and `google-chrome --headless=new --no-sandbox --screenshot=... --window-size=1440,9000` for a render. You cannot view images (image reads upload to a CDN), so say plainly what is unverified by eye.
- Git: work in a worktree (`git -C ~/repos/ai-software-factory worktree add -b <branch> /tmp/claude-1000/wt-<name> master`), commit with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, then `git fetch forgejo` first, because the factory's own document writer pushes to forgejo master and master can move under you, ff-merge to master, push both `origin` (GitHub) and `forgejo`, remove the worktree, delete the branch.
- Never commit `terraform.tfstate`. `launch/revision/` is Sebastian's untracked input; leave it unless he says commit it.
- Provider keys live in the gitignored `.env.tools`; never print one.

## Open, for Sebastian (ask with context, then act)

1. **The four calls above.** Keep or reverse each.
2. **The frames.** Eight frames picked by step, unverified by eye. If a frame shows the wrong beat, he names the scene and step from `demo/out/`.
3. **The source of truth.** `launch/concept.md` or `launch/revision/concept.md`. Until ruled, the revision wins for the copy.
4. **The film.** Where it sits once cut: the loop section's diagram stays and the film goes beside it, or the film replaces the diagram.
