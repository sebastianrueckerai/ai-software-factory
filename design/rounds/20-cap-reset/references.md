# References: a temporary override of a recurring limit

Checked live on 2026-11-20 by a research helper; the claims it could not verify are listed at the end.

No product I found has your exact control, "reset today's count to 0, the cap stays". The closest are the Azure "current billing period only" option and the AWS Budgets "Reverse, then Reset" flow. Both have the human press once and let the period end undo it. I could not read several Apple, Microsoft, Monzo and bank pages in full (see the end).

## Products

| Product | Control (exact wording) | Where | Human picks | Reverts on its own | Who | Shown afterwards |
|---|---|---|---|---|---|---|
| Azure spending limit | "Remove spending limit for the current billing period" or "Remove spending limit indefinitely" | Banner on the subscription overview | Period or indefinite, plus a payment method | Yes for "current billing period only": limit turns on at the next period | Account Administrator | Banner to turn the limit back on (indefinite case) |
| Apple Screen Time | Parent: "Approve for 15 minutes", "Approve for 1 hour", "Approve all day", "Not Now". Child: "One More Minute", "Ignore Limit" (third-party only) | Child's block screen, request in Messages | Duration of 15 min, 1 h or all day | Time-boxed. "All day" length is not defined | Parent, with a Screen Time passcode in person | Not found |
| Family Link | "Bonus time" | Screen time, under the child's device name | Any amount, typed or stepped | Described as extra time "for the day". Not confirmed | Parent | Can be removed by tapping it again |
| Claude Console | "Adjust limit" / "Set limit". Also "Request tier increase" | Spend limits page | A new amount, below the tier cap | No. The block lifts at 00:00 UTC on the 1st | Not stated | Not stated |
| Vercel Spend Management | "Pause production deployments", then "Resume Project" | Budget row menu, per project | Amount per cycle. Resume is per project | No. Raising the budget does not resume, but the page offers to | Owner or Billing role | Activity log lists pause and unpause. A paused site serves a 503 |
| GitHub budgets | "Stop usage when budget limit is reached" | Budgets and alerts | Amount | Block lasts "until the next billing cycle or until the budget is increased" | Org owner or billing manager | Not found |
| Supabase Spend Cap | Toggle under Cost Control | Org billing page | On or off | No. The restriction lasts until the next cycle | Not stated | Not stated |
| AWS Budgets actions | "Run action", "Reverse", "Reset" | Budget details, Action history | Approve, undo, re-arm | "Reversed" actions are not evaluated for the rest of the period | IAM-permitted user | Action history shows Standby, Requires approval, Completed, Reversed |
| Monzo | "Request a temporary limit increase" | Manage account, then Limits | Not stated | Not stated | Monzo decides (a request, not a press) | Not found |
| Bank of Cyprus (via search snippet) | Temporary daily raise, up to 15 days, cap €30,000 | App | Days and amount | Presumably, per the snippet | Cardholder | Not found |
| Netlify | Auto recharge and credit packs | Billing | Pack size | No. The credits have no expiry | Not stated | Not stated |
| Google Cloud budgets | None. Budgets alert only. "Limit spending by disabling billing" is an example automation | Budget notifications | None | Not applicable | Not applicable | Not applicable |
| Mobile add-ons | Data add-on | Account | Pack | Yes. EE, BT and Tello add-ons end with the bill cycle | Account holder | Not found |

## Patterns

1. **Override for the current period only.** Azure, AWS Budgets (Reverse), Apple "Approve all day", Family Link "Bonus time".
   - Good: one press, and the next period starts normal.
   - Bad: Azure forces a payment-method step, and Apple's "all day" boundary is undefined.
2. **Time-boxed raise with a choice of 15 minutes, 1 hour or all day.** Apple, Bank of Cyprus.
   - Good: a short window limits the damage.
   - Bad: a choice costs a decision at the moment the owner wants none.
3. **Set a new amount.** Claude Console, Vercel, GitHub, Supabase.
   - Good: simple and explicit.
   - Bad: this changes the standing cap, which you want to avoid. Nothing reverts it, and the owner must remember to lower it again.
4. **Pause and resume.** Vercel and AWS (Reverse, then Reset).
   - Good: the audit trail is clear, with a status per action and an activity log.
   - Bad: Vercel needs a manual resume per project even after you raise the budget.
5. **Request and approve.** Apple, Microsoft Family Safety, Monzo.
   - Good: it gives a second check against impulse.
   - Bad: it assumes two people. A lone owner would be approving his own request.
6. **Top-up add-on, bought when the allowance is spent.** Netlify, mobile data.
   - Good: the extra cost is bounded and known up front.
   - Bad: it adds money, not a reset. It also does not expire in Netlify's case.

Fit for you: pattern 1 with Azure's wording and AWS's history. One press, no amount, no duration. The period boundary undoes it. A visible "Reversed"-style history row records who pressed it and when. Avoid pattern 5 because the owner is the only human.

## Not verified from a live page

- Apple "Ignore Limit" and "Remind Me in 15 Minutes". Only third-party pages and Apple Community threads name them. Apple's own pages gave the approve options and "One More Minute" once.
- Whether Family Link bonus time expires on its own. The page says "for the day" but does not state expiry.
- Microsoft Family Safety. I found no official page, only third-party guides and forums, so I put no Microsoft claim in the table.
- Monzo duration, who approves, and whether it reverts. The page is silent.
- Revolut, N26, Chase, DKB, Sparkasse. I found no official page for a temporary raise. A search result said that Deutsche Bank customers must reset a one-time raise themselves, and I did not fetch that page.
- Bank of Cyprus figures (15 days, €30,000). They come from a search snippet. The page itself returned 404 when fetched.
- OpenAI. The docs say usage tiers raise automatically with credit purchases. I found no one-period override.
- Mobile data. EE, BT and Tello behaviour comes from search snippets, not fetched pages.
- Fly.io. I did not check it.
- The AWS "Reset" detail in the Pattern 4 text is from the doc page. The table shows no UI for who may press it.

## Sources

- Azure: https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit
- Apple parent options: https://support.apple.com/guide/child-safety/dq4vly6fq1je/web
- Apple limit prompts: https://support.apple.com/en-lamr/108806 and a third-party guide at https://www.airdroid.com/ios-parental/disable-one-more-minute-screen-time-iphone-ipad/
- Family Link: https://support.google.com/families/answer/7103340
- Claude Console: https://platform.claude.com/docs/en/api/rate-limits
- Vercel: https://vercel.com/docs/spend-management
- GitHub: https://docs.github.com/en/billing/tutorials/set-up-budgets
- Supabase: https://supabase.com/docs/guides/platform/cost-control
- AWS: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-action-review.html
- Monzo: https://monzo.com/ie/help/using-monzo/help-limits
- OpenAI: https://developers.openai.com/api/docs/guides/rate-limits
- Netlify: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- Google Cloud: https://docs.cloud.google.com/billing/docs/how-to/notify
- Bank of Cyprus (snippet only): https://www.bankofcyprus.com/en-gb/Personal/cards/card-transaction-limits/
- EE, BT and Tello (snippets only): https://ee.co.uk/content/dam/help/terms-and-conditions/mobile/pay-monthly/add-ons/ee-paym-data-add-ons-stay-connected-data-pass-tncs-17082026.pdf, https://www.bt.com/help/mobile/what-are-bt-mobile-uk-add-ons-, https://tello.com/help_center/does-my-data-add-on-expire
