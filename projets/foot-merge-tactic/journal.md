# Journal du projet — Foot Merge Tactic

Historique des étapes, des choix techniques et des résultats de tests.

## 11/11/2026 — Prototype 1 : placement sur le demi-terrain et mouvement des blocs

**Ce qui a été fait**
- Prototype web (TypeScript, page autonome) dans `prototype/`. Choix validé par le concepteur : pas de Godot pour l'instant (pas installable dans l'environnement de Claude, ni sur le PC de travail du concepteur).
- Données dans `prototype/src/data/` : postes, rectangles et cases (`postes.json`), réglages de projection et de mouvement (`reglages.json`), effectif et adversaire fictifs (`equipes.json`).
- Moteur dans `prototype/src/sim/` (aucune dépendance à l'affichage) :
  - `donnees.ts` : calcule les cases de chaque rectangle ;
  - `placement.ts` : règles (11 joueurs, une case par joueur, maximum par poste, hors poste) ;
  - `projection.ts` : position du demi-terrain → position de match en attaque ou en défense ;
  - `simulation.ts` : 22 joueurs, possession simulée, délai de transition, déplacements progressifs et séparation, graine aléatoire.
- Affichage dans `prototype/src/ui/` : écran de placement (demi-terrain étiré pour des cases plus grandes) et écran de match (terrain vertical).

**Tests** (`bun test`, 20 tests, tous verts)
- Nombre de cases par poste conforme aux décisions (G 2, DC 6, DG 3, DD 3, milieu 6, AG 3, AD 3, attaquant 5).
- Toutes les cases dans son propre camp au coup d'envoi.
- Placement : 3 DC acceptés, 4e refusé ; case déjà prise refusée ; pas de 12e joueur ; hors poste détecté.
- Projection : chaque case plus haute en attaque qu'en défense ; un DC placé haut reste plus haut qu'un DC placé bas ; l'attaquant « devant le but » arrive vers la surface adverse ; le bloc glisse du côté du ballon.
- Simulation (90 s) : aucun joueur ne sort du terrain, déplacement maximal par pas ≤ vitesse maximale × pas de temps (pas de téléportation) ; même graine = même match ; bascule attaque / défense seulement après le délai ; le bloc monte de plus de 15 m en moyenne avec le ballon ; distance minimale entre joueurs > 1 m.

**Vérification visuelle** : page ouverte dans un navigateur au format téléphone (390 × 844), thèmes clair et sombre, parcours complet (passer à 3 DC, 4e DC refusé, match, possession forcée, zones affichées). Aucune erreur dans la console.

**Ce que les tests ne disent pas** : si le mouvement ressemble à du football et si le placement est agréable au doigt. À juger par le concepteur sur son téléphone.

**Réglages provisoires** (non validés, dans les données) : maximums par poste autres que 3 DC et 1 AG ; montées en attaque (G 5 m, DC 20 m, latéraux et milieux 30 m, côtés 35 m, attaquant 40 m) ; écartement 20 % ; délai de transition 0,5 s ; vitesse maximale 7 m/s.

## 11/11/2026 — Prototype 1 : glisser-déposer sur le demi-terrain

**Demande du concepteur** : déplacer un joueur en gardant le doigt appuyé sur son rond ; s'il est lâché sur un autre joueur, les deux échangent leurs places.

**Ce qui a été fait**
- Le glissement démarre après 0,25 s d'appui ou dès que le doigt bouge de plus de 8 pixels. Un simple toucher choisit toujours le joueur.
- Pendant le glissement : une copie du rond suit le doigt (dessinée un peu au-dessus pour rester visible), la case visée est entourée et le message annonce ce qui va se passer (« Belcourt → Milieu défensif » ou « Pellerin ⇄ Delisle »).
- Lâché sur une case libre : le joueur y va, si le maximum du poste le permet (sinon un message l'explique). Lâché sur un autre joueur ou sur sa case : échange des places. Lâché hors des rectangles : rien ne change.
- Tous les joueurs du terrain peuvent être déplacés, quel que soit le poste affiché.
- Règles ajoutées au moteur : `echanger()` et `caseAuPoint()` (dans un chevauchement, la case dont le centre est le plus proche).

**Tests** : 23 tests verts (3 nouveaux : échange, échange refusé avec un remplaçant, case visée). Vérification dans un navigateur au format téléphone, à la souris et avec de vrais événements tactiles : échange, déplacement vers une case libre, refus quand le poste est plein, simple toucher, lâcher hors zone, et pas de défilement de la page pendant le glissement.

**Point technique** : les navigateurs ignorent `touch-action` sur les éléments SVG ; il faut annuler `touchstart` sur les ronds, sinon le doigt fait défiler la page.

## 11/11/2026 — Référence football et défense par lignes

**Retours du concepteur sur le prototype 1** : interface trop longue (2 à 3 écrans) ; zones trop chevauchantes à l'écran ; découpage à revoir (DC 6 sur 2 lignes, milieu 9 sur 3 lignes, attaquant 6 sur 2 lignes, cases du milieu qui se chevauchent) ; jeu trop figé ; **un latéral placé haut ne revient pas défendre**.

**Référence football** (`docs/reference-football.md`), à la demande du concepteur : quatre moments du jeu, couloirs et tiers, lignes, blocs et compacité, coulissement, pressing et défense de couverture, rôles par poste et par moment, chiffres (distances entre lignes, espacements, vitesses, temps de jeu, buts, tirs, passes), dictionnaire, traduction en règles du moteur et tests de réalisme. Sources citées.

**Moteur — règles de projection, version 2**
- Sans le ballon : défense par lignes (gardien, défense, milieu, attaque). Ligne défensive 22 m derrière le ballon, entre 12 et 38 m de son but ; milieu 11 m devant, attaque 23 m devant ; placement réduit à 20 % en profondeur ; lignes de 40 m de large (attaque 28 m), 6 m au moins entre voisins, coulissement vers le ballon.
- Avec le ballon : montées par case (milieu défensif 20 m, milieu 30 m, milieu offensif 35 m, gardien 10 m) ; le bloc avance ou recule avec le ballon (15 m au plus) ; les attaquants restent au niveau de la ligne du hors-jeu adverse.
- Évitement anticipé : chaque joueur prévoit où il passera le plus près des autres dans la seconde qui vient et s'écarte tout de suite.
- Faux ballon : il circule entre les joueurs proches (passes courtes) au lieu de sauter d'un bout à l'autre du terrain.

**Problèmes trouvés en regardant les matchs (et pas par les tests)**
1. L'équipe qui attend le ballon dans son camp avait ses attaquants derrière la défense adverse (19 m du but, défense à 37 m). Corrigé par le bloc qui suit le ballon et la ligne du hors-jeu.
2. Deux milieux du même couloir se superposaient en revenant dans la même ligne. Corrigé par l'espacement minimal dans les lignes.
3. Des joueurs se traversaient en se croisant (jusqu'à quelques centimètres). Corrigé par l'évitement anticipé : distance minimale mesurée sur 8 matchs de 90 s, entre 2,5 et 2,9 m.

**Tests** : 30 tests verts, dont 7 de réalisme (distance défense-milieu 8 à 15 m, largeur de la ligne de défense ≤ 45 m, longueur de l'équipe en défense ≤ 40 m, latéral placé haut revenu dans la ligne des DC, latéral placé haut nettement plus haut en attaque, coulissement, hauteur de la ligne défensive). Vérification visuelle au format téléphone : attaque, transition (retour en retard des joueurs placés haut), défense organisée.

**Limites connues** : l'attaquant adverse se tient sur notre ligne et pousse parfois un défenseur vers l'avant au lieu que le défenseur reste entre lui et le but ; le marquage viendra avec le vrai ballon (mission 2). Le coulissement est peut-être un peu fort (60 %) : à juger à l'œil.
