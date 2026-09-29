---
name: codebase-memory-mcp & Sourcebot
slug: code-index-for-agents
url: https://sourcebot.dev (Sourcebot has a marketing site and public demo at app.sourcebot.dev. codebase-memory-mcp has no site beyond its GitHub Pages docs at deusdata.github.io/codebase-memory-mcp)
repo: https://github.com/DeusData/codebase-memory-mcp and https://github.com/sourcebot-dev/sourcebot
category: enterprise-agent-platform  # imperfect fit, chosen for its explicit mention of "memory". Neither tool is a platform. No category in the list covers a code-intelligence or context MCP server
license: "mixed: MIT (codebase-memory-mcp). FSL-1.1-ALv2 core + proprietary EE licence (Sourcebot)"
open_source: partial
self_hostable: yes
hosting_model: "codebase-memory-mcp: local binary, embedded in the calling process, no server. Sourcebot: self-hosted container plus Postgres and Redis, or their hosted app.sourcebot.dev"
company: "codebase-memory-mcp: solo maintainer (Martin Vogel, Berlin), no company, no funding. Sourcebot: Taqla Inc, YC Fall 2025 batch, about 500K USD seed (Pioneer Fund, Team Ignite Ventures, Rebel Fund, YC), San Francisco, founders building together since roughly 2024"
maturity: "codebase-memory-mcp: about 45k stars, about 3.7k forks, created 2026-02, roughly 7 months old, near-daily releases, about 650 open issues, commit history dominated by one account. Sourcebot: about 4k stars, about 380 forks, created 2024-08, over 2 years old, frequent releases, about 130 open issues, small team of contributors, cited users include NVIDIA and Wikimedia"
similarity: 1
axes:
  signals_intake: 0        # neither ingests issues, alerts or telemetry
  control_plane: 0         # no task state, scheduling or approvals in either
  sandbox_isolation: 0     # neither sandboxes anything, they are tools called from inside one
  verification: 0          # neither gates a merge or runs CI
  policy_outside_model: 1  # CBM_ALLOWED_ROOT (off by default) and Sourcebot's licensed per-user repo permissions are real code-level checks, but narrow and partly opt-in or paid
  identity_per_task: 0     # CBM trusts its caller with no auth, Sourcebot authenticates a human user, neither knows about a task
  cost_control: 0          # no budgets, holds or ledger in either, only a per-seat subscription for Sourcebot
  ux: 2                    # CBM's install-and-go onboarding is genuinely good for a narrow dev tool, Sourcebot needs infrastructure and a paid seat, neither is an operator console
  reseedable_selfhost: 3   # CBM is a static binary that reindexes from Git and is close to ideal here, Sourcebot self-hosts fully on the free plan but its paid features need a vendor licence server
steal:
  - "Zero-network single binary: bake codebase-memory-mcp into the agent worker image at build time so the sandboxed pod never needs an egress rule for it, matches our default-deny network policy for free"
  - "CBM's opt-in path fence and size caps (CBM_ALLOWED_ROOT, index_max_files, index_max_source_mb in docs/INDEX_RESOURCE_LIMITS.md) are a cheap fail-closed pattern worth copying and turning on by default for any local agent tool"
  - "Sourcebot's plain public REST API (/api/search, /api/repos, /api/tree, /api/source, /api/commits, /api/diff in docs/api-reference/sourcebot-public.openapi.json) carries no licence gate. A thin MCP shim in factory-gateway could call it directly and skip Sourcebot's own paywalled MCP transport and its per-seat Pro requirement"
  - "CBM's detect_changes tool (git diff to affected symbols plus a blast radius with a risk class) is close in spirit to the path risk classes our verification plane already computes by hand, worth reading as a candidate signal"
  - "Sourcebot's sizing guide (docs/docs/deployment/sizing-guide.mdx) gives a ready repo-count to CPU, RAM and disk table plus named concurrency settings (maxRepoIndexingJobConcurrency, maxConnectionSyncJobConcurrency), reusable if we ever run a shared index"
differs:
  - "Both tools bind trust to the caller, not the task. CBM has no identity at all and Sourcebot authenticates a human user, so a short-lived, task-scoped ServiceAccount token has nowhere to plug in. Exposing either through our gateway means our gateway, not the tool, has to become the place that maps a task to a capability and an audit line"
  - "Sourcebot's default licensing path needs a recurring outbound Service Ping to Sourcebot's own licence server to keep paid features alive, a permanent vendor-specific dependency our no-vendor-service constraint is written against. Staying on the free Basic plan avoids it but drops code navigation and Ask Sourcebot"
