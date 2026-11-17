# Recoloriage des maillots des figurines (prototype) : tous les maillots d'une
# équipe deviennent exactement de la même couleur (même teinte, même
# saturation, même luminosité moyenne), bandes comprises. Utilisé par
# recolorer-equipe.py (bleu) et recolorer-adversaires.py (rouge).
import colorsys

def recolorer(im, teinte, saturation, luminosite, est_maillot, est_bande=lambda x, y, deg, s, v: False):
    """est_maillot(x, y, deg, s, v) et est_bande(...) choisissent les pixels ; la
    luminosité de chaque pixel est ramenée autour de `luminosite` (moyenne du maillot)."""
    im = im.convert("RGBA")
    px = im.load()
    choisis = []
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            deg = h * 360
            if est_bande(x, y, deg, s, v):
                choisis.append((x, y, None, a))
            elif est_maillot(x, y, deg, s, v):
                choisis.append((x, y, v, a))
    vs = [v for (_, _, v, _) in choisis if v is not None]
    moyenne = sum(vs) / len(vs) if vs else luminosite
    for x, y, v, a in choisis:
        nv = luminosite if v is None else luminosite + (v - moyenne) * 0.85  # garde les plis et les ombres
        nv = max(0.08, min(1, nv))
        rr, gg, bb = colorsys.hsv_to_rgb(teinte, saturation, nv)
        px[x, y] = (int(rr * 255), int(gg * 255), int(bb * 255), a)
    return im


def normaliser(im, hauteur=0.85):
    """Toutes les figurines à la même hauteur visible (12/11, « pourquoi ils n'ont
    pas tous la même taille ? ») : les bustes de la maquette n'ont pas la même
    échelle (85 à 99 % de l'image). On réduit les plus grands autour du bas du
    socle (centre de l'image en largeur), sans rien couper."""
    from PIL import Image
    im = im.convert("RGBA")
    W, H = im.size
    boite = im.split()[3].point(lambda a: 255 if a > 40 else 0).getbbox()
    if not boite:
        return im
    haut, bas = boite[1], boite[3]
    h = (bas - haut) / H
    if h <= hauteur:
        return im
    k = hauteur / h
    petit = im.resize((max(1, round(W * k)), max(1, round(H * k))), Image.LANCZOS)
    sortie = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sortie.alpha_composite(petit, (round(W / 2 - W / 2 * k), round(bas - bas * k)))
    return sortie
