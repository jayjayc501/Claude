# Référence football — Foot Merge Tactic

Document de référence pour que le moteur reste fidèle au vrai football.
À relire **avant de modifier un comportement du moteur** (déplacements,
projection, pressing, transitions), et à compléter quand on apprend
quelque chose.

Statut : document de travail de Claude, rédigé le 11/11/2026 à la demande
du concepteur à partir de sources d'entraîneurs, d'analystes et d'études
sur données de suivi (liste à la fin). Les chiffres sont des **ordres de
grandeur** pour régler le moteur, pas des vérités absolues. Les règles de
la dernière partie sont des **propositions** tant que le concepteur ne les
a pas validées.

---

## 1. Les quatre moments du jeu

Les entraîneurs découpent un match en quatre moments, plus les coups de
pied arrêtés :

| Moment | Ce qui se passe | Ce que l'équipe cherche |
|---|---|---|
| **Possession** (attaque organisée) | L'équipe a le ballon et a eu le temps de s'installer. | S'étaler en largeur et en profondeur, créer des solutions de passe, avancer. |
| **Transition défensive** (perte du ballon) | L'équipe vient de perdre le ballon ; elle est encore étalée. | Soit récupérer tout de suite (contre-pressing), soit se replier vite pour se réorganiser. |
| **Défense organisée** (sans le ballon) | L'adversaire a le ballon et l'équipe a eu le temps de se replacer. | Être compacte, fermer l'axe, pousser l'adversaire sur les côtés, choisir où récupérer le ballon. |
| **Transition offensive** (récupération) | L'équipe vient de récupérer le ballon ; l'adversaire est encore étalé. | Profiter du désordre adverse (contre-attaque) ou sécuriser le ballon. |

Les transitions sont courtes, **de l'ordre de 5 à 8 secondes**, mais
décisives : c'est là que l'adversaire est désorganisé.

**Conséquence pour le moteur :** une équipe n'a pas une forme, elle en a
au moins deux (avec et sans ballon) et elle passe de l'une à l'autre
pendant les transitions. Le placement choisi par l'entraîneur ne peut pas
être la position du joueur dans tous les moments.

## 2. Lire le terrain

**Trois tiers dans la longueur :** tiers défensif, tiers du milieu, tiers
offensif (chacun environ 35 m).

**Cinq couloirs dans la largeur :** couloir gauche, demi-espace gauche,
axe, demi-espace droit, couloir droit. Le couloir extérieur va en gros de
la ligne de touche au bord de la surface de réparation ; l'axe a à peu
près la largeur de la surface de but. Les **demi-espaces** sont très
recherchés en attaque : un joueur qui s'y trouve voit à la fois l'axe et
le côté.

**Zone 14** : la zone centrale juste devant la surface adverse, d'où
partent beaucoup de passes décisives.

## 3. Lignes, bloc et compacité

### Les lignes

Sans le ballon, une équipe s'organise en **trois lignes** : défense,
milieu, attaque (par exemple 4-4-2 : quatre défenseurs, quatre milieux,
deux attaquants). Chaque joueur rejoint sa **position défensive de
base**, qui peut être très différente de son rôle offensif : un latéral
ou un piston qui attaque haut **revient dans la ligne de défense**.

### Le bloc

Le **bloc** décrit la hauteur à laquelle l'équipe défend quand elle a eu
le temps de s'organiser. On le repère surtout à la **hauteur de la ligne
défensive** (distance entre les défenseurs et leur propre but).

| Bloc | Où l'équipe défend | Ligne défensive (ordre de grandeur) | Avantage | Risque |
|---|---|---|---|---|
| **Bas** | Tiers défensif, ligne près de la surface | environ 18 à 25 m de son but | Peu d'espace dans le dos et dans la surface | Pression constante, centres, longue distance pour contre-attaquer |
| **Médian** | Tiers du milieu, pressing vers la ligne médiane | environ 25 à 40 m (exemple réel : 35,7 m en moyenne pour un bloc médian en Ligue des champions) | Bloque les passes vers le milieu | Ballons dans le dos si la ligne n'est pas protégée |
| **Haut** | Camp adverse, pressing dès la relance | ligne proche de la ligne médiane | Récupère haut, près du but adverse | Grand espace dans le dos, très exigeant physiquement |

### La compacité

Être compact, c'est **réduire les distances** pour ne pas laisser
d'espace à l'adversaire, surtout entre les lignes.

- **Entre la défense et le milieu : environ 10 m.** Les études sur
  données de suivi de Bundesliga mesurent en moyenne un peu plus de 10 m ;
  les entraîneurs visent 10 à 15 m.
