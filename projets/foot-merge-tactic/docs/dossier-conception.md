# DOSSIER DE CONCEPTION --- JEU DE FOOTBALL MOBILE

## Bilan du concept, règles déjà décidées et feuille de route du moteur de match

**Version de travail : 11 novembre 2026**

> **Mise à jour du 11 novembre 2026 :** la séance de questions-réponses
> avec Claude a validé de nouvelles règles et en a modifié certaines
> (durée des phases, format des groupes, placement en sous-zones, une
> seule organisation pour l'instant, deck de nationalités, mercato,
> traits, adversaires). Elles sont rassemblées au
> **§20**. En cas de contradiction avec les sections précédentes, le §20
> prime.

------------------------------------------------------------------------

# 1. Objet de ce document

Ce document rassemble les décisions prises jusqu'ici sur le projet de
jeu de football mobile. Il est destiné à être transmis à un projet
Claude / Claude Code afin de servir de référence de conception et de
base de développement.

**Consigne importante à Claude :** distinguer systématiquement : - les
décisions explicitement validées par le concepteur ; - les propositions
techniques à tester ; - les questions encore ouvertes.

Ne pas transformer une proposition en règle définitive sans validation.
Ne pas inventer de règles manquantes. En cas d'ambiguïté, signaler le
point et proposer une solution argumentée.

La priorité absolue du projet est le **moteur de match**. Les cartes, la
collection, les fusions, les tournois et la progression ne doivent pas
détourner le développement de cette priorité.

------------------------------------------------------------------------

# 2. Vision générale du jeu

Créer un jeu de football mobile qui associe quatre composantes :

1.  **Collection de joueurs fictifs** sous forme de cartes.
2.  **Fusion de joueurs** pour créer des joueurs améliorés ou hybrides.
3.  **Gestion tactique d'une équipe** avec un placement libre et des
    postes de football classiques.
4.  **Matchs courts et tactiques**, simulés automatiquement par un
    moteur de jeu.

Le joueur incarne l'entraîneur et le gestionnaire de son équipe. Il ne
contrôle pas directement chaque footballeur avec un joystick. Il compose
son équipe, choisit les joueurs, définit leur organisation et leurs
consignes, puis observe le moteur exécuter le match.

Le jeu doit être accessible sur mobile, avec des sessions courtes, mais
ne doit pas être simpliste sur le plan tactique.

## Philosophie de conception

Une équipe plus forte doit avoir un avantage, mais ne doit pas gagner
automatiquement.

La tactique, le placement, les caractéristiques individuelles, les
interactions entre joueurs et une part d'incertitude doivent influencer
le résultat.

Principe directeur :

> Une meilleure équipe donne un avantage. Un meilleur entraîneur doit
> avoir une vraie possibilité de faire la différence.

Le résultat ne doit être ni déterminé uniquement par la note globale des
cartes, ni décidé par le hasard.

------------------------------------------------------------------------

# 3. Univers et identité

Décisions déjà retenues :

-   Utiliser les **vrais pays** comme cadre géographique et de
    nationalité.
-   Créer des **clubs fictifs**.
-   Créer des **joueurs fictifs**.
-   Éviter les licences et les éléments protégés : vrais joueurs,
    visages, noms de clubs, logos, maillots ou marques de compétitions.
-   Les postes, les formations, les nationalités et les principes
    généraux du football peuvent être utilisés.

Le projet ne doit pas reprendre un système de divisions hebdomadaires à
la manière de Hattrick. Les pays restent utiles dans l'univers, mais il
n'y a pas de système de divisions de ce type validé.

Le joueur doit pouvoir lancer des matchs quand il le souhaite. Pas de
calendrier hebdomadaire obligatoire, ni de système d'attente qui empêche
de jouer.

------------------------------------------------------------------------

# 4. Priorité n°1 : le moteur de match

Le moteur est la partie la plus importante du jeu.

Un jeu de cartes peut attirer au départ, mais c'est la qualité des
matchs qui déterminera si le jeu est intéressant à long terme.

Le moteur doit produire un football : - compréhensible visuellement ; -
suffisamment crédible ; - rapide ; - tactiquement intéressant ; - varié
d'un match à l'autre ; - capable de faire ressortir les qualités et les
faiblesses des équipes ; - pas entièrement prévisible.

Le projet ne cherche pas à reproduire toute la complexité d'une
simulation professionnelle comme EA SPORTS FC. Il faut une simulation
simplifiée, adaptée au mobile, mais avec de véritables comportements
collectifs.

## 4.1. Vue du match

Orientation envisagée : - vue du dessus, avec l'ensemble du terrain
visible ; - 22 joueurs présents sur le terrain ; - ballon visible ; -
déplacements et actions simulés automatiquement ; - interface lisible
sur écran mobile.

Les joueurs peuvent être représentés au départ par des cercles ou des
marqueurs simples. Il n'est pas nécessaire de créer immédiatement des
modèles 3D ou des animations complexes.

La première version doit prouver que le football simulé fonctionne avant
de chercher à être belle.

## 4.2. Pas de contrôle individuel direct

Le joueur humain ne dirige pas chaque footballeur en temps réel.

Il agit comme entraîneur : - il choisit les joueurs ; - il positionne
les joueurs ; - il définit l'organisation offensive ; - il définit
l'organisation défensive ; - il donne éventuellement des consignes ; -
il effectue des ajustements et remplacements aux moments prévus.

Le moteur gère ensuite les déplacements, les passes, les appels, les
duels, les interceptions, les tirs et les transitions.

------------------------------------------------------------------------

# 5. Système tactique : postes et rectangles de placement

C'est une caractéristique importante du concept.

## 5.1. Les postes restent des postes de football classiques

Chaque joueur possède un poste naturel, ou éventuellement deux postes
naturels.

Exemples : - G : gardien ; - DC : défenseur central ; - DD : défenseur
droit ; - DG : défenseur gauche ; - MDC : milieu défensif central ; - MC
: milieu central ; - MOC : milieu offensif central ; - MD / MG : milieu
droit / gauche ; - AD / AG : ailier droit / gauche ; - AC :
avant-centre.

La liste exacte et les variantes de postes restent à finaliser.

Le poste indique les aptitudes naturelles du joueur et les rôles qu'il
sait occuper. Il ne doit pas imposer une formation classique rigide.

Un joueur peut être positionné dans une zone inhabituelle. Il peut alors
être moins efficace si sa position ne correspond pas à ses aptitudes,
mais il ne doit pas nécessairement devenir inutilisable.

## 5.2. Chaque poste dispose d'un rectangle de référence

Le terrain est organisé en zones de placement.

**Règle validée : chaque poste dispose d'un rectangle prédéfini et
fixe.**

