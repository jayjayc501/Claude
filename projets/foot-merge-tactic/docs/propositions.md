# Propositions en cours — Foot Merge Tactic

Ce fichier regroupe les pistes **[PROPOSITION]** de Claude, souvent déjà codées dans le prototype, avec leurs chiffres. **Ce ne sont pas des règles** : le concepteur les juge en regardant des matchs. Une proposition validée passe dans `decisions.md` ; une proposition remplacée part dans `historique-etat.md`. Le détail des mesures est dans `journal.md`, à la date indiquée.

## 1. Principes techniques

- Modules séparés dans `prototype/src/sim/` (données, placement, projection, simulation, ballon, actions, statistiques). **Jamais un seul gros fichier** : `ballon.ts` ne respecte pas encore cette règle (audit du 16/11, prompt A1).
- Simulation séparée du rendu et des animations. Elle tourne sans affichage, sur des milliers de matchs, avec une graine aléatoire contrôlable.
- Terrain, rectangles, sous-zones, attributs et paramètres dans des fichiers de données, jamais codés en dur.
- Répartition 40 % qualité, 40 % tactique, 20 % hasard : **ancienne piste, pas une règle. Ne pas la coder.**
- Contreparties tactiques à vérifier :
  - pressing haut et espaces dans le dos ;
  - bloc bas et moins de présence offensive ;
  - jeu sur les ailes et dépendance aux excentrés ;
  - axe dense et côtés libres ;
  - joueurs très hauts et transition défensive risquée.

  Aucune tactique ne doit dominer.
- Notes techniques sur le prototype :
  - simulation en pas de temps fixe (1/30 s), avec son propre générateur aléatoire à graine (`src/sim/rng.ts`). `src/sim/` ne dépend pas de l'affichage et tourne dans les tests sans navigateur ;
  - coordonnées **normalisées** dans le repère de chaque équipe : x de 0 à 1 sur la largeur ; y de 0 (sa ligne de but) à 1 (la ligne adverse). L'équipe adverse utilise la symétrie. Les cases se déduisent du plateau choisi, hexagones ou carrés, décrit rangée par rangée dans `postes.json` ;
  - un match ne dépend que des deux équipes (joueurs, placements), des choix d'avant le coup d'envoi et de la mi-temps, et de la graine. C'est ce qui permet au serveur de calculer les matchs en ligne (arbitre et film depuis le 13/11 au soir) ;
  - validation visuelle : Claude vérifie la page dans un navigateur au format téléphone (captures, thèmes clair et sombre), puis la publie comme page claude.ai, toujours la même ;
  - GitHub Pages du dépôt `Claude` sert l'app jetelavaisdit ; le jeu est publié depuis le dépôt séparé `FootMergTactic`.

## 2. Affichage et durée du match

- Facteurs de vitesse réglables dans les données et ajustés sur téléphone. Au-delà de 3 à 4 fois la vitesse réelle, le ballon risque de devenir difficile à suivre.
- Si on passe au montage, choisir des temps forts qui montrent la conséquence des choix tactiques, par exemple un but encaissé en transition après un bloc trop haut.
- Audit du 16/11 (fichier `claude/audit-2-concept-actuel.md`) :
  - **prompt B1** : rendre la durée simulée d'une mi-temps réglable, puis mesurer l'essai à 30 s sur 200 matchs. Repères d'alerte : moins de 2 buts par match, ou plus de 35 % de nuls ;
  - **prompt B1 bis** : en repli, le montage de 6 à 8 temps forts par mi-temps ;
  - **prompt B2, « le mot de l'adjoint »** : 3 constats au plus à la mi-temps et à la fin, tirés du film, chacun lié à un choix possible ;
  - **§2.5** : geler le réglage du réalisme, sauf ce qui se voit dans un temps fort.

## 3. Placement et projection

