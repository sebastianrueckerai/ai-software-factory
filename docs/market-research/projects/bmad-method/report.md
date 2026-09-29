---
name: BMad Method
slug: bmad-method
url: https://github.com/bmad-code-org/BMAD-METHOD
repo: https://github.com/bmad-code-org/BMAD-METHOD
category: spec-driven
license: MIT
open_source: yes
self_hostable: yes
hosting_model: no service at all, just a set of skills and small uv-run Python scripts installed into the user's own AI coding tool (Claude Code, Codex, Cursor and others)
company: BMad Code, LLC, solo-founder operation (Brian Madison), no outside funding found, founded 2025, revenue from donations and paid training and consulting
maturity: 53,628 stars, 6,040 forks, 39 open issues, first commit 2025-04-13, last push 2026-09-29, releases roughly weekly (v6.12.0 on 2026-09-04), 26 Python unit tests and a manifest/skill validator in CI
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 3
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 3
  reseedable_selfhost: 4
steal:
  - Step-file architecture. A workflow loads one step file at a time, reads it fully, executes it, then loads the next by absolute path. Keeps the acting model's context to one step instead of the whole workflow, a pattern worth for our long worker prompts.
  - Review triage taxonomy in skills/bmad-build/step-04-review.md. Every finding gets exactly one verdict (high, medium, low, false, maybe-false), then routes to intent_gap, bad_plan, patch or defer. Patch findings are auto-fixed in the same session. Defer findings are appended to a standing deferred-work.md instead of being dropped. Close to what our stronger-model review gate should do with its findings.
  - Rendered, hashed skill snapshots. The skills/bmad/scripts/render_skill.py script compiles Jinja2 markdown plus a three-layer TOML customization (base, team and user layers, scalars override, tables deep-merge, arrays-of-tables key by id) into an immutable, hashed snapshot under _bmad/. Gives a reproducible, diffable prompt build, a pattern for versioning our own harness prompts and policy overlays.
  - Ticket state kept out of the ticket body. A leaf's status, assignee and block reason live in a sidecar <slug>-plan.md joined by a ticket field, so the human-authored ticket text and the agent-authored build state never collide in the same diff. Useful separation for our TaskBrief versus findings.
  - Deprecated skill names resolve as forwarders (bmad-create-prd to bmad-prd, etc.) so renames do not break existing callers, a cheap backward-compatibility habit worth copying for our own tool and skill names.
  - bmad-retrospective re-runs the review lenses over a whole completed epic's diff as a closing gate, separate from the per-change gate in bmad-code-review. We only verify per task. A closing look at the full arc of a multi-task epic is a gap we do not cover.
differs:
  - No sandbox, no network egress control, no per-task identity anywhere in the design. BMad assumes a trusted human is present in the same coding session and workspace for every step. It is a planning and building co-pilot, not an unattended worker. None of its mechanisms could be adopted inside our worker plane without breaking the "security without half measures" constraint, because there is nothing there to adapt.
  - Coordination is one continuous persona-plus-shared-files session in the user's own checkout, not disposable workers exchanging artifacts. This is the direct opposite of "agents exchange artifacts, not chat", BMad's whole value proposition is a long-lived conversational identity (Amelia, Winston, Mary) that carries context turn to turn.
