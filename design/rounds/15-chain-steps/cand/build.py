#!/usr/bin/env python3
"""build.py writes the round's six candidates from the harvested lab
markup (../harvest/board-quiet.html, the merged card #623 of the quiet
scenario, lab build d0d27da6c340). Every candidate is the real page with
three designed parts: the merged card's face line, the drawer's body,
and a states band under the screen that shows the other chain words as
the candidate designs them. One drawer variant and one board variant per
candidate, dark and light."""
import re
from pathlib import Path

here = Path(__file__).parent
base = (here / "../harvest/board-quiet.html").read_text()

RUN = "https://git.example/sf/code/actions/runs/3251"
RUN2 = "https://git.example/sf/code/actions/runs/3252"
RUN3 = "https://git.example/sf/code/actions/runs/3248"
PR = "https://git.example/sf/code/pulls/623"

# the page ground: no scripts, the stylesheet beside the page
page = re.sub(r"<script[^>]*>.*?</script>", "", base, flags=re.S)
page = page.replace('<link rel="stylesheet" href="/static/console.css">',
                    '<link rel="stylesheet" href="./console.css">')

OLD_FACE = ('<p class="line2"><span class="pill st-merged">merged</span> '
            '<span class="st st-merged"><a href="#card=t-5aa01bf9afab">blocked by roll #626</a></span> '
            '<span class="pill fine st-stale">stale</span> '
            '<a href="https://git.example/sf/code/pulls/623" target="_blank" rel="noopener" class="pr">PR #623</a></p>')
assert OLD_FACE in page

DRAWER_EMPTY = '<aside id="drawer" class="drawer" aria-label="The card" hidden></aside>'
assert DRAWER_EMPTY in page

STYLE = """
/* the round's own chrome: the states band and nothing else. Tokens,
   type and colours come from the stylesheet as it stands. The main area
   keeps the real console's height (viewport minus the 44px header), the
   band flows below it. */
body:has(#screen) { height: auto; min-height: 100dvh; }
body:has(#screen) > main { flex: none; height: calc(100dvh - 44px); }
.states { flex: none; padding: 18px 18px 40px; border-top: 1px solid var(--line); }
.states > h3 { margin: 0 0 12px; color: var(--text-muted); font: 600 12.5px/20px var(--font-ui); font-variant-caps: all-small-caps; letter-spacing: .07em; }
/* scells/scell: no name the console already owns (.cell is the top strip's
   flex, nowrap cell, .cards a lane's list; both would bleed in here) */
.states .scells { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; align-items: start; }
.states .scell { min-width: 0; }
.states .tail { margin-top: 8px; padding: 8px 12px; border: 1px solid var(--line); background: var(--bg-panel); overflow: hidden; }
.states .tail .figs { margin: 0 0 4px; overflow-wrap: anywhere; }
.states .tail .k { font-weight: 600; }
.states .tail .related li { flex-wrap: wrap; }
"""


def drawer_head(active):
    """the real drawer head, the given tab selected"""
    acts = ("Overview", "Session", "Activity", "Files")
    tabs = "".join(
        '<button type="button" role="tab" aria-selected="%s" aria-controls="drawer-panel" '
        'hx-get="/cards/t-c5ec5de6a7bf/drawer?tab=%s" hx-target="#drawer" hx-swap="innerHTML">%s</button>'
        % ("true" if t.lower().replace("session", "chat") == active else "false",
           t.lower().replace("session", "chat"), t)
        for t in acts)
    return ('<div class="drawer-content" data-drawer="t-c5ec5de6a7bf">'
            '<div class="drawer-head">'
            '<button type="button" id="drawer-close" class="drawer-close" aria-label="Close the drawer">✕</button>'
            '<div class="dr-title"><a class="dr-ref" href="https://git.example/sf/code/issues/623" target="_blank" rel="noopener" data-tip="the issue">#623</a> - <h2 tabindex="-1">Footer: link the licence</h2></div>'
            '<p class="drawer-facts"><span class="pill st-merged">merged</span> <span class="sep"></span><span>1 h 0 min in all</span> <span class="sep"></span><span class="spend">€0.12 / €2.00</span> <span class="pill fine st-stale">stale</span> <span class="chip model">small</span> <a href="' + PR + '" target="_blank" rel="noopener">PR #623</a></p>'
            '<nav class="tabs" role="tablist" aria-label="The card\'s tabs">' + tabs + '</nav>'
            '</div>'
            '<div id="drawer-panel" class="drawer-body" role="tabpanel">')


