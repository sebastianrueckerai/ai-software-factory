# Market sweep: what the research backs for the landing page

Written 2026-10-21 for the "why not the others" table and the film tail.

Seven of the twelve differentiators are rare or unique: re-seed from Git, identity per task, hard spend caps, the process file, the telemetry loop, full auto, and spec-driven criteria with a single end gate (unique only as a combination). Five are common and the page should not lead with them: open source and self-hosting, policy outside the model, the gate stack, model independence and chat intake.

## How to read this report

- Every path is a link. The labels at the end of the file give the full path. A citation reads `[report §section][label]`.
- I read in full: [SYNTHESIS][synthesis], [our vision][vision], the 13 reports named in the brief, [pitch][pitch], [spec-driven][specdriven]. I read the matrix as a table and computed all counts from it. I also read the front matter of the Kiro, Tessl, OpenSpec, Spec Kit, Augment Intent, Blitzy and StrongDM Attractor reports, and the competitor table in the [spec intake concept][concept].
- Matrix scores are relative to our design. 3 equals us, 5 is clearly better, 0 is absent. A score of 3 or more means "at least as strong as we are". The synthesis says a one-point difference is noise ([SYNTHESIS §9][synthesis]).
- "34 orchestrators" means the 34 matrix rows with category `factory-orchestrator`. Their mean scores are 1.3 for identity, 1.3 for cost, 1.6 for reseedable self-host, 1.7 for policy, 2.1 for verification, 2.5 for signals and 3.6 for UX ([matrix][matrix], computed).
- The research is dated 2026-09-29. Our spec-driven process was built after that. The research lists "spec-driven intake does not exist yet" as our weakness ([vision][vision]). No report can confirm a spec-driven claim of ours. Only the competitor side is checked here.
- Two competitors changed owner around the research date. SpaceX closed its purchase of Cursor on 2026-08-14 ([cursor §1][cursor]). OpenAI announced it would buy Ona on 2026-06-11 and the deal had not closed ([ona §1][ona]). Check both again before launch.

## 1. Verdicts

The question: which of our twelve claims does the research back, and how rare is each? Counts are from the 148 matrix rows. "Safe wording" is the strongest sentence the research supports.

| # | Differentiator | Verdict | Matrix count | Safe wording |
|---|---|---|---|---|
| 1 | Open source, self-hosted, cheap servers, any cloud | common | 68 of 148 are open source and self-hosted. 14 of 34 orchestrators | "Open source and self-hosted on rented servers." Drop "any cloud". No report tests a second cloud |
| 2 | Wipe and re-seed from Git, control plane included | rare | 0 commercial products. 9 of 34 orchestrators score 3 or more, 3 score above us | "Delete everything and rebuild from Git, control plane included." Say "no commercial product we surveyed does this" |
| 3 | Identity per task, short-lived credentials | rare | 3 of 34 orchestrators score 3 or more. 26 of 148 | "A fresh identity for every task, checked by the cluster." Do not say "no credential at all" (see 2.3) |
| 4 | Hard spend caps with holds | rare | 3 of 34 orchestrators score 3 or more. 18 of 148. The hold itself exists in 3 gateway tools | "The factory reserves the money before each model call." Do not say "only" |
| 5 | Policy outside the model | common | 8 of 34 orchestrators score 3 or more. 56 of 148 | Claim the design, never the idea. Contrast with products that rely on prompts or a timer |
| 6 | Evidence-ranked gates | common | 14 of 34 orchestrators score 3 or more. 30 of 148 | List the gates. Do not call the stack rare |
| 7 | Criteria with named proofs, one end gate | unique as a combination | No other row runs named tests and requires them green. Parts exist in 4 tools | "Among the 148 tools we surveyed, none runs the tests its criteria name and requires them green" |
| 8 | Process as one YAML per project, prompts as data | rare | 5 or more named orchestrators use a per-project workflow file. No matrix column | "The process is a file you edit. A floor of four stages stays" |
| 9 | Telemetry loop, alerts and reports file fix cards | rare | 7 of 34 orchestrators score 4 or more for signals. 1 scores 5 (Cursor) | "Alerts file the fix card." Do not claim the deploy and soak half is new |
| 10 | Model independence, replaceable harness | common | LiteLLM is the common base. 7 gateways and 6 ACP adopters in the matrix | Leave it out of the table. The concept already does |
| 11 | Full auto, human holds spending and roadmap | rare | Auto-merge is rare. 4 named tools merge without a human | "At full auto the factory asks only for decisions and money." Footnote forbidden paths and migrations |
| 12 | One chat replaces writing cards | common | UX scores 4 or more in 78 of 148 rows | Show it in the film. Do not put it in the table |

## 2. Evidence per differentiator

Each table names who has the feature, who has part of it and who lacks it.

### 2.1 Open source, self-hosted, cheap servers, any cloud

Open and self-hosted is common (74 of 148 rows are open source, 87 are self-hostable, 68 are both). The table shows how the named competitors fall.

