# Round 12 notes — the director's view

2026-10-19, one session. The round reviews three controls that landed
with roadmap 300's opening move, in the condensed build-in-lab form: the
lab's two new screenshots are the review unit, the critics judge real
renders, no image generation. The build was already pushed when the round
ran; the round is the design pass and the record, not the gate.

## The candidate

One candidate: the landed console (Forgejo 42e0d646 and its five
streams), shot in the lab. The two review images:

- `shots/chat-tall-1440.png` — the chat opened tall, the whole story in
  one scroll: the member's request, the answered ask ("One card" pressed,
  its Answer row gone), the filing the ready check refused, the corrected
  proposal with its two acceptance tests waiting on Do it, the #606
  exchange, the screenshot sent as img1 with its thumbnail and the
  analyze_image answer, and the open ask at the foot with its Answer row.
- `shots/chat-paste-1440.png` — the composer holding a pasted image as
  its chip: the thumbnail, the name img1, the ×; the textarea free below.

## Render verification

Deterministic, from the lab check and the pixels:

- The answered ask settles: row 3 ("One card") renders as a member row,
  no Answer row, while the open ask at the foot carries its two choices.
- The refused row keeps the refused colour and the ready check's words;
  the do- row of the pressed proposal sits above the correction.
- The thumbnail measures 96×96 with `object-fit: cover`, a 1px
  `--btn-line` border and 4px radius (console.css:813). The chip carries
  thumbnail + name + × on one row, the textarea below, nothing uploaded
  until Send (check.js pastes, asserts the chip, removes it, pastes
  again).
- 3× crops taken for the record: `thumb-crop.png` (the 96px thumbnail:
  the terminal's rows and the red error bar both read), `chip-crop.png`
  (the chip row at 2×).

## Critics

One pass, both critics of design/models.md, the same prompt
(`critique/_prompt.md`), the same two images. Answers in
`critique/gemini.json` and `critique/glm.json`.

Gemini (google/gemini-2.5-pro): ship × 3 — the ask row "an instrument of
clarification, not a conversational flourish", the image "evidence
attached to a statement, not a gallery display", the refusal "an
unemotional, factual report of a failed check, followed by a quiet,
competent correction". One defect claimed: the thumbnail "effectively
illegible... near-black rectangle... no value as a visual reminder of
which image".

glm (glm-5v-turbo): ship × 3, "None found" on defects. Two descriptive
slips that do not change its verdict: it calls the thumbnail "sized to
the cap-height of the 13px sans word" (it is 96×96) and the capture
"tall, narrow" (it is 320×200, shown square under cover crop). Its
nitpick, "one click away from a lightbox", is already built: the
thumbnail is an `href` to the serving route, opening full size in a new
tab.

## Overruled with evidence

- Gemini's thumbnail defect. The 3× crop disproves "near-black
  rectangle": the terminal's content rows and the red error bar both
  read at 96px, the border and radius render, and the image is genuinely
  a dark screenshot — a faithful small render of a dark picture is dark.
  Reading text inside a screenshot at 96px is not the control's job; the
  name (img1) is the handle, the full image opens on the click. Overruled
  on both legs: the claim of illegibility and the implied size change.
  No fix loop: the round's one loop stays unused, the only claim that
  could have entered it does not survive the pixels.
- glm's cap-height and aspect descriptions, above: descriptive errors,
  verdicts unaffected.

## Recommendation

Ship as built. All three controls hold the pinned style (no new token,
colour or radius; the answer row is C14's grammar, the chip the
queue-chip pattern, the refusal the refused style), and both critics
reach the same verdict on all three without prompting. The design was
shaped by Sebastian's plan rulings (images by tool, presses send at
once, a member-sent image approves its spend), so the pick is his; this
round's record stands as the design pass over what landed. The C-entries
are C26 (the ask row), C27 (images by tool), C28 (the refused filing
self-corrects).

Beyond the round, both critics reached for the same thing from opposite
sides: navigation between the conversation's decisions (gemini's
"decision summary" view, glm's diff hint on a corrected proposal). Both
are real wants, both are new work, neither belongs to this round; they
go to the ledger as candidates for a later round.

## Cost and time

Two critic runs, $0.06 of the $3 cap (gemini $0.03, glm $0.03; the fal
dashboard is the real spend). One session, about 40 minutes. What
worked: judging the real build instead of candidates — every claim
checked against pixels in minutes, and the one defect claim fell to a
3× crop without a loop.
