# Fabrique les figurines de ton équipe pour le match : maillots des pays
# (bleu marine, orange, vert, bleu clair) recolorés au bleu de l'équipe, comme
# l'adversaire est en rouge (12/11 : « l'adversaire est en rouge, moi je
# devrais être en bleu »). Les couleurs de pays restent sur la préparation.
# Lancer : python3 scripts/recolorer-equipe.py (depuis prototype/)
import glob, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from maillots import recolorer

SOURCE = "../docs/maquette-interface/bustes"
SORTIE = "src/images/equipe-bleue"
TEINTE_BLEU = 220 / 360

ESPAGNE = {"IS", "RC", "PA", "AS", "DA"}  # maillots orange
# Bas de la tête (fraction de la hauteur), d'après TETES (src/ui/bustes.ts) :
# l'orange n'est recoloré qu'en dessous, pour ne pas toucher les visages mats.
BAS_TETE = {"IS": 0.57, "RC": 0.71, "PA": 0.47, "AS": 0.5, "DA": 0.63}

# Bandes jaunes (Lima, Mercier, Sanz) : passées au même bleu que le maillot.
# Tous les maillots de l'équipe sont identiques (12/11, « pas avec ou sans bandes »).
BANDES_JAUNES = {"BL": 0.5, "AM": 0.5, "AS": 0.5}

def est_maillot_de(bas_tete):
    def f(x, y, deg, s, v):
        if 90 <= deg <= 260 and s > 0.38 and v > 0.2:  # vert, bleu clair, bleu marine
            return True
        # orange (Espagne seulement : ailleurs, cheveux roux), sous la tête, plus saturé que la peau ;
        # plis clairs du maillot : moins saturés mais très lumineux, contrairement aux bras
        return bas_tete is not None and y > bas_tete * 97 and 8 <= deg <= 45 and ((s > 0.72 and v > 0.25) or (s > 0.5 and v > 0.75))
    return f

def bande_de(bas_bandes):
    return lambda x, y, deg, s, v: bas_bandes is not None and y > bas_bandes * 97 and 40 <= deg <= 100 and s > 0.3 and v > 0.45

os.makedirs(SORTIE, exist_ok=True)
n = 0
for f in sorted(glob.glob(f"{SOURCE}/bust-*.png")):
    k = os.path.basename(f)[5:7]
    recolorer(Image.open(f), TEINTE_BLEU, 0.78, 0.56, est_maillot_de(BAS_TETE.get(k)), bande_de(BANDES_JAUNES.get(k))).save(f"{SORTIE}/bleu-{k}.png", optimize=True)
    n += 1
print("fait :", n, "figurines")
