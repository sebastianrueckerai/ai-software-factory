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
  const a = story.asking(now, story.asks.editor, 120, 1);
  assert.deepEqual([a.events[0].Kind, a.events[0].At, a.events[0].Detail.source], ["question_asked", "2026-10-20T11:58:00.000Z", "agent"]);
  assert.deepEqual([a.alerts[0].ID, a.alerts[0].Kind, a.alerts[0].Source, a.alerts[0].TaskID], [17, "escalation", "agent", "t-37c411e42a03"]);
  assert.match(a.inbox.content, /^#113 needs you: Which map editor/);
  assert.equal(story.asking(now, story.asks.budget, 0, 1).alerts[0].Source, "budget");
});
test("answerRows are the member's choice and the factory's word on it", () => {
  const [mine, note] = story.answerRows(now, story.asks.editor, 30, 1);
  assert.deepEqual([mine.role, mine.content], ["user", "Tiled"]);
  assert.equal(note.content, "Answered #113 with “Tiled”; the card goes on.");
  assert.equal(note.kind, "poke");
});
test("wakeAsk is the waker's text of a batch of asks", () => {
  assert.equal(story.wakeAsk([{ issue: 125, question: "Where does the link open?" }]),
    "Wake: 1 ask waits for a human.\n#125: Where does the link open?\n\nRead each card. Settle what your permissions allow. " +
    "A card waiting on its budget takes fund from your pool. For what stays the human's, record what you found with attach_analysis. " +
    "An ask already answered is done.");
});
test("a planned card is named by its key, any other by its title", () => {
  assert.equal(story.title(110), "belt-map");
  assert.equal(story.title(122), "Store: refund a purchase the server rolls back");
});
test("a merge's spec takes the head of the card's last session that pushed", () => {
  const spec = story.mergeSpec(story.approvals.shareLink);
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
  assert.equal(waiting.Escalation, "The agent asks: Does a tier not reached by the season's end come back as credit?");
  const running = story.life(now, 120, 8 * 3600 + 52 * 60, story.lives[120]).task;
  assert.deepEqual([running.Status, running.AdmittedAt], ["running", "2026-10-20T11:58:00.000Z"]);
});

const pct = (x) => Math.round(x * 100) / 100;
const figure = (f) => [f.value, f.prev, f.has, f.prev_has];

