# Contexte du projet — Foot Merge Tactic (titre de travail)

Ce fichier est le contexte de travail de Claude pour ce projet. Il résume le
dossier de conception et fixe la façon de travailler.

Document de référence complet : `projets/foot-merge-tactic/docs/dossier-conception.md`
du dépôt jayjayc501/Claude (version du 11 novembre 2026, complétée le même jour
par le §20 « Décisions de la séance du 11 novembre 2026 »). En cas de doute ou
de contradiction, le dossier fait foi (le §20 prime sur les sections plus
anciennes), puis le concepteur.

Mettre ce fichier à jour dès qu'une décision est validée ou qu'une étape est
terminée (sections « Décisions validées », « Questions ouvertes », « État »).

## Où se trouve quoi (pour toutes les discussions)

- **Projet claude.ai « App Foot Merge Tactic »** : ce fichier (`contexte-foot-merge-tactic.md`) et le dossier de conception complet (`dossier-conception.md`). Toutes les discussions du projet y ont accès.
- **Dépôt GitHub jayjayc501/Claude**, dossier `projets/foot-merge-tactic/` : ce même fichier (`CLAUDE.md`), le dossier de conception (`docs/dossier-conception.md`), puis plus tard le code et le journal des tests. **Le dépôt est la version de référence.**
- Pour écrire du code ou sauvegarder des fichiers : ajouter le dépôt à la session et suivre son `CLAUDE.md` (à la racine et dans ce dossier).
- Quand une discussion valide une décision ou change le plan, mettre à jour ce fichier **aux deux endroits** (dépôt et projet claude.ai). Sinon, les autres discussions ne seront pas au courant.
- Pour une simple discussion de conception (sans code), répondre en s'appuyant sur ce fichier et sur le dossier, en indiquant toujours si un point est validé, proposé ou ouvert.

## Règle d'or : trois statuts à ne jamais mélanger

- **[VALIDÉ]** : décidé par le concepteur. À respecter.
- **[PROPOSITION]** : piste technique ou de design. À tester, jamais à coder comme une vérité.
- **[OUVERT]** : pas encore décidé. Signaler le point et proposer des options argumentées, sans rien inventer.

Une proposition ne devient une règle qu'après validation explicite du concepteur.

## Le jeu en bref

Jeu de football mobile. Le joueur est **entraîneur** : il ne contrôle pas les
footballeurs. Avant un tournoi, il compose un deck de 4 ou 5 nationalités.
Pendant le tournoi, il recrute des joueurs fictifs (cartes) au mercato, les
fusionne, les place dans les zones de ses organisations offensive et
défensive, puis regarde un moteur simuler le match en vue du dessus, comme le
moteur 2D de Football Manager. L'idée de fusion s'inspire du mode Merge
Tactics de Clash Royale.

Principe directeur : *une meilleure équipe donne un avantage ; un meilleur
entraîneur doit pouvoir faire la différence.* Ni la note globale des cartes ni
le hasard ne doivent décider seuls du résultat.

**Priorité absolue : le moteur de match.** Les cartes, la collection, les
fusions, les tournois et la progression passent après. Le moteur doit donner
l'impression d'une équipe qui joue au football, pas de pions qui bougent sur
un plateau.

## Décisions validées

### Univers
- Vrais pays (cadre et nationalités), clubs fictifs, joueurs fictifs.
- Aucun élément sous licence : vrais joueurs, visages, noms de clubs, logos, maillots, marques de compétitions.
- Pas de divisions hebdomadaires à la Hattrick. Matchs jouables à tout moment, sans calendrier ni attente.

### Match
- Vue du dessus, terrain entier visible, 22 joueurs, ballon visible. Marqueurs simples au début, pas de 3D. Référence : le moteur 2D de Football Manager. Le joueur doit voir sa tactique.
- **Mi-temps de jeu : 10 s à l'écran, en montage accéléré à vitesse variable.** Le moteur simule toute la mi-temps en arrière-plan ; l'écran enchaîne les actions importantes. La construction passe très vite, la dernière passe et le tir reviennent presque à vitesse réelle.
- **Préparation et mi-temps : plus de 10 s** (durée exacte à tester). L'ancien total de 40 s n'est plus valable.
- Aucune action pendant le match : on agit seulement pendant la préparation et la mi-temps.
- Le moteur gère les déplacements, passes, appels, duels, interceptions, tirs et transitions.

