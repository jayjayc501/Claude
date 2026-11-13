// Fournisseur de graines (13/11 au soir, préparation du mode en ligne) : toutes
// les graines du jeu viennent d'ici, et de nulle part ailleurs. En local, rien
// ne change : la partie est tirée au sort, le match que tu regardes prend 1, 2,
// 3… (le compteur ne repart pas à zéro d'une partie à l'autre dans la même
// page), et les autres matchs de la journée 1000 + 7 × journée + camp. Plus
// tard, un serveur pourra fournir ces graines à la place.

export interface FournisseurGraines {
  /** Graine d'une nouvelle partie (draft, mercatos, choix des ordinateurs). */
  partie(): number;
  /** Graine du match que tu regardes. C'est la même tant qu'il n'est pas fini
   *  (un match recommencé, en changeant d'onglet, se rejoue à l'identique). */
  matchRegarde(): number;
  /** Le match regardé est fini : le suivant aura une nouvelle graine. */
  matchRegardeFini(): void;
  /** Graine d'un match simulé sans affichage (rencontres des ordinateurs). */
  matchSimule(journee: number, campA: number): number;
}

/** Graines du prototype, sur le téléphone (comme avant le 13/11 au soir). */
export class GrainesLocales implements FournisseurGraines {
  private match = 1;

  /** `hasard` : tirage de la graine de partie (par défaut Math.random ; fixé dans les tests). */
  constructor(private readonly hasard: () => number = Math.random) {}

  partie(): number {
    return Math.floor(this.hasard() * 2 ** 31);
  }

  matchRegarde(): number {
    return this.match;
  }

  matchRegardeFini(): void {
    this.match += 1;
  }

  matchSimule(journee: number, campA: number): number {
    return 1000 + journee * 7 + campA;
  }
}
