#!/usr/bin/env python3
"""Builds the round's candidates from the live landing page, shoots them and lays out the contact sheets.

Run from this folder: python3 build.py [build] [shoot] [sheets]. No argument runs all three.
Candidates are copies of launch/site/index.html with the hero or the stylesheet changed; their asset paths point
back at launch/site, so they render from the repository without a copy of the assets.
"""
import json, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SRC = ROOT / "launch/site/index.html"
CAND = HERE / "candidates"
SHOTS = HERE / "shots"
SITE = "../../../../launch/site/"
CHROME = ["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=4000"]

LINES = {
    "A00": "The worst an agent can do is wreck its own sandbox.",
    "A01": "Write the roadmap. Agents build it on your servers.",
    "A02": "Autonomous software development on servers you control.",
    "A03": "A team of coding agents, each walled into its own sandbox.",
    "A04": "Run a team of coding agents from one chat.",
    "A05": "Agents build your roadmap. The gates decide what merges.",
    "A06": "AI writes the code. Your servers run it. Checks decide what merges.",
    "A07": "Coding agents for teams whose code must stay in house.",
    "A08": "One board, one chat, and agents that build what is on it.",
    "A09": "Software built by agents, each in its own sandbox, nothing merged unchecked.",
    "A10": "Your roadmap in. Checked code out. Everything between on your servers.",
    "A11": "A software factory you run yourself: agents build, gates decide, you steer.",
}

EYEBROW = '<p class="eyebrow">AI software factory · Self-hosted · Source available</p>'
H1 = '<h1 id="hero-h">The worst an agent can do is wreck its own sandbox.</h1>'
LEDE = ('<p class="lede">Write a roadmap. Agents build it card by card, each in its own sandbox on your servers. '
        'Nothing merges until the checks pass.</p>')
BTN_FILM = ('<button type="button" class="btn film" data-play aria-label="Play the film, three minutes, captions, no sound">'
            '<span aria-hidden="true">▶</span> Watch the film · 3 min</button>')
BTN_HOW = '<a class="btn" href="#loop">How it works</a>'
BTN_SRC = '<a class="btn" href="https://github.com/sebastianrueckerai/ai-software-factory">Source and setup</a>'
LINKS = f'<div class="links">{BTN_FILM}{BTN_HOW}{BTN_SRC}</div>'
BIGPLAY = ('<button type="button" class="bigplay" id="play-film" aria-label="Play the film, three minutes, captions, no sound">'
           '<span class="ring" aria-hidden="true">▶</span><span class="lbl">Watch the film · 3 min</span></button>')
POINTS_CONSOLE = '''<ul class="points">
<li><b>Change anything from one chat.</b> The agent proposes. You press Do it.</li>
<li class="amber"><b>See what is stuck</b> and what waits on you, in the amber column.</li>
<li><b>Decide what runs next.</b> Priorities and a backlog.</li>
</ul>'''
POINTS_ASPECTS = '''<ul class="points">
<li><b>One chat, one board.</b> Say what you want. The agent proposes, you press Do it.</li>
<li><b>Each card in its own sandbox.</b> A closed network, no credentials, deleted when the card is done.</li>
<li><b>On your servers.</b> Hosted models or your own. The source is published.</li>
</ul>'''
BAND = ('<div class="band"><p>Built for teams that cannot sign off a hosted coding agent: regulated industries, and '
        'companies where security and compliance decide the tool choice.</p></div>')
WHO = ('<p class="who">Built for teams that cannot sign off a hosted coding agent: regulated industries, and companies '
       'where security and compliance decide the tool choice.</p>')
BYLINE = ('<p class="byline">Designed and built by Sebastian Rücker, alone, in 2026 · '
          '<a href="https://sebastianruecker.com">Portfolio</a> · <a href="https://github.com/sebastianrueckerai">GitHub</a></p>')

