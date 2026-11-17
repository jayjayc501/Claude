// Stade du match (14/11, concepteur : « le fond du terrain pourrait être plus
// joli », « le terrain de jeu est un peu très simple »).
//
// Le décor ne bouge pas : il est peint une seule fois dans un canevas (pelouse
// tondue en damier, brins d'herbe, lumière des projecteurs, usure devant les
// buts, panneaux publicitaires inventés, tribunes avec le public), puis posé
// comme une image sous les joueurs. Une image fixe coûte moins cher à
// l'affichage que des centaines de petits éléments redessinés à chaque image.
// Les lignes, les buts avec leurs filets et les drapeaux de coin restent
// dessinés en SVG (nets à toutes les tailles).

import { svg } from "./dom";

/** Géométrie du stade, en unités SVG. */
export interface GeometrieStade {
  /** Unités par mètre. */
  echelle: number;
  /** Bord le long des lignes de touche (gauche, droite). */
  margeX: number;
  /** Bord derrière les lignes de but (haut, bas) : plus grand, le téléphone a de la place en hauteur. */
  margeY: number;
}

/** Herbe hors du terrain et panneaux (en mètres), le long des touches et derrière les buts ;
 *  les tribunes vont jusqu'au bord. */
const HERBE_COTE_M = 1;
const HERBE_BOUT_M = 2.6;
const PANNEAUX_M = 0.65;

const LONGUEUR = 105;
const LARGEUR = 68;

