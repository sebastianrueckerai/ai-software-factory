#!/usr/bin/env python3
"""Builds the round's page, index.html, beside this file: the recommendation, the built variants with their
shots, the eight directions with both sheets and the critics' rankings, and the links. Run from anywhere."""
import html
import json
from pathlib import Path

R = Path(__file__).resolve().parent
e = html.escape
VARIANTS = [
    ("wiki", "A. Wiki", "One document in the drawer's slot at the right edge over the board. Links open in place. Back and forward arrows, a Recent menu and three pins in the head. The browser's back works too."),
    ("tabs", "B. Tabs", "The same slot under a tab strip: one tab per opened document, a card as a tab too, a link opens a new tab. Beyond what fits, the rest fold into a menu."),
    ("split", "C. Split", "Two panes over the whole board: a link in the left pane opens its target in the right. Swap, One pane, and a one-line Needs you strip since the board is covered."),
    ("hybrid", "D. Hybrid", "The combination both critics and the split's builder asked for after the first loop: the wiki as it is, with the split's two panes as its Wide state once a link is followed while wide, and the back arrow naming its target."),
]
SHOTS = [
    ("roadmap-dark-1440", "the roadmap, dark"), ("roadmap-light-1440", "the roadmap, light"),
    ("plan-dark-1440", "the plan opened from the roadmap's link"), ("back-dark-1440", "after going back"),
    ("hover-dark-1440", "the peek on hover"), ("edit-dark-1440", "the editor"),
    ("saved-dark-1440", "after a save"), ("refused-light-1440", "a refused save, light"),
    ("wide-dark-1440", "the view at its widest"), ("new-light-1440", "New document, light"),
    ("card-dark-1440", "a card opened over the document"), ("six-dark-1440", "six documents open"),
    ("roadmap-dark-1920", "the roadmap at 1920"),
]
PHONES = [("phone-roadmap-dark-390", "the roadmap on the phone"), ("phone-plan-light-390", "the plan on the phone, light"), ("phone-edit-dark-390", "the editor on the phone")]
DIRECTIONS = ["01-wiki-drawer", "02-tabs", "03-reader", "04-split", "05-docs-page", "06-chat-pane", "07-peek", "08-tree-rail"]


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
        links = " ".join(f'<a href="{slug}/index.html?scenario=busy&amp;doc=docs/roadmap.md&amp;theme={t}">{t}</a>' for t in ("dark", "light"))
        variants += f'<section class="variant"><h2>{e(title)}</h2><p>{e(what)}</p><p class="all">open live: {links}</p><div class="grid">{shots}{phones}</div></section>'
    STATES = [("state-clean", "clean"), ("state-unsaved", "unsaved: the dot"), ("state-saving", "saving"), ("state-saved", "saved"), ("state-failed", "not saved: Forgejo not reachable"), ("state-structure", "not saved: the structure check"), ("state-changed-read", "changed while reading"), ("state-changed-edit", "changed while editing"), ("state-load-theirs", "load theirs asks"), ("state-merged", "saved, merged"), ("state-refused", "refused: the same lines, show theirs"), ("state-draft-left", "a draft left behind: the dots"), ("state-restored", "a draft restored"), ("state-discard", "discard asks"), ("state-new", "a new document"), ("state-unsaved-light", "unsaved, light"), ("state-refused-light", "refused, light")]
    PSTATES = [("phone-state-unsaved-390", "unsaved on the phone"), ("phone-state-changed-edit-390", "changed while editing, on the phone")]
    sfigs = "".join(fig(f"wiki/shots/{s}.png", cap) for s, cap in STATES if (R / "wiki" / "shots" / f"{s}.png").exists())
    sfigs += "".join(fig(f"wiki/shots/{s}.png", cap, "phone") for s, cap in PSTATES if (R / "wiki" / "shots" / f"{s}.png").exists())
    states = f'<section class="variant"><h2>The wiki\'s save and change states</h2><p>Open the wiki live with <code>&amp;slow=1</code>, <code>&amp;offline=1</code>, <code>&amp;structure=1</code>, <code>&amp;changed=read|edit|same</code> or <code>&amp;draft=1</code> to walk them; Ctrl+S saves.</p><div class="grid">{sfigs}</div></section>' if sfigs else ""
    dirs = "".join(f'<figure>{"".join(f"<a href=\"{s}-{t}.png\"><img src=\"{s}-{t}.png\" alt=\"{s} {t}\" loading=\"lazy\"></a>" for t in ("dark", "light"))}<figcaption>{e(s)}</figcaption></figure>' for s in DIRECTIONS)
    page = f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Round 05: the documents in the screen</title>
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
<h1>Round 05: the documents in the screen</h1>
<p class="meta"><a href="brief.md">the brief</a> · <a href="notes.md">the notes</a> · <a href="../../../docs/plans/2026-10-15-backlog-pull-and-close-out.md">the backlog plan</a> · <a href="BUILDER.md">the builder's brief</a> · <a href="../../PICKS.md">PICKS.md</a> · cost of the round ~${cost():.2f}</p>
<h2>The recommendation</h2>
<div class="rec">{rec_html}</div>
<h2>The pick</h2>
<p>Sebastian, 2026-10-15: <b>A. Wiki</b>, no second pane (C17, roadmap 275). His rulings on saving and on outside changes are built into the wiki prototype as states, below, and the plan is <a href="../../../docs/plans/2026-10-15-documents-in-the-screen.md">docs/plans/2026-10-15-documents-in-the-screen.md</a>.</p>
{states}
<h2>The variants</h2>
<p>Three shapes built on the instrument prototype of round 02, and a hybrid if the critics asked for one. Every variant shares the document engine (docs.js: the real documents of this repository, shortened, with their real links), the rendered document at a 70-character measure, the Read | Edit switch, the editor with Save as commit, the refusal when the file changed under the member, New document, the peek on hover and the phone layout. Open a variant live and click: the roadmap's links, the way back, Edit, Save, New document, a card. Add <code>&amp;conflict=1</code> to the URL to arm a refused save.</p>
{variants}
<h2>The critics, the second loop</h2>
<h3>Gemini 2.5 Pro</h3>{critic("gemini-compare")}
<h3>GLM 5V Turbo</h3>{critic("glm-compare")}
<h2>The critics on the three, the first loop</h2>
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
