const crypto = require("node:crypto");
const project = require("./project");

const AGENT_ASKS = "The agent asks: ";
const VIA_FACTORYD = "factoryd";
const EVENT_TASK_STATUS = "task_status";

const iso = (now, secondsBefore) => new Date(now.getTime() - secondsBefore * 1000).toISOString();
const stamp = (date) => date.toISOString().slice(0, 19) + "Z";
const present = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

// The lab's SessionFunded fake refuses a session only to its fire scene's capped card #610, so #110, the card the
// budget stops, takes that card's id, and the board offers its approvers the Fund action.
const LAB_IDS = { 110: 610 };

function id(issue) {
  return "t-" + sha256(`lab ${LAB_IDS[issue] ?? issue}`).slice(0, 12);
}

function card(now, o) {
  const { issue, status, lane, age, title, body } = o;
  return present({
    ID: id(issue),
    Kind: o.kind ?? "agent",
    Status: status,
    Lane: lane,
    Process: "spec",
    Repository: project.repository,
    IssueNumber: issue,
    Objective: `${title}\n\n${body}`,
    Source: o.source ?? "webhook",
    Author: o.author ?? project.login,
    AuthorWriter: o.author === undefined,
    RiskClass: "standard",
    BudgetEUR: o.budget ?? 3,
    SpentEUR: o.spent,
    ModelAlias: o.model,
    Size: o.size ?? "small",
    PRNumber: o.pr,
    Parent: o.parent === undefined ? undefined : id(o.parent),
    PlanKey: o.planKey,
    Gate: o.gate,
    GateSince: o.gateSince === undefined ? undefined : iso(now, o.gateSince),
    CreatedAt: iso(now, age),
    AdmittedAt: o.admitted === undefined ? undefined : iso(now, o.admitted),
    FinishedAt: o.finished === undefined ? undefined : iso(now, o.finished),
    Usage: o.attempts === undefined ? undefined : { Attempts: o.attempts },
    Escalation: o.escalation,
    Choices: o.choices,
    EscalatedAt: o.escalatedAt === undefined ? undefined : iso(now, o.escalatedAt),
    EscalationAlert: o.escalationAlert,
    WaitingOn: o.waitingOn,
    AlertFingerprint: o.fingerprint,
    ChainState: o.chain,
  });
}

const jsonl = (rows) => rows.map((r) => JSON.stringify(r) + "\n").join("");

// The steps of a card's timeline as factoryd records them. at is seconds after the timeline's start, and from, on a
// step that ends a gate, the gate's start.
const intake = (from, at) => ({ at, from, step: "intake", source: "webhook" });
const sessionStart = (at, { session = "s-1", model, attempt = 1 }) => ({ at, step: "session_start", session, model, attempt });
const sessionEnd = (from, at, { session = "s-1", attempt = 1, outcome }) => ({ at, from, step: "session_end", session, attempt, outcome });
const pushed = (at, { session = "s-1", commit }) => ({ at, step: "pushed", session, commit });

// session is the steps of session n, attempt n, from start to end: its start, its end with outcome, and the push of
// commit 5 seconds later when it pushed.
function session(start, end, { n = 1, model, outcome = "pushed", commit }) {
  const id = `s-${n}`;
  return [
    sessionStart(start, { session: id, model, attempt: n }),
    sessionEnd(start, end, { session: id, attempt: n, outcome }),
    ...(outcome === "pushed" ? [pushed(end + 5, { session: id, commit })] : []),
  ];
}

function checks(from, at, failed = "") {
  const jobs = ["test", "vet", "lint", "acceptance"].map((name) => ({ name, status: name === failed ? "failure" : "success", queue_s: 12, run_s: 140 }));
  return { at, from, step: "checks", state: failed ? "failure" : "success", jobs };
}

// modelReview is the review gate's verdict, approve or concerns, on the pull request's commit.
const modelReview = (from, at, { pr, commit, model = "big", round = 1, verdict, summary, findings = [] }) =>
  ({ at, from, step: "model_review", pr, commit, model, verdict, summary, findings, round });

