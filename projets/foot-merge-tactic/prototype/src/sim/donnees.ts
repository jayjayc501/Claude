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
        const [c0, c1] = g.colonnesBornes?.[col] ?? [col / g.cols, (col + 1) / g.cols];
        const [l0, l1] = g.lignesBornes?.[row] ?? [row / g.rows, (row + 1) / g.rows];
        cases.push({
          poste: def.id,
          index,
          role: g.roles[row] ?? def.id,
          label: morceaux.join(", ") || `case ${index + 1}`,
          centre: { x: r.x + ((c0 + c1) / 2) * r.w, y: r.y + ((l0 + l1) / 2) * r.h },
          rect: { x: r.x + c0 * r.w, y: r.y + l0 * r.h, w: (c1 - c0) * r.w, h: (l1 - l0) * r.h },
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
