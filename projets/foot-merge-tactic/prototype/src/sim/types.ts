// Types partagés par la simulation. Aucune dépendance à l'affichage.

/** Point en coordonnées normalisées, dans le repère d'une équipe :
 *  x de 0 (gauche) à 1 (droite) quand l'équipe attaque vers le haut,
 *  y de 0 (sa propre ligne de but) à 1 (la ligne de but adverse). */
export interface PointNorm {
  x: number;
  y: number;
}

/** Point en mètres sur le terrain réel : X de 0 à 68, Y de 0 à 105.
 *  Y = 0 est la ligne de but de l'équipe 0, qui attaque vers Y = 105. */
export interface PointM {
  x: number;
  y: number;
}

export interface RectNorm {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GrilleDef {
  cols: number;
  rows: number;
  /** Rôle de chaque ligne, de la plus basse à la plus haute. */
  roles: string[];
  colonnes?: string[];
  lignes?: string[];
}

export interface CelluleDef {
  /** Centre de la case, relatif au rectangle (0 à 1). */
  u: number;
  v: number;
  /** Taille de la case, relative au rectangle. */
  su: number;
  sv: number;
  role: string;
  label: string;
}

export interface PosteDef {
  id: string;
  nom: string;
  rect: RectNorm;
  grille?: GrilleDef;
  cellules?: CelluleDef[];
  max: number;
  maxProvisoire?: boolean;
  monteeAttaqueM: number;
  /** Multiplicateur du suivi du ballon (1 par défaut ; le gardien bouge moins). */
  suiviBallon?: number;
}

/** Case calculée, en coordonnées normalisées absolues (repère de l'équipe). */
export interface Cellule {
  poste: string;
  index: number;
  role: string;
  label: string;
  centre: PointNorm;
  rect: RectNorm;
}

export interface Poste extends PosteDef {
  cases: Cellule[];
}

export interface DonneesPostes {
  terrain: { longueur: number; largeur: number };
  postes: PosteDef[];
  roles: Record<string, string>;
}

export interface Joueur {
  id: string;
  nom: string;
  /** Rôles naturels (1 ou 2), par exemple ["DC", "MDC"]. */
  postes: string[];
}

export interface Placement {
  joueurId: string;
  poste: string;
  cellule: number;
}

export interface Equipe {
  nom: string;
  nationalite: string;
  joueurs: Joueur[];
  composition: Placement[];
}

export type Phase = "attaque" | "defense";

export interface Reglages {
  projection: {
    defense: { compression: number; glissementLateral: number; suiviProfondeur: number; decalageMaxM: number };
    attaque: { ecartement: number; glissementLateral: number; suiviProfondeur: number; decalageMaxM: number };
    limites: { xMin: number; xMax: number; yMin: number; yMax: number };
  };
  transition: { delaiS: number };
  mouvement: {
    vitesseMaxMS: number;
    accelerationMS2: number;
    distanceFreinageM: number;
    distanceMinM: number;
    forceSeparation: number;
  };
  possessionSimulee: {
    dureeMinS: number;
    dureeMaxS: number;
    ballonVitesseMS: number;
    ciblePeriodeMinS: number;
    ciblePeriodeMaxS: number;
  };
  pasDeTempsS: number;
}
