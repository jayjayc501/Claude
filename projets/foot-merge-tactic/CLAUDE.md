# Contexte du projet — Foot Merge Tactic (titre de travail)

Ce fichier est le contexte de travail de Claude pour ce projet. Il résume le
dossier de conception et fixe la façon de travailler.

Document de référence complet : `projets/foot-merge-tactic/docs/dossier-conception.md`
du dépôt jayjayc501/Claude (version du 11 novembre 2026). En cas de doute ou de
contradiction, le dossier fait foi, puis le concepteur.

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
footballeurs. Il compose son équipe de joueurs fictifs (cartes), les fusionne,
choisit leur organisation offensive et défensive, puis regarde un moteur
simuler le match en vue du dessus.

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
- Vue du dessus, terrain entier visible, 22 joueurs, ballon visible. Marqueurs simples au début, pas de 3D.
- Durée totale : **40 s** = 10 s de préparation (fusion / préparation) + 10 s de 1re mi-temps + 10 s de mi-temps (fusions, changements tactiques) + 10 s de 2e mi-temps.
- Le moteur gère les déplacements, passes, appels, duels, interceptions, tirs et transitions.

### Postes et rectangles de placement
- Postes classiques : G, DC, DD, DG, MDC, MC, MOC, MD, MG, AD, AG, AC (liste à finaliser).
- Un joueur a 1 ou 2 postes naturels. Placé hors de son poste, il est moins efficace mais reste utilisable.
- Chaque poste a un **rectangle de référence fixe** (position, largeur, profondeur). Ce n'est ni une case exclusive ni une barrière physique.
- Les rectangles peuvent **se chevaucher** et plusieurs joueurs peuvent occuper une zone commune. Le moteur doit quand même empêcher les joueurs de s'empiler.
- Aucune formation classique rigide imposée.
- **Deux organisations** : chaque poste a un rectangle offensif et un rectangle défensif, qui peuvent être à des endroits différents. Les chevauchements sont possibles dans les deux.
- **Transition progressive** entre les deux, avec un léger délai : pas de téléportation, replacement ou projection progressifs, pressing et contre-pressing possibles.
- Le rectangle est une zone de référence, pas une destination : le joueur bouge selon le ballon, ses coéquipiers, les adversaires, les espaces, ses consignes et ses qualités.

### Tournoi
- 6 équipes, 2 groupes de 3. Chaque équipe rencontre une fois les 2 autres de son groupe.
- Les 2 premiers de chaque groupe vont en demi-finales (1A contre 2B, 1B contre 2A), puis finale.
- 9 matchs au total, pas d'aller-retour. Chaque équipe joue 2 à 4 matchs.

### Cartes, progression, fusions
- Niveau de base permanent Bronze / Argent / Or. Ce sont des niveaux de départ différents, et les récompenses de tournoi peuvent les augmenter durablement.
- Fusions et évolutions **temporaires** : remises à zéro à chaque tournoi.
- Fusion de 2 copies du même joueur : joueur amélioré, même identité. Un joueur déjà fusionné peut l'être à nouveau avec sa copie.
- Fusion de 2 joueurs différents **de même nationalité** : joueur hybride, qui garde la nationalité commune.
- Un hybride n'a **jamais plus de 2 identités d'origine** (A/B oui, A/B/C jamais).
- Pistes appréciées (intentions, pas encore des règles chiffrées) : noms combinés, visage partagé en deux, transformation visuelle de plus en plus spectaculaire (style original, rien de copié), meilleure valeur de chaque statistique, cumul des bonus.

## Propositions à tester (non validées)

- Technologie : **Godot 4 en 2D**, vue du dessus. À confirmer avant tout développement important.
- Modules séparés : MatchSimulation, Pitch, Player, PositionZone, TeamTactics, TransitionManager, PlayerAI, BallController, ActionResolver, MatchEvents, MatchStats, TestHarness. Jamais un seul gros fichier.
- Simulation séparée du rendu et des animations. Simulation possible sans affichage (des milliers de matchs). Graine aléatoire contrôlable.
- Terrain, rectangles, attributs et paramètres dans des fichiers de données, pas codés en dur.
- Répartition 40 % qualité / 40 % tactique / 20 % hasard : **ancienne piste, pas une règle**. Ne pas la coder.
- Contreparties tactiques à vérifier : pressing haut et espaces dans le dos ; bloc bas et moins de présence offensive ; jeu sur les ailes et dépendance aux excentrés ; axe dense et côtés libres ; joueurs très hauts et transition défensive risquée. Aucune tactique ne doit dominer.
- Attributs indicatifs : vitesse, accélération, endurance, contrôle, passe courte, passe longue, vision, dribble, tir, finition, puissance, duel physique, tacle, interception, placement défensif, jeu aérien, réflexes et arrêts (gardien). En ajouter peu à la fois, chacun avec un effet identifiable dans le moteur.