- **Entre deux défenseurs voisins : environ 6 à 8 m.** La ligne reste
  droite et coulisse d'un bloc.
- **Largeur du bloc organisé : à peu près la largeur de la surface de
  réparation** (une quarantaine de mètres). L'espace laissé est sur les
  côtés ou dans le dos.
- **Longueur et largeur du jeu** : ordre de grandeur relevé en Premier
  League, environ 38 m de long sur 43 m de large pour l'espace occupé
  pendant les possessions.
- Ce qui compte le plus pour récupérer le ballon, c'est la compacité
  **près du ballon** (les quatre ou cinq défenseurs les plus proches),
  plus que celle de toute l'équipe.

### Le coulissement

Quand le ballon change de côté, **tout le bloc glisse** de ce côté. Le
côté opposé est laissé plus libre (on le surveille de loin). Le bloc
protège l'axe et les demi-espaces, et pousse l'adversaire vers la touche.

## 4. Pressing, contre-pressing, défense de couverture

- **Pressing** : aller mettre la pression sur le porteur et ses
  solutions de passe, plutôt que d'attendre. Il se déclenche sur des
  **signaux** : passe en retrait, mauvais contrôle, porteur dos au jeu,
  ballon près de la ligne de touche, passe lente.
- Le premier joueur presse le porteur, les suivants **ferment les lignes
  de passe** et **couvrent** derrière lui. Un joueur qui sort seul de sa
  place casse la compacité.
- **Contre-pressing** : juste après la perte, les joueurs les plus
  proches attaquent tout de suite le nouveau porteur (en général trois :
  celui qui presse, celui qui ferme la passe vers l'avant, celui qui
  couvre). S'ils ne récupèrent pas en quelques secondes, l'équipe se
  replie et se réorganise.
- **Défense de couverture** (en anglais *rest defence*) : pendant que
  l'équipe attaque, quelques joueurs restent derrière le ballon pour
  parer une contre-attaque. Souvent 3 + 2 (trois défenseurs et deux
  milieux devant eux), parfois 2 + 3 ou 4 + 1. Repère utilisé par les
  entraîneurs et confirmé par une étude de Bundesliga : **au moins quatre
  joueurs derrière le ballon** quand on attaque dans le camp adverse.

## 5. Les principes en attaque

- **Largeur** : occuper les couloirs extérieurs pour étirer la défense.
- **Profondeur** : menacer l'espace derrière la défense (appels en
  profondeur) et garder des solutions en retrait.
- **Soutien** : toujours des solutions de passe proches du porteur
  (triangles, losanges).
- **Occuper les cinq couloirs** dans le camp adverse : face à une
  défense à quatre, cinq joueurs répartis sur les cinq couloirs posent
  des problèmes.
- **Jouer entre les lignes** : recevoir entre la défense et le milieu
  adverses, la zone la plus recherchée par les équipes de possession.
- **Mobilité** : appels, décrochages, dédoublements, permutations.

## 6. Les postes, moment par moment

| Poste | Avec le ballon | Sans le ballon | À la perte du ballon |
|---|---|---|---|
| **Gardien** | Relance, peut jouer haut (gardien-libéro) derrière une ligne haute | Protège le but, couvre l'espace dans le dos de la défense | Se replace entre le ballon et le but |
| **Défenseur central** | Relance, monte avec le bloc ; reste derrière le ballon (défense de couverture) | Organise et tient la ligne, ligne du hors-jeu, duels, couverture | Protège la profondeur, recule si personne ne presse le porteur |
| **Latéral** (DG, DD) | Donne la largeur ou monte haut (dépassements) ; parfois rentre dans l'axe (latéral « inversé ») | **Revient dans la ligne de défense**, se resserre vers l'axe (de 10 à 15 m environ), ferme son couloir | **Sprint de repli** vers sa position défensive : c'est le prix d'un latéral qui attaque haut |
| **Milieu défensif** (MDC) | Lien entre défense et attaque, reste souvent derrière le ballon | Protège l'axe devant la défense, ferme les passes vers les attaquants | Premier relais du contre-pressing ou protection immédiate de l'axe |
| **Milieu central** (MC) | Fait avancer le jeu, soutien | Ligne du milieu, coulisse, presse quand le ballon arrive dans sa zone | Contre-pressing |
| **Milieu offensif** (MOC) | Entre les lignes, dernière passe | Presse la relance, revient dans la ligne du milieu en bloc bas ou médian | Contre-pressing immédiat |
| **Côtés** (milieu de côté, milieu avancé, ailier) | Largeur ou entrée dans le demi-espace, centres, appels | En bloc médian ou bas, **reviennent former la ligne du milieu** ; selon la consigne, l'ailier peut rester plus haut pour contre-attaquer | Presse le latéral adverse ou se replie sur son côté |
| **Attaquant** | Point d'appui, appels en profondeur, finition | Premier rideau du pressing : oriente la relance adverse vers un côté | Presse le porteur ou se rend disponible pour la contre-attaque |