# the card's own gates, the shape of the live #1351: intake, session,
# checks with its jobs, review, merge
def gates_table(maximum, tail=""):
    rows = """
<tr><td>intake</td><td></td><td><time>2026-10-31 22:08:13</time></td><td>30 s</td><td>webhook</td><td><meter min="0" max="%d" value="30">30 s</meter></td></tr>
<tr><td>session</td><td>1</td><td><time>2026-10-31 22:09:13</time></td><td>18 min</td><td>pushed</td><td><meter min="0" max="%d" value="1080">18 min</meter></td></tr>
<tr><td>checks</td><td>1</td><td><time>2026-10-31 22:27:23</time></td><td>6 min 50 s</td><td>success, 5 of 5</td><td><meter min="0" max="%d" value="410">6 min 50 s</meter></td></tr>
<tr><td>job test</td><td>1</td><td></td><td>2 min 20 s</td><td>success, queued 12 s</td><td><meter min="0" max="%d" value="140">2 min 20 s</meter></td></tr>
<tr><td>job vet</td><td>1</td><td></td><td>2 min 20 s</td><td>success, queued 12 s</td><td><meter min="0" max="%d" value="140">2 min 20 s</meter></td></tr>
<tr><td>job lint</td><td>1</td><td></td><td>2 min 20 s</td><td>success, queued 12 s</td><td><meter min="0" max="%d" value="140">2 min 20 s</meter></td></tr>
<tr><td>review</td><td>1</td><td><time>2026-10-31 22:35:02</time></td><td>4 min</td><td>approved</td><td><meter min="0" max="%d" value="240">4 min</meter></td></tr>
<tr><td>merge</td><td>1</td><td><time>2026-10-31 22:40:44</time></td><td>3 s</td><td>merged</td><td><meter min="0" max="%d" value="3">3 s</meter></td></tr>
""" % ((maximum,) * 8)
    return ('<div class="tscroll"><table class="gates">'
            '<caption>Gates, oldest first</caption>'
            '<thead><tr><th scope="col">Gate</th><th scope="col">Attempt</th><th scope="col">Start, UTC</th><th scope="col">Duration</th><th scope="col">Outcome</th><th scope="col">Against the longest gate</th></tr></thead>'
            '<tbody>' + rows + tail + '</tbody></table></div>')


STEPS = ('<div class="tscroll"><table>'
         '<caption class="visually-hidden">Timeline steps, oldest first</caption>'
         '<thead><tr><th scope="col">Time</th><th scope="col">Step</th><th scope="col">Supervisor</th><th scope="col">Detail</th></tr></thead>'
         '<tbody><tr><td colspan="4">No steps recorded yet.</td></tr></tbody></table></div>')

RUN_A = '<a href="%s" target="_blank" rel="noopener">run 3251</a>' % RUN
RUN2_A = '<a href="%s" target="_blank" rel="noopener">run 3252</a>' % RUN2
RUN3_A = '<a href="%s" target="_blank" rel="noopener">run 3248</a>' % RUN3


