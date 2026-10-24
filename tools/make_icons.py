# アイコン（オレンジ地に白の Ñ）を作る。python tools/make_icons.py
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "icons"
OUT.mkdir(exist_ok=True)
FONT = "C:/Windows/Fonts/segoeuib.ttf"

for name, size in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
    img = Image.new("RGB", (size, size), "#e8a33d")
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, int(size * 0.62))
    box = d.textbbox((0, 0), "Ñ", font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), "Ñ", font=font, fill="white")
    img.save(OUT / name)
    print(name)
