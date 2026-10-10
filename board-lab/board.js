// board lab: the project screen (status line, pulse, five-column board beside
// the project chat, card drawer) over the real linkshort2/linkshort4/
// linkshort3/notes data extracted in Task 142. Static, no build, one file.
"use strict";

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const COLUMNS = [
  { lane: "backlog", title: "Backlog" }, { lane: "plan", title: "Plan" },
  { lane: "ready", title: "Ready" },
  { status: "running", title: "Running" },
  { status: "waiting-human", title: "Waiting on a human" },
  { status: "waiting-poster", title: "Waiting on the author" },
  { status: "in-review", title: "In review" },
  { status: "done", title: "Done" },
  { status: "failed", title: "Failed" },
  { status: "closed", title: "Closed" },
];
// The split view's columns: a fixed grouping of the factory's states, not a
// state machine of their own.
const FIVE = [
  { key: "needs", title: "Needs you", tip: "waiting on a human (approvals, questions, plan acceptance), and waiting on the author when you are the author" },
  { key: "queued", title: "Queued", tip: "backlog, queued in a lane, waiting on dependencies" },
  { key: "working", title: "Working", tip: "an agent session runs (running, closing)" },
  { key: "verifying", title: "Verifying", tip: "in review: checks, gates, model review, merge queue" },
  { key: "done", title: "Done", tip: "done, failed or closed" },
];
const LANES = ["backlog", "plan", "ready"];
const VIEWER = "sebastian";
const CAP_EUR = 10;
const STATUS_TEXT = {
  running: "running", "waiting-human": "waiting on you",
  "waiting-poster": "waiting on author", "in-review": "in review",
  done: "done", failed: "failed", closed: "closed",
  lane: "queued", "lane-wait": "waiting on deps",
};
const ENDED = ["done", "failed", "closed"];
const ACCENTS = ["1", "2", "3", "4", "5", "6", "7", "8"];
// The objective's shape: a headline line, a provenance line ("Card x of plan
// #n, accepted by ... Written by the planner."), then the body.
const objLines = (c) => (c.objective || "").split("\n").map((s) => s.trim()).filter(Boolean);
const headline = (c) => objLines(c)[0] || title(c);
const provenance = (c) => (/^Card .*(of plan|accepted|written by)/i.test(objLines(c)[1] || "") ? objLines(c)[1] : "");
function about(c) {
  const override = store.get("summaries", {})[c.id];
  if (override !== undefined) return override;
  const lines = objLines(c);
  let i = provenance(c) ? 2 : 1;
  const s = lines.slice(i).join(" ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const cut = s.split(/(?<=[.!?])\s/).slice(0, 2).join(" ");
  return cut.length > 190 ? cut.slice(0, 187) + "…" : cut;
}
const roleOf = (c) => c.kind === "human" ? "human" : c.parent_task ? "exec" : c.lane === "plan" ? "plan" : "";
const tierOf = (c) => /frontier/.test(c.model_alias) ? "frontier" : /cheap/.test(c.model_alias) ? "cheap" : "";
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("bl:" + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem("bl:" + k, JSON.stringify(v)); },
};
const fmt = {
  eur: (v) => "€" + v.toFixed(2),
  min: (m) => { const r = Math.round(m); return r >= 60 ? Math.floor(r / 60) + " h " + (r % 60) + "m" : r + "m"; },
  clock: (t) => new Date(t).toISOString().slice(5, 16).replace("T", " ") + "Z",
  hm: (t) => new Date(t).toISOString().slice(11, 16) + "Z",
};
const ms = (t) => new Date(t).getTime();
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

let DATA, BYID; // cards by id
let T = 0; // the board clock (ms epoch)
let playing = false;
let VIEW = "split"; // "split": board beside the chat; "wide": today's full-width board
const transcriptCache = {};

const state = () => store.get("state", { theme: "dark", accents: {}, comments: {}, read: {} });
const cardLane = (c, evs) => {
  const e = [...evs].reverse().find((x) => x.step === "event" && x.event === "card_entered_lane");
  return e ? e.lane : c.lane || "backlog";
};
const escText = (e) => e.reason || e.guidance || e.digest || "";
const projectOf = (c) => c.repository.split("/")[0];
const project = () => $("#project").value;

// Where a card sits and what it shows at time T, derived from its events.
function cardState(c, t) {
  const evs = c.timeline.filter((e) => ms(e.time) <= t);
  const s = {
    id: c.id, col: null, status: "backlog", lane: cardLane(c, evs),
    title: c.plan_key || firstClause(c.objective), ref: c.issue_number,
    telemetry: [], activity: "", badges: [], approvals: [], children: null,
    stale: false, failed: false, retrying: false, running: false, waitingMin: 0, pr: 0,
    spend: 0, doneAt: null, escalation: null, posterAt: null,
  };
  const created = ms(c.created_at);
  let waiting = false, lastStep = "", inSession = false, sessionStart = null;
  s.spend = c.ledger.filter((l) => ms(l.created_at) <= t).reduce((a, l) => a + l.eur, 0);
  for (const e of evs) {
    switch (e.step) {
      case "dependencies_wait": waiting = "deps"; break;
      case "dependencies_done": if (waiting === "deps") waiting = false; break;
      case "session_start": inSession = true; sessionStart = e.time; waiting = false; s.failed = false; s.retrying = false; s.escalation = null; s.posterAt = null; break;
      case "escalated": waiting = "human"; s.activity = escText(e); s.escalation = e; break;
      case "session_end":
        inSession = false;
        // pushed and reported are the normal ends; escalate is followed by the
        // escalated event, retry_* by the supervisor's next session
        if (e.outcome === "needs_info") { waiting = "poster"; s.posterAt = e.time; }
        else if (e.outcome === "escalate") waiting = "human";
        else if (/^retry/.test(e.outcome || "")) s.retrying = true;
        else if (e.outcome && !["pushed", "reported"].includes(e.outcome)) { s.failed = true; waiting = false; }
        if (e.summary) s.activity = e.summary.split("\n")[0];
        break;
      case "pr_opened": s.pr = e.number || e.pr || s.pr; waiting = false; break;
      case "approval_requested": waiting = "human"; break;
      case "signal": waiting = false; s.escalation = null; s.posterAt = null; break;
      case "merged": case "final": waiting = false; s.done = true; s.doneAt = s.doneAt || e.time; break;
    }
    if (e.step) lastStep = e.step;
  }
  if (s.done || c.status === "done" && finishedBy(c, t)) { s.status = "done"; s.doneAt = s.doneAt || c.finished_at; }
  else if (s.failed) s.status = "failed";
  else if (waiting === "human") s.status = "waiting-human";
  else if (waiting === "poster") s.status = "waiting-poster";
  else if (s.pr && !inSession) s.status = "in-review";
  else if (inSession) s.status = "running";
  else if (waiting === "deps") s.status = "lane-wait";
  else s.status = "lane";
  s.col = s.status.startsWith("lane") ? s.lane : s.status;
  const moved = store.get("moves", {})[c.id];
  if (moved && s.status.startsWith("lane")) { s.lane = moved; s.col = moved; }
  if (ENDED.includes(c.status) && finishedBy(c, t) && !s.done && !s.failed)
    { s.status = c.status; s.col = c.status; }
  // telemetry
  if (s.status === "running" && sessionStart) {
    const el = (t - ms(sessionStart)) / 60000;
    s.telemetry.push(fmt.min(el));
    s.stale = el > 30;
  } else if (ENDED.includes(s.status) && c.finished_at) {
    s.telemetry.push(fmt.min((new Date(c.finished_at) - created) / 60000) + " in all");
  } else if (waiting) {
    const last = ms(evs[evs.length - 1].time);
    s.waitingMin = (t - last) / 60000;
    s.telemetry.push("waiting " + fmt.min(s.waitingMin));
  }
  const used = c.budget_eur ? s.spend / c.budget_eur : 0;
  s.telemetry.push((used >= 0.8 ? "⚠ " : "") + fmt.eur(s.spend) + " / " + fmt.eur(c.budget_eur) + (used >= 0.8 ? ` (${Math.round(used * 100)}% of budget)` : ""));
  if (s.pr) s.telemetry.push("PR #" + s.pr);
  // checks state: the last checks run says green or red; findings after it
  // turn red; the merge queue says queued
  for (const e of evs) {
    if (e.step === "checks") s.checks = e.state === "success" ? "✓" : "✗";
    if (e.step === "stage_findings" && (e.findings || []).length) s.checks = "✗";
    if (e.step === "queue_entered") s.checks = "queued";
    if (e.step === "merged") s.checks = "✓";
  }
  if (s.checks && s.status !== "lane" && s.status !== "lane-wait")
    s.telemetry.push("checks " + s.checks);
  // evidence for a finished card: commit, checks, review verdict
  if (ENDED.includes(s.status)) {
    const opened = [...evs].reverse().find((e) => e.step === "pr_opened" && e.commit);
    const decided = c.approvals.filter((a) => a.decided_at || s.status === "done").pop();
    s.evidence = [
      opened ? "commit " + opened.commit.slice(0, 7) : "",
      s.checks ? "checks " + s.checks : "",
      decided?.spec?.review?.verdict ? "review " + decided.spec.review.verdict : "",
    ].filter(Boolean);
  }
  // activity line: waiting cards say why; running show the last step
  if (s.status === "waiting-human" && s.escalation) s.activity = escText(s.escalation);
  else if (!s.activity && evs.length) s.activity = lastStep.replace(/_/g, " ");
  s.approvals = c.approvals.filter((a) =>
    ms(a.created_at) <= t &&
    (!a.decided_at || ms(a.decided_at) > t) &&
    s.status === "waiting-human");
  return s;
}
const finishedBy = (c, t) => c.finished_at && ms(c.finished_at) <= t;
function firstClause(o) {
  const s = (o || "").replace(/\s+/g, " ").trim();
  const cut = s.split(/(?<=[.;:])\s/)[0];
  return (cut.length > 4 && cut.length <= 72 ? cut : s.slice(0, 68)).trim();
}
const title = (c) => (c.plan_key ? c.plan_key[0].toUpperCase() + c.plan_key.slice(1) : firstClause(c.objective));
const refTitle = (c) => `#${c.issue_number} ${title(c)}`;

