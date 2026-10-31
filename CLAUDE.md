# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A largely autonomous "software factory": agents build and improve software from specs and from live feedback (issues, telemetry), with human escalation as a tool call used as sparingly as possible. It exists as a portfolio project to show enterprises that a lone developer can run an enterprise-grade agentic setup.

This repository holds the design docs and the build plan. Code lives in two sibling repositories, each pushed to Forgejo (`origin`) and GitHub (`github`): `~/repos/ai-software-factory-code` (Go: factoryd, factory-gateway, agent-worker; `go test -race ./...`) and `~/repos/ai-software-factory-infra` (OpenTofu, Talos configs, Flux manifests). Build progress, rulings and the rebuild recipe live in the gitignored ledger `.superpowers/sdd/2026-09-24-build-plan/progress.md`.

## Read first

- `docs/goal.md`: requirements and constraints.
- `docs/spec-driven.md`: the built spec-driven process in simple terms, with diagrams. The short orientation on how work runs from spec to merge.
- `docs/software_factory_conversation_export.md`: the exported design conversation. Treat it as the architectural baseline, not just background.
- `docs/ai-software-factory-ux-conversation.md`: the exported conversation on the human's side of the factory. Treat it as the baseline of the human interface, as the export above is for the architecture.

## Architecture baseline (from the export and the UX conversation)

Five planes in a loop: signals (issues, telemetry, alerts) feed a durable control plane (task state, scheduler, policy, approvals, model choice, cost and audit), which spawns disposable agent workers in sandboxes (ephemeral workspace, constrained network, temporary credentials); their output passes a verification plane (tests, security, stronger-model review, policy evaluation) before merge and deploy, and telemetry feeds back into signals. Kubernetes is the substrate, not the orchestrator. The harness is replaceable and model-independent, behind a model gateway. Policy lives outside the LLM. Identity belongs to the task, not the machine, with short-lived credentials. Agents exchange artifacts. Humans and the project agent may message a running agent, and the gates judge the result. The human's tool is one project screen per project: status line, pulse, board, a chat with the project agent, and a card drawer. Stage 16 adds four principles for every prompt and tool: no rule in a prompt that a tool or a deterministic step can carry, every console read is a tool, self-correction over prevention, and a small default context with depth fetched by tools.

## Design principle for every AI step

Reliability comes from how an AI step is built, not from its prompt (Sebastian, 2026-10-12). Each step has a limited scope. It gets all the context it needs, including the history of the steps before it, all the tools it needs, tools to gather more, and a clear view of its goal. It checks its own work and corrects itself, and every refusal names the state and the fitting action, so it can. When a step goes wrong, fix it by construction: in code, in a tool's shape, in a check or in the configuration, and make a step that is too large smaller. A prompt rule is the last resort: needed at times, but brittle, and such rules accumulate. Stage 16's four principles above apply this to the chat. The roadmap's third guiding idea and `docs/architecture.md` section 1 carry it.

## Every ask a human answers carries its own context

Any ask, question or escalation a human answers carries, always: a clear ask or problem description, then a short summary, then a longer text with enough context, in simple terms, that someone not versed in the system being built or the factory can understand the issue and decide, and the offered choices with what each does and its tradeoffs whenever the choice's name alone does not say so. The five-part contract is [docs/question-format-concept-2026-10-17.md](docs/question-format-concept-2026-10-17.md); the prose follows [docs/writing-guide.md](docs/writing-guide.md). The fallback is no exception: a stop no template covers still fills every part from the stop's own facts, never with fixed generic text. Text an agent reads may stay terse when that agent can gather more itself; the human-facing shape never does.

## Design rounds

The console's design runs as rounds by the process in [design/process.md](design/process.md): image models go wide, a vision critic judges, Sebastian picks, code follows. A round that designs one control or one feature uses the condensed form described there.

- Every generated image gets a sidecar JSON with model, prompt, references, parameters and cost. An output that cannot be made again does not count.
- A round ends with its page `design/rounds/NN-slug/index.html`. Sebastian's pick becomes a C-entry in [design/design-decisions.md](design/design-decisions.md). Never reverse a decision silently.
- The model that wrote a prompt is never the only judge of its output. Use the independent critics of [design/models.md](design/models.md).
- Stay inside the round's spending cap. Ask before a run that would pass it.
- Provider keys live in the gitignored `.env.tools`. Never print a key.
- Read [design/process.md](design/process.md) before any image generation or critique, [design/models.md](design/models.md) before calling a provider, and [design/design-decisions.md](design/design-decisions.md) before changing the look.

## Wording

- A human is a human. Never call one a member, an operator or a resource in docs, copy or chat wording. Code identifiers may keep their names.

## Launch surfaces

The landing page, the claims page, the film and the README are public. Read the handover before changing one: `launch/site/handover.md` for the landing page, its wording rules and its assets; `launch/handover.md` and `launch/film/notes.md` for the film and the seven clips; `demo/handover/README.md` for the scene bank they are recorded from.

- After editing `docs/evidence.md`, or once the code or infra repository's `github/main` moves, fetch both and run `node launch/site/evidence.js`. It fails on a path missing at that commit.
- `README.md` repeats the guarantee count, the runs and the limits of `docs/evidence.md` and the landing page. Change them together.
- After recording scene 38 again, record it with `POSTER=1` right after and cut `launch/site/assets/poster-routine.png` again, by the recipe in `launch/film/notes.md`.
- After editing a page in `demo/video/poster-*`, run `node demo/video/poster.js <name>` and copy its PNG into `launch/site/assets/`.

## Constraints that shape every choice

- Immutable and re-seedable end to end: deleting everything and re-seeding must work.
- Cheap commodity hardware, no vendor-specific services. Hetzner boxes plus S3 storage are the reference example, not a requirement.
- Kubernetes layer; Harvester is a candidate.
- Security without half measures: no direct credentials to agents, predefined fine-grained roles, spend limits, sandboxes, controlled network egress.
- Open source where possible, but best-of-breed tools over obscure ones. Be ready to swap a tool whose makers gate needed features behind an enterprise tier.
- As few tools as possible, but only if they cover every constraint above.
