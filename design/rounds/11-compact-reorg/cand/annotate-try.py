import json
from PIL import Image, ImageDraw, ImageFont

cand = "design/rounds/11-compact-reorg/cand/"
RED = (255, 77, 77)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)

def mark(im, d, rect, n, label_pos):
    x, y, w, h = rect["x"], rect["y"], rect["w"], rect["h"]
    pad = 10
    d.ellipse([x - pad, y - pad, x + w + pad, y + h + pad], outline=RED, width=4)
    lx, ly = label_pos
    d.text((lx, ly), str(n), font=font, fill=RED)

def load(name):
    return json.load(open(cand + name))

# A, rest: 1 toggle, 2 divider grip, 3 chips, 4 a card, 5 intake, 6 input sizer
r = load("rects-a-rest.json")
im = Image.open(cand + "try-a-rest.png").convert("RGB")
d = ImageDraw.Draw(im)
mid = r["#chat-divider"]
grip = {"x": mid["x"] - 4, "y": mid["y"] + mid["h"] // 2 - 20, "w": mid["w"] + 8, "h": 40}
mark(im, d, r["#chat-full"], 1, (150, 196))
mark(im, d, grip, 2, (340, mid["y"] + mid["h"] // 2 - 66))
mark(im, d, r[".chiprow"], 3, (742, 92))
mark(im, d, r["article.need"], 4, (r["article.need"]["x"] + 6, r["article.need"]["y"] - 56))
mark(im, d, r["#intake-btn"], 5, (232, 186))
bar = r["#chat-form .growbar"]
sizer = {"x": bar["x"] + bar["w"] // 2 - 15, "y": bar["y"] + 5 - 9, "w": 30, "h": 18}
mark(im, d, sizer, 6, (sizer["x"] + 46, sizer["y"] - 12))
im.save(cand + "try-a-annotated.png")

# A, drawer: 1 tabs, 2 close
r = load("rects-a-drawer.json")
im = Image.open(cand + "try-a-drawer.png").convert("RGB")
d = ImageDraw.Draw(im)
mark(im, d, r["#drawer .tabs"], 1, (r["#drawer .tabs"]["x"] - 60, r["#drawer .tabs"]["y"] - 52))
mark(im, d, r["#drawer-close"], 2, (r["#drawer-close"]["x"] - 4, r["#drawer-close"]["y"] - 66))
im.save(cand + "try-a-drawer-annotated.png")

# B, rest: 1 tabs, 2 toggle, 3 divider
r = load("rects-b-rest.json")
im = Image.open(cand + "try-b-rest.png").convert("RGB")
d = ImageDraw.Draw(im)
mid = r["#chat-divider"]
grip = {"x": mid["x"] - 4, "y": mid["y"] + mid["h"] // 2 - 20, "w": mid["w"] + 8, "h": 40}
mark(im, d, r[".ctabs"], 1, (60, r[".ctabs"]["y"] - 58))
mark(im, d, r["#chat-full"], 2, (150, r["#chat-full"]["y"] - 62))
mark(im, d, grip, 3, (340, mid["y"] + mid["h"] // 2 - 66))
im.save(cand + "try-b-annotated.png")
print("annotated 3")
