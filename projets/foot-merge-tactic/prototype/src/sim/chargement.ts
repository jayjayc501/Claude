// Point d'entrée des données du prototype (fichiers JSON du dossier data/).

import equipesBrut from "../data/equipes.json";
import postesBrut from "../data/postes.json";
import reglagesBrut from "../data/reglages.json";
import { Donnees } from "./donnees";
import type { DonneesPostes, Equipe, Reglages } from "./types";

export function chargerDonnees(): Donnees {
  return new Donnees(postesBrut as DonneesPostes);
}

export function chargerReglages(): Reglages {
  return structuredClone(reglagesBrut) as Reglages;
}

export function chargerEquipes(): { effectif: Equipe; adversaire: Equipe } {
  const brut = structuredClone(equipesBrut) as { effectif: Equipe; adversaire: Equipe };
  return brut;
}
