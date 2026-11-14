# A provider limit freezes the class, one card informs, and every card resumes at the reset the provider names

Written 2026-11-14. Status: written for Sebastian's review, nothing built. Revised the
same day after his review: the freeze fires only after the fallback ladder and only when
the error names a reset time, one card on the board speaks for the whole freeze and
carries the retry switch, the chat stays live, and the parse is string work only. A
second round: the freeze card files the moment the hold arms and closes itself five
minutes after a self-resume, the chat agent may run the retry on its own as part of its
card powers, and the parse reads a default pattern set from policy with an optional set
per provider. Code
references are to the code repository's origin/main at `7383789d1`; grep for the symbol
before trusting a line. Infra references are to that repository's origin/main at
`6e67d2f`. The incident figures come from the live cluster's gateway database, read the
same day.

## What happened

ZAI's five-hour limit stopped the big class at 16:42 UTC on 2026-11-14. LiteLLM answered
"Usage limit reached for 5 hour. Your limit will reset at 2026-11-15 01:04:50" and "No
fallback model group found for lookup_groups=big. Fallbacks=[{'premium': ['big']}]".
Normal cards have had no fallback since the Phase 6 merge on infra main, which is the
wanted state. The error that reached the gateway had already passed LiteLLM's two
retries and its fallback walk, so it was the ladder's last word.

The factory's answer was noise, not a freeze:

- 46 `brief_failed` events carry the usage limit between 16:42:52 and 17:04:01, one case
  brief retry every 10 to 50 seconds.
- The monitor flagged four cards: `checkin_refused` on three, `grant_bought_nothing` on
  one. Five questions reached the human between 17:19 and 17:30.
- The reset was in the error the whole time. Read as Singapore time, 01:04:50 is
  17:04:50 UTC. The last failure came at 17:04:01. The limit lifted at the moment the
  provider named.

The day's 27 other `brief_failed` rows were review EOFs of the same incident, settled by
the chat agent as "provider incident, not card trouble" (cases 3673, 3769). This plan
covers the named limit. The EOF family stays its own fault if it repeats outside a
freeze.

## The mechanism today

- The gateway maps one upstream 429 to a named decision: LiteLLM's budget stop becomes
  `refused_month_cap` (server.go:1054, `isBudgetExceeded` at 1269). A provider 429 passes
  through as `error_upstream` with reason "upstream 429". No reset time is read anywhere,
  and no `Retry-After` is read in the model path.
- factoryd classifies a session whose calls were all refused as `provider_refused`
  (`ProviderRefusal` in store.go, `providerStatus` activities.go:64, the outcome at
  activities.go:1117). That end costs nothing: no attempt, no agent time, no session-cap
  burn. This part is already right.
- The retry is a fixed ladder, not a clock: `providerBackoff(n)` returns 2, 4, 8, 16 and
  30 minutes (workflow.go:889), and the sixth refusal in a row asks a human
  (`providerRefused` workflow.go:2054). A five-hour limit walks the ladder for about an
  hour, asks, and keeps asking.
- The digest reads the refusal's `BackoffS` into `retryDue` (carddigest.go:263), and the
  owned wait `provider_backoff` carries a 30-minute bound (carddigest_flags.go:93). Past
  it the monitor opens a case and hands the card to the human.
- A check-in the limit refuses flags the card (`checkin_refused`). A session a grant
  bought that the limit empties flags it (`grant_bought_nothing`). Both asked today.
- The face's stage clock is wall-clock (board.go `stage()`), and no face or life row
  names a reset time, so hours in a stage would carry no reason.
