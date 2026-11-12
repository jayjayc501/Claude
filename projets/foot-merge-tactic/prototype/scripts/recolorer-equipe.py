# Fabrique les figurines de ton équipe pour le match : maillots des pays
# (bleu marine, orange, vert, bleu clair) recolorés au bleu de l'équipe, comme
# l'adversaire est en rouge (12/11 : « l'adversaire est en rouge, moi je
# devrais être en bleu »). Les couleurs de pays restent sur la préparation.
# Lancer : python3 scripts/recolorer-equipe.py (depuis prototype/)
import colorsys, glob, os
from PIL import Image

SOURCE = "../docs/maquette-interface/bustes"
SORTIE = "src/images/equipe-bleue"
TEINTE_BLEU = 220 / 360

ESPAGNE = {"IS", "RC", "PA", "AS", "DA"}  # maillots orange
# Bas de la tête (fraction de la hauteur), d'après TETES (src/ui/bustes.ts) :
# l'orange n'est recoloré qu'en dessous, pour ne pas toucher les visages mats.
BAS_TETE = {"IS": 0.57, "RC": 0.71, "PA": 0.47, "AS": 0.5, "DA": 0.63}

def est_maillot(deg, s, v, orange):
    if 90 <= deg <= 260 and s > 0.38 and v > 0.2:  # vert, bleu clair, bleu marine
        return True
    # orange (Espagne seulement : ailleurs, cheveux roux), sous la tête, plus saturé que la peau
    # (plis clairs du maillot : moins saturés mais très lumineux, contrairement aux bras)
    return orange and 8 <= deg <= 45 and ((s > 0.72 and v > 0.25) or (s > 0.5 and v > 0.75))

def bleuir(im, bas_tete):
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if est_maillot(h * 360, s, v, bas_tete is not None and y > bas_tete * im.height):
                ns = min(1, 0.55 + s * 0.35)
                nv = min(1, 0.25 + v * 0.7)
                rr, gg, bb = colorsys.hsv_to_rgb(TEINTE_BLEU, ns, nv)
                px[x, y] = (int(rr * 255), int(gg * 255), int(bb * 255), a)
    return im

os.makedirs(SORTIE, exist_ok=True)
n = 0
for f in sorted(glob.glob(f"{SOURCE}/bust-*.png")):
    k = os.path.basename(f)[5:7]
    bleuir(Image.open(f), BAS_TETE.get(k)).save(f"{SORTIE}/bleu-{k}.png", optimize=True)
    n += 1
print("fait :", n, "figurines")
