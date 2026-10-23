# Round 10 notes — the settling pass

Started 2026-10-19. Director: Claude in the session. Judge: Sebastian.

## Recon (from the code, before any generation)

### "provider ok" — what it means (Sebastian's question, answered from code)

`board.html` "Provider, GitHub, configuration" section:
`provider` = `{{.Waiting}} waiting on the provider` or `ok`.
`.Status.Waiting` counts this project's cards that are `running` in the
progress column whose newest timeline step is a `provider_refused` with no
later session start or hold (`onProvider`, board.go:680, 2217-2218). So
"provider ok" = **no run of this project is currently stalled waiting on the
model provider** (a refusal with backoff, e.g. 429). It is *not* a
connectivity probe. The probe is the dependency row "provider api"
(factoryd `dephealth.go`: `p.Control.Probe`), two rows below, which answers
whether the model gateway answers at all. The strip already carries the
nonzero state ("N waiting on the provider", a warn cell); the panel's "ok"
is the zero state restated, next to another "provider" that means something
else. Round question 4 stands on this.

### The chat's window states (today)

- `#screen.with-chat` grid: `minmax(18rem, var(--chat-share, 4fr)) 10px
  minmax(30rem, 1fr)` — chat min 288 px, board min 480 px, a 10 px
  `#chat-divider` (col-resize cursor, hairline, accent on hover/focus) sets
  `--chat-share`. No tooltip, no grip.
