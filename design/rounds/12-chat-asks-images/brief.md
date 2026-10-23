# Round 12 — the chat's asks, images and filings

The round reviews three controls the chat gained with roadmap 300's
opening move (2026-10-19), built straight into the console rather than as
standalone candidates: the question the agent asks with pressable answers,
the image the member pastes and the agent reads by tool, and the filing
the ready check refused that then self-corrected. The build is landed
(Forgejo cd15824f, f408be79, cb94df23, 2f80c724, cb7f8888, 42e0d646);
this round is the design pass over what landed, in the condensed
build-in-lab form: the lab's screenshots are the review unit, the critics
judge real renders, and a defect the critics or the director find enters
one fix loop.

## What the round designs

1. The ask row: the agent's chat question ("One card, or one per
   deliverable?") with its Answer row of pressable choices, a press
   sending the choice at once as the member's message. The newest
   unsettled ask carries the row; any later row settles it.
2. The image chip and the thumbnail: a pasted image rides the composer as
   a chip (its name img1, an × that removes it, nothing uploaded until
   Send), and the sent row shows it as a small thumbnail the agent then
   reads by its analyze_image tool.
3. The refused filing that self-corrects: the pressed proposal's do- row
   names the ready check's refusal, the agent answers with a corrected
   proposal that carries its acceptance tests and waits on Do it. The
   refusal row keeps the console's refused colour; the story must read as
   recovery, not failure.

## What is fixed

- The stylesheet as it stands: the tokens, the hairlines, the small
  capitals, the monospaced figures, one cyan accent, amber for needs-you,
  red for refused. The new controls draw on classes that already exist
  (the C14 answer row, the queue-chip pattern, the refused style); no new
  token, colour or radius.
- The landed decisions: C14's answer-row grammar (a press and a typed
  answer land in the same record), C23's bar, C25's strip, the composer
  as the chat's spanning third row (round 11's bundle).
- The light theme: every new control renders from shared tokens, so the
  round judges the dark render and light is inherited. A defect found in
  one theme is a defect in both.
- The behaviour, already decided with Sebastian: images are read by tool,
  not inlined; a press sends at once; a member-sent image approves its
  own spend ("If I send an image somewhere as the human, we can assume I
  OK that spend.").

## The questions the candidate answers

- Does the ask row read as answerable: do the choices look pressable
  without shouting, and does the open ask leave the composer's own input
  still obviously the primary way to answer?
- Does the chip carry its three jobs at a glance: the name the member can
  refer to, the picture, the removal?
- Does the thumbnail sit in the user row as a fact of the message, not a
  decoration, at its small size?
- Does the refused-then-corrected arc read in one scroll: refusal named,
  correction proposed, the new proposal visibly carrying what the refusal
  asked for?

## Limits

One candidate (the landed build, shot in the lab at 1440 in dark), two
critics (design/models.md), one critic pass, at most one fix loop.
Spending cap $3 (critics only; the expected cost is about $0.06). No
image generation. One session. The director's recommendation is
provisional; Sebastian's pick overrides it, as the process says.
