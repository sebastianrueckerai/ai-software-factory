# Factory defects found while building the scenes

Three real defects in the factory itself, not in the demo. They need cards in the code project (`ai-software-factory-code`). Sebastian files cards; intake is closed to agents without his word. Each is small; expect about €1 to €2 of model spend per card.

```
Title: Drawer: the Supervisor column reads the check-in step
Body: factoryd records a supervisor decision as the timeline step "checkin"
(internal/factoryd/runner.go:1309), but the drawer's Supervisor column reads only
"supervisor" and "gate_supervisor" (internal/console/board.go:2679,
internal/console/chat_sessions.go:419). On the live factory the column stays empty.
Acceptance:
- a card whose session the supervisor redirected shows the decision in the Supervisor column
- the lab's busy scene and the console tests cover the checkin step
Size: small
```

```
Title: Wake line: the ask count reads in the singular and the plural
Body: internal/factoryd/wakes.go:362 prints "Wake: %d asks wait for a human." for any
count, so one ask reads "1 asks wait".
Acceptance:
- one ask reads "Wake: 1 ask waits for a human."
- two read "Wake: 2 asks wait for a human."
- a test pins both
Size: small
```

```
Title: Board: a plan child shows its title, not its key
Body: the board titles a card by its summary, then its plan key, then its objective's
headline (internal/console/board.go:1442). Plan children are filed with a key and no
summary, so the board shows slugs such as "week-view" where every other card shows a
sentence.
Acceptance:
- a plan child without a summary shows its objective's headline on the board and in the drawer
- the key stays on the card's plan chip
- the lab's busy scene plan children show titles
Size: small
```

Found and already fixed on main: the lab's structural check (`scripts/console-lab/check.js`) expected the text "model mix", which the two-model-classes commit had replaced on the metrics page, so the check had been red on main. It now expects "spend by model" and "served by".

When the scene 8 and scene 25 recordings are regenerated after these fixes, their frames change: scene 8's supervisor row would show in the column, scene 25's wake line would read "1 ask waits".
