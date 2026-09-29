---
name: Lovable
slug: lovable
url: https://lovable.dev
repo: none
category: app-builder
license: proprietary
open_source: no
self_hostable: no
hosting_model: cloud SaaS only; generated frontend code can two-way sync to GitHub, GitLab or Bitbucket and be redeployed elsewhere, backend is Supabase (own project or Lovable Cloud)
company: Lovable AB, Stockholm, founded Nov 2023 (as GPT Engineer, rebranded Nov 2024), ~950M USD raised, 13.3B USD valuation at Series C (Aug 2026, led by Menlo Ventures and EQT Scaleup Europe Fund)
maturity: no public repo; launched Nov 2024, changelog entries roughly every 1-2 weeks, ~600M USD ARR run-rate and 8M+ users reported by the company (Sept 2026, not independently audited), 60M+ projects created
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 1
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 2
  ux: 5
  reseedable_selfhost: 0
steal:
  - "Preview toolbar: click (or Cmd/Ctrl-click for multi-select) any rendered element in the live app, then describe the change in plain language, no separate editor panel to open first"
  - "Stable per-element IDs injected by a custom Vite plugin that survive AI edits, so a click in the rendered DOM maps back to the exact JSX node both ways, the mechanism that makes click-to-edit reliable instead of fragile"
  - "Three-mode split (Chat to talk without touching code, Plan to produce a reviewable .lovable/plan.md before any edit, Build to execute) gives a cheap, visible checkpoint before an agent commits to changes"
  - "Per-message credit cost shown inline in the chat history, and viewable while a message is still running, granular and legible cost attribution a user sees live rather than after the fact"
  - "Prompt queuing: a user can stack follow-up instructions while an earlier build is still running, instead of blocking on one turn at a time"
  - "Subagents (May 2026) show up as separate threads in an activity log, a concrete answer to 'what is the agent doing right now' for a multi-step task"
differs:
  - "Lovable puts almost no policy between the model and the generated backend: default Supabase schemas without Row Level Security plus client-embedded anon keys caused CVE-2025-48757 (170+ apps with world-readable databases) and an April 2026 BOLA flaw in Lovable's own API that exposed other users' projects and credentials for 48 days. Their trust model assumes a human reviews the generated code, but the product is sold to people who cannot; copying their speed would cost the policy-outside-the-model and default-deny posture that is one of our four constraints, not an implementation detail"
  - "The whole product assumes one human is present and driving continuously: chat, preview and 'publish to a live URL' are the same button for the same person, with no separate approval role and no staged rollout. Our factory is triggered by an issue with no human present, and treats merge as a gated workflow state. Adopting Lovable's immediate-publish loop for anything but a human's own live editing session would break the human-approval guarantee in our merge and deploy plane"
ux_verdict: best in class for one person continuously steering a single visual project by chat, click-to-select and image reference, with almost no onboarding friction; it has no concept of a human who is absent when work starts or who is reviewing many unattended tasks at once
slop_verdict: real and used at large scale (reported 600M USD ARR run-rate, 8M+ users, named enterprise customers), but its default security posture produced two well-documented breaches in thirteen months, so the "AI tests your apps" and enterprise-security marketing outruns what ships by default
---

# Lovable

## 1. What it is

Lovable (Lovable AB, Stockholm) sells a browser-based tool that turns a natural-language prompt into a working full-stack web app: React frontend, Supabase-backed database and auth, editable code, and a one-click publish to a live URL. It targets non-developers and small teams ("vibe coding"): founders, designers, product managers building an MVP or internal tool without hiring an engineer. It is closed-source SaaS, priced on a credit system, no self-hosting.

The company claims 8 million users, 60 million projects created and 900 million monthly visits to Lovable-built apps (its own figures, not audited). Independent reporting confirms real, large-scale use (named customers including Adidas, Nvidia, Deutsche Telekom) and real revenue growth, but also confirms Lovable's own generated apps have repeatedly shipped with exploitable default security gaps, a gap between the "safe to build a real business on" claim and what ships by default.

## 2. Mapping to our five planes

