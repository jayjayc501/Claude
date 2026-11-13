# Découpe les planches Kling (une par pays, 12 figurines en 4 × 3) en bustes
# (13/11, demande du concepteur : « des joueurs bien différents, avec le
# drapeau du pays sur le maillot »).
#
# Pour chaque case : fond retiré, logos effacés (taches enfermées dans le
# maillot), drapeau du pays posé sur la poitrine, buste ramené à la même
# hauteur que les autres. Trois versions : couleur du pays (préparation),
# bleu (ton équipe en match), rouge et retourné (l'adversaire en match).
#
# Usage : python3 scripts/decouper-planches.py [planches...]
#   planches : chemins de images-kling/brut/<PAYS>.jpg (par défaut : les 5 pays)
# Sortie : src/images/joueurs/<ID>.webp, <ID>-bleu.webp, <ID>-rouge.webp,
#          et src/ui/bustesCatalogue.ts (les imports).

import colorsys
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from scipy import ndimage

ICI = Path(__file__).resolve().parent
PROTO = ICI.parent
BRUT = PROTO.parent / "images-kling" / "brut"
SORTIE = PROTO / "src" / "images" / "joueurs"
CATALOGUE = json.loads((PROTO / "src" / "data" / "cartes.json").read_text())

# Taille d'un buste : 2 × celle de la maquette (96 × 97), pour les écrans nets.
L_SORTIE, H_SORTIE = 192, 194
HAUTEUR_VISIBLE = 0.86

# Teinte de référence du maillot de chaque planche (degrés) et saturation minimale.
MAILLOT = {"FRA": (228, 0.30, 0.10), "ESP": (24, 0.38, 0.50), "BRA": (135, 0.30, 0.10), "ARG": (203, 0.22, 0.10), "ITA": (212, 0.40, 0.10)}
TOLERANCE_TEINTE = 20
# Match : ton équipe en bleu, l'adversaire en rouge (mêmes teintes que recolorer-equipe.py / -adversaires.py).
BLEU = (220 / 360, 0.78, 0.56)
ROUGE = (358 / 360, 0.82, 0.62)


