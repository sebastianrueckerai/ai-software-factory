# A chat door for a human's own agent: design

Written 2026-11-02. Status: built on code main the same day (44c60082),
live proof pending. It answers fault 7 of
[needed-fixes.md](needed-fixes.md), "No scripted door into the chat". The
plan is [plans/2026-11-02-chat-door.md](plans/2026-11-02-chat-door.md).
Code paths are relative to `ai-software-factory-code`, line numbers from
its main at 5c2bb4b4.

## Intent

Sebastian wants his local Claude Code to do in the factory what he does in
the console's chat: tell the project agent what to build, follow the run,
read the thread and press Do it, from his terminal and without his
browser. A script or a CI job he runs may use the same door.

Today nothing outside a browser gets in. The console's OAuth2 login works
with curl, but every console route except four (`/static/`, `/login`,
`/auth/callback`, `POST /messengers/telegram`) needs a cookie session of a
writer, and no route reads a bearer token (`internal/console/access.go:72-206`,
`auth` at `internal/console/console.go:619`). So an agent can drive the
chat only by borrowing a writer's cookie, and the factory then cannot tell
the agent from the human.

## Decisions

Sebastian made these on 2026-11-02:

1. **The agent acts as the human who made its token.** It uses their login,
   their threads, their proposals and their rights. Every row it causes
   names the token. It has no identity of its own.
2. **The token may do everything its human may do in the chat, approvals
   included.** It may press every Do it, approve a merge, fund the chat,
   invite, and change the autonomy level and the pool, exactly where its
   human may.
3. **The first version reaches the chat only.** The agent sends a turn,
   reads the thread and presses Do it. The project agent does the work
   with its own tools. No tool of the chat is callable directly.
4. **The door is an MCP endpoint on the console.** Claude Code adds it once
   with `claude mcp add --transport http`, and the tools appear in every
   session.

## Goals

- A human's Claude Code runs a whole chat session for one project from a
  terminal: send, read, confirm.
- A leaked token reaches one project's chat, until it expires or its human
  revokes it. It opens nothing in Forgejo.
- Every chat message and every event the token causes names the token.
- The human sees their tokens with their last use and revokes any of them.
  A token stops working when its human stops writing the project.

## Non-goals

- Direct calls of the chat's 67 tools, a REST API for the board or the
  cards. Decision 3 holds them back. The chat reaches all of it.
- An identity of its own for the agent, or a service account with no human
  behind it. A CI job uses a token a human made.
- The factory-level pages (policy, costs across projects, project
  creation). A chat token belongs to one project.
- A command-line binary. MCP over HTTP is JSON over POST, so a script can
  call it with curl.

## Anti-goals

The build fails, even if it works, when one of these holds:

- A bearer token opens a cookie route, or a cookie opens the MCP route.
  There is one door per kind of caller.
- The chat can make, list or show a token. Text the project agent reads
  from cards could then ask for one.
- A chat token works against Forgejo.
- A token's text lands in a thread, a log line, an event or a gateway
  record.
- The agent's reads mark the human's thread as seen, so the human misses
  an answer meant for them.

## The design

### The chat token

- The token is `sfc_` followed by 32 random bytes in base64url. The prefix
  lets the scrubbers find it.
- A new table holds one row per token: the SHA-256 hex of the token
  (unique), the human's login, the project's repository, a name the human
  gives ("Claude Code, laptop"), the sealed Forgejo token (below), the
  created, expiry, last-used and revoked times. The token itself is never
  stored. The console shows it once, when it is made.
- The human picks a lifetime of 7, 30 or 90 days, 30 by default. No token
  lives longer.
- A token belongs to one project. A human who drives three projects adds
  three MCP entries. This bounds what one leaked token reaches.

### The Forgejo token behind a chat token

Decision 2 needs the human's own Forgejo credential behind the token, not
the project agent's. A human's merge approval submits an APPROVED pull
request review through the human's own Forgejo token (`review`,
`internal/console/approvals.go:363`). Forgejo's approvals whitelist, the
approvers plus `factory-gate` (`internal/factoryd/register.go:804`), is the
merge authority. The wake acts on the project's `factory-chat` token
(`wakeSession`, `internal/console/wake.go:187`), which is not on that
whitelist. A chat token on the `factory-chat` token could therefore not
approve a merge under the merge rule human.

