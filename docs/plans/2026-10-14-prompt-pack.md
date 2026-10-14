# Plan: the prompt pack's first two entries, and the context snapshot

Sebastian's decisions of 2026-10-14, from the flow discussion: the writing that reaches a human follows his ste-writing guide, and the guide ships as the factory's default that a user replaces file by file. The agents file's default is distilled from his global CLAUDE.md, the name generalised to user, its controller-only parts left out. The workers get none of the writing guide: their reader is the gates, and a worker talking to a user is the exception. No GUI: the files are the interface. After the pack lands, the context snapshot reports what each class and the main chat actually carry, segment by segment, so "keep context free" stays a number and not a hope. This is the layers doc's prompt pack (section 3) with its first two entries filled. Sources: the flow discussion of 2026-10-14, [layers.md](../layers.md) section 3, item 201's context audit ([the audit plan](2026-10-13-context-audit.md)), Sebastian's global CLAUDE.md and ste-writing skill as the defaults' sources, Stage 17's per-call records.

## What exists

- The pack's ruled shape: factory defaults a project inherits and overrides, shipped as data in the config tree; factory guides stay Go constants, project guidance is data ([layers.md](../layers.md), section 3).
- The injection point: the pinned harness injects AGENTS.md itself per session (opencode.go:699-712 in the code repository), and the factory guides are injected per class today as constants (opencode.go:585-712).
- ste-writing: the writing rules (Orwell's five, words, verbs, sentences, punctuation, structure, tables, questions, the guard). It is Sebastian's file; the default ships generalised: user where his name stands, nothing machine-specific.
- The global CLAUDE.md: user-facing parts to distil (how to answer, when to ask, the coding guide) beside controller-only parts that stay out (worktrees, transcript machinery, delegation, the ledger).
- Item 201's audit rule: a fact stated once; nothing restated that a tool description, a schema or the harness already carries.
- The ledger records each call's tokens and body bytes (Stage 17), so the snapshot is a report over existing records.

## Work items

1. **Two pack files as data.** writing.md (ste-writing's content, generalised) and agents.md (the distilled CLAUDE.md) in the config tree's default pack, each one concern: writing.md owns how output to a human reads, agents.md owns conduct and the coding guide; where the two would repeat a rule, one file holds it and the other does not restate it (201's rule).
2. **Who gets what, as data.** The class-to-files mapping sits beside the pack in the config tree, and it names surfaces, not only classes: the project chat, the planner's plan text, the review and approval notes, and the closing stage whose summary the human reads get writing.md (the pack rides the closing guide's injection there); plain worker sessions get none. agents.md stays what it is today for workers, the project repository's own file seeded at registration: the pack's agents.md is that seed's new default content, not a second injection.
3. **The override, one layer.** A user file with the same name replaces the default; the resolution is default, then user, and nothing deeper. The project's AGENTS.md keeps its existing precedence as the project's own file.
4. **No restatement, checked once.** Before the first ship, one pass over the two files against the tool descriptions and the harness conventions they ride with: every sentence either carries a rule nothing else carries or goes.
5. **The context snapshot.** A report over the ledger's per-call records: per class and for the main chat, one representative request split into named segments — system, tool definitions, pack files, brief, history — a token count each, the segments summing to the recorded call size. Run at the round close and after any pack change; a ledger report first, a console surface later if wanted.

## Not in this round

A GUI for the pack, per-project writing overrides beyond the user layer, the skills mechanism (the harness brings its own), pack entries beyond these two (the debugging guide and the audit pair stay the layers doc's open list), the durable main-loop agent (the item after 205), the snapshot as a live gauge on the session header (the board roadmap's context gauge item).

## Verification

Live: the project chat's answers and a freshly filed card's summary read by the writing guide's rules. A deliberately marked user writing.md replaces the default and the marker reaches the injected context of the chat class and no worker's. The snapshot's segment counts sum to the recorded call size within the record's own tolerance. `go test -race ./...` in the code repository.
