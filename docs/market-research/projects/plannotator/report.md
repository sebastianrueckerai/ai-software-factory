---
name: Plannotator
slug: plannotator
url: https://plannotator.ai/
repo: https://github.com/backnotprop/plannotator
category: code-review
license: MIT OR Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: local-first CLI/binary opening a browser UI on a per-session localhost server; optional self-hosted paste relay for sharing; a proprietary hosted team product ("Workspaces") is waitlist-only and out of this repo
company: solo maintainer Michael Ramos (GitHub backnotprop), no company or funding disclosed on the repo or site, bio says "day to day is complex critical systems, mostly involving AI"
maturity: 9,051 stars, 679 forks, 130 open issues (gh api, 2026-09-29); repo created 2025-12-28, last push 2026-09-29; 100+ releases, roughly one every 1-3 days since v0.15.0 (2026-03-24); maintainer holds 1,015 of the visible commits, next highest contributor 15
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 5
  reseedable_selfhost: 4
steal:
  - "The PermissionRequest-hook pattern for Claude Code: intercept ExitPlanMode, hold the tool call open (timeout 345600s), let a human annotate in a browser, then answer allow/deny with a message field the agent reads as its next instruction. Directly portable to any harness we adopt that exposes a permission hook."
  - "The plain-markdown feedback convention (packages/ui/utils/parser.ts exportAnnotations): each annotation becomes a quoted excerpt, a location line, and the comment body, concatenated under one '# Plan Feedback' heading and wrapped in a directive template ('YOUR PLAN WAS NOT APPROVED... You MUST revise the plan to address ALL of the feedback below'). Worth copying verbatim for our own waiting-human reply payload."
  - "anchorText/anchorContext on CodeAnnotation (packages/ui/types.ts): the exact lines a comment was anchored to, plus two lines of surrounding context and the hunk header, captured at annotation time so a later, changed diff can mark the comment 'outdated' instead of silently misplacing it. Directly useful for a console diff view that survives amend/rebase."
  - "safeInline() in packages/ui/utils/parser.ts: collapse whitespace and defuse backtick runs before any page- or tool-supplied string is spliced into agent-facing markdown, closing the one injection path a naive exporter would leave open. Worth mirroring anywhere we forward untrusted text into a prompt."
  - "Conventional-Comments style severity/decorations on CodeAnnotation (important/nit/pre_existing, blocking/non-blocking/if-minor) as a cheap triage vocabulary for a diff-review card, cheaper than inventing our own taxonomy."
  - "PrivateBin-style sharing for the async link-share path: AES-256-GCM in the browser, only ciphertext uploaded, the key lives in the URL fragment and never reaches the server, 7-day expiry, the relay itself is a small self-hostable service. A clean pattern if we ever need to hand an artifact outside Forgejo without trusting the relay."
  - "Release supply-chain discipline for a single small binary: SHA256 sidecar, SLSA provenance from v0.17.2, a CycloneDX SBOM evaluated against a fresh Grype database before anything is attested, with a single gh attestation verify call as the one dependency for install-time verification. A reasonable bar for our own agent-worker image and factoryd/factory-gateway binaries."
differs:
  - "Plannotator's whole mechanism assumes a synchronous, attended session: a hook blocks the agent's own process until a human acts in a browser on the same machine. Our worker plane is disposable and headless, with no human display attached during a run and approval delivered as an async Temporal signal; we cannot adopt the blocking-hook mechanism itself, only the artifact format it produces."
  - "Every trust decision in Plannotator collapses to 'the reviewer is the developer sitting at this machine': no sandbox, no per-task identity, no capability policy, because the human IS the thing being protected against nothing. Our trust boundary is the reverse (the agent is the untrusted actor), so the review surface has to live in the control plane we run, not next to the agent."
  - "Team collaboration is deliberately kept out of the open-source core and pushed to a proprietary hosted SaaS (Workspaces, waitlist-only, lifetime-free-access carrots for contributors). That open-core split is fine for a product monetising collaboration; it is not a model we can lean on, since our multi-user approval flow has to be fully ours, in the console, with no hosted fallback."