- What exists and fits: the cap wait sleeps a card until a wall-clock turn and resumes on
  its own (`awaitCap` workflow.go:4145, the `capWait` family in monthcap.go), the policy
  load wake (`SignalPolicyLoaded`) wakes every cap wait when policy changes, case wakes
  (`NextWakeAt`, `WakeOn`) requeue a case at a wall-clock time, the month alarm files one
  cap card for the whole cap (monthcap.go, the cap card of the cap-wait plan's part E),
  and the premium cap rewrite shows a class change inside the gateway (server.go:329).

## The fix

### A. The gateway names the limit and holds the class

1. A freeze fires only on an error that is final and dated. Final means it reached the
   gateway: LiteLLM has already run its two retries and its fallback walk, so whatever
   the gateway sees is the ladder's last word. Dated means a header or the body parses
   to an absolute reset moment. A bare 429 from short-term overload, a relative hint
   such as "try again in 1 second", or an unreadable error changes nothing: the session
   keeps today's backoff ladder. Only the clear case freezes.
2. The parse is string work, no model call: header reads and regexes, in the gateway.
   There is no common standard for these messages (checked 2026-11-14). The IETF's
   RateLimit header work counts seconds, not moments, and so does every relative hint.
   Anthropic names absolute RFC 3339 resets in its `anthropic-ratelimit-*-reset`
   headers. OpenAI and Google give relative delays only (`x-ratelimit-reset-*`,
   `retryDelay`). zai puts a naive datetime in the body. The default set reads three
   shapes, in order: a reset header in RFC 3339 or ISO 8601, offset included; a
   `Retry-After` header in HTTP-date form; a datetime in the body after words such as
   "reset at", read in the provider's time zone. Only an absolute moment freezes. A
   relative hint, whatever its unit, keeps the ladder: a guess is not knowledge. Trace
   in the build whether LiteLLM forwards a failing deployment's reset headers; if it
   drops them, the body is the source and the provider's entry says what it writes.
3. Policy gains `provider_limits`, one entry per provider, today one line:
   `zai: {tz: Asia/Singapore}`. The default time zone is UTC. The pattern set is policy
   too: a default list the gateway ships, and an optional `patterns` entry per provider
   that replaces the default for that provider, so a new wording is a config change, not
   code. The gateway learns a class's provider from policy, which knows big and small
   route to zai (policy.go:1039). A new entry needs no restart: `currentPolicy` re-reads
   the store on its 30-second TTL. The next provider is one policy line.
4. A match becomes the named decision `refused_provider_limit`, status 429, body
   carrying the class, the reset and the provider's own words. The audit row records all
   three. The reset the factory uses is the parsed time plus one minute.
5. The gateway holds the class in memory: while now is before the reset, every work call
   on the class is answered locally with the same named refusal in microseconds, and no
   call reaches LiteLLM. The hold lapses at the earlier of the reset and now plus
   `provider_recheck` (a new policy wait, default 15 minutes), so a call that arrives
   after a lapse probes the provider once and re-arms the hold on a new reset. A gateway
   roll forgets the hold and the first call after the roll re-derives it. One replica
   today; a second would learn on its own.
6. The gateway writes a `class_frozen` event (class, reset, words) on the shared events
   table when a hold arms and a `class_resumed` event when it ends.

### B. One card speaks for the freeze

1. The moment a hold arms, factoryd files one freeze card, in the month alarm's
   cap-card shape. It names the provider's words, the class, the reset with its
   countdown, and how many cards wait. It holds no work slot and asks nothing: it
   informs, and it carries one action, the retry switch.
2. A class that resumes on its own at the reset leaves the card five minutes longer,
   with the held time on its face, then the card closes on its own: the board shows the
   freeze ended without a hand. The retry switch closes it at once. A re-armed hold
   with a later reset updates the same card, it files no second one.
3. The frozen work cards stay quiet: no case, no flag, no question. The freeze card is
   the single human surface for the whole event, so a known block shows once on the
   board instead of a storm of failing cards.
4. If the freeze outgrows `waits.provider_limit` (new, default 24 hours), the freeze card
   itself speaks up once: the options are add a fallback, switch the model, keep waiting.
   The work cards still ask nothing.

### C. The card freezes and resumes at the reset

1. `ProviderWait` gains `Until time.Time` and `Words string` (workflow.go:330). A session
   that ends on the named refusal carries both. The `provider_refused` event records the
   reset as `BackoffS`, the seconds from the event to the reset, so the digest's
   `retryDue` computes the reset with no new field and old events stay readable.
2. `providerRefused` splits: a named limit with a reset waits on a provider-limit wait in
   the cap wait's shape, a Temporal timer to the reset raced by an answer, the policy
   load wake and the retry wake. A refusal with no reset keeps today's ladder. A freeze
   does not count toward the six-refusal escalation.
3. At the reset the wait ends and the next session starts. Its first call is the probe.
   A refusal with a new reset re-freezes the card with the new time; a refusal with no
   reset falls to the ladder. A provider that moves its reset later is covered by the
   same two lines.
4. The session the limit killed ends as `provider_refused`, as today: no attempt, no
   agent time, no session-cap burn. The next session resumes from the card's records.
   The same agent process is not held alive for hours.
5. The policy load wake also wakes a frozen card. Switching the class's model in policy
   ends the freeze at the next load.

### D. No clock runs during a freeze

1. A new owned wait kind `provider_limit`, since the freeze began, until the reset. It
   precedes `run_quiet` in `ownedWait`'s table, where the `provider_backoff` row sits
   today (carddigest_flags.go:93), so a frozen card never reads as quiet.
2. The 30-minute `provider_backoff` bound stays for the ladder path. `provider_limit`
   has no per-card bound at all: the freeze card in B4 owns the only escalation.
3. `checkin_refused` and `grant_bought_nothing` do not fire while the freeze covers
   their moment. The digest knows the interval from the event's `BackoffS`.
4. The face's stage clock splits: "building 3h 12m, frozen 6h 48m". The card's life
   records each frozen interval with the words and the reset, so a later reader knows
   why a stage took hours. `Total` splits the same way.
5. The stale sweep does not touch a frozen card: the workflow sleeps in a live timer,
   and the sweep restarts only dead runs.

### E. The cases and the check-ins wait too

1. A brief call answered by the named refusal records one `brief_failed` with the reset
   and sets the case's wake to the reset plus the margin (`SetCaseWake`, already built;
   the monitor sweep wakes due cases). One row per freeze, not 46. Trace in the build
   the retry driver that produced today's 46 rows.
