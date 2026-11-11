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

/** Ligne que le poste rejoint quand l'équipe défend (voir docs/reference-football.md). */
export type LigneDefense = "gardien" | "defense" | "milieu" | "attaque";

export interface PosteDef {
  id: string;
  nom: string;
  ligneDefense: LigneDefense;
  max: number;
  maxProvisoire?: boolean;
  /** Multiplicateur du suivi du ballon (1 par défaut ; le gardien bouge moins). */
  suiviBallon?: number;
}

export type FormeCase = "hexagone" | "carre";

/** Plateau de placement : un quadrillage unique sur le demi-terrain, sans
 *  chevauchement. Chaque case appartient à un poste. */
export interface PlateauDef {
  nom: string;
  forme: FormeCase;
  /** Cases par rangée pleine. En hexagones, une rangée d'une case de moins est
   *  décalée d'une demi-case : chacune de ses cases est à cheval sur deux
   *  cases des rangées voisines. */
  colonnes: number;
  /** Zone du gardien, sous le plateau : hauteur (m), largeur des cases
   *  (fraction d'une colonne), cases de bas en haut. */
  gardien: { zoneM: number; largeurCases: number; cases: { label: string }[] };
  /** Rangées de la plus basse (près de son but) à la plus haute (ligne
   *  médiane). Chaque case : "POSTE" ou "POSTE:RÔLE" ; "" = pas de case. */
  rangees: string[][];
}

/** Case calculée, en coordonnées normalisées absolues (repère de l'équipe). */
export interface Cellule {
  poste: string;
  index: number;
  role: string;
  label: string;
  centre: PointNorm;
  /** Rectangle qui contient la case (l'hexagone y est inscrit). */
  rect: RectNorm;
  forme: FormeCase;
}

export interface Poste extends PosteDef {
  cases: Cellule[];
  /** Rectangle qui contient toutes les cases du poste (zone affichée en match). */
  rect: RectNorm;
  /** Profondeur de la case la plus basse et de la plus haute du plateau
   *  (gardien exclu) : elles donnent, avec le ballon, la ligne arrière et la
   *  ligne avant. Entre les deux, chaque joueur garde l'ordre du placement. */
  profondeurPlateau: { basY: number; hautY: number };
}

export interface DonneesPostes {
  terrain: { longueur: number; largeur: number };
  postes: PosteDef[];
  roles: Record<string, string>;
  plateauParDefaut: string;
  plateaux: Record<string, PlateauDef>;
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
      /** La ligne défensive se tient à distanceDerriereBallonM derrière le
       *  ballon, entre hauteurMinM et hauteurMaxM de son but. Elle s'y rend à
       *  vitesse limitée : elle recule au plus à vitesseReculMS (le temps que
       *  le milieu revienne) et remonte au plus à vitesseMonteeMS. */
      ligneDefensive: {
        distanceDerriereBallonM: number;
        hauteurMinM: number;
        hauteurMaxM: number;
        vitesseReculMS: number;
        vitesseMonteeMS: number;
      };
      ecartLignesM: { milieu: number; attaque: number };
      /** Étalement de chaque ligne : x = centre du bloc + (x placé − 0,5) × cette valeur.
       *  Avec les cases actuelles, 55 m donne une ligne de défense d'environ 40 m
       *  (la largeur de la surface, voir docs/reference-football.md §3). */
      largeurLigneM: { defense: number; milieu: number; attaque: number };
      /** Écart minimal entre deux joueurs voisins d'une même ligne défensive. */
      ecartMinDansLigneM: number;
      /** Largeur d'une ligne de défense ou de milieu (3 joueurs ou plus), du
       *  plus à gauche au plus à droite : environ 40 m, quel que soit le
       *  placement (référence football §3 et §9.1, règle 5). */
      largeurLigneBornesM: { min: number; max: number };
      suiviLateral: number;
      influencePlacement: Record<"gardien" | "defense" | "milieu" | "attaque", number>;
      gardien: { distanceDerriereLigneM: number; minM: number; maxM: number; suiviLateral: number };
    };
    attaque: {
      ecartement: number;
      glissementLateral: number;
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
  transition: {
    /** Temps de réaction de chaque joueur à un changement de possession :
     *  minS + parMetreS × sa distance au ballon + un aléa entre 0 et aleaS. */
    reaction: { minS: number; parMetreS: number; aleaS: number };
    /** Course de transition (repli ou projection), plus rapide que les
     *  replacements, pendant au plus dureeMaxS après la réaction. */
    sprint: { vitesseMS: number; dureeMaxS: number };
  };
  mouvement: {
    vitesseMaxMS: number;
    accelerationMS2: number;
    distanceFreinageM: number;
    /** Distance minimale entre coéquipiers. */
    distanceMinM: number;
    /** Distance minimale entre adversaires (plus courte : un défenseur colle son attaquant). */
    distanceMinAdversaireM: number;
    forceSeparation: number;
    /** Écart individuel de vitesse et d'accélération (± cette fraction). */
    variationIndividuelle: number;
    /** Retard avec lequel chacun voit le ballon bouger : une part propre au
     *  joueur (entre minS et maxS) plus parMetreS par mètre qui le sépare du ballon. */
    perception: { minS: number; maxS: number; parMetreS: number };
  };
  /** Ballon réel (mission 2). */
  ballon: {
    rayonControleM: number;
    rayonReceveurM: number;
    rayonGardienM: number;
    /** Vitesse du ballon au-delà de laquelle un joueur ne le contrôle pas. */
    vitesseControleMaxMS: number;
    recontactS: number;
    frottementParS: number;
    passeMinM: number;
    passeMaxM: number;
    voieLibreM: number;
    seuilPasse: number;
    pressionM: number;
    pressingM: number;
    decisionS: { min: number; max: number };
    premiereDecisionS: { min: number; max: number };
    vitessePasseMinMS: number;
    vitessePasseMaxMS: number;
    vitessePasseParMetre: number;
    imprecision: { baseDeg: number; parMetreDeg: number };
    vitesseTirMS: number;
    tirDistanceM: number;
    /** Surface de réparation : on y tire toujours. */
    surface: { profondeurM: number; demiLargeurM: number };
    arretProba: number;
    dribbleAvanceM: number;
    dribbleFacteur: number;
    tacle: { rayonM: number; parSeconde: number };
    reserveRepriseS: number;
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
