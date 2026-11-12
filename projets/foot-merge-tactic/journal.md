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

## 11/11/2026 — Hexagones validés, cases d'ailier

- Le concepteur choisit les **hexagones** (les carrés restent en variante dans le prototype).
- **AG et AD sont des cases d'ailier** à trois hauteurs (bas, milieu, haut) : les rôles « milieu gauche / droit » et « milieu avancé » disparaissent du plateau et des données ; postes naturels de l'effectif mis à jour (Sarrazin, Valmy : AG ; Cassagne : AD ; Ferrand DG et AG ; Tissier DD et AD). Couloirs d'ailiers en rouge clair.
- 60 tests verts. Vérifié au format téléphone.

## 12/11/2026 — Transitions groupées et mouvements moins « robots »

**Retour du concepteur** (capture en « Ballon alterné », ×3) : quand on récupère le ballon vers 40 m du but adverse, la défense adverse reste vers 19 m de son but, loin de tout ; ses milieux et attaquants sont 15 à 20 m plus haut ; nos attaquants ne viennent pas jusqu'à sa ligne. « L'équipe doit rester groupée pendant les transitions. » Et : mouvements très « robots », synchronisés à la seconde près.

**Mesures avant** (290 récupérations entre 30 et 50 m du but adverse, 40 graines) : à la récupération, défense adverse à 17 m du ballon puis 23 à 25 m ; 25 m entre sa défense et son milieu pendant 1,5 s, encore 15 m après 3,5 s ; équipe de 45 m ; notre joueur le plus avancé à 22 m de sa ligne, encore 9 m après 3 s. Toutes les cibles basculaient au même pas (0,5 s après le changement de possession).

**Causes**
- Forme d'attaque trop longue : défense 20 m derrière le ballon, donc isolée au moment de la perte.
- Bloc défensif bas par rapport au ballon (22 m derrière lui).
- La ligne défensive filait tout de suite à sa hauteur finale, pendant que le milieu, plus haut, mettait 3 à 4 s à revenir.
- Nos attaquants visaient la ligne que l'adversaire aurait une fois replié, et partaient au même instant que tout le monde, à 7 m/s.
- Un seul délai de 0,5 s pour les 22 joueurs, même vitesse et même accélération pour tous, même ballon vu par tous au même instant.

