# Code sweep: what is built and showable

Read-only sweep, 2026-10-21. Code at `/home/womb/repos/ai-software-factory-code` (HEAD 2026-10-21 09:41 UTC). Infra at `/home/womb/repos/ai-software-factory-infra`. No tests were run. Anything about the live cluster is not verified here.

Paths below are relative to the code repository unless they start with `infra:`.

## 1. Built features worth showing

Scores: H hiring value, I investor value, S showable in under 8 s. Each 1 to 5.

| # | Feature (what a viewer understands) | Where | How it shows | H | I | S |
|---|---|---|---|---|---|---|
| 1 | The chat replaces card writing: the project agent has 64 tools, one per console action, and every write shows as a proposal with "Do it" and a 30 minute undo | `internal/console/chat_tools.go`, `internal/policy/policy.go` (ChatTools) | Console chat panel, a card appearing on the board after one sentence | 5 | 5 | 5 |
| 2 | Autonomy dial: manual, assisted, autonomous, full auto. Each level removes named confirms from the chat | `internal/policy/policy.go` (ConfirmFor, AutonomyMeaning) | Console level control, a diagram of the four states | 5 | 5 | 4 |
| 3 | Policy is code outside the model: risk classes by path (forbidden, migration, high, normal) decide what auto-merges | `internal/policy/risk.go`, `infra:factory/policy.yaml` | Diagram, or a card stopped at the policy gate | 5 | 4 | 3 |
| 4 | Process is data: 9 stage kinds in Go, a floor no YAML can lower (checks, policy, approval, merge) | `internal/policy/process.go` (validateStages), `infra:factory/processes/*.yaml` | Diagram of the stage row with the floor marked | 5 | 4 | 4 |
| 5 | Spec to criteria to cards to one gate: criteria carry id, kind and a named test, a Go gate runs every named test on the assembled feature | `internal/factoryd/criteria.go`, `internal/factoryd/plan.go` | Diagram, plan card in the drawer | 5 | 4 | 3 |
| 6 | Hold-out tests: written by a separate session, stored outside every workspace, dry-run red on main, graded blind once | `internal/factoryd/holdout.go` (1,011 lines) | Diagram | 5 | 3 | 2 |
| 7 | Spend control: the gateway holds the worst case of every model call before it runs, refuses at task, day, month and project caps, and books the real cost after | `internal/policy/holds.go`, `internal/gateway/server.go` | Console costs page, a refusal line (`refused_budget`) | 5 | 5 | 4 |
| 8 | Sandbox you can verify: gVisor pod, no service account token, default-deny egress to four named hosts plus gateway and Forgejo, metadata address denied, egress probed before the agent starts | `internal/factoryd/runner.go` (sandboxPodSpec, workerEgressSpec) | Diagram of the pod with the allowed arrows | 5 | 5 | 4 |
| 9 | The agent never holds a push credential: the worker asks, factoryd mints a one-shot write token on the fork, the worker pushes, the token is revoked at completion | `cmd/agent-worker/main.go`, `internal/factoryd/message.go`, `internal/factoryd/completion.go` | Diagram | 5 | 4 | 3 |
| 10 | Session supervisor: 12 detector trips (no write, repetition, same failure, same call, flip-flop, churn, wall clock, spend with no push) answered in code first, then by a supervisor model | `internal/factoryd/supervise.go`, `internal/factoryd/supervisor.go` | Drawer session view, transcript | 5 | 3 | 3 |
| 11 | Model ladder: cheap model first, stronger model after 3 returns from the same stage, human after the session cap | `internal/factoryd/workflow.go`, `infra:factory/policy.yaml` (stronger_after) | Drawer timeline | 4 | 4 | 3 |
| 12 | Feedback loop: SigNoz alert becomes a bug card, a human or the agent judges it real or noise | `internal/factoryd/signozwebhook.go`, `internal/factoryd/alerts.go`, `k8s/alerts/*.json` | Console alerts page, board | 4 | 5 | 4 |
| 13 | Routines: recurring cards by cron, by every n merges, or by event, as Temporal schedules; the chat can write, run and skip them | `internal/factoryd/routines.go`, `internal/policy/routine.go`, `internal/console/routine_tools.go` | Board with routine cards, routine drawer | 4 | 4 | 4 |
| 14 | Merge chain: a red main files a repair card, a stalled head re-runs once then asks a person, a merged card ends only when a green run covers it | `internal/factoryd/chainpoll.go`, `internal/factoryd/mainfix.go` | Board, diagram | 5 | 3 | 2 |
| 15 | Reproduction gate: a bug fix must fail at the base and pass at the head | `internal/factoryd/workflow_stages.go` (reproduction), `internal/policy/process.go` | Diagram, card timeline | 5 | 3 | 3 |
| 16 | Cheat detection: tests deleted or weakened are a finding returned to the agent | `internal/factoryd/cheat.go` | Transcript | 4 | 3 | 2 |
| 17 | Review and audit by a second, stronger model on the diff, with a check-in model that confirms, drops or remarks on each finding against evidence | `internal/factoryd/checkin.go` (722 lines), `internal/factoryd/gates.go` | Drawer, review tab | 5 | 3 | 3 |
| 18 | Cloud on demand with a ceiling: the agent commissions Hetzner servers within an envelope, gets a 30 minute SSH certificate from OpenBao, a collector deletes expired leases | `internal/gateway/cloud.go`, `internal/cloudres`, `internal/hcloud`, `internal/openbao` | Console resources page | 4 | 4 | 3 |
| 19 | Untrusted text is scrubbed both ways: issue text sanitised into briefs, agent text defanged on its way out, secrets redacted from audit rows | `internal/sanitize`, `internal/redact` | Transcript, diagram | 4 | 3 | 2 |
| 20 | Screening stage: an outsider's issue is screened for injection before any session runs | `internal/factoryd/workflow_stages.go` (ScreenSuspect), `policy.WhenOutsider` | Card in the human lane | 4 | 3 | 3 |
| 21 | Reproducible images: a lint test fails the build on any unpinned apt source, image or download | `internal/reproducible`, `upstream-images.txt`, `upstream-files.txt` | Not showable on its own | 4 | 4 | 1 |
| 22 | Self-update loop: factoryd bumps its own image digest, Flux applies it, the roll is timed from push to live | `internal/factoryd/roll.go`, `internal/factoryd/rolltask.go` | Diagram | 4 | 3 | 2 |
| 23 | Telegram and Discord notifications and replies, wired to the same chat | `internal/factoryd/telegram.go`, `internal/factoryd/discord.go`, `internal/console/messengers.go` | Phone screen recording | 3 | 4 | 4 |
| 24 | Board with live events (SSE), card drawer, per-column order and filter menus, all drivable by the chat (`board_view`) | `internal/console/board.go`, `internal/console/templates/board.html`, `internal/console/events.go` | Console | 3 | 4 | 5 |
| 25 | Pulse and metrics page per project (CI, rolls, costs, merge times) | `internal/console/metrics.go`, `internal/factoryd/metrics.go` | Console metrics | 3 | 4 | 4 |
| 26 | Every commit carries `Factory-Role`, `Factory-Task`, `Factory-Session`, `Requested-by`, `Approved-by` | `internal/factoryd` (Attribution), README "agent-worker" | Git log excerpt | 4 | 4 | 3 |
| 27 | Project registration: one command makes the repo, namespace, quota, network policy, tokens and Flux wiring; removal is the inverse | `internal/factoryd/register.go`, `internal/factoryd/remove.go`, `k8s/remove-project.yaml` | Terminal | 4 | 3 | 2 |
| 28 | Model gateway: agents see aliases (`big`, `small`, `vision`), LiteLLM routes to Z.ai or Alibaba, the policy decides which alias each class may use | `cmd/factory-gateway`, `infra:k8s/platform/litellm/helmrelease.yaml` | Diagram | 5 | 4 | 3 |
| 29 | Chat context discipline: thread compaction at 80 percent of the window, scratchpad shared by threads, wake timers, card watches | `internal/console/compact.go`, `internal/console/wake.go`, `internal/console/watches.go` | Chat | 4 | 3 | 2 |
| 30 | Workflows survive restarts: one Temporal workflow per task, work pushed on shutdown, heal pass every minute re-reads Forgejo | `internal/factoryd/temporal.go` (HealPass) | Diagram | 4 | 3 | 2 |