| Product | Has it? | Evidence | Source |
|---|---|---|---|
| Devin | lacks | Control plane stays in Cognition's cloud at every tier. The VPC option moves sandbox compute only | [devin §7][devin] |
| Factory | lacks | Closed. Hybrid and airgapped modes are Enterprise only. Airgapped is the CLI with a policy file | [factory §3][factory] |
| Cursor | lacks | Self-hosted machines move the worker only. Agent loop and inference stay in Cursor's cloud. No on-prem | [cursor §3][cursor] |
| Jules | lacks | Google-hosted SaaS only | [jules front matter][jules] |
| GitHub Agent HQ | lacks | SaaS only, on GitHub-hosted runners and Azure | [github §7][github] |
| Managed Agents | lacks | Self-hosted sandboxes move tool execution only. Orchestration, state and billing stay with Anthropic | [cma §3][cma] |
| Ona | lacks | Management plane is always SaaS. The open Gitpod version is deprecated | [ona §7, §8][ona] |
| GitLab Duo | partial | Self-managed on Premium or Ultimate with a self-hosted AI gateway. Server code is under the paid EE licence | [gitlab §8][gitlab] |
| OpenHands | partial | Agent and SDK are MIT. Kubernetes sandbox server, multi-forge resolvers and fleet features are PolyForm Free Trial (30 days a year) | [openhands §8][openhands] |
| ABCA (AWS sample) | partial | MIT-0 and self-hosted, but only into your own AWS account through CDK. It is in maintenance mode | [abca §7, §8][abca] |
| Symphony | has part | Apache-2.0, one daemon on a trusted host. OpenAI will not maintain it as a product | [symphony §1, §8][symphony] |
| ESF | has part | MIT, one host or Helm. It never pushes or opens a PR. No production deployment is qualified | [esf §1, §8][esf] |
| Stripe Minions | lacks | Internal only | [stripe front matter][stripe] |

What is not backed: "any cloud". The vision names Hetzner as the reference and the goal calls it an example ([vision][vision]). No report tests a second provider. The vision also lists one forge only (Forgejo) as a weakness.

### 2.2 Wipe and re-seed from Git, control plane included

The synthesis says no commercial product lets a customer rebuild the control plane from Git ([SYNTHESIS finding 3][synthesis]). Among orchestrators the matrix scores a few tools above us, but they are small.

| Product | Reseed score | Evidence | Source |
|---|---|---|---|
| Devin | 0 | No version a customer can delete and rebuild from Git and object storage | [devin §7][devin] |
| Managed Agents | 0 | "No way to reconstruct CMA's control plane from Git" | [cma §7][cma] |
| Stripe Minions | 0 | Internal system | [stripe][stripe] |
| Jules | 0 | SaaS only, no re-seed story | [jules §7][jules] |
| GitHub Agent HQ | 0 | SaaS only | [github §7][github] |
| Factory, Cursor, Ona, GitLab Duo, ABCA | 1 | Hosted control plane or AWS-only CDK | [factory §7][factory], [cursor §7][cursor], [ona §7][ona], [gitlab][gitlab], [abca §7][abca] |
| OpenHands, Symphony, ESF | 2 | Symphony is almost stateless, but its host is hand-built and not code | [symphony §7][symphony], [esf][esf], [openhands][openhands] |
| Machinist, Sortie, Gas Town | 4 | Single Go binary plus SQLite, or a CLI. Re-seed means delete the file. Sandbox score 0 or 1 | [machinist §7][machinist], [sortie §3][sortie], [matrix][matrix] |

Counts: 9 of 34 orchestrators score 3 or more, and 15 of 148 rows score 4 or more ([matrix][matrix]). The high scorers are single-host tools with no multi-service control plane. Our 21-minute rebuild comes from our own vision file and no report verified it ([vision][vision]).

### 2.3 Identity per task, short-lived credentials

| Product | Score | Evidence | Source |
|---|---|---|---|
| GitLab Duo | 4 | Composite identity binds the agent to the human who triggered it. Token chain lives 1 hour to about 3 days and the executor holds it | [gitlab §5, §7][gitlab] |
| Managed Agents | 4 | Write-only vaults substitute at egress. The git token is fetched once and discarded before the agent loop | [cma §5][cma] |
| ABCA | 4 | Per-task IAM role through `sts:AssumeRole`. The GitHub PAT is one long-lived token per repository, shared by all tasks | [abca §5][abca] |
| Devin | 3 | Outposts worker pods hold no account credentials. How hosted sessions mint credentials is not verified | [devin §5][devin] |
| Ona | 3 | OIDC to STS, per environment, Enterprise only | [ona §5][ona] |
| Cursor | 2 | Team secrets sit in the agent environment. A short-lived OIDC token is opt-in | [cursor §5][cursor] |
| OpenHands | 2 | One shared static init key bootstraps every sandbox in a pool | [openhands §5][openhands] |
| Factory | 1 | OAuth rotated every 30 days, a long-lived CI key, the machine's own git credentials | [factory §5][factory] |
| GitHub Agent HQ | 1 | Long-lived repository secrets as plain environment variables | [github §5][github] |
| Stripe, Symphony, ESF | 1 | Not disclosed, host `gh` login reachable by the agent, static named references | [stripe §5][stripe], [symphony §5][symphony], [esf §5][esf] |
| Jules | 0 | One static per-user API key | [jules §5][jules] |

Counts: 3 of 34 orchestrators score 3 or more (ABCA, FactoryKit, Tembo). 26 of 148 rows do, and 11 score 4 ([matrix][matrix]).

Two hazards for the wording. First, keeping the key out of the sandbox is the market consensus: 12 or more projects inject credentials at egress ([SYNTHESIS §3][synthesis]). The rare part is a per-task identity that the cluster verifies. Second, our worker still holds two per-session Forgejo tokens before the agent starts and after it ends ([vision][vision]). The synthesis lists removing them as a shortlist item ([SYNTHESIS §8][synthesis]). "No standing credential in the agent" is true. "No credential anywhere in the pod" is not.