ux_verdict: "codebase-memory-mcp reaches a working MCP server and a 3D graph view in under a minute with no account. Sourcebot needs Postgres, Redis, a config file and a paid seat before any agent tool works at all"
slop_verdict: "codebase-memory-mcp is real, working code with an unusual growth pattern for one person (about 45k stars in 7 months, one dominant committer, marketing that outruns its own arXiv paper's numbers). Sourcebot is a normal two-year-old YC-backed product used in production, with a standard and fairly aggressive open-core paywall, not vapourware"
---

# codebase-memory-mcp & Sourcebot

## 1. What it is

Two separate open-source projects that give a coding agent knowledge of a codebase beyond its own context window. codebase-memory-mcp (CBM) is a single static binary that parses a repository with tree-sitter, builds a local knowledge graph and exposes it over MCP on stdio. It needs no server and no other project to run. Sourcebot is a self-hosted, multi-repository code search web application built on Zoekt, Postgres and Redis, which also offers an MCP endpoint as a paid feature layered on top of its search index.

CBM's maker is one individual, Martin Vogel, an independent researcher in Berlin, working with a small group of academic co-authors on one arXiv paper but alone on the repository. The README calls it a "session coordination daemon" and a "team-shared graph artifact" and claims "semantic search". The code confirms a working tree-sitter graph and a narrow, real form of code embeddings: a static, pretrained per-token vector table plus algorithmic signals, not a running neural model (see section 3). The project's own site claims figures (162 languages, "about 120x fewer tokens") well above what its own arXiv paper measured (66 languages tested, 10x fewer tokens, and an answer-quality score of 83 percent against a 92 percent baseline for an agent that just explores files directly).

Sourcebot is built by Taqla Inc, a small YC-backed company (YC Fall 2025, about 500K USD seed). Its marketing calls it "the AI code intelligence platform" with two flagship features, "Ask Sourcebot" and "Code search", and cites large users such as NVIDIA and Wikimedia. The docs and source code confirm a real, actively developed product with a standard open-core split: search and browsing are free under a Fair Source licence (FSL-1.1-ALv2), while code navigation, "Ask Sourcebot" and the entire MCP server sit in the `ee/` tree under a separate proprietary licence and need a paid Pro plan (20 USD per user per month, confirmed on sourcebot.dev/pricing) or Enterprise plan.

## 2. Mapping to our five planes

Neither project is a factory orchestrator. Both sit entirely inside what we call the worker plane, as a capability an agent calls mid-task. Most rows below are "not comparable" because the tools do not attempt the other planes.

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Neither ingests issues, alerts or telemetry as work | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | Neither has task state, scheduling or approvals | Temporal workflow per task in factoryd | not comparable |
| Worker plane | Both add a capability an agent calls mid-task: CBM a local graph, Sourcebot a remote search index | One disposable gVisor sandbox per task, opencode harness, no codebase index today | they lead, on codebase memory specifically (section 6) |
| Verification | Neither gates a merge or runs CI | Forgejo Actions, policy gates, model review | not comparable |
| Merge and deploy | Neither touches a PR or a deploy | Bot merge, Flux GitOps | not comparable |
| Policy outside the model | CBM's `CBM_ALLOWED_ROOT` restricts indexed paths in code, off by default. Sourcebot enforces per-user repository permissions in code when permission syncing is licensed | Capability policy as a YAML file in Git, enforced in gateway code and network policy | we lead |
| Identity per task | CBM has no identity concept, it trusts its caller. Sourcebot authenticates a human user with an API key or OAuth, not a task | Projected, audience-scoped, task-scoped ServiceAccount token, verified by factory-gateway | we lead |
| Artifacts not chat | CBM's graph and Sourcebot's index are both artifacts an agent reads, not a chat transcript | TaskBrief in, branch and PR out | equal in spirit |

## 3. Architecture and stack