Il ne s'agit pas d'une case exclusive. Le rectangle définit l'espace de
référence dans lequel le joueur est censé évoluer.

Les rectangles : - ont une position définie sur le terrain ; - ont une
largeur et une profondeur définies ; - peuvent être proches ou
partiellement superposés avec ceux d'autres postes ; - peuvent permettre
à plusieurs joueurs d'occuper un même secteur ; - ne constituent pas des
barrières physiques.

Le joueur ne déplace donc pas librement chaque rectangle. Il choisit un
poste / une zone de référence parmi les postes disponibles et le moteur
gère les déplacements à l'intérieur de cette zone.

## 5.3. Les rectangles peuvent se chevaucher

C'est une règle centrale.

Exemple : - le rectangle d'un DC haut peut être partiellement superposé
à celui d'un MC bas ; - un MOC peut partager une partie de son espace
avec un MC haut ; - un ailier peut avoir une zone qui chevauche celle
d'un avant-centre ou d'un milieu excentré.

Le chevauchement permet de construire des organisations tactiques
originales et de créer des surnombres.

Il ne faut pas imposer une seule place par case. Plusieurs joueurs
peuvent se trouver dans une zone commune.

Le moteur doit toutefois éviter que les joueurs se superposent
physiquement ou restent empilés au même endroit. Il doit gérer les
distances, les trajectoires, les espaces et les priorités de
déplacement.

## 5.4. Placement libre dans le cadre des rectangles

> **Précisé le 11/11/2026 (voir §20.4) :** chaque rectangle est découpé en
> sous-zones (par exemple 6 pour DC, 3 pour AG / AD). L'entraîneur place
> chacun de ses joueurs dans une sous-zone. Plusieurs joueurs peuvent
> occuper le même poste, dans la limite d'un maximum par poste.

Le système recherché se situe entre : - une formation classique rigide,
trop limitée ; - un placement totalement libre, qui serait difficile à
organiser et à simuler.

Les rectangles fixes par poste donnent un cadre. Les chevauchements
donnent de la liberté.

Il faut permettre au concepteur du jeu de modifier facilement les
coordonnées et dimensions de chaque rectangle, sans devoir réécrire le
moteur.

------------------------------------------------------------------------

# 6. Deux organisations distinctes : phase offensive et phase défensive

> **En pause depuis le 11/11/2026 (voir §20.8) :** pour l'instant, une
> seule organisation (un seul rectangle par poste). Les deux organisations
> sont jugées trop compliquées et trop longues à régler. Le mouvement du
> bloc selon la possession est confié au moteur.

**Décision validée : il existe deux quadrillages / organisations de
placement distincts.**

Chaque poste possède : - un rectangle de référence en phase offensive
; - un rectangle de référence en phase défensive.

Les deux rectangles d'un même poste peuvent être situés à des endroits
différents.

Exemples : - un joueur peut être placé haut en phase offensive et bas en
phase défensive ; - un attaquant peut presser haut quand l'équipe défend
; - un milieu peut se projeter en attaque et revenir protéger la défense
; - un défenseur peut rester bas en attaque ou avancer davantage selon
l'organisation choisie.

Les rectangles offensifs et défensifs peuvent eux aussi se chevaucher
entre postes.

## 6.1. Passage d'une phase à l'autre

**Décision validée : le changement de phase n'est pas instantané. Il
existe un léger délai de transition.**

À la perte du ballon : - les joueurs ne se téléportent pas vers leur
rectangle défensif ; - ils se replacent progressivement ; - certains
peuvent presser ou contre-presser ; - d'autres peuvent couvrir les
espaces ou protéger l'axe.

À la récupération : - les joueurs se projettent progressivement vers
leur organisation offensive ; - certains peuvent proposer une solution
courte ; - d'autres peuvent faire un appel ou étirer le bloc adverse.

Le temps de transition doit être perceptible mais suffisamment court
pour conserver le rythme du match.

La durée exacte n'est pas encore définie. Elle doit être réglable et
testée.

## 6.2. Pourquoi cette transition est importante

Elle donne une conséquence réelle au placement.

Une équipe qui perd le ballon alors que ses joueurs sont très hauts peut
être vulnérable. Une équipe bien organisée peut se replacer plus vite.
Une équipe qui récupère le ballon peut exploiter les espaces avant que
l'adversaire soit replacé.

Il faut éviter un simple changement instantané de formation à chaque
changement de possession : le déplacement entre les deux organisations
fait partie du jeu.

------------------------------------------------------------------------

# 7. Le rôle du moteur dans les déplacements

Le rectangle de poste est une zone de référence, pas une destination
rigide.

Un joueur ne doit pas rester planté au centre de son rectangle.

Le moteur doit pouvoir déterminer : - sa position actuelle ; - sa
position de référence ; - la position du ballon ; - la position des
coéquipiers ; - la position des adversaires ; - les espaces libres ; -
le contexte de l'action ; - sa consigne éventuelle ; - ses
caractéristiques individuelles.

À partir de ces éléments, il choisit un déplacement cohérent.

Exemples de comportements à développer : - proposer une solution de
passe ; - se démarquer ; - attaquer la profondeur ; - soutenir le
porteur ; - couvrir un partenaire ; - fermer une ligne de passe ; -
presser le porteur ; - revenir défendre ; - conserver une largeur ; - se
rapprocher du ballon ; - libérer une zone pour un coéquipier.

Ces comportements ne sont pas tous nécessairement présents dans le
premier prototype. Ils doivent être ajoutés progressivement.

## 7.1. Éviter les comportements artificiels

Le moteur doit notamment éviter : - les joueurs qui restent immobiles
sans raison ; - les joueurs qui courent tous vers le ballon ; - les
joueurs qui se regroupent en permanence ; - les passes impossibles ; -
les déplacements qui traversent les coéquipiers ; - les attaquants qui
restent hors-jeu en permanence ; - les défenseurs qui abandonnent leur
zone sans raison ; - les joueurs qui changent brutalement de direction
sans logique ; - les joueurs qui ne reviennent jamais défendre.

Les comportements doivent être évalués dans des situations variées, pas
uniquement dans un scénario idéal.

------------------------------------------------------------------------

# 8. Déroulement et durée d'un match

> **Modifié le 11/11/2026 (voir §20.1) :** les mi-temps de jeu restent à
> 10 secondes affichées, sous forme de montage accéléré à vitesse
> variable. La préparation et la mi-temps durent désormais **plus de 10
> secondes** (durée exacte à tester). Le total de 40 secondes ci-dessous
> n'est donc plus valable.

**Durée totale validée : 40 secondes.**

Décomposition : 1. 10 secondes de préparation avant le match :
possibilité de fusion / préparation. 2. 10 secondes de première
mi-temps. 3. 10 secondes de mi-temps : fusions et changements tactiques.
4. 10 secondes de deuxième mi-temps.

