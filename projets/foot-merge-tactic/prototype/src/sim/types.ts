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
  /** Montée en attaque propre à chaque ligne de la grille (sinon celle du poste). */
  monteeParLigneM?: number[];
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

/** Ligne que le poste rejoint quand l'équipe défend (voir docs/reference-football.md). */
export type LigneDefense = "gardien" | "defense" | "milieu" | "attaque";

export interface PosteDef {
  id: string;
  nom: string;
  ligneDefense: LigneDefense;
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
  /** Montée en attaque de cette case, en mètres. */
  monteeAttaqueM: number;
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
    defense: {
      ligneDefensive: { distanceDerriereBallonM: number; hauteurMinM: number; hauteurMaxM: number };
      ecartLignesM: { milieu: number; attaque: number };
      largeurLigneM: { defense: number; milieu: number; attaque: number };
      /** Écart minimal entre deux joueurs voisins d'une même ligne défensive. */
      ecartMinDansLigneM: number;
      suiviLateral: number;
      influencePlacement: number;
      gardien: { distanceDerriereLigneM: number; minM: number; maxM: number; suiviLateral: number };
    };
    attaque: {
      ecartement: number;
      glissementLateral: number;
      /** Profondeur du ballon (repère de l'équipe) où le bloc n'est ni avancé ni reculé. */
      profondeurReference: number;
      suiviProfondeur: number;
      decalageMaxM: number;
      /** Les attaquants restent à cette distance en deçà de la ligne du hors-jeu. */
      margeHorsJeuM: number;
    };
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