ux_verdict: best-in-class synchronous review UX for one attended human watching one agent session; nothing here addresses watching or approving an unattended, queued fleet of async tasks the way our console's kanban view has to.
slop_verdict: real and actively maintained, near-daily releases, 9k stars, a working SLSA/SBOM release gate, Show HN traction and third-party comparison pages, with a dominant but genuine solo maintainer, not a landing page over an empty repo.
---

# Plannotator

## 1. What it is

Plannotator is a local, open-source review layer that sits between a coding agent (Claude Code, Codex, Copilot CLI, Gemini CLI, OpenCode, Kiro, Droid, Amp, Pi) and its human operator. When the agent proposes a plan, the review surface opens automatically in a browser; the human highlights text to comment, mark for deletion, or replace, and the structured result is sent back to the agent. The same surface does PR-style diff review (/plannotator-review) against local changes, GitHub/GitLab PRs, or GitButler/Jujutsu/Perforce workspaces, and generic annotation of any markdown file, folder, or URL (/plannotator-annotate).

It is built and maintained by one person (GitHub backnotprop, Michael Ramos) with roughly 30 occasional outside contributors, no named company. The core is free and dual-licensed MIT/Apache-2.0; the maker's own pitch is "local, browser-based," with paid ambitions parked in a separate, not-yet-shipped hosted product, "Workspaces," for team sharing.

The README and site claim it "plugs directly into your agent through its hooks and commands" with no telemetry and local-by-default data. The repository backs this up for the core flow: the Claude Code integration is a real PermissionRequest hook on ExitPlanMode (apps/hook/hooks/hooks.json, apps/hook/README.md), the export path is real markdown generation code (packages/ui/utils/parser.ts), and the local server binds loopback only (packages/shared/live-proxy-node.ts: LOOPBACK_HOST = "127.0.0.1", "binds 127.0.0.1 UNCONDITIONALLY"). What is not yet real: "Workspaces" itself, which is a waitlist page, and any enterprise tier, neither is named anywhere in the docs.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work only starts because a human is running an agent CLI locally and that CLI calls a hook; no issue, webhook, or telemetry intake exists | Forgejo webhooks, SigNoz alerts, and factoryd's intake API turn issues and alerts into tasks | not comparable |
| Control plane | A local, single-user session list and a read-only plan-decision archive on disk (~/.plannotator, plannotator sessions, plannotator archive); no scheduler, no cross-task registry, no audit trail | Temporal workflow per task, Postgres task registry, policy versioned in the database, full audit trail | we lead |
| Worker plane | Runs inside the same OS process/session as the coding CLI it hooks; no isolation, no disposability, full trust in the local machine | One gVisor pod, namespace and ServiceAccount per task, read-only root FS, default-deny egress | we lead |
| Verification | Optional, user-triggered "Ask AI" / "review agents" can post AI-generated comments on a diff on demand; nothing is wired to CI and nothing blocks anything | Forgejo Actions, policy gates (risk class, migration flag, reproduction gate), then a required stronger-model review with a strict verdict before merge is even possible | we lead |
| Merge and deploy | Code review can post an approving review or line comments to a real GitHub/GitLab PR through the reviewer's own authenticated gh/glab CLI; there is no deploy step, no staging, no promotion | Bot merge (factory-merge) only after a whitelisted human approves through the console under their own Forgejo token, then Flux deploys with a staging soak | we lead |
| Policy outside the model | None. Nothing stops the agent from ignoring the review outcome beyond the harness's own hook contract; policy is "the human is watching," not code | Capability rules are a Git-versioned document enforced in gateway code and network policy, unreachable from a prompt | we lead |
| Identity per task | None. Everything runs as the developer's own OS user, their own gh/glab session, their own model provider key | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer by factory-gateway | we lead |
| Artifacts, not chat | Genuinely strong here for the plan-review moment: a live annotation session is deliberately compiled into one structured markdown document (quoted excerpt + location + comment) that becomes the agent's next tool result, not a chat reply, and diff comments become ordinary PR review comments | TaskBrief in, branch/PR/event stream out; Git is the coordination mechanism end to end | they lead |

