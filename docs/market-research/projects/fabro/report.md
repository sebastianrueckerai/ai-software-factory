---
name: Fabro
slug: fabro
url: https://fabro.sh
repo: https://github.com/fabro-sh/fabro
category: factory-orchestrator
license: "mixed: MIT (fabro-sh/fabro), but the core engine deps petri, pebble and sandbox-driver (lithoscomputer org) carry no licence at all"
open_source: partial
self_hostable: yes
hosting_model: self-hosted single binary (laptop, Docker, ECS, Cloud Run, Kubernetes, Railway) driving Daytona cloud VM or Docker sandboxes, no vendor SaaS
company: Qlty Software Inc. (Bryan Helmkamp, ex-Code Climate founder), New York, spun out of Code Climate Nov 2024, 2.5M USD seed led by NextView Ventures. Engine crates sit under a separate org, lithoscomputer, plausibly tied to Helmkamp's other 2026 venture Lithos Computer Co. (about 5M USD raised), link unconfirmed
maturity: 1663 stars, 177 forks, created 2026-03-13, pushed 2026-09-29 (same day as this report). About 5290 commits across 15 human contributors, brynary alone holds about 88 percent. A third-party catalogue counts 96 release tags since launch, mostly nightlies
similarity: 3
axes:
  signals_intake: 1
  control_plane: 3
  sandbox_isolation: 4
  verification: 3
  policy_outside_model: 2
  identity_per_task: 2
  cost_control: 1
  ux: 4
  reseedable_selfhost: 3
steal:
  - CSS-like model stylesheet with a specificity cascade (universal, shape, class, id, last-declared wins) for routing models per workflow step, instead of one flat tier per task
  - Sandbox snapshot identity hashed from the image or Dockerfile text plus resources plus provider key, so an unchanged environment is built once and reused, not rebuilt per run
  - Hard exclusion of the GitHub Workflows permission scope from every agent-facing token, stated as policy rather than left as an accident of the current scope list
  - "fabro doctor": one command that validates vault secrets, provider scopes and reachability before a run starts, a preflight check we do not have
  - Automations as revision-checked (ETag, If-Match) objects that carry their own last_error field, so a broken schedule is visible on the object, not buried in logs
  - Single static binary plus SQLite as the entire server, worth copying as a stripped-down local or demo mode of our own stack
differs:
  - Verification is an optional pattern a workflow author composes per graph (a Command node, a Conditional, a loop-back edge, an optional goal_gate), not a mandatory floor every task passes through
  - Control-plane state (environments, automations, vault) lives in a mutable server database, not declared in Git, so it lacks our re-seed-from-Git guarantee
  - Single-tenant with no roles or ACLs by design, every authenticated user has identical full access, which is incompatible with identity-per-task and trust boundaries
  - Cost is tracked for observability only, with no hard cap, hold or ledger anywhere in the run configuration schema
ux_verdict: CLI, web UI, SSH into a live sandbox, Slack and an MCP server give a smoother zero-to-first-result path and better live visibility than our console, but human intervention is limited to the choices a workflow author wired as edges.
slop_verdict: Real and actively self-developed, not a landing page, but a one-person project (about 88 percent of commits) whose load-bearing engine lives in unlicensed sibling repositories tied to a newly funded, separately run company.
---

# Fabro

## 1. What it is

Fabro is a single Rust binary that runs version-controlled workflow graphs, written as Graphviz DOT files, over coding agents, shell commands and human decision points. It is built by Qlty Software Inc., the company Bryan Helmkamp (founder of Code Climate) spun up around the former Code Climate Quality product in November 2024. Fabro itself launched as a separate open source project on 17 March 2026.

The makers pitch it as a way out of babysitting an agent turn by turn or reviewing a large diff blind. A team writes its process once as a graph, agents execute the graph, and a person intervenes only where the graph pauses for them. The company calls this a "dark software factory". Use so far looks concentrated in Helmkamp's own professional network. No independent review, Hacker News thread, or "Fabro vs" comparison exists as of 2026-09-29.

