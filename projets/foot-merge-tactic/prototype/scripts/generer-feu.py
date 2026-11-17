# Feu des joueurs fusionnés en images pré-dessinées (17/11, A2, solution 1 choisie
# par le concepteur). Le feu « M2 » (14/11) dessiné image par image dans Chrome :
# mêmes flammes, mêmes couleurs, la matière qui ondule et des braises qui montent,
# en boucle parfaite. Le jeu n'a plus qu'à faire défiler une bande d'images, au
# lieu de calculer filtres et animations à chaque image (le feu coûtait la moitié
# de la fluidité au ralenti ×4).
#
# Usage (depuis prototype/) : python3 scripts/generer-feu.py [aperçu.png]
# Sortie : src/images/feu/feu-<camp>-<variante>.webp (camp 0 = toi, 1 = adversaire ;
# variante 2 = niveau 2, 3 = niveau 3 ; pions et figurines partagent la même bande).
import base64, io, json, os, sys
from PIL import Image
from playwright.sync_api import sync_playwright

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "..", "src", "images", "feu")
IMAGES = 12            # images par boucle
BOUCLE_S = 1.2         # durée de la boucle (10 images par seconde)
# Variantes : hauteur de flamme en pixels de la bande, et repères (en hauteurs de
# flamme h) repris de ecranMatch.ts : côtés = 0,36 × largeur, braises, montée.
VARIANTES = {
    "2": {"h": 100, "niveau": 2},
    "3": {"h": 124, "niveau": 3, "cote": 0.36 * 46 / 99.68, "braise": 5 / 99.68, "monte": 39 / 99.68},
}
# Cadre de la bande, en hauteurs de flamme : largeur, hauteur, pied au-dessus du bas.
CADRE = {2: (0.9, 1.4, 0.15), 3: (1.2, 1.55, 0.2)}

