import re

cand = "design/rounds/11-compact-reorg/cand/"

GLYPH_OLD = '<path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M3 13l10-10" fill="none" stroke="currentColor" stroke-width="1.5"/>'
GLYPH_NEW = ('<path class="exp" d="M9.5 2.5h4v4M6.5 13.5h-4v-4M3 13l10-10" fill="none" stroke="currentColor" stroke-width="1.5"/>'
             '<path class="col" d="M13.5 6.5v-4h-4M2.5 9.5v4h4M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.5"/>')

CSS_COMMON = """
/* try wiring: the glyph flips, the edge tab returns, tooltips on every quiet control */
.wctl .col { display: none; }
.wctl[aria-pressed="true"] .exp { display: none; }
.wctl[aria-pressed="true"] .col { display: block; }
#screen { position: relative; }
.edge-tab { display: none; position: absolute; left: 0; top: 50%; transform: translateY(-50%); z-index: 30; padding: 10px 4px; border: 1px solid var(--line-strong); border-left: 0; border-radius: 0 3px 3px 0; background: var(--bg-raised); color: var(--text); font: 11px/1 var(--font-mono); writing-mode: vertical-rl; letter-spacing: .08em; cursor: pointer; }
.edge-tab:hover { color: var(--accent); border-color: var(--accent); }
#screen.chat-only .edge-tab { display: inline-flex; align-items: center; }
#chat-divider { cursor: col-resize; }
.tip { display: none; }
[data-tip] { position: relative; }
[data-tip]:hover::after, [data-tip]:focus-visible::after { content: attr(data-tip); position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap; padding: 3px 8px; border: 1px solid var(--line-strong); background: var(--bg-raised); color: var(--text-muted); font: 11px/1.5 var(--font-mono); box-shadow: 0 8px 24px rgba(0,0,0,.35); z-index: 80; pointer-events: none; }
#chat-divider[data-tip]:hover::after, #chat-divider[data-tip]:focus-visible::after { left: 14px; bottom: 50%; transform: translateY(50%); }
"""

JS = """
<script>
(function () {
  "use strict";
  var screen = document.getElementById("screen");
  var divider = document.getElementById("chat-divider");
  var full = document.getElementById("chat-full");
  var edge = document.querySelector(".edge-tab");

  function isFull() { return screen.classList.contains("chat-only"); }
  function setFull(on) {
    screen.classList.toggle("chat-only", on);
    if (full) full.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (full) full.addEventListener("click", function () { setFull(!isFull()); });
  if (edge) edge.addEventListener("click", function () { setFull(false); });

  if (divider) {
    var drag = false;
    divider.addEventListener("pointerdown", function (e) { drag = true; try { divider.setPointerCapture(e.pointerId); } catch (x) {} });
    divider.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var min = 384, max = Math.max(min, window.innerWidth - 502);
      screen.style.setProperty("--chat-share", Math.round(Math.max(min, Math.min(max, e.clientX - 7))) + "px");
    });
    ["pointerup", "pointercancel"].forEach(function (n) { divider.addEventListener(n, function () { drag = false; }); });
    divider.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var cur = parseFloat(screen.style.getPropertyValue("--chat-share")) || 384;
      var next = Math.max(384, Math.min(window.innerWidth - 502, cur + (e.key === "ArrowRight" ? 24 : -24)));
      screen.style.setProperty("--chat-share", Math.round(next) + "px");
      e.preventDefault();
    });
  }

  var drawer = document.getElementById("drawer");
  var dclose = document.getElementById("drawer-close");
  function closeDrawer() { if (drawer && !drawer.hidden) { drawer.hidden = true; return true; } return false; }
  if (dclose) dclose.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (closeDrawer()) return;
    setFull(false);
  });

  document.querySelectorAll(".card, article.need").forEach(function (card) {
    card.setAttribute("data-tip", "Open the card");
    card.addEventListener("click", function () {
      if (!drawer) return;
      var ref = drawer.querySelector(".dr-ref"), h = drawer.querySelector(".dr-title h2");
      var cr = card.querySelector(".ref"), ct = card.querySelector(".title");
      if (ref && cr) ref.textContent = cr.textContent;
      if (h && ct) h.textContent = ct.textContent;
      drawer.hidden = false;
      var t = drawer.querySelector('[role="tab"]'); if (t) t.focus();
    });
  });

  var tabs = drawer ? drawer.querySelectorAll('[role="tab"]') : [];
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (o) { o.setAttribute("aria-selected", o === t ? "true" : "false"); });
      drawer.querySelectorAll(".pane").forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== t.getAttribute("data-tab"); });
    });
  });

  var cts = document.querySelectorAll(".ctab");
  var chatSec = document.getElementById("chat");
  cts.forEach(function (t) {
    t.addEventListener("click", function () {
      cts.forEach(function (o) { o.classList.toggle("on", o === t); o.setAttribute("aria-current", o === t ? "true" : "false"); });
      chatSec.classList.toggle("threads-view", /threads/.test(t.textContent));
    });
  });

  document.querySelectorAll("#theme-switch [data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.documentElement.setAttribute("data-theme", b.getAttribute("data-theme-set"));
      document.querySelectorAll("#theme-switch [data-theme-set]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
    });
  });

  var intake = document.getElementById("intake-btn");
  if (intake) intake.addEventListener("click", function () {
    var open = intake.getAttribute("data-intake") === "open";
    intake.setAttribute("data-intake", open ? "closed" : "open");
    intake.setAttribute("aria-pressed", open ? "true" : "false");
    var n = intake.querySelector(".intake-name"); if (n) n.textContent = open ? "closed" : "open";
  });

  var sw = document.querySelector("[data-swtoggle]");
  if (sw) sw.addEventListener("click", function () {
    var rows = document.getElementById("thread-rows");
    var open = sw.getAttribute("aria-expanded") === "true";
    sw.setAttribute("aria-expanded", open ? "false" : "true");
    sw.textContent = open ? "›" : "⌄";
    if (rows) rows.hidden = open;
  });

  function wireForm(form, logSel) {
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ta = form.querySelector("textarea"); if (!ta || !ta.value.trim()) return;
      var log = document.querySelector(logSel);
      if (log) {
        var proto = log.querySelector(".msg:last-of-type");
        if (proto) {
          var d = proto.cloneNode(true);
          var ps = d.querySelectorAll("p");
          var now = new Date(), hh = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);
          if (ps.length > 1) { ps[0].textContent = "you " + hh; ps[ps.length - 1].textContent = ta.value; }
          log.appendChild(d);
          log.scrollTop = log.scrollHeight;
        }
      }
      ta.value = "";
    });
  }
  wireForm(document.getElementById("chat-form"), "#chat-log");
  wireForm(drawer ? drawer.querySelector("form") : null, "#drawer .chat-log");
})();
</script>
"""

