# Design decisions: the console

One entry per decision, newest last. Never reverse one silently. Propose a change as a new entry that names the one it amends. The factory's rulings (architecture.md) stand above these; a decision here that touches a ruling says so.

## C1. The hierarchy: pulse, chat, board (2026-10-14, Sebastian)

Three elements in order of weight: the pulse on top, the chat as the main affordance, the board for the granular task state. Today everything looks equally important and full of writing. The drawer docks to the right edge and leaves the chat free. On a phone the screen is the chat first with the board below, not two tabs.

## C2. Prototypes by any means, the console implements the pick (2026-10-14, Sebastian)

The round may prototype in plain HTML or React; the aim is a better design and UX by whichever way. The console's Go templates and CSS take the picked design afterwards.

## C3. The spending cap of the design round is $100 (2026-10-14, Sebastian)

For fal and other services. Tokens are not capped. The run goes overnight; the director picks provisionally between rounds and Sebastian's picks in the morning are the decisions.

## C4. Needs you is the first column, prominent, never a tray (2026-10-14, Sebastian)

The Needs you column looks different from the other four and louder: its own fill, rule and header. It stays a regular column of the board, so seven waiting cards read like any column that grows downward. A tray or band across the top of the board is out: with seven cards it wraps into rows, scrolls inside itself and squeezes the board (seen on the Mission control prototype at 1440 and 1920). Done stays quiet.

## C5. Mission control is the direction (2026-10-14, Sebastian)

Of the ten prototypes, 06 Mission control goes on: the amber Needs you column, the instrument strip, the chat as the console on the left, the event ticker. Taken into it from the others: the chat turns of 09 Inbox first (an avatar, the name and the time above the text). Sebastian's reservations noted for the implementation: the screen is busier than the calm directions, so every loop asks what can go quieter.

## C6. Live dots (2026-10-14, Sebastian)

The state dot of a working card breathes, an in-review card's dot slower. Under reduced motion they stand still.

## C7. The board after the lanes collapse, and the status line expands (2026-10-14, Sebastian)

Items 225 and 226 of the roadmap applied to the design: no lane columns, no Plan, Ready, Start plan or Accept plan buttons; the track is chosen at filing (New task gets Track instead of Lane); Queued holds cards waiting for capacity or dependencies; a working card names its stage (planning, building, verifying); Needs you holds merge decisions, questions (a plan's open questions among them) and capped cards; "Approve as you" is "Approve", since every action is the member's own; the whole card opens the drawer and Files is the last tab. The status figures row expands on click into the working cards, the cards that need you, the spend today and this month as gauges, the provider state and the GitHub pull requests.