## 7. Chiffres utiles pour le moteur

| Mesure | Ordre de grandeur |
|---|---|
| Terrain | 105 × 68 m |
| Distance parcourue par un joueur de champ | environ 10 à 12 km par match |
| Course rapide | à partir de 5,5 m/s (19,8 km/h) |
| Sprint | à partir de 7 m/s (25,2 km/h) |
| Vitesse maximale moyenne d'un ailier | environ 9 m/s |
| Temps de jeu effectif | environ 55 à 59 minutes par match |
| Buts | environ 2,7 à 3,3 par match (Premier League, saisons récentes) |
| Tirs | environ 27 à 28 par match (deux équipes) |
| Passes | environ 850 à 940 par match (deux équipes) |
| Durée d'une transition | environ 5 à 8 secondes |

## 8. Dictionnaire

- **Appel** : course sans ballon pour se proposer ou attirer un défenseur. *Appel en profondeur* : dans le dos de la défense.
- **Axe** : couloir central.
- **Bloc** (bas, médian, haut) : hauteur à laquelle l'équipe défend une fois organisée.
- **Compacité** : faibles distances entre les joueurs et entre les lignes.
- **Contre-pressing** : pressing immédiat juste après la perte du ballon.
- **Couloir** : bande verticale du terrain (cinq couloirs).
- **Coulisser** : déplacer tout le bloc latéralement vers le côté du ballon.
- **Couverture** : se placer derrière un partenaire qui presse, pour le protéger s'il est dribblé.
- **Défense de couverture** (*rest defence*) : joueurs qui restent derrière le ballon pendant l'attaque.
- **Demi-espace** : couloir entre l'axe et le couloir extérieur.
- **Dédoublement** (ou dépassement) : un joueur passe à l'extérieur (ou à l'intérieur) d'un partenaire qui a le ballon.
- **Entre les lignes** : espace entre la défense et le milieu adverses.
- **Largeur, profondeur** : occupation du terrain en travers et en longueur.
- **Ligne défensive** : les défenseurs les plus bas, qui avancent et reculent ensemble ; elle fixe la ligne du hors-jeu.
- **Piston** : latéral très offensif dans un système à trois défenseurs centraux.
- **Premier rideau** : la ligne d'attaque quand elle défend.
- **Pressing** : pression organisée sur le porteur et ses solutions de passe.
- **Repli** : retour vers sa position défensive après la perte du ballon.
- **Transition** : moment où la possession change de camp.
- **Zone 14** : zone centrale devant la surface adverse.

## 9. Traduction dans le moteur (propositions)

Ce qui précède devient des règles du moteur. Elles sont dans les fichiers
de données pour être réglées sans toucher au code.

### 9.1. Sans le ballon : défendre par lignes

1. **Chaque poste appartient à une ligne défensive** : gardien ; défense
   (DC, DG, DD) ; milieu (milieu central, côtés) ; attaque (attaquant).
   Les côtés reviennent dans la ligne du milieu, comme dans un bloc
   médian.
2. **La hauteur de la ligne défensive suit le ballon** : elle se tient à
   une distance fixe derrière lui, sans descendre sous un minimum (bord de
   la surface environ) ni monter au-dessus du maximum du bloc. Bloc
   médian par défaut.
3. **Les autres lignes se placent par rapport à la défense** : milieu
   environ 10 à 12 m devant, attaque environ 22 à 25 m devant.
4. **Le placement choisi ne joue plus qu'un peu en défense** : un joueur
   placé haut dans son rectangle est un peu plus haut dans sa ligne
   (quelques mètres), pas plus. Un latéral placé haut **revient dans la
   ligne de défense**.
