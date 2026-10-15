#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "pillow", "fal-client"]
# ///
"""Image pipeline: generate, critique, montage, sheet, cost. Run from the repo root."""

import argparse
import base64
import datetime as dt
import html
import io
import json
import mimetypes
import os
import sys
from pathlib import Path

import httpx
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CAP_USD = 100.0

# Estimated USD per output image. fal prices some models in opaque "units", so those are cautious guesses.
PRICES = {
    "ideogram/v4": 0.09,
    "blackforestlabs/flux-3/text-to-image": 0.05,
    "blackforestlabs/flux-3/edit-image": 0.05,
    "google/nano-banana-2.1": 0.15,
    "google/nano-banana-2.1/edit": 0.15,
    "alibaba/qwen-image-3/text-to-image": 0.04,
    "alibaba/qwen-image-3/edit": 0.04,
    "recraft/v4.1/flash/text-to-image": 0.007,
    "openai/gpt-image-2.5/flare/text-to-image": 0.25,
    "openai/gpt-image-2.5/flare/edit": 0.25,
    "fal-ai/birefnet/v2": 0.01,
}
UNKNOWN_PRICE = 0.30
CRITIC_PRICE = 0.03

CRITICS = {
    "glm": ("https://api.z.ai/api/paas/v4/chat/completions", "ZAI_KEY", "glm-5v-turbo"),
    "qwen": ("https://api.groq.com/openai/v1/chat/completions", "GROQ_KEY", "qwen/qwen3.8-27b"),
}
# Vision LLMs routed through fal's any-llm endpoint, paid with the fal key.
FAL_CRITICS = {
    "gemini": "google/gemini-2.5-pro",
    "gpt5": "openai/gpt-5-chat",
}


def load_env():
    env = ROOT / ".env.tools"
    if not env.exists():
        sys.exit(f"missing {env}: provider keys live there")
    for line in env.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip().strip('"')


def spent():
    total = 0.0
    for p in list((ROOT / "design").rglob("*.json")) + list((ROOT / "sites").rglob("*.json")):
        try:
            d = json.loads(p.read_text())
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if isinstance(d, dict) and "est_cost_usd" in d:
            total += d["est_cost_usd"]
    return total


def check_cap(extra):
    total = spent()
    if total + extra > CAP_USD:
        sys.exit(f"cap: spent ~${total:.2f}, this call ~${extra:.2f}, cap ${CAP_USD:.2f}")


def data_uri(path, max_side=None, fmt=None):
    path = Path(path)
    if max_side or fmt:
        im = Image.open(path)
        im.thumbnail((max_side or 99999, max_side or 99999))
        buf = io.BytesIO()
        fmt = fmt or "PNG"
        (im.convert("RGB") if fmt == "JPEG" else im).save(buf, fmt, quality=85)
        mime, raw = f"image/{fmt.lower()}", buf.getvalue()
    else:
        mime, raw = mimetypes.guess_type(path)[0] or "image/png", path.read_bytes()
    return f"data:{mime};base64,{base64.b64encode(raw).decode()}"


def parse_params(pairs):
    out = {}
    for p in pairs or []:
        k, v = p.split("=", 1)
        try:
            out[k] = json.loads(v)
        except json.JSONDecodeError:
            out[k] = v
    return out


