# Companion repositories: one build plan

Written 2026-10-31. Status: plan, awaiting Sebastian's OK. Nothing is built.

The incident first, as the why: PR #1385's model review said "concerns" three
times because it could not check that the paired infra change had landed. Infra
82ab246 sat on both remotes the whole time. The human carried the fact across,
which is why the runbook had to exist and the merge cost three presses. The
safety half worked as designed: the loader rejected the policy it could not
validate and kept version 971, the chain went red instead of breaking.

The shape, general and not a factory special case: a project owns one
repository and may declare any number of **companions it reads**. The
declaration is a human act by construction, for it lives in the human-only
config tree. The verification plane reads companions as facts with commit
shas, the plan filing pins the companion head on the card and the merge gate
checks the pin as a deterministic step, and a sandbox may clone a companion
read-only. A checkable fact belongs in a gate or a tool result, never in model
judgement: the roadmap's third guiding idea, applied across the repository
boundary.

## The plan in one view

Five phases, each shippable alone, in order, phase 5 last as the proof:

1. The declaration and the control-plane read.
2. The pin and the gate check.
3. The review's companion evidence.
4. The sandbox clone.
5. The dogfood: the factory declares its own infra.

## Phase 1: the declaration and the read

- `factory/projects/<name>.yaml` gains a companions block, one entry per
  companion, after the `chat:` line's shape:

  ```yaml
  companions:
    - repository: sf/ai-software-factory-infra
      sandbox: true
  ```

  `sandbox` defaults to false: phase 4's clone is opt-in per companion, least
  privilege unless a project says otherwise.
- `ProjectConfig` (`internal/policy/project.go:197-304`) and the runtime
  `Project` (`internal/factoryd/project.go:27-88`) gain the field. The JSON
  schema copy is generated from the struct (`writeSchemas`,
  `cmd/factoryd/config.go:106-120`) and reaches the infra repository by the
  SchemaCopier's standing pull request (`internal/factoryd/schemasync.go:59-126`):
  no hand edit, the existing bot path.
- The read: factoryd already reads the infra repository's tree read-only with a
  scoped token (`ForgejoConfig`, `internal/factoryd/policy.go:390-425`). The
  companion head read rides the same client and the same per-project access
  mapping: one new method, "is main at or after sha", the Forgejo compare
  endpoint, following `ActionRuns`' shape (`internal/factoryd/forgejo.go:546-576`).
- The credential names itself: the `factory-config` token is scoped
  `read:repository` to exactly `sf/ai-software-factory-infra`
  (`scripts/seed-secrets.sh:210-218` and `:293-296` of the infra tree), so the
  dogfood's read needs no seed change. A companion the token cannot read is
  refused at config load, by name, at declaration time and never first at the
  gate. Declaring a companion on a new repository pairs the declaration with
  one scope line in the same infra commit. The grant stays a human act, one
  tree, re-seedable. No admin mint, least privilege keeps its user.
- One Forgejo instance: an entry names a repository, never a host. The read,
  the gate and the clone all ride the one in-cluster Forgejo, and a repository
  on another host is refused at load with a named refusal.

## Phase 2: the pin and the gate check

- The card carries the pin as data: `PlanCard`
  (`internal/factoryd/plan.go:167-186`) gains
  `Companions []CardCompanion` with `repository` and `at` (the full sha), JSON
  beside its siblings, no migration. The builder settles the carrier to the
  gate: the plan filing copies the pin onto the task's stored spec, or the
  gate's input assembly reads the card. The pin is data either way.
- The system stamps the pin, not a model: the plan filing reads the companion
  head through the phase-1 read and records the sha on the card. A sha a model
  wrote is a fact in model judgement, and the strict plan decoder
  (`internal/factoryd/plan.go:295-315`) would pass a hallucinated one into a
  hold no replan can explain. Opt-in is therefore the declaration, not the
  card: a declared companion is pinned on every card of the project.
- The check is an activity, for workflow code cannot call HTTP: `GateCompanion`
  following the `GatePolicy`/`GateReproduction` pattern (`gates.go:446`,
  `gates.go:602`), dispatched from `taskRun.runStage`
  (`workflow_stages.go:535`).
- `GateResults` (`gates.go:110-126`) gains the field, and `AutoMerge`
  (`gates.go:184-260`) gains a met/unmet line beside "the checks ran green":
  met, "the companion sf/ai-software-factory-infra is at or after 82ab246";
  unmet, "the companion sf/ai-software-factory-infra is still behind 82ab246,
  at fee3ff16". The line survives into the approval ask (`AutoMergeNote`,
  `gates.go:343`; `workflow_stages.go:1016-1102`), so the human presses with
  the fact on the card, not the reviewer's guess beside it.
- Unmet holds the approval, it does not fail the card: the ask names the
  missing sha, the same hold the review's verdict has.