The README claims "one Rust binary, zero dependencies" and frames the graph in terms of "verification nodes". The code and docs show something narrower: there is no dedicated verification or judge node type (section 3), and the binary depends at build time on four sibling crates pulled from a separate, newly created GitHub organisation, three of which carry no licence (section 8). Fabro itself is MIT, copyright Qlty Software Inc. There is no hosted offering and no pricing page.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | "Automations" fire on a manual api call or a UTC cron schedule only. A GitHub App webhook receiver exists but is documented only for OAuth login and app installation, not as an automation trigger. No native issue, alert or telemetry intake. | Forgejo webhooks, SigNoz alert webhooks and a factoryd intake API turn issues, PR comments and alerts directly into tasks. | We lead |
| Control plane | One server process backed by SQLite stores runs, automations, environments and vault secrets. Runs get immutable, content-addressed workflow versions and an event stream. Edits are revision-checked. No distributed workflow engine, no multi-tenant task registry. | factoryd on Temporal with Postgres, policy as a document in Git applied by Flux, a cost ledger and an audit trail. | Equal, different shape |
| Worker plane | A coding loop runs inside a Docker container (the documented default), a Daytona cloud VM, or an opt-in unsandboxed local mode, one per run, with the model chosen per node by the stylesheet. | One gVisor pod, one ServiceAccount, one namespace per task, default-deny egress, a fixed model tier ladder. | They lead on sandbox choice and per-node routing, we lead on default-deny network |
| Verification | No dedicated verify or judge node. An author composes verification from a Command node, a Conditional node, a loop-back edge, and an optional goal_gate attribute that fails the run if a node does not succeed. None of this is required. | Every task passes the same CI job, the same policy gates and the same stronger-model review before merge, with no path that skips it. | We lead on guaranteed floor, they lead on expressive power |
| Merge and deploy | A pull_request automation setting can open a PR. Deployment beyond that is left to the user's own CI. | A merge bot merges only after approval or an auto rule for reproduced, strictly-improving changes, Flux deploys, staging bakes before prod. | We lead, not fully comparable since Fabro stops at PR |
| Policy outside the model | Real, code-enforced controls in two places: sandbox network mode and the GitHub App's installation-token scopes, which explicitly exclude the Workflows permission. Beyond that, the vendor's own docs state every authenticated user has identical, full access, with no roles, ACLs or multi-tenancy. | Capability rules are a document in Git, enforced in gateway code and network policy, checked per task against budget and approval state. | We lead |
| Identity per task | GitHub App installation tokens are short-lived and scoped per workflow run, a genuinely good pattern. Every other credential sits in one shared server vault used by every run. | A projected, audience-scoped, kubelet-rotated ServiceAccount token minted per task, mapped to capability and budget by the gateway. | We lead outside the GitHub case |
| Cost control | Cost is recorded in USD micros for observability. No cap, hold or ledger anywhere in the run configuration schema or the security docs. | The gateway prices, clamps and holds spend before a call runs, with per-task, per-day and per-project envelopes. | We lead |

## 3. Architecture and stack

Fabro is a Rust workspace with a Bun-built web frontend. The repository holds roughly 47 crates under lib/apps, lib/components, lib/foundation and lib/packages, plus apps/fabro-web, apps/marketing, apps/remotion and bin/agent.

The workflow engine is not really Fabro's own. Cargo.toml pulls four git-branch dependencies from a separate, very young GitHub organisation, lithoscomputer, created 2026-06-16: petri (a generic token-flow "Engine IR" and a sans-IO state machine, with pluggable frontends including a GitHub Actions frontend and an "Attractor" frontend that lowers Graphviz DOT to the same IR), pebble (the coding-agent loop that Fabro's agent nodes run), sandbox-driver (the sandbox provider abstraction, with Host, Docker and Daytona bundled and a plugin protocol for third parties), and lithos-llm (a provider-neutral model catalogue and client, Apache-2.0 licensed).

The fabro-dot crate says this outright in its own doc comment: "Petri admits and runs every workflow. Fabro's platform reads the DOT only to learn a workflow's shape." Fabro's own DOT parser is a thin metadata-extraction shim over petri_frontend_attractor. It finds file references such as import, stack.child_workflow, and at-prefixed prompt, output_schema and goal values, then hands the actual graph to Petri. The product surfaced as "Fabro" is a settings, packaging and UI layer over an externally developed engine.

Storage is SQLite for the whole server: runs, automations, environments and vault. No Postgres, no message queue and no external cache appear anywhere in the docs read.

Sandboxing sits in two layers. The fabro-environment crate defines an Environment and EnvironmentDraft wrapping image, resources, network and lifecycle settings, serialised to TOML, hashed into a revision so identical settings reuse the same row. This sits above sandbox-driver, which talks to Docker or Daytona.

