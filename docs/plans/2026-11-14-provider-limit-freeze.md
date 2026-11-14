# A provider limit freezes the class, and every card resumes at the reset the provider names

Written 2026-11-14. Status: written for Sebastian's review, nothing built. Code references
are to the code repository's origin/main at `7383789d1`; grep for the symbol before trusting
a line. Infra references are to that repository's origin/main at `6e67d2f`. The incident
figures come from the live cluster's gateway database, read the same day.

## What happened

ZAI's five-hour limit stopped the big class at 16:42 UTC on 2026-11-14. LiteLLM answered
"Usage limit reached for 5 hour. Your limit will reset at 2026-11-15 01:04:50" and "No
fallback model group found for lookup_groups=big. Fallbacks=[{'premium': ['big']}]".
Normal cards have had no fallback since the Phase 6 merge on infra main, which is the
wanted state.

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
  (`NextWakeAt`, `WakeOn`) requeue a case at a wall-clock time, and the premium cap
  rewrite shows a class change inside the gateway (server.go:329).

## The fix

### A. The gateway names the limit and holds the class

1. Parse the upstream 429 and 402 bodies. Two shapes count: a timestamp that carries its
   offset, read as is, and a naive datetime after the words "reset at", read in the
   provider's time zone from policy. The zai body is the second shape.
2. Policy gains `provider_limits`, one entry per provider, today one line:
   `zai: {tz: Asia/Singapore}`. The default is UTC. The gateway learns a class's provider
   from policy, which knows big and small route to zai (policy.go:1039). A new entry
   needs no restart: `currentPolicy` re-reads the store on its 30-second TTL.
3. A match becomes the named decision `refused_provider_limit`, status 429, body
   carrying the class, the reset and the provider's own words. The audit row records all
   three. The reset the factory uses is the parsed time plus one minute.
4. The gateway holds the class in memory: while now is before the reset, every call on
   the class is answered locally with the same named refusal in microseconds, and no
   call reaches LiteLLM. The hold lapses at the earlier of the reset and now plus
   `provider_recheck` (a new policy wait, default 15 minutes), so a call that arrives
   after a lapse probes the provider once and re-arms the hold on a new reset. A gateway
   roll forgets the hold and the first call after the roll re-derives it. One replica
   today; a second would learn on its own.
5. The gateway writes a `class_frozen` event (class, reset, words) on the shared events
   table when a hold arms and a `class_resumed` event when it ends. The status line
   names the frozen classes from it.

### B. The card freezes and resumes at the reset

1. `ProviderWait` gains `Until time.Time` and `Words string` (workflow.go:330). A session
   that ends on the named refusal carries both. The `provider_refused` event records the
   reset as `BackoffS`, the seconds from the event to the reset, so the digest's
   `retryDue` computes the reset with no new field and old events stay readable.
2. `providerRefused` splits: a named limit with a reset waits on a provider-limit wait in
   the cap wait's shape, a Temporal timer to the reset raced by an answer and the policy
   load wake. A refusal with no reset keeps today's ladder. A freeze does not count
   toward the six-refusal escalation.
3. At the reset the wait ends and the next session starts. Its first call is the probe.
   A refusal with a new reset re-freezes the card with the new time; a refusal with no
   reset falls to the ladder. A provider that moves its reset later is covered by the
   same two lines.
4. The session the limit killed ends as `provider_refused`, as today: no attempt, no
   agent time, no session-cap burn. The next session resumes from the card's records.
   The same agent process is not held alive for hours.
5. The policy load wake also wakes a frozen card. Switching the class's model in policy
   ends the freeze at the next load. That is the human's lever, and it needs no new
   console control.

### C. No clock runs during a freeze

1. A new owned wait kind `provider_limit`, since the freeze began, until the reset. It
   precedes `run_quiet` in `ownedWait`'s table, where the `provider_backoff` row sits
   today (carddigest_flags.go:93), so a frozen card never reads as quiet.
2. Its bound is new: `waits.provider_limit`, default 24 hours. Past it the monitor opens
   one case with the options: add a fallback, switch the model, keep waiting. The
   30-minute `provider_backoff` bound stays for the ladder path.
3. `checkin_refused` and `grant_bought_nothing` do not fire while the freeze covers
   their moment. The digest knows the interval from the event's `BackoffS`.
