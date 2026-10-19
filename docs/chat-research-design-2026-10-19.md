# The chat's research capability: files and the research sandbox

Written 2026-10-19, from the design discussion of the same day. This file
turns the discussion into a concept: the decided parts, the constraints,
and what the builder settles. Status: design, approved by Sebastian in
conversation. Nothing here is built.

## Why

The chat agent reads a repository only by a path it already knows: the
`file` tool takes an exact path and ref of the project's repository, and
read_doc takes an exact document path inside the document roots
(docs/roadmap.md, docs/plans/, docs/board/, docs/<name>.md). When the
session agent was asked to build the sandbox-images feature, it spent four
calls guessing paths for a plan that sat at
docs/superpowers/plans/, outside every root, and no tool could answer
"what is actually there". It stopped correctly and asked. The gap is
real: no tool lists paths, and nothing searches file names.

The chat's role stays what it is: it decides, it asks, it files cards, it
never writes code. But writing good cards needs research, and research
needs more than exact-path reads: find a file, search a repository, check
out a branch, read a file, measure something. Two tools close the gap, in
keeping with stage 16's principles: every console read is a tool, and a
small default context with depth fetched by tools.

Refused on the way: bash inside the console process. The chat runs
server-side with the member's rights over APIs; a shell there would hold
whatever the console reaches (Forgejo, the store, Postgres, the gateway)
behind nothing but a prompt line that says "read-only". Read-only is not a
boundary. The factory already built the right place for arbitrary code:
the sandbox.

## The files tool

One read tool, closing the path-guessing gap:

- `files`: list paths in a repository at a ref, filtered by a path prefix
  or a name substring. Answer: at most 50 paths plus the total count.
- Two credential paths, matching the two read paths that exist: on the
  project's repository the tool rides the member, the same rights the
  `file` tool uses, any ref; on the document repository it rides the docs
  writer token, the way every document read already does, and master
  only, since members hold no rights on chat.doc_repo and the document
  tools serve master. A ref named for the document repository is refused
  with "the documents serve master".
- Backed by the Forgejo git trees API, one call per answer.
- Listing names reads no content, so it adds no trust surface.
- The two "There is no X at ref" refusals (the file tool's, and read_doc's
  out-of-roots and missing-path refusals) gain the fitting action: "files
  lists what is there".

Content search across a repository (a grep) stays out until a real
session needs it: Forgejo's API has no code search, so it means fetching
and scanning candidates. The failure class this closes is wrong path
guesses, and the listing closes it.

## The research tool

One tool: `research` runs a shell command in a sandbox pod and returns the
output. The pod is the division of roles made concrete:

- **A pod per conversation.** The workspace belongs to one research
  thread. Two conversations researching the same project must not fight
  over one checkout. At most 2 live research pods per project; the oldest
  is reaped beyond that.
- **State is the filesystem, not the shell.** Every command runs in a
  fresh shell whose working directory is the pod's workspace, an emptyDir
  on the pod. `cd` persists across commands; environment variables do
  not. The model writes a script into the workspace and runs it when it
  wants more.
- **The keyring is the role division.** The pod holds a read-only,
  short-lived git token covering the project's origin repository and its
  fork, where factory/<task-id> branches and open pull request heads
  live, so the model can clone and check out the branches that matter, a
  card's in-flight work among them. It holds no write token, no model
  credentials, no card tools, no chat identity. It cannot commit, file,
  spend or message, because nothing inside it authenticates as anything
  that could.
- **The clone is automatic.** Pod creation clones the origin repository
  at the default branch head with branches fetched; the first command
  lands in a ready checkout.
- **The confinement is the session machinery.** The pod runs where task
  pods run: gVisor, restricted pod security, no root, read-only root
  filesystem, the Cilium egress policy. No shared project cache mount,
  the way reproPodSpec refuses it (ruling 291): the cache is a write
  surface between sessions, and a research pod builds cold in its own
  emptyDir.
- **It runs on the project's image**, resolved the way the sandbox-images
  design resolves images: the conversation's project default, so the
  factory's own agent researches with Go and Node in reach, a media
  project's agent with ffmpeg.