Deployment is one static binary. Self-hosting options cover a laptop, self-hosted Docker, ECS, Cloud Run, Kubernetes, or a Railway one-click template. There is no hosted SaaS.

Model routing is the CSS-like stylesheet, a MiniJinja template rendered once against inputs and vars and then parsed with CSS specificity rules (universal 0, shape 1, class 2, id 3, ties broken by last declaration), covering five properties: model, provider, reasoning_effort, speed and backend.

Files and directories read: Cargo.toml, lib/components/fabro-dot/src/lib.rs, lib/components/fabro-environment/src/model.rs, docs/public/workflows/stages-and-nodes.mdx, docs/public/workflows/stylesheets.mdx, docs/public/execution/run-configuration.mdx, docs/public/execution/automations.mdx, docs/public/execution/environments.mdx, docs/public/integrations/github.mdx, docs/public/integrations/daytona.mdx, docs/public/administration/security.mdx, docs/public/reference/acknowledgements.mdx, docs/public/getting-started/dark-factory.mdx, docs/public/getting-started/comparison.mdx, .fabro/workflows/implement-issue/workflow.toml.

## 4. UX

Zero to first result takes about three commands and one file. Install the single binary, run fabro install (an interactive wizard that picks a GitHub access strategy, a sandbox provider, and stores vault secrets), write or copy a workflow file, then fabro run workflow.fabro. fabro doctor validates configuration, for example checking that a Daytona API key carries the required scopes, before a run starts.

Watching a run happens in the web UI (served by the same binary), which shows a stage timeline with per-stage tokens and duration, or in the CLI, which mirrors the same information for a terminal-only workflow. fabro sandbox ssh opens a live SSH session into the running sandbox with 60-minute temporary credentials, for direct debugging.

Intervening happens only at a Human node (hexagon shape), which pauses the run and turns its labelled outgoing edges into a menu, buttons in the web UI, a text menu in the CLI. There is no free-form "redirect the agent" chat, only the choices the workflow author wrote as edges. Fabro also runs an MCP server exposing seven run-management tools (create, search, get, interact, gather, pair, events), so an agent inside another harness such as Claude Code or Codex CLI can itself drive a Fabro run. We have no equivalent surface.

Other interfaces: Slack over Socket Mode (no public webhook endpoint needed), a REST API, and a documented OpenAPI file. No screenshots were retrievable, the fabro.sh fetch returned text content only.

What is easier than our console: a real per-run stage timeline with token counts, SSH into a live sandbox, a doctor command, a documented MCP surface. What is worse: login is a flat allowlist of GitHub usernames with no roles, so accountability is thin beyond run history, and there is no project-level cost view or alerts view.

## 5. Security, identity, sandbox, policy, cost

Security. Fabro calls itself a "research preview," not penetration tested, and recommends deploying only on a private network. The vendor's own documentation lists no multi-tenancy, no roles or ACLs (all authenticated users have identical, full access to every run, workflow and API endpoint), no inbound IP allowlisting and no rate limiting.

Identity. Credentials live in a server-side vault. LLM provider keys, Slack, Daytona and search keys and GitHub secrets sit there as long-lived static secrets shared by every run on the server. The one genuinely short-lived credential is the GitHub App Installation Access Token, refreshed automatically and scoped per workflow run, which cannot include the Workflows permission. Daytona SSH debug access also issues time-boxed credentials.

Sandbox. Three providers exist. Local uses the host's own filesystem and network and is opt-in, not the default. Docker, the documented default, gives each run a container and a workspace volume, passing through only explicitly configured environment variables. Daytona runs each sandbox as its own cloud VM with nested Docker, image or Dockerfile-based snapshots cached by a hash of the image reference, resources and API key, a 120-minute default auto-stop, and three network modes (allow all, block, CIDR allow list).

Policy. Enforced outside the model in two concrete places: GitHub scope exclusion and sandbox network mode. Everywhere else Fabro relies on the operator's own deployment perimeter, a reverse proxy, VPN or firewall, rather than anything Fabro checks itself.

Cost. Tracked per stage and per run in USD micros for observability, but not capped. No workflow attribute or server setting stops a run once it passes a given spend. The budget-exhausted condition documented elsewhere is a token or context-length limit, not a money limit.

