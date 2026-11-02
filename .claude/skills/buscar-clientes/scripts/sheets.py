"""Arma hojas de contacto (12 capturas por imagen) para revisar a ojo los sitios.

Uso: python3 sheets.py preseleccion.json carpeta_capturas carpeta_hojas
"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
rows = json.load(open(sys.argv[1])); shotdir, outdir = sys.argv[2], sys.argv[3]
os.makedirs(outdir, exist_ok=True)
TW, TH, LH, COLS, ROWS = 480, 300, 22, 4, 3
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
except Exception: font = ImageFont.load_default()
items = [(i, r) for i, r in enumerate(rows) if os.path.exists(f"{shotdir}/{i:03d}d.jpg")]
per = COLS * ROWS
for s in range(0, len(items), per):
    sheet = Image.new("RGB", (COLS * TW, ROWS * (TH + LH)), "white"); d = ImageDraw.Draw(sheet)
    for k, (i, r) in enumerate(items[s:s + per]):
        x, y = (k % COLS) * TW, (k // COLS) * (TH + LH)
        im = Image.open(f"{shotdir}/{i:03d}d.jpg").resize((TW - 4, TH))
        sheet.paste(im, (x + 2, y + LH))
        d.text((x + 4, y + 3), f"#{i} [{r['score']}] {r['name'][:38]}", fill="black", font=font)
    sheet.save(f"{outdir}/sheet{s // per:02d}.jpg", quality=70)
print(len(items), "tiles")
