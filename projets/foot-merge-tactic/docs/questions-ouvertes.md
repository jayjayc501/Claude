# Questions ouvertes — Foot Merge Tactic

Ce fichier liste les points **[OUVERT]**, pas encore décidés. **Ne pas inventer de réponse** : signaler le point et proposer des options argumentées. Quand le concepteur tranche, la décision passe dans `decisions.md` et la question part dans `historique-etat.md`.

## Ouvertes le 16/11 (audit)

- **Durées du mercato et de la mi-temps en tournoi en ligne** : plus courtes que les 5 minutes de préparation (17/11), mais pas encore fixées. Exemple proposé : 2 min de mercato et 1 min de mi-temps, comme en 1 contre 1.
- **Économie du mercato** : revenu par journée, intérêt. Le concepteur la verra plus tard.
- **Cartes données au départ** : à revoir quand le moteur sera stabilisé avec tous les joueurs.
- **Comment on gagne les cartes** : à rediscuter avec plus de propositions. Piste du concepteur : **un paquet offert à chacun des 3 premiers tournois du jour**, plus d'autres bonus à définir.
- **Niveaux de cartes** : nombre, effet et seuils. Deux options à départager :
  - un effet faible partout ;
  - des niveaux plafonnés en tournoi classé.
- Le Club, la Tournée, les récompenses, les objectifs et la boutique : le concepteur veut en reparler avec plus de propositions (prompt C1).

## Match, durée et règles

- **Durée** : temps de football simulé par mi-temps (essai à 30 s décidé le 16/11) ; nombre de temps forts montrés si on passe au montage ; durées exactes de la préparation et de la mi-temps.
- **Poids chiffré** de la qualité, de la tactique et du hasard.
- **Temps de réaction et de perception, vitesse de recul de la ligne** : réglables, à tester. Depuis le 12/11, des réactions individuelles remplacent l'ancien délai unique de 0,5 s.
- **Règles fines** : le hors-jeu, les fautes, les touches, les corners et les coups francs sont en place dans le prototype depuis le 12/11. Restent ouverts :
  - les cartons ;
  - les coups francs directs ;
  - les centres sur coup franc ;
  - le nombre de remplaçants ;
  - la fatigue.
- **Postes et consignes** : le comportement exact de chaque poste, et la liste des consignes tactiques. Les consignes d'équipe (plus défensive, plus offensive, en contre…) viendront plus tard.
- **Moteur et terrain** : le moteur technique final, les dimensions du terrain, les coordonnées et tailles des rectangles, la liste finale des postes.

## Placement et postes

- **Plateau** :
  - nombre de cases en hexagones (DC 5, milieu 8, attaque 5 dans le prototype) ;
  - DD et DG à 2 ou 3 cases (3 dans le prototype) ;
  - maximum de joueurs par poste ;
  - découpage exact du plateau ;
  - chiffres des règles de projection, à régler ensemble sur le prototype.
- **Postes des joueurs** : un DG peut-il jouer DD, et un AG, AD ? Un joueur a-t-il 1 ou 2 postes ?

## Joueurs, cartes et bonus

- Prix et notes des 60 cartes ; difficulté de l'ordinateur.
- Taille de l'effectif de chaque pays, qui fixe la fréquence des copies et donc des fusions ; prix au mercato.
- **Chiffres des bonus** : les styles, les pays et les fusions sont à juger en regardant des matchs.
- **Styles** : retour éventuel de Créateur, Finisseur, Combatif ; part des joueurs sans style.
- **Barème de la fusion** : son impact doit augmenter (16/11). Trois barèmes à comparer à budget égal (prompt B3).
- **Notes** (12/11) :
  - récupération à la mi-temps et remplacements, avec la fatigue ;
  - points donnés par un niveau de carte (la fusion est tranchée le 14/11) ;
  - note globale selon le poste (proposée) ;
  - note de match sur 10 (proposée, barème dans `noteMatch.json`) ;
  - faire chercher par le moteur les duels favorables, comme l'ailier rapide contre le latéral lent. Les duels de vitesse sont déjà cherchés.
- **Progression** : couleurs au-delà de l'Or ; écarts de niveau entre adversaires (appariement ou plafond) ; ressources pour faire évoluer les cartes.
- **Interface** (12/11) :
  - nombre maximal de fusions (3 dans la maquette) ;
  - taille du mercato (6 dans la maquette) ;
  - production des visuels des joueurs : pièces assemblées, modèles 3D ou illustrateur ;
  - lisibilité des bustes sur un vrai téléphone.

## Tournoi et jeu en ligne

