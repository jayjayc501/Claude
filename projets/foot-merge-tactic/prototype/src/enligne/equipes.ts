// Équipes du 1 contre 1 en ligne (15/11). Le téléphone n'envoie que ses choix
// (cartes, fusions, places, tactique) ; le serveur refait l'équipe à partir du
// catalogue (les notes viennent des cartes, pas du téléphone) et vérifie les
// règles : 11 titulaires à leur poste, cases valides, banc, fusions, budget.

import preparationBrut from "../data/preparation.json";
import { CATALOGUE, REGLES } from "../jeu/partie";
import type { Donnees } from "../sim/donnees";
import { JOUEURS_SUR_LE_TERRAIN } from "../sim/placement";
import type { Equipe, Placement } from "../sim/types";

/** Ce que le téléphone envoie : son effectif, ses titulaires, sa tactique. */
export interface ChoixEquipe {
  effectif: { id: string; fusions: number }[];
  composition: Placement[];
  tactique?: string;
}

const PREPA = preparationBrut as unknown as { bancMax: number; fusionsMax: number; tactiques: { code: string }[] };
export const BANC_MAX = PREPA.bancMax;
export const FUSIONS_MAX = PREPA.fusionsMax;
const TACTIQUES = new Set(PREPA.tactiques.map((t) => t.code));
const CARTES = new Map(CATALOGUE.cartes.map((c) => [c.id, c]));

export type Verdict = { ok: true; choix: ChoixEquipe } | { ok: false; erreur: string };

/** Vérifie un choix d'équipe reçu (forme et règles) ; renvoie une copie propre. */
export function verifierChoix(donnees: Donnees, brut: unknown): Verdict {
  const c = brut as Partial<ChoixEquipe> | null;
  if (!c || !Array.isArray(c.effectif) || !Array.isArray(c.composition)) return { ok: false, erreur: "Équipe illisible." };
  const effectif: ChoixEquipe["effectif"] = [];
  const vus = new Set<string>();
  let depense = 0;
  for (const m of c.effectif) {
    const k = CARTES.get(String(m?.id));
    const f = Number(m?.fusions ?? 0);
    if (!k) return { ok: false, erreur: "Carte inconnue." };
    if (vus.has(k.id)) return { ok: false, erreur: `${k.nom} en double.` };
    if (!Number.isInteger(f) || f < 0 || f > FUSIONS_MAX) return { ok: false, erreur: "Fusion impossible." };
    vus.add(k.id);
    depense += k.prix * (1 + f);
    effectif.push({ id: k.id, fusions: f });
  }
  if (effectif.length > JOUEURS_SUR_LE_TERRAIN + BANC_MAX) return { ok: false, erreur: "Trop de joueurs." };
  if (depense > REGLES.budgetDepart) return { ok: false, erreur: "Budget dépassé." };
  if (c.composition.length !== JOUEURS_SUR_LE_TERRAIN) return { ok: false, erreur: "Il faut 11 titulaires." };
  const composition: Placement[] = [];
  const cases = new Set<string>();
  const titulaires = new Set<string>();
  const parPoste = new Map<string, number>();
  for (const p of c.composition) {
    const id = String(p?.joueurId);
    const k = CARTES.get(id);
    if (!k || !vus.has(id) || titulaires.has(id)) return { ok: false, erreur: "Titulaire inconnu." };
    if (k.poste !== p.poste) return { ok: false, erreur: `${k.nom} hors de son poste.` };
    const cellule = Number(p.cellule);
    let max: number;
    try {
      max = donnees.poste(p.poste).max;
      donnees.cellule(p.poste, cellule);
    } catch {
      return { ok: false, erreur: "Case inconnue." };
    }
    if (!Number.isInteger(cellule) || cases.has(`${p.poste}${cellule}`)) return { ok: false, erreur: "Case déjà prise." };
    const n = (parPoste.get(p.poste) ?? 0) + 1;
    if (n > max) return { ok: false, erreur: "Trop de joueurs à ce poste." };
    parPoste.set(p.poste, n);
    cases.add(`${p.poste}${cellule}`);
    titulaires.add(id);
    composition.push({ joueurId: id, poste: p.poste, cellule });
  }
  if (parPoste.get("G") !== 1) return { ok: false, erreur: "Il faut un gardien." };
  const tactique = c.tactique && TACTIQUES.has(c.tactique) ? c.tactique : undefined;
  return { ok: true, choix: { effectif, composition, ...(tactique ? { tactique } : {}) } };
}

/** Changements de la mi-temps : même effectif qu'au coup d'envoi (pas de mercato). */
export function verifierMiTemps(donnees: Donnees, avant: ChoixEquipe, brut: unknown): Verdict {
  const v = verifierChoix(donnees, brut);
  if (!v.ok) return v;
  const cle = (c: ChoixEquipe) => c.effectif.map((m) => `${m.id}:${m.fusions}`).sort().join();
  if (cle(v.choix) !== cle(avant)) return { ok: false, erreur: "Pas de mercato à la mi-temps." };
  return v;
}

/** L'équipe du moteur, refaite à partir du catalogue. */
export function equipeDepuisChoix(c: ChoixEquipe, nom: string): Equipe {
  return {
    nom,
    nationalite: nom,
    joueurs: c.effectif.map((m) => {
      const k = CARTES.get(m.id)!;
      return { id: k.id, nom: k.nom, postes: [k.poste], style: k.style, notes: k.notes, pays: k.pays, fusions: m.fusions };
    }),
    composition: c.composition.map((p) => ({ ...p })),
    ...(c.tactique ? { tactique: c.tactique } : {}),
  };
}