| Plane / principle | What Lovable does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work starts only from a human typing a prompt into a chat, never an issue, alert or telemetry event | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | Per-project chat history, version history and a workspace credit balance; no task registry, no scheduler, no durable workflow across sessions | factoryd with a Temporal workflow per task, Postgres, policy in Git | we lead |
| Worker plane | One persistent Node.js dev container per project on Fly.io (Lovable's blog says over 4,000 running), kept alive for live preview, not a disposable per-task sandbox; no disclosed egress policy | One gVisor pod per task, read-only root, default-deny egress | we lead (inference, container isolation not documented in security terms) |
| Verification | A Jan 2026 release claims the agent "tests your apps like a real user" before finishing a build; no CI, no gate, no review step before publish | Forgejo Actions, policy gates, stronger-model review before merge | we lead |
| Merge and deploy | "Publish" is one click by the same person who wrote the prompt, to a live URL immediately; GitHub, GitLab and Bitbucket two-way sync turns every prompt into a commit for teams that want it | Bot merge after human approval or a strict auto rule, staged GitOps rollout | we lead |
| Policy outside the model | Not found. Security controls (RBAC, SSO, SCIM, audit log) govern human access to the workspace, not what the agent may do to code or data | Capability rules as a YAML file in Git, enforced in gateway code and network policy | we lead |
| Identity per task | None. One workspace identity persists for a project's life; secrets (Supabase anon keys, Stripe keys) are generated straight into the app, the root cause of both public incidents | Projected, per-task ServiceAccount token verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | Opposite model: the chat transcript is the primary interface and the locus of intent; GitHub sync exports commits but does not replace the chat as the coordination mechanism | TaskBrief in, branch and PR out, no persistent chat | differs (see section 7) |

## 3. Architecture and stack

No public repository exists; everything below is drawn from Lovable's own engineering blog and docs, not independently verified against source. Frontend: React, TypeScript, Tailwind, Vite. A custom Vite plugin tags every AI-generated JSX element with a stable ID that survives edits, letting the preview toolbar map a click in the rendered DOM back to exact source. Visual edits are applied client-side as AST mutations (Babel or SWC) plus a client-side Tailwind class generator, previewed before save, then diffed and pushed to the project's cloud dev container, which fires a Vite Hot Module Replacement to refresh the preview without a reload. Backend: Supabase (Postgres, Row Level Security, Auth, Storage, Edge Functions) either in the user's own Supabase project or Lovable's own managed "Lovable Cloud". Each project's dev and preview environment is an isolated Node.js container hosted on Fly.io; Lovable's blog states over 4,000 such containers run concurrently. Deployment: publish to a lovable.app subdomain, or two-way sync to GitHub, GitLab or Bitbucket (every Lovable prompt becomes a commit, external pushes pull back in) so any other host can redeploy on commit.

## 4. UX

Zero to a first result is: sign up, type one sentence describing the app, wait roughly a minute for the first build, get a live preview. No tutorial gates this. From there, three modes carry one continuous conversation: Chat (discuss without touching code), Plan (produces a reviewable plan file, saved as .lovable/plan.md, that the user can edit paragraph by paragraph before anything is built, one credit per revision), and Build (executes, autonomous, was called "Agent mode"). A non-developer steers the agent through: plain-language chat messages, attaching a screenshot or Dribbble image as a design reference, and the preview toolbar, which lets a user select one or several rendered elements (click, or Cmd/Ctrl-click to multi-select) or draw an annotation directly on the live app and describe the wanted change, no code and no separate editor. Inline text edits are free (100 per account, refilling daily); other toolbar edits and all chat-driven builds cost credits shown per message, including while a message is still running. Users can queue several prompts while an earlier one is still processing. Multi-step work is made visible through an activity log, and since May 2026 through named subagents that the main build agent spawns for parallel sub-tasks, each shown as its own thread. Recovery is one-click restore from version history. This is a materially richer watch-and-steer surface than our console, which today has no live diff view and no real-time stream of a running task.

## 5. Security, identity, sandbox, policy, cost

Security is sold at the workspace level: SOC 2 Type II, ISO 27001:2022, AIUC-1 and GDPR claims, plus 2FA, SSO, SCIM and audit logs for human members (not independently verified here). None of this constrains what the agent may write into a project's database schema or client code. Identity is a single persistent workspace and project identity for the app's whole life; there is no per-task or per-session credential scoping, and generated apps have shipped with Supabase anon keys embedded client-side against tables with no Row Level Security, the direct cause of CVE-2025-48757 (170+ apps, full unauthenticated table reads) and a separate April 2026 broken-object-level-authorisation flaw in Lovable's own API that exposed other users' projects and credentials for 48 days before a full fix. Sandbox isolation exists only as an operational convenience (a per-project Fly.io container for live preview), not as a documented security boundary; no egress policy is published. Policy is reactive, not upfront: after the 2025 incident Lovable added a security scanner and later partnered with Guardio to scan generated sites for phishing and scam content, both downstream checks rather than a capability model that would stop unsafe generation earlier. Cost control is a prepaid credit ledger: workspace admins set a default monthly credit cap per member with per-member overrides, per-message cost is shown before and during execution, but there is no hard per-task spend hold or worst-case-price clamp comparable to our gateway, a member simply stalls or the workspace runs out of balance.

## 6. What we should take from it

Narrow: the click-to-select-then-describe preview toolbar and its stable-JSX-ID mechanism are a concrete, cheap pattern if our console ever needs a non-engineer to point at a rendered UI element rather than write a paragraph of prose to describe it. The Chat, Plan, Build split, with an approved plan saved to a file before any edit happens, is a small, legible checkpoint worth copying for any task type where a human should see and edit a plan before an agent starts changing files, current opencode-based workers do not surface this. Per-message live cost display (including while a message is still running) is a low-effort improvement to our own cost view per task.

Broad: Lovable's real product lesson is that showing the user a live, working artifact within a minute of the first prompt, and letting every subsequent instruction be either a chat message or a direct click on that artifact, removes almost all onboarding friction. Our console has no equivalent because our tasks are not visual web apps and are not driven by one continuously present human, but the underlying idea, that watching a task should not require reading logs, still applies to a diff view or a run trace, which our own weak-points list already names as missing.

## 7. Where our philosophy differs and what that costs or buys us

Lovable's speed comes from skipping almost everything our design calls verification and policy: no gate before publish, no capability model for the agent's own actions, and defaults (unscoped Supabase keys, no RLS) that assume a human will review the generated code, a group of users the product is explicitly sold to and who cannot do that review. That is not a smaller version of our design, it is the opposite trade, and the two public incidents are the direct, measured cost of it. The other core difference is presence: Lovable has no notion of a task that starts and runs while no human is watching, publish and edit are the same person's live session. Our whole control plane, budgets, supervision and approval-as-workflow-state exist to make unattended work safe; none of that has a place in Lovable's model, and borrowing their UX would still need our identity, policy and verification planes underneath it, unchanged.

## 8. Red flags and slop assessment

Two well-documented, named incidents in thirteen months: CVE-2025-48757 (missing Row Level Security, 170+ exposed apps, publicly disclosed by Matt Palmer after a slow response from Lovable) and an April 2026 broken-object-level-authorisation flaw in Lovable's own API, where Lovable's first public response denied a breach and blamed its bug-bounty vendor before it apologised and confirmed a permissions mistake. Guardio's 2025 VibeScamming research also found Lovable would readily build functional phishing pages with an admin dashboard for captured credentials, before Lovable added Guardio-based content scanning in November 2025. None of this indicates a defunct or abandoned project, the company is well-funded (13.3B USD valuation, 950M USD raised) and growing fast, but the pattern across independent coverage (Semafor, Cybernews, The Next Web) is that Lovable's incident communication, not just its default security posture, has been weak.

## 9. Sources

- https://docs.lovable.dev (fetched 2026-09-29)
- https://docs.lovable.dev/integrations/supabase (fetched 2026-09-29)
- https://docs.lovable.dev/integrations/github (fetched 2026-09-29)
- https://docs.lovable.dev/features/agent-mode (fetched 2026-09-29)
- https://docs.lovable.dev/features/preview-toolbar (fetched 2026-09-29)
- https://docs.lovable.dev/changelog (fetched 2026-09-29)
- https://lovable.dev/blog/visual-edits (fetched 2026-09-29)
- https://lovable.dev/blog/agent-mode-beta (fetched 2026-09-29)
- https://lovable.dev/blog/chat-mode-and-questions (fetched 2026-09-29)
- https://lovable.dev/blog/a-smarter-lovable (fetched 2026-09-29)
- https://lovable.dev/blog/lovable-2-0 (fetched 2026-09-29)
- https://lovable.dev/blog/series-b (fetched 2026-09-29)
- https://lovable.dev/pricing (fetched 2026-09-29)
- https://sacra.com/c/lovable (2026-09, revenue and ARR figures)
- https://en.wikipedia.org/wiki/Lovable_company (funding history, founding)
- https://www.forbes.com/sites/iainmartin/2025/07/23/vibe-coding-turned-this-swedish-ai-unicorn-into-the-fastest-growing-software-startup-ever (2025-07-23)
- https://mattpalmer.io/posts/2025/05/statement-on-CVE-2025-48757 (2025-05-29)
- https://mattpalmer.io/posts/2025/05/CVE-2025-48757 (2025-05-29)
- https://www.superblocks.com/blog/lovable-vulnerabilities
- https://thenextweb.com/news/lovable-vibe-coding-security-crisis-exposed (2026-04)
- https://www.computing.co.uk/news/2026/security/lovable-flaw-exposed-source-code-credentials-and-ai-chats (2026-04)
- https://cybernews.com/security/lovable-vibe-coding-flaw-apology (2026-04)
- https://www.theregister.com/2026/02/27/lovable_app_vulnerabilities (2026-02-27)
- https://thehackernews.com/2025/04/lovable-ai-found-most-vulnerable-to (2025-04, Guardio VibeScamming)
- https://www.calcalistech.com/ctechnews/article/hjniwdwjbe (2025-11, Guardio partnership)
- WebSearch: Lovable AI app builder funding valuation 2026 company history (2026-09-29)
- WebSearch: Lovable.dev how it works chat visual edits live preview non-developer onboarding (2026-09-29)
- WebSearch: Lovable.dev Supabase integration GitHub sync architecture (2026-09-29)
- WebSearch: Lovable AI security incident exposed database vulnerability 2025 research (2026-09-29)
- WebSearch: Lovable app builder review criticism vibe coding security flaws Guardio (2026-09-29)
- WebSearch: Lovable.dev changelog 2026 agent mode chat mode planning autonomous (2026-09-29)
- No public repository, repo field is none in the seed table, no clone performed
