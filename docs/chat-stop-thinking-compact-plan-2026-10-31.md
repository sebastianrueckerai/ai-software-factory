# The chat's stop and thinking, and compaction by the model's own window: one build plan

Written 2026-10-31. Status: built 2026-11-01.
Scope rulings from Sebastian's answers the same day: the stop and the
thinking cover the chat's turns only; card sessions keep their doors. A
builder read the plan against the code; its five questions are settled in
the text, each marked "my call".

## What exists today

- The thinking mark: a message whose turn is in flight ends with the
  breathing "thinking" mark (C35), `thinkingHTML` in
  `internal/console/static/chat.js:172`, added when a turn starts on the
  page that opened it (chat.js:711) or when a page returns to a thread it
  still tracks (chat.js:1233 reads the page's own `busy` state), removed
  when the stream ends (chat.js:814). It states the turn runs and does
  nothing else.
- The turn: `turn.run` in `internal/console/chat.go:787` makes model calls
  through `OperatorModel` and streams SSE to the browser: `queued, joined,
  heard, compacted, text, tool, proposal, applied, view, budget, error,
  done` (chat.js:723). The turn is not bound to one request: a message
  posted while it runs joins it (the `joined` event). The stream is the
  POST's own response, so a page reloaded mid-turn holds none: it sees the
  thread, not the live turn, until it sends a message. The open-thread
  response carries a server-side working flag (chat.go:307), which the
  thread list renders as its working dot (chat.js:307). No route can
  cancel a turn.
- Thinking content: the chat's model premium (gpt-6.1-sol, reasoning max)
  sends its reasoning as `reasoning_content` on the stream; LiteLLM's
  Responses bridge and the gateway pass it through (verified live
  2026-10-29 with the OpenAI key, the ledger's premium entry). The gateway
  whitelists no
  `thinking` field, so no caller can switch reasoning on or off
  (`docs/manual/policy.md:229`). `OperatorModel` parses only
  `delta.content` and `delta.tool_calls` (`internal/factoryd/operator.go:199`)
  and discards the reasoning. The GLM classes send the same field (the
  worker's opencode config declares it interleaved,
  `internal/factoryd/opencode.go:930`), so premium's fallback to big keeps
  the field; one live check on big confirms the default.
- Stop machinery that exists: the gateway settles a stream whose caller is
  gone from LiteLLM's spend log (`settleCanceled`,
  `internal/gateway/server.go:902`), and the chat's budget stop ends a turn
  on a row of kind `budget` that the resumed context leaves out (2026-10-28).
  A stopped turn reuses both shapes.
- Chat compaction: the preset fires before a turn's context is built, when
  the projected context passes 80 percent of the window
  (`internal/console/compact.go:184`); the forced one fires on the gateway's
  typed context-overflow refusal, twice, the second retry halving the kept
  tail (chat.go:820); the hand one is `/compact`. The window is
  `chat.window`, a flat 128000 default (`internal/policy/policy.go:113`).
  The 2026-10-14 design words the preset "80 percent of the configured
  window of the alias that will serve the turn"; the build flattened the
  window to one number for every alias.
- Worker compaction: the generated opencode config sets `limit.context` to
  `ModelContext` (200000, the same for every model) and `limit.input` to
  policy `limits.context_tokens` (100000), compaction auto, reserved 0
  (`internal/factoryd/opencode.go:908`). The real windows: glm-5.3 and
  glm-5.3-flash advertise 1048576, gpt-6.1-sol serves 128000 (LiteLLM's
  `/model/info`, which the gateway already polls every 5 minutes for
  prices). A GLM session therefore compacts at about a tenth of its model's
  window, and a premium session runs with a declared ceiling of 200000 over
  a 128000 window: only the 100000 input limit has kept planner sessions off
  the overflow path.
- Visibility: the chat names compaction (the `compacted` event, the
  thread's summary card). A worker compaction shows on no console surface;
  the audit row records the call.

## Phase 1: the stop

The thinking mark becomes the stop control, the turn ends on it, and the
thread goes on.

- Server: one registry of running turns beside the existing join path, each
  with its cancel function. One route, `POST /projects/{name}/chat/stop`
  with the thread the chat POST takes, applies the same write check the
  chat POST applies (my call: not owner-only, so a member watching a turn
  answer their own message in another member's thread can stop it), and
  cancels the turn's context. The registry holds the turns a chat POST
  opened, the streamed ones (my call): a quiet turn (wake, fund-resume, a
  card answer) is not in it and keeps its doors. A stop with no running
  turn answers 204 and changes nothing (my call).
- The stop lands at the next step boundary (my call). A model call in
  flight is canceled; the gateway settles and prices it from the spend log
  on the `client_canceled` path, exactly as it prices a call a supervisor
  cut. A tool call in flight runs to its end and is recorded, so no write
  lands without its row; the turn then ends without the next model call.
  A tool call the canceled stream was still describing never ran and
  leaves no row. A canceled context reads as stopped at the turn's error
  sites, not as a read failure.
- The turn stores the reply it streamed so far, then one row of kind `stop`:
  "Stopped by {member}." The partial reply stays in the thread, marked cut;
  the cut mark is part of the stored row, so the browser and the model's
  replay both see that the answer was cut (my call: the partial reply
  replays, unlike a budget row, because the model's partial work carries
  context worth keeping). The resumed context leaves `stop` rows out, as it
  leaves `budget` rows out.
- Messages the turn had not read keep their "not read yet" state; the next
  turn reads them first.
- One event, `chat_stopped`, `via: button`, on the project's feed.
- Detached wake turns are out of scope: no stream is open on them, and the
  check-in and the caps bound them.
- Browser: the mark becomes a button with the same look and the title Stop.
  A press posts the stop, the stream answers `stopped` and ends, and the
  mark turns to a grey "stopped". Escape in the chat panel does the same
  while a turn streams. A page reloaded mid-turn draws the button from the
  thread's working flag (chat.go:307), which the open-thread response
  already carries (my call): the press stops the turn with no stream open,
  then the page reloads the thread and shows the rows. The thread-list
  working dot stays as it is.
- Tests: `TestChatStopEndsTheTurn` (a turn in flight on the fake gateway,
  the stop route, the stream ends with `stopped`, the thread holds the
  partial reply and the stop row, the unread message stays unread),
  `TestChatStopRowsLeaveTheContext`, and the chat.js node test gains the
  button, the Escape key and the stopped state.

## Phase 2: the thinking fold

The mark row gains a fold that shows the live reasoning.

- `OperatorModel`'s parser gains `delta.reasoning_content` and hands the
  deltas to the turn loop. The loop emits one new SSE kind, `think`, the
  deltas as they arrive, before and between the `text` and `tool` events.
- chat.js: a chevron beside the mark toggles the fold. The fold holds the
  live thinking, auto-scrolled while open. The browser keeps the last
  16 KiB, cut at a line boundary; older deltas fall out. The two acts stay
  separate: the chevron shows the thinking, the mark (phase 1) stops the
  turn.
- Nothing is stored, the `session_said` rule: on the bus, never stored.
  The fold lives in the page that holds the stream. A page reloaded
  mid-turn has no stream and nothing stored to refill from, so the chevron
  hides until the next turn (my call: no rejoin machinery; thinking is
  gone when the page goes). The thread, the replay and the model's context
  never see thinking.
- If the serving model sends no `reasoning_content`, the chevron hides. No
  model switch and no gateway change: premium sends the field today and GLM
  sends the same one.
- Tests: `TestChatStreamsThinking` (the fake gateway serves reasoning
  deltas; the SSE order holds `think` before `text`),
  `TestChatThinkingIsNotStored` (the thread rows carry no thinking), and
  the chat.js node test gains the fold, the trim and the hidden chevron.

## Phase 3: compaction by the model's own window

- The window source: the gateway serves each alias's context window from
  the `/model/info` poll it already runs every 5 minutes for prices (the
  figure that listed premium at 128000). A window that is wrong gets pinned
  in the infra LiteLLM `model_info`, as Sol's rates were (2026-10-29). No
  second registry, no policy knob for windows.
- Chat: the 80 percent test reads the serving alias's window when the
  project sets no `chat.window`; the flat 128000 default goes. This is the
  2026-10-14 design's own wording, so the build returns to the ruling it
  drifted from. `chat.window` stays as an explicit pin.
- Worker: `buildOpencodeConfig` derives both values from the session's
  model: `limit.context` is the smaller of the alias's window and
  `ModelContext` (200000), and `limit.input` is 75 percent of that.
  `ModelContext` stays the trust cap, because advertised windows overstate
  what a model does with long context and the GLM coding plan bills every
  fresh input token again on each step.
- Policy `limits.context_tokens` goes; no model-blind trigger remains. The
  strict decoder means the infra commit lands first, one Flux
  reconciliation apart at worst (the escalate plan's dance).
- Worker visibility: the opencode parser gains the compaction event the
  pinned v1.18.32 emits, if its event bus carries one (the version's
  `SessionCompaction` exists; the builder verifies the event shape against
  the pinned binary): one timeline row and one session event, and the
  drawer's Activity shows "compacted" with the token figures. If the bus
  carries nothing, the worker's compaction stays an audit fact and the
  ledger entry says so.

### Where to cut: the threshold

The question: at what share of its model's window should a conversation
compact? The answer: 75 percent of a trusted window for worker sessions,
80 for the chat.

The shares after: 75 percent of the trusted ceiling for the worker, 80 of
the alias's window for the chat. Today's GLM trigger sits at about 10
percent of the advertised window, and premium's declared ceiling (200000)
sits above its real window (128000).

| Model | Advertised window tokens | Trusted ceiling tokens | Trigger today tokens | Trigger after tokens |
|---|---|---|---|---|
| big and small (glm-5.3, glm-5.3-flash) | 1048576 | 200000 | 100000 | 150000 |
| premium (gpt-6.1-sol) | 128000 | 128000 | 100000 | 96000 |
| chat, any alias | the alias's | `chat.window` pin | 102400 | 80 percent of the alias's window |

- Every measured model loses accuracy as context grows, gradual at first
  and steep near the window's end (RULER, arXiv 2404.06654). On hard
  synthetic tasks, open models hold an effective context under half their
  trained window (An et al. 2025), and at 32K tokens 10 of 12 models fall
  below half their short-context baseline (NoLiMa). Replay with tools is
  easier than those benchmarks, but the direction holds: quality fades with
  length, not only at the edge. A 1M advertisement is not 1M of good
  context, which is why the trust cap, not the advertisement, sets the
  ceiling.
- The GLM coding plan bills about 6.9 credits per 10,000 fresh input tokens
  and about a quarter of that cached (third-party figures, unverified
  against z.ai's own docs; `internal/policy/credits.go` is the factory's
  source of record and the builder checks them). A fuller window costs on
  every call.
- The chat has run at 80 percent of its window since 2026-10-14 with no
  quality fault, and its projection is exact, from the ledger's token
  totals. The worker's check is coarser, opencode counts per message, so it
  takes the larger margin: 75.
- Compacting under about 60 percent costs more than it buys: every
  compaction loses working state, and a session that lost its state
  re-reads it. The live case ran about 50 minutes in a compaction and
  re-read loop on a 6.7 MB transcript (the build ledger's compaction-loop
  entry).

Seventy instead of 75 is the safe side if Sebastian wants the extra margin;
the plan ships 75.

## Non-goals

- No stop for card sessions and no worker thinking in the drawer
  (Sebastian's scope answers, 2026-10-31). The doors stay: steer, End the
  card, the check-in.
- No chat model change, and no `thinking` parameter through the gateway;
  the output clamp ruling stands (`docs/manual/policy.md:227`).
- Thinking is never stored, never replayed, never in the model's context.
- No new policy knob: the fraction is code, like `FactoryModel`'s mappings;
  the trust cap stays `ModelContext`; a wrong window is pinned in infra.

## Order of work

1. Phase 1, code repo: the registry, the route, the row and event, the
   chat.js button, the tests named above.
2. Phase 2, code repo: the parser case, the `think` event, the fold, the
   tests; one live check that big sends `reasoning_content` when premium
   falls back.
3. Phase 3, both repos: the gateway window read, the chat window rule, the
   opencode config derivation, the parser's compaction case, the infra
   commit that drops `limits.context_tokens`.
4. The new-tools build runs through the same chat.go and chat.js seams now;
   land these phases behind it or rebase over its rolls, the house routine.
   `go test -race ./...` green, the chat.js node tests, the console lab for
   the mark and the fold.
5. The build records the C-entry that amends C35 and the ledger entry with
   the threshold ruling.

## Sources

- Sebastian 2026-10-31: the ask (stop the thinking circle as other
  harnesses do, expandable thinking, auto-compact from the serving model's
  context limit, the 70 percent question) and the two scope answers (chat
  turns only; chat thinking only).
- Code: the file:line references above, ai-software-factory-code main.
- RULER, arXiv 2404.06654. An et al. 2025, "Why Does the Effective Context
  Length of LLMs Fall Short?". NoLiMa benchmark, 2025.
- GLM-5.3 and GLM-5.3-Flash windows (1048576): z.ai's GLM-5.3 page and
  OpenRouter's model pages. Coding-plan credit rates: third-party summaries,
  unverified against z.ai's docs.
