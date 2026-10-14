# Plan: the project agent's autonomy and the multi-chat console

Merged plan, 2026-10-14. It carries two halves on one seam: the autonomy levels that let the project agent OK and file work by itself under Sebastian's named levels, and the multi-chat console that holds several conversations per member with one inbox thread for everything the factory sends him. The seam is the escalation: the autonomy half decides when the agent must reach him, the console half decides where the reach-out lands. Written from the discussions of 2026-10-14 (autonomy, multi-chat, the pokes) and the code surveys of 2026-10-14. Sources: Sebastian 2026-10-14 (every decision below), items 41, 74, 76, 145, 150, 159, 160, 180, 185, 190, 198, 200, 201, 205, 213, 225, 226, 227, rulings 251, 252 and 254, the main-loop plan of 2026-10-13 ([the plan](2026-10-13-main-chat-docs.md)), the evidence section at the end. This file replaces the autonomy levels spec and the multi-chat plan of 2026-10-14, both folded in here; git history keeps them.

## What and why

Sebastian today plays the factory's human in a parallel session: he OKs the cards the factory puts on the board. The autonomy part gives the project agent the authority to OK and to file cards itself, under named levels he controls, so the factory runs with him out of the loop except for direction, money and merges he chose to keep. The trust argument: the OK before a start was never the safety mechanism. The verification gates, the budget holds, the sandbox and the egress rules run no matter who OKed the start. What must never be automated is the decision class: direction, budget raises, and the level itself.

The console part starts from the chat panel's shape today: one conversation per member and project. Two features cannot be planned side by side, a long planning session fills the one transcript, and nothing told him a finished turn while he looked elsewhere. Multi-chat makes the conversations first-class threads, moves the turn safety into the server, replaces the context's hard truncation with compaction that cannot be outrun, and gives every member an inbox thread that receives the factory's pokes.

## Decisions (Sebastian, 2026-10-14)

Autonomy:

1. merge_rule stays a separate switch. The state where everything runs on auto exists on top of the two switches.
2. The agent never invents tasks. When nothing on the roadmap is ready, it stops and asks, at every level, including full auto. Inventing is allowed only where the roadmap grants it in an explicit line.
3. Backlog cap 8 against WIP 5.

Multi-chat and the inbox:

4. A member's second message while a turn runs queues server-side. It is never refused and never interleaves.
5. Delete is hard delete of the messages plus one attribution event. No soft delete.
6. Any thread may write the roadmap, through the one serialised door. No designated roadmap thread.
7. Compaction is preset at 80 percent of the serving model's window and, at the latest, fires when the model itself reports an exhausted context. The known window is the optimisation; the provider's complaint is the bound that always holds.
8. The escalation stays one mechanism, not a new alert. Multi-chat gives it a home, not a second channel.

## Part one: the autonomy levels

### The switches

Per project, in the project's policy file (infra repo, versioned and activated as today):

```yaml
autonomy: manual          # manual | assisted | autonomous (new)
merge_rule: human         # human | auto (unchanged, separate switch)
backlog_cap: 8            # new, default 8
work_in_progress: 5       # unchanged, default 5
```

The console shows the level as a selector on the project screen. Changing it writes a policy change, which lands in the audit like every decision.

### The four console states

- **manual**: today. Everything confirms.
- **assisted**: the agent starts and files ready work by itself.
- **autonomous**: everything assisted does, with the remaining chat confirms off.
- **full auto**: autonomous plus `merge_rule: auto`. The one state where nothing waits for a human except direction and money.

The underlying truth stays the two switches; full auto is their combination, shown as one state so the selector reads plainly.

### What each level changes

The level resolves into the project's `chat.confirm` list, the existing mechanism where a listed tool renders a proposal with a Do-it button and an unlisted tool runs at once (all action tools are listed today).

**Always-confirm set, at every level:** merge approve and deny while `merge_rule` is human, fund (budget raise), the level and cap changes themselves, invites and anything outside the project.