// findings are a stage's findings sent on: to the agent's next session, or to a stronger model.
const findings = (at, { stage, round = 1, to, attempt, list }) => ({ at, step: "stage_findings", stage, round, to, attempt, findings: list });

// queueTurn ends the merge-queue gate: the card's turn to merge.
const queueTurn = (from, at) => ({ at, from, step: "queue_turn", project: project.repository });

// policyGate ends the policy gate on the pull request: its risk class, the class's outcome and the merge rule in force.
const policyGate = (from, at, { pr, risk, outcome, mergeRule = "human", changed, lines }) =>
  ({ at, from, step: "gate_policy", pr, class: risk, outcome, changed, lines, merge_rule: mergeRule });

// approvalRequested is the merge's approval request opening: the pull request waits on a person.
const approvalRequested = (at, { approval: n, pr, commit, risk }) => ({ at, step: "approval_requested", approval: n, pr, commit, class: risk });

// autoMerge is factoryd's note that factory-merge merges on the merge rule auto, without an approval card.
const autoMerge = (at, { pr, commit, risk, reproduction, review }) =>
  ({ at, step: "auto_merge", pr, commit, class: risk, merge_rule: "auto", reproduction, review });

// merged ends the merge gate: factory-merge merged the pull request at its gated head commit, on approver's approval.
const merged = (from, at, { pr, commit, approver = project.login }) => ({ at, from, step: "merged", pr, commit, approver, merged_by: "factory-merge" });

// recorded is an event as the card's timeline records it beside its events row.
const recorded = (at, event, detail) => ({ at, step: "event", event, ...detail });

// final is the card's end: merged while its chain runs, done once a green run covers it.
const final = (at, state, reason) => ({ at, step: "final", state, reason });

// supervisor is the supervisor's decision on a detector's trip in a session; the drawer shows the decision and reason.
const supervisor = (at, { session = "s-1", detector, trip, decision, reason }) => ({ at, step: "supervisor", session, detector, trip, decision, reason });

// start is seconds before now. The steps come out in time order, and a step after now is left out: it has not happened yet.
function timeline(now, start, { alias, failed = "", steps = [] } = {}) {
  const t0 = now.getTime() - start * 1000;
  const after = (s) => (s === undefined ? undefined : stamp(new Date(t0 + s * 1000)));
  const rows = alias === undefined ? [] : [intake(0, 30), ...session(60, 19 * 60, { model: alias, commit: "4be1c07" }), checks(19 * 60 + 10, 26 * 60, failed)];
  return jsonl([...rows, ...steps].filter((r) => r.at <= start).sort((x, y) => x.at - y.at)
    .map(({ at, from, ...row }) => present({ ...row, time: after(at), started: after(from) })));
}

// said is the agent's text of a model call, at seconds after the session's start.
const said = (at, text, cost = 0.02) => ({ at, kind: "model_call", text, cost });

// A row's at is seconds after start. A row after now is left out: it is not said yet.
function transcript(now, start, rows) {
  const t0 = now.getTime() - start * 1000;
  return jsonl(rows.filter((r) => r.at <= start).map((r) => ({
    time: stamp(new Date(t0 + r.at * 1000)),
    kind: r.kind,
    detail: r.kind === "model_call" ? { text: r.text, cost: r.cost } : { tool: r.tool },
  })));
}

function event(now, { issue, kind, actor = VIA_FACTORYD, via = VIA_FACTORYD, age, detail }) {
  return present({ At: iso(now, age), TaskID: id(issue), IssueNumber: issue, Kind: kind, Actor: actor, Via: via, Detail: detail });
}

function status(now, issue, state, gate, age) {
  return event(now, { issue, kind: EVENT_TASK_STATUS, age, detail: gate ? { status: state, gate } : { status: state } });
}

