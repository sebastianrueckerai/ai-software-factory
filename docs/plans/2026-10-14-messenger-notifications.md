# Plan: notifications on Telegram and Discord

Draft, 2026-10-14. This is the messenger part of roadmap item 145. A member connects Telegram or Discord once and opts in per project. The factory then sends each notification that pulls the member back in as one line with a link to the card. The proposed decisions below wait for Sebastian's ruling.

## What and why

Today the factory reaches a member only inside the console: the inbox thread collects the pokes, and nothing tells a member who is away. The design baseline (the UX conversation, [notifications.md](../notifications.md)) splits the two jobs. The pulse is awareness while the member is in the factory. A push pulls the member back in. The journey is: a notification arrives, a tap opens the console on the card, the member answers there and closes the phone.

The bot accounts exist since 2026-10-13: the Telegram bot and the Discord application `ai-software-factory`, with a test message delivered on both. Their tokens are in the gitignored `.env.tools`.

## Proposed decisions (for Sebastian)

1. **No chat over the messengers.** The messenger is a pager, and the console stays the one place to read and act. The reasons are in "Why no chat over the messengers" below. This replaces the "chat over the messengers" section of notifications.md once ruled.
2. **A notification carries a link, not answer buttons.** A button that approves a merge from Telegram must act as the member on Forgejo. The console session that holds the member's Forgejo token lives 12 hours at most, so buttons need a second, long-lived grant per messenger. A taken-over messenger account could then approve merges. The link costs one tap more and needs no new grant.
3. **Opt-in per member and project, three levels:** off (the default), needs you, and all. Delivery goes to every messenger the member connected.
4. **Telegram connects through a deep link, Discord through OAuth2.** Both take one tap from the console.
5. **A project file may forbid messenger delivery** with `messengers: false`. A notification line leaves the factory for Telegram's or Discord's servers, and neither encrypts bot chats end to end.

## What notifies

The source is the inbox thread's poke rows, which factoryd's poke writer already makes from the events (`internal/factoryd/pokes.go`). A messenger notification is a copy of one inbox row, so the browser always holds what the messenger got. This table answers which rows reach a messenger at which level.

| Inbox row | Level |
|---|---|
| A question that needs a person (`question_asked`) | needs you |
| A budget stop (`question_asked` from a budget source) | needs you |
| A merge or a plan waiting for approval (`approval_requested`) | needs you |
| A failed card (`task_ended`, failed) | all |
| A finished card or plan (`task_ended` done, `all_children_done`) | all |
| A level change (`autonomy_changed`) | none |
| The agent's own starts and filings | none |

A repeat counts on its inbox row and sends nothing new. Routine agent activity never notifies, since the pulse covers it.

## Recipients

The poke writer sends a row to the project file's `notify` list, else to the project's approvers. That stays. A member who opts in to a project joins the recipients of that project's rows, so their inbox holds every row their messenger gets.

A member opts in only to a project they can read in the console. The sender checks the read access again before each send, with the factory's read token and a 10-minute cache. A member who lost access loses the opt-in, and the console says so.

## Connecting a messenger

A member connects each messenger once, not per project.

Telegram:

1. The console makes a one-time code: 128 random bits in base64url (22 characters), stored as its SHA-256 hash with the member's login, valid 10 minutes, used once.
2. The console shows the link `https://t.me/<bot>?start=<code>`. factoryd reads the bot's name with `getMe` at boot.
3. The member taps Start. Telegram sends `/start <code>` to factoryd's webhook.
4. factoryd binds the chat to the login, but only for a private chat. It deletes the code and replies "Connected to <login>. Opt in per project in the console."
5. `/stop` in the chat disconnects. Any other message gets one fixed line with the console's address and nothing else.

Discord:

1. The console's Connect button sends the member to Discord's OAuth2 page with the scopes `identify` and `guilds.join`. The `state` parameter is bound to the console session.
2. The callback exchanges the code for the member's Discord user, adds the member to the factory's Discord server with the bot, and opens a direct message channel with them.
3. factoryd binds that channel to the login and discards the member's Discord token.

