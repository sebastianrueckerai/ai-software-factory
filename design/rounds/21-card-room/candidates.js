// candidates.js: the round's four candidates for "Give more room", put
// into the console lab's real opened card by shoot.js. A candidate keeps
// the form the server rendered: the field extend.sessions, the tick
// extend.money, the guard inputs extend.shown_* and the fieldset's htmx
// re-read of GET /tasks/{id}/room. It swaps the count's input for its own
// control, which sets that field, and lays out the readout lines the server
// sends again after every swap. Only the chat's budget ask is drawn from
// the scene's figures: its readout does not exist yet.

const CSS = `
#drawer .r21 .room p { margin: 0; }
#drawer .r21 .r21-park { display: none; }
#drawer .r21 .room b { color: var(--text); font-weight: 600; }
#drawer .r21 .tk { display: inline-flex; align-items: center; gap: 6px; margin: 0; color: var(--text); font-size: 13px; cursor: pointer; }
#drawer .r21 .tk input { width: 15px; height: 15px; margin: 0; }
#drawer .r21 .why { color: var(--text); font-size: 13px; }
#drawer .r21 input.cash { width: 96px; height: 30px; padding: 0 8px; font: 600 14px var(--font-mono); text-align: right; }

/* A. stepper, the readout as labelled rows */
#drawer .r21-a .r21-count { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: 2px 0 0; }
#drawer .r21-a .r21-count .lbl { width: 96px; color: var(--text-muted); font-size: 12px; }
#drawer .r21-a .stepper { display: inline-flex; align-items: stretch; height: 32px; border: 1px solid var(--btn-line); border-radius: 3px; }
#drawer .r21-a .stepper button { width: 32px; height: auto; min-height: 0; padding: 0; border: 0; border-radius: 0; background: transparent; color: var(--text); font: 600 16px/1 var(--font-mono); }
#drawer .r21-a .stepper button:hover:not(:disabled) { background: var(--bg-hover); }
#drawer .r21-a .stepper button:disabled { color: var(--text-faint); opacity: .55; cursor: default; }
#drawer .r21-a .stepper input { width: 44px; height: auto; padding: 0; border: 0; border-left: 1px solid var(--btn-line); border-right: 1px solid var(--btn-line); border-radius: 0; background: transparent; color: var(--text); font: 600 15px var(--font-mono); text-align: center; -moz-appearance: textfield; appearance: textfield; }
#drawer .r21-a .stepper input::-webkit-inner-spin-button, #drawer .r21-a .stepper input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
#drawer .r21-a .r21-count .range { color: var(--text-faint); font-size: 12px; }
#drawer .r21-a .rows { display: grid; grid-template-columns: 96px minmax(0, 1fr); align-items: baseline; gap: 5px 12px; margin: 8px 0 2px; font-size: 13px; line-height: 1.45; }
#drawer .r21-a .rows .k { display: flex; align-items: baseline; gap: 6px; color: var(--text-faint); font-size: 12px; font-weight: 600; letter-spacing: .06em; font-variant-caps: all-small-caps; }
#drawer .r21-a .rows .k .tk { gap: 6px; color: var(--text-faint); font-size: 12px; }
#drawer .r21-a .rows .v { color: var(--text-muted); overflow-wrap: anywhere; }
#drawer .r21-a .rows .v.quiet { color: var(--text-faint); font-size: 12px; }

/* B. five buttons, the readout as sentences with the tick in the gutter */
#drawer .r21-b .r21-count { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 2px 0 0; }
#drawer .r21-b .r21-count .lbl { flex-basis: 100%; color: var(--text-muted); font-size: 12px; }
#drawer .r21-b .segs { display: inline-flex; border: 1px solid var(--btn-line); border-radius: 3px; }
#drawer .r21-b .seg { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 32px; margin: 0; color: var(--text); font: 500 14px var(--font-mono); cursor: pointer; }
#drawer .r21-b .seg + .seg { border-left: 1px solid var(--btn-line); }
#drawer .r21-b .seg input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
#drawer .r21-b .seg:hover { background: var(--bg-hover); }
#drawer .r21-b .seg:has(input:checked) { background: color-mix(in srgb, var(--need) 22%, transparent); box-shadow: inset 0 0 0 1px var(--need); font-weight: 700; }
#drawer .r21-b .seg:has(input:focus-visible) { outline: 2px solid var(--focus); outline-offset: 2px; }
#drawer .r21-b .r21-count .each { color: var(--text-faint); font-size: 12px; }
#drawer .r21-b .lines { display: flex; flex-direction: column; gap: 3px; margin: 8px 0 2px; }
#drawer .r21-b .lines p { position: relative; padding-left: 24px; color: var(--text-muted); font-size: 13px; line-height: 1.45; }
#drawer .r21-b .lines p.mline { padding-left: 0; }
#drawer .r21-b .lines p.mline .tk { display: flex; align-items: flex-start; gap: 9px; color: var(--text-muted); font-size: 13px; line-height: 1.45; }
#drawer .r21-b .lines p.mline .tk input { flex: none; margin-top: 2px; }
#drawer .r21-b .lines p.month { margin-top: 3px; color: var(--text-faint); font-size: 12px; }

/* C. one sentence with the count inside, the readout as a paragraph */
#drawer .r21-c .say { margin: 0; color: var(--text); font-size: 15px; line-height: 2.2; }
#drawer .r21-c .say select { display: inline-block; width: auto; height: 30px; margin: 0 3px; padding: 0 26px 0 10px; font: 600 15px var(--font-mono); vertical-align: baseline; background-position-y: center; }
#drawer .r21-c .say .tk { display: inline-flex; font-size: 15px; white-space: nowrap; }
#drawer .r21-c .para { margin: 2px 0 2px; color: var(--text-muted); font-size: 13px; line-height: 1.6; max-width: 64ch; }
#drawer .r21-c .para .month { color: var(--text-faint); }

/* D. a small number field, time and money as a table */
#drawer .r21-d .r21-count { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: 2px 0 0; }
#drawer .r21-d .r21-count label { color: var(--text-muted); font-size: 12px; }
#drawer .r21-d .r21-count input { width: 64px; height: 30px; padding: 0 4px 0 10px; font: 600 14px var(--font-mono); }
#drawer .r21-d .r21-count .each { color: var(--text-faint); font-size: 12px; }
#drawer :is(.r21-d, .r21-d2) table { width: 100%; max-width: 500px; margin: 8px 0 4px; border-collapse: collapse; }
#drawer :is(.r21-d, .r21-d2) th { padding: 0 0 4px 12px; border-bottom: 1px solid var(--line); color: var(--text-faint); font-size: 12px; font-weight: 600; letter-spacing: .06em; font-variant-caps: all-small-caps; text-align: right; }
#drawer :is(.r21-d, .r21-d2) td { padding: 5px 0 5px 12px; border-bottom: 1px solid var(--line); color: var(--text-muted); font: 12.5px var(--font-mono); text-align: right; white-space: nowrap; vertical-align: baseline; }
#drawer :is(.r21-d, .r21-d2) :is(th, td):first-child { padding-left: 0; text-align: left; }
#drawer :is(.r21-d, .r21-d2) td.k { color: var(--text); font: 13px var(--font-ui); }
#drawer :is(.r21-d, .r21-d2) td.add { color: var(--text); font-weight: 600; }
#drawer :is(.r21-d, .r21-d2) td.none { color: var(--text-faint); font-family: var(--font-ui); }
#drawer :is(.r21-d, .r21-d2) .notes p { color: var(--text-muted); font-size: 12.5px; line-height: 1.5; }
#drawer :is(.r21-d, .r21-d2) .notes p.month { color: var(--text-faint); }

/* the fix loop: A2 and D2 */
#drawer :is(.r21-a2, .r21-d2) label { margin: 0; }
#drawer .r21-a2 .rows .then, #drawer .r21-d2 td.then { color: var(--text); }
#drawer .r21-d2 td.k .tk { display: flex; color: var(--text); font-size: 13px; }
#drawer .r21-d2 .notes p.limit { color: var(--text); }
#drawer .r21-d2 input.cash { width: 80px; }

@media (max-width: 600px) {
  /* a 44 px target that keeps the line's own height */
  #drawer .r21 .tk { padding: 14px 0; margin: -14px 0; }
  #drawer .r21 input.cash { height: 44px; }
  #drawer .r21-a .stepper { height: 46px; }
  #drawer .r21-a .stepper button { width: 44px; }
  #drawer .r21-a .stepper input { width: 52px; }
  #drawer .r21-a .r21-count .lbl { width: auto; flex-basis: 100%; }
  #drawer .r21-a .rows { grid-template-columns: 78px minmax(0, 1fr); }
  #drawer .r21-b .segs { display: flex; width: 100%; }
  #drawer .r21-b .seg { flex: 1; width: auto; height: 44px; }
  #drawer .r21-c .say { line-height: 2.9; }
  #drawer .r21-c .say select { height: 44px; }
  #drawer .r21-d .r21-count input { height: 44px; width: 72px; }
  #drawer :is(.r21-d, .r21-d2) td { padding-left: 8px; font-size: 12px; }
}
`;

