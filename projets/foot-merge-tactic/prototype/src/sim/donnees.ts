// Chargement des données de postes : construit les cases du plateau choisi
// (hexagones ou carrés). Un plateau est un quadrillage unique sur le
// demi-terrain, sans chevauchement ; chaque case appartient à un poste.

import type { Cellule, DonneesPostes, FormeCase, PlateauDef, Poste, RectNorm } from "./types";

export class Donnees {
  readonly longueurM: number;
  readonly largeurM: number;
  readonly postes: Poste[];
  readonly roles: Record<string, string>;
  readonly plateauId: string;
  readonly plateau: PlateauDef;
  readonly plateauxDisponibles: { id: string; nom: string }[];
  /** Pas du quadrillage (coordonnées normalisées) : largeur d'une colonne,
   *  distance entre deux rangées. Sert à mesurer les distances « en cases ». */
  readonly pas: { x: number; y: number };
  private parId: Map<string, Poste>;

  constructor(brut: DonneesPostes, plateauId: string = brut.plateauParDefaut) {
    const plateau = brut.plateaux[plateauId];
    if (!plateau) throw new Error(`Plateau inconnu : ${plateauId}`);
    this.longueurM = brut.terrain.longueur;
    this.largeurM = brut.terrain.largeur;
    this.roles = brut.roles;
    this.plateauId = plateauId;
    this.plateau = plateau;
    this.plateauxDisponibles = Object.entries(brut.plateaux).map(([id, p]) => ({ id, nom: p.nom }));
    const { cases, pas } = construireCases(plateau, this.longueurM);
    this.pas = pas;
    const horsGardien = cases.filter((c) => c.poste !== "G").map((c) => c.centre.y);
    const profondeurPlateau = { basY: Math.min(...horsGardien), hautY: Math.max(...horsGardien) };
    this.postes = brut.postes.map((def) => {
      const siennes = cases.filter((c) => c.poste === def.id).map((c, index) => ({ ...c, index }));
      if (siennes.length === 0) throw new Error(`Le poste ${def.id} n'a aucune case sur le plateau ${plateauId}`);
      etiqueter(siennes);
      return { ...def, cases: siennes, rect: englobant(siennes.map((c) => c.rect)), profondeurPlateau };
    });
    for (const c of cases) {
      if (!this.postes.some((p) => p.id === c.poste)) throw new Error(`Poste inconnu sur le plateau : ${c.poste}`);
    }
    this.parId = new Map(this.postes.map((p) => [p.id, p]));
  }

  poste(id: string): Poste {
    const p = this.parId.get(id);
    if (!p) throw new Error(`Poste inconnu : ${id}`);
    return p;
  }

  cellule(posteId: string, index: number): Cellule {
    const p = this.poste(posteId);
    const c = p.cases[index];
    if (!c) throw new Error(`Case ${index} inconnue pour le poste ${posteId}`);
    return c;
  }
}

/** Toutes les cases du plateau, des plus basses aux plus hautes, de gauche à droite. */
function construireCases(p: PlateauDef, longueurM: number): { cases: Cellule[]; pas: { x: number; y: number } } {
  const cases: Cellule[] = [];
  const forme: FormeCase = p.forme;
  const yBas = p.gardien.zoneM / longueurM; // le plateau commence au-dessus de la zone du gardien
  const hauteur = 0.5 - yBas;
  const n = p.rangees.length;
  // Hexagones à pointe en haut : les rangées s'emboîtent (pas = 3/4 de la
  // hauteur d'un hexagone). Carrés : rangées jointives.
  const pasY = forme === "hexagone" ? hauteur / (n - 1 + 4 / 3) : hauteur / n;
  const hCase = forme === "hexagone" ? (pasY * 4) / 3 : pasY;
  const pasX = 1 / p.colonnes;

  // Gardien : petites cases empilées dans sa zone, au centre.
  const hG = yBas / p.gardien.cases.length;
  const wG = pasX * p.gardien.largeurCases;
  p.gardien.cases.forEach((g, i) => {
    const cy = hG * (i + 0.5);
    cases.push({
      poste: "G",
      index: 0,
      role: "G",
      label: g.label,
      centre: { x: 0.5, y: cy },
      rect: { x: 0.5 - wG / 2, y: cy - hG / 2, w: wG, h: hG },
      forme,
    });
  });

  p.rangees.forEach((rangee, r) => {
    const decalee = rangee.length === p.colonnes - 1;
    if (!decalee && rangee.length !== p.colonnes) {
      throw new Error(`Rangée ${r + 1} : ${rangee.length} cases au lieu de ${p.colonnes} (ou ${p.colonnes - 1} décalée)`);
    }
    if (decalee && forme !== "hexagone") throw new Error(`Rangée ${r + 1} : seules les rangées d'hexagones se décalent`);
    const cy = yBas + hCase / 2 + r * pasY;
    rangee.forEach((code, i) => {
      if (!code) return;
      const [poste, role] = code.split(":") as [string, string | undefined];
      const cx = (i + (decalee ? 1 : 0.5)) * pasX;
      cases.push({
        poste,
        index: 0,
        role: role ?? poste,
        label: "",
        centre: { x: cx, y: cy },
        rect: { x: cx - pasX / 2, y: cy - hCase / 2, w: pasX, h: hCase },
        forme,
      });
    });
  });
  return { cases, pas: { x: pasX, y: pasY } };
}

/** Nom lisible de chaque case d'un poste : côté (gauche, axe, droite) si le
 *  poste en a plusieurs, hauteur (bas, milieu, haut) si toutes ses cases ont
 *  le même rôle (sinon le rôle dit déjà la hauteur). */
function etiqueter(cases: Cellule[]): void {
  if (cases[0]!.poste === "G") return;
  const cote = (x: number) => (x < 0.45 ? "gauche" : x > 0.55 ? "droite" : "axe");
  const cotes = new Set(cases.map((c) => cote(c.centre.x)));
  const ys = [...new Set(cases.map((c) => c.centre.y.toFixed(4)))].sort();
  const memeRole = new Set(cases.map((c) => c.role)).size === 1;
  const hauteurs = ys.length === 2 ? ["bas", "haut"] : ys.length === 3 ? ["bas", "milieu", "haut"] : ys.map((_, i) => `rangée ${i + 1}`);
  for (const c of cases) {
    const morceaux: string[] = [];
    if (cotes.size > 1) morceaux.push(cote(c.centre.x));
    if (memeRole && ys.length > 1) morceaux.push(hauteurs[ys.indexOf(c.centre.y.toFixed(4))]!);
    c.label = morceaux.join(", ");
  }
}

function englobant(rects: RectNorm[]): RectNorm {
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
