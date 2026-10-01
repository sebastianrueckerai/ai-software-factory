# The aggregate: what the field teaches our board

Task 156. Evidence: the twelve deep reports of this round
([reports/](reports/), 158 screenshots), cross-checked against the old
roadmap item 21's seventeen ranked patterns (stage10-queue.md section H,
2026-09-29) and Sebastian's brief (title plus summary on the face, status
lights, human comments, human-set colours, the chat behind a click, dark
default). Product names link to their reports.

## 1. What to steal

Ranked by how much each moves our board; every line names who does it best
and our one-line version. Pattern numbers refer to the old ranked seventeen.

1. **Two state axes per card: the column says where in its life the work is,
   the badge says what the agent does right now.** Best: Nimbalyst (phase
   columns orthogonal to live run status, fed from different sources);
   cline/kanban's quiet live activity line ("Thinking…", `Read(src/x.ts)`,
   "Waiting for review") proves the badge can be fed purely by harness
   events, never polling. Vibe Kanban deleted the columns after sunset and
   users revolted (#2687): both halves are load-bearing. Old pattern 1,
   confirmed. Ours: coarse state columns stay; a live badge lands beside the
   status, fed by gateway events.
2. **The badge grammar: nothing renders when it has nothing to say.** Best:
   Trello (badges appear only with content; two colour channels that never
   mix - system states own their colours, users own labels), with Plane's
   icon-only chips that vanish when empty. Ours: status pill, counts and
   chips appear only when non-empty; a ten-card column scans with zero
   filler.
3. **The reason on every waiting card.** Best: Hermes (even the dispatcher's
   suppression carries a one-line why); cline/kanban is the cautionary twin -
   it models `reviewReason` (attention/exit/error/interrupted/hook) and
   renders none of it. Old pattern 4. Ours: a waiting card names the gate,
   question, approval or failure, the agent's one-line ask, and how long it
   has waited.
4. **Card face: issue ref, title, one-line summary - everything else behind
   exactly one click.** Best: Trello's face/back split at 5/5 scannability;
   Linear's status row (state, "Working for 3m 51s", PR chip, files changed,
   artifact counts) is the densest face that still scans. Sebastian's brief
   asks exactly this. Ours: the face drops the full objective text; it
   carries title plus the agent's or plan's one-line summary, and the rest
   opens.
5. **The telemetry triple on every running card: elapsed, checks n/n, spend
   against budget.** Best: Factory (status icon + elapsed + n/n checks on
   every row; its own users complain that spend is aggregate-only - we take
   all three); Linear adds cost-on-hover. Old pattern 7, upgraded. Ours:
   `23m · 3/4 checks · €0.84 of €2.00` in one muted line.
6. **The card is the run config's projection.** Best: Automaker (the
   Edit-Feature dialog holds spec, model, planning depth, isolation and
   dependencies; the face shows the projection). Old pattern 15, verified
   live. Ours: model alias, plan key and blocked-by count sit on the face;
   the full spec lives in the forms we already have.
7. **Buttons are the state machine.** Best: Automaker (each state offers
   exactly its legal transitions: Make, Approve Plan, Force Stop, Refine,
   Restart); our current move buttons already lean this way. Ours: no
   generic card menu; the actions a card offers are its legal transitions,
   nothing else.
8. **Approvals as first-class cards, and a reject always asks for a
   redirect.** Best: Automaker (the plan-reject box: empty cancels, text
   regenerates); GitHub's "Approve and run workflows" single explicit gate;
   our own cap cards already carry budget context. Ours: every deny carries
   an optional "what would make it yes"; empty means cancel, never failure.
9. **One event schema before any UI sees anything.** Best: Vibe Kanban's
   `NormalizedEntry`, now field-verified (`entry_type × content × status`,
   `action_type` covering file/command/search/plan/todo/task/question,
   `pending_approval` as an event status). Old pattern 2. Ours: adopt it as
   the `Event` type the pi adapter and opencode mapping target; the card
   badge and the live page both read it.
10. **Done is an archive with evidence, never a trash can.** Best: Factory's
    milestone cards (summary, checklist, commit hashes, assertion verdicts -
    a done card shows its proof); cline/kanban's Done-as-trash is the exact
    refusal. Ours: a merged card keeps checks-green, commit, spend and the
    agent's summary; Done compacts on age instead of collecting.
11. **The hover-peek transcript.** Best: Nimbalyst (dwell on a card: a
    streaming last-100 tail in a popover, no click, live while running; the
    workstream peek resolves to the most active child). Sebastian's "even
    the expanded view might show just the last few messages" - this is the
    sharper version. Ours: hover or Space peeks; the full conversation stays
    one click deep (ruling A).
12. **Parent cards summarize children.** Best: Nimbalyst (child count,
    segmented child-state bar, "N waiting" badge, phase from the most active
    child). Ours: a plan's card shows its children as counts by state, not
    as full child cards inline; waiting-on-deps stays one line.