## 3. Architecture and stack

TypeScript monorepo (Bun workspaces: apps/*, packages/*), built and run with Bun. Per-agent adapters live under apps/ (apps/hook for Claude Code, plus apps/codex, apps/copilot, apps/gemini, apps/kiro-cli, apps/opencode-plugin, apps/amp-plugin, apps/droid-plugin, apps/pi-extension, apps/vscode-extension). The review UI is a React 19 + Tailwind 4 single-page app (packages/ui, packages/editor, packages/review-editor) using @pierre/diffs for diff rendering, a forked @plannotator/web-highlighter for DOM text-range selection and restoration, and dockview-react for panel layout. apps/hook builds this SPA into a single prebuilt HTML file that a Bun HTTP server serves on a random or fixed localhost port per review session (bun build apps/hook/server/index.ts --compile produces the shipped plannotator binary).

There is no database and no long-running server: state is JSON/markdown files under ~/.plannotator (plans, drafts, archived decisions, config.json), and browser cookies (chosen deliberately over localStorage because "each hook invocation runs on a random port," per the README). Model calls for the optional "Ask AI" / review-agent features go through @anthropic-ai/claude-agent-sdk and @opencode-ai/sdk (package.json dependencies), using the user's own configured provider credentials; there is no gateway or budget layer in front of them.

For Claude Code specifically, the integration is apps/hook/hooks/hooks.json registering a PermissionRequest hook matched to ExitPlanMode, with a 345,600-second (4-day) timeout. apps/hook/server/index.ts reads the tool call, spins up the local server and browser, blocks until the human responds, then writes a hookSpecificOutput.decision of allow (with updatedInput echoing the original tool_input) or deny (with a message field carrying the exported feedback) to stdout for Claude Code to consume. Gemini CLI and Codex get the analogous decision/reason or Stop-hook shapes for their own hook contracts. Other agents (Droid, Amp) get commands only, no plan interception, per the install table in the README.

## 4. UX

Install is one curl/irm script that detects installed agent CLIs and wires hooks, skills and slash commands per agent; Claude Code and Copilot CLI additionally need one /plugin marketplace add + /plugin install. From there, plan review needs zero commands: the next time the agent calls its plan tool, a browser tab opens with the plan already rendered and annotatable. Diff review is one slash command (/plannotator-review) against the current working diff or any GitHub/GitLab PR URL. That is close to zero-to-first-result: one install step, then the review surface simply appears at the moment it is needed.

While the agent works, nothing is shown, Plannotator is dormant until a hook fires. When it fires, the human sees the plan or diff rendered with a file tree (for diffs), inline highlight-to-comment, a redline/delete/quick-label toolbar, and an optional Vim-style keyboard mode driven by a semantic block/line/word target graph (docs/vim-controls.md). Intervention is: annotate, then either approve (optionally with a note) or send feedback, which denies the tool call and hands the agent the exported markdown as its next instruction; a subsequent revision shows a plan diff against the previous version. This is materially ahead of our console today, which per our own list has "no diff view" and is "functional, not designed", Plannotator's diff and plan viewers are the product. What it does not do: show a queue of multiple tasks, a cost view, or anything about work that is not the one session currently open in the browser tab in front of you.

## 5. Security, identity, sandbox, policy, cost

Identity. None beyond the operating system user running the CLI. Git-forge actions (posting a PR review) go out through the human's own already-authenticated gh/glab CLI, so the forge itself records the human as author, the one point of overlap with our "identity belongs to the task" principle, except here identity belongs to the workstation, not a task.

Sandbox. None. The tool runs unsandboxed on the developer's own machine, by design; it never executes agent-authored code itself, only renders and diffs it.

Policy. None in code. The whole enforcement mechanism is "the agent's harness must honour the hook's allow/deny decision", a contract with the harness, not a network- or capability-level control. A malicious or buggy harness integration could ignore the deny message entirely.

Cost. No budget, cap, or ledger of any kind. Ask-AI and review-agent calls draw on whatever model credentials the user has configured, unmetered by Plannotator.

Credentials. No key material is proxied or brokered; model keys and Git tokens stay wherever the user's own CLI already stores them. The local review server itself binds loopback only by default and ships with no authentication token, a third party on the same machine (or, if PLANNOTATOR_REMOTE=1 is set without a tunnel, on the network path to the forwarded port) could reach it. One public dotfiles configuration explicitly disables remote exposure for this reason, citing upstream issue #956 (not independently verified against the issue tracker, cited from a third-party PR: sanketsudake/dotfiles#84).

## 6. What we should take from it

Narrow, this month. The exported-markdown feedback convention (exportAnnotations, getPlanDeniedPrompt's directive wrapper) is a ready-made shape for the payload our waiting-human state hands back into a task's next session brief, quote, location, comment, concatenated under one heading, worded as an instruction rather than a suggestion. anchorText/anchorContext is a small, concrete answer to "did this diff comment survive a rebase," worth adding to any diff-comment record we keep. safeInline's whitespace-collapse-and-backtick-defuse is a one-function defence against a real injection path (untrusted diff/page content reaching agent-facing markdown) that we should apply anywhere we do the same concatenation.

Broad, product shape. The PermissionRequest-hook idea, intercept the exact moment a plan is proposed and put a rich review surface in front of a human synchronously, is the single most relevant UX pattern here for our declared weak spot (no diff view, nothing real-time). We cannot copy the blocking-hook mechanism itself (see section 7), but we can copy its effect: when a task hits waiting-human, the console should open directly on a rendered, annotatable diff or plan for that task, not a generic kanban card. The release supply-chain bar (SHA256 + SLSA + SBOM + Grype gate, all for one small binary) is a reasonable target for our own factoryd/factory-gateway/agent-worker artifacts, which currently have no equivalent.

Does the annotation format fit an htmx console and a Forgejo-issue-based plan review? The wire format does, the client mechanics do not. CodeAnnotation's shape, filePath, lineStart/lineEnd, side (old/new), text, is close to identical to a Forgejo/GitHub pull-request review comment (path + line + side), so it maps cleanly onto "store this in our own table, then POST it as a Forgejo PR review comment under the human's token." The plan-annotation shape (blockId plus character offsets into parsed markdown blocks, type DELETION/COMMENT/GLOBAL_COMMENT) is likewise just an annotated Forgejo issue body: GLOBAL_COMMENT is an ordinary top-level issue comment, and the exported document is plain markdown Forgejo already renders. What does not port is the anchoring mechanism itself: text-range selection and DOM restoration need a real client-side selection library (@plannotator/web-highlighter) and a parsed-block model, which is a small, self-contained JS widget regardless of backend, but is not something htmx's server-fragment model gives you for free, htmx can serve the annotated document and receive the POSTed annotations, but the in-browser "click and drag to select this span of rendered markdown" behaviour has to be hand-built JS either way. So: adopt the data shape and the markdown export convention now; treat the selection UI as a small vanilla-JS component to build once, not a port of Plannotator's React/dockview stack.

## 7. Where our philosophy differs and what that costs or buys us

Plannotator's central mechanism, block the agent's own process on a hook until a human acts in a browser open on the same machine, assumes exactly one thing our architecture explicitly refuses: a human physically present at the machine the agent is running on, for as long as review takes (the hook timeout is 4 days). Our worker plane is disposable, headless, and runs in a sandbox pod with no display and no attached human; approval has to be an async Temporal signal a console submits later, sometimes from an entirely different machine, sometimes days after the agent's pod is gone. We can and should copy the artifact this mechanism produces (the exported feedback document); we cannot copy the mechanism, because "block the process open" only exists to serve the assumption we don't share.

Every other Plannotator control collapses to the same root cause: the reviewer and the machine are trusted implicitly because the reviewer IS the developer, so there is nothing to sandbox, no identity to scope, no policy to enforce in code. Our trust boundary runs the other way, the agent is the thing we don't trust, so a review surface for us has to live in the control plane we operate, with its own identity and policy layer, never bolted onto the agent's own process the way Plannotator bolts onto the harness. Adopting their model wholesale would mean trusting the sandboxed agent process with the review UI itself, exactly the half-measure our security constraint rules out.

Team sharing is the one place their roadmap and ours point the same direction and diverge on ownership: they are moving real-time multi-user review into a proprietary hosted product (Workspaces) and keeping the OSS core single-player, a sound business model for them and simply not available to us, our multi-user approval flow has to be built and run entirely inside our own console, with no hosted fallback to lean on if it turns out to be hard.

## 8. Red flags and slop assessment

Genuinely active: releases land roughly every 1-3 days (100+ releases from v0.15.0 on 2026-03-24 to v0.27.22 on 2026-09-29, per gh api repos/backnotprop/plannotator/releases), the last push was today, and the repo has a real ADR/SPIKE trail (adr/decisions, adr/research, adr/specs) showing engineering discipline rather than vibes. It has real third-party visibility: a Show HN thread (news.ycombinator.com/item?id=48495970), an independent comparison page from a competing tool (hunk.dev/compare/hunk-vs-plannotator), and third-party review sites, plus at least one real dotfiles config wiring it up (sanketsudake/dotfiles#84).

Bus-factor risk is real: one contributor holds 1,015 of the visible commits against a next-highest of 15 (gh api repos/backnotprop/plannotator/contributors), and the maker's own site and GitHub profile name no company or funding, this is one person's project, however well run. Open-core pressure exists but is disclosed rather than hidden: "Workspaces" is explicitly a separate, not-yet-priced hosted product, and the README says link sharing "remains available for compatibility but is moving to deprecated support," i.e. a feature is being nudged toward the paid product, worth re-checking if we ever depended on the OSS sharing path. The default-open, unauthenticated local server (loopback-only by default, but no auth token even in PLANNOTATOR_REMOTE mode) is a real, if low-severity for its use case, security gap; not comparable to anything in our own trust model since nothing here is meant to face a network.

## 9. Sources

https://github.com/backnotprop/plannotator (cloned depth 1 to ~/repos/market-research-clones/plannotator, 2026-09-29)
README.md
package.json
apps/hook/README.md
apps/hook/hooks/hooks.json
apps/hook/server/index.ts
apps/hook/package.json
apps/review/package.json
packages/core/types.ts
packages/core/feedback-templates.ts
packages/core/annotation-threads.ts
packages/core/external-annotation.ts
packages/shared/types.ts
packages/shared/prompts.ts
packages/shared/live-proxy-node.ts
packages/shared/config.ts
packages/shared/app-html.ts
packages/ui/types.ts
packages/ui/utils/parser.ts
packages/ui/package.json
.claude-plugin/plugin.json (marketplace manifest)
LICENSE-APACHE, LICENSE-MIT
adr/decisions/, adr/research/, adr/implementation/, adr/specs/ (directory listing only)
gh api repos/backnotprop/plannotator (2026-09-29)
gh api repos/backnotprop/plannotator/contributors (2026-09-29)
gh api repos/backnotprop/plannotator/releases (2026-09-29)
gh api users/backnotprop (2026-09-29)
https://plannotator.ai/ (WebFetch, 2026-09-29)
https://plannotator.ai/workspaces (WebFetch, 2026-09-29)
https://news.ycombinator.com/item?id=48495970 (Show HN thread, referenced via WebSearch, 2026-09-29)
https://www.hunk.dev/compare/hunk-vs-plannotator/ (referenced via WebSearch, 2026-09-29)
https://github.com/sanketsudake/dotfiles/pull/84 (referenced via WebSearch, 2026-09-29)