### 2.4 Hard spend caps with holds

| Product | Score | Evidence | Source |
|---|---|---|---|
| ABCA | 3 | Per-task budget enforced client-side. Team budgets are planned, not built | [abca §5][abca] |
| Sortie | 4 | Per-issue token ceiling checked before each re-dispatch. Tokens, not money. No pre-call hold | [sortie §5][sortie] |
| Weave Router (gateway) | 4 | Hold-then-settle: reserve a worst-case bound, then settle | [weave-router §5][weave] |
| Cycles (library) | 4 | Atomic reserve across scopes, overage policies, fail-closed | [cycles front matter][cycles] |
| TensorZero (gateway) | 3 | Estimate up front, reconcile after. Archived 2026-06 | [tensorzero front matter][tensorzero], [SYNTHESIS finding 5][synthesis] |
| Devin | 2 | Per-session and per-cycle ACU limits. They bound a period, not a single call | [devin §5][devin] |
| Cursor | 2 | Team cap. Docs say enforcement "is not instant". Reported overruns over 2,000 USD in two days | [cursor §5][cursor] |
| Factory | 2 | Rolling usage windows. No per-task cap | [factory §5][factory] |
| GitLab Duo | 3 | Credits ledger and per-user caps. No refusal before a call | [gitlab §5][gitlab] |
| Managed Agents | 3 | Per-session hours and a grading-loop cap. No multi-task envelope | [cma §5][cma] |
| GitHub Agent HQ | 1 | Org budgets. No per-task cap | [github §5][github] |
| OpenHands | 1 | A `max_budget_per_task` field. Enforcement point not verified | [openhands §5][openhands] |
| ESF, Symphony, Stripe, Jules, Ona | 0 to 1 | Evidence only, none, undisclosed, flat quotas, credits | [esf §5][esf], [symphony §5][symphony], [stripe §5][stripe], [jules §5][jules], [ona §5][ona] |

Counts: 3 of 34 orchestrators score 3 or more. 18 of 148 rows do and 6 score 4 ([matrix][matrix]).

The hold is not unique. Three gateway or library tools do the same step. No orchestrator among the 13 reports does it. The "fund or end" stop has no precedent in the reports I read. Sortie's schema has `parked_issues` and `budget_hold_notices` tables, so it may be near ([sortie §3][sortie]). I did not check it.

### 2.5 Policy outside the model

| Product | Enforced outside the model? | Evidence | Source |
|---|---|---|---|
| Devin | yes, role-based | Security Profiles and custom roles, server side | [devin §5][devin] |
| Factory | yes, but in the client | Hierarchical settings enforced by the `droid` client on the agent's own host | [factory §5][factory] |
| Cursor | cloud yes, desktop no | Server-side dashboard for cloud agents. Desktop guardrails are "best-effort". A real attack told a cloud agent the breach was an authorised test and it went ahead | [cursor §5, §8][cursor] |
| GitHub Agent HQ | yes | Firewall, hooks, branch protection. Its docs say approvals are "not a security control" | [github §4, §5][github] |
| GitLab Duo | yes, strong | Tool governance matrix, fails closed | [gitlab §5][gitlab] |
| ABCA | yes, strong | Cedar on every tool call with a soft tier that asks a human | [abca §5][abca] |
| Managed Agents | mostly | `auto` mode hands the call to a server-side model | [cma §5][cma] |
| Ona | yes | Deny lists and a kernel exec gate with a disclosed bypass | [ona §5][ona] |
| OpenHands | no | Risk analyser and confirmation policy run in the agent process | [openhands §5][openhands] |
| Symphony | no | Workflow rules are prompt text | [symphony §5][symphony] |
| Jules | no | The plan gate auto-approves on a timer | [jules §5][jules] |

Counts: 8 of 34 orchestrators score 3 or more. 56 of 148 rows do, and 27 score 4 ([matrix][matrix]). The synthesis rates us "equal on principle, behind on expressiveness" ([SYNTHESIS §4][synthesis]). Cedar-style session-aware rules and GitLab's matrix are richer than our one YAML file.

### 2.6 Evidence-ranked gates (tests, policy, stronger-model review)

| Product | Evidence | Source |
|---|---|---|
| Factory | Two-pass review (candidates, then validator), STRIDE review, CI Steward with budgets | [factory §2][factory] |
| Cursor | Bugbot multi-pass review and Security Review. Result is neutral by default, so it does not block a merge | [cursor §2][cursor] |
| Devin | Devin Review. Advisory unless the customer's branch protection requires it | [devin §2][devin] |
| GitHub Agent HQ | Agentic code review, required checks, branch protection | [github §2][github] |
| ESF | Gate runner that never skips a step, plus a gate-file integrity check. Ahead of us on tamper checks | [esf §2][esf] |
| Managed Agents | Outcomes: a rubric graded by a separate model, capped by iterations | [cma §2][cma] |
| GitLab Duo | Ordinary MR approval and CI. No separate stronger-model judge | [gitlab §2][gitlab] |
| Stripe | CI plus a human review of every PR. No model-review gate | [stripe §2][stripe] |
| ABCA | Human PR review is the only shipped gate | [abca §2][abca] |
| OpenHands, Symphony | Optional critic, or prompt text | [openhands §2][openhands], [symphony §2][symphony] |