5. **Largeur** : chaque ligne tient à peu près la largeur de la surface
   (environ 40 m ; un peu moins pour l'attaque). L'ordre gauche-droite des
   joueurs est gardé : le latéral se resserre vers l'axe, les défenseurs
   restent espacés de 6 à 8 m environ.
6. **Coulissement** : tout le bloc glisse vers le côté du ballon.
7. **Gardien** : derrière sa ligne défensive, entre 3 et 12 m de son but
   environ.

### 9.2. Avec le ballon : le placement compte

1. Le joueur part de sa position du demi-terrain et monte selon son poste
   (montées actuelles : gardien 5 m, DC 20 m, latéraux et milieux 30 m,
   côtés 35 m, attaquant 40 m) ; l'équipe s'écarte en largeur.
2. **Défense de couverture** : les DC et la ligne des milieux défensifs
   montent moins, pour garder au moins quatre joueurs derrière le ballon
   (à régler : montée du milieu défensif plus faible que celle du milieu
   offensif).

### 9.3. Transitions

1. Bascule de forme après un court délai (0,5 s actuellement), puis
   chaque joueur rejoint sa nouvelle position à sa vitesse : **un joueur
   placé haut met plus de temps à revenir**. C'est la contrepartie
   naturelle d'un placement offensif, sans règle en plus.
2. Plus tard (avec le vrai ballon) : contre-pressing des joueurs proches
   pendant quelques secondes, puis repli ; contre-attaque à la
   récupération.

### 9.4. Tests de réalisme

Contrôles automatiques à ajouter aux tests du moteur, pour vérifier qu'on
ne s'éloigne pas du football :

1. En défense organisée, distance entre la ligne de défense et la ligne
   du milieu : entre 8 et 15 m.
2. Largeur de la ligne de défense (hors gardien) : au plus 45 m environ.
3. Longueur de l'équipe en défense (du dernier défenseur au joueur le
   plus avancé) : au plus 40 m environ.
4. Un latéral placé haut est, en défense, à quelques mètres de la ligne
   des défenseurs centraux.
5. Quand le ballon est sur un côté, le centre du bloc est décalé du même
   côté.
6. En attaque, au moins quatre joueurs de champ derrière le ballon
   (à vérifier quand le vrai ballon existera).

---

## Sources

Consultées le 11/11/2026. Les chiffres viennent de ces pages ; le reste
est une synthèse.

- Forcher et al. (2024), *Is a compact organization important for defensive success in elite soccer?*, International Journal of Sports Science and Coaching (données de suivi, Bundesliga 2020/21) : https://pure.rug.nl/ws/files/1058208693/forcher-et-al-2023-is-a-compact-organization-important-for-defensive-success-in-elite-soccer-analysis-based-on-player.pdf
- UEFA, *Champions League performance insights: Real Madrid's mid-block* : https://www.uefa.com/uefachampionsleague/news/028d-1ad2aace62a4-fd3586ac6b79-1000--insights-madrid-s-mid-block/
- FIFA Training Centre, *Defending with a back four* : https://fifatrainingcentre.com/en/practice/elite-sessions/out-of-possession/defending-with-a-back-four.php
- FIFA Training Centre, *Team organisation (out of possession)* : https://www.fifatrainingcentre.com/en/game/game-analysis/out-of-possession/team-organisation--out-of-possession-.php
- FIFA Training Centre, *Occupying the five channels in the opponent's half* : https://www.fifatrainingcentre.com/en/game/tournaments/olympic-football-tournament/moft/occupying-the-five-channels-in-the-opponents-half.php
- The Coaches' Voice, *The mid-block*, *The low block*, *The half-spaces*, *Inverted full-backs*, *The modern full-back* : https://learning.coachesvoice.com/
- PFSA, *Low Block Football* : https://thepfsa.co.uk/low-block-football-what-it-is-why-it-works-and-how-to-break-it/
- Spielverlagerung, *Tactical theory: the various forms of rest-defence* : https://spielverlagerung.com/2021/07/05/tactical-theory-the-various-forms-of-rest-defence/
- Étude sur la défense de couverture (Bundesliga, données de suivi) : https://pmc.ncbi.nlm.nih.gov/articles/PMC10690503/
- Étude sur l'espace de jeu en Premier League (longueur et largeur) : https://pmc.ncbi.nlm.nih.gov/articles/PMC6705862
- Jobs in Football, *What is a transition in soccer* (durée des transitions, d'après Tifo Football) : https://jobsinfootball.com/blog/what-is-a-transition-in-soccer/
- Driblab (seuils de course rapide et de sprint) : https://www.driblab.com/blog/player-analysis-what-can-high-speed-runs-tell-us
- FourFourTwo (vitesse maximale des ailiers, distance parcourue) : https://www.fourfourtwo.com/performance/training/premier-league-v-amateur-fitness
- Premier League (temps de jeu effectif, buts, tirs, passes) : https://www.premierleague.com/news/3860720 et https://www.premierleague.com/news/4027257
- The Analyst (passes par match) : https://theanalyst.com/articles/premier-league-teams-still-more-direct-2025-26