JS = r"""
const FEU = [
  { fonce: "#132F86", main: "#2F6BFF", vif: "#5FA0FF", clair: "#CFE3FF" },
  { fonce: "#7E1710", main: "#E2402A", vif: "#FF7B3D", clair: "#FFE0B0" },
];
const FLAMME = {
  bord: "M20 59 C9 59 4 51 5 42 C6 35 10 31 10 24 C13 28 14 31 16 32 C15 23 18 14 24 5 C24 14 28 19 30 25 C31 22 32 20 32 16 C36 24 37 33 35 42 C34 52 29 59 20 59 Z",
  milieu: "M20 59 C12 59 9 53 10 46 C11 40 14 37 15 31 C17 35 18 37 19 38 C19 31 22 25 25 18 C26 26 29 30 30 36 C31 42 31 49 29 53 C27 57 24 59 20 59 Z",
  coeur: "M20 59 C15 59 13 55 14 50 C15 46 17 44 18 40 C19 43 20 44 21 45 C22 42 23 40 23 36 C26 42 27 47 26 51 C25 56 23 59 20 59 Z",
};
// Haut de chaque calque dans la boîte 40 × 60 (pour son dégradé, du pied vers la pointe).
const HAUT = { bord: 5, milieu: 18, coeur: 36 };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const TAU = Math.PI * 2;
// Hasard fixe (même feu à chaque génération).
function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Une flamme de hauteur h, pied en (x, y), au temps u (0..1 de la boucle).
// Chaque calque ondule à son rythme (1, 2 et 3 fois par boucle), comme le CSS d'avant.
function flamme(ctx, f, x, y, h, complete, u, dephasage) {
  const s = h / 60;
  const calques = [
    complete && ["bord", 1, [[0, f.fonce, 0.95], [0.45, f.main, 0.85], [0.8, f.vif, 0.35], [1, f.vif, 0]], [1, 0.95, -1.5], [1.03, 1.04, 1.5]],
    ["milieu", 2, [[0, f.vif, 1], [0.55, f.clair, 0.9], [1, "#FFFFFF", 0]], [0.96, 1.05, 2], [1.03, 0.93, -2]],
    ["coeur", 3, [[0, "#FFFFFF", 1], [0.7, "#FFFFFF", 0.85], [1, f.clair, 0]], [1, 0.9, 0], [0.97, 1.08, 0]],
  ].filter(Boolean);
  for (const [nom, rythme, arrets, de, a] of calques) {
    const v = 0.5 - 0.5 * Math.cos(TAU * (rythme * u + dephasage)); // va-et-vient doux
    const sx = de[0] + (a[0] - de[0]) * v, sy = de[1] + (a[1] - de[1]) * v, sk = ((de[2] + (a[2] - de[2]) * v) * Math.PI) / 180;
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(sx, 0, -Math.tan(sk) * sy, sy, 0, 0);
    ctx.translate(-20 * s, -59 * s);
    ctx.scale(s, s);
    const g = ctx.createLinearGradient(0, 59, 0, HAUT[nom]);
    for (const [o, c, op] of arrets) g.addColorStop(o, rgba(c, op));
    ctx.fillStyle = g;
    ctx.fill(new Path2D(FLAMME[nom]));
    ctx.restore();
  }
}

// Matière du feu : la flamme est déformée par un bruit doux qui monte et change
// lentement (comme le filtre de turbulence d'avant). Boucle parfaite : le bruit se
// répète en hauteur et dans le temps, et monte d'une période par boucle. Les
// pointes bougent beaucoup, le pied presque pas.
function bruitBoucle(graine, px, py, pt) {
  const h = (i, j, k) => { let n = (((i % px) + px) % px) * 374761393 + (((j % py) + py) % py) * 668265263 + (((k % pt) + pt) % pt) * 2147483647 + graine * 1274126177; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const l = (t) => t * t * (3 - 2 * t);
  return (x, y, t) => {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(t), fx = l(x - i), fy = l(y - j), ft = l(t - k);
    let s = 0;
    for (let c = 0; c < 8; c++) {
      const di = c & 1, dj = (c >> 1) & 1, dk = (c >> 2) & 1;
      s += h(i + di, j + dj, k + dk) * (di ? fx : 1 - fx) * (dj ? fy : 1 - fy) * (dk ? ft : 1 - ft);
    }
    return s;
  };
}
function onduler(src, piedY, h, u, camp) {
  const W = src.width, H = src.height;
  const d = src.getContext("2d").getImageData(0, 0, W, H).data;
  const out = new ImageData(W, H);
  const o = out.data;
  const cx = 0.2 * h, cy = 0.32 * h, PY = Math.max(2, Math.round(H / cy)), PT = 4;
  const n1 = bruitBoucle(11 + camp, 1e6, PY, PT), n2 = bruitBoucle(29 + camp, 1e6, PY, PT);
  const n3 = bruitBoucle(43 + camp, 1e6, PY * 2, PT), n4 = bruitBoucle(57 + camp, 1e6, PY * 2, PT);
  const A = 0.075 * h;
  const lire = (x, y, c) => { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0; let s = 0; for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) { const xx = x0 + dx, yy = y0 + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) s += d[(yy * W + xx) * 4 + c] * w; } return s; };
  for (let y = 0; y < H; y++) {
    const haut = Math.min(1, Math.max(0, (piedY - y) / h));
    const amp = A * Math.pow(haut, 1.1);
    const yy = y / cy + u * PY; // le bruit monte d'une période par boucle
    for (let x = 0; x < W; x++) {
      const xx = x / cx, tt = u * PT;
      const dx = (n1(xx, yy, tt) - 0.5) * 2 + 0.45 * (n3(xx * 2, yy * 2, tt) - 0.5) * 2;
      const dy = (n2(xx, yy, tt) - 0.5) * 2 + 0.45 * (n4(xx * 2, yy * 2, tt) - 0.5) * 2;
      const sx = x + dx * amp, sy = y + dy * amp * 0.7 + amp * 0.25;
      const k = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) o[k + c] = lire(sx, sy, c);
    }
  }
  return out;
}

// Une image de la boucle. v : variante ; camp ; i : numéro de l'image.
window.rendre = (v, camp, i) => {
  const f = FEU[camp];
  const u = i / v.images;
  const h = v.h, W = Math.round(v.cadre[0] * h), H = Math.round(v.cadre[1] * h);
  const pied = H - v.cadre[2] * h, cx = W / 2;
  const toile = (w, hh) => Object.assign(document.createElement("canvas"), { width: w, height: hh });
  // 1. Flammes nettes.
  const nette = toile(W, H), n = nette.getContext("2d");
  if (v.niveau === 3) for (const cote of [-1, 1]) flamme(n, f, cx + cote * v.cote * h, pied - 0.07 * h, 0.41 * h, false, u, cote > 0 ? 0.33 : 0.66);
  flamme(n, f, cx, pied, h, true, u, 0);
  // 2. Matière qui ondule.
  const ondulee = toile(W, H);
  ondulee.getContext("2d").putImageData(onduler(nette, pied, h, u, camp), 0, 0);
  // 3. Assemblage : lueur au sol (niveau 3), halo de la couleur de l'équipe, flamme, braises.
  const c = toile(W, H), x = c.getContext("2d");
  if (v.niveau === 3) {
    const l = 0.75 + 0.2 * Math.sin(TAU * u);
    x.save();
    x.translate(cx, pied - 0.3 * h);
    x.scale(1, 0.8);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 0.5 * h);
    g.addColorStop(0, rgba(f.vif, l)); g.addColorStop(0.55, rgba(f.main, 0.53 * l)); g.addColorStop(1, rgba(f.main, 0));
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 0.5 * h, 0, TAU); x.fill();
    x.restore();
  }
  const halo = toile(W, H), hx = halo.getContext("2d");
  hx.filter = `blur(${(0.045 * h).toFixed(1)}px)`;
  hx.drawImage(ondulee, 0, 0);
  hx.filter = "none";
  hx.globalCompositeOperation = "source-in";
  hx.fillStyle = rgba(f.main, 0.9);
  hx.fillRect(0, 0, W, H);
  x.drawImage(halo, 0, 0);
  x.filter = `blur(${(0.004 * h).toFixed(2)}px)`;
  x.drawImage(ondulee, 0, 0);
  x.filter = "none";
  if (v.niveau === 3) {
    const r = hasard(7 + camp);
    for (let b = 0; b < 11; b++) {
      const x0 = (r() - 0.5) * 0.62 * h, ph = r(), tours = r() < 0.5 ? 1 : 2, taille = v.braise * h * (0.55 + 0.6 * r()), derive = (r() - 0.5) * 0.12 * h;
      const w = (tours * u + ph) % 1;
      const by = pied - 0.4 * h - w * v.monte * h * 1.35;
      const bx = cx + x0 + derive * w + 0.03 * h * Math.sin(TAU * (w * 1.5 + ph));
      const a = Math.pow(Math.sin(Math.PI * w), 0.6);
      const rr = taille * (1 - 0.35 * w);
      const g = x.createRadialGradient(bx, by, 0, bx, by, rr);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.3, rgba(f.clair, a)); g.addColorStop(0.6, rgba(f.vif, 0.7 * a)); g.addColorStop(1, rgba(f.vif, 0));
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, rr, 0, TAU); x.fill();
    }
  }
  return c.toDataURL("image/png");
};
"""