**Correction** (`simulation.ts`, `projection.ts`, `reglages.json`)
- Forme d'attaque : ligne arrière 15 m derrière le ballon (au lieu de 20).
- Défense : ligne 18 m derrière le ballon (au lieu de 22), et **hauteur de ligne tenue par l'équipe**, qui va vers celle que donne le ballon à vitesse limitée (recule de 3 m/s, remonte de 5 m/s au plus). À la perte, elle part de la hauteur où jouaient les défenseurs en attaque. Donnée d'équipe, fonction du ballon et du temps seulement : pas de boucle.
- Attaquants : ils visent la ligne que l'adversaire tient vraiment.
- **Réactions individuelles** : 0,2 s + 0,008 s par mètre du ballon + 0 à 0,35 s ; les plus proches d'abord. Chaque joueur a sa propre forme (attaque ou défense) pendant la transition.
- **Sprint de transition** : 8 m/s pendant 5 s au plus après la réaction (7 m/s sinon) ; ± 6 % de vitesse et d'accélération selon le joueur (en attendant l'attribut « vitesse »).
- **Perception** : chacun voit le ballon et les lignes tenues avec un petit retard (0,1 à 0,3 s selon le joueur, + 0,004 s par mètre).
- Largeur minimale des lignes portée à 39 m (marge : l'équipe passait à 37,99 m sur un relevé).

**Mesures après** (mêmes récupérations) : défense adverse à 12 m du ballon à la récupération, 19 à 22 m ensuite ; 22 m entre défense et milieu à la perte (forme d'attaque, ailiers hauts), 15 m après 3 s, 11 à 12 m après 4 s ; équipe de 39 m puis 24 m ; notre joueur le plus avancé à 17 m de la ligne, 5 m après 3 s, 1,4 m après 4 s. Les cibles basculent sur 0,3 à 1,3 s, les plus proches du ballon d'abord.

**Tests** : 69 verts. Nouveaux : réactions individuelles (les plus proches d'abord, étalement de plus de 0,3 s) ; cibles qui ne changent pas toutes au même instant (bascule et ballon qui part) ; et sur les deux plateaux, quatre tests de réalisme sur les transitions (équipe qui perd le ballon groupée et organisée en 5 s ; ligne qui recule pas à pas sans lâcher son milieu, défense pas « loin de tout » ; attaquants sur la ligne adverse après une récupération à 30-50 m du but ; bloc qui récupère qui monte ensemble). Les seuils sont choisis pour échouer sur l'ancien moteur (mesuré). Modifiés : vitesse maximale du contrôle anti-téléportation (sprint), écart du DC placé haut en attaque ramené à 4 m (équipe plus courte).

**Vérification** : captures au format téléphone (390 × 844, sombre et clair) en « Ballon alterné » ×3 et ×4, « À vous » ×1, « À l'adversaire » ×4 ; aucune erreur dans la console. Planches image par image de récupérations vers 40 m du but adverse, avant et après.

**Limites** : le faux ballon change de camp n'importe où, parfois loin de l'équipe qui récupère ; une partie des écarts mesurés vient de là. Le contre-pressing et la contre-attaque viendront avec le vrai ballon (mission 2).


## 12/11/2026 (suite) — Mission 2, étape 1 : ballon réel

Demande du concepteur : « passons à un ballon touché par les joueurs ». Étapes 1 à 3 de la feuille de route (ballon physique, actions, interception). Décisions fines, contre-pressing et collectif : plus tard.

**Fait** (`src/sim/ballon.ts`, réglages dans `reglages.json` → `ballon`) :
- Le ballon a une position et une vitesse, aux pieds d'un porteur ou libre (frottement 0,35/s). La possession est celle du dernier joueur qui l'a touché ; la possession simulée n'est plus utilisée à l'écran (gardée pour les anciens tests de projection : `new MatchSim(..., true)` active le ballon réel).
- Le porteur conduit (ballon 0,7 m devant, direction lissée), puis toutes les 0,6 à 1,2 s : tir s'il est près du but (18 m) et pas excentré, sinon passe au partenaire le mieux noté (progression, espace, distance, voie libre à 2 m des adversaires), sinon continue ; sous pression (4 m) : passe ou dégagement.
- Passe : vitesse 10 à 24 m/s selon la distance, visée devant le receveur, imprécision (1,5° + 0,12°/m). Tir : 26 m/s, cadre ± 5,2 m, arrêt du gardien 75 %.
- Interception : le premier joueur dans le rayon de contrôle (1,1 m, 1,6 m pour le receveur, 2,2 m gardien) prend le ballon ; tacle sur le porteur dans 2,8 m (0,5/s). Les deux plus proches du porteur le pressent ; le receveur et les plus proches du ballon libre vont le chercher.
- Remises en jeu simplifiées : touche et sortie de but (pas de corner), remise au centre après but, 3 s de priorité à l'équipe qui remet. Score affiché à l'écran.

**Mesures** (4 graines, 3 min chacune) : 9 à 11 passes par minute et par équipe, 62 à 93 % réussies ; 4 à 9 changements de camp par minute ; 0 à 3 tirs par équipe pour 3 min ; 0 à 1 but ; ballon libre 4 à 7 s au plus (coup d'envoi exclu).

**Tests** : 77 verts. `tests/ballon.test.ts` : ballon sur le terrain, pas de saut, collé à son porteur ; même graine, même match ; but et sortie de but ; passes (4 à 16 par minute, 55 à 97 % réussies) ; changements de camp (2 à 12 par minute) ; tirs (moyenne sous 0,5 par équipe et par minute) ; ballon jamais libre plus de 9 s ; la prise de possession fait basculer l'équipe.

**Limites / à régler** : trop de changements de camp et de tirs par rapport au vrai football (comptés pour l'instant « en montage ») ; le gardien adverse peut se tenir jusqu'à 22 m de son but en attaque (projection d'origine, à revoir) ; pas de hors-jeu, de fautes, de corners ; aucune qualité individuelle (tous les joueurs passent et tirent pareil) ; décisions simples, sans appels ni démarquages.

## 12/11/2026 (suite) — Tir dans la surface, contre-pressing

- Profondeur du placement mieux gardée en défense (influence 0,45 défense, 0,7 milieu et attaque ; 0,2 partout avant). Retour du concepteur : « zones en défense trop étroites sur la hauteur ».
- Tir : dans la surface, le porteur tire toujours (retour du concepteur : « on ne fait pas de passe en retrait ») ; hors surface, tir possible jusqu'à 22 m. Gardien : rayon d'arrêt 3,6 m, tirs moins précis.
- Gardien en attaque : 16 m de son but au plus (22 avant).
- Pressing normal : le plus proche presse dans 10 m, le suivant couvre 6 m derrière, côté but (avant : les deux plus proches dans 16 m, tout le temps).
- Contre-pressing (référence §4) : pendant 4 s après une perte en jeu, les 3 plus proches dans 20 m sprintent : un presse, un ferme la passe vers l'avant, un ferme l'intérieur.
- Passe jouée sous pression (adversaire à moins de 4 m) : imprécision × 3.
- Mesures (6 graines × 3 min) : récupérations dans les 5 s après une perte 42 % sans contre-pressing, 46 % avec ; 8 à 9 changements de camp par minute (encore trop : surtout des passes interceptées).
- Tests : 79 verts (tir dans la surface ; contre-pressing puis un seul presseur).

## 12/11/2026 (suite) — Lot A : jeu avec ballon

Décision du concepteur : pressing, contre-pressing, contre, tiki-taka = choix tactiques futurs ; réussite des passes selon les notes. Découpage : lot A (jeu avec ballon), lot B (hors-jeu, fautes, corners), lot C (notes des joueurs).

- Passe dans l'espace : 7 m devant le receveur, dans le sens du jeu, seulement s'il y arrive 0,5 s avant tout adversaire ; vitesse dosée pour arriver au point en même temps que lui.
- Contre : un ballon à plus de 13 m/s sur un adversaire est contrôlé une fois sur deux, sinon dévié (35 % de la vitesse, ± 70°) ; au-delà de 20 m/s, toujours dévié.
- Dribble : face à un adversaire à moins de 3,5 m, un joueur offensif tente une fois sur trois (défenseur : 4 fois moins) ; réussi une fois sur deux : l'adversaire est éliminé (ralenti 1,2 s), le porteur accélère ; raté : tacle ou ballon libre.
- Pressé sans solution sûre : dégagement seulement dans ses 35 premiers mètres, sinon il protège le ballon (tacle 2,5 fois moins probable pendant 1,2 s).
- Receveur et joueurs qui vont au ballon : ils visent le premier point de la trajectoire qu'ils peuvent atteindre (avant : un point au hasard de la trajectoire, le ballon passait derrière eux) ; ils peuvent approcher un adversaire à 1 m (2,5 m pour les autres).
- Tacle : 2 m, 0,2 par seconde (avant 2,8 m, 0,5).
- Mesures (6 graines × 3 min) : changements de camp 8,8 → 7,6 par minute ; passes réussies 67 → 72 % ; 30 dribbles dont la moitié réussis ; 18 contres. Le reste des pertes vient surtout des passes : à régler avec les notes (lot C).
- Tests : 79 verts (deux seuils élargis : réussite des passes d'une équipe sur 3 min ≥ 40 %, presseurs au ballon ≤ 2).

## 12/11/2026 (suite) — Passes approximatives, attaquant seul qui passe en arrière

Retours du concepteur : « beaucoup de passes très approximatives » (passes en profondeur mal gérées, ou contres sans changement de direction visible) ; « attaquant seul au but qui fait une grosse passe en arrière au lieu de tirer ».
- Seul devant (aucun joueur de champ adverse dans un cône de 18 m vers le but) et pas pressé : le porteur offensif fonce vers le but et tire à 18 m, sans passe. Dans les 35 derniers mètres, la conduite va droit vers le but.
- Passe dans l'espace seulement vers un coéquipier qui court déjà vers l'avant (plus de 2,5 m/s).
- Imprécision sous pression × 1,8 (× 3 avant).
- Contre : déviation franche, 35 à 100° d'un côté ou de l'autre (avant : 0 à 70°, souvent invisible).
- Mesures (6 graines × 3 min) : passes réussies 72 → 81 % ; changements de camp 7,4 par minute.
- Tests : 80 verts (nouveau : attaquant seul qui tire sans passer).

## 12/11/2026 (suite) — Lot B : hors-jeu, fautes, penalty, corners

- Hors-jeu : jugé au départ de la passe (camp adverse, devant le ballon et l'avant-dernier adversaire, tolérance 0,5 m) ; sanctionné quand le receveur touche le ballon : coup franc pour l'adversaire. Le passeur évite le joueur hors-jeu 85 fois sur 100.
- Fautes : un duel gagné par le défenseur est une faute 4 fois sur 10 : coup franc à l'endroit de la faute ; dans la surface du fautif : penalty (point à 11 m, tir, arrêt 22 %, pas de contre).
- Corner : ballon sorti derrière la ligne de but, touché en dernier par un défenseur ; centre dosé dans la surface (6 à 12 m du but). Sinon sortie de but.
- Reprise immédiate : un joueur qui reçoit le ballon dans la surface adverse décide en 0,1 s (il tire).
- Affichage : l'événement (But, Corner, Faute, Penalty, Hors-jeu, Touche, Sortie de but) s'affiche 2,5 s sous le terrain.
- Mesures (6 graines × 3 min) : 8 fautes, 1 à 3 corners, 1 hors-jeu, 76 % de passes réussies, 7,1 changements de camp par minute ; tirs 1,5 par équipe et par minute (trop : la règle « dans la surface on tire » joue à plein).
- Tests : 83 verts (corner, hors-jeu, penalty) ; seuil des tirs relevé à 2 par équipe et par minute.