Counts: 14 of 34 orchestrators score 3 or more. 30 of 148 rows do, and 8 score 4 ([matrix][matrix]). The synthesis rates us "equal" ([SYNTHESIS §4][synthesis]). What is rare is merging on that evidence (2.11). The criteria gate is 2.7.

### 2.7 Spec-driven: criteria, named proofs, one end gate

Verdict: unique as a combination among the surveyed tools. Each part has a precedent. The synthesis says the spec tools "enforce nothing at runtime: every rule is a prompt convention" ([SYNTHESIS §3][synthesis]). The concept table checks six tools and finds none that runs the linked tests and requires them green ([concept §4][concept]).

| Tool | What it has | What it lacks | Source |
|---|---|---|---|
| Kiro | EARS criteria, a requirement tag on every task, optional property tests | The model judges. Tests are optional and IDE-only | [kiro front matter][kiro], [concept §4][concept] |
| Tessl | A `[@test]` link per requirement. The closing pass re-runs linked tests | The agent reports the runs. A script checks only that the links resolve | [tessl front matter][tessl], [concept §4][concept] |
| StrongDM Attractor | Scenario hold-outs kept out of the graded step's read access | A spec to feed your own agent. No code, silent for six months | [strongdm front matter][strongdm] |
| Augment Intent | Spec, task breakdown and diff checkpoints. A Verifier agent re-checks output against the spec | A model verifies. macOS desktop app, no sandbox | [augment front matter][augment] |
| Blitzy | Plan approval before code, PR approval after | One batch job, days long, not cancellable | [blitzy front matter][blitzy] |
| Spec Kit, BMAD, Superpowers | A closing pass where a model re-reads the spec against the diff | The same or a similar model grades itself | [concept §4][concept] |
| OpenSpec | Delta specs with Given/When/Then | Nothing enforced. Drift admitted | [openspec front matter][openspec], [concept §4][concept] |
| Jules | Plan approval and a Planning Critic that cuts task failure by 9.5 percent (vendor figure) | The plan auto-approves on a timer. No criteria | [jules §6][jules] |
| Devin, Factory | Playbooks, Spec Mode | No criteria with named proofs | [devin §6][devin], [factory §4][factory] |

What to say: "none of the 148 tools we surveyed". What not to say: "the only", "first", or "hold-outs are ours". StrongDM published the hold-out idea. The claim in spec-driven.md that SWE-bench Verified rejected correct solutions is not in the market research, and I could not check it ([spec-driven][specdriven]). The research lists six spec tools and the concept compares six. A tool released after 2026-09-29 is not covered.

### 2.8 Process as one YAML per project, prompts as data

| Product | Evidence | Source |
|---|---|---|
| Symphony | Per-repository `WORKFLOW.md`: YAML front matter plus a strict Liquid prompt, hot reloaded | [symphony §6][symphony] |
| Sortie | `WORKFLOW.md` next to its SQLite file | [sortie §3][sortie] |
| StrongDM Attractor, Fabro | The pipeline is a DOT graph file | [strongdm front matter][strongdm], [progress][progress] |
| Stripe | Blueprints in code. Teams author their own | [stripe §3][stripe] |
| GitHub Agent HQ | Custom agents as YAML files with repo, org, enterprise precedence | [github §3][github] |
| Factory | Hierarchical `.factory/` settings and skills | [factory §5][factory] |
| Devin | Playbooks invoked by macro | [devin §3][devin] |
| OpenHands | Risk and confirmation policy are Python objects in the SDK | [openhands §5][openhands] |
| Managed Agents | Agent configuration through the API | [cma §3][cma] |

Counts: no matrix column. I name at least five orchestrators with a per-project workflow file (Symphony, Sortie, Fabro, Attractor, Stripe in code). The market agrees on `AGENTS.md` for prompts and rules ([SYNTHESIS §3][synthesis]). The rare part is a stage list as data with a floor no project can lower. Our layers doc gives two shipped processes and a floor of checks, policy, approval and merge. A project may only tighten ([layers][layers]). So "one YAML file per project" overstates it slightly. A project names one of the shipped files. The synthesis still says our workflow is hard-coded and calls an authorable graph a gap ([SYNTHESIS §6][synthesis]). That sentence predates the process files.

### 2.9 Full loop including telemetry

| Product | Evidence | Source |
|---|---|---|
| Cursor | Automations fire on Sentry, PagerDuty, a webhook or cron. Rollouts posts a monitoring plan and a per-environment verdict after deploy. No automatic rollback yet | [cursor §2][cursor] |
| Factory | Incident Response and Software Factory are private preview. Release and deploy are "as available" | [factory §1, §2][factory] |
| Jules | A Render integration watches failed builds and pushes a fix | [jules §2][jules] |
| Five telemetry-to-fix tools (Seer, Datadog Bits, Cleric, Latitude, Temps) | Alert in, root cause and PR out. They stop at the PR, or at a post-deploy watch (Cleric, up to 14 days) | [SYNTHESIS §2, §3][synthesis], [progress][progress] |
| Devin | No first-party telemetry-to-task path found | [devin §2][devin] |
| Stripe | All triggers are engineer-initiated | [stripe §2][stripe] |
| GitHub Agent HQ, Managed Agents, ABCA, Symphony, ESF, OpenHands | No alert intake found | [github §2][github], [cma §2][cma], [abca §2][abca], [symphony §2][symphony], [esf §2][esf], [openhands §2][openhands] |
| GitLab Duo | Pipeline and MR events only | [gitlab §2][gitlab] |

