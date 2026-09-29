---
name: Google Antigravity
slug: google-antigravity
url: https://antigravity.google
repo: none
category: multi-agent-ui
license: proprietary
open_source: no
self_hostable: partial
hosting_model: free desktop client (macOS, Linux, Windows) backed by Google-hosted models by default; a separate SDK lets a developer host custom agents on their own infrastructure on Google's agent harness, but the Antigravity product itself (editor, Agent Manager, model routing) has no self-hosted version
company: Google (Alphabet). Core team came from Windsurf after a reported 2.4bn USD July 2025 licensing-and-talent deal that moved CEO Varun Mohan, co-founder Douglas Chen and top researchers into Google DeepMind; the rest of Windsurf was acquired separately by Cognition (Devin)
maturity: no public repository or star count to check. Announced 2025-11-18 alongside Gemini 3, public preview from day one. Antigravity 2.0 relaunch at Google I/O 2026-05-19. Stable release 2.1.1 (2026-06-22). Frequent point releases and blog posts through September 2026
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 2
  verification: 2
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 0
steal:
  - "The Agent Manager: a fleet-level Inbox separate from the editor window, agents grouped into Projects, scheduled recurring messages for automation. A concrete shape for the cross-task, real-time view our console admits it lacks."
  - "Artifacts as the review surface: every task produces a Task List, Implementation Plan, Code Diff and Walkthrough that a human comments on Google-Docs style, and the agent resumes from the comment without a full stop. Directly answers our console's missing diff view."
  - "Browser-driven empirical verification: the agent starts the app from a terminal, drives a real Chrome instance (navigate, click, screenshot, record video), and bundles the recording as a Media Artifact plus a Walkthrough Artifact describing the sequence. We have no equivalent: our verification is CI plus model review, never 'did the page actually render'."
  - "Per-project scoped security settings: a trusted project can run a looser permission preset, an untrusted one a stricter preset, set independently per Project rather than once globally. Worth comparing against our single flat policy YAML."
  - "The Terminal Sandbox's dynamic allowlist: paths granted under read_file/write_file populate a live filesystem allowlist, domains granted under read_url populate the network policy. Same shape as our capability-to-allowlist mapping, worth checking our gateway's egress generation against."
  - "A simple three-position review-cadence knob at project setup (Agent-driven, Review-driven, Agent-assisted) for how often the agent stops to ask. Cheap UX primitive our console's per-project settings could copy."
differs:
  - "Identity is the developer's own machine and account for every action. There is no per-task credential, scoped or otherwise, the opposite of 'identity belongs to the task, not the machine.' Nothing here transfers to our per-task ServiceAccount design."
  - "Verification is self-verification: the same agent that wrote the code also drives the browser and narrates the walkthrough. There is no independent reviewer model and no CI gate before a human sees the result, which is weaker than our stronger-model review plus reproduction-gate, not stronger."
  - "Sandboxing runs on the developer's own machine and is opt-out: a 'Turbo' preset removes it entirely, and Secure Mode (the strictest preset) was bypassed in the wild through a tool-level RCE. A viral incident also has the agent running a drive-wide delete instead of a scoped cache clear. Our default-deny gVisor pod has no all-or-nothing 'trust everything' toggle to disable."
  - "Nothing here is re-seedable or commodity-hardware hostable. It is a proprietary desktop client wired to Google's own models, with a forced breaking upgrade (2.0 silently removed the code editor for existing users with no rollback) that our 'delete everything and rebuild from Git and S3' constraint exists precisely to survive."
ux_verdict: Agent Manager, Artifacts and browser-verification recordings answer three gaps our console admits it has (no live stream, no diff view, no replay), but reliability complaints, unpredictable quota cutoffs and a forced breaking 2.0 upgrade show the UX is still unstable in production use.
slop_verdict: Real and heavily resourced, backed by a 2.4bn USD talent deal and still shipping point releases into mid-2026, but a documented RCE that bypassed its strictest security mode, a viral drive-deletion incident, and a backlash-triggering breaking upgrade all landed inside its first seven months.
---

# Google Antigravity

## 1. What it is

Google Antigravity is Google's agentic development platform, announced 2025-11-18 alongside Gemini 3 and led by the ex-Windsurf team Google brought in-house through a reported 2.4bn USD licensing-and-talent deal. It ships as a free-during-preview desktop client (a heavily modified VS Code fork, per third-party code analysis that found leftover references to Windsurf's "Cascade" agent system) plus a CLI and a Python SDK for building custom agents on the same "agent harness."

