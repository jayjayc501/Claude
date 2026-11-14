// Tactiques d'équipe et styles des joueurs (PROPOSITION du 12/11, à juger en
// regardant des matchs). Ils ne réécrivent pas le moteur : ils modulent ses
// réglages (data/influences.json).
//   - Une tactique change les réglages de son équipe (hauteur du bloc,
//     pressing, contre-pressing, longueur des passes…).
//   - Un style agit sur son joueur (vitesse, pressing, tacle, précision…), et
//     sur toute l'équipe quand assez de joueurs l'ont (palier).
// Sans tactique (Équilibrée) ni style, les réglages restent ceux de base :
// le moteur se comporte exactement comme avant.
//
// 14/11 (VALIDÉ par le concepteur) :
//   - un style ne change pas les notes affichées : il donne un bonus caché
//     (points ajoutés aux sous-notes dans le moteur seulement) et un
//     comportement, sans contrepartie ; à 3 joueurs du même style, un bonus
//     d'équipe ; à 5, une action signature, plus forte et bien visible ;
//   - pays : cohésion à 5 joueurs du même pays sur le terrain (le même bonus
//     pour tous), tradition du pays en plus à 8 ;
//   - fusion : boost de match caché, le même pour toutes les cartes, et un
//     joueur fusionné pèse plus dans le jeu (voir ballon.ts).
// Les chiffres sont des PROPOSITIONS (data/influences.json).

import brut from "../data/influences.json";
import type { Equipe, Joueur, Notes, Placement, Reglages } from "./types";

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
  /** Délai de réaction aux changements de possession (cohésion d'un pays). */
  reaction: number;
  /** Imprécision de ses passes vers un compatriote (cohésion d'un pays). */
  imprecisionCompatriote: number;
}

export interface StyleDef {
  nom: string;
  /** Nom du bonus d'équipe à 3 joueurs, puis de l'action signature à 5. */
  palierNom: string;
  palierFortNom: string;
  /** Bonus caché : points ajoutés aux sous-notes, dans le moteur seulement. */
  notes: Partial<Notes>;
  /** Comportement : multiplicateurs (1 = sans effet). */
  joueur: Partial<EffetJoueur>;
  /** Bonus d'équipe à 3 joueurs (palier), puis en plus à 5 (palierFort). */
  palier: Correctif;
  palierFort: Correctif;
}

export interface Influences {
  palier: number;
  palierFort: number;
  tactiques: Record<string, Correctif>;
  styles: Record<string, StyleDef>;
  pays: {
    palier: number;
    palierFort: number;
    cohesion: { nom: string; notes: Partial<Notes>; joueur: Partial<EffetJoueur> };
    traditions: Record<string, { nom: string; notes: Partial<Notes>; equipe: Correctif }>;
  };
  fusion: { notesParNiveau: number; passeVersLuiParNiveau: number; tentativeParNiveau: number; tirLoinParNiveau: number };
}

/** Un palier atteint par une équipe : style ou pays, nombre de joueurs, palier fort ou non. */
export interface Palier {
  code: string;
  n: number;
  fort: boolean;
}

export interface OptionsInfluences {
  tactiques: boolean;
  styles: boolean;
}

export const NEUTRE: EffetJoueur = { vitesse: 1, pressing: 1, tacle: 1, fautes: 1, imprecision: 1, dribble: 1, protection: 1, reaction: 1, imprecisionCompatriote: 1 };

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

/** Joueurs sur le terrain par style (ou par pays). */
function compter(equipe: Equipe, composition: Placement[], cle: "style" | "pays"): Map<string, number> {
  const compte = new Map<string, number>();
  for (const p of composition) {
    const v = equipe.joueurs.find((j) => j.id === p.joueurId)?.[cle];
    if (v) compte.set(v, (compte.get(v) ?? 0) + 1);
  }
  return compte;
}

/** Paliers de style atteints par les joueurs sur le terrain (3, et 5 : palier fort). */
export function paliersStyles(equipe: Equipe, composition: Placement[], inf: Influences): Palier[] {
  return [...compter(equipe, composition, "style")]
    .filter(([s, n]) => inf.styles[s] && n >= inf.palier)
    .map(([code, n]) => ({ code, n, fort: n >= inf.palierFort }));
}

/** Styles dont le palier est atteint par les joueurs sur le terrain. */
export function paliersAtteints(equipe: Equipe, composition: Placement[], inf: Influences): string[] {
  return paliersStyles(equipe, composition, inf).map((p) => p.code);
}