Counts: no telemetry column. For the signals axis, 7 of 34 orchestrators score 4 or more, one scores 5, and 14 of 148 rows score 4 or more ([matrix][matrix]). Those scores count Slack and forge events too. No report I read describes a user report filing a fix card. The research predates our routines ([launch concept][launch]).

### 2.10 Model independence behind a gateway, replaceable harness

| Product | Evidence | Source |
|---|---|---|
| Market base | LiteLLM is the common model layer. Six projects drive harnesses through ACP | [SYNTHESIS §3][synthesis] |
| Factory | BYOK for many providers, an open-weight pool, a model router | [factory §3][factory] |
| OpenHands | ACP fronts Claude Code, Codex and Gemini | [openhands §4][openhands] |
| GitLab Duo | Model selection through LiteLLM, self-hosted models | [gitlab §3][gitlab] |
| GitHub Agent HQ | Claude and Codex agents, many models | [github §1][github] |
| Managed Agents | Claude only | [cma §3][cma] |
| Symphony | Codex app-server only | [symphony §7][symphony] |
| Jules | Gemini only | [jules §1][jules] |
| ABCA | Bedrock, with the Claude Agent SDK as the loop | [abca §3][abca] |

The synthesis says hyperscalers now sell the gateway as a product ([SYNTHESIS finding 2][synthesis]). The concept already keeps this out of the table ([launch concept §3][launch]). Agree.

### 2.11 Full auto, the human holds spending and the roadmap

| Product | Evidence | Source |
|---|---|---|
| Stripe | 1,300 or more PRs a week, every one human-reviewed | [stripe §1][stripe] |
| Symphony | A human moves the issue to Merging, then the agent merges with the host login | [symphony §2][symphony] |
| Cursor | PR Routing can approve or dismiss reviews under a written prompt | [cursor §2][cursor] |
| Devin, Factory, GitLab Duo, GitHub, Jules, ABCA | A human merges, or branch protection decides | [devin §2][devin], [factory §2][factory], [gitlab §2][gitlab], [github §2][github], [jules §2][jules], [abca §2][abca] |
| Machinist, Nx, Optio | A narrow risk rule, a triple-AND gate, and an AI review that posts a binding approval without a human | [SYNTHESIS §3][synthesis], [progress][progress] |
| StrongDM | "No human writes or reviews code" | [SYNTHESIS §3][synthesis] |

Verdict: rare. Our own design file narrows the claim. At full auto, forbidden paths and migrations stay human, and high-risk changes merge only with a security audit pass. The member also keeps a confirm set (invite, set autonomy, GitHub export, promote or release a resource) ([chain and autonomy §7][chain]). Say "asks only for decisions and money". Do not say "nothing else".

### 2.12 One chat replaces writing cards

| Product | Evidence | Source |
|---|---|---|
| Stripe | Tag a bot in a Slack thread. The lowest-friction intake in the survey | [stripe §4][stripe] |
| Devin | Slack, Linear, Jira, API, chat session | [devin §2][devin] |
| Factory | Slack mention, Linear assignment, desktop and mobile chat | [factory §4][factory] |
| Cursor | Slack, web, IDE, mobile PWA, API | [cursor §4][cursor] |
| GitHub Agent HQ | Assign an issue, `@copilot`, chat | [github §4][github] |
| Managed Agents | Chat framework quickstarts and adapters for Slack, Teams, Discord, WhatsApp | [cma §6][cma] |
| Ona | The conversation pane is the whole interface | [ona §4][ona] |

Chat to start work is table stakes. UX scores 4 or more in 78 of 148 rows ([matrix][matrix]). I found no report with a board where a chat proposes the card and a person presses "do it". That combination is ours, but I could not verify its absence elsewhere.

## 3. What to concede

The question: what do the closest competitors do well that the page should not claim? The synthesis says we lead where an owned control plane matters and trail where a product team matters ([SYNTHESIS §4][synthesis]). The three largest items are first.

