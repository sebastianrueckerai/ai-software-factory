# The board roadmap

Everything board-shaped that v1 does not build (see
[proposal-v1.md](proposal-v1.md)). One line each, with the motivating
evidence. The main roadmap's UX items (22 to 31) live here now; their old
numbers are kept.

- **Live badge and live task page over SSE** (old 22, 20): the agent's
  events stream onto the card badge and one task page; Vibe Kanban's
  JSON-patch-over-one-log design maps onto htmx SSE, and its dead-board
  rivals (Plane's measured 24 s) are the warning ([vibe-kanban],
  [plane]). Includes Linear's 10 s-ack / 30 min-stale clock as the
  supervisor's stall defaults ([linear]).
- **Steering box with an editable message queue** (old 23): a box always
  present on the task page, queued messages editable until they land -
  Conductor's queue is the precedent ([conductor]).
- **Inline diff comments back to the agent** (old 23): click lines,
  comments collect, send once as `file:line | quote | comment`;
  Conductor's composer and cline/kanban's diff panel ([conductor],
  [cline-kanban]).
- **Stop button on the card** (old 26): closes the issue, the one way to
  stop a task; today's close-then-heal becomes one click.
- **Approval scopes** (old 27): once, per task, or per class of future
  request, bounded by policy - Atlassian Rovo and the AWS sample show the
  shape.
- **Approvals on the phone** (old 29): a push channel plus a small
  approval page; Nimbalyst's iOS path and Happy's push approvals are the
  field's proof ([nimbalyst]).
- **The recorder tool** (Sebastian's idea, this round): a small factory
  tool that captures cards and their contents over time - a card's life as
  an artifact, feeding demos and post-mortems.
- **Progress where the requester is** (old 24): one issue comment edited
  in place plus push only for done, question, approval - Symphony's
  workpad shape, already ruled (suppressed while the console is open).
- **"I am going in"** (old 25): VS Code in the browser on the task's
  workspace, agent paused; Devin and OpenHands are the precedents.
- **Status matrix as the second view** (old 12): a grid of all running
  agents; Factory declined it, Conductor shipped it experimental
  ([factory-mission-control], [conductor]).
- **Saved per-user filter sets** (Wekan): named filters as the cheapest
  "where are my decisions" assistant ([wekan]).
- **Session search over history** (Agent HQ): natural-language search over
  the session log store - cheap on our timeline logs, high value
  ([github-agent-hq]).
- **Context gauge on the session header** (Vibe Kanban):
  `total_tokens / context_window` as the earliest stuck-agent warning
  ([vibe-kanban]).
- **Card merge for repeat signals** (Trello): one action that blends two
  cards and archives the originals - the repeat-alert rule's shape
  ([trello]).
- **Security canary on the board API** (Wekan): block odd API clients,
  make unblocking deliberate - our API's callers are agents ([wekan]).
- **Per-board field matrix** (Wekan): per-field "on face" visibility, a
  maybe-later density dial once the fixed anatomy settles ([wekan]).
- **Group-by and swimlanes** (Plane): reshaping by project, lane, state;
  only after the fixed anatomy proves itself ([plane]).
- **Full keyboard map** (Automaker): number keys into running agents,
  single-letter views, the overlay - one key for the top decision ships in
  v1, the map comes later ([automaker]).
- **Mobile web pass**: the board usable one-handed; table stakes after
  Trello and Linear, deferrable past v1.
- **Forgejo project mirror** (old 30): board columns mirrored onto a
  Forgejo project, waiting on the upstream projects API.

[vibe-kanban]: reports/vibe-kanban.md
[plane]: reports/plane.md
[linear]: reports/linear.md
[conductor]: reports/conductor.md
[cline-kanban]: reports/cline-kanban.md
[nimbalyst]: reports/nimbalyst.md
[factory-mission-control]: reports/factory-mission-control.md
[wekan]: reports/wekan.md
[github-agent-hq]: reports/github-agent-hq.md
[trello]: reports/trello.md
[automaker]: reports/automaker.md
