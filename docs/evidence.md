# The evidence: every claim with its file, its test and its run

One row per guarantee the landing page makes. Written 21 October 2026.

The columns: Enforced by names the code that holds the guarantee. Tested by names the test that exercises it. Proven by names a real run and where its record lives. Until a run exists, the column says not yet.

Paths are relative to ai-software-factory-code unless they start with `infra:` (ai-software-factory-infra). The tests run in CI: main and nightly run `go test -race ./...`, pull requests run the affected packages without the race detector (`.forgejo/workflows/ci.yml`, `pr.yml`, `nightly.yml`).

The run records named below: the [build plan's stage table](plans/2026-09-24-build-plan.md), the status paragraph of [architecture.md](architecture.md), the [demo handover](../demo/handover/README.md) with its scene bank, and [roadmap.md](roadmap.md), which names the ledger artifacts. The ledger itself is local and not published.

## 1. The kanban fills itself, the chat drives it

The chat replaces card writing, and the same chat reaches a running agent.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| One chat tool per console action, 73 today | `internal/console/chat_tools.go`, `internal/policy/policy.go` (ChatTools) | `internal/console/chat_test.go`, `internal/policy/chat_test.go` | Scenes 01 and 03 of the bank: one sentence files a card |
| Every write is a proposal; the reversible ones carry a 30 minute undo | `internal/console/chat_tools.go`, `internal/policy/policy.go` (ConfirmFor) | `internal/console/writes_test.go` | Scenes 03 and 24: the proposal and Do it |
| The chat drives the board's menus | `internal/console/chat_tools.go` (board_view), `internal/console/board.go` | `internal/console/board_test.go` | Scene 23 |
| A human or the project agent messages a running session, and the gates judge the result | `cmd/agent-worker` (message endpoint), `internal/factoryd/message.go` | `cmd/agent-worker/message_test.go`, `internal/console/tell_card_test.go` | Scene 11: a line typed into a running card, the next turn quotes it |

## 2. Say it, it ships

A card becomes a sandbox, a pull request, a merge and a live deploy, with no human in between.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| One durable workflow per task, surviving restarts; a heal pass re-reads Forgejo every minute | `internal/factoryd/temporal.go` (HealPass), `internal/factoryd/workflow.go` | `internal/factoryd/temporal_test.go`, `internal/factoryd/workflow_test.go` | Stage 8: a planted regression went from alert to a fix in production in 31 minutes, no human |
| A card is done only when a green run covers its merge | `internal/factoryd/chainpoll.go`, `internal/factoryd/mainfix.go` | `internal/factoryd/chainpoll_test.go`, `internal/factoryd/workflow_chain_test.go` | Every stage-exit merge, stage table |

## 3. It plans before it builds

A big request is measured and split, and the criteria name their proofs before any code exists.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| A big request splits into a plan of dependent cards | `internal/factoryd/plan.go` | `internal/factoryd/plan_test.go`, `internal/factoryd/split_test.go` | Stage 11: a spec card became ten planned cards and a deployed link shortener |
| Criteria carry an id, a kind and a named test, and the gate runs the named tests on the assembled feature | `internal/factoryd/criteria.go` | `internal/factoryd/criteria_test.go` | Stage 11's integration card passed the criteria gate (ledger task-105-report.md, named in roadmap.md) |
| The builders never see the hold-out tests: written by a separate session, stored outside every workspace | `internal/factoryd/holdout.go` | `internal/factoryd/holdout_test.go` | not yet |
| A card started on an older spec cannot merge | `internal/factoryd/plan.go` (ErrStalePlan) | `internal/factoryd/plan_stale_test.go` | not yet |

## 4. Nothing merges unproven

The gate chain stands before every merge. It has run on every stage exit, and two of its findings rules have not fired in a recorded run.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| Nine gate stages, with a floor of four no process file may lower | `internal/policy/process.go` (validateStages), `infra:factory/processes/*.yaml` | `internal/policy/process_test.go` (its testdata holds the shipped files) | Every stage-exit merge passed the chain |
| Policy fails forbidden paths, and migrations wait for a human | `internal/policy/risk.go`, `internal/factoryd/gates.go` | `internal/policy/risk_test.go` (TestClassify), `internal/factoryd/gates_test.go` | Every merge of every stage run passed the policy gate |
| Checks run in untrusted gVisor pods with no push credential | `internal/factoryd/ci.go`, `.forgejo/workflows/pr.yml` | `internal/factoryd/ci_test.go`, the pr.yml job-env-audit asserts the job token cannot push | Every pull request of the factory's own code |
| Deleted or weakened tests are a finding returned to the agent | `internal/factoryd/cheat.go` | `internal/factoryd/cheat_test.go` | not yet |
| A review with no verdict is a finding on the human's card | `internal/factoryd/gates.go`, `internal/factoryd/checkin.go` | `internal/factoryd/checkin_test.go` | not yet |

## 5. An issue lands, the fix ships

An issue with a reproduction becomes a card, and the gate proves the fault and the fix.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| A Forgejo issue becomes a card within a minute, and a heal pass catches a lost webhook | `internal/factoryd/intake.go`, `internal/factoryd/temporal.go` (HealPass) | `internal/factoryd/intake_events_test.go`, `internal/factoryd/temporal_test.go` | Scene 33: the lab filed an issue on the scene's repository for real, card 126 |
| The reproduction gate runs the repro at the base commit and at the head | `internal/factoryd/workflow_stages.go`, `cmd/agent-worker/repro.go` | `internal/factoryd/workflow_stages_test.go`, `cmd/agent-worker/repro_test.go` | Scene 33: base_exit 1, exit 0, merged |
| An outsider's issue is screened for injection before any session runs | `internal/factoryd/workflow_stages.go` (ScreenSuspect), `internal/sanitize` | `internal/factoryd/workflow_stages_test.go`, `internal/factoryd/sanitize_test.go` | not yet |

## 6. Live software feeds back

Alerts and routines file cards on their own.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| A SigNoz alert files a bug card, judged real or noise | `internal/factoryd/signozwebhook.go`, `internal/factoryd/alerts.go`, `k8s/alerts/*.json` | `internal/factoryd/signozwebhook_test.go`, `internal/factoryd/projectalerts_test.go` | Stage 8: the regression's alert filed the card that fixed it |
| Routines run by cron, by every n merges or by event | `internal/factoryd/routines.go`, `internal/policy/routine.go` | `internal/factoryd/routines_test.go`, `internal/factoryd/routine_run_test.go` | not yet (template-pass is scheduled hourly in `infra:factory/policy.yaml`) |

## 7. It does not stall

Detectors and the supervisor answer in code before a human is asked.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| Eleven detectors watch every session | `internal/factoryd/supervise.go` | `internal/factoryd/supervise_test.go` | Scene 08: the flip-flop detector tripped |
| The supervisor answers in code first, then by the check-in model in the session's pod, twelve calls a card at most | `internal/factoryd/supervisor.go`, `internal/factoryd/checkin.go` | `internal/factoryd/supervisor_test.go`, `internal/factoryd/checkin_test.go` | Scene 08: redirect, then the next session on the stronger model |
| The ladder: a stronger model after three returns from one stage, a human after the session cap | `internal/factoryd/workflow.go` (stronger_after), `infra:factory/policy.yaml` | `internal/factoryd/workflow_test.go` | Scenes 08 and 10 |

## 8. No model call runs without its cost covered

The money is held before the call, and the caps stop the factory with a question.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| The worst case is held before the call under a database lock, and the real cost is booked after | `internal/policy/holds.go`, `internal/gateway/server.go` | `internal/gateway/server_test.go`, `internal/policy/credits_test.go` | Every model call of every run. Stage 18 costed 17 cards at 0.019 to 1.24 EUR each |
| Caps at task, day, month and project, each refusal named | `internal/factoryd/monthcap.go`, `internal/gateway/server.go` | `internal/factoryd/monthcap_test.go`, `internal/gateway/server_test.go` | Scene 20: the budget question with fund and end. Scene 28: the costs page |
| A missing cap reads as zero and stops all spend | `internal/policy/policy.go` | `internal/policy/policy_test.go` | not yet |

## 9. You hold the roadmap and the money

One dial sets what asks, and money beyond a budget always reaches a human.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| Four autonomy levels, each removing named confirms | `internal/policy/policy.go` (ConfirmFor) | `internal/policy/autonomy_test.go`, `internal/console/autonomy_test.go` | Scene 25: the dial moved to full auto |
| Forbidden paths and migrations stay human at every level | `internal/policy/risk.go`, `internal/factoryd/gates.go` | `internal/policy/risk_test.go`, `internal/factoryd/workflow_gates_test.go` | Every merge of every stage run (section 4) |
| Every ask gets one model attempt, recorded, before a human sees it | `internal/console/analysis.go` (attach_analysis), `internal/console/chat_tools.go` (ask, escalate) | `internal/console/analysis_test.go` | not yet |
| Money beyond a card's budget comes from a named pool or asks a human | `internal/policy/policy.go` (FundCard), `internal/console/chat_tools.go` (fund) | `internal/console/fund_test.go`, `internal/console/chat_fund_test.go` | Scene 24: three asks answered from the phone view |

## 10. The sandbox is the guardrail

Every session runs in a throwaway pod with its own identity, and the network is closed.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| Each session runs in its own throwaway gVisor pod: uid 1000, no capabilities, read-only root, emptyDir volumes, quota | `internal/factoryd/runner.go` (sandboxPodSpec) | `internal/factoryd/runner_test.go`, `internal/factoryd/sandbox_test.go` | Every session of every run. Scene 32 shows the pod's life |
| Egress is denied by default and allowed by name, and the metadata address is denied outright | `internal/factoryd/runner.go` (workerEgressSpec) | `internal/factoryd/runner_test.go` | Every session, by the probe below |
| The egress probe proves the closed network before the agent starts, or the start fails | `cmd/agent-worker/egress.go` | `cmd/agent-worker/egress_test.go` | Every session start of every run |
| The agent never holds a push token: the read token lives in the clone init container, the write token is minted after the agent process is dead, used once and revoked | `internal/factoryd/forgejo.go`, `internal/factoryd/message.go`, `internal/factoryd/completion.go` | `internal/factoryd/forgejo_test.go`, `cmd/agent-worker/message_test.go`, `internal/factoryd/completion_test.go`, TestTaskHistoryCarriesNoCredential in `internal/factoryd/history_test.go` | Every push of every run |
| The gateway identity is a projected token that expires in one hour and is verified against the cluster | `internal/factoryd/runner.go`, `internal/gateway/auth.go` | `internal/gateway/auth_test.go` | Every model call of every run |
| The gateway dials out, resolves once and refuses non-public addresses | `internal/gateway/egress.go` | `internal/gateway/egress_test.go` | Every external tool call |
| Model keys are per task, carry no budget and die with the run | `internal/gateway/litellm.go` | `internal/gateway/litellm_test.go` | Every run mints and blocks its key |

## 11. Three layers: the factory, your process, your prompts

The process is a file with a floor, the prompts are the project's own, and the harness is an adapter.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| The process is a YAML file with a floor, and two processes ship | `internal/policy/process.go`, `infra:factory/processes/maintenance.yaml`, `infra:factory/processes/spec.yaml` | `internal/policy/process_test.go` (its testdata holds both files) | Stage 11 ran the spec process end to end |
| AGENTS.md is seeded from a template into the project's repository | `internal/factoryd/register.go`, `infra:factory/templates/ts-go` | `internal/policy/template_test.go`, `internal/factoryd/register_test.go` | not yet |
| The writing guide ships as a file compiled into the binaries | `internal/writingguide/writing-guide.md`, embedded by `internal/writingguide/writingguide.go` | No dedicated test. The build fails if the file is absent | Every CI build of the binaries |
| The harness is an adapter behind one interface | `internal/harness` (the interface), `internal/factoryd/opencode.go` (the adapter) | `internal/harness/types_test.go`, `internal/factoryd/opencode_test.go` | Every session runs through the adapter |

## 12. The numbers

The pages read the same ledger the board reads.

| Guarantee | Enforced by | Tested by | Proven by |
|---|---|---|---|
| The metrics and costs pages read the same ledger as the board | `internal/console/metrics.go`, `internal/factoryd/metrics.go` | `internal/console/metrics_test.go`, `internal/factoryd/metrics_test.go` | Scenes 26 to 28: the pages beside the board |
| Costs are booked per card and per call, with a dated window | `internal/gateway/server.go`, `internal/factoryd/store.go`, `internal/console/ledger.go` | `internal/console/chat_pages_parity_test.go`, `acceptance/costs_date_window_test.go` | Stage 18: cost per card 0.019 to 1.24 EUR |

Rows that say not yet: hold-outs, the stale-plan refusal, cheat detection, the no-verdict finding, outsider screening, routines, the missing-cap stop, the model attempt on an ask and template seeding. Nine of forty-three guarantees wait for their run.
