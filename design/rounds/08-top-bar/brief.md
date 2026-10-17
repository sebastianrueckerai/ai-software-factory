# Round 08: the top bar

The condensed round (design/process.md) for the console's top bar. The bar today is phase-0 markup: every link the same dim weight, nothing marks the open page, and on the phone it wraps into rows of small text. This round sets the bar's look on the desk and the phone. Sebastian's pick decides; until he picks, the director's recommendation stands as provisional.

## What the round designs

1. Home: today the words "Factory console", the first thing in the bar.
2. The project switcher: a select with the project slug, present only when more than one project is readable.
3. The eight destinations: Board, New task, Projects, Resources, Costs, Policy, Alerts, and Notifications (present only when messengers are wired).
4. The bar's right end: the theme selector and the member's name with Log out.

## What is fixed

- The shell: one bar over every page, 44 px, on `--bg`, a 1 px bottom border in `--line`. A second stacked bar only where a direction argues it; total chrome at most 88 px.
- The theme tokens of [06-mission-control](../themes/06-mission-control/DESIGN.md) and both themes; every text pair 4.5:1 or better, a fill or line that carries a state 3:1.
- The mission-control language: mono for figures, small capitals for labels, lamps for states, quiet by default (C5, C14, C19).
- Cyan marks system, amber marks needs a person. No new colour.
- The theme selector exactly as C15 decides it: moon and sun in a 48 by 24 frame, before the member's name.
- C18 and C21: the two-pill inbox badge lives on the chat's thread switcher and the tab title counts bare. The bar does not re-count them; at most a lamp without a number, and only where a direction argues it.
- Motion: hover 120 ms of colour or border only; focus a 2 px cyan outline at 2 px offset; nothing moves under reduced motion.
- The phone: page 390 px wide, every target 44 px, the bar holds home, project, theme and a Menu with the rest (the theme's phone rule).
- Everything under the bar is context for fit, not this round's subject.

## References

A common control; a desk list from prior art, not a live survey:

- GitHub: an identity bar over a tab row, the tab's underline active, a kebab for overflow.
- Linear: one flat bar, a tinted active tab, nothing folds.
- Grafana: tabs under the bar, left-aligned to the content.
- Sentry: centred segmented tabs.
- Stripe's dashboard: the active pill in a second row.

To avoid: two chrome rows on the phone, icon-only destinations, a menu that hides Board.

## The questions

- Where you are: underline, lamp, fill or word colour, what marks the open page?
- Does New task, the one action, stand apart, and how, with no new colour?
- Grouping: Board against the reference pages against Policy, Alerts, Notifications: hairlines, spacing, or flat?
- Width: with the long slug `ai-software-factory-code` and at 1024, what folds first and into what?
- The phone Menu: a sheet, an anchored panel, an expanding row?
- Does Notifications carry a lamp that mirrors needs-you, next to C18's pills elsewhere?

## Limits

Eight directions, each drawn at 1440 and 390, in both themes (four images each), `google/nano-banana-2.1` as rounds 02 and 07, $0.10 an image, about $3.20 before fixes. Carry two into one fix loop and one compare loop. Two critics, Gemini 2.5 Pro and GLM 5V Turbo. Cap $5 of fal and Z.ai. Stop at the cap, the compare loop or 90 minutes, whichever comes first.