The cookie session's OAuth tokens cannot be shared with a chat token.
Forgejo invalidates a refresh token on use (`internal/console/oauth.go:198`),
so two holders of one grant would end each other at the next refresh.

So the human gives the factory a Forgejo access token of their own when
they make a chat token:

1. The human makes an access token in Forgejo (Settings, Applications)
   with the scopes the console's login asks for: `read:user`,
   `write:repository`, `write:issue` (`internal/console/console.go:65`).
2. The human pastes it into the console's form.
3. The console calls `GET /api/v1/user` with it and refuses it unless the
   login equals the session's login.
4. The console seals it with AES-256-GCM under a key derived from the
   console's session key, with the token's hash as additional data, as
   `console_sessions` seals its tokens (`internal/console/session_store.go:52`).
   It never leaves factoryd.

The console sees only the login, not the scopes. So it probes the token.
It proves `write:issue` and `write:repository` with two POSTs on the
chosen project's repository whose body cannot decode, so Forgejo files
nothing. Status 422 means the scope is held. Status 403 means it is
missing, and the refusal names it. A 2xx is refused with a request to
check the project for a stray issue or pull request, and any other
answer refuses the token. It also refuses a token that reads the admin API or the
notification API. The form names the three scopes to pick. Live Forgejo
17.0.1 statuses get checked after the build.

A human who writes no project sees "You write no project, so you can make
no chat token." in place of the form.

A request on a chat token then runs on a session with the human's login,
the Forgejo token as its access token, no refresh token, and the chat
token's id and name (`session`, `internal/console/console.go:419-436`).
Such a session is never refreshed. It is not `fixed`: that flag marks a
bot's token, and the filing path takes its strict branch on it
(`internal/console/actions.go:456`). Every access check, every approver
rule and every Forgejo call works as it does for the human in the
browser, and the human's Forgejo writes go out under the human's name.

If Forgejo refuses the sealed token, because the human deleted it in
Forgejo, the call fails with a refusal that names this and says to make a
new chat token.

This mechanism is the designer's call. Sebastian did not decide it. It
had two rivals:

- A second OAuth application for chat tokens, one grant per human,
  refreshed like the sessions. It needs no paste, but it needs a second
  OAuth client in infra, a grant table and a refresh lock. It was
  rejected for its size.
- The Forgejo token as the bearer itself, with no table at all. A leak
  would then open the human's whole Forgejo account, not one project's
  chat. It was rejected.

### Making and revoking a token

- Only a human in a browser makes a token: in a cookie session, by a POST
  with the CSRF token, on the human's own page, `/notifications`. That
  page holds the human's Connections (Telegram, Discord) today. A new
  section, Tokens, lists the human's tokens with name, project, created,
  last use and expiry, and a Revoke button per row. A form under the list
  makes a token: project (the human's projects), name, lifetime, Forgejo
  token.
- The answer to the form shows the chat token once, with the ready
  command:
  `claude mcp add --transport http factory-<project> https://console.aisoftwarefactory.world/mcp --header "Authorization: Bearer sfc_..."`.
- No chat tool makes, lists or revokes a token. `GET /notifications`
  already names no tool, with the reason "the notifications panel: the
  chat changes no messenger level" (`internal/console/console.go:457`),
  which the parity test reads. The reason grows by one clause: a token is
  made by a human in a browser, never by the chat.
- Making a token and revoking one are events, with the human as actor and
  the token's id, name and project in the detail. The token's text is
  never in them.
- A token stops working when it is revoked, when it expires, when its
  human no longer writes its project (checked on every request, as for a
  cookie session), or when Forgejo refuses its sealed token.

### The door

- The console serves `/mcp` with the MCP SDK already in `go.mod`
  (`github.com/modelcontextprotocol/go-sdk`). The gateway serves its own
  `/mcp` to sandboxes the same way (`internal/gateway/tools.go:327`). The
  two share no code and no credential.
- The route's entry in the access table carries its own check, as
  `POST /messengers/telegram` does: the bearer, not the cookie. A cookie
  on `/mcp` is ignored. A bearer on any other route is ignored, so that
  route answers as it does today without a session.
- On every request the console hashes the bearer and reads the row. An
  unknown, expired or revoked token gets 401 with one message for all
  three. Then it checks that the login writes the token's project, with
  the functions the access table uses (`c.writer`, `c.writes`,
  `internal/console/actions.go:278`). A login that no longer writes gets
  403. Then it builds the token's session and moves the last-used time,
  at most once a minute.
- `/mcp` needs no CSRF token. CSRF guards a cookie that a browser sends on
  its own, and a browser never sends a bearer on its own.
- The console's server ends a response after 60 seconds (`WriteTimeout`,
  `cmd/factoryd/main.go:711-712`). The `/mcp` handler moves its own write
  deadline past the tool's wait, as the board's event stream does
  (`internal/console/events.go:254`).