// the quiet work: 300 cards a week, 60 each weekday from 08:00 every eight minutes, card k spending (1 + k mod 3)
// cents, so every three cards spend 0.06, a weekday 1.20 and a week 6.00; each ends 18 + (7k mod 20) minutes after its
// filing, so a week's ends are 18 to 37 fifteen times each, 8250 minutes, and it goes live 6 + k mod 3 minutes after its
// merge. Reviews of one to three cents cost nothing by the cent. Cards 5, 38, ... 269, nine a week, ask once, answered
// by their member nine minutes later; cards 7, 32, ... 282, twelve a week, fail their first review. They book no act.
test("week 1's report reads its ten story cards and the week's quiet work against the quiet week before it", () => {
  const r = story.report(now, story.weekEnd(1), 7);
  assert.deepEqual([r.from, r.to], ["2026-10-14T00:00:00.000Z", "2026-10-20T00:00:00.000Z"]);
  // live by Sunday: #101 to #104, #107 to #109, #111 and #113, and the 300 quiet cards; #105 is the plan, done at its
  // accept; #100 lived in the week before last
  assert.deepEqual(figure(r.deploys), [309, 0, true, true]);
  assert.deepEqual(r.deploys.weeks, [0, 0, 0, 0, 1, 0, 309]);
  assert.deepEqual(figure(r.throughput), [310, 0, true, true]);
  // merge to live: the story's 6 three times, 7 twice, 8 three times and 9, the quiet 6, 7 and 8 a hundred times each;
  // the 155th of 309 is a 7
  assert.deepEqual(figure(r.lead_time), [7 * 60000, 0, true, false]);
  // filing to done: the quiet 18 to 37 lie under the story's 50 and up; 28 holds the 151st to 165th
  assert.deepEqual(figure(r.card_cycle), [28 * 60000, 0, true, false]);
  // a hundred each of 0.01 to 0.03 under the story's 0.29 and up: the 155th and 156th are 0.02
  assert.deepEqual(figure(r.per_card), [0.02, 0, true, false]);
  // the story's 12.82 with the quiet 6.00
  assert.deepEqual(figure(r.spend), [18.82, 0, true, true]);
  assert.deepEqual(figure(r.tool_spend), [0.38, 0, true, true]);
  // the cards' 18.27 at 1.6 million tokens a euro over 310 cards, 94 297 to the thousand; the week before has no done card
  assert.deepEqual(figure(r.tokens_per_card), [94000, 0, true, false]);
  // CheckoutErrors rose at 12:59 and #104 was live at 14:00
  assert.deepEqual(figure(r.time_to_restore), [61 * 60000, 0, true, false]);
  // #110's budget, #113's library and the nine quiet asks; #110 closed unjudged, so 10 of the 310 done cards asked
  assert.deepEqual(figure(r.escalations), [11, 0, true, true]);
  assert.deepEqual(figure(r.escalated_share), [10 / 310, 0, true, false]);
  assert.deepEqual([r.escalations_handled.human, r.escalations_handled.ai, r.escalations_handled.unjudged], [10, 0, 1]);
  // #105 waited from 20 minutes to its accept at 2040, #113 from 2.75 to 28.5, the quiet asks nine minutes each, over
  // the story's 3142 minutes and the quiet 8250
  assert.equal(pct(r.human_blocked.value), pct((2020 + 25.75 + 81) / (3142 + 8250)));
  // #105 has no review; of the other 309, the twelve quiet ones failed
  assert.deepEqual(figure(r.review_acceptance), [297 / 309, 0, true, false]);
  // big: the story's 7.51; small: the story's 5.31 and the quiet 6.00
  assert.deepEqual(r.model_spend.map((m) => [m.alias, pct(m.share)]), [["small", pct((100 * 11.31) / 18.82)], ["big", pct((100 * 7.51) / 18.82)]]);
  assert.deepEqual(r.served_by.map((m) => m.alias), ["zai/glm-5.3-flash", "zai/glm-5.3"]);
  // the story's 21 acts over 310 cards
  assert.deepEqual(figure(r.interventions), [0.1, 0, true, false]);
});
test("week 2's report reads the week against week 1: cheaper story cards, more asks, the same quiet work", () => {
  const r = story.report(now, story.weekEnd(2), 7);
  assert.deepEqual(figure(r.deploys), [310, 309, true, true]);
  assert.deepEqual(figure(r.throughput), [310, 310, true, true]);
  // the story's leads 8 6 6 7 6 6 6 6 6 6 put 108 sixes before the sevens: the 155th and 156th are 7s
  assert.deepEqual(figure(r.lead_time), [7 * 60000, 7 * 60000, true, true]);
  // the story's ends start at 34 and 40.5, above 28's 151st to 165th place
  assert.deepEqual(figure(r.card_cycle), [28 * 60000, 28 * 60000, true, true]);
  assert.deepEqual(figure(r.per_card), [0.02, 0.02, true, true]);
  // the story's 5.48, the chat's 1.02 - 0.55 and the quiet 6.00
  assert.deepEqual(figure(r.spend), [11.95, 18.82, true, true]);
  assert.deepEqual(figure(r.tool_spend), [0.24, 0.38, true, true]);
  // the cards' 11.48 at 1.6 million tokens a euro over 310 cards, 59 252 to the thousand
  assert.deepEqual(figure(r.tokens_per_card), [59000, 94000, true, true]);
  // LeaderboardErrors rose at 17:19 and #119 was live at 17:53:30
  assert.deepEqual(figure(r.time_to_restore), [35 * 60000, 61 * 60000, true, true]);
  // the morning's #117, #120 and #121, answered by Sebastian, #125's, answered by the agent at full auto, and the nine
  // quiet asks: 13 of 310 cards, 4.2 %
  assert.deepEqual(figure(r.escalations), [13, 11, true, true]);
  assert.deepEqual(figure(r.escalated_share), [13 / 310, 10 / 310, true, true]);
  assert.deepEqual(r.escalations_handled, { human: 12, ai: 1, unjudged: 0, prev: [10, 0, 1], weeks: [0, 0, 0, 0, 0, 10, 12] });
  assert.equal(pct(r.human_blocked.value), pct((524 + 529 + 519 + 0.5 + 81) / (2147.5 + 8250)));
  // #116's first review found the race, and twelve quiet first reviews asked for changes
  assert.deepEqual(figure(r.review_acceptance), [297 / 310, 297 / 309, true, true]);
  // small: the story's 4.84 and the quiet 6.00; big: the reviews' 0.64 and the chat's 0.47
  assert.deepEqual(r.model_spend.map((m) => [m.alias, pct(m.share)]), [["small", pct((100 * 10.84) / 11.95)], ["big", pct((100 * 1.11) / 11.95)]]);
  // files: 150 ones and 150 twos of the quiet before the story's 2 and up. Insertions: the quiet 4 to 33 ten times
  // each, 150 of them to 18, so 19 holds the 151st to 161st with the story's 19. Deletions: the quiet 0 to 6 forty-two
  // times and once more 0 5 3 1 6 4, with the story's 3 5 3: 128 to 2, then 3 from the 129th. Week 1 reads the same.
  assert.deepEqual([r.diff_size.files, r.diff_size.insertions, r.diff_size.deletions, r.diff_size.prev], [2, 19, 3, [2, 19, 3]]);
  // the story's 17 acts over 310 cards
  assert.deepEqual(figure(r.interventions), [0.1, 0.1, true, true]);
});
test("Monday's 28 days count #101's deploy once it is live", () => {
  // at 12:53 the quiet cards of 08:00 to 12:24 are done, the last at 12:53; #101 is live at 13:00
  const before = story.report(now, story.at(103, 17 * 60), 28);
  const after = story.report(now, story.at(103, 26 * 60), 28);
  assert.deepEqual([figure(before.deploys), figure(after.deploys)], [[34, 1, true, true], [35, 1, true, true]]);
  // #100's day and the 34 quiet ends, 18 to 37 once and 18 25 32 19 26 33 20 27 34 21 28 35 22 29 once more: the 18th
  // of 35 is 27; with #101's two hours, the 18th and 19th of 36 are 27 and 28, 27.5 rounded up
  assert.deepEqual([before.card_cycle.value, after.card_cycle.value], [27 * 60000, 28 * 60000]);
});
test("spending is the cards' spend so far and the chat's", () => {
  // #101 done, #102 84 of its 174 minutes into 0.64, #103 24 of 84 into 0.31, the chat 0.18, and the quiet cards: the 34
  // done by 12:53, 0.67, and the four running at 13:00 for their shares of 0.02 0.03 0.01 0.02, 0.05 by the cent
  assert.deepEqual(story.spending(story.date(1, "mon", "13:00")), { spend: 2.42, chatSpend: 0.18 });
  assert.deepEqual(story.spending(story.weekEnd(1)), { spend: 18.82, chatSpend: 0.55 });
  assert.deepEqual(story.spending(story.weekEnd(2)), { spend: 30.77, chatSpend: 1.02 });
  // the overnight cards spend from the morning's answer, #110 until its budget stopped it
  assert.equal(story.spentAt(117, story.date(2, "wed", "10:59")), 0);
  assert.equal(story.spentAt(110, story.date(1, "fri", "08:00")), 4.6);
});
test("the ledger's spends are the spends the cards' lives end on", () => {
  const last = (life) => life.phases.findLast((p) => "spent" in p).spent;
  for (const issue of [101, 107, 108, 110, 115, 120, 121, 122, 123]) assert.equal(story.ledger[issue].spent, last(story.lives[issue]), `#${issue}`);
  assert.equal(story.ledger[125].spent, last(story.shareLink.auto));
});
test("the cost review reads September from the ledger", () => {
  // #100's 0.38, week 1's cards' 12.27, week 2's Monday to Wednesday's #115, #116, #117, #120 and #121, the chat's 0.66,
  // and the quiet work's 6.00 of week 1 and 3.60 of Monday to Wednesday
  const october = story.date(2, "thu", "00:00");
  assert.equal(pct(story.spending(october).spend + story.spentAt(100, october)), 26.1);
  // 15.84 and 9.60 of the cards over the sixteen and the 480 quiet ones done by then, 0.0513 a card
  assert.equal(story.routines["cost-review"][0].note, "€26.10 of the €60 cap, €0.05 per card");
});
test("the costs page's days are the two weeks' spend by day, dated back from now", () => {
  const c = story.costs(now, story.weekEnd(2));
  assert.deepEqual([c.from, c.to], ["2026-10-07", "2026-10-20"]);
  // Monday: #101 1.12, #102 0.64, #103 0.31, the chat 0.18. Tuesday: #104 0.48, the chat 0.03. Wednesday: #105 0.46,
  // #107 1.18, the chat 0.17. Thursday: #108 0.29, #109 1.84, #110's 79 of its 195 minutes into 4.60 (1.8636), #111's
  // 85 of 115 into 0.92 (0.68), the chat 0.02: 9.2636 in all, 9.26 by the cent. Friday: the rest to 12.82. Each
  // weekday adds its 60 quiet cards' 1.20. The weekends spend nothing and keep no row.
  assert.deepEqual(c.days.map((d) => [d.day, d.total]), [
    ["2026-10-07", 3.45], ["2026-10-08", 1.71], ["2026-10-09", 3.01], ["2026-10-10", 5.89], ["2026-10-11", 4.76],
    ["2026-10-14", 1.58], ["2026-10-15", 2.3], ["2026-10-16", 3.02], ["2026-10-17", 2.72], ["2026-10-18", 2.33],
  ]);
  // tools are 2 % of the spend so far, by the cent: 0.07 of Monday's 3.45, 0.38 of week 1's 18.82, 0.41 of 20.40 by
  // week 2's Monday, 0.62 of 30.77
  assert.deepEqual(c.days[0].by_kind, { model: 3.38, tool: 0.07 });
  assert.deepEqual(c.days[5].by_kind, { model: 1.55, tool: 0.03 });
  const week = (from, to, kind) => pct(c.days.filter((d) => d.day >= from && d.day <= to).reduce((s, d) => s + (kind ? d.by_kind[kind] ?? 0 : d.total), 0));
  assert.deepEqual([week("2026-10-07", "2026-10-13"), week("2026-10-14", "2026-10-20")], [18.82, 11.95]);
  assert.deepEqual([week("2026-10-07", "2026-10-13", "tool"), week("2026-10-14", "2026-10-20", "tool")], [0.38, 0.24]);
  // the 21 story cards and 600 quiet ones that spent, #110 the costliest, a small card's review line first by its
  // ref; the chat's 1.02 is in the days only
  assert.equal(c.tasks.length, 621);
  assert.deepEqual(c.tasks[0], { task_id: s.id(110), eur: 4.6, lines: [{ kind: "model", ref: "big", eur: 4.05 }, { kind: "model", ref: "review/big", eur: 0.55 }] });
  assert.deepEqual(c.tasks[1], { task_id: s.id(109), eur: 1.84, lines: [{ kind: "model", ref: "review/big", eur: 0.22 }, { kind: "model", ref: "small", eur: 1.62 }] });
  assert.equal(pct(c.tasks.reduce((sum, t) => sum + t.eur, 0)), 29.75);
});