## 2. The chat's tool list (64 tools)

Source: `policy.ChatTools` in `internal/policy/policy.go` line 126 and `tools` in `internal/console/chat_tools.go` line 1017. Two more entries in `tools` are internal undo inverses (`unmove_card`, `delete_comment`) and are never offered. `steer`, `github_export`, `github_sync` and the routine tools are offered only where factoryd wires them. A tool is offered only if the member holds the role the dispatch needs. 39 entries are marked `write: true`. A write tool listed in the member's `confirm` set becomes a proposal the member presses "Do it" on.

Reads (never behind a confirm; each shows what the page shows):
- `system`: the manual, states, gates, autonomy, process, limits.
- `board`: columns, human lane, escalations, approval requests.
- `card`: one card in full, model calls included.
- `history`: project events, newest first.
- `card_history`: one card's events.
- `costs`: spend this month against the cap, or the ledger by day, card or tier.
- `diff`: a card's pull request diff, first 20 KB.
- `plan`: newest plan revision, sha256, questions, cards.
- `pr`: pull request checks, reviews, audit, files.
- `file`: a repository file at a ref, first 64 KB.
- `session`: one session's outcome, supervisor trips, calls, files.
- `session_steps`: steps, one line each.
- `session_step`: steps in full.
- `session_search`: search a card's sessions, 20 hits.
- `ci`: CI result of main, branch or commit.
- `alerts`: factory alerts.
- `resources`: commissioned cloud resources.
- `settings`: every project's settings.
- `policy`: limits, budgets, risk classes, approvers.
- `routines`: schedules, next and last run.
- `read_doc`: a document in the document repository.
- `notes_read`: the shared scratchpad.
- `active_threads`: every member's active threads.
- `chat_search`: search all threads, 20 hits.
- `read_attachment`: a document a member sent.