const CANDIDATES = [
  { slug: "a-stepper", key: "a", name: "A. Stepper, the readout as labelled rows" },
  { slug: "b-five", key: "b", name: "B. Five buttons, the readout as sentences" },
  { slug: "c-sentence", key: "c", name: "C. A sentence with the count inside, the readout as a paragraph" },
  { slug: "d-table", key: "d", name: "D. A number field, time and money as a table" },
];

// the fix loop's two finalists
const FINALISTS = [
  { slug: "a2-stepper", key: "a2", name: "A2. Stepper and labelled rows, fixed" },
  { slug: "d2-table", key: "d2", name: "D2. Five buttons and the table, fixed" },
];

// PAGE runs in the lab's page: window.r21.install(key) restyles every
// room form in the open drawer.
function PAGE() {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const cut = (s) => s.replace(/\.$/, "");

  // read splits the server's readout lines (factoryd RoomLines) by their
  // place: one session's worth, time, money, then the spend limit and the
  // starts when they rise, and the month last. One line alone is a refusal.
  function read(lines) {
    if (lines.length < 4) return { why: lines.join(" ") };
    const m = { est: lines[0], also: [] };
    const fig = (l, unit) => {
      let x = l.match(/^Adds (.+?): (.+?), then (.+)$/);
      if (x) return { adds: x[1], left: x[2], then: x[3] };
      x = l.match(/^Adds no money: (.+)$/);
      if (x) return { off: true, left: x[1], then: x[1].replace(/ left$/, "") };
      x = l.match(/^Enough: (.+)$/);
      return { enough: true, left: x[1], then: x[1].replace(/ left$/, "") };
    };
    m.time = fig(lines[1]);
    m.money = fig(lines[2]);
    for (const l of lines.slice(3, -1)) {
      const x = l.match(/^The spend limit rises from (.+?) to (.+?) EUR first\.$/);
      if (x) m.limit = { from: x[1] + " EUR", to: x[2] + " EUR", line: l };
      else m.starts = l;
    }
    m.month = lines[lines.length - 1];
    const e = m.est.match(/^About (.+?) and (.+?) per session, (.+)$/);
    m.each = e ? { time: e[1], eur: e[2], from: e[3] } : null;
    return m;
  }

  // the sentences of B and C, each with its subject
  const timeText = (t) => t.adds ? `<b>Adds ${esc(t.adds)}</b> of agent time: ${esc(t.left)}, then ${esc(t.then)}.` : `Enough agent time: ${esc(t.left)}.`;
  const moneyText = (m) => m.adds ? `<b>Adds ${esc(m.adds)}</b>: ${esc(m.left)}, then ${esc(m.then)}.` : m.off ? `Adds no money: ${esc(m.left)}.` : `Enough money: ${esc(m.left)}.`;
  const lineText = (l) => {
    const x = l.match(/^(Adds [^:]+)(:.*)$/);
    return x && !/^Adds no money/.test(l) ? `<b>${esc(x[1])}</b>${esc(x[2])}` : esc(l);
  };

  const R = {
    a: {
      count(fs, num) {
        const box = document.createElement("div");
        box.className = "r21-count";
        box.innerHTML = `<span class="lbl" id="${num.id}-l">Sessions' worth</span><span class="stepper" role="group" aria-labelledby="${num.id}-l"><button type="button" class="minus" aria-label="One session's worth less">−</button><span class="slot"></span><button type="button" class="plus" aria-label="One session's worth more">+</button></span><span class="range">1 to 5</span>`;
        num.setAttribute("aria-labelledby", num.id + "-l");
        box.querySelector(".slot").replaceWith(num);
        const step = (d) => {
          const v = Math.min(5, Math.max(1, (+num.value || 1) + d));
          if (v === +num.value) return;
          num.value = v;
          num.dispatchEvent(new Event("change", { bubbles: true }));
          sync();
        };
        const sync = () => {
          box.querySelector(".minus").disabled = +num.value <= 1;
          box.querySelector(".plus").disabled = +num.value >= 5;
        };
        box.querySelector(".minus").onclick = () => step(-1);
        box.querySelector(".plus").onclick = () => step(1);
        num.addEventListener("change", sync);
        sync();
        return box;
      },
      readout(m) {
        if (m.why) return `<div class="rows"><span class="k" data-tick></span><span class="v why">${esc(m.why)}</span></div>`;
        const row = (k, v, cls = "") => `<span class="k">${k}</span><span class="v ${cls}">${v}</span>`;
        return `<div class="rows">` +
          row("per session", esc(m.each ? `About ${m.each.time} and ${m.each.eur}, ${m.each.from}` : m.est), "quiet") +
          row("time", lineText(m.lines[1])) +
          `<span class="k" data-tick></span><span class="v">${lineText(m.lines[2])}</span>` +
          (m.limit ? row("spend limit", esc(cut(m.limit.line).replace(/^The spend limit rises/, "Rises"))) : "") +
          (m.starts ? row("starts", esc(m.starts)) : "") +
          row("this month", esc(m.month), "quiet") + `</div>`;
      },
      tickLabel: "money",
      chat(c) {
        return `<div class="r21-count"><label class="lbl" for="${c.id}">EUR to add</label><span class="slot"></span></div>` +
          `<div class="room"><div class="rows"><span class="k">money</span><span class="v"><b>Adds ${c.adds}</b>: ${c.left}, then ${c.then}</span>` +
          `<span class="k">this month</span><span class="v quiet">${c.month}</span></div></div>`;
      },
    },
    b: {
      count(fs, num) {
        const box = document.createElement("div");
        box.className = "r21-count";
        const n = +num.value || 1;
        box.innerHTML = `<span class="lbl" id="${num.id}-l">Sessions' worth</span><span class="segs" role="radiogroup" aria-labelledby="${num.id}-l">` +
          [1, 2, 3, 4, 5].map((k) => `<label class="seg"><input type="radio" name="extend.sessions" value="${k}"${k === n ? " checked" : ""}><span>${k}</span></label>`).join("") +
          `</span><span class="each"></span>`;
        num.remove();
        return box;
      },
      readout(m, fs) {
        const each = fs.querySelector(".r21-count .each");
        if (m.why) return `<div class="lines"><p><span class="why">${esc(m.why)}</span></p><p class="mline" data-tick></p></div>`;
        if (each) each.textContent = m.each ? `Each is about ${m.each.time} and ${m.each.eur}, ${m.each.from}.` : m.est;
        return `<div class="lines"><p>${timeText(m.time)}</p><p class="mline" data-tick></p>` +
          (m.limit ? `<p>${esc(m.limit.line)}</p>` : "") + (m.starts ? `<p>${esc(m.starts)}</p>` : "") +
          `<p class="month">${esc(m.month)}</p></div>`;
      },
      tickText: (m) => `<span>${m.why ? "With its money" : moneyText(m.money)}</span>`,
      chat(c) {
        return `<div class="r21-count"><label class="lbl" for="${c.id}">EUR to add</label><span class="slot"></span></div>` +
          `<div class="room"><div class="lines"><p><b>Adds ${c.adds}</b>: ${c.left}, then ${c.then}.</p><p class="month">${c.month}</p></div></div>`;
      },
    },
    c: {
      count(fs, num, tick) {
        const p = document.createElement("p");
        p.className = "say";
        const n = +num.value || 1;
        p.innerHTML = `Give <select name="extend.sessions" aria-label="Sessions' worth">` +
          [1, 2, 3, 4, 5].map((k) => `<option value="${k}"${k === n ? " selected" : ""}>${k}</option>`).join("") +
          `</select> sessions' worth, <label class="tk"><span class="slot"></span>with its money</label>.`;
        p.querySelector(".slot").replaceWith(tick);
        num.remove();
        return p;
      },
      readout(m) {
        if (m.why) return `<p class="para why">${esc(m.why)}</p>`;
        const each = m.each ? `A session's worth is about ${esc(m.each.time)} and ${esc(m.each.eur)}, ${esc(m.each.from)}.` : esc(m.est) + ".";
        return `<p class="para">${each} ${timeText(m.time)} ${moneyText(m.money)}` +
          (m.limit ? " " + esc(m.limit.line) : "") + (m.starts ? " " + esc(m.starts) : "") + ` <span class="month">${esc(m.month)}</span></p>`;
      },
      tickInCount: true,
      chat(c) {
        return `<p class="say">Add <span class="slot"></span> EUR to the chat's budget for November.</p>` +
          `<div class="room"><p class="para"><b>Adds ${c.adds}</b>: ${c.left}, then ${c.then}. <span class="month">${c.month}</span></p></div>`;
      },
    },
    d: {
      count(fs, num) {
        const box = document.createElement("div");
        box.className = "r21-count";
        box.innerHTML = `<label for="${num.id}">Sessions' worth</label><span class="slot"></span><span class="each"></span>`;
        box.querySelector(".slot").replaceWith(num);
        return box;
      },
      readout(m, fs) {
        const each = fs.querySelector(".r21-count .each");
        if (m.why) return `<div class="notes"><p class="why">${esc(m.why)}</p><p data-tick></p></div>`;
        if (each) each.textContent = m.each ? `One session's worth: about ${m.each.time} and ${m.each.eur}, ${m.each.from}` : m.est;
        const left = (f) => esc(f.left.replace(/ left$/, ""));
        const cells = (f) => f.adds ? `<td>${left(f)}</td><td class="add">${esc(f.adds)}</td><td>${esc(f.then)}</td>`
          : `<td>${left(f)}</td><td class="none">${f.off ? "left out" : "enough"}</td><td>${esc(f.then)}</td>`;
        return `<table><thead><tr><th></th><th>left</th><th>adds</th><th>then</th></tr></thead><tbody>` +
          `<tr><td class="k">Agent time</td>${cells(m.time)}</tr>` +
          `<tr><td class="k" data-tick></td>${cells(m.money)}</tr>` +
          (m.limit ? `<tr><td class="k">Spend limit</td><td>${esc(m.limit.from)}</td><td class="none">rises first</td><td>${esc(m.limit.to)}</td></tr>` : "") +
          `</tbody></table><div class="notes">${m.starts ? `<p>${esc(m.starts)}</p>` : ""}<p class="month">${esc(m.month)}</p></div>`;
      },
      tickLabel: "Money",
      chat(c) {
        return `<div class="room"><table><thead><tr><th></th><th>left</th><th>adds, EUR</th><th>then</th></tr></thead><tbody>` +
          `<tr><td class="k"><label for="${c.id}">Money</label></td><td>${c.left.replace(/ left$/, "")}</td><td class="add"><span class="slot"></span></td><td>${c.then}</td></tr></tbody></table>` +
          `<div class="notes"><p class="month">${c.month}</p></div></div>`;
      },
    },
  };

  // the fix loop. A2: what the card then has reads in --text beside the
  // bold add, and the chat's field lines up with the rows. D2: B's five
  // buttons in place of the number field, the spend limit leaves the
  // table (its figure is a limit, not what is left) for a note in --text,
  // and the then column reads in --text.
  const thenText = (l) => {
    const x = l.match(/^(Adds [^:]+)(: .*?, )(then .*)$/);
    return x && !/^Adds no money/.test(l) ? `<b>${esc(x[1])}</b>${esc(x[2])}<span class="then">${esc(x[3])}</span>` : esc(l);
  };
  R.a2 = { ...R.a, cls: "r21-a r21-a2",
    readout(m) {
      if (m.why) return R.a.readout(m);
      const row = (k, v, cls = "") => `<span class="k">${k}</span><span class="v ${cls}">${v}</span>`;
      return `<div class="rows">` +
        row("per session", esc(m.each ? `About ${m.each.time} and ${m.each.eur}, ${m.each.from}` : m.est), "quiet") +
        row("time", thenText(m.lines[1])) +
        `<span class="k" data-tick></span><span class="v">${thenText(m.lines[2])}</span>` +
        (m.limit ? row("spend limit", esc(cut(m.limit.line).replace(/^The spend limit rises/, "Rises"))) : "") +
        (m.starts ? row("starts", esc(m.starts)) : "") +
        row("this month", esc(m.month), "quiet") + `</div>`;
    },
    chat(c) {
      return `<div class="r21-count"><label class="lbl" for="${c.id}">EUR to add</label><span class="slot"></span></div>` +
        `<div class="room"><div class="rows"><span class="k">money</span><span class="v"><b>Adds ${c.adds}</b>: ${c.left}, <span class="then">then ${c.then}</span></span>` +
        `<span class="k">this month</span><span class="v quiet">${c.month}</span></div></div>`;
    },
  };
  R.d2 = { cls: "r21-b r21-d2", count: R.b.count, tickLabel: "Money",
    readout(m, fs) {
      const each = fs.querySelector(".r21-count .each");
      if (m.why) return `<div class="notes"><p class="why">${esc(m.why)}</p><p data-tick></p></div>`;
      if (each) each.textContent = m.each ? `Each is about ${m.each.time} and ${m.each.eur}, ${m.each.from}.` : m.est;
      const left = (f) => esc(f.left.replace(/ left$/, ""));
      const cells = (f) => f.adds ? `<td>${left(f)}</td><td class="add">${esc(f.adds)}</td><td class="then">${esc(f.then)}</td>`
        : `<td>${left(f)}</td><td class="none">${f.off ? "left out" : "enough"}</td><td class="then">${esc(f.then)}</td>`;
      return `<table><thead><tr><th></th><th>left</th><th>adds</th><th>then</th></tr></thead><tbody>` +
        `<tr><td class="k">Agent time</td>${cells(m.time)}</tr>` +
        `<tr><td class="k" data-tick></td>${cells(m.money)}</tr></tbody></table>` +
        `<div class="notes">${m.limit ? `<p class="limit">${esc(m.limit.line)}</p>` : ""}${m.starts ? `<p>${esc(m.starts)}</p>` : ""}<p class="month">${esc(m.month)}</p></div>`;
    },
    chat(c) {
      return `<div class="room"><table><thead><tr><th></th><th>left</th><th>adds, EUR</th><th>then</th></tr></thead><tbody>` +
        `<tr><td class="k"><label for="${c.id}">Money</label></td><td>${c.left.replace(/ left$/, "")}</td><td class="add"><span class="slot"></span></td><td class="then">${c.then}</td></tr></tbody></table>` +
        `<div class="notes"><p class="month">${c.month}</p></div></div>`;
    },
  };

  function installExtend(form, key) {
    const r = R[key];
    const fs = form.querySelector("fieldset.fields");
    const room = fs.querySelector(".room");
    const num = fs.querySelector('input[name="extend.sessions"]');
    const tick = fs.querySelector('input[name="extend.money"]');
    fs.classList.add("r21", ...(r.cls || "r21-" + key).split(" "));
    fs.querySelector(`label[for="${num.id}"]`).remove();
    const tickLabel = tick.closest("label");
    const park = document.createElement("span");
    park.className = "r21-park";
    fs.insertBefore(park, room);
    // the tick's own label: in the money line it names the line it ticks
    const tk = document.createElement("label");
    tk.className = "tk";
    tk.append(tick);
    if (r.tickLabel) tk.append(document.createTextNode(r.tickLabel));
    tickLabel.remove();
    fs.insertBefore(r.count(fs, num, tick), room);
    const paint = () => {
      const lines = [...room.querySelectorAll(":scope > p")].map((p) => p.textContent.trim());
      if (!lines.length) return;
      const guard = [...room.querySelectorAll(":scope > input")];
      const m = read(lines);
      m.lines = lines;
      room.innerHTML = r.readout(m, fs);
      room.append(...guard);
      const slot = room.querySelector("[data-tick]");
      if (r.tickText) tk.replaceChildren(tick), tk.insertAdjacentHTML("beforeend", r.tickText(m));
      if (!r.tickInCount) {
        if (slot) slot.append(tk);
        else park.append(tk);
      }
    };
    form.addEventListener("htmx:beforeSwap", (e) => { if (e.detail.target === room && !r.tickInCount) park.append(tk); });
    form.addEventListener("htmx:afterSwap", (e) => { if (e.detail.target === room) paint(); });
    paint();
  }

  // the chat's budget ask: its amount field stays; the money line and the
  // month line are drawn from the scene (spent 5.00 of 5.00 EUR, the
  // project 120.00 - 4.10 EUR this month)
  function installChat(form, key) {
    const r = R[key];
    const fs = form.querySelector("fieldset.fields");
    const cash = fs.querySelector('input[name="choice:fund_chat.eur"]');
    fs.classList.add("r21", ...(r.cls || "r21-" + key).split(" "));
    fs.querySelector(`label[for="${cash.id}"]`).remove();
    cash.classList.add("cash");
    const send = fs.querySelector(".send");
    const tmp = document.createElement("div");
    tmp.innerHTML = r.chat({ id: cash.id, adds: "5.00 EUR", left: "none left", then: "5.00 EUR", month: "The project has 115.90 EUR left this month." });
    if (key === "c") cash.setAttribute("aria-label", "EUR to add");
    tmp.querySelector(".slot").replaceWith(cash);
    fs.insertBefore(tmp, send);
    tmp.replaceWith(...tmp.childNodes);
  }

  window.r21 = {
    install(key) {
      for (const f of document.querySelectorAll('#drawer form[data-answer="extend"]')) installExtend(f, key);
      for (const f of document.querySelectorAll('#drawer form[data-answer="choice:fund_chat"]')) installChat(f, key);
    },
  };
}

module.exports = { CSS, CANDIDATES, FINALISTS, PAGE };