- The check runs per request. A turn that runs when its token is revoked,
  expires or loses its writer finishes, with the messages queued behind
  it. The next request is refused. Every `chat_confirm` is a request of
  its own, so a revoked token presses nothing.

### What a token reaches in the thread

- A token reaches every conversation of its human in its project, and no
  other human's. The tools take no `owner`, so the console's `owner=`
  door (`internal/console/threads.go:341-391`) stays closed to tokens.
- The token's own conversation never becomes the human's current
  conversation, so the human's browser stays where it was. A token's
  first side thread first pins the human's current thread, so the new
  thread never takes the human's current number. The store's
  `NewConversation` makes the new thread current and reuses an empty
  current one (`internal/factoryd/chat.go:167-170`), so the token's
  thread gets a store call of its own that does neither.
- Nothing a token does marks a thread seen. The human's thread list
  therefore shows the token's conversation unread until the human opens
  it, which is true: the human has not read it.
- `chat_confirm` presses any pending proposal of its human in its
  project, in any of the human's conversations. Decision 2 lets the token
  raise any proposal and press it, so a bound to the token's own threads
  would stop nothing.

### The five tools

Each tool runs on the token's project. Each answers JSON.

1. **`chat_send`** `{message, conversation?}` sends a turn as the console's
   `POST /projects/{name}/chat` does (`chatPost`,
   `internal/console/chat.go:607`). Without a conversation it uses the
   token's own conversation, which it makes at first use with the token's
   name as its title. The tool waits for the turn to end, for at most 4
   minutes. It answers with the conversation's id, the reply, the tools
   the project agent called with their one-line results, the proposals
   (id, what it does, expiry), the applied lines, a budget stop or an
   error, and whether the turn ended. A message sent while a turn runs
   queues as it does in the console. When the chat's budget stops the
   turn, the budget answer names the action. For an approver it names
   `chat_fund` with the suggested amount, after which the thread goes on
   by itself and `chat_read` reads it. For a writer it says that an
   approver of the project funds the chat.
2. **`chat_read`** `{conversation?, after?}` answers
   `{"messages": [...], "more": bool}`. It holds at most 40 rows and about
   60 KB per call, stops at a whole message, and pages on with `after` set
   to the last id. `more` says that rows remain. Each message carries
   its id, role, text, time, its source (the console or a token's name)
   and, on a proposal, its state. It never marks the thread seen and never
   opens a conversation. So it reads the store directly, not through the
   console's thread read, which does both (`internal/console/chat.go:306`
   and `346-347`).
3. **`chat_confirm`** `{proposal}` presses Do it on a proposal, as
   `POST /projects/{name}/chat/proposals/{id}` does (`chatProposal`,
   `internal/console/chat.go:1346`). The access check inside that path
   judges the human, as it does for the button.
4. **`chat_threads`** `{}` lists the human's conversations of the project:
   id, title, time of the last message, unread or not.
5. **`chat_fund`** `{eur?}` presses the browser's Fund and go on through
   the same function and the same approver check. The amount is in whole
   euros. When `eur` is omitted, the suggested amount applies. On a chat
   that is not stopped, it raises the budget when given `eur` and refuses
   without one.

The turn underneath does not change. The token's turn gets the project
agent's tools, its confirm list at the project's autonomy level and its
budget, as the human's own turn does.

### One turn path for the browser and the token

