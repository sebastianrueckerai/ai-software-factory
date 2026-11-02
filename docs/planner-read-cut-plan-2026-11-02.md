# The planner's read set: digest reads for the session agents

Written 2026-11-02. Status: plan, awaiting Sebastian's OK. Nothing built.
This is fault 7 of docs/needed-fixes.md.

## What happened, mechanically

Card #1383's three planner sessions each read 20+ files and ended with no
plan. The register's "opencode serve: context canceled" is factoryd's own
wrap of the activity's context ending (opencode.go:234-246): those two
sessions hit the agent-time wall mid-serve, not a provider refusal. The
chain that ate the clock: every read lands whole in the premium context;
opencode's auto-compaction (opencode.go:1037, at three quarters of the
served window) answers with a whole-conversation summarisation on the
session's own premium model, a slow call over near-100K input; enough
reads force enough compactions that the wall clock runs out first. The
session cap then closed the card, and the readsFinding told each next
session which files the last one read and to "file the plan from what
they hold" — but a fresh sandbox holds nothing of what they hold, so the
next session re-reads and dies the same death. €3.54 of €5.00 bought the
loop three times.

The ceiling relief landed: infra 18e7418 serves premium's real 128000
window, compaction at 96K input. The structural fact stands: the
planner's only interface to the repository is the raw read. Nothing
between the repository and the premium context mediates or bounds what
enters; discovery, extraction and drafting are all whole-file reads
inside one finite context on the metered class, under a wall clock. The
guide itself says "Read it and the repository" (plan.go:1100), and the
harness preamble tells the model to batch parallel reads.

The medicine exists, chat-side only: 798ea748's one-digest read
(`OperatorModel.Digest`, one Small call, the answer bounded at 2,048
tokens) serves the console chat's asked reads. The session agents' menu,
the gateway's factory-tools server, has no digest — analyze_image,
escalate, file_plan, manual and the paid web pair — so the planner reads
everything itself, raw.

## The judgment the handover asks

The 128K window plus the chat's digest is not enough. The window is a
ceiling, not a flow: the deaths were flow deaths, reads feeding
compactions feeding the clock, and a bigger card fills any window. And
the digest that landed never reaches a session. The planner's read flow
needs its own cut.

## The cut

Roadmap 300's pattern delivered to the session agents: premium decides,
depth comes from one-shot Small calls, the raw read stays one call away.