function alert(now, o) {
  return present({
    ID: o.id,
    Kind: o.kind,
    Source: o.source,
    TaskID: o.task === undefined ? undefined : id(o.task),
    RaisedAt: iso(now, o.age),
    ResolvedAt: o.resolvedAge === undefined ? undefined : iso(now, o.resolvedAge),
    Verdict: o.verdict,
    ResolvedBy: o.resolvedBy,
    Fingerprint: o.fingerprint,
    Detail: o.detail,
  });
}

// poke is a row factoryd writes into the inbox thread about issue's card, born of the event kind birth.
function poke(now, { issue, content, age, decider, birth, conversation }) {
  return present({ ...message(now, { role: "assistant", content, age, kind: "poke", conversation }), task_id: id(issue), decider, birth_kind: birth });
}

// mergedPoke and livePoke are factoryd's informs of a card's merge while its chain runs and of its end, live.
const mergedPoke = (now, { issue, age, conversation }) =>
  poke(now, { issue, content: `#${issue} merged; the chain is running.`, age, birth: "pull_request_merged", conversation });
const livePoke = (now, { issue, title, spent, age, conversation }) =>
  poke(now, { issue, content: `#${issue} is done and live: ${title}. €${spent.toFixed(2)} in all.`, age, birth: "task_ended", conversation });

// asked is factoryd's inbox row of a question on issue's card, its choices the answer row's; one a budget stops says so.
function asked(now, { issue, question, choices, age, budget, conversation }) {
  const content = `#${issue} ${budget ? "is stopped by its budget" : "needs you"}: ${question}`;
  return { ...poke(now, { issue, content, age, birth: "question_asked", conversation }), kind: "escalation", choices };
}

// mergeAsked is factoryd's inbox row of a merge approval request on issue's card.
const mergeAsked = (now, { issue, pr, risk, age, conversation }) => ({
  ...poke(now, { issue, content: `#${issue} waits for you: merge PR #${pr}, ${risk} risk.`, age, birth: "approval_requested", conversation }),
  kind: "escalation", choices: ["Approve"],
});

// wake is the user row of a turn the factory's waker starts on the inbox, born of kind ("wake_ask"); the agent's rows
// after it fold into it.
const wake = (now, { kind, text, age, conversation }) => message(now, { role: "user", content: text, age, conversation, birth: kind });

function approval(now, o) {
  for (const key of ["brief", "detail"]) {
    if (!o[key]) throw new Error(`approval ${o.id}: ${key} is empty; the console shows nothing for it`);
  }
  return present({
    ID: o.id,
    Kind: o.kind,
    TaskID: id(o.task),
    Project: project.repository,
    PRNumber: o.pr,
    Spec: o.spec,
    Reason: o.reason,
    Status: "pending",
    CreatedAt: iso(now, o.age),
    Brief: o.brief,
    Detail: o.detail,
  });
}

function message(now, { role, content = "", age, kind, choices, toolCalls, conversation, birth }) {
  return present({ role, content, at: iso(now, age), kind, choices, tool_calls: toolCalls, conversation, birth_kind: birth });
}

function ask(now, { question, choices, age }) {
  const at = iso(now, age);
  return message(now, {
    role: "assistant", content: question, age, kind: "ask", choices,
    toolCalls: [{
      id: `ask-${sha256(`${question} ${age}`).slice(0, 8)}`, name: "ask",
      arguments: JSON.stringify({ ask: question, choices }), read_at: at,
      result: "Asked the member; this turn ends. A press or their next message answers it.",
    }],
  });
}

function proposal(now, { tool, args, description, ttl = 1800 }) {
  const digest = sha256(tool + JSON.stringify(args)).slice(0, 40);
  return {
    Token: "lab" + digest, Kind: "proposal", Repository: project.repository, Login: project.login, Tool: tool,
    Args: args, Description: description, ExpiresAt: iso(now, -ttl),
  };
}

