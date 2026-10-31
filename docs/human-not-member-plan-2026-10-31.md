# The console and the chat say human, not member

Written 2026-10-31. Status: done 2026-11-01, by Sebastian's order.

## The decision

The console and the project agent's chat call humans "members". The word
came from Forgejo: the access model was built on its membership noun ("A
member is a write collaborator", architecture.md), and
the noun leaked from identifiers into comments and then into copy. The
policy key `ai_members` now lists AI agents as members too, so the word
names a human or an agent, and the project agent parrots the vocabulary
its own tool table teaches it. The fix is by construction: the copy itself
says human, and the writing guide holds the rule afterwards. Sebastian's
request is the guide's owner OK.

## What the new copy says

- Guide bullet, Words section, both copies (the embedded
  `internal/writingguide/writing-guide.md` and `docs/writing-guide.md`):
  "A human is a human. Say human, never member, operator or resource. A
  member may be an agent."
- Persona, `internal/console/chat.go` at 1561 and 1565: "you work for
  %[2]s, a human of the project" and "The human decides."
- Tool table, `internal/console/chat_tools.go`: the titles "Invite a
  human", "Ask the human", "Escalate to the humans", and every about,
  description and refusal string: member becomes human ("a human steers
  through the chat", "the ask then reaches the human").
- `internal/console/actions.go:2134`, after the collaborator add: "%s has
  write access; the console admits them within a minute." It names the
  fact the check established, not the noun.
- Every other site below: member becomes human.

## The sweep

All paths in `ai-software-factory-code`, from its root.

Model-facing copy:

- `internal/console/chat.go`: 87 ("It is another human's."), 1026 ("The
  human may undo it."), 1561, 1565.
- `internal/console/chat_tools.go`: 1439, 1491, 1608, 1614, 1616, 1621,
  1624, 1626, 1642, 1651, 1689, 1697, 1706, 1852, 1951, 1953, 1955, 1964,
  1970.
- `internal/console/actions.go`: 478 ("Tell the human what needs filing"),
  2134.
- `internal/factoryd/plan.go`: 902 ("the humans' answers"), 1099 ("the
  humans confirm the spec in Needs you"), 1144 ("the spec leaves to the
  human").
- `internal/factoryd/chat.go`: 1287 ("the proposal or undo is another
  human's").

Deterministic UI copy:

- `internal/console/templates/board.html`: 137, 152, 157, the "waiting for
  a member" tooltips.
- `internal/console/templates/metrics.html`: 35; the line rewords around
  the policy key `ai_members`, which stays.

Guide:

- `internal/writingguide/writing-guide.md`: the Words bullet.

Tests that pin the copy change with it: `internal/console/chat_test.go`
pins member 59 times, plus the actions, wake, fund_chat, docs, lab, events
and access tests, `acceptance/tell_card_test.go`, and the factoryd plan
and chat tests. Identifier tests stay.

## What does not change

- Code identifiers: `rMember`, `Members()`, the members store,
  `EventMemberInvited`, `MessengerStore`.
- The policy key `ai_members` and the infra lines that use it.
- Stored values: the decider string "member" in rows, history. No
  migration.
- Code comments and log lines: not copy. They may change where a line is
  edited anyway.
- The board column "Needs you".

## Order of work

1. Code repo, one commit: the sweep, the guide bullet in the embedded
   copy, the test pins. `go test -race ./...` green.
2. Docs repo, one commit: the same bullet in `docs/writing-guide.md`, this
   plan's status line.
3. The next ruling in the ledger: the console's copy says human, never
   member, because a member may be an agent, with the date.
4. Verification: a search for member inside string literals of
   `internal/console` and `internal/factoryd` returns only identifiers,
   comments and log lines; the templates return nothing.

Work in a worktree per the standing git workflow, commit to master, push
both remotes, delete the worktree.