- A companion landing fires no event on the project repository, and a parked
  card cannot make a new head on its own. The chain poller
  (`internal/factoryd/chainpoll.go`, every 15 seconds) gains the companion
  heads of projects with a held pin, and a head that reaches the pin wakes the
  card the way a chain's green does. The hold is open-ended like an approval
  hold; ending the card stays a human act.
- The activity reads the head live, never a cached value. Every answer re-runs
  the gates from the first stage (the 21:17 to 22:18 loop of the incident), so
  a companion that lands after a refusal is seen on the next answer.

## Phase 3: the review's companion evidence

- `reviewInput` (`gates.go:943-1011`) gains the companions' facts: repository,
  main sha, and the pin's met or unmet with both shas. `ModelReview`
  (`gates.go:1263-1436`) carries them into the review as facts.
- A claim that names a companion file is checkable today: the plane reads any
  repository the client reaches (`FileContent`, `forgejo.go:1823-1843`; the
  claims checkout, `claims.go:167-212`). No new client, no new credential.
- With facts in the input, a concern a fact answers becomes bad judgement, not
  a blind spot. The incident's "concerns" would have read: companion at
  82ab246, pin met, verdict on the code alone.

## Phase 4: the sandbox clone

- `sandbox: true` puts the companion in the session's readable repositories:
  `sessionSpec.readable` (`runner.go:455-463`) already returns a list, and
  `MintToken` already scopes to `[]Repo` with `read:repository`
  (`forgejo.go:146-176`). One more entry, revoked by name as today
  (`completion.go:151-165`).
- The clone init container already clones up to three repositories (the
  project's, the fork's branches, the doc repository into `/workspace/docs`;
  `cmd/agent-worker/main.go:642-708`). A companion rides the doc pattern into
  `/workspace/companions/<name>`, read-only.
- Egress and credential: the in-cluster Forgejo is already admitted
  (`runner.go:2350-2360`), and the clone rides the session's token, which the
  readable-list change above already scopes to the companion. That one token
  serves every clone the init container makes (`runClone`,
  `cmd/agent-worker/main.go`), and the phase-1 host refusal keeps every
  companion on the one Forgejo.
- Planners and coders then read the real `factory/policy.yaml` and schema, and
  runbook prose stops being the only window into the other repository.

## Phase 5: the dogfood

- One config commit, after the code rolls: project ai-software-factory-code
  declares `sf/ai-software-factory-infra`, `sandbox: true`. No seed change
  rides with it, for the factory-config token already reaches that repository
  (`seed-secrets.sh:210-218`).
- The next cross-repo change runs the whole path: the planner reads infra, the
  card pins the sha, the gate names the companion line, the review reads the
  head, one press. The runbook pattern
  ([escalate-rename-infra-runbook-2026-10-31.md](escalate-rename-infra-runbook-2026-10-31.md))
  retires for reads. The human hands stay where infra's human-only rule keeps
  them: the push itself.

## The one risk and its hold

The strict decoder (`internal/policy/tree.go:376-394`, `KnownFields`) refuses
unknown fields, so a factoryd that does not know `companions:` rejects the
project config that declares one: the incident's red chain again, on the
project file. The order is therefore the reverse of the rename's: the code
lands and rolls first, the declaration commit follows. Never the declaration
first.

## What does not change

- One project, one repository it owns. Companions are read references; the
  repository-to-project map (`store.go`) is untouched, for the second lookup
  runs project-to-companions, no field rename.
- No agent writes a companion. Infra stays human-only; the SchemaCopier's pull
  requests are unchanged.
- No cross-repo atomic merge. The reconciliation window and the loader's
  reject-and-keep stay the safety net, as the incident proved.
- No declaration, no pin: undeclared projects keep today's behaviour
  everywhere else.

## Non-goals

- No monorepo, ever, and no generic any-repository reach: a companion is
  declared, per project, in the human-only config tree.
- No prompt rule anywhere: no brief asks an agent to trust a companion fact.
  Facts are gate lines, tool results and clones.

## Order of work

Phases 1 to 4, one card each, phase 5's config commit last. Work in a worktree
per the standing git workflow, commit to master, push both remotes of each
repository, delete the worktree.

## Sources

Sebastian 2026-10-31: "The underlying problem is the factory agents not seeing
infra"; "I would prefer a solution that is not just a special case for the
factory but I don't know if that is possible"; "Sounds good, make a plan for
that!". The incident of 2026-10-31: the three "concerns" verdicts on PR #1385
while infra 82ab246 sat landed, the CONFIG REJECTED hold on version 971
(factoryd log 21:54:32), the head-moved re-drive loop 21:17 to 22:18. The
design principle: no rule in a prompt that a tool or a deterministic step can
carry. The seams, grounded on origin/main of ai-software-factory-code and the
infra tree, file and line above. The builder check of 2026-10-31 settled four
gaps: the system stamps the pin, the chain poller wakes a held card, the
factory-config token carries the read with no admin mint, and companions stay
on the one Forgejo instance.