Total : **40 secondes par match**, hors éventuels écrans ou temps de
transition entre les matchs.

Le temps exact consacré à la préparation entre deux matchs n'est pas
encore fixé.

La simulation doit être rapide, mais les actions doivent rester
lisibles. Il faudra tester la vitesse d'animation, la vitesse de
déplacement, la durée des passes et les temps de réaction.

La durée de 10 secondes de jeu effectif par mi-temps est une contrainte
forte. Il faut donc un moteur capable de produire des séquences
compréhensibles sans accélérer au point de rendre le match illisible.

------------------------------------------------------------------------

# 9. Principes de simulation footballistique

Le moteur doit combiner plusieurs facteurs.

## 9.1. Caractéristiques individuelles

Les joueurs doivent posséder des caractéristiques qui influencent
réellement les actions.

Liste indicative à définir : - vitesse ; - accélération ; - endurance
; - contrôle de balle ; - passe courte ; - passe longue ; - vision ; -
dribble ; - tir ; - finition ; - puissance ; - duel physique ; - tacle
; - interception ; - placement défensif ; - détente / jeu aérien ; -
réflexes et arrêts pour le gardien.

Ne pas créer immédiatement trop de statistiques. Chaque caractéristique
doit avoir une utilité identifiable dans le moteur.

## 9.2. Tactique et organisation

Le placement et les consignes doivent modifier : - les options de passe
; - les espaces disponibles ; - la densité autour du ballon ; - la
capacité à presser ; - la couverture défensive ; - les possibilités de
contre-attaque ; - la présence dans la surface ; - la largeur et la
profondeur de l'équipe.

La tactique ne doit pas être un simple bonus numérique ajouté à la note
globale.

## 9.3. Part d'incertitude

Le hasard est nécessaire pour éviter que le même scénario donne toujours
le même résultat.

Mais il ne doit pas remplacer la logique footballistique.

Exemples : - une passe peut être ratée ; - un contrôle peut être
imparfait ; - un tir peut être dévié ; - un duel peut être gagné par le
joueur le moins bien noté ; - un gardien peut réussir un arrêt
difficile.

La part exacte de qualité individuelle, de tactique et d'aléatoire n'est
pas décidée. Une ancienne piste évoquait 40 % qualité, 40 % tactique et
20 % aléatoire, mais ce n'est **pas une règle validée**. Ne pas coder
cette répartition comme une vérité sans tests.

## 9.4. Les tactiques doivent avoir des contreparties

Exemples de principes à tester : - pressing haut : possibilité de
récupérer vite, mais espaces dans le dos ; - bloc bas : protection de la
profondeur, mais moins de présence offensive ; - jeu sur les ailes :
création de largeur, mais dépendance aux joueurs excentrés ; - forte
densité axiale : supériorité au centre, mais espaces sur les côtés ; -
joueurs très hauts : plus de solutions offensives, mais transition
défensive plus risquée.

Le moteur doit permettre des contre-tactiques. Aucune tactique ne doit
être systématiquement dominante.

------------------------------------------------------------------------

# 10. Tournois

> **Modifié le 11/11/2026 (voir §20.6) :** les groupes sont des **groupes
> de 4**, complétés par des équipes IA si besoin. Le format à 2 groupes de
> 3 décrit ci-dessous est remplacé. Le nombre de groupes reste à confirmer.

Format déjà décidé :

-   6 équipes ;
-   2 groupes de 3 équipes ;
-   chaque équipe rencontre les deux autres équipes de son groupe une
    seule fois ;
-   les deux premières équipes de chaque groupe se qualifient pour les
    demi-finales ;
-   demi-finale 1 : premier du groupe A contre deuxième du groupe B ;
-   demi-finale 2 : premier du groupe B contre deuxième du groupe A ;
-   les vainqueurs disputent la finale.

Total : 9 matchs dans un tournoi : - 6 matchs de groupes ; - 2
demi-finales ; - 1 finale.

Chaque équipe joue entre 2 et 4 matchs : - élimination en phase de
groupes : 2 matchs ; - élimination en demi-finale : 3 matchs ; -
finaliste vainqueur : 4 matchs ; - finaliste perdant : 4 matchs.

Il n'y a pas de matchs aller-retour.

Les matchs doivent pouvoir être lancés sans attendre un calendrier
hebdomadaire.

------------------------------------------------------------------------

# 11. Cartes et progression des joueurs

Cette partie est moins prioritaire que le moteur, mais les principes
suivants ont été retenus.

## 11.1. Deux formes de progression

Il existe deux niveaux distincts :

### A. Niveau de base permanent

> **Précisé le 11/11/2026 (voir §20.3) :** chaque carte joueur a son propre
> niveau, comme dans Clash Royale. La carte change de couleur quand elle
> évolue en dehors des matchs.

Les joueurs ont une catégorie de base inspirée des cartes de football
: - Bronze ; - Argent ; - Or.

Ces catégories représentent des niveaux de départ naturellement
différents. Tous les joueurs ne commencent pas Bronze pour évoluer
obligatoirement jusqu'à Or.

Les récompenses obtenues dans les tournois peuvent permettre d'augmenter
le niveau de base des joueurs de manière permanente.

Les détails exacts de cette progression restent à définir : - type de
cartes nécessaires ; - ressources ; - progression individuelle ou
collective ; - limites de niveau ; - coût et fréquence des
améliorations.

Ne pas inventer ces règles.

### B. Évolution temporaire pendant un tournoi

Chaque tournoi repart de zéro pour les fusions / évolutions temporaires.

Les améliorations temporaires réalisées pendant un tournoi ne sont pas
conservées après celui-ci.

En revanche, les cartes et récompenses gagnées peuvent améliorer
durablement le niveau de base des joueurs.

------------------------------------------------------------------------

# 12. Fusion de joueurs

La fusion est une mécanique distinctive du projet.

## 12.1. Deux types de fusion à distinguer

### A. Fusion de deux copies du même joueur

Un joueur peut être fusionné avec une copie de lui-même afin d'améliorer
ce joueur.

Un joueur déjà fusionné peut également être fusionné avec une copie de
lui-même.

Cette fusion ne crée pas une nouvelle identité de joueur.

### B. Fusion de deux joueurs différents

Deux joueurs différents peuvent être fusionnés uniquement s'ils ont la
même nationalité.

Le résultat est un joueur hybride.

## 12.2. Limite d'identité

Un joueur hybride ne peut jamais avoir plus de deux identités de joueurs
d'origine dans son ascendance.

Exemple : - Joueur A + joueur B = hybride A/B. - Hybride A/B + copie de
cet hybride = toujours A/B. - Il est interdit d'ajouter un troisième
joueur C pour créer A/B/C.