### Postes, rectangles et sous-zones
- Postes classiques : G, DC, DD, DG, MDC, MC, MOC, MD, MG, AD, AG, AC (liste à finaliser).
- Un joueur a 1 ou 2 postes naturels. Placé hors de son poste, il est moins efficace mais reste utilisable.
- Chaque poste a un **rectangle de référence fixe** (position, largeur, profondeur). Ce n'est ni une case exclusive ni une barrière physique. Les rectangles ne bougent pas.
- **Chaque rectangle est découpé en sous-zones** : 6 pour DC, 3 pour AG et AD (autres postes à définir). L'entraîneur place chaque joueur dans une sous-zone ; le rectangle reste la zone de liberté dans laquelle le moteur fait bouger le joueur.
- **Plusieurs joueurs peuvent occuper le même poste**, dans la limite d'un maximum par poste (exemple donné : 3 DC, 1 AG).
- Les rectangles peuvent **se chevaucher** et plusieurs joueurs peuvent occuper une zone commune. Le moteur doit quand même empêcher les joueurs de s'empiler.
- Aucune formation classique rigide imposée.
- **Deux organisations** : chaque poste a un rectangle offensif et un rectangle défensif, qui peuvent être à des endroits différents. Les chevauchements sont possibles dans les deux.
- **Transition progressive** entre les deux, avec un léger délai : pas de téléportation, replacement ou projection progressifs, pressing et contre-pressing possibles.
- Le rectangle est une zone de référence, pas une destination : le joueur bouge selon le ballon, ses coéquipiers, les adversaires, les espaces, ses consignes et ses qualités.

### Tournoi et adversaires
- **Groupes de 4** (et non de 3), complétés par des équipes IA si besoin. Nombre de groupes à confirmer.
- Format d'origine, à reconfirmer avec les groupes de 4 : les 2 premiers de chaque groupe vont en demi-finales (1A contre 2B, 1B contre 2A), puis finale. Pas d'aller-retour.
- Adversaires : **entraîneurs IA** au départ (IA de jeu). À terme, adversaires humains **en direct**.
- Si un joueur se déconnecte, son équipe reste en l'état jusqu'à la fin du tournoi.

### Deck, mercato et traits
- Reprendre les idées de fusion du mode Merge Tactics de Clash Royale : achat de joueurs entre les matchs, fusion de copies identiques, bonus de traits.
- Avant un tournoi, on compose un **deck de 4 ou 5 nationalités**. Les joueurs proposés pendant le tournoi viennent de ces nationalités.
- Pour une nationalité donnée, **tout le monde a les mêmes joueurs**. Seuls les niveaux de cartes diffèrent.
- Chaque joueur a **deux traits : sa nationalité et un style de jeu** (sa spécialité).
- **Bonus de même nationalité**, cohérent avec la tradition de football du pays.

### Cartes, progression, fusions
- Chaque **carte joueur a son propre niveau**, comme dans Clash Royale. La **carte change de couleur** quand elle évolue en dehors des matchs : Bronze, Argent, Or sont les couleurs du niveau. Tous les joueurs ne commencent pas au même niveau.
- Fusions et évolutions **temporaires** : remises à zéro à chaque tournoi.
- Fusion de 2 copies du même joueur : joueur amélioré, même identité. Un joueur déjà fusionné peut l'être à nouveau avec sa copie.
- Fusion de 2 joueurs différents **de même nationalité** : joueur hybride, qui garde la nationalité commune.
- Un hybride n'a **jamais plus de 2 identités d'origine** (A/B oui, A/B/C jamais).
- Pistes appréciées (intentions, pas encore des règles chiffrées) : noms combinés, visage partagé en deux, transformation visuelle de plus en plus spectaculaire (style original, rien de copié), meilleure valeur de chaque statistique, cumul des bonus.

## Propositions à tester (non validées)

Technique et moteur :
- Technologie : **Godot 4 en 2D**, vue du dessus. À confirmer avant tout développement important.
- Modules séparés : MatchSimulation, Pitch, Player, PositionZone, TeamTactics, TransitionManager, PlayerAI, BallController, ActionResolver, MatchEvents, MatchStats, TestHarness. Jamais un seul gros fichier.
- Simulation séparée du rendu et des animations. Simulation possible sans affichage (des milliers de matchs). Graine aléatoire contrôlable.
- Terrain, rectangles, sous-zones, attributs et paramètres dans des fichiers de données, pas codés en dur.
- Répartition 40 % qualité / 40 % tactique / 20 % hasard : **ancienne piste, pas une règle**. Ne pas la coder.
- Contreparties tactiques à vérifier : pressing haut et espaces dans le dos ; bloc bas et moins de présence offensive ; jeu sur les ailes et dépendance aux excentrés ; axe dense et côtés libres ; joueurs très hauts et transition défensive risquée. Aucune tactique ne doit dominer.
- Attributs indicatifs : vitesse, accélération, endurance, contrôle, passe courte, passe longue, vision, dribble, tir, finition, puissance, duel physique, tacle, interception, placement défensif, jeu aérien, réflexes et arrêts (gardien). En ajouter peu à la fois, chacun avec un effet identifiable dans le moteur.

