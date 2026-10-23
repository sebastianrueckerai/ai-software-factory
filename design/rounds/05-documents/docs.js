// The documents round's engine: nine excerpts of this repository's real documents, a small
// Markdown renderer, a file tree, a history, and a save with a changed-under-you refusal.
// Plain ES5, no dependencies, for a file:// page: window.DOCS. The Markdown is page copy;
// each file is a cut of the real one, so the links among them are the real relative links.
// A file: title, md, sha (fake 7-character git SHA), changed (null, or { by, at }).
(function () {
  window.DOCS = {
    pins: ["docs/roadmap.md", "docs/plans/2026-09-24-build-plan.md", "docs/plans/2026-10-15-backlog-pull-and-close-out.md"],
    files: {
      "docs/roadmap.md": {
        title: "Roadmap: the future topics of the software factory",
        sha: "9e6bb40",
        changed: null,
        md: [
          "# Roadmap: the future topics of the software factory",
          "",
          "This file is the factory's memory for future work. Every idea, wish, deferred item and known weakness that is not built lives here, in one place, where Sebastian sets priorities. Two files hang off it: [roadmap-risks-and-rejections.md](roadmap-risks-and-rejections.md) holds the accepted risks to revisit and the ideas rejected earlier, and [board/roadmap.md](board/roadmap.md) holds the board's own backlog.",
          "",
          "## How to read an item",
          "",
          "The sections stand in priority order, and Sebastian prioritises a whole section (2026-10-14). Inside a section the items that run first stand first.",
          "",
          "## The project screen and members",
          "",
          "- **225. The lanes collapse: no card is filed undecided.** Sebastian's flow ruling of 2026-10-14: chat shapes work, the roadmap holds intentions, the board shows commitments. A queue holds work waiting for capacity, never work waiting for a decision. So whoever files a card sets its track, plan or direct. The three lanes go: backlog dies, since the roadmap holds interest, plan becomes the track, and ready becomes the queued status. A plan-track card runs a planning session, its questions wait in Needs you, and a clean plan goes on by itself. A plan splits into ordinary direct-track child cards, with the plan linked and dependencies from it, and the planning card closes once they are filed. Needs you means a person is the next actor. The board loses the lane columns, the move buttons and the plan buttons. One scheduler pulls the next committed task into a freed slot, with one slow sweep as the failsafe. It is a process-schema change (`moved_by`, the starting-lane check and the plan bounds move), so it lands as one round. Sources: Sebastian 2026-10-14 (the flow discussion), item 205, ruling 255, [layers.md](layers.md). Where it stands: built in part, [the plan](plans/2026-10-14-lane-collapse.md). The WIP bound (f98d506), the freed-slot admission (67c9d22), the machine sources filing without a lane and the four-column board are on main. The track at filing, the plan track, and the removal of the lanes, `moved_by`, the move forms, the start-plan button and the admission click are not built. Priority:",
          "- **239. The multi-chat console.** The second half of one plan whose autonomy half is built. Many named threads per member and project, with a title, an archive and a switcher. Turns serialise per thread in the server, so a second message queues and never interleaves, under a per-project bound. Compaction replaces the 40-message truncation: preset at 80 percent of the serving model's window, forced at the provider's context refusal with at most two retries, and by hand with `/compact`. A turn that ends after the member last looked marks the thread unread. One inbox thread per member receives the agent's own turns, the escalations and factoryd's pokes on 145's event classes. `/compact` and `/new` are commands defined as data. An active-threads read and the scratchpad (205) open to every thread. Threads archive or delete for good, and a delete writes one attribution event. Open question (213): should members see each other's threads? Sources: Sebastian 2026-10-14, [the plan](plans/2026-10-14-agent-autonomy-and-multi-chat.md), rulings 251, 252 and 254. Where it stands: the autonomy half is on main (d259cb1). The levels resolve into the confirm lists, the ready check gates the agent's starts and filings, the backlog cap counts, every chat action names its decider, and `write_doc` is the one door. Sebastian picked the multi-chat look on 2026-10-14: the instrument table with the level control under Send (C14 in design/design-decisions.md). Threads, the turn lock and compaction are on main (f7a4ae4). Each member holds numbered threads with a title, a seen marker and an unread count. Turns serialise per thread: a second message waits as queued and moves to the end when its turn starts. At most `chat.parallel_turns` (default 3) model turns run per project. A turn compacts before a call projected past 80 percent of `chat.window`, on the gateway's typed refusal `refused_context`, and on `/compact`. The summary covers everything before the last two turns, and the chat folds those rows behind one line. The switcher, the marks, the badges, the fold and the tab title follow C14. The inbox, the pokes, the commands and the document tools are on main (3dc8e35). Each member's inbox thread is pinned first. factoryd's poke writer turns each poke-class event into a row there for the project's notify list, else its approvers. The classes are a card that needs a person, a budget stop, a failure, a card or plan done, a level change, and the agent's own starts and filings with their decider line. A repeat counts on its row. `commands.yaml` in the configuration tree maps a name to a canned message, and the box opens a palette on \"/\". `read_doc` answers a document with its hash, and `write_doc` edits one passage against it. The scratchpad and `active_threads` open to every thread, and a card's drawer names the chat thread that filed or steered it. This round also fixed three faults in the autonomy half: `write_doc` never decoded its hash, two Forgejo commits expected 200 where Forgejo answers 201, and an edited `backlog_cap` was written as a string. Archive and delete, the escalation's chat home and the level control under Send are on main (e31058d), and with them the item is built. A thread archives and restores from its head. A delete for good asks first, refuses while a turn runs, never takes the inbox, and writes one `chat_thread_deleted` event naming the member, the thread and its message count. The `escalate` tool files the agent's question and its choices as a human-lane card in Needs you, and the poke carries it to the inbox. The answer row under an escalation decides its card as the board's buttons do: it approves a merge, accepts a plan, answers a question or closes a human card. The first answer wins. The level control under Send has four states: manual, assisted, autonomous, and full auto, which is autonomous with the merge rule `auto`. A change asks first, then lands as the approver's pull request on the project file, merged after the project check. The board's level selector is gone. The lab checks the level control, the palette, Ctrl+K, the phone's touch targets and the contrast in both themes. The push of escalations to Telegram and Discord moved to 145 (Sebastian, 2026-10-14). Priority:",
          "- **226. The prompt pack's first two entries, and the context snapshot.** Sebastian's ruling of 2026-10-14: writing that reaches a human follows his ste-writing guide, which ships as the factory's default and a user replaces file by file. The agents file's default is distilled from his global CLAUDE.md, with the name generalised to user and the controller-only parts (worktrees, transcripts, delegation) left out. The workers get no writing guide, since their reader is the gates. The pack ships as data in the config tree with a class-to-files mapping beside it, and the harness's AGENTS.md injection carries it. One concern lives in exactly one file. After it lands, the context snapshot: per class and for the main chat, one representative request split into named segments (system, tool definitions, pack files, brief, history) with a token count each, run at the round close and after any pack change. Sources: Sebastian 2026-10-14, [layers.md](layers.md) section 3, item 201. Where it stands: planned, [the plan](plans/2026-10-14-prompt-pack.md), not built. Priority:",
          "- **205. The main loop keeps the roadmap and its working notes.** The main chat steers: it captures what a discussion decided into the roadmap, keeps working notes outside the repository, and promotes roadmap items to cards when slots free. The board shows what runs. The roadmap records interest and is never a scheduler input. Sources: Sebastian 2026-10-13 (the roadmap discussion), items 41, 76 and 225. Where it stands: built in part, [the plan](plans/2026-10-13-main-chat-docs.md). `write_doc` is built (d259cb1): the docs writer token, the path allow-list, this file's structure check, a lock per repository and a content-hash compare-and-swap, with a direct commit to master. The scratchpad is built (3dc8e35). The promotion is item 263's pull step. Not built: a pruning pass each round. Priority:",
          "",
          "- **263. The backlog pull and the close-out.** Two small steps, boring on purpose, that take over the main chat's pulling and the hand-made bookkeeping after a merge. A pull step runs when a slot frees or the backlog changes, files one card from the first passage of the backlog file that can be built without a decision, and parks with one escalation when nothing is ready. A close-out step runs after a merge, removes a passage built whole or marks one built in part, appends a record to the build plan with its links by code and its paragraph by a model, and otherwise leaves the file alone. Every finding goes on the card, never on the backlog. The reference from a card to the backlog is a position in the file at a commit with the quoted passage, so the file needs no format and a tracker such as Jira fits the same seam later. Sources: Sebastian 2026-10-15 (the backlog discussion), items 205, 225 and 239, [layers.md](layers.md). Where it stands: planned, [the plan](plans/2026-10-15-backlog-pull-and-close-out.md), not built. Priority:"
        ].join("\n")
      },
      "docs/plans/2026-10-15-backlog-pull-and-close-out.md": {
        title: "Plan: the backlog pull and the close-out",
        sha: "a41c9e0",
        changed: null,
        md: [
          "# Plan: the backlog pull and the close-out",
          "",
          "Sebastian's decisions of 2026-10-15, from the backlog discussion in the controller chat: the factory pulls work from a backlog and books the result back, in two small steps that are boring on purpose. A pull step files one card from the backlog when a slot frees, and parks with one escalation when nothing is ready. A close-out step runs after a merge and updates the backlog as well as it can without inventing anything. Both report everything they did, found or failed on the card, never on the backlog. A good backlog is a different job, and neither step does it. The backlog is a text file in a repository first and an external tracker such as Jira later, behind the same two steps. The reference from a card to the backlog is a position in the file at a commit, not a numbered item, so no format is imposed on the file. Sources: Sebastian 2026-10-15, items 205, 225 and 239, [layers.md](../layers.md), [architecture.md](../architecture.md) 5.7, the autonomy plan ([the plan](2026-10-14-agent-autonomy-and-multi-chat.md)) and the main-loop plan ([the plan](2026-10-13-main-chat-docs.md)).",
          "",
          "## What exists",
          "",
          "Verified in the code on 2026-10-15, origin/main of the code repository read at 8c91bcc:",
          "",
          "- The chat's document tools: `read_doc` and `write_doc` on the document repository, with a path allow-list, a size cap, a lock per repository, a content-hash compare-and-swap, a direct commit to master with attribution trailers, and a structure check on docs/roadmap.md alone (internal/console/autonomy.go). The scratchpad, `notes_read` and `notes_write` (internal/console/notes.go).",
          "- The ready check: acceptance items present, size inside the bounds, the backlog cap, the work slots. It runs at every agent start and filing (internal/factoryd/ready.go, `FileRefusal` and `StartRefusal`). It does not read the backlog.",
          "- The autonomy levels and their recording. The project agent's prompt carries \"never invent a task\" and \"escalate when nothing on the roadmap is ready\" as sentences (internal/console/chat.go, `prompt`).",
          "- Filing: the chat's `new_card` takes title, body, lane, size and rung. The planner's `CreateChildren` and the agent's `delegate` file children. None carries a reference to the backlog. The item number is prose in the body or absent.",
          "- Completion: the task goes to closing, the tokens are revoked, the keys blocked, the status set, the outcome counted and the state label mirrored (internal/factoryd/completion.go). Nothing touches the backlog after a merge. Sebastian and the controller session move a built item into the build plan by hand.",
          "- The scheduler: a finished card hands its slot to the oldest queued card of its project, and the heal pass re-derives the admission every minute (internal/factoryd/bounded.go). The webhook intake handles `push` events (internal/factoryd/intake.go).",
          "- The chat's `escalate` files a human-lane card with choices through `EscalateToHuman`.",
          "",
          "## Decisions (Sebastian, 2026-10-15)",
          "",
          "1. The reference is a position in a file at a commit. No format is imposed on the backlog file. Someone may just write things down.",
          "2. Nothing fuzzy. The close-out edits the file only where it finds the referenced passage verbatim at head. Otherwise it leaves the file alone.",
          "3. Every finding, problem and conflict goes on the card. The backlog gets the update and nothing else. Backtracking a card's history needs the card alone.",
          "4. Keeping the backlog good, which is deduplication, grooming and ordering, is a different job and not the job of these two steps.",
          "5. The same two steps serve a text file and an external tracker. The tracker kind is not built in this round.",
          "",
          "6. The build plan's record is a paragraph a model writes. The record names the old and the new commit, so every edit is one diff away and checkable, and the paragraph says why the step did what it did, which matters most where things were not clean. It is as short as the case allows: \"Task done, but the roadmap item was already gone so I did nothing\" is a whole paragraph.",
          "",
          "Read from the discussion, open to correction: whether a card covers its passage whole or in part is set by the filer at filing, so the close-out judges nothing after the fact.",
          "",
          "## The reference",
          "",
          "One JSON column on the task, `backlog_ref`, opaque to everything but the three places named in work item 5. For the kind `doc`:",
          "",
          "```json",
          "{\"kind\": \"doc\", \"repository\": \"sf/ai-software-factory\", \"path\": \"docs/roadmap.md\",",
          " \"commit\": \"3019f91\", \"lines\": \"39-41\", \"passage\": \"- **242. A commit does not ...\", \"covers\": \"whole\"}",
          "```",
          "",
          "`passage` is the exact text of the lines. `covers` is `whole` or `part`. The human's link is Forgejo's permanent page, `/<repository>/src/commit/<commit>/<path>#L39-L41`. The issue body opens with the quoted passage and that link, so the drawer shows what was promised without a click. A plan's children inherit the plan card's reference, and a delegated card inherits its caller's. A human may file without one.",
          "",
          "## Work items",
          "",
          "1. **The reference and its checks.** The column, the issue body's opening block, and `new_card` gaining `ref_path`, `ref_lines`, `ref_base_sha256` and `ref_covers`. The tool reads the lines at head itself and fills commit and passage, so the model names a place and never types a quote. A stale `ref_base_sha256` is refused with the current content, `write_doc`'s pattern. One check joins `FileRefusal`: no card of the project outside done, failed and closed carries a reference with the same passage. A filing by an agent without a reference is refused, a filing by a human is not. The prompt's sentences on invention and the roadmap's grant line go. Inheritance in `CreateChildren` and the delegate hand-over.",
          "",
          "2. **The project file's `backlog` block.** `backlog: {kind: doc, repository: sf/ai-software-factory, path: docs/roadmap.md, record: docs/plans/2026-09-24-build-plan.md}`. `kind`, `repository` and `path` are required, `record` is optional, and `factoryd config check` refuses the rest. Without the block a project has no pull step and no close-out, and its cards carry no reference. The factory's own projects get the block pointing at this repository. The structure check on docs/roadmap.md stays as it is, a guard on the factory's own file and not a requirement of either step.",
          "",
          "3. **The close-out.** A nullable `closed_out_at` on the task. `Completion.finished` runs the close-out once for a card done with a reference. The heal pass retries a done card with a reference and no stamp every minute for a day, then stamps it with the failure on the card. The steps for the kind `doc`:",
          "",
          "   1. Read the file at head through the document repository's API, with its hash.",
          "   2. Find the passage by exact string match.",
          "   3. Found and `whole`: remove the passage's lines. Found and `part`: append one line under the passage, `Built in part by #<card>: <the card's title> (<date>).` Not found: no edit.",
          "   4. Write the edit through `write_doc`'s door as one commit: the lock, the compare-and-swap with the hash of step 1, the allow-list, the structure check where it applies. On a hash mismatch, read again and retry, three times. The commit's trailers name the card and its approver. No edit, no commit.",
          "   5. One model call on the cheap rung, billed to the project's chat task, writes the paragraph: what the card built and why the step did what it did at head, as short as the case allows. Its input is the passage, the card's title and acceptance items, the pull request's description, the head read, and the edit made or the refusal. Where the block names a record file, a second commit through the same door appends the record under the heading `### The day of <UTC date>: the roadmap items that landed`, made at the end of the file when absent. The record's first line is code's: the passage's first line cut to 120 characters, the card, the pull request, the merge commit, `whole` or `part`, the reference's commit and step 4's commit, so the exact edit is one diff away. The paragraph sits under it. When the model call fails, the record keeps its first line and the comment says the paragraph is missing.",
          "   6. Always, when no edit happened and when a step failed too: one comment on the card and one event `backlog_closed_out`, with the head commit read, found or not found, the edit made or none, both commit SHAs, the permanent link, the paragraph, and every refusal or error verbatim.",
          "",
          "   The close-out never escalates and never writes to the backlog what it did not find. A passage that is gone was removed by another card, reworded by a human, or removed in error. All three are safe to leave, and the card holds the evidence.",
          "",
          "4. **The pull step.** A headless turn of the project agent: the chat's turn machinery with no browser, a fixed opening message, the reads `read_doc`, `board` and `card`, and the writes `new_card` and `escalate`. It files as the factory's own account, as the delegate hand-over does, with `source: pull`, and its calls bill the project's chat task of the month under the ref `operator`. It runs at autonomy assisted and above. At manual nothing changes.",
          "",
          "   Its guide, a factory guide in Go: read the backlog file from the top, since file order is the priority. Quote the first passage that can be built without a decision and file one card from it: a title, a body with acceptance items, a size, the plan track for a passage too large for one card, and `covers` whole or part. Name a passage that needs a decision with its question. Stop after one card.",
          "",
          "   Triggers, one run per project at a time: a finished card whose slot finds no queued card to admit, a `push` to the backlog repository that touches the path, and the heal pass as the slow sweep when a slot is free and the project is not parked.",
          "",
          "   The park: when the turn files no card, the step files one escalation through `EscalateToHuman`, \"Nothing on the backlog is ready: <each passage named with its reason>. Groom the backlog, or answer to pull again.\", with the choice `Pull again`, and stamps the project with the head commit it read. A parked project runs again on a push past that commit or on the escalation's answer. One escalation per park, never a second while nothing changed.",
          "",
          "5. **The seam for a tracker.** Three places know the kind: the reference's read at filing, the close-out's steps 1 to 5, and the pull step's read. Each is one function on the kind. A `jira` kind would list candidates by rank, check that the issue exists and is not done, and record by a transition and a comment. Not built now, and no interface until the second kind exists.",
          "",
          "## Not in this round",
          "",
          "- The `jira` kind.",
          "- Fuzzy matching, and mapping a line range forward through the diff. The not-found case leaves the file alone and the card says so.",
          "- Grooming: deduplication, re-ranking, deleting stale passages. Item 205's pruning pass stays its own item, run as a periodic card or in the chat, never per merge.",
          "- The structure check as a per-project linter for other files.",
          "- The durable main-loop agent of the autonomy plan. The pull step is the runner it would have been, with a fresh context per run. Open to Sebastian's veto.",
          "- A roadmap table in the control plane. The autonomy plan's non-goal stands.",
          "",
          "## Verification",
          "",
          "Hand-derived tests:",
          "",
          "- A filing whose `ref_base_sha256` is stale is refused with the current content. A fresh one lands with commit and passage filled from head.",
          "- A second filing on a passage that an open card carries is refused, naming the card. A filing on a passage whose card is done is not.",
          "- An agent filing without a reference is refused. A human filing without one lands.",
          "- A plan's children and a delegated card carry the parent's reference.",
          "- Close-out, found and whole: the passage's lines are gone at head, the record sits under the day's heading with its first line naming both commits and the paragraph under it, and the comment names both commits.",
          "- Close-out, found and part: the built-in-part line sits under the passage, the record sits under the day's heading.",
          "- Close-out, not found: the file is unchanged, the comment names the head commit and the old link.",
          "- Close-out, the paragraph's model call fails: the record keeps its first line, the comment says the paragraph is missing, and the stamp is set.",
          "- Close-out, hash mismatch twice then success: the edit lands as one commit after three reads.",
          "- Close-out, the document repository unreachable: no stamp, the heal pass retries, after a day the stamp and a comment with the error.",
          "- Two cards on one file finishing together: two commits, the second on top of the first.",
          "- The pull step files one card with a reference read from head, as the factory's account, with `source: pull`.",
          "- The pull step with nothing ready: one human-lane card with the choice, the park stamp, and no second escalation on the next sweep.",
          "- A push past the parked commit runs the step again. An answer to the escalation runs it again.",
          "- At manual the pull step does not run.",
          "- `factoryd config check` refuses a `backlog` block without `path`.",
          "",
          "Live: the factory's code project pulls one passage from this repository's roadmap, files it, the card merges, and the close-out's commit lands here with the card's comment naming it. A second card on the same passage is refused in the chat.",
          "",
          "## Order",
          "",
          "1. Item 1, the reference and its checks. The prompt's sentences go with it.",
          "2. Item 2, the block, which items 3 and 4 read.",
          "3. Item 3, the close-out. It works on cards filed by hand with a reference.",
          "4. Item 4, the pull step.",
          "",
          "Each step keeps `go test -race ./...` green in the code repository."
        ].join("\n")
      },
      "docs/plans/2026-10-14-agent-autonomy-and-multi-chat.md": {
        title: "Plan: the project agent's autonomy and the multi-chat console",
        sha: "7be25d3",
        changed: null,
        md: [
          "# Plan: the project agent's autonomy and the multi-chat console",
          "",
          "Merged plan, 2026-10-14. It carries two halves on one seam: the autonomy levels that let the project agent OK and file work by itself under Sebastian's named levels, and the multi-chat console that holds several conversations per member with one inbox thread for everything the factory sends him. The seam is the escalation: the autonomy half decides when the agent must reach him, the console half decides where the reach-out lands. Written from the discussions of 2026-10-14 (autonomy, multi-chat, the pokes) and the code surveys of 2026-10-14. Sources: Sebastian 2026-10-14 (every decision below), items 41, 74, 76, 145, 150, 159, 160, 180, 185, 190, 198, 200, 201, 205, 213, 225, 226, 227, rulings 251, 252 and 254, the main-loop plan of 2026-10-13 ([the plan](2026-10-13-main-chat-docs.md)), the evidence section at the end. This file replaces the autonomy levels spec and the multi-chat plan of 2026-10-14, both folded in here; git history keeps them.",
          "",
          "## What and why",
          "",
          "Sebastian today plays the factory's human in a parallel session: he OKs the cards the factory puts on the board. The autonomy part gives the project agent the authority to OK and to file cards itself, under named levels he controls, so the factory runs with him out of the loop except for direction, money and merges he chose to keep. The trust argument: the OK before a start was never the safety mechanism. The verification gates, the budget holds, the sandbox and the egress rules run no matter who OKed the start. What must never be automated is the decision class: direction, budget raises, and the level itself.",
          "",
          "The console part starts from the chat panel's shape today: one conversation per member and project. Two features cannot be planned side by side, a long planning session fills the one transcript, and nothing told him a finished turn while he looked elsewhere. Multi-chat makes the conversations first-class threads, moves the turn safety into the server, replaces the context's hard truncation with compaction that cannot be outrun, and gives every member an inbox thread that receives the factory's pokes.",
          "",
          "## Decisions (Sebastian, 2026-10-14)",
          "",
          "Autonomy:",
          "",
          "1. merge_rule stays a separate switch. The state where everything runs on auto exists on top of the two switches.",
          "2. The agent never invents tasks. When nothing on the roadmap is ready, it stops and asks, at every level, including full auto. Inventing is allowed only where the roadmap grants it in an explicit line.",
          "3. Backlog cap 8 against WIP 5.",
          "",
          "Multi-chat and the inbox:",
          "",
          "4. A member's second message while a turn runs queues server-side. It is never refused and never interleaves.",
          "5. Delete is hard delete of the messages plus one attribution event. No soft delete.",
          "6. Any thread may write the roadmap, through the one serialised door. No designated roadmap thread.",
          "7. Compaction is preset at 80 percent of the serving model's window and, at the latest, fires when the model itself reports an exhausted context. The known window is the optimisation; the provider's complaint is the bound that always holds.",
          "8. The escalation stays one mechanism, not a new alert. Multi-chat gives it a home, not a second channel."
        ].join("\n")
      },
      "docs/plans/2026-10-13-main-chat-docs.md": {
        title: "Plan: the main loop keeps the roadmap and its working notes",
        sha: "1d9f4a6",
        changed: null,
        md: [
          "# Plan: the main loop keeps the roadmap and its working notes",
          "",
          "Sebastian's decisions of 2026-10-13: the main loop lives in the main chat and steers the factory. It captures what a discussion decided into the roadmap, keeps working notes outside the repository, and promotes roadmap items to cards when slots free. Its commits are documents only. The board stays the source of truth for what runs. The roadmap is the project backlog, an intake signal the lane files cards from, never a scheduler input. Trust comes from the role: the human is in the chat with the main loop, and promotion stays the screening step for every writer. A card commits the factory to build. A roadmap item records interest. Structure is added at promotion. Sources: the roadmap discussion of 2026-10-13 and the controller chat of 15:15.",
          "",
          "## What exists",
          "",
          "The chat already runs reads and writes as tools behind one access table (item 185's GET half), every action waits on the Confirm list behind a Do it, and `new_card` files a Forgejo issue as the member, so the record stays one issue per task (item 76). The factory's own cards go through the planner, small, with acceptance criteria and the scope bounded in code (item 160). The roadmap format is proven: numbered items with sources, a where-it-stands note and a Priority field Sebastian fills, items leave when built, rejected ones stay with their reason, and a split by area already exists ([board/roadmap.md](../board/roadmap.md)). The boundary comes free: this repository holds documents only, the code lives in sibling repositories, so write access here is document access by construction. Working notes today are the ledger: gitignored markdown files, local to the controller's machine. The pattern works and it is bound to one machine and one session.",
          "",
          "## Work items",
          "",
          "1. **One writer role, one token, one repository.** A Forgejo service account for the main loop, its token scoped to write on sf/ai-software-factory and nothing else: no code repository, no other project. The token sits in factoryd's secret store with the other duty tokens and never reaches a session, since identity belongs to the task and agents get tools, not credentials. Its rotation is proven by a write-shaped probe (item 190's lesson): a commit and delete on a probe branch, run by the script that stores the token. Every commit carries composite attribution (item 41): the role and the human in the chat.",
          "2. **One chat write: `write_doc`.** A path under the document roots (docs/roadmap.md, docs/plans/, docs/board/, new spec documents under docs/), the old and the new passage for an edit, the full content for a new file. It commits straight to master, pushes, waits on the Confirm list behind a Do it like every write, and answers the commit's SHA. Checks by construction: the path allow-list refuses everything outside the roots; a roadmap edit passes a structure check (item numbers stay unique, every item keeps its Sources and Where-it-stands lines) so a model's edit cannot silently degrade the file; a size cap per file, as the briefs carry. One row in the access table, granted per project, the factory's own project first. Direct to master is safe by construction here: nothing executes a roadmap, and git history is the rollback.",
          "3. **The scratchpad: working notes in the control plane.** Sebastian's instinct, bounded by one rule: the scratchpad never steers anything. It holds state, not direction: round state, findings in flight, half-formed ideas. Whatever a fresh session or a subagent must rebuild from graduates into the repository when it becomes steering, as a roadmap item, a plan or a concept document. The transcript stays conversation. The shape: a notes table in factoryd beside the transcript, per project; two tools, `notes_read` and `notes_write`, parsimonious per item 199; a size cap per project; readable by the main chat alone, which carries what a subagent needs into its brief (Stage 16's fourth principle: a small default context with depth fetched by tools). No gate, no card and no board reads it. The ledger stays the terminal controller's own tool until the main loop replaces it, and the scratchpad is then its ledger.",
          "4. **Promotion: from roadmap item to card, on existing rails.** The main chat files through `new_card` as the member, the card's brief drawn from the item and its linked plan or concept document, and the planner scopes it (item 160's path). The bounds live in policy, not in a prompt. An item is promotable without asking when its Priority field is filled, Sebastian's own gesture, and a plan or concept document backs it. Items without a filled Priority are never auto-promoted. At most one card per free slot, under the project's WIP bound: slots cap parallelism, so the roadmap carries no structure for it. Dependencies stay sentences in the item until promotion, where the split's child cards already carry them (item 159).",
          "5. **The pruning pass, once per round.** The round checklist gains: re-rank the roadmap, merge duplicates, delete stale items, close each spike as a concept document plus a promote-or-kill decision, and sweep the scratchpad. Every item ends as a card or a deletion. The pass is judgment, so it stays a checklist step. The structure check in `write_doc` catches file degradation.",
          "6. **Staging.** Phase one gives the main chat its hands: the role and token, `write_doc`, the notes tools. Capture works then, with Sebastian in the chat. Phase two adds autonomy: the promotion bounds in policy, the auto-pick when slots free, the pruning pass. The durable main-loop agent itself, its class, brief and heartbeat, is the item after this one. The tools here are venue- and agent-agnostic, so none of it is wasted if that shape changes.",
          "",
          "## Not in this round",
          "",
          "No path scoping inside a mixed repository, the shape a user project takes when its roadmap sits beside code: the repository boundary carries the factory today, and the allow-list becomes per-project configuration when a project needs it. No approval path for doc commits, a policy flag for other projects. No structure on the roadmap beyond the file's own: estimates, dependencies, ordering metadata. Cost per card is measured (item 160's ledger), a dependency is a sentence until promotion, and priority is the Priority field. Not the durable main-loop agent itself.",
          "",
          "## Verification",
          "",
          "Live: the main chat commits a roadmap edit from the browser and one from a messenger window, both venues, one transcript (item 145's routing). A rotation of the docs token passes the write probe, a read-only token fails it (item 190's shape). `write_doc` refuses a path outside the roots and a roadmap edit that breaks an item's structure. The notes cap refuses past its bound. One promotion end to end: a ready item, its Priority filled and its plan linked, becomes a card through `new_card`, the planner scopes it, and it lands under the lane as Stage 18's cards did. `go test -race ./...` in the code repository."
        ].join("\n")
      },
      "docs/plans/2026-09-24-build-plan.md": {
        title: "Build plan",
        sha: "e08b7c1",
        changed: null,
        md: [
          "# Build plan",
          "",
          "### The day of 2026-10-15: the roadmap items that landed",
          "",
          "The ledger's progress.md holds the steps. Code commits unless named",
          "infra.",
          "",
          "- 42 the worker probes its sandbox's egress before the agent starts:",
          "  the gateway answers, the canary, the metadata address and a direct IP",
          "  take no connection, a lookup of the canary's name fails at once, and",
          "  the worker runs as uid 1000; a sandbox more open than its policy",
          "  fails the start with each probe named, a gateway that does not answer",
          "  is retried (5fd12ed, 9186613). Reproduction pods probe the same way",
          "  before the repository's code runs, and a start refusal names the",
          "  sandbox, not a session (0c57404, 4e168a1). Not yet seen live.",
          "- 201's gate inputs (items 12 to 16): a review in parts sends the",
          "  shared block with part 1 alone, earlier reviews shrink to the last",
          "  round's, the audit's later parts get a short prompt, and the gate",
          "  supervisor reads a last result only beyond its timeline tail (43cfeeb,",
          "  04e09b4). A review's model input fell from 142,420 to 126,825 bytes.",
          "  200 and 201's chat (items 18 and 19): one sentence per tool, tools",
          "  offered by the member's role, a card named by its issue number in",
          "  every card tool through the store, and the turn's opening context",
          "  restates no read; the writer's first request fell from 27,696 to",
          "  14,520 bytes, the approver's from 27,989 to 19,735 (cc89094, adbe11a,",
          "  04267e6). Found on the way: the level control reset a project's",
          "  custom backlog cap to 8 on every change (04267e6).",
          "- 201's worker brief and supervisor (items 1 to 11): each fact once,",
          "  every carried list capped, review findings outlast unpushed sessions,",
          "  every factoryd model call reads compact JSON with its tails as lines,",
          "  and a bash command stays whole wherever factoryd decides, cut to 512",
          "  bytes only where a model reads it (641bf08, 5dd2723, 6e4c4ca, 993db2a).",
          "  Supervisor call 1 fell from 54,327 to 38,224 bytes, call 2 from 56,776",
          "  to 46,922. An acceptance command is proven only by a run whose exit",
          "  status is the command's, so a red run piped to tee closes no card",
          "  (836b62f, b991e26). 201 and 200 are done.",
          "- 222's audit half: the audit runs beside the checks under the review's",
          "  rule and is taken at its stage's turn, a project without the audit",
          "  skips the stage at its turn (4bfd30c). A harness card with 10 minutes",
          "  of checks and a 4-minute audit asks for approval at 10 minutes, not",
          "  14. The review half ran live on scratch12 #32: its call 4 seconds",
          "  after the checks started, the card filed to merged in 7 minutes 48",
          "  seconds for 0.0090 EUR. 222 is done."
        ].join("\n")
      },
      "docs/layers.md": {
        title: "The three layers: the factory, the process, the prompts",
        sha: "3c6a1f8",
        changed: null,
        md: [
          "# The three layers: the factory, the process, the prompts",
          "",
          "Sebastian's ruling of 2026-10-13, from a comparison with another agent factory: the factory stays agnostic to the development process a project runs. The process is data. The prompts the agents read are content that ships as data too. Every addition names its layer before it is built, and nothing that belongs in a process file or a prompt pack lands in the factory's code. The separation already lives in this repository in pieces (target-architecture.md's \"Processes as configuration\", the roadmap's \"Primitives, not a process\"). This file states it in one place, adds the rulings of the discussion, and records where each candidate idea of the comparison lands.",
          "",
          "## 1. The rule",
          "",
          "Each layer answers one question:",
          "",
          "- **The factory** answers: can this run at all, attributed, capped and sandboxed? Sandboxed pods, the gateway, money, policy enforcement, task state, audit. It enforces. It holds no opinion about how software should be built.",
          "- **The process** answers: what must a change survive before it merges, and who acts next? A YAML file per project: lanes, dependencies, stages, merge. Two processes ship (`maintenance`, `spec`), a project names one, and a project may only tighten.",
          "- **The prompts** answer: what does an agent read before it works? AGENTS.md, skills, brief guides, product directives.",
          "",
          "The test for every new idea: name the layer first. A deterministic check becomes a stage in a process file or a command in the project's own CI. Guidance an agent should follow becomes the prompt pack, or better a tool or a check, the roadmap's third guiding idea. A capability the process composes from becomes a factory primitive.",
          "",
          "## Sources",
          "",
          "Sebastian, 2026-10-13: the comparison with another agent factory and this discussion's rulings. [roadmap.md](roadmap.md) items 28, 36, 37, 69, 198 to 200. [target-architecture.md](target-architecture.md), \"Processes as configuration\" and the worker plane. [architecture.md](architecture.md) sections 6 to 8."
        ].join("\n")
      },
      "docs/architecture.md": {
        title: "Software factory: architecture",
        sha: "b52d0e7",
        changed: null,
        md: [
          "# Software factory: architecture",
          "",
          "### 5.7 The project screen and the project agent",
          "",
          "Designed on 2026-10-10 for Stage 15 (Rulings 251 to 256) and built on",
          "2026-10-11 (Rulings 257 to 260), except members, approvers per project and",
          "GitHub import and export. The exit test passed the same day. Stage 16",
          "(Rulings 261 to 270) built members, approvers per project and GitHub import",
          "and export the same day and made the chat the window (below). Stage 17",
          "(Rulings 272 to 307) built the screen's open points on 2026-10-12 and",
          "closed most of what Stage 16 left open (below). Where the",
          "build differs from the design, the paragraph says so. The design baseline",
          "is Sebastian's conversation on the human's side of the factory,",
          "[ai-software-factory-ux-conversation.md](ai-software-factory-ux-conversation.md),",
          "with his three answers of the same day, and the screen's visual spec is",
          "[board/proposal-v2.md](board/proposal-v2.md).",
          "",
          "The human's tool is one screen per project (Ruling 251). It never creates",
          "or manages projects, and anyone who steers a project, Sebastian or an",
          "invited member, gets the same screen. Three principles from the",
          "conversation hold across it. The board state is the truth, the event log is",
          "the history, and the chat is an operator over both. Anything a human can do",
          "by hand on the screen can be said in the chat, and the objects stay visible",
          "and operable without the chat. Normal states whisper, exceptional states",
          "speak. A fourth holds for the agent behind the chat: it operates the",
          "factory and never does the work. It reads, explains, files cards, moves,",
          "answers, steers and approves. It runs no code, and work that needs a",
          "sandbox becomes a card.",
          "",
          "**Five parts, one job each.**",
          "",
          "- **Status line**: what is the state. Per project, quantitative and always",
          "  there: the project's state (working, waiting on you, idle, paused), the",
          "  cards working, the cards that need you, spend against the project's",
          "  monthly cap, and the GitHub mirror's state. Each figure opens its page:",
          "  the costs, the needs-you list, the mirror panel. Built: the state word is",
          "  \"waiting on you\" whenever a card waits on a human, else \"working\" while",
          "  a card runs, else \"idle\" (Ruling 260), and the project agent's snapshot",
          "  reads the same line. The spend is the project's ledger spend in the UTC",
          "  month against the project file's month cap, else the policy's. Stage 16",
          "  added a Waiting count, where a card waiting on the provider counts, and",
          "  \"GitHub: <state>\" at the end for a project with an export, which the",
          "  registrar refreshes each minute.",
          "  Since Stage 17 the status line spans both columns, the board's and the",
          "  chat's, and for a project in pull request mode it counts the open GitHub",
          "  pull requests, live \"GitHub: 0 open pull requests\"."
        ].join("\n")
      },
      "docs/board/roadmap.md": {
        title: "The board roadmap",
        sha: "94f7a2c",
        changed: null,
        md: [
          "# The board roadmap",
          "",
          "Everything board-shaped that v1 does not build (see",
          "[proposal-v1.md](proposal-v1.md)). One line each, with the motivating",
          "evidence. The main roadmap's UX items (22 to 31) live here now; their old",
          "numbers are kept.",
          "",
          "Stage 15 ([proposal-v2.md](proposal-v2.md), rulings 251 to 256) took four",
          "items out. The live badge over SSE is its phase 2, and the steering box",
          "with the editable queue is built in the dummy and part of the project",
          "chat. The mobile web pass moved to the main roadmap's item 146, and",
          "approvals on the phone folded into its notification item 145",
          "([../roadmap.md](../roadmap.md)). What the live badge item held beyond",
          "the badge stays below."
        ].join("\n")
      },
      "docs/target-architecture.md": {
        title: "Software factory: target architecture guide",
        sha: "5a8e3b9",
        changed: null,
        md: [
          "# Software factory: target architecture guide",
          "",
          "## 1. What the factory is",
          "",
          "The factory is a largely autonomous system in which agents turn specifications, issues and telemetry into tested, reviewed and deployed software changes. Human involvement is a tool call the agents raise as seldom as possible. An approval is a workflow state, not a meeting.",
          "",
          "The project exists to show that a lone developer can run an enterprise-grade agentic setup. Four constraints follow from that and shape every component:"
        ].join("\n")
      }
    }
  };

  var files = window.DOCS.files;
  var DOCS = window.DOCS;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function resolve(from, target) {
    var parts = from.split("/");
    parts.pop();
    var segs = target.charAt(0) === "/" ? [] : parts;
    var t = target.split("/");
    for (var i = 0; i < t.length; i++) {
      if (t[i] === "" || t[i] === ".") continue;
      if (t[i] === "..") segs.pop();
      else segs.push(t[i]);
    }
    return segs.join("/");
  }

  function anchor(text, target, path) {
    if (/^https?:\/\//i.test(target)) {
      return '<a class="doc-link doc-ext" href="' + esc(target) + '" target="_blank" rel="noopener">' + text + "</a>";
    }
    var hash = target.indexOf("#");
    var frag = hash >= 0 ? target.slice(hash) : "";
    var file = hash >= 0 ? target.slice(0, hash) : target;
    var resolved = file === "" ? path : resolve(path, file);
    if (files[resolved]) {
      return '<a class="doc-link" data-doc="' + esc(resolved) + '" href="#doc=' + esc(resolved) + esc(frag) + '">' + text + "</a>";
    }
    return '<a class="doc-link doc-missing" title="not in this prototype" href="#">' + text + "</a>";
  }

  function inner(raw, stash, path) {
    function hold(html) {
      stash.push(html);
      return "\u0001" + (stash.length - 1) + "\u0002";
    }
    var s = raw.replace(/`([^`]+)`/g, function (m, c) { return hold("<code>" + esc(c) + "</code>"); });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
      return hold(anchor(inner(t, stash, path), u, path));
    });
    s = esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\s][^*]*?)\*/g, "<em>$1</em>");
    return s;
  }

  function inline(raw, path) {
    var stash = [];
    var s = inner(raw, stash, path);
    while (/\u0001\d+\u0002/.test(s)) {
      s = s.replace(/\u0001(\d+)\u0002/g, function (m, n) { return stash[+n]; });
    }
    return s;
  }

  function slug(text) {
    return text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  var RE_UL = /^\s*[-*] +(.*)$/;
  var RE_OL = /^\s*\d+\. +(.*)$/;
  var RE_HEAD = /^(#{1,4}) +(.*?)\s*#*\s*$/;
  var RE_HR = /^ {0,3}([-*_])( *\1){2,} *$/;

  function startsBlock(line) {
    return /^```/.test(line) || RE_HEAD.test(line) || RE_HR.test(line) || /^>/.test(line) || RE_UL.test(line) || RE_OL.test(line);
  }

  DOCS.render = function (md, path) {
    var lines = String(md).replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var seen = {};
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      var m;
      if (/^\s*$/.test(line)) { i++; continue; }
      if (/^```/.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
        i++;
        out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>");
      } else if ((m = RE_HEAD.exec(line))) {
        var id = slug(m[2]) || "section";
        if (seen[id]) { seen[id]++; id += "-" + seen[id]; } else seen[id] = 1;
        var n = m[1].length;
        out.push("<h" + n + ' id="' + id + '">' + inline(m[2], path) + "</h" + n + ">");
        i++;
      } else if (RE_HR.test(line)) {
        out.push("<hr>");
        i++;
      } else if (/^>/.test(line)) {
        var q = [];
        while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i++].replace(/^> ?/, ""));
        out.push("<blockquote><p>" + inline(q.join(" "), path) + "</p></blockquote>");
      } else if (RE_UL.test(line) || RE_OL.test(line)) {
        var re = RE_UL.test(line) ? RE_UL : RE_OL;
        var tag = re === RE_UL ? "ul" : "ol";
        var items = [];
        while (i < lines.length) {
          if ((m = re.exec(lines[i])) && !RE_HR.test(lines[i])) {
            items.push(m[1]);
            i++;
          } else if (/^\s+\S/.test(lines[i]) && items.length && !startsBlock(lines[i])) {
            items[items.length - 1] += " " + lines[i].trim();
            i++;
          } else if (/^\s*$/.test(lines[i])) {
            var j = i;
            while (j < lines.length && /^\s*$/.test(lines[j])) j++;
            if (j < lines.length && re.test(lines[j])) i = j; else break;
          } else break;
        }
        out.push("<" + tag + ">" + items.map(function (t) { return "<li>" + inline(t, path) + "</li>"; }).join("") + "</" + tag + ">");
      } else {
        var p = [];
        while (i < lines.length && !/^\s*$/.test(lines[i]) && (p.length === 0 || !startsBlock(lines[i]))) p.push(lines[i++].trim());
        out.push("<p>" + inline(p.join(" "), path) + "</p>");
      }
    }
    return out.join("\n");
  };

  function plain(s) {
    return s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/`([^`]*)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/[*`\[\]]/g, "");
  }

  DOCS.firstParagraph = function (path) {
    var f = files[path];
    if (!f) return "";
    var lines = f.md.split("\n");
    var i = 0;
    while (i < lines.length) {
      if (/^\s*$/.test(lines[i]) || startsBlock(lines[i])) {
        if (/^```/.test(lines[i])) { i++; while (i < lines.length && !/^```/.test(lines[i])) i++; }
        i++;
        continue;
      }
      var p = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !startsBlock(lines[i])) p.push(lines[i++].trim());
      var text = plain(p.join(" "));
      return text.length > 280 ? text.slice(0, 279).replace(/\s+$/, "") + "\u2026" : text;
    }
    return "";
  };

  DOCS.label = function (path) {
    var named = {
      "docs/roadmap.md": "roadmap",
      "docs/plans/2026-09-24-build-plan.md": "build plan",
      "docs/plans/2026-10-15-backlog-pull-and-close-out.md": "backlog plan",
      "docs/layers.md": "layers",
      "docs/architecture.md": "architecture",
      "docs/board/roadmap.md": "board roadmap"
    };
    return named[path] || path.split("/").pop().replace(/\.md$/, "");
  };

  DOCS.tree = function () {
    function node(dir) {
      var d = { name: dir.split("/").pop(), path: dir, dirs: [], files: [] };
      var subs = {};
      Object.keys(files).sort().forEach(function (p) {
        if (p.indexOf(dir + "/") !== 0) return;
        var rest = p.slice(dir.length + 1);
        var slash = rest.indexOf("/");
        if (slash < 0) d.files.push({ name: rest, path: p, title: files[p].title });
        else subs[rest.slice(0, slash)] = true;
      });
      Object.keys(subs).sort().forEach(function (s) { d.dirs.push(node(dir + "/" + s)); });
      return d;
    }
    var roots = {};
    Object.keys(files).forEach(function (p) {
      if (p.indexOf("/") > 0) roots[p.split("/")[0]] = true;
    });
    return Object.keys(roots).sort().map(node);
  };

  var opened = [];
  DOCS.nav = {
    stack: [],
    index: -1,
    open: function (path) {
      if (this.current() === path) return path;
      this.stack.splice(this.index + 1);
      this.stack.push(path);
      this.index = this.stack.length - 1;
      opened.push(path);
      return path;
    },
    back: function () {
      if (!this.canBack()) return null;
      this.index--;
      return this.stack[this.index];
    },
    forward: function () {
      if (!this.canForward()) return null;
      this.index++;
      return this.stack[this.index];
    },
    current: function () { return this.index >= 0 ? this.stack[this.index] : null; },
    canBack: function () { return this.index > 0; },
    canForward: function () { return this.index < this.stack.length - 1; },
    recent: function () {
      var r = [];
      for (var i = opened.length - 1; i >= 0 && r.length < 6; i--) {
        if (r.indexOf(opened[i]) < 0) r.push(opened[i]);
      }
      return r;
    },
    hash: function (path) { return "#doc=" + path; },
    fromHash: function (hash) {
      var m = /^#?doc=([^#]+)/.exec(hash || "");
      return m ? m[1] : null;
    }
  };

  var shaCount = 0;
  function nextSha(seed) {
    var h = 5381;
    var s = seed + ":" + (++shaCount);
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    var hex = ("0000000" + h.toString(16)).slice(-7);
    return hex;
  }

  function headTitle(md, path) {
    var m = /^#{1,4} +(.+)$/m.exec(md);
    return m ? plain(m[1]).trim() : path.split("/").pop().replace(/\.md$/, "");
  }

  DOCS.save = function (path, text) {
    var f = files[path];
    if (f && f.changed) {
      var c = f.changed;
      f.changed = null;
      return { ok: false, by: c.by, at: c.at, current: f.md };
    }
    var sha = nextSha(path + text);
    if (!f) files[path] = f = { title: headTitle(text, path), md: text, sha: sha, changed: null };
    else {
      f.md = text;
      f.sha = sha;
      if (/^# /m.test(text)) f.title = headTitle(text, path);
    }
    return { ok: true, sha: sha, at: "14:12" };
  };

  DOCS.conflictNext = function (path) {
    if (files[path]) files[path].changed = { by: "Sebastian", at: "14:08" };
  };

  DOCS.newPath = function (name) {
    var s = String(name).trim().toLowerCase().replace(/\.md$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return "docs/" + (s || "untitled") + ".md";
  };
})();