La nationalité reste celle des deux joueurs d'origine, qui doivent être
de même nationalité.

## 12.3. Apparence et identité de l'hybride

Pistes appréciées par le concepteur : - prénom de l'un et nom de famille
de l'autre, ou combinaison des noms ; - visage visuellement partagé en
deux, avec une moitié provenant de chaque joueur ; - transformation
visuelle de plus en plus spectaculaire au fil des évolutions, dans un
esprit humoristique de montée en puissance.

La transformation peut être spectaculaire, mais doit avoir une identité
graphique originale. Ne pas copier directement une franchise ou un
personnage protégé.

La règle exacte de composition du nom reste à fixer.

## 12.4. Statistiques et bonus

Idée appréciée : - pour chaque caractéristique, retenir la meilleure
valeur des deux joueurs ; - l'hybride hérite des bonus des deux joueurs.

C'est une intention de conception, mais elle pose un risque
d'équilibrage : le cumul du meilleur de chaque statistique et de tous
les bonus pourrait créer des joueurs trop puissants.

Ne pas supprimer cette idée. Étudier plusieurs moyens de préserver son
intérêt tout en gardant un jeu équilibré : - coût ou rareté de la fusion
; - limite de fusions ; - bonus incompatibles ou plafonnés ; -
contreparties ; - opportunité tactique de fusion ; - limites liées à la
catégorie de base.

Présenter les options et leurs conséquences au concepteur avant de
choisir une règle définitive.

------------------------------------------------------------------------

# 13. Architecture technique proposée pour le prototype

Cette partie constitue une recommandation technique, pas une décision
définitive.

## 13.1. Moteur / technologie

Piste recommandée pour le premier prototype : **Godot 4 en 2D**, vue du
dessus.

Pourquoi : - adapté à un terrain vu du dessus ; - permet de gérer des
dizaines d'entités mobiles ; - permet de développer une interface
tactique ; - facilite la création d'un prototype jouable ; - permet
d'envisager ensuite un export mobile.

Claude Code peut aider à écrire le code, structurer les scènes, corriger
les erreurs, créer des tests et automatiser les simulations.

Le choix final du moteur et de la technologie doit être confirmé avant
de lancer un développement important.

## 13.2. Architecture logicielle à privilégier

Séparer clairement les systèmes : 1. **MatchSimulation** : état du
match, temps, possession, score. 2. **Pitch** : dimensions du terrain,
limites, zones. 3. **Player** : caractéristiques, poste, position, état,
fatigue éventuelle. 4. **PositionZone** : rectangle de référence d'un
poste. 5. **TeamTactics** : organisations offensive et défensive,
consignes. 6. **TransitionManager** : passage progressif entre les deux
phases. 7. **PlayerAI** : choix de comportement et de déplacement. 8.
**BallController** : possession, trajectoire, passe, tir, interception.
9. **ActionResolver** : résolution des passes, contrôles, duels et tirs.
10. **MatchEvents** : événements lisibles et journal du match. 11.
**MatchStats** : statistiques utiles pour l'équilibrage. 12.
**TestHarness** : simulation automatisée et comparaison de scénarios.

Éviter un seul gros fichier qui gère tout.

Les dimensions du terrain, les zones, les statistiques et les paramètres
de simulation doivent être configurables dans des fichiers de données ou
des ressources, plutôt que codés en dur partout.

## 13.3. Simulation et rendu séparés

Il est préférable de séparer : - la logique de simulation ; -
l'affichage graphique ; - les animations.

Le moteur doit pouvoir simuler des matchs sans devoir afficher chaque
image à l'écran. Cela permettra de lancer des centaines ou milliers de
matchs automatiquement pour les tests.

Le rendu visuel doit ensuite représenter fidèlement l'état du moteur.

Prévoir une graine aléatoire contrôlable pour pouvoir reproduire un
match et analyser un problème.

------------------------------------------------------------------------

# 14. Plan de développement recommandé

Le développement doit être progressif. Ne pas construire tout le jeu en
une fois.

## Phase 1 --- Terrain et placement

Objectif : vérifier que le système de zones fonctionne.

À développer : - terrain vu du dessus ; - dimensions et repères ; - 22
marqueurs de joueurs ; - postes ; - rectangles de référence par poste
; - rectangles offensifs et défensifs ; - chevauchements visibles ; -
possibilité de placer plusieurs joueurs dans une zone commune ; - aperçu
des deux organisations.

Critères de validation : - les rectangles sont correctement positionnés
; - les chevauchements sont possibles ; - les postes restent
identifiables ; - le placement est lisible ; - les joueurs ne sont pas
obligés de suivre une formation classique.

À ce stade, le ballon et les actions peuvent être absents.

## Phase 2 --- Déplacements et transitions

Objectif : faire vivre les 22 joueurs.

À développer : - déplacements vers une position de référence ; -
déplacement à l'intérieur du rectangle ; - gestion des distances entre
coéquipiers ; - évitement des collisions ; - perte et récupération du
ballon simulées simplement ; - transition progressive entre rectangles
offensifs et défensifs.

Critères de validation : - les joueurs ne se téléportent pas ; - les
transitions sont fluides ; - les joueurs ne restent pas tous immobiles
; - les joueurs ne se regroupent pas tous sur le ballon ; - le placement
conserve une cohérence collective.

## Phase 3 --- Ballon et actions fondamentales

Objectif : obtenir une première séquence de football.

À développer : - ballon ; - porteur du ballon ; - passe courte ; - passe
longue ; - contrôle ; - interception ; - duel ; - tir ; - arrêt du
gardien ; - changement de possession.

Critères de validation : - les passes ont une cible cohérente ; - les
joueurs se rendent disponibles ; - les interceptions sont
compréhensibles ; - les tirs ne sont pas déclenchés de manière absurde
; - le gardien intervient de façon crédible.

## Phase 4 --- Intelligence collective

Objectif : obtenir des comportements tactiques.

À développer progressivement : - appels ; - démarquages ; - soutien au
porteur ; - couverture ; - pressing ; - contre-pressing ; - largeur ; -
profondeur ; - replacement ; - gestion des espaces ; - occupation de la
surface.

Critères de validation : - les joueurs réagissent au ballon et aux
adversaires ; - les joueurs se complètent ; - les espaces créés par le
placement ont des conséquences ; - les choix tactiques modifient
réellement les séquences.

## Phase 5 --- Caractéristiques individuelles et équilibre

Objectif : faire ressentir les différences entre joueurs.

Ajouter les caractéristiques une par une ou par petits groupes.

Pour chaque statistique : - expliquer quelle action elle influence ; -
définir son effet ; - créer des tests comparatifs ; - vérifier qu'elle
n'écrase pas toutes les autres.