Affichage du match :
- Préparation et mi-temps de 20 à 30 s pour commencer, soit un match d'environ 1 min à 1 min 20.
- Facteurs de vitesse réglables dans les données et ajustés sur téléphone. Au-delà de 3 à 4 fois la vitesse réelle, le ballon risque de devenir difficile à suivre.
- Choisir des temps forts qui montrent la conséquence des choix tactiques (but encaissé en transition après un bloc trop haut, par exemple).

Placement (choix par défaut, non contredits par le concepteur) :
- DC : 3 colonnes sur 2 lignes (gauche, axe, droite ; haut, bas). AG / AD : 3 sous-zones en profondeur (bas, milieu, haut).
- Un seul joueur par sous-zone. La sous-zone choisie vaut à la fois pour le rectangle offensif et pour le rectangle défensif.
- Pour chaque poste, les données décrivent : rectangle offensif, rectangle défensif, découpage (colonnes et lignes), maximum de joueurs.

Boucle de tournoi (transposition de Merge Tactics) :
- Budget de mercato gagné à chaque match (l'équivalent de l'élixir) ; mercato de 3 joueurs, renouvelés après chaque achat ; deux copies identiques fusionnent automatiquement ; joueurs achetés sur le banc des remplaçants, revente possible.
- L'hybride reste une fusion volontaire, et la signature du jeu (Merge Tactics ne fusionne que des troupes identiques).
- 11 joueurs dès le premier match : le mercato sert à remplacer et à fusionner, pas à compléter l'équipe.
- Tactique réglée avant le tournoi, sans chrono ; en préparation et à la mi-temps, seulement des ajustements rapides (glisser un joueur sur un autre pour fusionner, sur une sous-zone pour le placer).
- La couleur de la carte montre le niveau permanent ; des étoiles montrent les fusions temporaires du tournoi.