13. **A derived "needs you" surface as the board's first screen.** Best:
    GitHub Agent HQ's new default dashboard (sessions / my issues / my PRs
    as capped sections with quick actions - "what is running, what needs me,
    what changed" in one sentence). Old pattern 14. Ours: the human lane's
    approvals, escalations and answers become one ranked list with one-key
    clears; the inbox is computed, never a column to manage.
14. **Keyboard-first, with single-letter views.** Best: Automaker (1-9/0
    jump straight into any running agent's output; a visible keyboard
    overlay); Linear's whole culture. Old pattern 16. Ours: number keys for
    running tasks, one key for the top decision, `?` for the map.
15. **Columns as a machine contract.** Best: Hermes (every transition has
    exactly one owner - worker, control plane or human; a run that ends
    without its terminal board call is a failure; retry attempts carry a
    structured handoff). Ours: each column transition has one owner in
    policy; the worker closes its own card or the card fails.
16. **A security canary on the agent-facing board API.** Best: Wekan
    (auto-blocks API clients that behave oddly; unblocking is a deliberate
    act - it blocked this round's own probe account twice). Ours: the
    gateway's board API rate-shape blocks with a deliberate unblock, because
    our API's callers are agents.
17. **Human comments as first-class card content.** Best: Trello (the card
    back is an activity feed where comments and system events interleave,
    typed distinctly); GitHub (issue comments with attribution). Sebastian's
    own wish. Ours: comments by humans ride the card, attributed, marked on
    the face when unread; the agent's next session reads them (the answer
    path already exists).

## 2. Exclusive alternatives (rulings 243 to 248)

Six forks the field answers in mutually exclusive ways. Each carries the
tradeoff and this report's recommendation; Sebastian rules.

**A. Chat on the card vs behind a click (ruling 243).** Vibe Kanban and
Conductor make the conversation the product; Automaker hides it entirely;
Nimbalyst splits it - summary on the card, streaming tail on hover, full
transcript on click. Conductor's users love the stream, and our own
artifacts-not-chat principle still holds: the requester reads a card and an
issue. *Recommendation: behind a click, with the hover-peek tail (steal 11)
and the last few messages on the expanded card - Nimbalyst's split, which is
also Sebastian's instinct.*

**B. Server-rendered htmx vs SPA (ruling 244).** Linear, Plane and every
AI-native board are SPAs; the cost shows (Plane's live service exists but is
unwired to the board - 24 s without refresh, their users' top complaint;
Vibe gated its board behind a dead login server). Our console renders on
the server with htmx today, and the field's best live mechanism (Vibe's
JSON-patch-over-one-log) maps onto htmx SSE with no framework. Old item 31
names this fork. *Recommendation: stay server-rendered htmx; SSE carries
the live badge and the task page. Revisit only if a second client (the
phone) forces it.*

**C. Free lanes vs system lanes (ruling 245).** Trello and Wekan let anyone
mint columns; Plane makes state a user-made entity; Hermes, cline/kanban
and Automaker own their columns as a contract (one role per transition; a
free lane promises nothing to a scheduler). Our columns are already
policy-composed processes per project. *Recommendation: system lanes only -
lanes come from the project's process definition in git, as today; a
human-made free column is the first step of the Trello sprawl and breaks
the machine contract.*

**D. Drag vs buttons when agents mutate state under you (ruling 246).**
Plane and Trello make drag the primary mutation (drag-to-delete included);
Automaker's drag writes status directly and can move a card past
verification - the cautionary tale; cline/kanban rule-gates drags (humans
may only drag toward work or trash) and runs agent moves through the same
engine; Conductor refuses drag entirely because status derives from git
truth; Hermes locks machine-owned states and puts human drags through the
same CAS layer. Our poll redraws the board every few seconds - a drag
target can vanish mid-gesture. *Recommendation: buttons for v1 (they are
the state machine, steal 7); keep the existing backlog-to-lane drag only
where policy already allows it, as a form submit, and never a drag that
asserts a machine-owned state.*

**E. Human-set colours vs system-only semantics (ruling 247).** Trello's
split is the field's answer: system colours (states) and user colours
(labels, backgrounds) never borrow from each other; Plane lets users recolour
states themselves (which agents then cannot trust); cline/kanban and
Factory use system colours only. Sebastian wants human colours to aggregate
cards by his own logic on top of system semantics. *Recommendation: two
channels that never mix - system states own their fixed palette; humans get
a small fixed palette (eight) as card accents/labels they may set and
filter by; the human palette is metadata, never state.*

**F. Timeline replay vs live-only (ruling 248).** Every live board shows
now; only event-sourced ones (Hermes's append-only `task_events`, Vibe's
one-log design, our own `timeline.jsonl` per task) can replay a card's
life. Conductor's per-turn metadata chips show what replay buys:
duration, files, diffstat on every past turn. Our dummy can already replay
from the S3 timelines. *Recommendation: both, from one log - the timeline
stays the source (as today), replay is the default view of a card's detail,
and live (SSE) is an addition on top later, not a replacement.*