def drapeau(code: str, w: int, h: int) -> Image.Image:
    """Drapeau simplifié du pays (rectangle, bords arrondis, liseré blanc)."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if code == "FRA":
        for i, c in enumerate([(0, 85, 164), (255, 255, 255), (239, 65, 53)]):
            d.rectangle([i * w / 3, 0, (i + 1) * w / 3, h], fill=c)
    elif code == "ITA":
        for i, c in enumerate([(0, 146, 70), (255, 255, 255), (206, 43, 55)]):
            d.rectangle([i * w / 3, 0, (i + 1) * w / 3, h], fill=c)
    elif code == "ESP":
        d.rectangle([0, 0, w, h], fill=(198, 11, 30))
        d.rectangle([0, h / 4, w, 3 * h / 4], fill=(255, 196, 0))
    elif code == "ARG":
        for i, c in enumerate([(116, 172, 223), (255, 255, 255), (116, 172, 223)]):
            d.rectangle([0, i * h / 3, w, (i + 1) * h / 3], fill=c)
        r = h / 9
        d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=(246, 180, 14))
    elif code == "BRA":
        d.rectangle([0, 0, w, h], fill=(0, 156, 59))
        m = w * 0.1
        d.polygon([(m, h / 2), (w / 2, h * 0.12), (w - m, h / 2), (w / 2, h * 0.88)], fill=(255, 223, 0))
        r = h * 0.22
        d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=(0, 39, 118))
    # Coins arrondis et fin liseré blanc : un écusson cousu sur le maillot.
    masque = Image.new("L", (w, h), 0)
    ImageDraw.Draw(masque).rounded_rectangle([0, 0, w - 1, h - 1], radius=max(1, h // 6), fill=255)
    im.putalpha(masque)
    cadre = Image.new("RGBA", (w + 4, h + 4), (0, 0, 0, 0))
    ImageDraw.Draw(cadre).rounded_rectangle([0, 0, w + 3, h + 3], radius=max(1, h // 5), fill=(255, 255, 255, 235))
    cadre.alpha_composite(im, (2, 2))
    return cadre


def hsv(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    r, g, b = (rgb[..., i].astype(np.float32) / 255 for i in range(3))
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.maximum(d, 1e-6), 0)
    gc = np.where(m, (mx - g) / np.maximum(d, 1e-6), 0)
    bc = np.where(m, (mx - b) / np.maximum(d, 1e-6), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2 + rc - bc, 4 + gc - rc))
    h = (h / 6) % 1
    return h * 360, s, mx


def detourer(case: np.ndarray, degrade: bool = False) -> np.ndarray:
    """Masque (0-1) de la figurine : le fond gris clair touchant les bords est retiré,
    puis on garde la plus grande pièce (les morceaux des voisins partent)."""
    h, w, _ = case.shape
    bord = np.concatenate([case[0], case[-1], case[:, 0], case[:, -1]])
    fond = np.median(bord, axis=0)
    ecart = np.abs(case.astype(np.int16) - fond.astype(np.int16)).max(axis=2)
    sat = case.max(axis=2).astype(np.int16) - case.min(axis=2)
    if degrade:
        # Joueur refait à part : fond en dégradé (photo de studio). On modélise le fond
        # par une surface lisse (polynôme de degré 2) ajustée sur les bords de l'image.
        yy, xx = np.mgrid[0:h, 0:w]
        X = lambda x, y: np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], axis=-1).astype(np.float64)
        bx = np.concatenate([xx[0], xx[-1], xx[:, 0], xx[:, -1]]) / w
        by = np.concatenate([yy[0], yy[-1], yy[:, 0], yy[:, -1]]) / h
        coef, *_ = np.linalg.lstsq(X(bx, by), bord.astype(np.float64), rcond=None)
        fond = X(xx / w, yy / h) @ coef
        ecart = np.abs(case.astype(np.float64) - fond).max(axis=2)
    candidat = (ecart < 18) & (sat < 22)
    if degrade:
        # Ombre portée sur le sol (beige pâle) sous la figurine : fond aussi.
        sol = np.zeros_like(candidat)
        sol[int(h * 0.6):] = True
        candidat |= sol & (sat < 52) & (ecart < 50)
    lab, n = ndimage.label(candidat)
    touche = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    est_fond = np.isin(lab, list(touche))
    figure = ~est_fond
    figure = ndimage.binary_opening(figure, iterations=2)
    lab, n = ndimage.label(figure)
    if n == 0:
        return figure.astype(np.float32)
    tailles = ndimage.sum(figure, lab, range(1, n + 1))
    garde = np.argmax(tailles) + 1
    figure = lab == garde
    figure = ndimage.binary_fill_holes(figure)
    # Bord adouci : l'alpha suit l'écart au fond sur 2 pixels.
    alpha = figure.astype(np.float32)
    bord_fig = figure & ~ndimage.binary_erosion(figure, iterations=2)
    alpha[bord_fig] = np.clip((ecart[bord_fig] - 6) / 22, 0.25, 1)
    return alpha


def nettoyer_maillot(rgb: np.ndarray, alpha: np.ndarray, pays: str) -> tuple[np.ndarray, np.ndarray]:
    """Masque du maillot ; logos, écussons et numéros (taches enfermées dans le
    maillot) repeints de la couleur du maillot autour."""
    teinte, smin, vmin = MAILLOT[pays]
    H, S, V = hsv(rgb)
    # Le maillot est dans le bas du buste (la tête occupe le haut) : évite de prendre la peau.
    lignes = np.nonzero((alpha > 0.5).any(axis=1))[0]
    bas = np.zeros_like(alpha, dtype=bool)
    if len(lignes):
        bas[lignes.min() + int(0.55 * (lignes.max() - lignes.min())):] = True
    dh = np.abs(((H - teinte) + 180) % 360 - 180)
    maillot = (dh < TOLERANCE_TEINTE) & (S > smin) & (V > max(0.12, vmin)) & (alpha > 0.5) & bas
    # Teinte réelle du maillot de cette figurine, puis masque plus juste.
    if maillot.sum() > 50:
        t2 = float(np.median(H[maillot]))
        dh = np.abs(((H - t2) + 180) % 360 - 180)
        maillot = (dh < TOLERANCE_TEINTE) & (S > smin) & (V > max(0.10, vmin)) & (alpha > 0.5) & bas
    maillot = ndimage.binary_closing(maillot, iterations=1) & (alpha > 0.5)
    aire = alpha.sum()
    autres = (alpha > 0.5) & ~maillot
    lab, n = ndimage.label(autres)
    sortie = rgb.copy()
    for i in range(1, n + 1):
        tache = lab == i
        t = tache.sum()
        if t > 0.025 * aire or t < 4:
            continue
        anneau = ndimage.binary_dilation(tache, iterations=2) & ~tache
        if anneau.sum() == 0 or maillot[anneau].mean() < 0.8:
            continue
        # Tache enfermée dans le maillot : on la repeint (moyenne locale du maillot).
        couleur = np.median(rgb[anneau & maillot], axis=0)
        sortie[tache] = couleur
        maillot |= tache
    # Un léger flou sur les zones repeintes pour ne pas laisser d'aplat.
    return sortie, maillot


def teint(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Couleur de peau de la figurine : pixels de teinte chair dans le haut (le visage)."""
    H, S, V = hsv(rgb)
    hauteur = np.nonzero(alpha.any(axis=1))[0]
    haut = np.zeros_like(alpha, dtype=bool)
    if len(hauteur):
        y0, y1 = hauteur.min(), hauteur.min() + int((hauteur.max() - hauteur.min()) * 0.6)
        haut[y0:y1] = True
    peau = haut & (alpha > 0.5) & (H > 8) & (H < 45) & (S > 0.15) & (S < 0.75) & (V > 0.25)
    if peau.sum() < 30:
        return np.array([224, 172, 140])
    return np.median(rgb[peau], axis=0)