2. The review and audit gates on the frozen class schedule their retry at the reset the
   same way.
3. A check-in call during a freeze is answered by the hold in microseconds and records
   "not run, the class is frozen until 17:04 UTC". It flags nothing.

### F. The chat stays live and carries the retry switch

1. A freeze can end before the named time, because a limit reset on the provider's side
   lifts the block first. Two entry points, one mechanism: the retry action of the
   project chat and the retry button on the freeze card. The chat's retry is one of its
   card actions, in the set it already holds for managing the board for the human: the
   chat agent runs it on a human's word or on its own judgment, with no extra grant.
2. The mechanism: clear the gateway's hold, wake every frozen card. The woken cards'
   next sessions are the probes. If the provider answers, the freeze ends for all and
   the freeze card closes on `class_resumed`, at once. If the provider still refuses,
   the first named refusal re-arms the hold and the cards re-freeze at the new reset
   with no ask. The burst costs one call per card, then quiet again.
3. The chat keeps answering through a zai freeze: policy runs the chat on premium
  (policy.yaml `chat.model`), a different provider. Its tool calls on a frozen class get
   the named refusal with the reset in the body, so the chat can say why a tool stands
   still. The retry action itself makes no model call on the frozen class, so it works
   whatever the provider's state.

### G. Fallbacks stay configuration

Big and small have no fallback on infra main: "premium is the one class with a fallback,
one hop to big; a big or small call that fails after its retries fails". With fallbacks
configured, LiteLLM serves the twin and no dated 429 reaches the gateway, so the freeze
simply does not fire; it fires only when the whole chain is spent. Nothing in this plan
adds a fallback or a model switch in code. A fallback is a config commit, the hold's
recheck lapse lets it serve within `provider_recheck`, and the premium cap rewrite to
big (server.go:329) keeps its shape.

## Calls this plan makes

- The freeze lives in the gateway, one place, not in every consumer.
- The freeze fires only on a final, dated error: past the fallback ladder, with an
  absolute reset time the parse can read. Everything else keeps the ladder.
- The parse is header reads, regex and string operations in the gateway, over a default
  pattern set in policy with an optional set per provider. Policy also carries the time
  zone that turns a naive stamp into a moment. No model call parses a provider error.
- One freeze card speaks for the whole class. The work cards never ask.
- A freeze ends the session. The next session at the reset is the resume.
- The freeze records its reset as `BackoffS`, reusing the one field the digest already
  reads.

## Versioning

One new workflow version gate, change id `provider-freeze`. A run from before the change
keeps the ladder. The `provider_refused` event's shape does not change, so old histories
replay as today.

## Tests

Hand-derived:

1. The gateway maps today's zai body: the parse reads "2026-11-15 01:04:50" with tz
   Asia/Singapore, and the refusal carries until 2026-11-14 17:04:50 UTC plus one
   minute, the words, and the class big.
2. A bare 429, a 429 with "try again in 1 second", and a 402 with no readable datetime
   pass through as today. No hold arms.
