---
name: DBOS
slug: dbos
url: https://www.dbos.dev
repo: https://github.com/dbos-inc/dbos-transact-py
category: durable-execution
license: "mixed: MIT (Transact library), proprietary (Conductor control plane)"
open_source: partial
self_hostable: yes
hosting_model: self-hosted library always; hosted or self-hosted Conductor and DBOS Cloud on top, paid
company: DBOS, Inc., Cambridge MA, MIT/Stanford spinout founded 2023 by Mike Stonebraker, Matei Zaharia, Peter Kraft and Qian Li. $8.5M seed, March 2024 (Engine Ventures, Construct Capital)
maturity: 1,593 stars, 98 forks, 5 open issues, repo created 2024-07-19, last commit 2026-09-28, sibling libraries for TypeScript, Go, Java, Rust
similarity: 1
axes:
  signals_intake: 0
  control_plane: 2
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 0
  ux: 2
  reseedable_selfhost: 4
steal:
  - "SetWorkflowID as an idempotency key: a webhook handler starts a workflow exactly-once keyed on the event id, then acknowledges immediately. Directly reusable for factoryd's Forgejo webhook intake to make retried deliveries safe."
  - "DBOSClient.list_workflows plus fork_workflow(id, step): query failed runs by time range and status, then restart a batch from a named step instead of the top. We flagged 'no replay' as a weak spot; this is the shape of the fix."
  - "Queue rows carry concurrency limit, rate limit, dedup key and priority as plain columns on workflow_status, so flow control is a WHERE clause, not a second service. Worth checking before adding more machinery to our Temporal queue."
  - "Workflow state as a handful of Postgres tables (workflow_status, workflow_input, workflow_output, operation_outputs) rather than an external orchestrator confirms the value of keeping durable state inside CloudNativePG."
  - "Conductor instances are stateless because everything lives in Postgres, so any instance can serve any request and several run for availability with no leader election. A pattern for any control-plane service we add."
differs:
  - "DBOS has no sandbox, no egress control and no per-task credential concept. It durably executes your own trusted service code, not code an LLM agent just wrote. We cannot adopt it as a worker-plane substitute; at most it is a library our own trusted processes could use."
  - "Identity is an app-supplied string (authenticated_user, assumed_role columns) carried through workflow context, not a short-lived, audience-scoped token verified by a gateway. Adopting DBOS's model as-is would break 'identity belongs to the task, not the machine.'"
  - "The parts that would make DBOS a full control plane (Conductor's dashboard, pause/resume/restart, multi-executor fleet view) are proprietary, licensed per seat, and phone home for licence checks with no source access. Our 'open source with an escape hatch' constraint would be violated the moment we wanted that UI."
ux_verdict: Conductor's workflow list, retry and cancel actions are a clean narrow tool for one job (workflow ops) but it is paywalled past one executor and has no idea an agent or a task exists.
slop_verdict: Real and maintained, daily commits, credible founders (Stonebraker, Zaharia), but a small team (about a dozen people per Tracxn) on one $8.5M seed round, and the commercial product is a classic open-core wrapper around the free library.
---

# DBOS

## 1. What it is

DBOS Transact is an MIT-licensed Python (and TypeScript, Go, Java, Rust) library that adds durable workflows and queues to an existing application by decorating functions with `@DBOS.workflow()` and `@DBOS.step()`. State is checkpointed to Postgres, so a crashed process resumes a workflow from its last completed step on restart. There is no separate orchestrator server: the library runs inside the caller's own process and talks to Postgres directly through SQLAlchemy and psycopg.

The company, DBOS Inc., is an MIT/Stanford research spinout (Mike Stonebraker, Matei Zaharia, Peter Kraft, Qian Li) that raised an $8.5M seed round in March 2024. It sells DBOS Conductor, a proprietary dashboard and control API for running fleets of DBOS applications (self-hostable under a paid, phone-home-checked licence, or hosted), and DBOS Pro/Teams support tiers. The README's own pitch is explicit: "you can add DBOS to your program by installing this open-source library... no additional infrastructure for you to configure or manage," contrasted directly with Temporal, which needs a separate orchestrated server and workers. Docs and code back that claim: the library truly needs nothing beyond a Postgres connection string.

