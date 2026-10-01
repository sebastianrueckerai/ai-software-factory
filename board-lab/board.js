// board lab: the proposal-v1 board over the real linkshort2/linkshort4/
// linkshort3/notes data extracted in Task 142. Static, no build, one file.
"use strict";

const $ = (s, el) => (el || document).querySelector(s);
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
const STATUS_TEXT = {
  running: "running", "waiting-human": "waiting on you",
  "waiting-poster": "waiting on author", "in-review": "in review",
  done: "done", failed: "failed", closed: "closed",
};
const ACCENTS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("bl:" + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem("bl:" + k, JSON.stringify(v)); },
};
const fmt = {
  eur: (v) => "€" + v.toFixed(2),
  min: (m) => (m >= 60 ? Math.floor(m / 60) + " h " + (m % 60) + "m" : Math.round(m) + "m"),
  clock: (t) => new Date(t).toISOString().slice(5, 16).replace("T", " ") + "Z",
};

let DATA, BYID, EVENTS; // cards by id, ordered event list
let T = 0; // the board clock (ms epoch)
let playing = false;
const transcriptCache = {};

const state = () => store.get("state", { theme: "dark", accents: {}, comments: {}, read: {} });
const cardLane = (c, evs) => {
  const e = [...evs].reverse().find((x) => x.step === "event" && x.event === "card_entered_lane");
  return e ? e.lane : c.lane || "backlog";
};
const escText = (e) => e.reason || e.guidance || e.digest || "";

// Where a card sits and what it shows at time T, derived from its events.
function cardState(c, t) {
  const evs = c.timeline.filter((e) => new Date(e.time).getTime() <= t);
  const s = {
    id: c.id, col: null, status: "backlog", lane: cardLane(c, evs),
    title: c.plan_key || firstClause(c.objective), ref: c.issue_number,
    telemetry: [], activity: "", badges: [], approvals: [], children: null,
    stale: false, failed: false, running: false, waitingMin: 0, pr: 0,
  };
  const created = new Date(c.created_at).getTime();
  let since = created, waiting = false, lastStep = "", inSession = false, sessionStart = null;
  const spend = c.ledger.filter((l) => new Date(l.created_at).getTime() <= t)
    .reduce((a, l) => a + l.eur, 0);
  for (const e of evs) {
    switch (e.step) {
      case "dependencies_wait": waiting = "deps"; break;
      case "dependencies_done": if (waiting === "deps") waiting = false; break;
      case "session_start": inSession = true; sessionStart = e.time; waiting = false; break;
      case "escalated": waiting = "human"; s.activity = escText(e); break;
      case "session_end":
        inSession = false;
        if (e.outcome === "needs_info") waiting = "poster";
        if (e.outcome && e.outcome !== "pushed" && e.outcome !== "needs_info") { s.failed = true; waiting = false; }
        if (e.summary) s.activity = e.summary.split("\n")[0];
        break;
      case "pr_opened": s.pr = e.number || e.pr || s.pr; waiting = false; break;
      case "approval_requested": waiting = "human"; break;
      case "signal": waiting = false; break;
      case "merged": case "final": waiting = false; s.done = true; break;
    }
    if (e.step) lastStep = e.step;
  }
  if (s.done || c.status === "done" && finishedBy(c, t)) s.status = "done";
  else if (s.failed) s.status = "failed";
  else if (waiting === "human") s.status = "waiting-human";
  else if (waiting === "poster") s.status = "waiting-poster";
  else if (s.pr && !inSession) s.status = "in-review";
  else if (inSession) s.status = "running";
  else if (waiting === "deps") s.status = "lane-wait";
  else s.status = "lane";
  s.col = s.status.startsWith("lane") ? s.lane : s.status;
  if (["done", "failed", "closed"].includes(c.status) && finishedBy(c, t) && !s.done && !s.failed)
    { s.status = c.status; s.col = c.status; }
  // telemetry
  if (s.status === "running" && sessionStart) {
    const el = (t - new Date(sessionStart).getTime()) / 60000;
    s.telemetry.push(fmt.min(el));
    s.stale = el > 30;
  } else if (["done", "failed", "closed"].includes(s.status) && c.finished_at) {
    s.telemetry.push(fmt.min((new Date(c.finished_at) - created) / 60000) + " in all");
  } else if (waiting) {
    const last = new Date(evs[evs.length - 1].time).getTime();
    s.waitingMin = (t - last) / 60000;
    s.telemetry.push("waiting " + fmt.min(s.waitingMin));
  }
  s.telemetry.push(fmt.eur(spend) + " / " + fmt.eur(c.budget_eur));
  if (s.pr) s.telemetry.push("PR #" + s.pr);
  // activity line: waiting cards say why; running show the last step
  if (s.status === "waiting-human" && escText(lastEscalation(evs))) s.activity = escText(lastEscalation(evs));
  else if (!s.activity && evs.length) s.activity = lastStep.replace(/_/g, " ");
  s.approvals = c.approvals.filter((a) =>
    new Date(a.created_at).getTime() <= t &&
    (!a.decided_at || new Date(a.decided_at).getTime() > t) &&
    s.status === "waiting-human");
  return s;
}
const finishedBy = (c, t) => c.finished_at && new Date(c.finished_at).getTime() <= t;
const lastEscalation = (evs) => [...evs].reverse().find((e) => e.step === "escalated") || {};
function firstClause(o) {
  const s = (o || "").replace(/\s+/g, " ").trim();
  const cut = s.split(/(?<=[.;:])\s/)[0];
  return (cut.length > 4 && cut.length <= 72 ? cut : s.slice(0, 68)).trim();
}
const title = (c) => (c.plan_key ? c.plan_key[0].toUpperCase() + c.plan_key.slice(1) : firstClause(c.objective));