CSS_COMMON = """
.btn.film { background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 600; cursor: pointer; }
.btn.film:hover, .btn.film:focus-visible { background: #7ddcee; color: var(--bg); }
.bigplay { position: absolute; z-index: 2; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column;
  align-items: center; gap: 12px; padding: 0; border: 0; background: none; color: var(--text); font: 600 16px var(--font-mono); cursor: pointer; }
.bigplay .ring { width: 96px; height: 96px; border-radius: 50%; border: 2px solid var(--accent); display: grid; place-items: center;
  font-size: 36px; padding-left: 6px; color: var(--accent); background: color-mix(in srgb, var(--bg) 80%, transparent); box-shadow: 0 8px 32px rgba(0,0,0,.65); }
.bigplay .lbl { padding: 6px 12px; background: color-mix(in srgb, var(--bg) 85%, transparent); }
.bigplay:hover .ring, .bigplay:focus-visible .ring { background: var(--accent); color: var(--bg); }
figure.plain .hero-stage video.film { position: static; }
.points { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 32px 0 0; padding: 0; list-style: none; }
.points li { border-top: 2px solid var(--accent); padding-top: 10px; color: var(--text-muted); font-size: 15px; line-height: 1.45; }
.points li.amber { border-color: var(--need); }
.points b { display: block; color: var(--text); font-size: 17px; margin-bottom: 2px; }
.byline { margin: 18px 0 0; font: 14px var(--font-mono); color: var(--text-faint); }
.byline a { color: var(--text-muted); }
.who { color: var(--text-muted); margin: 28px 0 0; max-width: 880px; }
.hero-split { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 40px; align-items: center; margin-top: 16px; }
.hero-split h1 { font-size: clamp(30px, 3.4vw, 44px); }
.hero-split .lede { font-size: 18px; margin-bottom: 22px; }
.hero-split .links { margin-bottom: 0; }
@media (max-width: 860px) { .hero-split { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .points { grid-template-columns: 1fr; gap: 14px; } .bigplay .ring { width: 72px; height: 72px; font-size: 28px; } }
"""
CSS_RHYTHM = {
    "C1": "section { padding: 112px 0 48px; } footer { margin-top: 96px; }",
    "C2": "section { padding: 96px 0 56px; } section + section { border-top: 1px solid var(--line); }",
    "C3": ("section { padding: 96px 0 72px; } section:nth-of-type(even) { background: var(--bg-panel); "
           "box-shadow: 0 0 0 100vmax var(--bg-panel); clip-path: inset(0 -100vmax); }"),
}
JS_PLAY = ('<script>document.querySelectorAll("[data-play]").forEach(b => b.addEventListener("click", '
           '() => document.querySelector("#play-film").click()));</script>')


def read_src():
    lines = SRC.read_text().split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith('<section id="hero"'))
    end = next(i for i in range(start, len(lines)) if lines[i] == "</section>")
    hero = lines[start:end + 1]
    svg = next(l for l in hero if l.startswith('<svg class="hero-annot"'))
    video = next(l for l in hero if l.startswith('<video id="film"'))
    return lines, start, end, svg, video


def hero_b(name, svg, video):
    frame_plain = f'<figure class="plain"><div class="hero-stage">{video}{BIGPLAY}</div></figure>'
    frame_callouts = f'<figure><div class="hero-stage">{svg}{video}{BIGPLAY}</div></figure>'
    if name == "B1":
        body = [EYEBROW, H1, LEDE, LINKS, frame_plain, POINTS_CONSOLE, BAND]
    elif name == "B2":
        body = ['<div class="hero-split"><div>', EYEBROW, H1, LEDE, LINKS, "</div>", frame_plain, "</div>", POINTS_CONSOLE, WHO]
    elif name == "B3":
        body = [EYEBROW, H1, LEDE, LINKS, frame_callouts, BAND]
    elif name == "B4":
        body = [EYEBROW, H1, LEDE, POINTS_ASPECTS, LINKS, frame_plain, WHO]
    elif name == "B5":
        body = [EYEBROW, H1, LEDE, LINKS, BYLINE, frame_plain, POINTS_CONSOLE, BAND]
    return ['<section id="hero" aria-labelledby="hero-h">'] + body + ["</section>"]