/** Petit générateur à graine : le public est le même à chaque match. */
function aleatoire(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let enCache: { cle: string; url: Promise<string | null> } | null = null;

/** Image du décor (adresse d'un blob), peinte une fois par taille. */
export function imageStade(g: GeometrieStade, densite: number): Promise<string | null> {
  const cle = `${g.echelle}:${g.margeX}:${g.margeY}:${densite}`;
  if (enCache?.cle === cle) return enCache.url;
  const url = new Promise<string | null>((resoudre) => {
    try {
      const toile = peindre(g, densite);
      toile.toBlob((b) => resoudre(b ? URL.createObjectURL(b) : null), "image/png");
    } catch {
      resoudre(null);
    }
  });
  enCache = { cle, url };
  return url;
}

function peindre(g: GeometrieStade, densite: number): HTMLCanvasElement {
  const E = g.echelle;
  const MX = g.margeX;
  const MY = g.margeY;
  const W = LARGEUR * E + 2 * MX;
  const H = LONGUEUR * E + 2 * MY;
  const toile = document.createElement("canvas");
  toile.width = Math.round(W * densite);
  toile.height = Math.round(H * densite);
  const c = toile.getContext("2d")!;
  c.scale(densite, densite);
  const hasard = aleatoire(2026);

  // Coins arrondis de tout le stade.
  c.beginPath();
  c.roundRect(0, 0, W, H, 14);
  c.clip();

  const panneau = PANNEAUX_M * E;
  const xH = MX - HERBE_COTE_M * E; // début de l'herbe à gauche
  const yH = MY - HERBE_BOUT_M * E; // début de l'herbe en haut
  const xP = xH - panneau; // panneaux
  const yP = yH - panneau;

  // 1. Tribunes : gradins (rangées claires et sombres), public, allées, ombre du toit au bord.
  c.fillStyle = "#1F2B36";
  c.fillRect(0, 0, W, H);
  const rangee = 2.3;
  const gradins = (prof: number, horizontal: boolean, debut: number, fin: number, couleurs: string[], dedans: (d: number) => number) => {
    for (let d = 0.6, k = 0; d < prof - 0.4; d += rangee, k++) {
      const p = dedans(d);
      // Marche : bande un peu plus claire sous chaque rangée.
      c.fillStyle = k % 2 ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.07)";
      if (horizontal) c.fillRect(debut, p - rangee / 2, fin - debut, rangee);
      else c.fillRect(p - rangee / 2, debut, rangee, fin - debut);
      for (let t = debut + 1; t < fin - 0.5; t += 2) {
        if (hasard() < 0.07) continue; // sièges vides
        c.fillStyle = couleurs[Math.floor(hasard() * couleurs.length)]!;
        c.globalAlpha = 0.6 + hasard() * 0.35;
        c.beginPath();
        const x = horizontal ? t + (hasard() - 0.5) * 0.6 : p + (hasard() - 0.5) * 0.5;
        const y = horizontal ? p + (hasard() - 0.5) * 0.5 : t + (hasard() - 0.5) * 0.6;
        c.arc(x, y, 0.72 + hasard() * 0.3, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    }
  };
  // Public : ton camp (en bas) en bleu, l'adversaire (en haut) en rouge, mélangé sur les côtés.
  const couleursCote = ["#E9EEF3", "#3563C0", "#C2413D", "#F2B705", "#E9EEF3", "#3A4048", "#D9A07A", "#9AA7B4"];
  const couleursBas = ["#3563C0", "#3563C0", "#5B86DA", "#E9EEF3", "#3563C0", "#F2B705", "#3563C0"];
  const couleursHaut = ["#C2413D", "#C2413D", "#E06A63", "#E9EEF3", "#C2413D", "#3A4048", "#C2413D"];
  gradins(yP, true, 0, W, couleursHaut, (d) => yP - d);
  gradins(yP, true, 0, W, couleursBas, (d) => H - yP + d);
  gradins(xP, false, yP, H - yP, couleursCote, (d) => xP - d);
  gradins(xP, false, yP, H - yP, couleursCote, (d) => W - xP + d);
  // Allées : escaliers sombres qui coupent les tribunes.
  c.fillStyle = "rgba(10,16,22,0.6)";
  for (let x = W / 8; x < W - 1; x += W / 4) {
    c.fillRect(x - 0.8, 0, 1.6, yP);
    c.fillRect(x - 0.8, H - yP, 1.6, yP);
  }
  for (let y = yP + (H - 2 * yP) / 8; y < H - yP - 1; y += (H - 2 * yP) / 4) {
    c.fillRect(0, y - 0.8, xP, 1.6);
    c.fillRect(W - xP, y - 0.8, xP, 1.6);
  }
  // Ombre du toit : les rangées du haut des tribunes sont plus sombres.
  const toit = (x0: number, y0: number, x1: number, y1: number, x: number, y: number, w: number, h: number) => {
    const d = c.createLinearGradient(x0, y0, x1, y1);
    d.addColorStop(0, "rgba(8,12,18,0.55)");
    d.addColorStop(1, "rgba(8,12,18,0)");
    c.fillStyle = d;
    c.fillRect(x, y, w, h);
  };
  toit(0, 0, 0, yP * 0.7, 0, 0, W, yP);
  toit(0, H, 0, H - yP * 0.7, 0, H - yP, W, yP);
  toit(0, 0, xP * 0.8, 0, 0, 0, xP, H);
  toit(W, 0, W - xP * 0.8, 0, W - xP, 0, xP, H);

  // 2. Pelouse (terrain et herbe autour) : tonte en bandes et en damier.
  const wH = W - 2 * xH;
  const hH = H - 2 * yH;
  // Tout ce qui suit reste sur l'herbe (les bandes ne débordent pas sur les tribunes).
  c.save();
  c.beginPath();
  c.rect(xH, yH, wH, hH);
  c.clip();
  c.fillStyle = "#4A9656";
  c.fillRect(xH, yH, wH, hH);
  const bandes = 14;
  const hb = (LONGUEUR * E) / bandes;
  // Les bandes partent des lignes de but et continuent hors du terrain.
  for (let i = -2; i < bandes + 2; i++) {
    if (i % 2 === 0) continue;
    c.fillStyle = "#56A462";
    c.fillRect(xH, MY + i * hb, wH, hb);
  }
  const colonnes = 8;
  const lc = (LARGEUR * E) / colonnes;
  c.fillStyle = "rgba(255,255,255,0.045)";
  for (let j = -1; j < colonnes + 1; j += 2) c.fillRect(MX + j * lc, yH, lc, hH);
  // Brins d'herbe : petits traits clairs et sombres.
  const brins = Math.round(wH * hH * 0.5);
  for (let i = 0; i < brins; i++) {
    const x = xH + hasard() * wH;
    const y = yH + hasard() * hH;
    c.fillStyle = hasard() < 0.5 ? "rgba(20,60,25,0.16)" : "rgba(190,235,160,0.12)";
    c.fillRect(x, y, 0.35, 0.9 + hasard() * 0.8);
  }
  // Usure devant les buts et au rond central.
  const usure = (x: number, y: number, rx: number, ry: number, a: number) => {
    const d = c.createRadialGradient(x, y, 0, x, y, 1);
    d.addColorStop(0, `rgba(176,170,110,${a})`);
    d.addColorStop(1, "rgba(176,170,110,0)");
    c.save();
    c.translate(x, y);
    c.scale(rx, ry);
    c.translate(-x, -y);
    c.fillStyle = d;
    c.beginPath();
    c.arc(x, y, 1, 0, Math.PI * 2);
    c.fill();
    c.restore();
  };
  usure(W / 2, MY + 4 * E, 9 * E, 4 * E, 0.22);
  usure(W / 2, H - MY - 4 * E, 9 * E, 4 * E, 0.22);
  usure(W / 2, H / 2, 6 * E, 6 * E, 0.08);
  // Hors du terrain, l'herbe est un peu plus sombre.
  c.fillStyle = "rgba(0,30,10,0.16)";
  c.fillRect(xH, yH, wH, MY - yH);
  c.fillRect(xH, H - MY, wH, MY - yH);
  c.fillRect(xH, MY, MX - xH, H - 2 * MY);
  c.fillRect(W - MX, MY, MX - xH, H - 2 * MY);

  // 3. Lumière : quatre projecteurs dans les coins, bords plus sombres, ombre de la tribune à gauche.
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]] as const) {
    const l = c.createRadialGradient(x, y, 0, x, y, W * 0.75);
    l.addColorStop(0, "rgba(255,255,230,0.12)");
    l.addColorStop(1, "rgba(255,255,230,0)");
    c.fillStyle = l;
    c.fillRect(xH, yH, wH, hH);
  }
  const ombre = c.createLinearGradient(xH, 0, xH + 26 * E, 0);
  ombre.addColorStop(0, "rgba(0,20,10,0.22)");
  ombre.addColorStop(1, "rgba(0,20,10,0)");
  c.fillStyle = ombre;
  c.fillRect(xH, yH, 26 * E, hH);
  const vignette = c.createRadialGradient(W / 2, H / 2, Math.min(wH, hH) * 0.35, W / 2, H / 2, Math.max(wH, hH) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,15,5,0.2)");
  c.fillStyle = vignette;
  c.fillRect(xH, yH, wH, hH);

  c.restore();

  // 4. Panneaux publicitaires (marques inventées : formes simples, sans texte).
  const panneaux: { fond: string; motif: string }[] = [
    { fond: "#1E2F5B", motif: "#FFFFFF" },
    { fond: "#F4F6F8", motif: "#1E2F5B" },
    { fond: "#F2B705", motif: "#1B1F24" },
    { fond: "#14857F", motif: "#FFFFFF" },
    { fond: "#2B2F36", motif: "#F2B705" },
  ];
  let n = 0;
  const panneauEn = (x: number, y: number, w: number, h: number) => {
    const p = panneaux[n++ % panneaux.length]!;
    c.fillStyle = p.fond;
    c.fillRect(x, y, w, h);
    c.fillStyle = p.motif;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const t = Math.min(w, h);
    switch (n % 4) {
      case 0: // pastille
        c.beginPath();
        c.arc(cx, cy, t * 0.26, 0, Math.PI * 2);
        c.fill();
        break;
      case 1: // trois barres
        for (let k = -1; k <= 1; k++) {
          if (w > h) c.fillRect(cx + k * t * 0.55 - t * 0.12, cy - t * 0.28, t * 0.24, t * 0.56);
          else c.fillRect(cx - t * 0.28, cy + k * t * 0.55 - t * 0.12, t * 0.56, t * 0.24);
        }
        break;
      case 2: // anneau
        c.lineWidth = t * 0.14;
        c.strokeStyle = p.motif;
        c.beginPath();
        c.arc(cx, cy, t * 0.24, 0, Math.PI * 2);
        c.stroke();
        break;
      default: // losange
        c.beginPath();
        c.moveTo(cx, cy - t * 0.3);
        c.lineTo(cx + t * 0.3, cy);
        c.lineTo(cx, cy + t * 0.3);
        c.lineTo(cx - t * 0.3, cy);
        c.fill();
    }
  };
  const long = 9 * E; // un panneau = 9 m
  // Le long des lignes de touche.
  for (let y = yP; y < H - yP - 1; y += long) {
    const h = Math.min(long, H - yP - y) - 0.4;
    panneauEn(xP, y, panneau, h);
    panneauEn(W - xP - panneau, y, panneau, h);
  }
  // Derrière les buts.
  for (let x = xP; x < W - xP - 1; x += long) {
    const w = Math.min(long, W - xP - x) - 0.4;
    panneauEn(x, yP, w, panneau);
    panneauEn(x, H - yP - panneau, w, panneau);
  }
  // Ombre des panneaux sur l'herbe.
  const ombrePanneau = (x0: number, y0: number, x1: number, y1: number, w: number, h: number) => {
    const d = c.createLinearGradient(x0, y0, x1, y1);
    d.addColorStop(0, "rgba(0,0,0,0.28)");
    d.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = d;
    c.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, h);
  };
  ombrePanneau(xH, 0, xH + 2.4, 0, 2.4, H);
  ombrePanneau(W - xH, 0, W - xH - 2.4, 0, 2.4, H);
  ombrePanneau(0, yH, 0, yH + 2.4, W, 2.4);
  ombrePanneau(0, H - yH, 0, H - yH - 2.4, W, 2.4);

  return toile;
}