Writes:
- `new_card`: file a card.
- `move_card`: move a backlog card into a starting lane.
- `answer`: answer a card's question, or all open questions of a plan.
- `comment`: comment on a card's issue.
- `tell_card`: one text, routed by state to session, merge request or question.
- `steer`: message a running session.
- `retry`: file a failed plan card again.
- `start_plan`: move an accepted plan's cards to ready.
- `accept_plan`: accept a plan revision, factoryd files the cards.
- `request_changes`: ask the planner for changes.
- `reject_plan`: reject a plan with a reason.
- `approve_merge`: approve a pending merge.
- `deny_merge`: deny a merge or close the pull request.
- `rerun_checks`: re-run red checks.
- `set_summary`: set the card's one-line summary.
- `set_accent`: set a colour label.
- `invite`: make a Forgejo user a writer.
- `github_export`: export the repository to GitHub.
- `github_sync`: bring GitHub's moved default branch back as a pull request.
- `close`: close a card's issue.
- `edit`: edit a card's title or description.
- `grant_session`: one more session for a card at its cap.
- `fund`: raise a card's budget from the pool or the member's money.
- `set_dependency`: make an unstarted card wait for another.
- `split_card`: have a planner split a large pull request into 2 or 3 cards.
- `write_doc`: commit an edit to the document repository.
- `set_autonomy`: set the level and backlog cap through a pull request on the project file.
- `routine_write`, `routine_delete`: change routines through a pull request on the project file.
- `routine_run`, `routine_skip`: run now, skip the next run.
- `alert_verdict`: judge an alert real or noise.
- `promote_resource`, `release_resource`: make a lease standing, or end it.
- `notes_write`: append to or edit the scratchpad.
- `escalate`: ask the members for a decision with why, info, recommendation and 2 or more choices.
- `ask`: ask this conversation's member, answered by a press or the next message.
- `attach_analysis`: record findings inside a card's open ask.
- `board_view`, `board_view_reset`: drive the board's menus, find, routines filter, open card, tab, theme.
- `watch_card`, `unwatch_card`: a card's moves wake the thread.
- `set_timer`: one-shot timer that wakes the thread.
- `analyze_image`: vision model answer about an image.
- `summarize_attachment`: one model call over a sent document.

