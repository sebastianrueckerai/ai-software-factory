const test = require("node:test");
const assert = require("node:assert/strict");
const s = require("../lib/state");
const story = require("../lib/story");
const now = new Date("2026-10-20T12:00:00Z");

test("the calendar's week 1 starts on Monday 21 September 2026", () => {
  assert.equal(story.date(1, "mon", "02:00").toISOString(), "2026-09-21T02:00:00.000Z");
  assert.equal(story.date(2, "thu", "08:00").toISOString(), "2026-10-01T08:00:00.000Z");
});
test("a run reads filed until now passes its card's live end, and its outcome after", () => {
  // the scan's run 55 falls on the last 02:00 before now, and its card is live 50 minutes later
  const open = story.runsAt(new Date("2026-10-20T02:30:00Z"), "security-scan", story.date(1, "thu", "02:30"));
  assert.deepEqual([open[0].Run, open[0].Due, open[0].Outcome, "Ended" in open[0], "CostEUR" in open[0]], [55, "2026-10-20T02:00:00.000Z", "filed", false, false]);
  assert.deepEqual([open[1].Run, open[1].Due, open[1].Outcome], [54, "2026-10-19T02:00:00.000Z", "no change"]);
  const ended = story.runsAt(now, "security-scan", story.date(1, "thu", "02:30"))[0];
  assert.deepEqual([ended.Outcome, ended.Ended, ended.CostEUR], ["done", "2026-10-20T02:50:00.000Z", 0.29]);
  assert.equal(story.runsAt(now, "performance-read", story.date(1, "thu", "03:00")).length, 0);
  const bump = story.runsAt(now, "dependency-bump", story.date(2, "fri", "07:30"));
  assert.deepEqual(bump.map((r) => [r.Run, r.Due, r.Ended]), [[8, "2026-10-19T06:00:00.000Z", "2026-10-19T06:52:00.000Z"], [7, "2026-10-12T06:00:00.000Z", "2026-10-12T06:00:50.000Z"]]);
  // a run that files no card has no outcome while it runs
  const running = story.runsAt(new Date("2026-10-19T06:00:30Z"), "dependency-bump", story.date(1, "mon", "09:00"))[0];
  assert.deepEqual([running.Run, "Outcome" in running, "Ended" in running], [7, false, false]);
});
test("a routine's card counts its age from its run's start on the cron clock", () => {
  assert.equal(story.filedAge(now, 115), 30 * 3600);
  assert.equal(story.filedAge(now, 108), 10 * 3600);
  // by Monday 03:00 of week 2 four scans followed run 55, so it falls four nights before the last
  assert.equal(story.filedAge(now, 108, story.date(2, "mon", "03:00")), (4 * 24 + 10) * 3600);
  // the performance read's last run was Friday 16 October 07:00, 4 days 5 hours before now
  assert.equal(story.anchoredAt(now, 123).toISOString(), "2026-10-06T12:00:00.000Z");
  assert.equal(story.anchoredAt(now, 108).toISOString(), "2026-09-24T12:00:00.000Z");
  const building = story.routineCard(new Date("2026-10-16T07:30:00Z"), 123).task;
  assert.deepEqual([building.Status, building.Gate, building.SpentEUR, building.CreatedAt, building.Source], ["running", "session", 0.34, "2026-10-16T07:00:00.000Z", "routine"]);
  assert.deepEqual([story.routineCard(now, 123).task.Status, story.routineCard(now, 123).task.FinishedAt], ["done", "2026-10-16T08:04:00.000Z"]);
});
test("routinesAt names a routine's open card while its newest run is open", () => {
  const at7 = new Date("2026-10-16T07:30:00Z");
  const card = story.routineCard(at7, 123).task;
  const read = (n, a) => story.routinesAt(n, a, { cards: [card] }).routines.find((v) => v.Routine.name === "performance-read");
  assert.deepEqual(read(at7, story.anchoredAt(at7, 123)).Open, { ID: card.ID, IssueNumber: 123, Status: "running" });
  assert.equal("Open" in read(now, story.anchoredAt(now, 123)), false);
});
test("routinesAt skips one routine and holds another for sebastian, on a clock a second past now", () => {
  const r = story.routinesAt(now, story.date(2, "fri", "09:30"), { skip: "performance-read", needsMe: "dependency-bump" });
  const by = Object.fromEntries(r.routines.map((v) => [v.Routine.name, v]));
  // Friday 23 October's read is skipped: the next is Friday 30 October, over a week on
  assert.deepEqual([by["performance-read"].State.SkipNext, by["performance-read"].NextWords], [true, "Fri 30 Oct 07:00"]);
  assert.equal(by["dependency-bump"].State.NeedsMe, true);
  assert.equal("NeedsMe" in by["security-scan"].State, false);
  assert.equal(r.runs["cost-review"][0].Issue, 124);
  assert.equal(r.routinesAt.toISOString(), "2026-10-20T12:00:01.000Z");
});
test("a card merged waits for its chain, and is done without a chain verdict once live", () => {
  const merged = story.life(now, 101, 113 * 60, story.lives[101]).task;
  assert.deepEqual([merged.Status, merged.ChainState, "Gate" in merged, "FinishedAt" in merged], ["merged", "pending", false, false]);
  const live = story.life(now, 101, 121 * 60, story.lives[101]).task;
  assert.deepEqual([live.Status, "ChainState" in live, live.FinishedAt], ["done", false, "2026-10-20T11:59:00.000Z"]);
  const events = story.mergeEvents(now, 101, 113 * 60, story.merges[101]);
  assert.deepEqual(events.map((e) => [e.Kind, e.At]), [["pull_request_merged", "2026-10-20T11:59:00.000Z"]]);
});