- **manual**: the list holds every action tool, as today.
- **assisted**: removed from the list: `move_card` into a starting lane, `start_plan`, `accept_plan`, `new_card`, `retry`, `grant_session` within budget, and self-answering of the mechanical needs-you kinds (a session grant within budget, a retry after a fixable failure). Every start and filing still passes the ready check below. Direction questions reach the human.
- **autonomous**: the rest of the list goes off. Merges follow `merge_rule`. Spend rails, sandboxes and gates unchanged. Direction questions still escalate with choices.

A question the agent may not answer itself is never answered by a level. The needs-you kinds that name a human (missing information, a direction or product question, a spend beyond budget) wait at every level.

### The ready check

One deterministic function in factoryd, run at the moment of an agent start (lane move) and at every agent filing (`new_card`, plan acceptance, `delegate`):

- the card carries acceptance criteria,
- its scope sits inside the size bounds,
- a budget quote prices it without refusing,
- WIP and backlog have room.

A card that fails waits for the human in manual and assisted. In autonomous it is not started, and when nothing ready remains the escalation below fires. The check reuses the pieces `ValidatePlan` and the size bound already apply to plan cards; it applies them at the start gate and at filing.

### Filing and the backlog cap

`backlog_cap` bounds non-terminal cards that hold no admission stamp, the complement of WIP's admitted count. The check runs at every filing action. At the cap the filing refuses and the chat says so in one line. Webhook intake still files issues as cards in v1: a signal from outside is wanted, not agent initiative. With WIP 5 and backlog 8, a change of direction can strand only a handful of cards. No staleness sweeper, no card expiry.

### Roadmap exhaustion and task invention

When no remaining roadmap item passes the ready check, the agent files one escalation that names the state, each remaining item with the reason it fails, and the roadmap's open questions and spikes. Then it parks. This happens at every level, including full auto: there is no workaround, and the bar never lowers to keep the factory busy.

The agent invents tasks only where the roadmap grants it in an explicit line (for example: "the agent may file its own tasks for X"). The check reads the roadmap for that grant; no grant, no invention. A drafting or refinement pass without the grant is out of scope for v1.

### Recording

Every agent OK and every agent filing records its decider in the audit, the way auto merge records "merge rule auto" today: the level, the project and the chat task behind the decision. Who decided what stays countable, and the intervention rate metric can read it later.

## Part two: the multi-chat console

### What exists

- The schema numbers a member's conversations per project; chat_conversations holds only the number of the current one. Old conversations stay readable and are never writable again. The panel shows a New conversation button and a hidden select of old ones. No title, no list, no archive.
- Turn safety lives in the browser: a message typed while a turn streams waits in a client-side queue. The server starts every POST at once, so two tabs of one member can interleave turns in one conversation.
- The context is a hard truncation: the last 40 messages, the last 30 events, a fresh open-cards snapshot, rebuilt per turn. Older history falls out silently, unsummarised. Item 201 found the context stated twice and unbounded besides.
- No compaction action and no commands exist. The human's special actions are Do it, undo and steer.
- A turn ends as the SSE stream's done event, visible only in the open tab. The board event stream is live-only. The notification service (145) is unbuilt; its two channels are bound and proven.
- chat_messages sits in the factoryd Postgres with tool calls as JSON. Card session transcripts go to S3 as one JSONL per session. Nothing on the chat path has a retention limit, and no endpoint deletes or archives.

### Threads

chat_conversations becomes one row per conversation: title, state (active or archived), created_at, last_turn_at. The title comes from the thread's first message and stays editable. The current pointer stays, as the last opened. The hidden select becomes the switcher: active threads by last turn, the unread mark, the working mark, new, archive; archived threads sit last, read-only, restorable. Per-member scoping stays (213's question stays open). Old numbers keep their rows; the migration backfills titles from the first message. The existing endpoints (chat history, chat/new, conversations) gain rename, archive and switch.

### The turn lock