## Questions ouvertes (ne pas inventer de réponse)

Listées dans le dossier :
- Moteur technique final ; dimensions du terrain ; lignes et colonnes du quadrillage ; coordonnées et tailles des rectangles ; liste finale des postes.
- Le joueur peut-il déplacer les rectangles, ou seulement choisir parmi des zones prédéfinies ?
- Comportement exact de chaque poste ; liste des attributs ; liste des consignes tactiques.
- Durée du délai de transition (réglable, à tester).
- Hors-jeu, fautes, touches, corners, coups francs ; nombre de remplaçants ; fatigue.
- Poids chiffré de la qualité, de la tactique et du hasard.
- Équilibrage des fusions. Options à présenter : coût ou rareté, limite de fusions, bonus plafonnés ou incompatibles, contreparties, intérêt tactique, limites liées à la catégorie.
- Ressources et récompenses pour monter les niveaux de base ; règle de nom de l'hybride ; interface et graphismes définitifs ; temps entre deux matchs.

Relevées à l'analyse du 11/11/2026 (à soumettre au concepteur, détails ci-dessous) :
- Que représentent les 10 s d'une mi-temps ?
- Contre qui joue-t-on : IA, équipes d'autres joueurs en différé, ou en direct ?
- Égalités : classement des groupes, et matchs nuls en demi-finale et en finale.
- D'où viennent les joueurs et les copies à fusionner pendant un tournoi ?
- Le rectangle défensif est-il imposé par le poste offensif, ou choisi séparément ?
- Deux joueurs peuvent-ils occuper exactement le même poste (même rectangle) ?
- Postes naturels d'un hybride ; « hybride A/B + copie de A » est-il autorisé ?

## Points de vigilance (analyse Claude, non validés)

1. **10 s de jeu par mi-temps, c'est très peu.** À vitesse lisible, cela laisse quelques actions par mi-temps. En football réel, il y a environ un but toutes les 30 minutes : sans adaptation, la plupart des matchs finiraient 0-0. Options : (a) temps accéléré ; (b) résumé des temps forts : le moteur simule toute la mi-temps en arrière-plan et n'affiche que les séquences clés ; (c) football « arcade » plus riche en occasions ; (d) mi-temps plus longues. À trancher avant la phase 3.
2. **Matchs courts = beaucoup de hasard.** Moins il y a d'actions, plus un seul tir chanceux décide. Cela va contre le principe « une meilleure équipe est avantagée ». À mesurer dès les premiers tests d'équilibrage.
3. **10 s de mi-temps pour fusionner et changer la tactique sur un téléphone**, c'est serré. Prévoir des changements en un ou deux gestes, et tester l'interface tôt.
4. **La boucle d'un tournoi n'est pas décrite.** Préparation courte, fusion de copies et match automatique rappellent les jeux de type auto-battler, mais rien ne dit comment on obtient des joueurs pendant un tournoi (boutique, tirage, effectif fixe ?). Le titre de travail est aussi proche du mode « Merge Tactics » de Supercell : à vérifier avant toute publication.
5. **La profondeur tactique dépend d'une règle floue.** Si le poste fixe à la fois le rectangle offensif et le rectangle défensif, la seule liberté du coach est de choisir 11 postes. Les exemples du dossier (« DC haut », « MC bas », « MC haut ») laissent penser à des variantes de postes, donc à un quadrillage de zones. Le §5.2 dit que le joueur ne déplace pas les rectangles, mais le §17 laisse la question ouverte : à clarifier.
6. **Fusion « meilleure valeur de chaque statistique »** entre postes opposés (gardien + attaquant, par exemple) : quels postes naturels pour l'hybride, sachant qu'un joueur en a au plus 2 ? Risque de joueurs bons partout.
7. **Hors-jeu et coups de pied arrêtés** prennent du temps. Avec 10 s par mi-temps, il faudra sans doute des remises en jeu immédiates ou simplifiées. Le dossier demande d'éviter les attaquants toujours hors-jeu, donc le hors-jeu semble prévu : à confirmer.

## Notes techniques (propositions)