function proposedCall(now, p, { id: callId, age }) {
  return {
    id: callId, name: p.Tool, arguments: JSON.stringify(p.Args), read_at: iso(now, age), proposal: p.Token,
    result: `Proposed to ${project.login}: ${p.Description.replace(/\.$/, "")}. Nothing runs until they press Do it.`,
  };
}

// seen marks every thread of chat read to its newest row, as the seed numbers the rows: by place, from 1. A reseed
// drops the console's own marks, and an unread thread is read again at the chat's next ten-second tick.
function seen(chat) {
  const out = {};
  chat.forEach((m, i) => { out[m.conversation ?? 1] = i + 1; });
  return out;
}

// truncate is textutil.Truncate: at most n bytes, cut on a character boundary, marked with an ellipsis.
function truncate(s, n) {
  const b = Buffer.from(s);
  if (b.length <= n) return s;
  while (n > 0 && (b[n] & 0xc0) === 0x80) n--;
  return b.subarray(0, n).toString() + "…";
}

// cardFiling is the new_card proposal of args, described as the console describes it.
function cardFiling(now, args, ttl) {
  const parts = ["File a card"];
  for (const key of ["title", "body", "lane", "size"]) {
    if (args[key]) parts.push(`${key} ${truncate(args[key], 120)}`);
  }
  if (args.acceptance?.length) parts.push("acceptance " + args.acceptance.map((a) => truncate(a, 120)).join("; "));
  return proposal(now, { tool: "new_card", args, description: parts.join(", "), ttl });
}

// pressed is the row a Do it on p leaves: the call its tool ran and the result.
function pressed(now, p, { age, result }) {
  return message(now, {
    role: "assistant", age,
    toolCalls: [{ id: "do-" + p.Token.slice(0, 12), name: p.Tool, arguments: JSON.stringify(p.Args), read_at: iso(now, age), result }],
  });
}

// steering is the steer proposal of text to issue's running session, described as the console describes it.
function steering(now, { issue, title, text }) {
  return proposal(now, {
    tool: "steer", args: { task_id: id(issue), text },
    description: `Message a running card, ${ref(issue, title)}, text ${truncate(text, 120)}`,
  });
}

// UNDOABLE are the chat's writes that carry an undo.
const UNDOABLE = ["move_card", "comment", "set_summary", "set_accent", "set_dependency"];

// pressedThread is the rows the presses of Do it on each of ps leave, as the console stores them: the member's line at
// age, the agent's reply proposing them all a second later, and from two seconds after that a Do it's row a second, each
// with its tool's result and the console's word on its undo.
function pressedThread(now, ps, { line, reply, results, age }) {
  const undo = (p) => (UNDOABLE.includes(p.Tool) ? "The member may undo it." : "It cannot be undone.");
  return {
    rows: [
      message(now, { role: "user", content: line, age }),
      message(now, { role: "assistant", content: reply, age: age - 1, toolCalls: ps.map((p, i) => proposedCall(now, p, { id: `call_${i + 1}`, age: age - 1 })) }),
      ...ps.map((p, i) => pressed(now, p, { age: age - 3 - i, result: `${results[i]} ${undo(p)}` })),
    ],
    proposals: ps,
  };
}

// one is the thread of a single press, its proposal named.
function one(t) {
  return { rows: t.rows, proposal: t.proposals[0] };
}

// filedThread is the thread of a filing from the chat.
function filedThread(now, { said: line, reply, args, issue, age }) {
  return one(pressedThread(now, [cardFiling(now, args)], { line, reply, age, results: [`Filed ${project.repository}#${issue} in lane ${args.lane}.`] }));
}

// steeredThread is the thread of a steer from the chat.
function steeredThread(now, { said: line, reply, issue, title, text, age }) {
  return one(pressedThread(now, [steering(now, { issue, title, text })], { line, reply, age, results: [`The session of #${issue} has your message.`] }));
}

// ref is a card as a proposal's description names it.
const ref = (issue, title) => `#${issue} ${id(issue)} ${JSON.stringify(title)}`;