def oter_gants(rgb: np.ndarray, alpha: np.ndarray, maillot: np.ndarray) -> np.ndarray:
    """Joueur de champ (13/11, « pourquoi des joueurs de champ ont des gants ? ») :
    les grosses taches blanches hors maillot (gants) prennent la couleur de la peau,
    en gardant leur modelé. Le ballon (blanc entouré de noir) et les liserés fins restent."""
    H, S, V = hsv(rgb)
    blanc = (alpha > 0.5) & (S < 0.16) & (V > 0.72) & ~maillot
    epais = ndimage.binary_opening(blanc, iterations=5)
    # Tout le gant : le clair et ses ombres grises reliés à une tache épaisse.
    clair = (alpha > 0.3) & (S < 0.19) & (V > 0.45) & ~maillot
    lc, nc = ndimage.label(clair)
    garde = np.unique(lc[epais])
    blanc = np.isin(lc, garde[garde > 0])
    lab, n = ndimage.label(epais)
    if n == 0:
        return rgb
    peau = teint(rgb, alpha).astype(np.float32)
    out = rgb.astype(np.float32).copy()
    sombre = (V < 0.25) & (S < 0.3) & (alpha > 0.5)  # noir du ballon (pas le maillot marine)
    hauteur = np.nonzero(alpha.any(axis=1))[0]
    y_tete = hauteur.min() + 0.45 * (hauteur.max() - hauteur.min()) if len(hauteur) else 0
    for i in range(1, n + 1):
        tache = ndimage.binary_dilation(lab == i, iterations=40) & blanc
        anneau = ndimage.binary_dilation(tache, iterations=4) & ~tache & (alpha > 0.5)
        if anneau.sum() and sombre[anneau].mean() > 0.25:
            continue  # ballon : panneaux blancs entourés de noir
        ys = np.nonzero(tache)[0]
        if ys.mean() < y_tete * 0.8:
            continue  # trop haut : col, yeux, cheveux clairs
        v = V[tache]
        k = (v / max(1e-3, float(np.percentile(v, 80))))[:, None]
        out[tache] = np.clip(peau * (0.55 + 0.5 * k), 0, 255)
    return out.astype(np.uint8)


