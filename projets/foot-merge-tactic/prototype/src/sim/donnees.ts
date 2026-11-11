// Chargement des données de postes : calcule les cases (sous-zones) de chaque
// rectangle à partir de sa grille ou de sa liste de cases.

import type { Cellule, DonneesPostes, Poste, PosteDef } from "./types";

export class Donnees {
  readonly longueurM: number;
  readonly largeurM: number;
  readonly postes: Poste[];
  readonly roles: Record<string, string>;
  private parId: Map<string, Poste>;

  constructor(brut: DonneesPostes) {
    this.longueurM = brut.terrain.longueur;
    this.largeurM = brut.terrain.largeur;
    this.roles = brut.roles;
    this.postes = brut.postes.map(calculerPoste);
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

function calculerPoste(def: PosteDef): Poste {
  const r = def.rect;
  const cases: Cellule[] = [];
  if (def.grille) {
    const g = def.grille;
    for (let row = 0; row < g.rows; row++) {
      for (let col = 0; col < g.cols; col++) {
        const index = row * g.cols + col;
        const morceaux = [g.colonnes?.[col], g.lignes?.[row]].filter(Boolean);
        cases.push({
          poste: def.id,
          index,
          role: g.roles[row] ?? def.id,
          label: morceaux.join(", ") || `case ${index + 1}`,
          centre: { x: r.x + ((col + 0.5) / g.cols) * r.w, y: r.y + ((row + 0.5) / g.rows) * r.h },
          rect: { x: r.x + (col / g.cols) * r.w, y: r.y + (row / g.rows) * r.h, w: r.w / g.cols, h: r.h / g.rows },
        });
      }
    }
  } else if (def.cellules) {
    def.cellules.forEach((c, index) => {
      cases.push({
        poste: def.id,
        index,
        role: c.role,
        label: c.label,
        centre: { x: r.x + c.u * r.w, y: r.y + c.v * r.h },
        rect: { x: r.x + (c.u - c.su / 2) * r.w, y: r.y + (c.v - c.sv / 2) * r.h, w: c.su * r.w, h: c.sv * r.h },
      });
    });
  } else {
    throw new Error(`Le poste ${def.id} n'a ni grille ni liste de cases`);
  }
  return { ...def, cases };
}