## 6. What we should take from it

Narrow. The stylesheet's specificity model (universal, shape, class, id, last-declared wins) is a small, well-specified way to route models per step without a config block per node. The mechanism, not the CSS syntax, is worth copying over our fixed tier ladder for tasks whose steps genuinely need different models. Snapshot identity keyed by a hash of image reference, Dockerfile text, resources and provider key means an unchanged environment is only built once. We rebuild a gVisor image per task today; a hash-keyed cache would cut the same redundant builds Fabro's Daytona path already avoids. The explicit exclusion of the GitHub Workflows scope from every agent-facing token is worth stating as a hard rule in our own git-credential minting rather than leaving it as an accident of our current scope list. fabro doctor, a single command that checks vault secrets, provider scopes and reachability before a run starts, is a preflight pattern we lack for our own Temporal, OpenBao and per-project quota state.

Broad. Treating a workflow as a versioned file, a DOT graph in the repository, diffable and reviewable like any other file, is a genuinely different take on process as code than our fixed pipeline. Without adopting graphs wholesale, letting a project define extra verification steps as a small declarative file, admitted only after our mandatory floor, would give teams flexibility we do not currently offer. Exposing the factory itself as an MCP server, so an external coding agent can drive a run, is a pattern worth having on our own roadmap: letting an agent inside our own harness start or query a task through a narrow, capability-checked surface instead of only through the console or webhook intake.

## 7. Where our philosophy differs and what that costs or buys us

Verification as an optional, author-composed pattern against our fixed floor. Fabro can express richer verification graphs than our single CI-then-gates-then-review chain: multiple loop-back edges, parallel review branches, a synthesis merge node. Nothing stops an author shipping a graph with no test node and no goal_gate at all. Copying this wholesale would give up the one guarantee we currently make, that every change gets the same minimum verification, unless we also built an admission check requiring at least one gate-equivalent node, which Fabro itself does not have.

Control-plane state as a mutable database against policy as Git. Fabro's environments, automations and vault entries live in a SQLite file mutated through its own UI and API. Our policy is a document in Git applied by Flux, so deleting everything and re-seeding is a path we actually exercise, about 21 minutes end to end. Taking Fabro's simpler single-binary shape would cost us that guarantee unless we exported its state to Git ourselves, exactly the extra work its simplicity avoids.

Single-tenant, no roles by design against identity per task. Fabro's docs are honest that this is deliberate, aimed at small teams of expert engineers, with every authenticated user holding full access. Our principle that a task's identity, not a machine's or a person's, gates what happens is incompatible with that model. A team could adopt Fabro's workflow graphs without adopting its access model, not the reverse.

Cost as telemetry against cost as an enforced resource. Fabro tracks spend for a person to read afterwards. We hold spend before a call executes. Adopting Fabro's workflow layer without keeping our own budget hold would remove the one control that currently caps a runaway loop's bill.

## 8. Red flags and slop assessment

Real and active. Pushed the same day as this report (2026-09-29), 1663 stars, 177 forks, 91 open issues, a documented CLI, web UI, REST API and MCP server. Commit branch names such as codex/restore-configured-artifact-storage, merged by a human co-maintainer, suggest the team uses an AI coding agent to produce branches for its own review. This is not a landing page with no code behind it.

Single-author concentration. Of about 5290 commits across 15 human contributors and several bot accounts, Bryan Helmkamp (brynary) holds about 4631, roughly 88 percent. The next contributor is a distant second at 368 commits. This is one person's project with one visible collaborator, whatever the star count suggests.

Licensing gap in the load-bearing engine. fabro-sh/fabro is MIT, but three of the four lithoscomputer crates it depends on as git-branch Cargo dependencies, petri, pebble and sandbox-driver, return no licence from the GitHub API and 404 on their licence endpoint. No LICENSE file means no grant of rights beyond default copyright, regardless of public visibility. Only lithos-llm is properly licensed, Apache-2.0. A user who forks Fabro to own their AI toolchain, in Helmkamp's own launch phrase, does not hold a licence to the code that does most of the work.

