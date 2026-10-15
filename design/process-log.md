# Process log

The entries from 2026-10-10 and 2026-10-11 come from the portfolio's runs of the process, kept here as the history. The entries after them are this repository's rounds.

A running record of how the agentic design process works in practice and what changed in it. [process.md](process.md) always holds the current method. This file holds how it got there.

Each entry: what changed or what we learned, why, and the effect if known.

## 2026-10-10

- **The process is internal.** Sebastian wants a better process for himself. The page never shows it (D4).
- **Overnight runs need fixed limits.** An agent working alone drifts. The plan fixes the number of directions (12), the number carried forward (4), the number of fix loops per site (3) and the spend ($10).
- **Provisional picks.** When Sebastian is away, the director picks what to carry forward, so work does not stop. Sebastian's morning pick overrides it. Only his pick becomes a decision.
- **Spend is estimated.** The fal key has no permission for the usage API. `tools/img.py` adds up estimates from the price list, with cautious guesses for models priced in "units". Lesson for setup: create the key with billing read access, or check the dashboard.
- **One copy deck for all versions.** All sites use the same text, so differences between versions are design differences only.
- **Directions must also answer the real goal.** The aim is to get visitors to open the projects. Each direction proposes how the projects get attention, not only a style.
- **Placeholder art must look like the real thing.** The project demos are built elsewhere. The portfolio shows art as close as possible to how each project looks or will look, so the design is judged against the real visual mix.
- **Quality comes after design.** Responsive, fast and solid is a requirement, but it never limits a design choice. Any design can be made fast afterwards.
- **Shell keys can shadow repo keys.** A `FAL_KEY` in the shell environment held a different, invalid key. `tools/img.py` now lets `.env.tools` win.
- **Critic sanity test.** On a plain portrait, `glm-5v-turbo` described it correctly. `qwen/qwen3.8-27b` made up extra panels that do not exist. Qwen counts as a weaker second opinion until it proves itself.
- **Generation waits for the OK.** The director started round 01 while Sebastian still wanted to read the plan. "Revise so I can look at it" means no spending until he answers, however late it is. The run is cheap to resume and expensive to redo in a direction he did not want.
- **A contact sheet is the review unit.** 24 tiles at 620 px on one image were enough for the director to judge every direction and spot text errors. The critic gets the same sheet, so both judge the same thing.
- **One prompt, 12 layouts.** Round 00 proved that a fixed layout in the prompt makes every model produce the same page. Round 01 gave each direction its own layout, its own treatment of the projects and the real project looks as reference images. The breadth came from the prompts, not the model.
- **Flux-3 edit for breadth.** Cheap, priced per megapixel, keeps the face from the reference and spells text right most of the time. 1 of 24 calls failed and needs a retry.
- **Round 1 is judged on first screens.** Sebastian picked on the (a) images alone. The (b) project sections cost half the round and did not move the pick. Next time: round 1 makes first screens only, twice the directions for the same money, and project sections come with the picked few.
- **The video decides the portrait treatment.** A styled portrait is only usable if the video can carry the same style. That test comes before the depth round, not after the site is built.

## 2026-10-11, overnight run