CBM is written in C and compiled to a single static binary (`src/` holds `graph_buffer`, `semantic`, `git`, `cli`, `traces`, `ui`, `simhash`, `watcher`, `cypher`, `discover`, `foundation`, `daemon`, `mcp`, `pipeline`, `store`). Indexing runs on tree-sitter, with custom grammars added under `tools/` for niche languages (arkts, form, magma, chialisp) on top of a claimed 162 languages overall. Type resolution comes from what the README calls a "Hybrid LSP", a compiled-in, lightweight reimplementation of language-server-style resolution, not a spawned language server process. The `search_graph` tool combines three ranking modes: structural graph queries, BM25 text ranking, and a "semantic" mode. That semantic mode (`src/semantic/semantic.c`) is TF-IDF, Random Indexing and API, type and decorator signature matching, combined with a static, pretrained token-to-vector table vendored at `vendored/nomic/` (`code_vectors.bin`, `code_tokens.txt`, about 31MB, consistent with roughly 40,000 tokens times 768 dimensions at one byte each). There is no running embedding model and no external vector database. Graph queries use a read-only Cypher-like subset (`query_graph`). Persistence is local (`vendored/sqlite3`), cached under `~/.cache/codebase-memory-mcp`, overridable with `CBM_CACHE_DIR`. Transport is MCP over stdio (`server.json` lists npm and pypi wrapper packages, transport stdio). It makes no network call of its own accord once installed, per the README. Distribution is a single binary via curl-install, npm, pypi, Homebrew, AUR, Scoop, winget, Chocolatey and Go, plus an optional local 3D graph visualisation UI (`docs/graph-ui-screenshot.png` shows the tool self-indexing its own repository as 23,827 nodes and 51,526 edges).

Sourcebot is TypeScript, a Next.js web app (`packages/web`) plus a backend worker (`packages/backend`). Indexing uses Zoekt (`vendor/zoekt`), Sourcegraph's trigram-index search engine, so it is fast text and symbol search, not a knowledge graph. Symbol definitions and references come from universal ctags at index time plus a search-heuristic query, not a real language server, confirmed in `docs/docs/features/code-navigation.mdx`: "Code navigation is search-based ... we refer to these estimations as search heuristics". Job scheduling runs on BullMQ (`bullmq: ^5.81.3` in `packages/backend/package.json`) against Redis, with Postgres (via Prisma) holding metadata. The shipped `docker-compose.yml` wires three required services, `sourcebot`, `postgres:16` and `redis:8`, so Redis and Postgres are hard dependencies, not optional extras. A Helm chart exists in the separate `sourcebot-dev/sourcebot-helm-chart` repository (pointed to from `docs/docs/deployment/k8s.mdx`). MCP is served over Streamable HTTP at `/api/mcp`, with OAuth 2.0 (paid plans only) or a Bearer API key. The MCP transport itself is licence-gated (`<LicenseKeyRequired feature="The Sourcebot MCP server" />` in `docs/docs/features/mcp-server.mdx`), and the MCP code lives under the licence-gated `packages/web/src/ee/features/chat/` and `packages/web/src/ee/features/oauth/`. Underneath that gate, the same product also exposes a plain public REST API (`docs/api-reference/sourcebot-public.openapi.json`) with `/api/search`, `/api/repos`, `/api/tree`, `/api/source`, `/api/blame`, `/api/diff`, `/api/commits`. None of these paths carry a licence badge in the docs, and `docs/docs/api-reference/authentication.mdx` describes them as usable with a free, self-service API key. Only `/api/find_definitions` and `/api/find_references` map to the licensed "Code navigation" feature.

Neither tool uses SCIP.

## 4. UX

CBM reaches a first result in under a minute with no account. Sourcebot needs real infrastructure and a paid seat before an agent can call it at all.

CBM: one shell command installs a binary, most MCP-capable clients auto-detect it (README, "Auto-Index"), and a mid-sized repository indexes in the background at first tool call. A human never has to look at it. The optional graph-ui gives a human a 3D view of the graph (a sidebar of node and edge types with live counts, a searchable file tree, a large force-directed graph), if they want to see what the agent can see, but this is a debugging aid, not an operational console: no approvals, no run history, no cost view.

Sourcebot: `npx setup-sourcebot` or a manual docker-compose brings up Postgres, Redis and the app, then a human edits `config.json` with repository connections and waits for the first index job. Only then can a human browse code in a normal search web UI, which is free. To let an agent call any MCP tool, a human must additionally create a Sourcebot account, subscribe to Pro, and create an API key or complete the OAuth flow. Docs screenshots show a conventional code-search results page and a chat-style "Ask Sourcebot" panel, both human-facing, with nothing agent-facing below the API and MCP layer itself.

## 5. Security, identity, sandbox, policy, cost

