// Point d'entrée des données du prototype (fichiers JSON du dossier data/).

import equipesBrut from "../data/equipes.json";
import postesBrut from "../data/postes.json";
import reglagesBrut from "../data/reglages.json";
import { Donnees } from "./donnees";
import { convertirComposition } from "./placement";
import type { DonneesPostes, Equipe, Reglages } from "./types";

/** Données du plateau demandé (par défaut celui des données : hexagones). */
export function chargerDonnees(plateau?: string): Donnees {
  return new Donnees(postesBrut as DonneesPostes, plateau);
}

export function chargerReglages(): Reglages {
  return structuredClone(reglagesBrut) as Reglages;
}

/** Les deux équipes, compositions converties pour le plateau de `donnees`
 *  (elles sont écrites pour un plateau donné, celui des carrés). */
export function chargerEquipes(donnees: Donnees = chargerDonnees()): { effectif: Equipe; adversaire: Equipe } {
  const brut = structuredClone(equipesBrut) as { plateauDesCompositions: string; effectif: Equipe; adversaire: Equipe };
  const source = chargerDonnees(brut.plateauDesCompositions);
  for (const e of [brut.effectif, brut.adversaire]) e.composition = convertirComposition(e.composition, source, donnees);
  return { effectif: brut.effectif, adversaire: brut.adversaire };
}
