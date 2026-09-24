# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A largely autonomous "software factory": agents build and improve software from specs and from live feedback (issues, telemetry), with human escalation as a tool call used as sparingly as possible. It exists as a portfolio project to show enterprises that a lone developer can run an enterprise-grade agentic setup.

The repository holds design docs only. There is no code, build, or test tooling yet. When code lands, record its commands here.

## Read first

- `docs/goal.md`: requirements and constraints.
- `docs/software_factory_conversation_export.md`: the exported design conversation. Treat it as the architectural baseline, not just background.

## Architecture baseline (from the export)

Five planes in a loop: signals (issues, telemetry, alerts) feed a durable control plane (task state, scheduler, policy, approvals, model choice, cost and audit), which spawns disposable agent workers in sandboxes (ephemeral workspace, constrained network, temporary credentials); their output passes a verification plane (tests, security, stronger-model review, policy evaluation) before merge and deploy, and telemetry feeds back into signals. Kubernetes is the substrate, not the orchestrator. The harness is replaceable and model-independent, behind a model gateway. Policy lives outside the LLM. Identity belongs to the task, not the machine, with short-lived credentials. Agents exchange artifacts, not chat.

## Constraints that shape every choice

- Immutable and re-seedable end to end: deleting everything and re-seeding must work.
- Cheap commodity hardware, no vendor-specific services. Hetzner boxes plus S3 storage are the reference example, not a requirement.
- Kubernetes layer; Harvester is a candidate.
- Security without half measures: no direct credentials to agents, predefined fine-grained roles, spend limits, sandboxes, controlled network egress.
- Open source where possible, but best-of-breed tools over obscure ones. Be ready to swap a tool whose makers gate needed features behind an enterprise tier.
- As few tools as possible, but only if they cover every constraint above.