| # | Concession | Who does it | Source |
|---|---|---|---|
| 1 | Live stream of the agent's work | Devin has five panes. Factory Mission Control shows live worker logs. Cursor streams a transcript, diff and terminal. GitHub has an Agents panel. OpenHands has a live terminal. Jules streams activities. Ona streams a conversation | [SYNTHESIS finding 4][synthesis], [devin §4][devin], [factory §4][factory], [cursor §4][cursor], [github §4][github], [openhands §4][openhands], [jules §4][jules], [ona §4][ona] |
| 2 | Diff view, and inline comments that go back to the agent | Diff: OpenHands (Monaco), Jules, Devin, Cursor, Factory. Inline comments to the agent: Cline, Orca, Vibe Kanban, Plannotator. None of the 13 reports describes inline comments | [SYNTHESIS §6][synthesis], [openhands §4][openhands], [jules §4][jules] |
| 3 | Progress where the requester already is | Symphony's workpad comment, Cyrus, Sweep, Linear's panel. GitLab runs inside the issue or MR. Stripe, Factory, Cursor and Devin run inside Slack | [SYNTHESIS §6][synthesis], [symphony §4][symphony], [gitlab §4][gitlab], [stripe §4][stripe] |
| 4 | Intake breadth and forges | Cursor scores 5 for signals, the only 5 of 148 rows. It takes GitHub, GitLab, Bitbucket, Slack, Linear, Sentry, PagerDuty, webhook and cron. We have Forgejo and SigNoz, and no GitHub or GitLab intake | [cursor §2][cursor], [matrix][matrix], [vision][vision], [SYNTHESIS §4][synthesis] |
| 5 | Sandbox isolation strength and speed | Devin runs a VM per session (inferred). ABCA uses Firecracker. ESF uses KVM microVMs. GitHub uses Azure sandboxes. 24 of 148 rows score 4 or more. We use gVisor, slow for builds | [devin §5][devin], [abca §5][abca], [esf §5][esf], [github §3][github], [vision][vision], [SYNTHESIS §4][synthesis] |
| 6 | Mobile view and phone approval | Factory has a mobile client. Cursor has a PWA. GitHub has a mobile app. We have no mobile view | [factory §4][factory], [cursor §4][cursor], [github §4][github], [vision][vision] |
| 7 | Policy expressiveness | AgentCore Policy (session-aware Cedar), GitLab's tool governance matrix, ABCA's Cedar with a soft tier | [SYNTHESIS §4, §5][synthesis], [gitlab §5][gitlab], [abca §5][abca] |
| 8 | Project memory and codebase index | Devin's DeepWiki, Factory's runbook memory, Blitzy's knowledge graph. Ours is findings within one task | [devin §6][devin], [factory §6][factory], [blitzy front matter][blitzy], [SYNTHESIS §4][synthesis] |
| 9 | Persistent machines | Factory Droid Computers and Devin keep tools and logins between sessions. Ours are disposable | [factory §7][factory], [SYNTHESIS §7][synthesis] |
| 10 | Post-deploy verification | Cursor Rollouts gives a per-environment verdict. Cleric watches up to 14 days. Our soak is 15 minutes | [cursor §2][cursor], [progress][progress], [SYNTHESIS §5][synthesis] |
| 11 | Evaluation and benchmarks | We have none. Harbor, promptfoo, Open SWE and Braintrust do | [SYNTHESIS §4][synthesis], [vision][vision] |
| 12 | The agent shepherds an approved PR to merge | Symphony's `land` skill, Open SWE's `/baby-sit`. We have no lander | [symphony §6][symphony], [SYNTHESIS §7][synthesis] |
| 13 | Scale and independent proof | Stripe ships 1,300 PRs a week. Cursor reports about 4B USD annualised revenue. OpenHands has 89,479 stars. Our evidence is one operator's daily use | [stripe §1][stripe], [cursor §8][cursor], [openhands §8][openhands], [pitch][pitch] |
| 14 | Scheduled and standing tasks | Cursor Automations, Jules scheduled tasks, GitHub Automations, Factory automations. The research calls us reactive, but our routines were built later | [cursor §2][cursor], [jules §2][jules], [github §4][github], [factory §2][factory], [SYNTHESIS §5][synthesis] |

Weakness list in our own vision file, as of the research date: console "functional, not designed", one capability class, no replay UI, a fixed model ladder, no project memory, one forge, no evaluation ([vision][vision]). Check which have since changed before the page states them.

## 4. Positioning lines

The question: how does each competitor describe itself? Q marks a quote taken from the report. P marks the analyst's paraphrase.

| Product | Line | Q or P | Source |
|---|---|---|---|
| Devin | "Autonomous software engineer". It plans, codes, tests and opens pull requests from a Slack message, a ticket or an API call, largely unattended | Q and P | [devin §1][devin] |
| Factory | "A 24/7 autonomous system that connects AI agents across the software development lifecycle" | Q | [factory §1][factory] |
| Cursor cloud agents | Automations "break out of the prompt-and-monitor dynamic". Projects keep context over months and hand tasks to thousands of subagents | Q (changelog, 2026-09-10) | [cursor §1][cursor] |
| GitLab Duo | "AI orchestration across the entire software lifecycle", built on the "AI paradox" that coding is a small share of a developer's time | Q | [gitlab §1][gitlab] |
| OpenHands | "The world's most-used open-source AI development agent" | Q (README) | [openhands §1][openhands] |
| Managed Agents | An agent inside the systems a team already uses, without building the sandbox, orchestration and credential stack. Also "to production 10x faster" | P and Q | [cma §1][cma] |
| GitHub (for the table) | The "industry's control point for AI coding agents" | P | [github §1][github] |

## 5. The five competitors for the comparison table

Recommendation: GitHub Copilot cloud agent (Agent HQ), Cursor cloud agents, Devin, GitLab Duo Agent Platform and OpenHands. The concept lists Factory where this list has GitHub ([launch concept §5][launch]).

| Product | Why it belongs | Fairness note | Source |
|---|---|---|---|
| GitHub Copilot cloud agent | The name most readers know. The forge-integrated segment is the closest to our loop, with a mean similarity of 3.5 | Strong on sandbox (score 4) and UX (score 5). Weak on identity (1) and cost (1). State its strengths in the table | [SYNTHESIS §2][synthesis], [github][github] |
| Cursor cloud agents | Named by the synthesis as one of the four closest. Best intake (signals 5) and UX (5) | Concede signals and UX in the same row | [SYNTHESIS finding 1][synthesis], [cursor][cursor] |
| Devin | Best-known autonomous agent product. Control plane never leaves Cognition's cloud | Concede the VM sandbox, DeepWiki and live panes | [devin §7][devin] |
| GitLab Duo Agent Platform | Named by the synthesis as one of the four closest. Best identity and policy model among the 13 | Concede composite identity and the tool governance matrix. Show our shorter token life as a trade | [gitlab §5, §7][gitlab] |
| OpenHands | The one open-source, self-hostable name with a live UI. The fair open-source comparison | Concede live terminal, diff view and ACP. Its policy runs in the agent process and its Kubernetes sandbox server is under a paid licence | [openhands §5, §8][openhands] |