// depending is the set_dependency proposal of issue's card on dep's, or with remove no longer, described as the console
// describes it; each is an [issue, title] pair.
function depending(now, [issue, title], [dep, depTitle], remove = false) {
  return proposal(now, {
    tool: "set_dependency", args: present({ task_id: id(issue), depends_on: id(dep), remove: remove || undefined }),
    description: `Set a dependency, ${ref(issue, title)}, ${remove ? "no longer depends on" : "depends on"} ${ref(dep, depTitle)}`,
  });
}

// closing is the close proposal of issue's card with note, described as the console describes it.
function closing(now, { issue, title, note }) {
  return proposal(now, { tool: "close", args: { task_id: id(issue), note }, description: `Close a card, ${ref(issue, title)}, note ${truncate(note, 120)}` });
}

// plan is issue's plan revision as the planner stores it: the plan's JSON and its sha256, which an accept pins.
function plan(now, { issue, revision = 1, age, summary, cards }) {
  const body = { summary, cards };
  return { TaskID: id(issue), Revision: revision, Plan: body, SHA256: sha256(JSON.stringify(body)), CreatedAt: iso(now, age) };
}

function byTask(plans) {
  const out = {};
  for (const p of plans) (out[p.TaskID] ??= []).push(p);
  return out;
}

function byRevision(questions) {
  const out = {};
  for (const { issue, revision = 1, text, choices } of questions) (out[`${id(issue)} ${revision}`] ??= []).push({ text, choices });
  return out;
}

const say = (text) => ({ Say: text });
const call = (tool, args) => ({ Call: [[tool, JSON.stringify(args)]] });
const reply = (...chunks) => chunks;

// figure is a deck number as factoryd's Figure carries it: the window's value and the previous window's, each undefined
// over an empty cohort, and the seven weekly sparks.
const figure = (value, prev, weeks) => ({ value: value ?? 0, prev: prev ?? 0, has: value !== undefined, prev_has: prev !== undefined, weeks });

// metrics is factoryd's MetricsReport of the project over the days that end with now's UTC day, figures its figures by
// their JSON names.
function metrics(now, days, figures) {
  const to = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { repository: project.repository, from: new Date(to - (days - 1) * 86400000).toISOString(), to: new Date(to).toISOString(), ...figures };
}

const HOUR = 3600 * 1000;
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// cronFrom is the first time cron names after from (step 1) or before it (step -1), in UTC, the factory's zone. It
// reads the routines' forms: a minute and an hour, and a number or * for the day of the month, the month and the weekday.
function cronFrom(cron, from, step) {
  const [minute, hour, dom, month, dow] = cron.split(" ");
  const hit = (field, v) => field === "*" || Number(field) === v;
  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let i = 0; i < 400; i++, day.setUTCDate(day.getUTCDate() + step)) {
    const at = new Date(day.getTime() + (Number(hour) * 60 + Number(minute)) * 60000);
    if ((at - from) * step > 0 && hit(dom, day.getUTCDate()) && hit(month, day.getUTCMonth() + 1) && hit(dow, day.getUTCDay())) return at;
  }
  throw new Error(`cron ${cron} names no time in the 400 days ${step > 0 ? "after" : "before"} ${from.toISOString()}`);
}
const nextCron = (cron, from) => cronFrom(cron, from, 1);
const prevCron = (cron, before) => cronFrom(cron, before, -1);

// cronWords is a run's time as factoryd's views word it: "Mon 15:04" within a week, else "Mon 2 Jan 15:04".
function cronWords(next, now) {
  const hm = next.toISOString().slice(11, 16);
  if (next - now < 7 * 24 * HOUR) return `${WEEKDAY[next.getUTCDay()]} ${hm}`;
  return `${WEEKDAY[next.getUTCDay()]} ${next.getUTCDate()} ${MONTH[next.getUTCMonth()]} ${hm}`;
}

