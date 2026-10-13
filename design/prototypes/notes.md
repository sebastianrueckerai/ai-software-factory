# The prototypes: the director's view

Ten directions built as single-file HTML prototypes in one night, each by its own builder (Opus) from the theme, ia.md, inventory.md, scenarios.js and the round images. Every prototype passed `check.js` (every inventory control present, the mechanics work) and was shot by `shoot.js` in both themes and all four scenarios. Each got two or three critique loops: the critic (Gemini 2.5 Pro through fal) saw the round 01 target beside the real screenshots, the director filtered its findings into a numbered fix list, the builder fixed and re-shot. Cost of the critiques: about $0.03 each. The prototypes themselves cost nothing but tokens.

## Ranking, provisional (director, 2026-10-14 night)

Judged on the busy screen in both themes, the idle screen, the drawer and the phone, against the brief: pulse first, chat as the main affordance, board quiet, Needs you the loudest, and the "slick, professional" reaction from a visitor.

| # | Direction | Critic match/wow per loop | Why it sits here |
|---|---|---|---|
| 1 | 06 Mission control | 7/6, 7/6 | The one most likely to get "wow": the amber tray, the instrument strip, the ticker, and it stays readable. The light theme took a loop to find its day mood. |
| 2 | 11 Terminal | 8/7, 9/8 | The critic's top score. A deliberate instrument, not a retro joke; the inverted Needs you header is the clearest "act here" of the set. Risk: a visitor who is not technical reads it as "for developers". |
| 3 | 10 Command palette | 9/8, 7/7 | The chat as a command bar is the strongest reading of "chat as the main affordance". The sheet under the bar costs the board its first screen; the fix keeps the first Needs you item above the fold. |
| 4 | 02 Geist contrast | 7/6, 8/7 | Sharp, exact, one warm colour. The closest to Vercel. Nothing to apologise for. |
| 5 | 09 Inbox first | 8/7, 8/7, 7/7 | The clearest "what needs me". The board as a strip that unfolds is a real idea; the critic misreads the drawer (it shrinks the page, it never covers the chat). |
| 6 | 16 Messenger dock | 7/6, 8/7 | The friendliest for a visitor. The pulse moved to the top in loop 1; the chat dock reads as the product. |
| 7 | 03 Soft SaaS | 8/7, 6/6, 6/7 | Warm and rounded; the light theme is its real form. The chat-above-board layout needs a tall screen; at 900 px the fold cuts the board. |
| 8 | 01 Linear calm | 6/5, 7/6 | The control. Correct, calm, forgettable. It shows how much the shared IA alone improves on today. |
| 9 | 04 Swiss grid | 7/6, 8/6 | The most "design studio" and the hardest to use at 1440: equal halves leave 101 px columns. Strong at 1920. |
| 10 | 13 Factory floor | 7/6, 6/5 | The theme carries, the board stays louder than the chat after two loops. A good second skin, not the first. |

## What the round settled

- **The shared IA works in every direction.** Pulse band on top, chat as a region, the five columns with a quiet card face, the drawer docked right, the phone as one column: ten different looks, one structure, every control present.
- **Needs you as a tray or an inbox beats Needs you as a column.** 06, 09 and 16 make the two decisions the loudest thing without any colour trick; 01 and 04 as columns need a fill to compete.
- **Done must be dimmer than Queued.** Every first build had Done too loud; every loop 1 fixed it the same way: faint token, no icons, no state word.
- **The light theme is designed, not inverted.** The critic called four first builds "an inversion"; the ones that passed changed the surface model (cream, paper, concrete), not only the tokens.
- **The chat's start line fills the void.** A chat with two messages and a bottom-aligned log looks empty; the inventory's start line at the top of the log fixes it everywhere.
- **The critic is right on craft, wrong on structure.** Cut-off text, contrast, tap targets: take them. "The drawer covers the chat" and "the layout is tabbed": check the screenshot first.

## Sebastian's call

`PICKS.md`: which one becomes the console, or which two go one more round. The implementation in the console's templates and CSS follows the pick.
