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

## 11/11/2026 — Largeur en défense

**Retour du concepteur** : en défense, les joueurs se resserrent trop dans l'axe, il n'y a aucune largeur.

**Mesure** (6 matchs, défense organisée) : ligne de défense 30 m, ligne du milieu 28-29 m, équipe 30-32 m de large. C'était contraire à la référence football (environ 40 m, la largeur de la surface). Le test de réalisme ne vérifiait qu'une largeur maximale ; il vérifie maintenant aussi le minimum.

**Correction** : étalement des lignes 55 m (défense), 58 m (milieu), 40 m (attaque), qui donne des lignes d'environ 40 m ; coulissement ramené de 60 % à 45 %. Résultat mesuré : lignes de 40-41 m, équipe de 42 m. 30 tests verts. Capture au format téléphone : ballon sur le côté gauche, bloc décalé à gauche sur 40 m, latéral opposé dans le demi-espace.

## 11/11/2026 — Nouveau découpage et écrans sur une page

**Décisions du concepteur** : DC 6 cases sur 2 lignes, milieu 9 sur 3 lignes, attaque 6 sur 2 lignes ; sur chaque ligne, 3 cases, et la case de l'axe est à cheval sur la gauche et la droite ; les grandes zones (défense, milieu, attaque) ne doivent presque plus se chevaucher. Commits directs autorisés pour le prototype.

