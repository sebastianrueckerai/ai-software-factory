# Round 00: model probe

Same direction ("Linear calm", dark) on 11 calls: five edit models with the live idle screenshot of 2026-10-13 as the reference, five text-to-image models with the screen's content spelled out in the prompt, plus the first key test. Contact sheet: `contact-sheet.jpg`. Cost about $1.35.

## Verdict

- **Edit models with a UI screenshot as reference are useless for redesign.** flux-3, nano-banana, gpt-image, qwen and seedream all reproduced the screenshot's layout at the same proportions with garbled tiny text and a slightly different grey. The reference pins them. The second flux-3 prompt ("do not copy the look") changed nothing.
- **Text-to-image from a content deck works.** `google/nano-banana-2.1` made a legible, correctly worded, well designed console: the right columns, the right card titles, the pills, a chat panel with its composer. `blackforestlabs/flux-3/text-to-image` is legible and structured but plainer. `recraft/v4.1/flash` changed the hierarchy on its own (the pulse as a headline), which is useful for layout breadth but its cards are rough. `gpt-image-2.5` made a sparse dark screen with small text. `ideogram/v4` was confused.

## Pick

- Round 01 breadth: `google/nano-banana-2.1` text-to-image at $0.15, with `flux-3/text-to-image` at $0.05 as a second take per direction. No reference images: the content deck in the prompt is the shared copy, the direction block is the design.
- Round 02 craft: `nano-banana-2.1` again (it is the best at UI text), `gpt-image-2.5` only for a material pass if a direction needs texture.
- Lesson for the process: for a UI that exists, "restyle this screenshot" is the wrong question for an image model. Describe the content and ask for a design.