- Full: `#chat-full` word button in the chat head ("Full", title "The chat
  across the whole screen, the board hidden; click it for the board back").
  Pressed = `#screen.chat-only`: board and divider `display: none`. The way
  back is the same button in pressed state (background change only).
- Grow: `#chat-grow` word button beside the textarea ("Grow", title "Grow
  the box for a long message"). Pressed = textarea `.tall`, height
  `min(38vh, 22rem)`. Same-label toggle.
- Threads: the switcher (`#switcher`, `.ttable`) unfolds inside the chat's
  width; at the 18 rem minimum the mark/thread/last rows are cramped.
  Sebastian: with convos expanded the chat's minimum is too small; the
  board's is just right.

### The status detail (today)

`.sp` panel: 2-column grid (1.2fr/1fr) holding three sections — Spend;
Provider, GitHub, configuration; Dependencies. On a 2690 px window it
stretches wide. Dependencies: one `dt/dd` row per service
(forgejo, object storage, postgres, provider api, temporal), each
`● up · detail · age ago`. The strip already has a dependencies lamp cell
(green/amber/red by aggregate) with a title naming the aggregate state.

### The secondary pages (today)

- No content measure: `main { padding: 10px 12px 12px; }`, no max-width —
  tables and lists stretch to the window (Sebastian's 2633 px shot).
- Settings: a `<ul class="rows">` of `Label: value` `<li>` lines — no
  alignment, the colon floats per line. (`.rows` styling: none found beyond
  list defaults — the class is unstyled in console.css.)
- Costs: two full-width tables. Resources: figures line + jobs table.
  Policy: projects table. Notifications: C19 readout, fixed.

### Tooltips today (present/absent inventory)

Present: Full, Grow, intake, New, spend cell, deps cell, chat-start line,
swtg ("Unfold the threads"), col-menu summaries, find-x, since-chips.
Absent: the divider, the strip's state/working/needs cells, the autonomy
glyph (has aria-label only), the lamps (sp-dl dots), the theme toggle
(C23), the documents/close controls on some states, `.chat-queue` edit
rows (has title), the board's view-toggle ("Wide view" has aria-keyshort
but its title?—to check at build time).

## Director's before-pass (Sebastian's four screenshots, 2026-10-19)

1. Main view: three same-size text chips ("Full", "intake open", "New")
   at the chat head's right — window state, intake state and an action
   read as one row of equal mystery words. The composer repeats the
   pattern ("Grow", "Send").
2. Chat full screen: the pressed "Full" is the only way back; nothing on
   the screen says the board still exists. The composer box spans the
   whole 2600 px width — a full-screen chat makes an absurdly wide input
   before the conversation's own measure caps it.
3. Status detail: three sparse blocks spread across 2690 px with dead air
   between; the dependencies rows read "up · · under a minute ago" (an
   empty Detail still prints its separator — a template defect worth
   fixing at build time); "provider ok" next to "provider api" two rows
   below, two meanings of one word.
4. Settings: the `ul.rows` list has no rules, no alignment, no grammar —
   round 09's own built-page critic flagged Settings as not following the
   readout grammar, and the close-out never rebuilt it. The page has no
   measure: rows run edge to edge at 2633 px.

## Run limits (fixed before the run)

8 directions × 2 themes main-view images; Settings fit joins in the fix
loop; lab-built candidates for glyphs/pressed states/tooltips at 1x/3x;
two critics; one fix loop; one compare pass; cap $8; no code before the
pick.

## Log

- 2026-10-19: recon done (this file); brief written; lab "before" run and
  the products survey dispatched in parallel.
- 2026-10-19: survey landed ([references.md](references.md)). Decisive
  finds: VS Code's toggle-in-place (glyph flips, tooltip, Esc) is the
  model for the chat's full-screen; the composer market settled on
  auto-grow-then-scroll (the Grow word button goes); status pages use
  per-service rows but a strip wants the menubar monitor's one-lamp form;
  ARIA APG forbids label-swapping toggles — direction 03 carries a known
  compromise, noted for the critics.
- 2026-10-19: eight direction prompts + shared shell/content/palettes
  written; 16-image breadth generation running (gen16.sh, nano-banana-2.1,
  first run failed on a script path bug, fixed).
- 2026-10-19: gen16 done — 16 images + sidecars in cand/, $2.40 of the $8
  cap. Director pre-pass (contact sheets at 1x, three cells at full res):
  all eight render coherently; nano-banana garbles the repo/service names
  in places ("borges" for forgejo in 01) and scatters bracket-ish pseudo
  text in board cards (worst in 08) — tolerable at direction level, the
  fix loop must pin the exact spellings. 06 leans maximal (lamp squares
  also on strip cells, a DEPENDENCIES block of rows) — its own brief, not
  a violation. Lab-built candidate sheet controls.html (real
  console.css @86340274): four window-control candidates A–D in both
  states, hover-grip divider, dependency lamp chips with a painted
  tooltip, auto-grown composer; shot at 1440/390 both themes. A 4.5-model
  pre-read of the sheet raised four defects; all four overruled at 3x
  pixels (SVG glyphs clean, tooltip on provider api not postgres, grip
  reads as a vertical pill — acceptable, composer intact).
- 2026-10-19: contact sheets montage (contact-dark.jpg, contact-light.jpg);
  Gemini and GLM breadth critics dispatched on both sheets.
- 2026-10-19: **lab before-run is RED** at code HEAD 86340274 (261 shots,
  11 findings, none mine — no code touched): tab title not split; busy
  missing "Two cards need your decision"; busy horizontal scroll at 1440
  (1508); drawer missing "Chat" tab; drawer and docs panels over the chat
  (772 < 928); busy columns 0/1/3 bodies scroll sideways; idle/quiet
  missing their status lines; phone targets under 44 px (threads,
  escalation: BUTTON 30 ×2). The round's build stage clears these with
  the picked design.
- 2026-10-19: breadth critics landed ([gemini](critique/breadth-gemini.md),
  [glm](critique/breadth-glm.md)), near-perfect agreement. Ranking (G / L):
  06-one-instrument 1/1, 04-snap-drag 2/2, 02-glyph-cluster 3/3,
  08-panel-tabs 4/4, then 03 5/6, 01 6/5, 05 7/7, 07-quiet-hover 8/8 —
  both drop 07 (hides failure signals; light theme unusable). Both carry
  06 + 04.
- Director's merge, with overrule: **carry 06 and 02, not 04.** Both
  critics themselves flag 04's weakness — "less immediately discoverable"
  (Gemini), return "doesn't rely on memory" (GLM) — and undiscoverability
  is Sebastian's own complaint axis ("most people won't know what these
  do"). Pixel check of 06 confirms its window control is still a FULL word
  button (the incumbent Sebastian rejected) and its composer has a manual
  drag handle against the survey's settled auto-grow; 02 is the direction
  closest to the survey's answer (VS Code glyph toggle, auto-grow, lamps)
  and ranks third on both lists. 04 is not lost: its snap-drag and "‹
  BOARD" edge tab merge into both revised directions as secondary
  affordances. Fix-loop revisions written (06r, 02r prompts): glyph-flip
  control with stable lit square, 16 px glyphs on 24 px targets, visible
  tooltip, lamp chips row (never stacked), auto-grow composer, exact
  service spellings pinned in _shared-content.md.
- 2026-10-19: secondary-pages lab candidate cand/pages.html (real
  console.css): Settings as a C24 readout (small-caps terms, mono ids,
  hairline groups) and Costs with a thin day-cap gauge, both inside a
  62 rem measure; shot both themes at 1440/390. Render verified clean.
- 2026-10-19: gen4 fix-loop regeneration dispatched (02r + 06r × dark +
  light).
- 2026-10-19: gen4 landed (4 images + sidecars, $0.48 more → $2.88 of
  $8). Director pass on both dark revisions at full res: the glyph toggle
  with painted tooltip, the lamp chips row, the auto-grown four-line
  draft and the unfolded threads all took; service names spell clean.
  Round page drafted (index.html, compare/recommendation pending);
  Sebastian's four before-screenshots copied to ev/. Compare critics
  (gemini + glm) dispatched on the 4 revised images + lab-pair sheets.
- 2026-10-19: Gemini compare landed: 02r carries as recommendation, 06r
  fails (chips nested in a labeled instrument box; prompt-text leakage
  under the light variant's composer — pixel-verified at 3×, stands);
  control pick C (glyph + stable word); Settings readout and measure
  confirmed good. Its Costs "header misalignment" overruled: pixels show
  the .num columns right-aligned under their headers (console.css:1244),
  and the headers it quoted do not exist. Its "OPEN box" claim half
  stands: one hairline container does wrap the chips in 06r-dark.
- 2026-10-19: GLM compare landed: both carry (02r clean, 06r minor);
  control pick A. Its three defects: "Send contradicts no-button"
  overruled (the rule retired Grow, not Send); circle-vs-square lamps
  stands as a build note; "Settings sentence case" overruled (it read
  the strip's readout line; the terms render small-caps).
- 2026-10-19: round page finished ([index.html](index.html)):
  recommendation **02r glyph-cluster** (runner-up 06r), control **A**
  (fallback C), pages join the build as-is. Cost ≈ $3.00 of $8. Awaiting
  Sebastian's pick; no code before it.
