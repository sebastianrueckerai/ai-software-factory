#!/usr/bin/env python3
"""Builds the round's page, index.html, beside this file: the recommendation, the three built variants with their
shots, the eight directions with both sheets and the critics' rankings, and the links. Run from anywhere."""
import html
import json
from pathlib import Path

R = Path(__file__).resolve().parent
e = html.escape
VARIANTS = [
    ("panel", "A. Panel", "The home is the expanded status panel: a Routines column beside In progress, Needs you and Spend. The folded strip names a run only when it is under an hour away or held."),
    ("board", "B. Board", "The home is the board: the next due routine as a dashed ghost card at the foot of Queued, and a \"due this week\" menu in the column's head."),
    ("chat", "C. Chat", "The home is the inbox thread: a pinned Routines panel under its head, foldable to one line, and the factory's poke before and at the filing."),
    ("hybrid", "D. Hybrid", "The combination both critics asked for: the ghost card on the board as the announcement, the strip's cell when a run is under an hour away or held, and the Routines column in the status panel as the one list. No menu in the column's head."),
]
SHOTS = [
    ("due-dark-1440", "due, dark, the home closed"), ("due-dark-1440-home", "due, dark, the home open"),
    ("due-light-1440-home", "due, light, the home open"), ("due-dark-1440-routine", "the weekly bump's drawer"),
    ("filed-dark-1440", "filed: #790 in Needs you"), ("filed-dark-1440-card", "#790's drawer with the provenance line"),
    ("held-dark-1440-home", "held: #781 still open"), ("audit-dark-1440", "the audit running as #792"),
    ("due-dark-1440-skip", "after Skip once"),
]
PHONES = [("phone-due-dark-390-home", "the home on the phone"), ("phone-filed-light-390", "filed, light, the phone")]
DIRECTIONS = ["01-ghost-card", "02-panel-column", "03-routines-page", "04-policy-in-force", "05-schedule-tape", "06-inbox-standing-row", "07-routine-drawer", "08-column-head"]


def fig(src, cap, cls=""):
    return f'<figure class="{cls}"><a href="{e(src)}"><img src="{e(src)}" alt="{e(cap)}" loading="lazy"></a><figcaption>{e(cap)}</figcaption></figure>'


def critic(name):
    p = R / "critique" / f"{name}.json"
    if not p.exists():
        return ""
    d = json.loads(p.read_text())
    a = d.get("answer") or d.get("text") or d
    if isinstance(a, str):
        s = a.strip()
        if s.startswith("```"):
            s = s.split("\n", 1)[1].rsplit("```", 1)[0]
        try:
            a = json.loads(s)
        except Exception:
            return f"<pre>{e(s[:3000])}</pre>"
    rows = "".join(f"<tr><td>{e(str(r.get('direction') or r.get('variant')))}</td><td>{e(str(r.get('score')))}</td><td>{e(str(r.get('why')))}</td></tr>" for r in a.get("ranking", []))
    return f'<table><tr><th>candidate</th><th>score</th><th>why</th></tr>{rows}</table><details><summary>the whole answer</summary><pre>{e(json.dumps(a, indent=1))}</pre></details>'


def cost():
    return sum(json.loads(p.read_text()).get("est_cost_usd", 0) for p in R.rglob("*.json") if p.is_file() and '"est_cost_usd"' in p.read_text())