/** Buts avec leurs filets (vus du dessus, derrière la ligne de but) et
 *  drapeaux de coin. `X` et `Y` convertissent des mètres en unités SVG. */
export function dessinerButsEtDrapeaux(g: SVGGElement, X: (m: number) => number, Y: (m: number) => number): void {
  const profondeur = 2; // m
  for (const enHaut of [false, true]) {
    const yLigne = enHaut ? LONGUEUR : 0;
    const s = enHaut ? 1 : -1; // le filet est derrière la ligne
    const x0 = X(LARGEUR / 2 - 3.66);
    const x1 = X(LARGEUR / 2 + 3.66);
    const ya = Y(yLigne);
    const yb = Y(yLigne + s * profondeur);
    const yMin = Math.min(ya, yb);
    const h = Math.abs(yb - ya);
    const but = svg("g", { class: "match-but" }, g);
    svg("rect", { x: x0 + 1, y: yMin + (enHaut ? -1 : 1.5), width: x1 - x0, height: h, class: "match-but-ombre" }, but);
    svg("rect", { x: x0, y: yMin, width: x1 - x0, height: h, class: "match-filet" }, but);
    const mailles = svg("g", { class: "match-mailles" }, but);
    for (let x = x0 + 2; x < x1; x += 2) svg("line", { x1: x, y1: yMin, x2: x, y2: yMin + h }, mailles);
    for (let y = yMin + 1.6; y < yMin + h; y += 1.6) svg("line", { x1: x0, y1: y, x2: x1, y2: y }, mailles);
    // Cadre : poteaux et barre (sur la ligne), montants du filet.
    svg("path", { d: `M ${x0} ${ya} L ${x0} ${yb} L ${x1} ${yb} L ${x1} ${ya}`, class: "match-filet-cadre" }, but);
    svg("line", { x1: x0 - 0.6, y1: ya, x2: x1 + 0.6, y2: ya, class: "match-barre" }, but);
  }
  // Drapeaux de coin.
  for (const [mx, my] of [[0, 0], [LARGEUR, 0], [0, LONGUEUR], [LARGEUR, LONGUEUR]] as const) {
    const x = X(mx);
    const y = Y(my);
    const sx = mx === 0 ? -1 : 1;
    const d = svg("g", { class: "match-drapeau" }, g);
    svg("ellipse", { cx: x + sx * 1.5, cy: y + 1, rx: 2, ry: 0.8, class: "match-drapeau-ombre" }, d);
    svg("line", { x1: x, y1: y, x2: x, y2: y - 7, class: "match-drapeau-mat" }, d);
    svg("path", { d: `M ${x} ${y - 7} L ${x + sx * 5} ${y - 5.6} L ${x} ${y - 4.2} Z`, class: "match-drapeau-toile" }, d);
  }
}
