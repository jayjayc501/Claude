// Figurines des 60 cartes (13/11) : pas encore d'images pour chaque joueur.
// On reprend les 18 bustes de la maquette : celui du même nom quand il existe,
// sinon un buste du même pays (maillot) et si possible du même style (posture),
// sinon un buste du même style (l'Argentine n'a pas encore de buste). Images de
// remplacement, en attendant de vrais visuels.

import type { Carte } from "../jeu/partie";
import { BUSTES, TETES } from "./bustes";
import { BUSTES_BLEUS } from "./equipeBleue";

/** Bustes de la maquette : pays et style de chacun. */
const MAQUETTE: Record<string, { nom: string; pays: string; style: string | null; poste: string }> = {
  MO: { nom: "Ollivier", pays: "FRA", style: null, poste: "G" },
  JM: { nom: "Marchal", pays: "FRA", style: "REM", poste: "DD" },
  TR: { nom: "Roux", pays: "FRA", style: "REC", poste: "AC" },
  HF: { nom: "Ferrand", pays: "FRA", style: "REC", poste: "MC" },
  AM: { nom: "Mercier", pays: "FRA", style: "RAP", poste: "AG" },
  IS: { nom: "Salvat", pays: "ESP", style: null, poste: "MC" },
  RC: { nom: "Castell", pays: "ESP", style: null, poste: "DG" },
  PA: { nom: "Arnau", pays: "ESP", style: "TEC", poste: "MC" },
  AS: { nom: "Sanz", pays: "ESP", style: "RAP", poste: "AC" },
  DA: { nom: "Almar", pays: "ESP", style: null, poste: "MC" },
  KM: { nom: "Amaral", pays: "BRA", style: null, poste: "AD" },
  BL: { nom: "Lima", pays: "BRA", style: "RAP", poste: "AG" },
  CB: { nom: "Brandão", pays: "BRA", style: null, poste: "AD" },
  EL: { nom: "Lobo", pays: "BRA", style: "TEC", poste: "MC" },
  LM: { nom: "Monti", pays: "ITA", style: "TEC", poste: "DC" },
  NV: { nom: "Vitale", pays: "ITA", style: "REM", poste: "DC" },
  DK: { nom: "Conti", pays: "ITA", style: "REM", poste: "DC" },
  MV: { nom: "Vianello", pays: "ITA", style: null, poste: "DC" },
};

function hache(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Clé du buste de la maquette qui représente une carte. */
export function busteDe(c: Carte): string {
  const cles = Object.keys(MAQUETTE);
  const meme = cles.find((k) => MAQUETTE[k]!.nom === c.nom);
  if (meme) return meme;
  if (c.poste === "G") return "MO";
  const champ = cles.filter((k) => MAQUETTE[k]!.poste !== "G");
  const candidats =
    [champ.filter((k) => MAQUETTE[k]!.pays === c.pays && MAQUETTE[k]!.style === c.style), champ.filter((k) => MAQUETTE[k]!.pays === c.pays), champ.filter((k) => MAQUETTE[k]!.style === c.style), champ].find(
      (l) => l.length,
    ) ?? champ;
  return candidats[hache(c.id) % candidats.length]!;
}

/** Inscrit l'image de chaque carte sous son identifiant, partout où l'interface cherche un buste. */
export function inscrireImages(cartes: Carte[]): void {
  for (const c of cartes) {
    const k = busteDe(c);
    BUSTES[c.id] = BUSTES[k]!;
    BUSTES_BLEUS[c.id] = BUSTES_BLEUS[k]!;
    if (TETES[k]) TETES[c.id] = TETES[k]!;
  }
}