def peau_naturelle(rgb: np.ndarray, alpha: np.ndarray, maillot: np.ndarray) -> np.ndarray:
    """Gardien à la peau verte (Kling) : la peau verdâtre du haut redevient naturelle."""
    H, S, V = hsv(rgb)
    hauteur = np.nonzero(alpha.any(axis=1))[0]
    if not len(hauteur):
        return rgb
    haut = np.zeros_like(alpha, dtype=bool)
    haut[hauteur.min(): hauteur.min() + int((hauteur.max() - hauteur.min()) * 0.75)] = True
    vert = haut & (alpha > 0.5) & ~maillot & (H > 55) & (H < 170) & (S > 0.12) & (V > 0.3)
    if vert.sum() < 0.04 * (alpha > 0.5).sum():
        return rgb
    out = rgb.copy()
    ys, xs = np.nonzero(vert)
    for y, x in zip(ys, xs):
        r, g, b = colorsys.hsv_to_rgb(26 / 360, min(0.5, float(S[y, x]) + 0.12), float(V[y, x]))
        out[y, x] = (int(r * 255), int(g * 255), int(b * 255))
    return out


def recolorer(rgb: np.ndarray, maillot: np.ndarray, cible: tuple[float, float, float]) -> np.ndarray:
    t, s, lum = cible
    _, _, V = hsv(rgb)
    moyenne = float(V[maillot].mean()) if maillot.any() else lum
    nv = np.clip(lum + (V - moyenne) * 0.85, 0.08, 1)
    out = rgb.copy()
    ys, xs = np.nonzero(maillot)
    for y, x in zip(ys, xs):
        r, g, b = colorsys.hsv_to_rgb(t, s, float(nv[y, x]))
        out[y, x] = (int(r * 255), int(g * 255), int(b * 255))
    return out


def poser_drapeau(img: Image.Image, maillot: np.ndarray, pays: str) -> Image.Image:
    """Drapeau sur la poitrine, côté cœur (à droite de l'image), seulement sur le maillot."""
    m = maillot
    ys, xs = np.nonzero(m)
    if len(ys) < 50:
        return img
    haut, bas = ys.min(), ys.max()
    gauche, droite = xs.min(), xs.max()
    largeur = droite - gauche
    w = max(10, int(largeur * 0.17))
    h = max(7, int(w * 0.66))
    # Poitrine : un peu sous le haut du maillot, côté droit de l'image.
    cx = int(gauche + largeur * 0.68)
    cy = int(haut + (bas - haut) * 0.5)
    f = drapeau(pays, w, h)
    x0, y0 = cx - f.width // 2, cy - f.height // 2
    # Seulement là où il y a du maillot (un bras devant cache le drapeau).
    zone = np.zeros(m.shape, dtype=np.uint8)
    zone[m] = 255
    masque = Image.fromarray(zone).crop((x0, y0, x0 + f.width, y0 + f.height))
    a = np.minimum(np.array(f.split()[3]), np.array(masque))
    f.putalpha(Image.fromarray(a.astype(np.uint8)))
    out = img.copy()
    out.alpha_composite(f, (x0, y0))
    return out


