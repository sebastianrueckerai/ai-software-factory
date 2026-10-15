# Round 05: the documents in the screen

Sebastian on 2026-10-15: he reads the roadmap and the plans in his editor and wants to do it in the factory instead. Not an IDE. He wants to read a document, jump from the roadmap to a plan and back, jot a few lines or a new file, save it as a commit, and copy and paste between the document and the chat without leaving the screen or opening Forgejo in another tab. Feature parity with an editor for reading Markdown, and enough editing to jot. The facts on the factory's side are in the section below. This round designs the human's side. The process is the condensed round of [process.md](../../process.md): directions as images in both themes, the critics' ranking, three built variants on the instrument prototype of round 02, the critics' loop, the director's recommendation, Sebastian's pick.

## What the round designs, and nothing else

1. **Where a document opens.** The drawer, a pane over the board, the chat column, a page of its own, or a split.
2. **Moving between linked documents.** A link in the roadmap to a plan, and the way back: history, pins, tabs, a tree, a peek, a breadcrumb.
3. **Reading.** The rendered Markdown at a comfortable measure, in the console's type, with the file's path in mono.
4. **Editing and saving.** The switch from the rendered view to the raw text and back, the save as one commit on master, and the refusal when the file changed under the member.
5. **A new document.** Where "New document" lives and what the empty file looks like.
6. **The long read.** How a document gets more room when the member reads for a while, and how the chat stays.
7. **The phone.** The document at 390 wide.

## The facts on the factory's side

- The chat's agent reads and writes documents with two tools, `read_doc` and `write_doc`, on the project's document repository, under a path allow-list (docs/roadmap.md, docs/plans/, docs/board/, docs/<name>.md). A write is one commit straight to master, under a lock per repository and a content-hash compare-and-swap: a write whose base hash is stale is refused with the current content. A human's save goes through the same door with the human's own Forgejo token, so the commit names the member.
- Item 276's `backlog` block names a project's document repository and its backlog file, so a user project shows its own documents and the factory's projects show this repository.
- Anything beyond the screen, history, blame, a long rewrite, is Forgejo's page, reached by an "Open in Forgejo" link in the document's head.
- The card drawer is the one slot beside the board today: 46 percent of the width at most 720 px, docked at the right edge over the board, never over the chat, full screen on the phone. It holds one thing at a time.

## What is fixed

The Mission control shell as the console has it on 2026-10-15: the top bar with the moon and sun selector (C15), the pulse band with the instrument strip and its expandable status panel (C7, C9), the chat on the left at 40 percent with the thread table and the level control under Send (C14), the board on the right with the four columns of C8, the find box and the column menus of C13, the drawer at the right edge, no ticker (C12). The token ladder of [the theme](../../themes/06-mission-control/DESIGN.md). Both themes. 1440 and 390, the phone as one column with the chat first. Every text pair at 4.5:1 in both themes, no horizontal scroll at 390, reduced motion respected.

Normal states whisper, exceptional states speak. Reading a document is a normal state. A refused save is the exceptional one.

The chat stays visible and usable while a document is open: that is the one rule every direction keeps, since copy and paste between the document and the chat is the point.

## The moment the images show

Monday 13 October, 14:10, the busy scenario. Sebastian has opened `docs/roadmap.md` and reads the section "The project screen and members". Visible items, spelled exactly:

- "225. The lanes collapse: no card is filed undecided." with the link "the plan".
- "263. The backlog pull and the close-out." with the link "the plan" and the line "Where it stands: planned, the plan, not built."
- "205. The main loop keeps the roadmap and its working notes."

The linked plan is `docs/plans/2026-10-15-backlog-pull-and-close-out.md`, head "Plan: the backlog pull and the close-out". Three pins: "roadmap", "build plan", "backlog plan". The document's head shows the path in mono, the switch "Read | Edit" with Read pressed, and "Open in Forgejo ↗". The edit state shows the raw Markdown in a plain text area with "Save as commit" and the line "Saved: 603d2e6 on master · 14:12", or the refusal "The file changed since you opened it (Sebastian, 14:08). Your text is kept." in the amber text colour.

The board stays the busy board of round 02 (the merge of PR #612 and the #603 question in Needs you). The chat shows the open thread "Session store: Postgres" with the composer.

## The questions the images must answer

1. Can a member go from the roadmap to a plan and back with one obvious act, and land where they left?
2. Does the chat stay visible and usable, so copy and paste between the document and the chat needs no tab switch?
3. How much of the board is lost while reading, and does Needs you stay visible or one click away?
4. Does the switch between reading and editing read at once, and does a save read as a commit, not a form?
5. Does the direction stay quiet: pulse first, the amber Needs you column second, the chat third?
6. Does it look like Mission control, as if it was always there?
7. Does it scale to ten open documents without a tab strip, or does it need one?
8. Will it survive the phone?
9. A direction that leaves the project screen (05) must earn the trip.

## The directions

Eight, each a different way to hold and move between documents. Prompts from [prompts.py](prompts.py), `google/nano-banana-2.1` at 1K, 16:9, dark and light.

| # | Direction | The shape |
|---|---|---|
| 01 | Wiki drawer | One document in the drawer. Links open in place. Back and forward arrows and a Recent menu in the head, a pins row under it. |
| 02 | Tabs | A tab strip across the drawer's head, one tab per opened document, the card as a tab too. |
| 03 | Reader | A reading pane that covers the whole board, the chat stays. A breadcrumb trail of the path taken and a Narrow button. |
| 04 | Split | The drawer at the board's full width in two panes: the roadmap left, a link's target opens right. |
| 05 | Docs page | A page of its own from the top bar: a file tree, the document, the chat as a narrower column at the right. No board. |
| 06 | Chat pane | The document opens inside the chat column, above the composer. The board is untouched. |
| 07 | Peek | The document in the drawer, every link a hover popover with the target's first paragraph. A Recent menu, no history arrows. |
| 08 | Tree rail | A narrow tree of the document roots at the drawer's left edge, foldable to a strip. The document at its right. |

## Limits of the run

Eight directions in both themes, two critics over the sheets, three directions carried into built variants on the instrument prototype of round 02, at most two critic loops per variant, a spending cap of $15 for the round's images and critiques, and a stop when the variants are presented. Sebastian picks.