A member disconnects in the console, or with `/stop` on Telegram. A send that fails because the member blocked the bot or left the server removes the connection, and the console says why.

## Delivery

Delivery goes through an outbox, so a notification survives a factoryd restart and a messenger outage.

- The poke transaction writes the inbox rows, the poke cursor and one delivery row per opted-in connection together. A notification is never lost between the event and the send.
- A sender loop sends the pending rows every 5 seconds. It keeps one message per second per Telegram chat, honours `retry_after` on a Telegram 429 and `Retry-After` on a Discord 429, and backs off on a 5xx. After 6 failed tries over about an hour it marks the row failed and logs it.
- The text is `<project>: <inbox row text>`, cut to fit Telegram's 4096 and Discord's 2000 characters. One link button opens the card in the console (Telegram's inline URL button, Discord's link button). A link button needs no inbound path on either venue.
- The bot token never reaches a log or an error. The saved push work already scrubs it, see "Reuse".

## The inbound path

Sebastian ruled webhooks on the console's public host (2026-10-14). With link buttons, only Telegram's connect and stop messages come in. Discord needs no inbound path, because its connect runs through OAuth2 in the browser.

- `POST /messengers/telegram` is a console route with an empty access rule, like `/login`. It checks the header `X-Telegram-Bot-Api-Secret-Token` in constant time before it reads the body, and answers 401 on a mismatch. The body is capped at 64 KiB. After the check it always answers 200, so Telegram does not retry.
- factoryd calls `setWebhook` at boot with `allowed_updates: ["message"]`. The secret is an HMAC-SHA256 of the bot token, so no new secret needs seeding, and a new bot token rotates it.

## Data model

Four tables, in one migration after `20261015140000_chat_notes.sql`:

- `messenger_links`: login, venue, address (the Telegram chat or the Discord DM channel), the venue's user id and the creation time. One link per member and venue.
- `messenger_codes`: the code's hash, the login and the expiry.
- `notify_levels`: login, repository and level (`needs-you` or `all`). No row means off.
- `notify_deliveries`: the inbox row, the link, the state (pending, sent, failed), the tries, the next try, the sent message's id and the last error.

## Configuration and secrets

- A new secret `factoryd-messengers` in namespace `factory`, seeded by `seed-secrets.sh` from `.env.tools`: `telegram_bot_key`, `discord_bot_token`, `discord_client_secret` and `discord_guild_id`. factoryd mounts each as an optional env, as it does `forgejo-docs`. The values never enter git.
- The Discord application's client secret and the redirect URI `https://console.aisoftwarefactory.world/messengers/discord/callback` come from the developer portal. That is a manual step for Sebastian.
- factoryd's egress policy gains `api.telegram.org` and `discord.com`, in the DNS `matchName` list and in `toFQDNs`.
- The project file gains `messengers` (bool, default true). The infra README lists it.

## The console

A notifications panel holds the member's connections (connect, disconnect, and why a connection ended) and the level per project. The panel's look goes to a UX round in the design session before phase 2, as C14 did for the multi-chat console. New routes enter `getRoutes` or `postRoutes` and the access table: the Telegram code, the Discord start and callback, disconnect, and the level per project (a reader of the project).

## Phases

1. **Links and delivery.** The tables, the Telegram webhook with connect and stop, the Discord OAuth2 connect, the outbox and its sender, the recipients change, the project switch, the secret, the egress and plain controls in the console.
2. **The panel.** The look from the UX round, lab scenes and the lab checks, the phone at 390 pixels included.
3. **The live check, with Sebastian's go.** Connect his Telegram and Discord on the live console, opt in to one project, raise a needs-you on a test card, see both messages arrive, open the link, then disconnect.

## Verification

