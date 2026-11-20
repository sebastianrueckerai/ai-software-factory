# Round 20: a human resets a spend cap's count for the current period

Working notes of the director. Rebuild from here after a compaction.

## The ask (Sebastian, 2026-11-20)

1. An easy way in the console to reset a limit by hand, no agent able to do it. The caps are too high today because raising them was the only way to keep going. Wanted: "X EUR is a sensible limit, but this day / week / month I reset the count to 0 without raising the limit for good". A UX study and a suggestion.
2. The day cap shows on the closed status strip, at least when it is close. Today it shows only in the expanded panel; he walked into a hit unwarned.
3. Amber is right for a bar close to its cap; a bar whose cap is hit is red.

## What the code does today (code main 9754c6afb)

- Caps live in policy.yaml (infra repo `factory/policy.yaml`): `budget.day_eur` 300 (150 on 2026-11-01, raised 2026-11-14 because "the day turn held three armed cards for hours"), `budget.month_eur` 1500, `budget.premium_month_eur`; a project file may set its own `budget.month_eur`. A raise is a commit.
- One shared place counts the spend: `internal/policy/holds.go` `daySpentSQL`, `MonthSpentSQL`, `PremiumMonthSpentSQL`, and the project query in `ReadFree`. The gateway's Fit, factoryd's `SessionFunded` and `CapResume`, and the strip's `LedgerEnforced` all read them. A reset belongs there, once.
- Ledger rows carry `created_at`, so "spend since the reset" is a plain filter.
- A card refused at the day cap waits (`capWait`), checking every 5 min (day) or hourly (month); a policy load wakes it (`SignalPolicyLoaded`). A reset must wake the waits the same way.
- The card's text today: "Raise budget.day_eur in policy.yaml to resume it sooner, or close the card." (`internal/factoryd/monthcap.go` `capWaitReason`, `activities.go` `SessionFunded`).
- Human-only is enforceable: console form posts need a cookie session plus CSRF; an agent's bearer token reaches only `POST /mcp` (`internal/console/access.go`, `mcp.go`). The reset gets no chat tool, no MCP tool, no ladder rung, and the handler refuses a bot session (`session.fixed`).
- The red bug: `gaugeClass` (`internal/console/board.go`) marks `over` only at spent > cap. Holds keep spend under the cap, so a hit cap stays amber. The gateway logs every refusal in `audit` (decision `refused_day_cap` and siblings, with `ts`), the truthful "hit".
- The strip (`templates/board.html`, define "status") shows the month cell and premium; the day gauge lives only in the panel's Spend section.

## Split

- Fix now (items 2, 3): a helper builds it in `~/repos/ai-software-factory-code/.worktrees/cap-hit`. Hit = a cap refusal in the cap's current UTC period, or spend at the cap. The strip gets a day cell from 80 percent.
- Round (item 1): condensed round, this folder. Built candidates, not images: the question is a control inside an existing panel.

## Decisions taken by the director

- The reset covers the caps that stop work: the day cap, the factory month cap, a project's month cap. Premium falls back to big instead of stopping, and the escalation pool is the ladder's money: both out unless Sebastian wants them.
- No week cap exists; a week cap is not added.

## The round (2026-11-20)

- References: 13 products, six patterns (`references.md`). No product has "restart the count, the cap stays". Closest: Azure's "remove the spending limit for the current billing period" and AWS Budgets' action history.
- Loop 1, four candidates in the lab's fire scenario: A start today over (panel), B lift until 00:00 UTC, C allow an amount, D start over pressed on the strip. Gemini picked B, runner-up A; GLM picked A, runner-up D.
- Overruled: Gemini's B (lifting leaves the month cap, 1,500 EUR live, as the only bound; GLM's safety 3 is right). Gemini's "D's phone confirm is broken": it works but covers the strip's second row, so D2 moved it below the strip. GLM's amber banner for the trace (amber means close to the cap; the faint trace passes 4.5:1 in both themes) and its filled primary at rest (the press spends money; the filled button belongs to the confirm).
- Kept: the confirm button names the money (GLM); the month's press beside the day's is a risk (Gemini, compare).
- Compare, A2 against D2: both critics pick A2 (calm 10 against 3).
- Director's pick: A2 with the press only on a hit row (A3, `reference.png`). Runner-up D2.
- Cost: 4 critic calls, about 0.12 USD of the 3 USD cap. No images generated.
- What worked: injecting candidate markup into the real lab page (round 03's method) made each state cheap to draw; the critics split on the risky candidate, which is the point of two.

## Open for Sebastian

1. The pick: A2 (recommended) or D2.
2. The press on a hit cap only (the director's call), or from amber too, so a reset can come before the stop.
3. The day and month caps once the press exists: the day cap went 150 to 300 only to keep going.