- **Ten minutes of slack.** The pod lives ten minutes after its last
  command, then the namespace is reaped, the way the roller holds a
  30-minute slack. Research requests cluster while a person talks to the
  agent, so the pod survives a pause and dies in the quiet.
- **The reap is named, not silent.** A command that arrives after the pod
  died gets "fresh workspace, cloned <repo> at <head>" instead of a
  mystery failure.
- **Caps.** A command runs at most 300 seconds by default, 900 hard. Its
  output cuts at 8 KiB, and the cut names itself and the narrowing ("cut
  at 8 KiB: grep -l, or name a path"). One command at a time per
  conversation; the tool is synchronous.
- **It lands after the sandbox-images image resolution**, which this
  design rides: the pod runs the project's pinned image, and a project
  with no pin at call time refuses, naming the sandbox-images pipeline
  as the fitter. No temporary image source, per the sandbox-images
  migration ruling.
- **Member floor.** The tool sits in the chat's access table with the
  reads, and the caps are the bound on the infrastructure it provisions:
  two pods per project, ten minutes of slack, capped commands.

The command path: factoryd has no exec machinery, and building SPDY or
websocket exec against the raw kube client is real code. My call: the
agent-worker binary the base image already carries gains a research mode,
a small command loop that owns one local port; factoryd posts commands to
it at the pod's IP and streams the output back. The pi harness note names
the pattern: the worker owns the pipe and exposes the one port factoryd
may reach. The egress policy lets factoryd reach that port on research
pods and nothing else.

## Context discipline

The tools must not bloat the chat's context. Five rules:

1. Two tool schemas, one-line descriptions. The whole checkout, search,
   print, count sequence is one tool with a command string; no family of
   research_clone, research_run and friends.
2. Every answer is capped, and a cut names itself and the next narrowing.
3. Search returns addresses, not content: paths and line numbers, with
   reading depth a second call against a named slice. read_doc's shape
   (head, line ranges, find) applied to the workspace.
4. The workspace says nothing until asked: no standing preamble, no
   echoed git status, no state recap. A command's answer is that
   command's output, capped, plus the reap line when one is due.
5. Big artifacts never enter the context. A long log or file stays in the
   workspace; the model reads slices by line range or hands the file to
   its existing subagent summariser, the pattern documents already use.

## Non-goals

- Bash in the console process, refused above.
- Content grep across a repository, until needed.
- Environment-variable state across commands; the filesystem is the state.
- A research tool for projects without sessions (agents none): the tool
  does not appear for them, or refuses naming why.

## Left to the builder

- The exact tool schemas and their one-line descriptions.
- The trees API call and the running Forgejo's answer shape, verified
  against the live instance before the tool lands.
- The research mode of agent-worker, its port, and the factoryd-to-pod
  transport; the Cilium policy that lets factoryd reach research pods on
  that port and nothing else.
- The synthetic namespace id scheme for research threads, on the existing
  per-task namespace machinery (freshNamespace, quota, limit range).
- The reap timer and the per-project cap enforcement.
- The wiring is in-process: the console is compiled into factoryd and
  holds it as interfaces, so the research tool calls a Runner method the
  way it holds the store, and no HTTP hop or token scheme gets built for
  a call that never leaves the process.
- The mechanical seams a plan needs: the chat stream's write deadline
  against long commands (a keepalive in chat.go), the BootSweep pattern
  for research pods orphaned by a factoryd restart, the paged trees use
  at forgejo.go:1338 worth reading first, and the AgentsNone policy
  field as the agents-none gate.

## Sources

Sebastian 2026-10-19 (the design conversation: the files tool, the
research sandbox, the keyring, ten-minute slack, stateful workspace,
context discipline; and "we never wanted to build a prison, its more
about division of roles"). The incident: the session agent's four
refused path guesses on docs/superpowers/plans/2026-10-19-sandbox-images.md.
Stage 16's four principles. The sandbox-images design of the same day
(the image resolution the research pod rides). Roadmap 42 (the egress
guard), 252 (image GC), 291 (the shared cache refusal), 300 (documents
read by tools, never from context; the subagent summariser). A builder
check on the same day folded in five answers: the docs token for the
document repository's listing, the fetch token's fork coverage, the
in-process wiring, the ordering after sandbox-images, the member floor.
