# The ask's bound action: the press runs it, no interpretation

Written 2026-10-31. Status: plan, awaiting Sebastian's OK. Nothing
changed.

## What happens today

The chat's `ask` tool offers its choices as presses, but a press is only
a message: the client sends the choice's text as the human's own row
(chat.js:411, "an ask answers as the member's own message") and the next
model turn reads that row as free text (answer.go:141, `askMember`:
"the member's press or their next message is the answer the next turn
reads"). Every ask is model-interpreted, the press included. A misguided
model can read "leave it" as "do it", and for a tool that runs
unconfirmed at its level, say `approve_merge` at full auto, that reading
executes.

Two surfaces already answer the right way. An escalation card answers
through `POST /projects/{name}/chat/answer`: the choice is checked
against the row's choices and the decision runs with no model turn
(answer.go:24, `chatAnswer`). A confirmed tool call stores a proposal
and only the Do it press applies it (chat.go:963 `turn.call`, chat.go:1075
`chatProposal`). The ask is the one question surface that still accepts
interpreted text.

Sebastian, 2026-10-31: a question that gates an action must answer by a
button. The tool call brings up the button, the press decides, and no
model reads the answer in between.

## The design

One bound action per ask. The `ask` tool gains three optional
parameters: `tool`, `args` and `choice`. `choice` names one entry of
`choices`. Pressing it runs the bound tool call with the stored
arguments, in code, as the human's session. Pressing any other choice
settles the ask and records the choice as the human's row. A typed
message answers nothing while a bound ask stands open.

The park: while a bound ask stands open, `turn.call` refuses the bound
tool, with a refusal that names the state and the fitting action. The
model cannot ask and then act on its own reading of a typed reply.

Asks without a binding keep today's behaviour exactly: press or next
message, model-read, nothing changes for them.

## The mechanism

1. **Storage.** The binding is a `ChatProposal` of a new kind `ask`. The
   struct (internal/factoryd/chat.go:1274) gains the bound choice's
   label (`Choice string`), the ask row gains the token
   (`ChatMessage.Proposal string`), the columns `chat_proposals.choice`
   and `chat_messages.proposal` carry them. `askMember` validates and
   stores the binding under the checks the propose path already runs in
   `turn.call`: the tool exists, is no internal one, is a write tool, is
   not `ask` itself, the arguments normalise, `admitTool` passes for the
   human's roles, and `describe` writes the human-facing line. `choice`
   must be one of `choices`.
2. **One surface.** Proposals of kind `ask` are excluded from the
   pending Do it list (chat.js:188 `pendingOf`), so the ask row is the
   only card that offers the action. Two surfaces for one decision is
   the fault of the check-in stop (needed-fixes 1), not a shape to copy.
3. **The press.** `chatAnswer` gains a branch for a row of kind `ask`
   with a live binding. The pressed choice is the bound one: take the
   proposal (chat.go:83 `take`) and `apply` it exactly as `chatProposal`
   does, streamed, the `do-<token>` row, decider `member`. Any other
   choice of the row: clear the binding, land the human's row with the
   choice, and feed the agent a turn, the shape `apply`'s refusal path
   already uses (chat.go:1119). A choice outside the row's answers
   refuses with 400, as escalations refuse today. The client routes a
   bound ask's presses to `/answer` (chat.js:411, chat.js:1157); an
   unbound ask keeps sending the choice as the human's message.
4. **Settling.** Today an ask settles when any later row follows it
   (chat.go:449: "an ask stands open while it is the thread's newest
   row"). A bound ask settles by press or by expiry only. The settle
   derivation and the park share one store read: the thread's bound asks
   whose proposal is still live. A typed message lands in the thread,
   settles nothing, runs nothing.
5. **Expiry.** The binding lives the proposal's 30 minutes. After that
   the action button answers "There is no such proposal or undo; it may
   have expired", the park lifts, and the question text stays as an
   ordinary ask.

## The build in tasks

1. **The store.** `ChatProposal.Choice`, `ChatMessage.Proposal`, the two
   columns, `PutProposal` and `TakeProposal` carrying them, and one read
   that answers a conversation's open bound asks with their tools. The
   schema lands as the repo's pattern does, `schema.sql` and the
   migration, which the risk gate holds human. RED: a store test of the
   round trip and the read.
2. **The tool.** `askMember`'s three parameters, the validation, the
   `keep("ask", ...)`, the result copy that names what a press does
   ("Asked the human; this turn ends. Pressing <choice> runs <tool>;
   another press answers it."). The turn's row merge carries the token.
   RED: `TestChatAskBindsAToolCall` (the thread holds the ask row with
   its binding, no pending Do it card), `TestChatAskBindsOnlyWriteTools`
   (a read tool refuses), `TestChatAskBindingAdmitsByRole`.
3. **The park.** `turn.call` refuses the bound tool while the shared
   read answers it. RED: `TestChatParkRefusesTheBoundTool`,
   `TestChatParkLiftsOnExpiry` on the clock rig.
4. **The press.** `chatAnswer`'s ask branch, the client's routing, the
   settle change for bound asks. RED:
   `TestChatAskPressRunsTheBoundAction` (the action ran, the `do-` row
   landed, no operator call after the press),
   `TestChatAskPressOfAnotherChoiceSettles` (the human's row, the ask
   settled, the agent's turn read it, nothing ran),
   `TestChatAskTypedMessageRunsNothing`,
   `TestChatAskPressIsSingleUse` (the second press 404s, another human's
   403s).
5. **The copy.** The `ask` tool's `about` and parameter texts, the
   manual's line beside `manual.go`'s ask sentence, and the console
   manual's ask paragraph.

`go test -race ./...` green after each task.

## Alternatives considered

- The narrow grade: refuse typed answers on bound asks and let the model
  act after the press. Rejected: the model still reads the answer and
  decides; only the execution moved.
- An action on every choice. Two bindings answer no ask the factory has;
  one action with named refusals covers the modal and binary cases.
- Making every confirmed proposal an ask. The proposal card already
  carries its own press; this adds the question face where the model
  asks first.
- A prompt rule telling the model to ask before it acts at full auto.
  Last resort by the design principle, and unenforceable.

## Out of scope

The question format's unfinished tail work (needed-fixes 4), the tool
folds of the survey, more than one binding per ask, and the escalate
rename plan.

## Cost and risk

The diff touches chat.go, answer.go, chat_tools.go, chat.js, the store
and the schema, with tests beside each task. The migration's merge needs
a human, which is its risk class. The behaviour change is additive: no
ask without a binding changes. The park is the one refusal the model can
meet that it caused itself, and a press or the 30 minute expiry always
lifts it. The full-auto exposure closes for the tools the model chose to
ask about; a merge it never asks about still merges by the merge rule,
which is full auto's meaning.

## Left to the builder

- The exact refusal and result sentences; the shapes above pin their
  content.
- The expired binding's rendering on the ask row.
- The shared read's name and return shape if a cleaner one exists.
- Where the settle derivation branches once the binding field exists.

## Calls made in this document, not decided in conversation

One bound action per ask. Proposals of kind `ask` stay out of the
pending Do it list. The park reads the open ask with a live proposal and
lifts on press or expiry. A typed message never settles a bound ask; the
30 minute expiry is its other end. The non-action press lands the choice
as the human's row and feeds the agent a turn.

## Sources

Sebastian 2026-10-31 ("I want 2, make a plan for it, dont implement").
The ask and escalate handlers (internal/console/answer.go), the proposal
machinery (internal/console/chat.go), the client's answer routing
(internal/console/static/chat.js), and the needed-fixes register's
two-surfaces fault.