## 3. What people expect after Trello and Linear

The table stakes, ranked by how their absence reads to a new user. The
field's own scores back the ranking (the twelve reports, five axes; 5 is
best):

| Product | Scannability | State clarity | Decisions | Agent legibility | Quiet |
|---|---|---|---|---|---|
| Trello | 5 | 2 | 2 | 1 | 4 |
| Linear | 5 | 4 | 4 | 4 | 5 |
| Plane | 4 | 4 | 3 | 1 | 3 |
| Wekan | 4 | 3 | 3 | 2 | 4 |
| cline/kanban | 4 | 3 | 4 | 4 | 4 |
| Vibe Kanban | 4 | 4 | 4 | 5 | 4 |
| Nimbalyst | 4 | 3 | 3 | 5 | 4 |
| Automaker | 4 | 4 | 5 | 3 | 3 |
| Hermes Kanban | 4 | 5 | 3 | 4 | 4 |
| GitHub Agent HQ | 3 | 4 | 4 | 5 | 4 |
| Factory | 4 | 5 | 3 | 4 | 4 |
| Conductor | 4 | 3 | 4 | 3 | 4 |

Expected on day one (its absence reads as broken):

- Both themes, dark and light, switchable, remembered (Trello took a decade
  and its users never forgave it; Wekan still ships a fake dark mode).
- A card face that scans: title, one status, no prose, nothing empty
  (five products score 4+ here by keeping faces sparse).
- A card detail one click deep that carries everything else, with an
  activity feed where comments and events are visually distinct.
- Live updates on the board itself. Plane's 24 s dead board is the field's
  cautionary number; Agent HQ and Linear set the expectation that state
  changes arrive without a reload.
- An inbox-like "needs you" surface - after Linear's Inbox and Agent HQ's
  dashboard, a board without one reads as work-in-hiding.
- Keyboard operation and a `?` cheat sheet (Linear, Automaker).
- Shareable card links that render (Trello's logged-out card pages are the
  proof at scale; our timeline pages already do this).
- Undo-shaped feedback: every action answers with a toast/line that says
  what it did (our note banner today, kept).

Expected soon after (deferrable past v1, named in the roadmap): saved
per-user filters (Wekan), swimlane/group-by reshaping (Plane's seven ways),
mobile approval (Nimbalyst's phone path, our roadmap's approval-on-phone),
session search over history (Agent HQ), a status matrix second view
(Conductor experimental, our pattern 12).

## 4. What to leave out

The Trello lesson applied: Trello got big beside Jira by becoming a
platform - every missing feature became a Power-Up install, the board
stopped being one artifact, and users blamed the board for the platform's
performance. Our board is one artifact of one factory. Named refusals:

- **No plugin, Power-Up or marketplace surface.** A feature is in the card
  or it does not ship.
- **No per-tool-call permission prompts as the product's approval model**
  (Conductor's "permanently allow" with no policy behind it). Our approvals
  are gates with records and caps; policy stays outside the model.
- **No wallet, credits or prepaid-balance UI** (Linear's 12-month-expiry
  credits). Our budgets are euro caps enforced at call time.
- **No advisory limits** ("limits are approximate, may overshoot" - Linear).
  Ours are hard at the gateway, and the card shows real numbers.
- **No drag that asserts machine-owned state** (Automaker's
  drag-to-Verified). Human gestures request; the system disposes (ruling
  246).
- **No chat-as-the-product** (Vibe Kanban's magnificent timeline is still
  the wrong primary surface; Conductor's stream home screen likewise). The
  conversation is one click behind the card.
- **No Done-as-trash** (cline/kanban). Done is an archive with evidence and
  compaction.
- **No soft gates** (Conductor's merge that is only "discouraged" by open
  todos). A gate either blocks or does not exist.
- **No board config maze** (Wekan's ninety booleans). Opinionated defaults;
  the per-board field matrix is a maybe-later, never the first-run surface.
- **No AI busywork features** (Trello's seven setup conveniences). If our
  board shows AI at all, it summarizes run state, on the card face.
- **No cloud-gated anything** (Vibe Kanban's board died behind a login
  server that no longer exists). Every feature works from our own
  components; nothing phones a vendor to render.
- **No second layout family** (Plane's gantt/calendar/spreadsheet). We are
  a board with a timeline detail; the matrix view is a roadmap item, not a
  v1 surface.
- **No human-minted states or columns** (ruling 245), **no user-recycled
  system colours** (ruling 247), **no ambient notification layer** beyond
  done, question and approval (item 24's rule stands; Conductor's
  sounds-and-colours ambient layer is the counter-example we refuse).
- **Not this round:** the recorder tool (Sebastian's idea - it belongs to
  the board roadmap), the Forgejo project mirror (waits on the upstream
  API), and "I am going in" (roadmap item 25).
