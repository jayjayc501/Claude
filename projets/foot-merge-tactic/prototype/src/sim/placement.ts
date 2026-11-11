// Règles de placement sur le demi-terrain : 11 joueurs au plus, un joueur par
// case, un maximum de joueurs par poste. Fonctions pures : elles renvoient une
// nouvelle composition sans modifier l'ancienne.

import type { Donnees } from "./donnees";
import type { Joueur, Placement } from "./types";

export const JOUEURS_SUR_LE_TERRAIN = 11;

export type Resultat = { ok: true; composition: Placement[] } | { ok: false; erreur: string };

export function occupant(composition: Placement[], poste: string, cellule: number): Placement | undefined {
  return composition.find((p) => p.poste === poste && p.cellule === cellule);
}

export function nombreAuPoste(composition: Placement[], poste: string, sauf?: string): number {
  return composition.filter((p) => p.poste === poste && p.joueurId !== sauf).length;
}

export function placer(
  composition: Placement[],
  donnees: Donnees,
  joueurId: string,
  poste: string,
  cellule: number,
): Resultat {
  const def = donnees.poste(poste);
  if (cellule < 0 || cellule >= def.cases.length) return { ok: false, erreur: "Cette case n'existe pas." };
  const occ = occupant(composition, poste, cellule);
  if (occ && occ.joueurId !== joueurId) return { ok: false, erreur: "Cette case est déjà prise." };
  if (nombreAuPoste(composition, poste, joueurId) >= def.max) {
    return { ok: false, erreur: `${def.nom} : ${def.max} joueur${def.max > 1 ? "s" : ""} au maximum.` };
  }
  const sansLui = composition.filter((p) => p.joueurId !== joueurId);
  if (sansLui.length >= JOUEURS_SUR_LE_TERRAIN) {
    return { ok: false, erreur: "Il y a déjà 11 joueurs sur le terrain. Retirez-en un d'abord." };
  }
  return { ok: true, composition: [...sansLui, { joueurId, poste, cellule }] };
}

export function retirer(composition: Placement[], joueurId: string): Placement[] {
  return composition.filter((p) => p.joueurId !== joueurId);
}

/** Problèmes qui empêchent de lancer le match (liste vide = prêt). */
export function verifier(composition: Placement[], donnees: Donnees): string[] {
  const erreurs: string[] = [];
  if (composition.length !== JOUEURS_SUR_LE_TERRAIN) {
    erreurs.push(`Il faut 11 joueurs sur le terrain (${composition.length} placés).`);
  }
  if (nombreAuPoste(composition, "G") !== 1) erreurs.push("Il faut un gardien.");
  for (const poste of donnees.postes) {
    if (nombreAuPoste(composition, poste.id) > poste.max) erreurs.push(`${poste.nom} : trop de joueurs.`);
  }
  const vus = new Set<string>();
  for (const p of composition) {
    const cle = `${p.poste}:${p.cellule}`;
    if (vus.has(cle)) erreurs.push("Deux joueurs sur la même case.");
    vus.add(cle);
  }
  return erreurs;
}

/** Vrai si le rôle de la case ne fait pas partie des postes naturels du joueur. */
export function horsPoste(joueur: Joueur, donnees: Donnees, poste: string, cellule: number): boolean {
  return !joueur.postes.includes(donnees.cellule(poste, cellule).role);
}
