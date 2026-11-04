# Architecture health: seeds from the software factory talk

Written 2026-11-04. Status: seeds, neither planned nor built. The source is Dex Horthy's ten-minute talk "State of the Software Factory" (October 2026) and the discussion of it on 2026-11-04. Section 1 holds the claim and its evidence. Section 2 holds the position Sebastian took. Section 3 holds the six seeds, each a candidate factory part. Section 5 holds the decisions the seeds need.

## 1. The claim and the evidence

The talk's claim: a model left alone does not keep a code base's quality over time, so for now a human reads the code. The talk is not against factories. It says a ticket-to-pull-request pipeline for small work is easy, and its longer form concludes that human-led planning gives 2 to 3x speed without losing quality. It argues against one thing, the lights-out factory where no human reads the code at any point.

The evidence it cites:

- SlopCodeBench, a benchmark from the University of Wisconsin-Madison, accepted to NeurIPS 2026. An agent gets a problem in stages and extends its own code at each checkpoint. Verbosity rises in 75 to 90% of trajectories and complexity concentration in 77 to 80%, whatever the model. The best strict pass rate is 16.3% of 196 checkpoints. Against 473 open-source Python repositories, agent code is 2.3x more verbose and 2.0x more eroded, and the human repositories degrade less often and by smaller margins. The paper reports that prompting improves the first checkpoint and does not stop the erosion.
- Anthropic's post of 31 August 2026 on its alignment and security practices: "it became clear that there were other issues born from messy code accumulating over time."
- The Faros AI report: incidents per pull request up 242.7% between each organisation's lowest and highest adoption periods. The twelve-month trend in the September update is 14.5%.
- Steve Yegge, who argued for a year that reading the code holds you back, deleted 40% of his factory after it wrote half a million lines in twelve weeks.

What the benchmark measures: the bare model. The agent starts in an empty workspace, picks its own architecture, gets a CLI contract and the stock prompt. No linter pushes back during the run, no second reader sees the code, no architecture document exists. Dex's October run used over 200 slop linters to measure the output, not to push back on the agent. A harnessed factory's score is not published by anyone.

What the strict number is worth: a noise analysis of the leaderboard found about 10 of 196 checkpoints in play and about half of all strict passes at checkpoint 1. The move from 14.8% to 16.3% is three checkpoints in single runs. The erosion and verbosity trends are the finding that holds.

The training argument: reinforcement learning rewards a passing test, and maintainability has no fast oracle at training time, so a model learns to be correct now and corrosive later. The argument proves that a model will not keep code clean by default. The factory runs at inference, where a slow oracle costs minutes, not a training run. A duplication count, a complexity trend, a mutation score and a second reader are all affordable there.

## 2. The position: three instruments, no human reads every pull request

Sebastian, 2026-11-04: humans should not read all the code. They should find better ways to test the expected system behaviour and let the agents explain what they build. Whether it is a monolith, services or an event-based system matters. Reading every pull request does not.

Reading every pull request fails for human teams too. Faros shows median review time up 441% as pull request size grew 51%. Dropping it leaves a gap, because the two instruments Sebastian named cover two of three questions:

| Question | Instrument | Who reads the result |
|---|---|---|
| Does it do what the spec says? | Behaviour tests: the criteria and their blind proofs | A program |
| Is it the shape we decided? | An architecture view produced from the code, compared to the decided one | The human, when the two disagree |
| Is the code getting harder to change? | Structural metrics per merge, a trend per project | A program, and the human reads the trend |

Behaviour tests pass while the code erodes. SlopCodeBench's core pass rate is 65 to 74% while erosion rises, so the features work and the next feature costs more. An architecture explanation can be true at its level while every module fills with duplicated code and one function holds half the complexity. The third instrument sees the layer between.

The human reads, in this order: the architecture decision before the build, the spec and its criteria, the view produced from the code against the decided one, the structural trend, and a diff only on exception. The exceptions: a metric trips, the produced view disagrees with the decided one, a worker escalates.

One caveat shapes the first seed. The explanation must come from the code, not from the builder. A builder describing its own work describes its intent, and the benchmark's gap between isolated and core pass rates shows that models misjudge what they built. Dex's Show Me skill is the builder explaining itself. It is useful while planning and weak as evidence after.

## 3. The seeds

### 3.1 The blind read

A reader session gets the repository as checked out and nothing else: no spec, no card, no plan, no builder transcript, no factory records. It writes one artifact: the shape (monolith, services, events), the boundaries and the contracts between them, the data flow, where the complexity sits, and what it could not explain. It is the blind idea of [blind-proofs-plan-2026-11-03.md](blind-proofs-plan-2026-11-03.md), a session the builder never meets, applied to reading instead of testing. The artifact rule of [proof-runner-concept-2026-11-03.md](proof-runner-concept-2026-11-03.md) holds: a judging model reads an artifact, never the diff.

It is a whole-repository read on a stronger model, so by the cost rule of [layers.md](layers.md) section 2 it never runs per card. Candidates for when it runs: at a plan's close, when the integration card merges, and at the audit of 3.4. Its readers are 3.4 and 3.5.

### 3.2 The SlopCodeBench run

Run the benchmark's pinned v1.0 catalogue, 36 problems and 196 checkpoints, through the factory, and put the number on [evidence.md](evidence.md). Each problem is a project registered from a template, each checkpoint a card through the gates, and the benchmark's own harness scores the result: strict, isolated and core pass rates, erosion, verbosity and cost. This answers the open question of the talk with a measurement nobody has published.

