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
test("ask carries the verbatim result", () => {
  const m = s.ask(now, { question: "Mail or app?", choices: ["Mail", "App"], age: 60 });
  assert.equal(m.kind, "ask");
  assert.equal(m.tool_calls[0].result, "Asked the member; this turn ends. A press or their next message answers it.");
  assert.equal(m.tool_calls[0].arguments, '{"question":"Mail or app?","choices":["Mail","App"]}');
});
test("proposal expires after its ttl and its call names the token", () => {
  const p = s.proposal(now, { tool: "steer", args: { task_id: "t-1" }, description: "Message a card", ttl: 1800 });
  assert.equal(p.ExpiresAt, "2026-10-20T12:30:00.000Z");
  assert.equal(p.Kind, "proposal");
  const c = s.proposedCall(now, p, { id: "call_1", age: 5 });
  assert.equal(c.proposal, p.Token);
  assert.equal(c.result, "Proposed to sebastian: Message a card. Nothing runs until they press Do it.");
});
test("metrics report is the nord-booking window", () => {
  const m = s.metrics(now);
  assert.equal(m.repository, "nord/booking");
  assert.equal(m.to, "2026-10-20T12:00:00.000Z");
  assert.equal(m.from, "2026-09-23T12:00:00.000Z");
  assert.equal(m.deploys.value, 23);
});
