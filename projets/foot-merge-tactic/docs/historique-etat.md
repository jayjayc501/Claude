# Historique retiré de CLAUDE.md (12/11/2026)

Anciens « Points de vigilance », « Première mission » et « État », déplacés ici pour alléger le contexte relu à chaque séance.

## Points de vigilance (analyse Claude, non validés)

1. ~~10 s de jeu par mi-temps, c'est très peu.~~ Réglé : montage accéléré à vitesse variable. Reste à régler le temps simulé et les vitesses.
2. **Matchs courts = beaucoup de hasard.** Le temps de football simulé par mi-temps est le curseur : plus il y a d'actions simulées, plus la meilleure équipe est avantagée. À mesurer dès les premiers tests d'équilibrage.
3. **Interface de préparation et de mi-temps.** Le temps est allongé, mais il faut toujours des gestes simples (glisser pour fusionner ou placer). Tester l'interface tôt.
4. ~~La boucle d'un tournoi n'est pas décrite.~~ Réglé : deck de nationalités et mercato à la Merge Tactics. Reste le **nom** : « Foot Merge Tactic » est trop proche de « Merge Tactics » (Supercell). À changer avant toute publication.
5. ~~La profondeur tactique dépend d'une règle floue.~~ Réglé : sous-zones dans des rectangles fixes et plusieurs joueurs par poste.
6. **Fusion « meilleure valeur de chaque statistique »** entre postes opposés (gardien + attaquant, par exemple) : quels postes naturels pour l'hybride, sachant qu'un joueur en a au plus 2 ? Risque de joueurs bons partout.
7. **Hors-jeu et coups de pied arrêtés.** Avec le montage, ils peuvent être simulés puis passés à l'écran, mais il faut décider de leurs règles. Le dossier demande d'éviter les attaquants toujours hors-jeu, donc le hors-jeu semble prévu : à confirmer.
8. **Progression et équité.** Avec des niveaux de cartes comme dans Clash Royale, affronter des cartes plus hautes est frustrant, surtout en direct. Prévoir un appariement selon le niveau ou un plafond en tournoi.


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
- 11/11/2026 (suite) : retours du concepteur sur le prototype 1 : interface trop longue (2 à 3 écrans), zones trop chevauchantes à l'écran, jeu trop figé, latéral placé haut qui ne revient pas défendre. Référence football écrite (`docs/reference-football.md`). Règles de projection refaites (défense par lignes, bloc qui suit le ballon, ligne du hors-jeu, évitement anticipé) avec 7 tests de réalisme ; 30 tests verts. Nouveau découpage décidé (DC 6, milieu 9, attaque 6), pas encore appliqué.
- 11/11/2026 (suite) : retour du concepteur, « en défense les joueurs se resserrent trop dans l'axe, 0 largeur ». Mesuré : lignes de 30 m, équipe de 31 m, contraire à la référence (environ 40 m). Corrigé : lignes d'environ 40 m, équipe d'environ 42 m, coulissement ramené à 45 %. Le test de réalisme vérifie maintenant aussi une largeur minimale. Prochaine étape : interface sur un seul écran et nouveau découpage des cases.
- 11/11/2026 (suite) : commits directs pour le prototype (accord du concepteur). Nouveau découpage appliqué (DC 6, milieu 9, attaque 6 ; case de l'axe à cheval sur la gauche et la droite ; grandes zones qui ne se chevauchent presque plus). Écrans de placement et de match sur une page (banc en ronds, glisser-déposer pour entrer et sortir). 33 tests verts. Le concepteur a montré le plateau d'hexagones de Merge Tactics comme modèle de découpage clair : piste d'un quadrillage unique en hexagones proposée, à valider.
- 11/11/2026 (suite) : retour du concepteur, « gros problème de placement durant le match » (défense adverse dans sa surface, équipe étirée). Cause : nos attaquants se calaient sur la position réelle du dernier défenseur, ce qui le faisait reculer (boucle), et la défense ne suivait pas le ballon en attaque. Attaque refaite par lignes liées au ballon ; 4 tests de réalisme sur de longues possessions. Méthode changée : chaque règle testée dans les deux phases et sur la durée, match regardé dans les trois modes avant chaque publication.
- 11/11/2026 (suite) : plateau en hexagones de couleur et variante en carrés, au choix dans le prototype (demande du concepteur). Faux ballon qui progresse comme une possession. 60 tests verts, sur les deux plateaux. **En attente : le choix du concepteur entre hexagones et carrés.**
- 11/11/2026 (suite) : **hexagones validés** ; cases AG et AD = ailiers (3 hauteurs). Le concepteur met l'interface de côté (base suffisante) : priorité au moteur. **Prochaine étape : son avis sur les déplacements en match (liste de contrôle donnée dans la discussion), puis mission 2 (vrai ballon).**
- 12/11/2026 : retour du concepteur sur les déplacements en match. (1) « Ballon alterné » : à la récupération vers 40 m du but adverse, défense adverse restée vers 19 m de son but, loin de tout, ses milieux et attaquants 15 à 20 m plus haut, nos attaquants pas jusqu'à sa ligne ; « l'équipe doit rester groupée pendant les transitions ». (2) Mouvements « robots », synchronisés à la seconde près. Corrigé : forme d'attaque plus courte (défense 15 m derrière le ballon), bloc défensif plus près du ballon (18 m), ligne qui recule pas à pas, réactions individuelles (les plus proches du ballon d'abord), sprint de transition, perception du ballon avec un petit retard propre à chacun. 6 tests de réalisme sur les transitions et la désynchronisation ; 69 tests verts. Page republiée. **En attente : son avis sur les transitions.** Plus tard, avec le vrai ballon : contre-pressing et contre-attaque.
- 12/11/2026 (suite) : **mission 2, étape 1 : ballon réel** (`src/sim/ballon.ts`) : le ballon est porté ou libre, les joueurs conduisent, passent, tirent ; interception, tacle, gardien, touche, sortie de but, but et remise au centre ; score à l'écran. Décisions simples (passe notée par progression, espace, distance, voie libre ; tir près du but). 77 tests verts. Page republiée. **En attente : son avis sur le jeu avec le vrai ballon.** À régler : trop de tirs et de changements de camp, gardien trop avancé en attaque, pas de hors-jeu ni de corner ; ensuite contre-pressing, appels et démarquages, puis attributs.
