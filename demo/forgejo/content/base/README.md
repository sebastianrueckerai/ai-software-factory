# Nebula Run

Nebula Run is a co-op space shooter that runs in the browser. Up to four pilots fly one ship through asteroid fields, split the roles of gunner, shield and engine, and fight a boss at the end of each sector. The client is TypeScript on a canvas, and a Go game server keeps the shared world in step.

Players buy cosmetic ship skins and sector passes in the in-game store. Payments go through Stripe, and the Go server tells the store when a purchase has to be rolled back, for example when a skin cannot be granted. Run `npm install && npm test` for the client and `go run ./server` for the server.