chatPost takes a per-conversation lock in factoryd. The member's message persists at once. While a turn runs, the POST answers queued with its position; when the turn ends, a queued message starts the next turn, a small per-conversation loop. The behaviour is then the same in one tab, in two tabs and for two members. Threads of a member, and members, run in parallel; a per-project bound on parallel chat turns (policy, default 3) guards the monthly chat task's budget. The browser queue stays as the optimistic UI in front.

### Compaction

The raw rows stay; the thread carries a running summary. Three triggers, one step. The preset: before a turn's context is built, when the projected context passes 80 percent of the configured window of the alias that will serve the turn, factoryd compacts first. The projection reads the thread's last turn's token totals from the ledger (198, 206), not a message count. The forced trigger: the gateway classifies a provider context overflow as a typed refusal, the way it classifies a budget 402; the turn handler compacts and retries, at most twice (the second retry halves the kept tail), then ends the turn with the named error to the member. The hand trigger: /compact. The step is one cheap-model call over everything before the kept tail (start: the last 10 messages), chunked when the source exceeds the summariser's own window; it stores the summary text, the model, the tokens before and after and the time on the thread. A turn's context becomes: the snapshot, the last 30 events, the summary, the kept tail, aged tool results. The ceiling holds by construction: bounded snapshot, bounded events, bounded summary, bounded tail. An open need-you never falls out; the snapshot carries the card.

### Unread and done

A seen marker per member and thread (the last seen message). A turn that ends after it marks the thread unread; the switcher row and the tab title carry the badge, the row shows a turn in flight. Push stays out of the build until the slice below; a quietly finished turn never pushes.

### The inbox thread and the pokes

