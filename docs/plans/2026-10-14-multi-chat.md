# Plan: multi-chat on the project screen

Sebastian's discussion of 2026-10-14: the chat panel holds one conversation per member and project, so two features cannot be planned side by side, a long planning session fills the one transcript, and nothing tells him a finished turn while he looks elsewhere. This plan makes the conversations first-class threads, moves the turn safety into the server, replaces the context's hard truncation with compaction that cannot be outrun, and gives every member an inbox thread that receives the factory's pokes.

It is written to combine with two neighbours. The autonomy levels spec of the same day ([the spec](../superpowers/specs/2026-10-14-agent-autonomy-levels-design.md)) rules that the escalation is the chat's one reach-out; this plan gives that escalation its home when the member runs several threads. The main-loop plan of 2026-10-13 ([the plan](2026-10-13-main-chat-docs.md)) gives the chat its doc writes; this plan serialises that door for many threads and dissolves the plan's one-main-chat assumption. Sources: Sebastian 2026-10-14 (this discussion, his three decisions, the forced-compaction rule, the combination instruction), items 41, 74, 145, 150, 180, 200, 201, 205, 213, 225, 226, 227, rulings 251 and 252, the code survey of 2026-10-14 (internal/console/chat.go, chat_tools.go, static/chat.js, internal/schema/migrations/factoryd/20261011132117_chat_conversations.sql).

## What exists

- The schema numbers a member's conversations per project; chat_conversations holds only the number of the current one. Old conversations stay readable through `GET ?conversation=n` and are never writable again. The panel shows a New conversation button and a hidden select of old ones. No title, no list, no archive.
- Turn safety lives in the browser: a message typed while a turn streams waits in a client-side queue. The server starts every POST at once, so two tabs of one member can interleave turns in one conversation.
- The context is a hard truncation: the last 40 messages, the last 30 events, a fresh open-cards snapshot, rebuilt per turn. Older history falls out silently, unsummarised. Item 201 found the context stated twice and unbounded besides.
- No compaction action and no commands exist. The human's special actions are Do it, undo and steer.
- A turn ends as the SSE stream's done event, visible only in the open tab. The board event stream is live-only. The notification service (145) is unbuilt; its two channels are bound and proven.
- chat_messages sits in the factoryd Postgres with tool calls as JSON. Card session transcripts go to S3 as one JSONL per session. Nothing on the chat path has a retention limit, and no endpoint deletes or archives.

## Decisions (Sebastian, 2026-10-14)

1. A member's second message while a turn runs queues server-side. It is never refused and never interleaves.
2. Delete is hard delete of the messages plus one attribution event. No soft delete.
3. Any thread may write the roadmap, through the one serialised door. No designated roadmap thread.
4. Compaction is preset at 80 percent of the serving model's window and, at the latest, fires when the model itself reports an exhausted context. A known window is the optimisation; the provider's complaint is the bound that always holds.
5. Carried from the autonomy spec as a boundary: the escalation stays one mechanism, not a new alert. Multi-chat gives it a home, not a second channel.

## The design

1. **Threads.** chat_conversations becomes one row per conversation: title, state (active or archived), created_at, last_turn_at. The title comes from the thread's first message and stays editable. The current pointer stays, as the last opened. The hidden select becomes the switcher: active threads by last turn, the unread mark, the working mark, new, archive; archived threads sit last, read-only, restorable. Per-member scoping stays (213's question stays open). Old numbers keep their rows; the migration backfills titles from the first message. The existing endpoints (chat history, chat/new, conversations) gain rename, archive and switch.

2. **The turn lock.** chatPost takes a per-conversation lock in factoryd. The member's message persists at once. While a turn runs, the POST answers queued with its position; when the turn ends, a queued message starts the next turn, a small per-conversation loop. The behaviour is then the same in one tab, in two tabs and for two members. Threads of a member, and members, run in parallel; a per-project bound on parallel chat turns (policy, default 3) guards the monthly chat task's budget. The browser queue stays as the optimistic UI in front.

3. **Compaction.** The raw rows stay; the thread carries a running summary. Three triggers, one step. The preset: before a turn's context is built, when the projected context passes 80 percent of the configured window of the alias that will serve the turn, factoryd compacts first. The projection reads the thread's last turn's token totals from the ledger (198, 206), not a message count. The forced trigger: the gateway classifies a provider context overflow as a typed refusal, the way it classifies a budget 402; the turn handler compacts and retries, at most twice (the second retry halves the kept tail), then ends the turn with the named error to the member. The hand trigger: /compact. The step is one cheap-model call over everything before the kept tail (start: the last 10 messages), chunked when the source exceeds the summariser's own window; it stores the summary text, the model, the tokens before and after and the time on the thread. A turn's context becomes: the snapshot, the last 30 events, the summary, the kept tail, aged tool results. The ceiling holds by construction: bounded snapshot, bounded events, bounded summary, bounded tail. An open need-you never falls out; the snapshot carries the card.

4. **Unread and done.** A seen marker per member and thread (the last seen message). A turn that ends after it marks the thread unread; the switcher row and the tab title carry the badge, the row shows a turn in flight. Push stays out of this plan and rides 145, whose first slice the autonomy spec scopes: needs-you escalations push to the bound channels with their choices as buttons; a quietly finished turn never pushes.

