# Cluster facts: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** every session that ends without a push gets a death record whose class (`platform`, `own_limit`, `unknown`) code sets from the pod, its node and the nodes' kernel log. A platform death costs the card nothing, the next session reads what happened in at most three lines, the check-in, rung 1 and the chat read the full facts through one tool, and the human gets one card when platform deaths pile up.

**Architecture:** a pure classifier (`Classify`) and line builder (`GateLines`) in `factoryd`. factoryd records each session pod's node, UID and boot ID when it starts, and at the end reads the pod, the node, the pod's kernel kill lines and the incident log, classifies, and stores a `DeathRecord`. A once-a-minute pass fills `platform_incidents` from the nodes' kernel log in SigNoz, the restarts of the services sessions use, and the nodes. The workflow gives the new outcome `platform_killed` a free path. The death record replaces `SessionKill`. The infra repository ships each node's kernel log to SigNoz through Talos's `KmsgLogConfig` and a TCP receiver on the k8s-infra agent.

**Tech Stack:** Go (`factoryd`, the console, `agent-worker`), Temporal, Postgres, SigNoz v0.143.0 (`/api/v5/query_range`), Talos v1.14.1, the k8s-infra chart 0.17.1 (OpenTelemetry collector contrib 0.139.0), Cilium 1.20.

**Spec:** [cluster-facts-spec-2026-11-21.md](../cluster-facts-spec-2026-11-21.md). Its sections bind every task. Section numbers below (§) refer to it.

**Where the work runs:** code in the worktree `~/repos/ai-software-factory-code/.worktrees/cluster-facts` on branch `cluster-facts`, cut from `github/main` (`f56249721`). Infra in `~/repos/ai-software-factory-infra/.worktrees/cluster-facts` on branch `cluster-facts`, cut from `github/main` (`462f376`). Code paths are relative to the code repository's `internal/` unless they start with `cmd/`, `k8s/`, `acceptance/`, `scripts/` or `docs/`. Line numbers are from `f56249721` and are hints: find code by symbol.

## Global Constraints

