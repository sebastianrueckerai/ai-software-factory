# Round 07, notifications: notes

The run of [the brief](brief.md), roadmap 145. Eight directions from one shared deck, both themes, `google/nano-banana-2.1` at $0.10 each: [the dark sheet](contact-dark.jpg), [the light sheet](contact-light.jpg). The panel is phase 1's controls ([the plan](../../../docs/plans/2026-10-14-messenger-notifications.md)); the round sets their look.

Sebastian delegated the pick for this round ("You pick the design you think best!", 2026-10-17). The pick below is the director's, provisional under that delegation; his pick overrides it.

## The directions

The director's view from the sheets, before the critics:

- **instrument.** One monospaced readout, two tables over rules, square lamps on the states. The console's own language (C5, C14) with nothing added. Fault: the render's heavy borders and its cryptic bracket options.
- **cards.** Discord's own connections page: two cards, soft fills. A settings page, not a console; the light theme washed out.
- **watch.** A pill for the current level plus a dropdown at the right: two controls for one choice, and the pill's cyan border marks an override on one row and not another.
- **log.** Quiet one-line rows, a tamed terminal. The best quiet, but the actions whisper: connect and save barely read as things to press.
- **split.** Connections in a left pane, levels at the right. A dashboard split that wastes the left pane and stacks on the phone anyway.
- **segmented.** A three-stop control per row, clean and legible. Consumer idiom; ten rows become a wall of toggles.
- **phone.** A 720 px column on a 1440 canvas. Fine at 390, thin on the desk.
- **teach.** A notification preview strip and an explainer line per row. It teaches on the first visit and chatters on every later one, against quiet by default.

## The critics' ranking of the directions

Gemini 2.5 Pro and GLM 5V Turbo over both sheets, [the prompt](critique/prompt.md), [Gemini](critique/gemini.json), [GLM](critique/glm.json), $0.03 each.

| Direction | Gemini | GLM | Sum | Both critics' worst fault, shortened |
| --- | --- | --- | --- | --- |
| log | 47 | 41 | 88 | Gemini: none but its spartan strength; GLM: no visible affordances, reads read-only. |
| instrument | 40 | 42 | 82 | Gemini: heavy character borders; GLM: fixed columns choke on long names. |
| teach | 45 | 29 | 74 | Gemini: the question-mark icon; GLM: verbose copy against quiet by default. |
| watch | 32 | 40 | 72 | Inconsistent override marks; lamps too subtle to read. |
| segmented | 37 | 32 | 69 | Consumer segmented controls against the brief; wide rows. |
| split | 27 | 37 | 64 | The two-column split does not scale. |
| cards | 30 | 33 | 63 | Ignores the mission-control character. |
| phone | 28 | 30 | 58 | A mobile OS page, not a console. |

Claims overruled after checking the pixels:

- Gemini's 10 for log's level-at-a-glance rests on a "[[level]] versus [level]" double-bracket syntax. The cells show single brackets and a plain "default:" word. The score rides on a detail that is not there.
- GLM's fault against instrument, fixed-width columns choking on long names, is true of the render and false of the build: in HTML the name column flexes and wraps, the state column keeps one width.
- Both critics read the render's border weight as the direction's choice. The brief fixes hairline borders; the fix loop restates them.

Carried into the fix loop: **instrument and log**, the pair every judge put first or second. Teach drops: its explainer lines and preview strip add content the inventory does not hold.

## The fix loop

One loop, two directions, both themes, [instrument](prompts/instrument-fix.txt), [log](prompts/log-fix.txt), $0.10 each. Instrument gained: hairlines only, square lamps on the connections too (lit cyan for connected, unlit for not), bracketed text actions everywhere, defaults dim against own words at full strength. Log gained: bracketed actions, a lamp before the state word, no folded rows, strict columns.

The compare pass, [the prompt](critique/compare-prompt.md), [Gemini](critique/gemini-compare.json), [GLM](critique/glm-compare.json), $0.03 each, over [the compare sheet](compare.jpg): both critics pick instrument, independently, for the same reason. Log's remaining fault is structural: the state and the options share one bracket language, so the current setting hides ("which of the three is active?"). Instrument's remaining faults are render idioms the build replaces: the bracket level words become a real select, the bracket actions real buttons. Gemini called the per-row Save redundant; the inventory fixes it, so it stays.

## The recommendation

Instrument. The whole page is one monospaced readout: a connections table (venue, state with its square lamp, action) over a rule, then a level table where each row carries the project, its state ("default: needs-you" dim with its lamp, the member's own word at full strength), the three words as a real select, and Save. Hairline rules carry the layout, no card fills. The lamps speak for both tables in one language: lit cyan for connected and for an own level, amber for needs-you, unlit for off and not connected. On the phone the tables become stacked rows, the select full width, every target 44 px.

Runner-up: log, the quietest page of the eight. It lost on affordance, not on character; a future surface that is read-only telemetry should steal its lines.

What the build changes from the images: the bracket glyphs are the image model's idiom for a quiet control, not a spec. The build keeps the real controls of phase 1 (Connect as a link and a button, Disconnect, a select with the three words, Save per row) styled to this direction: mono where data lives, hairlines, lamps, no fills.

## Cost

| What | Count | Each $ | Total $ |
| --- | --- | --- | --- |
| direction images, nano-banana-2.1 | 16 | 0.10 | 1.60 |
| fix images, nano-banana-2.1 | 4 | 0.10 | 0.40 |
| critiques, 4 calls | 4 | 0.03 | 0.12 |
| the round | | | 2.12 |

The round's cap was $5. About 40 minutes.

## What worked

Two critics who split on the first pass (Gemini: log; GLM: instrument) agreed once the fix loop had named the affordance question: the page is a control surface, and the log look hides its controls. The fix loop with named fixes did more than a second scoring pass would have. The sums alone would have picked log; the overruled double-bracket claim and the compare pass carried instrument. Checking every legibility claim against the pixels earned its keep twice.

## Built (2026-10-17)

C19 is built: lamps 8 px in both themes (pixel-checked), the act column flush to the row rule (17 px gap, was a 290 px tail), the phone stacked with the select full width. Before and after, magnified, in [ev/](ev/): the whole desk panel, the set column, and the phone rows.