// The proposal's column table: waiting on a human -> Needs you (and waiting on
// the author when the viewer is the author); lanes and dependency waits ->
// Queued; running -> Working; in review -> Verifying; ended -> Done.
function fiveCol(c, s) {
  if (s.status === "waiting-human") return "needs";
  if (s.status === "waiting-poster") return c.author === VIEWER ? "needs" : "queued";
  if (s.status === "running" || s.status === "closing") return "working";
  if (s.status === "in-review") return "verifying";
  if (ENDED.includes(s.status)) return "done";
  return "queued";
}

// The agent's question on a waiting card, with its structured choices where
// the text carries them ("Options: (a) ...; (b) ...; (c) ...").
function questionOf(c, s) {
  let raw, at;
  if (s.status === "waiting-human" && s.escalation && !s.approvals.length) { raw = escText(s.escalation); at = s.escalation.time; }
  else if (s.status === "waiting-poster" && s.posterAt) { raw = s.activity; at = s.posterAt; }
  else return null;
  const body = raw.replace(/^The agent asks:\s*/i, "").replace(/^Card [\w-]+:\s*/i, "");
  const [ask, rest = ""] = body.split(/\s*Options?:\s*/i);
  const opts = (rest.split("\n")[0].match(/\([a-z]\)[^;]*/g) || []).map((o) => o.replace(/[.\s]+$/, "")).slice(0, 3);
  return { key: c.id + "@" + at, at, text: ask.split("\n")[0].trim(), choices: opts.length ? opts : ["Yes", "No"] };
}

// Everything the screen shows about the project at T.
function snapshot() {
  const p = project();
  const all = DATA.cards
    .filter((c) => projectOf(c) === p && ms(c.created_at) <= T)
    .map((c) => ({ c, s: cardState(c, T) }));
  const cols = Object.fromEntries(FIVE.map((f) => [f.key, []]));
  for (const x of all) cols[fiveCol(x.c, x.s)].push(x);
  const since = (x) => ms(x.s.approvals[0]?.created_at || x.s.escalation?.time || x.s.posterAt || x.c.created_at);
  cols.needs.sort((a, b) => since(a) - since(b));
  cols.done.sort((a, b) => ms(b.s.doneAt || 0) - ms(a.s.doneAt || 0));
  const needIds = new Set(cols.needs.map((x) => x.c.issue_number));
  const blocked = all.filter((x) => !ENDED.includes(x.s.status) && !needIds.has(x.c.issue_number) &&
    x.c.deps.some((d) => needIds.has(d)));
  const spend = all.reduce((a, x) => a + x.s.spend, 0);
  const word = cols.working.length + cols.verifying.length ? "working" : cols.needs.length ? "waiting on you" : "idle";
  return { name: p, all, cols, blocked, spend, word };
}

// ---- status line and pulse ------------------------------------------------
function renderStatus(sn) {
  const n = sn.cols.needs.length, w = sn.cols.working.length, pct = sn.spend / CAP_EUR, over = pct >= 0.8;
  const icon = { working: "●", "waiting on you": "◆", idle: "○" }[sn.word];
  $("#statusline").innerHTML = `
    <strong class="pname">${esc(sn.name)}</strong>
    <span class="stateword ${sn.word.replace(/ /g, "-")}" title="the project's state at the board clock: working, waiting on you or idle">${icon} ${sn.word}</span>
    <a href="#" class="fig" data-fig="working" data-page="the running cards list" title="opens the running cards list">${w} working</a>
    <a href="#" class="fig ${n ? "need" : ""}" data-fig="needs" data-page="the needs-you list" title="opens the needs-you list">${n} need${n === 1 ? "s" : ""} you</a>
    <a href="#" class="fig ${over ? "over" : ""}" data-fig="spend" data-page="the costs page" title="opens the costs page: the project's spend against its monthly cap">${over ? "⚠ " : ""}${fmt.eur(sn.spend)} / €${CAP_EUR}${over ? ` · ${Math.round(pct * 100)}% of the cap` : ""}</a>
    <a href="#" class="fig" data-fig="github" data-page="the GitHub mirror panel" title="opens the GitHub mirror panel (a static demo value)">GitHub ✓</a>`;
  $$("#statusline a.fig").forEach((a) => a.onclick = (e) => {
    e.preventDefault();
    toast(`the console opens ${a.dataset.page} here; the dummy has no pages`);
  });
}

function pulseOf(sn) {
  const { needs, working, verifying, done } = sn.cols;
  const failed = sn.all.filter((x) => x.s.status === "failed");
  if (needs.length) {
    const m = sn.blocked.length;
    const blocks = (one) => (m ? ` and block${one ? "s" : ""} ${m} card${m === 1 ? "" : "s"}` : "");
    if (needs.length === 1) {
      const x = needs[0], a = x.s.approvals[0];
      const what = a ? (a.kind === "plan" ? "your plan acceptance" : "your approval to merge")
        : questionOf(x.c, x.s) ? "your answer" : "your input";
      return { level: "alert", icon: "⚑", text: `${refTitle(x.c)} needs ${what}${blocks(true)}.` };
    }
    return { level: "alert", icon: "⚑", text: `${needs.length} cards need your input${blocks(false)}.` };
  }
  if (failed.length) {
    const x = failed[failed.length - 1];
    return { level: "alert", icon: "✕", text: `${refTitle(x.c)} failed: ${short(x.s.activity || "no reason recorded", 90)}` };
  }
  if (working.length || verifying.length) {
    const last = done[0];
    const n = [working.length && `${working.length} running`, verifying.length && `${verifying.length} in review`].filter(Boolean).join(", ");
    return { level: "normal", icon: "✦", text: `${n}, last done: ${last ? refTitle(last.c) : "none yet"}.` };
  }
  return { level: "quiet", icon: "·", text: sn.all.length ? `All quiet: ${done.length} of ${sn.all.length} cards done, nothing running.` : "All quiet: no cards yet." };
}

function pulseBullets(sn) {
  const since = T - 3600000;
  const why = (x) => x.s.approvals[0] ? (x.s.approvals[0].kind === "plan" ? "plan acceptance" : `merge PR #${x.s.approvals[0].pr_number || x.s.pr}`)
    : questionOf(x.c, x.s) ? "a question" : STATUS_TEXT[x.s.status];
  const needs = sn.cols.needs.map((x) => `${refTitle(x.c)} (${why(x)}, ${fmt.min(x.s.waitingMin)})`);
  const run = sn.cols.working.map((x) => `${refTitle(x.c)} (${x.s.telemetry[0]})`);
  const rev = sn.cols.verifying.map((x) => refTitle(x.c));
  const doneSince = sn.all.filter((x) => x.s.doneAt && ms(x.s.doneAt) > since)
    .sort((a, b) => ms(a.s.doneAt) - ms(b.s.doneAt))
    .map((x) => `${refTitle(x.c)} ${x.s.status} ${fmt.hm(x.s.doneAt)}`);
  const mine = store.get("acts", []).filter((a) => a.project === sn.name && a.T > since && a.T <= T)
    .map((a) => `you${a.via === "chat" ? " via chat" : ""}: ${a.text}`);
  const pct = Math.round(sn.spend / CAP_EUR * 100);
  return [
    `Needs you: ${needs.join("; ") || "nothing"}`,
    `Running: ${run.join("; ") || "nothing"}${rev.length ? `; in review: ${rev.join(", ")}` : ""}`,
    `Since ${fmt.hm(since)}: ${[...doneSince, ...mine].join("; ") || "nothing finished, nothing done by you"}`,
    `Spend: ${fmt.eur(sn.spend)} of the €${CAP_EUR} monthly cap (${pct}%)${pct >= 80 ? " ⚠ above 80 percent" : ""}`,
  ];
}

let pulseText = null, pulseTimer = 0, pulseOpen = false;
function renderPulse(sn) {
  const p = pulseOf(sn), el = $("#pulse");
  el.className = p.level;
  if (p.text !== pulseText) {
    pulseText = p.text;
    $(".say", el).innerHTML = `<span class="typing" title="the pulse recomputes"><i></i><i></i><i></i></span>`;
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => {
      $(".say", el).innerHTML = `<span class="picon" aria-hidden="true">${p.icon}</span> ${esc(pulseText)}`;
    }, 600);
  }
  const ul = $(".bullets", el);
  ul.hidden = !pulseOpen;
  if (pulseOpen) ul.innerHTML = pulseBullets(sn).map((b) => `<li>${esc(b)}</li>`).join("");
  $("#more").textContent = pulseOpen ? "less" : "more";
  $("#more").setAttribute("aria-expanded", pulseOpen);
}

// ---- the board ------------------------------------------------------------
function render() {
  const st = state(), sn = snapshot();
  renderStatus(sn);
  renderPulse(sn);
  const af = $("#accentfilter").value;
  const shown = (x) => af === "" || (st.accents[x.c.id] || "") === af;
  if (VIEW === "wide") renderWide(sn, st, shown); else renderFive(sn, st, shown);
  $("#when").textContent = T ? fmt.clock(T) : "end state";
  $("#clock").value = T;
  bindCards();
}

function renderFive(sn, st, shown) {
  const b = $("#board");
  b.className = "five";
  b.innerHTML = FIVE.map((f) => {
    const list = sn.cols[f.key].filter(shown);
    return `<section class="column" data-col="${f.key}">
      <header title="${esc(f.tip)}"><span class="name">${f.title}</span><span class="count">${list.length}</span></header>
      ${list.map(({ c, s }) => cardHTML(c, s, st, true)).join("")}
    </section>`;
  }).join("");
}