1. **`digest(path, ask)` on the factory-tools menu.** One file of the
   workspace — the repository, `/workspace/docs`, a companion — goes to
   one Small call through the existing Digest wrapper; the bounded
   answer enters the thread, the file's bytes never do. Small carries
   credits, never euros: no budget, cap or grant arithmetic changes, and
   the call spends no agent time worth naming. The plumbing is
   analyze_image's end to end: the gateway's MCP registration and
   handler beside it (tools.go:524, tools.go:1121), a Digester
   hand-over beside ImageLooker (tools.go:242), factoryd's
   POST /internal/digest beside ImageLookHandler (image_look.go:50)
   reading the file from the running session's pod the way
   workspaceImage does (image_look.go:228) on a worker POST /file beside
   checkin.go's POST /image (checkin.go:104), then `OperatorModel.Digest`
   (operator.go:156). Policy: `PurposeDigest` maps to Small without the
   chat gate (policy.go:1418-1427), and the tool joins FreeTools
   (policy.go:1094) so every session class gets it. FreeTools only
   admits the candidate: the live tree must also list it — `digest: {}`
   beside `analyze_image: {}` in factory/policy.yaml's three class
   stanzas (coder, analyzer, planner), for the class list, not
   FreeTools, gates a session's menu and every call (AllowsSessionTool,
   the gateway's list filter, admission). The order is code first, tree
   after its roll: a tree naming a tool the running factoryd does not
   know is unloadable (fault 11's shape), while rolled code without the
   listing is merely tool-less. The tree's schema enum needs no hand —
   factoryd opens the pull request for a stale copy itself. The tree
   commit is Sebastian's, the rename runbook's finding that infra sits
   outside every agent credential; that runbook page is the shape of
   the hand. My call: tree-last, not one roll with the code. Bounds: one
   path, an
   ask of at most 2,000 characters, the file at most 128 KiB of text
   (the builder may move the number; the constraint is that the input
   fits one Small call beside the ask; a bigger file is refused naming
   the read tool's ranges). The answer returns as `path: answer`, the
   chat's label shape, and a timeout bounds the call as the image look
   bounds its own. Every refusal names the state and the fitting
   action.
2. **The guide's read discipline.** planGuide's "Read it and the
   repository: every card follows the repository's conventions"
   (plan.go:1100) becomes the discipline: map before reading — grep,
   glob and the explore subagent (already on factory/small and free,
   opencode.go:981) for discovery; digest the big files with a pointed
   ask; read raw only the slice a digest points at. The conventions
   sentence stays. One passage, the steering line the chat's phase 2 set
   beside its asked reads.
3. **The readsFinding names the cure.** The finding (plan.go:2432) keeps
   the paths and changes its instruction: digest the listed files where
   the plan needs their detail, read raw only the pointed slice. The
   retry inherits the dead session's work at digest price instead of
   re-dying at read price.
4. **Builder check: the compaction model.** If the pinned opencode
   (1.18.32) honours a model key in buildOpencodeConfig's compaction
   block (opencode.go:1037), set it to factory/small: the backstop
   compact becomes a free, fast call instead of a premium one over 96K
   input. If it does not, compaction stays as it is; the cut above makes
   it rare.

## Tests

- The digest tool through the MCP rig: one Small call, its message
  holding the ask and the file's text, the answer bounded and labelled
  `path: answer`; the refusals — no path, a long ask, an oversized file,
  a task not running — each naming the fitting action; the audit row
  beside the image look's.
- The worker's POST /file: absolute inside the workspace, a directory
  and a missing file refused by name, the byte cap enforced, text only.
- `FactoryModel` admits `PurposeDigest` on a session's task as Small,
  and the chat's mapping is unchanged.
- planGuide carries the discipline and readsFinding the digest wording
  (the existing guide and finding tests gain their pins).
- The agent map regenerates with the planner's page carrying the new
  tool at the new SHA, per agent-context-map.md's recipe.

## Alternatives considered

- **Steering alone, zero build.** The explore subagent on small already
  sits in every session. Its report is unbounded, its loop slower, and
  nothing steers the planner to it today; a guide change alone asks the
  model to be careful, the thing the design principle rules out. The
  tool carries the discipline; the guide names it.
- **A pre-digested spec on the card**, the handover's extraction pass.
  The plan docs already are digests that name their files — #1383's mass
  was the code, not the docs — and the docs a card cites cannot be
  picked out of brief prose deterministically. The readsFinding trigger
  is the clean variant, and rung 3 is it.
- **Compaction as the cure.** Lossy exactly where planning needs
  precision (names, seams, counts), billed premium, and its failure mode
  kills the session — the chat's compact-empty fault showed the shape.
  Compaction stays the backstop, rarely needed.
- **A research subagent for sessions**, the chat plan's phase 5. The
  task tool already gives every session a bounded small loop; a richer
  one waits for a real question that hits its bounds, the chat plan's
  own ruling on named scratchpads.

## Non-goals

- The phase-2 refile, chat-side and first of the parked queue: its own
  card, sharing the Digest wrapper this plan extends to sessions.
- Session caps and the grant arithmetic (fault 3's family), and the
  wall-clock numbers themselves.
- The coding agent's guide: the tool serves every session; the
  discipline lands in the planner's guide, where the fault's evidence
  is. A coder dying the same death is its own fault with its own
  evidence.
- No replay or elision change for sessions: opencode owns the
  transcript, and a digest is cheap to re-ask.

## Cost and risk

One tool on a proven path, one passage, one string, one possible config
key. The risk the tool adds: a digest that misleads plans wrong — bounded
by the raw read one call away and by readPlan's validation refusing a
broken plan. The Small class's reliability history (the thinking-empty
compact, the quota swaps) is the real exposure; both fixes landed (infra
c53d5bb, the empty-answer fold), and a digest that fails names its state
and is re-askable, on credits.
