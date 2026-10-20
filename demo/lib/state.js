const crypto = require("node:crypto");
const project = require("./project");

const AGENT_ASKS = "The agent asks: ";
const VIA_FACTORYD = "factoryd";
const EVENT_TASK_STATUS = "task_status";

const iso = (now, secondsBefore) => new Date(now.getTime() - secondsBefore * 1000).toISOString();
const stamp = (date) => date.toISOString().slice(0, 19) + "Z";
const present = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

function id(issue) {
  return "t-" + sha256(`lab ${issue}`).slice(0, 12);
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
    Author: project.login,
    AuthorWriter: true,
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

function message(now, { role, content = "", age, kind, choices, toolCalls, conversation }) {
  return present({ role, content, at: iso(now, age), kind, choices, tool_calls: toolCalls, conversation });
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
    description: `Message a running card, #${issue} ${id(issue)} ${JSON.stringify(title)}, text ${truncate(text, 120)}`,
  });
}

// pressedThread is the rows a press of Do it on p leaves, as the console stores them: the member's line at age, the
// agent's reply proposing p a second later, and the Do it's row with the tool's result two seconds after that.
function pressedThread(now, p, { line, reply, result, age }) {
  return {
    rows: [
      message(now, { role: "user", content: line, age }),
      message(now, { role: "assistant", content: reply, age: age - 1, toolCalls: [proposedCall(now, p, { id: "call_1", age: age - 1 })] }),
      pressed(now, p, { age: age - 3, result: `${result} It cannot be undone.` }),
    ],
    proposal: p,
  };
}

// filedThread is the thread of a filing from the chat.
function filedThread(now, { said: line, reply, args, issue, age }) {
  return pressedThread(now, cardFiling(now, args), { line, reply, age, result: `Filed ${project.repository}#${issue} in lane ${args.lane}.` });
}

// steeredThread is the thread of a steer from the chat.
function steeredThread(now, { said: line, reply, issue, title, text, age }) {
  return pressedThread(now, steering(now, { issue, title, text }), { line, reply, age, result: `The session of #${issue} has your message.` });
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

function metrics(now, overrides = {}) {
  const move = (value, prev, weeks) => ({ value, prev, has: true, prev_has: true, weeks });
  const flat = (value) => ({ value, prev: 0, has: true, prev_has: false, weeks: Array(7).fill(value) });
  return {
    repository: project.repository,
    from: iso(now, 27 * 86400),
    to: iso(now, 0),
    deploys: move(23, 21, [16, 17, 15, 18, 19, 21, 23]),
    lead_time: move(12000000, 13500000, [16800000, 16200000, 15600000, 15000000, 13800000, 12900000, 12000000]),
    card_cycle: move(21900000, 19500000, [18600000, 19200000, 20100000, 19800000, 21000000, 21600000, 21900000]),
    throughput: move(31, 25, [21, 23, 25, 26, 28, 29, 31]),
    change_failure: move(0.06, 0.08, [0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.06]),
    reverted_refiled: { reverted: 2, refiled: 1, prev: [2, 1], has: true, weeks: Array(7).fill(2) },
    time_to_restore: move(34200000, 37800000, [44400000, 42000000, 40200000, 38400000, 36600000, 35400000, 34200000]),
    spend: move(87.4, 82.6, [61.2, 68.4, 74.9, 71.8, 79.2, 82.6, 87.4]),
    per_card: move(2.6, 2.9, [3.4, 3.3, 3.1, 3.0, 2.9, 2.7, 2.6]),
    tokens_per_card: flat(84000),
    model_spend: [{ alias: "big", share: 89 }, { alias: "small", share: 11 }],
    served_by: [
      { alias: "zai/glm-5.3", share: 71 }, { alias: "dashscope/qwen3.8-max", share: 18 },
      { alias: "zai/glm-5.3-flash", share: 9 }, { alias: "other", share: 2 },
    ],
    interventions: move(1.4, 1.7, [1.9, 1.8, 1.7, 1.6, 1.5, 1.5, 1.4]),
    escalations: flat(5),
    escalated_share: move(0.16, 0.19, [0.23, 0.22, 0.21, 0.20, 0.19, 0.18, 0.16]),
    tool_spend: move(0.42, 0.37, [0.28, 0.31, 0.35, 0.33, 0.36, 0.37, 0.42]),
    tool_mix: [{ alias: "web_scrape", share: 61 }, { alias: "web_search", share: 35 }, { alias: "fal_run", share: 4 }],
    human_blocked: move(0.18, 0.22, [0.24, 0.23, 0.22, 0.21, 0.20, 0.19, 0.18]),
    review_acceptance: move(0.824, 0.794, [0.74, 0.76, 0.77, 0.78, 0.79, 0.80, 0.824]),
    self_deploys: move(2, 1, [1, 2, 1, 1, 2, 1, 2]),
    diff_size: { files: 9, insertions: 240, deletions: 95, prev: [9, 240, 95], has: true, weeks: Array(7).fill(9) },
    chat_tool_work: { calls: 312, minutes: 41, prev_calls: 274, prev_minutes: 36, weeks: [238, 251, 262, 274, 288, 299, 312] },
    ...overrides,
  };
}

function scene(now, o = {}) {
  const tasks = o.tasks ?? [];
  const objects = { ...o.objects };
  for (const t of tasks) objects[`sessions/${t.ID}/timeline.jsonl`] ??= "";
  return present({
    Project: { Name: project.name, Repository: project.repository, Login: project.login },
    Projects: project.rows,
    Config: project.config,
    MonthCap: project.monthCap,
    PRFiles: o.prFiles && Object.fromEntries(Object.entries(o.prFiles)
      .map(([pr, files]) => [`/api/v1/repos/${project.repository}/pulls/${pr}/files`, JSON.stringify(files)])),
    Tasks: tasks,
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
    Metrics: o.metrics,
    Replies: o.replies,
  });
}

module.exports = {
  AGENT_ASKS, id, card, intake, sessionStart, session, checks, modelReview, findings, supervisor, timeline, said, transcript, event,
  status, alert, approval, message, ask, proposal, proposedCall, cardFiling, steering, pressed, filedThread, steeredThread, seen, plan, say, call, reply,
  metrics, scene,
};