def overview_body(status, open_html, chain_sec):
    """the real Overview with the designed Status line, Open block and
    Chain section; the rest as harvested"""
    return ('<dl class="top-block">'
            '<dt>Task</dt><dd>Footer: link the licence</dd>'
            '<dt>Status</dt><dd>' + status + '</dd>'
            '<dt>Budget</dt><dd class="muted"><span class="mono">€0.12 of €2.00, 6 percent</span></dd>'
            '<dt>Agent</dt><dd class="muted"><span class="mono">small</span></dd></dl>'
            + open_html + chain_sec +
            '<details class="sec" data-sec="time"><summary>Time<span class="hint">1 h 0 min waiting · €0.12</span></summary><div class="sec-body"><div class="life"><span class="mono">21:19</span><span class="k st-closed">queued</span><span class="mono num">1 h 0 min</span><span class="mono num"></span><span class="tnote"></span></div></div></details>'
            '<details class="sec" data-sec="objective"><summary>Objective</summary><div class="sec-body"><p class="objective-body">Link the licence in the footer.</p></div></details>'
            '<div class="sec empty"><p class="summary" aria-disabled="true">The agent\'s summary<span class="hint">—</span></p></div>'
            '<div class="sec empty"><p class="summary" aria-disabled="true">The plan<span class="hint">—</span></p></div>'
            '<div class="sec empty"><p class="summary" aria-disabled="true">Reviews and audit<span class="hint">—</span></p></div>'
            '<details class="sec" data-sec="related"><summary>Related cards<span class="hint">1</span></summary><div class="sec-body"><ul class="related"><li><span class="why">rolled by</span> <span class="pill st-merged">merged</span> <a href="#card=t-5aa01bf9afab" hx-get="/cards/t-5aa01bf9afab/drawer" hx-target="#drawer" hx-swap="innerHTML">#626 roll 5e1f0a2: factoryd, gateway, worker, ci-runner</a></li></ul></div></details>'
            '<details class="sec" data-sec="links"><summary>Links</summary><div class="sec-body"><p class="links"><a href="https://git.example/sf/code/issues/623" target="_blank" rel="noopener">issue #623</a> · <a href="' + PR + '" target="_blank" rel="noopener">PR #623</a> · <a href="' + PR + '.diff">the diff</a> · <a href="/tasks/t-c5ec5de6a7bf/timeline">the full timeline</a> · <span class="ref-plain">t-c5ec5de6a7bf</span></p></div></details>')


OPEN_QUIET = ('<div class="open-need"><h3>Open</h3>'
              '<p class="open-bad"> · no event yet, 2 h 0 min on the card</p></div>')

STATUS_TODAY = "merged, 1 h 0 min in all"

# --- faces -----------------------------------------------------------------

def face_line(stage_html):
    return ('<p class="line2"><span class="pill st-merged">merged</span> '
            + stage_html + ' <span class="elapsed">14 min</span> '
            '<span class="pill fine st-stale">stale</span> '
            '<a href="' + PR + '" target="_blank" rel="noopener" class="pr">PR #623</a></p>')


def band_card(stage_html, age, note=""):
    return ('<article class="card face">'
            '<p class="line1"><span class="ref">#623</span> - <strong class="title" title="Footer: link the licence"><a href="#" class="open">Footer: link the licence</a></strong></p>'
            '<p class="line2"><span class="pill st-merged">merged</span> ' + stage_html +
            ' <span class="elapsed">' + age + '</span> '
            '<a href="' + PR + '" target="_blank" rel="noopener" class="pr">PR #623</a></p>' + note + '</article>')


def done_face(trace=""):
    return ('<article class="card face final d-done">'
            '<p class="line1"><span class="ref">#623</span> - <strong class="title" title="Footer: link the licence"><a href="#" class="open">Footer: link the licence</a></strong></p>'
            '<div class="dmeta"><span class="st"><span class="g" aria-hidden="true">✓</span>done</span>'
            + ('<span class="elapsed">' + trace + '</span>' if trace else '<span class="elapsed">1 h 0 min in all</span>') + '</div></article>')


def tail(figs_html, *rows):
    t = '<div class="tail"><p class="figs">' + figs_html + '</p>'
    if rows:
        t += '<ul class="related">' + "".join(rows) + '</ul>'
    return t + '</div>'


def rel_row(why, rest):
    return '<li><span class="why">' + why + '</span> ' + rest + '</li>'


# --- the six candidates ----------------------------------------------------

def d1():
    """the chain as the gates table's tail: one row that meters the wait
    like any gate, its runs and required contexts nested under it as the
    jobs nest under checks"""
    stage = '<span class="st st-merged">chain running</span>'
    tail_rows = ('<tr><td>chain</td><td>1</td><td><time>2026-10-31 22:40:47</time></td><td>open for 14 min</td><td>running</td><td><meter min="0" max="1080" value="840">open for 14 min</meter></td></tr>'
                 '<tr><td>run 3251</td><td></td><td></td><td>pending 14 min</td><td>carries the merge</td><td><meter min="0" max="1080" value="840">14 min</meter></td></tr>'
                 '<tr><td><code>factory/roll</code></td><td></td><td></td><td>pending</td><td>required</td><td></td></tr>')
    body = gates_table(1080, tail_rows) + STEPS
    done_tail = tail("the table's last row once the cover lands",
                     rel_row("chain", '<span class="mono">22:40</span> <span class="mono num">25 min</span> live through ' + RUN3_A))
    red_tail = tail("run 3251 failure, run 3252 queued",
                    rel_row("chain", '<span class="mono num">12 min</span> <span class="k st-failed">failure</span>, one re-run queued'))
    band = (band_card('<span class="st st-failed">chain red</span>', "12 min") + red_tail,
            band_card('<span class="st st-waiting">stalled</span>', "26 h"),
            band_card('<span class="st st-merged">waiting for the chain</span>', "8 min"),
            band_card('<span class="st st-merged"><a href="#card=t-5aa01bf9afab">blocked by roll #626</a></span>', "14 min"),
            done_face() + done_tail)
    return stage, "activity", body, band


