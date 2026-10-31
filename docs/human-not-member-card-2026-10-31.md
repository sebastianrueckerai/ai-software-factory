# Parked card spec: The console and the chat say human, not member

Filed by sebastian's instruction 2026-10-31, held by the closed intake (plan #1344 open on main). Retry on timer or file by hand from this text; do not start until sebastian says go.

Title: The console and the chat say human, not member

The problem: the console and the chat call humans "members". The word came from Forgejo membership, and the policy key ai_members lists AI agents as members too, so "member" names a human or an agent. The copy changes to "human".

The card's work, all in this repository:

1. The writing guide, internal/writingguide/writing-guide.md, Words section, one new bullet:
   A human is a human. Say human, never member, operator or resource. A member may be an agent.

2. The chat persona, internal/console/chat.go, the prompt() function: "you work for %[2]s, a human of the project" (was "a writer of the project") and "The human decides." (was "The member decides."). Same file: the refusal "It is another member's." becomes "It is another human's." and "The member may undo it." becomes "The human may undo it."

3. The tool table and refusal texts, internal/console/chat_tools.go: every "member" in a tool title, about, description or refusal string becomes "human": "Invite a human", "Ask the human", "Escalate to the humans", "answers the humans may press", "this conversation's human", "every human's" for the threads and search tools, "a human sent" for the image and document tools, "a human steers through the chat" in the system text, "the ask then reaches the human", "the human can fund more", "the pool's money, or the human's". Sites: lines 1439, 1491, 1608, 1614, 1616, 1621, 1624, 1626, 1642, 1651, 1689, 1697, 1706, 1852, 1951, 1953, 1955, 1964, 1970. Line numbers drift; the quotes anchor.

4. internal/console/actions.go: "Tell the member what needs filing" becomes "Tell the human what needs filing"; after the collaborator add, "is a member; the console admits them within a minute." becomes "has write access; the console admits them within a minute."

5. internal/factoryd/plan.go: "the members' answers" becomes "the humans' answers"; "the members confirm the spec in Needs you" becomes "the humans confirm the spec in Needs you"; "the spec leaves to the member" becomes "the spec leaves to the human".

6. internal/factoryd/chat.go: the error "the proposal or undo is another member's" becomes "the proposal or undo is another human's".

7. The templates: internal/console/templates/board.html, the three "waiting for a member" tooltips (lines 137, 152, 157) become "waiting for a human"; internal/console/templates/metrics.html line 35 rewords "a member the policy lists in ai_members" to say human, keeping the policy key ai_members unchanged.

Do not change: code identifiers (rMember, Members, EventMemberInvited, the members store, MessengerStore), the policy key ai_members, stored values (the decider string "member" in rows), code comments, log lines, the board column "Needs you".

Tests pin the wording, chat_test.go alone 59 times; sweep the copy pins with the copy. go test -race ./... must be green.