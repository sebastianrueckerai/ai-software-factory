# Cluster facts: what the platform did to a session, recorded by code

**Status:** approved by Sebastian on 2026-11-23 with the four decisions in section 7 as proposed. Written 2026-11-21, read against the code by a second reviewer. Code main at `f56249721`, infra main at `462f376`.

**Code:** `~/repos/ai-software-factory-code`. Paths below are relative to its `internal/` unless shown in full.

## 1. Intent

Kubernetes and Talos killed pods for weeks, and nobody noticed. A session that the platform kills looks the same as a session whose agent gave up: the card shows "no push", pays for the attempt and moves toward the stronger model. No agent can see what the cluster did, so no agent can explain a crash, and the human learns nothing either.

Sebastian wants two things:

- An agent that investigates a crash can see what happened at the infra and cluster level.
- When a session died for a cluster reason, the next session of the card gets that fact as context. A gate lets through only the facts that concern that session, so no agent gets a flood of cluster noise.

This proposal puts both on one record. Code writes a death record for each session that ends without a push. The record names the cause class by fixed rules. The next session reads a short line from it, and the investigating agents read the full record through one tool.

## 2. Where things stand

### 2.1 What the cluster did

Talos's memory guard (its userspace OOM controller) killed 182 pods between 2026-11-12 and 2026-11-18. These are the kills still in the nodes' kernel logs. The ring buffer of sf-0 starts on 2026-11-14 and the one of sf-2 on 2026-11-12, so earlier kills are lost. The last kill was on 2026-11-18 at 12:06 UTC. The fix of that week is live on all three nodes: the new `OOMConfig` and a kubelet `systemReserved` of 2560Mi (allocatable memory is now 13,240,268 KiB per node).

Each kill below matches a pod UID in the kernel log to a pod name in SigNoz's Kubernetes events.