def build():
    CAND.mkdir(exist_ok=True)
    lines, start, end, svg, video = read_src()

    def finish(out_lines, css=""):
        html = "\n".join(out_lines)
        html = re.sub(r'(href|src|poster)="(assets/|site\.css|legal\.html|evidence\.html)', lambda m: f'{m.group(1)}="{SITE}{m.group(2)}', html)
        html = html.replace('document.querySelector("#hero .hero-annot");',
                            'document.querySelector("#hero .hero-annot") || document.createElement("div");')
        if css:
            html = html.replace("</head>", f"<style>{css}</style>\n</head>")
        return html.replace("</body>", JS_PLAY + "\n</body>")

    for name, line in LINES.items():
        out = list(lines)
        out[start:end + 1] = [re.sub(r"<h1 id=\"hero-h\">.*?</h1>", f'<h1 id="hero-h">{line}</h1>', l) for l in lines[start:end + 1]]
        (CAND / f"{name}.html").write_text(finish(out))
    for name in ["B1", "B2", "B3", "B4", "B5"]:
        out = lines[:start] + hero_b(name, svg, video) + lines[end + 1:]
        (CAND / f"{name}.html").write_text(finish(out, CSS_COMMON))
    for name, css in CSS_RHYTHM.items():
        (CAND / f"{name}.html").write_text(finish(list(lines), css))
    (CAND / "C0.html").write_text(finish(list(lines)))
    print("built", len(list(CAND.glob("*.html"))), "candidates")


PROBE = """<script>addEventListener("load",()=>{const r=e=>{if(!e)return null;const b=e.getBoundingClientRect();return{top:Math.round(b.top+scrollY),h:Math.round(b.height),w:Math.round(b.width)}};
const o={win:[innerWidth,innerHeight],docH:document.documentElement.scrollHeight,hero:r(document.querySelector('#hero')),h1:r(document.querySelector('h1')),
play:r(document.querySelector('#play-film')),filmBtn:r(document.querySelector('[data-play]')),video:r(document.querySelector('#film'))};
const p=document.createElement('pre');p.id='PROBE';p.textContent=JSON.stringify(o);document.body.appendChild(p);});</script>"""


def shoot_one(html_path, out_png, w, h):
    subprocess.run(CHROME + [f"--window-size={w},{h}", f"--screenshot={out_png}", html_path.resolve().as_uri()],
                   check=True, capture_output=True)


def probe_one(html_path, w, h):
    tmp = html_path.with_name(html_path.stem + "-probe.html")
    tmp.write_text(html_path.read_text().replace("</body>", PROBE + "</body>"))
    dom = subprocess.run(CHROME + [f"--window-size={w},{h}", "--dump-dom", tmp.resolve().as_uri()], capture_output=True, text=True).stdout
    tmp.unlink()
    m = re.search(r'<pre id="PROBE">(.*?)</pre>', dom, re.S)
    import html as h_
    return json.loads(h_.unescape(m.group(1)))


