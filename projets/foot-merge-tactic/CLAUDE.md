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
- **Référence football** : `docs/reference-football.md` (dépôt) et `reference-football.md` (projet claude.ai). Vocabulaire, principes tactiques, rôles par poste et par moment, chiffres, règles du moteur qui en découlent et tests de réalisme. **À relire avant de modifier un comportement du moteur.** Demandée par le concepteur pour que le moteur ne s'éloigne pas du vrai football.

## Règle d'or : trois statuts à ne jamais mélanger

- **[VALIDÉ]** : décidé par le concepteur. À respecter.
- **[PROPOSITION]** : piste technique ou de design. À tester, jamais à coder comme une vérité.
- **[OUVERT]** : pas encore décidé. Signaler le point et proposer des options argumentées, sans rien inventer.

Une proposition ne devient une règle qu'après validation explicite du concepteur.

## Le jeu en bref

Jeu de football mobile. Le joueur est **entraîneur** : il ne contrôle pas les
footballeurs. Avant un tournoi, il compose un deck de 4 ou 5 nationalités.
Pendant le tournoi, il recrute des joueurs fictifs (cartes) au mercato, les
fusionne, les place sur un demi-terrain (positions de coup d'envoi), puis
regarde un moteur simuler le match en vue du dessus, comme le
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
- **Pour l'instant, une seule organisation** : chaque poste a **un seul rectangle de référence fixe** (position, largeur, profondeur). Les deux organisations offensive et défensive (§6 du dossier) sont en pause : trop compliquées et trop longues à régler.
- Le rectangle n'est ni une case exclusive ni une barrière physique. Les rectangles ne bougent pas. Ils doivent être **plus grands et plus chevauchants** que dans la maquette du 11/11.
- **Chaque rectangle est découpé en sous-zones** (positions possibles) : G 2 (normal ou un peu avancé) ; DC 6 sur 2 lignes ; DD et DG 2 ou 3 (le concepteur hésite) ; **milieu central 9 sur 3 lignes** (MDC, MC, MOC) ; AD et AG 3 ; **attaquant 6 sur 2 lignes** (décision du 11/11 ; remplace « milieu 6 » et « attaquant 5 dont 1 devant le but » ; pas encore appliquée dans le prototype).
- **Les cases du milieu se chevauchent** : ce ne sont pas des carrés séparés ; sur trois cases, celle du milieu est à cheval sur les deux autres. À préciser : lignes (MDC / MC / MOC) ou colonnes (gauche / axe / droite) ?
- Les 3 cases de AG et AD sont trois postes, du plus bas au plus haut : milieu de côté (MG / MD), milieu avancé, attaquant de côté. Il n'y a donc pas de poste MD / MG à part.
- **Placement sur un demi-terrain** (idée du concepteur) : l'entraîneur place ses joueurs comme avant le coup d'envoi, dans son propre camp. Les **règles de projection** du moteur transforment ensuite chaque position en position de match, en attaque et en défense. La correspondance exacte (une petite table de règles) se règle ensemble en regardant le prototype.
- L'entraîneur place chaque joueur dans une sous-zone ; le rectangle reste la zone de liberté dans laquelle le moteur fait bouger le joueur.
- **Plusieurs joueurs peuvent occuper le même poste**, dans la limite d'un maximum par poste (exemple donné : 3 DC, 1 AG).
- Les rectangles peuvent **se chevaucher** et plusieurs joueurs peuvent occuper une zone commune. Le moteur doit quand même empêcher les joueurs de s'empiler.
- Aucune formation classique rigide imposée.
- Pas de téléportation : les joueurs se déplacent progressivement.
- Le rectangle est une zone de référence, pas une destination : le joueur bouge selon le ballon, ses coéquipiers, les adversaires, les espaces, ses consignes et ses qualités.
- Plus tard, des **consignes d'équipe** (« volontés ») : plus défensive, plus offensive, jeu en contre, etc. Pas maintenant.

### Priorités immédiates (concepteur, 11/11)
- Un moteur jouable ; pouvoir choisir les joueurs qui jouent et les placer ; un jeu équilibré ; un rendu intéressant.
- Les fusions viennent après le moteur.

### Technique
- **Prototype en version web** (TypeScript, page autonome ouverte d'un lien sur le téléphone). Godot n'est installable ni dans l'environnement de Claude ni sur le PC de travail du concepteur. Le choix de l'outil final (rester en web et en faire une application, ou passer à Godot) se fera quand le moteur convaincra.

### Tournoi et adversaires
- **2 groupes de 4** (8 équipes), complétés par des équipes IA si besoin, puis demi-finales (1A contre 2B, 1B contre 2A) et finale. Pas d'aller-retour. 15 matchs ; chaque équipe en joue 3 à 5. À revoir plus tard si c'est trop long.
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
- Modules séparés (dossier `prototype/src/sim/` : données, placement, projection, simulation ; plus tard ballon, actions, statistiques). Jamais un seul gros fichier.
- Simulation séparée du rendu et des animations. Simulation possible sans affichage (des milliers de matchs). Graine aléatoire contrôlable.
- Terrain, rectangles, sous-zones, attributs et paramètres dans des fichiers de données, pas codés en dur.
- Répartition 40 % qualité / 40 % tactique / 20 % hasard : **ancienne piste, pas une règle**. Ne pas la coder.
- Contreparties tactiques à vérifier : pressing haut et espaces dans le dos ; bloc bas et moins de présence offensive ; jeu sur les ailes et dépendance aux excentrés ; axe dense et côtés libres ; joueurs très hauts et transition défensive risquée. Aucune tactique ne doit dominer.
- Attributs indicatifs : vitesse, accélération, endurance, contrôle, passe courte, passe longue, vision, dribble, tir, finition, puissance, duel physique, tacle, interception, placement défensif, jeu aérien, réflexes et arrêts (gardien). En ajouter peu à la fois, chacun avec un effet identifiable dans le moteur.

Affichage du match :
- Préparation et mi-temps de 20 à 30 s pour commencer, soit un match d'environ 1 min à 1 min 20.
- Facteurs de vitesse réglables dans les données et ajustés sur téléphone. Au-delà de 3 à 4 fois la vitesse réelle, le ballon risque de devenir difficile à suivre.
- Choisir des temps forts qui montrent la conséquence des choix tactiques (but encaissé en transition après un bloc trop haut, par exemple).

Placement :
- DC : 3 colonnes sur 2 lignes (gauche, axe, droite ; haut, bas). AG / AD : 3 sous-zones en profondeur (bas, milieu, haut). G : 2 en profondeur.
- Milieu central : 3 lignes (MDC en bas, MC au milieu, MOC en haut) sur 2 colonnes (gauche, droite). La ligne choisie correspond au poste, ce qui garde le sens des postes naturels (un MDC sur la ligne MOC joue hors poste).
- Attaquant : 2 colonnes sur 2 lignes, plus une case centrale devant le but.
- Latéraux (DD, DG) : 3 cases en profondeur en attendant la décision (2 ou 3).
- Un seul joueur par sous-zone.
- Pour chaque poste, les données décrivent : rectangle, découpage (colonnes et lignes, ou liste de cases), maximum de joueurs.
- **Règles de projection, version 2** (11/11, d'après `docs/reference-football.md` §9 ; chiffres dans `reglages.json` et `postes.json`) :
  - **sans le ballon, défense par lignes** : chaque poste rejoint sa ligne (gardien ; défense : DC, DG, DD ; milieu : milieu central et côtés ; attaque : attaquant). La ligne défensive se tient 22 m derrière le ballon, entre 12 et 38 m de son but (bloc médian) ; milieu 11 m devant, attaque 23 m devant. Le placement ne joue plus qu'à 20 % en profondeur : **un latéral placé haut revient dans la ligne de défense**. Largeur des lignes 40 m (attaque 28 m), ordre gauche-droite gardé, 6 m au moins entre voisins, coulissement vers le ballon (60 %) ;
  - **avec le ballon** : chaque case monte de sa distance (G 10 m, DC 20 m, latéraux 30 m, milieu défensif 20 m, milieu 30 m, milieu offensif 35 m, côtés 35 m, attaquant 40 m) ; l'équipe s'écarte de 20 % ; **tout le bloc avance ou recule avec le ballon** (15 m au plus) ; **les attaquants restent au niveau de la ligne du hors-jeu** adverse ;
  - bascule après 0,5 s, puis course à 7 m/s au plus ; un joueur placé haut revient donc en retard (contrepartie naturelle) ;
  - **évitement anticipé** : les joueurs s'écartent avant de se croiser, environ 3 m au minimum entre deux joueurs.
- Maximums provisoires (non validés) : DG 1, DD 1, milieu 4, AD 1, attaquant 3 (validés en exemple : 3 DC, 1 AG ; le gardien : 1).
- Sur téléphone (maquette du 11/11) : terrain vertical, téléphone tenu droit ; on choisit un joueur puis on touche une case (une case de DC fait environ 65 × 45 pixels, un joueur environ 12 pixels) ; n'afficher que les cases du joueur choisi.

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

Tranchées le 11/11/2026 (voir le §20 du dossier) : ce que représentent les 10 s ; contre qui on joue ; d'où viennent les joueurs et les copies ; déplacer les rectangles ou non ; plusieurs joueurs au même poste ; nombre de groupes (2 groupes de 4) ; une seule organisation pour l'instant ; MD / MG (ce sont les cases basses des côtés) ; placement sur un demi-terrain ; outil du prototype (web).

Toujours ouvertes :
- **Équilibrage des fusions : reporté après le moteur.** Pistes déjà présentées, non validées : coût naturel (deux joueurs pour un) ; un poste naturel de chaque joueur d'origine ; niveau de la plus faible des deux cartes ; hybride qui ne progresse qu'avec un second hybride identique ; un seul style choisi à la fusion. Restent : postes naturels et style d'un hybride ; « hybride A/B + copie de A » est-il autorisé ?
- **Placement** : DD et DG à 2 ou 3 cases (3 dans le prototype) ; maximum de joueurs par poste ; positions et tailles exactes des rectangles ; chiffres des règles de projection (à régler ensemble sur le prototype).
- Consignes d'équipe (plus défensive, plus offensive, en contre…) : plus tard.
- Égalités : classement des groupes, matchs nuls en demi-finale et en finale.
- Temps de football simulé par mi-temps, nombre de temps forts montrés, durées exactes de la préparation et de la mi-temps.
- Taille de l'effectif de chaque pays (fréquence des copies, donc des fusions) ; budget, prix et revente au mercato.
- Liste finale des styles et de leurs effets ; paliers.
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

- Prototype dans `prototype/` : TypeScript, sans dépendance. `bun test` lance les tests, `bun run construire` fabrique `dist/index.html` (page autonome, code et données inclus). Voir le `README.md` du projet.
- Simulation en pas de temps fixe (1/30 s), avec son propre générateur aléatoire à graine (`src/sim/rng.ts`). Le code de `src/sim/` ne dépend pas de l'affichage : il tourne dans les tests sans navigateur.
- Coordonnées **normalisées** dans le repère de chaque équipe (x de 0 à 1 sur la largeur, y de 0, sa ligne de but, à 1, la ligne adverse). L'équipe adverse utilise la symétrie. Les cases se déduisent d'une grille (colonnes × lignes) ou d'une liste de cases (attaquant).
- Un match ne dépend que des deux équipes (joueurs, placements) et de la graine : utile pour les tests, et plus tard pour que le serveur simule les matchs en direct.
- Validation visuelle : Claude vérifie la page dans un navigateur au format téléphone (captures, thèmes clair et sombre), puis la publie comme page claude.ai. Lien du prototype 1 : https://claude.ai/artifact/B86yGS9jR47LwubdEiL5EN (privé au concepteur jusqu'à ce qu'il le partage). Republier la même page à chaque version.
- GitHub Pages sert l'app jetelavaisdit : ne pas y publier le prototype sans regrouper les deux sites.

## Façon de travailler sur ce projet

Règles du dossier (§16), condensées :
1. Étapes courtes et validables. Jamais le jeu complet d'un coup.
2. Commencer par le terrain, les postes, les rectangles et les sous-zones.
3. Ne jamais remplacer les rectangles fixes par un placement entièrement libre.
4. Respecter les chevauchements, le délai de transition (dans le mouvement automatique du bloc), les postes naturels, et n'imposer aucune formation rigide. Une seule organisation pour l'instant : ne pas réintroduire les deux organisations sans décision du concepteur.
5. Séparer simulation, IA, données et rendu.
6. Des tests à chaque étape. Tests rejouables : mêmes équipes, placements, consignes et graine.
7. Rapports lisibles, choix techniques expliqués. Pas de refonte massive sans justification.
8. Aucune fonctionnalité non demandée, même si elle semble intéressante.
9. Signaler les décisions de conception manquantes au lieu de les inventer.
10. Garder un historique des changements et des résultats de tests (`journal.md` dans ce dossier).
11. Après chaque étape : une version exécutable et les instructions pour la lancer.
12. Rectangles, sous-zones, postes, attributs et paramètres modifiables sans réécrire le moteur.
13. **Ne jamais déclarer le moteur « bon » parce que les tests passent ou que les statistiques semblent équilibrées.** Il faut regarder des matchs générés et faire valider le concepteur.
14. **Avant de toucher un comportement du moteur, relire `docs/reference-football.md`**, et traduire chaque principe utilisé en test de réalisme (§9.4).

## Feuille de route

1. **Terrain et placement** : un rectangle par poste, sous-zones, plusieurs joueurs par poste, chevauchements, choix des joueurs qui jouent, 22 marqueurs. Pas encore de ballon.
2. **Déplacements et transitions** : pas de téléportation, distances entre coéquipiers, évitement des collisions, mouvement progressif du bloc selon la possession.
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

## Première mission — réalisée le 11/11/2026, en attente de validation

Réalisée en version web (et non en Godot), avec le placement sur le
demi-terrain. Détails et résultats des tests dans `journal.md`. Lien :
https://claude.ai/artifact/B86yGS9jR47LwubdEiL5EN

Énoncé d'origine (l'outil a changé, le reste tient) : prototype en 2D vue
du dessus, terrain vertical pour un téléphone
tenu droit : un terrain et deux équipes de 11 marqueurs. Chaque joueur a un
poste. Chaque poste a un seul rectangle fixe, grand et chevauchant, visible
et modifiable dans les données. Chaque rectangle est découpé en sous-zones
(G 2, DC 6, DD et DG 2 ou 3, milieu central 6, AD et AG 3, attaquant 5 dont
1 devant le but). On choisit les joueurs qui jouent et on place chacun dans
une sous-zone ; plusieurs joueurs peuvent occuper le même poste, dans la
limite d'un maximum par poste. Chevauchements et zones partagées possibles.
Une bascule de possession simulée fait monter ou descendre le bloc
progressivement, avec un léger délai, sans téléportation. Pas encore de
passes ni de tirs.

Critères de réussite : terrain lisible sur téléphone ; 22 joueurs affichés ;
chaque joueur associé à un poste et à une sous-zone ; rectangles et
sous-zones visibles ; plusieurs placements testables (par exemple 3 DC) ;
chevauchements qui fonctionnent ; mouvement du bloc progressif ; aucune
téléportation ; rectangles, sous-zones et maximums configurables ; prototype
facile à lancer et à ouvrir sur téléphone ; explication de l'architecture et
instructions de relance fournies.

**Ne pas passer à la mission 2 sans validation visuelle et technique du concepteur.**
Mission 2 envisagée (feuille de route, phase 3) : le ballon et les actions de
base (passes, contrôle, interception, duel, tir, gardien, changement de
possession), à la place du ballon simulé.

## État

- 11/11/2026 : dossier de conception importé et fichier de contexte créé. Aucun code.
- 11/11/2026 (séance de questions-réponses) : affichage du match, durée des phases, deck de nationalités, mercato inspiré de Merge Tactics, traits, niveaux de cartes, sous-zones, adversaires et groupes de 4 tranchés (détails au §20 du dossier). Aucun code.
- 11/11/2026 (suite) : 2 groupes de 4 ; une seule organisation pour l'instant ; nombre de sous-zones par poste ; fusions reportées après le moteur (§20.8). Maquette HTML montrée dans la discussion (terrain vertical, placement par cases), non conservée.
- 11/11/2026 (suite) : placement sur un demi-terrain et règles de projection ; côtés à 3 postes (milieu, milieu avancé, attaquant) ; prototype en version web. **Prototype 1 réalisé** (`prototype/`, 20 tests verts, vérifié au format téléphone) et publié. Prochaine étape : retours du concepteur sur le prototype 1 (lisibilité, placement au doigt, chiffres de projection), puis mission 2.
- 11/11/2026 (suite) : glisser-déposer des joueurs sur le demi-terrain, avec échange quand on lâche un joueur sur un autre (demande du concepteur). 23 tests verts. Page republiée.
- 11/11/2026 (suite) : retours du concepteur sur le prototype 1 : interface trop longue (2 à 3 écrans), zones trop chevauchantes à l'écran, jeu trop figé, latéral placé haut qui ne revient pas défendre. Référence football écrite (`docs/reference-football.md`). Règles de projection refaites (défense par lignes, bloc qui suit le ballon, ligne du hors-jeu, évitement anticipé) avec 7 tests de réalisme ; 30 tests verts. Nouveau découpage décidé (DC 6, milieu 9, attaque 6), pas encore appliqué. Prochaine étape : interface sur un seul écran et nouveau découpage des cases.
