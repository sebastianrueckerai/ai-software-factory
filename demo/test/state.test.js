const test = require("node:test");
const assert = require("node:assert/strict");
const s = require("../lib/state");
const now = new Date("2026-10-20T12:00:00Z");

test("id is stable", () => assert.equal(s.id(12), s.id(12)));
test("id is t- and the first 12 hex digits of sha256 of 'lab <issue>'", () => {
  assert.equal(s.id(606), "t-9ba60dca9668");
  assert.equal(s.id(12), "t-4e4c15ef3f52");
});
test("card ages from now", () => {
  const c = s.card(now, { issue: 12, status: "running", lane: "ready", age: 3600, title: "Waitlist", body: "." });
  assert.equal(c.CreatedAt, "2026-10-20T11:00:00.000Z");
  assert.equal(c.Repository, "nord/booking");
  assert.equal(c.Kind, "agent");
});
test("card is flat and takes its defaults", () => {
  const c = s.card(now, {
    issue: 12, status: "waiting-human", lane: "ready", age: 7200, title: "Waitlist", body: "Members ask.",
    gate: "human", gateSince: 600, escalation: s.AGENT_ASKS + "Which?", choices: ["a", "b"], escalatedAt: 300, attempts: 2, spent: 1.5,
  });
  assert.equal(c.ID, s.id(12));
  assert.equal(c.Objective, "Waitlist\n\nMembers ask.");
  assert.equal(c.Size, "small");
  assert.equal(c.BudgetEUR, 3);
  assert.equal(c.Process, "spec");
  assert.equal(c.SpentEUR, 1.5);
  assert.equal(c.GateSince, "2026-10-20T11:50:00.000Z");
  assert.equal(c.EscalatedAt, "2026-10-20T11:55:00.000Z");
  assert.equal(c.Escalation, "The agent asks: Which?");
  assert.deepEqual(c.Choices, ["a", "b"]);
  assert.deepEqual(c.Usage, { Attempts: 2 });
  assert.equal("FinishedAt" in c, false);
});
test("a finished card carries FinishedAt", () => {
  const c = s.card(now, { issue: 5, status: "done", lane: "ready", age: 7200, title: "t", body: "b", finished: 3600 });
  assert.equal(c.FinishedAt, "2026-10-20T11:00:00.000Z");
});
test("scene fills every timeline", () => {
  const sc = s.scene(now, { tasks: [s.card(now, { issue: 12, status: "backlog", lane: "backlog", age: 60, title: "x", body: "y" })] });
  assert.ok(`sessions/${s.id(12)}/timeline.jsonl` in sc.Objects);
  assert.equal(sc.Project.Repository, "nord/booking");
});
test("scene keeps a given timeline", () => {
  const id = s.id(12);
  const sc = s.scene(now, {
    tasks: [s.card(now, { issue: 12, status: "running", lane: "ready", age: 60, title: "x", body: "y" })],
    objects: { [`sessions/${id}/timeline.jsonl`]: "kept" },
  });
  assert.equal(sc.Objects[`sessions/${id}/timeline.jsonl`], "kept");
});
test("reply chunks", () => {
  assert.deepEqual(s.reply(s.say("hi"), s.call("new_card", { title: "t" })),
    [{ Say: "hi" }, { Call: [["new_card", '{"title":"t"}']] }]);
});
test("timeline of a pushed session", () => {
  const start = 7200;
  const rows = s.timeline(now, start, { alias: "small", failed: "lint" }).trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows.map((r) => r.step), ["intake", "session_start", "session_end", "pushed", "checks"]);
  assert.equal(rows[1].time, "2026-10-20T10:01:00Z");
  assert.equal(rows[1].model, "small");
  const checks = rows[4];
  assert.equal(checks.state, "failure");
  assert.deepEqual(checks.jobs.map((j) => j.status), ["success", "success", "failure", "success"]);
});
test("timeline appends raw steps at their offset", () => {
  const rows = s.timeline(now, 7200, { steps: [{ at: 3000, step: "model_review", verdict: "approve", round: 1 }] }).trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows, [{ step: "model_review", verdict: "approve", round: 1, time: "2026-10-20T10:50:00Z" }]);
});
test("transcript rows", () => {
  const start = 7200;
  const rows = s.transcript(now, start, [
    { at: 5, kind: "model_call", text: "hm", cost: 0.02 },
    { at: 9, kind: "tool_call", tool: "bash" },
  ]).trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows, [
    { time: "2026-10-20T10:00:05Z", kind: "model_call", detail: { text: "hm", cost: 0.02 } },
    { time: "2026-10-20T10:00:09Z", kind: "tool_call", detail: { tool: "bash" } },
  ]);
});
test("status event", () => {
  assert.deepEqual(s.status(now, 12, "running", "session", 60), {
    At: "2026-10-20T11:59:00.000Z", TaskID: s.id(12), IssueNumber: 12, Kind: "task_status", Actor: "factoryd", Via: "factoryd",
    Detail: { status: "running", gate: "session" },
  });
});
test("approval refuses an empty brief or detail", () => {
  assert.throws(() => s.approval(now, { id: 1, kind: "merge", task: 12, reason: "r", age: 1, brief: "", detail: "d" }), /brief/);
  const a = s.approval(now, { id: 1, kind: "merge", task: 12, pr: 7, reason: "r", age: 60, brief: "b", detail: "d" });
  assert.equal(a.Project, "nord/booking");
  assert.equal(a.Status, "pending");
  assert.equal(a.PRNumber, 7);
});
test("ask carries the verbatim result and the tool's own arguments", () => {
  const m = s.ask(now, { question: "Mail or app?", choices: ["Mail", "App"], age: 60 });
  assert.equal(m.kind, "ask");
  assert.equal(m.tool_calls[0].result, "Asked the member; this turn ends. A press or their next message answers it.");
  assert.equal(m.tool_calls[0].arguments, '{"ask":"Mail or app?","choices":["Mail","App"]}');
});
test("two asks of one text at two ages have two call ids", () => {
  const a = s.ask(now, { question: "Mail or app?", choices: ["Mail", "App"], age: 60 });
  const b = s.ask(now, { question: "Mail or app?", choices: ["Mail", "App"], age: 30 });
  assert.equal(a.tool_calls[0].id, "ask-3ab7b50e");
  assert.equal(b.tool_calls[0].id, "ask-e387d31e");
});
test("cardFiling describes the filing as the console does", () => {
  const args = { title: "Waitlist", body: "Members join.", lane: "ready", size: "medium", acceptance: ["a", "b"] };
  const p = s.cardFiling(now, args);
  assert.equal(p.Tool, "new_card");
  assert.deepEqual(p.Args, args);
  assert.equal(p.Description, "File a card, title Waitlist, body Members join., lane ready, size medium, acceptance a; b");
});
test("cardFiling cuts a field at 120 bytes on a character boundary", () => {
  const p = s.cardFiling(now, { title: "t", body: "x".repeat(119) + "äy", lane: "plan" });
  assert.equal(p.Description, `File a card, title t, body ${"x".repeat(119)}…, lane plan`);
});
test("pressed is the do- row of the proposal's call", () => {
  const p = { Token: "labABCDEFGHIJKLMN", Tool: "new_card", Args: { title: "t" } };
  assert.deepEqual(s.pressed(now, p, { age: 5, result: "Filed nord/booking#101 in lane ready. It cannot be undone." }), {
    role: "assistant", content: "", at: "2026-10-20T11:59:55.000Z",
    tool_calls: [{ id: "do-labABCDEFGHI", name: "new_card", arguments: '{"title":"t"}', read_at: "2026-10-20T11:59:55.000Z",
      result: "Filed nord/booking#101 in lane ready. It cannot be undone." }],
  });
});
test("filedThread is the member's line, the proposing reply and the Do it's row", () => {
  const args = { title: "t", lane: "ready" };
  const token = "lab9f848efee1198e7200730a5f249d5091c4423c04";
  const f = s.filedThread(now, { said: "s", reply: "r", args, issue: 101, age: 10 });
  assert.equal(f.proposal.Token, token);
  assert.deepEqual(f.rows, [
    { role: "user", content: "s", at: "2026-10-20T11:59:50.000Z" },
    {
      role: "assistant", content: "r", at: "2026-10-20T11:59:51.000Z",
      tool_calls: [{ id: "call_1", name: "new_card", arguments: '{"title":"t","lane":"ready"}', read_at: "2026-10-20T11:59:51.000Z", proposal: token,
        result: "Proposed to sebastian: File a card, title t, lane ready. Nothing runs until they press Do it." }],
    },
    {
      role: "assistant", content: "", at: "2026-10-20T11:59:53.000Z",
      tool_calls: [{ id: "do-lab9f848efee", name: "new_card", arguments: '{"title":"t","lane":"ready"}', read_at: "2026-10-20T11:59:53.000Z",
        result: "Filed nord/booking#101 in lane ready. It cannot be undone." }],
    },
  ]);
});
test("seen marks each thread read to its newest row, rows numbered by place", () => {
  const chat = [{ conversation: 1 }, { conversation: 1 }, { conversation: 2 }, {}, { conversation: 2 }];
  assert.deepEqual(s.seen(chat), { 1: 4, 2: 5 });
});
test("plan is the revision as the planner stores it, its digest over the plan's JSON", () => {
  const cards = [{ key: "a", role: "foundation", title: "A", size: "small", depends_on: [] }];
  const p = s.plan(now, { issue: 105, age: 600, summary: "Two cards.", cards });
  assert.deepEqual(p, {
    TaskID: s.id(105), Revision: 1, Plan: { summary: "Two cards.", cards },
    SHA256: "32be0c1ecafdaf64b015041dd019f5d3e81403c8ee2e5110db5aabba055cf64d", CreatedAt: "2026-10-20T11:50:00.000Z",
  });
  assert.equal(s.plan(now, { issue: 105, revision: 2, age: 60, summary: "x", cards: [] }).Revision, 2);
});
test("scene keeps the plans by task, oldest first, and the questions by task and revision", () => {
  const one = s.plan(now, { issue: 105, age: 600, summary: "one", cards: [] });
  const two = s.plan(now, { issue: 105, revision: 2, age: 60, summary: "two", cards: [] });
  const other = s.plan(now, { issue: 7, age: 60, summary: "other", cards: [] });
  const sc = s.scene(now, {
    plans: [one, other, two],
    questions: [{ issue: 105, revision: 2, text: "Mail them?", choices: ["Yes", "No"] }, { issue: 105, revision: 2, text: "When?", choices: ["Now", "Later"] }],
  });
  assert.deepEqual(sc.Plans, { [s.id(105)]: [one, two], [s.id(7)]: [other] });
  assert.deepEqual(sc.Questions, { [`${s.id(105)} 2`]: [{ text: "Mail them?", choices: ["Yes", "No"] }, { text: "When?", choices: ["Now", "Later"] }] });
  assert.equal("Plans" in s.scene(now, {}), false);
  assert.equal("Questions" in s.scene(now, {}), false);
});
test("proposal expires after its ttl and its call names the token", () => {
  const p = s.proposal(now, { tool: "steer", args: { task_id: "t-1" }, description: "Message a card", ttl: 1800 });
  assert.equal(p.ExpiresAt, "2026-10-20T12:30:00.000Z");
  assert.equal(p.Kind, "proposal");
  const c = s.proposedCall(now, p, { id: "call_1", age: 5 });
  assert.equal(c.proposal, p.Token);
  assert.equal(c.result, "Proposed to sebastian: Message a card. Nothing runs until they press Do it.");
});
test("a card admitted after its creation carries AdmittedAt", () => {
  const c = s.card(now, { issue: 117, status: "running", lane: "ready", age: 7200, title: "t", body: "b", admitted: 600 });
  assert.equal(c.AdmittedAt, "2026-10-20T11:50:00.000Z");
});
test("timeline stamps a gate step's from as started and leaves out a step after now", () => {
  const rows = s.timeline(now, 600, {
    steps: [
      s.modelReview(300, 420, { pr: 214, commit: "2d7f0b9", verdict: "concerns", summary: "race", findings: ["cancel.ts:48"] }),
      s.sessionStart(700, { session: "s-2", model: "big", attempt: 2 }),
    ],
  }).trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows, [{
    step: "model_review", pr: 214, commit: "2d7f0b9", model: "big", verdict: "concerns", summary: "race", findings: ["cancel.ts:48"], round: 1,
    time: "2026-10-20T11:57:00Z", started: "2026-10-20T11:55:00Z",
  }]);
});
test("findings sent to a stronger model", () => {
  const rows = s.timeline(now, 3600, { steps: [s.findings(1900, { stage: "checks", to: "stronger", attempt: 1, list: ["acceptance failed"] })] })
    .trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows, [
    { step: "stage_findings", stage: "checks", round: 1, to: "stronger", attempt: 1, findings: ["acceptance failed"], time: "2026-10-20T11:31:40Z" },
  ]);
});
test("session is its start, its end and its push; one that did not push has no push", () => {
  const rows = s.timeline(now, 3600, { steps: s.session(60, 1800, { n: 2, model: "big", commit: "e5a3c18" }) }).trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows, [
    { step: "session_start", session: "s-2", model: "big", attempt: 2, time: "2026-10-20T11:01:00Z" },
    { step: "session_end", session: "s-2", attempt: 2, outcome: "pushed", time: "2026-10-20T11:30:00Z", started: "2026-10-20T11:01:00Z" },
    { step: "pushed", session: "s-2", commit: "e5a3c18", time: "2026-10-20T11:30:05Z" },
  ]);
  assert.deepEqual(s.session(60, 900, { model: "small", outcome: "redirect" }).map((r) => r.step), ["session_start", "session_end"]);
});
test("timeline puts the steps in time order", () => {
  const rows = s.timeline(now, 900, { steps: [s.supervisor(840, { detector: "flip_flop" }), s.sessionStart(60, { model: "small" })] })
    .trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows.map((r) => r.step), ["session_start", "supervisor"]);
});
test("supervisor names the detector, the decision and the reason", () => {
  const rows = s.timeline(now, 900, { steps: [s.supervisor(840, { detector: "flip_flop", trip: "t", decision: "redirect", reason: "r" })] })
    .trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows, [{ step: "supervisor", session: "s-1", detector: "flip_flop", trip: "t", decision: "redirect", reason: "r", time: "2026-10-20T11:59:00Z" }]);
});
test("transcript leaves out a row not said yet", () => {
  const rows = s.transcript(now, 600, [s.said(300, "said"), s.said(601, "later")]).trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows, [{ time: "2026-10-20T11:55:00Z", kind: "model_call", detail: { text: "said", cost: 0.02 } }]);
});
test("steering describes the steer as the console does", () => {
  const p = s.steering(now, { issue: 122, title: "Payments: refund", text: "Use the id" });
  assert.equal(p.Tool, "steer");
  assert.deepEqual(p.Args, { task_id: "t-47db29d200e1", text: "Use the id" });
  assert.equal(p.Description, 'Message a running card, #122 t-47db29d200e1 "Payments: refund", text Use the id');
});
test("steeredThread ends in the Do it's row with the steer's result", () => {
  const f = s.steeredThread(now, { said: "tell it", reply: "r", issue: 122, title: "Payments: refund", text: "Use the id", age: 10 });
  assert.deepEqual(f.rows.map((m) => [m.role, m.content, m.at]), [
    ["user", "tell it", "2026-10-20T11:59:50.000Z"], ["assistant", "r", "2026-10-20T11:59:51.000Z"], ["assistant", "", "2026-10-20T11:59:53.000Z"],
  ]);
  assert.equal(f.rows[1].tool_calls[0].proposal, f.proposal.Token);
  assert.equal(f.rows[2].tool_calls[0].result, "The session of #122 has your message. It cannot be undone.");
});
test("scene keys a pull request's files by their Forgejo path", () => {
  const sc = s.scene(now, { prFiles: { 203: [{ filename: "a.ts", status: "modified", additions: 1, deletions: 0 }] } });
  assert.deepEqual(sc.PRFiles, { "/api/v1/repos/nord/booking/pulls/203/files": '[{"filename":"a.ts","status":"modified","additions":1,"deletions":0}]' });
});
test("metrics report is the nord-booking window", () => {
  const m = s.metrics(now);
  assert.equal(m.repository, "nord/booking");
  assert.equal(m.to, "2026-10-20T12:00:00.000Z");
  assert.equal(m.from, "2026-09-23T12:00:00.000Z");
  assert.equal(m.deploys.value, 23);
});
test("a card filed by someone else is no writer's, and carries its alert and its chain", () => {
  const c = s.card(now, {
    issue: 119, status: "merged", lane: "ready", age: 60, title: "t", body: "b", author: "factory-agent", source: "alert",
    fingerprint: "e07c4a92d15b8f3e", chain: "pending",
  });
  assert.deepEqual([c.Author, c.AuthorWriter, c.Source, c.AlertFingerprint, c.ChainState], ["factory-agent", false, "alert", "e07c4a92d15b8f3e", "pending"]);
  const own = s.card(now, { issue: 12, status: "queued", lane: "ready", age: 60, title: "t", body: "b" });
  assert.deepEqual([own.Author, own.AuthorWriter, "AlertFingerprint" in own, "ChainState" in own], ["sebastian", true, false, false]);
});
test("a merge is the queue's turn, factory-merge's merge, its event and the card's end at merged", () => {
  const steps = [
    s.queueTurn(600, 1200), s.merged(1200, 1260, { pr: 201, commit: "4be1c07" }),
    s.recorded(1260, "pull_request_merged", { pr: 201, by: "factory-merge" }), s.final(1260, "merged", "pull request merged"),
  ];
  const rows = s.timeline(now, 3600, { steps }).trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows, [
    { step: "queue_turn", project: "nord/booking", time: "2026-10-20T11:20:00Z", started: "2026-10-20T11:10:00Z" },
    { step: "merged", pr: 201, commit: "4be1c07", approver: "sebastian", merged_by: "factory-merge", time: "2026-10-20T11:21:00Z", started: "2026-10-20T11:20:00Z" },
    { step: "event", event: "pull_request_merged", pr: 201, by: "factory-merge", time: "2026-10-20T11:21:00Z" },
    { step: "final", state: "merged", reason: "pull request merged", time: "2026-10-20T11:21:00Z" },
  ]);
});
test("poke is factoryd's inbox row about a card", () => {
  assert.deepEqual(s.poke(now, { issue: 108, content: "#108 merged; the chain is running.", age: 60, birth: "pull_request_merged", conversation: 2 }), {
    role: "assistant", content: "#108 merged; the chain is running.", at: "2026-10-20T11:59:00.000Z", kind: "poke", conversation: 2,
    task_id: s.id(108), birth_kind: "pull_request_merged",
  });
});
test("nextCron is the first time strictly after from", () => {
  const from = new Date("2026-10-20T12:00:00Z");
  assert.equal(s.nextCron("0 2 * * *", from).toISOString(), "2026-10-21T02:00:00.000Z");
  assert.equal(s.nextCron("0 6 * * 1", from).toISOString(), "2026-10-26T06:00:00.000Z");
  assert.equal(s.nextCron("0 8 1 * *", from).toISOString(), "2026-11-01T08:00:00.000Z");
  assert.equal(s.nextCron("0 2 * * *", new Date("2026-10-21T02:00:00Z")).toISOString(), "2026-10-22T02:00:00.000Z");
});
test("routineRun is a run as the routines' store keeps it; an open one has no end", () => {
  const due = new Date("2026-09-24T02:00:00Z");
  assert.deepEqual(s.routineRun("security-scan", { run: 55, due, ended: new Date("2026-09-24T02:51:00Z"), outcome: "done", issue: 108, cost: 0.29, note: "n" }), {
    Project: "nord-booking", Routine: "security-scan", Run: 55, Due: "2026-09-24T02:00:00.000Z", Started: "2026-09-24T02:00:00.000Z",
    Ended: "2026-09-24T02:51:00.000Z", Trigger: "cron", TaskID: s.id(108), Issue: 108, Outcome: "done", Note: "n", CostEUR: 0.29,
  });
  assert.equal("Ended" in s.routineRun("security-scan", { run: 55, due, outcome: "filed", issue: 108 }), false);
});
test("routineView words the next run at the story's time and counts it from now", () => {
  const at = new Date("2026-10-02T09:30:00Z"); // a Friday
  const scan = { name: "security-scan", title: "Security scan", schedule: [{ cron: "0 2 * * *" }], files: "agent" };
  const run = s.routineRun("security-scan", { run: 63, due: new Date("2026-10-02T02:00:00Z"), outcome: "no change" });
  const v = s.routineView(now, at, scan, { runs: [run] });
  // Saturday 02:00 is 16 h 30 min after the story's time
  assert.deepEqual([v.Next, v.NextWords, v.Soon, v.Last.Run, v.State.Runs, v.Lane], ["2026-10-21T04:30:30.000Z", "Sat 02:00", false, 63, 63, "queued"]);
  assert.equal("SkipNext" in v.State, false);
  const skipped = s.routineView(now, at, scan, { runs: [run], skip: true });
  assert.deepEqual([skipped.Next, skipped.NextWords, skipped.State.SkipNext, skipped.State.SkipBy], ["2026-10-22T04:30:30.000Z", "Sun 02:00", true, "sebastian"]);
  const held = s.routineView(now, at, scan, { needsMe: true });
  assert.deepEqual([held.State.NeedsMe, held.State.NeedsMeBy, held.State.Runs], [true, "sebastian", 0]);
  const review = s.routineView(now, at, { ...scan, schedule: [{ cron: "0 8 1 * *" }] });
  assert.equal(review.NextWords, "Sun 1 Nov 08:00");
  assert.equal(s.routineView(now, new Date("2026-10-02T01:30:00Z"), scan).Soon, true);
});
test("scene carries the routines' clock", () => {
  assert.equal(s.scene(now, { routinesAt: new Date("2026-10-02T09:30:00Z") }).RoutinesAt, "2026-10-02T09:30:00.000Z");
  assert.equal("RoutinesAt" in s.scene(now, {}), false);
});
