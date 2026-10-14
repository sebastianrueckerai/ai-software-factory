#!/usr/bin/env python3
"""Derives the round's three variants from the Mission control prototype.

Each variant is prototypes/06-mission-control/index.html with the board's
find or filter control added, the accent filter and the ticker removed
(C11, C12) and the scenarios path fixed. Run from anywhere; writes
<variant>/index.html beside this file. Every replacement must match the
prototype exactly once, so a changed prototype fails loudly here.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent.parent / "prototypes" / "06-mission-control" / "index.html"


def sub(text, old, new, count=1):
    n = text.count(old)
    if n != count:
        sys.exit(f"expected {count} of {old[:70]!r}, found {n}")
    return text.replace(old, new)


def rsub(text, pattern, new):
    out, n = re.subn(pattern, new, text, count=1, flags=re.S)
    if n != 1:
        sys.exit(f"pattern not found: {pattern[:70]!r}")
    return out


# ---- common: the scenarios path, no ticker (C12), no accent filter (C11), a cols-only render ----

def common(t):
    t = sub(t, '<script src="../scenarios.js"></script>', '<script src="../../../prototypes/scenarios.js"></script>')
    t = sub(t, '''  <footer class="ticker" id="ticker" aria-label="Recent events">
    <div class="tk-track" id="ticker-track"></div>
    <p class="stream" hidden>The live stream ended: reload the page to follow the board.</p>
  </footer>
''', '''  <footer class="foot"><p class="stream" hidden>The live stream ended: reload the page to follow the board.</p></footer>
''')
    t = rsub(t, r"/\* the ticker \*/\n.*?@keyframes tick \{ to \{ transform: translateX\(-50%\); \} \}\n",
             ".stream { margin: 0; padding: 4px 16px; color: var(--need-text); font: 12px var(--font-mono); }\n")
    t = sub(t, "  .ticker { margin-top: 4px; }\n", "")
    t = sub(t, "  .tk-track { animation: none !important; }\n", "")
    t = rsub(t, r"  /\* the ticker: the done cards' times and titles \*/\n.*?\n  \}\n\n  /\* the drawer \*/", "  /* the drawer */")
    t = sub(t, "renderPulse(); renderChat(); renderBoard(); renderTicker();", "renderPulse(); renderChat(); renderBoard();")
    t = sub(t, "$('#top').classList.remove('menu-open'); renderBoard(); renderTicker(); });", "$('#top').classList.remove('menu-open'); renderBoard(); });")
    t = sub(t, "rt = setTimeout(function () { renderTicker(); markOverflow(); }, 200);", "rt = setTimeout(function () { markOverflow(); }, 200);")
    t = sub(t, '''    if (t.id === 'accent') { st.accent = t.value; renderBoard(); $('#accent').focus(); }
    else if (t.id === 'chat-old' && t.value !== '') {''', '''    if (t.id === 'chat-old' && t.value !== '') {''')
    t = sub(t, '''  function countHTML(n) { return n ? '<span class="count-pill">' + n + '</span>' : '<span class="cnt">0</span>'; }
  function needsColHTML(title, list, attrs, where) {
    return '<section class="col needs-col marks' + (list.length ? '' : ' calm empty') + '" ' + attrs + '><div class="col-head"><h3>' + title + '</h3>' + countHTML(list.length) + '</div>' +
      '<div class="col-body">' + list.map(function (n) { return needHTML(n, where); }).join('') + '</div></section>';
  }
''', '''  /* a column's count: the shown number, and the whole when a filter hides some */
  function countHTML(n, total, pill) {
    var w = n !== total ? '<b>' + n + '</b><span class="of"> of ' + total + '</span>' : String(n);
    return pill && total ? '<span class="count-pill">' + w + '</span>' : '<span class="cnt">' + w + '</span>';
  }
  function needsColHTML(title, all, attrs, where) {
    var list = all.filter(function (n) { return keep(n, 'needs'); });
    return '<section class="col needs-col marks' + (all.length ? '' : ' calm empty') + '" ' + attrs + '><div class="col-head"><h3>' + title + '</h3>' + countHTML(list.length, all.length, true) + '</div>' +
      '<div class="col-body">' + (list.length ? list.map(function (n) { return needHTML(n, where); }).join('') : (all.length ? '<p class="none-match">none match</p>' : '')) + '</div></section>';
  }
''')
    t = sub(t, '''  function colsHTML() {
    var d = D(), phone = MQ.matches;
    return '<div class="cols' + (d.needs.length ? '' : ' calm') + '">' + needsColHTML('Needs you', d.needs, 'data-col="needs" id="needs" tabindex="-1" aria-label="Needs you"') + COLS.map(function (ct) {
      var k = ct[0], list = d[k].filter(vis), count = (k === 'done' && d.doneCount && !st.accent) ? d.doneCount : list.length;
      var open = phone ? (st.cols[k] != null ? st.cols[k] : k !== 'done') : true;
      var title = phone ? '<button type="button" class="col-tog" data-col="' + k + '" aria-expanded="' + open + '" aria-controls="colb-' + k + '">' + ct[1] + '</button>' : ct[1];
      return '<section class="col marks" data-col="' + k + '" aria-labelledby="col-' + k + '"><div class="col-head"><h3 id="col-' + k + '">' + title + '</h3><span class="cnt">' + count + '</span></div>' +
        '<div class="col-body" id="colb-' + k + '"' + (open ? '' : ' hidden') + '>' + list.map(function (c) { return k === 'done' ? doneHTML(c) : cardHTML(c, k); }).join('') + '</div></section>';
    }).join('') + '</div>';
  }
''', '''  function colsHTML() {
    var d = D(), phone = MQ.matches;
    return '<div class="cols' + (d.needs.length ? '' : ' calm') + '">' + needsColHTML('Needs you', d.needs, 'data-col="needs" id="needs" tabindex="-1" aria-label="Needs you"') + COLS.map(function (ct) {
      var k = ct[0], all = d[k], list = order(all.filter(function (c) { return keep(c, k); }), k);
      var total = all.length, count = list.length === total && k === 'done' && d.doneCount ? d.doneCount : total;
      var open = phone ? (st.cols[k] != null ? st.cols[k] : k !== 'done') : true;
      var title = phone ? '<button type="button" class="col-tog" data-col="' + k + '" aria-expanded="' + open + '" aria-controls="colb-' + k + '">' + ct[1] + '</button>' : ct[1];
      return '<section class="col marks" data-col="' + k + '" aria-labelledby="col-' + k + '"><div class="col-head"><h3 id="col-' + k + '">' + title + '</h3>' + headExtra(k) + countHTML(list.length, count) + '</div>' + colState(k) +
        '<div class="col-body" id="colb-' + k + '"' + (open ? '' : ' hidden') + '>' + (list.length ? list.map(function (c) { return k === 'done' ? doneHTML(c) : cardHTML(c, k); }).join('') : (total ? '<p class="none-match">none match</p>' : '')) + '</div></section>';
    }).join('') + '</div>';
  }
  /* a change of the filter redraws the columns only, so the control keeps its focus */
  function renderCols() {
    var old = $('#board .cols'); if (!old) return renderBoard();
    old.outerHTML = colsHTML(); markOverflow();
  }
''')
    t = sub(t, '''    $('#board').innerHTML = '<div class="board-head"><h2 id="board-title">Board</h2>' + acc +
      '<button type="button" class="btn btn-xs" id="view-toggle" aria-keyshortcuts="w">' + (st.wide ? 'Four columns' : 'Wide view') + '</button>' +
      '<button type="button" class="icon-btn" id="keys-toggle" style="width:24px;height:24px;font:12px var(--font-mono)" aria-haspopup="dialog" aria-controls="keys" aria-keyshortcuts="Shift+?" title="Keys" aria-label="Keys">?</button></div>' +
      colsHTML();''', '''    $('#board').innerHTML = '<div class="board-head"><h2 id="board-title">Board</h2>' + headControl() +
      '<button type="button" class="btn btn-xs" id="view-toggle" aria-keyshortcuts="w">' + (st.wide ? 'Four columns' : 'Wide view') + '</button>' +
      '<button type="button" class="icon-btn" id="keys-toggle" style="width:24px;height:24px;font:12px var(--font-mono)" aria-haspopup="dialog" aria-controls="keys" aria-keyshortcuts="Shift+?" title="Keys" aria-label="Keys">?</button></div>' +
      underHead() + colsHTML();''')
    t = sub(t, '''    var acc = '<span class="sel sm"><select id="accent" aria-label="Accent"><option value="">every accent</option>' +
      ACCENTS.map(function (a) { return '<option' + (a === st.accent ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select></span>';
''', '')
    t = sub(t, "/* Needs you: the first column, lit amber */", '''.cnt .of, .count-pill .of { font-weight: 400; opacity: .75; }
.cnt b { font-weight: 500; color: var(--accent); }
.none-match { margin: 6px 4px; color: var(--text-faint); font: 11.5px var(--font-mono); }
@@CSS@@
/* Needs you: the first column, lit amber */''')
    t = sub(t, "  function vis(c) { return !st.accent || c.accent === st.accent; }\n", "@@JS@@\n")
    return t


def fill(t, css, js):
    return t.replace("@@CSS@@", css).replace("@@JS@@", js)


# ---- the find engine, shared by the find box and the chips: words match the face, key:value a fact behind it ----

FIND_JS = r'''  /* the find: a word matches what the face says (the ref, the title, the state and stage words, the activity, the chips),
     key:value a fact the face does not show (plan:558, stage:verifying, status:failed, by:sebastian, model:coding-cheap, pr:612);
     every term must match */
  function faceText(c) {
    var p = ['#' + c.issue, c.title, c.status, c.stage, c.activity, c.question, c.reason,
      c.blocked ? 'blocked by ' + c.blocked + ' ' + (c.blockedOn || '') : '', c.waitingOn ? 'waiting on #' + c.waitingOn : '',
      c.fromPlan ? 'from plan #' + c.fromPlan : '', c.track === 'plan' ? 'plan' : '', c.provider ? 'on the provider' : '',
      c.stale ? 'stale ' + (c.staleText || '') : '', isNear(c) ? 'near its budget' : '', c.checks ? c.checks + ' checks' : '',
      c.pr ? 'pr #' + c.pr : '', c.kind === 'merge' ? 'merge ' + c.risk + ' risk' + (c.migration ? ' migration' : '') : ''];
    return p.filter(Boolean).join(' ').toLowerCase();
  }
  function factOf(c, k) {
    switch (k) {
      case 'plan': return c.fromPlan ? String(c.fromPlan) : (c.track === 'plan' ? String(c.issue) : '');
      case 'stage': return c.stage || '';
      case 'status': return c.status || '';
      case 'by': return (/filed by (\w+)/.exec(c.activity || c.provenance || '') || [])[1] || '';
      case 'model': return c.model || '';
      case 'pr': return c.pr ? String(c.pr) : '';
    }
    return null;
  }
  /* is:<state> is the exact state, where a word could also hit a title */
  function isFacet(c, v) {
    switch (v) {
      case 'failed': return c.status === 'failed';
      case 'blocked': return !!c.blocked;
      case 'stale': return !!c.stale;
      case 'provider': return !!c.provider;
      case 'near': return isNear(c);
      case 'retrying': return !!c.retrying;
      case 'held': return !!c.held;
      case 'plan': return c.track === 'plan';
    }
    return false;
  }
  function matches(c, q) {
    var terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return true;
    var text = faceText(c);
    return terms.every(function (t) {
      var m = /^(\w+):(.*)$/.exec(t), v = m && factOf(c, m[1]);
      if (m && m[1] === 'is') return isFacet(c, m[2]);
      if (m && v !== null) return v.toLowerCase() === m[2].replace(/^#/, '');
      return text.indexOf(t) >= 0;
    });
  }
  function keep(c) { return matches(c, st.q); }
  function order(list) { return list; }
  function headExtra() { return ''; }
  function colState() { return ''; }
  function setQ(q, redraw) {
    st.q = q;
    try { var u = new URL(location.href); if (q) u.searchParams.set('q', q); else u.searchParams.delete('q'); history.replaceState(null, '', u); } catch (e) {}
    if (redraw !== false) renderCols();
  }
'''

# ---- variant A: one find box in the board's header ----

FIND_CSS = r'''.board-head h2 { margin-right: 0; }
.board-head #view-toggle { margin-left: auto; }
.find { position: relative; display: inline-flex; align-items: center; margin-left: 6px; }
.find input { width: 232px; height: 24px; padding: 0 22px 0 8px; border: 1px solid var(--btn-line); border-radius: 3px; background: transparent; color: var(--text); font: 11.5px var(--font-mono); transition: border-color .12s, box-shadow .12s; }
.find input::placeholder { color: var(--text-faint); }
.find input:hover { border-color: var(--text-faint); }
.find input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.find.on input { border-color: var(--accent); }
.find-x { position: absolute; right: 2px; top: 2px; width: 20px; height: 20px; padding: 0; border: 0; background: none; color: var(--text-muted); font: 15px/1 var(--font-mono); cursor: pointer; }
.find-x:hover { color: var(--text); }
@media (max-width: 899px) {
  .board-head { flex-wrap: wrap; height: auto; }
  .find { flex: 1 1 100%; order: 5; margin: 0; }
  .find input { width: 100%; height: 44px; padding-right: 44px; font-size: 14px; }
  .find-x { top: 0; right: 0; width: 44px; height: 44px; font-size: 20px; }
}
'''

FIND_HEAD_JS = r'''  function headControl() {
    return '<form class="find' + (st.q ? ' on' : '') + '" id="find" role="search"><label class="vh" for="q">Find on the board</label>' +
      '<input id="q" type="text" value="' + esc(st.q) + '" placeholder="Find: a word, #612, plan:558" autocomplete="off" spellcheck="false" aria-keyshortcuts="f">' +
      '<button type="button" class="find-x" id="find-clear" aria-label="Clear the find" title="Clear the find"' + (st.q ? '' : ' hidden') + '>×</button></form>';
  }
  function underHead() { return ''; }
'''


def variant_find(t):
    t = fill(common(t), FIND_CSS, FIND_JS + FIND_HEAD_JS)
    t = sub(t, "wide: false, accent: '', pulseOpen: false,", "wide: false, q: params.get('q') || '', pulseOpen: false,")
    t = sub(t, "      <dt><kbd>/</kbd></dt><dd>write to the project agent</dd>\n",
            "      <dt><kbd>/</kbd></dt><dd>write to the project agent</dd>\n"
            "      <dt><kbd>f</kbd></dt><dd>find on the board: a word or a ref, or <code>plan:558</code>, <code>stage:verifying</code>, <code>is:failed</code> (blocked, stale, provider, near), <code>by:sebastian</code>, <code>model:coding-cheap</code>; <kbd>Escape</kbd> clears it</dd>\n")
    t = sub(t, "      if (field) t.blur(); return;",
            "      if (field) { if (t.id === 'q' && t.value) { t.value = ''; setQ(''); $('#find').classList.remove('on'); $('#find-clear').hidden = true; } else t.blur(); } return;")
    t = sub(t, "    if (e.key === '/') { e.preventDefault(); if (st.wide) toggleWide(); $('#chat-input').focus(); }",
            "    if (e.key === '/') { e.preventDefault(); if (st.wide) toggleWide(); $('#chat-input').focus(); }\n"
            "    else if (e.key === 'f') { e.preventDefault(); var q = $('#q'); q.focus(); q.select(); }")
    t = sub(t, "  document.addEventListener('input', function (e) { if (e.target.dataset.q != null) st.queue[+e.target.dataset.q] = e.target.value; });",
            "  document.addEventListener('input', function (e) {\n"
            "    if (e.target.dataset.q != null) st.queue[+e.target.dataset.q] = e.target.value;\n"
            "    if (e.target.id === 'q') { setQ(e.target.value); $('#find').classList.toggle('on', !!st.q); $('#find-clear').hidden = !st.q; }\n"
            "  });")
    t = sub(t, "      case 'chat-new': newConversation(); break;",
            "      case 'chat-new': newConversation(); break;\n"
            "      case 'find-clear': $('#q').value = ''; setQ(''); $('#find').classList.remove('on'); t.hidden = true; $('#q').focus(); break;")
    return t


# ---- variant B: a row of chips under the board's header, drawn from what is on the board ----

CHIPS_CSS = r'''.fchips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 22px; flex: none; }
.fchips .lbl { color: var(--text-faint); font: 11px var(--font-mono); margin-right: 2px; }
.fchip { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px; border: 1px solid var(--line-strong); border-radius: 2px; background: none; color: var(--text-muted); font: 11px/1 var(--font-mono); white-space: nowrap; cursor: pointer; transition: color .12s, border-color .12s, background-color .12s; }
.fchip .n { color: var(--text); }
.fchip:hover { color: var(--text); border-color: var(--text-faint); background: var(--bg-hover); }
.fchip[aria-pressed="true"] { color: var(--accent-ink); background: var(--accent); border-color: var(--accent); }
.fchip[aria-pressed="true"] .n { color: inherit; }
.fchip.warn { color: var(--need-text); border-color: color-mix(in srgb, var(--need) 55%, transparent); }
.fchip.warn .n { color: var(--need-text); }
.fchip.bad { color: var(--st-failed); border-color: color-mix(in srgb, var(--st-failed) 55%, transparent); }
.fchip.bad .n { color: var(--st-failed); }
.fchip.warn[aria-pressed="true"], .fchip.bad[aria-pressed="true"] { color: var(--accent-ink); background: var(--accent); border-color: var(--accent); }
.fchip.warn[aria-pressed="true"] .n, .fchip.bad[aria-pressed="true"] .n { color: inherit; }
@media (max-width: 899px) {
  .fchips { gap: 8px; }
  .fchip { height: 44px; padding: 0 14px; font-size: 13px; }
}
'''

CHIPS_JS = r'''  /* the chips: one per exceptional state on the board and one per plan with cards on it, each a token of the find */
  function chipsOf(d) {
    var all = d.needs.concat(d.queued, d.inprogress, d.done), out = [], plans = {};
    var n = function (q) { return all.filter(function (c) { return matches(c, q); }).length; };
    [['is:failed', 'failed', 'bad'], ['is:blocked', 'blocked', 'bad'], ['is:stale', 'stale', 'warn'], ['is:provider', 'on the provider', 'warn'], ['is:near', 'near budget', 'warn']].forEach(function (x) {
      var k = n(x[0]); if (k) out.push({ q: x[0], label: x[1], n: k, cls: x[2] });
    });
    all.forEach(function (c) { if (c.fromPlan) plans[c.fromPlan] = 1; if (c.track === 'plan') plans[c.issue] = 1; });
    Object.keys(plans).sort().forEach(function (p) { out.push({ q: 'plan:' + p, label: 'plan #' + p, n: n('plan:' + p), cls: '' }); });
    return out;
  }
  function headControl() { return ''; }
  function underHead() {
    var chips = chipsOf(D()); if (!chips.length) return '';
    return '<div class="fchips" role="group" aria-label="Show only"><span class="lbl" aria-hidden="true">only</span>' + chips.map(function (c) {
      return '<button type="button" class="fchip ' + c.cls + '" data-tok="' + esc(c.q) + '" aria-pressed="' + (st.q === c.q) + '">' + esc(c.label) + ' <b class="n">' + c.n + '</b></button>';
    }).join('') + '</div>';
  }
'''


def variant_chips(t):
    t = fill(common(t), CHIPS_CSS, FIND_JS + CHIPS_JS)
    t = sub(t, "wide: false, accent: '', pulseOpen: false,", "wide: false, q: params.get('q') || '', pulseOpen: false,")
    t = sub(t, "    if (t.dataset.act) { act(t); return; }",
            "    if (t.dataset.act) { act(t); return; }\n"
            "    if (t.dataset.tok != null) { setQ(st.q === t.dataset.tok ? '' : t.dataset.tok, false); renderBoard(); var b = $('[data-tok=\"' + t.dataset.tok + '\"]'); if (b) b.focus(); return; }")
    return t


# ---- variant C: a menu in each column's head with that column's orders and filters ----

MENUS_CSS = r'''.col-head { position: relative; }
.col-menu { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 5px; border: 1px solid transparent; border-radius: 2px; background: none; color: var(--text-faint); font: 11px var(--font-mono); white-space: nowrap; cursor: pointer; transition: color .12s, border-color .12s, background-color .12s; }
.col-menu::after { content: "▾"; font-size: 12px; }
.col-menu:hover, .col-menu[aria-expanded="true"] { color: var(--text); border-color: var(--line-strong); background: var(--bg-hover); }
.col-menu.on { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.col-state { display: flex; align-items: center; gap: 6px; padding: 3px 6px 3px 10px; border-bottom: 1px solid var(--line); color: var(--accent); font: 11px/1.5 var(--font-mono); flex: none; }
.col-state span { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.col-x { width: 20px; height: 20px; padding: 0; border: 0; background: none; color: var(--text-muted); font: 15px/1 var(--font-mono); cursor: pointer; }
.col-x:hover { color: var(--text); }
.menu-pop { position: absolute; left: 6px; right: 6px; top: 31px; z-index: 15; padding: 4px 12px 8px; background: var(--bg-raised); border: 1px solid var(--line-strong); box-shadow: 0 12px 32px rgba(0, 0, 0, .4); font-size: 12.5px; }
[data-theme="light"] .menu-pop { box-shadow: 0 12px 32px rgba(29, 53, 87, .18); }
.menu-pop fieldset { display: flex; flex-direction: column; gap: 1px; margin: 0; padding: 6px 0; border: 0; }
.menu-pop fieldset + fieldset { border-top: 1px solid var(--line); }
.menu-pop legend { float: left; width: 100%; margin: 0 0 3px; padding: 0; color: var(--text-faint); font-size: 11.5px; font-weight: 600; font-variant-caps: all-small-caps; letter-spacing: .08em; }
.menu-pop label { display: flex; align-items: center; gap: 8px; min-height: 22px; color: var(--text-muted); cursor: pointer; }
.menu-pop label:hover { color: var(--text); }
.menu-pop input[type="radio"] { margin: 0; accent-color: var(--accent); }
.menu-pop input[type="radio"]:checked + span { color: var(--text); }
@media (max-width: 899px) {
  .col-menu { height: 44px; min-width: 44px; justify-content: center; padding: 0 10px; font-size: 14px; }
  .col-state { padding: 0 0 0 12px; }
  .col-x { width: 44px; height: 44px; font-size: 20px; }
  .menu-pop { left: 0; right: 0; top: 43px; }
  .menu-pop label { min-height: 44px; }
}
'''

MENUS_JS = r'''  /* each column's orders and filters; the first of each is the default and leaves the URL */
  var MENUS = {
    queued: { o: [['next', 'next up'], ['oldest', 'oldest first'], ['newest', 'newest first']], s: [['all', 'all'], ['blocked', 'blocked only']] },
    inprogress: { o: [['stage', 'by stage'], ['oldest', 'oldest first'], ['spend', 'by spend']], s: [['all', 'all'], ['exceptional', 'exceptional only']] },
    done: { o: [['newest', 'newest first'], ['oldest', 'oldest first']], s: [['all', 'all'], ['failed', 'failed only']] }
  };
  var PARAM = { queued: 'queued', inprogress: 'progress', done: 'done' };
  function menuOf(k) {
    var m = { o: MENUS[k].o.slice(), s: MENUS[k].s.slice() }, plans = {};
    if (k === 'queued') { D().queued.forEach(function (c) { if (c.fromPlan) plans[c.fromPlan] = 1; });
      Object.keys(plans).sort().forEach(function (p) { m.s.push(['plan:' + p, 'from plan #' + p]); }); }
    return m;
  }
  function readMenus() {
    var cm = {};
    Object.keys(MENUS).forEach(function (k) {
      var m = menuOf(k), v = (params.get(PARAM[k]) || '').split(','), c = { o: m.o[0][0], s: m.s[0][0] };
      v.forEach(function (x) { if (m.o.some(function (y) { return y[0] === x; })) c.o = x; else if (m.s.some(function (y) { return y[0] === x; })) c.s = x; });
      cm[k] = c;
    });
    return cm;
  }
  function writeMenus() {
    try { var u = new URL(location.href);
      Object.keys(MENUS).forEach(function (k) {
        var m = menuOf(k), c = st.cm[k], v = [];
        if (c.o !== m.o[0][0]) v.push(c.o); if (c.s !== m.s[0][0]) v.push(c.s);
        if (v.length) u.searchParams.set(PARAM[k], v.join(',')); else u.searchParams.delete(PARAM[k]);
      });
      history.replaceState(null, '', u); } catch (e) {}
  }
  function ageMin(c) {
    if (c.runs) return sumRuns(c, function () { return true; });
    var h = /(\d+) h/.exec(c.elapsed || ''), m = /(\d+) min/.exec(c.elapsed || '');
    return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
  }
  var STAGE = { planning: 0, building: 1, verifying: 2 };
  function keep(c, k) {
    var s = st.cm[k] ? st.cm[k].s : 'all';
    if (s === 'all') return true;
    if (s === 'blocked') return !!c.blocked;
    if (s === 'exceptional') return !!(c.stale || c.provider || isNear(c) || c.retrying || c.held);
    if (s === 'failed') return c.status === 'failed';
    if (s.indexOf('plan:') === 0) return String(c.fromPlan) === s.slice(5);
    return true;
  }
  function order(list, k) {
    var o = st.cm[k] ? st.cm[k].o : '', l = list.map(function (c, i) { return { c: c, i: i }; });
    var by = function (f) { l.sort(function (a, b) { return f(a.c, b.c) || a.i - b.i; }); };
    if (o === 'oldest') by(function (a, b) { return ageMin(b) - ageMin(a); });
    else if (o === 'newest') by(function (a, b) { return ageMin(a) - ageMin(b); });
    else if (o === 'spend') by(function (a, b) { return (b.spent || 0) - (a.spent || 0); });
    else if (o === 'stage') by(function (a, b) { return (STAGE[a.stage] || 0) - (STAGE[b.stage] || 0); });
    return l.map(function (x) { return x.c; });
  }
  function labelOf(m, c) {
    var w = [];
    if (c.o !== m.o[0][0]) w.push(m.o.filter(function (x) { return x[0] === c.o; })[0][1]);
    if (c.s !== m.s[0][0]) w.push(m.s.filter(function (x) { return x[0] === c.s; })[0][1]);
    return w.join(' · ');
  }
  function headExtra(k) {
    if (!MENUS[k]) return '';
    var m = menuOf(k), c = st.cm[k], on = labelOf(m, c), open = st.menu === k;
    var group = function (g, legend) { return '<fieldset><legend>' + legend + '</legend>' + m[g].map(function (x) {
      return '<label><input type="radio" name="' + g + '-' + k + '" value="' + esc(x[0]) + '"' + (c[g] === x[0] ? ' checked' : '') + '><span>' + esc(x[1]) + '</span></label>'; }).join('') + '</fieldset>'; };
    return '<button type="button" class="col-menu' + (on ? ' on' : '') + '" data-menu="' + k + '" aria-haspopup="true" aria-expanded="' + open + '" aria-controls="menu-' + k + '" aria-label="Order and show, ' + esc(k === 'inprogress' ? 'In progress' : k) + (on ? ': ' + esc(on) : '') + '"></button>' +
      '<div class="menu-pop" id="menu-' + k + '" role="group" aria-label="Order and show"' + (open ? '' : ' hidden') + '>' + group('o', 'Order') + group('s', 'Show') + '</div>';
  }
  /* a column in another order or with a filter says so under its head, with one step back */
  function colState(k) {
    if (!MENUS[k]) return '';
    var m = menuOf(k), on = labelOf(m, st.cm[k]); if (!on) return '';
    return '<div class="col-state"><span>' + esc(on) + '</span><button type="button" class="col-x" data-reset="' + k + '" aria-label="Back to ' + esc(m.o[0][1]) + ' and all" title="Back to ' + esc(m.o[0][1]) + ' and all">×</button></div>';
  }
  function headControl() { return ''; }
  function underHead() { return ''; }
  function closeMenu() { if (st.menu) { var k = st.menu; st.menu = null; renderCols(); var b = $('[data-menu="' + k + '"]'); if (b) b.focus(); } }
'''


def variant_menus(t):
    t = fill(common(t), MENUS_CSS, MENUS_JS)
    t = sub(t, "wide: false, accent: '', pulseOpen: false,", "wide: false, cm: null, menu: null, pulseOpen: false,")
    t = sub(t, "    st.sc = name; var d = D();\n    st.idx = buildIndex();", "    st.sc = name; var d = D();\n    st.idx = buildIndex(); st.cm = readMenus(); st.menu = null;")
    t = sub(t, "    if (t.dataset.act) { act(t); return; }",
            "    if (t.dataset.act) { act(t); return; }\n"
            "    if (t.dataset.menu) { st.menu = st.menu === t.dataset.menu ? null : t.dataset.menu; renderCols(); var b = $('[data-menu=\"' + t.dataset.menu + '\"]'); if (b) b.focus(); return; }\n"
            "    if (t.dataset.reset) { var mk = t.dataset.reset, mm = menuOf(mk); st.cm[mk] = { o: mm.o[0][0], s: mm.s[0][0] }; writeMenus(); renderCols(); var mb = $('[data-menu=\"' + mk + '\"]'); if (mb) mb.focus(); return; }")
    t = sub(t, "    var t = e.target.closest('button, a');\n    if (!t) {",
            "    var t = e.target.closest('button, a');\n    if (st.menu && !e.target.closest('.menu-pop, .col-menu')) closeMenu();\n    if (!t) {")
    t = sub(t, "    if (t.id === 'chat-old' && t.value !== '') {",
            "    var mm = /^([os])-(queued|inprogress|done)$/.exec(t.name || '');\n"
            "    if (mm) { st.cm[mm[2]][mm[1]] = t.value; writeMenus(); renderCols(); var r = $('input[name=\"' + t.name + '\"][value=\"' + t.value + '\"]'); if (r) r.focus(); return; }\n"
            "    if (t.id === 'chat-old' && t.value !== '') {")
    t = sub(t, "      if (!keysEl.hidden) { closeKeys(); return; }",
            "      if (!keysEl.hidden) { closeKeys(); return; }\n      if (st.menu) { closeMenu(); return; }")
    return t


def main():
    src = SRC.read_text()
    for name, fn in (("find", variant_find), ("chips", variant_chips), ("menus", variant_menus)):
        out = HERE / name / "index.html"
        out.parent.mkdir(exist_ok=True)
        out.write_text(fn(src))
        print(out.relative_to(HERE.parent.parent.parent), len(out.read_text().splitlines()), "lines")


if __name__ == "__main__":
    main()
