// Physique du ballon et règles : conduite balle au pied, roulement du ballon
// libre (frottement), sorties (touche, corner, six mètres), buts, surface de
// réparation et hors-jeu.

import type { Camp, JoueurSim } from "../simulation";
import type { PointM } from "../types";
import type { BallonReel } from "../ballon";
import { preparerEngagement } from "./arrets";
import { DEMI_BUT_M } from "./outils";
import { statsJoueur } from "./stats";

/** Ballon aux pieds : il suit le porteur, à 0,7 m devant lui, dans sa direction
 *  de course lissée (le ballon ne saute pas d'un côté à l'autre du joueur). */
export function conduire(b: BallonReel): void {
  const p = b.porteur!;
  const sens = p.camp === 0 ? 1 : -1;
  const v = Math.hypot(p.vit.x, p.vit.y);
  const cible = v > 0.5 ? { x: p.vit.x / v, y: p.vit.y / v } : { x: 0, y: sens };
  const lx = b.dir.x * 0.85 + cible.x * 0.15;
  const ly = b.dir.y * 0.85 + cible.y * 0.15;
  const ln = Math.hypot(lx, ly) || 1;
  b.dir = { x: lx / ln, y: ly / ln };
  const dx = b.dir.x;
  const dy = b.dir.y;
  const L = b.sim.donnees.longueurM;
  const W = b.sim.donnees.largeurM;
  b.sim.ballon = {
    x: Math.min(W - 0.2, Math.max(0.2, p.pos.x + dx * 0.7)),
    y: Math.min(L - 0.2, Math.max(0.2, p.pos.y + dy * 0.7)),
  };
  b.vit = { ...p.vit };
}

/** Ballon libre : il avance et ralentit ; s'il franchit une ligne, but ou sortie. */
export function rouler(b: BallonReel, dt: number): void {
  const s = b.sim;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const x = s.ballon.x + b.vit.x * dt;
  const y = s.ballon.y + b.vit.y * dt;
  const f = Math.exp(-s.reglages.ballon.frottementParS * dt);
  b.vit = { x: b.vit.x * f, y: b.vit.y * f };
  if (Math.hypot(b.vit.x, b.vit.y) < 0.2) b.vit = { x: 0, y: 0 };

  if (y <= 0 || y >= L) {
    ligneDeBut(b, x, y);
    return;
  }
  if (x <= 0 || x >= W) {
    ligneDeTouche(b, x, y);
    return;
  }
  s.ballon = { x, y };
}

/** Ballon sorti en touche : remise à l'équipe qui ne l'a pas touché en dernier. */
function ligneDeTouche(b: BallonReel, x: number, y: number): void {
  const s = b.sim;
  const W = s.donnees.largeurM;
  b.stats.sorties++;
  const camp: Camp = b.dernier ? (b.dernier.camp === 0 ? 1 : 0) : s.possession;
  b.stats.touches++;
  b.remettre({ x: x <= 0 ? 0.5 : W - 0.5, y }, camp, "touche", "Touche");
}

/** Ballon qui franchit une ligne de but : but entre les poteaux, sinon corner
 *  (dernier touché par un défenseur) ou six mètres. */
function ligneDeBut(b: BallonReel, x: number, y: number): void {
  const s = b.sim;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const marqueur: Camp = y >= L ? 0 : 1;
  if (Math.abs(x - W / 2) <= DEMI_BUT_M) {
    compterBut(b, marqueur);
    preparerEngagement(b, marqueur === 0 ? 1 : 0, "But !");
    return;
  }
  b.stats.sorties++;
  if (b.dernier && b.dernier.camp !== marqueur) {
    // dernier touché par un défenseur : corner
    b.stats.corners[marqueur]++;
    b.remettre({ x: x < W / 2 ? 0.5 : W - 0.5, y: y >= L ? L - 0.5 : 0.5 }, marqueur, "corner", "Corner");
  } else {
    // Six mètres : au coin de la surface de but, du côté de la sortie, joué par le gardien.
    const camp: Camp = marqueur === 0 ? 1 : 0;
    const gardien = s.joueurs.find((j) => j.camp === camp && j.poste.id === "G") ?? null;
    b.remettre({ x: x < W / 2 ? W / 2 - 9.16 : W / 2 + 9.16, y: y >= L ? L - 5.5 : 5.5 }, camp, "sixMetres", "Six mètres", gardien);
  }
}

/** But : score, buteur et passeur décisif (note de match, 13/11), liste des buts. */
function compterBut(b: BallonReel, marqueur: Camp): void {
  const s = b.sim;
  s.score[marqueur]++;
  // Note de match (13/11) : buteur, passeur décisif (passe reçue dans les 12 s).
  if (b.dernier && b.dernier.camp === marqueur) {
    statsJoueur(b, b.dernier).buts++;
    const pr = b.passeReussie;
    if (pr && pr.vers === b.dernier && s.temps - pr.t < 12) statsJoueur(b, pr.de).passesDecisives++;
  }
  // Buteur (13/11) : le dernier à avoir touché le ballon ; contre son camp s'il est de l'autre équipe.
  const m = s.minutesJouees();
  b.buts.push({
    camp: marqueur,
    joueur: b.dernier?.joueur.nom ?? null,
    contreSonCamp: !!b.dernier && b.dernier.camp !== marqueur,
    minute: Math.min(s.debutPeriode > 0 ? 90 : 45, Math.floor(m.affilee) + 1 + (s.debutPeriode > 0 ? 45 : 0)),
  });
}

/** Le point est-il dans la surface de réparation que défend ce camp ? */
export function dansSurface(b: BallonReel, pt: PointM, campDefenseur: Camp): boolean {
  const r = b.sim.reglages.ballon;
  const W = b.sim.donnees.largeurM;
  const L = b.sim.donnees.longueurM;
  const deSonBut = campDefenseur === 0 ? pt.y : L - pt.y;
  return deSonBut <= r.surface.profondeurM && Math.abs(pt.x - W / 2) <= r.surface.demiLargeurM;
}

/** Hors-jeu : dans le camp adverse, plus près du but adverse que le ballon et
 *  que l'avant-dernier adversaire, au moment de la passe. */
export function estHorsJeu(b: BallonReel, q: JoueurSim): boolean {
  const L = b.sim.donnees.longueurM;
  const prof = (y: number) => (q.camp === 0 ? y : L - y); // profondeur vers le but adverse
  const dq = prof(q.pos.y);
  if (dq <= L / 2 || dq <= prof(b.sim.ballon.y)) return false;
  const adv = b.sim.joueurs
    .filter((o) => o.camp !== q.camp)
    .map((o) => prof(o.pos.y))
    .sort((a, c) => c - a);
  return dq > (adv[1] ?? L) + b.sim.reglages.ballon.horsJeuToleranceM;
}
