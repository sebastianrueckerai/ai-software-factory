# Round 07: the notifications panel

The condensed round (design/process.md) for the messenger panel of roadmap 145. Phase 1 landed its controls plain; this round sets the look. Sebastian delegated the pick to the director for this round ("You pick the design you think best!", 2026-10-17); the pick below is provisional under that delegation and his pick overrides it.

## What the round designs

1. The connections section: Connect Telegram (which turns into the deep link with its one-time code once pressed), Connect Discord, the live connections with their Disconnect.
2. The level per project: one row per project the member reads, the derived default (needs-you where the project pings the member, else off) against the member's own setting, the three words off / needs-you / all, Save.
3. The page's shape: one page under the nav, the order and weight of the two sections, the heading.
4. The phone at 390 px.

## What is fixed

- The shell and nav of [layout.html](../../../ai-software-factory-code/internal/console/templates/layout.html); the panel is a full page, one `h2`, the existing routes and controls. No new control and no dropped one: the inventory is phase 1's (connect Telegram, connect Discord, each link with Disconnect, each project row with level select and Save).
- The theme tokens and both themes; every text pair 4.7:1 or better, a fill that carries a state 3:1 (C14, C15).
- The mission-control language of the console: mono for data, lamps for states, quiet by default (C5, C14); the settled row's quiet log as the newest word on quiet (C18).
- The phone rule: 44 px targets, no horizontal scroll.

## References

The control is common; the patterns worth borrowing:

- GitHub's per-repository watch levels (a row per repository, three states, the current one marked) for the level rows.
- Discord's own Connections page (a card per linked app, its service named, one Disconnect) for the connections.
- Telegram's bot deep-link flow (a link that carries a one-time code) for the connect step: the code is the affordance, not a form.

## The questions

- How do the two connect flows read as one pattern, when one is a button that becomes a t.me link with a code and the other is a plain OAuth link?
- How does a member see at a glance which projects page them without a setting, and which word is their own?
- Is a row per project with its control inline the right table, or a quieter list with the control on demand?
- How much instrument (mono, lamps) and how much settings page?

## Limits

Eight directions, one image each in both themes, `google/nano-banana-2.1` as round 02. Carry two or three into at most one fix loop and one compare loop. Two critics, Gemini 2.5 Pro and GLM 5V Turbo. Cap $5 of fal and Z.ai. Stop at the cap or after the compare loop, whichever first.