CBM enforces almost nothing in code by default. It trusts the local process that spawns it over stdio. `CBM_ALLOWED_ROOT` is an opt-in path fence, off unless set. `docs/INDEX_RESOURCE_LIMITS.md` shows `index_max_files` and `index_max_source_mb` are similarly off by default, and a run that exceeds an enabled limit fails discovery cleanly instead of publishing a partial graph. There is no account and no credential to steal. Run inside our sandbox, CBM's whole security model reduces to the file-system access the sandbox already controls.

Sourcebot enforces access in code at two levels: per-user repository permissions (when permission syncing is licensed) and a global licence check on paid features. Credentials are a Sourcebot account plus an API key or OAuth grant per human user, held by whichever process calls the API, not scoped to a task. Its default licensing path (`docs/docs/activating-a-subscription.mdx`) requires the deployment to send a "Service Ping" to Sourcebot's own licence server. If that ping fails for 7 days, paid features, including the whole MCP endpoint, downgrade automatically to the free plan. An egress rule for that ping would be a new, vendor-specific exception to our default-deny network policy.

Cost: neither tool has a budget, hold or ledger concept. Sourcebot's only spend cap is a seat count on a subscription.

Given our sandbox holds no network except the gateway, CBM is the one that fits inside that constraint, and it fits by not needing the gateway at all. It is a local process an agent's harness spawns over stdio, so it runs as a sidecar inside the sandbox pod, reading the agent's own git checkout, with zero egress. The marginal cost is a roughly 15 to 30MB binary baked into the worker image, one writable `emptyDir` for its cache, and a CPU and memory burst at session start that its own `CBM_WORKERS` and `index_max_source_mb` settings can bound to fit a pod's resource limits. No new service, no licence, no recurring cost. Sourcebot does not fit the same constraint: it needs a permanently running shared service (its own container plus Postgres plus Redis) that the sandbox would have to reach through the gateway as a proxied MCP tool, and even then the entire MCP surface needs at least one Pro seat at 20 USD per month before any tool call succeeds. Running it on our cluster costs roughly a quarter of one Hetzner cpx42 node by Sourcebot's own "Small, up to 100 repos" sizing guide (2 vCPU, 4GB RAM, 50GB disk), a new Redis or Valkey deployment, a Postgres schema on the existing CloudNativePG cluster, and 20 USD per month minimum, plus the licence server's Service Ping as a new egress exception. The cheaper route, calling Sourcebot's free `/api/search` REST endpoint from a gateway-side adapter instead of its paywalled MCP server (see section 6), avoids the seat cost but still needs the container, Postgres and Redis.

## 6. What we should take from it

Narrow, this month: bake the CBM binary into the agent worker image at build time, where our CI build VM already has broader egress, so the sandboxed runtime pod never needs a network call for it. Mount one writable `emptyDir` for `CBM_CACHE_DIR`, since our pods run a read-only root filesystem. No gateway change and no new egress rule are needed for this.

Narrow: copy CBM's opt-in path fence and size caps (`CBM_ALLOWED_ROOT`, `index_max_files`, `index_max_source_mb`), a cheap fail-closed pattern, but turn them on by default rather than opt-in as CBM ships them.

Narrow: write a thin MCP adapter in `factory-gateway` that calls Sourcebot's free public REST endpoints (`/api/search`, `/api/repos`, `/api/tree`, `/api/source`, `/api/commits`, `/api/diff`) directly. That gets grep-style cross-repo search and browsing on the free Basic plan, skipping Sourcebot's own paywalled MCP transport and a Pro seat entirely. Symbol navigation (`find_symbol_definitions`, `find_symbol_references`) stays paid either way, so this adapter would only cover text and structural search, not go-to-definition.

Narrow: read CBM's `detect_changes` tool (git diff to affected symbols plus a blast radius with a risk classification) as a candidate signal for the path risk classes our verification plane already computes by hand, not a replacement for them.

Narrow: reuse Sourcebot's sizing guide (`docs/docs/deployment/sizing-guide.mdx`), a ready repo-count to CPU, RAM and disk table plus named concurrency settings (`maxRepoIndexingJobConcurrency`, `maxConnectionSyncJobConcurrency`), if we ever run a shared index.

Broad: both projects are a direct answer to a gap we already wrote down ourselves, "no project memory, no codebase index" (`00-our-vision.md`). CBM shows this gap can be closed for close to nothing, a binary inside the sandbox with no new service and no new egress rule. That argues for adopting or building a local, no-network tool first, and reaching for a shared service like Sourcebot only once we need cross-repository search that a single sandbox cannot see on its own.

