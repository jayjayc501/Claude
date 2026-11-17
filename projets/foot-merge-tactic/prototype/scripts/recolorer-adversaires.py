# Fabrique les figurines de l'équipe adverse : bustes de la maquette (maillots
# bleus ou verts) recolorés en rouge et retournés en miroir. Images de
# référence pour le prototype, pas les visuels du jeu.
# Lancer : python3 scripts/recolorer-adversaires.py (depuis prototype/)
import os, sys
from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(__file__))
from maillots import normaliser, recolorer

SOURCE = "../docs/maquette-interface/bustes"
SORTIE = "src/images/adversaires"
# Bustes aux maillots bleu marine (France), vert (Brésil), bleu clair (Italie) :
# leur teinte est loin de celle de la peau, le recoloriage ne touche que le maillot.
BUSTES = ["MO", "AM", "CB", "EL", "DK", "MV", "JM", "TR", "KM", "BL", "HF"]

# Bandes jaunes (bas de l'image) : passées au même rouge, tous les maillots identiques.
BANDES_JAUNES = {"BL": 0.5, "AM": 0.5}

def est_maillot(x, y, deg, s, v):
    return 90 <= deg <= 260 and s > 0.28 and v > 0.12  # vert, bleu clair, bleu marine

# CB : le buste de la maquette a des traces vertes sur le visage ; on part de IS
# (même personnage, maillot orange recoloré seulement sous la tête).
def est_maillot_orange(x, y, deg, s, v):
    return y > 0.64 * 97 and 8 <= deg <= 45 and ((s > 0.72 and v > 0.25) or (s > 0.5 and v > 0.75))

def bande_de(bas_bandes):
    return lambda x, y, deg, s, v: bas_bandes is not None and y > bas_bandes * 97 and 40 <= deg <= 100 and s > 0.3 and v > 0.45

def rougir(im, bas_bandes=None, maillot=est_maillot):
    return normaliser(ImageOps.mirror(recolorer(im, 358 / 360, 0.82, 0.62, maillot, bande_de(bas_bandes))))

os.makedirs(SORTIE, exist_ok=True)
for k in BUSTES:
    if k == "CB":
        rougir(Image.open(f"{SOURCE}/bust-IS.png"), None, est_maillot_orange).save(f"{SORTIE}/rouge-{k}.png", optimize=True)
        continue
    rougir(Image.open(f"{SOURCE}/bust-{k}.png"), BANDES_JAUNES.get(k)).save(f"{SORTIE}/rouge-{k}.png", optimize=True)
print("fait :", len(BUSTES), "figurines")