def shoot():
    SHOTS.mkdir(exist_ok=True)
    probes = {}
    for name in LINES:
        p = CAND / f"{name}.html"
        shoot_one(p, SHOTS / f"{name}-1440.png", 1440, 900)
        shoot_one(p, SHOTS / f"{name}-390.png", 390, 1200)
        probes[name] = {"1440": probe_one(p, 1440, 900), "390": probe_one(p, 390, 1200)}
    for name in ["B1", "B2", "B3", "B4", "B5"]:
        p = CAND / f"{name}.html"
        shoot_one(p, SHOTS / f"{name}-fold-1440x900.png", 1440, 900)
        shoot_one(p, SHOTS / f"{name}-fold-1366x768.png", 1366, 768)
        shoot_one(p, SHOTS / f"{name}-fold-1920x1080.png", 1920, 1080)
        shoot_one(p, SHOTS / f"{name}-390.png", 390, 3000)
        shoot_one(p, SHOTS / f"{name}-full-1440.png", 1440, 9000)
        probes[name] = {s: probe_one(p, *map(int, s.split("x"))) for s in ["1440x900", "1366x768", "1920x1080", "390x800"]}
    for name in ["C0", "C1", "C2", "C3"]:
        p = CAND / f"{name}.html"
        shoot_one(p, SHOTS / f"{name}-full-1440.png", 1440, 9500)
        probes[name] = {"1440": probe_one(p, 1440, 900)}
    (HERE / "probes.json").write_text(json.dumps(probes, indent=1))
    print("shot", len(list(SHOTS.glob("*.png"))), "images")


def font(size):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
    except OSError:
        return ImageFont.load_default()


def label(im, text, size=26):
    d = ImageDraw.Draw(im)
    f = font(size)
    tw = d.textlength(text, font=f)
    d.rectangle([0, 0, tw + 20, size + 14], fill=(200, 0, 0))
    d.text((10, 6), text, fill=(255, 255, 255), font=f)
    return im