## 7. Where our philosophy differs and what that costs or buys us

Biggest difference: both tools bind trust to the caller, not the task. CBM has no identity at all. Sourcebot authenticates a human user. Our principle is that identity belongs to the task, through a short-lived ServiceAccount token checked by `factory-gateway`. Neither tool slots into that model as shipped. For CBM this costs us nothing, because it never needs the gateway if it runs inside the sandbox pod itself, next to the harness, as a local process. For Sourcebot, our gateway would have to hold one shared Sourcebot API key and become the actual point of per-task authorisation and audit, with Sourcebot's own per-user permission model doing nothing useful for us.

Second difference: Sourcebot's default subscription path needs a recurring outbound Service Ping to Sourcebot's licence server, a permanent vendor-specific dependency our "no vendor-specific service" constraint is written against. The workaround, staying on the free Basic plan or negotiating an offline licence key by contacting sales, is available, but each drops a feature or adds a manual, support-desk dependency that cuts against re-seedability.

## 8. Red flags and slop assessment

CBM: real, working code. A self-indexing 3D graph of its own 23,827 nodes proves the pipeline runs. The growth pattern is unusual for a one-person project: about 45,000 stars and 3,700 forks inside roughly seven months, about 650 open issues, and a commit history dominated by a single account. The arXiv preprint behind the "semantic search" and token-savings claims (arXiv:2603.27277, submitted 28 March 2026) reports 83 percent answer quality against a 92 percent file-exploring baseline and a 10x token saving, both well short of the project site's own current claims of "about 120x fewer tokens" and 162 supported languages against the paper's 66. "Semantic search" itself is a static, pretrained token-vector table plus algorithmic signals, not a live embedding model, a distinction the README does not make clear until read at the code level. Treat it as a fast-moving solo project, not an organisation, with the bus-factor and support risk that implies.

Sourcebot: a normal open-core product, over two years old, YC-backed, with a changelog that fixes real bugs, for example an infinite pagination loop against Gitea and Forgejo, fixed in v4.16.12. The gating is aggressive: the entire MCP server, not just an advanced feature of it, needs a paid Pro plan, and code navigation is paid too. Forgejo support is unofficial, layered on the `gitea` connector type with a configurable base URL. The maintainers' own changelog entry shows they already work around a Forgejo-specific quirk, so it works today but is not a first-class target, and could drift further as Forgejo's API moves away from Gitea's after v10.

## 9. Sources

- https://github.com/DeusData/codebase-memory-mcp (README.md, LICENSE, server.json, docs/INDEX_RESOURCE_LIMITS.md, src/semantic/semantic.c, vendored/nomic/, docs/graph-ui-screenshot.png, top-level layout), cloned 2026-09-29
- https://github.com/sourcebot-dev/sourcebot (README.md, LICENSE.md, ee/LICENSE, docker-compose.yml, CHANGELOG.md, packages/backend/package.json, packages/backend/src/*.ts, docs/docs/features/mcp-server.mdx, docs/snippets/license-key-required.mdx, docs/docs/deployment/sizing-guide.mdx, docs/docs/deployment/docker-compose.mdx, docs/docs/deployment/k8s.mdx, docs/docs/connections/gitea.mdx, docs/docs/features/code-navigation.mdx, docs/docs/api-reference/authentication.mdx, docs/docs/activating-a-subscription.mdx, docs/api-reference/sourcebot-public.openapi.json, top-level layout), cloned 2026-09-29
- gh api repos/DeusData/codebase-memory-mcp and .../contributors, 2026-09-29
- gh api repos/sourcebot-dev/sourcebot and .../contributors, 2026-09-29
- https://deusdata.github.io/codebase-memory-mcp/ (project site), fetched 2026-09-29
- https://arxiv.org/abs/2603.27277, "Codebase-Memory: Tree-Sitter-Based Knowledge Graphs for LLM Code Exploration via MCP", Vogel et al, submitted 2026-03-28, fetched 2026-09-29
- https://sourcebot.dev, https://docs.sourcebot.dev, https://app.sourcebot.dev, https://sourcebot.dev/changelog, https://sourcebot.dev/pricing, fetched 2026-09-29
- WebSearch: "Sourcebot Taqla Inc Y Combinator seed funding", 2026-09-29
- WebSearch: "codebase-memory-mcp arxiv paper Martin Vogel", 2026-09-29
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md and 01-report-template.md, read 2026-09-29
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md, sections on the gateway and MCP tool servers, read 2026-09-29
