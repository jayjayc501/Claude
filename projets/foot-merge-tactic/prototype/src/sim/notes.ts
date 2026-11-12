// Caractéristiques des joueurs (12/11).
// VALIDÉ : 4 notes affichées, 2 sous-notes chacune ; le gardien n'a pas
// encore de notes (ses 4 caractéristiques viendront plus tard).
// PROPOSITION : le moteur n'utilise que les sous-notes ; chaque action compare
// celle de l'un à celle de l'adversaire direct (dribble contre duel, puissance
// contre gardien…). À écart nul, la probabilité est celle du moteur : avec 65
// partout (valeur par défaut), le moteur ne change pas. Chiffres : data/notes.json.

import brut from "../data/notes.json";
import type { Joueur, Notes } from "./types";

export const SOUS_NOTES = ["acceleration", "pointe", "passe", "dribble", "precision", "puissance", "duel", "endurance"] as const;

/** Les 4 notes affichées sur la carte, et leurs sous-notes. */
export const NOTES: { code: string; nom: string; sous: [keyof Notes, keyof Notes] }[] = [
  { code: "VIT", nom: "Vitesse", sous: ["acceleration", "pointe"] },
  { code: "TEC", nom: "Technique", sous: ["passe", "dribble"] },
  { code: "TIR", nom: "Tir", sous: ["precision", "puissance"] },
  { code: "PHY", nom: "Physique", sous: ["duel", "endurance"] },
];

export const NOMS_SOUS_NOTES: Record<keyof Notes, string> = {
  acceleration: "Accélération",
  pointe: "Vitesse de pointe",
  passe: "Passe",
  dribble: "Dribble",
  precision: "Précision",
  puissance: "Puissance",
  duel: "Duel",
  endurance: "Endurance",
};

export interface ParametresNotes {
  reference: number;
  echelle: number;
  vitesse: { pointeParPoint: number; accelerationParPoint: number };
  technique: { imprecisionPasseParPoint: number; interceptionParPoint: number };
  tir: { erreurParPoint: number; puissanceParPoint: number; poidsPuissanceArret: number };
  physique: { tacleParPoint: number; fautesParPoint: number; porteeParPoint: number };
  unContreUn: { poidsVitesse: number; poidsTentative: number };
}

export const PARAMETRES_NOTES = brut as unknown as ParametresNotes;

/** Sous-notes complètes d'un joueur : celles qui manquent valent la référence. */
export function notesDe(joueur: Joueur, p: ParametresNotes = PARAMETRES_NOTES): Notes {
  const n = joueur.notes ?? {};
  const r = {} as Notes;
  for (const cle of SOUS_NOTES) r[cle] = n[cle] ?? p.reference;
  return r;
}

/** Les 4 notes affichées (moyenne arrondie des deux sous-notes), ou null si le joueur n'a pas de notes. */
export function notesAffichees(joueur: Joueur): { code: string; nom: string; valeur: number }[] | null {
  if (!joueur.notes) return null;
  const n = notesDe(joueur);
  return NOTES.map(({ code, nom, sous }) => ({ code, nom, valeur: Math.round((n[sous[0]] + n[sous[1]]) / 2) }));
}

/** Probabilité décalée par un écart de notes : l'écart s'ajoute à la cote
 *  (logit), divisé par l'échelle. Écart nul : probabilité inchangée. */
export function decaler(p: number, ecart: number, echelle: number = PARAMETRES_NOTES.echelle): number {
  if (ecart === 0) return p;
  const q = Math.min(0.999, Math.max(0.001, p));
  return 1 / (1 + Math.exp(-(Math.log(q / (1 - q)) + ecart / echelle)));
}
