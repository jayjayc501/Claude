// Règles de projection : une position choisie sur le demi-terrain (coup
// d'envoi) devient une position de match, selon que l'équipe attaque ou
// défend, et selon la position du ballon. Principes tirés de
// docs/reference-football.md (§3 et §9). Tous les chiffres viennent de
// reglages.json et postes.json.
//
// Sans le ballon : l'équipe défend PAR LIGNES. Chaque poste rejoint sa ligne
// (défense, milieu, attaque) ; la hauteur de la ligne défensive suit le
// ballon dans les limites du bloc ; les autres lignes se placent devant elle.
// Le placement choisi ne joue plus qu'un peu en profondeur (un latéral placé
// haut revient dans la ligne de défense). En largeur, chaque ligne garde
// l'ordre gauche-droite des joueurs, se resserre et coulisse vers le ballon.
//
// Avec le ballon : le placement compte pleinement. Chaque case monte de sa
// distance, l'équipe s'écarte en largeur, et tout le bloc avance ou recule
// avec le ballon (construction basse ou attaque placée). La simulation
// retient ensuite les attaquants au niveau de la ligne du hors-jeu adverse.

import type { Phase, PointNorm, Poste, RectNorm, Reglages } from "./types";

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Largeur du terrain en mètres (les règles de largeur sont en mètres). */
const LARGEUR_M = 68;

/** Hauteur (mètres depuis son but) de la ligne défensive, selon le ballon. */
export function hauteurLigneDefensiveM(ballon: PointNorm, reglages: Reglages, longueurM: number): number {
  const l = reglages.projection.defense.ligneDefensive;
  return borner(ballon.y * longueurM - l.distanceDerriereBallonM, l.hauteurMinM, l.hauteurMaxM);
}

function projeterDefense(base: PointNorm, poste: Poste, ballon: PointNorm, reglages: Reglages, longueurM: number): PointNorm {
  const d = reglages.projection.defense;
  const ligneDef = hauteurLigneDefensiveM(ballon, reglages, longueurM);
  // Décalage dû au placement : la position dans le rectangle, fortement réduite.
  const centreRectY = poste.rect.y + poste.rect.h / 2;
  const decalageM = (base.y - centreRectY) * longueurM * d.influencePlacement;
  const ballonXM = ballon.x * LARGEUR_M;

  if (poste.ligneDefense === "gardien") {
    const g = d.gardien;
    const yM = borner(ligneDef - g.distanceDerriereLigneM + decalageM, g.minM, g.maxM);
    const xM = LARGEUR_M / 2 + (ballonXM - LARGEUR_M / 2) * g.suiviLateral;
    return { x: xM / LARGEUR_M, y: yM / longueurM };
  }

  const ecart = poste.ligneDefense === "defense" ? 0 : d.ecartLignesM[poste.ligneDefense];
  const yM = ligneDef + ecart + decalageM;
  const largeur = d.largeurLigneM[poste.ligneDefense];
  const centreBlocM = LARGEUR_M / 2 + (ballonXM - LARGEUR_M / 2) * d.suiviLateral;
  const xM = centreBlocM + (base.x - 0.5) * largeur;
  return { x: xM / LARGEUR_M, y: yM / longueurM };
}

function projeterAttaque(
  base: PointNorm,
  poste: Poste,
  ballon: PointNorm,
  reglages: Reglages,
  longueurM: number,
  monteeM: number,
): PointNorm {
  const a = reglages.projection.attaque;
  const suivi = poste.suiviBallon ?? 1;
  const dyMax = a.decalageMaxM / longueurM;
  return {
    x: 0.5 + (base.x - 0.5) * a.ecartement + (ballon.x - 0.5) * a.glissementLateral * suivi,
    y: base.y + monteeM / longueurM + borner((ballon.y - a.profondeurReference) * a.suiviProfondeur, -dyMax, dyMax) * suivi,
  };
}

/**
 * Position de match d'un point du demi-terrain (repère de l'équipe).
 * `monteeM` : montée en attaque de la case (par défaut celle du poste).
 */
export function projeter(
  base: PointNorm,
  poste: Poste,
  phase: Phase,
  ballon: PointNorm,
  reglages: Reglages,
  longueurM: number,
  monteeM: number = poste.monteeAttaqueM,
): PointNorm {
  const p =
    phase === "defense"
      ? projeterDefense(base, poste, ballon, reglages, longueurM)
      : projeterAttaque(base, poste, ballon, reglages, longueurM, monteeM);
  const l = reglages.projection.limites;
  return { x: borner(p.x, l.xMin, l.xMax), y: borner(p.y, l.yMin, l.yMax) };
}

/** Rectangle d'un poste déplacé par les mêmes règles (pour l'afficher en match). */
export function projeterRect(
  rect: RectNorm,
  poste: Poste,
  phase: Phase,
  ballon: PointNorm,
  reglages: Reglages,
  longueurM: number,
): RectNorm {
  const a = projeter({ x: rect.x, y: rect.y }, poste, phase, ballon, reglages, longueurM);
  const b = projeter({ x: rect.x + rect.w, y: rect.y + rect.h }, poste, phase, ballon, reglages, longueurM);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}
