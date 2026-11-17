// Statistiques du match : par équipe (StatsBallon), par joueur (StatsJoueur,
// pour la note de match du 13/11) et trace des actions réussies grâce à un
// style (14/11, pour l'écran). Simple comptage : rien ici ne change le jeu.

import type { JoueurSim } from "../simulation";
import type { BallonReel } from "../ballon";

/** Statistiques d'un joueur pendant le match (13/11, note de match). */
export interface StatsJoueur {
  passes: number;
  passesReussies: number;
  tirs: number;
  tirsCadres: number;
  buts: number;
  passesDecisives: number;
  dribbles: number;
  dribblesReussis: number;
  tacles: number;
  interceptions: number;
  fautes: number;
  arrets: number;
}

export function statsVides(): StatsJoueur {
  return { passes: 0, passesReussies: 0, tirs: 0, tirsCadres: 0, buts: 0, passesDecisives: 0, dribbles: 0, dribblesReussis: 0, tacles: 0, interceptions: 0, fautes: 0, arrets: 0 };
}

export interface StatsBallon {
  passes: [number, number];
  passesReussies: [number, number];
  /** Somme des longueurs de passe (m), passes vers l'avant (5 m gagnés ou plus), passes longues (25 m ou plus). */
  distancePasses: [number, number];
  /** Somme des mètres gagnés vers le but adverse par les passes. */
  gainPasses: [number, number];
  passesAvant: [number, number];
  passesLongues: [number, number];
  interceptions: [number, number];
  tacles: [number, number];
  tirs: [number, number];
  contres: number;
  touches: number;
  centres: [number, number];
  degagements: [number, number];
  fautes: [number, number];
  penalties: [number, number];
  corners: [number, number];
  horsJeu: [number, number];
  dribbles: [number, number];
  dribblesReussis: [number, number];
  arrets: [number, number];
  sorties: number;
  /** 14/11 : montées de latéral et repiquages d'ailier lancés. */
  montees: [number, number];
  repiquages: [number, number];
}

/** Statistiques d'équipe à zéro (l'ordre des clés est celui des films et des empreintes). */
export function statsBallonVides(): StatsBallon {
  return {
    passes: [0, 0],
    passesReussies: [0, 0],
    distancePasses: [0, 0],
    gainPasses: [0, 0],
    passesAvant: [0, 0],
    passesLongues: [0, 0],
    interceptions: [0, 0],
    tacles: [0, 0],
    tirs: [0, 0],
    contres: 0,
    touches: 0,
    centres: [0, 0],
    degagements: [0, 0],
    fautes: [0, 0],
    penalties: [0, 0],
    corners: [0, 0],
    horsJeu: [0, 0],
    dribbles: [0, 0],
    dribblesReussis: [0, 0],
    arrets: [0, 0],
    sorties: 0,
    montees: [0, 0],
    repiquages: [0, 0],
  };
}

/** Statistiques d'un joueur (créées à la demande), rangées par « camp:id ». */
export function statsJoueur(b: BallonReel, j: JoueurSim): StatsJoueur {
  const k = `${j.camp}:${j.joueur.id}`;
  let x = b.statsJoueurs.get(k);
  if (!x) b.statsJoueurs.set(k, (x = statsVides()));
  return x;
}

/** Le style du joueur vient de faire la différence (14/11) : on le note pour l'écran. */
export function noterStyle(b: BallonReel, j: JoueurSim, styles: string[]): void {
  const st = j.joueur.style;
  if (st && styles.includes(st) && b.sim.options.styles) b.actionsStyle.push({ t: b.sim.temps, camp: j.camp, id: j.joueur.id, style: st });
}