function visibleCards() {
  const p = $("#project").value, af = $("#accentfilter").value, st = state();
  return DATA.cards.filter((c) =>
    (p === "" || c.repository.startsWith(p + "/")) &&
    (af === "" || (st.accents[c.id] || "") === af));
}

function render() {
  const st = state();
  const cards = visibleCards()
    .filter((c) => new Date(c.created_at).getTime() <= T)
    .map((c) => ({ c, s: cardState(c, T) }));
  // needs you
  const needs = [];
  for (const { c, s } of cards) {
    for (const a of s.approvals)
      needs.push({ c, kind: a.kind === "merge" ? "approve merge" : a.kind === "plan" ? "approve plan" : a.kind,
        why: approvalWhy(c, a), ask: (a.spec && a.spec.review && a.spec.review.summary) || a.reason || "", when: a.created_at, a });
    if (s.status === "waiting-poster")
      needs.push({ c, kind: "answer", why: "the agent asked a question", ask: s.activity, when: c.timeline.find((e) => e.step === "session_end" && e.outcome === "needs_info")?.time || c.created_at });
  }
  needs.sort((x, y) => new Date(x.when) - new Date(y.when));
  $("#needsyou").innerHTML = needs.length ? needs.map((n, i) => `
    <div class="decision" data-i="${i}">
      <div><span class="ref">#${n.c.issue_number}</span> <strong>${title(n.c)}</strong>
        <span class="badgechip">${n.kind}</span></div>
      <div class="why">${esc(n.why)}<div class="ask">${esc(n.ask).slice(0, 220)}</div></div>
      <div class="acts">
        ${n.a ? `<button data-act="approve">Approve</button><button class="deny" data-act="deny">Request changes</button>`
              : `<button data-act="answer">Answer</button>`}
      </div>
    </div>`).join("")
    : `<div class="empty">nothing waits on you at this moment</div>`;
  $("#needsyou")._data = needs;
  // columns
  const cols = COLUMNS.map((col) => ({ col, cards: [] }));
  const byCol = Object.fromEntries(cols.map((x, i) => [x.col.lane || x.col.status, x]));
  for (const { c, s } of cards) {
    if (c.parent_task && s.status === "done" && !["done", "failed", "closed"].includes(s.col)) continue;
    (byCol[s.col] || byCol.done).cards.push({ c, s });
  }
  $("#board").innerHTML = cols.map(({ col, cards: list }) => `
    <section class="column" data-col="${col.lane || col.status}">
      <header><span class="name">${col.title}</span><span class="count">${list.length}</span></header>
      ${list.map(({ c, s }) => cardHTML(c, s, st)).join("")}
    </section>`).join("");
  $("#spend").textContent = fmt.eur(cards.reduce((a, { c }) => a + c.spent_eur, 0)) + " spent, all projects shown";
  $("#when").textContent = T ? fmt.clock(T) : "end state";
  $("#clock").value = T;
  bindCards();
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const accentVar = (a) => `var(--human-${a})`;
function cardHTML(c, s, st) {
  const accent = st.accents[c.id];
  const comments = st.comments[c.id] || [];
  const unread = comments.length && !st.read[c.id];
  const pill = s.status === "lane" || s.status === "lane-wait"
    ? `<span class="pill" style="background:transparent;color:var(--text-muted);border:1px solid var(--line-strong)">${s.lane}</span>`
    : `<span class="pill ${s.status === "waiting-human" ? "wait" : ""}" style="${pillStyle(s)}">${STATUS_TEXT[s.status] || s.status}</span>`;
  const badges = [];
  if (c.model_alias) badges.push(c.model_alias.replace("factory/", ""));
  if (s.status === "lane-wait" && c.deps.length) badges.push("blocked by #" + c.deps.join(" #"));
  if (c.parent_task) badges.push("part of plan #" + (BYID[c.parent_task]?.issue_number || "?"));
  const children = childrenRollup(c, s);
  return `
  <article class="card ${s.stale ? "stale" : ""} ${unread ? "unread" : ""} ${s.status === "lane" && s.lane === "backlog" ? "draggable" : ""}"
    data-id="${c.id}" tabindex="0" style="${accent ? `--acc:${accentVar(accent)}` : ""}">
    ${accent ? `<span class="accent-edge" style="background:var(--acc)"></span>` : ""}
    <div class="line1">
      <span class="ref">#${c.issue_number}</span>
      <span class="title">${esc(title(c))}</span>
      ${accent ? `<span class="humantag" style="background:var(--acc)" title="human accent"></span>` : ""}
      ${unread ? `<span class="bubble">◍ ${comments.length}</span>` : ""}
    </div>
    <div class="telemetry">${pill} ${s.telemetry.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
    <div class="activity">${esc(s.activity).slice(0, 110)}</div>
    ${badges.length ? `<div class="badges">${badges.map((b) => `<span class="badgechip">${esc(b)}</span>`).join("")}</div>` : ""}
    ${children || ""}
    ${s.approvals.length ? `<div class="buttons"><button data-act="approve">Approve</button><button class="deny" data-act="deny">Request changes</button></div>` : ""}
  </article>`;
}
function childrenRollup(c, s) {
  if (!c.parent_task) return "";
  const kids = DATA.cards.filter((k) => k.parent_task === c.parent_task && k.id !== c.id);
  if (!kids.length) return "";
  const counts = {};
  for (const k of kids) counts[cardState(k, T).status] = (counts[cardState(k, T).status] || 0) + 1;
  const parts = Object.entries(counts).map(([k, n]) => `${n} ${STATUS_TEXT[k] || k}`);
  return `<div class="children">${kids.length} children: ${esc(parts.join(" · "))}</div>`;
}
function pillStyle(s) {
  const map = {
    running: ["var(--running)", "var(--accent-ink)"], done: ["var(--done)", "oklch(0.15 0.02 150)"],
    failed: ["var(--failed)", "oklch(0.98 0.01 25)"], closed: ["var(--closed)", "var(--bg)"],
    "waiting-human": ["var(--waiting)", "var(--waiting-ink)"], "waiting-poster": ["var(--bg-raised)", "var(--waiting)"],
    "in-review": ["var(--review)", "oklch(0.15 0.02 300)"],
  }[s.status];
  if (!map) return "";
  const hollow = s.status === "waiting-poster";
  return `background:${hollow ? "transparent" : map[0]};color:${map[1]}${hollow ? `;border:1px solid ${map[0]}` : ""}`;
}
function approvalWhy(c, a) {
  if (a.kind === "merge") return `merge PR #${a.pr_number} on ${c.repository.split("/")[1]}`;
  if (a.kind === "plan") return `the plan for #${c.issue_number} waits for your accept`;
  return a.reason || "a resource request waits for you";
}

// ---- interaction ----------------------------------------------------------
function bindCards() {
  document.querySelectorAll(".card").forEach((el) => {
    const c = BYID[el.dataset.id];
    el.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      openDetail(c);
    });
    el.addEventListener("mouseenter", () => schedulePeek(c, el));
    el.addEventListener("mouseleave", cancelPeek);
    el.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", c.id); el.classList.add("dragging"); });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
  });
  document.querySelectorAll(".card [data-act]").forEach((b) =>
    b.addEventListener("click", (e) => { e.stopPropagation(); decisionAct(b.dataset.act, BYID[b.closest(".card").dataset.id]); }));
  document.querySelectorAll("#needsyou [data-act]").forEach((b) =>
    b.addEventListener("click", () => {
      const n = $("#needsyou")._data[+b.closest(".decision").dataset.i];
      decisionAct(b.dataset.act, n.c, n.a);
    }));
}
function decisionAct(act, c, a) {
  const t = T;
  if (act === "deny") {
    toast("the redirect box: an empty deny cancels, text regenerates (Automaker). This dummy has no live agent.", true);
    return;
  }
  const after = (a && a.decided_at) || nextDecision(c, t);
  if (after) { setClock(new Date(after).getTime()); toast(`recorded decision applied; the clock jumped to ${fmt.clock(after)}`); }
  else toast("the dummy replays history; this card has no later decision recorded", true);
}
const nextDecision = (c, t) => {
  const later = c.timeline.find((e) => ["signal", "session_start", "merged"].includes(e.step) &&
    new Date(e.time).getTime() > t);
  return later?.time;
};
let toastTimer;
function toast(msg, refuse) {
  const el = $("#toast");
  el.textContent = msg; el.className = refuse ? "refusal" : ""; el.style.display = "block";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.style.display = "none"), 4200);
}