Un joueur rapide doit avoir un avantage dans certaines situations, mais
ne doit pas automatiquement gagner tous les duels ou réussir toutes les
actions.

## Phase 6 --- Match de 40 secondes

Intégrer le déroulement complet : - 10 secondes de préparation ; - 10
secondes de première période ; - 10 secondes de mi-temps ; - 10 secondes
de deuxième période.

Ajouter l'interface de mi-temps et les possibilités de changements /
fusions lorsqu'elles seront définies.

## Phase 7 --- Présentation mobile

Une fois le moteur convaincant : - interface mobile ; - cartes ; -
animations ; - effets visuels ; - sons ; - écrans de résultat ; -
tournoi ; - progression.

Ne pas investir trop tôt dans les graphismes définitifs.

------------------------------------------------------------------------

# 15. Laboratoire de test automatisé

Claude Code ne doit pas seulement écrire du code. Il doit pouvoir lancer
des tests répétables et exploiter leurs résultats.

Construire un environnement de test qui permette de simuler des matchs
sans intervention humaine.

## 15.1. Tests techniques

Vérifier automatiquement : - qu'aucun joueur ne sort des limites du
terrain ; - que les positions restent cohérentes ; - que les joueurs ne
se téléportent pas ; - que le ballon conserve un état valide ; - que les
possessions changent correctement ; - que les tirs et passes sont
résolus ; - que le match se termine correctement ; - que le temps total
respecte les règles ; - que les transitions sont déclenchées au bon
moment.

## 15.2. Tests tactiques

Créer des équipes identiques en qualité, mais avec des organisations
différentes.

Comparer par exemple : - bloc haut contre bloc bas ; - équipe très
resserrée contre équipe très large ; - densité axiale contre jeu sur les
ailes ; - joueurs offensifs très hauts contre organisation prudente ; -
pressing haut contre jeu direct dans la profondeur.

Le but est de vérifier que les tactiques produisent des effets
observables et des contreparties.

## 15.3. Tests d'équilibrage

Simuler un grand nombre de matchs avec : - équipes de force égale ; -
équipe légèrement supérieure contre équipe inférieure ; - équipe
nettement supérieure contre équipe inférieure ; - mêmes équipes avec des
tactiques différentes ; - mêmes tactiques avec des joueurs différents.

Mesures à collecter : - victoires / nuls / défaites ; - buts ; - tirs
; - tirs cadrés ; - occasions ; - passes réussies ; - pertes de balle
; - interceptions ; - récupérations ; - possession ; - temps passé dans
chaque tiers du terrain ; - temps de transition ; - efficacité du
pressing ; - nombre d'actions incohérentes.

Ne pas fixer de pourcentages de victoire arbitraires avant d'avoir des
résultats. Définir des plages cibles à partir des premiers prototypes,
puis les faire valider.

## 15.4. Tests reproductibles

Chaque test doit pouvoir être rejoué avec : - les mêmes équipes ; - les
mêmes placements ; - les mêmes consignes ; - la même graine aléatoire.

Cela permet de comparer précisément deux versions du moteur.

## 15.5. Ce que Claude peut faire et ce qu'il ne peut pas juger seul

Claude Code peut : - écrire et modifier le moteur ; - lancer le jeu dans
un environnement configuré ; - lancer des tests automatisés ; - simuler
des centaines ou milliers de matchs ; - analyser les statistiques ; -
repérer des anomalies ; - corriger le code ; - relancer les tests ; -
produire des rapports avant / après.

Mais les statistiques ne suffisent pas à juger si un match est plaisant
ou ressemble au football.

Il faut aussi : - observer des matchs réels générés par le moteur ; -
examiner des captures ou enregistrements ; - repérer les comportements
visuellement absurdes ; - demander au concepteur de valider la qualité
du résultat.

Claude ne doit jamais déclarer le moteur « bon » uniquement parce que
les tests passent ou que les statistiques semblent équilibrées.

------------------------------------------------------------------------

# 16. Règles de travail à donner à Claude Code

1.  Travailler par étapes courtes et validables.
2.  Ne pas créer immédiatement le jeu complet.
3.  Commencer par le terrain, les postes et les rectangles.
4.  Ne pas remplacer le système de rectangles fixes par un système de
    placement entièrement libre.
5.  Respecter les deux organisations : offensive et défensive.
6.  Respecter les chevauchements entre rectangles.
7.  Respecter le délai de transition entre les phases.
8.  Ne pas imposer de formation classique rigide.
9.  Garder les postes naturels des joueurs.
10. Séparer la simulation, l'IA, les données et le rendu.
11. Ajouter des tests à chaque étape.
12. Fournir des rapports lisibles et expliquer les choix techniques.
13. Ne pas faire de refonte massive sans expliquer pourquoi.
14. Ne pas ajouter de fonctionnalité non demandée simplement parce
    qu'elle semble intéressante.
15. Signaler les décisions de conception qui manquent au lieu de les
    inventer.
16. Conserver un historique des changements et des résultats de tests.
17. Après chaque étape, fournir une version exécutable et les
    instructions pour la lancer.
18. Préserver la possibilité de modifier les rectangles, les postes, les
    attributs et les paramètres sans réécrire le moteur.

------------------------------------------------------------------------

# 17. Décisions validées et éléments encore ouverts

## Décisions validées

-   Jeu de football mobile avec cartes, fusions et matchs tactiques.
-   Pays réels, clubs et joueurs fictifs.
-   Pas de divisions hebdomadaires à la Hattrick.
-   Matchs jouables à tout moment.
-   ~~Match de 40 secondes : 10 + 10 + 10 + 10.~~ Remplacé le 11/11/2026 :
    mi-temps de 10 s affichées (montage accéléré à vitesse variable),
    préparation et mi-temps de plus de 10 s (voir §20.1).
-   ~~Tournoi de 6 équipes, 2 groupes de 3, demi-finales et finale.~~
    Remplacé le 11/11/2026 : groupes de 4, complétés par des IA si
    besoin, puis demi-finales et finale (voir §20.6).
-   Pas d'aller-retour.
-   ~~Chaque équipe joue entre 2 et 4 matchs.~~ À recalculer avec les
    groupes de 4 (voir §20.6).
-   Vue du dessus envisagée, 22 joueurs visibles.
-   Le joueur est entraîneur, pas contrôleur individuel des joueurs.
-   Postes classiques de football.
-   Un joueur peut avoir un ou deux postes naturels.
-   Chaque poste possède un rectangle de placement fixe.
-   Les rectangles peuvent se chevaucher partiellement.
-   Plusieurs joueurs peuvent occuper une zone commune.
-   Deux organisations distinctes : offensive et défensive.
-   Chaque poste a un rectangle offensif et un rectangle défensif.
-   Passage progressif entre les deux organisations, avec un léger
    délai.
