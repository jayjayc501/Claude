// Outils de lecture, sans effet sur le match (aucun tirage, aucun changement
// d'état) : géométrie, avantages tirés des notes et des fusions, lecture de la
// situation (avant bouché, contre-pressing, contre-attaque).

import { PARAMETRES_NOTES as PN } from "../notes";
import type { Camp, JoueurSim } from "../simulation";
import type { PointM } from "../types";
import type { BallonReel } from "../ballon";

/** Demi-largeur du but (m). */
export const DEMI_BUT_M = 3.66;

export function dist(a: PointM, b: PointM): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance d'un point au segment [a, b]. */
export function distSegment(p: PointM, a: PointM, b: PointM): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// --- Notes et fusions -------------------------------------------------------

/** Niveau de fusion d'un joueur (14/11 : un joueur fusionné pèse plus dans le jeu). */
export function fusions(j: JoueurSim): number {
  return j.joueur.fusions ?? 0;
}

/** Avantage du porteur en 1 contre 1, en points de notes : dribble contre duel,
 *  plus une part de l'écart d'accélération (la vitesse fait passer). */
export function avantage1c1(p: JoueurSim, o: JoueurSim): number {
  return p.notes.dribble - o.notes.duel + PN.unContreUn.poidsVitesse * (p.notes.acceleration - o.notes.acceleration);
}

/** Avance de vitesse de pointe (points de notes, 0 au mieux) d'un joueur sur l'adversaire le plus proche d'un point. */
export function avantageVitesse(q: JoueurSim, point: PointM, adverses: JoueurSim[]): number {
  let o: JoueurSim | null = null;
  for (const a of adverses) if (a.poste.id !== "G" && (!o || dist(a.pos, point) < dist(o.pos, point))) o = a;
  return o ? Math.max(0, q.notes.pointe - o.notes.pointe) : 0;
}

/** Note de passe : multiplicateur de l'imprécision (1 à la référence). */
export function precisionPasse(j: JoueurSim | null): number {
  const e = j ? j.notes.passe - PN.reference : 0;
  return e === 0 ? 1 : Math.exp(-e * PN.technique.imprecisionPasseParPoint);
}

/** Note de duel : portée sur le ballon (1 à la référence ; gardien : toujours 1). */
export function portee(j: JoueurSim): number {
  return j.poste.id === "G" ? 1 : 1 + (j.notes.duel - PN.reference) * PN.physique.porteeParPoint;
}

// --- Lecture de la situation ------------------------------------------------

/** Un adversaire (hors gardien) devant le porteur, dans un cône de
 *  construction.boucheM : l'avant est bouché, on ne fonce pas dedans. */
export function avantBouche(b: BallonReel, p: JoueurSim): boolean {
  const s = b.sim;
  const sens = p.camp === 0 ? 1 : -1;
  const bo = s.reg(p.camp).ballon.construction.boucheM;
  return s.joueurs.some((o) => {
    if (o.camp === p.camp || o.poste.id === "G") return false;
    const avant = (o.pos.y - p.pos.y) * sens;
    return avant > 0 && avant < bo && Math.abs(o.pos.x - p.pos.x) < 2 + avant * 0.6;
  });
}

/** Effets du contre-pressing adverse sur ce porteur (neutres hors de la fenêtre de contre-pressing). */
export function contrePresse(b: BallonReel, p: JoueurSim): { precipite: number; gene: number } {
  const adv: Camp = p.camp === 0 ? 1 : 0;
  const cp = b.sim.reg(adv).ballon.contrePressing;
  const actif = b.perte !== null && b.perte.camp === adv && b.sim.temps - b.perte.a < cp.dureeS;
  return actif ? { precipite: cp.precipite, gene: cp.gene } : { precipite: 1, gene: 1 };
}

/** Secondes depuis que l'équipe `camp` a récupéré le ballon (Infinity : pas de récupération connue). */
export function depuisRecuperation(b: BallonReel, camp: Camp): number {
  return b.perte && b.perte.camp !== camp ? b.sim.temps - b.perte.a : Infinity;
}