function needsItems(list) {
  const needs = [];
  for (const { c, s } of list) {
    for (const a of s.approvals)
      needs.push({ c, kind: a.kind === "merge" ? "approve merge" : a.kind === "plan" ? "approve plan" : a.kind,
        why: approvalWhy(c, a), ask: (a.spec && a.spec.review && a.spec.review.summary) || a.reason || "", when: a.created_at, a });
    const q = questionOf(c, s);
    if (q && (s.status === "waiting-human" || c.author === VIEWER))
      needs.push({ c, kind: "question", why: "the agent asks", ask: q.text, when: q.at, q });
  }
  return needs.sort((x, y) => ms(x.when) - ms(y.when));
}

function renderWide(sn, st, shown) {
  const cards = sn.all.filter(shown);
  const needs = needsItems(cards);
  $("#needsyou").innerHTML = needs.length ? needs.map((n, i) => `
    <div class="decision" data-i="${i}" data-id="${n.c.id}">
      <div><span class="ref">#${n.c.issue_number}</span> <strong>${esc(title(n.c))}</strong>
        <span class="badgechip">${n.kind}</span></div>
      <div class="why">${esc(n.why)}<div class="ask">${esc(n.ask).slice(0, 220)}</div></div>
      <div class="acts">
        ${n.a ? `<button data-act="approve">Approve</button><button class="deny" data-act="deny">Request changes</button>`
              : answerHTML(n.q)}
      </div>
    </div>`).join("")
    : `<div class="empty">nothing waits on you at this moment</div>`;
  const cols = COLUMNS.map((col) => ({ col, cards: [] }));
  const byCol = Object.fromEntries(cols.map((x) => [x.col.lane || x.col.status, x]));
  for (const x of cards) (byCol[x.s.col] || byCol.done).cards.push(x);
  const b = $("#board");
  b.className = "wide";
  b.innerHTML = cols.map(({ col, cards: list }) => `
    <section class="column" data-col="${col.lane || col.status}">
      <header><span class="name">${col.title}</span><span class="count">${list.length}</span></header>
      ${list.map(({ c, s }) => cardHTML(c, s, st, false)).join("")}
    </section>`).join("");
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const accentVar = (a) => `var(--human-${a})`;
function cardHTML(c, s, st, five) {
  const accent = st.accents[c.id];
  const comments = st.comments[c.id] || [];
  const unread = comments.length && !st.read[c.id];
  const laneState = s.status === "lane" || s.status === "lane-wait";
  const pill = laneState && !five
    ? `<span class="pill" style="background:transparent;color:var(--text-muted);border:1px solid var(--line-strong)" title="${esc(statusTip(s))}">${s.lane}</span>`
    : `<span class="pill" style="${pillStyle(s)}" title="${esc(statusTip(s))}">${STATUS_TEXT[s.status] || s.status}</span>`;
  const open = s.status === "lane-wait" ? c.deps.filter((d) => {
    const k = DATA.cards.find((x) => x.issue_number === d && x.repository === c.repository);
    return k && !ENDED.includes(cardState(k, T).status);
  }) : [];
  const blockedBy = open.length ? `<span class="badgechip" title="this card waits on these cards">blocked by #${open.join(" #")}</span>` : "";
  const fine = [
    s.stale ? `<span class="badgechip stalechip" title="no news from this session for over 30 minutes">stale</span>` : "",
    s.retrying ? `<span class="badgechip" title="the supervisor ended the session and starts a new one, on a stronger model">retrying</span>` : "",
  ].join("");
  const badges = [];
  const role = roleOf(c), tier = tierOf(c);
  if (role) badges.push(`<span class="badgechip" title="${role === "plan" ? "the planner card" : "an execution card of an accepted plan"}">${role}</span>`);
  if (tier) badges.push(`<span class="badgechip" title="the model tier of the last session">${tier}</span>`);
  if (c.model_alias) badges.push(`<span class="badgechip" title="the model of the last session">${esc(c.model_alias.replace("factory/", ""))}</span>`);
  if (blockedBy) badges.push(blockedBy);
  if (c.parent_task) badges.push(`<span class="badgechip" data-open="${c.parent_task}" title="open the plan card">part of plan #${BYID[c.parent_task]?.issue_number || "?"}</span>`);
  const chips = five ? `<div class="badges"><span class="badgechip lanechip" title="the card's lane: the process's lanes are chips here, the wide view shows them as columns">${s.lane}</span>${fine}${blockedBy}</div>` : "";
  const q = questionOf(c, s);
  const needs = s.status === "waiting-human" || s.status === "waiting-poster";
  const reason = !needs ? "" : s.approvals.length
    ? `${approvalWhy(c, s.approvals[0])}: ${s.approvals[0].spec?.review?.summary || s.approvals[0].reason || ""}`
    : q ? q.text : s.activity;
  const draggable = !five && s.status === "lane" && s.lane === "backlog";
  return `
  <article class="card ${s.stale ? "stale" : ""} ${unread ? "unread" : ""} ${needs ? "needs" : ""} ${draggable ? "draggable" : ""}"
    data-id="${c.id}" tabindex="0" ${draggable ? `draggable="true"` : ""} style="${accent ? `--acc:${accentVar(accent)}` : ""}">
    ${accent ? `<span class="accent-edge" style="background:var(--acc)" title="your accent on this card"></span>` : ""}
    <div class="line1">
      <span class="ref">#${c.issue_number}</span>
      <span class="title" title="${esc(headline(c))}">${esc(title(c))}</span>
      ${accent ? `<span class="humantag" style="background:var(--acc)" title="your accent on this card"></span>` : ""}
      ${unread ? `<span class="bubble" title="unread comments">◍ ${comments.length}</span>` : ""}
    </div>
    ${about(c) && !five ? `<div class="about" title="${esc(about(c))}">${esc(about(c))}</div>` : ""}
    <div class="telemetry" title="${esc(statusTip(s))}">${pill} ${s.telemetry.map((t) => `<span${t.startsWith("⚠") ? ` class="over"` : ""}>${esc(t)}</span>`).join("")}</div>
    ${needs && five ? `<div class="reason" title="${esc(reason)}">${esc(reason)}</div>` : `<div class="activity">${esc(s.activity).slice(0, 110)}</div>`}
    ${five ? chips : badges.length || fine ? `<div class="badges">${badges.join("")}${fine}</div>` : ""}
    ${five ? "" : childrenRollup(c, s)}
    ${s.status === "lane" ? `<div class="buttons">${["plan", "ready"].filter((l) => l !== s.lane).map((l) =>
      `<button data-move="${l}" title="the console's move form: only a lane start, never a machine-owned state">to ${l}</button>`).join("")}</div>` : ""}
    ${s.approvals.length ? `<div class="buttons"><button data-act="approve" title="approve and let the run continue (the dummy jumps to the recorded decision)">Approve</button><button class="deny" data-act="deny" title="deny with a redirect: empty cancels, text regenerates">Request changes</button></div>` : ""}
    ${q && (five ? fiveCol(c, s) === "needs" : true) ? answerHTML(q) : ""}
    ${s.evidence ? `<div class="evidence" title="the proof this card carries: commit, checks, review verdict">${s.evidence.join(" · ")}</div>` : ""}
  </article>`;
}
// inline answer: the agent's choices as buttons plus a text box
function answerHTML(q) {
  const done = store.get("answers", {})[q.key];
  if (done) return `<div class="answered" title="kept in this browser; the console posts it as the issue comment the agent reads">✓ you answered: ${esc(short(done.text, 80))} <button class="mini" data-unanswer="${esc(q.key)}" title="take the answer back">undo</button></div>`;
  return `<div class="answer" data-key="${esc(q.key)}">
    <div class="choices">${q.choices.map((ch, i) => `<button data-choice="${i}" title="${esc(ch)}">${esc(ch)}</button>`).join("")}</div>
    <div class="answerbox"><input type="text" aria-label="your answer" placeholder="or write your answer"><button data-answersend title="send the answer to the agent">send</button></div>
  </div>`;
}
// a plan card summarizes its children (steal 12), never lists them
function childrenRollup(c) {
  const kids = DATA.cards.filter((k) => k.parent_task === c.id && ms(k.created_at) <= T);
  if (!kids.length) return "";
  const counts = {};
  for (const k of kids) { const st = cardState(k, T).status; counts[st] = (counts[st] || 0) + 1; }
  const parts = Object.entries(counts).map(([k, n]) => `${n} ${STATUS_TEXT[k] || k}`);
  return `<div class="children">${kids.length} children: ${esc(parts.join(" · "))}</div>`;
}
function pillStyle(s) {
  const map = {
    running: ["var(--running)", "var(--accent-ink)"], done: ["var(--done)", "oklch(0.15 0.02 150)"],
    failed: ["var(--failed)", "oklch(0.98 0.01 25)"], closed: ["var(--closed)", "var(--bg)"],
    "waiting-human": ["var(--waiting)", "var(--waiting-ink)"], "waiting-poster": ["var(--bg-raised)", "var(--waiting)"],
    "in-review": ["var(--review)", "oklch(0.15 0.02 300)"],
    lane: ["var(--line-strong)", "var(--text-muted)"], "lane-wait": ["var(--line-strong)", "var(--text-muted)"],
  }[s.status];
  if (!map) return "";
  const hollow = ["waiting-poster", "lane", "lane-wait"].includes(s.status);
  return `background:${hollow ? "transparent" : map[0]};color:${map[1]}${hollow ? `;border:1px solid ${map[0]}` : ""}`;
}
function approvalWhy(c, a) {
  if (a.kind === "merge") return `merge PR #${a.pr_number} on ${c.repository.split("/")[1]}`;
  if (a.kind === "plan") return `the plan for #${c.issue_number} waits for your accept`;
  return a.reason || "a resource request waits for you";
}

// ---- actions: one path for buttons and the chat ----------------------------
// Every action the human takes is kept in this browser with its board time,
// so the pulse can list it and undo can revert it.
function applyAct(act, via) {
  const c = BYID[act.card], a = { ...act, via, id: "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    project: projectOf(c), ref: c.issue_number };
  if (a.kind === "move") {
    const mv = store.get("moves", {});
    a.prev = mv[c.id] ?? null; mv[c.id] = a.lane; store.set("moves", mv);
    a.text = `moved #${c.issue_number} to ${a.lane}`;
  } else if (a.kind === "answer") {
    const an = store.get("answers", {});
    an[a.key] = { text: a.answer, T }; store.set("answers", an);
    a.text = `answered #${c.issue_number}: ${short(a.answer, 60)}`;
  } else if (a.kind === "steer" || a.kind === "request_changes") {
    const q = store.get("queue", {});
    (q[c.id] = q[c.id] || []).push({ text: a.message, when: fmt.clock(Date.now()), act: a.id });
    store.set("queue", q);
    a.text = `${a.kind === "steer" ? "steered" : "requested changes on"} #${c.issue_number}: ${short(a.message, 60)}`;
  } else if (a.kind === "approve") {
    const s = cardState(c, T);
    decisionAct("approve", c, s.approvals[0], null);
    a.text = `approved #${c.issue_number}`;
  }
  a.T = T;
  const acts = store.get("acts", []); acts.push(a); store.set("acts", acts);
  render();
  return a;
}
function undoAct(id) {
  const acts = store.get("acts", []), a = acts.find((x) => x.id === id);
  if (!a) return;
  if (a.kind === "move") {
    const mv = store.get("moves", {});
    if (a.prev == null) delete mv[a.card]; else mv[a.card] = a.prev;
    store.set("moves", mv);
  } else if (a.kind === "answer") {
    const an = store.get("answers", {}); delete an[a.key]; store.set("answers", an);
  } else if (a.kind === "steer" || a.kind === "request_changes") {
    const q = store.get("queue", {});
    q[a.card] = (q[a.card] || []).filter((m) => m.act !== a.id); store.set("queue", q);
  }
  store.set("acts", acts.filter((x) => x.id !== id));
  render();
}
// why an action cannot apply at T, or "" when it can
function actError(a) {
  const c = BYID[a.card], s = cardState(c, T), ref = `#${c.issue_number}`, at = fmt.clock(T);
  if (a.kind === "move") {
    if (!LANES.includes(a.lane)) return `"${a.lane}" is not a lane; the lanes are backlog, plan and ready.`;
    if (!s.status.startsWith("lane")) return `${ref} is ${STATUS_TEXT[s.status]} at ${at}. Only a card that waits in a lane moves; running, review and done belong to the factory's state machine and change by its buttons, never by a move (ruling 246).`;
    if (s.lane === a.lane) return `${ref} already sits in ${a.lane}.`;
  }
  if (a.kind === "approve" && !s.approvals.length) return `Nothing on ${ref} waits for an approval at ${at}.`;
  if (a.kind === "answer" && !questionOf(c, s))
    return `${ref} asks nothing at ${at}${s.approvals.length ? `; it waits for an approval, say "approve ${ref}"` : ""}.`;
  if (a.kind === "steer" && ENDED.includes(s.status)) return `${ref} is ${s.status}; no agent runs on it to steer.`;
  return "";
}

// ---- interaction ----------------------------------------------------------
function bindCards() {
  $$(".card").forEach((el) => {
    const c = BYID[el.dataset.id];
    el.addEventListener("click", (e) => {
      if (e.target.closest("button, input, .answer, [data-open]")) return;
      openDetail(c);
    });
    el.addEventListener("mouseenter", () => schedulePeek(c, el));
    el.addEventListener("mouseleave", cancelPeek);
    el.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", c.id); el.classList.add("dragging"); });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
  });
  $$(".card [data-open]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); if (BYID[b.dataset.open]) openDetail(BYID[b.dataset.open]); }));
  $$(".card [data-act]").forEach((b) =>
    b.addEventListener("click", (e) => { e.stopPropagation(); decisionAct(b.dataset.act, BYID[b.closest(".card").dataset.id], null, b); }));
  $$(".card [data-move]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      applyAct({ kind: "move", card: b.closest(".card").dataset.id, lane: b.dataset.move }, "card");
      toast(`moved to ${b.dataset.move} — the dummy keeps this locally; the console files the lane's move form`);
    }));
  $$("#needsyou [data-act]").forEach((b) =>
    b.addEventListener("click", () => {
      const d = b.closest(".decision");
      decisionAct(b.dataset.act, BYID[d.dataset.id], null, b);
    }));
  $$(".answer").forEach((box) => {
    const c = BYID[box.closest("[data-id]").dataset.id], key = box.dataset.key;
    const q = questionOf(c, cardState(c, T)), inp = $("input", box);
    const send = (text) => {
      if (!text) return;
      applyAct({ kind: "answer", card: c.id, key, answer: text }, "card");
      toast("answer kept in this browser; the console posts it as the issue comment the agent reads");
    };
    $$("[data-choice]", box).forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const ch = q.choices[+b.dataset.choice];
      if (/something else|other/i.test(ch)) inp.focus(); else send(ch);
    });
    $("[data-answersend]", box).onclick = (e) => { e.stopPropagation(); send(inp.value.trim()); };
    inp.onkeydown = (e) => { if (e.key === "Enter") send(inp.value.trim()); };
  });
  $$("[data-unanswer]").forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const a = store.get("acts", []).find((x) => x.kind === "answer" && x.key === b.dataset.unanswer);
    if (a) undoAct(a.id);
    else { const an = store.get("answers", {}); delete an[b.dataset.unanswer]; store.set("answers", an); render(); }
  });
}
function decisionAct(act, c, a, fromEl) {
  const t = T;
  if (act === "deny") { denyBox(fromEl, c); return; }
  if (act === "approve" && fromEl) { applyAct({ kind: "approve", card: c.id }, "card"); return; }
  const after = (a && a.decided_at) || nextDecision(c, t);
  if (after) { setClock(ms(after)); toast(`recorded decision applied; the clock jumped to ${fmt.clock(after)}`); }
  else toast("the dummy replays history; this card has no later decision recorded", true);
}
// the redirect box (Automaker's rule): empty cancels the deny, text becomes
// the agent's next instruction
function denyBox(fromEl, c) {
  $$(".denybox").forEach((b) => b.remove());
  if (!fromEl) { toast("the redirect box: empty cancels, text regenerates", true); return; }
  const box = document.createElement("div");
  box.className = "denybox";
  box.innerHTML = `<input type="text" placeholder="what would make it yes? empty cancels the request"><button data-dsend>request changes</button><button data-dcancel>✕</button>`;
  fromEl.closest(".decision, .card")?.appendChild(box);
  const inp = box.querySelector("input");
  inp.focus();
  box.onclick = (e) => e.stopPropagation();
  box.querySelector("[data-dcancel]").onclick = () => box.remove();
  box.querySelector("[data-dsend]").onclick = () => {
    const text = inp.value.trim();
    box.remove();
    if (!text) return;
    applyAct({ kind: "request_changes", card: c.id, message: text }, "card");
    toast("request changes queued for the agent (empty would have cancelled)");
  };
}
const nextDecision = (c, t) => {
  const later = c.timeline.find((e) => ["signal", "session_start", "merged"].includes(e.step) && ms(e.time) > t);
  return later?.time;
};
let toastTimer;
function toast(msg, refuse) {
  const el = $("#toast");
  el.textContent = msg; el.className = refuse ? "refusal" : ""; el.style.display = "block";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.style.display = "none"), 4200);
}