Why not the others:

| Product | Reason to leave it out | Source |
|---|---|---|
| Factory | Same school as Devin and Cursor (closed SaaS control plane). It owns the "software factory" name, so keep it as the sixth row if the table has room | [SYNTHESIS finding 8][synthesis], [factory][factory] |
| Managed Agents | A build-it-yourself platform billed by session hour, not a factory | [cma §1][cma] |
| Stripe Minions | Not for sale | [stripe][stripe] |
| ABCA | An AWS sample in maintenance mode. Cite it only as the closest open design | [abca §1, §8][abca] |
| Symphony, ESF | A spec from OpenAI that it will not maintain, and a ten-day-old solo project | [symphony §8][symphony], [esf §8][esf] |
| Jules, Ona | Jules is a consumer-bundled agent. Ona is mid-acquisition | [jules §1][jules], [ona §1][ona] |

Cells for the five, using only report evidence:

| Row | GitHub | Cursor | Devin | GitLab Duo | OpenHands |
|---|---|---|---|---|---|
| Control plane runs on your servers | no | no, worker only | no, sandbox only | partial, paid EE licence | yes, open core |
| Per-task identity | no, repository secrets | optional OIDC | Outposts path only | composite, token up to about 3 days | no, shared pool key |
| Spend cap before a call | no, org budgets | no, "not instant" | no, session and cycle limits | no, credits ledger | not verified |
| Policy outside the model | yes | cloud yes, desktop no | yes, role-based | yes, strong | no, in the agent process |
| Merge on evidence without a human | no | review can approve under a prompt | no | no | no |
| Live stream and diff | yes | yes | yes | session view | yes |

Sources: [github][github], [cursor][cursor], [devin][devin], [gitlab][gitlab], [openhands][openhands], sections 2 and 5 of each.

## 6. Steal lists a viewer would notice we lack

The question: which marked "worth stealing" features can a visitor see? Items only an engineer would see (egress probes, gate-file integrity) are left out.

| Feature | Source product | Why a viewer notices | Source |
|---|---|---|---|
| Mission Control: session tree, per-role model, live log, pause and re-plan | Factory | A live view of agents at work | [factory §6][factory] |
| Multi-pane live session: plan, shell, editor, browser | Devin | Same | [devin §6][devin] |
| Monaco diff and live terminal on one screen | OpenHands | The two gaps we list | [openhands §6][openhands] |
| Agents panel: live steering, natural-language session search, share link | GitHub | Search and share are visible features | [github §6][github] |
| One workpad comment edited in place on the issue | Symphony | Progress without opening the console | [symphony §6][symphony] |
| Slack or Matrix mention files an issue | Factory, Stripe, Devin | Wider intake | [factory §6][factory], [stripe §6][stripe] |
| One-click "start an agent" button on a CI ticket | Stripe | A visible signal-to-task step | [stripe §6][stripe] |
| Follow-up message queued to the agent's next tool call | Cursor | Steering without interruption | [cursor front matter][cursor] |
| Mid-run nudge and scoped approvals (this call, this tool, a path glob, the session) | ABCA | Fewer clicks | [abca §6][abca] |
| Phone approval through a push channel | Happy, Optio, Agent Orchestrator | Mobile | [SYNTHESIS §6][synthesis] |
| DeepWiki: generated wiki and diagrams per repository | Devin | Onboarding and memory | [devin §6][devin] |
| Software Factory coverage dashboard: one row per lifecycle stage | Factory | Sells "enterprise" on one screen | [factory §6][factory] |
| Agent Readiness report that refuses long runs below a score | Factory | A visible gate at project setup | [factory §6][factory] |
| Pre-run cost estimate on the approval card | Factory | Cost shown before work | [factory §6][factory] |
| Post-deploy monitoring plan as a PR comment, then a verdict | Cursor Rollouts | Visible loop closure | [cursor §6][cursor] |
| Plan critic before execution | Jules | A visible extra check | [jules §6][jules] |
| Two-pass review that drops false positives | Factory | Less review noise | [factory §6][factory] |
| Suggested tasks from TODO scans, one click to start | Jules | A visible backlog source | [jules front matter][jules] |
| Warm pools and setup snapshots | OpenHands, Jules, Ona | Faster start | [openhands §6][openhands], [jules §6][jules], [ona §6][ona] |
| Computer use and recorded browser evidence | Cursor, Devin | A demo-friendly feature | [cursor §4][cursor], [devin §4][devin] |
| Three-step onboarding to a first agent result | Ona, Factory | Time to first result | [ona §4][ona], [factory §4][factory] |
| Standing scheduled tasks defined as files | GitHub gh-aw, Cursor, Jules | Work without a trigger | [SYNTHESIS §5, §6][synthesis] |

## 7. Wording hazards in current copy

