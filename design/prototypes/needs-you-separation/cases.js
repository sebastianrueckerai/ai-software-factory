// cases.js fills the Needs-you column of the captured board with n cards,
// each showing one open case as the five parts of the card flow redesign's
// section 5.8, with the carousel's count and arrows. ?c= picks the
// treatment (before, base, A, B, C, F), ?n= the number of cards (2, 3, 5),
// ?theme= dark or light. The cases are the lab's busy and fire cards.
const q = new URLSearchParams(location.search);
const cand = q.get("c") || "before";
const n = Math.min(5, Math.max(1, +(q.get("n") || 3)));
document.documentElement.dataset.theme = q.get("theme") || "dark";
// base is today's treatment with a selector that reaches the cards; every
// candidate builds on it
const sheets = { before: [], base: ["base.css"], A: ["base.css", "A.css"], B: ["base.css", "B.css"], C: ["base.css", "C.css"], F: ["base.css", "F.css"] }[cand];
if (!sheets) throw new Error("no treatment " + cand);
for (const s of sheets) document.write('<link rel="stylesheet" href="' + s + '">');

const cases = [
  {
    ref: "#558", title: "Plan · activity feed, revision 1", since: "41 min", at: 1, of: 4,
    ask: "How far back does the activity feed reach by default?",
    why: "The planner cannot file the feed's four cards until it knows how far the page reaches. It asked four questions. This is the first.",
    info: "The feed lists the project's events, newest first. One day keeps the page short. One week covers a sprint and loads about 3,000 rows. The 500 newest rows fix the size at any pace. No card of the plan is built yet. Last answer read 21:40.",
    rec: "One week. A human back after a few days sees what happened, and 3,000 rows load in under a second.", src: "the planner",
    answers: [["One week", "the page shows the last 7 days"], ["One day", "the page shows the last 24 hours"], ["The 500 newest rows", "the page shows a fixed number of rows"]],
  },
  {
    ref: "#603", title: "Board export: keep the nightly snapshots", since: "1 h 35 min", at: 1, of: 1,
    ask: "Which store keeps the nightly board snapshots?",
    why: "The agent wrote the export and stopped at the store. Both work, and the choice decides where a restore reads from.",
    info: "Postgres keeps the snapshots with the factory's backups. SQLite keeps them in a file beside the export, off the cluster. The card has spent €1.36 of €2.00. Asked 1 h 35 min ago.",
    rec: "Postgres. The backups already cover it, so a restore needs no second path.", src: "the factory agent",
    answers: [["Postgres", "snapshots go to the factory's database"], ["SQLite", "snapshots go to a file beside the export"], ["Ask the author", "the question goes to the issue's author"]],
  },
  {
    ref: "#607", title: "Merge PR #612 · high risk · migration", since: "25 min", at: 1, of: 2,
    ask: "Merge pull request #612? It changes the database schema.",
    why: "A migration needs a human's yes. Every check is green, and review found nothing to fix.",
    info: "The pull request adds two columns to the task table and fills them for 1,480 rows in about 4 s. It has a down step. Holding it keeps #608 and #611 waiting.",
    rec: "Merge. The down step was tested, and the two waiting cards need the columns.", src: "the factory agent",
    answers: [["Merge", "factoryd merges it and deploys at the next release"], ["Request changes", "your note goes back to the agent"], ["Reject", "the pull request closes"]],
  },
  {
    ref: "#610", title: "Board export: import a snapshot back", since: "12 min", at: 1, of: 2,
    ask: "#610 used its 3 sessions, and 2 findings are still open.",
    why: "The session cap stops a card that keeps failing. The second import fails a test, and review says the importer drops a card's accent.",
    info: "Three sessions fixed the reader and the lanes. TestExportRoundTrip still fails on the second import. €1.48 of €2.00 is spent, and one more session costs about €0.50.",
    rec: "Grant one session with the two findings as its brief. Both sit in one function.", src: "the factory agent",
    answers: [["Grant one session", "the agent starts again with the findings"], ["Back to the planner", "the plan is split again"], ["Close the card", "the work stops, the branch stays"]],
  },
  {
    ref: "#619", title: "Load test: the event stream under 200 followers", since: "38 min", at: 1, of: 1,
    ask: "A load test needs a cx33 server for 5 hours, past the 4 hours a card may lease.",
    why: "The lease is longer than the envelope allows, so a human decides.",
    info: "The test opens 200 followers on one stream and measures the board's reads. Four hours end before the soak's last hour. The lease costs about €0.15.",
    rec: "Lease for 5 hours. The last hour is the soak the test exists for.", src: "the factory agent",
    answers: [["Lease for 5 hours", "the server starts now and stops at 03:20"], ["Lease for 4 hours", "the test runs without its soak"], ["Deny", "the card goes on without a server"]],
  },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function card(c, i) {
  const id = "case-" + c.ref.slice(1);
  const nav = c.of > 1
    ? `<nav class="carousel" aria-label="Open cases of ${c.ref}"><button type="button" class="prev" aria-label="Previous case" disabled>‹</button><span class="pos" aria-live="polite">${c.at} of ${c.of}</span><button type="button" class="next" aria-label="Next case">›</button></nav>`
    : "";
  const answers = c.answers.map(([a, effect], k) =>
    `<button type="button" role="radio" aria-checked="${k === 0}" class="ans${k === 0 ? " rec" : ""}"><b>${esc(a)}</b><span>${esc(effect)}</span></button>`).join("");
  return `<article class="card case" aria-labelledby="${id}">
<p class="case-head"><span class="ref">${c.ref}</span><span class="since" title="waiting for a human">◷ ${c.since}</span></p>${nav}
<p class="case-title">${esc(c.title)}</p>
<div class="parts">
<p class="ask" id="${id}">${esc(c.ask)}</p>
<p class="why">${esc(c.why)}</p>
<p class="info">${esc(c.info)}</p>
<p class="recommendation">Recommendation (${esc(c.src)}): ${esc(c.rec)}</p>
</div>
<form class="decide" onsubmit="return false">
<div class="answers" role="radiogroup" aria-label="Your decision">${answers}</div>
<div class="send"><label>draw, EUR<input type="number" step="0.01" min="0" placeholder="0.00"></label><label>note<textarea rows="1"></textarea></label><button type="submit" class="need-btn">Send</button></div>
</form>
<p class="need-foot"><a href="#">Details</a> · <a href="#">issue</a> · <a href="#">timeline</a></p>
</article>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const col = document.getElementById("needs-you");
  col.querySelector(".cards").innerHTML = cases.slice(0, n).map(card).join("\n");
  col.querySelector("h3 .count").textContent = n;
  const cell = document.querySelector(".cell.needs .n");
  if (cell) cell.textContent = n;
  document.body.dataset.cand = cand;
});
