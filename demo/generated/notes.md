# Group H: the run of 21 October 2026

The plan is [PLAN.md](PLAN.md). This file is what happened: the picks, the critic's rankings, the cost. The cap was the concept's default of $10, since decision 2 was left blank.

## The stills

Four per clip for 33, 34 and 35 on `blackforestlabs/flux-3/text-to-image` (16:9, 1k), three per title loop on `recraft/v4.1/flash/text-to-image`. The first call per clip asked for `num_images` 4 and got one image: neither model has a field for the count, so the rest came one call each, and the first sidecars were corrected to one image at the list price. Every still has its sidecar beside it; the contact sheet in each directory is what the critic saw.

## The critic and the picks

Gemini 2.5 Pro through fal, one call per contact sheet, the answers under `<clip>/critique/gemini.json` with the prompt beside them. The director's pick is provisional; Sebastian's overrides it.

| Clip | The critic's ranking | Pick | Why |
|---|---|---|---|
| 33 the loop | 2, 4, 3, 1 | still 2 | The only still with five stations; 1, 3 and 4 have six, and 4 has gauge markings that read as text. The critic warns that the amber glow and the cyan trace will compete for the eye; the plan's motion prompt moves both, kept as planned |
| 34 the sandbox | 1, 2, 4, 3 | still 1 | Clean isometric cell, the token and the key distinct; 3 and 4 carry a glow the motion prompt is meant to make |
| 35 the re-seed | 1, 2, 3, 4 | still 1 | The low angle gives the blocks weight; 3 and 4 are flat |
| 36a the horizon | a3 | a3 | Stable perspective, near-black field; a2 is grey |
| 36b the pulse | b3 | b3 | A soft horizontal pulse; b1 is a sharp vector, b2 is grey |
| 36c the panel trace | c2 | c2 | The only complete, centred rectangle; c1 is cropped, c3 a trapezoid |

## The takes

One take per clip, as planned: 33 to 35 on `minimax/h3-max/image-to-video` at 10 seconds and 768P from the picked still with the plan's motion prompt; the three title loops on `pixelcut/looping-video` at 5 seconds, 1080p, subtle motion. The clip sidecars are `<clip>-clip.json`. No second take was made: the critic named no defect a prompt change would fix, and the cut (phase 3) decides whether a clip earns one.

## Cost, estimated from the price list

| Item | $ |
|---|---|
| 21 stills | 0.66 |
| 4 critic calls | 0.12 |
| 3 takes of 10 s at $0.03 a second | 0.90 |
| 3 loops of 5 s at $0.08 a second | 1.20 |
| Total | 2.88 of the $10 cap |

The fal dashboard has the real figures; `tools/img.py cost` adds the estimates of `demo/generated` to the design rounds' total.