ux_verdict: Good ergonomics for a human pairing with an agent in their own editor (named personas, numbered menus, hard checkpoints, git-visible plan and ticket files as state) but there is no dashboard, no queue view and no way to watch or steer work you did not start yourself.
slop_verdict: Real, actively maintained and clearly used in anger (53.6k stars, near-daily commits, a real test and validation suite, an ecosystem of official add-on modules and third-party products), but architecturally still moving fast, it rewrote itself from an agent-team-file model to the current Jinja-rendered skills model within about a year, and a maintainer-engaged, since-closed GitHub issue (#2003) catalogues real structural contradictions in the prior v6 stable release.
---

# BMad Method

## 1. What it is

BMad Method (Breakthrough Method for Agile Ai Driven Development) is a free, MIT-licensed set of skills, agent personas and workflow templates that a developer installs into an existing AI coding tool (Claude Code, Codex, Cursor and others) via `npx skills add bmad-code-org/BMAD-METHOD` or a plugin marketplace. It is not a product with its own runtime, queue or server: everything lives as Markdown skill files, TOML customization layers and small `uv run` Python scripts checked into the user's own repository under `_bmad/`.

The maker, solo founder Brian Madison trading as BMad Code, LLC, positions it as "Agile Ai Driven Development": right-size the planning depth to the size of the change, keep decisions explicit, and carry context forward as documents (brief, PRD, architecture, tickets, plans) rather than re-explaining them in every chat. It targets people already using an AI coding assistant who want more structure than ad hoc prompting gives them, from solo hobby projects to, per its own marketing, regulated codebases that need a paper trail.

The README's claim is "the same method covers a weekend prototype and a system with years of history behind it." What the repository actually shows is a very deep prompt-engineering system (five persona agents, roughly twenty workflow skills, step-file workflows with a review-triage state machine) plus a real, if small, software project underneath it (Jinja2 rendering, TOML config merge, 26 unit tests, manifest and skill validators). There is no code that runs, builds, tests or deploys anything on its own. Every action still happens inside the host coding tool's own session, with the host tool's own filesystem access and credentials.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work starts only when a human types a request or hands the agent a ticket already sitting in the tree. `bmad-ticket` can sync ticket status with an external tracker, but nothing turns an issue, alert or webhook into a BMad session on its own | Forgejo webhooks, SigNoz alerts and the factoryd intake API all create tasks automatically | we lead |
| Control plane | A ticket tree of Markdown files and `tickets.toml` under the initiative folder, with a small state machine (`planned`, `backlog`, `in-progress`, `review`, `done`, `dropped`) computed from a sidecar plan file's `status`. Durable in the sense that it is plain files in Git, but no scheduler, no budgets, no approval workflow beyond hardcoded "halt and wait" checkpoints in a step file | `factoryd` with a Temporal workflow per task, Postgres task registry, policy, budgets and approvals as first-class state | we lead |
| Worker plane | The same coding-tool session the human is already in. No isolation, no separate identity, full access to whatever the session has | One gVisor pod per task, read-only root, default-deny egress, one ServiceAccount per task | we lead |
| Verification | `bmad-code-review` and the `bmad-build` review step run several "lens" subagents (adversarial, edge case, verification gap) over a diff, triage every finding to exactly one verdict, and loop back to re-plan or auto-patch. All in the same trusted session, no independent CI, no policy engine | Forgejo Actions on untrusted runners, path-risk and reproduction gates, then a stronger-model review with a strict verdict | equal in review depth, we lead on independent gating |
| Merge and deploy | Out of scope. BMad stops at reviewed, working code in the working tree. It has no merge bot, no GitOps, no deploy | Bot-only merge after approval or an auto rule, Flux deploy, staged rollout | we lead |
| Policy outside the model | None. Every rule ("halt at checkpoints", "never skip steps") is a prompt instruction the acting model is trusted to follow. Nothing is enforced in code or network | Capability rules are a Git-versioned document enforced in gateway code and network policy | we lead |
| Identity per task | None. The session inherits whatever credentials and filesystem the host tool already has | Short-lived, task-scoped, audience-bound tokens. No key material reaches the sandbox | we lead |
| Artifacts not chat | Deliberately the opposite: the value proposition is a single persistent persona (Amelia, Winston, Mary) carrying conversational context across a whole workflow, backed by files it writes and re-reads, not disposable workers exchanging a TaskBrief | Disposable worker per task. TaskBrief in, PR and event stream out | not comparable, different unit of work |

## 3. Architecture and stack

Everything is plain text plus a thin Python layer. Each skill lives in `skills/<name>/` with a `SKILL.md` (YAML front matter: `name`, `description`) that either adopts a persona, runs a workflow, or does a one-shot task. Workflows use a "step-file architecture" (`skills/bmad-build/step-01-clarify-and-route.md` through `step-05-present.md`, chained by `{{ rendered("step-XX.md") }}` in `workflow.md`): only the current step is loaded, each ends by pointing at the absolute path of the next.

The one piece of real software is `skills/bmad/scripts/render_skill.py` (660 lines, PEP 723 inline dependencies, `jinja2>=3.1`, run with `uv run --no-cache`). It renders a skill's Markdown/Jinja templates against a three-layer TOML customization (`customize.toml` defaults, `_bmad/custom/<skill>.toml` team overrides, `_bmad/custom/<skill>.user.toml` personal overrides, merged by `config_utils.structural_merge`) into a hashed, immutable snapshot under the project's `_bmad/` folder. `resolve_config.py`, `resolve_customization.py` and `knowledge.py` in the same folder handle config lookup and the `bmad` hub's cross-module help.

Task and ticket state (`skills/bmad-ticket/`) is a folder tree: a container (`initiative` or `epic`) is a Markdown file plus a `tickets.toml` of ordered entries. A leaf ticket is a Markdown file once "pulled". Build state (`status`, `assignee`, `blocked_reason`) lives in a sidecar `<slug>-plan.md`, never in the ticket file itself, and `tickets.py` (a script, not read directly) resolves references and computes state. An optional external tracker is a "remote": `write` pushes, `query` reads back, mapped through `_bmad/custom/ticketing-store-config.toml`.

There is no server, no database, no queue, no container image and no Helm chart anywhere in the repository. `docker-compose.yml`, `Dockerfile` and Kubernetes manifests are absent. Deployment is `npx skills add ...` or a Claude Code / Codex plugin marketplace entry, writing files into the target repository. Model access is whatever the host coding tool already provides. BMad never calls a model API directly, it only shapes what gets sent to the model already running the session. Quality tooling under `tools/` (`quality.py`, `validate_skills.py`, `validate_manifests.py`, `validate_file_refs.py`, `bundle_web_bundles.py`) and `tools/tests/` (26 pytest files) check that skill files, manifests and cross-file references stay consistent, and `bundle_web_bundles.py` packages a subset of workflows as the "web bundles" used for the Gemini Gem / ChatGPT Custom GPT planning mode advertised on the website.

## 4. UX

There is no UI of its own. Everything happens as text inside the host coding tool (Claude Code, Codex, Cursor, etc.). A first run is: install with `npx skills add bmad-code-org/BMAD-METHOD` (choose skills and tool), open the project in the coding tool, type `bmad`, ask it to run `bmad setup`, then invoke `bmad-build` (or an agent persona like Amelia, the developer) with the change wanted. That is roughly four steps from zero to a running workflow, comparable in step count to our console's login-and-create-task path, but entirely CLI/chat, with no visual task board.

While an agent works, the user sees the acting model narrate each step file in the same chat window (persona icon prefix, e.g. Amelia's, kept on every message), and the workflow "halts at checkpoints and waits for human input" by design, for example after the clarify-and-route step, before overwriting `<frozen-after-approval>` sections of a plan, and whenever a review loopback needs a human decision on an `intent_gap` finding. Intervention is done by talking: answering the halt, editing the plan file directly (it is plain Markdown in the repo), or invoking `bmad-correct-course` for a bigger mid-work change. There is no separate approve button, no cost view, and no way to watch a session you did not personally start, since there is no server holding state outside the one active chat and the files it wrote.

What is easier than our console: zero infrastructure to stand up, git diff of a plan file or ticket is a legible, human-editable review surface, and named personas make hand-off between planning and building roles legible in a single transcript. What is worse: no kanban view across tasks, no login or access model at all (it inherits whoever is signed into the host tool), and nothing to watch if you step away, since the loop always needs the human's own session to keep advancing.

## 5. Security, identity, sandbox, policy, cost

**Security and sandbox.** None. BMad never isolates anything. It runs with the full filesystem and network access of the host coding tool's session. Everything it does, run `uv`, run tests, edit files, happens directly in the user's own working tree.

**Identity.** No concept of task identity or scoped credentials exists anywhere in the skill files read. The acting model uses whatever the host session is already authenticated as (the developer's own Git remote, their own model API key through the host tool).

**Policy.** Rules are prompt instructions, not enforced code: "NEVER skip steps," "ALWAYS halt at checkpoints" in `skills/bmad-build/workflow.md` are conventions the acting model is trusted to follow, with no independent check that it did. `bmad-code-review`'s triage log is the closest thing to policy, and it is itself a model output, self-graded by another prompt.

**Cost.** Not addressed anywhere. No budget, hold, ledger or spend cap of any kind. Cost is entirely a function of the host tool's own metering and whatever model plan the user brought.

## 6. What we should take from it

Narrow: the review-triage state machine in `skills/bmad-build/step-04-review.md` (one verdict per finding, then route to `intent_gap` / `bad_plan` / `patch` / `defer`, patch auto-fixed inline, defer appended to a standing log) is a concrete, ready-to-adapt shape for what our `review-frontier` gate should do with the findings it produces, rather than a single pass/fail verdict. The three-layer TOML customization merge (base, team and user layers, scalars override, tables deep-merge, arrays-of-tables key-matched) is a clean, small pattern if we ever let a project override default harness behaviour without forking the prompt. The "sidecar plan file holds mutable build state, the ticket file holds authored content" split is worth copying wherever we currently mix agent-written status into a human-authored document.

Broad: the step-file, just-in-time-loading workflow discipline (never load more than the current step, always end by naming the next file's absolute path) is a real answer to context bloat in long agent workflows, and our own worker harness prompts for multi-step tasks could adopt the same shape. The idea of a closing, whole-epic review (`bmad-retrospective`) distinct from the per-change gate is a gap in our own design: we verify each task, never the arc of a multi-task piece of work once it is "done".

## 7. Where our philosophy differs and what that costs or buys us

BMad has no sandbox, no network policy, no per-task identity and no cost control anywhere in its design, because its whole model is a human sitting in the same session as the agent for the entire workflow. That is not a gap they plan to close. It is what "Human Amplification, Not Replacement" (their stated philosophy in `CONTRIBUTING.md`) means. Adopting anything from their worker model would directly break our "security without half measures" constraint, since there is nothing there to adapt, only an assumption we do not share, that a human is always present and always trusted with full access.

The other direction costs us something: BMad's single persistent persona carrying context turn to turn produces a smoother planning conversation than our own "artifacts, not chat" model ever will, because ours deliberately throws the session away between tasks. Our constraint (disposable, sandboxed, artifact-passing workers) buys reproducibility and containment. BMad's continuous session buys conversational continuity we do not have, at the cost of never being able to run unattended or at scale beyond one human's active attention.

## 8. Red flags and slop assessment

Not a landing-page shell: 53,628 stars, 6,040 forks, commits pushed the same day this report was written, a real test suite (26 pytest files under `tools/tests/`) and validators (`validate_skills.py`, `validate_manifests.py`, `validate_file_refs.py`) that check the skill files themselves for consistency, and named official add-on modules (BMad Builder, BMad Loop, a Test Architect enterprise add-on) with their own repositories.

Two things temper that. First, the project has rewritten its own core architecture at least once within roughly a year, from an earlier "agent team file" model to the current Jinja-rendered, `uv`-executed skills model. A maintainer-engaged, now-closed GitHub issue (#2003, "Structural Gaps and Contradictions of the BMAD Method V.6 Stable", opened 2026-03-15) documents real structural contradictions found during a user's own epic retrospective using BMad's own agents. Second, independent reviews found in web search (Medium, Augment Code, MindStudio, a "tested three spec-driven tools" blog post) converge on the same complaint: planning overhead that does not pay for itself on small changes, a steep learning curve, and a quality gate that is "agents checking agents" with no independent check outside the same trusted session. Some of those reviews come from vendors of competing tools (Augment Code, CodeMySpec) and should be read with that in mind. `BMad Test Architect` is explicitly an "enterprise add-on," the one place the ecosystem gates deeper testing behind a separate module, though not behind a paywall as far as the repositories show.

## 9. Sources

- /home/womb/repos/market-research-clones/bmad-method/README.md
- /home/womb/repos/market-research-clones/bmad-method/LICENSE
- /home/womb/repos/market-research-clones/bmad-method/CONTRIBUTING.md
- /home/womb/repos/market-research-clones/bmad-method/skills/bmad/SKILL.md
- /home/womb/repos/market-research-clones/bmad-method/skills/bmad/scripts/render_skill.py
- /home/womb/repos/market-research-clones/bmad-method/skills/bmad-build/SKILL.md
- /home/womb/repos/market-research-clones/bmad-method/skills/bmad-build/workflow.md
- /home/womb/repos/market-research-clones/bmad-method/skills/bmad-build/step-04-review.md
- /home/womb/repos/market-research-clones/bmad-method/skills/bmad-build-auto/SKILL.md
- /home/womb/repos/market-research-clones/bmad-method/skills/bmad-ticket/SKILL.md
- /home/womb/repos/market-research-clones/bmad-method/skills/bmad-agent-dev/SKILL.md
- /home/womb/repos/market-research-clones/bmad-method/skills/bmod-method/SKILL.md
- /home/womb/repos/market-research-clones/bmad-method/docs/reference/skills-and-agents.md
- /home/womb/repos/market-research-clones/bmad-method/tools/ (validate_skills.py, validate_manifests.py, validate_file_refs.py, quality.py, tests/)
- Top-level layout via find . -maxdepth 2 -type d
- https://api.github.com/repos/bmad-code-org/BMAD-METHOD (stars, forks, issues, dates, fetched 2026-09-29)
- https://github.com/bmad-code-org/BMAD-METHOD/issues/2003 (fetched 2026-09-29)
- WebSearch "BMad Method BMAD-METHOD review 2026 agile ai driven development" (fetched 2026-09-29), including https://adsantos.medium.com/you-should-bmad-part-2-a007d28a084b, https://www.augmentcode.com/guides/bmad-method-ai-development, https://www.mindstudio.ai/blog/ai-agent-frameworks-compared-bmad-gsd-hermes, https://ranthebuilder.cloud/blog/i-tested-three-spec-driven-ai-tools-here-s-my-honest-take/
- WebSearch "BMad Code LLC company founder funding Brian Madison BMAD method" (fetched 2026-09-29), including https://www.bmadcode.com/about/, https://techleadjournal.dev/episodes/255/, https://nearform.com/insights/beyond-the-code-a-candid-chat-with-bmad-creator-brian-madison/
