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
  /** Bornes de chaque colonne (0 à 1 dans le rectangle). Des bornes qui se
   *  recouvrent donnent des cases qui se chevauchent (la case de l'axe à
   *  cheval sur la gauche et la droite). Par défaut : colonnes égales. */
  colonnesBornes?: [number, number][];
  /** Idem pour les lignes, de la plus basse à la plus haute. */
  lignesBornes?: [number, number][];
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
    defense: {
      ligneDefensive: { distanceDerriereBallonM: number; hauteurMinM: number; hauteurMaxM: number };
      ecartLignesM: { milieu: number; attaque: number };
      /** Étalement de chaque ligne : x = centre du bloc + (x placé − 0,5) × cette valeur.
       *  Avec les cases actuelles, 55 m donne une ligne de défense d'environ 40 m
       *  (la largeur de la surface, voir docs/reference-football.md §3). */
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
      /** Profondeur des cases (demi-terrain, repère de l'équipe) qui donnent la
       *  ligne arrière (basY) et la ligne avant (hautY). Entre les deux, chaque
       *  joueur garde sa place dans l'ordre de profondeur choisi au placement. */
      profondeurPlacement: { basY: number; hautY: number };
      /** La ligne arrière se tient à cette distance derrière le ballon… */
      distanceDefenseBallonM: number;
      /** … sans descendre sous ce minimum ni monter au-dessus de ce maximum (m depuis son but). */
      ligneArriereMinM: number;
      ligneArriereMaxM: number;
      /** Longueur de l'équipe (ligne arrière → ligne avant), en mètres. */
      longueurEquipeM: { min: number; max: number };
      /** La ligne avant reste à cette distance en deçà de la ligne défensive adverse (hors-jeu). */
      margeLigneAdverseM: number;
      gardien: { distanceDerriereLigneM: number; minM: number; maxM: number };
    };
    limites: { xMin: number; xMax: number; yMin: number; yMax: number };
  };
  transition: { delaiS: number };
  mouvement: {
    vitesseMaxMS: number;
    accelerationMS2: number;
    distanceFreinageM: number;
    /** Distance minimale entre coéquipiers. */
    distanceMinM: number;
    /** Distance minimale entre adversaires (plus courte : un défenseur colle son attaquant). */
    distanceMinAdversaireM: number;
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
