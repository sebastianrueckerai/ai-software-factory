# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A largely autonomous "software factory": agents build and improve software from specs and from live feedback (issues, telemetry), with human escalation as a tool call used as sparingly as possible. It exists as a portfolio project to show enterprises that a lone developer can run an enterprise-grade agentic setup.

This repository holds the design docs and the build plan. Code lives in two sibling repositories, each pushed to Forgejo (`origin`) and GitHub (`github`): `~/repos/ai-software-factory-code` (Go: factoryd, factory-gateway, agent-worker; `go test -race ./...`) and `~/repos/ai-software-factory-infra` (OpenTofu, Talos configs, Flux manifests). Build progress, rulings and the rebuild recipe live in the gitignored ledger `.superpowers/sdd/2026-09-24-build-plan/progress.md`.

## Read first

- `docs/goal.md`: requirements and constraints.
- `docs/software_factory_conversation_export.md`: the exported design conversation. Treat it as the architectural baseline, not just background.
- `docs/ai-software-factory-ux-conversation.md`: the exported conversation on the human's side of the factory. Treat it as the baseline of the human interface, as the export above is for the architecture.

## Architecture baseline (from the export and the UX conversation)

Five planes in a loop: signals (issues, telemetry, alerts) feed a durable control plane (task state, scheduler, policy, approvals, model choice, cost and audit), which spawns disposable agent workers in sandboxes (ephemeral workspace, constrained network, temporary credentials); their output passes a verification plane (tests, security, stronger-model review, policy evaluation) before merge and deploy, and telemetry feeds back into signals. Kubernetes is the substrate, not the orchestrator. The harness is replaceable and model-independent, behind a model gateway. Policy lives outside the LLM. Identity belongs to the task, not the machine, with short-lived credentials. Agents exchange artifacts. Humans and the project agent may message a running agent, and the gates judge the result. The human's tool is one project screen per project: status line, pulse, board, a chat with the project agent, and a card drawer. Stage 16 adds four principles for every prompt and tool: no rule in a prompt that a tool or a deterministic step can carry, every console read is a tool, self-correction over prevention, and a small default context with depth fetched by tools.

## Constraints that shape every choice

- Immutable and re-seedable end to end: deleting everything and re-seeding must work.
- Cheap commodity hardware, no vendor-specific services. Hetzner boxes plus S3 storage are the reference example, not a requirement.
- Kubernetes layer; Harvester is a candidate.
- Security without half measures: no direct credentials to agents, predefined fine-grained roles, spend limits, sandboxes, controlled network egress.
- Open source where possible, but best-of-breed tools over obscure ones. Be ready to swap a tool whose makers gate needed features behind an enterprise tier.
- As few tools as possible, but only if they cover every constraint above.
