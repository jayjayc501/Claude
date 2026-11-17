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
// Avec le ballon : l'équipe s'étire entre deux lignes. La ligne arrière
// (défenseurs) se tient derrière le ballon ; la ligne avant (attaquants) se
// cale juste en deçà de la ligne défensive adverse, celle que l'adversaire
// VISE d'après la position du ballon (pas sa position du moment : sinon un
// défenseur bousculé recule, l'attaquant le suit, et la ligne s'enfonce
// jusque dans la surface). Entre les deux lignes, chaque joueur garde l'ordre
// de profondeur choisi au placement : ce qui est placé haut joue haut.
// En largeur, l'équipe s'écarte.

import type { Phase, PointNorm, Poste, RectNorm, Reglages } from "./types";

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Largeur du terrain en mètres (les règles de largeur sont en mètres). */
const LARGEUR_M = 68;

/** Hauteur (mètres depuis son but) de la ligne défensive, selon le ballon. */
export function hauteurLigneDefensiveM(ballon: PointNorm, reglages: Reglages, longueurM: number): number {
  const l = reglages.projection.defense.ligneDefensive;
  return borner(ballon.y * longueurM - l.distanceDerriereBallonM, l.hauteurMinM, l.hauteurMaxM);
}

/** Hauteurs tenues par les lignes pendant le match (mètres depuis son but).
 *  Sans elles, on prend celles que donne le ballon (forme « au repos »). */
export interface LignesTenues {
  /** Hauteur de notre ligne défensive quand on défend. */
  ligneDefM?: number;
  /** Hauteur de la ligne défensive adverse, dans notre repère. */
  ligneAdverseM?: number;
}

function projeterDefense(
  base: PointNorm,
  poste: Poste,
  ballon: PointNorm,
  reglages: Reglages,
  longueurM: number,
  tenues: LignesTenues,
): PointNorm {
  const d = reglages.projection.defense;
  const ligneDef = tenues.ligneDefM ?? hauteurLigneDefensiveM(ballon, reglages, longueurM);
  // Décalage dû au placement : la position dans le rectangle, fortement réduite.
  const centreRectY = poste.rect.y + poste.rect.h / 2;
  const decalageM = (base.y - centreRectY) * longueurM * d.influencePlacement[poste.ligneDefense];
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
  // Les défenseurs centraux restent proches l'un de l'autre (une dizaine de mètres,
  // 14/11) : ce sont les latéraux qui tiennent la largeur (référence §6 et §9.1).
  const resserre = poste.id === "DC" ? d.resserrementDC : 1;
  const xM = centreBlocM + (base.x - 0.5) * largeur * resserre;
  return { x: xM / LARGEUR_M, y: yM / longueurM };
}

/** Ligne défensive que vise l'adversaire, en mètres depuis NOTRE but
 *  (repère de l'équipe qui a le ballon). Fonction du ballon seulement. */
export function ligneAdverseM(ballon: PointNorm, reglages: Reglages, longueurM: number): number {
  return longueurM - hauteurLigneDefensiveM({ x: 1 - ballon.x, y: 1 - ballon.y }, reglages, longueurM);
}

/** Lignes arrière et avant de l'équipe qui a le ballon (mètres depuis son but). */
export function lignesAttaqueM(
  ballon: PointNorm,
  reglages: Reglages,
  longueurM: number,
  ligneAdverse: number = ligneAdverseM(ballon, reglages, longueurM),
): { arriereM: number; avantM: number } {
  const a = reglages.projection.attaque;
  const ballonM = ballon.y * longueurM;
  // Personne n'est hors-jeu derrière le ballon : si le ballon a dépassé la
  // ligne adverse, la ligne avant peut aller jusqu'à lui.
  const avantM = Math.max(ligneAdverse, ballonM) - a.margeLigneAdverseM;
  let arriereM = borner(ballonM - a.distanceDefenseBallonM, a.ligneArriereMinM, a.ligneArriereMaxM);
  arriereM = borner(arriereM, avantM - a.longueurEquipeM.max, avantM - a.longueurEquipeM.min);
  return { arriereM, avantM };
}