**Ce qui a été fait**
- Données : bornes de colonnes qui se recouvrent (`colonnesBornes` : gauche 0-40 %, axe 28-72 %, droite 60-100 % du rectangle) ; rectangles redessinés (défense 7-25 m, milieu 24-42 m, attaque 41-52,5 m ; côtés séparés des zones centrales) ; compositions par défaut mises à jour ; étalement des lignes ajusté (52 et 54 m) pour garder des lignes d'environ 40 m.
- Règle `remplacer()` : un remplaçant prend la case d'un titulaire.
- Écran de placement sur une page : demi-terrain et banc en ronds ; tout au glisser-déposer (case libre, échange, entrée d'un remplaçant, sortie vers le banc) ; cases visibles seulement pendant le glissement.
- Écran de match sur une page : commandes au-dessus du terrain (coup d'envoi, pause, vitesse, zones), possession dessous.
- Faux ballon : passes en retrait possibles (il dérivait vers la ligne de but adverse).

**Tests** : 33 verts (nouveaux : remplacement, cases de l'axe à cheval, grandes zones séparées de 2 m au plus). Seuil du test « le bloc monte puis redescend » ramené à 8 m : perdu haut, le ballon reste loin de notre but et le bloc défend haut, ce qui est correct.

**Vérification au format téléphone** : 390 × 844, la page de placement tient exactement sur l'écran ; 375 × 667, il reste 12 pixels de trop ; sur l'écran de match, les boutons de possession sont visibles sans défiler dans les deux cas. Parcours au glisser-déposer : entrée d'un remplaçant, sortie vers le banc, retour sur une case libre, refus d'un 12e joueur avec un message clair, échange, simple toucher.

## 11/11/2026 — Placement en attaque pendant le match

**Retour du concepteur** (capture à ×4, « À vous ») : placement « n'importe quoi » pendant le match. La défense adverse est dans sa surface alors que le ballon est au milieu de terrain, notre attaquant est collé à ses défenseurs, notre équipe est étirée.

**Mesures** (8 graines × 2 modes, 120 s) : le dernier défenseur adverse finissait jusqu'à 17 m sous la hauteur que lui donne le ballon (17 m de son but, au lieu de 34 m) ; notre équipe s'étirait sur 56 à 64 m (référence : environ 38 m en possession).

**Cause** : une boucle. Nos attaquants se calaient sur la position réelle du dernier défenseur adverse (ligne du hors-jeu) ; en le serrant, l'évitement le faisait reculer ; nos attaquants le suivaient ; et ainsi de suite jusque dans la surface. En plus, les défenseurs centraux ne suivaient presque pas le ballon (montée fixe), d'où l'équipe étirée. Aucun test ne regardait la phase d'attaque sur la durée : les tests de réalisme ne mesuraient que la défense.

**Correction** (`projection.ts`, `simulation.ts`, `reglages.json`)
- Avec le ballon, l'équipe s'étire entre deux lignes : ligne arrière 20 m derrière le ballon (entre 15 et 55 m de son but), ligne avant 1 m en deçà de la ligne que l'adversaire vise d'après le ballon. Longueur de 30 à 50 m. Entre les deux, l'ordre de profondeur du placement est gardé.
- Plus aucune cible ne dépend de la position du moment d'un autre joueur : fin de la boucle.
- Montées par poste et par case supprimées (remplacées par l'ordre de profondeur).
- Écart minimal entre adversaires 2,5 m (3 m entre coéquipiers) : un défenseur serre son attaquant sans le repousser, et les ronds ne se chevauchent pas à l'écran.

**Résultat mesuré** (6 graines, 90 s, « À vous ») : attaquant au-delà du dernier défenseur de plus de 3 m : 0 % du temps ; longueur médiane 37 à 43 m ; défense adverse plus de 5 m sous sa place 3 à 8 % du temps (le temps de remonter quand le ballon repart en arrière, pas de dérive) ; au moins 4 joueurs derrière le ballon dans le camp adverse.

**Tests** : 40 verts. Nouveaux : forme en possession selon le ballon, ordre de profondeur gardé, cases extrêmes cohérentes avec les réglages, et quatre tests de réalisme sur de longues possessions (hors-jeu, défense adverse non repoussée, longueur et largeur, défense de couverture). L'ancien test « attaquant à plus de 80 m, ballon au centre » était faux en football (il plaçait l'attaquant derrière la défense) : remplacé.

**Méthode changée** : chaque règle se teste dans les deux phases et sur la durée, et le match se regarde dans les trois modes à ×1 et ×4 avant chaque publication (référence football, §9.4).

## 11/11/2026 — Plateau en hexagones de couleur, variante en carrés

**Demande du concepteur** : « fais des hexagones de couleur et propose-moi la même chose en carré pour choisir » (modèle : le plateau de Merge Tactics).

**Ce qui a été fait**
- Un plateau unique sur le demi-terrain, sans chevauchement, toujours visible, en couleurs par bande de jeu : gardien (jaune), défense (bleu), milieu (violet), attaque (rouge) ; couloirs des côtés plus clairs ; rôle écrit dans chaque case (DC, MDC, MOC, MG, AG…).
- Deux formes au choix (boutons sur l'écran de placement, choix enregistré) :
  - **hexagones** : 5 et 4 cases en alternance, chaque rangée de 4 décalée d'une demi-case, donc à cheval sur deux cases des rangées voisines. 32 cases : G 2, DC 5 (3 + 2), DG 3, DD 3, milieu 8 (MDC 3, MC 2, MOC 3), côtés 3 + 3, attaque 5 (2 + 3) ;
  - **carrés** : 5 cases par rangée, exactement le découpage validé. 35 cases : G 2, DC 6, DG 3, DD 3, milieu 9, côtés 3 + 3, attaque 6.
- Gardien : deux petites cases (normal, avancé) dans sa zone, sous le plateau. Coins hauts (côtés de la dernière rangée) sans case.
- En changeant de forme, chaque joueur garde son poste et prend la case libre la plus proche (aller-retour sans perte, testé).
- Données : `postes.json` décrit chaque plateau rangée par rangée, comme un dessin. Les rectangles des postes sont déduits des cases.
- Moteur : la profondeur des cases la plus basse et la plus haute (lignes arrière et avant en attaque) est déduite du plateau ; la largeur des lignes de défense et de milieu (3 joueurs ou plus) est tenue entre 38 et 44 m quel que soit le placement (en hexagones, les latéraux des rangées décalées sont plus près de l'axe : la ligne ne faisait plus que 32 m).
- Faux ballon : une possession progresse (passes un peu plus souvent vers l'avant, circulation en retrait près de la surface adverse). Avant, il pouvait dériver jusqu'à notre surface pendant toute une possession « À vous ».

**Tests** : 60 verts. Les tests de données tournent sur les deux plateaux (nombre de cases, aucun chevauchement, rôles du milieu, case visée, compositions valables), ceux de réalisme aussi. Nouveaux : cases à cheval en hexagones, passage d'un plateau à l'autre. Test « défense adverse non repoussée » précisé : un retard quand le ballon repart en arrière est permis (4 s au plus d'affilée), une ligne repoussée par nos attaquants non (moins de 5 % du temps).

**Vérification au format téléphone** (390 × 844, clair et sombre) : la page de placement tient sur l'écran avec les deux formes ; glisser-déposer sur une case hexagonale et carrée, case visée surlignée à sa forme, joueur hors poste signalé, lâcher hors plateau sans effet, choix du plateau gardé après rechargement. Match en hexagones regardé à ×4 dans les trois modes.
