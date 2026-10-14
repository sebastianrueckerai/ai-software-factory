#!/usr/bin/env python3
"""Derives the round's variants from the Mission control prototype.

Each variant is prototypes/06-mission-control/index.html with the chat region
rebuilt for many threads (the switcher, the badges, the working mark, the inbox
thread, the escalation's face, archive and delete, the commands, the level
selector), the shell brought to the console's state of 2026-10-14 (no ticker,
C12; the find box and the column menus' marks, C13; no accent select), and the
scenarios replaced by the round's five moments from multichat.js. Run from
anywhere; writes <variant>/index.html beside this file. Every replacement must
match the prototype exactly once, so a changed prototype fails loudly here.
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


# ---- the shell as the console has it: no ticker, no accent select, the find box and the menu marks ----

def shell(t):
    t = sub(t, '<script src="../scenarios.js"></script>', '<script src="../../../prototypes/scenarios.js"></script>\n<script src="../multichat.js"></script>')
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
    t = sub(t, "  function pulseRecompute() {", "  var renderPulse0 = renderPulse; renderPulse = function () { renderPulse0(); if (typeof afterPulse === 'function') afterPulse(); };\n  function pulseRecompute() {")
    t = sub(t, "$('#top').classList.remove('menu-open'); renderBoard(); renderTicker(); });", "$('#top').classList.remove('menu-open'); renderBoard(); renderChat(); });")
    t = sub(t, "rt = setTimeout(function () { renderTicker(); markOverflow(); }, 200);", "rt = setTimeout(function () { markOverflow(); }, 200);")
    t = sub(t, '''    if (t.id === 'accent') { st.accent = t.value; renderBoard(); $('#accent').focus(); }
    else if (t.id === 'chat-old' && t.value !== '') {
      var o = st.old.splice(+t.value, 1)[0];
      if (st.chat.length) { var f = st.chat[0]; st.old.unshift({ label: f.at + ' ' + (f.text.length > 40 ? f.text.slice(0, 40) + '…' : f.text), chat: st.chat }); }
      st.chat = o.chat; renderChat();
    }''', '''    if (t.id === 'level' || t.id === 'level-phone') { askLevel(t.value); }''')
    t = sub(t, '''    var acc = '<span class="sel sm"><select id="accent" aria-label="Accent"><option value="">every accent</option>' +
      ACCENTS.map(function (a) { return '<option' + (a === st.accent ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select></span>';
    $('#board').innerHTML = '<div class="board-head"><h2 id="board-title">Board</h2>' + acc +''',
           '''    $('#board').innerHTML = '<div class="board-head"><h2 id="board-title">Board</h2><span class="find" aria-hidden="true">Find: a word, #612, plan:558</span>' +''')
    t = sub(t, '''<div class="col-head"><h3 id="col-' + k + '">' + title + '</h3><span class="cnt">' + count + '</span></div>''',
           '''<div class="col-head"><h3 id="col-' + k + '">' + title + '</h3><span class="cnt">' + count + '</span><span class="menu-mark" aria-hidden="true">▾</span></div>''')
    t = sub(t, "/* Needs you: the first column, lit amber */", '''.board-head h2 { margin-right: 0; }
.board-head .find { margin-right: auto; margin-left: 6px; width: 232px; height: 24px; padding: 0 8px; border: 1px solid var(--btn-line); border-radius: 3px; color: var(--text-faint); font: 11.5px/22px var(--font-mono); }
.col-head .menu-mark { margin-left: 6px; color: var(--text-faint); font: 12px var(--font-mono); }
@@CSS@@
/* Needs you: the first column, lit amber */''')
    # the scenario switch becomes the round's moments; the board stays the busy moment's
    t = sub(t, '''<button type="button" data-sc="busy">busy</button><button type="button" data-sc="idle">idle</button><button type="button" data-sc="fire">fire</button><button type="button" data-sc="quiet">quiet</button>''',
           '''<button type="button" data-sc="busy">busy</button><button type="button" data-sc="threads">threads</button><button type="button" data-sc="poke">poke</button><button type="button" data-sc="assisted">assisted</button><button type="button" data-sc="escalation">escalation</button>''')
    t = sub(t, "var st = { sc: S[params.get('scenario')] ? params.get('scenario') : 'busy', wide: false, accent: '', pulseOpen: false, statusOpen: false,\n    chat: [], old: [], queue: [], typing: false, drawer: null, done: {}, steer: {}, cols: {}, idx: null };\n  var D = function () { return S[st.sc]; };",
           "var MC = window.MULTICHAT, MOMENTS = ['busy', 'threads', 'poke', 'assisted', 'escalation'];\n  var st = { sc: MOMENTS.indexOf(params.get('scenario')) >= 0 ? params.get('scenario') : 'busy', wide: false, accent: '', pulseOpen: false, statusOpen: false,\n    mc: null, queue: [], typing: false, drawer: null, done: {}, steer: {}, cols: {}, idx: null, palette: -1, dialog: null, menu: false };\n  var D = function () { return S.busy; };")
    t = sub(t, "    st.chat = JSON.parse(JSON.stringify(d.chat)); st.old = []; st.queue = []; st.typing = false; st.done = {}; st.steer = {}; st.pulseOpen = false;",
           "    st.mc = MC.threadsOf(name); st.queue = []; st.typing = false; st.done = {}; st.steer = {}; st.pulseOpen = false; st.palette = -1; st.dialog = null; st.menu = false;")
    t = sub(t, "      case 'chat-new': newConversation(); break;", "      case 'chat-new': newThread(); break;")
    t = sub(t, "    if (f.id === 'chat-form') { var ta = $('#chat-input'); send(ta.value); ta.value = ''; return; }",
           "    if (f.id === 'chat-form') { var ta = $('#chat-input'); if (st.palette >= 0) { runCommand(COMMANDS[st.palette].name); return; } send(ta.value); ta.value = ''; return; }")
    # the chat engine replaces the prototype's chat block
    t = rsub(t, r"  /\* chat \*/\n.*?\n  /\* board: a card face \*/", "@@JS@@\n  /* board: a card face */")
    # the click handler's chat cases and the keys
    t = sub(t, '''    if (t.dataset.chat) {
      var m = st.chat[+t.dataset.i];
      m.pstate = { do: 'applied', skip: 'skipped', undo: 'undone' }[t.dataset.chat];
      renderLog(); if (t.dataset.chat !== 'skip') pulseRecompute(); return;
    }''', '''    if (t.dataset.chat) {
      var m = open().messages[+t.dataset.i];
      m.pstate = { do: 'applied', skip: 'skipped', undo: 'undone' }[t.dataset.chat];
      renderLog(); if (t.dataset.chat !== 'skip') pulseRecompute(); return;
    }
    if (t.dataset.thread) { openThread(t.dataset.thread); return; }
    if (t.dataset.choice != null) { answer(+t.dataset.i, t.dataset.choice); return; }
    if (t.dataset.cmd) { runCommand(t.dataset.cmd); return; }
    if (t.dataset.lvl) { askLevel(t.dataset.lvl); return; }
    if (t.dataset.dlg) { dialogAct(t.dataset.dlg); return; }
    if (t.dataset.tmenu) { threadAct(t.dataset.tmenu); return; }
    if (t.dataset.restore) { restoreThread(t.dataset.restore); return; }''')
    t = sub(t, '''      <dt><kbd>/</kbd></dt><dd>write to the project agent</dd>
''', '''      <dt><kbd>/</kbd></dt><dd>write to the project agent; <kbd>/</kbd> at the start of the box lists the commands <code>/compact</code> and <code>/new</code></dd>
      <dt><kbd>Ctrl</kbd>+<kbd>k</kbd></dt><dd>the threads: open one, or the inbox</dd>
''')
    t = sub(t, "    if (e.key === 'Escape') {\n      if (!keysEl.hidden) { closeKeys(); return; }",
           "    if (e.key === 'Escape') {\n      if (!keysEl.hidden) { closeKeys(); return; }\n      if (st.dialog) { closeDialog(); return; }\n      if (st.palette >= 0) { st.palette = -1; renderPalette(); return; }\n      if (st.menu) { st.menu = false; renderChat(); return; }")
    t = sub(t, "    if (field) {\n      if ((t.id === 'chat-input' || t.id === 'steer-input') && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); t.form.requestSubmit(); }\n      return;\n    }",
           "    if (field) {\n      if (t.id === 'chat-input' && st.palette >= 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); st.palette = (st.palette + (e.key === 'ArrowDown' ? 1 : COMMANDS.length - 1)) % COMMANDS.length; renderPalette(); return; }\n      if ((t.id === 'chat-input' || t.id === 'steer-input') && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); t.form.requestSubmit(); }\n      return;\n    }\n    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); var sw = $('#switcher [data-thread]'); if (sw) sw.focus(); return; }")
    t = sub(t, "  document.addEventListener('input', function (e) { if (e.target.dataset.q != null) st.queue[+e.target.dataset.q] = e.target.value; });",
           "  document.addEventListener('input', function (e) {\n    if (e.target.dataset.q != null) st.queue[+e.target.dataset.q] = e.target.value;\n    if (e.target.id === 'chat-input') { var v = e.target.value; st.palette = v.charAt(0) === '/' && v.indexOf(' ') < 0 ? Math.max(0, COMMANDS.findIndex(function (c) { return c.name.indexOf(v) === 0; })) : -1; renderPalette(); }\n  });")
    return t


ENGINE = r'''  /* the threads (roadmap 239): the open thread's log, the switcher, the badges, the working mark, the inbox thread, the escalation's face, archive and delete, the commands, the level selector */
  var COMMANDS = [{ name: '/compact', words: 'the older turns of this thread become a summary' }, { name: '/new', words: 'a new thread' }];
  var START = "Ask or tell the project agent. It reads, explains, moves, answers, steers and approves as you, through the console's own actions; it runs no code.";
  function threads() { return st.mc.threads; }
  function byId(id) { return threads().filter(function (t) { return t.id === id; })[0]; }
  function open() { return byId(st.mc.open) || threads()[0]; }
  /* the order: the inbox first, then by last turn; "14:26" beats "yesterday" beats "2 days ago" */
  function rank(at) { var m = /^(\d\d):(\d\d)$/.exec(at); if (m) return 100000 + m[1] * 60 + +m[2]; if (at === 'yesterday') return 50000; m = /^(\d+) days? ago$/.exec(at); return m ? 50000 - m[1] * 1000 : 0; }
  function active() { return threads().filter(function (t) { return !t.archived; }).sort(function (a, b) { return (b.inbox ? 1 : 0) - (a.inbox ? 1 : 0) || rank(b.at) - rank(a.at); }); }
  function archived() { return threads().filter(function (t) { return t.archived; }); }
  function unreadTotal() { return threads().reduce(function (n, t) { return n + (t.unread || 0); }, 0); }
  function setTitle() { var n = unreadTotal(); document.title = (n ? '(' + n + ') ' : '') + 'Factory console'; }
  function openThread(id) {
    var t = byId(id); if (!t) return;
    st.mc.open = id; t.unread = 0; st.menu = false; st.palette = -1;
    renderChat(); var b = $('#chat-input'); if (b && !t.archived) b.focus({ preventScroll: true });
  }
  /* a poke or an escalation with choices waits for an answer until one is given */
  function pending(t) { var m = t.messages[t.messages.length - 1]; return m && m.choices && !m.answered ? m : null; }
  function markHTML(t) {
    if (t.inbox) return '<span class="tmark inbox" aria-hidden="true">⌂</span>';
    if (t.working) return '<span class="tmark working" title="a turn in flight"><i class="dot" aria-hidden="true"></i><span class="vh">a turn in flight</span></span>';
    return '<span class="tmark" aria-hidden="true"></span>';
  }
  function badgeHTML(t) { return t.unread ? '<span class="badge" aria-label="' + t.unread + ' unread">' + t.unread + '</span>' : ''; }
  function rowHTML(t, cls) {
    var isOpen = t.id === st.mc.open;
    return '<button type="button" class="trow' + (cls ? ' ' + cls : '') + (isOpen ? ' on' : '') + (t.unread ? ' unread' : '') + (t.inbox ? ' inbox' : '') + '" data-thread="' + t.id + '" aria-current="' + (isOpen ? 'true' : 'false') + '">' +
      markHTML(t) + '<span class="ttitle">' + esc(t.title) + '</span><span class="tat">' + esc(t.at) + '</span>' + badgeHTML(t) + '</button>';
  }
  function archivedHTML() {
    var a = archived(); if (!a.length) return '';
    return '<div class="tarch"><span class="tarch-l">archived</span>' + a.map(function (t) {
      return '<span class="trow arch' + (t.id === st.mc.open ? ' on' : '') + '"><button type="button" class="ttitle open-arch" data-thread="' + t.id + '">' + esc(t.title) + '</button><button type="button" class="linkbtn restore" data-restore="' + t.id + '">restore</button></span>'; }).join('') + '</div>';
  }
  function levelSelectHTML(cls, id) {
    return '<span class="sel sm lvl ' + (cls || '') + '"><select id="' + (id || 'level') + '" aria-label="The project\'s autonomy level">' + MC.levels.map(function (l) {
      return '<option value="' + esc(l) + '"' + (l === st.mc.level ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select></span>';
  }
  function levelSegHTML() {
    return '<span class="lvlseg" role="group" aria-label="The project\'s autonomy level">' + MC.levels.map(function (l) {
      return '<button type="button" data-lvl="' + esc(l) + '" aria-pressed="' + (l === st.mc.level) + '">' + esc(l) + '</button>'; }).join('') + '</span>';
  }
  function msgHTML(m, i) {
    var who = m.who === 'you' ? 'you' : 'agent';
    var b = '<div class="txt">' + refs(m.text) + (m.streaming ? '<span class="cursor" aria-hidden="true"></span>' : '') + '</div>';
    (m.tools || []).forEach(function (t) {
      b += '<details class="tool"><summary><span class="tname">' + esc(t.name) + '</span><span>· ' + esc(t.duration) + '</span></summary>' +
        '<div class="tool-body"><div><span class="k">arguments</span>' + esc(t.args) + '</div><div><span class="k">result</span>' + refs(t.result) + '</div></div></details>';
    });
    if (m.decider) b += '<p class="decider"><span class="vh">Decided by: </span>' + esc(m.decider) + '</p>';
    if (m.choices && (m.answered || !m.escalation)) {
      b += m.answered ? '<p class="applied" role="status"><span class="ok">✓ answered “' + esc(m.answered) + '”</span>' + (m.card ? '<span>on #' + m.card + '</span>' : '') + '</p>'
        : '<div class="acts choices">' + m.choices.map(function (c) { return '<button type="button" class="btn btn-choice" data-choice="' + esc(c) + '" data-i="' + i + '">' + esc(c) + '</button>'; }).join('') + '</div>';
    }
    if (m.proposal) {
      var p = m.proposal, list = p.changes.map(refs).join('; ');
      if (!m.pstate) {
        b += '<div class="prop" role="group" aria-label="Proposal"><p class="prop-title">' + esc(p.title) + '</p><ul>' +
          p.changes.map(function (c) { return '<li>' + refs(c) + '</li>'; }).join('') + '</ul>' +
          (p.detail ? '<details class="pdet"><summary>details</summary><p>' + refs(p.detail) + '</p></details>' : '') +
          '<div class="acts"><button type="button" class="btn btn-primary" data-chat="do" data-i="' + i + '">Do it</button>' +
          '<button type="button" class="btn btn-ghost" data-chat="skip" data-i="' + i + '">Skip</button></div></div>';
      } else if (m.pstate === 'applied') {
        b += '<p class="applied" role="status"><span class="ok">✓ applied</span><span>' + list + '</span><button type="button" class="btn btn-xs" data-chat="undo" data-i="' + i + '">Undo</button></p>';
      } else {
        b += '<p class="applied" role="status"><span class="' + m.pstate + '">' + (m.pstate === 'undone' ? '↶ undone' : 'skipped') + '</span><span>' + list + '</span></p>';
      }
    }
    if (m.summary) return '<div class="msg sum"><span class="av" aria-hidden="true">≡</span><div class="b"><p class="meta"><span class="who">summary</span><time>' + esc(m.at) + '</time></p>' + b + '</div></div>';
    return '<div class="msg ' + who + (m.poke ? ' poke' : '') + (m.escalation ? ' esc' : '') + (m.fresh ? ' fresh' : '') + '"><span class="av" aria-hidden="true">' + (who === 'you' ? 'S' : '') + '</span><div class="b"><p class="meta"><span class="who">' + (who === 'you' ? 'sebastian' : m.poke ? 'the factory' : 'project agent') + '</span><time>' + esc(m.at) + '</time>' + (m.escalation ? '<span class="esc-l">needs you</span>' : '') + '</p>' + b + '</div></div>';
  }
  function renderLog() {
    var log = $('#chat-log'); if (!log) return;
    var t = open(), h = t.messages.map(msgHTML).join('');
    if (t.id === st.mc.open && t.working && !t.messages.some(function (m) { return m.streaming; })) h += '<div class="msg agent"><span class="av" aria-hidden="true"></span><div class="b"><p class="meta"><span class="who">project agent</span><time>' + now() + '</time></p><span class="typing" role="status" aria-label="the project agent is typing"><i></i><i></i><i></i></span></div></div>';
    $('.log-inner', log).innerHTML = h;
    log.scrollTop = log.scrollHeight;
    log.classList.toggle('scrolled', log.scrollTop > 0);
  }
  function renderQueue() {
    var q = $('#chat-queue'); if (!q) return;
    q.hidden = !st.queue.length;
    q.innerHTML = st.queue.map(function (t, i) {
      return '<li><input class="qin" data-q="' + i + '" value="' + esc(t) + '" aria-label="Waiting message ' + (i + 1) + '"><button type="button" class="btn btn-xs" data-qrm="' + i + '" aria-label="Remove">×</button></li>';
    }).join('');
  }
  function renderPalette() {
    var p = $('#palette'); if (!p) return;
    p.hidden = st.palette < 0;
    p.innerHTML = COMMANDS.map(function (c, i) { return '<button type="button" role="option" aria-selected="' + (i === st.palette) + '" data-cmd="' + c.name + '"><b>' + c.name + '</b><span>' + esc(c.words) + '</span></button>'; }).join('');
  }
  /* the open thread's head: its title, its time, the thread menu with Archive and Delete */
  function threadHeadHTML() {
    var t = open();
    return '<div class="thead' + (t.inbox ? ' inbox' : '') + (t.archived ? ' arch' : '') + '"><h3 class="ttl">' + (t.inbox ? '<span class="tmark inbox" aria-hidden="true">⌂</span>' : '') + esc(t.title) + '</h3>' +
      (t.inbox ? '<span class="thint">the factory\'s thread: the agent speaks here uninvited</span>' : t.archived ? '<span class="thint">archived, read-only</span>' : '<span class="thint">' + esc(t.at) + '</span>') +
      (t.inbox || t.archived ? '' : threadActionsHTML()) + '</div>';
  }
  function escalationRowHTML() {
    var t = open(), m = pending(t); if (!m || !m.escalation) return '';
    return '<div class="answer" role="group" aria-label="Answer"><span class="answer-l">Answer:</span>' + m.choices.map(function (c) { return '<button type="button" class="btn btn-choice" data-choice="' + esc(c) + '" data-i="' + t.messages.indexOf(m) + '">' + esc(c) + '</button>'; }).join('') + '<span class="answer-or">or in your words below</span></div>';
  }
  function composerHTML() {
    var t = open();
    if (t.archived) return '<p class="archived-note">This thread is archived: read it, or <button type="button" class="linkbtn" data-restore="' + t.id + '">restore</button> it to write.</p>';
    return escalationRowHTML() + '<form class="composer" id="chat-form"><div id="palette" class="palette" role="listbox" aria-label="Commands" hidden></div>' +
      '<div class="prompt"><span class="ps" aria-hidden="true">&gt;</span><label class="vh" for="chat-input">Your message to the project agent</label>' +
      '<textarea id="chat-input" rows="3" maxlength="8192" placeholder="' + (t.inbox ? 'Reply to the factory, or ask… (Enter sends)' : 'Ask or tell the project… (Enter sends, Shift+Enter breaks the line)') + '" aria-keyshortcuts="/"></textarea>' +
      '<button type="submit" class="btn btn-primary">Send</button></div>' +
      '<p class="own"><span class="cmds"><button type="button" class="cmd" data-cmd="/compact" title="compact this thread: the older turns become a summary">/compact</button><button type="button" class="cmd" data-cmd="/new" title="a new thread">/new</button></span>This is your own thread with the project agent; other members have theirs.</p>' +
      '<ol class="queue" id="chat-queue" aria-label="Your messages waiting for the turn to end" hidden></ol></form>';
  }
  function dialogHTML() {
    var d = st.dialog; if (!d) return '';
    var body = '';
    if (d.kind === 'delete') {
      var t = byId(d.id);
      body = '<h2 id="dlg-title">Delete “' + esc(t.title) + '”?</h2><p>Its ' + t.messages.length + ' messages go for good: a hard delete, no archive. One event will name you, the thread and the count. What the chat did stays in the events, the audit and git, so no decision and no merged card goes with it.</p>' +
        '<div class="acts"><button type="button" class="btn btn-danger" data-dlg="delete">Delete the thread</button><button type="button" class="btn" data-dlg="close">Keep it</button></div>';
    } else {
      body = '<h2 id="dlg-title">Set the project\'s autonomy to ' + esc(d.level) + '?</h2><p>This writes a policy change and lands in the audit like every decision. From then on: ' + esc(MC.levelWords[d.level]) + '.</p>' +
        '<div class="acts"><button type="button" class="btn btn-need" data-dlg="level">Set ' + esc(d.level) + '</button><button type="button" class="btn" data-dlg="close">Keep ' + esc(st.mc.level) + '</button></div>';
    }
    return '<div id="dialog" class="overlay" role="dialog" aria-modal="true" aria-labelledby="dlg-title"><div class="overlay-box">' + body + '</div></div>';
  }
  function renderDialog() { var old = $('#dialog'); if (old) old.remove(); if (st.dialog) { document.body.insertAdjacentHTML('beforeend', dialogHTML()); $('#dialog .btn').focus(); } }
  function closeDialog() { st.dialog = null; renderDialog(); var b = $('#level') || $('.tmenu-btn'); if (b) b.focus(); renderChat(); }
  function dialogAct(a) {
    var d = st.dialog;
    if (a === 'close') { closeDialog(); return; }
    if (a === 'delete') {
      var t = byId(d.id), n = t.messages.length, i = threads().indexOf(t);
      threads().splice(i, 1); st.mc.open = (active()[0] || threads()[0]).id;
      byId('inbox').messages.push({ who: 'agent', at: now(), poke: true, text: 'Deleted the thread “' + t.title + '” (' + n + ' messages) as sebastian. One event names you, the thread and the count.' });
      st.dialog = null; renderDialog(); renderChat(); return;
    }
    if (a === 'level') {
      var from = st.mc.level; st.mc.level = d.level;
      byId('inbox').messages.push({ who: 'agent', at: now(), poke: true, text: 'Autonomy set to ' + d.level + ' by sebastian, from ' + from + '. Policy version 5; the audit has the change.' });
      if (st.mc.open !== 'inbox') { byId('inbox').unread = (byId('inbox').unread || 0) + 1; byId('inbox').at = now(); }
      st.dialog = null; renderDialog(); renderChat(); renderPulse(); return;
    }
  }
  function askLevel(level) { if (level === st.mc.level) return; st.dialog = { kind: 'level', level: level }; renderDialog(); }
  function threadAct(a) {
    var t = open();
    if (a === 'toggle') { st.menu = !st.menu; renderChat(); if (st.menu) { var m = $('.tmenu [role="menuitem"]'); if (m) m.focus(); } return; }
    st.menu = false;
    if (a === 'archive') { t.archived = true; t.working = false; st.mc.open = (active()[0] || threads()[0]).id; renderChat(); return; }
    if (a === 'delete') { st.dialog = { kind: 'delete', id: t.id }; renderDialog(); }
  }
  function restoreThread(id) { var t = byId(id); if (t) { t.archived = false; } openThread(id); }
  function newThread() {
    var id = 'new-' + Date.now();
    threads().push({ id: id, title: 'New thread', at: now(), fresh: true, messages: [] });
    openThread(id);
  }
  function answer(i, choice) {
    var t = open(), m = t.messages[i]; if (!m) return;
    m.answered = choice;
    t.messages.push({ who: 'you', at: now(), text: choice });
    t.messages.push({ who: 'agent', at: now(), poke: !!m.poke, text: m.card ? 'Answered “' + choice + '” on #' + m.card + '; the card goes on.' : 'Noted: ' + choice + '.' });
    renderChat(); pulseRecompute();
  }
  function runCommand(name) {
    var ta = $('#chat-input'); if (ta) ta.value = ''; st.palette = -1;
    if (name === '/new') { newThread(); return; }
    var t = open(), n = t.messages.length;
    t.messages.push({ who: 'you', at: now(), text: '/compact' });
    var kept = t.messages.slice(-2);
    t.messages = [{ who: 'agent', at: now(), summary: true, text: 'Summary of ' + n + ' turns: ' + (t.inbox ? 'the factory\'s pokes of the day, the merge of #612 and the question on #603 answered.' : 'the thread settled on ' + t.title.toLowerCase() + '; the open points went into cards.') + ' Tokens 3.1k → 0.7k.' }].concat(kept);
    renderChat();
  }
  function send(text) {
    text = text.trim(); if (!text) return;
    var t = open();
    if (t.working) { st.queue.push(text); renderQueue(); return; }
    if (t.fresh) { t.title = text.length > 36 ? text.slice(0, 36) + '…' : text; t.fresh = false; }
    t.messages.push({ who: 'you', at: now(), text: text }); t.at = now(); t.working = true;
    var m = pending(t); if (m && !m.answered) m.answered = text;
    renderChat();
    setTimeout(function () { reply(t.id); }, 850);
  }
  /* a turn ends: on the open thread it streams in; on another it marks the row unread */
  function reply(id) {
    var t = byId(id); if (!t) return;
    var full = 'Noted. ' + D().pulse.sentence, m = { who: 'agent', at: now(), text: full };
    t.working = false; t.messages.push(m); t.at = now();
    var next = function () { if (st.queue.length && st.mc.open === id) { var q = st.queue.shift(); renderQueue(); send(q); } };
    if (st.mc.open !== id) { t.unread = (t.unread || 0) + 1; renderChat(); return; }
    if (RM.matches) { renderChat(); next(); return; }
    m.text = ''; m.streaming = true; var i = 0;
    var timer = setInterval(function () {
      i = Math.min(full.length, i + 3); m.text = full.slice(0, i);
      if (i >= full.length) { clearInterval(timer); m.streaming = false; renderLog(); next(); } else renderLog();
    }, 18);
  }
  function renderChat() {
    var d = D();
    $('#chat').innerHTML = chatLayout({
      head: '<div class="chat-head"><h2 id="chat-title">Chat</h2><span class="chat-who">project agent · ' + esc(d.project) + '</span><span class="grow"></span>@@HEADLEVEL@@' +
        '<button type="button" class="btn btn-xs" id="chat-new">New</button></div>',
      switcher: switcherHTML(),
      thread: threadHeadHTML(),
      start: open().messages.length ? '' : '<p class="start" title="' + esc(START) + '">' + esc(START) + '</p>',
      log: '<div class="log" id="chat-log" aria-live="polite"><div class="log-inner"></div></div>',
      composer: composerHTML()
    });
    renderLog(); renderQueue(); renderPalette(); setTitle(); afterChat();
  }
'''

MENU_JS = r'''  function threadActionsHTML() {
    return '<button type="button" class="icon-btn tmenu-btn" data-tmenu="toggle" aria-haspopup="menu" aria-expanded="' + st.menu + '" aria-label="This thread">⋯</button>' +
      '<div class="tmenu" role="menu"' + (st.menu ? '' : ' hidden') + '><button type="button" role="menuitem" data-tmenu="archive">Archive</button><button type="button" role="menuitem" class="danger" data-tmenu="delete">Delete…</button></div>';
  }
'''

COMMON_CSS = r'''/* the threads: the rows, the marks, the badge, the inbox, the thread head and its menu, the answer row, the commands, the level, the dialogs */
.trow { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 0 8px; border: 0; border-radius: 2px; background: none; color: var(--text-muted); font: 12.5px var(--font-ui); text-align: left; cursor: pointer; transition: background-color .12s, color .12s; }
.trow:hover { background: var(--bg-hover); color: var(--text); }
.trow.on { background: var(--bg-hover); color: var(--text); box-shadow: inset 2px 0 0 var(--accent); }
.trow.unread .ttitle { color: var(--text); font-weight: 600; }
.trow .ttitle { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.trow .tat { color: var(--text-faint); font: 11px var(--font-mono); white-space: nowrap; }
.tmark { display: inline-flex; align-items: center; justify-content: center; width: 12px; height: 12px; flex: none; }
.tmark.inbox { color: var(--need-text); font: 13px/1 var(--font-mono); }
.tmark.working .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--st-running); animation: live 2.2s ease-in-out infinite; }
.badge { min-width: 18px; padding: 0 5px; border-radius: 9px; background: var(--need); color: var(--need-ink); font: 600 11px/18px var(--font-mono); text-align: center; }
.tarch { display: flex; flex-direction: column; gap: 2px; padding-top: 6px; border-top: 1px dashed var(--line-strong); }
.tarch-l { padding: 0 8px; color: var(--text-faint); font: 11px var(--font-mono); font-variant-caps: all-small-caps; letter-spacing: .06em; }
.trow.arch { color: var(--text-faint); cursor: default; }
.trow.arch .ttitle { padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.trow.arch .ttitle:hover { color: var(--text); }
.trow.arch .restore { font-size: 11.5px; }
.thead { display: flex; align-items: center; gap: 10px; min-height: 34px; padding: 4px 14px 0; position: relative; }
.thead .ttl { display: block; margin: 0; min-width: 0; overflow: hidden; font-size: 13.5px; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; }
.thead .ttl .tmark { margin-right: 6px; vertical-align: -1px; }
.thead .thint { flex: 1 1 40px; min-width: 0; overflow: hidden; color: var(--text-faint); font: 11.5px var(--font-mono); white-space: nowrap; text-overflow: ellipsis; }
.thead.inbox .ttl { color: var(--need-text); }
.tmenu-btn { width: 24px; height: 24px; font: 14px var(--font-mono); }
.tmenu { position: absolute; right: 14px; top: 32px; z-index: 15; display: flex; flex-direction: column; min-width: 140px; padding: 4px; background: var(--bg-raised); border: 1px solid var(--line-strong); box-shadow: 0 12px 32px rgba(0, 0, 0, .4); }
.tmenu button { height: 28px; padding: 0 10px; border: 0; background: none; color: var(--text); font-size: 12.5px; text-align: left; cursor: pointer; }
.tmenu button:hover { background: var(--bg-hover); }
.tmenu button.danger { color: var(--st-failed); }
.msg.poke .av { border-color: var(--need-text); color: var(--need-text); }
.msg.poke .av::before { background: var(--need); }
.msg.poke .meta .who { color: var(--need-text); }
.msg.esc .b { padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--need) 38%, var(--line)); border-left: 3px solid var(--need); background: color-mix(in srgb, var(--need) 4%, var(--bg-raised)); }
.esc-l { color: var(--need-text); font-variant-caps: all-small-caps; letter-spacing: .06em; }
.msg.fresh .b { animation: arrive .4s ease-out; }
@keyframes arrive { from { background: color-mix(in srgb, var(--need) 14%, transparent); } }
.decider { margin: 4px 0 0; color: var(--text-faint); font: 11.5px var(--font-mono); }
.decider::before { content: "⚙ "; }
.msg.sum .av { border-style: dashed; color: var(--text-faint); font: 12px/1 var(--font-mono); }
.msg.sum .av::before { content: none; }
.msg.sum .txt { color: var(--text-muted); font-size: 13px; }
.msg .choices { margin-top: 8px; }
.answer { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 14px; border-top: 1px solid var(--line); background: color-mix(in srgb, var(--need) 5%, var(--bg-raised)); }
.answer .btn { height: auto; min-height: 28px; white-space: normal; }
.answer-l { color: var(--need-text); font: 600 12px var(--font-ui); font-variant-caps: all-small-caps; letter-spacing: .06em; }
.answer-or { color: var(--text-faint); font: 11.5px var(--font-mono); }
.own { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.cmds { display: inline-flex; gap: 4px; }
.cmd { height: 18px; padding: 0 6px; border: 1px solid var(--line-strong); border-radius: 2px; background: none; color: var(--text-muted); font: 11px var(--font-mono); cursor: pointer; }
.cmd:hover { color: var(--text); border-color: var(--text-faint); }
.composer { position: relative; }
.palette { position: absolute; left: 14px; right: 14px; bottom: calc(100% - 4px); z-index: 15; display: flex; flex-direction: column; padding: 4px; background: var(--bg-raised); border: 1px solid var(--line-strong); box-shadow: 0 12px 32px rgba(0, 0, 0, .4); }
.palette button { display: flex; align-items: baseline; gap: 10px; height: 30px; padding: 0 10px; border: 0; border-radius: 2px; background: none; color: var(--text-muted); font-size: 12.5px; text-align: left; cursor: pointer; }
.palette button b { color: var(--accent); font: 600 12.5px var(--font-mono); }
.palette button[aria-selected="true"], .palette button:hover { background: var(--bg-hover); color: var(--text); }
.archived-note { margin: 0; padding: 12px 14px; border-top: 1px solid var(--line); color: var(--text-muted); font-size: 12.5px; }
.lvl select { font-family: var(--font-mono); }
.lvlseg { display: inline-flex; border: 1px solid var(--line-strong); border-radius: 3px; overflow: hidden; }
.lvlseg button { height: 22px; padding: 0 8px; border: 0; background: none; color: var(--text-muted); font: 11px/1 var(--font-mono); cursor: pointer; }
.lvlseg button + button { border-left: 1px solid var(--line-strong); }
.lvlseg button:hover { color: var(--text); background: var(--bg-hover); }
.lvlseg button[aria-pressed="true"] { color: var(--accent-ink); background: var(--accent); }
.overlay-box p { margin: 0 0 14px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
@media (max-width: 899px) {
  .trow { min-height: 44px; font-size: 14px; }
  .tmenu-btn { width: 44px; height: 44px; }
  .answer .btn, .msg .choices .btn { width: 100%; height: 44px; }
  .msg .choices { flex-direction: column; align-items: stretch; }
  .palette button { height: 44px; }
  .lvlseg button { height: 44px; }
  .cmd, .restore, .open-arch { min-height: 44px; }
  .cmds { gap: 8px; }
}
'''


def variant(name, css, js, head_level):
    t = shell(SRC.read_text())
    t = t.replace("@@CSS@@", COMMON_CSS + css).replace("@@JS@@", ENGINE.replace("@@HEADLEVEL@@", head_level) + js)
    out = HERE / name / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(t)
    print(out.relative_to(HERE.parent.parent.parent), len(t.splitlines()), "lines")


# ---- variant rail: the threads as a rail at the chat's left edge, the level as a segmented control in the chat's head ----

RAIL_CSS = r'''.chat { display: grid; grid-template-columns: 196px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
.chat > .chat-head { grid-column: 1 / -1; }
.rail { display: flex; flex-direction: column; gap: 2px; min-height: 0; padding: 8px 6px; border-right: 1px solid var(--line); background: var(--bg-panel); overflow-y: auto; }
.rail .trow { flex: none; }
.rail .tarch { margin-top: auto; }
.chat-main { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.chat .lvlseg { flex: none; margin-right: 4px; }
@media (max-width: 899px) {
  .chat { display: flex; }
  .rail { padding: 8px; border-right: 0; border-bottom: 1px solid var(--line); overflow: visible; }
  .rail .tarch { margin-top: 6px; }
  .chat-head { flex-wrap: wrap; height: auto; min-height: 42px; padding-bottom: 6px; }
}
'''
RAIL_JS = r'''  function switcherHTML() {
    return '<nav class="rail" id="switcher" aria-label="Threads">' + active().map(function (t) { return rowHTML(t); }).join('') + archivedHTML() + '</nav>';
  }
  function chatLayout(p) { return p.head + p.switcher + '<div class="chat-main">' + p.thread + p.start + p.log + p.composer + '</div>'; }
  function afterChat() {}
'''

# ---- variant instrument: the threads as a mono table at the chat's left, the level as four lamps in the instrument strip, the thread's actions as text buttons ----

INSTRUMENT_CSS = r'''.chat { display: grid; grid-template-columns: 212px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
.chat > .chat-head { grid-column: 1 / -1; }
.ttable { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--line); background: var(--bg-panel); overflow-y: auto; }
.ttable .thr { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 0 6px; padding: 6px 8px 4px; color: var(--text-faint); font: 10.5px var(--font-mono); font-variant-caps: all-small-caps; letter-spacing: .06em; border-bottom: 1px solid var(--line); }
.ttable .trow { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 0 6px; min-height: 32px; padding: 0 8px; border-radius: 0; border-bottom: 1px solid var(--line); font: 12.5px var(--font-mono); }
.ttable .trow.on { box-shadow: inset 2px 0 0 var(--accent); }
.ttable .trow .tat { font-size: 11px; }
.ttable .tmark { width: 22px; justify-content: flex-start; }
.ttable .tmark.working .dot { width: 7px; height: 7px; }
.ttable .tmark.working::after { content: ""; }
.ttable .trow.unread .tmark:not(.inbox):not(.working)::before { content: "●"; color: var(--need-text); font-size: 9px; }
.ttable .badge { grid-column: 3; justify-self: end; }
.ttable .trow.unread .tat { display: none; }
.ttable .tarch { margin-top: auto; padding-top: 0; border-top: 0; }
.ttable .tarch-l { display: grid; grid-template-columns: 22px 1fr; gap: 6px; padding: 6px 8px 4px; border-bottom: 1px solid var(--line); }
.ttable .tarch-l::before { content: ""; }
.ttable .trow.arch { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; min-height: 30px; }
.ttable .trow.arch::before { content: "arc"; color: var(--text-faint); font-size: 10.5px; }
.ttable .tnew { margin: 8px; }
.chat-main { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.thead .tacts { display: inline-flex; gap: 2px; }
.thead .tacts .btn { height: 22px; padding: 0 7px; font-size: 11.5px; }
.thead .tacts .btn.danger { color: var(--st-failed); }
.cell.lamps { gap: 10px; }
.cell.lamps .lbl { font: 10.5px var(--font-mono); font-variant-caps: all-small-caps; letter-spacing: .06em; color: var(--text-faint); }
.lampset { display: inline-flex; gap: 10px; }
.lampset button { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 2px; border: 0; background: none; color: var(--text-faint); font: 11px var(--font-mono); cursor: pointer; }
.lampset button i { width: 9px; height: 9px; border: 1px solid var(--line-strong); border-radius: 1px; background: transparent; }
.lampset button:hover { color: var(--text); }
.lampset button[aria-pressed="true"] { color: var(--text); }
.lampset button[aria-pressed="true"] i { border-color: var(--accent); background: var(--accent); box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 70%, transparent); }
@media (max-width: 899px) {
  .chat { display: flex; }
  .ttable { border-right: 0; border-bottom: 1px solid var(--line); overflow: visible; }
  .ttable .trow { min-height: 44px; }
  .ttable .tarch { margin-top: 0; }
  .cell.lamps { flex-basis: 100%; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 12px; }
  .lampset { display: grid; grid-template-columns: 1fr 1fr; width: 100%; gap: 0 10px; }
  .lampset button { height: 44px; }
  .thead .tacts .btn { height: 44px; }
}
'''
INSTRUMENT_JS = r'''  function switcherHTML() {
    return '<nav class="ttable" id="switcher" aria-label="Threads"><div class="thr" aria-hidden="true"><span>mark</span><span>thread</span><span>last</span></div>' +
      active().map(function (t) { return rowHTML(t); }).join('') + archivedHTML() + '</nav>';
  }
  function threadActionsHTML() {
    return '<span class="tacts"><button type="button" class="btn btn-ghost" data-tmenu="archive">Archive</button><button type="button" class="btn btn-ghost danger" data-tmenu="delete">Delete…</button></span>';
  }
  function chatLayout(p) { return p.head + p.switcher + '<div class="chat-main">' + p.thread + p.start + p.log + p.composer + '</div>'; }
  function afterChat() { afterPulse(); }
  function afterPulse() {
    var old = $('#pulse .cell.lamps'); if (old) old.remove();
    var gh = $('#pulse .cell.gh') || $('#pulse .cell.xp');
    gh.insertAdjacentHTML('beforebegin', '<span class="cell lamps"><span class="lbl">autonomy</span><span class="lampset" role="group" aria-label="The project\'s autonomy level">' + MC.levels.map(function (l) {
      return '<button type="button" data-lvl="' + esc(l) + '" aria-pressed="' + (l === st.mc.level) + '"><i aria-hidden="true"></i>' + esc(l) + '</button>'; }).join('') + '</span></span>');
  }
'''

# ---- variant messenger: two-line rows with the newest line, round marks, the archived folded, the level as a select in the top bar ----

MESSENGER_CSS = r'''.chat { display: grid; grid-template-columns: 236px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
.chat > .chat-head { grid-column: 1 / -1; }
.mlist { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--line); background: var(--bg-panel); overflow-y: auto; }
.mlist .trow { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; grid-template-rows: auto auto; gap: 1px 10px; align-items: center; min-height: 52px; padding: 7px 10px; border-radius: 0; border-bottom: 1px solid var(--line); }
.mlist .trow.on { box-shadow: inset 2px 0 0 var(--accent); }
.mlist .tmark { grid-row: 1 / 3; width: 26px; height: 26px; border: 1px solid var(--line-strong); border-radius: 50%; color: var(--text-muted); font: 600 11px/1 var(--font-mono); }
.mlist .tmark.inbox { border-color: var(--need-text); color: var(--need-text); }
.mlist .tmark.working { border-color: var(--st-running); }
.mlist .tmark.working .dot { width: 7px; height: 7px; }
.mlist .ttitle { grid-column: 2; grid-row: 1; font-size: 13px; }
.mlist .tline { grid-column: 2; grid-row: 2; min-width: 0; overflow: hidden; color: var(--text-faint); font-size: 11.5px; white-space: nowrap; text-overflow: ellipsis; }
.mlist .tline.working { color: var(--st-running); }
.mlist .tat { grid-column: 3; grid-row: 1; }
.mlist .badge { grid-column: 3; grid-row: 2; justify-self: end; }
.mlist .trow.arch { display: flex; min-height: 40px; padding: 0 10px; border-bottom: 0; }
.mlist .tarch { margin-top: auto; gap: 0; padding: 0; border-top: 0; }
.mlist .tarch > summary { display: flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border-top: 1px solid var(--line); color: var(--text-faint); font: 12px var(--font-ui); cursor: pointer; list-style: none; }
.mlist .tarch > summary::-webkit-details-marker { display: none; }
.mlist .tarch > summary::before { content: "▸"; font: 10px var(--font-mono); }
.mlist .tarch[open] > summary::before { content: "▾"; }
.chat-main { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
#top .lvl { order: 2; margin-left: 10px; }
.chat-head .lvl { display: none; }
#top .lvl::before { content: "level"; margin-right: 6px; color: var(--text-faint); font: 11px var(--font-mono); }
@media (max-width: 899px) {
  .chat { display: flex; }
  .mlist { border-right: 0; border-bottom: 1px solid var(--line); overflow: visible; }
  .mlist .tarch { margin-top: 0; }
  #top .lvl { display: none; }
  .chat-head .lvl { display: inline-flex; }
  .chat-head .lvl select { height: 44px; }
}
'''
MESSENGER_JS = r'''  function newest(t) { var m = t.messages[t.messages.length - 1]; if (!m) return 'nothing yet'; var s = (m.who === 'you' ? 'you: ' : '') + m.text.replace(/\s+/g, ' '); return s.length > 48 ? s.slice(0, 48) + '…' : s; }
  function mrowHTML(t) {
    var isOpen = t.id === st.mc.open, init = t.inbox ? '⌂' : t.title.charAt(0).toUpperCase();
    return '<button type="button" class="trow' + (isOpen ? ' on' : '') + (t.unread ? ' unread' : '') + (t.inbox ? ' inbox' : '') + '" data-thread="' + t.id + '" aria-current="' + (isOpen ? 'true' : 'false') + '">' +
      '<span class="tmark' + (t.inbox ? ' inbox' : t.working ? ' working' : '') + '" aria-hidden="true">' + (t.working && !t.inbox ? '<i class="dot"></i>' : init) + '</span>' +
      '<span class="ttitle">' + esc(t.title) + '</span><span class="tat">' + esc(t.at) + '</span>' +
      '<span class="tline' + (t.working ? ' working' : '') + '">' + (t.working ? 'a turn in flight…' : esc(newest(t))) + '</span>' + badgeHTML(t) + '</button>';
  }
  function switcherHTML() {
    var a = archived();
    return '<nav class="mlist" id="switcher" aria-label="Threads">' + active().map(mrowHTML).join('') +
      (a.length ? '<details class="tarch"' + (open().archived ? ' open' : '') + '><summary>Archived (' + a.length + ')</summary>' + a.map(function (t) {
        return '<span class="trow arch' + (t.id === st.mc.open ? ' on' : '') + '"><button type="button" class="ttitle open-arch" data-thread="' + t.id + '">' + esc(t.title) + '</button><button type="button" class="linkbtn restore" data-restore="' + t.id + '">restore</button></span>'; }).join('') + '</details>' : '') + '</nav>';
  }
  function chatLayout(p) { return p.head + p.switcher + '<div class="chat-main">' + p.thread + p.start + p.log + p.composer + '</div>'; }
  function afterChat() {
    var old = $('#top .lvl'); if (old) old.remove();
    $('#top .proj').insertAdjacentHTML('afterend', levelSelectHTML());
  }
'''

def main():
    variant("rail", RAIL_CSS, RAIL_JS + MENU_JS, "' + levelSegHTML() + '")
    variant("instrument", INSTRUMENT_CSS, INSTRUMENT_JS, "")
    variant("messenger", MESSENGER_CSS, MESSENGER_JS + MENU_JS, "' + levelSelectHTML('', 'level-phone') + '")


if __name__ == "__main__":
    main()
