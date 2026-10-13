# Design decisions: the console

One entry per decision, newest last. Never reverse one silently. Propose a change as a new entry that names the one it amends. The factory's rulings (architecture.md) stand above these; a decision here that touches a ruling says so.

## C1. The hierarchy: pulse, chat, board (2026-10-14, Sebastian)

Three elements in order of weight: the pulse on top, the chat as the main affordance, the board for the granular task state. Today everything looks equally important and full of writing. The drawer docks to the right edge and leaves the chat free. On a phone the screen is the chat first with the board below, not two tabs.

## C2. Prototypes by any means, the console implements the pick (2026-10-14, Sebastian)

The round may prototype in plain HTML or React; the aim is a better design and UX by whichever way. The console's Go templates and CSS take the picked design afterwards.

## C3. The spending cap of the design round is $100 (2026-10-14, Sebastian)

For fal and other services. Tokens are not capped. The run goes overnight; the director picks provisionally between rounds and Sebastian's picks in the morning are the decisions.