def main() -> None:
    apercu = sys.argv[1] if len(sys.argv) > 1 else None
    os.makedirs(SORTIE, exist_ok=True)
    infos = {}
    planches = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = b.new_page()
        pg.set_content("<html><body></body></html>")
        pg.add_script_tag(content=JS)
        for nom, v in VARIANTES.items():
            cadre = CADRE[v["niveau"]]
            for camp in (0, 1):
                arg = {**v, "cadre": cadre, "images": IMAGES}
                images = []
                for i in range(IMAGES):
                    url = pg.evaluate("([v, c, i]) => rendre(v, c, i)", [arg, camp, i])
                    images.append(Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1]))).convert("RGBA"))
                w, h = images[0].size
                bande = Image.new("RGBA", (w * IMAGES, h), (0, 0, 0, 0))
                for i, im in enumerate(images): bande.paste(im, (i * w, 0))
                chemin = os.path.join(SORTIE, f"feu-{camp}-{nom}.webp")
                bande.save(chemin, "WEBP", quality=78, alpha_quality=80, method=6)
                infos[f"{camp}-{nom}"] = {"largeur": w, "hauteur": h, "octets": os.path.getsize(chemin)}
                planches.append(images)
        b.close()
    print(json.dumps(infos))
    if apercu:
        # Aperçu : chaque bande sur une pelouse, agrandie ×2 (6 lignes, les 6 premières images).
        lignes = []
        for images in planches:
            w, h = images[0].size
            ligne = Image.new("RGBA", (w * 6, h), (72, 140, 76, 255))
            for i in range(6): ligne.alpha_composite(images[i * 2], (i * w, 0))
            lignes.append(ligne)
        L = max(l.size[0] for l in lignes)
        tout = Image.new("RGBA", (L, sum(l.size[1] for l in lignes)), (72, 140, 76, 255))
        y = 0
        for l in lignes: tout.alpha_composite(l, (0, y)); y += l.size[1]
        tout.convert("RGB").save(apercu)

main()