The sandbox agent has a different tool set (MCP at the gateway `/mcp`, listed per class in `infra:factory/policy.yaml`): `web_scrape`, `web_search`, `replicate_predict`, `fal_run`, `escalate_to_human`, `request_info`, `manual`, `delegate`, `file_verdict`, `cloud_prices`, `commission_server`, `list_resources`, `release_resource`, `ssh_certificate`, `resource_request_status`, `file_plan`. The planner class gets `file_plan`, the analyzer gets reads only.

## 3. Process layer

Stage kinds (`internal/policy/process.go` lines 193 to 207, `StageNames`): 9.
`checks`, `screening`, `reproduction`, `policy`, `migration`, `review`, `audit`, `approval`, `merge`.

Findings rules per stage: `agent` (back to the next session), `human`, `fail`. Predicate: `when: outsider`. `max_returns` caps a stage's returns.

Floor (`validateStages`, process.go line 320 onward):
- `checks`, `policy`, `approval`, `merge` must be listed, enabled and unconditional.
- `checks` on_findings must be `agent` or `fail`. No merge without green checks.
- `policy` on_findings must be `fail`. A forbidden path fails the task.
- `approval`, `merge`, `screening`, `audit` on_findings must be `human`.
- `approval` must come right before `merge`. `merge` must be last. `screening`, if listed, must be first.
- `migration` must come after `policy`. `audit` must sit between `review` and `approval`.
- A stage may be listed once. A project may only tighten (budget: stricter wins, a looser file is rejected).

Shipped process files (`infra:factory/processes/`, copied to `internal/policy/testdata/tree/processes/`):
- `maintenance.yaml`: lanes backlog (analyzer writes up) and ready (coder). Stages: screening (outsider only), checks, policy, migration, reproduction, review, audit, approval, merge. Merge queue: none.
- `spec.yaml`: lanes backlog, plan (planner, 1 to 12 cards, foundation and integration cards), ready (coder). Dependencies wait until done. Stages: screening (outsider only), policy, migration, reproduction, checks, review, audit, approval, merge. Merge queue: project (one pull request at a time).
- Criteria gate is not a process stage. It runs inside the `approval` step on a plan's integration card (`internal/factoryd/criteria.go`). Gate names in the manual: intake, session, checks, policy, migration, reproduction, criteria, review, approval, merge, human, commissioning, screening, audit, provider, dependencies, merge-queue (`internal/manual/meaning.go`).

Card statuses (`internal/manual/meaning.go`): backlog, queued, waiting-deps, running, closing, in-review, merged, waiting-human, waiting-poster, done, failed, closed.

## 4. Escalation and autonomy as the code has them

Autonomy levels (`internal/policy/policy.go` lines 148 to 200, `ConfirmFor`). Default is manual. Full auto is not a level, it is autonomous with `merge_rule: auto`.
- manual: every action confirms. The base list is the policy's `chat.confirm`, plus the always-confirm set and `fund`.
- assisted: these come off the confirm list: `new_card`, `move_card`, `start_plan`, `accept_plan`, `retry`, `grant_session`, `routine_run`. Direction, money beyond a card's budget and merges still ask. Every start and filing still passes the ready check. Backlog cap 8 by default (`DefaultBacklogCap`).
- autonomous: only the always-confirm set remains. Merges follow the merge rule (`human` waits for an approver).
- full auto: also `approve_merge`, `deny_merge`, `alert_verdict` and `write_doc` come off. Only direction and money beyond the pool ask.
- Always confirm at every level: `approve_merge`, `deny_merge`, `invite`, `alert_verdict`, `promote_resource`, `release_resource`, `github_export`, `github_sync`, `write_doc`, `set_autonomy`, `routine_write`, `routine_delete`.
- Pool: `DiscretionaryEUR` in the project file is the monthly money the agent may fund cards from at autonomous and full auto (`FundCard` refuses with `PoolSpentError` or `CardCapError`).
- Chat budget: `chat.monthly_eur` default 5, `parallel_turns` default 3, window default 128,000 tokens.