// ---- the card drawer: Overview · Activity · Files · Chat ------------------
function relatedHTML(c) {
  const rel = [];
  for (const dep of c.deps) {
    const k = DATA.cards.find((x) => x.issue_number === dep && x.repository === c.repository);
    if (k) rel.push({ c: k, why: "blocked by" });
  }
  if (c.parent_task && BYID[c.parent_task]) rel.push({ c: BYID[c.parent_task], why: "part of plan" });
  const kids = DATA.cards.filter((k) => k.parent_task === c.id);
  for (const k of kids) rel.push({ c: k, why: "child" });
  if (!rel.length) return "";
  return `<section><h4>related cards</h4><ul class="related">${rel.map(({ c: k, why }) => {
    const ks = cardState(k, T);
    return `<li data-open="${k.id}"><span class="why">${why}</span>
      <span class="pill" style="${pillStyle(ks)}">${STATUS_TEXT[ks.status] || ks.status}</span>
      <strong>#${k.issue_number} ${esc(title(k))}</strong></li>`;
  }).join("")}</ul></section>`;
}

// the card's timeline up to the board clock, with the human's own actions
function activityHTML(c) {
  const evs = c.timeline.filter(visEvent).filter((e) => ms(e.time) <= T)
    .map((e) => ({ t: ms(e.time), hm: e.time.slice(11, 16), step: e.step, text: detailOf(e) }));
  const mine = store.get("acts", []).filter((a) => a.card === c.id && a.T <= T)
    .map((a) => ({ t: a.T, hm: fmt.hm(a.T).slice(0, 5), step: `you${a.via === "chat" ? " · chat" : ""}`, text: a.text, you: true }));
  const all = [...evs, ...mine].sort((a, b) => a.t - b.t);
  const later = c.timeline.filter(visEvent).length - evs.length;
  return `<section><h4>activity <span class="muted" style="text-transform:none">up to ${fmt.clock(T)}</span></h4>
    ${all.length ? `<ul class="tl">${all.map((e) => `<li class="${e.you ? "you" : ""}"><span class="t">${e.hm}</span><span class="s">${esc(e.step)}</span><span>${esc(e.text).slice(0, 140)}</span></li>`).join("")}</ul>`
      : `<p class="muted">nothing has happened on this card at this moment</p>`}
    ${later ? `<p class="muted">${later} later event${later === 1 ? "" : "s"} after the board clock</p>` : ""}</section>`;
}

// the files the agent wrote (the transcripts' file_change entries up to T)
// and the pull request's count as the policy gate saw it
async function filesHTML(c) {
  const files = new Map();
  for (const sess of c.sessions)
    for (const l of await transcript(`data/sessions/${c.id}/${sess.id}.jsonl`))
      if (l.kind === "file_change" && l.detail?.path && ms(l.time) <= T) {
        const p = l.detail.path.replace(/^\/workspace\/repo\//, "");
        const f = files.get(p) || { writes: 0 };
        files.set(p, { writes: f.writes + 1, bytes: l.detail.bytes, at: l.time });
      }
  const gate = [...c.timeline].reverse().find((e) => e.step === "gate_policy" && ms(e.time) <= T);
  if (!files.size && !gate) return `<p class="muted">${c.timeline.some((e) => e.step === "gate_policy") || c.sessions.length ? "no file changed at this moment" : "no file list in the demo data"}</p>`;
  return `${gate ? `<p class="gate" title="the policy gate's view of the pull request">PR #${gate.pr}: ${gate.changed} file${gate.changed === 1 ? "" : "s"} changed, class <strong>${esc(gate.class)}</strong>${gate.paths?.length && gate.paths.length < gate.changed ? ` (the class comes from ${gate.paths.map(esc).join(", ")})` : ""}</p>` : ""}
    ${files.size ? `<h4>written by the agent <span class="muted" style="text-transform:none">up to ${fmt.clock(T)}</span></h4>
    <ul class="files">${[...files].sort((a, b) => a[0].localeCompare(b[0])).map(([p, f]) =>
      `<li><code>${esc(p)}</code><span class="muted">${f.writes} write${f.writes === 1 ? "" : "s"} · ${(f.bytes / 1024).toFixed(1)} KB · last ${f.at.slice(11, 16)}Z</span></li>`).join("")}</ul>` : ""}`;
}

let detailTab = { id: null, tab: null };
function closeDetail() { $("#detail").classList.remove("open"); detailTab = { id: null, tab: null }; }
async function openDetail(c, tab) {
  const st = state(), s = cardState(c, T);
  tab = tab || (detailTab.id === c.id ? detailTab.tab : s.status === "running" ? "chat" : "overview");
  detailTab = { id: c.id, tab };
  const accent = st.accents[c.id];
  const comments = st.comments[c.id] || [];
  const tabs = [
    ["overview", "Overview", "facts, related cards, objective, accent, comments"],
    ["activity", "Activity", "the card's timeline up to the board clock"],
    ["files", "Files", "the files this card changed"],
    ["chat", "Chat", "the whole conversation and your steering box"],
  ];
  $("#detail").innerHTML = `
    <div class="dtop">
    <button class="close" data-x title="close (esc)">✕</button>
    <h3>#${c.issue_number} ${esc(headline(c))}</h3>
    <span class="pill" style="${pillStyle(s)}" title="${esc(statusTip(s))}">${STATUS_TEXT[s.status] || s.status}</span>
    ${[roleOf(c) && `<span class="badgechip" title="${roleOf(c) === "plan" ? "the planner card: it drafts the plan the human accepts" : "an execution card filed by an accepted plan"}">${roleOf(c)}</span>`,
       tierOf(c) && `<span class="badgechip" title="the model tier of the last session">${tierOf(c)}</span>`,
       `<span class="badgechip" title="the card's lane">${s.lane}</span>`].filter(Boolean).join(" ")}
    <span class="telemetry" style="display:inline;margin-left:.5rem" title="elapsed or waiting time · spend against budget · pull request">${s.telemetry.map(esc).join(" · ")}</span>
    </div>
    <nav class="tabs">${tabs.map(([k, label, tip]) => `<button data-tab="${k}" class="tab ${k === tab ? "on" : ""}" title="${tip}">${label}</button>`).join("")}</nav>
    <div class="pane pane-overview" data-pane="overview">
      ${about(c) !== "" ? `<p class="about" title="${esc(about(c))}">${esc(about(c))} <button class="mini" data-editabout title="edit this card's summary (the generated one or your own)">edit</button></p>` : ""}
      ${provenance(c) ? `<p class="provenance">${esc(provenance(c))}</p>` : ""}
      <dl class="facts">
        <dt>project</dt><dd>${esc(c.repository)}</dd>
        <dt>model</dt><dd>${esc(c.model_alias || "–")}</dd>
        <dt>author</dt><dd>${esc(c.author)}</dd>
        <dt>links</dt><dd>${c.issue_url ? `<a href="${c.issue_url}">issue</a>` : ""} ${c.pr_url ? `<a href="${c.pr_url}">PR #${c.pr_number}</a>` : ""}</dd>
      </dl>
      ${relatedHTML(c)}
      <details class="fold"><summary title="the objective exactly as filed">full objective</summary><div class="objective">${esc(c.objective)}</div></details>
      <section><h4>accent</h4>
        <div class="accents">${ACCENTS.map((a) => `<span class="swatch ${accent === a ? "set" : ""}" data-acc="${a}" style="background:${accentVar(a)}" title="accent ${a}: your own colour, never a state"></span>`).join("")}
        ${accent ? `<button data-acc="clear" title="remove this card's accent">clear</button>` : ""}</div>
      </section>
      <section class="commentform"><h4>comments</h4>
        ${comments.map((m, i) => `<div class="msg"><div class="who">${esc(m.who)} · ${esc(m.when)} <button class="mini" data-ce="${i}" title="edit this comment">✎</button> <button class="mini" data-cd="${i}" title="remove this comment">✕</button></div>${esc(m.text)}</div>`).join("")}
        <textarea placeholder="a comment for this card; the dummy keeps it in this browser, the console would file an issue comment"></textarea>
        <button data-c title="the comment stays on the card; the agent reads it on its next session">comment</button>
      </section>
    </div>
    <div class="pane pane-activity" data-pane="activity">${activityHTML(c)}</div>
    <div class="pane pane-files" data-pane="files">${await filesHTML(c)}</div>
    <div class="pane pane-chat" data-pane="chat">${await chatHTML(c, s)}</div>`;
  $("#detail").classList.add("open");
  const show = (k) => {
    detailTab.tab = k;
    $$("#detail .tabs .tab").forEach((x) => x.classList.toggle("on", x.dataset.tab === k));
    $$("#detail .pane").forEach((p) => (p.style.display = p.dataset.pane === k ? "" : "none"));
    if (k === "chat") bindChat(c);
  };
  $$("#detail .tabs .tab").forEach((tb) => tb.onclick = () => show(tb.dataset.tab));
  show(tab);
  const st2 = state(); st2.read[c.id] = true; store.set("state", st2);
  $("[data-x]").onclick = closeDetail;
  $$("#detail [data-acc]").forEach((b) => b.onclick = () => {
    const s3 = state();
    if (b.dataset.acc === "clear") delete s3.accents[c.id]; else s3.accents[c.id] = b.dataset.acc;
    store.set("state", s3); render(); openDetail(c);
  });
  $$("#detail [data-open]").forEach((li) => li.onclick = () => openDetail(BYID[li.dataset.open]));
  const editAbout = $("#detail [data-editabout]");
  if (editAbout) editAbout.onclick = () => {
    const t = prompt("the card's summary (empty restores the generated one)", about(c));
    if (t === null) return;
    const sums = store.get("summaries", {});
    if (t.trim() === "") delete sums[c.id]; else sums[c.id] = t.trim();
    store.set("summaries", sums); render(); openDetail(c);
  };
  $("[data-c]").onclick = () => {
    const ta = $("#detail textarea"), text = ta.value.trim();
    if (!text) return;
    const s4 = state();
    (s4.comments[c.id] = s4.comments[c.id] || []).push({ who: VIEWER, when: fmt.clock(Date.now()), text });
    store.set("state", s4); render(); openDetail(c);
    toast("comment kept in this browser; in the console it files an issue comment the agent reads");
  };
  $$("#detail [data-ce]").forEach((b) => b.onclick = () => {
    const s5 = state(), m = s5.comments[c.id][+b.dataset.ce], t = prompt("edit comment", m.text);
    if (t !== null && t.trim()) { m.text = t.trim(); store.set("state", s5); render(); openDetail(c); }
  });
  $$("#detail [data-cd]").forEach((b) => b.onclick = () => {
    const s6 = state();
    s6.comments[c.id].splice(+b.dataset.cd, 1); store.set("state", s6); render(); openDetail(c);
  });
}
const statusTip = (s) => ({
  running: "an agent session is working on this card now",
  "waiting-human": "a decision or approval on this card waits for you",
  "waiting-poster": "the agent asked the card's author a question",
  "in-review": "checks, model review or the merge queue hold this card",
  done: "merged; the evidence stays on the card",
  failed: "ended without a merge; retryable",
  closed: "ended without a merge",
  lane: "waiting to be started",
  "lane-wait": "blocked by another card",
}[s.status] || s.status);

// the card chat: the whole run as a chat - brief block, assistant messages,
// tool calls as collapsible blocks, a steering box while the card is live.
async function chatHTML(c, s) {
  const blocks = [];
  for (const sess of c.sessions) {
    if (ms(sess.created_at) > T) continue;
    const lines = (await transcript(`data/sessions/${c.id}/${sess.id}.jsonl`)).filter((l) => ms(l.time) <= T);
    const parts = [];
    const findings = (sess.findings || []).length
      ? `<div class="brief">session brief: ${esc((sess.findings || []).join(" · ")).slice(0, 220)}</div>` : "";
    for (const l of lines) {
      if (l.kind === "model_call" && l.detail?.text)
        parts.push(`<div class="bubble-in"><div class="who">${l.time.slice(11, 19)}Z · ${esc(modelShort(sess.model))}</div>${esc(l.detail.text.trim())}</div>`);
      else if (l.kind === "tool_call")
        parts.push(`<details class="tool"><summary>🔧 ${esc(l.detail?.tool || "?")} <span>${esc(JSON.stringify(l.detail?.args || {})).slice(0, 90)}</span> · ${l.detail?.duration_ms ?? "?"} ms</summary><pre>${esc(JSON.stringify(l.detail, null, 1))}</pre></details>`);
    }
    if (!parts.length && !findings) continue;
    blocks.push(`<div class="sesshead">session ${sess.id.slice(0, 10)} · ${esc(modelShort(sess.model))} · ${esc(sess.created_at.slice(11, 16))}Z</div>${findings}${parts.join("")}`);
  }
  const live = s.status === "running" || s.status === "waiting-poster";
  const queue = store.get("queue", {})[c.id] || [];
  return `<section class="chatsec"><h4>chat <span style="text-transform:none">${live ? "· live, you can steer" : "· history (the run ended)"}</span></h4>
    <div class="chat" data-chat>${blocks.join("") || "<div class='brief'>no transcript for this card</div>"}</div>
    ${queue.length ? `<div class="queued">${queue.map((q, i) => `<div class="qmsg" data-q="${i}">queued: ${esc(q.text)} <button class="mini" data-qe="${i}" title="edit the queued message">✎</button> <button class="mini" data-qd="${i}" title="remove the queued message">✕</button></div>`).join("")}</div>` : ""}
    <div class="steer">
      <input type="text" placeholder="${live ? "steer the agent — in the console this reaches the running session" : "the run ended; the chat is history"}" ${live ? "" : "disabled"}>
      <button data-steer ${live ? "" : "disabled"}>send</button>
    </div>
  </section>`;
}
const modelShort = (m) => (m || "").replace("factory/", "");
function bindChat(c) {
  const box = $("#detail .chat");
  if (box) box.scrollTop = box.scrollHeight;
  const send = () => {
    const inp = $("#detail .steer input"), text = inp.value.trim();
    if (!text) return;
    applyAct({ kind: "steer", card: c.id, message: text }, "card");
    openDetail(c);
    toast("queued in this browser; in the console the message reaches the live session (and stays editable until it lands)");
  };
  $("#detail [data-steer]").onclick = send;
  $("#detail .steer input").onkeydown = (e) => { if (e.key === "Enter") send(); };
  $$("#detail [data-qe]").forEach((b) => b.onclick = () => {
    const q = store.get("queue", {})[c.id], t = prompt("edit the queued message", q[b.dataset.qe].text);
    if (t !== null && t.trim()) { q[b.dataset.qe].text = t.trim(); const all = store.get("queue", {}); all[c.id] = q; store.set("queue", all); openDetail(c); }
  });
  $$("#detail [data-qd]").forEach((b) => b.onclick = () => {
    const all = store.get("queue", {}), [m] = all[c.id].splice(+b.dataset.qd, 1);
    store.set("queue", all);
    if (m?.act) store.set("acts", store.get("acts", []).filter((a) => a.id !== m.act));
    render(); openDetail(c);
  });
}
const visEvent = (e) => !["reconcile", "intake", "event"].includes(e.step);
const detailOf = (e) => e.summary || e.reason || e.guidance || e.outcome || e.digest || e.decision || e.action ||
  (e.findings ? JSON.stringify(e.findings).slice(0, 120) : "") || "";

// conversation tail: last n model messages from the newest transcript
async function transcript(path) {
  if (!transcriptCache[path]) {
    try {
      const r = await fetch(path);
      transcriptCache[path] = r.ok ? (await r.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    } catch { transcriptCache[path] = []; }
  }
  return transcriptCache[path];
}

// ---- the project chat: a scripted project agent over the board at T -------
// It operates the factory and never does the work: it reads, explains, moves,
// answers, steers and approves through the same actions as the buttons.
const chatKey = () => "chat:" + project();
const chatLog = () => store.get(chatKey(), []);
const saveChat = (log) => store.set(chatKey(), log);
const chatQueues = {}; // per project: messages written while a reply streams
const chatQueue = () => (chatQueues[project()] = chatQueues[project()] || []);
let stream = null; // { project, i, frames, f }

function sendChat(text) {
  text = text.trim();
  if (!text) return;
  if (stream) { chatQueue().push(text); renderQueue(); return; }
  const log = chatLog();
  log.push({ who: "you", text, T });
  log.push({ who: "agent", T, parts: agentReply(text) });
  saveChat(log);
  startStream(log.length - 1, log[log.length - 1]);
}

// a reply streams as frames: tool calls run, then text appears word by word
function startStream(i, m) {
  const frames = [];
  m.parts.forEach((p, k) => {
    if (p.type === "text") (p.text.match(/\S+\s*/g) || [""]).forEach((_, w) => frames.push({ part: k, word: w + 1, delay: 28 }));
    else if (p.type === "tool") { frames.push({ part: k, run: true, delay: 420 }); frames.push({ part: k, delay: 140 }); }
    else frames.push({ part: k, delay: 160 });
  });
  stream = { project: project(), i, frames, f: 0 };
  renderChat();
  streamStep();
}
function streamStep() {
  if (!stream) return;
  if (stream.project !== project() || stream.f >= stream.frames.length) { stream = null; renderChat(); return; }
  const fr = stream.frames[stream.f];
  const el = $(`#pchat .pm[data-i="${stream.i}"]`), m = chatLog()[stream.i];
  if (el && m) { el.outerHTML = msgHTML(m, stream.i, fr); scrollChat(); }
  stream.f++;
  setTimeout(streamStep, fr.delay);
}