| Where | Text | Problem | Source |
|---|---|---|---|
| [pitch][pitch] B2 | "the only way to run the whole development loop autonomously, on hardware you control" | The research says "nobody ships our whole loop". That supports "none of 148 we surveyed", not "the only way". ABCA and ESF are open and self-hosted with parts of the loop | [SYNTHESIS finding 1][synthesis], [abca][abca], [esf][esf] |
| [pitch][pitch] B2 | Conductor listed as a closed service where "your code leaves your perimeter" | Conductor is a free local Mac app plus paid cloud sandboxes. It is a multi-agent UI, not a hosted autonomous service | [conductor front matter][conductor] |
| [launch concept §3][launch] A | "on any cloud" | No report tests it | [vision][vision] |
| [launch concept §3][launch] A | "Warp keep the control plane in their cloud" | The synthesis names Warp, but I did not read its report | [SYNTHESIS finding 3][synthesis] |
| [launch concept §3][launch] D | Mean 1.3 for identity and cost | Correct for the 34 orchestrators. It is a mean score against our design, so write "score" or "rating", not "average of products" | [SYNTHESIS finding 3][synthesis], [matrix][matrix] |
| [launch concept §3][launch] C | "Sebastian holds this unique" | Say "none of the 148 tools we surveyed", and name Kiro, Tessl and StrongDM as the nearest | 2.7 |
| [launch concept §2][launch] 7 | "humans still control spending and the roadmap, the rest is automatic" | Forbidden paths, migrations and a confirm set stay human | [chain and autonomy §7][chain] |

## 8. Not verified

- I did not read the Warp, Blitzy, BMAD, Superpowers or Gas Town reports in full. Their facts come from the synthesis, the matrix and front matter.
- Matrix counts are my tally of an analyst's scores, not a measurement.
- Facts are dated 2026-09-29. Anything shipped later is missing, including competitor spec tools and Cursor's and Ona's ownership.
- Closed products were read from documentation only. Their security claims are unchecked ([SYNTHESIS §9][synthesis]).
- Our own numbers (21-minute rebuild, 128,000 lines, daily use) come from our files and no report tests them ([vision][vision], [pitch][pitch]).

[synthesis]: /home/womb/repos/ai-software-factory/docs/market-research/SYNTHESIS.md
[vision]: /home/womb/repos/ai-software-factory/docs/market-research/00-our-vision.md
[matrix]: /home/womb/repos/ai-software-factory/docs/market-research/matrix.md
[progress]: /home/womb/repos/ai-software-factory/docs/market-research/PROGRESS.md
[pitch]: /home/womb/repos/ai-software-factory/docs/pitch.md
[specdriven]: /home/womb/repos/ai-software-factory/docs/spec-driven.md
[concept]: /home/womb/repos/ai-software-factory/docs/spec-intake-concept-2026-10-16.md
[layers]: /home/womb/repos/ai-software-factory/docs/layers.md
[chain]: /home/womb/repos/ai-software-factory/docs/chain-and-autonomy-design-2026-10-20.md
[launch]: /tmp/claude-1000/wt-launch/launch/concept.md
[devin]: /home/womb/repos/ai-software-factory/docs/market-research/projects/devin/report.md
[factory]: /home/womb/repos/ai-software-factory/docs/market-research/projects/factory-ai/report.md
[cursor]: /home/womb/repos/ai-software-factory/docs/market-research/projects/cursor-cloud-agents/report.md
[gitlab]: /home/womb/repos/ai-software-factory/docs/market-research/projects/gitlab-duo-agent-platform/report.md
[github]: /home/womb/repos/ai-software-factory/docs/market-research/projects/github-agent-hq/report.md
[openhands]: /home/womb/repos/ai-software-factory/docs/market-research/projects/openhands/report.md
[cma]: /home/womb/repos/ai-software-factory/docs/market-research/projects/anthropic-managed-agents/report.md
[abca]: /home/womb/repos/ai-software-factory/docs/market-research/projects/aws-autonomous-coding-agents-sample/report.md
[stripe]: /home/womb/repos/ai-software-factory/docs/market-research/projects/stripe-minions/report.md
[symphony]: /home/womb/repos/ai-software-factory/docs/market-research/projects/openai-symphony/report.md
[esf]: /home/womb/repos/ai-software-factory/docs/market-research/projects/esf/report.md
[jules]: /home/womb/repos/ai-software-factory/docs/market-research/projects/google-jules/report.md
[ona]: /home/womb/repos/ai-software-factory/docs/market-research/projects/ona/report.md
[kiro]: /home/womb/repos/ai-software-factory/docs/market-research/projects/kiro/report.md
[tessl]: /home/womb/repos/ai-software-factory/docs/market-research/projects/tessl/report.md
[strongdm]: /home/womb/repos/ai-software-factory/docs/market-research/projects/strongdm-attractor/report.md
[augment]: /home/womb/repos/ai-software-factory/docs/market-research/projects/augment-intent/report.md
[blitzy]: /home/womb/repos/ai-software-factory/docs/market-research/projects/blitzy/report.md
[openspec]: /home/womb/repos/ai-software-factory/docs/market-research/projects/openspec/report.md
[machinist]: /home/womb/repos/ai-software-factory/docs/market-research/projects/machinist/report.md
[sortie]: /home/womb/repos/ai-software-factory/docs/market-research/projects/sortie/report.md
[weave]: /home/womb/repos/ai-software-factory/docs/market-research/projects/weave-router/report.md
[cycles]: /home/womb/repos/ai-software-factory/docs/market-research/projects/cycles/report.md
[tensorzero]: /home/womb/repos/ai-software-factory/docs/market-research/projects/tensorzero/report.md
[conductor]: /home/womb/repos/ai-software-factory/docs/market-research/projects/conductor/report.md