## 2. Mapping to our five planes

| Plane / principle | What DBOS does | What we do | Verdict |
|---|---|---|---|
| Signals | None built in. `SetWorkflowID` lets a caller start a workflow exactly-once from an external event (webhook, Kafka message), but the caller still owns intake | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | Workflow/step state as Postgres tables (`workflow_status`, `workflow_input`, `workflow_output`, `operation_outputs`), durable queues with concurrency/rate limits/dedup/priority, cron schedules, `DBOSClient` for bulk query, pause, resume and fork-from-step. No budgets, approvals or capability policy | `factoryd` with a Temporal workflow per task, Postgres, YAML policy in Git, approvals, budgets | equal on durable state and scheduling; we lead on approvals, budget, audit |
| Worker plane | None. Executes the caller's own trusted code in the caller's own process, no isolation | gVisor pod per task, read-only root FS, default-deny egress | we lead |
| Verification | None | Forgejo Actions, policy gates, stronger-model review | we lead |
| Merge and deploy | None | bot merge after approval, Flux staged rollout | we lead |
| Policy outside the model | `@DBOS.required_roles(...)` decorator checked in library code against an `assumed_role` string set by the caller (`dbos/_roles.py`) | Capability policy as a YAML document in Git, enforced in `factory-gateway` and network policy | we lead |
| Identity per task | `authenticated_user`, `assumed_role`, `authenticated_roles` columns on `workflow_status` carry a caller-supplied identity through the workflow, no credential issuance | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | Functions exchange typed arguments and return values (serialized and stored per step), no agent concept exists | `TaskBrief` in, branch, PR and event stream out | not comparable (no agents) |

## 3. Architecture and stack

Pure Python library (`dbos/_dbos.py`, `dbos/_core.py`, `dbos/_queue.py`, `dbos/_sys_db.py`), SQLAlchemy plus `psycopg[binary]` for Postgres, `sqlite` support for local dev (`_sys_db_sqlite.py`). The system schema lives in `dbos/_schemas/system_database.py`: one `workflow_status` row per workflow with `queue_name`, `priority`, `deduplication_id`, `workflow_timeout_ms`, `owner_xid`/`creator_xid` for exactly-once claiming, plus `operation_outputs` keyed on `(workflow_uuid, function_id)` for step memoisation. Recovery (`dbos/_recovery.py`) re-enqueues pending workflows found on startup rather than executing them directly, so recovery goes through the same atomic dequeue as a normal queue pop and stays idempotent under concurrent recovery attempts.

`dbos/_conductor/conductor.py` is an optional background thread that opens a websocket to a Conductor endpoint (hosted or self-hosted) for remote observability and control; it activates only if `conductor_url`/`conductor_key` (or `DBOS__CONDUCTOR_*` env vars) are set. A CLI (`dbos/cli/cli.py`, `dbos migrate`, `dbos start`) runs schema migrations and process supervision, plus a `_docker_pg_helper.py` that can spin up a local Postgres container for `dbos init`. No model or agent code exists anywhere in this repository: DBOS never calls an LLM itself, it is invoked by application code that might.

## 4. UX

There is no UX for end users of the library itself beyond Python decorators and a CLI. Fleet-level UX lives in the separate, proprietary Conductor product: a web dashboard listing workflows by status, with retry, cancel and restart actions, plus alerting on stalled or failed workflows (not verified beyond docs and marketing pages, no screenshot inspected). Self-hosting Conductor without a paid licence caps you at one connected executor, so any real multi-instance use funnels through DBOS's sales team. Onboarding to Transact itself is `pip install dbos`, point it at a Postgres URL, add two decorators. That is a materially shorter path than getting a first workflow running under Temporal, and shorter than our own console today (queued/running/waiting/review/done in a kanban board with an approval lane).

## 5. Security, identity, sandbox, policy, cost

**Identity**: an app-supplied string set by the caller before invoking a workflow, stored as plain columns, never verified against an external identity provider inside the library. **Sandbox**: none, DBOS assumes the host process is trusted; there is no concept of an untrusted or agent-authored payload. **Policy**: `required_roles` decorators enforce role membership in code, which does satisfy "not just a prompt", but the role set itself is whatever string the calling application asserts, with no separate policy document or version history. **Cost**: nothing. No spend tracking, no budget, no ledger anywhere in the codebase or docs. Credentials for Postgres sit in the caller's own environment or config file, DBOS does not broker or scope them.