function msgHTML(m, i, fr) {
  if (m.who === "you") return `<div class="pm you" data-i="${i}"><div class="who">you · ${fmt.clock(m.T)}</div>${esc(m.text)}</div>`;
  const out = [];
  for (let k = 0; k < m.parts.length; k++) {
    if (fr && k > fr.part) break;
    out.push(partHTML(m.parts[k], i, k, fr && k === fr.part ? fr : null));
  }
  return `<div class="pm agent" data-i="${i}"><div class="who">project agent · ${fmt.clock(m.T)}</div>${out.join("")}${fr ? `<span class="cursor" aria-hidden="true">▍</span>` : ""}</div>`;
}
function partHTML(p, i, k, fr) {
  const at = `data-i="${i}" data-k="${k}"`;
  if (p.type === "text") {
    const shown = fr ? (p.text.match(/\S+\s*/g) || []).slice(0, fr.word).join("") : p.text;
    return `<div class="ptext">${esc(shown)}</div>`;
  }
  if (p.type === "tool")
    return `<details class="ptool"><summary title="a tool call: name, arguments, duration">🔧 ${esc(p.name)} ${esc(JSON.stringify(p.args))} · ${fr?.run ? "running…" : p.ms + " ms"}</summary><pre>${esc(JSON.stringify(p.result, null, 1))}</pre></details>`;
  if (p.type === "proposal") {
    const foot = {
      open: `<button class="doit" data-doit ${at} title="apply the change (this tool needs your OK)">Do it</button> <button class="mini" data-cancel ${at}>Cancel</button>`,
      applied: `<span class="ok">✓ applied</span>${p.note ? ` · ${esc(p.note)}` : ""}${p.actId && p.undoable ? ` · <button class="mini" data-undo ${at} title="revert this change">undo</button>` : ""}`,
      undone: `<span class="muted">↶ undone</span>`,
      cancelled: `<span class="muted">cancelled</span>`,
      refused: `<span class="refused">not applied: ${esc(p.note || "")}</span>`,
    }[p.state];
    return `<div class="proposal ${p.state}"><div class="ptitle">I will:</div><ul>${p.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><div class="pfoot">${foot}</div></div>`;
  }
  if (p.type === "applied")
    return `<div class="applied ${p.state}">${p.state === "undone" ? `<span class="muted">↶ undone: ${esc(p.text)}</span>`
      : `<span class="ok">✓ applied</span> · ${esc(p.text)} · <button class="mini" data-undo ${at} title="revert this change">undo</button>`}</div>`;
  return "";
}