- One way only. When this branch lands, no `SessionKill`, `killOf`, `SessionResult.Killed`, `TripInput.Killed` or `CaseFacts.Killed` exists. The death record names every kill. A migration turns the `killed` facts of stored cases into `death` facts.
- Three classes: `platform`, `own_limit`, `unknown`. The rules run in the order of §5.1, and the first match wins. No model sets a class.
- The gate (§5.4): at most 3 lines and 600 characters. A line covers the predecessor's own pod, its node inside the predecessor's life, or a restart of factory-gateway, LiteLLM or Forgejo that overlaps the predecessor's life. Lines come from fixed templates filled with parsed fields. No raw event, log or kernel text enters a prompt, and no container message enters a line.
- A platform death has the outcome `platform_killed`. It costs no attempt and no agent time and is no step toward the stronger model. Money spent stays spent. Three in a row on one card open the case `platform_fault`: rung 1 is skipped, rung 2 decides, then the human.
- Three platform deaths within 24 hours across all cards file one human-lane card, source `platform_deaths`. One is open at a time. No agent works it.
- CI runner pods and gate pods get the same death record (§5.9). A CI job whose pod the platform ended gets up to two re-runs. A job killed by its own pod's limit gets none, and its note names the limit. A killed job without a record keeps today's one re-run.
- The tool `cluster_facts` serves the check-in, rung 1 and the chat, never a sandbox. It returns fixed fields under a 12 KiB cap, and every refusal names the state and the action.
- Kernel lines: SigNoz logs with `resource.service.name = 'talos-kmsg'`, read over the last 15 minutes, made unique by node, sequence number and time.
- The incident log keeps 30 days.
- No new Kubernetes rights. factoryd already lists pods and nodes in every namespace and lists events in each task namespace.
- Every text a human reads uses plain words, calls a human a human, and never shows the words rung, case or pool. `facefixtures.HumanFaults` and `TextFaults` pass.
- Tests come first and derive their expectations by hand from the spec. No assertion is weakened to pass.
- Verify with the full suite under `-race` with Postgres (the controller's brief gives the command for this machine) and `bash check static`.
- No ruling number and no ledger path in a tracked file or a commit message. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Comments stay minimal: only what the code cannot say.

## Review Focus

1. **SigNoz is down or refuses the login while a session dies.** Expected: the kill-line wait ends at its bound (90 seconds) or at the first error, the record falls back to the other rules, and the session's end is never held longer. Pinned in Task 5.
2. **The node object is gone at the end** (a node replaced or deleted). Expected: `NodeState` answers `ErrNotFound`, and the death is `platform` with the rule `node_not_ready`. Pinned in Task 5.
3. **Days-old kernel lines arrive late** (the first `KmsgLogConfig` apply re-sends the ring buffer). Expected: a kill line outside the session's life, from its start to one minute after its end, never classifies that session. Pinned in Task 1.
4. **factoryd restarts or the pass runs twice in a minute.** Expected: an incident seen twice is one row. Pinned in Task 2 and Task 4.
5. **A workflow history recorded before the roll replays.** Expected: a stored `SessionResult` holding `killed` decodes without error, and a run in flight takes the free path when the new code returns `platform_killed`. Pinned in Task 5 and Task 6.

---

## Tasks

### Task 1: The rules and the lines

A pure addition. Nothing calls it yet.

**Files:**
- Create: `factoryd/death.go`, `factoryd/death_test.go`, `factoryd/kernelline.go`, `factoryd/kernelline_test.go`

**Interfaces:**
- Consumes: `PodDiagnosis`, `PodCondition`, `ContainerState` (`factoryd/kube.go:132-156`). Task 3 adds `UID`, `Node`, `StartedAt`, `Deleting` to `PodDiagnosis`, `Since` to `PodCondition` and `MemoryLimit` to `ContainerState`. Add those fields in this task, unread by the Kube client until Task 3.
- Produces:
  - `type DeathClass string` with `DeathPlatform = "platform"`, `DeathOwnLimit = "own_limit"`, `DeathUnknown = "unknown"`.
  - `type DeathRule string` with `RuleGuardKill = "guard_kill"`, `RuleNodeOOM = "node_oom"`, `RuleNodePressure = "node_pressure"`, `RuleNodeRebooted = "node_rebooted"`, `RuleNodeNotReady = "node_not_ready"`, `RuleDisruption = "disruption"`, `RuleGoneAfterRestart = "gone_after_restart"`, `RuleDeleted = "deleted"`, `RuleMemoryLimit = "memory_limit"`, `RuleStorageLimit = "storage_limit"`, `RuleNone = "none"`.
  - `type KernelKill struct { Source string; Node, PodUID, Constraint string; At time.Time; Seq int64 }`. `Source` is `"guard"` or `"kernel"`. `Constraint` is set for kernel kills only.
  - `func ParseKernelLine(body, node string, seq int64, at time.Time) (KernelKill, bool)`.
  - `type NodeState struct { Name, BootID string; Ready bool; Since time.Time }` (`Since` is the Ready condition's last transition).
  - `type PodEvent struct { Reason, Type, Message string; At time.Time; Count int }`.
  - `type ServiceRestart struct { Service string; From, Until time.Time; Cause string }`. `Cause` is `"guard"`, `"kernel"` or `""`.
  - Service names: `ServiceFactoryd = "factoryd"`, `ServiceGateway = "factory-gateway"`, `ServiceLiteLLM = "litellm"`, `ServiceOpenBao = "openbao"`, `ServiceForgejo = "forgejo"`, `ServiceAPIServer = "kube-apiserver"`.
  - `type DeathFacts struct { Pod PodDiagnosis; PodGone, StoppedByFactory, AfterRestart bool; BootAtStart string; Node *NodeState; NodeGone bool; Started, Ended time.Time; Kills []KernelKill; LastCommand string }`. `Node` nil means the node was not read.
  - `type DeathRecord struct` with JSON fields `class`, `rule`, `at`, `node`, `pod_uid`, `exit_code`, `reason`, `container`, `condition`, `resource`, `limit`, `kill_source`, `last_command`, `restarts []ServiceRestart`, `events []PodEvent`, `lines []string` (all but class, rule and at `omitempty`).
  - `func Classify(f DeathFacts) DeathRecord`. It leaves `Restarts`, `Events` and `Lines` empty.
  - `func GateLines(r DeathRecord, lastPush string) []string`.
  - `func (r DeathRecord) Short() string`.

**The rules** (§5.1), in this order. A kill counts only when its `At` lies in `[Started, Ended+1m]`.

1. A kill with `Source "guard"` names the pod's UID: `platform`, `guard_kill`, `KillSource "guard"`.
2. A kernel kill with `Constraint "CONSTRAINT_NONE"`: `platform`, `node_oom`.
3. `Pod.Reason == "Evicted"` and the message starts `The node was low on resource`: `platform`, `node_pressure`. `Resource` is the word after `resource: ` up to the first `.`.
4. `BootAtStart` is set, `Node` is read and its `BootID` differs: `platform`, `node_rebooted`. `NodeGone`, or `Node` read and not `Ready`: `platform`, `node_not_ready`.
5. A condition `DisruptionTarget` with status `True`: `platform`, `disruption`. `Condition` is its reason.
6. `AfterRestart`: `platform`, `gone_after_restart`. `PodGone` or `Pod.Deleting` while not `StoppedByFactory`: `platform`, `deleted`.
7. A kernel kill with `Constraint "CONSTRAINT_MEMCG"`, or a container terminated with reason `OOMKilled`: `own_limit`, `memory_limit`. `Limit` is that container's `MemoryLimit`.
8. `Pod.Reason == "Evicted"` and the message starts `Usage of EmptyDir volume`, `Pod ephemeral local storage usage exceeds` or `Container ` and holds `exceeded its local ephemeral storage limit`: `own_limit`, `storage_limit`. `Resource` is the quoted volume name (or `ephemeral-storage`), `Limit` the quoted or trailing limit.
9. Otherwise `unknown`, `none`.

Every record also takes `At = Ended`, `Node = Pod.Node`, `PodUID = Pod.UID`, `LastCommand`, and the first container that ended with a non-zero exit code or a reason other than `Completed` (`ExitCode`, `Reason`, `Container`).

**The lines** (§5.4). Times are `15:04` UTC. A command is cut to 120 bytes with `…`. A quantity `4Gi` reads `4 GiB`, `512Mi` reads `512 MiB`.

- A `platform` record gives one class line: `Your previous session did not fail on its own.`, then the rule's sentence, then `Work after the last push, commit <first 7 of lastPush>, is lost.` (or `Work it did not push is lost.` when `lastPush` is empty), then `That session does not count against the card.` The rule's sentences:
  - `guard_kill`: `The node's memory guard killed its pod on <node> at <time> UTC.`
  - `node_oom`: `The node <node> ran out of memory at <time> UTC, and the kernel killed its pod.`
  - `node_pressure`: `The node <node> ran low on <resource> at <time> UTC, and Kubernetes evicted its pod.`
  - `node_rebooted`: `The node <node> restarted at about <time> UTC.`
  - `node_not_ready`: `The node <node> stopped answering at about <time> UTC.`
  - `disruption`: `Kubernetes stopped its pod at <time> UTC: <why>.` `<why>` comes from a fixed map of the condition's reason: `PreemptionByScheduler` a pod of higher priority took its place, `DeletionByTaintManager` its node was marked for eviction, `EvictionByEvictionAPI` an eviction request, `DeletionByPodGC` the cleanup of pods on a lost node, `TerminationByKubelet` the node's kubelet ended it. An unmapped reason gives `Kubernetes stopped its pod at <time> UTC.`
  - `gone_after_restart`: `Its pod was gone when the factory restarted at <time> UTC.`
  - `deleted`: `Something outside the factory deleted its pod at <time> UTC.`
- An `own_limit` record gives one line:
  - `memory_limit`: `Your previous session's pod reached its <limit> memory limit while it ran ` + "`<command>`" + `, and the kernel killed it.` Without a limit, `its memory limit`. Without a command, the clause `while it ran …` goes.
  - `storage_limit` on a volume: `Your previous session's pod filled its ` + "`<volume>`" + ` volume past its <limit> limit while it ran ` + "`<command>`" + `, and Kubernetes evicted it.` For `ephemeral-storage`: `Your previous session's pod used more than its <limit> of local storage while it ran ` + "`<command>`" + `, and Kubernetes evicted it.`
- An `unknown` record gives no line.
- Each `Restarts` entry of `factory-gateway`, `litellm` or `forgejo`, oldest first: `<Name> restarted from <from> to <until> UTC during your previous session.`, then `The node's memory guard killed it.` for cause `guard` or `The kernel killed it for its memory.` for `kernel`, then `Git errors in that window came from the restart.` for Forgejo or `Model call errors in that window came from the restart.` for the other two. Names: `Forgejo`, `The model gateway`, `LiteLLM`. An open restart (zero `Until`) reads `restarted at <from> UTC`.
- The class line comes first. A further line is added only while the count stays at most 3 and the total at most 600 characters.

`Short()` gives the phrase for the card's timeline: `the node's memory guard killed the pod`, `the node ran out of memory`, `the node ran low on <resource>`, `the node restarted`, `the node stopped answering`, `Kubernetes stopped the pod`, `the pod was gone after a factory restart`, `the pod was deleted outside the factory`, `the pod reached its memory limit`, `the pod passed its storage limit`, `no cluster cause found`.

**`ParseKernelLine`:** a body holding `Sending SIGKILL to cgroup` is a guard kill. Its UID is the match of `pod([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})` in the `cgroup` value. A body holding `oom-kill:` is a kernel kill: `Constraint` from `constraint=`, the UID from `task_memcg=` by the same pattern. Any other body: `false`.

- [ ] **Step 1: Write the failing tests.**
  - `TestParseKernelLineReadsTheGuardKill`: the real line `[talos] Sending SIGKILL to cgroup {"component": "controller-runtime", "controller": "runtime.OOMController", "cgroup": "/sys/fs/cgroup/kubepods/burstable/pod91adbc7d-6406-4a24-ac91-c1979b028d36"}` gives `Source "guard"`, `PodUID "91adbc7d-6406-4a24-ac91-c1979b028d36"`. The static pod's `.../pod95b8e1d73a17b344fb5a65306746a377` gives that 32-character UID.
  - `TestParseKernelLineReadsTheKernelKill`: `oom-kill:constraint=CONSTRAINT_MEMCG,nodemask=(null),cpuset=/,mems_allowed=0,oom_memcg=/kubepods/burstable/pod0f1e2d3c-4b5a-6978-8091-a2b3c4d5e6f7,task_memcg=/kubepods/burstable/pod0f1e2d3c-4b5a-6978-8091-a2b3c4d5e6f7/c1,task=runsc-sandbox,pid=4242,uid=0` gives `Constraint "CONSTRAINT_MEMCG"` and that UID. The same with `constraint=CONSTRAINT_NONE` and `global_oom` in place of `oom_memcg=...` gives `CONSTRAINT_NONE`. `eth0: renamed from tmpff297` gives false.
  - `TestClassifyFollowsTheRules`: one row per rule above, each with facts written by hand, asserting class and rule. Include the eviction messages `The node was low on resource: ephemeral-storage. Threshold quantity: 10Gi, available: 9Gi.` (`node_pressure`, `Resource "ephemeral-storage"`) and `Usage of EmptyDir volume "tmp" exceeds the limit "4Gi". ` (`storage_limit`, `Resource "tmp"`, `Limit "4Gi"`).
  - `TestClassifyOrder`: a guard kill and `OOMKilled` together give `guard_kill`. A factoryd stop with the pod deleting gives `unknown`.
  - `TestClassifyIgnoresKillsOutsideTheSession`: a guard kill one day before `Started` gives `unknown`.
  - `TestGateLinesExact`: the full text for `guard_kill` on `sf-2` at 14:02 with `lastPush "abc1234def"` is `Your previous session did not fail on its own. The node's memory guard killed its pod on sf-2 at 14:02 UTC. Work after the last push, commit abc1234, is lost. That session does not count against the card.` The `memory_limit` line with `Limit "4Gi"` and command `go test -race ./...` is `Your previous session's pod reached its 4 GiB memory limit while it ran ` + "`go test -race ./...`" + `, and the kernel killed it.` A Forgejo restart 14:02 to 14:04 with cause `guard` is `Forgejo restarted from 14:02 to 14:04 UTC during your previous session. The node's memory guard killed it. Git errors in that window came from the restart.`
  - `TestGateLinesCaps`: a platform record with four gated restarts gives 3 lines. A 2,000-byte command keeps the total at most 600 characters. A `factoryd` or `kube-apiserver` restart gives no line. `unknown` gives none.
- [ ] **Step 2:** Run `go test ./internal/factoryd/ -run 'TestParseKernelLine|TestClassify|TestGateLines'`. Expected: FAIL, undefined names.
- [ ] **Step 3:** Implement `kernelline.go` and `death.go`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `factoryd: the rules that name who ended a session, and the lines the next session reads`.

### Task 2: The store

**Files:**
- Create: `schema/migrations/factoryd/20261129100000_cluster_facts.sql`, `factoryd/clusterstore.go`, `factoryd/clusterstore_test.go` (PG), `factoryd/clusterstore_fake_test.go`
- Modify: `factoryd/livesession.go`

**Interfaces:**
- Produces:
  - `LiveSession` gains `PodUID, Node, BootID string`, written by `PutLiveSession` and read by `LiveSession`.
  - `type IncidentKind string` with `IncidentGuardKill = "guard_kill"`, `IncidentKernelOOM = "kernel_oom"`, `IncidentRestart = "restart"`, `IncidentNodeBoot = "node_boot"`, `IncidentNodeNotReady = "node_not_ready"`.
  - `type PlatformIncident struct { ID int64; Key string; At time.Time; Until *time.Time; Kind IncidentKind; Subject, Node, Namespace, PodUID string; Detail map[string]any }`.
  - `type PodDeath struct { Kind string; TaskID, SessionID, Runner string; Record DeathRecord }`. `Kind` is `"session"`, `"ci"` or `"gate"`. The key of a death is `session/<task>/<session>`, `ci/<runner>` or `gate/<pod uid>`.
  - `type ClusterStore interface` with:
    - `AddPlatformIncidents(ctx context.Context, in []PlatformIncident) (int, error)`: insert, a known `Key` skipped; returns the rows added.
    - `PlatformIncidents(ctx context.Context, from, to time.Time, limit int) ([]PlatformIncident, error)`: rows with `at <= to AND coalesce(until, at) >= from`, oldest first.
    - `PodIncidents(ctx context.Context, podUID string) ([]PlatformIncident, error)`.
    - `PrunePlatformIncidents(ctx context.Context, age time.Duration) error`.
    - `PutPodDeath(ctx context.Context, d PodDeath) error`: one row per key, a second put replaces it.
    - `SessionDeath(ctx context.Context, taskID, sessionID string) (DeathRecord, bool, error)`.
    - `CIDeath(ctx context.Context, runner string) (DeathRecord, bool, error)`.
    - `PlatformDeaths(ctx context.Context, since time.Time) ([]PodDeath, error)`: class `platform`, `at >= since`, newest first, every kind.
  - `var _ ClusterStore = (*PGStore)(nil)`. The big `Store` interface does not change.
  - `const IncidentRetention = 30 * 24 * time.Hour`.
  - `newFakeClusterStore() *fakeClusterStore`: an in-memory `ClusterStore` for the tests of later tasks.

The migration adds `pod_uid`, `node`, `boot_id` (`text NOT NULL DEFAULT ''`) to `live_sessions`. It creates `platform_incidents (id bigserial PRIMARY KEY, key text NOT NULL UNIQUE, at timestamptz NOT NULL, until timestamptz, kind text NOT NULL CHECK (kind IN (...the five kinds...)), subject text NOT NULL, node text NOT NULL DEFAULT '', namespace text NOT NULL DEFAULT '', pod_uid text NOT NULL DEFAULT '', detail jsonb NOT NULL DEFAULT '{}')` with indexes on `at` and on `pod_uid` where it is not empty. It creates `pod_deaths (key text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('session','ci','gate')), task_id text REFERENCES tasks(id), session_id text NOT NULL DEFAULT '', runner text NOT NULL DEFAULT '', at timestamptz NOT NULL, class text NOT NULL CHECK (class IN ('platform','own_limit','unknown')), record jsonb NOT NULL)` with an index on `at` where `class = 'platform'`. `task_id` is null for a CI pod. Templates: `20261117100000_intake_refusals.sql`, `refusal.go`, `PruneDeliveries` (`store.go:2463`).

- [ ] **Step 1: Write the failing PG tests** (template: `chat_test.go:17`, `schematest.DSN`).
  - `TestPlatformIncidentsAddOnce`: the same `Key` twice returns 1, then 0, and one row exists.
  - `TestPlatformIncidentsOverlapTheWindow`: a restart 10:00 to 10:04 is in the window 10:03 to 10:10 and not in 10:05 to 10:10. A kill at 10:06 with no `until` is in 10:05 to 10:10.
  - `TestPrunePlatformIncidents`: a row 31 days old goes, one 29 days old stays.
  - `TestPodDeathRoundTrip`: a session record with every field reads back equal through `SessionDeath`, a CI record through `CIDeath`. A second put of the same key replaces it.
  - `TestPlatformDeathsSince`: `own_limit` rows and rows before `since` stay out. A session, a CI and a gate death come back, newest first.
  - `TestLiveSessionKeepsItsPod`: `PodUID`, `Node`, `BootID` read back.
- [ ] **Step 2:** Run them against Postgres. Expected: FAIL.
- [ ] **Step 3:** Implement the migration, `clusterstore.go`, the `LiveSession` columns and the fake.
- [ ] **Step 4:** Run them. Expected: PASS. `internal/schema` tests pass (`names_test.go`, `split_test.go`).
- [ ] **Step 5:** Commit `factoryd: the incident log, the pods' death records, and each live session's pod`.

### Task 3: What the Kubernetes client reads

**Files:**
- Modify: `factoryd/kube.go`, `factoryd/kube_test.go`, the fakes in `factoryd/runner_test.go` (`fakeKube`), `factoryd/pg/helpers_3d_test.go` (`fakeKube`), `acceptance/divide_ledger_test.go` (`accKube`)

**Interfaces:**
- Consumes: the struct fields Task 1 added.
- Produces, on the `Kube` interface and `*InClusterKube`:
  - `PodDiagnosis` decodes `metadata.uid`, `spec.nodeName`, `status.startTime`, `metadata.deletionTimestamp` (`Deleting`), each condition's `lastTransitionTime` (`Since`), and each container's `resources.limits.memory` from the spec (`MemoryLimit`, matched by name, init containers too).
  - `NodeState(ctx context.Context, name string) (NodeState, error)`: `GET /api/v1/nodes?fieldSelector=metadata.name=<name>` (factoryd may list nodes, not get one). An empty list is `ErrNotFound`.
  - `Nodes(ctx context.Context) ([]NodeState, error)`: every node.
  - `PodEvents(ctx context.Context, namespace, pod string) ([]PodEvent, error)`: the pod's events, oldest first, at most 20 (the newest 20), each message cut to 200 bytes. `NewestPodEvent` becomes the last of `PodEvents`, so one decoder reads events.
  - `type ServicePod struct { Namespace, Name, UID, Node string; Containers []ServiceContainer }` and `type ServiceContainer struct { Name string; Restarts int; LastReason string; LastExitCode int32; LastStarted, LastFinished, RunningSince time.Time }`.
  - `ServicePods(ctx context.Context, namespace, selector string) ([]ServicePod, error)`: `GET /api/v1/namespaces/<ns>/pods?labelSelector=<selector>`. If `deployment_health.go`'s pod struct (190-245) holds these fields, both use one decoder.
- The fakes gain `nodeStates map[string]NodeState`, `podEvents map[string][]PodEvent` and `servicePods map[string][]ServicePod`.

- [ ] **Step 1: Write the failing tests** in `kube_test.go`, with the httptest server the existing `InClusterKube` tests use.
  - `TestPodDiagnosisReadsThePodsPlace`: a pod JSON with uid, nodeName, startTime, deletionTimestamp, a `DisruptionTarget` condition with lastTransitionTime and a 4Gi memory limit gives those fields.
  - `TestNodeStateReadsTheBootID`: the request path holds the field selector. A node with `bootID "b1"` and Ready `False` since 10:00 reads back. An empty list gives `ErrNotFound`.
  - `TestPodEventsOldestFirst`: three events out of order come back oldest first, and a 500-byte message is cut to 200.
  - `TestServicePodsReadTheLastTermination`: a container with `restartCount 2`, `lastState.terminated {reason "OOMKilled", exitCode 137, startedAt, finishedAt}` and `state.running.startedAt` reads back.
  - `TestNewestPodEventStillReadsTheNewest`: the existing behaviour holds.
- [ ] **Step 2:** Run `go test ./internal/factoryd/ -run 'TestPodDiagnosis|TestNodeState|TestPodEvents|TestServicePods|TestNewestPodEvent'`. Expected: FAIL.
- [ ] **Step 3:** Implement. Update the three fakes so `go build ./... && go vet ./...` pass.
- [ ] **Step 4:** Run the tests and `go test ./internal/factoryd/ ./acceptance/`. Expected: PASS.
- [ ] **Step 5:** Commit `factoryd: the Kubernetes client reads a pod's node and UID, a node's boot, a pod's events and the services' restarts`.

### Task 4: The incident pass and the kernel lines

**Files:**
- Create: `factoryd/incidents.go`, `factoryd/incidents_test.go`
- Modify: `factoryd/projectalerts.go` (`SigNoz`), `cmd/factoryd/main.go`

**Interfaces:**
- Consumes: `ParseKernelLine`, `KernelKill` (Task 1), `ClusterStore`, `PlatformIncident` (Task 2), `Kube.ServicePods`, `Kube.Nodes` (Task 3).
- Produces:
  - `type KernelSource interface { KernelLines(ctx context.Context, from, to time.Time) ([]KernelKill, error) }`.
  - `func (s *SigNoz) KernelLines(ctx context.Context, from, to time.Time) ([]KernelKill, error)`: `POST /api/v5/query_range` with the bearer token, under `s.mu`, logging in again once on a 401. Factor one authed request helper out of `FiringAlerts` so both use it. The body: `schemaVersion "v1"`, `start`/`end` in epoch milliseconds, `requestType "raw"`, one `builder_query` named `A` on signal `logs` with the filter `resource.service.name = 'talos-kmsg' AND (body CONTAINS 'Sending SIGKILL to cgroup' OR body CONTAINS 'oom-kill:')`, ordered by `timestamp` then `id` ascending, `limit 1000`. Each row of `data.data.results[0].rows` gives `ParseKernelLine(row.data.body, row.data.resources_string["k8s.node.name"], row.data.attributes_number.seq, row.timestamp)`. Rows that do not parse are skipped. A non-empty `nextCursor` is logged.
  - `type WatchedService struct { Name, Namespace, Selector string }` and `var WatchedServices`: `factoryd` (`factory`, `app=factoryd`), `factory-gateway` (`factory`, `app=factory-gateway`), `litellm` (`platform`), `openbao` (`platform`), `forgejo` (`forgejo`), `kube-apiserver` (`kube-system`, `component=kube-apiserver`). Read the Helm charts' pod labels for LiteLLM, OpenBao and Forgejo from the infra repository and pin each selector in a test. The controller checks all six against the live cluster at the roll.
  - `type IncidentSweep struct { Store ClusterStore; Kube Kube; Kernel KernelSource; Now func() time.Time }` and `func (w *IncidentSweep) Run(ctx context.Context) error`.
  - `const KernelWindow = 15 * time.Minute`.

`Run` reads each source on its own. An error of one source is joined into the result and the others still run.
1. With a `Kernel`: the kills of `[now-KernelWindow, now]` become `guard_kill` or `kernel_oom` rows, `Key "kmsg/<node>/<seq>/<at RFC3339Nano>"`, `Subject` the pod UID, `Detail {"constraint"}` for kernel kills.
2. Each watched service's pods: each container with a `LastFinished` becomes a `restart` row, `Key "restart/<pod uid>/<container>/<LastFinished RFC3339>"`, `At LastFinished`, `Until RunningSince` (none when zero), `Subject` the service name, `Detail {"container", "reason", "exit_code"}`.
3. Each node: a `node_boot` row, `Key "boot/<node>/<bootID>"`, `At now`. A node not Ready: a `node_not_ready` row, `Key "notready/<node>/<Since RFC3339>"`, `At Since`.
4. `PrunePlatformIncidents(IncidentRetention)`.

In `cmd/factoryd/main.go`: `passes.Run(ctx, "platform_incidents", time.Minute, 2*time.Minute, sweep.Run)` with `Store: store`, `Kube: kube`, `Kernel: signoz`.

- [ ] **Step 1: Write the failing tests.**
  - `TestSigNozKernelLinesQueriesTheWindow`: an httptest SigNoz answers the login and `query_range`. The request body's filter expression equals the one above, and `start`/`end` equal the window in milliseconds. Two rows, a guard kill on `sf-2` with `seq 711` and a line that does not parse, give one `KernelKill`.
  - `TestSigNozKernelLinesLogsInAgainAfter401`: the first query answers 401, the second 200. Two logins and one result.
  - `TestIncidentSweepRecordsEachSourceOnce`: fakes give one kill, one restart, two nodes with one not Ready. Two runs give 5 rows.
  - `TestIncidentSweepKeepsGoingWhenOneSourceFails`: the kernel source errors. The restart and node rows are written, and `Run` returns the error.
  - `TestWatchedServicesSelectors`: the six selectors, pinned.
- [ ] **Step 2:** Run `go test ./internal/factoryd/ -run 'TestSigNozKernelLines|TestIncidentSweep|TestWatchedServices'`. Expected: FAIL.
- [ ] **Step 3:** Implement and wire the pass.
- [ ] **Step 4:** Run the tests and `go build ./...`. Expected: PASS.
- [ ] **Step 5:** Commit `factoryd: a pass each minute records the platform's kills, the services' restarts and the nodes`.

### Task 5: The death record at a session's end

The record replaces `SessionKill` in this task.

**Files:**
- Create: `factoryd/sessiondeath.go`, `factoryd/sessiondeath_test.go`, `schema/migrations/factoryd/20261129100100_case_death.sql`
- Modify: `factoryd/runner.go`, `factoryd/activities.go`, `factoryd/workflow.go` (`SessionResult`, `OutcomePlatformKilled`, `taskRun.killed`), `factoryd/ladder.go`, `factoryd/casefacts.go`, `factoryd/rung1.go`, `factoryd/metrics.go`, `factoryd/carddigest_timeline.go`, `factoryd/pg/pg.go`, `harness/types.go`, `cmd/agent-worker/main.go`, `cmd/factoryd/main.go`
- Replace: `factoryd/sessionkill_test.go`, `factoryd/pg/sessionkill_pg_test.go`, the kill rows of `factoryd/pg/rung1_ladder_pg_test.go`

**Interfaces:**
- Consumes: Tasks 1 to 4.
- Produces:
  - `RunnerConfig` gains `Cluster ClusterStore` and `Kernel KernelSource`. Nil skips their reads. `main.go` passes `store` and `signoz`.
  - `const OutcomePlatformKilled SessionOutcome = "platform_killed"`.
  - `SessionResult.Death *DeathRecord` with JSON key `death`, in place of `Killed`. `taskRun.killed` becomes `taskRun.death`, still behind `versionSessionKill` (keep the `GetVersion` read and its change id, so recorded histories replay). `TripInput.Death`, `CaseFacts.Death` (JSON `death`) replace `Killed`.
  - `harness.Result` gains `Stopped bool` (JSON `stopped`, omitempty). The worker's `deliver` sets it on a SIGTERM.
  - `SessionEndFact` gains `Cause string`. Its event row and the `session_end` timeline line carry `cause` (`DeathRecord.Short()`). The card digest shows `<outcome words>: <cause>` when a cause is set.
  - `type deathReader struct { kube Kube; cluster ClusterStore; kernel KernelSource; wait time.Duration }` and `func (d deathReader) read(ctx context.Context, in deathInput) DeathRecord` with `type deathInput struct { ns, pod string; uid, node, boot string; started, ended time.Time; stoppedByFactory, afterRestart bool; lastCommand, lastPush string }`. An empty `uid` or `node` is taken from the pod's end read. `Runner` holds one (`wait` 90 seconds, shorter in tests) and calls it as `r.deathOf`. Task 9 gives the CI spawner and the gates one.

**How it runs:**
- `awaitPodStart` returns the `PodDiagnosis` it read when the phase left Pending. `runSession` then reads `NodeState(node)` and calls `PutLiveSession` with `PodUID`, `Node`, `BootID` set, before `progress(0)`. On reattach the values come from the live row.
- `read` reads `PodDiagnosis` (`ErrNotFound` sets `PodGone`), `NodeState` (`ErrNotFound` sets `NodeGone`, another error leaves `Node` nil), the pod's kills from `Cluster.PodIncidents` and from `Kernel.KernelLines(started-1m, now)` filtered to the UID, then `Classify`. If the rule is `none`, an exit code is 137 and a `Kernel` exists, it asks the kernel lines again every 15 seconds for up to `wait`, and stops at the first error. Then it adds the pod's `PodEvents`, the `restart` incidents of `Cluster.PlatformIncidents(started, ended)` as `Restarts` (cause `guard` or `kernel` when a kill of the same pod UID lies within one minute of the restart), and `Lines = GateLines(record, lastPush)`.
- `runSession` calls `deathOf` in `ended` (with `stoppedByFactory` true when factoryd sent the stop), and after the session when `out.result.Stopped` is true and `out.trip` is nil (a SIGTERM factoryd did not send). The result lands in `sessionOutcome.death`.
- `sessionResult` copies it to `res.Death`. A `platform` death turns `no_push` and every trip outcome into `OutcomePlatformKilled`. A pushed session keeps its outcome.
- `RunSession` stores the record with `Cluster.PutPodDeath` (kind `session`). A store error is logged, not returned. The timeline line and the `SessionEndFact` carry the cause.
- The reattach that finds the pod gone (`activities.go:1222-1226`, `ErrNotFound`, same activity) builds the record with `afterRestart`, stores it under `l.SessionID`, and adds its lines to the fresh session's findings.
- Rung 1's statement (`rung1.go:97-98`) and its session note (`rung1.go:328-330`) read `CaseFacts.Death`. For `memory_limit` the sentence stays `The sandbox killed the last session for its memory (<reason>, exit code <n>) while it ran: <command>`. For any other class but `unknown`: `The last session ended: <Short>.`, followed by `while it ran: <command>` when one is known.
- The migration rewrites each stored case's `killed` facts into `death` facts: `class "own_limit"`, `rule "memory_limit"`, `exit_code`, `reason`, `container`, and `command` as `last_command`. Read the `cases` table's facts column name from the schema.

- [ ] **Step 1: Write the failing tests** (templates: `TestEvictionRecorded` runner_test.go:2211, `TestStoppedWorkerNamesHowItEndedWithoutAResult` :2628, `TestRunSessionReattachFindsNoPodAndStartsOver` :3195, `TestOpenTripCarriesTheSessionKill`).
  - `TestPodStartRecordsItsPlace`: after the start, the live row holds the pod's UID, node and the node's boot ID.
  - `TestAGuardKillIsAPlatformDeath`: the pod ends `Error` 137 and the fake kernel source names its UID. The outcome is `platform_killed`, the rule `guard_kill`, the record is stored, and the timeline line's cause is `the node's memory guard killed the pod`.
  - `TestOwnMemoryLimitStaysAnAttempt`: `OOMKilled` with a 4Gi limit and last command `go test -race ./...`. The outcome stays `no_push`, the class is `own_limit`, and the line is Task 1's exact text.
  - `TestTmpEvictionIsOwnLimit` and `TestNodePressureEvictionIsPlatform`, from the two eviction messages of Task 1.
  - `TestAClusterStopIsAPlatformDeath`: the worker reports `Stopped`, factoryd sent no stop, and the pod holds `DisruptionTarget` `PreemptionByScheduler`. The outcome is `platform_killed`, the rule `disruption`.
  - `TestTheFactorysStopIsNoPlatformDeath`: a wall-clock stop deletes the pod. No `platform` record.
  - `TestTheKillWaitEnds`: exit 137, the kernel source answers nothing. The record is `unknown` after the bound. A kernel source that errors gives `unknown` at once. (Review Focus 1.)
  - `TestAGoneNodeIsAPlatformDeath`: `NodeState` answers `ErrNotFound`. The rule is `node_not_ready`. (Review Focus 2.)
  - `TestReattachFindsThePodGone`: the live row holds pod facts, the pod is gone. A record with `gone_after_restart` is stored under the old session ID, and the fresh session's findings hold its line.
  - `TestAnOldResultWithAKillDecodes`: `{"Outcome":"no_push","killed":{"reason":"OOMKilled","exit_code":137}}` unmarshals into `SessionResult` without error, `Death` nil. (Review Focus 5.)
  - `TestTripFactsCarryTheDeath` and the PG `TestOpenTripCarriesTheDeath`, replacing the session-kill tests. `TestCaseDeathMigration`: a case stored with `killed` reads back with `death` after the migration.
  - `TestDigestShowsTheCause`: a `session_end` line with outcome `platform_killed` and a cause renders `platform killed: the node's memory guard killed the pod`.
  - `TestDeliverMarksAStop` in `cmd/agent-worker`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. Delete `SessionKill`, `killOf` and their tests.
- [ ] **Step 4:** Run the full suite with Postgres and `bash check static`. Expected: PASS.
- [ ] **Step 5:** Commit `factoryd: a session that ends without a push gets a death record, which names every kill`.

### Task 6: A platform death is free, and three open a case

**Files:**
- Create: `schema/migrations/factoryd/20261129100200_platform_fault_kind.sql`
- Modify: `factoryd/workflow.go`, `factoryd/runner.go` (`onTrip`), `factoryd/alerts.go`, `factoryd/cases.go`, `factoryd/kinds.go`, `factoryd/cases_events.go`, `factoryd/ladder.go`, `factoryd/faces_copy.go`, `factoryd/metrics.go`, `factoryd/pgexport_pg_split_move_3f.go` (if the PG tests need the words), `facefixtures/fixtures.go`, `console/gallery_test.go`, `factoryd/checkin_failed_test.go`, `factoryd/agentdocloop.go`
- Test: `factoryd/workflow_test.go`, `factoryd/runner_test.go`

**Interfaces:**
- Consumes: `OutcomePlatformKilled`, `SessionResult.Death` (Task 5), `Runner.deathOf`.
- Produces:
  - `const CasePlatformFault CaseKind = "platform_fault"`, a `caseKinds` row `{Kind: CasePlatformFault, Words: "sessions the platform ended", NoRung1: "the check-in cannot judge the platform", Rung2: rung2Decides}`, the face `modelStop` as for `pod_never_started`, and every registry the map lists: `CaseKinds()`, `caseSourceKinds["platform"]`, `tripNext`, `CaseFaces`, `stopSentences`, the healed-resume prefixes (`workflow.go:1641-1645`), the face fixtures, the gallery fixture, the face table of `checkin_failed_test.go`.
  - `const platformEnded = "The platform ended the card's last sessions: "` and `func PlatformEndedReason(n int, last DeathRecord) string` giving `platformEnded + "<n> in a row. The last: <Short>."`. `EscalationSource` maps the prefix to `"platform"`.
  - `taskRun.platformDeaths int` and `const platformDeathsAsk = 3`.

**How it runs:**
- In the session loop, after the provider-refused block (`workflow.go:1944-1951`): an `OutcomePlatformKilled` result keeps the start point and parent as the provider-refused path does for a pushed commit, sets the next input's own findings to `res.Death.Lines`, counts `platformDeaths`, asks through `awaitHuman(PlatformEndedReason(...))` at 3 (and resets the count), and `continue`s. It reaches no agent time, no attempt count and no `sessionReturn`. Any other end resets the count where `pendingPods` resets.
- No new Temporal version: the new branch runs only on an outcome that no recorded history holds.
- `handoverLines` appends `res.Death.Lines` for an `own_limit` death.
- `onTrip` (`runner.go`, after the wall-clock branch, before `interimPush`): a `no_progress` trip calls `deathOf`. A `platform` record ends the session at once: it records the trip as abandoned, deletes the pod without the stop's grace wait (a `NotFound` is fine), sets `out.death`, and makes no check-in call. Any other class goes on as today.
- The divide-and-conquer SQL (`metrics.go:2217`, `:2256`) leaves out `platform_killed` as it leaves out `not_started`.
- The migration rewrites `cases_kind_check` with every kind of `20261126100000_provider_freeze_kind.sql` plus `platform_fault`.
- The coding agent's page (`agentdocloop.go`) shows a findings span holding a platform line, so the agent pages show what the next session reads.

- [ ] **Step 1: Write the failing tests** (templates: `TestWorkflowSessionWhosePodNeverStartedIsNoAttempt` workflow_test.go:3118, `TestWorkflowPodsThatNeverStartAskAHumanAtTheBound` :3141, `TestRunSessionLiveCheckinOpensWithThePolicysCalls` runner_test.go:1804).
  - `TestWorkflowPlatformDeathIsNoAttempt`: a `platform_killed` session, then a pushed one. `TaskUsage` counts one attempt and only the second session's agent time. The model does not climb. The second session's findings hold the death's lines.
  - `TestWorkflowThreePlatformDeathsOpenACase`: three in a row ask once, with `EscalationSource` `"platform"` and kind `platform_fault`. Two, a pushed session, then two more ask nothing.
  - `TestWorkflowOwnLimitDeathHandsOverItsLine`: the next findings hold the `own_limit` line.
  - `TestNoProgressOnALostNodeEndsWithoutACheckin`: hanging logs, the `no_progress` detector, `NodeState` not Ready. The outcome is `platform_killed`, and the scripted check-in got no call.
  - `TestNoProgressOnAHealthyNodeStillAsksTheCheckin`: same, node Ready. The check-in is called.
  - The guard tests pass with the new kind: `TestKindListsHoldEveryConstant`, `TestEveryCaseKindHasWords`, `TestEveryKindHasAFace`, `TestEveryFaceMatchesWhatAReplyDoes`, `schema.TestKindChecksAccept`, the gallery test.
  - `TestPlatformFaultSkipsTheCheckin`: `rungOneJudges` is false for the kind and rung 2 takes it.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the full suite with Postgres and `bash check static`. Expected: PASS.
- [ ] **Step 5:** Commit `factoryd: a session the platform ended costs the card nothing, and three in a row go up the ladder`.

### Task 7: The tool `cluster_facts`

**Files:**
- Create: `factoryd/clusterfacts.go`, `factoryd/clusterfacts_test.go`
- Modify: `factoryd/checkin.go`, `factoryd/runner.go` (`runnerTools.Tool`), `factoryd/rung1.go`, `policy/policy.go` (`ChatTools`), `console/chat_tools.go`, `console/access.go`, `console/console.go`, `console/chat_page_tools.go`, `console/console_test.go` (rig), `cmd/factoryd/main.go`, the tool-list tests (`runner_test.go:1989`, `console/chat_test.go:1624` and `:2066-2079`, `acceptance/write_tools_stream_test.go:496-500`), `docs/manual/console.md`, `docs/manual/gates.md`

**Interfaces:**
- Consumes: `ClusterStore` (Task 2), `DeathRecord` (Task 1).
- Produces:
  - `func SessionFactsText(ctx context.Context, s ClusterStore, taskID, sessionID string) (string, error)`.
  - `func IncidentsText(ctx context.Context, s ClusterStore, since, until, now time.Time) (string, error)`.
  - `type FactsRefusal struct { Msg string }` with `Error()`.
  - `const clusterFactsMax = 12 << 10`, cut as `deployment_health.go:406-412` does.
  - `console.Config.ClusterFacts func(ctx context.Context, taskID, sessionID string, since, until time.Time) (string, error)`, required by `New`.

The session text holds `class`, `rule`, `at`, `node`, `pod`, `exit code` with reason, `kill` (memory guard or kernel), `last command`, the service restarts in the session's life, the pod's events, and the lines given to the next session, one fact per line. The window text holds one line per incident: time, kind, subject, node, and the detail fields. Refusals:
- `session <id> has no death record: it ended with a push or before the factory recorded deaths. Read card_step for its end.`
- `a window holds at most 24 hours: ask with since and until at most 24 hours apart.`
- `until comes before since: ask with since before until.`
- `the incident log keeps 30 days: ask for a window after <date>.`

The surfaces:
- Check-in: `{Name: "cluster_facts", Description: "what the cluster did to a session of this card (session, default the one you check) or the platform's incidents of a window (since, until, RFC 3339, at most 24 hours)"}`, appended at the end of `checkinTools`. Add it to `checkinToolsLine` and to `rungToolsLine`. The check-in's default session is `p.ask.ParentSession`. Rung 1's is the newest (`newestRecord`). Both read only their own card.
- Chat: `cluster_facts` after `deployment_health` in `ChatTools` and in the console's `tools`, access `rMember`, parameters `task_id` and `n` (the session's number, as the `session` tool takes it) or `since` and `until`. The card resolves through `t.card(in)` and the number through the `sessions` read. New `toolInput` fields `Since`, `Until`.

- [ ] **Step 1: Write the failing tests.**
  - `TestSessionFactsTextHoldsTheFields`: a stored guard-kill record with one restart and two events gives each field line. A record whose text passes 12 KiB is cut and ends `[N bytes cut]`.
  - `TestIncidentsTextRefusals`: each of the four refusals, exact.
  - `TestCheckinOffersClusterFacts`: the updated exact list text of `runner_test.go:1989` ends `..., git_log, cluster_facts and answer`. The check-in's call with no arguments reads its parent session's record.
  - `TestRungOneReadsClusterFacts`: rung 1 reads the newest session's record and refuses another card's session.
  - `TestChatClusterFactsReadsACardsSession` and `TestChatClusterFactsRefusesAnotherProjectsCard`, in the style of `chat_pages_parity_test.go:395-419`.
  - The updated list tests: `chat_test.go:1624`, `:2066-2079`, `TestWriteToolsTable`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement and wire `Config.ClusterFacts` in `main.go`. Update `docs/manual/console.md` (the chat's read tools) and `docs/manual/gates.md` (rung 1's tools).
- [ ] **Step 4:** Run the full suite with Postgres and `bash check static`. Expected: PASS.
- [ ] **Step 5:** Commit `factoryd, console: the check-in, rung 1 and the chat read what the cluster did through cluster_facts`.

### Task 8: The human's card when platform deaths pile up

**Files:**
- Create: `factoryd/platformcard.go`, `factoryd/platformcard_test.go`, `factoryd/pg/platformcard_pg_test.go`, `schema/migrations/factoryd/20261129100300_platform_deaths_kind.sql`
- Modify: `factoryd/kinds.go`, `factoryd/cases.go`, `factoryd/cases_events.go`, `factoryd/faces_copy.go`, `factoryd/source_briefs.go`, `factoryd/chat_escalation.go` (`askAtOnce`), `facefixtures/fixtures.go`, `console/gallery_test.go`, `factoryd/human_face_test.go`, `factoryd/held_card_test.go`, `factoryd/checkin_failed_test.go`, `cmd/factoryd/main.go`, `docs/manual/tasks.md`

**Interfaces:**
- Consumes: `ClusterStore.PlatformDeaths` (Task 2), `DeathRecord.Short()` (Task 1), `FileHumanCard`, `closeIssueAsFactory`, `humanCardStore`.
- Produces:
  - `const SourcePlatformDeaths = "platform_deaths"`, `const CasePlatformDeaths CaseKind = "platform_deaths"` with a `caseKinds` row (`Words: "platform deaths"`, `NoRung1` and `Rung2: rung2Nothing` as the freeze card's row), `CaseFaces[CasePlatformDeaths] = humanFace`, a source brief, the source in `askAtOnce`, and every registry the map lists for a human source.
  - `type PlatformCardStore interface` embedding `humanCardStore`, with `PlatformDeaths`, `PlatformCards(ctx context.Context) ([]Task, error)` (source `platform_deaths`, newest first, any status), `FacePlatformCard(ctx context.Context, id, objective, info string) error` (one transaction, as `FaceFreezeCard`), and `Task`.
  - `type PlatformCard struct { Store PlatformCardStore; Forgejo *Forgejo; Timeline *Timeline; Now func() time.Time }` and `func (w *PlatformCard) Check(ctx context.Context) error`.
  - `const platformDeathsFile = 3`, `const platformDeathsWindow = 24 * time.Hour`.

**How it runs** (template: `MonthAlarm`, monthcap.go):
- The deaths are `PlatformDeaths(now - 24h)`, less those at or before the end of the newest closed platform card.
- An open platform card (`waiting-human` or `waiting-agent`) gets its face written again when it differs. No second card is filed.
- With no open card and at least 3 deaths, `FileHumanCard` files one on the repository of the newest death that has a card. Title: `The platform ended <n> sessions in 24 hours`. The face lists each death, newest first, at most 10, as `<hh:mm> UTC, card #<issue>: <Short> on <node>` for a session, `<hh:mm> UTC, a gate of card #<issue>: ...` for a gate pod and `<hh:mm> UTC, CI job <runner>: ...` for a CI pod, then `and <k> more` if needed. A CI death alone files on the configuration repository (`configRepo`), as the month alarm does. The answers are close as noted and park, as the freeze card offers them without retry.
- In `main.go`: `passes.Run(ctx, "platform_card", time.Minute, 2*time.Minute, card.Check)`.

- [ ] **Step 1: Write the failing tests** (templates: `TestMonthAlarmFilesTheCapIssueOnce` monthcap_test.go:147, `TestFreezeCardOnePerClass` freezecard_test.go:296).
  - `TestPlatformCardFilesAtThree`: two deaths file nothing. Three file one card, on the newest death's repository, with its issue at once.
  - `TestPlatformCardUpdatesInPlace`: a fourth death rewrites the face. Still one card.
  - `TestPlatformCardAfterACloseCountsNewDeathsOnly`: a closed card and the same three deaths file nothing. Three later deaths file a new card.
  - `TestPlatformCardFaceIsPlain`: the face passes `HumanFaults` and `TextFaults`.
  - The PG test `TestPlatformCardFaceIsOneWritePG`.
  - The guard tests with the new source and kind: the kind lists, faces, gallery, human faces, source briefs, held-card statuses.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement and wire the pass. Update `docs/manual/tasks.md`.
- [ ] **Step 4:** Run the full suite with Postgres and `bash check static`. Expected: PASS.
- [ ] **Step 5:** Commit `factoryd: the human gets one card when the platform ends three sessions in 24 hours`.

### Task 9: CI runner pods and gate pods (phase 2)

**Files:**
- Modify: `factoryd/ci.go` (`CISpawner.reconcile`), `factoryd/killedcheck.go`, `factoryd/gates.go` (`runnerPod`, the early-end texts), `cmd/factoryd/main.go`
- Test: `factoryd/ci_test.go`, `factoryd/activities_test.go` (the `killedRig` tests), `factoryd/criteria_test.go`, `factoryd/gates_test.go`
- Map: `map-ci-gates.md` in the plan's workspace holds the paths below with their lines.

**Interfaces:**
- Consumes: `deathReader`, `deathInput` (Task 5), `ClusterStore.PutPodDeath`, `CIDeath` (Task 2), `DeathRecord.Short()` (Task 1).
- Produces:
  - `CISpawner` gains a `deathReader` (`wait` 0: teardown never waits).
  - `func runnerOfLog(log []byte) string`: the runner name from a job log's opening line `<name>(version:...) received task ...`, `""` when none.
  - `const ciPlatformReruns = 2`.

**How it runs:**
- CI pods (`ci.go` reconcile, before `teardown`): when the pod ended `Failed`, was not found, or its kernel kills (`Kernel.KernelLines` over the pod's life, filtered to its UID) are not empty, read the death (`stoppedByFactory` false) and store it as kind `ci`, runner `ci-job-<id>`. A pod that ended `Succeeded` with no kill gets no record.
- `killedJob` keeps the kill markers and `runnerDied` as the sign that a job was killed. The runner comes from `runnerOfLog`, and the record from `CIDeath`:
  - `platform`: the job re-runs while its attempt is at most `ciPlatformReruns`. Note: `job %q of CI run %d: the platform ended its pod (<Short>), so a re-run follows` and, past the bound, `job %q of CI run %d: the platform ended its pod again (<Short>) at attempt %d: no further re-run follows`.
  - `own_limit`: no re-run. Note: `job %q of CI run %d was killed (%s): <Short>, which is the job's own use, so no re-run follows`.
  - No record, or `unknown`: today's single re-run and notes.
- Gate pods (`runnerPod`): when `read` returns the early end (`errLogEnded`, or the proofs pod's early end), read the death of `repro-<id>` and store it as kind `gate` with the task's ID. A `platform` death prefixes the gate's text: the reproduction error becomes `the platform ended the reproduction pod (<Short>) before it reported`, and each unreported proofs entry gets `the platform ended the proofs pod (<Short>) before it reported this entry` in place of `proofsEndedEarly`. Any other class keeps today's texts.

- [ ] **Step 1: Write the failing tests** (templates: `TestCISpawnerReconcileTearsDownFailedPod` ci_test.go:364, `TestWaitChecksRerunsAKilledJobOnceAndPasses` activities_test.go:4535, `TestGateCriteriaKeepsTheRunsOfAPodThatEndedEarly` criteria_test.go:1711).
  - `TestCISpawnerRecordsAPlatformEnd`: a CI pod `Failed` with a guard kill for its UID. A `ci` death with runner `ci-job-<id>` and class `platform` is stored before the namespace goes. A `Succeeded` pod without kills stores nothing.
  - `TestRunnerOfLog`: `ci-job-42(version:v12.7.3) received task 7 of job test, be triggered by event: push` gives `ci-job-42`. A log without that line gives `""`.
  - `TestWaitChecksRerunsAPlatformKillTwice`: attempts 1 and 2 re-run with the platform note, attempt 3 does not.
  - `TestWaitChecksNeverRerunsAnOwnLimitKill`: a kill marker and an `own_limit` record: no re-run, the note names the limit.
  - `TestWaitChecksWithoutARecordKeepsTheOneRerun`: today's tests stay green unchanged.
  - `TestAPlatformEndedProofsPodSaysSo`: an early end with a `platform` death gives the new entry text. Without one, `proofsEndedEarly` stays.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement and wire the readers in `main.go`.
- [ ] **Step 4:** Run the full suite with Postgres and `bash check static`. Expected: PASS.
- [ ] **Step 5:** Commit `factoryd: CI and gate pods get death records, and a CI job's re-run follows its cause`.

### Task 10: The nodes' kernel log reaches SigNoz (infra)

**Files** (infra repository):
- Modify: `talos/patches.yaml`, `k8s/platform/k8s-infra/helmrelease.yaml`, `k8s/platform/k8s-infra/policy.yaml`, `README.md` (section "Telemetry"), `talos/README.md`
- Create: a receiver test after the pattern of `scripts/collector-namespace-test/test.sh`

**What it adds:**
- In `patches.yaml`, a document with a short comment above it, as the `OOMConfig` document has:
  ```yaml
  apiVersion: v1alpha1
  kind: KmsgLogConfig
  name: otel-agent
  url: tcp://127.0.0.1:5170/
  ```
- In the k8s-infra values, `otelAgent.ports.kmsg: {enabled: true, containerPort: 5170, servicePort: 5170, hostPort: 5170, protocol: TCP}`, the receiver `tcplog/kmsg` (listen `0.0.0.0:5170`, resource `service.name: talos-kmsg`, a `json_parser` that takes the time from `attributes["talos-time"]` with the layout `2006-01-02T15:04:05.999999999Z07:00`, then a `move` of `attributes.msg` to `body`), and `tcplog/kmsg` as the `logs` pipeline's receiver. Every other value stays.
- In the agent's network policy, `ingress` admits `fromEntities: [host]` on TCP 5170 only.
- The comments and the README say what the agent now receives.

- [ ] **Step 1: Write the failing test:** the receiver test runs the pinned collector image with the agent's rendered receiver and a file exporter, sends the real guard-kill line and a kernel `oom-kill:` line as Talos JSON lines over TCP, and checks the body, the record time and `service.name`.
- [ ] **Step 2:** Run it. Expected: FAIL (no receiver yet).
- [ ] **Step 3:** Make the changes.
- [ ] **Step 4:** Run the test. `helm template` of the pinned chart with the values renders the port, the hostPort and the receiver in the `logs` pipeline. The repository's config checks pass.
- [ ] **Step 5:** Commit `k8s-infra, talos: each node's kernel log reaches SigNoz, the memory guard's kills included`.

### Task 11: Land, roll, apply and check live (controller)

- [ ] **Step 1:** The final whole-branch review on the most capable model, then its fixes, re-reviewed.
- [ ] **Step 2:** Docs repository: `docs/architecture.md` (the session's end, the outcomes, the incident log, the tool, the human card), the spec's status, and `docs/agents/` regenerated with `cmd/agentdoc`.
- [ ] **Step 3:** Start the cluster with the infra repository's `scripts/factory-on` if it is off. Wait for Forgejo, factoryd and Flux.
- [ ] **Step 4:** Land the code branch on `main` (rebase, full suite, push to both remotes) and the infra branch on `main` (push to both remotes). Let CI build, roll by the build ledger's recipe, and check that factoryd and the gateway run the new commit. Run `node launch/site/evidence.js` once the mains moved.
- [ ] **Step 5:** Apply the `KmsgLogConfig` to each node in turn: a dry run filtered to the new document and showing no reboot, then `talosctl patch mc --mode=no-reboot` with a file that holds only that document. Never print the machine config.
- [ ] **Step 6:** Check live:
  - SigNoz holds logs with `service.name = 'talos-kmsg'` from all three nodes.
  - `platform_incidents` fills: one `node_boot` row per node, and restarts of the watched services if any happened. All six selectors match pods.
  - In a scratch namespace under gVisor with the session pod's limits, provoke three ends: a pod over its memory limit, a pod over its `/tmp` limit, and a pod deleted from outside. Save each pod's JSON and its kernel lines as test fixtures, and add a test that classifies them (`own_limit` `memory_limit`, `own_limit` `storage_limit`, `platform` `deleted`). This settles how gVisor reports each kill. Delete the namespace.
- [ ] **Step 7:** The audit of the last 30 days (§9): run the rules over the session ends that the events and kernel lines still cover, and report a count per class to Sebastian.
- [ ] **Step 8:** Leave the cluster in the state it was in before Step 3, and say so in the report.
