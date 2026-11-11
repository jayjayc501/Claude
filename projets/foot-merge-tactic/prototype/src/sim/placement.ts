// Règles de placement sur le demi-terrain : 11 joueurs au plus, un joueur par
// case, un maximum de joueurs par poste. Fonctions pures : elles renvoient une
// nouvelle composition sans modifier l'ancienne.

import type { Donnees } from "./donnees";
import type { Cellule, Joueur, Placement, PointNorm } from "./types";

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

/** Deux joueurs sur le terrain échangent leurs cases. Le nombre de joueurs par
 *  poste ne change pas, donc l'échange respecte toujours les maximums. */
export function echanger(composition: Placement[], joueurA: string, joueurB: string): Resultat {
  const a = composition.find((p) => p.joueurId === joueurA);
  const b = composition.find((p) => p.joueurId === joueurB);
  if (!a || !b) return { ok: false, erreur: "Les deux joueurs doivent être sur le terrain." };
  if (joueurA === joueurB) return { ok: true, composition };
  return {
    ok: true,
    composition: composition.map((p) => {
      if (p.joueurId === joueurA) return { joueurId: joueurA, poste: b.poste, cellule: b.cellule };
      if (p.joueurId === joueurB) return { joueurId: joueurB, poste: a.poste, cellule: a.cellule };
      return p;
    }),
  };
}

/** Un remplaçant prend la case d'un joueur du terrain, qui retourne sur le banc. */
export function remplacer(composition: Placement[], entrant: string, sortant: string): Resultat {
  if (composition.some((p) => p.joueurId === entrant)) {
    return { ok: false, erreur: "Ce joueur est déjà sur le terrain." };
  }
  const place = composition.find((p) => p.joueurId === sortant);
  if (!place) return { ok: false, erreur: "Le joueur remplacé doit être sur le terrain." };
  return {
    ok: true,
    composition: composition.map((p) => (p.joueurId === sortant ? { ...place, joueurId: entrant } : p)),
  };
}

/** Vrai si le point est dans la case (hexagone à pointe en haut, ou rectangle). */
export function dansLaCase(c: Cellule, point: PointNorm): boolean {
  const dx = Math.abs(point.x - c.centre.x) / (c.rect.w / 2);
  const dy = Math.abs(point.y - c.centre.y) / (c.rect.h / 2);
  if (c.forme === "carre") return dx <= 1 && dy <= 1;
  return dx <= 1 && dy <= 1 - dx / 2;
}

/** Case visée par un point du demi-terrain : celle qui le contient (les cases
 *  ne se chevauchent pas). Aucune hors du plateau. */
export function caseAuPoint(donnees: Donnees, point: PointNorm): Cellule | undefined {
  for (const poste of donnees.postes) {
    for (const c of poste.cases) if (dansLaCase(c, point)) return c;
  }
  return undefined;
}

/** Passe une composition d'un plateau à l'autre : chaque joueur garde son
 *  poste et prend la case libre de ce poste la plus proche de l'ancienne
 *  (distance mesurée en cases, pour ne favoriser ni la largeur ni la hauteur). */
export function convertirComposition(composition: Placement[], de: Donnees, vers: Donnees): Placement[] {
  if (de.plateauId === vers.plateauId) return composition.map((p) => ({ ...p }));
  const prises = new Set<string>();
  return composition.map((p) => {
    const ancienne = de.cellule(p.poste, p.cellule).centre;
    let meilleure = -1;
    let distance = Infinity;
    for (const c of vers.poste(p.poste).cases) {
      if (prises.has(`${p.poste}:${c.index}`)) continue;
      const d = Math.hypot((c.centre.x - ancienne.x) / vers.pas.x, (c.centre.y - ancienne.y) / vers.pas.y);
      if (d < distance) {
        distance = d;
        meilleure = c.index;
      }
    }
    if (meilleure < 0) throw new Error(`Plus de case libre au poste ${p.poste} sur le plateau ${vers.plateauId}`);
    prises.add(`${p.poste}:${meilleure}`);
    return { ...p, cellule: meilleure };
  });
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