def stack(images, cols, gap=16, bg=(40, 40, 40)):
    w = max(i.width for i in images); h = max(i.height for i in images)
    rows = -(-len(images) // cols)
    sheet = Image.new("RGB", (cols * w + (cols + 1) * gap, rows * h + (rows + 1) * gap), bg)
    for k, im in enumerate(images):
        sheet.paste(im, (gap + (k % cols) * (w + gap), gap + (k // cols) * (h + gap)))
    return sheet


def sheets():
    probes = json.loads((HERE / "probes.json").read_text())
    desk, phone = [], []
    for name, line in LINES.items():
        words = len(line.split())
        l1440 = round(probes[name]["1440"]["h1"]["h"] / 58.24); l390 = round(probes[name]["390"]["h1"]["h"] / 33.6)
        im = Image.open(SHOTS / f"{name}-1440.png").crop((0, 43, 1440, 500))
        desk.append(label(im, f"{name} · {words} words · {l1440} lines at 1440, {l390} at 390"))
        im = Image.open(SHOTS / f"{name}-390.png").crop((0, 0, 390, 640))
        phone.append(label(im, f"{name}", 22))
    stack(desk[:6], 1).save(SHOTS / "sheet-A-1440-1.png"); stack(desk[6:], 1).save(SHOTS / "sheet-A-1440-2.png")
    stack(phone, 4).save(SHOTS / "sheet-A-390.png")
    folds1366, phones = [], []
    for name in ["B1", "B2", "B3", "B4", "B5"]:
        for size in ["1440x900", "1366x768", "1920x1080"]:
            im = Image.open(SHOTS / f"{name}-fold-{size}.png")
            label(im, f"{name} · first screen at {size}").save(SHOTS / f"{name}-fold-{size}.png")
        folds1366.append(Image.open(SHOTS / f"{name}-fold-1366x768.png"))
        im = Image.open(SHOTS / f"{name}-390.png").crop((0, 0, 390, 2200))
        phones.append(label(im, name, 22))
    stack(folds1366, 2).save(SHOTS / "sheet-B-1366.png")
    stack(phones, 5).save(SHOTS / "sheet-B-390.png")
    fulls = []
    for name in ["C0", "C1", "C2", "C3"]:
        im = Image.open(SHOTS / f"{name}-full-1440.png")
        doc_h = probes[name]["1440"]["docH"]
        im = im.crop((0, 0, 1440, min(doc_h, im.height)))
        s = 3000 / im.height
        im = im.resize((int(1440 * s), 3000))
        fulls.append(label(im, f"{name} · {doc_h} px tall", 22))
    stack(fulls, 4).save(SHOTS / "sheet-C-full.png")
    for name in ["B1", "B2", "B4", "B5"]:
        im = Image.open(SHOTS / f"{name}-full-1440.png"); im = im.crop((0, 0, 1440, probes[name]["1440x900"]["docH"]))
        s = 3000 / im.height; im.resize((int(1440 * s), 3000)).save(SHOTS / f"{name}-full-small.png")
    print("sheets written")


FINAL = {
    "F1": ("Write the roadmap. Agents build it on your servers.",
           "Each card is built in its own sandbox. Nothing merges until the checks pass. You run it all from one chat and one board."),
    "F2": ("Your roadmap in. Checked code out. Everything between on your servers.",
           "Write a roadmap. Agents build it card by card, each in its own sandbox. Nothing merges until the checks pass."),
    "F3": ("AI writes the code. Your servers run it. Checks decide what merges.",
           "Write a roadmap. Agents build it card by card, each in its own sandbox. You run it all from one chat and one board."),
}
SANDBOX_H2 = '<h2 id="sandbox-h">The worst an agent can do is wreck its own sandbox.</h2>'
FOOTER = ('<footer><p>Designed and built by Sebastian Rücker, alone, in 2026 · <a href="https://sebastianruecker.com">Portfolio</a> · '
          '<a href="https://github.com/sebastianrueckerai">GitHub</a></p>'
          '<p><a href="legal.html#imprint">Imprint</a> · <a href="legal.html#privacy">Privacy</a></p></footer>')


def build_final():
    """The finalists: the B1 arrangement, the C3 rhythm, the sandbox line as the sandbox section's title, a byline in the footer."""
    lines, start, end, svg, video = read_src()
    for name, (line, lede) in FINAL.items():
        hero = hero_b("B1", svg, video)
        hero = [l.replace(H1, f'<h1 id="hero-h">{line}</h1>').replace(LEDE, f'<p class="lede">{lede}</p>') for l in hero]
        out = lines[:start] + hero + lines[end + 1:]
        out = [SANDBOX_H2 if l == '<h2 id="sandbox-h">What the agent can reach</h2>' else l for l in out]
        out = [FOOTER if l.startswith("<footer>") else l for l in out]
        html = "\n".join(out)
        html = re.sub(r'(href|src|poster)="(assets/|site\.css|legal\.html|evidence\.html)', lambda m: f'{m.group(1)}="{SITE}{m.group(2)}', html)
        html = html.replace('document.querySelector("#hero .hero-annot");',
                            'document.querySelector("#hero .hero-annot") || document.createElement("div");')
        html = html.replace("</head>", f"<style>{CSS_COMMON}\n{CSS_RHYTHM['C3']}\n#hero {{ padding-top: 64px; }}</style>\n</head>").replace("</body>", JS_PLAY + "\n</body>")
        (CAND / f"{name}.html").write_text(html)
    print("built", len(FINAL), "finalists")


def shoot_final():
    probes = json.loads((HERE / "probes.json").read_text())
    for name in FINAL:
        p = CAND / f"{name}.html"
        for size in ["1440x900", "1366x768", "1920x1080"]:
            w, h = map(int, size.split("x"))
            shoot_one(p, SHOTS / f"{name}-fold-{size}.png", w, h)
            label(Image.open(SHOTS / f"{name}-fold-{size}.png"), f"{name} · first screen at {size}").save(SHOTS / f"{name}-fold-{size}.png")
        shoot_one(p, SHOTS / f"{name}-full-1440.png", 1440, 9500)
        probes[name] = {s: probe_one(p, *map(int, s.split("x"))) for s in ["1440x900", "1366x768", "1920x1080"]}
        im = Image.open(SHOTS / f"{name}-full-1440.png").crop((0, 0, 1440, probes[name]["1440x900"]["docH"]))
        s = 3000 / im.height
        label(im.resize((int(1440 * s), 3000)), f"{name} · {probes[name]['1440x900']['docH']} px tall", 22).save(SHOTS / f"{name}-full-small.png")
    (HERE / "probes.json").write_text(json.dumps(probes, indent=1))
    print("shot finalists")


def phone(names):
    """Phone shots at a true 390 px viewport through Playwright (phone.js). Headless Chrome floors its window at 500 px wide."""
    import os
    env = dict(os.environ, NODE_PATH="/tmp/claude-1000/pw/node_modules", PLAYWRIGHT_BROWSERS_PATH=str(Path.home() / ".cache/ms-playwright"))
    subprocess.run(["node", str(HERE / "phone.js"), str(SHOTS)] + [str(CAND / f"{n}.html") for n in names], check=True, env=env)
    probes = json.loads((HERE / "probes.json").read_text())
    for name, o in json.loads((SHOTS / "phone-probes.json").read_text()).items():
        assert o["win"][0] == 390, (name, o["win"])
        probes.setdefault(name, {})["390x800"] = o
    (SHOTS / "phone-probes.json").unlink()
    (HERE / "probes.json").write_text(json.dumps(probes, indent=1))
    print("phone shots for", len(names))


def sheets_phone():
    probes = json.loads((HERE / "probes.json").read_text())
    ph = []
    for name, line in LINES.items():
        l390 = round(probes[name]["390x800"]["h1"]["h"] / 33.6)
        ph.append(label(Image.open(SHOTS / f"{name}-390.png").crop((0, 0, 390, 640)), f"{name} · {l390} lines", 20))
    stack(ph, 4).save(SHOTS / "sheet-A-390.png")
    stack([label(Image.open(SHOTS / f"{n}-390.png").crop((0, 0, 390, 2200)), n, 22) for n in ["B1", "B2", "B3", "B4", "B5"]], 5).save(SHOTS / "sheet-B-390.png")
    stack([label(Image.open(SHOTS / f"{n}-390.png").crop((0, 0, 390, 2200)), n, 22) for n in ["C0"] + list(FINAL)], 4).save(SHOTS / "sheet-F-390.png")
    print("phone sheets written")


def sheets_final():
    probes = json.loads((HERE / "probes.json").read_text())
    stack([Image.open(SHOTS / f"{n}-fold-1366x768.png") for n in FINAL], 3).save(SHOTS / "sheet-F-1366.png")
    c0 = Image.open(SHOTS / "C0-full-1440.png").crop((0, 0, 1440, probes["C0"]["1440"]["docH"]))
    s = 3000 / c0.height
    c0 = label(c0.resize((int(1440 * s), 3000)), f"C0 live · {probes['C0']['1440']['docH']} px tall", 22)
    stack([c0, Image.open(SHOTS / "F1-full-small.png")], 2).save(SHOTS / "sheet-F-full.png")
    print("finalist sheets written")


R_H1 = '<h1 id="hero-h">Write the roadmap. Agents build it on your servers.</h1>'
R_LEDE = ('<p class="lede">The worst an agent can do is wreck its own sandbox. Nothing merges until the checks pass. '
          'You run it all from one chat and one board.</p>')
R_BY = ('<p class="cap hero-by">Designed and built by Sebastian Rücker · <a href="https://sebastianruecker.com">Portfolio</a> · '
        '<a href="https://github.com/sebastianrueckerai">GitHub</a></p>')
CSS_R = """
.hero-by { margin: -12px 0 22px; }
.bigplay { top: 45%; }
.points.sq li { border-top: 0; padding: 0 0 0 18px; position: relative; }
.points.sq li::before { content: ""; position: absolute; left: 0; top: 7px; width: 8px; height: 8px; background: var(--accent); }
#hero { padding-top: 64px; }
"""


def build_r():
    """The recommendation: B1's arrangement, B4's three points under the frame, A01 with the sandbox line opening the lede,
    a byline under the buttons and in the footer, C3's rhythm. Built after the two loops; not judged by the critics."""
    lines, start, end, svg, video = read_src()
    frame = f'<figure class="plain"><div class="hero-stage">{video}{BIGPLAY}</div></figure>'
    hero = ['<section id="hero" aria-labelledby="hero-h">', EYEBROW, R_H1, R_LEDE, LINKS, R_BY, frame,
            POINTS_ASPECTS.replace('<ul class="points">', '<ul class="points sq">'), BAND, "</section>"]
    out = lines[:start] + hero + lines[end + 1:]
    out = [FOOTER if l.startswith("<footer>") else l for l in out]
    html = "\n".join(out)
    html = re.sub(r'(href|src|poster)="(assets/|site\.css|legal\.html|evidence\.html)', lambda m: f'{m.group(1)}="{SITE}{m.group(2)}', html)
    html = html.replace('document.querySelector("#hero .hero-annot");',
                        'document.querySelector("#hero .hero-annot") || document.createElement("div");')
    html = html.replace("</head>", f"<style>{CSS_COMMON}\n{CSS_RHYTHM['C3']}\n{CSS_R}</style>\n</head>").replace("</body>", JS_PLAY + "\n</body>")
    (CAND / "R1.html").write_text(html)
    probes = json.loads((HERE / "probes.json").read_text())
    p = CAND / "R1.html"
    for size in ["1440x900", "1366x768", "1920x1080"]:
        w, h = map(int, size.split("x"))
        shoot_one(p, SHOTS / f"R1-fold-{size}.png", w, h)
        label(Image.open(SHOTS / f"R1-fold-{size}.png"), f"R1 · the recommendation · first screen at {size}").save(SHOTS / f"R1-fold-{size}.png")
    shoot_one(p, SHOTS / "R1-full-1440.png", 1440, 9500)
    probes["R1"] = {s: probe_one(p, *map(int, s.split("x"))) for s in ["1440x900", "1366x768", "1920x1080"]}
    (HERE / "probes.json").write_text(json.dumps(probes, indent=1))
    phone(["R1"])
    probes = json.loads((HERE / "probes.json").read_text())
    im = Image.open(SHOTS / "R1-full-1440.png").crop((0, 0, 1440, probes["R1"]["1440x900"]["docH"]))
    s = 3000 / im.height
    label(im.resize((int(1440 * s), 3000)), f"R1 · {probes['R1']['1440x900']['docH']} px tall", 22).save(SHOTS / "R1-full-small.png")
    c0 = Image.open(SHOTS / "C0-full-1440.png").crop((0, 0, 1440, probes["C0"]["1440"]["docH"]))
    s = 3000 / c0.height
    c0 = label(c0.resize((int(1440 * s), 3000)), f"C0 · the live page · {probes['C0']['1440']['docH']} px tall", 22)
    stack([Image.open(SHOTS / "C0-fold-1440x900.png"), Image.open(SHOTS / "R1-fold-1440x900.png")], 2).save(SHOTS / "sheet-R-fold.png")
    stack([c0, Image.open(SHOTS / "R1-full-small.png")], 2).save(SHOTS / "sheet-R-full.png")
    stack([label(Image.open(SHOTS / "C0-390.png").crop((0, 0, 390, 2200)), "C0 · live", 22),
           label(Image.open(SHOTS / "R1-390.png").crop((0, 0, 390, 2200)), "R1", 22)], 2).save(SHOTS / "sheet-R-390.png")
    print("recommendation built and shot")


if __name__ == "__main__":
    steps = sys.argv[1:] or ["build", "shoot", "sheets"]
    for s in steps:
        {"build": build, "shoot": shoot, "sheets": sheets, "final": build_final, "shoot-final": shoot_final,
         "phone": lambda: phone(list(LINES) + ["B1", "B2", "B3", "B4", "B5", "C0"] + list(FINAL)), "sheets-phone": sheets_phone, "sheets-final": sheets_final, "recommend": build_r}[s]()