## 6. What we should take from it

Narrow: the `SetWorkflowID` exactly-once-start pattern is a one-line idiom we should use verbatim for Forgejo webhook intake, since retried deliveries are otherwise a real duplicate-task risk. The queue schema (limit, period, dedup, priority as plain row attributes on the workflow table) is a useful sanity check against over-building flow control on top of Temporal.

Broad: `DBOSClient.list_workflows` plus `fork_workflow(workflow_id, step)` is exactly the "replay or trace UI" capability our own vision doc lists as missing. Worth designing a similar bulk-query-and-restart-from-step tool against Temporal's own workflow history rather than treating this as DBOS-specific.

## 7. Where our philosophy differs and what that costs or buys us

DBOS's whole pitch is "no additional infrastructure, just Postgres," which buys a genuinely lighter operational footprint than Temporal for pure durable execution. We already pay Temporal's heavier footprint (a worker fleet, task queues, a separate server) because we need multi-hour agent workflows with signals, versioning and a mature client ecosystem that DBOS's simpler step/workflow model does not target. Swapping to DBOS would not touch our worker plane, verification or security model at all, since DBOS has no opinion on any of them, so it is not a competitor to Temporal for us so much as a narrower tool for a narrower job.

The one real friction: DBOS's commercial layer (Conductor) is closed source with a phone-home licence check and no source access even when paid for. That is the exact shape our "escape hatch if maintainers gate needed features" constraint warns against. We are not depending on DBOS, so this costs us nothing today, but it means DBOS Conductor itself would fail our own vendor-selection bar if we ever needed a fleet dashboard.

## 8. Red flags and slop assessment

Genuinely active: last commit 2026-09-28, five open issues against 1,593 stars suggests either good triage or light usage, not distinguishable from the repo alone. Company is small (about a dozen people per Tracxn, one priced funding round of $8.5M as of writing) for a durable-execution vendor with enterprise ambitions. The commercial product is a clean open-core split: the library that makes the marketing claims true (MIT, freely inspectable) versus the fleet-management product that actually monetises (proprietary, licence-key gated, explicitly denies source access in its terms). No security incidents or licence changes found in search. DBOS's own 2024 launch pitch was a broader "cloud-native operating system" positioning that has since narrowed to "durable execution," a sign of a pivot rather than a stable long-term roadmap, though the current product is coherent and shipping.

## 9. Sources

- https://github.com/dbos-inc/dbos-transact-py (cloned 2026-09-29, depth 1)
- /home/womb/repos/market-research-clones/dbos/README.md
- /home/womb/repos/market-research-clones/dbos/pyproject.toml
- /home/womb/repos/market-research-clones/dbos/dbos/_dbos.py
- /home/womb/repos/market-research-clones/dbos/dbos/_queue.py
- /home/womb/repos/market-research-clones/dbos/dbos/_roles.py
- /home/womb/repos/market-research-clones/dbos/dbos/_recovery.py
- /home/womb/repos/market-research-clones/dbos/dbos/_core.py
- /home/womb/repos/market-research-clones/dbos/dbos/_schemas/system_database.py
- /home/womb/repos/market-research-clones/dbos/dbos/_conductor/conductor.py
- /home/womb/repos/market-research-clones/dbos/dbos/cli/cli.py
- /home/womb/repos/market-research-clones/dbos/CONTRIBUTING.md
- /home/womb/repos/market-research-clones/dbos/LICENSE
- gh api repos/dbos-inc/dbos-transact-py (2026-09-29)
- https://www.dbos.dev (fetched 2026-09-29)
- WebSearch "DBOS Inc funding Series A MIT durable execution 2025 2026" (2026-09-29)
- WebSearch "DBOS Conductor self-hosted pricing DBOS Pro open core" (2026-09-29), incl. https://www.dbos.dev/dbos-pricing, https://docs.dbos.dev/production/hosting-conductor, https://www.dbos.dev/conductor-license
