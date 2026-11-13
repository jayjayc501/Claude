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

/** Sous-notes d'un joueur de champ (12/11 : 4 notes de 2 sous-notes, sur 99).
 *  Vitesse = accélération + pointe ; Technique = passe + dribble ;
 *  Tir = précision + puissance ; Physique = duel + endurance. */
export interface Notes {
  acceleration: number;
  pointe: number;
  passe: number;
  dribble: number;
  precision: number;
  puissance: number;
  duel: number;
  endurance: number;
  /** Gardien (13/11) : 4 notes simples, sans sous-notes. */
  reflexes: number;
  placement: number;
  sorties: number;
  relance: number;
}

export interface Joueur {
  id: string;
  nom: string;
  /** Rôles naturels (1 ou 2), par exemple ["DC", "MDC"]. */
  postes: string[];
  /** Style de jeu (REC, TEC, RAP, REM) ; absent ou null : aucun style. */
  style?: string | null;
  /** Sous-notes ; absentes (ou gardien, pour l'instant) : toutes à la référence (65). */
  notes?: Partial<Notes> | null;
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
  /** Tactique d'équipe (EQU, PRS, GEG, CON, TIK) ; absente : Équilibrée. */
  tactique?: string;
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
        /** Ballon à moins de dangerM devant la ligne : recul rapide. */
        dangerM: number;
        vitesseReculDangerMS: number;
        vitesseMonteeMS: number;
      };
      ecartLignesM: { milieu: number; attaque: number };
      /** Étalement de chaque ligne : x = centre du bloc + (x placé − 0,5) × cette valeur.
       *  Avec les cases actuelles, 55 m donne une ligne de défense d'environ 40 m
       *  (la largeur de la surface, voir docs/reference-football.md §3). */
      largeurLigneM: { defense: number; milieu: number; attaque: number };
      /** Écart minimal entre deux joueurs voisins d'une même ligne défensive. */
      ecartMinDansLigneM: number;
      /** Écart à l'axe des défenseurs centraux, réduit par ce facteur (ils restent près l'un de l'autre). */
      resserrementDC: number;
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
      /** Part du glissement pour les joueurs de côté du côté opposé au ballon (ils gardent la largeur). */
      glissementCoteOppose: number;
      /** Surnombre côté ballon : latéraux et milieux montent de distanceM au plus, selon leur proximité
       *  latérale du ballon, la hauteur du ballon (de ballonDebut à ballonPlein) et la hauteur de leur placement. */
      surnombre: { distanceM: number; ballonDebut: number; ballonPlein: number; proximite: number };
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
    /** Décélération maximale (freiner, se retourner), plus forte que l'accélération. */
    freinageMS2: number;
    distanceFreinageM: number;
    /** Distance minimale entre coéquipiers. */
    distanceMinM: number;
    /** Distance minimale entre adversaires (plus courte : un défenseur colle son attaquant). */
    distanceMinAdversaireM: number;
    forceSeparation: number;
    /** Écart individuel de vitesse et d'accélération (± cette fraction). */
    variationIndividuelle: number;
    /** Petits mouvements de chaque joueur de l'équipe qui attaque autour de sa place (moins « robot »). */
    respiration: { amplitudeM: number; periodeMinS: number; periodeMaxS: number };
    /** Retard avec lequel chacun voit le ballon bouger : une part propre au
     *  joueur (entre minS et maxS) plus parMetreS par mètre qui le sépare du ballon. */
    perception: { minS: number; maxS: number; parMetreS: number };
    /** Allures (12/11, « plus réaliste dans les mouvements ») : on ne court pas
     *  tout le temps. Vitesse voulue = vitesse de sa place (suivie sans retard)
     *  + rattrapage de l'écart (écart / reponseS) : marche pour 1 à 2 m, trot
     *  pour quelques mètres. Loin du jeu, plafond de course (courseMS), relevé
     *  de rattrapageParM par mètre au-delà de toleranceM. Pleine vitesse quand
     *  on joue le ballon, en transition ou à moins de zoneActiveM du ballon. */
    /** Repère de la forme d'équipe : vitesses maximales (m/s) en largeur et en profondeur (0 : vrai ballon). */
    forme: { vitesseXMS: number; vitesseYMS: number; vitesseReculYMS: number };
    allure: {
      reponseS: number;
      reponseRapideS: number;
      courseMS: number;
      toleranceM: number;
      rattrapageParM: number;
      zoneActiveM: number;
      /** Plus de reculUrgentM devant sa place : retour rapide côté but. */
      reculUrgentM: number;
      /** Part de la vitesse de sa place qu'on suit directement (0 à 1). */
      suiviCible: number;
      /** Lissage de la vitesse estimée de sa place (secondes). */
      lissageS: number;
    };
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
    /** Joueurs qui sortent sur le porteur (le premier presse, les autres couvrent). */
    presseurs: number;
    /** Un défenseur central sort sur le porteur à moins de distanceM, s'il est dans l'axe (à moins de axeM du centre). */
    sortieDC: { distanceM: number; axeM: number };
    /** Poids du gain vers l'avant et de l'espace autour du receveur dans la note d'une passe. */
    poidsProgression: number;
    poidsEspace: number;
    pressionM: number;
    pressingM: number;
    decisionS: { min: number; max: number };
    premiereDecisionS: { min: number; max: number };
    vitessePasseMinMS: number;
    vitessePasseMaxMS: number;
    vitessePasseParMetre: number;
    imprecision: { baseDeg: number; parMetreDeg: number; sousPressionFacteur: number };
    vitesseTirMS: number;
    tirDistanceM: number;
    /** Seul face au but : tire à cette distance. */
    seulTirM: number;
    /** Visée (m de l'axe du but), erreur, arrêt du gardien selon l'écart au point de passage. */
    tir: { contreProba: number; viseMinM: number; viseMaxM: number; erreurBaseM: number; erreurParMetre: number; erreurPenaltyM: number; arretMax: number; arretMin: number; arretParMetre: number; plongeonVitesseMS: number; plongeonDureeS: number; rayonPlongeonM: number; arretParMetreDistance: number; paradeProba: number };
    /** Surface de réparation : on y tire toujours. */
    surface: { profondeurM: number; demiLargeurM: number };
    arretProba: number;
    dribbleAvanceM: number;
    dribbleFacteur: number;
    tacle: { rayonM: number; parSeconde: number };
    reserveRepriseS: number;
    /** Passe dans l'espace : devant le receveur, dans le sens du jeu. */
    passeEspace: { avanceM: number; avanceSurAdversaireS: number; courseMinMS: number };
    /** Ballon rapide qui frôle un adversaire : contrôlé ou dévié (contre). */
    contre: { vitesseMinMS: number; probaControle: number; perteVitesse: number; angleMinDeg: number; angleMaxDeg: number };
    /** Dribble en 1 contre 1 face à un adversaire proche. */
    dribble: { distanceM: number; probaTentative: number; probaReussite: number; eliminationS: number };
    /** Porteur qui protège le ballon : tacle moins probable. */
    protection: { dureeS: number; facteurTacle: number };
    /** Dégagement seulement dans son tiers défensif (en mètres de son but). */
    zoneDegagementM: number;
    /** Faute sur un duel gagné : coup franc, penalty dans la surface. */
    fautes: { proba: number; arretPenaltyProba: number };
    horsJeuToleranceM: number;
    /** Pause du tireur avant une remise en jeu (touche, six mètres, coup franc, corner, engagement). */
    pauseArretS: { min: number; max: number };
    /** Après un but : temps minimal avant l'engagement (l'annonce a le temps de disparaître). */
    attenteButS: number;
    centre: { zoneProfondeurM: number; ecartAxeM: number; proba: number; dureeS: number; erreurDeg: number; partEnLAir: number };
    degagement: { zoneM: number; longueurMinM: number; longueurMaxM: number; dureeS: number; erreurDeg: number };
    /** Construction : avant bouché (adversaire dans un cône de boucheM) → seuil
     *  de passe baissé de baisseSeuil (circulation) et le porteur temporise
     *  (il n'avance que de temporiseM au lieu de foncer). Passe dans la surface
     *  adverse : receveur à surfaceOuvertM au moins de tout adversaire, voie
     *  libre × surfaceVoieFacteur, note diminuée de surfaceMalus. */
    construction: {
      boucheM: number;
      baisseSeuil: number;
      largeurM: number;
      bonusLargeur: number;
      temporiseM: number;
      /** En temporisant, il s'écarte de ecartM de l'adversaire le plus proche. */
      ecartM: number;
      surfaceOuvertM: number;
      surfaceVoieFacteur: number;
      surfaceMalus: number;
    };
    /** Tir de loin (hors surface, à moins de tirDistanceM) : chance à chaque
     *  décision = probaBase + probaMax × (1 − distance / tirDistanceM). */
    tirLoin: { probaBase: number; probaMax: number };
    /** Un adversaire à moins de pressionM : le porteur décide dans ce délai (s). */
    reactionPressionS: number;
    marquage: { declenchementM: number; zoneM: number; demiLargeurM: number; rayonM: number; distanceM: number; milieux: boolean; zonePressingM: number };
    /** Probabilité de passer quand même à un joueur hors-jeu. */
    horsJeuVuProba: number;
    /** Juste après une perte : les plus proches (dans rayonM) pressent pendant
     *  dureeS, et taclent tacleFois plus souvent ; le porteur adverse décide
     *  plus vite (temps de décision × precipite) et passe moins juste (× gene). */
    contrePressing: { dureeS: number; rayonM: number; joueurs: number; tacleFois: number; precipite: number; gene: number };
    /** Contre-attaque : pendant dureeS après la récupération, on joue plus vers
     *  l'avant (+bonusProgression au poids de la progression) et les appels sont
     *  appelsFois plus fréquents, même si le porteur est pressé. */
    contreAttaque: { dureeS: number; bonusProgression: number; appelsFois: number };
    /** Jeu long (12/11) : ballon aérien vers un attaquant lancé ou libre,
     *  joué depuis sa moitié ou le milieu (proba à chaque décision ; probaContre
     *  juste après la récupération). Le receveur doit gagner au moins gainMinM
     *  et arriver au point avant les adversaires (avanceS de marge). */
    jeuLong: { proba: number; probaContre: number; gainMinM: number; distanceMinM: number; distanceMaxM: number; profondeurMaxM: number; avanceS: number; vitesseMS: number; erreurDeg: number };
    /** Gêne de l'équipe qui défend sur les passes adverses : un défenseur à
     *  moins de rayonM du passeur multiplie l'imprécision par facteur ; un
     *  receveur serré à moins de controleRayonM rate son contrôle (controleRate). */
    gene: { rayonM: number; facteur: number; controleRayonM: number; controleRate: number };
    /** Jeu sans ballon de l'équipe qui attaque (12/11, référence §5 : soutien, appels). */
    sansBallon: {
      /** Les `joueurs` coéquipiers les plus proches (à moins de rayonM) se
       *  rapprochent du porteur jusqu'à distanceM (de rapprochementMaxM au plus,
       *  triangles) et ouvrent une ligne de passe : pas de côté (decalagesM) ou
       *  décrochage (reculM). */
      soutien: { joueurs: number; rayonM: number; distanceM: number; rapprochementMaxM: number; decalagesM: number[]; reculM: number };
      /** Appel en profondeur : chance par seconde quand le porteur a du temps ;
       *  course de dureeS vers un point profondeurM derrière la défense adverse,
       *  en diagonale vers l'axe ; l'attaquant part entre ecartMinM et ecartMaxM
       *  derrière l'avant-dernier défenseur, au moins avanceBallonM devant le
       *  ballon, quand le porteur est à plus de zoneM de son but. Le défenseur
       *  le plus proche (à moins de suivreRayonM) le suit. */
      appel: {
        parSeconde: number;
        dureeS: number;
        profondeurM: number;
        diagonale: number;
        ecartMinM: number;
        ecartMaxM: number;
        avanceBallonM: number;
        zoneM: number;
        suivreRayonM: number;
      };
    };
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