Traits :
- Les bonus modifient des comportements du moteur plutôt que d'ajouter des points de statistiques. Styles possibles : presseur, technicien, rapide, rempart, créateur, combatif, finisseur. Certains peuvent raccourcir le délai de transition.
- Paliers de bonus à 3, 5 et 7 joueurs, pour les styles comme pour la nationalité.
- Traditions nationales sans caricature (pressing pour l'Allemagne, technique pour l'Espagne, rigueur défensive pour l'Italie…) ; à l'intérieur d'un pays, les joueurs gardent des styles individuels variés.
- Le style est indépendant du poste.

Adversaires :
- L'IA joue le rôle d'entraîneur (deck, mercato, fusions, placement, ajustements), avec les mêmes règles que le joueur, sans tricher. La difficulté vient du niveau des cartes et de la qualité des choix.
- Le joueur et l'IA prennent leurs décisions par la même interface, pour pouvoir remplacer l'un par l'autre.
- En direct, le serveur reçoit les compositions, simule le match avec une graine et envoie la même séquence aux téléphones.

## Questions ouvertes (ne pas inventer de réponse)

Tranchées le 11/11/2026 (voir le §20 du dossier) : ce que représentent les 10 s ; contre qui on joue ; d'où viennent les joueurs et les copies ; déplacer les rectangles ou non ; plusieurs joueurs au même poste ; rectangle défensif imposé par le poste.

Toujours ouvertes :
- **Équilibrage des fusions** (prochain sujet). Options à présenter : coût ou rareté, limite de fusions, bonus plafonnés ou incompatibles, contreparties, intérêt tactique, limites liées à la catégorie. Avec : postes naturels et style d'un hybride ; « hybride A/B + copie de A » est-il autorisé ?
- **Nombre de groupes de 4.** Si c'est 2 groupes (8 équipes) avec le reste du format inchangé : 15 matchs, chaque équipe en joue 3 à 5. À confirmer.
- Égalités : classement des groupes, matchs nuls en demi-finale et en finale.
- Temps de football simulé par mi-temps, nombre de temps forts montrés, durées exactes de la préparation et de la mi-temps.
- Taille de l'effectif de chaque pays (fréquence des copies, donc des fusions) ; budget, prix et revente au mercato.
- Liste finale des styles et de leurs effets ; paliers.
- Découpage en sous-zones et maximum de joueurs des autres postes.
- Couleurs au-delà de l'Or ; écarts de niveau entre adversaires (appariement ou plafond) ; ressources pour faire évoluer les cartes.
- Moteur technique final ; dimensions du terrain ; coordonnées et tailles des rectangles ; liste finale des postes.
- Comportement exact de chaque poste ; liste des attributs ; liste des consignes tactiques.
- Durée du délai de transition (réglable, à tester).
- Hors-jeu, fautes, touches, corners, coups francs ; nombre de remplaçants ; fatigue.
- Poids chiffré de la qualité, de la tactique et du hasard.
- Règle de nom de l'hybride ; interface et graphismes définitifs ; temps entre deux matchs.
- **Nom définitif du jeu** et **modèle économique**.

## Points de vigilance (analyse Claude, non validés)

1. ~~10 s de jeu par mi-temps, c'est très peu.~~ Réglé : montage accéléré à vitesse variable. Reste à régler le temps simulé et les vitesses.
2. **Matchs courts = beaucoup de hasard.** Le temps de football simulé par mi-temps est le curseur : plus il y a d'actions simulées, plus la meilleure équipe est avantagée. À mesurer dès les premiers tests d'équilibrage.
3. **Interface de préparation et de mi-temps.** Le temps est allongé, mais il faut toujours des gestes simples (glisser pour fusionner ou placer). Tester l'interface tôt.
4. ~~La boucle d'un tournoi n'est pas décrite.~~ Réglé : deck de nationalités et mercato à la Merge Tactics. Reste le **nom** : « Foot Merge Tactic » est trop proche de « Merge Tactics » (Supercell). À changer avant toute publication.
5. ~~La profondeur tactique dépend d'une règle floue.~~ Réglé : sous-zones dans des rectangles fixes et plusieurs joueurs par poste.
6. **Fusion « meilleure valeur de chaque statistique »** entre postes opposés (gardien + attaquant, par exemple) : quels postes naturels pour l'hybride, sachant qu'un joueur en a au plus 2 ? Risque de joueurs bons partout.
7. **Hors-jeu et coups de pied arrêtés.** Avec le montage, ils peuvent être simulés puis passés à l'écran, mais il faut décider de leurs règles. Le dossier demande d'éviter les attaquants toujours hors-jeu, donc le hors-jeu semble prévu : à confirmer.
8. **Progression et équité.** Avec des niveaux de cartes comme dans Clash Royale, affronter des cartes plus hautes est frustrant, surtout en direct. Prévoir un appariement selon le niveau ou un plafond en tournoi.

## Notes techniques (propositions)

- Simulation en pas de temps fixe, avec son propre générateur aléatoire à graine (`RandomNumberGenerator`), **sans** le moteur physique de Godot, qui n'est pas déterministe. Code de simulation en classes simples (pas des nœuds de scène) pour pouvoir tourner sans affichage.
- Coordonnées des rectangles **normalisées** (0 à 1 sur la longueur et la largeur, dans le sens de l'attaque) dans un fichier de données (JSON ou ressource `.tres`). L'équipe adverse utilise la symétrie. Changer la taille du terrain ne change pas les zones. Les sous-zones se déduisent du découpage (colonnes × lignes) de chaque rectangle.
- Un match ne dépend que des deux équipes (joueurs, placements, consignes) et de la graine : utile pour les tests, et plus tard pour que le serveur simule les matchs en direct.
- Tests : Godot en mode `--headless` avec un cadre de tests (GUT ou GdUnit4). Vérifier dès la première session que Godot peut être installé dans l'environnement de Claude. Sinon, faire tourner les tests et l'export dans GitHub Actions, comme le dépôt le fait déjà pour jetelavaisdit.
- Validation visuelle sur téléphone : export web de Godot publié sur GitHub Pages (l'export sans threads de Godot 4.3 et suivants ne demande pas d'en-têtes serveur spéciaux). Donner le lien au concepteur à chaque étape.

## Façon de travailler sur ce projet

Règles du dossier (§16), condensées :
1. Étapes courtes et validables. Jamais le jeu complet d'un coup.
2. Commencer par le terrain, les postes, les rectangles et les sous-zones.
3. Ne jamais remplacer les rectangles fixes par un placement entièrement libre.
4. Respecter les deux organisations, les chevauchements, le délai de transition, les postes naturels, et n'imposer aucune formation rigide.
5. Séparer simulation, IA, données et rendu.
6. Des tests à chaque étape. Tests rejouables : mêmes équipes, placements, consignes et graine.
7. Rapports lisibles, choix techniques expliqués. Pas de refonte massive sans justification.
8. Aucune fonctionnalité non demandée, même si elle semble intéressante.
9. Signaler les décisions de conception manquantes au lieu de les inventer.
10. Garder un historique des changements et des résultats de tests (`journal.md` dans ce dossier).
11. Après chaque étape : une version exécutable et les instructions pour la lancer.
12. Rectangles, sous-zones, postes, attributs et paramètres modifiables sans réécrire le moteur.
13. **Ne jamais déclarer le moteur « bon » parce que les tests passent ou que les statistiques semblent équilibrées.** Il faut regarder des matchs générés et faire valider le concepteur.

## Feuille de route

1. **Terrain et placement** : rectangles offensifs et défensifs, sous-zones, plusieurs joueurs par poste, chevauchements, 22 marqueurs. Pas encore de ballon.
2. **Déplacements et transitions** : pas de téléportation, distances entre coéquipiers, évitement des collisions, transition progressive.
3. **Ballon et actions** : passes courtes et longues, contrôle, interception, duel, tir, gardien, changement de possession.
4. **Intelligence collective** : appels, démarquages, soutien, couverture, pressing, contre-pressing, largeur, profondeur, replacement, occupation de la surface.
5. **Attributs et équilibrage** : un attribut ou un petit groupe à la fois, avec effet expliqué et tests comparatifs. Puis les bonus de styles et de nationalité.
6. **Match complet** : montage accéléré à vitesse variable des temps forts, préparation et mi-temps.
7. **Présentation mobile et boucle de jeu** (cartes, deck, mercato, fusions, entraîneur IA, tournoi, progression, animations, sons) : seulement quand le moteur convainc. Le direct entre humains vient ensuite.

Laboratoire de tests, construit en même temps que le moteur :
- Tests techniques : limites du terrain, pas de téléportation, état du ballon valide, possessions, passes et tirs résolus, fin de match, durée, déclenchement des transitions.
- Tests tactiques : équipes de même qualité avec des organisations différentes (bloc haut contre bloc bas, resserré contre large, axe contre ailes, 3 DC contre 2 DC, etc.).
- Tests d'équilibrage : beaucoup de matchs, avec résultats, buts, tirs, tirs cadrés, occasions, passes, pertes de balle, interceptions, récupérations, possession, temps par tiers, temps de transition, efficacité du pressing, actions incohérentes.
- Aucun objectif de pourcentage de victoire avant les premiers résultats. Les plages cibles sont définies ensuite et validées par le concepteur.

## Première mission (à lancer sur demande du concepteur)

Prototype Godot 4, en 2D vue du dessus : un terrain et deux équipes de 11
marqueurs. Chaque joueur a un poste. Chaque poste a un rectangle offensif et
un rectangle défensif fixes, visibles et modifiables dans les données. Chaque
rectangle est découpé en sous-zones (6 pour DC, 3 pour AG et AD, les autres
postes à définir dans les données). Chaque joueur est placé dans une
sous-zone ; plusieurs joueurs peuvent occuper le même poste, dans la limite
d'un maximum par poste. Chevauchements et zones partagées possibles. Bascule
entre les deux organisations avec un léger délai et un déplacement
progressif, sans téléportation. Pas encore de passes ni de tirs.

Critères de réussite : terrain lisible ; 22 joueurs affichés ; chaque joueur
associé à un poste et à une sous-zone ; rectangles offensifs et défensifs et
leurs sous-zones visibles ; plusieurs placements testables (par exemple
3 DC) ; chevauchements qui fonctionnent ; transition progressive ; aucune
téléportation ; rectangles, sous-zones et maximums configurables ; prototype
facile à lancer ; explication de l'architecture et instructions de relance
fournies.

**Ne pas passer à la mission 2 sans validation visuelle et technique du concepteur.**

## État

- 11/11/2026 : dossier de conception importé et fichier de contexte créé. Aucun code.
- 11/11/2026 (séance de questions-réponses) : affichage du match, durée des phases, deck de nationalités, mercato inspiré de Merge Tactics, traits, niveaux de cartes, sous-zones, adversaires et groupes de 4 tranchés (détails au §20 du dossier). Aucun code. Prochaines étapes : équilibrage des fusions et nombre de groupes, puis la première mission sur demande du concepteur.