function renderChat() {
  if (VIEW === "wide" || !DATA) return;
  const log = chatLog();
  $("#chatproj").textContent = `project agent · ${project()}`;
  $("#pchat").innerHTML = log.length ? log.map((m, i) => msgHTML(m, i, stream && stream.i === i && stream.project === project() ? stream.frames[Math.max(0, stream.f - 1)] : null)).join("")
    : starterHTML();
  renderQueue();
  scrollChat(true);
  if (!stream && chatQueue().length) setTimeout(() => { if (!stream && chatQueue().length) sendChat(chatQueue().shift()); }, 0);
}
function starterHTML() {
  const sn = snapshot();
  const pick = sn.cols.needs[0] || sn.cols.queued[0] || sn.cols.working[0] || sn.all[0];
  const tries = ["what is happening", "what happened since", pick ? `why is #${pick.c.issue_number} waiting` : ""].filter(Boolean);
  return `<div class="starter"><p class="muted">The project agent answers over the board at the clock's moment. It reads, explains, moves, answers, steers and approves; it runs no code.</p>
    ${tries.map((t) => `<button class="mini" data-starter="${esc(t)}">${esc(t)}</button>`).join(" ")}</div>`;
}
function renderQueue() {
  const q = chatQueue();
  $("#pqueue").innerHTML = q.map((t, n) => `<div class="qmsg">queued: ${esc(t)} <button class="mini" data-pqe="${n}" title="edit the queued message">✎</button> <button class="mini" data-pqd="${n}" title="remove the queued message">✕</button></div>`).join("");
}
function scrollChat(force) {
  const box = $("#pchat");
  if (force || box.scrollHeight - box.scrollTop - box.clientHeight < 160) box.scrollTop = box.scrollHeight;
}

