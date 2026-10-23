# Plan: the backlog pull and the close-out

Sebastian's decisions of 2026-10-15, from the backlog discussion in the controller chat: the factory pulls work from a backlog and books the result back, in two small steps that are boring on purpose. A pull step files one card from the backlog when a slot frees, and parks with one escalation when nothing is ready. A close-out step runs after a merge and updates the backlog as well as it can without inventing anything. Both report everything they did, found or failed on the card, never on the backlog. A good backlog is a different job, and neither step does it. The backlog is a text file in a repository first and an external tracker such as Jira later, behind the same two steps. The reference from a card to the backlog is a position in the file at a commit, not a numbered item, so no format is imposed on the file. Sources: Sebastian 2026-10-15, items 205, 225 and 239, [layers.md](../layers.md), [architecture.md](../architecture.md) 5.7, the autonomy plan ([the plan](2026-10-14-agent-autonomy-and-multi-chat.md)) and the main-loop plan ([the plan](2026-10-13-main-chat-docs.md)).

## What exists

Verified in the code on 2026-10-15, origin/main of the code repository read at 8c91bcc:

- The chat's document tools: `read_doc` and `write_doc` on the document repository, with a path allow-list, a size cap, a lock per repository, a content-hash compare-and-swap, a direct commit to master with attribution trailers, and a structure check on docs/roadmap.md alone (internal/console/autonomy.go). The scratchpad, `notes_read` and `notes_write` (internal/console/notes.go).
- The ready check: acceptance items present, size inside the bounds, the backlog cap, the work slots. It runs at every agent start and filing (internal/factoryd/ready.go, `FileRefusal` and `StartRefusal`). It does not read the backlog.
- The autonomy levels and their recording. The project agent's prompt carries "never invent a task" and "escalate when nothing on the roadmap is ready" as sentences (internal/console/chat.go, `prompt`).
- Filing: the chat's `new_card` takes title, body, lane, size and rung. The planner's `CreateChildren` and the agent's `delegate` file children. None carries a reference to the backlog. The item number is prose in the body or absent.
- Completion: the task goes to closing, the tokens are revoked, the keys blocked, the status set, the outcome counted and the state label mirrored (internal/factoryd/completion.go). Nothing touches the backlog after a merge. Sebastian and the controller session move a built item into the build plan by hand.
- The scheduler: a finished card hands its slot to the oldest queued card of its project, and the heal pass re-derives the admission every minute (internal/factoryd/bounded.go). The webhook intake handles `push` events (internal/factoryd/intake.go).
- The chat's `escalate` files a human-lane card with choices through `EscalateToHuman`.

## Decisions (Sebastian, 2026-10-15)

1. The reference is a position in a file at a commit. No format is imposed on the backlog file. Someone may just write things down.
2. Nothing fuzzy. The close-out edits the file only where it finds the referenced passage verbatim at head. Otherwise it leaves the file alone.
3. Every finding, problem and conflict goes on the card. The backlog gets the update and nothing else. Backtracking a card's history needs the card alone.
4. Keeping the backlog good, which is deduplication, grooming and ordering, is a different job and not the job of these two steps.
5. The same two steps serve a text file and an external tracker. The tracker kind is not built in this round.

6. The build plan's record is a paragraph a model writes. The record names the old and the new commit, so every edit is one diff away and checkable, and the paragraph says why the step did what it did, which matters most where things were not clean. It is as short as the case allows: "Task done, but the roadmap item was already gone so I did nothing" is a whole paragraph.

Read from the discussion, open to correction: whether a card covers its passage whole or in part is set by the filer at filing, so the close-out judges nothing after the fact.

## The reference

One JSON column on the task, `backlog_ref`, opaque to everything but the three places named in work item 5. For the kind `doc`:

```json
{"kind": "doc", "repository": "sf/ai-software-factory", "path": "docs/roadmap.md",
 "commit": "3019f91", "lines": "39-41", "passage": "- **242. A commit does not ...", "covers": "whole"}
```

`passage` is the exact text of the lines. `covers` is `whole` or `part`. The human's link is Forgejo's permanent page, `/<repository>/src/commit/<commit>/<path>#L39-L41`. The issue body opens with the quoted passage and that link, so the drawer shows what was promised without a click. A plan's children inherit the plan card's reference, and a delegated card inherits its caller's. A human may file without one.

## Work items

1. **The reference and its checks.** The column, the issue body's opening block, and `new_card` gaining `ref_path`, `ref_lines`, `ref_base_sha256` and `ref_covers`. The tool reads the lines at head itself and fills commit and passage, so the model names a place and never types a quote. A stale `ref_base_sha256` is refused with the current content, `write_doc`'s pattern. One check joins `FileRefusal`: no card of the project outside done, failed and closed carries a reference with the same passage. A filing by an agent without a reference is refused, a filing by a human is not. The prompt's sentences on invention and the roadmap's grant line go. Inheritance in `CreateChildren` and the delegate hand-over.

2. **The project file's `backlog` block.** `backlog: {kind: doc, repository: sf/ai-software-factory, path: docs/roadmap.md, record: docs/plans/2026-09-24-build-plan.md}`. `kind`, `repository` and `path` are required, `record` is optional, and `factoryd config check` refuses the rest. Without the block a project has no pull step and no close-out, and its cards carry no reference. The factory's own projects get the block pointing at this repository. The structure check on docs/roadmap.md stays as it is, a guard on the factory's own file and not a requirement of either step.