function projeterAttaque(
  base: PointNorm,
  poste: Poste,
  ballon: PointNorm,
  reglages: Reglages,
  longueurM: number,
  tenues: LignesTenues,
  vrai: PointNorm = ballon,
): PointNorm {
  const a = reglages.projection.attaque;
  const suivi = poste.suiviBallon ?? 1;
  // Coulissement vers le côté du ballon (12/11 : « il faut coulisser ») ; les
  // joueurs de côté du côté opposé gardent la largeur (changement d'aile possible).
  const cote = poste.id === "DG" || poste.id === "DD" || poste.id === "AG" || poste.id === "AD";
  const oppose = cote && (base.x - 0.5) * (ballon.x - 0.5) < 0;
  const glisse = a.glissementLateral * (oppose ? a.glissementCoteOppose : 1);
  // Charnière centrale (14/11, « une charnière très très proche ») : avec le ballon
  // aussi, les défenseurs centraux restent près de l'axe ; les latéraux tiennent la largeur.
  const resserre = poste.id === "DC" ? a.resserrementDC : 1;
  const x = 0.5 + (base.x - 0.5) * a.ecartement * resserre + (ballon.x - 0.5) * glisse * suivi;
  const { arriereM, avantM } = lignesAttaqueM(ballon, reglages, longueurM, tenues.ligneAdverseM);

  if (poste.ligneDefense === "gardien") {
    const g = a.gardien;
    // Case « avancée » du gardien : quelques mètres de plus, comme sur le demi-terrain.
    const decalageM = (base.y - (poste.rect.y + poste.rect.h / 2)) * longueurM;
    const yM = borner(arriereM - g.distanceDerriereLigneM + decalageM, g.minM, g.maxM);
    return { x, y: yM / longueurM };
  }

  const p = poste.profondeurPlateau;
  const t = borner((base.y - p.basY) / (p.hautY - p.basY), 0, 1);
  let yM = arriereM + t * (avantM - arriereM);
  // Surnombre côté ballon (12/11, « apporter du surnombre, DG/DD et MDC/MC/MOC,
  // encore plus s'ils sont hauts ») : le latéral et les milieux proches du
  // ballon montent, d'autant plus que le ballon est haut et qu'ils sont placés
  // haut. Les défenseurs centraux et le latéral opposé restent en couverture.
  if (poste.id === "DG" || poste.id === "DD" || poste.id === "MC") {
    const s = a.surnombre;
    // Le surnombre suit le vrai ballon (pas le repère de forme, plus lent) :
    // on vient aider tout de suite là où il est.
    const proche = borner(1 - Math.abs(x - vrai.x) / s.proximite, 0, 1);
    const haut = borner((vrai.y - s.ballonDebut) / (s.ballonPlein - s.ballonDebut), 0, 1);
    // Placé bas : il vient en soutien 6 m derrière le ballon (défense de
    // couverture, au moins 4 joueurs derrière lui) ; placé haut : jusqu'à la ligne avant.
    const ballonM = Math.min(ballon.y, vrai.y) * longueurM;
    const plafond = Math.max(yM, t < 0.5 ? ballonM - 6 : ballonM - 6 + (t - 0.5) * 2 * (avantM - 2 - (ballonM - 6)));
    yM = Math.min(plafond, yM + s.distanceM * proche * haut * (0.5 + 0.5 * t));
  }
  return { x, y: yM / longueurM };
}

/** Position de match d'un point du demi-terrain (repère de l'équipe). */
export function projeter(
  base: PointNorm,
  poste: Poste,
  phase: Phase,
  ballon: PointNorm,
  reglages: Reglages,
  longueurM: number,
  tenues: LignesTenues = {},
  /** Vrai ballon (perçu), quand `ballon` est le repère de forme de l'équipe. */
  vrai: PointNorm = ballon,
): PointNorm {
  const p =
    phase === "defense"
      ? projeterDefense(base, poste, ballon, reglages, longueurM, tenues)
      : projeterAttaque(base, poste, ballon, reglages, longueurM, tenues, vrai);
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
  tenues: LignesTenues = {},
): RectNorm {
  const a = projeter({ x: rect.x, y: rect.y }, poste, phase, ballon, reglages, longueurM, tenues);
  const b = projeter({ x: rect.x + rect.w, y: rect.y + rect.h }, poste, phase, ballon, reglages, longueurM, tenues);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}
