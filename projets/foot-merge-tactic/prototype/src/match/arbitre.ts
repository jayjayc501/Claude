// Arbitre de match (13/11 au soir, préparation du mode en ligne) : celui qui
// calcule le match. L'écran du match ne fait plus avancer le moteur ; il
// demande chaque mi-temps à l'arbitre et en lit le film (voir film.ts).
//
// Aujourd'hui : l'arbitre local (arbitreLocal.ts) calcule sur le téléphone,
// par petits morceaux, en avance sur l'affichage. Plus tard : un arbitre
// serveur, avec la même interface, recevra les choix des joueurs et enverra
// le film ; l'écran ne changera pas.

import type { OptionsInfluences } from "../sim/influences";
import type { Equipe } from "../sim/types";
import type { Film } from "./film";

/** Une mi-temps : 180 s de jeu simulé (environ 51 s à l'écran en vitesse ×3,5). */
export const DUREE_MI_TEMPS_S = 180;

/** Choix faits sur l'écran du match (avant le coup d'envoi ou à la mi-temps). */
export interface ChoixEcran {
  /** Tactiques et styles activés ou coupés. */
  options: OptionsInfluences;
  /** Tactique choisie sur l'écran du match pour chaque équipe (null : celle de l'équipe). */
  tactiques: [string | null, string | null];
}

/** Choix de la mi-temps : ceux de l'écran du match, et ton équipe après les
 *  changements faits sur l'écran de préparation (places, remplaçants, tactique). */
export interface ChoixMiTemps extends ChoixEcran {
  equipe0: Equipe;
}

export interface ArbitreMatch {
  /** Nouveau match (équipes, graine). Rien n'est joué : le film renvoyé n'a
   *  qu'une image, les joueurs à leur place avant le coup d'envoi. */
  nouveauMatch(equipes: [Equipe, Equipe], graine: number): Film;
  /** Coup d'envoi : calcule la 1re mi-temps avec les choix d'avant le match. */
  premiereMiTemps(choix: ChoixEcran): Film;
  /** Mi-temps : applique les choix du joueur et calcule la 2e mi-temps à partir
   *  de l'état exact de la fin de la 1re. */
  secondeMiTemps(choix: ChoixMiTemps): Film;
  /** Arrête les calculs en cours (match abandonné). */
  arreter(): void;
}
