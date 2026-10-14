// The four moments every prototype shows. workingCount is the status figure; working is the card list.
// After item 225 (the lanes collapse): no backlog, no lane moves; a card carries its track (plan or direct) from filing and a working card its stage (planning, building, verifying). Loaded with <script src="../scenarios.js">
// (file:// cannot fetch JSON). Every string is page copy; nothing here is invented
// by a builder. A builder may add plausible detail of the same kinds, never new kinds.
window.SCENARIOS = {
  busy: {
    project: "ai-software-factory-code",
    state: "waiting on you", workingCount: 3, provider: 0, needYou: 2, spend: 61.40, spendToday: 4.82, dayCap: 10, cap: 120, github: "1 open pull request", githubURL: "#",
    pulse: { prominent: true, sentence: "Two cards need your decision; #612's merge carries a migration.",
      bullets: ["Merge PR #612 waits for you: high risk, one migration, the audit found a missing default.",
                "#603 asks which store the session table should use; the plan said Postgres.",
                "Three cards work; #601 is at 86 percent of its budget."] },
    needs: [
      { kind: "merge", pr: 612, task: "t-0b7d3e9a4c21", issue: 612, title: "Ledger: the month cap per project", since: "1 h 10 min",
        risk: "high", migration: true, migrations: ["internal/factoryd/migrations/0031_month_cap.sql"],
        review: { verdict: "approve", summary: "Adds the column safely.", findings: [] },
        earlier: [{ verdict: "concerns", summary: "the column lacked a default", findings: ["0031_month_cap.sql: add a default"] }],
        audit: { verdict: "findings", model: "review", findings: [{ item: "a default is missing on the new column", file: "internal/factoryd/migrations/0031_month_cap.sql", line: 4, why: "a NULL month cap would read as zero" }] },
        recommendation: "Adds the column; merge it.",
        whyHuman: ["the project's merge rule is human", "risk class high is requires_approval"] },
      { kind: "escalation", task: "t-7c1e55a2d9f0", issue: 603, title: "Which store for the session table?", since: "35 min",
        status: "waiting on a human", elapsed: "1 h 2 min in all", spent: 0.46, budget: 2.00, model: "coding-cheap",
        question: "Which store should the session table use? The plan named Postgres; the brief allows SQLite for a single replica.",
        choices: ["Postgres", "SQLite", "Ask the author"], capped: false, alert: 31 }
    ],
    queued: [
      { issue: 455, task: "t-4c2559f5cb07", title: "Live check: close (Stage 16, 3.4)", status: "queued", elapsed: "53 h 1 min in all", spent: 0, budget: 2, activity: "filed by sebastian via chat at 16:01, direct" },
      { issue: 178, task: "t-9d2a71c0e4b3", title: "Console: show the configuration version", status: "queued", elapsed: "347 h 40 min in all", spent: 0, budget: 2, activity: "filed by controller via chat at 07:08, direct", accent: "teal" },
      { issue: 620, task: "t-1f8e4b6a2c75", title: "Costs read: a from and a to date", status: "waiting on dependencies", elapsed: "2 h 14 min in all", spent: 0, budget: 2, blocked: 2, blockedOn: "#612, #609" },
      { issue: 621, task: "t-5a3c9e1d7b40", title: "Export in pull request mode", status: "queued", elapsed: "48 min in all", spent: 0, budget: 2, fromPlan: 558 }
    ],
    working: [
      { issue: 601, task: "t-e02e56a2c488", title: "Console: the drawer's Overview top block", status: "running", stage: "building", track: "direct", elapsed: "23 min", checks: "3/4", spent: 1.72, budget: 2, near: true, model: "coding-cheap", activity: "Reading internal/console/board.go…" },
      { issue: 598, task: "t-b8a1d5f1612a", title: "GitHub sync pulls a card", status: "running", stage: "building", track: "direct", elapsed: "41 min", spent: 0.63, budget: 2, model: "coding-frontier", activity: "Running go test ./internal/console" },
      { issue: 611, task: "t-a4b58737c1bc", title: "Plan: the members page and the approvers", status: "running", stage: "planning", track: "plan", elapsed: "8 min", spent: 0.11, budget: 5, model: "coding-frontier", activity: "Reading docs/plans/2026-10-14-lane-collapse.md" }
    ],
    verifying: [
      { issue: 612, task: "t-0b7d3e9a4c21", title: "Ledger: the month cap per project", status: "in review", stage: "verifying", elapsed: "2 h 30 min", checks: "4/4", pr: 612, spent: 1.08, budget: 2, model: "coding-frontier", activity: "review by factoryd at 14:02: approve" },
      { issue: 609, task: "t-3e7b2c9f5a18", title: "Pulse: a provider budget alert", status: "in review", stage: "verifying", gate: "merge queue", gateAge: "6 min", elapsed: "1 h 51 min", checks: "4/4", pr: 609, spent: 0.84, budget: 2, model: "coding-cheap", activity: "merge queue: behind #612" }
    ],
    done: [
      { issue: 490, title: "README.md: extend the intro", status: "done", elapsed: "29 min in all", spent: 0.01, budget: 2, at: "15:32" },
      { issue: 616, title: "Chat form: center the Send button", status: "done", elapsed: "32 min in all", spent: 0.01, budget: 2, at: "20:37" },
      { issue: 610, title: "Fresh-context and aged-read acceptance tests", status: "done", elapsed: "1 h 8 min in all", spent: 0.18, budget: 2, at: "20:30" },
      { issue: 607, title: "Live check 3.11: split pre-check", status: "failed", elapsed: "1 h 13 min in all", spent: 0.20, budget: 2, at: "20:21", reason: "acceptance/big_table_test.go alone changes 506 lines, over the bound 400" },
      { issue: 608, title: "Console polish: clamp board chip objectives", status: "done", elapsed: "15 min in all", spent: 0.04, budget: 2, at: "19:30" },
      { issue: 604, title: "Members page", status: "done", elapsed: "52 min in all", spent: 0.31, budget: 2, at: "18:12" },
      { issue: 599, title: "Alerts: verdict buttons", status: "closed", elapsed: "3 h 2 min in all", spent: 0.09, budget: 2, at: "17:40" },
      { issue: 597, title: "Timeline: the gates meter", status: "done", elapsed: "44 min in all", spent: 0.12, budget: 2, at: "16:55" }
    ],
    chat: [
      { who: "you", at: "14:21", text: "Why is #603 waiting?" },
      { who: "agent", at: "14:21", text: "#603 asked which store the session table should use. The plan named Postgres; the brief allows SQLite for a single replica. I can answer Postgres for you.",
        tools: [{ name: "read card #603", args: "{\"id\":\"t-7c1e55a2d9f0\"}", result: "waiting on a human since 13:46: Which store should the session table use?", duration: "0.4 s" }],
        proposal: { title: "I will:", changes: ["answer #603 with Postgres", "move #620 to ready"], detail: "answer posts on issue #603 as sebastian; the move is a lane start" } }
    ],
    drawer: {
      card: { issue: 601, task: "t-e02e56a2c488", title: "Console: the drawer's Overview top block", status: "running", stage: "building", track: "direct", elapsed: "23 min", checks: "3/4", spent: 1.72, budget: 2, model: "coding-cheap" },
      overview: {
        task: "Give the drawer's Overview a four-line top block: task, status, budget and agent.",
        status: "running for 23 min, in checks 3 of 4",
        budget: "€1.72 of €2.00, 86 percent",
        agent: "coding-cheap (qwen3.8-flash)",
        objective: "Give the drawer's Overview a four-line top block: task, status, budget and agent. Below it, open, the one thing that needs the member, if any. Then collapsed sections: the objective, the agent's summary, the plan, reviews and audit, related cards, edit, links. Roadmap item 177.",
        provenance: "filed by sebastian via the console at 13:58, lane ready",
        summary: "Added the top block as a definition list in drawer.html and the collapsed sections as details elements; the Overview test reads the four lines. One check left: the parity test of the chat's drawer read.",
        related: [{ why: "depends on", issue: 598, title: "GitHub sync pulls a card", status: "running" }, { why: "part of", issue: 558, title: "Plan: the console's next round", status: "done" }]
      },
      gates: [{ gate: "intake", attempt: 1, start: "13:58:04", duration: "2 s", outcome: "passed" }, { gate: "checks", attempt: 1, start: "14:19:40", duration: "1 min 12 s", outcome: "running" }],
      steps: [
        { time: "13:58:04", step: "intake", detail: "issue #601 by sebastian" }, { time: "13:58:09", step: "session_started", detail: "s-91f2 coding-cheap" },
        { time: "14:02:31", step: "tool", detail: "read internal/console/drawer.html" }, { time: "14:11:08", step: "tool", detail: "edit internal/console/templates/drawer.html" },
        { time: "14:19:40", step: "checks", supervisor: "", detail: "go vet, go test ./internal/console 3 of 4 passed" }, { time: "14:21:02", step: "tool", detail: "read internal/console/board.go" }
      ],
      files: [{ file: "internal/console/templates/drawer.html", change: "modified", added: 38, deleted: 12 }, { file: "internal/console/board.go", change: "modified", added: 21, deleted: 4 }, { file: "internal/console/drawer_test.go", change: "added", added: 64, deleted: 0 }],
      session: { n: 2, model: "coding-cheap", outcome: "running",
        said: [{ who: "agent", at: "14:11", text: "The top block is in place as a definition list. Running the Overview test next." }, { who: "sebastian", at: "14:13", text: "Keep the budget line muted under 80 percent." }, { who: "agent", at: "14:14", text: "Done: the budget line takes the muted class until 80 percent, then the warning sign." }] }
    }
  },
  idle: {
    project: "ai-software-factory-code",
    state: "idle", workingCount: 0, provider: 0, needYou: 0, spend: 144.16, spendToday: 0.39, dayCap: 10, cap: 120, github: "", githubURL: "",
    pulse: { prominent: false, sentence: "Factory is idle with no active work; spend of €144.16 has exceeded the monthly budget of €120.00.",
      bullets: ["Nothing runs and nothing waits for you.", "Two queued cards wait for the month cap to clear: #455 and #178.", "The month cap is passed; new sessions wait until it is raised or the month turns."] },
    needs: [],
    queued: [
      { issue: 455, task: "t-4c2559f5cb07", title: "Live check: close (Stage 16, 3.4)", status: "queued", elapsed: "53 h 1 min in all", spent: 0, budget: 2, activity: "filed by sebastian via chat at 16:01, direct" },
      { issue: 178, task: "t-9d2a71c0e4b3", title: "Console: show the configuration version", status: "queued", elapsed: "347 h 40 min in all", spent: 0, budget: 2, activity: "filed by controller via chat at 07:08, direct" }
    ],
    working: [], verifying: [],
    doneCount: 139,
    done: [
      { issue: 490, title: "README.md: extend the intro", status: "done", elapsed: "29 min in all", spent: 0.01, budget: 2, at: "15:32" },
      { issue: 616, title: "Chat form: center the Send button", status: "done", elapsed: "32 min in all", spent: 0.01, budget: 2, at: "20:37" },
      { issue: 610, title: "Fresh-context and aged-read acceptance tests, the five defects fixed", status: "done", elapsed: "1 h 8 min in all", spent: 0.18, budget: 2, at: "20:30" },
      { issue: 607, title: "Live check 3.11: split pre-check runs on the parent diff", status: "failed", elapsed: "1 h 13 min in all", spent: 0.20, budget: 2, at: "20:21" },
      { issue: 608, title: "Console polish: clamp board chip objectives, theme the scrollbar", status: "done", elapsed: "15 min in all", spent: 0.04, budget: 2, at: "19:30" },
      { issue: 604, title: "Members page", status: "done", elapsed: "52 min in all", spent: 0.31, budget: 2, at: "18:12" },
      { issue: 603, title: "Session store: Postgres", status: "done", elapsed: "2 h 4 min in all", spent: 0.92, budget: 2, at: "17:58" },
      { issue: 599, title: "Alerts: verdict buttons", status: "closed", elapsed: "3 h 2 min in all", spent: 0.09, budget: 2, at: "17:40" },
      { issue: 598, title: "GitHub sync pulls a card", status: "done", elapsed: "1 h 30 min in all", spent: 0.77, budget: 2, at: "16:20" },
      { issue: 597, title: "Timeline: the gates meter", status: "done", elapsed: "44 min in all", spent: 0.12, budget: 2, at: "16:55" },
      { issue: 593, title: "GitHub sync pull requests file a card", status: "done", elapsed: "2 h 12 min in all", spent: 0.55, budget: 2, at: "11:03" },
      { issue: 588, title: "Members: invite by Forgejo login", status: "done", elapsed: "58 min in all", spent: 0.28, budget: 2, at: "09:41" }
    ],
    chat: [],
    drawer: null
  },
  fire: {
    project: "ai-software-factory-code",
    state: "waiting on you", workingCount: 1, provider: 2, needYou: 1, spend: 97.20, spendToday: 9.71, dayCap: 10, cap: 120, github: "1 open pull request", githubURL: "#",
    pulse: { prominent: true, sentence: "The model provider refuses every call since 13:22; two cards wait on it and #538 is at its cap.",
      bullets: ["LiteLLM answers 429 from the provider's account budget; nothing can run until it is raised.", "#538 burned its budget on failed calls and asks for a decision.", "#531 has had no event for 40 minutes.", "Two cards failed today: #607 and #535."] },
    needs: [
      { kind: "escalation", task: "t-62d8f0a1b3c4", issue: 538, title: "Routing: schemasync, templateupdate and github through FileFactoryPRTask", since: "2 h 5 min",
        status: "waiting on a human", elapsed: "6 h 40 min in all", spent: 1.92, budget: 2.00, near: true, model: "coding-cheap", capped: true, alert: 44,
        question: "The session cap fired after five attempts; the acceptance tests are written and pass. Another answer grants one more session of the same agent.", choices: [] }
    ],
    queued: [
      { issue: 455, task: "t-4c2559f5cb07", title: "Live check: close (Stage 16, 3.4)", status: "queued", elapsed: "53 h 1 min in all", spent: 0, budget: 2 },
      { issue: 540, task: "t-7788aa11bb22", title: "A capped verification card closes on attested evidence", status: "queued", elapsed: "12 min in all", spent: 0, budget: 2 }
    ],
    working: [
      { issue: 531, task: "t-0f1e2d3c4b5a", title: "Console: the Close action's live check", status: "running", stage: "building", elapsed: "1 h 48 min", spent: 0.41, budget: 2, model: "coding-cheap", activity: "Running bash check", stale: true, staleText: "nothing for 40 min" },
      { issue: 516, task: "t-9988776655aa", title: "Pulse: the provider budget margin", status: "running", stage: "building", elapsed: "2 h 2 min", spent: 1.95, budget: 2, near: true, model: "coding-frontier", provider: true, activity: "waiting on the model provider since 13:22 (429 budget exhausted)" },
      { issue: 537, task: "t-5544332211bb", title: "Members: the approver list", status: "running", stage: "building", elapsed: "1 h 15 min", spent: 0.22, budget: 2, model: "coding-cheap", provider: true, activity: "waiting on the model provider since 13:24" }
    ],
    verifying: [
      { issue: 612, task: "t-0b7d3e9a4c21", title: "Ledger: the month cap per project", status: "in review", stage: "verifying", elapsed: "2 h 30 min", checks: "2/4", pr: 612, spent: 1.08, budget: 2, model: "coding-frontier", activity: "checks: go test ./acceptance failed" }
    ],
    done: [
      { issue: 607, title: "Live check 3.11: split pre-check", status: "failed", elapsed: "1 h 13 min in all", spent: 0.20, budget: 2, at: "20:21", reason: "acceptance/big_table_test.go alone changes 506 lines, over the bound 400" },
      { issue: 535, title: "Gateway: the second provider", status: "failed", elapsed: "3 h 50 min in all", spent: 2.00, budget: 2, at: "13:40", reason: "budget_exceeded after the provider's 429" },
      { issue: 490, title: "README.md: extend the intro", status: "done", elapsed: "29 min in all", spent: 0.01, budget: 2, at: "15:32" },
      { issue: 608, title: "Console polish: clamp board chip objectives", status: "done", elapsed: "15 min in all", spent: 0.04, budget: 2, at: "19:30" }
    ],
    chat: [
      { who: "you", at: "13:40", text: "What is going on?" },
      { who: "agent", at: "13:40", text: "The provider's account budget is exhausted: every model call since 13:22 came back 429. #516 and #537 wait on it, #535 failed on it, and #538 is at its session cap and asks you. Raising the budget in the provider's console unblocks the waiting cards; #538 needs your answer either way.",
        tools: [{ name: "read board", args: "{}", result: "1 working, 2 on the provider, 1 needs you, 2 failed today", duration: "0.3 s" }, { name: "read alerts", args: "{\"limit\":5}", result: "44 escalation #538; 43 session supervisor #535 budget_exceeded", duration: "0.5 s" }] }
    ],
    drawer: null
  },
  quiet: {
    project: "ai-software-factory-code",
    state: "working", workingCount: 1, provider: 0, needYou: 0, spend: 4.10, spendToday: 0.31, dayCap: 10, cap: 120, github: "0 open pull requests", githubURL: "#",
    pulse: { prominent: false, sentence: "One card is working; nothing needs you.", bullets: ["#622 started 6 minutes ago on the costs read's date window.", "Three cards finished this morning.", "Spend this month is €4.10 of €120."] },
    needs: [], queued: [],
    working: [{ issue: 622, task: "t-c0ffee123456", title: "Costs read: a from and a to date", status: "running", stage: "building", elapsed: "6 min", spent: 0.08, budget: 2, model: "coding-cheap", activity: "Reading internal/console/ledger.go" }],
    verifying: [],
    done: [
      { issue: 620, title: "Costs page: the date window form", status: "done", elapsed: "38 min in all", spent: 0.22, budget: 2, at: "09:12" },
      { issue: 619, title: "Timeline: the gates meter label", status: "done", elapsed: "19 min in all", spent: 0.06, budget: 2, at: "08:40" },
      { issue: 618, title: "README: the lab", status: "done", elapsed: "12 min in all", spent: 0.03, budget: 2, at: "08:20" }
    ],
    chat: [{ who: "you", at: "09:30", text: "Morning. Anything for me?" }, { who: "agent", at: "09:30", text: "Nothing waits for you. #622 is working on the costs read's date window and three cards finished this morning. Spend is €4.10 of €120." }],
    drawer: null
  }
};