A plausible, unconfirmed corporate split behind that gap. The lithoscomputer GitHub organisation was created 2026-06-16. An SEC Form D filed 21 July 2026 names Helmkamp chief executive of a new Delaware company, Lithos Computer Co., which sold just under 5 million USD in equity to two undisclosed investors, first sale dated 7 July 2026. The filing itself does not mention Fabro, Qlty, or any GitHub organisation, so the link is circumstantial: matching name and timing only, not independently confirmed. If Lithos Computer Co. is the entity behind lithoscomputer, Fabro's core engine is developed by a separately funded, for-profit company under the same chief executive, with no licence granted back to the MIT product built on top of it. Licence terms or availability of the engine crates could change without the outer MIT project changing at all.

Provenance of the "dark factory" framing. Fabro's own acknowledgements page credits StrongDM's Justin McCarthy and his open source Attractor project as the direct architectural influence, stating that Attractor pioneered orchestrating AI coding agents with graph-based workflows and that its design deeply influenced Fabro's architecture. It separately cites Dan Shapiro's Kilroy as a reference implementation of the same idea. The term "dark factory" traces to Dan Shapiro's January 2026 five-levels framework, borrowed from manufacturing's lights-out plants, and was made famous for software by StrongDM's own 6 February 2026 manifesto, which argued code must not be written or reviewed by humans. The lineage runs from StrongDM's Attractor to Fabro's architecture, and from Shapiro's term to Fabro's branding, with StrongDM's manifesto standing as the most visible proof the pattern works, not as the source of the phrase.

No independent scrutiny found. No Hacker News "Show HN" thread, no Reddit discussion, no third-party security review, no funding announcement for Fabro itself turned up in search on 2026-09-29. The one secondary source found, a language catalogue entry on agentlanguages.dev, is neutral, not a review. Visible reception is limited to Helmkamp's own LinkedIn and X posts and a handful of supportive replies from his professional network.

Self-declared limits taken at face value. The security documentation calls Fabro a research preview that has not yet been subject to third-party penetration testing, and recommends private-network deployment only. That is honest disclosure, not a hidden flaw, and it matches what the code shows: single-tenant, no roles, no rate limiting.

Overall, this is a real, actively developed project, transparent about its own limits, but a one-person effort wearing an open source MIT licence over a proprietary-by-omission engine held in repositories that may belong to a company funding its author's other new venture.

## 9. Sources

README.md, Cargo.toml, CONTRIBUTING.md and LICENSE.md from the fabro-sh/fabro clone.
lib/components/fabro-dot/src/lib.rs and lib/components/fabro-environment/src/model.rs from the clone.
lib/foundation/fabro-vault (directory listing only, source not read in depth).
.fabro/workflows/implement-issue/workflow.toml from the clone.
docs/public/workflows/stages-and-nodes.mdx and docs/public/workflows/stylesheets.mdx from the clone.
docs/public/getting-started/dark-factory.mdx and docs/public/getting-started/comparison.mdx from the clone.
docs/public/administration/security.mdx from the clone.
docs/public/execution/run-configuration.mdx, automations.mdx and environments.mdx from the clone.
docs/public/integrations/github.mdx and daytona.mdx from the clone.
docs/public/reference/acknowledgements.mdx from the clone.
docs/public/examples/nlspec-conformance.mdx from the clone, grep only.
Top-level and two-level directory listings of the clone.
Local git log of the clone, last commit dated 2026-09-28.
GitHub API queries against fabro-sh/fabro (repo, contributors, commits) on 2026-09-29.
GitHub API queries against lithoscomputer/petri, pebble, sandbox-driver and lithos-llm (repo and licence endpoints) on 2026-09-29.
GitHub API query against the lithoscomputer organisation on 2026-09-29.
https://fabro.sh/ fetched 2026-09-29.
Bryan Helmkamp's X post announcing Fabro, found via search on 2026-09-29.
runtimewire.com article on the Lithos Computer Co. SEC filing, published 21 July 2026, fetched 2026-09-29.
Code Climate's blog post announcing Qlty Software, published 11 November 2024, found via search 2026-09-29.
Crunchbase organisation page for Qlty Software, found via search 2026-09-29.
agentlanguages.dev catalogue entry for Fabro, found via search 2026-09-29.
Web search: Qlty Software Bryan Helmkamp Fabro dark factory, run 2026-09-29.
Web search: dark factory manifesto StrongDM software engineering, run 2026-09-29.
Web search: Fabro fabro.sh review Hacker News launch, run 2026-09-29.
Web search: Qlty Software funding investors Bryan Helmkamp, run 2026-09-29.
