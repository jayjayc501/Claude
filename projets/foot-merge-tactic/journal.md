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

## 12/11/2026 (suite) — Engagement et six mètres

Retours du concepteur : engagement donné alors que les joueurs sont encore sur tout le terrain ; six mètres joué n'importe où.
- Après un but : ballon au centre, personne ne peut le toucher ; chaque joueur regagne sa case de coup d'envoi (son camp) ; engagement quand tout le monde y est (2 s au moins, 10 s au plus).
- Six mètres : au coin de la surface de but (9,16 m de l'axe, 5,5 m de la ligne), du côté de la sortie, joué par le gardien.
- Tests : 84 verts (nouveau : chacun regagne son camp avant l'engagement).

## 12/11/2026 (suite) — Engagement en passe, seul devant, tirs et gardien

Retours du concepteur : à l'engagement le joueur part tout droit au lieu de passer ; des joueurs seuls face au but font encore une passe en arrière ; les tirs vont trop sur le gardien, qui ne plonge jamais.
- Engagement (début et après un but) : le joueur le plus proche du centre vient au ballon (les autres sur leur case) ; il passe dans les pieds d'un coéquipier proche, à côté ou en retrait. Tant que l'engagement n'est pas joué, pas de pressing ni de tacle (adversaires à distance) ; réserve de 8 s.
- Seul devant : la pression ne compte plus que les adversaires devant ou à hauteur (un poursuivant ne bloque plus la course) ; le cône ne retient que les adversaires devant ; tous les joueurs de champ (défenseurs compris).
- Tir : vise le côté opposé au gardien (1,5 à 3,4 m de l'axe), erreur 1,5 m + 0,12 m par mètre de distance (penalty 0,8 m). Le gardien plonge vers le point de passage du ballon ; arrêt 90 % si le tir arrive sur lui, 25 % de moins par mètre d'écart, 15 % au moins ; tir hors cadre jamais arrêté.
- Mesures (6 graines × 3 min) : 61 tirs, 30 arrêts, 9 buts ; 75 % de passes réussies ; 6,4 changements de camp par minute.
- Tests : 85 verts (nouveau : passe d'engagement à côté ou en retrait ; test de bascule jugé sur une possession gardée 2,5 s).

## 12/11/2026 (suite) — Gardien qui plonge, six mètres, sons et annonces

Retours du concepteur : le gardien n'arrête rien et ne bouge pas vite ; sur six mètres, pas d'adversaire dans la surface ; ajouter un son et un affichage pour les événements.
- Plongeon : sur un tir, le gardien part vers le point de passage à 9 m/s, sans limite d'accélération, pendant 0,8 s ; il ne prend le ballon qu'à 1,6 m (avant : 3 m sans bouger, d'où l'impression qu'il ne faisait rien). Mesure : 31 arrêts pour 63 tirs, 10 buts (6 graines × 3 min).
- Six mètres : les adversaires sortent de la surface (cibles repoussées au bord + 1,5 m), pas de pressing ni de tacle ; le gardien attend qu'elle soit vide (5 s au plus).
- Sons (`src/ui/son.ts`, Web Audio, aucun fichier) : sifflet (faute, hors-jeu, engagement ; double pour le penalty), clameur (but, plus courte sur un arrêt), petit « toc » (corner, touche, six mètres). Bouton « Son / Muet ».
- Annonces sur le terrain : bandeau 1,4 s (But : rouge, plus grand, 2,5 s), en temps réel quelle que soit la vitesse.
- Tests : 85 verts ; page vérifiée dans le navigateur (annonces affichées, aucune erreur).

## 12/11/2026 (suite) — Annonces et sifflet

Retours du concepteur : pas d'annonce sur un arrêt (le jeu continue) ; le score sur l'annonce d'un but ; sifflet « double » et qui ressemble à un oiseau.
- Plus d'annonce sur un arrêt (le son de la foule reste) ; but : « BUT ! 1 – 0 ».
- Sifflet refait : note stable vers 3,2 kHz, souffle, léger roulement (avant : trille en modulation de fréquence, d'où l'effet oiseau). Penalty : un seul coup long (avant : deux coups, probable origine du « double sifflet »).
- Coup franc : les adversaires se tiennent à 9,15 m et ne taclent pas avant que le tireur ait joué. Mesure : aucune faute à moins de 4 s d'une autre, avant comme après (8 graines × 3 min).
- Tests : 85 verts ; page vérifiée dans le navigateur.

## 12/11/2026 (suite) — Lot D : défense de la surface et jeu sur les côtés

Retour du concepteur : trop de buts, pas assez d'arrêts ; presque pas de fautes, touches, corners, hors-jeu ; « on avance, on fait des passes, on tire, on marque ». Décision : lot D avant les notes ; les notes et l'interface viendront dans une autre conversation, une fois le moteur stable.

Diagnostic mesuré : 75 % des tirs se faisaient sans aucun défenseur entre le tireur et le but. La ligne défensive reculait au plus à 3 m/s, le porteur courait à plus de 6 m/s.
- Ligne défensive : recul rapide (7 m/s) quand le ballon arrive à moins de 8 m devant elle ; sinon toujours pas à pas (transitions groupées).
- Marquage : ballon à moins de 32 m du but, chaque défenseur ou milieu libre suit un attaquant dangereux (à moins de 24 m du but), côté but, à 1,5 m.
- Centres : sur l'aile (plus de 12 m de l'axe), à moins de 28 m de la ligne de but, avec un coéquipier dans la surface : centre aérien une fois sur deux. Corners joués de la même façon.
- Ballon aérien (centres, dégagements) : personne ne le touche pendant 80 % du vol ; dessiné plus gros.
- Dégagement : défenseur pressé à moins de 22 m de son but : long ballon aérien vers l'avant et le côté.
- Construction : avant bouché (adversaire à moins de 7 m dans le cône), il fait tourner (seuil de passe abaissé) ; petit bonus aux passes vers les côtés.
- Tirs : tirs de loin moins fréquents ; erreur 2,2 m + 0,16 m par mètre ; gardien meilleur de loin (+2 % par mètre au-delà de 11 m), arrêt 30 % au moins ; parade 4 fois sur 10 : ballon repoussé de côté, souvent en corner.
- Mesures (12 matchs de 3 min) : 107 tirs, 50 arrêts, 15 buts (1,25 par match, contre 1,7) ; 21 fautes, 9 corners, 29 touches, 16 centres, 7 dégagements, 30 contres ; 77 % de passes réussies ; 5,8 changements de camp par minute. Tirs sans défenseur entre le tireur et le but : 35 % (75 % avant).
- Tests : 86 verts (nouveau : moins de la moitié des tirs sans défenseur entre le tireur et le but ; deux tests adaptés au recul rapide et au ballon aérien à 30 m/s).

## 12/11/2026 (suite) — Touche en passe, pause aux remises en jeu

Retours du concepteur : sur une touche, le joueur part avec le ballon au lieu de faire une passe ; il faudrait de petites pauses aux six mètres, touches, engagements, coups francs.
- Touche : passe (à la main, dans les pieds) vers le coéquipier le plus libre à moins de 22 m.
- Remises en jeu (touche, six mètres, coup franc, corner, engagement) : le tireur s'arrête net, le ballon reste à sa place, pause de 0,8 à 1,4 s avant de jouer ; pas de tacle tant qu'il n'a pas joué.
- Tests : 87 verts (nouveau : sur une touche, pause puis passe, le tireur ne part pas avec le ballon).

## 12/11/2026 — Interface : maquette de l'écran de préparation

**Ce qui a été fait** (moteur figé, aucun code modifié)
- Recherche sur l'interface de Merge Tactics (Clash Royale) : plateau en hexagones, boutique de 3 cartes, élixir, banc, compteurs de traits, panneau des joueurs.
- Maquette de l'écran de préparation sur claude.ai (canevas Design) : https://claude.ai/artifact/67QRVRz7Fd6f8YWD9gHPq4.
  - V1 (mise de côté) : ronds de couleur par pays sur le plateau, jauge de fusion.
  - V2 (retenue) : bustes de figurines en vinyle sur socle, posture selon le style, fusions en couleurs (bleu, or, violet avec étincelles).
- Images de référence générées avec Kling (environ 14 crédits sur 50 autorisés), découpées et recolorées pour la maquette.

**Décisions du concepteur** : voir `CLAUDE.md`, section « Interface (séance du 12/11) » : postes des joueurs (G, DC, DG/DD, MC, AG/AD, BU), hors poste refusé, gardien unique en double losange, banc de 5, une couleur par pays, Bronze/Argent/Or en pause, bustes avec postures, fusions bleu/or/violet.

**Prochaine étape** : concept des cartes et des notes des joueurs, puis intégration de l'écran dans le prototype.

## 12/11/2026 (suite) — Écran de préparation intégré au prototype

Demande du concepteur : intégrer l'écran de la maquette du 12/11 ; moteur figé (aucun fichier de `src/sim/` modifié).
- Nouvel écran « Préparation » (remplace l'écran de placement) : en-tête avec chrono et classement du groupe (prochain adversaire en rouge), compteurs de pays et de styles à gauche (paliers 3/5/7, fond grisé sous le premier palier), plateau en hexagones au centre (terrain #c4dbcd, cases à 30 % avec fin contour blanc, noms de poste à 30 %, AC affiché BU, cases basses des ailiers MG/MD, gardien en double losange), banc de 5, mercato de 6.
- Joueurs en bustes (images de référence de la maquette, incluses dans la page) ; fusions : aura et anneau du socle bleu, or, violet avec étincelles. Nom au toucher.
- Glisser-déposer : case libre de son poste, échange dans le même poste, remplaçant sur un titulaire, sortie sur le banc (5 places), vente sur le mercato. **Hors poste refusé** (message). Toucher une carte du mercato l'achète : fusion automatique avec la copie (3 au plus), sinon le joueur va sur le banc.
- Données : `src/data/preparation.json` (équipe de la maquette, 4 pays, styles d'après les postures, groupe, mercato). `equipes.json` inchangé (tests du moteur) ; l'adversaire du match en vient toujours.
- Démonstration seulement : chrono et classement fixes ; budget (7), prix (2-3) et revente au prix de la carte sont provisoires ; les achats ne sont pas gardés au rechargement (la composition l'est). Choix hexagones / carrés retiré de l'écran (carrés gardés dans les données).
- Tests : 93 verts (6 nouveaux : composition de la maquette, hors poste refusé, banc de 5, achat et fusion, vente, compteurs). Page vérifiée au format téléphone (390 × 844), aucune erreur.

## 12/11/2026 (suite) — Pelouse de l'écran de préparation

Retour du concepteur : « le fond vert pâle ne fait pas terrain de foot ».
- Pelouse rayée (vert #4E9A5A / #58A564) et tracé blanc complet à l'échelle de la largeur : lignes de touche, ligne médiane, rond central, surface et petite surface, point de penalty, arc, corners, but.
- Cases à 38 % (au lieu de 30 %), contour blanc à 45 %, noms de poste à 60 % : lisibles sur le vert.

## 12/11/2026 (suite) — Styles : 4 pour la première version

Décisions du concepteur : tactique d'équipe séparée des styles ; pas de style de gardien ; styles avant les notes ; 4 styles (Presseur, Technicien, Rapide, Rempart) ; certains joueurs sans style.
- Écran de préparation : compteurs des 4 styles (toujours affichés, du plus fréquent au moins fréquent) ; `preparation.json` ramené à ces 4 styles, 7 joueurs sur 18 sans style (`null`), dont le gardien.
- Tests : 6 verts pour l'écran (compteurs mis à jour).

## 12/11/2026 (suite) — Tactique d'équipe et pictogrammes des styles

Demandes du concepteur : « ajouter la possibilité d'ajouter une tactique : Pressing, Gegenpress, Contre, Tiki-taka… » (écran seulement, une seule à la fois, Équilibrée par défaut) ; « modifie les styles par des pictos ».
- Écran de préparation : bandeau « Tactique d'équipe » sous le plateau, 5 choix (Équilibrée, Pressing, Gegenpress, Contre, Tiki-taka) ; un toucher choisit, un message rappelle l'intention et « pas encore d'effet sur le match ». Choix gardé au rechargement. **Moteur inchangé.**
- Compteurs de styles : pictogrammes au lieu des codes (Rempart : bouclier ; Presseur : flèches qui se resserrent ; Technicien : ballon ; Rapide : éclair). Nom du style au survol et pour la lecture d'écran.
- Titre « Prototype 1 » retiré au-dessus des onglets (place gagnée).
- Tests : 7 verts pour l'écran (nouveau : tactique). Vérifié à 390 et 360 px de large, aucune erreur.
- (suite) À la demande du concepteur, les 5 boutons de tactique deviennent une **liste déroulante au-dessus du terrain** (« Tactique : Équilibrée ▾ », liste native du téléphone, texte en 16 px pour éviter le zoom de l'iPhone).
- (suite) « Presseur » renommé **Récupérateur**, pictogramme de main (choix du concepteur) ; code `REC` dans `preparation.json`. Liste de tactique : « Tactique » (13 px) et le nom choisi (14 px) à des tailles proches ; la liste native du téléphone est posée, invisible, sur ce texte.
- (suite) Pictogramme du Récupérateur : bras plié musclé (poing en haut, biceps bombé) à la place de la main, à la demande du concepteur ; dessin choisi après plusieurs essais pour rester lisible en 17 px.
- (suite) Poing du bras redessiné à la demande du concepteur (« pas un poing serré ») : doigts repliés visibles (bosses des phalanges, deux plis).
- (suite) Pictogramme du Récupérateur : **poing fermé vu de face** (4 doigts repliés, pouce en travers), sans bras : le bras « n'était pas compréhensible » (concepteur).
- (suite) Le concepteur veut un pictogramme plus facile à identifier : **aimant penché** (🧲, pôles pleins) pour le Récupérateur, qui « aimante » le ballon.
- (suite) Aimant mis à la verticale, pôles en haut (demande du concepteur).

## 12/11/2026 (suite) — Tactiques et styles dans le moteur

Demande du concepteur : « tout d'un coup », avec un bouton qui active ou désactive tactiques et styles, et un moyen de changer de tactique en plein match pour valider l'impact. Référence relue : §3 (le bloc), §4 (pressing, contre-pressing), §5, §7.
- **Principe** : tactiques et styles ne réécrivent pas le moteur, ils modulent ses réglages, équipe par équipe (`src/sim/influences.ts`, chiffres dans `src/data/influences.json`, **PROPOSITION**). Sans tactique (Équilibrée) ni style, réglages de base inchangés : les 87 tests du moteur donnent exactement les mêmes résultats.
- **Tactiques** :
  - Pressing : bloc haut (ligne 24 à 46 m, 13 m derrière le ballon), lignes resserrées, pressing déclenché à 17 m, 3 joueurs sortent sur le porteur, tacles plus fréquents, un peu plus de fautes ; **nouveau comportement** : les milieux et attaquants libres ferment les lignes de passe (entre le ballon et les adversaires à moins de 22 m), d'après la référence §4.
  - Gegenpressing : contre-pressing 7 s, 5 joueurs, rayon 28 m (2 places de plus : extérieur et passe longue), tacles plus fréquents.
  - Contre : bloc bas (ligne 9 à 25 m, recul plus rapide), pressing à 6 m, 1 seul joueur en contre-pressing, attaquants plus hauts, passes plus verticales et plus longues, plus de passes dans l'espace, sprint de transition plus long et plus rapide.
  - Tiki-taka : passes de 5 à 24 m, passe plus facile, préférence pour le joueur libre plutôt que l'avancée, rotation dès que l'avant est bouché, moins de tirs de loin, de centres et de dribbles, décisions plus rapides.
- **Styles** : effet sur le joueur + effet d'équipe à 3 joueurs (palier) :
  - Récupérateur : presse de plus loin (×1,6), tacle plus (×1,4) / contre-pressing +1 joueur, +2 s ;
  - Technicien : passes plus précises, dribbles et protection meilleurs / passes plus courtes et plus sûres, rotation ;
  - Rapide : +8 % de vitesse, dribbles moins sûrs / sprint de transition +2 s, plus de passes dans l'espace ;
  - Rempart : tacle plus, moins de fautes, relance moins précise / ligne qui recule plus vite.
- Nouveaux réglages (valeurs de base = comportement d'avant) : `ballon.presseurs` (2), `ballon.poidsProgression` (0,5), `ballon.poidsEspace` (1,2), `ballon.marquage.zonePressingM` (0 = inactif).
- **Écran du match** : liste de tactique pour chaque équipe (modifiable en plein match), boutons « Tactiques ✓/✗ » et « Styles ✓/✗ », tableau de bord (tactiques, paliers atteints, possession, passes réussies, hauteur des lignes défensives). La tactique de la préparation et les styles des joueurs passent au moteur.
- **Mesures** (`bun run scripts/mesurer-influences.ts 30 180`) :

```
30 matchs de 180 s par configuration, contre l'adversaire en Équilibrée (moyennes par match, notre équipe)
Configuration      Poss.  Passes Réuss.  Tirs  T.rap. T.cont  Buts  B.cont  Ligne  Récup. dont H. Tacles Fautes R.adv. Ch.camp/min
Équilibrée            53%   25.3     73%    3.9    1.2    4.4   0.43   0.60   30.8    9.1    1.6    0.7    0.7     69%    6.3
Pressing              52%   25.7     75%    4.4    1.8    3.6   0.37   0.30   36.5    9.0    2.1    1.1    1.1     73%    6.1
Gegenpressing         53%   26.1     74%    4.1    1.2    4.6   0.50   0.30   31.1    9.3    1.9    0.9    0.8     70%    6.3
Contre                54%   24.8     64%    4.5    1.3    4.5   0.67   0.47   25.8   10.1    2.0    0.9    0.4     68%    6.9
Tiki-taka             61%   42.4     86%    3.6    0.7    4.3   0.47   0.50   30.5    7.6    1.4    0.4    0.5     72%    5.2
3 Récupérateurs       53%   26.1     73%    3.9    1.3    4.6   0.40   0.30   31.1    9.3    2.2    0.8    0.5     69%    6.4
3 Techniciens         53%   28.0     77%    3.9    0.9    4.4   0.60   0.57   30.6    9.0    1.8    1.2    0.6     73%    6.1
3 Rapides             52%   23.7     69%    4.4    1.6    4.4   0.40   0.67   30.2    9.2    1.6    0.6    0.7     71%    6.3
3 Remparts            53%   25.9     68%    3.4    1.2    5.0   0.37   0.50   27.7    9.3    1.6    1.1    0.4     72%    6.3
```

  Lecture : Pressing = ligne +6 m, plus de récupérations hautes et de tirs rapides, moins de buts encaissés, plus de fautes ; Contre = bloc bas, plus de récupérations, meilleure attaque, passes moins réussies ; Tiki-taka = 61 % de possession, 42 passes à 86 %, moins de changements de camp ; Gegenpressing = moins de buts encaissés ; les styles ont des effets plus faibles (3 joueurs sur 11), à juger en match. Pressing : la réussite des passes adverses ne baisse pas encore (73 % contre 69 %).
- Tests : 100 verts (6 nouveaux : correctifs, réglages inchangés sans tactique ni style, palier à 3 joueurs, changement de tactique en plein match rejouable, réalisme du bloc (Pressing plus haut, Contre plus bas), réalisme du Tiki-taka). Page vérifiée au format téléphone, aucune erreur.

## 12/11/2026 (suite) — Défenseurs centraux, styles visibles

Retours du concepteur : « je ne sais pas quel joueur a quel style » ; « les défenseurs centraux sont trop décalés à droite et à gauche et ils ne vont pas vers le BU lorsqu'il a le ballon ». Référence relue : §6 (défenseur central : duels, couverture), §9.1 (largeur des lignes).
- Écran de préparation : pastille du style (même pictogramme que les compteurs) sur chaque buste du terrain, du banc et du mercato ; au toucher, « Nom · Style » (ou « sans style »).
- Moteur (comportement de base modifié) :
  - les défenseurs centraux restent près de l'axe (écart à l'axe ×0,65, `projection.defense.resserrementDC`) ;
  - une ligne trop étroite s'élargit par ses extrémités (latéraux, côtés) au lieu d'écarter tout le monde ;
  - un défenseur central sort sur le porteur dans l'axe (à moins de 20 m du centre) jusqu'à 18 m (`ballon.sortieDC`) ; s'il n'est pas le plus proche, il couvre.
- Mesures (équipe de la préparation, 6 matchs de 2 min) : écart moyen entre les deux DC en défense 15,6 m (23,9 avant) ; BU adverse avec le ballon à moins de 18 m d'un DC : un DC sort 39 % du temps (24 % avant).
- Test « le bloc monte quand on a le ballon… » : moyenne sur 6 graines au lieu d'une seule (le faux ballon des anciens tests suivait un trajet aléatoire qui change dès que les joueurs bougent) ; écart moyen 20 m (16 avant), seuil inchangé (8 m).
- Tests : 100 verts.

## 12/11/2026 (suite) — Écran du match refait (aussi fun que la préparation)

Demande du concepteur : « une IHM aussi fun et belle que celle de la préparation » ; « je parle aussi des joueurs, là c'est triste ». Moteur inchangé.
- Panneaux clairs comme la préparation : tableau de score (Toi – Olympia, chrono, barre de possession bleu/rouge), bouton principal Coup d'envoi / Pause / Reprendre, puces Nouveau, vitesse, son, zones.
- Pelouse rayée et tracé blanc, comme sur le plateau de préparation.
- **Joueurs** : tes joueurs en pastilles avec le **visage de leur figurine** (tête cadrée d'après l'image), anneau de la couleur de leur pays ; adversaires en **petits avatars dessinés** (tête, cheveux, maillot rouge), différents d'un joueur à l'autre ; ombre portée.
- **Porteur du ballon** : halo doré qui pulse et son nom au-dessus de lui ; ballon avec ombre (plus gros et décollé quand il est en l'air).
- **Annonces** qui « sautent » (rouge pour faute, penalty, hors-jeu ; or pour un but de ton équipe, rouge pour un but encaissé) et **confettis** sur un but.
- Tactiques : deux pilules (Toi / Olympia) modifiables en plein match ; interrupteurs « Tactiques activées / coupées », « Styles activés / coupés » ; tableau de bord en cartes (possession, passes réussies, ligne défensive, vous en bleu / eux en rouge) et paliers de styles avec leurs pictogrammes.
- Pictogrammes des styles regroupés dans `src/ui/pictos.ts` ; position des têtes dans les images : `TETES` dans `src/ui/bustes.ts`.
- Tests : 100 verts. Page vérifiée au format téléphone, aucune erreur.
- (suite) « Pas assez visibles, les petites têtes » : pastilles agrandies (rayon 15 au lieu de 11, environ 30 px à l'écran), marge du terrain réduite ; ceux du bas de l'écran passent devant ceux du haut (ordre refait toutes les 10 images) ; étiquette du porteur plus grande.
- (suite) « Le cercle avec les têtes n'est pas terrible » : pastilles abandonnées. **Les joueurs sont des figurines sur leur socle**, comme sur l'écran de préparation (36 px de large, socle blanc pour toi, rouge pour l'adversaire, ombre, aura de fusion bleue, or ou violette, porteur sur un socle doré avec son nom ; ceux du bas passent devant).
- Adversaires : bustes de la maquette **recolorés en maillot rouge et retournés** (`scripts/recolorer-adversaires.py`, images dans `src/images/adversaires/`) ; on prend d'abord ceux qui ne sont pas sur ton terrain. Avec 18 images seulement, quelques adversaires restent des copies de tes joueurs : il faudra des figurines propres à l'adversaire.
- Page : 732 Ko (images incluses). Tests : 100 verts. Vérifié au format téléphone, aucune erreur.
- (suite) « C'est quand même un sacré bordel » avec 22 figurines : le concepteur veut tester trois rendus. Sélecteur **Vue : Pions · Figurines · Caméra** sur l'écran du match (gardé au rechargement, changeable en plein match) :
  - **Pions** (par défaut) : ronds nets, couleur du pays pour ton équipe (contour blanc), rouge pour l'adversaire (contour rouge foncé) ; **seul le porteur surgit en figurine** (40 px) sur un socle doré, avec son nom ;
  - **Figurines** : toutes les figurines, plus petites (26 px), le porteur agrandi (×1,4) ;
  - **Caméra** : figurines de 30 px, fenêtre de 44 m de large qui suit le ballon en douceur (revient sur la décision « terrain entier visible » : pour essai seulement), annonces au centre de la vue.
- Tests : 100 verts. Les trois vues vérifiées au format téléphone, aucune erreur.
- (suite) Retour sur la vue Pions : « le joueur perd trop vite la balle, il apparaît et disparaît », « pas de séparation visuelle forte entre les 2 équipes », « les joueurs se montent les uns sur les autres ». Affichage seulement :
  - **joueur en vedette** : le porteur, ou pendant une passe le dernier à avoir touché le ballon ; il ne change qu'après 0,7 s de jeu au moins. Mesure sur 20 s : la figurine disparaît 1 fois (avant : à chaque passe) et change de joueur 7 fois ;
  - **couleurs d'équipe** dans la vue Pions : bleu (contour blanc) pour toi, rouge (contour foncé) pour l'adversaire, au lieu des couleurs de pays ;
  - **écartement à l'affichage** : deux pions à moins de 16 unités (environ 3 m) s'écartent à l'écran (3 passes de répulsion), sans toucher au moteur ; figurine du porteur ramenée à 34 px.
- Remarque : le moteur change encore souvent de possession (environ 6 fois par minute contre 2 à 3 en vrai) ; limite connue, à traiter avec les notes des joueurs ou un réglage dédié.
- (suite) « L'équipe adverse est reconnaissable mais pas la mienne : les points et maillots adverses sont rouges, moi ils devraient être bleus. » **Décision** : en match, ton équipe en bleu (pions et figurines), l'adversaire en rouge ; couleurs de pays seulement en préparation.
  - `scripts/recolorer-equipe.py` : maillots des 18 bustes recolorés au bleu d'équipe (vert, bleu clair, bleu marine ; l'orange de l'Espagne seulement sous la tête, pour ne pas toucher les visages mats ni les cheveux roux) ; images dans `src/images/equipe-bleue/`. Vérifié image par image.
  - Page : 1,08 Mo (images incluses). Tests : 100 verts ; vues Pions et Figurines vérifiées au format téléphone, aucune erreur.
- (suite) « Les 2 joueurs brésiliens n'ont pas de maillot bleu et le cercle en dessous n'est pas comme les autres » : les bandes jaune citron de Lima (et de Mercier) dominaient en petit : passées en blanc (maillot bleu à bandes blanches). Le cercle différent sous Lima et Moura est l'aura de fusion (Lima niveau 3 violet, Moura niveau 1 bleu), comme sur la préparation : gardée.
- (suite) « Les maillots de tous les joueurs de l'équipe doivent être les mêmes, pas avec ou sans bandes, et le cercle aussi ; c'est juste la flamme orange ou violette qui doit rester colorée. » **Décision** notée. `scripts/maillots.py` : chaque maillot (bandes comprises) prend exactement la même couleur, même teinte, saturation et luminosité moyenne (bleu pour toi, rouge pour l'adversaire), plis gardés. Socle : l'avant de l'anneau est redessiné par-dessus l'aura, il reste blanc pour tous ; seule la flamme est colorée. Vérifié sur les 29 figurines et au format téléphone.

## 12/11/2026 (suite) — Match en deux mi-temps, statistiques à la mi-temps

Demande du concepteur : « un timer de 60 s en vitesse ×3 pour faire une mi-temps, et des stats à la mi-temps ».
- Écran du match : vitesse ×3 par défaut ; une mi-temps = 180 s de jeu simulé (60 s à l'écran en ×3) ; chrono en minutes de match (« 1re MT · 22' », puis 45' → 90').
- Mi-temps : un coup de sifflet long, panneau sur le terrain : score, possession, tirs (cadrés = buts + arrêts du gardien adverse), passes réussies et pourcentage, tacles gagnés, fautes, corners, hors-jeu, arrêts. Tactique modifiable avant de reprendre. Bouton « 2e mi-temps » : l'adversaire engage, chacun regagne sa place (`BallonReel.coupDEnvoi`, même mécanisme qu'après un but).
- Fin du match : même panneau avec les totaux et le score à la mi-temps ; bouton « Nouveau match ».
- Tests : 101 verts (nouveau : coup d'envoi de la 2e mi-temps). Match complet vérifié dans le navigateur (horloge accélérée) : mi-temps à 61 s, 2e mi-temps, fin ; aucune erreur.
- (suite) « Fais 45 s et en ×4 » : vitesse ×4 par défaut ; la mi-temps reste de 180 s de jeu simulé, soit 45 s à l'écran.

## 12/11/2026 (suite) — Engagements, coulissement et surnombre

Retour du concepteur (capture à 86') : « Les engagements sont nuls : une passe en arrière à personne. Il y a encore de la robotisation et les mouvements ne sont pas bons. Il faut coulisser et apporter du surnombre des fois, DG/DD et MDC/MC/MOC, et encore plus s'ils sont hauts sur le terrain. »
- **Engagement** (PROPOSITION) : un coéquipier vient se placer à côté du ballon (4 m) ; les adversaires restent dans leur moitié, hors du rond (9,15 m) ; le tireur attend que le partenaire soit en place et le rond vide (6 s au plus), puis lui passe (85 %) ou joue en retrait sur le plus proche. Cause trouvée : l'avant-centre adverse restait collé au point central et coupait la passe. Mesure sur 40 coups d'envoi : 1re passe reçue 40/40 (avant 25/40), ballon gardé 6 s 27/40 (avant 11/40), sur les deux plateaux.
- **Coulissement** (PROPOSITION) : en attaque, tout le bloc glisse vers le côté du ballon (35 % de l'écart latéral) ; le latéral et l'ailier opposés glissent moins (30 % de ce glissement), pour garder la largeur.
- **Surnombre côté ballon** (PROPOSITION) : DG/DD et milieux (MC, donc MDC/MC/MOC selon la place) proches du ballon montent jusqu'à 12 m de plus ; l'effet commence quand le ballon passe 40 % du terrain et est complet à 75 % ; un joueur reculé ne dépasse pas le ballon. Mesure sur 10 matchs : coéquipiers à moins de 15 m du porteur dans la moitié adverse 1,64 (avant 1,41), dans le dernier tiers 1,38 (avant 0,98). Plus fort (proximité 0,42) : la couverture derrière le ballon (au moins 4 joueurs) tombe sous le seuil, donc gardé à 0,3.
- **Respiration** (PROPOSITION, contre la robotisation) : en attaque, chaque joueur de champ oscille autour de sa place (2 m, surtout de côté, période propre à chacun de 4 à 8 s) ; arrêtée pendant les transitions et les sprints.
- Tests adaptés : l'ordre des lignes et le délai de réaction mesurés sans surnombre ni respiration (règles de base) ; nouveau test « surnombre côté ballon » ; ligne Pressing/Contre mesurée sur 8 matchs au lieu de 4 (le hasard des engagements pesait trop). 102 verts.

## 12/11/2026 (suite) — Mouvements plus réalistes, tactiques vérifiées, ballon et vue « Action »

Demande du concepteur : styles coupés en match pour l'instant ; moteur « encore plus réaliste dans les mouvements » ; statistiques cohérentes avec chaque tactique (Tiki-taka : plus de passes, mieux réussies ; Contre : peu de passes, jeu vers l'avant…) ; ballon plus beau et moderne ; laisser tomber la vue Caméra ou proposer mieux ; vitesse ×3,5.
- **Match** : styles coupés par défaut (l'interrupteur reste pour essayer) ; vitesse ×3,5 par défaut (mi-temps de 180 s simulées ≈ 51 s à l'écran), choix 0,5 / 1 / 2 / 3 / 3,5 / 4.
- **Mouvements** (PROPOSITION, relu `docs/reference-football.md` §5, §7, §9) :
  - **allures** : chacun suit la vitesse de sa place et rattrape l'écart en douceur (marche pour 1 à 2 m, trot, course) ; pleine vitesse seulement près du ballon (20 m), quand il joue le ballon, quand il va vers l'action, quand il est pris devant sa place (repli côté but) ou, en transition, s'il est loin de sa place ; loin du jeu, course plafonnée à 5,5 m/s (plus s'il est très en retard). Freinage (8 m/s²) plus fort que l'accélération (5 m/s²) : on se retourne plus vite ;
  - **repère de forme** : le bloc suit le ballon à vitesse limitée (4,5 m/s en largeur, 5 m/s pour monter, 10 m/s pour revenir soutenir), et se replace aussitôt sur un arrêt de jeu ; porteur, receveur, presseurs et surnombre jouent toujours le vrai ballon. Le bloc ne saute plus à chaque passe ;
  - **jeu sans ballon** (référence §5) : **appels en profondeur** (un attaquant en jeu part en diagonale dans le dos de la défense quand le porteur a du temps ; le porteur lève la tête ; le défenseur le plus proche suit l'appel ; la passe dans l'espace se joue dans le sens de la course) ; **soutien** : les deux coéquipiers les plus proches se rapprochent du porteur (12 m) et ouvrent une ligne de passe (pas de côté ou décrochage). Ces décalages dépendent des adversaires mais restent bornés autour de la place (pas de dérive, §9.2 règle 6) ;
  - respiration plus lente (période de 6 à 11 s).
  - Mesures (40 matchs de 3 min, Équilibrée) : vitesse moyenne des joueurs de champ 4,4 m/s (4,7 avant), sprint 15 % du temps (18 %), marche 17 % (14 %) ; coéquipiers à moins de 15 m du porteur dans le dernier tiers adverse 1,6 (1,4 avant) ; 11 appels par match, dont 4 à 5 servis ; engagements : ballon gardé 6 s 25 fois sur 40.
  - Limite : on court encore beaucoup (vrai football : environ 2 m/s en moyenne), car le ballon change de camp 6 fois par minute (beaucoup de tirs) et chacun se replace à chaque transition.
- **Tactiques** (PROPOSITION, `scripts/mesurer-jeu.ts`, 40 matchs de 3 min contre Équilibrée, styles coupés). Nouveaux leviers : contre-attaque (5 s après la récupération : jeu vers l'avant, appels plus fréquents), jeu long (ballon aérien vers un attaquant lancé), gêne du pressing (passe moins précise, contrôle raté quand on est serré), contre-pressing (tacles plus francs, porteur précipité et moins précis).

  | Tactique | Poss. | Passes | Réussite | Gain par passe | Ballons longs | Ligne | Récup. hautes | Contre-pressing réussi | Passes adverses réussies | Récup. → tir |
  |---|---|---|---|---|---|---|---|---|---|---|
  | Équilibrée | 50 % | 24,7 | 76 % | 8,6 m | 35 % | 30 m | 2,2 | 41 % | 81 % | 10,4 s |
  | Pressing | 51 % | 24,5 | 78 % | 7,7 m | 34 % | 37 m | 2,9 | 40 % | 73 % | 10,9 s |
  | Gegenpressing | 53 % | 25,4 | 77 % | 6,7 m | 30 % | 33 m | 3,7 | 51 % | 71 % | 9,7 s |
  | Contre | 48 % | 22,1 | 71 % | 11,3 m | 49 % | 25 m | 2,2 | 37 % | 75 % | 9,4 s |
  | Tiki-taka | 62 % | 46,5 | 91 % | 2,2 m | 1 % | 32 m | 1,6 | 34 % | 82 % | 17,8 s |

  Cohérent : Tiki-taka (possession, beaucoup de passes courtes et réussies, jeu patient) ; Contre (bloc bas, le moins de passes, les plus verticales et les plus longues, tir le plus vite après la récupération, passes moins réussies) ; Pressing (bloc haut, l'adversaire rate plus de passes, récupérations plus hautes, le moins de buts encaissés) ; Gegenpressing (le plus de ballons repris dans les 5 s après une perte, récupérations hautes, plus de tirs, mais plus de buts encaissés). Limite : la possession du Contre baisse peu (48 %) : dans nos matchs courts, elle dépend surtout des tirs et des remises en jeu.
- **Ballon** : sphère brillante, motif bleu et or qui tourne quand il roule, reflet, halo clair pour le voir sur la pelouse ; en l'air, il monte au-dessus de son ombre et grossit ; traînée blanche derrière les ballons rapides (passes appuyées, tirs).
- **Vues** : Caméra retirée. Nouvelle vue **« Action »** (par défaut, PROPOSITION) : les joueurs à moins de 13 m du ballon passent en figurines (ils redeviennent pions au-delà de 18 m, après 0,8 s au moins), les autres restent des pions ; terrain entier visible. Pions et Figurines gardées.
- Tests : 107 verts (nouveaux : allures, appels, signatures de Contre, Pressing et Gegenpressing ; le test de touche passe à 7 graines, il y a peu de touches par match). Vérifié au format téléphone (trois vues, ballon, traînée, mi-temps à 51 s), aucune erreur.
- (suite) « Le mode action scintille. » Deux causes trouvées en mesurant dans le navigateur : (1) l'animation d'apparition (CSS) repartait de zéro chaque fois que le tri de profondeur déplaçait la figurine, soit 470 départs d'animation en 6 s ; (2) les joueurs changeaient trop souvent d'état (7 fois par seconde) : zone collée au ballon, seuils de 13/18 m, durée minimale de 0,8 s de jeu, soit 0,2 s à l'écran en ×3,5. Corrigé : fondu par script (qui survit au tri), tri seulement quand l'ordre change, zone qui suit le ballon à 10 m/s au plus, seuils 12/21 m, 1,6 s à l'écran au moins dans un état, fondu de 0,26 s au lieu du saut. Mesure : 20 changements en 6 s (43 avant, et chacun en fondu).
- (suite) « Pourquoi ils n'ont pas tous la même taille ? » Trois raisons : le porteur était agrandi (×1,2) dans la vue Action ; les bustes de la maquette n'ont pas tous la même échelle (hauteur visible de 85 à 99 % de l'image : les crânes rasés plus petits, les coupes afro et les cheveux en pointe plus grands) ; l'apparition partait de 80 % de la taille. Corrigé : `normaliser()` (scripts/maillots.py) ramène chaque figurine de match à la même hauteur visible (85 %), en réduisant les plus grandes autour du socle ; tailles d'affichage relevées de 6 % ; porteur à la même taille dans la vue Action (halo et nom pour le repérer) ; fondu sans changement de taille. Au passage : traces bleues ou rouges sur le visage du joueur au bandeau (CB, IS) corrigées (CB repart du buste IS, propre ; menton d'IS et d'AS protégé).

## 12/11/2026 (soir) — Moins de course, moins de va-et-vient, plus de jeu construit ; socles aux couleurs des équipes

Concepteur : « Tu penses quoi, on a passé un cap ? » — « Pas totalement mais ça prend forme. » Les trois défauts proposés sont confirmés (« oui c'est ces 3 points ») : ça court tout le temps ; trop de va-et-vient ; les actions finissent trop vite en tir. Et : « les cercles sous les joueurs doivent être de la même couleur que les maillots, rouge ou bleu ».
- **Socles** : anneau bleu sous tes joueurs, rouge sous les adversaires (avant : blanc pour toi) ; le porteur garde son socle doré.
- **Mesure** : nouveau `scripts/mesurer-realisme.ts` (changements de camp et leurs causes, durée et passes par possession, part des possessions qui finissent en tir, tirs, allures). Diagnostic : 43 % des tirs venaient d'un joueur qui recevait au pied hors de la surface puis fonçait dedans en conduite (le porteur avançait toujours de 8 m, même face au bloc), 48 % étaient tirés moins de 1 s après avoir reçu.
- **Construction** (PROPOSITION) : avant bouché (adversaire dans un cône de 14 m devant lui), le porteur ne fonce plus : il temporise, s'écarte de côté de l'adversaire le plus proche, et cherche une passe (seuil baissé : circulation) ; un adversaire à moins de 4 m le fait décider en 0,45 s (passe avant le tacle). Passe dans la surface adverse seulement vers un joueur libre (4 m), voie bien dégagée, et moins tentante. « Seul face au but » : plus personne entre lui et le but (avant : un cône de 18 m suffisait, on fonçait de trop loin), et il lève la tête souvent pour tirer dès qu'il est à portée. Tirs de loin plus rares. Tacles moins fréquents (0,12 par seconde au lieu de 0,2). Rythme un peu plus posé : décision toutes les 1 à 1,8 s (0,6 à 1,2 avant).
- **Allures** (PROPOSITION) : loin de l'action on trotte (plafond 4,2 m/s au lieu de 5,5), zone « près du ballon » de 15 m (20), respiration de 1,2 m (2) ; en contre-attaque, toute l'équipe qui récupère se projette en sprint ; repli rapide dès 2 m devant sa place (défense de couverture).
- **Mesures** (20 matchs de 3 min, Équilibrée contre Équilibrée) : changements de camp 6,7 → 5,4 par minute ; possession 8,7 → 10,6 s et 2,5 → 4 passes ; possessions finies par un tir 35 → 27 % ; tirs par match 8,6 → 5,5 (buts 0,6, inchangé) ; passes réussies 79 → 83 % ; vitesse moyenne 4,3 → 3,9 m/s, sprint 14 → 12 %. Engagements : ballon gardé 6 s 33 fois sur 40.
- **Tactiques** (40 matchs) : signatures gardées. Tiki-taka 62 % de possession, 49 passes, 91 % ; Contre 47 %, le moins de passes (27), 10 m gagnés par passe (6 en Équilibrée), 46 % de ballons longs, bloc le plus bas, tir le plus vite après la récupération ; Pressing : passes adverses réussies 72 % (83 %), récupérations hautes 2,9 (1,7) ; Gegenpressing : 44 % des pertes en jeu reprises en 5 s (31 %).
- Limites : encore 5,4 changements de camp par minute (vrai football : 2 à 4) et 3,9 m/s de moyenne (vrai : environ 2) ; les passes ratées sont maintenant la première cause de perte (1,6 par minute).
- Tests : 107 verts (réglages de couverture et de tempo ajustés pour garder la défense de couverture, la transition offensive et le rythme des passes dans leurs bornes). Vérifié au format téléphone, aucune erreur.

## 12/11/2026 (soir) — Caractéristiques des joueurs : 4 notes, 8 sous-notes

**Décisions du concepteur**
- 4 notes : **Vitesse** (accélération, vitesse de pointe), **Technique** (passe, dribble : protection du ballon et dribble), **Tir** (précision, puissance), **Physique** (**duel** plutôt que tacle, endurance).
- L'**endurance** est une note clé : elle est enregistrée, le moteur l'interprétera plus tard (pas d'effet pour l'instant).
- **Gardien** : 4 caractéristiques à lui, encore à choisir. Pour l'instant, pas de notes (le moteur le traite comme un gardien moyen, 65).

**Ce qui a été fait** (PROPOSITION, chiffres dans `src/data/notes.json`)
- `src/sim/notes.ts` : sous-notes sur 99, note affichée = moyenne des deux sous-notes ; une sous-note absente vaut 65. Règle unique : on compare la sous-note de l'un à celle de l'adversaire direct ; une probabilité est décalée sur sa cote (logit) de l'écart ÷ 15 (+10 points ≈ 50 → 66 %, +20 ≈ 79 %) ; un taux est multiplié par exp(écart × coefficient). **À 65 partout, le moteur est inchangé** (vérifié par un test : même match, mêmes statistiques, mêmes positions).
- Branchements :
  - Vitesse : pointe ± 0,6 % de vitesse par point (90 → 9,2 m/s en sprint au lieu de 8), accélération ± 1 % par point ; l'écart aléatoire de ± 6 % reste par-dessus. Sert aussi aux passes dans l'espace et au jeu long (qui arrive le premier).
  - 1 contre 1 : avantage = dribble du porteur − duel du défenseur + ½ écart d'accélération ; il décide de la réussite du dribble et donne plus envie de le tenter.
  - Passe : imprécision des passes, centres, ballons longs et dégagements ; passe bien dosée plus dure à intercepter.
  - Dribble : aussi le contrôle quand on est serré (contre le duel de l'adversaire le plus proche) et les tacles subis.
  - Tir : précision (erreur de visée), puissance (vitesse du tir, et chances d'arrêt contre le gardien à 65).
  - Duel : taux de tacle (contre le dribble du porteur), fautes (un défenseur dépassé en fait plus), portée sur le ballon (interceptions, ballons disputés, têtes).
- Joueurs de démonstration notés dans `preparation.json` (profils variés selon le poste et le style ; gardien sans notes). L'adversaire du prototype n'a pas de notes : c'est une équipe moyenne à 65.
- Écran de préparation : en touchant un joueur, son nom, son style et ses 4 notes (« VIT 71 · TEC 63 · TIR 75 · PHY 75 » ; gardien : « notes à venir »). Sous le joueur quand il n'y a pas la place au-dessus.

**Mesures** (`bun run scripts/mesurer-notes.ts 120 180` : 120 matchs de 3 min par ligne, adversaire à 65, Équilibrée, styles coupés)

| Notre équipe | V / N / D | Buts | Possession | Passes réussies | Tirs | Dribbles réussis | Changements de camp / min |
|---|---|---|---|---|---|---|---|
| Sans notes (65) | 23 / 57 / 20 % | 0,3 – 0,3 | 52 % | 83 % | 2,5 – 2,2 | 53 % | 5,8 |
| 60 partout | 15 / 68 / 18 % | 0,2 – 0,2 | 47 % | 79 % | 1,7 – 2,8 | 37 % | 5,7 |
| 70 partout | 24 / 62 / 14 % | 0,4 – 0,3 | 53 % | 84 % | 3,0 – 1,9 | 59 % | 5,7 |
| 75 partout | 43 / 53 / 5 % | 0,6 – 0,1 | 55 % | 85 % | 3,7 – 1,4 | 74 % | 5,5 |
| 80 partout | 68 / 27 / 5 % | 1,0 – 0,1 | 57 % | 87 % | 4,4 – 0,9 | 82 % | 5,3 |
| Vitesse 80 seule | 28 / 63 / 10 % | 0,4 – 0,1 | 52 % | 84 % | 3,5 – 1,7 | 62 % | 5,9 |
| Technique 80 seule | 24 / 58 / 18 % | 0,3 – 0,2 | 55 % | 86 % | 3,3 – 1,9 | 75 % | 5,0 |
| Tir 80 seule | 38 / 48 / 14 % | 0,6 – 0,2 | 51 % | 83 % | 2,5 – 2,2 | 50 % | 5,7 |
| Duel 80 seule | 18 / 68 / 14 % | 0,2 – 0,2 | 53 % | 83 % | 3,0 – 1,7 | 47 % | 5,9 |

- Chaque note a une signature : Vitesse, plus de tirs et moins de buts encaissés ; Technique, possession, passes et dribbles, **moins de va-et-vient** (5,0 changements de camp par minute) ; Tir, deux fois plus de buts pour le même nombre de tirs ; Duel, moins de tirs adverses.
- Une équipe à 80 partout gagne 2 matchs sur 3 contre une équipe à 65, mais concède encore des nuls et quelques défaites.
- « Une star » (ailier gauche à 90 en Vitesse face à un latéral droit à 55) : 9,2 m/s de pointe au lieu de 8, dribbles réussis 1,1 par match au lieu de 0,7, tirs dans les 8 s qui suivent ses ballons 1,6 au lieu de 1,3. Effet visible mais modeste : le moteur ne cherche pas encore l'ailier rapide (le choix des passes ne tient pas compte des duels favorables).
- Premier essai, sans « envie de dribbler » et avec des effets plus faibles : Tir 80 ne changeait presque rien (conversion 12 → 14 %), le test « une star » non plus. Coefficients relevés (précision 0,025 → 0,04, poids de la puissance contre le gardien 0,5 → 1, pointe 0,004 → 0,006, accélération 0,008 → 0,01, passe 0,025 → 0,03 et interceptions).

**Tests** : 112 verts (5 nouveaux dans `tests/notes.test.ts` : 4 notes de 2 sous-notes, décalage nul à écart nul, 65 partout = match identique, vitesse, équipe à 80 qui tire plus et passe mieux).

**À juger par le concepteur** : est-ce que la différence se voit en regardant un match ; écart souhaité entre une équipe à 75 et une à 65 ; place du hasard (beaucoup de 0-0 sur 3 minutes de jeu).

**Ouvert** : les 4 caractéristiques du gardien ; effet de l'endurance ; points donnés par un niveau de carte et par une fusion ; note globale selon le poste (proposée, pas codée) ; styles qui gardent leurs bonus de précision et de vitesse (proposé de les retirer, pas encore décidé).

## 12/11/2026 (nuit) — Buts, pauses, vitesse, fatigue et fiche joueur

**Demandes du concepteur** : pas assez de buts ; le jeu reprend avant que l'annonce (touche, coup franc…) disparaisse ; « la vitesse d'un joueur, c'est super important » ; l'endurance fait ralentir les joueurs au bout de 30 minutes d'affilée et de 60 minutes au total ; une fiche joueur « à la Clash Royale », jolie, avec le détail.

**Ce qui a été fait** (chiffres en PROPOSITION)
- **Pauses** : pause avant une remise en jeu 3,2 à 3,8 s de jeu (0,8 à 1,4 avant), 7 s au moins entre un but et l'engagement (`attenteButS`). Les annonces durent maintenant en temps de jeu (2,5 s, 5,5 s pour un but) : elles disparaissent avant la reprise, quelle que soit la vitesse d'affichage.
- **Fatigue** (`simulation.ts`, chiffres dans `notes.json` → `endurance`) : au-delà de 30 minutes d'affilée (la mi-temps en cours) et de 60 minutes au total, perte de vitesse et d'accélération de 0,2 % par minute de dépassement (les deux s'ajoutent), × exp(−(endurance − 65) × 0,04), au plus 25 %. Fin de match : endurance 40 → −24 %, 65 → −9 %, 90 → −3 %. La mi-temps efface la fatigue « d'affilée ». 45 minutes = 180 s simulées.
- **Vitesse** : pointe ± 0,8 % par point (90 → 9,6 m/s en sprint, 40 → 6,4), accélération ± 1,2 % ; en 1 contre 1, l'accélération compte pour 0,8 (0,5 avant). Le moteur **cherche les duels de vitesse** : passe vers l'avant plus tentante vers un coéquipier plus rapide que son adversaire direct, appel en profondeur donné au plus rapide face à son défenseur.
- **Buts** : 41 % des tirs étaient contrés. Un défenseur sur la trajectoire ne touche plus le tir qu'une fois sur deux (`tir.contreProba`) ; tirs plus précis (erreur 1,2 m + 0,11 m par mètre, au lieu de 2,2 + 0,16) ; gardien un peu moins fort (arrêt 0,65 au plus, 0,2 au moins, au lieu de 0,9 et 0,3) ; un peu plus de tirs de loin et de passes dans la surface.
  - Avant : 0,9 but, 8,4 tirs par match (deux mi-temps), 10 % de conversion, 41 % de tirs contrés. Après : **2,4 buts**, 8,1 tirs, 29 % de conversion ; tirs : 32 % but, 24 % arrêt, 24 % à côté, 20 % contré (60 matchs à 65 partout).
- **Fiche joueur** (`src/ui/fiche.ts`) : toucher un joueur (terrain ou banc) ouvre sa fiche ; au mercato, un petit « i » sur chaque carte. En-tête aux couleurs du pays (nom, poste, style, fusion), buste qui déborde, 4 notes avec leur pictogramme et leur couleur, valeur dans une pastille (violet 80+, vert 70+, jaune 60+, rouge dessous), 2 sous-notes en barres animées. Gardien : « ses 4 notes arrivent bientôt ».
- Mesures : `scripts/mesurer-notes.ts` joue maintenant des matchs complets (deux mi-temps, fatigue comprise).

**Mesures** (80 matchs complets par ligne contre une équipe à 65, Équilibrée, styles coupés)

| Notre équipe | V / N / D | Buts | Tirs | Passes réussies |
|---|---|---|---|---|
| Sans notes (65) | 29 / 26 / 45 % | 1,0 – 1,4 | 3,7 – 4,1 | 83 % |
| 60 partout | 9 / 33 / 59 % | 0,6 – 1,6 | 2,8 – 5,3 | 80 % |
| 70 partout | 61 / 16 / 23 % | 1,8 – 0,9 | 4,8 – 3,3 | 83 % |
| 75 partout | 76 / 18 / 6 % | 2,7 – 0,8 | 5,7 – 2,7 | 86 % |
| 80 partout | 90 / 4 / 6 % | 3,4 – 0,7 | 6,9 – 2,5 | 87 % |
| Vitesse 80 seule | 63 / 19 / 19 % | 1,6 – 0,7 | 5,3 – 2,8 | 84 % |
| Technique 80 seule | 40 / 31 / 29 % | 1,3 – 1,1 | 5,1 – 3,9 | 86 % |
| Tir 80 seule | 46 / 25 / 29 % | 1,7 – 1,3 | 3,5 – 4,5 | 82 % |
| Duel 80 seule | 43 / 30 / 28 % | 1,5 – 1,2 | 4,2 – 3,8 | 83 % |

- Avec plus de buts, les notes pèsent beaucoup plus sur le résultat. La Vitesse est désormais la note la plus décisive (63 % de victoires à 80 contre 29 %).
- Ailier star (90 en Vitesse contre un latéral à 55) : 10,4 ballons dans le camp adverse au lieu de 8,3, 5 dribbles par match (4,1 réussis) au lieu de 2 (1,2), 9,6 m/s de pointe.
- « Sans notes » n'est pas à 50 % : les deux compositions de test ne sont pas symétriques.
- **Point de vigilance** : à 80 contre 65, 90 % de victoires. Si c'est trop, on réduit l'échelle (15 → 20) sans toucher au reste.

**Tests** : 113 verts. Nouveau : fatigue (rien avant 30 min ; à la 89e, endurance 40 bien plus fatiguée qu'endurance 90). Modifiés : les signatures des tactiques sont mesurées sur 24 matchs au lieu de 12 (le Gegenpressing tombait à +4 points au lieu de +5 sur 12 matchs, du bruit) ; passes par minute < 18 au lieu de 16 (plus de passes vers la surface).

## 13/11/2026 (nuit) — Mercato au toucher, vue Action plus fluide, buteurs

**Retours du concepteur** : au mercato, impossible de voir les notes avant d'acheter (« un clic, je vois les notes ; en restant appuyé, je peux les bouger ») ; en match, autour du ballon, certains joueurs restent en rond (« pas trop fluide ») ; à la mi-temps et à la fin, il faut le nom des buteurs. Ensuite : les fusions, et le plan global des cartes et du mercato.

**Ce qui a été fait**
- **Mercato** : toucher une carte ouvre sa fiche, avec un gros bouton « Recruter · prix » (ou « Fusionner », ou la raison si c'est impossible : pas assez de pièces, banc plein…). Rester appuyé soulève la carte : lâchée sur le banc, achat ; sur une case libre, achat et placement (si moins de 11 sur le terrain) ; sur un joueur, achat et remplacement (le joueur remplacé va sur le banc) ; sur sa copie, fusion. Hors poste : refusé, rien n'est acheté. Le petit « i » est retiré. Nouvelle action `achat` dans `preparation.ts`, test ajouté.
- **Vue Action** : un joueur passe en figurine **tout de suite** dès qu'il est à moins de 16 m du ballon ou du centre de l'action (12 m avant, et il fallait attendre 1,6 s dans son état) ; il ne redevient pion qu'après 1,2 s à plus de 25 m des deux. **Fondu croisé** : la figurine grandit depuis le socle pendant que le pion s'efface (avant : le pion disparaissait d'un coup, puis la figurine apparaissait).
- **Buteurs** : le moteur note chaque but (équipe, buteur = dernier à avoir touché le ballon, contre son camp, minute). Le panneau de mi-temps et de fin de match les affiche sous le score, de chaque côté (« ⚽ 23' Roux »). Test ajouté.

**Tests** : 115 verts.