`chatPost` and `chatProposal` are event-stream handlers bound to the
response writer. The turn already writes its events through one function
that needs no HTTP response (`stream`, `internal/console/chat.go:220`, "w,
nil in a test"). The build cuts each handler in two: the HTTP part reads
the form and opens the stream, and a function below it takes the
session, the project, the conversation and the event writer and runs the
turn. The handler and the MCP tool both call that function. There is no
second turn path.

A token's turn streams its events to the tool and, from its start, keeps
a failure as a row in the thread, as a wake's quiet turn does (`fail` and
`quiet`, `internal/console/chat.go:241-258`). When the wait ends first,
the tool answers with what it has and stops collecting. The turn goes on
detached, as a browser's turn does when the browser leaves. Its rest
lands as rows, a failure included, and `chat_read` gets it.

### Attribution

- `chat_messages` gets a column that names the token, empty for a console
  message. Every row a token's turn writes carries it. The console shows
  the token's name on a human message that came through it.
- Every event the console records under a token's session carries
  `"token": {"id","name"}` and `"project"` in its detail, the same shape
  as the stamp. This holds for `chat_token_made` and `chat_token_revoked`
  too. The actor stays the human's login.
  The console builds events in eleven places, some outside `record`
  (`internal/console/actions.go:231`), among them the autonomy and pool
  changes (`internal/console/autonomy.go:85`, `253`, `583`,
  `internal/console/pool.go:196`). Every one of them writes through
  `c.cfg.Events.Record`, and every chat row through
  `c.cfg.Chat.AddChatMessage`, with a context that carries the session.
  The stamp goes in at those two seams, read from the context's session,
  so no call site can miss it. A test raises each consequential action of
  decision 2 under a token and checks the stamp on its event.
- Rows that factoryd writes on its own path after a console call, such as
  the workflow's merge, keep the human's login as their actor and carry
  no stamp.

### Keeping the token out of text

- `scrubTokens` (`internal/console/chat.go:937`) removes GitHub tokens from
  a chat message today. It also removes chat tokens.
- `internal/redact` gets the chat token's shape beside `GitHubToken`
  (`internal/redact/scan.go:34`), so logs, events and gateway records
  scrub it.

## Threat surface

Decision 2 makes a chat token a full delegate in one project. Its holder
can do in that project's chat what its human can, merges and spend
included. Two paths lead there:

- **A leaked token**, from the laptop, a shell history or a CI log.
- **Injected text in the agent's context.** Claude Code reads card text
  in the chat's replies. The inbound sanitiser screens that text before
  the project agent reads it, but text that passes the screen can still
  steer Claude Code.

What bounds the damage:

- One project per token, and a lifetime of at most 90 days.
- Revoke on the human's page, and the last use shown there.
- The writer check on every request.
- The token's name on every message and event it causes.
- The factory's spend caps (task, day, month, project) and the gates,
  which do not change.
- No direct use at Forgejo.

[threat-model.md](threat-model.md) records this as an accepted risk.

## What changes in the docs when it is built

- [architecture.md](architecture.md) 5.6, "Who gets in": a second door,
  the chat token on `/mcp`.
- [architecture.md](architecture.md) 5.7: a token's turns, its thread and
  its attribution.
- [threat-model.md](threat-model.md): the accepted risk above.
- [needed-fixes.md](needed-fixes.md): fault 7 leaves the register.

## Calls the designer made

Sebastian did not decide these. Each follows from his four decisions and
the code:

- The human pastes a Forgejo access token of their own at the making of a
  chat token, and the console refuses one with more than three scopes.
- One project per token, 30 days by default, 90 at most.
- The Tokens section sits on the human's own Notifications page.
- A token reaches all of its human's conversations in its project and
  presses any of their pending proposals there.
- The token's own conversation never moves the human's browser, and
  nothing a token does marks a thread seen.
- A token's turn keeps a failure as a row, so a turn that outlasts the
  4-minute wait leaves nothing unseen.
- A revoke stops the next request, not a running turn.
- Decision 2's "fund the chat" became the fifth tool, because a spent chat
  cannot run the turn that would call its own fund tool.
- A pressed proposal enters the stop gate before it waits for its turn.
- The token's label in the thread and the Tokens section go through a
  condensed design round, with a provisional pick so the build does not
  wait.

## Left to the builder

The table, column and event names, the migration's timestamp, the JSON
field names, the tool descriptions, the label's exact words and place
under the console's design process, and the wait bound after a
measurement of the edge's stream timeout and of Claude Code's MCP tool
timeout.