def chainbox():
    return ('<section class="chainbox" aria-label="Chain" style="margin-top:16px">'
                '<h3 style="margin:0 0 2px;color:var(--text-muted);font:600 12.5px/20px var(--font-ui);font-variant-caps:all-small-caps;letter-spacing:.07em">Chain</h3>'
                '<p class="figs">' + RUN_A + ' · pending 14 min · requires factory/roll · head of main</p>'
                '<ul class="related">'
                '<li><span class="why">carry run</span> ' + RUN_A + ' <span class="mono num">22:40</span> <span class="mono num">14 min</span> <span class="k st-waiting">pending</span></li>'
                '<li><span class="why">required</span> <span class="mono">factory/roll</span> <span class="mono num"></span> <span class="mono num"></span> <span class="k st-waiting">pending</span></li>'
                '<li><span class="why">head of main</span> ' + RUN_A + ' <span class="mono num">22:40</span> <span class="mono num">14 min</span> <span class="k st-waiting">pending</span></li>'
                '</ul></section>')


def d2():
    """a readout block of the factory's own facts under the tables: the
    C24 grammar, one row per fact, every run linked"""
    stage = '<span class="st st-merged">chain running</span>'
    body = gates_table(1080) + STEPS + chainbox()
    done_tail = tail("cover run 3251 · live 23:06 · 25 min from merge",
                     rel_row("cover run", RUN3_A + ' <span class="mono num">25 min</span> <span class="k st-done">live</span>'))
    red_tail = tail("run 3251 failure · run 3252 queued",
                    rel_row("carry run", RUN_A + ' <span class="mono num">12 min</span> <span class="k st-failed">failure</span>'),
                    )
    stalled_tail = tail("run 3252 pending 26 h · stall card #209",
                        rel_row("carry run", RUN2_A + ' <span class="mono num">26 h</span> <span class="k st-waiting">stalled</span> · <a href="#">stall card #209</a>'))
    band = (band_card('<span class="st st-failed">chain red</span>', "12 min") + red_tail,
            band_card('<span class="st st-waiting">stalled</span>', "26 h") + stalled_tail,
            band_card('<span class="st st-merged">waiting for the chain</span>', "8 min"),
            band_card('<span class="st st-merged"><a href="#card=t-5aa01bf9afab">blocked by roll #626</a></span>', "14 min"),
            done_face() + done_tail)
    return stage, "activity", body, band


def d3():
    """a Chain section beside Time in the Overview, its rows the runs of
    the wait in the Time section's own format; the Status line names it"""
    stage = '<span class="st st-merged">chain running</span>'
    status = STATUS_TODAY + ' · <span class="st st-merged">chain running, ' + RUN_A + '</span>'
    chain_sec = ('<details class="sec" data-sec="chain" open><summary>Chain<span class="hint">run 3251 pending · 14 min</span></summary><div class="sec-body">'
                 '<div class="life runs">'
                 '<span class="mono">22:40</span><span class="k st-waiting">' + RUN_A + '</span><span class="mono num">14 min</span><span class="mono num"></span><span class="tnote">pending, carries the merge commit</span>'
                 '</div>'
                 '<div class="life runs">'
                 '<span class="mono"></span><span class="k st-waiting">factory/roll</span><span class="mono num"></span><span class="mono num"></span><span class="tnote">required by the project file, pending</span>'
                 '</div></div></details>')
    body = overview_body(status, OPEN_QUIET, chain_sec)
    done_tail = tail("the Chain section once the cover lands",
                     rel_row("22:29", 'merged · live 22:54 through ' + RUN3_A + ' <span class="mono num">25 min</span>'))
    red_tail = tail("the Chain section on red",
                    rel_row("22:40", RUN_A + ' <span class="mono num">12 min</span> <span class="k st-failed">failure</span>'),
                    rel_row("22:53", RUN2_A + ' <span class="mono num">2 min</span> <span class="k st-waiting">queued, one re-run</span>'))
    band = (band_card('<span class="st st-failed">chain red</span>', "12 min") + red_tail,
            band_card('<span class="st st-waiting">stalled</span>', "26 h"),
            band_card('<span class="st st-merged">waiting for the chain</span>', "8 min"),
            band_card('<span class="st st-merged"><a href="#card=t-5aa01bf9afab">blocked by roll #626</a></span>', "14 min"),
            done_face() + done_tail)
    return stage, "overview", body, band


