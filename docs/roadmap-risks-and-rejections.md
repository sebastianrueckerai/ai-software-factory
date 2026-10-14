# Roadmap: accepted risks and rejected ideas

This file hangs off the [roadmap](roadmap.md) and uses its item format, its numbers and its key to the sources. It holds two kinds of item that are not planned work: risks the factory accepted and revisits when Sebastian picks one up, and ideas rejected earlier, kept so nobody proposes them again by accident.

## Accepted risks to revisit

Each stays until Sebastian picks it up. Numbers in brackets are backlog items.

- **86. OpenBao role change needs a root run (14).** Changing an OpenBao engine, policy or role also needs the pinned bootstrap policy and a root bootstrap run, which the CronJob cannot do. Stage 12's role `factoryd` was the first such change since, done by hand before its roll (the infra README's Rebuild step 7). Where it stands: accepted risk. Priority:
- **87. The demo load generator has no pass or fail (16).** The platform "Job failed" rule holds promotion for 15 minutes instead. Where it stands: accepted risk. Priority:
- **88. Forgejo tokens in plaintext (21).** `pull_token`, `git_token` and `merge_token` sit in Postgres and its S3 backups. Where it stands: accepted risk. Priority:
- **89. The projects token can transfer repositories (22).** The factory-projects token can move a project's repository out of its organisation. Where it stands: accepted risk. Priority:
- **90. Unsupervised short activities (30).** Bookkeeping activities and GatePolicy, GateMigration and RequestApproval have no supervisor, and their `gate_bound` alert stays unjudged. Where it stands: accepted risk. Priority:
- **91. The gate supervisor assumes one replica (31).** After a restart a trip is judged noise with no model call. Where it stands: accepted risk. Priority:
- **92. Job failures missed during collector restarts (41).** The k8s_events receiver misses Job failures while its pod restarts. Where it stands: accepted risk. Priority:
- **93. The node agent runs as root (46).** Log collection needs `/var/log`. Where it stands: accepted risk. Priority:
- **94. The SigNoz webhook password files tasks (48).** Its holder can file one bug task per new fingerprint in any project, and SigNoz shows the password to users who can list channels. Where it stands: accepted risk. Priority:
- **95. A SigNoz restart re-fires alerts (50).** A new `startsAt` gives a "fired again" comment or a second issue. Where it stands: accepted risk. Priority:
- **96. The agent writes both reproduction and fix for alert issues (51).** A flaky module proxy that fails only at the base counts as reproduced. Where it stands: accepted risk. Priority:
- **97. The factoryd gateway token can charge any task (53).** Up to the task budget and the day cap. Where it stands: accepted risk. Priority:
- **98. A cut call books its whole hold until settle (54).** Ruling 196's settle pass corrects it after the settle window. Roadmap items 241 and 243 meet the same full booking: an expired hold books as spend with no call behind it. Where it stands: accepted risk. Priority:
- **99. The CI queue metric misses fast jobs (8).** Jobs taken and finished between two polls are not counted, so low quantiles read high. Where it stands: accepted risk (ruling 203). Priority:
- **100. No standing resource through registration (18).** A human promotes a lease instead. Where it stands: accepted risk (ruling 203). Priority:
- **101. Tool spans without a parent (34).** Free MCP tools and commissioning join traces by `task.id` search. Where it stands: accepted risk (ruling 203). Priority:
- **102. The spend metric leaves out sweeps and accruals (37).** `gateway.spend.eur` cannot match `spent_eur` for every task. Where it stands: accepted risk (ruling 203). Priority:
- **103. The SigNoz ClusterRole lists every ConfigMap (47).** The narrower per-project binding is not built. Where it stands: accepted risk (ruling 203). Priority:
- **104. Infra-side risks (12, 13, 35, 42, 43).** The roll-to-live panel interpolates one-sample histograms. The console-oauth Role could mint a token Secret while its account is absent. A sandbox can forge OTLP records. Logs retention drifts silently after losing only the ClickHouse volume. Broken S3 moves are silent until the hot volume fills. Where it stands: accepted risk, infra fixes by a human. Priority:
- **105. Stage 10's message-in risks.** The agent can reach opencode's own loopback server (nothing its shell lacks). The message bearer crosses the pod network in plain HTTP. A message accepted just as opencode decides to stop is never answered. Since the speed round the bearer also sits in plain text in Postgres and its backups: the `live_sessions` row keeps each session's message token so a restarted factoryd can reattach (item 88 has the same shape for the Forgejo tokens). Sources: handover "Flags", the speed round. Where it stands: accepted risk. Priority:
- **106. Carried stray items.** The 33 MB `agent-worker` binary in both code remotes' history (ruling 152). Forgejo's SSH offers only an ssh-rsa host key. Forgejo 15 lets any account set any existing label through the web form. The sandbox can still reach Forgejo. Sources: handover "Flags". Where it stands: accepted risk. Priority:

## Rejected earlier, and why

Any of them can come back if Sebastian asks.

- **107. Warm pools.** Idle sandbox pods claimed per task need the gateway to bind identity at claim time and a shared pool namespace. No until a design keeps identity, isolation and cleanup as secure as today, perhaps a spike much later. Sources: arch 10, queue J, synthesis sections 5 and 8. Where it stands: rejected for now (Sebastian, 2026-09-29).
- **108. A dedicated server for microVMs.** Sebastian refused bare-metal nodes. Sources: queue J. Where it stands: rejected, not to be proposed again without his asking.
- **109. A reader and writer split.** Every agent keeps the exact input, and the optional injection scan (item 45) guards it instead. Sources: arch 10, synthesis section 5. Where it stands: rejected (Sebastian, 2026-09-29).
- **110. Command-level policy in the sandbox.** Allowlisting every legitimate command is an endless race, so the sandbox allows everything and the blast radius stays contained. Sources: arch 10, synthesis section 5. Where it stands: rejected (Sebastian, 2026-09-29).
- **111. Typed side-effect requests applied after the agent.** A deferred list could refuse one of several actions that only make sense together, so side-effect tools act live (roadmap item 29). Sources: queue J39, synthesis section 5. Where it stands: rejected.
- **113. VS Code Remote Tunnels and SSH into the pod for "I am going in".** Tunnels need egress to Microsoft's relay and a Microsoft or GitHub identity. Sources: queue H25. Where it stands: ruled out in the queue.
- **114. Harvester.** Its current release warns against upgrading, and its floor of 16 cores and 64 GB per node does not fit cheap boxes. Sources: arch 9, goal. Where it stands: dropped.
- **157. A second factoryd replica.** Stage 15 found that every roll, a restart of factoryd's one replica, stopped the running sessions. A second replica was rejected (ruling 269): the runner's live sessions, the timeline lock, the event bus, the gate supervisor's timers (item 91) and twelve loops assume one process, and two replicas would double every pulse call. A pod drain was rejected too, since the Service drops a terminating pod, so the console and webhooks would be down for the drain. The problem it would solve is gone: since the speed round (roadmap 222) the worker pod outlives factoryd, and the retried activity reattaches to it from a `live_sessions` row, so sessions survive a restart and the roll's session gap went. Sources: Stage 15 (00:33Z, 05:49Z), Stage 16 (11:4xZ), the speed round. Where it stands: rejected by ruling 269.