test("life is the card in the phase its age reached, its gate open since the phase that set it", () => {
  const phases = [{ from: 0, status: "queued" }, { from: 60, status: "running", gate: "session", model: "small", spent: 0.1 }, { from: 300, spent: 0.2 }];
  const { task, objects } = story.life(now, 103, 600, { phases, steps: [s.sessionStart(60, { model: "small" })] });
  assert.deepEqual([task.Status, task.Gate, task.GateSince, task.ModelAlias, task.SpentEUR], ["running", "session", "2026-10-20T11:51:00.000Z", "small", 0.2]);
  assert.equal("PRNumber" in task, false);
  // #103's first session started 9 minutes ago: its words at 30 s, 4 min and 9 min are said, the one at 17 min not yet
  assert.equal(objects[`sessions/${task.ID}/s-1.jsonl`].trim().split("\n").length, 3);
});
test("life ends a done card at its phase's start, without a gate", () => {
  const { task } = story.life(now, 103, 5400, { phases: [{ from: 0, status: "in-review", gate: "review", pr: true }, { from: 5040, status: "done" }] });
  assert.equal(task.FinishedAt, "2026-10-20T11:54:00.000Z");
  assert.equal("Gate" in task, false);
  assert.equal(task.PRNumber, 203);
});
test("life admits a card at its admitted offset", () => {
  const { task } = story.life(now, 117, 1000, { admitted: 400, phases: [{ from: 0, status: "running", gate: "session" }] });
  assert.equal(task.AdmittedAt, "2026-10-20T11:50:00.000Z");
  assert.equal(task.CreatedAt, "2026-10-20T11:43:20.000Z");
});
test("a waiting-human phase's ask is the card's escalation, its choices and its alert, since the phase began", () => {
  const ask = { issue: 113, question: "Which library?", choices: ["A", "B"], alert: 17 };
  const phases = [{ from: 0, status: "queued" }, { from: 60, status: "waiting-human", ask }, { from: 600, status: "running", gate: "session" }];
  const waiting = story.life(now, 113, 300, { phases }).task;
  assert.equal(waiting.Escalation, "The agent asks: Which library?");
  assert.deepEqual(waiting.Choices, ["A", "B"]);
  assert.equal(waiting.EscalatedAt, "2026-10-20T11:56:00.000Z");
  assert.equal(waiting.EscalationAlert, 17);
  const running = story.life(now, 113, 700, { phases }).task;
  assert.deepEqual(["Escalation", "Choices", "EscalatedAt", "EscalationAlert"].filter((k) => k in running), []);
});
test("a budget stop's escalation is factoryd's own question, not the agent's", () => {
  assert.equal(story.escalation({ budget: true, question: "Fund one more session?" }), "Fund one more session?");
  assert.equal(story.escalation({ question: "Which?" }), "The agent asks: Which?");
});
test("asking leaves the question's row, its escalation alert and the inbox's row", () => {
  const a = story.asking(now, story.asks.library, 120, 1);
  assert.deepEqual([a.events[0].Kind, a.events[0].At, a.events[0].Detail.source], ["question_asked", "2026-10-20T11:58:00.000Z", "agent"]);
  assert.deepEqual([a.alerts[0].ID, a.alerts[0].Kind, a.alerts[0].Source, a.alerts[0].TaskID], [17, "escalation", "agent", "t-37c411e42a03"]);
  assert.match(a.inbox.content, /^#113 needs you: Which calendar library/);
  assert.equal(story.asking(now, story.asks.budget, 0, 1).alerts[0].Source, "budget");
});
test("answerRows are the member's choice and the factory's word on it", () => {
  const [mine, note] = story.answerRows(now, story.asks.library, 30, 1);
  assert.deepEqual([mine.role, mine.content], ["user", "TOAST UI Calendar"]);
  assert.equal(note.content, "Answered #113 with “TOAST UI Calendar”; the card goes on.");
  assert.equal(note.kind, "poke");
});
test("wakeAsk is the waker's text of a batch of asks", () => {
  assert.equal(story.wakeAsk([{ issue: 125, question: "Where does the room go?" }]),
    "Wake: 1 asks wait for a human.\n#125: Where does the room go?\n\nRead each card. Settle what your permissions allow. " +
    "For what stays the human's, record what you found with attach_analysis. An ask already answered is done.");
});
test("a planned card is named by its key, any other by its title", () => {
  assert.equal(story.title(110), "week-view");
  assert.equal(story.title(122), "Payments: refund a class the studio cancels");
});
test("a merge's spec takes the head of the card's last session that pushed", () => {
  const spec = story.mergeSpec(story.approvals.calendarFile);
  assert.equal(spec.head_sha, "5e9c3b2");
  assert.equal(spec.risk_class, "normal");
  assert.deepEqual(spec.why_human, ["the project's merge rule is human"]);
});
test("the week view stops at its budget overnight and closes with the split", () => {
  const stop = story.life(now, 110, 363 * 60 + 600, story.lives[110]).task;
  assert.equal(stop.Status, "waiting-human");
  assert.equal(stop.EscalatedAt, "2026-10-20T11:50:00.000Z");
  assert.equal(stop.SpentEUR, 4.6);
  // filed Thursday 20:00, split Friday 08:40, closed 15 seconds into the split
  const closed = story.life(now, 110, 12 * 3600 + 40 * 60 + 20, story.lives[110]).task;
  assert.equal(closed.Status, "closed");
  assert.equal(closed.FinishedAt, "2026-10-20T11:59:55.000Z");
});
test("the morning's cards wait on their questions until the answers, then take their slots", () => {
  // #120 is filed at 02:08 and answered at 10:58, 8 h 50 min later
  const waiting = story.life(now, 120, 8 * 3600 + 49 * 60, story.lives[120]).task;
  assert.equal(waiting.Status, "waiting-human");
  assert.equal(waiting.Escalation, "The agent asks: Does an unused class of an expired pass come back as credit?");
  const running = story.life(now, 120, 8 * 3600 + 52 * 60, story.lives[120]).task;
  assert.deepEqual([running.Status, running.AdmittedAt], ["running", "2026-10-20T11:58:00.000Z"]);
});
