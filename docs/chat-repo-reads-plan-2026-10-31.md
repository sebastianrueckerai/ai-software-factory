# The repository reads: tree and grep without a shell

Written 2026-10-31, on Sebastian's ask: "Can we give it grep and tree
like capabilities without running arbitrary bash?" Status: plan, the
shapes approved in conversation, nothing built. It designs roadmap 306's
two repository reads. The survey
([chat-tools-survey-2026-10-31.md](chat-tools-survey-2026-10-31.md))
endorsed the shapes from the field; this plan designs them for the
factory.

## The answer

Yes, with no shell anywhere. The `file` tool already shows the shape:
fixed Go code in the console calls Forgejo's API as the member, and the
model supplies only data, a ref and a path. Both new reads keep that.
The model names a ref, a path prefix and a pattern, and deterministic Go
does the rest. Nothing the model writes becomes a command, so the ruling
stands as written: the agent runs no code. A pattern handed to a fixed
grep is data, the way a path is data to the raw fetch.

## tree

One API call: `GET /api/v1/repos/{owner}/{repo}/git/trees/{ref}` with
`recursive=true`. Forgejo answers the whole tree in one response, every
path with its type and size, and its own truncated flag when it cut a
very wide tree.

- Parameters: `ref` (required, as `file`'s) and `path` (an optional
  prefix, the sub-tree to list).
- Answer: one line a file, path then size in bytes. Directories do not
  get lines of their own, their files carry the path.
- Cut: the first 500 lines, then `(cut at 500 of N files)`. If Forgejo's
  truncated flag is set, the answer names that too.

## grep

Forgejo's v1 API has no repository content search: the instance's code
search is a web page over its indexer, not an API door. So grep is one
archive call plus in-memory scanning, never a per-file fetch storm:

- One request: `GET /api/v1/repos/{owner}/{repo}/archive/{ref}.tar.gz`,
  the whole tree as one tarball, read through a size limit of 100 MiB. A
  bigger archive is a refusal that names the size, read from the stream,
  not downloaded first.
- The pattern compiles as a Go regexp (RE2: linear time, no pathological
  backtracking). Parameters: `pattern` and `ref` required, `path` an
  optional prefix.
- The walk, all bounds named in the answer: scan at most 2,000 files,
  skip binaries by `file`'s NUL sniff, scan a file's first 64 KiB (the
  `file` limit), stop at 50 matches. One line a match, `path:line:` and
  the line cut at 200 characters. The answer ends with the count line,
  for example `(scanned 940 of 1,312 files, 50 matches, cut)`.
- An empty pattern or one that does not compile is a refusal naming what
  to fix, in the house refusal voice.

## What changes where

- Two registry entries beside `file` in chat_tools.go: `tree` and
  `grep`, reads like the others. No confirm, the member's Forgejo
  identity, the same `t.c.as` client `fileText` uses. `policy.ChatTools`
  gains the names and the access floor seats them with the reads.
- No new console route: the parity ruling runs from the console's reads
  to tools, not the other way. A tool without a console page is the
  `session_search` shape.
- The prompt's steering line beside the attachments line: "for a file
  you cannot name, tree first and grep for its words."
- Tests: the reads rig gains a fake trees endpoint and a real small
  tar.gz built in the test. Pins: the cut lines, the binary skip, the
  per-file cap, the archive-size refusal, the pattern refusals.
- The digest plan's `ask` parameter does not ride these two: both
  answers are bounded by construction, unlike `file`'s whole text.

## Non-goals

- No outline view (functions per file): a later kind on `tree` if live
  work asks for it. The survey says the same.
- No search over the documents' four roots or the configuration
  repository: the same shape could reach them later, today's reads stay
  on the project's own repository.
- No search over Forgejo issues or pull requests: the signal plane owns
  outsiders' words.
- No shell, ever: work that needs more than these fixed shapes goes to a
  card's sandbox, roadmap 306's ruling.

## Left to the builder

- The caps' numbers (500 lines, 100 MiB, 2,000 files, 64 KiB a file, 50
  matches, 200 characters a line): starting points, tuned from live use.
- Whether `grep` takes an `ignore_case` flag. Start without it and let
  live use ask.
- The trees endpoint's pagination on very wide trees: Forgejo's
  truncated flag carries the honesty, the wording of the line is
  open.
- The refusal wordings, in the house voice.

## Sources

Sebastian 2026-10-31 ("Can we give it grep and tree like capabilities
without running arbitrary bash?"; "I want a plan for new agent tools,
not execution yet"). The survey
([chat-tools-survey-2026-10-31.md](chat-tools-survey-2026-10-31.md)).
Roadmap 306. Forgejo's v1 API: the git trees endpoint with
`recursive=true`, the archive endpoint, and no content-search door
([Forgejo API usage](https://forgejo.org/docs/v16.0/user/api/usage)).
The `file` tool's fetch as the pattern (chat_reads.go, fileText).
