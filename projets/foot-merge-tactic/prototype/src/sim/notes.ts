// Caractéristiques des joueurs (12/11).
// VALIDÉ : 4 notes affichées, 2 sous-notes chacune. Gardien (13/11) : 4 notes
// simples, sans sous-notes : Réflexes, Placement, Sorties, Relance.
// PROPOSITION : le moteur n'utilise que les sous-notes ; chaque action compare
// celle de l'un à celle de l'adversaire direct (dribble contre duel, puissance
// contre gardien…). À écart nul, la probabilité est celle du moteur : avec 65
// partout (valeur par défaut), le moteur ne change pas. Chiffres : data/notes.json.

import brut from "../data/notes.json";
import type { Joueur, Notes } from "./types";

export const SOUS_NOTES = ["acceleration", "pointe", "passe", "dribble", "precision", "puissance", "duel", "endurance"] as const;
export const NOTES_GARDIEN_CLES = ["reflexes", "placement", "sorties", "relance"] as const;

/** Les 4 notes du gardien (13/11), une seule valeur chacune. */
export const NOTES_GARDIEN: { code: string; nom: string; cle: keyof Notes; aide: string }[] = [
  { code: "RÉF", nom: "Réflexes", cle: "reflexes", aide: "Arrêter le tir, le bloquer plutôt que le repousser" },
  { code: "PLA", nom: "Placement", cle: "placement", aide: "Fermer l'angle : moins de distance à couvrir" },
  { code: "SOR", nom: "Sorties", cle: "sorties", aide: "Face-à-face, ballons dans le dos, centres" },
  { code: "REL", nom: "Relance", cle: "relance", aide: "Passes au pied, six mètres, dégagements" },
];

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
  reflexes: "Réflexes",
  placement: "Placement",
  sorties: "Sorties",
  relance: "Relance",
};

export interface ParametresNotes {
  reference: number;
  echelle: number;
  vitesse: { pointeParPoint: number; accelerationParPoint: number; choixPasseParPoint: number; appelParPoint: number };
  technique: { imprecisionPasseParPoint: number; interceptionParPoint: number };
  tir: { erreurParPoint: number; puissanceParPoint: number; poidsPuissanceArret: number };
  physique: { tacleParPoint: number; fautesParPoint: number; porteeParPoint: number };
  unContreUn: { poidsVitesse: number; poidsTentative: number };
  endurance: { minutesParSeconde: number; seuilAffileeMin: number; seuilTotalMin: number; perteParMinute: number; parPoint: number; perteMax: number };
  gardien: { poidsReflexes: number; placementParPoint: number; sortiesDistanceM: number; poidsSorties: number; poidsCaptage: number };
}

export const PARAMETRES_NOTES = brut as unknown as ParametresNotes;

/** Sous-notes complètes d'un joueur : celles qui manquent valent la référence. */
export function notesDe(joueur: Joueur, p: ParametresNotes = PARAMETRES_NOTES): Notes {
  const n = joueur.notes ?? {};
  const r = {} as Notes;
  for (const cle of SOUS_NOTES) r[cle] = n[cle] ?? p.reference;
  for (const cle of NOTES_GARDIEN_CLES) r[cle] = n[cle] ?? p.reference;
  // Gardien : sa relance est sa passe, ses sorties sa portée sur le ballon (duel).
  if (n.relance !== undefined && n.passe === undefined) r.passe = n.relance;
  if (n.sorties !== undefined && n.duel === undefined) r.duel = n.sorties;
  return r;
}

/** Le joueur a-t-il des notes de gardien ? */
export function estNotesGardien(notes: Partial<Notes> | null | undefined): boolean {
  return !!notes && notes.reflexes !== undefined;
}

/** Les 4 notes affichées (moyenne arrondie des deux sous-notes), ou null si le joueur n'a pas de notes. */
export function notesAffichees(joueur: Joueur): { code: string; nom: string; valeur: number }[] | null {
  if (!joueur.notes) return null;
  const n = notesDe(joueur);
  if (estNotesGardien(joueur.notes)) return NOTES_GARDIEN.map(({ code, nom, cle }) => ({ code, nom, valeur: Math.round(n[cle]) }));
  return NOTES.map(({ code, nom, sous }) => ({ code, nom, valeur: Math.round((n[sous[0]] + n[sous[1]]) / 2) }));
}

/** Probabilité décalée par un écart de notes : l'écart s'ajoute à la cote
 *  (logit), divisé par l'échelle. Écart nul : probabilité inchangée. */
export function decaler(p: number, ecart: number, echelle: number = PARAMETRES_NOTES.echelle): number {
  if (ecart === 0) return p;
  const q = Math.min(0.999, Math.max(0.001, p));
  return 1 / (1 + Math.exp(-(Math.log(q / (1 - q)) + ecart / echelle)));
}
