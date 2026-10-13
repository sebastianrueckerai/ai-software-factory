# The builder's brief

You build one prototype of the Factory console in one direction. Read, in this order, before writing a line: `../brief.md`, `../ia.md`, `../inventory.md`, `README.md` (the mechanics every prototype has), `scenarios.js` (the data), `../themes/<slug>/DESIGN.md` (your rule set) and your direction's images in `../rounds/01-directions/<slug>-dark.png`, `<slug>-light.png` and `../rounds/02-depth/<slug>-*.png` when they exist. The images are the target, the theme is the rule set, `ia.md` is the floor.

Deliverable: `<slug>/index.html`, one file, plain HTML, CSS and JS, loading only `../scenarios.js`. No framework, no CDN, no web font request (a system stack, or describe the intended face in a comment and use the closest system stack).

Required hooks, so the shared scripts can check and shoot every prototype the same way:

- `<html data-theme="dark">` with `#theme-toggle` switching it; `?theme=` and `?scenario=` honoured on load.
- Regions: `#pulse`, `#chat`, `#board`, `#drawer` (a `role="dialog"`, hidden until opened, docked at the right edge, over the board, never over the chat).
- Every card element has `data-card="<issue number>"`; its title is a `<button data-open>` or `<a data-open>` that opens the drawer for that card.
- The chat's composer is a `<textarea>`; Enter sends, Shift+Enter breaks. A proposal's buttons read exactly "Do it" and "Skip"; after Do it the proposal becomes an "applied" line with an "undo" control.
- The scenario switch has `#scenario` (a select or buttons) and the four names busy, idle, fire, quiet.
- Needs you actions carry their exact labels: "Approve as you", "Deny", "Split", the choice buttons, "Or in your words" (or the open text box), "Grant one session with this answer" on a capped card.

Check and shoot yourself before reporting:

```
NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright node check.js <slug>
NODE_PATH=/tmp/claude-1000/pw/node_modules PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright node shoot.js <slug>
```

`check.js` must print "ok". Look at every PNG in `<slug>/shots/` yourself and fix what is wrong: cut-off content, overlaps, unreadable text, a drawer over the chat, a phone layout with horizontal scroll, a light theme that is only an inverted dark one. Compare the busy dark shot against the round 01 image: same hierarchy, same mood.

Report: the file path, the check's output, what you deviated from the images and why, and anything you could not make work.
