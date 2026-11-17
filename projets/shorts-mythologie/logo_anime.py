#!/usr/bin/env python3
"""Animation du logo de fin de La Pause Mytho…logique.

Le logo (PNG transparent) est découpé en éléments : chaque ligne de texte,
puis chacune des icônes du bas. Chaque élément entre à son tour, en montant
légèrement, avec un fondu et un flou qui se dissipe. Un halo doré monte
derrière le texte, puis un reflet de lumière balaie le logo.

Le résultat est une suite d'images PNG transparentes, posées par monter2.py
par-dessus le décor de fin.

Usage autonome (aperçu) :
    python3 logo_anime.py medias/fin-texte.png /tmp/logo --largeur 800 --duree 3.3
"""

import argparse
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def _bandes(alpha, seuil=40, mini=4):
    """Bandes horizontales de texte (lignes séparées par du vide)."""
    lignes = (alpha > seuil).sum(1) > mini
    bandes, i, n = [], 0, len(lignes)
    while i < n:
        if lignes[i]:
            j = i
            while j < n and lignes[j]:
                j += 1
            bandes.append([i, j])
            i = j
        else:
            i += 1
    return bandes


def decouper(rgba):
    """Renvoie une carte d'étiquettes (un numéro par élément) et l'ordre d'entrée."""
    alpha = rgba[:, :, 3]
    h, w = alpha.shape
    plein = alpha > 60
    comp, nb = ndimage.label(plein)
    if nb == 0:
        return np.zeros((h, w), int), [0], 1
    centres = ndimage.center_of_mass(plein, comp, range(1, nb + 1))

    # 1) lignes : on regroupe les composantes par bande horizontale ;
    #    une bande trop haute (deux lignes collées par un jambage) est recoupée
    #    au creux d'encre le plus marqué.
    bandes = _bandes(alpha)
    hauteur_type = np.median([b[1] - b[0] for b in bandes])
    coupes = []
    for b0, b1 in bandes:
        if b1 - b0 > 1.6 * hauteur_type:
            prof = (alpha[b0:b1] > 40).sum(1).astype(float)
            m0, m1 = int((b1 - b0) * 0.3), int((b1 - b0) * 0.7)
            c = b0 + m0 + int(np.argmin(prof[m0:m1]))
            coupes += [[b0, c], [c, b1]]
        else:
            coupes.append([b0, b1])

    def ligne_de(cy):
        for k, (a, b) in enumerate(coupes):
            if a <= cy < b:
                return k
        return int(np.argmin([min(abs(cy - a), abs(cy - b)) for a, b in coupes]))

    groupe = {}
    for i, (cy, cx) in enumerate(centres, 1):
        groupe[i] = ligne_de(cy)

    # 2) la dernière ligne (icônes) : un élément par icône, séparées par des colonnes vides
    derniere = len(coupes) - 1
    ids_der = [i for i, g in groupe.items() if g == derniere]
    if ids_der:
        # colonnes d'encre de la bande des icônes, séparées par des colonnes vides
        b0, b1 = coupes[derniere]
        encre = (alpha[b0:b1] > 40).any(0)
        blocs, x, ecart = [], 0, max(int(w * 0.02), 2)
        while x < w:
            if encre[x]:
                x1 = x
                while x1 < w and (encre[x1] or encre[x1:x1 + ecart].any()):
                    x1 += 1
                blocs.append((x, x1))
                x = x1
            else:
                x += 1
        for i in ids_der:
            cx = centres[i - 1][1]
            k = next((n for n, (a, b) in enumerate(blocs) if a <= cx < b),
                     int(np.argmin([abs(cx - (a + b) / 2) for a, b in blocs])))
            groupe[i] = derniere + k

    etiq = np.zeros((h, w), int)
    for i, g in groupe.items():
        etiq[comp == i] = g + 1
    # 3) l'ombre douce et les bords (alpha faible) vont à l'élément le plus proche
    _, (iy, ix) = ndimage.distance_transform_edt(etiq == 0, return_indices=True)
    etiq = etiq[iy, ix]
    etiq[alpha == 0] = 0
    ordre = sorted(set(groupe.values()))
    return etiq, ordre, derniere


def _flou(arr, r):
    if r < 0.6:
        return arr
    out = np.empty_like(arr)
    for c in range(arr.shape[2]):
        im = Image.fromarray(np.clip(arr[:, :, c] * 255, 0, 255).astype(np.uint8))
        out[:, :, c] = np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255
    return out