| pod | kills |
|---|---|
| ClickHouse (SigNoz's database) | 129 |
| kube-apiserver (37 on sf-2, 2 on sf-0) | 39 |
| Forgejo | 14 |

No session pod was among them. Session pods set a memory limit on every container (`factoryd/runner.go:3090-3110`), and the memory guard spared pods with a limit. The kills reached sessions through the services they use: the API server that factoryd reads the pod through, and Forgejo that the session clones from and pushes to.

The session namespaces (`factory-agents-*`) logged these failure events in SigNoz from 2026-10-22 to 2026-11-21. ClickHouse refused the query on some days, so the counts are a lower bound.

| event | count |
|---|---|
| `FailedScheduling`: Insufficient ephemeral-storage | 1,132 |
| `BackOff` pulling the `ci-runner` image | 113 |
| `Failed` pulling the `ci-runner` image | 20 |
| `Evicted`: EmptyDir volume `tmp` over its limit | 1 |

The factory's own notes on cards #2009, #2010, #2011 and #2043 name four `/tmp` evictions on 2026-11-15 and 2026-11-16. A test script left PostgreSQL servers in `/tmp` after a killed run and filled the 4 GiB volume. That cause is fixed in code main, and `/tmp` is now 8 GiB.

From 2026-11-09 to 2026-11-21 sessions ended 244 times with a push, 103 times with `no_push`, 94 times with `provider_refused` and 31 times at `wall_clock`. The records cannot say which of the 103 `no_push` ends the cluster caused. On 2026-11-14 to 2026-11-18, 21 of 42 `no_push` ends fell between 5 minutes before and 15 minutes after a memory-guard kill. ClickHouse died 1.3 times an hour in that time, so kills at random times would put about 15 ends there. The timing neither proves nor rules out a link, and the records hold nothing else to decide it. That gap is the problem this proposal closes.

### 2.2 What factoryd sees of a session's end

- factoryd learns that a session ended when the pod's log stream closes. It then reads the pod once with a GET (`PodDiagnosis`, `factoryd/kube.go:647`). It never watches pods and never looks at the node.
- `exitedHow` (`factoryd/runner.go:2405`) turns the pod into text: "evicted: " and the kubelet's message, or the first container that ended with a failure, its reason and its exit code. `killOf` (`factoryd/runner.go:740`) names a kill only when the reason is exactly `OOMKilled`.
- factoryd never reads the pod's node, its UID, `lastState`, a deletion, the node's state or the namespace's events. `PodDiagnosis` decodes every pod condition (`factoryd/kube.go:667`), but no code acts on a `DisruptionTarget` condition.
- The outcome is `OutcomeNoPush` (`factoryd/workflow.go:307`). It counts as an attempt, adds its agent time, and counts toward the stronger model (`factoryd/workflow_stages.go:531-555`). No case opens.
- The `session_end` event row drops the summary (`factoryd/metrics.go:245`). The card digest shows only "no push".
- The next session gets the summary as a finding line, for example: `previous session ended without a pushed commit: pod exited without a result: container worker terminated with OOMKilled (exit code 137)`.
- A kill with the reason `OOMKilled` also rides the card's next stops as a case fact, `SessionKill` (`factoryd/runner.go:1102`, `factoryd/casefacts.go:200`, `factoryd/ladder.go:50`). Only the rungs read it.

These causes end up as an agent failure or a silent timeout today:

1. A kill by Talos's memory guard. The kubelet most likely reports it as `Error` with exit code 137, not as `OOMKilled`. This is not verified.
2. A SIGTERM from the cluster: a drain, a preemption or an eviction with a grace period. The worker takes it as factoryd's stop and writes "stopped; work in progress pushed" (`cmd/agent-worker/main.go:504`), so `exitedHow` never runs.
3. A lost node. It shows as a `no_progress` trip (`factoryd/supervise.go:372-383`). The session supervisor's model then judges it as agent behaviour and turns it into `redirect`, `retry_stronger` or `escalate` (`factoryd/activities.go:1635-1658`).
4. A pod gone before the GET. The text is the bare "pod exited without a result".
5. A pod that died while factoryd was down. The reattach deletes the live row, and the session gets no `session_end` (`factoryd/activities.go:1222-1225`).
6. An eviction. The text names it, but the card still pays and climbs.

Two causes are already free for the card. `not_started` (a pod that stayed Pending) costs no attempt and no agent time, and three in a row ask a human (`factoryd/workflow.go:1924-1932`). `provider_refused` costs no attempt and waits out the provider's reset (`factoryd/workflow.go:314-317`).

### 2.3 What agents can read

- **Check-in:** `transcript_search`, `transcript_read`, `card_facts`, `card_step`, `gates`, `read_file`, `grep`, `git_log` (`factoryd/checkin.go:651-666`). Nothing about the cluster.
- **Rung 1:** the same tools without `git_log`, answered by factoryd without a pod (`factoryd/rung1.go:412-484`).
- **Rung 2 and the project chat:** the card and session reads, `ci` (commit statuses only), `alerts`, and `deployment_health` (`console/chat_tools.go:1548`).
- **Sandbox sessions:** no Kubernetes token (`automountServiceAccountToken: false`, `factoryd/runner.go:3081`) and default-deny egress. Coder and analyzer sessions get `deployment_health` through the gateway (`gateway/tools.go:681`, infra `factory/policy.yaml`).

`deployment_health` is the only Kubernetes read of any agent. It covers the project's own Deployments, one hour of their events, and at most 12 KiB. No telemetry query tool exists for any agent.

### 2.4 What the platform records

- Kubernetes events go to SigNoz as logs and stay 30 days, 7 of them hot. This covers the session namespaces.
- The logs of session and CI pods are not collected.
- Nothing ships the nodes' kernel log or Talos's own log. The memory guard's lines ("Sending SIGKILL to cgroup") exist only in each node's ring buffer, which holds 4 to 9 days.
- ClickHouse runs near its query memory cap. A one-day query over the logs failed with `MEMORY_LIMIT_EXCEEDED` on several days. A tool cannot run open queries against it. It needs a narrow key: a namespace, a pod UID and a time window.
- SigNoz alerts reach factoryd through one webhook. An alert files a bug card for the project that owns the namespace, and an alert no project owns is dropped (`factoryd/signozwebhook.go:172`). No alert covers a memory kill, an eviction or a node restart.
- factoryd may list nodes and pods in the whole cluster, list events in each task namespace, and read pods and events in `factory`, `platform` and `forgejo` (`k8s/factoryd.yaml`, infra `k8s/platform/factoryd-reader.yaml`). It holds no watch verb.

## 3. Goals, non-goals, anti-goals

**Goals**

- G1. Every session that ends without a push gets a death record with a cause class, set by fixed rules in code.
- G2. The next session of the card reads the record's facts in at most three lines, and only facts that concern its predecessor's pod, node or services.
- G3. The check-in, rung 1, rung 2 and the project chat read the full record and the platform's incidents through one tool.
- G4. A session the platform killed costs the card no attempt, no agent time and no step toward the stronger model.
- G5. A human sees each platform death on the card's timeline, and factoryd files one card in the human's lane when platform deaths pile up.
- G6. Each node's kernel log reaches SigNoz and stays 30 days, so a memory-guard kill leaves a record off the node.

**Non-goals**

- No open `kubectl`, SigNoz or ClickHouse query tool for agents.
- No new rights for sandbox pods and no change to their egress.
- No agent changes the platform's configuration. An agent may file a card about the platform, as it may today.
- No change to past cards. The build's audit of the last 30 days only reports counts (section 9).
- Phase 1 covers session pods. Phase 2 (5.9) covers CI runner pods and gate pods, in the same build.

**Anti-goals**

- A fact about another pod, another node or an unused service in a session's context.
- A session told that the platform killed it when its own command filled its memory or its `/tmp`. That teaches it to run the same command again.
- Raw event, log or kernel text in a prompt. A kernel OOM line holds a process name the agent chose, and other text can hold a secret.
- A tool that can print a secret: no pod spec, no environment, no machine config. A dry run of a Talos patch printed a registry token into a session on 2026-11-20.

## 4. Approaches

1. **Code writes a death record per session, and a platform incident log feeds it (picked).** factoryd collects the facts when a session ends, classifies them by fixed rules and stores the result. The next session's line and the investigators' tool read the same record. A small incident log, filled by a sweep each minute, holds the platform facts that the record needs: kills, restarts of the services sessions use, node reboots. This follows "facts by code, judgment by model" and "small default context, depth by tool". It is the largest build of the three.
2. **A query tool for investigators.** Give the check-in and the factory agent a read of SigNoz or of the Kubernetes API, and let them dig. It is the smallest build. The next session still learns nothing unless an investigator runs first. ClickHouse refuses wide queries. Raw text reaches prompts, and the model is asked for facts a tool could carry.
3. **Alerts become cards.** SigNoz rules on memory kills, evictions and node events file cards through the existing webhook. The human sees each incident. Nothing ties an incident to the session it killed, the card still pays, and 129 ClickHouse kills in five days would file a card per alert fingerprint.

Approach 1 is the one that serves both halves of the intent. It takes one piece of approach 3: the human gets one card when platform deaths pile up (5.7).

## 5. Design

### 5.1 Cause classes

A death record has one of three classes. Each class says who ended the session. This table gives the effect of each class on the card.

| class | who ended the session | effect on the card |
|---|---|---|
| `platform` | the cluster | no attempt, no agent time, no step to the stronger model (5.6) |
| `own_limit` | the session's own use of its pod's limits | as today: an attempt, with the fact line |
| `unknown` | no cluster cause found | as today. The record says "no cluster cause found", and the next session gets no line |

The rules run in this order, and the first match wins.

1. `platform`: a memory-guard kill line names the pod's cgroup.
2. `platform`: a kernel OOM kill line names a process of the pod, with `constraint=CONSTRAINT_NONE`, which means the whole node ran out of memory.
3. `platform`: an eviction whose message starts "The node was low on resource".
4. `platform`: the node's boot ID changed, or the node went NotReady, during the session. NotReady counts when the node is not Ready at the end or when the incident log holds a NotReady of the node inside the session's life.
5. `platform`: the pod carries a `DisruptionTarget` condition: a preemption, a drain or a taint eviction.
6. `platform`: anyone but factoryd deleted the pod, or the pod was gone after a factoryd restart.
7. `own_limit`: a container ended `OOMKilled`, and the kernel line says `constraint=CONSTRAINT_MEMCG`, which means the pod reached its own memory limit.
8. `own_limit`: an eviction "Usage of EmptyDir volume ... exceeds the limit", or an eviction for the pod's own ephemeral-storage limit.
9. `unknown`: no rule above matched.

If rule 7 finds `OOMKilled` but no kernel line, the class is `own_limit`, because the pod's own limit is the common cause.

`own_limit` stays a normal attempt on purpose. Its cause is the session's own command, and the fact line tells the next session which limit it reached and which command ran.

### 5.2 The death record

factoryd runs the rules and writes one death record in two cases:

- A session ends without a push. This includes a worker that reports a stop factoryd did not send, which is a SIGTERM from the cluster, and the reattach after a factoryd restart that finds the pod gone.
- A session trips on `no_progress`. The rules run before the trip reaches the supervisor's model. If they give `platform`, factoryd ends the session as a platform death and makes no supervisor call, so a lost node costs no paid model call.

A `platform` class gives the session a new outcome in place of `no_push` or the trip's outcome, as `provider_refused` has its own. The record replaces `SessionKill`: its facts reach the rungs through the same case facts (`factoryd/casefacts.go:200`), so the factory keeps one way to name a kill.

- When the pod starts running, factoryd stores its UID, its node and the node's boot ID in `live_sessions`. The node and the UID are known only after scheduling.
- At the end, factoryd reads four sources:
  - `PodDiagnosis`, widened with the node, the UID, the deletion time, `lastState` and every condition.
  - The task namespace's events, which factoryd may list today.
  - The node's Ready condition and boot ID.
  - The incident log's rows for this pod, this node and the services the incident log watches (5.3), inside the session's life.
- A memory-guard kill reaches SigNoz some seconds after it happens. If the pod ended with exit code 137 and no rule matched, factoryd waits up to 90 seconds for a kill line about the pod's UID before it settles on a class.
- The record holds fixed fields only: class, matched rule, time, node, pod UID, exit code, reason, condition type and reason, eviction resource, kill source, the session's last command, and the IDs of the incidents it matched. It never holds raw message text beyond the kubelet's eviction message, cut to 200 characters.
- The class and a one-line summary go into `SessionEndFact` (`factoryd/metrics.go:216`) and its event row, so the card's timeline and digest show "no push: the node's memory guard killed the pod" instead of "no push".

### 5.3 The platform incident log

One table in factoryd's database holds the platform facts. A sweep each minute fills it from these sources:

- **Kernel and Talos lines in SigNoz** (needs 5.8): memory-guard kills, parsed to the pod UID and the node, and kernel OOM kills, parsed to the constraint and the cgroup. The query names the node log stream and the last 15 minutes. Windows overlap, and a row's node, sequence number and time make it unique, so a stall of the log path up to 15 minutes loses no line.
- **Restarts of the services sessions use:** factory-gateway, factoryd, LiteLLM, Forgejo, OpenBao, kube-apiserver. factoryd reads each pod's `restartCount` and `lastState` through the Kubernetes API. factoryd may list pods in every namespace today (`k8s/factoryd.yaml`), `kube-system` included, so this needs no new rights.
- **Nodes:** a Ready condition that flips, and a boot ID that changes.

A row holds: time, kind, subject (pod, service or node), node, namespace, fixed detail fields, source. The log keeps 30 days, as SigNoz does.

The log exists because the gate and the tool must answer within a second from data that does not expire after an hour, as Kubernetes events do, and that does not depend on a ClickHouse that runs near its memory cap. The same rows fill the human's card in 5.7.

### 5.4 The gate: which facts reach the next session

A fact reaches the next session when it concerns its predecessor:

1. A fact about the predecessor's own pod always passes. This is the class line.
2. A fact about the predecessor's node passes when it falls inside the predecessor's life.
3. A restart of a service whose errors the agent sees passes when it overlaps the predecessor's life. The services are factory-gateway and LiteLLM (model calls) and Forgejo (git). Such a fact explains errors in the transcript but does not change the class. Restarts of factoryd and kube-apiserver go into the record and the tool, not into the line, because the agent sees no error from them.

Nothing else passes: no other pod, no other node, no ClickHouse or SigNoz kill, no scheduling of another card.

The line goes through the existing handover path, the `FINDINGS` lines and the carried stop reason (`factoryd/workflow.go:2033-2038`, `2264-2277`, `factoryd/carry.go:132-141`). It uses fixed templates and fills in parsed fields, never raw text. It is at most three lines and 600 characters. The builder registers it with `cmd/agentdoc`, so the agent context pages show it.

Examples, one per kind:

- `platform`: "Your previous session did not fail on its own. The node's memory guard killed its pod on sf-2 at 14:02 UTC. Work after the last push, commit abc1234, is lost. That session does not count against the card."
- `own_limit`: "Your previous session's pod reached its 4 GiB memory limit while it ran `go test -race ./...`, and the kernel killed it."
- A service restart: "Forgejo restarted from 14:02 to 14:04 UTC during your previous session. The node's memory guard killed it. Git errors in that window came from the restart."

### 5.5 The tool `cluster_facts`

One read tool with two scopes:

- `cluster_facts {session}` returns the session's death record, its namespace's events in its life, its node's facts and the incidents that overlap its life.
- `cluster_facts {since, until}` returns the incident log for a window of at most 24 hours.

It returns fixed fields with a row cap and a cap of 12 KiB, as `deployment_health` does. Every refusal names the state and the action, for example: "session s-1a2b ended with a push and has no death record. Read card_step for its end."

The tool reads factoryd's database, plus the Kubernetes API for a pod that still runs. It never sends an open query to SigNoz.

The check-in, rung 1, rung 2 and the project chat get it. Sandbox sessions do not, though coder and analyzer sessions read `deployment_health` today. The line from 5.4 holds every fact the gate passes about their predecessor. The tool's extra depth is the platform's, and the coder's job is the card. Templates in the code: the `gates` case for the check-in and rung 1, since factoryd answers it without a pod (`factoryd/runner.go:2083`, `factoryd/rung1.go:458`), and `deployment_health` for the chat (`console/chat_tools.go:1548`).

### 5.6 What a platform death does to the card

- It costs no attempt and no agent time, and it is no step toward the stronger model. This follows `not_started` and `provider_refused`.
- The card restarts at once from its last pushed commit.
- Money the session spent stays spent. Its model calls were real, and the spend limit stays as policy enforces it.
- If three sessions of a card in a row die of `platform`, factoryd opens a case `platform_fault` and the ladder takes it: rung 2 first, then the human. The case's statement lists the three death records. This bounds a card that the platform kills again and again.
- The case takes the answers of the case `pod_never_started` (`factoryd/cases.go`), and rung 2 may decide it. No answer changes the platform.

### 5.7 What the human sees

- The card's timeline shows the class line on the session's end step. This is a change of text on an existing step, so it needs no design round. If the builder wants a new mark on the card, that is a condensed round by `design/process.md`.
- If platform deaths reach 3 within 24 hours, across all cards, factoryd files one card in the human's lane. The freeze watcher does the same for a frozen model class (`factoryd/freezecard.go`, source `provider_freeze`).
- The card's face lists the deaths and the incidents behind them. While the card is open, a new death updates its face and files no second card.
- The card goes on the board of the project whose card the latest death hit.
- No agent works the card. A fix of the nodes needs a Talos apply with the nodes' admin key, and no agent holds a direct credential.

factoryd files the card itself, not through a SigNoz alert. The webhook routes an alert by its namespace's project (`factoryd/signozwebhook.go:179`), and factoryd's namespace would put a Talos problem on the code project's agents.

### 5.8 Kernel log shipping (infra)

Talos v1.14.1 has a `KmsgLogConfig` document that sends the kernel log as JSON lines to a TCP or UDP address. The memory guard writes its kill lines to the kernel log ("[talos] Sending SIGKILL to cgroup"), so this one document carries both the kernel's OOM kills and the guard's kills.

- Add a `KmsgLogConfig` to `talos/patches.yaml` in the infra repository.
- Add a receiver to the k8s-infra collector that takes the lines and writes them to SigNoz logs with the node's name. The builder picks the receiver and its port.
- Keep them 30 days, like the other logs.
- Apply one node at a time, after a dry run that reports no reboot. Never print the machine config: filter the dry-run diff to the new document.

### 5.9 Phase 2: CI runner and gate pods

The platform kills CI runner pods (`factoryd/ci.go:807`) and gate pods (`factoryd/gates.go:1166`) as it kills sessions. A CI job that the platform kills comes back as a red check, and the next session pays to fix it. The 113 back-offs and 20 failed pulls of the `ci-runner` image in 2.1 show that CI pods meet platform faults too.

- Phase 2 runs the same rules over these pods and writes the same death record. A CI pod's record is keyed by its runner's name, which the job's log names in its opening line.
- A killed CI job gets one free re-run today when its log holds a kill marker (`factoryd/killedcheck.go:20`). The marker stays the sign of a kill, and the record's class names its cause. A job whose pod the platform ended gets up to two re-runs. A job killed by its own pod's limit gets none, and its note names the limit. A killed job without a record keeps today's one re-run.
- A gate finding from a pod with a `platform` record says so in its first line.

## 6. Constraints

- The class comes from code. No model decides it.
- Policy code keeps every bound: the attempt count, agent time and the spend limit.
- No prompt gets raw cluster text. Fields are parsed first.
- No new Kubernetes rights. factoryd already lists pods and nodes in every namespace and lists events in each task namespace. Sandbox pods get nothing new.
- A SigNoz query names a narrow key. The pass queries once a minute over the last 15 minutes. A death's query names its pod's UID.
- Re-seeding works. The incident log and the death records are derived data. Losing them loses history, and nothing breaks.

## 7. Decisions by Sebastian

Sebastian took all four on 2026-11-23.

1. **A platform death is free for the card** (5.6). The other choice was to charge it as today and only explain it. Free, because the agent did nothing wrong and `not_started` and `provider_refused` already work this way.
2. **Three platform deaths in a row open a case for the ladder** (5.6). The other choice was a different count, or no bound at all. Three, as `not_started` does.
3. **The platform card is for the human only** (5.7). The other choice let an agent of the infra project work it, and a human applies its Talos change. The human only for now: a node fix needs the nodes' admin key, and the security constraint gives no agent a direct credential.
4. **Coder sessions get the line, not the tool** (5.5). The other choice added `cluster_facts` to the gateway's tools, beside `deployment_health`. The line, because it holds every fact the gate passes about the predecessor.

## 8. Left to the builder

- How gVisor (runsc) reports each kill to the kubelet: the reason and the exit code of a memory-guard kill, of a kernel kill at the limit and of a node-wide kernel kill. Test pods settle it.
- The receiver for the kernel log, its port and its address from a Talos node.
- The table's shape and names, and the exact query for the kernel lines.
- The new outcome's name, and its Temporal version beside `versionSessionKill`.
- The rows and the window behind the human's card.

## 9. How the build proves itself

- **Rules, unit tests.** One test per row of 5.1, each with a pod status written by hand. The kernel lines come from the real lines on the nodes today. Cases include "evicted: The node was low on resource: ephemeral-storage." giving `platform`, "Usage of EmptyDir volume "tmp" exceeds the limit "4Gi"" giving `own_limit`, `OOMKilled` 137 with `CONSTRAINT_MEMCG` giving `own_limit`, `Error` 137 with a memory-guard line for the pod's UID giving `platform`, and a vanished pod with a changed boot ID giving `platform`.
- **Gate, unit tests.** A ClickHouse kill, an incident on another node and a Forgejo restart after the session ended stay out of the line. A Forgejo restart inside the session's life gets in.
- **Card, workflow test.** A `platform` death leaves the attempt count, the agent time and the model unchanged. Three in a row open `platform_fault`. A `no_progress` trip on a node that went NotReady ends as `platform` with no supervisor call.
- **Human's card, unit test.** Three platform deaths within 24 hours file one card in the human's lane. A fourth updates its face and files no second card.
- **Live check in a test namespace.** Provoke the three causes that are safe on the live cluster: a pod over its memory limit, a pod over its `/tmp` limit, and a pod deleted from outside. Check each record's class. The memory guard and node loss are not provoked on the three-node cluster. Their rules are tested from recorded lines only.
- **Audit of the last 30 days.** Run the rules over the session ends of the last 30 days, with the events SigNoz still holds and the kernel lines still on the nodes. The report gives a count per class. This gives Sebastian the number he lacks today, and it tests the rules on real ends. It changes no card.