def d4():
    """the face carries the run: the stage word becomes the run and its
    link, the drawer stays as it is"""
    stage = '<span class="st st-merged"><a href="%s" target="_blank" rel="noopener">chain run 3251</a></span>' % RUN
    body = gates_table(1080) + STEPS
    done = done_face("live through run 3248, 25 min after merge")
    red = band_card('<span class="st st-failed"><a href="%s" target="_blank" rel="noopener">run 3251 red</a></span>' % RUN, "12 min")
    stalled = band_card('<span class="st st-waiting"><a href="%s" target="_blank" rel="noopener">run 3252 stalled</a></span>' % RUN2, "26 h")
    waiting = band_card('<span class="st st-merged">waiting for the chain</span>', "8 min")
    roll = band_card('<span class="st st-merged"><a href="#card=t-5aa01bf9afab">blocked by roll #626</a></span>', "14 min")
    return stage, "activity", body, (red, stalled, waiting, roll, done)


def d5():
    """the normal wait stays as today; the exceptions speak in the
    Overview's Open block, and done closes the story"""
    stage = '<span class="st st-merged">chain running</span>'
    status = STATUS_TODAY + ' · <span class="st st-merged">run 3251 pending, 14 min</span>'
    body = overview_body(status, OPEN_QUIET, "")
    red_open = ('<div class="open-need"><h3>Open</h3>'
                '<p class="open-bad">The chain run ' + RUN_A + ' failed 12 min in; the card deploys when a run on main goes green. A newer run covers it.</p>'
                '<div class="acts"><a class="button" href="' + RUN + '" target="_blank" rel="noopener">Open run 3251</a></div></div>')
    stalled_open = ('<div class="open-need"><h3>Open</h3>'
                    '<p class="open-bad">The chain run ' + RUN2_A + ' has been pending 26 h, past the project\'s 24 h bound; the ladder re-ran it once. Dismiss the stall, or read the stall card.</p>'
                    '<div class="acts"><a class="button" href="#">Stall card #209</a> <a class="button" href="#">Dismiss</a></div></div>')
    band = (band_card('<span class="st st-failed">chain red</span>', "12 min") + tail_open(red_open),
            band_card('<span class="st st-waiting">stalled</span>', "26 h") + tail_open(stalled_open),
            band_card('<span class="st st-merged">waiting for the chain</span>', "8 min"),
            band_card('<span class="st st-merged"><a href="#card=t-5aa01bf9afab">blocked by roll #626</a></span>', "14 min"),
            done_face())
    return stage, "overview", body, band


def tail_open(open_html):
    return '<div class="tail">' + open_html + '</div>'


def d6():
    """the lean hybrid: one row in the gates table, one clause in the
    Status line, an Open item only when the chain is red or stalled, and
    the done face carries the cover"""
    stage = '<span class="st st-merged">chain running</span>'
    tail_rows = ('<tr><td>chain</td><td>1</td><td><time>2026-10-31 22:40:47</time></td><td>open for 14 min</td><td>' + RUN_A + '</td><td><meter min="0" max="1080" value="840">open for 14 min</meter></td></tr>'
                 '<tr><td><code>factory/roll</code></td><td></td><td></td><td>pending</td><td>required</td><td></td></tr>')
    body = gates_table(1080, tail_rows) + STEPS
    red_open = tail_open('<div class="open-need"><h3>Open</h3>'
                         '<p class="open-bad">The chain run ' + RUN_A + ' failed; ' + RUN2_A + ' is queued and covers the card.</p></div>')
    stalled_open = tail_open('<div class="open-need"><h3>Open</h3>'
                             '<p class="open-bad">' + RUN2_A + ' pending 26 h, past the 24 h bound; the ladder re-ran it once. <a href="#">Stall card #209</a> · <a href="#">Dismiss</a></p></div>')
    status_tail = tail("the Overview's Status line",
                       rel_row("Status", 'merged, 1 h 0 min in all · <span class="st st-merged">run 3251 pending, 14 min</span>'))
    band = (band_card('<span class="st st-failed">chain red</span>', "12 min") + red_open,
            band_card('<span class="st st-waiting">stalled</span>', "26 h") + stalled_open,
            band_card('<span class="st st-merged">waiting for the chain</span>', "8 min"),
            band_card('<span class="st st-merged"><a href="#card=t-5aa01bf9afab">blocked by roll #626</a></span>', "14 min") + status_tail,
            done_face("live through run 3248, 25 min after merge"))
    return stage, "activity", body, band


