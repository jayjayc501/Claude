// Note de match sur 10 (13/11, demande du concepteur : « pourquoi pas une note
// sur le match »). PROPOSITION : 6 de base, puis ce que le joueur a fait
// (buts, passes décisives, passes, tirs cadrés, dribbles, tacles, arrêts…),
// les buts encaissés pour le gardien et les défenseurs, et le score.
// Les chiffres sont dans data/noteMatch.json.

import brut from "../data/noteMatch.json";
import type { StatsJoueur } from "./ballon";

export interface BaremeNote {
  base: number;
  min: number;
  max: number;
  but: number;
  passeDecisive: number;
  passeReussie: number;
  passeRatee: number;
  tirCadre: number;
  tirNonCadre: number;
  dribbleReussi: number;
  dribbleRate: number;
  tacle: number;
  interception: number;
  faute: number;
  arret: number;
  encaisseGardien: number;
  encaisseDefenseur: number;
  victoire: number;
}

export const BAREME = brut as unknown as BaremeNote;

/** Note sur 10 (une décimale) d'un joueur, d'après ses statistiques.
 *  `encaisses` : buts encaissés par son équipe ; `ecart` : son score moins celui de l'adversaire. */
export function noteMatch(st: StatsJoueur, poste: string, encaisses: number, ecart: number, b: BaremeNote = BAREME): number {
  let n = b.base;
  n += st.buts * b.but + st.passesDecisives * b.passeDecisive;
  n += st.passesReussies * b.passeReussie + Math.max(0, st.passes - st.passesReussies) * b.passeRatee;
  n += st.tirsCadres * b.tirCadre + Math.max(0, st.tirs - st.tirsCadres) * b.tirNonCadre;
  n += st.dribblesReussis * b.dribbleReussi + Math.max(0, st.dribbles - st.dribblesReussis) * b.dribbleRate;
  n += st.tacles * b.tacle + st.interceptions * b.interception + st.fautes * b.faute;
  n += st.arrets * b.arret;
  if (poste === "G") n += encaisses * b.encaisseGardien;
  else if (poste === "DC" || poste === "DG" || poste === "DD") n += encaisses * b.encaisseDefenseur;
  n += Math.sign(ecart) * b.victoire;
  return Math.round(Math.max(b.min, Math.min(b.max, n)) * 10) / 10;
}