// detail drawer
async function openDetail(c) {
  const st = state(), s = cardState(c, T);
  const accent = st.accents[c.id];
  const msgs = await conversationTail(c, 3);
  $("#detail").innerHTML = `
    <button class="close" data-x>✕</button>
    <h3>#${c.issue_number} ${esc(title(c))}</h3>
    <span class="pill" style="${pillStyle(s)}">${STATUS_TEXT[s.status] || s.status}</span>
    <span class="telemetry" style="display:inline;margin-left:.5rem">${s.telemetry.map(esc).join(" · ")}</span>
    <dl class="facts">
      <dt>project</dt><dd>${esc(c.repository)}</dd>
      <dt>model</dt><dd>${esc(c.model_alias || "–")}</dd>
      <dt>author</dt><dd>${esc(c.author)}</dd>
      <dt>links</dt><dd>${c.issue_url ? `<a href="${c.issue_url}">issue</a>` : ""} ${c.pr_url ? `<a href="${c.pr_url}">PR #${c.pr_number}</a>` : ""}</dd>
    </dl>
    <div class="objective">${esc(c.objective)}</div>
    ${c.agent_summary ? `<section><h4>agent summary</h4><div class="msg">${esc(c.agent_summary)}</div></section>` : ""}
    ${msgs.length ? `<section><h4>last messages <span style="text-transform:none">(the full conversation is one click deeper)</span></h4>${msgs.join("")}</section>` : ""}
    <section><h4>timeline replay</h4>
      <ul class="tl">${c.timeline.filter(visEvent).map((e) => `<li><span class="t">${e.time.slice(11, 16)}</span><span class="s">${esc(e.step)}</span><span>${esc(detailOf(e)).slice(0, 140)}</span></li>`).join("")}</ul>
    </section>
    <section><h4>human accent</h4>
      <div class="accents">${ACCENTS.map((a) => `<span class="swatch ${accent === a ? "set" : ""}" data-acc="${a}" style="background:${accentVar(a)}"></span>`).join("")}
      ${accent ? `<button data-acc="clear">clear</button>` : ""}</div>
    </section>
    <section class="commentform"><h4>comments</h4>
      ${(st.comments[c.id] || []).map((m) => `<div class="msg"><div class="who">${esc(m.who)} · ${esc(m.when)}</div>${esc(m.text)}</div>`).join("")}
      <textarea placeholder="a comment for this card; the dummy keeps it in this browser, the console would file an issue comment"></textarea>
      <button data-c>comment</button>
    </section>`;
  $("#detail").classList.add("open");
  const st2 = state(); st2.read[c.id] = true; store.set("state", st2);
  $("[data-x]").onclick = () => $("#detail").classList.remove("open");
  document.querySelectorAll("#detail [data-acc]").forEach((b) => b.onclick = () => {
    const s3 = state();
    if (b.dataset.acc === "clear") delete s3.accents[c.id]; else s3.accents[c.id] = b.dataset.acc;
    store.set("state", s3); render(); openDetail(c);
  });
  $("[data-c]").onclick = () => {
    const ta = $("#detail textarea"), text = ta.value.trim();
    if (!text) return;
    const s4 = state();
    (s4.comments[c.id] = s4.comments[c.id] || []).push({ who: "sebastian", when: fmt.clock(Date.now()), text });
    store.set("state", s4); render(); openDetail(c);
    toast("comment kept in this browser; in the console it files an issue comment the agent reads");
  };
}
const visEvent = (e) => !["reconcile", "intake", "event"].includes(e.step);
const detailOf = (e) => e.summary || e.reason || e.guidance || e.outcome || e.digest || e.decision || e.action ||
  (e.findings ? JSON.stringify(e.findings).slice(0, 120) : "") || "";

// conversation tail: last n model messages from the newest transcript
async function conversationTail(c, n) {
  const files = c.sessions.map((s) => `data/sessions/${c.id}/${s.id}.jsonl`);
  for (let i = files.length - 1; i >= 0; i--) {
    const lines = await transcript(files[i]);
    const msgs = lines.filter((l) => l.kind === "model_call" && l.detail && l.detail.text)
      .slice(-n).map((l) => `<div class="msg"><div class="who">${l.time.slice(11, 19)} · ${esc(c.model_alias)}</div>${esc(l.detail.text.trim()).slice(0, 320)}</div>`);
    if (msgs.length) return msgs;
  }
  return [];
}
async function transcript(path) {
  if (!transcriptCache[path]) {
    try {
      const r = await fetch(path);
      transcriptCache[path] = r.ok ? r.text().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    } catch { transcriptCache[path] = []; }
  }
  return transcriptCache[path];
}

// hover peek
let peekTimer;
function schedulePeek(c, el) {
  cancelPeek();
  peekTimer = setTimeout(async () => {
    const lines = (await newestTranscript(c)).slice(-9);
    if (!lines.length) return;
    const p = $("#peek");
    p.innerHTML = lines.map((l) => l.kind === "model_call" && l.detail?.text
      ? "» " + esc(l.detail.text.trim().split("\n")[0]).slice(0, 120)
      : l.kind === "tool_call"
        ? "· " + esc(l.detail?.tool) + " " + esc(JSON.stringify(l.detail?.args || {}).slice(0, 70))
        : "").filter(Boolean).join("\n");
    const r = el.getBoundingClientRect();
    p.style.display = "block";
    p.style.left = Math.min(r.left, innerWidth - 560) + "px";
    p.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - p.offsetHeight - 12)) + "px";
  }, 350);
}
function cancelPeek() { clearTimeout(peekTimer); $("#peek").style.display = "none"; }
async function newestTranscript(c) {
  for (let i = c.sessions.length - 1; i >= 0; i--) {
    const lines = await transcript(`data/sessions/${c.id}/${c.sessions[i].id}.jsonl`);
    if (lines.length) return lines;
  }
  return [];
}

// drag: only backlog cards, only into lane columns (ruling 246)
document.addEventListener("dragover", (e) => {
  const col = e.target.closest(".column");
  if (!col) return;
  e.preventDefault();
  col.classList.remove("drop-ok", "drop-refuse");
  col.classList.add(["running", "waiting-human", "waiting-poster", "in-review", "done", "failed", "closed"].includes(col.dataset.col) ? "drop-refuse" : "drop-ok");
});
document.addEventListener("dragleave", (e) => e.target.closest(".column")?.classList.remove("drop-ok", "drop-refuse"));
document.addEventListener("drop", (e) => {
  const col = e.target.closest(".column");
  if (!col) return;
  e.preventDefault();
  const refuse = col.classList.contains("drop-refuse");
  col.classList.remove("drop-ok", "drop-refuse");
  if (refuse) toast("moves between machine-owned states are buttons here; a drag cannot assert state (ruling 246)", true);
  else {
    const id = e.dataTransfer.getData("text/plain");
    const c = BYID[id];
    if (c) { toast(`moved #${c.issue_number} to ${col.dataset.col} — the dummy records it visually only`); }
    col.querySelector(`[data-id="${id}"]`) || null;
  }
});

