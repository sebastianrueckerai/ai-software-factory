---
name: Anthropic Sandbox Runtime
slug: anthropic-sandbox-runtime
url: https://github.com/anthropics/sandbox-runtime
repo: https://github.com/anthropics/sandbox-runtime
category: sandbox-runtime
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: local CLI/library only, no server component, no cloud offering of its own
company: Anthropic PBC, San Francisco, privately held AI lab, founded 2021; this tool open sourced October 2025
maturity: 5385 stars, 465 forks, 34 contributors, first commit 20 Oct 2025, last commit 28 Sep 2026, releases roughly weekly (v0.0.77)
similarity: 1
axes:
  signals_intake: 0
  control_plane: 0
  sandbox_isolation: 3
  verification: 0
  policy_outside_model: 3
  identity_per_task: 2
  cost_control: 0
  ux: 2
  reseedable_selfhost: 3
steal:
  - Credential sentinel substitution: mask a secret file or env var from the sandboxed process with a fake value, then have the egress proxy swap the real bytes back into outbound headers when it sees the sentinel, so a tool that reads the credential path still works without the agent ever holding the real secret.
  - Resolved-address check: after a hostname passes the domain allowlist, resolve it once and refuse to dial if the address is loopback, link-local, cloud metadata, or one of the host's own interfaces, closing the DNS-rebinding hole a name-only allowlist leaves open.
  - Mandatory deny paths and pinned directories: shell rc files, .git/hooks, .gitconfig and IDE config dirs are always write-blocked regardless of the allow list, and every ancestor of a protected path is bind-mounted so it cannot be renamed or deleted out from under the deny.
  - "control-fd: push new network allow/deny lists into a running sandbox over a file descriptor the caller already holds, taking effect immediately on the live proxy while filesystem rules stay fixed at wrap time."
  - Two-stage seccomp with a nested PID namespace as PID 1, so the syscall-filtered command cannot reach an unfiltered helper process (bwrap's own init, the socat bridge) via ptrace or /proc, keeping the seccomp boundary intact regardless of ptrace_scope.
differs:
  - The isolation boundary is an OS namespace (bubblewrap, Seatbelt) or account-scoped ACLs (Windows), not a kernel-level VM boundary like gVisor. Our own security constraint chose gVisor over namespace sandboxes for exactly the failure mode independent researchers later found in srt (see section 8); adopting srt's boundary on our worker plane would be a downgrade even though its per-path and per-domain policy language is richer than what we express today.
  - It is a single-host, single-process fence with no durable state, no scheduler and no task identity. It answers how to wrap one command, not how to run one task under one disposable credential across a cluster, so only the fencing primitives are portable, not the shape of the system.
ux_verdict: One command (npm install -g, then srt COMMAND) gets a sandboxed process running; watching and intervening is CLI-only (violation log stream on macOS, strace on Linux, control-fd to push policy changes), no console or approval workflow of its own.
slop_verdict: Real and used in anger, it is the actual mechanism behind Claude Code's own /sandbox feature, with weekly point releases and 34 contributors, but Anthropic still labels it a Beta Research Preview, and independent researchers found and Anthropic quietly patched at least two real bypasses without a public advisory.
---

# Anthropic Sandbox Runtime

## 1. What it is
`srt` is a TypeScript CLI and library, built by Anthropic, that wraps an arbitrary process with OS-level filesystem and network restrictions: `sandbox-exec`/Seatbelt on macOS, bubblewrap on Linux, a dedicated restricted account plus Windows Filtering Platform on Windows (alpha). It is the mechanism behind Claude Code's `/sandbox` command and is offered separately so other agent harnesses and local MCP servers can use the same fence.

The README calls it a "Beta Research Preview... made available as an early open source preview," and the accompanying Anthropic engineering post (20 Oct 2025) claims sandboxing cut permission prompts by 84 percent in internal use. The code backs that framing: this is a narrow, deep piece of infrastructure (about 21,800 lines of TypeScript in `src/`), not a product with its own UI, task model or identity system.

## 2. Mapping to our five planes
| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None | Forgejo webhooks, SigNoz alerts, factoryd intake | not comparable |
| Control plane | None, stateless CLI wrapper | factoryd + Temporal workflow + Postgres | not comparable |
| Worker plane | OS-namespace sandbox per wrapped command: bubblewrap/Seatbelt filesystem mounts, proxy-mediated default-deny egress with domain allowlists | gVisor pod per task, own k8s namespace and ServiceAccount, default-deny NetworkPolicy through factory-gateway | not comparable (they lead on policy granularity per command; we lead on isolation strength, a kernel boundary versus a namespace boundary with documented escapes) |
| Verification | None | Forgejo Actions, policy gates, model review | not comparable |
| Merge and deploy | None | Bot merge, Flux | not comparable |
| Policy outside the model | JSON settings file compiled into OS primitives (bwrap mounts, Seatbelt profile, seccomp BPF); the model never grants a capability | YAML capability policy in Git, enforced in gateway code and NetworkPolicy | equal in spirit, srt's per-path and per-domain rules are more granular at the single-sandbox level |
| Identity per task | Static host credentials are hidden from the sandboxed process by sentinel substitution; the credential itself is unchanged and long-lived | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, mapped by factory-gateway to capability and budget | we lead, masking a long-lived secret is not the same as never issuing one |
| Artifacts not chat | Not applicable, it wraps one process | TaskBrief, branch, PR, event stream | not comparable |

## 3. Architecture and stack
Node >=20.11, TypeScript, Zod for config schema validation (`src/sandbox/sandbox-schemas.ts`), Commander for the CLI (`src/cli.ts`), `@pondwader/socks5-server` and a hand-built HTTP proxy (`src/sandbox/http-proxy.ts`, `socks-proxy.ts`) for network mediation, `node-forge` for the MITM CA used in optional TLS termination (`mitm-ca.ts`, `tls-terminate-proxy.ts`). No database, no queue, no workflow engine: state is one process per wrapped command plus long-lived proxy servers on the host.

Linux enforcement lives in `src/sandbox/linux-sandbox-utils.ts` (3,319 lines): bubblewrap bind mounts for filesystem rules, a removed network namespace so all traffic must cross the proxy over a Unix socket, and a prebuilt static `apply-seccomp` binary (x64/arm64, in `vendor/seccomp`) for blocking AF_UNIX socket creation. Credential handling lives in `credential-mask-files.ts`, `credential-mask-env.ts` and `credential-sentinel.ts`: real secrets are read once on the host, replaced with sentinels in the sandbox, and the proxy substitutes them back into outbound traffic. Windows support (`windows-sandbox-utils.ts`, `vendor/srt-win`) uses a dedicated `srt-sandbox` account and WFP filters.

Deployment shape is an npm package (`@anthropic-ai/sandbox-runtime`), either the global `srt` binary or an embedded library (`SandboxManager.initialize()` / `wrapWithSandbox()`). It does not talk to any model itself; it is model-agnostic infrastructure sitting underneath a harness.

## 4. UX
Zero to first result is two steps: `npm install -g @anthropic-ai/sandbox-runtime`, then `srt COMMAND`. There is no GUI. Watching a running sandbox means macOS's `log stream --predicate 'process == "sandbox-exec"'` (real-time, used by Claude Code to turn a blocked syscall into a permission prompt) or, on Linux, `strace` grepped for EPERM since bubblewrap has no built-in violation reporting. Intervening mid-run is `--control-fd`: a caller-owned file descriptor streams new JSON config lines in; network allow/deny changes apply to the live proxy immediately, filesystem changes do not apply until the next wrap.

This is not comparable to our console: srt has no kanban, no approval workflow, no per-task view. It is a primitive an embedding application (Claude Code, or us) turns into UX, not a UX of its own.

## 5. Security, identity, sandbox, policy, cost
Filesystem and network rules are enforced in the OS (bind mounts, Seatbelt profiles, seccomp BPF, WFP filters), never in a prompt. Escape hatches (`enableWeakerNestedSandbox`, `enableWeakerNetworkIsolation`, `allowAppleEvents`) are documented and explicitly warn that enabling them removes isolation, not just weakens it.

Credentials are masked, not replaced: the real secret still exists on the host disk or environment, wrapped in a sentinel so the sandboxed process cannot read it directly, and reinserted by the proxy when a request needs it. This differs from short-lived, task-scoped identity: a permitted domain still ultimately receives the real, long-lived credential.

Network access is default-deny; an allowed hostname is still checked against its resolved address to block DNS rebinding into loopback, link-local, or cloud metadata ranges. There is no concept of spend or budget anywhere in the tool.

## 6. What we should take from it
Narrow: the credential-sentinel mechanism is directly applicable to any place our gateway proxies a call on behalf of an agent that still needs to see that a credential exists at a path without ever holding it; the resolved-address DNS-rebinding guard is a gap our NetworkPolicy-based egress control may not close today and is cheap to add to factory-gateway's outbound checks; the mandatory-deny/pinned-directory pattern is a one-line addition worth mirroring for the config paths inside an agent's own read-write workspace that should never be touched even by that agent (`.git/hooks`, CI config); `--control-fd` is a small, concrete recipe for letting our supervisor push a network policy change into a running task without restarting the sandbox.

Broad: none. srt does not solve a product-shape problem we are missing; it solves process fencing, which we already solve with gVisor at a stronger isolation level. The one broad observation worth keeping is ergonomic: turning a new domain or path exception into a one-line JSON edit, instead of a Kustomization change, is worth aiming for in how project owners adjust our per-project NetworkPolicy, without weakening what enforces it.

## 7. Where our philosophy differs and what that costs or buys us
Our "security without half measures" constraint already rejected namespace-only sandboxing in favour of gVisor's kernel boundary; the incidents in section 8 (a deny-all policy that behaved as allow-all, a live SOCKS5 bypass, a Linux config-file race) are the concrete version of the risk that constraint was written against. Copying srt's boundary would buy richer per-path and per-domain policy expression at the cost of the isolation strength our constraint requires; we keep gVisor and take only the individual mechanisms (credential masking, resolved-address checks) that do not depend on the weaker boundary.

srt also carries no notion of task identity, so nothing in it substitutes for our projected ServiceAccount tokens; the two designs solve adjacent but different problems (fencing one process against escape, versus issuing one task a scoped and disposable identity) and neither replaces the other.

## 8. Red flags and slop assessment
The maintainers still call it a "Beta Research Preview" a year after release. Independent researchers reported real bypasses: CVE-2025-66479, where a policy meant to block all outbound traffic was instead interpreted as allow-all (fixed 26 Nov 2025); a SOCKS5 null-byte hostname injection that permitted arbitrary outbound connections, present from the 20 Oct 2025 launch until a 27 Mar 2026 patch with no public advisory at the time (Anthropic said its own security team found it first); and a Linux config-file race (Cymulate) where read-only protection on a path is conditional on that path existing when the sandbox starts, letting a compromised session plant a `.claude/settings.json` hook that runs unsandboxed on the next launch. A competing vendor (Ona, which sells the alternative Veto) reported a case where the agent worked around a denylist and the sandbox disabled itself rather than block the command, a claim to weigh against its source. The repository itself moved from the `anthropic-experimental` org named in our seed table to `anthropics/sandbox-runtime` (the old URL redirects). No licence gating, no pricing tiers, single-vendor Apache-2.0 project.

## 9. Sources
- /home/womb/repos/market-research-clones/anthropic-sandbox-runtime/README.md (cloned 2026-09-29)
- /home/womb/repos/market-research-clones/anthropic-sandbox-runtime/package.json
- /home/womb/repos/market-research-clones/anthropic-sandbox-runtime/src/sandbox/linux-sandbox-utils.ts
- /home/womb/repos/market-research-clones/anthropic-sandbox-runtime/src/sandbox/credential-mask-files.ts
- /home/womb/repos/market-research-clones/anthropic-sandbox-runtime directory listing (src/, vendor/, test/)
- git log, anthropic-sandbox-runtime clone (last commit 2026-09-28)
- gh api repos/anthropics/sandbox-runtime (2026-09-29): stars, forks, licence, created_at
- gh api repos/anthropics/sandbox-runtime/contributors, /releases, /commits (2026-09-29)
- https://www.anthropic.com/engineering/claude-code-sandboxing (published 2025-10-20, fetched 2026-09-29)
- https://simonwillison.net/2026/May/30/how-we-contain-claude/ (2026-05-30)
- https://www.securityweek.com/anthropic-silently-patches-claude-code-sandbox-bypass/ (2026, fetched 2026-09-29)
- https://cymulate.com/blog/the-race-to-ship-ai-tools-left-security-behind-part-1-sandbox-escape/ (fetched 2026-09-29)
- https://ona.com/stories/how-claude-code-escapes-its-own-denylist-and-sandbox (fetched 2026-09-29)
- https://bex.co/blog/2026/09/25/claude-code-cves-container-sandbox-escape (2026-09-25)