-   Le moteur gère les déplacements et les comportements.
-   Une équipe plus forte doit être avantagée, mais pas assurée de
    gagner.
-   Progression permanente de base Bronze / Argent / Or.
-   Évolution / fusion temporaire remise à zéro à chaque tournoi.
-   Fusion possible entre deux joueurs de même nationalité.
-   Fusion possible entre deux copies du même joueur.
-   Un hybride ne peut jamais avoir plus de deux joueurs d'origine.
-   L'hybride conserve la nationalité commune.
-   Pistes appréciées : combinaison des noms, visage partagé, meilleure
    statistique de chaque joueur, cumul des bonus.
-   Décisions ajoutées le 11/11/2026 : voir la liste complète au §20.

## Éléments non encore décidés

Liste d'origine ci-dessous. Elle est mise à jour au §20.7 : certains
points sont tranchés, d'autres ont été ajoutés.


-   Moteur technique final (Godot 4 est une proposition).
-   Dimensions exactes du terrain.
-   Nombre exact de lignes et de colonnes du quadrillage de référence.
-   Coordonnées et dimensions de chaque rectangle.
-   Liste finale des postes.
-   ~~Possibilité de déplacer les rectangles eux-mêmes ou seulement de
    choisir les zones prédéfinies.~~ Tranché le 11/11/2026 : les
    rectangles ne bougent pas, l'entraîneur place ses joueurs dans des
    sous-zones (§20.4).
-   Comportement exact de chaque poste.
-   Liste et nombre de caractéristiques.
-   Liste finale des consignes tactiques.
-   Durée exacte du délai de transition.
-   Règles détaillées de hors-jeu, fautes, touches, corners et coups
    francs.
-   Nombre de joueurs remplaçants.
-   Fatigue et endurance pendant un match.
-   Influence chiffrée des qualités, de la tactique et du hasard.
-   Règles d'équilibrage des fusions.
-   Ressources et récompenses permettant d'améliorer les niveaux de
    base.
-   Détails de l'interface et des graphismes définitifs.

------------------------------------------------------------------------

# 18. Première mission recommandée à Claude Code

Ne pas commencer par créer les cartes, les tournois ou le système de
fusion.

La première mission doit être :

> Créer un prototype technique en Godot 4, en 2D vue du dessus,
> affichant un terrain de football et deux équipes de 11 marqueurs.
> Chaque joueur possède un poste. Chaque poste dispose d'un rectangle de
> référence fixe en phase offensive et d'un autre en phase défensive.
> Les rectangles peuvent se chevaucher. Plusieurs joueurs peuvent
> partager une zone. Le prototype doit afficher les deux organisations
> et permettre de passer de l'une à l'autre avec un léger délai. Les
> joueurs doivent se déplacer progressivement vers leur zone de
> référence, sans téléportation. Les rectangles doivent être visibles et
> modifiables facilement dans les données. À ce stade, il n'est pas
> nécessaire de simuler les passes ou les tirs.

> **Complément du 11/11/2026 (§20.4) :** chaque rectangle est découpé en
> sous-zones (6 pour DC, 3 pour AG / AD ; les autres postes à définir
> dans les données). Chaque joueur est placé dans une sous-zone, et
> plusieurs joueurs peuvent occuper le même poste dans la limite d'un
> maximum par poste (par exemple 3 DC, 1 AG). Le prototype doit afficher
> les sous-zones et permettre de tester plusieurs placements, par exemple
> avec 3 DC.

> **Complément du 11/11/2026, suite (§20.8) :** pour l'instant, une seule
> organisation : un seul rectangle par poste, plus grand et plus
> chevauchant. Sous-zones : G 2, DC 6, DD et DG 2 ou 3, milieu central 6
> (MDC, MC, MOC, à gauche ou à droite), AD et AG 3, attaquant 5 dont 1
> devant le but. La bascule entre deux organisations est remplacée par un
> mouvement automatique du bloc selon la possession simulée
> [PROPOSITION].

### Critères de réussite de cette première mission

-   Le terrain est lisible.
-   Les 22 joueurs sont affichés.
-   Chaque joueur est associé à un poste.
-   Les rectangles offensifs et défensifs sont visibles.
-   Les chevauchements fonctionnent.
-   Le passage entre les phases est progressif.
-   Les joueurs se déplacent sans se téléporter.
-   Les positions et dimensions des rectangles sont configurables.
-   Le prototype se lance et peut être testé facilement.
-   Claude fournit une explication de l'architecture et les instructions
    pour relancer le projet.

**Ne pas passer à la deuxième mission tant que cette première base n'est
pas validée visuellement et techniquement.**

------------------------------------------------------------------------

# 19. Vision finale

Le but est de créer un jeu dans lequel le joueur ne choisit pas
simplement une formation et quelques bonus.

Il construit une organisation tactique personnelle : - les postes
définissent les aptitudes ; - les rectangles définissent les espaces de
référence ; - les chevauchements permettent les combinaisons ; - les
deux phases permettent de penser l'équipe avec et sans ballon ; - les
transitions donnent une conséquence aux choix ; - les joueurs
interprètent les consignes grâce au moteur ; - les caractéristiques
individuelles influencent la réussite des actions.

Le moteur doit donner l'impression que l'équipe joue au football et non
qu'elle déplace des pions sur un plateau.

**La priorité est de réussir cette sensation avant de développer le
reste du jeu.**

------------------------------------------------------------------------

# 20. Décisions de la séance du 11 novembre 2026

Séance de questions-réponses entre le concepteur et Claude. Statuts :
**[VALIDÉ]** décidé par le concepteur ; **[PROPOSITION]** piste de Claude,
à tester ; **[OUVERT]** reste à décider.

## 20.1. Affichage et durée du match

-   [VALIDÉ] Format court adapté au téléphone : chaque mi-temps de jeu
    dure 10 secondes à l'écran, et le jeu est accéléré.
-   [VALIDÉ] Le match est montré sous forme de **montage accéléré à
    vitesse variable**. Le moteur simule toute la mi-temps en
    arrière-plan. L'écran enchaîne les actions importantes : la
    construction passe très vite, la dernière passe et le tir reviennent
    presque à vitesse réelle.
-   [VALIDÉ] Référence visuelle : le moteur 2D de Football Manager (vue
    du dessus, marqueurs simples). Le joueur doit voir sa tactique.
-   [VALIDÉ] La préparation et la mi-temps durent plus de 10 secondes.
-   [PROPOSITION] Commencer avec 20 à 30 secondes de préparation et de
    mi-temps, soit un match d'environ 1 minute à 1 minute 20.