def fusion():
    """the compare loop's A: d4's face carries the run, d2's block carries
    the facts, the done face carries the cover"""
    stage = '<span class="st st-merged"><a href="%s" target="_blank" rel="noopener">chain run 3251</a></span>' % RUN
    body = gates_table(1080) + STEPS + chainbox()
    done_tail = tail("cover run 3251 · live 23:06 · 25 min from merge",
                     rel_row("cover run", RUN3_A + ' <span class="mono num">25 min</span> <span class="k st-done">live</span>'))
    red_tail = tail("run 3251 failure · run 3252 queued",
                    rel_row("carry run", RUN_A + ' <span class="mono num">12 min</span> <span class="k st-failed">failure</span>'),
                    rel_row("re-run", RUN2_A + ' <span class="mono num">2 min</span> <span class="k st-waiting">queued</span>'))
    stalled_tail = tail("run 3252 pending 26 h · stall card #209",
                        rel_row("carry run", RUN2_A + ' <span class="mono num">26 h</span> <span class="k st-waiting">stalled</span> · <a href="#">stall card #209</a>'))
    band = (band_card('<span class="st st-failed"><a href="%s" target="_blank" rel="noopener">run 3251 red</a></span>' % RUN, "12 min") + red_tail,
            band_card('<span class="st st-waiting"><a href="%s" target="_blank" rel="noopener">run 3252 stalled</a></span>' % RUN2, "26 h") + stalled_tail,
            band_card('<span class="st st-merged">waiting for the chain</span>', "8 min"),
            band_card('<span class="st st-merged"><a href="#card=t-5aa01bf9afab">blocked by roll #626</a></span>', "14 min"),
            done_face("live through run 3248, 25 min after merge") + done_tail)
    return stage, "activity", body, band


CANDS = [
    ("d1-table", "the chain as the gates table's tail", d1),
    ("d2-block", "a Chain readout block on Activity", d2),
    ("d3-section", "a Chain section beside Time in the Overview", d3),
    ("d4-face", "the face carries the run", d4),
    ("d5-open", "the exceptions speak in Open, done closes the story", d5),
    ("d6-lean", "the lean hybrid", d6),
    ("fusion", "the face carries the run, the block carries the facts", fusion),
]


def build(name, title, make):
    stage, tab, body, band = make()
    cells = "".join('<div class="scell">' + c + '</div>' for c in band)
    band_html = ('<section class="states" aria-label="The chain\'s states">'
                 '<h3>The chain\'s states</h3><div class="scells">' + cells + '</div></section>')
    drawer = ('<aside id="drawer" class="drawer" aria-label="The card">'
              + drawer_head(tab) + body + '</div></aside>')

    def variant(with_drawer, theme):
        p = page
        p = p.replace('<link rel="stylesheet" href="./console.css">',
                      '<link rel="stylesheet" href="./console.css">\n<style>' + STYLE + "</style>")
        p = p.replace(OLD_FACE, face_line(stage))
        p = p.replace(DRAWER_EMPTY, drawer if with_drawer else DRAWER_EMPTY)
        p = p.replace("</main>", "</main>\n" + band_html, 1)
        if theme == "light":
            p = p.replace('data-theme="dark"', 'data-theme="light"')
        p = p.replace("<title>Factory console</title>",
                      "<title>" + name + " — round 15</title>")
        return p

    (here / (name + ".html")).write_text(variant(True, "dark"))
    (here / (name + "-light.html")).write_text(variant(True, "light"))
    (here / (name + "-board.html")).write_text(variant(False, "dark"))
    (here / (name + "-board-light.html")).write_text(variant(False, "light"))


for name, title, make in CANDS:
    build(name, title, make)
    print(name, "written")