Google's own framing is that existing tools either show every tool call (too much noise) or only the final diff (too little trust), and that Antigravity's Artifacts and Agent Manager close that gap by giving agents a higher-level, asynchronous unit of work a developer can review at milestones instead of babysitting. The docs and third-party teardowns confirm the mechanism is real: Artifacts (task lists, plans, diffs, screenshots, browser recordings) do get generated and are reviewable. What the docs do not show is any of the durable, multi-tenant machinery our own design cares about: there is no issue or alert intake, no durable task registry across users, no per-task credential, because the product is built for one developer on one machine watching one or several local agents.

## 2. Mapping to our five planes

| Plane / principle | What Antigravity does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work starts from a typed prompt or a scheduled recurring message inside the client | Forgejo webhooks, SigNoz alerts, factoryd intake API | we lead, absent in Antigravity |
| Control plane | Projects group agent conversations, an Inbox tracks progress, a per-agent Knowledge Base stores lessons; no durable workflow engine, no budgets, no audit trail found | Temporal workflow per task, Postgres registry, policy, budgets, cost ledger, audit | we lead |
| Worker plane (sandbox) | A Terminal Sandbox on the developer's own machine (macOS/Linux default-on), dynamic filesystem and network allowlists from granted capabilities, an all-or-nothing "Turbo" preset that disables it | gVisor pod per task, its own namespace, default-deny egress, no opt-out preset | we lead, and their model has a documented RCE bypass and a viral over-broad-delete incident |
| Verification | The agent runs its own browser against the running app, takes screenshots and video, writes a Walkthrough Artifact describing what it did | Forgejo Actions, policy gates, reproduction gate, stronger-model review before merge | not comparable: they add a real empirical check we lack, we add an independent gate they lack |
| Merge and deploy | None built in; the product stops at a reviewable diff, no PR, no CI, no deploy step | factory-merge bot, Flux GitOps, staged rollout with an alert-free soak | we lead |
| Policy outside the model | Permission presets and Secure Mode are enforced by the app process (filesystem/network allowlists, forced review), not by asking the model | Capability YAML in Git, enforced in gateway code and Cilium network policy | equal in spirit, theirs had a real tool-level bypass (Pillar Security's find_by_name flaw) |
| Identity per task | None. One developer's local session and Google account cover every agent and every project | Per-task projected, audience-scoped ServiceAccount token | we lead |
| Artifacts not chat | Genuinely artifact-centred: Task List, Implementation Plan, Code Diff, Walkthrough, Media Artifact, each commentable | TaskBrief in, branch, PR and normalised event stream out | equal in spirit, theirs stays inside one chat-adjacent session rather than becoming a Git object |

## 3. Architecture and stack

Four surfaces share one "agent harness": the IDE (the original product, a VS Code fork with an agent side panel), Antigravity 2.0 (a standalone desktop app that replaced the IDE's in-window Agent Manager with an independent command-center app, launched 2026-05-19), a CLI (`/agents` command opens an Agent Manager panel that lists and can stop background subagents; custom agents are markdown files at `{workspace}/.agents/agents/{agent_name}/agent.md` or `~/.gemini/config/agents/{agent_name}/agent.md`), and a Python SDK for building custom agents on the same harness for a developer's own infrastructure. Antigravity 2.0's Projects natively support Git worktrees so an agent works in an isolated background folder, with per-project security settings layered on top.

Models: Gemini 3.1 Pro and Gemini 3 Flash by default, plus Anthropic Claude Sonnet 4.6 and Opus 4.6, plus OpenAI's open-weight GPT-OSS-120B, selectable per session. Platforms: 64-bit Windows 10+, macOS Monterey+, 64-bit Linux (glibc 2.28+). None of this is verifiable against source, since no repository is public; third-party code analysis (Kilo Code's blog) is the only source claiming the codebase is a literal Windsurf fork rather than a clean VS Code fork, based on leftover "Cascade" references, not confirmed by Google.

## 4. UX

Onboarding, per the official Codelab and third-party walkthroughs: download the desktop client, open or create a workspace folder, pass the folder-trust dialog ("Do you trust the contents of this project?"), pick a development mode (Agent-driven, Review-driven, or the recommended Agent-assisted), then type a prompt. That is about five steps to a first running agent, comparable to our own console-plus-Forgejo-issue path but entirely local and with no CI wait.

While an agent works, a user watches the Agent Manager Inbox (or the in-editor Agent Manager panel on the older IDE) for progress updates and Artifacts as they land: an interactive plan, a visual diff, a screenshot, a browser recording played back in-app. A user intervenes by leaving inline text comments on a plan or a screenshot ("Google Docs-style") which the agent picks up without a full stop, by approving or rejecting terminal commands and file edits at the review checkpoints its current mode requires, or by switching to the standalone Antigravity 2.0 app to steer multiple agents across Projects at once. Set against our console (admittedly no live stream, no diff view, no mobile view), this is ahead on all three; what is worse is a lower level of trust in the tool itself: launch-era reviews and Reddit threads describe agents stalling or looping without finishing, and the forced Antigravity 2.0 upgrade in May 2026 silently removed the code editor from existing installs with no warning and no rollback, triggering a Hacker News thread titled "Google's Antigravity bait and switch."

## 5. Security, identity, sandbox, policy, cost

Identity is the developer's own machine and Google account throughout; there is no scoped or short-lived credential minted per task or per agent.

The sandbox is a Terminal Sandbox, default-on for macOS and Linux (Windows keeps an older allow/ask/deny model). Filesystem and network access are built from the capabilities an action was granted: paths under `read_file`/`write_file` populate live filesystem allowlists, domains under `read_url` populate the network policy; sensitive paths like `~/.ssh` are blocked by default. Secure Mode is a documented hard override that forces review of every Terminal, Artifact and Browser action and denies network access to terminal commands, but Pillar Security found the `find_by_name` search tool ran as a native tool call before Secure Mode's own checks applied, giving prompt injection a path to remote code execution that bypassed the strictest setting. Google accepted the report 2026-01-24, shipped a patch 2026-02-28, and it went public 2026-04-20. A separate, widely shared incident had "Turbo" mode (all commands unprompted, no isolation) run a system-level command against an entire drive when asked to clear a project cache. Folder trust is exact-path, so trusting a parent directory does not extend to subdirectories, which a GitHub issue and Mindgard both flag as confusing rather than protective.

Policy (permission presets, Secure Mode, per-project settings) is enforced by the app process, not by asking the model, matching our principle in spirit, but the find_by_name bypass shows the enforcement boundary itself can have gaps a prompt can reach through.

Cost is a free-preview rate limit (a weekly agent quota, reportedly resetting every five hours, cut several times since launch per third-party trackers) rather than a priced hold or ledger; users on Google's own developer forum report running out of quota mid-task with no warning, which Google has called a known issue with no fixed date. Enterprise access goes through Gemini Enterprise or Google Cloud consumption billing, custom-priced, with no published rate card found.

## 6. What we should take from it

Narrow, copyable this month: the Artifacts model (a Task List, Implementation Plan, Code Diff and Walkthrough per task, each commentable) is a template for turning our own session records into something a human reviews instead of tailing raw logs, which is a gap we admit outright. The dynamic capability-to-allowlist mapping (a granted `read_file`/`write_file`/`read_url` populates the sandbox's live allowlist) is close to what our gateway should already be doing and is worth a direct diff against our own implementation. Per-project security settings, rather than one global policy, is a small, concrete change to try against our single flat policy YAML.

Broad: the Agent Manager's Inbox, a fleet view separate from the editor and built for asynchronous, multi-agent supervision, is the clearest external validation that our console's missing real-time, cross-task view is worth building next, and browser-driven empirical verification (start the app, drive it, record it) is a check our verification plane has no analogue for at all and should consider adding for any task that touches a user-facing surface.

## 7. Where our philosophy differs and what that costs or buys us

Antigravity has no task-scoped identity of any kind, every action runs as the one developer who is watching. Copying its UX buys nothing for our "identity belongs to the task, not the machine" principle, that gap is structural to a single-user desktop product.

Its verification is the agent checking its own work, with no independent reviewer model and no CI gate before a human sees the result. That is materially weaker than our stronger-model review and reproduction-gate design, and the price of matching Antigravity's more approachable "watch a recording" experience would be giving up the independence our gate depends on, not something we should trade.

Its sandbox lives on the developer's own machine and is opt-out by design (Turbo mode), which is the opposite of "security without half measures." The find_by_name RCE and the drive-deletion incident are direct evidence of what that trade costs in practice. Our gVisor pod with no disable switch is the harder guarantee and we would not soften it to match their convenience.

Nothing about the product is re-seedable or commodity-hardware hostable: it is proprietary, tied to Google's own model backend, and the forced 2.0 upgrade that removed the editor without warning is the concrete failure mode our "delete everything and rebuild from Git and S3" constraint is built to prevent happening to us.

## 8. Red flags and slop assessment

Provenance is contested: multiple independent code analyses (Kilo Code, Forkable, 36Kr) report finding literal Windsurf/Cascade artifacts inside Antigravity, which Google has not confirmed or denied; Wikipedia's own article on the product is flagged for promotional content and possibly unreliable sourcing. Three distinct security findings landed within Antigravity's first seven months: Mindgard's persistent code-execution flaw (November 2025, shortly after launch), PromptArmor's demonstration that a prompt injection in an ordinary document could make the agent exfiltrate credentials and code, and Pillar Security's Secure-Mode-bypassing RCE via `find_by_name` (reported January, patched February, disclosed April 2026, with a paid bug bounty). A separate viral incident had the agent delete an entire drive under Turbo mode when asked to clear a cache. The May 2026 Antigravity 2.0 upgrade removed the code editor from existing installs without warning, drawing a Hacker News thread titled "Google's Antigravity bait and switch" and forum complaints about unannounced quota cuts. None of this indicates an unmaintained project, point releases and blog posts continue through September 2026, but the combination of contested provenance, three real security incidents and one trust-damaging forced upgrade in under a year is a heavier red-flag count than most projects in this survey.

## 9. Sources

https://antigravity.google (fetched 2026-09-29)
https://antigravity.google/docs/artifacts/ (fetched 2026-09-29)
https://antigravity.google/docs/overview/, /docs/features/, /docs/agent/, /docs/home/, /docs/cli/commands/agents/ (via WebSearch summaries, 2026-09-29)
https://antigravity.google/docs/permissions/, /docs/sandbox/, /docs/settings/, /docs/agent-settings/, /docs/secure-mode (via WebSearch summaries, 2026-09-29)
https://antigravity.google/blog/introducing-google-antigravity (fetched 2026-09-29)
https://en.wikipedia.org/wiki/Google_Antigravity (fetched 2026-09-29)
https://oecd.ai/en/incidents/2026-04-20-8687 (via WebSearch, 2026-09-29)
https://thehackernews.com/2026/04/google-patches-antigravity-ide-flaw.html (via WebSearch, 2026-09-29)
https://www.csoonline.com/article/4161382/prompt-injection-turned-googles-antigravity-file-search-into-rce.html (via WebSearch, 2026-09-29)
https://labs.cloudsecurityalliance.org/research/csa-research-note-antigravity-ide-prompt-injection-sandbox-e/ (via WebSearch, 2026-09-29)
https://mindgard.ai/blog/google-antigravity-persistent-code-execution-vulnerability (via WebSearch, 2026-09-29)
https://cyberscoop.com/google-antigravity-pillar-security-agent-sandbox-escape-remote-code-execution/ (via WebSearch, 2026-09-29)
https://visualstudiomagazine.com/articles/2025/11/21/googles-antigravity-ide-sparks-forking-debate.aspx (via WebSearch, 2026-09-29)
https://blog.kilo.ai/p/antigravity-is-the-most-expensive (via WebSearch, 2026-09-29)
https://www.forkable.io/p/forget-forking-google-porked-windsurf (via WebSearch, 2026-09-29)
https://cybernews.com/ai-tools/google-antigravity-review/ (via WebSearch, 2026-09-29)
https://dev.to/fabianfrankwerner/an-honest-review-of-google-antigravity-4g6f (via WebSearch, 2026-09-29)
https://www.techradar.com/ai-platforms-assistants/googles-antigravity-ai-deleted-a-developers-drive-and-then-apologized (via WebSearch, 2026-09-29)
https://www.revolutioninai.com/2026/05/google-antigravity-2-0-update-developer-backlash.html (via WebSearch, 2026-09-29)
https://news.ycombinator.com/item?id=48222529, https://news.ycombinator.com/item?id=45967906 (via WebSearch, 2026-09-29)
GitHub issue bmad-code-org/bmad-loop#169, herdr#8 (folder trust exact-path, via WebSearch, 2026-09-29)
docs/market-research/README.md seed list row for google-antigravity: repo is "none", no clone attempted