- Latéraux (DD, DG) : 3 cases en profondeur, en attendant la décision (2 ou 3).
- Un seul joueur par case.
- Les données décrivent les postes (maximum de joueurs, ligne défensive) et chaque plateau rangée par rangée. Les rectangles des postes sont déduits des cases.
- **Plateau de placement** (hexagones validés le 11/11, carrés gardés en variante) :
  - couleurs : jaune pour le gardien, bleu pour la défense, violet pour le milieu, rouge pour l'attaque ; couloirs des côtés plus clairs ; rôle écrit dans la case ;
  - **hexagones** (par défaut) : G 1 (double losange, 12/11), DC 5 (3 + 2), DG 3, DD 3, milieu 8 (MDC 3, MC 2, MOC 3), ailiers 3 + 3, attaque 5 (2 + 3). **Nombre de cases à valider** : le découpage validé (DC 6, milieu 9, attaque 6) n'est exact qu'en carrés ;
  - **carrés** : 5 cases par rangée, exactement le découpage validé ;
  - gardien : une case en double losange sous le DC central (12/11). Coins hauts sans case. Quand on change de forme, chaque joueur garde son poste, sur la case la plus proche ;
  - dans le prototype : pelouse rayée avec un tracé blanc complet (ligne médiane, rond central, surface, point de penalty, but). Cases à 38 % et noms à 60 % pour rester lisibles (la maquette est à 30 %).
