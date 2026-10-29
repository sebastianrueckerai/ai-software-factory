# The three layers: the factory, the process, the prompts

Sebastian's ruling of 2026-10-13, from a comparison with another agent factory: the factory stays agnostic to the development process a project runs. The process is data. The prompts the agents read are content that ships as data too. Every addition names its layer before it is built, and nothing that belongs in a process file or a prompt pack lands in the factory's code. The separation already lives in this repository in pieces (target-architecture.md's "Processes as configuration", the roadmap's "Primitives, not a process"). This file states it in one place, adds the rulings of the discussion, and records where each candidate idea of the comparison lands.

## 1. The rule

Each layer answers one question:

- **The factory** answers: can this run at all, attributed, capped and sandboxed? Sandboxed pods, the gateway, money, policy enforcement, task state, audit. It enforces. It holds no opinion about how software should be built.
- **The process** answers: what must a change survive before it merges, and who acts next? A YAML file per project: tracks, dependencies, stages, merge. Two processes ship (`maintenance`, `spec`), a project names one, and a project may only tighten.
- **The prompts** answer: what does an agent read before it works? AGENTS.md, skills, brief guides, product directives.

The test for every new idea: name the layer first. A deterministic check becomes a stage in a process file or a command in the project's own CI. Guidance an agent should follow becomes the prompt pack, or better a tool or a check, the roadmap's third guiding idea. A capability the process composes from becomes a factory primitive.

Primitives are code, compositions are data. The factory's Go holds the stage vocabulary, nine stage kinds today with a floor no process may lower. The process files hold every sentence written with that vocabulary. A new stage kind is a factory change. A project using a stage differently, or not at all, is a commit to a YAML file.

## 2. The process: what runs when

The cost rule, ruled 2026-10-13: after every card only what is local, deterministic and reads the diff. Today that is the project's checks (tests, vet, format, the security scanner, run by the pull request's own CI), the policy gate on the changed paths, and the reproduction. Everything whole-repository or model-driven is its own card at a checkpoint: scheduled, triggered by a signal, or started by hand. Never per card. The same rule already governs Sebastian's own AvatarAnimations practice, whose sweep skill opens with "never per merge, never per small feature".

Where the candidates of the 2026-10-13 comparison land:

- **Orphan check** (an endpoint no code calls, a table no code reads, on the changed paths): the process layer, as a check command in the templates' CI and check script. Findings go back to the agent like any check finding. No Go.
- **Duplication and complexity metrics**: the prompts layer as an audit skill's checklist, run as a checkpoint card. Whole-repository reads never run per card. The argument for the duplication check is cost, not style: every copy must be read and tested again, so each duplicate makes every later card more expensive.
- **UI screenshots before and after**: the process layer, as one new stage kind, a factory primitive, switched on by the default process for projects whose template builds a UI. A browser joins the sandbox image, the capture script ships in the template, a project can switch the stage off.
- **Product rules as tests** ("a user cannot make two payments within five seconds"): the prompts layer. The pack's standing instruction says a stated product rule becomes an executable check that runs without a model call. The tests themselves are ordinary code in the project's repository, run by the ordinary checks. The factory neither knows nor carries them.
- **Acceptance agent that knows only what a user knows**: the reserved integration-tester class. The context rule travels in its brief guide: the feature as a user sees it, nothing of the implementation.
- **Recorded browser sessions**: stays roadmap 69, off by default. Text beats video, and a product without a UI needs neither.
- **Seed data shaped like real users' accounts**: parked. It needs a product with real users first. Until then the seed stays generated.

## 3. The prompts: the pack

Two kinds of prompts, and the ruling says which is which:

- **Factory guides** describe the machine's contract: the work guide (the worker pushes, not the agent), the closing guide, the supervisor's strict JSON, the review and audit prompts. They change with the factory and stay Go constants.
- **Project guidance** is content: how this repository is laid out, its conventions, its product rules. It ships as data. Today that is the template's AGENTS.md, seeded at registration and then the project's own file, protected by the risk rules and flagged by the audit when an agent changes it.

What is missing, ruled now: a default prompt pack beyond one file. The factory ships, as data in the config tree, a small set of defaults a project inherits and overrides: the AGENTS.md template (it exists), a debugging discipline guide (reproduce first, one change, verify), an audit pair (a bug hunt and an architecture review, the fleet skills generalised), and the standing instruction on product rules above. A project that ships its own skills carries them in its repository the way it carries AGENTS.md. When a skill for a tool is needed, prefer the maker's own, Vercel for React, AWS for their stack: one line of curation policy in the pack. Roadmap 36 (AGENTS.md resolution, the directory walk with per-directory override files) is this layer's adjacent item.

No prompt carries a fact. Budget, state and history reach an agent through a tool or an injected input, never through a sentence (roadmap 199 and its plan).

## 4. State today

Verified in the code on 2026-10-13:

- Stage composition is data: one process file per process, four blocks, a project names its process. The stage vocabulary is a Go enum of nine kinds with the floor (checks, policy, approval, merge always present, screening first, merge last).
- The check commands are the project's own CI, seeded from the config tree's templates. A new CI check touches no Go. Existing repositories get template updates as pull requests.
- The merge rule is per project. The risk classes and their path rules are global in policy.yaml today, not overridable per project.
- The reproduction command comes from the issue's repro block, and the gate proves the fault at the base and the fix at the head.
- Every factory-side prompt is a Go constant. AGENTS.md ships from the template. There is no skills mechanism, no per-project prompt key, no CLAUDE.md.
- The harness interface exists (prepare, run, message) with one implementation, opencode, chosen in code. A per-class harness choice is roadmap 28.
- Nothing scheduled cards periodically on 2026-10-13. Since 2026-10-15 routines file cards by cron, after a count of merges or on an event ([routines.md](routines.md)).

## 5. Open points

- Skills as data: carried by the project's repository, installed by the worker from a factory default pack, or both. The adapter contract must say how a pack maps onto a harness's own skill mechanism, so a harness swap (roadmap 28) keeps the pack working.
- The sourcing of product rules: a directive card ("here are rules, give them tests") or the planner extracting candidates while planning. Either lands as tests in the repository. The agent must understand that a check never calls a model per execution.
- Periodic cards: closed by the routines of 2026-10-15 ([routines.md](routines.md)). An audit at a checkpoint is a routine that files a card to run a skill.
- The drift view: closed cards grouped by changed path, weighted by revert marks. A query, not a stage. It rides roadmap 198's recording, needs the changed-path list on the task (the plan records counts only), and feeds roadmap 37's runbooks.
- Risk classes per project: global only today. Possibly right, possibly a tightening a project should be allowed. Not discussed.

## Sources

Sebastian, 2026-10-13: the comparison with another agent factory and this discussion's rulings. [roadmap.md](roadmap.md) items 28, 36, 37, 69, 198 to 200. [target-architecture.md](target-architecture.md), "Processes as configuration" and the worker plane. [architecture.md](architecture.md) sections 6 to 8.