3. **The close-out.** A nullable `closed_out_at` on the task. `Completion.finished` runs the close-out once for a card done with a reference. The heal pass retries a done card with a reference and no stamp every minute for a day, then stamps it with the failure on the card. The steps for the kind `doc`:

   1. Read the file at head through the document repository's API, with its hash.
   2. Find the passage by exact string match.
   3. Found and `whole`: remove the passage's lines. Found and `part`: append one line under the passage, `Built in part by #<card>: <the card's title> (<date>).` Not found: no edit.
   4. Write the edit through `write_doc`'s door as one commit: the lock, the compare-and-swap with the hash of step 1, the allow-list, the structure check where it applies. On a hash mismatch, read again and retry, three times. The commit's trailers name the card and its approver. No edit, no commit.
   5. One model call on the cheap rung, billed to the project's chat task, writes the paragraph: what the card built and why the step did what it did at head, as short as the case allows. Its input is the passage, the card's title and acceptance items, the pull request's description, the head read, and the edit made or the refusal. Where the block names a record file, a second commit through the same door appends the record under the heading `### The day of <UTC date>: the roadmap items that landed`, made at the end of the file when absent. The record's first line is code's: the passage's first line cut to 120 characters, the card, the pull request, the merge commit, `whole` or `part`, the reference's commit and step 4's commit, so the exact edit is one diff away. The paragraph sits under it. When the model call fails, the record keeps its first line and the comment says the paragraph is missing.
   6. Always, when no edit happened and when a step failed too: one comment on the card and one event `backlog_closed_out`, with the head commit read, found or not found, the edit made or none, both commit SHAs, the permanent link, the paragraph, and every refusal or error verbatim.

   The close-out never escalates and never writes to the backlog what it did not find. A passage that is gone was removed by another card, reworded by a human, or removed in error. All three are safe to leave, and the card holds the evidence.

4. **The pull step.** A headless turn of the project agent: the chat's turn machinery with no browser, a fixed opening message, the reads `read_doc`, `board` and `card`, and the writes `new_card` and `escalate`. It files as the factory's own account, as the delegate hand-over does, with `source: pull`, and its calls bill the project's chat task of the month under the ref `operator`. It runs at autonomy assisted and above. At manual nothing changes.

   Its guide, a factory guide in Go: read the backlog file from the top, since file order is the priority. Quote the first passage that can be built without a decision and file one card from it: a title, a body with acceptance items, a size, the plan track for a passage too large for one card, and `covers` whole or part. Name a passage that needs a decision with its question. Stop after one card.

   Triggers, one run per project at a time: a finished card whose slot finds no queued card to admit, a `push` to the backlog repository that touches the path, and the heal pass as the slow sweep when a slot is free and the project is not parked.

   The park: when the turn files no card, the step files one escalation through `EscalateToHuman`, "Nothing on the backlog is ready: <each passage named with its reason>. Groom the backlog, or answer to pull again.", with the choice `Pull again`, and stamps the project with the head commit it read. A parked project runs again on a push past that commit or on the escalation's answer. One escalation per park, never a second while nothing changed.

5. **The seam for a tracker.** Three places know the kind: the reference's read at filing, the close-out's steps 1 to 5, and the pull step's read. Each is one function on the kind. A `jira` kind would list candidates by rank, check that the issue exists and is not done, and record by a transition and a comment. Not built now, and no interface until the second kind exists.

## Not in this round

- The `jira` kind.
- Fuzzy matching, and mapping a line range forward through the diff. The not-found case leaves the file alone and the card says so.
- Grooming: deduplication, re-ranking, deleting stale passages. Item 205's pruning pass stays its own item, run as a periodic card or in the chat, never per merge.
- The structure check as a per-project linter for other files.
- The durable main-loop agent of the autonomy plan. The pull step is the runner it would have been, with a fresh context per run. Open to Sebastian's veto.
- A roadmap table in the control plane. The autonomy plan's non-goal stands.

## Verification

Hand-derived tests:

- A filing whose `ref_base_sha256` is stale is refused with the current content. A fresh one lands with commit and passage filled from head.
- A second filing on a passage that an open card carries is refused, naming the card. A filing on a passage whose card is done is not.
- An agent filing without a reference is refused. A human filing without one lands.
- A plan's children and a delegated card carry the parent's reference.
- Close-out, found and whole: the passage's lines are gone at head, the record sits under the day's heading with its first line naming both commits and the paragraph under it, and the comment names both commits.
- Close-out, found and part: the built-in-part line sits under the passage, the record sits under the day's heading.
- Close-out, not found: the file is unchanged, the comment names the head commit and the old link.
- Close-out, the paragraph's model call fails: the record keeps its first line, the comment says the paragraph is missing, and the stamp is set.
- Close-out, hash mismatch twice then success: the edit lands as one commit after three reads.
- Close-out, the document repository unreachable: no stamp, the heal pass retries, after a day the stamp and a comment with the error.
- Two cards on one file finishing together: two commits, the second on top of the first.
- The pull step files one card with a reference read from head, as the factory's account, with `source: pull`.
- The pull step with nothing ready: one human-lane card with the choice, the park stamp, and no second escalation on the next sweep.
- A push past the parked commit runs the step again. An answer to the escalation runs it again.
- At manual the pull step does not run.
- `factoryd config check` refuses a `backlog` block without `path`.

Live: the factory's code project pulls one passage from this repository's roadmap, files it, the card merges, and the close-out's commit lands here with the card's comment naming it. A second card on the same passage is refused in the chat.

## Order

1. Item 1, the reference and its checks. The prompt's sentences go with it.
2. Item 2, the block, which items 3 and 4 read.
3. Item 3, the close-out. It works on cards filed by hand with a reference.
4. Item 4, the pull step.

Each step keeps `go test -race ./...` green in the code repository.
