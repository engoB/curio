# -*- coding: utf-8 -*-
"""Fabrique les icones de Curio pour l'ecran d'accueil.
   Un C serif sur un fond d'encre : lisible a 48 px comme a 512."""
from PIL import Image, ImageDraw, ImageFont
import os

INK  = (8, 11, 17)
ACC  = (78, 203, 185)
HALO = (18, 32, 44)

def police(taille):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
              '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
              '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, taille)
    return ImageFont.load_default()

def icone(n, marge=0.0):
    im = Image.new('RGB', (n, n), INK)
    d  = ImageDraw.Draw(im)
    # halo radial discret, dessine du plus large au plus etroit
    cx, cy, r = n * 0.5, n * 0.44, n * 0.64
    pas = max(1, n // 200)
    for i in range(int(r), 0, -pas):
        t = 1 - i / r
        c = tuple(int(INK[k] + (HALO[k] - INK[k]) * (t ** 2.2)) for k in range(3))
        d.ellipse([cx - i, cy - i, cx + i, cy + i], fill=c)
    # anneau
    ep = max(2, int(n * 0.013))
    ra = n * (0.40 - marge * 0.5)
    d.ellipse([cx - ra, cy - ra, cx + ra, cy + ra],
              outline=(ACC[0] // 3, ACC[1] // 3, ACC[2] // 3), width=ep)
    # la lettre
    f = police(int(n * (0.56 - marge)))
    bb = d.textbbox((0, 0), 'C', font=f)
    d.text((cx - (bb[0] + bb[2]) / 2, cy - (bb[1] + bb[3]) / 2), 'C', font=f, fill=ACC)
    return im

os.makedirs('icones', exist_ok=True)
for n in (180, 192, 512):
    icone(n).save('icones/curio-%d.png' % n, optimize=True)
# version « maskable » : le motif tient dans le cercle de securite
icone(512, marge=0.10).save('icones/curio-512-maskable.png', optimize=True)
print('icones ecrites :', sorted(os.listdir('icones')))