// clock
function setClock(t) {
  T = Math.max(DATA.t0, Math.min(DATA.t1, t));
  cancelPeek(); $("#detail").classList.remove("open"); render();
}
function playReplay() {
  playing = true; setClock(DATA.t0);
  const span = DATA.t1 - DATA.t0, dur = 45000, t00 = performance.now();
  (function step(now) {
    if (!playing) return;
    const k = (now - t00) / dur;
    if (k >= 1) { playing = false; setClock(DATA.t1); return; }
    T = DATA.t0 + span * k; render();
    requestAnimationFrame(step);
  })(performance.now());
}

// keyboard
document.addEventListener("keydown", (e) => {
  if (e.target.matches("textarea, select, input")) return;
  const k = e.key;
  if (k === "Escape") { $("#detail").classList.remove("open"); $("#keys").classList.remove("open"); cancelPeek(); playing = false; return; }
  if (k === "?") { $("#keys").classList.toggle("open"); return; }
  if (k === "t") { toggleTheme(); return; }
  if (k === "[") { playing = false; setClock(T - 15 * 60000); return; }
  if (k === "]") { playing = false; setClock(T + 15 * 60000); return; }
  if (k === " " ) { const el = document.querySelector(".card:hover"); if (el) { e.preventDefault(); schedulePeek(BYID[el.dataset.id], el); } return; }
  if (k === "d" || k === "x") {
    const first = $("#needsyou [data-act]");
    if (first) first.click();
    return;
  }
  if (/^[0-9]$/.test(k)) {
    const running = visibleCards().map((c) => ({ c, s: cardState(c, T) })).filter((x) => x.s.status === "running");
    const pick = running[+k === 0 ? 9 : +k - 1];
    if (pick) openDetail(pick.c);
  }
});
function toggleTheme() {
  const s = state(); s.theme = s.theme === "dark" ? "light" : "dark";
  store.set("state", s); applyTheme();
}
const applyTheme = () => (document.documentElement.dataset.theme = state().theme);