- **Z.ai ran out of balance at 23:40.** The primary critic `glm-5v-turbo` answered HTTP 429 "Insufficient balance". Replaced by `google/gemini-2.5-pro` through fal's `any-llm/vision` endpoint, paid with the fal key, with `reasoning: true` (the model refuses without it). Lesson: a second critic on a second key is not optional.
- **Critic calibration, round 01.** Sebastian picked 02, 05, 06, 07, 08, 09 (and 10 as maybe) and rejected 03, 04, 11. Gemini's top five: 08, 09, 06, 02, 07, with 04 and 11 at the bottom. Five of six agree, and the rejections agree. Qwen on Groq put 01 and 03 in its top three and 07 last: no agreement. Gemini is the critic from here, Qwen is dropped.
- **`lucy-restyle` is not a restyle tool for this.** Cheap, but the style decays within seconds. `flux-3/edit-video` holds a look across a 10 s clip and keeps the face. $0.30 per clip.
- **The styled still is frame 0 of the styled loop.** No separate still generation for styled directions. Still and video match by construction.
- **The cutout comes first.** Browser filters on a video with a black background paint the background. The alpha cutout (`birefnet/v2/video`) makes browser duotones and posterise usable on paper backgrounds.
- **One builder per direction, in parallel.** Seven sites in about 40 minutes of wall time with Sonnet subagents, each from a theme, the copy deck, the reference images and the shared mechanics spec. The director writes the themes and filters the critiques, the builders build. Two fix rounds each were enough for prototypes.
- **The critic grades against the mockup, even where the mockup is wrong.** It asked for the coffee cup that only the generated drawing had, and for a paragraph where the copy deck says a list. The director filters every critique before it reaches a builder. The critic earns its place on craft findings: cut-off images, black voids, illegible text, collisions.
- **Headless Chrome cannot show hover.** Screenshots show project images in colour because the in-view class fires, so the rest state goes unverified in screenshots. A Playwright check of the live page is the honest test of the mechanics.
- **Screenshots must be full height.** A 2400 px window cut the contact section off and the critic called it missing.
- **Costs of the night, estimated:** model probe $1.10, round 01 $1.24, video tests $1.60, round 02 $2.99, assets $0.31, site critiques $0.30. About $7.50 of the $15 cap. The gpt-image price is a guess; the fal dashboard has the truth.
- **A sub-page gets the same round.** The CV page failed Sebastian's parse test. Three layouts in parallel from one verbatim content file, one contact sheet, one critique, one merge: about 15 minutes and $0.03. The critic's structural proposal matched the director's. Its one order-breaking idea (fold "Currently" into Experience) was filtered by D13. Lesson: when a page "has too much on screen", build three structures, not three polishes.
- **Two waves for a cross-cutting change.** Vertical projects, a CV page and a style switch on six styles: wave 1 did the index pages and the switch in parallel while the Magazine CV became the template, wave 2 skinned that template five times. Builders with their earlier context did it in one message each. The shared behaviour (`sites/switch.js`, the CV structure) lives once, the skins live per style.
- **Full-page screenshots need Playwright.** Headless Chrome's `--screenshot` captures a window, so tall pages got cut and the critic called sections missing. `tools/shoot.sh` now uses Playwright's full-page capture when it is installed. A fixed background shows up as cut off in such captures, which the Desk pages fixed by scrolling the background with the page.
- **A feedback list from the judge maps one to one onto builders.** Ten fixes across six styles went out as seven messages in one wave, each builder with its own list, the shared parts (copy, spec, decisions) written first. The automated check caught the one that was wrong afterwards: a cue line marked hidden to assistive tech, which no screenshot would have shown. A background wait on file times is fragile when the files were already written; wait on the notification or check the state first.
- **Principle, not execution, across styles.** The card action row was prototyped once on Magazine, then the rule went into the shared spec and five builders applied it in their own language (stamped boxes, carved blocks, lit terminal keys, riso stamps, sticky notes). One message each, one automated check for the behaviour that must be identical (the card video plays in place, one at a time). Visual freedom per style, behaviour fixed once.

## 2026-10-14, the console round

The first run on this repository: [the report](reports/2026-10-14-overnight.md).

- **A tool that exists is a different brief.** The console had code, data and a history of rulings. The round started with an inventory of every control (nothing may be dropped) and a shared information architecture before any image, so the directions differed in design, not in what they showed.
- **Edit models pinned to a screenshot cannot redesign.** Five edit models reproduced the console's layout with garbled text. Text-to-image from a content deck (`nano-banana-2.1`, $0.15) made legible, designed screens. For a UI that exists, describe the content and ask for a design.
- **Breadth in images, depth in code.** Round 1 made 16 directions in both themes for $5.60. Ten Opus builders then built the carried directions as single-file HTML prototypes in parallel, at the cost of tokens only.
- **Shared scripts keep parallel builders comparable.** `check.js` and `shoot.js` made the critique comparable across ten prototypes and caught real faults, such as a phone overflow and a missing start line. A bug in the shared data file (a key declared twice) hit every builder at once. Shared files need a smoke test before dispatch.
- **The critic repeats itself on structure.** Gemini called the drawer "over the chat" and the phone "board first" where the screenshot shows otherwise. Its craft findings (contrast, tap targets, cut text) were right almost every time. The director checks a structural claim against the shot before it reaches a builder.
- **Every first build had Done too loud, the light theme as an inversion and the chat log empty.** These became rules in [prototypes/BUILDER.md](prototypes/BUILDER.md).
- **The fal key cannot read real spend.** `tools/img.py cost` adds up estimates ($12.58 for the round). Sebastian reads the fal dashboard for the true figure.
- **Scenarios must hold every kind the design covers.** The scenarios had no plan approval, resource approval or human task, so those Needs you kinds were designed but never rendered. Seed every kind before the round, so it is designed on the real thing.