// routineRun is run run of routine name, due and started at due; a run whose card is open has no ended.
function routineRun(name, { run, due, ended, outcome, issue, note, cost }) {
  return present({
    Project: project.name, Routine: name, Run: run, Due: due.toISOString(), Started: due.toISOString(), Ended: ended?.toISOString(),
    Trigger: "cron", TaskID: issue === undefined ? undefined : id(issue), Issue: issue, Outcome: outcome, Note: note, CostEUR: cost,
  });
}

// routineView is routine r as factoryd's views show it at now, as the lab's labNext words it: the next cron run 30
// seconds past its minute (with a Skip once, the run after it), soon when it is under an hour away and the run after it
// a day or more later, and runs, newest first, the newest its last. needsMe is the live toggle sebastian set; open the
// card of the newest run while it is open.
function routineView(now, r, { runs = [], skip = false, needsMe, open, held } = {}) {
  const cron = r.schedule[0].cron;
  const first = nextCron(cron, now);
  const next = skip ? nextCron(cron, first) : first;
  return present({
    Project: project.name, Routine: r,
    State: present({
      Project: project.name, Routine: r.name, Runs: runs[0]?.Run ?? 0, SkipNext: skip || undefined, SkipBy: skip ? project.login : undefined,
      NeedsMe: needsMe, NeedsMeBy: needsMe === undefined ? undefined : project.login,
    }),
    Next: new Date(next.getTime() + 30000).toISOString(),
    Soon: next - now < HOUR && nextCron(cron, next) - next >= 23 * HOUR,
    NextWords: cronWords(next, now),
    Last: runs[0],
    Open: open,
    Held: held,
    Lane: "queued",
  });
}

function scene(now, o = {}) {
  const tasks = o.tasks ?? [];
  const objects = { ...o.objects };
  for (const t of tasks) objects[`sessions/${t.ID}/timeline.jsonl`] ??= "";
  return present({
    Project: { Name: project.name, Repository: project.repository, Login: project.login },
    Projects: o.mergeRule ? project.rows.map((r) => ({ ...r, MergeRule: o.mergeRule })) : project.rows,
    Config: o.mergeRule ? { ...project.config, merge_rule: o.mergeRule } : project.config,
    MonthCap: project.monthCap,
    PRFiles: o.prFiles && Object.fromEntries(Object.entries(o.prFiles)
      .map(([pr, files]) => [`/api/v1/repos/${project.repository}/pulls/${pr}/files`, JSON.stringify(files)])),
    Tasks: tasks,
    Deps: o.deps && Object.fromEntries(Object.entries(o.deps).map(([issue, on]) => [id(issue), on.map(id)])),
    Plans: o.plans && byTask(o.plans),
    Questions: o.questions && byRevision(o.questions),
    Approvals: o.approvals,
    Objects: objects,
    Events: o.events,
    Chat: o.chat,
    Proposals: o.proposals,
    UsedProposals: o.usedProposals,
    Spend: o.spend,
    ChatSpend: o.chatSpend,
    GitHub: o.github,
    Alerts: o.alerts,
    Drawer: o.drawer === undefined ? undefined : id(o.drawer),
    Autonomy: o.autonomy,
    Seen: o.seen,
    Working: o.working,
    Inbox: o.inbox,
    Open: o.open,
    Routines: o.routines,
    Runs: o.runs,
    RoutinesAt: o.routinesAt?.toISOString(),
    Metrics: o.metrics,
    Costs: o.costs,
    Replies: o.replies,
  });
}

module.exports = {
  AGENT_ASKS, id, card, intake, sessionStart, session, checks, modelReview, findings, queueTurn, policyGate, approvalRequested, autoMerge, merged, recorded,
  final, supervisor, timeline, said, transcript, event, status, alert, poke, mergedPoke, livePoke, asked, mergeAsked, wake, approval, message, ask,
  proposal, proposedCall, cardFiling, steering, closing, depending, pressed, pressedThread, filedThread, steeredThread, seen,
  plan, say, call, reply, figure, metrics, nextCron, prevCron, routineRun, routineView, scene,
};
