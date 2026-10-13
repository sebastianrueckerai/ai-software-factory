"""Build design/index.html, the morning page of the console design round: the before, the rounds, the prototypes side by side."""
import html, json
from pathlib import Path

D = Path(__file__).parent
CARRIED = ["06-mission-control", "09-inbox-first", "01-linear-calm", "02-geist-contrast", "16-messenger-dock",
           "04-swiss-grid", "10-command-palette", "11-terminal", "13-factory-floor", "03-soft-saas"]
ALL = ["01-linear-calm", "02-geist-contrast", "03-soft-saas", "04-swiss-grid", "05-broadsheet", "06-mission-control", "07-trading-floor",
       "08-grafana-dense", "09-inbox-first", "10-command-palette", "11-terminal", "12-blueprint", "13-factory-floor", "14-glass-depth", "15-riso", "16-messenger-dock"]
SHOTS = ["busy-dark-1440", "busy-light-1440", "idle-dark-1440", "fire-dark-1440", "drawer-busy-dark-1440", "busy-dark-1920", "quiet-light-1440", "phone-busy-dark-390", "phone-busy-light-390"]
esc = lambda s: html.escape(str(s))

def cost(*dirs):
    t = 0.0
    for d in dirs:
        for p in Path(d).rglob("*.json"):
            try: t += json.loads(p.read_text()).get("est_cost_usd", 0)
            except Exception: pass
    return t

def img(src, cls=""):
    return f'<a href="{src}"><img loading="lazy" src="{src}" alt="" class="{cls}"></a>' if (D / src).exists() else ""

def prototype(slug):
    p = D / "prototypes" / slug / "index.html"
    rank = CARRIED.index(slug) + 1
    if not p.exists():
        return f'<section class="proto missing"><h3>{rank}. {esc(slug)}</h3><p>not built</p></section>'
    shots = "".join(f'<figure>{img(f"prototypes/{slug}/shots/{s}.png")}<figcaption>{s}</figcaption></figure>' for s in SHOTS)
    notes = D / "prototypes" / slug / "NOTES.md"
    n = f'<details><summary>Critique and fix notes</summary><pre>{esc(notes.read_text())}</pre></details>' if notes.exists() else ""
    links = " · ".join(f'<a href="prototypes/{slug}/index.html?scenario={sc}&theme={th}">{sc} {th}</a>' for sc in ("busy", "idle", "fire", "quiet") for th in ("dark", "light"))
    return f'''<section class="proto" id="{slug}"><h3>{rank}. {esc(slug)}</h3>
<p><a class="open" href="prototypes/{slug}/index.html">Open the prototype</a> · {links} · <a href="themes/{slug}/DESIGN.md">Theme</a> · round 01 {img(f"rounds/01-directions/{slug}-dark.png", "thumb")} {img(f"rounds/01-directions/{slug}-light.png", "thumb")}</p>
<div class="shots">{shots}</div>{n}</section>'''

def main():
    r1, r2 = D / "rounds/01-directions", D / "rounds/02-depth"
    total = cost(D / "rounds", D / "prototypes")
    dirs = "".join(f'<figure class="{"carried" if s in CARRIED else "dropped"}">{img(f"rounds/01-directions/{s}-dark.png")}{img(f"rounds/01-directions/{s}-light.png")}<figcaption>{s}{"" if s in CARRIED else " · dropped"}</figcaption></figure>' for s in ALL)
    depth = "".join(f'<figure>{img(f"rounds/02-depth/{s}-drawer.png")}{img(f"rounds/02-depth/{s}-idle.png")}{img(f"rounds/02-depth/{s}-phone.png", "phone")}<figcaption>{s}: drawer, idle, phone</figcaption></figure>' for s in CARRIED)
    hybrids = "".join(f'<figure>{img(f"rounds/02-depth/{h}")}<figcaption>{h[:-9]}</figcaption></figure>' for h in sorted(p.name for p in r2.glob("h-*.png")))
    base = "".join(f'<figure>{img(f"rounds/00-baseline/{s}")}<figcaption>{s}</figcaption></figure>' for s in ("busy/dark/board-1440.png", "busy/light/board-1440.png", "idle/dark/board-1440.png", "busy/dark/drawer-running-1440.png", "busy/dark/phone-board-390.png"))
    page = f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Console design round, the morning page</title>
<style>
body{{font:15px/1.5 system-ui,sans-serif;margin:0;padding:24px 32px;background:#eeeeeb;color:#111;max-width:1800px}}
h1{{margin:0 0 4px}} h2{{margin:36px 0 10px;font-size:20px}} h3{{margin:0 0 6px;font-size:17px}}
.meta{{color:#666}} a{{color:#1a3fbf}} .open{{font-weight:600}}
section{{background:#fff;padding:14px 16px;border-radius:6px;margin-bottom:18px}} .missing{{background:#f6f6f3;color:#777}}
.shots{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-items:start}} figure{{margin:0}} figcaption{{font-size:12px;color:#666;margin-top:3px}}
img{{width:100%;display:block;border:1px solid #ddd;background:#222}} .shots img[src*="phone"]{{max-height:440px;object-fit:cover;object-position:top}} img.thumb{{width:120px;display:inline-block;vertical-align:middle}} img.phone{{max-width:160px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:14px}} .grid figure img{{display:inline-block;width:49%}} .dropped{{opacity:.55}}
.depth figure{{display:grid;grid-template-columns:3fr 3fr 1fr;gap:6px}} .depth figcaption{{grid-column:1/-1}}
pre{{white-space:pre-wrap;font-size:12px;background:#f7f7f7;padding:8px}} .hy figure img{{width:100%}}
</style>
<h1>Console design round</h1>
<p class="meta">Estimated spend on images and critiques: ${total:.2f}. The lab's baseline and every prototype screenshot were free. Decisions go into <a href="PICKS.md">PICKS.md</a>. The brief: <a href="brief.md">brief.md</a>, the shared IA: <a href="ia.md">ia.md</a>, the plan: <a href="sessions/01-design-round.md">sessions/01-design-round.md</a>.</p>
<h2>The prototypes, in the director's order</h2>
<p class="meta">Each opens in the browser with its scenario and theme switch. Shots: busy dark and light, idle, fire, the drawer, 1920, quiet light, the phone.</p>
{"".join(prototype(s) for s in CARRIED)}
<h2>Before: the console today, from the lab</h2>
<section><div class="shots">{base}</div></section>
<h2>Round 01: 16 directions, dark and light</h2>
<p class="meta"><a href="rounds/01-directions/notes.md">notes.md</a> · <a href="rounds/01-directions/contact-sheet-dark.jpg">dark sheet</a> · <a href="rounds/01-directions/contact-sheet-light.jpg">light sheet</a> · <a href="rounds/01-directions/critique/gemini-dark.json">critic, dark</a> · <a href="rounds/01-directions/critique/gemini-light.json">critic, light</a></p>
<section><div class="grid">{dirs}</div></section>
<h2>Round 02: depth on the carried ten, and three hybrids</h2>
<p class="meta"><a href="rounds/02-depth/notes.md">notes.md</a></p>
<section class="depth"><div class="grid">{depth}</div></section>
<section class="hy"><div class="shots">{hybrids}</div></section>
<h2>Round 00: the model probe</h2>
<p class="meta"><a href="rounds/00-model-probe/notes.md">notes.md</a></p>
<section>{img("rounds/00-model-probe/contact-sheet.jpg")}</section>
</html>"""
    (D / "index.html").write_text(page)
    print("design/index.html")

if __name__ == "__main__":
    main()