def cadrer(im: Image.Image) -> Image.Image:
    """Même hauteur visible pour tous, base du buste en bas, centré."""
    boite = im.split()[3].point(lambda a: 255 if a > 40 else 0).getbbox()
    im = im.crop(boite)
    k = min(H_SORTIE * HAUTEUR_VISIBLE / im.height, L_SORTIE * 0.98 / im.width)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    sortie = Image.new("RGBA", (L_SORTIE, H_SORTIE), (0, 0, 0, 0))
    sortie.alpha_composite(im, ((L_SORTIE - im.width) // 2, H_SORTIE - im.height))
    return sortie


def traiter(planche: Path) -> list[str]:
    pays = planche.stem[:3]
    ids = [c["id"] for c in CATALOGUE["cartes"] if c["pays"] == pays]
    assert len(ids) == 12, pays
    tout = np.array(Image.open(planche).convert("RGB"))
    H, W, _ = tout.shape
    # Une planche de 12 (4 × 3), ou un seul joueur refait à part (fichier nommé par son identifiant).
    seul = planche.stem.rsplit("-v", 1)[0]
    cases = [(ids.index(seul), seul, tout)] if seul in ids else []
    if not cases:
        for i, ident in enumerate(ids):
            lig, col = divmod(i, 4)
            y0, y1 = round(lig * H / 3), round((lig + 1) * H / 3)
            x0, x1 = round(col * W / 4), round((col + 1) * W / 4)
            cases.append((i, ident, tout[y0:y1, x0:x1]))
    faits = []
    for i, ident, case in cases:
        alpha = detourer(case, degrade=seul in ids)

        rgb, maillot = nettoyer_maillot(case, alpha, pays)
        if i == 0:
            rgb = peau_naturelle(rgb, alpha, maillot)  # le gardien
        else:
            rgb = oter_gants(rgb, alpha, maillot)  # seuls les gardiens ont des gants
        a8 = (alpha * 255).astype(np.uint8)
        def image(r: np.ndarray) -> Image.Image:
            im = Image.fromarray(r.astype(np.uint8), "RGB").convert("RGBA")
            im.putalpha(Image.fromarray(a8))
            return im
        pays_im = cadrer(poser_drapeau(image(rgb), maillot, pays))
        bleu = cadrer(poser_drapeau(image(recolorer(rgb, maillot, BLEU)), maillot, pays))
        rouge = cadrer(poser_drapeau(image(recolorer(rgb, maillot, ROUGE)), maillot, pays))
        SORTIE.mkdir(parents=True, exist_ok=True)
        pays_im.save(SORTIE / f"{ident}.webp", quality=80, method=6)
        bleu.save(SORTIE / f"{ident}-bleu.webp", quality=80, method=6)
        ImageOps.mirror(rouge).save(SORTIE / f"{ident}-rouge.webp", quality=80, method=6)
        faits.append(ident)
    return faits


def ecrire_module() -> None:
    ids = sorted(p.stem for p in SORTIE.glob("*.webp") if not p.stem.endswith(("-bleu", "-rouge")))
    var = lambda s: "I_" + s.replace("-", "_")
    lignes = [
        "// Bustes du catalogue (13/11) : planches Kling découpées par scripts/decouper-planches.py.",
        "// Fichier généré : ne pas modifier à la main.",
        "",
    ]
    for i in ids:
        for suffixe in ("", "-bleu", "-rouge"):
            lignes.append(f'import {var(i + suffixe)} from "../images/joueurs/{i}{suffixe}.webp";')
    lignes.append("")
    for nom, suffixe in (("BUSTES_CATALOGUE", ""), ("BLEUS_CATALOGUE", "-bleu"), ("ROUGES_CATALOGUE", "-rouge")):
        lignes.append(f"export const {nom}: Record<string, string> = {{")
        lignes += [f'  "{i}": {var(i + suffixe)},' for i in ids]
        lignes.append("};")
    (PROTO / "src" / "ui" / "bustesCatalogue.ts").write_text("\n".join(lignes) + "\n")


if __name__ == "__main__":
    # Planches retenues (13/11) : la dernière version de chaque pays, puis les joueurs refaits à part.
    planches = [Path(p) for p in sys.argv[1:]] or [BRUT / f for f in ("FRA-v4.jpg", "ESP-v4.jpg", "BRA-v3.jpg", "ARG-v4.jpg", "ITA-v4.jpg", "BRA-REZENDE.jpg", "ITA-CONTI.jpg", "ITA-FERRARO.jpg") if (BRUT / f).exists()]
    for p in planches:
        print(p.stem, len(traiter(p)), "bustes")
    ecrire_module()
