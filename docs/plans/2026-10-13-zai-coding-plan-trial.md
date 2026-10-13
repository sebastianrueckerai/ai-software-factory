# Plan: the GLM Coding Plan as the coding tiers, on trial

Sebastian's decision of 2026-10-13: try the factory's coding sessions on his z.ai GLM Coding Plan (Max tier, 168 USD a month), he the only user. The terms sit in a grey zone: OpenCode is a supported tool, but the subscription terms name "SDK-based access or other third-party integrations" (section 4.2) as unauthorized, and the factory calls through LiteLLM. He accepts that risk for a bounded trial. Guardrails: sole user, small caps, serial round shape, stop at the first notice on the console's Plan Overview page, DashScope kept as the funded rollback.

## What the probe proved (2026-10-13, local, litellm 1.105.0)

- The plan key works through LiteLLM direct and through a proxy: glm-5.3 and glm-5.3-flash answered on `https://api.z.ai/api/coding/paas/v4` behind aliases under master-key auth.
- The `x-litellm-response-cost` header is present (the field the gateway books), split input, output and reasoning.
- `/model/info` prices the zai models automatically at the pay-as-you-go rates (1.40/4.40 and 0.15/0.50 per million tokens), so the gateway's unpriced-model gate passes with no custom cost entries. Context limits 1M in, 128K out; the worker's fixed 200K fits.
- Latency 1.6 to 2.4 s on trivial calls.
- Not tested locally: virtual-key minting and per-key spend need PostgreSQL (LiteLLM 1.105 refuses sqlite). In the cluster those ride the CNPG database unchanged and are proven daily with DashScope; the provider does not touch them.

## Money without prices

- Real bill: the plan fee. Pools: 28,000 credits per 5 hours, 140,000 per week (Max). Exhaustion is a hard stop; the error is a 429 (code 1113), which parks by ruling 316 at no spend. Peak window 06:00 to 10:00 UTC on weekdays; everything else costs half.
- Modeled money: LiteLLM prices every call at pay-as-you-go rates and the gateway books them USD to EUR 1:1 as today. Every cap, hold, alert, settle and per-key maxBudget keeps working on modeled figures. The ledger's meaning changes, not its mechanics: EUR is what the call would cost without the plan.
- Conversion at the lane's measured call shape (mean 72,433 prompt tokens, 94 percent cached): a frontier call is about 17 credits, a flash call about 5.6; a frontier session of about 200 calls about 3,400 credits, a cheap session of 335 calls about 1,600 (item 160's shapes). A card draws roughly 1,000 to 2,500 credits, 4 to 9 percent of a 5-hour pool. These are estimates; the probe card measures the real draw.
- Tokens per task are the primary fact (roadmap 206, landed first).

## The switch (infra only, no code change)

Landed 2026-10-13, infra commit 31c55da, pushed to GitHub (the Forgejo origin returns
with the re-seed): steps 2, 3, 5 and 6 below. Step 1 takes the plan's one-key branch:
`Z_AI_KEY` seeds `ZAI_CODING_KEY` until a second key exists. Step 4 needed no change:
no egress policy selects the LiteLLM pod (Cilium default allow; only the k8s-infra
collectors and build-cache pods carry policies), and the bundled price map of v1.102.1
(the deployed chart pin) already prices both zai models at the pay-as-you-go figures.
The trial grew into a 72-hour intense-test window the same evening (Sebastian): day_eur
100, month_eur 500, card default 5, LiteLLM proxy 500 USD, the month and proxy high
because the restore brings October's bookings back; back to 40 / 120 / 2 and 55 at the
close. The handover (ledger, handover-next-round.md) carries the window's rules.

1. Sebastian, on the z.ai console: create a second API key for the factory (if the console holds one key only, the trial uses the existing key and rotation replaces it), put it in `.env.tools` as `ZAI_CODING_KEY`, and bookmark the subscription page (quota) and Plan Overview (notices).
2. Secret `platform/litellm-zai` (key `ZAI_CODING_KEY`), seeded by the pattern of `litellm-qwen` (`scripts/seed-secrets.sh:39`), applied before the commit; `environmentSecrets` gains `litellm-zai` in `k8s/platform/litellm/helmrelease.yaml`.
3. Deployments in `model_list`: `glm-frontier` (`zai/glm-5.3`) and `glm-cheap` (`zai/glm-5.3-flash`), `api_base https://api.z.ai/api/coding/paas/v4`, `api_key os.environ/ZAI_CODING_KEY`, `drop_params true`. No `enable_thinking` (Qwen-specific).
4. Egress: the LiteLLM pod must reach `api.z.ai:443`, added beside `dashscope-intl` in the platform egress rule.
5. Trial routing, alias names kept: `model_group_alias` `coding-cheap` to `glm-cheap`, `coding-frontier` to `glm-frontier`. `supervisor`, `review-frontier`, `operator` and `pulse` stay on DashScope: reviews keep qwen's measured latency (210 s on GLM, item 197) and the trial's pool draw stays small.
6. Policy for the trial: `day_eur` 10 (modeled; about 6,000 to 11,000 credits, 21 to 39 percent of a 5-hour Max pool), card caps unchanged (2 and 15), the LiteLLM proxy counter reset at open per the round pattern.

## The trial protocol

1. Stage 19 runs as written first (frozen work on DashScope, funded at 150).
2. Land roadmap 206.
3. Probe card on the coding aliases: one card measures calls, tokens, modeled cost and latency per session in the ledger; Sebastian reads the console's quota before and after for the real credit draw.
4. Up to three more cards, serial shape. No session-concurrency knob exists (Temporal's default governs); the round's dependency shape is the lever. A WIP knob is a one-line `workerOptions` change, built only if the subscription becomes permanent.
5. Verdict: continue if a card leaves the 5-hour pool above half with his local sessions unaffected and no notice; park to item 197 (pay-as-you-go second provider) if the pools drain fast; stop on any Plan Overview notice.
6. Kill order: policy `day_eur` 0 (stops spend in about 30 s), `git revert` of the two alias lines (Flux reconverges within one interval), then revoke the factory key on the console. DashScope needs no re-funding.

## Known losses under GLM

The DashScope-specific refusal strings (content filter, repetitive calls) will not match GLM error bodies: those land as generic upstream refusals, still parked by ruling 316 with a less specific reason. The `reasoning_content` interleaved field the worker config expects may differ; harmless if absent.

## Not in this trial

The unofficial quota endpoints (community-known `/api/monitor/usage/quota/limit`): console checks by Sebastian; a scraper can follow only if the trial continues. The `[1m]` context variants, FlashX, and item 197's pay-as-you-go deployment stay out until the verdict.