def base_prepare(html, extra_css):
    assert GLYPH_OLD in html, "glyph path not found"
    html = html.replace(GLYPH_OLD, GLYPH_NEW)
    html = re.sub(r'(<strong class="title") title="[^"]*"', r"\1", html)
    html = html.replace(' title="', ' data-tip="')
    html = html.replace("</style>", extra_css + "</style>")
    html = re.sub(r'(<div id="screen"[^>]*>)', r'\1\n<button type="button" class="edge-tab" data-tip="The board back; Esc also works">board</button>', html, count=1)
    html = html.replace("</body>", JS + "</body>")
    return html

# ---- try A: the bundle (d5 rest + d6 drawer) ----
a = open(cand + "d5-strip.html").read()
d6 = open(cand + "d6-drawer.html").read()
ds = d6.index('<aside id="drawer"')
de = d6.index("</aside>", ds) + len("</aside>")
drawer = d6[ds:de]
assert 'id="drawer-panel"' in drawer and "</form>" in drawer
drawer = drawer.replace('<aside id="drawer" class="drawer" aria-label="The card">', '<aside id="drawer" class="drawer" aria-label="The card" hidden>', 1)
dp = drawer.index('id="drawer-panel"')
open_tag_end = drawer.index(">", dp) + 1
last_form = drawer.rindex("</form>")
chat_pane_open = '<div class="pane" data-pane="chat">'
other_panes = (
    '<div class="pane" data-pane="overview" hidden><p class="thread-link">needs you · waiting 26m · 2 checks</p>'
    '<p style="color:var(--text-muted)">The note you pinned says the box cannot hold two agents at once.</p></div>'
    '<div class="pane" data-pane="session" hidden><p style="color:var(--text-muted)">The agent’s live session for this card; not in this prototype.</p></div>'
    '<div class="pane" data-pane="activity" hidden><p style="color:var(--text-muted)">The card’s timeline; not in this prototype.</p></div>'
    '<div class="pane" data-pane="files" hidden><p style="color:var(--text-muted)">The card’s documents; not in this prototype.</p></div>'
)
drawer = drawer[:open_tag_end] + other_panes + chat_pane_open + drawer[open_tag_end:last_form + len("</form>")] + "</div>" + drawer[last_form + len("</form>"):]
for name, key in [("Overview", "overview"), ("Session", "session"), ("Activity", "activity"), ("Files", "files"), ("Chat", "chat")]:
    want = "true" if name == "Chat" else "false"
    for cur in ('aria-selected="false"', 'aria-selected="true"'):
        old = '<button type="button" role="tab" ' + cur + ">" + name
        new = '<button type="button" role="tab" data-tab="' + key + '" aria-selected="' + want + '">' + name
        if old in drawer:
            drawer = drawer.replace(old, new, 1)
            break
a = a.replace('<aside id="drawer" class="drawer" aria-label="The card" hidden></aside>', drawer)
assert "data-pane=" in a
css_a = CSS_COMMON + """
#screen.chat-only .chat.with-threads { grid-template-columns: 176px minmax(0, 48rem); justify-content: center; }
.pane[hidden] { display: none; }
"""
a = base_prepare(a, css_a)
open(cand + "try-a-bundle.html", "w").write(a)

# ---- try B: the tab pair (d3 + the threads table back, behind the tab) ----
b = open(cand + "d3-tabs.html").read()
ts = open(cand + "d5-strip.html").read()
nav_s = ts.index('<nav id="switcher"')
nav_e = ts.index("</nav>", nav_s) + len("</nav>")
ttable = ts[nav_s:nav_e]
head_end = b.index("</div>", b.index('class="chat-head"')) + len("</div>")
b = b[:head_end] + "\n" + ttable + "\n" + b[head_end:]
css_b = CSS_COMMON + """
#screen.chat-only .chat-main { max-width: 48rem; margin: 0 auto; width: 100%; }
#switcher { display: none; }
.chat.threads-view .chat-main { display: none; }
.chat.threads-view #switcher { display: block; }
"""
b = base_prepare(b, css_b)
open(cand + "try-b-tabs.html", "w").write(b)
print("built", len(a), len(b))