One inbox thread per member and project, lazy-created, its name from the UX round. It is the one thread the agent may speak in uninvited; the planning threads only talk when spoken to. It receives the agent-initiated turns: the escalations of part one (their home with many threads) and factoryd's deterministic pokes on 145's event classes (waiting-human, terminal failure, budget attention, project or plan done). A deterministic poke is a control-plane write of an agent-role row through the normal message path: no model turn, no queue, one poke per state change, repeats count (74's rule), choices as buttons where a decision fits (150). A judgment escalation is a turn like any turn and queues behind the per-project bound; should that ever bite, the fix is one line: needs-you turns skip the bound. A reply continues the thread, and where the poke maps to a card, the answer resolves the card. Reading another thread does not clear the inbox badge; the seen marker is per thread. The transcript stays the source of truth; the messengers become windows (145). The durable main-loop agent's heartbeat, when that item lands, pokes here too.

### Commands

/compact and /new first. A YAML file in the config tree maps a name to a canned message, the prompt pack's pattern (226). A command is a message and nothing more; a skill framework waits for a habit of three or more commands.

### Roadmap and doc writes

write_doc of the main-loop plan is the one door, and this plan adds the two pieces many threads need: a per-repository lock, one commit at a time, and a content-hash compare-and-swap, the write carrying the hash it read; on a mismatch the tool refuses and returns the current content, and the agent re-applies its edit on top. The allow-list, the structure check, direct to master and the Confirm list stay as the 2026-10-13 plan rules them. Any thread may write; the writer role and token stay factoryd-level. The scratchpad stays per project and opens to every thread: it is the cross-thread working memory that lets two planning threads see each other's half-formed state, and it still steers nothing. Promotion is unchanged: the ready check and the autonomy levels decide what starts; two threads converging on one item resolve at the WIP bound and the planner's scoping, and the pruning pass merges the file's duplicates. One new read, active threads, gives each agent the others' context: the threads, their latest intents, the scratchpad's tail.

### Archive and delete

Archive hides a thread and keeps every row; restore brings it back. Delete removes the member's rows of that thread and writes one event naming the member, the thread and the row count, for attribution (41). What the chat did lives in events, audit rows and git, none of it in chat_messages, so a deleted conversation never erases a decision or a merged card. S3 session transcripts are project record and stay.

### Spend and the card link

The audit rows of the chat task gain the thread, and the thread's read shows its token and cost totals. A thread that files or steers a card leaves the thread on the card, so the drawer can show the conversation that produced it.

## Where the parts meet

- **The escalation's home is the inbox thread.** The escalation stays one mechanism (the card in Needs you, the pulse's count, the audit row); its chat face with many threads is the inbox thread, the message with its choices beside a text box. A reply continues that thread. A wish named in a reply goes where the ready check sends it: a ready statement becomes a labelled card at once, a fuzzy one becomes a plain issue on the backlog without the label that starts work, in his words.
- **The push slice** (145's first): a needs-you escalation sends one message to each bound channel with the escalation's choices as inline buttons; a button press or a reply resolves in the control plane, the first answer wins, a later press on another venue hears "already answered"; routing as 145 rules it, a reply follows the venue of the human's last message, and the browser always shows the whole transcript. The inbound path is new work either way: a webhook on the gateway's public HTTPS or a Telegram `getUpdates` long-poll, as 145's bounds name; the bound-chat table's first rows come from the seeded `.env.tools` (the Telegram bot and the Discord application are live, their tokens seated and proven). Sequencing: assisted works on board and pulse alone; the push lands with the autonomous level, because a full-auto factory that waits silently reads as stuck.
- **The confirm lists resolve per project, not per thread.** A proposal waiting for Do it belongs to the thread that raised it.
- **The ready check is unchanged by multi-chat.** It reads the roadmap document and the board, not the threads.
- **The main loop** (2026-10-13): its tools become ordinary chat tools of any thread; write_doc gains the lock and the compare-and-swap above; the scratchpad opens to every thread; the durable main-loop agent becomes the autonomous level's runner, and its heartbeat pokes the inbox thread.
- **The conflict story, whole.** Mechanical conflicts die at the door: the lock and the compare-and-swap. Semantic overlap surfaces: the active-threads read, the shared scratchpad, the refusal text. Commitments resolve at the board: WIP, the ready check, one card per slot. Ruling 225's split carries the rest: chat shapes work, the roadmap holds intentions, the board shows commitments.

## Data model

- chat_conversations: one row per (repository, login, conversation): title, state, created_at, last_turn_at, summary, summary_at, summary_model, compact_count; the current pointer stays.
- chat_seen (repository, login, conversation, last_seen_message_id).
- chat_messages unchanged; the conversation column exists. Deletion removes by (repository, login, conversation). The deletion's event row goes to the events table.
- The gateway's audit rows for the chat task gain the thread. Part one's recording reuses the audit row: the level and the decider on every agent OK and filing.
- The policy gains `autonomy` and `backlog_cap`; the project file sets them within policy bounds.

## The UX round

The goal: many conversations and the level selector made easy on the mission-control shell, the switcher, the unread badge, the working mark, the inbox thread, the escalation's face with its choices, archive, delete, the commands, in both themes at 1440 and 390. The process is the portfolio's, as 227's round ran it: the brief, broad directions first, the critics' loops, a few variants, Sebastian's pick. The artifacts land in design/ (rounds/02-multi-chat/ beside 01-mission-control); the pick updates design/ia.md and the theme. The round can run beside build phases 1 to 6, since its prototypes run over the fakes, and the style pass lands after the pick.

## Order

1. Autonomy: the switches, the confirm lists, the ready check, the backlog cap, the recording. Assisted works on board and pulse alone.
2. Multi-chat: the data model, the threads API, the switcher's plain form, the turn lock.
3. Compaction: the preset, the forced trigger, /compact.
4. Seen markers, the badge, the inbox thread, the deterministic pokes.
5. The commands.
6. Archive and delete.
7. The escalation on the inbox thread and the push slice, with the autonomous level going live.
8. The UX round, parallel from the start; the style pass on the pick.

Each step keeps `go test ./internal/console/` and `go test ./internal/factoryd/` green. The lab gains the scenarios: a second thread, a poke arriving, an unread badge, an assisted start, an autonomous escalation.

## Verification

Hand-derived tests:

- The level switch writes a policy change and an audit row; the four states resolve exactly the documented confirm lists.
- The ready check refuses a card without acceptance criteria, over the size bounds, unpriceable, or with no WIP or backlog room, and the refusal names the failed line.
- The backlog cap refuses filing number nine; webhook intake still files.
- The exhaustion escalation names the state and each remaining item's reason, and fires in autonomous with nothing ready.
- Without the roadmap's grant line, the invention check refuses and the agent parks.
- Every agent OK and filing records the level, the project and the chat task.
- Two POSTs to one conversation serialise: the second answers queued, its turn starts after the first ends, and the messages persist in order.
- A fake provider overflow refusal compacts and retries: the retried turn carries summary and tail, a second refusal halves the tail, a third ends with the named error.
- A turn projected past 80 percent of the configured window compacts before the call.
- A write_doc whose base hash is stale refuses with the current content; two concurrent writes both land, the second re-applied on the first.
- Hard delete leaves no rows and one event naming member, thread and count; the card links and the audit survive.
- A turn ending after the seen marker marks the thread unread; opening it clears.
- The escalation lands in the inbox thread with its choices; a reply continues that thread; two venues answering one escalation resolve once, the second hears "already answered".

## Non-goals

- No roadmap entity in the control plane. The spec and the backlog issues stay where they are; the planner and the ready check read them as documents.
- No new approval object for starts. The lane move plus the policy check is the gate.
- No batch approval. The agent presses OK one by one at no cost.
- No staleness re-checks of queued cards in v1, no card expiry, no drafting or refinement of unclear items outside a roadmap grant.
- The rest of the notification service (145): channel preferences, further channels, Web Push with the PWA and catch-me-up stay there; this build takes only the needs-you push slice.
- Shared threads between members (213's question stays open), search across threads, a session or pod per conversation (architecture 5.7 rejects it, the chat agent stays stateless per turn), user-defined skills.
- From the main-loop plan's round: path scoping inside a mixed repository, an approval path for doc commits, structure on the roadmap beyond the file's own, and the durable main-loop agent itself.

## Open points

- The inbox thread's name and look, and the level selector's look: the UX round.
- The exact tool-by-tool confirm lists per level, as one table in policy.
- Where the ready check reads acceptance criteria and size bounds, so it and `ValidatePlan` share one implementation.
- The escalation's shape, on the existing `choices` field.
- The exact wording of the roadmap grant line the invention check matches.
- The inbound path for messenger replies, webhook or `getUpdates`.
- The per-project turn bound's default (3) and the compaction numbers (80 percent, the 10-message tail), tuned in the lane.

## Evidence from the code surveys, 2026-10-14

- `chat.confirm` list per project, Do-it proposals with undo, all action tools listed by default: internal/policy/policy.go (DefaultChat), the proposal flow in internal/console/chat.go.
- Start gating is a lane move with `moved_by` permission, no approval object: internal/factoryd/lanes.go. An issue filed with the `agent` label starts with no human OK today; a running agent already files child cards into ready through `delegate` (internal/gateway/tools.go, internal/factoryd/delegate.go).
- `merge_rule: auto` merges on review approve plus reproduction and records the decider: internal/factoryd/gates.go.
- WIP bound at admission, default 5: internal/factoryd/bounded.go, internal/policy/project.go.
- Budget holds priced before every call against task, day, month and project caps; refusals escalate: internal/gateway/server.go, internal/factoryd/monthcap.go.
- Planner plans validated in code before filing: internal/factoryd/plan.go.
- The chat today: numbered conversations with a current pointer (internal/schema/migrations/factoryd/20261011132117_chat_conversations.sql), the context built per turn from the last 40 messages, 30 events and a snapshot (internal/console/chat.go), the browser-side send queue (internal/console/static/chat.js), the SSE turn ending in a done event, the tool catalogue (internal/console/chat_tools.go), transcripts in chat_messages and card sessions as one JSONL per session in S3 (internal/factoryd/session.go).
