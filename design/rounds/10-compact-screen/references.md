# Round 10 references — how other products answer

Survey pass (web research over vendor docs and UX references), 2026-10-19.
Sources are the vendors' own documentation where possible; [unverified]
marks what only community sources or absence-of-docs could support.

## Full-screen toggle of a side panel (a)

Two families: **toggle in place** and **pop out**.

- VS Code: one chevron icon at the panel's top right maximizes it; the
  same control, glyph flipped, restores. Esc also leaves maximized states.
  The purest model. [code.visualstudio.com/docs/configure/custom-layout]
- Gmail compose: a diagonal-arrows (⤢-style) icon in the compose header
  toggles full screen — the accepted glyph for "grow this surface" — plus
  "Default to full-screen" in the options. [support.google.com]
- Gmail's side panel, Slack, Teams: collapse/expand or pop-out to a
  separate window instead of in-place full screen. Not our model (the
  chat is of this screen, not a window).
- Chrome DevTools: dock modes live behind a menu; Ctrl+Shift+D restores
  the last dock. A menu hides the state; we want it visible.

**Carried into the directions:** an icon-only toggle in the chat's head,
glyph flipping between expand (⤢) and collapse (⤡) twins, tooltip naming
the action, aria-pressed carrying the state, Esc as the keyboard way back.

## Compose growth (b)

- The market has settled: **auto-grow with typing up to a cap, then scroll
  inside**. Slack, Discord, AI chat inputs all follow the shape (per-app
  docs silent, pattern standard; css-tricks "auto-growing inputs",
  CSS `field-sizing: content`).
- An explicit expand control appears only where long-form writing is the
  point (Gmail), and it is an icon, not a text word.

**Carried:** the Grow word button goes; the composer auto-grows to about a
third of the screen, then scrolls.

## Drag dividers (c)

- VS Code sashes and Linear's resizable panels are the documented cases.
  Discoverability is weak everywhere: thin hit area, cursor change, grip
  dots rare and undocumented.
- Our hairline-plus-hover-grip with a tooltip improves on the norm.

## Health display (d)

- Status pages (GitHub, Vercel, OpenAI): per-service rows, dot + word,
  under one aggregate banner. Rows when each item is actionable.
- Menubar monitors (Stats on macOS): one lamp per module, dot form, click
  for detail. One lamp when the reader only needs "is anything wrong".

**Carried:** our dependencies are glance-only on a status strip, not an
actionable status page — the lamp form fits; detail on hover, down stays
loud. (The current per-service rows copy the status-page form onto the
wrong surface.)

## Tooltip discipline (e)

- Material 3: icon buttons get a tooltip naming the action. NN/g: icon-only
  ⇒ tooltip; no tooltips on touch, none for vital information.
- WCAG 2.5.8 AA: pointer targets at least 24×24 CSS px.
- **ARIA APG (button pattern): "it is critical the label on a toggle does
  not change when its state changes."** This tensions direction 03
  (swap-words): a visible label that swaps is the classic trap for
  screen-reader users. If 03 survives, its accessible label must stay
  stable while the visible word swaps — a compromise the critics and the
  director must weigh. The glyph-flip family (VS Code) satisfies the rule
  by construction: the glyph changes, the name does not.