## 2026-10-15, the condensed rounds 02 and 03

Two rounds for one feature and one control: [multi-chat](rounds/02-multi-chat/notes.md) and [theme toggle](rounds/03-theme-toggle/notes.md).

- **A round can be small.** One brief that names what is designed and nothing else, what is fixed and the questions, then two critics and at most two loops. Round 02 cost $2.55 and round 03 cost $0.24. Sebastian's pick became C14 and C15. [process.md](process.md) describes the form.
- **A glyph round needs no image model.** An image model draws an 18 px symbol neither exactly nor the same twice. Round 03 built twelve candidates in the lab's top bar and judged them at 1x and 3x. The cost was tokens and eight critic calls.
- **The critics disagree with each other and with themselves.** Gemini moved the half disc from 9 to 5 and the eclipse from 8 to 10 between loops on the same pixels. GLM and Gemini ranked the runner-up differently. The director checks every legibility claim against the 1x pixels. It overruled "an illegible texture" for a selector that read cleanly and "the only candidate that embodies the instrument idiom" for a moon that was a blob.
- **Agreement of both critics is a signal, not a proof.** Both scored the pressed key of selector-2 high. It measured 1.60:1 and 1.75:1 against a 3:1 rule, and neither critic named it. Measure the contrast of every state-carrying fill in code. A critic reads the picture, not the ratio.
- **References add candidates.** 33 products checked live gave ten patterns. Two patterns that the first ten candidates missed became candidates 11 and 12, which needed a second loop. Do the references before the candidates.
- **A shared CSS rule can beat a candidate's own.** The shared rule had a higher specificity than the candidate's `transform-origin`. The shared rule now sits inside `:where()`.
- **The lab's structural check must be green before a round builds on it.** It had failed on main at an archived thread's row and every later step never ran. Four stale entries surfaced when it ran again. Fix the check first.
- **Pick the variant, then let the pick reshape the shared engine.** In round 02 Sebastian chose a variant and then set the level selector's place himself. The build moved the new control into the engine all three variants share, so they differ in the switcher alone.
- **Build teaches what the image did not show.** Round 02's build found a class clash with the card opener, a second horizontal scroll from a chip rail at 390 and a popover that cannot live inside a `<p>`. The images could not have shown any of them.

## 2026-10-15, round 04: the routines

- **A condensed round can run end to end in one session.** Brief, eight directions as images, two critics, three built variants by three builders in parallel, two critics again, a hybrid as a fourth variant, two critics a third time, the page. About 65 minutes of wall clock and $2.58.
- **Build the hybrid the critics ask for.** Both critics asked for the same combination after the first loop over the built variants. Built as a fourth variant, it won the second loop with both. A described hybrid is a guess; a built one is a pick.
- **Vary one thing across the variants.** The three homes differed in the home only, with the chip, the provenance line, the routine's drawer and the acts shared through one builder's brief. The critics then judged the home and nothing else.
- **A shared check and shoot script per round, hooks named in the brief.** Every builder ran the same check.js and shoot.js. A check that counts every `[data-act]` also counted the base's own links, and the builders fixed the links rather than the check. Name the round's attributes so the check matches only the round's elements.
- **Image models add what the prompt did not ask for.** The ghost card direction's image drew a Routines panel the prompt never named, and both critics credited the direction for it. Read the sheet before the critics' ranking and note what the model invented.
- **A critic answer can come back empty at four sheets of 2880 px a side.** Gemini's compare call returned nothing the first time and answered at 2048 px.
- **The builders find faults in the base prototype.** Four this round, all in round 02's instrument prototype: a scrolled hidden label, a class name collision, a 17 px phone link, a `€NaN`. A prototype that other rounds build on wants its own check.