Escalation ladder, rung by rung:
1. Detector trip in a session (`supervise.go`): answered in code first. Actions: continue, message, redirect, retry_stronger, escalate. Repetition earns a nudge (`nudge_after` 3, `nudges` 1). Three nudges with no new file content end the session (`TripLoop`).
2. Supervisor model call (`supervisor.go`): strict JSON answer, up to `supervisor_calls` 6 per session, then the next trip escalates without a call. A scheduled check-in runs at `check_in` 45m.
3. Gate-return check-in (`checkin.go`): one conversation judges each finding as confirmed, dropped or remark, writes a note for the next session, or stops for a human.
4. Model rung: first session on `small` (GLM-5.3-flash), the next on `big` after `stronger_after` 3 returns from the same stage. A project with `model: stronger` starts on the strong rung.
5. Session cap: `sessions` 3. At the cap a card waits for a human, who may `grant_session`. Wall clock `agent_time` 2h, planner 30m.
6. Gate supervisor (`gatesupervisor.go`): a machine gate past its bound gets one wait and one retry, or a cancel with a diagnosis.
7. Human: `escalate` or `escalate_to_human` makes a "needs you" card with ask, why, info, recommendation and up to `MaxChoices` answers.

Heal pass (`internal/factoryd/temporal.go`, `HealPass`, boot and every minute): prunes old webhook deliveries, re-reads Forgejo issues, comments and pull requests for cards waiting on Forgejo (a lost webhook costs at most a pass), starts a workflow for every open agent task whose workflow died, fails a task whose repository name is invalid, starts the oldest queued card of each lane under the project's work-in-progress bound (default 5), wakes merge-queue heads. It leaves chat tasks and merged cards alone.

Supervisor detectors (`supervise.go`): `no_progress`, `wall_clock`, `repetition`, `loop`, `same_failure`, `same_call`, `flip_flop`, `churn`, `check_in`, `no_write` (policy sets 900 s), `cheap_cap`, `spend_no_push` (60). Also `agent_escalation`, `agent_info_request` and `shutdown`, which are not detectors. That is 13 trip kinds by name in the file, 12 if shutdown is left out.

Caps and holds (`internal/policy/holds.go`, `internal/gateway/server.go`, `internal/factoryd/monthcap.go`):
- Before each model call the gateway clamps the output limit and holds the worst case. The real cost is booked after. Holds that a crashed caller never released expire after 1 hour and are booked at full amount.
- Refusals: `refused_budget` (task), `refused_day_cap`, `refused_month_cap`, `refused_project_cap`, `refused_capability`, `refused_body`, `refused_egress`. Each has an audit row naming the policy version and the issue author.
- Live numbers (`infra:factory/policy.yaml`): task default 5 EUR, task max 15, day 100, month 544, session floor 0.30 EUR cheap and 0.60 EUR frontier.
- At a cap: the session ends, a human-lane card is filed (`SourceMonthCap`) and the card waits (`waiting-poster` for a fund after a cap). The member funds it from the console or by `fund`, or closes it. The month cap raises alerts at 50, 80 and 100 percent.

## 5. Identity and sandbox

