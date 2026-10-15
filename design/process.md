# Design process

The console's design runs as rounds. Image models go wide, a vision critic judges, Sebastian picks, code follows. The reasoning behind the process is in [research/ai-native-design-discussion.md](research/ai-native-design-discussion.md). The log of what each run taught is [process-log.md](process-log.md). Models, prices and keys are in [models.md](models.md).

## Roles

| Role | Who | Job |
|---|---|---|
| Creative director | Claude in the session | Writes the brief, the directions, the prompts and the themes. Merges the critiques. Picks provisionally when Sebastian is away |
| Image generator | fal models, see [models.md](models.md) | Makes and edits images. Cannot judge |
| Independent critic | Gemini 2.5 Pro (`google/gemini-2.5-pro`) through fal `any-llm/vision` | Judges images and built pages against the brief. Never wrote the prompt |
| Second critic | GLM 5V Turbo (`glm-5v-turbo`) on Z.ai | Judges the same material. Used when a round needs two opinions |
| Judge | Sebastian | Picks directions and stops every loop |
| Builders | Subagents, one per direction | Turn a theme, the content deck and the reference images into a one-file prototype, shoot it, fix it |

The critics come from a different vendor than the director, so the director does not grade its own taste. Critics are not oracles. They disagree with each other and with themselves between loops. They are right on craft (contrast, tap targets, cut text) and often wrong on structure. The director checks every claim about legibility or layout against the pixels at 1x before it reaches a builder.

## Stages

1. **Brief and content deck.** [brief.md](brief.md) (audience, impression, look, constraints), [inventory.md](inventory.md) (every control and data point, nothing may be dropped), [ia.md](ia.md) (the shared information architecture) and [content.md](content.md) (every word on the screen). All directions use the same content, so differences between them are design differences only.
2. **Model probe.** Same prompt on every candidate model, one contact sheet. Pick a cheap model for breadth and a strong one for craft. About $1.
3. **Round 1, breadth.** 12 or more directions that differ in kind, in both themes. One image per direction and theme. For a screen that exists, describe the content and ask for a design with text-to-image. Edit models pinned to a screenshot reproduce its layout and cannot redesign.
4. **Round 2, depth.** Per carried direction: the states that matter (drawer, phone, idle) as images. These images are the targets for the builders.
5. **Theme.** `design/themes/<slug>/DESIGN.md` and a token file, read off the images: colours sampled, type described, layout per region, motion rules.
6. **Build.** One builder per direction, in parallel, from the theme, the content deck, the inventory and [prototypes/BUILDER.md](prototypes/BUILDER.md). One HTML file per prototype in `design/prototypes/<slug>/`, drawing from the shared [scenarios.js](prototypes/scenarios.js). Run the shared scripts on a shared data file before dispatch, so a fault in it does not hit every builder.
7. **Check, shoot, critique.** [prototypes/check.js](prototypes/check.js) proves that every inventory control is present and the mechanics work. [prototypes/shoot.js](prototypes/shoot.js) takes the same shots for every prototype. [prototypes/critique.sh](prototypes/critique.sh) sends the shots to the critic. The director filters the critique and sends the builder a numbered fix list. At most 3 loops.
8. **Page and picks.** [index.html](index.html) (built by [build-index.py](build-index.py)) shows everything side by side. [PICKS.md](PICKS.md) collects Sebastian's decisions. Only his picks become entries in [design-decisions.md](design-decisions.md).

## The lab

The real console is the baseline and the harness. `scripts/console-lab/run.sh` in the code repository (`/home/womb/repos/ai-software-factory-code`) serves the real console with fake data in four scenarios (busy, idle, fire, quiet) and screenshots every view in both themes. It gives the "before" for every critique and the "after" when the pick is built. Its structural check must be green before a round builds on it. A red check hides every step after the failing one.

## The condensed round

One control or one feature does not need sixteen directions. Rounds [02](rounds/02-multi-chat/brief.md) (the multi-chat parts) and [03](rounds/03-theme-toggle/brief.md) (the theme toggle) used a lighter form:

1. **A brief that says what the round designs and nothing else.** A numbered list of the parts. Then what is fixed: the shell, the theme tokens, the contrast floor, the phone rule. Then the questions the candidates answer. Then the limits.
2. **References from other products, when the control is common.** Round 03 checked 33 products live and sorted them into ten patterns. Two patterns that the first ten candidates missed became candidates.
3. **Directions as images in both themes, or candidates built in the lab.** Round 02 drew eight directions with `google/nano-banana-2.1`, because placement is a layout question and images answer it. Round 03 generated no image. An image model draws an 18 px glyph neither exactly nor the same twice, so the review unit is the real top bar with the real candidate in it, at 1x and 3x. Use images when the question is layout. Build candidates when the question is a detail that images cannot draw.
4. **Two critics, at most two loops.** Gemini and GLM judge the same sheets. The director checks each claim against the pixels and writes down the claims it overruled. Carry the finalists into one fix loop and one compare loop.
5. **A recommendation with its runner-up.** The round page gives the director's recommendation, the reasons and the runner-up. When the critics disagree on the runner-up, say so.
6. **Sebastian's pick becomes a C-entry.** It goes into [design-decisions.md](design-decisions.md) ([C14](rounds/02-multi-chat/notes.md) and [C15](rounds/03-theme-toggle/notes.md) are the examples) with the theme, [ia.md](ia.md) and [inventory.md](inventory.md) updated.
7. **`notes.md` per round.** The director's view, the critics' scores, what was overruled, the pick, the cost, the time and what worked.

Round 02 cost $2.55 of a $15 cap. Round 03 cost $0.24 of a $3 cap.

## Artefacts

Every round lives in `design/rounds/NN-slug/`:

- `brief.md`: what the round designs, what is fixed, the questions, the limits.
- One image file per output, with a sidecar JSON of the same name: model ID, prompt, reference images, parameters, seed, cost estimate, timestamp. `tools/img.py gen` writes it. An output without its sidecar does not count.
- `contact-sheet*.jpg`: all outputs on one image, labelled. The review unit for the director and the critic (`tools/img.py montage`).
- `critique/*.json`: the critics' answers, with the prompt file next to them.
- `index.html`: the round page with prompts, critiques and the recommendation (`tools/img.py sheet`).
- `notes.md`: the director's view, the critics' ranking against Sebastian's pick, cost, time, what worked.

Prototypes live in `design/prototypes/<slug>/`, themes in `design/themes/`. The tools:

| Tool | Job |
|---|---|
| [tools/img.py](../tools/img.py) | `gen`, `critique`, `montage`, `sheet`, `cost`. Run from the repo root. Reads `.env.tools` |
| [tools/shoot.sh](../tools/shoot.sh) and [tools/shoot.js](../tools/shoot.js) | Full-height screenshots of any HTML file at 1440 and 390 |
| [prototypes/shoot.js](prototypes/shoot.js) and [prototypes/check.js](prototypes/check.js) | The shared shots and the shared check per prototype |
| [prototypes/critique.sh](prototypes/critique.sh) | The critic's pass over one prototype |

`tools/img.py cost` adds up estimates from the price list. The fal key cannot read the real spend. Sebastian checks the fal dashboard afterwards.

The portfolio's site-specific files (`barcode.py`, `mechanics.py`, `check-mechanics.js`, the site mechanics spec and the content sources) are not part of this process.

## Limits for a run without the judge

Fix them in the session plan before the run: number of directions, number carried forward, loops per prototype, spending cap, stop time. An agent working alone drifts without them. No generation before the judge has approved the plan. The director's picks in his absence are provisional and Sebastian's pick overrides them.