Two runs give more than one. The same catalogue with the structural gate of 3.3 on and off measures the gate's effect, which is the experiment the benchmark's authors have not run.

What the run must say about itself: one campaign cannot tell three checkpoints from noise, so the erosion and verbosity numbers lead and the strict rate follows. Dex's single-model campaigns cost $178 to $1,550 each in model calls, and the factory's gates add their own calls on top.

### 3.3 The slop detector and the structural metrics

The metrics, taken from the benchmark so the numbers compare: duplication share, complexity concentration (the share of complexity mass in high-complexity functions), verbosity (redundant and defensive code), function length, dead code. Each is a program's output, deterministic, seconds per run, no model.

[layers.md](layers.md) section 2 puts duplication and complexity in the audit skill's checklist at a checkpoint, never per card, because a model reading the whole repository per card is the cost the rule refuses. A program counting is not that cost. The seed splits the two: the count runs in the project's CI on every pull request and stores the diff's number and the repository's totals per project, and the model-driven audit stays at the checkpoint. The trend is a metric of the console. A threshold trip files the audit card of 3.4.

Tools per language go in the template. For TypeScript, Dillon Mulroy's anti-slop Oxlint rules, copied into the repository as the author intends. For Go, a duplication tool and a complexity tool next to the check script's linters.

Decision needed: whether the per-merge number only files the audit card or also blocks the merge above a threshold. Start with filing.

### 3.4 The rolling architecture review, triggered by merges or by a metric

The review exists on paper as the audit routine of [routines.md](routines.md), "Audit: bug hunt and architecture review", every 20 merges, not built. The schedule of a routine takes three trigger kinds, `cron`, `merges` and `on`. The seed adds a metric trip as an event the `on` kind accepts, so one routine fires every n merges or when 3.3 crosses its threshold, whichever comes first.

The review's inputs: the blind read of 3.1, the decided architecture of 3.6, the trend of 3.3 and the merges since the last run. Its outputs: findings as cards, and an amendment to the decision log where the shape changed on purpose.

### 3.5 The adversarial round: the claim against the code

A critic gets two artifacts, the builder's claim and the blind read. The claim is what the factory already holds: the plan's architecture statement, the pull request description, the integration card's summary. The critic names each disagreement: a boundary the claim has and the code does not, a dependency the code has and the claim omits, a module the claim calls one thing and the code treats as another. Each disagreement becomes a row for the human or a finding in the audit card. The principle is the one of [design/process.md](../design/process.md): the model that wrote a thing is never its only judge.

### 3.6 The decision log: intent next to the change

A record a human reads that ties a code change to the intent of the time. The chain exists as rows today: issue, spec, plan, card, merge, audit trail, one record per issue ([architecture.md](architecture.md)). Two things are missing. The architecture decision is not an entry anyone writes, and no view answers "who touched this directory and why".

Two shapes, both wanted:

- A decision log per project, in the form of [design/design-decisions.md](../design/design-decisions.md): one entry per decision, newest last, never reversed silently, a change proposed as a new entry that names the one it amends. The planner writes an entry when a plan fixes a shape, so its output gains one field, the architecture decision or none. The audit of 3.4 amends it.
- A view by path, derived from existing records: for a directory, the cards that touched it, each with its spec clause and its one-line intent, in merge order.

Where the log lives decides whether the blind read stays blind. In the project's repository it travels with the code and the reader of 3.1 sees it. In the factory's records it does not. The claim of 3.5 is the log's latest entry either way.

## 4. What this leaves of the merge gate

The seeds do not remove the stronger-model review at the gate. They put a program under it (3.3) and a reader beside it (3.1 and 3.5). Dex has a post titled "Why review agents do not solve the slop problem", unread as of this document. It bears on the review this factory relies on, and the planning of 3.3's threshold reads it first.

## 5. Decisions the seeds need

1. The budget and the model for the SlopCodeBench run, and whether to run it twice for the gate's effect.
2. Whether the per-merge structural number files the audit card only, or also blocks a merge above a threshold.
3. Where the decision log lives: in the project's repository, or in the factory's records so the blind read stays blind.
4. When the blind read runs: at a plan's close, at the audit, or both.

## 6. Sources

- The talk's earlier form: [State of the Software Factory, September 2026](https://www.youtube.com/watch?v=-w6RDNBAI0E&t=2393).
- The longer talk: [Why Software Factories Fail](https://www.youtube.com/watch?v=Ib5GBkD555M), with its [written form](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/wsff.md).
- The benchmark: [SlopCodeBench, arXiv 2603.24755](https://arxiv.org/abs/2603.24755), the [leaderboard](https://www.scbench.ai/leaderboard), the [code](https://github.com/SprocketLab/slop-code-bench).
- The October run: [SlopCodeBench update 10/2026](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/benchmarking-new-models-on-slop-code-bench.md) and its [noise analysis](https://github.com/griffonn/maybenull.com/pull/18).
- The anti-slop rules: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop).
- The Show Me skill: [humanlayer/skills](https://github.com/humanlayer/skills).
- Anthropic: [Improving our alignment and security efforts](https://www.anthropic.com/news/improving-alignment-security-efforts).
- Faros AI: [AI Engineering Report 2026](https://pages.faros.ai/hubfs/AI_Engineering_Report_2026_The_Acceleration_Whiplash_Faros.pdf).
- Dex on review agents: [Why review agents do not solve the slop problem](https://x.com/dexhorthy/status/2032915117294449006).
