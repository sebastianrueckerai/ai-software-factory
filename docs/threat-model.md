# Threat model

The factory's security in one page: what the sandbox stops, what it does not stop, and the two holes we know about and accept. A named hole says more than a claim of safety. Written 21 October 2026, from the code as it stands. Paths are relative to ai-software-factory-code unless they start with `infra:`.

## The attacker we model

The agent is the adversary. Its output is untrusted: wrong code, malicious code, or behaviour injected through the signals plane, where issue text, alerts, roadmaps and scraped pages enter. Anyone who compromises a sandbox pod stands in the same place. A compromised control plane (factoryd, the gateway, Postgres, the cluster) sits outside this model. That is cluster security, and no audit trail inside the cluster survives it.

## What the sandbox stops

- One throwaway pod per session in a namespace of its own: gVisor runtime class, restricted pod security, uid 1000, no capabilities, read-only root filesystem, emptyDir volumes, a quota of two pods. The namespace is deleted when the task ends and a boot sweep deletes orphans. `internal/factoryd/runner.go` (`sandboxPodSpec`).
- No credential reaches the agent. The read token lives only in the clone init container. The write token is minted after the agent process is dead, used once for the push and revoked. The gateway identity is a projected service account token that expires after one hour. The message bearer reaches the pod only as a hash. `internal/factoryd/forgejo.go`, `internal/factoryd/message.go`, `internal/factoryd/completion.go`.
- The network is closed. A Cilium network policy denies all egress and allows by name: the model gateway, Forgejo in the cluster, the Go module proxy, the Go checksum database, the Go module storage and the npm registry on port 443, DNS for exactly those names, and a leased server as one address on port 22. The cloud metadata address is denied outright. `internal/factoryd/runner.go` (`workerEgressSpec`).
- The closed network is proven before every session. The worker probes the gateway, a canary name, the metadata address, a direct public IP and an off-list DNS name. Any open path fails the start and escalates. `cmd/agent-worker/egress.go`.
- The gateway dials out, not the agent. It resolves a name once, refuses non-public addresses and dials the address it checked, so DNS rebinding cannot redirect a call. `internal/gateway/egress.go`.
- Policy is code outside the model. Risk classes follow file paths, forbidden paths fail the task, migrations and approvals stay human at every autonomy level, and a floor of four gate stages holds that no project file may lower. `internal/policy/risk.go`, `internal/policy/process.go`.
- Every model call holds its worst-case cost under a database lock before it runs, at the task, day, month and project caps. A missing cap reads as zero and stops all spend. `internal/policy/holds.go`, `internal/gateway/server.go`.
- Every gateway decision, admit or refuse, is audited with the policy version and the cost. Known secrets are scrubbed before anything leaves the pod. `internal/gateway/store.go`, `internal/redact`.

## What it does not stop

- An agent working inside its permissions. It reads the repository it works on, spends to its caps and writes to humans. The gates judge the result. They prove the output, not the intent.
- Prompt injection that survives screening. It changes what the agent does inside those permissions. The bound on the damage is the sandbox, the fork and the budget.
- Audit without tamper evidence. The audit trail is database rows and object storage, not a signed log.
- gVisor, not a microVM. The kernel attack surface shrinks, hardware isolation is absent. The tradeoff keeps the factory on cheap commodity servers. [architecture.md](architecture.md) section 7.2 holds the stronger-isolation fork.
- Accepted risks, tracked in [roadmap-risks-and-rejections.md](roadmap-risks-and-rejections.md) items 86 to 106: Forgejo tokens sit in plaintext in Postgres and its backups (88), the node agent runs as root (93), the SigNoz webhook password can file tasks (94), a sandbox can forge telemetry records (104), and Forgejo offers only an ssh-rsa host key (106).

## The two known holes

### Hosted model APIs see the code

Every session, review, audit and supervisor call sends briefs, diffs and repository excerpts to the model providers behind the gateway, today Z.ai and Alibaba (`infra:k8s/platform/litellm/helmrelease.yaml`). The channel is wide: a review diff is cut at 48 KiB and a request body may reach 16 MiB. The gateway filters fields, not content. It keeps the chat fields, function tools and text parts, refuses provider tools, images, audio and files, and `internal/redact` scrubs known credentials. Nothing else reads what a prompt carries. The tool providers Firecrawl, Replicate and Fal see agent-chosen arguments the same way.

Accepted because model APIs are a commodity, like the provider that runs your servers and so holds your data (launch decision 5). The swap point is built: a self-hosted model sits behind the same gateway. None is configured today.

### The Go module proxy is a covert channel

The DNS allowlist names four public hosts, the price of a usable toolchain. A `go get` of an invented module path carries that path to proxy.golang.org, so an agent can leak a few hundred bytes per request (the code repository's README, ruling 99). The npm registry and the Go module storage carry the same class of channel, bounded the same way. Wider egress was rejected for this reason: it would widen the bound (roadmap item 281).

Read with this: [architecture.md](architecture.md) sections 6.3 and 6.4 and [evidence.md](evidence.md).