-   [PROPOSITION] Les facteurs de vitesse sont des réglages dans les
    données, ajustés sur téléphone. Au-delà de 3 à 4 fois la vitesse
    réelle, le ballon risque de devenir difficile à suivre.
-   [PROPOSITION] Choisir des temps forts qui montrent la conséquence des
    choix tactiques (par exemple un but encaissé en transition après un
    bloc trop haut).
-   [OUVERT] Temps de football simulé par mi-temps (ce réglage fixe aussi
    la part de hasard), nombre de temps forts montrés, durée exacte de la
    préparation et de la mi-temps.

Conséquence sur le plan : les phases 1 à 5 ne changent pas. La phase 6
ajoute un module qui sélectionne et monte les temps forts.

## 20.2. Boucle de tournoi : deck, mercato et fusions

-   [VALIDÉ] Reprendre les idées de fusion du mode Merge Tactics de Clash
    Royale (auto-battler de Supercell) : achat de joueurs entre les
    matchs, fusion de copies identiques, bonus de traits.
-   [VALIDÉ] Avant un tournoi, le joueur compose un deck de 4 ou 5
    nationalités. Les joueurs proposés pendant le tournoi viennent de ces
    nationalités.
-   [VALIDÉ] Pour une nationalité donnée, tout le monde a accès aux mêmes
    joueurs. Seuls les niveaux des cartes diffèrent (§20.3).
-   [PROPOSITION] Transposition au football :
    -   un budget de mercato gagné à chaque match (l'équivalent de
        l'élixir) ;
    -   un mercato de 3 joueurs proposés, renouvelés après chaque achat ;
    -   deux copies identiques fusionnent automatiquement ;
    -   les joueurs achetés attendent sur le banc des remplaçants ; on
        peut les revendre ;
    -   placer un joueur, c'est choisir son poste et sa sous-zone
        (§20.4) ;
    -   l'hybride (deux joueurs différents de même nationalité) reste une
        fusion volontaire. C'est la signature du jeu : Merge Tactics ne
        fusionne que des troupes identiques.
-   [PROPOSITION] L'équipe compte 11 joueurs dès le premier match. Le
    mercato sert à remplacer et à fusionner, pas à compléter l'équipe.
-   [PROPOSITION] La tactique se règle avant le tournoi, sans chrono.
    Pendant la préparation et la mi-temps, seulement des ajustements
    rapides : glisser un joueur sur un autre pour fusionner, ou sur une
    sous-zone pour le placer.
-   [OUVERT] Taille de l'effectif de chaque pays (c'est ce réglage qui
    fixe la fréquence des copies, donc des fusions) ; montant du budget ;
    prix des joueurs ; revente.

## 20.3. Cartes et niveaux

-   [VALIDÉ] Chaque carte joueur a son propre niveau, comme dans Clash
    Royale.
-   [VALIDÉ] La carte change de couleur quand elle évolue en dehors des
    matchs. Bronze, Argent et Or deviennent les couleurs du niveau ; tous
    les joueurs ne commencent pas au même niveau (§11.1 A).
-   [PROPOSITION] La couleur montre le niveau permanent ; des étoiles
    montrent les fusions temporaires du tournoi.
-   [OUVERT] Couleurs au-delà de l'Or ; écarts de niveau entre
    adversaires (appariement selon le niveau, ou plafond pendant les
    tournois) ; ressources pour faire évoluer les cartes.

## 20.4. Placement : sous-zones

-   [VALIDÉ] Les rectangles ne bougent pas. Chaque rectangle est découpé
    en sous-zones : 6 pour le défenseur central (DC), 3 pour les ailiers
    gauche et droit (AG / AD).
-   [VALIDÉ] Plusieurs joueurs peuvent occuper le même poste, dans la
    limite d'un nombre maximum par poste (exemple donné : 3 DC, 1 AG).
-   [VALIDÉ] L'entraîneur place chaque joueur dans une sous-zone de son
    rectangle. Le rectangle reste la zone de liberté dans laquelle le
    moteur fait bouger le joueur.
-   [PROPOSITION, choix par défaut non contredits] DC : 3 colonnes sur 2
    lignes (gauche, axe, droite ; haut, bas). AG / AD : 3 sous-zones en
    profondeur (bas, milieu, haut). Un seul joueur par sous-zone. La
    sous-zone choisie vaut à la fois pour le rectangle offensif et pour
    le rectangle défensif.
-   [PROPOSITION] Pour chaque poste, les données décrivent : le rectangle
    offensif, le rectangle défensif, le découpage (colonnes et lignes) et
    le nombre maximum de joueurs. Tout se change sans toucher au moteur.
-   [OUVERT] Découpage et maximum des autres postes ; valeurs définitives
    des maximums.

## 20.5. Traits : nationalité et style de jeu

-   [VALIDÉ] Chaque joueur a deux traits : sa nationalité et un style de
    jeu (sa spécialité).
-   [VALIDÉ] Bonus quand on aligne plusieurs joueurs de même
    nationalité, cohérent avec la tradition de football du pays.
-   [PROPOSITION] Les bonus modifient des comportements du moteur plutôt
    que d'ajouter des points de statistiques (§9.2). Exemples de styles :
    presseur (pressing déclenché plus vite à la perte du ballon),
    technicien (passes courtes plus sûres), rapide (projection et
    contre-attaques plus rapides), rempart (bloc qui se replace plus
    vite), créateur (passes qui cassent les lignes), combatif (duels au
    milieu), finisseur (meilleure conversion des occasions). Certains
    styles peuvent raccourcir le délai de transition.
-   [PROPOSITION] Paliers de bonus à 3, 5 et 7 joueurs, pour les styles
    comme pour la nationalité.
-   [PROPOSITION] Exemples de traditions nationales : pressing pour
    l'Allemagne, technique pour l'Espagne, rigueur défensive pour
    l'Italie. Les joueurs d'un même pays gardent des styles individuels
    variés, pour éviter la caricature et des équipes toutes identiques.
-   [PROPOSITION] Le style est indépendant du poste.
-   [OUVERT] Liste finale des styles et de leurs effets ; style ou styles
    d'un hybride (à traiter avec l'équilibrage des fusions).

Les traits n'arrivent qu'après le moteur de base (phases 4 et 5).

## 20.6. Adversaires et tournoi

-   [VALIDÉ] Les groupes sont des **groupes de 4** (et non de 3),
    complétés par des équipes IA si besoin.
-   [VALIDÉ] Au départ, les adversaires sont des entraîneurs IA (IA de
    jeu). À terme, des adversaires humains **en direct**.
-   [VALIDÉ] Aucune action pendant le match : on agit seulement pendant
    la préparation et la mi-temps.
