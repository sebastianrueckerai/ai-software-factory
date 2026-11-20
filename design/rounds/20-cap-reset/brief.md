# Round 20 brief: a human resets a cap's count for the current period

A condensed round: one control, built candidates in the lab, two critics, a recommendation with its runner-up.

## What the round designs

1. **The press.** What one human press does to a spend cap that stopped work or is about to: the day cap (`budget.day_eur`), the factory's month cap (`budget.month_eur`) and a project's month cap (`budget.month_eur` in its file). The standing cap in policy.yaml does not change.
2. **Its place.** Where the press lives: the status panel's Spend rows, the card that waits on the cap, the strip's cell.
3. **The check before money moves.** What the human reads before the press takes effect, and how many presses it takes.
4. **The trace.** How the console shows afterwards that a reset is in force today or this month, and who pressed it when.

## What is fixed

- The shell: the board, the thin status strip that opens the panel on click (C7, C25), the panel's Spend section with one gauge per cap.
- The theme tokens of `internal/console/static/console.css` and both themes. Amber (`--need`) for a gauge close to its cap, red (`--st-failed`) for a hit cap.
- Contrast: every text pair 4.5:1 in both themes. Phone: 390 px, every target 44 px.
- C42: a press answers on the board alone, with no confirmation line above the board afterwards.
- Human only. The press is a console form behind a human's session; the chat, the MCP door, the ladder's rungs and every agent have no tool for it. A human may ask the chat about resets; the chat says where the press is.
- The cap stays enforced by the gateway in code. A reset changes what the cap counts, never the cap.

## The questions the candidates answer

1. Does the human think "start today's count from zero" or "allow N EUR more today"?
2. Which place does the human reach first when work stops: the strip, the panel or the waiting card?
3. What must the human see before the press to know the worst case it allows?
4. After a reset, does the gauge read the count since the reset, the day's whole spend, or both?
5. May the human reset before the cap is hit, and does the control say so?

## Limits

- Four candidates at most, one fix loop, one compare pass.
- Spending cap: $3 for the critics. No image generation.
- References: the products surveyed in `references.md`.
