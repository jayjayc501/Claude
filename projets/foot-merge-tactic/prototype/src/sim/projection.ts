// Règles de projection : une position choisie sur le demi-terrain (coup
// d'envoi) devient une position de match, selon que l'équipe attaque ou
// défend, et selon la position du ballon. Tous les chiffres viennent de
// reglages.json et postes.json (montée en attaque par poste).
//
// En défense : la forme du coup d'envoi, un peu resserrée, qui glisse du côté
// du ballon et avance ou recule avec lui (décalage plafonné).
// En attaque : chaque poste monte de sa distance, l'équipe s'écarte en largeur
// et suit un peu le ballon.

import type { Phase, PointNorm, Poste, RectNorm, Reglages } from "./types";

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function projeter(
  base: PointNorm,
  poste: Poste,
  phase: Phase,
  ballon: PointNorm,
  reglages: Reglages,
  longueurM: number,
): PointNorm {
  const p = reglages.projection;
  const suivi = poste.suiviBallon ?? 1;
  let x: number;
  let y: number;
  if (phase === "defense") {
    const d = p.defense;
    const dyMax = d.decalageMaxM / longueurM;
    x = 0.5 + (base.x - 0.5) * d.compression + (ballon.x - 0.5) * d.glissementLateral * suivi;
    y = base.y + borner((ballon.y - 0.5) * d.suiviProfondeur, -dyMax, dyMax) * suivi;
  } else {
    const a = p.attaque;
    const dyMax = a.decalageMaxM / longueurM;
    x = 0.5 + (base.x - 0.5) * a.ecartement + (ballon.x - 0.5) * a.glissementLateral * suivi;
    y = base.y + poste.monteeAttaqueM / longueurM + borner((ballon.y - 0.6) * a.suiviProfondeur, -dyMax, dyMax) * suivi;
  }
  const l = p.limites;
  return { x: borner(x, l.xMin, l.xMax), y: borner(y, l.yMin, l.yMax) };
}

/** Rectangle d'un poste déplacé par les mêmes règles (pour l'afficher en match). */
export function projeterRect(
  rect: RectNorm,
  poste: Poste,
  phase: Phase,
  ballon: PointNorm,
  reglages: Reglages,
  longueurM: number,
): RectNorm {
  const a = projeter({ x: rect.x, y: rect.y }, poste, phase, ballon, reglages, longueurM);
  const b = projeter({ x: rect.x + rect.w, y: rect.y + rect.h }, poste, phase, ballon, reglages, longueurM);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}