def cmd_gen(a):
    load_env()
    prompt = Path(a.prompt_file).read_text().strip() if a.prompt_file else a.prompt
    params = parse_params(a.param)
    n = int(params.get("num_images", 1))
    est = a.est if a.est is not None else PRICES.get(a.model, UNKNOWN_PRICE) * n
    check_cap(est)
    body = {"prompt": prompt, **params}
    if a.video:
        import fal_client
        body["video_url"] = fal_client.upload_file(a.video)
    if a.ref:
        key = "image_url" if a.model.startswith("fal-ai/birefnet") else "image_urls"
        uris = [data_uri(r, max_side=2048) for r in a.ref]
        body[key] = uris[0] if key == "image_url" else uris
        if key == "image_url":
            body.pop("prompt")
    r = httpx.post(f"https://fal.run/{a.model}", json=body,
                   headers={"Authorization": f"Key {os.environ['FAL_KEY']}"}, timeout=600)
    if r.status_code != 200:
        sys.exit(f"fal {r.status_code}: {r.text[:500]}")
    res = r.json()
    imgs = res.get("images") or ([res["image"]] if res.get("image") else []) or ([res["video"]] if res.get("video") else [])
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    saved = []
    for i, im in enumerate(imgs):
        p = out if len(imgs) == 1 else out.with_stem(f"{out.stem}-{i + 1}")
        url = im["url"]
        raw = base64.b64decode(url.split(",", 1)[1]) if url.startswith("data:") else httpx.get(url, timeout=120).content
        p.write_bytes(raw)
        saved.append(p)
    meta = {
        "model": a.model,
        "prompt": prompt,
        "refs": [str(Path(r).resolve().relative_to(ROOT)) if Path(r).resolve().is_relative_to(ROOT) else r for r in a.ref or []],
        "video": a.video,
        "params": params,
        "seed": res.get("seed"),
        "description": res.get("description"),
        "label": a.label,
        "est_cost_usd": est,
        "created": dt.datetime.now().isoformat(timespec="seconds"),
        "outputs": [p.name for p in saved],
    }
    out.with_suffix(".json").write_text(json.dumps(meta, indent=2))
    for p in saved:
        print(p)
    print(f"~${est:.3f}, total ~${spent():.2f}")


def cmd_critique(a):
    load_env()
    check_cap(CRITIC_PRICE)
    text = Path(a.prompt_file).read_text()
    uris = [data_uri(p, max_side=a.max_side, fmt="JPEG") for p in a.images]
    if a.critic in FAL_CRITICS:
        model = FAL_CRITICS[a.critic]
        body = {"model": model, "prompt": text, "image_urls": uris, "max_tokens": a.max_tokens, "reasoning": True}
        r = httpx.post("https://fal.run/fal-ai/any-llm/vision", json=body,
                       headers={"Authorization": f"Key {os.environ['FAL_KEY']}"}, timeout=600)
        if r.status_code != 200:
            sys.exit(f"{a.critic} {r.status_code}: {r.text[:500]}")
        answer = r.json().get("output") or ""
    else:
        url, keyname, model = CRITICS[a.critic]
        content = [{"type": "image_url", "image_url": {"url": u}} for u in uris]
        content.append({"type": "text", "text": text})
        body = {"model": model, "messages": [{"role": "user", "content": content}], "max_tokens": a.max_tokens}
        if a.critic == "qwen":
            body["reasoning_effort"] = "default"
        r = httpx.post(url, json=body, headers={"Authorization": f"Bearer {os.environ[keyname]}"}, timeout=600)
        if r.status_code != 200:
            sys.exit(f"{a.critic} {r.status_code}: {r.text[:500]}")
        answer = r.json()["choices"][0]["message"].get("content") or ""
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "critic": model,
        "images": [str(Path(p).resolve().relative_to(ROOT)) if Path(p).resolve().is_relative_to(ROOT) else str(p) for p in a.images],
        "prompt": text,
        "answer": answer,
        "est_cost_usd": CRITIC_PRICE,
        "created": dt.datetime.now().isoformat(timespec="seconds"),
    }, indent=2))
    print(answer)