-   [VALIDÉ] Si un joueur se déconnecte, son équipe reste en l'état
    jusqu'à la fin du tournoi.
-   [PROPOSITION] L'IA joue le rôle d'entraîneur : deck, mercato,
    fusions, placement, ajustements. Elle suit les mêmes règles que le
    joueur, sans tricher. La difficulté vient du niveau des cartes et de
    la qualité des choix.
-   [PROPOSITION] Le joueur et l'IA prennent leurs décisions par la même
    interface, pour pouvoir remplacer l'un par l'autre.
-   [PROPOSITION] En direct, le serveur reçoit les compositions, simule
    le match avec une graine aléatoire et envoie la même séquence aux
    téléphones. Le délai de connexion ne gêne pas, et la triche est
    limitée.
-   Avec des groupes de 4, deux matchs se jouent en même temps dans
    chaque groupe : personne n'attend pendant la phase de groupes.
-   [VALIDÉ] **2 groupes de 4** (8 équipes), puis demi-finales et
    finale. Soit 12 matchs de groupe, 2 demi-finales et 1 finale (15
    matchs). Chaque équipe joue de 3 à 5 matchs, donc de 6 à 10 passages
    par la préparation ou la mi-temps. À revoir plus tard si c'est trop
    long.
-   [OUVERT] Égalités : classement des groupes, matchs nuls en
    demi-finale et en finale.

## 20.7. Questions ouvertes après la séance

Tranchées pendant la séance : ce que représentent les 10 secondes
(§20.1) ; contre qui on joue (§20.6) ; d'où viennent les joueurs et les
copies (§20.2) ; déplacer les rectangles ou non (§20.4) ; plusieurs
joueurs au même poste (§20.4) ; le rectangle défensif est celui du poste,
et la même sous-zone vaut pour les deux rectangles [PROPOSITION].

Encore ouvertes, en plus de celles du §17 et des sections ci-dessus :

-   Équilibrage des fusions : **reporté après le moteur** (décision du
    concepteur). Pistes de Claude déjà présentées, non validées : coût
    naturel (deux joueurs pour un), un poste naturel de chaque joueur
    d'origine, niveau de la plus faible des deux cartes, hybride qui ne
    progresse qu'avec un second hybride identique ; un seul style choisi
    à la fusion. Restent ouverts : postes naturels et style d'un hybride ;
    « hybride A/B + copie de A » est-il autorisé ?
-   Nom définitif du jeu : le titre de travail est trop proche de « Merge
    Tactics » (Supercell). À changer avant toute publication.
-   Modèle économique.

## 20.8. Placement simplifié et priorités (suite de la séance)

-   [VALIDÉ] Pour l'instant, **une seule organisation** : on abandonne
    les deux tactiques à régler (rectangle offensif et rectangle
    défensif), jugées trop compliquées et trop longues. Chaque poste a
    un seul rectangle. Le §6 est en pause.
-   [VALIDÉ] Des rectangles **plus grands** et **plus chevauchants** que
    dans la maquette montrée le 11/11.
-   [VALIDÉ] Nombre de sous-zones (« positions possibles ») par poste :
    -   G : 2 (normal ou un peu avancé) ;
    -   DC : 6 ;
    -   DD et DG : 2 ou 3 (le concepteur hésite) ;
    -   milieu central : 6, qui couvrent MDC, MC et MOC, un peu à gauche
        ou un peu à droite ;
    -   AD et AG : 3 ;
    -   attaquant : 5, dont 1 devant le but.
-   [VALIDÉ] Plus tard, des consignes d'équipe (« volontés ») : plus
    défensive, plus offensive, jeu en contre, etc. Pas maintenant.
-   [VALIDÉ] Priorités immédiates : un moteur jouable ; pouvoir choisir
    les joueurs qui jouent et les placer ; un jeu équilibré ; un rendu
    intéressant. Les fusions viennent après.
-   [PROPOSITION] Milieu central : 3 lignes (MDC en bas, MC au milieu,
    MOC en haut) sur 2 colonnes (gauche, droite). La ligne choisie
    correspond au poste, ce qui garde le sens des postes naturels : un
    MDC placé sur la ligne MOC joue hors de son poste.
-   [PROPOSITION] Attaquant : 2 colonnes sur 2 lignes, plus une case
    centrale devant le but.
-   [PROPOSITION] Latéraux : 3 cases en profondeur en attendant la
    décision. Le nombre se change dans les données.
-   [PROPOSITION] Sans deuxième organisation, le moteur gère seul le
    mouvement du bloc : quand l'équipe a le ballon, les joueurs montent
    vers le haut de leur rectangle ; quand elle le perd, ils redescendent
    progressivement. Le délai de transition est conservé dans ce
    mouvement automatique. Le placement garde ses conséquences (une
    équipe placée haut reste exposée à la perte du ballon) sans travail
    en plus pour l'entraîneur.
-   [OUVERT] Maximum de joueurs par poste (en dehors des exemples 3 DC et
    1 AG). Positions et tailles exactes des rectangles.

## 20.9. Demi-terrain, outil du prototype et prototype 1

-   [VALIDÉ] Les 3 cases de AG et AD sont trois postes, du plus bas au
    plus haut : milieu de côté, milieu avancé, attaquant de côté. Il n'y a
    pas de poste MD / MG à part.
-   [VALIDÉ] **Placement sur un demi-terrain**, comme avant le coup
    d'envoi (idée du concepteur). Le moteur transforme ensuite chaque
    position en position de match, en attaque et en défense, par des
    règles de projection. La correspondance exacte se règle ensemble sur
    le prototype.
-   [VALIDÉ] **Prototype en version web** (TypeScript, page ouverte d'un
    lien sur le téléphone) plutôt qu'en Godot : Godot n'est installable
    ni dans l'environnement de Claude ni sur le PC de travail du
    concepteur. Le choix de l'outil final se fera quand le moteur
    convaincra.
-   [PROPOSITION] Règles de projection, première version : en défense, la
    position du demi-terrain resserrée de 10 % en largeur, qui glisse du
    côté du ballon et avance ou recule avec lui (10 m au plus) ; en
    attaque, montée par poste (G 5 m, DC 20 m, latéraux et milieux 30 m,
    côtés 35 m, attaquant 40 m), écartement de 20 %, léger suivi du
    ballon ; bascule après 0,5 s, déplacement progressif à 7 m/s au plus.
-   **Prototype 1 réalisé le 11/11/2026** (dossier `prototype/` du dépôt,
    détails dans `journal.md`) : écran de placement sur le demi-terrain
    (choix des joueurs, cases, maximums, hors poste) et écran de match
    (22 joueurs, possession simulée, blocs qui montent et redescendent
    sans téléportation). Pas encore de passes ni de tirs. En attente de
    validation du concepteur.
