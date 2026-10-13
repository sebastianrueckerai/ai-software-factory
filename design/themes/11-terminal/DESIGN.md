# Theme: Terminal brutalist

Read off round 01 `11-terminal-dark.png`, `11-terminal-light.png` and the round 02 images (drawer, idle, phone). The images are the target; this file is the rule set a builder follows when the image is ambiguous.

## Idea in one line

The console as a full-screen terminal program: one monospace face, panels drawn as line boxes with their titles cut into the top border, brackets for actions, inverse video for the one thing that needs a person.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| --bg | #0b0906 | #f2ead6 | page, the cut-out behind border titles |
| --bg-raised | #100d08 | #f8f3e6 | the chat REPL, the drawer, the keys box |
| --bg-sunken | #0b0906 | #ebe2ca | the board's boxes (light only: a paper-tape tint) |
| --line | #5e4419 | #a3946f | the board's boxes, row rules |
| --line-strong | #a8792f | #4a4031 | the header box, the chat box, the drawer |
| --text | #ffb238 | #1c1813 | body, 11.1:1 / 14.7:1 |
| --text-hi | #ffd27a | #000000 | the pulse sentence, the prompt |
| --text-muted | #a8792f | #665842 | muted text, done cards, labels, 5.0:1 / 5.1:1 at least |
| --accent | #5fd7e6 | #00687a | links only (anything that leaves the view), 11.4:1 / 5.0:1 |
| --need-bg / --need-fg | #ffb238 / #0b0906 | #1c1813 / #f6f0e0 | inverse video: Needs you headers, primary buttons, selected tab, hover |
| --tint | amber at 7 % | ochre at 8 % | the prominent pulse band, a focused card row |
| --st-running | #ffd27a | #8a4f00 | `[running]` |
| --st-waiting | inverse | inverse | `[waiting on a human]` inside Needs you |
| --st-review | #ffb238 | #1c1813 | `[in review]` |
| --st-done, --st-closed | #a8792f | #665842 | `[done]`, `[closed]` |
| --st-failed | #ff6a55 | #b02a1c | `[failed]`, over the cap, provider down, 6.9:1 / 5.1:1 |

Colour never carries a state alone: every state is a bracketed word, every warning has ⚠.

## Type

One family for everything: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`, line height 1.5.

- Body and board: 13.5 px, weight 400. The card ref bold.
- Chat log and composer: 14 px.
- Pulse sentence: 17 px, weight 700, `--text-hi`.
- Status line and border titles: 13 px. Key hints 12.5 px muted.
- Numerals are monospaced by nature; no case transforms (the labels stay as written: "Needs you", not "NEEDS YOU").

## Layout at 1440 and 1920

A fixed full-viewport program, no page scroll; each box scrolls on its own.

1. **Header box** (strong line). Its top border carries the title row cut into the line: `Factory console │ project ▾`, the page links, then at the right the scenario switch, `[◑ dark]`, `sebastian`, `[Log out]`. Inside: the status line (figures left, key hints right), a rule, the pulse.
2. **Board** (the middle band, the rest of the height). A slim header row `Board · accent ▾ · [wide view] · [?]`, then five boxes in a row with their title and count in the top border: Needs you 1.7 fr, the other four 1 fr each.
3. **Chat REPL** across the full width, the bottom 40 % of the viewport (strong line).

The drawer docks at the right edge, `min(46vw, 720px)` wide, from the board's top to the bottom of the screen; the REPL shrinks to the left of it, so the drawer covers board columns only, never the chat.

Wide view (`w` or `[wide view]`): the cards show their lane badge and the toggle reads `[five columns]`.

## The pulse

The first line after the status line. Prominent (a card needs a person): ⚠, a 3 px left rule in `--text`, the `--tint` band, the sentence bold in `--text-hi`. Subdued: no ⚠, no rule, no tint, the sentence in `--text`. `[more]` unfolds the bullets as `–` lines in `--text-muted`. While it recomputes, a blinking block cursor `▍` follows the sentence.

## The chat

A REPL. The box title in the top border: `Chat ─ project agent · project`, `[New conversation]` and the old-conversations select at the right. The log is IRC-style: `14:21 you:` and `14:21 agent:` prefixes in a fixed gutter, text at most 96 characters wide. Tool blocks are one line `▸ read card #603 · 0.4 s`, opening to arguments and result. A proposal is an indented block with a strong left rule: `I will:`, the changes as `·` lines, the detail muted, then `[ Do it ]` in inverse video and `[ Skip ]` muted. Applied: `✓ applied: … [undo]`. The composer is the last line: a `>` prompt, a one-line textarea that grows to six lines, `[ Send ]`. The queue lists under it as `queued:` lines with `[edit]` `[remove]`. The bottom border carries "This is your own conversation with the project agent; other members have theirs."