/** Paliers de pays atteints (5 : cohésion ; 8 : tradition en plus). */
export function paliersPays(equipe: Equipe, composition: Placement[], inf: Influences): Palier[] {
  return [...compter(equipe, composition, "pays")]
    .filter(([, n]) => n >= inf.pays.palier)
    .map(([code, n]) => ({ code, n, fort: n >= inf.pays.palierFort }));
}

/** Pays de l'équipe qui ont leur cohésion, et ceux qui ont leur tradition. */
export function contextePays(equipe: Equipe, inf: Influences): { cohesion: Set<string>; tradition: Set<string> } {
  const p = paliersPays(equipe, equipe.composition, inf);
  return { cohesion: new Set(p.map((x) => x.code)), tradition: new Set(p.filter((x) => x.fort).map((x) => x.code)) };
}

/** Réglages d'une équipe : base, puis tactique, puis paliers de styles atteints
 *  (3, et 5 en plus), puis tradition d'un pays (8 joueurs).
 *  Renvoie les réglages de base eux-mêmes quand rien ne s'applique. */
export function reglagesEquipe(base: Reglages, equipe: Equipe, tactique: string, inf: Influences, options: OptionsInfluences): Reglages {
  const correctifs: Correctif[] = [];
  if (options.tactiques) {
    const t = inf.tactiques[tactique];
    if (!t) throw new Error(`Tactique inconnue : ${tactique}`);
    if (Object.keys(t).length) correctifs.push(t);
  }
  if (options.styles)
    for (const p of paliersStyles(equipe, equipe.composition, inf)) {
      correctifs.push(inf.styles[p.code]!.palier);
      if (p.fort) correctifs.push(inf.styles[p.code]!.palierFort);
    }
  for (const p of paliersPays(equipe, equipe.composition, inf)) {
    const t = p.fort ? inf.pays.traditions[p.code] : undefined;
    if (t && Object.keys(t.equipe).length) correctifs.push(t.equipe);
  }
  if (!correctifs.length) return base;
  const r = structuredClone(base);
  for (const c of correctifs) corriger(r, c);
  return r;
}

/** Effet individuel d'un joueur : comportement de son style, et cohésion de son
 *  pays quand son équipe l'a (5 compatriotes sur le terrain). */
export function effetJoueur(joueur: Joueur, inf: Influences, options: OptionsInfluences, cohesion = false): EffetJoueur {
  const s = options.styles && joueur.style ? inf.styles[joueur.style] : undefined;
  if (!s && !cohesion) return NEUTRE;
  const e: EffetJoueur = { ...NEUTRE, ...(s?.joueur ?? {}) };
  if (cohesion) for (const [k, v] of Object.entries(inf.pays.cohesion.joueur)) e[k as keyof EffetJoueur] *= v ?? 1;
  return e;
}

/** Niveau de fusion d'un joueur (0 : pas fusionné). */
export function fusionsDe(joueur: Joueur): number {
  return joueur.fusions ?? 0;
}

/** Bonus caché d'un joueur, ajouté à ses sous-notes dans le moteur seulement
 *  (les notes affichées sur sa carte ne changent pas) : son style, la cohésion
 *  (5 compatriotes sur le terrain) et la tradition (8) de son pays, et ses
 *  fusions (le même boost pour toutes les cartes, sur toutes les notes). Vide : aucun bonus. */
export function bonusNotes(joueur: Joueur, inf: Influences, options: OptionsInfluences, tradition = false, cohesion = false): Partial<Notes> {
  const b: Partial<Notes> = {};
  const ajouter = (n: Partial<Notes>) => {
    for (const [k, v] of Object.entries(n)) if (v) b[k as keyof Notes] = (b[k as keyof Notes] ?? 0) + v;
  };
  const s = options.styles && joueur.style ? inf.styles[joueur.style] : undefined;
  if (s) ajouter(s.notes);
  if (cohesion) ajouter(inf.pays.cohesion.notes);
  const t = tradition && joueur.pays ? inf.pays.traditions[joueur.pays] : undefined;
  if (t) ajouter(t.notes);
  const f = fusionsDe(joueur) * inf.fusion.notesParNiveau;
  if (f) {
    const tout: Partial<Notes> = {};
    for (const k of ["acceleration", "pointe", "passe", "dribble", "precision", "puissance", "duel", "endurance", "reflexes", "placement", "sorties", "relance"] as const) tout[k] = f;
    ajouter(tout);
  }
  return b;
}