def font(size):
    for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def cmd_montage(a):
    cell, cols = a.cell, a.cols
    tiles = []
    for p in a.images:
        im = Image.open(p).convert("RGB")
        im.thumbnail((cell, cell))
        tiles.append((Path(p).stem, im))
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    pad, lab = 12, 34
    heights = [max(im.height for _, im in r) for r in rows]
    W = cols * (cell + pad) + pad
    H = sum(h + lab + pad for h in heights) + pad
    sheet = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    f = font(22)
    y = pad
    for r, (row, h) in enumerate(zip(rows, heights)):
        for c, (name, im) in enumerate(row):
            i = r * cols + c
            x = pad + c * (cell + pad)
            d.text((x, y), a.labels[i] if a.labels else name, fill=(200, 0, 0), font=f)
            sheet.paste(im, (x + (cell - im.width) // 2, y + lab))
        y += h + lab + pad
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out, quality=88)
    print(a.out)


def cmd_sheet(a):
    rd = Path(a.round)
    metas = sorted(p for p in rd.glob("*.json") if "est_cost_usd" in json.loads(p.read_text()) and "model" in json.loads(p.read_text()))
    critiques = sorted((rd / "critique").glob("*.json")) if (rd / "critique").exists() else []
    notes = (rd / "notes.md").read_text() if (rd / "notes.md").exists() else ""
    groups = {}
    for p in metas:
        m = json.loads(p.read_text())
        groups.setdefault(m.get("label") or p.stem, []).append((p, m))
    cards = []
    for label, items in groups.items():
        imgs = "".join(
            f'<a href="{html.escape(o)}"><img loading="lazy" src="{html.escape(o)}" alt=""></a>'
            for _, m in items for o in m["outputs"])
        prompts = "".join(
            f'<details><summary>{html.escape(m["model"])} · ~${m["est_cost_usd"]:.2f}</summary><pre>{html.escape(m["prompt"])}</pre></details>'
            for _, m in items)
        cards.append(f'<section><h2>{html.escape(label)}</h2><div class="imgs">{imgs}</div>{prompts}</section>')
    crit = "".join(
        f'<details><summary>{html.escape(c.stem)} ({html.escape(json.loads(c.read_text())["critic"])})</summary><pre>{html.escape(json.loads(c.read_text())["answer"])}</pre></details>'
        for c in critiques)
    total = sum(json.loads(p.read_text())["est_cost_usd"] for p in rd.rglob("*.json") if "est_cost_usd" in json.loads(p.read_text()))
    page = f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(rd.name)}</title>
<style>
body{{font:15px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#f4f4f2;color:#111}}
h1{{margin:0 0 4px}} .meta{{color:#666;margin-bottom:24px}}
main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:24px}}
section{{background:#fff;padding:16px;border-radius:6px}} h2{{margin:0 0 12px;font-size:18px}}
.imgs{{display:flex;gap:8px;align-items:flex-start}} .imgs a{{flex:1}} .imgs img{{width:100%;display:block;border:1px solid #ddd}}
pre{{white-space:pre-wrap;font-size:12px;background:#f7f7f7;padding:8px}} details{{margin-top:8px}}
.notes,.crit{{background:#fff;padding:16px;margin-bottom:24px;border-radius:6px}}
</style>
<h1>{html.escape(rd.name)}</h1><div class="meta">{sum(len(m['outputs']) for i in groups.values() for _, m in i)} images · ~${total:.2f}</div>
{f'<div class="notes"><pre>{html.escape(notes)}</pre></div>' if notes else ''}
<main>{''.join(cards)}</main>
{f'<h2>Critiques</h2><div class="crit">{crit}</div>' if crit else ''}
"""
    (rd / "index.html").write_text(page)
    print(rd / "index.html")


def cmd_cost(a):
    print(f"~${spent():.2f} of ${CAP_USD:.2f}")


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    g = sp.add_parser("gen")
    g.add_argument("--model", required=True)
    g.add_argument("--prompt")
    g.add_argument("--prompt-file")
    g.add_argument("--ref", action="append")
    g.add_argument("--param", action="append", help="key=value, value parsed as JSON when possible")
    g.add_argument("--video", help="local video file, uploaded to fal storage and passed as video_url")
    g.add_argument("--est", type=float, help="estimated cost in USD, overrides the price list")
    g.add_argument("--label")
    g.add_argument("--out", required=True)
    g.set_defaults(f=cmd_gen)
    c = sp.add_parser("critique")
    c.add_argument("--critic", choices=list(CRITICS) + list(FAL_CRITICS), default="gemini")
    c.add_argument("--prompt-file", required=True)
    c.add_argument("--images", nargs="+", required=True)
    c.add_argument("--max-side", type=int, default=1280)
    c.add_argument("--max-tokens", type=int, default=8000)
    c.add_argument("--out", required=True)
    c.set_defaults(f=cmd_critique)
    m = sp.add_parser("montage")
    m.add_argument("--images", nargs="+", required=True)
    m.add_argument("--labels", nargs="*")
    m.add_argument("--cols", type=int, default=4)
    m.add_argument("--cell", type=int, default=480)
    m.add_argument("--out", required=True)
    m.set_defaults(f=cmd_montage)
    s = sp.add_parser("sheet")
    s.add_argument("round")
    s.set_defaults(f=cmd_sheet)
    sp.add_parser("cost").set_defaults(f=cmd_cost)
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