## The board and the card

Box titles in the border: `Queued 4`, muted. A box whose content runs past its height scrolls on its own and shows `▾ more` cut into its bottom border until it is scrolled to the end. A card is a few lines with no box of its own, cards separated by a dashed rule:

1. `#601` bold and the title, two lines at most; the whole line is the button that opens the drawer.
2. `[running] · 23 min · 3/4 checks`, then only the exceptional: `€1.72 / €2.00 ⚠ near its budget` from 80 %, the gate and its age, fine states as boxed chips.
3. `› Reading internal/console/board.go…` muted, one line, only on a working card or a waiting one; the stale text in `--st-failed`.
4. Chips as small 1 px boxed labels: `blocked by 2`, `part of plan #558`, `on the provider`, `stale`, the accent as `■ teal` in its accent colour.
5. Actions as compact bracket buttons `[→ Plan] [→ Ready] [Close]`, always visible.

A done, failed or closed card is two short lines in `--text-muted`: ref and title (ellipsis), then `[done] 29 min in all`. A failed card keeps its red `[failed]` and `[Retry]`. A stale card gets a dashed left rule.

Buttons: brackets drawn around the label, hover in inverse video, focus a 2 px outline in `--text` with a 2 px offset. Chips are boxed, buttons are bracketed: a label never looks like an action.

## Needs you

The loudest thing while it holds an item: the box is a 3 px double line (`╔═╗` in CSS) in `--text`, its title `Needs you 2` in inverse video. Each item opens with an inverse header strip: the headline (a button that opens the drawer) and the waiting time at the right.

- Merge approval: `Merge PR #612`, then `[high risk] [migration]` as inverse-outlined chips, `Model review: approve. Adds the column safely.`, `Recommendation: …`, then `[ Approve as you ]` (inverse) `[ Deny ]` `[ Split ]`. Deny unfolds the reason box: a textarea, `Deny by` request changes / reject, and the submit that reads the chosen way.
- Escalation: `#603 Which store for the session table?` as the strip, the full question under it, the choices as bracket buttons, `[ Or in your words ]` unfolding the answer box with `[ Answer ]`, a muted line with the elapsed time and "answer on the issue" (the state word `[waiting on a human]` only in the drawer: the column already says it), the verdict buttons `[real problem] [false alarm]` small at the end, the question "Was this escalation a real problem?" as their group label.
- Capped: the answer box is open and its button reads `[ Grant one session with this answer ]`.
- Plan approval and resource approval (no scenario carries one): the same strip and body; Accept plan / Approve in inverse, Request changes and Reject behind bracket disclosures.

An action answers in place with one `✓` line in `--text-hi`, and the pulse shows its recompute cursor.

Empty (idle, quiet), Needs you whispers like any other box: single line, muted title, equal width with the other four columns.

## The drawer

A pane with a strong line, docked right. Header: `#601` (link to the issue), the title, `[ Esc ]` to close (`[ Close ]` on the phone); the facts line `[running] · 23 min · 3/4 checks · €1.72 / €2.00 ⚠ · lane ready · coding-cheap`. Tabs as bracket buttons, the selected one in inverse video. Overview: the four-line top block as a `Task / Status / Budget / Agent` table with the labels muted, the Open block (a Needs you item in the same strip-and-body form, the merge with its Decision note; a failure reason with Retry; a stale line), then the sections as `▸` disclosures. The merge headline on the board opens the drawer with "Reviews and audit" unfolded. Activity: the gates with a `█░` meter against the longest, the steps table. Files: a table with a git-style `+++−−` stat. Chat: `Session 2 · coding-cheap · running`, the messages in the same gutter as the REPL, the steer prompt.

## The phone

Under 900 px one column and normal page scroll. The title row: `Factory console`, the project select, `[menu]` that unfolds the page links, theme, user, Log out and the scenario switch. Then the status line (wraps), the pulse, the chat REPL with its log at 55 % of the viewport height and the composer under it, then the board boxes stacked: Needs you, Working, Verifying, Queued, Done (folded, its title a button). Choice buttons full width. The drawer takes the full screen.

## Motion

None by default, as in a terminal: hover inverts instantly. The typing indicator and the pulse's recompute show a blinking block cursor; the drawer slides in over 120 ms. Under `prefers-reduced-motion: reduce` the cursor stands still and the drawer appears without sliding.

## Where the inventory went

- The issue link of a card moves from the face to the drawer header and Links; the face's title is the drawer button.
- The More fold, the model alias, the spend under 80 %, backlog activity lines, the failure reason: the drawer.
- Flash line: an inverse line under the status line (`#flash`). The live-stream message: replaces the key hints in the status line (`#stream`).