- Simulation en pas de temps fixe, avec son propre générateur aléatoire à graine (`RandomNumberGenerator`), **sans** le moteur physique de Godot, qui n'est pas déterministe. Code de simulation en classes simples (pas des nœuds de scène) pour pouvoir tourner sans affichage.
- Coordonnées des rectangles **normalisées** (0 à 1 sur la longueur et la largeur, dans le sens de l'attaque) dans un fichier de données (JSON ou ressource `.tres`). L'équipe adverse utilise la symétrie. Changer la taille du terrain ne change pas les zones.
- Tests : Godot en mode `--headless` avec un cadre de tests (GUT ou GdUnit4). Vérifier dès la première session que Godot peut être installé dans l'environnement de Claude. Sinon, faire tourner les tests et l'export dans GitHub Actions, comme le dépôt le fait déjà pour jetelavaisdit.
- Validation visuelle sur téléphone : export web de Godot publié sur GitHub Pages (l'export sans threads de Godot 4.3 et suivants ne demande pas d'en-têtes serveur spéciaux). Donner le lien au concepteur à chaque étape.

## Façon de travailler sur ce projet

Règles du dossier (§16), condensées :
1. Étapes courtes et validables. Jamais le jeu complet d'un coup.
2. Commencer par le terrain, les postes et les rectangles.
3. Ne jamais remplacer les rectangles fixes par un placement entièrement libre.
4. Respecter les deux organisations, les chevauchements, le délai de transition, les postes naturels, et n'imposer aucune formation rigide.
5. Séparer simulation, IA, données et rendu.
6. Des tests à chaque étape. Tests rejouables : mêmes équipes, placements, consignes et graine.
7. Rapports lisibles, choix techniques expliqués. Pas de refonte massive sans justification.
8. Aucune fonctionnalité non demandée, même si elle semble intéressante.
9. Signaler les décisions de conception manquantes au lieu de les inventer.
10. Garder un historique des changements et des résultats de tests (`journal.md` dans ce dossier).
11. Après chaque étape : une version exécutable et les instructions pour la lancer.
12. Rectangles, postes, attributs et paramètres modifiables sans réécrire le moteur.
13. **Ne jamais déclarer le moteur « bon » parce que les tests passent ou que les statistiques semblent équilibrées.** Il faut regarder des matchs générés et faire valider le concepteur.

## Feuille de route

1. **Terrain et placement** : rectangles offensifs et défensifs, chevauchements, 22 marqueurs. Pas encore de ballon.
2. **Déplacements et transitions** : pas de téléportation, distances entre coéquipiers, évitement des collisions, transition progressive.
3. **Ballon et actions** : passes courtes et longues, contrôle, interception, duel, tir, gardien, changement de possession.
4. **Intelligence collective** : appels, démarquages, soutien, couverture, pressing, contre-pressing, largeur, profondeur, replacement, occupation de la surface.
5. **Attributs et équilibrage** : un attribut ou un petit groupe à la fois, avec effet expliqué et tests comparatifs.
6. **Match complet de 40 s** avec l'interface de mi-temps.
7. **Présentation mobile** (cartes, animations, sons, tournoi, progression) : seulement quand le moteur convainc.

Laboratoire de tests, construit en même temps que le moteur :
- Tests techniques : limites du terrain, pas de téléportation, état du ballon valide, possessions, passes et tirs résolus, fin de match, durée, déclenchement des transitions.
- Tests tactiques : équipes de même qualité avec des organisations différentes (bloc haut contre bloc bas, resserré contre large, axe contre ailes, etc.).
- Tests d'équilibrage : beaucoup de matchs, avec résultats, buts, tirs, tirs cadrés, occasions, passes, pertes de balle, interceptions, récupérations, possession, temps par tiers, temps de transition, efficacité du pressing, actions incohérentes.
- Aucun objectif de pourcentage de victoire avant les premiers résultats. Les plages cibles sont définies ensuite et validées par le concepteur.

## Première mission (à lancer sur demande du concepteur)

Prototype Godot 4, en 2D vue du dessus : un terrain et deux équipes de 11
marqueurs. Chaque joueur a un poste. Chaque poste a un rectangle offensif et
un rectangle défensif fixes, visibles et modifiables dans les données.
Chevauchements et zones partagées possibles. Bascule entre les deux
organisations avec un léger délai et un déplacement progressif, sans
téléportation. Pas encore de passes ni de tirs.

Critères de réussite : terrain lisible ; 22 joueurs affichés ; chaque joueur
associé à un poste ; rectangles offensifs et défensifs visibles ;
chevauchements qui fonctionnent ; transition progressive ; aucune
téléportation ; rectangles configurables ; prototype facile à lancer ;
explication de l'architecture et instructions de relance fournies.

**Ne pas passer à la mission 2 sans validation visuelle et technique du concepteur.**

## État

- 11/11/2026 : dossier de conception importé et fichier de contexte créé. Aucun code. Prochaine étape : réponses du concepteur aux questions ouvertes prioritaires (au minimum les points 1, 4 et 5 de la section « Points de vigilance »), puis la première mission.
