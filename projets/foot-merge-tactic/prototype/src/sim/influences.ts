// Tactiques d'équipe et styles des joueurs (PROPOSITION du 12/11, à juger en
// regardant des matchs). Ils ne réécrivent pas le moteur : ils modulent ses
// réglages (data/influences.json).
//   - Une tactique change les réglages de son équipe (hauteur du bloc,
//     pressing, contre-pressing, longueur des passes…).
//   - Un style agit sur son joueur (vitesse, pressing, tacle, précision…), et
//     sur toute l'équipe quand assez de joueurs l'ont (palier).
// Sans tactique (Équilibrée) ni style, les réglages restent ceux de base :
// le moteur se comporte exactement comme avant.

import brut from "../data/influences.json";
import type { Equipe, Joueur, Placement, Reglages } from "./types";

type Valeur = number | { fois?: number; plus?: number };
export type Correctif = Record<string, Valeur>;

export interface EffetJoueur {
  /** Vitesse de course. */
  vitesse: number;
  /** Distance à laquelle il se met à presser le porteur. */
  pressing: number;
  /** Chances de gagner un tacle. */
  tacle: number;
  /** Chances qu'un tacle gagné soit une faute. */
  fautes: number;
  /** Imprécision de ses passes. */
  imprecision: number;
  /** Réussite de ses dribbles. */
  dribble: number;
  /** Tacle subi pendant qu'il protège le ballon (plus petit : plus dur à prendre). */
  protection: number;
}

export interface Influences {
  palier: number;
  tactiques: Record<string, Correctif>;
  styles: Record<string, { joueur: Partial<EffetJoueur>; palier: Correctif }>;
}

export interface OptionsInfluences {
  tactiques: boolean;
  styles: boolean;
}

export const NEUTRE: EffetJoueur = { vitesse: 1, pressing: 1, tacle: 1, fautes: 1, imprecision: 1, dribble: 1, protection: 1 };

export function chargerInfluences(): Influences {
  return structuredClone(brut) as unknown as Influences;
}

/** Applique un correctif à des réglages (modifiés sur place). */
export function corriger(r: Reglages, c: Correctif): void {
  for (const [chemin, v] of Object.entries(c)) {
    const morceaux = chemin.split(".");
    let o = r as unknown as Record<string, unknown>;
    for (const m of morceaux.slice(0, -1)) {
      const suite = o[m];
      if (typeof suite !== "object" || suite === null) throw new Error(`Réglage inconnu : ${chemin}`);
      o = suite as Record<string, unknown>;
    }
    const cle = morceaux[morceaux.length - 1]!;
    const avant = o[cle];
    if (typeof avant !== "number") throw new Error(`Réglage inconnu : ${chemin}`);
    o[cle] = typeof v === "number" ? v : (avant * (v.fois ?? 1)) + (v.plus ?? 0);
  }
}

/** Styles dont le palier est atteint par les joueurs sur le terrain. */
export function paliersAtteints(equipe: Equipe, composition: Placement[], inf: Influences): string[] {
  const compte = new Map<string, number>();
  for (const p of composition) {
    const style = equipe.joueurs.find((j) => j.id === p.joueurId)?.style;
    if (style && inf.styles[style]) compte.set(style, (compte.get(style) ?? 0) + 1);
  }
  return [...compte].filter(([, n]) => n >= inf.palier).map(([s]) => s);
}

/** Réglages d'une équipe : base, puis tactique, puis paliers de styles atteints.
 *  Renvoie les réglages de base eux-mêmes quand rien ne s'applique. */
export function reglagesEquipe(base: Reglages, equipe: Equipe, tactique: string, inf: Influences, options: OptionsInfluences): Reglages {
  const correctifs: Correctif[] = [];
  if (options.tactiques) {
    const t = inf.tactiques[tactique];
    if (!t) throw new Error(`Tactique inconnue : ${tactique}`);
    if (Object.keys(t).length) correctifs.push(t);
  }
  if (options.styles) for (const s of paliersAtteints(equipe, equipe.composition, inf)) correctifs.push(inf.styles[s]!.palier);
  if (!correctifs.length) return base;
  const r = structuredClone(base);
  for (const c of correctifs) corriger(r, c);
  return r;
}

/** Effet individuel du style d'un joueur. */
export function effetJoueur(joueur: Joueur, inf: Influences, options: OptionsInfluences): EffetJoueur {
  const s = options.styles && joueur.style ? inf.styles[joueur.style] : undefined;
  return s ? { ...NEUTRE, ...s.joueur } : NEUTRE;
}