- **Égalités** : classement des groupes, matchs nuls en demi-finale et en finale.
- **Temps entre deux matchs.**
- **Mode en ligne** :
  - arrondir les positions du film au millimètre, pour un film 4 fois plus petit ;
  - faire calculer les matchs des ordinateurs eux aussi par l'arbitre ;
  - les marges avant le coup d'envoi (8 s) et avant la reprise (6 s) ;
  - ce qui se passe si un joueur quitte la partie. Aujourd'hui, son équipe joue quand même ; s'il n'a rien envoyé, elle est faite automatiquement.
- **Stockage et ménage du serveur** (A3 mis de côté le 17/11, à reprendre vers 300 parties) : seuls les films pèsent (environ 1,7 Mo par partie ; offre gratuite : 1 Go de fichiers, 500 Mo de base, soit environ 600 parties) ; une partie sans film ne fait que quelques Ko. Piste [PROPOSITION] : garder toutes les parties (historique) et ne supprimer que les films de plus de 30 jours ; les buteurs ne sont aujourd'hui que dans le film. Limite de créations par connexion (10 par heure) prête aussi. Code sur la branche `a3-serveur`. Vigilance : un projet gratuit est mis en pause après une semaine sans activité.
- **Triche au 1 contre 1** (pour un futur mode classé seulement) : aujourd'hui, un téléphone modifié peut envoyer une équipe qui ne vient pas de son draft. Deux solutions : (1) le téléphone envoie la liste de ses gestes du draft et le serveur la rejoue avec la même graine (environ une séance ; rien ne change pour le joueur ; un tricheur pourrait encore connaître les offres à venir) ; (2) le draft se fait sur le serveur (2 à 3 séances, une petite attente à chaque geste, les coupures réseau à gérer ; triche impossible). Conseil de Claude : (1), le jour d'un mode classé.
- **2e mi-temps sur le serveur** (mesuré le 17/11 sur Supabase) : 0,85 s de calcul pour la 1re mi-temps, 1,33 s pour la 2e, qui rejoue la 1re ; limite de Supabase : 2 s de calcul par requête. Garder l'état de la mi-temps n'est utile que si la 2e dépasse 1,5 s après une évolution du moteur.

## Le jeu dans son ensemble

- Interface et graphismes définitifs.
- **Nom définitif du jeu** et **modèle économique**.

## Si les hybrides reviennent (mis de côté le 16/11)

- Postes naturels et style d'un hybride.
- « Hybride A/B + copie de A » est-il autorisé ?
- Règle de nom de l'hybride.
- Un hybride garde-t-il le pays commun pour le palier de pays ? (oui a priori)
- Équilibrage : pistes déjà présentées, non validées :
  - coût naturel (deux joueurs pour un) ;
  - un poste naturel de chaque joueur d'origine ;
  - niveau de la plus faible des deux cartes ;
  - hybride qui ne progresse qu'avec un second hybride identique ;
  - un seul style choisi à la fusion.
- Fusion « meilleure valeur de chaque statistique » entre postes opposés (gardien + attaquant, par exemple) : quels postes naturels pour l'hybride, sachant qu'un joueur en a au plus 2 ? Risque de joueurs bons partout.

## Points de vigilance (analyse de Claude, non validés)

Le détail des anciens points est dans `historique-etat.md`.

- **Hasard** : des matchs courts laissent beaucoup de place au hasard. Le temps simulé par mi-temps est le curseur, à mesurer.
- **Nom** : « Foot Merge Tactic » est trop proche de « Merge Tactics » (Supercell). À changer avant toute publication ; le site est déjà en ligne.
- **Réalisme du moteur** :
  - encore trop de changements de camp : 5,4 par minute, contre 2 à 4 dans le vrai football ;
  - on court encore trop : 3,9 m/s en moyenne, contre environ 2 dans le vrai football ;
  - presque pas de hors-jeu ;
  - appels et soutien encore simples.
- **Équité** : appariement ou plafond de niveau en tournoi. Aujourd'hui, une équipe à 80 contre une équipe à 65 gagne 9 fois sur 10.
- **Visuels des joueurs** : une image générée par joueur ne tiendra pas sur des centaines de joueurs, car les styles dérivent. Pour le jeu final, prévoir :
  - un jeu de pièces (corps, têtes, cheveux) avec un maillot recoloré selon le pays ;
  - ou des modèles 3D ;
  - ou un illustrateur.

  Aucun logo, numéro ni maillot qui rappelle un vrai maillot.
- **Fluidité** : le feu des fusions, un filtre SVG de turbulence, est l'effet le plus lourd. Il n'a jamais été mesuré sur un téléphone d'entrée de gamme (audit du 16/11, prompt A2).
- **Boutique** : les tirages payants sont encadrés dans plusieurs pays d'Europe. Des pochettes gagnées en jouant et des achats où l'on voit ce qu'on achète évitent le sujet (audit du 16/11).