5. **The inbox thread.** One per member and project, lazy-created, its name from the UX round. It receives the agent-initiated turns: the autonomy spec's escalations (their home with many threads) and factoryd's deterministic pokes on 145's event classes (waiting-human, terminal failure, budget attention, project or plan done). A poke is an agent-role row through the normal message path: one poke per state change, repeats count (74's rule), choices as buttons where a decision fits (150). A reply continues the thread. Planning threads never receive pokes, so a poke cannot pollute a plan. The transcript stays the source of truth; the messengers become windows (145). The durable main-loop agent's heartbeat, when that item lands, pokes here too.

6. **Commands.** /compact and /new first. A YAML file in the config tree maps a name to a canned message, the prompt pack's pattern (226). A command is a message and nothing more; a skill framework waits for a habit of three or more commands.

7. **Roadmap and doc writes.** write_doc of the main-loop plan is the one door, and this plan adds the two pieces many threads need: a per-repository lock, one commit at a time, and a content-hash compare-and-swap, the write carrying the hash it read; on a mismatch the tool refuses and returns the current content, and the agent re-applies its edit on top. The allow-list, the structure check, direct to master and the Confirm list stay as the 2026-10-13 plan rules them. Any thread may write; the writer role and token stay factoryd-level. The scratchpad stays per project and opens to every thread: it is the cross-thread working memory that lets two planning threads see each other's half-formed state, and it still steers nothing. Promotion is unchanged: the ready check and the autonomy levels decide what starts; two threads converging on one item resolve at the WIP bound and the planner's scoping, and the pruning pass merges the file's duplicates. One new read, active threads, gives each agent the others' context: the threads, their latest intents, the scratchpad's tail.

8. **Archive and delete.** Archive hides a thread and keeps every row; restore brings it back. Delete removes the member's rows of that thread and writes one event naming the member, the thread and the row count, for attribution (41). What the chat did lives in events, audit rows and git, none of it in chat_messages, so a deleted conversation never erases a decision or a merged card. S3 session transcripts are project record and stay.

9. **Spend and the card link.** The audit rows of the chat task gain the thread, and the thread's read shows its token and cost totals. A thread that files or steers a card leaves the thread on the card, so the drawer can show the conversation that produced it.

## The combination

- **With the autonomy levels (2026-10-14).** Nothing in the switches, the ready check, the backlog cap or the recording changes. Multi-chat amends one sentence of that spec: the escalation's "the thread continues in the one transcript" names the inbox thread when the member runs several threads; the amendment is marked in that spec. The push slice keeps its sequencing and lands with the autonomous level. The confirm lists resolve per project, not per thread.
- **With the main loop (2026-10-13).** Its tools become ordinary chat tools of any thread; the "main chat" stops being a place and becomes the autonomous level's runner when that item lands. write_doc gains the lock and the compare-and-swap above. The scratchpad opens to every thread. The heartbeat's outputs are pokes into the inbox thread.
- **The conflict story, whole.** Mechanical conflicts die at the door: the lock and the compare-and-swap. Semantic overlap surfaces: the active-threads read, the shared scratchpad, the refusal text. Commitments resolve at the board: WIP, the ready check, one card per slot. Ruling 225's split carries the rest: chat shapes work, the roadmap holds intentions, the board shows commitments.

## Data model

- chat_conversations: one row per (repository, login, conversation): title, state, created_at, last_turn_at, summary, summary_at, summary_model, compact_count; the current pointer stays.
- chat_seen (repository, login, conversation, last_seen_message_id).
- chat_messages unchanged; the conversation column exists. Deletion removes by (repository, login, conversation).
- The deletion's event row goes to the events table. A poke needs no event of its own; the unread machinery reads chat_messages against the seen marker.
- The gateway's audit rows for the chat task gain the thread.

## The UX round

The goal: many conversations made easy on the mission-control shell, the switcher, the unread badge, the working mark, the inbox thread, archive and delete, the commands, in both themes at 1440 and 390. The process is the portfolio's ([the portfolio repo](../../../portfolio), as 227's round ran it: the brief, broad directions first, the critics' loops, a few variants, Sebastian's pick). The artifacts land in design/ (rounds/02-multi-chat/ beside 01-mission-control); the pick updates design/ia.md and the theme. The round can run beside build phases 1 to 3, since its prototypes run over the fakes, and the style pass lands after the pick.

## Order

1. The data model, the threads API and the switcher's plain form, the turn lock.
2. Compaction: the preset, the forced trigger, /compact.
3. Seen markers, the badge, the inbox thread, the deterministic pokes.
4. The commands.
5. Archive and delete.
6. The UX round, parallel from the start.
7. The style pass on the pick.

Each step keeps `go test ./internal/console/` and `go test ./internal/factoryd/` green. The lab gains the scenarios: a second thread, a poke arriving, an unread badge.

## Verification

Hand-derived tests:

- Two POSTs to one conversation serialise: the second answers queued, its turn starts after the first ends, and the messages persist in order.
- A fake provider overflow refusal compacts and retries: the retried turn carries summary and tail, a second refusal halves the tail, a third ends with the named error.
- A turn projected past 80 percent of the configured window compacts before the call.
- A write_doc whose base hash is stale refuses with the current content; two concurrent writes both land, the second re-applied on the first.
- Hard delete leaves no rows and one event naming member, thread and count; the card links and the audit survive.
- A turn ending after the seen marker marks the thread unread; opening it clears.
- The escalation lands in the inbox thread with its choices; a reply continues that thread; the needs-you card and the pulse count stay as the autonomy spec records them.

## Open points

- The inbox thread's name and its look come from the UX round.
- The per-project turn bound's default (3) is a policy value to tune in the lane.
- The autonomy spec's own open points are unaffected by this plan.