// the canned behaviours, matched on the human's text
function agentReply(raw) {
  const text = raw.trim(), sn = snapshot(), at = fmt.clock(T);
  const find = (n) => sn.all.find((x) => x.c.issue_number === +n);
  const parts = [];
  const say = (t) => parts.push({ type: "text", text: t });
  const tool = (name, args, fn) => {
    const t0 = performance.now(), result = fn();
    parts.push({ type: "tool", name, args, ms: Math.max(1, Math.round(performance.now() - t0)), result });
    return result;
  };
  const cardTool = (n) => tool("card", { number: +n }, () => {
    const x = find(n);
    return x ? cardFacts(x) : { error: `no #${n} in ${sn.name} at ${at}` };
  });
  let m;
  if ((m = text.match(/^move\s+#?(\d+)\s+(?:back\s+)?to\s+(?:the\s+)?([a-z-]+)/i))) {
    const x = find(m[1]);
    cardTool(m[1]);
    if (!x) { say(`There is no #${m[1]} in ${sn.name} at ${at}.`); return parts; }
    const act = { kind: "move", card: x.c.id, lane: m[2].toLowerCase() }, err = actError(act);
    if (err) { say(err); return parts; }
    say("Moving a card needs your OK.");
    parts.push({ type: "proposal", act, lines: [`move ${refTitle(x.c)} from ${x.s.lane} to ${act.lane}`], state: "open" });
    return parts;
  }
  if ((m = text.match(/^answer\s+#?(\d+)[\s:,]+([\s\S]+)$/i))) {
    const x = find(m[1]);
    cardTool(m[1]);
    if (!x) { say(`There is no #${m[1]} in ${sn.name} at ${at}.`); return parts; }
    const q = questionOf(x.c, x.s);
    let answer = m[2].trim();
    const letter = answer.match(/^\(?([a-z])\)?\.?$/i);
    if (q && letter) answer = q.choices.find((ch) => ch.startsWith(`(${letter[1].toLowerCase()})`)) || answer;
    const act = { kind: "answer", card: x.c.id, key: q?.key, answer }, err = actError(act);
    if (err) { say(err); return parts; }
    if (store.get("answers", {})[q.key]) { say(`You already answered #${x.c.issue_number}; undo that answer first.`); return parts; }
    const a = applyAct(act, "chat");
    parts.push({ type: "applied", text: a.text, actId: a.id, state: "applied" });
    say(`The agent reads it as an issue comment and its next session starts with it.`);
    return parts;
  }
  if ((m = text.match(/^approve\s+#?(\d+)/i))) {
    const x = find(m[1]);
    cardTool(m[1]);
    if (!x) { say(`There is no #${m[1]} in ${sn.name} at ${at}.`); return parts; }
    const act = { kind: "approve", card: x.c.id }, err = actError(act);
    if (err) { say(err); return parts; }
    const a = x.s.approvals[0];
    say(`${refTitle(x.c)} waits for ${a.kind === "plan" ? "your plan acceptance" : `your approval to merge PR #${a.pr_number}`}. ${a.spec?.review?.verdict ? `The model review says ${a.spec.review.verdict}. ` : ""}Approving needs your OK.`);
    parts.push({ type: "proposal", act, lines: [`${a.kind === "plan" ? "accept the plan of" : `approve the merge of PR #${a.pr_number} for`} ${refTitle(x.c)}`], state: "open" });
    return parts;
  }
  if ((m = text.match(/^steer\s+#?(\d+)[\s:,]+([\s\S]+)$/i))) {
    const x = find(m[1]);
    cardTool(m[1]);
    if (!x) { say(`There is no #${m[1]} in ${sn.name} at ${at}.`); return parts; }
    const act = { kind: "steer", card: x.c.id, message: m[2].trim() }, err = actError(act);
    if (err) { say(err); return parts; }
    const a = applyAct(act, "chat");
    parts.push({ type: "applied", text: a.text, actId: a.id, state: "applied" });
    say(x.s.status === "running" ? `It waits in #${x.c.issue_number}'s steering queue and reaches the running session at its next turn.`
      : `#${x.c.issue_number} is ${STATUS_TEXT[x.s.status]}; the message waits in its steering queue for the next session.`);
    return parts;
  }
  if ((m = text.match(/why\s+is\s+#?(\d+)|what\s+does\s+#?(\d+)\s+need/i))) {
    const n = m[1] || m[2], x = find(n);
    cardTool(n);
    say(x ? whyText(x, sn) : `There is no #${n} in ${sn.name} at ${at}.`);
    return parts;
  }
  if (/happened\s+since|what\s+happened|history/i.test(text)) {
    const hm = text.match(/since\s+(\d{1,2}):(\d{2})/);
    const from = hm ? Date.UTC(new Date(T).getUTCFullYear(), new Date(T).getUTCMonth(), new Date(T).getUTCDate(), +hm[1], +hm[2]) : T - 3600000;
    const evs = tool("history", { project: sn.name, since: new Date(from).toISOString().slice(0, 16) + "Z" }, () => projectHistory(sn, from));
    say(evs.length ? `Since ${fmt.hm(from)}, newest last:\n${evs.slice(-10).map((e) => `${e.at}  ${e.text}`).join("\n")}`
      : `Nothing happened in ${sn.name} between ${fmt.hm(from)} and ${fmt.hm(T)}.`);
    return parts;
  }
  if (/what('?s|\s+is)\s+(going\s+on|happening)|status|overview|board/i.test(text)) {
    tool("board", { project: sn.name }, () => boardFacts(sn));
    say(statusText(sn));
    return parts;
  }
  say(`I can do three things here: tell you what is happening ("status", "what happened since 17:00"), explain a card ("why is #5 waiting", "what does #5 need"), and change the board for you ("move #8 to plan", "answer #5 (a)", "approve #3", "steer #4 keep the handler small"). Moves and approvals wait for your OK; answers and steering apply at once with an undo.`);
  return parts;
}

function cardFacts({ c, s }) {
  return {
    number: c.issue_number, title: title(c), column: fiveCol(c, s), state: s.status, lane: s.lane,
    deps: c.deps, telemetry: s.telemetry, activity: short(s.activity || "", 160),
    approvals: s.approvals.map((a) => ({ kind: a.kind, pr: a.pr_number, verdict: a.spec?.review?.verdict || null })),
  };
}
function boardFacts(sn) {
  const cols = Object.fromEntries(FIVE.map((f) => [f.title, sn.cols[f.key].map((x) => `#${x.c.issue_number} ${title(x.c)}`)]));
  return { project: sn.name, at: new Date(T).toISOString().slice(0, 16) + "Z", state: sn.word, spend_eur: +sn.spend.toFixed(2), cap_eur: CAP_EUR, columns: cols };
}
function statusText(sn) {
  const list = (k) => sn.cols[k].map((x) => refTitle(x.c)).join(", ");
  const lines = [`${sn.name} at ${fmt.clock(T)} is ${sn.word}.`];
  for (const f of FIVE.slice(0, 4)) if (sn.cols[f.key].length) lines.push(`• ${f.title} (${sn.cols[f.key].length}): ${list(f.key)}`);
  lines.push(`• Done: ${sn.cols.done.length} of ${sn.all.length}`);
  lines.push(`Spend ${fmt.eur(sn.spend)} of the €${CAP_EUR} cap. ${pulseOf(sn).text}`);
  return lines.join("\n");
}
function whyText({ c, s }, sn) {
  const ref = refTitle(c), q = questionOf(c, s);
  if (s.approvals.length) {
    const a = s.approvals[0];
    return `${ref} waits on you for ${fmt.min(s.waitingMin)}: ${a.kind === "plan" ? "the plan needs your acceptance" : `PR #${a.pr_number} is ready to merge and needs your approval`}. ${a.spec?.review?.summary ? `The review: ${short(a.spec.review.summary, 220)} ` : ""}Use the card's buttons or say "approve #${c.issue_number}".`;
  }
  if (q) return `${ref} waits on you for ${fmt.min(s.waitingMin)}. The agent asks: ${q.text}\n${q.choices.map((ch) => `• ${ch}`).join("\n")}\nAnswer on the card or say "answer #${c.issue_number} (a)".`;
  if (s.status === "lane-wait") {
    const open = c.deps.map((d) => sn.all.find((y) => y.c.issue_number === d)).filter((y) => y && !ENDED.includes(y.s.status));
    return `${ref} waits on ${open.map((y) => `${refTitle(y.c)} (${STATUS_TEXT[y.s.status]})`).join(", ") || "its dependencies"}; it starts when they are done.`;
  }
  if (s.status === "lane") return `${ref} is queued in ${s.lane}${s.retrying ? "; the supervisor retries it on a stronger model" : ""}; it starts when a worker slot frees.`;
  if (s.status === "running") return `${ref} is not waiting: it runs for ${s.telemetry[0]}. Last: ${short(s.activity || "a session start", 160)}`;
  if (s.status === "in-review") return `${ref} is in review: PR #${s.pr}${s.checks ? `, checks ${s.checks}` : ""}. The checks, the gates and the model review decide; it reaches you when it is ready to merge.`;
  if (s.status === "waiting-poster") return `${ref} waits on its author (${c.author}): ${short(s.activity, 200)}`;
  return `${ref} is ${STATUS_TEXT[s.status] || s.status}${s.doneAt ? ` since ${fmt.hm(s.doneAt)}` : ""}${s.evidence?.length ? ` (${s.evidence.join(" · ")})` : ""}.`;
}
// the project's notable events between from and T, with the human's actions
function projectHistory(sn, from) {
  const say = {
    session_start: () => "started a session", session_end: (e) => `ended its session (${e.outcome})`,
    pr_opened: (e) => `opened PR #${e.number}`, checks: (e) => `checks ${e.state === "success" ? "✓" : "✗"}`,
    approval_requested: () => "asked for your approval", escalated: () => "asked you a question",
    signal: (e) => (e.signal || "").replace(/_/g, " "), merged: () => "merged", dependencies_done: () => "unblocked",
  };
  const out = [];
  for (const { c } of sn.all)
    for (const e of c.timeline)
      if (say[e.step] && ms(e.time) > from && ms(e.time) <= T) out.push({ t: ms(e.time), at: fmt.hm(e.time), text: `#${c.issue_number} ${title(c)} ${say[e.step](e)}` });
  for (const a of store.get("acts", []))
    if (a.project === sn.name && a.T > from && a.T <= T) out.push({ t: a.T, at: fmt.hm(a.T), text: `you${a.via === "chat" ? " via chat" : ""}: ${a.text}` });
  return out.sort((a, b) => a.t - b.t);
}

// one delegated listener for the chat pane's buttons
function bindChatPane() {
  $("#pchat").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.starter) { sendChat(b.dataset.starter); return; }
    const log = chatLog(), p = log[+b.dataset.i]?.parts[+b.dataset.k];
    if (!p) return;
    if (b.hasAttribute("data-doit")) {
      const err = actError(p.act);
      if (err) { p.state = "refused"; p.note = err; }
      else {
        const a = applyAct(p.act, "chat");
        p.state = "applied"; p.actId = a.id; p.undoable = p.act.kind !== "approve";
        p.note = p.act.kind === "approve" ? `the clock jumped to the recorded decision, ${fmt.clock(T)}` : a.text;
      }
    } else if (b.hasAttribute("data-cancel")) p.state = "cancelled";
    else if (b.hasAttribute("data-undo")) { undoAct(p.actId); p.state = "undone"; }
    saveChat(log); renderChat();
  });
  $("#pqueue").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const q = chatQueue();
    if (b.dataset.pqd !== undefined) q.splice(+b.dataset.pqd, 1);
    if (b.dataset.pqe !== undefined) {
      const t = prompt("edit the queued message", q[+b.dataset.pqe]);
      if (t !== null && t.trim()) q[+b.dataset.pqe] = t.trim();
    }
    renderQueue();
  });
  const ask = $("#ask");
  const send = () => { const t = ask.value; ask.value = ""; sendChat(t); };
  $("#asksend").onclick = send;
  ask.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  $("#chatclear").onclick = () => {
    if (!confirm(`remove this browser's conversation with ${project()}'s agent?`)) return;
    stream = null; chatQueue().length = 0; saveChat([]); renderChat();
  };
}

// ---- hover peek -----------------------------------------------------------
let peekTimer;
function schedulePeek(c, el) {
  cancelPeek();
  peekTimer = setTimeout(async () => {
    const lines = (await newestTranscript(c)).filter((l) => ms(l.time) <= T).map((l) =>
      l.kind === "model_call" && l.detail?.text ? "» " + l.detail.text.trim().split("\n")[0].slice(0, 120)
      : l.kind === "tool_call" ? "· " + l.detail?.tool + " " + JSON.stringify(l.detail?.args || {}).slice(0, 70)
      : l.kind === "command" ? "$ " + (l.detail?.command || "").split("\n")[0].slice(0, 100)
      : l.kind === "file_change" ? "✎ " + (l.detail?.path || "").replace(/^\/workspace\/repo\//, "")
      : "").filter(Boolean).slice(-12);
    if (!lines.length) return;
    const p = $("#peek");
    p.innerHTML = lines.map(esc).join("\n");
    const r = el.getBoundingClientRect();
    p.style.display = "block";
    p.style.left = Math.max(8, Math.min(r.left, innerWidth - 560)) + "px";
    p.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - p.offsetHeight - 12)) + "px";
  }, 350);
}
function cancelPeek() { clearTimeout(peekTimer); $("#peek").style.display = "none"; }
async function newestTranscript(c) {
  for (let i = c.sessions.length - 1; i >= 0; i--) {
    if (ms(c.sessions[i].created_at) > T) continue;
    const lines = await transcript(`data/sessions/${c.id}/${c.sessions[i].id}.jsonl`);
    if (lines.length) return lines;
  }
  return [];
}

// ---- drag: only backlog cards, only into lane columns (ruling 246) --------
document.addEventListener("dragover", (e) => {
  const col = e.target.closest(".column");
  if (!col) return;
  e.preventDefault();
  col.classList.remove("drop-ok", "drop-refuse");
  col.classList.add(LANES.includes(col.dataset.col) ? "drop-ok" : "drop-refuse");
});
document.addEventListener("dragleave", (e) => e.target.closest(".column")?.classList.remove("drop-ok", "drop-refuse"));
document.addEventListener("drop", (e) => {
  const col = e.target.closest(".column");
  if (!col) return;
  e.preventDefault();
  const refuse = col.classList.contains("drop-refuse");
  col.classList.remove("drop-ok", "drop-refuse");
  if (refuse) { toast("moves between machine-owned states are buttons here; a drag only starts a lane (ruling 246)", true); return; }
  const c = BYID[e.dataTransfer.getData("text/plain")];
  if (c && col.dataset.col !== cardState(c, T).lane) {
    applyAct({ kind: "move", card: c.id, lane: col.dataset.col }, "card");
    toast(`moved #${c.issue_number} to ${col.dataset.col} — the dummy keeps this locally; the console files the lane's move form`);
  }
});

// ---- clock ----------------------------------------------------------------
function setClock(t) {
  T = Math.max(DATA.t0, Math.min(DATA.t1, t));
  cancelPeek(); closeDetail(); render();
}
let playFrom = null, playSpeed = 1, rafId = 0;
function playReplay() {
  if (playing) { pauseReplay(); return; }
  playing = true; playFrom = T >= DATA.t1 - 1000 ? DATA.t0 : T;
  updatePlayButtons();
  const span = DATA.t1 - playFrom, dur = 90000 / playSpeed, t00 = performance.now();
  (function step(now) {
    if (!playing) return;
    const k = (now - t00) / dur;
    if (k >= 1) { playing = false; setClock(DATA.t1); updatePlayButtons(); return; }
    T = playFrom + span * k; render();
    rafId = requestAnimationFrame(step);
  })(performance.now());
}
function pauseReplay() {
  playing = false; cancelAnimationFrame(rafId); updatePlayButtons(); render();
}
function updatePlayButtons() {
  $("#play").textContent = playing ? "⏸ pause" : "▶ replay";
  $("#speed").textContent = playSpeed + "×";
}

// ---- view: the board beside the chat, or today's wide board ---------------
function writeHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  h.set("project", project());
  if (VIEW === "wide") h.set("view", "wide"); else h.delete("view");
  history.replaceState(null, "", "#" + h.toString());
}
function setView(v) {
  VIEW = v;
  document.body.classList.toggle("wide", v === "wide");
  document.body.classList.toggle("split", v !== "wide");
  $("#wide").setAttribute("aria-pressed", v === "wide");
  $("#wide").textContent = v === "wide" ? "split" : "wide";
  $("#wide").title = v === "wide" ? "back to the board beside the chat (w)" : "wide: the full-width board with every lane and state column, chat hidden (w)";
  writeHash(); render(); renderChat();
}
function showPane(p) {
  document.body.classList.toggle("pane-board", p === "board");
  document.body.classList.toggle("pane-chat", p === "chat");
  $$("#viewtabs button").forEach((b) => b.classList.toggle("on", b.dataset.pane === p));
  if (p === "chat") scrollChat(true);
}

// ---- keyboard -------------------------------------------------------------
document.addEventListener("keydown", (e) => {
  if (e.target.closest?.("textarea, select, input")) return;
  const k = e.key;
  if (k === "Escape") { closeDetail(); $("#keys").classList.remove("open"); cancelPeek(); if (playing) pauseReplay(); return; }
  if (k === "p") { playReplay(); return; }
  if (k === "?") { $("#keys").classList.toggle("open"); return; }
  if (k === "t") { toggleTheme(); return; }
  if (k === "w") { setView(VIEW === "wide" ? "split" : "wide"); return; }
  if (k === "/" && VIEW !== "wide") { e.preventDefault(); showPane("chat"); $("#ask").focus(); return; }
  if (k === "[") { playing = false; setClock(T - 15 * 60000); return; }
  if (k === "]") { playing = false; setClock(T + 15 * 60000); return; }
  if (k === " ") { const el = document.querySelector(".card:hover"); if (el) { e.preventDefault(); schedulePeek(BYID[el.dataset.id], el); } return; }
  if (k === "d" || k === "x") {
    const scope = VIEW === "wide" ? "#needsyou" : '#board [data-col="needs"]';
    const first = $(`${scope} [data-act="${k === "d" ? "approve" : "deny"}"]`);
    if (first) first.click();
    return;
  }
  if (/^[0-9]$/.test(k)) {
    const pick = snapshot().cols.working[+k === 0 ? 9 : +k - 1];
    if (pick) openDetail(pick.c);
  }
});
function toggleTheme() {
  const s = state(); s.theme = s.theme === "dark" ? "light" : "dark";
  store.set("state", s); applyTheme();
}
const applyTheme = () => (document.documentElement.dataset.theme = state().theme);

// ---- boot -----------------------------------------------------------------
(async function boot() {
  DATA = await (await fetch("data/cards.json")).json();
  BYID = Object.fromEntries(DATA.cards.map((c) => [c.id, c]));
  const times = DATA.cards.flatMap((c) => [ms(c.created_at), ms(c.finished_at || c.created_at)]);
  DATA.t0 = Math.min(...times) - 60000; DATA.t1 = Math.max(...times) + 60000;
  const sel = $("#project");
  sel.innerHTML = DATA.projects.map((p) => `<option>${esc(p.name)}</option>`).join("");
  sel.onchange = () => { closeDetail(); writeHash(); render(); renderChat(); };
  const af = $("#accentfilter");
  af.innerHTML = `<option value="">any accent</option>` + ACCENTS.map((a) => `<option value="${a}">accent ${a}</option>`).join("");
  af.onchange = render;
  $("#theme").onclick = toggleTheme;
  $("#wide").onclick = () => setView(VIEW === "wide" ? "split" : "wide");
  $("#showkeys").onclick = () => $("#keys").classList.toggle("open");
  $("#play").onclick = playReplay;
  $("#speed").onclick = () => { playSpeed = playSpeed === 1 ? 2 : playSpeed === 2 ? 4 : 1; updatePlayButtons(); };
  $("#more").onclick = () => { pulseOpen = !pulseOpen; render(); };
  $("#pulse .say").onclick = () => { pulseOpen = !pulseOpen; render(); };
  $$("#viewtabs button").forEach((b) => b.onclick = () => showPane(b.dataset.pane));
  bindChatPane();
  const clk = $("#clock");
  clk.min = DATA.t0; clk.max = DATA.t1; clk.value = DATA.t1;
  clk.oninput = () => { if (playing) pauseReplay(); setClock(+clk.value); };
  T = DATA.t1;
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get("t")) T = Math.max(DATA.t0, Math.min(DATA.t1, ms(hash.get("t")) || DATA.t1));
  if (hash.get("theme")) { const s = state(); s.theme = hash.get("theme"); store.set("state", s); }
  const card = BYID[hash.get("card")];
  const wanted = hash.get("project") || (card && projectOf(card));
  if (DATA.projects.some((p) => p.name === wanted)) sel.value = wanted;
  applyTheme();
  setView(hash.get("view") === "wide" ? "wide" : "split");
  if (card) openDetail(card);
})();
