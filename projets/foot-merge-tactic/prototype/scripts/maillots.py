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