- Each attempt gets its own namespace, a service account `task-<id>`, its own pair of Forgejo tokens and its own LiteLLM key (README "cmd/factoryd").
- Read token: `read:repository` on the repository only, minted in `internal/factoryd/activities.go` line 727, held only by the init container that clones.
- Write token: `write:repository` on the bot's fork only, minted in `internal/factoryd/message.go` line 67 when the worker asks, posted once to the worker, revoked at completion (`completion.go` line 161). The agent container never holds it.
- Gateway token: a projected service account token with audience `factory-gateway`, `expirationSeconds: 3600`, mounted read-only. `automountServiceAccountToken` is false. The gateway checks the JWT, the task status and the capability class on every call.
- OpenBao: Kubernetes auth login with a projected token. SSH certificates for commissioned servers last at most 30 minutes (`maxCertTTL` in `internal/gateway/cloud.go`).
- Per-task LiteLLM key, limited to the class's aliases, carries no budget. A new run mints a new key and blocks the old one.
- Pod: runtime class `gvisor`, seccomp RuntimeDefault, uid 1000, non-root, all capabilities dropped, read-only root filesystem, emptyDir workspace 4 Gi, home 1 Gi, tmp 4 Gi (`sandboxPodSpec`).
- Network (`workerEgressSpec`, Cilium): default-deny egress. Allowed: the model gateway port, in-cluster Forgejo, `proxy.golang.org`, `sum.golang.org`, `storage.googleapis.com`, `registry.npmjs.org` on 443, kube-dns for those names only, SigNoz collector on 4318 when set. `169.254.169.254/32` is denied outright. Ingress: only factoryd on the message port 8091.
- Known leak, stated in README: the Go module proxy can carry a few hundred bytes per request out (ruling 99 accepts it).
- Before the agent starts, the worker probes egress (gateway answers, canary host, metadata address and direct IP take no connection, DNS lookup of the canary fails). A more open sandbox ends the start with an escalation.
- Gateway egress guard (`internal/gateway/egress.go`): resolves once, refuses non-public addresses, dials the checked address, so DNS rebinding cannot change the target.
- The worker does what the agent cannot: pid 1, holds the push, runs `opencode serve` in its own process group, reaps every process when done, fetches the agent's commits into a clean repository and writes one commit with trailers, serves factoryd's message and push endpoints with a per-session bearer (the pod holds only its hash in `MESSAGE_TOKEN_SHA256`).
- Gateway body rules: only OpenAI chat fields, function tools and text content. Built-in provider tools, images, audio and files are refused. `X-Factory-*` headers are read only behind the factoryd token.

## 6. Numbers (counted 2026-10-21)

| Number | Value | Source |
|---|---|---|
| Lines of Go, all | 233,425 | `find . -name '*.go' \| xargs cat \| wc -l` in the code repository |
| Lines of Go, non-test | 94,277 | same, excluding `_test.go` |
| Lines of Go, test | 139,148 | same, `_test.go` only |
| Go files | 487 (208 non-test, 279 test) | find |
| Test functions | 2,940 | grep `^func Test` |
| Directories holding Go | 24 (18 under `internal/`, 3 under `cmd/`, plus `acceptance`, `check`, root) | find |
| Binaries | 3: `factoryd`, `factory-gateway`, `agent-worker` | `cmd/` |
| Stage kinds | 9 | `StageNames` |
| Shipped processes | 2 | `infra:factory/processes/` |
| Chat tools | 64 offered, 39 writes | `policy.ChatTools` |
| Sandbox agent tools | 16 | `infra:factory/policy.yaml`, `policy.go` constants |
| Autonomy states | 4 | `AutonomyStates` |
| Risk classes | 4 (forbidden, migration, high, normal) | `infra:factory/policy.yaml` |
| Supervisor trip kinds | 13 | `supervise.go` |
| Commits | code 2,406, infra 479, design 582, total 3,467 | `git log --oneline \| wc -l` |
| First commit in code repository | 2026-09-24 | `git log --reverse` |
| Cluster | 3 control-plane nodes, Talos 1.14.1, kubelet v1.37.0 | `infra:main.tf`, `infra:talos/controlplane-*.yaml` |
| Console routes | 28 GET, about 60 POST | `internal/console/console.go` |
| Console templates | 17 | `internal/console/templates/` |
| Largest files | `internal/factoryd/workflow.go` (over 2,000 lines), `internal/console/chat_tools.go` 1,766 | wc |

The pitch states "about 128,000 lines in 293 files, 160 test files". The tree now holds 233,425 lines in 487 files with 279 test files. The pitch figure is stale. Use the new counts and say "as of 21 October".