3. A naive stamp with no provider entry reads as UTC. A stamp with an offset reads as
   is.
4. The hold: a second call on big inside the freeze is answered locally, no upstream
   call, the same until. A call after the lapse probes once and re-arms on a new reset.
5. The freeze card: one hold on big with nine frozen cards files one card the moment the
   hold arms, whatever the reset's distance. It names the words, the countdown and the
   count, holds no slot and asks nothing. A re-arm updates it. A self-resume at the
   reset leaves it five minutes and then it closes on its own. A retry press closes it
   at once.
6. The pattern sets: a provider entry with its own patterns replaces the default set,
   an entry with none uses the default. An RFC 3339 reset header freezes with its
   offset read as is. A relative hint in any unit never freezes, so OpenAI's
   `x-ratelimit-reset-*` and Google's `retryDelay` keep the ladder.
7. The retry switch, from the chat and from the card: the hold clears, every frozen card
   wakes, a first call that succeeds closes the freeze card, and a first refusal with a
   new reset re-freezes all with no ask.
8. The card: a session refused with the named limit waits to the reset with no ladder
   climb and no attempt, the timeline holds the freeze, the next session starts at the
   reset, and a re-refusal with a later reset re-freezes.
9. The policy load wake ends a freeze at the load when the class's model moved.
10. The digest: a frozen card's owned wait is `provider_limit` with the reset;
    `run_quiet`, `checkin_refused` and `grant_bought_nothing` do not fire inside the
    freeze; past 24 hours the freeze card speaks once and no work card asks.
11. The face: the frozen clock renders the words and the reset, and the stage clock
    splits active and frozen.
12. The brief: one refusal during a freeze sets the case wake to the reset, and the
    sweep wakes it then.
13. Replay: a history from before `provider-freeze` walks the ladder as today.

## Alternatives considered

- **Freeze in factoryd only, no gateway hold.** Every consumer must parse the reset and
  behave, and each arriving call still reaches LiteLLM's two retries. The gateway is the
  one place that sees the provider's final answer. Rejected.
- **Keep the Alibaba twins as the answer to the quota limit.** They are pay-per-token
  real money. Sebastian's call stands: no fallback for normal cards. Infra main already
  removed them. With them back, the freeze fires later, only when the chain is spent.
- **Freeze on every 429.** A short-term overload from parallel sessions would freeze the
  class. Only a dated error freezes; the rest keeps the ladder.
- **Freeze on relative delays.** OpenAI's `x-ratelimit-reset-*`, Google's `retryDelay`
  and a seconds `Retry-After` name a wait, not a moment, and the big providers use them
  for minute windows. Only an absolute reset freezes; the HTTP-date form of
  `Retry-After` counts, the seconds form does not.
- **A model call reads the provider's error.** The parse is regex work. A provider error
  must never need a model to be understood.
- **The freeze state on the store.** In memory with the audit row as the record heals on
  a roll for the price of one probe call. No migration.
- **Per-card freeze asks past a bound.** One freeze card owns the whole event. The work
  cards stay silent at any freeze length.

## Out of scope

- The review EOF family (cases 3673, 3769): mid-stream cuts, not a named limit.
- LiteLLM router changes: cooldowns, retries, fallback groups stay as infra main has
  them.
- The premium cap path and its rewrite to big.
- Keeping the chat alive when its own provider is down: policy already runs the chat on
  premium, and that placement is the guard.

## Cost and risk

- One local refusal per arriving call during a freeze, one upstream probe per lapse and
  per class per freeze, one call per card on a retry.
- A wrong time zone entry freezes too long by the offset's hours. Today's incident pins
  zai at UTC+8: the failures stopped at 17:04:50 UTC against a stamp of 01:04:50. The
  retry switch covers a provider that lifts the limit early.
- A parse that misses a provider's phrasing falls back to the ladder, which is today's
  behaviour. Missing a freeze is safe; freezing without a date is impossible. A provider
  whose reset reaches the gateway only in headers freezes only if LiteLLM forwards them;
  the build's trace step answers that, and a body pattern covers the rest.
- Compaction stops during a zai freeze, because small is zai too. Sessions start and run
  until a context needs compaction; a five-hour freeze at the observed pace does not
  reach it.
- The hold covers a fallback added mid-freeze for at most `provider_recheck`, and the
  retry switch ends that wait at a click.
- The replay risk is the version gate: pre-change histories keep the ladder.