- A code works once and not after 10 minutes. A group chat cannot connect.
- The webhook refuses a wrong secret with 401 and reads nothing.
- Delivery rows come only for opted-in members with a connection, at the row's level. A repeat writes none. A project with `messengers: false` writes none.
- The sender's retry on 429 and 5xx, its stop after 6 tries, and the disconnect on a blocked bot.
- A member who lost read access gets nothing and loses the opt-in.
- No token in any error or log line.
- The access table counts and the lab checks.

## Reuse

The unlanded push work of 2026-10-14 is saved in the ledger as `push-slice-145.patch` (871 lines). It brings the HTTP call with the token scrub, the Telegram and Discord senders, a binding table, the k8s secret env and the egress. Its senders change from choice buttons to one link button. Its answer path (`AnswerPushed`) is not needed under decision 2. Its egress lacks the DNS `matchName` entries.

## Why no chat over the messengers

The question was what a chat in Telegram or Discord adds over the console's phone view. The answer: little, at a high cost.

- **The phone view already answers "how is the project doing?"** The status line and the pulse sit at the top of the project screen, and the board and the drawer give the detail behind them. A messenger shows text only.
- **It is a second chat client.** Queued turns, proposals with undo, compaction, threads and message splitting would all exist twice, and so would every later chat feature.
- **Discord cannot receive typed messages by webhook.** Plain messages reach a bot only over the Gateway websocket, which is a new dependency and a permanent connection. Without it every message needs a slash command or a form.
- **The chat's write tools act as the member on Forgejo.** A messenger chat needs the long-lived grant of decision 2, so a taken-over Telegram account could steer the factory.
- **A chat sends the whole conversation to Telegram's or Discord's servers.** A notification sends one line.
- **The advantages are small.** A messenger needs no console login and queues a message typed without a signal. Voice input is no advantage, because the phone keyboard's dictation already types into the console's chat box.

The one real advantage is answering where the notification arrives, and the link covers that with one tap. If a status answer in the messenger proves useful later, a deterministic `/status` (the status line, the newest pulse and the link, with no model call and no write rights) costs about 100 lines.

## Non-goals

- Web Push and the PWA install. They stay in 145.
- WhatsApp.
- Answer buttons and the chat in the messengers (decisions 1 and 2).
- Quiet hours and batching.

## Open points

- Whether the bot may open a direct message right after `guilds.join` is not confirmed by Discord's docs. Phase 1 tests it on day one with Sebastian's account. If it fails, each member gets a private channel in the factory server instead.
- The panel's look: the UX round.

## Evidence

From the code survey of main at 9307c16:

- Poke classes and recipients: `internal/factoryd/pokes.go:30-31`, `:95-98`, `:112-197`. `Poke` returns no row ids today (`:48`, `:248`), so phase 1 changes it to return the inserted ids per login.
- The `notify` list is a plain list of logins: `internal/policy/project.go:220-222`.
- Console sessions live 12 hours, absolute: `internal/console/console.go:46`. The tokens are sealed per row: `internal/console/session_store.go:34-56`.
- A route with an empty access rule needs no session and no CSRF token: `internal/console/access.go:262-266`.
- factoryd's egress allows two Hetzner hosts and GitHub today: `k8s/factoryd.yaml:738-752`, `:804-816`.

From the Telegram and Discord docs:

- Telegram deep link payloads: up to 64 characters of `A-Z a-z 0-9 _ -`. The bot receives `/start <payload>`. https://core.telegram.org/bots/features
- `setWebhook` and its `secret_token` header: https://core.telegram.org/bots/api#setwebhook
- Telegram sends about one message per second per chat: https://core.telegram.org/bots/faq
- Bot chats are cloud chats, not end-to-end encrypted: https://core.telegram.org/api/end-to-end
- Discord direct messages through `POST /users/@me/channels`: https://docs.discord.com/developers/resources/user
- Discord message components, link buttons included: https://docs.discord.com/developers/components/reference
- Discord rate limits and `Retry-After`: https://docs.discord.com/developers/topics/rate-limits