## 7. Claims the code does not back, or only partly

1. **"Source code stays inside the perimeter" and "self-hosted inside their perimeter" (pitch, problem and B3).** The model gateway routes to hosted APIs: `zai/glm-5.3`, `zai/glm-5.3-flash` at `api.z.ai`, and `dashscope/qwen3.8-max`, `qwen3.8-flash`, `qwen3-vl-plus` at `dashscope-intl.aliyuncs.com` (`infra:k8s/platform/litellm/helmrelease.yaml`). Diffs, briefs and repository excerpts go to those providers on every session, review and audit. The control plane, sandboxes and git are self-hosted. The models are not. A regulated buyer would catch this in the first review. The gateway is a swap point (an on-premises model behind LiteLLM would work), but no self-hosted model is configured. Firecrawl, Replicate and Fal are also external tool providers, keyed in `gateway-tool-keys`.
2. **"Wipe and re-seed from scratch" with "one command".** No single command exists. The path is `infra:docs/reseed-runbook.md` (320 lines, 8 sections) and `infra:README.md` section "Rebuild" (from line 758). It needs a seed bundle held outside Git (`.env.tools`, `.env.seed`, `talos/secrets.yaml`), manual DDNS updates, and restores from S3 backups (CNPG generation pair, Forgejo dump, OpenBao raft snapshot, edge TLS secrets). Without those backups the state is not restored. It is a documented, rehearsed sequence, not a button. The README says each step was run at least twice and the runbook was verified on 2026-10-13. Not re-run in this sweep.
3. **"Sealed secrets" (task wording) and "secrets as code".** Cluster secrets are imperative and kept out of the Flux tree (`infra:scripts/seed-secrets.sh`, README secrets list). There is no Sealed Secrets or SOPS in the infra repository. `internal/sealed` is app-level AES-256-GCM for OAuth and mirror tokens stored in Postgres. The re-seed therefore depends on the seed bundle, not on encrypted manifests in Git.
4. **`layers.md` section 4: "Nothing schedules cards periodically. A checkpoint card has no clock."** Out of date. Routines are built: cron, every-n-merges and event triggers as Temporal schedules (`internal/factoryd/routines.go`, `internal/policy/routine.go`), with `Skill` and `pass` fields, and the chat can write, run and skip them. The design doc undersells this. A shipped routine `template-pass` runs hourly in `infra:factory/policy.yaml`.
5. **`layers.md`: "UI screenshots before and after" as a new stage kind.** Not built. The nine stage kinds hold no screenshot stage and `Dockerfile.sandbox` carries no browser. The doc lists it as a candidate, so it is not a false claim, but do not show it.
6. **`layers.md`: the default prompt pack (debugging guide, audit pair).** Only the `ts-go` template with `AGENTS.md` ships (`infra:factory/templates/ts-go`). No debugging guide or audit pair was found in the config tree. `docs/spec-driven.md` and the pitch do not claim it.
7. **`layers.md` and the pitch: "a project may only tighten", "risk classes global".** Consistent with the code for budget (stricter wins, looser rejected). Risk classes are global in `policy.yaml` and `ProjectConfig` has no risk block, as the doc says.
8. **`spec-driven.md`: "All of it is built."** The pieces exist in code: criteria with `replaces` ids (`plan.go` line 121), the self-attack catch (`CatchSelfAttack`), the stale-plan refusal (`ErrStalePlan`), the criteria gate, hold-outs with dry run on main. The gate only runs `test` and `invariant` kinds. `judgement` and `human` criteria are settled by the review and the approver, as the doc says. Whether hold-outs have caught anything in live use is not shown by the code. Not verified: the claim that it ran end to end on a real feature.
9. **Pitch: "Telegram and Discord wired in and tested with live messages".** Code and tests exist (`telegram.go`, `discord.go`, `messengers.go`). A live message is not provable from the code. Mark as unverified.
10. **Pitch: "full audit trail".** Backed for model and tool calls (gateway audit rows with policy version and issue author) and for task events (`events` table). Backed for commits (trailers). No tamper-evidence or external log sink was found, so "audit" is a database table, not a signed log.
11. **Pitch: "sandboxing you can verify instead of trusting a vendor's claim".** Backed in part: the egress probe runs at every session start and the policy is in the repository. One accepted gap is the Go module proxy as a covert channel (README, ruling 99). State it if the film says "no exfiltration".
12. **Pitch: "Over 1,500 commits across three repositories in three weeks".** Counted 3,467 commits since 2026-09-24, about four weeks. The claim is low, not high.
13. **Design repo CLAUDE.md: the "morning page".** The task brief named a morning page. A grep for "morning" across `internal/` finds nothing. The status line, pulse, board, chat and drawer exist. A morning page does not.
14. **Per-class harness choice (roadmap 28).** Not built. `internal/harness` has one adapter, opencode (2 files).

