# Creative brief: the Factory console

## The product

The console is the one screen a member uses to steer a software project that agents build. Server-rendered Go templates with htmx, one stylesheet, a dark and a light theme. Five parts, one job each (ruling 251): the status line (what is the state), the pulse (what to understand about it), the board (five columns: Needs you, Queued, Working, Verifying, Done), the chat with the project agent (ask or change anything) and the card drawer (everything about one piece of work). Secondary pages: Costs, Resources, Projects, Alerts, Policy, a card's Timeline, New task, New project.

## The goal

Two readers, one screen.

- A member reads the state of a project at a glance: what needs me, what is working, what did it cost. Then acts in one click.
- A visitor who is not technical (an investor, a client, a hiring manager) sees the screen over Sebastian's shoulder and thinks "wow, that looks cool, slick, professional". The console is the face of the factory.

## The impression

- A product by a slick, modern tech company. The field: Linear, Vercel, Raycast, Railway, Warp, Stripe's dashboard, Height. Dense but calm, type-led, exact spacing, one accent, colour that always means something.
- Easy to parse. The important things are seen first: what needs you, the project's state, the spend. Normal states whisper, exceptional states speak (ruling 251). A done card is quiet; a card that waits for a human is the loudest thing on the screen.
- Cool, but a tool. No marketing fluff, no illustration for its own sake, no dashboard-template look.

## The look

- Dark and light are one design in two moods, never two designs. Dark is the default.
- Its own visual language: not a Bootstrap or Tailwind default, not a generic admin template, not a slide deck.
- Range to explore, from calm to wild: the calm corporate end (Linear, Geist), the dense instrument end (mission control, trading floor, Grafana), the editorial end (broadsheet, Swiss grid), the material end (glass, paper, blueprint, factory floor), the keyboard end (command palette, terminal).

## The hierarchy, Sebastian's steer (2026-10-14)

Three elements, in this order of weight:

1. **The pulse** on top: the summary line, the one thing to know now.
2. **The chat** as the main affordance: the place a member acts. It must read as the centre of the screen, not as a side panel.
3. **The board** for the granular task state: there to be scanned, quiet until a card needs a person.

Today everything looks equally important and everything is full of writing, so the eye has nowhere to land. Every direction must show which element is the main one at a glance and make the rest recede. The card drawer docks to the right edge, leaving the chat free; today it opens between the board and the chat, in the middle of the screen. On a phone the screen condenses to the chat first, with the board below it, not two tabs.

## Constraints

- Same controls, same functions. Every control and every data point in [inventory.md](inventory.md) stays reachable. A thing may move: from the face into the drawer, behind an expanded view, a hover, a tab or a new view. It never disappears.
- The information architecture may change: what is on the face, what is in the drawer, what the header holds, where the chat sits, how Needs you is shown.
- Prototypes may be anything that shows the design (plain HTML preferred). The console's own technology, Go templates with htmx and CSS, takes the picked design afterwards; it can carry any look in this brief.
- The accessibility floor stays: 4.5:1 on text, 3:1 on pill fills, colour never the only signal, visible focus, reduced motion respected.
- Works at 1440 and 390 wide. 1920 matters: demos run on big screens.
- The page never shows or explains how it was designed.

## The data

Four real moments of the project `ai-software-factory-code`, served by the lab in the code repository (`scripts/console-lab/run.sh`): **busy** (three working, two decisions waiting, a plan to accept), **idle** (nothing working, the month cap overspent, the real look of 2026-10-13), **fire** (failed cards, a stale card, the provider down, a card at its cap) and **quiet** (one card working, nothing needs anyone). Every version is judged on the same four.
