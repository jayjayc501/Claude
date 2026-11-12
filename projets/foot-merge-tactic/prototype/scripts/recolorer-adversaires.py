# Fabrique les figurines de l'équipe adverse : bustes de la maquette (maillots
# bleus ou verts) recolorés en rouge et retournés en miroir. Images de
# référence pour le prototype, pas les visuels du jeu.
# Lancer : python3 scripts/recolorer-adversaires.py (depuis prototype/)
import colorsys, os
from PIL import Image, ImageOps

SOURCE = "../docs/maquette-interface/bustes"
SORTIE = "src/images/adversaires"
# Bustes aux maillots bleu marine (France), vert (Brésil), bleu clair (Italie) :
# leur teinte est loin de celle de la peau, le recoloriage ne touche que le maillot.
BUSTES = ["MO", "AM", "CB", "EL", "DK", "MV", "JM", "TR", "KM", "BL", "HF"]

def rougir(im):
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            deg = h * 360
            if 90 <= deg <= 260 and s > 0.28 and v > 0.12:  # vert, bleu clair, bleu marine
                nh = 358 / 360
                ns = min(1, s * 1.05 + 0.1)
                nv = min(1, v * 1.15 + 0.05)
                rr, gg, bb = colorsys.hsv_to_rgb(nh, ns, nv)
                px[x, y] = (int(rr * 255), int(gg * 255), int(bb * 255), a)
    return ImageOps.mirror(im)

os.makedirs(SORTIE, exist_ok=True)
for k in BUSTES:
    rougir(Image.open(f"{SOURCE}/bust-{k}.png")).save(f"{SORTIE}/rouge-{k}.png", optimize=True)
print("fait :", len(BUSTES), "figurines")
