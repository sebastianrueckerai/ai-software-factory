# Round 17: the chat token's label and the Tokens section

A human makes a chat token on their Notifications page. Their own Claude Code then speaks in one project's chat as that human. Every chat row a token's turn writes carries the token's name. This round designs how the console shows that name, and how the page that makes a token looks. It is a condensed round by [process.md](../../process.md), built in the lab, with no image generation.

## What the round designs, and nothing else

1. **The label on a human message that came through a token.** A human row in the thread whose stored `token` is set shows the token's name. A row from the browser shows nothing new. The agent's rows of a token's turn carry no label: the label marks what the human's own agent sent.
2. **The Tokens section and its shown-once block** on `/notifications`: the list of the human's tokens (name, project, created, expires, last used, Revoke), the form that makes one (project, name, lifetime, Forgejo token), and the block the answer to that form shows once (the bearer and the `claude mcp add` line).

## What is fixed

- The shell, the top bar and the page's other two sections (Connections, Level per project) as C19, C23 and C24 left them.
- The theme tokens of `console.css` in both themes. No new colour, fill, radius or type scale. Cyan stays the accent, amber stays needs-you, the done green stays a done state.
- The chat row's grammar of C14 and C35: the 22 px avatar, the who line (name, time) in mono, the text at full width, the "not read yet" and "read by the agent" lines.
- The readout grammar of C19 and C24: small-capitals labels, hairline rules, rows on the page ground, the 8 px square lamp, lit cyan for a live state and unlit for an off one.
- The contrast floor: 4.5:1 for text, 3:1 for a fill that carries a state, in both themes.
- The phone rule: at 390 px one column, every target 44 px, no horizontal scroll.
- The data. A token's name is the human's own text, 1 to 64 characters. The bearer is `sfc_` and 43 characters. The line is about 200 characters. Nothing the console stores lets it show either again.

## References from other products

A survey from knowledge, not a live check. Both patterns are old and common.

- The label. Gmail's "sender via domain" and Linear's "via Slack" put the path in faint words after the author. Slack puts an "APP" chip after the name of a message an integration posted. GitHub marks a bot's comment by its avatar and a "bot" chip. The common thread: the author's name stays, and the path rides beside it, quieter than the name.
- The shown-once secret. GitHub's new personal access token sits in a green-tinted box at the top of the list, in monospace, with a copy button and "Make sure to copy your personal access token now. You won't be able to see it again!". GitLab shows "Your new personal access token" in a field at the top with a copy button. Vercel and Stripe show it in a dialog. The common thread: the secret stands above everything else on the page, in a box you can copy from at once, with a warning that it will not come back.

## The questions the candidates answer

1. Where does the token's name sit on a human row: as words in the who line, as a chip, or as a change of the avatar with the name beside it?
2. How loud is it? A scan down a long thread must find the token's rows, and the name must still read quieter than the human's own name.
3. What does a 64-character name do at 390 px?
4. Where does the shown-once block land: at the top of the page, or in the Tokens section beside the new token's row? Does the human see it without scrolling, on the phone too?
5. How does the human copy the bearer and the line: a box that selects whole on one click, or a Copy button?
6. Does a token's life read in C19's lamps: lit for a token in use, unlit for one never used or expired?
7. How does the form sit: as label-over-field rows, or as one row of fields?

## The candidates

Three per part, built in the real templates and stylesheet and served by the lab's `tokens` scenario. The lab scenario holds two tokens, `claude-laptop` (used) and `nightly-ci` (never used), and one thread in which `claude-laptop` and the browser both speak. The made state is the real answer to the real form.

## Method

Round 03's and round 16's: the real console in the lab, shot at 1440 px and 390 px in both themes, with crops of the two parts at 1x and 3x. Before shots come from the base commit, with the same scenario and the old markup. Gemini 2.5 Pro and GLM 5V Turbo judge the same sheets. The director checks every claim against the pixels and writes the overruled ones into [notes.md](notes.md).

## Limits

Three candidates per part, two critics, one judging loop and at most one compare loop. A spending cap of $3 for critic calls. One session. The director's pick is provisional until Sebastian confirms it. It becomes C43, with [ia.md](../../ia.md) and [inventory.md](../../inventory.md) updated, and the build lands in the code repository with the lab's check extended to both parts.