def main():
    rec = (R / "notes.md").read_text().split("## The recommendation", 1)[-1].split("\n## ", 1)[0].strip() if (R / "notes.md").exists() else ""
    rec_html = "".join(f"<p>{e(par)}</p>" for par in rec.split("\n\n") if par.strip())
    variants = ""
    for slug, title, what in VARIANTS:
        if not (R / slug / "index.html").exists():
            variants += f'<section class="variant"><h2>{e(title)}</h2><p>not built</p></section>'
            continue
        shots = "".join(fig(f"{slug}/shots/{s}.png", f"{title[3:]}: {cap}") for s, cap in SHOTS if (R / slug / "shots" / f"{s}.png").exists())
        phones = "".join(fig(f"{slug}/shots/{s}.png", f"{title[3:]}: {cap}", "phone") for s, cap in PHONES if (R / slug / "shots" / f"{s}.png").exists())
        links = " ".join(f'<a href="{slug}/index.html?scenario={m}&amp;theme=dark">{m}</a>' for m in ("due", "filed", "held", "audit"))
        variants += f'<section class="variant"><h2>{e(title)}</h2><p>{e(what)}</p><p class="all">open live: {links} · <a href="{slug}/index.html?scenario=due&amp;theme=light">light</a></p><div class="grid">{shots}{phones}</div></section>'
    dirs = "".join(f'<figure>{"".join(f"<a href=\"{s}-{t}.png\"><img src=\"{s}-{t}.png\" alt=\"{s} {t}\" loading=\"lazy\"></a>" for t in ("dark", "light"))}<figcaption>{e(s)}</figcaption></figure>' for s in DIRECTIONS)
    page = f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Round 04: where the routines live</title>
<style>
body{{font:15px/1.5 system-ui,sans-serif;margin:0;padding:24px 28px;background:#f4f4f2;color:#111;max-width:1700px}}
h1{{margin:0 0 4px}} h2{{margin:28px 0 8px;font-size:20px}} .meta{{color:#666}} a{{color:#0a5c7a}}
section.variant{{background:#fff;padding:16px 18px;border-radius:6px;margin:16px 0}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:14px;align-items:start}}
figure{{margin:0}} figure img{{width:100%;display:block;border:1px solid #ddd;background:#111}} figcaption{{font-size:12.5px;color:#555;margin-top:4px}}
figure.phone{{max-width:260px}} .dirs{{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:14px}}
.dirs figure{{display:grid;grid-template-columns:1fr 1fr;gap:4px}} .dirs figcaption{{grid-column:1/3}}
table{{border-collapse:collapse;font-size:13.5px;background:#fff}} td,th{{border:1px solid #ddd;padding:4px 8px;vertical-align:top;text-align:left}}
pre{{white-space:pre-wrap;font-size:12px;background:#f7f7f7;padding:8px}} details{{margin:8px 0}} .all a{{margin-right:8px}}
.rec{{background:#fff;padding:16px 18px;border-radius:6px;border-left:4px solid #0a5c7a}}
</style>
<h1>Round 04: where the routines live</h1>
<p class="meta"><a href="brief.md">the brief</a> · <a href="notes.md">the notes</a> · <a href="../../../docs/routines.md">docs/routines.md</a> · <a href="BUILDER.md">the builder's brief</a> · <a href="../../PICKS.md">PICKS.md</a> · cost of the round ~${cost():.2f}</p>
<h2>The recommendation</h2>
<div class="rec">{rec_html}</div>
<h2>The four variants</h2>
<p>Three homes built on the instrument prototype of round 02, and the hybrid both critics asked for. Every variant shares the routine chip on a filed card, the provenance line in its drawer, the routine's own drawer (Overview, Runs, Config) and the acts Skip once and Run now. The moments: due (Monday 05:40, the weekly bump files in 20 minutes), filed (#790 just landed in Needs you), held (last week's #781 still open), audit (the audit reached 20 merges and runs as #792).</p>
{variants}
<h2>The critics on the four, the second loop</h2>
<h3>Gemini 2.5 Pro</h3>{critic("gemini-compare")}
<h3>GLM 5V Turbo</h3>{critic("glm-compare")}
<h2>The critics on the first three, the first loop</h2>
<h3>Gemini 2.5 Pro</h3>{critic("gemini-variants")}
<h3>GLM 5V Turbo</h3>{critic("glm-variants")}
<h2>The eight directions</h2>
<p><a href="contact-sheet-dark.jpg">the dark sheet</a> · <a href="contact-sheet-light.jpg">the light sheet</a> · the prompts are the .txt files beside each image, the sidecar .json names the model and the cost.</p>
<div class="dirs">{dirs}</div>
<h2>The critics on the directions</h2>
<h3>Gemini 2.5 Pro</h3>{critic("gemini-directions")}
<h3>GLM 5V Turbo</h3>{critic("glm-directions")}
</html>"""
    (R / "index.html").write_text(page)
    print(R / "index.html")


if __name__ == "__main__":
    main()