def generer(png, dossier, largeur, ips, duree, depart=0.35, pas=0.15, pas_icones=0.1,
            duree_entree=0.5, reflet=None, marge=None):
    """Écrit dossier/logo_0000.png… ; renvoie (motif, marge en px)."""
    dossier = Path(dossier)
    dossier.mkdir(parents=True, exist_ok=True)
    src = Image.open(png).convert("RGBA")
    hauteur = round(src.height * largeur / src.width)
    src = src.resize((largeur, hauteur), Image.LANCZOS)
    k = largeur / 800
    marge = marge or int(70 * k)
    rgba = np.asarray(src, np.float32) / 255
    etiq, ordre, nb_lignes = decouper((rgba * 255).astype(np.uint8))

    # image prémultipliée, posée dans un canevas avec marge (montée + halo)
    H, W = hauteur + 2 * marge, largeur + 2 * marge
    pm = np.zeros((H, W, 4), np.float32)
    pm[marge:marge + hauteur, marge:marge + largeur, :3] = rgba[:, :, :3] * rgba[:, :, 3:4]
    pm[marge:marge + hauteur, marge:marge + largeur, 3] = rgba[:, :, 3]
    lab = np.zeros((H, W), int)
    lab[marge:marge + hauteur, marge:marge + largeur] = etiq

    # calendrier d'entrée : lignes de texte, puis icônes plus serrées
    debuts, t = {}, depart
    icones = [g for g in ordre if g >= nb_lignes]
    for g in ordre:
        debuts[g] = t
        t += pas_icones if g in icones else pas
    fin_entrees = max(debuts.values()) + duree_entree
    reflet = reflet or (fin_entrees - 0.15, fin_entrees + 0.6)

    calques = []
    for g in ordre:
        m = (lab == g + 1)
        ys, xs = np.where(m)
        if len(ys) == 0:
            continue
        y0, y1 = max(ys.min() - marge, 0), min(ys.max() + marge, H)
        x0, x1 = max(xs.min() - marge, 0), min(xs.max() + marge, W)
        c = pm[y0:y1, x0:x1] * m[y0:y1, x0:x1, None]
        calques.append((g, y0, x0, c))

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    diag = xx * 0.94 + yy * 0.34          # bande inclinée d'environ 20°
    dmin, dmax = diag.min(), diag.max()
    dore = np.array([1.0, 0.93, 0.78], np.float32)
    halo_teinte = np.array([1.0, 0.55, 0.12], np.float32)

    n = int(round(duree * ips))
    prec_cle = None
    for i in range(n):
        t = i / ips
        etats = []
        for g, *_ in calques:
            p = min(max((t - debuts[g]) / duree_entree, 0.0), 1.0)
            etats.append(round(p, 3))
        r_on = reflet[0] <= t <= reflet[1]
        cle = (tuple(etats), round((t - reflet[0]) / (reflet[1] - reflet[0]), 3) if r_on else None)
        cible = dossier / f"logo_{i:04d}.png"
        if cle == prec_cle:
            shutil.copyfile(dossier / f"logo_{i - 1:04d}.png", cible)
            continue
        prec_cle = cle

        out = np.zeros((H, W, 4), np.float32)
        for (g, y0, x0, c), p in zip(calques, etats):
            if p <= 0:
                continue
            e = 1 - (1 - p) ** 3                       # sortie douce
            couche = _flou(c, (1 - e) * 9 * k) * min(1.0, p * 1.6)
            dy = int(round((1 - e) * 46 * k))
            hh, ww = couche.shape[:2]
            ya, yb = y0 + dy, min(y0 + dy + hh, H)
            zone = out[ya:yb, x0:x0 + ww]
            cc = couche[:yb - ya]
            out[ya:yb, x0:x0 + ww] = cc + zone * (1 - cc[:, :, 3:4])

        # reflet de lumière qui balaie le logo
        if r_on:
            q = (t - reflet[0]) / (reflet[1] - reflet[0])
            q = q * q * (3 - 2 * q)
            centre = dmin - 300 * k + q * (dmax - dmin + 600 * k)
            bande = np.exp(-((diag - centre) / (95 * k)) ** 2) * 0.62
            a = out[:, :, 3:4]
            out[:, :, :3] += (dore * a - out[:, :, :3]) * bande[:, :, None]

        # halo doré derrière le texte (monte avec les entrées, pulse avec le reflet)
        niveau = np.mean(etats) * 0.42
        if r_on:
            niveau += 0.22 * np.sin(np.pi * (t - reflet[0]) / (reflet[1] - reflet[0]))
        if niveau > 0.01:
            a_img = Image.fromarray((out[:, :, 3] * 255).astype(np.uint8))
            g_a = np.asarray(a_img.filter(ImageFilter.GaussianBlur(26 * k)), np.float32) / 255 * niveau
            halo = np.concatenate([halo_teinte * g_a[:, :, None], g_a[:, :, None]], 2)
            out = out + halo * (1 - out[:, :, 3:4])

        a = np.clip(out[:, :, 3:4], 0, 1)
        rgb = np.where(a > 1e-4, out[:, :, :3] / np.maximum(a, 1e-4), 0)
        img = np.concatenate([np.clip(rgb, 0, 1), a], 2)
        Image.fromarray((img * 255 + 0.5).astype(np.uint8), "RGBA").save(cible, compress_level=1)
    return dossier / "logo_%04d.png", marge


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("png", type=Path)
    ap.add_argument("dossier", type=Path)
    ap.add_argument("--largeur", type=int, default=800)
    ap.add_argument("--ips", type=int, default=24)
    ap.add_argument("--duree", type=float, default=3.3)
    a = ap.parse_args()
    motif, marge = generer(a.png, a.dossier, a.largeur, a.ips, a.duree)
    print(motif, marge)


if __name__ == "__main__":
    main()