## 8. Re-seed proof, infra repository

Files, in the order a rebuild uses them:
1. `infra:docs/reseed-runbook.md`: the command lines of one re-seed, 8 sections: substrate, CNI, storage and certs and Postgres, Forgejo and dump restore, fast-forward pushes, runner-init and flux bootstrap and coredns, OpenBao snapshot, hand tokens and merge protections and CronJobs. Written during the 2026-10-13 re-seed.
2. `infra:README.md`, section "Rebuild" (line 758 onward): the reasoning, the traps and the pre-destroy checklist (CNPG backup, WAL switch, OpenBao raft snapshot, Forgejo dump).
3. `infra:main.tf`, `infra:variables.tf`, `infra:versions.tf`, `infra:outputs.tf`: OpenTofu for one network, one firewall, 3 primary IPs, 3 Hetzner servers booted from a Talos snapshot selected by label (`os=talos,version=1.14.1,arch=amd64,schematic=d9ff89777e246792`). The user data is `talos/controlplane-<n>.yaml`.
4. `infra:talos/`: `build-snapshot.sh`, `schematic.yaml` (gVisor extension), `patches.yaml`, `node-0.yaml` to `node-2.yaml`, `README.md` with the `talosctl gen config` recipe. `secrets.yaml` and the generated configs are gitignored.
5. `infra:clusters/sf/` (`flux-system`, `platform.yaml`, `factory.yaml`, `notifications.yaml`): Flux sync path. Flux v2.9.5 bootstrapped against the Forgejo repository.
6. `infra:k8s/platform/`: cert-manager, CNPG, Forgejo, gVisor runtime class, LiteLLM, OpenBao, SigNoz, Temporal, build cache, cluster facts.
7. `infra:scripts/seed-secrets.sh` (481 lines): creates every missing secret from `.env.tools` and `.env.seed` without printing a value, leaves existing ones alone. `infra:scripts/openbao-config-bootstrap.sh`: OpenBao policies, roles, SSH CA. `infra:scripts/setup-factory-merge.sh`: merge protections.
8. `infra:factory/`: the configuration tree (policy, processes, projects, routines, templates, schemas) that factoryd reads from Git, so the factory's behaviour also rebuilds from the repository.

Sequence in short: `tofu apply -target=hcloud_primary_ip.node`, DDNS, `talosctl gen config`, `tofu apply`, `talosctl bootstrap`, Cilium, local-path and cert-manager and restored edge TLS secrets, CNPG recovery from the S3 generation, `seed-secrets.sh`, Forgejo and its dump, `flux bootstrap`, OpenBao snapshot restore, hand tokens, `register-project --rotate` per project.

Code repository side: `internal/reproducible` plus `upstream-images.txt` and `upstream-files.txt` pin the images, so the same commit builds the same image. `Dockerfile`, `Dockerfile.runner`, `Dockerfile.sandbox` pin `SOURCE_DATE_EPOCH`. The factory's own binaries are cosign-signed (`k8s/cosign.pub`).

Verdict: a documented, rehearsed multi-step rebuild with named files and recorded traps. It is not a single command, and it needs a seed bundle and S3 backups. The film should say "rebuilt from the repository and a backup bucket", not "one command".
