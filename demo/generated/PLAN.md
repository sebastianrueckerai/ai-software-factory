# Generated clips: the plan for group H

Four clips the browser cannot record, made with the fal models of [design/models.md](../../design/models.md) by the process of [design/process.md](../../design/process.md): stills go wide, the independent critic judges, Sebastian picks, the chosen still is animated. Every output gets its sidecar JSON from `tools/img.py`. It ran on 21 October 2026 under the concept's default cap of $10; [notes.md](notes.md) has the picks, the critic's rankings and the cost, and the results page shows every output.

## Look

The console's theme is Mission control (`design/themes/06-mission-control/`): a near-black page, panel greys, one cyan accent, amber for attention, mono type for figures. The clips use the same palette so a cut from a console scene to a clip and back reads as one film. No people, no faces, no text inside the generated frames: the voice-over and the console scenes carry the words. Camera moves are slow; the subject does the moving.

## The clips

| # | Clip | Length s | Still model | Video model | Cost est. $ |
|---|---|---|---|---|---|
| 33 | The opening: the loop | 10 | `blackforestlabs/flux-3/text-to-image` | `minimax/h3-max/image-to-video` | 0.40 |
| 34 | The sandbox life cycle | 10 | `blackforestlabs/flux-3/text-to-image` | `minimax/h3-max/image-to-video` | 0.40 |
| 35 | The wipe and re-seed | 10 | `blackforestlabs/flux-3/text-to-image` | `minimax/h3-max/image-to-video` | 0.40 |
| 36 | Title and transitions | 3 loops of 5 | `recraft/v4.1/flash/text-to-image` | `pixelcut/looping-video` | 1.30 |

Per clip: four stills at about $0.024 each, one critic call at about $0.03 on the contact sheet, one video take at $0.03 a second (the looping model at $0.08). A second take per clip doubles the video line. Total for one take each: about $2.50. With a second take of every clip: about $4.50. Proposed cap: $10.

### 33. The opening: the loop

The five planes as a ring of five instrument panels on a dark field, signals at the top, then control, workers, verification, deploy, and a faint trace running the ring back to signals.

Still prompt: "Five dark instrument panels arranged in a ring on a near-black field, thin cyan traces connecting them clockwise, one trace returning from the last panel to the first, subtle amber glow on the first panel, mono grid texture, no text, no people, cinematic depth, 16:9."

Motion prompt: "A slow push-in on the ring, the cyan trace travels clockwise panel to panel, the amber glow fades on the first panel and reappears on the last, loopable."

Critic question: "Does this read as a closed loop of five stations, and is the cyan trace the only moving element the eye follows?"

### 34. The sandbox life cycle

A translucent cell appears on the field, a token and a key slide into it, work glows inside, then the cell, the token and the key dissolve to nothing.

Still prompt: "A single translucent glass cell floating over a dark grid, a small cyan token and a small amber key resting inside it, faint activity glow in the cell's centre, everything else empty and dark, no text, no people, 16:9."

Motion prompt: "The cell fades in from nothing, the token and the key slide in, the glow pulses twice, then the cell and everything in it dissolve into the dark grid, leaving the field empty."

Critic question: "Is it clear that everything inside the cell is gone at the end, with nothing left on the grid?"

### 35. The wipe and re-seed

Three server nodes on the field go dark, the field clears, then the three nodes rebuild themselves from a single seed point and light up in the same places.

Still prompt: "Three small dark server blocks standing on a near-black grid, each with a thin cyan status line, a faint single bright seed point below them on the grid, no text, no people, wide shot, 16:9."

Motion prompt: "The three blocks power down and crumble to nothing, the grid clears, the seed point brightens, three new blocks rise in the same positions and their cyan status lines switch on one after another."

Critic question: "Does the rebuild land the three blocks exactly where the old ones stood, so the cut back to the console reads as the same cluster?"

### 36. Title and transitions

Three short seamless loops for the title card and the cuts: a slow drift of the dark grid with a cyan horizon line; the same with an amber pulse crossing; the same with a thin cyan trace drawing a rectangle the size of a console panel.

Still prompt (one per loop): "Near-black field with a fine mono grid in perspective, a single thin cyan horizon line, nothing else, no text, 16:9." Variants: "a soft amber pulse crossing the grid left to right", "a thin cyan trace drawing a 16:9 rectangle in the centre".

Motion prompt: "Seamless loop, slow drift of the grid toward the camera, the line stays still." Variants add the pulse crossing and the trace drawing.

Critic question: "Is the loop seamless at the cut, and is the field quiet enough to carry a title in mono type over it?"

## Run order

1. `tools/img.py gen` for the four stills of clip 33 with the still prompt, then `tools/img.py montage` for the contact sheet, then `tools/img.py critique --critic gemini` with the critic question. Sebastian picks, or the director picks provisionally.
2. The chosen still to the video model with the motion prompt. One take. A second take only if the critic names a defect the prompt can fix.
3. Clips 34 and 35 the same way. Clip 36 last, with the looping model.
4. Outputs and sidecars under `demo/generated/<clip>/`, named `<clip>-<n>.png`, `<clip>.mp4`, each with its `.json` sidecar.
