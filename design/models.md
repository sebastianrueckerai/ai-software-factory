# Models and provider keys

State on 2026-10-15. IDs come from the live fal and Replicate catalogues. Prices marked "?" were not readable from fal's pricing API. Check the fal pricing page before a large batch.

## Keys in `.env.tools`

All four keys answered a read-only call with HTTP 200 on 2026-10-15. The file is gitignored and sits in the repository root.

- `FAL_KEY`: fal.ai. The main source for image and video models. It also serves the Google and OpenAI image models and the vision critics through `any-llm/vision`, so those need no own key. `tools/img.py` reads it.
- `ZAI_KEY`: Z.ai (GLM), base URL `https://api.z.ai/api/paas/v4`. GLM models stream reasoning first, so set a high `max_tokens`. `tools/img.py` reads it.
- `GROQ_KEY`: Groq, OpenAI-compatible API. Fast and cheap vision models. `tools/img.py` reads it.
- `REPLICATE_API_TOKEN`: Replicate. Older versions of the same model families. Use it as a fallback.

Load them with `set -a; . ./.env.tools; set +a`. Never echo the values.

## Text to image (fal)

| Model ID | Price | Use |
|---|---|---|
| `ideogram/v4` | about $0.01/image | UI mockups with legible text |
| `blackforestlabs/flux-3/text-to-image` | $0.024/megapixel | concept art, mood |
| `google/nano-banana-2.1` | ? | layouts, text, iteration |
| `openai/gpt-image-2.5/flare/text-to-image` | ? | prompt adherence, text |
| `alibaba/qwen-image-3/text-to-image` | about $0.01/image | text rendering, cheap |
| `bytedance/seedream/v5/pro/text-to-image` | about $0.07/image | photoreal |
| `recraft/v4.1/flash/text-to-image` | $0.007/image | design styles. `text-to-vector` gives SVG |

## Image edit with reference images (fal)

These keep a person's identity from a portrait.

- `google/nano-banana-2.1/edit`: multi-reference, good identity retention. Default.
- `blackforestlabs/flux-3/edit-image`: strong face consistency.
- `openai/gpt-image-2.5/flare/edit`: best instruction following.
- `bytedance/seedream/v5/pro/edit`, `alibaba/qwen-image-3/edit`: cheaper.

## Image to video

Idle loop from a still:

- `minimax/h3-max/image-to-video`: $0.03/s, realistic humans. Default.
- `pixelcut/looping-video`: $0.08/s, built for seamless loops.
- `alibaba/wan-3.0-prime/image-to-video`: $0.05/s.
- `bytedance/seedance-2.5/us/image-to-video`, `fal-ai/kling-video/v3/turbo/pro/image-to-video`: alternatives.
- `lightricks/ltx-2.5/image-to-video/fast`, `xai/grok-imagine-video/v1.5/lite/image-to-video`: cheap drafts.

Talking head from audio:

- `fal-ai/flashtalk`: $0.02/s.
- `minimax/h3-max/lip-sync/image-to-video`: $0.05/s.
- `fal-ai/sync-lipsync/v3/image-to-video`, `veed/lipsync/v2`: alternatives.
- Text to speech, if the voice is not recorded: Groq `canopylabs/orpheus-v1-english`.

## Vision critics

- Gemini 2.5 Pro (`google/gemini-2.5-pro`) through fal `any-llm/vision`: the primary independent critic, about $0.03 per call. Set `reasoning: true`, the model refuses without it. `tools/img.py critique --critic gemini`.
- Z.ai `glm-5v-turbo`: the second critic. `glm-4.6v` and `glm-4.5v` also accept requests. `tools/img.py critique --critic glm`.
- Groq `qwen/qwen3.8-27b`: a fast third opinion that accepts image input. It disagreed with Sebastian's picks in the portfolio's calibration and invented panels on a plain portrait, so it counts as a weak one. `tools/img.py critique --critic qwen`.
- Claude in the session reads PNGs directly. It is the creative director, so it is not the independent critic of its own prompts.

Critics are right on craft and often wrong on structure. Check every legibility or layout claim against the pixels at 1x. See [process-log.md](process-log.md).

## Gaps

- `openai/gpt-5-chat` through fal `any-llm/vision` is wired in `tools/img.py` as `--critic gpt5` and has not been calibrated.