// boot
(async function boot() {
  DATA = await (await fetch("data/cards.json")).json();
  BYID = Object.fromEntries(DATA.cards.map((c) => [c.id, c]));
  const times = DATA.cards.flatMap((c) => [new Date(c.created_at).getTime(), new Date(c.finished_at || c.created_at).getTime()]);
  DATA.t0 = Math.min(...times) - 60000; DATA.t1 = Math.max(...times) + 60000;
  const sel = $("#project");
  sel.innerHTML = `<option value="">every project</option>` + DATA.projects.map((p) => `<option>${p.name}</option>`).join("");
  sel.onchange = render;
  const af = $("#accentfilter");
  af.innerHTML = `<option value="">any accent</option>` + ACCENTS.map((a) => `<option value="${a}">accent ${a}</option>`).join("");
  af.onchange = render;
  $("#theme").onclick = toggleTheme;
  $("#showkeys").onclick = () => $("#keys").classList.toggle("open");
  $("#play").onclick = playReplay;
  const clk = $("#clock");
  clk.min = DATA.t0; clk.max = DATA.t1; clk.value = DATA.t1;
  clk.oninput = () => { playing = false; setClock(+clk.value); };
  T = DATA.t1;
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get("t")) T = Math.max(DATA.t0, Math.min(DATA.t1, new Date(hash.get("t")).getTime() || DATA.t1));
  if (hash.get("theme")) { const s = state(); s.theme = hash.get("theme"); store.set("state", s); }
  applyTheme(); render();
  if (hash.get("card") && BYID[hash.get("card")]) openDetail(BYID[hash.get("card")]);
  if (hash.get("project")) { sel.value = hash.get("project"); render(); }
})();
