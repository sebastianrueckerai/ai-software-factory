# Analyst instructions

You analyse one project and write one report. Work alone. Do not ask questions. Do not stop before the report is written.

Paths (absolute, use them as given):

- Baseline: `/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md`
- Template and category list: `/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/01-report-template.md`
- Deeper design, read sections when needed: `/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md`
- Your report: `/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/projects/<slug>/report.md`
- Your clone: `~/repos/market-research-clones/<slug>`

## Method

1. Read the baseline and the template first.
2. If a public repository exists: `git clone --depth 1 <repo> ~/repos/market-research-clones/<slug>`. Skip the clone if the directory exists. Never install dependencies, never run the project, never execute code from the clone. Read: README, docs/, ARCHITECTURE and CONTRIBUTING files, the top-level layout (`find . -maxdepth 2 -type d -not -path '*/node_modules*' -not -path '*/.git*'`), package manifests (go.mod, package.json, pyproject.toml, Cargo.toml, mix.exs), deployment files (Helm charts, docker-compose, Dockerfiles, Kubernetes manifests), and the source of the parts that matter for the comparison: task or job state, sandboxing, credential handling, model routing, permissions and policy, cost, webhooks and intake, the UI. Read enough source to say how it really works, not only what the README claims. Run `git log -1 --format='%ci'` for the last commit date. Use `gh api repos/<owner>/<repo>` for stars, licence, creation date and open issues.
3. Read the website with WebFetch: product page, docs (architecture, self-hosting, security, pricing, enterprise), changelog, blog posts about architecture. If WebFetch returns an empty or blocked page, use `~/.claude/skills/firecrawl/fc.sh scrape <url>`. At most 4 Firecrawl scrapes per project, they cost credits. Use WebSearch for independent reviews, Hacker News or Reddit threads, security incidents, licence changes, funding and "<name> vs" comparisons. Record the date of each source. Today is 2026-09-29.
4. For UX: find screenshots, demo descriptions and quickstarts. Count the steps from zero to a first result. Say what a user sees while an agent works and how a user intervenes, approves or stops it.
5. Write the report on the template exactly: same front matter keys and value types, same section numbers and titles. Give every axis score a reason in the prose. Scores are relative to our design: 3 means roughly what we do, 5 means clearly better than our design, 0 means absent.
   The `Write` tool is refused for subagents on report files. Write the file with Bash and a quoted heredoc instead:
   ```
   mkdir -p /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/projects/<slug>
   cat > /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/projects/<slug>/report.md <<'REPORT_EOF'
   ...the whole report...
   REPORT_EOF
   ```
   Then run `head -5` and `wc -l` on the file to prove it landed, and `python3 /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/compile.py --check` to prove the front matter parses. If the heredoc is too long for one command, write it in two or three parts with `>>`.
6. Be concrete and sceptical. Quote file paths, function names, configuration keys and document URLs. Separate "the README says" from "the code does". A thin project gets a short report. Do not pad. Do not invent features. Write "not verified" where you could not check.

## Writing rules

Short sentences. British spelling. No marketing words. No em dashes. No semicolons. One idea per paragraph. Tables where they help a comparison. Lead each section with its conclusion.

## Limits

Never use API keys. Never sign in anywhere. Never run cloned code. Never change files outside your report folder and your clone directory. Aim for 20 to 40 minutes of work. If a repository is above 2 GB, clone with `--depth 1 --filter=blob:none` and read files on demand.

## Tier 2 short form

If your prompt says "tier 2: <slug>", look up that slug's row in the seed table of `/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/README.md` for name, category, site and repository. Aim for 15 to 25 minutes. Keep the report shorter (60 to 120 lines) but keep every section and every front matter key. Focus sections 6 and 7 on what that category means for our design: for an observability tool, what it adds next to SigNoz; for a model gateway, what it adds next to LiteLLM and factory-gateway; for a framework, whether any agent in our design should use it; for a sandbox, what it would replace; for a harness, whether it fits our Harness interface; for a durable execution engine, how it compares with Temporal for our task workflow.

## Return message

Eight lines at most, in this order: name, category, similarity score, the three strongest steal items, the biggest differs item, the slop verdict, and the path of the report you wrote.