- Maximums provisoires, non validés : DG 1, DD 1, milieu 4, AD 1, attaquant 3. Validés en exemple : 3 DC, 1 AG ; le gardien : 1.
- **Règles de projection, version 4** (12/11, d'après `reference-football.md` §9 ; chiffres dans `reglages.json`) :
  - **sans le ballon, défense par lignes** : chaque poste rejoint sa ligne (gardien ; défense : DC, DG, DD ; milieu : milieu central et côtés ; attaque : attaquant).
    - La ligne défensive se tient 18 m derrière le ballon, entre 12 et 38 m de son but (bloc médian). Elle **s'y rend à vitesse limitée** : elle recule de 3 m/s et remonte de 5 m/s au plus ; elle recule à 7 m/s si le ballon arrive à moins de 8 m devant elle. Le milieu se tient 11 m devant elle, l'attaque 23 m devant.
    - Le placement compte en profondeur à 45 % en défense, à 70 % au milieu et en attaque (12/11, « zones trop étroites sur la hauteur ») : **un latéral placé haut revient dans la ligne de défense**, mais les hauteurs de placement restent lisibles.
    - Chaque ligne de 3 joueurs ou plus tient entre 39 et 44 m de large. L'ordre gauche-droite est gardé, avec 6 m au moins entre voisins, et la ligne coulisse vers le ballon (45 %).
    - (12/11, « DC trop décalés ») Les défenseurs centraux restent près de l'axe (écart ×0,65), et une ligne trop étroite s'élargit par ses extrémités : DC à environ 16 m l'un de l'autre (24 m avant).
  - **avec le ballon** (refait le 11/11 après « gros problème de placement durant le match ») :
    - l'équipe s'étire entre une **ligne arrière à 15 m derrière le ballon** (entre 15 et 55 m de son but) et une **ligne avant 1 m en deçà de la ligne que tient l'adversaire** (hors-jeu), sur 30 à 50 m ;
    - entre les deux, **l'ordre de profondeur du placement est gardé** : la case la plus basse du plateau donne la ligne arrière, la plus haute la ligne avant ;
    - l'équipe s'écarte en largeur ;
  - **aucune cible ne dépend de la position du moment d'un autre joueur**, seulement du ballon, du placement et des hauteurs de ligne tenues par les équipes (fonction du ballon et du temps). Sinon il y avait une boucle : la ligne adverse s'enfonçait dans sa surface ;
  - **transitions** (12/11, après « l'équipe doit rester groupée pendant les transitions » et « mouvements robots, synchronisés ») :
    - chaque joueur réagit à son tour, les plus proches du ballon d'abord : 0,2 s + 0,008 s par mètre du ballon + 0 à 0,35 s ;
    - puis il sprinte à 8 m/s pendant 5 s au plus, sinon il court à 7 m/s, avec ± 6 % de vitesse et d'accélération selon le joueur ;
    - à la perte du ballon, la ligne défensive part de la hauteur des défenseurs en attaque et recule pas à pas pendant que le milieu revient ;
    - les attaquants qui récupèrent visent la ligne que l'adversaire tient vraiment ;
    - un joueur placé haut revient toujours en retard, une contrepartie naturelle ;
  - **perception** : chacun voit le ballon avec un petit retard (0,1 à 0,3 s selon le joueur, + 0,004 s par mètre). Le bloc ne démarre plus d'un seul coup ;
  - **évitement anticipé** : 3 m au minimum entre coéquipiers, 2,5 m entre adversaires.
- **Charnière centrale** (14/11, `reglages.json` → `projection.defense.resserrementDC` et `projection.attaque.resserrementDC`, 0,42) : 15 m entre les DC avec le ballon (29 avant), 11 m sans (17). Du DC au latéral : 16 m au lieu de 9.

## 4. Ballon et actions (12/11, `src/sim/ballon.ts`, chiffres dans `reglages.json` → `ballon`)

- **Ballon** : porté ou libre (frottement) ; la possession revient au dernier qui l'a touché. Un ballon aérien (centre, dégagement) est intouchable pendant 80 % du vol.
- **Porteur** : il décide toutes les 0,6 à 1,2 s entre :
  - le tir : dans la surface, seul devant le but, parfois de loin ;
  - le centre depuis l'aile ;
  - le dribble face à un adversaire proche ;
  - la passe, notée selon la progression, l'espace, la distance, la voie libre et la largeur ;
  - la passe dans l'espace vers un coéquipier lancé ;
  - la rotation du ballon si l'avant est bouché ;
  - le dégagement long sous pression près de son but ;
  - la protection du ballon.
- **Défense** :
  - un joueur presse, un autre couvre ;
  - **un défenseur central sort sur le porteur dans l'axe, jusqu'à 18 m** (12/11, « ils ne vont pas vers le BU ») ;
  - contre-pressing 4 s après une perte, à 3 joueurs ;
  - près de son but, marquage côté but et recul rapide de la ligne ;
  - contres sur les ballons rapides ;
  - tacles, avec une faute 4 fois sur 10.
- **Gardien** : il plonge vers le point de passage du tir et arrête selon l'écart et la distance. Il repousse parfois en corner.
- **Règles** : hors-jeu au départ de la passe ; une faute donne un coup franc (adversaires à 9,15 m) ou un penalty ; corner, six mètres, touche, but et engagement.
- **Engagement** (12/11, après « les engagements sont nuls : une passe en arrière à personne ») :
  - un coéquipier se place à 4 m du ballon ; les adversaires restent dans leur moitié, hors du rond ;
  - on attend que le partenaire soit en place et le rond vide (6 s au plus), puis passe au partenaire (85 %) ou en retrait ;
  - ballon gardé 6 s après l'engagement : 27 fois sur 40 (11 sur 40 avant).
- **Coulisser et surnombre** (12/11) :
  - en attaque, le bloc glisse vers le côté du ballon ; le latéral et l'ailier opposés glissent moins, pour garder la largeur ;
  - les DG/DD et les milieux proches du ballon montent jusqu'à 12 m de plus quand le ballon est haut : dès 40 % du terrain, à plein à 75 % ;
  - limite : au moins 4 joueurs de champ restent derrière le ballon ;
  - **respiration** : de petites oscillations de 2 m autour de la place en attaque, contre l'effet robot.
- **Trois défauts** (12/11 au soir) :
  - les corrections :
    - avant bouché, le porteur temporise et fait circuler au lieu de foncer dans le bloc ;
    - passes dans la surface seulement vers un joueur libre ;
    - « seul face au but » veut dire que personne n'est entre lui et le but ;
    - moins de tacles et de tirs de loin ;
    - un rythme un peu plus posé ; on trotte loin de l'action ;
  - résultats, avec l'avant entre parenthèses :
    - 5,4 changements de camp par minute (6,7) ;
    - possessions de 10,6 s et 4 passes (8,7 s et 2,5) ;
    - 27 % des possessions finissent en tir (35 %) ;
    - 5,5 tirs par match (8,6) ;
    - 3,9 m/s de vitesse moyenne (4,3).
- **Repères mesurés** au départ, sur 12 matchs de 3 min : 1,25 but, 9 tirs, 4 arrêts, 2 fautes, 2 à 3 touches par match ; 77 % de passes réussies ; 5,8 changements de camp par minute (vrai football : 2 à 3). Depuis la révision de la nuit du 12/11 (§7) : 2,4 buts et 8 tirs par match.

## 5. Mouvements (12/11, après « améliore le moteur pour le rendre encore plus réaliste dans les mouvements »)

- **Allures** : chacun suit sa place et rattrape l'écart en douceur (marche, trot, course). Il passe à pleine vitesse près du ballon, au ballon, vers l'action, en repli côté but, ou en transition s'il est loin de sa place. Le freinage est plus fort que l'accélération.
- **Repère de forme** : le bloc suit le ballon à vitesse limitée (4,5 m/s en largeur, 5 pour monter, 10 pour revenir), et se replace d'un coup sur un arrêt de jeu. Le surnombre et les joueurs au ballon suivent le vrai ballon.
- **Jeu sans ballon** :
  - appels en profondeur, en diagonale, suivis par le défenseur le plus proche ;
  - soutien : les deux coéquipiers les plus proches se rapprochent du porteur et ouvrent une ligne de passe ;
  - décalages bornés autour de la place.
- Mesures de l'époque, avec l'avant entre parenthèses :
  - vitesse moyenne 4,4 m/s (4,7) ; 3,9 m/s après les corrections du 12/11 au soir, contre environ 2 dans le vrai football ;
  - sprint 15 % du temps (18 %) ;
  - 1,6 coéquipier en soutien près du porteur dans le dernier tiers (1,4) ;
  - 11 appels par match.

## 6. Tactiques (12/11, `src/sim/influences.ts`, chiffres dans `src/data/influences.json`)

- Les tactiques **modulent les réglages** du moteur, équipe par équipe. Sans tactique ni style, les réglages de base s'appliquent et le moteur est inchangé.
- **Pressing** : bloc haut, pressing de plus loin, 3 joueurs sur le porteur, **fermeture des lignes de passe** par les milieux et les attaquants (référence §4), plus de tacles et de fautes.
- **Gegenpressing** : contre-pressing de 7 s, à 5 joueurs.
- **Contre** : bloc bas, peu de pressing, jeu vertical et long, transitions plus longues.
- **Tiki-taka** : passes courtes, joueur libre préféré à l'avancée, rotation, peu de tirs de loin.
- **Révision du 12/11** (demande : « vérifie que les stats de chaque tactique sont cohérentes ») : mesures sur 40 matchs avec `scripts/mesurer-jeu.ts`, styles coupés.
  - Nouveaux leviers :
    - contre-attaque : pendant 5 s après la récupération, jeu vers l'avant et appels ;
    - jeu long : ballon aérien vers un attaquant lancé ;
    - gêne du pressing : passes moins précises, contrôles ratés quand on est serré ;
    - contre-pressing : tacles plus francs, porteur précipité.
  - Résultats :
    - Tiki-taka : 62 % de possession, 47 passes, 91 % de réussite ;
    - Contre : bloc bas, le moins de passes (22), les plus verticales (11 m gagnés par passe contre 9) et les plus longues (49 % de ballons longs), et le tir le plus rapide après la récupération ;
    - Pressing : passes adverses réussies à 73 % (81 % sans), récupérations plus hautes ;
    - Gegenpressing : 51 % des pertes en jeu reprises en 5 s (41 % sans).
  - Limite : la possession du Contre baisse peu (48 %).

## 7. Notes dans le moteur (12/11 au soir et nuit du 12/11, `src/sim/notes.ts`, chiffres dans `src/data/notes.json`)

- Sous-notes sur 99. La note affichée est la moyenne des deux sous-notes. Une sous-note absente vaut 65. **À 65 partout, le moteur est inchangé** (test).
- **Une règle unique** : on compare la sous-note d'un joueur à celle de son adversaire direct.
  - La probabilité est décalée sur sa cote de l'écart ÷ 15 : +10 points font passer d'environ 50 % à 66 %.
  - Les taux sont multipliés par exp(écart × coefficient).
  - La note globale n'entre pas dans le moteur.
- **Effets de chaque sous-note** :
  - **1 contre 1** : dribble − duel + ½ écart d'accélération, pour la réussite et l'envie de tenter ;
  - **Passe** : imprécision des passes, centres et ballons longs ; interceptions plus difficiles ;
  - **Dribble** : aussi le contrôle quand on est serré, et les tacles subis ;
  - **Tir** : précision (visée), puissance (vitesse du ballon, arrêts) ;
  - **Duel** : tacles, fautes (défenseur dépassé), portée sur le ballon.
- **Fatigue** : au-delà de 30 min d'affilée (la mi-temps en cours) et de 60 min au total.
  - Elle retire 0,2 % de vitesse et d'accélération par minute de dépassement ; les deux s'ajoutent.
  - Ce chiffre est multiplié par exp(−(endurance − 65) × 0,04), avec 25 % au plus.
  - Fin de match : −24 % pour une endurance de 40, −9 % pour 65, −3 % pour 90.
  - 45 min de match valent 180 s simulées.
- **Vitesse** :
  - pointe ± 0,8 % par point (90 donne 9,6 m/s en sprint), accélération ± 1,2 % par point ;
  - en 1 contre 1, accélération × 0,8 ;
  - le moteur cherche les duels de vitesse : passe vers l'avant et appel en profondeur vers le joueur le plus rapide face à son adversaire.
- **Buts** :
  - un défenseur sur la trajectoire ne touche un tir qu'une fois sur deux (41 % des tirs étaient contrés) ;
  - tirs plus précis ; gardien moins fort (arrêt 0,65 au plus) ;
  - un peu plus de tirs de loin et de passes dans la surface ;
  - résultat : 2,4 buts par match (0,9 avant), 8 tirs, 29 % de conversion.
- **Pauses** : 3,2 à 3,8 s de jeu avant une remise en jeu, 7 s après un but. Les annonces durent en temps de jeu 2,5 s (5,5 s pour un but) et sont finies avant la reprise.
- **Résultats** (80 matchs complets contre une équipe à 65) :

  | Équipe | Victoires | Nuls | Défaites |
  |---|---|---|---|
  | 70 partout | 61 % | 16 % | 23 % |
  | 75 partout | 76 % | 18 % | 6 % |
  | 80 partout | 90 % | 4 % | 6 % |

  Avec seulement la Vitesse à 80 : 63 % de victoires (29 % sans notes). **Vigilance** : 80 contre 65 gagne 9 fois sur 10. Si c'est trop, passer l'échelle de 15 à 20.
- Chaque note a sa signature : Technique, possession et moins de va-et-vient ; Tir, deux fois plus de buts ; Vitesse, plus de tirs ; Duel, moins de tirs adverses. Ailier vedette (90 en Vitesse contre un latéral à 55) : effet visible mais modeste.
- **Note de match** : barème dans `src/data/noteMatch.json`.

## 8. Styles, pays et fusions (14/11, `src/sim/influences.ts`, chiffres dans `src/data/influences.json`)

- **Bonus caché** : des points ajoutés aux sous-notes du moteur seulement (`JoueurSim.notes`) ; la carte garde `notesBase`.

  | Style | Bonus caché | Comportement, sans contrepartie |
  |---|---|---|
  | Récupérateur | duel +10, endurance +10 | presse de plus loin (×1,45), tacle plus (×1,4) |
  | Technicien | passe +8, dribble +8 | passes moins imprécises (×0,6), dribble ×1,3, protège le ballon |
  | Rapide | accélération +8, pointe +8 | vitesse ×1,05 |
  | Rempart | duel +12, endurance +4 | tacle plus (×1,4), fautes ×0,6 |
- **Paliers de style** :
  - à 3, le bonus d'équipe : Contre-pressing, Conservation, Transitions rapides, Ligne solide ;
  - à 5, l'action signature s'y ajoute :
    - **Pressing en meute** : contre-pressing à plus de joueurs, plus long, gêne plus forte des passes adverses ;
    - **Jeu en une touche** : décisions plus rapides, passes plus précises, protection et dribbles plus sûrs ;
    - **Contre éclair** : sprints et contre-attaques plus longs, plus d'appels et de ballons longs ;
    - **Le mur** : ligne qui recule plus vite, tirs contrés 3 fois sur 4, marquage plus serré.
- **Pays** :
  - **cohésion à 5** : +4 caché sur toutes les sous-notes de champ des compatriotes, et passes entre eux ×0,75 d'imprécision. Des réactions plus rapides ont été essayées puis retirées, car elles faisaient perdre ; le réglage `reaction` reste à 1 ;
  - **tradition à 8** :

    | Pays | Tradition à 8 |
    |---|---|
    | France | accélération +6, dribble +6, plus de dribbles |
    | Espagne | passe +8, dribble +6, passes sous pression plus précises |
    | Angleterre | duel +6, puissance +6, plus de centres et de tacles |
    | Allemagne | endurance +12, contre-pressing renforcé |
    | Italie | duel +8, ligne plus prudente, marquage plus serré |
- **Fusion** : +7 caché par niveau sur toutes les notes, gardien compris. Les coéquipiers du joueur fusionné le cherchent plus (+1,5 au choix de la passe par niveau), et il tente plus (+30 % de dribbles et de tirs de loin par niveau).
- **Visibilité** :
  - un bandeau « Bonus actifs » au coup d'envoi de chaque mi-temps, au milieu du terrain, doré si un palier fort est atteint ;
  - le pictogramme du style jaillit au-dessus d'un joueur quand son style fait la différence (tacle, interception, dribble, passe réussie sous pression, appel gagné, contre). Il est doré à 5 ;
  - sur la préparation, les compteurs affichent les styles /3 puis /5 et les pays /5 puis /8, avec un liseré doré au palier fort.
- Sans style, pays ni fusion, le moteur est inchangé au bit près.
- **Mesures** (14/11 nuit, 80 matchs par configuration ; l'équipe sans bonus gagne 39 %) :

  | Bonus | Victoires de l'équipe avec le bonus |
  |---|---|
  | fusion ×3 | 49 % |
  | styles à 3 | de 39 à 48 % |
  | styles à 5 | de 43 à 54 % |
  | cohésion à 5 | 45 % (14 % de défaites) |
  | pays à 8 | de 56 à 63 % |

  Ces mesures n'ont pas été refaites après les changements du moteur du 14/11 matin.
- **Pour une fusion plus forte** (audit du 16/11, à trancher, prompt B3) :
  - un bonus qui grossit avec le niveau (+7, +16, +27 à tester) ;
  - un geste visible au niveau 3 ;
  - à budget égal, fusionner doit rapporter à peu près autant qu'acheter de meilleures cartes.
- **Traits** : des traditions nationales sans caricature ; à l'intérieur d'un pays, les joueurs gardent des styles individuels variés. Le style est indépendant du poste.

## 9. Stade, couloirs et ordinateur (14/11 matin)

- **Stade** (`src/ui/stade.ts`) : un décor peint une fois dans une image.
  - Pelouse tondue en bandes et en damier, brins d'herbe, usure devant les buts.
  - Projecteurs et panneaux publicitaires inventés, sans texte.
  - Tribunes : public bleu derrière ton but, rouge derrière celui de l'adversaire.
  - Buts avec filets, drapeaux de coin, arcs de surface et de coin.
  - Bords : 16 unités sur les côtés, 34 derrière les buts, d'où un terrain environ 5 % plus petit.
- **Montée du latéral** (`reglages.json` → `ballon.sansBallon.montee`) : quand on attaque de son côté dans la moitié adverse, il passe à l'extérieur du porteur (dédoublement). Un seul latéral monte à la fois, plus souvent s'il est placé haut. Le porteur le cherche, et il se replie au sprint à la perte du ballon.
- **Repiquage de l'ailier** (`ballon.repiquer`) : balle au pied vers l'axe si l'intérieur est libre ; le latéral prend alors le couloir.
- **Second poteau** (`ballon.sansBallon.secondPoteau`) : quand le ballon est sur un côté du dernier tiers, l'ailier opposé rentre au second poteau.
- Mesures par équipe et par 180 s :
  - latéraux dans le dernier tiers : de 0 à 4 % du temps, 6,9 montées ;
  - ailiers : ballons dans l'axe du dernier tiers 0,3 → 0,9, tirs 0,18 → 0,48, buts 0,07 → 0,22.
- **L'ordinateur fait jouer ses fusionnés** (`partie.ts`, `ordiTitulaires`) : un remplaçant plus fort qu'un titulaire du même poste entre. Sa force est la moyenne des notes, plus 7 par fusion.

## 10. Partie, mercato et équipe automatique

- **Réserve commune à copies limitées** : 10, 8, 6, 4 et 3 copies pour les cartes à 1, 2, 3, 4 et 5 pièces. Elle est en place dans le prototype ; à terme, « chacun son mercato » la remplace (16/11). Plus tard aussi : rotation des cartes en jeu par saison.
- **Championnat** : matchs aller simples (3 journées) ; **+10 pièces par journée pour tout le monde**, idée du concepteur (« peut-être 10 pièces à chaque fois ») ; 3 points la victoire, 1 le nul.
- **Mercato de 6 joueurs** sur une rangée, avec le budget dans le titre du mercato et le poste écrit sous le buste. On revend en glissant le joueur vers le mercato. C'est la proposition gardée dans la maquette et le prototype.
- **Boucle de tournoi** (transposition de Merge Tactics) :
  - un budget de mercato gagné à chaque match, l'équivalent de l'élixir ;
  - deux copies identiques fusionnent automatiquement ;
  - les joueurs achetés vont sur le banc des remplaçants, et la revente est possible ;
  - 11 joueurs dès le premier match : le mercato sert à remplacer et à fusionner, pas à compléter l'équipe ;
  - tactique réglée avant le tournoi, sans chrono ; en préparation et à la mi-temps, seulement des ajustements rapides (glisser un joueur sur un autre pour fusionner, sur une sous-zone pour le placer).
- **Équipe automatique** (14/11, demande du concepteur : « un bouton… optimisé de haute qualité et un autre de qualité moyenne ; pas nul, moyenne ; je peux générer plusieurs cas ») :
  - boutons « ★★★ Haute qualité » et « ★★ Moyenne », pendant le draft et avant le premier match. Chaque appui relance une partie avec ton équipe faite (`Partie.equipeAuto`, chiffres dans `partie.json` → `auto`) ;
  - **Haute** : toute la réserve, budget 50, la meilleure valeur avec les bonus cachés estimés (style, paliers de style et de pays), un banc de 3 joueurs à 1 pièce et le reste en fusions. Note moyenne 75 à 76 ;
  - **Moyenne** : cartes à 2 ou 3 pièces au hasard, banc de 3, pas de fusion. Note moyenne 65 à 68 ;
  - c'est un outil de test : il pioche dans toute la réserve, pas dans les offres du draft.
- **Économie du mercato** (audit du 16/11, §2.4 et prompt B4, en attente) : pistes à simuler :
  - un intérêt sur les pièces gardées ;
  - une prime de défaite ;
  - le verrouillage d'une carte ;
  - un banc qui coûte ;
  - 5 ou 6 matchs par tournoi.

## 11. Rendu des écrans

- **Écran du match** (12/11, demande « aussi fun et beau que la préparation ») :
  - panneaux clairs ; tableau de score avec le chrono et une barre de possession ; pelouse rayée ;
  - annonces qui sautent, confettis sur un but ;
  - porteur sur un socle doré, avec son nom.
- **Buteurs** : enregistrés par le moteur dans `balle.buts` (équipe, buteur, contre son camp, minute), puis affichés dans les panneaux de mi-temps et de fin.
- **Vue Action** (13/11) : un joueur passe en figurine tout de suite à moins de 16 m du ballon ou du centre de l'action. Il redevient un pion après 1,2 s à plus de 25 m, avec un fondu croisé entre pion et figurine.
- **Ballon moderne** (12/11) :
  - une sphère brillante, avec un motif bleu et or qui tourne quand il roule, un reflet et un halo clair ;
  - en l'air, il passe au-dessus de son ombre ;
  - une traînée suit les ballons rapides.
- **Fusions « M2 » et pictos « P3 »** : les tailles et les couleurs sont des propositions. Figurines recolorées par `scripts/recolorer-equipe.py` et `scripts/recolorer-adversaires.py` ; versions bleue et rouge de chaque buste faites au découpage.
- **Fiche joueur** (`src/ui/fiche.ts`) :
  - toucher un joueur (terrain, banc, mercato) l'ouvre. Depuis le mercato, un bouton « Recruter · prix » ou « Fusionner » ;
  - appui long sur une carte du mercato : on la glisse sur le banc (achat), sur une case libre (achat et placement), sur un joueur (achat et remplacement) ou sur sa copie (fusion). Hors poste, c'est refusé sans achat (13/11) ;
  - présentation :
    - un en-tête aux couleurs du pays (nom, poste, style, fusion) ;
    - un buste qui déborde ;
    - les 4 notes avec un pictogramme, une couleur et la valeur en pastille : violet à 80 et plus, vert à 70, jaune à 60, rouge en dessous ;
    - les 2 sous-notes en barres animées.
- **Sons** (15/11, ElevenLabs) : une ambiance qui monte près des buts, des frappes, des « ooh », une clameur, des sifflets.
- **Premier écran** : choix entre Championnat et 1 contre 1.
- **Façon de faire qui a marché** (14/11) : pour un changement visuel contesté, montrer d'abord **plusieurs propositions** sur une page Design, puis n'intégrer que le choix du concepteur. Pour vérifier un rendu de fusion sans attendre un vrai joueur fusionné, faire une copie de `dist/index.html` où le niveau de fusion est forcé selon l'identifiant du joueur (journal du 14/11 après-midi).
- Visuels à reprendre un jour :
  - quelques bustes refaits à part sont un peu plus petits que les autres (Cartwright, Steinbach) ;
  - un buste italien a les cheveux flous ;
  - Kling : environ 96 crédits dépensés sur 375. Un joueur raté sur une planche se refait seul : image 1:1 en 2K, 2 crédits.

## 12. Adversaires et jeu en ligne

- L'IA joue le rôle d'entraîneur (deck, mercato, fusions, placement, ajustements) avec les mêmes règles que le joueur, sans tricher. La difficulté vient du niveau des cartes et de la qualité des choix.
- Le joueur et l'IA prennent leurs décisions par la même interface, pour pouvoir remplacer l'un par l'autre.
- En direct, le serveur reçoit les compositions, simule le match avec une graine et envoie la même séquence aux téléphones.
- **Film pour le réseau** (15/11) : binaire float32 + gzip, 0,9 Mo par mi-temps, écart de 0,01 mm au plus. Des positions arrondies au millimètre le diviseraient encore par 4 (à décider).
- **Marges** : 8 s avant le coup d'envoi, 6 s avant la reprise.
- **Si un joueur quitte la partie**, aujourd'hui son équipe joue quand même. S'il n'a rien envoyé, elle est faite automatiquement.
- **Tournoi en ligne** (audit du 16/11, à trancher) : le tournoi part avec ceux qui sont là, et les IA prennent les places vides ; un chrono strict à chaque préparation. Plan à faire : prompt B5.
- **Serveur** (audit du 16/11, prompt A3) :
  - nettoyer après 24 h les parties finies et leurs films ;
  - limiter les créations de parties par adresse et par heure ;
  - deux solutions contre la triche du draft (rejeu des actions avec la graine, ou draft côté serveur) ;
  - mesurer s'il faut garder l'état de fin de 1re mi-temps.

## 13. Collection et méta-jeu (audit du 16/11, fichier `claude/audit-3-concept-a-prevoir.md`)

- **Niveaux de cartes** : un niveau maximum pèse moins qu'une fusion (environ +2 par niveau, 3 niveaux). Une carte à 2 au maximum ne dépasse pas une carte à 3 de base. Seuils plus doux : 5, 20, 60, 150.
- **Pays** :
  - les 5 pays actuels forment le deck de départ de tout le monde ; chaque pays débloqué permet d'en remplacer un ;
  - les nouveaux pays arrivent un par un, chacun avec une tradition de jeu différente ; rotation par saison.
- Si les fusions deviennent trop rares, jouer sur le mercato (proposer plus souvent les joueurs déjà recrutés) plutôt que sur le nombre de pays.
- Base de discussion, que le concepteur veut revoir avec plus de propositions :
  - le Club et ses 5 onglets ;
  - la Tournée de 10 stades ;
  - la détection (3 cartes, on en garde une) ;
  - les pochettes et l'album ;
  - les objectifs (causerie du jour, défi de la semaine, palmarès, saison) ;
  - la boutique : marché du jour, pochettes, vestiaire ; monnaie du club distincte des pièces.

  Principes : aucun coffre, aucun minuteur, aucune attente ; on n'achète pas la victoire.
- **Attrait du jeu** (§« Rendre le jeu plus attirant ») : la première minute (un match tout de suite, puis un choix à la fois), le moment de la fusion, les buts, une image « mon onze » à partager, un ton, le nom et l'icône, les vibrations. Prompts D1 et D2.
- **Outil final** (§2.8) : rester en web ; une application installable peut emballer la page.