4. The face's stage clock splits: "building 3h 12m, frozen 6h 48m". The card's life
   records each frozen interval with the words and the reset, so a later reader knows
   why a stage took hours. `Total` splits the same way.
5. The stale sweep does not touch a frozen card: the workflow sleeps in a live timer,
   and the sweep restarts only dead runs.

### D. The cases and the check-ins wait too

1. A brief call answered by the named refusal records one `brief_failed` with the reset
   and sets the case's wake to the reset plus the margin (`SetCaseWake`, already built;
   the monitor sweep wakes due cases). One row per freeze, not 46. Trace in the build
   the retry driver that produced today's 46 rows.
2. The review and audit gates on the frozen class schedule their retry at the reset the
   same way.
3. A check-in call during a freeze is answered by the hold in microseconds and records
   "not run, the class is frozen until 17:04 UTC". It flags nothing.

### E. Fallbacks stay configuration

Big and small have no fallback on infra main: "premium is the one class with a fallback,
one hop to big; a big or small call that fails after its retries fails". Nothing in this
plan adds a fallback or a model switch in code. A fallback is a config commit, the hold's
recheck lapse lets it serve within `provider_recheck`, and the premium cap rewrite to big
(server.go:329) keeps its shape.

## Calls this plan makes

- The freeze lives in the gateway, one place, not in every consumer.
- The reset comes from the provider's own error text. Policy carries the time zone that
  turns a naive stamp into a moment. No zai-specific code: the parse, the policy entry
  and the hold are provider-neutral, and the next provider needs one policy line.
- A freeze ends the session. The next session at the reset is the resume.
- The freeze asks nothing. One case past `waits.provider_limit` is the only ask.
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
2. The hold: a second call on big inside the freeze is answered locally, no upstream
   call, the same until. A call after the lapse probes once and re-arms on a new reset.
3. A naive stamp with no provider entry reads as UTC. A stamp with an offset reads as
   is. A 429 with no parseable reset passes through as today.
4. The card: a session refused with the named limit waits to the reset with no ladder
   climb and no attempt, the timeline holds the freeze, the next session starts at the
   reset, and a re-refusal with a later reset re-freezes.
5. The policy load wake ends a freeze at the load when the class's model moved.
6. The digest: a frozen card's owned wait is `provider_limit` with the reset;
   `run_quiet`, `checkin_refused` and `grant_bought_nothing` do not fire inside the
   freeze; past 24 hours one `wait_over_bound` case opens.
7. The face: the frozen clock renders the words and the reset, and the stage clock
   splits active and frozen.
8. The brief: one refusal during a freeze sets the case wake to the reset, and the
   sweep wakes it then.
9. Replay: a history from before `provider-freeze` walks the ladder as today.

## Alternatives considered

- **Freeze in factoryd only, no gateway hold.** Every consumer must parse the reset and
  behave, and each arriving call still reaches LiteLLM's two retries. The gateway is the
  one place that sees the provider's answer. Rejected.
- **Keep the Alibaba twins as the answer to the quota limit.** They are pay-per-token
  real money. Sebastian's call stands: no fallback for normal cards. Infra main already
  removed them.
- **Trust `Retry-After` headers.** ZAI sends none. The body's words are the source.
- **The freeze state on the store.** In memory with the audit row as the record heals on
  a roll for the price of one probe call. No migration.
- **The 30-minute `provider_backoff` bound as the freeze bound.** It would ask half an
  hour into a five-hour freeze. The freeze bound is its own, 24 hours.

## Out of scope

- The review EOF family (cases 3673, 3769): mid-stream cuts, not a named limit.
- LiteLLM router changes: cooldowns, retries, fallback groups stay as infra main has
  them.
- The premium cap path and its rewrite to big.
- A per-card freeze face beyond the shared clock, words and split timers.

## Cost and risk

- One local refusal per arriving call during a freeze, one upstream probe per lapse and
  per class per freeze.
- A wrong time zone entry freezes too long by the offset's hours. Today's incident pins
  zai at UTC+8: the failures stopped at 17:04:50 UTC against a stamp of 01:04:50.
- Compaction stops during a zai freeze, because small is zai too. Sessions start and run
  until a context needs compaction; a five-hour freeze at the observed pace does not
  reach it.
- The hold covers a fallback added mid-freeze for at most `provider_recheck`.
- The replay risk is the version gate: pre-change histories keep the ladder.
