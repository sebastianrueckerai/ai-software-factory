# The press that returns fast, and the deploy panel that carries its release

Written 2026-11-01. Status: built on code main the same day. Fix 1 as
14523ff7 (signalTimeout of 10 s per attempt, one retry, the dial's 5 s
connect timeout and keepalive), fix 2 as 2f2681ba, fe4f36fb, 2cea6290 and
bad53ef3 (pressNote, the #note outlet, the board-refresh trigger), fix 3
as 75b474cd (form.htmx-request button in console.css:100), fix 4 as
00094a2a (Hold.Released from the standing Deploy now) with 071db830 (a
failed settle ends the window in the store's own statement). The note
outlet then moved into the board's grid cell (b36ba3cb, the register's
fault 19).

## What happened

Sebastian pressed Deploy now on the Production panel. The press worked, but the
panel re-rendered into the same sight he had answered: the hold line, the plans,
the button. "Held for under a minute" was his own press restarting the hold
clock (`SetDeployNow` writes `held_since = now`, release.go:129), and nothing on
the panel said a release stood, so a second press looked both possible and
pointless. He asked for a deploying state and a locked button.

The same family already has an analysed root cause: needs-you-analysis-2026-11-01.md,
complaint 8, the answer press that blocks for minutes. Three causes, none fixed
on main: the Temporal signal on the press chain has no deadline and the client
is dialled with no timeout options; every press ends in a synchronous
full-board re-render before the browser gets a byte; and the spinner rule
targets `button.htmx-request` (console.css:100) while htmx sets the class on
the form, so no press ever shows a pending state. This plan fixes complaint 8
whole and the deploy panel with it; the filed needs-you draft can drop its
requirement 8 or point here.

## The mechanism

- The press chain: `doAnswerPlanQuestion` (actions.go:593) runs the answer
  UPDATE, then `wf.Signal` into Temporal's `SignalWithStartWorkflow`
  (temporal.go:62) on the request context with no deadline, then a Forgejo
  comment capped at 15 s, then `showBoard` re-renders everything
  (board.go:1733): policy, project reads, approvals, every card with its plan
  issue, budget, evidence, one timeline face per running card. A hung Temporal
  frontend blocks the press until the server's 60 s WriteTimeout kills the
  response mid flight (main.go:686).
- Every POST tail is the same shape: `c.showBoard(w, r, http.StatusOK, note, nil)`
  at buttons.go:45, 58, 77, 87; approvals.go:357; board.go:3035, 3050;
  edits.go:15, 26; routines.go:75. The forms post with `hx-target="#board"
  hx-swap="outerHTML"` (board.html:69, 238 and siblings).
- The Production section (board.html:69) renders exactly two states: the hold
  line (`holdLine{For, Reason}` composed at board.go:2528 from
  `ReleaseKeeper.Hold`, releasekeeper.go:388) plus, for an approver, the Deploy
  now form. There is no in-flight state because `Hold` carries none: the
  releases row it already reads holds `deploy_now` (the standing release's
  commit, release.go:22) and `held_since` (restarted by the press), and both are
  dropped on the floor.
- The roller spends the window when the release has gone out
  (`ClearDeployNow`, rolltask.go:627, inside `setFlux`).

## Why it is wrong

A press is an answer plus a wait. The console today couples the answer, the
wake, the Forgejo comment and the whole-board render into one synchronous
request, so the human's only feedback channel is the thing most likely to hang.
And the one decision that is genuinely in flight, a standing release, is the
one state the panel cannot show, though its facts sit in the row the hold line
already reads. Reliability by construction: the fix belongs in the request
shape and the panel's data, not in a prompt or a timer.

## The fix

Four changes. No workflow step order changes, so no change id; the console and
client changes reach the cluster with the next roll.

1. **Bound the wake** (factoryd). The signal wrapper at temporal.go:62 runs
   under `context.WithTimeout(ctx, 10*time.Second)`, retries once on
   deadline or unavailability, then returns a named error
   (`ErrWakeFailed`). The handlers render it as its own note: the answer
   stands recorded, the card's wake failed, see the factoryd log. The client
   dial at main.go:249 gains connection options with a 5 s connect timeout
   and keepalive parameters, so a dead frontend fails fast instead of
   hanging connects.

2. **The press answers, the board follows** (console). A new helper
   `pressNote(w, r, note, err)` replaces the tail of every POST handler
   listed above: on error it delegates to `c.fail` unchanged, on success it
   writes the note line into a new `#note` outlet and sets
   `HX-Trigger: board-refresh`; when the request is not htmx
   (no `HX-Request` header) it falls back to today's full `showBoard`, so
   the no-JS form posts keep answering a page. The POST forms change
   `hx-target="#note" hx-swap="innerHTML"`; the board wrapper gains
   `hx-get` to its own board URL and `hx-trigger="board-refresh from:body"`.
   The press now returns after the bounded action work; the board re-renders
   as its own GET.

3. **Pending on the form** (console.css:100). The never-firing
   `button.htmx-request::after` rule is replaced by
   `form.htmx-request button { opacity: .5; pointer-events: none; }` plus the
   same spinner on `form.htmx-request button::after`. Every press shows its
   pending state at once, in pure CSS, no htmx upgrade.

4. **The panel carries its release** (factoryd and console). `Hold` gains
   `DeployNow string` and `DeployAt time.Time`, filled in
   `ReleaseKeeper.Hold` from the row it already reads (`deploy_now`,
   `held_since` when a window stands). The board composition compares
   `DeployNow` with main's head, fetched alongside the board's existing
   capped Forgejo project reads (reused if the board data already holds it),
   and sets `holdLine.Released{Commit, Age}` only on a match. The template
   then renders: "Deploy now stands for `<commit7>`, pressed `<age>` ago:
   rolling. A merge after it waits for the open plans again." with no form;
   the form returns when the window is spent or the head has moved past it,
   because releasing the newer tip is a new decision the confirm dialog
   already words. And the roller clears the window when the released
   commit's roll fails, so a failed release returns the button instead of
   reading as eternally rolling; the roll-failed card keeps carrying the
   ask.

## Tests

- Temporal: the signal wrapper applies a deadline of at most 10 s to the
  context it passes `SignalWithStartWorkflow` (fake client captures the
  context). RED today: no deadline.
- Temporal: two failing signal calls answer `ErrWakeFailed`; the answer's
  persistence is not rolled back.
- Console: a POST plan answer answers with the note fragment (the note text,
  no full document) and the `HX-Trigger: board-refresh` header; the same POST
  without `HX-Request` answers a full board page. RED today: always a full
  page.
- Console: a refused press (not held, main red) still answers through
  `c.fail` with its refusal note, fragment for htmx and page without.
- Construction: the board's POST forms target `#note` with `innerHTML`; the
  board wrapper carries the `board-refresh` trigger and its `hx-get`;
  layout.html holds the `#note` outlet (aria-live polite). RED today.
- Construction: console.css carries `form.htmx-request button` and no longer
  `button.htmx-request`. RED today.
- Factoryd: `ReleaseKeeper.Hold` fills `DeployNow` and `DeployAt` from a
  row whose window stands; a spent row leaves them zero. RED today: no
  fields.
- Console: with `holdLine.Released` set the Production section shows the
  rolling line and no Deploy now form; with it nil it shows the warn line
  and the form for an approver. RED today.
- Roller: a failed roll of the released commit calls `ClearDeployNow`. If
  main already clears it, the test stays as the pin.
- Full suite: `go test -race ./...`.

## Alternatives considered

- A time-based lock on the button ("deploying" for N seconds). A timer cannot
  know how long a roll takes, and it would leave the panel blind between
  timer end and roll end. The release window is the truth; it already exists.
- Wiring the board to the project's event stream (`/projects/{name}/events/
  stream`) so state changes push their own renders. Right eventual shape,
  bigger change; the press-decoupled refresh fixes the felt fault now.
- Hiding the button whenever any window stands, without the head comparison.
  It would lock the newer-tip decision out too; the comparison is one capped
  read on a path that already makes several.
- Fixing only the CSS rule. It would show pending on a press that still
  blocks for minutes.

## Out of scope

One question at a time on plan approvals (complaint 5), plan card bounds
(complaint 4), the Needs-you design round (complaint 9), the fabricated
check-in share stop, and the supervisor's `json_object` 400 (supervisor.go:248,
its own card). The needs-you draft's other requirements stay theirs.

## Cost and risk

About a dozen files, most of them one-line tails or template attributes; the
new surfaces are one helper, one outlet, two struct fields and one template
branch. Risk sits in the response-shape change: a handler missed by the
conversion still works (it renders the full board into `#note`, ugly but
correct), and the no-JS fallback is kept by the header check, pinned by test.
Nothing on the workflow's path changes order, so in-flight runs are untouched.
